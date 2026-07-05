// Proof: does the .topic (parsed through all layers) yield the SAME structured data the
// hand-authored modules hold? If so, the built app reads identical data => render-identical.
import fs from 'node:fs';
import { parseTopic } from './parse.mjs';

// hand-authored data (eval the modules to recover their objects)
const g = {};
eval(fs.readFileSync('src/topics/notifications/identity.js', 'utf8').replace('var TOPIC_NOTIF_IDENTITY', 'g.ID'));
eval(fs.readFileSync('src/topics/notifications/walk.js', 'utf8').replace('var TOPIC_NOTIF_WALK', 'g.WALK'));

// compiled data (notifications is topic 5 of 8 -> index/total derived from TOPIC_ORDER)
const out = parseTopic(fs.readFileSync('tools/compiler/samples/notifications.topic', 'utf8'), { index: 5, total: 8 });

let pass = 0, fail = 0;
const eq = (name, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  ok ? pass++ : fail++;
  console.log((ok ? 'OK   ' : 'FAIL ') + name);
  if (!ok) { console.log('   want: ' + JSON.stringify(b)); console.log('   got : ' + JSON.stringify(a)); }
};

console.log('-- identity (fields + derivations) --');
for (const f of ['index', 'total', 'locatorTail', 'group', 'title', 'h1', 'cramTitle', 'reportTitle', 'companionTopic', 'sub', 'thesis'])
  eq('identity.' + f, out.identity[f], g.ID[f]);
eq('identity.spine', out.identity.spine, g.ID.spine);
eq('identity.cmpNotes.walk', out.identity.cmpNotes.walk, g.ID.cmpNotes.walk);
eq('identity.cmpNotes.drill', out.identity.cmpNotes.drill, g.ID.cmpNotes.drill);

console.log('-- walk view, steps 1-3 (content fields; k is count-derived, checked separately) --');
for (let s = 0; s < 3; s++)
  for (const f of ['t', 'flow', 'ins', 'deep', 'cap', 'code'])
    if (g.WALK.steps[s][f] !== undefined) eq(`walk.step${s + 1}.${f}`, out.views.walk.steps[s][f], g.WALK.steps[s][f]);
// k derivation: shape matches (slice has 3 steps, full topic has 9)
eq('walk.step1.k (shape)', out.views.walk.steps[0].k, 'Step 1 / 3');

console.log(`\nAssembly data-equivalence: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
