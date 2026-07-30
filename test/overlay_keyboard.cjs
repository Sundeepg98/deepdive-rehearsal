/* ===== THE OVERLAY KEYBOARD CONTRACT =====
 *
 * WHAT THIS GUARDS.
 * A prior audit certified these overlays "10/10, no defects". It tested Escape, focus capture and
 * focus restore -- and never once pressed Enter on a button. Two WCAG 2.1.1 defects were sitting
 * underneath it, and this check exists because neither was reachable by the questions that audit
 * asked.
 *
 *   1. ENTER ON THE MOCK RUN'S OWN CLOSE BUTTON DID NOT CLOSE IT. mock-run/logic.js gated its
 *      keydown on "is the overlay open" and then preventDefault()-ed Enter -- so Enter on #mockx
 *      clicked #mbnext instead, and preventDefault() on keydown ALSO suppresses the focused
 *      button's native activation. The key was stolen twice over. Space behaved the same way,
 *      firing #mbrev. Identical disease to the drill's "gate on the pane, never on focus".
 *
 *   2. THE FOCUS TRAP WAS SHADOW-BLIND, so the dialog BODY was unreachable by keyboard. Every one
 *      of these dialogs hosts its body in a shadow root (<deep-mock-run>, <deep-session>, ...) and
 *      shell.js's getFocusable() used overlay.querySelectorAll(), which does not cross a shadow
 *      boundary. For mock / session / mixed fire / keyboard it therefore returned exactly ONE
 *      element -- the close button -- so first === last, and every Tab hit the wrap branch and was
 *      preventDefault()-ed straight back onto it. MEASURED, before the fix: ONE distinct tab stop
 *      across 8 presses. The session tracker's <input>, <textarea> and Copy/Compare/Print/Clear
 *      buttons, the mock run's Reveal and Next, and its end screen's whole score row and "Run
 *      again" were ALL unreachable. A light-DOM scan of a shadow-DOM app is a no-op that LOOKS
 *      done.
 *
 * HOW IT MEASURES -- the part that decides whether this is a check or a decoration.
 *   - TRUSTED KEYS ONLY. page.keyboard.press(), never el.click() and never a synthetic
 *     dispatchEvent. A synthetic Enter does not reproduce native button activation at all, so it
 *     would have "passed" on the broken build. The bug IS the interaction between a global
 *     preventDefault() and the browser's own activation behaviour; only real input has both.
 *   - FOCUS IS READ THROUGH THE SHADOW BOUNDARY. document.activeElement stops at the shadow HOST
 *     and reports <deep-mock-run> for every control inside the run. A check that reads it would
 *     conclude focus never moves, and would have certified the pinned ring as fine.
 *   - THE RING IS COMPARED AGAINST THE TRUE FOCUSABLE SET (light + shadow), not against a
 *     threshold. "More than one tab stop" is not the contract and would false-positive on the
 *     keyboard overlay, whose only control legitimately IS Close. The contract is: every focusable
 *     element in the dialog is reachable, and focus never leaves the dialog.
 *
 * IT FAILS ON THE PRE-FIX BUILD -- verified against all four mechanisms independently, each
 * reverted on its own, each watched going red. See the header of the commit.
 *
 * ===== W17/X4: THE SCROLL-REGION CENSUS =====
 * The contract above is "every focusable element is reachable". It is exactly satisfied by a dialog
 * whose only focusable element is Close -- and that is how the keyboard-shortcuts overlay passed for
 * months while clipping 206px of itself with no keyboard path to the clipped part. #keybody was the
 * one of four `.cram-body` scroll regions shipped WITHOUT `tabindex="0" role="region"`, so it was
 * never IN the focusable set the loop above compares against. The check could not see the hole
 * because the hole was in its own denominator.
 *
 * The census closes the CLASS, not the instance: it enumerates every scroll body of every
 * [role=dialog][aria-modal=true] FROM THE DOM and requires each to be focusable, named, and a real
 * overflow container -- so a fifth overlay added tomorrow is covered the day it lands, and no future
 * omission can hide behind a focusable set it was excluded from.
 *
 * It is guarded against being a check that cannot fail: it asserts the census is non-empty and
 * covers every dialog that has a scroll body (a selector that silently matches nothing would
 * otherwise report a clean sweep of zero elements), and the functional arm first asserts that
 * #keybody genuinely OVERFLOWS before demanding that the keyboard can scroll it.
 *
 * Watched RED against the pre-fix deliverable: #keybody reports tabindex null / role null / no
 * accessible name; it is absent from the tab ring across 12 real presses; and End leaves scrollTop
 * at 0 with 208px unreachable.
 *
 * Usage: node test/overlay_keyboard.cjs <deliverable.html>   (CHROME=<path> for the browser) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* Every static [role=dialog][aria-modal] in the app, with the control that opens it. */
const DIALOGS = [
  { name: 'mock run',   sel: '#mockov',  opener: 'mockopen',  x: 'mockx' },
  { name: 'cram',       sel: '#cramov',  opener: 'cramopen',  x: 'cramx' },
  { name: 'session',    sel: '#sessov',  opener: 'sessopen',  x: 'sessx' },
  { name: 'mixed fire', sel: '#mixov',   opener: 'mixopen',   x: 'mixx' },
  { name: 'game plan',  sel: '#planov',  opener: 'planopen',  x: 'planx' },
  { name: 'scope',      sel: '#scopeov', opener: 'scopeopen', x: 'scopex' },
  { name: 'keyboard',   sel: '#keyov',   opener: 'keyopen',   x: 'keyx' },
];

const fails = [];
const notes = [];
function chk(name, ok, detail) {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name + (detail ? ' [' + String(detail).slice(0, 160) + ']' : ''));
}

/* Injected at document_start. Everything here reads THROUGH shadow roots -- that is the whole
   point; the light-DOM view of this app is a fiction. */
const PROBE = () => {
  window.__K = {
    /* the REAL focused element: document.activeElement stops at the shadow host */
    active() {
      let el = document.activeElement;
      while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
      return el;
    },
    desc(el) {
      if (!el) return '(null)';
      const tag = (el.tagName || '').toLowerCase();
      return tag + (el.id ? '#' + el.id : '');
    },
    /* contains() stops at the boundary too -- hop out through each root's host */
    within(root, node) {
      let n = node;
      while (n) {
        if (root.contains(n)) return true;
        const r = n.getRootNode && n.getRootNode();
        n = r && r.host;
      }
      return false;
    },
    /* THE TRUE FOCUSABLE SET of a dialog: light DOM + every shadow root, in tab order. */
    focusables(sel) {
      const SEL = 'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])';
      const ov = document.querySelector(sel);
      const out = [];
      (function walk(node) {
        const kids = node.children;
        for (let i = 0; i < kids.length; i++) {
          const el = kids[i];
          if (el.matches && el.matches(SEL) && !el.disabled && el.offsetParent !== null) out.push(el);
          if (el.shadowRoot) walk(el.shadowRoot);
          walk(el);
        }
      })(ov);
      return out;
    },
    isOpen(sel) {
      const ov = document.querySelector(sel);
      return !!ov && ov.classList.contains('open') && !ov.classList.contains('closing');
    },
    focus() { return this.desc(this.active()); },
  };
  /* every click, by its DEEP target (composedPath()[0]) -- retargeting would report the host */
  window.__clicks = [];
  document.addEventListener('click', (e) => {
    const p = e.composedPath();
    window.__clicks.push(window.__K.desc(p && p.length ? p[0] : e.target));
  }, true);
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(PROBE);
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);
  /* THE 220ms DEAD WINDOW: the landing overlay drops isOpen() before it drops `.open`, and the
     shell's keymap bails on the CLASS -- so a harness that starts pressing keys as soon as
     isOpen() is false is driving a switched-off keyboard, and every "the key did nothing"
     assertion goes green for the wrong reason. Wait on the class, which is what the app reads. */
  await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-modal="true"].open'),
    null, { timeout: 10000 });
  await page.waitForFunction(() => !document.getElementById('_bootsplash'), null, { timeout: 20000 }).catch(() => {});
  await B.settle(page);

  /* OPEN IT THE WAY A KEYBOARD USER DOES: focus the trigger, press Enter.
     A synthetic el.click() does NOT move focus in Chrome. Open the dialog that way and it captures
     whatever happened to be focused as its return target -- so the focus-restore assertion below
     would be grading the HARNESS, not the app. It did exactly that on the first run: all seven
     dialogs "restored" focus to #tnprev, and every one of those reds was mine, not the product's.
     A keyboard contract has to be driven by the keyboard, end to end. */
  const openOv = async (d) => {
    await page.evaluate((id) => { window.__clicks = []; document.getElementById(id).focus(); }, d.opener);
    await B.until(page, (id) => window.__K.focus() === 'button#' + id, d.opener, 5000,
      'the trigger #' + d.opener + ' takes focus');
    await page.keyboard.press('Enter');
    await B.until(page, (s) => window.__K.isOpen(s), d.sel, 10000, d.name + ' opens');
    await B.settle(page);
    /* shell.js moves initial focus on a setTimeout(...,0); wait for it to LAND, never sleep on it */
    await B.until(page, (s) => window.__K.within(document.querySelector(s), window.__K.active()),
      d.sel, 5000, 'initial focus lands inside ' + d.name);
  };
  const closeOv = async (d) => {
    await page.evaluate((s) => {
      const ov = document.querySelector(s);
      const x = ov && ov.querySelector('.mock-x,.cram-x');
      if (x) x.click();
    }, d.sel);
    await B.until(page, (s) => !document.querySelector(s).classList.contains('open'), d.sel, 5000,
      d.name + ' fully closed');
    await B.settle(page);
  };

  for (const d of DIALOGS) {
    await openOv(d);

    /* ---------- A. EVERY FOCUSABLE IN THE DIALOG IS REACHABLE BY TAB ---------- */
    const want = await page.evaluate((s) => window.__K.focusables(s).map((e) => window.__K.desc(e)), d.sel);
    const ring = [];
    let escaped = null;
    for (let i = 0; i < want.length + 2; i++) {
      await page.keyboard.press('Tab');
      await B.settle(page);
      const st = await page.evaluate((s) =>
        ({ f: window.__K.focus(), inside: window.__K.within(document.querySelector(s), window.__K.active()) }), d.sel);
      ring.push(st.f);
      if (!st.inside && escaped === null) escaped = st.f;
    }
    const seen = new Set(ring);
    const missed = want.filter((w) => !seen.has(w));
    chk('[' + d.name + '] Tab reaches EVERY focusable in the dialog (' + want.length + ': ' + want.join(', ') + ')',
      missed.length === 0,
      'never reached: ' + missed.join(', ') + '  -- ring was: ' + [...seen].join(' -> ') +
      (seen.size === 1 ? '   FOCUS IS PINNED TO ONE ELEMENT; the dialog body is unreachable by keyboard' : ''));

    /* ---------- D. AND FOCUS NEVER LEAVES THE DIALOG ---------- */
    chk('[' + d.name + '] focus never escapes the modal while tabbing',
      escaped === null, 'Tab walked out of the dialog onto ' + escaped);

    await closeOv(d);

    /* ---------- B/C. ENTER, THEN SPACE, ON THE CLOSE BUTTON MUST CLOSE IT (WCAG 2.1.1) ---------- */
    for (const key of ['Enter', 'Space']) {
      await openOv(d);
      /* Tab to the close button like a keyboard user actually would. If we cannot even REACH it,
         that is the failure -- report it as such rather than dying. */
      let reached = false;
      for (let i = 0; i < want.length + 2; i++) {
        if (await page.evaluate((id) => window.__K.focus() === 'button#' + id, d.x)) { reached = true; break; }
        await page.keyboard.press('Tab');
        await B.settle(page);
      }
      if (!reached) {
        chk('[' + d.name + '] ' + key + ' on the close button CLOSES it', false,
          'the close button #' + d.x + ' is not reachable by Tab at all');
        await closeOv(d);
        continue;
      }
      await page.evaluate(() => { window.__clicks = []; });
      await page.keyboard.press(key);
      /* give a real close a chance to land; a bounded poll, not a bet */
      await page.waitForFunction((s) => !window.__K.isOpen(s), d.sel, { timeout: 2000 }).catch(() => {});
      const after = await page.evaluate((s) => ({ open: window.__K.isOpen(s), clicks: window.__clicks }), d.sel);
      chk('[' + d.name + '] ' + key + ' on the FOCUSED close button CLOSES it (WCAG 2.1.1)',
        after.open === false,
        'the dialog is still open; the key was stolen and fired ' +
        (after.clicks.length ? after.clicks.join(', ') : 'nothing') + ' instead of activating #' + d.x);
      if (after.open) await closeOv(d);
      await B.settle(page);
    }

    /* ---------- E. CLOSING RESTORES FOCUS TO THE TRIGGER ---------- */
    await openOv(d);
    await closeOv(d);
    const restored = await page.evaluate(() => window.__K.focus());
    chk('[' + d.name + '] closing restores focus to the trigger (#' + d.opener + ')',
      restored === 'button#' + d.opener,
      'focus landed on ' + restored + ' instead -- the user is dropped at the top of the document');

    /* ---------- F. REOPENING IT MID-FADE DOES NOT MAKE IT CLOSE ITSELF ---------- */
    /* ovHide() arms finishHide on BOTH the panel's animationend and a 500ms fallback timer. ovShow()
       used to cancel only the timer -- so the listener survived, fired on the NEXT animationend
       (after a reopen, that is the OPEN animation's, and animationend BUBBLES, so any child's
       animation serves too) and stripped `.open` off the dialog that had just opened.

       IT MUST BE REOPENED WHILE IT IS STILL FADING, and that is not a detail -- it is the whole
       bug. finishHide removes its own listener when it runs, so once a close has fully COMPLETED
       there is no stale listener and no race. The defect exists only in the window where ovShow()
       interrupts a close in flight -- which is exactly the user's gesture: click X, then
       immediately click the trigger again. The first version of this assertion let the close finish
       first, and the negative control duly went red on only 2 of the 7 dialogs, by luck. Wait on
       `.closing` (a CONDITION, not a stopwatch) and it reproduces on all 7, every run.

       The observation itself is an ABSENCE assertion -- "nothing rips the class off within the race
       window" -- which cannot be expressed as a condition wait. It samples per rAF and reports the
       exact frame the class died, rather than betting on one sample landing after the failure. */
    await openOv(d);
    await page.evaluate((s) => {
      const ov = document.querySelector(s);
      const x = ov && ov.querySelector('.mock-x,.cram-x');
      if (x) x.click();
    }, d.sel);
    await B.until(page, (s) => document.querySelector(s).classList.contains('closing'), d.sel, 3000,
      d.name + ' starts fading');
    await page.evaluate((id) => document.getElementById(id).click(), d.opener);   /* reopen MID-FADE */
    await B.until(page, (s) => window.__K.isOpen(s), d.sel, 5000, d.name + ' reopens mid-fade');
    const selfClosed = await page.evaluate((s) => new Promise((res) => {
      const ov = document.querySelector(s);
      const t0 = performance.now();
      const tick = () => {
        if (!ov.classList.contains('open')) return res(Math.round(performance.now() - t0));
        if (performance.now() - t0 > 900) return res(null);   /* observed max on the pre-fix build: 700ms */
        requestAnimationFrame(tick);
      };
      tick();
    }), d.sel);
    chk('[' + d.name + '] reopening it right after closing does not make it CLOSE ITSELF',
      selfClosed === null,
      'it stripped `.open` ' + selfClosed + 'ms after reopen with NO user action -- a stale finishHide ' +
      'from the previous close fired on the reopen animation');
    await closeOv(d);
  }

  /* ================= W17/X4: EVERY DIALOG SCROLL REGION IS A KEYBOARD SURFACE ================= */
  /* Enumerated from the DOM, never from a list -- a list is what let one of the four be forgotten. */
  const census = await page.evaluate(() => Array.prototype.map.call(
    document.querySelectorAll('[role="dialog"][aria-modal="true"] .cram-body'), (b) => {
      const cs = getComputedStyle(b);
      const dlg = b.closest('[role="dialog"]');
      return {
        dialog: '#' + (dlg ? dlg.id : '?'),
        body: '#' + b.id,
        tabindex: b.getAttribute('tabindex'),
        role: b.getAttribute('role'),
        name: b.getAttribute('aria-label') || '',
        overflowY: cs.overflowY,
      };
    }));
  const dialogsWithBody = await page.evaluate(() => Array.prototype.filter.call(
    document.querySelectorAll('[role="dialog"][aria-modal="true"]'), (d) => !!d.querySelector('.cram-body')).length);

  /* NEGATIVE CONTROL FOR THE CENSUS ITSELF. Without these two, a selector that matched nothing would
     report a spotless sweep, and this whole section would be decoration. */
  chk('[census] the scroll-region census actually found the scroll regions (>=4, one per dialog that has one)',
    census.length >= 4 && census.length === dialogsWithBody,
    'found ' + census.length + ' bodies across ' + dialogsWithBody + ' dialogs -- if this is 0 the census selector is dead and every arm below is vacuous');

  const unfocusable = census.filter((c) => c.tabindex !== '0');
  chk('[census] EVERY dialog scroll region is focusable (tabindex="0") -- ' + census.map((c) => c.body).join(', '),
    unfocusable.length === 0,
    'not focusable: ' + unfocusable.map((c) => c.body + ' in ' + c.dialog + ' (tabindex ' + c.tabindex + ')').join(', ') +
    ' -- its content is unreachable by keyboard the moment it overflows');
  const unroled = census.filter((c) => c.role !== 'region');
  chk('[census] EVERY dialog scroll region declares role="region"',
    unroled.length === 0, 'missing role=region: ' + unroled.map((c) => c.body).join(', '));
  const unnamed = census.filter((c) => !c.name.trim());
  chk('[census] EVERY dialog scroll region carries an accessible name',
    unnamed.length === 0, 'unnamed: ' + unnamed.map((c) => c.body).join(', ') +
    ' -- a named region is what lets a screen-reader user find it in the landmark list');
  const notScrollers = census.filter((c) => c.overflowY !== 'auto' && c.overflowY !== 'scroll');
  chk('[census] ...and each really is an overflow container, so the rule above is about scrolling and not decoration',
    notScrollers.length === 0, 'overflow-y: ' + notScrollers.map((c) => c.body + '=' + c.overflowY).join(', '));

  /* ---- THE FUNCTIONAL ARM, on the one measured to overflow: #keybody clips 206-208px ---- */
  const KEY = DIALOGS.find((d) => d.name === 'keyboard');
  await openOv(KEY);
  const geom = await page.evaluate(() => {
    const b = document.getElementById('keybody');
    return { scrollHeight: b.scrollHeight, clientHeight: b.clientHeight, clipped: b.scrollHeight - b.clientHeight };
  });
  chk('[keyboard] #keybody genuinely overflows, so the arms below are not vacuous (' + geom.clipped + 'px below the fold)',
    geom.clipped > 0, JSON.stringify(geom) + ' -- nothing is clipped at this viewport; the scroll arms would pass for free');

  /* Tab to it like a user would. Bounded by the dialog's own focusable count, not by a magic number. */
  const keyWant = await page.evaluate((s) => window.__K.focusables(s).length, KEY.sel);
  let reachedBody = false;
  const keyRing = [];
  for (let i = 0; i < keyWant + 3; i++) {
    await page.keyboard.press('Tab');
    await B.settle(page);
    const f = await page.evaluate(() => window.__K.focus());
    keyRing.push(f);
    if (f === 'div#keybody') { reachedBody = true; break; }
  }
  chk('[keyboard] Tab REACHES the shortcuts body itself, not just its close button',
    reachedBody, 'the ring was ' + [...new Set(keyRing)].join(' -> ') +
    ' -- the body is not a tab stop, so the clipped rows have no keyboard path at all');

  /* With it focused, the arrow/End keys must move it. On the pre-fix build scrollTop never left 0.
     CHROMIUM ANIMATES KEYBOARD SCROLLING HERE (the browser's own smooth step -- .cram-body sets no
     scroll-behavior), so "press, settle two rAFs, read once" samples a value MID-FLIGHT: it reports
     whatever the animation happens to have reached, and its greenness rides on the animation having
     started by then. Measured margin on this box was as little as 2px. That is the stopwatch bet
     _boot.cjs exists to abolish -- so poll for the CONDITION (it moved) instead, and separately poll
     to REST so the number this arm reports is the settled one rather than an intermediate. Slow only
     costs time; a genuinely dead ArrowDown still times out and fails honestly. */
  const scrolled = reachedBody ? await (async () => {
    const readTop = () => page.evaluate(() => document.getElementById('keybody').scrollTop);
    const before = await readTop();
    await page.keyboard.press('ArrowDown');
    let afterArrow = before;
    try {
      afterArrow = await B.pollFor(readTop, (v) => v > before, 5000,
        'ArrowDown moves #keybody off its resting scrollTop');
    } catch (e) { afterArrow = (typeof e.last === 'number') ? e.last : before; }
    /* to rest: two consecutive equal samples, so the receipt is not another mid-flight number */
    let prev = -1, settledArrow = afterArrow;
    for (let i = 0; i < 25; i++) {
      const v = await readTop();
      if (v === prev) { settledArrow = v; break; }
      prev = v; settledArrow = v;
      await B.settle(page);
    }
    await page.keyboard.press('End');
    await page.waitForFunction(() => {
      const b = document.getElementById('keybody');
      return b.scrollTop >= b.scrollHeight - b.clientHeight - 2;
    }, null, { timeout: 3000 }).catch(() => {});
    const afterEnd = await page.evaluate(() => {
      const b = document.getElementById('keybody');
      return { top: b.scrollTop, max: b.scrollHeight - b.clientHeight };
    });
    return { before, afterArrow, settledArrow, afterEnd };
  })() : null;
  chk('[keyboard] ArrowDown on the focused body SCROLLS it (the key the user reaches for first)',
    !!scrolled && scrolled.afterArrow > scrolled.before,
    'scrollTop never left ' + (scrolled ? scrolled.before : 'n/a') + ' within the poll budget ' + JSON.stringify(scrolled));
  chk('[keyboard] End reaches the BOTTOM, so every clipped row is keyboard-reachable',
    !!scrolled && scrolled.afterEnd.top >= scrolled.afterEnd.max - 2,
    'End left ' + (scrolled ? (scrolled.afterEnd.max - scrolled.afterEnd.top) : geom.clipped) +
    'px still unreachable ' + JSON.stringify(scrolled));

  /* THE NAME AS AN AT ACTUALLY COMPUTES IT -- read through the accessibility tree, not off the
     attribute the census already read. Two instruments, so a stray aria-hidden cannot pass both. */
  const namedRegion = await page.locator('#keyov [role="region"]').count();
  const byRole = await page.getByRole('region', { name: /keyboard shortcuts/i }).count();
  chk('[keyboard] the body resolves as a NAMED region in the accessibility tree',
    namedRegion === 1 && byRole >= 1,
    JSON.stringify({ regionsInKeyov: namedRegion, matchedByAccessibleName: byRole }));
  await closeOv(KEY);

  /* ================= THE MOCK RUN'S OWN CONTRACT ================= */
  /* The three properties that had to hold SIMULTANEOUSLY, and which no one-line fix could give:
     the run keys still drive the run, and no control's key is ever stolen from it. */
  const M = DIALOGS[0];

  await openOv(M);
  const initial = await page.evaluate(() => window.__K.focus());
  chk('[mock run] opens focused on the RUN SURFACE, not on a control',
    initial === 'div#mockbody',
    'initial focus is ' + initial + ' -- if it is a control, the run keys cannot be gated on focus ' +
    'without killing them, which is the whole reason this bug survived a one-liner');

  /* SPACE on the surface still reveals -- the interaction the mock run exists for */
  await page.evaluate(() => { window.__clicks = []; });
  await page.keyboard.press('Space');
  await B.settle(page);
  let c = await page.evaluate(() => window.__clicks);
  chk('[mock run] Space on the surface still REVEALS (the run keeps working)',
    c.includes('button#mbrev'), 'Space fired ' + (c.join(', ') || 'nothing') + ' -- Space-to-reveal is dead');

  /* ENTER on the surface still advances */
  await page.evaluate(() => { window.__clicks = []; });
  await page.keyboard.press('Enter');
  await B.settle(page);
  c = await page.evaluate(() => window.__clicks);
  chk('[mock run] Enter on the surface still ADVANCES the run',
    c.includes('button#mbnext'), 'Enter fired ' + (c.join(', ') || 'nothing'));

  /* ...AND ADVANCING FROM THE FOCUSED "Next" BUTTON DOES NOT DROP THE USER.
     THIS MUST BE DRIVEN FROM #mbnext, NEVER FROM THE SURFACE. renderMockBeat() replaces
     mockbody's CHILDREN -- the surface element itself survives and keeps focus -- so an advance
     driven from the surface CANNOT observe this bug. It is the focused CHILD that gets destroyed,
     and without the restore focus falls to <body>: the user is dropped at the top of the document
     mid-round, every beat.
     THE FIRST VERSION OF THIS ASSERTION DROVE IT FROM THE SURFACE, AND THE NEGATIVE CONTROL CAUGHT
     IT: with mockRestoreFocus() deleted outright, this file still reported 47/47 PASS. It was a
     check that could not fail. Drive the path that actually destroys the focused node. */
  await closeOv(M);
  await openOv(M);                 /* fresh beat 0, so #mbnext is guaranteed to exist */
  await page.evaluate(() => {
    const n = document.querySelector('deep-mock-run').shadowRoot.getElementById('mbnext');
    if (n) n.focus();
  });
  await B.settle(page);
  const onNext = await page.evaluate(() => window.__K.focus());
  await page.keyboard.press('Enter');          /* native activation -> the beat re-renders */
  await B.settle(page);
  const afterBeat = await page.evaluate(() => window.__K.focus());
  chk('[mock run] advancing from the FOCUSED Next button lands focus on the surface, not <body>',
    onNext === 'button#mbnext' && afterBeat === 'div#mockbody',
    'focus was ' + onNext + ', and after the re-render destroyed it focus fell to ' + afterBeat +
    ' -- the user is dropped at the top of the document mid-round');

  /* THE KEY IS NOT STOLEN FROM A FOCUSED CONTROL: Enter on Reveal must reveal, NOT advance. */
  await page.evaluate(() => {
    const r = document.querySelector('deep-mock-run').shadowRoot.getElementById('mbrev');
    if (r) r.focus();
  });
  await B.settle(page);
  const onRev = await page.evaluate(() => window.__K.focus());
  await page.evaluate(() => { window.__clicks = []; });
  await page.keyboard.press('Enter');
  await B.settle(page);
  c = await page.evaluate(() => window.__clicks);
  chk('[mock run] Enter on the focused Reveal button activates REVEAL, not Next',
    onRev === 'button#mbrev' && c.includes('button#mbrev') && !c.includes('button#mbnext'),
    'focus was ' + onRev + ' and Enter fired ' + (c.join(', ') || 'nothing') +
    ' -- the global handler stole the key from the control that had focus');
  await closeOv(M);

  await browser.close();

  notes.forEach((n) => console.log(n));
  if (fails.length) {
    fails.forEach((f) => console.log('  - ' + f));
    return B.finish(1, 'OVERLAY KEYBOARD: FAIL  (' + fails.length + ' of ' + notes.length + ' assertions)');
  }
  console.log('OVERLAY KEYBOARD: PASS  (' + notes.length +
    ' assertions across ' + DIALOGS.length + ' dialogs: every focusable is Tab-reachable through the' +
    ' shadow boundary; focus never escapes; Enter AND Space on the focused close button close it;' +
    ' focus restores to the trigger; every dialog scroll region is a focusable, named, scrollable' +
    ' keyboard surface; the mock run opens on its surface and keeps Space-to-reveal)');
  return B.finish(0, null);
})().catch(async (e) => {
  console.error(e && e.stack || e);
  return B.finish(1, 'OVERLAY KEYBOARD: FAIL  (harness error: ' + (e && e.message) + ')');
});
