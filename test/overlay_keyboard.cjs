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

    /* ---------- F. REOPENING IT DOES NOT MAKE IT CLOSE ITSELF ---------- */
    /* ovHide() arms finishHide on BOTH the panel's animationend and a 500ms fallback timer. ovShow()
       used to cancel only the timer -- so the listener survived, fired on the NEXT animationend
       (after a reopen, that is the OPEN animation's), and stripped `.open` off the dialog that had
       just opened. On the pre-fix build every overlay closed itself 446-700ms after being reopened.
       This is an ABSENCE assertion -- "nothing rips the class off within the race window" -- so it
       has to observe a window rather than wait on a condition. It samples per rAF and reports the
       exact frame the class died, instead of betting on one sample landing after the failure. */
    await openOv(d);
    await closeOv(d);
    await openOv(d);
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

  /* ...AND FOCUS IS BACK ON THE SURFACE. The render replaces the body and destroys the focused
     control; without a restore, focus falls to <body> and the user's place is lost every beat. */
  const afterBeat = await page.evaluate(() => window.__K.focus());
  chk('[mock run] after a beat re-renders, focus is back on the surface (not <body>)',
    afterBeat === 'div#mockbody',
    'focus fell to ' + afterBeat + ' -- the render destroyed the focused node and dropped the user');

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
    ' focus restores to the trigger; the mock run opens on its surface and keeps Space-to-reveal)');
  return B.finish(0, null);
})().catch(async (e) => {
  console.error(e && e.stack || e);
  return B.finish(1, 'OVERLAY KEYBOARD: FAIL  (harness error: ' + (e && e.message) + ')');
});
