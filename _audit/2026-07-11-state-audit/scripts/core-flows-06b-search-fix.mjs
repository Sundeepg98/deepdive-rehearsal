/* LENS: core flows — SEARCH, scoped to the real overlay root (#_search-overlay) */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => IndexOverlay.close());
await p.waitForTimeout(400);

async function search(q) {
  await p.evaluate(() => { if (!SearchOverlay.isOpen()) SearchOverlay.open(); });
  await p.waitForTimeout(250);
  const inp = p.locator('#_search-overlay input');
  await inp.fill('');
  await inp.fill(q);
  await p.waitForTimeout(350);
  return await p.evaluate(() => {
    const ov = document.getElementById('_search-overlay');
    const results = ov.firstElementChild.children[1];   // box > [header, resultsEl]
    const btns = [...results.querySelectorAll('button')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
    const headers = [...results.children].filter(c => c.tagName !== 'BUTTON').map(c => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return { n: btns.length, btns, headers, raw: results.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) };
  });
}

const QUERIES = [
  ['caching', 'exact topic title word'],
  ['cache invalidation', 'MULTI-WORD, title + body'],
  ['exactly once', 'multi-word concept'],
  ['kafka', 'topic name'],
  ['rate limit token bucket', '4-token multi-word'],
  ['consistent hashing', 'exact topic title (2 words)'],
  ['thundering herd', 'a term inside a topic BODY'],
  ['bloom filter', 'body term (probabilistic structures)'],
  ['drill', 'a VIEW, not a topic'],
  ['circut braker', 'TYPO -> did you mean?'],
  ['cachng', 'TYPO -> did you mean?'],
  ['idempotncy', 'TYPO -> did you mean?'],
  ['zzzzqqq', 'nonsense -> empty state'],
];

for (const [q, why] of QUERIES) {
  const r = await search(q);
  console.log(`\n"${q}"  (${why})`);
  console.log(`   ${r.n} results | headers: ${JSON.stringify(r.headers)}`);
  r.btns.slice(0, 5).forEach((x, i) => console.log(`     ${i === 0 ? '>' : ' '} ${x.slice(0, 78)}`));
  if (r.n === 0) console.log('     raw: ' + r.raw);
}
await p.screenshot({ path: `${SHOTS}/search-03-typo-didyoumean.png` });

console.log('\n\n########## RANKING: does the exact-title topic come FIRST? ##########');
for (const [q, want] of [['consistent hashing', 'Consistent Hashing'], ['caching', 'Caching Strategies'], ['kafka', 'Kafka'], ['saga', 'Saga']]) {
  const r = await search(q);
  const first = r.btns[0] || '(none)';
  const hit = first.toLowerCase().includes(want.toLowerCase().split(' ')[0]);
  console.log(`  "${q}" -> top result: "${first.slice(0, 60)}"  ${hit ? 'OK' : '*** expected "' + want + '" first ***'}`);
}

console.log('\n########## Enter on the top result navigates cross-topic ##########');
await search('consistent hashing');
await p.screenshot({ path: `${SHOTS}/search-04-results.png` });
await p.locator('#_search-overlay input').press('Enter');
await p.waitForTimeout(1200);
const after = await p.evaluate(() => ({
  topic: TopicRegistry.current().id, h1: (document.querySelector('.hdr h1') || {}).textContent,
  pane: (document.querySelector('.pane.on') || {}).id, hash: location.hash, open: SearchOverlay.isOpen(),
}));
console.log('  ', JSON.stringify(after));
console.log('  -> jumped to consistent-hashing:', after.topic === 'consistent-hashing' ? 'YES' : 'NO — landed on ' + after.topic);
await p.screenshot({ path: `${SHOTS}/search-05-after-enter.png` });

console.log('\n########## Search results carry a VIEW axis too (e.g. "drill" -> jump to the drill of a topic)? ##########');
const rv = await search('whiteboard');
console.log('  "whiteboard" ->', JSON.stringify(rv.headers), rv.btns.slice(0, 4));

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
