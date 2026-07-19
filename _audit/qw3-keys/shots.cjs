/* QW3 evidence shots: badges in both themes at 1280 + 1536 desktop, absent at 360 mobile.
 * Writes PNGs to _audit/qw3-keys/ (untracked evidence, per repo precedent). */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require('../../test/_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', '..', 'deepdive_content_pipeline_rehearsal.html');
const OUT = __dirname;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(B.launchOpts());
  const shots = [
    { name: 'badges-1280-light', w: 1280, h: 800, theme: 'light' },
    { name: 'badges-1280-dark', w: 1280, h: 800, theme: 'dark' },
    { name: 'badges-1536-light', w: 1536, h: 864, theme: 'light' },
    { name: 'badges-1536-dark', w: 1536, h: 864, theme: 'dark' },
    { name: 'mobile-360-light', w: 360, h: 740, theme: 'light', mobile: true },
  ];
  for (const s of shots) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: s.h },
      hasTouch: !!s.mobile, isMobile: !!s.mobile,
      deviceScaleFactor: 1, reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    await page.addInitScript((theme) => {
      try { localStorage.setItem('ddr.v1.theme', JSON.stringify(theme)); } catch (e) {}
    }, s.theme);
    await B.gotoApp(page, HTML, { hash: '#walk' });
    await B.enterApp(page);
    await B.settle(page);
    await page.waitForFunction(() => !document.getElementById('_bootsplash'), null, { timeout: 20000 }).catch(() => {});
    await B.settle(page);
    /* full page for the mobile control; the sidebar region for desktop badge closeups */
    await page.screenshot({ path: path.join(OUT, s.name + '.png') });
    if (!s.mobile) {
      const box = await page.locator('.sidebar').boundingBox();
      if (box) await page.screenshot({ path: path.join(OUT, s.name + '-sidebar.png'), clip: box });
    }
    /* verify at THIS width: badge count painted */
    const painted = await page.evaluate(() => [...document.querySelectorAll('.seg button .seg-key')]
      .filter((k) => { const r = k.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
    console.log(s.name + ': ' + painted + ' badges painted, wrote ' + s.name + '.png');
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
