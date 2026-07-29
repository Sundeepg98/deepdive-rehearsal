/* PROBE ONLY -- finds the F6 class: a CLEARED field yielding a confident NEGATIVE figure.
 * Mirrors numbers_lattice's loader; writes nothing. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.argv[2];
const TOPICS = path.join(ROOT, 'src/topics');
const GENERATED = path.join(TOPICS, '_generated');

function fmtN(x) { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); }
function fmtTB(tb) {
  if (!isFinite(tb)) tb = 0;
  if (tb >= 1) return (Math.round(tb * 10) / 10).toLocaleString('en-US') + ' TB';
  return Math.round(tb * 1000).toLocaleString('en-US') + ' GB';
}
const FMT = { n: fmtN, tb: fmtTB };

function loadSlice(file) {
  const ctx = Object.create(null);
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), ctx, { timeout: 10000 });
  const key = Object.keys(ctx).find((k) => /_NUM$/.test(k));
  return key ? ctx[key] : null;
}
function discover() {
  const out = [];
  for (const d of fs.readdirSync(TOPICS, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name === '_generated') continue;
    const f = path.join(TOPICS, d.name, 'num.js');
    if (fs.existsSync(f)) out.push({ id: d.name, file: f, origin: 'hand' });
  }
  if (fs.existsSync(GENERATED)) {
    for (const d of fs.readdirSync(GENERATED, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const f = path.join(GENERATED, d.name, 'num.js');
      if (fs.existsSync(f)) out.push({ id: d.name, file: f, origin: 'compiled' });
    }
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/* a rendered value is "negative" if a minus sign immediately precedes a digit */
const NEG = /-\s*[\d.]/;

const hits = [];
for (const t of discover()) {
  const N = loadSlice(t.file);
  if (!N || typeof N.compute !== 'function' || !Array.isArray(N.inputs)) continue;
  const base = {};
  for (const i of N.inputs) base[i.id] = i.value;

  // baseline: defaults must be clean
  let baseRows = [];
  try { baseRows = N.compute({ ...base }, FMT) || []; } catch (e) { continue; }
  const baseNeg = new Set(baseRows.filter((r) => NEG.test(String(r.v))).map((r) => r.k));

  for (const inp of N.inputs) {
    const vals = { ...base, [inp.id]: 0 };          // the user cleared this field
    let rows;
    try { rows = N.compute(vals, FMT) || []; } catch (e) { continue; }
    for (const r of rows) {
      const v = String(r.v);
      if (NEG.test(v) && !baseNeg.has(r.k)) {
        hits.push({ topic: t.id, cleared: inp.id, label: inp.label, row: r.k, v, u: String(r.u || '') });
      }
    }
  }
}

const byTopic = {};
for (const h of hits) (byTopic[h.topic] ||= []).push(h);
console.log('=== NEGATIVE-ON-CLEARED ROWS ===');
let n = 0;
for (const topic of Object.keys(byTopic).sort()) {
  const uniq = new Map();
  for (const h of byTopic[topic]) {
    const key = h.row + '|' + h.v;
    if (!uniq.has(key)) uniq.set(key, h);
  }
  console.log('\n' + topic + '  (' + uniq.size + ' distinct row/value)');
  for (const h of uniq.values()) {
    n++;
    console.log('   clear ' + h.cleared.padEnd(12) + ' -> "' + h.row + '" = ' + h.v + ' ' + h.u);
  }
}
console.log('\nTOTAL distinct rows: ' + n + '  (raw hits ' + hits.length + ')');
