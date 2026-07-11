#!/usr/bin/env node
/*
 * measure_parity.mjs -- the BEFORE / AFTER / SPEC table.
 *
 * Three bodies of evidence, measured with ONE counter:
 *   BEFORE  the shipping parser as of master (tools/compiler/parse_md.BEFORE.mjs, git-extracted)
 *   AFTER   the fixed parser (tools/compiler/parse_md.mjs)
 *   THE 8   the hand-coded JS data modules in src/topics/<id>/ -- they never touch the compiler,
 *           so they ARE the spec for what a full-depth topic contains.
 *
 * Run from the repo root:  node _audit/2026-07-11-compiler-parity/measure_parity.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

// Self-extract the BEFORE parser from git so this is reproducible from a clean tree. It must land
// inside tools/compiler/ for its relative imports (./prose.mjs, ./flow.mjs, ...) to resolve.
// execFileSync + an argument array: no shell, so BASE_REF cannot inject a command.
const BEFORE_PATH = 'tools/compiler/parse_md.BEFORE.mjs';
const BASE = process.env.BASE_REF || 'master';
fs.writeFileSync(BEFORE_PATH, execFileSync('git', ['show', BASE + ':tools/compiler/parse_md.mjs'], { encoding: 'utf8' }));
process.on('exit', () => { try { fs.unlinkSync(BEFORE_PATH); } catch { /* already gone */ } });

const { parseMarkdown: before } = await import('../../tools/compiler/parse_md.BEFORE.mjs');
const { parseMarkdown: after } = await import('../../tools/compiler/parse_md.mjs');

const MD = 'src/topics-md';
const THE_8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];
const MODS = ['identity', 'walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'bank', 'register'];

// ONE counter, applied to all three. Anything else is not a comparison.
const len = (x) => (Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : 0);
const full = (s) => !!(s && String(s).trim());
const sum = (a, f) => (a || []).reduce((n, x) => n + f(x), 0);
const cnt = (a, f) => (a || []).filter(f).length;

const PROBES = {
  'walk.steps':        (d) => len(d.walk && d.walk.steps),
  'walk.codeBlocks':   (d) => sum(d.walk && d.walk.steps, (s) => (s.code || s.shiki ? 1 : 0) + len(s.blocks)),
  'walk.modelScript':  (d) => len(d.walk && d.walk.modelScript),
  'drill.cards':       (d) => len(d.drill && d.drill.cards),
  'drill.follows':     (d) => sum(d.drill && d.drill.cards, (c) => len(c.f)),
  'drill.senior':      (d) => cnt(d.drill && d.drill.cards, (c) => full(c.senior)),
  'drill.speak':       (d) => cnt(d.drill && d.drill.speak, full),
  'drill.tierNotes':   (d) => len(d.drill && d.drill.tierNotes),
  'sys.stages':        (d) => len(d.sys && d.sys.stages),
  'sys.stageCur':      (d) => cnt(d.sys && d.sys.stages, (s) => s.cur),
  'sys.pivots':        (d) => len(d.sys && d.sys.pivots),
  'sys.pivotAnswers':  (d) => cnt(d.sys && d.sys.pivots, (p) => full(p.a)),
  'wb.steps':          (d) => len(d.wb && d.wb.steps),
  'trade.decisions':   (d) => len(d.trade && d.trade.decisions),
  'trade.options':     (d) => sum(d.trade && d.trade.decisions, (x) => len(x.opts)),
  'model.answers':     (d) => len(d.model && d.model.answers),
  'model.beats':       (d) => sum(d.model && d.model.answers, (a) => len(a.beats)),
  'rf.flags':          (d) => len(d.rf && d.rf.flags),
  'num.inputs':        (d) => len(d.num && d.num.inputs),
  'open.cards':        (d) => len(d.open && d.open.cards),
  'open.items':        (d) => sum(d.open && d.open.cards, (c) => len(c.items)),
  'bank.mockBeats':    (d) => len(d.bank && d.bank.mockBeats),
  'bank.beatModels':   (d) => cnt(d.bank && d.bank.mockBeats, (b) => full(b.model)),
  'bank.beatInts':     (d) => cnt(d.bank && d.bank.mockBeats, (b) => b.int && full(b.int.q)),
  'bank.curveballs':   (d) => len(d.bank && d.bank.curveballs),
  'bank.curveThemes':  (d) => cnt(d.bank && d.bank.curveballs, (c) => full(c.theme) && c.theme !== 'CURVEBALL'),
  'identity.cmpNotes': (d, i) => len(i && i.cmpNotes),
};
const FIELDS = Object.keys(PROBES);

// ---- THE 8: eval the hand-coded modules exactly as the browser would ----------------------
function load8(id) {
  const ctx = { TopicRegistry: { register(o) { ctx.__reg = o; } } };
  vm.createContext(ctx);
  for (const f of MODS) {
    const p = `src/topics/${id}/${f}.js`;
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
  }
  return { data: ctx.__reg.data, identity: ctx.__reg.identity };
}

const files = fs.readdirSync(MD).filter((f) => f.endsWith('.md')).sort();
const acc = { BEFORE: {}, AFTER: {}, SPEC: {} };
FIELDS.forEach((f) => { acc.BEFORE[f] = 0; acc.AFTER[f] = 0; acc.SPEC[f] = 0; });

// A parser that THROWS on a topic contributes nothing -- record it rather than crash.
const errs = { BEFORE: 0, AFTER: 0 };
for (const f of files) {
  const src = fs.readFileSync(`${MD}/${f}`, 'utf8');
  for (const [tag, fn] of [['BEFORE', before], ['AFTER', after]]) {
    try {
      const p = fn(src, { index: 1, total: files.length });
      FIELDS.forEach((k) => { acc[tag][k] += PROBES[k](p.views, p.identity); });
    } catch (e) { errs[tag]++; console.error(tag + ' THREW on ' + f + ': ' + e.message.split('\n')[0]); }
  }
}
for (const id of THE_8) {
  const { data, identity } = load8(id);
  FIELDS.forEach((k) => { acc.SPEC[k] += PROBES[k](data, identity); });
}

const N38 = files.length, N8 = THE_8.length;
const pad = (s, w) => String(s).padEnd(w);
const padL = (s, w) => String(s).padStart(w);

console.log('COMPILER PARITY -- per-topic averages. THE 8 (hand-coded JS) are the spec.\n');
console.log('  ' + pad('collection', 20) + padL('the 8', 8) + padL('38 BEFORE', 11) + padL('38 AFTER', 10)
  + padL('was', 7) + padL('now', 7) + '   delta');
console.log('  ' + '-'.repeat(78));

let wB = 0, wA = 0, n = 0, recovered = 0;
for (const k of FIELDS) {
  const s = acc.SPEC[k] / N8, b = acc.BEFORE[k] / N38, a = acc.AFTER[k] / N38;
  const pB = s ? Math.min(1, b / s) : null;
  const pA = s ? Math.min(1, a / s) : null;
  if (pB !== null) { wB += pB; wA += pA; n++; }
  const gained = acc.AFTER[k] - acc.BEFORE[k];
  if (gained > 0) recovered += gained;
  console.log('  ' + pad(k, 20) + padL(s.toFixed(1), 8) + padL(b.toFixed(1), 11) + padL(a.toFixed(1), 10)
    + padL(pB === null ? '-' : Math.round(pB * 100) + '%', 7)
    + padL(pA === null ? '-' : Math.round(pA * 100) + '%', 7)
    + '   ' + (gained > 0 ? '+' + gained + ' recovered' : gained < 0 ? String(gained) + ' LOST' : ''));
}
console.log('  ' + '-'.repeat(78));
console.log('  ' + pad('OVERALL DEPTH', 20) + padL('100%', 8) + padL(Math.round((wB / n) * 100) + '%', 11)
  + padL(Math.round((wA / n) * 100) + '%', 10));
console.log('\n  TOTAL ITEMS RECOVERED ACROSS THE 38: ' + recovered);
if (errs.BEFORE || errs.AFTER) console.log('  parse errors -- BEFORE: ' + errs.BEFORE + ', AFTER: ' + errs.AFTER);
