/* 1) exact pixel width where document-level horizontal overflow starts
   2) root cause of the Numbers-pane clip: which element has the ~830px hard min-width? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 500, height: 900 }, reducedMotion: 'reduce' });

console.log('=== 1. EXACT doc-overflow breaking width (1px steps) ===');
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(800);
let firstClean = null;
for (let w = 395; w <= 425; w++) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.waitForTimeout(60);
  const r = await p.evaluate(() => { const d = document.documentElement; return { sw: d.scrollWidth, over: d.scrollWidth - d.clientWidth }; });
  if (r.over <= 0 && firstClean === null) firstClean = w;
  if (w % 5 === 0 || (r.over > 0 && w > 405) || w === firstClean) console.log(`  ${w}px -> scrollWidth=${r.sw}  ${r.over > 0 ? 'OVERFLOW +' + r.over : 'clean'}`);
}
console.log(`\n  >>> horizontal page overflow at EVERY width < ${firstClean}px; clean at >= ${firstClean}px.`);
console.log('  >>> the page has a hard minimum content width of ' + firstClean + 'px.');

// what sets that 411px floor?
await p.setViewportSize({ width: 360, height: 900 });
await p.waitForTimeout(300);
const floor = await p.evaluate(() => {
  const vw = window.innerWidth;
  const out = [];
  const walk = (root, chain) => {
    root.querySelectorAll('*').forEach(e => {
      if (e.shadowRoot) walk(e.shadowRoot, chain + '>' + e.tagName.toLowerCase());
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (r.width === 0) return;
      if (r.right > vw + 1 && cs.position !== 'fixed') {
        // ignore anything inside a horizontal scroller (legit) and the offscreen a11y hack
        let anc = e.parentElement, inScroller = false;
        while (anc) { const a = getComputedStyle(anc); if (a.overflowX === 'auto' || a.overflowX === 'scroll') { inScroller = true; break; } anc = anc.parentElement; }
        if (inScroller || r.left < -1000) return;
        out.push({ sel: chain + '>' + e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].slice(0,2).join('.') : ''), w: Math.round(r.width), right: Math.round(r.right), minW: cs.minWidth, ws: cs.whiteSpace, text: e.textContent.trim().slice(0,40) });
      }
    });
  };
  walk(document, '');
  return out.sort((a, b2) => b2.right - a.right).slice(0, 6);
});
console.log('\n  what escapes at 360px (excluding legit scrollers):');
floor.forEach(f => console.log('   ', JSON.stringify(f)));

console.log('\n=== 2. NUMBERS pane: what has the hard min-width? (storage-engines @1280) ===');
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(800);
const num = await p.evaluate(() => {
  const pane = document.querySelector('.pane.on');
  const limit = pane.getBoundingClientRect().right;
  const col = Math.round(pane.getBoundingClientRect().width);
  const sr = document.querySelector('deep-numbers').shadowRoot;
  const out = [];
  sr.querySelectorAll('*').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(e);
    const intrinsic = e.scrollWidth;
    if (r.right > limit + 1 || (intrinsic > e.clientWidth + 1)) {
      out.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : ''),
        w: Math.round(r.width), right: Math.round(r.right), overCol: Math.round(r.right - limit),
        clientW: e.clientWidth, scrollW: e.scrollWidth,
        display: cs.display, gridCols: cs.gridTemplateColumns.slice(0, 60), minW: cs.minWidth, ws: cs.whiteSpace,
        text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 50)
      });
    }
  });
  const stage = document.querySelector('.stage');
  return { column: col, stageClip: stage.scrollWidth - stage.clientWidth, items: out.sort((a, b2) => b2.overCol - a.overCol).slice(0, 8) };
});
console.log(JSON.stringify(num, null, 1));
await p.screenshot({ path: SHOTS + '/num-1280-storage-engines-CLIPPED.png' });
await b.close();
