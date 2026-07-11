// Where does the ~500ms of boot blocking time actually GO?
// V8 compile vs script execute vs style vs layout, via CDP Performance metrics.
// Then a COUNTERFACTUAL: strip the three.js kit and the 796KB of SVGs, re-measure boot.
import { chromium } from 'playwright';
import fs from 'node:fs';

const DIST = 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const TMP = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts';

async function boot(url, label) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Performance.enable');
  await cdp.send('HeapProfiler.enable');
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__lt = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ entryTypes: ['longtask'] });
  });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(2200);

  const pm = await cdp.send('Performance.getMetrics');
  const g = n => { const m = pm.metrics.find(x => x.name === n); return m ? m.value : null; };
  const nav = await p.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, e.startTime]));
    return {
      domInteractive: +n.domInteractive.toFixed(0),
      load: +n.loadEventEnd.toFixed(0),
      fcp: paints['first-contentful-paint'] ? +paints['first-contentful-paint'].toFixed(0) : null,
      lt: window.__lt.map(d => +d.toFixed(0)),
      ltTotal: +window.__lt.reduce((a, x) => a + x, 0).toFixed(0),
    };
  });
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 300));
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');

  await b.close();
  return {
    label,
    bytes: fs.statSync(url.replace('file:///', '')).size,
    domInteractive: nav.domInteractive,
    load: nav.load,
    fcp: nav.fcp,
    blockingMs: nav.ltTotal,
    longTasks: nav.lt,
    v8CompileMs: g('V8CompileDuration') != null ? +(g('V8CompileDuration') * 1000).toFixed(0) : null,
    scriptMs: +(g('ScriptDuration') * 1000).toFixed(0),
    styleMs: +(g('RecalcStyleDuration') * 1000).toFixed(0),
    layoutMs: +(g('LayoutDuration') * 1000).toFixed(0),
    taskMs: +(g('TaskDuration') * 1000).toFixed(0),
    heapMB: +(usedSize / 1048576).toFixed(2),
    errors: errs.length,
  };
}

const src = fs.readFileSync(DIST, 'utf8');

// --- variant A: three.js visual kit removed (that <script> is 492,963B @164347) ---
const kitOpen = 164347;
const kitClose = src.indexOf('</script>', src.indexOf('>', kitOpen)) + 9;
const noKit = src.slice(0, kitOpen) + '<script>window.VisualKit=null;</script>' + src.slice(kitClose);
fs.writeFileSync(`${TMP}/_v-nokit.html`, noKit);

// --- variant B: kit removed AND all 39 mermaid SVGs blanked ---
let noSvg = noKit;
{
  let out = '', i = 0;
  for (;;) {
    const a = noSvg.indexOf('<svg', i);
    if (a === -1) { out += noSvg.slice(i); break; }
    const z = noSvg.indexOf('</svg>', a);
    if (z === -1) { out += noSvg.slice(i); break; }
    if (z - a > 5000) { out += noSvg.slice(i, a) + '<svg></svg>'; i = z + 6; }
    else { out += noSvg.slice(i, z + 6); i = z + 6; }
  }
  noSvg = out;
}
fs.writeFileSync(`${TMP}/_v-nokit-nosvg.html`, noSvg);

console.log('variant sizes:');
console.log('  full          :', fs.statSync(DIST).size);
console.log('  -kit          :', fs.statSync(`${TMP}/_v-nokit.html`).size);
console.log('  -kit -svg     :', fs.statSync(`${TMP}/_v-nokit-nosvg.html`).size);

const runs = [];
for (const [url, label] of [
  [`file:///${DIST}`, 'FULL (shipped)'],
  [`file:///${TMP}/_v-nokit.html`, 'minus three.js kit'],
  [`file:///${TMP}/_v-nokit-nosvg.html`, 'minus kit + 796KB SVG'],
]) {
  const a = await boot(url, label);
  const b2 = await boot(url, label);   // 2 runs, take the better
  runs.push(a.blockingMs <= b2.blockingMs ? a : b2);
}

console.log('\n=== BOOT COST ATTRIBUTION (best of 2 runs each) ===');
const cols = ['bytes', 'domInteractive', 'fcp', 'blockingMs', 'v8CompileMs', 'scriptMs', 'styleMs', 'layoutMs', 'heapMB', 'errors'];
console.log('metric'.padEnd(16), ...runs.map(r => r.label.padStart(22)));
for (const c of cols) {
  console.log(c.padEnd(16), ...runs.map(r => String(r[c]).padStart(22)));
}
console.log('\nlong tasks per variant:');
for (const r of runs) console.log('  ', r.label.padEnd(24), JSON.stringify(r.longTasks));
