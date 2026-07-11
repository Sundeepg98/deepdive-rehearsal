// LENS: topic-inventory -- prove the companion-rail stale-note leak (shell.js:237, no else branch).
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/topic-inventory';
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(500);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// Which topic does each rail note actually BELONG to? Build a reverse map from every
// topic's identity.cmpNotes so we can attribute the rendered text to its true owner.
const owner = await p.evaluate(() => {
  const m = {};
  TopicRegistry.ids().forEach(id => {
    const cn = (TopicRegistry.get(id).identity || {}).cmpNotes || {};
    Object.keys(cn).forEach(v => { m[cn[v][1]] = id + '/' + v; });   // note-text -> owning topic/view
  });
  return m;
});

const rows = [];
for (const topic of ['caching', 'kafka-internals', 'slos', 'multi-tenant']) {
  for (const v of VIEWS) {
    await p.evaluate(([t, vv]) => { window.location.hash = '#' + t + '/' + vv; }, [topic, v]);
    await p.waitForTimeout(260);
    const r = await p.evaluate(() => ({
      view: (document.getElementById('cmpView') || {}).textContent || '',
      note: (document.getElementById('cmpNote') || {}).textContent || '',
      has: !!(typeof TOPIC_CMP_NOTES !== 'undefined' && TOPIC_CMP_NOTES[(document.querySelector('.seg button.on') || {}).getAttribute?.('data-tab')]),
    }));
    const src = owner[r.note] || '(unknown)';
    const own = src.split('/')[0] === topic;
    rows.push({ topic, v, ownNote: own, railView: r.view, from: src });
  }
}
console.log('topic            pane   rail-heading          note-actually-belongs-to   OWN?');
rows.forEach(r => console.log(
  r.topic.padEnd(16), r.v.padEnd(6), (r.railView || '(blank)').slice(0, 20).padEnd(21), r.from.padEnd(26), r.ownNote ? 'yes' : '*** NO -- STALE ***'
));
const bad = rows.filter(r => !r.ownNote);
console.log('');
console.log('STALE rail notes:', bad.length, '/', rows.length, 'pane-views sampled');
console.log('All stale notes sourced from:', [...new Set(bad.map(r => r.from))].join(', '));

// screenshot the smoking gun: caching/sys showing content-pipeline's note
await p.evaluate(() => { window.location.hash = '#caching/sys'; });
await p.waitForTimeout(600);
await p.locator('.cmp, aside, [id^=cmp]').first().screenshot({ path: `${SHOTS}/cmpnote-leak-caching-sys.png` }).catch(async () => {
  await p.screenshot({ path: `${SHOTS}/cmpnote-leak-caching-sys.png`, clip: { x: 990, y: 330, width: 290, height: 260 } });
});
await b.close();
