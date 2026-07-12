// WHERE does the +1.3s on mobile actually go? CDP devtools.timeline trace, aggregated by
// event name. This is the load-bearing question: the prior audit said "boot is layout-bound,
// so bytes are ~free". If layout is FLAT and the growth is ParseHTML/Compile, that reasoning
// no longer holds at 11.4 MB and the verdict must be re-derived.
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
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2); };

// map raw trace event names -> human buckets
const BUCKET = (n) => {
  if (n === 'ParseHTML') return 'ParseHTML (tokenize the file)';
  if (n === 'EvaluateScript' || n === 'v8.evaluateModule') return 'EvaluateScript (run top-level)';
  if (n.startsWith('v8.compile') || n === 'V8.CompileCode' || n === 'v8.parseOnBackground') return 'v8 compile/parse JS';
  if (n === 'FunctionCall') return 'FunctionCall (app code)';
  if (n === 'Layout' || n === 'ScheduledStyleRecalculation') return 'Layout';
  if (n === 'UpdateLayoutTree' || n === 'RecalculateStyles') return 'Style recalc';
  if (n === 'Paint' || n === 'PrePaint' || n === 'Layerize' || n === 'CompositeLayers') return 'Paint/Composite';
  if (n === 'ParseAuthorStyleSheet') return 'Parse CSS';
  if (/GC|Gc/.test(n)) return 'GC';
  if (n === 'TimerFire' || n === 'EventDispatch' || n === 'RunTask' || n === 'RunMicrotasks') return null; // containers, skip
  return null;
};

async function trace(browser, url, label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

  const events = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
  await cdp.send('Tracing.start', {
    traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8', 'v8.execute', 'blink', 'blink.user_timing'] },
    transferMode: 'ReportEvents',
  });

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

  // render proof -- a trace of a blank page is worthless
  const proof = await page.evaluate(() => ({
    textLen: (document.body.innerText || '').trim().length,
    shadowNodes: [...document.querySelectorAll('body *')].reduce((a, e) => a + (e.shadowRoot ? e.shadowRoot.querySelectorAll('*').length : 0), 0),
  }));

  const stopped = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await stopped;
  await ctx.close();

  // aggregate complete/duration events by bucket (self time approximated by dur of leaf-ish events)
  const agg = new Map();
  for (const e of events) {
    if (!e.dur || (e.ph !== 'X' && e.ph !== 'complete')) continue;
    const b = BUCKET(e.name);
    if (!b) continue;
    agg.set(b, (agg.get(b) || 0) + e.dur / 1000);
  }
  return { label, ready, proof, agg: Object.fromEntries([...agg.entries()].map(([k, v]) => [k, Math.round(v)])) };
}

const browser = await chromium.launch();
const res = { BEFORE: [], AFTER: [] };
for (let i = 0; i < RUNS; i++) for (const b of ['BEFORE', 'AFTER']) res[b].push(await trace(browser, URLS[b], b)); // interleaved
await browser.close();

const keys = [...new Set([...res.BEFORE, ...res.AFTER].flatMap((r) => Object.keys(r.agg)))];
const pick = (b, k) => med(res[b].map((r) => r.agg[k] || 0));
console.log(`\n===== TRACE BREAKDOWN  (mobile 390x844, CPU x${CPU}, n=${RUNS} interleaved, median ms) =====`);
console.log(`render proof: BEFORE txt=${res.BEFORE[0].proof.textLen} shadow=${res.BEFORE[0].proof.shadowNodes} | AFTER txt=${res.AFTER[0].proof.textLen} shadow=${res.AFTER[0].proof.shadowNodes}`);
console.log(`ready:        BEFORE ${med(res.BEFORE.map((r) => r.ready))} ms  ->  AFTER ${med(res.AFTER.map((r) => r.ready))} ms\n`);
console.log(`${'bucket'.padEnd(32)} ${'BEFORE'.padStart(8)} ${'AFTER'.padStart(8)} ${'DELTA'.padStart(8)}   share of growth`);
const rows = keys.map((k) => ({ k, b: pick('BEFORE', k), a: pick('AFTER', k) })).map((r) => ({ ...r, d: r.a - r.b }));
const growth = rows.filter((r) => r.d > 0).reduce((s, r) => s + r.d, 0);
for (const r of rows.sort((x, y) => y.d - x.d)) {
  const share = r.d > 0 ? `${((r.d / growth) * 100).toFixed(0)}%` : '-';
  console.log(`${r.k.padEnd(32)} ${String(r.b).padStart(8)} ${String(r.a).padStart(8)} ${(r.d >= 0 ? '+' : '') + r.d}`.padEnd(62) + share.padStart(6));
}
console.log(`\ntotal positive growth: ${growth} ms`);
fs.writeFileSync(path.join(OUT, 'trace.json'), JSON.stringify({ rows, res }, null, 2));
