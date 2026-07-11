/* Careful verification of the companion stale-note bug.
   Compare, per (topic,view): the topic's OWN cmpNotes entry vs what is RENDERED. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

// 0) what does index.html SEED the companion with?
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1400);
await p.keyboard.press('Escape');
const seed = await p.evaluate(() => ({
  view: document.getElementById('cmpView').textContent.trim(),
  note: document.getElementById('cmpNote').textContent.trim().slice(0, 100),
  currentTopic: TopicRegistry.current().id
}));
console.log('=== companion at FIRST LOAD (default topic = ' + seed.currentTopic + ') ===');
console.log('  cmpView:', seed.view, '\n  cmpNote:', seed.note);

// Does 'event-driven' (the default) own that note? Who does?
const owner = await p.evaluate((noteTxt) => {
  let own = null;
  TopicRegistry.ids().forEach(id => {
    const cn = TopicRegistry.get(id).identity.cmpNotes || {};
    Object.keys(cn).forEach(v => { if (cn[v][1].slice(0, 100) === noteTxt) own = id + '/' + v; });
  });
  return own;
}, seed.note);
console.log('  that note text is OWNED BY:', owner);

// 1) Per (topic,view): does the topic define the note, and does the render match?
console.log('\n=== STALE-NOTE CHECK: topic has no cmpNotes[view] -> what renders? ===');
const rows = [];
for (const t of ['caching', 'kafka-internals', 'observability', 'api-design', 'notifications']) {
  for (const v of VIEWS) {
    await p.goto(URL + '#' + t + '/' + v, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    const r = await p.evaluate((args) => {
      const [topic, view] = args;
      const own = TopicRegistry.get(topic).identity.cmpNotes || {};
      const has = !!own[view];
      const rendered = document.getElementById('cmpNote').textContent.trim();
      const renderedView = document.getElementById('cmpView').textContent.trim();
      // find who owns the RENDERED text
      let ownerId = null;
      TopicRegistry.ids().forEach(id => {
        const cn = TopicRegistry.get(id).identity.cmpNotes || {};
        Object.keys(cn).forEach(vv => { if (cn[vv][1] === rendered && !ownerId) ownerId = id + '/' + vv; });
      });
      return { has, expected: has ? own[view][1] : null, rendered, renderedView, ownerOfRendered: ownerId };
    }, [t, v]);
    const correct = r.has ? (r.rendered === r.expected) : false;
    rows.push({ topic: t, view: v, hasOwnNote: r.has, correct, renderedView: r.renderedView, ownerOfRendered: r.ownerOfRendered, rendered: r.rendered.slice(0, 62) });
  }
}
rows.forEach(r => {
  const status = r.hasOwnNote ? (r.correct ? 'OK  ' : 'WRONG') : 'NO-OWN-NOTE';
  console.log(`  ${(r.topic + '/' + r.view).padEnd(30)} ${status.padEnd(12)} cmpView shows "${r.renderedView}"  note-owner=${r.ownerOfRendered || '(generated/unknown)'}`);
});

const stale = rows.filter(r => !r.hasOwnNote);
console.log('\n  -> ' + stale.length + ' of ' + rows.length + ' sampled (topic,view) pairs have NO cmpNotes entry.');
const mismatch = stale.filter(r => r.ownerOfRendered && r.ownerOfRendered.split('/')[0] !== r.topic);
console.log('  -> of those, ' + mismatch.length + ' render ANOTHER topic\'s note (confirmed cross-topic leak).');
const headerMismatch = rows.filter(r => !r.hasOwnNote);
console.log('\n  Note: also check whether cmpView (the view NAME) is stale -- it should track the active tab.');
headerMismatch.slice(0, 12).forEach(r => console.log(`    ${r.topic}/${r.view}: cmpView renders "${r.renderedView}"  (active tab is "${r.view}")`));

// screenshot the smoking gun
await p.goto(URL + '#observability/rf', { waitUntil: 'load' });
await p.waitForTimeout(700);
await p.screenshot({ path: SHOTS + '/companion-stale-observability-rf.png' });
console.log('\n[shot: companion-stale-observability-rf.png]');
await b.close();
