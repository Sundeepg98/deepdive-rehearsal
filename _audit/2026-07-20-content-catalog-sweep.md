# Content Catalog Sweep — all 38 topics, source quality

**Date:** 2026-07-20
**Instrument:** 38 independent cold reads, one reader per topic, all ten panes read end to end, calibrated against `saga.md` (certified flagship standard 2026-07-19).
**Scope:** SOURCE quality only. See "What this sweep does not cover" at the bottom.

---

## 0. Coverage and data hygiene

**Coverage: 38 of 38. No reader dropped.** The returned topic set matches `src/topics-md/` exactly:

```
api-design autoscaling backpressure caching cdc circuit-breaker consistency-models
consistent-hashing debugging developer-platform devices-dispatch distributed-locks
error-propagation event-driven feature-flags idempotency kafka-internals
lambda-organization leader-election load-balancing microfrontend multi-region
multi-tenant observability probabilistic-structures rate-limiting real-time-delivery
replication retries-timeouts rules-engine saga sharding-strategies shared-definition
slos soft-delete state-machine storage-engines stream-batch-processing
```

**Stub screen: zero results rejected.** Every read returned a topic identifier, a verdict, pane notes, a populated `findings[]` with non-empty `quote`/`why`/`fix` on every entry, a `strengths[]` list, and a `one_line`. No empty quotes, no one-word titles, no schema-satisficing shells. All 305 findings survive to the recomputed counts below.

One data-hygiene note, not a rejection: `soft-delete`'s `one_line` carries a leaked closing tag (`…it claims to enforce.</one_line>\n</invoke>`). Content is complete; the serialization is dirty. Worth watching if the same harness runs again.

---

## 1. Calibration control — **HELD**, with a nuance that matters

`saga` returned **`at_standard`**, not `below_standard`. Per the control, **calibration held** and the verdicts are usable.

But the nuance is worth stating loudly, because it changes how you should read the word "above_standard":

- saga was certified at **flagship** standard on 2026-07-19. This sweep's reader put it at **at_standard**, with **1 P0 and 4 P1s** — including a shipped SQL block that claims a claim-gate it does not have.
- Meanwhile **28 of 38 topics came in above_standard**, i.e. above the reference. The anchor scored below the median of the pool it was meant to anchor.

Two readings, and both point the same way:

1. **The rubric is being applied harder than the 2026-07-19 certification.** That is the safe direction — it means the 28 `above_standard` verdicts are conservative, not inflated.
2. **The two instruments ask different questions.** The 2026-07-19 certification was a structural/flagship check. This sweep is a *claim-level correctness* sweep — it recomputed arithmetic by hand, checked substrate facts against the actual APIs, and hunted for a pane contradicting another pane of the same file. saga's P0 (`ON CONFLICT DO NOTHING` followed by an ungated `UPDATE`, silently double-applying inventory) is exactly the kind of defect the first instrument was not pointed at.

**Therefore: read `above_standard` as "above the saga baseline as re-measured by THIS instrument," not as "shippable."** Sixteen `above_standard` topics carry a P0. The verdict label ranks teaching quality; the P0 list is the ship gate. They are different axes and this report keeps them separate.

---

## 2. Recomputed severity counts

| Severity | Count | Topics hit |
|---|---:|---:|
| **P0** — wrong, self-contradicting, or blocks ship | **18** | 16 |
| **P1** — hollow probe, unqualified guarantee, or a tell with no axis | **81** | 33 |
| **P2** — precision gap, redundancy that burns a scarce slot, cram-surface leak | **145** | 38 |
| **P3** — texture, cosmetic, copy error | **61** | 33 |
| **Total** | **305** | 38 |

Verdict distribution: **28 above_standard, 10 at_standard, 0 below_standard.**

The P0 count is the headline. Eighteen ship-blockers across sixteen topics, and **fifteen of the eighteen are the topic contradicting itself** — the correct answer is already somewhere in the same file, usually in the pane next door. That makes this the cheapest possible fix wave: the readers located both the wrong text and the right text, and drafted the replacement clause for every one.

---

## 3. Ranking — all 38, weakest first

Ranked by **verdict tier first** (the reader's holistic call dominates), then by a severity-weighted score within tier (`P0×8 + P1×3 + P2×1 + P3×0.25`). The `P0` column is shown separately because ship-urgency is orthogonal to teaching quality — see the note after the table.

| # | Topic | Verdict | P0 | P1 | P2 | P3 | Score | Top issue |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | **debugging** | at_standard | 2 | 6 | 6 | 0 | 40.0 | `IS DISTINCT FROM` offered as the fix for the NULL-inclusion trap it does not fix — and "a vector clock gives you a total order," which the app's own `consistency-models.md` contradicts |
| 2 | **event-driven** | at_standard | 2 | 2 | 5 | 0 | 27.0 | Whiteboard + Bank tell you to dedup on the *transport* message id, which its own Red Flag calls the trap; a double-charge script blames ack-before-work, which the topic elsewhere proves causes silent LOSS |
| 3 | **distributed-locks** | at_standard | 0 | 6 | 5 | 2 | 23.5 | ~9 of 42 drill follow-ups restate the answer directly above them, clustered in the Staff tier where a senior loop actually lives |
| 4 | **probabilistic-structures** | at_standard | 1 | 4 | 3 | 1 | 23.3 | "a median could drop *below* the true count" for Count-Min — false, and refuted by its own paragraph three sentences earlier |
| 5 | **saga** *(reference)* | at_standard | 1 | 4 | 1 | 1 | 21.3 | Shipped SQL claims a claim-gate it does not have; the Walk persists *after* acting, the anti-pattern the next step exists to correct |
| 6 | **replication** | at_standard | 0 | 4 | 4 | 2 | 16.5 | Whiteboard states R+W>N with no bound — the exact form its own Red Flags calls "the fastest no-hire" — and `cram-derive.js` lifts it verbatim into the spine |
| 7 | **developer-platform** | at_standard | 1 | 1 | 3 | 2 | 14.5 | "for three engineers it never pays" is falsified by the topic's own Numbers model (~160 working days ≈ 8 months) |
| 8 | **stream-batch-processing** | at_standard | 0 | 3 | 5 | 1 | 14.3 | The watermark's out-of-orderness bound is called "allowed lateness" in four say-out-loud scripts; they are two independent knobs |
| 9 | **observability** | at_standard | 1 | 0 | 4 | 3 | 12.8 | Five sites incl. the Spine say no-op fallbacks save you when the collector is down; its own Drill follow-up refutes it |
| 10 | **state-machine** | at_standard | 0 | 3 | 2 | 1 | 11.3 | The Walk teaches the inline-effect dual write its own Red Flags condemns, and there is no outbox step anywhere in the Walk |
| 11 | **rules-engine** | above_standard | 1 | 4 | 5 | 2 | 25.5 | "It is live in seconds" contradicts the topic's own 5-minute default eval cycle, in three panes including the spoken script |
| 12 | **storage-engines** | above_standard | 1 | 5 | 1 | 2 | 24.5 | A curveball tells you to RAISE leveled compaction's fan-out to cut write amplification; its own Staff card proves the opposite with arithmetic |
| 13 | **soft-delete** | above_standard | 1 | 3 | 4 | 2 | 21.5 | Composite FK on `(parent_id, parent_deleted_at)` is never checked when `deleted_at` is NULL — exactly the live-parent case it claims to enforce |
| 14 | **api-design** | above_standard | 1 | 1 | 7 | 2 | 18.5 | The Walk ships the check-then-act idempotency race its own Red Flags pane names as the #1 trap |
| 15 | **devices-dispatch** | above_standard | 1 | 2 | 4 | 1 | 18.3 | An MQTT keepalive claimed to deliver a "poll now" wake-up "without held connections" — both halves wrong about the substrate |
| 16 | **lambda-organization** | above_standard | 1 | 1 | 6 | 1 | 17.3 | The Lambda-vs-container row is algebraically incapable of ever returning "Lambda wins" at any legal input |
| 17 | **consistency-models** | above_standard | 1 | 2 | 2 | 2 | 16.5 | PN-counter defined as a G-Counter in ten places, and contradicted by the file's own balance curveball |
| 18 | **sharding-strategies** | above_standard | 1 | 1 | 4 | 1 | 15.3 | Per-request availability stated as `(1-p)^N` in five panes; true only for the scatter-gather the topic spends ten pages telling you to avoid |
| 19 | **leader-election** | above_standard | 0 | 3 | 4 | 2 | 13.5 | Unqualified "Redis + fencing closes the pause case" — the token generator fails over too; plus a Kubernetes "every write is conditional" overstatement said twice |
| 20 | **load-balancing** | above_standard | 0 | 3 | 4 | 0 | 13.0 | Two unrefreshed Bank cards whose `Int:` restates their own `Model:`; a headroom row that says you can lose 2 of 6 while another pane calls the resulting state the cascade |
| 21 | **slos** | above_standard | 1 | 0 | 4 | 2 | 12.5 | Page and ticket are swapped in the burn-rate escalation rule — repeated three times including in the spoken Model Answer, where it convicts the config it just recited |
| 22 | **feature-flags** | above_standard | 0 | 3 | 3 | 2 | 12.5 | The flagship "an engaged kill switch disengages on a cold start" is stated unconditionally; true only for permanent ops switches, which the polarity rule outlaws |
| 23 | **autoscaling** | above_standard | 1 | 0 | 4 | 1 | 12.3 | The crash-loop curveball asserts unready pods concentrate load; the HPA explicitly guards against this by assuming not-yet-Ready pods consume 0% |
| 24 | **kafka-internals** | above_standard | 0 | 2 | 6 | 1 | 12.3 | The retention curveball tells you to abandon ~24h of records that are still inside the window; Opener items 0 and 1 are the same sentence, printed twice by the cram sheet |
| 25 | **rate-limiting** | above_standard | 0 | 1 | 7 | 2 | 10.5 | The Bank SCALE card is asked to size the store load and produces no size; its `Int:` is answered by its own `Model:` |
| 26 | **multi-tenant** | above_standard | 0 | 2 | 4 | 1 | 10.3 | The "leak" curveball is not a curveball (no Task, no Int) and re-runs the topic's own headline scenario |
| 27 | **error-propagation** | above_standard | 0 | 2 | 4 | 1 | 10.3 | Two SDE2 follow-ups restate the paragraph above them; two Trade-off calls are one-sided with flip axes the file already knows |
| 28 | **retries-timeouts** | above_standard | 0 | 2 | 4 | 1 | 10.3 | Bank contradicts itself on bulkhead-inside-vs-outside the retry loop; a "nine-second" user wait that five 2-second timeouts would have clipped |
| 29 | **caching** | above_standard | 0 | 2 | 3 | 2 | 9.5 | Write-through sold three times as making the stale-populate race "disappear" — it doesn't, once every key carries a TTL, which this topic mandates |
| 30 | **consistent-hashing** | above_standard | 0 | 2 | 3 | 2 | 9.5 | An SDE3 drill card re-delivers its SDE2 predecessor; the Numbers keys-moved row contradicts the topic's own K/(N+1) proof |
| 31 | **circuit-breaker** | above_standard | 0 | 2 | 2 | 3 | 8.8 | A timed-out write is treated as a failure rather than an unknown, so the payment fallback it repeats eight times quietly risks a double charge |
| 32 | **microfrontend** | above_standard | 0 | 2 | 2 | 2 | 8.5 | Shared types package sold as restoring "compile-time safety" at the seam; Shadow DOM offered as the answer for untrusted code (it is a style boundary, not a trust boundary) |
| 33 | **real-time-delivery** | above_standard | 0 | 1 | 4 | 3 | 7.8 | Three separate CSWSH treatments never mention SameSite, so the textbook demo does not reproduce against a default-configured app |
| 34 | **idempotency** | above_standard | 0 | 1 | 3 | 3 | 6.8 | The Staff scale card recommends the Redis-key/Postgres-effect split that five other panes call the fastest no-hire |
| 35 | **multi-region** | above_standard | 0 | 1 | 2 | 2 | 5.5 | Read-local/write-global called "inherently split-brain-proof," never tested against the case the whole topic exists for — the OWNING region dying |
| 36 | **shared-definition** | above_standard | 0 | 0 | 4 | 2 | 4.5 | Numbers pane frames the win as storage, which the rest of the topic explicitly says is the weaker half of its own case |
| 37 | **backpressure** | above_standard | 0 | 0 | 4 | 1 | 4.3 | One un-deepened curveball (no Task, no Int), two thin Bank Ints, a push-vs-pull tell that undersells what the topic already knows |
| 38 | **cdc** | above_standard | 0 | 0 | 3 | 2 | 3.5 | A prepared transaction is said to pin WAL (it pins the xmin horizon); `acks=all` never stated under a "never lose a change" frame |

**Read the table with the P0 column, not just the rank.** Ranks 11–18 are all `above_standard` topics carrying a ship-blocker. `rules-engine` (#11), `storage-engines` (#12) and `soft-delete` (#13) score *worse on raw severity* than `observability` (#9) and `state-machine` (#10) — they rank lower only because their readers judged the surrounding teaching to be genuinely strong. For a fix wave, sort by the P0 column. For an "is this topic good enough to study from" question, sort by rank.

**The sixteen P0 topics, for the fix queue:** debugging (2), event-driven (2), api-design, autoscaling, consistency-models, developer-platform, devices-dispatch, lambda-organization, observability, probabilistic-structures, rules-engine, saga, sharding-strategies, slos, soft-delete, storage-engines.

---

## 4. Defect classes

Deduped across all 38 reads. Counts are topics where a reader *explicitly flagged an instance* — true incidence is almost certainly higher, because readers were reading one topic each and were not hunting for cross-topic patterns.

### Class A — The Bank `Int:` is answered by its own `Model:` — and it is almost always SCALE or DESIGN
**~18 topics.** The largest structural class in the sweep, and the one with the clearest mechanical cause.

> `Int: where does the tenant id come from?` / `The verified JWT claim, never a request parameter` — **multi-tenant**, where the `Model:` above already says it and the same fact appears at nine other sites in the file.

> `Int: what does raising W do to write availability?` — **replication**, whose `Model:` one line above already says "a write tolerates N-W failures, a read N-R."

> `Int: what's the risk of running the pool near capacity?` — **load-balancing**, whose `Model:` already says "the pool must be sized with headroom (N+1 or more) to absorb a loss without overloading."

> `Int: why isn't soft-delete enough for erasure?` / `It keeps the data; erasure requires it genuinely gone.` — **soft-delete**. Eight words, a definition, and the `Model:` directly above already contains it.

Topics hit: api-design, caching, circuit-breaker, consistency-models, consistent-hashing (3 cards), developer-platform, distributed-locks, leader-election (2), load-balancing (2), multi-tenant (2), rate-limiting, replication (2), rules-engine (2), saga (2), sharding-strategies, soft-delete (2), storage-engines (2), stream-batch-processing.

**The signal in the pattern:** it is the SCALE and DESIGN cards, over and over, in topics whose FRAME / STRUCTURE / FAILURE / CLOSE / curveball cards are excellent. Readers independently reached for the same words — *"an older, thinner generation," "the one generation that never got upgraded," "reads like a draft that missed the pass the rest of the Bank clearly got," "two unrefreshed legacy cards."* Three secondary tells corroborate a generation boundary: those two cards' `Model:` text is lowercase and semicolon-chained rather than spoken; they are frequently the only Bank cards with no `Int2:`; and their own `Int2:` is often excellent, so the card is visibly half-refreshed. **This is not 18 independent authoring lapses. It is one template that never got the upgrade pass.**

### Class B — A curveball with no `Int:` at all, so nothing pushes on the answer
**~11 topics.** Distinct from Class A: here the probe is absent, not weak — the pane's designated adversarial rep gives zero reps.

> **caching**: all 7 Extra Curveballs carry zero `Task:` and zero `Int:` (verified by count; saga's 7 carry 6 and 7). Five of the seven also re-run Drill answers near-verbatim.
> **developer-platform**: eight of the topic's hardest scenarios all end on the candidate's own monologue. 6 `Int:` lines across 15 Bank cards, versus 14 in saga and 14 in idempotency.
> **rules-engine**: the "dashboards" curveball is not adversarial at all — no ambiguous outcome, no irreversible step — and has no `Int:`, so its one right answer is already stated twice elsewhere.

Topics: backpressure, caching, debugging, developer-platform, multi-tenant, rate-limiting (Models re-run drills), real-time-delivery, replication, rules-engine, storage-engines, stream-batch-processing.

### Class C — The Walk ships the anti-pattern the topic's own Red Flags / Drill condemns
**~12 topics, holding 3 of the 18 P0s.** The Walk is the memorization surface — the pane a candidate replays from memory at the whiteboard — so a defect here is the version that gets said out loud.

> **api-design (P0)**: `existing = dedupe_store.get(idempotency_key)` then act — the check-then-act race its own Red Flags pane calls the #1 idempotency trap, and which the SDE3 card, the Whiteboard and the Model Answer all correct.
> **saga (P0)**: `INSERT … ON CONFLICT DO NOTHING;` followed by a completely ungated `UPDATE inventory SET available = available - 1` under the comment `-- only apply the effect if THIS statement claimed the key`. The comment claims a guard the SQL does not have.
> **state-machine**: the Walk fires the external effect inline with the state advance, which the Red Flags pane calls out by name and the Whiteboard already carries correctly.
> **rate-limiting**: `INCR` then `EXPIRE` as two commands, uncaptioned — the exact gap the Drill later calls a bug ("a key with no TTL that throttles forever").
> **retries-timeouts**: a retry helper that takes no deadline and never checks remaining budget, in a topic that insists four separate times that "a retry has to fit within the remaining budget."
> **consistency-models**: a function literally named `is_strongly_consistent(N, R, W)` — the over-claim the very next Walk step exists to retract.

Also: consistent-hashing (`hashlib.md5` in the reference implementation, against a Red Flag prohibiting MD5), developer-platform (`CREATE ROLE … NOLOGIN` under prose saying the platform connects as it), devices-dispatch (`interval '2 minutes'` hardcoded — the value its own curveball diagnoses as the bug), distributed-locks (a client-side read-compare-write fence), event-driven (a two-await "atomic" claim), multi-region (`fence(old_primary, token)` — fencing modeled as a call to the partitioned node).

### Class D — Cross-pane self-contradiction
**~17 topics, and this class holds 15 of the 18 P0s.** Two flavours, both worth naming:

**D1 — contradicts another pane of the same file.** The correct version is usually one pane away.
> **slos (P0)**: "a rule that files a *ticket* after spending *more* budget than the rule that *pages* has the escalation backwards" — said immediately after reciting 2%/5%/10%, which is exactly that ladder. The sentence convicts the config it just gave.
> **storage-engines (P0)**: a curveball lists "a larger compaction fan-out" as a lever to CUT write amplification; the Staff drill proves the opposite with numbers (T=10 → 60x, T=20 → 92x) and names that exact move as the trap.
> **rules-engine (P0)**: "It is live in seconds, not a deploy" against its own `cycleMin` default of 5 and its own SDE2 card, which says *"The mistake is saying 'instant' — it is 'next cycle', and you should know which number you are quoting."*
> **observability (P0)**: five sites incl. the Spine attribute collector-outage survival to no-op fallbacks; the topic's own Drill follow-up says *"No-ops handle 'not initialized.' What about the export path? … that's the harder half, and it's where no-ops don't help."*
> **developer-platform (P0)**: "for three engineers it never pays" against its own Numbers row note, which says "most of a year for a 3-engineer team" — and against the compute, which says ~160 working days.

**D2 — contradicts a SIBLING TOPIC file.** Rarer, more damaging, and invisible to any single-file review.
> **debugging (P0)**: "a Lamport or vector clock" offered for a *total* order. `consistency-models.md:161` says the opposite explicitly, and the contrast is that file's whole point. A reader cramming both gets contradictory instruction.
> **debugging (P1)**: "monotonic-reads via a version/LSN token" describes read-your-writes; `consistency-models.md:245` draws the distinction.
> **event-driven (P0)**: the Whiteboard tells you to dedup on the message id; its own Red Flag says *"the same trap hides in 'we dedup on the SQS message id' — a redriven message gets a new one."*

### Class E — Trade-offs tell is a virtue list, not a switch condition
**~21 topics.** The tell names a preference, or restates its own bullets, or resolves to "do both" — nothing in it can flip the call.

> `Tune to the dependency's real failure behavior: trip fast enough to protect` — **circuit-breaker**. A tautology in the one pane whose job is the axis.
> `Use choreography for simple, few-step sagas where decoupling wins; orchestration for complex sagas` — **saga**, which owns a far sharper rule two panes away ("choreography for reactions, orchestration for transactions") and never uses it here.
> `Take a vendor agent when its auto-instrumentation coverage and support genuinely outweigh the lock-in` — **observability**. Circular; contains nothing checkable.
> `Reach for schema-per-tenant only when a middle ground … is genuinely needed` — **multi-tenant**. "Reach for the middle ground when a middle ground is needed."
> `Prefer semi-synchronous by default` — **replication**, where three other panes say quorum commit dominates semi-sync, and this tell is the one the cram sheet ships.
> `Co-locate … and add a global index` — **sharding-strategies**. The two options are not alternatives; every real system does both, so neither side can lose.

**Why this class outranks its severity:** `cram-derive.js:130` lifts each Trade-off tell verbatim into the cram sheet's *"Senior tells — say these"* section. **The weakest string in the file is mechanically promoted to the highest-leverage surface.** Multiple readers hit this independently and traced the line number.

Topics: api-design, backpressure, circuit-breaker, debugging, distributed-locks (all 7 bullets), error-propagation (2), event-driven, feature-flags, lambda-organization, load-balancing, multi-tenant, observability (2), rate-limiting, replication, retries-timeouts (3), saga, sharding-strategies, slos, soft-delete (2), state-machine (2), storage-engines (2), stream-batch-processing (2).

### Class F — Drill follow-up answerable by re-reading the answer above it
**~14 topics.** The rubric's canonical P1. What makes this class actionable is *where* it clusters.

> **distributed-locks**: ~9 of 42, concentrated in the **Staff tier**. `Follow: Give the canonical example of each` — the answer above already gave both, verbatim. `Follow: You've decided you must lock. Give the checklist` — the answer above already numbered all five items in the same order.
> **rate-limiting**: three of them, all in the **SDE2 tier's first follow-up slot**. Every SDE3 and Staff follow in that pane is genuine pushback.
> **consistent-hashing**, **kafka-internals**, **storage-engines**: a **Staff card restating its SDE3 predecessor** — same answer, same order, sometimes near-identical wording.

So the class has three named locations: the SDE2 opening follow, the Staff main answer that repeats its SDE3 sibling, and the Staff follow that recites its own answer's numbered list. That is a targetable pass, not a diffuse quality problem.

### Class G — Numbers pane defects, in three separable sub-classes
**~19 topics.** Split them, because two of the three have a mechanical detector.

**G1 — arithmetic, unit or label wrong.** api-design (100,020 vs its own compute's 100,000), consistent-hashing (K/N labelled as the join figure, contradicting the topic's own K/(N+1) proof), feature-flags (one row in polls/min while every other row and every prose pane is per-second, so the pane's own headline 16,000x is not recoverable from its own rows), idempotency (undercounts extra writes 2x), multi-tenant (a rows-examined ratio labelled a latency speedup), probabilistic-structures (NaN/Infinity at declared minimums), devices-dispatch (a term in the formula that is not in the causal path).

**G2 — a row that is invariant to every input.** event-driven (pinned at exactly `10` for every reachable combination), caching (a constant string), cdc (two rows render the identical number), observability (2 of 6), replication (2 of 10), slos, soft-delete (`retentionDays` feeds one row that echoes it back unchanged), state-machine, shared-definition (a note hardcodes `200` while the input it names is a slider).

**G3 — the DEFAULTS do not demonstrate the pane's own thesis.** The sharpest sub-class, because the derived cram sheet evaluates `compute()` at defaults and prints the result as a ceiling.
> **retries-timeouts**: the note says "most retry policies configure more attempts than the deadline can physically fit — a policy that lies to you." At defaults the pane computes 4 attempts afforded against 3 configured. The badge stays dark on the row the companion note calls "the killer figure."
> **distributed-locks**: the pane's signature row is "Op + pause vs the lease." At the shipped defaults it evaluates to **"fits (17s spare)"** — the pane demonstrates the opposite of the failure the topic exists to teach.
> **lambda-organization (P0)**: the "Lambda wins" branch is algebraically unreachable at every legal input — the container is sized from *average* concurrency and billed 730h while Lambda pays only busy-seconds, so the ratio never drops below ~2.12 and `over: ratio > 1` is always true. A reader working the sliders learns "Lambda is always ~2x a container," the inverse of the topic's thesis.
> Also: consistent-hashing (the ceiling note quotes "1%" while the defaults compute 10%, and the "takes hours" claim five other panes assert never fires), developer-platform, rate-limiting (a note asserting "the real bottleneck" beside a number three shards below the wall).

### Class H — Cram-surface strings that do not survive being read cold
**~14 topics.** The derived cram/scope sheets pull mechanically from `wb.steps[].a`, Trade-off tells, Numbers rows at defaults, `open.cards[0].items[0..1]`, Red Flags, and curveball themes. A defect here reaches the reader five minutes before the loop with zero repair context.

> **replication**: `Because a write set of W nodes and a read set of R nodes, together exceeding N, must overlap…` — stated with no bound, no "completed write," no failure edges. Its own Red Flags calls that phrasing *"the most damaging, because every other flag on this list is a mechanism error while this is a vocabulary error."* Every other Whiteboard step in that file names its own bound. This one ships to the spine.
> **feature-flags**: Opener item 2 says "an **instant** kill switch." The topic says three separate times that *"what separates the levels here is refusing to say 'instantly'"* — and `cram-derive.js:34/148` takes the sheet's one-liner and 30-second answer from exactly those two items.
> **kafka-internals**: Opener `items[0]` and `items[1]` are the same sentence with the payoff list reshuffled, so the sheet prints it twice in two different sections.
> **saga**: `Only the ones **before the pivot**.` — "the ones" has no antecedent read cold.
> **multi-region**: `You do not, until you have failed over under a game day…` — dangling.
> **feature-flags**: Whiteboard cues 1 and 2 are the *pre-correction* framings that cues 4 and 5 exist to fix, so the sheet carries the myth and its debunk as adjacent equals with no marker for which is current.
> **error-propagation**: a Red Flag left un-localized from the notifications topic (`"If a send fails, we just log it"` — "send" has no referent in a signing pipeline; `saga.md` localized the same template and this one did not).

### Class I — A timeout treated as a failure rather than an UNKNOWN
**4 topics need it; 4 already carry the exact sentence to propagate.** A genuine cross-corpus gap with a ready-made donor.

> **circuit-breaker (P1)**: the word "idempotent" appears nowhere in the file, and every timeout is converted into "a countable failure the breaker will happily trip on." The calls that trip the breaker are timed-out charges whose outcome is unknown, and the shipped fallback enqueues an intent that the drain then re-executes. Across 34 follow-ups and 8 curveballs, not one asks "the charge timed out — did it land?"
> **rate-limiting (P2)**: the store `INCR` times out; the client is debited for a request the fallback then admits, and a library retry debits again.
> **debugging (P1)**: nothing in 1077 lines treats a timeout as unknown — which matters for a debugging topic, since "assume it failed and act" is how a diagnosis becomes a second incident.

Donors with the sentence already written: **error-propagation** ("Exactly-once is impossible; at-least-once plus an idempotent, atomically-claimed operation is effectively exactly-once"), **consistency-models** ("in any at-least-once, no-rollback system, an error is not a rollback — it means unknown, and code that reads it as 'definitely did not happen' is the actual bug"), **retries-timeouts**, **devices-dispatch**.

### Class J — A guarantee asserted without the precondition that makes it true
**~17 topics.** The highest-value class for interview *outcome*, because these are precisely the claims an interviewer pushes on — and the candidate has volunteered them.

> **caching**: write-through "makes the stale-populate race disappear" — at three sites. It doesn't, once every key carries a TTL, which this topic mandates.
> **multi-region**: read-local/write-global is "inherently split-brain-proof" — true only while ownership is static, and the topic never walks the case its own DR premise requires (the owning region dying).
> **cdc**: per-key ordering guaranteed by hashing — true only for a fixed partition count; and "without ever losing a change" with `acks` never mentioned in the file.
> **leader-election**: "With a fencing token the pause case is genuinely closed" — only if the token survives the failover, which a Redis `INCR` does not.
> **distributed-locks**: "A fencing token fixes **all of them**" — including the failover that loses the lock record, which also loses the counter.
> **developer-platform**: "a SELECT-only role means an unelevated caller *physically cannot* write" — `SECURITY DEFINER` functions are `EXECUTE`-to-PUBLIC by default, and the topic itself raises `SELECT some_function_that_writes()` twice.
> **microfrontend**: Shadow DOM triggered on a *trust* condition ("code you cannot trust"), when it is a style boundary — mounted script shares the JS realm and owns your token.
> **real-time-delivery**: "any origin can open a socket and the browser will attach the victim's cookie," asserted at three sites, with SameSite never mentioned.
> **probabilistic-structures**: register on the Bloom filter's "no" — the "no" is exact only w.r.t. what was inserted into *that* filter, so two concurrent signups both read available.

### Class K — Substrate fact wrong (a domain-fluent interviewer corrects it)
**~20 topics.** Representative: **devices-dispatch** (MQTT keepalive carries no payload and MQTT holds a session per device — P0); **debugging** (`IS DISTINCT FROM` is the null-safe *inequality* — P0); **consistency-models** (a single max-merged map is a G-Counter, not a PN-counter — P0; Cassandra at QUORUM is strict, hints don't count toward CL); **soft-delete** (a NULL anywhere in a composite FK means MATCH SIMPLE never checks it — P0); **rules-engine** (`REFRESH … CONCURRENTLY` diffs, it does not swap; a stored generated column must be IMMUTABLE so it cannot read `now()`); **cdc** (prepared transactions pin the xmin horizon, not WAL); **kafka-internals** (SNS has no ack model and EventBridge has archive+replay); **event-driven** (BACKWARD compatibility permits deleting fields — the additive discipline described is FULL); **real-time-delivery** (a clean stream close is EventSource's *normal* reconnect trigger; TCP holds an idle socket for 15min–2h, not "minutes"); **circuit-breaker** (Envoy `max_retries` is a concurrency cap, not a rate cap — `retry_budget` is the rate cap); **lambda-organization** (SnapStart is Java/Python/.NET, not Node or Go; SQS retention default is 4 days, not 14); **storage-engines** (etcd ships a raft WAL; the no-WAL property belongs to bbolt); **multi-region** (GDPR restricts *transfers*, it does not mandate residency); **distributed-locks** (wait-die is a timestamp-priority prevention protocol, not a timeout scheme); **consistent-hashing** (MD5 listed as an exemplar of "not cryptographic").

### Class L — Redundancy that burns a scarce slot
**~20 topics.** Per-pane restatement is by design (panes are consumed independently; the cram sheet is derived, not authored), so this is texture — **except** when it consumes a curveball, a Staff drill, or a Walk step, which are the scarcest real estate in the format. Load-bearing instances: **caching** (5 of 7 Extra Curveballs re-run Drill answers), **rate-limiting** (6 of 8 curveball `Model:` blocks), **debugging** (Walk step 2 restates step 1's move in nearly the same words; 2 of 9 Whiteboard cards carry one mechanism; 2 curveballs are drill re-runs), **stream-batch-processing** (Walk step 5 repeats step 4's event-time argument with the *identical* parenthetical example; an SDE3 MapReduce card duplicates its SDE2 sibling), **sharding-strategies** (Walk step 6 half-repeats step 4), **autoscaling** (Walk step 9 recaps steps 5 and 8), **kafka-internals** (both Staff main answers restate their SDE3 predecessors).

### Class M — "All four levels, mixed" against three tiers
**~26–28 files corpus-wide.** The Drill tier header reads *"All four levels, mixed"* over three tier rows (SDE2 / SDE3 / Staff). `saga.md`, `caching`, `slos` and `real-time-delivery` read "All three tiers." One global sed sweep, visible in the UI, blocks nothing.

---

## 5. Per-topic one-liners

Weakest first, matching the ranking.

1. **debugging** — Strong debugging material with sound arithmetic and mostly real pushback, held out by two clause-level engineering errors, one of which contradicts a sibling topic file.
2. **event-driven** — The drill follow-ups are real pushback and the curveballs are above the reference bar, but two P0 self-contradictions and a Numbers row pinned at a constant must be fixed; all three are one-clause edits.
3. **distributed-locks** — Zero P0s, clean arithmetic, and the best adversarial curveball set in the sweep — but a quarter of the drill follow-ups re-say the answer above them, in the tier a senior loop actually lives in.
4. **probabilistic-structures** — Quantitative depth that beats the reference (the information-theoretic floor card especially), undone by one flatly wrong, self-contradicting sentence and a flagship example that omits the DB uniqueness constraint.
5. **saga** *(reference)* — Reference-grade teaching almost throughout, with recomputed-exact Numbers, but one shipped SQL block silently double-applies inventory while claiming a guard it doesn't have.
6. **replication** — Drill, Model Answers and Red Flags all clear the bar; an upgrade pass stopped short of two Whiteboard steps, two Bank cards and one Trade-off tell, and the worst of them ships the topic's own named no-hire to the cram spine.
7. **developer-platform** — Mechanism-level teaching at or above reference throughout, held at standard by one arithmetic claim that contradicts its own Numbers model and eight curveballs that are never pushed on.
8. **stream-batch-processing** — Interview-ready and unusually honest about guarantees, but one terminology error lands in four say-out-loud scripts and three slots hand back material already given.
9. **observability** — 42 drill follow-ups of near-uniform real pushback, blocked by one repeated mechanism error that the topic's own follow-up explicitly refutes.
10. **state-machine** — A Drill/Numbers pair that exceeds the reference, undercut by a Walk that teaches the inline-effect anti-pattern, a Trade-off that contradicts the Numbers derivation, and nothing that reclaims a crashed worker's entity.
11. **rules-engine** — Near-reference-grade on four-eyes integrity and Postgres concurrency, held back by a self-contradicting latency claim, an MFA binding property TOTP cannot provide, and three soft Bank cards.
12. **storage-engines** — 21 drill cards of real pushback and a Numbers pane that proves its thesis at defaults, blocked by a curveball whose lever runs backwards against the topic's own arithmetic.
13. **soft-delete** — Drill follow-ups are real pushback end to end and the CDC thread is best-in-class, but one mechanism is wrong in four places and blocks ship.
14. **api-design** — Reference-grade almost everywhere; the drill and curveball panes clear the saga bar, but the Walk ships the exact check-then-act code its own Red Flags calls a red flag.
15. **devices-dispatch** — Above the reference bar as a teaching artifact, with one parenthetical that a fleet interviewer is guaranteed to know cold, plus a dead expire-vs-re-queue axis.
16. **lambda-organization** — Drill and Bank would hold up in a real staff loop and the AWS facts are current, but the Numbers pane's headline row can never return its own thesis.
17. **consistency-models** — Above the saga bar on drills and eight reference-grade curveballs, blocked by a definition that is wrong in ten places and contradicted by the file's own curveball.
18. **sharding-strategies** — Reference-grade teaching with exact recomputed arithmetic and eight genuinely adversarial curveballs, held back by an availability claim that is wrong as stated in five panes.
19. **leader-election** — At or above reference on drills and curveballs, with three localized P1s that are four passage-level rewrites away from a model topic.
20. **load-balancing** — Zero P0s and every checkable claim correct; the whole debt is two unrefreshed Bank cards, one duplicated curveball, and a headroom row contradicting the topic's own cascade math.
21. **slos** — Genuinely above the bar and I'd walk into the loop on it, but one sentence — repeated three times including in the spoken Model Answer — states the alerting ladder with page and ticket swapped.
22. **feature-flags** — The 32-item follow-up chain and seven curveballs sit above reference; the defects cluster almost entirely in the strings the cram sheet derives from, plus one flagship claim missing its one true condition.
23. **autoscaling** — Genuinely above standard: 42 follow-ups with zero trivia and arithmetic exact at defaults, with one P0 asserting a CPU-HPA mechanism Kubernetes explicitly guards against.
24. **kafka-internals** — Zero P0s across every config default, guarantee claim and arithmetic operation checked, but the retention curveball abandons records still in the log and the Opener prints one sentence twice.
25. **rate-limiting** — Above standard on the Drill/curveball spine — it beats the reference at naming which *direction* an approximation is wrong — held back by two stub Bank cards and a store timeout taught as a non-event.
26. **multi-tenant** — Zero P0s and drill follow-ups that routinely attack the answer above them; the only soft spot is a Bank where one happy-path curveball and two legacy cards sit at a visibly lower altitude.
27. **error-propagation** — Shippable and genuinely preparatory: zero P0s, exact arithmetic, follow-ups that overwhelmingly push back; Trade-offs is the one pane that settles for one-sided calls.
28. **retries-timeouts** — The Drill pane alone is worth the week, but two Bank cards contradict themselves and both Walk code blocks under-deliver on their own captions.
29. **caching** — Drill follow-up chains are the best in the repo and the Numbers recompute clean, but write-through is sold three times as closing a race it doesn't close, and the Extra Curveballs carry no pushback at all.
30. **consistent-hashing** — Math checks out by hand and the contrarian thesis is argued rather than asserted; the real damage is a Numbers row contradicting the topic's own proof plus tier-3 content already said at tier 2.
31. **circuit-breaker** — The strongest Drill pane in the sweep with arithmetic that survives recomputation, held back by one real omission: a timed-out write treated as failure, so the payment fallback quietly risks a double charge.
32. **microfrontend** — Above standard by a clear margin with the strongest Drill/Bank chains in the repo; two single-clause overclaims are the only things to fix before shipping.
33. **real-time-delivery** — Zero P0s, verified arithmetic, and a drill pane that outclasses the reference; the only material gap is three CSWSH treatments that never mention SameSite.
34. **idempotency** — 42 follow-ups that almost all push back rather than look up, with three real repairs: one cross-pane conflict, a mermaid arrow, and SQL that can't do what its narration says.
35. **multi-region** — A Drill pane that repeatedly exceeds the reference; the one real gap is that its most-repeated claim is never tested against the case the topic exists for.
36. **shared-definition** — Zero P0s and zero P1s across ten panes; the only soft spots are a Numbers framing that argues the weaker half of the topic's own case and an indexing card that never makes its implied decision.
37. **backpressure** — Zero P0s and no hollow follow-ups across ~40 Follows, with arithmetic verified at every recomputable site including the ρ/(1−ρ) distinction most sources get wrong.
38. **cdc** — Reference-grade and loop-ready: zero P0s, the P1 hunt came up empty, leaving three precision gaps.

---

## 6. Strengths worth propagating

Ranked by transferability. Each is a *pattern* plus the topics that already execute it, so a propagation pass has a donor to copy from.

**S1 — Name the specific arithmetic error the candidate is about to make, and give the wrong number it produces.**
> "saying 'delay scales as one-over-one-minus-rho, so fifty to ninety is nine-x' is the one way to get corrected across the table — that formula gives 5x." (**backpressure**)
> "It is *not* 2,700-over-5,000; that would be 54%, and it's the wrong ratio — headroom is a fraction of what you *built*, not of what you're *serving*." (**autoscaling**)
> "if a failing operation makes three attempts while a succeeding one makes a single call, then a breaker you configured for 50% actually fires at a true operation-failure rate of about 25%." (**circuit-breaker** — recomputed: 3p/(1+2p)=0.5 → p=0.25 exactly.)
Also: **storage-engines** (T=10→60x, T=20→92x), **sharding-strategies** (the N/(N+1) mirror), **state-machine** (a *planted false premise* — "8 × 7 = 56 ordered pairs. Do you test all 56?" — that the candidate must reject rather than answer).
*Propagate to:* every topic that quotes a folklore number. Derive it, then name the misstatement.

**S2 — The follow-up attacks the candidate's own proposed fix; the answer CONCEDES before distinguishing.**
> "Exactly right, and that is the point: the safe-default makes a mis-order *safe*, the ordering makes it *clean*." (**error-propagation**)
> "At their stated scale, in a single region, they are substantially right, and I would say so out loud… The honest counter is not about scale at all — it is about **topology**." (**consistency-models**)
> "a Ready-but-cold pod is counted as serving capacity while actually being *negative* capacity… I'd rather have a truthful, slightly longer lag than a dishonest, shorter one." (**autoscaling**)
> "That is the right instinct, and it is **half true**." (**storage-engines**)
*Propagate to:* every dogma card. Conceding-then-relocating converts a doctrine card into a judgment card, which is what a staff loop is actually buying.

**S3 — After teaching the fix, teach the fix's OWN new failure mode.**
> "That's arguably worse than the double-charge the key was protecting against, because a double-charge gets reported in minutes and this gets reported in days." (**idempotency**)
> "A dead-letter nobody watches is the success-table blind spot again, one level down." (**debugging** — the follow-up recurses the topic's own *fix* into the next instance of the topic's own *bug*.)
> "the very index that made the deleted value **reusable** is the index that now makes the restore **conflict**." (**soft-delete**)
> "your guaranteed 50 environments will start up perfectly and then sit there timing out on a saturated dependency… you throttle anyway, from the inside." (**lambda-organization**)
> "a dead sweep **feeds the auto-halt stale numbers** — it might widen a bricking change because the dark devices never got counted as expired." (**devices-dispatch**)

**S4 — Explain why COMPETENT teams ship the bug, not just that the bug exists.**
> "it **tests perfectly**: below capacity, an unbounded queue behaves identically to a bounded one… the failure is one of **omission**, and omissions never show up in a diff." (**backpressure**)
> "raising T **is** the right move under **size-tiered**, where write amp has no T factor at all — so a correct instinct from the other family inverts here." (**storage-engines**)
> "A form that writes back every field it displayed cannot distinguish 'the user explicitly set this' from 'I rendered the inherited value into the box'… Then, weeks later, someone changes the global default and it reaches **nobody**." (**feature-flags**)
> "This one sounds authoritative — the page arithmetic is genuinely real — which is exactly why it's a trap." (**storage-engines**, as a Red Flag `Note:` field.)

**S5 — Name the DIRECTION an approximation is wrong, and who it bites.**
> "the N slices **sum to exactly the limit**, so the client can never exceed it — sub-key sharding is structurally conservative. What it does instead is **under-admit under skew**… note it is the headroom, not the sharding, that buys you an over-admission." (**rate-limiting**)
> "offset's instability is **unavoidable and inherent**, cursor's is **a design error I can correct**." (**api-design**)
> "for a tenant that's forty percent of the table, the tenant column isolates but no longer narrows." (**multi-tenant**)
*Propagate to:* every quorum, sample, cache TTL and sharded counter. "Approximate" is not an answer; "wrong in this direction, for this population" is.

**S6 — A health signal that a dead component can satisfy by doing nothing.**
> "Never trust a health metric that a dead component can satisfy by doing nothing… The good metrics are the ones that require ongoing work to look healthy — which is exactly what a heartbeat is." (**replication**)
> "**Fenced-request count.** … it is the **only direct evidence you will ever get** that your fencing is doing anything. Zero forever might mean it's perfect, or that it's not wired up." (**leader-election**)
> "A hit ratio getting better is a **correctness alarm**, not a win." (**caching**)
> "A missing result renders as the *absence* of a problem, which is indistinguishable from the *solution* of one." (**rules-engine**)
> "it's insidious precisely because the SLI doesn't go red — it goes **quiet**." (**slos**, the 0/0 curveball, answered with a traffic-*absence* alert.)
> One portable question reused across four cards: "what does this metric do when the system is *broken*?" (**autoscaling**)

**S7 — Convert a correctness mechanism into a performance argument.**
> "**fencing buys back the failover time that safe waiting costs you.** That's a performance argument for fencing, not just a correctness one." (**leader-election**)
> "you are **reusing the failure path as a load-management tool**." (**real-time-delivery**)
*Propagate to:* every safety layer people cut for speed.

**S8 — State the PRECONDITIONS instead of the claim.**
> "Concentration is a genuine improvement **on three specific conditions**, and I'd state them as the conditions rather than as a claim… Fail any of those and I've made it worse." (**developer-platform**)
> "you cannot merge your way out of an invariant, but you can often **partition** it into local invariants that compose." (**consistency-models** — escrow, then generalized to inventory. **multi-region** reaches the same answer independently.)
*This is the direct antidote to Class J, which is the sweep's highest-value defect class.*

**S9 — The topic argues itself out of a job, or bounds its own recommendation, out loud.**
> "at two calls a minute there is *no* thread-exhaustion risk… This is a case where a breaker is close to **ceremonial**." (**circuit-breaker**)
> "at twenty percent deleted, I'd be straight that this is **hygiene, not a fix**." (**soft-delete**)
> "Being able to say 'I'd un-build this half' is a stronger signal than defending the whole thing." (**developer-platform**)
> "Usually **no** — and knowing that is the senior half of the answer." (**lambda-organization**, de-ranking its own subject against the levers that hold the money.)
> "Freezing is not 'safe,' it's **the least-bad option**, and I'd say so." (**autoscaling**)

**S10 — Two mechanisms, one symptom, separated by HOW EACH CLEARS.**
> "replication lag tracks load and clears on its own, while a stale-cache miss tracks the TTL and clears on invalidation." (**debugging**)
> "Concentrated per-partition lag is the symptom; per-partition **produce rate** is what proves it's skew rather than a stuck consumer — those look identical on a lag graph." (**kafka-internals**)
> "Flat means genuinely degraded — retry with a budget. Lumpy means one thing is broken — eject it." (**load-balancing**)
> "The bulkhead bounds the blast radius from the very first hung call; the breaker eliminates the calls entirely once it's convinced." (**circuit-breaker** — distinguishing confusables on the *time* axis rather than the purpose axis.)

**S11 — An ordering law that generalizes past its own topic.**
> "**Order them so a crash leaves you with a duplicate, never a hole.** Do the *recoverable* thing first and the *record that you did it* second." (**cdc** — belongs verbatim in idempotency, saga, retries-timeouts, kafka-internals.)
> "**err toward overlap, never toward a gap** — an overlap is absorbed by idempotency, and a gap is absorbed by nothing." (**cdc**)
> "you write the intent record *before* the irreversible step and mark it done after… converts the rare double-apply into a rare *skipped* apply." (**devices-dispatch**)
> "**you convert an unrecoverable loss into a recoverable delay.**" (**real-time-delivery**)

**S12 — Refuse the binary; relocate the axis.**
> "not 'coupled vs decoupled,' which is a fantasy, but **'can the two sides change on independent schedules?'**" (**microfrontend**)
> "They're not alternatives, they're **phases**." (**soft-delete**, on soft-vs-hard delete.)
> "**CAP describes the edge case; PACELC describes the everyday trade**, and nearly all real design pressure lives in the 'Else' half." (**consistency-models**)

---

## 7. Candidate next waves

Four shapes, sized against the operator's fleet rules. **All four are text/logic-only** — no browser-driven gate, no VR, no Playwright — so the browser-gated concurrency ceiling of ~2 builders does not apply; these can run wider. The real gate is build + compiler parity + a per-topic diff review.

### Wave A — `content/p0-floor` — **the 18 ship-blockers**
- **Scope:** 16 files, 18 edits. Every one is a clause-to-paragraph replacement, and every reader supplied both the offending text and the drafted replacement.
- **Why first:** 15 of 18 are the topic contradicting itself, so the correct text already lives in the same file — this is the lowest-risk, highest-value edit set in the sweep. It also unblocks 16 topics from "carries a wrong claim" to "carries only precision debt."
- **Effort:** ~1 day. 4–6 parallel builders (2–3 topics each), serial verified merge.
- **Gate:** build determinism check + a reviewer confirming each edit does not break the pane's surrounding argument (several P0 fixes strengthen the card and need the neighbouring sentence adjusted).
- **Ordering note:** do `debugging` and `event-driven` first — they carry 2 P0s each, and `debugging`'s two both contradict a *sibling topic file*, so their fixes must be reconciled against `consistency-models.md` rather than fixed locally.

### Wave B — `content/bank-regeneration` — SCALE + DESIGN + un-pushed curveballs
- **Scope:** the ~18 topics in Class A (regenerate the SCALE and DESIGN cards' `Model:` / `Int:` / `Int2:`), plus the ~11 topics in Class B (add an `Int:` to every curveball that has none).
- **Why:** the single largest *structural* class, with strong evidence of one template that missed an upgrade pass rather than 18 independent lapses. That makes it templatable — and readers supplied replacement `Int:` text for most cards, aimed at the seam each card's own `Model:` opens.
- **Two hard rules for the builders**, both learned the expensive way in this sweep: (1) the new `Int:` must be *unanswerable by re-reading the `Model:` above it* — that is the acceptance test, not "is it a good question"; (2) rewrite the `Model:` as spoken first-person prose, because the lowercase semicolon-chained checklist is the reliable tell that a card is from the old generation.
- **Effort:** 2–3 days. Wide-parallel safe (each topic is an independent file). Consider a mechanical pre-pass that flags every `Int:` whose answer shares >60% of its content words with the `Model:` above it — that turns discovery into a checklist.

### Wave C — `content/cram-surface-integrity`
- **Scope:** build a checker, then fix what it finds. The checker renders every string `cram-derive.js` actually lifts — `wb.steps[].a`, Trade-off tells and option `when` clauses, Numbers rows evaluated at defaults, `open.cards[0].items[0..1]`, Red Flags, curveball themes — and flags: dangling referents (an answer opening on "the ones" / "You do not" / "Both"), duplicate strings across sections, option bodies starting with "when" (which produce `…when when you need to…`), and ceiling rows whose value is not a number.
- **Why:** this is the artifact read five minutes before the loop, with zero repair context, and ~14 topics have a defect in it — including `replication` shipping the phrase its own Red Flags calls "the fastest no-hire" and `feature-flags` shipping the word its own topic calls the junior tell.
- **Then:** the ~21 topics in Class E get their Trade-off tells rewritten to carry a *trigger*, since that pane feeds the sheet's "Senior tells — say these" section verbatim.
- **Effort:** ~1 day for the checker, 1–2 days of fixes. The checker is durable — it becomes a standing gate check, like `build_determinism`.

### Wave D — `content/numbers-audit` — "do the defaults demonstrate the thesis?"
- **Scope:** a harness that, for every topic, evaluates `compute()` across the full declared input lattice and reports: (a) rows whose value never changes across any input (Class G2), (b) `over` flags that are never true or always true (Class G3 — this catches `lambda-organization`'s unreachable branch, `retries-timeouts`' dark badge, `distributed-locks`' "fits" default), (c) NaN/Infinity at declared minimums, (d) inputs that feed no arithmetic. Then fix the ~19 topics with a hit, and hand-check the Class G1 arithmetic/unit slips the harness can't see.
- **Why:** cheapest wave with a real mechanical detector, and it catches a P0 plus the whole class of panes that quietly teach the opposite of their own lead paragraph. The cram sheet takes its ceilings from `compute()` at defaults, so it overlaps Wave C's surface.
- **Effort:** half a day for the harness, ~1 day of fixes. Runs alone or alongside Wave B (different files touched at different offsets, but prefer serial merge).

### Wave E *(optional, after A–D)* — `content/propagate-the-winners`
Three targeted passes, each with a named donor so nothing is invented:
1. **Timeout-is-unknown** (Class I): 4 topics need the card; `error-propagation`, `consistency-models`, `retries-timeouts` and `devices-dispatch` already carry the exact sentence.
2. **The arithmetic-defense follow-up** (S1): add one "here is the wrong number you're about to say" beat to every topic that quotes a folklore constant.
3. **The fix's own failure mode** (S3): add an `Int2:` in that shape wherever a topic's answer is "add a component."
Effort: 2 days. Lower urgency than A–D, higher ceiling — this is what moves topics from *correct* to *above the reference*.

**Suggested order:** A → (C-checker + D-harness in parallel, both cheap) → B → C-fixes → E. Wave A is genuinely blocking; everything else is improvement.

---

## 8. What this sweep does NOT cover

State this plainly, because the coverage claim is easy to over-read.

- **It read SOURCE quality only** — the `.md` in `src/topics-md/`, as prose and as claims. Runtime, UX, layout, interaction, accessibility, motion and visual behaviour were covered by the **2026-07-19 8-lens audit** and the perf surface by the **2026-07-20 d3-perf wave**. Nothing here supersedes or re-checks those.
- **Nothing was built, rendered or run.** No reader opened the app, rendered a topic, or exercised a pane. The Numbers findings are *hand-recomputations of the `compute()` source*, not observations of what the pane displays. The cram-sheet findings are *reasoning about `cram-derive.js`*, not inspection of a generated sheet.
- **The compiler was not exercised against these edits.** Whether the proposed fixes parse, and whether the 2026-07-13 parity fix still holds after them, is a Wave-A gate question, not a finding here.
- **Cross-topic link targets were not systematically verified.** A few readers happened to check theirs (`cdc`, `sharding-strategies`, `microfrontend`, `developer-platform` all verified their System-pane indices and reported them correct). Most did not. The Class-D2 sibling-file contradictions were found *incidentally*, by readers who happened to know the neighbouring topic — which strongly implies there are more.
- **No pane-length, reading-time, or difficulty-calibration measurement.** "Above standard" is a claim about correctness and pushback quality, not about whether the topic is the right size.
- **One reader per topic, no adversarial second pass.** Per the standing rule, a verifier must be independent of the fixer — that applies here too: whoever fixes Wave A should not be the one who certifies it. The 305 findings are single-instrument observations; the P0s are individually well-evidenced (each cites the contradicting text) and should survive, but the P2/P3 tails are one reader's judgment.
- **`saga`'s own status is now ambiguous and should be resolved deliberately.** It is the certified reference *and* it came back at_standard with a P0. Either the 2026-07-19 certification stands and this sweep's instrument is stricter (in which case say so and keep saga as the anchor), or the P0 is real and the anchor needs the fix before it can anchor anything. Decide that before Wave A merges, because 28 verdicts are expressed relative to it.

---

## ERRATUM (appended 2026-07-29 by wR-fixer, residuals wave) — Class J, cdc, second clause

**Corrects one clause of one entry. The record is amended in place rather than rewritten,
because a sweep that quietly edits its own findings cannot be audited.**

Section 4, Class J, reads:

> **cdc**: per-key ordering guaranteed by hashing -- true only for a fixed partition count; and
> "without ever losing a change" with `acks` never mentioned in the file.

**The second clause is a FALSE POSITIVE and was NOT acted on. `cdc.md` is unedited.**

The string lives at `src/topics-md/cdc.md:1094`, inside `### Frames`, and it is an
**interviewer's design brief, not a guarantee the topic asserts**. All four bullets in that
block are quoted imperatives addressed to the candidate -- "Design a pipeline... without ever
losing a change.", "...Fix it.", "...Diagnose and redesign.", "...Walk me through it." It is
the requirement the candidate is handed, which is the opposite of a claim they volunteered.

That distinction is load-bearing for this class specifically. Class J is defined as *"A
guarantee asserted without the precondition that makes it true"* and justified as *"the highest-
value class for interview outcome, because these are precisely the claims an interviewer pushes
on -- and the candidate has volunteered them."* Here the interviewer said it. An interviewer
does not push back on their own brief, so the finding's own rationale does not reach this site.

The file also does not behave like one that over-claims durability. It teaches at-least-once
delivery with idempotent consumers (line 23), the transactional outbox, the mark-then-publish
inversion that "leaves a row marked `published = true` that was never published" (line 241),
the partition-count break in per-key ordering (line 260), and an entire curveball -- "Exactly-
once at the sink" (line 1085) -- whose stated Task is *"Grant what's true, then locate precisely
where the guarantee stops."* A topic carrying that card is not the topic this finding describes.

**On the supporting evidence.** "`acks` never mentioned in the file" is true of the Kafka
producer setting and only that; the token does appear, at line 116, as an ordinary verb ("hold
the write until the consumer acks"). More to the point, `acks` is not the missing precondition
for the sentence in question, because that sentence sets a requirement rather than making a
claim -- and the file's own durability mechanism is the outbox, which it covers at length.

**Scope of this erratum, stated so it is not over-read.** It corrects the second clause ONLY.
The first clause -- per-key ordering versus a changing partition count -- is **not adjudicated
here** and stands as written. Noted for whoever does take it up: the drill card at line 260
already carries the precondition explicitly, while the Spine bullet at line 23 states per-key
order without it, so that clause needs a per-site reading rather than a single verdict, and it
was outside this wave's brief.

Method: read the site and its surrounding block, traced both clauses with `git log -S` (both
date to the original authoring commit `d4e8527`, so neither was silently fixed by a later
wave), and checked the `### Frames` convention against sibling topics.
