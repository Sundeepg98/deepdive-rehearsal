// ADVERSARIAL VERIFY of rt-perf P3: "171 KiB of byte-identical duplicated mermaid CSS
// across the 39 SVGs". Independent count, written from scratch (not reusing svg-dupe.mjs).
import { readFileSync, statSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const F = 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const html = readFileSync(F, 'utf8');
const raw = readFileSync(F);

console.log('=== ARTIFACT ===');
console.log('bytes on disk       :', statSync(F).size);
console.log('utf8 string length  :', html.length);
console.log('gzip                :', gzipSync(raw, { level: 9 }).length);
console.log('brotli              :', brotliCompressSync(raw).length);

// --- SVG census ---
const svgs = html.match(/<svg[\s\S]*?<\/svg>/g) || [];
console.log('\n=== SVG CENSUS ===');
console.log('total <svg> blocks  :', svgs.length);
const svgBytes = svgs.reduce((n, s) => n + Buffer.byteLength(s, 'utf8'), 0);
console.log('total svg bytes     :', svgBytes, `(${(svgBytes / statSync(F).size * 100).toFixed(2)}% of file)`);

// mermaid-ish = those carrying an inline <style>
const withStyle = svgs.filter(s => /<style[\s\S]*?<\/style>/.test(s));
console.log('svgs w/ inline style:', withStyle.length);

const styleBodies = [];
for (const s of withStyle) {
  const m = s.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (m) styleBodies.push(m[1]);
}
const uniq = new Map();
for (const sb of styleBodies) {
  const h = createHash('sha1').update(sb).digest('hex').slice(0, 10);
  if (!uniq.has(h)) uniq.set(h, { len: Buffer.byteLength(sb, 'utf8'), count: 0 });
  uniq.get(h).count++;
}
const totalStyleBytes = styleBodies.reduce((n, s) => n + Buffer.byteLength(s, 'utf8'), 0);
console.log('inline <style> total:', totalStyleBytes, 'bytes');
console.log('UNIQUE style bodies :', uniq.size, 'out of', styleBodies.length);
for (const [h, v] of uniq) console.log(`   sha1 ${h}  len=${v.len}B  x${v.count}`);

// reclaimable = all but one copy of each unique body
let reclaim = 0;
for (const [, v] of uniq) reclaim += v.len * (v.count - 1);
console.log('reclaimable by dedupe:', reclaim, 'bytes =', (reclaim / 1024).toFixed(1), 'KiB');
console.log('  (lens claimed ~171 KiB reclaimed, 179,702 B total style, 2 unique of 39)');

// --- float precision ---
const geo = svgs.join('');
const longFloats = geo.match(/\d+\.\d{3,}/g) || [];
const wasted = longFloats.reduce((n, f) => {
  const [i, d] = f.split('.');
  return n + Math.max(0, d.length - 2);
}, 0);
console.log('\n=== FLOAT PRECISION ===');
console.log('numbers with >=3 decimals:', longFloats.length);
console.log('bytes beyond 2dp         :', wasted, '=', (wasted / 1024).toFixed(1), 'KiB');
console.log('  (lens claimed 7,325 numbers, ~26 KiB)');

// --- does the SVG payload actually compress well? (severity check) ---
const svgBuf = Buffer.from(geo, 'utf8');
console.log('\n=== SVG COMPRESSIBILITY (severity check) ===');
console.log('svg raw   :', svgBuf.length);
console.log('svg gzip  :', gzipSync(svgBuf, { level: 9 }).length, `ratio ${(gzipSync(svgBuf, { level: 9 }).length / svgBuf.length).toFixed(3)}`);
