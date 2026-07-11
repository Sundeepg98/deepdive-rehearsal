import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-desktop';
const TABS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const SCALE = [9, 11, 12, 13, 14, 16, 18, 21, 24, 48];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.click('.ix-card'); await p.waitForTimeout(800);

// ---------- helper injected once ----------
await p.addScriptTag({
  content: `
  window.__chOf = function(el){
    const cs = getComputedStyle(el);
    const c = document.createElement('canvas').getContext('2d');
    c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    const w0 = c.measureText('0').width || parseFloat(cs.fontSize)*0.5;
    return { ch: +(el.clientWidth / w0).toFixed(1), px: el.clientWidth, fs: cs.fontSize, lh: cs.lineHeight };
  };
  window.__allRoots = function(){
    const roots = [document];
    document.querySelectorAll('.stage .pane > *').forEach(h => { if (h.shadowRoot) roots.push(h.shadowRoot); });
    return roots;
  };`
});

// ---------- 1. FONT-SIZE SCALE CONFORMANCE ----------
const typeAudit = { offScale: {}, used: {} };
for (const t of TABS) {
  await p.click(`.seg button[data-tab="${t}"]`); await p.waitForTimeout(420);
  const r = await p.evaluate(({ tab, SCALE }) => {
    const host = document.querySelector(`.pane#${tab} > *`);
    if (!host?.shadowRoot) return { off: [], used: [] };
    const off = [], used = new Set();
    host.shadowRoot.querySelectorAll('*').forEach(e => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || !e.textContent.trim()) return;
      const fs = parseFloat(cs.fontSize);
      used.add(fs);
      if (!SCALE.includes(fs)) off.push({ px: fs, cls: String(e.className).slice(0, 24), tag: e.tagName.toLowerCase() });
    });
    return { off, used: [...used] };
  }, { tab: t, SCALE });
  const uniq = {};
  r.off.forEach(o => { const k = o.px + '|' + o.tag + '.' + o.cls; uniq[k] = (uniq[k] || 0) + 1; });
  if (Object.keys(uniq).length) typeAudit.offScale[t] = uniq;
  typeAudit.used[t] = r.used.sort((a, b) => a - b);
}
// light-DOM shell too
const shellOff = await p.evaluate((SCALE) => {
  const off = {};
  document.querySelectorAll('.sidebar *, .companion *, .stage-head *, .ix-panel *, .mock-panel *').forEach(e => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || !e.textContent.trim()) return;
    const fs = parseFloat(cs.fontSize);
    if (!SCALE.includes(fs)) { const k = fs + '|' + String(e.className).split(' ')[0]; off[k] = (off[k] || 0) + 1; }
  });
  return off;
}, SCALE);

console.log('===== OFF-SCALE FONT SIZES (px not in the 10-step token scale) =====');
console.log('SHELL (light DOM):', JSON.stringify(shellOff, null, 1));
for (const [pane, o] of Object.entries(typeAudit.offScale)) console.log(`PANE ${pane}:`, JSON.stringify(o));
console.log('\nDISTINCT SIZES PER PANE:', JSON.stringify(typeAudit.used));

// ---------- 2. LINE LENGTH (ch) of prose blocks ----------
console.log('\n===== PROSE LINE-LENGTH (measured ch at 1440px) =====');
const proseTargets = [
  ['walk', '.step-x, .stepbody, p'], ['rf', '.rf-x, .rf-why, p'], ['trade', '.opt-w, .verdict, p'],
  ['num', '.nrow-n'], ['sys', '.sm-intro'], ['open', '.op-x, p'],
];
for (const [tab, sel] of proseTargets) {
  await p.click(`.seg button[data-tab="${tab}"]`); await p.waitForTimeout(420);
  const r = await p.evaluate(({ tab, sel }) => {
    const host = document.querySelector(`.pane#${tab} > *`);
    if (!host?.shadowRoot) return [];
    const out = [];
    host.shadowRoot.querySelectorAll(sel).forEach(e => {
      const tx = e.textContent.trim();
      if (tx.length < 60) return;
      const m = window.__chOf(e);
      out.push({ cls: String(e.className).slice(0, 22) || e.tagName.toLowerCase(), ...m, chars: tx.length, snippet: tx.slice(0, 40) });
    });
    return out.sort((a, b) => b.ch - a.ch).slice(0, 3);
  }, { tab, sel });
  r.forEach(x => console.log(` [${tab}] .${x.cls} width=${x.px}px = ${x.ch}ch  fs=${x.fs} lh=${x.lh}  "${x.snippet}..."`));
}
// companion + shell prose
const shellProse = await p.evaluate(() => {
  const out = [];
  ['.cmp-thesis', '.cmp-note', '.cmp-move', '.cmp-drive', '.ix-c-thesis', '.sub'].forEach(s => {
    const e = document.querySelector(s);
    if (e && e.textContent.trim().length > 40) { const m = window.__chOf(e); out.push({ sel: s, ...m, snippet: e.textContent.trim().slice(0, 34) }); }
  });
  return out;
});
shellProse.forEach(x => console.log(` [shell] ${x.sel} width=${x.px}px = ${x.ch}ch fs=${x.fs} lh=${x.lh}`));

// ---------- 3. STAGE FILL vs COMPANION OVERFLOW ----------
console.log('\n===== VERTICAL FILL: stage content vs viewport =====');
for (const t of TABS) {
  await p.click(`.seg button[data-tab="${t}"]`); await p.waitForTimeout(420);
  const f = await p.evaluate((tab) => {
    const pane = document.querySelector(`.pane#${tab}`);
    const r = pane.getBoundingClientRect();
    const cmp = document.querySelector('.cmp-inner');
    return {
      paneBottom: Math.round(r.bottom), vh: window.innerHeight,
      dead: Math.round(window.innerHeight - r.bottom),
      docScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      cmpOverflow: Math.round(cmp.scrollHeight - cmp.clientHeight)
    };
  }, t);
  console.log(` ${t.padEnd(6)} pane ends y=${String(f.paneBottom).padStart(4)}  dead canvas below=${String(f.dead).padStart(4)}px  page-scroll=${f.docScroll}px  companion-overflow=${f.cmpOverflow}px`);
}

// ---------- 4. AMBIENT-BLOB CLIP SEAM (pixel sample) ----------
await p.click('.seg button[data-tab="rf"]'); await p.waitForTimeout(700);
const seam = await p.evaluate(async () => {
  // sample a horizontal scanline across the stage at y=750 (below content, pure canvas)
  const cv = document.createElement('canvas');
  // we can't screenshot in-page; instead read the computed geometry of the blobs
  const st = document.querySelector('.stage');
  const cs = getComputedStyle(st);
  const before = getComputedStyle(st, '::before');
  const after = getComputedStyle(st, '::after');
  const r = st.getBoundingClientRect();
  return {
    stage: { x: Math.round(r.x), w: Math.round(r.width), overflowX: cs.overflowX },
    before: { w: before.width, h: before.height, pos: before.position, bg: before.backgroundImage.slice(0, 60) },
    after: { w: after.width, h: after.height, pos: after.position, bg: after.backgroundImage.slice(0, 60) },
    vw: window.innerWidth, vh: window.innerHeight
  };
});
console.log('\n===== AMBIENT BLOB GEOMETRY (the clip seam) =====');
console.log(JSON.stringify(seam, null, 1));
await p.screenshot({ path: `${SHOT}/detail-canvas-seam-rf.png`, clip: { x: 296, y: 560, width: 854, height: 340 } });

// ---------- 5. THEME SURFACE SEPARATION (light vs dark) ----------
for (const theme of ['light', 'dark']) {
  await p.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
  await p.waitForTimeout(400);
  const cols = await p.evaluate(() => {
    const g = s => getComputedStyle(document.querySelector(s)).backgroundColor;
    const cv = s => getComputedStyle(document.documentElement).getPropertyValue(s).trim();
    return {
      body: g('body'), sidebarBG: getComputedStyle(document.querySelector('.sidebar')).backgroundImage.slice(0, 70),
      stage: g('.stage'), companionBG: getComputedStyle(document.querySelector('.companion')).backgroundImage.slice(0, 70),
      tokens: { bg: cv('--bg'), card: cv('--card'), panel: cv('--panel').slice(0, 46), bd: cv('--bd'), ink: cv('--ink'), mut: cv('--mut'), acc: cv('--acc') }
    };
  });
  console.log(`\n===== SURFACES [${theme}] =====`);
  console.log(JSON.stringify(cols, null, 1));
}
await p.evaluate(() => { document.documentElement.dataset.theme = 'light'; });

// ---------- 6. NUM value overflow past card edge ----------
await p.click('.seg button[data-tab="num"]'); await p.waitForTimeout(700);
const numOv = await p.evaluate(() => {
  const sr = document.querySelector('deep-numbers').shadowRoot;
  const card = [...sr.querySelectorAll('.card')].pop();
  const cr = card.getBoundingClientRect();
  const cs = getComputedStyle(card);
  return {
    cardRight: Math.round(cr.right), cardPadRight: cs.paddingRight,
    contentRight: Math.round(cr.right - parseFloat(cs.paddingRight)),
    values: [...sr.querySelectorAll('.nrow-v')].map(v => ({
      t: v.textContent.trim(), right: Math.round(v.getBoundingClientRect().right),
      w: Math.round(v.getBoundingClientRect().width), sw: v.scrollWidth, clipped: v.scrollWidth > v.clientWidth + 1
    })),
    rowOverflow: [...sr.querySelectorAll('.nrow')].map(r => r.scrollWidth - r.clientWidth)
  };
});
console.log('\n===== NUMBERS: value column vs card edge =====');
console.log(JSON.stringify(numOv, null, 1));
await p.screenshot({ path: `${SHOT}/detail-num-value-overflow.png`, clip: { x: 900, y: 400, width: 250, height: 340 } });

// ---------- 7. drill 'undefined' zoom ----------
await p.click('.seg button[data-tab="drill"]'); await p.waitForTimeout(700);
const tn = await p.evaluate(() => {
  const e = document.querySelector('deep-drill').shadowRoot.getElementById('tiernote');
  const r = e.getBoundingClientRect();
  return { text: e.textContent, html: e.innerHTML, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }, color: getComputedStyle(e).color };
});
console.log('\n===== DRILL .tiernote =====');
console.log(JSON.stringify(tn));
await p.screenshot({ path: `${SHOT}/detail-drill-undefined.png`, clip: { x: 340, y: 190, width: 500, height: 90 } });

await p.close(); await b.close();
