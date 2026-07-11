#!/usr/bin/env node
/*
 * skeptic_measure.cjs -- INDEPENDENT measurement of depth parity, in the real built app.
 *
 * Measures through TopicRegistry, the SAME runtime API the 8 and the 38 both register through,
 * so the comparison is apples-to-apples by construction: it reads what the APP sees, not what a
 * parser or a test fixture says. Written by the verifier; imports none of the fixer's tooling.
 *
 *   node _audit/2026-07-11-compiler-parity/skeptic_measure.cjs
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const HTML = path.join(__dirname, '..', '..', 'dist', 'index.html');
const OUT = __dirname;
const THE_8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];

(async () => {
  const errs = [];
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto('file://' + HTML);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  // ---------------------------------------------------------------------------------------
  // PART 1 -- THE MEASUREMENT. Every slice, every topic, straight off the registry.
  // ---------------------------------------------------------------------------------------
  const data = await page.evaluate(() => {
    const ids = TopicRegistry.ids();
    const rows = {};
    for (const id of ids) {
      const t = TopicRegistry.get(id);
      const d = t.data || {};
      const idn = t.identity || {};
      const sys = d.sys || {}, drill = d.drill || {}, bank = d.bank || {}, walk = d.walk || {};
      const model = d.model || {}, wb = d.wb || {}, trade = d.trade || {}, rf = d.rf || {};
      const num = d.num || {}, open = d.open || {};
      const cards = drill.cards || [];
      const stages = sys.stages || [];
      const pivots = sys.pivots || [];
      const answers = model.answers || [];
      const mock = bank.mockBeats || [];
      const curve = bank.curveballs || [];
      const steps = walk.steps || [];
      const nz = (s) => !!(s && String(s).trim());
      // a walk step's code blocks: block 0 rides on the step, blocks 1..N in step.blocks[]
      const stepBlocks = (s) => ((s.code || s.shiki) ? 1 : 0) + ((s.blocks || []).filter((b) => b.code || b.shiki).length);

      rows[id] = {
        'sys.stages': stages.length,
        'sys.stageCur': stages.filter((s) => s.cur).length,
        'sys.pivots': pivots.length,
        'sys.pivotAnswers': pivots.filter((p) => nz(p.a)).length,
        'drill.cards': cards.length,
        'drill.tierNotes': Object.keys(drill.tierNotes || {}).length,
        'drill.follows': cards.reduce((n, c) => n + ((c.f || []).length), 0),
        'drill.senior': cards.filter((c) => nz(c.senior)).length,
        'drill.speak': (drill.speak || []).filter(nz).length,
        'model.answers': answers.length,
        'model.beats': answers.reduce((n, a) => n + ((a.beats || []).length), 0),
        'bank.mockBeats': mock.length,
        'bank.curveballs': curve.length,
        'bank.beatModels': [...new Set([...mock, ...curve])].filter((b) => nz(b.model)).length,
        'bank.beatInts': [...new Set([...mock, ...curve])].filter((b) => b.int && nz(b.int.q)).length,
        'bank.curveThemes': curve.filter((c) => nz(c.theme) && c.theme !== 'CURVEBALL').length,
        'walk.steps': steps.length,
        'walk.codeBlocks': steps.reduce((n, s) => n + stepBlocks(s), 0),
        'wb.steps': (wb.steps || []).length,
        'trade.decisions': (trade.decisions || []).length,
        'rf.flags': (rf.flags || []).length,
        'num.inputs': (num.inputs || []).length,
        'open.cards': (open.cards || []).length,
        'identity.cmpNotes': Object.keys(idn.cmpNotes || {}).length,
      };
    }
    return rows;
  });

  const ids = Object.keys(data);
  const eight = ids.filter((i) => THE_8.includes(i));
  const thirtyEight = ids.filter((i) => !THE_8.includes(i));
  const SLICES = Object.keys(data[ids[0]]);
  const avg = (group, k) => group.reduce((n, id) => n + data[id][k], 0) / group.length;

  const table = SLICES.map((k) => {
    const a8 = avg(eight, k), a38 = avg(thirtyEight, k);
    return { slice: k, eight: a8, thirtyEight: a38, ratio: a8 > 0 ? a38 / a8 : null,
             total38: thirtyEight.reduce((n, id) => n + data[id][k], 0) };
  });

  // THE DEPTH-PARITY RATIO. Ratio-of-sums (not mean-of-ratios): a slice where the 8 are deep
  // counts for what it is worth, and a 0/0 slice cannot silently score 100%.
  const cmp = table.filter((r) => r.ratio !== null);
  const sum8 = cmp.reduce((n, r) => n + r.eight, 0);
  const sum38 = cmp.reduce((n, r) => n + r.thirtyEight, 0);
  const parity = sum38 / sum8;

  const M = [];
  M.push('DEPTH PARITY -- measured in the built app, through TopicRegistry (the 8 and the 38 register identically)');
  M.push('topics: ' + eight.length + ' hand-coded, ' + thirtyEight.length + ' compiled\n');
  M.push('  ' + 'slice'.padEnd(20) + 'THE 8'.padStart(8) + 'THE 38'.padStart(9) + 'PARITY'.padStart(9) + '   total across the 38');
  M.push('  ' + '-'.repeat(70));
  for (const r of table) {
    M.push('  ' + r.slice.padEnd(20) + r.eight.toFixed(1).padStart(8) + r.thirtyEight.toFixed(1).padStart(9)
      + (r.ratio === null ? '     n/a' : (100 * r.ratio).toFixed(0) + '%').padStart(9) + '   ' + r.total38);
  }
  M.push('  ' + '-'.repeat(70));
  M.push('  ' + 'TOTAL (per topic)'.padEnd(20) + sum8.toFixed(1).padStart(8) + sum38.toFixed(1).padStart(9)
    + ((100 * parity).toFixed(0) + '%').padStart(9));
  M.push('\n  DEPTH PARITY vs THE 8: ' + (100 * parity).toFixed(1) + '%');
  console.log(M.join('\n'));
  fs.writeFileSync(path.join(OUT, 'measure_parity.txt'), M.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'measure_raw.json'), JSON.stringify({ perTopic: data, table, parity }, null, 1));

  console.log('\nCONSOLE/PAGE ERRORS during measurement: ' + errs.length);
  errs.slice(0, 5).forEach((e) => console.log('  ' + e));
  await browser.close();
})();
