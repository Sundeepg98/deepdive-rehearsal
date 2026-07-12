#!/usr/bin/env node
/*
 * REGRESSION GUARD: a filtered sub-drill must MERGE into the topic's canonical
 * progress record, never REPLACE it.
 *
 * The bug this locks out (P0, silent data loss, shipped and reachable through the
 * button the app itself recommended):
 *
 *     complete a 22-probe drill, flag 3 for revisit  ->  {done:22, tot:22, revisit:[3]}
 *     click "Drill my 3 Revisit probes ->", grade ONE  ->  {done:1,  tot:3,  revisit:[]}
 *
 * Progress.snapshot() wrote the drill's CURRENT WORKING SET straight into the topic
 * record. Every filtered view shrinks that set -- the three "re-drill what you
 * flagged" buttons, Quick 5, any tier filter -- and so does a plain page reload
 * (the drill restarts at results = []). So a completed run was destroyed by the
 * next single grade, whatever the user did next.
 *
 * Each case below completes a topic, RELOADS to prove the record persisted, then
 * exercises one destruction path and asserts the canonical record survived:
 *   - tot  still reflects the FULL bank, never the filtered subset
 *   - done never goes backwards
 *   - a probe re-graded Solid LEAVES the revisit list (updated, not blanked)
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/progress_merge.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] ||
  path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* Drive the drill the way a human does: reveal every stage, then judge.
   shakyEvery > 0 grades every Nth probe Shaky so a revisit pile builds. */
const RUN_DRILL = async (page, shakyEvery) => page.evaluate(async (se) => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const sleep = (ms) => new Promise(x => setTimeout(x, ms));
  let graded = 0, guard = 0;
  while (guard++ < 400) {
    if (r.getElementById('adv')) { r.getElementById('adv').click(); await sleep(2); continue; }
    const jg = r.getElementById('jg'), js = r.getElementById('js');
    if (!jg || !js) break;                                   // debrief reached
    ((se > 0 && graded % se === se - 1) ? js : jg).click();
    graded++;
    await sleep(4);
  }
  return graded;
}, shakyEvery);

/* Grade exactly ONE probe of whatever set is currently loaded. Returns its signal. */
const GRADE_ONE = async (page, solid) => page.evaluate(async (sol) => {
  const d = document.querySelector('#drill deep-drill'), r = d.shadowRoot;
  const sleep = (ms) => new Promise(x => setTimeout(x, ms));
  const signal = cards[d.di].signal;
  let g = 0;
  while (r.getElementById('adv') && g++ < 12) { r.getElementById('adv').click(); await sleep(2); }
  r.getElementById(sol ? 'jg' : 'js').click();
  await sleep(30);
  return signal;
}, solid);

const STORED = (page) => page.evaluate(() => {
  const id = TopicRegistry.current().id;
  const p = localStorage.getItem('ddr.v1.progress.' + id);
  const w = localStorage.getItem('ddr.v1.wbprog.' + id);
  return { id, bank: _allCards.length, p: p ? JSON.parse(p) : null, w: w ? JSON.parse(w) : null };
});

(async () => {
  const errs = [], fails = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };

  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  /* Every reload below used to be `goto(url); waitForTimeout(350)`. The 350 was a guess about
     how long an 11.4MB file takes to parse and wire switchTab/Progress -- and the very next line
     always calls into those globals. BOOT() waits for them instead. */
  const BOOT = () => B.gotoApp(page, HTML);
  /* switchTab(x) then "wait 150-200ms for the pane to render" becomes: wait for the pane to
     actually BE rendered. The shadow-root queries that follow depend on it existing. */
  const PANE_ON = async (id) => {
    await page.evaluate((t) => switchTab(t), id);
    await page.waitForFunction(
      (t) => { const el = document.getElementById(t); return !!el && getComputedStyle(el).display !== 'none'; },
      id, { timeout: B.ACT_MS });
    await B.settle(page);
  };
  const OPEN_DRILL = () => PANE_ON('drill');
  /* Fresh store, then a completed topic + a reload that proves it persisted.
     Returns the canonical record every case below must not damage. */
  const completedTopic = async (shakyEvery) => {
    await BOOT();
    await page.evaluate(() => localStorage.clear());
    await BOOT();
    await OPEN_DRILL();
    const graded = await RUN_DRILL(page, shakyEvery);
    await page.waitForTimeout(80);
    await BOOT();                                                    // RELOAD
    await OPEN_DRILL();
    return Object.assign(await STORED(page), { graded });
  };
  /* Re-enter the debrief in the current session (the drill's own state is
     per-session; the STORED record is what we are guarding). */
  const reachDebrief = async (shakyEvery) => { await RUN_DRILL(page, shakyEvery); await page.waitForTimeout(80); };

  /* ================= 1. the record is canonical and survives a reload ================= */
  const base = await completedTopic(7);
  ok('full run stores the whole topic', !!base.p && base.p.done === base.bank && base.p.tot === base.bank,
    'bank=' + base.bank + ' stored=' + JSON.stringify(base.p));
  ok('completed run survives a reload', !!base.p && base.p.done === base.graded && base.p.shk > 0,
    JSON.stringify(base.p));
  ok('revisit list holds the flagged probes', !!base.p && base.p.revisit.length === base.p.shk,
    JSON.stringify(base.p && base.p.revisit));

  /* ================= 2. the recommended button: "Drill my N Revisit probes ->" ======== */
  await reachDebrief(7);
  const pre2 = await STORED(page);
  const label = await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const b = r.getElementById('dweak');
    if (!b) return null;
    b.click();
    return b.textContent;
  });
  ok('debrief recommends the revisit re-drill', !!label, 'no #dweak button in the debrief');
  await page.waitForTimeout(120);
  const subsetSize = await page.evaluate(() => cards.length);
  ok('the re-drill really is a filtered subset', subsetSize > 0 && subsetSize < pre2.bank,
    'subset=' + subsetSize + ' bank=' + pre2.bank);
  const sig = await GRADE_ONE(page, true);                            // nail one of them
  const post2 = await STORED(page);
  ok('re-drill does not truncate tot', post2.p.tot === pre2.bank,
    'tot ' + pre2.p.tot + ' -> ' + post2.p.tot + ' (bank ' + pre2.bank + ')');
  ok('re-drill does not truncate done', post2.p.done === pre2.p.done,
    'done ' + pre2.p.done + ' -> ' + post2.p.done);
  ok('probe graded Solid leaves the revisit list',
    post2.p.revisit.length === pre2.p.revisit.length - 1 && post2.p.revisit.indexOf(sig) === -1,
    'revisit ' + JSON.stringify(pre2.p.revisit) + ' -> ' + JSON.stringify(post2.p.revisit) + ' after nailing ' + JSON.stringify(sig));
  ok('re-drill lifts got instead of resetting it', post2.p.got === pre2.p.got + 1,
    'got ' + pre2.p.got + ' -> ' + post2.p.got);

  /* ================= 3. Quick 5 (a filtered subset with no button at all) ============ */
  const pre3 = await completedTopic(0);
  await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('[data-m="quick"]').click());
  await page.waitForTimeout(120);
  await GRADE_ONE(page, false);                                       // fumble one
  const post3 = await STORED(page);
  ok('Quick 5 does not truncate the record', post3.p.tot === pre3.bank && post3.p.done === pre3.p.done,
    JSON.stringify(pre3.p) + ' -> ' + JSON.stringify(post3.p));
  ok('Quick 5 fumble re-flags that probe only', post3.p.shk === 1 && post3.p.got === pre3.p.got - 1,
    JSON.stringify(post3.p));

  /* ================= 4. tier filter (another silent subset) ========================== */
  const pre4 = await completedTopic(0);
  await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('[data-tier="SDE2"]').click());
  await page.waitForTimeout(120);
  await GRADE_ONE(page, true);
  const post4 = await STORED(page);
  ok('tier filter does not truncate the record', post4.p.tot === pre4.bank && post4.p.done === pre4.p.done,
    JSON.stringify(pre4.p) + ' -> ' + JSON.stringify(post4.p));

  /* ================= 5. reload + a single grade (no filter whatsoever) =============== */
  const pre5 = await completedTopic(0);
  await GRADE_ONE(page, true);                     // already reloaded by completedTopic()
  const post5 = await STORED(page);
  ok('a reload + one grade does not truncate the record',
    post5.p.tot === pre5.bank && post5.p.done === pre5.p.done && post5.p.got === pre5.p.got,
    JSON.stringify(pre5.p) + ' -> ' + JSON.stringify(post5.p));

  /* ================= 6. the whiteboard record, same bug class ======================== */
  await BOOT();
  await page.evaluate(() => localStorage.clear());
  await BOOT();
  await PANE_ON('wb');
  const wbAll = await page.evaluate(async () => {
    const r = document.querySelector('#wb deep-whiteboard').shadowRoot;
    const sleep = (ms) => new Promise(x => setTimeout(x, ms));
    const lis = r.querySelectorAll('#wblist li');
    for (let i = 0; i < lis.length; i++) {
      lis[i].querySelector('.wb-rev').click(); await sleep(2);
      lis[i].querySelector('.wb-got').click(); await sleep(2);
    }
    return lis.length;
  });
  await page.waitForTimeout(80);
  const preW = await STORED(page);
  ok('full whiteboard recall stores every step', !!preW.w && preW.w.got === wbAll && preW.w.total === wbAll,
    JSON.stringify(preW.w));
  await BOOT();                                                       // RELOAD -> blank board
  await PANE_ON('wb');
  await page.evaluate(async () => {
    const r = document.querySelector('#wb deep-whiteboard').shadowRoot;
    const sleep = (ms) => new Promise(x => setTimeout(x, ms));
    const li = r.querySelector('#wblist li');
    li.querySelector('.wb-rev').click(); await sleep(4);
    li.querySelector('.wb-got').click(); await sleep(4);
  });
  await page.waitForTimeout(120);
  const postW = await STORED(page);
  ok('a reload + one whiteboard grade does not truncate the record',
    postW.w.got === preW.w.got && postW.w.total === preW.w.total,
    JSON.stringify(preW.w) + ' -> ' + JSON.stringify(postW.w));

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('PROGRESS MERGE: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
