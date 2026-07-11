/* LENS: core flows — visual proof of the mock-run beat-1 clobber + on-screen "undefined" */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.evaluate(() => IndexOverlay.close());
await p.waitForTimeout(400);

for (const id of ['caching', 'idempotency', 'rate-limiting']) {
  await p.evaluate((i) => TopicRegistry.setTopic(i), id);
  await p.waitForTimeout(600);
  await p.click('#mockopen');
  await p.waitForTimeout(800);
  const info = await p.evaluate(() => {
    const sr = document.querySelector('deep-mock-run').shadowRoot;
    const task = sr.querySelector('.mb-task');
    const cue = sr.querySelector('.mb-cue');
    const r = task ? task.getBoundingClientRect() : null;
    const cs = task ? getComputedStyle(task) : null;
    return {
      taskText: task ? task.textContent : null,
      taskVisible: r ? (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0) : false,
      taskRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      cueText: cue ? cue.textContent.slice(0, 70) : null,
      beatLabel: (sr.querySelector('.mb-n') || sr.querySelector('[class*="mb-"]') || {}).textContent,
      nBeats: mockBeats.length,
      liveTag: mockBeats[0].tag,
      authoredTag: TopicRegistry.current().data.bank.mockBeats[0].tag,
      authoredCue: String(TopicRegistry.current().data.bank.mockBeats[0].cue).slice(0, 60),
    };
  });
  console.log(`\n=== ${id}`);
  console.log(`   authored beat 1 : tag=${info.authoredTag}  cue="${info.authoredCue}"`);
  console.log(`   LIVE beat 1     : tag=${info.liveTag}   (beats in run: ${info.nBeats})`);
  console.log(`   .mb-cue on screen : "${info.cueText}"`);
  console.log(`   .mb-task on screen: ${JSON.stringify(info.taskText)}  VISIBLE=${info.taskVisible} rect=${JSON.stringify(info.taskRect)}`);
  console.log(`   >>> literal "undefined" painted to the user: ${info.taskText === 'undefined' && info.taskVisible ? '*** YES ***' : 'no'}`);
  await p.screenshot({ path: `${SHOTS}/mockrun-undefined-${id}.png` });
  await p.evaluate(() => document.getElementById('mockx').click());
  await p.waitForTimeout(400);
}

console.log('\n=== CONTROL: content-pipeline (a topic that DOES have FRAME + CURVEBALL beats)');
await p.evaluate(() => TopicRegistry.setTopic('content-pipeline'));
await p.waitForTimeout(600);
await p.click('#mockopen');
await p.waitForTimeout(800);
const ctl = await p.evaluate(() => {
  const sr = document.querySelector('deep-mock-run').shadowRoot;
  return {
    task: (sr.querySelector('.mb-task') || {}).textContent,
    cue: (sr.querySelector('.mb-cue') || {}).textContent.slice(0, 60),
    nBeats: mockBeats.length, liveTag: mockBeats[0].tag,
    tags: TopicRegistry.current().data.bank.mockBeats.map(x => x.tag),
  };
});
console.log('   beats:', ctl.nBeats, 'tags:', JSON.stringify(ctl.tags));
console.log('   beat 1 tag:', ctl.liveTag, '| cue:', JSON.stringify(ctl.cue));
console.log('   .mb-task:', JSON.stringify(String(ctl.task).slice(0, 70)));
await p.screenshot({ path: `${SHOTS}/mockrun-control-content-pipeline.png` });
await b.close();
