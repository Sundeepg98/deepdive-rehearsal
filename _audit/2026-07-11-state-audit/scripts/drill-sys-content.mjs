// Airtight check: does master's topic data contain ALL the branch's content?
// Normalizes the escaping churn (\' -> ') and topic renumbering, then compares.
import { execFileSync } from 'node:child_process';
const REPO = 'D:/claude-workspace/deepdive-rehearsal';
const show = (ref, f) => execFileSync('git', ['show', `${ref}:${f}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

// Normalize: unescape \' , collapse whitespace, drop &nbsp;, strip the "(NN)" topic numbers in chips
const norm = (s) => s
  .replace(/\\'/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/\((\d+)\)/g, '(N)')          // topic renumbering is a master-side ordering pass
  .replace(/[ \t]+/g, ' ')
  .split('\n').map(l => l.trim()).filter(Boolean);

for (const f of ['src/topics/content-pipeline/drill.js', 'src/topics/content-pipeline/sys.js']) {
  const br = f.includes('drill') ? 'build/pane-drill' : 'build/pane-sys';
  const B = norm(show(br, f)), M = new Set(norm(show('master', f)));
  const onlyBranch = B.filter(l => !M.has(l));
  console.log(`\n### ${f}   (${br} -> master)`);
  console.log(`  branch lines: ${B.length}   master lines: ${M.size}`);
  console.log(`  lines on BRANCH but NOT in master (after normalization): ${onlyBranch.length}`);
  if (onlyBranch.length) {
    console.log('  --- the unmatched lines (would be LOST on delete):');
    onlyBranch.slice(0, 15).forEach(l => console.log('     ' + l.slice(0, 150)));
  } else {
    console.log('  => FULLY ABSORBED: every branch line exists in master.');
  }
}
