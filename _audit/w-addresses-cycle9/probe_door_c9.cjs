/* W-ADDRESSES cycle 9 -- read the door's room and the surface the app shows, for a list of
   hashes, on any built page. Used by press_routes_disjoint_c9.py to show that a topic id which is
   ALSO a router view id re-enters R21's defect verbatim.

   THE ORACLE IS THE PAGE, exactly as R22 requires: `data-view` decides which of the two questions
   is being asked, `Panels.resumeTarget()` answers the home's and `TopicRegistry.current()`
   answers a topic view's. The room the document WORE is the union of a document_start
   MutationObserver and 90 painted frames, which is the union home_claims uses.

   usage: node probe_door_c9.cjs <built.html> <seedTopicId> <hash> [hash...]
   prints one JSON object per line. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const HTML = process.argv[2];
const SEED = process.argv[3];
const HASHES = process.argv.slice(4);

const INIT = (seed) => {
  try {
    localStorage.clear();
    localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: seed, view: 'drill' }));
    localStorage.setItem('ddr.v1.progress.' + seed, JSON.stringify({
      got: 3, shk: 2, done: 5, tot: 12, revisit: ['x'], cards: {}, cv: 1, ts: Date.now() }));
  } catch (e) { /* private mode is not this probe's subject */ }
  window.__seen = [document.documentElement
    ? document.documentElement.getAttribute('data-group') : null];
  new MutationObserver((recs) => {
    for (const r of recs) window.__seen.push(r.target.getAttribute(r.attributeName));
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-group'] });
  window.__frames = [];
  const tick = () => {
    window.__frames.push(document.documentElement.getAttribute('data-group'));
    if (window.__frames.length < 90) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const READ = () => {
  const view = document.documentElement.getAttribute('data-view');
  const shown = ((((typeof TopicRegistry !== 'undefined' && TopicRegistry.current
    && TopicRegistry.current()) || {}).identity) || {}).group || null;
  const rt = (typeof Panels !== 'undefined' && Panels.resumeTarget && Panels.resumeTarget()) || null;
  const resume = ((rt || {}).topic || {}).identity ? rt.topic.identity.group : null;
  return { view, shown, resume,
    wore: [...new Set(window.__seen.slice(1).concat(window.__frames))].filter((v) => v !== null) };
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  for (const hash of HASHES) {
    const p = await ctx.newPage();
    await p.addInitScript(INIT, SEED);
    await B.gotoApp(p, HTML, { hash });
    await B.until(p, () => document.documentElement.getAttribute('data-view') === 'home'
      || !!document.querySelector('.stage .pane.on'), hash, B.ACT_MS, 'the route rendered');
    await B.settle(p);
    const r = await p.evaluate(READ);
    await p.close();
    const isHome = r.view === 'home';
    const want = isHome ? r.resume : r.shown;
    console.log(JSON.stringify({ hash, showing: isHome ? 'THE HOME' : 'a TOPIC view',
      ought: want, wore: r.wore, ok: !!want && r.wore.length > 0 && r.wore.every((v) => v === want) }));
  }
  await browser.close();
})();
