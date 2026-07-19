#!/usr/bin/env node
/*
 * WAVE 0 -- "un-lie the data". This check pins the four data-honesty guarantees the flow-grammar
 * waves are built on. Every assertion here FAILS on the pre-Wave-0 build (run it against the old
 * deliverable to watch the red), which is the whole point: a guarantee no test can break is not a
 * guarantee. Ground truth: _audit/2026-07-18-flow-design-panel.md (Direction A, Wave 0).
 *
 *   1. THE pickRec LADDER, GOLDEN-PINNED (incl. the new branch 6.5). The decision table is now a
 *      load-bearing contract for every future guidance surface, so it is pinned rung by rung.
 *      Branch 6.5 is the discovered engine-defect fix: pickRec structurally never handed anyone to
 *      a FIRST mixed-fire run (branch 7 requires a non-empty fumble list), so a user who drilled,
 *      whiteboarded and ran a mock but never touched mixed fire fell straight to "you're ready".
 *
 *   2. THE MICROTASK FRESHNESS LAW (drill AND wb, last-grade-then-read). A grade updates the
 *      canonical record SYNCHRONOUSLY, but only AFTER the completion render (whiteboard.js runs
 *      _updCount() then _emitGraded(); the drill renders then dispatches drillgraded). So a rec
 *      computed INLINE at that render reads the record ONE GRADE SHORT. This drives a real grade to
 *      completion and proves: read at the render == stale (one short, misses the last grade); read
 *      via flowFresh (a microtask) == fresh. If flowFresh ever stops deferring, these go red.
 *
 *   3. PER-TOPIC RE-KEY ISOLATION. Mock/mixed-fire results are stored per topic (mock.<id> /
 *      mix.<id>), not the old global, topic-less mock.last / mix.log. A real mock+mix on topic A
 *      must not leak one number into topic B, and switching back to A must restore A's record.
 *      Exercises the REAL writers (renderMockEnd, mxJudge) and the load-on-deeptopicchange path.
 *
 *   4. LEGACY MIGRATION. The old global records carry no topic id -> unattributable -> discarded
 *      on boot (a wrong grade is worse than a missing one: progress.js doctrine), idempotently.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/flow_data.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] ||
  path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

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

  const BOOT = (opts) => B.gotoApp(page, HTML, opts);
  const FRESH = async () => { await BOOT(); await page.evaluate(() => localStorage.clear()); await BOOT(); };
  const PANE_ON = async (id) => {
    await page.evaluate((t) => switchTab(t), id);
    await page.waitForFunction(
      (t) => { const el = document.getElementById(t); return !!el && getComputedStyle(el).display !== 'none'; },
      id, { timeout: B.ACT_MS });
    await B.settle(page);
  };

  /* ===================== 1. pickRec ladder, golden-pinned (incl. 6.5) ===================== */
  await BOOT();
  const ladder = await page.evaluate(() => {
    /* mockMidBar(6) === 4, so score 5 is STRONG and 2 is WEAK. Each row sets exactly the state
       that must select that rung, with every earlier condition false. */
    const P = (a) => pickRec(a.revisit || [], a.missed || [], (a.mScore == null ? null : a.mScore),
      a.dDone || 0, (a.dTot == null ? 22 : a.dTot), a.wbDone || 0, a.mRuns || 0,
      a.mixWeak || [], a.mOutOf || 6, a.mixTot || 0);
    return {
      b1: P({ revisit: ['sig'], dDone: 22, dTot: 22, wbDone: 5 }),
      b2: P({ missed: ['step'], dDone: 22, dTot: 22, wbDone: 5 }),
      b3: P({ mScore: 2, dDone: 22, dTot: 22, wbDone: 5, mRuns: 1, mixTot: 1 }),
      b4: P({ dDone: 10, dTot: 22 }),
      b5: P({ dDone: 22, dTot: 22, wbDone: 0 }),
      b6: P({ dDone: 22, dTot: 22, wbDone: 5, mRuns: 0 }),
      b65: P({ mScore: 5, dDone: 22, dTot: 22, wbDone: 5, mRuns: 1, mixWeak: [], mixTot: 0 }),
      b7: P({ mScore: 5, dDone: 22, dTot: 22, wbDone: 5, mRuns: 1, mixWeak: ['a'], mixTot: 3 }),
      b8: P({ mScore: 5, dDone: 22, dTot: 22, wbDone: 5, mRuns: 1, mixWeak: [], mixTot: 3 }),
    };
  });
  ok('ladder 1: revisit -> re-drill weak spots', ladder.b1.tab === 'drill' && /Re-drill weak spots/.test(ladder.b1.btn), JSON.stringify(ladder.b1));
  ok('ladder 2: missed steps -> re-draw missed', ladder.b2.tab === 'wb' && /Re-draw missed steps/.test(ladder.b2.btn), JSON.stringify(ladder.b2));
  ok('ladder 3: weak mock -> run the round again', ladder.b3.tab === '__mock__' && /Run the round again/.test(ladder.b3.btn), JSON.stringify(ladder.b3));
  ok('ladder 4: drill unfinished -> back to the drill', ladder.b4.tab === 'drill' && /Back to the drill/.test(ladder.b4.btn), JSON.stringify(ladder.b4));
  ok('ladder 5: no whiteboard -> try the whiteboard', ladder.b5.tab === 'wb' && /Try the whiteboard/.test(ladder.b5.btn), JSON.stringify(ladder.b5));
  ok('ladder 6: no mock -> start a mock run', ladder.b6.tab === '__mock__' && /Start a mock run/.test(ladder.b6.btn), JSON.stringify(ladder.b6));
  ok('ladder 6.5 (THE NEW RUNG): mixTot===0 -> run mixed fire', ladder.b65.tab === '__mix__' && /Run mixed fire/.test(ladder.b65.btn) && /haven/.test(ladder.b65.text), JSON.stringify(ladder.b65));
  ok('ladder 7: mixed fumbles -> run mixed fire (distinct copy from 6.5)', ladder.b7.tab === '__mix__' && /Run mixed fire/.test(ladder.b7.btn) && /fumbled/.test(ladder.b7.text), JSON.stringify(ladder.b7));
  ok('ladder 8: all solid + mixed done -> you are ready (no button)', ladder.b8.btn === null && ladder.b8.tab === null, JSON.stringify(ladder.b8));
  ok('6.5 and 7 are distinct rungs (mixTot===0 never falls through to "ready")', ladder.b65.btn !== null && /haven/.test(ladder.b65.text) && /fumbled/.test(ladder.b7.text), JSON.stringify({ b65: ladder.b65.text, b7: ladder.b7.text }));

  /* ===================== 2. flowFresh defers to a microtask ===================== */
  const fresh = await page.evaluate(async () => {
    const order = [];
    flowFresh(() => order.push('micro'));
    order.push('sync');
    await Promise.resolve();   /* let the microtask queue drain */
    return { isFn: typeof flowFresh === 'function', order };
  });
  ok('flowFresh is a function that defers to a microtask (sync runs before micro)',
    fresh.isFn && fresh.order[0] === 'sync' && fresh.order[1] === 'micro', JSON.stringify(fresh));

  /* ===================== 3. freshness law -- DRILL last-grade-then-read ===================== */
  await FRESH();
  await B.enterApp(page);
  await PANE_ON('drill');
  const drillFresh = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const id = TopicRegistry.current().id;
    const d = document.querySelector('#drill deep-drill'), r = d.shadowRoot;
    const doneNow = () => { const p = Progress.get(id); return p ? p.done : 0; };
    const recNow = () => { const s = sessStats(); return pickRec(s.revisit, s.missed, s.mScore, s.dDone, s.dTot, s.wbDone, s.mRuns, s.mixWeak, mOut(s), s.mixTot); };
    let cap = null;
    const origDisp = d.dispatchEvent.bind(d);
    /* Intercept exactly at the completion render: BEFORE origDisp the grade has NOT reached the
       record (snapshot runs inside the dispatch). `before` == an inline rec; flowFresh reads after. */
    d.dispatchEvent = function (ev) {
      if (ev && ev.type === 'drillgraded') {
        const before = { done: doneNow(), rec: recNow() };
        const rv = origDisp(ev);
        flowFresh(() => { cap = { before, after: { done: doneNow(), rec: recNow() } }; });
        return rv;
      }
      return origDisp(ev);
    };
    let guard = 0;
    while (guard++ < 400) {
      if (r.getElementById('adv')) { r.getElementById('adv').click(); await sleep(2); continue; }
      const jg = r.getElementById('jg'), js = r.getElementById('js');
      if (!jg || !js) break;                                  /* debrief reached */
      (d.di === cards.length - 1 ? js : jg).click();          /* all solid, LAST one shaky */
      await sleep(4);
    }
    await sleep(40);                                          /* drain the last microtask */
    d.dispatchEvent = origDisp;
    const total = (Progress.get(id) || {}).done || 0;
    return { cap, total };
  });
  ok('drill freshness: at the completion render the record is ONE GRADE SHORT (inline read is stale)',
    !!drillFresh.cap && drillFresh.cap.before.done === drillFresh.total - 1, JSON.stringify(drillFresh));
  ok('drill freshness: flowFresh reads the record AFTER the grade lands (fresh)',
    !!drillFresh.cap && drillFresh.cap.after.done === drillFresh.total, JSON.stringify(drillFresh));
  ok('drill freshness: the inline rec recommends the state just left; flowFresh sees the new one',
    !!drillFresh.cap && /Back to the drill/.test(drillFresh.cap.before.rec.btn || '') && /Re-drill weak spots/.test(drillFresh.cap.after.rec.btn || ''),
    JSON.stringify(drillFresh.cap));

  /* ===================== 4. freshness law -- WHITEBOARD last-grade-then-read ===================== */
  await FRESH();
  await B.enterApp(page);
  await PANE_ON('wb');
  const wbFresh = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const id = TopicRegistry.current().id;
    const w = document.querySelector('#wb deep-whiteboard'), r = w.shadowRoot;
    const doneNow = () => { const p = Progress.wbGet(id); return p ? (p.got + p.missed) : 0; };
    const recNow = () => { const s = sessStats(); return pickRec(s.revisit, s.missed, s.mScore, s.dDone, s.dTot, s.wbDone, s.mRuns, s.mixWeak, mOut(s), s.mixTot); };
    let cap = null;
    const origDisp = w.dispatchEvent.bind(w);
    w.dispatchEvent = function (ev) {
      if (ev && ev.type === 'whiteboardgraded') {
        const before = { done: doneNow(), rec: recNow() };
        const rv = origDisp(ev);
        flowFresh(() => { cap = { before, after: { done: doneNow(), rec: recNow() } }; });
        return rv;
      }
      return origDisp(ev);
    };
    const lis = r.querySelectorAll('#wblist li');
    for (let i = 0; i < lis.length; i++) {
      lis[i].querySelector('.wb-rev').click(); await sleep(2);
      lis[i].querySelector(i === lis.length - 1 ? '.wb-miss' : '.wb-got').click();   /* all got, LAST missed */
      await sleep(3);
    }
    await sleep(40);
    w.dispatchEvent = origDisp;
    return { cap, total: lis.length };
  });
  ok('wb freshness: at the completion render the record is ONE GRADE SHORT (inline read is stale)',
    !!wbFresh.cap && wbFresh.cap.before.done === wbFresh.total - 1, JSON.stringify(wbFresh));
  ok('wb freshness: flowFresh reads the record AFTER the grade lands (fresh)',
    !!wbFresh.cap && wbFresh.cap.after.done === wbFresh.total, JSON.stringify(wbFresh));
  ok('wb freshness: the inline rec MISSES the just-missed step; flowFresh catches it',
    !!wbFresh.cap && !/Re-draw missed/.test(wbFresh.cap.before.rec.btn || '') && /Re-draw missed/.test(wbFresh.cap.after.rec.btn || ''),
    JSON.stringify(wbFresh.cap));

  /* ===================== 5. per-topic re-key isolation (mock + mix) ===================== */
  await FRESH();
  await B.enterApp(page);
  const reKey = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const A = TopicRegistry.current().id;
    const otherB = TopicRegistry.ids().find((x) => x !== A);
    /* run a real mock on A to a strong score (exercises renderMockEnd, the real writer) */
    openMock(); await sleep(20);
    let guard = 0;
    while (guard++ < 60) { const nb = mockRoot.getElementById('mbnext'); if (nb) { nb.click(); await sleep(6); continue; } break; }
    const scoreRow = mockRoot.getElementById('mbscore');
    const scoreBtns = scoreRow ? scoreRow.querySelectorAll('[data-s]') : [];
    if (scoreBtns.length) scoreBtns[scoreBtns.length - 1].click();     /* top score */
    await sleep(15);
    closeMock(); await sleep(8);
    const aScore = mockLastScore, aRuns = mockRuns;
    const aMockKey = Store.get('mock.' + A, null);
    /* grade one real mixed-fire item on A (exercises mxJudge, the real writer) */
    openMix(); await sleep(15);
    mixRoot.getElementById('mxshow').click(); await sleep(8);
    mixRoot.getElementById('mxg').click(); await sleep(8);
    const aMixKey = Store.get('mix.' + A, null);
    /* switch to B: deeptopicchange must load B's (empty) records into the live globals */
    TopicRegistry.setTopic(otherB); await sleep(15);
    const bStats = sessStats();
    const onB = {
      mScore: mockLastScore, mRuns: mockRuns, mixLen: mixLog.length,
      mockKey: Store.get('mock.' + otherB, null), mixKey: Store.get('mix.' + otherB, null),
      ranMock: mockRanAny(), ranMix: mixRanAny(),
    };
    /* switch back to A: its record must be restored, not regenerated blank */
    TopicRegistry.setTopic(A); await sleep(15);
    const backA = { mScore: mockLastScore, mRuns: mockRuns, mixLen: mixLog.length };
    return { A, B: otherB, aScore, aRuns, aMockKey, aMixKey, bStats, onB, backA };
  });
  ok('mock persists under mock.<id> (real writer re-keyed)', !!reKey.aMockKey && reKey.aMockKey.runs >= 1 && reKey.aMockKey.score === reKey.aScore, JSON.stringify(reKey.aMockKey));
  ok('mix persists under mix.<id> (real writer re-keyed)', Array.isArray(reKey.aMixKey) && reKey.aMixKey.length >= 1, JSON.stringify(reKey.aMixKey));
  ok('switching to topic B zeroes the live mock globals (no cross-topic leak)', reKey.onB.mScore === null && reKey.onB.mRuns === 0 && reKey.onB.mixLen === 0, JSON.stringify(reKey.onB));
  ok('topic B has no mock/mix key of its own', reKey.onB.mockKey === null && reKey.onB.mixKey === null, JSON.stringify({ mockKey: reKey.onB.mockKey, mixKey: reKey.onB.mixKey }));
  ok('topic B session panel reads not-run for mock and mixed fire', reKey.bStats.mRuns === 0 && reKey.bStats.mScore === null && reKey.bStats.mixTot === 0, JSON.stringify({ mRuns: reKey.bStats.mRuns, mScore: reKey.bStats.mScore, mixTot: reKey.bStats.mixTot }));
  ok('mockRanAny/mixRanAny are CROSS-topic (engaged() reader path, true on B because A has records)', reKey.onB.ranMock === true && reKey.onB.ranMix === true, JSON.stringify({ ranMock: reKey.onB.ranMock, ranMix: reKey.onB.ranMix }));
  ok('switching back to A restores its mock+mix record (load-on-entry)', reKey.backA.mRuns >= 1 && reKey.backA.mScore === reKey.aScore && reKey.backA.mixLen >= 1, JSON.stringify(reKey.backA));

  /* ===================== 6. legacy migration -- honest discard, idempotent ===================== */
  await BOOT();
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('ddr.v1.mock.last', JSON.stringify({ score: 3, outOf: 6, time: 120, runs: 2, int: 0 }));
    localStorage.setItem('ddr.v1.mix.log', JSON.stringify([{ kind: 'Depth probe', label: 'x', ok: false }]));
  });
  await BOOT();                                              /* reload -> boot migration runs */
  const mig = await page.evaluate(() => ({
    mockLast: localStorage.getItem('ddr.v1.mock.last'),
    mixLog: localStorage.getItem('ddr.v1.mix.log'),
    mockMig: (typeof __mockMig !== 'undefined') ? __mockMig.legacy : '(absent)',
    mixMig: (typeof __mixMig !== 'undefined') ? __mixMig.legacy : '(absent)',
    ranMock: mockRanAny(), ranMix: mixRanAny(),
  }));
  ok('legacy mock.last is DISCARDED on boot (unattributable -> honest discard), and reported', mig.mockLast === null && mig.mockMig === 'discarded', JSON.stringify(mig));
  ok('legacy mix.log is DISCARDED on boot, and reported', mig.mixLog === null && mig.mixMig === 'discarded', JSON.stringify(mig));
  ok('a discarded legacy record leaves the user NOT falsely engaged (no per-topic records exist)', mig.ranMock === false && mig.ranMix === false, JSON.stringify({ ranMock: mig.ranMock, ranMix: mig.ranMix }));
  await BOOT();                                              /* reload again -> nothing left to do */
  const mig2 = await page.evaluate(() => ({
    mockLast: localStorage.getItem('ddr.v1.mock.last'),
    mixLog: localStorage.getItem('ddr.v1.mix.log'),
    mockMig: (typeof __mockMig !== 'undefined') ? __mockMig.legacy : '(absent)',
    mixMig: (typeof __mixMig !== 'undefined') ? __mixMig.legacy : '(absent)',
  }));
  ok('migration is idempotent across reloads (keys stay gone, re-run reports nothing to do)',
    mig2.mockLast === null && mig2.mixLog === null && mig2.mockMig === 'none' && mig2.mixMig === 'none', JSON.stringify(mig2));

  ok('zero console/page errors across the whole run', errs.length === 0, errs.slice(0, 5).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FLOW DATA: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
