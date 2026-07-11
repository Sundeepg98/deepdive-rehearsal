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
  if (!R) return { err: 'no TopicRegistry on window' };
  // discover the id list
  let ids = [];
  try { ids = R.ids ? R.ids() : (R.all ? R.all().map(t => t.id) : []); } catch (e) { }
  if (!ids.length && R.list) { try { ids = R.list().map(t => t.id || t); } catch (e) { } }
  const strip = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
  const textOf = o => {
    // deep-collect all string values
    const acc = [];
    const seen = new Set();
    (function w(x, d) {
      if (d > 8 || x == null) return;
      if (typeof x === 'string') { acc.push(x); return; }
      if (typeof x === 'function') { acc.push('[fn]' + x.toString()); return; }
      if (typeof x !== 'object') return;
      if (seen.has(x)) return; seen.add(x);
      for (const k of Object.keys(x)) w(x[k], d + 1);
    })(o, 0);
    return acc;
  };

  const out = [];
  for (const id of ids) {
    const t = R.get(id);
    if (!t) continue;
    const idn = t.identity || {};
    const d = t.data || {};
    const rec = { id, index: idn.index, group: idn.group, title: strip(idn.title), thesisLen: strip(idn.thesis).length };

    // DRILL
    const drill = Array.isArray(d.drill) ? d.drill : (d.drill && d.drill.cards) || [];
    rec.drillN = drill.length;
    const tiers = {};
    let aLens = [], qLens = [], withF = 0, withSenior = 0, withSignal = 0;
    for (const c of drill) {
      tiers[c.tier] = (tiers[c.tier] || 0) + 1;
      aLens.push(strip(c.a).length); qLens.push(strip(c.q).length);
      if (strip(c.f).length > 10) withF++;
      if (strip(c.senior).length > 10) withSenior++;
      if (strip(c.signal).length > 2) withSignal++;
    }
    rec.tiers = tiers;
    rec.drillAvgA = aLens.length ? Math.round(aLens.reduce((a, b) => a + b, 0) / aLens.length) : 0;
    rec.drillMinA = aLens.length ? Math.min(...aLens) : 0;
    rec.drillWithF = withF; rec.drillWithSenior = withSenior; rec.drillWithSignal = withSignal;

    // NUM: is compute a real fn? how many rows / inputs
    const num = d.num || {};
    rec.numInputs = (num.inputs || []).length;
    rec.numHasCompute = typeof num.compute === 'function';
    rec.numRows = 0; rec.numDynamicRows = 0; rec.numRowsSample = [];
    if (rec.numHasCompute) {
      try {
        const vals = {}; (num.inputs || []).forEach(i => vals[i.id] = i.value);
        const fmt = { n: x => String(Math.round(Number(x) * 100) / 100), tb: x => String(x) + 'TB', b: x => String(x), pct: x => String(x) + '%', ms: x => x + 'ms', bytes: x => x + 'B' };
        const rows = num.compute(vals, fmt) || [];
        rec.numRows = rows.length;
        // a row is "dynamic" if its value changes when inputs are scaled
        const vals2 = {}; (num.inputs || []).forEach(i => vals2[i.id] = (Number(i.value) || 1) * 3.7 + 1);
        const rows2 = num.compute(vals2, fmt) || [];
        let dyn = 0;
        for (let i = 0; i < rows.length; i++) {
          if (rows2[i] && String(rows[i].v) !== String(rows2[i].v)) dyn++;
        }
        rec.numDynamicRows = dyn;
        rec.numRowsSample = rows.map(r => strip(r.k) + '=' + strip(r.v) + strip(r.u || ''));
        rec.numFnLen = String(num.compute).length;
      } catch (e) { rec.numErr = String(e.message); }
    }

    // RF
    const rf = d.rf || {};
    const rfItems = rf.items || rf.flags || (Array.isArray(rf) ? rf : []);
    rec.rfN = Array.isArray(rfItems) ? rfItems.length : 0;
    rec.rfAvgLen = 0;
    if (rec.rfN) {
      const L = rfItems.map(x => textOf(x).join(' ')).map(s => strip(s).length);
      rec.rfAvgLen = Math.round(L.reduce((a, b) => a + b, 0) / L.length);
      rec.rfSample = rfItems.map(x => strip(x.claim || x.q || x.title || x.flag || Object.values(x)[0]));
    }

    // TRADE
    const tr = d.trade || {};
    const trItems = tr.items || tr.rows || (Array.isArray(tr) ? tr : []);
    rec.tradeN = Array.isArray(trItems) ? trItems.length : 0;
    if (rec.tradeN) rec.tradeSample = trItems.map(x => strip(x.title || x.q || x.name || Object.values(x)[0]));

    // MODEL
    const md = d.model || {};
    const mdItems = md.items || md.answers || (Array.isArray(md) ? md : []);
    rec.modelN = Array.isArray(mdItems) ? mdItems.length : 0;
    if (rec.modelN) {
      const L = mdItems.map(x => strip(textOf(x).join(' ')).length);
      rec.modelAvgLen = Math.round(L.reduce((a, b) => a + b, 0) / L.length);
      rec.modelTotalLen = L.reduce((a, b) => a + b, 0);
    }

    // BANK
    const bk = d.bank || {};
    const bkItems = bk.items || bk.prompts || (Array.isArray(bk) ? bk : []);
    rec.bankN = Array.isArray(bkItems) ? bkItems.length : 0;

    // WALK / WB / SYS / OPEN total text
    for (const k of ['walk', 'wb', 'sys', 'open']) {
      rec[k + 'Len'] = strip(textOf(d[k]).filter(s => !s.startsWith('[fn]')).join(' ')).length;
    }
    // total content chars
    rec.totalLen = strip(textOf(d).filter(s => !s.startsWith('[fn]')).join(' ')).length;
    out.push(rec);
  }
  return { ids, out };
});

if (data.err) { console.log('ERR', data.err); await b.close(); process.exit(1); }
fs.writeFileSync(OUT + '/fingerprint.json', JSON.stringify(data.out, null, 1));

const rows = data.out.sort((a, b) => (a.index || 0) - (b.index || 0));
const ORIG = new Set(['content-pipeline', 'signing', 'authz', 'notifications', 'iac', 'aws-hardening', 'desired-state', 'eav']);
console.log('TOTAL TOPICS:', rows.length);
const hdr = ['idx', 'id', 'orig', 'drillN', 'S2/S3/St/EX', 'avgA', 'minA', 'sig', 'f', 'sr', 'numIn', 'numRow', 'dyn', 'rf', 'trade', 'model', 'mdAvg', 'bank', 'total'];
console.log(hdr.join('\t'));
for (const r of rows) {
  const t = r.tiers || {};
  console.log([
    r.index, r.id, ORIG.has(r.id) ? 'ORIG' : 'md',
    r.drillN,
    `${t.SDE2 || 0}/${t.SDE3 || 0}/${t.Staff || 0}/${t.EXTEND || 0}`,
    r.drillAvgA, r.drillMinA, r.drillWithSignal, r.drillWithF, r.drillWithSenior,
    r.numInputs, r.numRows, r.numDynamicRows,
    r.rfN, r.tradeN, r.modelN, r.modelAvgLen || 0, r.bankN, r.totalLen
  ].join('\t'));
}

// aggregate orig vs md
const agg = (set) => {
  const g = rows.filter(r => set(r.id));
  const m = k => Math.round(g.reduce((a, b) => a + (Number(b[k]) || 0), 0) / g.length);
  return { n: g.length, drillN: m('drillN'), avgA: m('drillAvgA'), numRows: m('numRows'), dyn: m('numDynamicRows'), rf: m('rfN'), trade: m('tradeN'), model: m('modelN'), mdAvg: m('modelAvgLen'), bank: m('bankN'), total: m('totalLen'), walk: m('walkLen'), wb: m('wbLen'), sys: m('sysLen'), open: m('openLen') };
};
console.log('\n=== AGGREGATE ===');
console.log('ORIGINALS(8):', JSON.stringify(agg(id => ORIG.has(id))));
console.log('MD-BULK(38):', JSON.stringify(agg(id => !ORIG.has(id))));
await b.close();
