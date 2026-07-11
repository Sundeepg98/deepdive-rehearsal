// Interaction latency: topic switch + pane switch (incl. the 20KB-SVG whiteboard) + long tasks.
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

await p.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); })
    .observe({ entryTypes: ['longtask'] });
});

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.evaluate(() => { window.__lt.length = 0; });   // clear boot tasks

const topics = [...new Set(await p.evaluate(() => [...document.querySelectorAll('[data-topic]')].map(e => e.getAttribute('data-topic'))))];

// ---------- TOPIC SWITCH LATENCY (synchronous main-thread cost of the click handler) ----------
async function timeTopic(slug) {
  return await p.evaluate(s => {
    const el = document.querySelector(`[data-topic="${s}"]`);
    if (!el) return null;
    const t0 = performance.now();
    el.click();                       // synchronous handler work
    const tClick = performance.now() - t0;
    // force layout to include style+layout cost
    void document.body.offsetHeight;
    const tLayout = performance.now() - t0;
    return { click: +tClick.toFixed(1), clickPlusLayout: +tLayout.toFixed(1) };
  }, slug);
}

console.log('=== TOPIC SWITCH: synchronous main-thread cost (ms) ===');
console.log('topic'.padEnd(28), 'handler'.padStart(9), '+layout'.padStart(9));
const tt = [];
for (const s of topics.slice(0, 15)) {
  const r = await timeTopic(s);
  await p.waitForTimeout(300);
  if (r) { tt.push(r); console.log(s.padEnd(28), String(r.click).padStart(9), String(r.clickPlusLayout).padStart(9)); }
}
const med = a => { const x = [...a].sort((u, v) => u - v); return x[Math.floor(x.length / 2)]; };
console.log('median handler:', med(tt.map(r => r.click)), 'ms   median +layout:', med(tt.map(r => r.clickPlusLayout)), 'ms   max +layout:', Math.max(...tt.map(r => r.clickPlusLayout)), 'ms');

// ---------- PANE SWITCH LATENCY (the 9 panes; wb mounts a ~20KB mermaid SVG) ----------
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];
console.log('\n=== PANE SWITCH: synchronous cost (ms), topic = kafka-internals ===');
await p.evaluate(() => { const el = document.querySelector('[data-topic="kafka-internals"]'); if (el) el.click(); });
await p.waitForTimeout(600);

console.log('pane'.padEnd(10), 'handler'.padStart(9), '+layout'.padStart(9), 'domNodes'.padStart(9), 'svg'.padStart(5), 'canvas'.padStart(7), 'listeners'.padStart(10));
const paneRows = [];
for (const pane of PANES) {
  const r = await p.evaluate(id => {
    const el = document.getElementById(id);
    if (!el) return { missing: true };
    const t0 = performance.now();
    el.click();
    const tc = performance.now() - t0;
    void document.body.offsetHeight;
    const tl = performance.now() - t0;
    return {
      click: +tc.toFixed(1), clickPlusLayout: +tl.toFixed(1),
      nodes: document.querySelectorAll('*').length,
      svg: document.querySelectorAll('svg').length,
      canvas: document.querySelectorAll('canvas').length,
    };
  }, pane);
  await p.waitForTimeout(700);
  if (r.missing) { console.log(pane.padEnd(10), 'NO SUCH ELEMENT'); continue; }
  const lis = await p.evaluate(() => 0);
  paneRows.push({ pane, ...r });
  console.log(pane.padEnd(10), String(r.click).padStart(9), String(r.clickPlusLayout).padStart(9), String(r.nodes).padStart(9), String(r.svg).padStart(5), String(r.canvas).padStart(7));
  if (pane === 'wb') await p.screenshot({ path: `${SHOTS}/04-pane-wb-mermaid.png` });
  if (pane === 'viz') await p.screenshot({ path: `${SHOTS}/05-pane-viz-three.png` });
}

// ---------- LONG TASKS accumulated during all that interaction ----------
const lt = await p.evaluate(() => window.__lt);
console.log('\n=== LONG TASKS (>50ms) during 15 topic switches + 10 pane switches ===');
console.log('count:', lt.length, ' total:', lt.reduce((a, x) => a + x.d, 0).toFixed(0), 'ms  max:', lt.length ? Math.max(...lt.map(x => x.d)).toFixed(0) : 0, 'ms');
console.log(JSON.stringify(lt.map(x => +x.d.toFixed(0))));

// ---------- Does the viz pane spin up WebGL? and is three.js eval'd at boot? ----------
const webgl = await p.evaluate(() => ({
  canvases: document.querySelectorAll('canvas').length,
  hasTHREE: typeof window.THREE !== 'undefined',
  globalsWithThree: Object.keys(window).filter(k => /three|kit|viz|visual/i.test(k)),
}));
console.log('\n=== VISUAL KIT (three.js, 493KB) ===');
console.log(JSON.stringify(webgl));

await b.close();
