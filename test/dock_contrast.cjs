/* ===================== DOCK ARMED-LEGEND CONTRAST -- MEASURED IN PAINTED PIXELS =====================
 *
 * WHY THIS EXISTS
 * D4-polish flattens the dark Continue dock's background from the accent wash (--accbg / --topic-wash)
 * to a recessed flat panel (--panel), so the dock stops reading as the twin of the accent-bordered
 * Mock CTA (audit #3). The dock's MICRO tier renders the armed grade legend -- "Grade  1 Missed 2
 * Shaky 3 Solid" -- whose measured AA contrast the audit put at 5.11-6.81:1 and which the wave brief
 * says "must not degrade." --panel is a GRADIENT, so getComputedStyle('background-color') returns
 * rgba(0,0,0,0) (same reason cta_contrast decodes pixels). This proves the ARMED LEGEND clears the
 * floor against the ACTUAL painted dock background, per glyph, gradient and all.
 *
 * THE MATH is cta_contrast.cjs's, verbatim (ANALYZE + HIDE_TEXT) -- a proven instrument. What is new
 * here is only the orchestration: reveal a fresh-topic drill to its judgment point so the dock arms
 * the legend (micro tier), then measure #ndock's .nd-armk (Grade, --mut2), .nd-armed (labels, --mut)
 * and .nd-armed b (digits, --acc) against the flattened panel. DARK only: light keeps --accbg
 * byte-for-byte (--dock-bg resolves to it there), so the legend's light contrast is unchanged.
 *
 * SELF-TEST, EVERY RUN: after the real pass it PLANTS a light background on #ndock and re-measures
 * one room; a light dock behind a light accent digit MUST drop below the floor. If it does not, the
 * metric is not discriminating and the check ABORTS -- so this can never become the kind of contrast
 * check that cannot fail (this repo has shipped several).
 *
 * Usage: node test/dock_contrast.cjs [deliverable.html]   (CHROME=<path>)   FLOOR=5.0 to override.
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const FLOOR = Number(process.env.FLOOR || 5.0);
const DSF = 2;
const CORE_ALPHA = 0.95;

const GROUPS = ['messaging-events', 'data-storage', 'reliability-observability',
  'platform-infra', 'architecture-apis', 'security-tenancy'];

/* the armed-legend glyph runs to check -- each a distinct specified colour on the dock bg */
const TARGETS = [
  { sel: '.nd-armk', label: 'nd-armk  (Grade / --mut2)' },
  { sel: '.nd-armed', label: 'nd-armed (labels / --mut)' },
  { sel: '.nd-armed b', label: 'nd-armed b (digits / --acc)', nth: 0 },
];

const L = (s, w) => String(s).padEnd(w).slice(0, w);
const R = (v, w, d) => (typeof v === 'number' ? v.toFixed(d) : String(v)).padStart(w);

/* ---- the pixel math, run INSIDE the page (verbatim from cta_contrast.cjs) ---- */
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
    const alphas = [];
    for (let c = 0; c < 3; c++) {
      const den = F[c] - Bg.d[i + c];
      if (Math.abs(den) < 24) continue;
      alphas.push((A.d[i + c] - Bg.d[i + c]) / den);
    }
    if (alphas.length < 2) continue;
    const lo = Math.min.apply(null, alphas), hi = Math.max.apply(null, alphas);
    if (hi - lo > 0.08) continue;
    if (lo < coreAlpha) continue;
    vals.push(CR(yF, Y(Bg.d[i], Bg.d[i + 1], Bg.d[i + 2])));
  }
  if (!vals.length) return { err: 'no core glyph pixels found (is the text actually painted?)' };
  vals.sort((x, y) => x - y);
  return { n: vals.length, min: vals[0], max: vals[vals.length - 1] };
};

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

/* Reveal a fresh-topic drill to its judgment point so the dock arms the legend (micro tier). */
async function armLegend(page) {
  await page.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const z = (ms) => new Promise((x) => setTimeout(x, ms));
    let g = 0;
    while (r.getElementById('adv') && g++ < 25) { r.getElementById('adv').click(); await z(4); }
    await z(80);
  });
  await page.waitForFunction(() => {
    const d = document.getElementById('ndock');
    return d && !d.hidden && /Missed/.test(d.textContent) && d.querySelector('.nd-armed');
  }, null, { timeout: B.ACT_MS });
}

async function measureRoom(browser, scratch, group, theme, plantLightBg) {
  const ctx = await browser.newContext({ deviceScaleFactor: DSF, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
  await B.gotoApp(page, HTML);
  await page.evaluate(() => localStorage.clear());   /* fresh topic -> rec = drill -> dock micro */
  const topic = await page.evaluate((g) => {
    for (const id of TopicRegistry.ids()) { const t = TopicRegistry.get(id); if (t && t.identity && t.identity.group === g) return id; }
    return null;
  }, group);
  if (!topic) { await ctx.close(); return { err: 'no topic in room ' + group }; }
  await page.evaluate((t) => { location.hash = '#' + t + '/drill'; }, topic);
  await B.until(page, (g) => document.documentElement.getAttribute('data-group') === g && !!document.querySelector('#drill deep-drill'),
    group, 15000, 'room ' + group + ' + drill');
  await B.settle(page);
  if (plantLightBg) await page.addStyleTag({ content: '#ndock{background:#F4F1FF !important;background-image:none !important}' });
  await armLegend(page);
  const out = [];
  for (const t of TARGETS) {
    const loc = page.locator('#ndock ' + t.sel).nth(t.nth || 0);
    if (!(await loc.count()) || !(await loc.isVisible().catch(() => false))) { out.push({ label: t.label, err: 'not rendered' }); continue; }
    const fg = await loc.evaluate((e) => getComputedStyle(e).color);
    await B.waitPainted(loc);
    const a = await loc.screenshot();
    await loc.evaluate(HIDE_TEXT);
    const b = await loc.screenshot();
    await loc.evaluate(SHOW_TEXT);
    const r = await scratch.evaluate(ANALYZE, { a: a.toString('base64'), b: b.toString('base64'), fg, coreAlpha: CORE_ALPHA });
    out.push({ label: t.label, fg, ...r });
  }
  await ctx.close();
  return { rows: out };
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const scratch = await (await browser.newContext()).newPage();
  const rows = [], fails = [];

  /* ---- REAL PASS: dark, all six rooms (where the bg changed) ---- */
  for (const group of GROUPS) {
    const res = await measureRoom(browser, scratch, group, 'dark', false);
    if (res.err) { fails.push('[dark/' + group + '] ' + res.err); continue; }
    for (const r of res.rows) {
      if (r.err) { fails.push('[dark/' + group + '] ' + r.label + ': ' + r.err); continue; }
      rows.push({ group, ...r });
      if (r.min < FLOOR) fails.push('[dark/' + group + '] ' + r.label + ': worst glyph ' + r.min.toFixed(2) + ':1 < ' + FLOOR.toFixed(1) + ' (text ' + r.fg + ')');
    }
  }

  console.log('=== DOCK ARMED-LEGEND CONTRAST -- worst background LOCAL TO A CORE GLYPH PIXEL (dark, alpha >= ' + CORE_ALPHA + ') ===');
  console.log(L('room', 27) + L('run', 28) + R('min', 8) + R('max', 8) + R('px', 8));
  for (const r of rows) console.log(L(r.group, 27) + L(r.label, 28) + R(r.min, 8, 2) + R(r.max, 8, 2) + R(r.n, 8, 0));
  if (rows.length) console.log('  DARK band: ' + Math.min(...rows.map((r) => r.min)).toFixed(2) + ' - ' + Math.max(...rows.map((r) => r.min)).toFixed(2) + ':1  (worst-glyph, ' + rows.length + ' runs). Audit baseline was 5.11-6.81.');

  /* ---- SELF-TEST: a LIGHT dock bg must drop the light accent digit below the floor. ---- */
  const st = await measureRoom(browser, scratch, 'data-storage', 'dark', true);
  await browser.close();
  const digit = st.rows && st.rows.find((r) => /digits/.test(r.label) && typeof r.min === 'number');
  const tripped = digit && digit.min < FLOOR;
  console.log('\n  SELF-TEST (plant #ndock light bg): digit contrast ' + (digit ? digit.min.toFixed(2) : 'n/a') + ':1'
    + (tripped ? '  -> below floor as required (the metric discriminates)' : '  -> DID NOT TRIP (abort: check cannot fail)'));
  if (!tripped) return B.finish(1, 'DOCK CONTRAST: ABORT -- self-test did not trip; the metric is not discriminating');

  if (fails.length) {
    console.log('\nDOCK CONTRAST: FAIL ' + fails.length);
    fails.forEach((f) => console.log('  - ' + f));
    return B.finish(1, 'DOCK CONTRAST: FAIL');
  }
  console.log('\nDOCK CONTRAST: PASS  (armed legend >= ' + FLOOR.toFixed(1) + ':1 on the flattened dark dock, ' + rows.length + ' glyph-runs x room; self-test tripped)');
  return B.finish(0);
})();
