// Independently verify the CLAIMED fix, using the REAL compiler parser.
// Reads src/topics-md/caching.md, applies the two markdown edits IN MEMORY ONLY,
// and re-parses with the real parseMarkdown. Writes NOTHING to src/.
import fs from 'fs';
import { parseMarkdown } from '../../../tools/compiler/parse_md.mjs';

const SRC = 'D:/claude-workspace/deepdive-rehearsal/src/topics-md/caching.md';
const raw = fs.readFileSync(SRC, 'utf8');

// --- BASELINE: parse the file exactly as it ships ---
const before = parseMarkdown(raw, { index: 9, total: 38 });
const bs = before.views.sys;
console.log('=== BASELINE (file as shipped) ===');
console.log('sys.stages          :', bs.stages.length);
console.log('sys.pivots          :', bs.pivots.length);
bs.pivots.forEach((p, i) => console.log(`  piv${i + 1}: chip=${p.chip.length}ch  a=${p.a.length}ch  chipHasNewline=${p.chip.includes('\n')}`));

// --- FIX 1: bullet-prefix the stage lines under "### Where it sits" ---
// --- FIX 2: blank line between the "-> chip" line and its answer paragraph ---
const lines = raw.split('\n');
const out = [];
let inWhere = false, inSysPivot = false;
for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  if (/^### Where it sits/.test(L)) { inWhere = true; out.push(L); continue; }
  if (/^#{2,4} /.test(L) && !/^### Where it sits/.test(L)) { inWhere = false; }
  // FIX 1: inside "Where it sits", a non-empty, non-heading line becomes a bullet
  if (inWhere && L.trim() && !/^[-#]/.test(L)) { out.push('- ' + L); continue; }
  // FIX 2: an "-> ..." line followed immediately by a non-empty line -> insert a blank line
  if (/^->\s/.test(L)) {
    out.push(L);
    if (lines[i + 1] && lines[i + 1].trim() !== '') out.push('');   // separate chip from answer
    continue;
  }
  out.push(L);
}
const fixed = out.join('\n');
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/caching.FIXED.md', fixed);

const after = parseMarkdown(fixed, { index: 9, total: 38 });
const as = after.views.sys;
console.log('\n=== AFTER the two pure-markdown edits ===');
console.log('sys.stages          :', as.stages.length);
as.stages.forEach((s, i) => console.log(`  stage${i + 1}: n="${s.n}" d="${s.d.slice(0, 42)}..." cur=${!!s.cur}`));
console.log('sys.pivots          :', as.pivots.length);
as.pivots.forEach((p, i) => console.log(`  piv${i + 1}: chip=${p.chip.length}ch "${p.chip.slice(0, 58)}"  a=${p.a.length}ch "${p.a.slice(0, 45)}..."`));

// --- REGRESSION CHECK: is EVERY OTHER slice byte-identical? ---
console.log('\n=== REGRESSION: other slices unchanged? ===');
const keys = Object.keys(before.views);
let diffs = 0;
for (const k of keys) {
  const same = JSON.stringify(before.views[k]) === JSON.stringify(after.views[k]);
  if (!same) { diffs++; console.log(`  CHANGED: ${k}`); }
}
console.log(`slices changed: ${diffs} (expected: 1 = sys only)`);
console.log('identity identical:', JSON.stringify(before.identity) === JSON.stringify(after.identity));

// --- Does the [*] marker land on the right stage? ---
const cur = as.stages.filter(s => s.cur);
console.log('\ncur ("you are here") stages:', cur.length, cur.map(s => s.n));

// --- Would the fix also kill the spurious jump buttons? chip length after fix ---
console.log('\nchip length after fix (should be short label only):', as.pivots.map(p => p.chip.length));
