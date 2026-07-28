# Bank pushback pre-pass -- the derived work-list

**2026-07-28. Authored by wB1-fixer (Wave B builder 1), branch `content/bank-alpha`.**

This file is the DEFINITIVE scope for Wave B and supersedes the 2026-07-20 catalog sweep's
estimate. It is not a re-read of the corpus: it is the output of `test/bank_pushback.cjs`, run
over all 46 compiled bank slices (613 cards, 777 Int exchanges) at master 42bf6eb.

Reproduce it with:

    npm run build && node test/bank_pushback.cjs --list

Baseline as committed: `test/bank_pushback_debt.json`, 170 entries.

---

## 1. What the instrument measured, and how far to trust each number

Four classes. Three are exact; one is a proxy and says so.

| class | what it asserts | exact? |
| --- | --- | --- |
| `thin_int` | the Int's answer adds <= 20 content words its own Model does not already contain | PROXY -- vocabulary, not meaning |
| `no_int` | the card ships a Model and no `Int:` at all | exact |
| `no_int2` | a SCALE/DESIGN card ships a Model and exactly one Int | exact |
| `register_lc` | the Model's first character is lowercase | exact |

`thin_int` is the mechanical stand-in for the sweep's Class A ("the Int is answered by its own
Model"). It measures NEW VOCABULARY. An answer that adds almost no words its Model does not
already carry cannot be teaching much the Model did not -- that inference is sound and is the
whole basis of the flag. **The converse does not hold**: a long answer that restates its Model in
fresh words scores high and is not caught. Whether a question is GOOD -- whether it aims at the
seam the Model opens, whether a senior interviewer would ask it -- is not measured here and stays
human/verifier judgment. A green run is not evidence of it.

**The threshold is bracketed by the corpus, not chosen.** The four Int pairs the sweep NAMES as
defective carry 5, 9, 10 and 11 novel content words (soft-delete DESIGN, multi-tenant DESIGN,
load-balancing SCALE, replication SCALE). The 30 Int pairs in the donor register the sweep names
as exemplary (saga + idempotency, excluding their own SCALE/DESIGN cards) carry 48 or more.
`NOVEL_MAX = 20` sits inside that gap -- 1.8x clear of the floor, 2.4x clear of the ceiling. Both
sides ship as self-test fixtures with the corpus text verbatim, so the threshold cannot drift in
either direction without aborting the run.

**A class that was measured and dropped.** The sweep names a third tell -- the old generation's
Model is "lowercase and semicolon-chained". The lowercase half is exact and ships as
`register_lc`. The semicolon-density half was measured and CANNOT separate: rate-limiting's SCALE
card is an unambiguous old-generation checklist and contains zero semicolons (it chains on
commas), while 43 refreshed capital-opening cards carry three or more. Any rule tight enough to
catch the first fires on dozens of the second, so it is not shipped. Narrow beats false-positive
spam.

---

## 2. It disagrees with the sweep's estimate -- in both directions

| | sweep estimate | measured |
| --- | --- | --- |
| Class A (weak Int) topics | ~18 | 20 with `thin_int` |
| Class B (absent Int) topics | ~11 | 12 with `no_int` |
| topics with ANY finding | ~25 (union) | **27 of 46** |
| card-level authoring units | "roughly 40-50" | **170 findings** |

Where it disagrees, and why the measurement is the one to trust:

- **Topics the sweep named that carry no finding: `api-design`, `distributed-locks`,
  `developer-platform` (for Class A specifically).** api-design's three cards are `register_lc`
  only -- their Ints are substantial; the sweep's reader flagged the register, not the pushback.
  distributed-locks does not fire at all: its four semicolon-heavy Models all open on a capital
  and its Ints all clear the floor comfortably. The sweep counted topics where *a reader
  explicitly flagged an instance*, which is a lower bar than a corpus-wide measure and a
  different one.
- **Topics the sweep did NOT name that carry findings: `autoscaling`, `slos`, `state-machine`,
  `eav`, `kafka-internals`, `observability`, `probabilistic-structures`.** Each was read by one
  reader who was not hunting for cross-topic patterns; the sweep says so itself.
- **`consistent-hashing` is not a card problem, it is a TOPIC problem.** 33 of the 170 findings
  (14 `register_lc` + 19 `thin_int`) are in this one topic: 14 of its cards open lowercase and
  nearly every Int is under the floor. This is not a template that missed one upgrade pass on two
  cards -- it is a whole bank that was never refreshed. Sized and scoped in section 4.

---

## 3. THE SPLIT -- a-l is wB1-fixer, m-z is wB2-fixer

Disjoint by topic id, so the two builders never touch the same file.

### a-l (wB1-fixer, `content/bank-alpha`) -- 14 topics, 96 findings

| topic | no_int | no_int2 | thin_int | register_lc | total |
| --- | --- | --- | --- | --- | --- |
| api-design | | | | 3 | 3 |
| autoscaling | | | 2 | 3 | 5 |
| backpressure | 1 | | 1 | 3 | 5 |
| caching | 7 | | | | 7 |
| circuit-breaker | | | 5 | 2 | 7 |
| consistency-models | | | 1 | 3 | 4 |
| consistent-hashing | | | 19 | 14 | 33 |
| debugging | 1 | 2 | 1 | 2 | 6 |
| developer-platform | 8 | | | | 8 |
| eav | | | 2 | | 2 |
| event-driven | 1 | | 2 | 2 | 5 |
| kafka-internals | | | | 1 | 1 |
| leader-election | | | 2 | 3 | 5 |
| load-balancing | | | 2 | 3 | 5 |
| **total** | **18** | **2** | **37** | **39** | **96** |

### m-z (wB2-fixer, `content/bank-omega`) -- 13 topics, 74 findings

| topic | no_int | no_int2 | thin_int | register_lc | total |
| --- | --- | --- | --- | --- | --- |
| multi-tenant | 1 | | 2 | 3 | 6 |
| observability | | | | 1 | 1 |
| probabilistic-structures | 1 | | | | 1 |
| rate-limiting | | 2 | 2 | 2 | 6 |
| replication | 1 | 2 | 3 | 2 | 8 |
| rules-engine | 7 | | 2 | 3 | 12 |
| saga | | 2 | 2 | 3 | 7 |
| sharding-strategies | 1 | | 1 | 3 | 5 |
| slos | | | 2 | 3 | 5 |
| soft-delete | | | 2 | 3 | 5 |
| state-machine | | | 5 | | 5 |
| storage-engines | 1 | 2 | 1 | 3 | 7 |
| stream-batch-processing | 1 | 2 | | 3 | 6 |
| **total** | **13** | **10** | **22** | **29** | **74** |

**Note for wB2:** saga's and idempotency's *good* cards are the donor register the brief points
at -- but saga's own SCALE and DESIGN cards are themselves Class A (`saga:SCALE:int` has 7 novel
words, the second-highest overlap in the corpus). Read saga's FRAME / STRUCTURE / FAILURE /
CLOSE / curveball cards for register; do not read its SCALE or DESIGN as exemplars. idempotency
is clean throughout and is the safer donor.

---

## 4. Priority within the a-l half

Ordered by what a candidate actually loses, not by count.

1. **`no_int` on curveballs (18 cards)** -- the pane's designated adversarial rep giving zero
   reps. developer-platform (8) and caching (7) are the whole of it bar three singletons
   (backpressure, debugging, event-driven). This is the sweep's Class B and it is unambiguous:
   the hardest scenario in the topic ends on the candidate's own monologue.
2. **SCALE / DESIGN Class A cards** -- the sweep's core finding: a `thin_int` and/or
   `register_lc` on a deep card. Roughly 20 cards across api-design, autoscaling, backpressure,
   consistency-models, debugging, event-driven, leader-election, load-balancing,
   circuit-breaker. Each needs the Model rewritten as spoken first-person prose and a new Int
   that is unanswerable by re-reading it. `no_int2` (debugging x2) rides along here.
3. **`thin_int` / `register_lc` on non-deep cards** -- real but lower-yield; a FRAME or CLOSE
   card's second Int being thin costs less than a SCALE card's only Int being thin.
4. **`consistent-hashing` (33)** -- flagged here as a SCOPE DECISION, not deferred silently.
   Fourteen of its cards open lowercase and nineteen of its Ints are under the floor; that is a
   whole-bank regeneration, comparable in size to everything else in this half combined. Doing it
   badly under time pressure would be worse than not doing it: the acceptance test for a new Int
   is that it is unanswerable from the Model, and meeting that 19 times in one topic requires
   holding the whole topic's argument in mind. It is left in the baseline as a justified survivor
   with this entry as its justification, and it wants its own wave.

---

## 5. What "done" looks like

Per fixed card, the baseline entries for it vanish (`--write-debt` is re-run and the shrink is
committed with the fix). At freeze: zero stale entries, zero new entries, and every surviving
baseline entry has a written justification -- not "we ran out of time" but a stated reason the
card is correct as it stands, or a scoped hand-off like section 4 item 4.

The instrument is the receipt. A card claimed as fixed whose entry is still in the baseline was
not fixed.
