import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const out = [];
const L = (...a) => { const s = a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : x).join(' '); console.log(s); out.push(s); };
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
p.on('pageerror', e => L('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.click('.ix-x').catch(() => {});
await p.waitForTimeout(400);

// shared shadow-piercing helper injected into the page
await p.addInitScript(() => {});
const HELPER = `
  window.__all = function (sel, root) {
    root = root || document;
    var res = [];
    (function walk(r) {
      try { r.querySelectorAll(sel).forEach(function (e) { res.push(e); }); } catch (e) {}
      try {
        r.querySelectorAll('*').forEach(function (e) { if (e.shadowRoot) walk(e.shadowRoot); });
      } catch (e) {}
    })(root);
    return res;
  };
  window.__activePaneRoot = function () {
    var pane = document.querySelector('.pane.on');
    return pane;
  };
`;
await p.evaluate(HELPER);

/* ---------- 1. SWIPE with real touch ---------- */
L('### SWIPE (hasTouch:true context)');
const swipeHas = await p.evaluate(() => 'ontouchstart' in window);
L('  ontouchstart in window: ' + swipeHas);
await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0, 0); });
await p.waitForTimeout(500);
const h0 = await p.evaluate(() => location.hash);
// real touchscreen swipe left across the stage
await p.touchscreen.tap(200, 500).catch(() => {});
const box = await p.locator('.stage').boundingBox();
const cy = 500;
await p.evaluate(() => { window.__swipeLog = []; });
// Use CDP-free approach: dispatch a swipe via Playwright touchscreen is tap-only,
// so drive raw touch events (they are trusted enough for JS listeners).
await p.evaluate(() => {
  const el = document.querySelector('.stage');
  function t(type, x, y) {
    const touch = new Touch({ identifier: 7, target: el, clientX: x, clientY: y, pageX: x, pageY: y });
    el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true,
      touches: type === 'touchend' ? [] : [touch], targetTouches: type === 'touchend' ? [] : [touch], changedTouches: [touch] }));
  }
  t('touchstart', 330, 500);
  t('touchmove', 280, 502);
  t('touchmove', 180, 503);
  t('touchmove', 90, 504);
  t('touchend', 90, 504);
});
await p.waitForTimeout(900);
const h1 = await p.evaluate(() => location.hash);
L(`  swipe LEFT (330->90px): ${h0} -> ${h1}  ${h0 !== h1 ? '*** SWIPE WORKS ***' : 'NO CHANGE'}`);
await p.screenshot({ path: `${SHOTS}/after-swipe.png` });

/* ---------- 2. TYPOGRAPHY inside shadow panes ---------- */
L('\n### LONG-FORM READING metrics (shadow-pierced)');
for (const id of ['walk', 'model', 'trade', 'open', 'rf']) {
  await p.evaluate(v => { location.hash = '#' + v; }, id);
  await p.waitForTimeout(700);
  const t = await p.evaluate((v) => {
    const pane = document.querySelector('#' + v);
    const res = [];
    (function walk(r) {
      r.querySelectorAll('p, li, .ma-say, .say, .note').forEach(el => {
        const txt = (el.textContent || '').trim();
        if (txt.length < 60) return;
        const cs = getComputedStyle(el); const rr = el.getBoundingClientRect();
        if (rr.width === 0) return;
        const fs = parseFloat(cs.fontSize);
        const lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
        res.push({ tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').split(' ')[0],
          fs: +fs.toFixed(1), lh: +lh.toFixed(1), ratio: +(lh / fs).toFixed(2), w: +rr.width.toFixed(0),
          cpl: +(rr.width / (fs * 0.5)).toFixed(0), len: txt.length, txt: txt.slice(0, 44) });
      });
      r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
    })(pane);
    return res.slice(0, 5);
  }, id);
  L(`  --- #${id}`);
  t.forEach(x => L(`     ${x.tag}.${(x.cls || '-').padEnd(14)} fs=${String(x.fs).padStart(5)} lh=${String(x.lh).padStart(5)} (${x.ratio}x) w=${x.w} ~${x.cpl}cpl  "${x.txt}"`));
}

/* ---------- 3. TOUCH TARGETS inside shadow panes ---------- */
L('\n### TOUCH TARGETS < 44px INSIDE the panes (shadow-pierced)');
const paneTargets = {};
for (const id of PANES) {
  await p.evaluate(v => { location.hash = '#' + v; }, id);
  await p.waitForTimeout(650);
  const bad = await p.evaluate((v) => {
    const pane = document.querySelector('#' + v); const res = [];
    (function walk(r) {
      r.querySelectorAll('button, a[href], input, select, textarea, [role="button"], summary, [tabindex="0"]').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const rr = el.getBoundingClientRect();
        if (rr.width === 0 || rr.height === 0) return;
        if (rr.height < 44 || rr.width < 44) {
          res.push({ cls: (typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 2).join('.') || el.tagName.toLowerCase(),
            w: +rr.width.toFixed(1), h: +rr.height.toFixed(1), txt: (el.textContent || el.value || '').trim().slice(0, 22) });
        }
      });
      r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
    })(pane);
    return res;
  }, id);
  if (bad.length) {
    const g = {};
    bad.forEach(x => { const k = x.cls; g[k] = g[k] || { n: 0, minH: 999, minW: 999, s: x.txt }; g[k].n++; g[k].minH = Math.min(g[k].minH, x.h); g[k].minW = Math.min(g[k].minW, x.w); });
    paneTargets[id] = g;
    L(`  #${id}:`);
    Object.entries(g).sort((a, c) => a[1].minH - c[1].minH).forEach(([k, v]) => L(`     ${String(v.minH).padStart(6)}h x ${String(v.minW).padStart(6)}w  n=${v.n}  .${k}  "${v.s}"`));
  } else L(`  #${id}: none`);
}

/* ---------- 4. NUMBERS inputs ---------- */
await p.evaluate(() => { location.hash = '#num'; });
await p.waitForTimeout(800);
const numInputs = await p.evaluate(() => {
  const pane = document.querySelector('#num'); const res = [];
  (function walk(r) {
    r.querySelectorAll('input').forEach(i => { const cs = getComputedStyle(i); const rr = i.getBoundingClientRect();
      res.push({ type: i.type, inputmode: i.getAttribute('inputmode') || '(none)', value: i.value,
        h: +rr.height.toFixed(1), w: +rr.width.toFixed(1), fs: cs.fontSize, iosZoom: parseFloat(cs.fontSize) < 16 }); });
    r.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
  })(pane);
  return res;
});
L('\n### NUMBERS pane inputs  (iOS auto-zooms the page if an input\'s font-size < 16px)');
numInputs.forEach(i => L('  ' + JSON.stringify(i)));

/* ---------- 5. HOME "cross-topic drill" clipping ---------- */
await p.evaluate(() => { if (window.IndexOverlay) IndexOverlay.open(); });
await p.waitForTimeout(800);
const homeClip = await p.evaluate(() => {
  const res = {};
  const q = s => document.querySelector(s);
  const el = q('.ix-cross, .ix-xdrill, [class*="cross"]');
  const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { cls: e.className, h: +r.height.toFixed(1), scrollH: e.scrollHeight, clientH: e.clientHeight,
      clipped: e.scrollHeight > e.clientHeight + 1, overflow: cs.overflow, txt: (e.textContent || '').trim().slice(0, 60) }; };
  res.crossRow = R(el);
  // any clipped text nodes in the home
  const clipped = [];
  document.querySelectorAll('#_index-overlay *').forEach(e => {
    if (e.children.length === 0 && e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0) {
      clipped.push({ cls: (typeof e.className === 'string' ? e.className : '').slice(0, 24), sh: e.scrollHeight, ch: e.clientHeight, txt: (e.textContent || '').trim().slice(0, 40) });
    }
  });
  res.clippedTextEls = clipped.slice(0, 8);
  const panel = document.querySelector('#_index-overlay > *');
  const pr = panel.getBoundingClientRect();
  res.panel = { x: +pr.x.toFixed(1), w: +pr.width.toFixed(1), y: +pr.y.toFixed(1), h: +pr.height.toFixed(1),
    sideGutterPx: +pr.x.toFixed(1), scrollH: panel.scrollHeight, clientH: panel.clientHeight };
  const reset = [...document.querySelectorAll('#_index-overlay button')].find(b => /reset/i.test(b.textContent));
  if (reset) { const r = reset.getBoundingClientRect(); res.resetBtn = { y: +r.y.toFixed(1), h: +r.height.toFixed(1), fromBottom: +(844 - r.bottom).toFixed(1), txt: reset.textContent.trim() }; }
  return res;
});
L('\n### HOME (topic index) mobile geometry');
L(JSON.stringify(homeClip, null, 2));
await p.screenshot({ path: `${SHOTS}/home-clip-390.png` });

/* ---------- 6. PERF: mesh gradients + pane transition ---------- */
L('\n### PERF: animated background layers');
const perf = await p.evaluate(() => {
  const s = document.querySelector('.stage');
  const before = getComputedStyle(s, '::before'), after = getComputedStyle(s, '::after');
  return {
    beforeAnim: before.animation, beforeWillChange: before.willChange, beforeSize: before.width + ' x ' + before.height, beforePos: before.position,
    afterAnim: after.animation, afterWillChange: after.willChange, afterSize: after.width + ' x ' + after.height,
    stageBgImage: getComputedStyle(s).backgroundImage.slice(0, 60) + '...',
    paneInAnim: getComputedStyle(document.querySelector('.pane.on')).animationName,
    cardStagger: (() => { const c = document.querySelector('.pane.on .card'); return c ? getComputedStyle(c).animation : 'n/a'; })(),
    accentGlow: getComputedStyle(document.querySelector('.stage-head'), '::before').animation
  };
});
L(JSON.stringify(perf, null, 2));

await ctx.close(); await b.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/visual-mobile-deep.log', out.join('\n'));
