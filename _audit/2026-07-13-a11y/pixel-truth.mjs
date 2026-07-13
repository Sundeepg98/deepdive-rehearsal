/* PIXEL TRUTH v2 — measure contrast from the PAINTED SCREEN, exactly.

   v1 was not trustworthy: it guessed the foreground from a colour histogram of the element's
   box, so it could latch onto a border or a chip background instead of the glyphs (it returned
   an identical 4.71 in two rooms that axe scored differently). A probe I cannot trust is no
   better than an axe I cannot trust.

   v2 isolates the glyphs EXACTLY, by differential rendering:
     render A = the element as shipped
     render B = the same element with its text forced transparent
     glyph pixels := pixels that CHANGED between A and B  (nothing else can have changed)
   -> background = dominant colour of B inside the box (the true painted backdrop, whatever
      gradient/pseudo-element/wash produced it — this is what axe cannot model)
   -> foreground  = modal colour of the glyph CORE (darkest decile of changed pixels), which
      excludes anti-aliased edge pixels that would flatter the ratio.

   Calibration (this instrument's own negative control) must still reproduce known ratios. */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = `${OUT}/shots/axe`;
mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const HELPERS = `
window.__lum = function (r, g, bl) {
  const ch = [r, g, bl].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
window.__ratio = function (l1, l2) { const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
window.__decode = async function (dataUrl, rect) {
  const img = new Image();
  await new Promise(r => { img.onload = r; img.src = dataUrl; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const x = Math.max(0, Math.round(rect.x)), y = Math.max(0, Math.round(rect.y));
  const w = Math.min(Math.round(rect.width), img.width - x), h = Math.min(Math.round(rect.height), img.height - y);
  if (w <= 0 || h <= 0) return null;
  return { data: Array.from(g.getImageData(x, y, w, h).data), w, h };
};
/* A = with text, B = text transparent. Changed pixels are, by construction, the glyphs. */
window.__diffContrast = function (A, B) {
  const bgHist = new Map(), glyph = [];
  for (let i = 0; i < B.data.length; i += 4) {
    const k = (B.data[i] << 16) | (B.data[i+1] << 8) | B.data[i+2];
    bgHist.set(k, (bgHist.get(k) || 0) + 1);
    const changed = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i+1] - B.data[i+1]) + Math.abs(A.data[i+2] - B.data[i+2]);
    if (changed > 12) glyph.push([A.data[i], A.data[i+1], A.data[i+2]]);
  }
  if (!bgHist.size) return { error: 'no background pixels' };
  if (!glyph.length) return { error: 'no glyph pixels changed — text did not render or was not hidden' };
  const bgSorted = [...bgHist.entries()].sort((a, b) => b[1] - a[1]);
  const bgKey = bgSorted[0][0];
  const bgPx = [(bgKey >> 16) & 255, (bgKey >> 8) & 255, bgKey & 255];
  const bgLum = window.__lum(bgPx[0], bgPx[1], bgPx[2]);
  /* glyph CORE = the decile furthest in luminance from the bg (drops anti-aliased edges,
     which sit between fg and bg and would inflate the measured ratio) */
  const scored = glyph.map(p => ({ p, d: Math.abs(window.__lum(p[0], p[1], p[2]) - bgLum) })).sort((a, b) => b.d - a.d);
  const coreN = Math.max(1, Math.floor(scored.length * 0.10));
  const core = scored.slice(0, coreN);
  const coreHist = new Map();
  for (const { p } of core) { const k = (p[0] << 16) | (p[1] << 8) | p[2]; coreHist.set(k, (coreHist.get(k) || 0) + 1); }
  const fgKey = [...coreHist.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const fgPx = [(fgKey >> 16) & 255, (fgKey >> 8) & 255, fgKey & 255];
  const fgLum = window.__lum(fgPx[0], fgPx[1], fgPx[2]);
  const hex = (p) => '#' + p.map(v => v.toString(16).padStart(2, '0')).join('');
  return {
    bg: hex(bgPx), fg: hex(fgPx),
    bgShare: +(bgSorted[0][1] / (B.w * B.h)).toFixed(3),
    glyphPx: glyph.length,
    ratio: +window.__ratio(fgLum, bgLum).toFixed(2),
  };
};`;

/* measure one element (optionally inside a shadow host) by differential rendering */
async function measure(sel, shadowHost) {
  const rect = await page.evaluate(({ s, host }) => {
    const root = host ? document.querySelector(host)?.shadowRoot : document;
    const el = root && root.querySelector(s);
    if (!el) return { err: 'element not found' };
    el.scrollIntoView({ block: 'center', inline: 'center' });   // v1 bug: measured before scrolling -> below-fold elements gave an empty rect
    return { ok: true };
  }, { s: sel, host: shadowHost });
  if (rect.err) return { error: rect.err };
  await page.waitForTimeout(220);

  const box = await page.evaluate(({ s, host }) => {
    const root = host ? document.querySelector(host).shadowRoot : document;
    const el = root.querySelector(s);
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return { err: 'zero-size' };
    if (r.bottom < 0 || r.top > innerHeight) return { err: 'off-screen after scroll' };
    // pad by 1px so a border doesn't dominate; clamp to viewport
    return { x: Math.max(0, r.x + 1), y: Math.max(0, r.y + 1), width: Math.max(2, r.width - 2), height: Math.max(2, r.height - 2) };
  }, { s: sel, host: shadowHost });
  if (box.err) return { error: box.err };

  const shotA = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
  // hide ONLY this element's glyphs
  await page.evaluate(({ s, host }) => {
    const root = host ? document.querySelector(host).shadowRoot : document;
    const el = root.querySelector(s);
    el.dataset.__prevColor = el.style.color || '';
    el.style.setProperty('color', 'transparent', 'important');
  }, { s: sel, host: shadowHost });
  await page.waitForTimeout(150);
  const shotB = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await page.evaluate(({ s, host }) => {
    const root = host ? document.querySelector(host).shadowRoot : document;
    const el = root.querySelector(s);
    el.style.color = el.dataset.__prevColor || '';
  }, { s: sel, host: shadowHost });

  return await page.evaluate(async ({ a, b2, r }) => {
    const A = await window.__decode(a, r), B = await window.__decode(b2, r);
    if (!A || !B) return { error: 'decode failed' };
    return window.__diffContrast(A, B);
  }, { a: 'data:image/png;base64,' + shotA.toString('base64'), b2: 'data:image/png;base64,' + shotB.toString('base64'), r: box });
}

async function boot(room, theme, pane) {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  await page.addScriptTag({ content: HELPERS });
  await page.evaluate(() => { if (typeof TopicRegistry !== 'undefined') TopicRegistry.setTopic('state-machine'); });
  await page.evaluate((t) => { const de = document.documentElement; if ((de.dataset.theme || 'light') !== t) document.getElementById('themetog').click(); }, theme);
  await page.evaluate((p) => { window.location.hash = '#' + p; }, pane);
  await page.waitForTimeout(450);
  await page.evaluate((g) => document.documentElement.setAttribute('data-group', g), room);   // room stamped LAST so nothing overwrites it
  await page.waitForTimeout(250);
  const got = await page.evaluate(() => document.documentElement.getAttribute('data-group') + '/' + (document.documentElement.dataset.theme || 'light'));
  if (got !== room + '/' + theme) throw new Error('stamp mismatch: wanted ' + room + '/' + theme + ' got ' + got);
}

/* ---------- CALIBRATION ---------- */
console.log('=== CALIBRATION of the differential pixel probe (must reproduce known ratios) ===');
await boot('architecture-apis', 'light', 'walk');
const cal = [];
for (const [name, fg, bg, expect] of [
  ['black on white', '#000000', '#ffffff', 21.0],
  ['#767676 on white (the WCAG 4.5:1 boundary)', '#767676', '#ffffff', 4.54],
  ['#b9b9b9 on white (known fail)', '#b9b9b9', '#ffffff', 1.93],
  ['#598a83 on #f3f0ea (axe\'s claim for the teal room)', '#598a83', '#f3f0ea', 3.42],
]) {
  await page.evaluate(({ f, b2 }) => {
    document.getElementById('__cal')?.remove();
    const p = document.createElement('p'); p.id = '__cal';
    p.textContent = 'CALIBRATION TEXT calibration text';
    p.style.cssText = `position:fixed;top:300px;left:300px;z-index:999999;margin:0;padding:14px;width:460px;font:400 15px monospace;color:${f};background:${b2}`;
    document.body.appendChild(p);
  }, { f: fg, b2: bg });
  await page.waitForTimeout(150);
  const m = await measure('#__cal', null);
  const ok = !m.error && Math.abs(m.ratio - expect) < 0.35;
  cal.push({ name, expect, got: m.ratio, ok });
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(48)} expected ~${String(expect).padStart(5)}   measured ${String(m.ratio ?? m.error).padStart(6)}  (fg ${m.fg} bg ${m.bg})`);
}
await page.evaluate(() => document.getElementById('__cal')?.remove());
const calOk = cal.every(c => c.ok);
console.log(calOk ? '  -> CALIBRATED: the probe recovers known ratios from painted pixels, incl. axe\'s claimed 3.42.\n'
                  : '  -> NOT CALIBRATED — numbers below are not trustworthy.\n');

/* ---------- VERIFY ---------- */
const CASES = [
  { room: 'messaging-events',         theme: 'light', pane: 'trade', host: '#trade deep-trade-offs', sel: '.opt-n > code',           axe: 3.42 },
  { room: 'security-tenancy',         theme: 'light', pane: 'trade', host: '#trade deep-trade-offs', sel: '.opt-n > code',           axe: 4.00 },
  { room: 'messaging-events',         theme: 'dark',  pane: 'trade', host: '#trade deep-trade-offs', sel: '.opt-n > code',           axe: 3.52 },
  { room: 'platform-infra',           theme: 'light', pane: 'rf',    host: '#rf deep-red-flags',     sel: '.rf-tell > code',         axe: 3.67 },
  { room: 'platform-infra',           theme: 'light', pane: 'drill', host: '#drill deep-drill',      sel: 'button[data-m="quick"]',  axe: 4.06 },
  { room: 'data-storage',             theme: 'light', pane: 'drill', host: '#drill deep-drill',      sel: 'button[data-tier="Staff"]', axe: 4.06 },
  { room: 'reliability-observability',theme: 'light', pane: 'drill', host: '#drill deep-drill',      sel: 'button[data-m="quick"]',  axe: 4.28 },
  // CONTROL ROOM: the boot default, which axe scores clean. Same elements.
  { room: 'architecture-apis',        theme: 'light', pane: 'trade', host: '#trade deep-trade-offs', sel: '.opt-n > code',           axe: null },
  { room: 'architecture-apis',        theme: 'light', pane: 'drill', host: '#drill deep-drill',      sel: 'button[data-m="quick"]',  axe: null },
  { room: 'architecture-apis',        theme: 'light', pane: 'rf',    host: '#rf deep-red-flags',     sel: '.rf-tell > code',         axe: null },
];

console.log('=== PIXEL-MEASURED CONTRAST (topic held fixed = state-machine; only the room varies) ===');
console.log('room                        theme  pane   selector                       axe   PIXELS  fg/bg painted        verdict');
console.log('-'.repeat(118));
const verified = [];
for (const c of CASES) {
  try { await boot(c.room, c.theme, c.pane); } catch (e) { console.log(`  ${c.room}/${c.theme} BOOT FAIL: ${e.message}`); continue; }
  const m = await measure(c.sel, c.host);
  if (m.error) { console.log(`  ${c.room.padEnd(26)} ${c.theme.padEnd(6)} ${c.pane.padEnd(6)} ${c.sel.padEnd(30)} -> ${m.error}`); continue; }
  const fails = m.ratio < 4.5;
  const verdict = c.axe === null
    ? (fails ? '** FAILS TOO (axe missed it) **' : 'clean — agrees with axe')
    : (fails ? 'CONFIRMED FAIL' : 'axe FALSE POSITIVE');
  verified.push({ ...c, pixels: m.ratio, fgPainted: m.fg, bgPainted: m.bg, glyphPx: m.glyphPx, fails, verdict });
  console.log(`${c.room.padEnd(27)} ${c.theme.padEnd(6)} ${c.pane.padEnd(6)} ${c.sel.padEnd(30)} ${String(c.axe ?? '-').padStart(5)}  ${String(m.ratio).padStart(6)}  ${(m.fg + ' on ' + m.bg).padEnd(20)} ${verdict}`);

  try {
    await page.evaluate(({ s, host }) => {
      const el = document.querySelector(host).shadowRoot.querySelector(s);
      el.style.outline = '3px solid #ff2d55'; el.style.outlineOffset = '2px';
    }, { s: c.sel, host: c.host });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${SHOTS}/contrast-${c.pane}-${c.room}-${c.theme}.png` });
  } catch {}
}

writeFileSync(`${OUT}/pixel-truth.json`, JSON.stringify({ calibration: cal, verified }, null, 2));
const axeCases = verified.filter(v => v.axe !== null);
console.log('\n=== VERDICT ===');
console.log(`  probe calibration                        : ${calOk ? 'PASSED' : 'FAILED'}`);
console.log(`  axe contrast fails CONFIRMED by pixels   : ${axeCases.filter(v => v.fails).length}/${axeCases.length}`);
console.log(`  axe contrast fails CONTRADICTED by pixels: ${axeCases.filter(v => !v.fails).length}/${axeCases.length}`);
const ctrl = verified.filter(v => v.axe === null);
console.log(`  control room (architecture-apis) failing : ${ctrl.filter(v => v.fails).length}/${ctrl.length}`);
await b.close();
