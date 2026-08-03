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
 * IT IS READ OFF PIXELS, SWEPT ACROSS THE FILL RANGE, AND READ AGAINST TWO GROUNDS. A keel is
 * never drawn on the trough -- a flagged topic has been graded, so its capsule is filled -- and
 * the two keel values STRADDLE the fill range, so their loudness order FLIPS with the ground. The
 * first fix (swap the tokens) was correct against the trough and STILL INVERTED against the
 * capsule.
 *
 * THE SECOND GROUND EXISTS BECAUSE THIS FILE ONCE CLAIMED A GUARD IT DID NOT CARRY. It said the
 * sweep "would go red if that waterline were removed"; reverting both declarations that reserve
 * the waterline left every number identical and the exit code 0, because an opaque mark's own
 * pixels do not change when the thing behind it does, and the trough is the same colour under
 * every capsule. So each keel is also read against the band immediately above it inside its own
 * rail. On the build that carried that sentence, the second ground measured MISSED 2.75..6.70 vs
 * SHAKY 2.88..5.39 in light and 1.94..6.50 vs 3.11..6.59 in dark -- inverted in both schemes,
 * three of four minima under the floor. The capsule now reserves --keel-h + --keel-gap and the
 * mark occupies only --keel-h, so the band above the mark is the trough on every capsule at every
 * fill level, and the neighbour reading COLLAPSES ONTO the trough reading. That collapse is the
 * evidence the ground is constant, and MUTANT C is the control: revert the two declarations and
 * the neighbour arm must go red.
 *
 * SEVEN CLAIMS, all on the panel's own screenshot, AT TWO WIDTHS:
 *   1. ORDERING   every MISSED mark is at least as loud as every SHAKY mark, against the trough
 *   1b. ...AND AGAINST THE BAND IT ABUTS, which is the reading the eye takes
 *   2. FLOOR      every keel mark clears 3:1 against the trough it is drawn on
 *   2b. ...AND against that same neighbour band
 *   3. DENOMINATOR the untouched capsule's rule clears 3:1 -- at 1.09:1 light / 1.46:1 dark the
 *                  46-unit lattice dissolved into a beige trough and the mark read as a progress
 *                  bar, which is the generic form it was invented to escape
 *   4. DEPTH      the panel surface stands off the home ground -- 1.05:1 light / 1.14:1 dark made
 *                 five panels regions of one plane with a hairline between them
 *   5. GRADE      adjacent fill steps are tellable apart FROM THE FILL STRIP ALONE, monotone in
 *                 --lv. This is the claim the waterline has to earn: the channel takes 4px of the
 *                 capsule at EVERY width, which is 4 of 24 at 1280 and 4 of EIGHT at 390 (the
 *                 compact block halves the track below 920). styles.css asserted that this "costs
 *                 it nothing, because the grade is in lightness and never in size" -- a sentence
 *                 written from the desktop, licensing any strip down to 1px. Measured: the
 *                 tightest adjacent pair is 1.261/1.266 at 1280 and 1.276/1.272 at 390, floor
 *                 1.15, so the phone's ramp is the desktop's ramp on a smaller area rather than a
 *                 compressed one -- which is what "the grade is in the OPACITY" actually predicts.
 *
 * AND WHY TWO WIDTHS AT ALL. Everything above ran at 1280 only, while two of the eighteen VR
 * baselines are m-home. The neighbour arm's minimum-width guard was written in CSS px against a
 * 1280 capsule (`s.w < 4`, capsule ~7.8) and the 390 capsule is 3.95 -- so had the section simply
 * been pointed at the phone it would have skipped every neighbour box and reported zero samples.
 * The guard is in DEVICE columns now, which is the only unit in which "can this be read off a
 * bitmap" is a real question.
 */
const NONTEXT_FLOOR = 3.0;
const DEPTH_FLOOR = 1.25;
/* the height, in CSS px, of the band sampled immediately ABOVE each keel -- the ground the mark
   actually abuts. Equal to --keel-h, so the reading is symmetric with the mark it is compared to. */
const NB_CSS = 2;
/* the gauge's marks are 1-2 CSS px thick. At the board's DSF of 2 they have no interior pixel
   that a sub-pixel phase shift cannot reach; at 4 they do. See BOX_Y. */
const GAUGE_DSF = 2;
/* ---- THE GAUGE IS MEASURED AT TWO WIDTHS, AND UNTIL CYCLE 3 IT WAS MEASURED AT ONE ---------
   The whole section ran at 1280 only. At 390 -- where two of the eighteen VR baselines live, and
   where `.hm-gr-t{height:16px}` (styles.css, the compact block) makes the capsule EIGHT CSS px
   tall instead of twenty-four -- nothing had ever been sampled. Two things follow, and both were
   real:
     THE NEIGHBOUR ARM WOULD HAVE MEASURED NOTHING. Its guard is a MINIMUM WIDTH, and it was
     written as `s.w < 4` in CSS px against a 1280 capsule of ~7.8. At 390 the capsule is 3.95, so
     every neighbour box would have been skipped and the arm would have reported zero samples --
     it fails safe (zero samples is an explicit FAIL) rather than silently, but the surface the
     eye actually meets on a phone was unmeasured. The guard is a DEVICE-pixel minimum now,
     because "can this box be read off a bitmap" is a question about device columns and never
     about CSS ones: at DSF 3 a 3.95px capsule inset one CSS px a side leaves 5.85 device columns.
     THE CHANNEL COSTS FOUR OF EIGHT, NOT FOUR OF TWENTY-FOUR. --keel-h + --keel-gap is 4px at
     both widths, so the phone spends HALF the capsule on the waterline and leaves a 4px fill
     strip. Whether the grade is still readable off that strip is a MEASUREMENT, and it is the one
     R6 exists to take -- see the GRADE-ORDER arm.
   DSF 3 AT 390, not 2: the marks are half the size, and at 2 the neighbour band would be 4 device
   rows less 2 inset = 2, which is thinner than the phase noise this section already learned to
   fear. At 3 the band is 4 rows and the fill strip is 12. */
const GAUGE_WIDTHS = [
  { w: 1280, dsf: 2, vh: 2400 },
  { w: 390, dsf: 3, vh: 2400 },
];
/* the neighbour box's minimum, IN DEVICE COLUMNS. See the note above: expressed in CSS px it was
   a 1280-only constant that silently emptied the arm at every phone width. */
const NB_MIN_DEV = 3;
/* R6: adjacent grade steps must be tellable apart from the FILL STRIP ALONE. Measured on the
   shipped build at 390, over 93 open capsules per scheme, the ramp's tightest adjacent pair is
   1.272:1 (dark, --lv .78 -> 1.00) and 1.276:1 (light, .55 -> .78); a flattened pair measures
   ~1.00:1.
   EXACT VALUES COMPARED, ROUNDED VALUES DISPLAYED, and cycle 5 had to correct this file to its
   own rule: the light figure was printed here and twice below as 1.277, which is what you get by
   recomputing the ratio from the DISPLAYED row (0.0772 / 0.0496). The arm divides the full
   precision it holds (0.07715 / 0.04963) and prints 1.276, in every run and in the cycle-4 press
   receipts. The number quoted in a comment is now the number the instrument prints.

   THE HEADROOM SENTENCE THAT USED TO SIT HERE WAS RETRACTED IN CYCLE 4 AND IS RE-EARNED BELOW.
   It read "the floor leaves 10.6% of headroom on the worst of them", and the number was true of
   a reading the arm could not reproduce: six back-to-back runs of the committed tree returned the
   figures above five times and, once, a whole ramp lifted toward the light ground with a tightest
   pair of 1.179:1 -- 80% of that headroom gone, on a build nobody had touched. A margin quoted
   from the runs that agreed is not a margin.
   THE CONTRIBUTOR WAS FOUND AND IT IS A VEIL, not a design property: `body{animation:bodyIn}`
   was still running when the shot was taken in FOUR of eight COLD profiles, and holding it at a
   known alpha reproduces the symptom by construction (0.1765/0.1136/0.0772/0.0496/0.0275 becomes
   0.2168/0.1504/0.1104/0.0770/0.0502, tightest pair 1.276 -> 1.249, both as the arm prints them).
   So the honest statement is
   CONDITIONAL and the condition is now enforced three ways -- the entrance fade must be idle
   before any shot, the trough must equal its own declared colour in the SAME shot, and the cold
   first reading must reproduce a warm one taken later in the same run. GIVEN THOSE, the worst
   adjacent pair is 1.272:1 and the floor leaves 10.6% of headroom on it; WITHOUT them, the arm
   has no business quoting a margin at all, and now says so instead of reporting one. */
const GRADE_STEP_MIN = 1.15;
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
  /* THE FILL STEP AND THE KEEL VARIANT ARE DRIVEN BY INDEPENDENT COUNTERS, and that is a coverage
     fix rather than a style choice. Both used to be functions of the SAME index -- share was
     `(k % 6) / 5` and the variant was `k % 2`, and `k % 2` is determined by `k % 6` -- so the
     variant was welded to the share: SHAKY only ever landed on the even steps and MISSED only on
     the odd ones. The file's own table said so and nobody read it: MISSED swept --lv
     0/0.3/0.55/0.78 while SHAKY reached 0 and 0.55, two of four, under a docstring claiming the
     sweep "drives all four". `j` counts the GRADED topics, so the share cycles every 4 and the
     variant flips every 4 blocks of that cycle -- each variant is drawn at every step.
     AND NO STEP IS share=1: a topic with every card solid has no flagged probes, so it paints no
     keel at all, and a "step" that cannot carry the mark is not coverage. */
  let j = -1;
  TopicRegistry.ids().forEach((id, k) => {
    /* EVERY THIRD TOPIC IS LEFT UNGRADED ON PURPOSE. The denominator arm measures the UNTOUCHED
       capsule's rule, and a seed that grades all 46 topics paints none -- which is how a check
       reports a clean zero without having looked at anything. This one refuses instead. */
    if (k % 3 === 2) return;
    j++;
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    const share = (j % 4) / 4;                       /* 0, .25, .5, .75 -- all keel-bearing */
    const bad = (Math.floor(j / 4) % 2) ? 1 : 2;     /* MISSED and SHAKY, four topics at a time */
    cards.forEach((c, i) => { map[keys[i]] = (i / cards.length < share) ? 3 : bad; });
    const solid = Object.keys(map).filter((x) => map[x] >= 3).length;
    /* THE TIMESTAMP IS PUSHED THREE HOURS BACK. With `ts: Date.now()` the home's chip ages render
       "just now" and can TICK OVER during a run -- and at 390 every panel is stacked, so one age
       string growing a character rewraps the chip list and moves the gauge. Measured across
       loads, the track's y was 1159.188 on five and 1162.797 on one. Geometry is read ONCE and
       three screenshots are taken against it, so a panel that moves between them would make the
       removal diff a comparison of misaligned images.
       HONESTLY: this was written as the diagnosis of the 390 flake and the measurement then
       REFUTED it -- the drift guard in shoot() below never fired, and the real cause was the boot
       splash (see the wait above). It is kept because the hazard is real, it is silent, and a
       backdated record costs nothing; it is not kept as the explanation of anything. Three hours
       renders a stable string for the whole run and stays inside the current week, so
       weeklyGoal is unchanged. */
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: solid, shk: cards.length - solid, done: cards.length, tot: cards.length,
      revisit: ['idempotency'], cards: map, cv: 1, ts: Date.now() - 3 * 3600 * 1000 }));
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
/* the relative luminance of a CSS colour string, in NODE -- so a measured pixel can be compared
   against the value the STYLESHEET says that pixel should be. Same transfer function as BOX_Y. */
const Y_OF_CSS = (s) => {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(s || '');
  if (!m) return null;
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]);
};
/* THE GROUND INVARIANT'S EPSILON (R12). The trough band is a large flat area of one declared
   colour, so the honest expectation is not "close" but EQUAL: measured on the committed build at
   390/light the band returns 0.84871 over 4,740 device pixels with min == max EXACTLY, against a
   computed `rgb(241,237,228)` whose luminance is 0.84877 -- they agree to 6e-5, which is this
   arithmetic's own rounding. The smallest veil ever caught here moved it 0.0081 (body at opacity
   0.9117), so 0.002 sits 30x above the agreement and 4x below the smallest defect. */
const GROUND_EPS = 0.002;
/* ---- THE GROUND INVARIANT KNOWS WHAT IT CANNOT SEE (cycle 5, judge item 1) -----------------
   R12 closed the veil class IN LIGHT ONLY, and the freeze said "in both schemes". The judges
   proved otherwise on the clean tree: three consecutive runs, and run 3's 390/dark fill strip
   came back 0.1759/0.2964/0.4202/0.5688/0.7360 against runs 1-2's 0.1941/0.3270/0.4633/0.6260/
   0.8097 -- a least-squares fit of b = 0.9101*a with max residual 0.0004, which is a pure
   compositing veil at alpha ~0.91 over a near-black ground. Exit 0. Every removal-diff reading in
   the same cell was byte-identical, and condition 3 printed "cold vs warm re-read: identical"
   because the veil sat across BOTH reads. The one ABSOLUTE reading moved and nothing caught it.

   THE MECHANISM IS ARITHMETIC AND IT IS THE INVARIANT'S OWN. A veil at alpha composites the
   trough over whatever is behind the faded subtree, so it moves the trough by
       (1 - alpha) * |Y(compositing ground) - Y(trough)|
   In LIGHT the trough is rgb(241,237,228) (Y 0.8487) over a canvas at Y ~0.75: a gap of ~0.098,
   so a 9% veil moves it 0.0081 -- four times the epsilon, caught (press P3). In DARK the trough
   is rgb(23,22,29) (Y 0.00845) and the canvas is rgb(15,14,19) (Y 0.00463): a gap of 0.0038, so
   the same veil moves it 0.00034 and NO alpha above 0.474 can ever reach the epsilon. The
   invariant was not lenient in dark; it was INERT, and inert reads exactly like clean.

   SO TWO THINGS CHANGED AND ONLY ONE OF THEM IS THIS CONSTANT.
     THE VEIL IS MEASURED AT THE SHOT (see shoot()), which is scheme-independent, has no epsilon
     and no arithmetic: the opacity of every element from .hm-alt to the root, read in the same
     evaluate that takes the shot. That is what carries the class now.
     THE GROUND INVARIANT STAYS as the same-shot backstop for compositing that is NOT an ancestor
     opacity -- an overlay, a filter, a box that slipped -- AND IT DECLARES ITS OWN SENSITIVITY.
     Each cell computes the gap above and the strongest veil it could still catch; if no alpha
     could move the trough past GROUND_EPS the cell FAILS saying so, rather than passing while
     asserting nothing. A guard that cannot fail must say that out loud. */
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

  /* ---------------- THE ALTITUDE GAUGE, AT BOTH WIDTHS ---------------- */
  for (const G of GAUGE_WIDTHS) for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ deviceScaleFactor: G.dsf, viewport: { width: G.w, height: G.vh } });
    const page = await ctx.newPage();
    await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
    await B.gotoApp(page, HTML, { hash: '#home' });
    await page.evaluate(GAUGE_SEED);
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.until(page, () => !!document.querySelector('#home .hm-alt .hm-seg.keel'), null, B.ACT_MS,
      'a gauge with keel marks on it');
    /* ---- THE BOOT SPLASH MUST BE GONE, NOT MERELY FADING -------------------------------------
       #_bootsplash is `position:fixed; inset:0; z-index:9999` filled with var(--bg), and
       `_bs-done` starts a 400ms opacity fade before app.js removes it. Every reading in this
       section is a screenshot of the whole viewport, so while that overlay is anywhere between
       1 and 0 it composites --bg over EVERY pixel sampled, at an alpha nobody controls.
       MEASURED at the exact moment this section used to start measuring, five loads at 390:
       opacity 1.000, 0.294, 0.075, 0.355, 0.198 -- present every time, and a different veil each
       time. That is why the trough (the denominator of every ratio here) read 4.10 / 3.98 / 3.93
       / 4.13 for the untouched rule across runs, and why FAR() -- which picks the pixel FURTHEST
       from that trough -- then chose the wrong side of the mark on some capsules and not others,
       producing MISSED 7.24..10.28 where every stable cell reports min == max exactly.
       THIS IS A PRE-EXISTING HAZARD IN THIS CHECK, not a 390 one: the same race exists at 1280
       and simply resolved in time there, so the arm has been reading through a veil whenever the
       machine was slow enough. Waiting on the ELEMENT rather than on a duration is the fix this
       file's own doctrine already prescribes -- and the splash cannot come back once removed, so
       one wait covers all three shots of every readMarks() call. */
    await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS,
      'the boot splash to be REMOVED (not merely fading: it veils every pixel until it is gone)');
    /* ---- ...AND THE ENTRANCE FADE MUST BE OVER TOO (R12) -------------------------------------
       THE SPLASH WAS NOT THE ONLY VEIL, and cycle 3's fix hid the second one by making it rarer.
       `body{animation:bodyIn ...}` (styles.css) ramps opacity 0 -> 1 AFTER the splash is gone, and
       an element with opacity < 1 composites its whole subtree over the CANVAS -- which is the
       body's own --bg, propagated, and therefore NOT itself faded. Every pixel this section
       samples is inside that subtree.
       MEASURED, on eight COLD profiles (a fresh chromium.launch() each time, which is a fresh
       user-data-dir): `bodyIn` was still `running` when the shot was taken in FOUR of the eight,
       with the body reading opacity 0.9117 / 0.9851 / 0.9851 / 0.9851. It usually loses the race
       to the screenshot, which is exactly why this survived a cycle: a veil that is normally over
       by the time the bitmap lands is a check that is normally right.
       AND WHAT IT COSTS WHEN IT LANDS, constructed at a known alpha rather than inferred --
       `body{animation:none;opacity:.9117}`, 390/light, every other condition identical:
         --lv      0        0.3      0.55     0.78     1        tightest adjacent
         unveiled  0.1765   0.1136   0.0772   0.0496   0.0275   1.276:1
         veiled    0.2168   0.1504   0.1104   0.0770   0.0502   1.249:1
       (both ratios as the ARM prints them, from full precision. Recomputing the top row from the
       four displayed decimals gives 1.277, which is where that figure came from.)
       Every fill step lifted toward the light ground and the ramp's own margin fell, on a build
       nobody had touched. The condition is the ANIMATION BEING IDLE and the chain being opaque --
       not a duration, and not "the splash is gone".
       SCOPED TO THE GAUGE'S OWN ANCESTOR CHAIN on purpose: "no animation anywhere is running" is
       a promise this app does not make (a looping ornament elsewhere would hang the wait), while
       "nothing between the gauge and the document root is still fading" is exactly the property
       a pixel read off this panel depends on. */
    await B.until(page, () => {
      const el = document.querySelector('.hm-alt');
      if (!el) return false;
      const chain = [];
      for (let n = el; n; n = n.parentElement) chain.push(n);
      if (chain.some((n) => getComputedStyle(n).opacity !== '1')) return false;
      const running = (document.getAnimations ? document.getAnimations() : []).filter(
        (a) => a.playState === 'running' && a.effect && a.effect.target
          && chain.indexOf(a.effect.target) >= 0);
      return running.length === 0;
    }, null, B.ACT_MS,
    'the ENTRANCE FADE to be over: every element from the gauge to the document root at opacity '
    + '1 with no animation still running on it (bodyIn was measured live at shot time in 4 of 8 '
    + 'cold profiles, veiling every fill reading)');
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
      fails.push('[' + theme + '/gauge@' + G.w + '] the gauge ends at y=' + fits.bottom + ' in a '
        + G.vh + 'px measuring viewport, so it can only be reached by scrolling -- and every '
        + 'reading below would be taken at an unpinned sub-pixel phase. Raise this width s vh.');
    }
    await B.settle(page);

    const geo = await page.evaluate(() => {
      const panel = document.querySelector('.hm-alt');
      const track = document.querySelector('.hm-alt .hm-gr-t');
      const o = panel.getBoundingClientRect();
      /* VIEWPORT coordinates, because the shot is the whole viewport at scrollY 0 */
      const rel = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const tcs = getComputedStyle(track);
      const pxOf = (v) => parseFloat(v) || 0;
      const segCs = getComputedStyle(document.querySelector('.hm-alt .hm-seg'));
      const keelH = parseFloat(segCs.getPropertyValue('--keel-h')) || 2;
      const keelGap = parseFloat(segCs.getPropertyValue('--keel-gap')) || 0;
      const rad = parseFloat(segCs.borderTopLeftRadius) || 0;
      const segs = [...document.querySelectorAll('.hm-alt .hm-seg')].map((s) => ({
        ...rel(s),
        keel: s.classList.contains('keel'),
        missed: s.classList.contains('keel-m'),
        open: s.classList.contains('open'),
        lv: parseFloat(getComputedStyle(s).getPropertyValue('--lv')) || 0,
      }));
      /* THE COMPOSITING GROUND: what a faded subtree is composited OVER. The canvas takes html's
         background if it declares one and body's propagated otherwise, and it is NOT itself
         faded by an ancestor opacity -- which is why a veil moves the trough toward it. Read so
         the ground invariant can price its own sensitivity in this cell (see GROUND_EPS). */
      const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const opaque = (c) => c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c);
      /* THE LEGEND'S FOUR SWATCHES (cycle 5, judge item 8). styles.css solves --gauge-rule
         against TWO grounds and calls dark-on-panel (3.49:1, 16% clear of the floor) the BINDING
         cell -- and attributed the rasterised assertion to this file, which contained no `.hm-k`
         selector at all. These are the boxes that make that attribution true. */
      const keys = [...document.querySelectorAll('.hm-alt .hm-key .hm-k')].map((k) => {
        const i = k.querySelector('i');
        return i ? { cls: (k.className || '').replace(/\s+/g, '.'), ...rel(i) } : null;
      }).filter(Boolean);
      return { keelH, keelGap, rad, track: rel(track), segs, panel: rel(panel), keys,
        canvasBg: opaque(htmlBg) ? htmlBg : bodyBg,
        panelBg: getComputedStyle(panel).backgroundColor,
        trackH: segCs.height, trackBg: tcs.backgroundColor,
        bdT: pxOf(tcs.borderTopWidth), bdL: pxOf(tcs.borderLeftWidth),
        bdR: pxOf(tcs.borderRightWidth), padT: pxOf(tcs.paddingTop),
        padL: pxOf(tcs.paddingLeft), padR: pxOf(tcs.paddingRight),
        radL: pxOf(tcs.borderTopLeftRadius), radR: pxOf(tcs.borderTopRightRadius) };
    });
    const S = (n) => n * G.dsf;
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
    /* EVERY SHOT RE-READS THE TRACK'S y AND THE SECTION FAILS IF IT MOVED. Geometry is measured
       ONCE and three screenshots are taken against it, so a panel that shifts between them makes
       the removal diff a comparison of misaligned images -- and the failure is SILENT and looks
       like a design defect: min stops equalling max, and the SHAKY keel starts reporting the
       untouched rule's own number. The stacked 390 layout really does move -- 1159.188 on five
       loads and 1162.797 on one -- so the hazard is not hypothetical, even though it turned out
       NOT to be the cause of the flake this was written to chase (that was the boot splash; this
       guard never fired). It stays because a silent misalignment is the worst thing that can
       happen to a removal diff, and because a guard that has never fired is exactly the kind
       this file exists to add BEFORE it is needed. */
    /* TWO DEFECTS IN THAT GUARD, BOTH FOUND BY R12 AND BOTH IN ONE LINE. It compared y ONLY, and
       it anchored on the FIRST SHOT rather than on the geometry read -- so `shotY` was seeded by
       shoot() itself and a move between `geo` and shot A, the one window in which every box below
       is computed against a layout that no longer exists, was invisible by construction. That is
       why "the guard never fired" is not evidence that nothing moved. It is anchored at the
       GEOMETRY now, and it compares x as well: a horizontal slip of one device column moves the
       fill box onto the capsule's antialiased side, which is the other candidate mechanism for
       the 390/light flake and the one this arm could not have told apart from a grade. */
    /* ---- IS THIS SHOT VEILED? ASKED OF THE PAGE, AT THE SHOT (cycle 5, judge item 1) ---------
       R12's fade condition is a `B.until` before the cell begins, and a wait proves a state
       BEFORE the shot, which is a different claim from the state AT it. The judges' run 3 walked
       through it: a veil at alpha 0.9101 sitting across a whole 390/dark cell, exit 0, because
       the only thing looking for a veil afterwards was the ground invariant and in dark the
       ground invariant cannot see one at any alpha (see GROUND_EPS).
       THIS IS THE DIRECT QUESTION AND IT HAS NO EPSILON: every element from .hm-alt to the
       document root must compute opacity exactly '1', and no animation may be `running` on that
       chain. It is read in the SAME evaluate that reads the track's box immediately before
       page.screenshot(), and again immediately after -- because the rasteriser is not atomic and
       "opaque before" and "opaque after" are two claims, not one.
       IT IS ALSO SCHEME-INDEPENDENT, which is the whole point: an opacity is a number the page
       reports, not a difference between two luminances that a near-black ground can swallow. */
    const SHOT_STATE = () => {
      const t = document.querySelector('.hm-alt .hm-gr-t');
      const el = document.querySelector('.hm-alt');
      const b = t ? t.getBoundingClientRect() : { x: 0, y: 0 };
      const chain = [];
      for (let n = el; n; n = n.parentElement) chain.push(n);
      const name = (n) => {
        if (!n || !n.tagName) return '?';
        const cls = (typeof n.className === 'string' && n.className.trim())
          ? '.' + n.className.trim().split(/\s+/)[0] : '';
        return n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + cls;
      };
      const opa = chain.map((n) => ({ el: name(n), o: getComputedStyle(n).opacity }))
        .filter((r) => r.o !== '1');
      const anim = (document.getAnimations ? document.getAnimations() : [])
        .filter((a) => a.playState === 'running' && a.effect && a.effect.target
          && chain.indexOf(a.effect.target) >= 0)
        .map((a) => (a.animationName || a.transitionProperty || 'animation')
          + ' on ' + name(a.effect.target));
      return { x: b.x, y: b.y, found: !!t && !!el, opa, anim };
    };
    let shotAt = { x: geo.track.x, y: geo.track.y };
    let veiled = 0;
    const veilCheck = (s, when) => {
      if (!s.found) {
        fails.push('[' + theme + '/gauge@' + G.w + '] the gauge was not in the document ' + when
          + ' the shot, so nothing this cell reports is a reading of it.');
        return;
      }
      if (!s.opa.length && !s.anim.length) return;
      veiled++;
      if (veiled > 1) return;   /* one report per cell: the same veil would name itself 80 times */
      fails.push('[' + theme + '/gauge@' + G.w + '] THE SHOT WAS TAKEN THROUGH A VEIL, measured '
        + when + ' the bitmap: '
        + (s.opa.length ? s.opa.map((r) => r.el + ' at opacity ' + r.o).join(', ') : 'nothing')
        + (s.anim.length ? '; still running: ' + s.anim.join(', ') : '')
        + '. An element at opacity < 1 composites its whole subtree over the canvas and every '
        + 'pixel this cell samples is inside that subtree, so every number below is a reading '
        + 'through something. The pre-cell wait proves the fade was over BEFORE the cell; this '
        + 'is the state AT the shot, and it is the claim that was missing.');
    };
    const shoot = async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await B.settle(page);
      const r = await page.evaluate(SHOT_STATE);
      veilCheck(r, 'before');
      if (Math.abs(r.y - shotAt.y) > 0.01 || Math.abs(r.x - shotAt.x) > 0.01) {
        fails.push('[' + theme + '/gauge@' + G.w + '] THE PANEL MOVED: the track was at ('
          + shotAt.x.toFixed(3) + ', ' + shotAt.y.toFixed(3) + ') when the geometry was measured '
          + 'and is at (' + r.x.toFixed(3) + ', ' + r.y.toFixed(3) + ') now. Every box below was '
          + 'computed against the first, so the removal diff is comparing misaligned images and '
          + 'nothing it reports is a measurement -- and a one-column slip in x puts the fill box '
          + 'on the capsule\'s antialiased edge, which reads as a grade.');
        shotAt = r;
      }
      const png = (await page.screenshot()).toString('base64');
      veilCheck(await page.evaluate(SHOT_STATE), 'after');
      return png;
    };

    /* one reading of the whole panel: the page, then the page with each mark's own declaration
       suppressed, then the diffs.

       TWO GROUNDS, AND THE SECOND ONE IS THE ONE THE EYE USES. The trough is a STABLE reference
       and that is exactly its weakness: it is the same colour under every capsule, so a keel
       measured against it reports the mark's own value and nothing about where the mark sits. A
       cycle-2 press proved the cost -- reverting BOTH declarations that reserve the waterline
       (`.hm-seg::after{inset:0 0 var(--keel-h)}` back to `inset:0`, and `.hm-seg.open`'s hard-stop
       gradient back to a flat fill) left this section reporting the identical numbers and exiting
       0, because an opaque keel's own pixels do not change when the thing BEHIND it does. The
       waterline claim in the comment above was therefore a guard claim this check did not carry.
       So each keel is now ALSO read against the band immediately above it inside its own rail --
       the pixels it actually abuts -- and the ordering and the floor are asserted on both. */
    const readMarks = async (extraCss) => {
      await style('_gmut', extraCss || '');
      const shotA = await shoot();
      await style('_grm', '.hm-seg.keel::before{display:none!important}');
      const shotKeel = await shoot();
      await style('_grm', '.hm-seg{box-shadow:none!important}');
      const shotRule = await shoot();
      await style('_grm', '');
      /* ---- THE TROUGH, DERIVED FROM THE TRACK'S OWN BOX INSTEAD OF FROM CONSTANTS ---------
         This was `x: track.x + 60, w: 50, y: track.y + 2, h: 1` -- four numbers picked at 1280,
         and every one of them broke when the section was pointed at 390. The x range RAN OFF
         THE TRACK's right edge (the phone track is ~280 CSS px wide with a label column beside
         it, not ~880), so the strip averaged --side with the white panel behind it and reported
         the trough at Y 0.8568 where the track computes rgb(241,237,228) = 0.8487 at BOTH
         widths -- verified by reading the computed background, so it was the sampler and not the
         app. And the 1-CSS-px strip at +2 sat close enough to the 1px border that the phone
         panel's fractional y -- which MOVES between runs, because everything above it stacks --
         could slide it onto --bd. `t` is the denominator of every ratio in this section, so a
         contaminated trough does not just shift the numbers: FAR() picks the extremum FURTHEST
         FROM t, so a wrong t makes it pick the wrong side of the mark on SOME capsules and not
         others. That is the tell, and it is what the failing run showed -- the untouched rule
         read 3.68/3.73/3.81/4.10 across four runs where every other cell reports min == max
         exactly, and MISSED spread 4.20..8.49 inside one run.
         The box is now the track's PADDING BAND: vertically from inside the top border to the
         top of the capsules, horizontally its content box INSET BY THE CORNER RADIUS, and one
         device row/column off every edge with ceil/floor -- so it is strictly interior at any
         sub-pixel phase, at any width, and it needs no constant that a second viewport can
         falsify.
         THE RADIUS IS NOT TIDINESS. `.hm-gr-t` has `border-radius:8px` on a 16px-tall track, so
         inside the top 8 rows the leftmost and rightmost 8 columns of the CONTENT box are
         outside the rounded rect and show the PANEL, not the track. At 1280 that is ~16 of ~870
         columns and the mean absorbs it invisibly; at 390 the content box is ~272 wide, so it is
         6% -- and in DARK the denominator (t + 0.05) is dominated by the constant, which makes
         every ratio hypersensitive to it. Measured over six loads with the radius NOT insetted:
         the band's min was a clean 0.00463 but its max reached 0.0354, and the untouched rule
         read 4.23 / 4.21 / 4.13 where it should be one number. With the radius insetted the band
         is uniform. (Recorded because it is not obvious: the panel's y at 390 is not even stable
         between loads -- 1159.188 on five and 1162.797 on one -- so a box derived from geometry
         is the only kind that can be correct twice.) */
      const trX0 = Math.ceil((geo.track.x + Math.max(geo.bdL + geo.padL, geo.radL)) * G.dsf) + 1;
      const trX1 = Math.floor((geo.track.x + geo.track.w
        - Math.max(geo.bdR + geo.padR, geo.radR)) * G.dsf) - 1;
      const trY0 = Math.ceil((geo.track.y + geo.bdT) * G.dsf) + 1;
      const trY1 = Math.floor((geo.track.y + geo.bdT + geo.padT) * G.dsf) - 1;
      if (trX1 - trX0 < 2 || trY1 - trY0 < 1) {
        fails.push('[' + theme + '/gauge@' + G.w + '] the trough band is ' + (trX1 - trX0) + 'x'
          + (trY1 - trY0) + ' device px after insetting one row a side -- there is no strictly '
          + 'interior sample, so the reference every ratio below divides by cannot be trusted.');
      }
      const troughBox = [{ x: trX0, y: trY0, w: Math.max(1, trX1 - trX0), h: Math.max(1, trY1 - trY0) }];
      /* the trough is read from A against A: no pixel differs, so MARK_Y would return null --
         it is measured with the plain reader instead */
      const [tb] = await scratch.evaluate(BOX_Y, { shot: shotA, boxes: troughBox });
      const t = tb.mean;
      /* ---- THE SAME-SHOT GROUND INVARIANT: IS THIS SHOT VEILED? (R12) ----------------------
         This is the guard the track-y one should have been, and unlike that one it FIRES. The
         track's own `background-color` is a declared constant read off the page in this same
         run, and the trough band is a large flat area of exactly that colour -- so if the
         measured band is not that number, the bitmap is not showing what the stylesheet says,
         and every ratio below is a reading through something. Two claims, both same-shot:
           UNIFORM   the band is one colour, so min must equal max. A local contamination -- an
                     edge, a corner radius, a box that slipped -- breaks this before it breaks
                     the mean, and the mean is what would otherwise be quietly reported.
           TRUE      the band equals its own declared colour. A GLOBAL veil (the boot splash,
                     the entrance fade, anything with an alpha) moves every pixel including this
                     one, so it cannot hide inside a ratio.
         MEASURED: unveiled it is exact (0.84871 measured / 0.84877 computed, min == max over
         4,740 px); with `body{opacity:.9117}` -- the state four of eight cold profiles were
         caught in -- it reads 0.85683, four times the epsilon. The arm now FAILS NAMING THE
         VEIL rather than reporting a grade taken through it. */
      /* ---- ...AND WHETHER IT COULD SEE ONE AT ALL, IN THIS CELL (cycle 5, judge item 1) -----
         The invariant's whole sensitivity to a veil is (1 - alpha) * |Y(canvas) - Y(trough)|, so
         a cell whose trough and canvas are near-neighbours cannot be moved past the epsilon by
         ANY alpha, and its green says nothing. Measured on this tree: light gap 0.098 (the
         strongest catchable veil is alpha 0.980), dark gap 0.0038 (alpha 0.474). The dark cell
         therefore carries a live guard with a real bound rather than a promise -- and the bound
         is PRINTED, per cell, in the table below, because a guard's reach is part of its result.
         If the gap ever falls to the epsilon the arm FAILS: at that point it is decoration, and
         judge item 1 is the receipt for what decoration costs. */
      const cDecl = Y_OF_CSS(geo.canvasBg);
      const tD0 = Y_OF_CSS(geo.trackBg);
      const gap = (cDecl === null || tD0 === null) ? null : Math.abs(cDecl - tD0);
      const alphaMin = (gap === null || gap <= 0) ? null : 1 - GROUND_EPS / gap;
      if (gap === null) {
        fails.push('[' + theme + '/gauge@' + G.w + '] the compositing ground could not be read ('
          + geo.canvasBg + ' / ' + geo.trackBg + '), so the ground invariant cannot say whether '
          + 'it is able to see a veil in this cell, and an unpriced guard is an unpressed one.');
      } else if (alphaMin === null || alphaMin <= 0) {
        fails.push('[' + theme + '/gauge@' + G.w + '] THE GROUND INVARIANT IS INERT HERE: the '
          + 'trough (Y ' + tD0.toFixed(5) + ') and the canvas it would be composited over (Y '
          + cDecl.toFixed(5) + ') differ by ' + gap.toFixed(5) + ', so NO alpha can move the '
          + 'trough past the ' + GROUND_EPS + ' epsilon and this guard cannot fail. It is not '
          + 'reporting a clean shot, it is reporting nothing -- which is exactly how a veil at '
          + 'alpha 0.91 crossed a whole dark cell at exit 0.');
      }
      const tDecl = Y_OF_CSS(geo.trackBg);
      if (tDecl === null) {
        fails.push('[' + theme + '/gauge@' + G.w + '] the track declares no readable background '
          + '(' + geo.trackBg + '), so the ground invariant below has no reference and every '
          + 'ratio in this cell would be unguarded.');
      } else if (Math.abs(t - tDecl) > GROUND_EPS || (tb.max - tb.min) > GROUND_EPS) {
        fails.push('[' + theme + '/gauge@' + G.w + '] THE SHOT IS VEILED, so nothing below is a '
          + 'measurement of this design: the trough band reads Y ' + t.toFixed(5) + ' (min '
          + tb.min.toFixed(5) + ', max ' + tb.max.toFixed(5) + ') where the track itself declares '
          + geo.trackBg + ' = Y ' + tDecl.toFixed(5) + ', a gap of '
          + Math.abs(t - tDecl).toFixed(5) + ' against an epsilon of ' + GROUND_EPS + '. The band '
          + 'is one flat declared colour, so this is not tolerance, it is a compositing layer '
          + 'between the panel and the bitmap -- the boot splash, the entrance fade, or a box '
          + 'that slipped off its own subject.');
      }
      const keelBoxes = [], keelTags = [], ruleBoxes = [];
      for (let i = 0; i < boxes.length; i++) {
        if (tag[i].kind === 'rule') ruleBoxes.push(boxes[i]);
        else { keelBoxes.push(boxes[i]); keelTags.push(tag[i]); }
      }
      const kY = keelBoxes.length ? await scratch.evaluate(MARK_Y, { shotA, shotB: shotKeel, boxes: keelBoxes }) : [];
      const rY = ruleBoxes.length ? await scratch.evaluate(MARK_Y, { shotA, shotB: shotRule, boxes: ruleBoxes }) : [];
      /* THE NEIGHBOUR BAND: NB_CSS px immediately above the keel, inside the capsule, inset one
         device row at top and bottom and clear of the corner radius on both sides -- so it can
         neither straddle the mark below it nor pick up the rounded ends. It is read off shot A
         with the plain reader: unlike the mark, it does not differ between A and B, so the
         removal diff would return null for it. */
      const nbrBoxes = [], nbrIdx = [];
      let narrow = 0;
      let ki = -1;
      for (const s of geo.segs) {
        if (!s.keel) continue;
        ki++;
        /* the capsules are ~7.8 CSS px wide (46 of them in a 458px track), so the x inset is one
           CSS px a side -- enough to clear the 2px corner radius, which has finished curving well
           below this band anyway, and the 2px flex gap keeps the next capsule out of reach. */
        /* THE GUARD IS IN DEVICE COLUMNS. `s.w < 4` was a CSS-px test tuned to a 1280 capsule
           of ~7.8px; at 390 the capsule is 3.95 and it skipped EVERY box, which would have left
           the phone s neighbour ground unsampled behind a zero-sample FAIL. What a bitmap can
           be read off is device columns: 3.95 CSS px inset one CSS px a side is 5.85 of them at
           DSF 3, and 3.9 at DSF 2. */
        if ((s.w - 2) * G.dsf < NB_MIN_DEV) { narrow++; continue; }
        const yTop = (s.y + s.h - geo.keelH - NB_CSS) * G.dsf + 1;
        const hDev = NB_CSS * G.dsf - 2;
        if (hDev < 1) { narrow++; continue; }
        nbrBoxes.push({ x: S(s.x + 1), y: yTop, w: S(s.w - 2), h: hDev });
        nbrIdx.push(ki);
      }
      const nY = nbrBoxes.length ? await scratch.evaluate(BOX_Y, { shot: shotA, boxes: nbrBoxes }) : [];
      const nbrFor = {};
      nY.forEach((b, i) => { if (b) nbrFor[nbrIdx[i]] = b.mean; });

      /* ---- THE FILL STRIP ITSELF (R6): what is LEFT of the capsule once the channel is taken --
         The channel costs --keel-h + --keel-gap at EVERY width, so a 24px capsule keeps 20 and an
         8px one keeps 4. Whether the grade survives that is a question about the strip ALONE, so
         the box is the strip alone, read off shot A with the plain reader and as a MEAN: it is a
         large flat area and there is no mark to isolate.

         THE INSETS ARE ONE DEVICE ROW, NOT THE CORNER RADIUS, and the first draft got that wrong
         in a way worth keeping. Insetting the top by border-radius is the obvious way to keep
         rounded pixels out -- and at 1280 it is harmless, but at 390 the radius is 2px of an 8px
         capsule, so a radius-inset box IS THE STRIP'S BOTTOM HALF, sitting directly on the fill's
         own antialiased bottom edge where the transparent channel blends through at full width.
         Measured that way the light ramp read 0.2825 at --lv 0 where --gauge-rule's own luminance
         is 0.176, and its top pair compressed to 1.074:1 -- a reading about an EDGE, reported as
         a reading about a grade, and it would have condemned a design that is fine. (The radius
         cannot be insetted away at this width in any case: 2 x radius is 4px and the capsule is
         3.95px wide, so there is no corner-free column at the top.) One device row at top and
         bottom drops both boundary blends; the rounded corners that remain are a handful of
         pixels of a constant trough, identical under every capsule, so they cannot manufacture or
         hide an ORDER. */
      const fillBoxes = [], fillLv = [];
      for (const s of geo.segs) {
        if (!s.open) continue;
        const hDevF = (s.h - geo.keelH - geo.keelGap) * G.dsf - 2;
        if (hDevF < 2 || S(s.w) - 2 < NB_MIN_DEV) continue;
        fillBoxes.push({ x: S(s.x) + 1, y: S(s.y) + 1, w: S(s.w) - 2, h: hDevF });
        fillLv.push(s.lv);
      }
      const fY = fillBoxes.length ? await scratch.evaluate(BOX_Y, { shot: shotA, boxes: fillBoxes }) : [];
      const fill = [];
      fY.forEach((b, i) => { if (b) fill.push({ lv: fillLv[i], y: b.mean }); });

      const o = { missed: [], shaky: [], rule: [], dead: 0, narrow, fill,
        groundGap: gap, veilAlpha: alphaMin,
        nbrN: Object.keys(nbrFor).length };
      kY.forEach((m, i) => {
        if (!m) { o.dead++; return; }
        const n = nbrFor[i];
        o[keelTags[i].kind].push({
          cr: CR(FAR(m, t), t),
          crN: (n === undefined) ? null : CR(FAR(m, n), n),
          lv: keelTags[i].lv, px: m.n,
        });
      });
      rY.forEach((m) => {
        if (!m) { o.dead++; return; }
        o.rule.push({ cr: CR(FAR(m, t), t), px: m.n });
      });
      await style('_gmut', '');
      return o;
    };
    const by = await readMarks(null);

    /* ---- THE LEGEND'S FOUR SWATCHES, AGAINST THE PANEL THEY ACTUALLY SIT ON ------------------
       (cycle 5, judge item 8.) styles.css's --gauge-rule block solves the token against TWO
       grounds and names the KEY's dark cell -- 3.49:1, 16% clear of the 3:1 floor -- as THE
       BINDING ONE, then wrote that "the rasterised minimum, which is what
       test/scoreboard_salience.cjs actually asserts, is read off the pixels". This file contained
       zero occurrences of `.hm-k`. Its denominator arm reads .hm-seg's inset rule against --side,
       which is the 4.10 / 4.23 pair -- the LOOSER one. The tightest cell in the block had 16% of
       headroom and no instrument, in a file whose own scar note records a pair solved to
       3.41/3.40 nominal that RASTERISED at 3.16/3.28.
       SAME METHOD AS EVERY OTHER MARK HERE: removal diff for the mark, extremum for its colour.
       Shot A is the legend; shot B is the legend with every swatch's own paint suppressed, so the
       differing pixels ARE the swatch and the box only has to contain it. The GROUND is then read
       off shot B AT THE SAME BOX -- the pixels the mark was covering, measured rather than named
       -- and cross-checked against .hm-panel's own computed background, which is the control that
       would have caught the block calling that ground --card when it is --home-surface. */
    const KEY_OFF = '.hm-alt .hm-k i{background:none!important;box-shadow:none!important}'
      + '.hm-alt .hm-k i::after{background:none!important}';
    const readKeys = async (plantCss) => {
      if (!geo.keys.length) return null;
      await style('_gmut', plantCss || '');
      const shotA = await shoot();
      await style('_grm', KEY_OFF);
      const shotB = await shoot();
      await style('_grm', '');
      const boxes = geo.keys.map((k) => ({ x: S(k.x - 1), y: S(k.y - 1), w: S(k.w + 2), h: S(k.h + 2) }));
      const marks = await scratch.evaluate(MARK_Y, { shotA, shotB, boxes });
      const grounds = await scratch.evaluate(BOX_Y, { shot: shotB, boxes });
      const out = [];
      for (let i = 0; i < geo.keys.length; i++) {
        const m = marks[i], g = grounds[i];
        out.push({
          cls: geo.keys[i].cls,
          cr: (m && g) ? CR(FAR(m, g.mean), g.mean) : null,
          px: m ? m.n : 0,
          groundY: g ? g.mean : null,
          groundSpread: g ? g.max - g.min : null,
        });
      }
      await style('_gmut', '');
      return out;
    };
    const keys0 = await readKeys(null);

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
      const x = pr.x + pr.width / 2;
      const gap = nr ? (pr.bottom + nr.top) / 2 : null;
      /* THE GROUND'S OWN COLOUR, READ FROM THE PAGE RATHER THAN NAMED (MUTANT E's plant).
         `--bg` is the obvious guess and it is WRONG here: measured in light, the pixel under the
         gap is rgb(228,223,212) while --bg is rgb(250,249,245), because the element at that point
         is transparent and the paint comes from an ancestor further up. A mutant that plants a
         TOKEN therefore plants the wrong colour and lands in dark (where they coincide) and not
         in light -- which is what the first draft of MUTANT E did, and it reported the depth arm
         as unpressed when it was the PLANT that was wrong. Walk to the first painted ancestor
         and use what is actually there. */
      let groundBg = null;
      if (gap !== null) {
        for (let n = document.elementFromPoint(x, gap); n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor;
          if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { groundBg = c; break; }
        }
      }
      return { x, inside: pr.y + Math.min(40, pr.height / 2),
        gap, gapPx: nr ? Math.round(nr.top - pr.bottom) : 0, groundBg };
    });
    if (!dgeo.gap || dgeo.gapPx < 10) {
      fails.push('[' + theme + '/gauge] the depth arm has no ground to sample: the gap under the '
        + 'first panel is ' + dgeo.gapPx + 'px, so the "ground" pixel would be a panel.');
    }
    /* extracted so MUTANT E can re-take the SAME pair under a plant: an arm with no negative
       control is an unpressed claim, and this one was the last in the section without one. */
    const readDepth = async (shot) => {
      if (!dgeo.gap) return { surfY: 0, groundY: 0, depth: 0 };
      const [sB, gB] = await scratch.evaluate(BOX_Y, {
        shot,
        boxes: [
          { x: S(dgeo.x - 2), y: S(dgeo.inside - 2), w: S(4), h: S(4) },  /* inside the panel */
          { x: S(dgeo.x - 2), y: S(dgeo.gap - 2), w: S(4), h: S(4) },     /* the ground below it */
        ],
      });
      /* both are large flat areas -- the mean is the honest reading and no extremum is wanted */
      const sy = sB ? sB.mean : 0, gy = gB ? gB.mean : 0;
      return { surfY: sy, groundY: gy, depth: CR(sy, gy) };
    };
    const d0 = await readDepth(dshot);
    const surfY = d0.surfY, groundY = d0.groundY;

    const stat = (a) => {
      if (!a.length) return null;
      const nb = a.map((o) => o.crN).filter((v) => typeof v === 'number');
      return {
        n: a.length, min: Math.min(...a.map((o) => o.cr)), max: Math.max(...a.map((o) => o.cr)),
        nbN: nb.length,
        nbMin: nb.length ? Math.min(...nb) : null,
        nbMax: nb.length ? Math.max(...nb) : null,
        lvs: [...new Set(a.map((o) => o.lv))].sort((x, y) => x - y),
      };
    };
    /* the fill strip's own luminance per --lv step, and the contrast between ADJACENT steps.
       MONOTONE means the ramp still reads as a ramp; the STEP is whether two neighbours can be
       told apart. Direction is read off the data rather than assumed, because it INVERTS with the
       scheme: more ink is darker in light and lighter in dark, and hard-coding either one would
       make this arm a scheme detector. */
    const grade = (rows) => {
      const byLv = new Map();
      for (const f of rows) {
        if (!byLv.has(f.lv)) byLv.set(f.lv, []);
        byLv.get(f.lv).push(f.y);
      }
      const steps = [...byLv.entries()]
        .map(([lv, ys]) => ({ lv, n: ys.length, y: ys.reduce((a, b) => a + b, 0) / ys.length,
          spread: Math.max(...ys) - Math.min(...ys) }))
        .sort((a, b) => a.lv - b.lv);
      if (steps.length < 2) return { steps, ok: false, worst: null, dir: 0, mono: false };
      const dir = Math.sign(steps[steps.length - 1].y - steps[0].y);
      let mono = true, worst = null;
      for (let i = 1; i < steps.length; i++) {
        const d = Math.sign(steps[i].y - steps[i - 1].y);
        if (d !== dir) mono = false;
        const cr = CR(steps[i].y, steps[i - 1].y);
        if (worst === null || cr < worst.cr) worst = { cr, a: steps[i - 1].lv, b: steps[i].lv };
      }
      return { steps, dir, mono, worst, ok: mono && worst && worst.cr >= GRADE_STEP_MIN };
    };
    const gr = grade(by.fill);
    const M = stat(by.missed), K = stat(by.shaky), R = stat(by.rule);
    const depth = d0.depth;
    gaugeRows.push({ theme, w: G.w, M, K, R, depth, gr,
      groundGap: by.groundGap, veilAlpha: by.veilAlpha });

    const where = '[' + theme + '/gauge@' + G.w + '] ';
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
      /* 1b + 2b. THE SAME TWO CLAIMS AGAINST THE GROUND THE MARK ABUTS.
         This is the arm the waterline exists to satisfy, and until cycle 2 nothing measured it:
         against the trough the two keel values order correctly at any fill level, because the
         trough never moves -- but the mark is not drawn on the trough, it is drawn at the bottom
         of a capsule whose fill sweeps Y 0.85 to 0.02. If the fill runs all the way down to the
         mark, the two values STRADDLE its range and their order flips with the grade. */
      if (!M.nbN || !K.nbN) {
        fails.push(where + 'the neighbour ground was sampled on ' + M.nbN + ' missed and ' + K.nbN
          + ' shaky marks -- with no second ground there is nothing asserting that the mark can '
          + 'be told from what it sits against, which is the whole reason the waterline exists');
      } else {
        if (!(M.nbMin >= K.nbMax)) {
          fails.push(where + 'SEVERITY INVERTED AGAINST THE GROUND THE MARK ABUTS: the quietest '
            + 'MISSED keel is ' + M.nbMin.toFixed(2) + ':1 against the band immediately above it '
            + 'while the loudest SHAKY keel is ' + K.nbMax.toFixed(2) + ':1. The trough reading is '
            + 'not wrong, it is just not what anyone looks at: a keel abuts its own capsule.');
        }
        for (const [name, s] of [['MISSED', M], ['SHAKY', K]]) {
          if (!(s.nbMin >= NONTEXT_FLOOR)) {
            fails.push(where + name + ' keel measures ' + s.nbMin.toFixed(2) + ':1 against the band '
              + 'immediately above it at its quietest, under the ' + NONTEXT_FLOOR + ':1 non-text '
              + 'floor -- the mark clears the floor against the trough and disappears into the '
              + 'fill it is actually drawn beside');
          }
        }
      }
      /* THE SWEEP IS ASSERTED PER VARIANT, NOT POOLED. `M.lvs.length + K.lvs.length >= 4` was
         satisfied by MISSED reaching four steps and SHAKY reaching two, which is exactly the
         state that shipped while the docstring claimed the sweep drove all four. A pooled count
         cannot tell "both marks measured everywhere" from "one mark measured twice as often". */
      for (const [name, s] of [['MISSED', M], ['SHAKY', K]]) {
        if (s.lvs.length < 4) {
          fails.push(where + 'the ' + name + ' keel was only drawn at --lv ' + s.lvs.join('/')
            + ' -- fewer than four fill steps. The whole point is that the mark is measured across '
            + 'the FILL RANGE, because that is where the first fix was still inverted; extend '
            + 'GAUGE_SEED rather than lowering this.');
        }
      }
    }
    /* 5. THE GRADE IS STILL DERIVABLE FROM THE FILL STRIP ALONE (R6) ------------------------
       The waterline reserves --keel-h + --keel-gap = 4px at EVERY width, and the compact block
       takes the track from 32px to 16px below 920 -- so the channel costs 4 of 24 on the desktop
       and 4 of 8 on the phone. The claim that used to sit in styles.css was that this "costs it
       nothing, because the SIGNAL RULE puts the grade in lightness and never in size", and that
       sentence was UNCONDITIONAL and UNDERIVABLE: it was written from the desktop, where the
       strip keeps 83% of the capsule, and nothing had ever looked at the phone, where it keeps
       50%. Lightness is indeed the channel -- but a lightness difference has to be READ off an
       area, and halving the area is not free by inspection. So it is measured, at both widths and
       in both schemes: the strip's own luminance per fill step, monotone, with every ADJACENT
       pair clearing GRADE_STEP_MIN. Measured at 390 the tightest pair is 1.272:1. */
    if (!gr.steps.length) {
      fails.push(where + 'the fill strip was sampled on NO capsule -- with no reading there is '
        + 'nothing asserting that a grade survives the channel the waterline reserves, which at '
        + 'this width is ' + (geo.keelH + geo.keelGap) + ' of ' + (geo.segs[0] || {}).h + ' CSS px.');
    } else if (gr.steps.length < 3) {
      fails.push(where + 'the fill strip carried only ' + gr.steps.length + ' distinct --lv step(s) '
        + '(' + gr.steps.map((s) => s.lv).join('/') + ') -- ADJACENT-step discriminability cannot '
        + 'be asserted from fewer than three. Extend GAUGE_SEED rather than lowering this.');
    } else {
      if (!gr.mono) {
        fails.push(where + 'THE FILL RAMP IS NOT MONOTONE: the strip reads '
          + gr.steps.map((s) => s.lv + '->' + s.y.toFixed(4)).join(', ') + ' -- somewhere along '
          + 'the ramp more solid cards paint a QUIETER strip than fewer, so grade order is not '
          + 'derivable from the fill at all.');
      }
      if (gr.worst && gr.worst.cr < GRADE_STEP_MIN) {
        fails.push(where + 'ADJACENT GRADES ARE NOT DISCRIMINABLE FROM THE FILL STRIP: --lv '
          + gr.worst.a + ' and ' + gr.worst.b + ' differ by only ' + gr.worst.cr.toFixed(3)
          + ':1 on a strip ' + (geo.segs[0] ? (geo.segs[0].h - geo.keelH - geo.keelGap).toFixed(2) : '?')
          + ' CSS px tall (floor ' + GRADE_STEP_MIN + '). The channel reserves '
          + (geo.keelH + geo.keelGap) + 'px of a ' + (geo.segs[0] || {}).h + 'px capsule here, and '
          + 'the grade has nowhere else to live -- the SIGNAL RULE puts it in lightness and never '
          + 'in size or hue.');
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
    /* 3b. THE LEGEND'S SWATCHES, ON THEIR OWN GROUND -- the binding cell of the --gauge-rule
       solve, and until cycle 5 the one cell in that block with no instrument at all. */
    const BINDING_KEY = 'hm-k.none';
    /* the arm's verdict as ONE predicate, so MUTANT F presses the thing that actually gates the
       cell rather than a re-statement of it. A swatch with NO differing pixels is a failure here
       and not an abstention: a legend mark that is not on the screen is a key for something else. */
    const keyPasses = (list) => !!list && list.length > 0
      && list.every((k) => k.px > 0 && k.cr !== null && k.cr >= NONTEXT_FLOOR);
    if (!keys0 || !keys0.length) {
      fails.push(where + 'the legend was not rendered, so the four key swatches -- the BINDING '
        + 'cell of the --gauge-rule solve at 3.49:1 -- were measured on nothing.');
    } else {
      const panelDecl = Y_OF_CSS(geo.panelBg);
      for (const k of keys0) {
        if (k.cr === null || !k.px) {
          fails.push(where + 'the ' + k.cls + ' swatch changed ' + k.px + ' pixels when its own '
            + 'paint was suppressed -- a legend mark that is not on the screen is a key for '
            + 'something else, and the contrast beside it would be a reading of the panel.');
          continue;
        }
        if (k.groundSpread > GROUND_EPS) {
          fails.push(where + 'the ground under the ' + k.cls + ' swatch is not one flat colour '
            + '(spread ' + k.groundSpread.toFixed(5) + ' over the removal shot), so the '
            + 'denominator of its ratio is an average of two surfaces rather than the panel.');
        }
        if (panelDecl !== null && Math.abs(k.groundY - panelDecl) > GROUND_EPS) {
          fails.push(where + 'the ' + k.cls + ' swatch does not sit on the ground styles.css '
            + 'names: the pixels under it read Y ' + k.groundY.toFixed(5) + ' while .hm-panel '
            + 'declares ' + geo.panelBg + ' = Y ' + panelDecl.toFixed(5) + '. The --gauge-rule '
            + 'block solves this pair by arithmetic, and arithmetic against the wrong ground is '
            + 'the defect that block already carried once (it said --card; it is --home-surface).');
        }
        if (!(k.cr >= NONTEXT_FLOOR)) {
          fails.push(where + 'the legend swatch ' + k.cls + ' measures ' + k.cr.toFixed(3)
            + ':1 against the panel it sits on, under the ' + NONTEXT_FLOOR + ':1 non-text floor. '
            + 'styles.css solves --gauge-rule against this ground and calls the dark cell binding '
            + 'at 3.49:1 nominal -- and this file has a scar for exactly this gap: a pair solved '
            + 'to 3.41/3.40 by arithmetic rasterised at 3.16/3.28.');
        }
      }
      const bind = keys0.find((k) => k.cls.indexOf(BINDING_KEY) === 0);
      if (!bind) {
        fails.push(where + 'the ' + BINDING_KEY + ' swatch -- the BINDING cell of the '
          + '--gauge-rule solve -- was not among the ' + keys0.length + ' the legend rendered ('
          + keys0.map((k) => k.cls).join(', ') + '), so the tightest pair in that block is '
          + 'unmeasured and the looser one is standing in for it.');
      }
    }
    /* 4. DEPTH -- and it has a planted mutant now (MUTANT E, below): until cycle 4 this was the
       one gauge arm with nothing driving it, asserting "the panels stand off their ground" on a
       4x4 CSS-px pair with 6.3% (light) and 3.8% (dark) of headroom and no negative control. */
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
    /* ---- MUTANT C: THE WATERLINE REMOVED ---------------------------------------------------
       The two declarations that reserve the channel, reverted to what they were before it: the
       fill runs to the bottom of the capsule and `.open`'s hard-stop gradient becomes a flat
       fill. This is the plant that PASSED in cycle 1 -- the check measured only against the
       trough, and an opaque mark's own pixels do not change when the thing behind it does, so
       the same numbers came back and the file went on claiming it "would go red if that
       waterline were removed". The neighbour arm is what makes that sentence true, so this is
       its negative control and it must land on the NEIGHBOUR reading specifically. */
    const badC = await readMarks('.hm-seg::after{inset:0!important}'
      + '.hm-seg.open{background:var(--gauge-rule)!important}');
    const mC = stat(badC.missed), kC = stat(badC.shaky);
    if (!mC || !kC || !mC.nbN || !kC.nbN) {
      fails.push(where + 'MUTANT C CANNOT LAND: the waterline plant left a keel variant unpainted '
        + 'or unsampled (missed ' + (mC ? mC.n : 0) + '/' + (mC ? mC.nbN : 0) + ', shaky '
        + (kC ? kC.n : 0) + '/' + (kC ? kC.nbN : 0) + ').');
    } else if (mC.nbMin >= kC.nbMax && mC.nbMin >= NONTEXT_FLOOR && kC.nbMin >= NONTEXT_FLOOR) {
      fails.push(where + 'MUTANT C UNDETECTED: with the waterline removed -- the fill running to '
        + 'the bottom of the capsule, exactly as it did before this wave -- the keels still '
        + 'measured MISSED ' + mC.nbMin.toFixed(2) + ':1 and SHAKY ' + kC.nbMax.toFixed(2)
        + ':1 against their own neighbour and were accepted. The second ground is not reading '
        + 'the ground, and the waterline is still guarded by nothing.');
    }
    /* ---- MUTANT D: TWO ADJACENT GRADE LIGHTNESSES FLATTENED (R6's negative control) --------
       `opacity:min(var(--lv), .78)` paints the top two fill steps at the SAME lightness, which is
       exactly the failure the arm above exists to name: the ramp still runs, still looks like a
       ramp, and two of its rungs are the same rung. It is the cheapest way for this design to
       break, because the whole grade is carried by one number, and it is invisible to every other
       arm in this file -- the keels, the rule and the depth are all untouched by it. */
    const badD = await readMarks('.hm-seg::after{opacity:min(var(--lv),.78)!important}');
    const gD = grade(badD.fill);
    if (gD.steps.length < 3) {
      fails.push(where + 'MUTANT D CANNOT LAND: the flatten plant left only ' + gD.steps.length
        + ' fill step(s), so the arm has nothing to be wrong about.');
    } else if (gD.ok) {
      fails.push(where + 'MUTANT D UNDETECTED: with the top two fill steps painted at the SAME '
        + 'lightness the strip still read as an ordered ramp -- worst adjacent pair '
        + (gD.worst ? gD.worst.cr.toFixed(3) : '?') + ':1, floor ' + GRADE_STEP_MIN + '. The grade '
        + 'arm is not reading the grade.');
    }
    /* ---- MUTANT E: THE PANEL PAINTED AT ITS OWN GROUND (judge item 5) -----------------------
       The DEPTH arm was the one gauge arm with no plant, on a 4x4 CSS-px pair with 6.3% of
       headroom in light and 3.8% in dark -- the same order of margin as the fill strip whose
       reading turned out not to reproduce. "The panels stand off their ground" was therefore an
       unpressed claim sitting in the PASS line. This is the defect it exists to catch, stated in
       one declaration: the panel surface painted at --bg, which IS "the panels are regions of
       one plane". If depth still clears its floor under that, the arm is not reading depth. */
    await style('_gmut', dgeo.groundBg
      ? '#home .hm-panel{background:' + dgeo.groundBg + '!important;box-shadow:none!important}'
      : '');
    await B.settle(page);
    const dE = await readDepth(await shoot());
    await style('_gmut', '');
    await B.settle(page);
    if (!dgeo.groundBg) {
      fails.push(where + 'MUTANT E CANNOT LAND: no painted ancestor was found under the gap, so '
        + 'the plant has no ground colour to paint the panel at and the depth arm is unpressed.');
    } else if (Math.abs(dE.surfY - d0.surfY) < 1e-6) {
      fails.push(where + 'MUTANT E CANNOT LAND: painting #home .hm-panel at ' + dgeo.groundBg
        + ' did not change the surface pixel (' + d0.surfY.toFixed(5) + '), so the plant never '
        + 'reached the surface this arm samples and a red below would mean nothing.');
    } else if (!(dE.depth < DEPTH_FLOOR)) {
      fails.push(where + 'MUTANT E UNDETECTED: with #home .hm-panel painted at ' + dgeo.groundBg
        + ' -- the panel surface set to the value of the ground it sits on, which is exactly "the '
        + 'panels are regions of one plane" -- the pair still measured ' + dE.depth.toFixed(3)
        + ':1 against a floor of ' + DEPTH_FLOOR + '. The depth arm is not reading depth, and the '
        + 'PASS line\'s last clause is decoration.');
    }

    /* ---- MUTANT F: --gauge-rule LOWERED TO THE SWATCHES' OWN GROUND (judge item 8) ----------
       The plant is derived, not named: the token is repainted at the PANEL's own measured
       background, which is "the legend's marks are the panel" -- the same shape as MUTANT E and
       for the same reason (a token-valued plant lands in one scheme and not the other). It is
       scoped to `.hm-k i` so the capsule rule the denominator arm reads is untouched: this must
       press the KEY arm specifically, and a plant that reddens two arms proves neither. */
    let keyF = null;
    if (keys0 && keys0.length) {
      const PLANT_F = '.hm-alt .hm-k i{--gauge-rule:' + geo.panelBg + '!important}';
      /* THE PLANT'S LIVENESS IS READ OFF THE DOM, NOT INFERRED FROM THE PIXELS, and this arm is
         exactly why. A swatch painted at its own ground DIFFERS IN NO PIXEL from the removal
         shot, so "the mark vanished" and "the plant never landed" produce the identical zero and
         the first draft of this mutant read the first as the second. The computed box-shadow on
         the binding swatch settles it before any pixel is looked at. */
      await style('_gmut', PLANT_F);
      await B.settle(page);
      const planted = await page.evaluate(() => {
        const el = document.querySelector('.hm-alt .hm-k.none i');
        return el ? getComputedStyle(el).boxShadow : null;
      });
      await style('_gmut', '');
      await B.settle(page);
      const shipped = await page.evaluate(() => {
        const el = document.querySelector('.hm-alt .hm-k.none i');
        return el ? getComputedStyle(el).boxShadow : null;
      });
      keyF = await readKeys(PLANT_F);
      const bF = keyF && keyF.find((k) => k.cls.indexOf(BINDING_KEY) === 0);
      if (!planted || !shipped || planted === shipped) {
        fails.push(where + 'MUTANT F CANNOT LAND: repainting --gauge-rule at ' + geo.panelBg
          + ' left the binding swatch\'s computed box-shadow at ' + planted + ', unchanged from '
          + shipped + ' -- the plant never reached the element, so a red below would mean nothing.');
      } else if (!bF) {
        fails.push(where + 'MUTANT F CANNOT LAND: the ' + BINDING_KEY + ' swatch was not read '
          + 'under the plant, so the key arm is unpressed.');
      } else if (keyPasses(keyF)) {
        fails.push(where + 'MUTANT F UNDETECTED: with --gauge-rule painted at the panel\'s own '
          + 'colour (' + geo.panelBg + ') -- which IS "the legend\'s marks are the panel" -- every '
          + 'swatch still cleared the floor, the binding one at '
          + (bF.cr === null ? 'no reading' : bF.cr.toFixed(3)) + ':1. The key arm is not reading '
          + 'the key.');
      }
    }

    /* ---- THE COLD-RUN IDENTITY REQUIREMENT (R12) --------------------------------------------
       A CI RUNNER IS ALWAYS COLD, and an arm that is only true warm is not CI-honest. Every
       reading above was taken on the FIRST pass over a page that had just booted; five more
       readMarks() calls have run since, so the page is now as warm as it gets inside one run.
       The strip has not been touched by any of them. So take it again and demand the SAME
       NUMBERS -- the same property the two-width pass demanded across widths, now demanded
       across the cold/warm boundary inside one run, which is the only place a single process can
       observe it. This is the arm that fails when the first pass was read through something the
       later passes are not: the boot splash, the entrance fade, a font that had not landed.
       The epsilon is the GROUND epsilon, for the same reason it was chosen: these are means over
       large flat areas of declared colours and the honest expectation is equality. */
    const late = grade((await readMarks(null)).fill);
    const drift = [];
    for (const s of gr.steps) {
      const l = late.steps.find((x) => x.lv === s.lv);
      if (!l) { drift.push('--lv ' + s.lv + ' vanished'); continue; }
      if (l.n !== s.n) drift.push('--lv ' + s.lv + ' sampled n' + s.n + ' then n' + l.n);
      if (Math.abs(l.y - s.y) > GROUND_EPS) {
        drift.push('--lv ' + s.lv + ' read ' + s.y.toFixed(5) + ' cold and ' + l.y.toFixed(5)
          + ' warm (' + Math.abs(l.y - s.y).toFixed(5) + ')');
      }
    }
    if (drift.length) {
      fails.push(where + 'THE COLD READING DOES NOT REPRODUCE THE WARM ONE: ' + drift.join('; ')
        + '. The strip was not touched between the two, so the difference is in the INSTRUMENT '
        + 'and not in the design -- and a CI runner only ever takes the cold one. A grade '
        + 'reported from a reading that changes when the page warms up is not a measurement.');
    }
    const bindF = keyF && keyF.find((k) => k.cls.indexOf(BINDING_KEY) === 0);
    gaugeRows[gaugeRows.length - 1].keys = keys0;
    gaugeRows[gaugeRows.length - 1].mut = { A: mA && kA ? mA.min.toFixed(2) + ' vs ' + kA.max.toFixed(2) : 'n/a',
      B: rB ? rB.min.toFixed(2) : 'n/a',
      C: mC && kC && mC.nbN && kC.nbN ? mC.nbMin.toFixed(2) + ' vs ' + kC.nbMax.toFixed(2) : 'n/a',
      D: gD.worst ? gD.worst.cr.toFixed(3) : 'n/a',
      E: dE.depth.toFixed(3), Ebg: dgeo.groundBg || 'n/a',
      F: bindF ? (bindF.px ? bindF.cr.toFixed(3) + ':1' : 'VANISHED (0 px differ from its ground)')
        : 'n/a', Fbg: geo.panelBg,
      veiled: veiled,
      cold: drift.length ? 'DRIFTED' : 'identical' };

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
  console.log('    two grounds: TROUGH is the stable reference; NEIGHBOUR is the band immediately');
  console.log('    above each mark inside its own rail -- the pixels the eye compares it against.');
  console.log(L('width', 7) + L('theme', 6) + L('mark', 12) + R('n', 5) + R('trough', 9) + R('..max', 9)
    + R('nbr min', 9) + R('..max', 9) + '   --lv swept');
  for (const g of gaugeRows) {
    const W = L(g.w + 'px', 7);
    for (const [name, s] of [['MISSED', g.M], ['SHAKY', g.K], ['untouched', g.R]]) {
      if (!s) { console.log(W + L(g.theme, 6) + L(name, 12) + R(0, 5) + '   (not painted)'); continue; }
      console.log(W + L(g.theme, 6) + L(name, 12) + R(s.n, 5) + R(s.min, 9, 2) + R(s.max, 9, 2)
        + R(s.nbMin === null || s.nbMin === undefined ? '-' : s.nbMin, 9, 2)
        + R(s.nbMax === null || s.nbMax === undefined ? '-' : s.nbMax, 9, 2)
        + '   ' + (s.lvs.filter((v) => v !== undefined).join(', ') || '-'));
    }
    console.log(W + L(g.theme, 6) + L('panel/ground', 12) + R('', 5) + R(g.depth, 9, 3) + '  (depth)');
    if (g.keys && g.keys.length) {
      console.log(W + L(g.theme, 6) + L('key swatch', 12) + R(g.keys.length, 5) + '  '
        + g.keys.map((k) => k.cls.replace(/^hm-k\.?/, '') + ' ' + (k.cr === null ? '-' : k.cr.toFixed(2)))
          .join('  ') + '   vs the panel\'s own measured ground');
    }
    /* THE GUARD'S REACH, PRINTED. See GROUND_EPS: the ground invariant can only catch a veil that
       moves the trough past the epsilon, and its lever is the trough/canvas gap -- which is 26x
       smaller in dark than in light. A guard whose sensitivity is not reported is a guard whose
       green cannot be read. */
    if (g.groundGap !== null && g.groundGap !== undefined) {
      console.log(L('', 7) + L('', 6) + L('  ground', 12) + '  trough/canvas gap '
        + g.groundGap.toFixed(5) + ' -> the ground invariant alone catches a veil down to alpha '
        + (g.veilAlpha === null ? 'NONE' : g.veilAlpha.toFixed(3))
        + '; the shot-time opacity read catches every alpha, in both schemes');
    }
    if (g.gr && g.gr.steps.length) {
      console.log(W + L(g.theme, 6) + L('fill strip', 12) + R(g.gr.steps.length, 5)
        + '  --lv ' + g.gr.steps.map((s) => s.lv + ':' + s.y.toFixed(4) + ' (n' + s.n + ')').join('  ')
        + (g.gr.worst ? '\n' + L('', 7) + L('', 6) + L('', 12)
          + '  tightest adjacent pair ' + g.gr.worst.a + '/' + g.gr.worst.b + ' = '
          + g.gr.worst.cr.toFixed(3) + ':1, floor ' + GRADE_STEP_MIN
          + (g.gr.mono ? ', monotone' : ', NOT MONOTONE') : ''));
    }
    if (g.mut) {
      console.log(W + L(g.theme, 6) + L('  mutants', 12) + '  shipped keel wiring -> missed ' + g.mut.A
        + ' (INVERTED, caught) | rule back to --bd -> ' + g.mut.B + ':1 (under floor, caught)');
      console.log(L('', 7) + L('', 6) + L('', 12) + '  waterline removed -> missed ' + g.mut.C
        + ' on the NEIGHBOUR ground (caught) | top two fill steps flattened -> '
        + g.mut.D + ':1 adjacent (caught)');
      console.log(L('', 7) + L('', 6) + L('', 12) + '  panel painted at its ground\'s own colour ('
        + g.mut.Ebg + ') -> depth ' + g.mut.E + ':1 (under ' + DEPTH_FLOOR + ', caught)'
        + ' | cold vs warm re-read: ' + g.mut.cold);
      console.log(L('', 7) + L('', 6) + L('', 12) + '  --gauge-rule repainted at the panel ('
        + g.mut.Fbg + ') -> binding key swatch ' + g.mut.F + ' (caught)'
        + ' | shots taken through a veil: ' + g.mut.veiled);
    }
  }

  if (fails.length) {
    console.log('\nSCOREBOARD SALIENCE: FAIL ' + fails.length);
    fails.forEach((f) => console.log('  - ' + f));
    return B.finish(1, 'SCOREBOARD SALIENCE: FAIL');
  }
  console.log('\nSCOREBOARD SALIENCE: PASS  (' + rows.length + ' room x theme x score;'
    + ' Solid is the loudest tile whenever it is non-empty, in every room, both themes, and never fills at zero'
    + ' -- plus the altitude gauge at ' + GAUGE_WIDTHS.map((g) => g.w + 'px').join(' and ')
    + ' in both schemes: the worst grade is never drawn quieter than the'
    + ' middle one, and both keel marks clear the 3:1 non-text floor, against TWO grounds -- the'
    + ' stable trough AND the band each mark actually abuts -- with each variant swept over all'
    + ' four fill steps; adjacent grades stay discriminable from the FILL STRIP ALONE, which is'
    + ' the claim the 4px channel has to earn twice over on the phone, where it costs half the'
    + ' capsule; the untouched capsule\'s rule clears the same floor; the LEGEND\'S FOUR SWATCHES'
    + ' clear it too against the panel\'s own measured ground -- the binding cell of the'
    + ' --gauge-rule solve, pressed by repainting that token at the panel\'s own colour -- and the'
    + ' panels stand off their ground, pressed by painting the panel at that ground\'s own colour.'
    + ' EVERY GAUGE READING IS GATED ON THE SHOT BEING UNVEILED, and the load-bearing guard is'
    + ' MEASURED RATHER THAN INFERRED: every element from the gauge to the document root is read'
    + ' at computed opacity 1 with nothing animating on that chain, in the same evaluate as the'
    + ' shot and again after it, which needs no epsilon and works in both schemes. Beside it, as a'
    + ' backstop for compositing that is not an ancestor opacity, the trough must equal the colour'
    + ' the track itself declares within ' + GROUND_EPS + ' in the SAME shot -- and that arm now'
    + ' PRICES ITSELF per cell, failing where the trough/canvas gap is too small for any alpha to'
    + ' cross the epsilon, because in dark it was inert rather than lenient. And the COLD first'
    + ' reading -- the only one a CI runner ever takes -- must reproduce a warm re-read later in'
    + ' the same run)');
  return B.finish(0);
})();
