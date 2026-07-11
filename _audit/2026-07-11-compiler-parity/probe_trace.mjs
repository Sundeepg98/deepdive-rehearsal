// Token-level trace: prove the authored lines exist in the md and prove the parser line that drops them.
import fs from 'node:fs';
import MarkdownIt from 'markdown-it';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const md = new MarkdownIt();
const src = fs.readFileSync('src/topics-md/idempotency.md', 'utf8');

// --- 1. What did the AUTHOR write in ## System / ### Where it sits? ---
const sysBlock = src.match(/^## System\n([\s\S]*?)(?=^## )/m)[1];
const where = sysBlock.match(/^### Where it sits\n\n([\s\S]*?)(?=\n### )/m)[1];
console.log('=== AUTHORED (src/topics-md/idempotency.md, "### Where it sits") ===');
where.trim().split('\n').forEach((l, i) => console.log('  line %d: %s', i + 1, JSON.stringify(l)));
console.log('  --> %d authored stage lines\n', where.trim().split('\n').length);

// --- 2. What TOKEN TYPE does markdown-it give those lines? ---
const toks = md.parse(where.trim(), {});
console.log('=== markdown-it TOKEN TYPES for those lines ===');
toks.forEach(t => console.log('  %s%s', t.type, t.type === 'inline' ? '  content=' + JSON.stringify(t.content.slice(0, 60) + '...') : ''));
console.log('  --> token type is "paragraph_open"/"inline", NOT "bullet_list_open"\n');

// --- 3. What does the PARSER produce? ---
const out = parseMarkdown(src, { index: 1, total: 38 });
console.log('=== PARSER OUTPUT (parseMarkdown -> views.sys) ===');
console.log('  sys.intro   :', JSON.stringify(out.views.sys.intro).slice(0, 70) + '...');
console.log('  sys.stages  :', JSON.stringify(out.views.sys.stages), '  <-- EMPTY. All 5 authored lines gone.');
console.log('  sys.heads   :', JSON.stringify(out.views.sys.heads));
console.log('');
console.log('=== PIVOT CORRUPTION (parse_md.mjs:225) ===');
out.views.sys.pivots.forEach((p, i) => {
  console.log('  pivot[%d].q    : %s', i, JSON.stringify(p.q));
  console.log('  pivot[%d].chip : %s', i, JSON.stringify(p.chip));
  console.log('  pivot[%d].a    : %s   <-- ANSWER IS EMPTY; it was glued into .chip above', i, JSON.stringify(p.a));
});
console.log('');
console.log('=== DRILL TIER-NOTES ===');
const drillBlock = src.match(/^## Drill\n\n([\s\S]*?)(?=\n### )/m)[1];
console.log('  AUTHORED:');
drillBlock.trim().split('\n').forEach(l => console.log('    ' + JSON.stringify(l)));
console.log('  PARSED  : drill.tierNotes =', JSON.stringify(out.views.drill.tierNotes), '  <-- EMPTY');
console.log('');
console.log('=== DRILL FOLLOW-UPS ===');
const fTotal = out.views.drill.cards.reduce((n, c) => n + c.f.length, 0);
console.log('  drill.cards = %d, total follow-ups (card.f) = %d', out.views.drill.cards.length, fTotal);
console.log('  "Follow:" occurrences in the markdown source =', (src.match(/^Follow:/gmi) || []).length);
