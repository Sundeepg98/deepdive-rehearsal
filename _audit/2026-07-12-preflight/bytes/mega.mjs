// Segment the 10.5 MB mega-script by its build-emitted module banners.
// The bundler writes  /* ===== scripts/<path> -- <desc> ===== */  before each module,
// so we can attribute every byte to a real source file. No guessing.
import fs from 'node:fs';
import zlib from 'node:zlib';

const src = fs.readFileSync(process.argv[2], 'utf8');

// isolate the biggest script tag
const tagRe = /<script\b([^>]*)>/gi;
let m, best = null;
while ((m = tagRe.exec(src)) !== null) {
  const bodyStart = m.index + m[0].length;
  const ci = src.slice(bodyStart).search(/<\/script\s*>/i);
  if (ci < 0) continue;
  const body = src.slice(bodyStart, bodyStart + ci);
  if (!best || body.length > best.length) best = body;
  tagRe.lastIndex = bodyStart + ci;
}
const mega = best;
console.log(`mega-script body: ${Buffer.byteLength(mega, 'utf8').toLocaleString()} bytes\n`);

// split on banners
const bannerRe = /\/\*\s*={3,}\s*(.+?)\s*={3,}\s*\*\//g;
const marks = [];
while ((m = bannerRe.exec(mega)) !== null) marks.push({ name: m[1].trim(), at: m.index });

if (!marks.length) { console.log('no banners found'); process.exit(0); }

const mods = marks.map((mk, i) => {
  const end = i + 1 < marks.length ? marks[i + 1].at : mega.length;
  const text = mega.slice(mk.at, end);
  return { name: mk.name, bytes: Buffer.byteLength(text, 'utf8'), text };
});

const total = mods.reduce((a, b) => a + b.bytes, 0);
const covered = total;
const preamble = Buffer.byteLength(mega.slice(0, marks[0].at), 'utf8');

// group by top-level dir  (scripts/app/x.js, scripts/topics/foo.js -> app / topics / ...)
const groups = new Map();
for (const mo of mods) {
  const pm = mo.name.match(/scripts\/([^/]+)\//);
  const g = pm ? pm[1] : (mo.name.match(/scripts\/([^\s-]+)/) ? 'scripts(root)' : 'other');
  const cur = groups.get(g) || { bytes: 0, count: 0, mods: [] };
  cur.bytes += mo.bytes; cur.count++; cur.mods.push(mo);
  groups.set(g, cur);
}

const fileBytes = Buffer.byteLength(src, 'utf8');
const kb = (n) => (n / 1024).toFixed(0).padStart(8) + ' KB';
const pctFile = (n) => ((n / fileBytes) * 100).toFixed(1).padStart(5) + '%';

console.log(`banners: ${mods.length}   attributed: ${covered.toLocaleString()}  preamble(unbannered): ${preamble.toLocaleString()}\n`);
console.log('-- mega-script grouped by source dir (share is of the WHOLE 11.4 MB file) --');
for (const [g, v] of [...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${g.padEnd(18)} ${String(v.count).padStart(3)} mods  ${kb(v.bytes)}  ${pctFile(v.bytes)}`);
}

console.log('\n-- 25 largest individual modules --');
for (const mo of [...mods].sort((a, b) => b.bytes - a.bytes).slice(0, 25)) {
  console.log(`  ${kb(mo.bytes)} ${pctFile(mo.bytes)}  ${mo.name.slice(0, 90)}`);
}

// per-group gzip: how compressible is the content vs the code?
console.log('\n-- compressibility by group (gzip -9 of the concatenated group) --');
for (const [g, v] of [...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
  const buf = Buffer.from(v.mods.map((x) => x.text).join('\n'), 'utf8');
  const gz = zlib.gzipSync(buf, { level: 9 }).length;
  console.log(`  ${g.padEnd(18)} raw ${kb(v.bytes)} -> gzip ${kb(gz)}  (${(gz / v.bytes * 100).toFixed(1)}% , ${(v.bytes / gz).toFixed(1)}x)`);
}
console.log('');
