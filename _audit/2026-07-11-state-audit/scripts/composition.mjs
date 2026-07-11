// Byte-composition analysis of dist/index.html
import fs from 'node:fs';
import zlib from 'node:zlib';

const P = 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const buf = fs.readFileSync(P);
const src = buf.toString('utf8');
const TOTAL = buf.length;

console.log('=== FILE ===');
console.log('bytes            :', TOTAL, '=', (TOTAL / 1048576).toFixed(2), 'MiB');
console.log('gzip -9          :', zlib.gzipSync(buf, { level: 9 }).length, 'bytes =', (zlib.gzipSync(buf, { level: 9 }).length / 1048576).toFixed(2), 'MiB');
console.log('brotli           :', zlib.brotliCompressSync(buf).length, 'bytes =', (zlib.brotliCompressSync(buf).length / 1048576).toFixed(2), 'MiB');
console.log('utf8 chars       :', src.length);

// --- Top-level tag inventory ---
console.log('\n=== TOP-LEVEL INLINE BLOCKS ===');
const blocks = [];
const tagRe = /<(script|style|link|img|svg)\b([^>]*)>/gi;
let m;
while ((m = tagRe.exec(src))) {
  const tag = m[1].toLowerCase();
  const attrs = m[2];
  const openEnd = m.index + m[0].length;
  if (tag === 'script' || tag === 'style' || tag === 'svg') {
    const closeTag = `</${tag}>`;
    const closeIdx = src.indexOf(closeTag, openEnd);
    if (closeIdx === -1) continue;
    const inner = src.slice(openEnd, closeIdx);
    const whole = closeIdx + closeTag.length - m.index;
    blocks.push({ tag, attrs: attrs.trim().slice(0, 120), start: m.index, innerBytes: Buffer.byteLength(inner, 'utf8'), wholeBytes: Buffer.byteLength(src.slice(m.index, closeIdx + closeTag.length), 'utf8') });
    tagRe.lastIndex = closeIdx + closeTag.length;
  } else {
    blocks.push({ tag, attrs: attrs.trim().slice(0, 120), start: m.index, innerBytes: 0, wholeBytes: Buffer.byteLength(m[0], 'utf8') });
  }
}
blocks.sort((a, b) => b.wholeBytes - a.wholeBytes);
let acct = 0;
for (const b of blocks.slice(0, 30)) {
  acct += b.wholeBytes;
  console.log(
    String(b.wholeBytes).padStart(9),
    ((b.wholeBytes / TOTAL) * 100).toFixed(2).padStart(6) + '%',
    b.tag.padEnd(6),
    '@' + String(b.start).padStart(8),
    b.attrs.replace(/\s+/g, ' ').slice(0, 90)
  );
}
const sumAll = blocks.reduce((s, b) => s + b.wholeBytes, 0);
console.log('--- blocks counted:', blocks.length, ' sum:', sumAll, `(${((sumAll / TOTAL) * 100).toFixed(1)}% of file)`);
console.log('--- markup outside blocks:', TOTAL - sumAll, 'bytes');

// --- data: URI census (base64 fonts / images) ---
console.log('\n=== data: URI CENSUS (base64 / inline assets) ===');
const duRe = /data:([a-z0-9.+/-]+)?(;charset=[^;,]+)?(;base64)?,/gi;
const byMime = new Map();
let duTotal = 0, duCount = 0;
while ((m = duRe.exec(src))) {
  const mime = (m[1] || '(none)').toLowerCase();
  // find the terminating quote/paren
  const start = m.index;
  let i = m.index + m[0].length;
  const opener = src[start - 1];
  let end;
  if (opener === '"' || opener === "'") end = src.indexOf(opener, i);
  else {
    // css url( ... ) unquoted, or JS template
    const cands = [src.indexOf(')', i), src.indexOf('"', i), src.indexOf("'", i), src.indexOf('`', i)].filter(x => x > 0);
    end = Math.min(...cands);
  }
  if (end < 0 || !isFinite(end)) continue;
  const len = end - start;
  duTotal += len; duCount++;
  const e = byMime.get(mime) || { n: 0, bytes: 0, max: 0 };
  e.n++; e.bytes += len; e.max = Math.max(e.max, len);
  byMime.set(mime, e);
  duRe.lastIndex = end;
}
const mimes = [...byMime.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
for (const [mime, e] of mimes) {
  console.log(String(e.bytes).padStart(9), ((e.bytes / TOTAL) * 100).toFixed(2).padStart(6) + '%', 'n=' + String(e.n).padStart(4), 'max=' + String(e.max).padStart(8), mime);
}
console.log('--- data URIs total:', duTotal, `(${((duTotal / TOTAL) * 100).toFixed(2)}% of file) across ${duCount} URIs`);

// --- Known payload probes: locate the visual kit, topic corpus, etc ---
console.log('\n=== NAMED PAYLOAD PROBES ===');
function probe(label, needle) {
  const idx = src.indexOf(needle);
  console.log(label.padEnd(34), idx === -1 ? 'NOT FOUND' : '@' + idx);
  return idx;
}
probe('THREE / three.js marker', 'THREE');
probe('WebGLRenderer', 'WebGLRenderer');
probe('BufferGeometry', 'BufferGeometry');
probe('"topics"', '"topics"');
probe('TOPICS ident', 'TOPICS');
probe('kit / visual manifest', 'manifest');
probe('@font-face', '@font-face');
probe('KaTeX', 'katex');
probe('mermaid', 'mermaid');
