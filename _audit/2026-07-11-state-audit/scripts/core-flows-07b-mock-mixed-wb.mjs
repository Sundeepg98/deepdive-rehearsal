/* LENS: core flows — MOCK RUN + MIXED FIRE reaching into <deep-mock-run>/<deep-mixed-fire> shadow,
   plus a correct WHITEBOARD "Drew it" (recall) path. */
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

const shadowTxt = (tag) => p.evaluate((t) => {
  const h = document.querySelector(t);
  if (!h || !h.shadowRoot) return '(no shadow)';
  const parts = [];
  h.shadowRoot.childNodes.forEach(n => { if (n.nodeName !== 'STYLE') parts.push(n.textContent || ''); });
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}, tag);

console.log('########## WHITEBOARD — the RECALL ("Drew it") path ##########');
await p.click('.seg button[data-tab="wb"]');
await p.waitForTimeout(600);
const wb = await p.evaluate(async () => {
  const host = document.querySelector('#wb deep-whiteboard'), r = host.shadowRoot;
  const items = [...r.querySelectorAll('#wblist > li')];
  const steps = [];
  for (let i = 0; i < items.length; i++) {
    const rev = items[i].querySelector('.wb-rev');
    const got = items[i].querySelector('.wb-got');
    const miss = items[i].querySelector('.wb-miss');
    // gating check: is "Drew it" disabled BEFORE reveal?
    const gatedBefore = got ? got.disabled : null;
    if (rev) { rev.click(); await new Promise(z => setTimeout(z, 60)); }
    const gatedAfter = got ? got.disabled : null;
    // recall the first 7, miss the last 2
    if (i < 7) { if (got) got.click(); } else { if (miss) miss.click(); }
    await new Promise(z => setTimeout(z, 60));
    steps.push({ i, gatedBefore, gatedAfter });
  }
  await new Promise(z => setTimeout(z, 250));
  return {
    gating: steps.slice(0, 2),
    count: (r.getElementById('wbcount') || {}).textContent,
    verdict: (r.getElementById('wbverdict') || {}).textContent.replace(/\s+/g, ' ').trim().slice(0, 120),
    stats: (() => { const s = host.getStats(); return { total: s.total, got: s.items.filter(x => x.got).length, missed: s.items.filter(x => x.missed).length }; })(),
  };
});
console.log('  "Drew it" disabled BEFORE reveal?', JSON.stringify(wb.gating));
console.log('  count  :', JSON.stringify(wb.count));
console.log('  verdict:', JSON.stringify(wb.verdict));
console.log('  stats  :', JSON.stringify(wb.stats), '(expected 7 got / 2 missed)');
console.log('  persisted:', JSON.stringify(await p.evaluate(() => Progress.wbGet('content-pipeline'))));
await p.screenshot({ path: `${SHOTS}/wb-03-recall-path.png` });

console.log('\n########## MOCK RUN — inside <deep-mock-run> ##########');
await p.click('#mockopen');
await p.waitForTimeout(1000);
let mockTxt = await shadowTxt('deep-mock-run');
console.log('  clock (light DOM):', await p.evaluate(() => document.getElementById('mockclock').textContent));
console.log('  shadow body len:', mockTxt.length);
console.log('  body head:', mockTxt.slice(0, 200));
const mockBtns = await p.evaluate(() => {
  const r = document.querySelector('deep-mock-run').shadowRoot;
  return [...r.querySelectorAll('button')].map(x => ({ id: x.id, cls: x.className, txt: x.textContent.replace(/\s+/g, ' ').trim().slice(0, 28) })).slice(0, 10);
});
console.log('  buttons:', JSON.stringify(mockBtns, null, 1));
await p.screenshot({ path: `${SHOTS}/mock-03-body.png` });
await p.waitForTimeout(3000);
console.log('  clock after ~3s:', await p.evaluate(() => document.getElementById('mockclock').textContent), '(started at 0:00)');
const mockCP = mockTxt;
await p.evaluate(() => document.getElementById('mockx').click());
await p.waitForTimeout(500);

console.log('\n########## MIXED FIRE — inside <deep-mixed-fire> ##########');
await p.click('#mixopen');
await p.waitForTimeout(1000);
let mixTxt = await shadowTxt('deep-mixed-fire');
console.log('  shadow body len:', mixTxt.length);
console.log('  body head:', mixTxt.slice(0, 220));
const mixBtns = await p.evaluate(() => {
  const r = document.querySelector('deep-mixed-fire').shadowRoot;
  return [...r.querySelectorAll('button')].map(x => ({ id: x.id, cls: x.className, txt: x.textContent.replace(/\s+/g, ' ').trim().slice(0, 28) })).slice(0, 10);
});
console.log('  buttons:', JSON.stringify(mixBtns, null, 1));
await p.screenshot({ path: `${SHOTS}/mixed-03-body.png` });
const mixCP = mixTxt;
await p.evaluate(() => document.getElementById('mixx').click());
await p.waitForTimeout(500);

console.log('\n########## TOPIC-AWARENESS of mock + mixed (switch to caching, reopen) ##########');
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(800);
await p.click('#mockopen'); await p.waitForTimeout(900);
const mockCA = await shadowTxt('deep-mock-run');
await p.screenshot({ path: `${SHOTS}/mock-04-caching.png` });
await p.evaluate(() => document.getElementById('mockx').click()); await p.waitForTimeout(500);
await p.click('#mixopen'); await p.waitForTimeout(900);
const mixCA = await shadowTxt('deep-mixed-fire');
await p.screenshot({ path: `${SHOTS}/mixed-04-caching.png` });
await p.evaluate(() => document.getElementById('mixx').click()); await p.waitForTimeout(400);

console.log('  MOCK  content-pipeline vs caching identical?', mockCP === mockCA ? '*** YES -> STALE ***' : 'no (topic-aware OK)');
console.log('    caching head:', mockCA.slice(0, 150));
console.log('  MIXED content-pipeline vs caching identical?', mixCP === mixCA ? '*** YES -> STALE ***' : 'no (topic-aware OK)');
console.log('    caching head:', mixCA.slice(0, 150));
// leak check: does the caching mock still mention content-pipeline-only terms?
const CP_ONLY = ['PassThrough', 'processUpload', 'S3 ObjectCreated', 'reconciler'];
console.log('  content-pipeline terms leaking into the CACHING mock run:', JSON.stringify(CP_ONLY.filter(s => mockCA.toLowerCase().includes(s.toLowerCase()))));
console.log('  content-pipeline terms leaking into the CACHING mixed fire:', JSON.stringify(CP_ONLY.filter(s => mixCA.toLowerCase().includes(s.toLowerCase()))));

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
