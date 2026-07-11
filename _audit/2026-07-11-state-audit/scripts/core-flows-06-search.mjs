/* LENS: core flows — SEARCH: cross-topic, multi-word/token, typo "did you mean", navigation */
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
  await p.waitForTimeout(300);
  await p.evaluate(() => { const i = document.querySelector('#_search-overlay input, [id*="search"] input'); if (i) i.value = ''; });
  const inp = p.locator('input[placeholder="Search topics, concepts, views..."]');
  await inp.fill('');
  await inp.type(q, { delay: 15 });
  await p.waitForTimeout(400);
  return await p.evaluate(() => {
    const ov = document.querySelector('[id*="search"], .srch-ov') || document.body;
    const btns = [...document.querySelectorAll('button')].filter(x => x.closest('[class*="srch"],[id*="search"]'));
    // generic: grab the results container by finding the input's overlay root
    const inp = document.querySelector('input[placeholder="Search topics, concepts, views..."]');
    let root = inp; while (root && root.parentElement && !root.classList.contains('open') && root !== document.body) root = root.parentElement;
    const results = [...root.querySelectorAll('button')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).filter(t => t && t !== '×');
    const raw = root.textContent.replace(/\s+/g, ' ').trim();
    return { n: results.length, results: results.slice(0, 8), hasDidYouMean: /did you mean|no matches|nothing/i.test(raw), raw: raw.slice(0, 240) };
  });
}

const QUERIES = [
  ['caching', 'exact topic title word'],
  ['cache invalidation', 'MULTI-WORD across title+body'],
  ['exactly once', 'multi-word concept (should hit idempotency / content-pipeline)'],
  ['kafka', 'topic name'],
  ['circut braker', 'TYPO -> did-you-mean (circuit breaker)'],
  ['cachng', 'TYPO -> did-you-mean (caching)'],
  ['drill', 'a VIEW, not a topic'],
  ['zzzzqqq', 'nonsense -> empty state'],
  ['rate limit token bucket', '3-token multi-word'],
];

for (const [q, why] of QUERIES) {
  const r = await search(q);
  console.log(`\n"${q}"  (${why})`);
  console.log(`   ${r.n} results | did-you-mean/empty-state=${r.hasDidYouMean}`);
  r.results.forEach(x => console.log('     - ' + x.slice(0, 80)));
  if (r.n === 0) console.log('     raw: ' + r.raw.slice(0, 180));
}
await p.screenshot({ path: `${SHOTS}/search-01-typo.png` });

console.log('\n\n########## Does a search result actually NAVIGATE (cross-topic jump)? ##########');
await p.evaluate(() => { if (SearchOverlay.isOpen()) SearchOverlay.close(); });
await p.waitForTimeout(300);
console.log('  topic before:', await p.evaluate(() => TopicRegistry.current().id), '| pane:', await p.evaluate(() => (document.querySelector('.pane.on') || {}).id));
const r = await search('consistent hashing');
console.log('  search "consistent hashing" ->', r.n, 'results:', JSON.stringify(r.results.slice(0, 3)));
await p.keyboard.press('ArrowDown');
await p.waitForTimeout(200);
await p.keyboard.press('Enter');
await p.waitForTimeout(1200);
const after = await p.evaluate(() => ({
  topic: TopicRegistry.current().id,
  h1: (document.querySelector('.hdr h1') || {}).textContent,
  pane: (document.querySelector('.pane.on') || {}).id,
  hash: location.hash,
  searchOpen: SearchOverlay.isOpen(),
  drillQ: (() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot.querySelector('.qq') ? d.shadowRoot.querySelector('.qq').textContent.slice(0, 60) : null; })(),
}));
console.log('  AFTER Enter:', JSON.stringify(after, null, 1));
console.log('  -> cross-topic jump worked:', after.topic === 'consistent-hashing' ? 'YES' : 'topic is ' + after.topic);
await p.screenshot({ path: `${SHOTS}/search-02-after-jump.png` });

console.log('\n########## Search a term that lives INSIDE a topic body, not its title ##########');
for (const q of ['thundering herd', 'quorum', 'bloom filter', 'exponential backoff']) {
  const rr = await search(q);
  console.log(`  "${q}" -> ${rr.n} results: ${JSON.stringify(rr.results.slice(0, 3))}`);
}

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
