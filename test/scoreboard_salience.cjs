/* ===================== SCOREBOARD SALIENCE -- MEASURED, NOT EYEBALLED =====================
 *
 * THE BUG THIS EXISTS TO MAKE IMPOSSIBLE
 * The drill scoreboard once painted SOLID in --teal and REVISIT in --amber. Those are also two of
 * the six ROOM hues, so in the teal room the Solid tile dissolved into the wallpaper and Revisit
 * was the only tile that popped: the board read INVERTED. You glanced at a good score and your eye
 * was pulled to the failure count. Measured over 6 rooms x 2 themes, the loudest tile was Solid in
 * 0 of 12.
 *
 * That was fixed by moving the verdict onto FILL-vs-OUTLINE (an area+luminance contrast, which no
 * room tint and no greyscale can reach). The fix was correct. It was also verified BY HAND, written
 * up in a comment, and left UNGUARDED -- and the comment then drifted into claiming a property the
 * code did not have ("the pop TRACKS THE SCORE"; it tracks got > 0). This check is the guard that
 * should have shipped with it.
 *
 * THE METRIC: PAINTED INK, NOT HUE
 *   ink(tile) = mean over the tile's pixels of |Y(pixel) - Y(--card)|
 * i.e. how far the tile departs, in RELATIVE LUMINANCE, from the surface it sits on. A filled slab
 * departs across its whole area; an outline departs only along its border and its digits. The
 * measure is therefore blind to hue by construction -- which is the entire property the scoreboard
 * is supposed to have, so measuring it in hue-blind terms is the only honest way to check it.
 * (This is also why "is the green one loudest?" is NOT the test: a check that reads the hue would
 * pass a board that is inverted in greyscale.)
 *
 * THE CONTRACT
 *   1. NEVER INVERTED   -- whenever Solid > 0, ink(Solid) > ink(Revisit), by a real margin.
 *                          Asserted at a BAD score too, not just a good one: the tile hierarchy is
 *                          constant by design, and if it ever flips at 1/5 that is the same bug.
 *   2. NEVER CELEBRATES ZERO -- at Solid == 0 the tile must NOT be filled.
 *   3. THE FILL IS REAL -- at Solid > 0 it must actually be a fill, not a hopeful border.
 *
 * State is driven by setting the component's own fields and calling its own renderD(), rather than
 * clicking through 21 probes x 48 combinations. That exercises the REAL element, the REAL stylesheet
 * and the REAL pixels -- what it skips is the grading arithmetic, which is not what this check is
 * about (unit_tests owns that). What is measured is what is painted.
 *
 * Usage: node test/scoreboard_salience.cjs [deliverable.html]   (CHROME=<path> for the browser)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');
const DSF = 2;
const MARGIN = 1.5;      /* Solid must beat Revisit by this factor -- "louder", not "a hair louder" */
const FILL_RATIO = 0.35; /* an UNfilled tile must be under this fraction of the same tile filled    */


/* Node's console.log does NOT implement C-style width/precision (%-6s, %8.4f) -- it prints the
 * format string verbatim and dumps raw floats. Pad explicitly. */
const L = (s, w) => String(s).padEnd(w).slice(0, w);
const R = (v, w, d) => (typeof v === 'number' ? v.toFixed(d) : String(v)).padStart(w);

const GROUPS = ['messaging-events', 'data-storage', 'reliability-observability',
  'platform-infra', 'architecture-apis', 'security-tenancy'];

/* got / shk. di is derived (= got + shk) and kept strictly below cards.length so renderD() stays on
 * the drawCard() path -- the terminal path renders the DEBRIEF from this.results, which we have not
 * populated. We are measuring the board, not the debrief. */
const STATES = [
  { got: 0, shk: 0, name: 'fresh   0/0' },
  { got: 1, shk: 5, name: 'bad     1/5' },
  { got: 5, shk: 1, name: 'GOOD    5/1' },
  { got: 8, shk: 2, name: 'strong  8/2' },
];

const INK = async ({ shots, cardCss }) => {
  const un64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Y = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

  /* --card may be a hex or an rgb(). Resolve it the only way that is always right: let the
   * browser paint it and read the pixel back. */
  const cv = new OffscreenCanvas(1, 1);
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.fillStyle = cardCss;
  cx.fillRect(0, 0, 1, 1);
  const cp = cx.getImageData(0, 0, 1, 1).data;
  const yCard = Y(cp[0], cp[1], cp[2]);

  const out = {};
  for (const k of Object.keys(shots)) {
    const bmp = await createImageBitmap(new Blob([un64(shots[k])], { type: 'image/png' }));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bmp, 0, 0);
    const d = x.getImageData(0, 0, bmp.width, bmp.height).data;
    let acc = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { acc += Math.abs(Y(d[i], d[i + 1], d[i + 2]) - yCard); n++; }
    out[k] = acc / n;
  }
  return out;
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const scratch = await (await browser.newContext()).newPage();
  const fails = [], rows = [];

  for (const theme of ['light', 'dark']) {
    for (const group of GROUPS) {
      const ctx = await browser.newContext({ deviceScaleFactor: DSF, viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
      await B.gotoApp(page, HTML);
      await B.closeIndex(page);

      const topic = await page.evaluate((g) => {
        for (const id of TopicRegistry.ids()) { const t = TopicRegistry.get(id); if (t && t.identity && t.identity.group === g) return id; }
        return null;
      }, group);
      if (!topic) { fails.push('[' + theme + '/' + group + '] no registered topic'); await ctx.close(); continue; }

      await page.evaluate((t) => { location.hash = '#' + t + '/drill'; }, topic);
      await B.until(page, (g) => document.documentElement.getAttribute('data-group') === g
        && !!(document.querySelector('deep-drill') || {}).shadowRoot, group, 15000, 'drill in ' + group);
      await B.settle(page);

      const cardCss = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--card').trim());
      const byState = {};

      for (const st of STATES) {
        const applied = await page.evaluate(({ got, shk }) => {
          const el = document.querySelector('deep-drill');
          const n = (typeof cards !== 'undefined' && cards.length) ? cards.length : 0;
          if (got + shk >= n) return { err: 'state ' + got + '/' + shk + ' exceeds deck (' + n + ')' };
          el.got = got; el.shk = shk; el.di = got + shk;
          el.renderD();
          const r = el.shadowRoot;
          const g = r.querySelector('.pill.g'), s = r.querySelector('.pill.s');
          return { gz: g.classList.contains('z'), sz: s.classList.contains('z'), deck: n };
        }, st);
        if (applied.err) { fails.push('[' + theme + '/' + group + '] ' + applied.err); continue; }
        await B.settle(page);

        const shots = {};
        for (const [k, sel] of [['g', '.pill.g'], ['s', '.pill.s'], ['left', '.pill.left']]) {
          shots[k] = (await page.locator(sel).first().screenshot()).toString('base64');
        }
        const ink = await scratch.evaluate(INK, { shots, cardCss });
        byState[st.name] = ink;
        rows.push({ theme, group, state: st.name, ...ink, ratio: ink.s > 0 ? ink.g / ink.s : Infinity, gz: applied.gz });

        /* 1. NEVER INVERTED */
        if (st.got > 0 && !(ink.g > ink.s * MARGIN)) {
          fails.push('[' + theme + '/' + group + '] ' + st.name + ': INVERTED -- Solid ink ' + ink.g.toFixed(4)
            + ' is not > ' + MARGIN + 'x Revisit ink ' + ink.s.toFixed(4) + ' (ratio ' + (ink.g / ink.s).toFixed(2) + 'x)');
        }
        /* 2. NEVER CELEBRATES ZERO */
        if (st.got === 0 && !applied.gz) {
          fails.push('[' + theme + '/' + group + '] ' + st.name + ': Solid tile is not .z at zero -- it would FILL on an empty pile');
        }
      }

      /* 2b + 3: the zero tile must be measurably UNfilled vs the same tile filled. */
      const z = byState['fresh   0/0'], f = byState['GOOD    5/1'];
      if (z && f) {
        if (!(z.g < f.g * FILL_RATIO)) {
          fails.push('[' + theme + '/' + group + '] Solid at 0 (ink ' + z.g.toFixed(4) + ') is not meaningfully '
            + 'quieter than Solid at 5 (ink ' + f.g.toFixed(4) + ') -- the zero-guard is not doing anything');
        }
        if (!(f.g > z.g * 2)) {
          fails.push('[' + theme + '/' + group + '] Solid at 5 (ink ' + f.g.toFixed(4) + ') is barely louder than at 0 '
            + '(' + z.g.toFixed(4) + ') -- the FILL is not actually filling');
        }
      }
      await ctx.close();
    }
  }
  await browser.close();

  console.log('=== SCOREBOARD SALIENCE -- painted ink per tile (mean |Y - Y(--card)|, hue-blind) ===');
  console.log(L('theme', 6) + L('room', 27) + L('state', 13) + R('SOLID', 9) + R('revisit', 9) + R('left', 9) + R('S:R', 9));
  for (const r of rows) {
    console.log(L(r.theme, 6) + L(r.group, 27) + L(r.state, 13) + R(r.g, 9, 4) + R(r.s, 9, 4) + R(r.left, 9, 4)
      + R(r.ratio, 8, 1) + 'x' + (r.gz ? '   <- Solid EMPTY: outlined, not filled' : ''));
  }

  if (fails.length) {
    console.log('\nSCOREBOARD SALIENCE: FAIL ' + fails.length);
    fails.forEach((f) => console.log('  - ' + f));
    return B.finish(1, 'SCOREBOARD SALIENCE: FAIL');
  }
  console.log('\nSCOREBOARD SALIENCE: PASS  (' + rows.length + ' room x theme x score;'
    + ' Solid is the loudest tile whenever it is non-empty, in every room, both themes, and never fills at zero)');
  return B.finish(0);
})();
