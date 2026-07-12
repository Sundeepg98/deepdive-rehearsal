// Boot benchmark v2. Fixes the v1 harness bug: v1 sampled computed opacity DURING the
// splash's 0.4s fade transition and called a fully-rendered desktop page "RENDER-FAIL".
// Now: ready == splash carries ._bs-done (or is gone); render proof is text+visible els+
// a real screenshot; TTI is a measured click->DOM-response under the SAME throttle.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const OUT = path.join(ROOT, '_audit/2026-07-12-preflight');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
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
    window.__m = { splashCalled: null, lt: [], ltTotal: 0, firstPaint: null };
    let real = null;
    Object.defineProperty(window, '_hideBootSplash', {
      configurable: true,
      get() { return real ? function () { if (window.__m.splashCalled === null) window.__m.splashCalled = performance.now(); return real.apply(this, arguments); } : undefined; },
      set(v) { real = v; },
    });
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__m.lt.push(Math.round(e.duration)); window.__m.ltTotal += e.duration; } }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!window.__m.firstPaint) window.__m.firstPaint = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  });

  await page.goto(url, { waitUntil: 'load', timeout: 240000 });

  let readyOk = true;
  await page.waitForFunction(() => {
    const s = document.getElementById('_bootsplash');
    return !s || s.classList.contains('_bs-done');
  }, null, { timeout: 120000 }).catch(() => { readyOk = false; });

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    return {
      dcl: Math.round(n.domContentLoadedEventEnd || 0),
      load: Math.round(n.loadEventEnd || 0),
      ready: Math.round(window.__m.splashCalled || 0),
      fp: window.__m.firstPaint,
      ltTotal: Math.round(window.__m.ltTotal || 0),
      ltMax: window.__m.lt.length ? Math.max(...window.__m.lt) : 0,
    };
  });

  const pm = await cdp.send('Performance.getMetrics');
  const M = Object.fromEntries(pm.metrics.map((x) => [x.name, x.value]));
  const eng = { script: Math.round((M.ScriptDuration || 0) * 1000), layout: Math.round((M.LayoutDuration || 0) * 1000), style: Math.round((M.RecalcStyleDuration || 0) * 1000), task: Math.round((M.TaskDuration || 0) * 1000) };

  let tti = null;
  try {
    const t = Date.now();
    await page.evaluate(() => {
      window.__changed = false;
      const host = document.querySelector('.panes, main, .app') || document.body;
      new MutationObserver(() => { window.__changed = true; }).observe(host, { childList: true, subtree: true, attributes: true });
      const tabs = [...document.querySelectorAll('button,[role=tab],[data-tab]')].filter((b) => b.offsetParent !== null);
      const t2 = tabs.find((b) => /drill|whiteboard|walk/i.test(b.textContent || '')) || tabs[3] || tabs[0];
      if (t2) t2.click();
    });
    await page.waitForFunction(() => window.__changed === true, null, { timeout: 30000 });
    tti = Date.now() - t;
  } catch (e) {}

  const proof = await page.evaluate(() => {
    const s = document.getElementById('_bootsplash');
    const vis = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
    const all = [...document.querySelectorAll('body *')];
    let shadowNodes = 0;
    for (const el of all) if (el.shadowRoot) shadowNodes += el.shadowRoot.querySelectorAll('*').length;
    const txt = (document.body.innerText || '').trim();
    return {
      textLen: txt.length, visibleEls: all.filter(vis).length, shadowNodes,
      h1: (document.querySelector('h1') || {}).textContent || null,
      splashGone: !s || s.classList.contains('_bs-done'),
    };
  });
  const heap = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  if (i === 0) await page.screenshot({ path: path.join(OUT, 'shots', `${build}-${prof.name}.png`) });

  const RENDER_OK = readyOk && proof.splashGone && proof.textLen > 500 && proof.visibleEls > 40 && proof.shadowNodes > 20;
  await ctx.close();
  return { ...nav, eng, proof, heap, tti, RENDER_OK };
}

const browser = await chromium.launch();
const out = {};
for (const [build, url] of Object.entries(BUILDS)) {
  for (const prof of PROFILES) {
    const key = `${build}|${prof.name}`;
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await once(browser, url, prof, build, i));
    const ok = runs.every((r) => r.RENDER_OK);
    const m = {
      dcl: med(runs.map((r) => r.dcl)), load: med(runs.map((r) => r.load)), ready: med(runs.map((r) => r.ready)),
      tti: med(runs.filter((r) => r.tti != null).map((r) => r.tti)),
      ltTotal: med(runs.map((r) => r.ltTotal)), ltMax: med(runs.map((r) => r.ltMax)),
      script: med(runs.map((r) => r.eng.script)), layout: med(runs.map((r) => r.eng.layout)),
      style: med(runs.map((r) => r.eng.style)), task: med(runs.map((r) => r.eng.task)),
      heapMB: +(med(runs.map((r) => r.heap)) / 1048576).toFixed(1),
    };
    out[key] = { RENDER_OK: ok, med: m, proof: runs[0].proof, readyRuns: runs.map((r) => r.ready), dclRuns: runs.map((r) => r.dcl) };
    console.log(
      `${ok ? 'RENDER-OK  ' : '*RENDER-FAIL*'} ${key.padEnd(19)}` +
      ` dcl ${String(m.dcl).padStart(5)} load ${String(m.load).padStart(5)} ready ${String(m.ready).padStart(5)} clickResp ${String(m.tti).padStart(4)}` +
      ` | script ${String(m.script).padStart(4)} layout ${String(m.layout).padStart(4)} style ${String(m.style).padStart(3)} task ${String(m.task).padStart(5)}` +
      ` | LTmax ${String(m.ltMax).padStart(4)} | heap ${String(m.heapMB).padStart(5)}MB | txt ${runs[0].proof.textLen} shadow ${runs[0].proof.shadowNodes}`
    );
    console.log(`               ready runs: [${runs.map((r) => r.ready).join(', ')}]  dcl runs: [${runs.map((r) => r.dcl).join(', ')}]`);
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'boot2.json'), JSON.stringify(out, null, 2));
console.log('\nwrote boot2.json + shots/');
