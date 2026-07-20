/* ============================================================================
 * D3-perf MATCHED-LOAD A/B  -- base build vs branch build, interleaved.
 * The box is shared by four builders, so absolute calm numbers are hard; the
 * track's own resolution is "matched-load ratios govern". Each cycle measures
 * base and branch back-to-back under the SAME ambient load, records the PAIR +
 * both calibration spins, and reports the paired delta + band. A cycle is
 * "matched" when its base/branch spins agree within 15%.
 *
 * Usage: node _perf/ab.cjs --base _perf/builds/base.html --branch deepdive_..._rehearsal.html
 *                          [--panes drill,trade,...] [--cycles 8] [--kind pane|topic]
 * ==========================================================================*/
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const boot = require('../test/_boot.cjs');

function argv(name, def) { const i = process.argv.indexOf('--' + name); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def; }
const BASE = path.resolve(argv('base', path.join(__dirname, 'builds', 'base.html')));
const BRANCH = path.resolve(argv('branch', path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html')));
const CYCLES = Number(argv('cycles', 8));
const KIND = argv('kind', 'pane');
const PANES = argv('panes', 'drill,trade,model,wb,num,sys').split(',');
const TOPIC = argv('topic', 'signing');
const OUT = path.join(__dirname, 'results'); fs.mkdirSync(OUT, { recursive: true });

const PROBE = () => {
  window.__perf = {
    spin() { const t0 = performance.now(); let x = 0; for (let i = 0; i < 2e7; i++) { x += Math.sqrt(i + 1) * 1.0000001; } return performance.now() - t0; },
    onTab(t) { const el = document.getElementById(t); return !!el && el.classList.contains('on'); },
    switchPane(tab) {
      return new Promise((resolve) => {
        const btn = document.querySelector('.seg button[data-tab="' + tab + '"]');
        if (!btn) return resolve({ err: 'no-btn' });
        void document.body.offsetHeight;
        const t0 = performance.now(); btn.click(); const s = performance.now();
        requestAnimationFrame(() => { const f = performance.now(); requestAnimationFrame(() => resolve({ sync: +(s - t0).toFixed(1), toPaint: +(f - t0).toFixed(1) })); });
      });
    },
    switchTopic(id) {
      return new Promise((resolve) => {
        void document.body.offsetHeight;
        const t0 = performance.now(); window.TopicRegistry.setTopic(id); const s = performance.now();
        requestAnimationFrame(() => { const f = performance.now(); requestAnimationFrame(() => resolve({ sync: +(s - t0).toFixed(1), toPaint: +(f - t0).toFixed(1) })); });
      });
    },
  };
};

async function measureOnce(browser, html, target) {
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await boot.gotoApp(page, html);
  await page.evaluate(PROBE);
  await boot.enterApp(page);
  await boot.settle(page);
  // warm JIT then measure spin at 4x = load covariate
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await page.evaluate(() => window.__perf.spin()); await page.evaluate(() => window.__perf.spin());
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const spin = await page.evaluate(() => window.__perf.spin());
  let m;
  if (KIND === 'topic') m = await page.evaluate((t) => window.__perf.switchTopic(t), target);
  else m = await page.evaluate((t) => window.__perf.switchPane(t), target);
  await page.close();
  return { toPaint: m.toPaint, sync: m.sync, spin: +spin.toFixed(1), err: m.err };
}

function stats(xs) { if (!xs.length) return {}; const s = xs.slice().sort((a, b) => a - b); const q = (p) => s[Math.min(s.length - 1, Math.round(p * (s.length - 1)))]; return { n: xs.length, min: s[0], p50: q(0.5), max: s[s.length - 1] }; }

async function run() {
  const browser = await chromium.launch(boot.launchOpts());
  const targets = KIND === 'topic' ? [TOPIC] : PANES;
  const result = { base: BASE, branch: BRANCH, kind: KIND, cycles: CYCLES, when: new Date().toISOString(), data: {} };

  for (const tgt of targets) {
    const pairs = [];
    for (let c = 0; c < CYCLES; c++) {
      // alternate order to cancel any order bias
      let b, p;
      if (c % 2 === 0) { b = await measureOnce(browser, BASE, tgt); p = await measureOnce(browser, BRANCH, tgt); }
      else { p = await measureOnce(browser, BRANCH, tgt); b = await measureOnce(browser, BASE, tgt); }
      const matched = Math.abs(b.spin - p.spin) / Math.max(b.spin, p.spin) <= 0.15;
      pairs.push({ base: b.toPaint, branch: p.toPaint, baseSync: b.sync, branchSync: p.sync, dPaint: +(p.toPaint - b.toPaint).toFixed(1), baseSpin: b.spin, branchSpin: p.spin, matched });
    }
    result.data[tgt] = pairs;
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'ab-' + KIND + '.json'), JSON.stringify(result, null, 2));

  console.log('\n=== MATCHED-LOAD A/B  kind=' + KIND + '  cycles=' + CYCLES + ' @4x ===');
  console.log('base  =', BASE);
  console.log('branch=', BRANCH);
  console.log('\ntarget  |  base p50  branch p50   dPaint(p50)  | MATCHED-only: base p50 branch p50 dPaint p50 (nMatched)');
  for (const tgt of targets) {
    const all = result.data[tgt].filter(x => !x.err);
    const m = all.filter(x => x.matched);
    const b = stats(all.map(x => x.base)), p = stats(all.map(x => x.branch)), d = stats(all.map(x => x.dPaint));
    const mb = stats(m.map(x => x.base)), mp = stats(m.map(x => x.branch)), md = stats(m.map(x => x.dPaint));
    console.log(
      tgt.padEnd(7), '|',
      String(b.p50).padStart(8), String(p.p50).padStart(9), String((d.p50 > 0 ? '+' : '') + d.p50).padStart(12),
      '  |', String(mb.p50 || '-').padStart(8), String(mp.p50 || '-').padStart(9),
      String(md.p50 != null ? (md.p50 > 0 ? '+' : '') + md.p50 : '-').padStart(10), ('(' + (m.length) + ')').padStart(6));
  }
  console.log('\n(dPaint negative = branch FASTER. MATCHED-only = cycles whose base/branch load spins agree within 15%.)');
  console.log('wrote ' + path.join(OUT, 'ab-' + KIND + '.json'));
}
run().catch((e) => { console.error(e); process.exit(1); });
