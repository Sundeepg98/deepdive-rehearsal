/* ===== CRAM-PILL TAP-FLOOR INSTRUMENT (nit-css lane, ROUND 2) =====
 *
 * Round 1's pill evidence was DESKTOP-ONLY (before/after.json pills: home/idx x light/dark
 * at 1280x800) -- and the defect the verifier bounced lived exactly in the unmeasured arm:
 * `.ix-g-cram{min-height:24px}` (0,1,0) beats the MOBILE TAP FLOOR's bare
 * `button{min-height:44px}` (0,0,1, <=919px) at every touch width, so the committed round-1
 * build shrank a live 44px touch target to 24px at 360x740. This instrument closes that gap:
 *
 *   surfaces: home All-topics library + Topic Index overlay (idx)
 *   viewports: 1280x800 AND 360x740     themes: light AND dark
 *   per pill: getBoundingClientRect w/h AND offsetWidth/Height (layout boxes,
 *             transform-independent -- the idx panel RESTS at scale(.97) until .vis lands,
 *             so rect-only sampling has two known traps; see measure.cjs), plus computed
 *             min-height and the .ix-g-head row heights.
 *
 * Run against THREE builds (same instrument, three tags):
 *   pills-parent.json  <- 54596e7's deliverable: the app floor working (44px @360, 21px @1280)
 *   pills-r1.json      <- d575808's deliverable: NEGATIVE CONTROL -- this arm must SEE the
 *                         regression (24px @360) or the instrument cannot fail
 *   pills-after.json   <- the fixed build: 24px @1280 (D12 floor), 44px @360 (app floor)
 *
 * Usage: node pills-vp.cjs <deliverable.html> <tag> [--shots]
 * Writes pills-<tag>.json next to itself; --shots saves head-row PNGs under shots-r2/.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', '..', 'node_modules', 'playwright'));
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const HTML = process.argv[2];
const TAG = process.argv[3] || 'pills';
const SHOTS_ON = process.argv.includes('--shots');
const OUT = path.join(__dirname, 'pills-' + TAG + '.json');
const SHOTS = path.join(__dirname, 'shots-r2');
if (SHOTS_ON) fs.mkdirSync(SHOTS, { recursive: true });
if (!HTML || !fs.existsSync(HTML)) { console.error('no deliverable at ' + HTML); process.exit(1); }

const VIEWPORTS = [{ w: 1280, h: 800 }, { w: 360, h: 740 }];
const THEMES = ['light', 'dark'];

async function stableRect(page, sel) {
  return page.evaluate((s) => new Promise((res, rej) => {
    const el = document.querySelector(s);
    if (!el) return rej(new Error('no el ' + s));
    let last = null, same = 0, n = 0;
    (function tick() {
      const r = el.getBoundingClientRect();
      const cur = [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100).join(',');
      if (cur === last) { if (++same >= 2) return res(true); }
      else { same = 0; last = cur; }
      if (++n > 600) return rej(new Error('rect never stabilised: ' + cur));
      requestAnimationFrame(tick);
    })();
  }), sel);
}

function grab(scopeSel) {
  /* runs in-page: every .ix-g-cram within scope -> rect + layout boxes; head rows too */
  return `(() => {
    const scope = ${scopeSel ? `document.querySelector('${scopeSel}')` : 'document'};
    const pills = [...scope.querySelectorAll('.ix-g-cram')];
    const heads = [...scope.querySelectorAll('.ix-g-head')];
    return {
      count: pills.length,
      minHeightComputed: pills[0] ? getComputedStyle(pills[0]).minHeight : null,
      boxes: pills.map(p => { const r = p.getBoundingClientRect(); return {
        w: +r.width.toFixed(1), h: +r.height.toFixed(1), layoutW: p.offsetWidth, layoutH: p.offsetHeight }; }),
      headHeights: heads.map(h => +h.getBoundingClientRect().height.toFixed(1)),
    };
  })()`;
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const results = { tag: TAG, html: path.basename(HTML), when: new Date().toISOString(), arms: [] };

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      await B.gotoApp(page, HTML);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await B.settle(page);

      /* -- surface 1: home All-topics library (the boot route) -- */
      const home = await page.evaluate(grab(null));
      results.arms.push({ vp: vp.w + 'x' + vp.h, theme, surface: 'home', ...home });
      if (SHOTS_ON) {
        const head = page.locator('.ix-group[data-group="architecture-apis"] .ix-g-head').first();
        if (await head.count()) {
          await head.scrollIntoViewIfNeeded(); await B.settle(page);
          await head.screenshot({ path: path.join(SHOTS, `r2-pill-head-home-${vp.w}-${theme}.png`) });
          await page.screenshot({ path: path.join(SHOTS, `r2-pill-context-home-${vp.w}-${theme}.png`) });
        }
      }

      /* -- surface 2: Topic Index overlay -- at REST (waitPainted + stable rect: the ix panel
         sits static at scale(.97) before .vis, and a bare stability wait reads that as settled;
         both traps documented in measure.cjs) -- */
      await B.enterApp(page);
      await page.evaluate(() => document.getElementById('idxopen').click());
      await page.waitForFunction(() => window.IndexOverlay && window.IndexOverlay.isOpen(), null, { timeout: 5000 });
      await B.waitPainted(page.locator('.ix-ov .ix-panel'), 5000);
      await stableRect(page, '.ix-ov .ix-g-cram');
      const idx = await page.evaluate(grab('.ix-ov'));
      results.arms.push({ vp: vp.w + 'x' + vp.h, theme, surface: 'idx', ...idx });
      if (SHOTS_ON) {
        const ihead = page.locator('.ix-ov .ix-group[data-group="architecture-apis"] .ix-g-head').first();
        if (await ihead.count()) {
          await ihead.scrollIntoViewIfNeeded(); await B.settle(page);
          await ihead.screenshot({ path: path.join(SHOTS, `r2-pill-head-idx-${vp.w}-${theme}.png`) });
        }
      }
      await ctx.close();
    }
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  for (const a of results.arms) {
    const hs = [...new Set(a.boxes.map(b => b.h))], lhs = [...new Set(a.boxes.map(b => b.layoutH))];
    console.log(`${a.surface}@${a.vp}/${a.theme}: n=${a.count} rectH=${hs} layoutH=${lhs} minH=${a.minHeightComputed} heads=${[...new Set(a.headHeights)]}`);
  }
  console.log('WROTE', OUT);
})().catch(e => { console.error('PILLS MEASURE FAILED:', e); process.exit(1); });
