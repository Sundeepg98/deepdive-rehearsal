/* rt-console VERIFY 04 — SHARE/REFRESH ROUND-TRIP INTEGRITY over all 46 topics.
   The original lens declared "Routing is robust: deep links, back/forward, and a
   garbage hash all behave". Test that properly: for every topic, switch to it the way
   the UI does (TopicRegistry.setTopic -- topic-nav.js:52 calls this the "ONE switch
   path"; the dropdown, [ / ], the index overlay and the related-topic buttons all
   funnel here), read the URL the app leaves in the bar (= exactly what copy-link.js
   copies: window.location.href), then RE-OPEN that URL cold and see which topic loads.
   Also drives the REAL dropdown UI for the event-driven case so no one can say
   "you used an internal API".
*/
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-console-verify';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE:' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR:' + e.message));

// ---------- PART 1: real-UI proof for event-driven ----------
await p.goto(URL + '#walk', { waitUntil: 'load' });
await p.waitForTimeout(700);
const boot = await p.evaluate(() => ({ topic: TopicRegistry.current().id, h1: document.querySelector('.hdr h1').textContent, hash: location.hash }));
console.log('BOOT (#walk):', JSON.stringify(boot));

await p.click('#tntrigger');
await p.waitForTimeout(250);
await p.click('.tn-item[data-topic="event-driven"]');
await p.waitForTimeout(900);
const afterClick = await p.evaluate(() => ({
  topic: TopicRegistry.current().id,
  h1: document.querySelector('.hdr h1').textContent,
  hash: location.hash,
  href: location.href,
}));
console.log('AFTER REAL DROPDOWN CLICK -> event-driven:', JSON.stringify(afterClick, null, 2));
await p.screenshot({ path: S + '/vc-rt-eventdriven-before.png' });

// what "Copy link" would put on the clipboard:
const copied = afterClick.href;
console.log('\n"Copy link" would copy:', copied);

// Re-open that exact URL cold, in a brand-new context (fresh profile, like a recipient):
const ctx2 = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(copied, { waitUntil: 'load' });
await p2.waitForTimeout(1200);
const reopened = await p2.evaluate(() => ({
  topic: TopicRegistry.current().id,
  h1: document.querySelector('.hdr h1').textContent,
  hash: location.hash,
  pane: (document.querySelector('.pane.on') || {}).id,
}));
console.log('RE-OPENED THAT LINK COLD  :', JSON.stringify(reopened, null, 2));
await p2.screenshot({ path: S + '/vc-rt-eventdriven-after.png' });
console.log(reopened.topic === 'event-driven'
  ? '\n>>> ROUND-TRIP OK'
  : `\n>>> *** ROUND-TRIP BROKEN: shared event-driven, recipient lands on "${reopened.topic}" (${reopened.h1}) ***`);
await ctx2.close();

// ---------- PART 2: full 46-topic round-trip matrix ----------
const ids = await p.evaluate(() => TopicRegistry.ids());
console.log(`\n================ FULL ROUND-TRIP MATRIX (${ids.length} topics) ================`);

const hrefs = {};
for (const id of ids) {
  const r = await p.evaluate((tid) => {
    TopicRegistry.setTopic(tid);
    return null;
  }, id);
  await p.waitForTimeout(120);
  hrefs[id] = await p.evaluate(() => location.href);
}

const broken = [];
for (const id of ids) {
  await p2Load();
  async function p2Load() {}
  const c3 = await b.newContext({ viewport: { width: 1000, height: 800 } });
  const pg = await c3.newPage();
  await pg.goto(hrefs[id], { waitUntil: 'load' });
  await pg.waitForTimeout(500);
  const got = await pg.evaluate(() => ({ t: TopicRegistry.current().id, h1: document.querySelector('.hdr h1').textContent }));
  const ok = got.t === id;
  if (!ok) broken.push({ wanted: id, href: hrefs[id].split('index.html')[1], got: got.t, h1: got.h1 });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${id.padEnd(26)} url=${(hrefs[id].split('index.html')[1] || '(none)').padEnd(30)} -> ${got.t}`);
  await c3.close();
}

console.log('\n================ SUMMARY ================');
console.log(`round-trip OK   : ${ids.length - broken.length}/${ids.length}`);
console.log(`round-trip BROKEN: ${broken.length}`);
for (const x of broken) console.log(`  *** ${x.wanted}  ->  url "${x.href}"  ->  reopens as "${x.got}" (${x.h1})`);
console.log('\nerrors during run:', errs.length ? errs : 'none');

await b.close();
