#!/usr/bin/env node
/*
 * SEARCH DEAD-END (audit #13) -- a candidate types the whole-system prompt they actually rehearse
 * ("design twitter", "url shortener", "search autocomplete", "design instagram") and search used to
 * return a bare "No results found". This trainer teaches the COMPONENTS such systems are built from
 * (caching, sharding, real-time delivery...), not the prompts -- so a blank dead-end on their exact
 * question reads as "doesn't have my material" when the parts are all here. The fix routes a matched
 * prompt to its component topics -- honestly (never a faked result: the section fires ONLY on a
 * genuine 0-hit miss, and every chip is a real, registered topic).
 *
 * Asserts, for each audit prompt: "No results found" IS shown (so the search invented no topic), the
 * component chips ([data-sys-topic]) appear, and every chip is a topic the registry actually holds;
 * then drives a REAL page.mouse.click on a chip and asserts it routes to that real topic. Carries two
 * PLANTS: a gibberish miss and a real component hit must BOTH show zero chips -- so the section can
 * never degrade into one that fires for everything (which would make "chips present" un-failable).
 *
 * Watched RED against the pre-fix deliverable: [data-sys-topic] chips do not exist -- the whole-system
 * prompts dead-end.
 *
 * ===== W17/X3: THE OTHER DEAD END -- A PICK THAT GOES NOWHERE =====
 * The above only ever walked the ZERO-HIT path, from a TOPIC route. The cross-browser sweep found a
 * second dead end one step further in, on the path where search WORKS: from `#home`, picking a topic
 * (in this overlay, or in the Topic index) switched the registry and NEVER NAVIGATED. The user stayed
 * on #home, whose hero still advertised the topic they had just left. Zero console errors, which is
 * why nothing flagged it -- a dead end with a green light.
 *
 * Mechanism: Router.setTopic is a deliberate NO-OP on a topic-less route (it must not rewrite the
 * home's hash and destroy its own history entry). HomeView.bind's own onPick compensates by
 * navigating; the two overlays had no equivalent. So this is not a router bug -- it is a MISSING
 * CALLER, and the arms below assert the caller, from both pick surfaces.
 *
 * The plants that keep those arms honest -- each one goes red on a plausible over-fix:
 *   - FROM A TOPIC ROUTE THE VIEW IS PRESERVED. A pick on #<t>/drill lands on #<picked>/drill, not
 *     on the resume view. This catches the HARDCODED-DESTINATION reading of "navigate
 *     unconditionally" (navigate to 'walk' regardless), which is the version that moves the user
 *     somewhere visibly wrong. It does NOT catch guard deletion -- see the E arms below, and read
 *     that note before trusting these two to cover the whole over-fix family.
 *   - PICKING THE TOPIC YOU ARE ALREADY ON, FROM HOME, STILL LEAVES THE HOME. setTopic early-returns
 *     on `id === cur`, so a fix that navigates only *after* a successful switch is silently dead on
 *     exactly the pick a returning user makes most.
 *   - THE HOME ARMS ASSERT THE FULL LANDING (hash + title + view + .app visible), not just "the hash
 *     changed" -- the pre-fix build already changed the TOPIC, and a weaker assertion would pass on it.
 *
 * ===== WHY THERE IS A UNIT-SHAPED ARM IN A FILE OF TRUSTED-INPUT ARMS (E) =====
 * A cold verifier built the guard-deletion over-fix -- `LastVisit.navigateAfterPick` with its
 * `rc.view !== 'home'` line removed, so it navigates from every route -- and the interaction arms
 * above went GREEN on all 24. That over-fix is a real regression (deep-link to the whiteboard with a
 * stale resume pointer, pick a topic: the tip keeps you in the whiteboard, the mutant dumps you in
 * the pointer's view), so a hole this shape must not stay open.
 *
 * IT IS INVISIBLE TO INTERACTION ARMS BY CONSTRUCTION, which is the point worth remembering:
 * LastVisit.record() re-syncs nav.last.view on every routechange, so on any SETTLED topic route
 * resumeView() has already converged on the view you are in, and the mutant's extra navigate is a
 * no-op -- same hash, same history.length. The divergence lives only in the ~500ms window before
 * LastVisit arms. Chasing it with a driver would mean racing that window, and a check whose redness
 * depends on winning a race is a check that will eventually go green by luck.
 *
 * So the E arms drop to the layer where the property is timeless: navigateAfterPick is a PREDICATE,
 * and it must REFUSE off the home route. No window, no wall clock, nothing to lose a race to. This
 * is a deliberate exception to this file's trusted-input discipline, not a lapse -- the interaction
 * arms prove the behaviour, and E proves the guard behind it still exists.
 *
 * Watched RED against the pre-fix deliverable: all four home arms fail with hash "#home", title
 * "Home - Deep Rehearsal", .app display:none -- while TopicRegistry.current() HAS moved. E is
 * watched red separately, against the verifier's guard-deleted mutant (plant-a2) AND against its
 * fix-reverted mutant (plant-a1) -- the two failure directions, caught by different E arms.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/search_deadend.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const PROMPTS = ['design twitter', 'url shortener', 'search autocomplete', 'design instagram'];

/* open the overlay (if not already), type a query, read the rendered miss state */
const SEARCH = (page, q) => page.evaluate((query) => new Promise((resolve) => {
  if (!window.SearchOverlay) { resolve({ ready: false }); return; }
  if (!SearchOverlay.isOpen()) SearchOverlay.open();
  const input = document.querySelector('#_search-overlay input');
  if (!input) { resolve({ ready: false }); return; }
  input.value = query;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const ov = document.querySelector('#_search-overlay');
    const btns = Array.prototype.slice.call(ov.querySelectorAll('[data-sys-topic]'));
    const sysTopics = btns.map((b) => b.getAttribute('data-sys-topic'));
    const allReal = btns.length > 0 && sysTopics.every((id) => !!(typeof TopicRegistry !== 'undefined' && TopicRegistry.get && TopicRegistry.get(id)));
    resolve({ ready: true, none: /No results found/.test(ov.textContent), sysTopics, allReal });
  }));
}), q);

const CLOSE = (page) => page.evaluate(() => { if (window.SearchOverlay && SearchOverlay.isOpen()) SearchOverlay.close(); });

/* ===== W17/X3 helpers -- everything below is driven by REAL keys and REAL trusted clicks ===== */

/* The whole landing, read at once. The pre-fix build moved `topic` and NOTHING else, so an arm that
   reads only the topic (or only the hash) cannot tell a fixed build from a broken one. */
const ROUTE = (page) => page.evaluate(() => {
  const app = document.querySelector('.app');
  const rc = (window.Router && Router.current) ? Router.current() : null;
  return {
    hash: location.hash,
    title: document.title,
    view: rc ? rc.view : null,
    onHome: document.documentElement.dataset.view === 'home',
    topic: (typeof TopicRegistry !== 'undefined') ? TopicRegistry.current().id : null,
    appVisible: !!(app && getComputedStyle(app).display !== 'none'),
  };
});

const GO_HOME = async (page) => {
  await page.evaluate(() => { if (window.Router) Router.navigate('home'); });
  await B.until(page, () => document.documentElement.dataset.view === 'home', null, 5000, 'the #home route');
  await B.settle(page);
};

/* Nothing may be focused in a text field when we press a bare key: shell.js's keymap bails while the
   user is typing, and a bail would make every "the key did nothing" arm below green for the wrong
   reason. */
const BLUR = (page) => page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });

/* open with a real '/', type, commit the top hit with real ArrowDown+Enter */
const PICK_VIA_SEARCH = async (page, q) => {
  await BLUR(page);
  await page.keyboard.press('/');
  await B.until(page, () => !!(window.SearchOverlay && SearchOverlay.isOpen()), null, 5000, 'the search overlay opens');
  await page.keyboard.type(q);
  await B.settle(page);
  const hit = await page.evaluate(() => {
    const b = document.querySelector('#_search-overlay button');
    return b ? b.textContent.replace(/\s+/g, ' ').slice(0, 44) : null;
  });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await B.settle(page); await B.settle(page);
  return hit;
};

/* open with a real '\', click a card at its painted centre (locator.click hit-tests for us).
   `want` picks a specific topic; omitted, it takes the first card that is NOT the current topic. */
const PICK_VIA_INDEX = async (page, want) => {
  await BLUR(page);
  await page.keyboard.press('Backslash');
  await B.until(page, () => !!document.querySelector('.ix-ov.open'), null, 5000, 'the topic index opens');
  await B.settle(page); await B.settle(page);
  const id = await page.evaluate((w) => {
    const cards = Array.prototype.filter.call(document.querySelectorAll('.ix-ov .ix-card'), (c) => c.offsetParent !== null);
    if (w) { const m = cards.filter((c) => c.getAttribute('data-topic') === w); return m.length ? w : null; }
    const other = cards.filter((c) => c.getAttribute('data-topic') !== TopicRegistry.current().id);
    return other.length ? other[0].getAttribute('data-topic') : null;
  }, want || null);
  if (!id) return null;
  await page.locator('.ix-ov .ix-card[data-topic="' + id + '"]').click();
  await B.settle(page); await B.settle(page);
  return id;
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

  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  /* ===== each canonical whole-system prompt routes to real component topics ===== */
  for (const p of PROMPTS) {
    const s = await SEARCH(page, p);
    ok('"' + p + '": shows "No results found" (an honest miss -- no faked topic result)', s.ready && s.none === true, JSON.stringify(s));
    ok('"' + p + '": offers component-topic chips instead of a dead-end', s.ready && s.sysTopics.length >= 2, JSON.stringify(s));
    ok('"' + p + '": every chip is a REAL registered topic (routes somewhere, never a dead link)', s.ready && s.allReal === true, JSON.stringify(s));
  }

  /* ===== a chip really routes to its topic (REAL trusted click at the painted centre) ===== */
  await SEARCH(page, 'design twitter');
  const target = await page.evaluate(() => {
    const b = document.querySelector('#_search-overlay [data-sys-topic]');
    if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = b.getBoundingClientRect();
    return { id: b.getAttribute('data-sys-topic'), x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (target) { await page.mouse.click(target.x, target.y); await B.settle(page); }
  const landed = await page.evaluate(() => (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current().id : null);
  ok('clicking a component chip routes to that real topic (real hit-tested click)', !!target && landed === target.id, JSON.stringify({ target: target && target.id, landed }));

  /* ===== PLANTS: the section must NOT fire for a non-system miss, nor for a real hit ===== */
  await CLOSE(page);
  const gibberish = await SEARCH(page, 'zzqqxvne');
  ok('[plant] a gibberish miss shows NO component chips (the section is not a fire-for-everything)', gibberish.ready && gibberish.none === true && gibberish.sysTopics.length === 0, JSON.stringify(gibberish));
  const realHit = await SEARCH(page, 'caching');
  ok('[plant] a real component query ("caching") has direct hits and NO chips (section fires only on a miss)', realHit.ready && realHit.none === false && realHit.sysTopics.length === 0, JSON.stringify(realHit));

  await CLOSE(page);

  /* ================= W17/X3 -- THE HOME'S EXITS ACTUALLY EXIT ================= */
  /* The canonical encoding of a landing: the boot topic stays bare, every other topic is prefixed.
     Asserting the hash against THIS (rather than against a literal) proves hash, topic and view are
     coherent with each other, and stays true when the content set changes. */
  const CANON = (page) => page.evaluate(() => {
    const rc = Router.current(), id = TopicRegistry.current().id, boot = TopicRegistry.bootId();
    return '#' + (id === boot ? '' : id + '/') + rc.view + (rc.sub ? '/' + rc.sub : '');
  });

  /* ---------- A. from #home, a SEARCH pick lands on the topic ---------- */
  await GO_HOME(page);
  const homeA = await ROUTE(page);
  ok('[X3] the arms below start on the #home route', homeA.onHome === true && homeA.hash === '#home' && homeA.appVisible === false, JSON.stringify(homeA));
  const hitA = await PICK_VIA_SEARCH(page, 'kafka');
  const afterA = await ROUTE(page);
  const canonA = await CANON(page);
  ok('[X3] picking a search result from #home LEAVES the home (hash + title + .app, not just the registry)',
    afterA.onHome === false && afterA.hash !== '#home' && afterA.appVisible === true && afterA.title !== homeA.title,
    'committed "' + hitA + '" and the app stayed put: ' + JSON.stringify(afterA) +
    (afterA.topic !== homeA.topic ? '   THE TOPIC MOVED AND THE USER DID NOT -- the pick is silently lost' : ''));
  ok('[X3] ...on a coherent route: the hash names the switched topic and a real view',
    afterA.hash === canonA && !!afterA.view && afterA.view !== 'home',
    JSON.stringify({ hash: afterA.hash, canonical: canonA, view: afterA.view }));

  /* ---------- B. from #home, a TOPIC INDEX pick lands on the topic it names ---------- */
  await GO_HOME(page);
  const homeB = await ROUTE(page);
  const pickedB = await PICK_VIA_INDEX(page);
  const afterB = await ROUTE(page);
  const canonB = await CANON(page);
  ok('[X3] picking a topic in the Topic index from #home LEAVES the home',
    !!pickedB && afterB.onHome === false && afterB.hash !== '#home' && afterB.appVisible === true && afterB.title !== homeB.title,
    'clicked the card for "' + pickedB + '" and the app stayed put: ' + JSON.stringify(afterB));
  ok('[X3] ...on the topic the card names, at a coherent hash',
    afterB.topic === pickedB && afterB.hash === canonB && afterB.view !== 'home',
    JSON.stringify({ picked: pickedB, landed: afterB.topic, hash: afterB.hash, canonical: canonB }));

  /* ---------- C. PLANT: from #home, picking the topic you are ALREADY on still leaves ---------- */
  /* TopicRegistry.setTopic early-returns on `id === cur`, so a fix that navigates only after a
     SUCCESSFUL switch is dead on exactly the pick a returning user makes most: the topic they left. */
  await GO_HOME(page);
  const sameId = await page.evaluate(() => TopicRegistry.current().id);
  const pickedC = await PICK_VIA_INDEX(page, sameId);
  const afterC = await ROUTE(page);
  ok('[plant/X3] from #home, picking the topic ALREADY current still leaves the home (setTopic no-ops; the caller must not depend on it)',
    pickedC === sameId && afterC.onHome === false && afterC.hash !== '#home' && afterC.appVisible === true && afterC.topic === sameId,
    JSON.stringify({ picked: pickedC, after: afterC }));

  /* ---------- D. PLANT: from a TOPIC route, both picks PRESERVE the view ---------- */
  /* This is the anti-overreach arm. A fix that navigates unconditionally passes A-C and fails here:
     a pick made in the drill must land in the DRILL of the new topic, never in the resume view. */
  await page.evaluate(() => Router.navigate('drill'));
  await B.until(page, () => Router.current().view === 'drill', null, 5000, 'the drill route');
  await B.settle(page);
  const onDrill = await ROUTE(page);
  await PICK_VIA_SEARCH(page, 'saga');
  const afterD1 = await ROUTE(page);
  ok('[plant/X3] a SEARCH pick from a topic route keeps the view you were in (#<picked>/drill, not the resume view)',
    afterD1.view === 'drill' && afterD1.onHome === false && afterD1.hash === (await CANON(page)),
    JSON.stringify({ before: onDrill, after: afterD1 }));

  const pickedD2 = await PICK_VIA_INDEX(page);
  const afterD2 = await ROUTE(page);
  ok('[plant/X3] a TOPIC INDEX pick from a topic route keeps the view you were in',
    afterD2.view === 'drill' && afterD2.topic === pickedD2 && afterD2.hash === (await CANON(page)),
    JSON.stringify({ picked: pickedD2, after: afterD2 }));

  /* ---------- E. THE GUARD, AS A PREDICATE -- the arm with no timing window ---------- */
  /* See the header. Interaction arms cannot see guard deletion, because on a settled topic route the
     over-fix's extra navigate is a no-op. Ask the predicate directly instead. */
  const PROBE = (page, kind) => page.evaluate((k) => {
    const before = { hash: location.hash, len: history.length, view: Router.current().view };
    const ret = (typeof LastVisit !== 'undefined' && LastVisit.navigateAfterPick)
      ? LastVisit.navigateAfterPick(k) : '(absent)';
    return { ret: ret, before: before, after: { hash: location.hash, len: history.length, view: Router.current().view } };
  }, kind);

  /* still on a topic route from arm D */
  const offHome = await PROBE(page, 'topic');
  ok('[X3/E] navigateAfterPick REFUSES off the home route -- returns false and touches nothing (catches guard deletion, which no interaction arm can see)',
    offHome.ret === false && offHome.after.hash === offHome.before.hash && offHome.after.len === offHome.before.len,
    JSON.stringify(offHome) + '   it navigated from a TOPIC route: the rc.view guard is gone, and a ' +
    'deep-link with a stale resume pointer will dump the user into the pointer\'s view');

  await GO_HOME(page);
  const homeHashKind = await PROBE(page, 'hash');
  ok('[X3/E] ...and refuses a \'hash\' pick even ON the home (those route themselves; navigating too would push a junk entry and break Back)',
    homeHashKind.ret === false && homeHashKind.after.hash === homeHashKind.before.hash && homeHashKind.after.len === homeHashKind.before.len,
    JSON.stringify(homeHashKind));

  const onHome = await PROBE(page, 'topic');
  ok('[control/X3/E] ...but it DOES fire on the home for a topic pick -- so the two arms above are not satisfied by a stub that always returns false',
    onHome.ret === true && onHome.after.hash !== onHome.before.hash && onHome.after.view !== 'home' && onHome.after.len === onHome.before.len + 1,
    JSON.stringify(onHome));

  /* ---------- F. a 'cross' pick from #home is an exit too ---------- */
  /* The Topic index renders the cross-topic and weak-spot bars (Panels.actionsHtml), and they take
     the same pick path with kind='cross'. The home's own cross bar has always navigated; this arm
     pins the index overlay to that same behaviour rather than leaving it undeclared. */
  await GO_HOME(page);
  const homeF = await ROUTE(page);
  await BLUR(page);
  await page.keyboard.press('Backslash');
  await B.until(page, () => !!document.querySelector('.ix-ov.open'), null, 5000, 'the topic index opens');
  await B.settle(page); await B.settle(page);
  const hasCross = await page.evaluate(() => !!document.querySelector('.ix-ov [data-cross="1"]'));
  if (hasCross) { await page.locator('.ix-ov [data-cross="1"]').click(); await B.settle(page); await B.settle(page); }
  const afterF = await ROUTE(page);
  const crossOpen = await page.evaluate(() => !!(window.CrossDrill && CrossDrill.isOpen && CrossDrill.isOpen()));
  ok('[X3/F] a cross-drill pick in the Topic index from #home ALSO leaves the home, and still opens the drill',
    hasCross && afterF.onHome === false && afterF.hash !== '#home' && afterF.appVisible === true && crossOpen === true,
    JSON.stringify({ crossBarPresent: hasCross, before: homeF, after: afterF, crossDrillOpen: crossOpen }));
  await page.evaluate(() => { if (window.CrossDrill && CrossDrill.close) CrossDrill.close(); });
  await B.settle(page);

  await page.evaluate(() => Router.navigate('drill'));
  await B.until(page, () => Router.current().view === 'drill', null, 5000, 'the drill route');
  await B.settle(page);
  const beforeF2 = await ROUTE(page);
  await BLUR(page);
  await page.keyboard.press('Backslash');
  await B.until(page, () => !!document.querySelector('.ix-ov.open'), null, 5000, 'the topic index opens');
  await B.settle(page); await B.settle(page);
  if (await page.evaluate(() => !!document.querySelector('.ix-ov [data-cross="1"]'))) {
    await page.locator('.ix-ov [data-cross="1"]').click(); await B.settle(page); await B.settle(page);
  }
  const afterF2 = await ROUTE(page);
  ok('[plant/X3/F] ...and from a topic route a cross pick moves nobody (the route is preserved, exactly as before the fix)',
    afterF2.hash === beforeF2.hash && afterF2.view === 'drill',
    JSON.stringify({ before: beforeF2, after: afterF2 }));
  await page.evaluate(() => { if (window.CrossDrill && CrossDrill.close) CrossDrill.close(); });
  await B.settle(page);

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('SEARCH DEADEND: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
