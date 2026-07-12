#!/usr/bin/env node
/* MEASURE the real cost of booting the 11.4MB deliverable. No assertions -- just numbers.
 * Reports, per iteration:
 *   goto      ms for page.goto(waitUntil:'load') to resolve
 *   ready     ms AFTER goto for the render.cjs readiness predicate to become true
 *   dcl/load  the page's OWN navigation-timing marks (ground truth, not harness overhead)
 *   pane      ms for a pane to become visible after clicking its tab (render.cjs uses 2000ms cap)
 */
const path = require('path');
const { chromium } = require('playwright');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const N = parseInt(process.argv[3] || '5', 10);
const TAG = process.argv[4] || 'cold';

(async () => {
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  const rows = [];
  for (let i = 0; i < N; i++) {
    const p = await browser.newPage();
    const t0 = Date.now();
    await p.goto('file://' + path.resolve(HTML), { timeout: 120000 });
    const tGoto = Date.now() - t0;

    // is the app ALREADY ready the instant goto() resolves? (the load event implies DCL ran)
    const readyAtGoto = await p.evaluate(
      () => typeof switchTab === 'function' && typeof TopicRegistry !== 'undefined' && TopicRegistry.ids().length > 0);

    const t1 = Date.now();
    await p.waitForFunction(
      () => typeof switchTab === 'function' && typeof TopicRegistry !== 'undefined' && TopicRegistry.ids().length > 0,
      null, { timeout: 120000 });
    const tReady = Date.now() - t1;

    const nav = await p.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0] || {};
      return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0),
               resp: Math.round(n.responseEnd || 0), domInt: Math.round(n.domInteractive || 0) };
    });

    // close the landing overlay, as render.cjs does
    const t2 = Date.now();
    await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); });
    await p.waitForFunction(() => !(window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()), null, { timeout: 60000 });
    const tClose = Date.now() - t2;

    // how long does a pane actually take to become visible? render.cjs caps this at 2000ms.
    let worstPane = 0, worstName = '';
    for (const t of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
      const t3 = Date.now();
      await p.click(`.sidebar .seg button[data-tab="${t}"]`);
      await p.waitForFunction(
        id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== 'none'; },
        t, { timeout: 60000 });
      const d = Date.now() - t3;
      if (d > worstPane) { worstPane = d; worstName = t; }
    }
    await p.close();
    rows.push({ i, tGoto, readyAtGoto, tReady, tClose, worstPane, worstName, ...nav });
    console.log(`[${TAG} ${i}] goto=${tGoto}ms readyAtGoto=${readyAtGoto} readyWait=${tReady}ms closeOv=${tClose}ms ` +
                `worstPaneSwitch=${worstPane}ms(${worstName})  | page: domInteractive=${nav.domInt} DCL=${nav.dcl} load=${nav.load}`);
  }
  await browser.close();
  const max = k => Math.max(...rows.map(r => r[k]));
  console.log(`\n== ${TAG} MAX over ${N} runs ==  goto=${max('tGoto')}ms  readyWait=${max('tReady')}ms  paneSwitch=${max('worstPane')}ms  pageLoad=${max('load')}ms`);
  console.log('JSON ' + JSON.stringify({ tag: TAG, rows }));
})();
