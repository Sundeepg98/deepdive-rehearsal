// fx-roundtrip.mjs -- THE KILLER TEST.
// Take content-pipeline (the flagship, hand-coded JS = THE SPEC). Mechanically re-author it
// as markdown in the documented format. Compile that markdown with the REAL parser. Deep-diff
// the result against the hand-coded JS. Every difference is the FORMAT CEILING.
//
// Where a field CANNOT be expressed in markdown at all, we record it as a CEILING item rather
// than emitting bad markdown.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const DIR = path.join(ROOT, 'src/topics/content-pipeline');
const PANES = ['identity', 'walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'bank'];

const ctx = { TopicRegistry: { register(o) { ctx.__reg = o; } } };
vm.createContext(ctx);
for (const p of PANES.concat('register')) vm.runInContext(fs.readFileSync(path.join(DIR, p + '.js'), 'utf8'), ctx);
const SPEC = { identity: ctx.__reg.identity, ...ctx.__reg.data };

const CEILING = [];   // things markdown CANNOT express
const note = (field, what, why) => CEILING.push({ field, what, why });

// ---------- reverse the flow HTML back into the flow DSL ----------
const CONN_REV = { '&rarr;': '->', '&middot;': '.', '/': '/' };
function unflow(html, where) {
  const parts = [...html.matchAll(/<span class="(?:fb (\w+)|arr)">(.*?)<\/span>/g)];
  let out = '', bad = null;
  for (const m of parts) {
    if (m[1]) {
      let txt = m[2].replace(/&rarr;/g, '->');
      if (/[[\]]/.test(txt)) {
        // e.g. the flagship's step-1 box label "strategies[ext]"
        note(where, 'flow box label containing [ or ] -- e.g. "' + txt + '"', 'flow.mjs:24 boxRe = /([a-z]+)\\[([^\\]]*)\\]/ -- text runs to the FIRST "]" and there is no escape; the stray "]" then reads as a connector and THROWS at flow.mjs:34');
        txt = txt.replace(/[[\]]/g, '');   // substitute so the rest of the round-trip proceeds
      }
      out += (out ? ' ' : '') + m[1] + '[' + txt + ']';
    } else {
      const c = CONN_REV[m[2]];
      if (!c) { bad = m[2]; out += ' -> '; }        // unexpressible: substitute an arrow
      else out += ' ' + c + ' ';
    }
  }
  if (bad) note(where, 'flow connector "' + bad + '"', 'flow.mjs:21 CONN = {->, ., /} -- any other connector THROWS at flow.mjs:34');
  return out.replace(/\s+/g, ' ').trim();
}

// ---------- reverse highlighted code HTML back to plain source + ==hl== ----------
function uncode(html, where) {
  if (/<span class="s">/.test(html)) {
    note(where, 'code string-literal span class="s"', 'code.mjs:27 TOKEN matches only ==hl== and keywords -- no string rule, so class="s" can never be emitted');
  }
  let s = html
    .replace(/<span class="hl">(.*?)<\/span>/g, '==$1==')
    .replace(/<span class="[ksc]">(.*?)<\/span>/g, '$1')
    .replace(/<span class="c">(.*?)<\/span>/g, '$1');
  s = s.replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return s;
}

// ---------- emit the markdown ----------
const L = [];
const id = SPEC.identity;
L.push('---', 'id: content-pipeline', 'prefix: CP', 'group: ' + id.group, 'title: ' + id.title,
  'h1: ' + id.h1, 'locatorTail: ' + id.locatorTail, 'index: ' + id.index,
  'cramTitle: ' + id.cramTitle, 'reportTitle: ' + id.reportTitle, 'companionTopic: ' + id.companionTopic, '---', '');
L.push('## Thesis', '', id.thesis, '');
L.push('## Sub', '', id.sub, '');
L.push('## Spine', '');
for (const s of id.spine) L.push('- ' + s);
L.push('');
L.push('## Companion Notes', '');
for (const [k, v] of Object.entries(id.cmpNotes)) { L.push('### ' + k, ''); for (const p of v) L.push(p, ''); }

L.push('## Walk', '');
for (const s of SPEC.walk.steps) {
  L.push('### ' + s.t, '');
  if (s.flow) L.push('```flow', unflow(s.flow, 'walk.steps[].flow'), '```', '');
  if (s.ins) L.push(s.ins, '');
  if (s.deep) L.push(s.deep, '');
  if (s.code) { L.push('```js', uncode(s.code, 'walk.steps[].code'), '```', ''); }
  if (s.cap) L.push(s.cap, '');
  if (s.deep && s.code && s.cap) note('walk.steps[]', 'ins+deep+code+cap on one step', 'parser assigns 2nd para to deep only when no code seen yet -- order-dependent but expressible');
}
if (SPEC.walk.modelScript) {
  L.push('### Model Script', '');
  for (const b of SPEC.walk.modelScript) {
    if (b.mq) L.push('- Interviewer: ' + b.mq);
    else L.push('- ' + b.ml + ' | ' + b.t);
  }
  L.push('');
}

L.push('## Drill', '');
for (const [k, v] of Object.entries(SPEC.drill.tierNotes)) L.push('- ' + k + ' | ' + v);
L.push('');
SPEC.drill.cards.forEach((c, i) => {
  L.push('### ' + c.tier + ' | ' + c.signal, '');
  L.push(c.q, '');
  if (c.a) L.push(c.a, '');
  for (const f of c.f) { L.push('Follow: ' + f.q, f.a, ''); }
  if (c.senior) L.push('Senior: ' + c.senior, '');
  if (SPEC.drill.speak[i]) L.push('Speak: ' + SPEC.drill.speak[i], '');
});

L.push('## Whiteboard', '');
if (SPEC.wb.sub) L.push(SPEC.wb.sub, '');
for (const s of SPEC.wb.steps) { L.push('### ' + s.c, '', s.a, ''); }
L.push('```html', SPEC.wb.diagram, '```', '');
if (SPEC.wb.foot) L.push('Foot: ' + SPEC.wb.foot, '');
if (SPEC.wb.okVerdict) L.push('Verdict: ' + SPEC.wb.okVerdict, '');

L.push('## System', '', SPEC.sys.intro, '');
L.push('### ' + SPEC.sys.heads.whereHead, '');
for (const s of SPEC.sys.stages) L.push('- ' + s.n + ': ' + s.d + (s.cur ? ' [*]' : ''));
L.push('');
L.push('### ' + SPEC.sys.heads.pivHead, '', SPEC.sys.heads.pivSub, '');
for (const p of SPEC.sys.pivots) {
  L.push('#### ' + p.q, '');
  L.push(p.chip.replace(/^→\s*|^&rarr;\s*/, '-> '), '');   // chip on its OWN paragraph
  L.push(p.a, '');                                              // answer on its OWN paragraph
}

L.push('## Trade-offs', '', SPEC.trade.lead, '');
for (const d of SPEC.trade.decisions) {
  L.push('### ' + d.q.replace(/<span class="vs">vs<\/span>/g, 'vs'), '');
  for (const o of d.opts) L.push('- ' + o.n + ': ' + o.when);
  L.push('', d.tell, '');
}

L.push('## Model Answers', '');
SPEC.model.answers.forEach((a, i) => {
  L.push('### ' + SPEC.model.selectors[i] + ' | ' + a.opener, '');
  if (a.sub) L.push(a.sub, '');
  for (const b of a.beats) L.push('- ' + b.l + ' | ' + b.c + ' | ' + b.t);
  L.push('');
});

L.push('## Numbers', '', SPEC.num.lead, '', SPEC.num.tell, '');
for (const i of SPEC.num.inputs) L.push('- ' + [i.id, i.label, i.value, i.min, i.step].filter((x) => x !== undefined).join(' | '));
L.push('', '```js', String(SPEC.num.compute), '```', '');

L.push('## Red Flags', '', SPEC.rf.lead, '');
for (const f of SPEC.rf.flags) {
  L.push('### ' + f.bad, '', f.tell, '', f.fix, '');
  if (f.note) L.push('Note: ' + f.note, '');
}

L.push('## Opener', '');
for (const c of SPEC.open.cards) {
  L.push('### ' + c.k + ' | ' + c.t, '', c.lead, '');
  for (const it of c.items) L.push('#### ' + it.ht, '', it.a, '');
  if (c.hooks) {
    L.push('##### Hooks', '', c.hooks.lead, '');
    for (const h of c.hooks.items) L.push('- ' + h.q + ' | ' + h.d + ' | ' + h.tab);
    L.push('');
  }
  if (c.foot) L.push('Foot: ' + c.foot, '');
}

L.push('## Bank', '');
for (const b of SPEC.bank.mockBeats) {
  L.push('### ' + [b.tag, b.theme, b.cue].filter(Boolean).join(' | '), '');
  if (b.task) L.push('Task: ' + b.task, '');      // OWN paragraph
  if (b.model) L.push('Model: ' + b.model, '');   // OWN paragraph
  if (b.int) L.push('Int: ' + b.int.q, b.int.a, '');
  if (b.int2) L.push('Int2: ' + b.int2.q, b.int2.a, '');
}
L.push('### Extra Curveballs', '');
for (const b of SPEC.bank.curveballs.slice(1)) {
  L.push('### CURVEBALL | ' + (b.theme || '') + ' | ' + b.cue, '');
  if (b.task) L.push('Task: ' + b.task, '');
  if (b.model) L.push('Model: ' + b.model, '');
  if (b.int) L.push('Int: ' + b.int.q, b.int.a, '');
}
L.push('### Frames', '');
for (const f of SPEC.bank.frames.slice(1)) L.push('- ' + f);
L.push('');

const MDSRC = L.join('\n');
const OUT = path.join(ROOT, '_audit/2026-07-11-compiler-parity/content-pipeline.ROUNDTRIP.md');
fs.writeFileSync(OUT, MDSRC);

// ---------- compile it back ----------
let got;
try { got = parseMarkdown(MDSRC, { index: id.index, total: id.total }); }
catch (e) { console.log('!!! THE ROUND-TRIP MARKDOWN DOES NOT EVEN COMPILE: ' + e.message); process.exit(1); }

// ---------- structural diff (counts, not byte-fidelity) ----------
const cnt = (o, p) => { try { return p.split('.').reduce((a, k) => a[k], o); } catch { return undefined; } };
const CHECKS = [
  ['identity.spine', (s) => s.identity.spine.length, (g) => g.identity.spine.length],
  ['identity.cmpNotes panes', (s) => Object.keys(s.identity.cmpNotes).length, (g) => Object.keys(g.identity.cmpNotes).length],
  ['walk.steps', (s) => s.walk.steps.length, (g) => g.views.walk.steps.length],
  ['walk.steps w/ flow', (s) => s.walk.steps.filter((x) => x.flow).length, (g) => g.views.walk.steps.filter((x) => x.flow).length],
  ['walk.steps w/ code', (s) => s.walk.steps.filter((x) => x.code).length, (g) => g.views.walk.steps.filter((x) => x.code).length],
  ['walk.steps w/ deep', (s) => s.walk.steps.filter((x) => x.deep).length, (g) => g.views.walk.steps.filter((x) => x.deep).length],
  ['walk.steps w/ cap', (s) => s.walk.steps.filter((x) => x.cap).length, (g) => g.views.walk.steps.filter((x) => x.cap).length],
  ['walk.modelScript', (s) => s.walk.modelScript.length, (g) => g.views.walk.modelScript.length],
  ['drill.cards', (s) => s.drill.cards.length, (g) => g.views.drill.cards.length],
  ['drill follow-ups', (s) => s.drill.cards.reduce((a, c) => a + c.f.length, 0), (g) => g.views.drill.cards.reduce((a, c) => a + c.f.length, 0)],
  ['drill seniors', (s) => s.drill.cards.filter((c) => c.senior).length, (g) => g.views.drill.cards.filter((c) => c.senior).length],
  ['drill speak', (s) => s.drill.speak.filter(Boolean).length, (g) => g.views.drill.speak.filter(Boolean).length],
  ['drill.tierNotes', (s) => Object.keys(s.drill.tierNotes).length, (g) => Object.keys(g.views.drill.tierNotes).length],
  ['wb.steps', (s) => s.wb.steps.length, (g) => g.views.wb.steps.length],
  ['wb.diagram', (s) => (s.wb.diagram ? 1 : 0), (g) => (g.views.wb.diagram ? 1 : 0)],
  ['sys.stages', (s) => s.sys.stages.length, (g) => g.views.sys.stages.length],
  ['sys.stages w/ cur', (s) => s.sys.stages.filter((x) => x.cur).length, (g) => g.views.sys.stages.filter((x) => x.cur).length],
  ['sys.pivots', (s) => s.sys.pivots.length, (g) => g.views.sys.pivots.length],
  ['sys.pivots w/ answer', (s) => s.sys.pivots.filter((p) => p.a).length, (g) => g.views.sys.pivots.filter((p) => p.a).length],
  ['trade.decisions', (s) => s.trade.decisions.length, (g) => g.views.trade.decisions.length],
  ['trade opts', (s) => s.trade.decisions.reduce((a, d) => a + d.opts.length, 0), (g) => g.views.trade.decisions.reduce((a, d) => a + d.opts.length, 0)],
  ['model.answers', (s) => s.model.answers.length, (g) => g.views.model.answers.length],
  ['model beats', (s) => s.model.answers.reduce((a, x) => a + x.beats.length, 0), (g) => g.views.model.answers.reduce((a, x) => a + x.beats.length, 0)],
  ['num.inputs', (s) => s.num.inputs.length, (g) => g.views.num.inputs.length],
  ['rf.flags', (s) => s.rf.flags.length, (g) => g.views.rf.flags.length],
  ['rf notes', (s) => s.rf.flags.filter((f) => f.note).length, (g) => g.views.rf.flags.filter((f) => f.note).length],
  ['open.cards', (s) => s.open.cards.length, (g) => g.views.open.cards.length],
  ['open items', (s) => s.open.cards.reduce((a, c) => a + c.items.length, 0), (g) => g.views.open.cards.reduce((a, c) => a + c.items.length, 0)],
  ['open hooks', (s) => s.open.cards.reduce((a, c) => a + (c.hooks ? c.hooks.items.length : 0), 0), (g) => g.views.open.cards.reduce((a, c) => a + (c.hooks ? c.hooks.items.length : 0), 0)],
  ['bank.mockBeats', (s) => s.bank.mockBeats.length, (g) => g.views.bank.mockBeats.length],
  ['bank beats w/ model', (s) => s.bank.mockBeats.filter((b) => b.model).length, (g) => g.views.bank.mockBeats.filter((b) => b.model).length],
  ['bank beats w/ int', (s) => s.bank.mockBeats.filter((b) => b.int).length, (g) => g.views.bank.mockBeats.filter((b) => b.int).length],
  ['bank beats w/ int2', (s) => s.bank.mockBeats.filter((b) => b.int2).length, (g) => g.views.bank.mockBeats.filter((b) => b.int2).length],
  ['bank.curveballs', (s) => s.bank.curveballs.length, (g) => g.views.bank.curveballs.length],
  ['bank.frames', (s) => s.bank.frames.length, (g) => g.views.bank.frames.length],
];

console.log('KILLER TEST: content-pipeline (the flagship) RE-AUTHORED AS MARKDOWN');
console.log('Hand-coded JS = THE SPEC. Round-trip through parse_md.mjs.');
console.log('='.repeat(74));
console.log('FIELD'.padEnd(26) + 'SPEC'.padStart(6) + 'MD'.padStart(6) + '   RESULT');
console.log('-'.repeat(74));
let fail = 0;
for (const [name, sf, gf] of CHECKS) {
  let s, g;
  try { s = sf(SPEC); } catch { s = 'ERR'; }
  try { g = gf(got); } catch { g = 'ERR'; }
  const ok = s === g;
  if (!ok) fail++;
  console.log(name.padEnd(26) + String(s).padStart(6) + String(g).padStart(6) + '   ' + (ok ? 'ok' : '<<<< LOSS'));
}
console.log('-'.repeat(74));
console.log('STRUCTURAL FIELDS LOST IN ROUND-TRIP: ' + fail + ' / ' + CHECKS.length);
console.log('\nFORMAT CEILING (markdown CANNOT express these at all):');
const seen = new Set();
for (const c of CEILING) {
  const k = c.field + '|' + c.what;
  if (seen.has(k)) continue; seen.add(k);
  console.log('  * ' + c.field + ' -- ' + c.what);
  console.log('      ' + c.why);
}
console.log('\nRound-trip markdown written to ' + OUT);
