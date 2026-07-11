# Content & Pedagogy Quality — State Audit
**Lens:** content quality, uniformity across 46 topics, technical accuracy, contract-in-spirit
**Date:** 2026-07-11 · **Method:** source read (13 topics deep) + runtime extraction of all 46 topics from the built `dist/index.html` TopicRegistry + the app's own renderer functions
**Artifacts:** `fingerprint.json`, `fingerprint2.json`, `scripts/*.mjs`, `shots/content/*.png`

---

## Headline verdict

**The prose is excellent. The structure is hollow.**

The feared failure — "38 topics added fast, so the writing is generic filler" — **did not happen**. I read 13 topics closely and found zero technical errors, zero placeholders, and consistently specific, senior-grade explanations across the whole corpus, including the newest bulk-added ones.

The actual failure is different and worse-shaped: **the markdown authoring format has no field for the things that make this app an interview *trainer* rather than a textbook.** Every pedagogical mechanic the 8 hand-authored originals rely on — the interviewer's follow-up probe, the "what sounds senior" tell, the say-it-out-loud line, the system-map "you are here" chain, the cross-topic pivot jumps, the 9 spoken model-answer scripts — is **empty in all 38 compiled topics**.

The split is *binary*, not a gradient. Every defect below is **0% in the 8 originals and 100% in the 38 md topics**. That is the signature of a missing compiler field, not of tired authors.

### The completeness table (runtime-extracted, all 46 topics)

| metric | ORIG (8) | MD (38) |
|---|---|---|
| drill cards | 173 | 798 |
| cards with **no follow-up probe** (`f:[]`) | **0** | **798** |
| cards with **empty `senior`** | **0** | **798** |
| cards with **empty `speak`** line | **0** | **798** |
| topics with **empty `tierNotes {}`** | **0** | **38** |
| topics with **empty `sys.stages []`** | **0** | **38** |
| topics with **empty `wb.foot`** | **0** | **38** |
| sys pivots with **empty `.a`** | **0** | **76** |
| curveballs **missing `.task`** | **0** | **38** |
| curveballs **missing `.int`** | **0** | **38** |
| **cross-topic pivot jumps** | **43** | **0** |

| depth (per topic) | ORIG | MD | ratio |
|---|---|---|---|
| model answers | 9.0 | 2.0 | **4.5x** |
| red flags | 9.0 | 3.0 | **3.0x** |
| trade decisions | 7.0 | 3.0 | **2.3x** |
| curveballs | 8.0 | 1.0 | **8.0x** |
| whiteboard steps | 9.0 | 2.0 | **4.5x** |
| model-answer prose (chars) | 15,828 | 667 | **23.7x** |

---

## 1. The word "undefined" ships to the user in 38 of 46 topics

`src/scripts/app/drill/logic.js:180`
```js
if (this._tiernote) this._tiernote.innerHTML = d.tierNotes.all;
```
Compiled topics emit `"tierNotes": {}` (`src/topics/_generated/*/drill.js`), so `d.tierNotes.all` is `undefined` and the literal string **"undefined"** is written into the drill header — where the originals say *"All four levels, mixed — the way a real loop actually comes at you."*

Visible in `shots/content/drill-REVEALED-MD-idempotency.png` (grey italic, under the tier toggle). 38/38 compiled topics.

**Second instance —** `src/scripts/app/mixed-fire.js:18`
```js
prompt: cb.cue + '<div class="mx-task">' + cb.task + '</div>',
```
Compiled curveballs have **no `.task`** (38/38). Proven by invoking the app's own renderer on its own data:
```
mxCurve(idempotency.curveballs[0]).prompt
  -> '...Does idempotency fix it?<div class="mx-task">undefined</div>'
mxCurve(signing.curveballs[0]).prompt
  -> '...Stop it."<div class="mx-task">Reframe the premise out loud, then give the real mechanism.</div>'
```
Shot: `shots/content/mixfire-UNDEFINED-proof.png`.

## 2. Two labelled-but-empty boxes on all 798 compiled drill cards

`src/scripts/app/drill/logic.js:258-261` — **unguarded**:
```js
if (stage >= maxStage) {
  html += '<div class="senior"><div class="sl">What sounds senior here</div>' + card.senior + '</div>';
  html += '<div class="speak"><div class="sl">Say it out loud like this</div>' + speakLines[this.di] + '</div>';
}
```
With `senior: ""` and `speak: ["","",…×21]`, every revealed card renders two headed boxes containing **nothing**. The app promises "What sounds senior here" and delivers blank space, 798 times. `shots/content/drill-REVEALED-MD-idempotency.png`.

Same unguarded pattern in `mixed-fire.js:10`.

## 3. The drill's escalation mechanic is absent (`f: []` × 798)

`maxStage = 1 + card.f.length` (`logic.js:245`). With `f: []`, `maxStage = 1`, so the amber **"↳ Interviewer pushes further"** button never appears in a compiled topic.

- `shots/content/drill-REVEALED-ORIG-signing.png` — the button is the primary CTA after reveal.
- `shots/content/drill-REVEALED-MD-idempotency.png` — straight from answer to Missed/Shaky/Solid.

The originals carry 335 follow-up probes (avg 42/topic, each a full `{q,a}` — the interviewer's *second* question). Compiled topics carry **0**. This is the single largest pedagogical loss: a drill without the follow-up is a flashcard, not a rehearsal.

## 4. "Model Answers — SCRIPTS" contains no scripts

The pane exists so you can rehearse a spoken answer. In the originals it is 9 selectable answers, each a beat-labelled script (FRAME / HEADLINE / KEY / RISK / CLOSE), avg **1,758 chars** — every beat a complete, sayable sentence.

In compiled topics it is **2 answers averaging ~333 chars**, and what is there is *stage directions, not speech*:

> **DELIVERY IS AT-LEAST-ONCE** — "duplicates and ambiguous failures are inherent"
> **MAKE PROCESSING IDEMPOTENT** — "so a duplicate has no additional effect"
> **NET: EXACTLY-ONCE EFFECT** — "what exactly-once actually means"

"*what exactly-once actually means*" is a note about what to say. You cannot say it out loud.

Side-by-side: `shots/content/model-ORIG-signing.png` vs `shots/content/model-MD-idempotency.png`. **23.7x** less prose.

## 5. The System Map has no map, and no cross-topic jumps

`"stages": []` in **38/38** compiled topics. The "Where it sits" card renders as a heading plus one generic line ("Zoom out to where idempotency sits in the request path") and **nothing else** — `shots/content/sys-MD-idempotency.png`.

The original renders a 6-stage chain with a **"YOU ARE HERE"** badge — the entire point of a pane whose tab label is *ZOOM OUT* — `shots/content/sys-ORIG-signing.png`.

Worse, `TOPIC_CONTRACT.md:29-32` documents the marquee cross-topic feature:
> *"A pivot chip becomes a one-click jump when its text carries a `(N)` index … OR contains another topic's exact title."*

Measured across all 46 topics:
- **Originals: 43 cross-topic jump chips** (`→ Content pipeline (1)`, `→ IaC (8)`, …)
- **Compiled: 0.** Not one.

The web that turns 46 topics into a *system* exists only among the 8 originals. The other 38 are islands.

Additionally the compiler stuffs the pivot *answer* into the chip *label* (`chip` carries a `\n`-joined blob; `a` is `""` in 76/76), which is why the chips overflow their container in `shots/content/sys-MD-idempotency.png`.

## 6. The drill answer length drifted 4.2x across authoring batches

Uniformity failure *within* the compiled set — a clean monotonic gradient by topic index (the batch signature):

| batch | median drill answer |
|---|---|
| ORIGINALS (calibrated) | 401 chars (~76 words) |
| MD early, idx 9–18 | 352 chars (~63 words) |
| MD late, idx 40–46 | **1,474 chars (~268 words)** |

- **187 cards** corpus-wide exceed 1,200 chars.
- Worst single flashcard: **`storage-engines` at 3,088 chars (~551 words)**.
- `probabilistic-structures`: **all 21 cards** exceed 1,200 chars.

A 551-word answer is an essay, not a drill card — and it is unsayable in the interview beat the pane is training. Early-md matches the original calibration; the late batch drifted into textbook prose.

## 7. "Numbers — ESTIMATE" is partly a slogan board

Compiled topics average **3.4 of 5** rows that actually respond to the inputs (originals: 5.5/6). Worst: **`storage-engines` — 1 of 5**. Its three input boxes barely move anything; four outputs are fixed strings:

> Workload mix = **write-heavy** · Engine lean = **favor LSM** · LSM write path = **sequential** · The trade = **no free lunch**

Only "LSM read amp" computes. Shot: `shots/content/num-MD-storage-engines.png`. Also ≤2/5 dynamic: `developer-platform`, `retries-timeouts`, `circuit-breaker`.

(Verdict rows are pedagogically defensible; a NALSD pane where 80% of outputs ignore the inputs is not.)

## 8. The contract gate enforces presence, not the contract

`TOPIC_CONTRACT.md:24` declares the card shape:
> *Each card `{ tier, signal, q, a, f, senior }`*

`test/topic_contract.cjs` checks: identity fields, valid group, **that each of the 10 slices is truthy** (`if (!data[v])` — so `{stages:[]}` passes), card count ≥ 18, ≥3 cards per core tier, and that each card has a `signal` and a `q`.

It never checks `a`, **`f`**, **`senior`**, `speak`, `tierNotes`, `sys.stages`, `model.answers`, `rf.flags`, `trade.decisions`, or `curveball.task`.

**That is precisely why 798 hollow cards pass 19/19 green.** Answer to the brief's question — *is the contract satisfied in spirit?* — **No. It is satisfied structurally and violated in spirit, and the gate is the reason nobody noticed.**

## 9. Voice: substance consistent, scaffolding templated

Section *lead* lines are byte-identical across the bulk set — "What makes an interviewer wince." (38/38), "The calls that separate…" (38/38), "Back-of-envelope…" (38/38) — where the originals write bespoke leads that carry an argument ("*…the tell that sinks you is defending one algorithm as universally right, because in signing the verifier usually decides, not you*").

Minor. The *substantive* voice — direct, second-person, names the anti-pattern, ends on the senior move — is genuinely consistent corpus-wide.

---

## Technical accuracy: clean

I stress-tested the topics where errors are easiest. **Zero errors found.**

- **probabilistic-structures** — `k = (m/n)·ln2`, `m = -(n·ln p)/(ln2)²`, ~10 bits/element ≈ 1% FP, Count-Min overestimates only. Correct.
- **distributed-locks** — Redlock controversy, the GC-pause stale-holder problem, monotonic fencing token as the fix, and the senior move (*design the lock away*: idempotency / OCC / single writer). This is Kleppmann's argument, correctly stated.
- **storage-engines** — B-tree vs LSM, read/write/space amplification, **RUM conjecture** named. Correct.
- **consistency-models** — CAP *and* PACELC, correctly distinguished; the "weakest model that works" framing. Correct.
- **kafka-internals** — commit-after = at-least-once, commit-before = at-most-once, exactly-once = idempotent producer + transactions; the auto-commit trap. Correct.
- **consistent-hashing** — K/N remap, ring, virtual nodes. Correct.
- **idempotency** — exactly-once *effect* vs *delivery*, atomic key claim vs check-then-act, key+effect in one tx. Correct.

No `TODO` / `TBD` / `lorem` / placeholder anywhere in `src/topics-md/`.

The compiled whiteboard **Mermaid diagrams are real and good** (idempotency's is a correct claim/execute/replay flowchart). Credit where due.

---

## Per-topic verdicts (sampled)

| topic | src | prose | structure | verdict |
|---|---|---|---|---|
| content-pipeline, signing, authz | ORIG | excellent | complete | **reference standard** |
| aws-hardening, notifications, eav, desired-state, iac | ORIG | excellent | complete | **reference standard** |
| idempotency | md | excellent | hollow | ship-blocked on structure |
| rate-limiting | md | good, terse | hollow | ship-blocked on structure |
| caching, cdc, multi-tenant, event-driven | md | good, terse | hollow | ship-blocked on structure |
| consistency-models, sharding-strategies | md | excellent | hollow | ship-blocked on structure |
| distributed-locks, kafka-internals | md | excellent | hollow | ship-blocked on structure |
| storage-engines | md | excellent but **over-long** | hollow + num pane 1/5 | worst offender |
| probabilistic-structures | md | excellent but **essay-length** | hollow | over-long |

**No topic should be dropped for bad content.** The prose everywhere is worth shipping. The 38 compiled topics are uniformly hollow in the same eight ways — which means this is **one fix (the compiler + the md schema), not 38 rewrites**.

---

## What to do, in order

1. **Guard the renderers now** (hours). `logic.js:180`, `logic.js:258-261`, `mixed-fire.js:10,18` — stop shipping the literal "undefined" and stop emitting headed-but-empty boxes. This is a credibility bug, not a content bug, and it is cheap.
2. **Extend the gate to the contract it documents** (hours). Assert non-empty `f`, `senior`, `speak`, `tierNotes`, `sys.stages`; assert minimum counts for `model.answers`, `rf.flags`, `trade.decisions`, `curveballs`. Until the gate checks these, any fix will silently rot back.
3. **Add the missing fields to the markdown schema + compiler** (days) — follow-up probes, senior tell, speak line, tier notes, sys stages, curveball task/int. This is the whole gap.
4. **Backfill the 38 topics** against the extended gate (the large but mechanical job). Prioritise the follow-up probes (`f`) and the model-answer scripts — they carry the most pedagogical value per unit of work.
5. **Re-calibrate late-batch drill answers** to the ~400-char original target; split the 187 over-long cards.
6. **Author cross-topic pivot indices** so the 38 join the navigation web.
