import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1200);

const data = await p.evaluate(() => {
  const R = window.TopicRegistry;
  const ids = R.ids ? R.ids() : [];
  const strip = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
  const deep = o => { const a = []; const seen = new Set(); (function w(x, d) { if (d > 9 || x == null) return; if (typeof x === 'string') { a.push(x); return; } if (typeof x !== 'object') return; if (seen.has(x)) return; seen.add(x); for (const k of Object.keys(x)) w(x[k], d + 1); })(o, 0); return strip(a.join(' ')); };
  const out = [];
  for (const id of ids) {
    const t = R.get(id); if (!t) continue;
    const d = t.data || {}, idn = t.identity || {};
    const r = { id, index: idn.index, group: idn.group, title: strip(idn.title) };

    const drill = (d.drill && d.drill.cards) || [];
    r.drillN = drill.length;
    r.fCards = drill.filter(c => Array.isArray(c.f) ? c.f.length > 0 : strip(c.f).length > 5).length;
    r.fProbes = drill.reduce((s, c) => s + (Array.isArray(c.f) ? c.f.length : 0), 0);
    r.seniorCards = drill.filter(c => strip(c.senior).length > 5).length;
    r.tierNotes = d.drill && d.drill.tierNotes ? Object.keys(d.drill.tierNotes).length : 0;
    r.drillSpeak = d.drill && d.drill.speak ? deep(d.drill.speak).length : 0;

    // trade
    const dec = (d.trade && d.trade.decisions) || [];
    r.tradeN = dec.length;
    r.tradeOpts = dec.reduce((s, x) => s + ((x.opts || []).length), 0);
    r.tradeTell = dec.filter(x => strip(x.tell).length > 20).length;
    r.tradeLen = deep(d.trade).length;

    // rf
    const fl = (d.rf && d.rf.flags) || [];
    r.rfN = fl.length; r.rfLen = deep(d.rf).length;
    r.rfSample = fl.map(x => strip(x.claim || x.bad || x.q || Object.values(x)[0]).slice(0, 60));

    // model
    const ans = (d.model && d.model.answers) || [];
    const sel = (d.model && d.model.selectors) || [];
    r.modelAns = ans.length; r.modelSel = sel.length; r.modelLen = deep(d.model).length;

    // bank
    const bk = d.bank || {};
    r.bankCards = (bk.cards || []).length;
    r.bankCurve = (bk.curveballs || []).length;
    r.bankBeats = (bk.mockBeats || []).length;
    r.bankFrames = (bk.frames || []).length;
    r.bankLen = deep(bk).length;

    // sys
    r.sysStages = ((d.sys && d.sys.stages) || []).length;
    r.sysPivots = ((d.sys && d.sys.pivots) || []).length;
    r.sysLen = deep(d.sys).length;

    // wb / walk / open
    r.wbSteps = ((d.wb && d.wb.steps) || []).length;
    r.wbLen = deep(d.wb).length;
    r.walkLen = deep(d.walk).length;
    r.openCards = ((d.open && d.open.cards) || []).length;
    r.openLen = deep(d.open).length;

    // num
    const num = d.num || {};
    r.numIn = (num.inputs || []).length;
    r.numRows = 0; r.numDyn = 0; r.numConstRows = [];
    if (typeof num.compute === 'function') {
      try {
        const v1 = {}; (num.inputs || []).forEach(i => v1[i.id] = Number(i.value));
        const v2 = {}; (num.inputs || []).forEach(i => v2[i.id] = Number(i.value) * 3.7 + 1);
        const fmt = { n: x => String(Math.round(Number(x) * 100) / 100), tb: x => x + 'TB', gb: x => x + 'GB', b: x => String(x), pct: x => x + '%', ms: x => x + 'ms', bytes: x => x + 'B', s: x => x + 's' };
        const A = num.compute(v1, fmt) || [], B = num.compute(v2, fmt) || [];
        r.numRows = A.length;
        for (let i = 0; i < A.length; i++) {
          const same = B[i] && String(A[i].v) === String(B[i].v);
          if (same) r.numConstRows.push(strip(A[i].k) + ' = "' + strip(A[i].v) + '"');
          else r.numDyn++;
        }
      } catch (e) { r.numErr = e.message; }
    }
    out.push(r);
  }
  return out;
});

fs.writeFileSync(OUT + '/fingerprint2.json', JSON.stringify(data, null, 1));
const rows = data.sort((a, b) => a.index - b.index);
const ORIG = new Set(['content-pipeline', 'signing', 'authz', 'notifications', 'iac', 'aws-hardening', 'desired-state', 'eav']);
const O = r => ORIG.has(r.id);

console.log('idx\tid\t\t\tsrc\tfCard\tfProbe\tsenior\ttierN\ttrade\ttOpt\trf\tmSel\tmAns\tmLen\tbank(c/cv/bt/fr)\tsysStg\tsysPiv\tsysLen\twbStep\topen');
for (const r of rows) {
  const pad = r.id.length < 8 ? '\t\t\t' : r.id.length < 16 ? '\t\t' : '\t';
  console.log(`${r.index}\t${r.id}${pad}${O(r) ? 'ORIG' : 'md'}\t${r.fCards}\t${r.fProbes}\t${r.seniorCards}\t${r.tierNotes}\t${r.tradeN}\t${r.tradeOpts}\t${r.rfN}\t${r.modelSel}\t${r.modelAns}\t${r.modelLen}\t${r.bankCards}/${r.bankCurve}/${r.bankBeats}/${r.bankFrames}\t\t${r.sysStages}\t${r.sysPivots}\t${r.sysLen}\t${r.wbSteps}\t${r.openCards}`);
}
const agg = f => {
  const g = rows.filter(f); const m = k => Math.round(g.reduce((a, b) => a + (Number(b[k]) || 0), 0) / g.length * 10) / 10;
  return { n: g.length, fCards: m('fCards'), fProbes: m('fProbes'), senior: m('seniorCards'), trade: m('tradeN'), tradeOpts: m('tradeOpts'), rf: m('rfN'), modelSel: m('modelSel'), modelAns: m('modelAns'), modelLen: m('modelLen'), bankCards: m('bankCards'), bankCurve: m('bankCurve'), bankBeats: m('bankBeats'), sysStages: m('sysStages'), sysPivots: m('sysPivots'), sysLen: m('sysLen'), wbSteps: m('wbSteps'), wbLen: m('wbLen'), openCards: m('openCards'), openLen: m('openLen'), walkLen: m('walkLen'), tradeLen: m('tradeLen'), rfLen: m('rfLen'), bankLen: m('bankLen'), numDyn: m('numDyn'), numRows: m('numRows') };
};
console.log('\n=== AGG ORIGINALS(8) ==='); console.log(JSON.stringify(agg(O), null, 1));
console.log('=== AGG MD(38) ==='); console.log(JSON.stringify(agg(r => !O(r)), null, 1));

console.log('\n=== NUM: constant (non-computing) rows per md topic ===');
for (const r of rows) if (r.numConstRows.length) console.log(`${r.id} [${r.numDyn}/${r.numRows} dynamic] const: ${r.numConstRows.join(' | ')}`);
await b.close();
