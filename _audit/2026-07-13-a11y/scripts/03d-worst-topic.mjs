/* "Event-Driven Backbone" was just the topic that happened to load first.
 * How bad does the header get across all 46 topics? Drive the real topic
 * switcher and measure the visible fraction of each name.
 */
import path from 'node:path';
import { launch, phone, installDeep, ensureDirs, save, SHOTS } from './lib.mjs';
ensureDirs();

const b = await launch();
const rows = [];
for (const w of [320, 390]) {
  const p = await phone(b, { width: w, height: 800 });
  await installDeep(p);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(900);

  const names = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.ix-card .ix-c-name')];
    return cards.map((c) => c.textContent.trim());
  });
  // walk every topic with the "next topic" button and measure the header each time
  const n = await p.evaluate(() => document.querySelectorAll('.ix-card').length);
  for (let i = 0; i < n; i++) {
    const m = await p.evaluate(() => {
      const cur = document.querySelector('#tncurrent');
      return {
        name: cur.textContent.trim(),
        clientW: cur.clientWidth, scrollW: cur.scrollWidth,
        frac: cur.scrollWidth ? cur.clientWidth / cur.scrollWidth : 1,
      };
    });
    rows.push({ w, ...m, visiblePct: Math.round(m.frac * 100) });
    await p.evaluate(() => document.querySelector('#tnnext')?.click());
    await p.waitForTimeout(230);
  }
  await p.context().close();
}
await b.close();

for (const w of [320, 390]) {
  const set = rows.filter((r) => r.w === w);
  const cut = set.filter((r) => r.scrollW > r.clientW + 1);
  set.sort((a, c) => a.frac - c.frac);
  console.log(`\n===== ${w}px : ${cut.length}/${set.length} topic names are TRUNCATED in the header =====`);
  console.log('  worst 8:');
  for (const r of set.slice(0, 8)) {
    console.log(`    ${String(r.visiblePct).padStart(3)}% visible  (${r.clientW}px of ${r.scrollW}px)   "${r.name}"`);
  }
  const full = set.filter((r) => r.scrollW <= r.clientW + 1);
  console.log(`  fully visible: ${full.length}${full.length ? ' -> ' + full.map((f) => '"' + f.name + '"').join(', ') : ''}`);
}
save('03d-worst-topic.json', rows);
