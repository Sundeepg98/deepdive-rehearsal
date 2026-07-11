// Build the include closure from src/index.html and find orphaned modules.
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('src');
const INCLUDE = /<!--@build:include\s+(.+?)\s*-->/g;

const seen = new Set();
const missing = [];
function walk(rel) {
  if (seen.has(rel)) return;
  seen.add(rel);
  const p = path.join(SRC, rel);
  let buf;
  try { buf = fs.readFileSync(p, 'utf8'); }
  catch { missing.push(rel); return; }
  const re = new RegExp(INCLUDE.source, 'g');
  let m;
  while ((m = re.exec(buf))) walk(m[1].trim());
}
walk('index.html');

// Enumerate every source file under src/
const all = [];
(function rec(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) rec(f);
    else if (/\.(js|css|html|json)$/.test(e.name)) {
      all.push(path.relative(SRC, f).split(path.sep).join('/'));
    }
  }
})(SRC);

console.log('REACHABLE from index.html:', seen.size, 'files');
if (missing.length) { console.log('!! MISSING INCLUDE TARGETS:'); missing.forEach((m) => console.log('   ', m)); }

const code = all.filter((f) => !f.startsWith('topics/') && !f.startsWith('topics-md/'));
const orphans = code.filter((f) => !seen.has(f));
console.log('\n### ORPHANED src/ code files (never reached by an include) ###');
if (!orphans.length) console.log('  (none)');
for (const o of orphans) console.log('  ORPHAN:', o, fs.statSync(path.join(SRC, o)).size, 'bytes');

// Topic content reachability: which topic slices are reached?
const topicFiles = all.filter((f) => f.startsWith('topics/'));
const topicOrphans = topicFiles.filter((f) => !seen.has(f));
console.log('\n### topics/: ' + topicFiles.length + ' files, ' + (topicFiles.length - topicOrphans.length) + ' reached, ' + topicOrphans.length + ' NOT reached');
const byTop = {};
for (const o of topicOrphans) {
  const k = o.split('/')[1] || '(root)';
  byTop[k] = (byTop[k] || 0) + 1;
}
for (const [k, v] of Object.entries(byTop)) console.log('   unreached:', k, v, 'file(s)');

// Which src/scripts/app modules ARE reached (sanity)
console.log('\n### reached app modules:', [...seen].filter((f) => f.startsWith('scripts/app')).length);
