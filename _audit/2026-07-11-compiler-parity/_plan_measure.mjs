// Definitive, de-duplicated recovery count: CURRENT parser vs PARITY parser over all 38 .md.
// Run from repo root:  node _audit/2026-07-11-compiler-parity/_plan_measure.mjs
import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdown as CUR } from '../../tools/compiler/parse_md.mjs';
import { parseMarkdown as FIX } from './parse_md.PARITY.mjs';

const DIR = 'src/topics-md';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

const M = (parse) => {
  const c = {
    'sys.stages': 0, 'sys.stages[].cur': 0, 'sys.pivots': 0, 'sys.pivots[].a': 0,
    'sys.chip_multiline': 0, 'drill.tierNotes(keys)': 0, 'drill.tierNotes.all': 0,
    'bank.mockBeats': 0, 'bank.mockBeats[].task': 0, 'bank.mockBeats[].model': 0,
    'bank.mockBeats[].int': 0, 'bank.mockBeats[].int2': 0,
    'bank.curveballs': 0, 'bank.curveballs[].realTheme': 0, 'bank.curveballs[].model': 0,
    'bank.frames': 0,
    // controls (must not move)
    'drill.cards': 0, 'drill.cards[].f': 0, 'drill.cards[].senior': 0, 'drill.speak': 0,
    'walk.steps': 0, 'model.answers': 0, 'model.beats': 0, 'rf.flags': 0,
    'trade.decisions': 0, 'wb.steps': 0, 'open.cards': 0, 'num.inputs': 0,
    'identity.cmpNotes': 0,
  };
  const errs = [];
  for (const f of files) {
    let t;
    try { t = parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
    catch (e) { errs.push(f + ': ' + e.message); continue; }
    const v = t.views;
    c['sys.stages'] += v.sys.stages.length;
    c['sys.stages[].cur'] += v.sys.stages.filter((s) => s.cur).length;
    c['sys.pivots'] += v.sys.pivots.length;
    c['sys.pivots[].a'] += v.sys.pivots.filter((p) => p.a && p.a.trim()).length;
    c['sys.chip_multiline'] += v.sys.pivots.filter((p) => /\n/.test(p.chip || '')).length;
    c['drill.tierNotes(keys)'] += Object.keys(v.drill.tierNotes).length;
    c['drill.tierNotes.all'] += v.drill.tierNotes.all ? 1 : 0;
    c['bank.mockBeats'] += v.bank.mockBeats.length;
    c['bank.mockBeats[].task'] += v.bank.mockBeats.filter((b) => b.task).length;
    c['bank.mockBeats[].model'] += v.bank.mockBeats.filter((b) => b.model).length;
    c['bank.mockBeats[].int'] += v.bank.mockBeats.filter((b) => b.int && b.int.q).length;
    c['bank.mockBeats[].int2'] += v.bank.mockBeats.filter((b) => b.int2 && b.int2.q).length;
    c['bank.curveballs'] += v.bank.curveballs.length;
    c['bank.curveballs[].realTheme'] += v.bank.curveballs.filter((x) => x.theme && x.theme.toUpperCase() !== 'CURVEBALL').length;
    c['bank.curveballs[].model'] += v.bank.curveballs.filter((x) => x.model).length;
    c['bank.frames'] += v.bank.frames.length;
    c['drill.cards'] += v.drill.cards.length;
    c['drill.cards[].f'] += v.drill.cards.reduce((n, x) => n + x.f.length, 0);
    c['drill.cards[].senior'] += v.drill.cards.filter((x) => x.senior).length;
    c['drill.speak'] += v.drill.speak.filter(Boolean).length;
    c['walk.steps'] += v.walk.steps.length;
    c['model.answers'] += v.model.answers.length;
    c['model.beats'] += v.model.answers.reduce((n, a) => n + a.beats.length, 0);
    c['rf.flags'] += v.rf.flags.length;
    c['trade.decisions'] += v.trade.decisions.length;
    c['wb.steps'] += v.wb.steps.length;
    c['open.cards'] += v.open.cards.length;
    c['num.inputs'] += v.num.inputs.length;
    c['identity.cmpNotes'] += Object.keys(t.identity.cmpNotes).length;
  }
  return { c, errs };
};

const a = M(CUR), b = M(FIX);
if (a.errs.length) console.log('CURRENT parse errors:', a.errs);
if (b.errs.length) console.log('PARITY  parse errors:', b.errs);

console.log('FIELD'.padEnd(26), 'CURRENT'.padStart(8), 'PARITY'.padStart(8), 'DELTA'.padStart(8));
let recovered = 0;
for (const k of Object.keys(a.c)) {
  const d = b.c[k] - a.c[k];
  if (d > 0) recovered += d;
  console.log(k.padEnd(26), String(a.c[k]).padStart(8), String(b.c[k]).padStart(8), (d > 0 ? '+' + d : d === 0 ? '.' : String(d)).padStart(8));
}
console.log('\nTOTAL NET ITEMS RECOVERED (de-duplicated, counting cur/theme/chip-fix as items): ' + recovered);
