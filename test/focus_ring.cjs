/* ===================== THE FOCUS RING SURVIVES (W1 / G4) =====================
 *
 * ONE QUESTION, TWO MECHANISMS. "Does keyboard focus in this app look like this app?" The audit
 * found the answer was no, in two different ways, and this file guards both:
 *
 *   P3-6  LIGHT DOM, EXPLICIT REMOVAL. Three chrome buttons wrote `outline:none` on :focus --
 *         `.ix-c-reset` (styles.css:1475), `.cmp-fold` (:1528), `.cmp-reopen` (:1530). What was
 *         left was an OPACITY CHANGE BYTE-IDENTICAL TO THEIR OWN :hover, i.e. focus and hover were
 *         the same event and neither said "you are here". Note the specificity trap: `.cmp-fold:focus`
 *         is (0,2,0) and OUTRANKS the app's `button:focus-visible` (0,1,1) at styles.css:53, so a
 *         fix that only adds a generic rule LOSES. This check reads the COMPUTED outline, so it can
 *         only pass if the fix actually wins the cascade.
 *
 *   P2-3  SHADOW DOM, UNREACHABLE RULE. `button:focus-visible` is a DOCUMENT rule and cannot cross a
 *         shadow boundary. The drill root's adoptedStyleSheets carried exactly four :focus-visible
 *         rules (.flow-go, .revset-b and two landing pads) and no generic one -- so `#adv` and the
 *         1/2/3 grade buttons, the most-pressed controls in a keyboard-driven trainer, fell back to
 *         Chrome's UA ring: ~0.7px near-black, offset 0, weakest of all in dark mode on a near-black
 *         card. Prior #20 fixed this for ONE class; the fix belongs to the pattern (BASE_SHEET).
 *
 * THE ASSERTION IS THE APP'S OWN RING, not merely "something is drawn": solid, >= 2px, and coloured
 * var(--acc) resolved in-page against the live room accent. `outline-style !== none` alone would
 * pass on the UA hairline this exists to eliminate. Every arm also asserts `:focus-visible` really
 * matched, so a ring that appears for some other reason cannot green it.
 *
 * Pure computed-style reads after a scripted focus() -- no clock, no fonts, no pixels.
 * WATCHED RED: all SIX arms fail on the pre-fix build -- the original five (P2-3/P3-6), plus
 * .piv-jump, the fourth member of the P3-6 class, added by W4 (2026-07-29). The count said
 * "five" for one wave after the sixth arm landed; corrected on the cold verify's F-9.
 *
 * Usage: node test/focus_ring.cjs [deliverable.html]   (CHROME=<path>)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const fails = [], notes = [];
const chk = (name, ok, detail) => {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name);
};

/* One ring verdict. `r` is {err} or {fv, width, style, color, offset, accRgb}. */
const judge = (label, r) => {
  if (!r || r.err) { chk(label, false, (r && r.err) || 'no result'); return; }
  const w = parseFloat(r.width);
  const ok = r.fv && r.style === 'solid' && w >= 2 && r.color === r.accRgb;
  chk(label, ok, ':focus-visible=' + r.fv + '  outline=' + r.width + ' ' + r.style + ' ' + r.color +
    ' offset=' + r.offset + '  vs --acc ' + r.accRgb +
    '  (a UA hairline is ~0.7-0.8px auto near-black at offset 0; `none` is the removal this guards)');
};

/* Runs IN PAGE against a light-DOM selector. */
const RING = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return { err: 'selector not found: ' + sel };
  if (!el.getClientRects().length) return { err: sel + ' is not rendered (cannot receive focus), so the ring cannot be measured' };
  el.focus({ focusVisible: true });     /* deterministic :focus-visible, no modality heuristic */
  if (document.activeElement !== el && !(el.getRootNode().activeElement === el)) return { err: sel + ' did not take focus' };
  const cs = getComputedStyle(el);
  const probe = document.createElement('span');
  probe.style.color = 'var(--acc)';
  el.appendChild(probe);
  const accRgb = getComputedStyle(probe).color;   /* resolve var(--acc) to rgb, compare like-for-like */
  probe.remove();
  return { fv: el.matches(':focus-visible'), width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, offset: cs.outlineOffset, accRgb: accRgb };
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  /* >=1280px: .cmp-fold / .cmp-reopen are the DESKTOP companion rail's controls and are scoped
     there in CSS. Below that they do not render, and an unrendered control cannot be focused. */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  /* ---------- 1-2. the SHADOW half: #adv and the #jg grade button inside deep-drill ----------
     Done FIRST because grading one probe is also what makes a topic non-'untouched', which is the
     precondition for the .ix-c-reset button to exist at all (panels.js:237). */
  await page.evaluate(() => { if (window.Router) window.Router.navigate('drill'); else switchTab('drill'); });
  await B.until(page, () => {
    const d = document.querySelector('#drill deep-drill');
    const r = d && d.shadowRoot;
    const b = r && r.getElementById('adv');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, 'the drill renders its #adv control');

  const SHADOW_RING = (id) => {
    const host = document.querySelector('#drill deep-drill');
    const root = host && host.shadowRoot;
    if (!root) return { err: 'deep-drill shadow root not found' };
    const el = root.getElementById(id);
    if (!el) return { err: '#' + id + ' not present in the drill shadow root' };
    if (!el.getClientRects().length) return { err: '#' + id + ' is not rendered' };
    el.focus({ focusVisible: true });
    if (root.activeElement !== el) return { err: '#' + id + ' did not take focus' };
    const cs = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.color = 'var(--acc)';
    el.appendChild(probe);
    const accRgb = getComputedStyle(probe).color;
    probe.remove();
    return { fv: el.matches(':focus-visible'), width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, offset: cs.outlineOffset, accRgb: accRgb };
  };

  judge('#adv (Reveal answer, shadow DOM) shows the app ring -- the document rule cannot cross the boundary, so BASE_SHEET must carry it',
    await page.evaluate(SHADOW_RING, 'adv'));

  /* Reveal once so the 1/2/3 grade row exists (it renders from stage >= 1). */
  await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const a = r.getElementById('adv'); if (a) a.click();
  });
  await B.until(page, () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const b = r && r.getElementById('jg');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, 'the grade row (#jm/#js/#jg) renders after the reveal');
  judge('#jg (Solid, the most-pressed control in the app) shows the app ring, not the ~0.7px UA hairline',
    await page.evaluate(SHADOW_RING, 'jg'));

  /* ---------- 3. .ix-c-reset -- the per-topic reset inside the index overlay ----------
     Grade the probe first: panels.js:237 emits this button only for a topic whose status is not
     'untouched', so on a cold boot the control does not exist and the arm would be untestable. */
  await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const g = r.getElementById('jg'); if (g) g.click();
  });
  await B.until(page, () => {
    const id = TopicRegistry.current().id;
    return typeof Progress !== 'undefined' && Progress.status(id) !== 'untouched';
  }, null, B.ACT_MS, 'the graded topic leaves the untouched state');
  await page.evaluate(() => { if (window.IndexOverlay && IndexOverlay.open) IndexOverlay.open(); });
  await B.until(page, () => {
    const b = document.querySelector('.ix-c-reset');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, '.ix-c-reset renders inside the open index overlay');
  judge('.ix-c-reset shows the app ring on keyboard focus (styles.css:1475 wrote outline:none)',
    await page.evaluate(RING, '.ix-c-reset'));
  await page.evaluate(() => { if (window.IndexOverlay && IndexOverlay.close) IndexOverlay.close(); });
  await B.until(page, () => !document.querySelector('.ix-ov.open'), null, B.ACT_MS, 'index overlay closes');

  /* ---------- 4. .cmp-fold -- fold the desktop companion rail ---------- */
  await page.evaluate(() => { if (document.body) document.body.classList.remove('cmp-collapsed'); });
  await B.until(page, () => {
    const b = document.querySelector('.cmp-fold');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, '.cmp-fold renders on the >=1280px companion rail');
  judge('.cmp-fold shows the app ring on keyboard focus (styles.css:1528 wrote outline:none; its :focus is (0,2,0) and outranks button:focus-visible)',
    await page.evaluate(RING, '.cmp-fold'));

  /* ---------- 3. .cmp-reopen -- the edge tab that brings the rail back (display:none until folded) ---------- */
  await page.evaluate(() => { if (document.body) document.body.classList.add('cmp-collapsed'); });
  await B.until(page, () => {
    const b = document.querySelector('.cmp-reopen');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, '.cmp-reopen renders once the rail is folded');
  judge('.cmp-reopen shows the app ring on keyboard focus (styles.css:1530 wrote outline:none)',
    await page.evaluate(RING, '.cmp-reopen'));
  await page.evaluate(() => { if (document.body) document.body.classList.remove('cmp-collapsed'); });

  /* ---------- 6. .piv-jump -- the System Map's pivot jump, the FOURTH member of the P3-6 class.
     Found by the W1 verifier, fixed in W4. It is a SHADOW button (deep-system-map) whose rule was
     `.piv-jump:hover,.piv-jump:focus{...outline:none}` -- (0,2,0), so it outranked BASE_SHEET's
     generic button:focus-visible, and what survived was a background swap byte-identical to its
     own :hover. It lives inside <details class="piv">, which must be OPEN for the button to be
     rendered and therefore focusable. ---------- */
  await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('sys'); });
  await B.until(page, () => {
    const h = document.querySelector('deep-system-map');
    const r = h && h.shadowRoot;
    if (!r) return false;
    const d = r.querySelector('details.piv');
    if (d) d.open = true;
    const b = r.querySelector('.piv-jump');
    return !!b && b.getClientRects().length > 0;
  }, null, B.ACT_MS, 'the System Map renders a .piv-jump inside an open pivot');
  judge('.piv-jump shows the app ring on keyboard focus (system-map.js wrote :focus{outline:none}; its (0,2,0) outranked the BASE_SHEET rule)',
    await page.evaluate(() => {
      const root = document.querySelector('deep-system-map').shadowRoot;
      const el = root.querySelector('.piv-jump');
      if (!el) return { err: '.piv-jump not present in the system-map shadow root' };
      if (!el.getClientRects().length) return { err: '.piv-jump is not rendered' };
      el.focus({ focusVisible: true });
      if (root.activeElement !== el) return { err: '.piv-jump did not take focus' };
      const cs = getComputedStyle(el);
      const probe = document.createElement('span');
      probe.style.color = 'var(--acc)';
      el.appendChild(probe);
      const accRgb = getComputedStyle(probe).color;
      probe.remove();
      return { fv: el.matches(':focus-visible'), width: cs.outlineWidth, style: cs.outlineStyle,
               color: cs.outlineColor, offset: cs.outlineOffset, accRgb: accRgb };
    }));

  await browser.close();
  notes.forEach((n) => console.log(n));
  if (fails.length) { fails.forEach((f) => console.log('  - ' + f)); return B.finish(1, 'FOCUS RING: FAIL (' + fails.length + ')'); }
  console.log('FOCUS RING: PASS  (' + notes.length + ' assertions: 3 light-DOM chrome buttons kept their ring; the shadow #adv, #jg and .piv-jump get the BASE_SHEET ring)');
  return B.finish(0);
})().catch((e) => { console.error(e && e.stack || e); return B.finish(1, 'FOCUS RING: FAIL (harness error: ' + (e && e.message) + ')'); });
