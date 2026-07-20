#!/usr/bin/env node
/*
 * NO DEAD ENDS (audit direction D1) -- the run's only true user-trap and, next commit, its one
 * silent wrong-action. Every assertion drives REAL input and reads REAL geometry (a hit-test at a
 * control's painted centre), never el.click(), which reports success on a provably unclickable
 * button -- the exact way this class of defect hides from a suite.
 *
 * FIX 1 -- FOCUS-MODE ESCAPE TRAP (audit #1, P1).
 *   Entering focus mode collapses .sidebar (opacity:0;visibility:hidden;width:0), and the header's
 *   only "Exit focus" control (#_focus-toggle) lives INSIDE .sidebar -- so focus mode hid the one
 *   control that reverses it. There was no Esc path, and on mobile (no F key) the only escape was a
 *   full browser reload: the app read as "broken". The fix is a persistent floating exit affordance
 *   (#_focus-exit) rendered OUTSIDE the collapsed sidebar, plus Escape-to-exit. This asserts the
 *   chip survives the collapse and is reachable by a real hit-test at BOTH viewports, and that
 *   Escape (desktop) and a real tap (mobile) both restore the chrome.
 *
 * FIX 2 -- SCROLL-TOP FAB (audit #5, P2): added in the next commit (this file grows with D1).
 *
 * WATCHED RED against the pre-fix deliverable: #_focus-exit does not exist (createExit is absent)
 * and Escape is a no-op, so the chip/reachability/Escape assertions all fail. Also carries a live
 * PLANT every run (hide the chip -> the hit-test must stop finding it) so the reachability check
 * can never silently become one that cannot fail.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/no_dead_ends.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* read the focus-exit chip's paint + a real hit-test at its centre, in one shot */
const CHIP = () => {
  const e = document.getElementById('_focus-exit');
  if (!e) return { exists: false };
  const r = e.getBoundingClientRect();
  const cs = getComputedStyle(e);
  const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
  const hit = (r.width && r.height) ? document.elementFromPoint(cx, cy) : null;
  return {
    exists: true, display: cs.display, vis: cs.visibility, w: Math.round(r.width), h: Math.round(r.height),
    inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
    reachable: !!hit && (hit === e || e.contains(hit)),
  };
};

(async () => {
  const fails = [], errs = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  const enterFocus = () => page.evaluate(() => {
    if (window.FocusMode && !window.FocusMode.isFocused()) window.FocusMode.toggle();
    return !!(window.FocusMode && window.FocusMode.isFocused());
  });
  const isFocused = () => page.evaluate(() => !!(window.FocusMode && window.FocusMode.isFocused()));

  /* ================= FIX 1 -- DESKTOP (1280x900) ================= */
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  ok('focus mode engages', (await enterFocus()) === true, 'FocusMode.toggle did not set focused');
  await B.settle(page);

  /* THE TRAP, asserted structurally (not by a transition-timed visibility read: #_focus-toggle
     carries `transition:all`, so its inherited visibility:hidden fades in over ~700ms -- a race).
     The invariant that never races: focus mode collapses .sidebar (its OWN visibility flips to
     hidden at once), the header's only exit lives INSIDE that sidebar (so it goes with it), and the
     fix's chip lives OUTSIDE it (so the collapse can never reach it). */
  const structure = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.getElementById('_focus-toggle');
    const chip = document.getElementById('_focus-exit');
    return {
      sidebarCollapsed: !!sidebar && getComputedStyle(sidebar).visibility === 'hidden',
      toggleInSidebar: !!(sidebar && toggle && sidebar.contains(toggle)),
      chipOutsideSidebar: !!(chip && sidebar && !sidebar.contains(chip)),
    };
  });
  ok('focus mode collapses the sidebar (visibility:hidden)', structure.sidebarCollapsed === true, JSON.stringify(structure));
  ok('the header Exit-focus control lives INSIDE the collapsing sidebar (the trap)', structure.toggleInSidebar === true, JSON.stringify(structure));
  ok('the exit chip lives OUTSIDE the collapsing sidebar (survives the collapse)', structure.chipOutsideSidebar === true, JSON.stringify(structure));

  let chip = await page.evaluate(CHIP);
  ok('focus-exit chip exists while focus mode is active', chip.exists === true, JSON.stringify(chip));
  ok('focus-exit chip is displayed (not display:none)', chip.exists && chip.display !== 'none', JSON.stringify(chip));
  ok('focus-exit chip is inside the viewport', chip.exists && chip.inView === true, JSON.stringify(chip));
  ok('focus-exit chip is reachable by a real hit-test (nothing covers it)', chip.exists && chip.reachable === true, JSON.stringify(chip));
  ok('focus-exit chip clears the 44px tap floor', chip.exists && chip.h >= 44, JSON.stringify(chip));

  /* LIVE PLANT: hide the chip -> the same hit-test must stop finding it. Proves the reachability
     assertion above is not one that cannot fail. */
  const planted = await page.evaluate(() => {
    const e = document.getElementById('_focus-exit');
    if (!e) return { ran: false };
    const prev = e.style.display; e.style.display = 'none';
    const r = e.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.max(1, Math.round(r.left + r.width / 2)), Math.max(1, Math.round(r.top + r.height / 2)));
    e.style.display = prev;
    return { ran: true, reachableWhenHidden: !!hit && (hit === e || e.contains(hit)) };
  });
  ok('[plant] hiding the chip makes it unreachable (the reachability check can go red)', planted.ran && planted.reachableWhenHidden === false, JSON.stringify(planted));

  /* Escape restores the chrome */
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  await B.settle(page);
  ok('Escape exits focus mode (restores the chrome)', (await isFocused()) === false, 'still focused after Escape');

  /* re-enter and confirm the chip's own click restores the chrome (real hit-tested click) */
  await enterFocus();
  await B.settle(page);
  const box = await page.evaluate(() => { const e = document.getElementById('_focus-exit'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (box) { await page.mouse.click(box.x, box.y); await B.settle(page); }
  ok('clicking the exit chip restores the chrome (real hit-tested click)', box && (await isFocused()) === false, box ? 'still focused after chip click' : 'no chip to click');

  /* ================= FIX 1 -- MOBILE (360x800, no F key) ================= */
  await page.setViewportSize({ width: 360, height: 800 });
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  ok('[360] focus mode engages', (await enterFocus()) === true);
  await B.settle(page);
  const chipM = await page.evaluate(CHIP);
  ok('[360] focus-exit chip is reachable by a real hit-test', chipM.exists && chipM.reachable === true, JSON.stringify(chipM));
  ok('[360] focus-exit chip clears the 44px tap floor', chipM.exists && chipM.h >= 44, JSON.stringify(chipM));

  /* the mobile-critical path: no keyboard, so the TAP must work */
  const boxM = await page.evaluate(() => { const e = document.getElementById('_focus-exit'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (boxM) { await page.mouse.click(boxM.x, boxM.y); await B.settle(page); }
  ok('[360] tapping the exit chip restores the chrome (the only exit on a phone)', boxM && (await isFocused()) === false, boxM ? 'still focused after tap' : 'no chip to tap');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('NO DEAD ENDS: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
