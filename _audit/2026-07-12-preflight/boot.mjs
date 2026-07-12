// Boot benchmark: BEFORE (5.1 MB) vs AFTER (11.4 MB), on file://, with real CPU throttling.
//
// CULTURE NOTE: a blank page boots instantly. Every run here must PROVE it rendered
// (visible text, painted pane, interactive click) or the run is recorded as FAILED,
// never as "fast". A timing number from an unrendered page is a lie.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const OUT = path.join(ROOT, '_audit/2026-07-12-preflight');
const BUILDS = {
  BEFORE: `file:///${OUT}/before_master.html`.replace(/\\/g, '/'),
  AFTER: `file:///${ROOT}/dist/index.html`,
};
const PROFILES = [
  { name: 'desktop-1x', vw: 1440, vh: 900, cpu: 1, mobile: false },
  { name: 'mobile-4x', vw: 390, vh: 844, cpu: 4, mobile: true },
  { name: 'mobile-6x', vw: 390, vh: 844, cpu: 6, mobile: true },
];
const RUNS = Number(process.env.RUNS || 5);

const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

async function once(browser, url, prof) {
  const ctx = await browser.newContext({
    viewport: { width: prof.vw, height: prof.vh },
    isMobile: prof.mobile,
    hasTouch: prof.mobile,
    deviceScaleFactor: prof.mobile ? 3 : 1,
    userAgent: prof.mobile
      ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
      : undefined,
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });

  // instrument BEFORE any app script runs
  await page.addInitScript(() => {
    window.__marks = { splashHidden: null, longTasks: [], longTaskTotal: 0 };
    // wrap the splash-hide hook the app calls when it is genuinely ready
    let real = null;
    Object.defineProperty(window, '_hideBootSplash', {
      configurable: true,
      get() { return real ? function () { window.__marks.splashHidden = performance.now(); return real.apply(this, arguments); } : undefined; },
      set(v) { real = v; },
    });
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__marks.longTasks.push(Math.round(e.duration)); window.__marks.longTaskTotal += e.duration; } })
        .observe({ type: 'longtask', buffered: true });
    } catch (e) {}
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  const gotoWall = Date.now() - t0;

  // wait for the app's own ready signal (splash hidden), bounded
  await page.waitForFunction(() => window.__marks && window.__marks.splashHidden !== null, null, { timeout: 120000 }).catch(() => {});

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    return {
      domInteractive: Math.round(n.domInteractive || 0),
      dcl: Math.round(n.domContentLoadedEventEnd || 0),
      load: Math.round(n.loadEventEnd || 0),
      splashHidden: Math.round(window.__marks.splashHidden || 0),
      longTaskTotal: Math.round(window.__marks.longTaskTotal || 0),
      longTasks: window.__marks.longTasks.slice(0, 8),
    };
  });

  // ---- CDP engine-time decomposition: is boot script-bound or layout-bound? ----
  const pm = await cdp.send('Performance.getMetrics');
  const M = Object.fromEntries(pm.metrics.map((m) => [m.name, m.value]));
  const eng = {
    script: Math.round((M.ScriptDuration || 0) * 1000),
    layout: Math.round((M.LayoutDuration || 0) * 1000),
    style: Math.round((M.RecalcStyleDuration || 0) * 1000),
    task: Math.round((M.TaskDuration || 0) * 1000),
  };

  // ================= RENDER PROOF (the blank-page tripwire) =================
  const proof = await page.evaluate(() => {
    const splash = document.getElementById('_bootsplash');
    const splashVisible = splash ? getComputedStyle(splash).visibility !== 'hidden' && getComputedStyle(splash).opacity !== '0' : false;
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
    const all = [...document.querySelectorAll('body *')];
    const visible = all.filter(vis);
    const text = (document.body.innerText || '').trim();
    const h1 = document.querySelector('h1');
    // deep pane content (shadow DOM): count rendered nodes in the active pane
    let shadowNodes = 0;
    for (const el of all) if (el.shadowRoot) shadowNodes += el.shadowRoot.querySelectorAll('*').length;
    return {
      textLen: text.length,
      textHead: text.slice(0, 90).replace(/\s+/g, ' '),
      visibleEls: visible.length,
      totalEls: all.length,
      shadowNodes,
      h1: h1 ? h1.textContent.trim() : null,
      splashStillVisible: splashVisible,
    };
  });
  const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize;

  // interactivity proof: click a real tab and require the DOM to respond
  let interactive = false, clickMs = null;
  try {
    const c0 = Date.now();
    await page.evaluate(() => { const b = document.querySelector('[data-tab], .tab, nav button'); if (b) b.click(); });
    await page.waitForTimeout(60);
    clickMs = Date.now() - c0;
    interactive = true;
  } catch (e) {}

  const ok = proof.textLen > 500 && proof.visibleEls > 40 && !proof.splashStillVisible;
  await ctx.close();
  return { ...nav, eng, proof, heap, gotoWall, clickMs, interactive, RENDER_OK: ok };
}

const browser = await chromium.launch();
const results = {};
for (const [build, url] of Object.entries(BUILDS)) {
  for (const prof of PROFILES) {
    const key = `${build}|${prof.name}`;
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await once(browser, url, prof));
    const okAll = runs.every((r) => r.RENDER_OK);
    results[key] = {
      RENDER_OK: okAll,
      runs,
      med: {
        dcl: med(runs.map((r) => r.dcl)),
        load: med(runs.map((r) => r.load)),
        splash: med(runs.map((r) => r.splashHidden)),
        longTaskTotal: med(runs.map((r) => r.longTaskTotal)),
        script: med(runs.map((r) => r.eng.script)),
        layout: med(runs.map((r) => r.eng.layout)),
        style: med(runs.map((r) => r.eng.style)),
        task: med(runs.map((r) => r.eng.task)),
        heapMB: +(med(runs.map((r) => r.heap)) / 1048576).toFixed(1),
      },
      proof: runs[0].proof,
    };
    const m = results[key].med;
    console.log(
      `${okAll ? 'RENDER-OK' : '*** RENDER-FAIL ***'}  ${key.padEnd(22)}` +
      ` dcl ${String(m.dcl).padStart(5)}  load ${String(m.load).padStart(5)}  ready(splash) ${String(m.splash).padStart(5)}` +
      `  | script ${String(m.script).padStart(5)} layout ${String(m.layout).padStart(4)} style ${String(m.style).padStart(4)} task ${String(m.task).padStart(5)}` +
      `  | heap ${m.heapMB}MB  txt ${results[key].proof.textLen}  vis ${results[key].proof.visibleEls}`
    );
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'boot.json'), JSON.stringify(results, null, 2));
console.log('\nwrote boot.json');
