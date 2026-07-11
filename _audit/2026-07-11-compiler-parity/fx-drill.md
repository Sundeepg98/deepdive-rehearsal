# FX-DRILL — Drill pane parity: the 38 vs the 8

**Lens:** drill cards, follow-up probes, tier notes, must-hit points.
**Verdict:** the thesis holds. The renderer is fully capable; the compiler cannot feed it.
Of the drill pane's 5 authored dimensions, the 38 are at parity on **1** (cards) and at **zero** on **4**.

The prior audit's headline claim — *"Follow: already parses, so it's an AUTHORING gap, not schema
work"* — is **half right and materially misleading**. `Follow:` does parse. But the two fields
printed beside it in the format doc's own example (`Senior:` / `Speak:`) are **corrupted by the
parser when authored exactly as the doc prints them**, and the tier notes in that same example are
**silently discarded**. The authoring gap cannot be closed against the doc as written. That is an
engineering defect, not an authoring one.

---

## 0. The reference spec — the 8, executed (not regex-counted)

`node vm`-loaded `src/topics/<t>/drill.js` for all 8:

| topic | cards | follow-ups | senior | speak | tierNotes keys |
|---|---|---|---|---|---|
| content-pipeline | 22 | 46 | 22 | 22 | all/SDE2/SDE3/Staff |
| signing | 21 | 40 | 21 | 21 | all/SDE2/SDE3/Staff |
| authz | 24 | 42 | 24 | 24 | all/SDE2/SDE3/Staff |
| aws-hardening | 21 | 42 | 21 | 21 | all/SDE2/SDE3/Staff |
| notifications | 21 | 42 | 21 | 21 | all/SDE2/SDE3/Staff |
| eav | 21 | 39 | 21 | 21 | all/SDE2/SDE3/Staff |
| desired-state | 21 | 41 | 21 | 21 | all/SDE2/SDE3/Staff |
| iac | 22 | 43 | 22 | 22 | all/SDE2/SDE3/Staff |
| **TOTAL** | **173** | **335** | **173** | **173** | **32** |

Every one of the 173 cards has **≥1 follow-up** (100%), a senior tell, and a speak line.
Mean 1.94 follow-ups/card, max 3.

> **Correction to the brief.** The brief states the 8 have *"798 follow-up probes."* They have
> **335**. `798` is the **card count of the 38**. The prior audit conflated the two columns.
> `173 (the 8) + 798 (the 38) = 971` — which is the brief's "971 drill cards" total. Numbers below
> are executed, not estimated.

**Card schema (the spec):** `{ tier, signal, q, a, f:[{q,a}], senior }` + parallel `speak[]` +
`tierNotes:{all,SDE2,SDE3,Staff}`.

## 1. What the 38 actually get

Parsed from `src/topics/_generated/<t>/drill.js` (all 38):

| field | the 8 | the 38 | attribution |
|---|---|---|---|
| `drill.cards` | 173 | **798** | **OK** — at parity (and the only slice the gate counts) |
| `card.f` (follow-ups) | 335 | **0** | AUTHORING_GAP — *but blocked by a parser bug; see §3* |
| `card.senior` | 173 | **0** | AUTHORING_GAP — *ditto* |
| `speak[]` | 173 | **0** | AUTHORING_GAP — *ditto* |
| `tierNotes` | 32 keys | **0 — `{}` in all 38** | **PARSER_BUG — 114 authored items dropped** |
| must-hit points | 580 (3% cards empty) | 2476 (**30%** cards empty) | knock-on of the `senior` gap |

---

## 2. PARSER_BUG — 114 tier-notes authored, 114 dropped

### The content IS in the markdown

`src/topics-md/idempotency.md`, immediately under `## Drill`:

```
## Drill

SDE2 | the model and the mechanics
SDE3 | keys, dedup, and consumers
Staff | exactly-once, scale, and atomicity

### SDE2 | what idempotency is
```

Measured across all 38 files: **114 tier-note lines** (38 × 3). **0 in bullet form. 114 in
plain-line form.** `114` is exactly the prior audit's dropped count — fully accounted for.

### The parser line that discards them

`tools/compiler/parse_md.mjs:342`
```js
if (t.type === 'bullet_list_open' && !seenCard) {
```
Tier notes are only read from a **`bullet_list`**. The authored plain lines lex as a single
`paragraph_open` token, which is then gated at:

`tools/compiler/parse_md.mjs:350`
```js
if (t.type === 'paragraph_open' && card) {
```
Before the first `###`, `card === null` → the guard fails → **the paragraph matches no branch and
is dropped on the floor.** No warning, no error, no build failure.

### The doc's own example is un-compilable by the doc's own parser

`tools/compiler/TOPIC_MARKDOWN_FORMAT.md:181` (prose) says:
> "Optional tier-note **bullets** first (`<tier> | <note>`)"

`tools/compiler/TOPIC_MARKDOWN_FORMAT.md:188-190` (the worked example an author copies) shows:
```
    SDE2 | baseline mechanics
    SDE3 | failure modes
    Staff | organizational leverage
```
**No bullets.** The example contradicts its own prose *and* the parser. The authors of the 38
copied the example — the only executable artifact in the doc — and lost 114 items.

### Reproduced (`_audit/2026-07-11-compiler-parity/proof-tiernote-drop.mjs`)

Feeding the format doc's example **verbatim** into the project's own `parseMarkdown`:

```
=== DOC EXAMPLE (verbatim -- plain lines) ===
  tierNotes : {}                              <-- DROPPED
=== SAME, tier notes rewritten as BULLETS ===
  tierNotes : {"SDE2":"baseline mechanics","SDE3":"failure modes","Staff":"organizational leverage"}
```

### Runtime consequence: the literal string `"undefined"` ships to users

`src/scripts/app/drill/logic.js:180`
```js
if (this._tiernote) this._tiernote.innerHTML = d.tierNotes.all;
```
`tierNotes` is `{}` → `.all` is `undefined` → `innerHTML = undefined` coerces to the **string
`"undefined"`**. Same at `logic.js:475` on every tier switch (`DRILL_TIER_NOTES[t] ||
DRILL_TIER_NOTES.all` — both undefined).

Confirmed in the built app (`dist/index.html`, Playwright, shadow-DOM pierced):

```
--- THE 8  (#content-pipeline/drill)   #tiernote: "<b>All four levels, mixed</b> — the way a real loop..."
--- THE 38 (#idempotency/drill)        #tiernote: "undefined"
--- THE 38 (#kafka-internals/drill)    #tiernote: "undefined"
```

**This is a user-visible P0 on 38 of 46 topics (83% of the app) that the 19/19 gate does not catch.**

### The fix is two lines, and one is not enough

1. `parse_md.mjs:342` — accept the plain-line form (split the pre-card paragraph on `\n`, take
   `<tier> | <note>` per line) **in addition to** the bullet list.
2. **Not sufficient alone:** `grep '^all |' src/topics-md/*.md` → **0**. No topic authors an `all`
   note, but the renderer's default view reads `tierNotes.all`. Either emit a default `all` in the
   compiler, or guard `logic.js:180`/`:475` (the template at `logic.js:22` already carries a sane
   default string). Without this, the `All` tier still renders `"undefined"` after the parser fix.

---

## 3. The `Follow:` claim, properly verified — and the landmine under it

**Is there follow-up-shaped content in the 38's markdown being dropped?** No.
`grep -ci '^follow:' src/topics-md/*.md` → **0 across all 38.** Same for `^Senior:` (0) and
`^Speak:` (0). Nothing is being dropped here; nothing was written.

**Does the syntax parse?** Yes — verified, not assumed. `parse_md.mjs:353` handles both the
same-line and next-paragraph answer forms, and my reproduction produced a correct
`f:[{q:"what makes the id deterministic?", a:"It is content-derived: hash(user, event, channel)."}]`.

**Is it documented?** Yes — `TOPIC_MARKDOWN_FORMAT.md:181-184` + worked example at `:198-202`.

**So it is a pure authoring gap?** **No.** Two things break that conclusion:

### 3a. LATENT PARSER BUG — `Senior:` swallows `Speak:` (the doc's own layout)

The format doc prints them on **consecutive lines** (`TOPIC_MARKDOWN_FORMAT.md:201-202`):
```
    Senior: name the delivery guarantee, not the queue.
    Speak: commit to an answer before revealing.
```
markdown-it joins consecutive lines into **one paragraph** with a softbreak. The handler at
`parse_md.mjs:354`:
```js
else if (sM) { card.senior = prose(raw.slice(sM[0].length)); expectFollowA = null; }
```
takes **everything** after `Senior: ` — including the newline and the entire `Speak:` line. Note
that the `Follow:` handler one line above (`:353`) *does* split on `\n` (`rest.indexOf('\n')`);
`Senior:` (`:354`) and `Speak:` (`:355`) do **not**. The parser is internally inconsistent.

Reproduced (`_audit/2026-07-11-compiler-parity/proof-senior-eats-speak.mjs`):
```
=== DOC FORM (consecutive lines, as printed at TOPIC_MARKDOWN_FORMAT.md:201-202)
  senior = "name the delivery guarantee, not the queue.\nSpeak: commit to an answer before revealing."
  speak  = ""
=== BLANK-LINE SEPARATED (2 paragraphs)
  senior = "name the delivery guarantee, not the queue."
  speak  = "commit to an answer before revealing."
```
An author following the doc gets the literal text **"Speak: commit to an answer before revealing."**
rendered *inside the senior tell* in the UI, and an empty speak line. **The remediation path for the
0-follow-up/0-senior/0-speak gap runs straight through this bug.** You cannot tell someone "just
author the fields" — authoring them per the documented layout produces corrupt output. Fix
`:354`/`:355` to split on `\n` like `:353` does.

### 3b. FORMAT/DX FAILURE — the spec is an orphan file

```
$ grep -rn "TOPIC_MARKDOWN_FORMAT" --exclude-dir=node_modules --exclude-dir=_audit .
(no results outside the file itself)
```
**Nothing in the repo references it** — not `README.md`, not `TOPIC_CONTRACT.md`, not the
`Makefile`, no `CONTRIBUTING`. It sits in `tools/compiler/`, beside the parser, not in `docs/`
(which contains only `CONTENT_AUDIT_2026-07-08.md`). An author would have to already know it exists.

And `TOPIC_CONTRACT.md:24` — the document that *is* discoverable — declares the card shape as
`{ tier, signal, q, a, f, senior }`, naming `f` and `senior` as part of the contract, while the
contract **test** never checks either (§4).

So: the machine documented the format in a file nobody is pointed to, printed an example that
silently drops one field and corrupts two others, and then the gate reported green. Calling the
resulting emptiness an "authoring failure" blames the author for the machine's behaviour.

---

## 4. Why the gate is green — the apparatus is shaped to pass

**`test/topic_contract.cjs`** — the only test touching drill:
```js
:53  var cards = (data.drill && Array.isArray(data.drill.cards)) ? data.drill.cards : null;
:54  if (!cards) { problems.push(id + ': drill.cards is not an array'); return; }
:55  if (cards.length < cfg.MIN_CARDS) problems.push(...);
```
It checks `drill.cards` length, and that each card has a `signal` and a `q`. It **never** references
`f`, `senior`, `speak`, or `tierNotes` — `grep -rn "tierNotes\|senior\|speak" test/` returns
**nothing**. The one slice it counts is the one slice at parity. That is not a coincidence; it is the
definition of a self-confirming gate.

**`compiler_md: data-equivalence 23 pass, 0 fail`** — `tools/compiler/prove_md.mjs`:
- loads exactly two hand-authored modules (`:6-7`): `notifications/identity.js`, `notifications/walk.js`
- asserts only `identity.*` (11 scalars + spine + 2 cmpNotes) and `walk.steps[0..1]`
- runs against **one** fixture: `tools/compiler/samples/notifications.md`

That fixture contains **five sections — Thesis, Sub, Spine, Companion Notes, Walk. There is no
`## Drill` in it at all.** `parseDrill` — 32 lines of parser feeding 798 cards across 38 topics —
has **zero** equivalence coverage. `compiler_assembly: 28 pass` (`prove_assembly.mjs`) asserts the
same two panes.

The 51 green assertions prove data-equivalence for **2 of 11 panes**. "0 fail" is vacuous for drill:
the suite cannot fail on a drill bug because it never looks at drill.

> **The name collision that hides it.** Both provers assert `identity.cmpNotes.drill`
> (`prove_md.mjs:18`, `prove_assembly.mjs:27`). That is the 3-string *companion-note blurb* for the
> drill pane — not `views.drill`. In the pass log it reads as drill coverage. It is not.

---

## 5. Must-hit points — the one thing that partly works, and why

`drill/logic.js:218-228` `_mustHit()` **derives** the checklist from the `<b>` tags already in
`card.a` + `card.senior`. It is not authored, so there is no md syntax for it — and it should have
been fully broken for the 38, since markdown-it renders `**bold**` to `<strong>`, not `<b>`.

It isn't, because `tools/compiler/prose.mjs:54` explicitly rewrites it:
```js
.replace(/<strong>/g, '<b>').replace(/<\/strong>/g, '</b>')
```
This is a genuine compiler success and the reason the 38 score at all.

But `_mustHit` reads **two** sources, and the 38 have `senior:""` on all 798 cards — so they lose
half the input:

| | cards | total points | avg/card | cards with an **empty** checklist |
|---|---|---|---|---|
| THE 8 | 173 | 580 | 3.4 | **5 (3%)** |
| THE 38 | 798 | 2476 | 3.1 | **243 (30%)** |

243 of the 38's cards render **no must-hit checklist at all** — so the Solid/Shaky/Missed
recommendation (`logic.js:231-243`, which drives the grade button highlight) is ungrounded on 30% of
them. Confirmed live: `#idempotency/drill` card 1 → **0** checkboxes; `#kafka-internals/drill`
card 1 → 9.

**Attribution: not a parser bug.** It is a direct knock-on of the `senior` gap — fixing `Senior:`
authoring lifts must-hit coverage for free. No schema work needed.

---

## 6. Runtime proof — the follow-up chain is the pane's engine, and it is dead

`drill/logic.js:246`
```js
const card = cards[this.di], maxStage = 1 + card.f.length;
```
`maxStage` **is** the reveal ladder. With `f: []`, `maxStage === 1`: reveal the answer and the
"↳ Interviewer pushes further" button (`:264-266`) **never renders**. The senior block and speak
line (`:259-261`) draw as empty shells — headings with no body.

Measured on the built app (shadow-DOM pierced; `_audit/2026-07-11-compiler-parity/runtime-drill2.cjs`):

```
--- THE 8  (#content-pipeline/drill)
   advance clicks     : 3      (= 1 + 2 follow-ups)
   .fu follow blocks  : 2
   .senior body       : "Saying memory is constant <b>because of backpressu..."
   .speak  body       : "Open with the headline: <b>'I'd stream it with a s..."
   must-hit checkboxes: 2

--- THE 38 (#idempotency/drill)
   advance clicks     : 1      <-- reveal only; the push button never appears
   .fu follow blocks  : 0
   .senior body       : ""
   .speak  body       : ""
   must-hit checkboxes: 0
```

The drill pane's whole premise — *the interviewer pushes back* — does not exist on 38 of 46 topics.
The gate counts 798 cards and calls it parity.

---

## 7. Fix list (drill lens), ordered

| # | fix | file:line | recovers | effort |
|---|---|---|---|---|
| 1 | Accept plain-line tier notes (split pre-card paragraph on `\n`), keep bullets working | `parse_md.mjs:342` | **114 tier-notes** | **S** |
| 2 | Default `tierNotes.all` (emitter) **or** guard the renderer — else `All` still shows `"undefined"` | `parse_md.mjs` / `drill/logic.js:180,475` | kills a user-visible `"undefined"` on **38 topics** | **S** |
| 3 | Split `Senior:`/`Speak:` on `\n` as `Follow:` already does — unblocks authoring | `parse_md.mjs:354-355` | 0 today; **blocks** fixes 4–5 | **S** |
| 4 | Author `Follow:` ×2 per card | `src/topics-md/*.md` | ~**1,550** follow-ups (to 1.94/card) | **XL** |
| 5 | Author `Senior:` + `Speak:` per card | `src/topics-md/*.md` | **798** + **798**; also lifts must-hit 30%→~3% empty | **XL** |
| 6 | Assert `f`/`senior`/`speak`/`tierNotes` in the contract test; add a `## Drill` to the equivalence fixture | `test/topic_contract.cjs:55`, `tools/compiler/samples/notifications.md` | stops the gate lying | **M** |
| 7 | Fix the doc example (bullets or plain, consistent with the parser); link it from `README`/`TOPIC_CONTRACT.md` | `TOPIC_MARKDOWN_FORMAT.md:181,188-190,201-202` | prevents recurrence | **S** |

Fixes 1–3 are **~10 lines of parser** and must land **before** 4–5, or the authoring work is written
against a format that corrupts it.

---

## Attribution summary

- **PARSER_BUG (active, 114 items):** `tierNotes` — authored in plain-line form (the form the doc's
  own example demonstrates), discarded at `parse_md.mjs:342`. Ships `"undefined"` to users.
- **PARSER_BUG (latent, blocks 1,600+ items):** `Senior:` swallows `Speak:` at `parse_md.mjs:354`
  when authored per `TOPIC_MARKDOWN_FORMAT.md:201-202`.
- **AUTHORING_GAP (2,350+ items) — with a FORMAT/DX failure underneath:** `f` / `senior` / `speak`
  parse correctly and are documented, but the spec is referenced by **nothing** in the repo and its
  worked example is defective. Nobody was told how to write it, and the one example provided is
  broken.
- **OK:** `drill.cards` (798, at parity); `<b>`-preservation via `prose.mjs:54`.
- **Knock-on:** must-hit points — 30% of the 38's cards score with an empty checklist vs 3% for
  the 8, purely because `senior` is empty.
