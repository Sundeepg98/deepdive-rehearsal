#!/usr/bin/env node
/*
 * WAVE 2 -- THE pos.<id> CURSOR. Each pane writes its position (throttled) and restores it when it
 * renders the topic, so Resume lands where the user left off instead of at step 1. This gate proves
 * the WALK cursor round-trips (step -> leave -> return -> restored), is DATA-DRIVEN (a planted pos
 * is honored and out-of-range is clamped), and has a NEGATIVE CONTROL (no pos -> step 0, so restore
 * reads the record, it is not a hardcoded value).
 *
 * (The DRILL probe cursor + its restore-NEVER-regrades proof land with the drill-mode integration --
 * a separate commit; this gate grows to cover it.)
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/flow_cursor.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const errs = [], fails = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const fresh = async () => { await B.gotoApp(page, HTML); await page.evaluate(() => localStorage.clear()); await B.gotoApp(page, HTML); await B.enterApp(page); };
  const pane = async (id) => { await page.evaluate((t) => switchTab(t), id); await page.waitForFunction((t) => { const e = document.getElementById(t); return e && getComputedStyle(e).display !== 'none'; }, id, { timeout: B.ACT_MS }); await B.settle(page); };
  const walkWi = () => page.evaluate(() => document.querySelector('#walk deep-walkthrough')._wi);
  const roundTrip = () => page.evaluate(async () => {
    const id = TopicRegistry.current().id, other = TopicRegistry.ids().find((x) => x !== id);
    TopicRegistry.setTopic(other); await new Promise((r) => setTimeout(r, 150));
    TopicRegistry.setTopic(id); await new Promise((r) => setTimeout(r, 150));
    return id;
  });

  /* ---- round-trip: step the walk, leave the topic, return -> the cursor is restored ---- */
  await fresh();
  await page.evaluate((t) => switchTab(t), 'walk'); await B.settle(page);
  await page.evaluate(async () => { const w = document.querySelector('#walk deep-walkthrough'); for (let i = 0; i < 3; i++) { w.next(); await new Promise((r) => setTimeout(r, 20)); } await new Promise((r) => setTimeout(r, 400)); });
  const before = await walkWi();
  const id = await roundTrip();
  const after = await walkWi();
  ok('walk cursor round-trips: stepped to ' + before + ', restored to ' + after + ' after leave+return', before === 3 && after === 3, 'before=' + before + ' after=' + after);

  /* ---- negative control: clear pos -> the walk returns to step 0 (restore reads the record) ---- */
  await sleep(400);   /* let the 300ms throttle flush any pending write before we clear the record */
  const neg = await page.evaluate(async (tid) => {
    localStorage.removeItem('ddr.v1.pos.' + tid);
    const other = TopicRegistry.ids().find((x) => x !== tid);
    TopicRegistry.setTopic(other); await new Promise((r) => setTimeout(r, 150));
    TopicRegistry.setTopic(tid); await new Promise((r) => setTimeout(r, 150));
    return document.querySelector('#walk deep-walkthrough')._wi;
  }, id);
  ok('[negative control] no pos -> walk restores to step 0 (not a stale hardcoded value)', neg === 0, 'restored to ' + neg + ' with pos cleared');

  /* ---- data-driven + clamp: a planted pos is honored; out-of-range clamps to 0 ---- */
  await sleep(400);   /* flush the throttle so the plant below is not clobbered by a pending write */
  const planted = await page.evaluate(async (tid) => {
    localStorage.setItem('ddr.v1.pos.' + tid, JSON.stringify({ walk: 5 }));
    const other = TopicRegistry.ids().find((x) => x !== tid);
    TopicRegistry.setTopic(other); await new Promise((r) => setTimeout(r, 150));
    TopicRegistry.setTopic(tid); await new Promise((r) => setTimeout(r, 150));
    const at5 = document.querySelector('#walk deep-walkthrough')._wi;
    await new Promise((r) => setTimeout(r, 400));   /* flush the pending walk:5 write before re-planting */
    localStorage.setItem('ddr.v1.pos.' + tid, JSON.stringify({ walk: 999 }));
    TopicRegistry.setTopic(other); await new Promise((r) => setTimeout(r, 150));
    TopicRegistry.setTopic(tid); await new Promise((r) => setTimeout(r, 150));
    const clamped = document.querySelector('#walk deep-walkthrough')._wi;
    return { at5, clamped };
  }, id);
  ok('cursor is data-driven: planted pos.walk=5 restores to step 5', planted.at5 === 5, JSON.stringify(planted));
  ok('out-of-range pos.walk=999 clamps to step 0 (never a broken index)', planted.clamped === 0, JSON.stringify(planted));

  /* ---- drill cursor: grade some probes, leave, return -> restored to the probe left off ---- */
  await fresh();
  await pane('drill');
  const gradeN = (n) => page.evaluate(async (k) => {
    const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms));
    let done = 0, g = 0; while (g++ < 300 && done < k) { if (r.getElementById('adv')) { r.getElementById('adv').click(); await s(3); continue; } const jg = r.getElementById('jg'); if (!jg) break; jg.click(); done++; await s(4); }
    await s(400);
  }, n);
  await gradeN(5);
  const d1 = await page.evaluate(() => { const d = document.querySelector('#drill deep-drill'); const id = TopicRegistry.current().id; const rec = JSON.parse(localStorage.getItem('ddr.v1.progress.' + id) || 'null'); return { di: d.di, id, bank: d.shadowRoot.querySelectorAll('.dn-step').length, recDone: rec ? rec.done : 0 }; });
  const drillRestored = await page.evaluate(async (id) => {
    const o = TopicRegistry.ids().find((x) => x !== id);
    TopicRegistry.setTopic(o); await new Promise((r) => setTimeout(r, 200));
    TopicRegistry.setTopic(id); await new Promise((r) => setTimeout(r, 300));
    return document.querySelector('#drill deep-drill').di;
  }, d1.id);
  ok('drill cursor round-trips: graded to probe ' + d1.di + ', restored to ' + drillRestored + ' after leave+return', d1.di === 5 && drillRestored === 5, JSON.stringify({ d1: d1.di, restored: drillRestored }));

  /* ---- RESTORE NEVER REGRADES: from the restored probe, grade to the end -> the record keeps the
   * earlier probes (done grows to the FULL bank, not reset to this run's count) ---- */
  await gradeN(999);   /* finish the rest of the bank from the restored probe */
  const d4 = await page.evaluate((id) => { const rec = JSON.parse(localStorage.getItem('ddr.v1.progress.' + id) || 'null'); return { recDone: rec ? rec.done : 0 }; }, d1.id);
  ok('restore-never-regrades: record keeps 0..4, done reaches the full bank (' + d1.bank + '), not this run\'s ' + (d1.bank - 5), d4.recDone === d1.bank, JSON.stringify({ before: d1.recDone, afterFinish: d4.recDone, bank: d1.bank }));

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FLOW CURSOR: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
