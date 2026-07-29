#!/usr/bin/env node
/*
 * W2 OPERATOR REVIEW PAIRS -- the drill entry on a phone, before and after the fold budget.
 *
 * The wave's headline is a NUMBER (.qq top 763 -> 415), and a number is exactly the kind of claim
 * that should not be taken on trust. This renders the screen the number describes, at the two
 * viewports the wave targets, so the operator can look at the thing rather than at the receipt.
 *
 * IT ASSERTS ITS OWN FRAMING, and refuses to write a file it cannot vouch for. Every capture must
 * satisfy all four:
 *     1. innerWidth/innerHeight are EXACTLY what was asked for. The audit lost 59 of 60 rows to a
 *        page whose viewport override was silently reset while setViewportSize kept reporting the
 *        value it had been given -- "assert innerWidth on every measurement" is that lesson.
 *     2. The DRILL is the active pane and its shadow root has actually drawn a .qq. A screenshot
 *        of a pane that never upgraded is a picture of a bug in the harness, not in the app.
 *     3. scrollY is 0. The entire claim is about what is on screen WITHOUT scrolling; a capture
 *        taken at any other offset would answer a different question.
 *     4. The theme actually applied. Both themes are captured and a light shot mislabelled dark
 *        is worse than no shot.
 * Any failure aborts the run non-zero WITHOUT writing, so a broken pair cannot be mistaken for a
 * finding. The exact framing of every written file is printed and re-stated in the freeze report.
 *
 * ENTERED AS A USER DOES -- a real hit-tested mouse click on the "Probe Drill" tab from the
 * Walkthrough, never location.hash. The defect was measured on the user path, so the evidence for
 * fixing it is taken on the user path.
 *
 * Usage:
 *   node _audit/w2-phone-before-after/capture-pairs.cjs <deliverable.html> before|after [outDir]
 * Writes: <prefix>-360-light.png, <prefix>-360-dark.png, <prefix>-844-light.png
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');

const HTML = process.argv[2] || path.join(__dirname, '..', '..', 'deepdive_content_pipeline_rehearsal.html');
const PREFIX = process.argv[3] || 'after';
const OUT = process.argv[4] || __dirname;
const TOPIC = 'content-pipeline';

const SHOTS = [
  { name: '360-light', w: 360, h: 800, theme: 'light' },
  { name: '360-dark', w: 360, h: 800, theme: 'dark' },
  { name: '844-light', w: 844, h: 390, theme: 'light' },
];

/* The framing contract, read from the live page. Everything here is a fact the capture claims. */
const FRAMING = () => {
  const seg = document.querySelector('.sidebar .seg');
  const bar = document.querySelector('.sidebar .mockcta');
  const host = document.querySelector('#drill deep-drill');
  const root = host && host.shadowRoot;
  const qq = root && root.querySelector('.qq');
  const active = document.querySelector('.seg button.on');
  const sr = seg && seg.getBoundingClientRect(), br = bar && bar.getBoundingClientRect();
  const bandTop = sr && getComputedStyle(seg).position === 'fixed' ? sr.bottom : 0;
  const bandBot = br && getComputedStyle(bar).position === 'fixed' ? br.top : window.innerHeight;
  let qqTop = null, firstLineIn = null, lineH = null;
  if (qq) {
    const r = qq.getBoundingClientRect(), cs = getComputedStyle(qq);
    lineH = parseFloat(cs.lineHeight);
    if (!isFinite(lineH)) lineH = parseFloat(cs.fontSize) * 1.4;
    qqTop = Math.round(r.top);
    firstLineIn = r.top >= bandTop - 0.5 && r.top + lineH <= bandBot + 0.5;
  }
  return {
    innerW: window.innerWidth, innerH: window.innerHeight,
    theme: document.documentElement.dataset.theme || 'light',
    activeTab: active ? active.getAttribute('data-tab') : null,
    drewQq: !!qq, qqTop: qqTop, lineH: lineH && Math.round(lineH), firstLineIn: firstLineIn,
    band: [Math.round(bandTop), Math.round(bandBot)],
    scrollY: Math.round(window.scrollY),
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  };
};

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], executablePath: process.env.CHROME });
  const problems = [];
  for (const s of SHOTS) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: s.h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    /* the app's own theme key, set before first paint so nothing flashes into the capture */
    await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, s.theme);
    await page.goto(pathToFileURL(path.resolve(HTML)).href + '#' + TOPIC + '/walk', { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(
      () => document.readyState === 'complete' && typeof switchTab === 'function' && typeof TopicRegistry !== 'undefined' && TopicRegistry.ids().length > 0,
      null, { timeout: 60000 });
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
    await page.waitForTimeout(900);

    /* THE USER PATH: a real hit-tested click on the Probe Drill tab. */
    const sel = '.seg button[data-tab="drill"]';
    await page.locator(sel).scrollIntoViewIfNeeded();
    const box = await page.locator(sel).boundingBox();
    if (!box) { problems.push(s.name + ': the Probe Drill tab has no painted box'); await ctx.close(); continue; }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(
      () => { const h = document.querySelector('#drill deep-drill'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('.qq')); },
      null, { timeout: 30000 }).catch(() => {});
    /* Let the pane's entry animation finish -- a capture taken mid-fade is a picture of a
       transition, and this app's own VR notes measure a 60ms-early capture at 460,000px wrong. */
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const f = await page.evaluate(FRAMING);
    const bad = [];
    if (f.innerW !== s.w || f.innerH !== s.h) bad.push('viewport is ' + f.innerW + 'x' + f.innerH + ', asked ' + s.w + 'x' + s.h);
    if (f.theme !== s.theme) bad.push('theme is ' + f.theme + ', asked ' + s.theme);
    if (f.activeTab !== 'drill') bad.push('active pane is ' + f.activeTab + ', not drill');
    if (!f.drewQq) bad.push('the drill never drew a .qq (shadow root missing or not upgraded)');
    if (f.scrollY !== 0) bad.push('scrollY is ' + f.scrollY + ', not 0');
    if (bad.length) {
      problems.push(s.name + ': ' + bad.join('; '));
    } else {
      const file = path.join(OUT, PREFIX + '-' + s.name + '.png');
      await page.screenshot({ path: file });
      console.log('WROTE ' + path.basename(file) +
        '  ' + f.innerW + 'x' + f.innerH + ' ' + f.theme +
        '  .qq top=' + f.qqTop + ' band=' + JSON.stringify(f.band) +
        ' firstLineInBand=' + f.firstLineIn + ' scrollY=' + f.scrollY + ' overflowX=' + f.overflowX);
    }
    await ctx.close();
  }
  await browser.close();
  if (problems.length) {
    console.log('CAPTURE PAIRS: FAIL -- framing not vouched for, nothing written for:');
    problems.forEach((p) => console.log('  - ' + p));
    process.exit(1);
  }
  console.log('CAPTURE PAIRS: OK (' + PREFIX + ')');
})();
