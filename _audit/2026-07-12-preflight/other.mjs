// Name the "other" bucket. 55% of the boot-time growth landed in it; an unexplained
// 1.2s bucket is not a measurement, it's a shrug. Enumerate by raw trace event name.
import { chromium } from 'playwright';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight';
const URLS = { BEFORE: `file:///${OUT}/before_master.html`, AFTER: 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html' };
const KNOWN = new Set(['ParseHTML', 'EvaluateScript', 'FunctionCall', 'Layout', 'UpdateLayoutTree', 'ParseAuthorStyleSheet', 'Paint', 'PrePaint', 'CompositeLayers', 'Layerize', 'MajorGC', 'MinorGC', 'BlinkGC.AtomicPhase', 'TimerFire', 'EventDispatch', 'RunTask', 'RunMicrotasks', 'ProfileCall']);

async function run(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const raw = [];
  cdp.on('Tracing.dataCollected', (d) => raw.push(...d.value));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline'] }, transferMode: 'ReportEvents' });
  await p.goto(url, { waitUntil: 'load', timeout: 240000 });
  await p.waitForFunction(() => { const s = document.getElementById('_bootsplash'); return !s || s.classList.contains('_bs-done'); }, null, { timeout: 120000 }).catch(() => {});
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  await ctx.close();

  const seen = new Set(); const evs = [];
  for (const e of raw) { if (e.ph !== 'X' || !e.dur) continue; const k = `${e.pid}|${e.tid}|${e.ts}|${e.name}|${e.dur}`; if (seen.has(k)) continue; seen.add(k); evs.push(e); }
  const bt = new Map();
  for (const e of evs) { const k = `${e.pid}|${e.tid}`; bt.set(k, (bt.get(k) || 0) + e.dur); }
  const mk = [...bt.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const main = evs.filter((e) => `${e.pid}|${e.tid}` === mk).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const self = new Map(); const st = [];
  const acct = (f) => { const s = Math.max(0, f.dur - f.childDur); if (!KNOWN.has(f.name)) self.set(f.name, (self.get(f.name) || 0) + s); };
  for (const e of main) {
    while (st.length && st[st.length - 1].end <= e.ts) acct(st.pop());
    if (st.length) st[st.length - 1].childDur += e.dur;
    st.push({ name: e.name, end: e.ts + e.dur, dur: e.dur, childDur: 0 });
  }
  while (st.length) acct(st.pop());
  return new Map([...self.entries()].map(([k, v]) => [k, Math.round(v / 1000)]));
}

const browser = await chromium.launch();
const bm = await run(browser, URLS.BEFORE);
const am = await run(browser, URLS.AFTER);
await browser.close();
const keys = [...new Set([...bm.keys(), ...am.keys()])];
console.log('\n--- what is inside "other"? (self ms, main thread, CPU 4x) ---');
console.log('event'.padEnd(36) + 'BEFORE'.padStart(7) + 'AFTER'.padStart(8) + 'DELTA'.padStart(8));
for (const r of keys.map((k) => ({ k, b: bm.get(k) || 0, a: am.get(k) || 0 })).sort((x, y) => (y.a - y.b) - (x.a - x.b)).slice(0, 15))
  console.log(r.k.slice(0, 35).padEnd(36) + String(r.b).padStart(7) + String(r.a).padStart(8) + ((r.a - r.b >= 0 ? '+' : '') + (r.a - r.b)).padStart(8));
