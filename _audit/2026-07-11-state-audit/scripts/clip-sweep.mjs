import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(700);
const topics = await p.evaluate(() => TopicRegistry.ids());
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const hits = [];
for (const t of topics) {
  for (const pane of PANES) {
    await p.evaluate(h => { location.hash = h; }, `#${t}/${pane}`);
    await p.waitForTimeout(190);
    const r = await p.evaluate(() => {
      const stage = document.querySelector('main.stage');
      const over = stage.scrollWidth - stage.clientWidth;
      if (over <= 1) return { over: 0 };
      // deepest leaf that sticks out past the stage's content box
      const sr = stage.getBoundingClientRect();
      const all = [];
      const walk = n => { for (const e of n.querySelectorAll('*')) { all.push(e); if (e.shadowRoot) walk(e.shadowRoot); } };
      walk(stage);
      let worst = null;
      for (const e of all) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const bb = e.getBoundingClientRect();
        if (bb.width <= 0 || bb.height <= 0) continue;
        const past = bb.right - sr.right;
        if (past > 1 && (!worst || past > worst.past)) {
          worst = {
            past: +past.toFixed(1),
            sel: e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''),
            ws: cs.whiteSpace,
            txt: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48)
          };
        }
      }
      return { over, worst };
    });
    if (r.over > 1) hits.push({ topic: t, pane, over: r.over, ...(r.worst || {}) });
  }
}
await b.close();
writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/clip-sweep.json', JSON.stringify(hits, null, 2));

console.log(`CONTENT CLIPPED by .stage{overflow-x:hidden} at 360px width`);
console.log(`states affected: ${hits.length} / ${topics.length * PANES.length} (${topics.length} topics x 9 panes)\n`);
const byPane = {};
for (const h of hits) (byPane[h.pane] ||= []).push(h);
console.log('by pane:');
for (const pane of PANES) {
  const hs = byPane[pane] || [];
  if (hs.length) console.log(`  ${pane.padEnd(6)} ${String(hs.length).padStart(2)}/${topics.length} topics   worst +${Math.max(...hs.map(x => x.over))}px`);
  else console.log(`  ${pane.padEnd(6)}  0/${topics.length} topics   clean`);
}
console.log('\nby offending element class:');
const bySel = {};
for (const h of hits) { const k = h.sel || '?'; (bySel[k] ||= []).push(h.over); }
Object.entries(bySel).sort((a, b) => b[1].length - a[1].length).forEach(([s, arr]) =>
  console.log(`  ${String(arr.length).padStart(3)}x  ${s.padEnd(24)} worst +${Math.max(...arr)}px`));
console.log('\nworst 12 states:');
[...hits].sort((a, b) => b.over - a.over).slice(0, 12).forEach(h =>
  console.log(`  +${String(h.over).padStart(4)}px  ${h.topic}/${h.pane}  ${h.sel} (ws=${h.ws})  "${h.txt}"`));
