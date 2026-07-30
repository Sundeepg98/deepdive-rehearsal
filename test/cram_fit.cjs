#!/usr/bin/env node
/*
 * THE CRAM SHEET'S FIRST OPEN IS WHOLE AND STILL (cross-browser audit X8 + X5)
 *
 * Two defects on one surface, both invisible to every other check in the gate, and both found by
 * driving engines the gate does not run. Neither is a WebKit bug: X8 reproduces byte-identically
 * in Chromium, and X5's mechanism is identical in Chromium -- WebKit only makes it expensive.
 * So both are asserted HERE, in the gate's own engine, where they can actually hold the line.
 *
 * ---- ARM 1: THE PANEL FITS THE SPACE IT IS GIVEN (X8) ----
 * The <=919px override said `max-height:100vh` while .cram-ov keeps an 18px inset on every side,
 * so the panel was handed the whole viewport inside a box inset from it and hung 18px below the
 * fold in both orientations (measured 390x844: panel [18, 862] against innerHeight 844). The
 * desktop rule has carried the correction -- calc(100vh - var(--space-36)) -- the whole time.
 * Nothing became unreachable, which is why nothing caught it: the body scrolls, so every DOM and
 * a11y check passes while the sheet's bottom edge is simply never on screen.
 * MEASURED AT REST. The panel opens under panelIn (translateY(28px) scale(.96) -> none) and a
 * transformed rect is the animation, not the control -- an early sample reads the panel 14px
 * short of the defect and calls it a pass. Animations are awaited AND the box must agree across
 * consecutive reads before it is trusted, the same rest proof touch_floor uses.
 *
 * ---- ARM 2: THE JUMP STRIP PAINTS WITH THE SHEET, NOT A FRAME LATER (X5) ----
 * The strip is built from <deep-cram>'s rendered section titles, and <deep-cram> renders lazily
 * from an IntersectionObserver. The retry that used to wait for it ran on requestAnimationFrame --
 * and in the HTML rendering steps animation-frame callbacks run BEFORE intersection observations
 * are delivered, so the retry was structurally guaranteed to sample the frame just ahead of the
 * render and paint the strip one frame behind the sections it indexes. Measured on a84d68a: the
 * sections appear with an EMPTY strip for exactly one frame, then the strip populates and relayouts
 * the body 44px -- in Chromium as well as WebKit. What differs is only what that frame costs while
 * a 7-section, 7619px sheet renders under a backdrop-filter over a 12MB document: ~30ms in
 * Chromium, ~140ms in WebKit 26.5, where it reads as the sheet lurching under the reader.
 *
 * SO THE ASSERTION IS FRAME-RELATIVE, NOT A TIME BUDGET: zero frames may show sections with an
 * empty strip, and the body's layout offset may not move. Both are exact and load-independent --
 * there is no millisecond threshold here to be retuned on a slower runner, which is the property
 * that makes a first-open race safe to guard at all.
 * THE TRAVEL IS READ IN LAYOUT SPACE (#cram.offsetTop), not from a rect. Two rect-based attempts
 * were discarded during development: viewport-absolute tops scored 12 distinct positions for a
 * sheet that shifted once (that was panelIn), and subtracting the panel's own top does not cancel
 * panelIn's SCALE either. offsetTop is layout, so no transform can move it.
 *
 * BOTH ARMS PLANT. Arm 1 restores max-height:100vh and requires the overflow back. Arm 2 defers
 * the strip's MutationObserver by one animation frame -- i.e. reconstructs the exact pre-fix
 * timing -- and requires the frame assertion to go red. A check that cannot fail is worse than no
 * check, and this one is guarding two things that were green for the wrong reason for months.
 *
 * Watched RED against a84d68a (the pre-fix deliverable): arm 1 reports 18px of overflow in both
 * orientations, arm 2 reports 1 racing frame and 44px of relayout.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/cram_fit.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* Open the sheet and read the panel's box only once it is genuinely still: every running animation
   finished, then two consecutive agreeing samples. Returns layout numbers plus the overflow. */
async function panelAtRest(page) {
  await page.evaluate(() => {
    const p = document.querySelector('.cram-panel');
    if (!p || !p.getAnimations) return null;
    return Promise.all(p.getAnimations().map((a) => a.finished.catch(() => {})));
  }).catch(() => {});
  let prev = null;
  return B.pollFor(async () => {
    const cur = await page.evaluate(() => {
      const p = document.querySelector('.cram-panel'), ov = document.querySelector('.cram-ov');
      if (!p || !ov) return { missing: true };
      const r = p.getBoundingClientRect();
      return {
        iw: innerWidth, ih: innerHeight,
        top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1),
        maxHeight: getComputedStyle(p).maxHeight, padTop: getComputedStyle(ov).paddingTop,
        running: p.getAnimations ? p.getAnimations().filter((a) => a.playState === 'running').length : -1,
      };
    });
    const same = prev && JSON.stringify(prev) === JSON.stringify(cur);
    prev = cur;
    return same ? cur : null;
  }, (v) => v !== null && v.running === 0, B.ACT_MS, 'the cram panel to finish panelIn and come to rest');
}

async function openSheet(page) {
  await page.evaluate(() => { const b = document.getElementById('cramopen'); if (b) b.click(); });
  await page.waitForFunction(() => !!document.querySelector('.cram-ov.open'), null, { timeout: B.ACT_MS });
}
async function closeSheet(page) {
  await page.evaluate(() => { const b = document.getElementById('cramx'); if (b) b.click(); });
  await page.waitForFunction(() => !document.querySelector('.cram-ov.open'), null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
}

/* Record one rAF sample per frame across the FIRST open, then reduce to the two structural facts.
   The recorder is armed BEFORE the open, so it is registered ahead of anything the app schedules
   and therefore runs first every frame -- which is what lets it see a strip that is one frame
   behind rather than sampling after the app has already caught up. */
async function firstOpenTimeline(page) {
  await page.evaluate(() => {
    window.__cf = [];
    const t0 = performance.now();
    const tick = () => {
      const host = document.querySelector('deep-cram'), sr = host && host.shadowRoot;
      const strip = document.getElementById('cramjump'), body = document.getElementById('cram');
      window.__cf.push({
        t: +(performance.now() - t0).toFixed(1),
        open: !!document.querySelector('.cram-ov.open'),
        sec: sr ? sr.querySelectorAll('.cs-sec').length : 0,
        chips: strip ? strip.querySelectorAll('button').length : -1,
        stripH: strip ? +strip.getBoundingClientRect().height.toFixed(1) : null,
        cramOffsetTop: body ? body.offsetTop : null,     /* LAYOUT space -- no transform touches it */
      });
      if (performance.now() - t0 < 2500) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.evaluate(() => { const b = document.getElementById('cramopen'); if (b) b.click(); });
  /* Wait on the CONDITION (chips present), not a duration; the recorder keeps sampling regardless,
     so a build that never populates still terminates the recorder and fails on the frame counts. */
  await page.waitForFunction(() => { const s = document.getElementById('cramjump'); return !!(s && s.querySelectorAll('button').length); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await page.waitForFunction(() => window.__cf && window.__cf.length && (window.__cf[window.__cf.length - 1].t >= 2400), null, { timeout: B.ACT_MS }).catch(() => {});
  const tl = await page.evaluate(() => window.__cf);
  const shown = tl.filter((r) => r.sec > 0);
  const offsets = [...new Set(tl.filter((r) => r.open && r.sec > 0 && r.cramOffsetTop !== null).map((r) => r.cramOffsetTop))];
  return {
    frames: tl.length,
    sectionsEverShown: shown.length,
    racingFrames: shown.filter((r) => r.chips === 0).length,
    chipsAtSectionFirstPaint: shown.length ? shown[0].chips : null,
    bodyTravel: offsets.length ? +(Math.max(...offsets) - Math.min(...offsets)).toFixed(1) : null,
    offsets,
  };
}

(async () => {
  const fails = [], errs = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());

  /* ================= ARM 1 -- THE PANEL FITS, BOTH ORIENTATIONS ================= */
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await B.gotoApp(page, HTML, { hash: '#content-pipeline/walk' });
  await B.enterApp(page);

  for (const vp of [{ w: 390, h: 844, tag: '[390x844]' }, { w: 844, h: 390, tag: '[844x390]' }]) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await B.settle(page);
    const asserted = await page.evaluate(() => ({ iw: innerWidth, ih: innerHeight }));
    ok(vp.tag + ' viewport is the one being asserted about', asserted.iw === vp.w && asserted.ih === vp.h, JSON.stringify(asserted));

    await openSheet(page);
    const p = await panelAtRest(page);
    const over = +(p.bottom - p.ih).toFixed(1);
    ok(vp.tag + ' the cram panel ends inside the viewport -- the sheet\'s bottom edge is actually on screen (it hung ' + '18px' + ' below the fold while max-height:100vh ignored .cram-ov\'s own inset)',
      !p.missing && over <= 0, JSON.stringify(Object.assign({ over }, p)));
    ok(vp.tag + ' the panel is seated at the overlay\'s top inset, not floating (the fit is the max-height, not a shrunken panel)',
      !p.missing && Math.abs(p.top - parseFloat(p.padTop)) < 1.5, JSON.stringify({ top: p.top, padTop: p.padTop }));

    /* PLANT: put max-height:100vh back and require the overflow to return. If this does not fire,
       the arm above is measuring something that cannot go red and the check must not be trusted. */
    await page.evaluate(() => {
      const s = document.createElement('style');
      s.id = '_cf_plant';
      s.textContent = '@media (max-width:919px){.cram-panel{max-height:100vh !important}}';
      document.head.appendChild(s);
    });
    const planted = await panelAtRest(page);
    const plantedOver = +(planted.bottom - planted.ih).toFixed(1);
    await page.evaluate(() => { const s = document.getElementById('_cf_plant'); if (s) s.remove(); });
    if (!(plantedOver > 0)) {
      console.log('  ABORT ' + vp.tag + ' restoring max-height:100vh did NOT push the panel past the fold -- this arm cannot fail.');
      console.log('     -> ' + JSON.stringify({ plantedOver, planted }));
      await browser.close();
      return B.finish(1, 'CRAM FIT: ABORTED (self-test failed: the fit arm cannot fail)');
    }
    ok(vp.tag + ' [plant] restoring max-height:100vh puts the panel back below the fold (the fit arm is live, not a constant)', true, '');
    await closeSheet(page);
  }
  await ctx.close();

  /* ================= ARM 2 -- FIRST OPEN, CLEAN ================= */
  /* A VIRGIN PAGE. The race is first-open-only: <deep-cram> renders once and stays rendered, so a
     reopen (or a topic-switch-then-reopen) finds its sections already there and is clean on the
     pre-fix build too. Reusing the page above would assert nothing. */
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p2.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await B.gotoApp(p2, HTML, { hash: '#content-pipeline/walk' });
  await B.enterApp(p2);
  const clean = await firstOpenTimeline(p2);

  ok('first open: the sheet actually rendered sections (a zero-section pass is not a pass)', clean.sectionsEverShown > 0 && clean.offsets.length > 0, JSON.stringify(clean));
  ok('first open: the jump strip is populated in the SAME frame the sections first paint -- no frame shows the sheet with an empty index',
    clean.racingFrames === 0 && clean.chipsAtSectionFirstPaint > 0, JSON.stringify(clean));
  ok('first open: the sheet body never relayouts -- the strip does not arrive late and push what the reader is already reading',
    clean.bodyTravel === 0, JSON.stringify({ bodyTravel: clean.bodyTravel, offsets: clean.offsets }));
  await ctx2.close();

  /* ================= ARM 2 PLANT -- REBUILD THE PRE-FIX TIMING ================= */
  /* Defer the strip's MutationObserver callback by one animation frame, scoped to <deep-cram>'s
     shadow root so nothing else in the app is touched. That is precisely what the old rAF retry
     did -- deliver one frame behind the render -- so if the arm above cannot see this, it cannot
     see the regression it exists to prevent. */
  const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p3 = await ctx3.newPage();
  p3.on('pageerror', (e) => errs.push('plant pageerror: ' + e.message));
  await p3.addInitScript(() => {
    const Real = window.MutationObserver;
    window.MutationObserver = function (cb) {
      const inst = new Real(function (recs, obs) {
        if (inst.__deferred) { requestAnimationFrame(() => cb(recs, obs)); return; }
        cb(recs, obs);
      });
      const observe = inst.observe.bind(inst);
      inst.observe = function (target, init) {
        const host = target && target.host;
        if (host && host.tagName === 'DEEP-CRAM') inst.__deferred = true;
        return observe(target, init);
      };
      return inst;
    };
    window.MutationObserver.prototype = Real.prototype;
  });
  await B.gotoApp(p3, HTML, { hash: '#content-pipeline/walk' });
  await B.enterApp(p3);
  const plantedTl = await firstOpenTimeline(p3);
  await ctx3.close();

  if (!(plantedTl.sectionsEverShown > 0 && (plantedTl.racingFrames > 0 || plantedTl.bodyTravel > 0))) {
    console.log('  ABORT deferring the strip observer by one frame did NOT produce a racing frame or a relayout -- the first-open arm cannot fail.');
    console.log('     -> ' + JSON.stringify(plantedTl));
    await browser.close();
    return B.finish(1, 'CRAM FIT: ABORTED (self-test failed: the first-open arm cannot fail)');
  }
  ok('[plant] deferring the strip observer by one frame reproduces the race (' + plantedTl.racingFrames + ' racing frame(s), ' + plantedTl.bodyTravel + 'px relayout) -- the first-open arm is live', true, '');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('CRAM FIT: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  return B.finish(pass ? 0 : 1);
})().catch(async (e) => {
  console.log('CRAM FIT: FAIL (harness error: ' + (e && e.message) + ')');
  return B.finish(1);
});
