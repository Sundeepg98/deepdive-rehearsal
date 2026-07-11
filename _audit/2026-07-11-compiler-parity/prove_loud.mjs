#!/usr/bin/env node
/*
 * prove_loud.mjs -- the compiler must FAIL LOUDLY, never discard.
 *
 * Conservation proves nothing is dropped from the content that EXISTS today. That is a statement
 * about 38 files, not about the parser. The durable property is the one this file tests: feed the
 * parser content it cannot place, and it must STOP THE BUILD and say where -- because the next
 * author to write a fourth paragraph or a second Speak: line must be told, not quietly truncated.
 *
 * Each case below is authored content that the OLD parser accepted and then threw away in silence.
 *   node _audit/2026-07-11-compiler-parity/prove_loud.mjs
 */
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const FM = `---
id: t
prefix: T
group: data-storage
title: T
locatorTail: t
index: 1
---

`;

// [name, markdown fragment, what the OLD parser did with it]
const CASES = [
  ['Drill: a second Speak: line',
    '## Drill\n\n### SDE2 | s\n\nq?\n\na.\n\nSpeak: first.\nSpeak: second.\n',
    'the first Speak was overwritten'],
  ['Drill: a third plain paragraph',
    '## Drill\n\n### SDE2 | s\n\nq?\n\na.\n\nan extra paragraph nobody reads.\n',
    'discarded -- a card holds q + a only'],
  ['Drill: tier note with no "|"',
    '## Drill\n\nSDE2 baseline mechanics\n\n### SDE2 | s\n\nq?\n\na.\n',
    'discarded silently'],
  ['System: a third ### heading',
    '## System\n\nintro.\n\n### Where\n\nA: b\n\n### Pivots\n\nsub.\n\n### Extra\n\nx\n',
    'the pivots heading was overwritten'],
  ['System: a stage with no "<n>: <d>"',
    '## System\n\nintro.\n\n### Where\n\nProducers emit events\n\n### Pivots\n\nsub.\n',
    'emitted a stage with an empty description'],
  ['System: a third paragraph on a pivot',
    '## System\n\nintro.\n\n### Where\n\nA: b\n\n### Pivots\n\nsub.\n\n#### q?\n\n-> chip\nthe answer.\n\nan extra paragraph.\n',
    'overwrote the answer'],
  ['Walk: a second ```flow in one step',
    '## Walk\n\n### s\n\n```flow\na[x] -> b[y]\n```\n\nins.\n\n```flow\nc[z] -> d[w]\n```\n',
    'the first flow was destroyed'],
  ['Walk: a paragraph after a captioned code block',
    '## Walk\n\n### s\n\n```flow\na[x] -> b[y]\n```\n\nins.\n\n```js\nvar a = 1;\n```\n\nthe caption.\n\na trailing paragraph.\n',
    'overwrote the caption'],
  ['Walk: prose before the first step',
    '## Walk\n\nprose with no step.\n\n### s\n\nins.\n',
    'discarded silently'],
  // NOTE the distinction, which cost this file a false positive before it shipped: an unlabelled
  // line AFTER a label is a legitimate SOFT-WRAP continuation of that field -- segment() keeps it
  // with the field that owns it and proseLine() joins it, so it is preserved, not lost, and must
  // NOT throw. Only a line that belongs to no field at all is unplaceable.
  ['Bank: a stray line before any label',
    '## Bank\n\n### SCALE | cue\n\nstray text with no label.\nTask: t.\n',
    'swallowed into the beat with no field to hold it'],
  ['Bank: a second Model: on one beat',
    '## Bank\n\n### SCALE | cue\n\nModel: one.\nModel: two.\n',
    'the first Model was destroyed'],
  ['Model Answers: a second sub paragraph',
    '## Model Answers\n\n### sel | opener\n\nsub one.\n\nsub two.\n',
    'discarded silently'],
  ['Numbers: a third paragraph',
    '## Numbers\n\nlead.\n\ntell.\n\na third paragraph.\n',
    'discarded silently'],
  ['Whiteboard: a second fenced diagram',
    '## Whiteboard\n\nsub.\n\n```html\n<svg/>\n```\n\n```html\n<svg id="2"/>\n```\n',
    'the first diagram was destroyed'],
  ['Red Flags: a fourth paragraph on a flag',
    '## Red Flags\n\nlead.\n\n### "bad"\n\ntell.\n\nfix.\n\na fourth paragraph.\n',
    'discarded silently'],
  ['Companion Notes: a note with 2 paragraphs',
    '## Companion Notes\n\n### walk\n\ntitle only.\n\ndesc only.\n',
    'the ENTIRE note was discarded'],
  ['Opener: a second Foot:',
    '## Opener\n\n### 30s | one-liner\n\nlead.\n\nFoot: a.\n\nFoot: b.\n',
    'the first Foot was destroyed'],
  ['Trade-offs: a second tell paragraph',
    '## Trade-offs\n\nlead.\n\n### A vs B\n\n- A: x\n- B: y\n\ntell one.\n\ntell two.\n',
    'overwrote the tell'],
];

let loud = 0, silent = 0;
console.log('FAIL-LOUD -- content the parser cannot place must STOP THE BUILD, not vanish.\n');
console.log('  ' + 'authored content'.padEnd(44) + 'verdict');
console.log('  ' + '-'.repeat(74));
for (const [name, frag, was] of CASES) {
  let threw = null;
  try { parseMarkdown(FM + frag, { index: 1, total: 1 }); }
  catch (e) { threw = e.message.split('\n')[0]; }
  if (threw) {
    loud++;
    console.log('  ' + name.padEnd(44) + 'THROWS');
    console.log('  ' + ' '.repeat(4) + threw.replace(/^## /, '').slice(0, 96));
  } else {
    silent++;
    console.log('  ' + name.padEnd(44) + '<<<< ACCEPTED SILENTLY (old behaviour: ' + was + ')');
  }
}
console.log('\n  ' + loud + ' of ' + CASES.length + ' fail loudly; ' + silent + ' still discard in silence.');
process.exit(silent ? 1 : 0);
