# Wave A cold verification — `content/p0-floor` @ `fe73e90`

**Verifier** wA-verifier, independent of the fixer (no shared context).
**Subject** `content/p0-floor` @ `fe73e90`, 4 commits off master `6904668`, in `D:/claude-workspace/_worktrees/deepdive-rehearsal/w4-content`.

## VERDICT: CLEAN — no blocking findings. The merge train may proceed.

All 18 P0 replacements are correct engineering, each pane's argument survives the edit, and each fix
agrees with the rest of its own topic. The four "Beyond the finding" calls were attacked and all four
held — two of them I proved harder than the report did. The reconciliation ruling is right. Six
non-blocking observations are logged at the end; none of them should hold the merge.

| charter item | outcome |
|---|---|
| 1. Engineering correctness, all 18 in pane context | **PASS** — 18/18 |
| 2a. soft-delete SQL | **HELD** — executed, not reasoned. +1 non-blocking residual |
| 2b. autoscaling HPA mechanism + arithmetic | **HELD** — mechanism and both ratios confirmed |
| 2c. lambda dead branch / live crossover | **HELD** — re-run on the compiled artifact, 150-case sweep |
| 2d. the five extra sites | **HELD** — same defect each, no scope creep |
| 3. The `debugging` ↔ `consistency-models` reconciliation | **HELD**, incl. the deliberate non-edit |
| 4. Receipts with my own instrument | **100 assertions, ALL GREEN** (4 controls demonstrated) |
| 5. Full gate | **PASS** — 52 checks, 0 fail, **0 skip**; `build_integrity` strong form |
| 6. VR zero churn | **PROVEN BY HASH** — identical tree object |
| 7. Scope discipline | **CLEAN** — 16 topic .md + deliverable + freeze report, nothing else |

---

## 4. The instrument, and its controls (done first, because the receipts depend on it)

`render.mjs` + `control.mjs` + `receipts.mjs` in my scratchpad; nothing was planted in the tree.

The deliverable embeds content as JS string literals inside a `<script>`, and Shiki pre-renders code
blocks into per-token `<span>`s. A needle inside a code block is therefore split across spans *and*
carries backslash-escaped quotes, so a raw grep returns **false absences**. My renderer undoes JS
string escapes, strips tags (which rejoins the split tokens), then decodes HTML entities; `norm()`
then flattens markdown emphasis, dash style, quote style and whitespace on both sides.

I ran four controls, because "it found the thing" is not evidence — an instrument that answers FOUND
to everything would also pass that.

```
CONTROL 1  SENSITIVITY   raw grep 0, instrument 1, for three needles that ARE in code blocks:
                         "WITH claim AS"  "EXISTS (SELECT 1 FROM claim)"
                         "dedupe_store.claim(idempotency_key)"
                         -> the raw grep says ABSENT and is WRONG; the instrument is not fooled.
CONTROL 2  SPECIFICITY   0 for "the quick brown fox..." and for the offending
                         "PN-counter merges by taking the element-wise MAX"
                         -> the check CAN fail, so a 0 is meaningful.
CONTROL 3  PLANTED       a needle planted into a COPY, span-split into 3 tokens exactly as Shiki
                         emits: raw grep of the copy 0, instrument on the copy 1, instrument on the
                         ORIGINAL 0.  -> it genuinely reads inside code blocks and does not
                         hallucinate.  (Plant ran on a copy; the worktree was never touched.)
CONTROL 4  EMPHASIS      needles carrying ** still match ("a **smaller** compaction fan-out" etc).
```

**My instrument was wrong twice before it was right, and I am recording that rather than hiding it.**
Both were *false failures*, never false passes: (i) the entity map lacked `&rarr;`, and (ii) I
asserted the *authored* flow syntax against the *compiled* deliverable. A flow has two different
correct forms — `u[..] -> n[..] . d[..]` in source, a rendered chip strip in the deliverable — so the
receipt now asserts each against its own surface. This is the "every fresh instrument has a bug on
its first attempt" pattern; the controls are what caught it.

### The receipt control the freeze report did not have

The report's receipts assert *"offending 0/0, corrected 1/1"*. **That is only half a receipt: a
needle that never existed is also absent.** Every offending needle in my run is additionally required
to be **PRESENT AT MASTER `6904668`** — that is what converts an absence into evidence of a removal.

```
assertions : 100    failed : 0
offending needles that existed at master and are now gone from BOTH surfaces : 46 / 46
corrected needles present in BOTH source and deliverable                     : 54 / 54
RECEIPTS: ALL GREEN
```

---

## 1. Per-edit engineering verdicts

| # | topic | verdict | the load-bearing check I made |
|---|---|---|---|
| 1 | consistency-models | **CORRECT** | The block is a single map merged with element-wise `Math.max` and summed — that is a G-counter and it structurally cannot decrement. Read the code at l.518-527: unchanged apart from the comment, highlight marker intact. `sum(P) - sum(N)` is the correct PN-counter definition. |
| 2 | debugging | **CORRECT** | `col IS DISTINCT FROM 'value'` = `{col <> 'value'} ∪ {NULL}` — the opposite population from an include-filter. `IS NOT DISTINCT FROM` is null-safe equality, so a NULL row is FALSE and it excludes NULLs too: there is no form of the operator that works here. The added `COALESCE(col,'value') = 'value'` is genuinely equivalent to `col = 'value' OR col IS NULL`. |
| 3 | debugging | **CORRECT** | Lamport + node-id tiebreak is the standard total-order construction; a vector clock gives a partial order by design. See §3. |
| 4 | event-driven | **CORRECT** | Dedup must key on a producer-assigned payload id: an SQS **redrive** mints a new MessageId, so the broker id dedupes nothing across a DLQ round-trip. All four sites now agree. |
| 5 | event-driven | **CORRECT (deletion)** | Ack-before-work is the at-most-once trade — the message is deleted, nothing redelivers, and the failure is silent **loss**. It cannot produce a double charge. Inverted causality, correctly removed. Confirming evidence verified: see §2d note. |
| 6 | api-design | **CORRECT** | Read the whole Walk step. `claim()` is its own committed statement (it must be, to be visible to a concurrent retry); the effect and `complete()` share one transaction; the loser replays-or-409s; a lease covers a winner that dies mid-transaction. Self-consistent, and the model is one database throughout. |
| 7 | saga | **CORRECT** | See §7 below — the data-modifying CTE, the parameter renumbering, and the result-after-effect write all check out. |
| 8 | lambda-organization | **CORRECT** | See §2c — old branch dead across 150 cases, new one live in both directions. |
| 9 | autoscaling | **CORRECT** | See §2b. |
| 10 | developer-platform | **CORRECT** | Every figure re-derived at the topic's own defaults: 3 eng → 90 min/day → 1.5 eng-h → 240/1.5 = **160 working days ≈ 8 months**; 20% of 20 = 4 eng → 2 eng-h → **120 days = 24 weeks**; 50% → 5 eng-h → 48 days ≈ ten weeks (untouched, correct); defaults → 10 eng-h → 24 days ≈ five weeks. The maintenance argument is sound: at a 1.5 eng-h/day saving, >90 min/day of upkeep means it never pays. |
| 11 | devices-dispatch | **CORRECT** | MQTT keepalive is the client's PINGREQ liveness timer and carries no payload; a wake-up would be a PUBLISH on a subscribed topic; a subscription is a held TCP session per device. The claim reduced to "moves the cost off the dispatch tier" is the honest one. |
| 12 | observability | **CORRECT** | No-op factories fire only for an uninitialized provider. With a live SDK and a dead collector the tracer *is* initialized, spans are created and queued, and the bounded-queue batch exporter is what drops. The flow renders correctly — see §12. |
| 13 | probabilistic-structures | **CORRECT** | If every row is ≥ the true count then *every* order statistic of them is ≥ the true count — min, median and max alike. The min is chosen for tightness, not for the guarantee. The discarded fact is correctly re-homed: the Count Sketch uses random ± signs, its per-row estimates are two-sided, and its standard estimator is the median for exactly that reason. |
| 14 | rules-engine | **CORRECT** | Numbers default confirmed at `rules-engine.md:847` — `cycleMin \| Eval cycle (min) \| 5`. The SDE2 card at l.143 already said *"The mistake is saying 'instant' — it is 'next cycle'"*, so the Staff lead was contradicting its own topic. One-clause fix. |
| 15 | sharding-strategies | **CORRECT** | A keyed query routes to one shard and stays at `(1-p)`; `(1-p)^8` is `P(whole cluster healthy)`; `(1-p)^N` per-request is the **fan-out** number. Outage frequency ≈ 8p for small p, blast radius 12.5%. The conclusion (replicate each shard) is untouched and still follows. |
| 16 | slos | **CORRECT** | Budget spent = burn × (window/SLO window): 14.4×(1/720)=2%, 6×(6/720)=5%, 1×(72/720)=10%. The **ticket** rule fires at the highest budget, so the original wording convicted the standard ladder. After the swap the clause's own tail ("page too late and ticket too early") agrees with its lead. |
| 17 | soft-delete | **CORRECT** | See §2a — executed in SQLite, which implements MATCH SIMPLE semantics exactly. |
| 18 | storage-engines | **CORRECT** | Leveled write amp ≈ `T·log_T(N/M)`; `T/ln T` is increasing for all `T > e ≈ 2.718`, so raising the fan-out makes it worse. The numbers are internally consistent at `N/M = 10^6`: T=10 → 60×, T=4 → **39.9×** ("~40×"), T=20 → **92.2×** (the Staff drill's "~92×"). Space amp `T/(T-1)` and "more levels to probe" are the right costs. |

---

## 2. The four adversarial attacks

### 2a. `soft-delete` — the fixer's own schema, **executed** rather than reasoned

SQLite implements MATCH SIMPLE semantics exactly (it parses `MATCH` clauses but always behaves as
MATCH SIMPLE), which is the precise semantics the claim rests on. Results:

```
CLAIM A: the nullable composite FK is a no-op for a live parent
  [REJECTED] child -> (99999, '2020-01-01')  both non-null, bogus parent   <- proves FK is ON
  [no-error] child -> (99999, NULL)          the LIVE-parent shape, parent NEVER EXISTED
  [REJECTED] plain-FK child -> 99999         what the composite REPLACED
  => the composite FK is not merely weaker, it is STRICTLY weaker: the plain FK it
     replaced rejects the same row. "It stopped guaranteeing even existence" is literal.

CLAIM B: the NOT NULL liveness mirror
  [no-error] child -> live product 7
  [REJECTED] child -> product 99999 that never existed      (existence restored)
  [REJECTED] child claiming a dead parent (is_live=0)       (CHECK)
  [REJECTED] UPDATE products SET is_live=0  WHERE id=7      HAS a child  <- the RESTRICT claim
  [no-error] UPDATE products SET is_live=0  WHERE id=8      no child

CLAIM B2: the ON UPDATE CASCADE design the fixer REJECTED
  [REJECTED] UPDATE products SET is_live=0 -> bounced by CHECK constraint on parent_is_live
  => the report's reasoning is exactly right: the cascade reaches the same outcome by a
     longer road, with the CHECK doing the rejecting instead of the FK. Overriding the
     reader here was justified, not merely preference.
```

**The attack that landed (non-blocking, see F1):** a **soft-deleted child still blocks the parent**,
and it cannot release its claim — `CHECK (parent_is_live)` forbids setting it false. So the schema
enforces *"a parent with **any** children cannot be retired"*, while the prose says *"live children"*
and the topic's very next card defines RESTRICT as *"refuse to delete a parent that still has live
children."* This over-enforces relative to its label. It errs on the safe side and makes the pane's
stated price an understatement, so it strengthens rather than undermines the pane's conclusion.

### 2b. `autoscaling` — mechanism and arithmetic

Every mechanism claim is accurate to the documented HPA algorithm: not-yet-Ready pods are set aside;
the ratio is computed on ready pods; on a would-be **scale-up** the set-aside pods are added back
**assuming 0% consumption**; and if the recomputed ratio reverses direction or lands within tolerance
the controller skips scaling and returns `currentReplicas`.

Arithmetic at the card's own numbers (10 replicas, 5 crash-looping, 5 pinned at 100% of request,
target 70%): ready-only `100/70 = 1.4286 → **1.43**`, outside the ±0.1 tolerance, so scale-up.
Recomputed `(5×100 + 5×0)/10 = 50`, so `50/70 = 0.714 → **0.71**`. Direction reverses → no scaling.
**Both printed figures are right.**

The card's closing precision is better than it needed to be and is also correct: a pod that passes
readiness and *then* crashes is not set aside, which is exactly why that case still runs away on CPU.

**Queue depth over ingress RPS — the choice holds.** The claim is that fleet-level signals have "no
per-pod readiness to set aside, so the 0% dampening never applies." That dampening lives in the
pod-based resource-metric path only, so it is true. It is *exactly* true for the mechanism the card
names: a KEDA scaler emits an External metric with an `AverageValue` target, whose replica
calculation is `ceil(usage / targetPerPod)` — entirely readiness-blind. The punchline also stays
literally true, which is the reason the fixer gave: a crash-looping fleet drains nothing, so the
queue rises *because* of the failure. (One nuance not worth putting in a card: Object/External
metrics with a `Value` target do scale by `readyPodCount`. It falsifies nothing the card says.)

### 2c. `lambda-organization` — re-run on the compiled artifact

I loaded `src/topics/_generated/lambda-organization/num.js` (the compiled slice that actually ships)
and first proved **`compiled compute === the .md JS block`**, so running the authored block is running
the shipped code. The old function came straight out of `git show 6904668:`.

**The old branch was dead, and more comprehensively than the report claimed.** I swept 150 cases
across the full legal input range (rps 1–20 000, durMs 1–15 000 — the Lambda ceiling — memMb
128–10 240):

```
cases swept                : 150
cases hitting "LAMBDA WINS": 0      <- the branch is unreachable at every legal input
LOWEST ratio anywhere      : 2.1    at rps=1  dur=100  mem=10240
HIGHEST (degenerate)       : 205.9  at rps=1  dur=1    mem=128   (report said 205x)
```

I also confirmed the report's algebra independently. The ratio reduces to
`2.1228 + 25.474/(durMs·gb)` and **rps cancels entirely** — verified numerically: rps = 1, 200 and
20 000 all return 2.3×. Its infimum is 2.1228, so `over: ratio > 1` could never be false. The
report's spot-check reproduces: `1 rps / 100 ms / 512 MB → 2.6×, move to containers`.

**The new function has both branches live**, 452 / 448 across a 900-case sweep, and the report's
six-row table reproduces exactly (100%/2.3×, 50%/1.2×, 33%/0.8×, 10%/0.2×, 100%/0.3×, and a
"huge steady" row whose inputs the report did not state — my substitute lands on the same branch).

**The crossover is real and the pane tells the reader the computed value.** The branch flips between
`peakToAvg` 2.3 and 2.34, i.e. **43% utilization**, and the pane's own note reads *"the two options
meet at about 43%"*. The old hardcoded `roughly 50% utilization` string is gone from the file. The
crossover is correctly derived (`ratio(u) = flatRatio·u/100`, so `u = 100/flatRatio`) and is
independent of `peakToAvg`, which is right — it is a property of the cost shape, and `peakToAvg`
tells you where you sit relative to it. The 0.25 vCPU / 0.5 GB floor is a real Fargate minimum.

### 2d. The five extra sites — all legitimate, no scope creep

Each was confirmed **present at master and removed at the tip** by the receipt run, and each carried
the same defect as its listed sibling:

1. **event-driven l.245** (SDE3 dedup store) — opened *"A keyed record of processed message ids"*: the
   same defect verbatim. The replacement also sharpens the business-key example from a bare `order id`
   to `hash(order_id, 'shipped')`, which is a genuine correction — a bare order id collides across
   event types for the same order. Not damage.
2. **probabilistic-structures Senior** — *"a median/mean would break the one-sided guarantee"*: the
   compressed form of the same false claim. Leaving it would have made the card contradict its own
   corrected body. The otherwise-correct conservative-update half is untouched.
3. **developer-platform Senior l.403** — *"a small team makes it never pay"*: same defect.
4. **developer-platform Numbers row note l.862** — *"most of a year for a 3-engineer team"*. This is
   the weakest of the five *as a defect* (160 working days ≈ 32 weeks ≈ 7.4 months, which "most of a
   year" overstates but does not flatly contradict). It is still in scope: the pane computes
   `payback = 160` working days at a 3-engineer team, so the note now quotes the same figure the pane
   computes **and** the same figure the corrected drill states. Consistency justifies it.
5. **debugging Senior l.141** — endorsed `IS DISTINCT FROM` as *the* forensics tell for a trap it does
   not fix; same defect. The already-correct `Follow` at l.139 (*"everything except value, NULLs
   included"*) was correctly left alone — I verified that reading is right.
6. **devices-dispatch Senior l.202** — *"buys the latency without the sockets"*: the identical false
   claim in the memorisable form. The correct C10K/relocation half of the sentence is preserved verbatim.

Also verified, on edit 5's supporting argument: the card's `FRAME` does say *"in one of **four**
specific ways"* and *"three of them look identical from the outside"*, and its `CLOSE` enumerates
exactly four (random id, racy check, expired TTL, cross-system crash). The deleted clause was a
**fifth** suspect smuggled into SUSPECT FOUR and named in neither. Deleting it restores the card's
arithmetic — the fixer's independent-confirmation argument is sound.

---

## 3. The reconciliation, verified independently

Both engineering claims are true, and I reached the same ruling from the sources rather than from the
report.

- **`IS DISTINCT FROM` is a null-safe *inequality*.** `col IS DISTINCT FROM 'value'` returns
  `{col <> 'value'} ∪ {NULL}` — the opposite population from the include-filter it was offered to fix.
  There is no working variant: `IS NOT DISTINCT FROM 'value'` is null-safe *equality*, and since
  `'value'` is not NULL a NULL row evaluates FALSE, so it excludes NULLs too.
- **A vector clock does not give a total order.** It yields a partial order and exists to *detect*
  concurrency; when neither version dominates, the honest output is "concurrent". A Lamport clock
  alone permits ties; **with a node-id tiebreak** it does give a total order, which is what made the
  original compound misleading rather than obviously wrong.

**The two files now agree.** `consistency-models.md:161` says a wall-clock timestamp "always yields a
total order, so it can never *detect* concurrency", and its version-vector treatment is partial-order
throughout; `debugging.md:1050` now splits the vector clock out explicitly as deliberately *not* a
total order. `consistency-models` was correctly identified as the sound sibling and received nothing
beyond its own listed P0. I independently confirm the ruling.

**The deliberate non-edit was right.** The curveball's `Model:` line offers "a monotonic sequence, a
**version vector**, or a timestamp generated by a single authority" as ways to *order writes* — it
never claims a **total** order, and for the stated symptom ("the older value keeps winning" under LWW)
a version vector is the correct tool precisely because it surfaces the conflict instead of silently
picking wrong. The corrected `Int:` line sits directly beneath it and supplies the total-order
precision. The pane now teaches the distinction rather than merely avoiding the error.

**Corpus-wide check:** `IS DISTINCT FROM` appears in exactly one file (`debugging.md`, 4 occurrences)
and **all four are now in a correct context**. The topic is internally consistent on the operator.

---

## 7 & 12. Two mechanisms I checked in full rather than by diff

**`saga` — the data-modifying CTE.** Read the whole block. `EXISTS (SELECT 1 FROM claim)` reads the
CTE's `RETURNING` output, not the table, so it is true exactly when the INSERT actually inserted; on a
duplicate `ON CONFLICT DO NOTHING` returns no row, EXISTS is false, and the decrement does not run.
A data-modifying CTE is executed exactly once and always to completion, so the claim is recorded
either way. The parameter renumbering is complete and consistent ($1 saga_id, $2 step_id, $3 sku,
$4 result). The `result` write is a **separate statement in the same transaction**, so it sees the
CTE's insert, and its `AND result IS NULL` guard means a duplicate delivery cannot overwrite the
stored result. The caption's "Three things are load-bearing" now names the gate explicitly. Correct.

**`observability` — the flow.** The compiled slice renders
`tracer uninitialized→calls become no-ops·collector down or slow→exporter drops from a bounded
queue→business logic unaffected`. I verified the connector claim at source: `tools/compiler/flow.mjs:21`
defines `CONN = { '->': '&rarr;', '.': '&middot;', '/': '/' }` and **line 34 throws on an unknown
connector** — so an invalid `.` would have failed the build, not degraded silently. The `.` is valid
and renders as `·`, exactly as claimed.

---

## 5, 6, 7. Gate, VR, scope

**Gate — PASS.** Run on the frozen tip, verdict read from a capture file, never a piped exit code.

```
BUILD_RC=0     GATE_RC=0     GATE: PASS
52 checks   PASS 52   FAIL 0   SKIP 0
```

`build_integrity  PASS  (11784837 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the
deliverable, COMMITTED deliverable == fresh build of HEAD)` — **the strong form**. I also proved it
independently and outside the gate: I snapshotted the committed deliverable *before* building
(`git hash-object` = `46ac5661846bd7fedb67c2bafd85172f16fc1a29` = the HEAD blob), then ran the build
and re-hashed — identical, and `git status` was empty before *and* after.

The browser checks genuinely ran; this was not the CI-safe subset (`check_all.py` skips them when
Playwright is absent, and 0 were skipped). `visual_regression PASS (16 baselines, win32-chromium149;
every capture reached a proven rest state across all 18 roots, cleared the blank-page floor, and
matched its committed pixels)`. `ascii_guard`, `compiler_conservation`, `topic_contract`,
`cram_scope_distinct`, `build_determinism`, `unit_tests` (72/0) all PASS. The only "skip" string in
the log is `syntax_check`'s routine "52 aggregator files skipped", exactly as the report said.

**Discrepancy (non-blocking, F5):** the report claims **55** checks; my run counts **52**. 0 fail and
0 skip either way, so nothing is hidden by it — it is a bookkeeping error in the durable record.

**VR — zero churn, proven by hash, not by trust.** The strongest available form: the `test/baselines`
**git tree object is identical on both sides** — `0762dad9d2a28359ee1ba632651adb835df344c9` at both
`6904668` and `fe73e90`. A tree hash is a Merkle root over every entry's name, mode and blob hash, so
one comparison proves all 18 entries (16 PNGs + `README.md` + `manifest.json`) byte-identical.
`git diff 6904668..fe73e90 -- test/baselines/` is empty.

**Scope — clean.** The diff is exactly 18 files: the 16 topic `.md`, the deliverable, and the new
`_audit/2026-07-20-p0-floor.md`. No test, tool, baseline, style, CSS or JS file is touched.
`src/topics/_generated/` is gitignored, so nothing compiled leaks into the diff.

**The logged P1s were not fixed**, as required: `api-design`'s caption-by-position is still the
error-contract paragraph; `event-driven`'s consumer code still binds `dedup.claim(msg.id)`;
`lambda`'s `memMb` got no treatment beyond the disclosed Fargate floor; `autoscaling`'s redundancy
remains. I also confirmed **all 46 topic `.md` files are 7-bit ASCII** — `ascii_guard` only covers
`src/` `.js`/`.css`/`.html`, so I checked the markdown directly; the fixer's U+2212 characters are
genuinely gone.

---

## Non-blocking findings

**F1 — `soft-delete`: the schema is stricter than its own label.** A soft-deleted child still blocks
the parent's retirement and cannot release its claim, because `CHECK (parent_is_live)` forbids setting
the mirror false. Demonstrated empirically. The pane says "live children" and the topic's next card
defines RESTRICT the same way, but the construct actually means "any children, ever". It is safe-side
over-enforcement, and it makes the pane's stated price an understatement, so the pane's conclusion
(most teams take detection instead) is unchanged and in fact reinforced. **Wave B fix is one clause** —
drop "live", or note that a child must be hard-deleted or archived to release its claim. This also
makes the topic's own CASCADE policy unimplementable under this schema, which is worth a half-sentence.

**F2 — `lambda-organization`: 43% now sits beside eight surviving "roughly 50%" claims** (l.466, 471,
472, 624, 665, 771, 775, 779). Not a contradiction: those sites explicitly hedge ("a back-of-envelope,
not a law", "the point is not the exact figure"), and the Numbers pane scopes its number with "for
this shape" / "for this function". But the freeze report's claim that 43% "**is** the topic's own
'roughly 50%' claim, now computed" overstates the agreement — 43% is *near* 50%, not equal to it. A
Wave B pass could point those sites at the Numbers pane rather than restating a fixed figure.

**F3 — `autoscaling`: one over-generalisation, harmless.** "No per-pod readiness to set aside" is
exactly right for the KEDA/External-`AverageValue` path the card names, but Object and External
metrics with a `Value` target do scale by `readyPodCount`. Nothing the card asserts becomes false;
adding this would be over-detail for an interview card. Recording it so a future reader does not
"discover" it as a defect.

**F4 — `saga`: a pre-existing gap, NOT introduced by this fix.** If `available = 0`, the claim is
still recorded (a data-modifying CTE always runs to completion) and the result is still written, so a
retry replays "success" for a step that never decremented. **The old code had identical behaviour** —
this is not a regression and was out of scope for a P0 factual wave. Worth a Wave B look since the
block is the topic's only worked idempotency example.

**F5 — the freeze report's gate count is wrong: 55 claimed, 52 actual.** 0 fail / 0 skip either way.
Worth correcting in the durable record before it is cited.

**F6 — `developer-platform` l.862 is the weakest of the five extra sites** as a defect claim
("most of a year" for 7.4 months is loose rather than false). It is still the right edit, because the
pane's note, the pane's computation and the corrected drill now all quote the same figure. Recorded
so the "18 P0s" count is not read as "18 flatly false statements" — this one was an imprecision.

---

## Evidence pins

| what | where |
|---|---|
| frozen tip, clean before and after the build | `fe73e90e8ddfd55c74c844f80887b6b24ebf4098`, `git status --porcelain` empty |
| committed deliverable blob | `46ac5661846bd7fedb67c2bafd85172f16fc1a29` (= fresh build of HEAD) |
| deliverable sha256 | `3cdf0c4b03fe29c3186ed130a638eb0c040e3694b488bf7dfcfa1340d86a3c20` |
| baselines tree object, both sides | `0762dad9d2a28359ee1ba632651adb835df344c9` |
| gate capture | `<scratchpad>/cv/gate.log`, `<scratchpad>/cv/gate_meta.txt`, `<scratchpad>/cv/build.log` |
| instrument + controls | `<scratchpad>/cv/render.mjs`, `control.mjs` |
| receipt run (100 assertions) | `<scratchpad>/cv/receipts.mjs` |
| soft-delete SQL execution | `<scratchpad>/cv/sqltest.mjs` (node:sqlite, MATCH SIMPLE semantics) |
| lambda compute re-run | `<scratchpad>/cv/lambdatest.mjs` (compiled slice + master .md) |

scratchpad = `C:/Users/Dell/AppData/Local/Temp/claude/D--claude-workspace-deepdive-rehearsal/bfc4e186-9eb0-4148-a383-84020244f407/scratchpad`

Nothing was planted in the tree; the instrument's planted-defect control ran on a copy. No source
edit, no commit, no push, no merge.
