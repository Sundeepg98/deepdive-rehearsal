#!/usr/bin/env node
/*
 * prove_emit.mjs -- EMITTER round-trip. Serializer fidelity ONLY.
 *
 * READ THIS BEFORE TRUSTING A GREEN RESULT HERE.
 *
 * This test compares emit(parsed) -> evaluated -> data  against  parsed. Its reference is THE
 * PARSER'S OWN OUTPUT. That makes it structurally incapable of detecting a parser bug: a parser
 * that silently discards 189 system-map stages produces `stages: []` on BOTH sides of the equals
 * sign, and this test goes green. It did exactly that, on every build, while the compiler
 * destroyed 571 authored items.
 *
 * That is not a bug in this file -- round-tripping against the input is the CORRECT way to test
 * a SERIALIZER, and that is all this file is for: does emit() write out, byte for byte, the data
 * it was handed? The bug was in how the result was READ. Listed in the gate next to "compiler_md"
 * and reporting "7 pass, 0 fail", it looked like proof that the compiler was sound. It never was,
 * and could never be.
 *
 * SO THIS FILE NOW STATES ITS OWN LIMITS, AND THE GATE ROW IS NAMED FOR WHAT IT ACTUALLY TESTS.
 * The question "did the parser keep what the author wrote?" has an INDEPENDENT reference and a
 * gate of its own:
 *      tools/compiler/prove_conservation.mjs   (reference: the author's raw bytes)
 *      tools/compiler/prove_doc_examples.mjs   (reference: the format spec's worked examples)
 * Nothing in THIS file is evidence about that. A green run here means only that the emitter did
 * not lose anything the parser already had.
 *
 * WHAT ALSO CHANGED: it now runs on the LIVE path. It used to parse a .topic fixture through
 * parse.mjs -- a parser that ZERO shipping topics use (all 38 go through parse_md.mjs at
 * compile.mjs:64). The emitter is now proven against a REAL topic, on the pipeline that ships.
 *
 * Note on vm: the emitted modules are plain `var TOPIC_X = {...};` sources produced by our own
 * emitter. They are executed in a sandboxed vm context (never eval) purely to recover the object
 * they declare -- this is a build-time test over first-party generated text, not user input.
 *
 * Usage:  node tools/compiler/prove_emit.mjs
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { parseMarkdown } from './parse_md.mjs';
import { emit } from './emit.mjs';

const SAMPLE = 'src/topics-md/idempotency.md';   // a REAL shipping topic, not a curated fixture

const topic = parseMarkdown(fs.readFileSync(SAMPLE, 'utf8'), { index: 24, total: 46 });
const files = emit(topic);

let pass = 0, fail = 0;
const check = (n, c) => { c ? pass++ : fail++; console.log((c ? 'OK   ' : 'FAIL ') + n); };

console.log('-- emitted modules are ASCII (the deliverable is 7-bit clean) --');
for (const [name, body] of Object.entries(files)) check('ascii ' + name, !/[^\x00-\x7F]/.test(body));

// ---- serializer fidelity ---------------------------------------------------------------------
// Run every emitted module in ONE sandbox (register.js needs the identity/view vars in scope),
// then read the declared globals back out. The OLD version checked identity and walk only -- two
// of eleven modules -- so an emitter that mangled `sys` or `bank` would have shipped green.
const P = 'TOPIC_' + topic.prefix;
const ctx = { TopicRegistry: { register(o) { ctx.__reg = o; } } };
vm.createContext(ctx);
for (const [name, body] of Object.entries(files)) {
  if (name === 'register.js') continue;
  vm.runInContext(body, ctx);
}

// Two views are TRANSFORMED on purpose (emit.mjs:5-7), so demanding blind identity would report
// a correct emitter as broken:
//   num  -- `compute` is a STRING in the parsed data and is emitted as RAW CODE (a live function),
//           so JSON.stringify() of it is `undefined`. Assert the rest round-trips AND that compute
//           actually became a callable function.
//   bank -- the emitter INJECTS `cards`/`speak` as references to TOPIC_<P>_DRILL.* so the 21-card
//           array is not duplicated in the bundle. Assert every key the PARSER produced round-trips
//           AND that the injected references resolve to the drill slice.
const omit = (o, keys) => { const c = { ...o }; for (const k of keys) delete c[k]; return c; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\n-- every emitted module round-trips (evaluate(emit(x)) === x) --');
check('identity round-trips', same(ctx[P + '_IDENTITY'], topic.identity));
for (const view of Object.keys(topic.views)) {
  if (!files[view + '.js']) { check(view + ' emitted', false); continue; }
  const got = ctx[P + '_' + view.toUpperCase()], want = topic.views[view];

  if (view === 'num' && want.compute !== undefined) {
    check('num round-trips (all fields but compute)', same(omit(got, ['compute']), omit(want, ['compute'])));
    check('num.compute emitted as a callable function', typeof got.compute === 'function');
    continue;
  }
  if (view === 'bank') {
    check('bank round-trips (every parsed field)', same(omit(got, ['cards', 'speak']), want));
    // the injected references must actually point at the drill slice -- if drill.js ever stopped
    // loading first, or the names drifted, bank.cards would silently be undefined at runtime.
    const drill = ctx[P + '_DRILL'];
    check('bank.cards references the drill slice', got.cards === drill.cards && Array.isArray(got.cards));
    check('bank.speak references the drill slice', got.speak === drill.speak);
    continue;
  }
  check(view + ' round-trips', same(got, want));
}

// ---- the registration wires the data the parser produced --------------------------------------
vm.runInContext(files['register.js'], ctx);
const reg = ctx.__reg;
check("register id === '" + topic.id + "'", reg && reg.id === topic.id);
for (const view of Object.keys(topic.views)) {
  // register.js wires the EMITTED module objects, so compare against those (num/bank carry the
  // deliberate transformations verified above), not against the pre-emit parser output.
  check('register wires ' + view, reg && reg.data[view] === ctx[P + '_' + view.toUpperCase()]);
}

console.log('\nEmitter round-trip (SERIALIZER FIDELITY ONLY -- not data-equivalence, see header): '
  + pass + ' pass, ' + fail + ' fail');
console.log('A green result here does NOT mean the parser kept the author\'s content.');
console.log('That is prove_conservation.mjs / prove_doc_examples.mjs, which have an INDEPENDENT reference.');
process.exit(fail === 0 ? 0 : 1);
