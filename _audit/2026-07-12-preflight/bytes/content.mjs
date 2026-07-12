// Classify the payload inside the mega-script: topic modules, pre-rendered SVG,
// mermaid theme-CSS boilerplate, and how much of it is duplicated.
import fs from 'node:fs';
import zlib from 'node:zlib';

const src = fs.readFileSync(process.argv[2], 'utf8');
const fileBytes = Buffer.byteLength(src, 'utf8');
const tagRe = /<script\b([^>]*)>/gi;
let m, mega = '';
while ((m = tagRe.exec(src)) !== null) {
  const bs = m.index + m[0].length;
  const ci = src.slice(bs).search(/<\/script\s*>/i);
  if (ci < 0) continue;
  const body = src.slice(bs, bs + ci);
  if (body.length > mega.length) mega = body;
  tagRe.lastIndex = bs + ci;
}

const kb = (n) => (n / 1024).toFixed(0).padStart(8) + ' KB';
const pf = (n) => ((n / fileBytes) * 100).toFixed(1).padStart(5) + '%';

// ---- 1. every <svg ...>...</svg> literal in the bundle (pre-rendered diagrams) ----
const svgRe = /<svg[\s\S]{0,400000}?<\/svg>/g;
let svgTotal = 0, svgCount = 0, svgCssTotal = 0;
const svgSizes = [];
while ((m = svgRe.exec(mega)) !== null) {
  const n = Buffer.byteLength(m[0], 'utf8');
  svgTotal += n; svgCount++; svgSizes.push(n);
  // <style> inside the svg = mermaid theme boilerplate
  const st = m[0].match(/<style[\s\S]*?<\/style>/g);
  if (st) for (const s of st) svgCssTotal += Buffer.byteLength(s, 'utf8');
}
svgSizes.sort((a, b) => b - a);

// ---- 2. how much of that svg CSS is DUPLICATE? (dedupe by exact style-block text) ----
const styleBlocks = new Map();
const svgRe2 = /<svg[\s\S]{0,400000}?<\/svg>/g;
while ((m = svgRe2.exec(mega)) !== null) {
  const st = m[0].match(/<style[\s\S]*?<\/style>/g) || [];
  for (const s of st) {
    const n = Buffer.byteLength(s, 'utf8');
    const cur = styleBlocks.get(s) || { count: 0, bytes: n };
    cur.count++;
    styleBlocks.set(s, cur);
  }
}
let uniqueCss = 0, dupCss = 0;
for (const [, v] of styleBlocks) { uniqueCss += v.bytes; dupCss += v.bytes * (v.count - 1); }

// ---- 3. topic module boundaries ----
// compiled topics register themselves; find the registration calls
const regPatterns = [
  /TOPIC_REGISTRY\s*\[/g,
  /registerTopic\s*\(/g,
  /Topics\.register\s*\(/g,
  /__TOPIC__/g,
];
for (const r of regPatterns) {
  const c = (mega.match(r) || []).length;
  if (c) console.log(`registration marker ${r.source}: ${c} hits`);
}

// ---- 4. big string-literal payloads: the authored content ----
// Count bytes living inside quoted strings (rough proxy for "content" vs "code")
let inStr = 0, strCount = 0;
{
  let i = 0, q = null, esc = false, start = 0;
  const s = mega;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === q) { inStr += i - start; strCount++; q = null; }
    } else if (c === '"' || c === "'" || c === '`') { q = c; start = i + 1; }
    i++;
  }
}

// ---- 5. HTML entity density in content (&mdash; etc) ----
const entities = (mega.match(/&[a-z]+;/g) || []).length;

console.log(`\n=================  CONTENT CLASSES inside the ${(Buffer.byteLength(mega,'utf8')/1048576).toFixed(2)} MB mega-script  =================`);
console.log(`file total: ${fileBytes.toLocaleString()} bytes\n`);
console.log(`  pre-rendered <svg> diagrams   x${String(svgCount).padStart(4)}  ${kb(svgTotal)}  ${pf(svgTotal)}`);
console.log(`     of which <style> boilerplate       ${kb(svgCssTotal)}  ${pf(svgCssTotal)}`);
console.log(`        unique style text                ${kb(uniqueCss)}`);
console.log(`        DUPLICATED style bytes           ${kb(dupCss)}  ${pf(dupCss)}   <-- pure waste`);
console.log(`     distinct style blocks: ${styleBlocks.size}  (across ${svgCount} svgs)`);
console.log(`  bytes inside string literals  x${String(strCount).padStart(4)}  ${kb(inStr)}  ${pf(inStr)}   (authored content proxy)`);
console.log(`  HTML entities (&xxx;)                  ${entities.toLocaleString()} occurrences`);
console.log(`\n  largest 10 svgs (KB): ${svgSizes.slice(0, 10).map((n) => (n / 1024).toFixed(0)).join(', ')}`);
console.log(`  median svg: ${(svgSizes[Math.floor(svgSizes.length / 2)] / 1024).toFixed(1)} KB`);

// gzip of just the svg mass
const allSvg = Buffer.from(mega.match(/<svg[\s\S]{0,400000}?<\/svg>/g)?.join('\n') || '', 'utf8');
if (allSvg.length) {
  const gz = zlib.gzipSync(allSvg, { level: 9 }).length;
  console.log(`\n  svg mass: raw ${kb(allSvg.length)} -> gzip ${kb(gz)}  (${(allSvg.length / gz).toFixed(1)}x compressible)`);
}
console.log('');
