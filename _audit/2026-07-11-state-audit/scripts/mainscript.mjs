// Decompose the 4.5MB main script inside dist/index.html
import fs from 'node:fs';
import zlib from 'node:zlib';

const src = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/dist/index.html', 'utf8');

// main script block: opens at 657310
const open = src.indexOf('>', 657310) + 1;
const close = src.indexOf('</script>', open);
const main = src.slice(open, close);
console.log('main script bytes:', Buffer.byteLength(main, 'utf8'));
console.log('gzip:', zlib.gzipSync(Buffer.from(main), { level: 9 }).length);

// visual kit script (offset 164347)
const kOpen = src.indexOf('>', 164347) + 1;
const kClose = src.indexOf('</script>', kOpen);
const kit = src.slice(kOpen, kClose);
console.log('\nvisual-kit script bytes:', Buffer.byteLength(kit, 'utf8'), ' gzip:', zlib.gzipSync(Buffer.from(kit), { level: 9 }).length);

// --- Find the topic corpus in the main bundle ---
// Look for the compiled topic data structure. Probe several idents.
console.log('\n=== IDENT PROBES in main script ===');
for (const n of ['walk', 'drill', 'panes', 'slug', 'topicsData', 'TOPIC_DATA', 'ALL_TOPICS', 'compiled', 'redFlags', 'tradeoffs']) {
  const i = main.indexOf(n);
  console.log(n.padEnd(14), i === -1 ? 'none' : '@' + i);
}

// --- Big string-literal census: the corpus is probably big quoted strings ---
// Walk the source and measure total bytes inside string literals >200 chars.
console.log('\n=== LARGE STRING LITERAL CENSUS (naive scan) ===');
let inStr = null, esc = false, strStart = 0;
let bigBytes = 0, bigCount = 0, allStrBytes = 0, allStrCount = 0;
const buckets = [];
for (let i = 0; i < main.length; i++) {
  const c = main[i];
  if (inStr) {
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === inStr) {
      const len = i - strStart;
      allStrBytes += len; allStrCount++;
      if (len > 200) { bigBytes += len; bigCount++; buckets.push({ len, at: strStart, sample: main.slice(strStart + 1, strStart + 70).replace(/\n/g, '\\n') }); }
      inStr = null;
    }
    continue;
  }
  if (c === '"' || c === "'" || c === '`') { inStr = c; strStart = i; esc = false; }
}
buckets.sort((a, b) => b.len - a.len);
console.log('all string literals   :', allStrCount, 'totalling', allStrBytes, 'bytes', `(${((allStrBytes / main.length) * 100).toFixed(1)}% of main script)`);
console.log('literals >200 chars   :', bigCount, 'totalling', bigBytes, 'bytes', `(${((bigBytes / main.length) * 100).toFixed(1)}% of main script)`);
console.log('\ntop 15 largest string literals:');
for (const b of buckets.slice(0, 15)) {
  console.log(String(b.len).padStart(8), '@' + String(b.at).padStart(8), JSON.stringify(b.sample));
}

// --- Where does HTML-ish content live? look for markers of compiled topic HTML ---
console.log('\n=== CONTENT MARKER FREQUENCY in main script ===');
for (const marker of ['<h3', '<p>', '<li>', '<code', '<table', 'class="', 'aria-', 'addEventListener', 'querySelector', 'innerHTML']) {
  const re = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const n = (main.match(re) || []).length;
  console.log(marker.padEnd(20), String(n).padStart(6));
}

// --- Density map: 100 equal slices, report gzip ratio + content guess per slice ---
console.log('\n=== DENSITY MAP (main script in 20 slices) ===');
const N = 20, sliceLen = Math.floor(main.length / N);
for (let i = 0; i < N; i++) {
  const s = main.slice(i * sliceLen, (i + 1) * sliceLen);
  const gz = zlib.gzipSync(Buffer.from(s), { level: 9 }).length;
  const tagDensity = (s.match(/<\/(p|li|h3|h4|td|code|strong|em)>/g) || []).length;
  const jsDensity = (s.match(/(function|=>|const |let |return |addEventListener)/g) || []).length;
  const label = tagDensity > jsDensity * 1.2 ? 'CONTENT' : (jsDensity > tagDensity * 1.2 ? 'CODE' : 'mixed');
  console.log(
    String(i).padStart(2),
    '@' + String(i * sliceLen).padStart(8),
    'gz=' + String(gz).padStart(7),
    'ratio=' + (gz / s.length).toFixed(3),
    'htmlTags=' + String(tagDensity).padStart(5),
    'jsToks=' + String(jsDensity).padStart(5),
    label,
    JSON.stringify(s.slice(0, 48).replace(/\n/g, ' '))
  );
}
