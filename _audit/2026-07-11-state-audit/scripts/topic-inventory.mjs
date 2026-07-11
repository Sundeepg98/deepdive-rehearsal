// LENS: topic-inventory -- dump the definitive TopicRegistry inventory from the RUNTIME.
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);

const rep = await p.evaluate(() => {
  const len = (x) => (Array.isArray(x) ? x.length : 0);
  const txt = (x) => (typeof x === 'string' ? x.trim().length : 0);
  const ids = TopicRegistry.ids();
  const groups = (typeof TOPIC_GROUPS !== 'undefined') ? TOPIC_GROUPS.map(g => ({ id: g.id, label: g.label.replace(/&amp;/g, '&') })) : [];
  const order = (typeof TOPIC_ORDER !== 'undefined') ? TOPIC_ORDER : [];
  const rows = ids.map(id => {
    const t = TopicRegistry.get(id) || {};
    const i = t.identity || {}, d = t.data || {};
    const cards = (d.drill && Array.isArray(d.drill.cards)) ? d.drill.cards : [];
    const tiers = {};
    cards.forEach(c => { tiers[c.tier] = (tiers[c.tier] || 0) + 1; });
    // slice population metrics
    const sys = d.sys || {};
    const pivots = len(sys.pivots);
    const pivotsWithAnswer = (sys.pivots || []).filter(v => txt(v.a) > 0).length;
    const wb = d.wb || {};
    const model = d.model || {};
    const num = d.num || {};
    const bank = d.bank || {};
    const open = d.open || {};
    return {
      id,
      index: i.index, total: i.total, group: i.group, title: i.title,
      locatorTail: i.locatorTail, spine: len(i.spine), thesisLen: txt(i.thesis),
      cmpNotes: i.cmpNotes ? Object.keys(i.cmpNotes).length : 0,
      slices: Object.keys(d).sort().join(','),
      walkSteps: len((d.walk || {}).steps),
      walkModelScript: txt((d.walk || {}).model) || (((d.walk || {}).model) ? 1 : 0),
      drillCards: cards.length,
      tiers,
      drillSpeak: len((d.drill || {}).speak),
      wbSteps: len(wb.steps),
      wbDiagram: txt(wb.diagram) > 0,
      wbDiagramLen: txt(wb.diagram),
      sysIntro: txt(sys.intro),
      sysStages: len(sys.stages),
      sysPivots: pivots,
      sysPivotsWithAnswer: pivotsWithAnswer,
      tradeDecisions: len((d.trade || {}).decisions),
      modelAnswers: len(model.answers),
      modelSelectors: len(model.selectors),
      numInputs: len(num.inputs),
      numOutputs: len(num.outputs) || (num.outputs ? 1 : 0),
      numKeys: Object.keys(num).sort().join(','),
      rfFlags: len((d.rf || {}).flags),
      openCards: len(open.cards),
      bankCurveballs: len(bank.curveballs),
      bankMockBeats: len(bank.mockBeats),
      bankFrames: len(bank.frames),
      hasVisual: !!d.visual,
      visualMode: d.visual ? d.visual.mode : null,
      visualStories: d.visual ? len(d.visual.stories) : 0,
    };
  });
  return { count: ids.length, ids, groups, order, rows };
});

fs.writeFileSync(OUT + '/topic-inventory.json', JSON.stringify(rep, null, 2));
console.log('TOPICS REGISTERED:', rep.count);
console.log('TOPIC_ORDER length:', rep.order.length);
console.log('ids not in TOPIC_ORDER:', rep.ids.filter(i => !rep.order.includes(i)));
console.log('TOPIC_ORDER entries not registered:', rep.order.filter(i => !rep.ids.includes(i)));
console.log('');
console.log('--- SLICE POPULATION (the gate cannot see these) ---');
const empty = (k) => rep.rows.filter(r => !r[k]).map(r => r.id);
for (const k of ['walkSteps', 'wbSteps', 'sysStages', 'sysPivots', 'tradeDecisions', 'modelAnswers', 'numInputs', 'rfFlags', 'openCards', 'bankCurveballs', 'bankMockBeats', 'bankFrames', 'wbDiagram']) {
  const e = empty(k);
  console.log(k.padEnd(16), 'EMPTY in', String(e.length).padStart(2), 'topics', e.length && e.length <= 12 ? ':: ' + e.join(' ') : (e.length ? ':: (' + e.length + ' topics)' : ''));
}
console.log('');
console.log('hasVisual:', rep.rows.filter(r => r.hasVisual).map(r => r.id));
console.log('sys pivots with EMPTY answer text:', rep.rows.filter(r => r.sysPivots > 0 && r.sysPivotsWithAnswer === 0).length, 'topics have 0/N pivots carrying an answer');
console.log('identity.total values:', [...new Set(rep.rows.map(r => r.total))].join(', '), '(registered count is ' + rep.count + ')');
console.log('');
console.log('--- TABLE ---');
console.log(['id', 'idx', 'group', 'title', 'walk', 'drill', 'wb', 'sysStg', 'sysPiv', 'trade', 'model', 'num', 'rf', 'open', 'bankCB', 'bankMB', 'viz'].join('\t'));
rep.rows.sort((a, b2) => rep.order.indexOf(a.id) - rep.order.indexOf(b2.id)).forEach(r => {
  console.log([r.id, r.index, r.group, r.title, r.walkSteps, r.drillCards, r.wbSteps, r.sysStages, r.sysPivots, r.tradeDecisions, r.modelAnswers, r.numInputs, r.rfFlags, r.openCards, r.bankCurveballs, r.bankMockBeats, r.hasVisual ? 'Y' : '-'].join('\t'));
});
console.log('');
console.log('--- TIER DISTRIBUTION ---');
rep.rows.forEach(r => { const t = r.tiers; console.log(r.id.padEnd(26), 'SDE2=' + (t.SDE2 || 0), 'SDE3=' + (t.SDE3 || 0), 'Staff=' + (t.Staff || 0), 'EXTEND=' + (t.EXTEND || 0), 'total=' + r.drillCards); });
console.log('');
console.log('PAGE ERRORS:', errs.length ? errs.join(' | ') : 'none');
await b.close();
