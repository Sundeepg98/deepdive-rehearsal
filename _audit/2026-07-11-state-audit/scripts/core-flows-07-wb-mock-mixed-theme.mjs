/* LENS: core flows — WHITEBOARD recall, MOCK RUN (timed), MIXED FIRE, THEME persistence, EXPORT/IMPORT */
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

console.log('########## WHITEBOARD recall ##########');
await p.click('.seg button[data-tab="wb"]');
await p.waitForTimeout(600);
const wbDom = await p.evaluate(() => {
  const r = document.querySelector('#wb deep-whiteboard').shadowRoot;
  const items = [...r.querySelectorAll('#wblist > li')];
  return {
    nItems: items.length,
    count: (r.getElementById('wbcount') || {}).textContent,
    firstItemBtns: items[0] ? [...items[0].querySelectorAll('button')].map(x => ({ id: x.id, cls: x.className, txt: x.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) })) : [],
    firstCue: items[0] ? items[0].textContent.replace(/\s+/g, ' ').trim().slice(0, 70) : null,
  };
});
console.log('  steps:', wbDom.nItems, '| count line:', JSON.stringify(wbDom.count));
console.log('  first cue:', wbDom.firstCue);
console.log('  buttons on a step:', JSON.stringify(wbDom.firstItemBtns));
await p.screenshot({ path: `${SHOTS}/wb-01-initial.png` });

// Drive the whiteboard: reveal + mark got/missed on every step
const wbFlow = await p.evaluate(async () => {
  const r = document.querySelector('#wb deep-whiteboard').shadowRoot;
  const items = [...r.querySelectorAll('#wblist > li')];
  const log = [];
  for (let i = 0; i < items.length; i++) {
    const btns = [...items[i].querySelectorAll('button')];
    for (const bt of btns) { bt.click(); await new Promise(z => setTimeout(z, 60)); }
    log.push({ i, clicked: btns.map(x => x.className || x.id) });
  }
  await new Promise(z => setTimeout(z, 200));
  const w = document.querySelector('#wb deep-whiteboard');
  return { log: log.slice(0, 3), stats: w.getStats ? w.getStats() : null, verdict: (r.getElementById('wbverdict') || {}).textContent.replace(/\s+/g, ' ').trim().slice(0, 130), count: (r.getElementById('wbcount') || {}).textContent };
});
console.log('  after clicking every button on every step:');
console.log('    count:', JSON.stringify(wbFlow.count));
console.log('    verdict:', JSON.stringify(wbFlow.verdict));
console.log('    getStats():', JSON.stringify(wbFlow.stats));
await p.screenshot({ path: `${SHOTS}/wb-02-graded.png` });
const wbStore = await p.evaluate(() => ({ wb: Progress.wbGet('content-pipeline'), status: Progress.status('content-pipeline') }));
console.log('  Progress.wbGet persisted:', JSON.stringify(wbStore.wb));
console.log('  -> whiteboard recall persists:', wbStore.wb ? 'YES' : '*** NO ***');

console.log('\n########## MOCK RUN (timed) ##########');
await p.click('#mockopen');
await p.waitForTimeout(900);
const mock1 = await p.evaluate(() => {
  const ov = document.getElementById('mockov');
  const t = ov.querySelector('.mock-timer, [class*="timer"], [id*="timer"]');
  return { open: ov.classList.contains('open'), timer: t ? t.textContent.trim() : null, txt: ov.textContent.replace(/\s+/g, ' ').trim().slice(0, 150), btns: [...ov.querySelectorAll('button')].map(x => (x.id || x.className) + ':' + x.textContent.replace(/\s+/g, ' ').trim().slice(0, 22)).slice(0, 8) };
});
console.log('  open:', mock1.open, '| timer:', JSON.stringify(mock1.timer));
console.log('  content:', mock1.txt.slice(0, 130));
console.log('  buttons:', JSON.stringify(mock1.btns));
await p.screenshot({ path: `${SHOTS}/mock-01-open.png` });
await p.waitForTimeout(2500);
const mock2 = await p.evaluate(() => { const ov = document.getElementById('mockov'); const t = ov.querySelector('.mock-timer, [class*="timer"], [id*="timer"]'); return t ? t.textContent.trim() : null; });
console.log('  timer after ~2.5s:', JSON.stringify(mock2), mock1.timer !== mock2 ? 'OK (ticking)' : '*** TIMER NOT TICKING ***');
// is the mock run topic-aware?
const mockTxt1 = await p.evaluate(() => document.getElementById('mockov').textContent.replace(/\s+/g, ' ').trim());
await p.evaluate(() => { const x = document.querySelector('#mockov .mock-x'); if (x) x.click(); });
await p.waitForTimeout(500);

console.log('\n########## MIXED FIRE ##########');
await p.click('#mixopen');
await p.waitForTimeout(900);
const mix1 = await p.evaluate(() => {
  const ov = document.getElementById('mixov');
  return { open: ov.classList.contains('open'), txt: ov.textContent.replace(/\s+/g, ' ').trim().slice(0, 170), btns: [...ov.querySelectorAll('button')].map(x => (x.id || x.className) + ':' + x.textContent.replace(/\s+/g, ' ').trim().slice(0, 20)).slice(0, 8) };
});
console.log('  open:', mix1.open);
console.log('  content:', mix1.txt.slice(0, 150));
console.log('  buttons:', JSON.stringify(mix1.btns));
await p.screenshot({ path: `${SHOTS}/mixed-01-open.png` });
const mixTxt1 = await p.evaluate(() => document.getElementById('mixov').textContent.replace(/\s+/g, ' ').trim());
await p.evaluate(() => { const x = document.querySelector('#mixov .mock-x'); if (x) x.click(); });
await p.waitForTimeout(500);

console.log('\n########## Are MOCK RUN / MIXED FIRE topic-aware? (switch to caching, reopen) ##########');
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(800);
await p.click('#mockopen'); await p.waitForTimeout(800);
const mockTxt2 = await p.evaluate(() => document.getElementById('mockov').textContent.replace(/\s+/g, ' ').trim());
await p.screenshot({ path: `${SHOTS}/mock-02-caching.png` });
await p.evaluate(() => { const x = document.querySelector('#mockov .mock-x'); if (x) x.click(); }); await p.waitForTimeout(500);
await p.click('#mixopen'); await p.waitForTimeout(800);
const mixTxt2 = await p.evaluate(() => document.getElementById('mixov').textContent.replace(/\s+/g, ' ').trim());
await p.screenshot({ path: `${SHOTS}/mixed-02-caching.png` });
await p.evaluate(() => { const x = document.querySelector('#mixov .mock-x'); if (x) x.click(); }); await p.waitForTimeout(500);
console.log('  MOCK  cp-vs-caching text identical?', mockTxt1 === mockTxt2 ? '*** YES -> STALE ***' : 'no (topic-aware OK)');
console.log('  MIXED cp-vs-caching text identical?', mixTxt1 === mixTxt2 ? '*** YES -> STALE ***' : 'no (topic-aware OK)');
console.log('  mock (caching) head:', mockTxt2.slice(0, 110));
console.log('  mixed(caching) head:', mixTxt2.slice(0, 110));

console.log('\n########## THEME toggle + reload persistence ##########');
const th0 = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme || '(unset)', stored: Store.get('theme', null), pressed: document.getElementById('themetog').getAttribute('aria-pressed') }));
console.log('  before:', JSON.stringify(th0));
await p.evaluate(() => document.getElementById('themetog').click());
await p.waitForTimeout(500);
const th1 = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: Store.get('theme', null), pressed: document.getElementById('themetog').getAttribute('aria-pressed'), bg: getComputedStyle(document.body).backgroundColor }));
console.log('  after toggle:', JSON.stringify(th1));
await p.screenshot({ path: `${SHOTS}/theme-01-dark.png` });
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(1000);
const th2 = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: Store.get('theme', null), pressed: document.getElementById('themetog').getAttribute('aria-pressed'), bg: getComputedStyle(document.body).backgroundColor }));
console.log('  after RELOAD:', JSON.stringify(th2));
console.log('  -> theme persisted:', th2.theme === 'dark' ? 'YES' : '*** NO — reverted to ' + th2.theme + ' ***');
console.log('  -> toggle button state matches:', th2.pressed === 'true' ? 'YES' : '*** NO (aria-pressed=' + th2.pressed + ') ***');
await p.screenshot({ path: `${SHOTS}/theme-02-after-reload.png` });

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
