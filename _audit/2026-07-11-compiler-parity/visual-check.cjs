// Drive the BUILT app and observe what the 5 lens panes actually render for a
// hand-coded topic vs a generated one. Proves the data gap is user-visible.
const { chromium } = require('playwright');

const PANES = ['wb', 'rf', 'trade', 'open', 'num'];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await p.waitForTimeout(1200);

  const probe = async (topicId) => await p.evaluate(async (args) => {
    const { topicId, PANES } = args;
    TopicRegistry.setCurrent ? TopicRegistry.setCurrent(topicId) : null;
    const t = TopicRegistry.get(topicId);
    const d = t.data;
    const out = { id: topicId };
    // wb: how many cues, and is the foot box EMPTY-BUT-STYLED?
    out.wb_cues = (d.wb.steps || []).length;
    out.wb_footText = (d.wb.foot || '').length;
    out.rf_flags = (d.rf.flags || []).length;
    out.trade_dec = (d.trade.decisions || []).length;
    out.open_cards = (d.open.cards || []).length;
    out.open_kinds = (d.open.cards || []).map(c => c.kind).join('+');
    out.num_inputs = (d.num.inputs || []).length;
    return out;
  }, { topicId, PANES });

  const rows = [];
  for (const id of ['content-pipeline', 'signing', 'idempotency', 'caching', 'kafka-internals', 'storage-engines']) {
    rows.push(await probe(id));
  }
  console.log('id'.padEnd(18) + 'wb_cues  wb_footChars  rf_flags  trade_dec  open_cards(kinds)   num_inputs');
  for (const r of rows) {
    console.log(r.id.padEnd(18) + String(r.wb_cues).padStart(5) + String(r.wb_footText).padStart(12) +
      String(r.rf_flags).padStart(10) + String(r.trade_dec).padStart(10) + '   ' +
      (r.open_cards + ' (' + r.open_kinds + ')').padEnd(18) + String(r.num_inputs).padStart(6));
  }

  // Render the Whiteboard pane for a generated topic and measure the EMPTY foot box.
  const footBox = await p.evaluate(() => {
    const el = document.createElement('deep-whiteboard');
    document.body.appendChild(el);
    // find the .wb-foot inside the shadow root
    const sr = el.shadowRoot;
    if (!sr) return { err: 'no shadowRoot' };
    const foot = sr.querySelector('.wb-foot');
    if (!foot) return { err: 'no .wb-foot' };
    const cs = getComputedStyle(foot);
    const r = foot.getBoundingClientRect();
    return {
      innerHTML: foot.innerHTML,
      textLen: foot.textContent.trim().length,
      height: Math.round(r.height),
      paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom,
      borderLeft: cs.borderLeftWidth + ' ' + cs.borderLeftColor,
      background: cs.backgroundImage.slice(0, 40),
      display: cs.display,
    };
  });
  console.log('\n=== the .wb-foot box when foot === "" (all 38 generated topics) ===');
  console.log(JSON.stringify(footBox, null, 2));
  console.log('\npage errors: ' + (errs.length ? errs.join('\n') : 'none'));
  await b.close();
})();
