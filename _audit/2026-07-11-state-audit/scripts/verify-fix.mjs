// LENS: topic-inventory -- VERIFY the proposed one-line fix actually works, before recommending it.
// Runs the real compiler parser (tools/compiler/parse_md.mjs) over caching.md's ## System section
// as-authored vs with a leading "- " on each stage line. Touches NO tracked file.
import { parseMarkdown } from '../../../tools/compiler/parse_md.mjs';
import fs from 'node:fs';

const src = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/src/topics-md/caching.md', 'utf8');

const asAuthored = parseMarkdown(src, { index: 15, total: 38 });
console.log('=== AS AUTHORED (shipping today) ===');
console.log('  sys.stages         :', asAuthored.views.sys.stages.length);
console.log('  sys.pivots         :', asAuthored.views.sys.pivots.length);
console.log('  pivot[0].chip len  :', asAuthored.views.sys.pivots[0].chip.length, 'chars');
console.log('  pivot[0].a   len   :', asAuthored.views.sys.pivots[0].a.length, 'chars');

// FIX A: bullet-prefix the 5 stage lines under "### Where it sits"
// FIX B: blank-line-separate the pivot "-> chip" line from its answer paragraph
let fixed = src.replace(
  /(### Where it sits\n\n)((?:[^\n#][^\n]*\n)+)/,
  (_m, head, body) => head + body.trimEnd().split('\n').map(l => '- ' + l).join('\n') + '\n'
);
fixed = fixed.replace(/^(-> [^\n]*)\n(?=[A-Z])/gm, '$1\n\n');

const afterFix = parseMarkdown(fixed, { index: 15, total: 38 });
console.log('');
console.log('=== WITH THE FIX (bullet-prefix stages + blank line after the -> chip) ===');
console.log('  sys.stages         :', afterFix.views.sys.stages.length);
afterFix.views.sys.stages.forEach((s, i) => console.log(`     ${i + 1}. n="${s.n}" d="${s.d.slice(0, 44)}..."${s.cur ? '  <-- cur (you are here)' : ''}`));
console.log('  sys.pivots         :', afterFix.views.sys.pivots.length);
console.log('  pivot[0].chip len  :', afterFix.views.sys.pivots[0].chip.length, 'chars ::', afterFix.views.sys.pivots[0].chip.slice(0, 60));
console.log('  pivot[0].a   len   :', afterFix.views.sys.pivots[0].a.length, 'chars ::', afterFix.views.sys.pivots[0].a.slice(0, 60));
console.log('');
console.log('  every other slice unchanged?',
  ['walk', 'drill', 'wb', 'trade', 'model', 'num', 'rf', 'open']
    .every(k => JSON.stringify(afterFix.views[k]) === JSON.stringify(asAuthored.views[k])) ? 'YES (only sys changed)' : 'NO -- check');
