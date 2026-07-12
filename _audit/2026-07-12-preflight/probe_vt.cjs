#!/usr/bin/env node
/* DECISIVE A/B: is the slow pane switch a real cost, or is the test timing a View Transition?
 * Same 9 pane clicks, same page, one variable: reducedMotion.
 *  motion ON  -> switchTab() routes through document.startViewTransition(), which SNAPSHOTS the
 *                whole document (cost scales with DOM size -- the 11.4MB regression).
 *  motion OFF -> view-transitions.js takes the synchronous path.
 */
const path = require('path');
const { chromium } = require('playwright');
const HTML = process.argv[2] || path.join(__dirname, '..', '..', 'deepdive_content_pipeline_rehearsal.html');
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const boot = async (p) => {
  await p.goto('file://' + path.resolve(HTML), { timeout: 120000 });
  await p.waitForFunction(() => typeof switchTab === 'function' && typeof TopicRegistry !== 'undefined' && TopicRegistry.ids().length > 0, null, { timeout: 120000 });
  await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); });
  await p.waitForFunction(() => !(window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()), null, { timeout: 60000 });
};

(async () => {
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  for (const mode of ['no-reduce (MOTION ON, what render.cjs does today)', 'reduce (MOTION OFF)']) {
    const opts = mode.startsWith('reduce') ? { reducedMotion: 'reduce' } : {};
    const times = [];
    for (let rep = 0; rep < 3; rep++) {
      const p = await browser.newPage(opts);
      await boot(p);
      for (const t of PANES) {
        const t0 = Date.now();
        await p.click(`.sidebar .seg button[data-tab="${t}"]`);
        await p.waitForFunction(id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== 'none'; }, t, { timeout: 60000 });
        times.push(Date.now() - t0);
      }
      await p.close();
    }
    times.sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    console.log(`${mode.padEnd(46)} n=${times.length}  median=${times[times.length >> 1]}ms  p90=${times[Math.floor(times.length * 0.9)]}ms  MAX=${times[times.length - 1]}ms  mean=${Math.round(sum / times.length)}ms`);
  }
  await browser.close();
})();
