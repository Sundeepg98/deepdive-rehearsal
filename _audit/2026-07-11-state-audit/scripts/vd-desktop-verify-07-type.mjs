import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-desktop';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(() => { const o = document.getElementById('_index-overlay'); if (o) o.classList.remove('open', 'vis'); document.body.style.overflow = ''; });
async function setView(t) { await p.evaluate(v => document.querySelector(`.sidebar .seg button[data-tab="${v}"]`).click(), t); await p.waitForTimeout(650); }
await p.evaluate(() => TopicRegistry.setTopic('event-driven'));
await p.waitForTimeout(800);

const R = {};

// ---------- TYPE SCALE ----------
const SCALE = [9, 11, 12, 13, 14, 16, 18, 21, 24, 48];
const sizes = new Map();
for (const v of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await setView(v);
  const s = await p.evaluate(() => {
    const out = [];
    const visit = (root) => {
      root.querySelectorAll('*').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        // only elements with direct text
        const hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
        if (!hasText) return;
        const cs = getComputedStyle(e);
        out.push({ fs: parseFloat(cs.fontSize), cls: e.className || e.tagName.toLowerCase() });
        if (e.shadowRoot) visit(e.shadowRoot);
      });
      root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) visit(e.shadowRoot); });
    };
    visit(document);
    return out;
  });
  s.forEach(x => {
    if (!sizes.has(x.fs)) sizes.set(x.fs, { fs: x.fs, count: 0, samples: new Set() });
    const e = sizes.get(x.fs); e.count++; if (e.samples.size < 4) e.samples.add(String(x.cls).slice(0, 24));
  });
}
R.fontSizes = [...sizes.values()].map(e => ({ fs: e.fs, count: e.count, onScale: SCALE.includes(e.fs), samples: [...e.samples] })).sort((a, b) => a.fs - b.fs);

// ---------- PROSE MEASURE (ch) ----------
await setView('num');
R.prose = await p.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d');
  const meas = (el) => {
    const cs = getComputedStyle(el);
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const zero = c.measureText('0').width || 1;
    const w = el.getBoundingClientRect().width;
    return { w: Math.round(w), fs: cs.fontSize, ch: +(w / zero).toFixed(1), maxWidth: cs.maxWidth };
  };
  const out = {};
  const grab = (host, sel, key) => {
    const root = host ? document.querySelector(host)?.shadowRoot : document;
    const el = root?.querySelector(sel);
    if (el) out[key] = { ...meas(el), text: el.textContent.trim().slice(0, 40) };
  };
  grab('deep-numbers', '.nrow-n', 'nrow-n');
  grab(null, '.cmp-thesis', 'cmp-thesis');
  grab(null, '.cmp-note', 'cmp-note');
  return out;
});
await setView('sys');
Object.assign(R.prose, await p.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d');
  const meas = (el) => { const cs = getComputedStyle(el); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const z = c.measureText('0').width || 1; const w = el.getBoundingClientRect().width; return { w: Math.round(w), fs: cs.fontSize, ch: +(w / z).toFixed(1), maxWidth: cs.maxWidth, text: el.textContent.trim().slice(0, 40) }; };
  const root = document.querySelector('deep-system-map')?.shadowRoot;
  const el = root?.querySelector('.sm-intro');
  return el ? { 'sm-intro': meas(el) } : {};
}));
await setView('trade');
Object.assign(R.prose, await p.evaluate(() => {
  const c = document.createElement('canvas').getContext('2d');
  const meas = (el) => { const cs = getComputedStyle(el); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const z = c.measureText('0').width || 1; const w = el.getBoundingClientRect().width; return { w: Math.round(w), fs: cs.fontSize, ch: +(w / z).toFixed(1), maxWidth: cs.maxWidth, text: el.textContent.trim().slice(0, 40) }; };
  const root = document.querySelector('deep-trade-offs')?.shadowRoot;
  const el = root?.querySelector('.opt-w');
  return el ? { 'opt-w': meas(el) } : {};
}));

// ---------- SIDEBAR H1 animation (unfrozen) + topic name occurrences ----------
R.h1 = await p.evaluate(() => {
  const h1 = document.querySelector('.sidebar h1');
  const cs = h1 ? getComputedStyle(h1) : null;
  const cur = TopicRegistry.current();
  const title = cur.identity.title;
  // count visible elements whose trimmed text === the topic title
  const hits = [];
  document.querySelectorAll('*').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const direct = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue.trim()).join('');
    if (direct && direct === title) hits.push({ cls: e.className || e.tagName, fs: getComputedStyle(e).fontSize, w: Math.round(r.width) });
  });
  return {
    title,
    h1: cs ? { fontSize: cs.fontSize, fontWeight: cs.fontWeight, animationName: cs.animationName, animationDuration: cs.animationDuration, animationIterationCount: cs.animationIterationCount, bgClip: cs.webkitBackgroundClip, bgImage: cs.backgroundImage.slice(0, 50) } : null,
    titleOccurrences: hits,
  };
});

// ---------- GROUP DOT SIZE + index panel ----------
await p.evaluate(() => document.getElementById('idxopen').click());
await p.waitForTimeout(900);
R.index = await p.evaluate(() => {
  const dots = [...document.querySelectorAll('.ix-g-dot')].filter(d => d.getBoundingClientRect().width > 0);
  const panel = document.querySelector('.ix-panel') || document.querySelector('#_index-overlay > *');
  const pr = panel.getBoundingClientRect();
  const cards = document.querySelectorAll('.ix-card');
  const grid = document.querySelector('.ix-grid');
  return {
    dotCount: dots.length,
    dot: dots[0] ? { w: +dots[0].getBoundingClientRect().width.toFixed(1), h: +dots[0].getBoundingClientRect().height.toFixed(1), bg: getComputedStyle(dots[0]).backgroundColor } : null,
    panelW: Math.round(pr.width), panelH: Math.round(pr.height), panelTop: Math.round(pr.top),
    viewportPct: +(pr.width / 1440 * 100).toFixed(1),
    cardCount: cards.length,
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
    cardFontSize: cards[0] ? getComputedStyle(cards[0]).fontSize : null,
  };
});
await p.screenshot({ path: SHOTS + '/index-home.png' });

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_vd-type.json', JSON.stringify(R, null, 1));

console.log('=== FONT SIZES IN USE (scale = 9/11/12/13/14/16/18/21/24/48) ===');
R.fontSizes.forEach(f => console.log(`  ${String(f.fs).padStart(8)}px  n=${String(f.count).padStart(4)}  ${f.onScale ? 'on-scale ' : 'OFF-SCALE'}  ${f.samples.join(', ').slice(0, 60)}`));
const off = R.fontSizes.filter(f => !f.onScale);
const band = R.fontSizes.filter(f => f.fs >= 9 && f.fs <= 14).map(f => f.fs);
console.log(`\n  OFF-SCALE COUNT: ${off.length}  -> ${off.map(f => f.fs).join(', ')}`);
console.log(`  DISTINCT SIZES IN 9-14px BAND: ${band.length} -> ${band.join(', ')}`);
console.log('\n=== PROSE MEASURE ==='); console.log(JSON.stringify(R.prose, null, 1));
console.log('\n=== SIDEBAR H1 + TITLE OCCURRENCES ==='); console.log(JSON.stringify(R.h1, null, 1));
console.log('\n=== INDEX OVERLAY ==='); console.log(JSON.stringify(R.index, null, 1));
await b.close();
