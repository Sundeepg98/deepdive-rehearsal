# Lens FX — The Remaining Panes: wb · rf · trade · open · num

**Date:** 2026-07-11
**Scope:** whiteboard (`wb`), red flags (`rf`), trade-offs (`trade`), opener (`open`), numbers (`num`)
**Reference spec:** the hand-coded 8 (`src/topics/<id>/{wb,rf,trade,open,num}.js`)
**Subject:** the compiled 38 (`src/topics/_generated/<id>/…`, from `src/topics-md/*.md`)

---

## VERDICT: for these five panes, the thesis does NOT hold. And the truth is worse.

The brief's thesis is *"the compiler was meant to be an ENABLER; it is acting as a CEILING."*
I tried hard to confirm that for my five panes. **It is false here — provably.**

I ran the real parser (`tools/compiler/parse_md.mjs`) over all 38 markdown files and diffed every
authored unit against the parser's output. Across my five panes:

| unit | authored in the 38 `.md` | survived into the emitted JS | dropped |
|---|---|---|---|
| whiteboard cues | 76 | 76 | **0** |
| whiteboard `Foot:` | 0 | 0 | **0** |
| red-flag cards | 114 | 114 | **0** |
| red-flag `Note:` | 8 | 8 | **0** |
| trade decisions | 114 | 114 | **0** |
| trade option bullets | 232 | 232 | **0** |
| opener cards | 38 | 38 | **0** |
| opener items | 76 | 76 | **0** |
| numbers inputs | 114 | 114 | **0** |
| numbers lead/tell paragraphs | 76 | 76 | **0** |

*(reproduce: `node _audit/2026-07-11-compiler-parity/drop-detect.mjs`)*

**Zero drops.** Every field the hand-coded JS schema can express has a working markdown syntax, and
every item the authors wrote made it through. The `sys`/`drill` panes have the 380-item drop the prior
audit found; **my five panes have none of it.**

So why are they at ~30% depth? **Because the markdown is thin.** The 38 were authored thin — and
nothing in the system was capable of noticing.

That is the engineering failure, and it is not in the parser. It is in the **contract**.

---

## THE REAL DEFECT: the schema and the gate have a population floor for `drill` and for nothing else

### The template signature

Every single one of the 38 has **identical** counts. Not "similar" — identical:

| pane field | THE 8 (spec) | THE 38 | ratio | variance across the 38 |
|---|---|---|---|---|
| `wb.steps` | **9** (all 8) | **2** (all 38) | 22% | none — every topic is exactly 2 |
| `wb.foot` | 9/9 populated | **0/38** — `""` | 0% | none — every topic is empty |
| `rf.flags` | **9** (all 8) | **3** (all 38) | 33% | none — every topic is exactly 3 |
| `trade.decisions` | **7** (all 8) | **3** (all 38) | 43% | none — every topic is exactly 3 |
| `open.cards` | **2** (open + close) | **1** (open only) | 50% | none — **zero close cards in all 38** |
| `open.items` | **5** | **2** | 40% | none |
| `num.inputs` | **4** | **3** | 75% | none |
| `num` metric rows | **6** | **5** | 83% | none |

Human authors produce variance. This is a **generator template with a fixed cap per pane.** The
uniformity is the fingerprint.

### Why nothing caught it — layer 1: the compile-time schema

`tools/compiler/topic-schema.mjs:61-66`:

```js
// Top-level view fields the app renders with .map -- if absent they throw.
const NEED_ARRAY = [
  ['walk', 'steps'], ['sys', 'stages'], ['sys', 'pivots'], ['model', 'selectors'],
  ['num', 'inputs'], ['rf', 'flags'], ['open', 'cards'],
  ['bank', 'mockBeats'], ['bank', 'curveballs'], ['bank', 'frames'],
];
```

Two defects, both load-bearing:

1. **It checks shape, never population.** `topic-schema.mjs:80-84` runs only `Array.isArray(...)`.
   An **empty** array passes. A **one-element** array passes. The *only* `.min()` in the entire
   schema is `topic-schema.mjs:40` — `drill: cards.min(18)`.

2. **`wb.steps` and `trade.decisions` are not in the list at all** — even though the comment on
   line 61 says the list *is* "the fields the app renders with `.map` — if absent they throw", and:
   - `src/scripts/app/whiteboard.js:136` → `d.steps.map(...)`
   - `src/scripts/app/trade-offs.js:48` → `d.decisions.map(tradeRenderDec).join('')`

   `trade.decisions` gets only a *guarded* check (`topic-schema.mjs:85`:
   `if (v.trade && Array.isArray(v.trade.decisions))`) — the guard **skips itself** when the field
   is missing, which is precisely the case it exists to catch.

**Proved, not asserted** (`node _audit/2026-07-11-compiler-parity/schema-hole.mjs`):

```
*** VALIDATOR PASSED A HOLLOW TOPIC ***
    wb.steps        : MISSING ENTIRELY  -> accepted
    trade.decisions : MISSING ENTIRELY  -> accepted
    rf.flags        : []                -> accepted
    open.cards      : []                -> accepted
    num.inputs      : []                -> accepted

--- consequence: whiteboard.js:136 renderTopic does `d.steps.map(...)` ---
    runtime: TypeError: Cannot read properties of undefined (reading 'map')
             <-- would throw on first tab click
```

The schema's own header comment (`topic-schema.mjs:55-56`) states its purpose: *"a missing one
compiles clean and only throws when its tab is first clicked."* **That is the exact failure it
fails to prevent for the two panes it forgot to list.**

### Why nothing caught it — layer 2: the post-build gate

`test/topic_contract.cjs:51`:

```js
cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(id + ': missing "' + v + '" slice'); });
```

Truthiness. `{steps: []}` is truthy. `{steps: [a, b]}` is truthy. Both pass.

Then `topic_contract.cjs:53-64` gives `drill` a full contract: `MIN_CARDS: 18`, `MIN_PER_CORE: 3`,
per-card `signal` and `q` presence. The `CFG` block (`topic_contract.cjs:22-29`) contains
**exactly two population constants — `MIN_CARDS` and `MIN_PER_CORE` — and both are drill's.**

There is no `MIN_WB_STEPS`, no `MIN_RF_FLAGS`, no `MIN_TRADE_DECISIONS`, no `MIN_OPEN_CARDS`,
no `MIN_NUM_ROWS`.

**The asymmetry is the bug: `drill` is contracted for DEPTH. The other nine panes are contracted
for EXISTENCE.** A 2-cue whiteboard is, to this project, indistinguishable from a 9-cue one.

The compiler is not a ceiling. It is a **sieve with no mesh** — it faithfully passes whatever it is
handed, including almost nothing, and reports 19/19 green.

---

## Per-pane findings

### `wb` — whiteboard (the verdict checklist)

**Spec** (`src/topics/content-pipeline/wb.js:6-30`):
`{ steps:[{c,a}]×9, diagram, foot, sub, okVerdict }`

The pane is a *reconstruct-from-blank* drill: each `step` is a cue you answer from memory, then
self-grade (Reveal / Drew it / Missed — `whiteboard.js:112-128`). `okVerdict` is the reward text
shown only at **all-cues-recalled, zero-missed** (`whiteboard.js:153-155`).

| field | THE 8 | THE 38 | attribution |
|---|---|---|---|
| `steps` | 9 | 2 | **AUTHORING_GAP** — 76 md cues → 76 parsed. Format supports any N. |
| `sub` | 9/9 | 38/38 | **OK** |
| `okVerdict` | 9/9 | 38/38 | **OK** |
| `diagram` | hand HTML (`.dgm-*`) | mermaid → SVG | **OK** — `parse_md.mjs:286` keeps any non-mermaid fence verbatim, so the `.dgm` form is authorable too. |
| `foot` | 9/9, ~200 chars | **0/38, `""`** | **AUTHORING_GAP** + renderer bug (below) |

**The 2-cue whiteboard defeats the pane's purpose.** A recall exercise with two cues is not a
recall exercise. `okVerdict` for idempotency still reads like a nine-cue reward
(`_generated/idempotency/wb.js`: *"the atomic key claim is the whole mechanism…"*) — the copy was
written for a depth the data doesn't have.

**Renderer bug — empty-but-decorated foot box.** `whiteboard.js:134` does
`this._foot.innerHTML = d.foot;` with no empty-guard. `.wb-foot` carries a 3px accent border-left,
13px padding and a gradient background (`whiteboard.js:75`). With `foot === ""` all 38 topics paint
an **empty, fully-decorated 26px box**. Measured live in the built app:

```
content-pipeline (hand)  .wb-foot -> { text: 184 chars, height: 64px }
idempotency (generated)  .wb-foot -> { text:   0 chars, height: 26px }   <-- empty decorated box
```
*(`node _audit/2026-07-11-compiler-parity/visual-check2.cjs`)*

### `rf` — red flags (the anti-patterns)

**Spec** (`src/topics/content-pipeline/rf.js:9-11`): `{ lead, flags:[{bad,note,tell,fix}]×9 }`

| field | THE 8 | THE 38 | attribution |
|---|---|---|---|
| `flags` | 9 | 3 | **AUTHORING_GAP** — 114 md → 114 parsed, 0 dropped |
| `bad`/`tell`/`fix` | populated | populated | **OK** — quality is genuinely good |
| `note` | 1 per topic (8/8) | 8/38 topics | **AUTHORING_GAP** (minor) — `parse_md.mjs:144` parses `Note:` correctly wherever it appears |
| `lead` | 9/9 | 38/38 | **OK** |

The 38's red flags are *well written* — the `bad`/`tell`/`fix` triads are sharp. There are simply
three of them where the spec has nine. This is the pane where the content quality most clearly
exceeds the content quantity.

### `trade` — trade-offs (the real alternatives)

**Spec** (`src/topics/content-pipeline/trade.js:5-7`):
`{ lead, decisions:[{q, opts:[{n,when}], tell}]×7 }`

| field | THE 8 | THE 38 | attribution |
|---|---|---|---|
| `decisions` | 7 | 3 | **AUTHORING_GAP** — 114 md → 114 parsed |
| `opts` **per decision** | ~2.1 | ~2.1 | **OK — genuine parity** |
| `opts[].when` | all populated | all populated | **OK** — 0 of 232 option bullets malformed |
| `tell` | 7/7 | 3/3 | **OK per decision** |
| `q` (` vs ` styling) | literal `<span class="vs">` | auto-wrapped by `parse_md.mjs:163` | **OK** |

**Important nuance: these ARE real alternatives, not a list.** Every one of the 232 option bullets
across the 38 parses into a complete `{n, when}` pair — a named option *and* the condition that
picks it. Each decision carries its `tell`. The *structure* of a senior trade-off answer is fully
intact. The 38 just have three decisions where the 8 have seven.

### `open` — opener (altitude)

**Spec** (`src/topics/content-pipeline/open.js:11-13`):
`{ cards: [ {kind:'open', k, t, lead, items:[{n,ht,a}]×2, hooks:{lead, items:[{q,d,tab}]×3}, foot},
            {kind:'close', …, items×3, hooks:null, foot} ] }`

| field | THE 8 | THE 38 | attribution |
|---|---|---|---|
| `cards` | 2 (**open + close**) | 1 (**open only**) | **AUTHORING_GAP** — see below |
| `items` | 5 total | 2 total | **AUTHORING_GAP** |
| `hooks.items` | 3 | **3** | **OK — full parity** |
| `foot` | 1 per card | 1 per card | **OK per card** |

**Zero of the 38 have a close card.** This is the single most consequential *missing capability* in
my five panes: the 8's close card ("Land it — how to close, don't trail off") is the
summarize / name-your-risks / hand-the-wheel-back move. The 38 teach candidates how to *open* an
interview and nothing about how to *end* one.

**And it is NOT a format gap.** The parser supports it — `parse_md.mjs:244`:

```js
card = { kind: cardIdx === 0 ? 'open' : 'close', … };
```

and `TOPIC_MARKDOWN_FORMAT.md:343` documents it: *"The first `### <k> | <t>` is the open card;
subsequent ones are close cards."*

**But the doc's own worked example (`TOPIC_MARKDOWN_FORMAT.md:348-365`) shows exactly ONE card** —
and all 38 authored exactly one. The example under-teaches the feature it documents one line above.
This is the same shape as the `sys` bug the prior audit found (the doc demonstrates a form the
authors then copied); here it produced an authoring gap rather than a parser drop, but the root
cause — *the example is the real spec* — is identical.

### `num` — NALSD compute — **the pane that is nearly at parity**

**Spec** (`src/topics/content-pipeline/num.js:10-31`):
`{ lead, tell, inputs:[{id,label,value,min,step}]×4, compute: fn(vals, fmt) → [{k,v,u,n,over}]×6 }`

The brief asked: *"the 8 have real computations. Do the 38? Does the markdown format even support a
compute expression?"*

**Yes and yes — emphatically.** This is the one place the compiler was designed as a true enabler
and it works:

- `TOPIC_MARKDOWN_FORMAT.md:294-303` documents a fenced **function expression**.
- `parse_md.mjs:387` captures the fence body verbatim into `compute`.
- The emitter writes it out as a **live JS function**, not a serialized string.
- `topic-schema.mjs:94-101` even validates it *is* a function expression, by `new Function`-ing it.
- `num/logic.js:119` calls `this._compute(vals, {n, tb})` and paints the returned rows.

All 38 ship a **real, executing compute function** with live arithmetic. I perturbed every input on
every topic and compared all four rendered fields (`k`,`v`,`u`,`n`) plus the `over` class:

| | THE 8 | THE 38 |
|---|---|---|
| topics with a real `compute` fn | 8/8 | **38/38** |
| **dead inputs** (a field the user can drag that changes nothing) | 0 / 32 | **0 / 114** |
| inputs per topic | 4 | 3 |
| metric rows per topic | 6 | 5 |
| **LIVE rows** (value moves with inputs) | 43/48 = **90%** | 127/190 = **67%** |
| **STATIC rows** (hardcoded, never move) | 5/48 = 10% | 63/190 = **33%** |

*(`node _audit/2026-07-11-compiler-parity/num-compute.mjs`)*

| field | attribution |
|---|---|
| `compute` (the escape hatch) | **OK — works exactly as designed** |
| `inputs` (4 → 3) | **AUTHORING_GAP** (mild) |
| metric rows (6 → 5) | **AUTHORING_GAP** (mild) |
| row *liveness* (90% → 67%) | **AUTHORING_GAP** (quality) |

**The one real weakness:** a third of the 38's metric rows are **editorial prose wearing a
calculator's clothes** — rows whose `v` is a hardcoded string that no input can move. e.g.
`_generated/idempotency/num.js`:

```js
{ k: 'The guarantee', v: 'exactly-once effect', u: 'from at-least-once', n: '…', over: false },
{ k: 'Atomicity',     v: 'key + effect',        u: 'one transaction',    n: '…', over: false },
```

These are *good sentences* — but they sit in the "What falls out" results table pretending to be
derived quantities. The 8 keep this to 10%; the 38 run it to 33%. `storage-engines` is the extreme:
**4 of its 5 rows never move**, so the pane presents three draggable inputs and a table that barely
responds.

Still — `num` is **~80% of parity**, not 28%. Any narrative that lumps it in with the 22%-depth
whiteboard is wrong.

---

## Attribution summary

| pane · field | THE 8 | THE 38 | attribution | items the compiler dropped |
|---|---|---|---|---|
| `wb.steps` | 9 | 2 | AUTHORING_GAP | 0 |
| `wb.foot` | 9/9 | 0/38 | AUTHORING_GAP (+ renderer bug) | 0 |
| `wb.sub`, `wb.okVerdict`, `wb.diagram` | ✓ | ✓ | **OK** | 0 |
| `rf.flags` | 9 | 3 | AUTHORING_GAP | 0 |
| `rf.flags[].note` | 8/8 | 8/38 | AUTHORING_GAP | 0 |
| `rf.lead`, `bad`/`tell`/`fix` | ✓ | ✓ | **OK** | 0 |
| `trade.decisions` | 7 | 3 | AUTHORING_GAP | 0 |
| `trade.opts` per decision | 2.1 | 2.1 | **OK** | 0 |
| `open.cards` (**close card**) | 2 | 1 | AUTHORING_GAP (doc example under-teaches) | 0 |
| `open.items` | 5 | 2 | AUTHORING_GAP | 0 |
| `open.hooks.items` | 3 | 3 | **OK** | 0 |
| `num.compute` | fn | fn | **OK** | 0 |
| `num.inputs` / rows / liveness | 4 / 6 / 90% | 3 / 5 / 67% | AUTHORING_GAP | 0 |

**PARSER_BUG count for these five panes: 0.
FORMAT_GAP count for these five panes: 0.**

---

## The fixes that matter

Ranked. The first is the only one that changes the *system*; the rest are content.

### 1. Give every pane a population floor — the missing mesh  (effort: **S**)

**`tools/compiler/topic-schema.mjs:62-66`** — add the two missing entries and convert the whole
list from a shape check to a floor:

```js
// current: presence-only, and wb/trade are missing entirely
const NEED_ARRAY = [ ['walk','steps'], ['sys','stages'], … ];

// fix: a MINIMUM per pane, with wb.steps + trade.decisions added
const NEED_ARRAY = [
  ['walk','steps',5], ['sys','stages',4], ['sys','pivots',2], ['model','selectors',2],
  ['num','inputs',3], ['rf','flags',6], ['open','cards',2],   // 2 == open + close
  ['wb','steps',6],   ['trade','decisions',5],                 // <-- ADDED (both are .map'd)
  ['bank','mockBeats',3], ['bank','curveballs',1], ['bank','frames',2],
];
```
and at `topic-schema.mjs:80-84` assert `arr.length >= min`, not just `Array.isArray(arr)`.

**`test/topic_contract.cjs:22-29 + :51`** — mirror it in `CFG` (`MIN_WB_STEPS`, `MIN_RF_FLAGS`,
`MIN_TRADE_DECISIONS`, `MIN_OPEN_CARDS`, `MIN_NUM_INPUTS`) and replace the `if (!data[v])`
truthiness check with the same length assertion.

This turns the depth gap from *invisible* into a **build failure that names the topic and the pane**
— exactly what `drill.min(18)` already does. It will (correctly) fail all 38 on the next build,
which is the point: it converts an unbounded content debt into an enumerated, closeable worklist.

### 2. Guard the empty foot  (effort: **S**)

**`src/scripts/app/whiteboard.js:134`**:
```js
this._foot.innerHTML = d.foot;                 // paints an empty decorated 26px box when foot === ''
this._foot.hidden = !d.foot;                   // <-- add
```
(Check the sibling panes for the same unguarded-empty pattern.)

### 3. Fix the doc example that taught the thin form  (effort: **S**)

**`tools/compiler/TOPIC_MARKDOWN_FORMAT.md:348-365`** — the Opener example shows one card while
line 343 documents two. Add the `### Land it | How to close` card to the example. The example *is*
the spec that authors actually follow; that is how all 38 lost their close card.

### 4. The content itself  (effort: **XL** — 38 topics)

Per topic: +7 wb cues, +1 wb `Foot:`, +6 rf flags, +4 trade decisions, +1 opener close card
(3 items + foot), +1 num input, and convert the static "prose rows" to derived quantities.
This is real authoring work — it cannot be recovered by a compiler fix, because **nothing was lost**.

---

## What this lens changes about the overall story

The brief's smoking gun — *"the gate reports 23 pass / 0 fail WHILE the compiler drops 380 items"* —
is real, but it is **two different diseases wearing one uniform**:

- In `sys` / `drill` / `model`: the parser **drops authored content**. The fixtures were written to
  match the buggy behaviour. → *the compiler is a ceiling.* **Fix the parser and the content returns.**
- In `wb` / `rf` / `trade` / `open` / `num`: the parser is **faithful**. Nothing is dropped. The
  contract simply has **no floor**, so thin content passes as readily as deep content.
  → *the compiler is a sieve with no mesh.* **No parser fix recovers a single item here.**

Both are failures of the verification apparatus, and both share the same root: **the project
contracts `drill` for depth and everything else for existence.** But the *remedies are disjoint*.
A parser fix ships ~380 items back into `sys`/`drill`. It ships **zero** into these five. Conflating
them would produce a compiler patch, a green gate, and five panes still at 30% — with the celebration
already over.

The honest headline for this lens: **the 38 aren't thin because the compiler couldn't carry the
content. They're thin because nobody ever had to write it.**
