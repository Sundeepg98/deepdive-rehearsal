import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1200);
const r = await p.evaluate(() => {
  const R = window.TopicRegistry, ids = R.ids();
  const ORIG = new Set(['content-pipeline', 'signing', 'authz', 'notifications', 'iac', 'aws-hardening', 'desired-state', 'eav']);
  const mk = () => ({ topics: 0, drillCards: 0, emptyF: 0, emptySenior: 0, emptySpeak: 0, emptyTierNotes: 0, emptySysStages: 0, emptyWbFoot: 0, curveNoTask: 0, curveNoInt: 0, sysPivEmptyA: 0, modelAnswers: 0, rfFlags: 0, tradeDecisions: 0, curveballs: 0, wbSteps: 0 });
  const A = { ORIG: mk(), MD: mk() };
  for (const id of ids) {
    const t = R.get(id), d = t.data || {}, k = ORIG.has(id) ? 'ORIG' : 'MD', a = A[k];
    a.topics++;
    const dr = d.drill || {}, cards = dr.cards || [], speak = dr.speak || [];
    a.drillCards += cards.length;
    cards.forEach(c => {
      if (!c.f || !c.f.length) a.emptyF++;
      if (!String(c.senior || '').trim()) a.emptySenior++;
    });
    speak.forEach(s => { if (!String(s || '').trim()) a.emptySpeak++; });
    if (!dr.tierNotes || !Object.keys(dr.tierNotes).length) a.emptyTierNotes++;
    const sys = d.sys || {};
    if (!(sys.stages || []).length) a.emptySysStages++;
    (sys.pivots || []).forEach(pv => { if (!String(pv.a || '').trim()) a.sysPivEmptyA++; });
    const wb = d.wb || {};
    if (!String(wb.foot || '').trim()) a.emptyWbFoot++;
    a.wbSteps += (wb.steps || []).length;
    const bank = d.bank || {}; const cvs = bank.curveballs || [];
    a.curveballs += cvs.length;
    cvs.forEach(cb => { if (cb.task === undefined) a.curveNoTask++; if (!cb.int) a.curveNoInt++; });
    a.modelAnswers += ((d.model || {}).answers || []).length;
    a.rfFlags += ((d.rf || {}).flags || []).length;
    a.tradeDecisions += ((d.trade || {}).decisions || []).length;
  }
  return A;
});
const rows = [
  ['topics', 'topics'], ['drill cards', 'drillCards'],
  ['cards w/ NO follow-up (f:[])', 'emptyF'],
  ['cards w/ EMPTY senior', 'emptySenior'],
  ['cards w/ EMPTY speak line', 'emptySpeak'],
  ['topics w/ EMPTY tierNotes {}', 'emptyTierNotes'],
  ['topics w/ EMPTY sys.stages []', 'emptySysStages'],
  ['topics w/ EMPTY wb.foot ""', 'emptyWbFoot'],
  ['sys pivots w/ empty .a', 'sysPivEmptyA'],
  ['curveballs missing .task', 'curveNoTask'],
  ['curveballs missing .int', 'curveNoInt'],
  ['--- totals ---', null],
  ['model answers', 'modelAnswers'],
  ['red-flag entries', 'rfFlags'],
  ['trade decisions', 'tradeDecisions'],
  ['curveballs', 'curveballs'],
  ['whiteboard steps', 'wbSteps'],
];
console.log('CONTENT COMPLETENESS — ORIGINALS (8 hand-authored JS) vs MD-BULK (38 compiled)\n');
console.log('metric                            ORIG(8)    MD(38)');
console.log('-'.repeat(52));
for (const [lab, k] of rows) {
  if (!k) { console.log(''); continue; }
  console.log(lab.padEnd(32) + String(r.ORIG[k]).padStart(7) + String(r.MD[k]).padStart(10));
}
console.log('\nPER-TOPIC AVERAGES');
const per = (o, k) => (o[k] / o.topics).toFixed(1);
for (const k of ['modelAnswers', 'rfFlags', 'tradeDecisions', 'curveballs', 'wbSteps']) {
  console.log(`  ${k.padEnd(18)} ORIG ${per(r.ORIG, k).padStart(5)}   MD ${per(r.MD, k).padStart(5)}   ratio ${(r.ORIG[k] / r.ORIG.topics / (r.MD[k] / r.MD.topics)).toFixed(1)}x`);
}
await b.close();
