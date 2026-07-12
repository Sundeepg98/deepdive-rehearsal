/* ROOM BROWSER INVARIANTS (Phase 6). The two things a grep cannot see:
   1. THE ROOM IS WIRED AT BOOT -- data-group is on <html> and --topic-ink resolves,
      on the very first paint (applyIdentity does NOT run at boot). A dead --topic-accent
      shipped for months precisely because nothing asserted it at runtime.
   2. THE BLANK-PAGE CLASS OF BUG CANNOT RECUR -- under prefers-reduced-motion the app
      still RENDERS (body opacity 1, real light + shadow text), in both themes.
   Usage: node test/room_browser.cjs <deliverable.html>   (CHROME=<path> for the browser). */
const path = require('path');
const { chromium } = require('playwright');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const URL = 'file:///' + path.resolve(HTML).replace(/\\/g, '/');

(async () => {
  const launch = {};
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  const fails = [];

  // 1. room wired at boot
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(URL + '#walk');
    await page.waitForTimeout(600);
    const boot = await page.evaluate(() => ({
      group: document.documentElement.getAttribute('data-group'),
      ink: getComputedStyle(document.documentElement).getPropertyValue('--topic-ink').trim(),
      acc: getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(),
    }));
    if (!boot.group) fails.push('data-group is not set on <html> at boot');
    if (!boot.ink) fails.push('--topic-ink is empty at boot');
    if (!boot.acc || boot.acc !== boot.ink) fails.push('--acc (' + boot.acc + ') is not rebound to --topic-ink (' + boot.ink + ')');
    await ctx.close();
  }

  // 2. reduced-motion renders (blank-page guard), both themes
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
    await page.goto(URL + '#walk');
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => {
      const op = getComputedStyle(document.body).opacity;
      const txt = (document.body.innerText || '').trim().length;
      const wt = document.querySelector('deep-walkthrough');
      const st = wt && wt.shadowRoot ? wt.shadowRoot.querySelector('.step-t') : null;
      return { op, txt, shadow: st ? st.textContent.trim().length : 0 };
    });
    if (r.op !== '1') fails.push('[' + theme + '] reduced-motion body opacity ' + r.op + ' != 1 (blank-page risk)');
    if (r.txt < 200 || r.shadow < 1) fails.push('[' + theme + '] reduced-motion under-rendered (light text ' + r.txt + ', shadow ' + r.shadow + ')');
    await ctx.close();
  }

  await browser.close();
  if (fails.length) {
    console.log('ROOM BROWSER: FAIL');
    fails.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('ROOM BROWSER: PASS  (data-group + --topic-ink + --acc rebind at boot; reduced-motion renders in both themes)');
})();
