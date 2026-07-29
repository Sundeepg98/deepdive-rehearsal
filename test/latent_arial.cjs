/* ===================== LATENT ARIAL -- THE UA FORM-CONTROL DEFAULT ==========================
 *
 * WHAT IT CATCHES
 * A <button> that never re-declares font-family does NOT inherit the app's stack. The UA
 * stylesheet gives form controls their own family, so the button renders in the browser's
 * control font -- "Arial" at 13.3333px in Chrome/Windows -- while every non-button sibling
 * two pixels away renders in the app stack. Child <span>s inside that button inherit the UA
 * family too, so one missing declaration re-faces an entire card.
 *
 * MEASURED on the pre-fix build (2026-07-29 frontend audit, P2-15): the home screen ran
 * 147 of 210 text-bearing elements -- 70.0% -- in Arial, because .ix-card (46 topic cards),
 * .ix-g-cram (6 room pills) and .ix-cross never declared a family. Six room cards in the app
 * stack sat directly above 46 topic cards in Arial. The app stack measures 409.96px for a
 * test string, Arial 420.23px: this is a different typeface, not a rounding difference.
 * It is invisible to a code reader (the rule looks complete) and obvious to a designer.
 *
 * WHY THIS SHAPE, AND WHY IT IS PLATFORM-DETERMINISTIC
 * The check does NOT hardcode "Arial". It PLANTS a bare <button> in the live document and
 * reads what the UA gives it -- so the reference is whatever this platform's control font is
 * (Arial on Windows, something else on the ubuntu-latest runner), and the comparison
 * "does this button render in the UA default" is the same question everywhere. FOUR controls
 * run on every invocation AND ON EVERY SURFACE, because a check that cannot fail is this repo's
 * defining bug:
 *
 *   CONTROL A (detection): a planted bare button MUST be flagged BY THE WALK -- keyed into
 *                          `found` under its own component name, through the same detector,
 *                          shadow walk and keyOf every real button goes through. If it is not,
 *                          the check ABORTS rather than passing.
 *   CONTROL B (positive):  a planted button carrying `font:inherit` MUST NOT be detected.
 *                          If it is, the detector flags everything and its greens are worthless.
 *   CONTROL C (blindness): the UA family must DIFFER from the app family. If a platform ever
 *                          makes them equal, this check cannot see the defect at all, and it
 *                          says so instead of reporting a green it did not earn.
 *   NON-EMPTY WALK:        each surface must enumerate at least one APPLICATION button. An empty
 *                          walk is the one way this ratchet reports a clean zero without having
 *                          looked at anything.
 *
 * CONTROL A WAS A TAUTOLOGY UNTIL 2026-07-29 (W4 cold verify, F-6), and the fix is worth
 * recording because the shape recurs: it read `A_bareDetected: UA === UA`, then re-stated itself
 * as `getComputedStyle(bare).fontFamily === UA` where `UA` had been read from `bare` -- an
 * element compared against a value taken from that same element. It could not fail. And because
 * the walker SKIPS `[data-latent-probe]`, the probe never reached the detection path, so nothing
 * proved the WALK could flag anything. `buttonsSeen` was likewise printed and never asserted.
 * Both are now real: breaking the detector so it skips the plant, and breaking the walk so it
 * enumerates no application buttons, each turn this check red on all four surfaces (demonstrated
 * 2026-07-29). The controls are also adjudicated PER SURFACE now -- they used to be overwritten
 * each pass, so three of four surfaces' readings were collected and discarded (F-9).
 *
 * THE RATCHET (test/latent_arial_debt.json), copied from parity_debt.json's proven pattern.
 *
 * THE LIST IS NOW EMPTY, and that is the end state, not a missing file. W3 fixed home and
 * allowlisted the 15 components it could not reach without moving pixels in seven committed VR
 * baselines (topic-nav, cram bar, companion, focus mode, sidebar tools, the search overlay's
 * inline-styled result rows). W4 owned those surfaces, fixed all 15, and took the list to zero
 * with a reviewed rebaseline -- so every <button> the app mounts across the four surfaces below
 * (253 of them) now renders in the app stack. From here the check is a pure ratchet: ANY new
 * UA-default button is a NEW failure with nothing to hide behind.
 *
 * An empty baseline is exactly where a broken detector would go green forever, so note that
 * controls A/B/C below run on EVERY invocation and ABORT rather than pass -- that is what makes
 * the zero meaningful rather than merely quiet.
 *
 * The check fails on:
 *     NEW      a UA-default button whose component is not in the debt file  -- the real guard
 *     STALE    a debt entry whose component no longer offends -- fixed, so delete the line
 * The list can only shrink. Refresh it deliberately with:  node test/latent_arial.cjs --write-debt
 *
 * Exit: 0 = pass, 1 = FAIL, 2 = SKIP (no browser).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const DEBT_FILE = path.join(__dirname, 'latent_arial_debt.json');
const WRITE_DEBT = process.argv.includes('--write-debt');

/* The surfaces to walk. Between them they mount every <button> the app has: the home route
   carries the library + the whole hidden topic chrome, a topic route carries it live, and the
   two overlays mount controls that exist nowhere else. */
const SURFACES = [
  { label: 'home', hash: '', open: null },
  { label: 'walk', hash: '#event-driven/walk', open: null },
  { label: 'index-overlay', hash: '#event-driven/walk', open: 'index' },
  { label: 'search-overlay', hash: '#event-driven/walk', open: 'search' },
];

/* ------------------------------- IN PAGE ------------------------------------------------- */
const SCAN = () => {
  /* the reference: what the UA gives a button with no author family, HERE, on this platform */
  const bare = document.createElement('button');
  bare.textContent = 'x';
  bare.setAttribute('data-latent-probe', 'bare');
  document.body.appendChild(bare);
  const UA = getComputedStyle(bare).fontFamily;

  const inh = document.createElement('button');
  inh.textContent = 'x';
  inh.style.font = 'inherit';
  inh.setAttribute('data-latent-probe', 'inherit');
  document.body.appendChild(inh);
  const INHERITED = getComputedStyle(inh).fontFamily;

  const APP = getComputedStyle(document.body).fontFamily;

  /* CONTROL A'S SUBJECT, and why it is a THIRD element rather than the `bare` probe above.
     Control A used to read `A_bareDetected: UA === UA` -- an element compared against a value
     read from that same element, i.e. a check that could not fail -- and it was then re-stated
     below as `getComputedStyle(bare).fontFamily === UA`, which is the same tautology spelled
     longer. Worse, the walker SKIPS every `[data-latent-probe]`, so the planted probe never
     reached the detection path at all: nothing proved the WALK could flag a real button.
     This element carries a different marker, so the walker DOES enumerate it and must key it
     into `found` like any other offender. That makes control A end-to-end -- keyOf, the shadow
     walk, the family comparison and the bookkeeping all have to work or it fails. It is removed
     from `found` immediately after adjudication so it can never reach the ratchet, and it is
     deliberately NOT counted in `buttons`, so it cannot satisfy the non-empty-walk assertion
     on its own. (2026-07-29 W4 cold verify, F-6.) */
  const ctlA = document.createElement('button');
  ctlA.textContent = 'x';
  ctlA.className = '__latent_control_a';
  ctlA.setAttribute('data-latent-ctrl', 'a');
  document.body.appendChild(ctlA);

  const controls = {
    A_bareDetected: false,                        /* set by the WALK below, not by construction */
    B_inheritClean: INHERITED !== UA,
    C_uaDiffersFromApp: UA !== APP,
    UA, APP, INHERITED,
  };

  /* COMPONENT KEY: the FIRST class token, so a state class (.ix-card.on, .tn-step.tn-home)
     cannot fork one component into two ratchet entries. Classless buttons key off their id,
     then their nearest classed ancestor, so the key is stable across runs. */
  const keyOf = (el) => {
    const cls = String(el.className || '').trim().split(/\s+/).filter(Boolean);
    if (cls.length) return cls[0];
    if (el.id) return '#' + el.id;
    let p = el.parentElement;
    while (p && !String(p.className || '').trim()) p = p.parentElement;
    const pc = p ? String(p.className).trim().split(/\s+/)[0] : 'body';
    return '(unclassed)@' + pc;
  };

  const roots = [document];
  const found = {};
  let buttons = 0, probes = 0;
  for (let i = 0; i < roots.length; i++) {
    for (const el of roots[i].querySelectorAll('*')) {
      if (el.shadowRoot && roots.indexOf(el.shadowRoot) === -1) roots.push(el.shadowRoot);
      if (el.tagName !== 'BUTTON') continue;
      if (el.hasAttribute('data-latent-probe')) { probes++; continue; }
      /* the control-A plant is WALKED (that is the point) but never counted as an application
         button, so it cannot by itself satisfy the non-empty-walk assertion */
      if (!el.hasAttribute('data-latent-ctrl')) buttons++;
      if (getComputedStyle(el).fontFamily !== UA) continue;
      const k = keyOf(el);
      if (!found[k]) found[k] = { n: 0, visible: 0 };
      found[k].n++;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) found[k].visible++;
    }
  }
  /* CONTROL A, END-TO-END: the WALK -- not a re-read of a probe -- must have flagged the planted
     bare button and keyed it under its own component name. If the detector, the shadow walk or
     keyOf stops working, this is false and the check aborts instead of reporting a green. */
  controls.A_bareDetected = !!found.__latent_control_a;
  delete found.__latent_control_a;               /* never let the control reach the ratchet */
  /* CONTROL B, re-stated against the same predicate */
  controls.B_inheritClean = getComputedStyle(inh).fontFamily !== UA;

  bare.remove();
  inh.remove();
  ctlA.remove();
  return { controls, found, buttons, probes, roots: roots.length };
};

/* --------------------------------- NODE ---------------------------------------------------- */
async function scanSurface(browser, s) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
    reducedMotion: 'no-preference', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await ctx.newPage();
  await B.gotoApp(page, HTML, { hash: s.hash });
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash (' + s.label + ')');
  if (s.open === 'index') {
    await page.evaluate(() => { if (window.IndexOverlay) IndexOverlay.open(); });
    await B.until(page, () => !!document.querySelector('.ix-ov.open .ix-card'), null, B.ACT_MS, 'index overlay mounted');
  } else if (s.open === 'search') {
    await page.evaluate(() => { if (window.SearchOverlay) SearchOverlay.open(); });
    await B.until(page, () => !!document.getElementById('_search-overlay'), null, B.ACT_MS, 'search overlay mounted');
  } else {
    await B.until(page, () => !!document.querySelector('button'), null, B.ACT_MS, 'buttons mounted');
  }
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
  const r = await page.evaluate(SCAN);
  await ctx.close();
  return r;
}

(async () => {
  let exe = null;
  try { exe = chromium.executablePath(); } catch (e) { exe = null; }
  if (!exe || !fs.existsSync(exe)) {
    console.log('LATENT ARIAL: SKIP (no Chromium -- run `npx playwright install chromium`)');
    process.exit(2);
  }
  if (!fs.existsSync(HTML)) {
    console.log('LATENT ARIAL: FAIL -- deliverable not found: ' + HTML);
    process.exit(1);
  }

  const browser = await chromium.launch(B.launchOpts());
  const per = {};
  const live = {};
  let controls = null, buttonsSeen = 0;
  const perSurfaceControls = [];
  try {
    for (const s of SURFACES) {
      const r = await scanSurface(browser, s);
      per[s.label] = r;
      controls = r.controls;
      /* EVERY surface's controls are adjudicated, not just the last one's. This used to
         overwrite `controls` on each pass, so three of the four surfaces' control readings were
         collected and then discarded -- a control that is not adjudicated is not a control.
         (2026-07-29 W4 cold verify, F-9.) */
      perSurfaceControls.push({ surface: s.label, c: r.controls, buttons: r.buttons });
      buttonsSeen = Math.max(buttonsSeen, r.buttons);
      for (const [k, v] of Object.entries(r.found)) {
        if (!live[k]) live[k] = { n: 0, visible: 0, where: [] };
        live[k].n = Math.max(live[k].n, v.n);
        live[k].visible = Math.max(live[k].visible, v.visible);
        if (live[k].where.indexOf(s.label) === -1) live[k].where.push(s.label);
      }
    }
  } finally {
    await browser.close();
  }

  console.log('=== LATENT ARIAL -- <button> rendering in the UA form-control default ===');
  console.log('    UA control font : [' + controls.UA + ']');
  console.log('    app stack       : [' + controls.APP + ']');
  console.log('    font:inherit    : [' + controls.INHERITED + ']');
  console.log('    buttons walked  : ' + buttonsSeen + ' (max over ' + SURFACES.length + ' surfaces)');

  const ctlFails = [];
  for (const ps of perSurfaceControls) {
    const c = ps.c, w = ' [' + ps.surface + ']';
    if (!c.A_bareDetected) ctlFails.push('CONTROL A' + w + ': the WALK did not flag a planted bare <button> -- the detector, the shadow walk or keyOf is broken, so every green it reports is meaningless');
    if (!c.B_inheritClean) ctlFails.push('CONTROL B' + w + ': a planted `font:inherit` <button> WAS detected -- the detector flags everything');
    if (!c.C_uaDiffersFromApp) ctlFails.push('CONTROL C' + w + ': the UA control font equals the app stack on this platform -- this check cannot see the defect here');
    /* THE NON-EMPTY WALK. `buttons` was printed and never asserted, so a run that enumerated ZERO
       application buttons -- a boot that silently failed, a selector that stopped matching -- would
       still print PASS at 0 offenders. An empty walk is the one way this ratchet can be green
       without having looked at anything. (2026-07-29 W4 cold verify, F-6.) */
    if (!(ps.buttons > 0)) ctlFails.push('NON-EMPTY WALK' + w + ': ZERO application <button>s were enumerated on this surface -- the walk found nothing, so a green here would mean nothing');
  }
  if (ctlFails.length) {
    console.log('\nSELF-TEST ABORT:');
    for (const f of ctlFails) console.log('  ' + f);
    process.exit(1);
  }
  console.log('    self-test       : bare probe detected, font:inherit probe clean, UA != app stack');

  if (WRITE_DEBT) {
    const old = fs.existsSync(DEBT_FILE) ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8')) : {};
    const out = {};
    for (const k of Object.keys(live).sort()) {
      out[k] = old[k] || 'TODO: state why this one is not fixed here';
    }
    fs.writeFileSync(DEBT_FILE, JSON.stringify(out, null, 2) + '\n', 'ascii');
    console.log('\nwrote ' + Object.keys(out).length + ' allowlisted component(s) to ' + DEBT_FILE);
    process.exit(0);
  }

  const DEBT = fs.existsSync(DEBT_FILE) ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8')) : {};
  const liveKeys = Object.keys(live).sort();
  const isNew = liveKeys.filter((k) => !(k in DEBT));
  const stale = Object.keys(DEBT).filter((k) => !(k in live)).sort();

  console.log('\n    components in UA default : ' + liveKeys.length
    + '   allowlisted: ' + Object.keys(DEBT).length
    + '   NEW: ' + isNew.length + '   STALE: ' + stale.length);
  for (const k of liveKeys) {
    console.log('      ' + (k in DEBT ? 'debt' : 'NEW ') + '  ' + String(live[k].n).padStart(3)
      + ' x .' + k + '   (visible ' + live[k].visible + ')  [' + live[k].where.join(', ') + ']'
      + (k in DEBT ? '\n              -- ' + DEBT[k] : ''));
  }

  if (!isNew.length && !stale.length) {
    console.log('\nLATENT ARIAL: PASS  (' + liveKeys.length + ' known component(s) allowlisted in '
      + 'latent_arial_debt.json; no new latent-Arial button, no fixed entry left stale)');
    process.exit(0);
  }
  if (isNew.length) {
    console.log('\n  ' + isNew.length + ' NEW latent-Arial component(s) -- a <button> with no author'
      + ' font-family renders in the UA control font, not the app stack:');
    for (const k of isNew) console.log('    .' + k + '   ' + live[k].n + ' element(s), '
      + live[k].visible + ' visible, on [' + live[k].where.join(', ') + ']');
    console.log('  Fix: declare `font:inherit` on the button (see .hm-room / .hm-cta / .hm-act).');
  }
  if (stale.length) {
    console.log('\n  ' + stale.length + ' STALE allowlist entr(ies) -- fixed, so delete from latent_arial_debt.json:');
    for (const k of stale) console.log('    .' + k);
  }
  console.log('\nLATENT ARIAL: FAIL');
  process.exit(1);
})().catch((e) => {
  console.log('LATENT ARIAL: FAIL -- ' + (e && e.message ? e.message : String(e)));
  process.exit(1);
});
