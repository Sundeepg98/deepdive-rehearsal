#!/usr/bin/env node
/*
 * prove_conservation.mjs -- THE LOSSLESSNESS GATE.
 *
 * WHY THIS EXISTS.
 * The gate reported "compiler_md: 23 pass, 0 fail" and "compiler_assembly: 28 pass, 0 fail"
 * while the compiler silently discarded 379 authored items on every single build. That is
 * only possible if no test ever compared what the AUTHOR WROTE against what the PARSER KEPT.
 * None did:
 *   - prove_md.mjs parsed a fixture (samples/notifications.md) that contains only 5 of the 14
 *     sections -- it has no ## System, no ## Drill, no ## Bank. The test's coverage was drawn
 *     around the parser's WORKING SUBSET, so it could never fail on a dropped stage.
 *   - prove_emit.mjs round-trips the parser against ITSELF (emit(parse(x)) vs parse(x)). A
 *     parser that drops a field drops it on both sides of the equals sign. Always green.
 *   - prove_assembly.mjs tests parse.mjs, the .topic parser. ZERO .topic files ship; all 38
 *     topics go through parse_md.mjs (compile.mjs:64). 28 assertions on a dead code path.
 * A test suite cannot detect a drop unless something independent of the parser knows what was
 * supposed to be there. This file is that something.
 *
 * THE REFERENCE IS THE AUTHOR'S BYTES.
 * scanSource() is a plain line scanner. It does not import markdown-it and it does not import
 * parse_md.mjs. It reads the raw .md and answers one question: what did the human write? A bug
 * in the parser therefore cannot mask itself in the reference, which is the exact failure mode
 * of every test above. This is what makes the check un-gameable: to make it pass you must
 * either fix the parser or delete the author's content from the .md, and the latter shows up
 * in the diff as content deletion.
 *
 * THREE ORTHOGONAL LAWS. Each catches a class the others are structurally blind to.
 *
 *   LAW 1  COUNT      authored(collection) === emitted(collection).
 *                     Catches SILENT DROPS (a stage list the parser never looked at).
 *                     BLIND to: a field overwritten by a later one (count is 1 either way),
 *                     and to a value filed into the wrong key.
 *
 *   LAW 2  SURVIVAL   every authored text unit appears SOMEWHERE in the emitted data.
 *                     Catches ANNIHILATION -- a second ```fence``` in one Walk step overwrites
 *                     the first (parse_md.mjs:113, unconditional last-wins), so a whole code
 *                     block is destroyed while the field count stays 1. LAW 1 cannot see this.
 *                     BLIND to: fusion (the text is still present, just glued into a sibling).
 *
 *   LAW 3  FUSION     no single-value leaf field may contain a newline.
 *                     Catches CORRUPTION-BY-MERGE generically. Every fusion bug in this parser
 *                     has one signature: markdown-it merged soft-wrapped lines into a single
 *                     paragraph and the first matching field swallowed the rest. One invariant
 *                     catches the whole class -- including bugs nobody has found yet. A probe
 *                     you must hand-write per bug can only catch the bug you already knew about.
 *
 *   LAW 4  VALUE      a value parsed out of a structured heading must equal what was authored.
 *                     Catches MISFILING: `### CURVEBALL | ordering | <cue>` emits
 *                     theme="CURVEBALL" (the literal tag) and shoves the real theme into the
 *                     cue. Count says 1==1. No newline. Text survives. All three laws above
 *                     pass. Only comparing the VALUE catches it.
 *
 * Usage:  node tools/compiler/prove_conservation.mjs
 *         PARSER_MODULE=path/to/candidate.mjs node tools/compiler/prove_conservation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// PARSER_MODULE lets a candidate parser be proven green before it lands. Default = the real
// compiler. The test is otherwise identical either way -- the reference never changes.
const PARSER = process.env.PARSER_MODULE
  ? url.pathToFileURL(path.resolve(process.env.PARSER_MODULE)).href
  : './parse_md.mjs';
const { parseMarkdown } = await import(PARSER);

const DIR = 'src/topics-md';
import { scanSource, scanParsed, fusedLeaves, fingerprint, flatten, norm, stripTags, show, FIELDS } from './conservation-scan.mjs';


const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
const totals = {};
FIELDS.forEach((k) => { totals[k] = { a: 0, p: 0 }; });

const dropViolations = [];    // LAW 1
const lostUnits = [];         // LAW 2
const fusions = [];           // LAW 3
const misfiled = [];          // LAW 4
let overEmitted = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const { A, curveThemes } = scanSource(src);
  const parsed = parseMarkdown(src, { index: 1, total: files.length });
  const P = scanParsed(parsed);

  // ---- LAW 1: COUNT ----------------------------------------------------------------
  for (const k of FIELDS) {
    const a = A[k].length, p = P[k];
    totals[k].a += a; totals[k].p += p;
    if (p !== a) {                                     // !== , not < : over-emission is a bug too
      if (p < a) dropViolations.push({ f, k, a, p, ex: A[k].slice(0, 2) });
      else { overEmitted += p - a; dropViolations.push({ f, k, a, p, ex: [], over: true }); }
    }
  }

  // ---- LAW 2: SURVIVAL -------------------------------------------------------------
  // A unit survives if its fingerprint is found in EITHER the raw emitted text OR the
  // tag-stripped one. Both renderings are needed, and neither alone is safe:
  //   - stripped-only: a bare "<" inside one field (a "<" in prose, a mermaid edge) makes
  //     /<[^>]+>/ swallow everything up to the next ">" in a LATER field, erasing innocent
  //     text and reporting intact content as destroyed;
  //   - raw-only: prose() injects markup INTO a clean run (parse_md.mjs:163 turns "Offset vs
  //     cursor" into "Offset <span class=\"vs\">vs</span> cursor"), splitting the fingerprint.
  // Tags are stripped PER LEAF so a stray "<" can never reach across into a sibling field.
  // Requiring absence from BOTH makes LAW 2 conservative: it fires only when the author's text
  // exists nowhere in the output -- destroyed, not merely transformed. LAW 1 owns exact counts;
  // LAW 2 must never cry wolf, or the gate teaches people to ignore it.
  const leaves = flatten(parsed);
  const flatRaw = norm(leaves.join(' '));
  const flatStripped = norm(leaves.map(stripTags).join(' '));
  const survives = (fp) => flatRaw.includes(fp) || flatStripped.includes(fp);

  // De-duplicate by source line: a "[*]" stage is pushed to BOTH sysStages and sysStageCur, and
  // reporting its loss twice would inflate the deficit. One authored line = one unit.
  const seenLine = new Set();
  for (const k of FIELDS) {
    for (const u of A[k]) {
      if (seenLine.has(u.ln)) continue;
      seenLine.add(u.ln);
      const fp = fingerprint(u.text);
      if (fp && !survives(fp)) lostUnits.push({ f, k, ln: u.ln, text: u.text });
    }
  }

  // ---- LAW 3: FUSION ---------------------------------------------------------------
  fusions.push(...fusedLeaves(parsed.views, f), ...fusedLeaves(parsed.identity, f));

  // ---- LAW 4: VALUE ----------------------------------------------------------------
  const emittedCurve = (parsed.views.bank || {}).curveballs || [];
  curveThemes.forEach((want, i) => {
    const got = emittedCurve[i];
    if (!got) return;                                   // absence is LAW 1's business
    if ((got.theme || '') !== want.theme) {
      misfiled.push({ f, ln: want.ln, field: 'bank.curveballs[' + i + '].theme', want: want.theme, got: got.theme });
    }
  });
}

// ---------------------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------------------
const pad = (s, w) => String(s).padEnd(w);
console.log('CONSERVATION -- authored-in-.md  vs  emitted-by-parser   (%d topics)', files.length);
console.log('reference: the author\'s raw bytes (an independent line scanner, not the parser)\n');
console.log('  ' + pad('collection', 18) + pad('AUTHORED', 10) + pad('EMITTED', 10) + 'VERDICT');
console.log('  ' + '-'.repeat(56));
let dropped = 0;
for (const k of FIELDS) {
  const { a, p } = totals[k];
  let v;
  if (p < a) { v = 'DROPPED ' + (a - p); dropped += a - p; }
  else if (p > a) v = 'OVER-EMITTED ' + (p - a);
  else v = a === 0 ? '-' : 'conserved';
  console.log('  ' + pad(k, 18) + pad(a, 10) + pad(p, 10) + v);
}

const law1 = dropViolations.length, law2 = lostUnits.length, law3 = fusions.length, law4 = misfiled.length;

if (law1) {
  console.log('\nLAW 1 -- COUNT: %d authored item(s) SILENTLY DROPPED', dropped);
  const seen = new Set();
  for (const v of dropViolations) {
    const key = v.k;
    if (seen.has(key) || v.over) continue;
    seen.add(key);
    console.log('  %s  %s: authored %d, emitted %d', v.f, v.k, v.a, v.p);
    v.ex.forEach((e) => console.log('      %s:%d  %s', v.f, e.ln, show(e.text)));
  }
}
if (law2) {
  console.log('\nLAW 2 -- SURVIVAL: %d authored unit(s) ANNIHILATED (text has no trace in the output)', law2);
  const byField = {};
  lostUnits.forEach((u) => { (byField[u.k] ??= []).push(u); });
  for (const [k, list] of Object.entries(byField)) {
    console.log('  %s: %d lost', k, list.length);
    list.slice(0, 2).forEach((u) => console.log('      %s:%d  %s', u.f, u.ln, show(u.text)));
  }
}
if (law3) {
  console.log('\nLAW 3 -- FUSION: %d leaf field(s) swallowed a sibling (embedded newline)', law3);
  const byPath = {};
  fusions.forEach((h) => { (byPath[h.path] ??= []).push(h); });
  for (const [p, list] of Object.entries(byPath).sort((a, b) => b[1].n - a[1].n)) {
    console.log('  %s: %d fused', p, list.length);
    console.log('      e.g. %s  %s', list[0].topic, show(list[0].text));
  }
}
if (law4) {
  console.log('\nLAW 4 -- VALUE: %d field(s) hold a value the author never wrote', law4);
  misfiled.slice(0, 4).forEach((m) => {
    console.log('  %s:%d  %s', m.f, m.ln, m.field);
    console.log('      authored: %s', show(m.want));
    console.log('      emitted : %s', show(m.got));
  });
  if (law4 > 4) console.log('  ... and %d more', law4 - 4);
}

console.log('\n' + '='.repeat(64));
console.log('LAW 1 COUNT     %s  (%d dropped, %d over-emitted)', law1 ? 'FAIL' : 'pass', dropped, overEmitted);
console.log('LAW 2 SURVIVAL  %s  (%d annihilated)', law2 ? 'FAIL' : 'pass', law2);
console.log('LAW 3 FUSION    %s  (%d fused leaves)', law3 ? 'FAIL' : 'pass', law3);
console.log('LAW 4 VALUE     %s  (%d misfiled)', law4 ? 'FAIL' : 'pass', law4);
console.log('='.repeat(64));

const total = law1 + law2 + law3 + law4;
if (total) {
  console.log('CONSERVATION: FAIL -- the compiler is not conserving what the authors wrote.');
  process.exit(1);
}
console.log('CONSERVATION: PASS -- every authored item survives compilation intact.');
process.exit(0);
