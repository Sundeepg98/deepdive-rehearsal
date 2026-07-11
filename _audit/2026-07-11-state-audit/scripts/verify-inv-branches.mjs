// INDEPENDENT re-verification of the inv-branches claim:
//   "all 9 'unmerged' branches carry ZERO unique work vs master"
// Unlike the original lens's logic-parity.mjs (which used a HARDCODED map of
// one file per branch and omitted build/rescues entirely), this DISCOVERS the
// real touched files from the commit itself and checks EVERY one of them.
//
// Method: for each branch's unique commit, take the lines it ADDED. Strip
// comments/blank/trivial-punctuation lines. Then ask: does each remaining
// substantive added line appear ANYWHERE in master's tracked src/ tree?
// (Searching the whole tree, not just the same path, so RELOCATED content --
// e.g. topic data moved into src/topics-md/*.md -- still counts as absorbed.)
import { execSync } from 'node:child_process';

const REPO = 'D:/claude-workspace/deepdive-rehearsal';
const git = (a) => execSync(`git ${a}`, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 29 });

const BRANCHES = [
  'build/pane-drill', 'build/pane-model', 'build/pane-num', 'build/pane-open',
  'build/pane-sys', 'build/pane-trade', 'build/pane-walk', 'build/pane-wb',
  'build/rescues',
];

// Build a single haystack of ALL of master's tracked source content.
const masterFiles = git('ls-tree -r --name-only master')
  .split('\n')
  .filter(f => f && (f.startsWith('src/') || f.startsWith('test/') || f.startsWith('tools/')));
let haystack = '';
for (const f of masterFiles) {
  try { haystack += git(`show "master:${f}"`) + '\n'; } catch { /* binary/missing */ }
}
// Normalise: collapse whitespace so indentation/reflow doesn't cause false misses.
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const haystackNorm = norm(haystack);

console.log(`master haystack: ${masterFiles.length} files, ${(haystack.length / 1024).toFixed(0)} KB\n`);

// A line is "substantive" if it carries real logic/content, not punctuation.
function substantive(line) {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return false;
  if (/^[{}()\[\];,]+$/.test(t)) return false;   // pure punctuation
  if (t.length < 12) return false;               // too short to be distinctive
  return true;
}

let grandUnabsorbed = 0;
const perBranch = [];

for (const br of BRANCHES) {
  // Real touched files, discovered from the commit (NOT a hardcoded map).
  const files = git(`diff --name-only ${br}~1 ${br}`)
    .split('\n')
    .filter(f => f && !f.endsWith('deepdive_content_pipeline_rehearsal.html')); // generated deliverable

  let added = 0, absorbed = 0;
  const misses = [];

  for (const f of files) {
    // Added lines this commit introduced in this file.
    let diff = '';
    try { diff = git(`diff ${br}~1 ${br} -- "${f}"`); } catch { continue; }
    const addedLines = diff.split('\n')
      .filter(l => l.startsWith('+') && !l.startsWith('+++'))
      .map(l => l.slice(1))
      .filter(substantive);

    for (const line of addedLines) {
      added++;
      if (haystackNorm.includes(norm(line))) absorbed++;
      else misses.push({ f, line: line.trim() });
    }
  }

  const pct = added ? ((absorbed / added) * 100).toFixed(1) : '100.0';
  const status = misses.length === 0 ? 'FULLY-ABSORBED' : `${misses.length} UNABSORBED`;
  console.log(`${br.padEnd(20)} files=${String(files.length).padStart(2)}  added=${String(added).padStart(4)}  absorbed=${String(absorbed).padStart(4)} (${pct}%)  ${status}`);
  grandUnabsorbed += misses.length;
  perBranch.push({ br, files: files.length, added, absorbed, misses });
}

console.log('\n================ UNABSORBED LINES (would be LOST on delete) ================');
if (grandUnabsorbed === 0) {
  console.log('NONE. Every substantive added line on all 9 branches exists somewhere in master.');
} else {
  for (const b of perBranch) {
    if (!b.misses.length) continue;
    console.log(`\n--- ${b.br} (${b.misses.length}) ---`);
    for (const m of b.misses.slice(0, 12)) console.log(`  [${m.f}] ${m.line.slice(0, 110)}`);
    if (b.misses.length > 12) console.log(`  ... +${b.misses.length - 12} more`);
  }
}
console.log(`\nVERDICT: ${grandUnabsorbed === 0
  ? 'CONFIRMED - all 9 branches fully absorbed; deletion loses nothing.'
  : `${grandUnabsorbed} substantive added lines are NOT present on master - INVESTIGATE.`}`);
