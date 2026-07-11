// Pane-switch cost using the REAL tab buttons. Focus: wb (20KB mermaid SVG) + viz (three.js WebGL).
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
const cdp = await p.context().newCDPSession(p);
await cdp.send('HeapProfiler.enable');
const heap = async () => {
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 200));
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  return +(usedSize / 1048576).toFixed(2);
};

await p.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ d: e.duration }); }).observe({ entryTypes: ['longtask'] });
});
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2200);
await p.evaluate(() => { window.__lt.length = 0; });

await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
await p.waitForTimeout(800);

const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];
console.log('=== PANE SWITCH (topic=kafka-internals), real tab buttons ===');
console.log('pane'.padEnd(8), 'handler'.padStart(9), '+layout'.padStart(9), 'nodes'.padStart(7), 'svg'.padStart(4), 'canvas'.padStart(7), 'heapMB'.padStart(8), 'paneHTML'.padStart(9));
for (const pane of PANES) {
  const r = await p.evaluate(id => {
    const btn = document.querySelector(`button[data-tab="${id}"]`);
    const t0 = performance.now();
    btn.click();
    const tc = performance.now() - t0;
    void document.body.offsetHeight;
    const tl = performance.now() - t0;
    return {
      click: +tc.toFixed(1), tl: +tl.toFixed(1),
      nodes: document.querySelectorAll('*').length,
      svg: document.querySelectorAll('svg').length,
      canvas: document.querySelectorAll('canvas').length,
      paneHTML: (document.getElementById(id)?.innerHTML || '').length,
    };
  }, pane);
  await p.waitForTimeout(900);
  const h = await heap();
  console.log(pane.padEnd(8), String(r.click).padStart(9), String(r.tl).padStart(9), String(r.nodes).padStart(7), String(r.svg).padStart(4), String(r.canvas).padStart(7), String(h).padStart(8), String(r.paneHTML).padStart(9));
  if (pane === 'wb') await p.screenshot({ path: `${SHOTS}/04-pane-wb-mermaid.png` });
  if (pane === 'sys') await p.screenshot({ path: `${SHOTS}/06-pane-sys.png` });
  if (pane === 'viz') { await p.waitForTimeout(2500); await p.screenshot({ path: `${SHOTS}/05-pane-viz-three.png` }); }
}

// after viz: did WebGL spin up? measure heap + canvas
await p.waitForTimeout(1500);
const post = await p.evaluate(() => ({
  canvas: document.querySelectorAll('canvas').length,
  ctx: (() => { const c = document.querySelector('canvas'); if (!c) return null; return { w: c.width, h: c.height }; })(),
  visualKit: typeof window.VisualKit,
  three: typeof window.__THREE__,
}));
console.log('\n=== after opening viz pane ===');
console.log(JSON.stringify(post), ' heap:', await heap(), 'MB');

// Re-open viz 5x: does the WebGL context / three scene leak?
console.log('\n=== viz OPEN/CLOSE x5 (WebGL context leak check) ===');
for (let i = 0; i < 5; i++) {
  await p.evaluate(() => document.querySelector('button[data-tab="walk"]').click());
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(1400);
  const c = await p.evaluate(() => document.querySelectorAll('canvas').length);
  console.log(`cycle ${i + 1}: canvases=${c}  heap=${await heap()}MB`);
}

const lt = await p.evaluate(() => window.__lt);
console.log('\nLong tasks during all pane work:', lt.length, 'total', lt.reduce((a, x) => a + x.d, 0).toFixed(0), 'ms', JSON.stringify(lt.map(x => +x.d.toFixed(0))));
await b.close();
