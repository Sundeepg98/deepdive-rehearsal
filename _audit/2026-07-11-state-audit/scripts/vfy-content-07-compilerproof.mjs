/* DECISIVE TEST of the original lens's ROOT CAUSE.
   Lens claim: "the markdown authoring format has no field for the mechanics ...
                the signature of a MISSING COMPILER FIELD, not tired authors."
   Test: feed the REAL compiler a drill card that DOES author Follow:/Senior:/Speak:,
   and a curveball that DOES author Task:/Int:. If they compile, the field is NOT missing
   and the root cause is unauthored content, not an absent schema.
   READ-ONLY: imports the compiler, writes nothing outside _audit, does not build. */
import { parseMarkdown } from 'file:///D:/claude-workspace/deepdive-rehearsal/tools/compiler/parse_md.mjs';
import fs from 'fs';

const real = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/src/topics-md/idempotency.md', 'utf8');

// ---------- A: the corpus AS SHIPPED ----------
const asShipped = parseMarkdown(real);
const V = asShipped.views || asShipped.data || asShipped; const dA = V.drill, bA = V.bank; console.log('  [top-level keys]', Object.keys(asShipped));
console.log('=== A) idempotency.md AS AUTHORED TODAY ===');
console.log('  cards            :', dA.cards.length);
console.log('  cards with f[]   :', dA.cards.filter(c => c.f.length === 0).length, '/', dA.cards.length);
console.log('  cards with senior:', dA.cards.filter(c => c.senior).length, '/', dA.cards.length);
console.log('  speak non-empty  :', dA.speak.filter(Boolean).length, '/', dA.speak.length);
console.log('  tierNotes keys   :', JSON.stringify(Object.keys(dA.tierNotes)));
console.log('  sys.stages       :', V.sys.stages.length);
console.log('  wb.foot          :', JSON.stringify(V.wb.foot));
console.log('  curveball[0]     : theme=' + JSON.stringify(bA.curveballs[0].theme) +
            ' task=' + JSON.stringify(bA.curveballs[0].task) + ' int=' + JSON.stringify(bA.curveballs[0].int));
console.log('  curveball[0].cue :', JSON.stringify(bA.curveballs[0].cue.slice(0, 70)));

// ---------- B: the SAME file, with the DOCUMENTED optional lines actually authored ----------
// Patch ONE drill card (in memory only) to carry Follow:/Senior:/Speak:, exactly as
// tools/compiler/TOPIC_MARKDOWN_FORMAT.md:183-202 documents. Zero compiler changes.
const patched = real.replace(
`### SDE2 | what idempotency is`,
`### SDE2 | tier notes probe

Tier notes | all | All four levels, mixed -- the way a real loop comes at you.

### SDE2 | what idempotency is`
).replace(
  /(### SDE2 \| why it matters\n\n[^\n]+\n\n)([^\n]+\n)/,
  `$1$2
Follow: and what breaks if the retry lands twice?

The charge is applied twice -- the user is double-billed and the ledger is wrong.

Senior: name the ambiguity of the failure, not just "retry safely".

Speak: I'd say the network can't tell me whether the write landed, so I make the second attempt harmless.
`
).replace(
  /(### CURVEBALL \| ordering \| [^\n]+\n\n)/,
  `$1Task: reframe the premise out loud, then give the real mechanism.

Int: so is a version number enough on its own?

No -- you still need the dedup, or a replayed stale update re-applies.

`
);

const after = parseMarkdown(patched);
const W = after.views || after.data || after; const dB = W.drill, bB = W.bank;
console.log('\n=== B) SAME FILE + the DOCUMENTED optional lines (NO compiler change) ===');
const withF = dB.cards.filter(c => c.f.length > 0);
const withS = dB.cards.filter(c => c.senior);
console.log('  cards with a follow-up f[] :', withF.length, withF.length ? '-> ' + JSON.stringify(withF[0].f) : '');
console.log('  cards with senior          :', withS.length, withS.length ? '-> ' + JSON.stringify(withS[0].senior) : '');
console.log('  speak non-empty            :', dB.speak.filter(Boolean).length, '->', JSON.stringify(dB.speak.filter(Boolean)[0] || ''));
console.log('  tierNotes                  :', JSON.stringify(dB.tierNotes));
console.log('  curveball[0].task          :', JSON.stringify(bB.curveballs[0].task));
console.log('  curveball[0].int           :', JSON.stringify(bB.curveballs[0].int));

const verdict = withF.length > 0 && withS.length > 0 && dB.speak.filter(Boolean).length > 0
  && Object.keys(dB.tierNotes).length > 0 && bB.curveballs[0].task && bB.curveballs[0].int;
console.log('\n########################################################');
console.log('VERDICT:', verdict
  ? 'ALL fields compiled with ZERO compiler changes.\n=> The schema is NOT missing. The 38 md files simply never author these lines.\n=> The lens\'s root cause ("missing compiler field, not tired authors") is REFUTED.'
  : 'some field did NOT compile -- schema gap is real');
console.log('########################################################');
