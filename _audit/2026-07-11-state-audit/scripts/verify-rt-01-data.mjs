/* VERIFY lens rt-interactions — Finding 3 (mock beat clobber): re-measure the
   claimed "38/46 topics have no CURVEBALL/FRAME beat" at the DATA level, straight
   from the live TopicRegistry. Also probe curveball `task` presence (the claimed
   source of the literal "undefined") and empty-pool crash risk. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(600);

const data = await p.evaluate(() => {
  const ids = TopicRegistry.ids();
  const rows = ids.map(id => {
    const t = TopicRegistry.get(id);
    const bank = t.data.bank;
    const beats = bank.mockBeats || [];
    const cbs = bank.curveballs || [];
    const frames = bank.frames || [];
    return {
      id,
      title: t.identity.title,
      nBeats: beats.length,
      tags: beats.map(x => x.tag),
      hasCURVEBALLbeat: beats.some(x => x.tag === 'CURVEBALL'),
      hasFRAMEbeat: beats.some(x => x.tag === 'FRAME'),
      nCurve: cbs.length,
      curveTaskPresent: cbs.map(c => Object.prototype.hasOwnProperty.call(c, 'task') && c.task != null),
      curveHasCue: cbs.map(c => !!c.cue),
      nFrames: frames.length,
      // every beat must have a task, else renderMockBeat prints "undefined"
      beatsMissingTask: beats.filter(x => x.task == null).length,
    };
  });
  return { total: ids.length, rows };
});

const noCurve = data.rows.filter(r => !r.hasCURVEBALLbeat);
const noFrame = data.rows.filter(r => !r.hasFRAMEbeat);
const bothMissing = data.rows.filter(r => !r.hasCURVEBALLbeat && !r.hasFRAMEbeat);
const anyCurveNoTask = data.rows.filter(r => r.curveTaskPresent.some(x => x === false));
const emptyPool = data.rows.filter(r => r.nCurve === 0);
const emptyFrames = data.rows.filter(r => r.nFrames === 0);

console.log('TOTAL TOPICS:', data.total);
console.log('no CURVEBALL-tagged beat :', noCurve.length);
console.log('no FRAME-tagged beat     :', noFrame.length);
console.log('missing BOTH (idx both 0):', bothMissing.length);
console.log('topics w/ >=1 curveball lacking .task:', anyCurveNoTask.length);
console.log('topics w/ EMPTY curveballPool (crash risk):', emptyPool.length, emptyPool.map(r => r.id));
console.log('topics w/ EMPTY framePool:', emptyFrames.length, emptyFrames.map(r => r.id));
console.log('');
console.log('--- distinct beat-tag shapes ---');
const shapes = {};
data.rows.forEach(r => { const k = r.tags.join(','); (shapes[k] = shapes[k] || []).push(r.id); });
Object.keys(shapes).forEach(k => console.log(String(shapes[k].length).padStart(3), '| [' + k + ']', shapes[k].length <= 8 ? '-> ' + shapes[k].join(' ') : ''));
console.log('');
console.log('--- per-topic (first 12) ---');
data.rows.slice(0, 12).forEach(r => console.log(
  r.id.padEnd(26), 'beats=' + r.nBeats, '[' + r.tags.join(',') + ']'.padEnd(18),
  'cb=' + r.nCurve, 'cbTask=' + JSON.stringify(r.curveTaskPresent), 'frames=' + r.nFrames));
console.log('');
console.log('CONSOLE/PAGE ERRORS:', errs.length, errs.slice(0, 5));
const fs = await import('fs');
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_verify-rt-01.json', JSON.stringify(data, null, 1));
await b.close();
