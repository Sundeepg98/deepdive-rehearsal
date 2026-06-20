#!/usr/bin/env node
/*
 * Functional render test for the assembled single-file deliverable.
 *
 * Local use:
 *   npm i playwright && npx playwright install chromium
 *   node test/render.cjs                       # tests ../deepdive_content_pipeline_rehearsal.html
 *   node test/render.cjs path/to/file.html     # test a specific build
 *   CHROME=/path/to/chrome node test/render.cjs # use a specific Chromium binary
 *
 * Verifies, in a real browser, that the built file:
 *   - loads with zero page errors / console errors,
 *   - switches all 9 panes (each becomes visible on its tab click),
 *   - has all 7 dialog overlays present in the DOM,
 *   - produces no horizontal overflow.
 * Exits non-zero on any failure.
 */
const path = require('path');
const { chromium } = require('playwright');

const HTML = process.argv[2] ||
  path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const OVERLAYS = ['mockov', 'mixov', 'cramov', 'sessov', 'keyov', 'scopeov', 'planov'];

(async () => {
  const errs = [];
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;

  const browser = await chromium.launch(launch);
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto('file://' + path.resolve(HTML));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const paneFails = [];
  for (const t of PANES) {
    await page.click(`.sidebar .seg button[data-tab="${t}"]`);
    await page.waitForTimeout(70);
    const ok = await page.evaluate(
      id => { const p = document.getElementById(id); return !!p && getComputedStyle(p).display !== 'none'; },
      t
    );
    if (!ok) paneFails.push(t);
  }

  const ovMissing = [];
  for (const id of OVERLAYS) {
    const exists = await page.evaluate(i => !!document.getElementById(i), id);
    if (!exists) ovMissing.push(id);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );

  await browser.close();

  const pass = errs.length === 0 && paneFails.length === 0 && ovMissing.length === 0 && !overflow;
  console.log(
    `panes ${PANES.length - paneFails.length}/${PANES.length}  |  ` +
    `overlays ${OVERLAYS.length - ovMissing.length}/${OVERLAYS.length}  |  ` +
    `h-overflow ${overflow}  |  js-errors ${errs.length}`
  );
  if (paneFails.length) console.log('  panes not shown: ' + paneFails.join(', '));
  if (ovMissing.length) console.log('  overlays missing: ' + ovMissing.join(', '));
  errs.slice(0, 8).forEach(e => console.log('  ' + e));
  console.log(pass ? 'RENDER TEST: PASS' : 'RENDER TEST: FAIL');
  process.exit(pass ? 0 : 1);
})();
