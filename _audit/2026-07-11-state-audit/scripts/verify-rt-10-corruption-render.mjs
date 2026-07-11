/* MISSED FINDING (cross-tool data corruption), end-to-end user story:
     1. user opens Mock run on Caching        -> openMock() mutates the SHARED canonical curveball
     2. user closes it, opens Mixed fire      -> the curveball's authored QUESTION is gone,
                                                 replaced by a frame BULLET (a statement, not a question)
   topic-protocol.js:25-27 asserts: "mock-run MUTATES mockBeats in place, so it gets a private
   deep-ish copy; the canonical topic data is never clobbered."  <- FALSE on 38/46 topics,
   because curveballPool = b.curveballs.slice() is a SHALLOW copy. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const TOPIC = 'caching';

const mixCurveball = (p) => p.evaluate(() => {
  const host = document.querySelector('#mixov');
  const sr = [...host.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean) || host;
  for (let i = 0; i < 14; i++) {
    const kind = sr.querySelector('.mx-kind')?.textContent?.trim();
    if (kind === 'Curveball') {
      return {
        found: true,
        label: sr.querySelector('.mx-label')?.textContent?.trim(),
        prompt: sr.querySelector('.qq')?.textContent?.trim(),
        task: sr.querySelector('.mx-task')?.textContent ?? null,
      };
    }
    const show = sr.querySelector('#mxshow'); if (show) show.click();
    const g = [...sr.querySelectorAll('button')].filter(x => /got it|shaky|solid|revisit/i.test(x.textContent));
    if (g[0]) g[0].click(); else break;
  }
  return { found: false };
});

const run = async (openMockFirst) => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.evaluate((t) => TopicRegistry.setTopic(t), TOPIC);
  await p.waitForTimeout(300);
  const canonBefore = await p.evaluate((t) => TopicRegistry.get(t).data.bank.curveballs[0].cue, TOPIC);

  if (openMockFirst) {
    await p.evaluate(() => window.openMock());
    await p.waitForTimeout(500);
    await p.evaluate(() => { const x = document.querySelector('#mockov .mock-x,#mockov .cram-x'); if (x) x.click(); });
    await p.waitForTimeout(400);
  }
  await p.evaluate(() => window.openMix());
  await p.waitForTimeout(500);
  const cb = await mixCurveball(p);
  await p.waitForTimeout(200);
  await p.screenshot({ path: SHOT + (openMockFirst ? 'mix-AFTER-mockrun-corrupted.png' : 'mix-BEFORE-mockrun-clean.png') });
  const canonAfter = await p.evaluate((t) => TopicRegistry.get(t).data.bank.curveballs[0].cue, TOPIC);
  await b.close();
  return { canonBefore, canonAfter, cb };
};

console.log('#### SCENARIO 1: Mixed fire WITHOUT ever opening the mock run ####');
const clean = await run(false);
console.log('  canonical curveball cue :', clean.canonBefore);
console.log('  MIXED FIRE label        :', JSON.stringify(clean.cb.label));
console.log('  MIXED FIRE prompt       :', JSON.stringify(clean.cb.prompt));
console.log('  MIXED FIRE task         :', JSON.stringify(clean.cb.task));

console.log('\n#### SCENARIO 2: user opens the MOCK RUN first, closes it, THEN mixed fire ####');
const dirty = await run(true);
console.log('  canonical cue BEFORE mock:', dirty.canonBefore);
console.log('  canonical cue AFTER  mock:', dirty.canonAfter);
console.log('  MUTATED?                 :', dirty.canonBefore !== dirty.canonAfter ? '*** YES — canonical bank clobbered ***' : 'no');
console.log('  MIXED FIRE label         :', JSON.stringify(dirty.cb.label));
console.log('  MIXED FIRE prompt        :', JSON.stringify(dirty.cb.prompt));
console.log('  MIXED FIRE task          :', JSON.stringify(dirty.cb.task));

console.log('\n#### DIFF ####');
console.log('  prompt WITHOUT mock run :', JSON.stringify(clean.cb.prompt));
console.log('  prompt AFTER   mock run :', JSON.stringify(dirty.cb.prompt));
console.log('  => the authored curveball QUESTION is',
  clean.cb.prompt !== dirty.cb.prompt ? '*** DESTROYED and replaced by a frame bullet ***' : 'intact');
