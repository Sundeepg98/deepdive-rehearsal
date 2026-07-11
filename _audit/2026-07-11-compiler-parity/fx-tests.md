# LENS: WHY DID THE TESTS NOT CATCH THIS?

**Verdict: the verification apparatus never looked.** Not "looked and was fooled" — *never looked*.
Every green number in the gate is true. Each one measures something other than the thing that broke.

The gate is green because:

1. **No compiler test reads any of the 38.** All six `prove_*.mjs` read one toy fixture
   (`tools/compiler/samples/notifications.md`) and compare it to one hand-coded topic. `src/topics-md/`
   appears in **zero** of them.
2. **The toy fixture contains none of the sections that break.** It has 5 `##` sections; a real topic
   has 14. It has no `## System`, no `## Drill`, no `## Model Answers`, no `## Bank`. The parser
   functions that drop the 379 items are **never executed by any test**.
3. **`prove_emit` compares the parser's output to itself.** A round-trip cannot detect a drop.
4. **Both contract layers assert SHAPE, not POPULATION.** `[]` is an array; `{}` is truthy.
5. **The one collection anyone counts — `drill.cards` — is the one collection at parity (97%).**
   Everything unmeasured collapsed to 0–45%. This is not a coincidence. It is Goodhart's law with a
   file and a line number.

---

## 1. What the tests actually compare

| gate line | reads | compares against | verdict |
|---|---|---|---|
| `compiler_md` "23 pass" | `samples/notifications.md` (toy) | `src/topics/notifications/{identity,walk}.js` | reference is real, **fixture is a 5-section stub** |
| `compiler_assembly` "28 pass" | `samples/notifications.topic` (toy) | same 2 modules | same |
| `compiler_emit` "7 pass" | `samples/notifications.topic` | **`parseTopic()`'s own output** | **self-confirming by construction** |
| `compiler_prose` 3/3 | 3 inline strings | HTML literals lifted from `walk.js` | genuinely independent — but tests `prose()`, not the parse |
| `compiler_flow` 3/3 | 3 inline strings | ditto | ditto |
| `compiler_code` 3/3 | 3 inline strings | ditto | ditto |
| `topic_contract` "46 topics" | the built app | *nothing* — truthiness only | **`{}` passes** |

### Which topics do they cover?
`tools/compiler/prove_md.mjs:9`, `prove_assembly.mjs:12`, `prove_emit.mjs:6` — every one reads
`tools/compiler/samples/notifications.*`. **Not one line of any compiler proof touches `src/topics-md/`.**
The 38 have *zero* compiler-test coverage. Their only coverage is `topic_contract.cjs`, whose slice
check is truthiness.

### Is "byte-identical" asserted against parser output?
**No — and that is the one honest result in the suite.** I verified the `want` string in
`prove_prose.mjs:9` appears verbatim in the hand-coded `src/topics/notifications/walk.js`. Layers B and C
(`prose()`, `flow()`, `code()`) really are checked against an independent reference.

They are also **irrelevant to the failure**. They test *text transforms on a string you hand them*. The
drop happens one layer up, in **which tokens get collected into which slice** — a layer no byte-identical
test touches. Three green "byte-identical" lines create the impression the compiler is verified. They
verify the leaf functions and nothing above them.

### The fixture is the tell
`tools/compiler/samples/notifications.md` — the *entire* corpus of the compiler proofs:

    ## Thesis   ## Sub   ## Spine   ## Companion Notes   ## Walk        <- 5 sections

A real topic (`src/topics-md/idempotency.md`):

    ## Thesis  ## Sub  ## Spine  ## Companion Notes  ## Drill  ## Walk  ## Whiteboard
    ## System  ## Trade-offs  ## Model Answers  ## Numbers  ## Red Flags  ## Opener  ## Bank

`parseSys`, `parseDrill`, `parseModel`, `parseBank` — the four functions holding every dropped item —
are **dead code under test**. And `## Companion Notes` in the fixture contains exactly two `###` blocks
(`walk`, `drill`); `prove_md.mjs:17-18` asserts exactly those two:

```js
eq('identity.cmpNotes.walk',  out.identity.cmpNotes.walk,  g.ID.cmpNotes.walk);
eq('identity.cmpNotes.drill', out.identity.cmpNotes.drill, g.ID.cmpNotes.drill);
```

The hand-coded 8 carry **nine**. The test asserts precisely the two the pipeline produces and is silent
about the seven it does not. That is what a self-confirming fixture looks like.

---

## 2. The three self-confirming layers

**Layer 1 — compile time. `tools/compiler/topic-schema.mjs:63,81`** — the worst of the three, because it
*names the exact field* and then declines to check it:

```js
const NEED_ARRAY = [
  ['walk','steps'], ['sys','stages'], ['sys','pivots'], ...   // :63  <- sys.stages IS listed
];
for (const [pane, field] of NEED_ARRAY) {
  if (v[pane] != null && !Array.isArray(v[pane][field])) {     // :81  <- [] IS an array
```

Verified: `validateTopic(parseMarkdown(idempotency.md))` → **PASS**, with `sys.stages === []`.
The build-time validator watches the system map get emptied and signs off.

**Layer 2 — the proofs.** `prove_emit.mjs:17-18` is the purest case:

```js
const topic = parseTopic(fs.readFileSync('tools/compiler/samples/notifications.topic', ...));  // :6
check('walk round-trips', JSON.stringify(g.WALK) === JSON.stringify(topic.views.walk));        // :18
```

`topic` *is* the parser's output. If the parser drops an item, it is absent from `topic`, absent from the
emitted module, and the two sides agree. **This assertion cannot fail from a drop.** It is a real test of
the *emitter*; it is zero test of the *parser*, and the gate line "data-equivalence" invites the opposite reading.

**Layer 3 — post build. `test/topic_contract.cjs:52`:**

```js
cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(id + ': missing "' + v + '" slice'); });
```

`!data[v]` is truthiness. `{}` is truthy. `{stages: []}` is truthy. Ten slices are checked for
*existence*; one collection (`drill.cards`, `:55`) is checked for *population*. The gate prints
"all slices conform" over an empty system map.

**Every layer checks shape. No layer checks population.** Except `drill.cards` — at all three layers
(`topic-schema.mjs:40` `.min(18)`, `topic_contract.cjs:55` `MIN_CARDS`). And `drill.cards` is the only
collection at parity.

---

## 3. The measurement (`_audit/.../probe_parity.cjs`, from `TopicRegistry` in the built app)

| slice | THE 8 (avg/min) | THE 38 (avg/min) | ratio |
|---|---|---|---|
| **drill.cards** | 21.6 / 21 | 21.0 / 21 | **97%**  <- the only measured field |
| drill.follows | 41.9 / 39 | 0.0 / 0 | **0%** |
| drill.senior | 21.6 / 21 | 0.0 / 0 | **0%** |
| drill.speak | 21.6 / 21 | 0.0 / 0 | **0%** |
| drill.tierNotes | 4.0 / 4 | 0.0 / 0 | **0%** |
| sys.stages | 6.0 / 6 | 0.0 / 0 | **0%** |
| sys.pivotAnswers | 7.0 / 7 | 0.0 / 0 | **0%** |
| sys.pivots | 7.0 / 7 | 2.0 / 2 | 29% |
| model.answers | 9.0 / 9 | 2.0 / 2 | 22% |
| model.beats | 62.0 / 58 | 6.0 / 6 | 10% |
| identity.cmpNotes | 9.0 / 9 | 2.0 / 2 | 22% |
| wb.steps | 9.0 / 9 | 2.0 / 2 | 22% |
| curveballs | 8.0 / 8 | 1.0 / 1 | 13% |
| mock beats | 6.0 / 6 | 2.0 / 2 | 33% |
| rf.flags | 9.0 / 9 | 3.0 / 3 | 33% |
| trade.decisions | 7.0 / 7 | 3.0 / 3 | 43% |
| walk.steps | 9.0 / 9 | 4.0 / 4 | 45% |

One field is measured. One field is at parity. They are the same field.

---

## 4. Attribution — DROPPED vs NEVER WRITTEN

`_audit/.../prove_conservation.mjs` counts what the author wrote (line scan of the raw `.md`) against what
the parser emitted:

| collection | authored in .md | emitted | verdict |
|---|---|---|---|
| sysStages | **189** | 0 | **DROPPED 189** |
| tierNotes | **114** | 0 | **DROPPED 114** |
| pivotAnswers | **76** | 0 | **DROPPED 76** |
| drillCards | 798 | 798 | conserved |
| follows / seniors / speaks | 0 | 0 | never authored (parser supports them: `parse_md.mjs:353-355`) |

**379 items dropped**, plus **76 pivot chips corrupted**. The rest of the depth gap (model answers 2 vs 9,
cmpNotes 2 vs 9, …) is genuine authoring debt — those parse 1:1.

### The parser lines
- **`parse_md.mjs:203`** — `if (t.type === 'bullet_list_open' && mode === 'stages')`. Stages are read only
  from bullets. The authored form is plain lines → markdown-it emits `paragraph_open`/`inline`.
  It then falls through **`:219-228`**, where `mode === 'stages'` matches no branch and there is no `else`.
  Consumed, discarded, silent.
- **`parse_md.mjs:342`** + **`:350`** — tier notes: bullets only; and `if (t.type === 'paragraph_open' && card)`
  is false before the first card, so every leading plain line is dropped.
- **`parse_md.mjs:225`** — `if (m && !piv.chip) piv.chip = '→ ' + raw.slice(m[0].length);` — the chip
  line and the answer line are adjacent, so markdown-it makes them **one** paragraph. The chip swallows the
  whole answer; `piv.a` stays `''`. Not a drop — **corruption**. A 400-char answer is rendered inside a UI chip.

### The authors were not wrong — the docs told them to do this
`tools/compiler/TOPIC_MARKDOWN_FORMAT.md` — the project's own authoring spec — **demonstrates the plain-line
form the parser rejects**, in the same paragraphs whose prose says "bullets":

    :239  "the 'where it sits' stages: bullets `<n>: <d>`"     <- prose says bullets
    :249  ### Where it sits                                     <- the example shows NO bullets
    :251      Producers: emit events
    :252      Notification service: channels + delivery [*]

    :181  "Optional tier-note bullets first"                   <- prose says bullets
    :188      SDE2 | baseline mechanics                        <- the example shows NO bullets

    :261      -> at-least-once + idempotent                    <- chip and answer adjacent:
    :262      At-least-once from the queue; dedup makes it effectively once.   the parser glues them

Fed to the parser (`_audit/.../probe_doc_example.mjs`), **the format doc's own canonical example loses all
three**: `tierNotes = {}`, `stages = []`, `pivots[0].a = ""`. The doc contradicts itself; the parser
implemented the prose; the authors followed the example. And `TOPIC_MARKDOWN_FORMAT.md:416` even advertises
the weakness — *"the render-critical view arrays **are arrays** — `walk.steps`, `sys.stages`"*. Arrays.
Not populated.

---

## 5. THE FAILING TESTS (written, run, validated)

### 5a. `tools/compiler/prove_conservation.mjs` — the anti-self-confirming test
**The reference is the author's raw bytes**, counted by a line scanner that shares no code with the parser
(the parser walks markdown-it tokens; the scanner reads lines). A bug in one cannot mask the same bug in the
other, there is no fixture to write wrong, and it runs over **all 38**, not a sample.

> **CONSERVATION LAW: `authored(source-scan) == emitted(parseMarkdown)` for every collection.
> A deficit is a silent drop and fails the build, naming file, line and text.**

Validated red→green:

| parser | result |
|---|---|
| `tools/compiler/parse_md.mjs` (current) | **EXIT 1** — 379 dropped, 76 chips corrupted, with `file:line` per item |
| `parse_md.PARITY.mjs` (the fix) | **EXIT 0** — 189/114/76 all conserved, 0 corrupt |

This is the test the fix must turn green, and it does. The 379 items are **already written** — recovering
them is free.

### 5b. `test/topic_contract.cjs` — POPULATION, not truthiness
Drop-in replacement at `_audit/.../topic_contract.HARDENED.cjs`. Four changes:

1. **Count every render-critical collection** (19 probes) instead of `if (!data[v])`.
2. **The 8 are the spec, literally** — floors are derived from the hand-coded 8 **at runtime**
   (`floor[f] = ceil(min(the8[f]) * PARITY)`), so the bar cannot drift below the reference and there is no
   magic-number table to rot. Plus a guard: if a *reference* topic ever reads 0, the gate fails
   ("the spec itself is degraded") rather than silently lowering the bar for all 46.
3. **A slice that exists but is empty now fails** — "present but zero-population — renders a blank pane".
4. **Corruption probes**, not just counts — a chip carrying a newline or >120 chars is flagged at
   `parse_md.mjs:225`. Counting alone would never catch a populated-but-wrong field.
5. **A ratchet** (`parity_debt.json`): shortfalls are allowlisted per (topic, field); a *new* shortfall
   fails, a *fixed* one must be deleted ("stale debt"), a *worse* one fails ("backslide"). The number can
   only go down.

Run against the current build: **EXIT 1**, 18 fields below floor across exactly 38/46 topics, 152 contract
violations (76 swallowed chips + 76 missing pivot answers). `drill.cards` **does not appear** in the
shortfall table — the new instrument reproduces the Goodhart finding on its own.

### 5c. Close the remaining holes
- **`tools/compiler/topic-schema.mjs:62-84`** — replace `NEED_ARRAY` (`!Array.isArray`) with
  `NEED_POPULATED` carrying per-field minimums, so an empty system map **fails at the `.md`, at build time**,
  with the topic named — the fastest feedback loop, and where the authoring spec claims validation lives.
- **`tools/compiler/samples/notifications.md`** — promote the fixture to the **full 14-section** topic and
  extend `prove_md.mjs` to compare **all 10 views** against **all of `src/topics/notifications/*.js`**
  (it currently compares 2 of 12 modules). A fixture that omits the sections under test is not a fixture.
- **`prove_emit.mjs`** — keep it, but relabel. It proves *emitter* fidelity, not *parser* correctness. The
  gate line "data-equivalence" is what made a round-trip read as a verification.
- **Doc-example test** — machine-extract every example in `TOPIC_MARKDOWN_FORMAT.md` and assert it parses to
  a populated structure. This permanently kills the "docs demonstrate X, parser implements Y" divergence
  that caused the whole thing.

### 5d. Wiring (`test/check_all.py`, after line 59)
```python
('compiler_conservation', ['node', 'tools/compiler/prove_conservation.mjs']),
```
`topic_contract` is already wired (`check_all.py:67`); the hardened file is a drop-in replacement.

---

## 6. The one-line answer

The gate counted the one thing that was fine and asserted the existence — never the population — of
everything that was broken. `drill.cards`: measured, and at 97%. Everything else: unmeasured, and at 0–45%.
A test suite that reads a 5-section stub and round-trips the parser against itself will report
"23 pass, 28 pass, 3/3 byte-identical, 46 topics conform" forever, while 379 authored items are thrown away
on every build.

**Artifacts** (all under `D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-compiler-parity/`):
`prove_conservation.mjs` (the failing test; red on current, green on the fix) ·
`topic_contract.HARDENED.cjs` (drop-in population/parity gate) ·
`probe_parity.cjs` (the 8-vs-38 table) · `probe_attrib.mjs` (dropped vs never-written) ·
`probe_trace.mjs` (token-level proof) · `probe_doc_example.mjs` (the doc's own example fails).
