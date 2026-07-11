// PRECISE heap via CDP (Runtime.getHeapUsage) + forced GC. Leak test across topic switches.
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

const cdp = await p.context().newCDPSession(p);
await cdp.send('HeapProfiler.enable');
await cdp.send('Performance.enable');

async function heap(label) {
  await cdp.send('HeapProfiler.collectGarbage');   // real, full GC
  await new Promise(r => setTimeout(r, 250));
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 250));
  const { usedSize, totalSize } = await cdp.send('Runtime.getHeapUsage');
  const perf = await cdp.send('Performance.getMetrics');
  const g = n => (perf.metrics.find(m => m.name === n) || {}).value;
  const dom = await p.evaluate(() => ({
    nodes: document.querySelectorAll('*').length,
    svg: document.querySelectorAll('svg').length,
    detached: 0,
  }));
  return {
    label,
    heapMB: +(usedSize / 1048576).toFixed(2),
    totalMB: +(totalSize / 1048576).toFixed(2),
    domNodes: g('Nodes'),
    jsEventListeners: g('JSEventListeners'),
    domNodesQ: dom.nodes,
    svgMounted: dom.svg,
  };
}

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2500);

const series = [];
series.push(await heap('after boot (index overlay)'));

// Discover the real topic list from the index overlay
const topics = await p.evaluate(() => [...document.querySelectorAll('[data-topic]')].map(e => e.getAttribute('data-topic')));
const uniq = [...new Set(topics)];
console.log('topics found via [data-topic]:', uniq.length);
console.log('sample:', uniq.slice(0, 12).join(', '));

await p.screenshot({ path: `${SHOTS}/01-index-overlay.png` });

// ---- open the first topic ----
async function openTopic(slug) {
  await p.evaluate(s => {
    const el = document.querySelector(`[data-topic="${s}"]`);
    if (el) el.click();
  }, slug);
  await p.waitForTimeout(450);
}

const walk = uniq.slice(0, 12);
console.log('\n=== LEAK TEST: visiting', walk.length, 'topics, forcing GC after each ===');
console.log('label'.padEnd(34), 'heapMB'.padStart(8), 'totalMB'.padStart(8), 'domNodes'.padStart(9), 'listeners'.padStart(10), 'svg'.padStart(4));
const pr = r => console.log(r.label.padEnd(34), String(r.heapMB).padStart(8), String(r.totalMB).padStart(8), String(r.domNodes).padStart(9), String(r.jsEventListeners).padStart(10), String(r.svgMounted).padStart(4));
pr(series[0]);

for (let i = 0; i < walk.length; i++) {
  await openTopic(walk[i]);
  const r = await heap(`${i + 1}. ${walk[i]}`);
  series.push(r); pr(r);
  if (i === 0) await p.screenshot({ path: `${SHOTS}/02-topic-first.png` });
}

// second pass over the SAME topics: if heap keeps climbing on a repeat visit, it's a leak
console.log('\n=== SECOND PASS over the same 12 topics (repeat visits) ===');
for (let i = 0; i < walk.length; i++) {
  await openTopic(walk[i]);
  const r = await heap(`P2 ${i + 1}. ${walk[i]}`);
  series.push(r); pr(r);
}

const first = series[1], afterP1 = series[walk.length], afterP2 = series[series.length - 1];
console.log('\n=== LEAK VERDICT ===');
console.log('heap after 1st topic       :', first.heapMB, 'MB   listeners:', first.jsEventListeners);
console.log('heap after pass 1 (12)     :', afterP1.heapMB, 'MB   listeners:', afterP1.jsEventListeners);
console.log('heap after pass 2 (24 tot) :', afterP2.heapMB, 'MB   listeners:', afterP2.jsEventListeners);
console.log('growth pass1->pass2        :', +(afterP2.heapMB - afterP1.heapMB).toFixed(2), 'MB');
console.log('listener growth p1->p2     :', afterP2.jsEventListeners - afterP1.jsEventListeners);
const heaps = series.map(s => s.heapMB);
let mono = true;
for (let i = 2; i < heaps.length; i++) if (heaps[i] < heaps[i - 1]) mono = false;
console.log('monotonically increasing?  :', mono);
console.log('heap series                :', heaps.join(' -> '));
console.log('listener series            :', series.map(s => s.jsEventListeners).join(' -> '));

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/heap-series.json', JSON.stringify(series, null, 2));
await p.screenshot({ path: `${SHOTS}/03-after-24-switches.png` });
await b.close();
