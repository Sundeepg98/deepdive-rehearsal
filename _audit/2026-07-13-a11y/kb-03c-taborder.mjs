/* kb-03c: tab-order, third time. kb-03b's cycle key was the CSS path, which is identical for
   sibling buttons (the 9 `.seg button`s, the 2 `#textzoom .textzoom-btn`s), so the walk
   "detected a cycle" at stop 8 and quit. Identity now = a stamped unique data-kbid, so every
   element is distinguishable and the walk runs to the true cycle. */
import { open, inject } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });

/* stamp every focusable with a unique id + capture its content-space position (no focus yet) */
const layout = await page.evaluate(() => {
  const region = el => {
    let n = el;
    while (n) {
      if (n.classList) {
        if (n.classList.contains('sidebar')) return 'sidebar';
        if (n.classList.contains('stage')) return 'stage';
        if (n.classList.contains('companion')) return 'companion';
      }
      const r = n.getRootNode();
      n = (r instanceof ShadowRoot) ? r.host : n.parentElement;
    }
    return 'floating';
  };
  const contentPos = el => {
    const r = el.getBoundingClientRect();
    let x = r.x, y = r.y, n = el.parentElement;
    while (n) {
      if (n.scrollHeight > n.clientHeight || n.scrollWidth > n.clientWidth) { y += n.scrollTop; x += n.scrollLeft; }
      const rt = n.getRootNode();
      n = (rt instanceof ShadowRoot) ? rt.host : n.parentElement;
    }
    return { x, y };
  };
  const m = {};
  window.__kb.all().forEach((el, i) => {
    const id = 'kb' + i;
    el.setAttribute('data-kbid', id);
    const c = contentPos(el);
    m[id] = { region: region(el), cy: Math.round(c.y), cx: Math.round(c.x), label: window.__kb.label(el), path: window.__kb.path(el), domIndex: i };
  });
  return m;
});
console.log(`focusables stamped: ${Object.keys(layout).length}`);

const seq = [];
for (let i = 0; i < 160; i++) {
  await page.keyboard.press('Tab');
  const id = await page.evaluate(() => {
    const el = window.__kb.deepActive();
    if (!el || el === document.body) return '__BODY__';
    return el.getAttribute('data-kbid') || ('UNSTAMPED:' + window.__kb.path(el));
  });
  if (id === '__BODY__') { console.log(`  (stop ${i + 1}: focus left the document — browser chrome)`); continue; }
  if (seq.includes(id)) { console.log(`\nCYCLE: returned to ${id} after ${seq.length} distinct stops -> no keyboard trap`); break; }
  seq.push(id);
}

console.log(`\nDISTINCT TAB STOPS: ${seq.length}   (focusables enumerated: ${Object.keys(layout).length})`);
const unreached = Object.keys(layout).filter(id => !seq.includes(id));
console.log(`ENUMERATED BUT NEVER FOCUSED BY TAB: ${unreached.length}`);
unreached.forEach(id => console.log(`   UNREACHED: ${layout[id].label.slice(0, 32).padEnd(33)} ${layout[id].path}`));

/* region order + per-region monotonicity */
const byRegion = {};
seq.forEach((id, i) => { const L = layout[id]; if (L) (byRegion[L.region] ||= []).push({ i: i + 1, ...L }); });
console.log('\n--- REGION VISIT ORDER ---');
Object.entries(byRegion).map(([r, v]) => ({ r, first: v[0].i, n: v.length })).sort((a, b) => a.first - b.first)
  .forEach(x => console.log(`  ${x.r.padEnd(10)} stops ${String(x.first).padStart(2)}..  (${x.n} stops)`));

let totalInv = 0;
console.log('\n--- BACKWARD JUMPS IN CONTENT SPACE (scroll-invariant) ---');
for (const [r, items] of Object.entries(byRegion)) {
  const inv = [];
  for (let i = 1; i < items.length; i++) {
    const p = items[i - 1], c = items[i];
    if (c.cy < p.cy - 24) inv.push(`stop ${p.i}->${c.i}: "${p.label.slice(0, 24)}" (cy=${p.cy}) -> "${c.label.slice(0, 24)}" (cy=${c.cy})`);
  }
  totalInv += inv.length;
  console.log(`  ${r.padEnd(10)} ${items.length} stops, ${inv.length} inversion(s)`);
  inv.forEach(x => console.log(`      ${x}`));
}
console.log(`\nTOTAL TAB-ORDER INVERSIONS: ${totalInv}`);

/* is DOM order == tab order? (a positive tabindex would break this) */
const domOrder = seq.map(id => layout[id].domIndex);
const monotonic = domOrder.every((v, i) => i === 0 || v > domOrder[i - 1]);
console.log(`TAB ORDER FOLLOWS DOM ORDER: ${monotonic ? 'yes (no positive-tabindex reordering)' : 'NO — tabindex reordering present'}`);
const posTabindex = await page.evaluate(() => window.__kb.all().filter(e => +e.getAttribute('tabindex') > 0).map(e => window.__kb.path(e)));
console.log(`elements with positive tabindex (anti-pattern): ${posTabindex.length}`, posTabindex);

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-taborder.json', JSON.stringify({ seq, layout, byRegion }, null, 1));
await browser.close();
