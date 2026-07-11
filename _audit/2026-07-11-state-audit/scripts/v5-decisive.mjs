import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const out = {};
const b = await chromium.launch();

// ---------------- A. isMobile:true @360, overlay suppressed ----------------
let ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
let p = await ctx.newPage();
await p.goto(BASE + '#debugging/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);

// FULL playwright error text
for (const sel of ['#tnnext', '#toolsfab']) {
  try { await p.locator(sel).click({ timeout: 3500 }); console.log(sel, 'CLICKED OK'); }
  catch (e) { console.log('\n===== FULL ERROR ' + sel + ' =====\n' + e.message.replace(/\[\d+m/g, '')); }
}

// geometry of every FIXED bar + its right-most control
const bars = await p.evaluate(() => {
  const g = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1) }; };
  const seg = document.querySelector('.sidebar .seg');
  const mockcta = document.querySelector('.sidebar .mockcta');
  const fab = document.getElementById('toolsfab');
  const nx = document.getElementById('tnnext');
  const de = document.documentElement;
  return {
    docCW: de.clientWidth, docSW: de.scrollWidth, innerWidth: window.innerWidth,
    vv: window.visualViewport ? { w: window.visualViewport.width, scale: window.visualViewport.scale, offsetLeft: window.visualViewport.offsetLeft } : null,
    seg: g(seg), segPos: seg ? getComputedStyle(seg).position : null,
    mockcta: g(mockcta), mockctaPos: mockcta ? getComputedStyle(mockcta).position : null,
    toolsfab: g(fab), tnnext: g(nx),
    visibleEdge: de.clientWidth
  };
});
console.log('\n=== FIXED-BAR GEOMETRY @360 (isMobile) ===');
console.log(JSON.stringify(bars, null, 1));
out.bars = bars;

// real touch PAN attempt
const pan = await (async () => {
  await p.touchscreen.tap(180, 400);
  const before = await p.evaluate(() => window.scrollX);
  // simulate a drag from right to left (pan right)
  await p.mouse.move(340, 500); await p.mouse.down(); await p.mouse.move(40, 500, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({ scrollX: window.scrollX, vvOffset: window.visualViewport ? window.visualViewport.offsetLeft : null }));
  return { before, after };
})();
console.log('\n=== PAN ATTEMPT (drag 340->40) ===', JSON.stringify(pan));
out.pan = pan;
await p.screenshot({ path: SHOTS + '/v-decisive-360-isMobile.png' });
await ctx.close();

// ---------------- B. NON-mobile @360, overlay suppressed (does the doc scroll?) ----------------
ctx = await b.newContext({ viewport: { width: 360, height: 800 } });
p = await ctx.newPage();
await p.goto(BASE + '#debugging/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);
const nm = await p.evaluate(() => {
  const de = document.documentElement;
  window.scrollTo(999, 0); const sx = window.scrollX;
  const nx = document.getElementById('tnnext'); const r = nx.getBoundingClientRect();
  const res = { docSW: de.scrollWidth, docCW: de.clientWidth, innerWidth: window.innerWidth, scrollXAfterScrollTo: sx, tnnextX: +r.x.toFixed(1), tnnextRight: +r.right.toFixed(1) };
  window.scrollTo(0, 0);
  return res;
});
console.log('\n=== B. NON-mobile @360, overlay suppressed ===');
console.log(JSON.stringify(nm, null, 1));
out.nonMobile = nm;
let nmClick;
try { await p.locator('#tnnext').click({ timeout: 4000 }); await p.waitForTimeout(300); nmClick = { ok: true, hash: await p.evaluate(() => location.hash) }; }
catch (e) { nmClick = { ok: false, err: e.message.split('\n').slice(0, 3).join(' | ').replace(/\[\d+m/g, '') }; }
console.log('  #tnnext click (non-mobile 360):', JSON.stringify(nmClick));
out.nonMobileClick = nmClick;
await p.screenshot({ path: SHOTS + '/v-decisive-360-nonMobile.png' });
await ctx.close();

// ---------------- C. does the FIX restore clickability? ----------------
ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
p = await ctx.newPage();
await p.goto(BASE + '#debugging/walk', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.addStyleTag({ content: '@media(max-width:900px){ .side-id .topic-nav{min-width:0} }' });
await p.waitForTimeout(300);
const fixed = await p.evaluate(() => {
  const de = document.documentElement; const nx = document.getElementById('tnnext'); const r = nx.getBoundingClientRect();
  const fab = document.getElementById('toolsfab'); const fr = fab.getBoundingClientRect();
  return { docSW: de.scrollWidth, docCW: de.clientWidth, over: de.scrollWidth - de.clientWidth, innerWidth: window.innerWidth, tnnext: { x: +r.x.toFixed(1), right: +r.right.toFixed(1) }, toolsfab: { x: +fr.x.toFixed(1), right: +fr.right.toFixed(1) } };
});
console.log('\n=== C. AFTER FIX (min-width:0) @360 ===');
console.log(JSON.stringify(fixed, null, 1));
const fixClicks = [];
for (const sel of ['#tnnext', '#toolsfab']) {
  const before = await p.evaluate(() => location.hash);
  try { await p.locator(sel).click({ timeout: 4000 }); await p.waitForTimeout(400); const after = await p.evaluate(() => location.hash); fixClicks.push({ sel, ok: true, before, after, changed: before !== after }); }
  catch (e) { fixClicks.push({ sel, ok: false, err: e.message.split('\n')[0] }); }
  // reset state
  await p.evaluate(() => { document.body.classList.remove('tools-open'); location.hash = '#debugging/walk'; });
  await p.waitForTimeout(300);
}
fixClicks.forEach(c => console.log(`  ${c.ok ? 'OK  ' : 'FAIL'} ${c.sel} ${c.ok ? `${c.before} -> ${c.after} changed=${c.changed}` : c.err}`));
out.afterFix = { fixed, fixClicks };
await p.screenshot({ path: SHOTS + '/v-decisive-360-AFTERFIX.png' });

// full-page shot (shows what is beyond the visible edge)
await p.evaluate(() => { location.hash = '#debugging/walk'; });
await ctx.close();

// ---------------- D. all-46 tnnext + toolsfab reachability, real state ----------------
ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
p = await ctx.newPage();
await p.goto(BASE + '#debugging/walk', { waitUntil: 'load' });
await p.waitForTimeout(700);
const topics = await p.evaluate(() => { const o = []; document.querySelectorAll('[data-topic]').forEach(e => { const v = e.getAttribute('data-topic'); if (v && !o.includes(v)) o.push(v); }); return o; });
const reach = [];
for (const t of topics) {
  await p.goto(BASE + '#' + t + '/walk', { waitUntil: 'load' });
  await p.waitForTimeout(110);
  const m = await p.evaluate(() => {
    const de = document.documentElement; const CW = de.clientWidth;
    const nx = document.getElementById('tnnext').getBoundingClientRect();
    const fab = document.getElementById('toolsfab').getBoundingClientRect();
    return { cw: CW, sw: de.scrollWidth, nxX: +nx.x.toFixed(1), nxRight: +nx.right.toFixed(1), fabX: +fab.x.toFixed(1), fabRight: +fab.right.toFixed(1) };
  });
  reach.push({
    topic: t, over: m.sw - m.cw, ...m,
    tnnextVisiblePx: +Math.max(0, Math.min(m.nxRight, m.cw) - m.nxX).toFixed(1),
    tnnextFullyHidden: m.nxX >= m.cw,
    fabVisiblePx: +Math.max(0, Math.min(m.fabRight, m.cw) - m.fabX).toFixed(1),
    fabFullyHidden: m.fabX >= m.cw
  });
}
const nxHidden = reach.filter(r => r.tnnextFullyHidden);
const nxPartial = reach.filter(r => !r.tnnextFullyHidden && r.tnnextVisiblePx < 44);
const fabHidden = reach.filter(r => r.fabFullyHidden);
const fabPartial = reach.filter(r => !r.fabFullyHidden && r.fabVisiblePx < 20);
console.log('\n=== D. REACHABILITY within the 360px VISIBLE viewport (clientWidth), 46 topics ===');
console.log('  #tnnext  FULLY outside visible viewport :', nxHidden.length, '/', reach.length);
console.log('  #tnnext  partially clipped (<44px shown):', nxPartial.length);
console.log('  #tnnext  fully usable (>=44px)          :', reach.filter(r => r.tnnextVisiblePx >= 44).length);
console.log('  #toolsfab FULLY outside visible viewport:', fabHidden.length, '/', reach.length);
console.log('  #toolsfab partially clipped             :', fabPartial.length);
console.log('  sample tnnext hidden:', JSON.stringify(nxHidden.slice(0, 5).map(r => ({ t: r.topic, x: r.nxX, cw: r.cw, over: r.over }))));
console.log('  sample fab hidden   :', JSON.stringify(fabHidden.slice(0, 5).map(r => ({ t: r.topic, x: r.fabX, cw: r.cw }))));
out.reach = { summary: { nxHidden: nxHidden.length, nxPartial: nxPartial.length, nxOk: reach.filter(r => r.tnnextVisiblePx >= 44).length, fabHidden: fabHidden.length, fabPartial: fabPartial.length, total: reach.length }, rows: reach };
await ctx.close();

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v5-decisive.json', JSON.stringify(out, null, 1));
await b.close();
