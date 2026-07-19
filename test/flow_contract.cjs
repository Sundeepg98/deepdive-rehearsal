#!/usr/bin/env node
/*
 * WAVE 2 -- THE ONE-COMPUTE CONTRACT. Every visible "next" affordance renders the SAME flowRec
 * compute: the desktop Continue dock (#ndock), the seg recommendation pip, and -- as they land --
 * the home CTA and #ssgo. This gate drives the app through mutations and asserts, after each, that
 * the dock's label string-matches flowRec's button (entities decoded) and the pip sits on flowRec's
 * tab. No surface may drift from the engine -- that split-brain is the whole bug class W0-W2 kills.
 *
 * It also asserts BOUNDARY-SUPPRESSION (the dock is quiet on the pane flowRec already points at --
 * the micro tier), and arms a NEGATIVE CONTROL: flowRec with no forward target must darken the dock,
 * and a forced flowRec target must MOVE the dock's label -- a check whose red has been watched.
 *
 * Ground truth: _audit/2026-07-18-flow-design-panel.md, Wave 2 (NextUp micro/meso/macro).
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/flow_contract.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const errs = [], fails = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  const fresh = async () => { await B.gotoApp(page, HTML); await page.evaluate(() => localStorage.clear()); await B.gotoApp(page, HTML); await B.enterApp(page); };
  const pane = async (id) => { await page.evaluate((t) => switchTab(t), id); await page.waitForFunction((t) => { const e = document.getElementById(t); return e && getComputedStyle(e).display !== 'none'; }, id, { timeout: B.ACT_MS }); await B.settle(page); };

  /* read every visible "next" surface + the engine's own answer in one shot */
  const snap = () => page.evaluate(() => {
    const rec = (typeof flowRec === 'function') ? flowRec() : null;
    const tmp = document.createElement('div'); tmp.innerHTML = (rec && rec.btn) || '';
    const expected = tmp.textContent.trim();
    const dock = document.getElementById('ndock');
    const go = (dock && !dock.hidden) ? dock.querySelector('.nd-go') : null;
    const pip = document.querySelector('.flow-pip, .flow-cta');
    const pipTab = pip ? (pip.id === 'mockopen' ? '__mock__' : pip.id === 'mixopen' ? '__mix__' : pip.getAttribute('data-tab')) : null;
    const curOn = document.querySelector('.seg button.on');
    return {
      recTab: rec ? rec.tab : null, recBtn: expected, recHasBtn: !!(rec && rec.btn),
      dockHidden: dock ? dock.hidden : null, dockLabel: go ? go.textContent.trim() : null,
      pipTab: pipTab, curTab: curOn ? curOn.getAttribute('data-tab') : null,
    };
  });

  /* ---- fresh topic: recommendation is the drill (dDone<dTot); default pane is walk ---- */
  await fresh();
  await page.waitForFunction(() => { const d = document.getElementById('ndock'); return d && !d.hidden; }, null, { timeout: B.ACT_MS }).catch(() => {});
  let s = await snap();
  ok('fresh topic: dock shows a CTA (recommendation is elsewhere than the walk pane)', s.dockHidden === false && !!s.dockLabel, JSON.stringify(s));
  ok('one compute: dock label == flowRec button (' + s.recBtn + ')', s.dockLabel === s.recBtn, JSON.stringify(s));
  ok('one compute: seg pip sits on flowRec.tab (' + s.recTab + ')', s.pipTab === s.recTab, JSON.stringify(s));

  /* ---- boundary-suppression: switch ONTO the recommended pane -> the dock goes quiet (micro) ---- */
  await pane(s.recTab === 'wb' ? 'wb' : 'drill');
  await B.settle(page);
  let sup = await snap();
  ok('boundary-suppression: dock hidden on the pane flowRec points at (the pane owns momentum)', sup.dockHidden === true, JSON.stringify(sup));

  /* ---- mutation: grade every drill probe -> flowRec moves to wb; the dock must FOLLOW, still == flowRec ---- */
  await fresh();
  await pane('drill');
  await page.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms));
    let g = 0; while (g++ < 400) { if (r.getElementById('adv')) { r.getElementById('adv').click(); await s(2); continue; } const jg = r.getElementById('jg'); if (!jg) break; jg.click(); await s(3); }
  });
  await sleep(150);
  await pane('sys');    /* a reading pane -> the dock must show the meso CTA (row 12) */
  await B.settle(page);
  let mut = await snap();
  ok('after grading the drill: flowRec advanced past the drill', mut.recTab !== 'drill', JSON.stringify(mut));
  ok('one compute holds after mutation: dock label == flowRec button (' + mut.recBtn + ')', mut.dockHidden === false && mut.dockLabel === mut.recBtn, JSON.stringify(mut));

  /* ---- `n` key: navigates to the NextUp target (same flowGo) ---- */
  await fresh();      /* walk pane, rec = drill */
  const nav = await page.evaluate(async () => {
    const before = (document.querySelector('.seg button.on') || {}).getAttribute ? document.querySelector('.seg button.on').getAttribute('data-tab') : null;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));
    const after = document.querySelector('.seg button.on') ? document.querySelector('.seg button.on').getAttribute('data-tab') : null;
    const rec = flowRec();
    return { before, after, recTab: rec ? rec.tab : null };
  });
  ok('n key navigates to the NextUp target (walk -> ' + nav.recTab + ')', nav.before === 'walk' && nav.after === nav.recTab, JSON.stringify(nav));

  /* ---- data-driven: force flowRec to a DIFFERENT surface, refire -> the dock label MOVES ---- */
  await fresh(); await pane('sys');   /* reading pane so the dock is a meso CTA */
  const moved = await page.evaluate(async () => {
    const orig = flowRec;
    flowRec = function () { return { tab: 'wb', btn: 'Forced target &rarr;', kicker: 'X', receipt: '', bd: '#ccc', bg: '#eee', ink: '#333' }; };
    document.dispatchEvent(new CustomEvent('flowstatechange')); await new Promise((r) => setTimeout(r, 40));
    const go = document.querySelector('#ndock .nd-go');
    const label = go ? go.textContent.trim() : null;
    flowRec = orig; document.dispatchEvent(new CustomEvent('flowstatechange'));
    return { label };
  });
  ok('dock is data-driven: forcing flowRec moves its label to the forced target', moved.label === 'Forced target →', JSON.stringify(moved));

  /* ---- NEGATIVE CONTROL: flowRec with no forward target -> the dock must go dark (check can go red) ---- */
  await fresh(); await pane('sys');
  const neg = await page.evaluate(async () => {
    const orig = flowRec;
    flowRec = function () { return { tab: null, btn: null }; };
    document.dispatchEvent(new CustomEvent('flowstatechange')); await new Promise((r) => setTimeout(r, 40));
    const d = document.getElementById('ndock');
    const hidden = d ? d.hidden : null;
    flowRec = orig; document.dispatchEvent(new CustomEvent('flowstatechange'));
    return { hidden };
  });
  ok('[negative control] flowRec with no target darkens the dock (this check can go red)', neg.hidden === true,
    'the dock stayed lit with no recommendation -- it is decorative, not flowRec-driven');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FLOW CONTRACT: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
