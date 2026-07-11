import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const out = {};
const b = await chromium.launch();

// ---------- viewport meta ----------
let ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
let p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
const meta = await p.evaluate(() => {
  const m = document.querySelector('meta[name="viewport"]');
  return { content: m ? m.getAttribute('content') : 'NO VIEWPORT META' };
});
console.log('=== VIEWPORT META ===', JSON.stringify(meta));
out.meta = meta;

await p.evaluate(() => { location.hash = '#debugging/walk'; window.scrollTo(0, 0); });
await p.waitForTimeout(500);

// ---------- probe _index-overlay ----------
const ov = await p.evaluate(() => {
  const el = document.getElementById('_index-overlay');
  if (!el) return { missing: true };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    id: el.id, cls: el.className, tag: el.tagName,
    rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
    display: cs.display, visibility: cs.visibility, opacity: cs.opacity, position: cs.position,
    zIndex: cs.zIndex, pointerEvents: cs.pointerEvents, inset: `${cs.top}/${cs.right}/${cs.bottom}/${cs.left}`,
    background: cs.backgroundColor, hidden: el.hasAttribute('hidden'), ariaHidden: el.getAttribute('aria-hidden'),
    childCount: el.children.length, inlineStyle: el.getAttribute('style')
  };
});
console.log('\n=== _index-overlay ===');
console.log(JSON.stringify(ov, null, 1));
out.indexOverlay = ov;

// ---------- what is at various points? ----------
const hits = await p.evaluate(() => {
  const pts = [[30, 30], [180, 100], [30, 221], [180, 221], [340, 221], [357, 221], [500, 221], [557, 221], [180, 400], [180, 700]];
  return pts.map(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    return { pt: `${x},${y}`, el: e ? (e.id ? '#' + e.id : (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName)) : 'NULL' };
  });
});
console.log('\n=== elementFromPoint SWEEP (innerWidth=' + await p.evaluate(() => window.innerWidth) + ') ===');
hits.forEach(h => console.log(' ', h.pt.padEnd(9), '->', h.el));
out.hits = hits;

// ---------- FULL playwright error for #tnnext ----------
async function tryClick(sel) {
  const before = await p.evaluate(() => location.hash);
  const t0 = Date.now();
  try {
    await p.locator(sel).click({ timeout: 4000 });
    await p.waitForTimeout(300);
    const after = await p.evaluate(() => location.hash);
    return { sel, ok: true, ms: Date.now() - t0, before, after, navigated: before !== after };
  } catch (e) {
    return { sel, ok: false, ms: Date.now() - t0, err: e.message.split('\n').slice(0, 8).join(' | ') };
  }
}
console.log('\n=== REAL CLICK ATTEMPTS @360 on #debugging (overflowing topic) ===');
const clickTargets = ['#tnnext', '#tnprev', '#tntrigger', '#toolsfab', '.sidebar .seg button[data-tab="drill"]', '#homeBtn'];
const clicks = [];
for (const sel of clickTargets) {
  await p.evaluate(() => { location.hash = '#debugging/walk'; window.scrollTo(0, 0); });
  await p.waitForTimeout(250);
  const r = await tryClick(sel);
  clicks.push(r);
  console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${sel.padEnd(38)} ${r.ok ? `${r.ms}ms nav=${r.navigated} (${r.before}->${r.after})` : r.err}`);
}
out.clicks = clicks;

// ---------- same clicks at DESKTOP (control) ----------
await ctx.close();
ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
console.log('\n=== CONTROL: same clicks @1440 desktop ===');
const deskClicks = [];
for (const sel of ['#tnnext', '#tnprev']) {
  await p.evaluate(() => { location.hash = '#debugging/walk'; });
  await p.waitForTimeout(250);
  const before = await p.evaluate(() => location.hash);
  const t0 = Date.now();
  let r;
  try { await p.locator(sel).click({ timeout: 4000 }); await p.waitForTimeout(250); const after = await p.evaluate(() => location.hash); r = { sel, ok: true, ms: Date.now() - t0, before, after, navigated: before !== after }; }
  catch (e) { r = { sel, ok: false, ms: Date.now() - t0, err: e.message.split('\n').slice(0, 6).join(' | ') }; }
  deskClicks.push(r);
  console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${sel.padEnd(12)} ${r.ok ? `nav=${r.navigated} (${r.before}->${r.after})` : r.err}`);
}
out.deskClicks = deskClicks;
await ctx.close();

// ---------- NON-mobile-emulation control at 360 (isMobile:false) ----------
ctx = await b.newContext({ viewport: { width: 360, height: 800 } }); // no isMobile
p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => { location.hash = '#debugging/walk'; });
await p.waitForTimeout(400);
const noMobile = await p.evaluate(() => {
  const de = document.documentElement;
  const nx = document.getElementById('tnnext'); const r = nx.getBoundingClientRect();
  return { innerWidth: window.innerWidth, docSW: de.scrollWidth, docCW: de.clientWidth, nxX: +r.x.toFixed(1), nxRight: +r.right.toFixed(1) };
});
const scrollAble = await p.evaluate(() => { window.scrollTo(999, 0); const sx = window.scrollX; window.scrollTo(0, 0); return sx; });
let nmClick;
try { await p.locator('#tnnext').click({ timeout: 4000 }); await p.waitForTimeout(250); nmClick = { ok: true, hash: await p.evaluate(() => location.hash) }; }
catch (e) { nmClick = { ok: false, err: e.message.split('\n').slice(0, 6).join(' | ') }; }
console.log('\n=== CONTROL: 360px WITHOUT isMobile emulation (desktop-narrow) ===');
console.log(JSON.stringify(noMobile), '| scrollX after scrollTo(999,0):', scrollAble, '| click:', JSON.stringify(nmClick));
out.noMobile = { ...noMobile, scrollXAfter: scrollAble, click: nmClick };
await ctx.close();

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v3-clickcause.json', JSON.stringify(out, null, 1));
await b.close();
