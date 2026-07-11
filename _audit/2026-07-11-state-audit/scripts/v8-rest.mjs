import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const out = {};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(BASE + '#api-design/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);

// =========== F3: MOCKBAR closed-state ===========
const mb = await p.evaluate(() => {
  const m = document.querySelector('.sidebar .mockbar') || document.querySelector('.mockbar');
  const cs = getComputedStyle(m);
  const r = m.getBoundingClientRect();
  const btns = [...m.querySelectorAll('button')];
  return {
    display: cs.display, visibility: cs.visibility, transform: cs.transform, position: cs.position,
    top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1),
    viewportH: window.innerHeight, docClientH: document.documentElement.clientHeight,
    ariaHidden: m.getAttribute('aria-hidden'), inert: m.hasAttribute('inert'), inertProp: m.inert === true,
    hiddenAttr: m.hasAttribute('hidden'),
    bodyHasToolsOpen: document.body.classList.contains('tools-open'),
    btnCount: btns.length,
    btnIds: btns.map(x => x.id || x.className).slice(0, 20),
    // are they actually focusable?
    tabbable: btns.filter(x => x.tabIndex >= 0 && !x.disabled).length
  };
});
console.log('=== F3: MOCKBAR CLOSED STATE @390x844 ===');
console.log(JSON.stringify(mb, null, 1));
out.mockbar = mb;

// Tab trail from page load
await p.goto(BASE + '#api-design/walk', { waitUntil: 'load' });
await p.waitForTimeout(800);
const trail = [];
for (let i = 1; i <= 14; i++) {
  await p.keyboard.press('Tab');
  await p.waitForTimeout(60);
  const f = await p.evaluate(() => {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    if (!a || a === document.body) return { el: 'BODY' };
    const r = a.getBoundingClientRect();
    const inMockbar = !!(a.closest && a.closest('.mockbar'));
    return {
      el: (a.id ? '#' + a.id : a.tagName + (a.className && typeof a.className === 'string' ? '.' + a.className.split(' ')[0] : '')),
      txt: (a.textContent || '').trim().slice(0, 22),
      top: +r.top.toFixed(0), left: +r.left.toFixed(0),
      inMockbar,
      offscreen: r.top >= window.innerHeight || r.bottom <= 0 || r.left >= document.documentElement.clientWidth
    };
  });
  trail.push({ tab: i, ...f });
}
console.log('\n=== TAB TRAIL FROM PAGE LOAD (viewport h=844) ===');
trail.forEach(t => console.log(`  Tab#${String(t.tab).padStart(2)} ${String(t.el).padEnd(24)} top=${String(t.top).padStart(5)} left=${String(t.left).padStart(4)} inMockbar=${t.inMockbar ? 'YES <<<<' : 'no'} offscreen=${t.offscreen}`));
const firstMockbarTab = trail.find(t => t.inMockbar);
console.log('  => first Tab that lands INSIDE the closed mockbar:', firstMockbarTab ? `#${firstMockbarTab.tab} (${firstMockbarTab.el}) at top=${firstMockbarTab.top} vs viewportH=844` : 'NONE');
out.tabTrail = trail; out.firstMockbarTab = firstMockbarTab || null;
await p.screenshot({ path: SHOTS + '/v-mockbar-focus.png' });

// =========== F4: SEG active-tab scroll -- CLICK vs KEYBOARD vs DEEPLINK vs SWIPE ===========
const c2 = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const p2 = await c2.newPage();
const segCheck = async (label, action) => {
  await p2.goto(BASE + '#content-pipeline/walk', { waitUntil: 'load' });
  await p2.waitForTimeout(700);
  await action(p2);
  await p2.waitForTimeout(900); // allow smooth scroll
  return await p2.evaluate(() => {
    const strip = document.querySelector('.sidebar .seg');
    const active = strip.querySelector('button.on');
    const sr = strip.getBoundingClientRect(), ar = active.getBoundingClientRect();
    const visible = ar.left >= sr.left - 1 && ar.right <= sr.right + 1;
    return {
      activeTab: active.getAttribute('data-tab'),
      scrollLeft: +strip.scrollLeft.toFixed(1), scrollWidth: strip.scrollWidth, clientWidth: strip.clientWidth,
      maxScroll: strip.scrollWidth - strip.clientWidth,
      activeLeft: +ar.left.toFixed(1), activeRight: +ar.right.toFixed(1),
      stripLeft: +sr.left.toFixed(1), stripRight: +sr.right.toFixed(1),
      activeFullyVisible: visible
    };
  });
};
console.log('\n=== F4: .seg ACTIVE-TAB VISIBILITY BY NAVIGATION PATH (target view = "open", the last tab) ===');
const segResults = {};
segResults.click = await segCheck('click', async pg => { await pg.locator('.sidebar .seg button[data-tab="open"]').click({ timeout: 6000 }).catch(e => console.log('   (click err: ' + e.message.split('\n')[0] + ')')); });
segResults.keyboard = await segCheck('keyboard', async pg => { await pg.keyboard.press('o'); });
segResults.deeplink = await (async () => { await p2.goto(BASE + '#content-pipeline/open', { waitUntil: 'load' }); await p2.waitForTimeout(1100); return p2.evaluate(() => { const s = document.querySelector('.sidebar .seg'); const a = s.querySelector('button.on'); const sr = s.getBoundingClientRect(), ar = a.getBoundingClientRect(); return { activeTab: a.getAttribute('data-tab'), scrollLeft: +s.scrollLeft.toFixed(1), scrollWidth: s.scrollWidth, clientWidth: s.clientWidth, maxScroll: s.scrollWidth - s.clientWidth, activeLeft: +ar.left.toFixed(1), activeRight: +ar.right.toFixed(1), stripLeft: +sr.left.toFixed(1), stripRight: +sr.right.toFixed(1), activeFullyVisible: ar.left >= sr.left - 1 && ar.right <= sr.right + 1 }; }); })();
segResults.router = await segCheck('router', async pg => { await pg.evaluate(() => { if (window.Router) window.Router.navigate('open'); }); });
for (const k in segResults) {
  const v = segResults[k];
  console.log(`  ${k.padEnd(9)} activeTab=${String(v.activeTab).padEnd(6)} scrollLeft=${String(v.scrollLeft).padStart(6)}/${v.maxScroll}  activeRect=[${v.activeLeft}..${v.activeRight}] strip=[${v.stripLeft}..${v.stripRight}]  ACTIVE VISIBLE=${v.activeFullyVisible ? 'YES' : 'NO  <<<<'}`);
}
out.seg = segResults;
await p2.screenshot({ path: SHOTS + '/v-seg-deeplink-open-360.png' });

// keyboard for all 9 views
console.log('\n  keyboard path, each view:');
const KEYS = { walk: 'w', drill: 'q', wb: 'e', sys: 'r', trade: 't', model: 'y', num: 'u', rf: 'i', open: 'o' };
const kb = [];
for (const [view, key] of Object.entries(KEYS)) {
  await p2.goto(BASE + '#content-pipeline/walk', { waitUntil: 'load' });
  await p2.waitForTimeout(500);
  await p2.keyboard.press(key);
  await p2.waitForTimeout(700);
  const r = await p2.evaluate(() => { const s = document.querySelector('.sidebar .seg'); const a = s.querySelector('button.on'); if (!a) return null; const sr = s.getBoundingClientRect(), ar = a.getBoundingClientRect(); return { tab: a.getAttribute('data-tab'), sl: +s.scrollLeft.toFixed(0), vis: ar.left >= sr.left - 1 && ar.right <= sr.right + 1 }; });
  kb.push({ view, key, ...r });
}
kb.forEach(r => console.log(`    ${r.key} -> ${String(r.tab).padEnd(6)} scrollLeft=${String(r.sl).padStart(4)} visible=${r.vis ? 'YES' : 'NO'}`));
out.segKeyboard = kb;
console.log('  keyboard: views with active tab OFF-SCREEN:', kb.filter(r => !r.vis).length, '/', kb.length);

// click path for all 9
console.log('\n  CLICK path, each view:');
const cl = [];
for (const view of Object.keys(KEYS)) {
  await p2.goto(BASE + '#content-pipeline/walk', { waitUntil: 'load' });
  await p2.waitForTimeout(500);
  try { await p2.locator(`.sidebar .seg button[data-tab="${view}"]`).click({ timeout: 5000 }); } catch (e) { cl.push({ view, err: 'CLICK FAILED' }); continue; }
  await p2.waitForTimeout(800);
  const r = await p2.evaluate(() => { const s = document.querySelector('.sidebar .seg'); const a = s.querySelector('button.on'); if (!a) return null; const sr = s.getBoundingClientRect(), ar = a.getBoundingClientRect(); return { tab: a.getAttribute('data-tab'), sl: +s.scrollLeft.toFixed(0), vis: ar.left >= sr.left - 1 && ar.right <= sr.right + 1 }; });
  cl.push({ view, ...r });
}
cl.forEach(r => console.log(`    click ${String(r.view).padEnd(6)} -> tab=${String(r.tab).padEnd(6)} scrollLeft=${String(r.sl).padStart(4)} visible=${r.vis === undefined ? r.err : (r.vis ? 'YES' : 'NO')}`));
out.segClick = cl;
console.log('  click: views with active tab OFF-SCREEN:', cl.filter(r => r.vis === false).length, '/', cl.length);
await c2.close();

// =========== F5 + F7: tap targets & font sizes ===========
const c3 = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const p3 = await c3.newPage();
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const ctrls = new Map(), fonts = new Map();
for (const pane of PANES) {
  await p3.goto(BASE + '#api-design/' + pane, { waitUntil: 'load' });
  await p3.waitForTimeout(400);
  const r = await p3.evaluate(() => {
    const acc = [];
    const walk = n => { for (const c of (n.children || [])) { acc.push(c); if (c.shadowRoot) walk(c.shadowRoot); walk(c); } };
    walk(document.body);
    const small = [], tiny = [];
    for (const e of acc) {
      const rect = e.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // exclude anything inside the closed mockbar / closed overlays
      if (e.closest && e.closest('.mockbar') && !document.body.classList.contains('tools-open')) continue;
      const isCtl = e.matches('button, a[href], [role="button"], input, summary, select');
      if (isCtl && (rect.width < 44 || rect.height < 44)) {
        const key = (e.id ? '#' + e.id : (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName));
        small.push({ key, w: +rect.width.toFixed(1), h: +rect.height.toFixed(1), txt: (e.textContent || '').trim().slice(0, 18) });
      }
      const fs = parseFloat(cs.fontSize);
      const hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (hasText && fs < 12) {
        const key = (e.id ? '#' + e.id : (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : e.tagName));
        tiny.push({ key, fs, tt: cs.textTransform, chars: e.textContent.trim().length, txt: e.textContent.trim().slice(0, 45) });
      }
    }
    return { small, tiny };
  });
  for (const s of r.small) { const k = s.key + '|' + s.w + 'x' + s.h; if (!ctrls.has(k)) ctrls.set(k, { ...s, panes: [] }); ctrls.get(k).panes.push(pane); }
  for (const t of r.tiny) { const k = t.key + '|' + t.fs; if (!fonts.has(k)) fonts.set(k, { ...t, panes: [], maxChars: 0 }); const f = fonts.get(k); f.panes.push(pane); f.maxChars = Math.max(f.maxChars, t.chars); }
}
const ctrlArr = [...ctrls.values()].sort((a, b) => (a.w * a.h) - (b.w * b.h));
const fontArr = [...fonts.values()].sort((a, b) => a.fs - b.fs);
console.log('\n=== F5: CONTROLS UNDER 44x44 @360 (closed mockbar excluded) ===');
console.log('  distinct undersized controls:', ctrlArr.length);
ctrlArr.slice(0, 18).forEach(c => console.log(`    ${c.key.padEnd(20)} ${String(c.w).padStart(6)}x${String(c.h).padEnd(5)} "${c.txt}"  panes=${c.panes.length}`));
out.controls = ctrlArr;
console.log('\n=== F7: TEXT UNDER 12px @360 ===');
console.log('  distinct elements:', fontArr.length);
fontArr.slice(0, 20).forEach(f => console.log(`    ${f.key.padEnd(18)} ${f.fs}px ${f.tt.padEnd(10)} maxChars=${String(f.maxChars).padStart(3)} "${f.txt}"`));
out.fonts = fontArr;

// #_focus-toggle specifically
const ft = await p3.evaluate(() => { const e = document.getElementById('_focus-toggle'); if (!e) return { missing: true }; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), fontSize: cs.fontSize, padding: cs.padding }; });
console.log('\n  #_focus-toggle:', JSON.stringify(ft), '(lens claimed 60x20, 9px font)');
out.focusToggle = ft;

// .mbeat-l on a model pane
await p3.goto(BASE + '#kafka-internals/model', { waitUntil: 'load' });
await p3.waitForTimeout(500);
const mbeat = await p3.evaluate(() => {
  const pn = document.getElementById('model'); const host = [...pn.querySelectorAll('*')].find(e => e.shadowRoot); if (!host) return [];
  return [...host.shadowRoot.querySelectorAll('.mbeat-l')].map(e => { const cs = getComputedStyle(e); return { cls: e.className, fs: cs.fontSize, tt: cs.textTransform, chars: e.textContent.trim().length, txt: e.textContent.trim().slice(0, 55) }; });
});
console.log('\n  .mbeat-l (kafka-internals/model):');
mbeat.forEach(m => console.log(`    ${m.cls.padEnd(20)} ${m.fs} ${m.tt} chars=${String(m.chars).padStart(3)} "${m.txt}"`));
out.mbeat = mbeat;
await c3.close();

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v8-rest.json', JSON.stringify(out, null, 1));
await b.close();
