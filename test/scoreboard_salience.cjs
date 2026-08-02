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

/* ============ THE ALTITUDE GAUGE -- THE SAME CONTRACT, ON THE OTHER BOARD ====================
 * WHY THIS LIVES HERE. The defect this file was written for is "a verdict mark drawn quieter than
 * a worse one", measured in painted ink rather than declared hue. The home's altitude gauge had
 * exactly that, and worse: its KEEL -- the 2px foot that says a topic carries flagged probes --
 * wired the WORST grade (missed) to `--st-warn-edge` and the MIDDLE grade (shaky) to `--st-warn`,
 * so severity ran backwards. MEASURED against the trough on the shipped build:
 *     SHAKY 4.64:1 light / 8.21:1 dark      MISSED 2.02:1 light / 2.96:1 dark   floor 3:1
 * -- the worst grade 2.30x and 2.77x quieter than the middle one, and the only one of the two
 * below the non-text floor in either scheme. No correctness panel could see it: both states paint,
 * both differ, and nothing asserted an ORDER. Rather than build a second ordering instrument, the
 * gauge is measured by this one.
 *
 * IT IS READ OFF PIXELS AND SWEPT ACROSS THE FILL RANGE, which is the part that matters. A keel
 * is never drawn on the trough -- a flagged topic has been graded, so its capsule is filled -- and
 * the two keel values STRADDLE the fill range, so their loudness order FLIPS with the ground. The
 * first fix (swap the tokens) was correct against the trough and STILL INVERTED against the
 * capsule: missed 2.60:1 vs shaky 3.54:1 on a fully-lit capsule in light, 1.82 vs 4.40 in dark.
 * The mark now reserves a 2px waterline the fill does not cover, so its ground is constant; this
 * sweep drives all four --lv steps and would go red if that waterline were removed.
 *
 * FOUR CLAIMS, all on the panel's own screenshot:
 *   1. ORDERING   every MISSED mark is at least as loud as every SHAKY mark
 *   2. FLOOR      every keel mark clears 3:1 against the trough it is drawn on
 *   3. DENOMINATOR the untouched capsule's rule clears 3:1 -- at 1.09:1 light / 1.46:1 dark the
 *                  46-unit lattice dissolved into a beige trough and the mark read as a progress
 *                  bar, which is the generic form it was invented to escape
 *   4. DEPTH      the panel surface stands off the home ground -- 1.05:1 light / 1.14:1 dark made
 *                 five panels regions of one plane with a hairline between them
 */
const NONTEXT_FLOOR = 3.0;
const DEPTH_FLOOR = 1.25;
/* the gauge's marks are 1-2 CSS px thick. At the board's DSF of 2 they have no interior pixel
   that a sub-pixel phase shift cannot reach; at 4 they do. See BOX_Y. */
const GAUGE_DSF = 2;
/* tall enough that the whole home fits WITHOUT SCROLLING. Every fragility this section fought --
   an element screenshot that re-scrolls before it rasterises, a clip whose origin drifts, a
   removal diff between two images taken at different offsets -- is downstream of one thing:
   scrolling. At scrollY 0 with nothing to scroll, getBoundingClientRect and the bitmap share one
   origin and one phase, on every shot, on every run. */
const GAUGE_VH = 2400;

/* seeds a record whose solid share walks the whole --lv range, with MISSED on some topics and
   SHAKY on others, so both keel variants paint at every fill step */
const GAUGE_SEED = () => {
  localStorage.clear();
  TopicRegistry.ids().forEach((id, k) => {
    /* EVERY THIRD TOPIC IS LEFT UNGRADED ON PURPOSE. The denominator arm measures the UNTOUCHED
       capsule's rule, and a seed that grades all 46 topics paints none -- which is how a check
       reports a clean zero without having looked at anything. This one refuses instead. */
    if (k % 3 === 2) return;
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    const share = (k % 6) / 5;                       /* 0, .2, .4, .6, .8, 1 */
    const bad = (k % 2) ? 1 : 2;                     /* odd topics MISSED, even topics SHAKY */
    cards.forEach((c, i) => { map[keys[i]] = (i / cards.length < share) ? 3 : bad; });
    const solid = Object.keys(map).filter((x) => map[x] >= 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: solid, shk: cards.length - solid, done: cards.length, tot: cards.length,
      revisit: ['idempotency'], cards: map, cv: 1, ts: Date.now() }));
  });
};

/* Relative luminance over each named box of a base64 PNG -- mean, min and max. Runs in the
   scratch page for the same reason INK does: OffscreenCanvas is the decoder, and no dependency is
   added to the gate.

   WHY min/max AND NOT JUST THE MEAN. `elementHandle.screenshot()` scrolls before it rasterises,
   and the scroll lands on a fractional CSS pixel, so the bitmap's pixel grid sits at a sub-pixel
   phase that VARIES BETWEEN RUNS. A 2px keel sampled as a mean over its nominal band therefore
   measured 4.64:1 on one run and 4.37:1 on the next, and on a third the dark rows collapsed to
   1.07:1 -- the band had slid off the mark entirely. A check that reports a different number each
   time it is asked is not a measurement, and one that can slide off its subject is worse than
   none. The fix is resolution plus an extremum: at GAUGE_DSF the mark is several device rows
   thick, so it always has PURE interior pixels no phase can reach, and taking the pixel furthest
   from the reference inside a band drawn deliberately WIDER than the mark recovers the mark's own
   colour rather than an average of it and its neighbours. */
const BOX_Y = async ({ shot, boxes }) => {
  const un64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Y = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const bmp = await createImageBitmap(new Blob([un64(shot)], { type: 'image/png' }));
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, bmp.width, bmp.height).data;
  const out = [];
  for (const b of boxes) {
    const x0 = Math.max(0, Math.round(b.x)), x1 = Math.min(bmp.width, Math.round(b.x + b.w));
    const y0 = Math.max(0, Math.round(b.y)), y1 = Math.min(bmp.height, Math.round(b.y + b.h));
    let acc = 0, n = 0, lo = Infinity, hi = -Infinity;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * bmp.width + xx) * 4;
      const v = Y(d[i], d[i + 1], d[i + 2]);
      acc += v; n++;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    out.push(n ? { mean: acc / n, min: lo, max: hi } : null);
  }
  return out;
};
/* among the mark's OWN pixels (the ones the removal diff isolated), the one furthest from the
   reference -- the mark's colour rather than its antialiased skirt */
const FAR = (b, ref) => (Math.abs(b.max - ref) >= Math.abs(ref - b.min) ? b.max : b.min);
const CR = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return (hi + 0.05) / (lo + 0.05); };
/* ---- THE MARK IS FOUND BY REMOVING IT, NOT BY AIMING AT IT ---------------------------------
   Two rounds of geometric sampling failed here and both failures are worth keeping. Aiming a thin
   band at a 2px mark read 4.64:1 on one run and 1.07:1 on the next, because `elementHandle
   .screenshot()` scrolls to a fractional pixel and the raster phase moves under the coordinates.
   Widening the band and taking the extremum then read the FILL instead of the mark -- 10.00:1 for
   a keel that is nominally 4.64.

   So the mark is isolated the way this repo prices any other declaration: REMOVE IT AND DIFF.
   Shot A is the page; shot B is the page with the mark's own declaration suppressed; the pixels
   that differ ARE the mark, wherever the phase happened to put them. Nothing is aimed, so nothing
   can miss, and the same run yields the same number. It also makes each arm a removal control in
   its own right: a mark whose suppression changes ZERO pixels is a declaration that never reached
   the screen, and that is reported rather than averaged away. */
const MARK_Y = async ({ shotA, shotB, boxes }) => {
  const un64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const Y = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const grab = async (b64) => {
    const bmp = await createImageBitmap(new Blob([un64(b64)], { type: 'image/png' }));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bmp, 0, 0);
    return { w: bmp.width, h: bmp.height, d: x.getImageData(0, 0, bmp.width, bmp.height).data };
  };
  const A = await grab(shotA), Bm = await grab(shotB);
  const out = [];
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.x)), x1 = Math.min(A.w, Math.ceil(b.x + b.w));
    const y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(A.h, Math.ceil(b.y + b.h));
    let acc = 0, n = 0, lo = Infinity, hi = -Infinity;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * A.w + xx) * 4;
      /* 12/255 per channel: comfortably above encoder noise, far below any real mark's step */
      const diff = Math.abs(A.d[i] - Bm.d[i]) + Math.abs(A.d[i + 1] - Bm.d[i + 1]) + Math.abs(A.d[i + 2] - Bm.d[i + 2]);
      if (diff < 12) continue;
      const v = Y(A.d[i], A.d[i + 1], A.d[i + 2]);
      acc += v; n++;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    out.push(n ? { mean: acc / n, min: lo, max: hi, n } : null);
  }
  return out;
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const scratch = await (await browser.newContext()).newPage();
  const fails = [], rows = [];
  const gaugeRows = [];

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

  /* ---------------- THE ALTITUDE GAUGE ---------------- */
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ deviceScaleFactor: GAUGE_DSF, viewport: { width: 1280, height: GAUGE_VH } });
    const page = await ctx.newPage();
    await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
    await B.gotoApp(page, HTML, { hash: '#home' });
    await page.evaluate(GAUGE_SEED);
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.until(page, () => !!document.querySelector('#home .hm-alt .hm-seg.keel'), null, B.ACT_MS,
      'a gauge with keel marks on it');
    await B.settle(page);

    /* SCROLL FIRST, THEN MEASURE, THEN SHOOT. `elementHandle.screenshot()` scrolls the element
       into view before it rasterises, and the gauge sits below the fold since the arrival order
       changed -- so geometry read BEFORE that scroll describes a different sub-pixel phase than
       the bitmap does. Measured cost of getting this wrong: the same untouched rule read 4.10:1
       on one run and 3.87:1 on the next, from one device row of drift. Same numbers, twice, is
       the property that makes this table a receipt. */
    /* THE PANEL MUST BE REACHABLE WITHOUT SCROLLING, and smooth scrolling is switched off so a
       stray animated scroll cannot creep between two shots of a diff pair. `html{scroll-behavior:
       smooth}` is set app-wide, and applyRoute() calls scrollTo(0,0) on entering the home: with it
       on, one shot of a pair could be taken mid-glide. That is what left the dark rows drifting
       after the viewport was made tall enough. */
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    const fits = await page.evaluate(() => {
      window.scrollTo(0, 0);
      const r = document.querySelector('.hm-alt').getBoundingClientRect();
      return { ok: r.top >= 0 && r.bottom <= window.innerHeight, bottom: Math.round(r.bottom) };
    });
    if (!fits.ok) {
      fails.push('[' + theme + '/gauge] the gauge ends at y=' + fits.bottom + ' in a ' + GAUGE_VH
        + 'px measuring viewport, so it can only be reached by scrolling -- and every reading '
        + 'below would be taken at an unpinned sub-pixel phase. Raise GAUGE_VH.');
    }
    await B.settle(page);

    const geo = await page.evaluate(() => {
      const panel = document.querySelector('.hm-alt');
      const track = document.querySelector('.hm-alt .hm-gr-t');
      const o = panel.getBoundingClientRect();
      /* VIEWPORT coordinates, because the shot is the whole viewport at scrollY 0 */
      const rel = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const keelH = parseFloat(getComputedStyle(document.querySelector('.hm-alt .hm-seg')).getPropertyValue('--keel-h')) || 2;
      const segs = [...document.querySelectorAll('.hm-alt .hm-seg')].map((s) => ({
        ...rel(s),
        keel: s.classList.contains('keel'),
        missed: s.classList.contains('keel-m'),
        open: s.classList.contains('open'),
        lv: parseFloat(getComputedStyle(s).getPropertyValue('--lv')) || 0,
      }));
      return { keelH, track: rel(track), segs, panel: rel(panel) };
    });
    const S = (n) => n * GAUGE_DSF;
    const boxes = [];
    const tag = [];
    /* THE TROUGH, SAMPLED WIDE AND WELL INSIDE ITS OWN BORDER (see readMarks). The track is
       `border:1px` + `padding:3px`, so the trough band above the capsules runs from +1 to +4; a
       1px column sampled at +1.2 straddled the BORDER on fractional x, and since --bd is much
       lighter than --side in dark it lifted the reference and quietly deflated every ratio in the
       table by ~10%. A 50px-wide strip at +2 cannot straddle anything. */
    /* SAMPLING IS INSET AWAY FROM EVERY EDGE THE RASTERISER SOFTENS, and the first version of this
       arm is why the note exists: sampling the capsule's LEFT rule as a one-device-px column read
       the trough on most capsules (46 marks at fractional x across an 880px track), and sampling
       the keel band to its very last row pulled in the rounded bottom corners. Both produced
       numbers that were about antialiasing rather than about the mark. The rule is read off the
       TOP edge -- one CSS px tall, full width less the corner radius, and every capsule in a rail
       shares that y -- and the keel band drops its outermost row. */
    /* THE BOXES ARE THE WHOLE CAPSULE, generously grown by a pixel. They do not have to find the
       mark -- the removal diff does that. All a box has to do is CONTAIN it, which is why the
       phase cannot hurt this any more. */
    for (const s of geo.segs) {
      const box = { x: S(s.x - 1), y: S(s.y - 1), w: S(s.w + 2), h: S(s.h + 2) };
      if (s.keel) { boxes.push(box); tag.push({ kind: s.missed ? 'missed' : 'shaky', lv: s.lv }); }
      else if (!s.open) { boxes.push(box); tag.push({ kind: 'rule' }); }
    }
    const style = (id, css) => page.evaluate(({ i, c }) => {
      const old = document.getElementById(i); if (old) old.remove();
      if (!c) return;
      const s = document.createElement('style'); s.id = i; s.textContent = c;
      document.head.appendChild(s);
    }, { i: id, c: css });
    /* the whole viewport, every time, at scrollY 0 -- so A and B are pixel-aligned by construction
       and the diff is the mark rather than a translation */
    const shoot = async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await B.settle(page);
      return (await page.screenshot()).toString('base64');
    };

    /* one reading of the whole panel: the page, then the page with each mark's own declaration
       suppressed, then the diffs */
    const readMarks = async (extraCss) => {
      await style('_gmut', extraCss || '');
      const shotA = await shoot();
      await style('_grm', '.hm-seg.keel::before{display:none!important}');
      const shotKeel = await shoot();
      await style('_grm', '.hm-seg{box-shadow:none!important}');
      const shotRule = await shoot();
      await style('_grm', '');
      const troughBox = [{ x: S(geo.track.x + 60), y: S(geo.track.y + 2), w: S(50), h: S(1) }];
      /* the trough is read from A against A: no pixel differs, so MARK_Y would return null --
         it is measured with the plain reader instead */
      const [tb] = await scratch.evaluate(BOX_Y, { shot: shotA, boxes: troughBox });
      const t = tb.mean;
      const keelBoxes = [], keelTags = [], ruleBoxes = [];
      for (let i = 0; i < boxes.length; i++) {
        if (tag[i].kind === 'rule') ruleBoxes.push(boxes[i]);
        else { keelBoxes.push(boxes[i]); keelTags.push(tag[i]); }
      }
      const kY = keelBoxes.length ? await scratch.evaluate(MARK_Y, { shotA, shotB: shotKeel, boxes: keelBoxes }) : [];
      const rY = ruleBoxes.length ? await scratch.evaluate(MARK_Y, { shotA, shotB: shotRule, boxes: ruleBoxes }) : [];
      const o = { missed: [], shaky: [], rule: [], dead: 0 };
      kY.forEach((m, i) => {
        if (!m) { o.dead++; return; }
        o[keelTags[i].kind].push({ cr: CR(FAR(m, t), t), lv: keelTags[i].lv, px: m.n });
      });
      rY.forEach((m) => {
        if (!m) { o.dead++; return; }
        o.rule.push({ cr: CR(FAR(m, t), t), px: m.n });
      });
      await style('_gmut', '');
      return o;
    };
    const by = await readMarks(null);

    /* DEPTH: the panel surface against the home's own ground, both read off pixels */
    const dshot = await shoot();
    /* BOTH POINTS SIT ON THE SAME VERTICAL LINE, one inside the first panel and one in the gap
       below it, so the pair is a real figure/ground reading of the same column of pixels. The
       first version sampled #home's LEFT padding gutter and read 1.443:1 in light against a token
       pair that computes to 1.329 -- it was catching the rail's edge six pixels away. A gutter
       between two panels has nothing beside it to catch. */
    const dgeo = await page.evaluate(() => {
      const p = document.querySelector('#home .hm-panel');
      /* the next PAINTED sibling: .hm-practicem is display:none above 920px and its zero rect
         sits at the origin, which read as a -279px gap */
      let next = p.nextElementSibling;
      while (next && !next.getClientRects().length) next = next.nextElementSibling;
      const pr = p.getBoundingClientRect();
      const nr = next ? next.getBoundingClientRect() : null;
      return { x: pr.x + pr.width / 2, inside: pr.y + Math.min(40, pr.height / 2),
        gap: nr ? (pr.bottom + nr.top) / 2 : null, gapPx: nr ? Math.round(nr.top - pr.bottom) : 0 };
    });
    if (!dgeo.gap || dgeo.gapPx < 10) {
      fails.push('[' + theme + '/gauge] the depth arm has no ground to sample: the gap under the '
        + 'first panel is ' + dgeo.gapPx + 'px, so the "ground" pixel would be a panel.');
    }
    const [surfB, groundB] = dgeo.gap ? await scratch.evaluate(BOX_Y, {
      shot: dshot,
      boxes: [
        { x: S(dgeo.x - 2), y: S(dgeo.inside - 2), w: S(4), h: S(4) },  /* inside the panel */
        { x: S(dgeo.x - 2), y: S(dgeo.gap - 2), w: S(4), h: S(4) },     /* the ground below it */
      ],
    }) : [null, null];
    /* both are large flat areas -- the mean is the honest reading and no extremum is wanted */
    const surfY = surfB ? surfB.mean : 0, groundY = groundB ? groundB.mean : 0;

    const stat = (a) => (a.length ? {
      n: a.length, min: Math.min(...a.map((o) => o.cr)), max: Math.max(...a.map((o) => o.cr)),
      lvs: [...new Set(a.map((o) => o.lv))].sort((x, y) => x - y),
    } : null);
    const M = stat(by.missed), K = stat(by.shaky), R = stat(by.rule);
    const depth = CR(surfY, groundY);
    gaugeRows.push({ theme, M, K, R, depth });

    const where = '[' + theme + '/gauge] ';
    if (!M || !K) {
      fails.push(where + 'the sweep painted ' + (M ? M.n : 0) + ' missed and ' + (K ? K.n : 0)
        + ' shaky keel marks -- an ordering cannot be asserted from one variant, and a green here '
        + 'would mean nothing. The seed must produce both.');
    } else {
      /* 1. ORDERING -- every worst mark at least as loud as every middle one */
      if (!(M.min >= K.max)) {
        fails.push(where + 'SEVERITY INVERTED: the quietest MISSED keel is ' + M.min.toFixed(2)
          + ':1 against the trough while the loudest SHAKY keel is ' + K.max.toFixed(2)
          + ':1 -- the worst grade is drawn quieter than the middle one, swept over --lv '
          + M.lvs.join('/'));
      }
      /* 2. FLOOR -- on the marks, not on the tokens */
      for (const [name, s] of [['MISSED', M], ['SHAKY', K]]) {
        if (!(s.min >= NONTEXT_FLOOR)) {
          fails.push(where + name + ' keel measures ' + s.min.toFixed(2) + ':1 at its quietest, '
            + 'under the ' + NONTEXT_FLOOR + ':1 non-text floor');
        }
      }
      /* the sweep really did cross the fill range -- one --lv step is not a sweep */
      if (M.lvs.length + K.lvs.length < 4) {
        fails.push(where + 'the keel sweep only reached --lv ' + M.lvs.concat(K.lvs).join('/')
          + ' -- the whole point is that the mark is measured across the FILL RANGE, because that '
          + 'is where the first fix was still inverted');
      }
    }
    /* 3. DENOMINATOR */
    if (!R) {
      fails.push(where + 'no untouched capsule was rendered, so the denominator arm measured nothing');
    } else if (!(R.min >= NONTEXT_FLOOR)) {
      fails.push(where + 'the untouched capsule rule measures ' + R.min.toFixed(2) + ':1 against '
        + 'its trough, under the ' + NONTEXT_FLOOR + ':1 floor -- the panel declares an honest '
        + 'denominator and the pixels do not carry one');
    }
    /* 4. DEPTH */
    if (!(depth >= DEPTH_FLOOR)) {
      fails.push(where + 'the home panel stands off its ground at only ' + depth.toFixed(3)
        + ':1 -- under ' + DEPTH_FLOOR + ':1 the panels are regions of one plane and the hairlines '
        + 'are doing all the work');
    }

    /* ---- TWO PLANTED MUTANTS, both of them THE SHIPPED WIRING put back ----------------------
       Neither is an invented failure: mutant A restores `--st-warn-edge` under the worst grade and
       `--st-warn` under the middle one, which is what the gauge shipped; mutant B restores `--bd`
       as the lattice rule, which is what drew the denominator at 1.09:1. If either goes
       undetected the section is decoration and the check says so instead of reporting a green. */
    const badA = await readMarks('.hm-seg.keel::before{background:var(--st-warn)}'
      + '.hm-seg.keel-m::before{background:var(--st-warn-edge)}');
    const mA = stat(badA.missed), kA = stat(badA.shaky);
    if (!mA || !kA) {
      fails.push(where + 'MUTANT A CANNOT LAND: the plant left one keel variant unpainted.');
    } else if (mA.min >= kA.max) {
      fails.push(where + 'MUTANT A UNDETECTED: the SHIPPED keel wiring -- the worst grade on '
        + '--st-warn-edge, the middle one on --st-warn -- measured MISSED ' + mA.min.toFixed(2)
        + ':1 against SHAKY ' + kA.max.toFixed(2) + ':1 and was accepted as correctly ordered. '
        + 'This section cannot see the defect it exists for.');
    }

    const badB = await readMarks('.hm-seg{box-shadow:inset 0 0 0 1px var(--bd)}');
    const rB = stat(badB.rule);
    if (!rB) {
      fails.push(where + 'MUTANT B CANNOT LAND: no untouched capsule under the plant.');
    } else if (rB.min >= NONTEXT_FLOOR) {
      fails.push(where + 'MUTANT B UNDETECTED: the lattice rule restored to --bd -- the wiring that '
        + 'drew the denominator at 1.09:1 light / 1.46:1 dark -- measured ' + rB.min.toFixed(2)
        + ':1 and cleared the floor. The denominator arm is not reading the rule.');
    }
    gaugeRows[gaugeRows.length - 1].mut = { A: mA && kA ? mA.min.toFixed(2) + ' vs ' + kA.max.toFixed(2) : 'n/a',
      B: rB ? rB.min.toFixed(2) : 'n/a' };

    await ctx.close();
  }

  await browser.close();

  console.log('=== SCOREBOARD SALIENCE -- painted ink per tile (mean |Y - Y(--card)|, hue-blind) ===');
  console.log(L('theme', 6) + L('room', 27) + L('state', 13) + R('SOLID', 9) + R('revisit', 9) + R('left', 9) + R('S:R', 9));
  for (const r of rows) {
    console.log(L(r.theme, 6) + L(r.group, 27) + L(r.state, 13) + R(r.g, 9, 4) + R(r.s, 9, 4) + R(r.left, 9, 4)
      + R(r.ratio, 8, 1) + 'x' + (r.gz ? '   <- Solid EMPTY: outlined, not filled' : ''));
  }

  console.log('\n=== THE ALTITUDE GAUGE -- keel severity, denominator and depth, off the panel\'s pixels ===');
  console.log(L('theme', 6) + L('mark', 12) + R('n', 5) + R('min CR', 9) + R('max CR', 9) + '   --lv swept');
  for (const g of gaugeRows) {
    for (const [name, s] of [['MISSED', g.M], ['SHAKY', g.K], ['untouched', g.R]]) {
      if (!s) { console.log(L(g.theme, 6) + L(name, 12) + R(0, 5) + '   (not painted)'); continue; }
      console.log(L(g.theme, 6) + L(name, 12) + R(s.n, 5) + R(s.min, 9, 2) + R(s.max, 9, 2)
        + '   ' + (s.lvs.filter((v) => v !== undefined).join(', ') || '-'));
    }
    console.log(L(g.theme, 6) + L('panel/ground', 12) + R('', 5) + R(g.depth, 9, 3) + '  (depth)');
    if (g.mut) {
      console.log(L(g.theme, 6) + L('  mutants', 12) + '  shipped keel wiring -> missed ' + g.mut.A
        + ' (INVERTED, caught) | rule back to --bd -> ' + g.mut.B + ':1 (under floor, caught)');
    }
  }

  if (fails.length) {
    console.log('\nSCOREBOARD SALIENCE: FAIL ' + fails.length);
    fails.forEach((f) => console.log('  - ' + f));
    return B.finish(1, 'SCOREBOARD SALIENCE: FAIL');
  }
  console.log('\nSCOREBOARD SALIENCE: PASS  (' + rows.length + ' room x theme x score;'
    + ' Solid is the loudest tile whenever it is non-empty, in every room, both themes, and never fills at zero'
    + ' -- plus the altitude gauge in both schemes: the worst grade is never drawn quieter than the'
    + ' middle one across the whole fill range, both keel marks and the untouched capsule\'s rule'
    + ' clear the 3:1 non-text floor on the pixels, and the panels stand off their ground)');
  return B.finish(0);
})();
