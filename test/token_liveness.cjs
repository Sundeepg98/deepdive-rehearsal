/* ===================== TOKEN LIVENESS -- every motion token must RESOLVE (W1 / G1) =====================
 *
 * THE BUG CLASS THIS EXISTS FOR, and why nothing else in the gate could see it.
 *
 * src/styles.css shipped `--ease-spring:var(--ease-spring);` -- a self-reference. Per CSS Variables,
 * a cycle is INVALID AT COMPUTED-VALUE TIME, so the token computes to the EMPTY STRING. That alone
 * would be a wrong curve. The actual damage is one level down: an invalid var() inside a SHORTHAND
 * resolves the WHOLE DECLARATION to `unset`. So every rule that wrote
 *
 *     transition: left 250ms var(--ease-spring), transform 250ms var(--ease-spring)
 *
 * did not get a bad easing -- it got NO TRANSITION AT ALL. Measured on the shipped build:
 * `.inttog-dot::after` (the "interviewer cuts in" toggle KNOB) computed `all 0s`, so the track
 * animated over 250ms while the knob TELEPORTED; `.mock-x` lost all five of its declared
 * transitions. The one micro-interaction where motion carries the entire meaning, dead, in a way
 * that reads to a user as a rendering fault.
 *
 * AND IT IS INVISIBLE TO EVERYTHING ELSE WE RUN:
 *   - VR screenshots are captured AT REST. A transition that never runs looks identical at rest.
 *   - The console says nothing: an invalid var() is not a parse error, it is a valid declaration
 *     that resolves to garbage at computed-value time. DevTools shows the authored text.
 *   - css_syntax / stylelint see well-formed CSS, because it IS well-formed CSS.
 *   - No behaviour check watches an easing curve.
 * The only way to catch it is to ASK THE ENGINE what the token computed to. That is this file.
 *
 * FOUR ARMS, all pure computed-style reads -- no wall clock, no font metrics, no screenshots, so
 * Ubuntu CI and this Windows box must agree byte for byte.
 *
 *   1. DECLARED  -> every --ease-* / --duration-* declared anywhere in the document's CSS computes
 *                   to a NON-EMPTY value on :root. (Catches the cycle directly.)
 *   2. USABLE    -> each token, used the way the app uses it (inside a `transition` SHORTHAND on a
 *                   probe element), yields a LIVE declaration. This is the arm that models the real
 *                   damage, and it is written so a legitimately-0ms token cannot fake a pass:
 *                     ease token     -> `opacity 250ms var(--ease-X)`      expect duration 0.25s
 *                                        (an invalid var resets the shorthand -> 0s)
 *                     duration token -> `opacity var(--duration-X) linear` expect timing `linear`
 *                                        (an invalid var resets the shorthand -> `ease`), so
 *                                        --duration-instant:0ms still passes honestly.
 *   3. RECEIPTS  -> the two SHIPPED elements the audit measured dead (`.mock-x`, `.inttog-dot::after`)
 *                   compute a real transition. Arms 1-2 are the general law; this is the witness.
 *   4. DARK      -> arms 1-2 again under html[data-theme="dark"]. A token can be re-declared per
 *                   theme, so a theme block is a second place the cycle could be reintroduced.
 *
 * WATCHED RED: on the pre-fix build arm 1 reports --ease-spring empty, arm 2 reports the probe at
 * 0s, and arm 3 reports .mock-x / .inttog-dot::after at 0s -- in both themes.
 *
 * Usage: node test/token_liveness.cjs [deliverable.html]   (CHROME=<path>)
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

/* Runs IN PAGE. Collects every --ease- / --duration- NAME declared anywhere in the document's CSS,
   then asks the engine what each one actually computes to and whether it survives a shorthand.
   (No glob-star-slash in this comment: it would close the block early. Same trap family as the
   backtick warnings in base-styles.js.) */
const PROBE = () => {
  const NAMES = new Set();
  const walk = (rules) => {
    if (!rules) return;
    for (const r of rules) {
      if (r.style) {
        for (let i = 0; i < r.style.length; i++) {
          const p = r.style[i];
          if (/^--(ease|duration)-/.test(p)) NAMES.add(p);
        }
      }
      if (r.cssRules) walk(r.cssRules);          /* @media, @supports, @layer ... */
    }
  };
  const sheets = Array.prototype.slice.call(document.styleSheets)
    .concat(Array.prototype.slice.call(document.adoptedStyleSheets || []));
  for (const s of sheets) {
    try { walk(s.cssRules); } catch (e) { /* cross-origin sheet: none here, but never die on one */ }
  }

  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:-99999px;top:0;width:1px;height:1px';
  document.body.appendChild(probe);

  const rows = [];
  for (const name of Array.from(NAMES).sort()) {
    const computed = (cs.getPropertyValue(name) || '').trim();
    const isEase = name.indexOf('--ease-') === 0;
    /* THE SHORTHAND TEST. Set it fresh each time; if the var() is invalid at computed-value time
       the WHOLE shorthand becomes `unset`, which is exactly the failure the app shipped. */
    probe.style.transition = '';
    probe.style.transition = isEase
      ? ('opacity 250ms var(' + name + ')')
      : ('opacity var(' + name + ') linear');
    const pcs = getComputedStyle(probe);
    rows.push({
      name: name,
      computed: computed,
      dur: pcs.transitionDuration,
      timing: pcs.transitionTimingFunction,
      /* an invalid var resets the shorthand: duration -> 0s (ease arm), timing -> ease (duration arm) */
      live: isEase ? (pcs.transitionDuration === '0.25s') : (pcs.transitionTimingFunction === 'linear'),
    });
  }
  probe.remove();

  /* ARM 3 -- the two shipped elements the audit measured dead. A computed transition is readable
     even on a display:none node, so neither overlay needs to be opened. */
  const receipt = (sel, pseudo) => {
    const el = document.querySelector(sel);
    if (!el) return { sel: sel + (pseudo || ''), found: false };
    const c = getComputedStyle(el, pseudo || undefined);
    return {
      sel: sel + (pseudo || ''), found: true,
      prop: c.transitionProperty, dur: c.transitionDuration, timing: c.transitionTimingFunction,
    };
  };
  return {
    rows: rows,
    count: rows.length,
    receipts: [receipt('.mock-x'), receipt('.inttog-dot', '::after')],
  };
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  /* >=1280px so the desktop chrome (and everything that carries these tokens) is the layout under
     test; the assertions themselves are layout-independent. */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await B.settle(page);
    const r = await page.evaluate(PROBE);
    const tag = '[' + theme + '] ';

    /* The registry itself must not silently empty out -- a walk that finds nothing would make
       every assertion below vacuously true, which is the "check that cannot fail" trap. */
    chk(tag + 'the motion-token registry is non-empty (a vacuous pass is a dead check)',
      r.count >= 8, 'found only ' + r.count + ' --ease-*/--duration-* declarations');

    const empty = r.rows.filter((x) => !x.computed);
    chk(tag + 'arm 1: every declared --ease-*/--duration-* computes to a NON-EMPTY value on :root',
      empty.length === 0,
      empty.map((x) => x.name + ' -> "" (empty: invalid at computed-value time, e.g. a var() cycle)').join('; '));

    const dead = r.rows.filter((x) => !x.live);
    chk(tag + 'arm 2: every motion token survives a `transition` SHORTHAND (an invalid var() resets the whole declaration to unset)',
      dead.length === 0,
      dead.map((x) => x.name + ' -> transition ' + x.dur + ' ' + x.timing + ' (expected ' +
        (x.name.indexOf('--ease-') === 0 ? '0.25s' : 'linear') + ')').join('; '));

    for (const rc of r.receipts) {
      if (!rc.found) { chk(tag + 'arm 3: ' + rc.sel + ' exists (the audit measured it dead here)', false, 'selector not present in the built page'); continue; }
      const alive = rc.dur !== '0s' && rc.prop !== 'all';
      chk(tag + 'arm 3: ' + rc.sel + ' computes a REAL transition (the audit measured `all 0s` here)',
        alive, 'transition-property=' + rc.prop + ' duration=' + rc.dur + ' timing=' + rc.timing +
        ' (`all` + `0s` is the shorthand-reset signature)');
    }
  }

  await page.evaluate(() => { delete document.documentElement.dataset.theme; });
  await browser.close();
  notes.forEach((n) => console.log(n));
  if (fails.length) { fails.forEach((f) => console.log('  - ' + f)); return B.finish(1, 'TOKEN LIVENESS: FAIL (' + fails.length + ')'); }
  console.log('TOKEN LIVENESS: PASS  (' + notes.length + ' assertions: every --ease-*/--duration-* resolves, survives a shorthand, and the two audited elements animate -- both themes)');
  return B.finish(0);
})().catch((e) => { console.error(e && e.stack || e); return B.finish(1, 'TOKEN LIVENESS: FAIL (harness error: ' + (e && e.message) + ')'); });
