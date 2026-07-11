# 2026-07-11 — The compiler parity fix, independently verified

**Verdict: the thesis was right, the fix is real, and the gate is no longer self-confirming — but one of the six browser-visible defects was never fixed and is still live in the shipped build.**

This is a *verification* record. Every number below was re-derived from scratch by an agent that did not
write the fix, using instruments that import none of the fixer's tooling. Where my numbers differ from
the fix agent's, both are stated and the difference is explained.

---

## 1. THE ANSWER: why couldn't the 38 be like the 8?

**Because the format spec contradicted itself, and the authors believed the example instead of the prose.**

`TOPIC_MARKDOWN_FORMAT.md:238` says System-Map stages are a bullet list. The worked example **in that same
section**, at `:251-253`, writes them as plain lines:

```
Producers: emit events
```

All 38 authors copied the example. markdown-it merges adjacent plain lines into **one paragraph**, so a
parser that matched a `Task:` / `Senior:` / `-> ` prefix and then did `raw.slice()` swallowed every line
beneath it into the first field. The stage list was never a bullet list, so `parse_md.mjs` never saw a
stage — and said nothing.

**Three of the spec's twelve worked examples did not survive the parser that documents them.** That is the
whole root cause. It is an ENGINEERING failure end to end: the renderer could always draw full depth (the 8
prove it), and the markdown format could always express it (proved below) — only the compiler could not
carry it across.

**The corroborating smoking gun is confirmed.** The old gate reported 19/19 green while the compiler
destroyed 608 authored items per build, because *no test compared what the author wrote against what the
parser kept*:
- `prove_md.mjs` parsed a fixture containing **5 of 14 sections** — no `## System`, no `## Drill`, no `## Bank`.
  Its coverage was drawn around the parser's working subset, so it could not fail on a dropped stage.
- `prove_emit.mjs` round-tripped the parser against **itself** (`emit(parse(x))` vs `parse(x)`). A parser that
  drops a field drops it on both sides of the equals sign. Always green.
- `prove_assembly.mjs` tested `parse.mjs`, the `.topic` parser. **Zero `.topic` files ship.** 28 assertions on a
  dead code path.

---

## 2. WHAT ENGINEERING ALONE RECOVERED

**608 items, on zero new authored content.** I reproduced this independently by running the pre-fix parser
(`d4788d1^`) and the post-fix parser over the same 38 `.md` files with one set of slice definitions.

| collection | THE 8 | 38 before | 38 after | parity was → now | recovered |
|---|---|---|---|---|---|
| sys.stages | 6.0 | 0.0 | 5.0 | 0% → 83% | **+189** |
| sys.stageCur | 1.0 | 0.0 | 1.0 | 0% → 100% | **+38** |
| sys.pivotAnswers | 7.0 | 0.0 | 2.0 | 0% → 29% | **+76** |
| drill.tierNotes | 4.0 | 0.0 | 3.0 | 0% → 75% | **+114** |
| bank.beatModels | 13.0 | 1.0 | 3.0 | 8% → 23% | **+76** |
| bank.beatInts | 13.0 | 0.0 | 2.0 | 0% → 15% | **+76** |
| bank.curveThemes | 8.0 | 0.0 | 1.0 | 0% → 13% | **+38** |
| walk.codeBlocks | 4.1 | 1.4 | 1.4 | 34% | **+1** |
| **TOTAL (per topic)** | **303.9** | **54.4** | **70.4** | **17.9% → 23.2%** | **+608** |

**Depth parity: 17.9% → 23.2%** (my metric) — **26% → 36%** (`topic_contract`'s metric, which the prior audit's
"28%" came from; I confirmed it prints `compiled-topic depth 26% of the spec` when run against the old parser).

Both are honest; they differ only in aggregation. Mine is a ratio-of-sums across **24** slices, so it is dragged
down hard by the enormous slices where the 38 have *literally nothing* (`drill.follows` 41.9 vs 0;
`model.beats` 62 vs 6; `drill.senior` and `drill.speak` 21.6 vs 0). **The +608 item count is identical under
both, and it is the load-bearing number.** Use 26% → 36% to compare against the prior audit; use ~18% → ~23%
if you want the number that counts every slice the 8 have.

**The recovered content reaches a reader.** Verified in the real built app, real Shadow DOM, all 46 topics
(`_audit/2026-07-11-compiler-parity/skeptic_browser_proof.cjs`):

- **System Maps: 0/38 empty** (was 38/38). **189 stages painted**, "you are here" on 38/38.
- **Literal `undefined`: 0 occurrences** across 46 topics × 9 panes (was 3 sites; `drill/logic.js` read
  `tierNotes.all` unguarded — a key the doc's own example omits).
- **Cross-topic jumps: 46 buttons, 46 land on the topic the chip names, 0 mis-navigations.** The old fused chip
  carried the *answer's* prose, so `resolveChipTarget`'s title fallback matched topics merely *mentioned* in the
  answer. Clean chips, correct jumps.
- **Pivot bodies left blank by a chip that swallowed its answer: 0.**
- **Mock Run: live beat count == authored beat count on all 46.**
- **0 console errors, 0 page errors.**

**THE 8 DID NOT REGRESS.** `git diff master..compiler-parity` over the 8's data directories is **empty** —
byte-identical. In the browser: 48 stages painted, 0 empty maps, 0 `undefined`, coaching rail correct 8/8,
0 console errors.

---

## 3. WHAT REMAINS — AND IT IS GENUINELY AUTHORING (with one exception)

I did not take this on faith. Two independent proofs:

**(a) The content was never written.** Zero `Follow:`, `Senior:`, `Speak:` lines exist in **any** of the 38 `.md`
files. The 8 carry **173 of each**. These slices are empty because nobody typed them — not because anything
dropped them.

**(b) The format is not the ceiling.** I authored a topic *using those exact fields* and parsed it. All of them
populate: 2 follow-ups with answers, `senior`, `speak`, and the `all` tier note. **`FORMAT CEILING: none`.**
So the markdown format can express everything the JS schema holds; the gap is content, not capability.

The honest remaining authoring gap, per topic: `drill.follows` 0 vs 41.9 · `drill.senior` 0 vs 21.6 ·
`drill.speak` 0 vs 21.6 · `model.beats` 6 vs 62 · `model.answers` 2 vs 9 · `identity.cmpNotes` 2 vs 9 ·
`bank.curveballs` 1 vs 8 · `walk.steps` 4 vs 9. **Closing it is writing, not engineering.**

### THE EXCEPTION — a live defect that is NOT authoring, and is NOT fixed

> **The coaching rail still shows another topic's note on ~64% of pane-topic combinations.**

`src/scripts/app/shell.js:237`

```js
if (TOPIC_CMP_NOTES[tab]) {
  ... write the rail ...
}                                  // <-- no else
```

If the current topic has no companion note for the active pane, **the rail is never rewritten — it keeps the
previous topic's note on screen.** The 38 author 2 companion notes out of 9 panes, so **7 of 9 panes leak**:
38 × 7 = **266 of 414 pane-topic combos = 64.3%**, which matches the original audit's "leaking another topic's
on 64%" *exactly*. It was never fixed.

Reproduced cold, in the shipped build (`skeptic_rail_leak.cjs`, screenshot
`shots/proof/caching__sys.png`): while the header reads **Caching Strategies**, the rail reads

> *THIS VIEW — System Map: Zoom out: **IaC** sits between declared infrastructure and provisioned reality…*
> *THE MOVE HERE: …config is intent, state is the record, the cloud is reality; plan diffs them.*

That is **IaC's** coaching note, displayed on the caching topic. On the **Drill** pane — one of the two panes
caching *does* author — the same rail is correct. The diagnosis is exact.

**Why this is engineering, not authoring:** the *trigger* is the authoring gap (2/9 notes), but the *defect* is
that the renderer shows **another topic's content** rather than nothing. Wrong information is strictly worse
than absent information. Even with zero authored notes, correct code would clear the rail. **This one is a
missing `else`.** The gate does not catch it, and neither does the parity ratchet — both reason about *data*,
and this is a *stale-DOM* bug.

---

## 4. THE REGRESSION GUARD — and the proof it has teeth

The old apparatus was self-confirming. The new one is not, and I proved it the only way that counts:
**I put the old parser back and ran the new gate.**

| | old parser | fixed parser |
|---|---|---|
| **old gate** | **PASS 19/19** ← while destroying 608 items | — |
| **new gate** | **FAIL** — `compiler_conservation`, `compiler_doc_examples`, `compiler_md` (7 fail), `build_integrity` | **PASS 21/21** |

Run standalone against the old-parser build, `topic_contract` fails with **114 BACKSLIDES**
(`event-driven: sys.stages 5 -> 0`). **The disease can no longer ship green.**

What makes it un-gameable:

- **`prove_conservation.mjs`** — the reference is *the author's raw bytes*: a plain line scanner that imports
  neither markdown-it nor the parser. Four laws: COUNT (drops), SURVIVAL (annihilation), FUSION (merge
  corruption), VALUE (misfiling). To make it pass you must fix the parser or delete the author's content, and
  the latter shows up in the diff as content deletion.
- **`prove_doc_examples.mjs`** — the reference is *the spec's own worked examples*. 12/12 must survive the parser
  that documents them. This is what would have caught the original bug on day one.
- **`parity_debt.json`** — a **ratchet**, verified to bite: a new shortfall fails (`:295`), a backslide below the
  recorded count fails (`:296`), and an entry that reaches parity must be **deleted** (`:299`). It can only shrink.
  684 entries = 38 topics × 18 collections, seeded *after* conservation was green (so it could not launder a
  compiler bug into "accepted debt").

**I verified `scanSource` is genuinely independent** — the one way this could still have been self-confirming is
if the parser and the reference were blind to the *same* construct. So I wrote a third instrument of a different
shape (`skeptic_every_line.mjs`): it fingerprints **every authored line** of all 38 files, making no structural
assumption, and asks only "does this text exist anywhere in the output?"

- **fixed parser: 5,645 lines judged, 0 lost.**
- **calibration — old parser: 130 lines annihilated.** (An instrument that cannot fail proves nothing. It fails
  on the old parser, and it converges on the same 130 that LAW 2 reports from a completely different direction.)

### One nuance on "fail-loud"

The claim "18/18 unplaceable inputs throw; 0 discard in silence" is *almost* right. A `q` and `a` authored on
**adjacent lines** (one markdown paragraph) still fuses silently — `q` swallows both, `a` becomes `""`, and no
`fail()` fires. LAW 3 cannot see it either, because markdown-it joins those lines with a **space**, not a newline.

This is **not** a shipping hole: the parser genuinely *cannot* distinguish that from a legitimately soft-wrapped
question, and `validateTopic` **throws on the empty answer**, failing the build. So fail-loud is real — but it is
delivered by **parser + schema together**, not by the parser alone. Worth knowing before someone "simplifies"
the schema validator.

---

## 5. BOTTOM LINE

- The compiler was a **ceiling**, not an enabler. It is now **lossless**, and that is enforced by references it
  cannot influence. **Confirmed.**
- **+608 items recovered by engineering alone**, no content authored. **Confirmed, independently reproduced.**
- Parity **26% → 36%** (prior-audit metric) / **17.9% → 23.2%** (all-slice metric). The gap did not close, because
  **most of what's missing was never written.** That is now *proved*, not asserted.
- **The gate is no longer self-confirming.** Proved by re-running it against the old parser.
- **One live defect remains, and it is engineering, not authoring:** the coaching rail leaks another topic's note
  on 64% of pane-topic combos. `shell.js:237`, a missing `else`. **Not fixed. Not caught by the gate.**

### Evidence

All instruments are the verifier's own and import none of the fixer's tooling:

| file | what it proves |
|---|---|
| `_audit/2026-07-11-compiler-parity/skeptic_every_line.mjs` | no authored line vanishes (calibrated: fails on the old parser) |
| `_audit/2026-07-11-compiler-parity/skeptic_before_after.mjs` | one metric, both parsers → +608, 17.9% → 23.2% |
| `_audit/2026-07-11-compiler-parity/skeptic_measure.cjs` | per-slice depth parity in the built app, via `TopicRegistry` |
| `_audit/2026-07-11-compiler-parity/skeptic_browser_proof.cjs` | all 6 defects, all 46 topics, real Shadow DOM |
| `_audit/2026-07-11-compiler-parity/skeptic_rail_leak.cjs` | the rail leak, reproduced cold |
| `_audit/2026-07-11-compiler-parity/shots/proof/` | screenshots (`caching__sys.png` shows the fix *and* the leak) |
