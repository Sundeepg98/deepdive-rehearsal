import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const out = {};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

// ---- pick the WORST topic (debugging) : max overflow, tnnext furthest out ----
await p.evaluate(() => { location.hash = '#debugging/walk'; });
await p.waitForTimeout(500);

const g0 = await p.evaluate(() => {
  const nx = document.getElementById('tnnext');
  const r = nx.getBoundingClientRect();
  const de = document.documentElement;
  return {
    tnnext: { x: +r.x.toFixed(1), right: +r.right.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
    docSW: de.scrollWidth, docCW: de.clientWidth, over: de.scrollWidth - de.clientWidth,
    scrollX: window.scrollX, innerWidth: window.innerWidth,
    htmlOvfX: getComputedStyle(de).overflowX, bodyOvfX: getComputedStyle(document.body).overflowX,
    appOvfX: getComputedStyle(document.querySelector('.app')).overflowX,
    sidebarOvfX: getComputedStyle(document.querySelector('.sidebar')).overflowX,
    sideIdOvfX: getComputedStyle(document.querySelector('.side-id')).overflowX
  };
});
console.log('=== #debugging/walk @360 BEFORE any scroll ===');
console.log(JSON.stringify(g0, null, 1));
out.before = g0;

// ---- CAN the document scroll horizontally? try every way ----
const scrollTests = await p.evaluate(() => {
  const r = {};
  window.scrollTo(999, 0);  r.afterWindowScrollTo = window.scrollX;
  window.scrollTo(0, 0);
  document.documentElement.scrollLeft = 999; r.afterDocElScrollLeft = window.scrollX; r.docElScrollLeftVal = document.documentElement.scrollLeft;
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 999; r.afterBodyScrollLeft = window.scrollX; r.bodyScrollLeftVal = document.body.scrollLeft;
  document.body.scrollLeft = 0;
  if (document.scrollingElement) { document.scrollingElement.scrollLeft = 999; r.afterScrollingElement = window.scrollX; document.scrollingElement.scrollLeft = 0; }
  r.scrollingElementTag = document.scrollingElement ? document.scrollingElement.tagName : null;
  return r;
});
console.log('\n=== HORIZONTAL SCROLL ATTEMPTS ===');
console.log(JSON.stringify(scrollTests, null, 1));
out.scrollTests = scrollTests;

// ---- scrollIntoView (what Playwright itself uses) ----
const sivResult = await p.evaluate(() => {
  const nx = document.getElementById('tnnext');
  nx.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = nx.getBoundingClientRect();
  return { scrollX: window.scrollX, x: +r.x.toFixed(1), right: +r.right.toFixed(1) };
});
console.log('\n=== after el.scrollIntoView() ===', JSON.stringify(sivResult));
out.scrollIntoView = sivResult;
await p.evaluate(() => window.scrollTo(0, 0));

// ---- THE REAL TEST: an actual Playwright click with a short timeout ----
let clickResult, clickErr = null;
const topicBefore = await p.evaluate(() => location.hash);
const t0 = Date.now();
try {
  await p.locator('#tnnext').click({ timeout: 5000 });
  clickResult = 'CLICK SUCCEEDED in ' + (Date.now() - t0) + 'ms';
} catch (e) {
  clickErr = e.message.split('\n')[0];
  clickResult = 'CLICK FAILED after ' + (Date.now() - t0) + 'ms';
}
await p.waitForTimeout(400);
const topicAfter = await p.evaluate(() => location.hash);
console.log('\n=== REAL PLAYWRIGHT CLICK ON #tnnext ===');
console.log(clickResult, clickErr ? ('| err: ' + clickErr) : '');
console.log('hash before:', topicBefore, '-> after:', topicAfter, topicBefore !== topicAfter ? '(NAVIGATED)' : '(NO NAV)');
out.realClick = { clickResult, clickErr, topicBefore, topicAfter, navigated: topicBefore !== topicAfter };

const afterClickScroll = await p.evaluate(() => ({ scrollX: window.scrollX }));
console.log('scrollX after click attempt:', afterClickScroll.scrollX);
out.afterClickScroll = afterClickScroll;

// ---- a real TAP (touch) at the tnnext coordinates, no auto-scroll ----
await p.evaluate(() => { location.hash = '#debugging/walk'; window.scrollTo(0, 0); });
await p.waitForTimeout(400);
const tapProbe = await p.evaluate(() => {
  const nx = document.getElementById('tnnext');
  const r = nx.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const hit = document.elementFromPoint(Math.min(cx, window.innerWidth - 1), cy);
  const hitAtRealCenter = (cx < window.innerWidth) ? document.elementFromPoint(cx, cy) : 'CENTER IS OUTSIDE VIEWPORT (x=' + cx.toFixed(1) + ' vs innerWidth=' + window.innerWidth + ')';
  return {
    centerX: +cx.toFixed(1), centerY: +cy.toFixed(1), innerWidth: window.innerWidth,
    centerInsideViewport: cx < window.innerWidth,
    visiblePx: Math.max(0, Math.min(r.right, window.innerWidth) - r.x),
    elementFromPointAtClampedX: hit ? (hit.id || hit.className || hit.tagName) : null,
    elementFromPointAtRealCenter: typeof hitAtRealCenter === 'string' ? hitAtRealCenter : (hitAtRealCenter.id || hitAtRealCenter.tagName)
  };
});
console.log('\n=== TAP REACHABILITY (elementFromPoint) ===');
console.log(JSON.stringify(tapProbe, null, 1));
out.tapProbe = tapProbe;

await p.screenshot({ path: SHOTS + '/v-tnnext-debugging-360.png' });

// ---- how many topics have tnnext FULLY off-screen at 360? ----
const topics = await p.evaluate(() => window.TOPICS ? window.TOPICS.map(t => t.slug || t.id) : []);
const tnrows = [];
for (const t of topics) {
  await p.evaluate(t => { location.hash = '#' + t + '/walk'; window.scrollTo(0, 0); }, t);
  await p.waitForTimeout(70);
  const m = await p.evaluate(() => {
    const nx = document.getElementById('tnnext'); const r = nx.getBoundingClientRect();
    const de = document.documentElement;
    return { x: +r.x.toFixed(1), right: +r.right.toFixed(1), iw: window.innerWidth, sw: de.scrollWidth, cw: de.clientWidth };
  });
  const visible = Math.max(0, Math.min(m.right, m.iw) - m.x);
  const centerX = m.x + (m.right - m.x) / 2;
  tnrows.push({ topic: t, ...m, visiblePx: +visible.toFixed(1), fullyOff: m.x >= m.iw, centerOff: centerX >= m.iw, over: m.sw - m.cw });
}
const fullyOff = tnrows.filter(r => r.fullyOff);
const centerOff = tnrows.filter(r => r.centerOff);
const partial = tnrows.filter(r => !r.fullyOff && r.visiblePx < 44);
console.log('\n=== #tnnext REACHABILITY @360 across 46 topics ===');
console.log('fully off-screen (x >= 360):', fullyOff.length, '/', tnrows.length);
console.log('center point off-screen   :', centerOff.length, '/', tnrows.length);
console.log('partially clipped (<44px visible, but some visible):', partial.length);
console.log('fully visible (44px):', tnrows.filter(r => r.visiblePx >= 44).length);
console.log('sample fully-off:', JSON.stringify(fullyOff.slice(0, 4).map(r => ({ t: r.topic, x: r.x, vis: r.visiblePx }))));
console.log('sample partial :', JSON.stringify(partial.slice(0, 4).map(r => ({ t: r.topic, x: r.x, vis: r.visiblePx }))));
out.tnrows = tnrows;
out.summary360 = { fullyOff: fullyOff.length, centerOff: centerOff.length, partial: partial.length, fullyVisible: tnrows.filter(r => r.visiblePx >= 44).length, total: tnrows.length };

// ---- VERIFY THE PROPOSED FIX: min-width:0 on .side-id .topic-nav ----
const fixRows = [];
for (const w of [320, 360, 390, 414, 430]) {
  const c2 = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true });
  const p2 = await c2.newPage();
  await p2.goto(URL, { waitUntil: 'load' });
  await p2.waitForTimeout(600);
  await p2.addStyleTag({ content: '@media(max-width:900px){ .side-id .topic-nav{min-width:0} }' });
  await p2.waitForTimeout(200);
  const worst = [];
  for (const t of topics) {
    await p2.evaluate(t => { location.hash = '#' + t + '/walk'; }, t);
    await p2.waitForTimeout(60);
    const m = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    worst.push(m.sw - m.cw);
  }
  fixRows.push({ vp: w, maxOverAfterFix: Math.max(...worst), overflowingAfterFix: worst.filter(x => x > 0).length });
  await c2.close();
}
console.log('\n=== FIX VERIFICATION: min-width:0 on .side-id .topic-nav ===');
console.table(fixRows);
out.fixRows = fixRows;

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v2-tnnext.json', JSON.stringify(out, null, 1));
await b.close();
