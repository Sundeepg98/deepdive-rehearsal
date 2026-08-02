/* ===== THE FIRST CLICK MUST LAND =====
 *
 * WHAT THIS GUARDS, AND WHY IT IS NOT THEORETICAL.
 * Every layer this app paints over the viewport -- the boot splash and the three overlays -- used
 * to keep HIT-TESTING while it was invisible or fading, and swallow the user's input:
 *
 *   #_bootsplash   `_bs-done` starts a 400ms fade. A `visibility` transition to `hidden` holds
 *                  `visible` for the WHOLE 400ms, and the element is position:fixed; inset:0;
 *                  z-index:9999 with no pointer-events. A real trusted click at +87ms landed on
 *                  #_bootsplash. This fired for EVERY user on EVERY load -- the returning one and
 *                  the deep-linker never see an overlay at all. At z-index 9999 it also outranked
 *                  the overlays (--z-popup = 1000), so the first-run start screen's OWN "Start"
 *                  CTA was dead for 400ms.
 *   .ix-ov         close() dropped .vis immediately but held .open (=> display:flex,
 *                  pointer-events:auto) for 220ms. Clicks AND keys eaten across the whole viewport.
 *   .mock-ov       ovHide() holds .open for up to 500ms.
 *   .cram-ov       likewise.
 *   focus          overlay-focus restore() only re-focused the CAPTURED TRIGGER -- and when an
 *                  overlay opens ITSELF that is <body>, which is not focusable, so focus stayed
 *                  parked in the overlay's filter <input>. shell.js returns early on
 *                  `activeTag === 'input'` BEFORE it reaches the dialog gate, so every keystroke
 *                  was swallowed until the browser reset activeElement at display:none.
 *
 * THE INVARIANT, one line:  `.open` = PRESENT.  `.open:not(.closing)` = INTERACTIVE.
 *
 * AND ITS MIRROR, added by W1.5 as section 5: a layer must not OPEN where it has nothing to mean.
 * Section 2 already asserts the global keymap stays suppressed UNDER an open modal; the same key
 * map must stay suppressed ON THE HOME, which has no current topic -- `p` was measured opening the
 * per-topic Session progress panel on the BOOT constant there. Same question, same instrument, one
 * route over.
 *
 * AND THE OTHER HALF OF IT, added by W1.5 cycle 3 as section 6: a surface must not PRINT a promise
 * the route it is printed on cannot keep. Guarding the key left the shortcuts overlay advertising
 * `P` under a head that reads "Anywhere", on the one route where it now does nothing -- and the
 * home is where that overlay is opened from. Same instrument again: real keys, real routes, and
 * the app's own rendered rows as the list of what has to be true.
 *
 * HOW IT MEASURES -- this is the part that matters.
 * This repo has shipped FIVE checks that could not fail. The reason this one can:
 *   - It dispatches REAL, HIT-TESTED input. `el.click()` bypasses hit-testing entirely and reports
 *     success on a provably unclickable button; that is precisely how this bug class survived. We
 *     use page.mouse.click (a genuine CDP input event) and page.keyboard.press, and corroborate
 *     with document.elementFromPoint, which IS the browser's own hit-test.
 *   - It counts PAINTED PIXELS, never nodes. On a page with opacity:0 on <body>, innerText reports
 *     1464 chars and offsetParent reports 9 visible buttons -- both lie. See test/_pixels.cjs.
 *   - It carries an ANTI-REGRESSION arm: under a genuinely OPEN modal the keymap must STILL be
 *     suppressed. A "fix" that gates on .vis passes the first arm and fails this one -- and .vis
 *     is exactly what a plausible fix reaches for, because only .ix-ov sets it (a genuinely open
 *     Mock Run has .open and NO .vis).
 *
 * IT FAILS ON THE PRE-FIX BUILD. That was verified before it was committed. A check that has never
 * failed is not a check.
 *
 * Usage: node test/overlay_deadzone.cjs <deliverable.html>   (CHROME=<path> for the browser) */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const PX = require('./_pixels.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* THE BOOT-WINDOW GATE, verbatim from src/scripts/app/shell.js. Section 6's boot arm seeds a
   mutant by deleting it from a COPY of the build; the copy is written to the OS temp dir, used,
   and removed in the same run. If this string ever stops matching the shipped source the seed
   cannot land, and the check ABORTS rather than reporting a green it did not earn. */
const BOOT_GATE = 'if (!(window.ViewManager && window.ViewManager.routed && window.ViewManager.routed())) return;';
const TARGET = '.seg button[data-tab="drill"]';   /* a real thing a user taps at first paint */

const fails = [];
const notes = [];
function chk(name, ok, detail) {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name + (detail ? ' [' + String(detail).slice(0, 120) + ']' : ''));
}

/* records the element a REAL click actually reached (capture phase = the true hit-test result) */
const RECORDER = () => {
  window.__hit = null;
  document.addEventListener('click', (e) => {
    const t = e.target;
    window.__hit = {
      id: t.id || '',
      cls: String(t.className || '').split(' ')[0],
      tab: t.getAttribute ? t.getAttribute('data-tab') : null,
      inOverlay: !!(t.closest && t.closest('.ix-ov,.mock-ov,.cram-ov,.nt-ov,.xd-ov')) || t.id === '_bootsplash',
    };
  }, true);
};

async function realClick(page, sel) {
  await page.evaluate(() => { window.__hit = null; });
  const box = await page.locator(sel).boundingBox();
  if (!box) return { id: '(no box)', inOverlay: true };
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return page.evaluate(() => window.__hit);
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());

  /* ================= 1. THE BOOT SPLASH -- every user, every load ================= */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    /* a RETURNING user: no start screen, so the splash is the ONLY layer in front of first paint */
    await page.addInitScript(() => {
      try {
        localStorage.setItem('ddr.v1.progress.saga', JSON.stringify(
          { got: 1, shk: 0, done: 1, tot: 21, revisit: [], cards: {}, cv: 2, ts: Date.now() }));
      } catch (e) {}
    });
    await page.addInitScript(RECORDER);
    /* an rAF poller from document_start: the frame the fade begins. A stopwatch would be a bet.
     *
     * THE SECOND EXIT IS NOT OPTIONAL, and its absence was a 60-SECOND HANG. This loop used to end
     * only on "splash exists AND carries _bs-done". If the splash is REMOVED before any frame
     * catches that class, `sp` is null on every subsequent tick, __fading never flips, and the
     * waitForFunction below burns its full timeout and takes the check down with a bare
     * `Node.js v25.2.1` -- no stdout, no reason. The removed-splash case is the one the comment at
     * the `if (css)` branch below already calls "a pass by construction"; the wait simply could not
     * REACH it. So: splash absent and the document finished loading -> there is nothing left to
     * fade, exit and let that branch do its job. An element that is not in the DOM cannot hit-test,
     * so the assertion this skips is vacuous, and the original branch is untouched for every case
     * where the splash IS present -- this widens the exit, it does not weaken the assertion.
     *
     * MEASURED (2026-07-29, W4): byte-identical deliverable, in-gate PASS then FAIL then FAIL,
     * while the same command standalone passed 3/3 -- a frame-scheduling race that only surfaces
     * under gate concurrency. */
    await page.addInitScript(() => {
      const tick = () => {
        const sp = document.getElementById('_bootsplash');
        if (sp && sp.classList.contains('_bs-done')) { window.__fading = true; return; }
        if (!sp && document.readyState === 'complete') { window.__fading = true; return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(B.fileUrl(HTML), { timeout: B.NAV_MS, waitUntil: 'commit' });
    await page.waitForFunction(() => window.__fading === true, null, { timeout: B.READY_MS });

    const css = await page.evaluate(() => {
      const sp = document.getElementById('_bootsplash');
      if (!sp) return null;
      const c = getComputedStyle(sp);
      return { pe: c.pointerEvents, vis: c.visibility, op: +(+c.opacity).toFixed(2), z: c.zIndex };
    });
    /* The splash may already be REMOVED on a fast machine -- that is a pass by construction. But if
       it is still painted, it MUST NOT hit-test. */
    if (css) {
      chk('boot splash: pointer-events:none the instant it starts fading',
        css.pe === 'none',
        'pointer-events=' + css.pe + ' while visibility=' + css.vis + ', opacity=' + css.op + ', z-index=' + css.z +
        ' -- it is still painted AND still eating clicks');
    } else {
      notes.push('  PASS  boot splash: already removed from the DOM (nothing to eat the click)');
    }

    /* THE FIRST CLICK OF THE SESSION. A real, hit-tested one, aimed at whatever this build actually
       paints at first paint -- the home's primary CTA, or (on a pre-home build) the drill tab. The
       point is not WHICH control it is; it is that the user's first tap is not eaten by a layer
       they did not ask for. */
    const firstTarget = await page.evaluate((t) =>
      (document.querySelector('.hm-cta') ? '.hm-cta' : t), TARGET);
    const before = await page.evaluate(() => location.hash);
    const hit = await realClick(page, firstTarget);
    chk('boot splash: the FIRST real click of the session reaches its target (' + firstTarget + ')',
      !!hit && !hit.inOverlay,
      hit ? ('the click landed on #' + (hit.id || hit.cls) + ' instead') : 'the click reached NOTHING');
    await B.settle(page);
    const hash = await page.evaluate(() => location.hash);
    chk('boot splash: ...and that click actually did something',
      hash !== before, 'the hash never moved from "' + before + '" -- the click was absorbed');
    await ctx.close();
  }

  /* ================= 2. EVERY [role=dialog][aria-modal] -- open, then closing ================= */
  /* EVERY overlay's close button is `.mock-x` -- cram's too, despite its container being .cram-ov.
     (The app's own closeTransientOverlays uses `.mock-x,.cram-x` for the same reason.) Resolved
     inside the page BY NAME, never shipped across as source and rebuilt with new Function(). */
  const DIALOGS = [
    { name: 'index',    sel: '.ix-ov', open: () => window.IndexOverlay.open() },
    { name: 'mock run', sel: '#mockov', open: () => document.getElementById('mockopen').click() },
    { name: 'cram',     sel: '#cramov', open: () => document.getElementById('cramopen').click() },
  ];
  const closeIn = (nm) => {
    if (nm === 'index') { window.IndexOverlay.close(); return true; }
    const id = nm === 'mock run' ? 'mockov' : 'cramov';
    const ov = document.getElementById(id);
    const x = ov && ov.querySelector('.mock-x,.cram-x');
    if (!x) return false;
    x.click();
    return true;
  };

  for (const d of DIALOGS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(RECORDER);
    await B.gotoApp(page, HTML, { hash: '#walk' });
    /* wait the splash OUT, so we are measuring this dialog and not the splash on top of it */
    await page.waitForFunction(() => !document.getElementById('_bootsplash'), null, { timeout: 20000 }).catch(() => {});
    await B.settle(page);

    const exists = await page.evaluate((s) => !!document.querySelector(s) || true, d.sel);
    if (!exists) continue;

    await page.evaluate(d.open);
    await B.settle(page);
    await page.waitForTimeout(120);

    /* ---- WHILE GENUINELY OPEN ---- */
    const openState = await page.evaluate((s) => {
      const ov = document.querySelector(s);
      if (!ov || !ov.classList.contains('open')) return null;
      return { pe: getComputedStyle(ov).pointerEvents, cls: ov.className };
    }, d.sel);
    if (!openState) { chk('[' + d.name + '] opens', false, 'it never opened; nothing was measured'); await ctx.close(); continue; }

    chk('[' + d.name + '] while OPEN: it hit-tests (pointer-events:auto)',
      openState.pe === 'auto', 'pointer-events=' + openState.pe);

    /* ANTI-REGRESSION: the global keymap must stay SUPPRESSED under an open modal. A .vis-based
       "fix" passes everything else in this file and fails HERE. */
    const hashOpen = await page.evaluate(() => location.hash);
    await page.keyboard.press('w');
    await B.settle(page);
    const hashAfter = await page.evaluate(() => location.hash);
    chk('[' + d.name + '] while OPEN: the global keymap is SUPPRESSED (anti-regression)',
      hashOpen === hashAfter,
      '"w" switched the pane underneath an open modal: ' + hashOpen + ' -> ' + hashAfter);

    /* ---- NOW CLOSE IT, AND SAMPLE THE FADE-OUT ---- */
    const during = await page.evaluate(([s, nm]) => new Promise((res) => {
      /* A MISSING ELEMENT MUST BECOME A CLEAN FAILURE, NEVER A CRASH. The gate reports a check by
         its last line; a stack trace prints a red with no stated cause, and a red with no cause
         reads as a flake -- which is exactly the reflex that let a compiler bug destroy 608 items
         per build while the gate sat green. */
      const close = () => {
        if (nm === 'index') { window.IndexOverlay.close(); return true; }
        const ov2 = document.getElementById(nm === 'mock run' ? 'mockov' : 'cramov');
        const x = ov2 && ov2.querySelector('.mock-x,.cram-x');
        if (!x) return false;
        x.click();
        return true;
      };
      const ov = document.querySelector(s);
      const el = document.querySelector('.seg button[data-tab="drill"]');
      if (!ov || !el) return res({ err: "missing " + (!ov ? s : "the drill tab") });
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
      const out = [];
      const snap = (t) => {
        const top = document.elementFromPoint(cx, cy);
        const a = document.activeElement;
        out.push({
          t,
          pe: getComputedStyle(ov).pointerEvents,
          topIsOverlay: !!(top && (ov.contains(top) || top === ov)),
          focusInOverlay: ov.contains(a),
          activeTag: (a && a.tagName || '').toLowerCase(),
        });
      };
      if (!close()) return res({ err: 'no close button (.mock-x/.cram-x) inside ' + s });
      snap(0);
      [60, 150].forEach((dt) => setTimeout(() => snap(dt), dt));
      setTimeout(() => res(out), 200);
    }), [d.sel, d.name]);

    if (during && during.err) {
      chk('[' + d.name + '] can be closed at all', false, during.err);
      await ctx.close();
      continue;
    }

    const bad = during.filter((x) => x.pe !== 'none');
    chk('[' + d.name + '] while CLOSING: pointer-events:none at +0/60/150ms',
      bad.length === 0,
      bad.map((b) => '+' + b.t + 'ms pe=' + b.pe).join(', '));

    const eaten = during.filter((x) => x.topIsOverlay);
    chk('[' + d.name + '] while CLOSING: elementFromPoint does NOT return the overlay',
      eaten.length === 0,
      eaten.map((b) => '+' + b.t + 'ms the overlay is still the hit-test target').join(', '));

    const stuck = during.filter((x) => x.focusInOverlay);
    chk('[' + d.name + '] while CLOSING: focus has LEFT the dialog',
      stuck.length === 0,
      stuck.map((b) => '+' + b.t + 'ms activeElement is <' + b.activeTag + '> inside the closing overlay' +
        (b.activeTag === 'input' ? ' -- shell.js bails on <input> BEFORE the dialog gate, so keys are eaten' : '')).join(', '));

    /* a REAL click and a REAL key, immediately after close() -- the two things a user actually does */
    const closeNow = (nm) => page.evaluate((n) => {
      if (n === 'index') { window.IndexOverlay.close(); return; }
      const ov2 = document.getElementById(n === 'mock run' ? 'mockov' : 'cramov');
      const x = ov2 && ov2.querySelector('.mock-x,.cram-x');
      if (x) x.click();
    }, nm);

    await page.evaluate(d.open); await B.settle(page); await page.waitForTimeout(100);
    await closeNow(d.name);
    const hit = await realClick(page, TARGET);
    chk('[' + d.name + '] a REAL click right after close() reaches its target',
      !!hit && !hit.inOverlay && hit.tab === 'drill',
      hit ? ('it landed on #' + (hit.id || hit.cls) + ' -- the closing overlay ate it') : 'it reached NOTHING');

    await page.evaluate(d.open); await B.settle(page); await page.waitForTimeout(100);
    await closeNow(d.name);
    const hBefore = await page.evaluate(() => location.hash);
    await page.keyboard.press('r');                              /* r = the System Map pane */
    await B.settle(page);
    const hAfter = await page.evaluate(() => location.hash);
    chk('[' + d.name + '] a REAL keystroke right after close() is not swallowed',
      hBefore !== hAfter, 'hash never changed from "' + hBefore + '" -- the key was eaten');

    await ctx.close();
  }

  /* ================= 3. NO UNREQUESTED MODAL IN FRONT OF FIRST PAINT ================= */
  /* THE REGRESSION GUARD THE BRIEF ASKED FOR. A brand-new user, a returning user, and a deep
     linker must all reach a usable app with NOTHING modal in the way that they did not ask for.
     This is what makes it impossible to re-introduce a boot-opening overlay. */
  const ARRIVALS = [
    { name: 'cold (brand-new browser)', seed: null, hash: '' },
    { name: 'returning (has progress)', seed: true, hash: '' },
    { name: 'deep link (#saga/drill)', seed: true, hash: '#saga/drill' },
  ];
  for (const a of ARRIVALS) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    if (a.seed) {
      await page.addInitScript(() => {
        try {
          localStorage.setItem('ddr.v1.progress.saga', JSON.stringify(
            { got: 14, shk: 7, done: 21, tot: 21, revisit: ['x'], cards: {}, cv: 2, ts: Date.now() }));
          localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: 'saga', view: 'drill' }));
        } catch (e) {}
      });
    }
    await page.addInitScript(RECORDER);
    await page.goto(B.fileUrl(HTML, a.hash), { timeout: B.NAV_MS, waitUntil: 'load' });
    await page.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
    await page.waitForFunction(() => !document.getElementById('_bootsplash'), null, { timeout: 20000 }).catch(() => {});
    await B.settle(page);
    await page.waitForTimeout(250);          /* the old gate opened the overlay at +30ms */

    const modal = await page.evaluate(() => {
      const ov = document.querySelector('.ix-ov.open,.mock-ov.open,.cram-ov.open,.nt-ov.open,.xd-ov.open');
      return ov ? (ov.id || ov.className) : null;
    });
    chk('[arrival: ' + a.name + '] nothing modal is in front of first paint',
      modal === null, 'an overlay opened itself: ' + modal);

    /* AND THE SCREEN IS NOT BLANK. Painted pixels -- a node counter reports 276 "visible" nodes on
       a blank page and cannot fail. */
    const px = PX.ink(await page.screenshot());
    chk('[arrival: ' + a.name + '] the app actually PAINTS (>2% ink, >20 colours)',
      px.inkPct > 2 && px.distinct > 20,
      'ink=' + px.inkPct + '% distinct=' + px.distinct + ' -- the page rendered nothing');

    /* and the first tap lands */
    const target = a.hash ? TARGET : (await page.evaluate(() => !!document.querySelector('.hm-cta')) ? '.hm-cta' : TARGET);
    const hit = await realClick(page, target);
    chk('[arrival: ' + a.name + '] the first real click lands on its target',
      !!hit && !hit.inOverlay, hit ? ('it landed on #' + (hit.id || hit.cls)) : 'it reached NOTHING');
    await ctx.close();
  }

  /* ================= 4. REDUCED MOTION STILL RENDERS ================= */
  /* The blank-page class of bug, measured in PIXELS. body{opacity:0} yields 0% ink and 1 colour
     while innerText still reports over a thousand characters. */
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: theme });
    const page = await ctx.newPage();
    await page.goto(B.fileUrl(HTML), { timeout: B.NAV_MS, waitUntil: 'load' });
    await page.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
    await page.waitForFunction(() => !document.getElementById('_bootsplash'), null, { timeout: 20000 }).catch(() => {});
    await B.settle(page);
    const px = PX.ink(await page.screenshot());
    chk('[reduced-motion/' + theme + '] the home PAINTS PIXELS (>2% ink, >20 colours)',
      px.inkPct > 2 && px.distinct > 20,
      'ink=' + px.inkPct + '% distinct=' + px.distinct);
    await ctx.close();
  }

  /* ================= 5. THE GLOBAL KEYMAP MUST NOT OPEN A PER-TOPIC PANEL ON THE HOME =========
   * The sibling of section 2's suppression arm, one route over. There the global keymap must stay
   * quiet UNDER an open modal; here it must stay quiet on a route that has no topic for it to
   * mean. shell.js's own titled rule ("THE HOME IS A DESTINATION, NOT A MODAL") says it: on the
   * home there is no current topic view, so the topic keys "must not silently act on the BOOT
   * topic -- they retarget to the resume topic, or do nothing". `w` was gated when it was measured
   * opening the drill of a topic the user never chose, and `n` carries `&& !onHome` for the same
   * reason. `p` FELL THROUGH. Measured on the shipped build at 390x844, home route, seeded
   * resume topic: one press opened #sessov -- "Session progress" for the BOOT constant.
   *
   * WHY THIS FILE. It already owns the question "did a layer act when it had no business acting",
   * it already drives trusted keys and reads dialog open-state, and its section-2 arm is the same
   * assertion in the other context. No new instrument is built for a defect an existing one is
   * shaped for.
   *
   * THREE ARMS, and the second two are what keep the first from being free:
   *   a) on the home, `p` opens nothing and moves no route;
   *   b) THE PROBE CAN SEE AN OPEN PANEL -- the same reader, on the same page, must report the
   *      panel when it IS open, or (a) is a green from a blind probe;
   *   c) `p` STILL WORKS off the home, so the guard cannot be "fixed" by deleting the shortcut.
   * Watched RED with the guard removed: (a) fails with sessov open on the boot topic. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    /* a RETURNING user whose resume topic is NOT the boot topic -- so "it opened on the boot
       constant" is distinguishable from "it opened on the topic I was in" */
    await page.addInitScript(() => {
      try {
        localStorage.setItem('ddr.v1.progress.saga', JSON.stringify(
          { got: 14, shk: 7, done: 21, tot: 21, revisit: ['x'], cards: {}, cv: 2, ts: Date.now() }));
        localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: 'saga', view: 'drill' }));
      } catch (e) {}
    });
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.settle(page);

    const OPEN = () => ({
      view: document.documentElement.dataset.view,
      hash: location.hash,
      dialogs: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
        .filter((d) => d.classList.contains('open') && !d.classList.contains('closing'))
        .map((d) => d.id || d.className),
      topic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current())
        ? TopicRegistry.current().id : null,
    });

    const home0 = await page.evaluate(OPEN);
    chk('[home keymap] the arm starts on the #home route with nothing open',
      home0.view === 'home' && home0.dialogs.length === 0, JSON.stringify(home0));

    await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    await page.keyboard.press('p');
    await B.settle(page);
    await page.waitForTimeout(250);          /* the panel's own open animation, given room to lose */
    const afterP = await page.evaluate(OPEN);
    chk('[home keymap] `p` on the home opens NO per-topic panel (it opened Session progress on the boot topic)',
      afterP.dialogs.length === 0,
      'opened ' + afterP.dialogs.join(',') + ' with TopicRegistry.current()=' + afterP.topic +
      ' -- a topic the user never chose; the resume topic is saga');
    chk('[home keymap] ...and `p` on the home does not move the route either',
      afterP.view === 'home' && afterP.hash === home0.hash,
      JSON.stringify({ before: home0.hash, after: afterP.hash, view: afterP.view }));

    /* (b) THE PROBE IS NOT BLIND. Open the panel by its own control and read it with the same
       reader; a green above is worth nothing if this comes back empty too. */
    await page.evaluate(() => { const b = document.getElementById('sessopen'); if (b) b.click(); });
    await B.settle(page);
    await page.waitForTimeout(250);
    const planted = await page.evaluate(OPEN);
    chk('[home keymap/control] the same probe DOES report the panel when it is genuinely open',
      planted.dialogs.length > 0,
      'the reader saw nothing after #sessopen was clicked -- every assertion above is free');
    await ctx.close();

    /* (c) THE SHORTCUT STILL WORKS WHERE IT MEANS SOMETHING. */
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page2 = await ctx2.newPage();
    await B.gotoApp(page2, HTML, { hash: '#saga/drill' });
    await B.settle(page2);
    await page2.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    await page2.keyboard.press('p');
    await B.settle(page2);
    await page2.waitForTimeout(250);
    const onTopic = await page2.evaluate(OPEN);
    chk('[home keymap] `p` STILL opens the session panel on a TOPIC route (the guard is a scope, not a deletion)',
      onTopic.view !== 'home' && onTopic.dialogs.length > 0,
      JSON.stringify(onTopic));
    await ctx2.close();
  }

  /* ================= 6. "ANYWHERE" IS A CLAIM, AND THE HOME HAS TO HONOUR IT ==================
   * Section 5 guards the KEY. This guards the SENTENCE the app prints about the key, which is a
   * different thing and was left false by the fix above.
   *
   * THE DEFECT. keyboard-overlay.js rendered, under a section headed "Anywhere":
   *     P -- Session progress -- where you're weak, what to drill next
   * The Keys action in the home's own rail opens that overlay, and `?` opens it too, so the home
   * both PRINTS the promise and -- since W1.5 cycle 1 guarded `p` there -- is the one route that
   * cannot keep it. `N` sat one row above in the same state (`&& !onHome`, pre-existing) and
   * `[` / `]` two rows above that (`if (key === '[' || key === ']') return;` on the home). This
   * repo's own rule is that a surface may not print a claim it cannot derive; three rows of its
   * keyboard help were doing exactly that. All three now live under "While you're in a topic".
   *
   * WHY THE ARM IS BUILT THIS WAY. "Read the rows and assert each advertised key does something"
   * is the obvious form and it is wrong in both directions: `H` does nothing observable on the
   * home because you are ALREADY home, `Esc` does nothing because nothing is open, and neither is
   * a broken promise. So every row under "Anywhere" carries a DECLARED CLAIM here, the table is
   * cross-checked against the rendered overlay BOTH WAYS -- a new row with no claim ABORTS the
   * check, a claim no row matches ABORTS it -- and each claim is then DRIVEN with trusted keys on
   * the #home route. A row cannot be added to "Anywhere" without someone stating what it does
   * there, and a row cannot be moved out of it without this noticing.
   *
   * AND THE MOVE IS PROVED IN BOTH DIRECTIONS, so "in a topic" is earned rather than used as an
   * excuse: each relocated key must be DEAD on the home AND ALIVE on a topic route. A qualifier
   * attached to a key that works everywhere is just as false as "Anywhere" on one that does not.
   *
   * CTRL+P IS NOW DRIVEN, NOT DECLARED. Cycle 3 recorded it as a 'chord' and skipped it: it is
   * served by print-qa.js's own listener rather than by shell.js's map (whose MODIFIER GUARD
   * blocks every Ctrl-without-Alt), and driving it opens a popup window. But an undriven claim is
   * a claim nobody checked, and the thing cycle 3 recorded UNDER that claim was a live defect --
   * openPrint() reads TopicRegistry.current(), the BOOT constant on a route with no topic, so
   * Ctrl+P on the home suppressed the user's own browser print and built a printable Q&A for a
   * topic they never chose. Cycle 4 fixed the module and moved the row in with the other
   * topic-scoped keys, so the row is now driven BOTH WAYS like the rest: window.open is stubbed on
   * every page this section creates (the popup becomes a STRING this check can read) and a
   * window-level listener records defaultPrevented after every document handler has seen the event
   * (window bubble runs last), so "the browser's own print is left alone on the home" is measured
   * rather than assumed.
   *
   * AND THE BOOT WINDOW, at the end of this section: the same question one moment earlier. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    /* Stubs window.open into a recorder and watches what happens to the Ctrl+P event's default.
       Installed on EVERY page this section drives, so the other rows additionally prove they open
       no print window either. Nothing else in src/ calls window.open (grep: one call site, in
       print-qa.js), so the stub is inert for every claim but this one. */
    const PRINT_PROBE = () => {
      window.__print = { opens: 0, title: null, len: 0, prevented: null };
      window.open = function () {
        window.__print.opens++;
        var buf = '';
        return {
          document: {
            open: function () {},
            write: function (s) { buf += s; },
            close: function () {
              window.__print.len = buf.length;
              var m = /<title>([\s\S]*?)<\/title>/i.exec(buf);
              window.__print.title = m ? m[1] : null;
            },
          },
          focus: function () {}, print: function () {}, close: function () {},
        };
      };
      window.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
          window.__print.prevented = e.defaultPrevented;
        }
      }, false);
    };

    const SNAP = () => ({
      view: document.documentElement.dataset.view || null,
      hash: location.hash,
      density: document.documentElement.dataset.density || 'default',
      focusMode: !!(document.querySelector('.app')
        && document.querySelector('.app').classList.contains('_focus-mode')),
      tour: !!(window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()),
      /* WHAT COUNTS AS OPEN HERE, and why it is not the `.open:not(.closing)` reader section 5
         uses. The search overlay is BUILT IN JS and driven by an INLINE display, with no `.open`
         class anywhere (search-overlay.js: overlayEl.style.display = 'flex') -- so the class reader
         comes back empty while that dialog is on screen and `/` reads as dead when it is not. This
         reads the element instead of a convention: a [role=dialog][aria-modal] with live client
         rects that is not mid-close. Caught by this arm going red on `/` alone while `\` and `?`
         passed beside it, which is the shape of a blind probe rather than a broken app. */
      dialogs: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
        .filter((d) => d.getClientRects().length && !d.classList.contains('closing')
          && getComputedStyle(d).display !== 'none')
        .map((d) => d.id || String(d.className).split(' ')[0]),
      print: window.__print
        ? { opens: window.__print.opens, title: window.__print.title, len: window.__print.len,
          prevented: window.__print.prevented }
        : null,
      /* what a printable sheet built HERE would have to be titled, read off the app rather than
         typed, so "the CURRENT topic's sheet" is checked against the current topic */
      topicTitle: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current())
        ? TopicRegistry.current().identity.title : null,
    });

    /* one fresh page per key: density lands on documentElement, focus mode on .app and the tour
       latches, so a shared page would let one key's effect answer for the next one's */
    const drive = async (press, opts) => {
      const p = await ctx.newPage();
      await p.addInitScript(PRINT_PROBE);
      await B.gotoApp(p, HTML, { hash: (opts && opts.hash) || '#home' });
      await B.settle(p);
      if (opts && opts.pre) {
        await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
        await p.keyboard.press(opts.pre);
        await B.settle(p);
        await p.waitForTimeout(250);
      }
      const before = await p.evaluate(SNAP);
      if (!opts || !opts.pre) {
        await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
      }
      await p.keyboard.press(press);
      await B.settle(p);
      await p.waitForTimeout(250);
      const after = await p.evaluate(SNAP);
      await p.close();
      return { before, after };
    };

    /* ---- what the overlay actually renders, read FROM THE HOME ---- */
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.settle(page);
    const ov = await page.evaluate(async () => {
      if (typeof openKeys === 'function') openKeys();
      await new Promise((r) => setTimeout(r, 250));
      const host = document.querySelector('#keyov deep-keyboard');
      const root = host && host.shadowRoot;
      if (!root) return { err: 'the shortcuts overlay did not open on the #home route' };
      return {
        secs: [...root.querySelectorAll('.ks-sec')].map((s) => ({
          head: ((s.querySelector('.ks-h') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
          rows: [...s.querySelectorAll('.ks-row, .ks-row2')].map((r) => {
            const kbds = [...r.querySelectorAll('kbd')].map((k) => k.textContent.trim());
            /* an "or" row lists ALTERNATIVES for one act, so it is identified by its first key */
            const ks = r.querySelector('.ks-or') ? kbds.slice(0, 1) : kbds;
            return { id: ks.join('+').toUpperCase(),
              text: (r.textContent || '').replace(/\s+/g, ' ').trim() };
          }),
        })),
      };
    });
    await page.close();

    if (ov.err) {
      chk('[anywhere] the shortcuts overlay opens on the home, where its Keys action lives', false, ov.err);
    } else {
      const anywhere = ov.secs.filter((s) => /^anywhere$/i.test(s.head));
      const scoped = ov.secs.filter((s) => /\bin a topic\b/i.test(s.head));
      chk('[anywhere] the overlay still has exactly one "Anywhere" section and one topic-scoped section',
        anywhere.length === 1 && scoped.length === 1,
        JSON.stringify(ov.secs.map((s) => s.head)));

      /* THE DECLARED CLAIMS. `expect` names what the HOME must show after the key is pressed. */
      const CLAIMS = {
        '/': { press: '/', expect: 'dialog', what: 'opens the search overlay' },
        '\\': { press: '\\', expect: 'dialog', what: 'opens the Topic index' },
        '?': { press: '?', expect: 'dialog', what: 'brings up the shortcuts list itself' },
        H: { press: 'h', expect: 'home', what: 'goes home -- on the home you are already there, so this is proved FROM a topic route too' },
        F: { press: 'f', expect: 'focusMode', what: 'toggles focus mode' },
        G: { press: 'g', expect: 'tour', what: 'starts the guided tour' },
        D: { press: 'd', expect: 'density', what: 'cycles spacing density' },
        ESC: { press: 'Escape', expect: 'closes', pre: '\\', what: 'closes an open panel -- driven WITH one open, since that is the whole claim' },
      };
      /* the FOUR rows the fix moved, and what each must do where it now says it works. Ctrl+P
         joined them in cycle 4: the row is identical in kind to P one line above it -- it names
         "this topic's probes" on a route that has no topic -- and it is now driven rather than
         declared. */
      const SCOPED = {
        '[+]': { press: '[', expect: 'route', hash: '#event-driven/walk', what: 'steps to the previous topic' },
        N: { press: 'n', expect: 'route', hash: '#event-driven/walk', what: 'goes to the next step the dock is pointing at' },
        P: { press: 'p', expect: 'dialog', hash: '#saga/drill', what: 'opens Session progress for the topic you are in' },
        'CTRL+P': { press: 'Control+p', expect: 'print', hash: '#saga/drill',
          what: 'builds the printable Q&A for the topic you are in' },
      };

      const rows = anywhere.length ? anywhere[0].rows : [];
      const ids = rows.map((r) => r.id);
      const missing = ids.filter((i) => !CLAIMS[i]);
      const stale = Object.keys(CLAIMS).filter((k) => ids.indexOf(k) === -1);
      chk('[anywhere] every row under "Anywhere" has a declared claim here, and every claim still has a row',
        missing.length === 0 && stale.length === 0,
        'undeclared rows: ' + JSON.stringify(missing) + '  claims with no row: ' + JSON.stringify(stale));

      const scopedIds = scoped.length ? scoped[0].rows.map((r) => r.id) : [];
      const strayed = Object.keys(SCOPED).filter((k) => scopedIds.indexOf(k) === -1);
      chk('[anywhere] the four keys that need a topic are listed under the topic-scoped head, not under "Anywhere"',
        strayed.length === 0 && Object.keys(SCOPED).every((k) => ids.indexOf(k) === -1),
        'not in the topic section: ' + JSON.stringify(strayed) + '  still under Anywhere: '
        + JSON.stringify(Object.keys(SCOPED).filter((k) => ids.indexOf(k) !== -1)));

      /* ---- DRIVE every Anywhere claim on #home ---- */
      let driven = 0;
      for (const id of ids) {
        const c = CLAIMS[id];
        if (!c || !c.press) continue;                       /* the declared chord */
        const { before, after } = await drive(c.press, { pre: c.pre });
        let ok = false, saw = '';
        if (c.expect === 'dialog') {
          ok = after.dialogs.length > before.dialogs.length;
          saw = 'dialogs ' + JSON.stringify(before.dialogs) + ' -> ' + JSON.stringify(after.dialogs);
        } else if (c.expect === 'closes') {
          ok = before.dialogs.length > 0 && after.dialogs.length === 0;
          saw = 'opened ' + JSON.stringify(before.dialogs) + ', after Escape ' + JSON.stringify(after.dialogs);
        } else if (c.expect === 'focusMode') {
          ok = after.focusMode !== before.focusMode;
          saw = 'focus mode ' + before.focusMode + ' -> ' + after.focusMode;
        } else if (c.expect === 'tour') {
          ok = after.tour && !before.tour;
          saw = 'tour active ' + before.tour + ' -> ' + after.tour;
        } else if (c.expect === 'density') {
          ok = after.density !== before.density;
          saw = 'density ' + before.density + ' -> ' + after.density;
        } else if (c.expect === 'home') {
          const away = await drive('h', { hash: '#event-driven/walk' });
          ok = after.view === 'home' && after.dialogs.length === 0
            && away.before.view !== 'home' && away.after.view === 'home';
          saw = 'on the home it stays home (' + after.view + '); from #event-driven/walk it lands on '
            + away.after.view;
        }
        driven++;
        chk('[anywhere] ' + id + ' on #home -- ' + c.what, ok, saw);
      }
      /* a table whose rows are all skips is decoration */
      chk('[anywhere] the claims were actually driven, not merely declared',
        driven >= 8, 'only ' + driven + ' of ' + ids.length + ' rows were pressed');

      /* ---- DRIVE the four relocated keys BOTH WAYS ---- */
      for (const id of Object.keys(SCOPED)) {
        const s = SCOPED[id];
        const dead = await drive(s.press, {});                       /* on #home */
        chk('[anywhere] ' + id + ' is genuinely dead on #home, which is why it left "Anywhere"',
          dead.after.dialogs.length === 0 && dead.after.hash === dead.before.hash
          && dead.after.view === 'home',
          JSON.stringify({ before: dead.before, after: dead.after }));

        /* DEAD MEANS TWO THINGS FOR A CHORD, and the second one is the user's. A print binding
           that merely built nothing while still calling preventDefault() would leave the home with
           NO print at all -- worse than the defect. So the home must show both: no sheet built,
           and the browser's own default left alone. */
        if (s.expect === 'print') {
          const dp = dead.after.print || {};
          chk('[anywhere] ' + id + ' on #home builds NO print DOM and does NOT take the browser\'s own print',
            dp.opens === 0 && dp.prevented === false,
            'window.open calls ' + dp.opens + ', defaultPrevented ' + dp.prevented
            + ' -- on a route with no current topic openPrint() reads the BOOT constant, and the'
            + ' home is ordinary light DOM that prints fine on its own');
        }

        const live = await drive(s.press, { hash: s.hash });          /* on a topic route */
        let okLive, sawLive;
        if (s.expect === 'dialog') {
          okLive = live.after.dialogs.length > live.before.dialogs.length;
          sawLive = JSON.stringify({ dialogs: live.after.dialogs });
        } else if (s.expect === 'print') {
          const lp = live.after.print || {};
          /* THE SHEET IS TITLED FOR THE TOPIC YOU ARE IN. print-qa builds "<topic title> -- Q&A",
             so the current topic's own title -- read off the page, never typed -- must be its
             prefix. That is what separates "it printed" from "it printed the BOOT topic", which is
             the whole defect this row was moved for. */
          const wantTitle = String(live.after.topicTitle || '(no current topic)');
          okLive = lp.opens === 1 && lp.prevented === true && lp.len > 0
            && !!live.after.topicTitle
            && String(lp.title || '').indexOf(wantTitle) === 0 && /Q&A$/.test(String(lp.title || ''));
          sawLive = JSON.stringify({ opens: lp.opens, prevented: lp.prevented, bytes: lp.len,
            title: lp.title, currentTopic: live.after.topicTitle });
        } else {
          okLive = live.after.hash !== live.before.hash;
          sawLive = JSON.stringify({ hash: live.before.hash + ' -> ' + live.after.hash });
        }
        chk('[anywhere] ' + id + ' still ' + s.what + ' on a topic route (the qualifier is earned, not an alibi)',
          okLive, sawLive);
      }
    }

    /* ---- CTRL+P's OUTCOME ON THE HOME, not just who owns the event ------------------------
     * The row above proves the home does NOT take the browser's print: window.open 0,
     * defaultPrevented false. That is necessary and it is not sufficient -- it says who owns the
     * print, never what comes out of it. Measured on the build that shipped that guard, what came
     * out was wrong in BOTH record states, at 1280x900, A4:
     *
     *   home, fresh                        3 pages /  391,415 bytes -- the BOOT topic's cram sheet
     *   home, after visiting saga's sheet  6 pages /  872,924 bytes -- SAGA's cram sheet
     *
     * Nothing of the home on either. Two causes, one line apart in the print block: `.app` was
     * display:none (right for a topic route, whose panes are shadow DOM and print blank -- that is
     * the whole reason the cram substitution exists) and the cram force-show carried no `.open`
     * requirement, so a CLOSED dialog printed, carrying whichever topic was last looked at.
     *
     * So this arm drives the SECOND state -- open a cram sheet on a topic, close it, walk to the
     * home -- emulates print media, and asserts both halves of the outcome: the home's own content
     * column paints, and no cram overlay does.
     *
     * THE SEED IS ASSERTED FIRST, because "no cram painted" is free on a page where the sheet was
     * never rendered: the check reads the sheet's own shadow-root text while it is open, so a
     * green below is a green about a sheet that genuinely existed and genuinely closed. */
    {
      const pg = await ctx.newPage();
      await pg.addInitScript(PRINT_PROBE);
      await B.gotoApp(pg, HTML, { hash: '#saga/drill' });
      await B.enterApp(pg);
      await pg.evaluate(() => { const el = document.getElementById('cramopen'); if (el) el.click(); });
      await B.until(pg, () => !!document.querySelector('.cram-ov.open'), null, B.ACT_MS,
        'the cram sheet to open on #saga/drill');
      await B.until(pg, () => {
        const h = document.querySelector('deep-cram');
        return !!(h && h.shadowRoot && h.shadowRoot.querySelectorAll('.cs-sec').length);
      }, null, B.ACT_MS, 'the cram sheet to render its sections');
      await B.settle(pg);
      const sheet = await pg.evaluate(() => {
        const h = document.querySelector('deep-cram'), sr = h && h.shadowRoot;
        return { secs: sr ? sr.querySelectorAll('.cs-sec').length : 0,
          chars: sr ? (sr.textContent || '').replace(/\s+/g, ' ').trim().length : 0,
          topic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current())
            ? TopicRegistry.current().id : null };
      });
      await pg.keyboard.press('Escape');
      await B.until(pg, () => !document.querySelector('.cram-ov.open'), null, B.ACT_MS,
        'the cram sheet to close');
      await pg.evaluate(() => { location.hash = '#home'; });
      await B.until(pg, () => document.documentElement.dataset.view === 'home', null, B.ACT_MS,
        'the home route to apply');
      await B.settle(pg);

      const seed = await pg.evaluate(() => {
        const ov = document.querySelector('.cram-ov');
        return { view: document.documentElement.dataset.view || null,
          present: !!ov, open: !!(ov && ov.classList.contains('open')) };
      });
      chk('[anywhere] CTRL+P outcome: the seed is real -- a rendered cram sheet was visited, CLOSED, '
        + 'and the route is the home',
        sheet.secs > 0 && sheet.chars > 1000 && seed.present && !seed.open && seed.view === 'home',
        JSON.stringify({ sheetTopic: sheet.topic, sheetSections: sheet.secs, sheetChars: sheet.chars,
          cramPresent: seed.present, cramOpen: seed.open, view: seed.view }));

      await pg.emulateMedia({ media: 'print' });
      await B.settle(pg);
      const paper = await pg.evaluate(() => {
        const painted = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect(), c = getComputedStyle(el);
          return { w: Math.round(r.width), h: Math.round(r.height), rects: el.getClientRects().length,
            display: c.display, visibility: c.visibility };
        };
        const home = document.querySelector('#home');
        return {
          printMedia: matchMedia('print').matches,
          home: painted(home),
          /* the record's own words, not a proxy: what a reader would find on the sheet */
          homeText: home ? (home.textContent || '').replace(/\s+/g, ' ').trim().length : 0,
          /* EVERY cram overlay, so a second one could not slip past a single querySelector */
          cramPainted: [...document.querySelectorAll('.cram-ov')]
            .filter((o) => o.getClientRects().length && getComputedStyle(o).display !== 'none')
            .map((o) => Math.round(o.getBoundingClientRect().height)),
        };
      });
      chk('[anywhere] CTRL+P outcome: under print media the HOME paints its own content column',
        paper.printMedia === true && !!paper.home && paper.home.rects > 0
        && paper.home.w > 0 && paper.home.h > 0 && paper.homeText > 1000,
        JSON.stringify({ printMedia: paper.printMedia, home: paper.home, homeChars: paper.homeText })
        + ' -- `.app` is display:none in @media print for the topic shell; the home is ordinary'
        + ' light DOM and has to be exempted from that hide or it prints nothing');
      chk('[anywhere] CTRL+P outcome: and the CLOSED cram sheet paints nothing beside it',
        paper.cramPainted.length === 0,
        'painted .cram-ov heights ' + JSON.stringify(paper.cramPainted)
        + ' -- the print force-show must require `.open` on the home, or the last sheet the user'
        + ' visited prints instead of the record they asked for');
      await pg.emulateMedia({ media: null });
      await pg.close();
    }

    /* ============ THE BOOT WINDOW: A KEYMAP WITH NO ROUTE TO MEAN ANYTHING AGAINST ============
     * Section 5's question one moment earlier, and the moment is the whole point. shell.js
     * registers its global keymap at PARSE time; Router.init() runs at DOMContentLoaded. In
     * between, every binding is live while documentElement.dataset.view is still UNDEFINED -- so
     * `onHome` reads FALSE on a load that is landing on the home and the topic keys act on the
     * BOOT topic. Cycle 1 fixed `p` for the ROUTED home; this is the same defect arriving through
     * the door underneath that fix, and it is not only `p`: on the shipped build `w` leaked in 6
     * of 6 attempts and `n` in 2 of 6, and `q` leaked at a rate nobody recorded. One gate at the
     * top of the handler closes all of them, so one arm is aimed at the gate rather than four at
     * the keys.
     *
     * WHY THE WINDOW IS HELD OPEN RATHER THAN RACED. Driving the NATURAL window was measured
     * first, exactly as the ruling described it (goto waitUntil:'commit', then press once goView
     * exists, #sessopen exists and dataset.view is not yet 'home'): it lands 4 times in 6, and the
     * two misses are not cheap -- the predicate never becomes true, so the wait runs to its
     * timeout. A 2-in-6 timeout in a gate check is the flake this repo has already paid for once.
     * The window is therefore HELD OPEN by a TEST-ONLY hook that wraps Router.init through an
     * addInitScript accessor, delaying the FIRST emit and nothing else: every module loads exactly
     * as it does in a real boot, and the state under test -- keymap live, ViewManager present, no
     * route applied -- is byte-identical to the state the natural runs actually landed in
     * (`hasGoView:true, routed:false, view:null`). Then the hold is RELEASED on the same page and
     * the same key is pressed again, so the arm proves it was measuring a window and not a dead
     * app. The natural window is still driven below, as evidence rather than as the assertion.
     *
     * PREFLIGHTED ON A SEEDED MUTANT, which is the acceptance bar the ruling set: the gate line is
     * deleted from a COPY of the build (written to the OS temp dir and removed in the same run)
     * and the identical arm is run against it. The mutant must go red -- `p` must open Session
     * progress on the BOOT topic and `w` must move the route -- and this check FAILS if it does
     * not, because an arm that stays green on the pre-fix build is not an arm. */
    {
      const HOLD = () => {
        var real;
        Object.defineProperty(window, 'Router', {
          configurable: true,
          get: function () { return real; },
          set: function (v) {
            real = v;
            if (v && typeof v.init === 'function' && !v.__held) {
              var orig = v.init;
              v.__held = true;
              v.init = function () {
                window.__releaseRouter = function () { window.__releaseRouter = null; orig.call(v); };
              };
            }
          },
        });
      };
      const BSNAP = () => ({
        routed: !!(window.ViewManager && window.ViewManager.routed && window.ViewManager.routed()),
        view: document.documentElement.dataset.view || null,
        hash: location.hash,
        held: typeof window.__releaseRouter === 'function',
        dialogs: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
          .filter((d) => d.getClientRects().length && !d.classList.contains('closing')
            && getComputedStyle(d).display !== 'none')
          .map((d) => d.id || String(d.className).split(' ')[0]),
        topic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current())
          ? TopicRegistry.current().id : null,
      });

      /* one page, one key: a dialog opened by the first press suppresses the second (the keymap
         bails under an open modal), so a shared page would let `p`'s leak hide `w`'s */
      const held = async (html, key) => {
        const p = await ctx.newPage();
        await p.addInitScript(HOLD);
        await p.goto(B.fileUrl(html, '#home'), { timeout: B.NAV_MS, waitUntil: 'load' });
        await p.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
        await B.settle(p);
        const before = await p.evaluate(BSNAP);
        await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
        await p.keyboard.press(key);
        await B.settle(p);
        await p.waitForTimeout(250);
        const after = await p.evaluate(BSNAP);
        await p.evaluate(() => { if (window.__releaseRouter) window.__releaseRouter(); });
        await B.settle(p);
        await p.waitForTimeout(250);
        const released = await p.evaluate(BSNAP);
        await p.close();
        return { before, after, released };
      };

      /* ---- (a) the seeded mutant FIRST: an arm that cannot fail proves nothing about the fix ---- */
      let mutDir = null, aborted = null;
      const src = fs.readFileSync(HTML, 'utf8');
      const hits = src.split(BOOT_GATE).length - 1;
      if (hits !== 1) {
        aborted = 'THE BOOT-GATE SEED CANNOT LAND: the gate line appears ' + hits + ' times in the '
          + 'build (expected exactly 1), so the mutant below is not the mutant this arm claims.';
      } else {
        mutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddr-deadzone-'));
        try {
          const mutant = path.join(mutDir, 'boot-gate-removed.html');
          fs.writeFileSync(mutant, src.replace(BOOT_GATE, 'if (false) return;'), 'utf8');
          const mp = await held(mutant, 'p');
          const mw = await held(mutant, 'w');
          if (!(mp.after.dialogs.length > 0 && mp.after.topic === 'content-pipeline')) {
            aborted = 'MUTANT (boot gate removed) NOT DETECTED for `p`: with the gate deleted, a press '
              + 'inside the boot window opened ' + JSON.stringify(mp.after.dialogs) + ' -- the arm cannot '
              + 'see the leak it exists for. ' + JSON.stringify(mp.after);
          } else if (mw.after.hash === mw.before.hash) {
            aborted = aborted || 'MUTANT (boot gate removed) NOT DETECTED for `w`: the route stayed at '
              + mw.after.hash + ' inside the boot window, so the incidental half of this gate is untested.';
          }
        } finally {
          /* a 12MB copy of the build: removed on the way out whether the arm passed, failed or threw */
          fs.rmSync(mutDir, { recursive: true, force: true });
        }
      }
      chk('[boot window] the seeded mutant reproduces the leak -- gate deleted, `p` opens Session '
        + 'progress on the BOOT topic and `w` moves the route', !aborted, aborted || '');

      /* ---- (b) the same arm on the shipped build ---- */
      const gp = await held(HTML, 'p');
      chk('[boot window] the arm really is inside the window -- keymap live, ViewManager present, no route applied',
        gp.before.routed === false && gp.before.view === null && gp.before.held === true,
        JSON.stringify(gp.before));
      chk('[boot window] `p` before the first applied route opens NO per-topic panel on the boot topic',
        gp.after.dialogs.length === 0,
        'opened ' + gp.after.dialogs.join(',') + ' with TopicRegistry.current()=' + gp.after.topic);
      const gw = await held(HTML, 'w');
      chk('[boot window] `w` before the first applied route does not navigate to the boot topic\'s drill either (one gate, every key)',
        gw.after.hash === gw.before.hash && gw.after.view === null,
        JSON.stringify({ hash: gw.before.hash + ' -> ' + gw.after.hash, view: gw.after.view }));

      /* ---- (c) THE GATE IS A WINDOW, NOT A DELETION ---- */
      chk('[boot window] releasing the hold applies the route and turns the keymap back on',
        gp.released.routed === true && gp.released.view === 'home' && gw.released.routed === true,
        JSON.stringify({ p: gp.released, w: gw.released }));
      const after = await drive('p', { hash: '#saga/drill' });
      chk('[boot window/control] and `p` still opens Session progress on a topic route, so the gate scoped a moment rather than a key',
        after.after.dialogs.length > after.before.dialogs.length, JSON.stringify(after.after.dialogs));

      /* ---- (d) THE GATE MUST NOT LATCH SHUT ON A RENDER THAT THREW ----
       * The flag shipped as TWO assignments, one at the close of each applyRoute branch -- so the
       * bit meant "an application RAN TO COMPLETION", not "a route arrived". Those differ on
       * exactly one path, and every ingredient of it is already in this repo:
       *   - applyRoute is the ONLY caller of HomeView.render (view-manager.js:100; grep confirms);
       *   - Router.emit wraps every subscriber in `try {} catch (e) {}` (router.js:87), so the
       *     exception is swallowed with no console error and no visible failure;
       *   - the home branch stamps dataset.view = 'home' BEFORE it renders.
       * So one throw anywhere in the home render left the app on a page whose data-view said
       * 'home' while routed() stayed false -- and the gate this section exists to prove turns the
       * WHOLE keymap off for EVERY key. A rendering bug would have silently taken `d`, `/`, `?`,
       * `g`, `h` and the six room keys with it, permanently, for the rest of the session. The
       * boot-window fix would have converted a render bug into a total keyboard outage.
       * Now the flag is set immediately past applyRoute's `if (!route || !route.view) return;`
       * guard: it records that a route ARRIVED, which is the only thing the keymap needs to know,
       * and applyRoute is synchronous so nothing can interleave before the side effects run.
       *
       * THE ARM makes HomeView.render throw ONCE through an addInitScript accessor -- the same
       * mechanism the hold above uses on Router.init, so no build is modified -- then releases the
       * hold and asks the two questions that matter: did the route register, and is the keyboard
       * still alive? `d` is the probe because its effect is a stamped attribute rather than a
       * dialog, so it is read rather than inferred. The throw is COUNTED and asserted: an arm in
       * which render never threw would be testing the ordinary path under a scary name. */
      {
        const THROW_ONCE = () => {
          window.__renderThrew = 0;
          var real;
          Object.defineProperty(window, 'HomeView', {
            configurable: true,
            get: function () { return real; },
            set: function (v) {
              real = v;
              if (v && typeof v.render === 'function' && !v.__throwWrapped) {
                var orig = v.render;
                v.__throwWrapped = true;
                v.render = function () {
                  if (!window.__renderThrew) {
                    window.__renderThrew = 1;
                    throw new Error('test-only: HomeView.render throws on its first call');
                  }
                  return orig.apply(this, arguments);
                };
              }
            },
          });
        };
        const tp = await ctx.newPage();
        /* the page WILL log a swallowed-render error path; this arm is about survival, not silence */
        await tp.addInitScript(HOLD);
        await tp.addInitScript(THROW_ONCE);
        await tp.goto(B.fileUrl(HTML, '#home'), { timeout: B.NAV_MS, waitUntil: 'load' });
        await tp.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
        await B.settle(tp);
        const tBefore = await tp.evaluate(BSNAP);
        await tp.evaluate(() => { if (window.__releaseRouter) window.__releaseRouter(); });
        await B.settle(tp);
        await tp.waitForTimeout(250);
        const tAfter = await tp.evaluate(() => ({
          threw: window.__renderThrew || 0,
          routed: !!(window.ViewManager && window.ViewManager.routed && window.ViewManager.routed()),
          view: document.documentElement.dataset.view || null,
          density: document.documentElement.dataset.density || 'default',
        }));
        await tp.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
        await tp.keyboard.press('d');
        await B.settle(tp);
        await tp.waitForTimeout(250);
        const tKey = await tp.evaluate(() => document.documentElement.dataset.density || 'default');
        await tp.close();

        chk('[boot window] the throwing-render arm really staged its defect -- the hold held, and '
          + 'HomeView.render threw exactly once, inside applyRoute (its only caller)',
          tBefore.routed === false && tBefore.held === true && tAfter.threw === 1,
          JSON.stringify({ before: tBefore, after: tAfter }));
        chk('[boot window] a route whose render THROWS still counts as applied -- the gate records '
          + 'that a route arrived, not that its side effects finished, so a swallowed render error '
          + 'cannot latch the whole keymap shut',
          tAfter.routed === true, JSON.stringify(tAfter));
        chk('[boot window] ...and the keyboard is still alive after it: `d` cycles the density '
          + 'attribute (default -> compact) on a home whose render threw',
          tAfter.density === 'default' && tKey === 'compact',
          'density ' + tAfter.density + ' -> ' + tKey);
      }

      /* ---- (e) THE NATURAL WINDOW, driven as evidence ----
         Bounded and non-fatal by design: it lands roughly 4 times in 6 and the assertion is the
         same either way ("nothing that arrived before the first applied route did anything"), so a
         miss costs a logged 0 rather than a red. How many landed is printed, so a run where the
         window closed entirely is visible rather than silent. */
      const REC = () => {
        window.__k = [];
        window.addEventListener('keydown', (e) => {
          window.__k.push({ key: e.key,
            routed: !!(window.ViewManager && window.ViewManager.routed && window.ViewManager.routed()),
            hasKeymap: typeof goView === 'function' });
        }, false);
      };
      let landed = 0, leaked = null;
      for (let i = 0; i < 3 && !leaked; i++) {
        const p = await ctx.newPage();
        await p.addInitScript(REC);
        await p.goto(B.fileUrl(HTML, '#home'), { timeout: B.NAV_MS, waitUntil: 'commit' });
        await p.waitForFunction(
          () => typeof goView === 'function' && !!document.getElementById('sessopen')
            && document.documentElement.dataset.view !== 'home',
          null, { timeout: 4000 }).catch(() => {});
        await p.keyboard.press('p').catch(() => {});
        await p.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
        await B.settle(p);
        await p.waitForTimeout(250);
        const r = await p.evaluate(() => ({
          pre: (window.__k || []).filter((k) => !k.routed && k.hasKeymap).length,
          state: (function () {
            const d = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
              .filter((x) => x.getClientRects().length && !x.classList.contains('closing')
                && getComputedStyle(x).display !== 'none').map((x) => x.id || '');
            return { dialogs: d, hash: location.hash, view: document.documentElement.dataset.view || null };
          })(),
        }));
        landed += r.pre;
        if (r.state.dialogs.length || r.state.hash !== '#home') leaked = JSON.stringify(r);
        await p.close();
      }
      chk('[boot window] on ' + 3 + ' REAL boots (no hold), a `p` that arrived before the first applied '
        + 'route left the app on #home with nothing open -- ' + landed + ' press(es) landed inside the window',
        !leaked, leaked || '');
    }
    await ctx.close();
  }

  await browser.close();

  notes.forEach((n) => console.log(n));
  if (fails.length) {
    fails.forEach((f) => console.log('  - ' + f));
    /* the gate reports a check by its LAST LINE -- so the verdict must be last */
    return B.finish(1, 'OVERLAY DEADZONE: FAIL  (' + fails.length + ' of ' + notes.length + ' assertions)');
  }
  console.log('OVERLAY DEADZONE: PASS  (' + notes.length +
    ' assertions: the first real click lands; no layer hit-tests while fading; focus leaves a closing' +
    ' dialog; the keymap stays suppressed under an open one, on the home, where it has no topic' +
    ' to mean, and BEFORE THE FIRST APPLIED ROUTE, where it has no route to mean anything against' +
    ' -- that one preflighted on a build with the gate line deleted; every key the shortcuts overlay' +
    ' advertises under "Anywhere" was driven ON the home and did what the row says, and the four' +
    ' that need a topic are dead there and live in one, Ctrl+P included (it builds the CURRENT' +
    " topic's sheet in a topic and leaves the browser's own print alone on the home -- and what" +
    ' that print PRODUCES is measured too, on a home seeded with a visited-then-closed cram sheet:' +
    ' the record paints, the closed sheet does not);' +
    ' no unrequested modal at first paint)');
  return B.finish(0, null);
})();
