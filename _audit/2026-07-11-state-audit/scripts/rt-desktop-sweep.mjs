/* LENS: rt-desktop -- horizontal-overflow sweep 320 -> 1920 in 40px steps.
   Measures ONLY scrollWidth > clientWidth at the document level, PLUS
   (a) elements escaping the viewport right edge, and
   (b) clipped elements (scrollWidth>clientWidth with overflow-x:hidden -> unreachable content),
   piercing every shadow root. */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const TOPICS = ['', 'caching/', 'kafka-internals/'];   // '' = default (first-registered) topic

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
// dismiss the first-run topic-index overlay
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// Probe fn: injected into the page. Walks light DOM + all shadow roots.
const PROBE = `(() => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const docOverflow = { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, over: de.scrollWidth - de.clientWidth };
  const bodyOverflow = { scrollWidth: document.body.scrollWidth, clientWidth: document.body.clientWidth, over: document.body.scrollWidth - document.body.clientWidth };
  const esc = [], clip = [];
  const path = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList && el.classList.length) s += '.' + [...el.classList].slice(0,3).join('.');
    return s;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const seen = new Set();
  const walk = (root, hostChain) => {
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of all) {
      if (seen.has(el)) continue; seen.add(el);
      if (el.shadowRoot) walk(el.shadowRoot, hostChain + '>' + path(el));
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') continue;           // fixed bars are viewport-anchored by design
      const r = el.getBoundingClientRect();
      // (a) escapes the viewport horizontally
      if (r.right > vw + 1 || r.left < -1) {
        esc.push({ sel: hostChain + '>' + path(el), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), overRight: Math.round(r.right - vw) });
      }
      // (b) content clipped and UNREACHABLE (overflow-x hidden/clip, content wider than box)
      const ox = cs.overflowX;
      const d = el.scrollWidth - el.clientWidth;
      if (d > 1 && (ox === 'hidden' || ox === 'clip')) {
        clip.push({ sel: hostChain + '>' + path(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, over: d, overflowX: ox });
      }
    }
  };
  walk(document, '');
  // key layout rails
  const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(r.x), w: Math.round(r.width), display: cs.display }; };
  const paneOn = document.querySelector('.pane.on');
  const pr = paneOn ? paneOn.getBoundingClientRect() : null;
  return {
    docOverflow, bodyOverflow,
    esc: esc.sort((a,b2)=>b2.overRight-a.overRight).slice(0, 12),
    clip: clip.sort((a,b2)=>b2.over-a.over).slice(0, 12),
    escCount: esc.length, clipCount: clip.length,
    rails: { sidebar: g('.sidebar'), stage: g('.stage'), companion: g('.companion'), mcomp: g('.mcomp'), rail: g('.rail') },
    paneOn: paneOn ? { id: paneOn.id, x: Math.round(pr.x), w: Math.round(pr.width) } : null
  };
})()`;

const rows = [];
const detail = {};

for (const topic of TOPICS) {
  for (const view of VIEWS) {
    await p.goto(URL + '#' + topic + view, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    for (let w = 320; w <= 1920; w += 40) {
      await p.setViewportSize({ width: w, height: 900 });
      await p.waitForTimeout(70);
      const r = await p.evaluate(PROBE);
      const key = (topic || 'default') + '|' + view + '|' + w;
      rows.push({
        topic: topic || 'default', view, w,
        docOver: r.docOverflow.over,
        bodyOver: r.bodyOverflow.over,
        escCount: r.escCount, clipCount: r.clipCount,
        paneW: r.paneOn ? r.paneOn.w : null,
        stageW: r.rails.stage ? r.rails.stage.w : null,
        sidebarW: r.rails.sidebar && r.rails.sidebar.display !== 'none' ? r.rails.sidebar.w : 0,
        compW: r.rails.companion && r.rails.companion.display !== 'none' ? r.rails.companion.w : 0
      });
      if (r.docOverflow.over > 0 || r.escCount > 0 || r.clipCount > 0) detail[key] = r;
    }
  }
}

fs.writeFileSync(OUT + '/scripts/_sweep-rows.json', JSON.stringify(rows, null, 1));
fs.writeFileSync(OUT + '/scripts/_sweep-detail.json', JSON.stringify(detail, null, 1));

// ---- SUMMARY ----
const bad = rows.filter(r => r.docOver > 0);
console.log('=== DOC-LEVEL HORIZONTAL OVERFLOW (scrollWidth > clientWidth) ===');
console.log('total samples:', rows.length, '| samples with doc overflow:', bad.length);
if (bad.length) {
  const byW = {};
  bad.forEach(r => { (byW[r.w] = byW[r.w] || []).push(`${r.topic}/${r.view}(+${r.docOver}px)`); });
  Object.keys(byW).sort((a, b2) => a - b2).forEach(w => console.log(`  ${w}px -> ${byW[w].length} views:`, byW[w].slice(0, 6).join(' ')));
} else console.log('  NONE at any sampled width 320..1920.');

console.log('\n=== VIEWPORT-ESCAPING ELEMENTS (rect.right > innerWidth) ===');
const escBad = rows.filter(r => r.escCount > 0);
if (escBad.length) {
  const byW = {};
  escBad.forEach(r => { (byW[r.w] = byW[r.w] || []).push(`${r.topic}/${r.view}:${r.escCount}`); });
  Object.keys(byW).sort((a, b2) => a - b2).forEach(w => console.log(`  ${w}px ->`, byW[w].join(' ')));
} else console.log('  NONE.');

console.log('\n=== CLIPPED / UNREACHABLE CONTENT (overflow-x:hidden AND scrollWidth>clientWidth) ===');
const clipBad = rows.filter(r => r.clipCount > 0);
if (clipBad.length) {
  const agg = {};
  clipBad.forEach(r => { const k = r.w; agg[k] = (agg[k] || 0) + r.clipCount; });
  Object.keys(agg).sort((a, b2) => a - b2).forEach(w => console.log(`  ${w}px -> ${agg[w]} clipped-el samples`));
  // show which selectors
  const sels = {};
  Object.entries(detail).forEach(([k, v]) => v.clip.forEach(c => { const s = c.sel; sels[s] = sels[s] || { n: 0, maxOver: 0, widths: new Set() }; sels[s].n++; sels[s].maxOver = Math.max(sels[s].maxOver, c.over); sels[s].widths.add(k.split('|')[2]); }));
  console.log('  -- offending selectors --');
  Object.entries(sels).sort((a, b2) => b2[1].maxOver - a[1].maxOver).slice(0, 20).forEach(([s, v]) => {
    const ws = [...v.widths].map(Number).sort((a, b2) => a - b2);
    console.log(`   ${s}  maxOver=${v.maxOver}px  samples=${v.n}  widths=${ws[0]}..${ws[ws.length - 1]}`);
  });
} else console.log('  NONE.');

// ---- content-width curve for the default topic / walk view ----
console.log('\n=== LAYOUT RAIL WIDTHS (default topic, walk view) ===');
console.log('vw    sidebar  stage   companion  pane(content)');
rows.filter(r => r.topic === 'default' && r.view === 'walk').forEach(r => {
  console.log(String(r.w).padEnd(6) + String(r.sidebarW).padEnd(9) + String(r.stageW).padEnd(8) + String(r.compW).padEnd(11) + r.paneW);
});

console.log('\n=== CONSOLE/PAGE ERRORS ===');
console.log(errs.length ? [...new Set(errs)].slice(0, 20).join('\n') : '  none');

await b.close();
