// The most devastating case: feed the FORMAT DOC'S OWN EXAMPLE to the parser.
// TOPIC_MARKDOWN_FORMAT.md:249-253 and :186-190 and :259-262 are the canonical examples.
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const docExample = `---
id: demo
prefix: DEMO
group: messaging-events
title: Demo
locatorTail: demo
---

## Thesis

T.

## Drill

SDE2 | baseline mechanics
SDE3 | failure modes
Staff | organizational leverage

### SDE2 | idempotency basics

How do you stop a retry from double-sending?

Compute a deterministic id and dedup on it.

## System

Zoom out to where this sits.

### Where it sits

Producers: emit events
Notification service: channels + delivery [*]
Channels: in-app, email

### Pivots an interviewer rides

From a notification they push on guarantees.

#### How do you guarantee delivery?

-> at-least-once + idempotent
At-least-once from the queue; dedup makes it effectively once.
`;

const out = parseMarkdown(docExample, { index: 1, total: 1 });
const sys = out.views.sys, drill = out.views.drill;

console.log('Source: TOPIC_MARKDOWN_FORMAT.md:186-190, :249-253, :259-262 (verbatim)\n');
console.log('AUTHORED (per the doc)          PARSER PRODUCED');
console.log('-'.repeat(64));
console.log('3 tier-note lines           ->  drill.tierNotes = %s', JSON.stringify(drill.tierNotes));
console.log('3 system-map stage lines    ->  sys.stages      = %s', JSON.stringify(sys.stages));
console.log('1 pivot answer              ->  pivots[0].a     = %s', JSON.stringify(sys.pivots[0].a));
console.log('                                pivots[0].chip  = %s', JSON.stringify(sys.pivots[0].chip));
console.log('');
const lost = (Object.keys(drill.tierNotes).length === 0) && sys.stages.length === 0 && !sys.pivots[0].a;
console.log(lost
  ? '>>> THE FORMAT DOC\'S OWN CANONICAL EXAMPLE LOSES ALL THREE. The authors were not wrong.'
  : '>>> parses clean');
