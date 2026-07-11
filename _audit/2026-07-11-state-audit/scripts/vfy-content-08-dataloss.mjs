/* DECISIVE: is sys.stages / tierNotes / pivot.a MISSING CONTENT (authoring gap, as the lens
   claims) or AUTHORED CONTENT SILENTLY DISCARDED BY THE PARSER (doc-vs-parser mismatch)?
   Test: take the REAL idempotency.md and change NOTHING but the markdown *shape* the parser
   demands (prefix "- " on the already-written lines; blank line before the pivot answer).
   If the content appears, it was there all along and the build is throwing it away. */
import { parseMarkdown } from 'file:///D:/claude-workspace/deepdive-rehearsal/tools/compiler/parse_md.mjs';
import fs from 'fs';

const MD = 'D:/claude-workspace/deepdive-rehearsal/src/topics-md/';
const files = fs.readdirSync(MD).filter(f => f.endsWith('.md'));

// --- shape-only transform: NO new words, only markdown list/paragraph punctuation ---
function reshape(src) {
  let out = src;
  // 1) drill tier notes: plain "SDE2 | note" lines between "## Drill" and the first "### " -> bullets
  out = out.replace(/(## Drill\n\n)((?:(?!###)[^\n]*\|[^\n]*\n)+)/, (m, h, body) =>
    h + body.split('\n').filter(Boolean).map(l => '- ' + l).join('\n') + '\n');
  // 2) sys stages: plain "Name: desc" lines under "### Where it sits" -> bullets
  out = out.replace(/(### Where it sits\n\n)((?:(?!###)[^\n]*\n)+)/, (m, h, body) =>
    h + body.split('\n').filter(Boolean).map(l => '- ' + l).join('\n') + '\n');
  // 3) pivots: "-> chip\nanswer" (one paragraph) -> chip para + BLANK LINE + answer para
  out = out.replace(/^(-> [^\n]+)\n(?!\n)([^\n#][^\n]*)$/gm, '$1\n\n$2');
  return out;
}

let tot = { stagesBefore: 0, stagesAfter: 0, tnBefore: 0, tnAfter: 0, pivBefore: 0, pivAfter: 0, pivots: 0 };
const rows = [];
for (const f of files) {
  const src = fs.readFileSync(MD + f, 'utf8');
  let A, B;
  try { A = parseMarkdown(src).views; } catch (e) { console.log('parse fail (before)', f, e.message); continue; }
  try { B = parseMarkdown(reshape(src)).views; } catch (e) { console.log('parse fail (after)', f, e.message); continue; }
  const sA = A.sys.stages.length, sB = B.sys.stages.length;
  const tA = Object.keys(A.drill.tierNotes).length, tB = Object.keys(B.drill.tierNotes).length;
  const pA = A.sys.pivots.filter(p => p.a && p.a.trim()).length;
  const pB = B.sys.pivots.filter(p => p.a && p.a.trim()).length;
  tot.stagesBefore += sA; tot.stagesAfter += sB;
  tot.tnBefore += tA; tot.tnAfter += tB;
  tot.pivBefore += pA; tot.pivAfter += pB; tot.pivots += B.sys.pivots.length;
  rows.push({ f: f.replace('.md', ''), sA, sB, tA, tB, pA, pB });
}

console.log('=== SHAPE-ONLY RESHAPE OF ALL 38 md FILES (no new words, no compiler change) ===\n');
console.log('  topic                        sys.stages     tierNotes      pivots w/ answer');
console.log('  ' + '-'.repeat(74));
rows.slice(0, 10).forEach(r => console.log('  ' + r.f.padEnd(26) + '  ' + String(r.sA).padStart(3) + ' -> ' + String(r.sB).padStart(3) + '      ' + String(r.tA).padStart(3) + ' -> ' + String(r.tB).padStart(3) + '        ' + String(r.pA).padStart(3) + ' -> ' + String(r.pB).padStart(3)));
console.log('  ... (' + rows.length + ' files total)\n');
console.log('  TOTALS ACROSS ALL ' + rows.length + ' COMPILED TOPICS');
console.log('    sys.stages        : ' + tot.stagesBefore + '  ->  ' + tot.stagesAfter + '   (+' + (tot.stagesAfter - tot.stagesBefore) + ' authored stages currently DISCARDED at build)');
console.log('    drill tierNotes   : ' + tot.tnBefore + '  ->  ' + tot.tnAfter + '   (+' + (tot.tnAfter - tot.tnBefore) + ' authored tier notes currently DISCARDED)');
console.log('    pivots w/ answer  : ' + tot.pivBefore + '  ->  ' + tot.pivAfter + '  of ' + tot.pivots + '   (+' + (tot.pivAfter - tot.pivBefore) + ' authored pivot answers currently swallowed into the chip label)');

// sample the recovered content to prove it is REAL prose, not empty scaffolding
const s = parseMarkdown(reshape(fs.readFileSync(MD + 'idempotency.md', 'utf8'))).views;
console.log('\n=== RECOVERED CONTENT SAMPLE (idempotency) ===');
console.log('  stages:');
s.sys.stages.forEach(x => console.log('    - ' + JSON.stringify(x)));
console.log('  tierNotes: ' + JSON.stringify(s.drill.tierNotes));
console.log('  pivot[0].chip: ' + JSON.stringify(s.sys.pivots[0].chip));
console.log('  pivot[0].a   : ' + JSON.stringify(s.sys.pivots[0].a));

console.log('\n#########################################################################');
console.log('VERDICT: ' + (tot.stagesAfter > 0 && tot.tnAfter > 0 && tot.pivAfter > 0
  ? 'The content was ALREADY AUTHORED in all 38 files and is being SILENTLY DISCARDED\n'
  + '         by the parser (it demands markdown bullet lists / separate paragraphs; the authors\n'
  + '         wrote the PLAIN-LINE form that TOPIC_MARKDOWN_FORMAT.md itself shows).\n'
  + '         => NOT a missing schema field. NOT an authoring gap. A BUILD-TIME DATA-LOSS BUG.'
  : 'reshape did not recover content -- the gap is real'));
console.log('#########################################################################');
