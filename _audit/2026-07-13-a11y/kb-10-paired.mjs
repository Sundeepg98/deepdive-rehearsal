/* kb-10: THE DEFINITIVE focus-visibility check — every control measured TWICE.

   PASS 1  the app as shipped                      -> signal
   PASS 2  the same control with its focus styling PINNED TO ITS RESTING VALUES, i.e. a control
           that provably has NO focus indicator     -> floor
   A control has a real indicator iff signal >> floor. The negative control is therefore not a
   separate ceremony bolted on at the end — it is RUN AGAINST EVERY CONTROL, and pass 2 IS the
   deliberate breakage. If pass 2 does not collapse, the instrument is decoration and says so.

   Three earlier attempts failed and each taught the design:
     - `background:inherit` on :focus CREATED a change (inherit != no-change).
     - `box-shadow:none` on :focus DELETED the element's RESTING shadow (also a change).
     - reading "resting" values while the element was still FOCUSED pinned the ring ON.
   Hence: capture resting values with NOTHING focused, and pin every ring-capable property to
   exactly those values.

   Pinning is done with INLINE style + !important, not a stylesheet, for two reasons:
     (a) inline !important beats the app's :focus-visible rules without me having to out-specify
         a cascade I do not control;
     (b) page.addStyleTag() cannot reach inside a shadow root, and 12 of this app's controls
         (the drill's reveal/grade buttons, the walkthrough's nav) live in one. A light-DOM-only
         negative control would silently never break them — the exact class of blind spot this
         audit exists to end.
   At rest the pinned element is pixel-identical to normal (same values); only its focus ring is
   suppressed. */
import { open, inject, pxdiff, shotBox, CR, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const TOL = 8;
const PIN = ['outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow',
  'background-color', 'background-image', 'border-color', 'border-width', 'color', 'transform', 'opacity', 'filter', 'text-decoration-color'];

const { browser, page } = await open();
await inject(page);
await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
await page.waitForTimeout(250);
fs.mkdirSync(SHOTS, { recursive: true });

const items = await page.evaluate(() => window.__kb.all().map((el, i) => {
  el.setAttribute('data-kbid', 'kb' + i);
  return { id: 'kb' + i, label: window.__kb.label(el), path: window.__kb.path(el), inShadow: el.getRootNode() instanceof ShadowRoot };
}));
const handleFor = (id) => page.evaluateHandle(i => {
  let f = null;
  (function w(r) { r.querySelectorAll('*').forEach(e => { if (e.getAttribute && e.getAttribute('data-kbid') === i) f = e; if (e.shadowRoot) w(e.shadowRoot); }); })(document);
  return f;
}, id);

async function measure(el) {
  await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await page.waitForTimeout(150);
  const rect = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (rect.w < 1 || rect.h < 1) return null;
  const b1 = await shotBox(page, rect);
  await page.waitForTimeout(100);
  const b2 = await shotBox(page, rect);
  if (!b1 || !b2) return null;
  const noise = await pxdiff(page, b1, b2, TOL);
  await el.evaluate(e => e.focus());
  await page.waitForTimeout(200);
  const after = await shotBox(page, rect);
  const sig = await pxdiff(page, b2, after, TOL);
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });   // ALWAYS leave blurred
  return { rect, noise: noise.changed, changed: sig.changed, maxDelta: sig.maxDelta, bbox: sig.bbox, best: sig.best };
}

/* ---------------- PASS 1: as shipped ---------------- */
console.log(`PASS 1 — app as shipped (${items.length} controls)`);
const P1 = {};
for (const it of items) { const h = await handleFor(it.id); const e = h.asElement(); if (e) P1[it.id] = await measure(e); }

/* ---------------- pin every control's focus styling to its RESTING values ---------------- */
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
await page.waitForTimeout(250);
const pinned = await page.evaluate((props) => {
  let n = 0;
  (function w(r) {
    r.querySelectorAll('*').forEach(e => {
      if (e.getAttribute && e.getAttribute('data-kbid')) {
        const s = getComputedStyle(e);                        // RESTING (nothing is focused)
        props.forEach(p => e.style.setProperty(p, s.getPropertyValue(p), 'important'));
        n++;
      }
      if (e.shadowRoot) w(e.shadowRoot);
    });
  })(document);
  return n;
}, PIN);
console.log(`\nNEGATIVE CONTROL: focus styling pinned to resting values on ${pinned} controls (incl. shadow DOM)`);

/* ---------------- PASS 2: ring removed ---------------- */
console.log(`PASS 2 — same controls, focus indicator suppressed`);
const P2 = {};
for (const it of items) { const h = await handleFor(it.id); const e = h.asElement(); if (e) P2[it.id] = await measure(e); }

/* ---------------- verdicts ---------------- */
const rows = [];
for (const it of items) {
  const a = P1[it.id], b = P2[it.id];
  if (!a || !b) { rows.push({ ...it, verdict: 'SKIP' }); continue; }
  const floor = Math.max(b.changed, a.noise);
  const perim = 4 * a.rect.w + 4 * a.rect.h + 16;
  const contrast = a.best ? CR(a.best.from, a.best.to) : 1;
  const ratio = floor > 0 ? a.changed / floor : (a.changed > 0 ? Infinity : 0);
  let verdict;
  if (a.changed <= floor) verdict = 'INVISIBLE';
  else if (a.changed - floor < perim * 0.5 || contrast < 3) verdict = 'WEAK';
  else verdict = 'OK';
  rows.push({ ...it, signal: a.changed, floor, ratio: ratio === Infinity ? 'inf' : +ratio.toFixed(1), perim: Math.round(perim), contrast: +contrast.toFixed(2), verdict, rect: a.rect });
}

const g = v => rows.filter(r => r.verdict === v);
console.log(`\n================ RESULT ================`);
console.log(`OK=${g('OK').length}  WEAK=${g('WEAK').length}  INVISIBLE=${g('INVISIBLE').length}  SKIP=${g('SKIP').length}  (of ${rows.length})\n`);
console.log('verdict    signal  floor  ratio  perim  contr  shadow  control');
for (const r of rows) {
  if (r.verdict === 'OK' && !process.argv.includes('--all')) continue;
  console.log(`${r.verdict.padEnd(10)} ${String(r.signal ?? '-').padStart(6)} ${String(r.floor ?? '-').padStart(6)} ${String(r.ratio ?? '-').padStart(6)} ${String(r.perim ?? '-').padStart(6)} ${String(r.contrast ?? '-').padStart(6)}  ${String(r.inShadow).padEnd(6)} ${(r.label || '').slice(0, 28).padEnd(29)} ${r.path.slice(-40)}`);
}

/* ---------------- INSTRUMENT VALIDITY ---------------- */
const okP1 = rows.filter(r => r.verdict === 'OK' || r.verdict === 'WEAK');
const collapsed = okP1.filter(r => { const b = P2[r.id]; const a = P1[r.id]; return b && a && b.changed < a.changed * 0.35; });
console.log(`\n================ NEGATIVE CONTROL ================`);
console.log(`controls with an indicator in pass 1: ${okP1.length}`);
console.log(`of those, indicator COLLAPSED (>65% of the signal gone) when suppressed in pass 2: ${collapsed.length}`);
const median = arr => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
console.log(`median signal  as shipped: ${median(okP1.map(r => P1[r.id].changed))} px`);
console.log(`median signal  ring removed: ${median(okP1.map(r => P2[r.id].changed))} px`);
console.log(collapsed.length >= okP1.length * 0.9 && okP1.length > 0
  ? `\nVALID: removing the ring collapses the measured signal on ${collapsed.length}/${okP1.length} controls.\nThe check GOES RED on demand => its passes are evidence and its INVISIBLE verdicts are real.`
  : `\nNOT VALID: the signal did not collapse (${collapsed.length}/${okP1.length}). Do not trust this check.`);

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-paired.json', JSON.stringify({ rows, P1, P2 }, null, 1));
await browser.close();
