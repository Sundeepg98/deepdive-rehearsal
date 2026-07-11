import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const out = {};
const b = await chromium.launch();

// Load WITH the hash in the URL so __bootHash is set and the first-run index overlay never opens.
const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(BASE + '#debugging/walk', { waitUntil: 'load' });
await p.waitForTimeout(1000);

const state = await p.evaluate(() => {
  const ov = document.getElementById('_index-overlay');
  const de = document.documentElement;
  const nx = document.getElementById('tnnext'); const r = nx.getBoundingClientRect();
  return {
    overlayPresent: !!ov,
    overlayClass: ov ? ov.className : null,
    overlayDisplay: ov ? getComputedStyle(ov).display : null,
    bootHash: window.__bootHash || null,
    docSW: de.scrollWidth, docCW: de.clientWidth, over: de.scrollWidth - de.clientWidth,
    innerWidth: window.innerWidth,
    tnnext: { x: +r.x.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
    elemAtTnnextCenter: (() => { const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const e = document.elementFromPoint(cx, cy); return e ? (e.id || e.className || e.tagName) : 'NULL/OUTSIDE'; })()
  };
});
console.log('=== REAL STATE (overlay suppressed via boot hash) @360, #debugging/walk ===');
console.log(JSON.stringify(state, null, 1));
out.state = state;
await p.screenshot({ path: SHOTS + '/v-real-360-debugging-walk.png' });

// horizontal scroll?
const hs = await p.evaluate(() => { window.scrollTo(999, 0); const sx = window.scrollX; const vv = window.visualViewport ? { w: window.visualViewport.width, scale: window.visualViewport.scale, ox: window.visualViewport.offsetLeft } : null; window.scrollTo(0, 0); return { scrollXAfter: sx, visualViewport: vv }; });
console.log('\n=== horizontal scroll + visualViewport ===', JSON.stringify(hs));
out.hscroll = hs;

// ***** THE DECISIVE TEST: real click on #tnnext with NO overlay *****
console.log('\n=== REAL CLICKS with overlay suppressed @360 ===');
const clicks = [];
for (const sel of ['#tnnext', '#tnprev', '#tntrigger', '#toolsfab', '#homeBtn']) {
  await p.goto(BASE + '#debugging/walk', { waitUntil: 'load' });
  await p.waitForTimeout(700);
  const before = await p.evaluate(() => location.hash);
  const t0 = Date.now();
  let r;
  try {
    await p.locator(sel).click({ timeout: 5000 });
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => location.hash);
    r = { sel, ok: true, ms: Date.now() - t0, before, after, changed: before !== after };
  } catch (e) { r = { sel, ok: false, ms: Date.now() - t0, err: e.message.split('\n').slice(0, 4).join(' | ') }; }
  clicks.push(r);
  console.log(`  ${r.ok ? 'OK  ' : 'FAIL'} ${sel.padEnd(12)} ${r.ok ? `${r.ms}ms  ${r.before} -> ${r.after}  changed=${r.changed}` : r.err}`);
}
out.clicks = clicks;

// ***** a real TOUCH TAP at the on-screen coordinates (no playwright auto-scroll) *****
await p.goto(BASE + '#debugging/walk', { waitUntil: 'load' });
await p.waitForTimeout(700);
const tapInfo = await p.evaluate(() => {
  const nx = document.getElementById('tnnext'); const r = nx.getBoundingClientRect();
  return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, innerWidth: window.innerWidth, hash: location.hash };
});
let tapRes;
try {
  await p.touchscreen.tap(tapInfo.cx, tapInfo.cy);
  await p.waitForTimeout(500);
  tapRes = { ok: true, hashAfter: await p.evaluate(() => location.hash) };
} catch (e) { tapRes = { ok: false, err: e.message.split('\n')[0] }; }
console.log('\n=== REAL TOUCH TAP at tnnext center (' + tapInfo.cx.toFixed(0) + ',' + tapInfo.cy.toFixed(0) + ') innerWidth=' + tapInfo.innerWidth + ' ===');
console.log('  before:', tapInfo.hash, '-> after:', tapRes.hashAfter || tapRes.err, tapRes.hashAfter && tapRes.hashAfter !== tapInfo.hash ? '*** NAVIGATED ***' : '(no nav)');
out.tap = { tapInfo, tapRes };

// ***** overflow sweep with overlay suppressed, all 46 topics x viewports *****
const topicList = await p.evaluate(() => { const o = []; document.querySelectorAll('[data-topic]').forEach(e => { const v = e.getAttribute('data-topic'); if (v && !o.includes(v)) o.push(v); }); return o; });
console.log('\ntopics discovered:', topicList.length);
const vpRes = {};
for (const w of [360, 390, 430]) {
  const c2 = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
  const p2 = await c2.newPage();
  const rows = [];
  for (const t of topicList) {
    await p2.goto(BASE + '#' + t + '/walk', { waitUntil: 'load' });
    await p2.waitForTimeout(120);
    const m = await p2.evaluate(() => {
      const de = document.documentElement; const ov = document.getElementById('_index-overlay');
      const nx = document.getElementById('tnnext'); const r = nx.getBoundingClientRect();
      return { sw: de.scrollWidth, cw: de.clientWidth, iw: window.innerWidth, ovOpen: !!(ov && ov.classList.contains('open')), nxX: +r.x.toFixed(1), nxRight: +r.right.toFixed(1) };
    });
    rows.push({ topic: t, over: m.sw - m.cw, ...m });
  }
  const bad = rows.filter(r => r.over > 0);
  const ovOpenCount = rows.filter(r => r.ovOpen).length;
  vpRes[w] = { total: rows.length, overflowing: bad.length, ovOpenCount, maxOver: Math.max(...rows.map(r => r.over)), tnnextFullyOff: rows.filter(r => r.nxX >= r.iw).length, rows };
  console.log(`  ${w}px: overflowing ${bad.length}/${rows.length} | maxOver +${vpRes[w].maxOver} | indexOverlayOpen in ${ovOpenCount} | tnnext fully outside visual viewport: ${vpRes[w].tnnextFullyOff}`);
  await c2.close();
}
out.vpRes = vpRes;
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v4-real-state.json', JSON.stringify(out, null, 1));
await b.close();
