#!/usr/bin/env node
/*
 * prove_conservation.mjs -- THE ANTI-SELF-CONFIRMING TEST.
 *
 * Every existing compiler proof compares the parser against either (a) a toy fixture written
 * to match the parser's behaviour, or (b) the parser's OWN output (prove_emit's round-trip).
 * Neither can ever detect a silent drop. This one can, because its reference is the RAW
 * MARKDOWN BYTES, counted by a line scanner that shares no code with the parser under test.
 *
 * CONSERVATION LAW: every item a human authored in a .md must appear in the parsed data.
 *   authored(source-scan)  ==  emitted(parseMarkdown)      for every countable collection.
 * A deficit is a SILENT DROP and fails the build, naming the file, the line, and the text.
 *
 * Why this can never become self-confirming:
 *   - the reference is the author's bytes, not a fixture and not the parser's output;
 *   - the counter is a line scanner (independent mechanism) vs the parser's markdown-it
 *     token walk -- a bug in one cannot mask the same bug in the other;
 *   - it runs over ALL 38 real topics, not one toy sample.
 *
 * Usage:  node tools/compiler/prove_conservation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// PARSER_MODULE lets CI point this at a candidate parser to prove a fix turns it green.
// Default = the real compiler. The test is otherwise identical either way.
const PARSER = process.env.PARSER_MODULE
  ? url.pathToFileURL(path.resolve(process.env.PARSER_MODULE)).href
  : '../../tools/compiler/parse_md.mjs';
const { parseMarkdown } = await import(PARSER);

const DIR = 'src/topics-md';

// ---------------------------------------------------------------------------
// INDEPENDENT REFERENCE: a line scanner over the raw markdown. No markdown-it,
// no parse_md. It answers "what did the human author write?" from the bytes.
// ---------------------------------------------------------------------------
function scanSource(src) {
  const lines = src.split('\n');
  const A = { sysStages: [], tierNotes: [], pivotAnswers: [], drillCards: [], follows: [], seniors: [], speaks: [] };
  let h2 = '', h3 = '', h3n = 0, h4 = '', inFence = false, inFm = false, fmSeen = 0;

  lines.forEach((raw, i) => {
    const ln = i + 1, line = raw.trimEnd(), t = line.trim();
    if (/^---\s*$/.test(t) && fmSeen < 2 && !h2) { fmSeen++; inFm = fmSeen === 1; return; }
    if (inFm) return;
    if (/^```/.test(t)) { inFence = !inFence; return; }
    if (inFence) return;

    if (/^## /.test(line)) { h2 = t.slice(3).trim().toLowerCase(); h3 = ''; h3n = 0; h4 = ''; return; }
    if (/^### /.test(line)) { h3 = t.slice(4).trim(); h3n++; h4 = ''; if (h2 === 'drill') A.drillCards.push({ ln, text: h3 }); return; }
    if (/^#### /.test(line)) { h4 = t.slice(5).trim(); return; }
    if (!t) return;

    // ## System -> first ### block: a stage is a plain "Name: description" line.
    if (h2 === 'system' && h3n === 1 && /^[^-#>|].*?: /.test(t)) { A.sysStages.push({ ln, text: t }); return; }

    // ## System -> pivots: inside a #### block, the line AFTER a "-> chip" line is the answer.
    if (h2 === 'system' && h4 && /^(->|→)/.test(t)) {
      const next = (lines[i + 1] || '').trim();
      if (next && !/^(#|-|>|```)/.test(next)) A.pivotAnswers.push({ ln: ln + 1, text: next });
      return;
    }

    // ## Drill -> before the first ### card: a tier note is "TIER | note".
    if (h2 === 'drill' && h3n === 0 && /^(SDE2|SDE3|Staff|EXTEND)\s*\|/.test(t)) { A.tierNotes.push({ ln, text: t }); return; }

    // ## Drill -> inside a card: the per-card optional lines.
    if (h2 === 'drill' && h3n > 0) {
      if (/^Follow:/i.test(t)) A.follows.push({ ln, text: t });
      else if (/^Senior:/i.test(t)) A.seniors.push({ ln, text: t });
      else if (/^Speak:/i.test(t)) A.speaks.push({ ln, text: t });
    }
  });
  return A;
}

// ---------------------------------------------------------------------------
// THE SYSTEM UNDER TEST: what the parser actually emitted.
// ---------------------------------------------------------------------------
function scanParsed(out) {
  const v = out.views, drill = v.drill || {}, sys = v.sys || {};
  const cards = drill.cards || [], pivots = sys.pivots || [];
  return {
    sysStages: (sys.stages || []).length,
    tierNotes: Object.keys(drill.tierNotes || {}).length,
    pivotAnswers: pivots.filter((p) => p.a && p.a.trim()).length,
    drillCards: cards.length,
    follows: cards.reduce((n, c) => n + (c.f || []).length, 0),
    seniors: cards.filter((c) => c.senior && c.senior.trim()).length,
    speaks: (drill.speak || []).filter((s) => s && s.trim()).length,
    // CORRUPTION probe: a chip is a short UI label. If it carries a newline, the parser
    // glued the answer paragraph into it (parse_md.mjs:225).
    chipSwallowedAnswer: pivots.filter((p) => /\n/.test(p.chip || '')).length,
  };
}

const FIELDS = ['sysStages', 'tierNotes', 'pivotAnswers', 'drillCards', 'follows', 'seniors', 'speaks'];
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

let dropped = 0, corrupt = 0;
const totals = {};
const violations = [];

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const A = scanSource(src);
  const P = scanParsed(parseMarkdown(src, { index: 1, total: files.length }));

  for (const k of FIELDS) {
    const a = A[k].length, p = P[k];
    totals[k] = totals[k] || { a: 0, p: 0 };
    totals[k].a += a; totals[k].p += p;
    if (p < a) {
      dropped += a - p;
      violations.push({ f, k, a, p, ex: A[k].slice(0, 2) });
    }
  }
  if (P.chipSwallowedAnswer) { corrupt += P.chipSwallowedAnswer; violations.push({ f, k: 'sys.pivot.chip', a: 0, p: 0, corrupt: P.chipSwallowedAnswer }); }
}

const pad = (s, w) => String(s).padEnd(w);
console.log('CONSERVATION: authored-in-.md  vs  emitted-by-parser   (%d topics)\n', files.length);
console.log(pad('collection', 16) + pad('AUTHORED', 10) + pad('EMITTED', 10) + 'VERDICT');
console.log('-'.repeat(58));
for (const k of FIELDS) {
  const { a, p } = totals[k];
  const v = p < a ? 'DROPPED ' + (a - p) : (a === 0 ? 'none authored' : 'conserved');
  console.log(pad(k, 16) + pad(a, 10) + pad(p, 10) + v);
}
console.log('');

if (violations.length) {
  console.log('VIOLATIONS (first 12):');
  violations.slice(0, 12).forEach((v) => {
    if (v.corrupt) {
      console.log('  %s  sys.pivots[].chip: %d chip(s) swallowed the answer paragraph', v.f, v.corrupt);
      console.log('      -> parse_md.mjs:225 assigns the whole multi-line paragraph to .chip, leaving .a empty');
    } else {
      console.log('  %s  %s: authored %d, emitted %d  -- %d SILENTLY DROPPED', v.f, v.k, v.a, v.p, v.a - v.p);
      v.ex.forEach((e) => console.log('      %s:%d  %s', v.f, e.ln, JSON.stringify(e.text.slice(0, 62))));
    }
  });
  console.log('');
}

console.log('Conservation: %d authored items DROPPED, %d pivot chips CORRUPTED', dropped, corrupt);
if (dropped || corrupt) {
  console.log('FAIL -- the compiler is not conserving authored content.');
  process.exit(1);
}
console.log('PASS -- every authored item survives compilation.');
process.exit(0);
