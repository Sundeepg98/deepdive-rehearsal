/* Companion (right rail) audit @1440x900.
   1) Does it appear/fold correctly at each breakpoint?
   2) shell.js:236 `if (TOPIC_CMP_NOTES[tab])` has NO else -> a topic missing cmpNotes
      for a view leaves the PREVIOUS topic's text in the DOM. Detect stale/leaked notes
      by comparing the rendered companion note against the topic's own data. */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.keyboard.press('Escape');

const topics = await p.evaluate(() => TopicRegistry.ids());

// Which topics have cmpNotes for which views? (read the registry data directly)
const dataMap = await p.evaluate((VIEWS) => {
  const out = {};
  TopicRegistry.ids().forEach(id => {
    const t = TopicRegistry.get(id);
    const cn = t && t.identity && t.identity.cmpNotes ? t.identity.cmpNotes : null;
    out[id] = { hasCmpNotes: !!cn, views: cn ? VIEWS.filter(v => !!cn[v]) : [], missing: cn ? VIEWS.filter(v => !cn[v]) : VIEWS.slice() };
  });
  return out;
}, VIEWS);

const noNotes = Object.entries(dataMap).filter(([, v]) => !v.hasCmpNotes).map(([k]) => k);
const partial = Object.entries(dataMap).filter(([, v]) => v.hasCmpNotes && v.missing.length).map(([k, v]) => k + '(missing:' + v.missing.join(',') + ')');
console.log('=== cmpNotes DATA coverage (46 topics x 9 views) ===');
console.log('topics with NO cmpNotes at all :', noNotes.length, noNotes.length ? '-> ' + noNotes.join(', ') : '');
console.log('topics with PARTIAL cmpNotes   :', partial.length, partial.length ? '-> ' + partial.join(' | ') : '');
const full = Object.values(dataMap).filter(v => v.hasCmpNotes && !v.missing.length).length;
console.log('topics with FULL 9/9 cmpNotes  :', full);

/* Now the RENDER test: navigate topic-by-topic in sequence (the real user path) and
   record what the companion actually SHOWS. A leak = rendered note belongs to a
   different topic than the current one. */
console.log('\n=== RENDERED companion note vs the topic that OWNS it ===');
const leaks = [];
// build a reverse index: note text -> owning topic
const noteOwner = await p.evaluate((VIEWS) => {
  const idx = {};
  TopicRegistry.ids().forEach(id => {
    const cn = TopicRegistry.get(id).identity.cmpNotes;
    if (!cn) return;
    VIEWS.forEach(v => { if (cn[v]) idx[cn[v][1]] = id; });
  });
  return idx;
}, VIEWS);

for (const t of topics) {
  for (const v of VIEWS) {
    await p.goto(URL + '#' + t + '/' + v, { waitUntil: 'load' });
    await p.waitForTimeout(160);
    const shown = await p.evaluate(() => {
      const n = document.getElementById('cmpNote');
      const vw = document.getElementById('cmpView');
      return { note: n ? n.textContent.trim() : '', view: vw ? vw.textContent.trim() : '' };
    });
    const owner = noteOwner[shown.note];
    if (owner && owner !== t) leaks.push({ topic: t, view: v, shownNote: shown.note.slice(0, 80), belongsTo: owner });
    else if (!owner && shown.note) { /* generated note, owner unknown -> fine */ }
  }
}
if (leaks.length) {
  console.log('LEAKS (companion shows ANOTHER topic\'s note):', leaks.length);
  leaks.slice(0, 25).forEach(l => console.log(`  ${l.topic}/${l.view}  shows note owned by "${l.belongsTo}": "${l.shownNote}..."`));
} else {
  console.log('  none -- every rendered companion note matched its own topic.');
}
fs.writeFileSync(OUT + '/scripts/_companion.json', JSON.stringify({ dataMap, leaks }, null, 1));
await b.close();
