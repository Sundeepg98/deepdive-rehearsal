// Census: how many bytes of the bundle are pre-rendered SVG diagrams?
import fs from 'node:fs';
import zlib from 'node:zlib';

const src = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/dist/index.html', 'utf8');
const TOTAL = Buffer.byteLength(src, 'utf8');
const open = src.indexOf('>', 657310) + 1;
const main = src.slice(open, src.indexOf('</script>', open));
const MAIN = main.length;

// SVGs are embedded inside JS string literals with escaped quotes: <svg ... </svg>
console.log('=== SVG BLOCK CENSUS in main script ===');
const svgRe = /<svg\b/g;
let m, svgTotal = 0, svgCount = 0;
const sizes = [];
while ((m = svgRe.exec(main))) {
  const end = main.indexOf('</svg>', m.index);
  if (end === -1) continue;
  const len = end + 6 - m.index;
  svgTotal += len; svgCount++;
  sizes.push(len);
  svgRe.lastIndex = end + 6;
}
sizes.sort((a, b) => b - a);
const sum = a => a.reduce((s, x) => s + x, 0);
console.log('svg blocks        :', svgCount);
console.log('svg total bytes   :', svgTotal, `= ${(svgTotal / 1048576).toFixed(2)} MiB`);
console.log('  % of main script:', ((svgTotal / MAIN) * 100).toFixed(1) + '%');
console.log('  % of WHOLE FILE :', ((svgTotal / TOTAL) * 100).toFixed(1) + '%');
console.log('median            :', sizes[Math.floor(sizes.length / 2)]);
console.log('mean              :', Math.round(svgTotal / svgCount));
console.log('largest 5         :', sizes.slice(0, 5).join(', '));
console.log('smallest 5        :', sizes.slice(-5).join(', '));
console.log('count >10KB       :', sizes.filter(x => x > 10000).length, '-> bytes', sum(sizes.filter(x => x > 10000)));
console.log('count >5KB        :', sizes.filter(x => x > 5000).length);

// What is IN these SVGs? sample the biggest one
const big = main.indexOf('<svg', 3564740);
const bigEnd = main.indexOf('</svg>', big);
const sample = main.slice(big, bigEnd + 6);
console.log('\n=== ANATOMY OF THE LARGEST SVG (' + sample.length + ' bytes) ===');
for (const el of ['<path', '<rect', '<text', '<g ', '<tspan', '<polygon', '<circle', '<line', '<marker', '<foreignObject', '<style', '<defs', 'transform=', 'font-family']) {
  const n = (sample.match(new RegExp(el.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log('  ' + el.padEnd(16), String(n).padStart(5));
}
// Is there an inline <style> repeated in every SVG?
const styleM = sample.match(/<style[^>]*>([\s\S]{0,400})/);
console.log('\n  inline <style> head:', styleM ? JSON.stringify(styleM[1].slice(0, 260)) : 'none');
// class attr census -> mermaid-ish?
console.log('  looks mermaid-like  :', /mermaid|flowchart|edgePath|nodeLabel|cluster/.test(sample));
console.log('  path d= total bytes :', sum((sample.match(/ d="[^"]*"/g) || []).map(s => s.length)));
console.log('  precision probe     :', (sample.match(/\d+\.\d{4,}/g) || []).length, 'numbers with >=4 decimal places');
const longDec = sample.match(/-?\d+\.\d{4,}/g) || [];
console.log('  sample long decimals:', longDec.slice(0, 8).join(' '));
console.log('  bytes wasted on decimals beyond 2dp (approx):',
  longDec.reduce((s, n) => s + Math.max(0, n.split('.')[1].length - 2), 0));

// gzip a single svg to see how compressible
console.log('\n  single-svg gzip     :', zlib.gzipSync(Buffer.from(sample), { level: 9 }).length, 'bytes (ratio', (zlib.gzipSync(Buffer.from(sample), { level: 9 }).length / sample.length).toFixed(3) + ')');

// --- Non-SVG remainder of the main script ---
console.log('\n=== MAIN SCRIPT REMAINDER (SVG removed) ===');
const withoutSvg = MAIN - svgTotal;
console.log('non-SVG bytes     :', withoutSvg, `= ${(withoutSvg / 1024).toFixed(0)} KiB`);

// --- Prose/content vs engine code: find the topic data island ---
// Heuristic: find the boundary where the topic corpus starts/ends.
console.log('\n=== FILE MAP (whole dist, byte ranges) ===');
const rows = [
  ['html head + icons + <style>', 0, 164347],
  ['visual kit script (three.js)', 164347, 657310],
  ['  ...of which: main app script', 657310, 657310 + MAIN],
  ['tail', 657310 + MAIN, TOTAL],
];
for (const [label, a, b] of rows) {
  console.log(String(b - a).padStart(9), ((b - a) / TOTAL * 100).toFixed(1).padStart(5) + '%', label);
}
