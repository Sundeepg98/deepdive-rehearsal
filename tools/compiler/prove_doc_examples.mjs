#!/usr/bin/env node
/*
 * prove_doc_examples.mjs -- THE ROOT-CAUSE GATE.
 *
 * The format spec (TOPIC_MARKDOWN_FORMAT.md) carries a worked example for every pane. Those
 * examples are the contract: they are what an author reads, copies, and trusts. This test feeds
 * each one to the REAL parser and asserts the parser keeps what the example wrote.
 *
 * IT DOES NOT PASS TODAY, AND THAT IS THE ENTIRE POINT.
 *
 *   TOPIC_MARKDOWN_FORMAT.md:238-239 says the System stages are "bullets <n>: <d>".
 *   TOPIC_MARKDOWN_FORMAT.md:251-253, the SAME SECTION'S OWN EXAMPLE, writes them as plain lines:
 *
 *       ### Where it sits
 *
 *       Producers: emit events
 *       Notification service: channels + delivery [*]
 *       Channels: in-app, email
 *
 *   The prose and the example CONTRADICT each other. parse_md.mjs:203 implements the prose
 *   (`bullet_list_open`), so the example's three stages parse to `stages: []`. Every one of the
 *   38 topics followed the EXAMPLE -- which is why 189 stages are on the floor. The same document
 *   at :275 writes trade-off options as REAL bullets ("- At-least-once: simple, ..."), so the doc
 *   plainly distinguishes the two forms and chose plain lines here on purpose.
 *
 *   TOPIC_MARKDOWN_FORMAT.md:379-382, the Bank example, writes four ADJACENT lines:
 *
 *       Task: size the storage and the read path.
 *       Model: ~100-byte rows, partial index on unread.
 *       Int: what dominates cost?
 *       Storage, not compute.
 *
 *   markdown-it merges adjacent lines into ONE paragraph, so parse_md.mjs:431 matches "Task:"
 *   and assigns the ENTIRE blob -- Model, Int and the answer included -- to beat.task.
 *
 * So the documented format does not survive the parser that documents it. This is the check that
 * would have caught all 380 drops on day one, and it cannot be gamed: its reference is the
 * project's own specification. To make it green you must fix the parser or fix the spec -- and
 * fixing the spec means editing the example an author is told to copy, which is visible in review.
 *
 * Usage:  node tools/compiler/prove_doc_examples.mjs
 *         PARSER_MODULE=path/to/candidate.mjs node tools/compiler/prove_doc_examples.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { scanSource, scanParsed, fusedLeaves, show, FIELDS } from './conservation-scan.mjs';

const PARSER = process.env.PARSER_MODULE
  ? url.pathToFileURL(path.resolve(process.env.PARSER_MODULE)).href
  : './parse_md.mjs';
const { parseMarkdown } = await import(PARSER);

const DOC = 'tools/compiler/TOPIC_MARKDOWN_FORMAT.md';
const lines = fs.readFileSync(DOC, 'utf8').split('\n');

// Extract every worked example: a 4-space-indented block whose first line is a "## " heading.
// (Indented blocks are how the spec renders its examples as code.)
const examples = [];
for (let i = 0; i < lines.length; i++) {
  if (!/^ {4}## /.test(lines[i])) continue;
  const start = i;
  const buf = [];
  while (i < lines.length && (/^ {4}/.test(lines[i]) || lines[i].trim() === '')) {
    buf.push(lines[i].replace(/^ {4}/, ''));
    i++;
  }
  while (buf.length && !buf[buf.length - 1].trim()) buf.pop();
  examples.push({ line: start + 1, heading: buf[0].trim(), src: buf.join('\n') });
}

if (!examples.length) {
  console.log('DOC EXAMPLES: FAIL -- no worked examples found in ' + DOC);
  console.log('  The format spec must carry a copyable example per pane; without one there is');
  console.log('  no contract for an author to follow and nothing for this gate to verify.');
  process.exit(1);
}

const pad = (s, w) => String(s).padEnd(w);
const failures = [];

console.log('DOC EXAMPLES -- does the documented format survive the parser that documents it?');
console.log('reference: %s (the spec\'s own worked examples)\n', DOC);
console.log('  ' + pad('EXAMPLE', 22) + pad('DOC', 8) + 'RESULT');
console.log('  ' + '-'.repeat(62));

for (const ex of examples) {
  const cite = DOC + ':' + ex.line;
  let parsed;
  try {
    parsed = parseMarkdown(ex.src, { index: 1, total: 1 });
  } catch (e) {
    failures.push({ ex, kind: 'throw', detail: e.message });
    console.log('  ' + pad(ex.heading, 22) + pad(':' + ex.line, 8) + 'THROWS -- the spec\'s own example does not compile');
    continue;
  }

  const { A } = scanSource(ex.src);
  const P = scanParsed(parsed);

  const lost = [];
  for (const k of FIELDS) {
    const a = A[k].length, p = P[k];
    if (p !== a) lost.push({ k, a, p, ex: A[k].slice(0, 3) });
  }
  const fused = fusedLeaves(parsed.views, ex.heading);

  if (!lost.length && !fused.length) {
    console.log('  ' + pad(ex.heading, 22) + pad(':' + ex.line, 8) + 'ok');
    continue;
  }
  failures.push({ ex, kind: 'loss', lost, fused });
  const what = [];
  if (lost.length) what.push(lost.map((l) => l.k + ' ' + l.a + '->' + l.p).join(', '));
  if (fused.length) what.push(fused.length + ' fused');
  console.log('  ' + pad(ex.heading, 22) + pad(':' + ex.line, 8) + '<<<< ' + what.join(' | '));
}

if (!failures.length) {
  console.log('\nDOC EXAMPLES: PASS -- every worked example in the spec survives the parser intact.');
  process.exit(0);
}

console.log('\n' + '='.repeat(72));
console.log('THE SPEC AND THE PARSER DISAGREE. Each example below is what an author is told');
console.log('to copy -- and what the compiler silently destroys when they do.');
console.log('='.repeat(72));

for (const f of failures) {
  console.log('\n  %s:%d   %s', DOC, f.ex.line, f.ex.heading);
  if (f.kind === 'throw') {
    console.log('    the example does not even parse: %s', f.detail);
    continue;
  }
  for (const l of f.lost) {
    console.log('    %s: the example authors %d, the parser emits %d', l.k, l.a, l.p);
    for (const u of l.ex) {
      console.log('        %s:%d  %s', DOC, f.ex.line + u.ln - 1, show(u.text, 60));
    }
  }
  for (const h of f.fused.slice(0, 2)) {
    console.log('    %s swallowed the lines beneath it:', h.path);
    console.log('        %s', show(h.text, 80));
  }
}

console.log('\nDOC EXAMPLES: FAIL -- %d of %d worked examples do not survive the parser.',
  failures.length, examples.length);
console.log('Either the parser is wrong or the spec is wrong. Both cannot ship.');
process.exit(1);
