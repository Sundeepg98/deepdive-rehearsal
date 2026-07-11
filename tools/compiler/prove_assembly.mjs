// LEGACY PATH -- parse.mjs / the .topic format. THIS IS NOT EVIDENCE ABOUT THE SHIPPING COMPILER.
//
// Every assertion below exercises parseTopic() from parse.mjs. ZERO shipping topics use it: all
// 38 are markdown and go through parse_md.mjs (compile.mjs:64 routes .md -> parseMarkdown, and
// the only .topic file in the repo is the fixture this test reads). So its 28 green assertions
// were 28 green assertions about a code path the product does not execute -- and they sat in the
// gate next to the real compiler checks, reading like proof that topic compilation was sound
// while parse_md.mjs silently destroyed 571 authored items on every build.
//
// The file is KEPT because parse.mjs is still reachable (compile.mjs:65 falls back to it for any
// non-.md input) and a working test of it is worth having. But it now says what it is, and its
// gate row is named `compiler_legacy_topic` so it can never again be read as coverage of the
// pipeline that actually ships. For that, see:
//     tools/compiler/prove_conservation.mjs   (reference: the author's raw bytes)
//     tools/compiler/prove_doc_examples.mjs   (reference: the format spec's worked examples)
//     tools/compiler/prove_md.mjs             (reference: the hand-coded 8)
//
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

// State the coverage honestly, every run: how many topics actually take this path?
const shipping = fs.existsSync('src/topics-md')
  ? fs.readdirSync('src/topics-md').filter((f) => f.endsWith('.topic')).length : 0;
console.log(`\nLEGACY .topic path: ${pass} pass, ${fail} fail`);
console.log(`  ${shipping} of the shipping topics use this parser (the other ${38 - shipping} use parse_md.mjs).`);
console.log('  This says NOTHING about the compiler that ships. See prove_conservation.mjs.');
process.exit(fail === 0 ? 0 : 1);
