/* kb-05: IS THERE A VISIBLE FOCUS INDICATOR ON EVERY CONTROL?
   Measured in painted pixels. Never from getComputedStyle().outline — an `outline:2px solid
   var(--acc)` reads perfectly in the CSSOM even when --acc equals the element's own background,
   and a later higher-specificity `:focus{outline:none}` silently beats `:focus-visible{outline:2px}`
   while a stylesheet grep still says "styled". Only pixels can fail.

   PROTOCOL per control (order matters):
     1. scrollIntoView WITHOUT focusing        — so the before/after shots share a scroll offset.
                                                  (Focusing scrolls; if I shot 'before' at a
                                                   different scroll, 100% of pixels would "change"
                                                   and every control would falsely pass.)
     2. blur everything, shot BEFORE_1
     3. shot BEFORE_2                          — BEFORE_1 vs BEFORE_2 = the NOISE FLOOR of this
                                                  element (idle animations, gradients, carets).
                                                  Without this, an element that merely animates
                                                  would be scored as "has a focus ring".
     4. focus it, shot AFTER
     5. SIGNAL = diff(BEFORE_2, AFTER). Verdict compares SIGNAL against NOISE, not against zero.

   VERDICT (grounded in WCAG 2.4.11 Focus Appearance, AA in WCAG 2.2):
     INVISIBLE  signal.changed <= noise.changed          -> no detectable indicator at all
     WEAK       signal area < 2px-perimeter area, or focused-vs-unfocused contrast < 3:1
     OK         otherwise
   2px-perimeter area for a w x h control = (w+4)(h+4) - wh = 4w + 4h + 16. */
import { open, inject, pxdiff, shotBox, CR, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const TOL = 8;              // per-channel delta to call a pixel "changed"
const NEG = process.argv.includes('--negative');   // negative-control mode

const { browser, page } = await open();
await inject(page);
await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
await page.keyboard.press('Escape');            // dismiss landing index overlay
await page.waitForTimeout(400);

/* NEGATIVE CONTROL: deliberately break the focus ring on three controls that pass.
   If the check is real, these three must flip to INVISIBLE and nothing else may change. */
const NEG_TARGETS = ['#_focus-toggle', '#searchopen', '.sidebar .seg button'];
if (NEG) {
  await page.addStyleTag({
    content: NEG_TARGETS.map(s => `${s}:focus,${s}:focus-visible{outline:none!important;box-shadow:none!important;background:inherit!important;border-color:inherit!important;color:inherit!important}`).join('\n')
  });
  console.log('*** NEGATIVE CONTROL ACTIVE — focus styling forcibly killed on:', NEG_TARGETS.join(', '), '***\n');
}

/* stamp + enumerate */
const items = await page.evaluate(() => window.__kb.all().map((el, i) => {
  el.setAttribute('data-kbid', 'kb' + i);
  const r = el.getBoundingClientRect();
  return { id: 'kb' + i, label: window.__kb.label(el), path: window.__kb.path(el), w: Math.round(r.width), h: Math.round(r.height) };
}));
console.log(`measuring ${items.length} controls...\n`);

const rows = [];
for (const it of items) {
  const h = await page.evaluateHandle(id => {
    let found = null;
    (function walk(root) { root.querySelectorAll('*').forEach(e => { if (e.getAttribute && e.getAttribute('data-kbid') === id) found = e; if (e.shadowRoot) walk(e.shadowRoot); }); })(document);
    return found;
  }, it.id);
  const el = h.asElement();
  if (!el) continue;

  // 1. scroll into view WITHOUT focusing
  await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await page.waitForTimeout(160);

  const rect = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (rect.w < 1 || rect.h < 1) { rows.push({ ...it, verdict: 'SKIP(zero-size)' }); continue; }

  // 2+3. two baselines -> noise floor
  const b1 = await shotBox(page, rect);
  await page.waitForTimeout(120);
  const b2 = await shotBox(page, rect);
  if (!b1 || !b2) { rows.push({ ...it, verdict: 'SKIP(offscreen)' }); continue; }
  const noise = await pxdiff(page, b1, b2, TOL);

  // 4. focus (scripted focus DOES match :focus-visible here — proven in kb-01)
  await el.evaluate(e => e.focus());
  await page.waitForTimeout(200);
  const fv = await el.evaluate(e => { try { return e.matches(':focus-visible'); } catch (x) { return null; } });
  const after = await shotBox(page, rect);
  const sig = await pxdiff(page, b2, after, TOL);

  const perim = 4 * rect.w + 4 * rect.h + 16;
  const contrast = sig.best ? CR(sig.best.from, sig.best.to) : 1;
  let verdict;
  if (sig.changed <= noise.changed) verdict = 'INVISIBLE';
  else if (sig.changed < perim * 0.5 || contrast < 3) verdict = 'WEAK';
  else verdict = 'OK';

  rows.push({ ...it, focusVisible: fv, noise: noise.changed, signal: sig.changed, perimArea: Math.round(perim), contrast: +contrast.toFixed(2), maxDelta: sig.maxDelta, verdict, rect });
  if (verdict !== 'OK') {
    const shot = `${SHOTS}/focus-${verdict.toLowerCase().replace(/[^a-z]/g, '')}-${it.id}.png`;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: shot, clip: { x: Math.max(0, rect.x - 20), y: Math.max(0, rect.y - 20), width: Math.min(rect.w + 40, 1400), height: Math.min(rect.h + 40, 900) } });
  }
}

const bad = rows.filter(r => r.verdict === 'INVISIBLE');
const weak = rows.filter(r => r.verdict === 'WEAK');
const ok = rows.filter(r => r.verdict === 'OK');
console.log(`RESULT${NEG ? ' (NEGATIVE CONTROL)' : ''}:  OK=${ok.length}  WEAK=${weak.length}  INVISIBLE=${bad.length}  (of ${rows.length})\n`);
console.log('verdict    signal  noise  perim  contrast  fv     control');
for (const r of rows) {
  if (r.verdict === 'OK' && !process.argv.includes('--all')) continue;
  console.log(`${(r.verdict || '?').padEnd(10)} ${String(r.signal).padStart(6)} ${String(r.noise).padStart(6)} ${String(r.perimArea).padStart(6)} ${String(r.contrast).padStart(8)}  ${String(r.focusVisible).padEnd(5)} ${(r.label || '').slice(0, 30).padEnd(31)} ${r.path.slice(-46)}`);
}
if (NEG) {
  console.log('\n--- negative-control assertion ---');
  const hit = rows.filter(r => ['#_focus-toggle'].some(() => false) || r.path.includes('_focus-toggle') || r.path.includes('searchopen') || (r.path.includes('.seg') && r.path.includes('button')));
  const flipped = hit.filter(r => r.verdict === 'INVISIBLE' || r.verdict === 'WEAK');
  console.log(`targets measured: ${hit.length}, now INVISIBLE/WEAK: ${flipped.length}`);
  hit.forEach(r => console.log(`   ${r.verdict.padEnd(10)} signal=${String(r.signal).padStart(5)} (noise ${r.noise})  ${r.label.slice(0, 28)}`));
  console.log(flipped.length === hit.length && hit.length > 0
    ? '\nCHECK GOES RED when the ring is removed => the instrument can fail. VALID.'
    : '\n!!! the check did NOT go red -> it is decoration. Do not trust its passes.');
}

fs.writeFileSync(`D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-focusvis${NEG ? '-NEG' : ''}.json`, JSON.stringify(rows, null, 1));
await browser.close();
