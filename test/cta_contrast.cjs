/* ===================== CTA CONTRAST -- MEASURED IN PAINTED PIXELS =====================
 *
 * WHY THIS EXISTS, AND WHY IT DOES NOT USE getComputedStyle
 *
 * room_contrast.py already re-derives white-on-solid from the HEX. That is necessary and it is
 * not sufficient: it proves a TOKEN clears AA, not that the BUTTON does. The primary CTAs in
 * this app (.mockbtn "Mock run", .push "Reveal answer", the .dn-n / .arc-n number chips) are not
 * painted in a token -- they are painted in `linear-gradient(135deg, var(--acc), var(--acc2))`.
 * A gradient has no single background colour, and getComputedStyle('background-color') on one
 * returns `rgba(0,0,0,0)`. Ask the DOM what the contrast is and it will cheerfully tell you
 * NOTHING, in a tone of voice that sounds like an answer. So we decode the rendered pixels.
 *
 * THE METRIC: THE BACKGROUND LOCAL TO EACH GLYPH
 * Two naive metrics are both wrong, and both were tried:
 *   - "text colour vs background-color"        -> n/a on a gradient. Measures nothing.
 *   - "text colour vs the WORST pixel anywhere  -> manufactured 6 false failures at ~3.1:1 by
 *      in the button"                             sampling the gradient's brightest corner, where
 *                                                 no glyph has ever been painted.
 * WCAG asks for the contrast between a glyph and the background BEHIND THAT GLYPH. So:
 *
 *   1. Screenshot the CTA as it renders.                                       -> image A
 *   2. Force every text node in it to `color: transparent` and screenshot again -> image B.
 *      Same geometry, same gradient, same inset highlight -- text removed. B is therefore the
 *      EXACT background under each glyph, per pixel, gradient and all.
 *   3. A pixel is A = alpha*F + (1-alpha)*B, where F is the specified text colour (read from
 *      getComputedStyle BEFORE step 2 -- `color` IS reliable; it is `background` that lies).
 *      Solve for alpha per channel. alpha ~= 1 => a CORE glyph pixel, fully the text colour.
 *      Antialiased edge pixels (alpha < 1) are NOT the text colour and WCAG does not ask about
 *      them -- they are excluded, which is what keeps this honest in both directions.
 *   4. For every core pixel, contrast(F, B_at_that_pixel). Report the worst.
 *
 * THE INVARIANT THIS DEFENDS
 * For WHITE text on `linear-gradient(ink -> solid)`, the minimum contrast over the whole button
 * is reached at an ENDPOINT, never in the middle: CSS interpolates the gradient in gamma-encoded
 * sRGB, and sRGB->linear is convex, so every interior colour has a LOWER relative luminance than
 * the linear interpolation of its endpoints -- i.e. it is darker than the average, i.e. it has
 * MORE contrast against white. The floor is therefore white-on-solid, and nothing else.
 * That is why the token-level fix (raise white-on-solid to >= 5.0) provably lifts every glyph on
 * every gradient CTA at once -- and it is why this check still measures the pixels rather than
 * trusting that paragraph.
 *
 * Usage: node test/cta_contrast.cjs [deliverable.html]   (CHROME=<path> for the browser)
 *        FLOOR=5.0 to override the floor.
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');
const FLOOR = Number(process.env.FLOOR || 5.0);
const DSF = 2;                       /* more glyph pixels => a more honest worst-case */
const CORE_ALPHA = 0.95;             /* "this pixel IS the text colour", not an AA edge */

/* The CTAs that paint text on the ROOM. Every one of them is a gradient, which is precisely
 * why none of them can be checked without decoding pixels. `optional` = not always on screen
 * (a pane may render zero of them); a missing element is skipped, an empty run is a FAILURE. */
const CTAS = [
  { sel: '#mockopen', label: 'mockbtn  (Mock run)' },            /* sidebar, always present    */
  { sel: '.push', label: 'push     (Reveal answer)' },           /* drill, the per-probe CTA   */
  { sel: '.dn-n', label: 'dn-n     (drill nav chip)', nth: 0 },  /* drill, small text on grad  */
];


/* Node's console.log does NOT implement C-style width/precision (%-6s, %8.4f) -- it prints the
 * format string verbatim and dumps raw floats. Pad explicitly. */
const L = (s, w) => String(s).padEnd(w).slice(0, w);
const R = (v, w, d) => (typeof v === 'number' ? v.toFixed(d) : String(v)).padStart(w);

const GROUPS = ['messaging-events', 'data-storage', 'reliability-observability',
  'platform-infra', 'architecture-apis', 'security-tenancy'];

/* ---- the pixel math, run INSIDE the page (OffscreenCanvas decodes the real PNG) ---- */
const ANALYZE = async ({ a, b, fg, coreAlpha }) => {
  const un64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const grab = async (s) => {
    const bmp = await createImageBitmap(new Blob([un64(s)], { type: 'image/png' }));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bmp, 0, 0);
    return { w: bmp.width, h: bmp.height, d: x.getImageData(0, 0, bmp.width, bmp.height).data };
  };
  const A = await grab(a), Bg = await grab(b);
  if (A.w !== Bg.w || A.h !== Bg.h) return { err: 'geometry moved between shots (' + A.w + 'x' + A.h + ' vs ' + Bg.w + 'x' + Bg.h + ')' };

  const m = /rgba?\(([^)]+)\)/.exec(fg);
  const F = m ? m[1].split(',').slice(0, 3).map((v) => parseFloat(v)) : [255, 255, 255];

  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Y = (r, g, bl) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  const CR = (y1, y2) => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);

  const yF = Y(F[0], F[1], F[2]);
  const vals = [];
  for (let i = 0; i < A.d.length; i += 4) {
    /* Per-channel alpha solve. Only channels where F and B are far enough apart carry a usable
     * signal; a channel with F~=B tells you nothing about alpha and must not be allowed to vote. */
    const alphas = [];
    for (let c = 0; c < 3; c++) {
      const den = F[c] - Bg.d[i + c];
      if (Math.abs(den) < 24) continue;
      alphas.push((A.d[i + c] - Bg.d[i + c]) / den);
    }
    if (alphas.length < 2) continue;
    const lo = Math.min.apply(null, alphas), hi = Math.max.apply(null, alphas);
    if (hi - lo > 0.08) continue;          /* channels disagree -> not a clean opaque glyph pixel */
    if (lo < coreAlpha) continue;          /* an AA edge, or bare background. Not the text colour. */
    vals.push(CR(yF, Y(Bg.d[i], Bg.d[i + 1], Bg.d[i + 2])));
  }
  if (!vals.length) return { err: 'no core glyph pixels found (is the text actually painted?)' };
  vals.sort((x, y) => x - y);
  const at = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
  return { n: vals.length, min: vals[0], p01: at(0.01), p50: at(0.50), max: vals[vals.length - 1] };
};

/* Blank the text without moving a single pixel of the background. */
const HIDE_TEXT = (e) => {
  const all = [e].concat(Array.prototype.slice.call(e.querySelectorAll('*')));
  e.__sv = all.map((n) => [n, n.getAttribute('style') || '']);
  all.forEach((n) => {
    n.style.setProperty('color', 'transparent', 'important');
    n.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    n.style.setProperty('text-shadow', 'none', 'important');
  });
};
const SHOW_TEXT = (e) => { (e.__sv || []).forEach(([n, s]) => { if (s) n.setAttribute('style', s); else n.removeAttribute('style'); }); delete e.__sv; };

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const rows = [], fails = [];
  const scratch = await (await browser.newContext()).newPage();   /* decodes PNGs; never navigates */

  for (const theme of ['light', 'dark']) {
    for (const group of GROUPS) {
      const ctx = await browser.newContext({ deviceScaleFactor: DSF, viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
      await B.gotoApp(page, HTML);
      await B.closeIndex(page);

      /* Ask the REGISTRY which topic lives in this room -- never hardcode a topic id. */
      const topic = await page.evaluate((g) => {
        const ids = TopicRegistry.ids();
        for (const id of ids) { const t = TopicRegistry.get(id); if (t && t.identity && t.identity.group === g) return id; }
        return null;
      }, group);
      if (!topic) { fails.push('[' + theme + '/' + group + '] no registered topic in this room'); await ctx.close(); continue; }

      await page.evaluate((t) => { location.hash = '#' + t + '/drill'; }, topic);
      await B.until(page, (g) => document.documentElement.getAttribute('data-group') === g && !!document.querySelector('deep-drill'),
        group, 15000, 'room ' + group + ' + drill pane');
      await B.settle(page);

      for (const cta of CTAS) {
        const loc = page.locator(cta.sel).nth(cta.nth || 0);
        if (!(await loc.count()) || !(await loc.isVisible().catch(() => false))) {
          fails.push('[' + theme + '/' + group + '] ' + cta.label + ': NOT RENDERED -- cannot be checked, so it is a failure, not a skip');
          continue;
        }
        const fg = await loc.evaluate((e) => getComputedStyle(e).color);
        const a = await loc.screenshot();
        await loc.evaluate(HIDE_TEXT);
        const b = await loc.screenshot();
        await loc.evaluate(SHOW_TEXT);

        const r = await scratch.evaluate(ANALYZE, { a: a.toString('base64'), b: b.toString('base64'), fg, coreAlpha: CORE_ALPHA });
        if (r.err) { fails.push('[' + theme + '/' + group + '] ' + cta.label + ': ' + r.err); continue; }
        rows.push({ theme, group, cta: cta.label, fg, ...r });
        if (r.min < FLOOR) fails.push('[' + theme + '/' + group + '] ' + cta.label + ': worst glyph pixel ' + r.min.toFixed(2) + ':1 < ' + FLOOR.toFixed(1) + ' (text ' + fg + ')');
      }
      await ctx.close();
    }
  }
  await browser.close();

  console.log('=== CTA CONTRAST -- worst background LOCAL TO A CORE GLYPH PIXEL (alpha >= ' + CORE_ALPHA + ', DSF ' + DSF + ') ===');
  console.log(L('theme', 6) + L('room', 27) + L('cta', 27) + R('min', 8) + R('p01', 8) + R('median', 8) + R('px', 8));
  for (const r of rows) {
    console.log(L(r.theme, 6) + L(r.group, 27) + L(r.cta, 27) + R(r.min, 8, 2) + R(r.p01, 8, 2) + R(r.p50, 8, 2) + R(r.n, 8, 0));
  }
  for (const theme of ['light', 'dark']) {
    const t = rows.filter((r) => r.theme === theme);
    if (t.length) console.log('  ' + theme.toUpperCase() + ' band: ' + Math.min(...t.map((r) => r.min)).toFixed(2) + ' - ' + Math.max(...t.map((r) => r.min)).toFixed(2) + ':1  (worst-glyph, across ' + t.length + ' CTA x room)');
  }

  if (fails.length) {
    console.log('\nCTA CONTRAST: FAIL ' + fails.length);
    fails.forEach((f) => console.log('  - ' + f));
    return B.finish(1, 'CTA CONTRAST: FAIL');
  }
  console.log('\nCTA CONTRAST: PASS  (' + rows.length + ' CTA x room x theme, every core glyph pixel >= ' + FLOOR.toFixed(1) + ':1)');
  return B.finish(0);
})();
