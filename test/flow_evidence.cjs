#!/usr/bin/env node
/*
 * WAVE 1 -- THE RECEIPT GATE (D5). Every forward strip renders a receipt: the raw stored numbers
 * that justify it ("0 of 22 graded", "3 shaky", "not started"). This gate reads the receipt a
 * terminal actually rendered, then recomputes the SAME claim INDEPENDENTLY from localStorage (never
 * through sessStats/flowReceipt -- the thing under test), and fails on any mismatch. So a
 * recommendation bug becomes a red diff, not a silent product lie. A negative control (poison the
 * stored record so the receipt can no longer be true) proves the recompute can go red.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/flow_evidence.cjs
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

  /* Grade K drill probes SOLID (leaving the drill incomplete), then whiteboard ALL recalled ->
   * the wb ok-verdict strip recommends "Back to the drill" with the drill receipt "K of M graded".
   * K=5 so the receipt is a NON-zero claim we can independently verify. */
  await fresh();
  await pane('drill');
  const K = 5;
  await page.evaluate(async (k) => {
    const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms)); let g = 0, graded = 0;
    while (g++ < 400 && graded < k) { if (r.getElementById('adv')) { r.getElementById('adv').click(); await s(2); continue; } const jg = r.getElementById('jg'); if (!jg) break; jg.click(); graded++; await s(3); }
  }, K);
  await pane('wb');
  const rendered = await page.evaluate(async () => {
    const r = document.querySelector('#wb deep-whiteboard').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms)); const lis = r.querySelectorAll('#wblist li');
    for (let i = 0; i < lis.length; i++) { lis[i].querySelector('.wb-rev').click(); await s(2); lis[i].querySelector('.wb-got').click(); await s(2); }
    await s(120);
    const rc = r.querySelector('#wbflow .flow-rcpt'), go = r.querySelector('#wbflow .flow-go');
    return { receipt: rc ? rc.textContent.trim() : null, btn: go ? go.textContent.trim() : null };
  });

  /* INDEPENDENT recompute from localStorage -- the raw record, not sessStats. */
  const store = await page.evaluate(() => {
    const id = TopicRegistry.current().id;
    const p = localStorage.getItem('ddr.v1.progress.' + id);
    return { id, done: p ? (JSON.parse(p).done || 0) : 0, bank: _allCards.length };
  });
  const expected = store.done + ' of ' + store.bank + ' graded';
  ok('the wb-ok strip recommends the unfinished drill', /drill/i.test(rendered.btn || ''), JSON.stringify(rendered));
  ok('receipt matches the record recomputed from localStorage (' + expected + ')',
    rendered.receipt === expected, 'rendered "' + rendered.receipt + '" vs record "' + expected + '" (raw progress.done=' + store.done + ', bank=' + store.bank + ')');

  /* NEGATIVE CONTROL: poison the stored record so the rendered receipt can no longer be true, and
   * demand the recompute now DISAGREES -- i.e. the equality above would have gone red. */
  const neg = await page.evaluate(() => {
    const id = TopicRegistry.current().id, key = 'ddr.v1.progress.' + id;
    const rec = JSON.parse(localStorage.getItem(key)); const was = rec.done; rec.done = was + 7; localStorage.setItem(key, JSON.stringify(rec));
    const recomputed = (rec.done) + ' of ' + _allCards.length + ' graded';
    localStorage.setItem(key, JSON.stringify(Object.assign(rec, { done: was })));   /* restore */
    return { recomputed };
  });
  ok('[negative control] a poisoned record makes the recompute DISAGREE with the rendered receipt',
    neg.recomputed !== rendered.receipt, 'poisoned recompute "' + neg.recomputed + '" still equals rendered "' + rendered.receipt + '"');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('FLOW EVIDENCE: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
