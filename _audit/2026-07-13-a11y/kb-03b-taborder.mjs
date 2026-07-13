/* kb-03b: corrected tab-order + reachability.
   TWO BUGS IN MY OWN kb-03 — fixed here, because a lens that ships its own artifacts as
   findings is worse than no lens:
     (a) I compared getBoundingClientRect().y ACROSS tab stops. Focusing an element scrolls it
         into view, so those y's are measured at different scroll offsets and are not
         comparable. The 2 "backward jumps" it reported were my scrollbar, not the app's bug.
         FIX: enumerate content-space positions ONCE, before any focus/scroll, then join to the
         tab sequence by path.
     (b) I counted "mouse-operable" as anything with an onclick property — including DISABLED
         buttons. #wprev ("< Prev") is disabled at walkthrough step 1 (walkthrough/logic.js:182
         `this._prev.disabled = this._wi === 0`), so it is not mouse-operable either. It was a
         false positive. FIX: exclude disabled, and prove it by advancing to step 2 and showing
         #wprev becomes tabbable. */
import { open, inject } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');           // dismiss landing index overlay
await page.waitForTimeout(400);
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });

/* --- content-space layout map, captured with NOTHING focused (no scroll perturbation) --- */
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
  // content-space y = viewport y + scrollTop of every scrollable ancestor (scroll-invariant)
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
  window.__kb.all().forEach(el => {
    const p = window.__kb.path(el);
    const c = contentPos(el);
    m[p] = { region: region(el), cy: Math.round(c.y), cx: Math.round(c.x), label: window.__kb.label(el) };
  });
  return m;
});

/* --- tab sequence --- */
const seq = [];
for (let i = 0; i < 80; i++) {
  await page.keyboard.press('Tab');
  const p = await page.evaluate(() => {
    const el = window.__kb.deepActive();
    return (!el || el === document.body) ? null : window.__kb.path(el);
  });
  if (p === null) break;                       // left the document (browser chrome) => cycle done
  if (seq.includes(p)) break;
  seq.push(p);
}
console.log(`TAB STOPS: ${seq.length}\n`);

/* --- per-region monotonicity: does tab order follow reading order WITHIN each region? --- */
const byRegion = {};
seq.forEach((p, i) => {
  const L = layout[p]; if (!L) return;
  (byRegion[L.region] ||= []).push({ i: i + 1, ...L, path: p });
});
console.log('--- REGION ORDER (order in which Tab visits the regions) ---');
const regionFirst = Object.entries(byRegion).map(([r, v]) => ({ r, first: v[0].i, n: v.length })).sort((a, b) => a.first - b.first);
regionFirst.forEach(x => console.log(`  ${x.r.padEnd(10)} first visited at stop ${String(x.first).padStart(2)}  (${x.n} stops)`));

let totalInv = 0;
for (const [r, items] of Object.entries(byRegion)) {
  const inv = [];
  for (let i = 1; i < items.length; i++) {
    const p = items[i - 1], c = items[i];
    if (c.cy < p.cy - 24) inv.push({ from: `${p.label.slice(0, 26)} (cy=${p.cy})`, to: `${c.label.slice(0, 26)} (cy=${c.cy})` });
  }
  totalInv += inv.length;
  console.log(`\n  region ${r}: ${items.length} stops, ${inv.length} backward jump(s) in CONTENT space`);
  inv.forEach(x => console.log(`      ${x.from} -> ${x.to}`));
}
console.log(`\nTOTAL REAL TAB-ORDER INVERSIONS: ${totalInv}`);

/* --- reachability, disabled excluded --- */
const reach = await page.evaluate(() => {
  const out = []; const seen = new Set();
  (function walk(root) {
    root.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) walk(el.shadowRoot);
      const s = getComputedStyle(el);
      if (!el.getClientRects().length || s.visibility === 'hidden' || s.display === 'none') return;
      if (s.pointerEvents === 'none') return;
      if (el.disabled) return;                                 // <-- the kb-03 bug
      const tag = el.tagName.toLowerCase();
      const isCtl = tag === 'button' || (tag === 'a' && el.hasAttribute('href')) || tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'summary';
      const roleBtn = ['button', 'link', 'tab', 'checkbox', 'menuitem'].includes(el.getAttribute('role'));
      const hasHandler = el.onclick !== null || el.hasAttribute('onclick');
      if (!(isCtl || roleBtn || hasHandler)) return;
      const p = window.__kb.path(el); if (seen.has(p)) return; seen.add(p);
      out.push({ path: p, label: window.__kb.label(el), tabbable: window.__kb.tabbable(el) });
    });
  })(document);
  return out;
});
const mouseOnly = reach.filter(c => !c.tabbable);
console.log(`\n--- REACHABILITY (disabled excluded) ---`);
console.log(`mouse-operable: ${reach.length}   NOT keyboard-tabbable: ${mouseOnly.length}`);
mouseOnly.forEach(c => console.log(`   MOUSE-ONLY: ${c.label.slice(0, 34).padEnd(35)} ${c.path}`));

/* --- prove the disabled-#wprev reading: advance a step, #wprev must become tabbable --- */
const wp = async () => page.evaluate(() => {
  const w = document.querySelector('#walk deep-walkthrough');
  const b = w.shadowRoot.getElementById('wprev');
  return { disabled: b.disabled, tabbable: window.__kb.tabbable(b) };
});
console.log(`\n--- #wprev state proof ---`);
console.log(`  walkthrough step 1: ${JSON.stringify(await wp())}`);
await page.evaluate(() => document.querySelector('#walk deep-walkthrough').next());
await page.waitForTimeout(300);
console.log(`  walkthrough step 2: ${JSON.stringify(await wp())}`);
console.log(`  => #wprev is DISABLED at step 1, not unreachable. kb-03's "mouse-only" finding was MY artifact; withdrawn.`);

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-taborder.json', JSON.stringify({ seq, layout, byRegion, mouseOnly }, null, 1));
await browser.close();
