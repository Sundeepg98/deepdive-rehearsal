// fx-docspec.mjs -- DOC/PARSER CONTRADICTION PROOF.
// Feed the parser the EXACT examples printed in tools/compiler/TOPIC_MARKDOWN_FORMAT.md
// (verbatim, de-indented from their 4-space code blocks) and show what it produces.
// Anything the doc demonstrates that comes out empty is a doc/parser contradiction.
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

// ---- Verbatim from TOPIC_MARKDOWN_FORMAT.md, de-indented. Line refs in comments. ----
const SRC = `---
id: notifications
prefix: NOTIF
group: messaging-events
title: Notifications
locatorTail: delivery boundary
index: 5
---

## Thesis

The doc's thesis paragraph.

## Sub

The doc's sub paragraph.

## Spine

- Fan-out **at the boundary** --- producers emit \`notify(user, event)\`.
- Exactly-once by **idempotency** --- a deterministic id plus a dedup store.
- Two channels, one **fallback** --- in-app default, email backup.
- A **row per recipient** --- ~100-byte rows with a partial unread index.

## Companion Notes

### walk

The delivery flow

Event to seen-by-the-user, one step at a time.

Say the split out loud before anyone cuts in.

## Walk

### The producer emits an event

\`\`\`flow
n[service] -> p[notify(user, event)] -> t[request] . a[knows no channels]
\`\`\`

A producer calls \`notify(user, event)\` and stops there.

This is the boundary that keeps channel logic on one side.

### Model Script

- Frame it | "A producer emits an event; the system owns delivery."
- Interviewer: "A retry double-sends. How?"
- Trace the key | "The idempotency key wasn't applied on the send path."

## Drill

SDE2 | baseline mechanics
SDE3 | failure modes
Staff | organizational leverage

### SDE2 | idempotency basics

How do you stop a retry from double-sending?

Compute a deterministic id and dedup on it.

Follow: what makes the id deterministic?
It is content-derived: hash(user, event, channel).

Senior: name the delivery guarantee, not the queue.
Speak: commit to an answer before revealing.

## Whiteboard

Sketch the delivery path end to end.

### Where does dedup sit?

Before any send, keyed by the deterministic id.

Verdict: one write path, two channels.

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

## Trade-offs

The calls that separate levels.

### At-least-once vs exactly-once

- At-least-once: simple, needs idempotent consumers
- Exactly-once: expensive, rarely worth it

Prefer at-least-once plus a dedup store.

## Model Answers

### idempotency | The core guarantee

How I frame it under time pressure.

- Deterministic id | key | hash(user, event, channel)
- Dedup store | store | SET NX with a TTL

## Numbers

Back-of-envelope the storage.

Each notification is a row; unread gets a partial index.

- users | Users | 1000000 | 0 | 1000
- perUser | Notifications/user | 100 | 0 | 10

\`\`\`js
function (vals, fmt) {
  var rows = vals.users * vals.perUser;
  return [{ k: 'Rows', v: fmt.n(rows), u: 'rows', n: 'one row', over: false }];
}
\`\`\`

## Red Flags

What makes an interviewer wince.

### "I'll just call SES from each service"

Scatters channel logic across every producer.

Emit a domain event; the notification system owns delivery.

Note: adding a channel should be one change, not fleet-wide.

## Opener

### 30s | The one-liner

How I open when asked to design notifications.

#### What is the boundary?

Producers emit events; the system owns channels.

##### Hooks

Where an interviewer usually pushes.

- Guarantees? | delivery-once | drill
- Fan-out? | channel routing | walk

Foot: keep it to two sentences.

## Bank

### SCALE | A million notifications a day

Task: size the storage and the read path.
Model: ~100-byte rows, partial index on unread.
Int: what dominates cost?
Storage, not compute.

### Extra Curveballs

### CURVEBALL | outage | The dedup store is down -- now what?

Model: fail open with a short TTL, reconcile later.

### Frames

- Delivery guarantee first, mechanism second
- One boundary, many channels
`;

const t = parseMarkdown(SRC, { index: 5, total: 46 });
const v = t.views;

const CHECKS = [
  // [what the DOC promises, doc line, actual value, expected-nonempty test]
  ['sys.stages (doc: 3 stages, one [*])', 'FORMAT.md:249-253', v.sys.stages, (x) => x.length === 3],
  ['sys.pivots[0].chip (doc: chip only)', 'FORMAT.md:261', v.sys.pivots[0] && v.sys.pivots[0].chip, (x) => x && !x.includes('\n')],
  ['sys.pivots[0].a   (doc: answer line)', 'FORMAT.md:262', v.sys.pivots[0] && v.sys.pivots[0].a, (x) => !!x],
  ['drill.tierNotes (doc: 3 notes)', 'FORMAT.md:186-190', v.drill.tierNotes, (x) => Object.keys(x).length === 3],
  ['drill.cards[0].f (doc: 1 follow-up)', 'FORMAT.md:198-199', v.drill.cards[0].f, (x) => x.length === 1],
  ['drill.cards[0].senior (doc: 1 line)', 'FORMAT.md:201', v.drill.cards[0].senior, (x) => x && !x.includes('\n')],
  ['drill.speak[0] (doc: Speak: line)', 'FORMAT.md:202', v.drill.speak[0], (x) => !!x],
  ['bank.mockBeats[0].task (doc: 1 line)', 'FORMAT.md:378', v.bank.mockBeats[0].task, (x) => x && !x.includes('\n')],
  ['bank.mockBeats[0].model (doc: Model:)', 'FORMAT.md:379', v.bank.mockBeats[0].model, (x) => !!x],
  ['bank.mockBeats[0].int  (doc: Int: + a)', 'FORMAT.md:380-381', v.bank.mockBeats[0].int, (x) => !!x],
  ['bank.curveballs[0].model (control)', 'FORMAT.md:388', v.bank.curveballs[0] && v.bank.curveballs[0].model, (x) => !!x],
  ['bank.frames (doc: 2 frames)', 'FORMAT.md:392-393', v.bank.frames, (x) => x.length === 2],
  ['walk.steps[0].flow (control)', 'FORMAT.md:153', v.walk.steps[0].flow, (x) => !!x],
  ['trade.decisions[0].opts (control)', 'FORMAT.md:275-276', v.trade.decisions[0].opts, (x) => x.length === 2],
  ['model.answers[0].beats (control)', 'FORMAT.md:291-292', v.model.answers[0].beats, (x) => x.length === 2],
  ['open.cards[0].hooks.items (control)', 'FORMAT.md:362-363', v.open.cards[0].hooks.items, (x) => x.length === 2],
  ['cmpNotes.walk (control)', 'FORMAT.md:104-110', t.identity.cmpNotes.walk, (x) => x && x.length === 3],
];

console.log('THE DOCS\' OWN EXAMPLE TOPIC, RUN THROUGH THE PARSER');
console.log('='.repeat(96));
let broken = 0;
for (const [label, ref, val, ok] of CHECKS) {
  let pass = false;
  try { pass = ok(val); } catch { pass = false; }
  if (!pass) broken++;
  const shown = JSON.stringify(val);
  console.log((pass ? 'PASS  ' : 'BROKEN') + '  ' + label.padEnd(38) + ' [' + ref + ']');
  if (!pass) console.log('          got: ' + (shown === undefined ? 'undefined' : shown.slice(0, 150)));
}
console.log('='.repeat(96));
console.log('DOC EXAMPLES THE PARSER MIS-HANDLES: ' + broken + ' / ' + CHECKS.length);
console.log('\nNOTE: the topic above ALSO passes zod (arrays are arrays, just empty) --');
console.log('this is the self-confirming apparatus: schema checks SHAPE, never POPULATION.');
