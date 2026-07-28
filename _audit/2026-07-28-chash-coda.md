# The consistent-hashing coda -- FREEZE

**Dispatched 2026-07-28, frozen 2026-07-29. wCH-fixer, branch `content/chash-coda` off master
45ec7fd. Not pushed, not merged.**

Scope: build the kept-Int regression check that bank-alpha's freeze 5b designed, regenerate
consistent-hashing's entire bank under it, and land wave B's four carry-forwards.

Result: **`bank_pushback_debt.json` is `{}`.** The ratchet went 33 -> 16 -> 0 with zero new
findings at any step. Gate **58 rows, 58 PASS, 0 FAIL, 0 SKIP**, exit 0.

---

## 0. RECORD CORRECTIONS to two prior wave-B records

Filed here deliberately, because a verdict chain stays honest only if corrections land where the
next reader will look. Both were surfaced by the measurement in section 1; neither changes any
shipped card, and neither is a criticism of a judgement call -- both are cases where a **number
was read as meaning something it did not**.

**C1 -- `_audit/2026-07-28-bank-coldverify.md` section A3, the `sharding-strategies` DESIGN Int2
row, rests on a false premise.** The row reads *"(omega's self-caught case, 58 -> 44) ... omega's
mid-wave rewrite of its first draft evidently worked."* There was no second draft. **58 -> 44 is
the measurement of the SHIPPED card** -- confirmed three ways in section 1.1, including omega's own
freeze table which records `int2=44` as its after-value. The verifier read the shipped Model and
Int2 and concluded the Int2's payload survives; **that verdict stands and I re-read the card and
agree with it.** What does not stand is the reasoning attached to it: the number it cites as
evidence of a repair is in fact the number as shipped, so A3 credits a fix that never happened.
The practical consequence is the one this wave hit -- anyone building an instrument anchored on
"the case omega caught" is anchoring on a card that two readers passed.

**C2 -- `_audit/2026-07-28-bank-alpha.md` section 5b's designated anchor is unanchorable as
specified.** 5b proposes a novelty-snapshot check and, by implication, an anchor: the sharding case
fires, the measured-acceptable pairs stay silent. Measured over the full 38-pair kept population
across both halves, **three pairs lose novelty faster than the designated must-fire case** --
rules-engine SCALE Int2 at 0.740, soft-delete SCALE Int2 at 0.750 and event-driven SCALE Int2 at
0.755, against sharding's 0.759 -- and event-driven SCALE Int2 is itself explicitly read and passed
in the coldverify's own A3 table. No threshold on that axis separates them. 5b's *diagnosis* was
correct and important (the stateless floor cannot see a good Int getting worse, and the class needs
a before-reference); its proposed *discriminator* was not, for the reason 5b itself identified one
paragraph earlier -- Model growth mechanically raises overlap on any kept answer. Section 1.3
records the axis that does separate.

Neither correction retracts a shipped fix. Wave B's cards are unaffected, and the coldverify's
CLEAN verdict is unaffected.

---

## 1. The guard -- and the design that did not survive measurement

The brief asked for 5b's design: a novelty snapshot plus a check that fails when a non-flagged
exchange's novelty drops past a fraction of its recorded value, with the fraction **anchored**
so that wB2's caught case (sharding DESIGN Int2, 58 -> 44) fires while wB1's measured-acceptable
pairs stay silent.

**That anchoring is not achievable, and finding out why was the most valuable hour of the wave.**

### 1.1 The premise the anchoring rested on is false

"58 -> 44" is that card's **shipped** state, not a discarded draft. Three independent confirmations:

1. Measured here from the authored markdown at `42bf6eb` versus `45ec7fd` -- 38 kept pairs across
   both wave-B halves. The instrument was validated first: it reproduces **all five** of the
   movements bank-alpha 5b documents (event-driven SCALE 106->80, api-design DESIGN 79->63,
   leader-election FAILURE 68->53, api-design SCALE 96->82, load-balancing SCALE 70->57) and its
   "lowest post-rewrite novelty is 25, circuit-breaker SCALE Int2" exactly.
2. omega's own freeze table, line 80: `sharding-strategies | DESIGN | int2=58 | int2=44`, where
   the second column is the after-value.
3. The cold verifier read that shipped card and passed it **"Intact"** -- explicitly reasoning
   that "omega's mid-wave rewrite of its first draft evidently worked." It had not; there was no
   second draft. A3's sharding row is right about the card and wrong about why.

So the designated must-fire case is a card **two readers judged good**, and the draft that was
genuinely defective exists nowhere -- not in git, not quoted in either freeze report.

### 1.2 And three acceptable cards drop harder than it does

| kept pair | novelty before -> after | ratio | judged |
| --- | --- | --- | --- |
| rules-engine SCALE Int2 | 50 -> 37 | **0.740** | acceptable (wB1) |
| soft-delete SCALE Int2 | 52 -> 39 | **0.750** | acceptable (wB1) |
| event-driven SCALE Int2 | 106 -> 80 | **0.755** | **read and passed by the cold verifier** |
| sharding DESIGN Int2 | 58 -> 44 | 0.759 | read and passed by the cold verifier |

A threshold set to fire at 0.759 fires on four cards and catches nothing. **An instrument whose
only demonstrated behaviour is a false positive is worse than no instrument**, because it teaches
people to override the gate -- the same reasoning bank_pushback used to drop semicolon density.

The confound is exactly what wB1 argued: **Model growth**. Those Models grew 5-6x (18-22 content
words to 111-123) while sharding's grew 1.9x (66 -> 128). A longer Model captures more of *any*
answer's vocabulary whether or not one idea moved. I also planted single-sentence punchline
restatements on seven real cards: they land at ratio **0.63-0.94**, straddling the legitimate
population completely. The novelty-ratio axis cannot separate growth from theft.

### 1.3 What separates: contiguity

A restatement copies a **phrase**; vocabulary growth **scatters** words. Measuring the longest run
of consecutive content words shared between a Model and its own answer:

| | longest shared run |
| --- | --- |
| the corpus, 691 of 692 authored exchanges | **8 or below** |
| the same seven punchline plants | **9 to 42** |
| the 692nd exchange | **19** |

That 692nd is a real defect, found by this check on its first run -- see section 2.

### 1.4 `test/bank_novelty.cjs`, as shipped -- two arms

- **`echo`** (stateless, carries the teeth): a Model reusing a contiguous run of **9+** content
  words from its own Int/Int2 answer. Needs no history, so it also judges cards nobody has touched.
- **`drift`** (5b's design, kept): a **kept** exchange -- question and answer byte-identical to
  `test/bank_novelty_snapshot.json` -- retaining under **60%** of its recorded novelty. Kept as a
  net for the catastrophic and the *paraphrased* case, which `echo` cannot see because nothing was
  copied. Its coarseness is stated in the header rather than hidden.

Neither catches a short, reworded theft. That gap is real and documented in the check's own output.

**Both thresholds bracketed from both sides, both sides shipped as fixtures:**

```
echo    corpus legitimate max 8 (saga FRAME)   <   9   <   19 (the live catch)
drift   planted restatement 0.591              <  0.60  <   0.740 (steepest legitimate)
```

**Every fixture is EXTRACTED from the corpus programmatically, never retyped** -- because retyping
is exactly what produced N4 (see section 5).

### 1.5 Watched-red, seven arms

| arm | expected | observed |
| --- | --- | --- |
| `--plant`, echo | fires echo only | cdc SCALE Int2, run 31, **drift silent** |
| `--plant`, drift | fires drift only | idempotency SCALE Int2, **echo silent** |
| neuter `echo` | self-test aborts | 3 fixtures fail, corpus never measured |
| neuter `drift` | self-test aborts | 2 fixtures fail, corpus never measured |
| `ECHO_RUN_MIN` 9 -> 8 | ceiling fixture fires, abort | `echo-CEILING-saga...: expected SILENCE, got FIRE (8 words)` |
| `ECHO_RUN_MIN` 9 -> 20 | floor fixture silent, abort | 3 fixtures fail |
| `RETAIN_MIN` 0.60 -> 0.75 | legitimate fixture fires, abort | `drift-CEILING-steepest-legitimate-loss` fires |
| `RETAIN_MIN` 0.60 -> 0.55 | plant goes quiet, abort | `drift+FLOOR-planted-punchline-restatement` silent |
| `_generated/` absent | coverage failure, never a small green | 39 COVERAGE failures; `--write-snapshot` **refuses**, file byte-unchanged |

The two plants are built to fire **one arm each** -- the echo plant splices a short verbatim run
(long run, vocabulary barely moves); the drift plant appends 40% of the answer's tail **word-order
reversed** (identical vocabulary absorbed, longest run 1). That is the proof the arms are not
proxies for each other. Snapshot writes are byte-idempotent across two runs (md5 identical).
All of this ran on a scratch mirror outside the worktree; no source edits, no plants in the tree.

Registered in `check_all.py` immediately after `bank_pushback`. Gate row count **58, AST-exact** --
counted by parsing `check_all.py` and enumerating tuple literals in the registered for-loop
iterables, not by grep, and cross-checked against the capture file's summary block. Runtime 0.56s.

### 1.6 The snapshot is a RECORD, not a debt list

The distinction decides its rules and is stated in the header. A ratchet may only shrink because
every line is a known defect; a novelty record measures *healthy* content, so entries legitimately
appear and vanish as cards are authored or renamed. So a vanished entry is reported, not failed --
**but** if the matched fraction falls under 80% the snapshot has decoupled from the corpus and that
is a hard FAIL, never a quiet green. Exchanges under bank_pushback's floor are skipped by `drift`:
that *is* a defect and its sibling owns it, and double-reporting would make one defect look like two.

---

## 2. The defect the check found on its first run

**`state-machine` SCALE Int2 opened by restating its own Model's ceiling derivation -- 19
consecutive content words.**

```
Model: ... the row lock is held across the commit and same-row writers can't group-commit with
       each other, so one row serializes at roughly 1/(commit latency) ...
Int2:  First I'd *derive* the ceiling instead of asserting one: the row lock is held across the
       commit, and same-row writers can't group-commit with each other, so one row tops out near
       1/(commit latency) ...
```

Its novelty is **75**, so `thin_int` was silent and always would have been. Wave B did not flag it;
the cold verifier's paraphrase hunt -- which read 28 cards specifically looking for this -- did not
find it. It is a genuine true positive from live content, which is far stronger evidence than a
plant.

Fixed: the Int2 now measures the real commit latency first and goes straight to the half-capacity
argument, which is the content that was always its point. The corpus's longest shared run is now
**8**. The self-test fixture carries the **pre-fix** text, so the catch outlives the fix.

---

## 3. The bank -- 14 cards, 20 exchanges, ratchet 33 -> 0

Every Int meets the acceptance test: **unanswerable by re-reading its Model**. The tools cannot
judge that -- bank_pushback's header says so and wave B proved it five times -- so the receipt is
the read, stated per card. Each Int aims at a seam its Model opens and deliberately leaves open.

### 3.1 The six deep cards (commit `158cc39`)

| card | field | novelty | run | the seam the Int opens |
| --- | --- | --- | --- | --- |
| FRAME | int | 14 -> 98 | 2 | the Model volunteers that fixed partitions + a map is what most systems run. So what has to be TRUE for the ring to win -- and what is that map costing the teams who took it? The Model names the alternative and never prices it. |
| FRAME | int2 | 12 -> 92 | 3 | "provably minimal" -- minimal GIVEN WHAT. Drop balance and the optimum moves zero keys; the exchangeability argument; and which of the four schemes breaks the only-toward-the-newcomer clause (Maglev). |
| STRUCTURE | int | 11 -> 90 | 2 | "swapped in rather than mutated" buys atomicity per LOOKUP and nothing wider -- a read-modify-write straddling the swap addresses two different owners. |
| STRUCTURE | int2 | 15 -> 103 | 2 | what the distinct-node walk does when there is no next distinct node. RF=3 on two nodes; three racks in a two-rack deployment. Terminate, validate at startup, relax in a DEFINED order and say so. |
| SCALE | int | 3 -> 106 | 3 | the Model says "pre-warm where you can" and recommends a coalescer. Pre-warming needs the departing node's key set and a future-ring computation; the coalescer absorbs **~none** of a scale-in, because that burst is across DISTINCT keys with nothing to merge. The Model plants the misconception; the Int corrects it. |
| SCALE | int2 | 12 -> 96 | 3 | the Model prices scale-IN only. Scale-OUT costs a cache a comparable miss burst arriving exactly when the origin has least headroom -- and the store/cache bill differs (source p99 vs origin load). |
| DESIGN | int | 7 -> 94 | 2 | follow the hint itself: unreplicated local data, so hinted handoff buys availability and never durability, and must never count toward W. That is what "sloppy" means. |
| DESIGN | int2 | 16 -> 102 | 2 | weighting by token count concentrates repair cost AND correlated-failure exposure on the biggest machine, and the control is integer-coarse. Heterogeneous hardware is an argument against the ring. |
| CB/Balanced but hot | int | 11 -> 121 | 2 | `key:0..K` is an APPLICATION change the store knows nothing about, so an uninformed reader returns 1/K of the truth silently -- and K is a divisor you have just reinvented. |
| CB/Balanced but hot | int2 | 7 -> 98 | 2 | the sketch names the key at 3am and every fix the Model lists is a deploy that lands after the key goes cold. Detection must trigger a mechanism, not a project. |
| CLOSE | int | 16 -> 117 | 2 | you already run a ring and now want slots: dual-mapping, range by range, months for a store -- and a cache should just schedule the miss storm instead. |
| CLOSE | int2 | 21 -> 112 | 3 | the summary says it does not even ACCESS. Name where it fails to even RESIDENCE: size skew (counts even, disk not) and partition cardinality (a partition can never split). |

### 3.2 The eight extra curveballs (commit `84481f0`)

| card | novelty | run | the seam the Int opens |
| --- | --- | --- | --- |
| Flapping node | 12 -> 109 | 2 | the Model prescribes "route around, never re-partition". Doing that makes the failover node cache keys it does not own, and nothing ever invalidates them -- the advice creates unowned state that needs an expiry at birth. |
| Silent RF=1 | 10 -> 110 | 2 | the Model prescribes a property test asserting R distinct physical nodes. The Int grants that it passes and data is lost anyway: mislabelled racks, co-scheduled pods, shared storage. A property test proves code obeys its inputs, never that the inputs describe the world. |
| The 4096-token cluster | 15 -> 130 | 2 | the Model says Cassandra walked its default to 16. How does a cluster ALREADY at 4096 get there? Tokens are a node's ring identity, so you replace machines, not numbers -- weeks of rolling bootstrap-plus-decommission through a mixed cluster that balances worse than either end, with the exposure at its worst while you fix it. |
| The stateless ring | 7 -> 105 | 3 | the team's actual claim was that a uniform hash distributes evenly -- and it does. It distributes REQUESTS; what needs balancing is WORK. The hash is not malfunctioning, it succeeded at the wrong metric, which is why closed-loop least-request wins. |
| Split ring | 18 -> 113 | 4 | the Model ends at detection. Converging is itself a ring change and its own miss storm -- so for a store you stop the divergent writers BEFORE converging, because every write deepens a split history with no automatic reconciliation. |
| Adversarial keys | 13 -> 107 | 3 | the fix is a per-deployment seed. Every routing client must hold it -- that is a directory, the one thing the ring existed to avoid -- and rotating it remaps every key. A secret that is also a partitioning function cannot be rotated. |
| The 'free' rebalance | 12 -> 106 | 3 | the Model says throttle. Does that finish it? A fourteen-hour window IS the exposure, since the joining node is not a read replica throughout -- an acute risk traded for a chronic one, blocking the next node. |
| Kafka's modulo | 16 -> 129 | 2 | the Model says over-provision partitions up front. What does too many cost -- broker handles and memory, leader-election time during the exact failure you provisioned for, per-partition batching that makes you slower, idle consumer assignments. |

**Arithmetic.** 33 = 14 `register_lc` + 19 `thin_int`, all one topic. Cluster A cleared 17
(6 + 11), leaving 16; cluster B cleared 16, leaving **0**. All 14 Models re-authored as spoken
first-person prose. Novelty moved from **3-21** to **90-130**; the donor register runs 63-206.
Answers are 122-162 content words.

**The echo arm on my own work.** The 14 Model rewrites are the corpus's highest-risk instance of
the hazard the guard exists for. Longest shared run between any new Model and its own new Int is
**2-4**, against a corpus legitimate maximum of 8. Measured, not asserted.

**The empty baseline does not retire the instrument.** `--plant` on the empty file still yields
exactly 4 new defects, one per class, across 4 topics, and the per-run self-test still aborts on a
broken detector before any corpus is read.

---

## 4. Wave B's carry-forwards (commit `90fbb0b`, kept separate from the coda)

**N1 -- `distributed-locks` SCALE Int**, the exact twin of the leader-election card alpha fixed:
"what saves you?" answered with the two remedies its own Model names. Novelty 29, silent. Replaced
rather than reworded -- the new Int attacks the Model's *first* recommendation, where it is
weakest. "Dedup by run-id under a unique constraint" stores one bit, and a run that dies halfway is
neither started nor finished: write the key at the start and a hundred thousand charges are
silently skipped; write it at the end and they are re-charged. The idempotency unit must match the
unit of the **side effect** -- `(run_id, customer_id)` in the same transaction as the charge --
which makes the run resumable rather than atomic, demotes the lock to a contention optimisation,
and forbids splitting key and effect across two stores. **29 -> 124.**

**N2 -- `circuit-breaker` CURVEBALL/recovery Int**, whose answer was item 3 of its Model's own
three-item list. Novelty 30, silent. The new Int declines to supply a fourth knob and questions the
layer: probes, jitter and ramps are all **local** controllers while recovery capacity is a
**global** quantity no instance can observe, so two hundred of them tune against an invisible
variable. The category error is that a breaker protects the CALLER from a slow dependency and was
never admission control *for* the dependency -- which belongs on the dependency's own inbound path,
or at a shared gateway when the dependency is not yours. **30 -> 141.**

**N3 -- the cross-topic contradiction with the wave's own donor. Ruled FOR the donor**, and the
reasoning matters more than the verdict. Both cards already agree on canonicalising, excluding
transport noise, and fingerprinting amount / currency / destination -- **the prescribed field sets
are identical**. They differed only in the stated tiebreak, and there the asymmetry decides it: a
false rejection is loud, logged client-side and one exclusion-list entry from fixed, while a false
replay returns a stored response for an operation never performed. api-design had conflated two
decisions -- which fields are transport noise (exclude) and what to do when genuinely unsure
(include) -- so the fix corrects the erring direction while **keeping** its real contribution, that
a naive byte hash is the common shipping bug. It now also separates "include when unsure" from
"hash the whole body", which is the confusion that produced the disagreement in the first place.

**N8 -- `api-design` SCALE's Int premise had lost its Model anchor.** The Int opens "You version in
the URL only when you break" against a Model whose rewrite had dropped the design-for-evolution
clause. Restored as one clause (additive change, tolerant readers, a URL version reserved for
unavoidable breaks). The Int's own subject -- how long v1 runs and who decides -- is untouched.

**The snapshot receipt on N8 is the wave's cleanest demonstration of why the guard exists.** It is
a Model edit with two **kept** exchanges beneath it -- precisely the hazard. Measured rather than
asserted: SCALE Int 117 -> 114 and Int2 82 -> 80, both ~97% retained against a 60% floor. The
DESIGN Int2 held at 63 and distributed-locks' Int2 at 46, neither touched.

---

## 5. N4 -- the doc-vs-code drift, corrected (commit `2521ac3`)

Re-measured with bank_pushback's own rule before changing a word. Three numbers were wrong, not two:

- the shipped **floor** fixture measures novelty **4**, not the 5 the header stated -- and the
  cause is that the fixture is **not corpus-verbatim as the header claimed**. Its Model is a
  paraphrase of soft-delete's DESIGN card. The card itself does measure 5.
- the shipped **ceiling** fixture measures **51**, not 48. 48 is the donor *population's* minimum;
  51 is what this one shipped pair carries.
- an inline comment claimed that pair had novelty **106**. It never did.

So the bracket the self-test can actually abort on is **[4, 51]**, not [11, 48]. Two real
consequences, now stated in the header: raising `NOVEL_MAX` to 49 or 50 would start firing a donor
pair in the corpus while the shipped ceiling fixture stayed silent; and lowering it to 4 does
**not** silence the floor fixture (`4 > 4` is false, so it still fires) -- the downward abort is
delivered by `thin+PAIR-restatement-fires` instead. The guarantee holds in both directions, which
is what matters; the header now says which fixture delivers it.

The four corpus floor numbers (5 / 9 / 10 / 11) and the donor minimum are correct **as corpus
measurements at 42bf6eb** -- re-measured and confirmed here. Comments only, no behaviour change.

This is also why every fixture in `bank_novelty.cjs` is generated from the corpus rather than
typed. A retyped fixture is how a bracket silently stops being the bracket its header describes.

---

## 6. Gate, VR, build

Full `python3 test/check_all.py`, verdict quoted from the capture file `_gate_freeze.txt`, not from
memory.

```
GATE: PASS
```

**58 rows, 58 PASS, 0 FAIL, 0 SKIP, exit 0.** The row tally is counted from the capture file's
summary block and matches the AST count of `check_all.py` -- 57 before this branch, 58 with
`bank_novelty`. **Nothing was skipped**, which matters: a SKIP is how a browser-gated check buys a
green it did not earn.

Load-bearing rows, quoted:

```
build_integrity        PASS  (12022828 bytes, 0 unresolved, 9 panes + 7 overlays,
                              build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
compiler_conservation  PASS  every authored item survives compilation intact.
bank_pushback          PASS  (46 topics, 613 cards, 0 known pushback defect(s) allowlisted
                              in bank_pushback_debt.json across 0 topics)
bank_novelty           PASS  (46 topics, 820 Int exchanges, longest shared run 8 < 9;
                              820 kept exchange(s) held their novelty against the snapshot)
numbers_lattice        PASS  (46/46 topics driven across 567,131 evaluations (37 exhaustive))
cram_surface           PASS  (46 topics, 0 known cram-surface defect(s); mirror verified on all 46)
entity_leak            PASS  (no HTML entity reaches visible text; 3/3 overlay bodies inspected)
build_determinism      PASS  (88 Shiki blocks render identically under a simulated 600ms/line stall)
ascii_guard            PASS  (every src/ .js/.css/.html file is 7-bit ASCII)
visual_regression      PASS  (16 baselines, win32-chromium149; every capture reached a proven rest
                              state across all 18 roots, cleared the blank-page floor, and matched
                              its committed pixels)
```

`compiler_conservation` is the one that matters most for a content wave -- it holds the author's
raw bytes as its reference, so it is the check capable of proving every `Int:` written here
survived into what ships. It was run after every cluster, not only at freeze.

**`build_integrity`'s strongest arm actually ran.** The in-gate run reported `HEAD-match DEFERRED
-- 1 uncommitted path(s) [_gate_freeze.txt]`, which is the trap that took the arm away from three
wave-B agents. So the capture file was **committed** (`ba50805`) and `build_integrity` re-run
against a genuinely clean tree, where it reports **`COMMITTED deliverable == fresh build of
HEAD`**. Both results are recorded above rather than only the good one.

**VR: 16/16 matched, zero baseline churn -- claimed by the match count, not by assertion.** Bank
content renders inside the mock-interview overlay, which the visual-regression suite does not
capture at rest, so no committed baseline could move however much Bank text changed. 14 cards
rewritten plus four carry-forwards and the pixels are byte-identical, which is both the right
outcome and a useful negative control: a moved baseline would have meant a Bank edit leaked into a
surface it has no business touching.

Strict ASCII verified at the **byte** level on every edited file (`ascii_guard` covers `src/`
.js/.css/.html only, so the .md and test files were checked directly): 0 non-ASCII bytes across
`bank_novelty.cjs`, the snapshot, `bank_pushback.cjs`, `check_all.py`, and all five edited topic
markdown files. `consistent-hashing.md` uses ` --- ` (508 occurrences vs 43) and the regeneration
follows it; the four ` -- ` instances that were in the Bank belonged to the replaced Int answers
and are gone.

`npm run build` ran per cluster, six times total. Deliverable 11,983,844 -> **12,022,828** bytes.
No `npm install`/`ci`, no `git stash`, no push, no merge.

---

## 7. Handoff

- Branch `content/chash-coda`, **7 commits**, not pushed, not merged.
- `test/bank_novelty.cjs` + `test/bank_novelty_snapshot.json` (820 entries) + `check_all.py` row 58.
- `test/bank_pushback_debt.json` is `{}`. The mechanism stays as a regression guard; its self-test
  and `--plant` still have teeth at the empty end state, verified.
- Five topic files touched: `consistent-hashing` (the coda), plus `state-machine`,
  `distributed-locks`, `circuit-breaker`, `api-design` (the guard's catch and the carry-forwards).

**For the cold verifier.** The tool cannot judge paraphrase, and a green `bank_pushback` is not
evidence the class is gone -- that is this wave's inherited lesson and it applies to this wave's
own output. Read the 20 new consistent-hashing exchanges against their Models as a senior
interviewer would; the per-card seams in section 3 are the claims to attack. Two other things
worth an independent look: the section 1 measurement, since it overturns a conclusion in the
bank-coldverify (A3's sharding row), and whether `ECHO_RUN_MIN = 9` is right -- the corpus mass at
8 is 1 exchange and at 7 is 4, so the margin above legitimate content is real but not large, and a
future topic that legitimately quotes a longer phrase would be the first false positive.

**Known open, unchanged by this wave:** N5 (alpha's merge-conflict prediction, harmless), N6 (the
survivor's visibility -- now moot, it is fixed), N7 (circuit-breaker intra-topic redundancy, judged
not worth acting on by the cold verifier and I agree). The semantic half of the cram Class H
remains open per Wave C part 2, untouched here.
