/* ===== W21 / W-X6 LAYOUT DELTA -- is the VR churn ONLY the typeface? =====
 *
 * The wave rebaselines 14 desktop baselines, so the claim "this is a typeface change" has to
 * be MEASURED, not asserted. Swapping Arial for Segoe UI changes glyph advance widths, so any
 * box whose size is decided by its own text WILL move -- that is font metrics, and it is in
 * scope. What must NOT happen is a box moving for a reason that is not text: a changed
 * padding, a wrapped flex line, a grid track resize, a scrollbar appearing. The brief calls
 * that a STOP.
 *
 * METHOD. Walk every element on a surface (piercing shadow roots) and record a stable path
 * key plus its rect. Run it against the OLD deliverable and the NEW one with the SAME binary,
 * and classify each delta:
 *
 *   TEXT-SIZED   the element's width is decided by its own text (inline / inline-flex /
 *                flex-item-with-auto-basis / table-cell / a shrink-to-fit box) -- a width
 *                change here is exactly what different advance widths produce
 *   REFLOW       the element still occupies the same LINE COUNT and its box moved only
 *                because a text-sized ancestor or previous sibling changed size
 *   STRUCTURAL   anything else: a box whose geometry has no text explanation. THE STOP CASE.
 *
 * The honest limit of this instrument, stated because a check that cannot fail is this repo's
 * defining bug: it cannot PROVE a structural change is absent, it can only surface every box
 * whose delta has no text explanation and let those be read. The count it prints is the thing
 * to argue with, and a non-zero STRUCTURAL count is a finding, not noise to be tuned away.
 *
 * Usage: W21_HTML=<file> node _audit/w21-typeface-before-after/layout-delta.cjs <out.json> <label>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const ROOT = path.join(__dirname, '..', '..');
const HTML = process.env.W21_HTML || path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html');
const OUT = process.argv[2];
const LABEL = process.argv[3] || 'run';

/* The surfaces behind the 14 churned baselines. */
const SURFACES = [
  { label: 'walk', hash: '#event-driven/walk', vw: 1280, vh: 800 },
  { label: 'drill', hash: '#event-driven/drill', vw: 1280, vh: 800 },
  { label: 'sys', hash: '#event-driven/sys', vw: 1280, vh: 800 },
  { label: 'num', hash: '#event-driven/num', vw: 1280, vh: 800 },
  { label: 'wb', hash: '#event-driven/wb', vw: 1280, vh: 800 },
  { label: 'm-walk', hash: '#event-driven/walk', vw: 390, vh: 844 },
];

const DUMP = () => {
  const rows = [];
  const seen = new Map();
  const walk = (root, prefix) => {
    let all;
    try { all = root.querySelectorAll('*'); } catch (e) { return; }
    all.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'link') return;
      const cls = (el.className && el.className.baseVal !== undefined
        ? el.className.baseVal : el.className) || '';
      let key = prefix + tag + (el.id ? '#' + el.id : '')
        + (cls ? '.' + String(cls).trim().split(/\s+/).slice(0, 3).join('.') : '');
      const n = (seen.get(key) || 0) + 1;
      seen.set(key, n);
      key += '[' + n + ']';
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const cs = getComputedStyle(el);
      /* does this box size itself from its own text? */
      const disp = cs.display;
      const parentDisp = el.parentElement ? getComputedStyle(el.parentElement).display : '';
      const isFlexItem = /flex|grid/.test(parentDisp);
      const textSized = /^(inline|inline-block|inline-flex|table-cell)$/.test(disp)
        || (isFlexItem && cs.flexBasis === 'auto' && cs.width === 'auto')
        || cs.width === 'auto' && /^(absolute|fixed)$/.test(cs.position)
        || cs.whiteSpace === 'nowrap';
      rows.push({
        key: key,
        x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        textSized: !!textSized,
        ownText: (Array.from(el.childNodes).filter((n) => n.nodeType === 3)
          .map((n) => n.nodeValue).join('').trim().length > 0),
        disp: disp,
        pad: cs.padding, mar: cs.margin, bw: cs.borderWidth, gap: cs.gap,
        gtc: cs.gridTemplateColumns, fw: cs.flexWrap, ff: cs.fontFamily,
        fs: cs.fontSize, fwt: cs.fontWeight, lh: cs.lineHeight,
      });
    });
    all.forEach((el) => {
      if (el.shadowRoot) walk(el.shadowRoot, prefix + el.tagName.toLowerCase() + '>>');
    });
  };
  walk(document, '');
  return rows;
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const out = {};
  for (const s of SURFACES) {
    const ctx = await browser.newContext({
      viewport: { width: s.vw, height: s.vh },
      deviceScaleFactor: 1, colorScheme: 'light',
      reducedMotion: 'reduce', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
    });
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML, { hash: s.hash });
    await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS,
      'boot splash (' + s.label + ')');
    await B.until(page, () => !!document.querySelector('button'), null, B.ACT_MS, 'buttons');
    try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
    await B.settle(page);
    const w = await page.evaluate(() => window.innerWidth);
    if (w !== s.vw) throw new Error('viewport assert failed for ' + s.label + ': innerWidth=' + w);
    out[s.label] = await page.evaluate(DUMP);
    await ctx.close();
  }
  fs.writeFileSync(OUT, JSON.stringify({ label: LABEL, when: new Date().toISOString(), surfaces: out }, null, 1), 'utf8');
  const n = Object.keys(out).reduce((a, k) => a + out[k].length, 0);
  console.log('layout-delta (' + LABEL + '): ' + n + ' boxes over ' + SURFACES.length + ' surfaces -> ' + OUT);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
