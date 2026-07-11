/* Isolate the deep-system-map span.chip overflow + re-run overflow detection
   with scrollable-ancestor and offscreen-hack false positives excluded. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL + '#sys', { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

const diag = await p.evaluate(() => {
  const host = document.querySelector('deep-system-map');
  const sr = host.shadowRoot;
  const chips = [...sr.querySelectorAll('span.chip')];
  const out = chips.map((c, i) => {
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    // ancestor chain inside shadow root
    const chain = [];
    let e = c.parentElement;
    while (e) {
      const ecs = getComputedStyle(e);
      const er = e.getBoundingClientRect();
      chain.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : ''),
        overflowX: ecs.overflowX, display: ecs.display, w: Math.round(er.width),
        scrollW: e.scrollWidth, clientW: e.clientWidth, flexWrap: ecs.flexWrap, minWidth: ecs.minWidth
      });
      e = e.parentElement;
    }
    return {
      i, text: c.textContent.trim().slice(0, 90),
      left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
      whiteSpace: cs.whiteSpace, display: cs.display, flexShrink: cs.flexShrink, minWidth: cs.minWidth,
      escapes: r.right > window.innerWidth,
      chain
    };
  });
  return { innerWidth: window.innerWidth, chipCount: chips.length, chips: out.filter(c => c.escapes || c.width > 400).slice(0, 6), allChipWidths: out.map(c => c.width) };
});
console.log('== deep-system-map span.chip @1440 ==');
console.log(JSON.stringify(diag, null, 1));

// Screenshot the sys pane at 1440
await p.screenshot({ path: SHOTS + '/sys-1440-chip-overflow.png', fullPage: false });

// And at 1920
await p.setViewportSize({ width: 1920, height: 1080 });
await p.waitForTimeout(400);
const d1920 = await p.evaluate(() => {
  const sr = document.querySelector('deep-system-map').shadowRoot;
  const chips = [...sr.querySelectorAll('span.chip')];
  const esc = chips.map(c => { const r = c.getBoundingClientRect(); return { t: c.textContent.trim().slice(0, 60), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) }; }).filter(c => c.right > window.innerWidth);
  const par = sr.querySelector('span.chip') ? sr.querySelector('span.chip').parentElement : null;
  return { innerWidth: window.innerWidth, escaping: esc, parent: par ? { sel: par.className, scrollW: par.scrollWidth, clientW: par.clientWidth, overflowX: getComputedStyle(par).overflowX } : null };
});
console.log('\n== @1920 ==');
console.log(JSON.stringify(d1920, null, 1));
await p.screenshot({ path: SHOTS + '/sys-1920-chip-overflow.png' });

// 768 (tablet)
await p.setViewportSize({ width: 768, height: 1024 });
await p.waitForTimeout(400);
await p.screenshot({ path: SHOTS + '/sys-768-chip-overflow.png' });
const d768 = await p.evaluate(() => {
  const sr = document.querySelector('deep-system-map').shadowRoot;
  const chips = [...sr.querySelectorAll('span.chip')];
  return chips.map(c => { const r = c.getBoundingClientRect(); return { t: c.textContent.trim().slice(0, 50), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) }; }).filter(c => c.right > window.innerWidth);
});
console.log('\n== @768 escaping chips ==');
console.log(JSON.stringify(d768, null, 1));

await b.close();
