/* ===== A SWITCH MUST NOT EAT INPUT =====
 *
 * THE SISTER CHECK TO overlay_deadzone.cjs. Same invariant, one layer further out:
 *
 *     A surface that is being ANIMATED, not INTERACTED WITH, must never consume input.
 *
 * overlay_deadzone guards the layers the APP paints -- the boot splash and the three overlays, the
 * ones it can fix with a class. This guards the layer the BROWSER paints: the View Transition
 * snapshot. Same disease, different layer, and the fix was nothing like the obvious one.
 *
 * WHAT IT CAUGHT, MEASURED at 1440x900 on the pre-fix build.
 * shell.js:55 (pane switch) and topic-protocol.js:199 (topic switch) both ran their DOM swap inside
 * document.startViewTransition(). A view transition CAPTURES A SNAPSHOT, and a browser does not
 * hit-test what it has captured. The UA default captures the ENTIRE DOCUMENT
 * (`view-transition-name:root` on the root element), so for 0-500ms after ANY pane or topic switch,
 * elementsFromPoint over a pane tab returned EXACTLY ["HTML"] -- not the button, not its parents,
 * not even BODY -- while the button was still visible, display:flex, pointer-events:auto. Nothing
 * was covering it. The page was INERT. A real trusted click on a pane tab DID NOTHING.
 *
 * Stacked with the index overlay's own fade-out that is the product's PRIMARY entry action -- pick a
 * topic from the index, then click a pane tab -- and the app ignored the user for over half a second.
 *
 * THE TWO PLAUSIBLE FIXES BOTH FAIL THIS CHECK, WHICH IS THE POINT OF IT.
 *   1. `::view-transition{pointer-events:none}` -- the reflex. It is correct, it survives the build,
 *      the whole pseudo tree really does compute `none`, AND IT CHANGES NOTHING. Measured changing
 *      nothing. The snapshot is not what eats the input; you cannot have a full-page snapshot and a
 *      live page underneath it, because the snapshot IS the page.
 *   2. Scoping the capture to `.stage` -- a real improvement (input revives while the animation still
 *      runs, instead of after it), but still ~150ms dead, because the freeze is the UA taking the
 *      snapshot of an 11.4MB document -- not the app's callback (measured at 0.2ms), not the
 *      animation. No CSS reaches it.
 * A check that only asserted "pointer-events is none" would have gone GREEN on fix 1, which does
 * nothing at all. That is why every assertion here is BEHAVIOURAL.
 *
 * HOW IT MEASURES -- why this one can actually fail. This repo has shipped NINE checks that could not,
 * so the burden is on the check:
 *   - REAL, HIT-TESTED INPUT: page.mouse.click (a genuine CDP event) and page.keyboard.press. An
 *     el.click() bypasses hit-testing entirely and reports success on a provably unclickable button --
 *     precisely how this bug class survives a suite.
 *   - IT ASSERTS THE APP RESPONDED, not that an event fired. Landing on the button is not enough;
 *     the active tab must actually change.
 *   - THE `.pane.on` TRAP: every pane is a DIV, so comparing `.pane.on`.tagName before/after
 *     "detects" a switch that never happened. It cost me a false green while writing this. The
 *     predicate is the active tab's data-tab, and the topic id.
 *   - IT CANNOT PASS BECAUSE NOTHING HAPPENED: it asserts each trigger genuinely changed state
 *     (the topic id / the active tab moved) BEFORE it measures the click. A no-op trigger is a
 *     failure, not a free pass.
 *
 * NEGATIVE CONTROL, OBSERVED, NOT ASSUMED:
 *   pre-fix build (root capture)     -> FAIL 12/30
 *   scoped-capture build (fix 2)     -> FAIL, still eats +0/+16/+60ms clicks
 *   fixed build                      -> PASS 30/30
 *
 * Usage: node test/transition_deadzone.cjs <deliverable.html>   (CHROME=<path> for the browser) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* The delays at which a real user's NEXT input actually arrives. 0 and 16 are the ones that matter:
 * they are inside the snapshot-capture freeze, and they are exactly the clicks the old build ate. */
const DELAYS = [0, 16, 60, 150, 300];

const fails = [];
const notes = [];
function chk(name, ok, detail) {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name + (detail ? ' [' + String(detail).slice(0, 150) + ']' : ''));
}

/* Wrap the REAL API -- never stub it. This is a DIAGNOSTIC, not an assertion: the check does not care
 * HOW the app swaps a pane, only that input survives it. But if input is being eaten and a view
 * transition is in flight, the failure should say so instead of leaving the next person to rediscover
 * it. `active` is true from the call until the transition settles. */
const VT_SPY = () => {
  window.__vt = { calls: 0, active: false };
  const orig = document.startViewTransition;
  if (typeof orig !== 'function') return;
  document.startViewTransition = function (cb) {
    window.__vt.calls++;
    window.__vt.active = true;
    const t = orig.call(this, cb);
    const done = () => { window.__vt.active = false; };
    try {
      /* a transition interrupted by a rapid next one REJECTS .finished ("skipped") -- settle on both */
      if (t && t.finished && typeof t.finished.then === 'function') t.finished.then(done, done);
      else done();
    } catch (e) { done(); }
    return t;
  };
};

/* capture phase = the browser's own hit-test result, not what we hoped would be there */
const RECORDER = () => {
  window.__hit = null;
  document.addEventListener('click', (e) => {
    const t = e.target;
    window.__hit = {
      tag: t.tagName,
      tab: (t.getAttribute && t.getAttribute('data-tab')) || null,
      /* the signature of the bug: the hit collapses to the captured root */
      isRoot: t === document.documentElement || t === document.body,
    };
  }, true);
};

/* THE PREDICATE. Not `.pane.on`.tagName -- every pane is a DIV, so that comparison cannot fail. */
const STATE = () => {
  const b = document.querySelector('.seg button.on');
  const t = window.TopicRegistry && window.TopicRegistry.current();
  return {
    tab: b ? b.getAttribute('data-tab') : null,
    topic: t ? t.id : null,
    vt: !!(window.__vt && window.__vt.active),
    vtCalls: window.__vt ? window.__vt.calls : 0,
  };
};

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(VT_SPY);
  await page.addInitScript(RECORDER);
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await page.waitForFunction(() => !document.getElementById('_bootsplash'), null, { timeout: 20000 }).catch(() => {});
  await B.settle(page);
  return { ctx, page };
}

/* the trigger is resolved IN-PAGE BY NAME -- never shipped across as source and rebuilt with
 * new Function(), the same rule overlay_deadzone.cjs follows */
const FIRE = (kind) => {
  if (kind === 'topic') window.stepTopic(1);
  else document.querySelector('.seg button[data-tab="walk"]').click();
};

/* WAIT FOR A CONDITION, NEVER FOR A DURATION -- the rule _boot.cjs opens with, and the one I broke
 * on the first cut of this file. The DELAYS above are the experiment (they decide WHEN the input is
 * dispatched, so they must stay durations). Everything else -- "is the app ready", "did it respond"
 * -- was a waitForTimeout(600..800), i.e. a bet that this machine is as fast today as it was when I
 * typed the number. It is not: this check passed alone and then FLAKED inside the full gate, where
 * an 11.4MB app competes with 30 other checks. A flaky red is worse than no check, because it
 * teaches the team that red means "run it again" -- and that reflex is how a compiler bug destroyed
 * 608 authored items per build while this gate sat green.
 * So: poll for the state we expect, with a cap that is generous against any plausible response
 * (the app normally answers in <100ms) but bounded, so a GENUINE failure still fails fast enough to
 * keep the negative control cheap. SLOW takes longer; BROKEN still goes red. */
const SETTLE_MS = 8000;
async function reaches(page, fn, arg, ms) {
  try { await page.waitForFunction(fn, arg, { timeout: ms || SETTLE_MS }); return true; }
  catch (e) { return false; }
}
const TAB_IS = (t) => {
  const b = document.querySelector('.seg button.on');
  return !!b && b.getAttribute('data-tab') === t;
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  let vtSeen = 0;
  const shifts = [];   /* layout shifts observed under the cursor -- a DIFFERENT bug, reported not hidden */

  /* ============ 1. THE TWO TRANSITION TRIGGERS ============ */
  const TRIGGERS = [
    { name: 'topic switch (])', kind: 'topic' },
    { name: 'pane switch (tab click)', kind: 'pane' },
  ];
  const TARGET = 'drill';   /* never the tab a trigger itself selects, so "it responded" is unambiguous */

  for (const trig of TRIGGERS) {
    const { ctx, page } = await boot(browser);

    for (const delay of DELAYS) {
      const tag = '[' + trig.name + ' +' + delay + 'ms] ';
      /* park on a known tab that is NOT the target, so reaching TARGET is always a real change */
      await page.evaluate(() => { const b = document.querySelector('.seg button[data-tab="sys"]'); if (b) b.click(); });
      const parked = await reaches(page, TAB_IS, 'sys');
      if (!parked) { chk(tag + 'the app parks on the sys tab before the experiment', false, 'it never got there'); continue; }

      await page.evaluate(() => { window.__hit = null; });
      const box0 = await page.locator('.seg button[data-tab="' + TARGET + '"]').boundingBox();
      if (!box0) { chk(tag + 'the ' + TARGET + ' tab is on screen to be clicked', false, 'it has no box'); continue; }

      const before = await page.evaluate(STATE);
      await page.evaluate(FIRE, trig.kind);
      const mid = await page.evaluate(STATE);           /* sampled BEFORE the delay and the click */
      if (mid.vt) vtSeen++;

      /* ANTI-VACUITY: if the trigger did nothing, there is no transition to survive, and every
         assertion below would pass for free. That is the exact shape of a check that cannot fail. */
      const fired = trig.kind === 'topic' ? (mid.topic !== before.topic) : (mid.tab !== before.tab);
      chk(tag + 'the switch under test actually HAPPENED',
        fired,
        trig.kind === 'topic'
          ? ('the topic never changed from "' + before.topic + '" -- nothing was transitioning, so this' +
             ' sample proves nothing')
          : ('the active tab never changed from "' + before.tab + '" -- nothing was transitioning'));
      if (!fired) continue;

      if (delay) await page.waitForTimeout(delay);

      /* AIM AT THE TAB, NOT AT WHERE IT USED TO BE. This check's invariant is "no layer consumes the
         input", so it must click the target's LIVE position -- and it costs the check nothing, because
         a click that IS eaten lands on the eating layer no matter where it was aimed (the pre-fix
         build fails these assertions with `landed on HTML` at every coordinate).
         Aiming at a STALE box conflates this bug with a completely different one, which is exactly
         what it did on first run: the topic switch moves the tabs DOWN 23px, permanently, because
         `.hdr h1` wraps to a second line on a longer topic title ("Content Pipeline" 23px ->
         "Microfrontend Architecture" 46px), so the stale click landed in the gutter between buttons
         and this check went red for a reason that has nothing to do with a zombie layer. That layout
         shift is REAL and still unfixed -- it is reported below, not silently absorbed. */
      const box = await page.locator('.seg button[data-tab="' + TARGET + '"]').boundingBox() || box0;
      const moved = Math.round(Math.abs(box.y - box0.y) + Math.abs(box.x - box0.x));
      if (moved > 2) shifts.push(tag.trim() + ' the ' + TARGET + ' tab moved ' + moved + 'px under the cursor');

      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

      /* poll for the outcome instead of sleeping at it. An EATEN click still resolves fast (it lands
         on the wrong target and the tab simply never changes), so the cap is only ever paid on a
         genuine failure -- and it is paid honestly, not hidden behind a sleep that was long enough
         on the day it was written. */
      await reaches(page, () => window.__hit !== null, null, 2000);
      await reaches(page, TAB_IS, TARGET);
      const hit = await page.evaluate(() => window.__hit);
      const after = await page.evaluate(STATE);
      const blame = mid.vt ? ' (a view transition was in flight: it captures a snapshot, and the browser' +
        ' does not hit-test what it has captured -- see view-transitions.js)' : '';

      chk(tag + 'a REAL click REACHES the ' + TARGET + ' tab',
        !!hit && hit.tab === TARGET,
        hit ? ('it landed on <' + hit.tag + '>' + (hit.isRoot ? ' -- THE CAPTURED ROOT: the page is inert' : '') + blame)
            : ('it reached NOTHING' + blame));

      chk(tag + '...and the app RESPONDED (the active tab is now ' + TARGET + ')',
        after.tab === TARGET,
        'the active tab is still "' + after.tab + '" -- the click was absorbed by the switch' + blame);
    }

    /* a REAL KEYSTROKE in the same window */
    await page.evaluate(() => { const b = document.querySelector('.seg button[data-tab="walk"]'); if (b) b.click(); });
    await reaches(page, TAB_IS, 'walk');
    await page.evaluate(FIRE, trig.kind);
    const midK = await page.evaluate(STATE);
    if (midK.vt) vtSeen++;
    await page.keyboard.press('r');                     /* r = the System Map pane */
    await reaches(page, TAB_IS, 'sys');
    const afterK = await page.evaluate(STATE);
    chk('[' + trig.name + '] a REAL keystroke during the switch is not swallowed',
      afterK.tab === 'sys', 'the active tab is still "' + afterK.tab + '" -- the key was eaten');

    /* Corroborate with the browser's own hit-test. Sampled from a LATER TASK: at the synchronous
       instant of the call the UA may still be mid-snapshot, and no user input can be delivered inside
       that sub-frame gap -- asserting on it would be measuring the instrument, not the app. */
    const eaten = await page.evaluate((kind) => new Promise((res) => {
      const el = document.querySelector('.seg button[data-tab="drill"]');
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      const out = [];
      const snap = (dt) => {
        const top = document.elementFromPoint(cx, cy);
        if (top === document.documentElement || top === document.body || top === null) {
          out.push('+' + dt + 'ms the hit-test collapsed to <' + (top ? top.tagName : 'null') + '>');
        }
      };
      if (kind === 'topic') window.stepTopic(1);
      else document.querySelector('.seg button[data-tab="walk"]').click();
      [16, 60, 150, 300, 450].forEach((dt) => setTimeout(() => snap(dt), dt));
      setTimeout(() => res(out), 520);
    }), trig.kind);
    chk('[' + trig.name + '] elementFromPoint over a tab never collapses to the captured root',
      eaten.length === 0, eaten.join(', '));

    await ctx.close();
  }

  /* ============ 2. THE STACKED PATH -- the product's PRIMARY entry action ============ */
  /* Pick a topic from the index overlay, then immediately click a pane tab. This stacks BOTH layers:
     the overlay's 220ms fade-out AND the topic switch it kicks off. It is the exact sequence the user
     performs on their way into the app, and it was dead for ~500-700ms. */
  {
    const { ctx, page } = await boot(browser);
    await page.evaluate(() => { const b = document.querySelector('.seg button[data-tab="sys"]'); if (b) b.click(); });
    await reaches(page, TAB_IS, 'sys');

    await page.evaluate(() => window.IndexOverlay.open());
    await B.settle(page);
    await page.waitForFunction(() => !!document.querySelector('.ix-ov.open .ix-card[data-topic]'), null, { timeout: 10000 });

    /* a topic that is NOT the current one -- setTopic() no-ops on the current id, which would leave
       nothing to transition and quietly turn this arm into decoration */
    const picked = await page.evaluate(() => {
      const cur = window.TopicRegistry.current().id;
      const card = Array.from(document.querySelectorAll('.ix-ov.open .ix-card[data-topic]'))
        .find((c) => c.getAttribute('data-topic') !== cur);
      if (!card) return null;
      const id = card.getAttribute('data-topic');
      card.click();                      /* dismiss the overlay AND start the topic switch, together */
      return id;
    });
    chk('[stacked] the index offers a topic other than the current one to pick',
      !!picked, 'no other topic card rendered; the stacked arm measured NOTHING');

    if (picked) {
      const mid = await page.evaluate(STATE);
      if (mid.vt) vtSeen++;
      await page.evaluate(() => { window.__hit = null; });
      const box = await page.locator('.seg button[data-tab="drill"]').boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);   /* IMMEDIATELY */
      await reaches(page, () => window.__hit !== null, null, 2000);
      await reaches(page, TAB_IS, 'drill');
      const hit = await page.evaluate(() => window.__hit);
      const after = await page.evaluate(STATE);

      chk('[stacked] pick a topic from the index, then IMMEDIATELY click a pane tab: the click lands',
        !!hit && hit.tab === 'drill',
        hit ? ('it landed on <' + hit.tag + '>' + (hit.isRoot ? ' -- the captured root' : '') +
          ' -- the overlay fade-out and/or the topic switch ate it') : 'it reached NOTHING');
      chk('[stacked] ...and the app RESPONDED (the topic changed AND the drill pane opened)',
        after.tab === 'drill' && after.topic === picked,
        'topic=' + after.topic + ' (wanted ' + picked + '), active tab=' + after.tab + ' (wanted drill)');
    }
    await ctx.close();
  }

  /* ============ 3. THE HARNESS ITSELF MUST NOT LIE ============ */
  /* _boot.cjs::enterApp() used to return while the overlay still carried `open` -- INSIDE the window
     in which the app still considered a dismissed dialog present. shell.js's keymap bailed on that
     class, so every check that closed the overlay and immediately pressed a key was driving a
     switched-off keyboard, and "key X does not leak" went GREEN FOR THE WRONG REASON.
     enterApp() waits for the real end state now. This is the tripwire that keeps it honest.

     WHY IT PINS THE CLASS INSTEAD OF RACING THE APP'S OWN 220ms TIMER. The obvious version of this
     assertion -- close the overlay, call closeIndex(), read the class -- is a COIN FLIP, and I shipped
     it that way first and watched it pass on the broken helper. closeIndex() costs several CDP round
     trips on an 11.4MB page; when they happen to exceed 220ms the class is already gone and the buggy
     helper looks correct. That is exactly the timing luck the audit describes ("my v1 passed on timing
     luck, my v2 was faster and walked straight into it") -- and a flaky red is worse than no check at
     all, because it teaches the team that red means "run it again".
     So: hold the dialog open for a DETERMINISTIC 3s and ask the helper what it does. A helper that
     keys on the app's isOpen() boolean returns immediately, into a dialog that is provably still open.
     A helper that keys on the DOM waits. The margin is 3s against ~100ms of round trips -- it cannot
     flip. This is a negative control welded into the check. */
  {
    const { ctx, page } = await boot(browser);
    await page.evaluate(() => window.IndexOverlay.open());
    /* `vis` is added on the rAF after `open` -- so this is the overlay telling us it is fully up,
       rather than us guessing that 120ms was enough */
    await reaches(page, () => !!document.querySelector('.ix-ov.open.vis'), null, 10000);
    await B.settle(page);

    await page.evaluate(() => {
      const ov = document.querySelector('.ix-ov');
      window.IndexOverlay.close();          /* isOpen() flips false NOW; the app drops .open at +220ms */

      /* HOLD THE ZOMBIE OPEN FOR 3s, WITH NO OBSERVABLE GAP.
         The first cut of this pin re-added `open` on a setInterval(10ms) -- and that is a RACE, not a
         control: the app removes the class at exactly +220ms, so there was a 0-10ms hole before the
         pin restored it, and Playwright's rAF-paced polling dropped straight into that hole. The
         CORRECT helper then saw "no dialog open", returned at ~250ms, and this assertion failed and
         blamed the helper. My instrument was the bug -- 3 gate reds, all of them mine.
         A MutationObserver callback runs as a MICROTASK, at the end of the very task that removed the
         class -- before any rAF, timer or poll can run. So the class is restored before anything can
         observe it missing. Race-free, not merely fast. */
      const mo = new MutationObserver(() => {
        if (!ov.classList.contains('open')) ov.classList.add('open');
      });
      mo.observe(ov, { attributes: true, attributeFilter: ['class'] });
      setTimeout(() => { mo.disconnect(); ov.classList.remove('open'); }, 3000);
    });

    const t0 = Date.now();
    await B.closeIndex(page);
    const waited = Date.now() - t0;
    const zombie = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"].open');
      return d ? (d.id || d.className) : null;
    });
    /* THE CONTROL MUST BE ARMED. If the pin above ever stops holding, the dialog closes on its own and
       `zombie === null` passes FOR THE WRONG REASON -- a check that cannot fail, in the check written
       to catch checks that cannot fail. So assert the helper actually BLOCKED on the pinned dialog:
       a helper that keys on isOpen() returns in ~250ms; one that keys on the DOM waits out the 3s. */
    chk('[harness] the 3s zombie pin is actually holding (this control is armed, not decorative)',
      waited > 2500,
      'closeIndex() returned after only ' + waited + 'ms -- either the pin failed to hold the dialog open,' +
      ' in which case the assertion below proves nothing, or the helper never blocked on the DOM at all');

    chk('[harness] _boot.closeIndex() returns only once NO dialog is still open',
      zombie === null,
      'it returned after ' + waited + 'ms with "' + zombie + '" still carrying .open, because it waits on' +
      ' IndexOverlay.isOpen() -- a boolean that flips 220ms before the DOM does. Every check that presses' +
      ' a key next is driving an app that still believes a modal is up.');
    await ctx.close();
  }

  await browser.close();

  notes.forEach((n) => console.log(n));

  /* A SEPARATE, REAL DEFECT THIS CHECK KEEPS TRIPPING OVER -- surfaced, not swallowed.
     It is NOT a deadzone: the click reaches the tab, because this check aims at the tab. But a USER
     aims where the tab WAS, and it is no longer there. Both bugs read identically from the outside
     ("I clicked and nothing happened"), which is exactly why it is called out by name instead of
     being quietly absorbed by a stale-coordinate fudge.
     Cause, measured: a topic switch rewrites `.hdr h1`, and a title that wraps to a second line grows
     it 23px ("Content Pipeline" 23px -> "Microfrontend Architecture" 46px), pushing `.seg` -- the pane
     tabs -- 23px down. Permanent, not transient. The fix is a design call (reserve the second line, or
     clamp the title), in the sidebar, and it belongs to whoever owns `.hdr`. */
  if (shifts.length) {
    console.log('  NOTE  LAYOUT SHIFT (a different bug, still open -- the deadzone assertions above aim at');
    console.log('        the tab\'s live position, so they do not mask it):');
    shifts.slice(0, 4).forEach((s) => console.log('          ' + s));
    console.log('        cause: `.hdr h1` wraps to a 2nd line on a longer topic title (+23px), pushing the');
    console.log('        pane tabs down. A user clicking where the tab WAS misses it. Owner: the sidebar.');
  }

  /* Not an assertion -- a signpost. The check asserts BEHAVIOUR, so a view transition is allowed to
     exist if it genuinely stops eating input. But on this deliverable it never has, so if one is back,
     say so plainly rather than let the next person rediscover it from first principles. */
  if (vtSeen) {
    console.log('  NOTE  document.startViewTransition() is in use again (' + vtSeen + ' live windows seen).' +
      ' On this 11.4MB deliverable the UA snapshot froze pointer input for ~150ms even with the capture' +
      ' scoped to .stage. If the assertions above still pass, it has been made cheap -- otherwise, see' +
      ' the phase timings in view-transitions.js.');
  }
  if (fails.length) {
    fails.forEach((f) => console.log('  - ' + f));
    /* the gate reports a check by its LAST LINE -- the verdict must be last */
    return B.finish(1, 'TRANSITION DEADZONE: FAIL  (' + fails.length + ' of ' + notes.length + ' assertions)');
  }
  console.log('TRANSITION DEADZONE: PASS  (' + notes.length +
    ' assertions: real clicks and keys land throughout every pane and topic switch, including straight' +
    ' out of the index overlay; the hit-test never collapses to the captured root; and every switch' +
    ' under test provably happened)');
  return B.finish(0, null);
})();
