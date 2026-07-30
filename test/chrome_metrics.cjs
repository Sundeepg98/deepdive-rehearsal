#!/usr/bin/env node
/*
 * THE FIXED PHONE CHROME IS MEASURED, NOT GUESSED (W19 / cross-browser audit X2, half 2).
 *
 * THE DEFECT THIS EXISTS TO KEEP FIXED. Ten numbers -- five per orientation -- were hand-tuned to
 * the height of two position:fixed bars the app never measured: `.app`'s padding-top and
 * -bottom, `.scrolltop`'s lift above the bar, and the drill's scroll-margin-top/-bottom. On the
 * shipped build, in CHROMIUM 149, `.app{padding-top:56px}` sat against a `.seg` that measures
 * 61px: the first 5px of `.side-id` lived under the fixed strip, at every phone width, with
 * nothing in the gate able to see it. The cross-browser audit then measured the same constants
 * 12px out in WebKit 26.5, where a classic scrollbar reserved layout height inside the strip.
 *
 * WHY A CHECK AND NOT A CONSTANT. The point was never "56 should have been 61". Any engine, zoom
 * level, font fallback, added control or padding change moves the bar, and a typed constant cannot
 * follow it -- so this asserts the RELATIONSHIP (what the app reserves == what the bar takes)
 * rather than any number. That is the same discipline test/fold_budget.cjs already applies to the
 * live band, and this check deliberately computes "how much chrome steals" the same way it does:
 * only a POSITION:FIXED, rendered bar costs the content anything.
 *
 * WHAT IS STILL A CONSTANT, AND THEREFORE ASSERTED -- WITHIN A BAND. styles.css declares
 * --chrome-top/--chrome-bot in both media blocks as the FALLBACK for the frame before
 * chrome-metrics.js runs and for JS off entirely. Those two pairs are the last constants in the
 * system, so arm 5 strips the inline style and checks the stylesheet's own value against the
 * measured truth. It asks for CLOSENESS, not equality, and the reason is this check's own subject
 * matter: `measured` carries a font-metric term, so one hardcoded pair can be exactly right on at
 * most one platform. Demanding equality is what broke the Ubuntu gate and blocked a deploy. The
 * band, its anchoring measurement, and its two mutants are documented at arm 5.
 *
 * THE GAPS ARE NOT CONSTANTS OF THIS CLASS and are asserted as themselves: the app reserves the
 * bar PLUS an authored gap (8px above the bottom bar upright, 4px on its side, 16px for the
 * drill's seat, 24/14px for the scroll-top FAB). A gap is a design decision that does not desync
 * when an engine changes the bar; a bar height typed into a stylesheet is the thing that does.
 *
 * SELF-TEST: every run PLANTS a taller bar (`.seg{padding-top:20px}` -> 73px, which is exactly the
 * height WebKit 26.5 reported when its scrollbar reserved space inside the strip) and requires the
 * derived values to follow within a bounded wait. It ABORTS if they do not. The plant is a PADDING
 * change on purpose: it is the mechanism the short-viewport block itself uses (`.seg` re-pads
 * 8px -> 3px in landscape), and it caught a real defect in the first draft of chrome-metrics.js --
 * a ResizeObserver left on its default CONTENT box never fires for it, because these bars are
 * sized by a 44px tap floor that padding sits outside of. That draft passed every other arm here.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/chrome_metrics.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* The authored gaps, stated once here so a change to either side has to be deliberate. Portrait
   and landscape differ on purpose: the short-viewport block exists to give height back. */
const GAP = {
  portrait: { appBot: 8, fab: 24, seatTop: 8, seatBot: 16 },
  landscape: { appBot: 4, fab: 14, seatTop: 8, seatBot: 16 },
};

/* Everything read from live layout. "stolen" mirrors chrome-metrics.js AND fold_budget.cjs:
   only a fixed, rendered bar costs the content anything. */
const METRICS = () => {
  const de = document.documentElement;
  const seg = document.querySelector('.sidebar .seg');
  const bar = document.querySelector('.sidebar .mockcta');
  const app = document.querySelector('.app');
  const sid = document.querySelector('.side-id');
  const fab = document.querySelector('.scrolltop');
  if (!seg || !bar || !app) return { ready: false, why: 'no seg/mockcta/app' };
  const stolen = (el) => {
    if (!el.getClientRects().length) return 0;
    if (getComputedStyle(el).position !== 'fixed') return 0;
    return el.getBoundingClientRect().height;
  };
  const segH = stolen(seg), barH = stolen(bar);
  const cs = getComputedStyle(app);
  const num = (s) => parseFloat(s) || 0;
  const out = {
    ready: true,
    iw: window.innerWidth, ih: window.innerHeight,
    segH: +segH.toFixed(2), barH: +barH.toFixed(2),
    varTop: num(getComputedStyle(de).getPropertyValue('--chrome-top')),
    varBot: num(getComputedStyle(de).getPropertyValue('--chrome-bot')),
    padTop: num(cs.paddingTop), padBot: num(cs.paddingBottom),
    fabBottom: fab ? num(getComputedStyle(fab).bottom) : null,
  };
  /* THE DEFECT'S OWN MEASUREMENT: how much of the first in-flow block the fixed strip covers. */
  if (sid) {
    const r = sid.getBoundingClientRect();
    const bandTop = getComputedStyle(seg).position === 'fixed' ? seg.getBoundingClientRect().bottom : 0;
    out.sideIdHiddenTop = +Math.max(0, bandTop - r.top).toFixed(2);
  }
  const host = document.querySelector('#drill deep-drill'), root = host && host.shadowRoot;
  const seat = root && (root.querySelector('.thread') || root.getElementById('adv'));
  if (seat) {
    const scs = getComputedStyle(seat);
    out.seatTop = num(scs.scrollMarginTop);
    out.seatBot = num(scs.scrollMarginBottom);
  }
  const adv = root && root.getElementById('adv');
  if (adv) {
    const acs = getComputedStyle(adv);
    out.advSeatTop = num(acs.scrollMarginTop);
    out.advSeatBot = num(acs.scrollMarginBottom);
  }
  return out;
};

async function pinViewport(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await B.settle(page);
  const real = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  if (real.w !== w || real.h !== h) {
    throw new Error('viewport assert failed: asked ' + w + 'x' + h + ', page reports ' + real.w + 'x' + real.h);
  }
}

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

(async () => {
  const fails = [], errs = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 360, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await B.gotoApp(page, HTML, { hash: '#content-pipeline/walk' });
  await B.enterApp(page);

  /* ===================== THE RELATIONSHIP, IN BOTH ORIENTATIONS ===================== */
  for (const [w, h, orient] of [[360, 844, 'portrait'], [844, 390, 'landscape']]) {
    const g = GAP[orient];
    await pinViewport(page, w, h);
    await tapPane(page, 'drill');            /* the drill's seat is part of what is asserted */
    const m = await page.evaluate(METRICS);
    const tag = '[' + w + 'x' + h + '] ';
    if (!m.ready) { ok(tag + 'metrics readable', false, m.why); continue; }

    /* 1. The published value IS the live bar. Ceil, never floor: reserving less than the bar
          occupies is the defect. */
    ok(tag + 'the published --chrome-top is the live .seg, rounded up (never down)',
      m.varTop === Math.ceil(m.segH), JSON.stringify({ varTop: m.varTop, segH: m.segH }));
    ok(tag + 'the published --chrome-bot is the live .mockcta, rounded up (never down)',
      m.varBot === Math.ceil(m.barH), JSON.stringify({ varBot: m.varBot, barH: m.barH }));

    /* 2. THE X2b DEFECT ITSELF: nothing in flow starts underneath the fixed strip. This is the
          arm that was red on the shipped build, at 5px. */
    ok(tag + 'no content starts under the fixed strip: .side-id hiddenTop is 0 (was 5px)',
      m.sideIdHiddenTop === 0, JSON.stringify({ sideIdHiddenTop: m.sideIdHiddenTop, padTop: m.padTop, segH: m.segH }));
    ok(tag + '.app reserves exactly the strip at the top -- the bar, no gap, no shortfall',
      m.padTop === m.varTop, JSON.stringify({ padTop: m.padTop, varTop: m.varTop }));

    /* 3. The bottom bar, and the FAB that dodges it -- the two constants the audit's list missed. */
    ok(tag + '.app reserves the bottom bar plus its authored ' + g.appBot + 'px gap',
      m.padBot === m.varBot + g.appBot, JSON.stringify({ padBot: m.padBot, varBot: m.varBot, gap: g.appBot }));
    ok(tag + 'the scroll-top FAB clears the bottom bar by its authored ' + g.fab + 'px',
      m.fabBottom === m.varBot + g.fab, JSON.stringify({ fabBottom: m.fabBottom, varBot: m.varBot, gap: g.fab }));

    /* 4. The drill's seat -- the four numbers this wave deleted, reproduced from the measurement.
          69/88 upright and 59/76 on its side must still be what a landing block computes. */
    ok(tag + "the drill's seat is the strip plus " + g.seatTop + 'px (was a typed ' + (Math.ceil(m.segH) + g.seatTop) + ')',
      m.seatTop === m.varTop + g.seatTop, JSON.stringify({ seatTop: m.seatTop, varTop: m.varTop }));
    ok(tag + "the drill's seat clears the bar by " + g.seatBot + 'px (was a typed ' + (Math.ceil(m.barH) + g.seatBot) + ')',
      m.seatBot === m.varBot + g.seatBot, JSON.stringify({ seatBot: m.seatBot, varBot: m.varBot }));
    /* X7's half: the forward control is in that list now. Without a scroll-margin the browser
       seats it flush against a viewport edge the user sees as the top of the mock bar. */
    ok(tag + "the drill's FORWARD CONTROL has the same seat as the content (audit X7)",
      m.advSeatTop === m.seatTop && m.advSeatBot === m.seatBot,
      JSON.stringify({ adv: [m.advSeatTop, m.advSeatBot], content: [m.seatTop, m.seatBot] }));

    console.log('       .seg=' + m.segH + '  .mockcta=' + m.barH + '  -> --chrome-top/bot=' + m.varTop + '/' + m.varBot +
      '  .app pad=' + m.padTop + '/' + m.padBot + '  seat=' + m.seatTop + '/' + m.seatBot + '  fab=' + m.fabBottom);
  }

  /* ===================== 5. THE LAST CONSTANTS ALIVE, AND WHAT THEY CAN HONESTLY PROMISE
     =====================

     THIS ARM SHIPPED OVER-STRICT AND BROKE CI, AND IT BROKE IT BY CONTRADICTING ITS OWN WAVE.
     It demanded `fallback === measured`. But `measured` contains a font-metric term, so a single
     hardcoded fallback can be exactly right on at most ONE platform -- which is the entire thesis
     of the wave this check belongs to, applied to the check itself. It passed on the Windows box
     it was anchored on and failed the Ubuntu gate at both viewports, blocking a deploy.

     WHERE THE VARIANCE ACTUALLY LIVES -- measured, not reasoned about. Both bars are
     `padding + border + max(44px tap floor, the tallest control's line box)`. The only term that
     can move across platforms is how far a control OVERSHOOTS the 44px floor; where the floor
     clamps, there is no font term at all. Same commit, same context (360x844 / 844x390,
     isMobile, dSF2):

       | tallest child            | Windows Chromium 149 | Linux Chromium (pw v1.61.1-noble) |
       | .seg    -> BUTTON.on     | 44 (AT the floor)    | 44 (AT the floor)                 |
       | .mockcta-> BUTTON.mockbtn| 47 (3 OVER)          | 44 (AT the floor)                 |
       | --chrome-top  (portrait/landscape) | 61 / 51    | 61 / 51   -> delta 0              |
       | --chrome-bot  (portrait/landscape) | 72 / 60    | 69 / 57   -> delta 3              |

     So the whole cross-platform delta is 3px, all of it in `--chrome-bot`, all of it one button's
     line box clearing the tap floor on one platform and not the other -- the same 3px in both
     orientations, because it is the same button.

     THE CONTRACT, RESTATED HONESTLY. The fallback is a BEST-EFFORT PRE-JS APPROXIMATION. It is
     used for one frame before chrome-metrics.js runs, and for JS off entirely. Being a few px
     stale there costs a few px of gap or overlap in a frame nobody interacts with. Its job is to
     catch GROSS DRIFT -- somebody restructures a bar and leaves the fallback describing the old
     one -- not to be cross-platform exact, which it cannot be. So: a band.

     THE BAND IS 8px, ANCHORED:
       - 2.7x the 3px delta actually measured between two real platforms;
       - covers a face with ~20% taller metrics than the Windows one (~3px more overshoot at this
         font size) with room to spare;
       - and stays far below any structural change to a bar. Adding a control row costs at least
         the 44px tap floor; the mutant below plants 20px and must go red.
     It does NOT distinguish a one-token padding edit (2-4px) from font variance, and that is
     accepted deliberately: such an edit leaves the app CORRECT (the measured arms above are exact
     and platform-relative, so `--chrome-*` and every consumer follow it), and makes the fallback
     merely a few px stale for one pre-JS frame. Gating a deploy on that would be the same mistake
     in the other direction.

     WHY BOTH VARS ARE BANDED even though `--chrome-top` measured identical on both platforms:
     `.seg`'s tallest child happens to sit AT the floor today. That is a property of the current
     labels and font sizes, not a guarantee -- exactly the kind of platform-anchored reasoning
     that produced this defect. Both bars have the same `max(floor, line box)` shape, so both get
     the same treatment.

     A NOTE ON DIRECTION, recorded rather than asserted: a fallback that is too LOW under-reserves
     and puts content under the bar (the defect this wave exists to remove), while one that is too
     HIGH merely leaves a gap. The committed pair (61/72, 51/60) is the Windows measurement, which
     is the HIGH side of the two platforms measured -- the safe direction. Kept for that reason. */
  const FALLBACK_BAND_PX = 8;

  /* Read the stylesheet's own value by stripping the inline style the module wrote, then hand it
     back. derive() short-circuits when nothing changed, so the restore is done explicitly. */
  const readFallback = async (page) => {
    const f = await page.evaluate(() => {
      const de = document.documentElement;
      const live = {
        top: parseFloat(getComputedStyle(de).getPropertyValue('--chrome-top')),
        bot: parseFloat(getComputedStyle(de).getPropertyValue('--chrome-bot')),
      };
      de.style.removeProperty('--chrome-top');
      de.style.removeProperty('--chrome-bot');
      const cssOnly = {
        top: parseFloat(getComputedStyle(de).getPropertyValue('--chrome-top')),
        bot: parseFloat(getComputedStyle(de).getPropertyValue('--chrome-bot')),
      };
      return { live: live, cssOnly: cssOnly };
    });
    await page.evaluate(() => {
      const de = document.documentElement;
      if (!de.style.getPropertyValue('--chrome-top')) {
        const seg = document.querySelector('.sidebar .seg'), bar = document.querySelector('.sidebar .mockcta');
        de.style.setProperty('--chrome-top', Math.ceil(seg.getBoundingClientRect().height) + 'px');
        de.style.setProperty('--chrome-bot', Math.ceil(bar.getBoundingClientRect().height) + 'px');
      }
    });
    await B.settle(page);
    return f;
  };
  const withinBand = (f) =>
    isFinite(f.cssOnly.top) && isFinite(f.cssOnly.bot) &&
    Math.abs(f.cssOnly.top - f.live.top) <= FALLBACK_BAND_PX &&
    Math.abs(f.cssOnly.bot - f.live.bot) <= FALLBACK_BAND_PX;

  for (const [w, h] of [[360, 844], [844, 390]]) {
    await pinViewport(page, w, h);
    const f = await readFallback(page);
    ok('[' + w + 'x' + h + '] the stylesheet FALLBACK pair is within ' + FALLBACK_BAND_PX + 'px of measured -- close enough for the pre-JS frame, not claiming cross-platform equality',
      withinBand(f),
      JSON.stringify(Object.assign({ band: FALLBACK_BAND_PX }, f,
        { driftTop: f.cssOnly.top - f.live.top, driftBot: f.cssOnly.bot - f.live.bot })));
    console.log('       fallback ' + f.cssOnly.top + '/' + f.cssOnly.bot + '  vs measured ' +
      f.live.top + '/' + f.live.bot + '  drift ' + (f.cssOnly.top - f.live.top) + '/' + (f.cssOnly.bot - f.live.bot) + 'px');
  }

  /* ===== THE TWO MUTANTS: the band must absorb the real thing and still catch the gross thing.
     A stylesheet appended late outranks the media-block declaration by order, so this plants a
     genuine FALLBACK drift and re-reads it through the same path the arm uses. */
  const plantFallback = async (page, dTop, dBot) => {
    const f0 = await readFallback(page);
    await page.evaluate((d) => {
      const s = document.createElement('style');
      s.id = '_fbplant';
      s.textContent = ':root{--chrome-top:' + (d.top + d.dTop) + 'px;--chrome-bot:' + (d.bot + d.dBot) + 'px}';
      document.head.appendChild(s);
    }, { top: f0.cssOnly.top, bot: f0.cssOnly.bot, dTop: dTop, dBot: dBot });
    await B.settle(page);
    const f = await readFallback(page);
    await page.evaluate(() => { const s = document.getElementById('_fbplant'); if (s) s.remove(); });
    await B.settle(page);
    return f;
  };

  await pinViewport(page, 360, 844);
  /* (a) THE CI FAILURE ITSELF, reproduced: Linux measured --chrome-bot 3px under the fallback.
         This is the case that must now be GREEN -- if it is not, the fix does not fix CI. */
  const mReal = await plantFallback(page, 0, 3);
  /* (b) GROSS DRIFT: 20px, well inside "somebody restructured the bar". Must be RED. */
  const mGross = await plantFallback(page, 0, 20);
  const restoredFb = await readFallback(page);
  if (!(withinBand(mReal) && !withinBand(mGross) && withinBand(restoredFb))) {
    console.log('  ABORT [fallback mutants]: the band does not do what it claims.');
    console.log('     -> +3px (the measured Linux delta) should PASS: ' + withinBand(mReal) + ' ' + JSON.stringify(mReal));
    console.log('     -> +20px (gross drift) should FAIL: ' + !withinBand(mGross) + ' ' + JSON.stringify(mGross));
    console.log('     -> and the plant must leave nothing behind: ' + withinBand(restoredFb) + ' ' + JSON.stringify(restoredFb));
    await browser.close();
    return B.finish(1, 'CHROME METRICS: ABORTED (fallback band self-test failed)');
  }
  ok('[mutant] the band ABSORBS the 3px delta that actually failed CI on Ubuntu (fallback ' +
    mReal.cssOnly.bot + ' vs measured ' + mReal.live.bot + ')', true, '');
  ok('[mutant] and still CATCHES a 20px gross drift (fallback ' + mGross.cssOnly.bot +
    ' vs measured ' + mGross.live.bot + ') -- the band cannot swallow a restructured bar', true, '');

  /* ===================== 6. DESKTOP IS NOT IN THIS SYSTEM =====================
     Above 919px neither bar is fixed, so neither steals anything and no rule consumes the pair.
     This is what keeps every desktop baseline and behaviour check out of the blast radius. */
  await pinViewport(page, 1280, 800);
  const d = await page.evaluate(METRICS);
  ok('[1280x800] desktop: the bars are in the sidebar column and steal nothing',
    d.ready && d.varTop === 0 && d.varBot === 0 && d.padTop === 0 && d.padBot === 0,
    JSON.stringify({ varTop: d.varTop, varBot: d.varBot, padTop: d.padTop, padBot: d.padBot, segH: d.segH }));

  /* ===================== 7. THE PLANT -- CAN THIS CHECK FAIL? =====================
     Make the bar taller by the mechanism the app's own landscape block uses (padding), and demand
     that every derived value follows. 61 -> 73 is not an arbitrary number: 73px is what WebKit
     26.5 measured for this strip when its scrollbar reserved space inside it. */
  await pinViewport(page, 360, 844);
  await tapPane(page, 'drill');
  const before = await page.evaluate(METRICS);
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = '_chromeplant';
    s.textContent = '.sidebar .seg{padding-top:20px!important}';
    document.head.appendChild(s);
  });
  let planted = null;
  try {
    planted = await B.pollFor(() => page.evaluate(METRICS),
      (m) => m.ready && m.varTop === Math.ceil(m.segH) && m.segH > before.segH,
      B.ACT_MS, 'the derived --chrome-top to follow a taller bar');
  } catch (e) { planted = e.last || null; }
  await page.evaluate(() => { const s = document.getElementById('_chromeplant'); if (s) s.remove(); });
  await B.settle(page); await B.settle(page);
  const restored = await B.pollFor(() => page.evaluate(METRICS),
    (m) => m.ready && m.varTop === before.varTop, B.ACT_MS, 'the bar to go back').catch((e) => e.last);

  const grew = planted && planted.segH > before.segH;
  const followed = grew &&
    planted.varTop === Math.ceil(planted.segH) &&
    planted.padTop === planted.varTop &&
    planted.sideIdHiddenTop === 0 &&
    planted.seatTop === planted.varTop + GAP.portrait.seatTop;
  if (!followed) {
    console.log('  ABORT plant: a taller bar did NOT move the derived values -- this check cannot fail.');
    console.log('     -> before=' + JSON.stringify(before) + '\n     -> planted=' + JSON.stringify(planted));
    await browser.close();
    return B.finish(1, 'CHROME METRICS: ABORTED (self-test failed)');
  }
  ok('[plant] a taller strip (' + before.segH + ' -> ' + planted.segH + 'px, the height WebKit reported) moves every derived value with it',
    true, '');
  console.log('       planted: --chrome-top=' + planted.varTop + '  .app padTop=' + planted.padTop +
    '  seat=' + planted.seatTop + '  hiddenTop=' + planted.sideIdHiddenTop);
  ok('[plant] and it goes back when the cause does (no latched state)',
    restored && restored.varTop === before.varTop && restored.padTop === before.padTop,
    JSON.stringify({ before: before.varTop, restored: restored && restored.varTop }));

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('CHROME METRICS: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  return B.finish(pass ? 0 : 1);
})().catch(async (e) => {
  console.log('CHROME METRICS: FAIL (harness error: ' + (e && e.message) + ')');
  return B.finish(1);
});
