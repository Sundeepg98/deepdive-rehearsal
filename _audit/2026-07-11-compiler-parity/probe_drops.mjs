// Probe: run the REAL parser over the REAL 38 and count population per slice.
// Then count what the MARKDOWN SOURCE authored, to prove DROPPED vs MISSING.
import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const DIR = 'src/topics-md';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md'));

let T = { sysStages: 0, tierNotes: 0, pivots: 0, pivotsWithAns: 0, pivotChipBloat: 0,
          modelAnswers: 0, modelBeats: 0, mockBeats: 0, curveballs: 0, cmpNotes: 0,
          drillCards: 0, follows: 0, wbSteps: 0, numInputs: 0, tradeDecisions: 0, rfFlags: 0 };
// what the SOURCE authored (regex over raw md)
let S = { sysStageLines: 0, tierNoteLines: 0, pivotHeads: 0, cmpNoteHeads: 0 };

const per = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const out = parseMarkdown(src, { index: 1, total: 38 });
  const v = out.views;

  // ---- SOURCE side: count authored items in the markdown itself ----
  // System stage lines: plain lines "Name: desc" between "### <whereHead>" and the next "###"
  const sysBlock = (src.match(/^## System\b[\s\S]*?(?=^## |\Z)/m) || [''])[0];
  const whereBlock = (sysBlock.match(/^### .*\n([\s\S]*?)(?=^### |\Z)/m) || ['', ''])[1] || '';
  const sysStageLines = whereBlock.split('\n').filter(l => /^[^\s#>-].*: /.test(l.trim()) || /^[A-Z].*: /.test(l.trim())).filter(Boolean).length;
  S.sysStageLines += sysStageLines;
  S.pivotHeads += (sysBlock.match(/^#### /gm) || []).length;

  // Drill tier-note lines: plain "TIER | note" lines between "## Drill" and the first "###"
  const drillBlock = (src.match(/^## Drill\b[\s\S]*?(?=^### |\Z)/m) || [''])[0];
  const tierNoteLines = drillBlock.split('\n').filter(l => /^(SDE2|SDE3|Staff|EXTEND)\s*\|/.test(l.trim())).length;
  S.tierNoteLines += tierNoteLines;

  const cmpBlock = (src.match(/^## Companion Notes\b[\s\S]*?(?=^## |\Z)/m) || [''])[0];
  S.cmpNoteHeads += (cmpBlock.match(/^### /gm) || []).length;

  // ---- PARSED side ----
  const sys = v.sys || {}, drill = v.drill || {}, model = v.model || {}, bank = v.bank || {};
  const pivots = sys.pivots || [];
  const withAns = pivots.filter(p => p.a && p.a.length).length;
  // chip bloat = the chip swallowed the answer (chip contains a newline or is absurdly long)
  const bloat = pivots.filter(p => /\n/.test(p.chip || '') || (p.chip || '').length > 120).length;

  T.sysStages += (sys.stages || []).length;
  T.pivots += pivots.length;
  T.pivotsWithAns += withAns;
  T.pivotChipBloat += bloat;
  T.tierNotes += Object.keys(drill.tierNotes || {}).length;
  T.drillCards += (drill.cards || []).length;
  T.follows += (drill.cards || []).reduce((n, c) => n + (c.f || []).length, 0);
  T.modelAnswers += (model.answers || []).length;
  T.modelBeats += (model.answers || []).reduce((n, a) => n + (a.beats || []).length, 0);
  T.mockBeats += (bank.mockBeats || []).length;
  T.curveballs += (bank.curveballs || []).length;
  T.cmpNotes += Object.keys(out.identity.cmpNotes || {}).length;
  T.wbSteps += ((v.wb || {}).steps || []).length;
  T.numInputs += ((v.num || {}).inputs || []).length;
  T.tradeDecisions += ((v.trade || {}).decisions || []).length;
  T.rfFlags += ((v.rf || {}).flags || []).length;

  per.push({ f, sysStagesSrc: sysStageLines, sysStagesParsed: (sys.stages || []).length,
             tierSrc: tierNoteLines, tierParsed: Object.keys(drill.tierNotes || {}).length,
             pivots: pivots.length, pivotsWithAns: withAns, chipBloat: bloat,
             cmpSrc: (cmpBlock.match(/^### /gm) || []).length, cmpParsed: Object.keys(out.identity.cmpNotes || {}).length });
}

console.log('=== ACROSS ALL 38 (real parser, real markdown) ===');
console.log('SOURCE authored -> PARSER emitted   (delta = SILENTLY DROPPED)');
console.log('  system-map stages :  %d authored -> %d parsed   DROPPED %d', S.sysStageLines, T.sysStages, S.sysStageLines - T.sysStages);
console.log('  drill tier-notes  :  %d authored -> %d parsed   DROPPED %d', S.tierNoteLines, T.tierNotes, S.tierNoteLines - T.tierNotes);
console.log('  sys pivots        :  %d authored -> %d parsed', S.pivotHeads, T.pivots);
console.log('     ...with an answer (.a non-empty): %d   => %d pivots LOST their answer', T.pivotsWithAns, T.pivots - T.pivotsWithAns);
console.log('     ...chip swallowed the answer (bloat): %d', T.pivotChipBloat);
console.log('  companion notes   :  %d authored -> %d parsed   DROPPED %d', S.cmpNoteHeads, T.cmpNotes, S.cmpNoteHeads - T.cmpNotes);
console.log('');
console.log('=== POPULATION THE GATE NEVER COUNTS ===');
console.log('  drill.cards      %d  (avg %s)  <-- the ONLY thing topic_contract counts', T.drillCards, (T.drillCards / 38).toFixed(1));
console.log('  drill follow-ups %d  (avg %s)', T.follows, (T.follows / 38).toFixed(1));
console.log('  model.answers    %d  (avg %s)', T.modelAnswers, (T.modelAnswers / 38).toFixed(1));
console.log('  model beats      %d  (avg %s)', T.modelBeats, (T.modelBeats / 38).toFixed(1));
console.log('  bank.mockBeats   %d  (avg %s)', T.mockBeats, (T.mockBeats / 38).toFixed(1));
console.log('  bank.curveballs  %d  (avg %s)', T.curveballs, (T.curveballs / 38).toFixed(1));
console.log('  sys.stages       %d  (avg %s)', T.sysStages, (T.sysStages / 38).toFixed(1));
console.log('  wb.steps         %d  (avg %s)', T.wbSteps, (T.wbSteps / 38).toFixed(1));
console.log('');
console.log('=== TOPICS WHERE PARSED < AUTHORED (first 6) ===');
per.filter(p => p.sysStagesParsed < p.sysStagesSrc || p.tierParsed < p.tierSrc || p.cmpParsed < p.cmpSrc)
   .slice(0, 6)
   .forEach(p => console.log('  %-28s sys %d->%d | tier %d->%d | cmp %d->%d | pivots %d (ans %d, bloat %d)',
     p.f, p.sysStagesSrc, p.sysStagesParsed, p.tierSrc, p.tierParsed, p.cmpSrc, p.cmpParsed, p.pivots, p.pivotsWithAns, p.chipBloat));
console.log('\n  (%d of 38 topics lose content)', per.filter(p => p.sysStagesParsed < p.sysStagesSrc || p.tierParsed < p.tierSrc).length);
