// Confirm/characterise the viz-pane leak. Pierce shadow DOM for true node/canvas counts.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
const cdp = await p.context().newCDPSession(p);
await cdp.send('HeapProfiler.enable');
await cdp.send('Performance.enable');

async function snap() {
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 220));
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 220));
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  const pm = await cdp.send('Performance.getMetrics');
  const g = n => (pm.metrics.find(m => m.name === n) || {}).value;
  const deep = await p.evaluate(() => {
    // walk light + shadow DOM
    let els = 0, canvases = 0, svgs = 0, shadows = 0;
    const walk = root => {
      for (const el of root.querySelectorAll('*')) {
        els++;
        const t = el.tagName.toLowerCase();
        if (t === 'canvas') canvases++;
        if (t === 'svg') svgs++;
        if (el.shadowRoot) { shadows++; walk(el.shadowRoot); }
      }
    };
    walk(document);
    return { els, canvases, svgs, shadows };
  });
  return {
    heapMB: +(usedSize / 1048576).toFixed(2),
    nodes: g('Nodes'),
    listeners: g('JSEventListeners'),
    contexts: g('JSHeapUsedSize') != null ? g('ContextLifecycleStateObserver') : undefined,
    ...deep,
  };
}

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
await p.waitForTimeout(900);

console.log('=== SHADOW-DOM-AWARE STATE (topic open, walk pane) ===');
const base = await snap();
console.log(JSON.stringify(base));

// what IS inside a pane?
const inner = await p.evaluate(() => {
  const pane = document.getElementById('walk');
  const child = pane.firstElementChild;
  return {
    paneInnerHTML: pane.innerHTML.slice(0, 160),
    childTag: child ? child.tagName : null,
    hasShadow: child ? !!child.shadowRoot : null,
    shadowChildCount: child && child.shadowRoot ? child.shadowRoot.querySelectorAll('*').length : 0,
    shadowHTMLLen: child && child.shadowRoot ? child.shadowRoot.innerHTML.length : 0,
  };
});
console.log('\n=== PANE INTERNALS ===');
console.log(JSON.stringify(inner, null, 2));

// ---- WebGL context tracking: patch getContext to count ----
await p.evaluate(() => {
  window.__glCount = 0; window.__glCtxs = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) {
    const c = orig.call(this, t, ...a);
    if (/webgl/i.test(t)) { window.__glCount++; window.__glCtxs.push(new WeakRef(c)); }
    return c;
  };
});

console.log('\n=== VIZ OPEN/CLOSE x10 (leak characterisation) ===');
console.log('cycle'.padStart(5), 'heapMB'.padStart(8), 'domNodes'.padStart(9), 'listeners'.padStart(10), 'els(deep)'.padStart(10), 'canvas'.padStart(7), 'glCtx'.padStart(6));
const series = [];
for (let i = 1; i <= 10; i++) {
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(1600);
  await p.evaluate(() => document.querySelector('button[data-tab="walk"]').click());
  await p.waitForTimeout(500);
  const s = await snap();
  const gl = await p.evaluate(() => window.__glCount);
  series.push({ ...s, gl });
  console.log(String(i).padStart(5), String(s.heapMB).padStart(8), String(s.nodes).padStart(9), String(s.listeners).padStart(10), String(s.els).padStart(10), String(s.canvases).padStart(7), String(gl).padStart(6));
  if (i === 1) await p.screenshot({ path: `${SHOTS}/07-viz-cycle1.png` });
}

const h = series.map(s => s.heapMB);
console.log('\n=== VERDICT ===');
console.log('heap series      :', h.join(' -> '));
console.log('first -> last    :', h[0], '->', h[h.length - 1], ' = +' + (h[h.length - 1] - h[0]).toFixed(2), 'MB over 10 cycles');
console.log('mean growth/cycle:', ((h[h.length - 1] - h[0]) / (h.length - 1)).toFixed(3), 'MB');
let mono = true; for (let i = 1; i < h.length; i++) if (h[i] < h[i - 1] - 0.05) mono = false;
console.log('monotonic (±0.05):', mono);
console.log('listeners        :', series.map(s => s.listeners).join(' -> '));
console.log('WebGL contexts   :', series.map(s => s.gl).join(' -> '));
console.log('canvases (deep)  :', series.map(s => s.canvases).join(' -> '));
console.log('domNodes         :', series.map(s => s.nodes).join(' -> '));

await b.close();
