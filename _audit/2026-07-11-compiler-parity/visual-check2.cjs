// Navigate the BUILT app to #<topic>/<view> and measure what each of the 5 lens panes
// actually paints for a hand-coded topic vs a generated one.
const { chromium } = require('playwright');
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const TAG = { wb: 'deep-whiteboard', rf: 'deep-red-flags', trade: 'deep-trade-offs', open: 'deep-opener', num: 'deep-numbers' };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));

  // discover the real custom-element tag names once
  await p.goto(URL);
  await p.waitForTimeout(800);
  const tags = await p.evaluate(() => [...new Set([...document.querySelectorAll('*')].map(e => e.tagName.toLowerCase()).filter(t => t.startsWith('deep-')))]);
  console.log('custom elements present: ' + tags.join(', ') + '\n');

  const measure = async (topic, view, tag) => {
    await p.goto(URL + '#' + topic + '/' + view);
    await p.waitForTimeout(700);
    return await p.evaluate((tag) => {
      const el = document.querySelector(tag);
      if (!el || !el.shadowRoot) return { err: 'no ' + tag };
      const sr = el.shadowRoot;
      const q = (s) => sr.querySelector(s);
      const box = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { text: e.textContent.trim().length, h: Math.round(r.height), pad: cs.paddingTop, bl: cs.borderLeftWidth, disp: cs.display }; };
      return {
        wbCues: sr.querySelectorAll('.wb li').length,
        wbFoot: box('.wb-foot'),
        rfCards: sr.querySelectorAll('.rf').length,
        tradeDecs: sr.querySelectorAll('.dec').length,
        opCards: sr.querySelectorAll('.op').length,
        numRows: sr.querySelectorAll('.nrow').length,
        numInputs: sr.querySelectorAll('.ninp input').length,
      };
    }, tag);
  };

  for (const [topic, label] of [['content-pipeline', 'HAND-CODED'], ['idempotency', 'GENERATED']]) {
    console.log('=========== ' + topic + '  (' + label + ') ===========');
    const wb = await measure(topic, 'wb', 'deep-whiteboard');
    console.log('  wb   cues rendered : ' + wb.wbCues);
    console.log('  wb   .wb-foot box  : ' + JSON.stringify(wb.wbFoot));
    const rf = await measure(topic, 'rf', 'deep-red-flags');
    console.log('  rf   flag cards    : ' + rf.rfCards);
    const tr = await measure(topic, 'trade', 'deep-trade-offs');
    console.log('  trade decisions    : ' + tr.tradeDecs);
    const op = await measure(topic, 'open', 'deep-opener');
    console.log('  open cards         : ' + op.opCards);
    const nu = await measure(topic, 'num', 'deep-numbers');
    console.log('  num  inputs / rows : ' + nu.numInputs + ' / ' + nu.numRows);
    console.log('');
  }

  // screenshot the two whiteboards side by side for the record
  for (const t of ['content-pipeline', 'idempotency']) {
    await p.goto(URL + '#' + t + '/wb');
    await p.waitForTimeout(700);
    await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-compiler-parity/wb-' + t + '.png', fullPage: false });
  }
  console.log('page errors: ' + (errs.length ? errs.join('\n') : 'none'));
  await b.close();
})();
