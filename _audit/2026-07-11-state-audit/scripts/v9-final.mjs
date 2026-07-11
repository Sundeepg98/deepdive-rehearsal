import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const out = {};
const b = await chromium.launch();

// ============ 1. LONG tab trail: does focus EVER enter the closed mockbar? ============
const c1 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p1 = await c1.newPage();
await p1.goto(BASE + '#api-design/walk', { waitUntil: 'load' });
await p1.waitForTimeout(900);
const longTrail = [];
let hitMockbar = null;
for (let i = 1; i <= 60; i++) {
  await p1.keyboard.press('Tab');
  await p1.waitForTimeout(35);
  const f = await p1.evaluate(() => {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    if (!a || a === document.body) return { el: 'BODY' };
    const r = a.getBoundingClientRect();
    return {
      el: a.id ? '#' + a.id : a.tagName, inMockbar: !!(a.closest && a.closest('.mockbar')),
      top: +r.top.toFixed(0), viewportH: document.documentElement.clientHeight,
      offscreen: r.top >= document.documentElement.clientHeight
    };
  });
  longTrail.push({ tab: i, ...f });
  if (f.inMockbar && !hitMockbar) { hitMockbar = { tab: i, ...f }; }
}
console.log('=== F3: LONG TAB TRAIL (60 tabs) — does focus enter the CLOSED mockbar? ===');
const mbTabs = longTrail.filter(t => t.inMockbar);
console.log('  tabs landing inside the closed .mockbar:', mbTabs.length);
if (hitMockbar) console.log(`  FIRST: Tab#${hitMockbar.tab} -> ${hitMockbar.el} at top=${hitMockbar.top} (viewport h=${hitMockbar.viewportH}) offscreen=${hitMockbar.offscreen}`);
else console.log('  NONE reached the mockbar in 60 tabs');
console.log('  mockbar tabs:', JSON.stringify(mbTabs.map(t => `#${t.tab}:${t.el}@top${t.top}`)));
out.longTrail = { total: longTrail.length, mockbarTabs: mbTabs, first: hitMockbar, trail: longTrail };
await c1.close();

// ============ 2. SEG: CLEAN deep-link + SWIPE ============
console.log('\n=== F4: .seg active-tab visibility — CLEAN per-path tests (fresh page each) ===');
const segRow = async (label, hash, action) => {
  const c = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const pg = await c.newPage();
  await pg.goto(BASE + hash, { waitUntil: 'load' });
  await pg.waitForTimeout(1000);
  if (action) { await action(pg); await pg.waitForTimeout(1100); }
  const r = await pg.evaluate(() => {
    const s = document.querySelector('.sidebar .seg'); const a = s.querySelector('button.on');
    const sr = s.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return { tab: a.getAttribute('data-tab'), scrollLeft: +s.scrollLeft.toFixed(0), maxScroll: s.scrollWidth - s.clientWidth, activeL: +ar.left.toFixed(0), activeR: +ar.right.toFixed(0), stripR: +sr.right.toFixed(0), visible: ar.left >= sr.left - 1 && ar.right <= sr.right + 1 };
  });
  if (label.includes('deeplink open')) await pg.screenshot({ path: SHOTS + '/v-seg-deeplink-clean.png' });
  await c.close();
  return { label, ...r };
};
const segRows = [];
segRows.push(await segRow('deeplink open  (fresh)', '#content-pipeline/open', null));
segRows.push(await segRow('deeplink rf    (fresh)', '#content-pipeline/rf', null));
segRows.push(await segRow('deeplink num   (fresh)', '#content-pipeline/num', null));
segRows.push(await segRow('click  open    (fresh)', '#content-pipeline/walk', async pg => { await pg.locator('.sidebar .seg button[data-tab="open"]').click({ timeout: 6000 }).catch(() => {}); }));
segRows.push(await segRow('keyboard o     (fresh)', '#content-pipeline/walk', async pg => { await pg.keyboard.press('o'); }));
// real touch swipe (the primary mobile path)
segRows.push(await segRow('SWIPE x4       (fresh)', '#content-pipeline/walk', async pg => {
  for (let i = 0; i < 4; i++) {
    await pg.evaluate(() => {
      const t = document.querySelector('.stage');
      const mk = (type, x, y) => { const tt = new Touch({ identifier: 1, target: t, clientX: x, clientY: y }); t.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [tt], targetTouches: type === 'touchend' ? [] : [tt], changedTouches: [tt], bubbles: true, cancelable: true })); };
      mk('touchstart', 300, 500); mk('touchmove', 200, 500); mk('touchmove', 100, 500); mk('touchend', 100, 500);
    });
    await pg.waitForTimeout(450);
  }
}));
segRows.forEach(r => console.log(`  ${r.label.padEnd(24)} tab=${String(r.tab).padEnd(6)} scrollLeft=${String(r.scrollLeft).padStart(4)}/${r.maxScroll}  active=[${r.activeL}..${r.activeR}] stripRight=${r.stripR}  VISIBLE=${r.visible ? 'YES' : 'NO  <<<<'}`));
out.segClean = segRows;

// ============ 3. COMPILER: the pivot chip source ============
console.log('\n=== F6: compiler — does p.chip really swallow the explanation, leaving p.a empty? ===');
const c3 = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const p3 = await c3.newPage();
await p3.goto(BASE + '#api-design/sys', { waitUntil: 'load' });
await p3.waitForTimeout(700);
const compiled = await p3.evaluate(() => {
  const t = (window.TOPICS && window.TOPICS.find) ? window.TOPICS.find(x => (x.slug || x.id) === 'api-design') : null;
  if (!t) {
    // find the raw topic object however it's exposed
    for (const k of Object.keys(window)) {
      const v = window[k];
      if (v && typeof v === 'object' && v.pivots) return { via: k, pivots: v.pivots };
    }
    return { err: 'topic object not found on window' };
  }
  return { via: 'TOPICS', pivots: t.pivots || t.sys };
});
console.log('  runtime topic object:', JSON.stringify(compiled).slice(0, 400));
out.compiled = compiled;
await c3.close();

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v9-final.json', JSON.stringify(out, null, 1));
await b.close();
