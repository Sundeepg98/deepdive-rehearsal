/* ============================ VISUAL REGRESSION -- ACTUAL PIXELS ============================
 *
 * WHAT THIS REPLACES, AND WHY
 * `test/visual_regression.py` was a REGEX OVER CSS/HTML SOURCE. It imported `re, sys, os` and
 * nothing else -- no playwright, no image decoder, no screenshot. It could assert that the string
 * `display:none` appeared near the string `.mock-ov`; it could not observe a single pixel. It was
 * proven inert this week: a DOM reorder that moves the pane switcher sails through it GREEN, and an
 * agent had to write a private pixel differ to prove paint-neutrality (0/284,160 px desktop,
 * 0/329,160 px mobile) because THE GATE COULD NOT. A "visual regression" check that cannot see a
 * pixel was the tenth check in this repo that cannot fail. That file is now `layout_static.py`,
 * which is what it always was; this is the check the name was promising.
 *
 * WHAT IT DOES
 * Renders the app in Chromium at a fixed viewport/DPR/theme, brings the screen to a PROVEN REST
 * STATE, screenshots it, and diffs the decoded pixels against a committed baseline PNG.
 *
 * ===== THE FOUR TRAPS, AND THE RUNTIME GUARD FOR EACH ======================================
 *
 * 1. THE SHADOW BOUNDARY -- and this one nearly ate the check itself.
 *    The obvious way to wait for stillness is `document.getAnimations()`. MEASURED, IN THIS APP:
 *    a known animation planted inside <deep-drill>'s shadow root is reported by
 *    shadowRoot.getAnimations() and is NOT reported by document.getAnimations(). It returns 0.
 *    Nine of the panes and eight of the overlays are shadow roots -- 17 of the 18 roots on the
 *    page -- and `pulse` (drill/logic.js:52) is an INFINITE animation living in one of them. So a
 *    stillness gate built on document.getAnimations() reports "0 animations, all still" while the
 *    screen is still moving: a no-op that LOOKS done, which is this codebase's defining bug.
 *    GUARD: settle() walks document + EVERY shadow root, recursively. And SELF-TEST 2 below plants
 *    an animation in a shadow root on every single run and ABORTS unless the walker sees it and
 *    document.getAnimations() does NOT -- so if anyone ever "simplifies" this back to the one-liner,
 *    the check dies loudly instead of going quietly green.
 *
 * 2. ANIMATIONS -- sampling mid-fade scores a transient blended frame.
 *    The app fades in <body> (`bodyIn`, 500ms + 150ms delay) and every pane (`panein`), and boots
 *    behind a splash whose spinner (`_bs-spin`) is INFINITE -- it freezes at a random angle, so a
 *    screenshot of it is a coin toss. An agent nearly filed 12 phantom "serious" contrast
 *    violations off frames like this; they do not exist at rest.
 *    GUARD: finite animations are FINISHED (jumped to their end state -- which, since none of the
 *    entry animations use fill:forwards, is exactly the at-rest style). Infinite ones cannot be
 *    finished (finish() throws on them) so they are PAUSED AT A FIXED PHASE (currentTime = 0).
 *    Then: two consecutive byte-identical frames, or we do not capture. That last gate is the
 *    ground truth -- it catches anything the Web Animations API does not model at all.
 *
 * 3. THE 220ms ZOMBIE OVERLAY.
 *    index-overlay.js:83 flips isOpen to false IMMEDIATELY but drops the `.open` class on a 220ms
 *    setTimeout, and `.ix-ov` paints a 45% scrim (`rgba(30,28,24,.45)`) + a 6px backdrop blur while
 *    `.open` is on. So for 220ms the app's own API says "closed" while the scrim is still PAINTED.
 *    Capture through it and you are measuring the scrim. (_boot.cjs's enterApp() waits on
 *    isOpen() -- the API -- so it can and does return inside that window.)
 *    GUARD: settle() waits on the CLASS, never the API: no `.ix-ov.open`, `.mock-ov.open` or
 *    `.cram-ov.open` anywhere. (The overlay no longer auto-opens at boot -- that was fixed, and
 *    visual_pane_smoke asserts it -- but the zombie window is still live in the code for any path
 *    that opens it, so the wait is on the class regardless. Cheap; closes the hole permanently.)
 *
 * 4. A BLANK BASELINE WOULD CERTIFY A BLANK PAGE.
 *    This repo has already shipped an a11y audit that passed a COMPLETELY BLANK PAGE, and a "visible
 *    text node" counter that reported 276 visible nodes on one (opacity:0 on <body> does not
 *    propagate to descendants; only the compositor knows). The identical trap is available here: if
 *    a baseline were ever captured blank, a blank render would MATCH IT and go green forever.
 *    GUARD: every capture must clear an INK FLOOR (_pixels.cjs counts pixels that are not the
 *    background colour), enforced on the verify path AND on the --update path, so a blank baseline
 *    cannot even be written.
 *
 * ===== DETERMINISM =========================================================================
 * Fixed per baseline: viewport, deviceScaleFactor, theme (via the app's own localStorage key),
 * locale, timezone, reduced-motion, forced-colors, and colour profile. Math.random is SEEDED --
 * dShuffle() (drill/logic.js:298) shuffles decks for Quick-5 and mixed-fire, and a check that
 * re-rolls its own input is measuring the RNG, not the render. The boot splash is waited out, never
 * photographed. WebGL is NOT captured: the `viz` pane is excluded by construction (Playwright's
 * screenshot cannot even see that layer -- it returns transparent -- so a "baseline" of it would be
 * a picture of nothing, and visual_pane_smoke already reads its drawing buffer directly).
 *
 * ===== WHAT THIS COVERS, AND WHAT IT DOES NOT (read this before trusting it) ================
 * COVERS   16 baselines: home + walk/drill/sys/num/wb panes, light+dark, desktop 1280x800; the
 *          accent rebind across ALL SIX rooms (walk, light); and mobile 390x844 (walk, light+dark).
 * DOES NOT the `viz` pane (WebGL, see above); the overlays (mock/cram/index) -- they are stateful
 *          and shuffled, and overlay_deadzone owns their input behaviour; hover/focus/active states;
 *          and every topic except the six named ones (46 topics x 10 panes is not a baseline set, it
 *          is a liability -- rail_integrity and topic_contract own per-topic content).
 * DOES NOT RUN CROSS-PLATFORM, AND THIS IS DELIBERATE. The app's body text is a SYSTEM font stack
 *          (-apple-system, "Segoe UI", Roboto, ...), so the glyphs are Segoe UI here and something
 *          else on the ubuntu-latest CI runner; even with an identical font file, DirectWrite and
 *          FreeType do not rasterise the same bytes. There is no tolerance that absorbs a different
 *          typeface while still catching a 1px shift -- so per-platform baselines are the only
 *          honest answer (Playwright's own snapshot tool makes the same call, naming its files
 *          -win32 / -linux). Baselines are therefore keyed by platform + Chromium major, and on an
 *          environment with no baselines this check EXITS 2 = SKIP, which the gate prints as SKIP
 *          rather than a PASS it did not earn. To cover CI: run `npm run vr:update` ON the runner
 *          and commit the artifact. Fabricating linux baselines from a Windows box would be
 *          committing a reference nobody has ever verified -- the precise move this repo keeps dying
 *          from -- so it is not done here.
 *
 * ===== USAGE ===============================================================================
 *   node test/visual_regression.cjs [deliverable.html]            verify against baselines
 *   node test/visual_regression.cjs [deliverable.html] --update   REGENERATE baselines (intentional)
 *   npm run vr:update                                             the same, spelled out
 * Exit: 0 = pass/updated, 1 = FAIL (a pixel moved, or a self-test aborted), 2 = SKIP (no baselines
 * for this platform; see above).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const P = require('./_pixels.cjs');

const HTML = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const UPDATE = process.argv.includes('--update');
const PROVE = process.argv.includes('--prove-stillness');

const BASE_DIR = path.join(__dirname, 'baselines');
const MANIFEST = path.join(BASE_DIR, 'manifest.json');
const REPORT_DIR = path.join(__dirname, 'reports', 'visual');   /* test/reports/ is gitignored */

/* ---- TOLERANCES ---------------------------------------------------------------------------
 * CHANNEL_TOL: a pixel counts as CHANGED if any RGB channel moves by more than this. 2/255 is
 *   below the visible threshold and exists only to absorb pathological rounding; it is NOT a
 *   licence for the render to drift.
 * MAX_CHANGED: the per-baseline budget of changed pixels. Set from MEASUREMENT, not taste.
 *   noise  : 0 px, on every one of 16 baselines, across 5 consecutive runs + 2 full gate runs,
 *            once the browser BINARY is pinned (see the EXE block below -- before that it was the
 *            single largest source of "drift", and it was not drift at all).
 *            The worst jitter ever observed in this app on ANY binary was 9 px, at a channel
 *            delta of 6/255 -- imperceptible text-AA from compositing-layer promotion.
 *   signal : one `1px` -> `2px` border, on ONE rule, inside a shadow root, moves 22,656-58,086 px.
 *   budget : 32. That is ~3.5x the worst jitter ever seen, and ~700x below the weakest real
 *            signal. It is deliberately NOT larger: a budget of 120 would let a 10x10 icon change
 *            colour COMPLETELY (100 px) and still report green, and a check with a blind spot you
 *            can drive a logo through is the kind that gets trusted right up until it matters.
 *            It is deliberately NOT 0 either: a check that cries wolf gets ignored, which is
 *            precisely how this repo got here.
 *   Note the budget is on the COUNT, not the magnitude -- so a sub-perceptual colour drift over a
 *   LARGE area (a token change repainting a whole surface) is still thousands of pixels and still
 *   goes red. Small-and-faint is forgiven; faint-but-everywhere is not.
 */
const CHANNEL_TOL = Number(process.env.VR_CHANNEL_TOL || 2);
const MAX_CHANGED = Number(process.env.VR_MAX_CHANGED || 32);

/* An INK FLOOR every capture must clear. See trap 4 in the header: without this, a blank baseline
 * would match a blank render forever. Deliberately well below the real measurements (which run
 * 14-40% ink, 100+ distinct colours) -- it is a blank-page tripwire, not a design assertion. */
const INK_FLOOR_PCT = 4;
const INK_FLOOR_DISTINCT = 24;

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844, hasTouch: true, isMobile: true },
};

/* One topic per room, HARDCODED. Deriving them from TopicRegistry order would let a registry
 * reorder silently re-point a baseline at a different topic -- the baseline would then "fail" for a
 * reason that has nothing to do with paint. */
const ROOMS = [
  ['messaging-events', 'event-driven'],
  ['data-storage', 'caching'],
  ['reliability-observability', 'retries-timeouts'],
  ['platform-infra', 'iac'],
  ['architecture-apis', 'state-machine'],
  ['security-tenancy', 'signing'],
];
const T0 = 'event-driven';   /* the default topic; room = messaging-events */

const MATRIX = [
  /* the landing route -- the first thing every user sees, and where a DOM reorder would land */
  { key: 'home-light', hash: '', theme: 'light', vp: 'desktop' },
  { key: 'home-dark', hash: '', theme: 'dark', vp: 'desktop' },
  /* the panes, both themes */
  { key: 'walk-light', hash: '#' + T0 + '/walk', theme: 'light', vp: 'desktop' },
  { key: 'walk-dark', hash: '#' + T0 + '/walk', theme: 'dark', vp: 'desktop' },
  { key: 'drill-light', hash: '#' + T0 + '/drill', theme: 'light', vp: 'desktop' },
  { key: 'drill-dark', hash: '#' + T0 + '/drill', theme: 'dark', vp: 'desktop' },
  /* one shot each for the remaining structurally-distinct panes. `num` is here on purpose: it is
     the pane with the known 38/46-topic horizontal-overflow sensitivity. */
  { key: 'sys-light', hash: '#' + T0 + '/sys', theme: 'light', vp: 'desktop' },
  { key: 'num-light', hash: '#' + T0 + '/num', theme: 'light', vp: 'desktop' },
  { key: 'wb-light', hash: '#' + T0 + '/wb', theme: 'light', vp: 'desktop' },
  /* THE SIX ROOMS -- the --acc / --topic-ink rebind, on one pane + theme. The rooms change accent
     HUE, so one surface is enough to catch a broken rebind; room_contrast and scoreboard_salience
     own the contrast/salience side of them. */
  ...ROOMS.slice(1).map(([group, topic]) => ({
    key: 'room-' + group, hash: '#' + topic + '/walk', theme: 'light', vp: 'desktop',
  })),
  /* mobile is a genuinely different layout path (off-canvas mockbar, fixed seg rail) */
  { key: 'm-walk-light', hash: '#' + T0 + '/walk', theme: 'light', vp: 'mobile' },
  { key: 'm-walk-dark', hash: '#' + T0 + '/walk', theme: 'dark', vp: 'mobile' },
];

/* =============================== IN-PAGE: THE STILLNESS GATE ===============================
 * Walks document + every shadow root, RECURSIVELY. document.getAnimations() alone is blind to 17
 * of the 18 roots on this page -- measured, see trap 1. Returns what it did so the caller can
 * assert the gate actually gripped something.
 */
const NEUTRALISE = () => {
  const roots = [document];
  const walk = (r) => {
    for (const el of r.querySelectorAll('*')) {
      if (el.shadowRoot && roots.indexOf(el.shadowRoot) === -1) {
        roots.push(el.shadowRoot);
        walk(el.shadowRoot);
      }
    }
  };
  walk(document);
  const all = () => roots.reduce((acc, r) => acc.concat(r.getAnimations()), []);

  /* WHAT WAS MOVING BEFORE WE TOUCHED IT. Reported so the gate can never become a comfortable
     no-op: if this is 0 on every capture forever, the gate is insurance that has never been seen to
     work, and the `--prove-stillness` mode exists to make it work on demand. */
  const before = all();
  const preRunning = before.filter((a) => a.playState === 'running').length;
  const preNames = [...new Set(before.map((a) => a.animationName || '(script)'))];
  const docOnlyBefore = document.getAnimations().length;

  let finished = 0, pinned = 0;
  for (const a of all()) {
    let endTime = Infinity;
    try { endTime = a.effect.getComputedTiming().endTime; } catch (e) { /* keep Infinity */ }
    if (endTime === Infinity) {
      /* An infinite animation NEVER settles, and finish() THROWS on it. Pin it to a fixed phase so
         the frame is at least the SAME frame every run. (This is what makes the boot spinner and
         drill's `pulse` photographable instead of a coin toss.) */
      try { a.pause(); a.currentTime = 0; pinned++; } catch (e) { /* detached; harmless */ }
    } else {
      /* Jump to the end. None of the entry animations (bodyIn/panein/railin/headin) use
         fill:forwards, so their finished state IS the element's at-rest style. */
      try { a.finish(); finished++; } catch (e) {
        try { a.pause(); a.currentTime = endTime; pinned++; } catch (e2) { /* detached */ }
      }
    }
  }
  const rest = all();
  return {
    roots: roots.length,
    preTotal: before.length,
    preRunning,
    preNames,
    preDocOnly: docOnlyBefore,   /* what the NAIVE gate would have seen -- the shadow-boundary delta */
    gripped: finished + pinned,
    finished,
    pinned,
    total: rest.length,
    running: rest.filter((a) => a.playState === 'running').length,
    splash: !!document.getElementById('_bootsplash'),
    /* THE CLASS, never the API -- the 220ms zombie (trap 3) */
    openOverlay: !!document.querySelector('.ix-ov.open, .mock-ov.open, .cram-ov.open'),
  };
};

/* Plant a known INFINITE animation inside a real shadow root, and leave it running. */
const PLANT_TRIPWIRE = () => {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot);
  if (!host) return { err: 'no shadow root on the page at all' };
  const el = host.shadowRoot.querySelector('*');
  if (!el) return { err: 'shadow root of <' + host.tagName.toLowerCase() + '> is empty' };
  const a = el.animate([{ opacity: 1 }, { opacity: 0.3 }], { duration: 60000, iterations: Infinity });
  a.id = '__VR_TRIPWIRE__';
  window.__vrTrip = a;
  return {
    host: host.tagName.toLowerCase(),
    /* what the NAIVE gate sees. Today: nothing. Measured. */
    docSees: document.getAnimations().some((x) => x.id === '__VR_TRIPWIRE__'),
  };
};

const CLEAR_TRIPWIRE = () => {
  if (window.__vrTrip) { window.__vrTrip.cancel(); delete window.__vrTrip; }
  return true;
};

/* SELF-TEST 2, run on EVERY capture -- the tripwire on trap 1.
 *
 * It plants an INFINITE animation inside a real shadow root and then runs THE ACTUAL NEUTRALISE
 * FUNCTION over it. An infinite animation can only be PINNED, never finished, so if the real
 * walker reached the shadow root, `pinned` must go UP by one. If someone ever "simplifies" the
 * walker back to document.getAnimations() -- which is blind to 17 of the 18 roots on this page --
 * pinned does NOT move, and the check ABORTS instead of going quietly green.
 *
 * The earlier version of this self-test had its OWN copy of the walker, which meant it proved that
 * A walker worked, not that THE walker did: sabotaging NEUTRALISE would have left the tripwire
 * happily green. A guard that does not exercise the code it is guarding is decoration, which is
 * the entire disease this file exists to treat. It now calls the real one. */
async function proveShadowGate(page) {
  const base = await page.evaluate(NEUTRALISE);        /* settle, and record the pinned count */
  const planted = await page.evaluate(PLANT_TRIPWIRE);
  if (planted.err) return { ok: false, why: planted.err };
  const after = await page.evaluate(NEUTRALISE);       /* <-- THE REAL WALKER, over the planted anim */
  await page.evaluate(CLEAR_TRIPWIRE);
  const sawIt = after.pinned > base.pinned;
  return {
    ok: sawIt,
    sawIt,
    docSees: planted.docSees,
    host: planted.host,
    pinned: base.pinned + ' -> ' + after.pinned,
  };
}

/* ================================ NODE SIDE ================================================ */

async function settle(page) {
  /* the splash is waited OUT, never photographed: its spinner is infinite and freezes at a
     random angle (boot.js:18). It self-removes 400ms after _hideBootSplash(). */
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash to clear');
  await B.until(page, () => !document.querySelector('.ix-ov.open, .mock-ov.open, .cram-ov.open'),
    null, B.ACT_MS, 'no overlay carrying .open (the 220ms zombie)');
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
  return page.evaluate(NEUTRALISE);
}

/* Screenshot until the SCREEN ITSELF stops changing: two consecutive byte-identical frames. This is
 * the ground truth and the last line of defence -- it does not care whether a change came from an
 * animation, a transition, a late layout, a decoded image or something nobody has thought of yet.
 * Re-neutralises on every attempt, so anything that kicks off a fresh animation gets pinned too. */
async function stableShot(page, tries) {
  const opts = {
    /* caret:'hide' -- a blinking text caret is a classic visual-regression flake, and the index
       overlay focuses an <input>. animations:'allow' is DELIBERATE: it leaves our own gate above as
       the thing actually doing the work, so if it regressed, this check would flap and we would
       find out. Handing the job to Playwright's animations:'disabled' would mask that -- and it
       would not handle the splash, the zombie overlay, the fonts or the RNG anyway. */
    caret: 'hide',
    animations: 'allow',
    scale: 'css',
  };
  /* anim0 is the FIRST settle -- the only one that can still find anything moving, and therefore
     the only honest record of what the gate actually gripped. Later settles run on an already-still
     page and grip 0 by construction; reporting one of those would flatter the gate. */
  const anim0 = await settle(page);
  let anim = anim0;
  let prev = await page.screenshot(opts);
  for (let i = 0; i < (tries || 8); i++) {
    anim = await settle(page);
    const cur = await page.screenshot(opts);
    if (cur.equals(prev)) return { buf: cur, anim0, anim, frames: i + 1 };
    prev = cur;
  }
  throw new Error('the screen never stopped changing: no two consecutive frames were identical after '
    + (tries || 8) + ' attempts (last anim state: ' + JSON.stringify(anim) + ')');
}

async function capture(browser, spec) {
  const vp = VIEWPORTS[spec.vp];
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: !!vp.hasTouch,
    isMobile: !!vp.isMobile,
    deviceScaleFactor: 1,
    /* Pin every ambient input that can silently repaint the page. reducedMotion and forcedColors
       especially: both have real @media blocks in this app, and both default to whatever the HOST
       OS happens to be set to -- so without these two lines a baseline captured on a machine with
       "reduce motion" enabled would never match one captured on a machine without it. */
    reducedMotion: 'no-preference',
    forcedColors: 'none',
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));

  await page.addInitScript((theme) => {
    try { localStorage.setItem('ddr.v1.theme', JSON.stringify(theme)); } catch (e) { /* ignore */ }
    /* SEED THE RNG. dShuffle() (drill/logic.js:298) shuffles decks; an unseeded check re-rolls its
       own input every run and is measuring the RNG, not the render. Deterministic LCG. */
    let s = 0x2f6e2b1 >>> 0;
    Math.random = () => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return s / 4294967296;
    };
  }, spec.theme);

  await B.gotoApp(page, HTML, { hash: spec.hash });
  const shot = await stableShot(page);

  const proof = await proveShadowGate(page);   /* SELF-TEST 2 -- exercises the REAL walker */
  const img = P.decodePng(shot.buf);
  const inked = P.ink(img);
  await ctx.close();
  return { ...shot, proof, img, inked, errs };
}

/* Per-pixel diff on DECODED images. Returns the changed count, the bounding box of the change (so a
 * human is told WHERE, not just how many) and a diff map with the changed pixels burned in red. */
function diffImages(a, b, tol) {
  if (a.w !== b.w || a.h !== b.h) return { dim: true, a: a.w + 'x' + a.h, b: b.w + 'x' + b.h };
  const n = a.w * a.h;
  const map = Buffer.alloc(n * 4);
  let changed = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, worst = 0;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const d = Math.max(
      Math.abs(a.data[p] - b.data[p]),
      Math.abs(a.data[p + 1] - b.data[p + 1]),
      Math.abs(a.data[p + 2] - b.data[p + 2]));
    if (d > worst) worst = d;
    if (d > tol) {
      changed++;
      const x = i % a.w, y = (i / a.w) | 0;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      map[p] = 255; map[p + 1] = 0; map[p + 2] = 0; map[p + 3] = 255;
    } else {
      /* keep the unchanged render as dim context, so the red is readable against the layout */
      map[p] = 255 - ((255 - b.data[p]) >> 2);
      map[p + 1] = 255 - ((255 - b.data[p + 1]) >> 2);
      map[p + 2] = 255 - ((255 - b.data[p + 2]) >> 2);
      map[p + 3] = 255;
    }
  }
  return {
    changed,
    tot: n,
    pct: +(100 * changed / n).toFixed(4),
    worst,
    bbox: changed ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null,
    map: { w: a.w, h: a.h, data: map },
  };
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
const L = (s, w) => String(s).padEnd(w).slice(0, w);
const R = (v, w) => String(v).padStart(w);

/* ===================== THE NEGATIVE CONTROL FOR THE STILLNESS GATE =========================
 * A stillness gate that has never been SEEN to catch a moving screen is decoration -- and in the
 * happy path it grips nothing, because an 11.6MB parse takes longer than a 650ms fade, so the app
 * has usually settled on its own before we even look. That is luck, not a guarantee, and it will not
 * hold on a slower box, on a CI runner, or on the day someone lengthens the fade.
 *
 * So: prove it on demand. Race the fade deliberately (navigate, do NOT wait for the app, shoot
 * immediately), and show
 *   (a) the UNGATED frame is genuinely, massively different from the baseline -- i.e. there really
 *       was something to catch, and a naive check would have scored a transient blended frame; and
 *   (b) the SAME page, once the gate has run, lands exactly on the baseline.
 * Run: node test/visual_regression.cjs --prove-stillness
 */
async function proveStillness(browser, tag, known) {
  console.log('=== NEGATIVE CONTROL: does the stillness gate actually catch a moving screen? ===\n');
  const spec = MATRIX.find((m) => m.key === 'walk-light');
  const rec = known[spec.key];
  if (!rec) { console.log('  no walk-light baseline for ' + tag + '; run --update first'); return 1; }
  const baseImg = P.decodePng(fs.readFileSync(path.join(BASE_DIR, rec.file)));

  const vp = VIEWPORTS[spec.vp];
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await ctx.newPage();
  await page.addInitScript((theme) => {
    try { localStorage.setItem('ddr.v1.theme', JSON.stringify(theme)); } catch (e) { /* ignore */ }
    let s = 0x2f6e2b1 >>> 0;
    Math.random = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  }, spec.theme);

  /* Navigate WITHOUT waiting for the app: land inside the fade, on purpose. */
  await page.goto(B.fileUrl(HTML, spec.hash), { timeout: B.NAV_MS, waitUntil: 'commit' });
  const shots = [];
  for (let i = 0; i < 14; i++) {                       /* sweep the boot window */
    /* Chromium refuses to capture before the very first paint ("Unable to capture screenshot").
       That is not a failure -- it is the earliest possible frame, and it means there was nothing on
       screen at all. Skip it and keep sweeping. */
    let raw = null;
    try { raw = await page.screenshot({ caret: 'hide', animations: 'allow', scale: 'css' }); } catch (e) {
      await new Promise((r) => setTimeout(r, 30));
      continue;
    }
    const st = await page.evaluate(() => {
      const roots = [document];
      const walk = (r) => {
        for (const e of r.querySelectorAll('*')) {
          if (e.shadowRoot && roots.indexOf(e.shadowRoot) === -1) { roots.push(e.shadowRoot); walk(e.shadowRoot); }
        }
      };
      walk(document);
      const a = roots.reduce((acc, r) => acc.concat(r.getAnimations()), []);
      return {
        running: a.filter((x) => x.playState === 'running').length,
        names: [...new Set(a.map((x) => x.animationName || '(script)'))].join(','),
        splash: !!document.getElementById('_bootsplash'),
        bodyOpacity: getComputedStyle(document.body).opacity,
      };
    }).catch(() => null);
    if (!st) break;
    let d = null;
    try { d = diffImages(baseImg, P.decodePng(raw), CHANNEL_TOL); } catch (e) { /* size mismatch mid-boot */ }
    shots.push({ i, ...st, changed: d && !d.dim ? d.changed : 'n/a' });
    if (!st.running && !st.splash && st.bodyOpacity === '1') break;
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log('  UNGATED -- screenshotting straight through the boot, no stillness gate:');
  console.log('  ' + L('t', 4) + L('body opacity', 14) + L('splash', 8) + R('running', 8) + R('changed px', 12) + '  animations');
  for (const s of shots) {
    console.log('  ' + L(s.i * 60 + 'ms', 4) + L(s.bodyOpacity, 14) + L(String(s.splash), 8)
      + R(s.running, 8) + R(s.changed, 12) + '  ' + s.names.slice(0, 40));
  }
  const worstUngated = shots.reduce((a, s) => (typeof s.changed === 'number' && s.changed > a ? s.changed : a), 0);

  /* Now let the gate do its job on the SAME page. */
  await B.until(page, B.APP_READY, null, B.READY_MS, 'app ready');
  const gated = await stableShot(page);
  const dg = diffImages(baseImg, P.decodePng(gated.buf), CHANNEL_TOL);

  console.log('\n  GATED   -- same page, after the stillness gate ran:');
  console.log('    gripped ' + gated.anim0.gripped + ' animation(s) across ' + gated.anim0.roots + ' roots'
    + '  (running before: ' + gated.anim0.preRunning + ')');
  console.log('    changed vs baseline: ' + dg.changed + ' px');
  console.log('\n  PART A shows the HAZARD is real: a capture taken 0-60ms early is 0.5-0.9 MILLION px');
  console.log('  off the truth. It does NOT yet show the gate doing the work -- on this box the 11.6MB');
  console.log('  parse outlasts the 650ms fade, so the page settles by itself and the gate grips 0.');
  console.log('  That is LUCK. Part B removes the luck.\n');
  await ctx.close();

  /* ---------------- PART B: force the gate to actually grip something ----------------------
   * Stretch every duration token to 20s. Now bodyIn/panein/railin are unambiguously MID-FLIGHT
   * when the gate runs -- they have ~19.6 seconds left -- so the page CANNOT have settled by luck.
   *   without the gate : we photograph a body at ~1% opacity -> a near-blank frame, wildly off.
   *   with the gate    : finish() jumps every finite animation to its end state, which (since none
   *                      of them use fill:forwards) IS the at-rest style -- so it must land exactly
   *                      on the baseline WHILE the animations nominally have 19s to run.
   * If the gate were blind to the shadow roots, or if finishing were not equivalent to resting,
   * this lands somewhere other than the baseline and says so. */
  console.log('=== PART B: every animation stretched to 20s, so the gate CANNOT settle by luck ===\n');
  const ctx2 = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const p2 = await ctx2.newPage();
  await p2.addInitScript((theme) => {
    try { localStorage.setItem('ddr.v1.theme', JSON.stringify(theme)); } catch (e) { /* ignore */ }
    let s = 0x2f6e2b1 >>> 0;
    Math.random = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.id = '__slowmo';
      st.textContent = ':root{--duration-instant:20s!important;--duration-fast:20s!important;'
        + '--duration-base:20s!important;--duration-moderate:20s!important;--duration-slow:20s!important;'
        + '--duration-slowest:20s!important}';
      document.head.appendChild(st);
    });
  }, spec.theme);

  await B.gotoApp(p2, HTML, { hash: spec.hash });
  await B.until(p2, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'splash gone');

  const before = await p2.evaluate(() => {
    const roots = [document];
    const walk = (r) => {
      for (const e of r.querySelectorAll('*')) {
        if (e.shadowRoot && roots.indexOf(e.shadowRoot) === -1) { roots.push(e.shadowRoot); walk(e.shadowRoot); }
      }
    };
    walk(document);
    const a = roots.reduce((acc, r) => acc.concat(r.getAnimations()), []);
    return {
      running: a.filter((x) => x.playState === 'running').length,
      names: [...new Set(a.map((x) => x.animationName || '(script)'))].join(','),
      bodyOpacity: getComputedStyle(document.body).opacity,
    };
  });
  const rawShot = await p2.screenshot({ caret: 'hide', animations: 'allow', scale: 'css' });
  const dRaw = diffImages(baseImg, P.decodePng(rawShot), CHANNEL_TOL);
  console.log('  UNGATED, mid-20s-fade:');
  console.log('    body opacity        : ' + before.bodyOpacity + '   (animations running: ' + before.running + ')');
  console.log('    live animations     : ' + before.names);
  console.log('    changed vs baseline : ' + dRaw.changed + ' px   <-- what a check without a stillness gate photographs');

  const gate = await p2.evaluate(NEUTRALISE);
  const gatedShot = await p2.screenshot({ caret: 'hide', animations: 'allow', scale: 'css' });
  const dGate = diffImages(baseImg, P.decodePng(gatedShot), CHANNEL_TOL);
  await ctx2.close();

  console.log('\n  GATED (same page, same 20s animations, gate applied):');
  console.log('    gripped             : ' + gate.gripped + ' animation(s) (' + gate.finished + ' finished, '
    + gate.pinned + ' pinned) across ' + gate.roots + ' roots');
  console.log('    of which the NAIVE document.getAnimations() would have seen: ' + gate.preDocOnly
    + '  <-- the shadow-boundary delta');
  console.log('    still running after : ' + gate.running);
  console.log('    changed vs baseline : ' + dGate.changed + ' px');

  const gripped = gate.gripped > 0 && before.running > 0;
  const caught = dRaw.changed > MAX_CHANGED * 10 && dGate.changed <= MAX_CHANGED;
  console.log('\n=== VERDICT ===');
  console.log('  A. the hazard is real     : an early frame is ' + worstUngated + ' px off the baseline');
  console.log('  B. the gate has real work : ' + before.running + ' animations running, gate gripped ' + gate.gripped);
  console.log('  C. ungated -> baseline    : ' + dRaw.changed + ' px  (a blended, wrong frame)');
  console.log('  D. gated   -> baseline    : ' + dGate.changed + ' px');
  const ok = gripped && caught && worstUngated > MAX_CHANGED * 10;
  console.log(ok
    ? '\n  => PROVEN. With animations that have 19+ seconds left to run, the gate lands the capture\n'
      + '     EXACTLY on the at-rest baseline. Without it, the check photographs a mid-fade frame that\n'
      + '     is ' + dRaw.changed + ' px wrong. The stillness gate is load-bearing, not decoration.'
    : '\n  => INCONCLUSIVE -- this run did not demonstrate the gate doing the work. Do not trust a green.');
  return ok ? 0 : 1;
}

/* ===================== PIN THE BINARY. THIS ONE COST A FULL GATE RUN. =======================
 * Playwright ships TWO Chromium executables: the full `chrome.exe`, and a separate
 * `chromium_headless_shell`. `chromium.launch()` in headless mode picks the SHELL by default --
 * but the moment you pass `executablePath`, it launches the FULL binary instead. And check_all.py
 * ALWAYS passes one (it resolves CHROME=... so the gate has no hardcoded paths).
 *
 * So this check, run by hand, was launching a different browser than this check run by the gate.
 * The two rasterise text differently. MEASURED, same build, same baselines, same code:
 *      headless shell -> worst  9 px   (PASS)
 *      full chromium  -> worst 13,804 px  (FAIL, all 16)
 * Nothing in the app changed. A baseline captured under one and verified under the other is a
 * permanent, unexplainable red -- and the "obvious" fix (regenerate until it is green) would just
 * move the red to whoever runs it the other way. `browser.version()` reports the SAME string for
 * both, so the manifest could not have caught it either.
 *
 * Both paths now resolve the SAME executable, explicitly, and the manifest records which. */
const EXE = process.env.CHROME || chromium.executablePath();

(async () => {
  const browser = await chromium.launch(Object.assign(B.launchOpts(), {
    executablePath: EXE,
    args: B.LAUNCH_ARGS.concat([
      /* srgb: without it the HOST DISPLAY's colour profile can tint the render, so the same build
         photographs differently on two monitors. disable-lcd-text: subpixel (RGB-fringed) text
         rasterisation is the single largest source of pixel jitter; grayscale AA is stable. */
      '--force-color-profile=srgb',
      '--disable-lcd-text',
    ]),
  }));
  const env = {
    platform: process.platform,
    arch: process.arch,
    chromium: browser.version(),
    chromiumMajor: String(browser.version()).split('.')[0],
    /* the BINARY, not just the version -- see the block above. version() cannot tell the full
       browser apart from the headless shell, and they do not paint the same pixels. */
    executable: path.basename(EXE),
    playwright: require('playwright/package.json').version,
  };
  const tag = env.platform + '-chromium' + env.chromiumMajor;

  /* ---- ENVIRONMENT GATE ---------------------------------------------------------------------
   * A baseline captured under DirectWrite cannot be honestly compared against a render under
   * FreeType. So: baselines are keyed by platform+chromium-major, and an environment we have no
   * baselines for is a SKIP -- never a PASS it did not earn, and never a red a human cannot act on.
   * But a MISSING MANIFEST is a hard FAIL: that is the check's own reference data going absent,
   * which is a repo fault, not an environment fact. Without this asymmetry, deleting the baselines
   * would turn the gate green -- and a check you can disable by deleting a file is decoration. */
  if (!fs.existsSync(MANIFEST)) {
    if (!UPDATE) {
      console.log('VISUAL REGRESSION: FAIL -- no baseline manifest at test/baselines/manifest.json. '
        + 'The check\'s reference data is MISSING (this is a repo fault, not an environment fact). '
        + 'Regenerate deliberately with: npm run vr:update');
      await browser.close();
      return B.finish(1, 'VISUAL REGRESSION: FAIL (no manifest)');
    }
  }
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { envs: {} };

  if (!UPDATE && !manifest.envs[tag]) {
    const have = Object.keys(manifest.envs).join(', ') || '(none)';
    console.log('=== VISUAL REGRESSION ===');
    console.log('  This environment is  : ' + tag + '  (' + env.chromium + ')');
    console.log('  Baselines exist for  : ' + have);
    console.log('  The app renders body text in a SYSTEM font stack, so the glyphs here are not the');
    console.log('  glyphs there -- and no pixel tolerance absorbs a different typeface while still');
    console.log('  catching a 1px shift. Comparing across platforms would be noise, not a check.');
    console.log('  TO COVER THIS ENVIRONMENT: run `npm run vr:update` ON IT and commit test/baselines/.');
    await browser.close();
    /* exit 2 = SKIP. check_all.py prints it as SKIP, not PASS: no coverage is claimed. */
    console.log('VISUAL REGRESSION: SKIP -- no baselines for ' + tag + ' (have: ' + have + '). Regenerate on this platform: npm run vr:update');
    await new Promise((res) => process.stdout.write('', res));
    process.exit(2);
  }

  const known = (manifest.envs[tag] && manifest.envs[tag].baselines) || {};

  if (PROVE) {
    const code = await proveStillness(browser, tag, known);
    await browser.close();
    return B.finish(code, code ? 'STILLNESS CONTROL: INCONCLUSIVE' : 'STILLNESS CONTROL: the gate catches a moving screen');
  }

  const fails = [];
  const rows = [];
  const written = {};

  console.log('=== VISUAL REGRESSION -- ' + (UPDATE ? 'REGENERATING BASELINES' : 'pixel diff vs committed baselines')
    + ' === ' + tag + ' / ' + env.chromium);
  console.log('    tolerance: a pixel is CHANGED at >' + CHANNEL_TOL + '/255 on any channel; budget '
    + MAX_CHANGED + ' changed px per baseline\n');
  /* `gripped` = animations this capture FINISHED or PINNED; `naive` = how many of those
     document.getAnimations() would have seen on its own. The gap between them is the shadow
     boundary, printed on every run so it cannot be forgotten again. */
  console.log(L('baseline', 30) + L('viewport', 11) + R('ink%', 7) + R('cols', 6) + R('gripped', 8)
    + R('naive', 6) + R('roots', 6) + R('frames', 7) + '  ' + (UPDATE ? 'action' : 'changed px'));
  console.log('-'.repeat(104));

  for (const spec of MATRIX) {
    const vp = VIEWPORTS[spec.vp];
    let cap;
    try {
      cap = await capture(browser, spec);
    } catch (e) {
      fails.push('[' + spec.key + '] capture failed: ' + e.message);
      console.log(L(spec.key, 30) + L(spec.vp, 11) + '  CAPTURE FAILED: ' + e.message.slice(0, 50));
      continue;
    }

    /* ---- SELF-TEST 2: the stillness gate really does cross the shadow boundary. ---- */
    if (!cap.proof.ok) {
      fails.push('[' + spec.key + '] SELF-TEST ABORT: NEUTRALISE did not pin an infinite animation '
        + 'planted inside <' + cap.proof.host + '>\'s shadow root (pinned ' + cap.proof.pinned + '). '
        + 'The stillness gate is BLIND to the shadow roots -- which is 17 of the 18 roots on this '
        + 'page -- so every capture in this run is untrustworthy. Do NOT trust a green from it.');
    } else if (cap.proof.docSees) {
      /* Not a failure: a PLATFORM change. Today, document.getAnimations() cannot see into a shadow
         root (measured). If that ever changes, say so out loud rather than silently over-trusting a
         gate whose reason for existing just moved. */
      console.log('  NOTE [' + spec.key + ']: document.getAnimations() NOW reports shadow-root '
        + 'animations. The platform changed. Re-verify this check\'s assumptions.');
    }

    /* ---- Nothing may be MOVING at the moment of capture. (In the happy path the 11.6MB parse
            outlasts the 650ms fade, so the gate usually grips 0 and these are trivially true -- that
            is luck, not a guarantee. `--prove-stillness` races the fade on purpose and shows the
            gate converting a moving screen into the rest state.) */
    if (cap.anim.running !== 0) {
      fails.push('[' + spec.key + '] captured with ' + cap.anim.running + ' animation(s) still RUNNING');
    }
    if (cap.anim.splash) fails.push('[' + spec.key + '] the boot splash was still on screen at capture');
    if (cap.anim.openOverlay) fails.push('[' + spec.key + '] an overlay still carried .open at capture (the 220ms zombie)');

    /* ---- TRAP 4: the blank-page tripwire. Enforced on BOTH paths. ---- */
    const blank = cap.inked.inkPct < INK_FLOOR_PCT || cap.inked.distinct < INK_FLOOR_DISTINCT;
    if (blank) {
      fails.push('[' + spec.key + '] BLANK-PAGE TRIPWIRE: only ' + cap.inked.inkPct + '% of pixels are '
        + 'not the background colour (' + cap.inked.distinct + ' distinct colours). Floor is '
        + INK_FLOOR_PCT + '% / ' + INK_FLOOR_DISTINCT + '. Refusing to '
        + (UPDATE ? 'WRITE a blank baseline' : 'certify a blank render') + '.');
    }
    if (cap.errs.length) fails.push('[' + spec.key + '] page errors: ' + cap.errs.slice(0, 2).join(' | '));

    const file = spec.key + '-' + tag + '.png';
    const abs = path.join(BASE_DIR, file);
    const head = L(spec.key, 30) + L(vp.width + 'x' + vp.height, 11) + R(cap.inked.inkPct, 7)
      + R(cap.inked.distinct, 6) + R(cap.anim0.gripped, 8) + R(cap.anim0.preDocOnly, 6)
      + R(cap.anim0.roots, 6) + R(cap.frames, 7) + '  ';

    if (UPDATE) {
      if (blank) { console.log(head + 'REFUSED (blank)'); continue; }
      fs.mkdirSync(BASE_DIR, { recursive: true });
      fs.writeFileSync(abs, cap.buf);
      written[spec.key] = { file, w: cap.img.w, h: cap.img.h, sha256: sha(cap.buf),
        hash: spec.hash, theme: spec.theme, vp: spec.vp };
      console.log(head + 'WROTE ' + file + '  (' + (cap.buf.length / 1024).toFixed(0) + ' KB)');
      continue;
    }

    /* ---- VERIFY ---- */
    const rec = known[spec.key];
    if (!rec) {
      fails.push('[' + spec.key + '] the manifest declares no baseline for this key on ' + tag
        + ' -- the matrix grew but the baselines did not. Run: npm run vr:update');
      console.log(head + 'NO BASELINE');
      continue;
    }
    if (!fs.existsSync(abs)) {
      fails.push('[' + spec.key + '] baseline file MISSING from the repo: test/baselines/' + file
        + ' (the manifest expects it). Deleting baselines must not turn this check green.');
      console.log(head + 'FILE MISSING');
      continue;
    }
    const baseBuf = fs.readFileSync(abs);
    const baseImg = P.decodePng(baseBuf);
    const d = diffImages(baseImg, cap.img, CHANNEL_TOL);

    if (d.dim) {
      fails.push('[' + spec.key + '] DIMENSIONS CHANGED: baseline ' + d.a + ' vs render ' + d.b);
      console.log(head + 'DIMS ' + d.a + ' -> ' + d.b);
      continue;
    }

    /* ---- SELF-TEST 1: the differ can see ONE pixel. Runs on every baseline, against the real
            captured image, so a differ that silently stopped comparing cannot report a clean run.
            (A check you have not SEEN fail is decoration; this one is made to fail on demand.) ---- */
    const poked = { w: cap.img.w, h: cap.img.h, data: Buffer.from(cap.img.data) };
    const mid = (((cap.img.h >> 1) * cap.img.w) + (cap.img.w >> 1)) * 4;
    poked.data[mid] = poked.data[mid] ^ 0xff;                   /* flip one channel of one pixel */
    const st1 = diffImages(cap.img, poked, CHANNEL_TOL);
    if (st1.changed !== 1) {
      fails.push('[' + spec.key + '] SELF-TEST ABORT: the differ reported ' + st1.changed
        + ' changed pixels for a ONE-pixel change. It is not comparing pixels.');
    }

    rows.push({ key: spec.key, changed: d.changed, pct: d.pct, worst: d.worst, bbox: d.bbox });
    const ok = d.changed <= MAX_CHANGED;
    console.log(head + (ok ? String(d.changed) : String(d.changed) + '  <-- OVER BUDGET (' + MAX_CHANGED + ')'));

    if (!ok) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
      const actual = path.join(REPORT_DIR, spec.key + '.actual.png');
      const dmap = path.join(REPORT_DIR, spec.key + '.diff.png');
      fs.writeFileSync(actual, cap.buf);
      fs.writeFileSync(dmap, P.encodePng(d.map.w, d.map.h, d.map.data));
      fails.push('[' + spec.key + '] ' + d.changed + ' px changed (' + d.pct + '%, worst channel delta '
        + d.worst + '/255) in a ' + d.bbox.w + 'x' + d.bbox.h + ' box at (' + d.bbox.x + ',' + d.bbox.y
        + '). Evidence: test/reports/visual/' + spec.key + '.diff.png (changed pixels in red)');
    }
  }

  await browser.close();

  if (UPDATE) {
    if (fails.length) {
      console.log('\nREFUSING TO WRITE BASELINES -- the capture itself is not trustworthy:');
      fails.forEach((f) => console.log('  - ' + f));
      return B.finish(1, 'VISUAL REGRESSION: FAIL (refused to write baselines from a bad capture)');
    }
    fs.mkdirSync(BASE_DIR, { recursive: true });
    const m = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { envs: {} };
    m.envs = m.envs || {};
    m.envs[tag] = {
      env,
      capture: {
        deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'UTC',
        reducedMotion: 'no-preference', forcedColors: 'none',
        colorProfile: 'srgb', lcdText: false, mathRandom: 'seeded-lcg',
      },
      tolerance: { channelTol: CHANNEL_TOL, maxChanged: MAX_CHANGED },
      generated: new Date().toISOString(),
      baselines: written,
    };
    fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
    console.log('\nWROTE ' + Object.keys(written).length + ' baselines for ' + tag + ' + manifest.');
    console.log('REVIEW THE PNGs BEFORE COMMITTING. A baseline is a claim that this is what the app is');
    console.log('SUPPOSED to look like -- regenerating without looking is how a regression becomes the');
    console.log('new reference.');
    return B.finish(0, 'VISUAL REGRESSION: BASELINES REGENERATED');
  }

  const worstRow = rows.reduce((a, r) => (r.changed > (a ? a.changed : -1) ? r : a), null);
  console.log('\n' + rows.length + ' baselines compared; worst = '
    + (worstRow ? worstRow.changed + ' px (' + worstRow.key + ')' : 'n/a')
    + ', budget ' + MAX_CHANGED + ' px.');

  if (fails.length) {
    console.log('\nVISUAL REGRESSION: FAIL ' + fails.length);
    fails.forEach((f) => console.log('  - ' + f));
    return B.finish(1, 'VISUAL REGRESSION: FAIL (' + fails.length + '): ' + fails[0].slice(0, 150));
  }
  console.log('VISUAL REGRESSION: PASS  (' + rows.length + ' baselines, ' + tag
    + '; every capture reached a proven rest state across all 18 roots, cleared the blank-page floor,'
    + ' and matched its committed pixels)');
  return B.finish(0);
})();
