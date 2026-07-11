/* The compiler (tools/compiler/parse_md.mjs:225) takes the ENTIRE "-> ..." line in a
   sys pivot as the chip text. .piv .chip is white-space:nowrap + flex:none, so a long
   line can never wrap or shrink -> it blows horizontally out of the viewport.
   Measure the chip line length for every markdown-authored topic. */
import fs from 'fs';
import path from 'path';
const dir = 'src/topics-md';
const rows = [];
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md'))) {
  const topic = f.replace(/\.md$/, '');
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = src.split(/\r?\n/);
  // find the sys section, then every "-> " / "→ " line inside it
  let inSys = false;
  lines.forEach((ln, i) => {
    if (/^##\s+/.test(ln)) inSys = /system\s*map|^##\s*sys\b/i.test(ln);
    if (!inSys) return;
    const m = /^\s*(->|→)\s*(.+)$/.exec(ln);
    if (m) rows.push({ topic, line: i + 1, len: m[2].length, chip: m[2] });
  });
}
rows.sort((a, b) => b.len - a.len);
console.log('markdown-authored sys chips found:', rows.length, 'across', new Set(rows.map(r => r.topic)).size, 'topics');
console.log('\n=== LONGEST (these blow out horizontally: nowrap + flex:none) ===');
rows.slice(0, 18).forEach(r => console.log(String(r.len).padStart(4) + 'ch  ' + (r.topic + ':' + r.line).padEnd(38) + JSON.stringify(r.chip.slice(0, 110))));
const buckets = { 'A <=25 (fits a chip)': 0, 'B 26-40': 0, 'C 41-80': 0, 'D >80 (severe blowout)': 0 };
rows.forEach(r => { const k = r.len <= 25 ? 'A <=25 (fits a chip)' : r.len <= 40 ? 'B 26-40' : r.len <= 80 ? 'C 41-80' : 'D >80 (severe blowout)'; buckets[k]++; });
console.log('\n=== distribution ===');
Object.entries(buckets).forEach(([k, v]) => console.log(' ', k.padEnd(24), v));
const bad = [...new Set(rows.filter(r => r.len > 40).map(r => r.topic))].sort();
console.log('\n=== TOPICS with >=1 chip over 40 chars (will overflow): ' + bad.length + ' ===');
console.log(bad.join(', '));
const severe = [...new Set(rows.filter(r => r.len > 80).map(r => r.topic))].sort();
console.log('\n=== SEVERE (>80 chars): ' + severe.length + ' topics ===');
console.log(severe.join(', '));
