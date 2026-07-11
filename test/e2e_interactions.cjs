#!/usr/bin/env node
/*
 * Interaction e2e for the assembled single-file deliverable -- codifies the
 * flows that were previously only hand-verified in a browser, so THE GATE
 * catches a regression instead of a human having to remember to click around.
 *
 * Local use:
 *   npm i && npx playwright install chromium
 *   node test/e2e_interactions.cjs                     # ../deepdive_content_pipeline_rehearsal.html
 *   node test/e2e_interactions.cjs path/to/file.html
 *   CHROME=/path/to/chrome node test/e2e_interactions.cjs
 *
 * Covers, in a real browser, with zero console/page errors throughout:
 *   - theme toggle flips html[data-theme]
 *   - text-zoom (A-/A+) changes the --read-zoom on .stage
 *   - drill must-hit-points checklist renders + ticking updates coverage
 *   - rescues: scroll-to-top button, pomodoro countdown, page-visibility wiring
 * Interactions are driven in-page (evaluate .click()) and reach into shadow
 * roots directly, so the checks do not depend on view-transition paint timing.
 * Exits non-zero on any failure.
 */
const path = require('path');
const { chromium } = require('playwright');

const HTML = process.argv[2] ||
  path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

(async () => {
  const errs = [], fails = [];
  const ok = (name, cond) => { console.log((cond ? '  PASS ' : '  FAIL ') + name); if (!cond) fails.push(name); };

  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(300);

  /* ---- theme toggle ---- */
  const theme = await page.evaluate(() => {
    const before = document.documentElement.dataset.theme || 'light';
    document.getElementById('themetog').click();
    const after = document.documentElement.dataset.theme;
    document.getElementById('themetog').click();       // restore
    return { before, after };
  });
  ok('theme toggle flips data-theme', !!theme.after && theme.after !== theme.before);

  /* ---- text-zoom (A-/A+) drives --read-zoom on .stage ---- */
  const zoom = await page.evaluate(() => {
    const stage = document.querySelector('.stage');
    const read = () => (getComputedStyle(stage).getPropertyValue('--read-zoom') || '').trim();
    const btns = document.querySelectorAll('.textzoom-btn');
    const before = read();
    if (btns.length) btns[btns.length - 1].click();     // last = A+ (increase)
    return { n: btns.length, before, after: read() };
  });
  ok('text-zoom controls present', zoom.n >= 2);
  ok('text-zoom changes --read-zoom', !!zoom.after && zoom.after !== zoom.before);

  /* ---- drill must-hit-points checklist + grounded coverage ---- */
  const mh = await page.evaluate(() => {
    const drill = document.querySelector('#drill deep-drill');
    if (!drill || !drill.shadowRoot) return { err: 'no drill component' };
    const r = drill.shadowRoot;
    let g = 0;
    while (r.getElementById('adv') && g++ < 12) r.getElementById('adv').click();  // -> judge stage
    const items = r.querySelectorAll('.mhp-i');
    const before = (r.getElementById('mhpN') || {}).textContent;
    if (items.length) items[0].click();
    const after = (r.getElementById('mhpN') || {}).textContent;
    return { judge: !!r.getElementById('jg'), count: items.length, before, after };
  });
  ok('drill reaches the judge stage', mh.judge === true);
  ok('must-hit checklist renders points', mh.count >= 1);
  ok('ticking a point updates coverage', mh.before === '0' && mh.after === '1');

  /* ================= MOCK RUN: relative scoring + canonical-bank integrity =================
     Two P1 regressions this locks down, both of which were invisible to every other check:

     1. THE DENOMINATOR WAS HARDCODED 6. The 8 hand-coded topics author 6 mock beats; the 38
        markdown topics author TWO (tagged SCALE + DESIGN). A flawless run on any of those 38
        scored 2, fell under the `score >= 4` middle bucket, and was handed the BOTTOM verdict
        ("the arc isn't solid yet") -- unescapable on 38 of 46 topics.
     2. THE RUN WROTE THROUGH INTO THE CANONICAL BANK. Both bank builders assemble the curveball
        pool as [ the CURVEBALL mockBeat, ...extras ], so pool[0] IS a bank object, and
        publishBanks only .slice()d the pool (new array, SAME objects). openMock then did
        `mockBeats[mockCurveIdx] = curveballPool[rand]` (aliasing a bank object into the run) and
        `mockBeats[mockFrameIdx].cue = framePool[rand]`. On all 38 markdown topics neither a FRAME
        nor a CURVEBALL beat exists, so BOTH indices defaulted to 0 and that second line wrote a
        frame cue straight into the pooled curveball -- permanently, and mixed fire draws from that
        same pool.

     Driven on a MARKDOWN topic, which is where both bugs actually bite. */
  const helper = await page.evaluate(() => {
    /* pick a topic whose beats are NOT the hand-coded 6 -- i.e. one the old hardcoded 6 lied about */
    const ids = TopicRegistry.ids();
    const md = ids.find((i) => TopicRegistry.get(i).data.bank.mockBeats.length !== 6);
    return { md: md || null, total: ids.length };
  });
  ok('a topic exists whose beat count is not 6', !!helper.md);

  const runMock = async (topicId) => page.evaluate(async (t) => {
    TopicRegistry.setTopic(t);
    const bank = TopicRegistry.get(t).data.bank;
    const snap = () => JSON.stringify({ c: bank.curveballs, b: bank.mockBeats, f: bank.frames });
    const poolSnap = () => JSON.stringify(curveballPool);
    const canonBefore = snap(), poolBefore = poolSnap();
    const authored = bank.mockBeats.length;

    document.getElementById('mockopen').click();
    await new Promise((r) => setTimeout(r, 200));
    let shown = 0, undef = 0;
    for (let i = 0; i < 40; i++) {                       // walk every beat, answering it "well"
      const next = mockRoot.getElementById('mbnext');
      if (!next) break;                                  // end screen
      const rev = mockRoot.getElementById('mbrev');
      if (rev && !rev.disabled) rev.click();
      /* A beat must never paint the literal string "undefined" -- an unguarded optional field
         (`'<div class="mb-task">' + beat.task + '</div>'` with no task) renders EXACTLY that.
         Match the ARTIFACT SHAPE ">undefined<" in the markup, not the word in textContent:
         textContent concatenates children with no separator, so the real bug reads
         "...how?undefinedModel answer" and a /\bundefined\b/ scan cannot fail on it (d->M is
         no word boundary). It also cannot false-positive on prose that merely says "undefined". */
      if ((mockbody.innerHTML || '').indexOf('>undefined<') !== -1) undef++;
      shown++;
      next.click();
      await new Promise((r) => setTimeout(r, 40));
    }
    const askedOutOf = mockBeats.length;                 // the beats this run actually asked
    const btns = Array.from(mockbody.querySelectorAll('.mb-score button')).map((b) => +b.getAttribute('data-s'));
    /* score it PERFECTLY: every beat delivered cleanly */
    const perfect = mockbody.querySelector('.mb-score button[data-s="' + askedOutOf + '"]');
    if (perfect) perfect.click();
    await new Promise((r) => setTimeout(r, 120));
    const v = mockbody.querySelector('.mb-verdict');
    const bg = v ? v.style.background : '';
    const out = {
      authored, askedOutOf, shown, undef,
      buttons: btns,
      maxButton: btns.length ? btns[btns.length - 1] : null,
      question: (mockbody.querySelector('.mb-score-q') || {}).textContent || '',
      verdict: v ? (v.textContent || '').trim() : '',
      /* the three buckets are painted teal / accent / amber, in that order */
      top: bg.indexOf('teal') !== -1,
      bottom: bg.indexOf('amber') !== -1,
      canonIntact: snap() === canonBefore,
      poolIntact: poolSnap() === poolBefore,
    };
    mockRoot.getElementById('mbclose2').click();
    await new Promise((r) => setTimeout(r, 350));
    return out;
  }, topicId);

  const md = await runMock(helper.md);
  ok('markdown topic: every authored beat is asked', md.shown === md.askedOutOf && md.askedOutOf >= md.authored);
  ok('markdown topic: score buttons run 0..N, not 0..6', md.maxButton === md.askedOutOf && md.buttons.length === md.askedOutOf + 1);
  ok('markdown topic: the question names the real beat count', !/of the six/.test(md.question) || md.askedOutOf === 6);
  ok('markdown topic: a PERFECT run gets the TOP verdict', md.top === true && md.bottom === false);
  ok('markdown topic: verdict is out of the real beat count', md.verdict.indexOf('/ 6') === -1 || md.askedOutOf === 6);
  ok('markdown topic: mock run leaves the CANONICAL BANK intact', md.canonIntact === true);
  ok('markdown topic: mock run leaves the MIXED-FIRE pool intact', md.poolIntact === true);
  ok('markdown topic: no beat paints the literal "undefined"', md.undef === 0);

  /* the reference spec: the 8 hand-coded topics keep their 6-beat arc, 0..6 scoring and buckets */
  const hand = await runMock('content-pipeline');
  ok('hand-coded topic still asks 6 beats', hand.askedOutOf === 6 && hand.authored === 6);
  ok('hand-coded topic still scores 0..6', hand.maxButton === 6 && hand.buttons.length === 7);
  ok('hand-coded topic: 6/6 is still the TOP verdict', hand.top === true);
  ok('hand-coded topic: bank + pool intact after a run', hand.canonIntact === true && hand.poolIntact === true);

  /* a SECOND run must not compound: reruns rebuild the beats from the pristine bank */
  const md2 = await runMock(helper.md);
  ok('a rerun does not grow or corrupt the beat list', md2.askedOutOf === md.askedOutOf && md2.canonIntact === true && md2.poolIntact === true);

  /* MIXED FIRE reads the same pool the mock run rolls from -- it must show the AUTHORED
     curveball, not a frame cue the mock wrote through into it, and never a bare "undefined". */
  const mx = await page.evaluate(async (t) => {
    TopicRegistry.setTopic(t);
    const authored = TopicRegistry.get(t).data.bank.curveballs.map((c) => c.cue);
    document.getElementById('mixopen').click();
    await new Promise((r) => setTimeout(r, 250));
    const cards = [];
    let undef = 0;
    for (let i = 0; i < 12; i++) {
      const kind = ((mixBody.querySelector('.mx-kind') || {}).textContent || '').trim();
      const prompt = ((mixBody.querySelector('.qq') || {}).textContent || '').trim();
      if (kind === 'Curveball') cards.push(prompt);
      const show = mixRoot.getElementById('mxshow');
      if (!show) break;
      show.click();
      await new Promise((r) => setTimeout(r, 40));
      if ((mixBody.innerHTML || '').indexOf('>undefined<') !== -1) undef++;   /* see the note in runMock */
      const g = mixRoot.getElementById('mxg');
      if (!g) break;
      g.click();
      await new Promise((r) => setTimeout(r, 40));
    }
    document.getElementById('mixx').click();
    await new Promise((r) => setTimeout(r, 300));
    /* every curveball mixed fire showed must still open with an AUTHORED cue */
    const allAuthored = cards.every((p) => authored.some((c) => p.indexOf(c.replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—')) === 0));
    return { seen: cards.length, allAuthored, undef };
  }, helper.md);
  ok('mixed fire curveballs are the AUTHORED cues, not mock-run debris', mx.seen === 0 || mx.allAuthored === true);
  ok('mixed fire never paints the literal "undefined"', mx.undef === 0);

  /* ---- rescue: scroll-to-top (button built; shows past threshold if scrollable) ---- */
  const stb = await page.evaluate(() => !!document.getElementById('scrolltop'));
  ok('scroll-to-top button built', stb);
  const st = await page.evaluate(async () => {
    window.scrollTo(0, 700); window.dispatchEvent(new Event('scroll'));
    await new Promise(r => setTimeout(r, 90));
    const b = document.getElementById('scrolltop');
    const shown = !!(b && b.classList.contains('show'));
    if (shown) { b.click(); await new Promise(r => setTimeout(r, 80)); }
    return { scrolled: window.pageYOffset, shown };
  });
  /* only a hard assert when the page was actually scrollable past the threshold */
  ok('scroll-to-top reveals on deep scroll', st.shown || st.scrolled < 400);

  /* ---- rescue: pomodoro counts down on play ---- */
  const pomo = await page.evaluate(async () => {
    const w = document.getElementById('pomodoro');
    if (!w) return { present: false };
    const t0 = (w.querySelector('.pomodoro-time') || {}).textContent;
    const play = w.querySelector('.pomodoro-play');
    if (play) play.click();
    await new Promise(r => setTimeout(r, 1150));
    const t1 = (w.querySelector('.pomodoro-time') || {}).textContent;
    if (play) play.click();                              // pause
    return { present: true, t0, t1 };
  });
  ok('pomodoro widget present', pomo.present === true);
  ok('pomodoro counts down on play', pomo.present && pomo.t0 === '25:00' && pomo.t1 !== pomo.t0);

  /* ---- rescue: page-visibility wired (no error; exposes the hidden flag) ---- */
  const pv = await page.evaluate(() => {
    let noErr = true;
    try { document.dispatchEvent(new Event('visibilitychange')); } catch (e) { noErr = false; }
    return { wired: typeof window.__appHidden === 'boolean', noErr };
  });
  ok('page-visibility wired', pv.wired && pv.noErr);

  /* ---- zero console / page errors across all flows ---- */
  ok('zero console/page errors', errs.length === 0);

  await browser.close();
  errs.slice(0, 8).forEach(e => console.log('  ' + e));
  const pass = fails.length === 0;
  console.log('E2E INTERACTIONS: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
