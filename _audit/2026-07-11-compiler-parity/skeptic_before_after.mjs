#!/usr/bin/env node
/*
 * skeptic_before_after.mjs -- the ONLY honest before/after: ONE metric, BOTH parsers.
 *
 * Comparing my 23% against the prior audit's "28%" would be malpractice -- they are different
 * aggregations. So this runs the SAME slice definitions and the SAME ratio over the OLD parser
 * and the NEW one. The 8 are the constant baseline (hand-coded JS; no parser touches them), read
 * from the in-browser measurement so both sides are on the app's own numbers.
 *
 *   node _audit/2026-07-11-compiler-parity/skeptic_before_after.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const DIR = 'src/topics-md';
const RAW = JSON.parse(fs.readFileSync('_audit/2026-07-11-compiler-parity/measure_raw.json', 'utf8'));
const THE_8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];

// identical slice definitions to skeptic_measure.cjs, applied to a parsed topic
const nz = (s) => !!(s && String(s).trim());
function slices(t) {
  const d = t.views || {}, idn = t.identity || {};
  const sys = d.sys || {}, drill = d.drill || {}, bank = d.bank || {}, walk = d.walk || {};
  const model = d.model || {}, wb = d.wb || {}, trade = d.trade || {}, rf = d.rf || {};
  const num = d.num || {}, open = d.open || {};
  const cards = drill.cards || [], stages = sys.stages || [], pivots = sys.pivots || [];
  const answers = model.answers || [], mock = bank.mockBeats || [], curve = bank.curveballs || [];
  const steps = walk.steps || [];
  const stepBlocks = (s) => ((s.code || s.shiki) ? 1 : 0) + ((s.blocks || []).filter((b) => b.code || b.shiki).length);
  const beats = [...new Set([...mock, ...curve])];
  return {
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
    'bank.beatModels': beats.filter((b) => nz(b.model)).length,
    'bank.beatInts': beats.filter((b) => b.int && nz(b.int.q)).length,
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

async function measure(parserPath) {
  const { parseMarkdown } = await import(url.pathToFileURL(path.resolve(parserPath)).href);
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
  const tot = {};
  for (const f of files) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    let s;
    try { s = slices(parseMarkdown(src, { index: 1, total: files.length })); }
    catch (e) { return { error: f + ': ' + e.message }; }
    for (const [k, v] of Object.entries(s)) tot[k] = (tot[k] || 0) + v;
  }
  const per = {};
  for (const [k, v] of Object.entries(tot)) per[k] = v / files.length;
  return { per, tot, n: files.length };
}

const OLD = await measure(process.argv[2] || 'tools/compiler/_calib_old.mjs');
const NEW = await measure('tools/compiler/parse_md.mjs');
if (OLD.error) { console.error('OLD parser failed: ' + OLD.error); process.exit(2); }
if (NEW.error) { console.error('NEW parser failed: ' + NEW.error); process.exit(2); }

// the 8's per-topic baseline, from the app itself
const eight = {};
const SLICES = Object.keys(NEW.per);
for (const k of SLICES) {
  eight[k] = THE_8.reduce((n, id) => n + RAW.perTopic[id][k], 0) / THE_8.length;
}

const L = [];
L.push('BEFORE / AFTER -- one metric, both parsers. The 8 are the constant baseline.');
L.push('(the 38 are compiled; the 8 are hand-coded JS and no parser touches them)\n');
L.push('  ' + 'slice'.padEnd(20) + 'THE 8'.padStart(7) + 'BEFORE'.padStart(8) + 'AFTER'.padStart(7)
  + 'PARITY was->now'.padStart(18) + 'RECOVERED'.padStart(11));
L.push('  ' + '-'.repeat(72));
let s8 = 0, sB = 0, sA = 0, recovered = 0;
for (const k of SLICES) {
  const b = OLD.per[k], a = NEW.per[k], e = eight[k];
  s8 += e; sB += b; sA += a;
  const rec = NEW.tot[k] - OLD.tot[k];
  recovered += Math.max(0, rec);
  const pw = e > 0 ? (100 * b / e).toFixed(0) + '%' : 'n/a';
  const pn = e > 0 ? (100 * a / e).toFixed(0) + '%' : 'n/a';
  L.push('  ' + k.padEnd(20) + e.toFixed(1).padStart(7) + b.toFixed(1).padStart(8) + a.toFixed(1).padStart(7)
    + (pw + ' -> ' + pn).padStart(18) + (rec > 0 ? '+' + rec : rec === 0 ? '-' : String(rec)).padStart(11));
}
L.push('  ' + '-'.repeat(72));
L.push('  ' + 'TOTAL (per topic)'.padEnd(20) + s8.toFixed(1).padStart(7) + sB.toFixed(1).padStart(8) + sA.toFixed(1).padStart(7)
  + (((100 * sB / s8).toFixed(0) + '% -> ' + (100 * sA / s8).toFixed(0) + '%')).padStart(18) + ('+' + recovered).padStart(11));
L.push('');
L.push('  DEPTH PARITY vs THE 8:  ' + (100 * sB / s8).toFixed(1) + '%  ->  ' + (100 * sA / s8).toFixed(1) + '%');
L.push('  ITEMS RECOVERED BY THE COMPILER FIX ALONE (no content authored): ' + recovered);
console.log(L.join('\n'));
fs.writeFileSync('_audit/2026-07-11-compiler-parity/measure_before_after.txt', L.join('\n') + '\n');
