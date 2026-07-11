import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.click('.ix-x').catch(() => {});
await p.waitForTimeout(400);
await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0, 0); });
await p.waitForTimeout(500);

async function swipe(dir) {
  return p.evaluate((d) => {
    const el = document.querySelector('.stage');
    const xs = d === 'left' ? [330, 280, 180, 90] : [60, 120, 240, 330];
    function t(type, x) {
      // screenX/screenY are what touch-swipe.js reads
      const touch = new Touch({ identifier: 7, target: el, clientX: x, clientY: 500, pageX: x, pageY: 500, screenX: x, screenY: 500 });
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true,
        touches: type === 'touchend' ? [] : [touch], targetTouches: type === 'touchend' ? [] : [touch], changedTouches: [touch] }));
    }
    t('touchstart', xs[0]); t('touchmove', xs[1]); t('touchmove', xs[2]); t('touchend', xs[3]);
    return location.hash;
  }, dir);
}

const before = await p.evaluate(() => location.hash);
await swipe('left');
await p.waitForTimeout(900);
const afterL = await p.evaluate(() => location.hash);
console.log(`swipe LEFT : ${before} -> ${afterL}  ${before !== afterL ? 'WORKS' : 'NO CHANGE'}`);

// mid-gesture hint check
await p.evaluate(() => {
  const el = document.querySelector('.stage');
  function t(type, x) { const touch = new Touch({ identifier: 8, target: el, clientX: x, clientY: 500, pageX: x, pageY: 500, screenX: x, screenY: 500 });
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true,
      touches: type === 'touchend' ? [] : [touch], targetTouches: type === 'touchend' ? [] : [touch], changedTouches: [touch] })); }
  t('touchstart', 330); t('touchmove', 250); t('touchmove', 200);
});
await p.waitForTimeout(400);
const hint = await p.evaluate(() => { const h = document.getElementById('_swipe-hint'); if (!h) return null;
  const r = h.getBoundingClientRect(); const cs = getComputedStyle(h);
  return { txt: h.textContent, opacity: cs.opacity, x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0), fs: cs.fontSize }; });
console.log('mid-swipe hint:', JSON.stringify(hint));
await p.screenshot({ path: `${SHOTS}/swipe-hint-mid-gesture.png` });

await swipe('right');
await p.waitForTimeout(900);
const afterR = await p.evaluate(() => location.hash);
console.log(`swipe RIGHT: ${afterL} -> ${afterR}  ${afterL !== afterR ? 'WORKS' : 'NO CHANGE'}`);

// After a swipe, does the top tab strip scroll the active tab into view?
await p.evaluate(() => { location.hash = '#trade'; document.querySelector('.sidebar .seg').scrollLeft = 0; });
await p.waitForTimeout(600);
await swipe('left'); // -> model
await p.waitForTimeout(900);
const segState = await p.evaluate(() => {
  const seg = document.querySelector('.sidebar .seg'); const on = seg.querySelector('button.on');
  const sr = seg.getBoundingClientRect(), br = on.getBoundingClientRect();
  return { hash: location.hash, activeTab: on.textContent.trim().slice(0, 14), segScrollLeft: seg.scrollLeft,
    activeTabVisible: br.left >= sr.left - 1 && br.right <= sr.right + 1, btnLeft: +br.left.toFixed(0), btnRight: +br.right.toFixed(0) };
});
console.log('after swipe, tab strip state:', JSON.stringify(segState));
await p.screenshot({ path: `${SHOTS}/after-swipe-tabstrip.png` });
await b.close();
