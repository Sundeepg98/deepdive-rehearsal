/* ===================== SEG STRIP STATE, EXPOSED TO AT (W1 / G3) =====================
 *
 * The nine pane tabs are the app's primary navigation. `switchTab` (shell.js) toggled a CLASS on
 * the active one and nothing else -- so all nine returned `ariaSelected: null, ariaCurrent: null,
 * ariaPressed: null`. A screen-reader user could hear which pane was RECOMMENDED (the flow pip
 * carries aria-describedby -> "Recommended next", guarded in flow_a11y) but never which pane they
 * were actually IN. The app already does this correctly two files over -- panels.js and
 * topic-nav.js both emit aria-current="true" -- so the strip was the outlier, not the pattern.
 *
 * WHY A CHECK AND NOT A GREP. The write lives in the same loop as the class toggle, and the whole
 * point is that the two must never drift apart again: a future refactor that keeps the class and
 * drops the attribute is exactly the regression this guards, and it is invisible to VR (zero
 * visual change by design) and to every behaviour check (the pane still switches).
 *
 * WHAT IT ASSERTS, for EVERY tab in the strip, driven through the real router:
 *   1. exactly ONE tab carries the active class;
 *   2. that tab carries aria-current="true";
 *   3. NO other tab carries aria-current at all -- a stale attribute left behind on the tab you
 *      just left is worse than none, because AT then reports two current locations.
 * Walking every tab is also the anti-vacuous arm: an attribute hardcoded on one button in the
 * HTML would pass on that tab and fail on the other eight.
 *
 * Pure attribute reads -- no clock, no fonts, no pixels. WATCHED RED: every tab fails arm 2 on the
 * pre-fix build.
 *
 * Usage: node test/seg_state.cjs [deliverable.html]   (CHROME=<path>)
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

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  const tabs = await page.evaluate(() =>
    Array.prototype.map.call(document.querySelectorAll('.seg button'), (b) => b.getAttribute('data-tab')));
  chk('the seg strip has its full set of tabs (a shrunken strip would make this check vacuous)',
    tabs.length >= 9, 'found ' + tabs.length + ' tabs: ' + JSON.stringify(tabs));

  for (const tab of tabs) {
    /* Drive it the way a user does -- through the router, not by poking the DOM. */
    await page.evaluate((t) => { if (window.Router) window.Router.navigate(t); else switchTab(t); }, tab);
    await B.until(page, (t) => {
      const b = document.querySelector('.seg button[data-tab="' + t + '"]');
      return !!b && b.classList.contains('on');
    }, tab, B.ACT_MS, 'seg tab ' + tab + ' becomes active');
    await B.settle(page);

    const s = await page.evaluate(() => {
      const all = Array.prototype.slice.call(document.querySelectorAll('.seg button'));
      return {
        on: all.filter((b) => b.classList.contains('on')).map((b) => b.getAttribute('data-tab')),
        current: all.filter((b) => b.hasAttribute('aria-current'))
          .map((b) => b.getAttribute('data-tab') + '=' + JSON.stringify(b.getAttribute('aria-current'))),
        activeCurrent: (() => {
          const b = all.find((x) => x.classList.contains('on'));
          return b ? b.getAttribute('aria-current') : null;
        })(),
      };
    });

    chk('[' + tab + '] exactly one tab is visually active',
      s.on.length === 1 && s.on[0] === tab, 'active set = ' + JSON.stringify(s.on));
    chk('[' + tab + '] the active tab exposes aria-current="true" to AT',
      s.activeCurrent === 'true', 'aria-current on the active tab = ' + JSON.stringify(s.activeCurrent) +
      ' (the class alone tells AT nothing)');
    chk('[' + tab + '] EXACTLY ONE tab carries aria-current -- none missing, none left stale on the tab you just left',
      s.current.length === 1, 'tabs carrying aria-current: ' + JSON.stringify(s.current) +
      ' (0 = AT is told nothing; 2 = AT is told you are in two places at once)');
  }

  await browser.close();
  notes.forEach((n) => console.log(n));
  if (fails.length) { fails.forEach((f) => console.log('  - ' + f)); return B.finish(1, 'SEG STATE: FAIL (' + fails.length + ')'); }
  console.log('SEG STATE: PASS  (' + notes.length + ' assertions across ' + tabs.length + ' tabs: one active, aria-current="true" on it, none stale)');
  return B.finish(0);
})().catch((e) => { console.error(e && e.stack || e); return B.finish(1, 'SEG STATE: FAIL (harness error: ' + (e && e.message) + ')'); });
