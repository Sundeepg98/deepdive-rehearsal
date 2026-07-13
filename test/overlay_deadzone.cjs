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
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const PX = require('./_pixels.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
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
      inOverlay: !!(t.closest && t.closest('.ix-ov,.mock-ov,.cram-ov')) || t.id === '_bootsplash',
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
    /* an rAF poller from document_start: the frame the fade begins. A stopwatch would be a bet. */
    await page.addInitScript(() => {
      const tick = () => {
        const sp = document.getElementById('_bootsplash');
        if (sp && sp.classList.contains('_bs-done')) { window.__fading = true; return; }
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
      const ov = document.querySelector('.ix-ov.open,.mock-ov.open,.cram-ov.open,.nt-ov.open');
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

  await browser.close();

  notes.forEach((n) => console.log(n));
  if (fails.length) {
    fails.forEach((f) => console.log('  - ' + f));
    /* the gate reports a check by its LAST LINE -- so the verdict must be last */
    return B.finish(1, 'OVERLAY DEADZONE: FAIL  (' + fails.length + ' of ' + notes.length + ' assertions)');
  }
  console.log('OVERLAY DEADZONE: PASS  (' + notes.length +
    ' assertions: the first real click lands; no layer hit-tests while fading; focus leaves a closing' +
    ' dialog; the keymap stays suppressed under an open one; no unrequested modal at first paint)');
  return B.finish(0, null);
})();
