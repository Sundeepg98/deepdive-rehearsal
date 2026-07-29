/* W15 review capture -- the home header region, where the brand mark sits.
 *
 * FRAMED ON THE ELEMENT, NOT ON A SCROLL Y. The clip is derived from .hm-top's own
 * bounding box and extended down far enough to include the hero, because the whole point
 * of this pair is the RELATIONSHIP between the two: before, the brand wore the boot room
 * (architecture-apis magenta) while the hero wore its destination room -- two real room
 * colours 130px apart, only one of which meant anything. After, brand claims brand.
 *
 * It ASSERTS its own framing and throws if the brand mark is not inside the clip. The W3
 * library capture shot the wrong frame silently until it was made to check, and a review
 * artifact that quietly shows the wrong thing is worse than no artifact.
 *
 * Usage: node _audit/w15-brand-before-after/capture-header-pair.cjs <deliverable.html> <out.png> [theme]
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const HTML = process.argv[2];
const OUT = process.argv[3];
const THEME = process.argv[4] || 'light';
if (!HTML || !OUT) {
  console.log('usage: node capture-header-pair.cjs <deliverable.html> <out.png> [theme]');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await ctx.newPage();
  await page.addInitScript((t) => {
    try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) { /* ignore */ }
  }, THEME);
  await B.gotoApp(page, HTML, { hash: '' });
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash');
  await B.until(page, () => !!document.querySelector('#home .hm-brand'), null, B.ACT_MS, 'brand mark');
  await B.until(page, () => !!document.querySelector('#home .hm-cta'), null, B.ACT_MS, 'hero');
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }

  /* assert innerWidth, per the house rule about shared-context measurement */
  const vw = await page.evaluate(() => window.innerWidth);
  if (vw !== 1280) throw new Error('viewport drifted: innerWidth ' + vw + ' != 1280');

  const geom = await page.evaluate(() => {
    const brand = document.querySelector('#home .hm-brand');
    const cta = document.querySelector('#home .hm-cta');
    const b = brand.getBoundingClientRect(), c = cta.getBoundingClientRect();
    return {
      brand: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
      cta: { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) },
      brandColor: getComputedStyle(brand).color,
      ctaBg: getComputedStyle(cta).backgroundColor,
    };
  });

  /* clip: from just above the brand mark down to just past the hero */
  const pad = 16;
  const clip = {
    x: Math.max(0, geom.brand.x - pad),
    y: Math.max(0, geom.brand.y - pad),
    width: Math.min(1280 - Math.max(0, geom.brand.x - pad), 1000),
    height: (geom.cta.y + geom.cta.h + pad) - Math.max(0, geom.brand.y - pad),
  };
  const inside = geom.brand.x >= clip.x && geom.brand.y >= clip.y
    && geom.brand.x + geom.brand.w <= clip.x + clip.width
    && geom.brand.y + geom.brand.h <= clip.y + clip.height;
  if (!inside) {
    throw new Error('framing failed: brand mark ' + JSON.stringify(geom.brand)
      + ' is not inside clip ' + JSON.stringify(clip));
  }

  /* finish finite animations, pin infinite ones, then require two identical frames */
  await page.evaluate(() => {
    const roots = [document];
    for (let i = 0; i < roots.length; i++) {
      for (const el of roots[i].querySelectorAll('*')) {
        if (el.shadowRoot && roots.indexOf(el.shadowRoot) === -1) roots.push(el.shadowRoot);
      }
    }
    for (const r of roots) {
      for (const a of r.getAnimations()) {
        try { a.finish(); } catch (e) { a.currentTime = 0; a.pause(); }
      }
    }
  });
  const opts = { caret: 'hide', scale: 'css', clip };
  let prev = await page.screenshot(opts);
  for (let i = 0; i < 8; i++) {
    const cur = await page.screenshot(opts);
    if (cur.equals(prev)) break;
    prev = cur;
  }
  require('fs').writeFileSync(OUT, prev);
  console.log('wrote ' + OUT + '  clip=' + JSON.stringify(clip)
    + '  brand=' + geom.brandColor + '  hero=' + geom.ctaBg);
  await ctx.close();
  await browser.close();
})();
