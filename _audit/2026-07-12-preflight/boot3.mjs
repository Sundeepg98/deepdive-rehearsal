// Boot benchmark v3 -- DEFINITIVE.
// v2 showed 4x run-to-run variance from machine load (mobile-4x ready: 855..3234ms).
// Fix: INTERLEAVE BEFORE/AFTER (A,B,A,B,...) inside each profile so background load hits
// both builds equally. Compare medians of paired samples. Real tab selectors ([data-tab]).
// Render proof gates every number: a blank page cannot score "fast" here.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const OUT = path.join(ROOT, '_audit/2026-07-12-preflight');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const URLS = {
  BEFORE: `file:///${OUT}/before_master.html`.replace(/\\/g, '/'),
  AFTER: `file:///${ROOT}/dist/index.html`,
};
const PROFILES = [
  { name: 'desktop-1x', vw: 1440, vh: 900, cpu: 1, mobile: false },
  { name: 'mobile-4x', vw: 390, vh: 844, cpu: 4, mobile: true },
  { name: 'mobile-6x', vw: 390, vh: 844, cpu: 6, mobile: true },
];
const RUNS = Number(process.env.RUNS || 7);
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : Math.round((s[n / 2 - 1] + s[n / 2]) / 2); };

async function once(browser, url, prof, build, i) {
  const ctx = await browser.newContext({
    viewport: { width: prof.vw, height: prof.vh },
    isMobile: prof.mobile, hasTouch: prof.mobile,
    deviceScaleFactor: prof.mobile ? 3 : 1,
    userAgent: prof.mobile ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' : undefined,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });

  await page.addInitScript(() => {
    window.__m = { ready: null, lt: [], ltTotal: 0 };
    let real = null;
    Object.defineProperty(window, '_hideBootSplash', {
      configurable: true,
      get() { return real ? function () { if (window.__m.ready === null) window.__m.ready = performance.now(); return real.apply(this, arguments); } : undefined; },
      set(v) { real = v; },
    });
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__m.lt.push(Math.round(e.duration)); window.__m.ltTotal += e.duration; } }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  });

  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  let readyOk = true;
  await page.waitForFunction(() => { const s = document.getElementById('_bootsplash'); return !s || s.classList.contains('_bs-done'); }, null, { timeout: 120000 }).catch(() => { readyOk = false; });

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    return {
      dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0),
      ready: Math.round(window.__m.ready || 0),
      ltTotal: Math.round(window.__m.ltTotal || 0), ltMax: window.__m.lt.length ? Math.max(...window.__m.lt) : 0,
    };
  });
  const pm = await cdp.send('Performance.getMetrics');
  const M = Object.fromEntries(pm.metrics.map((x) => [x.name, x.value]));
  const eng = { script: Math.round((M.ScriptDuration || 0) * 1000), layout: Math.round((M.LayoutDuration || 0) * 1000), style: Math.round((M.RecalcStyleDuration || 0) * 1000), task: Math.round((M.TaskDuration || 0) * 1000) };

  // real tab switch, under the same throttle: click -> pane actually becomes active
  let tabMs = null;
  try {
    const t = Date.now();
    await page.click('button[data-tab="drill"]', { timeout: 20000 });
    await page.waitForFunction(() => document.querySelector('button[data-tab="drill"]').classList.contains('on'), null, { timeout: 20000 });
    tabMs = Date.now() - t;
  } catch (e) {}

  const proof = await page.evaluate(() => {
    const s = document.getElementById('_bootsplash');
    const vis = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
    const all = [...document.querySelectorAll('body *')];
    let shadowNodes = 0;
    for (const el of all) if (el.shadowRoot) shadowNodes += el.shadowRoot.querySelectorAll('*').length;
    return { textLen: (document.body.innerText || '').trim().length, visibleEls: all.filter(vis).length, shadowNodes, splashGone: !s || s.classList.contains('_bs-done') };
  });
  const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  if (i === 0) await page.screenshot({ path: path.join(OUT, 'shots', `${build}-${prof.name}.png`) });

  const RENDER_OK = readyOk && proof.splashGone && proof.textLen > 500 && proof.visibleEls > 40 && proof.shadowNodes > 20;
  await ctx.close();
  return { ...nav, eng, proof, heap, tabMs, RENDER_OK };
}

const browser = await chromium.launch();
const out = {};
for (const prof of PROFILES) {
  const acc = { BEFORE: [], AFTER: [] };
  for (let i = 0; i < RUNS; i++) {
    for (const build of ['BEFORE', 'AFTER']) acc[build].push(await once(browser, URLS[build], prof, build, i)); // interleaved
  }
  console.log(`\n########## ${prof.name}  (CPU x${prof.cpu}, ${prof.vw}x${prof.vh}, n=${RUNS} interleaved) ##########`);
  for (const build of ['BEFORE', 'AFTER']) {
    const runs = acc[build];
    const ok = runs.every((r) => r.RENDER_OK);
    const m = {
      dcl: med(runs.map((r) => r.dcl)), load: med(runs.map((r) => r.load)), ready: med(runs.map((r) => r.ready)),
      tabMs: med(runs.filter((r) => r.tabMs != null).map((r) => r.tabMs)),
      ltMax: med(runs.map((r) => r.ltMax)), script: med(runs.map((r) => r.eng.script)),
      layout: med(runs.map((r) => r.eng.layout)), style: med(runs.map((r) => r.eng.style)), task: med(runs.map((r) => r.eng.task)),
      heapMB: +(med(runs.map((r) => r.heap)) / 1048576).toFixed(1),
    };
    out[`${build}|${prof.name}`] = { RENDER_OK: ok, med: m, proof: runs[0].proof, readyRuns: runs.map((r) => r.ready) };
    console.log(
      `${ok ? 'RENDER-OK ' : '*RENDER-FAIL*'} ${build.padEnd(7)}` +
      ` dcl ${String(m.dcl).padStart(5)} load ${String(m.load).padStart(5)} ready ${String(m.ready).padStart(5)} tabSwitch ${String(m.tabMs).padStart(4)}` +
      ` | script ${String(m.script).padStart(4)} layout ${String(m.layout).padStart(4)} style ${String(m.style).padStart(3)} task ${String(m.task).padStart(5)}` +
      ` | LTmax ${String(m.ltMax).padStart(4)} | heap ${String(m.heapMB).padStart(5)}MB`
    );
    console.log(`             ready samples: [${runs.map((r) => r.ready).join(', ')}]`);
  }
  const b = out[`BEFORE|${prof.name}`].med, a = out[`AFTER|${prof.name}`].med;
  console.log(`  ==> DELTA ready ${b.ready} -> ${a.ready} ms  (${a.ready - b.ready >= 0 ? '+' : ''}${a.ready - b.ready} ms, ${((a.ready / b.ready - 1) * 100).toFixed(0)}%)   script ${b.script}->${a.script}  layout ${b.layout}->${a.layout}  heap ${b.heapMB}->${a.heapMB} MB`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'boot3.json'), JSON.stringify(out, null, 2));
console.log('\nwrote boot3.json');
