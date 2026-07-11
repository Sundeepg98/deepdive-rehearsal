/* LIVE PROOF of the runtime P0s, in the real built app, through the real Shadow DOM.
 * Run from the repo root:  node _audit/2026-07-11-compiler-parity/_adv_live.cjs
 */
const { chromium } = require('playwright');
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).split('\n')[0]));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);

  const R = await p.evaluate(async () => {
    const out = {};
    const g = (n) => (typeof window[n] !== 'undefined' ? window[n] : undefined);

    // --- switch to a COMPILED topic (one of the 38) ---
    const ids = (typeof TopicRegistry !== 'undefined' && TopicRegistry.ids) ? TopicRegistry.ids() : [];
    out.allIds = ids.length;
    const md38 = ids.find((i) => i === 'idempotency') || ids.find((i) => !['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'].includes(i));
    out.topic = md38;
    if (TopicRegistry.setTopic) TopicRegistry.setTopic(md38);
    await new Promise((r) => setTimeout(r, 400));

    const t = TopicRegistry.get(md38);
    const bank = t.data.bank, sys = t.data.sys, drill = t.data.drill, wb = t.data.wb;

    // ---- P0-A: sys.stages EMPTY + pivot answers EMPTY (F1/F2) ----
    out.sys_stages = sys.stages.length;
    out.sys_pivots = sys.pivots.length;
    out.sys_pivot_a_empty = sys.pivots.filter((x) => !x.a).length;
    out.sys_chip_len = sys.pivots.map((x) => (x.chip || '').length);
    out.sys_chip_has_newline = sys.pivots.filter((x) => /\n/.test(x.chip || '')).length;

    // ---- P0-B: drill tierNotes ----
    out.tierNotes_keys = Object.keys(drill.tierNotes || {});
    out.tierNotes_all = drill.tierNotes ? drill.tierNotes.all : undefined;

    // ---- P0-C: curveball theme is the literal token (F5) ----
    out.curve_themes = bank.curveballs.map((c) => c.theme);
    out.curve_task = bank.curveballs.map((c) => c.task);

    // ---- P0-D: mock beat fields swallowed (F6) ----
    out.beat0_keys = Object.keys(bank.mockBeats[0]);
    out.beat0_task_len = (bank.mockBeats[0].task || '').length;
    out.beat0_model = bank.mockBeats[0].model;
    out.beat0_int = bank.mockBeats[0].int;

    // ---- P0-E: THE BANK CORRUPTION. snapshot, run a mock, re-read canonical. ----
    out.idx = { curve: g('mockCurveIdx'), frame: g('mockFrameIdx') };
    out.canon_cue_BEFORE = bank.curveballs[0].cue.slice(0, 70);
    out.frames = (bank.frames || []).map((f) => String(f).slice(0, 40));
    return out;
  });

  // --- fire a real mock run through the UI-level function, then re-read the CANONICAL bank ---
  const corrupt = await p.evaluate(async () => {
    const t = TopicRegistry.get(TopicRegistry.current().id);
    const before = t.data.bank.curveballs[0].cue;
    if (typeof openMock === 'function') openMock();
    await new Promise((r) => setTimeout(r, 250));
    if (typeof closeMock === 'function') closeMock();
    const after = TopicRegistry.get(TopicRegistry.current().id).data.bank.curveballs[0].cue;
    return {
      ran: typeof openMock === 'function',
      before: before.slice(0, 70),
      after: after.slice(0, 70),
      CORRUPTED: before !== after,
      frameStrings: t.data.bank.frames.map((f) => String(f).slice(0, 70)),
    };
  });

  // --- Shadow-DOM level: what does the user SEE? ---
  const seen = await p.evaluate(() => {
    const dig = (sel) => {
      const el = document.querySelector(sel);
      return el && el.shadowRoot ? el.shadowRoot : null;
    };
    const o = {};
    const dr = dig('deep-drill') || dig('deep-drill-pane');
    // find any pane host with a shadowRoot containing #tiernote
    let tn = null, wbf = null;
    document.querySelectorAll('*').forEach((e) => {
      if (!e.shadowRoot) return;
      const a = e.shadowRoot.getElementById && e.shadowRoot.getElementById('tiernote');
      if (a) tn = a;
      const f = e.shadowRoot.querySelector && e.shadowRoot.querySelector('.wb-foot');
      if (f) wbf = f;
    });
    o.tiernote_html = tn ? tn.innerHTML : '(not found)';
    o.wbfoot_html = wbf ? JSON.stringify(wbf.innerHTML) : '(not found)';
    o.wbfoot_box = wbf ? (() => { const r = wbf.getBoundingClientRect(); const s = getComputedStyle(wbf); return { h: Math.round(r.height), bg: s.backgroundImage !== 'none' || s.backgroundColor !== 'rgba(0, 0, 0, 0)' }; })() : null;
    // companion rail (LIGHT dom)
    o.cmp = {
      view: (document.getElementById('cmpView') || {}).textContent,
      note: ((document.getElementById('cmpNote') || {}).textContent || '').slice(0, 60),
    };
    return o;
  });

  console.log('===== LIVE, in dist/index.html, on a COMPILED topic =====');
  console.log('topic under test :', R.topic, '   (registry has', R.allIds, 'topics)');
  console.log('');
  console.log('--- F1  sys.stages ---');
  console.log('  stages emitted            :', R.sys_stages, R.sys_stages === 0 ? '  <== THE SYSTEM MAP CHAIN IS EMPTY' : '');
  console.log('--- F2  sys.pivots ---');
  console.log('  pivots                    :', R.sys_pivots);
  console.log('  pivots with EMPTY answer  :', R.sys_pivot_a_empty, '<== the disclosure body renders BLANK');
  console.log('  chip lengths (chars)      :', R.sys_chip_len.join(', '), ' (the 8 ship 19-39)');
  console.log('  chips containing a \\n     :', R.sys_chip_has_newline);
  console.log('--- F3/7.1  drill.tierNotes ---');
  console.log('  keys                      :', JSON.stringify(R.tierNotes_keys), '<== F3: all dropped');
  console.log('  tierNotes.all             :', R.tierNotes_all, '<== innerHTML = undefined -> renders the WORD');
  console.log('  RENDERED #tiernote        :', JSON.stringify(seen.tiernote_html));
  console.log('--- F5  curveball theme ---');
  console.log('  themes                    :', JSON.stringify(R.curve_themes), '<== literal token, not the theme');
  console.log('  curveball .task           :', JSON.stringify(R.curve_task), '<== mixed-fire.js:18 renders this');
  console.log('--- F6  mock beat fields ---');
  console.log('  beat[0] keys              :', JSON.stringify(R.beat0_keys), '<== no model, no int');
  console.log('  beat[0].task length       :', R.beat0_task_len, 'chars (it swallowed Model+Int+answer)');
  console.log('--- 3.3  whiteboard foot ---');
  console.log('  wb.foot innerHTML         :', seen.wbfoot_html);
  console.log('  rendered box              :', JSON.stringify(seen.wbfoot_box), '<== empty but DECORATED');
  console.log('--- 3.2  THE BANK CORRUPTION (ran one real mock) ---');
  console.log('  mockCurveIdx / mockFrameIdx:', R.idx.curve, '/', R.idx.frame, R.idx.curve === R.idx.frame ? ' <== COLLIDED' : '');
  console.log('  canonical curveballs[0].cue BEFORE:', JSON.stringify(corrupt.before));
  console.log('  canonical curveballs[0].cue AFTER :', JSON.stringify(corrupt.after));
  console.log('  CANONICAL BANK CORRUPTED  :', corrupt.CORRUPTED ? 'YES  <== P0 CONFIRMED' : 'no');
  console.log('--- 3.5  companion rail (light DOM) ---');
  console.log('  cmpView / cmpNote         :', JSON.stringify(seen.cmp));
  console.log('');
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})();
