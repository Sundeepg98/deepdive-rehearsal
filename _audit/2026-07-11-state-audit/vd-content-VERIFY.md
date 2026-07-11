# Adversarial verification — `vd-content` lens

**Verdict: the lens's MEASUREMENTS are almost all sound. Its ROOT CAUSE and therefore
most of its FIX RECOMMENDATIONS are wrong — in the exact opposite direction.**

I independently re-extracted all 46 topics from the built `dist/index.html`, re-read every
cited file:line, drove the real UI with Playwright, and ran the real compiler against fixtures.

---

## Headline

The lens concluded:

> "the markdown authoring format **has no field** for the mechanics that make this an interview
> TRAINER… the signature of a **missing compiler field, not tired authors**."

**This is refuted.** `tools/compiler/parse_md.mjs` already parses `Follow:`, `Senior:`, `Speak:`,
`Task:`, `Int:`, `Foot:`, tierNotes and `sys.stages`; `tools/compiler/TOPIC_MARKDOWN_FORMAT.md`
:183-202 **documents them with worked examples**. Nothing is missing from the schema.

Worse — and this is the finding the lens inverted — **most of the "missing" content is already
written in the 38 markdown files and is being silently thrown away at build time.**

A shape-only reshape of the 38 `.md` files (adding `- ` list prefixes and one blank line — **zero
new words, zero compiler changes**) recovers:

| Field | shipped | after shape-only reshape |
|---|---|---|
| `sys.stages` | **0** | **189** authored stages (5/topic, `cur:true` markers intact) |
| `drill.tierNotes` | **0** | **114** authored tier notes (3/topic) |
| `sys.pivots[].a` | **0 / 76** | **76 / 76** authored pivot answers |

Repro: `node _audit/2026-07-11-state-audit/scripts/vfy-content-08-dataloss.mjs`

**Cause:** `parseSys` (parse_md.mjs:203) and `parseDrill` (:342) require a markdown
`bullet_list_open`. The authors wrote the **plain-line form that the compiler's own
TOPIC_MARKDOWN_FORMAT.md:238-248 and :187-190 show**. markdown-it parses those as a paragraph,
the parser's branch never fires, and it emits `[]` / `{}` — no error, no warning. Both gates are
blind to it (`topic_contract.cjs:52` `if (!data[v])`, and `topic-schema.mjs` `NEED_ARRAY` only
asserts *is-an-array*, so `[]` passes).

This flips the remediation from "author 38 topics of new content" (L/XL) to "fix a parser branch"
(S). The lens would have sent the operator to build a compiler feature that already ships, while
190 authored stages sat in the repo being deleted on every build.

---

## Finding-by-finding

### 1. `undefined` renders on screen — **CONFIRMED, and strengthened**

Not 2 sites. **Three.**

- **Drill tier-note.** `drill/logic.js:180` `this._tiernote.innerHTML = d.tierNotes.all`. With
  `tierNotes:{}` → `undefined` → innerHTML stringifies it. Measured live: `#tiernote`
  textContent `"undefined"`, box **414×19px**, `visibility:visible`, passes `elementFromPoint`.
  Pixel proof: `shots/vfy-content/CROP-tiernote-idempotency.png` (reads `undefined` in grey
  italic under the tier toggle). Control `signing` renders real prose in the same slot.
- **Mixed Fire curveball task.** `mixed-fire.js:18`. Drove the real tool to the Curveball item:
  `taskText === "undefined"`, on screen. `shots/vfy-content/CROP-mixfire-idempotency.png`.
- **Mock Run end screen (MISSED by the lens).** `mixed-fire.js:205`
  `'Curveball this run: <b>' + mockBeats[mockCurveIdx].theme + '</b>'` → renders
  `Curveball this run: undefined.` on **38/38** compiled topics, **0/8** originals.

Corpus sweep: exactly the 38 compiled topics affected, the 8 originals clean.
Note `document.body.innerText` does *not* contain "undefined" — the text lives inside shadow
roots. Any check that greps `body.innerText` will miss all three. Effort to guard: **S**.

### 2. Model Answers pane — **evidence CONFIRMED, diagnosis + fix REFUTED**

Confirmed: 9.0 vs 2.0 answers/topic; ~22× less prose (my measure: 18,211 vs 836 JSON chars —
the lens said 23.7×, same ballpark); idempotency's beats are verbatim the three fragments quoted,
incl. the unsayable *"what exactly-once actually means"*.

**Refuted:** the lens says to *"Extend the md schema to support beat-labelled prose scripts (the
originals' `{opener, sub, beats:[{l,c,t}]}` shape)"*, effort **XL**. That shape **already
compiles** — `src/topics/_generated/idempotency/model.js` emits `{selectors, answers:[{opener,
sub, beats:[{l,c,t}]}]}`, structurally identical to `src/topics/signing/model.js`. The md format
(`### selector | opener`, then `- Label | class | text`) already supports it and the third field
is free text. This is **pure authoring**, zero compiler work. XL → **L**.

### 3. `f:[]` on 798/798 cards — **evidence CONFIRMED, fix REFUTED**

Confirmed at the data layer (798/798 `f:[]`; originals carry 335 follow-ups) and in the live UI:
`idempotency` reveals with **0** `.fu` blocks and a single "Reveal answer" button; `signing` walks
`Reveal answer → ↳ Interviewer pushes further → ↳ Interviewer pushes further` with 2 `.fu` blocks.
`drill/logic.js:245` `maxStage = 1 + card.f.length` is exactly as cited.

**Refuted:** "Add a follow-up-probe block to the markdown drill card syntax" (XL). The syntax
**exists, is documented (TOPIC_MARKDOWN_FORMAT.md:183-184, 198-202) and parses today**. I fed the
real compiler a card carrying `Follow:`/`Senior:`/`Speak:` and got back
`f:[{q:"and what breaks if the retry lands twice?", a:"The charge is applied twice…"}]`,
a populated `senior`, and a populated `speak` — **with zero compiler changes**
(`scripts/vfy-content-07-compilerproof.mjs`). Authored in **0 / 38** files. XL → **L** (authoring).

### 4. Two labelled-but-empty boxes on 798 cards — **CONFIRMED**

Live, visible measurement on `idempotency`: `.senior` **662×46px, body length 0** (label "What
sounds senior here" renders over blank space, with border `1px solid rgb(191,224,212)`); `.speak`
**662×44px, body length 0** (background `rgb(239,237,250)`). Control `signing`: 82px/187 chars and
98px/272 chars. `drill/logic.js:258-261` unguarded exactly as cited. Effort **S**.

### 5. System Map + cross-links — **SPLIT: symptom confirmed, cause refuted; cross-links confirmed**

- `sys.stages:[]` in 38/38 — confirmed. **But the cause is not a missing schema field**: 189
  stages are authored and discarded (see Headline). Fix is a parser branch, **L → S**.
- Pivot `a:""` in 76/76 — confirmed, and likewise **authored-then-swallowed**: the parser globs the
  `-> chip` line and the answer line into one `chip` blob (parse_md.mjs:224-226) because the
  authors wrote them as adjacent lines. That is precisely why the chips overflow.
- **Cross-topic jump chips: 43 (originals, 8/8 topics) vs 0 (compiled, 0/38) — CONFIRMED exactly.**
  Originals use the `(N)` convention (`→ Tenant authorization (3)`, `→ Desired-state (7)`); no
  compiled chip carries an index or a topic title. This one *is* a genuine authoring gap.

### 6. The gate enforces presence, not the contract — **CONFIRMED, and strengthened**

Every line reference checks out (`topic_contract.cjs` :48-49 identity, :51 group, :52 truthiness,
:55 count, :59-60 tiers, :64-65 signal/q; `TOPIC_CONTRACT.md:24` declares `{tier,signal,q,a,f,senior}`).
Also: `dist/index.html` and the gate's default artifact `deepdive_content_pipeline_rehearsal.html`
are **byte-identical** (md5 `6fc92f15…`), so the gate really is testing the shipped bundle.

**Strengthened:** there is a *second* blind gate. `tools/compiler/topic-schema.mjs` `NEED_ARRAY`
includes `['sys','stages']` — but only asserts it *is an array*, so `[]` passes. Two independent
gates, both blind to emptiness. Effort **S**.

### 7. Drill answer length drift — **CONFIRMED, with one correction**

Exact matches: **187** cards >1200 chars corpus-wide; longest = **storage-engines card #20 at
3,088 chars**; `probabilistic-structures` 21/21 over 1200. Originals median 407 (lens: 401).

**Correction:** the lens calls the gradient *"clean monotonic by topic index"*. It is **not
monotonic** — it is a sawtooth. It climbs idx 9 (283) → idx 37 (1,644), then **resets hard at
idx 38 `debugging` (729)** and climbs again to idx 46 (2,054). Two batches, not one ramp. Also
**three** topics are 21/21 over 1200 (`probabilistic-structures`, `multi-region`,
`stream-batch-processing`), not one. The finding stands; the shape description doesn't.

### 8. NUM pane — **REFUTED**

> "storage-engines computes only 1 of 5 rows… four of five outputs are fixed strings: Workload
> mix='write-heavy', Engine lean='favor LSM'…"

**False. It computes 3 of 5.** `Workload mix` and `Engine lean` are *computed* — read the compiled
source: `var mix = wr > rd * 1.5 ? 'write-heavy' : (rd > wr * 1.5 ? 'read-heavy' : 'balanced')`.
They key off the **wr:rd ratio**. The lens's probe scaled *every input by the same 3.7×*, which
holds every ratio constant **by construction** — that perturbation *cannot* move a ratio-based row.
It then reported the non-movement as "fixed strings".

Re-measured with ratio-changing, one-at-a-time perturbations, diffing the whole row:

| | ORIG | MD |
|---|---|---|
| rows/topic | 6.00 | 5.00 |
| dynamic rows | **5.75** | **3.76** |
| storage-engines | — | **3 / 5** (not 1/5) |

Only `LSM write path` and `The trade` are genuinely constant — and those are the RUM-conjecture
explainer rows the lens itself calls "pedagogically defensible". The aggregate gap is real but
modest (MD ~75% dynamic vs ORIG ~96%), not "a slogan board where 80% of outputs ignore the inputs".
`circuit-breaker` is 3/5, not ≤2/5 as claimed. Downgrade **P2 → P3**.

### 9. Supporting-pane depth 2–8× thinner — **CONFIRMED exactly**

rf 9.0/3.0 · trade 7.0/3.0 · curveballs 8.0/1.0 · wb steps 9.0/2.0 · sys pivots 7.0/2.0.
`wb.foot:""` 38/38 confirmed (each md file's single `Foot:` line lives in `## Opener`, not
`## Whiteboard`). All reproduced independently.

### 10. Boilerplate lead-ins — **CONFIRMED exactly** (38/38, 38/38, 38/38, 29/38). Zero placeholders.

---

## What the lens MISSED

### M1 — Build-time data loss (P1, effort S) — *the real root cause*
189 stages + 114 tier notes + 76 pivot answers are authored in the md and silently discarded.
See Headline. This single parser fix lights up the System Map on 38 topics, kills the `undefined`
tier-note at its source, and un-globs every pivot chip.

### M2 — Mock Run is a 2-beat stub, scored out of 6 (P1, effort M)
Compiled topics author only `### SCALE` and `### DESIGN` in `## Bank` (38/38). The originals carry
six: `FRAME, STRUCTURE, SCALE, FAILURE, CURVEBALL, CLOSE`. So:
- `mixed-fire.js:163` renders **"Beat 1 / 2"** (verified live) instead of 1 / 6.
- The verdict at `mixed-fire.js:222-224` is hard-coded against **6**:
  `if (score >= 6) 'Six for six.'` … `else '<b>' + score + ' / 6.</b> The arc isn't solid yet'`.
  A 2-beat run can never score above 2 → **every Mock Run on all 38 compiled topics always lands
  in the bottom "the arc isn't solid yet" bucket, no matter how well the user performs.**
- No beat is tagged `CURVEBALL`, so `publishBanks` leaves `mockCurveIdx=0` and the end screen
  prints `Curveball this run: undefined.`
The flagship "run a full interview round" tool is structurally broken on 83% of the corpus. The
lens counted curveballs but never ran a mock.

### M3 — `parse_md.mjs:407` off-by-one (P2, effort S)
```js
if (m === 'curve') return { tag: 'CURVEBALL', theme: p[0].trim(), cue: prose(p.slice(1).join(' | ')) };
//                                            ^^^^ should be p[1]        ^^^^^^^^ should be slice(2)
```
The sibling branch on `:409` does it correctly (`theme: p[1]`, `cue: p.slice(2)`), and the doc
comment on `:398` says the format is `### CURVEBALL | <theme> | <cue>`. Consequences, both visible
in `shots/vfy-content/CROP-mixfire-idempotency.png`: the Mixed Fire label reads the literal
**"CURVEBALL"** (duplicating its own badge) instead of the authored theme *"ordering"*, and the
raw ` | ` delimiter **leaks into the on-screen cue**: `ordering | Retries arrive out of order…`.

### M4 — `.l-*` beat classes are dead CSS (P3, effort S)
`model-answers/logic.js:71` emits `class="mbeat-l l-' + beat.c + '"`, but **no `.l-*` rule exists
anywhere in the 5.1MB bundle** (`grep -o "\.l-[a-z]*" dist/index.html` → 0 hits). So the beat class
is inert for all 46 topics — the originals' FRAME/HEADLINE/RISK/CLOSE colour-coding never renders,
and the compiled topics' divergent `key`/`store`/`note` vocabulary is harmless because nothing
styles either. Dead field; either wire it up or drop it.

---

## Scripts / evidence
- `scripts/vfy-content-01-extract.mjs` — independent registry extraction (all 46 topics)
- `scripts/vfy-content-03-visible.mjs` — on-screen visibility + pixel crops
- `scripts/vfy-content-06-mixfire2.mjs` — real Mixed Fire walk to the curveball
- `scripts/vfy-content-07-compilerproof.mjs` — proves `Follow:`/`Senior:`/`Speak:`/`Task:` compile today
- `scripts/vfy-content-08-dataloss.mjs` — proves 189 stages + 114 tier notes + 76 answers are discarded
- `scripts/vfy-content-09-num-crosslink.mjs` — ratio-aware NUM re-measure + cross-link census
- `scripts/vfy-content-10-mockend.mjs` — mock-run beat count + third `undefined` site
- Shots: `shots/vfy-content/`
