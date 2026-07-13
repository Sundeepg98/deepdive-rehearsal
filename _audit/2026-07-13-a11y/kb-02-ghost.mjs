/* kb-02: is the tab order walking into overlays that are CLOSED and INVISIBLE?
   kb-01 showed Tab #1 from a cold load lands on button.ix-x inside #_index-overlay, which is
   not .open. Two ways that could be benign and one way it is a catastrophe:
     benign  — the overlay is actually on screen (I misread), or the control is display:none and
               Chromium is lying to my check.
     disaster— the overlay is hidden with opacity/transform only, so it is INVISIBLE to the eye
               but its controls remain in the tab order: the keyboard user's focus vanishes into
               a ghost panel that a mouse user never sees.
   Settle it with PAINTED PIXELS, not computed style — opacity:0 on an ancestor does NOT show up
   in a descendant's computed opacity (the exact trap that certified a blank page as passing). */
import { open, inject, focusVis, shotBox, pxdiff, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);

/* how each overlay is hidden, and whether its controls stay tabbable */
const overlays = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[role="dialog"],.mock-ov,.cram-ov,[id$="-overlay"]').forEach(el => {
    const s = getComputedStyle(el);
    // effective opacity = product of every ancestor's opacity (this is what the eye sees)
    let eff = 1, n = el;
    while (n && n.nodeType === 1) { eff *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
    const tabbables = window.__kb.all().filter(x => el.contains(x));
    out.push({
      id: el.id || el.className, open: el.classList.contains('open'),
      display: s.display, visibility: s.visibility, opacity: s.opacity,
      effectiveOpacity: +eff.toFixed(3), pointerEvents: s.pointerEvents,
      ariaHidden: el.getAttribute('aria-hidden'), inert: el.hasAttribute('inert'),
      tabbableInside: tabbables.length
    });
  });
  return out;
});
console.log('=== OVERLAY HIDING MECHANISM (cold load, none open) ===');
for (const o of overlays) {
  const ghost = !o.open && o.tabbableInside > 0 && o.effectiveOpacity === 0;
  console.log(`${ghost ? 'GHOST ' : '      '}${(o.id || '?').padEnd(22)} open=${String(o.open).padEnd(5)} disp=${o.display.padEnd(6)} vis=${o.visibility.padEnd(7)} opac=${o.opacity} eff=${o.effectiveOpacity} pe=${o.pointerEvents.padEnd(6)} aria-hidden=${o.ariaHidden} inert=${o.inert} tabbables=${o.tabbableInside}`);
}

const totalTabbable = await page.evaluate(() => window.__kb.all().length);
const ghostTabbable = await page.evaluate(() => {
  let n = 0;
  window.__kb.all().forEach(el => {
    let eff = 1, p = el;
    while (p && p.nodeType === 1) { eff *= parseFloat(getComputedStyle(p).opacity); p = p.parentElement; }
    if (eff === 0) n++;
  });
  return n;
});
console.log(`\nTABBABLE TOTAL: ${totalTabbable}   of which INVISIBLE (effective opacity 0): ${ghostTabbable}`);

/* ---- PIXEL PROOF: focus the first tab stop, count painted-pixel change ---- */
await page.evaluate(() => document.activeElement.blur());
const h = await page.evaluateHandle(() => document.querySelector('#_index-overlay .ix-x'));
const r = await focusVis(page, h, async () => { await page.keyboard.press('Tab'); });
console.log(`\nTab #1 target = #_index-overlay .ix-x`);
console.log(`  changed pixels when focused: ${r.changed} / ${r.total}   maxDelta=${r.maxDelta}  :focus-visible=${r.focusVisible}`);
console.log(`  => ${r.changed === 0 ? 'INVISIBLE. Focus is on a control the user cannot see.' : 'something painted'}`);

/* full-page proof shot: focus is "on" the ix close button; show the page as the user sees it */
await page.keyboard.press('Tab');   // ensure focus is there
fs.mkdirSync(SHOTS, { recursive: true });
await page.screenshot({ path: `${SHOTS}/ghost-01-tab1-focus-invisible.png` });
const where = await page.evaluate(() => {
  const el = window.__kb.deepActive();
  const rr = el.getBoundingClientRect();
  return { path: window.__kb.path(el), label: window.__kb.label(el), rect: [rr.x, rr.y, rr.width, rr.height] };
});
console.log('  focus now on:', JSON.stringify(where));

/* how many Tab presses to escape the ghost overlay and reach a real control? */
await page.evaluate(() => document.activeElement.blur());
let steps = 0, escaped = null;
for (let i = 1; i <= 140; i++) {
  await page.keyboard.press('Tab');
  const a = await page.evaluate(() => {
    const el = window.__kb.deepActive();
    let eff = 1, p = el;
    while (p && p.nodeType === 1) { eff *= parseFloat(getComputedStyle(p).opacity); p = p.parentElement; }
    return { path: window.__kb.path(el), label: window.__kb.label(el), eff: +eff.toFixed(3) };
  });
  if (a.eff > 0) { escaped = a; steps = i; break; }
}
console.log(`\nTAB PRESSES TO REACH THE FIRST *VISIBLE* CONTROL: ${escaped ? steps : '>140 (never)'}`);
if (escaped) console.log('  first visible control:', JSON.stringify(escaped));

await browser.close();
