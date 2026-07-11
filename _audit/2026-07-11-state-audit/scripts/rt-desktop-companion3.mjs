/* The REAL user path: switch topic in-session (no reload), as the topic-index overlay does.
   Does the companion keep the PREVIOUS topic's note when the new topic lacks one for the view? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

const read = () => p.evaluate(() => ({
  topic: TopicRegistry.current().id,
  tab: document.querySelector('.sidebar .seg button.on').dataset.tab,
  cmpView: document.getElementById('cmpView').textContent.trim(),
  cmpNote: document.getElementById('cmpNote').textContent.trim().slice(0, 95),
  cmpMove: document.getElementById('cmpMove').textContent.trim().slice(0, 80)
}));

// Land on authz (hand-authored, HAS a sys note), view = sys
await p.goto(URL + '#authz/sys', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
console.log('STEP 1 -- on authz/sys (authz OWNS a sys note):');
console.log(' ', JSON.stringify(await read(), null, 1).replace(/\n/g, '\n  '));
await p.screenshot({ path: SHOTS + '/companion-step1-authz-sys.png' });

// Now switch topic IN-SESSION to caching (which has NO sys note) -- the real path
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(700);
const after = await read();
console.log('\nSTEP 2 -- switched to caching IN-SESSION, still on the sys tab:');
console.log(' ', JSON.stringify(after, null, 1).replace(/\n/g, '\n  '));
await p.screenshot({ path: SHOTS + '/companion-step2-caching-sys-LEAK.png' });

const leaked = /authorization sits between/.test(after.cmpNote);
console.log('\n>>> CROSS-TOPIC LEAK:', leaked ? 'YES -- the companion still shows AUTHZ\'s System Map note while the topic is CACHING' : 'no');
console.log('>>> cmpMove still shows:', JSON.stringify(after.cmpMove));

// how many (topic,view) pairs are affected overall?
const stat = await p.evaluate(() => {
  const VIEWS = ['walk','drill','wb','sys','trade','model','num','rf','open'];
  let miss = 0, tot = 0;
  TopicRegistry.ids().forEach(id => {
    const cn = TopicRegistry.get(id).identity.cmpNotes || {};
    VIEWS.forEach(v => { tot++; if (!cn[v]) miss++; });
  });
  return { miss, tot, topics: TopicRegistry.ids().length };
});
console.log('\n>>> COVERAGE: ' + stat.miss + ' of ' + stat.tot + ' (topic,view) pairs across ' + stat.topics + ' topics have NO companion note');
console.log('    -> ' + (100 * stat.miss / stat.tot).toFixed(1) + '% of the companion panel\'s "THIS VIEW" surface is stale or wrong.');
await b.close();
