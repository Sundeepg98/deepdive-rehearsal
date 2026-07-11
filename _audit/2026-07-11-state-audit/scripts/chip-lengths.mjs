import fs from 'fs';
import path from 'path';
const dir = 'src/topics';
const rows = [];
for (const t of fs.readdirSync(dir)) {
  const f = path.join(dir, t, 'sys.js');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const re = /chip:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) {
    const raw = m[1];
    // decode the \uXXXX escapes so the length is the RENDERED length
    const txt = raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&mdash;/g, '—').replace(/&rarr;/g, '→').replace(/&amp;/g, '&');
    rows.push({ topic: t, len: txt.length, chip: txt });
  }
}
rows.sort((a, b) => b.len - a.len);
console.log('total chips:', rows.length, '| topics with sys.js:', new Set(rows.map(r => r.topic)).size);
console.log('\n=== LONGEST CHIPS (rendered chars) ===');
rows.slice(0, 16).forEach(r => console.log(String(r.len).padStart(4), r.topic.padEnd(26), JSON.stringify(r.chip)));
const buckets = {};
rows.forEach(r => { const b = r.len <= 25 ? 'A <=25 (fits)' : r.len <= 40 ? 'B 26-40' : r.len <= 60 ? 'C 41-60' : 'D >60 (blowout)'; buckets[b] = (buckets[b] || 0) + 1; });
console.log('\n=== length distribution ===');
Object.keys(buckets).sort().forEach(k => console.log(' ', k, '=', buckets[k]));
const bad = [...new Set(rows.filter(r => r.len > 40).map(r => r.topic))];
console.log('\n=== topics with >=1 chip over 40 chars:', bad.length, '===');
console.log(bad.join(', '));
