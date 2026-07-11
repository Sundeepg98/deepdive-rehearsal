/* Identify the remaining clipped elements: span.badge, #tncurrent, the num-pane .stage
   clip, and the anonymous div. Distinguish INTENTIONAL ellipsis truncation from real loss. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.keyboard.press('Escape');
await p.waitForTimeout(200);

console.log('=== 1. .tn-current (the "REHEARSING <topic>" pill in the sidebar) ===');
const tn = await p.evaluate(() => {
  const e = document.getElementById('tncurrent');
  if (!e) return null;
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  return {
    fullText: e.textContent.trim(), title: e.getAttribute('title'),
    clientW: e.clientWidth, scrollW: e.scrollWidth, clipped: e.scrollWidth - e.clientWidth,
    textOverflow: cs.textOverflow, overflowX: cs.overflowX, whiteSpace: cs.whiteSpace,
    renderedW: Math.round(r.width), parentW: Math.round(e.parentElement.getBoundingClientRect().width)
  };
});
console.log(JSON.stringify(tn, null, 1));
console.log(' -> ' + (tn.textOverflow === 'ellipsis' ? 'ellipsis IS set (intentional truncation) but only ' : 'NO ellipsis -- hard clip; ') +
  Math.round(100 * tn.clientW / tn.scrollW) + '% of the topic name is visible.');

console.log('\n=== 2. span.badge (clipped 1160..1920) ===');
const badges = await p.evaluate(() => [...document.querySelectorAll('span.badge')].map(e => {
  const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
  const path = (x) => x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (x.classList.length ? '.' + [...x.classList].join('.') : '');
  return {
    text: e.textContent.trim().slice(0, 60), parent: path(e.parentElement),
    clientW: e.clientWidth, scrollW: e.scrollWidth, clipped: e.scrollWidth - e.clientWidth,
    textOverflow: cs.textOverflow, overflowX: cs.overflowX, display: cs.display, w: Math.round(r.width)
  };
}).filter(x => x.display !== 'none'));
badges.forEach(x => console.log(' ', JSON.stringify(x)));

console.log('\n=== 3. the kafka-internals NUMBERS pane clipping .stage by 33px ===');
await p.goto(URL + '#kafka-internals/num', { waitUntil: 'load' });
await p.waitForTimeout(700);
const num = await p.evaluate(() => {
  const stage = document.querySelector('.stage');
  const vw = window.innerWidth;
  const host = document.querySelector('deep-numbers');
  const sr = host ? host.shadowRoot : null;
  const wide = [];
  if (sr) {
    sr.querySelectorAll('*').forEach(e => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (r.width === 0) return;
      if (r.right > vw + 1) wide.push({ sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : ''), right: Math.round(r.right), w: Math.round(r.width), over: Math.round(r.right - vw), text: e.textContent.trim().slice(0, 50), overflowX: cs.overflowX, whiteSpace: cs.whiteSpace });
    });
  }
  return {
    vw, stageScrollW: stage.scrollWidth, stageClientW: stage.clientWidth, stageClipped: stage.scrollWidth - stage.clientWidth,
    stageOverflowX: getComputedStyle(stage).overflowX,
    escaping: wide.sort((a, b2) => b2.over - a.over).slice(0, 5)
  };
});
console.log(JSON.stringify(num, null, 1));
await p.screenshot({ path: SHOTS + '/num-1440-kafka-clip.png' });

// which topics clip the stage in num?
console.log('\n=== which topics clip .stage in the num pane @1280? ===');
await p.setViewportSize({ width: 1280, height: 800 });
const ids = await p.evaluate(() => TopicRegistry.ids());
const clipT = [];
for (const t of ids) {
  await p.goto(URL + '#' + t + '/num', { waitUntil: 'load' });
  await p.waitForTimeout(230);
  const r = await p.evaluate(() => {
    const s = document.querySelector('.stage');
    return { clip: s.scrollWidth - s.clientWidth };
  });
  if (r.clip > 1) clipT.push(t + '(+' + r.clip + 'px)');
}
console.log(' topics whose num pane overflows+clips the stage:', clipT.length ? clipT.join(', ') : 'none');
await b.close();
