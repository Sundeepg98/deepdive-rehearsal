// LOAD / PARSE / TTI measurement on the file:// artifact. 5 cold runs.
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const RUNS = 5;
const rows = [];

for (let r = 0; r < RUNS; r++) {
  const b = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const longTasks = [];
  await p.addInitScript(() => {
    window.__lt = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ start: e.startTime, dur: e.duration, name: e.name }); })
      .observe({ entryTypes: ['longtask'] });
    window.__t0 = performance.now();
  });
  if (r === 0) { p.on('pageerror', e => console.log('PAGE-ERROR:', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); }); }

  await p.goto(URL, { waitUntil: 'load' });
  // wait until idle-ish
  await p.waitForTimeout(2000);

  const m = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, +e.startTime.toFixed(1)]));
    const lt = window.__lt || [];
    return {
      // navigation timing (all relative to navigationStart)
      responseEnd: +nav.responseEnd.toFixed(1),          // artifact fully READ off disk
      domInteractive: +nav.domInteractive.toFixed(1),    // parser done w/ HTML
      domContentLoaded: +nav.domContentLoadedEventEnd.toFixed(1),
      loadEvent: +nav.loadEventEnd.toFixed(1),
      transferSize: nav.transferSize,
      decodedBodySize: nav.decodedBodySize,
      fp: paints['first-paint'] ?? null,
      fcp: paints['first-contentful-paint'] ?? null,
      longTasks: lt.map(x => ({ s: +x.start.toFixed(0), d: +x.dur.toFixed(0) })),
      longTaskTotal: +lt.reduce((a, x) => a + x.dur, 0).toFixed(0),
      longTaskMax: lt.length ? +Math.max(...lt.map(x => x.dur)).toFixed(0) : 0,
      heapUsed: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(2) : null,
      heapTotal: performance.memory ? +(performance.memory.totalJSHeapSize / 1048576).toFixed(2) : null,
      domNodes: document.querySelectorAll('*').length,
    };
  });
  rows.push(m);
  if (r === 0) {
    console.log('--- run 0 detail ---');
    console.log('long tasks:', JSON.stringify(m.longTasks));
    console.log('transferSize:', m.transferSize, ' decodedBodySize:', m.decodedBodySize);
  }
  await b.close();
}

const keys = ['responseEnd', 'domInteractive', 'domContentLoaded', 'loadEvent', 'fp', 'fcp', 'longTaskTotal', 'longTaskMax', 'heapUsed', 'heapTotal', 'domNodes'];
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log('\n=== LOAD TIMING, ' + RUNS + ' cold runs (ms; heap MB) ===');
console.log('metric'.padEnd(20), 'median'.padStart(9), 'min'.padStart(9), 'max'.padStart(9), '  all');
for (const k of keys) {
  const vals = rows.map(r => r[k]).filter(v => v != null);
  if (!vals.length) { console.log(k.padEnd(20), '   n/a'); continue; }
  console.log(
    k.padEnd(20),
    String(med(vals)).padStart(9),
    String(Math.min(...vals)).padStart(9),
    String(Math.max(...vals)).padStart(9),
    '  [' + vals.join(', ') + ']'
  );
}
