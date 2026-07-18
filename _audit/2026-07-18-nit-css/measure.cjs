/* ===== OVERLAY-FAMILY GEOMETRY INSTRUMENT (nit-css lane) =====
 *
 * Measures, for all 7 dialog overlays (mockov mixov cramov sessov keyov scopeov planov):
 *   - the panel's getBoundingClientRect at rest (post-panelIn, opacity>=.995, rect stable 2 rAFs)
 *   - the four gaps to the viewport edges (topGap/bottomGap/leftGap/rightGap)
 *   - computed max-width / margin-top / margin-bottom of the panel
 * at 1280x800 AND 360x740, light AND dark  (7 x 2 x 2 = 28 opens per run).
 *
 * Also measures:
 *   - the six "Cram ->" pills (.ix-g-cram) in the home All-topics section: w/h each, min-height
 *     computed, and the y of the FIRST pill (fold check for the vr home baseline @800h)
 *   - the same pills inside the Topic Index overlay (idx)
 *   - mock-run WITHIN-RUN panel height dynamics (open -> reveal -> next x3) @1280 light,
 *     to quantify what vertical centring does to chrome stability mid-run
 *
 * Same instrument runs before and after the fix:  node measure.cjs <deliverable> <tag>
 * Writes  <tag>.json  next to itself, screenshots under  shots-<tag>/ .
 * Opens via el.click() in-page (geometry, not hit-testing, is under test here -- the hit-tested
 * interaction contract is owned by test/overlay_deadzone.cjs / overlay_keyboard.cjs).
 * Closes via trusted Escape (falls back to the x button), waits for display:none.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', '..', 'node_modules', 'playwright'));
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const HTML = process.argv[2] || path.join(__dirname, '..', '..', 'deepdive_content_pipeline_rehearsal.html');
const TAG = process.argv[3] || 'before';
const OUT = path.join(__dirname, TAG + '.json');
const SHOTS = path.join(__dirname, 'shots-' + TAG);
fs.mkdirSync(SHOTS, { recursive: true });

const OVERLAYS = [
  { ov: 'cramov',  trg: 'cramopen',  panel: '.cram-panel' },
  { ov: 'mockov',  trg: 'mockopen',  panel: '.mock-panel' },
  { ov: 'mixov',   trg: 'mixopen',   panel: '.mock-panel' },
  { ov: 'sessov',  trg: 'sessopen',  panel: '.mock-panel' },
  { ov: 'keyov',   trg: 'keyopen',   panel: '.mock-panel' },
  { ov: 'scopeov', trg: 'scopeopen', panel: '.mock-panel' },
  { ov: 'planov',  trg: 'planopen',  panel: '.mock-panel' },
];
const VIEWPORTS = [{ w: 1280, h: 800 }, { w: 360, h: 740 }];
const THEMES = ['light', 'dark'];

async function stableRect(page, sel) {
  /* rect identical across 2 consecutive rAFs -> the entry animation is genuinely done */
  return page.evaluate((s) => new Promise((res, rej) => {
    const el = document.querySelector(s);
    if (!el) return rej(new Error('no panel ' + s));
    let last = null, same = 0, n = 0;
    (function tick() {
      const r = el.getBoundingClientRect();
      const cur = [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100).join(',');
      if (cur === last) { if (++same >= 2) return res({ x: r.x, y: r.y, w: r.width, h: r.height }); }
      else { same = 0; last = cur; }
      if (++n > 600) return rej(new Error('rect never stabilised: ' + cur));
      requestAnimationFrame(tick);
    })();
  }), sel);
}

async function openOverlay(page, o) {
  await page.evaluate((id) => document.getElementById(id).click(), o.trg);
  await page.waitForFunction((id) => {
    const el = document.getElementById(id);
    return el && el.classList.contains('open') && !el.classList.contains('closing');
  }, o.ov, { timeout: 5000 });
  await B.waitPainted(page.locator('#' + o.ov + ' ' + o.panel), 5000);
  return stableRect(page, '#' + o.ov + ' ' + o.panel);
}

async function closeOverlay(page, o) {
  await page.keyboard.press('Escape');
  try {
    await page.waitForFunction((id) => getComputedStyle(document.getElementById(id)).display === 'none',
      o.ov, { timeout: 3000 });
  } catch (e) {
    /* fallback: the overlay's own x */
    await page.evaluate((id) => { const x = document.querySelector('#' + id + ' .mock-x'); if (x) x.click(); }, o.ov);
    await page.waitForFunction((id) => getComputedStyle(document.getElementById(id)).display === 'none',
      o.ov, { timeout: 5000 });
  }
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const results = { tag: TAG, html: path.basename(HTML), when: new Date().toISOString(), overlays: [], pills: {}, mockDynamics: null };

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      await B.gotoApp(page, HTML);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      await B.enterApp(page);            /* home -> walk: the sidebar with all 7 triggers */
      await B.settle(page);

      for (const o of OVERLAYS) {
        const r = await openOverlay(page, o);
        const cs = await page.evaluate((sel) => {
          const el = document.querySelector(sel), s = getComputedStyle(el);
          return { maxWidth: s.maxWidth, marginTop: s.marginTop, marginBottom: s.marginBottom };
        }, '#' + o.ov + ' ' + o.panel);
        const row = {
          overlay: o.ov, vp: vp.w + 'x' + vp.h, theme,
          x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.w.toFixed(1), h: +r.h.toFixed(1),
          topGap: +r.y.toFixed(1), bottomGap: +(vp.h - r.y - r.h).toFixed(1),
          leftGap: +r.x.toFixed(1), rightGap: +(vp.w - r.x - r.w).toFixed(1),
          maxWidth: cs.maxWidth, marginTop: cs.marginTop, marginBottom: cs.marginBottom,
        };
        results.overlays.push(row);
        await page.screenshot({ path: path.join(SHOTS, `${o.ov}-${vp.w}x${vp.h}-${theme}.png`) });
        await closeOverlay(page, o);
      }
      await ctx.close();
    }
  }

  /* ---- Cram pills: home All-topics section + index overlay, 1280x800, both themes ---- */
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await B.settle(page);

    const home = await page.evaluate(() => {
      const pills = [...document.querySelectorAll('.ix-g-cram')];
      return {
        count: pills.length,
        boxes: pills.map(p => { const r = p.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), y: +r.y.toFixed(1), layoutW: p.offsetWidth, layoutH: p.offsetHeight }; }),
        minHeightComputed: pills[0] ? getComputedStyle(pills[0]).minHeight : null,
        firstPillY: pills[0] ? +pills[0].getBoundingClientRect().y.toFixed(1) : null,
        anyAboveFold: pills.some(p => p.getBoundingClientRect().y < 800),
        headHeights: [...document.querySelectorAll('.ix-g-head')].map(h => +h.getBoundingClientRect().height.toFixed(1)),
      };
    });
    /* pill + its group-header row, screenshotted in place (scrolled into view) */
    const head = page.locator('.ix-group[data-group="architecture-apis"] .ix-g-head');
    if (await head.count()) {
      await head.scrollIntoViewIfNeeded();
      await B.settle(page);
      await head.screenshot({ path: path.join(SHOTS, `pill-head-home-${theme}.png`) });
      await page.screenshot({ path: path.join(SHOTS, `pill-context-home-${theme}.png`) });
    }
    results.pills['home-' + theme] = home;

    /* index overlay (idx): same pills on the overlay surface */
    await B.enterApp(page);
    await page.evaluate(() => document.getElementById('idxopen').click());
    await page.waitForFunction(() => window.IndexOverlay && window.IndexOverlay.isOpen(), null, { timeout: 5000 });
    /* AT REST, not mid-entry: the ix panel enters with a scale() term, and a
     * getBoundingClientRect taken before it settles reports the SCALED box (caught live:
     * 61.3x23.3 = 24px x 0.97). Two traps, both hit on consecutive runs: (1) sampling
     * mid-animation; (2) sampling in the window BETWEEN .open and the entry animation's
     * first frame, where the panel sits STATIC at its from-state scale -- a bare
     * "rect stable across N frames" check reads that as settled. waitPainted (effective
     * opacity >= .995, the cta-fix instrument) excludes the from-state, then the
     * stability wait excludes mid-flight. offsetWidth/Height are also recorded: layout
     * boxes, transform-independent -- the at-rest truth regardless of either trap. */
    await B.waitPainted(page.locator('.ix-ov .ix-panel'), 5000);
    await stableRect(page, '.ix-ov .ix-g-cram');
    const idx = await page.evaluate(() => {
      const pills = [...document.querySelectorAll('.ix-ov .ix-g-cram')];
      return {
        count: pills.length,
        boxes: pills.map(p => { const r = p.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), layoutW: p.offsetWidth, layoutH: p.offsetHeight }; }),
      };
    });
    const ihead = page.locator('.ix-ov .ix-group[data-group="architecture-apis"] .ix-g-head');
    if (await ihead.count()) {
      await ihead.scrollIntoViewIfNeeded();
      await B.settle(page);
      await ihead.screenshot({ path: path.join(SHOTS, `pill-head-idx-${theme}.png`) });
    }
    results.pills['idx-' + theme] = idx;
    await ctx.close();
  }

  /* ---- mock-run within-run height dynamics @1280 light: what does centring move mid-run? ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML);
    await B.enterApp(page);
    await B.settle(page);
    const o = OVERLAYS[1]; /* mockov */
    await openOverlay(page, o);
    const series = [];
    const snap = async (label) => {
      const r = await stableRect(page, '#mockov .mock-panel');
      series.push({ step: label, y: +r.y.toFixed(1), h: +r.h.toFixed(1) });
    };
    await snap('open');
    for (let i = 0; i < 3; i++) {
      const acted = await page.evaluate(() => {
        const host = document.querySelector('#mockov deep-mock-run');
        const root = host && host.shadowRoot;
        const rev = root && root.getElementById('mbrev');
        const nxt = root && root.getElementById('mbnext');
        if (rev && rev.offsetParent !== null) { rev.click(); return 'reveal'; }
        if (nxt && nxt.offsetParent !== null) { nxt.click(); return 'next'; }
        return null;
      });
      if (!acted) break;
      await B.settle(page);
      await snap(acted);
    }
    results.mockDynamics = series;
    await closeOverlay(page, o);
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const short = results.overlays.map(r => `${r.overlay}@${r.vp}/${r.theme}: x=${r.x} y=${r.y} w=${r.w} h=${r.h} gaps t${r.topGap} b${r.bottomGap}`).join('\n');
  console.log(short);
  console.log('pills:', JSON.stringify(results.pills, null, 1).slice(0, 1200));
  console.log('mockDynamics:', JSON.stringify(results.mockDynamics));
  console.log('WROTE', OUT);
})().catch(e => { console.error('MEASURE FAILED:', e); process.exit(1); });
