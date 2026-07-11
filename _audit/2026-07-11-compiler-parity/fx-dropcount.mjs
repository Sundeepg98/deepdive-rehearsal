// fx-dropcount.mjs -- count content that IS authored in the 38 .md files but never
// reaches the emitted modules. Proves DROPPED (parser bug) vs MISSING (authoring gap).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { validateTopic } from '../../tools/compiler/topic-schema.mjs';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const MD = path.join(ROOT, 'src/topics-md');
const GEN = path.join(ROOT, 'src/topics/_generated');
const ids = fs.readdirSync(MD).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''));

// --- section slicer: pull the raw text of a ## section from a .md ---
function section(src, name) {
  const re = new RegExp('^## ' + name + '\\s*$', 'mi');
  const m = re.exec(src);
  if (!m) return '';
  const rest = src.slice(m.index + m[0].length);
  const nxt = /^## /m.exec(rest);
  return nxt ? rest.slice(0, nxt.index) : rest;
}

let stages = 0, tierNotes = 0, pivAnswers = 0, bankModel = 0, bankInt = 0, bankIntA = 0;
let follows = 0, seniors = 0, speaks = 0, cmpPanes = 0, themes = 0;
const perTopic = [];

for (const id of ids) {
  const src = fs.readFileSync(path.join(MD, id + '.md'), 'utf8');

  // sys: stage lines = plain "X: y" lines under the FIRST ### of ## System, before the 2nd ###
  const sys = section(src, 'System');
  const h3s = [...sys.matchAll(/^### .*$/gm)];
  let st = 0;
  if (h3s.length >= 1) {
    const from = h3s[0].index + h3s[0][0].length;
    const to = h3s[1] ? h3s[1].index : sys.length;
    st = sys.slice(from, to).split('\n').filter((l) => /^[^\s#\->|].*: /.test(l.trim()) && l.trim()).length;
  }
  stages += st;
  // sys pivot answers = the line AFTER a "-> ..." line inside a #### block
  const pa = [...sys.matchAll(/^->[^\n]*\n([^\n\s][^\n]*)$/gm)].length;
  pivAnswers += pa;

  // drill tier notes = "TIER | note" lines that are NOT ### headings
  const dr = section(src, 'Drill');
  const tn = dr.split('\n').filter((l) => /^(SDE2|SDE3|Staff|EXTEND|all)\s*\|/.test(l.trim())).length;
  tierNotes += tn;
  follows += (dr.match(/^Follow:/gm) || []).length;
  seniors += (dr.match(/^Senior:/gm) || []).length;
  speaks += (dr.match(/^Speak:/gm) || []).length;

  // bank: Model:/Int: lines that sit INSIDE a mock beat (i.e. after a Task: in the same para)
  const bk = section(src, 'Bank');
  const bm = (bk.match(/^Model:/gm) || []).length;
  const bi = (bk.match(/^Int:/gm) || []).length;
  bankModel += bm; bankInt += bi;
  bankIntA += (bk.match(/^Int:[^\n]*\n([^\n\s][^\n]*)$/gm) || []).length;
  themes += [...bk.matchAll(/^### (?!CURVEBALL)[^|\n]+\|[^|\n]+\|/gm)].length;

  // companion notes panes authored
  const cn = section(src, 'Companion Notes');
  const cp = (cn.match(/^### /gm) || []).length;
  cmpPanes += cp;

  // what actually landed
  const ctx = {}; vm.createContext(ctx);
  for (const f of ['drill', 'bank', 'sys', 'identity']) {
    const p = path.join(GEN, id, f + '.js');
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
  }
  const P = 'TOPIC_' + parseMarkdown(src, { index: 1, total: 46 }).prefix;
  const gotStages = (ctx[P + '_SYS'] || {}).stages || [];
  const gotTN = Object.keys((ctx[P + '_DRILL'] || {}).tierNotes || {}).length;
  const gotModel = ((ctx[P + '_BANK'] || {}).mockBeats || []).filter((b) => b.model).length;
  perTopic.push({ id, authoredStages: st, gotStages: gotStages.length, authoredTN: tn, gotTN, authoredModel: bm, gotModel });
}

console.log('AUTHORED IN THE 38 .md  vs  EMITTED IN THE 38 MODULES');
console.log('='.repeat(78));
const rows = [
  ['sys stages (plain-line form)', stages, perTopic.reduce((a, b) => a + b.gotStages, 0), 'PARSER DROPS'],
  ['drill tierNotes (plain-line)', tierNotes, perTopic.reduce((a, b) => a + b.gotTN, 0), 'PARSER DROPS'],
  ['sys pivot answers (line 2)', pivAnswers, 0, 'PARSER MERGES into chip'],
  ['bank mockBeat Model:', bankModel, perTopic.reduce((a, b) => a + b.gotModel, 0), 'PARSER SWALLOWS into task'],
  ['bank mockBeat Int: (q)', bankInt, 0, 'PARSER SWALLOWS into task'],
  ['bank mockBeat Int: (answer)', bankIntA, 0, 'PARSER SWALLOWS into task'],
];
for (const [k, a, g, why] of rows) {
  console.log(k.padEnd(30), 'authored=' + String(a).padStart(4), ' emitted=' + String(g).padStart(4), ' ' + (a > g ? '<< ' + (a - g) + ' LOST -- ' + why : 'ok'));
}
const lost = rows.reduce((s, r) => s + (r[1] - r[2]), 0);
console.log('-'.repeat(78));
console.log('TOTAL AUTHORED ITEMS DISCARDED ON EVERY BUILD: ' + lost);

console.log('\nNOT AUTHORED AT ALL (format works, parser consumes it, nobody wrote it):');
console.log('  drill Follow: lines .......... ' + follows + '   (hand-8 avg 41.9 follow-ups/topic)');
console.log('  drill Senior: lines .......... ' + seniors);
console.log('  drill Speak:  lines .......... ' + speaks);
console.log('  bank beat themes (3-part ###)  ' + themes);
console.log('  Companion Notes panes ........ ' + cmpPanes + ' of ' + (ids.length * 9) + '  (only walk+drill authored)');

// --- does zod green-light a topic with EVERY dropped field empty? ---
console.log('\nZOD ON THE REAL (LOSSY) TOPICS:');
let pass = 0;
for (const id of ids) {
  const t = parseMarkdown(fs.readFileSync(path.join(MD, id + '.md'), 'utf8'), { index: 1, total: 46 });
  try { validateTopic(t, id); pass++; } catch (e) { console.log('  FAIL', id, e.message.split('\n')[1]); }
}
console.log('  ' + pass + '/' + ids.length + ' topics PASS zod validation WITH sys.stages=[] and every');
console.log('  drill.f=[], bank.model=undefined, 7/9 cmpNotes absent.');
console.log('  -> topic-schema.mjs:64-66 NEED_ARRAY asserts isArray(), never .length.');
