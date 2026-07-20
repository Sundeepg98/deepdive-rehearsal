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
  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('SEARCH DEADEND: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
