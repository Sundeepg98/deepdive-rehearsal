#!/usr/bin/env node
/* ===== BACK FROM THE LANDING MUST NOT DEAD-END ON A BLANK PAGE (P1 -- visual sweep A1) =====
 *
 * THE DEFECT. The app installs its landing route (#home) with history.replaceState, so on a
 * DIRECT entry -- the offline file opened by double-click, or the URL visited in a fresh tab --
 * the app occupies the tab's ONLY in-document history entry. One browser Back therefore does not
 * move within the app; it UNLOADS the document to whatever preceded it, which on a direct entry is
 * a blank prior document (about:blank). Measured, pre-fix, at both viewports: boot -> #home
 * (innerText 26091, 827 painted elements); one Back -> about:blank, innerText 0, 0 elements, a
 * screen with a single colour. Recovery was Forward/reload only. That is a recoverable dead-end,
 * but it is the literal first Back of every direct session, so it ships as a P1.
 *
 * WHY DOM ALONE CANNOT SEE IT, AND WHY IT ALSO CANNOT SEE THE FIX. `opacity:0` on <body> does not
 * propagate, so every DOM "is it visible" predicate answers YES for a page that paints nothing
 * (see _pixels.cjs). This check measures BOTH: the DOM is present AND the screen actually painted
 * ink (a blank page: inkPct ~0, distinct ~1; a rendered page: inkPct in the tens, distinct in the
 * hundreds).
 *
 * WHAT THE FIX MUST DO, AND MUST NOT DO. On a direct entry, seat exactly ONE in-app #home guard
 * entry BELOW the boot entry, so the first Back lands on the app home instead of a blank document.
 * It must remain exactly one entry: a SECOND Back must still LEAVE the app. A guard that re-seated
 * itself on every Back would be a history TRAP -- the user could never leave with the Back button.
 * This check asserts the fix (first Back -> painted home) AND the anti-regression (second Back
 * leaves; pane Back/Forward still round-trips), so neither the bug nor an over-correction can pass.
 *
 * PROVEN RED on the pre-fix build: every "one Back" assertion fails (about:blank, innerText 0,
 * inkPct ~0) at 1280x800 and 360x740. GREEN once the guard is seated.
 *
 * Runs against the assembled single-file deliverable. Exits non-zero on any failure.
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const PX = require('./_pixels.cjs');

const HTML = process.argv[2] ||
  path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* "not blank" = the viewport actually painted something other than its background. */
async function paint(page) {
  const buf = await page.screenshot({ type: 'png' });
  return PX.ink(buf);
}

/* A rendered surface clears these floors with a wide margin; a blank page NEVER can
   (inkPct ~0, distinct ~1). Kept low so a legitimately sparse surface is never a false red. */
const INK_MIN = 2;        /* percent of the viewport that is not the background */
const DISTINCT_MIN = 20;  /* number of distinct 8-level colour buckets present   */

(async () => {
  const fails = [];
  const ok = (name, cond, extra) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (extra ? '  (' + extra + ')' : ''));
    if (!cond) fails.push(name);
  };

  const browser = await chromium.launch(B.launchOpts());

  /* ============ PART A + B: one Back must not blank; a second Back must still leave ============
     Driven at both viewports the sweep captured blank on. A Playwright newPage lands on about:blank
     and goto() seats the app above it, with document.referrer empty -- the exact history shape of a
     real direct file-open / typed-URL visit, which is the case that dead-ends. */
  for (const vp of [{ width: 1280, height: 800 }, { width: 360, height: 740 }]) {
    const tag = vp.width + 'x' + vp.height;
    const page = await browser.newPage({ viewport: vp });
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));

    await B.gotoApp(page, HTML);
    const boot = await page.evaluate(() => ({
      view: document.documentElement.dataset.view,
      referrer: document.referrer,
    }));
    ok('[' + tag + '] boots on #home, direct-entry shape (empty referrer)',
      boot.view === 'home' && boot.referrer === '',
      'view=' + boot.view + ' referrer="' + boot.referrer + '"');

    /* ---- ONE Back: must stay in the app, on a PAINTED home ---- */
    await page.goBack({ timeout: 15000 }).catch(() => {});
    await B.settle(page);
    const back1 = await page.evaluate(() => ({
      href: location.href,
      view: document.documentElement.dataset ? document.documentElement.dataset.view : null,
      innerTextLen: ((document.body && document.body.innerText) || '').length,
      gone: typeof TopicRegistry === 'undefined',
    })).catch(() => ({ href: 'about:blank', view: null, innerTextLen: 0, gone: true }));

    let painted = { inkPct: 0, distinct: 0 };
    try {
      painted = await B.pollFor(() => paint(page),
        (r) => r.inkPct > INK_MIN && r.distinct > DISTINCT_MIN, 5000,
        'first-Back screen paints ink');
    } catch (e) { painted = (e && e.last) || painted; }

    ok('[' + tag + '] one Back stays in the app (not about:blank)',
      back1.href.indexOf('about:blank') === -1 && !back1.gone, 'href=' + back1.href);
    ok('[' + tag + '] one Back lands on the app home (DOM present)',
      back1.view === 'home' && back1.innerTextLen > 1000,
      'view=' + back1.view + ' innerTextLen=' + back1.innerTextLen);
    ok('[' + tag + '] one Back leaves a PAINTED screen, not a blank one',
      painted.inkPct > INK_MIN && painted.distinct > DISTINCT_MIN,
      'inkPct=' + painted.inkPct + ' distinct=' + painted.distinct);

    /* ---- SECOND Back: the guard is ONE entry, so this must LEAVE the app (no trap) ---- */
    await page.goBack({ timeout: 15000 }).catch(() => {});
    await page.evaluate(() => new Promise((r) => setTimeout(r, 200))).catch(() => {});
    const back2 = await page.evaluate(() => ({
      href: location.href, gone: typeof TopicRegistry === 'undefined',
    })).catch(() => ({ href: 'about:blank', gone: true }));
    ok('[' + tag + '] a second Back still leaves the app (guard is one entry, not a loop)',
      back2.href.indexOf('about:blank') !== -1 || back2.gone, 'href=' + back2.href);

    ok('[' + tag + '] zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
    await page.close();
  }

  /* ============ PART C: pane Back/Forward still round-trips (no Back-blocker) ============
     A topic pane is identified by Router.current().view, NOT dataset.view -- view-manager deletes
     dataset.view off the home route, so it is 'home' on the index and undefined on every pane. */
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await B.gotoApp(page, HTML);

    const read = () => page.evaluate(() => ({
      view: (window.Router && window.Router.current) ? window.Router.current().view : null,
      gone: typeof TopicRegistry === 'undefined' || typeof window.Router === 'undefined',
      href: location.href,
    })).catch(() => ({ view: null, gone: true, href: 'about:blank' }));
    const left = (s) => s.gone || (s.href || '').indexOf('about:blank') !== -1;
    const nav = async (v) => { await page.evaluate((x) => window.Router.navigate(x), v); await B.settle(page); };
    const back = async () => { await page.goBack({ timeout: 15000 }).catch(() => {}); await page.evaluate(() => new Promise((r) => setTimeout(r, 150))).catch(() => {}); };
    const fwd = async () => { await page.goForward({ timeout: 15000 }).catch(() => {}); await page.evaluate(() => new Promise((r) => setTimeout(r, 150))).catch(() => {}); };

    /* enter the topic UI the blessed way (closes the index, navigates off #home), then switch panes */
    await B.enterApp(page);
    await nav('drill'); await nav('wb');
    const atWb = await read();
    ok('[bf] entered topic panes (on wb)', atWb.view === 'wb', 'view=' + atWb.view);

    /* Back/Forward must round-trip through the pane history */
    await back(); const b1 = await read();
    await back(); const b2 = await read();
    ok('[bf] Back walks panes wb -> drill -> walk', b1.view === 'drill' && b2.view === 'walk',
      'after 2 Back: ' + b1.view + ' , ' + b2.view);
    await fwd(); const f1 = await read();
    ok('[bf] Forward returns walk -> drill', f1.view === 'drill', 'view=' + f1.view);

    /* Back all the way out: must reach home, never blank mid-history, and EVENTUALLY leave */
    const seq = [];
    for (let i = 0; i < 8; i++) {
      await back();
      const s = await read();
      seq.push(s);
      if (left(s)) break;
    }
    const views = seq.map((s) => (left(s) ? '(left)' : (s.view || '(pane)')));
    const reachedHome = seq.some((s) => s.view === 'home');
    const noMidBlank = seq.slice(0, -1).every((s) => !left(s));
    const leftAtEnd = seq.length > 0 && left(seq[seq.length - 1]);
    ok('[bf] back-walk reaches the app home', reachedHome, 'seq=' + views.join(' -> '));
    ok('[bf] back-walk never blanks mid-history', noMidBlank, 'seq=' + views.join(' -> '));
    ok('[bf] back-walk eventually LEAVES the app (not a trap)', leftAtEnd, 'seq=' + views.join(' -> '));

    ok('[bf] zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
    await page.close();
  }

  /* ============ PART D: a RELOAD must not RE-SEAT the guard (one seat per tab session) ============
     The direct-entry gate keys on an EMPTY document.referrer -- but a reload of a direct entry ALSO
     has an empty referrer, so a per-init gate re-fires on every reload and stacks another #home guard
     each time: history.length climbs +1 per reload, unbounded, and every reload adds one Back press
     the user must make to escape the app. The guard already sits in history and survives the reload,
     so re-seating is pure regression. The fix seats at most once per TAB SESSION (a sessionStorage
     flag: survives reload, fresh per new tab), so a reload leaves history.length flat while the one
     seated guard keeps the first Back on a painted home. PROVEN RED at 38f6f6e (each reload +1); GREEN
     once seating is per-session. Measured pre-fix: #home [3,4,5,6,7,8], a topic [6,7,8,9,10,11]. */
  {
    const RELOADS = 5;
    const reloadSeries = async (page) => {
      const lens = [await page.evaluate(() => history.length)];
      const refs = [await page.evaluate(() => document.referrer)];
      for (let i = 0; i < RELOADS; i++) {
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
        await B.settle(page);
        lens.push(await page.evaluate(() => history.length));
        refs.push(await page.evaluate(() => document.referrer));
      }
      return { lens, refs };
    };

    /* D1 -- direct #home entry: reload N times, history.length must stay FLAT (0 re-seat/reload) */
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errs = [];
      page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
      await B.gotoApp(page, HTML);
      const boot = await page.evaluate(() => history.length);
      const { lens, refs } = await reloadSeries(page);
      const grew = Math.max.apply(null, lens) - lens[0];
      ok('[reload #home] a reload never re-seats the guard (history.length flat across ' + RELOADS + ' reloads)',
        grew === 0, 'lens=' + lens.join(',') + '  (direct-entry reload, referrer all empty=' +
        refs.every((r) => r === '') + ')');

      /* the one seated guard is still there: Back after the reloads lands on a PAINTED home */
      await page.goBack({ timeout: 15000 }).catch(() => {});
      await B.settle(page);
      const back1 = await page.evaluate(() => ({
        href: location.href,
        view: document.documentElement.dataset ? document.documentElement.dataset.view : null,
        innerTextLen: ((document.body && document.body.innerText) || '').length,
        gone: typeof TopicRegistry === 'undefined',
      })).catch(() => ({ href: 'about:blank', view: null, innerTextLen: 0, gone: true }));
      let painted = { inkPct: 0, distinct: 0 };
      try {
        painted = await B.pollFor(() => paint(page),
          (r) => r.inkPct > INK_MIN && r.distinct > DISTINCT_MIN, 5000, 'Back-after-reload paints ink');
      } catch (e) { painted = (e && e.last) || painted; }
      ok('[reload #home] Back after reloads stays on a PAINTED home (guard intact, P1 not reintroduced)',
        back1.href.indexOf('about:blank') === -1 && !back1.gone && back1.view === 'home' &&
        back1.innerTextLen > 1000 && painted.inkPct > INK_MIN && painted.distinct > DISTINCT_MIN,
        'href=' + back1.href + ' view=' + back1.view + ' ink=' + painted.inkPct + ' distinct=' + painted.distinct);

      /* still exactly ONE guard: a second Back LEAVES -- on the buggy build there are N guards, so it
         would not leave (this and the flat-length check are the two that go RED at 38f6f6e). */
      await page.goBack({ timeout: 15000 }).catch(() => {});
      await page.evaluate(() => new Promise((r) => setTimeout(r, 200))).catch(() => {});
      const back2 = await page.evaluate(() => ({
        href: location.href, gone: typeof TopicRegistry === 'undefined',
      })).catch(() => ({ href: 'about:blank', gone: true }));
      ok('[reload #home] guard is still ONE entry after reloads (second Back leaves, not a growing trap)',
        back2.href.indexOf('about:blank') !== -1 || back2.gone, 'href=' + back2.href);

      ok('[reload #home] zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
      await page.close();
    }

    /* D2 -- at a TOPIC (#wb), the surface the sweep measured the climb on: reload must stay FLAT too */
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errs = [];
      page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
      await B.gotoApp(page, HTML);
      await B.enterApp(page);
      await page.evaluate(() => window.Router.navigate('wb')); await B.settle(page);
      const atWb = await page.evaluate(() => (window.Router && window.Router.current) ? window.Router.current().view : null);
      const { lens } = await reloadSeries(page);
      const grew = Math.max.apply(null, lens) - lens[0];
      ok('[reload topic] a topic reload never re-seats the guard (history.length flat across ' + RELOADS + ' reloads)',
        grew === 0 && atWb === 'wb', 'onView=' + atWb + ' lens=' + lens.join(','));
      ok('[reload topic] zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
      await page.close();
    }
  }

  await browser.close();
  const pass = fails.length === 0;
  console.log('BACK DEADEND: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})().catch((e) => {
  console.log('BACK DEADEND: FAIL (threw) ' + ((e && e.stack) || e));
  process.exit(1);
});
