// Resolve two discrepancies: (a) viz-tab owner, (b) opener .card/.op counts.
import { chromium } from 'playwright';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(800);

// ---- (a) VIZ TAB, with a REAL wait between switches ----
console.log('=== VIZ TAB (400ms settle per topic) ===');
const ids = await p.evaluate(() => TopicRegistry.ids());
const vis = [];
for (const id of ids) {
  await p.evaluate(i => TopicRegistry.setTopic(i), id);
  await p.waitForTimeout(400);                       // generous settle
  const st = await p.evaluate(() => {
    const btn = document.querySelector('.sidebar .seg button[data-tab="viz"]');
    return { hidden: btn ? btn.hidden : 'no-btn', hasVisual: !!TopicRegistry.current().data.visual, cur: TopicRegistry.current().id };
  });
  vis.push({ id, ...st });
}
const shown = vis.filter(v => v.hidden === false);
console.log('viz VISIBLE on:', shown.map(v => v.id));
console.log('viz hidden on :', vis.filter(v => v.hidden === true).length);
console.log('data.visual on:', vis.filter(v => v.hasVisual).map(v => v.id));
const mismatch = vis.filter(v => v.hasVisual !== (v.hidden === false));
console.log('rows where (viz visible) != (has data.visual):', mismatch.length, mismatch.map(m => m.id + ' hidden=' + m.hidden + ' hasVisual=' + m.hasVisual));

// ---- is the lag REAL? switch kafka -> stream and read IMMEDIATELY vs after settle ----
console.log('\n=== LAG PROBE (is the viz tab stale for a tick?) ===');
await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
await p.waitForTimeout(400);
let s = await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="viz"]').hidden);
console.log('at kafka-internals (settled)      : viz.hidden =', s);
await p.evaluate(() => TopicRegistry.setTopic('stream-batch-processing'));
const imm = await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="viz"]').hidden);
console.log('at stream-batch (IMMEDIATE, 0ms)  : viz.hidden =', imm, imm === false ? '  <-- STALE (still showing kafka state)' : '');
await p.waitForTimeout(400);
const set = await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="viz"]').hidden);
console.log('at stream-batch (settled 400ms)   : viz.hidden =', set);

// ---- (b) OPENER: count .card (real cards) AND .op (items) ----
console.log('\n=== OPENER PANE: .card vs .op ===');
for (const t of ['caching', 'content-pipeline', 'saga', 'authz']) {
  await p.evaluate(i => TopicRegistry.setTopic(i), t);
  await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="open"]').click());
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-opener').shadowRoot;
    const cards = [...sr.querySelectorAll('.card')];
    const cur = TopicRegistry.current();
    return {
      cardEls: cards.length,
      opEls: sr.querySelectorAll('.op').length,
      dataCards: cur.data.open.cards.length,
      kinds: cur.data.open.cards.map(c => c.kind),
      itemsPerCard: cur.data.open.cards.map(c => c.items.length),
      headings: cards.map(c => (c.querySelector('.step-k')?.textContent || '') + ' / ' + (c.querySelector('.step-t')?.textContent || '')),
    };
  });
  console.log(`  ${t.padEnd(18)} .card=${r.cardEls}  .op=${r.opEls}  data.open.cards=${r.dataCards} kinds=[${r.kinds}] itemsPerCard=[${r.itemsPerCard}]`);
  console.log(`  ${''.padEnd(18)} card headings: ${JSON.stringify(r.headings)}`);
  await p.screenshot({ path: `${OUT}/shots/verify-inv-topics/openpane-${t}.png`, fullPage: true });
}

// ---- nav label for the open pane ----
const navLabel = await p.evaluate(() => {
  const btn = document.querySelector('.sidebar .seg button[data-tab="open"]');
  return btn ? btn.textContent.trim() : null;
});
console.log('\nopen-pane nav button label:', JSON.stringify(navLabel));

await b.close();
