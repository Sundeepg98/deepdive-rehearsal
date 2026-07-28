# Wave E — cold verify, and the content campaign's closing measurement

**Verifier** wE-verifier (cold; no shared context with any builder)
**Subject** `content/wave-e` @ `221e6ab` (8 commits off master `1f95f68`), worktree `w9-waveE`
**Date** 2026-07-29 | **Tree left exactly as found** — no edits, no commits, no stash, no merge

**VERDICT: 1 BLOCKING, 3 NON-BLOCKING.** The blocking one is a single self-contradicting clause
in the wave's flagship arithmetic beat. Everything mechanical is green on a clean re-run.

| | finding | file |
|---|---|---|
| **BLOCK** | load-balancing: "3% at *any* volume" contradicts the sqrt scaling stated two sentences earlier | `src/topics-md/load-balancing.md` |
| nit | devices-dispatch: "more than an order of magnitude" is 8x by the card's own two numbers | `src/topics-md/devices-dispatch.md` |
| nit | replication Whiteboard step omits "**completed**" write — the qualifier the same file gives at 8+ other sites | `src/topics-md/replication.md` |
| nit | `overlay_deadzone` crashed on gate run 1 and passed on run 2 + standalone — the known browser-gate flake class | harness |

---

## JOB 1 — WAVE E VERIFY

### 1.1 BLOCKING — load-balancing's closing clause contradicts its own arithmetic

The new `Follow: Put a number on it.` on the power-of-two-choices drill card ends:

> "...note the practical size of the win here is about 3%, which sounds unimpressive until you
> notice it is **3% at *any* volume** rather than 3% today."

**Re-derived at n = 100 backends.** One-choice excess is `sqrt(2 * (m/n) * ln n)`; two-choice
excess is `ln ln n / ln 2` and is independent of `m`:

| m | mean (m/n) | 1-choice peak | 2-choice peak | win as % of peak |
|---|---|---|---|---|
| 10,000 | 100 | 130.3 | ~102 | **21.7%** |
| 1,000,000 | 10,000 | 10,303 | ~10,002 | **2.9%** |
| 100,000,000 | 1,000,000 | 1,003,035 | ~1,000,002 | **0.30%** |

The percentage win **shrinks monotonically with volume** — necessarily so, because the excess
grows like `sqrt(m/n)` while the mean grows like `m/n`. The card *states that scaling itself*, two
sentences earlier ("the excess scales like the square root of `m/n` times a log factor"), so the
paragraph convicts itself. This is the exact failure mode the beat exists to prevent, on the wave's
flagship arithmetic-defense card, in an answer a candidate would repeat verbatim and be caught on.

**Everything else in that paragraph re-derives CORRECT** and should be kept:
`log log n / log 2` at n=100 = 2.20 ✓ · busiest holds ~10,002 ✓ · "wrong by a factor of about
5,000" (10,002/2 = 5,001) ✓ · `sqrt(2 x 10,000 x ln 100)` = 303.5 → ~10,300 ✓ · "the term does not
grow with `m`" ✓ (the heavily-loaded balanced-allocations result — Berenbrink/Czumaj/Steger/Vöcking;
the card is right that this is a stronger claim than the n-balls-into-n-bins form) · "the imbalance
stops growing" ✓.

**Fix is one clause.** The true version is stronger than the false one: with two choices you
provision to *the mean plus a constant* at any scale, while one choice makes you buy headroom that
never stops growing in absolute terms. Say that instead of "3% at any volume."

### 1.2 NON-BLOCKING — devices-dispatch's order-of-magnitude

The card calls the 200 MB strawman "wrong by **more than an order of magnitude**". By its own two
numbers — 50,000 x 4 KB = 200 MB versus 50,000 x 32 KB = 1.6 GB — the factor is **8**. Defensible
only once you add the kernel socket memory and per-device session state the card goes on to name
(which plausibly clears 10x), but the nearest computable referent is 8x, and this is a beat about
arithmetic precision. One word ("nearly an order of magnitude", or "roughly eightfold on buffers
alone").

Everything else verified: TLS max record 2^14 = 16 KiB ✓ · read+write ≈ 32 KB/connection ✓ ·
nginx `ssl_buffer_size` default 16k ✓ · 50,000 x 32 KB ≈ 1.6 GB ✓ · "C10K solved the event loop,
not the buffers" ✓.

### 1.3 The arithmetic the freeze said it re-derived — independently re-derived, all CORRECT

**slos** (not edited; verifying the wave's evidenced NO): `0.999^3` = 0.99700 ✓ · 0.1% of 43,200 =
43.2 min ✓ · ladder 7.2h / 43min / 4.3min / 25.9s ✓ · 99.95% → 21.6 min ✓ · burn 1%/0.1% = 10x →
3 days ✓ · total outage 1000x → 43.2 min ✓ · 10x for 1 min = 0.023% ✓ · 2x for a week = 46.7% ✓ ·
`0.999^4` = 99.6% → 1 in 250 ✓ · `0.999^(1/4)` = 99.975% ✓ · 1,000 rps x 30 d = 2.592e9, budget
2.592e6 ✓.

**On the annual-vs-30-day beat the dispatch asked about: it does not exist, and there is nothing to
find.** The window is uniformly 30 days at all 30+ arithmetic sites in the file. No conflation.

**probabilistic-structures**: 1/ln 2 = 1.4427 ✓ · 1.04/sqrt(2^14) = 1.04/128 = 0.8125% ✓.

### 1.4 The three pass-3 Int2s — all TRUE, seam-aimed, in-voice

- **retries-timeouts / single-flight.** Both halves correct. The silent one is the sharper: a
  single-flight key coarser than what the response varies on serves one caller's answer to the
  other ninety-nine — no error, no latency spike, indistinguishable from a cache hit, and a
  cross-tenant leak. Grounded: the card's own Model prescribes "request coalescing / single-flight".
- **saga / lagging tracker.** "A lagging tracker does not look lagging, it looks authoritative" is
  correct and is the right seam; offset+timestamp stamping and refusing past a staleness bound are
  the right prescriptions; "the only component subscribed to all nine services' events" is grounded
  in the card's own nine.
- **event-driven / unwatched DLQ.** Closes on the prior Int's own word ("visible") — that is a real
  seam, not a manufactured one. Age-of-oldest over depth is correctly argued (a steady trickle never
  trips a depth threshold). Replay idempotency justified by records that overtook it.

### 1.5 The four Class-I beats — correct, and each grounded in its card

- **circuit-breaker.** Grounded in the card's own "durably enqueue the intent... drain it when the
  dependency recovers" and its "taking a payment". Worth recording: it also *resolves a pre-existing
  tension* in that card, where payments appear as the example on **both** the deferrable and the
  non-deferrable side — the new Follow makes deferrability conditional on the processor supporting
  an idempotency key. Net improvement to the card, not just an addition.
- **rate-limiting.** `INCR` non-idempotent ✓; the direction is right (over-count → 429s for traffic
  never sent → arrives as a support ticket, not an alert); "retried never, fall through to the local
  bucket" ties correctly to the card's Model; under-counting is the safe direction ✓.
- **debugging.** Known (4xx/validation) vs unknown (timeouts, 5xx on a write path) split is right;
  the loud-incident/silent-replay inversion is the donor shape used correctly; the closing callback
  to the Model's own idempotency ask is a genuine internal thread.
- **backpressure.** The strongest of the four. Correctly scopes deadline-drop as free for reads and
  not for writes, gives the two right rules (check before the side effect; idempotency key where the
  effect can begin first), and lands "this failure inverts the topic's own instrument — it moves
  neither goodput, latency, nor queue depth."

### 1.6 replication's k-of-n clauses

Postgres `ANY 1 (s1, s2, s3)` is correct syntax (PG10+) and correct semantics; "pays the **k-th
fastest** rather than the slowest" is the right framing; both sites are self-contained with no
dangling referent, which matters because the Whiteboard step feeds the cram sheet.

### 1.7 COLD PASS OVER THE PASS-3 FUNNEL — the funnel reproduces exactly

I parsed all **585** Bank cards independently. At the tip, **320** lack an `Int2`. The wave added
six (5 CURVEBALL + 1 FAILURE), so pre-wave = **326** — and the tag breakdown matches the freeze
**row for row**: 278 CURVEBALL, 29 CLOSE, 12 STRUCTURE, 5 FAILURE, 1 SAFETY, 1 FRAME.

**Six rejections sampled; all six hold, each verifiable in the card text:**

| card | why the rejection holds |
|---|---|
| circuit-breaker `the protection is the dependency` | CIRCULAR confirmed — the card's *premise* is the added component (Redis-held breaker state) failing |
| multi-tenant `the cache` | CIRCULAR confirmed — the card's *answer* is the cache leaking, and its Model already generalizes to the search index, object store, queue and rate limiter |
| **caching `stampede`** (sharpest test — near-twin of the one that LANDED) | Model already names single-flight's own failure inline: *"you're now parking a thousand threads for the length of the recompute, which is its own outage if the rebuild is slow."* Adding it would also have risked the novelty ratchet against the retries-timeouts beat |
| autoscaling `thundering herd` | the card's existing `Int:` **is** the S3 beat ("Warming before Ready... Isn't that a step backwards?") |
| saga `Poison saga` | existing `Int:` **is** the S3 beat (a dead-lettered saga still holds reserved inventory) |
| event-driven `Silent loss` | Model already names the added component's failure ("a **stalled relay**") |

**developer-platform's skip is SOUND — and better grounded than the freeze states.** All 44 timeout
mentions are `statement_timeout`, idle-timeout and connection-timeout: latency and resource
ceilings. More decisively, the topic's core scenario is explicitly **read-only** ("prod is
SELECT-only", "a read-only role or a replica"), so an ambiguous *mutation* outcome is not this
topic's shape at all.

### 1.8 MECHANICAL

**The gate needed two runs, and the discrepancy is worth recording.**

- **Run 1:** 57 PASS / **1 FAIL (`overlay_deadzone`)**, exit 1. Its summary line was
  `Node.js v25.2.1` — the tail of a Node crash banner, i.e. the check *died* rather than asserted.
- **Diagnosis:** `overlay_deadzone` standalone → **35 assertions PASS, exit 0**. Checks run
  **serially** (`subprocess.run`), so this was not internal concurrency. Box was not saturated when
  observed (CPU 29%, 13.5 GB free of 31.7 GB), but 26 node + 14 chrome processes were alive from
  concurrent session activity.
- **Run 2** (full gate, same tip, clean tree): **58 PASS, 0 FAIL, 0 SKIP, exit 0 — GATE: PASS.**
- **Verdict: transient crash under sibling load, not a defect.** Four independent green results now
  exist (builder x2, my standalone, my run 2). NON-BLOCKING — but this is the browser-gate flake
  class the project already knows, and it can turn a clean wave red at random.

**Ratchets at the tip — all four green, and they match the freeze:**

| ratchet | measured at `221e6ab` |
|---|---|
| `bank_pushback` | PASS — **613 cards**, 0 allowlisted, debt `{}`. Unchanged from pre-wave 613, so no card was created |
| `bank_novelty` | PASS — **826** exchanges, longest shared run **8 < 9**, **826/826 kept** (re-run, as asked) |
| `cram_surface` | PASS — 0 allowlisted, mirror verified against `deriveCram` on all 46 |
| `numbers_lattice` | PASS — 46/46, 567,131 evaluations, 1 defect, allowlisted (pre-existing) |

- `build_integrity` **PASS with its strongest arm firing** — "COMMITTED deliverable == fresh build of
  HEAD", 12,039,399 bytes, matching the freeze's stated size exactly. Tree was clean at both runs;
  captures written outside the repo, so the arm was never deferred.
- `build_determinism` PASS (88 Shiki blocks identical under a simulated 600 ms/line stall; the
  control confirmed the stall trips a default-budget tokenizer).
- **VR 16/16 PASS**, "matched its committed pixels", win32-chromium149 — byte-identical to master.
- Scope confirmed: 11 topic files, **54 insertions / 12 deletions**.
- **Donor citations: 6/6 sampled point at real donor text** (retries-timeouts' "a timeout is an
  UNKNOWN, not a failure"; consistency-models' "an error is not a rollback"; error-propagation's
  "at-least-once plus an idempotent..."; devices-dispatch C10K; idempotency; debugging).

---

## JOB 2 — THE CAMPAIGN'S CLOSING MEASUREMENT

**Sample (8):** multi-tenant, replication, distributed-locks, soft-delete, lambda-organization,
developer-platform — plus **cdc** and **error-propagation** as controls (**no wave ever edited
either**; confirmed against git). Class-level checks also drew on caching, saga, circuit-breaker,
observability, sharding-strategies.

### Class A — Model-answerable pushbacks: **EXTINCT in sample (0 survivors)**

Read, not tool-run — paraphrase is the tool's blind spot. All seven SCALE/DESIGN `Int:` lines in the
sampled topics are genuine seam-aimed probes the Model does not answer. The best of them walks
straight into the Model's own advice: distributed-locks' *"your first move was dedup by run-id — the
run charges two hundred thousand customers and dies at the halfway mark. Walk me through the retry."*

All four sweep-quoted instances are **gone verbatim**. The one apparent hit — "where does the tenant
id come from" — survives only as an **SDE2 Drill card question** and a **Whiteboard step heading**,
which are its correct homes, not a Bank pushback.

**GUARDED-BY** `bank_pushback` (no_int2 arm, scoped SCALE/DESIGN): debt `{}`, and zero SCALE/DESIGN
cards lack an `Int2`.

### Class E — tells with no flipping trigger: **EXTINCT in sample (0 survivors)**

All eight sampled tells now name a switch condition. The five sweep-quoted tells are gone verbatim;
"Co-locate" survives only inside the axis label "co-locate vs global index", which is the correct
framing. Examples: circuit-breaker now names **both** failures ("a sensitive breaker flaps on a
healthy dependency; a conservative one lets a dying one keep taking traffic"); replication now says
"what would make you pick pure async, and what would make you pay for consensus."

**Honest caveat:** my never-edited control (error-propagation) *also* has a sound tell, so for this
class the control cannot separate "fixed" from "was never broken at this site."

**GUARDED-BY** nothing mechanical — this class is human-read only.

### Class G3 — dead Numbers flags at authored defaults: **EXTINCT at all named sites**

I built an evaluator that runs each pane's `compute()` at its authored defaults. *Its first version
had a bug* — it read `{k, d}` when the slice schema is `{id, value}`, so every input was `undefined`
and every comparison saw `NaN`. Caught because it disagreed with my hand-computation of
retries-timeouts; fixed and re-validated against that hand-computation before any finding below.

| site | sweep said | measured now |
|---|---|---|
| retries-timeouts | "4 afforded vs 3 configured — badge stays dark" | **2 afforded vs 3 configured, flag FIRES** |
| distributed-locks | "fits (17s spare)" — the opposite of the topic's thesis | **"YES: expires unsafe"** (op 5s + pause 45s vs a 30s TTL) |
| lambda-organization (P0) | "Lambda wins" branch algebraically unreachable | `peakToAvg` is now a real input; branch **reached at 498 of 720** probed legal points, ratio down to 0.0x |
| developer-platform (P0, D1) | prose "for three engineers it never pays" vs its own note | at 3 engineers: **160 working days / 32.0 weeks**, flag fires; prose now "about eight months, which maintenance can turn into never" — **prose, note and compute now agree** |

Corpus-wide: **77 flags fire across 298 rows** at authored defaults; only 5 panes raise none, and
developer-platform's zero is *correct* (at 20 engineers it genuinely pays back in 4.8 weeks).

### Class H — cram-surface dangling: **structurally EXTINCT; 1 residual nit; 1 control survivor**

- The saga "Only the ones **before the pivot**" case was fixed **at the composer**:
  `cram-derive.js::_csCueLine` now lifts the cue alongside its answer, so the sheet renders the
  antecedent. One fix, 46 topics. feature-flags' "instant kill switch" and multi-region's dangling
  line are gone verbatim.
- **RESIDUAL (non-blocking).** replication's Whiteboard step still reads "...so the read includes a
  node holding the **latest write**" — omitting "**completed**", the qualifier the same file supplies
  at eight other sites (L271, 505, 514, 634, 785, 822, 987) and whose absence its own Red Flags pane
  calls the costliest error in the topic. Mitigated twice: the cue now travels with it, and the same
  sheet's Red Flags section carries "freshness for **completed** writes, not linearizability." One
  word.
- **CONTROL SURVIVOR (expected, and the point of running controls).** error-propagation's Red Flag
  `"If a send fails, we just log it and move on"` is still un-localized — "a send" has no referent in
  a topic about errors crossing independently-deployed services. Never edited; defect intact.
  **This is what proves the instrument still detects defects**, so the extinctions above are not the
  artifact of a blind check.

### Class B / Model-echo: **decisive arm EXTINCT; residual echo is by-design**

Every sampled topic's CURVEBALL cards now carry an `Int:` (8/8, 9/9) — the sweep's "caching's seven
Extra Curveballs carry zero `Int:`" is gone; the pane's adversarial rep now gives reps everywhere.

Residual Bank-Model-to-Drill-answer contiguity persists — longest run **cdc 42 words**, caching 29,
multi-tenant 29 — but the **highest is in a never-edited control**, and the project's own cram check
documents cross-pane restatement as BY DESIGN (panes are consumed independently). Recorded as an
observation, not a defect.

### A note the next reader should have: one sweep entry was probably a false positive

cdc's Class-J instance — `"without ever losing a change"` asserted without the `acks` precondition —
is, on inspection, an **interviewer's design brief** (a FRAME curveball prompt posed *to* the
candidate), not a guarantee the topic asserts. Still present because nothing needed fixing.

---

## What this verification does NOT claim

- **I read the ~10 new beats; I did not read the other ~950 cards.** Class extinction is measured on
  a stratified sample of 8 topics, not proven corpus-wide.
- **Class E has no mechanical guard**, and my control could not discriminate for it. Its extinction
  rests entirely on my reading of eight tells.
- **The `overlay_deadzone` flake is unexplained, only bounded.** I have four green results and one
  crash whose stack I could not recover (`check_all` keeps only the last line). If it recurs, capture
  the child's full stderr rather than re-running.
- The load-balancing figures I used to convict E1 are the same heavily-loaded balanced-allocations
  result the card rests on. If that result is wrong, E1 is wrong with it — but the *internal*
  contradiction (sqrt excess over linear mean cannot give a constant percentage) holds regardless.
