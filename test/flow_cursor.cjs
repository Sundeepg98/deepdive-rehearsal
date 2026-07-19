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

  /* ================= DRILL PROBE CURSOR (BEAT 1) ================= */
  const gradeN = (n) => page.evaluate(async (k) => {
    const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms));
    let done = 0, g = 0; while (g++ < 300 && done < k) { if (r.getElementById('adv')) { r.getElementById('adv').click(); await s(3); continue; } const jg = r.getElementById('jg'); if (!jg) break; jg.click(); done++; await s(4); }
    await s(400);
  }, n);
  const gradeMiss1 = () => page.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms));
    let g = 0; while (r.getElementById('adv') && g++ < 25) { r.getElementById('adv').click(); await s(3); }
    r.getElementById('jm').click(); await s(400);   /* probe 0 -> Missed: a revisit flag; di -> 1 */
  });
  const posOf = (id) => page.evaluate((i) => JSON.parse(localStorage.getItem('ddr.v1.pos.' + i) || 'null'), id);
  const recOf = (id) => page.evaluate((i) => localStorage.getItem('ddr.v1.progress.' + i), id);
  const leaveReturn = (id) => page.evaluate(async (i) => {
    const o = TopicRegistry.ids().find((x) => x !== i);
    TopicRegistry.setTopic(o); await new Promise((r) => setTimeout(r, 200));
    TopicRegistry.setTopic(i); await new Promise((r) => setTimeout(r, 300));   /* restore fires on return */
    return document.querySelector('#drill deep-drill').di;
  }, id);
  const debriefPct = () => page.evaluate(() => { const d = document.querySelector('#drill deep-drill'); const sl = d.shadowRoot.querySelector('.debrief .sumline'); const txt = sl ? sl.textContent : ''; const m = txt.match(/(\d+)%/); return { pct: m ? +m[1] : -1, txt: txt }; });

  /* ---- round-trip + RESTORE-IN-ISOLATION: grade 5, leave+return -> di is restored AND the grade
   *      record is BYTE-IDENTICAL (incl. ts) -- a pure restore is display-only and writes nothing. ---- */
  await fresh();
  await pane('drill');
  await gradeN(5);
  const d1 = await page.evaluate(() => { const d = document.querySelector('#drill deep-drill'); return { di: d.di, id: TopicRegistry.current().id, bank: d.shadowRoot.querySelectorAll('.dn-step').length }; });
  const recBefore = await recOf(d1.id);
  const drillRestored = await leaveReturn(d1.id);
  const recAfter = await recOf(d1.id);
  ok('drill cursor round-trips: graded to probe ' + d1.di + ', restored to ' + drillRestored, d1.di === 5 && drillRestored === 5, JSON.stringify({ di: d1.di, restored: drillRestored }));
  ok('restore-in-isolation writes NOTHING to the grade record (byte-identical incl. ts)', !!recBefore && recAfter === recBefore, 'a pure leave+return changed the record -- restore is touching grades\n       before=' + recBefore + '\n       after =' + recAfter);

  /* ---- restore-never-regrades (MERGE): finish 5..end -> done reaches the FULL bank (0..4 kept by
   *      content-id), never reset to this run's count. ---- */
  await gradeN(999);
  const mergeDone = await page.evaluate((id) => { const rec = JSON.parse(localStorage.getItem('ddr.v1.progress.' + id) || 'null'); return rec ? rec.done : 0; }, d1.id);
  ok('restore-never-regrades: 0..4 kept, done reaches the full bank (' + d1.bank + '), not this run\'s ' + (d1.bank - 5), mergeDone === d1.bank, JSON.stringify({ done: mergeDone, bank: d1.bank }));

  /* ---- write-guard honesty: a REVISIT sub-drill (mode stays 'study', revisitMode=true, `cards`
   *      shrunk to the subset) must NOT overwrite the full-bank study cursor -- else Resume lands on a
   *      subset index. The guard is (study && all && !revisit); mode==='study' alone leaks the lie. ---- */
  await fresh();
  await pane('drill');
  const gId = await page.evaluate(() => TopicRegistry.current().id);
  await gradeMiss1();     /* probe 0 -> Missed (revisit flag), di -> 1 */
  await gradeN(2);        /* probes 1,2 -> Solid, di = 3 in the full study walk */
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));   /* flush pos.drill = 3 */
  const posB = await posOf(gId);
  await page.evaluate(async () => { document.querySelector('#drill deep-drill').drillRevset(); await new Promise((r) => setTimeout(r, 450)); });
  const posA = await posOf(gId);
  const gst = await page.evaluate(() => { const d = document.querySelector('#drill deep-drill'); return { mode: d.mode, rev: d.revisitMode, di: d.di }; });
  ok('write-guard: a revisit sub-drill (mode \'' + gst.mode + '\', revisit ' + gst.rev + ', di ' + gst.di + ') does NOT overwrite the study cursor (stays 3)', !!posB && !!posA && posB.drill === 3 && posA.drill === 3, JSON.stringify({ before: posB, after: posA, gst: gst }));

  /* ---- RESUME-PENALTY: resume at probe 5, finish 5..end ALL SOLID -> the debrief % is over the
   *      probes ANSWERED THIS RUN (100%), NOT the full bank (~77%); the copy says "answered this run". ---- */
  await fresh();
  await pane('drill');
  await gradeN(5);
  const rId = await page.evaluate(() => TopicRegistry.current().id);
  await leaveReturn(rId);          /* di restored to 5 */
  await gradeN(999);               /* grade 5..end all solid -> debrief */
  const resume = await debriefPct();
  ok('resume-penalty: a perfect resume of 5..end reads 100% of THIS RUN, not ~77% of the bank', resume.pct === 100, JSON.stringify(resume));
  ok('resume-penalty copy is un-misreadable ("answered this run", not "signal coverage")', /answered this run/.test(resume.txt) && !/signal coverage/.test(resume.txt), JSON.stringify({ txt: resume.txt }));

  /* ---- STRUCTURAL EQUIVALENCE: a FULL fresh run (di 0..end) is byte-identical to the OLD math --
   *      pct = got/bank and the copy is the unchanged "signal coverage" (no resume penalty applied). ---- */
  await fresh();
  await pane('drill');
  await gradeN(999);               /* full run from probe 1, all solid */
  const full = await debriefPct();
  ok('structural-equivalence: a full fresh run reads 100% "signal coverage" (unchanged old math)', full.pct === 100 && /signal coverage/.test(full.txt) && !/answered this run/.test(full.txt), JSON.stringify(full));

  /* ---- BEAT 2: the HOME CTA resume sub-line carries the pos.<id> drill cursor ("probe N of NN"),
   *      through the SAME posRestore clamp the drill restores with -- not the generic copy ---- */
  await fresh();
  await pane('drill');
  await gradeN(5);                 /* pos.drill = 5 -> Resume lands on probe 6 */
  const home = await page.evaluate(() => {
    const id = TopicRegistry.current().id;
    if (window.Store) Store.set('nav.last', { id: id, view: 'drill' });   /* the resume target = this topic's drill */
    const bank = document.querySelector('#drill deep-drill').shadowRoot.querySelectorAll('.dn-step').length;
    const pd = (JSON.parse(localStorage.getItem('ddr.v1.pos.' + id) || '{}')).drill;
    if (window.HomeView && HomeView.render) HomeView.render();
    const d = document.querySelector('#home .hm-cta .hm-cta-d');
    return { sub: d ? d.textContent : null, bank: bank, pd: pd };
  });
  const want = 'probe ' + (home.pd + 1) + ' of ' + home.bank;
  ok('home CTA resume sub-line shows the drill cursor ("' + want + '")', !!home.sub && home.sub.indexOf(want) !== -1 && home.pd === 5, JSON.stringify(home));

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FLOW CURSOR: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
