import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';
// VERBATIM from tools/compiler/TOPIC_MARKDOWN_FORMAT.md lines 179-198 (the ## System example)
const specExample = `---
id: notifications
prefix: NOTIF
title: Notifications
index: 5
---

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
const out = parseMarkdown(specExample).views.sys;
console.log('=== Feeding the SPEC\'S OWN EXAMPLE to the SPEC\'S OWN PARSER ===\n');
console.log(JSON.stringify(out, null, 2));
console.log('\n--- VERDICT ---');
console.log('stages authored in the example : 3');
console.log('stages the parser produced     :', out.stages.length, out.stages.length===0?'  *** ALL DROPPED ***':'');
console.log('pivot answers authored         : 1');
console.log('pivot answers parser produced  :', out.pivots.filter(p=>p.a!=='').length, out.pivots.every(p=>p.a==='')?'  *** DROPPED (swallowed into chip) ***':'');
console.log('chip value                     :', JSON.stringify(out.pivots[0].chip));
console.log('chip length (px @ ~8px/char)   :', out.pivots[0].chip.length, 'chars');
