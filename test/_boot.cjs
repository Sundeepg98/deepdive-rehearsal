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

/* Navigate and WAIT FOR THE APP. Does NOT touch the landing overlay: visual_pane_smoke asserts
 * that a first-run boot OPENS it, so closing it here would silently delete that assertion. */
async function gotoApp(page, html, opts) {
  const o = opts || {};
  await page.goto(fileUrl(html, o.hash), { timeout: NAV_MS, waitUntil: 'load' });
  await page.waitForFunction(APP_READY, null, { timeout: READY_MS });
  if (o.fonts !== false) { try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ } }
  return page;
}

/* The landing overlay is a real modal: its backdrop swallows trusted clicks. Checks that click
 * through Playwright (rather than via in-page .click(), which ignores pointer-events) must close
 * it FIRST and then wait for it to actually be gone.
 *
 * AND IT OPENS ASYNCHRONOUSLY, AFTER BOOT. This is the trap, and it cost 4 gate runs in 5:
 * calling close() before the overlay has opened is a NO-OP that LOSES. isOpen() reads false, we
 * skip the close, the overlay opens behind us, and its backdrop then silently swallows every
 * trusted click for the rest of the run -- so the failure surfaces somewhere else entirely, as a
 * pane that "would not switch".
 *
 * Note WHY this only appeared now: the old boot was goto() + a 300-400ms sleep, which happened to
 * outlast the overlay's open. Replacing the sleep with a readiness condition made the harness
 * FASTER, and the extra speed walked straight into a race the sleep had been masking. Removing a
 * fixed sleep can expose a latent race as easily as it fixes one -- the sleep is not always doing
 * nothing, and "it got faster" is not the same as "it got correct".
 *
 * So: give it a bounded chance to APPEAR (this wait EXPIRING is the healthy path for a returning
 * user, who gets no overlay), then close whatever is actually there, re-closing if it reopens,
 * and only succeed once it is really gone. */
async function closeIndex(page) {
  await page.waitForFunction(
    () => !!(window.IndexOverlay && typeof window.IndexOverlay.isOpen === 'function'),
    null, { timeout: ACT_MS });
  await page.waitForFunction(() => window.IndexOverlay.isOpen(), null, { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => {
    if (window.IndexOverlay.isOpen()) { window.IndexOverlay.close(); return false; }
    return true;
  }, null, { timeout: ACT_MS });
  return settle(page);
}

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
  launchOpts, fileUrl, APP_READY, gotoApp, closeIndex, waitIndexOpen, settle, until, pollFor, finish,
};
