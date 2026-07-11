// Prove: the 9 pane branches carry NO unique JS logic vs master.
// Strategy: strip CSS template literals + comments + whitespace, then compare
// the remaining JS logic (identifiers / structure) branch-tip vs master.
import { execSync } from 'node:child_process';

const REPO = 'D:/claude-workspace/deepdive-rehearsal';
const git = (a) => execSync(`git ${a}`, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

// branch -> the source files its unique commit touched (excluding generated deliverable)
const MAP = {
  'build/pane-trade': ['src/scripts/app/trade-offs.js'],
  'build/pane-model': ['src/scripts/app/model-answers/logic.js'],
  'build/pane-sys':   ['src/scripts/app/system-map.js'],
  'build/pane-open':  ['src/scripts/app/opener-altitude.js'],
  'build/pane-wb':    ['src/scripts/app/whiteboard.js'],
  'build/pane-walk':  ['src/scripts/app/walkthrough/logic.js'],
  'build/pane-num':   ['src/scripts/app/num/logic.js'],
  'build/pane-drill': ['src/scripts/app/drill/logic.js'],
  'build/pane-rf':    ['src/scripts/app/red-flags.js'],
};

// Remove CSS template literals (var X_STYLE = `...`;), block/line comments, blank lines.
function jsLogicOnly(src) {
  let s = src.replace(/`[\s\S]*?`/g, '`CSS`');      // collapse ALL template literals
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');            // block comments
  s = s.replace(/^\s*\/\/.*$/gm, '');                // line comments
  s = s.replace(/^\s*\(function \(\) \{\s*$/gm, ''); // IIFE open (master-only refactor)
  s = s.replace(/^\s*\}\)\(\);\s*$/gm, '');          // IIFE close
  return s.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

// Extract JS structural symbols: class names, method names, function names, dataKey
function symbols(src) {
  const s = jsLogicOnly(src);
  const out = new Set();
  for (const m of s.matchAll(/class\s+(\w+)\s+extends\s+(\w+)/g)) out.add(`class ${m[1]} extends ${m[2]}`);
  for (const m of s.matchAll(/static\s+dataKey\s*=\s*'(\w+)'/g)) out.add(`dataKey=${m[1]}`);
  for (const m of s.matchAll(/function\s+(\w+)\s*\(/g)) out.add(`fn ${m[1]}`);
  for (const m of s.matchAll(/^\s*(\w+)\s*\([^)]*\)\s*\{/gm)) {
    if (!['if','for','while','switch','catch','return'].includes(m[1])) out.add(`method ${m[1]}`);
  }
  for (const m of s.matchAll(/customElements\.define\('([\w-]+)'/g)) out.add(`tag ${m[1]}`);
  return out;
}

let allClean = true;
for (const [br, files] of Object.entries(MAP)) {
  for (const f of files) {
    let bSrc, mSrc;
    try { bSrc = git(`show ${br}:${f}`); } catch { console.log(`  ${br} :: ${f} -- MISSING ON BRANCH`); continue; }
    try { mSrc = git(`show master:${f}`); } catch { console.log(`  ${br} :: ${f} -- !! MISSING ON MASTER`); allClean = false; continue; }

    const bS = symbols(bSrc), mS = symbols(mSrc);
    const onlyBranch = [...bS].filter(x => !mS.has(x));
    const onlyMaster = [...mS].filter(x => !bS.has(x));

    const bL = jsLogicOnly(bSrc), mL = jsLogicOnly(mSrc);
    const logicIdentical = bL === mL;

    const status = onlyBranch.length === 0 ? 'ABSORBED' : 'UNIQUE-WORK!';
    if (onlyBranch.length) allClean = false;
    console.log(`${status.padEnd(13)} ${br.padEnd(24)} ${f}`);
    console.log(`     JS-logic (CSS/comments stripped) identical to master: ${logicIdentical}`);
    console.log(`     symbols only on BRANCH (would be LOST if deleted): ${onlyBranch.length ? JSON.stringify(onlyBranch) : 'NONE'}`);
    if (onlyMaster.length) console.log(`     symbols only on MASTER (master evolved further): ${JSON.stringify(onlyMaster)}`);
  }
}
console.log('\n==============================');
console.log(allClean
  ? 'RESULT: every pane branch is FULLY ABSORBED -- zero unique JS logic vs master.'
  : 'RESULT: at least one branch holds unique JS logic -- see UNIQUE-WORK! rows.');
