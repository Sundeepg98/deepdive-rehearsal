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
const B = require('./_boot.cjs');

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

/* Boot the deliverable and WAIT FOR THE APP, not for a stopwatch. The single file is 11.4MB, so
   how long it takes to parse and wire its globals depends on what else the machine is doing --
   a fixed sleep passes on an idle box and loses a race inside a loaded CI run, where this check
   is one of two dozen. Gate the page on the globals this test actually drives, and a slow boot
   costs a few more milliseconds instead of failing the build for no reason.

   goto() carries an EXPLICIT navigation cap now. It always had one -- Playwright's silent 30s
   default -- but nobody chose it, nobody wrote it down, and it was the only thing standing
   between this check and a payload that had just doubled. An assumption you cannot see is an
   assumption you cannot audit. (Measured: 455ms idle, 645ms under 8-core saturation.)

   The 120ms "let the close transition settle" sleep is gone: closeIndex() waits for the overlay
   to actually be closed and then for two rAFs -- the browser reporting that it has laid out and
   painted, instead of us guessing how long that takes. */
const READY = async (p) => {
  await B.gotoApp(p, HTML);
  // A bare load opens the home (Topic index) as the landing; close it before exercising the
  // tabs so its backdrop cannot swallow a trusted click, then wait for it to actually be gone.
  await B.closeIndex(p);
};

(async () => {
  const errs = [];
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await READY(page);

  /* ---- every pane becomes visible when its tab is clicked -----------------------------------
     The condition here was always right (wait for the pane to actually be displayed, not for a
     fixed delay). The CAP was wrong. 2000ms was not a correctness budget, it was a PERFORMANCE
     budget nobody declared -- and when the deliverable doubled to 11.4MB it quietly ate the
     headroom. Measured on this 8-core box: the pane is visible 24-157ms after the click when
     idle, 45-313ms under full saturation. A CI runner is ~4x weaker, which lands ~1.25s against
     a 2000ms cap: a 1.6x margin, i.e. a coin-flip waiting to happen on a bad afternoon.

     So: keep the condition, and give the cap the only job a timeout should ever have -- turning
     a HANG into a failure. A pane that is genuinely broken never becomes visible at all and
     still fails, just as loudly, 30s later. A pane that is merely slow no longer fails at all.
     That is the whole difference between "the box was busy" and "the app is broken", and a gate
     that cannot tell them apart is a gate that teaches people to re-run it.

     Motion is deliberately LEFT ON for this page. Playwright's click() waits for the element to
     be stable (it waits out the CSS animation), which is most of the cost above -- but it is
     also the real user path, and the reduced-motion path is already covered by the overflow
     sweep below. Buying speed here by turning animation off would buy it by deleting coverage. */
  const paneFails = [];
  for (const t of PANES) {
    await page.click(`.sidebar .seg button[data-tab="${t}"]`, { timeout: B.ACT_MS });
    let ok = false;
    try {
      await page.waitForFunction(
        id => { const p = document.getElementById(id); return !!p && getComputedStyle(p).display !== 'none'; },
        t, { timeout: B.ACT_MS }
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
  await B.finish(pass ? 0 : 1);
})().catch(async (e) => {
  /* An uncaught rejection here would dump a Node stack whose LAST line is the runtime version
     -- and the gate reports a check by its last line, so the build would fail with the words
     "Node.js v25.2.1" and no cause. Anything that escapes is reported as what it is.

     finish() drains stdout before exiting. process.exit() is documented to terminate "even if
     there are still asynchronous operations pending ... including I/O to process.stdout", and
     the gate captures this check through a PIPE. A check that dies without saying why prints a
     red with a blank reason, and a blank reason reads as "flake, run it again" -- which is
     precisely the reflex this whole exercise exists to kill. */
  console.log('  harness error: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e));
  await B.finish(1, 'RENDER TEST: FAIL');
});
