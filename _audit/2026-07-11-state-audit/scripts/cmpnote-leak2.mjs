// LENS: topic-inventory -- the companion-rail stale-note bug, both manifestations.
// shell.js:237  `if (TOPIC_CMP_NOTES[tab]) { ...write... }`  -- no else -> rail keeps prior text.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/topic-inventory';
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(500);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// exact note-text -> "topic/pane" that OWNS it
const owner = await p.evaluate(() => {
  const m = {};
  TopicRegistry.ids().forEach(id => {
    const cn = (TopicRegistry.get(id).identity || {}).cmpNotes || {};
    Object.keys(cn).forEach(v => { m[cn[v][1]] = id + '/' + v; });
  });
  return m;
});
const railNote = () => p.evaluate(() => (document.getElementById('cmpNote') || {}).textContent || '');
const goto_ = async (t, v) => { await p.evaluate(([a, b2]) => { window.location.hash = '#' + a + '/' + b2; }, [t, v]); await p.waitForTimeout(280); };

console.log('=== MANIFESTATION A: wrong-PANE note (rail shows another pane\'s coaching copy) ===');
let wrongPane = 0, sampled = 0;
for (const topic of ['caching', 'slos', 'multi-tenant']) {
  for (const v of VIEWS) {
    await goto_(topic, v);
    const src = owner[await railNote()] || '(unknown)';
    const ok = src === topic + '/' + v;
    sampled++; if (!ok) wrongPane++;
    if (!ok) console.log(`  ${topic}/${v}`.padEnd(26), '-> rail shows', src.padEnd(24), 'MISMATCH');
  }
}
console.log(`  ${wrongPane}/${sampled} sampled pane-views show a note that is NOT the (topic,pane) note.`);

console.log('');
console.log('=== MANIFESTATION B: wrong-TOPIC note (switch topic while on an uncovered pane) ===');
// realistic path: read topic A's System Map, then switch to topic B via the registry.
for (const [a, bb] of [['content-pipeline', 'caching'], ['authz', 'kafka-internals'], ['notifications', 'slos']]) {
  await goto_(a, 'sys');
  const noteA = await railNote();
  await p.evaluate((t) => TopicRegistry.setTopic(t), bb);   // switch topic, STAY on sys
  await p.waitForTimeout(400);
  const noteB = await railNote();
  const src = owner[noteB] || '(unknown)';
  console.log(`  on 'sys': ${a} -> ${bb}`.padEnd(42), noteB === noteA ? `RAIL UNCHANGED, still ${src}  *** LEAK ***` : 'updated');
}

console.log('');
console.log('=== the leaked text a user actually reads on caching/sys ===');
await goto_('content-pipeline', 'sys');
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(500);
const shown = await p.evaluate(() => ({
  h1: (document.querySelector('.hdr h1') || {}).textContent,
  view: (document.getElementById('cmpView') || {}).textContent,
  note: (document.getElementById('cmpNote') || {}).textContent,
  move: (document.getElementById('cmpMove') || {}).textContent,
}));
console.log('  topic H1   :', shown.h1);
console.log('  rail view  :', shown.view);
console.log('  rail note  :', shown.note);
console.log('  rail move  :', shown.move);
await p.screenshot({ path: `${SHOTS}/cmpnote-leak-caching-sys.png`, clip: { x: 990, y: 330, width: 290, height: 280 } });
await b.close();
