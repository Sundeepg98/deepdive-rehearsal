/* ============================================================================
 * D3-perf CONTENT-VISIBILITY CEILING TEST -- zero build, zero risk.
 * Injects `content-visibility:auto` into a pane's shadow root at RUNTIME, right
 * before its first activation, and pairs that against the un-injected reveal on
 * the SAME build under the SAME load. The paired delta is the MAXIMUM the lever
 * can buy -- if it's small, the real src change isn't worth its VR/a11y surface.
 *
 * Usage: node _perf/ceiling.cjs [--panes trade,rf,sys,wb,num,drill] [--cycles 8]
 * ==========================================================================*/
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const boot = require('../test/_boot.cjs');

function argv(name, def) { const i = process.argv.indexOf('--' + name); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def; }
const CYCLES = Number(argv('cycles', 8));
const PANES = argv('panes', 'trade,rf,sys,wb,num,drill').split(',');
const HTML = path.resolve(argv('html', path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html')));
const OUT = path.join(__dirname, 'results'); fs.mkdirSync(OUT, { recursive: true });

/* pane -> [hostTag, shadow selector for the repeated below-fold cards] */
const CV = {
  trade: ['deep-trade-offs', '#tdecs > .dec'],
  rf: ['deep-red-flags', '#rflist > *'],
  sys: ['deep-system-map', '#chain > *, #pivs > *'],
  wb: ['deep-whiteboard', '#list > *'],
  num: ['deep-numbers', '#out > *, #ninp > *'],
  drill: ['deep-drill', '#dnav .dn-step'],
  drillwrap: ['deep-drill', '.dnav-wrap'],
  model: ['deep-model-answers', '#modelBody'],
};

const PROBE = () => {
  window.__perf = {
    spin() { const t0 = performance.now(); let x = 0; for (let i = 0; i < 2e7; i++) { x += Math.sqrt(i + 1) * 1.0000001; } return performance.now() - t0; },
    injectCV(hostTag, selector, intrinsic) {
      const host = document.querySelector(hostTag);
      if (!host || !host.shadowRoot) return false;
      const s = new CSSStyleSheet();
      s.replaceSync(selector + '{content-visibility:auto;contain-intrinsic-size:auto ' + intrinsic + 'px}');
      host.shadowRoot.adoptedStyleSheets = [...host.shadowRoot.adoptedStyleSheets, s];
      return true;
    },
    switchPane(tab) {
      return new Promise((resolve) => {
        const btn = document.querySelector('.seg button[data-tab="' + tab + '"]');
        if (!btn) return resolve({ err: 'no-btn' });
        void document.body.offsetHeight;
        const t0 = performance.now(); btn.click(); const s = performance.now();
        requestAnimationFrame(() => { const f = performance.now(); requestAnimationFrame(() => resolve({ sync: +(s - t0).toFixed(1), toPaint: +(f - t0).toFixed(1) })); });
      });
    },
  };
};

const TAB = { drillwrap: 'drill' }; // CV-map key -> the actual seg tab to switch to
async function measureOnce(browser, pane, inject) {
  const [host, sel] = CV[pane];
  const tab = TAB[pane] || pane;
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await boot.gotoApp(page, HTML);
  await page.evaluate(PROBE);
  await boot.enterApp(page);
  await boot.settle(page);
  // ensure the (deferred) pane has drained its render into the shadow before we inject/measure
  await page.waitForFunction((h) => { const el = document.querySelector(h); return el && el.shadowRoot && el.shadowRoot.childElementCount > 0; }, host, { timeout: 10000 }).catch(() => {});
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.evaluate(() => window.__perf.spin()); await page.evaluate(() => window.__perf.spin());
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const spin = await page.evaluate(() => window.__perf.spin());
  let injected = false;
  if (inject) injected = await page.evaluate((a) => window.__perf.injectCV(a[0], a[1], 400), [host, sel]);
  const m = await page.evaluate((t) => window.__perf.switchPane(t), tab);
  await page.close();
  return { toPaint: m.toPaint, sync: m.sync, spin: +spin.toFixed(1), injected, err: m.err };
}

function stats(xs) { if (!xs.length) return {}; const s = xs.slice().sort((a, b) => a - b); const q = (p) => s[Math.min(s.length - 1, Math.round(p * (s.length - 1)))]; return { n: xs.length, min: s[0], p50: q(0.5), max: s[s.length - 1] }; }

async function run() {
  const browser = await chromium.launch(boot.launchOpts());
  const result = { html: HTML, cycles: CYCLES, when: new Date().toISOString(), data: {} };
  for (const pane of PANES) {
    if (!CV[pane]) { console.log('skip unknown pane', pane); continue; }
    const pairs = [];
    for (let c = 0; c < CYCLES; c++) {
      let off, on;
      if (c % 2 === 0) { off = await measureOnce(browser, pane, false); on = await measureOnce(browser, pane, true); }
      else { on = await measureOnce(browser, pane, true); off = await measureOnce(browser, pane, false); }
      const matched = Math.abs(off.spin - on.spin) / Math.max(off.spin, on.spin) <= 0.15;
      pairs.push({ off: off.toPaint, on: on.toPaint, offSync: off.sync, onSync: on.sync, injected: on.injected, d: +(on.toPaint - off.toPaint).toFixed(1), offSpin: off.spin, onSpin: on.spin, matched });
    }
    result.data[pane] = pairs;
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'ceiling.json'), JSON.stringify(result, null, 2));

  console.log('\n=== CONTENT-VISIBILITY CEILING (runtime-injected) cycles=' + CYCLES + ' @4x ===');
  console.log('pane   inj?  off p50  on p50   d(p50)   | MATCHED: off p50 on p50 d p50 (n)');
  for (const pane of PANES) {
    if (!result.data[pane]) continue;
    const all = result.data[pane].filter(x => !x.err);
    const m = all.filter(x => x.matched);
    const injOk = all.every(x => x.injected);
    const off = stats(all.map(x => x.off)), on = stats(all.map(x => x.on)), d = stats(all.map(x => x.d));
    const moff = stats(m.map(x => x.off)), mon = stats(m.map(x => x.on)), md = stats(m.map(x => x.d));
    console.log(
      pane.padEnd(6), (injOk ? 'yes' : 'NO!').padEnd(4),
      String(off.p50).padStart(7), String(on.p50).padStart(7), String((d.p50 > 0 ? '+' : '') + d.p50).padStart(8),
      '  |', String(moff.p50 || '-').padStart(7), String(mon.p50 || '-').padStart(6),
      String(md.p50 != null ? (md.p50 > 0 ? '+' : '') + md.p50 : '-').padStart(7), ('(' + m.length + ')').padStart(5));
  }
  console.log('\n(d negative = content-visibility FASTER. This is the LEVER CEILING on this build.)');
  console.log('wrote ' + path.join(OUT, 'ceiling.json'));
}
run().catch((e) => { console.error(e); process.exit(1); });
