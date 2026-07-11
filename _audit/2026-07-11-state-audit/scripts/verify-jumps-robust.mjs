// ROBUST spurious-jump measurement: poll until the shadow DOM actually reflects the target
// topic (render lags setTopic), THEN read. Also measures chip overflow correctly
// (chip box width vs its containing card), not chip.scrollWidth vs chip.clientWidth.
import { chromium } from 'playwright';
const LEGACY = ['content-pipeline','signing','authz','aws-hardening','notifications','eav','desired-state','iac'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="sys"]').click());

const ids = await p.evaluate(() => TopicRegistry.ids());
const out = [];
for (const id of ids) {
  await p.evaluate(i => TopicRegistry.setTopic(i), id);
  // DETERMINISTIC WAIT: poll until the rendered first pivot question === this topic's data
  const ok = await p.waitForFunction((tid) => {
    const t = TopicRegistry.get(tid);
    const el = document.querySelector('deep-system-map');
    if (!el || !el.shadowRoot) return false;
    const pq = el.shadowRoot.querySelector('.pq');
    const want = t.data.sys.pivots[0] ? t.data.sys.pivots[0].q : null;
    if (!want) return true;
    return pq && pq.textContent === want;
  }, id, { timeout: 5000 }).then(() => true).catch(() => false);

  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-system-map').shadowRoot;
    const jumps = [...sr.querySelectorAll('.piv-jump')].map(j => ({ len: j.textContent.length, to: j.getAttribute('data-goto') }));
    const chips = [...sr.querySelectorAll('details.piv')].map(d => {
      const c = d.querySelector('.chip');
      const card = d.getBoundingClientRect();
      const cb = c.getBoundingClientRect();
      return { chipW: Math.round(c.scrollWidth), cardW: Math.round(card.width), len: c.textContent.length, overflows: c.scrollWidth > card.width };
    });
    return { jumps, chips, cur: TopicRegistry.current().id };
  });
  out.push({ id, settled: ok, ...r });
}

const md = out.filter(o => !LEGACY.includes(o.id));
const lg = out.filter(o => LEGACY.includes(o.id));
console.log('settled OK:', out.filter(o => o.settled).length, '/', out.length);
console.log('cur mismatch (stale read):', out.filter(o => o.cur !== o.id).length);

console.log('\n=== SPURIOUS JUMP BUTTONS (markdown, deterministic) ===');
const withJump = md.filter(o => o.jumps.length);
console.log(`markdown topics rendering a .piv-jump: ${withJump.length} / ${md.length}`);
withJump.forEach(o => o.jumps.forEach(j => console.log(`  ${o.id.padEnd(22)} -> ${String(j.to).padEnd(20)} button label = ${j.len} chars`)));

console.log('\n=== CONTROL: legacy jump buttons ===');
lg.forEach(o => console.log(`  ${o.id.padEnd(22)} ${o.jumps.length} buttons, label lens = [${o.jumps.map(j => j.len).join(',')}]`));

console.log('\n=== CHIP OVERFLOW (chip box wider than its card) ===');
const mdChips = md.flatMap(o => o.chips);
const lgChips = lg.flatMap(o => o.chips);
console.log(`markdown pivots whose chip box OVERFLOWS the card: ${mdChips.filter(c => c.overflows).length} / ${mdChips.length}`);
console.log(`legacy   pivots whose chip box OVERFLOWS the card: ${lgChips.filter(c => c.overflows).length} / ${lgChips.length}`);
console.log(`markdown chip widths: min=${Math.min(...mdChips.map(c => c.chipW))}px max=${Math.max(...mdChips.map(c => c.chipW))}px  (card ~${mdChips[0].cardW}px)`);
console.log(`legacy   chip widths: min=${Math.min(...lgChips.map(c => c.chipW))}px max=${Math.max(...lgChips.map(c => c.chipW))}px`);
console.log(`markdown chip text lens: min=${Math.min(...mdChips.map(c => c.len))} max=${Math.max(...mdChips.map(c => c.len))}`);

await b.close();
