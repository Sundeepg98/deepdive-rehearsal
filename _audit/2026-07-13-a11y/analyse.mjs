import { readFileSync } from 'fs';
const { findings, coverage, skipped } = JSON.parse(readFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/axe-findings.json', 'utf8'));

const V = findings.filter(f => f.bucket === 'violations');
const I = findings.filter(f => f.bucket === 'incomplete');

console.log('======== VIOLATIONS (' + V.length + ') ========');
const vg = {};
for (const f of V) {
  const k = `${f.rule} | ${f.impact} | ${f.target}`;
  (vg[k] ||= { ...f, ctx: [] }).ctx.push(`${f.room}/${f.theme}/${f.surface}`);
}
for (const [k, f] of Object.entries(vg)) {
  console.log(`\n[${f.impact}] ${f.rule}  x${f.ctx.length} contexts`);
  console.log(`  help   : ${f.help}`);
  console.log(`  target : ${f.target}`);
  console.log(`  html   : ${f.html}`);
  console.log(`  msg    : ${f.msg}`);
  const rooms = [...new Set(f.ctx.map(c => c.split('/')[0]))];
  const themes = [...new Set(f.ctx.map(c => c.split('/')[1]))];
  const surfs = [...new Set(f.ctx.map(c => c.split('/')[2]))];
  console.log(`  rooms  : ${rooms.length}/6 -> ${rooms.join(', ')}`);
  console.log(`  themes : ${themes.join(', ')}`);
  console.log(`  surfaces: ${surfs.join(', ')}`);
}

console.log('\n\n======== INCOMPLETE by rule ========');
const ir = {};
for (const f of I) ir[f.rule] = (ir[f.rule] || 0) + 1;
for (const [r, n] of Object.entries(ir).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${r}`);

console.log('\n======== color-contrast INCOMPLETE: why axe bailed ========');
const cc = I.filter(f => f.rule === 'color-contrast');
const why = {};
for (const f of cc) why[f.msg] = (why[f.msg] || 0) + 1;
for (const [m, n] of Object.entries(why).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${m}`);
console.log(`  ---- color-contrast VIOLATIONS (successfully evaluated + failed): ${V.filter(f => f.rule === 'color-contrast').length}`);

console.log('\n======== ROOM-VARIANCE test ========');
console.log('A finding present in some rooms but absent in others is, by construction, CAUSED BY');
console.log('the room system (the room is the only thing that differs). Room-invariant findings are not.');
const byKey = {};
for (const f of findings) {
  const k = `${f.bucket}|${f.rule}|${f.surface}|${f.target}`;
  (byKey[k] ||= new Set()).add(f.room + '/' + f.theme);
}
let variant = 0, invariant = 0;
const variантList = [];
for (const [k, set] of Object.entries(byKey)) {
  // a surface is scanned in 12 contexts (6 rooms x 2 themes)
  if (set.size < 12) { variant++; variантList.push({ k, n: set.size, ctx: [...set] }); }
  else invariant++;
}
console.log(`  room/theme-INVARIANT findings (present in all 12 contexts): ${invariant}`);
console.log(`  room/theme-VARIANT   findings (present in <12 contexts)   : ${variant}`);
console.log('\n  --- variant findings (candidates CAUSED by the room system) ---');
for (const v of variантList.sort((a, b) => a.n - b.n).slice(0, 25)) {
  console.log(`   [${v.n}/12] ${v.k.slice(0, 120)}`);
  console.log(`            in: ${v.ctx.join(', ')}`);
}

console.log('\n======== SKIPPED ========');
console.log(JSON.stringify(skipped, null, 2));
console.log('\n======== COVERAGE ========');
console.log('surfaces scanned:', coverage.length);
const surfs = [...new Set(coverage.map(c => c.surface))];
console.log('distinct surfaces:', surfs.length, '->', surfs.join(', '));
