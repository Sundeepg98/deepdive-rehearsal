/* a11y-keyboard.mjs -- keyboard-only operation, focus ring, traps, escape, ARIA state. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const SHOTS = path.join(OUT, 'shots', 'a11y');
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.evaluate(() => localStorage.clear());
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1400);

const desc = () => p.evaluate(() => {
  const a = document.activeElement;
  if (!a) return { tag: 'NULL' };
  // pierce shadow roots
  let el = a, depth = 0;
  while (el.shadowRoot && el.shadowRoot.activeElement && depth++ < 5) el = el.shadowRoot.activeElement;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    cls: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
    txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    aria: el.getAttribute('aria-label') || '',
    outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,
    boxShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 60),
    inViewport: r.top >= 0 && r.bottom <= innerHeight && r.width > 0,
    w: Math.round(r.width), h: Math.round(r.height),
    isBody: el === document.body,
  };
});

console.log('======== 1. ESCAPE CLOSES EVERY OVERLAY (2s budget) ========');
const OVERLAYS = [
  ['mock-run', '#mockopen', '#mockov'],
  ['mixed-fire', '#mixopen', '#mixov'],
  ['cram-sheet', '#cramopen', '#cramov'],
  ['session', '#sessopen', '#sessov'],
  ['keyboard', '#keyopen', '#keyov'],
  ['scope', '#scopeopen', '#scopeov'],
  ['gameplan', '#planopen', '#planov'],
];
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(500);

const escResults = [];
for (const [name, trig, ov] of OVERLAYS) {
  await p.evaluate(s => document.querySelector(s).click(), trig);
  await p.waitForTimeout(700);
  const openedOK = await p.evaluate(s => document.querySelector(s).classList.contains('open'), ov);
  // does focus land INSIDE the overlay?
  const focusInside = await p.evaluate(s => {
    const o = document.querySelector(s);
    return o.contains(document.activeElement);
  }, ov);
  const focusEl = await desc();
  await p.keyboard.press('Escape');
  let closed = false;
  for (let i = 0; i < 20; i++) {           // poll up to 2000ms
    await p.waitForTimeout(100);
    closed = await p.evaluate(s => !document.querySelector(s).classList.contains('open'), ov);
    if (closed) break;
  }
  // where did focus go after close? should be the trigger
  const after = await desc();
  const restored = after.id === trig.slice(1);
  escResults.push({ name, openedOK, focusInside, focusOn: focusEl.id || focusEl.txt, closedByEsc: closed, focusRestored: restored, focusAfter: after.id || after.tag });
  console.log(`${name.padEnd(12)} open=${openedOK}  focusMovedInside=${focusInside} (${focusEl.id || focusEl.txt})  ESC-closes=${closed}  focusRestoredToTrigger=${restored} (${after.id || after.tag})`);
  if (!closed) await p.evaluate(s => { const x = document.querySelector(s).querySelector('.mock-x,.cram-x'); if (x) x.click(); }, ov);
  await p.waitForTimeout(600);
}

console.log('\n-------- lazy overlays --------');
for (const name of ['index', 'search', 'notes']) {
  await p.evaluate(n => ({ index: window.IndexOverlay, search: window.SearchOverlay, notes: window.NotesOverlay })[n].open(), name);
  await p.waitForTimeout(800);
  const focusEl = await desc();
  await p.keyboard.press('Escape');
  let closed = false;
  for (let i = 0; i < 20; i++) {
    await p.waitForTimeout(100);
    closed = await p.evaluate(n => !({ index: window.IndexOverlay, search: window.SearchOverlay, notes: window.NotesOverlay })[n].isOpen(), name);
    if (closed) break;
  }
  const after = await desc();
  console.log(`${name.padEnd(12)} focusOnOpen=${focusEl.id || focusEl.tag}(${focusEl.txt.slice(0, 20)})  ESC-closes=${closed}  focusAfter=${after.id || after.tag}`);
  escResults.push({ name, closedByEsc: closed, focusOn: focusEl.id || focusEl.tag, focusAfter: after.id || after.tag });
  if (!closed) await p.evaluate(n => ({ index: window.IndexOverlay, search: window.SearchOverlay, notes: window.NotesOverlay })[n].close(), name);
  await p.waitForTimeout(500);
}

console.log('\n======== 2. FULL TAB SWEEP (app shell, walk pane) ========');
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(600);
await p.evaluate(() => document.body.focus());
await p.evaluate(() => { const h = document.querySelector('h1'); if (h) h.scrollIntoView(); });

const order = [];
const seen = new Set();
let looped = false;
for (let i = 0; i < 80; i++) {
  await p.keyboard.press('Tab');
  await p.waitForTimeout(45);
  const d = await desc();
  const key = d.tag + '#' + d.id + '.' + d.cls + '|' + d.txt;
  if (seen.has(key) && order.length > 3) { looped = true; order.push({ ...d, LOOPED: true }); break; }
  seen.add(key);
  order.push(d);
  if (d.isBody) break;
}
console.log(`Tab stops before cycle: ${order.length} (looped=${looped})`);
const noRing = [];
order.forEach((d, i) => {
  const hasRing = (d.outline !== '0px none rgb(0, 0, 0)' && !d.outline.startsWith('0px')) || d.boxShadow !== 'none';
  if (!hasRing) noRing.push(d);
  console.log(`${String(i + 1).padStart(2)}. ${(d.tag + (d.id ? '#' + d.id : '') + (d.cls ? '.' + d.cls.split(' ')[0] : '')).padEnd(34)} ${hasRing ? 'RING' : '*** NO-RING ***'} out="${d.outline}" bs=${d.boxShadow === 'none' ? 'none' : 'yes'}  ${d.w}x${d.h}  "${d.txt.slice(0, 26)}"`);
});
console.log(`\nFocusable stops WITHOUT any visible focus indicator: ${noRing.length}`);

console.log('\n======== 3. SEG TAB ARIA STATE (active view conveyed?) ========');
const segState = await p.evaluate(() => {
  return [...document.querySelectorAll('.seg button')].map(b => ({
    tab: b.dataset.tab,
    classOn: b.classList.contains('on'),
    role: b.getAttribute('role'),
    ariaSelected: b.getAttribute('aria-selected'),
    ariaPressed: b.getAttribute('aria-pressed'),
    ariaCurrent: b.getAttribute('aria-current'),
    accName: (b.textContent || '').trim().replace(/\s+/g, ' '),
  }));
});
console.table(segState);
const segParent = await p.evaluate(() => { const s = document.querySelector('.seg'); return { role: s.getAttribute('role'), label: s.getAttribute('aria-label') }; });
console.log('.seg container:', JSON.stringify(segParent));
// switch view, re-read
await p.evaluate(() => window.switchTab('num'));
await p.waitForTimeout(400);
const segAfter = await p.evaluate(() => [...document.querySelectorAll('.seg button')].map(b => ({ tab: b.dataset.tab, on: b.classList.contains('on'), sel: b.getAttribute('aria-selected'), pressed: b.getAttribute('aria-pressed'), cur: b.getAttribute('aria-current') })));
console.log('AFTER switchTab("num"):', JSON.stringify(segAfter.filter(s => s.tab === 'num' || s.tab === 'walk')));
await p.evaluate(() => window.switchTab('walk'));

console.log('\n======== 4. HEADING STRUCTURE per pane ========');
for (const pane of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await p.evaluate(v => window.switchTab(v), pane);
  await p.waitForTimeout(350);
  const hs = await p.evaluate((v) => {
    const root = document.getElementById(v);
    const collect = (node, acc) => {
      node.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').forEach(h => acc.push(h.tagName + ':' + h.textContent.trim().slice(0, 28)));
      node.querySelectorAll('*').forEach(el => { if (el.shadowRoot) collect(el.shadowRoot, acc); });
      return acc;
    };
    return collect(root, []);
  }, pane);
  console.log(`${pane.padEnd(6)} headings in pane (incl. shadow): ${hs.length ? hs.join(' | ') : '*** NONE ***'}`);
}
const docH = await p.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => h.offsetParent !== null).map(h => h.tagName + ':' + h.textContent.trim().slice(0, 30)));
console.log('Document-level visible headings:', JSON.stringify(docH));

console.log('\n======== 5. KEYBOARD-SCROLLABLE REGIONS (commit 2954f71 claim) ========');
const scrollables = await p.evaluate(() => {
  const out = [];
  const walk = (root) => {
    root.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      const scrolls = (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowX === 'auto' || cs.overflowX === 'scroll');
      if (!scrolls) return;
      const canScroll = el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2;
      if (!canScroll) return;
      if (el.offsetParent === null && el !== document.body) return;
      const focusable = el.tabIndex >= 0 || ['input', 'textarea', 'select', 'button', 'a'].includes(el.tagName.toLowerCase());
      out.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''),
        tabIndex: el.tabIndex, focusable, role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
        overflowY: cs.overflowY, sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth,
      });
      if (el.shadowRoot) walk(el.shadowRoot);
    });
  };
  walk(document);
  return out;
});
scrollables.forEach(s => console.log(`  ${s.focusable ? 'OK  ' : 'FAIL'} ${s.sel.padEnd(30)} tabIndex=${s.tabIndex} role=${s.role} scrollH ${s.sh}/${s.ch} scrollW ${s.sw}/${s.cw}`));
console.log(`Keyboard-UNREACHABLE scrollable regions: ${scrollables.filter(s => !s.focusable).length} / ${scrollables.length}`);

fs.writeFileSync(path.join(OUT, 'scripts', 'kbd-raw.json'), JSON.stringify({ escResults, order, segState, scrollables }, null, 2));
await b.close();
