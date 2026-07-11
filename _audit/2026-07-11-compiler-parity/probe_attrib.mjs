// Attribution: for every gapped field, is the content IN the markdown (PARSER_BUG)
// or ABSENT from the markdown (AUTHORING_GAP)?
import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const DIR = 'src/topics-md';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md'));
// Robust H2 section extractor: split the doc on "## " headings (\Z is NOT a JS regex token --
// the previous regex form silently truncated, which is exactly the class of bug under audit).
function sec(src, h) {
  const parts = src.split(/^## /m);
  const hit = parts.find((p) => p.toLowerCase().startsWith(h.toLowerCase() + '\n'));
  return hit ? '## ' + hit : '';
}
const h3 = (s) => (s.match(/^### /gm) || []).length;
const h4 = (s) => (s.match(/^#### /gm) || []).length;
const bullets = (s) => (s.match(/^- /gm) || []).length;

const A = {}, P = {};                       // Authored / Parsed totals
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
const n = (x) => (Array.isArray(x) ? x.length : (x && typeof x === 'object') ? Object.keys(x).length : 0);

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const out = parseMarkdown(src, { index: 1, total: 38 });
  const d = out.views;

  // ---- AUTHORED (counted straight off the markdown source) ----
  const drillSec = sec(src, 'Drill');
  const drillHead = drillSec.split(/^### /m)[0];                 // before the first card
  add(A, 'drill.cards', h3(drillSec));
  add(A, 'drill.tierNotes', (drillHead.match(/^(SDE2|SDE3|Staff|EXTEND)\s*\|/gm) || []).length);
  add(A, 'drill.follows', (drillSec.match(/^Follow:/gim) || []).length);
  add(A, 'drill.senior', (drillSec.match(/^Senior:/gim) || []).length);
  add(A, 'drill.speak', (drillSec.match(/^Speak:/gim) || []).length);

  const sysSec = sec(src, 'System');
  const whereSec = (sysSec.split(/^### /m)[1] || '');             // the "Where it sits" block
  add(A, 'sys.stages', whereSec.split('\n').slice(1).filter((l) => /^[^#\s].*?: /.test(l)).length);
  add(A, 'sys.pivots', h4(sysSec));
  // an "answer" is a non-chip prose line inside a #### block
  add(A, 'sys.pivotAns', (sysSec.match(/^->[^\n]*\n[A-Za-z]/gm) || []).length);

  add(A, 'model.answers', h3(sec(src, 'Model Answers')));
  add(A, 'model.beats', bullets(sec(src, 'Model Answers')));
  add(A, 'wb.steps', h3(sec(src, 'Whiteboard')));
  add(A, 'rf.flags', h3(sec(src, 'Red Flags')));
  add(A, 'trade.decisions', h3(sec(src, 'Trade-offs')));
  add(A, 'cmpNotes', h3(sec(src, 'Companion Notes')));
  const bankSec = sec(src, 'Bank');
  add(A, 'bank.mockBeats', (bankSec.match(/^### (?!Frames|Extra)/gm) || []).length);
  add(A, 'walk.steps', h3(sec(src, 'Walk')) - ((sec(src, 'Walk').match(/^### Model Script/gm) || []).length));

  // ---- PARSED (what the parser actually produced) ----
  const dr = d.drill || {}, sy = d.sys || {}, mo = d.model || {}, bk = d.bank || {};
  const cards = dr.cards || [];
  add(P, 'drill.cards', cards.length);
  add(P, 'drill.tierNotes', n(dr.tierNotes));
  add(P, 'drill.follows', cards.reduce((a, c) => a + n(c.f), 0));
  add(P, 'drill.senior', cards.filter((c) => c.senior).length);
  add(P, 'drill.speak', (dr.speak || []).filter(Boolean).length);
  add(P, 'sys.stages', n(sy.stages));
  add(P, 'sys.pivots', n(sy.pivots));
  add(P, 'sys.pivotAns', (sy.pivots || []).filter((p) => p.a && p.a.length).length);
  add(P, 'model.answers', n(mo.answers));
  add(P, 'model.beats', (mo.answers || []).reduce((a, x) => a + n(x.beats), 0));
  add(P, 'wb.steps', n((d.wb || {}).steps));
  add(P, 'rf.flags', n((d.rf || {}).flags));
  add(P, 'trade.decisions', n((d.trade || {}).decisions));
  add(P, 'cmpNotes', n(out.identity.cmpNotes));
  add(P, 'bank.mockBeats', n(bk.mockBeats));
  add(P, 'walk.steps', n((d.walk || {}).steps));
}

const pad = (s, w) => String(s).padEnd(w);
console.log(pad('field', 18) + pad('AUTHORED', 10) + pad('PARSED', 9) + pad('DROPPED', 9) + 'ATTRIBUTION');
console.log('-'.repeat(70));
for (const k of Object.keys(A)) {
  const a = A[k] || 0, p = P[k] || 0, drop = a - p;
  const attrib = drop > 0 ? 'PARSER_BUG  (content is in the .md)'
    : a === 0 && p === 0 ? 'AUTHORING_GAP  (nothing written)'
      : 'OK';
  console.log(pad(k, 18) + pad(a, 10) + pad(p, 9) + pad(drop > 0 ? drop : 0, 9) + attrib);
}
