#!/usr/bin/env node
/*
 * prove_md.mjs -- markdown-parser DATA-EQUIVALENCE against the hand-coded spec.
 *
 * THE REFERENCE IS THE HAND-CODED 8, and that part was always right: this test evals
 * src/topics/notifications/*.js -- a topic that never touches the compiler -- and compares the
 * parser's output against it. An independent reference. Good.
 *
 * SO WHY DID IT REPORT "23 pass, 0 fail" WHILE THE COMPILER DROPPED 379 ITEMS PER BUILD?
 *
 * Because it only ever compared TWO of the ELEVEN modules: identity and walk. The fixture it
 * parsed -- tools/compiler/samples/notifications.md -- contains 5 of the 14 sections. It has no
 * ## System. No ## Drill. No ## Bank. Not one of the nine panes where content is discarded.
 *
 * The test's COVERAGE was drawn around the parser's WORKING SUBSET. It could not fail on a
 * dropped stage because it never fed the parser a stage. That is how a suite stays green for
 * 380 lost items: not by asserting something false, but by never asserting anything about the
 * broken part. A test that cannot fail is not evidence, and 23 green checks were being read as
 * proof of a parser that silently destroys a third of every topic.
 *
 * THE FIX -- COVERAGE IS NOW ASSERTED, NOT ASSUMED.
 * The fixture must exercise EVERY pane the parser supports, and this test compares EVERY module
 * of the reference. A pane missing from the fixture is now a hard FAILURE that names the pane
 * and what the blindness costs. Nobody can shrink this test's coverage back down to the panes
 * that happen to work -- doing so fails the build, loudly, with the reason.
 *
 * Usage:  node tools/compiler/prove_md.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { parseMarkdown } from './parse_md.mjs';

const DIR = 'src/topics/notifications';
const FIXTURE = 'tools/compiler/samples/notifications.md';

// Every pane the parser can produce -> the ## heading that feeds it, and the hand-coded module
// that defines what "full depth" means for it. THE 8 ARE THE SPEC.
const PANES = [
  { key: 'walk', heading: '## Walk', mod: 'walk' },
  { key: 'drill', heading: '## Drill', mod: 'drill' },
  { key: 'wb', heading: '## Whiteboard', mod: 'wb' },
  { key: 'sys', heading: '## System', mod: 'sys' },
  { key: 'trade', heading: '## Trade-offs', mod: 'trade' },
  { key: 'model', heading: '## Model Answers', mod: 'model' },
  { key: 'num', heading: '## Numbers', mod: 'num' },
  { key: 'rf', heading: '## Red Flags', mod: 'rf' },
  { key: 'open', heading: '## Opener', mod: 'open' },
  { key: 'bank', heading: '## Bank', mod: 'bank' },
];

// The collections that carry the depth. Each is a (pane, label, count) probe against the
// reference module -- so the comparison is POPULATION, not merely "the key exists".
const DEPTH = {
  walk: [['steps', (v) => v.steps.length], ['steps w/ code', (v) => v.steps.filter((s) => s.code || s.shiki).length]],
  drill: [['cards', (v) => v.cards.length], ['follow-ups', (v) => v.cards.reduce((n, c) => n + (c.f || []).length, 0)],
    ['seniors', (v) => v.cards.filter((c) => c.senior).length], ['speak', (v) => (v.speak || []).filter(Boolean).length],
    ['tierNotes', (v) => Object.keys(v.tierNotes || {}).length]],
  wb: [['steps', (v) => v.steps.length]],
  sys: [['stages', (v) => v.stages.length], ['stages w/ cur', (v) => v.stages.filter((s) => s.cur).length],
    ['pivots', (v) => v.pivots.length], ['pivots w/ answer', (v) => v.pivots.filter((p) => p.a && p.a.trim()).length]],
  trade: [['decisions', (v) => v.decisions.length], ['options', (v) => v.decisions.reduce((n, d) => n + d.opts.length, 0)]],
  model: [['answers', (v) => v.answers.length], ['beats', (v) => v.answers.reduce((n, a) => n + a.beats.length, 0)]],
  num: [['inputs', (v) => v.inputs.length]],
  rf: [['flags', (v) => v.flags.length]],
  open: [['cards', (v) => v.cards.length], ['items', (v) => v.cards.reduce((n, c) => n + c.items.length, 0)]],
  bank: [['mockBeats', (v) => v.mockBeats.length], ['beats w/ model', (v) => v.mockBeats.filter((b) => b.model).length],
    ['beats w/ int', (v) => v.mockBeats.filter((b) => b.int).length], ['curveballs', (v) => v.curveballs.length]],
};

// ---- load the hand-coded reference (the spec) --------------------------------------------
const ctx = { TopicRegistry: { register(o) { ctx.__reg = o; } } };
vm.createContext(ctx);
for (const f of ['identity', ...PANES.map((p) => p.mod), 'register']) {
  vm.runInContext(fs.readFileSync(`${DIR}/${f}.js`, 'utf8'), ctx);
}
const SPEC = { identity: ctx.__reg.identity, ...ctx.__reg.data };

const src = fs.readFileSync(FIXTURE, 'utf8');
const out = parseMarkdown(src, { index: 5, total: 8 });

let pass = 0, fail = 0;
const eq = (n, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  ok ? pass++ : fail++;
  console.log((ok ? 'OK   ' : 'FAIL ') + n);
  if (!ok) { console.log('   want: ' + JSON.stringify(b)); console.log('   got : ' + JSON.stringify(a)); }
};

// ---- COVERAGE GATE -- the check that was missing -------------------------------------------
// A pane absent from the fixture is a pane this test is BLIND to. That blindness is exactly how
// 380 dropped items stayed invisible behind 23 green assertions.
const missing = PANES.filter((p) => !src.includes(p.heading + '\n') && !src.trimEnd().endsWith(p.heading));
if (missing.length) {
  console.log('-- FIXTURE COVERAGE --');
  console.log('FAIL fixture coverage: ' + FIXTURE + ' exercises ' + (PANES.length - missing.length)
    + ' of ' + PANES.length + ' panes');
  console.log('');
  console.log('  This test can only see what the fixture feeds the parser. The panes below are');
  console.log('  ABSENT from the fixture, so no assertion here can ever fail on them -- which is');
  console.log('  why this suite reported "0 fail" while the compiler discarded content on every');
  console.log('  build. The reference topic HAS this content; the fixture simply never asks for it:');
  console.log('');
  for (const p of missing) {
    const probes = DEPTH[p.key] || [];
    const have = probes.map(([label, fn]) => {
      let n; try { n = fn(SPEC[p.key]); } catch { n = '?'; }
      return label + '=' + n;
    }).join(', ');
    console.log('    ' + (p.heading + ' ').padEnd(18) + '-> the spec carries ' + have);
  }
  console.log('');
  console.log('  Add every pane to ' + FIXTURE + ', authored in the form the format spec');
  console.log('  demonstrates (TOPIC_MARKDOWN_FORMAT.md), then this test compares all ' + PANES.length + ' panes');
  console.log('  against the hand-coded spec and the parser can no longer hide behind the gaps.');
  fail++;
}

// ---- identity (always present) --------------------------------------------------------------
console.log('\n-- identity --');
for (const f of ['index', 'total', 'locatorTail', 'group', 'title', 'h1', 'cramTitle', 'reportTitle', 'companionTopic', 'sub', 'thesis'])
  eq('identity.' + f, out.identity[f], SPEC.identity[f]);
eq('identity.spine', out.identity.spine, SPEC.identity.spine);
// cmpNotes: compare EVERY note the spec carries, not two cherry-picked ones.
for (const k of Object.keys(SPEC.identity.cmpNotes))
  eq('identity.cmpNotes.' + k, out.identity.cmpNotes[k], SPEC.identity.cmpNotes[k]);

// ---- every pane the fixture DOES carry: compare POPULATION against the spec ------------------
for (const p of PANES) {
  const got = out.views[p.key], want = SPEC[p.key];
  if (!got || !want) continue;                       // absence is the coverage gate's business
  console.log('\n-- ' + p.heading + ' (population vs the hand-coded spec) --');
  for (const [label, fn] of (DEPTH[p.key] || [])) {
    let a, b;
    try { a = fn(got); } catch { a = 'ERR'; }
    try { b = fn(want); } catch { b = 'ERR'; }
    eq(p.key + '.' + label, a, b);
  }
}

// ---- walk content fidelity (kept from the original) -----------------------------------------
if (out.views.walk) {
  console.log('\n-- walk step content (field-by-field) --');
  const n = Math.min(2, SPEC.walk.steps.length, out.views.walk.steps.length);
  for (let s = 0; s < n; s++)
    for (const f of ['t', 'flow', 'ins', 'deep', 'cap', 'code'])
      if (SPEC.walk.steps[s][f] !== undefined) eq(`walk.step${s + 1}.${f}`, out.views.walk.steps[s][f], SPEC.walk.steps[s][f]);
}

console.log(`\nMarkdown-parser data-equivalence vs the hand-coded spec: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
