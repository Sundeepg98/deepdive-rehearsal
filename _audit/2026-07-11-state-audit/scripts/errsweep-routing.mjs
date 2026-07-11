/* ROUTING / DEEP-LINK integrity probe.
   Suspicion from router.js:54-59 + topic-protocol.js:104 --
     - register() seeds `cur` with the FIRST REGISTERED topic
     - topicPrefix()/setTopic() treat ids()[0] (the SORT-ORDER first) as the bare-hash topic
   If those two are DIFFERENT topics, the bare hash is ambiguous and a reload lands elsewhere. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1800);

const base = await p.evaluate(() => ({
  sortedFirst: TopicRegistry.ids()[0],
  bootCurrent: TopicRegistry.current().id,
  hash: location.hash,
  h1: document.querySelector('.hdr h1')?.textContent.trim(),
}));
console.log('BOOT STATE:', JSON.stringify(base, null, 1));
console.log('  -> sorted-first (ids()[0]) :', base.sortedFirst);
console.log('  -> boot/registered current :', base.bootCurrent);
console.log('  -> MISMATCH?               :', base.sortedFirst !== base.bootCurrent ? 'YES <-- bare hash is ambiguous' : 'no');

// 1) Switch to the SORT-FIRST topic (event-driven) via the registry (the single switch path)
await p.evaluate(f => TopicRegistry.setTopic(f), base.sortedFirst);
await p.waitForTimeout(600);
const afterSwitch = await p.evaluate(() => ({
  hash: location.hash,
  cur: TopicRegistry.current().id,
  h1: document.querySelector('.hdr h1')?.textContent.trim(),
}));
console.log('\nAFTER setTopic("' + base.sortedFirst + '"):', JSON.stringify(afterSwitch, null, 1));
await p.screenshot({ path: `${SHOTS}/routing-1-on-sortfirst-topic.png` });

// 2) The user now bookmarks / copies this URL. Reload it verbatim.
const bookmarked = await p.evaluate(() => location.href);
console.log('\nBOOKMARKED URL hash:', bookmarked.split('#')[1] ?? '(none)');
await p.goto(bookmarked, { waitUntil: 'load' });
await p.waitForTimeout(1800);
const afterReload = await p.evaluate(() => ({
  hash: location.hash,
  cur: TopicRegistry.current().id,
  h1: document.querySelector('.hdr h1')?.textContent.trim(),
}));
console.log('AFTER RELOAD of that URL:', JSON.stringify(afterReload, null, 1));
await p.screenshot({ path: `${SHOTS}/routing-2-after-reload.png` });

console.log('\n>>> VERDICT:');
if (afterReload.cur !== afterSwitch.cur) {
  console.log('    *** BUG CONFIRMED *** reloading the URL for topic "' + afterSwitch.cur +
    '" lands on "' + afterReload.cur + '"');
  console.log('    h1 was: "' + afterSwitch.h1 + '"  ->  now: "' + afterReload.h1 + '"');
} else {
  console.log('    round-trip OK (' + afterReload.cur + ')');
}

// 3) Control: does a NON-sort-first topic round-trip correctly?
await p.evaluate(() => TopicRegistry.setTopic('saga'));
await p.waitForTimeout(500);
const sagaUrl = await p.evaluate(() => location.href);
console.log('\nCONTROL: saga hash =', sagaUrl.split('#')[1]);
await p.goto(sagaUrl, { waitUntil: 'load' });
await p.waitForTimeout(1600);
const sagaBack = await p.evaluate(() => TopicRegistry.current().id);
console.log('CONTROL: saga reload ->', sagaBack, sagaBack === 'saga' ? '(OK)' : '(BROKEN)');

// 4) The copy-link button: what does it actually put on the clipboard?
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.evaluate(f => TopicRegistry.setTopic(f), base.sortedFirst);
await p.waitForTimeout(500);
const linkHref = await p.evaluate(() => location.href);
console.log('\nCOPY-LINK would share (while on ' + base.sortedFirst + '):', linkHref.split('/').pop());

console.log('\nERRORS during routing probe:', errs.length, JSON.stringify(errs, null, 1));
await b.close();
