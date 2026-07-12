// EXPERIMENT: does lazy-parsing actually pay, on THIS app's real data?
// I refuse to recommend a fix I haven't measured. Extract the real JSON-safe TOPIC_* payloads
// out of the shipped bundle, then build pages carrying the SAME content and measure boot cost
// under mobile CPU throttle.
//
//   A  object literals            -- the status quo (V8 builds all 46 topics' object graphs)
//   B  JS string literals + JSON.parse(1 of 46)              -- lazy; JSON escaped into JS source
//   C  <script type=application/json> + JSON.parse(1 of 46)  -- lazy; raw text, no JS tokenizer
//
// All three stay ONE FILE, offline, zero network. That constraint is non-negotiable.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const OUT = path.join(ROOT, '_audit/2026-07-12-preflight');
const LAB = path.join(OUT, 'lab');
fs.mkdirSync(LAB, { recursive: true });
const CLOSE_TAG = '<' + '/script>';
const SAFE = (s) => s.split('</').join('<\\/'); // content must never close our script tag

const browser = await chromium.launch();

// ---------- extract the real payload from the shipped bundle ----------
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`file:///${ROOT}/dist/index.html`, { waitUntil: 'load', timeout: 240000 });
  await p.waitForFunction(() => { const s = document.getElementById('_bootsplash'); return !s || s.classList.contains('_bs-done'); }, null, { timeout: 120000 }).catch(() => {});
  const data = await p.evaluate(() => {
    const out = {};
    for (const n of Object.keys(window).filter((k) => /^TOPIC_/.test(k))) {
      const v = window[n];
      let fn = false;
      const walk = (o, d) => { if (d > 12 || o === null || typeof o !== 'object') return; for (const k of Object.keys(o)) { const x = o[k]; if (typeof x === 'function') { fn = true; return; } if (typeof x === 'object' && x !== null) walk(x, d + 1); } };
      if (typeof v === 'function') fn = true; else walk(v, 0);
      if (!fn) { try { out[n] = JSON.stringify(v); } catch (e) {} }
    }
    return out;
  });
  fs.writeFileSync(path.join(LAB, 'payload.json'), JSON.stringify(data));
  await ctx.close();
  console.log(`extracted ${Object.keys(data).length} JSON-safe TOPIC_* payloads`);
}

const payload = JSON.parse(fs.readFileSync(path.join(LAB, 'payload.json'), 'utf8'));
const names = Object.keys(payload);
const first = names[0];

const shell = (body) => `<!doctype html><meta charset="utf-8"><title>lab</title><body><div id="out">booting</div>
${body}
<script>window.__done=performance.now();document.getElementById('out').textContent='TOPICS='+window.__n+' firstTopicKeys='+window.__k;${CLOSE_TAG}`;

const A = shell(`<script>
${names.map((n) => `var ${n}=${SAFE(payload[n])};`).join('\n')}
window.__n=${names.length};window.__k=Object.keys(${first}).length;
${CLOSE_TAG}`);

const B = shell(`<script>
${names.map((n) => `var S_${n}=${SAFE(JSON.stringify(payload[n]))};`).join('\n')}
var ${first}=JSON.parse(S_${first});
window.__n=${names.length};window.__k=Object.keys(${first}).length;
${CLOSE_TAG}`);

const C = shell(`${names.map((n) => `<script type="application/json" id="d_${n}">${SAFE(payload[n])}${CLOSE_TAG}`).join('\n')}
<script>
var ${first}=JSON.parse(document.getElementById('d_${first}').textContent);
window.__n=${names.length};window.__k=Object.keys(${first}).length;
${CLOSE_TAG}`);

for (const [k, v] of Object.entries({ A, B, C })) fs.writeFileSync(path.join(LAB, `${k}.html`), v);
const sizes = Object.fromEntries(['A', 'B', 'C'].map((k) => {
  const b = fs.readFileSync(path.join(LAB, `${k}.html`));
  return [k, { raw: b.length, gz: zlib.gzipSync(b, { level: 9 }).length }];
}));

const CPU = Number(process.env.CPU || 4);
const RUNS = Number(process.env.RUNS || 5);
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2); };

async function measure(file) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const raw = [];
  cdp.on('Tracing.dataCollected', (d) => raw.push(...d.value));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline'] }, transferMode: 'ReportEvents' });
  await page.goto(`file:///${LAB}/${file}`.replace(/\\/g, '/'), { waitUntil: 'load', timeout: 240000 });
  const done = await page.evaluate(() => Math.round(window.__done || 0));
  const proof = await page.evaluate(() => document.getElementById('out').textContent);
  const stop = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end'); await stop;
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise((r) => setTimeout(r, 150));
  const heap = +((await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576).toFixed(2);

  const seen = new Set(); const evs = [];
  for (const e of raw) { if (e.ph !== 'X' || !e.dur) continue; const k = `${e.pid}|${e.tid}|${e.ts}|${e.name}|${e.dur}`; if (seen.has(k)) continue; seen.add(k); evs.push(e); }
  const bt = new Map(); for (const e of evs) { const k = `${e.pid}|${e.tid}`; bt.set(k, (bt.get(k) || 0) + e.dur); }
  const mk = [...bt.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const main = evs.filter((e) => `${e.pid}|${e.tid}` === mk).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const self = new Map(); const st = [];
  const acct = (f) => { const s = Math.max(0, f.dur - f.childDur); self.set(f.name, (self.get(f.name) || 0) + s); };
  for (const e of main) { while (st.length && st[st.length - 1].end <= e.ts) acct(st.pop()); if (st.length) st[st.length - 1].childDur += e.dur; st.push({ name: e.name, end: e.ts + e.dur, dur: e.dur, childDur: 0 }); }
  while (st.length) acct(st.pop());
  const g = (n) => Math.round((self.get(n) || 0) / 1000);
  await ctx.close();
  return { done, heap, proof, parseHTML: g('ParseHTML'), compile: g('v8.compile'), evaluate: g('EvaluateScript') };
}

const res = {};
for (let i = 0; i < RUNS; i++) for (const k of ['A', 'B', 'C']) { (res[k] ||= []).push(await measure(`${k}.html`)); }
await browser.close();

const LBL = { A: 'A  object literals (STATUS QUO)', B: 'B  JS strings + lazy JSON.parse', C: 'C  script[type=json] + lazy parse' };
console.log(`\n===== LAZY-PARSE EXPERIMENT (real data, ${names.length} payloads, mobile CPU x${CPU}, n=${RUNS}, median) =====\n`);
console.log(`${'variant'.padEnd(34)} ${'raw'.padStart(7)} ${'gzip'.padStart(7)} | ${'ready'.padStart(6)} ${'parseHTML'.padStart(9)} ${'v8.compile'.padStart(10)} ${'evaluate'.padStart(8)} | ${'heap'.padStart(8)}`);
for (const k of ['A', 'B', 'C']) {
  const r = res[k]; const m = (f) => med(r.map(f));
  console.log(
    `${LBL[k].padEnd(34)} ${((sizes[k].raw / 1048576).toFixed(2) + 'MB').padStart(7)} ${((sizes[k].gz / 1048576).toFixed(2) + 'MB').padStart(7)} | ` +
    `${String(m((x) => x.done)).padStart(6)} ${String(m((x) => x.parseHTML)).padStart(9)} ${String(m((x) => x.compile)).padStart(10)} ${String(m((x) => x.evaluate)).padStart(8)} | ${String(m((x) => x.heap)).padStart(5)} MB`
  );
}
console.log(`\nRENDER PROOF (must show real topic count + first-topic key count, not a blank page):`);
for (const k of ['A', 'B', 'C']) console.log(`  ${k}: ${res[k][0].proof}`);
const M = (k, f) => med(res[k].map(f));
console.log(`\n  STATUS QUO  A : ready ${M('A', (x) => x.done)} ms   heap ${M('A', (x) => x.heap)} MB`);
for (const k of ['B', 'C']) {
  const d = M(k, (x) => x.done), a = M('A', (x) => x.done);
  const h = M(k, (x) => x.heap), ha = M('A', (x) => x.heap);
  console.log(`  ${k} vs A        : ready ${d} ms (${(((d - a) / a) * 100).toFixed(0)}%)   heap ${h} MB (${(((h - ha) / ha) * 100).toFixed(0)}%)`);
}
fs.writeFileSync(path.join(OUT, 'lazy.json'), JSON.stringify({ sizes, res }, null, 2));
