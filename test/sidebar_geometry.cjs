#!/usr/bin/env node
/*
 * SIDEBAR GEOMETRY -- the two desktop measurements that decide whether the sidebar shows the app
 * or hides it. Both are W4 guards (2026-07-29 frontend audit, P2-4 and P2-6) and both were RED
 * on the build that audit measured.
 *
 * WHY A GEOMETRY CHECK AT ALL. Neither defect is visible to anything else in the gate. VR
 * captures the sidebar at rest and a clipped switcher looks like a deliberate short label; the
 * behaviour checks all pass, because both controls WORK -- the switcher switches and the tabs
 * switch panes. What was wrong was how much of each you could SEE, and only a measurement says
 * that.
 *
 * ---------------------------------------------------------------------------------------------
 * G-SWITCHER -- .tn-current clientWidth / scrollWidth at DESKTOP widths.
 *
 * Measured on the pre-fix build: clientWidth 18px against scrollWidth 146px -- 12% of the current
 * topic name -- and IDENTICALLY at 1024/1280/1440/1600/1920, because the sidebar is fixed-width:
 * .tn-trigger is ~132px at every desktop width, the "REHEARSING" eyebrow takes its full natural
 * width and the chevron takes its, so flex:1 gets the remainder. The primary topic-switching
 * control never showed what it was set to, on all 46 topics, at every desktop width, and rendered
 * as [REHEARSING S: v] -- which reads as a rendering glitch rather than a control.
 *
 * THE THRESHOLDS ARE ANCHORED ON TWO MEASURED POPULATIONS, NOT PICKED. All 46 topics, 1280px:
 *
 *     pre-fix   ratio 0.063 .. 0.243     clientWidth 18px on every topic
 *     fixed     ratio 0.365 .. 1.000     clientWidth 103px on every topic
 *
 * The populations do not overlap and nothing lies in 0.243 .. 0.365, so any line in that gap
 * separates them. MIN_RATIO = 0.30 sits near the middle: 23% clear of the pre-fix BEST case (so
 * the defect cannot return quietly) and 18% clear of the fixed WORST case, "Production Debugging
 * and Incident Diagnosis" at 103/282 (so a future longer title has room before it trips). It is
 * deliberately not pinned to 0.365, today's floor -- a guard set at the observed worst case fails
 * the first time someone writes a longer name, which is authoring, not regression.
 *
 * AND A SECOND, NAME-INDEPENDENT ARM. The ratio conflates two things: how wide the box is and how
 * long the name happens to be. A very long title lowers the ratio no matter how healthy the
 * control is. So MIN_PX asserts the box itself: clientWidth was 18px on all 46 topics before and
 * is 103px on all 46 after -- it does not vary with the name at all, because the sidebar is
 * fixed-width. 60px sits midway between those two constants. The ratio arm says "you can read a
 * useful share of the name"; the px arm says "the box did not collapse again", and the second
 * survives a future title long enough to drag the first down.
 *
 * Ellipsis is not the failure -- a name longer than the box SHOULD ellipsise. Showing an eighth
 * of it is.
 *
 * ---------------------------------------------------------------------------------------------
 * G-NAV-FOLD -- how many of the 9 pane tabs are above the fold at 1280x800.
 *
 * Pre-fix: 4. The sidebar's scrollHeight was 1650 against a 800px viewport, and the 614px above
 * the nav held brand, ARC chip, topic h1, FOCUS chip, switcher row, Continue dock, Mock CTA, the
 * interrupt toggle, Text size and the Focus Timer -- i.e. over half the app's surfaces were
 * invisible on landing, and what pushed them down was a font-size control and a pomodoro: two
 * set-once controls sitting above a nav used every few seconds.
 *
 * MIN_TABS = 7 is the audit's own line ("7-8 tabs above the fold at 800px"), and the count here
 * uses the audit's own definition -- a tab with ANY part above the fold, which is what its
 * "Visible: walk, drill, wb, sys" = 4 counted. The stricter fully-above count is REPORTED beside
 * it, deliberately unasserted: at the time of writing it is 6, because the 7th tab misses by 3px.
 * Asserting the strict count at 6 would have meant either shaving a spacing token to buy 3px --
 * gaming the measurement rather than improving the app -- or writing a threshold that says less
 * than the audit asked for. Reporting both numbers says the true thing instead.
 *
 * ---------------------------------------------------------------------------------------------
 * SELF-TEST, because a geometry probe that silently stops finding its element reports a perfect
 * score. Both arms run a NEGATIVE CONTROL on every invocation: the switcher arm re-measures with
 * the wrap rule forced off and must see the ratio collapse to UNDER HALF OF LIVE, and the fold arm
 * re-counts with the viewport's own fold line moved up and must see the count DROP. If either
 * control fails to move the number, this check cannot see its own defect and it ABORTS instead of
 * passing.
 *
 * BOTH CONTROLS ARE RELATIVE, AND BOTH WERE ABSOLUTE ONCE. The switcher control asserted
 * `off.ratio < MIN_RATIO`, which passes vacuously on a build already under the floor -- it
 * reported PASS on the pre-fix build, inside an 11-of-13 red (2026-07-29 W4 cold verify, F-5).
 * The fold control derived its shift from MIN_TABS, which went NEGATIVE on that same build and
 * failed for a reason unrelated to the app. A control anchored on a threshold rather than on what
 * the build in front of it actually shows will mislead on exactly the builds that matter.
 *
 * Exit: 0 = pass, 1 = FAIL, 2 = SKIP (no browser).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* The five desktop widths the audit measured. The sidebar is fixed-width, so these should all
   report the same ratio -- if they ever diverge, that is itself worth seeing. */
const WIDTHS = [1024, 1280, 1440, 1600, 1920];
const MIN_RATIO = 0.30;   /* anchored above: fixed corpus 0.365-1.000, pre-fix defect 0.063-0.243 */
const MIN_PX = 60;        /* clientWidth is name-independent: 18px pre-fix, 103px fixed, on all 46 */
const MIN_TABS = 7;       /* the audit's line; pre-fix 4 */
const FOLD_W = 1280, FOLD_H = 800;

const fails = [], notes = [];
const chk = (name, ok, detail) => {
  notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail));
  if (!ok) fails.push(name);
};

/* Runs IN PAGE. `force` optionally disables the wrap, for the negative control. */
const SWITCHER = (force) => {
  const el = document.getElementById('tncurrent');
  const trig = document.getElementById('tntrigger');
  if (!el || !trig) return { err: '#tncurrent / #tntrigger not in the DOM' };
  let undo = null;
  if (force) {
    const st = document.createElement('style');
    st.textContent = '@media(min-width:920px){.sidebar .tn-trigger{flex-wrap:nowrap!important}.sidebar .tn-eyebrow{flex:0 0 auto!important}}';
    document.head.appendChild(st);
    undo = st;
    void trig.offsetWidth;   /* force layout before reading */
  }
  const r = {
    innerWidth: window.innerWidth,
    text: (el.textContent || '').trim(),
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
    ratio: el.scrollWidth ? el.clientWidth / el.scrollWidth : null,
  };
  if (undo) undo.remove();
  return r;
};

/* Runs IN PAGE. `foldShift` raises the fold line, for the negative control. */
const FOLD = (foldShift) => {
  const side = document.querySelector('.sidebar');
  if (!side) return { err: 'no .sidebar' };
  const fold = window.innerHeight - (foldShift || 0);
  const tabs = Array.from(document.querySelectorAll('.sidebar .seg button'))
    .filter((b) => !b.hasAttribute('hidden'))
    .map((b) => {
      const q = b.getBoundingClientRect();
      return { tab: b.getAttribute('data-tab'), top: Math.round(q.top), bottom: Math.round(q.bottom),
               anyAbove: q.top < fold, fullyAbove: q.bottom <= fold };
    });
  return {
    innerWidth: window.innerWidth, innerHeight: window.innerHeight,
    sidebarScrollH: side.scrollHeight,
    total: tabs.length,
    anyAbove: tabs.filter((t) => t.anyAbove).length,
    fullyAbove: tabs.filter((t) => t.fullyAbove).length,
    segTop: Math.round(side.querySelector('.seg').getBoundingClientRect().top),
    tabs,
  };
};

async function ctx(browser, w, h) {
  const c = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
    reducedMotion: 'reduce', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await c.newPage();
  await B.gotoApp(page, HTML, { hash: '#event-driven/walk' });
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash');
  await B.until(page, () => !!document.querySelector('.sidebar .seg button'), null, B.ACT_MS, 'sidebar nav mounted');
  return { c, page };
}

(async () => {
  let exe = null;
  try { exe = chromium.executablePath(); } catch (e) { exe = null; }
  if (!exe || !fs.existsSync(exe)) {
    console.log('SIDEBAR GEOMETRY: SKIP (no Chromium -- run `npx playwright install chromium`)');
    process.exit(2);
  }
  if (!fs.existsSync(HTML)) { console.log('SIDEBAR GEOMETRY: FAIL -- deliverable not found: ' + HTML); process.exit(1); }

  const browser = await chromium.launch(B.launchOpts());
  let control = null;
  try {
    /* ---------------- G-SWITCHER, five desktop widths ---------------- */
    for (const w of WIDTHS) {
      const { c, page } = await ctx(browser, w, 900);
      const r = await page.evaluate(SWITCHER, false);
      if (r.err) { chk('switcher @' + w, false, r.err); await c.close(); continue; }
      /* A viewport that silently did not apply turns a red into a green. */
      if (r.innerWidth !== w) { chk('switcher @' + w, false, 'viewport did not apply: page reports ' + r.innerWidth); await c.close(); continue; }
      chk('.tn-current shows the topic name at ' + w + 'px (ratio >= ' + MIN_RATIO + ')',
        r.ratio !== null && r.ratio >= MIN_RATIO,
        'clientWidth ' + r.clientWidth + ' / scrollWidth ' + r.scrollWidth + ' = ' + (r.ratio === null ? 'n/a' : r.ratio.toFixed(3))
        + '  name="' + r.text + '"');
      chk('.tn-current is a real box at ' + w + 'px (clientWidth >= ' + MIN_PX + 'px, name-independent)',
        r.clientWidth >= MIN_PX,
        'clientWidth ' + r.clientWidth + 'px  (18px pre-fix, 103px fixed, on every topic -- the sidebar is fixed-width)');
      if (w === FOLD_W) control = { page, c, r };
      else await c.close();
    }

    /* NEGATIVE CONTROL 1: force the wrap off and require the ratio to COLLAPSE RELATIVE TO LIVE.
       It used to assert `off.ratio < MIN_RATIO` -- an absolute floor -- which passes VACUOUSLY on
       any build already below that floor, without the forced-off style having done anything. That
       is exactly what happened on the pre-fix build, where it reported PASS inside an 11-of-13 red
       (2026-07-29 W4 cold verify, F-5). A control that reports success on the very build it is
       meant to characterise is not measuring the rule. Relative is the honest form: whatever the
       live ratio is, removing the wrap must at least halve it. */
    if (control) {
      const off = await control.page.evaluate(SWITCHER, true);
      const live = control.r.ratio;
      const collapsed = off && off.ratio !== null && live !== null && off.ratio < live * 0.5;
      chk('[negative control] with the >=920px wrap forced off, the ratio COLLAPSES to under half of live',
        collapsed, 'forced-off ratio ' + (off && off.ratio !== null ? off.ratio.toFixed(3) : 'n/a')
        + ' vs live ' + (live === null ? 'n/a' : live.toFixed(3))
        + ' (needs < ' + (live === null ? 'n/a' : (live * 0.5).toFixed(3)) + ')'
        + '  (if this does not move, the probe is not measuring the rule and its greens mean nothing)');
      await control.c.close();
    }

    /* ---------------- G-NAV-FOLD at 1280x800 ---------------- */
    const { c, page } = await ctx(browser, FOLD_W, FOLD_H);
    const f = await page.evaluate(FOLD, 0);
    if (f.err) { chk('nav fold', false, f.err); }
    else if (f.innerWidth !== FOLD_W || f.innerHeight !== FOLD_H) {
      chk('nav fold', false, 'viewport did not apply: page reports ' + f.innerWidth + 'x' + f.innerHeight);
    } else {
      chk('at least ' + MIN_TABS + ' of the ' + f.total + ' pane tabs are above the fold at ' + FOLD_W + 'x' + FOLD_H,
        f.anyAbove >= MIN_TABS,
        f.anyAbove + ' above the fold (' + f.fullyAbove + ' of them FULLY), .seg top=' + f.segTop
        + ', sidebar scrollHeight=' + f.sidebarScrollH
        + '  [below: ' + (f.tabs.filter((t) => !t.anyAbove).map((t) => t.tab).join(', ') || 'none') + ']');

      /* NEGATIVE CONTROL 2: move the fold line up past the LAST tab that is currently above it;
         the count MUST drop. Anchored on what this build actually shows, NOT on MIN_TABS -- a
         shift derived from the threshold goes NEGATIVE on a build with fewer tabs above the fold
         (measured: -52px on the pre-fix build, which moved the fold DOWN, raised the count 4 -> 5
         and failed the control for a reason that had nothing to do with the app). A control that
         can misfire on the very build it is meant to catch is worse than no control. */
      const above = f.tabs.filter((t) => t.anyAbove);
      if (!above.length) {
        chk('[negative control] the fold counter responds to the fold line', false,
          'no tab is above the fold at all, so the control cannot be armed');
      } else {
        /* +2 because the reported `top` is ROUNDED while the comparison uses the raw float: a
           tab reported at 759 may really sit at 758.6, so a fold placed at exactly 759 still
           counts it and the control reads as broken when it is only off by half a pixel. */
        const shift = f.innerHeight - above[above.length - 1].top + 2;
        const g = await page.evaluate(FOLD, shift);
        chk('[negative control] raising the fold line by ' + shift + 'px DROPS the above-fold count',
          g.anyAbove < f.anyAbove,
          'shifted count ' + g.anyAbove + ' vs live ' + f.anyAbove
          + '  (if this does not move, the counter is not reading the fold and its greens mean nothing)');
      }
    }
    await c.close();
  } finally {
    await browser.close();
  }

  console.log('=== SIDEBAR GEOMETRY -- the switcher shows its value, the nav clears the fold ===');
  notes.forEach((n) => console.log(n));
  if (fails.length) {
    console.log('');
    fails.forEach((f) => console.log('  - ' + f));
    console.log('\nSIDEBAR GEOMETRY: FAIL  (' + fails.length + ' of ' + notes.length + ' assertion(s))');
    process.exit(1);
  }
  console.log('\nSIDEBAR GEOMETRY: PASS  (' + notes.length + ' assertions: .tn-current readable at '
    + WIDTHS.length + ' desktop widths, ' + MIN_TABS + '+ pane tabs above the '
    + FOLD_W + 'x' + FOLD_H + ' fold; both negative controls moved)');
  process.exit(0);
})().catch((e) => {
  console.log('SIDEBAR GEOMETRY: FAIL -- ' + (e && e.message ? e.message : String(e)));
  process.exit(1);
});
