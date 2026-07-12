// Trace v2 -- reconcile the Layout contradiction.
// v1 summed raw event durations across overlapping trace categories, which double-counts
// nested events (a Layout inside a Layout inside a RunTask). Here: ONE category, main thread
// only, and SELF-TIME (dur minus the dur of directly-nested children) so every microsecond is
// attributed exactly once. Cross-checked against Performance.getMetrics counters.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const OUT = path.join(ROOT, '_audit/2026-07-12-preflight');
const URLS = {
  BEFORE: `file:///${OUT}/before_master.html`.replace(/\\/g, '/'),
  AFTER: `file:///${ROOT}/dist/index.html`,
};
const CPU = Number(process.env.CPU || 4);
const RUNS = Number(process.env.RUNS || 3);
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2); };

const NAME = (n) => {
  if (n === 'ParseHTML') return 'ParseHTML';
  if (n === 'EvaluateScript') return 'EvaluateScript';
  if (n === 'FunctionCall') return 'FunctionCall';
  if (n === 'Layout') return 'Layout';
  if (n === 'UpdateLayoutTree') return 'Style recalc';
  if (n === 'ParseAuthorStyleSheet') return 'Parse CSS';
  if (n === 'Paint' || n === 'PrePaint' || n === 'CompositeLayers' || n === 'Layerize') return 'Paint/Composite';
  if (n === 'MajorGC' || n === 'MinorGC' || n === 'BlinkGC.AtomicPhase') return 'GC';
  if (n === 'TimerFire' || n === 'EventDispatch' || n === 'RunTask' || n === 'RunMicrotasks' || n === 'ProfileCall') return 'container';
  return 'other';
};

async function run(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

  const raw = [];
  cdp.on('Tracing.dataCollected', (d) => raw.push(...d.value));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline'] }, transferMode: 'ReportEvents' });

  await page.addInitScript(() => {
    window.__m = { ready: null };
    let real = null;
    Object.defineProperty(window, '_hideBootSplash', {
      configurable: true,
      get() { return real ? function () { if (window.__m.ready === null) window.__m.ready = performance.now(); return real.apply(this, arguments); } : undefined; },
      set(v) { real = v; },
    });
  });
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => { const s = document.getElementById('_bootsplash'); return !s || s.classList.contains('_bs-done'); }, null, { timeout: 120000 }).catch(() => {});
  const ready = await page.evaluate(() => Math.round(window.__m.ready || 0));
  const proof = await page.evaluate(() => ({
    textLen: (document.body.innerText || '').trim().length,
    shadow: [...document.querySelectorAll('body *')].reduce((a, e) => a + (e.shadowRoot ? e.shadowRoot.querySelectorAll('*').length : 0), 0),
  }));
  const pm = await cdp.send('Performance.getMetrics');
  const M = Object.fromEntries(pm.metrics.map((x) => [x.name, x.value]));
  const counters = { script: Math.round(M.ScriptDuration * 1000), layout: Math.round(M.LayoutDuration * 1000), style: Math.round(M.RecalcStyleDuration * 1000), task: Math.round(M.TaskDuration * 1000) };

  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  await ctx.close();

  // --- dedupe + pick the busiest thread (renderer main) ---
  const seen = new Set();
  const evs = [];
  for (const e of raw) {
    if (e.ph !== 'X' || !e.dur) continue;
    const k = `${e.pid}|${e.tid}|${e.ts}|${e.name}|${e.dur}`;
    if (seen.has(k)) continue;
    seen.add(k);
    evs.push(e);
  }
  const byThread = new Map();
  for (const e of evs) { const k = `${e.pid}|${e.tid}`; byThread.set(k, (byThread.get(k) || 0) + e.dur); }
  const mainKey = [...byThread.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const main = evs.filter((e) => `${e.pid}|${e.tid}` === mainKey).sort((a, b) => a.ts - b.ts || b.dur - a.dur);

  // --- SELF TIME: dur minus directly-nested children (stack walk) ---
  const self = new Map();
  const stack = [];
  for (const e of main) {
    while (stack.length && stack[stack.length - 1].end <= e.ts) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) parent.childDur += e.dur;
    stack.push({ name: e.name, end: e.ts + e.dur, dur: e.dur, childDur: 0, _e: e });
    // when popped we account; easier: post-process below
  }
  // redo with explicit accounting
  const st = [];
  for (const e of main) {
    while (st.length && st[st.length - 1].end <= e.ts) { const f = st.pop(); const s = f.dur - f.childDur; const n = NAME(f.name); self.set(n, (self.get(n) || 0) + Math.max(0, s)); }
    if (st.length) st[st.length - 1].childDur += e.dur;
    st.push({ name: e.name, end: e.ts + e.dur, dur: e.dur, childDur: 0 });
  }
  while (st.length) { const f = st.pop(); const s = f.dur - f.childDur; const n = NAME(f.name); self.set(n, (self.get(n) || 0) + Math.max(0, s)); }

  const agg = Object.fromEntries([...self.entries()].map(([k, v]) => [k, Math.round(v / 1000)]));
  return { ready, proof, counters, agg };
}

const browser = await chromium.launch();
const res = { BEFORE: [], AFTER: [] };
for (let i = 0; i < RUNS; i++) for (const b of ['BEFORE', 'AFTER']) res[b].push(await run(browser, URLS[b]));
await browser.close();

console.log(`\n===== SELF-TIME BREAKDOWN (main thread, devtools.timeline only, deduped) =====`);
console.log(`mobile 390x844, CPU x${CPU}, n=${RUNS} interleaved, median ms`);
console.log(`render proof: BEFORE txt=${res.BEFORE[0].proof.textLen}/shadow=${res.BEFORE[0].proof.shadow}  AFTER txt=${res.AFTER[0].proof.textLen}/shadow=${res.AFTER[0].proof.shadow}`);
console.log(`ready: ${med(res.BEFORE.map((r) => r.ready))} -> ${med(res.AFTER.map((r) => r.ready))} ms\n`);

const keys = [...new Set([...res.BEFORE, ...res.AFTER].flatMap((r) => Object.keys(r.agg)))].filter((k) => k !== 'container');
const rows = keys.map((k) => { const b = med(res.BEFORE.map((r) => r.agg[k] || 0)); const a = med(res.AFTER.map((r) => r.agg[k] || 0)); return { k, b, a, d: a - b }; }).sort((x, y) => y.d - x.d);
const growth = rows.filter((r) => r.d > 0).reduce((s, r) => s + r.d, 0);
console.log(`${'bucket (self time)'.padEnd(20)} ${'BEFORE'.padStart(7)} ${'AFTER'.padStart(7)} ${'DELTA'.padStart(7)}  share`);
for (const r of rows) console.log(`${r.k.padEnd(20)} ${String(r.b).padStart(7)} ${String(r.a).padStart(7)} ${((r.d >= 0 ? '+' : '') + r.d).padStart(7)}  ${r.d > 0 ? ((r.d / growth) * 100).toFixed(0) + '%' : '-'}`);
console.log(`\ntotal growth: +${growth} ms`);

console.log(`\n--- cross-check: renderer counters (Performance.getMetrics) ---`);
for (const c of ['script', 'layout', 'style', 'task']) {
  const b = med(res.BEFORE.map((r) => r.counters[c])), a = med(res.AFTER.map((r) => r.counters[c]));
  console.log(`  ${c.padEnd(8)} ${String(b).padStart(6)} -> ${String(a).padStart(6)}  (${(a - b >= 0 ? '+' : '') + (a - b)})`);
}
fs.writeFileSync(path.join(OUT, 'trace2.json'), JSON.stringify({ rows, res }, null, 2));
console.log('\nwrote trace2.json');
