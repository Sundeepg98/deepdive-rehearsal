// Is the 38's NALSD pane a real calculator, or prose wearing a calculator's clothes?
// For each topic: perturb every input and see which metric rows actually move, and whether
// every input the pane RENDERS as a draggable field is even READ by compute().
import fs from 'fs';
import path from 'path';
const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const THE8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];

function load(dir, id) {
  const p = path.join(ROOT, 'src/topics', dir, id, 'num.js');
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, 'utf8').match(/var\s+TOPIC_\w+\s*=\s*([\s\S]*);\s*$/);
  try { return (0, eval)('(' + m[1] + ')'); } catch (e) { return null; }
}
const fmt = { n: x => (isFinite(x) ? Math.round(x) : 0).toLocaleString('en-US'), tb: x => (isFinite(x) ? x : 0).toFixed(2) + ' TB' };

const ids = THE8.map(id => ['', id, '8'])
  .concat(fs.readdirSync(path.join(ROOT, 'src/topics/_generated'), { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => ['_generated', d.name, '38']));

const out = [];
for (const [dir, id, cohort] of ids) {
  const d = load(dir, id);
  if (!d || typeof d.compute !== 'function') continue;
  const base = {}; d.inputs.forEach(i => base[i.id] = i.value);
  const rows0 = d.compute(base, fmt);

  // 1) which ROWS are static (value identical under a large perturbation of ALL inputs)?
  const big = {}; d.inputs.forEach(i => big[i.id] = (i.value || 1) * 7 + 3);
  const rowsBig = d.compute(big, fmt);
  const staticRows = rows0.filter((r, i) => rowsBig[i] && String(rowsBig[i].v) === String(r.v));

  // 2) which INPUTS are dead (perturbing that ONE input changes NOTHING the user sees)?
  const dead = [];
  for (const inp of d.inputs) {
    const v = { ...base }; v[inp.id] = (inp.value || 1) * 7 + 3;
    const rr = d.compute(v, fmt);
    // compare EVERY rendered field (num/logic.js:123 paints k, v, u, n and the `over` class)
    const moved = rr.some((r, i) => ['k', 'v', 'u', 'n'].some(f => String(r[f]) !== String(rows0[i][f])) || !!r.over !== !!rows0[i].over);
    if (!moved) dead.push(inp.id);
  }

  // 3) `over` ceilings: is any row's `over` a computed predicate, or hardcoded false?
  const src = d.compute.toString();
  const overLiteralFalse = (src.match(/over:\s*false/g) || []).length;
  const overComputed = (src.match(/over:\s*[^f]/g) || []).length;

  out.push({
    cohort, id,
    inputs: d.inputs.length,
    rows: rows0.length,
    staticRows: staticRows.length,
    liveRows: rows0.length - staticRows.length,
    deadInputs: dead.length,
    deadIds: dead.join(','),
    overFalse: overLiteralFalse,
    overComputed,
  });
}
const cols = ['cohort', 'id', 'inputs', 'rows', 'liveRows', 'staticRows', 'deadInputs', 'deadIds', 'overComputed', 'overFalse'];
console.log(cols.join('\t'));
for (const r of out) console.log(cols.map(c => r[c]).join('\t'));

const grp = c => out.filter(r => r.cohort === c);
const sum = (a, k) => a.reduce((s, r) => s + r[k], 0);
console.log('\n=== TOTALS ===');
for (const c of ['8', '38']) {
  const g = grp(c);
  console.log('THE ' + c + ' (' + g.length + ' topics)');
  console.log('   metric rows total      : ' + sum(g, 'rows'));
  console.log('   LIVE rows (move w/ input): ' + sum(g, 'liveRows') + '  (' + (sum(g, 'liveRows') / sum(g, 'rows') * 100).toFixed(0) + '% of rows)');
  console.log('   STATIC rows (hardcoded): ' + sum(g, 'staticRows') + '  (' + (sum(g, 'staticRows') / sum(g, 'rows') * 100).toFixed(0) + '% of rows)');
  console.log('   DEAD inputs (slider does nothing): ' + sum(g, 'deadInputs') + ' / ' + sum(g, 'inputs') + ' inputs');
  console.log('   computed `over` ceilings: ' + sum(g, 'overComputed') + '   hardcoded over:false: ' + sum(g, 'overFalse'));
}
const deadTopics = grp('38').filter(r => r.deadInputs > 0);
console.log('\n38-topics shipping a DEAD input field: ' + deadTopics.length);
deadTopics.forEach(r => console.log('   ' + r.id + ' -> dead: ' + r.deadIds));
