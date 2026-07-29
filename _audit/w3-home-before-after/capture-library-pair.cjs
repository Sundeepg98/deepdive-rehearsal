/* Supplementary review capture for W3.
 *
 * WHY IT EXISTS. The committed VR baselines are VIEWPORT shots (1280x800) and the
 * home page is 3033px tall, so before-*.png / after-*.png contain the hero, the six
 * room cards and the cross-topic drill -- and NOT A SINGLE TOPIC CARD. The 46 topic
 * cards are the headline of P2-15 (they were the bulk of the 147 Arial elements), so
 * the wave's own review artifact would otherwise show none of them.
 *
 * This scrolls the library section to a fixed offset and shoots the viewport, so the
 * two captures are anchored on the SAME ELEMENT rather than the same scroll Y -- the
 * page heights differ (2890 -> 3033), so a shared Y would frame different content and
 * manufacture a difference that is not there.
 *
 * Usage:
 *   node _audit/w3-home-before-after/capture-library-pair.cjs <deliverable.html> <out.png>
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const HTML = process.argv[2];
const OUT = process.argv[3];
if (!HTML || !OUT) {
  console.log('usage: node capture-library-pair.cjs <deliverable.html> <out.png>');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem('ddr.v1.theme', JSON.stringify('light')); } catch (e) { /* ignore */ }
  });
  await B.gotoApp(page, HTML, { hash: '' });
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash');
  await B.until(page, () => !!document.querySelector('#home .ix-card'), null, B.ACT_MS, 'library mounted');
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
  /* Anchor on the section, not on a scroll Y -- see the note above.
     AND VERIFY IT LANDED. The first version of this script scrolled once and shot
     immediately; on the post-fix build the frame came back at scrollY 0 (the top of the
     page) and the pair silently compared the library against the hero. So: scroll,
     settle, re-assert, and THROW if the section is not where it was asked to be. A
     capture that quietly frames the wrong thing is worse than no capture. */
  const OFFSET = 24;
  const scrollToLibrary = () => page.evaluate((off) => {
    const sec = [...document.querySelectorAll('#home .hm-sec')]
      .find((s) => /All topics/.test(s.textContent || ''));
    if (!sec) return { err: 'no "All topics" section' };
    window.scrollTo(0, sec.getBoundingClientRect().top + window.scrollY - off);
    return { top: Math.round(sec.getBoundingClientRect().top), y: Math.round(window.scrollY) };
  }, OFFSET);

  let pos = await scrollToLibrary();
  if (pos.err) throw new Error(pos.err);
  await new Promise((r) => setTimeout(r, 400));
  pos = await scrollToLibrary();              /* idempotent: re-assert after any late relayout */
  await new Promise((r) => setTimeout(r, 200));
  pos = await page.evaluate((off) => {
    const sec = [...document.querySelectorAll('#home .hm-sec')]
      .find((s) => /All topics/.test(s.textContent || ''));
    return { top: Math.round(sec.getBoundingClientRect().top), y: Math.round(window.scrollY), off };
  }, OFFSET);
  if (Math.abs(pos.top - OFFSET) > 2) {
    throw new Error('scroll did not land: "All topics" is at viewport top ' + pos.top
      + 'px, expected ' + OFFSET + 'px (scrollY ' + pos.y + ')');
  }
  console.log('anchored: "All topics" at viewport top ' + pos.top + 'px, scrollY ' + pos.y);
  /* finish every finite animation and pin the infinite ones, then take two identical
     frames -- the same rest-state discipline visual_regression.cjs uses */
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
  let prev = await page.screenshot({ caret: 'hide', scale: 'css' });
  for (let i = 0; i < 8; i++) {
    const cur = await page.screenshot({ caret: 'hide', scale: 'css' });
    if (cur.equals(prev)) break;
    prev = cur;
  }
  require('fs').writeFileSync(OUT, prev);
  console.log('wrote ' + OUT + ' (' + prev.length + ' bytes)');
  await ctx.close();
  await browser.close();
})();
