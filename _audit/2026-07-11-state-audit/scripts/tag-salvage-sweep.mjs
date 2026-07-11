// Sweep the 3 giant archive tags: what src modules do they carry, which are in
// master, and is anything valuable STILL STRANDED?
// Classifies each not-in-master module by forbidden-API grep (offline-unsafe) vs
// offline-safe (a real reconsideration candidate).
import { execFileSync } from 'node:child_process';
const REPO = 'D:/claude-workspace/deepdive-rehearsal';
const git = (args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });

const TAGS = [
  'archive/feature-animated-bg-interactions',
  'archive/feature-parallelize-all-tests',
  'archive/visual-enhancements',
];

// Anything that breaks the offline/file:// contract
const FORBIDDEN = /localStorage|sessionStorage|\bfetch\s*\(|sendBeacon|new Notification|Notification\.requestPermission|navigator\.share|navigator\.clipboard|navigator\.vibrate|getBattery|navigator\.connection|caches\.|permissions\.query|XMLHttpRequest|WebSocket/;

const lsFiles = (ref, dir) => {
  try { return git(['ls-tree', '-r', '--name-only', ref, '--', dir]).split('\n').filter(Boolean); }
  catch { return []; }
};
const masterFiles = new Set(lsFiles('master', 'src/'));
// also index master by basename, since the salvage may have RENAMED modules
const masterBase = new Map();
for (const f of masterFiles) {
  const b = f.split('/').pop();
  if (!masterBase.has(b)) masterBase.set(b, []);
  masterBase.get(b).push(f);
}

// Every JS symbol master defines, to catch salvage-by-absorption (module folded into another file)
const masterSrcBlob = [...masterFiles].filter(f => f.endsWith('.js') || f.endsWith('.css'))
  .map(f => { try { return git(['show', `master:${f}`]); } catch { return ''; } }).join('\n');

const BLOAT = /^(test\/reports\/|deploy_temp\/|test\/scan_report\.json|.*\.png$)/;

for (const tag of TAGS) {
  console.log('\n' + '='.repeat(78));
  console.log('TAG: ' + tag + '   (' + git(['rev-list','--count', `master..${tag}`]).trim() + ' commits not in master)');
  console.log('='.repeat(78));

  // --- bloat accounting
  const all = lsFiles(tag, '.');
  const bloat = all.filter(f => BLOAT.test(f));
  const pngs = all.filter(f => f.endsWith('.png'));
  const reports = all.filter(f => f.startsWith('test/reports/'));
  console.log(`  total tracked files: ${all.length}`);
  console.log(`  generated bloat: ${bloat.length} files  (test/reports: ${reports.length}, PNGs: ${pngs.length})`);

  // --- src modules
  const mods = lsFiles(tag, 'src/scripts/app/').filter(f => f.endsWith('.js'));
  const inMaster = [], strandedSafe = [], strandedUnsafe = [];
  for (const f of mods) {
    const base = f.split('/').pop();
    if (masterFiles.has(f) || masterBase.has(base)) { inMaster.push(base); continue; }
    let src = '';
    try { src = git(['show', `${tag}:${f}`]); } catch {}
    const hits = (src.match(FORBIDDEN) || [])[0];
    if (hits) strandedUnsafe.push(`${base} [${hits.trim()}]`);
    else strandedSafe.push(base);
  }
  console.log(`\n  src/scripts/app modules on tag: ${mods.length}`);
  console.log(`    -> ALSO IN MASTER (salvaged): ${inMaster.length}`);
  console.log(`       ${inMaster.join(', ') || '(none)'}`);
  console.log(`    -> STRANDED, offline-UNSAFE (correctly dropped): ${strandedUnsafe.length}`);
  strandedUnsafe.forEach(m => console.log(`       - ${m}`));
  console.log(`    -> STRANDED, offline-SAFE (reconsideration candidates): ${strandedSafe.length}`);
  strandedSafe.forEach(m => console.log(`       ? ${m}`));
}
