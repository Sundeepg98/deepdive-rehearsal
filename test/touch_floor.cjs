#!/usr/bin/env node
/*
 * TOUCH TARGETS (W2 / audit P3-5) -- the app's own 44px floor, applied where it was not.
 *
 * TWO DIFFERENT CLAIMS, MEASURED SEPARATELY, because conflating them is how the finding was
 * nearly mis-triaged:
 *
 *   44px  is THIS APP'S floor. It is not a WCAG number -- it is the promise styles.css makes in
 *         three separate places ("44px is the a11y floor ... a physical-finger constant"), and
 *         which .tools-fab, .nd-m, .crambtn, .tn-step, #_focus-toggle and the mobile seg buttons
 *         all keep. Controls that quietly missed it: every Numbers assumption input (136.2x40,
 *         ~25 of them across six topics, because num/logic.js set padding and never a floor) and
 *         the cram sheet's close button (32 WIDE -- the <=919px `button{min-height:44px}` rule is
 *         height-only, so a control short in the OTHER axis walks straight through it).
 *
 *   24px  is WCAG 2.5.8 AA, the level below which a target is a conformance FAILURE rather than a
 *         comfort miss. Two controls were genuinely under it: the kafka viz range slider (140x16 --
 *         a bare input[type=range] is 16px tall, and it is the only pointer control in the sim) and
 *         the home screen's "Skip the home" label strip (272x18, sitting inside a row that already
 *         reserved 44px for it).
 *
 * THE MEASUREMENT TRAP THIS CHECK EXISTS TO AVOID -- and it caught one. #scrolltop was filed at
 * 39.6x39.6. It is not: the rule says width/height:var(--space-44) and the button is 44x44 when
 * shown. 39.6 is 44 x 0.9, and .scrolltop's RESTING (hidden) state carries transform:scale(.9) --
 * so the finding measured the fade-out transform, not the control. A getBoundingClientRect on a
 * transformed element returns the TRANSFORMED box. So this check drives the button to its real
 * .show state before reading it, and asserts it there. A check that measured it at rest would
 * have "confirmed" a defect that does not exist and then "fixed" a control that was already
 * compliant -- which is worse than missing it, because the repo would carry a false receipt.
 *
 * Every target is read at a PINNED, ASSERTED viewport from computed layout -- no screenshots, no
 * wall clock. Shadow boundaries are crossed explicitly (Numbers and the viz both live in one).
 *
 * SELF-TEST: the 44px arm is re-armed every run against a planted shrunken control and aborts if
 * it does not fire, so an assertion whose selector has rotted cannot report green.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/touch_floor.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const APP_FLOOR = 44;   /* the app's own promise */
const AA_FLOOR = 24;    /* WCAG 2.5.8 AA */

async function pinViewport(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await B.settle(page);
  const real = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  if (real.w !== w || real.h !== h) throw new Error('viewport assert failed: asked ' + w + 'x' + h + ', got ' + real.w + 'x' + real.h);
}

/* ===== MEASURE AT REST, NOT MID-FLIGHT =====
 * getBoundingClientRect on a TRANSFORMED element returns the transformed box, and three of the
 * targets here arrive under a transform that is still running two rAFs after their state flips:
 * the cram panel opens with a scale-up (panelIn), and #scrolltop reveals with a 500ms
 * `transform` transition off scale(.9). A single post-settle sample read 43.2x43.2 for a 44px
 * button and 39.6x39.6 for a 44px FAB -- both of them the animation, none of them the control.
 *
 * That is not a hypothetical failure mode here: 39.6 is the exact number the audit filed
 * #scrolltop at, and this is how it got there. A touch-target check that samples during motion
 * manufactures failures for compliant controls and would have had this wave "fix" a button that
 * was never broken.
 *
 * THIS FILE USED TO OWN THAT GUARD, AND ITS GUARD WAS INVERTED. It polled until two consecutive
 * reads AGREED -- and agreement is EASIEST before an animation starts. Measured at ~20% false red
 * (18/90 pooled across two authors and two scratch volumes), every one of them the byte-identical
 * {"w":42.2,"h":42.2}: 44 x 0.96, which is panelIn's LITERAL first keyframe. The check was not
 * catching the animation in motion, it was catching it before it moved.
 *
 * The rest condition now lives in _boot.cjs as B.atRest, shared with cta_contrast and
 * dock_contrast. It requires that NOTHING IS IN FLIGHT -- no unfinished animation or transition up
 * the chain, via getAnimations() -- as well as full alpha and rAF-separated confirmation. It does
 * NOT require the transform to be identity: that was the first design, and it hung on a resting
 * hover lift. See the long comment there for why "two reads agree" was the wrong predicate rather
 * than a mistuned one. Each call below names the element it measures as `scope`, because stillness
 * is a question about the thing being measured, not about the whole document. */

(async () => {
  const fails = [], errs = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await B.gotoApp(page, HTML, { hash: '#content-pipeline/walk' });
  await B.enterApp(page);
  await pinViewport(page, 390, 844);

  /* ---- 1. THE NUMBERS INPUTS -- the systematic one (~25 controls, 6 topics) ---- */
  await page.evaluate(() => { location.hash = '#content-pipeline/num'; });
  await page.waitForFunction(() => { const h = document.querySelector('#num deep-numbers'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('.ninp input')); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const ninp = await page.evaluate(() => {
    const h = document.querySelector('#num deep-numbers'), r = h && h.shadowRoot;
    const all = r ? [...r.querySelectorAll('.ninp input')] : [];
    const hs = all.map((e) => +e.getBoundingClientRect().height.toFixed(1));
    return { count: all.length, min: hs.length ? Math.min(...hs) : null, heights: hs.slice(0, 6) };
  });
  ok('every Numbers assumption input clears the app\'s own 44px floor (was 40 on all of them: padding, no min-height)',
    ninp.count > 0 && ninp.min >= APP_FLOOR, JSON.stringify(ninp));
  ok('the Numbers inputs were actually FOUND (a zero-target pass is not a pass)', ninp.count > 0, JSON.stringify(ninp));

  /* ---- 2. THE CRAM SHEET'S CLOSE BUTTON -- 32 WIDE, in the axis the height-only floor misses ---- */
  await page.evaluate(() => { const b = document.getElementById('cramopen'); if (b) b.click(); });
  await page.waitForFunction(() => !!document.querySelector('.cram-ov.open'), null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const cramX = await B.atRest(page, () => {
    const x = document.getElementById('cramx');
    if (!x) return { missing: true };
    const r = x.getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  }, null, { scope: '#cramx', label: 'the cram close button to stop scaling (panelIn)' });
  ok('the cram sheet\'s close button clears 44px in BOTH axes (it was 32 wide -- the height-only floor could not see it)',
    !cramX.missing && cramX.w >= APP_FLOOR && cramX.h >= APP_FLOOR, JSON.stringify(cramX));

  /* The jump strip is this wave's new control surface on the same panel -- hold it to the same
     floor rather than exempting the thing we just added (36px chips + the strip's own padding). */
  /* The strip is built from <deep-cram>'s LAZILY rendered sections, so it legitimately arrives a
     few frames after the panel does -- poll for it rather than sampling once (that single sample
     is how this first read 0 chips against a strip that populates correctly). */
  const jump = await B.atRest(page, () => {
    const s = document.getElementById('cramjump');
    if (!s) return { missing: true };
    const btns = [...s.querySelectorAll('button')];
    const hs = btns.map((b) => +b.getBoundingClientRect().height.toFixed(1));
    return { count: btns.length, min: hs.length ? Math.min(...hs) : null, stripH: +s.getBoundingClientRect().height.toFixed(1) };
  }, null, { scope: '#cramjump', label: 'the cram jump strip to populate and settle' });
  /* THE APP FLOOR, NOT THE AA FLOOR. This assertion read AA_FLOOR for one revision while its own
     comment said "hold it to the same floor" -- prose one floor above the assertion, which is the
     shape of a check that quietly grades on a curve. Both now say 44: this strip is a control
     surface the wave ADDED, and the wave's own rule is that a new control does not get a softer
     floor than the ones it is raising. */
  ok('the cram jump strip rendered chips, and every chip clears the app\'s own 44px floor -- a control this wave added does not get a softer floor than the ones it raised',
    !jump.missing && jump.count >= 2 && jump.min >= APP_FLOOR, JSON.stringify(jump));
  await page.evaluate(() => { const b = document.getElementById('cramx'); if (b) b.click(); });
  await page.waitForFunction(() => !document.querySelector('.cram-ov.open'), null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);

  /* ---- 3. #scrolltop, MEASURED IN THE STATE A FINGER MEETS IT ----
     Read at rest it is 39.6 (44 x the .9 fade-out scale). Drive it to .show and read the real box. */
  await page.evaluate(() => { location.hash = '#content-pipeline/drill'; });
  await B.settle(page);
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForFunction(() => { const b = document.getElementById('scrolltop'); return !!(b && b.classList.contains('show')); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const st = await B.atRest(page, () => {
    const b = document.getElementById('scrolltop');
    if (!b) return { missing: true };
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    return { shown: b.classList.contains('show'), w: +r.width.toFixed(1), h: +r.height.toFixed(1), vis: cs.visibility, transform: cs.transform };
  }, null, { scope: '#scrolltop', label: 'the scroll-top FAB to finish its 500ms reveal transition' });
  ok('#scrolltop clears 44px in the state a finger meets it (its 39.6 filing measured the hidden state\'s scale(.9))',
    !st.missing && st.shown === true && st.w >= APP_FLOOR && st.h >= APP_FLOOR, JSON.stringify(st));
  await page.evaluate(() => window.scrollTo(0, 0));
  await B.settle(page);

  /* ---- 4. THE KAFKA VIZ RANGE -- a genuine WCAG 2.5.8 AA failure at 140x16 ---- */
  await page.evaluate(() => { location.hash = '#kafka-internals/viz'; });
  await page.waitForFunction(() => { const h = document.querySelector('#viz deep-visual'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('input[type=range]')); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const vz = await page.evaluate(() => {
    const h = document.querySelector('#viz deep-visual'), r = h && h.shadowRoot;
    const ins = r ? [...r.querySelectorAll('input[type=range]')] : [];
    const hs = ins.map((e) => +e.getBoundingClientRect().height.toFixed(1));
    return { count: ins.length, min: hs.length ? Math.min(...hs) : null, heights: hs.slice(0, 4) };
  });
  ok('the kafka viz range slider clears WCAG 2.5.8 AA (24px) -- it was a bare 16px UA range, the sim\'s only pointer control',
    vz.count > 0 && vz.min >= AA_FLOOR, JSON.stringify(vz));
  ok('the viz range was actually FOUND (the pane is conditional -- a skipped target must not read as a pass)',
    vz.count > 0, JSON.stringify(vz));

  /* ---- 5. THE HOME "SKIP THE HOME" LABEL -- 272x18 inside a row that already reserved 44 ---- */
  await page.evaluate(() => { location.hash = '#home'; });
  await page.waitForFunction(() => !!document.querySelector('.hm-skip label'), null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const skip = await page.evaluate(() => {
    const l = document.querySelector('.hm-skip label');
    if (!l) return { missing: true };
    l.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = l.getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  });
  ok('the home "Skip the home" label clears WCAG 2.5.8 AA (it was an 18px text line inside a 44px row)',
    !skip.missing && skip.h >= AA_FLOOR, JSON.stringify(skip));

  /* ---- 6. THE WEEKLY-GOAL STEPPER -- 20x20, ON THE FIRST-RUN HOME OF EVERY NEW USER ----
     The same class as the cram close button above: `.ix-goal-b` set width AND height explicitly to
     var(--space-20), so the <=919px `button{min-height:44px}` floor reached the height and the
     explicit width walked straight through it -- 20x20 at 1280, 20x44 here. Under WCAG 2.5.8 AA in
     one axis and under this app's own 44px promise in both.
     WHY IT IS THIS WAVE'S TO FIX EVEN THOUGH THE GEOMETRY IS BYTE-IDENTICAL TO master 2696291: the
     REACH changed. W1.5 cycles 2-3 hoisted goalStrip() out of telemetryHtml()'s engaged() gate and
     deleted duoHtml()'s own engaged() early return, so the strip now renders for EVERY record class
     at every viewport -- including the COLD home, where it did not exist at all before. This arm is
     therefore driven on a COLD record: no seed, nothing in localStorage, which is the first screen
     of a brand-new user.
     THREE THINGS, because the box alone is not the target:
       (a) both buttons clear 44 in BOTH axes;
       (b) their hit areas do not OVERLAP -- 44px boxes 8px apart would, and a finger aimed at `-`
           would land on `+`. This is the reason the box is the BUTTON and not a 44px pseudo-element
           behind a 20px chip, which would paint identically and measure the same on the finger;
       (c) the floor survives a DENSITY change. The fix spells 44 in raw px rather than
           var(--space-44) precisely because the space scale is re-valued per density -- the token
           is 36px under html[data-density=compact] -- and `d` is an advertised shortcut, so
           "compact" is one keypress from every reader. A token here would have shipped an 8px
           regression that only a reader who changed density could feel. */
  const goalBox = async () => page.evaluate(() => {
    const bs = [...document.querySelectorAll('#home [data-goal]')];
    const boxes = bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { d: b.getAttribute('data-goal'), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        l: +r.left.toFixed(1), rt: +r.right.toFixed(1) };
    });
    let overlap = 0;
    for (let i = 1; i < boxes.length; i++) {
      if (boxes[i].l < boxes[i - 1].rt) overlap = +(boxes[i - 1].rt - boxes[i].l).toFixed(1);
    }
    return { count: boxes.length, boxes, overlap,
      min: boxes.length ? Math.min(...boxes.map((b) => Math.min(b.w, b.h))) : null,
      density: document.documentElement.dataset.density || 'default' };
  });
  await page.waitForFunction(() => !!document.querySelector('#home [data-goal]'), null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const goal = await goalBox();
  ok('the weekly-goal stepper clears the app\'s own 44px floor in BOTH axes on a COLD home (it was 20x44 here and 20x20 at 1280 -- the height-only floor could not see the width)',
    goal.count === 2 && goal.min >= APP_FLOOR, JSON.stringify(goal));
  ok('the two stepper targets do not overlap (44px hit areas 8px apart would, and a finger aimed at "-" would land on "+")',
    goal.count === 2 && goal.overlap === 0, JSON.stringify(goal));
  await page.evaluate(() => { if (window.Density && window.Density.cycle) window.Density.cycle(); });
  await B.settle(page);
  const goalC = await goalBox();
  ok('...and it still clears 44px at COMPACT density, where var(--space-44) resolves to 36 (the floor is a finger, not a spacing token)',
    goalC.density === 'compact' && goalC.count === 2 && goalC.min >= APP_FLOOR, JSON.stringify(goalC));

  /* THE PLANT for this arm: put the 20px box back and require the measurement to notice. */
  const goalPlant = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('#home [data-goal]')];
    if (bs.length !== 2) return { ran: false };
    const prev = bs.map((b) => ({ w: b.style.width, h: b.style.height }));
    bs.forEach((b) => { b.style.width = '20px'; b.style.height = '20px'; });
    const min = Math.min(...bs.map((b) => {
      const r = b.getBoundingClientRect(); return Math.min(r.width, r.height);
    }));
    bs.forEach((b, i) => { b.style.width = prev[i].w; b.style.height = prev[i].h; });
    return { ran: true, minUnderPlant: +min.toFixed(1) };
  });
  if (!(goalPlant.ran && goalPlant.minUnderPlant < APP_FLOOR)) {
    console.log('  ABORT restoring the stepper to its 20px box did NOT drop the measured minimum below 44 -- the goal arm is not reading these controls.');
    console.log('     -> ' + JSON.stringify(goalPlant));
    await browser.close();
    return B.finish(1, 'TOUCH FLOOR: ABORTED (self-test failed: the goal-stepper arm cannot fail)');
  }
  ok('[plant] restoring the stepper\'s 20px box is detected by the 44px arm', true, '');
  /* PUT THE DENSITY BACK, AND ASSERT IT. Everything below this line measures at the default scale;
     an arm that silently ran at compact would be measuring a different app than its message says.
     compact -> cozy -> default is two more cycles. */
  const restored = await page.evaluate(() => {
    if (window.Density && window.Density.cycle) { window.Density.cycle(); window.Density.cycle(); }
    return document.documentElement.dataset.density || 'default';
  });
  await B.settle(page);
  ok('the density is back to default before the remaining arms measure (they are not compact-scale assertions)',
    restored === 'default', 'density is ' + restored);

  /* ---- THE AA PLANT ----
     The 44px arm has carried a plant since it was written; the 24px arm did not, and this header
     disclosed the gap. Both AA targets are additionally proven red on the base build, so the arm
     was never incapable of failing -- but a disclosure is not a control, and closing this one costs
     ten lines. It reverts the wave's own fix (align-self:stretch) on the label and requires the
     measured height to fall back under the AA floor. */
  const aaPlant = await page.evaluate(() => {
    const l = document.querySelector('.hm-skip label');
    if (!l) return { ran: false };
    const prev = { a: l.style.alignSelf, m: l.style.minHeight, d: l.style.display };
    l.style.alignSelf = 'center'; l.style.minHeight = '0px'; l.style.display = 'inline';
    const h = l.getBoundingClientRect().height;
    l.style.alignSelf = prev.a; l.style.minHeight = prev.m; l.style.display = prev.d;
    return { ran: true, hUnderPlant: +h.toFixed(1) };
  });
  if (!(aaPlant.ran && aaPlant.hUnderPlant < AA_FLOOR)) {
    console.log('  ABORT reverting the skip-label fix did NOT drop it under the 24px AA floor -- the AA arm is not reading this control.');
    console.log('     -> ' + JSON.stringify(aaPlant));
    await browser.close();
    return B.finish(1, 'TOUCH FLOOR: ABORTED (self-test failed: the AA arm cannot fail)');
  }
  ok('[plant] reverting the skip-label fix drops it back under the 24px AA floor (the AA arm is live too)', true, '');

  /* ---- THE PLANT: shrink a control and require the 44px arm to notice ---- */
  await page.evaluate(() => { location.hash = '#content-pipeline/num'; });
  await page.waitForFunction(() => { const h = document.querySelector('#num deep-numbers'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('.ninp input')); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const plant = await page.evaluate(() => {
    const h = document.querySelector('#num deep-numbers'), r = h && h.shadowRoot;
    const first = r && r.querySelector('.ninp input');
    if (!first) return { ran: false };
    const prev = first.style.minHeight, prevH = first.style.height;
    first.style.minHeight = '0px'; first.style.height = '20px';
    const all = [...r.querySelectorAll('.ninp input')].map((e) => e.getBoundingClientRect().height);
    const min = Math.min(...all);
    first.style.minHeight = prev; first.style.height = prevH;
    return { ran: true, minUnderPlant: +min.toFixed(1) };
  });
  if (!(plant.ran && plant.minUnderPlant < APP_FLOOR)) {
    console.log('  ABORT a deliberately shrunken input did NOT drop the measured minimum below 44 -- the probe is not reading these controls.');
    console.log('     -> ' + JSON.stringify(plant));
    await browser.close();
    return B.finish(1, 'TOUCH FLOOR: ABORTED (self-test failed: the check cannot fail)');
  }
  ok('[plant] shrinking one input to 20px is detected by the 44px arm (the measurement is live, not a constant)', true, '');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('TOUCH FLOOR: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  return B.finish(pass ? 0 : 1);
})().catch(async (e) => {
  console.log('TOUCH FLOOR: FAIL (harness error: ' + (e && e.message) + ')');
  return B.finish(1);
});
