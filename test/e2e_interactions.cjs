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
