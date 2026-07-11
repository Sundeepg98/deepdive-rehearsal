import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1200);
const r = await p.evaluate(() => {
  const R = window.TopicRegistry, ids = R.ids();
  const strip = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;|&#\d+;/gi, ' ');
  const out = [];
  for (const id of ids) {
    const t = R.get(id);
    const cards = ((t.data || {}).drill || {}).cards || [];
    const L = cards.map(c => strip(c.a).trim().length).filter(x => x > 0);
    L.sort((a, b) => a - b);
    out.push({
      id, idx: (t.identity || {}).index,
      min: L[0], med: L[Math.floor(L.length / 2)], max: L[L.length - 1],
      avgWords: Math.round(L.reduce((a, b) => a + b, 0) / L.length / 5.6),
      over1200: L.filter(x => x > 1200).length,
      under250: L.filter(x => x < 250).length
    });
  }
  return out;
});
const ORIG = new Set(['content-pipeline', 'signing', 'authz', 'notifications', 'iac', 'aws-hardening', 'desired-state', 'eav']);
r.sort((a, b) => a.idx - b.idx);
console.log('DRILL ANSWER LENGTH (chars) — one "flashcard" answer');
console.log('idx  id                        src   min   med    max   ~words  >1200ch  <250ch');
for (const x of r) console.log(
  `${String(x.idx).padStart(3)}  ${x.id.padEnd(24)} ${(ORIG.has(x.id) ? 'ORIG' : 'md  ')}  ${String(x.min).padStart(4)}  ${String(x.med).padStart(4)}  ${String(x.max).padStart(5)}   ${String(x.avgWords).padStart(4)}    ${String(x.over1200).padStart(4)}    ${String(x.under250).padStart(4)}`);

const O = r.filter(x => ORIG.has(x.id)), M = r.filter(x => !ORIG.has(x.id));
const A = (a, k) => Math.round(a.reduce((s, x) => s + x[k], 0) / a.length);
console.log(`\nORIG(8): med=${A(O, 'med')} max=${A(O, 'max')} ~words=${A(O, 'avgWords')} cards>1200ch=${O.reduce((s, x) => s + x.over1200, 0)}`);
console.log(`MD(38) : med=${A(M, 'med')} max=${A(M, 'max')} ~words=${A(M, 'avgWords')} cards>1200ch=${M.reduce((s, x) => s + x.over1200, 0)}`);
const early = M.filter(x => x.idx <= 18), late = M.filter(x => x.idx >= 40);
console.log(`\nMD EARLY batch (idx 9-18, n=${early.length}): median answer=${A(early, 'med')} chars (~${A(early, 'avgWords')} words)`);
console.log(`MD LATE  batch (idx 40-46, n=${late.length}): median answer=${A(late, 'med')} chars (~${A(late, 'avgWords')} words)`);
console.log(`=> intra-corpus spread: ${(A(late, 'med') / A(early, 'med')).toFixed(1)}x`);
const worst = [...r].sort((a, b) => b.max - a.max)[0];
console.log(`\nLongest single drill answer: ${worst.id} = ${worst.max} chars (~${Math.round(worst.max / 5.6)} words) on ONE flashcard`);
console.log(`Cards >1200 chars corpus-wide: ${r.reduce((s, x) => s + x.over1200, 0)}`);
await b.close();
