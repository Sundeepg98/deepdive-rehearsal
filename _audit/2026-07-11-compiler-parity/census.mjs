// Census the 5 panes (wb, rf, trade, open, num) across the hand-coded 8 and the generated 38.
import fs from 'fs';
import path from 'path';
const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const THE8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];

function loadPane(dir, id, pane) {
  const p = path.join(ROOT, 'src/topics', dir, id, pane + '.js');
  if (!fs.existsSync(p)) return null;
  const src = fs.readFileSync(p, 'utf8');
  const m = src.match(/var\s+TOPIC_\w+\s*=\s*([\s\S]*);\s*$/);
  if (!m) return null;
  try { return (0, eval)('(' + m[1] + ')'); } catch (e) { return { __err: e.message }; }
}
const ids = [];
for (const id of THE8) ids.push(['', id, '8']);
for (const d of fs.readdirSync(path.join(ROOT, 'src/topics/_generated'))) ids.push(['_generated', d, '38']);

const rows = [];
for (const [dir, id, cohort] of ids) {
  const wb = loadPane(dir, id, 'wb'), rf = loadPane(dir, id, 'rf'), tr = loadPane(dir, id, 'trade'), op = loadPane(dir, id, 'open'), nu = loadPane(dir, id, 'num');
  const cards = op && op.cards ? op.cards : [];
  let numRows = 0, numOver = 0, numDyn = 0;
  if (nu && typeof nu.compute === 'function') {
    try {
      const vals = {}; (nu.inputs || []).forEach(i => vals[i.id] = i.value);
      const out = nu.compute(vals, { n: x => String(Math.round(x)), tb: x => x.toFixed(2) + ' TB' });
      numRows = out.length; numOver = out.filter(r => r.over).length;
      const vals2 = {}; (nu.inputs || []).forEach(i => vals2[i.id] = i.value * 2 + 1);
      const out2 = nu.compute(vals2, { n: x => String(Math.round(x)), tb: x => x.toFixed(2) + ' TB' });
      numDyn = out.filter((r, i) => out2[i] && String(out2[i].v) !== String(r.v)).length;
    } catch (e) { numRows = -99; }
  }
  rows.push({
    cohort, id,
    wb_steps: wb ? (wb.steps || []).length : -1,
    wb_foot: wb ? (wb.foot ? 1 : 0) : -1,
    wb_sub: wb ? (wb.sub ? 1 : 0) : -1,
    wb_okv: wb ? (wb.okVerdict ? 1 : 0) : -1,
    rf_flags: rf ? (rf.flags || []).length : -1,
    rf_note: rf ? (rf.flags || []).filter(f => f.note).length : -1,
    tr_dec: tr ? (tr.decisions || []).length : -1,
    tr_opts: tr ? (tr.decisions || []).reduce((a, d) => a + (d.opts || []).length, 0) : -1,
    tr_optmax: tr ? (tr.decisions || []).reduce((a, d) => Math.max(a, (d.opts || []).length), 0) : -1,
    tr_optbad: tr ? (tr.decisions || []).reduce((a, d) => a + (d.opts || []).filter(o => !o.when).length, 0) : -1,
    op_cards: cards.length,
    op_close: cards.filter(c => c.kind === 'close').length,
    op_items: cards.reduce((a, c) => a + (c.items || []).length, 0),
    op_hookit: cards.reduce((a, c) => a + ((c.hooks && c.hooks.items) || []).length, 0),
    op_foot: cards.filter(c => c.foot).length,
    num_inputs: nu ? (nu.inputs || []).length : -1,
    num_rows: numRows, num_over: numOver, num_dyn: numDyn,
  });
}
const hdr = Object.keys(rows[0]);
console.log(hdr.join('\t'));
for (const r of rows) console.log(hdr.map(k => r[k]).join('\t'));
const nums = (c, k) => rows.filter(r => r.cohort === c).map(r => r[k]);
const mean = (v) => (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
console.log('\n=== MEAN per topic  (THE8 = the spec) ===');
console.log('field'.padEnd(12) + 'THE8'.padStart(7) + 'THE38'.padStart(8) + '  ratio   min38..max38');
for (const k of hdr) {
  if (k === 'cohort' || k === 'id') continue;
  const a = nums('8', k), b = nums('38', k);
  const ma = +mean(a), mb = +mean(b);
  const ratio = ma === 0 ? '--' : (mb / ma * 100).toFixed(0) + '%';
  console.log(k.padEnd(12) + String(ma).padStart(7) + String(mb).padStart(8) + String(ratio).padStart(7) + '   ' + Math.min(...b) + '..' + Math.max(...b));
}
