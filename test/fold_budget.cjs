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
 * PRINTED on every run. Measured on the shipped build: 287px portrait and 20px landscape (the
 * landscape figure was 11px before the card-head fix; an earlier draft of this comment projected
 * 37px, which the check itself never printed -- read the run, not this paragraph). .qq's measured
 * line box is 26.1px, so a font rendering 10% taller costs ~2.6px: ~7.7x headroom on the tighter
 * of the two sides, and two orders more on the other.
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

/* The pre-fix measurements on this box, kept as the anchors for the self-tests below -- one per
   viewport. The plant must push .qq at least this far back down: a control that merely nudges it
   proves the probe is sensitive, not that it is calibrated to the defect it was written for. */
const PREFIX_QQ_TOP = 763;             /* 360x800, measured on 2c74cb7 */
const PREFIX_QQ_TOP_LANDSCAPE = 701;   /* 844x390, measured on 2c74cb7 */

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

/* ===== A PROGRAMMATIC SCROLL HERE IS ANIMATED, SO "I SCROLLED" IS NOT A GIVEN =====
   styles.css:36 sets html{scroll-behavior:smooth}, which makes window.scrollTo() an ANIMATION. A
   scrollTo() followed by the usual two-rAF settle therefore reads the page mid-flight -- and for a
   short hop, before it has visibly moved at all. That matters for exactly one arm below: the RETURN
   PATH exists to prove the fold budget is not a first-visit tax, and its premise is that the user
   was genuinely scrolled away from the top when they left the pane. An earlier version asserted
   that premise with scrollTo(0,700) + settle and never actually left scrollY 0 -- the conclusion
   held (the assertion passes from a real scroll and fails on base either way), but the check was
   not demonstrating what its comment said it was.
   So: wait for the scroll to REACH ITS TARGET, and separately for the page to stop moving after a
   pane switch. Condition, not duration -- either one failing to settle times out into a real
   failure rather than being quietly accepted.

   AND "TWO EQUAL SAMPLES" IS NOT A REST PROOF HERE, which cost a revision to learn. The first
   version of this helper polled until two consecutive reads 100ms apart agreed -- and a smooth
   scroll that stalls for one frame produces exactly that, mid-animation. It returned early, the
   pane switch fired into a still-settling scroll, and the return-path arm then measured scrollY
   189 on a build that genuinely rests at 0. So the precondition polls for a DEFINITE END STATE
   (the clamped target), and the post-switch wait demands three consecutive agreeing samples, not
   two. */
async function scrollToRest(page, y) {
  const want = await page.evaluate((t) => {
    window.scrollTo(0, t);
    return Math.min(t, document.documentElement.scrollHeight - window.innerHeight);
  }, y);
  await B.pollFor(() => page.evaluate(() => Math.round(window.scrollY)),
    (v) => Math.abs(v - want) <= 2, B.ACT_MS, 'the smooth scroll to reach ' + want);
  return want;
}

/* Rest with no known target -- used after a pane switch, which can move the scroll on its own. */
async function settleScroll(page) {
  const seen = [];
  return B.pollFor(async () => {
    seen.push(await page.evaluate(() => Math.round(window.scrollY)));
    if (seen.length > 3) seen.shift();
    return (seen.length === 3 && seen[0] === seen[1] && seen[1] === seen[2]) ? seen[2] : null;
  }, (v) => v !== null, B.ACT_MS, 'the page to stop scrolling after a pane switch');
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
  const away = await scrollToRest(page, 700);
  /* The precondition is asserted, not assumed -- see scrollToRest. If the user was never actually
     scrolled away, the arm below is testing a fresh entry a second time and says so. */
  ok('[360x800] RETURN PATH precondition: the user really was scrolled away from the top before leaving the pane',
    away > 400, 'scrollY came to rest at ' + away + ' after asking for 700');
  await tapPane(page, 'wb');
  await tapPane(page, 'drill');
  await settleScroll(page);
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

  /* ===================== THE PLANT, AT BOTH VIEWPORTS =====================
     Put the reclaimed pixels back and require the assertion to notice.
     ONE VARIABLE, DELIBERATELY. The first version of this plant re-created the pre-fix CSS by
     un-clipping .tn-current -- and that reintroduced a DIFFERENT, older bug: the un-ellipsised
     nowrap title widens the DOCUMENT, and styles.css:723-731 records that the fixed .mockcta is
     then sized by the widened layout viewport. The bar's top moved 728 -> 777, the band grew to
     716px, and the plant "passed" for a reason that had nothing to do with the fold. A negative
     control that perturbs the thing it is measured against proves nothing.
     So: the REAL mechanism (the setup disclosure comes back) plus an inert spacer for the
     light-DOM half. The spacer moves nothing but the card's start position, which is exactly the
     variable under test, and each call anchors to that viewport's own pre-fix number, so the
     control is calibrated to the measured defect rather than to any nudge at all.
     RUN AT BOTH VIEWPORTS. It was portrait-only for one revision, with the landscape gap merely
     disclosed. The landscape arm shares this FOLD() probe and does go red on the base build, so it
     was never a check that could not fail -- but a disclosure is not a control, and the plant was
     already a function's worth of code. */
  const runPlant = async (w, h, target, label) => {
    await pinViewport(page, w, h);
    await page.evaluate((id) => { location.hash = '#' + id + '/walk'; }, TOPICS[0]);
    await B.settle(page);
    await tapPane(page, 'drill');
    const ref = await page.evaluate(FOLD);          /* this viewport's own healthy band */
    const spacer = await page.evaluate((t) => {
      const host = document.querySelector('#drill deep-drill');
      host.classList.remove('dsu-closed');          /* the setup rows come back */
      const root = host.shadowRoot;
      const qq = root.querySelector('.qq');
      /* size the spacer from the LIVE gap, so the plant lands on the pre-fix number on any box */
      const need = Math.max(0, t - Math.round(qq.getBoundingClientRect().top));
      const sp = document.createElement('div');
      sp.id = '_foldplant';
      sp.style.cssText = 'height:' + need + 'px';
      root.insertBefore(sp, root.firstChild);
      return need;
    }, target);
    await B.settle(page);
    const planted = await page.evaluate(FOLD);
    await page.evaluate(() => {
      const host = document.querySelector('#drill deep-drill');
      const s = host.shadowRoot.getElementById('_foldplant');
      if (s) s.remove();
      host.classList.add('dsu-closed');
    });
    const moved = planted.ready && planted.qqTop >= target - 4;
    const chromeStill = planted.ready && ref.ready && planted.band[0] === ref.band[0] && planted.band[1] === ref.band[1];
    if (!moved || !chromeStill || planted.firstLineIn !== false) {
      console.log('  ABORT ' + label + ': the pre-fix fold did NOT turn this check red, or the plant moved the chrome instead of the card.');
      console.log('     -> planted=' + JSON.stringify(planted) + ' spacer=' + spacer + ' healthyBand=' + JSON.stringify(ref.band));
      return false;
    }
    ok('[plant] ' + label + ': restoring the pre-fix fold pushes the question back out of the band, with the chrome untouched', true, '');
    console.log('       planted .qq top=' + planted.qqTop + ' vs fixed ' + ref.qqTop + '  (spacer ' + spacer + 'px, band ' + JSON.stringify(planted.band) + ' unchanged)');
    return true;
  };
  if (!(await runPlant(360, 800, PREFIX_QQ_TOP, '360x800'))) {
    await browser.close();
    return B.finish(1, 'FOLD BUDGET: ABORTED (self-test failed: the portrait check cannot fail)');
  }
  if (!(await runPlant(844, 390, PREFIX_QQ_TOP_LANDSCAPE, '844x390'))) {
    await browser.close();
    return B.finish(1, 'FOLD BUDGET: ABORTED (self-test failed: the landscape check cannot fail)');
  }

  /* ===================== THE WAY FORWARD, AT STAGE 1 (W19 / audit X7) =====================
     The budget above is about the QUESTION being on screen when the drill opens. This is its
     other half: after the user answers it and presses Reveal, the drill's only forward control
     must be somewhere they can press. On the shipped build it was not -- measured here at
     360x800, fresh context, real hit-tested tap, scroll at rest: #adv finished at [723.7,767.7],
     [737.2,781.2] and [1330.1,1374.1] against a band ending at 728, i.e. 90%, 121% and 1468%
     occluded, and a hit test at its centre returned BUTTON#mockopen / SPAN.mb-lbl -- the Mock-run
     bar. The app seated the content it had just revealed and abandoned the control.

     WHY IT BELONGS IN THIS FILE. It is the same measurement: geometry relative to the live fixed
     chrome, invisible to every behaviour check (the button renders, the DOM is correct, nothing
     errors) and invisible to VR (no baseline captures a revealed drill). The band is computed by
     the same FOLD() probe, from the same two bars.

     THE HIT TEST IS THE ASSERTION, not the rectangle. "Below the fold" is normal web layout; what
     is not normal is a control whose centre belongs to another widget. elementFromPoint is what
     the audit used to file this, so it is what settles it. */
  const ADV = () => {
    const host = document.querySelector('#drill deep-drill'), root = host && host.shadowRoot;
    if (!root) return { ready: false, why: 'no shadow root' };
    const seg = document.querySelector('.sidebar .seg'), bar = document.querySelector('.sidebar .mockcta');
    const sr = seg.getBoundingClientRect(), br = bar.getBoundingClientRect();
    const bandTop = getComputedStyle(seg).position === 'fixed' ? sr.bottom : 0;
    const bandBot = getComputedStyle(bar).position === 'fixed' ? br.top : window.innerHeight;
    const adv = root.getElementById('adv');
    if (!adv) return { ready: false, why: 'no #adv (this probe has no follow-up -- the judgment row is next)' };
    const r = adv.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    /* elementFromPoint stops at the shadow HOST, so walk in -- otherwise every in-band answer
       reads as DEEP-DRILL and the arm can neither pass nor fail honestly. */
    let hit = document.elementFromPoint(cx, cy), guard = 0;
    while (hit && hit.shadowRoot && guard++ < 8) {
      const inner = hit.shadowRoot.elementFromPoint(cx, cy);
      if (!inner || inner === hit) break;
      hit = inner;
    }
    const occ = Math.max(0, r.bottom - bandBot) + Math.max(0, bandTop - r.top);
    return {
      ready: true, scrollY: Math.round(window.scrollY),
      label: (adv.textContent || '').trim(),
      rect: [+r.top.toFixed(1), +r.bottom.toFixed(1)],
      band: [Math.round(bandTop), Math.round(bandBot)],
      occludedPx: +occ.toFixed(1), occludedPct: Math.round(occ / r.height * 100),
      inBand: r.top >= bandTop - 0.5 && r.bottom <= bandBot + 0.5,
      hit: hit ? (hit.tagName + (hit.id ? '#' + hit.id : '') + (typeof hit.className === 'string' && hit.className ? '.' + hit.className.trim().split(/\s+/).join('.') : '')) : 'null',
      hitIsAdv: hit === adv,
    };
  };

  /* Tap the forward control the way a thumb does -- at its painted centre, hit-tested. */
  async function tapAdv(page) {
    const c = await page.evaluate(() => {
      const root = document.querySelector('#drill deep-drill').shadowRoot;
      const a = root.getElementById('adv');
      if (!a) return null;
      const r = a.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (!c) return false;
    await page.mouse.click(c.x, c.y);
    await B.settle(page);
    await settleScroll(page);     /* the seat is a SMOOTH scroll -- wait for it to stop moving */
    return true;
  }

  /* ===== THE ROUTER PINS THE PAGE TO THE TOP FOR 400ms AFTER BOOT, AND IT WILL EAT THIS SEAT.
     router.js:234-246 forces scroll-behavior:auto and re-runs scrollTo(0,0) on a timer chain for
     400ms, so the browser's on-load "scroll to fragment" step cannot leave the phone header
     off-screen. A reveal inside that window has its seat silently undone. That is not a product
     defect -- no thumb reaches Reveal within 400ms of boot -- but it IS a harness trap, and it
     cost a full measurement round: the same viewport and topic passed or failed depending on how
     fast the box happened to boot. Wait for the CONDITION (the router handing scroll-behavior
     back), never a duration. */
  await page.waitForFunction(
    () => document.documentElement.style.scrollBehavior !== 'auto',
    null, { timeout: B.ACT_MS });

  /* ===== ONE WAY IN, SHARED BY THE ARMS AND THE PLANT =====
     The plant had its own three lines of this and they were missing the topic-switch wait. It
     therefore tapped Reveal while the switch was still settling, and view-manager.js:87's
     scrollTo(0,0) on a pane switch undid the seat -- so the plant's own "seated" reference was
     never seated, and the self-test aborted a run whose six real arms had all passed. It aborted
     only under gate load, which is the worst way for a harness to be wrong. Same reason as the
     router pin above: a seat is only observable once the thing that resets scroll has finished. */
  async function enterDrillOn(page, topic) {
    await page.evaluate((id) => { location.hash = '#' + id + '/walk'; }, topic);
    await page.waitForFunction((id) => TopicRegistry.current().id === id, topic, { timeout: B.ACT_MS }).catch(() => {});
    await B.settle(page);
    await tapPane(page, 'drill');
    await settleScroll(page);
  }

  await pinViewport(page, 360, 800);
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i];
    await enterDrillOn(page, t);
    if (!(await tapAdv(page))) { ok('[360x800] ' + t + ': the drill offers a forward control to press', false, 'no #adv at stage 0'); continue; }
    const a = await page.evaluate(ADV);
    ok('[360x800] ' + t + ': after Reveal, the drill\'s forward control is inside the live band',
      a.ready && a.inBand === true, JSON.stringify(a));
    ok('[360x800] ' + t + ': and a tap at its centre lands on IT, not on the fixed Mock-run bar',
      a.ready && a.hitIsAdv === true, JSON.stringify({ hit: a.hit, rect: a.rect, band: a.band }));
    if (a.ready) console.log('       #adv "' + a.label + '" ' + JSON.stringify(a.rect) + ' band=' + JSON.stringify(a.band) + ' occluded=' + a.occludedPct + '%');
  }

  /* THE PLANT. Put the pre-fix behaviour back -- the app did NOT move the screen on a reveal --
     and require both arms to notice. Forcing the scroll back to where the reveal left it is
     exactly the state the shipped build rests in, so this is calibrated to the measured defect
     rather than to any perturbation. */
  await enterDrillOn(page, TOPICS[0]);
  await tapAdv(page);
  const seated = await page.evaluate(ADV);
  await scrollToRest(page, 0);
  const unseated = await page.evaluate(ADV);
  if (!(seated.ready && seated.inBand === true && unseated.ready && unseated.inBand === false && unseated.hitIsAdv === false)) {
    console.log('  ABORT [X7 plant]: undoing the seat did NOT turn these arms red -- they cannot fail.');
    console.log('     -> seated=' + JSON.stringify(seated) + '\n     -> unseated=' + JSON.stringify(unseated));
    await browser.close();
    return B.finish(1, 'FOLD BUDGET: ABORTED (self-test failed: the X7 arms cannot fail)');
  }
  ok('[plant] 360x800: undoing the seat puts the forward control back under the bar, and the hit test back on it', true, '');
  console.log('       seated ' + JSON.stringify(seated.rect) + ' hit ' + seated.hit +
    '  ->  unseated ' + JSON.stringify(unseated.rect) + ' hit ' + unseated.hit);

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FOLD BUDGET: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  return B.finish(pass ? 0 : 1);
})().catch(async (e) => {
  console.log('FOLD BUDGET: FAIL (harness error: ' + (e && e.message) + ')');
  return B.finish(1);
});
