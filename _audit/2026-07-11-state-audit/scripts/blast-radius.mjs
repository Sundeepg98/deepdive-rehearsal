import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();

// One context per viewport; walk all 46 topics; record doc scrollWidth + whether #tnnext is on-screen.
const VPS = [[320, 568], [360, 640], [390, 844], [414, 896], [430, 932]]; // 430 = iPhone 16 Pro Max (widest common phone)
const table = {};
let topics = [];

for (const [w, h] of VPS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  topics = await p.evaluate(() => TopicRegistry.ids());

  const rows = [];
  for (const t of topics) {
    await p.evaluate(id => { location.hash = '#' + id + '/walk'; }, t);
    await p.waitForTimeout(230);
    const m = await p.evaluate(() => {
      const de = document.documentElement;
      const nx = document.getElementById('tnnext');
      const r = nx.getBoundingClientRect();
      return {
        name: document.getElementById('tncurrent').textContent.trim(),
        cw: de.clientWidth, sw: de.scrollWidth,
        over: de.scrollWidth - de.clientWidth,
        nextLeft: +r.left.toFixed(1), nextRight: +r.right.toFixed(1),
        nextOffscreen: r.right > de.clientWidth + 0.5
      };
    });
    rows.push({ topic: t, ...m });
  }
  table[`${w}`] = rows;
  const bad = rows.filter(r => r.over > 0);
  const lost = rows.filter(r => r.nextOffscreen);
  console.log(`\n===== ${w}px =====`);
  console.log(`  topics with horizontal overflow : ${bad.length}/${rows.length}   (max +${Math.max(0, ...rows.map(r => r.over))}px)`);
  console.log(`  topics where the "next topic" ›  button is off-screen: ${lost.length}/${rows.length}`);
  const worst = [...rows].sort((a, b) => b.over - a.over).slice(0, 4);
  worst.forEach(r => console.log(`    worst: "${r.name}" over=+${r.over}px  (nextBtn x=${r.nextLeft}..${r.nextRight}, screen=${r.cw})`));
  const clean = rows.filter(r => r.over === 0).slice(0, 3);
  if (clean.length) console.log(`    clean examples: ${clean.map(r => '"' + r.name + '"').join(', ')}`);
  await ctx.close();
}
await b.close();
writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/blast-radius.json', JSON.stringify(table, null, 2));

console.log('\n\n===== SUMMARY: topics overflowing, by viewport =====');
for (const [w, rows] of Object.entries(table)) {
  const bad = rows.filter(r => r.over > 0).length;
  const lost = rows.filter(r => r.nextOffscreen).length;
  console.log(`  ${w}px: ${bad}/46 topics overflow | ${lost}/46 lose the › next-topic button`);
}
