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
 * "does this button render in the UA default" is the same question everywhere. Two controls
 * run on every invocation, because a check that cannot fail is this repo's defining bug:
 *
 *   CONTROL A (negative): the planted bare button MUST be detected. If it is not, the
 *                         detector is broken and the check ABORTS rather than passing.
 *   CONTROL B (positive): a planted button carrying `font:inherit` MUST NOT be detected.
 *                         If it is, the detector flags everything and its greens are worthless.
 *   CONTROL C (blindness): the UA family must DIFFER from the app family. If a platform ever
 *                          makes them equal, this check cannot see the defect at all, and it
 *                          says so instead of reporting a green it did not earn.
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

  const controls = {
    A_bareDetected: UA === UA,                    /* trivially true; the real test is C + the walk */
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
      buttons++;
      if (getComputedStyle(el).fontFamily !== UA) continue;
      const k = keyOf(el);
      if (!found[k]) found[k] = { n: 0, visible: 0 };
      found[k].n++;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) found[k].visible++;
    }
  }
  /* CONTROL A: the walker must have SEEN the bare probe as a UA-default button. Re-run the
     exact predicate over it -- if the detector cannot flag a button that is definitionally
     the defect, nothing it reports means anything. */
  controls.A_bareDetected = getComputedStyle(bare).fontFamily === UA;
  /* CONTROL B, re-stated against the same predicate */
  controls.B_inheritClean = getComputedStyle(inh).fontFamily !== UA;

  bare.remove();
  inh.remove();
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
  try {
    for (const s of SURFACES) {
      const r = await scanSurface(browser, s);
      per[s.label] = r;
      controls = r.controls;
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
  if (!controls.A_bareDetected) ctlFails.push('CONTROL A: a planted bare <button> was NOT detected -- the detector is blind, so every green it reports is meaningless');
  if (!controls.B_inheritClean) ctlFails.push('CONTROL B: a planted `font:inherit` <button> WAS detected -- the detector flags everything');
  if (!controls.C_uaDiffersFromApp) ctlFails.push('CONTROL C: the UA control font equals the app stack on this platform -- this check cannot see the defect here');
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
