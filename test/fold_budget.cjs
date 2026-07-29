#!/usr/bin/env node
/*
 * THE PHONE'S FOLD BUDGET (W2 / audit P1-1, P2-7) -- the question must be ON SCREEN when the
 * Probe Drill opens.
 *
 * THE DEFECT THIS EXISTS TO KEEP FIXED. At 360x800 the drill opened with ZERO PIXELS of the probe
 * visible: fixed .seg held 0-61, fixed .mockcta 728-800, and .qq measured top=762.7 against a
 * 667px live band -- 702px of scrolling to reach the question the pane exists to ask, re-paid on
 * EVERY return to the drill. The root was structural, not a stray margin: `@media ... max-height`
 * returned ZERO hits in styles.css, so every mobile rule in the app was a FIT decision and none
 * was a BUDGET decision.
 *
 * WHY A CHECK AND NOT A SCREENSHOT. This is invisible to VR by construction -- the mobile
 * baselines capture the WALK pane, and a baseline of a drill whose question is off-screen would
 * simply certify the defect. It is invisible to every behaviour check too: the pane switches, the
 * question renders, nothing errors, the DOM is entirely correct. The only witness is GEOMETRY
 * RELATIVE TO THE FIXED CHROME, which is what this measures.
 *
 * WHAT "THE LIVE BAND" MEANS, and why it is computed rather than typed. The usable viewport is
 * what is left after the two position:fixed bars, and BOTH are read from the live layout here --
 * never assumed at 61/72 -- so a future change to either bar moves the target automatically
 * instead of silently invalidating a hardcoded number. That property is the whole point: this
 * check must fail when the BUDGET breaks, including when it breaks from the chrome side.
 *
 * DETERMINISM. Every number is read from computed layout at a PINNED, ASSERTED viewport; there is
 * no wall clock in any assertion and no reliance on a screenshot. It is not fully font-metric-free
 * (the app's body face is a system stack, so .qq's line box differs between this box and a CI
 * runner) -- so the assertion is stated with the margin it actually has, and both margins are
 * PRINTED on every run. Measured headroom at the time of writing: 287px portrait, 11px landscape
 * -> after the landscape card-head fix, 37px. A font that renders 10% taller moves .qq's line box
 * by ~2.6px, so both sides carry an order of magnitude more room than the metric can consume.
 *
 * ENTERED AS A USER DOES. A real hit-tested page.mouse.click on the "Probe Drill" seg button,
 * from the Walkthrough -- never location.hash and never el.click(). The audit's own receipt was
 * taken on the user path and the return path matters as much as the first visit: the 702px was
 * re-paid every time, which a hash-goto measurement would have hidden.
 *
 * SELF-TEST: every run re-arms a PLANT that restores the pre-fix layout (re-open the drill's setup
 * disclosure and undo the identity-block collapse -- i.e. exactly the two things this wave did),
 * and ABORTS if the assertion does not go red under it. Without that, a future refactor that made
 * .qq unreadable to the probe would turn this into the tenth check in this repo that cannot fail.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/fold_budget.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* Two topics, because the audit reconfirmed the defect on a second one. The budget must hold for
 * a topic whose question is longer than the flagship's, which is the case this can plausibly
 * regress on: .qq's TOP is what the assertion reads, and .qq's top is fixed by the blocks above
 * it, so a corpus-length change must not be able to move it. Asserting on two topics is what
 * turns that from a belief into a measurement. */
const TOPICS = ['content-pipeline', 'notifications', 'debugging'];

/* The audit's own pre-fix measurement on this box, kept as the anchor for the self-test below.
   The plant must push .qq at least this far back down: a control that merely nudges it proves
   the probe is sensitive, not that it is calibrated to the defect it was written for. */
const PREFIX_QQ_TOP = 763;

/* The measurement. Everything here is live layout; nothing is a constant. */
const FOLD = () => {
  const seg = document.querySelector('.sidebar .seg');
  const bar = document.querySelector('.sidebar .mockcta');
  if (!seg || !bar) return { ready: false, why: 'no seg/mockcta' };
  const sr = seg.getBoundingClientRect(), br = bar.getBoundingClientRect();
  /* Only a FIXED bar steals band: on desktop these are in the sidebar column and cost nothing. */
  const segFixed = getComputedStyle(seg).position === 'fixed';
  const barFixed = getComputedStyle(bar).position === 'fixed';
  const bandTop = segFixed ? sr.bottom : 0;
  const bandBot = barFixed ? br.top : window.innerHeight;
  const host = document.querySelector('#drill deep-drill'), root = host && host.shadowRoot;
  const qq = root && root.querySelector('.qq');
  if (!qq) return { ready: false, why: root ? 'no .qq (drill not drawn)' : 'no shadow root (drill did not upgrade)' };
  const r = qq.getBoundingClientRect();
  /* The FIRST LINE, not the whole block: a three-line question legitimately overruns the band, and
     demanding the whole block would make the target depend on how long an author wrote. What the
     user needs is to see the question START without scrolling. */
  const cs = getComputedStyle(qq);
  let lh = parseFloat(cs.lineHeight);
  if (!isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.4;
  const firstLineBottom = r.top + lh;
  return {
    ready: true,
    scrollY: Math.round(window.scrollY),
    band: [Math.round(bandTop), Math.round(bandBot)], bandPx: Math.round(bandBot - bandTop),
    qqTop: Math.round(r.top), lineH: Math.round(lh),
    firstLineIn: r.top >= bandTop - 0.5 && firstLineBottom <= bandBot + 0.5,
    /* how much further .qq could sink before the assertion breaks -- printed every run so a
       regression arrives as "the margin shrank to 4px", not as a surprise red one wave later */
    marginPx: Math.round(bandBot - firstLineBottom),
    scrollToSeat: Math.max(0, Math.round(r.top - bandTop)),
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  };
};

/* Enter the drill the way a thumb does. */
async function tapPane(page, tab) {
  const sel = '.seg button[data-tab="' + tab + '"]';
  await page.locator(sel).scrollIntoViewIfNeeded();
  const box = await page.locator(sel).boundingBox();
  if (!box) throw new Error('no painted box for the ' + tab + ' tab');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(
    () => { const h = document.querySelector('#drill deep-drill'); return !!(h && h.shadowRoot && h.shadowRoot.querySelector('.qq')); },
    null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
}

/* A viewport this check BELIEVES. The audit lost 59 of 60 rows to a page whose viewport override
   was silently reset, and named "assert innerWidth on every measurement" as the standing lesson. */
async function pinViewport(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await B.settle(page);
  const real = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  if (real.w !== w || real.h !== h) {
    throw new Error('viewport assert failed: asked ' + w + 'x' + h + ', page reports ' + real.w + 'x' + real.h);
  }
}

(async () => {
  const fails = [], errs = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  /* isMobile/hasTouch: the app gates real behaviour on (pointer:coarse), and a desktop-pointer
     context at 360px wide is a different app from the one a phone runs. */
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await B.gotoApp(page, HTML, { hash: '#' + TOPICS[0] + '/walk' });
  await B.enterApp(page);

  /* ===================== PORTRAIT 360x800 -- THE P1 ===================== */
  await pinViewport(page, 360, 800);
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i];
    await page.evaluate((id) => { location.hash = '#' + id + '/walk'; }, t);
    await page.waitForFunction((id) => TopicRegistry.current().id === id, t, { timeout: B.ACT_MS }).catch(() => {});
    await B.settle(page);
    await tapPane(page, 'drill');
    const f = await page.evaluate(FOLD);
    ok('[360x800] ' + t + ': entering the drill by TAP from the walkthrough leaves the question\'s first line inside the live band at scrollY 0',
      f.ready && f.scrollY === 0 && f.firstLineIn === true, JSON.stringify(f));
    ok('[360x800] ' + t + ': no horizontal overflow (the vertical budget was not bought with a sideways scroll)',
      f.ready && f.overflowX === 0, JSON.stringify({ overflowX: f.overflowX }));
    if (f.ready) console.log('       .qq top=' + f.qqTop + '  band=' + JSON.stringify(f.band) + '  margin=' + f.marginPx + 'px');
  }

  /* THE RETURN PATH. The audit's sharpest receipt: the 702px was not a first-visit tax, it was
     re-paid on every return (drill @700 -> whiteboard -> drill -> qVisible 0 again). A fix that
     only seated the question on first entry would leave the defect intact for the other 20 visits
     of a round, so the same assertion is re-taken after a round trip through another pane. */
  await page.evaluate(() => window.scrollTo(0, 700));
  await B.settle(page);
  await tapPane(page, 'wb');
  await tapPane(page, 'drill');
  const back = await page.evaluate(FOLD);
  ok('[360x800] RETURN PATH: drill -> whiteboard -> drill still lands with the question in the band, at scrollY 0, with no manual scroll',
    back.ready && back.scrollY === 0 && back.firstLineIn === true, JSON.stringify(back));

  /* ===================== LANDSCAPE 844x390 -- P2-7 =====================
     THE TARGET IS THE SAME ONE, DELIBERATELY. The audit's complaint about landscape is that it is
     what a user turns the phone for when they want MORE room to read, and it delivered less: 78px
     of content on the first screen against portrait's 396. A relaxed landscape target would have
     encoded that inversion as acceptable. It is met by the short-viewport breakpoint (which gives
     back 22px of fixed chrome) plus the card head spending the 844px of width it has. */
  await pinViewport(page, 844, 390);
  await page.evaluate((id) => { location.hash = '#' + id + '/walk'; }, TOPICS[0]);
  await page.waitForFunction((id) => TopicRegistry.current().id === id, TOPICS[0], { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  await tapPane(page, 'drill');
  const land = await page.evaluate(FOLD);
  ok('[844x390] landscape: the question\'s first line is inside the live band at scrollY 0 (the short-viewport breakpoint is doing its job)',
    land.ready && land.scrollY === 0 && land.firstLineIn === true, JSON.stringify(land));
  /* Landscape must beat portrait on its own terms: more band than it had. 257px was the pre-fix
     measurement; anything at or below that means the breakpoint stopped applying. */
  ok('[844x390] landscape reclaimed band: the live band exceeds the pre-fix 257px',
    land.ready && land.bandPx > 257, JSON.stringify({ bandPx: land.bandPx }));
  if (land.ready) console.log('       .qq top=' + land.qqTop + '  band=' + JSON.stringify(land.band) + '  margin=' + land.marginPx + 'px');

  /* ===================== THE PLANT =====================
     Put the reclaimed pixels back and require the assertion to notice.
     ONE VARIABLE, DELIBERATELY. The first version of this plant re-created the pre-fix CSS by
     un-clipping .tn-current -- and that reintroduced a DIFFERENT, older bug: the un-ellipsised
     nowrap title widens the DOCUMENT, and styles.css:723-731 records that the fixed .mockcta is
     then sized by the widened layout viewport. The bar's top moved 728 -> 777, the band grew to
     716px, and the plant "passed" for a reason that had nothing to do with the fold. A negative
     control that perturbs the thing it is measured against proves nothing.
     So: the REAL mechanism (the setup disclosure comes back, +214px) plus an inert spacer for the
     light-DOM half. The spacer moves nothing but the card's start position, which is exactly the
     variable under test, and the assertion below anchors it to the pre-fix 763 so the control is
     calibrated to the measured defect rather than to any nudge at all. */
  await pinViewport(page, 360, 800);
  await page.evaluate((id) => { location.hash = '#' + id + '/walk'; }, TOPICS[0]);
  await B.settle(page);
  await tapPane(page, 'drill');
  const planted = await page.evaluate((target) => {
    const host = document.querySelector('#drill deep-drill');
    host.classList.remove('dsu-closed');                   /* the 214px of setup comes back */
    const root = host.shadowRoot;
    const qq = root.querySelector('.qq');
    /* size the spacer from the LIVE gap, so the plant lands on the pre-fix number on any box */
    const need = Math.max(0, target - Math.round(qq.getBoundingClientRect().top));
    const sp = document.createElement('div');
    sp.id = '_foldplant';
    sp.style.cssText = 'height:' + need + 'px';
    root.insertBefore(sp, root.firstChild);
    return { need: need };
  }, PREFIX_QQ_TOP);
  await B.settle(page);
  const plantedFold = await page.evaluate(FOLD);
  await page.evaluate(() => {
    const host = document.querySelector('#drill deep-drill');
    const s = host.shadowRoot.getElementById('_foldplant');
    if (s) s.remove();
    host.classList.add('dsu-closed');
  });
  const sane = plantedFold.ready && plantedFold.qqTop >= PREFIX_QQ_TOP - 4 && plantedFold.band[1] === back.band[1];
  if (!sane || plantedFold.firstLineIn !== false) {
    console.log('  ABORT the pre-fix fold did NOT turn this check red, or the plant moved the chrome instead of the card.');
    console.log('     -> planted=' + JSON.stringify(plantedFold) + ' spacer=' + planted.need + ' fixedBand=' + JSON.stringify(back.band));
    await browser.close();
    return B.finish(1, 'FOLD BUDGET: ABORTED (self-test failed: the check cannot fail)');
  }
  ok('[plant] restoring the pre-fix fold (setup expanded + the reclaimed light-DOM height) pushes the question back out of the band, with the chrome untouched',
    true, '');
  console.log('       planted .qq top=' + plantedFold.qqTop + ' vs fixed ' + back.qqTop + '  (spacer ' + planted.need + 'px, band unchanged)');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FOLD BUDGET: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  return B.finish(pass ? 0 : 1);
})().catch(async (e) => {
  console.log('FOLD BUDGET: FAIL (harness error: ' + (e && e.message) + ')');
  return B.finish(1);
});
