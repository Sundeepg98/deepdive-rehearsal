/* VERIFY two remaining claims:
   (1) NUM: "storage-engines computes only 1 of 5 rows".  The lens scaled every input by the
       SAME factor (3.7x) and diffed only row.v -- a uniform scale CANNOT move a RATIO-based
       verdict row, so that probe is blind by construction. Re-measure with RATIO-CHANGING
       perturbations and diff the WHOLE row (v + u + n + over).
   (2) cross-topic pivot jump chips: 43 in originals vs 0 in compiled. */
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);

const mdIds = fs.readdirSync('D:/claude-workspace/deepdive-rehearsal/src/topics-md').filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''));

const res = await p.evaluate((mdIds) => {
  const fmt = { n: x => (typeof x === 'number' ? (Math.round(x * 100) / 100).toLocaleString() : String(x)), tb: x => (Math.round(x * 100) / 100) + ' TB' };
  const out = { num: [], links: [] };

  TopicRegistry.ids().forEach(id => {
    const t = TopicRegistry.get(id), num = t.data.num || {}, sys = t.data.sys || {};
    const isMd = mdIds.includes(id);

    // ---------- NUM ----------
    if (num.compute && num.inputs) {
      const base = {}; num.inputs.forEach(i => base[i.id] = i.value);
      const rowsBase = num.compute(base, fmt);
      const nRows = rowsBase.length;
      const moved = new Array(nRows).fill(false);      // ANY field of the row changed
      const movedV = new Array(nRows).fill(false);     // only .v changed (the lens's metric)

      // perturbation set: uniform scale (what the lens did) PLUS single-input sweeps that
      // genuinely change the RATIOS between inputs.
      const trials = [];
      trials.push(Object.fromEntries(num.inputs.map(i => [i.id, i.value * 3.7])));   // uniform (lens)
      num.inputs.forEach(target => {                                                  // one-at-a-time
        [0.1, 0.25, 4, 25].forEach(k => {
          const v = { ...base };
          const min = target.min === undefined ? 0 : target.min;
          v[target.id] = Math.max(min, Math.round(target.value * k)) || min || 1;
          trials.push(v);
        });
      });

      trials.forEach(v => {
        let rows; try { rows = num.compute(v, fmt); } catch (e) { return; }
        for (let i = 0; i < nRows && i < rows.length; i++) {
          const A = rowsBase[i], B = rows[i];
          if (String(A.v) !== String(B.v)) { movedV[i] = true; moved[i] = true; }
          if (String(A.u) !== String(B.u) || String(A.n) !== String(B.n) || A.over !== B.over) moved[i] = true;
        }
      });
      out.num.push({
        id, isMd, nRows,
        dynAny: moved.filter(Boolean).length,
        dynV: movedV.filter(Boolean).length,
        staticRows: rowsBase.map((r, i) => moved[i] ? null : r.k).filter(Boolean),
        rowsV: rowsBase.map((r, i) => ({ k: r.k, v: String(r.v), movedAny: moved[i], movedV: movedV[i] }))
      });
    }

    // ---------- cross-topic jump chips ----------
    // TOPIC_CONTRACT.md: a chip is a jump when its text carries a (N) index OR another topic's exact title
    const titles = TopicRegistry.ids().map(x => ({ id: x, title: TopicRegistry.get(x).identity.title, idx: TopicRegistry.get(x).identity.index }));
    let jumps = 0; const samples = [];
    (sys.pivots || []).forEach(pv => {
      const txt = String(pv.chip || '');
      let hit = /\(\d+\)/.test(txt);
      if (!hit) hit = titles.some(o => o.id !== id && o.title && txt.includes(o.title));
      if (hit) { jumps++; if (samples.length < 2) samples.push(txt.slice(0, 60)); }
    });
    out.links.push({ id, isMd, pivots: (sys.pivots || []).length, jumps, samples });
  });
  return out;
}, mdIds);

const MD = res.num.filter(r => r.isMd), OR = res.num.filter(r => !r.isMd);
const avg = (a, f) => a.length ? (a.reduce((s, x) => s + f(x), 0) / a.length).toFixed(2) : 0;
console.log('=== NUM: rows responsive to inputs ===');
console.log('  metric                                     ORIG      MD');
console.log('  rows/topic                                 ' + avg(OR, r => r.nRows) + '      ' + avg(MD, r => r.nRows));
console.log('  dynamic rows (LENS method: .v only)        ' + avg(OR, r => r.dynV) + '      ' + avg(MD, r => r.dynV));
console.log('  dynamic rows (WHOLE row, ratio-aware)      ' + avg(OR, r => r.dynAny) + '      ' + avg(MD, r => r.dynAny));

const se = res.num.find(r => r.id === 'storage-engines');
console.log('\n=== storage-engines (the lens\'s worst offender: claimed "1 of 5") ===');
console.log('  dynamic by LENS method (.v only, uniform scale bias): ' + se.dynV + ' / ' + se.nRows);
console.log('  dynamic by WHOLE-ROW ratio-aware probe              : ' + se.dynAny + ' / ' + se.nRows);
se.rowsV.forEach(r => console.log('    ' + (r.movedAny ? '[DYNAMIC]' : '[ STATIC]') + ' ' + r.k.padEnd(22) + ' base v=' + JSON.stringify(r.v)));
console.log('  genuinely CONSTANT rows: ' + JSON.stringify(se.staticRows));

console.log('\n=== topics with <=2 dynamic rows (whole-row probe) ===');
res.num.filter(r => r.dynAny <= 2).forEach(r => console.log('  ' + (r.isMd ? 'MD  ' : 'ORIG') + ' ' + r.id.padEnd(26) + ' ' + r.dynAny + '/' + r.nRows + '  static: ' + JSON.stringify(r.staticRows)));

const lMD = res.links.filter(r => r.isMd), lOR = res.links.filter(r => !r.isMd);
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
console.log('\n=== CROSS-TOPIC JUMP CHIPS ===');
console.log('  ORIGINALS: ' + sum(lOR, r => r.jumps) + ' jump chips across ' + sum(lOR, r => r.pivots) + ' pivots (' + lOR.filter(r => r.jumps > 0).length + '/' + lOR.length + ' topics have >=1)');
console.log('  COMPILED : ' + sum(lMD, r => r.jumps) + ' jump chips across ' + sum(lMD, r => r.pivots) + ' pivots (' + lMD.filter(r => r.jumps > 0).length + '/' + lMD.length + ' topics have >=1)');
console.log('  sample ORIG chips: ' + JSON.stringify(lOR.flatMap(r => r.samples).slice(0, 3)));
console.log('  sample MD chips  : ' + JSON.stringify(lMD.flatMap(r => r.samples).slice(0, 3)));

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_vfy-num-links.json', JSON.stringify(res, null, 1));
await b.close();
