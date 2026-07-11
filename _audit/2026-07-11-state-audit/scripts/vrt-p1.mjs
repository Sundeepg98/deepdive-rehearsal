// ADVERSARIAL VERIFY of rt-perf P1: "WebGL context + memory leak on every Visualize open;
// breaks at the 17th open". Independent instrumentation + forced-GC metric series.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 } });

// --- independent GL-context census: pure pass-through wrapper, records every ctx made.
await page.addInitScript(() => {
  window.__ctxs = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = orig.call(this, type, ...rest);
    if (c && /webgl/i.test(type) && !window.__ctxs.includes(c)) window.__ctxs.push(c);
    return c;
  };
  window.__lost = 0;
  window.addEventListener('webglcontextlost', () => { window.__lost++; }, true);
});

const warnings = [];
page.on('console', m => {
  const t = m.text();
  if (/Too many active WebGL contexts/i.test(t)) warnings.push({ type: m.type(), text: t });
});

const cdp = await page.context().newCDPSession(page);
await cdp.send('HeapProfiler.enable');
await cdp.send('Performance.enable');

async function metrics() {
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(250);
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  const g = k => (m.find(x => x.name === k) || {}).value;
  const live = await page.evaluate(() => ({
    ctxTotal: window.__ctxs.length,
    ctxAlive: window.__ctxs.filter(c => !c.isContextLost()).length,
    ctxLost: window.__ctxs.filter(c => c.isContextLost()).length,
    lostEvents: window.__lost,
    canvases: document.querySelectorAll('canvas').length +
      [...document.querySelectorAll('*')].filter(e => e.shadowRoot)
        .reduce((n, e) => n + e.shadowRoot.querySelectorAll('canvas').length, 0),
  }));
  return {
    heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2),
    nodes: g('Nodes'),
    listeners: g('JSEventListeners'),
    ...live,
  };
}

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.locator('#_index-overlay [data-topic="kafka-internals"]').first().click();
await page.waitForTimeout(1200);

const viz = page.locator('button[data-tab="viz"]:visible').first();
const walk = page.locator('button[data-tab="walk"]:visible').first();

console.log('cycle | heapMB | nodes | listeners | ctxTotal | ctxAlive | ctxLost | lostEvt | canvases');
const base = await metrics();
console.log('  base|', JSON.stringify(base));

const N = 20;
for (let i = 1; i <= N; i++) {
  await viz.click();
  await page.waitForTimeout(700);
  await walk.click();
  await page.waitForTimeout(500);
  const m = await metrics();
  console.log(`  ${String(i).padStart(4)}| ${m.heapMB} | ${m.nodes} | ${m.listeners} | ${m.ctxTotal} | ${m.ctxAlive} | ${m.ctxLost} | ${m.lostEvents} | ${m.canvases}`);
  if (warnings.length) console.log(`        ^^ CONTEXT-CAP WARNING FIRED at cycle ${i}: ${JSON.stringify(warnings[0])}`);
}

console.log('\nTOTAL "Too many active WebGL contexts" warnings:', warnings.length);
if (warnings[0]) console.log('VERBATIM:', warnings[0].text);

// Does the window 'resize' listener really retain each renderer? Count them by
// firing a resize and seeing how many canvases get resized (each live scene re-sizes its own).
const resizeProof = await page.evaluate(() => {
  const before = window.__ctxs.map(c => [c.drawingBufferWidth, c.drawingBufferHeight]);
  window.dispatchEvent(new Event('resize'));
  const after = window.__ctxs.map(c => [c.drawingBufferWidth, c.drawingBufferHeight]);
  let changed = 0;
  for (let i = 0; i < before.length; i++) {
    if (before[i][0] !== after[i][0] || before[i][1] !== after[i][1]) changed++;
  }
  return { contexts: before.length, respondedToResize: changed, before: before.slice(0, 5), after: after.slice(0, 5) };
});
console.log('\nRESIZE-LISTENER RETENTION PROOF:', JSON.stringify(resizeProof));
console.log('  (each context whose buffer CHANGED still has a live window-resize listener holding its renderer)');

await b.close();
