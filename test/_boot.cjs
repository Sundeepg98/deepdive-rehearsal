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
 * opacity times out into a real failure, so this cannot mask a genuinely unpainted element.
 *
 * THE WALK CROSSES SHADOW BOUNDARIES. At the top of a shadow tree parentElement is null (the
 * parent is the ShadowRoot, a fragment, not an element), so a parentElement-only walk silently
 * EXEMPTS every shadow-DOM target from the ancestors that actually fade it -- bodyIn animates
 * <body>, which sits ABOVE the host. The drill CTAs (.push/.dn-n, inside deep-drill's root) only
 * ever measured their shadow-local chain (~1) and read "painted" mid-fade; they passed cta_contrast
 * incidentally, because the light-DOM #mockopen is checked first and its wait outlives the fade.
 * So: when parentElement runs out, hop to getRootNode().host and keep multiplying. For a light-DOM
 * element the hop clause is reached exactly once, at <html>, where getRootNode() is the document
 * and .host is undefined -- the chain walked, the product, and the poll cadence are identical to
 * the old walk, so existing light-DOM callers see the same behaviour to the frame. */
/* ===== THE AT-REST PRIMITIVE ======================================================================
 *
 * ONE definition of "genuinely still", called by every check that measures a pixel or a box.
 * It exists because the same defect was found twice, in two checks, each with its own home-grown
 * stillness guard, and BOTH guards failed the same way.
 *
 * WHAT WENT WRONG, measured rather than reasoned (gate-runtime wave + its cold verify):
 *   touch_floor  polled until TWO CONSECUTIVE READS AGREED, then asserted on the box. It false-red
 *                at ~20% (18/90 pooled, two authors, two volumes) with a byte-identical
 *                {"w":42.2,"h":42.2} against a 44px floor. 42.2 is 44 x 0.96, and .96 is the
 *                LITERAL `from` scale of the panelIn keyframe (styles.css) under a monotonic
 *                cubic-bezier with no `perspective` anywhere for translateZ to act through. So the
 *                sample was not caught mid-flight at some arbitrary scale -- IT WAS CAUGHT AT THE
 *                ANIMATION'S FIRST KEYFRAME, BEFORE IT HAD ADVANCED AT ALL, twice, 100ms apart.
 *   cta_contrast waited for EFFECTIVE OPACITY ~= 1 and then screenshotted. It reported "no core
 *                glyph pixels found" under load: opacity had arrived, the transform had not, and a
 *                scaled glyph rasterises to antialiased edges where no pixel is the pure text
 *                colour.
 *
 * THE LESSON, and the reason this is a primitive rather than two patches: **both guards were
 * anti-correlated with the thing they tested.** "Two reads agree" is EASIEST before an animation
 * starts. "Opacity is 1" is satisfied by a fade that finished while a transform still runs. A
 * stillness condition that is cheapest to satisfy at the exact moment the page is least still is
 * not a weak guard, it is an inverted one, and no amount of re-tuning a threshold fixes that.
 *
 * WHAT REST MEANS HERE, all three required:
 *   1. NOTHING IS IN FLIGHT -- no unfinished CSS animation or transition anywhere up the ancestor
 *      chain, across shadow boundaries. This is the arm the 42.2 proof demands, and it is stated
 *      as "in flight" rather than "transform is identity" for a measured reason: see the note
 *      above restOk, where identity was tried, shipped into the battery, and refuted by a resting
 *      hover lift in one run.
 *   2. EFFECTIVE ALPHA ~= 1, the product of computed opacity up the same chain (the old
 *      waitPainted contract, kept verbatim -- it was necessary, just not sufficient).
 *   3. rAF-SEPARATED CONFIRMATION: the condition holds, a frame passes, it still holds, and the
 *      transform chain is unchanged between the two samples.
 *
 * It stays a CONDITION, never a duration: a target that never comes to rest times out into a real
 * failure NAMING what was still moving. (The first version of this file returned null from its
 * poll probe and produced `last=null` -- a timeout that could not say why. A guard built to
 * abolish blank reds does not get to emit one.) Slow must not be reportable as broken, and broken
 * must not be reportable as slow.
 *
 * ESCAPE HATCH, deliberately narrow: `allowMotion: true` for a caller that genuinely wants to
 * measure mid-flight. No current caller uses it; it exists so that a future one does not have to
 * reinvent a private stillness guard, which is how this repo got two inverted ones.
 */

/* Runs IN PAGE. Self-contained by necessity: page.evaluate serialises this function's TEXT, so it
 * cannot close over anything in this module. Accepts an ELEMENT (locator.evaluate hands one in) or
 * a SELECTOR STRING (page.evaluate passes the arg), so one definition serves both entry points. */
const REST_STATE = function (elOrSel) {
  var EPS = 1e-3;
  var el = (typeof elOrSel === 'string') ? document.querySelector(elOrSel) : elOrSel;
  /* A target that is not there YET is not "moving" -- callers poll for their own element and
     assert on its absence themselves (touch_floor returns {missing:true} and fails on it). Making
     absence block here would convert a clean, specific FAIL into an unhelpful timeout. */
  if (!el) return { alpha: 1, still: true, moving: null, missing: true };

  function identity(t) {
    if (!t || t === 'none') return true;
    var m = /^matrix(3d)?\(([^)]*)\)$/.exec(String(t).trim());
    if (!m) return true;                    /* a form this does not model: never block on it */
    var n = m[2].split(',').map(function (x) { return parseFloat(x); });
    var want = m[1] ? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] : [1, 0, 0, 1, 0, 0];
    if (n.length !== want.length) return true;
    for (var i = 0; i < n.length; i++) if (!(Math.abs(n[i] - want[i]) <= EPS)) return false;
    return true;
  }

  var alpha = 1, moving = null, tf = [], node = el;
  while (node && node.nodeType === 1) {
    var cs = getComputedStyle(node);
    var o = parseFloat(cs.opacity);
    if (!isNaN(o)) alpha *= o;
    /* The transform CHAIN, recorded as a signature the caller compares across a frame. Identity is
       reported for diagnostics but is NOT required -- see the note above restOk. */
    if (!identity(cs.transform)) {
      tf.push((node.id ? '#' + node.id : node.tagName.toLowerCase()) + '=' + cs.transform);
    }
    /* IS ANYTHING ACTUALLY IN FLIGHT? getAnimations() covers CSS animations AND CSS transitions,
       and it is the only signal that separates "resting at a non-identity transform" from "parked
       at an animation's first keyframe" -- the two states that look identical to a geometry read
       and that a stillness guard must not confuse. INFINITE animations are excluded deliberately:
       the boot spinner never finishes, so waiting on it would hang rather than settle (the pixel
       gate in visual_regression PINS those to a fixed phase for the same reason). */
    if (moving === null && node.getAnimations) {
      var anims = [];
      try { anims = node.getAnimations(); } catch (e) { anims = []; }
      for (var i = 0; i < anims.length; i++) {
        var a = anims[i], st = a.playState;
        /* PAUSED IS IN FLIGHT. It was skipped in the first version, and the cold verify planted the
           hole: a 44px control parked at scale(.961) by animation-play-state:paused reads 42.3px,
           reports still=true with alpha 1, and the rAF chain-compare is blind to it BECAUSE a
           paused transform is identical across frames. That is the 42.2 defect through a different
           door -- and the one door the ruled identity predicate would have closed, which is worth
           recording: dropping identity bought a real false-hang fix and cost this, until now.
           A paused animation holds its element mid-flight indefinitely, so "paused" is the one
           playState most obviously not at rest. Infinite animations are still excluded below, so
           this adds no hang risk that was not already accepted. */
        if (st !== 'running' && st !== 'pending' && st !== 'paused') continue;
        var iters = 1;
        try { iters = a.effect.getComputedTiming().iterations; } catch (e) { iters = 1; }
        if (iters === Infinity) continue;
        moving = (node.id ? '#' + node.id : node.tagName.toLowerCase()) + ' <- ' +
          ((a.animationName || (a.transitionProperty ? 'transition:' + a.transitionProperty : 'animation')) +
           ' [' + st + ']');
        break;
      }
    }
    /* THE WALK CROSSES SHADOW BOUNDARIES. At the top of a shadow tree parentElement is null (the
       parent is a ShadowRoot, a fragment), so a parentElement-only walk silently EXEMPTS every
       shadow-DOM target from the ancestors that actually fade and move it -- bodyIn animates
       <body>, which sits ABOVE the host. For a light-DOM element the hop clause is reached exactly
       once, at <html>, where getRootNode() is the document and .host is undefined. */
    node = node.parentElement || node.getRootNode().host || null;
  }
  return { alpha: alpha, still: moving === null, moving: moving, tf: tf.join(' '), missing: false };
};

/* WHY THIS IS "NOTHING IS IN FLIGHT" AND NOT "TRANSFORM IS IDENTITY".
 *
 * Identity was the first design, and it is what the 42.2 proof appears to ask for -- panelIn's
 * first keyframe is scale(.96), so demanding identity does defeat that specific defect. It was
 * built, and the battery in test/primitive_battery.py refuted it in one run: `cta_contrast` began
 * FAILING ON A CLEAN TREE, timing out with
 *     moving: "button transform=matrix(1, 0, 0, 1, 0, -1)"
 * which is `.mockbtn:hover{transform:translateY(-1px)}` (styles.css:476). Playwright's cursor
 * rests over the CTA it is measuring, so the button sits -- permanently, correctly, at rest --
 * one pixel high. Identity would never arrive, and a guard that hangs on a compliant control is a
 * worse defect than the one it replaced: a false red is loud, a false timeout is a red nobody can
 * act on.
 *
 * "Nothing is in flight" is the predicate that actually separates the two cases. A hover lift has
 * no unfinished animation once its transition completes; a panel parked at its first keyframe has
 * a `running`/`pending` animation the whole time it sits there. Both look like a static
 * non-identity transform to getBoundingClientRect, and only getAnimations() can tell them apart.
 *
 * The transform CHAIN is still compared across the rAF gap (`tf`), so a transform that is quietly
 * changing without an Animation object backing it is caught too. Identity itself is required by
 * nothing.
 */
const restOk = (s, o) => !!(s && s.alpha >= 0.995 && (o.allowMotion || s.still));

/* Element-level: wait until this locator's chain is painted AND unmoving. */
async function waitPainted(locator, ms, opts) {
  const o = opts || {};
  const gone = () => ({ alpha: 0, still: false, moving: '(element detached)' });
  /* THE PROBE RETURNS THE STATE, NEVER null, and `ok` judges it. That is not a style choice:
     pollFor reports its LAST PROBE VALUE in the timeout message, so a probe that returns null on
     "not yet" produces `last=null` -- a timeout that cannot say what was still moving. This guard
     exists to replace a blank red with a named cause; it does not get to be blank itself. */
  return pollFor(
    async () => {
      const a = await locator.evaluate(REST_STATE).catch(gone);
      if (!restOk(a, o)) return a;
      await locator.page().evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const b = await locator.evaluate(REST_STATE).catch(gone);
      /* rAF-separated confirmation: still at rest a frame later, AND the transform chain did not
         move between the two samples. */
      b.confirmed = restOk(b, o) && b.tf === a.tf;
      if (!b.confirmed && restOk(b, o)) b.moving = 'transform chain changed across a frame: ' + a.tf + ' -> ' + b.tf;
      return b;
    },
    (s) => !!(s && s.confirmed),
    ms || ACT_MS,
    'at rest (painted, nothing in flight, unchanged across a frame)');
}

/* Page-level: run `probe` and return its value only once the measured subtree is genuinely at
 * rest. `opts.scope` names the element(s) being measured -- scoping matters, because demanding
 * stillness of the WHOLE document would hang on any unrelated element that legitimately rests
 * under a transform. */
async function atRest(page, probe, arg, opts) {
  const o = (typeof opts === 'string') ? { label: opts } : (opts || {});
  const scope = o.scope ? (Array.isArray(o.scope) ? o.scope : [o.scope]) : [];
  const stillNow = async () => {
    for (const sel of scope) {
      const s = await page.evaluate(REST_STATE, sel).catch(() => null);
      if (!restOk(s, o)) return s || { moving: '(evaluate failed)' };
    }
    return null;                            /* null = nothing is moving */
  };
  /* THE PROBE RETURNS THE STATE, NEVER null -- the same rule waitPainted follows, and for the same
     reason. The first version returned null on "not yet", so pollFor's timeout printed `last=null`
     and the cold verify's paused mutant produced exactly that: a blank diagnostic on the page-level
     entry point while the element-level one named its cause. The catch below recovered it, but a
     recovery is not the same as the probe telling the truth, and the freeze document claimed the
     latter. Now both entry points report state. */
  const out = await pollFor(
    async () => {
      let why = await stillNow();
      if (why) return { ok: false, why: why };
      const a = await page.evaluate(probe, arg);
      await settle(page);                   /* rAF-separated confirmation */
      why = await stillNow();
      if (why) return { ok: false, why: why };
      const b = await page.evaluate(probe, arg);
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        return { ok: false, why: { moving: 'the probe value changed across a frame', a: a, b: b } };
      }
      return { ok: true, value: b };
    },
    (x) => x && x.ok,
    o.ms || ACT_MS,
    (o.label || 'the measured subtree to come to rest') +
      (scope.length ? '  [scope: ' + scope.join(', ') + ']' : ''));
  return out.value;
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
  launchOpts, fileUrl, APP_READY, gotoApp, enterApp, closeIndex, waitIndexOpen, settle, until, pollFor,
  /* the at-rest family: REST_STATE is exported so a check can assert on rest DIRECTLY (and so a
     battery can prove the primitive sees motion) rather than only waiting for it */
  waitPainted, atRest, REST_STATE,
  finish,
};
