// fx-keyset.mjs -- FORMAT PARITY lens: enumerate EVERY key path in the hand-coded 8's JS
// data vs EVERY key path the compiler can emit for the 38. The diff IS the ceiling map.
// Run: node _audit/2026-07-11-compiler-parity/fx-keyset.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const HAND = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];
const PANES = ['identity', 'walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'bank', 'visual'];

// Load a topic's slices by evaluating the var declarations in a sandbox.
function loadTopic(dir) {
  const ctx = { TopicRegistry: { register(o) { ctx.__reg = o; } } };
  vm.createContext(ctx);
  for (const p of PANES.concat('register')) {
    const f = path.join(dir, p + '.js');
    if (!fs.existsSync(f)) continue;
    try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx); } catch (e) { console.error('EVAL FAIL', f, e.message); }
  }
  return ctx.__reg ? { identity: ctx.__reg.identity, ...ctx.__reg.data } : null;
}

// Recursive key-path census. Arrays collapse to [] so we census the ELEMENT shape.
// Records per path: how many topics have it, how many times it appears, sample value.
function census(node, prefix, acc, topic) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    acc.arr[prefix] = acc.arr[prefix] || {};
    acc.arr[prefix][topic] = (acc.arr[prefix][topic] || 0) + node.length;
    for (const el of node) census(el, prefix + '[]', acc, topic);
    return;
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) {
      const p = prefix ? prefix + '.' + k : k;
      acc.keys[p] = acc.keys[p] || { topics: new Set(), sample: undefined, types: new Set() };
      acc.keys[p].topics.add(topic);
      acc.keys[p].types.add(Array.isArray(node[k]) ? 'array' : typeof node[k]);
      if (acc.keys[p].sample === undefined && typeof node[k] !== 'object') acc.keys[p].sample = String(node[k]).slice(0, 70);
      census(node[k], p, acc, topic);
    }
    return;
  }
}

function run(list, base) {
  const acc = { keys: {}, arr: {} };
  const loaded = {};
  for (const id of list) {
    const t = loadTopic(path.join(base, id));
    if (!t) { console.error('NO REGISTER', id); continue; }
    loaded[id] = t;
    for (const pane of Object.keys(t)) census(t[pane], pane, acc, id);
  }
  return { acc, loaded };
}

const H = run(HAND, path.join(ROOT, 'src/topics'));
const GENIDS = fs.readdirSync(path.join(ROOT, 'src/topics/_generated')).filter((f) => fs.statSync(path.join(ROOT, 'src/topics/_generated', f)).isDirectory());
const G = run(GENIDS, path.join(ROOT, 'src/topics/_generated'));

console.log('HAND topics loaded:', Object.keys(H.loaded).length, '| GEN topics loaded:', Object.keys(G.loaded).length);
console.log('\n================ KEY-PATH CEILING MAP ================');
console.log('KEY PATH'.padEnd(34), 'HAND(8)'.padEnd(9), 'GEN(38)'.padEnd(9), 'STATUS');
console.log('-'.repeat(84));
const all = [...new Set([...Object.keys(H.acc.keys), ...Object.keys(G.acc.keys)])].sort();
const gaps = [];
for (const p of all) {
  const h = H.acc.keys[p], g = G.acc.keys[p];
  const hn = h ? h.topics.size : 0, gn = g ? g.topics.size : 0;
  let status = 'ok';
  if (hn > 0 && gn === 0) { status = '*** MISSING IN GEN ***'; gaps.push(p); }
  else if (hn > 0 && gn < 8) status = 'thin in gen (' + gn + '/38)';
  else if (hn === 0 && gn > 0) status = 'gen-only';
  console.log(p.padEnd(34), String(hn + '/8').padEnd(9), String(gn + '/38').padEnd(9), status);
}

console.log('\n================ ARRAY POPULATION (avg items per topic) ================');
console.log('ARRAY PATH'.padEnd(34), 'HAND avg'.padEnd(11), 'GEN avg'.padEnd(11), 'GEN zeros');
console.log('-'.repeat(84));
const allArr = [...new Set([...Object.keys(H.acc.arr), ...Object.keys(G.acc.arr)])].sort();
for (const p of allArr) {
  const h = H.acc.arr[p] || {}, g = G.acc.arr[p] || {};
  const hv = Object.values(h), gv = Object.values(g);
  const havg = hv.length ? (hv.reduce((a, b) => a + b, 0) / HAND.length).toFixed(1) : '-';
  const gavg = gv.length ? (gv.reduce((a, b) => a + b, 0) / GENIDS.length).toFixed(1) : '-';
  const zeros = GENIDS.filter((id) => !g[id] || g[id] === 0).length;
  console.log(p.padEnd(34), String(havg).padEnd(11), String(gavg).padEnd(11), zeros + '/38 empty');
}
console.log('\nMISSING-IN-GEN key paths (the ceiling):', JSON.stringify(gaps, null, 1));
