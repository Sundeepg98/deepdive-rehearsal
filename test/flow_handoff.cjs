#!/usr/bin/env node
/*
 * WAVE 1 -- THE HAND-OFF GATE. Every completion terminal must offer EXACTLY ONE forward affordance
 * and no more (the anti-goal is "button soup"): either the surface's own SELF button already IS the
 * recommendation (#dweak / #wbrerun / #mbagain / #mxretry), or a flowStripHtml strip (.flow-go), but
 * never both, and never neither on a surface that has a next step. This drives all five hand-offs to
 * their states and asserts the count, then arms a NEGATIVE CONTROL (neuter flowStripHtml) and demands
 * the strip terminals go dark -- a check whose red has never been watched is decoration.
 *
 * Ground truth: _audit/2026-07-18-flow-design-panel.md, Direction A decision table rows 1-10.
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/flow_handoff.cjs
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

  /* count forward affordances in a shadow root: SELF buttons that exist + any .flow-go strip button */
  const affordances = (rootSel, selfIds) => page.evaluate((a) => {
    const [sel, ids] = a;
    const host = document.querySelector(sel); if (!host || !host.shadowRoot) return { self: 0, strip: 0, selves: [] };
    const r = host.shadowRoot;
    const selves = ids.filter((id) => !!r.getElementById(id));
    return { self: selves.length, strip: r.querySelectorAll('.flow-go').length, selves };
  }, [rootSel, selfIds]);

  /* ---- drill debrief: clean -> strip; shaky -> SELF #dweak (rows 2-3) ---- */
  const driveDrill = async (shaky) => {
    await fresh(); await pane('drill');
    await page.evaluate(async (sh) => {
      const d = document.querySelector('#drill deep-drill'), r = d.shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms)); let g = 0;
      while (g++ < 400) { if (r.getElementById('adv')) { r.getElementById('adv').click(); await s(2); continue; } const jg = r.getElementById('jg'), js = r.getElementById('js'); if (!jg || !js) break; ((sh && d.di === cards.length - 1) ? js : jg).click(); await s(3); }
    }, shaky); await sleep(120);
    return affordances('#drill deep-drill', ['dweak']);
  };
  let a = await driveDrill(false); ok('drill debrief CLEAN: exactly one forward affordance (strip)', a.self === 0 && a.strip === 1, JSON.stringify(a));
  a = await driveDrill(true); ok('drill debrief SHAKY: exactly one forward affordance (SELF #dweak, no strip)', a.self === 1 && a.strip === 0, JSON.stringify(a));

  /* ---- whiteboard: ok -> strip; warn -> SELF #wbrerun (rows 4-5) ---- */
  const driveWb = async (miss) => {
    await fresh(); await pane('wb');
    await page.evaluate(async (mv) => {
      const r = document.querySelector('#wb deep-whiteboard').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms)); const lis = r.querySelectorAll('#wblist li');
      for (let i = 0; i < lis.length; i++) { lis[i].querySelector('.wb-rev').click(); await s(2); lis[i].querySelector(mv && i === lis.length - 1 ? '.wb-miss' : '.wb-got').click(); await s(2); }
    }, miss); await sleep(120);
    return affordances('#wb deep-whiteboard', ['wbrerun']);
  };
  a = await driveWb(false); ok('whiteboard OK-verdict: exactly one forward affordance (strip)', a.self === 0 && a.strip === 1, JSON.stringify(a));
  a = await driveWb(true); ok('whiteboard WARN-verdict: exactly one forward affordance (SELF #wbrerun, no strip)', a.self === 1 && a.strip === 0, JSON.stringify(a));

  /* ---- mock overlay end: strong -> strip; weak -> SELF #mbagain (rows 6-7) ---- */
  const driveMock = async (score) => {
    await fresh();
    await page.evaluate(async () => { const s = (ms) => new Promise((x) => setTimeout(x, ms)); openMock(); await s(15); let g = 0; while (g++ < 40) { const nb = mockRoot.getElementById('mbnext'); if (nb) { nb.click(); await s(6); continue; } break; } });
    await page.evaluate(async (sc) => { const s = (ms) => new Promise((x) => setTimeout(x, ms)); const row = mockRoot.getElementById('mbscore'); const b = row && row.querySelector('[data-s="' + sc + '"]'); if (b) b.click(); await s(45); }, score);
    /* #mbagain always exists; the SELF claim for a weak score is "#mbagain present AND no strip" */
    return page.evaluate(() => ({ self: mockRoot.getElementById('mbagain') ? 1 : 0, strip: mockRoot.querySelectorAll('.flow-go').length }));
  };
  a = await driveMock(6); ok('mock end STRONG: one strip + the standing #mbagain', a.strip === 1, JSON.stringify(a));
  a = await driveMock(1); ok('mock end WEAK: SELF #mbagain, no strip', a.self === 1 && a.strip === 0, JSON.stringify(a));

  /* ---- drill-pane #vrestart timed-mock verdict -> strip (row 8) ---- */
  await fresh(); await pane('drill');
  await page.evaluate(async () => { const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms)); const mb = r.querySelector('[data-m="mock"]'); if (mb) mb.click(); await s(60); let g = 0; while (g++ < 400) { if (r.getElementById('adv')) { r.getElementById('adv').click(); await s(2); continue; } const jg = r.getElementById('jg'); if (!jg) break; jg.click(); await s(3); } });
  await sleep(150);
  a = await page.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot; return { vrestart: !!r.getElementById('vrestart'), strip: r.querySelectorAll('#vrflow .flow-go').length }; });
  ok('drill-pane #vrestart verdict: strip present (complementary to #vrestart)', a.vrestart && a.strip === 1, JSON.stringify(a));

  /* ---- mixed-fire end: clean -> strip; fumbled -> SELF #mxretry (rows 9-10) ---- */
  const driveMix = async (fumble) => {
    await fresh();
    await page.evaluate(async (fmb) => { const s = (ms) => new Promise((x) => setTimeout(x, ms)); openMix(); await s(15); let g = 0; while (g++ < 20) { const sh = mixRoot.getElementById('mxshow'); if (!sh) break; sh.click(); await s(8); ((fmb && g === 1) ? mixRoot.getElementById('mxs') : mixRoot.getElementById('mxg')).click(); await s(8); } await s(45); }, fumble);
    return page.evaluate(() => ({ self: mixRoot.getElementById('mxretry') ? 1 : 0, strip: mixRoot.querySelectorAll('#mxflow .flow-go').length }));
  };
  a = await driveMix(false); ok('mixed-fire CLEAN: forward strip (topic-end / next surface)', a.self === 0 && a.strip === 1, JSON.stringify(a));
  a = await driveMix(true); ok('mixed-fire FUMBLED: SELF #mxretry, no strip', a.self === 1 && a.strip === 0, JSON.stringify(a));

  /* ---- walk last step morph (row 1): #wnext re-aims, geometry locked ---- */
  await fresh(); await pane('walk');
  const walk = await page.evaluate(async () => {
    const w = document.querySelector('#walk deep-walkthrough'), s = (ms) => new Promise((x) => setTimeout(x, ms));
    const box0 = w.shadowRoot.getElementById('wnext').getBoundingClientRect();
    let g = 0; while (w._wi < w._steps.length - 1 && g++ < 60) { w.shadowRoot.getElementById('wnext').click(); await s(12); }
    await s(80);
    const b = w.shadowRoot.getElementById('wnext'), bx = b.getBoundingClientRect();
    return { cta: b.classList.contains('flow-cta'), disabled: b.disabled, moved: Math.round(box0.x) !== Math.round(bx.x) || Math.round(box0.width) !== Math.round(bx.width) || Math.round(box0.height) !== Math.round(bx.height) };
  });
  ok('walk last step: #wnext morphs to a live CTA (row 1)', walk.cta && !walk.disabled, JSON.stringify(walk));
  ok('walk morph: geometry LOCKED (hit surface did not move)', !walk.moved, JSON.stringify(walk));

  /* ---- seg recommendation pip (W1): the light-DOM nav mirrors flowRec, ONE compute, zero box delta.
   * It is NOT a competing recommendation source -- it reads the SAME flowRec the strips do -- so it is
   * checked here for fidelity (it points where flowRec points) and armed with a watched-red control. */
  await fresh();   /* fresh topic, no work done -> pickRec falls to "back to the drill" (tab 'drill') */
  await page.waitForFunction(() => document.querySelectorAll('.flow-pip, .flow-cta').length === 1, null, { timeout: B.ACT_MS }).catch(() => {});
  const pip = await page.evaluate(() => {
    const rec = flowRec(); const nodes = document.querySelectorAll('.flow-pip, .flow-cta');
    let where = null;
    if (nodes.length === 1) { const n = nodes[0]; where = n.id === 'mockopen' ? '__mock__' : n.id === 'mixopen' ? '__mix__' : n.getAttribute('data-tab'); }
    return { recTab: rec ? rec.tab : null, count: nodes.length, where };
  });
  ok('seg pip: exactly one, on the surface flowRec points at (' + pip.recTab + ')', pip.count === 1 && pip.where === pip.recTab, JSON.stringify(pip));

  /* data-driven: force flowRec to a DIFFERENT surface and refire -- the pip must MOVE (not hardcoded) */
  const moved = await page.evaluate(async () => {
    const orig = flowRec;
    flowRec = function () { return { tab: 'wb', btn: 'x', kicker: '', text: '', bd: '', bg: '', ink: '' }; };
    document.dispatchEvent(new CustomEvent('flowstatechange')); await new Promise((r) => setTimeout(r, 40));
    const on = document.querySelector('.seg button[data-tab="wb"]').classList.contains('flow-pip');
    const total = document.querySelectorAll('.flow-pip, .flow-cta').length;
    flowRec = orig; document.dispatchEvent(new CustomEvent('flowstatechange'));
    return { on, total };
  });
  ok('seg pip is data-driven: forcing flowRec->wb moves the pip to the wb tab (exactly one)', moved.on && moved.total === 1, JSON.stringify(moved));

  /* NEGATIVE CONTROL: flowRec with no forward surface -> zero pips (proves the check can go red) */
  const negpip = await page.evaluate(async () => {
    const orig = flowRec;
    flowRec = function () { return { tab: null, btn: null }; };
    document.dispatchEvent(new CustomEvent('flowstatechange')); await new Promise((r) => setTimeout(r, 40));
    const n = document.querySelectorAll('.flow-pip, .flow-cta').length;
    flowRec = orig; document.dispatchEvent(new CustomEvent('flowstatechange'));
    return { n };
  });
  ok('[negative control] flowRec with no next surface leaves zero pips (this check can go red)', negpip.n === 0,
    'a pip persisted with no recommendation -- the pip is decorative, not flowRec-driven');

  /* ---- NEGATIVE CONTROL: neuter flowStripHtml -> every strip terminal must go dark ---- */
  a = await driveDrill(false);   /* re-establish the clean debrief with strips working */
  const neg = await page.evaluate(async () => {
    const orig = window.flowStripHtml || flowStripHtml;
    /* eslint-disable no-global-assign */
    flowStripHtml = function () { return ''; };
    /* re-render the debrief so the neutered fn is used */
    const d = document.querySelector('#drill deep-drill');
    d.renderDebrief();
    await new Promise((r) => setTimeout(r, 60));
    const strips = d.shadowRoot.querySelectorAll('.flow-go').length;
    flowStripHtml = orig;
    return { strips };
  });
  ok('[negative control] neutering flowStripHtml darkens the strip (this check can go red)', neg.strips === 0,
    'the drill debrief still showed a .flow-go with flowStripHtml returning "" -- the affordance count is decorative');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FLOW HANDOFF: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
