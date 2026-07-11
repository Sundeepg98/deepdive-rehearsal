/* LENS: core flows — MOCK RUN beat-1 clobber + "undefined" render.
   openMock() (mock-run/logic.js:39-40) does:
       mockBeats[mockCurveIdx] = curveballPool[rand]
       mockBeats[mockFrameIdx].cue = framePool[rand]
   mockCurveIdx / mockFrameIdx are seeded in publishBanks (topic-protocol.js:32-36)
   ONLY when a beat carries tag 'CURVEBALL' / 'FRAME'. Otherwise they stay 0 —
   so beat 1 is overwritten by a curveball object that has no `task` field. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.evaluate(() => IndexOverlay.close());
await p.waitForTimeout(400);

console.log('########## STATIC: which of the 46 topics have a CURVEBALL / FRAME tagged beat? ##########');
const audit = await p.evaluate(() => {
  const ids = TopicRegistry.ids();
  const rows = ids.map(id => {
    const t = TopicRegistry.get(id), bank = t.data.bank;
    const beats = bank.mockBeats || [];
    const tags = beats.map(x => x.tag);
    return {
      id,
      nBeats: beats.length,
      tags,
      hasCurve: tags.indexOf('CURVEBALL') > -1,
      hasFrame: tags.indexOf('FRAME') > -1,
      nCurveballs: (bank.curveballs || []).length,
      beat0Tag: tags[0] || null,
      beat0Cue: beats[0] ? String(beats[0].cue).slice(0, 44) : null,
      beat0HasTask: beats[0] ? ('task' in beats[0]) : null,
      curveHasTask: (bank.curveballs && bank.curveballs[0]) ? ('task' in bank.curveballs[0]) : null,
    };
  });
  return rows;
});
const noCurve = audit.filter(r => !r.hasCurve);
const noFrame = audit.filter(r => !r.hasFrame);
console.log(`  topics total                              : ${audit.length}`);
console.log(`  topics with NO 'CURVEBALL'-tagged beat    : ${noCurve.length}   -> mockCurveIdx stays 0 -> BEAT 1 IS CLOBBERED`);
console.log(`  topics with NO 'FRAME'-tagged beat        : ${noFrame.length}   -> mockFrameIdx stays 0 -> BEAT 1's cue IS OVERWRITTEN`);
console.log(`  curveball objects carry a 'task' field?   : ${JSON.stringify([...new Set(audit.map(r => r.curveHasTask))])}  (the renderer reads beat.task)`);
console.log('\n  affected topics (no CURVEBALL beat) — their beat 1 gets destroyed:');
noCurve.slice(0, 50).forEach(r => console.log(`    ${r.id.padEnd(24)} beats=${r.nBeats} tags=[${r.tags.join(',')}]  beat1="${r.beat0Cue}"`));

console.log('\n\n########## RUNTIME: open the mock run on each affected topic and look for "undefined" ##########');
const SAMPLE = noCurve.slice(0, 8).map(r => r.id);
const results = [];
for (const id of SAMPLE) {
  await p.evaluate((i) => TopicRegistry.setTopic(i), id);
  await p.waitForTimeout(600);
  await p.click('#mockopen');
  await p.waitForTimeout(700);
  const r = await p.evaluate((topicId) => {
    const host = document.querySelector('deep-mock-run');
    const sr = host.shadowRoot;
    const body = sr.getElementById('mockbody');
    const txt = (body ? body.textContent : '').replace(/\s+/g, ' ').trim();
    const t = TopicRegistry.get(topicId);
    const origBeat1 = t.data.bank.mockBeats[0];
    return {
      beatLabel: (sr.querySelector('.mb-n, .mb-beat, [class*="mb-"]') || {}).textContent || txt.slice(0, 20),
      txt: txt.slice(0, 170),
      hasUndefined: /\bundefined\b/.test(txt),
      taskEl: (sr.querySelector('.mb-task') || {}).textContent || null,
      // has the live working-set beat 1 been replaced by a curveball?
      liveBeat1Tag: mockBeats[0].tag,
      liveBeat1HasTask: 'task' in mockBeats[0],
      origBeat1Tag: origBeat1.tag,
      origBeat1Cue: String(origBeat1.cue).slice(0, 40),
    };
  }, id);
  results.push({ id, ...r });
  if (r.hasUndefined) await p.screenshot({ path: `${SHOTS}/mockbeat-undefined-${id}.png` });
  await p.evaluate(() => document.getElementById('mockx').click());
  await p.waitForTimeout(400);
}
for (const r of results) {
  console.log(`\n  ${r.id}`);
  console.log(`    authored beat 1 : tag=${r.origBeat1Tag} cue="${r.origBeat1Cue}"`);
  console.log(`    LIVE beat 1     : tag=${r.liveBeat1Tag}  has .task field? ${r.liveBeat1HasTask}  ${r.liveBeat1Tag === 'CURVEBALL' ? '  <-- CLOBBERED by a curveball' : ''}`);
  console.log(`    renders literal "undefined"? ${r.hasUndefined ? '*** YES ***' : 'no'}`);
  console.log(`    .mb-task text   : ${JSON.stringify(String(r.taskEl).slice(0, 60))}`);
  console.log(`    body            : ${r.txt.slice(0, 120)}`);
}
const bad = results.filter(r => r.hasUndefined);
console.log(`\n  >>> ${bad.length}/${results.length} sampled topics render a literal "undefined" in the mock run`);
console.log(`  >>> ${results.filter(r => r.liveBeat1Tag === 'CURVEBALL').length}/${results.length} had their authored beat 1 destroyed`);

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
