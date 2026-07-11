import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const FM = `---
id: proof
prefix: PF
title: Proof
---
`;
// VERBATIM the worked example from tools/compiler/TOPIC_MARKDOWN_FORMAT.md:177-201
const DOC_EXAMPLE = `## Drill

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
`;
const BULLET_FORM = DOC_EXAMPLE.replace(
  /SDE2 \| baseline mechanics\nSDE3 \| failure modes\nStaff \| organizational leverage/,
  '- SDE2 | baseline mechanics\n- SDE3 | failure modes\n- Staff | organizational leverage');

for (const [label, src] of [['DOC EXAMPLE (verbatim -- plain lines)', DOC_EXAMPLE], ['SAME, tier notes rewritten as BULLETS', BULLET_FORM]]) {
  const d = parseMarkdown(FM + src).views.drill;
  console.log('=== ' + label + ' ===');
  console.log('  tierNotes :', JSON.stringify(d.tierNotes));
  console.log('  cards     :', d.cards.length);
  console.log('  card.q    :', JSON.stringify(d.cards[0].q.slice(0, 46)));
  console.log('  card.a    :', JSON.stringify(d.cards[0].a.slice(0, 46)));
  console.log('  follow f[]:', d.cards[0].f.length, JSON.stringify(d.cards[0].f));
  console.log('  senior    :', JSON.stringify(d.cards[0].senior.slice(0, 46)));
  console.log('  speak     :', JSON.stringify(d.speak));
  console.log('');
}
