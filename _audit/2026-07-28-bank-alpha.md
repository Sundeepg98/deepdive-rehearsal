# Wave B / builder 1 (a-l) -- FREEZE

**2026-07-28. wB1-fixer, branch `content/bank-alpha` off master 42bf6eb. Not pushed, not merged.**

Scope: build the instrument for the Bank-pushback defect class, publish the derived work-list,
and regenerate the a-l half of the affected cards.

---

## 1. The instrument -- `test/bank_pushback.cjs`

The Bank is the only surface in the app where the candidate's own model answer is attacked: every
card carries a `Model:` and an `Int:`, and the Int is the attack. Several checks count those
fields. None read whether the attack lands.

**Four classes. Three exact, one a stated proxy.**

| class | asserts | exact? |
| --- | --- | --- |
| `thin_int` | the Int's answer adds <= 20 content words its own Model does not already contain | PROXY |
| `no_int` | the card ships a Model and no `Int:` | exact |
| `no_int2` | a SCALE/DESIGN card ships a Model and exactly one Int | exact |
| `register_lc` | the Model's first character is lowercase | exact |

Pure node, no browser, **0.34s**, deterministic (set arithmetic only -- no float comparison, no
locale collation, no clock, no filesystem in the detectors).

### 1.1 The threshold is bracketed by the corpus, not chosen

Measured over all 46 topics / 613 cards / **777 Int exchanges** before a line was fixed:

| side | anchor | novelty |
| --- | --- | --- |
| FLOOR (must fire) | soft-delete DESIGN -- the sweep's named case | 5 |
| | multi-tenant DESIGN -- named | 9 |
| | load-balancing SCALE -- named | 10 |
| | replication SCALE -- named | 11 |
| CEILING (must stay silent) | the 30 donor pairs (saga + idempotency, excluding their own SCALE/DESIGN) | **48 minimum** |

`NOVEL_MAX = 20` sits inside an 11 -> 48 gap: 1.8x clear of the floor, 2.4x clear of the ceiling.
Both sides ship as self-test fixtures carrying the corpus text **verbatim**, so the threshold
cannot drift in either direction without aborting the run.

**I did not use the metric the sweep proposed.** Its suggestion was "flag every `Int:` whose
answer shares >60% of its content words with the `Model:` above it." That fails on the sweep's
own named cases: multi-tenant DESIGN shares **10%**, because its Model says "signed claim" where
its Int says "verified JWT claim". Word-overlap is blind to paraphrase, and any similarity
threshold low enough to catch it fires across half the corpus. The axis that separates is
**novelty** -- the absolute count of content words the answer uses that its Model does not.

### 1.2 A class measured and dropped

The sweep names a third tell: the old generation's Model is "lowercase **and semicolon-chained**".
The lowercase half is exact and ships. The semicolon-density half **cannot separate** and is not
shipped rather than shipped noisy:

- rate-limiting's SCALE card is an unambiguous old-generation checklist ("one atomic increment per
  request, roughly 100-byte counters, so op-rate...") and contains **zero** semicolons -- it chains
  on commas.
- **43** refreshed, capital-opening cards carry **three or more**.

Any rule tight enough to catch the first fires on dozens of the second. The header says so and
says why, so nobody re-derives it.

### 1.3 Honest scope, stated in the check's own output

`thin_int` measures **vocabulary, not meaning**. The inference it makes is sound in one direction
only: an answer adding almost no words its Model does not already carry cannot be teaching much
the Model did not. **The converse does not hold** -- a long answer restating its Model in fresh
words is not caught. And whether a question is *good* -- whether it aims at the seam the Model
opens, whether a senior interviewer would ask it, whether the answer is correct -- is not measured
and stays human/verifier judgment.

One consequence looks like a bug and is not, so it is documented rather than hidden: **at
NOVEL_MAX = 20, any answer shorter than 21 content words fires unconditionally**, whatever its
overlap -- it cannot add 21 new words if it only has 18. In this corpus that *is* the defect: the
refreshed generation's Int answers run **63-206** content words across all 30 donor pairs, while
roughly two dozen of the corpus's 777 pairs fall under the floor -- and those sit on the
un-refreshed cards, which is the population this check exists to find. If a future corpus writes
deliberately terse pushbacks, that floor is the first thing to revisit.

### 1.4 Coverage is asserted against an independent reference

The check consumes the **compiled** bank slices -- what actually ships -- so it does not
reimplement the compiler's parser and cannot disagree with it about what a card contains. But
`src/topics/_generated/` is gitignored, so with no build present it would happily drive the 8
committed hand-coded topics and report "8 topics, 0 defects": a true sentence and a completely
misleading one, and on an empty baseline it would print PASS while covering 8 of 46.

So a **dumb line scanner over `src/topics-md/*.md`** -- files this check does not parse, import or
depend on -- counts every authored `### ` bank heading, `Int:` and `Int2:`. Every authored topic
must have a compiled bank, and that bank must carry **at least as many cards and Int lines as the
author wrote**, per topic and per field. A shortfall is a harness fault or a compiler drop; either
way it is a hard FAIL. (numbers_lattice pays for this lesson in its own header at topic
granularity; this extends it to fields within each topic.)

### 1.5 Watched-red -- six ways, all before any card was touched

| # | proof | result |
| --- | --- | --- |
| 1 | baseline-green after `--write-debt` | PASS, 170 allowlisted |
| 2 | `--plant`: one synthetic defect per class into four topics that carry none | FAIL, **exactly 4 new**, one per class |
| 3 | each of the four detectors neutered in turn | self-test aborts, 4/4, corpus never measured |
| 4 | `NOVEL_MAX` 20 -> 60 (past the donor floor of 48) | donor anchor fires, run aborts |
| 5 | `NOVEL_MAX` 20 -> 4 (under the worst named defect at 5) | floor anchor goes silent, run aborts |
| 6 | `_generated/` absent | **39 COVERAGE failures**, not a false-clean 8-topic run |

**Two fixtures failed on the first run and both were real defects, not fixture noise:**

- `thin-NEG-short-but-novel` -- my own "short but genuinely new" negative control was itself under
  the floor. That is what surfaced the arithmetic in section 1.3, which is now stated in the
  header instead of lurking. Replaced with a **paired** fixture: two answers of comparable length
  against the same Model (load-balancing SCALE, verbatim), one restating and one novel, which must
  fire and stay silent respectively. Swap novelty for a length rule and the second fires; drop the
  novelty comparison and the first goes quiet.
- `register-NEG-digit-open` -- `detectRegisterLc` scanned forward to the first *letter*, so
  idempotency's SCALE Model, which opens `1,000 x 86,400 = ~86 million live keys`, was judged by
  the multiplication sign's lowercase `x` and reported as an un-refreshed fragment. Fixed to judge
  the first character only; a Model opening on a digit, quote or bracket makes no register claim
  and is not judged.

### 1.6 Registered

`check_all.py`, immediately after `numbers_lattice`. **Gate row count: 57, AST-exact** (56 before
mine) -- counted by parsing `check_all.py` and enumerating tuple literals in the registered
for-loop iterables, not by grep.

---

## 2. The measurement disagrees with the sweep, in both directions

| | sweep estimate | measured |
| --- | --- | --- |
| Class A (weak Int) topics | ~18 | 20 |
| Class B (absent Int) topics | ~11 | 12 |
| topics with ANY finding | ~25 union | **27 of 46** |
| card-level authoring units | "roughly 40-50" | **170 findings** |

Named by the sweep, carrying no finding: **api-design** (register only -- its Ints are
substantial), **distributed-locks** (does not fire at all; its semicolon-heavy Models all open on
a capital and its Ints clear the floor). Not named, carrying findings: **autoscaling, slos,
state-machine, eav, kafka-internals, observability, probabilistic-structures**. The sweep counted
topics where a reader *explicitly flagged an instance*, which is a lower and different bar than a
corpus-wide measure -- as its own section 4 says.

---

## 3. Ratchet arithmetic -- every deletion committed with the fix that earned it

| commit | content | findings | topics |
| --- | --- | --- | --- |
| `a43662c` | instrument + baseline + registration | 170 | 27 |
| `18be945` | prepass work-list | 170 | 27 |
| `0c56a82` | developer-platform (8 `no_int`) | 162 | 26 |
| `fa7c293` | caching 7, backpressure, debugging, event-driven | 149 | 25 |
| `923d7a2` | api-design, autoscaling, load-balancing | 136 | 22 |
| (batch) | backpressure, consistency-models + 4 openers | 126 | 19 |
| (batch) | debugging, event-driven | 119 | 17 |
| (batch) | leader-election, circuit-breaker | 109 | 15 |
| `d086f5a` | eav | **107** | **14** |

**Zero new findings introduced at any step. Zero stale entries at freeze.**

107 remaining = wB2's 74 (m-z, untouched by me) + consistent-hashing's 33. **The a-l half carries
exactly one survivor topic and nothing else.**

---

## 4. Per-card receipts

30 cards. For each: what the old Int was, why it was defective, and what the new one pushes on.
"Model rewritten" means the `Model:` was re-authored as spoken first-person prose in the donor
register (saga + idempotency), not merely recapitalized.

### 4.1 Class B -- 18 curveballs that shipped a Model and no Int at all (exact class, no threshold)

**developer-platform (8)** -- the sweep's headline case: eight of the topic's hardest scenarios
all ended on the candidate's own monologue. Models were already strong; only the pushback was
missing.

| card | the new Int pushes on |
| --- | --- |
| attribution | the Model stamps the human into `application_name` -- a string the platform sets and Postgres does not verify, so it answers "who do I go ask", never "prove it" |
| open side door | the Model closes the doors after earning 70% -- so what happens to the 30%, whose non-adoption is a product signal naming the lanes never built |
| premature | the Model prices time saved and ignores the boundary, which does not scale with headcount -- and a `SELECT`-only role buys the safety without the build |
| supply chain | the Model has the client verify the signature; the client is what the attacker just compromised |
| override decay | the Model retunes the threshold -- how is that different from deleting the guard? |
| knowledge rot | the Model moves knowledge into code, leaving the *why*, which is what matters and cannot be moved |
| ticket queue | the Model reframes to self-service, which is itself a build the drowning team has no hours for |
| platform as SPOF | the Model's break-glass path has never once been used |

**caching (7)** -- every Extra Curveball carried zero Int.

| card | the new Int pushes on |
| --- | --- |
| stampede | "serve stale" when Redis has already deleted the key -- it needs two expiries, not one |
| cold cache | pre-warming a hot set whose only record you just flushed |
| penetration | a Bloom filter confidently 404-ing a product created one second ago |
| hot key | an in-process L1 that no invalidation reaches, and fifty instances disagreeing at once |
| eviction thrash | LFU starving a newly-viral key, because incumbents are protected by history |
| lost update | delete-don't-update closes the write-write race and leaves the **read-write** race open |
| failover | "replay recent invalidations" needs an actual trigger and an actual window |

**Three singletons**, two of which also carried `register_lc` (Model rewritten):

| topic / card | old state | the new Int pushes on |
| --- | --- | --- |
| backpressure / metastable | no Int; Model a lowercase wall | every fix in that Model lives in the **caller** -- what if the callers are ten thousand mobile apps you cannot update? |
| debugging / apm-blind | no Int; Model lowercase | the Model detects swallowed errors by the gap between log volume and error rate -- blind to the catch block that logs nothing |
| event-driven / ordering | no Int; a **one-sentence** Model | doubling the partition count rehashes every key and breaks ordering silently |

### 4.2 Class A -- 12 deep cards regenerated (Model + Int, and 2 missing Int2s)

| topic / card | old Int, and why it was answered by its own Model | new Int |
| --- | --- | --- |
| api-design SCALE | "what is the single most consequential decision here?" -- names a bullet of its own Model | you version in the URL only when you break; you ship v2 -- how long do you run v1, and who decides? |
| api-design DESIGN | "why not just dedupe on a natural business key?" -- the Model's last clause is the answer | the fingerprint rejects a client that re-serializes its JSON on every attempt |
| autoscaling DESIGN | "why not just run at a high target utilization?" -- the Model states the answer | scheduled and reactive layers on one actuator: on a day that doesn't match the pattern, which wins? |
| autoscaling SCALE | "min 0 or min > 0?" -- verbatim from the Model's own parenthesis | backlog is a level, and a level is the integral of two rates -- more work arriving and workers getting slower look identical |
| backpressure SCALE | "the buffer is always full -- what does that tell you?" -- the bufferbloat clause answers it | spilling to Kafka makes the queue unbounded again; what stops the backlog growing forever? |
| backpressure DESIGN | "why not just queue the excess requests?" -- the Model's own reasoning | an adaptive limit infers saturation from latency, so a slow **dependency** makes it shed traffic it could have served |
| consistency-models DESIGN | "why not just route all reads to the primary?" -- the Model's closing sentence | where does the LSN physically live between the write response and the next read? |
| consistency-models SCALE | "how do you keep the strong path from paying a cross-continent round-trip?" -- the Model says "localize the authority" one line above | a US user pays an EU user: which region owns a two-authority transaction? |
| debugging SCALE | "why not just fix the parser and move on?" -- the Model's durable-fix clause | what did the customer lose over the last eight months, that a dead-letter table added today cannot tell them? |
| debugging DESIGN | "what is the single most valuable step?" -- verbatim step 1 | what causes anyone to **open** a runbook for a bug class that is silent by definition? |
| load-balancing DESIGN | "why keep the backend stateless rather than sticky sessions?" -- the Model's last clause | least-connections counts connections as a proxy for load, and HTTP/2 multiplexing breaks the proxy |
| load-balancing SCALE | "what's the risk of running the pool near capacity?" -- the Model's own headroom clause | N+1 is sized for an **independent** failure; a bad deploy, an AZ, a shared dependency are all correlated |
| event-driven DESIGN | "where does the duplicate come from?" -- the Model's ack-gap premise | who mints the event id, and is it the same id when the **producer** retries? |
| event-driven SCALE | "what is the standing cost of the delivery guarantee?" -- the Model's own dedup clause | Little's Law gives the average; staffing exactly that is 100% utilization, where the queue never drains |
| leader-election STRUCTURE | "two instances both think they're the leader -- what saves you?" -- "fencing token", one line above | a fencing token only works if the **resource** checks it, and S3 has never heard of it |
| leader-election FAILURE | "the old primary comes back -- what happens?" -- "it must be fenced", stated in the Model | quorum is agreement in the **control** plane; what stops clients still writing to the old primary? |
| circuit-breaker SCALE | "what's the breaker's single biggest contribution?" -- the Model's containment clause | from the **failing dependency's** point of view, is a breaker good news? |

**Two missing `Int2`s added** (both on debugging, both following the sweep's proven "the fix's own
failure mode" donor shape): the dead-letter table becoming a landfill nobody reads -- and the DLQ
write itself failing on the very payload that broke the parser; and whether hypothesis-first
survives 3am -- yes for diagnosis, no for mitigation, and conflating them is why the rule gets
called academic.

### 4.3 Four answers expanded rather than replaced (circuit-breaker)

Here the **question** was already good and only the **answer** was ~30 words -- the visibly
half-refreshed shape. Replacing a good question to satisfy a counter would have been the Goodhart
move; these were brought up to the donor register instead.

- FRAME Int2 -- why the timeout matters more than the breaker (a breaker counts outcomes, and a
  hang produces none, so it is structurally incapable of firing).
- STRUCTURE Int -- why a lazy open -> half-open transition leaks in inverse proportion to traffic.
- FAILURE Int2 -- why a bulkhead beats a breaker when the site died in four seconds (a breaker is
  statistical and therefore late; a bulkhead needs no samples).
- CURVEBALL/flapping Int -- catching a mistuned breaker by dashboarding it against the
  dependency's own health, and shadow-running a new breaker for a week.

### 4.4 Four Model openings rewritten (register only, Int already substantial)

api-design / breaking-change, autoscaling / wrong-tier, consistency-models / monotonic-reads,
kafka-internals / ordering, circuit-breaker / recovery, leader-election / pause,
load-balancing / deep-check.

### 4.5 eav -- the hand-coded slice

eav is one of the eight hand-coded JS topics, so both edits are in `src/topics/eav/bank.js` in its
own HTML-entity convention. `entity_leak` verified green afterwards, which is the check that
matters for that file.

| card | old Int | new Int |
| --- | --- | --- |
| Cross-tenant attribute bleed | "how do you make this class structurally impossible?" -- answered with the Model's own fix list | the Model ends on "definitions can be global, values are always scoped" -- so who can see the **name** of a tenant-authored attribute? |
| EAV creep | "how do you decide the boundary in practice?" -- the Model's governance clause | "graduate the hot attributes out of EAV" is one sentence describing a live expand/contract migration |

---

## 5. The instrument missed three real defects, exactly where its header says it would

**api-design SCALE, api-design DESIGN and consistency-models SCALE are textbook Class A and
`thin_int` did not flag any of them.** All three restate their Models in *fresh vocabulary*, and
novelty over content words is blind to paraphrase -- the limitation documented in section 1.3 and
in the check's own header, observed in the wild.

This is the stated limit behaving as stated, not a surprise. But the conclusion matters for
whoever verifies this: **a green `bank_pushback` is not evidence the class is gone.** Three of the
30 cards fixed here were found by reading, not by the counter. The verifier should read the cards
against the donor register, not audit the number.

---

## 6. Gate

Full `python3 test/check_all.py`, verdict quoted from the capture file `_gate_freeze.txt`, not
from memory.

```
GATE: PASS
```

**57 rows, 57 PASS, 0 FAIL, 0 SKIP, exit 0.** The row tally is counted from the capture file's
summary block, and it matches the AST count of `check_all.py` -- 56 before this branch, 57 with
`bank_pushback`. Nothing was skipped, which matters: a SKIP is how a browser-gated check buys a
green it did not earn, and there are none here.

Load-bearing rows, quoted:

```
build_integrity        PASS  (11873438 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the deliverable)
compiler_conservation  PASS  every authored item survives compilation intact.
bank_pushback          PASS  (46 topics, 613 cards, 107 known pushback defect(s) allowlisted across 14 topics)
numbers_lattice        PASS  (46/46 topics driven across 567,131 evaluations (37 exhaustive))
cram_surface           PASS  (46 topics, 0 known cram-surface defect(s); mirror verified against deriveCram on all 46)
entity_leak            PASS  (no HTML entity reaches visible text; 3/3 overlay bodies opened + inspected)
visual_regression      PASS  (16 baselines, win32-chromium149; every capture reached a proven rest
                              state across all 18 roots, cleared the blank-page floor, and matched
                              its committed pixels)
```

`compiler_conservation` is the one that matters most for a content wave -- it holds the author's
raw bytes as its reference, so it is the check capable of proving that every `Int:` written here
survived into what ships. `entity_leak` matters for the eav edits specifically, since that file
hand-writes HTML entities. It was also run after every individual cluster, not only at freeze.

**No re-run was needed.** A sibling builder was active throughout and no browser-gated check came
back red, so the "one quiet re-run before believing a load-shaped failure" contingency never
fired.

`build_integrity` reports `HEAD-match DEFERRED -- 1 uncommitted path(s) [_gate_freeze.txt]`: that
is this capture file itself, untracked at the moment the gate ran. The deliverable and `src/` were
committed together in every content commit, which is the condition that check actually guards.

**VR: 16/16 matched, zero baseline churn -- as predicted, and claimed by the match count rather
than by assertion.** Bank content renders inside the mock-interview overlay, which the visual
regression suite does not capture at rest, so no committed baseline could move no matter how much
Bank text changed. 30 cards rewritten and the pixels are byte-identical, which is the right
outcome and also a useful negative control: had a baseline moved, it would have meant a Bank edit
had leaked into a surface it has no business touching.

---

## 7. The survivor -- consistent-hashing, and why it is not done

**33 of the remaining 107 findings are in one topic**: 14 `register_lc` + 19 `thin_int`.

Every other affected topic in this half matched the sweep's diagnosis exactly -- one template that
missed an upgrade pass on two cards, sitting beside excellent ones. **consistent-hashing does
not.** Its bank holds **14 cards and all 14 open lowercase**, and 19 of its Ints fall under the
floor -- FRAME, STRUCTURE and CLOSE included. This is not a topic with two legacy cards; it is a
bank where the refresh never landed at all, and it is larger than everything else in this half
combined.

I did not touch it, deliberately. The acceptance test for a new Int is that it is unanswerable by
re-reading its Model, and meeting that nineteen times in one topic requires holding the whole
topic's argument in mind at once -- consistent hashing's ring, vnodes, replication, hot keys and
rebalancing are one connected argument, not nineteen independent cards. Doing it quickly at the
end of a wave would ship exactly the defect this wave exists to remove, and it would ship it
wearing a green ratchet.

So it stays in the baseline as a **justified survivor**, with this section as its justification.
It wants its own wave, and it is a clean one: single topic, single file, no cross-builder
coordination, and the instrument already tells the next builder precisely which 33 entries have to
vanish.

---

## 8. Handoff

- Branch `content/bank-alpha`, 9 commits, not pushed, not merged.
- `test/bank_pushback.cjs` + `test/bank_pushback_debt.json` (107 entries) + `check_all.py` row 57.
- `_audit/2026-07-28-bank-prepass.md` -- the derived work-list, both halves.
- This file.
- wB2-fixer owns the m-z half (74 findings / 13 topics) on `content/bank-omega`; the two builders'
  topic files are disjoint, and only this branch touches `check_all.py` and the debt file. **At
  merge, the debt JSON is the sole deliverable conflict** -- it is a flat key-value map, so the
  resolution is the union of both branches' deletions, i.e. take the intersection of the surviving
  keys. Re-run `--write-debt` on the merged tree and the file regenerates correctly regardless.
