/* Ground truth: for EVERY registered topic, open #<topic>/sys at 1280x800 and
   measure every .piv .chip rect inside deep-system-map's shadow root. */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const SHOTS = OUT + '/shots/rt-desktop';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

const topics = await p.evaluate(() => (window.TopicRegistry && TopicRegistry.ids) ? TopicRegistry.ids() : [...document.querySelectorAll('.tn-item[data-topic]')].map(e => e.dataset.topic));
console.log('registered topics:', topics.length);

const results = [];
for (const t of topics) {
  await p.goto(URL + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(420);
  const r = await p.evaluate(() => {
    const host = document.querySelector('deep-system-map');
    if (!host || !host.shadowRoot) return { err: 'no host' };
    const chips = [...host.shadowRoot.querySelectorAll('.chip')];
    const vw = window.innerWidth;
    return {
      vw,
      chips: chips.map(c => {
        const r2 = c.getBoundingClientRect();
        return { text: c.textContent.trim(), chars: c.textContent.trim().length, w: Math.round(r2.width), right: Math.round(r2.right), over: Math.round(r2.right - vw) };
      })
    };
  });
  const worst = (r.chips || []).reduce((m, c) => (!m || c.over > m.over) ? c : m, null);
  results.push({ topic: t, chipCount: (r.chips || []).length, worst });
}
await b.close();

fs.writeFileSync(OUT + '/scripts/_chips.json', JSON.stringify(results, null, 1));

const over = results.filter(r => r.worst && r.worst.over > 0);
console.log('\n=== TOPICS WHOSE sys PANE CHIP ESCAPES THE VIEWPORT @1280 ===');
console.log('affected: ' + over.length + ' / ' + results.length + ' topics\n');
over.sort((a, b2) => b2.worst.over - a.worst.over).forEach(r => {
  console.log(`  ${r.topic.padEnd(28)} chipW=${String(r.worst.w).padStart(5)}px  right=${String(r.worst.right).padStart(5)}  OVER=+${String(r.worst.over).padStart(4)}px  (${r.worst.chars} chars)`);
  console.log(`      "${r.worst.text.slice(0, 105)}${r.worst.text.length > 105 ? '...' : ''}"`);
});
const clean = results.filter(r => !r.worst || r.worst.over <= 0);
console.log('\n=== CLEAN topics (' + clean.length + ') ===');
console.log(clean.map(r => r.topic).join(', '));
// widest chip overall
const all = results.filter(r => r.worst).sort((a, b2) => b2.worst.w - a.worst.w);
console.log('\nwidest chip overall:', all[0].topic, all[0].worst.w + 'px', '(' + all[0].worst.chars + ' chars)');
