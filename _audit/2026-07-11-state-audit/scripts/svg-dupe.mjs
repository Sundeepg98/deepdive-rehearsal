// How much of the 796KB SVG payload is DUPLICATED mermaid boilerplate CSS?
import fs from 'node:fs';

const src = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/dist/index.html', 'utf8');
const open = src.indexOf('>', 657310) + 1;
const main = src.slice(open, src.indexOf('</script>', open));

const svgs = [];
const svgRe = /<svg\b/g; let m;
while ((m = svgRe.exec(main))) {
  const end = main.indexOf('</svg>', m.index);
  if (end === -1) continue;
  svgs.push(main.slice(m.index, end + 6));
  svgRe.lastIndex = end + 6;
}
console.log('svgs:', svgs.length);

// extract each inline <style>
let styleBytes = 0;
const styleHashes = new Map();
for (const s of svgs) {
  const sm = s.match(/<style>([\s\S]*?)<\/style>/);
  if (!sm) continue;
  styleBytes += sm[0].length;
  const key = sm[1].length; // group by length as a cheap identity proxy
  styleHashes.set(key, (styleHashes.get(key) || 0) + 1);
}
console.log('\n=== INLINE <style> INSIDE THE SVGs (mermaid boilerplate) ===');
console.log('total <style> bytes across all SVGs:', styleBytes, `= ${(styleBytes / 1024).toFixed(0)} KiB`);
console.log('  as % of the 796KB SVG payload   :', ((styleBytes / 796150) * 100).toFixed(1) + '%');
console.log('  as % of the whole 5.16MB file   :', ((styleBytes / 5163186) * 100).toFixed(2) + '%');
console.log('distinct style lengths (len -> count):', [...styleHashes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}B x${v}`).join(', '));

// how identical are they really? compare first two full strings
const s0 = svgs[0].match(/<style>([\s\S]*?)<\/style>/);
const s1 = svgs[1].match(/<style>([\s\S]*?)<\/style>/);
if (s0 && s1) {
  console.log('style[0] length:', s0[1].length, ' style[1] length:', s1[1].length);
  // The `#m` id prefix is identical across all -> they collide in the DOM too.
  console.log('both scoped to the SAME id "#m"?:', s0[1].startsWith('#m{') && s1[1].startsWith('#m{'));
  let same = 0;
  const n = Math.min(s0[1].length, s1[1].length);
  for (let i = 0; i < n; i++) if (s0[1][i] === s1[1][i]) same++; else break;
  console.log('common prefix chars:', same, `(${((same / n) * 100).toFixed(1)}% of the shorter)`);
}

// dedupe potential: unique style content
const uniq = new Set(svgs.map(s => (s.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1]));
console.log('UNIQUE style bodies:', uniq.size, 'out of', svgs.length);
const uniqBytes = [...uniq].reduce((a, b) => a + b.length, 0);
console.log('bytes if deduped to one shared stylesheet:', uniqBytes, ` -> saving ~${((styleBytes - uniqBytes) / 1024).toFixed(0)} KiB raw`);

// foreignObject / div wrappers - mermaid label bloat
let foBytes = 0, foCount = 0;
for (const s of svgs) {
  const fos = s.match(/<foreignObject[\s\S]*?<\/foreignObject>/g) || [];
  foCount += fos.length;
  foBytes += fos.reduce((a, b) => a + b.length, 0);
}
console.log('\n=== foreignObject label wrappers ===');
console.log('count:', foCount, ' bytes:', foBytes, `= ${(foBytes / 1024).toFixed(0)} KiB (${((foBytes / 796150) * 100).toFixed(1)}% of SVG payload)`);

// Numeric precision waste across ALL svgs
let waste = 0, nnums = 0;
for (const s of svgs) {
  const nums = s.match(/-?\d+\.\d{3,}/g) || [];
  nnums += nums.length;
  waste += nums.reduce((a, n) => a + Math.max(0, n.split('.')[1].length - 2), 0);
}
console.log('\n=== FLOAT PRECISION WASTE ===');
console.log('numbers with >=3 decimals:', nnums, '-> excess chars beyond 2dp:', waste, `= ${(waste / 1024).toFixed(0)} KiB`);
