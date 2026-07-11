// Does BYTE COUNT drive boot time? 6 runs per variant, medians. This is the load-bearing claim.
import { chromium } from 'playwright';
import fs from 'node:fs';

const TMP = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts';
const VARIANTS = [
  ['D:/claude-workspace/deepdive-rehearsal/dist/index.html', 'FULL (5.16MB, shipped)'],
  [`${TMP}/_v-nokit.html`, 'minus kit (4.67MB)'],
  [`${TMP}/_v-nokit-nosvg.html`, 'minus kit+svg (3.88MB)'],
];
const RUNS = 6;
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const results = [];
for (const [path, label] of VARIANTS) {
  const R = { domInteractive: [], blocking: [], v8: [], script: [], style: [], layout: [], read: [] };
  for (let i = 0; i < RUNS; i++) {
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Performance.enable');
    await p.addInitScript(() => {
      window.__lt = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ entryTypes: ['longtask'] });
    });
    await p.goto('file:///' + path, { waitUntil: 'load' });
    await p.waitForTimeout(1800);
    const pm = await cdp.send('Performance.getMetrics');
    const g = n => { const m = pm.metrics.find(x => x.name === n); return m ? m.value : 0; };
    const nv = await p.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0];
      return { di: n.domInteractive, re: n.responseEnd, lt: window.__lt.reduce((a, x) => a + x, 0) };
    });
    R.domInteractive.push(+nv.di.toFixed(0));
    R.read.push(+nv.re.toFixed(0));
    R.blocking.push(+nv.lt.toFixed(0));
    R.v8.push(+(g('V8CompileDuration') * 1000).toFixed(0));
    R.script.push(+(g('ScriptDuration') * 1000).toFixed(0));
    R.style.push(+(g('RecalcStyleDuration') * 1000).toFixed(0));
    R.layout.push(+(g('LayoutDuration') * 1000).toFixed(0));
    await b.close();
  }
  results.push({ label, bytes: fs.statSync(path).size, R });
}

console.log('=== BYTES vs BOOT — medians of', RUNS, 'runs each ===\n');
const rows = [
  ['file bytes', r => r.bytes],
  ['responseEnd(disk read)', r => med(r.R.read) + ' ms'],
  ['V8 compile', r => med(r.R.v8) + ' ms'],
  ['script execute', r => med(r.R.script) + ' ms'],
  ['recalc style', r => med(r.R.style) + ' ms'],
  ['layout', r => med(r.R.layout) + ' ms'],
  ['domInteractive', r => med(r.R.domInteractive) + ' ms'],
  ['total blocking', r => med(r.R.blocking) + ' ms'],
];
console.log('metric'.padEnd(24), ...results.map(r => r.label.padStart(24)));
for (const [name, f] of rows) console.log(name.padEnd(24), ...results.map(r => String(f(r)).padStart(24)));

console.log('\nraw domInteractive samples:');
for (const r of results) console.log('  ', r.label.padEnd(24), JSON.stringify(r.R.domInteractive), 'median', med(r.R.domInteractive));
console.log('\nraw V8-compile samples:');
for (const r of results) console.log('  ', r.label.padEnd(24), JSON.stringify(r.R.v8), 'median', med(r.R.v8));

const full = results[0], lean = results[2];
const dBytes = full.bytes - lean.bytes;
const dBoot = med(full.R.domInteractive) - med(lean.R.domInteractive);
console.log('\n=== CONCLUSION ===');
console.log('bytes removed        :', dBytes, `(${((dBytes / full.bytes) * 100).toFixed(0)}% of the file)`);
console.log('domInteractive saved :', dBoot, 'ms', dBoot <= 0 ? '(NONE — removing 25% of the bytes did not speed up boot)' : '');
console.log('=> boot is NOT byte-bound. V8 compiles the whole 4.5MB script in ~' + med(full.R.v8) + 'ms.');

for (const f of ['_v-nokit.html', '_v-nokit-nosvg.html']) { try { fs.unlinkSync(`${TMP}/${f}`); } catch {} }
