/* kb-03: TAB ORDER + REACHABILITY of the main app (index overlay dismissed).
   Three questions:
     1. Does Tab cycle, or does it TRAP (never return to the start / stick on one element)?
     2. Is every interactive control reachable by keyboard? (set difference:
        {mouse-clickable controls, incl. shadow DOM} minus {controls Tab actually lands on})
     3. Does tab order follow visual order (reading order: top->bottom, left->right)? */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);

/* --- get into the app proper: close the landing index overlay by KEYBOARD only --- */
const before = await page.evaluate(() => document.getElementById('_index-overlay')?.classList.contains('open'));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const after = await page.evaluate(() => document.getElementById('_index-overlay')?.classList.contains('open'));
console.log(`Landing index overlay: open=${before} -> after Escape: open=${after}  ${before && !after ? 'OK (Escape closes it)' : 'PROBLEM'}`);
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
await page.waitForTimeout(200);

/* --- 1+3. walk Tab until it revisits the first stop (or cap) --- */
const stops = [];
const seen = new Map();
let cycled = -1;
for (let i = 0; i < 200; i++) {
  await page.keyboard.press('Tab');
  const a = await page.evaluate(() => {
    const el = window.__kb.deepActive();
    if (!el || el === document.body) return { path: 'BODY(browser chrome)', label: '', x: -1, y: -1, w: 0, h: 0 };
    const i = window.__kb.info(el);
    // stable-ish key for cycle detection
    i.key = i.path + '|' + i.label;
    return i;
  });
  if (a.path === 'BODY(browser chrome)') { stops.push(a); continue; }
  if (seen.has(a.key) && cycled < 0) { cycled = i; break; }
  seen.set(a.key, i);
  stops.push(a);
}
console.log(`\nTAB CYCLE: ${cycled >= 0 ? `returns to start after ${cycled} stops (no trap)` : 'did NOT cycle within 200 presses'}`);
console.log(`DISTINCT TAB STOPS: ${stops.length}`);

console.log('\n--- TAB ORDER (visual position of each stop) ---');
stops.forEach((s, i) => {
  console.log(`${String(i + 1).padStart(3)}. y=${String(Math.round(s.y)).padStart(4)} x=${String(Math.round(s.x)).padStart(4)}  ${(s.label || '(no label)').slice(0, 34).padEnd(35)} ${s.path.slice(-58)}`);
});

/* --- 3. tab order vs visual order: count inversions (a stop that jumps UP the page
       by more than a row-height after having moved down) --- */
const vis = stops.filter(s => s.w > 0 && s.h > 0);
let backJumps = [];
for (let i = 1; i < vis.length; i++) {
  const p = vis[i - 1], c = vis[i];
  if (c.y < p.y - 24) backJumps.push({ from: `${p.label || p.path.slice(-28)} (y=${Math.round(p.y)})`, to: `${c.label || c.path.slice(-28)} (y=${Math.round(c.y)})`, dy: Math.round(c.y - p.y) });
}
console.log(`\nBACKWARD JUMPS in tab order (focus moves UP the page >24px): ${backJumps.length}`);
backJumps.forEach(b => console.log(`   ${b.from}  ->  ${b.to}   dy=${b.dy}`));

/* --- 2. reachability: everything the MOUSE can operate vs what Tab reached --- */
const clickable = await page.evaluate(() => {
  const out = [];
  const seen = new Set();
  (function walk(root) {
    root.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) walk(el.shadowRoot);
      const s = getComputedStyle(el);
      if (!el.getClientRects().length || s.visibility === 'hidden' || s.display === 'none') return;
      if (s.pointerEvents === 'none') return;
      const tag = el.tagName.toLowerCase();
      const isCtl = tag === 'button' || tag === 'a' && el.hasAttribute('href') || tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'summary';
      const hasHandler = el.onclick !== null || el.hasAttribute('onclick');
      const roleBtn = ['button', 'link', 'tab', 'checkbox', 'menuitem'].includes(el.getAttribute('role'));
      if (!(isCtl || hasHandler || roleBtn)) return;
      const p = window.__kb.path(el);
      if (seen.has(p)) return; seen.add(p);
      out.push({ path: p, label: window.__kb.label(el), tabbable: window.__kb.tabbable(el), tabindex: el.getAttribute('tabindex'), cursor: s.cursor });
    });
  })(document);
  return out;
})
;
const notTabbable = clickable.filter(c => !c.tabbable);
console.log(`\n--- REACHABILITY ---`);
console.log(`mouse-operable controls found (light+shadow DOM): ${clickable.length}`);
console.log(`of which NOT keyboard-tabbable: ${notTabbable.length}`);
notTabbable.forEach(c => console.log(`   MOUSE-ONLY: ${(c.label || '(no label)').slice(0, 30).padEnd(31)} tabindex=${c.tabindex} cursor=${c.cursor}  ${c.path}`));

fs.mkdirSync(SHOTS, { recursive: true });
fs.writeFileSync(`${SHOTS}/../../kb-taborder.json`, JSON.stringify({ stops, backJumps, clickable, notTabbable }, null, 1));
console.log(`\npageerrors: ${page.__errs.length}`);
await browser.close();
