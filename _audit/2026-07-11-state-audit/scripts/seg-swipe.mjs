import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`${URL}#content-pipeline/walk`, { waitUntil: 'load' });
await p.waitForTimeout(1000);

const read = () => p.evaluate(() => {
  const s = document.querySelector('.sidebar .seg');
  const on = s.querySelector('button.on');
  const sb = s.getBoundingClientRect(), ob = on.getBoundingClientRect();
  return {
    tab: on.dataset.tab,
    scrollLeft: Math.round(s.scrollLeft), maxScroll: s.scrollWidth - s.clientWidth,
    activeVisible: ob.left >= sb.left - 1 && ob.right <= sb.right + 1,
    x: `${Math.round(ob.left)}..${Math.round(ob.right)}`, stripRight: Math.round(sb.right)
  };
});

console.log('Does the .seg strip scroll the ACTIVE tab into view on each navigation path?\n');
console.log('start:', JSON.stringify(await read()));

// --- path 1: keyboard shortcut (Q..O switch tabs; per index.html kbd-hint "Q-O tabs") ---
console.log('\n--- path 1: KEYBOARD (tab shortcut keys) ---');
for (const key of ['w', 'e', 'r', 't', 'y', 'u', 'i', 'o']) {
  await p.keyboard.press(key);
  await p.waitForTimeout(320);
  const r = await read();
  console.log(`  key "${key}" -> tab=${r.tab.padEnd(6)} activeTabVisible=${String(r.activeVisible).padEnd(5)} segScrollLeft=${r.scrollLeft}/${r.maxScroll} tabX=${r.x} (stripRight=${r.stripRight})`);
}
await p.screenshot({ path: `${S}/seg-active-tab-offscreen-360.png` });

// --- path 2: touch swipe between panes ---
console.log('\n--- path 2: SWIPE (touch-swipe.js) ---');
await p.goto(`${URL}#content-pipeline/walk`, { waitUntil: 'load' });
await p.waitForTimeout(900);
for (let i = 0; i < 6; i++) {
  // swipe right-to-left over the stage => next pane
  const box = await p.locator('main.stage').boundingBox();
  const y = Math.min(box.y + 200, 500);
  await p.touchscreen.tap(320, y).catch(() => { });
  await p.evaluate(({ y }) => {
    const t = (type, x) => {
      const el = document.querySelector('main.stage');
      const touch = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [touch], changedTouches: [touch], targetTouches: type === 'touchend' ? [] : [touch], bubbles: true, cancelable: true }));
    };
    t('touchstart', 320); t('touchmove', 200); t('touchmove', 80); t('touchend', 80);
  }, { y });
  await p.waitForTimeout(450);
  const r = await read();
  console.log(`  swipe ${i + 1} -> tab=${r.tab.padEnd(6)} activeTabVisible=${String(r.activeVisible).padEnd(5)} segScrollLeft=${r.scrollLeft}/${r.maxScroll} tabX=${r.x}`);
}

// --- does ANY code scroll the seg? ---
const hasScrollIntoView = await p.evaluate(() => {
  const s = document.querySelector('.sidebar .seg');
  return { segScrollLeftNow: s.scrollLeft, canScroll: s.scrollWidth > s.clientWidth, maxScroll: s.scrollWidth - s.clientWidth };
});
console.log('\nseg strip state:', JSON.stringify(hasScrollIntoView));
await b.close();
