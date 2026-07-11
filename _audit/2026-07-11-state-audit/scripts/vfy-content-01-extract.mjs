/* ADVERSARIAL VERIFY - vd-content lens.
   Independent extraction of the FULL registry from the BUILT dist. No reuse of the
   original lens's scripts. Every number below is recomputed from scratch. */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);

const data = await p.evaluate(() => {
  const ids = TopicRegistry.ids();
  const txt = h => { const d = document.createElement('div'); d.innerHTML = h == null ? '' : String(h); return (d.textContent || '').trim(); };
  return ids.map(id => {
    const t = TopicRegistry.get(id), D = t.data, idn = t.identity;
    const drill = D.drill || {}, bank = D.bank || {}, sys = D.sys || {}, wb = D.wb || {},
          model = D.model || {}, rf = D.rf || {}, trade = D.trade || {}, num = D.num || {};
    const cards = (drill.cards || bank.cards || []);
    const speak = (bank.speak || []);
    const curve = (bank.curveballs || []);
    return {
      id, index: idn.index, title: idn.title, group: idn.group,
      // ---- drill ----
      nCards: cards.length,
      tiers: cards.reduce((m, c) => (m[c.tier] = (m[c.tier] || 0) + 1, m), {}),
      cardsNoF: cards.filter(c => !c.f || c.f.length === 0).length,
      cardsFUndef: cards.filter(c => c.f === undefined).length,
      totalF: cards.reduce((s, c) => s + ((c.f && c.f.length) || 0), 0),
      cardsEmptySenior: cards.filter(c => !c.senior || String(c.senior).trim() === '').length,
      cardsSeniorUndef: cards.filter(c => c.senior === undefined).length,
      nSpeak: speak.length,
      speakEmpty: speak.filter(s => !s || String(s).trim() === '').length,
      speakUndefSlots: Math.max(0, cards.length - speak.length), // -> speakLines[di] === undefined
      answerLens: cards.map(c => txt(c.a).length),
      answerLensRaw: cards.map(c => (c.a || '').length),
      cardsEmptyA: cards.filter(c => !c.a || String(c.a).trim() === '').length,
      // ---- tierNotes ----
      tierNotesKeys: Object.keys(drill.tierNotes || {}),
      tierNotesAllType: typeof (drill.tierNotes || {}).all,
      tierNotesIsUndefinedObj: drill.tierNotes === undefined,
      // ---- sys ----
      sysStages: (sys.stages || []).length,
      sysStagesUndef: sys.stages === undefined,
      sysPivots: (sys.pivots || []).length,
      sysPivotsEmptyA: (sys.pivots || []).filter(x => !x.a || String(x.a).trim() === '').length,
      sysPivotQ: (sys.pivots || []).map(x => x.q || x.chip || x.label || ''),
      sysRaw: JSON.stringify(sys).slice(0, 400),
      // ---- wb ----
      wbSteps: (wb.steps || []).length,
      wbFoot: (wb.foot || ''),
      wbFootEmpty: !wb.foot || String(wb.foot).trim() === '',
      // ---- model ----
      modelAnswers: (model.answers || []).length,
      modelProseChars: JSON.stringify(model.answers || []).length,
      modelProseText: (model.answers || []).map(a => txt(JSON.stringify(a).replace(/[{}"\[\],]/g, ' '))).join(' ').length,
      modelRaw: JSON.stringify(model).slice(0, 900),
      // ---- rf / trade / num ----
      rfFlags: (rf.flags || []).length,
      tradeDecisions: (trade.decisions || []).length,
      numRows: (num.rows || []).length,
      // ---- curveballs ----
      nCurve: curve.length,
      curveNoTask: curve.filter(c => c.task === undefined || c.task === null || String(c.task).trim() === '').length,
      curveTaskUndef: curve.filter(c => c.task === undefined).length,
      curveNoInt: curve.filter(c => !c.int).length,
      curveRaw: JSON.stringify(curve[0] || {}).slice(0, 400),
      // ---- misc ----
      allKeysDrill: Object.keys(drill),
      allKeysSys: Object.keys(sys),
      allKeysModel: Object.keys(model)
    };
  });
});

fs.writeFileSync(OUT + '/scripts/_vfy-registry.json', JSON.stringify(data, null, 1));

// ---- classify orig (hand-authored JS) vs md (compiled) by reading the fs list ----
const mdIds = fs.readdirSync('D:/claude-workspace/deepdive-rehearsal/src/topics-md')
  .filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''));
const genIds = fs.readdirSync('D:/claude-workspace/deepdive-rehearsal/src/topics/_generated');
const origIds = fs.readdirSync('D:/claude-workspace/deepdive-rehearsal/src/topics')
  .filter(f => f.endsWith('.js') && f !== '_generated-registry.js').map(f => f.replace(/\.js$/, ''));

console.log('MD source files      :', mdIds.length);
console.log('_generated dirs      :', genIds.length);
console.log('ORIG bundle .js files:', origIds.length, origIds.join(','));
console.log('Registry topics      :', data.length);

const isMd = t => mdIds.includes(t.id);
const MD = data.filter(isMd), OR = data.filter(t => !isMd(t));
console.log('\nCLASSIFIED: orig=' + OR.length + ' md=' + MD.length);
console.log('orig ids:', OR.map(t => t.id).join(', '));
const unknown = data.filter(t => !mdIds.includes(t.id) && !origIds.includes(t.id));
if (unknown.length) console.log('!! UNCLASSIFIED:', unknown.map(t => t.id).join(','));

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const avg = (a, f) => a.length ? (sum(a, f) / a.length) : 0;
const med = arr => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const L = (k, f, fmt = (v => v.toFixed(1))) =>
  console.log('  ' + k.padEnd(30) + ' ORIG ' + String(fmt(avg(OR, f))).padStart(9) + '   MD ' + String(fmt(avg(MD, f))).padStart(9));

console.log('\n=== TOTALS ===');
console.log('  cards        ORIG', sum(OR, t => t.nCards), ' MD', sum(MD, t => t.nCards));
console.log('  follow-ups   ORIG', sum(OR, t => t.totalF), ' MD', sum(MD, t => t.totalF));
console.log('  cards w/ f:[]           ORIG ' + sum(OR, t => t.cardsNoF) + '/' + sum(OR, t => t.nCards) + '   MD ' + sum(MD, t => t.cardsNoF) + '/' + sum(MD, t => t.nCards));
console.log('  cards w/ f===undefined  ORIG ' + sum(OR, t => t.cardsFUndef) + '   MD ' + sum(MD, t => t.cardsFUndef));
console.log('  cards empty senior      ORIG ' + sum(OR, t => t.cardsEmptySenior) + '/' + sum(OR, t => t.nCards) + '   MD ' + sum(MD, t => t.cardsEmptySenior) + '/' + sum(MD, t => t.nCards));
console.log('  cards empty a           ORIG ' + sum(OR, t => t.cardsEmptyA) + '   MD ' + sum(MD, t => t.cardsEmptyA));
console.log('  speak entries empty     ORIG ' + sum(OR, t => t.speakEmpty) + '/' + sum(OR, t => t.nSpeak) + '   MD ' + sum(MD, t => t.speakEmpty) + '/' + sum(MD, t => t.nSpeak));
console.log('  speak UNDEFINED slots   ORIG ' + sum(OR, t => t.speakUndefSlots) + '   MD ' + sum(MD, t => t.speakUndefSlots));
console.log('  topics tierNotes EMPTY  ORIG ' + OR.filter(t => t.tierNotesKeys.length === 0).length + '/' + OR.length + '   MD ' + MD.filter(t => t.tierNotesKeys.length === 0).length + '/' + MD.length);
console.log('  topics tierNotes.all undefined  ORIG ' + OR.filter(t => t.tierNotesAllType === 'undefined').length + '   MD ' + MD.filter(t => t.tierNotesAllType === 'undefined').length);
console.log('  topics sys.stages EMPTY ORIG ' + OR.filter(t => t.sysStages === 0).length + '/' + OR.length + '   MD ' + MD.filter(t => t.sysStages === 0).length + '/' + MD.length);
console.log('  topics wb.foot EMPTY    ORIG ' + OR.filter(t => t.wbFootEmpty).length + '/' + OR.length + '   MD ' + MD.filter(t => t.wbFootEmpty).length + '/' + MD.length);
console.log('  sys pivots empty .a     ORIG ' + sum(OR, t => t.sysPivotsEmptyA) + '/' + sum(OR, t => t.sysPivots) + '   MD ' + sum(MD, t => t.sysPivotsEmptyA) + '/' + sum(MD, t => t.sysPivots));
console.log('  curveballs no .task     ORIG ' + sum(OR, t => t.curveNoTask) + '/' + sum(OR, t => t.nCurve) + '   MD ' + sum(MD, t => t.curveNoTask) + '/' + sum(MD, t => t.nCurve));
console.log('  curveballs task===undef ORIG ' + sum(OR, t => t.curveTaskUndef) + '   MD ' + sum(MD, t => t.curveTaskUndef));
console.log('  curveballs no .int      ORIG ' + sum(OR, t => t.curveNoInt) + '/' + sum(OR, t => t.nCurve) + '   MD ' + sum(MD, t => t.curveNoInt) + '/' + sum(MD, t => t.nCurve));

console.log('\n=== PER-TOPIC AVERAGES (ORIG vs MD) ===');
L('drill cards', t => t.nCards);
L('model answers', t => t.modelAnswers);
L('model prose chars (JSON)', t => t.modelProseChars, v => Math.round(v));
L('rf flags', t => t.rfFlags);
L('trade decisions', t => t.tradeDecisions);
L('curveballs', t => t.nCurve);
L('wb steps', t => t.wbSteps);
L('num rows', t => t.numRows);
L('sys pivots', t => t.sysPivots);

console.log('\n=== DRILL ANSWER LENGTH (visible text chars) ===');
const allA = a => a.flatMap(t => t.answerLens);
console.log('  ORIG  median', med(allA(OR)), ' mean', Math.round(avg(allA(OR).map(x => ({ x })), o => o.x)), ' n=', allA(OR).length, ' >1200:', allA(OR).filter(x => x > 1200).length);
console.log('  MD    median', med(allA(MD)), ' mean', Math.round(avg(allA(MD).map(x => ({ x })), o => o.x)), ' n=', allA(MD).length, ' >1200:', allA(MD).filter(x => x > 1200).length);
console.log('  CORPUS >1200 chars:', allA(data).filter(x => x > 1200).length, ' of', allA(data).length);
const longest = data.flatMap(t => t.answerLens.map((l, i) => ({ t: t.id, i, l }))).sort((a, c) => c.l - a.l)[0];
console.log('  LONGEST single card:', longest.t, 'card#' + longest.i, longest.l, 'chars (~' + Math.round(longest.l / 5.6) + ' words)');

console.log('\n=== MD topics sorted by identity.index -> median answer len (drift check) ===');
[...MD].sort((a, c) => a.index - c.index).forEach(t => {
  console.log('  idx ' + String(t.index).padStart(3) + '  ' + t.id.padEnd(26) + ' median ' + String(med(t.answerLens)).padStart(5) + '  max ' + String(Math.max(...t.answerLens)).padStart(5) + '  >1200: ' + t.answerLens.filter(x => x > 1200).length + '/' + t.nCards);
});
console.log('\n=== ORIG topics by index ===');
[...OR].sort((a, c) => a.index - c.index).forEach(t => {
  console.log('  idx ' + String(t.index).padStart(3) + '  ' + t.id.padEnd(26) + ' median ' + String(med(t.answerLens)).padStart(5) + '  max ' + String(Math.max(...t.answerLens)).padStart(5) + '  >1200: ' + t.answerLens.filter(x => x > 1200).length + '/' + t.nCards + '  f=' + t.totalF);
});

console.log('\n=== SAMPLE RAW (idempotency vs signing) ===');
const idem = data.find(t => t.id === 'idempotency'), sign = data.find(t => t.id === 'signing');
if (idem) { console.log('idempotency drill keys:', idem.allKeysDrill, 'tierNotes keys:', idem.tierNotesKeys, 'sys:', idem.sysRaw); console.log('idempotency curve[0]:', idem.curveRaw); console.log('idempotency model:', idem.modelRaw); }
if (sign) { console.log('signing tierNotes keys:', sign.tierNotesKeys, 'stages:', sign.sysStages, 'model answers:', sign.modelAnswers); console.log('signing curve[0]:', sign.curveRaw); }

console.log('\nERRORS during load:', errs.length ? errs.join('\n') : 'none');
await b.close();
