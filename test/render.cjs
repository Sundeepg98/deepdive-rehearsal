#!/usr/bin/env node
/*
 * Functional render test for the assembled single-file deliverable.
 *
 * Local use:
 *   npm i playwright && npx playwright install chromium
 *   node test/render.cjs                       # tests ../deepdive_content_pipeline_rehearsal.html
 *   node test/render.cjs path/to/file.html     # test a specific build
 *   CHROME=/path/to/chrome node test/render.cjs # use a specific Chromium binary
 *
 * Verifies, in a real browser, that the built file:
 *   - loads with zero page errors / console errors,
 *   - switches all 9 panes (each becomes visible on its tab click),
 *   - has all 7 dialog overlays present in the DOM,
 *   - produces no horizontal overflow -- ON PHONES AS WELL AS ON A DESKTOP.
 * Exits non-zero on any failure.
 *
 * ===== WHY THE OVERFLOW CHECK SWEEPS VIEWPORTS AND TOPICS =====================
 * This check used to run at Playwright's default 1280x720 and nowhere else, so it asked
 * "does the desktop layout overflow?" while REPORTING "does the app overflow?". A P0 lived
 * behind that gap: nav#topicnav was a flex item with the default min-width:auto, so it could
 * not shrink below its min-content floor (3 x 44px .tn-step + the nowrap topic title), and the
 * document overflowed on EVERY phone width -- up to +219px. The layout viewport widened with
 * it and dragged every `position:fixed; left:0; right:0` bar off-screen, carrying #toolsfab
 * (the ONLY entry point to 12 tools) out of reach on 16/46 topics at 360px. The gate was green
 * throughout. A check that only ever looks at desktop is why that shipped, so the fix is not
 * "add 375px" -- it is to make the check's SCOPE match its CLAIM.
 *
 * Two axes, because the bug varied along both and one axis alone would still have hidden it:
 *   WIDTH -- 320/360/375/390/430 (the phone range down to the narrowest device still shipped)
 *            plus 768 and the desktop default. Overflow shrank as width grew: 46/46 topics at
 *            360px, but only 19/46 at 430px.
 *   TOPIC -- the offending min-content floor was the TOPIC TITLE, so the bug was invisible on
 *            short-titled topics and catastrophic on long ones ("Production Debugging and
 *            Incident Diagnosis", 43 chars, +219px). Checking only the default topic (16 chars)
 *            is how a verifier once downgraded this to "the page pans, nothing is broken".
 * Every topic is measured at every width, and all 9 panes are measured too, so neither a
 * long title nor a wide pane can reintroduce this class of bug unseen.
 *
 * documentElement.scrollWidth is the ground truth: content inside a legitimate
 * `overflow-x:auto` scroller (the .seg tab strip) does not inflate it, and neither do
 * position:fixed layers -- so this measures real DOCUMENT overflow, not styled scrollers.
 */
const path = require('path');
const { chromium } = require('playwright');

const HTML = process.argv[2] ||
  path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const OVERLAYS = ['mockov', 'mixov', 'cramov', 'sessov', 'keyov', 'scopeov', 'planov'];
/* the phone range, plus a tablet and the desktop the check used to measure exclusively */
const WIDTHS = [320, 360, 375, 390, 430, 768, 1280];

/* Runs in-page. Returns the document overflow and, when there is any, the elements actually
   sticking out past the right edge -- a failure has to name its cause to be actionable. */
const MEASURE = () => {
  const de = document.documentElement;
  const cw = de.clientWidth;
  const over = de.scrollWidth - cw;
  if (over <= 1) return { over: 0 };
  const offenders = [];
  document.querySelectorAll('body *').forEach((e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.right <= cw + 1) return;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);      /* inside a real horizontal scroller = not doc overflow */
      if ((acs.overflowX === 'auto' || acs.overflowX === 'scroll') && a.scrollWidth > a.clientWidth) return;
    }
    offenders.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') +
      (e.className && e.className.baseVal === undefined && e.className ? '.' + String(e.className).trim().split(/\s+/)[0] : '') +
      ' right=' + Math.round(r.right));
  });
  return { over, scrollW: de.scrollWidth, clientW: cw, offenders: offenders.slice(0, 4) };
};

/* Boot the deliverable and WAIT FOR THE APP, not for a stopwatch. The single file is >5MB, so
   how long it takes to parse and wire its globals depends on what else the machine is doing --
   a fixed sleep passes on an idle box and loses a race inside a loaded CI run, where this check
   is one of two dozen. Gate the page on the globals this test actually drives, and a slow boot
   costs a few more milliseconds instead of failing the build for no reason. */
const READY = async (p) => {
  await p.goto('file://' + path.resolve(HTML));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(
    () => typeof switchTab === 'function' && typeof TopicRegistry !== 'undefined' && TopicRegistry.ids().length > 0,
    null, { timeout: 30000 }
  );
  // A bare load opens the home (Topic index) as the landing; close it before exercising the
  // tabs so its backdrop cannot swallow a click, then wait for it to actually be gone.
  await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); });
  await p.waitForFunction(
    () => !(window.IndexOverlay && window.IndexOverlay.isOpen && window.IndexOverlay.isOpen()),
    null, { timeout: 10000 }
  );
  await p.waitForTimeout(120);   // let the close transition settle before anything is measured
};

(async () => {
  const errs = [];
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;

  const browser = await chromium.launch(launch);
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await READY(page);

  const paneFails = [];
  for (const t of PANES) {
    await page.click(`.sidebar .seg button[data-tab="${t}"]`);
    // The pane swap runs inside the View Transitions API (async), so wait for
    // the pane to actually become visible rather than a brittle fixed delay.
    let ok = false;
    try {
      await page.waitForFunction(
        id => { const p = document.getElementById(id); return !!p && getComputedStyle(p).display !== 'none'; },
        t, { timeout: 2000 }
      );
      ok = true;
    } catch (e) { ok = false; }
    if (!ok) paneFails.push(t);
  }

  const ovMissing = [];
  for (const id of OVERLAYS) {
    const exists = await page.evaluate(i => !!document.getElementById(i), id);
    if (!exists) ovMissing.push(id);
  }
  await page.close();

  /* ---- the overflow sweep: every width x every topic, plus every pane ------------------
     Panes are switched through the app's own switchTab() and topics through
     TopicRegistry.setTopic() rather than by clicking: this pass is measuring LAYOUT, and a
     click that misses (the mobile tab strip is a fixed, horizontally-scrolled bar) would
     silently narrow the sweep -- the exact failure mode this check exists to end. The tab
     strip's own clickability is already proven by the desktop pass above.
     reducedMotion pins layout still, so a View Transition mid-flight cannot flake a width. */
  const overflows = [];
  let states = 0;
  for (const width of WIDTHS) {
    const p = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
    p.on('pageerror', e => errs.push('pageerror@' + width + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console@' + width + ': ' + m.text()); });
    await READY(p);

    const topics = await p.evaluate(() => TopicRegistry.ids());

    // every pane, on the topic the app boots into
    for (const pane of PANES) {
      await p.evaluate(t => switchTab(t), pane);
      const m = await p.evaluate(MEASURE);
      states++;
      if (m.over > 1) overflows.push({ width, pane, topic: '(default)', ...m });
    }
    // every topic -- the title is the min-content floor that overflowed, so this is the axis
    await p.evaluate(() => switchTab('walk'));
    for (const topic of topics) {
      await p.evaluate(id => TopicRegistry.setTopic(id), topic);
      const m = await p.evaluate(MEASURE);
      states++;
      if (m.over > 1) overflows.push({ width, pane: 'walk', topic, ...m });
    }
    await p.close();
  }

  await browser.close();

  const pass = errs.length === 0 && paneFails.length === 0 && ovMissing.length === 0 && overflows.length === 0;
  const badWidths = [...new Set(overflows.map(o => o.width))];
  console.log(
    `panes ${PANES.length - paneFails.length}/${PANES.length}  |  ` +
    `overlays ${OVERLAYS.length - ovMissing.length}/${OVERLAYS.length}  |  ` +
    `h-overflow ${overflows.length}/${states} states across ${WIDTHS.length} widths` +
    (badWidths.length ? ' [' + badWidths.join(',') + 'px]' : '') + `  |  js-errors ${errs.length}`
  );
  if (paneFails.length) console.log('  panes not shown: ' + paneFails.join(', '));
  if (ovMissing.length) console.log('  overlays missing: ' + ovMissing.join(', '));
  // worst first: the biggest overflow is the one to debug
  overflows.sort((a, b) => b.over - a.over).slice(0, 6).forEach(o => console.log(
    `  OVERFLOW ${o.width}px [${o.topic}/${o.pane}] scrollWidth ${o.scrollW} vs clientWidth ${o.clientW} (+${o.over}px)  <- ${o.offenders.join(' | ')}`
  ));
  if (overflows.length > 6) console.log(`  ...and ${overflows.length - 6} more overflowing states`);
  errs.slice(0, 8).forEach(e => console.log('  ' + e));
  console.log(pass ? 'RENDER TEST: PASS' : 'RENDER TEST: FAIL');
  process.exit(pass ? 0 : 1);
})().catch((e) => {
  /* An uncaught rejection here would dump a Node stack whose LAST line is the runtime version
     -- and the gate reports a check by its last line, so the build would fail with the words
     "Node.js v25.2.1" and no cause. Anything that escapes is reported as what it is. */
  console.log('  harness error: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
  console.log('RENDER TEST: FAIL');
  process.exit(1);
});
