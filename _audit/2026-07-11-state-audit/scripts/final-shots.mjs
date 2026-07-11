import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();

/* 1. model pane: 9.5px prose */
await p.goto(`${URL}#kafka-internals/model`, { waitUntil: 'load' });
await p.waitForTimeout(1000);
const mb = await p.evaluate(() => {
  const sr = document.querySelector('deep-model-answers').shadowRoot;
  return [...sr.querySelectorAll('.mbeat-l')].map(e => ({
    cls: e.className, fs: getComputedStyle(e).fontSize, tt: getComputedStyle(e).textTransform,
    chars: e.textContent.trim().length, txt: e.textContent.trim().slice(0, 70)
  }));
});
console.log('=== model pane .mbeat-l (kafka-internals) ===');
mb.forEach(m => console.log(`  ${m.fs} chars=${String(m.chars).padStart(3)} tt=${m.tt} | ${m.txt}`));
await p.screenshot({ path: `${S}/model-9px-prose-360.png` });

/* 2. numbers pane: clipped rows */
await p.goto(`${URL}#api-design/num`, { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.evaluate(() => {
  const sr = document.querySelector('deep-numbers').shadowRoot;
  sr.querySelectorAll('.nrow').forEach(r => { if (r.scrollWidth - r.clientWidth > 1) r.style.outline = '2px solid red'; });
});
await p.screenshot({ path: `${S}/num-rows-clipped-360.png` });
console.log('\nshot: num-rows-clipped-360.png (red = rows whose content overflows the card)');

/* 3. focus toggle (20px tall, 9px text) */
await p.goto(`${URL}#content-pipeline/walk`, { waitUntil: 'load' });
await p.waitForTimeout(900);
const ft = await p.evaluate(() => {
  const e = document.getElementById('_focus-toggle');
  const r = e.getBoundingClientRect();
  const cs = getComputedStyle(e);
  e.style.outline = '2px solid red';
  return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), fs: cs.fontSize, pad: cs.padding };
});
console.log('\n=== #_focus-toggle ===', JSON.stringify(ft));
await p.screenshot({ path: `${S}/focus-toggle-20px-360.png`, clip: { x: 0, y: 56, width: 360, height: 150 } });
console.log('shot: focus-toggle-20px-360.png');

/* 4. whiteboard diagram labels at 9px */
await p.goto(`${URL}#content-pipeline/wb`, { waitUntil: 'load' });
await p.waitForTimeout(1000);
const dg = await p.evaluate(() => {
  const sr = document.querySelector('deep-whiteboard').shadowRoot;
  const d = sr.querySelector('details.disc');
  if (d) d.open = true;
  return [...sr.querySelectorAll('.dgm-lbl')].map(e => ({ fs: getComputedStyle(e).fontSize, txt: e.textContent.trim().slice(0, 40) }));
});
console.log('\n=== whiteboard .dgm-lbl (diagram connector labels) ===');
dg.forEach(d => console.log(`  ${d.fs} | "${d.txt}"`));
await p.waitForTimeout(400);
await p.screenshot({ path: `${S}/wb-diagram-9px-labels-360.png`, fullPage: true });
console.log('shot: wb-diagram-9px-labels-360.png');

/* 5. the seg tab strip: is the active tab scrolled into view? */
console.log('\n=== .seg strip: active tab reachable? ===');
for (const pane of ['walk', 'open', 'rf']) {
  await p.goto(`${URL}#content-pipeline/${pane}`, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const seg = await p.evaluate(() => {
    const s = document.querySelector('.sidebar .seg');
    const on = s.querySelector('button.on');
    const sb = s.getBoundingClientRect(), ob = on.getBoundingClientRect();
    return {
      tab: on.dataset.tab, segScrollLeft: Math.round(s.scrollLeft),
      segScrollW: s.scrollWidth, segClientW: s.clientWidth,
      activeVisible: ob.left >= sb.left - 1 && ob.right <= sb.right + 1,
      activeLeft: +ob.left.toFixed(0), activeRight: +ob.right.toFixed(0), segRight: +sb.right.toFixed(0)
    };
  });
  console.log(`  ${pane}: activeTabVisible=${seg.activeVisible} (tab x=${seg.activeLeft}..${seg.activeRight}, strip right=${seg.segRight}, scrollLeft=${seg.segScrollLeft}/${seg.segScrollW - seg.segClientW})`);
}
await b.close();
