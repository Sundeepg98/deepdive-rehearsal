/* ===== SHARED BOOT + TIMING PRIMITIVES FOR EVERY BROWSER CHECK IN THE GATE =====
 *
 * WHY THIS FILE EXISTS
 * Nine browser checks each grew their own way of answering "is the app up yet?", and eight of
 * them answered it with a STOPWATCH: goto(), then waitForTimeout(300..400), then start
 * asserting. A fixed sleep is not a readiness condition -- it is a bet that the machine is as
 * fast today as it was the day the number was typed. The deliverable then went 5.2MB -> 11.4MB
 * and the bets got tighter, all at once, in nine places.
 *
 * A flaky gate is worse than no gate: it teaches the team that red means "run it again". This
 * repo has already paid for that lesson once -- a compiler bug destroyed 608 authored items per
 * build while the gate sat green -- so the checks are not allowed to cry wolf.
 *
 * THE RULE HERE: wait for a CONDITION, never for a DURATION. Every helper below blocks on
 * something the app actually does, and the timeout exists only to convert a HANG into a
 * failure. Slow must never be reportable as broken.
 *
 * ===== MEASURED, on the 11.4MB deliverable, 2026-07-12 (8-core dev box) =====
 *                                     idle           8-core saturation
 *   goto() -> load event              355-455ms      594-645ms
 *   app globals ready after goto      0ms (already ready in 9/9 runs)
 *   pane becomes visible              24-157ms       45-313ms
 *   Playwright click() actionability  361-733ms      397-1580ms
 * A CI runner is ~4x weaker than this box, so the caps below still carry >10x margin on the
 * worst number ever observed. They are budgets for HANGS, not performance assertions: putting a
 * perf budget in a correctness timeout is what made the old 2000ms pane cap a latent flake.
 */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');

/* Env-overridable so a genuinely slower CI box can be given more room without editing checks. */
const NAV_MS = Number(process.env.GATE_NAV_MS || 120000);   /* navigate + parse 11.4MB          */
const READY_MS = Number(process.env.GATE_READY_MS || 60000); /* app globals exist and are wired  */
const ACT_MS = Number(process.env.GATE_ACT_MS || 30000);     /* one interaction settles          */

/* Chromium THROTTLES rAF and timers in a tab that is backgrounded or occluded -- down to ~1fps,
 * or frozen. That is not hypothetical here: several checks hold more than one page open at once,
 * so all but one are occluded by definition, and every animation assertion in visual_pane_smoke
 * measures rAF-driven progress (frames advanced, pixels changed) over a fixed window. Throttling
 * fails those assertions for a reason that has nothing to do with the app under test. */
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

/* Every check spells the launch object slightly differently; this is the one true form. */
function launchOpts(extra) {
  const o = Object.assign({ args: LAUNCH_ARGS.slice() }, extra || {});
  if (process.env.CHROME) o.executablePath = process.env.CHROME;
  return o;
}

/* 'file://' + path.resolve(p) yields file://D:\a\b on Windows -- a host of "d" and backslash
 * separators. Chromium forgives it; the URL spec does not. pathToFileURL is the correct answer
 * on both platforms. */
function fileUrl(p, hash) {
  return pathToFileURL(path.resolve(p)).href + (hash || '');
}

/* THE readiness predicate. Runs in-page. These are the globals every check drives, so an app
 * that satisfies this is an app that can be tested -- which is exactly what a boot gate should
 * assert, and exactly what a 300ms sleep does not. */
const APP_READY = () =>
  document.readyState === 'complete' &&
  typeof switchTab === 'function' &&
  typeof TopicRegistry !== 'undefined' &&
  TopicRegistry.ids().length > 0;

/* Navigate and WAIT FOR THE APP. Does NOT navigate off the landing surface: visual_pane_smoke
 * asserts what a first-run boot actually lands on (the #home route, with NO modal in front of it),
 * so moving away from it here would silently delete that assertion. Checks that want the TOPIC
 * chrome should pass { hash: '#walk' }, or call enterApp() below. */
async function gotoApp(page, html, opts) {
  const o = opts || {};
  await page.goto(fileUrl(html, o.hash), { timeout: NAV_MS, waitUntil: 'load' });
  await page.waitForFunction(APP_READY, null, { timeout: READY_MS });
  if (o.fonts !== false) { try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ } }
  return page;
}

/* GET TO THE TOPIC UI. (Was closeIndex -- see the history below, it is worth keeping.)
 *
 * THE HISTORY. This function used to exist because THE APP OPENED A MODAL ON ITSELF AT BOOT, and
 * that modal's backdrop swallowed trusted clicks. Every check that clicks through Playwright had
 * to close it first, and it opened ASYNCHRONOUSLY, which cost 4 gate runs in 5: close() before the
 * overlay had opened was a no-op that LOST, the overlay then opened behind us, and its backdrop
 * silently ate every trusted click for the rest of the run -- surfacing somewhere else entirely as
 * "a pane that would not switch".
 *
 * That was the harness working around a REAL BUG in the product rather than reporting it. The bug
 * is now fixed: the boot-open gate is gone (the entry is the #home ROUTE), and no layer hit-tests
 * while it fades. test/overlay_deadzone.cjs asserts all of that directly, and FAILS on the old
 * build -- so the contract is now guarded where it belongs, in a check, not papered over here.
 *
 * WHAT IT DOES NOW. A bare arrival lands on #home, where .app is display:none. A check that wants
 * the TOPIC chrome (panes, rail, tools) must therefore navigate to a topic view. That is all this
 * does -- plus close any overlay a check itself opened. It no longer waits 5s for a modal that can
 * no longer appear. */
async function enterApp(page) {
  await page.waitForFunction(
    () => !!(window.IndexOverlay && typeof window.IndexOverlay.isOpen === 'function' && window.Router),
    null, { timeout: ACT_MS });
  await page.evaluate(() => {
    if (window.IndexOverlay.isOpen()) window.IndexOverlay.close();
    if (document.documentElement.dataset.view === 'home') window.Router.navigate('walk');
  });
  /* SUCCEED ONLY ON THE ACTUAL END STATE -- never on a boolean that flips ahead of the DOM.
   *
   * THE TRAP THIS CLOSES (it made a check that could not fail -- the ninth in this repo).
   * IndexOverlay.close() flips isOpen() to false SYNCHRONOUSLY, but the element keeps the `open`
   * class for another 220ms (a setTimeout, so the fade-out can paint). This helper used to wait for
   * `isOpen() === false` and then settle() -- two rAFs, ~32ms -- so it RETURNED INSIDE THAT WINDOW,
   * with the overlay still carrying `open`. Anything the caller did next ran against a layer the app
   * still considered present.
   *
   * That was not academic. shell.js's global keymap bails out under an open dialog, and it used to
   * test the CLASS alone -- so for those 220ms THE ENTIRE KEYBOARD WAS DEAD while the app's own API
   * reported the overlay closed. Every check that closed the overlay and immediately pressed a key
   * was driving a switched-off keyboard, and "key X does not leak" went GREEN FOR THE WRONG REASON.
   *
   * shell.js and styles.css have since been fixed to gate on `.open:not(.closing)` (THE INTERACTIVITY
   * INVARIANT), so the window is no longer dead -- but a harness whose exit condition is a boolean
   * that disagrees with the DOM is a loaded gun regardless: it would silently start lying again the
   * day anyone widened that predicate back to `.open`. So wait for what is actually TRUE: no dialog
   * is still open. It costs one extra frame and it cannot lie.
   *
   * Scoped to [role=dialog][aria-modal=true] -- the same set shell.js's keymap consults, derived from
   * the DOM rather than a hard-coded list, so a future overlay is covered the day it is added. */
  const QUIESCENT = () => {
    if (window.IndexOverlay.isOpen()) { window.IndexOverlay.close(); return false; }
    if (document.querySelector('[role="dialog"][aria-modal="true"].open')) return false;  /* zombie layer */
    if (document.documentElement.dataset.view === 'home') return false;
    const app = document.querySelector('.app');
    return !!app && getComputedStyle(app).display !== 'none';
  };
  try {
    await page.waitForFunction(QUIESCENT, null, { timeout: ACT_MS });
  } catch (e) {
    /* A blank timeout reads as a flake, and "flake" is how this repo has historically lost a red.
       Name the layer that is still up. (enterApp's contract is "the topic UI, with nothing modal over
       it" -- so a check that deliberately leaves Mock Run open must not call it.) */
    const stuck = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"].open');
      return d ? (d.id || d.className) : (document.documentElement.dataset.view === 'home' ? '(still on #home)' : '(.app never became visible)');
    }).catch(() => '(page gone)');
    throw new Error('enterApp: the app never became usable -- still blocked by: ' + stuck);
  }
  return settle(page);
}
/* the old name, kept so existing checks read unchanged */
const closeIndex = enterApp;

/* Bounded wait for the landing overlay to APPEAR. Never throws: a check that ASSERTS the overlay
 * opened must be allowed to see that it did not, and a check that merely needs it gone must not
 * die because a returning user never got one. Use before reading .ix-ov state, so the read is not
 * racing the overlay's asynchronous open (see closeIndex). */
async function waitIndexOpen(page, ms) {
  await page.waitForFunction(() => !!document.querySelector('.ix-ov.open'), null, { timeout: ms || 5000 }).catch(() => {});
  return settle(page);
}

/* Two rAFs = "the browser has had a chance to lay out and paint what we just did". Deterministic
 * (it is the browser telling us, not a stopwatch guessing) and typically <32ms. */
async function settle(page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/* Bounded poll for a condition. The universal replacement for "sleep N, then assert".
 * Returns true, or throws a TimeoutError naming the condition -- so BROKEN still fails, and
 * SLOW just takes a little longer. */
async function until(page, fn, arg, ms, label) {
  try {
    await page.waitForFunction(fn, arg, { timeout: ms || ACT_MS });
    return true;
  } catch (e) {
    throw new Error('timed out after ' + (ms || ACT_MS) + 'ms waiting for: ' + (label || fn.toString().slice(0, 120)));
  }
}

/* Poll a NODE-side probe (one that must round-trip through page.evaluate) until it satisfies
 * `ok`. This is how an animation assertion stops being a knife-edge sample: instead of
 * "sleep 1000ms, read once, demand >3000 changed pixels", it becomes "keep looking until the
 * pixels really do change, and fail only if they never do".  Same assertion. No stopwatch. */
async function pollFor(probe, ok, ms, label) {
  const cap = ms || ACT_MS;
  const t0 = Date.now();
  let last;
  for (;;) {
    last = await probe();
    if (ok(last)) return last;
    if (Date.now() - t0 > cap) {
      const e = new Error('condition never held within ' + cap + 'ms: ' + (label || '(unlabelled)') +
        '  last=' + JSON.stringify(last));
      e.last = last;
      throw e;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

/* Wait until `locator` is fully PAINTED: its EFFECTIVE opacity (the product of computed opacity
 * up the ancestor chain) has reached ~1. Freshly-mounted content sits under the app's entry
 * animations (bodyIn/railin, and each pane's own fade) that ramp opacity 0->1 for ~300ms AFTER
 * settle()'s two rAFs return -- so a pixel/screenshot check that fires inside that window measures
 * antialiased ghosts, not glyphs. Condition, not duration: a target that never reaches full
 * opacity times out into a real failure, so this cannot mask a genuinely unpainted element. */
async function waitPainted(locator, ms) {
  return pollFor(
    () => locator.evaluate((el) => {
      let o = 1, n = el;
      while (n && n.nodeType === 1) { const v = parseFloat(getComputedStyle(n).opacity); if (!isNaN(v)) o *= v; n = n.parentElement; }
      return o;
    }).catch(() => 0),
    (o) => o >= 0.995,
    ms || ACT_MS,
    'paint-settle: effective opacity ~= 1');
}

/* A check that dies without saying why is the single most corrosive thing in a gate: the gate
 * reports a check by its LAST LINE, so a silent death prints a red with a blank reason, and a
 * blank reason reads as "flake -- run it again". Route every exit through here. */
async function finish(code, label) {
  if (code !== 0 && label) console.log(label);
  await new Promise((res) => process.stdout.write('', res));   /* drain before exit */
  process.exit(code);
}

module.exports = {
  NAV_MS, READY_MS, ACT_MS, LAUNCH_ARGS,
  launchOpts, fileUrl, APP_READY, gotoApp, enterApp, closeIndex, waitIndexOpen, settle, until, pollFor, waitPainted, finish,
};
