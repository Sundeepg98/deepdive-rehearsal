// fx-dropcount2.mjs -- PRECISE drop accounting. Compare, per authored item, what the .md
// contains against what parseMarkdown() returns. No heuristics on the emitted side: we call
// the real parser. An item is DROPPED if it is present in the source text and absent (or
// merged into a sibling field) in the parser's output.
import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const MD = 'D:/claude-workspace/deepdive-rehearsal/src/topics-md';
const ids = fs.readdirSync(MD).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''));

const T = {
  sysStages: [0, 0], sysPivA: [0, 0], drillTN: [0, 0],
  bankTask: [0, 0], bankModel: [0, 0], bankInt: [0, 0], cbModel: [0, 0],
};
const bump = (k, a, g) => { T[k][0] += a; T[k][1] += g; };

for (const id of ids) {
  const src = fs.readFileSync(path.join(MD, id + '.md'), 'utf8');
  const v = parseMarkdown(src, { index: 1, total: 46 }).views;

  const sec = (n) => {
    const m = new RegExp('^## ' + n + '\\s*$', 'mi').exec(src);
    if (!m) return '';
    const r = src.slice(m.index + m[0].length); const x = /^## /m.exec(r);
    return x ? r.slice(0, x.index) : r;
  };

  // --- SYSTEM: stage lines authored under the 1st ### (plain "Name: desc" lines) ---
  const sys = sec('System');
  const hs = [...sys.matchAll(/^### .*$/gm)];
  let aStages = 0;
  if (hs.length) {
    const body = sys.slice(hs[0].index + hs[0][0].length, hs[1] ? hs[1].index : sys.length);
    aStages = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && /: /.test(l)).length;
  }
  bump('sysStages', aStages, (v.sys.stages || []).length);

  // --- SYSTEM: pivot answers = the non-blank line directly after a "-> ..." line ---
  const aPivA = [...sys.matchAll(/^->[^\n]*\n(?=\S)/gm)].length;
  bump('sysPivA', aPivA, (v.sys.pivots || []).filter((p) => p.a && p.a.length).length);

  // --- DRILL: tier notes ---
  const dr = sec('Drill');
  const aTN = dr.split('\n').map((l) => l.trim()).filter((l) => /^(SDE2|SDE3|Staff|EXTEND|all)\s*\|/.test(l) && !l.startsWith('#')).length;
  bump('drillTN', aTN, Object.keys(v.drill.tierNotes || {}).length);

  // --- BANK: split the section into mock beats vs curveball beats, count fields per beat ---
  const bk = sec('Bank');
  let mode = 'mock';
  let aTask = 0, aModel = 0, aInt = 0, aCbModel = 0;
  for (const line of bk.split('\n')) {
    const l = line.trim();
    if (l.startsWith('### ')) {
      const h = l.slice(4);
      if (!h.includes(' | ')) { const lo = h.toLowerCase(); if (lo.includes('curveball')) mode = 'curve'; else if (lo.includes('frame')) mode = 'frames'; }
      continue;
    }
    if (mode === 'mock') {
      if (/^Task:/.test(l)) aTask++;
      if (/^Model:/.test(l)) aModel++;
      if (/^Int:/.test(l)) aInt++;
    } else if (mode === 'curve') {
      if (/^Model:/.test(l)) aCbModel++;
    }
  }
  const mb = v.bank.mockBeats || [], cb = v.bank.curveballs || [];
  bump('bankTask', aTask, mb.filter((b) => b.task).length);
  bump('bankModel', aModel, mb.filter((b) => b.model).length);
  bump('bankInt', aInt, mb.filter((b) => b.int).length);
  bump('cbModel', aCbModel, cb.filter((b) => b.model).length);
}

console.log('PRECISE AUTHORED -> PARSED ACCOUNTING (all 38 markdown topics)');
console.log('='.repeat(80));
console.log('FIELD'.padEnd(30) + 'AUTHORED'.padStart(9) + 'PARSED'.padStart(8) + 'LOST'.padStart(7) + '   VERDICT');
console.log('-'.repeat(80));
const LABEL = {
  sysStages: ['sys.stages[]', 'parser wants bullets (parse_md:203); doc shows plain lines (FORMAT:249)'],
  sysPivA: ['sys.pivots[].a', 'chip regex eats the answer line (parse_md:225)'],
  drillTN: ['drill.tierNotes{}', 'parser wants bullets (parse_md:342); doc shows plain lines (FORMAT:186)'],
  bankTask: ['bank.mockBeats[].task', 'lands, but as a 4-line blob'],
  bankModel: ['bank.mockBeats[].model', 'Task: swallows it (parse_md:431)'],
  bankInt: ['bank.mockBeats[].int', 'Task: swallows it (parse_md:431)'],
  cbModel: ['bank.curveballs[].model', 'CONTROL: Model: alone in its paragraph -> works'],
};
let lost = 0;
for (const k of Object.keys(T)) {
  const [a, g] = T[k]; const d = a - g; lost += Math.max(0, d);
  const [name, why] = LABEL[k];
  console.log(name.padEnd(30) + String(a).padStart(9) + String(g).padStart(8) + String(d).padStart(7) + '   ' + (d > 0 ? 'DROPPED -- ' + why : 'ok -- ' + why));
}
console.log('-'.repeat(80));
console.log('TOTAL AUTHORED ITEMS SILENTLY DISCARDED PER BUILD: ' + lost);
console.log('\n(bank.mockBeats[].int carries a q AND an a, so ' + T.bankInt[0] + ' Int: items = ' + (T.bankInt[0] * 2) + ' fields.)');
