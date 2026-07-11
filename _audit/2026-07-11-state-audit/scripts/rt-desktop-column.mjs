/* 1) Reading-column curve 760..1920 @1px around the cliffs -> exact non-monotonic regions.
   2) Does folding the companion (.cmp-x / body.cmp-collapsed) recover the column at 1280? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.keyboard.press('Escape');

const col = () => p.evaluate(() => {
  const pane = document.querySelector('.pane.on');
  return pane ? Math.round(pane.getBoundingClientRect().width) : null;
});

// coarse curve
console.log('=== READING-COLUMN CURVE (px of usable text width) ===');
const curve = [];
for (let w = 760; w <= 1920; w += 20) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.waitForTimeout(45);
  curve.push({ w, c: await col() });
}
// find non-monotonic drops
const drops = [];
for (let i = 1; i < curve.length; i++) if (curve[i].c < curve[i - 1].c - 2) drops.push({ from: curve[i - 1], to: curve[i] });
console.log('\nNON-MONOTONIC DROPS (window got WIDER but the reading column got NARROWER):');
drops.forEach(d => console.log(`  ${d.from.w}px (col ${d.from.c}px)  ->  ${d.to.w}px (col ${d.to.c}px)   = ${d.to.c - d.from.c}px LOST by widening the window`));

// the 830px cap: where is it first reached, lost, and regained?
const capped = curve.filter(x => x.c >= 830);
console.log('\n830px cap (the designed max reading width):');
const firstCap = curve.find(x => x.c >= 830);
console.log('  first reached at:', firstCap ? firstCap.w + 'px' : 'never');
// after the 1280 cliff, when regained?
const after1280 = curve.filter(x => x.w >= 1280);
const regain = after1280.find(x => x.c >= 830);
console.log('  lost at 1280px (companion appears)');
console.log('  regained at    :', regain ? regain.w + 'px' : 'not within 1920');
console.log('  -> you need a ' + (regain ? regain.w : '>1920') + 'px viewport to get back the column you already had at ' + (firstCap ? firstCap.w : '?') + 'px.');

console.log('\n  width : column   (marking the cliffs)');
curve.filter(x => [760, 900, 920, 940, 1020, 1120, 1220, 1260, 1280, 1300, 1400, 1500, 1520, 1540, 1600, 1700, 1800, 1920].includes(x.w))
  .forEach(x => console.log('  ' + String(x.w).padStart(5) + ' : ' + String(x.c).padStart(4) + 'px' + (x.w === 920 || x.w === 1280 ? '   <<< CLIFF' : '') + (x.c >= 830 ? '   (at cap)' : '')));

// 2) companion fold at 1280
console.log('\n=== COMPANION FOLD at 1280 (is folding a working mitigation?) ===');
await p.setViewportSize({ width: 1280, height: 800 });
await p.waitForTimeout(300);
const before = await col();
const foldSel = await p.evaluate(() => {
  const x = document.querySelector('.cmp-x, .cmp-fold, [data-cmp], .companion button');
  return x ? (x.className || x.tagName) : null;
});
console.log('  fold control found:', foldSel);
await p.evaluate(() => {
  const x = document.querySelector('.cmp-x, .cmp-fold, [data-cmp]');
  if (x) x.click(); else document.body.classList.add('cmp-collapsed');
});
await p.waitForTimeout(400);
const after = await col();
const state = await p.evaluate(() => ({ collapsed: document.body.classList.contains('cmp-collapsed'), reopenShown: getComputedStyle(document.querySelector('.cmp-reopen')).display !== 'none' }));
console.log(`  column with companion OPEN  : ${before}px`);
console.log(`  column with companion FOLDED: ${after}px   (body.cmp-collapsed=${state.collapsed}, reopen button visible=${state.reopenShown})`);
console.log(`  -> folding recovers ${after - before}px` + (after >= 830 ? ' and restores the 830px cap.' : '.'));
await p.screenshot({ path: SHOTS + '/companion-folded-1280.png' });
await b.close();
