/* ============================================================================
 * D3-perf ZERO-VR proof for the UNGUARDED panes I touch (trade).
 * The VR gate covers num (guarded, I touched it) + drill/sys/wb (I didn't).
 * Trade is NOT in the baseline set, so prove it directly here: capture the
 * trade pane at REST on base vs branch, same viewport/theme the gate uses
 * (1280x800, ddr.v1.theme), and diff the decoded pixels with the gate's own
 * CHANNEL_TOL=2 + diffImages. content-visibility:auto only skips BELOW-fold
 * cards, so the at-rest viewport must be byte-identical.
 *
 * Usage: node _perf/vrcheck.cjs [--pane trade] [--base ...] [--branch ...]
 * ==========================================================================*/
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./../test/_boot.cjs');
const P = require('./../test/_pixels.cjs');

function argv(name, def) { const i = process.argv.indexOf('--' + name); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def; }
const PANE = argv('pane', 'trade');
const BASE = path.resolve(argv('base', path.join(__dirname, 'builds', 'base.html')));
const BRANCH = path.resolve(argv('branch', path.join(__dirname, 'builds', 'branch.html')));
const T0 = 'event-driven';
const TOL = 2;

function diffImages(a, b, tol) {
  if (a.w !== b.w || a.h !== b.h) return { dim: true, a: a.w + 'x' + a.h, b: b.w + 'x' + b.h };
  const n = a.w * a.h; let changed = 0, worst = 0;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const d = Math.max(Math.abs(a.data[p] - b.data[p]), Math.abs(a.data[p + 1] - b.data[p + 1]), Math.abs(a.data[p + 2] - b.data[p + 2]));
    if (d > worst) worst = d;
    if (d > tol) changed++;
  }
  return { changed, worst, total: n };
}

async function capture(html, theme) {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: theme });
  const page = await ctx.newPage();
  await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
  await B.gotoApp(page, html, { hash: '#' + T0 + '/' + PANE });
  await B.enterApp(page).catch(() => {});
  // make sure we're on the target pane and painted at rest
  await page.evaluate((p) => { if (window.switchTab) window.switchTab(p); }, PANE);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  await B.settle(page);
  await B.waitPainted(page.locator('#' + PANE)).catch(() => {});
  await B.settle(page);
  const buf = await page.screenshot({ caret: 'hide', animations: 'allow', scale: 'css' });
  await browser.close();
  return P.decodePng(buf);
}

async function run() {
  let anyFail = false;
  for (const theme of ['light', 'dark']) {
    const a = await capture(BASE, theme);
    const b = await capture(BRANCH, theme);
    const d = diffImages(a, b, TOL);
    const ok = !d.dim && d.changed === 0;
    if (!ok) anyFail = true;
    console.log('[' + PANE + ' ' + theme + '] ' + (d.dim ? 'DIM MISMATCH ' + d.a + ' vs ' + d.b
      : (d.changed === 0 ? 'ZERO pixels changed (worst channel delta ' + d.worst + '/255, tol ' + TOL + ')  PASS'
        : d.changed + ' pixels changed (worst ' + d.worst + ')  FAIL')));
  }
  console.log(anyFail ? '\nRESULT: FAIL -- pixels moved' : '\nRESULT: PASS -- ' + PANE + ' is byte-identical at rest, base vs branch');
  process.exit(anyFail ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(1); });
