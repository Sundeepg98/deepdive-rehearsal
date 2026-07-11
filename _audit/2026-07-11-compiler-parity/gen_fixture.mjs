#!/usr/bin/env node
/*
 * gen_fixture.mjs -- re-author a HAND-CODED topic as markdown, in the documented format.
 *
 * WHY. prove_md.mjs compares the parser's output against src/topics/notifications/*.js -- one of
 * the 8 hand-coded topics, which never touch the compiler. That reference was always right. The
 * FIXTURE was the problem: tools/compiler/samples/notifications.md carried 5 of the 14 sections
 * and none of the nine panes where content was being dropped, so 23 green assertions coexisted
 * with a compiler that discarded a third of every topic.
 *
 * This writes the fixture the test deserves: every pane, at the hand-coded topic's full depth,
 * derived FROM the hand-coded JS. It shares no code with parse_md.mjs -- it walks the JS data and
 * emits the markdown a human would write per TOPIC_MARKDOWN_FORMAT.md. So when prove_md then
 * parses it back and every population count and every walk field matches the JS byte-for-byte,
 * that is a real statement: THE MARKDOWN FORMAT CAN EXPRESS EVERYTHING THE JS SCHEMA HOLDS.
 * Any field it cannot is a format ceiling -- reported below, not papered over.
 *
 *   node _audit/2026-07-11-compiler-parity/gen_fixture.mjs <topic-id> <out.md>
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ID = process.argv[2] || 'notifications';
const OUT = process.argv[3] || 'tools/compiler/samples/notifications.md';
const DIR = 'src/topics/' + ID;
const PANES = ['identity', 'walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'bank'];

const ctx = { TopicRegistry: { register(o) { ctx.__reg = o; } } };
vm.createContext(ctx);
for (const p of PANES.concat('register')) {
  const f = path.join(DIR, p + '.js');
  if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
}
const S = { identity: ctx.__reg.identity, ...ctx.__reg.data };
const PREFIX = fs.readFileSync(path.join(DIR, 'identity.js'), 'utf8').match(/var TOPIC_(\w+)_IDENTITY/)[1];

const CEILING = [];
const ceil = (field, what, why) => CEILING.push({ field, what, why });

// ---- reverse Layer C: the rendered HTML back to the authored source ------------------------
// prose() is NOT reversed: the hand-coded modules store the app's HTML (<b>, &mdash;, &rarr;),
// and markdown-it passes inline HTML through untouched, so the authored form IS the stored form.
// Only flow and code have a DSL that must be reconstructed.
const CONN_REV = { '&rarr;': '->', '&middot;': '.', '/': '/' };
function unflow(html, where) {
  const parts = [...html.matchAll(/<span class="(?:fb (\w+)|arr)">(.*?)<\/span>/g)];
  let out = '';
  for (const m of parts) {
    if (m[1]) {
      const txt = m[2].replace(/&rarr;/g, '->');
      if (/[[\]]/.test(txt)) ceil(where, 'a flow box label containing [ or ] -- "' + txt + '"', 'flow.mjs:24 boxRe reads to the FIRST "]" and has no escape');
      out += (out ? ' ' : '') + m[1] + '[' + txt + ']';
    } else {
      const c = CONN_REV[m[2]];
      if (!c) { ceil(where, 'a flow connector "' + m[2] + '"', 'flow.mjs CONN = {->, ., /}; anything else throws'); out += ' -> '; }
      else out += ' ' + c + ' ';
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}
function uncode(html, where) {
  if (/<span class="s">/.test(html)) ceil(where, 'a code string-literal span (class="s")', 'code.mjs TOKEN matches ==hl== and keywords only -- no string rule');
  return html
    .replace(/<span class="hl">(.*?)<\/span>/g, '==$1==')
    .replace(/<span class="[ksc]">(.*?)<\/span>/g, '$1')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
// cmpNotes are stored as TEXT with real Unicode (—, “). text() maps markdown -> that,
// and the characters pass through unchanged, so the authored form is the stored form.
const L = [];
const id = S.identity;

L.push('---');
L.push('id: ' + ID, 'prefix: ' + PREFIX, 'group: ' + id.group, 'title: ' + id.title);
if (id.h1 !== id.title) L.push('h1: ' + id.h1);
L.push('locatorTail: ' + id.locatorTail, 'index: ' + id.index, 'total: ' + id.total);
if (id.cramTitle !== id.title) L.push('cramTitle: ' + id.cramTitle);
if (id.reportTitle !== id.title) L.push('reportTitle: ' + id.reportTitle);
if (id.companionTopic !== id.title) L.push('companionTopic: ' + id.companionTopic);
L.push('---', '');

L.push('## Thesis', '', id.thesis, '');
L.push('## Sub', '', id.sub, '');
L.push('## Spine', '');
id.spine.forEach((s) => L.push('- ' + s));
L.push('');
L.push('## Companion Notes', '');
for (const [k, v] of Object.entries(id.cmpNotes)) {
  L.push('### ' + k, '');
  if (v.length !== 3) ceil('identity.cmpNotes.' + k, v.length + ' paragraphs', 'parse_md parseCompanion commits a note only at exactly 3');
  v.forEach((p) => L.push(p, ''));
}

L.push('## Walk', '');
for (const s of S.walk.steps) {
  L.push('### ' + s.t, '');
  if (s.flow) L.push('```flow', unflow(s.flow, 'walk.steps[].flow'), '```', '');
  if (s.ins) L.push(s.ins, '');
  if (s.deep) L.push(s.deep, '');
  if (s.code) L.push('```js', uncode(s.code, 'walk.steps[].code'), '```', '');
  if (s.cap) L.push(s.cap, '');
  if (s.diagram) ceil('walk.steps[].diagram', 'a pre-rendered SVG diagram', 'markdown authors ```mermaid; the SVG is a build product and cannot be re-authored');
}
if (S.walk.modelScript) {
  L.push('### Model Script', '');
  for (const b of S.walk.modelScript) {
    if (b.mq) L.push('- Interviewer: ' + b.mq.replace(/^Interviewer:\s*/, ''));
    else L.push('- ' + b.ml + ' | ' + b.t);
  }
  L.push('');
}

L.push('## Drill', '');
for (const [k, v] of Object.entries(S.drill.tierNotes || {})) L.push(k + ' | ' + v);
L.push('');
S.drill.cards.forEach((c, i) => {
  L.push('### ' + c.tier + ' | ' + c.signal, '');
  L.push(c.q, '');
  if (c.a) L.push(c.a, '');
  for (const f of c.f || []) L.push('Follow: ' + f.q, f.a, '');
  if (c.senior) L.push('Senior: ' + c.senior);
  if ((S.drill.speak || [])[i]) L.push('Speak: ' + S.drill.speak[i]);
  if (c.senior || (S.drill.speak || [])[i]) L.push('');
});

L.push('## Whiteboard', '');
if (S.wb.sub) L.push(S.wb.sub, '');
for (const s of S.wb.steps) L.push('### ' + s.c, '', s.a, '');
if (S.wb.diagram) L.push('```html', S.wb.diagram, '```', '');
if (S.wb.foot) L.push('Foot: ' + S.wb.foot, '');
if (S.wb.okVerdict) L.push('Verdict: ' + S.wb.okVerdict, '');

L.push('## System', '', S.sys.intro, '');
L.push('### ' + S.sys.heads.whereHead, '');
for (const s of S.sys.stages) L.push(s.n + ': ' + s.d + (s.cur ? ' [*]' : ''));   // the plain-line form the spec demonstrates
L.push('');
L.push('### ' + S.sys.heads.pivHead, '');
if (S.sys.heads.pivSub) L.push(S.sys.heads.pivSub, '');
for (const p of S.sys.pivots) {
  L.push('#### ' + p.q, '');
  L.push(p.chip.replace(/^(?:→|&rarr;)\s*/, '-> '));    // chip line, answer on the NEXT line
  L.push(p.a, '');
}

L.push('## Trade-offs', '', S.trade.lead, '');
for (const d of S.trade.decisions) {
  L.push('### ' + d.q.replace(/<span class="vs">vs<\/span>/g, 'vs'), '');
  for (const o of d.opts) L.push('- ' + o.n + ': ' + o.when);
  L.push('', d.tell, '');
}

L.push('## Model Answers', '');
S.model.answers.forEach((a, i) => {
  L.push('### ' + S.model.selectors[i] + ' | ' + a.opener, '');
  if (a.sub) L.push(a.sub, '');
  for (const b of a.beats) L.push('- ' + b.l + ' | ' + b.c + ' | ' + b.t);
  L.push('');
});

L.push('## Numbers', '', S.num.lead, '', S.num.tell, '');
for (const i of S.num.inputs) L.push('- ' + [i.id, i.label, i.value, i.min, i.step].filter((x) => x !== undefined).join(' | '));
L.push('', '```js', String(S.num.compute), '```', '');

L.push('## Red Flags', '', S.rf.lead, '');
for (const f of S.rf.flags) {
  L.push('### ' + f.bad, '', f.tell, '', f.fix, '');
  if (f.note) L.push('Note: ' + f.note, '');
}

L.push('## Opener', '');
for (const c of S.open.cards) {
  L.push('### ' + c.k + ' | ' + c.t, '', c.lead, '');
  for (const it of c.items) L.push('#### ' + it.ht, '', it.a, '');
  if (c.hooks) {
    L.push('##### Hooks', '', c.hooks.lead, '');
    for (const h of c.hooks.items) L.push('- ' + h.q + ' | ' + h.d + ' | ' + h.tab);
    L.push('');
  }
  if (c.foot) L.push('Foot: ' + c.foot, '');
}

// Bank. The FIRST curveball and the FIRST frame are re-exports of the CURVEBALL / FRAME beats in
// the mock sequence (parse_md parseBank), so only the EXTRAS are authored under their headings.
L.push('## Bank', '');
const beatBody = (b) => {
  if (b.task) L.push('Task: ' + b.task);
  if (b.model) L.push('Model: ' + b.model);
  if (b.int) { L.push('Int: ' + b.int.q); L.push(b.int.a); }
  if (b.int2) { L.push('Int2: ' + b.int2.q); L.push(b.int2.a); }
  L.push('');
};
for (const b of S.bank.mockBeats) {
  L.push('### ' + [b.tag, b.theme, b.cue].filter(Boolean).join(' | '), '');
  beatBody(b);
}
const curveExtra = S.bank.curveballs.filter((c) => !S.bank.mockBeats.includes(c) && S.bank.mockBeats.every((m) => m.cue !== c.cue));
if (curveExtra.length) {
  L.push('### Extra Curveballs', '');
  for (const b of curveExtra) { L.push('### CURVEBALL | ' + (b.theme || '') + ' | ' + b.cue, ''); beatBody(b); }
}
const frameBeat = S.bank.mockBeats.find((b) => b.tag === 'FRAME');
const frameExtra = S.bank.frames.filter((f) => !frameBeat || f !== frameBeat.cue);
if (frameExtra.length) {
  L.push('### Frames', '');
  for (const f of frameExtra) L.push('- ' + f);
  L.push('');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
console.log('wrote ' + OUT + '  (' + L.length + ' lines from the hand-coded ' + ID + ')');
if (CEILING.length) {
  console.log('\nFORMAT CEILING -- fields the JS schema holds that markdown cannot express:');
  const seen = new Set();
  for (const c of CEILING) {
    const k = c.field + '|' + c.what;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log('  * ' + c.field + ' -- ' + c.what + '\n      ' + c.why);
  }
} else {
  console.log('FORMAT CEILING: none -- every field of the hand-coded topic is expressible in markdown.');
}
