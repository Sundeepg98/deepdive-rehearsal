#!/usr/bin/env node
/* Which half actually eats the budget?
 *   click()          -- Playwright actionability: visible + STABLE (waits out CSS animation). Own 30s cap.
 *   waitForFunction  -- the pane becoming display!=none. THIS is what render.cjs caps at 2000ms.
 * Reporting the wrong half as the root cause would be exactly the sin this repo is trying to stop.
 */
const path = require('path');
const { chromium } = require('playwright');
const HTML = process.argv[2] || path.join(__dirname, '..', '..', 'deepdive_content_pipeline_rehearsal.html');
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const REPS = parseInt(process.argv[3] || '3', 10);

(async () => {
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  const clicks = [], waits = [];
  for (let rep = 0; rep < REPS; rep++) {
    const p = await browser.newPage();
    await p.goto('file://' + path.resolve(HTML), { timeout: 120000 });
    await p.waitForFunction(() => typeof switchTab === 'function' && typeof TopicRegistry !== 'undefined' && TopicRegistry.ids().length > 0, null, { timeout: 120000 });
    await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); });
    await p.waitForFunction(() => !(window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()), null, { timeout: 60000 });
    for (const t of PANES) {
      const a = Date.now();
      await p.click(`.sidebar .seg button[data-tab="${t}"]`);
      const b = Date.now();
      await p.waitForFunction(id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== 'none'; }, t, { timeout: 60000 });
      const c = Date.now();
      clicks.push(b - a); waits.push(c - b);
    }
    await p.close();
  }
  await browser.close();
  const st = (a, n) => { const s = [...a].sort((x, y) => x - y); return `${n}: median=${s[s.length>>1]}ms p90=${s[Math.floor(s.length*0.9)]}ms MAX=${s[s.length-1]}ms`; };
  console.log(st(clicks, 'click()        [own 30s cap]      '));
  console.log(st(waits,  'waitForFunction[render.cjs 2000ms]'));
})();
