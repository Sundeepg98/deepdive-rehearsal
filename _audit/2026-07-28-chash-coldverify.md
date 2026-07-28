# The consistent-hashing coda -- COLD VERIFY

**wCH-verifier, 2026-07-29. Branch `content/chash-coda` @ 64314c8, worktree
`D:/claude-workspace/_worktrees/deepdive-rehearsal/w8-chash`. No context shared with the builder.**

## VERDICT: CLEAN -- merge.

Gate 58/58 on the frozen tip. Both record corrections STAND and one is understated. All 20
regenerated exchanges pass the acceptance test and are engineering-true on every claim I can check
cold. `ECHO_RUN_MIN = 9` is correct and 10 would be strictly worse -- measured, not argued. All nine
guard arms reproduce. **Zero blocking findings; six non-blocking, listed in section 6.**

Nothing was edited. The worktree is byte-identical to how I found it (`git status` clean,
HEAD 64314c8); every plant ran on a scratch mirror outside the tree, now removed.

---

## 1. The 20 exchanges, read as a senior interviewer

Acceptance test applied per card: **is the Int unanswerable by re-reading its own Model?** Yes on
all 20. Each Int attacks a seam its Model opens and leaves open, and in every case the Model
genuinely does not contain the Int's payload.

### 1.1 The claims the charter flagged -- all four TRUE

**"Dropping balance moves zero keys" (FRAME Int2).** True and it is the whole content of "minimal."
Drop the balance requirement and the optimal scheme is: add the node, give it nothing. The
exchangeability argument that follows is also correct -- the joining node's tokens are drawn from
the same distribution into the same space, so its expected share is 1/(N+1); and a key changes
hands only if a new token lands in the arc it occupies, so the set that moves and the set the
newcomer gains are the same set. That last clause is the sharp part and it is right.

**"Maglev breaks minimal-disruption" (FRAME Int2).** True, and it is the best single line in the
card. Maglev regenerates its whole lookup table when the backend set changes; the claiming order
shifts, so entries can move between two backends that were **both already present**. Consistent
hashing, rendezvous and jump all move keys only toward the newcomer -- jump provably so, that being
its defining property. The gloss that Maglev's own paper therefore claims minimal *disruption*
rather than minimal *movement* is an interpretation, but the underlying engineering claim is
correct and it is exactly the distinction that separates someone who has compared the four from
someone who has read about them.

**"Hinted handoff buys availability, never durability" (DESIGN Int).** True. The hint is ordinary
unreplicated local data on whichever node accepted it; if that node dies before delivering, the
hint dies with it, and nothing notices until anti-entropy runs. Cassandra's 3-hour default hint
window is correct (`max_hint_window_in_ms` = 10800000). See F5 for a precision note on the
"never counted toward W" phrasing.

**"The coalescer absorbs ~none of a scale-in" (SCALE Int).** True at any realistic cache scale, and
I checked it with arithmetic rather than accepting the reasoning. A coalescer removes duplicate
*concurrent* fetches of the same key. Origin fetches during the storm are roughly
`K/N + (R/N) * L` without coalescing and `K/N` with it, where K = keys, N = nodes, R = request rate,
L = origin latency. Coalescing therefore matters only when `R * L` is comparable to `K` -- i.e. when
the number of requests in flight during one origin round-trip approaches the size of the whole
keyspace. For a cache of 10^8 keys at 10^5 rps and 10ms, `R*L` is ~10^3 against `K` = 10^8. "Essentially
none" is right. The structural framing -- a scale-in storm is a **breadth** problem (many distinct
keys, one miss each) not a **depth** problem (many requests for one key) -- is the correct senior
insight, and correcting a Model that lists coalescing among its scale-in mitigations is a
legitimate and good use of an Int.

### 1.2 Other claims I checked cold -- all TRUE

- `hash % N` remaps N/(N+1) on a membership change; "roughly 80% going from four nodes to five."
  Exact: over lcm(4,5)=20, only h mod 20 in {0,1,2,3} keeps its owner, so 4/20 = 20% stay and 80%
  move. The formula and the worked number are both right.
- Load spread falling as 1/sqrt(token count); marginal return dying by 256 tokens. Correct.
- The vnode availability trade: more tokens means more replica-set overlap, so almost **any** R
  simultaneous failures cover some range's full replica set, converting a rare structured failure
  into a common unstructured one. Correct, and it is the real reason Cassandra walked `num_tokens`
  from 256 to 16.
- Cassandra with RF=3 across two racks placing two replicas in one rack. Correct.
- Phi-accrual failure detection; DOWN-for-routing without touching tokens; only `decommission` /
  `removenode` changing the ring. Correct.
- Weighted rendezvous taking weight as a continuous parameter where ring tokens are integer-coarse.
  Correct.
- Kafka: fixed partition count as the divisor, brokers mapped through an assignment map, adding
  partitions being semi-breaking because it changes the divisor. Correct. The four costs of
  over-partitioning (broker file handles/memory, leader-election time during failover, per-partition
  producer batching, consumer parallelism ceiling plus idle assignments) are all real, and the
  batching one is the one candidates miss.
- A bootstrapping node not being a read replica for the duration, so a throttled 14-hour stream is
  14 hours of thinner redundancy; and one-at-a-time bootstrap blocking the next node. Correct.
- "A property test can prove your code obeys its inputs; it cannot prove the inputs are true," with
  the three real shapes (mislabelled racks, co-scheduled pods/VMs, shared storage). Correct and
  the best-argued of the eight curveballs.
- Split-ring: converging is itself a ring change and its own miss storm, so for a store you stop the
  divergent writers **before** converging. Correct, and the priority inversion between cache and
  store is the right call.
- The stateless-ring diagnostic -- "if the cause were key skew the traffic would be uneven too, so
  even traffic with uneven latency means the requests are not the same size" -- is correct and
  reads the problem statement more carefully than most candidates would.

### 1.3 Voice and shape

Consistent spoken first-person throughout, matching the topic's established register. Every Int
lands on a transferable principle rather than a fact (state nobody owns needs an expiry at birth;
a secret that is also a partitioning function cannot be rotated; the exposure you are fixing is at
its worst while you fix it; freezing the divisor converts a continuous problem into a one-time
sizing decision). The CLOSE Int2's ending -- "essentially every problem it cannot solve turns out
to be a problem in what you asked it to map" -- is a genuinely good close for the topic.

### 1.4 The four carry-forwards -- all correct

**N1 (`distributed-locks` SCALE Int).** Correct and the strongest of the four. It attacks the
Model's *first* recommendation, where it is weakest. The analysis is right: a unique constraint on
run-id stores one bit, a half-finished run is neither started nor finished, and both placements of
the write are wrong in opposite directions (silent skip vs re-charge). The fix --
`(run_id, customer_id)` in the same transaction as the charge, making the run **resumable rather
than atomic** -- is the correct engineering answer, and the two follow-ons (the lock demoted to a
contention optimisation; key and effect in one transaction against one store) both matter.

**N2 (`circuit-breaker` CURVEBALL/recovery Int).** Correct. The old Int's answer was item 3 of its
Model's own three-item list -- a genuine defect. The replacement declines the fourth knob and
questions the layer: local controllers approximating a global control loop, and the category error
that a breaker protects the **caller** from a slow dependency and was never admission control
**for** the dependency. Both true. The prescribed fix (concurrency limit or bounded queue on the
dependency's inbound path; a mesh/gateway when the dependency is not yours) is right.

**N3 (the cross-topic ruling, FOR the donor).** I read both cards. The ruling is correctly executed
and the audit's characterisation is accurate. The donor (`idempotency` CURVEBALL/Same key, new
body) and the revised `api-design` DESIGN Int now agree on: rejecting raw-byte hashing; a
deliberately chosen canonical subset; excluding transport noise; fingerprinting amount / currency /
destination-or-target account. And they now agree on the tiebreak, with the same asymmetry argument
and the same closing phrase, "Fail loud on ambiguity." The asymmetry itself is sound -- a false
rejection is loud, client-side-logged and one exclusion-list entry from fixed, while a false replay
returns a stored response for an operation never performed. The separation the fix adds -- that
"include when unsure" is **not** "hash the whole body," because hashing the whole body is declining
to make the decision at all -- is the clarification that resolves the original disagreement, and it
leaves the card internally consistent (exclude what you KNOW is noise; include what you are UNSURE
about).

**N8 (`api-design` SCALE Model anchor).** Correct and minimal. One clause restores the
design-for-evolution premise the Int opens on. I re-measured the collateral independently rather
than trusting the receipt -- see 2.3.

---

## 2. Re-derivation of the section 1 measurement

I built my own parser and measurement from scratch (raw markdown out of `git show`, cards matched
by heading, no project code imported) and **validated it against an external reference before
using it**: bank-alpha section 5b's five published movements and its "lowest post-rewrite novelty is
25, circuit-breaker SCALE Int2." All six reproduce **exactly**:

```
event-driven SCALE int2      expected 106->80   got 106->80
api-design DESIGN int2       expected  79->63   got  79->63
leader-election FAILURE int2 expected  68->53   got  68->53
api-design SCALE int2        expected  96->82   got  96->82
load-balancing SCALE int2    expected  70->57   got  70->57
lowest post-rewrite          expected  25 (circuit-breaker SCALE int2)   got 25, same card
```

Those numbers were published by a different agent in a prior wave, so this calibrates my instrument
against something outside the thing under test. Population: exactly **38** kept pairs under a
rewritten Model, matching the audit.

### 2.1 C1 -- CONFIRMED, and on stronger ground than the audit claimed

Four independent lines, three of which the audit did not have:

1. **The answer is byte-identical across 42bf6eb -> 45ec7fd** (question too), while the Model
   changed. So `58 -> 44` is one unchanged answer measured against the old Model and then the new
   one. It is the shipped card's before/after, not a draft-versus-repair.
2. **omega's own freeze table, line 80**, records `int2=58` -> `int2=44` and annotates the row
   "(Int2 kept)" -- independently corroborating the byte-identity.
3. **Git history settles the draft question.** Only two commits touch
   `src/topics-md/sharding-strategies.md` in all of wave B. The DESIGN Model has exactly **two**
   distinct states across that entire history: the wave-B base, and the one written at `b3b10ce`
   which shipped through `3e30c42` into 45ec7fd unchanged. The Int2 answer's content hash is
   constant at every point. There is no second draft in git.
4. **omega's own narrative never claims a repair.** Its section 5 reads: "My first
   sharding-strategies DESIGN Model stated that card's pre-existing Int2 punchline almost verbatim,
   pushing its novelty 58 -> 44 -- **still passing, but measurably degraded**." It then files the
   hazard as a recommendation to the next wave. omega detected the degradation, judged 44
   acceptable, and shipped it.

So A3's "omega's mid-wave rewrite of its first draft evidently worked" credits a repair that is
nowhere in evidence. **C1 is correct.**

**A3's verdict itself stands, and I confirm it by reading rather than inheriting it.** The shipped
Model establishes dual-write-then-backfill and idempotent batches, but the Int2's payload is
**never-clobbering**, which is a strictly stronger property than idempotent --
`INSERT ... ON CONFLICT DO UPDATE` is idempotent and clobbers. The T1/T2/T3 interleaving, the
"make the race harmless rather than preventing it" framing, and "do not try to lock or coordinate
the two paths" are all absent from the Model. Intact, for the reason A3's *primary* sentence gives.
Only its trailing inference was wrong, and that is exactly what C1 targets.

### 2.2 C2 -- CONFIRMED, and UNDERSTATED

The four named cards rank exactly as stated, with exactly three strictly below sharding:

```
#1  0.740   50 ->  37   rules-engine  SCALE int2     (judged acceptable, wB1)
#2  0.750   52 ->  39   soft-delete   SCALE int2     (judged acceptable, wB1)
#3  0.755  106 ->  80   event-driven  SCALE int2     (READ AND PASSED by the cold verifier)
#4  0.759   58 ->  44   sharding      DESIGN int2    (the designated must-fire case)
```

**I found two the audit did not name, and they make the case stronger:**

```
#5  0.760   75 ->  57   multi-tenant  SCALE int2     (ALSO read and passed -- coldverify A3)
#6  0.762   84 ->  64   multi-tenant  DESIGN int2
```

So six kept pairs sit inside `0.740 - 0.762`, and **two** of them were read and passed by the cold
verifier rather than one. The designated anchor is not merely fourth; it is buried mid-cluster in a
band 0.022 wide. No threshold on that axis separates it from content two readers judged good.
C2's conclusion holds with more margin than it claimed.

### 2.3 The wave's own collateral, measured independently

Applying the same instrument to the coda's own diff (45ec7fd -> 64314c8): **668 exchanges kept
byte-identical, of which exactly 2 sit under a Model this wave rewrote** -- the api-design SCALE
pair from N8.

```
api-design SCALE int    117 -> 114   97.4% retained
api-design SCALE int2    82 ->  80   97.6% retained     (floor 0.60)
```

Matching the audit's receipt exactly. No kept exchange anywhere in the wave lost more than 2.6% of
its novelty. The 14 consistent-hashing Models were rewritten together with their Ints, so those are
new content with no before-state, correctly judged by bank_pushback's floor instead.

### 2.4 Section 3's arithmetic

Every number verified independently: 20 exchanges, 14 distinct Models, novelty **3-21 -> 90-130**
(exact), answers **122-162** distinct content words (exact -- this is the set size their own
`novelty().words` reports; the total-token count is 186-240), longest run between any new Model and
its own new Int **2-4** (exact), against a corpus legitimate maximum of 8. The wave's own
highest-risk instance of the hazard is clean by a factor of two.

---

## 3. ECHO_RUN_MIN = 9 -- RULING: ship at 9. 10 would be strictly worse.

### 3.1 The distribution, measured independently over all 820 exchanges

```
run= 1     30        run= 5     21
run= 2    417        run= 6      7
run= 3    265        run= 7      4
run= 4     75        run= 8      1     <- saga FRAME int, the legitimate maximum
                     run>=9      0
```

"holds locks across the network from prepare commit" is the 8. The builder's stated worry is exactly
right as a fact: the mass at 8 is one exchange and at 7 is four. Thresholds 7 and 8 fire on 5 and 1
legitimate exchanges respectively; **9 is the lowest threshold with zero false positives.**

### 3.2 What raising it to 10 actually costs -- the measurement that decides it

The builder's worry is one-sided: it prices the false-positive risk of 9 and never prices the
false-negative cost of 10. So I measured it. I planted a verbatim punchline restatement -- the
answer's opening sentence spliced into its own Model, which is precisely the defect this arm exists
to catch -- on **every one of the 872 exchange slots in the corpus**, and measured what each
threshold catches:

```
ECHO_RUN_MIN= 8:  catches 717 (82.2%)   misses 155
ECHO_RUN_MIN= 9:  catches 677 (77.6%)   misses 195
ECHO_RUN_MIN=10:  catches 628 (72.0%)   misses 244
ECHO_RUN_MIN=11:  catches 588 (67.4%)   misses 284
```

**Moving 9 -> 10 gives up 49 measured true positives to buy zero measured false positives.** The
plant distribution is roughly flat from 9 to 24, so there is no cliff that makes 10 a natural
resting place -- every step up costs another ~40-49 real catches.

### 3.3 The ruling

Ship at 9.

- It is the lowest threshold with zero false positives on the full 820-exchange corpus.
- The alternative costs 49 demonstrated catches for nothing demonstrated in return.
- The cost asymmetry runs the same way. A false positive is **loud**: the check fails, prints the
  offending phrase, and a human adjudicates in a minute. A false negative **ships a restated card
  silently** -- the exact failure this wave exists to fix, and the one that got past both wave-B
  builders and their cold verifier.
- The one-word margin is real, but the durable protection is not the integer -- it is that the
  self-test brackets it from **both** sides and aborts the whole run on drift in either direction.
  The threshold cannot move quietly.

**Guidance for the first false positive, which is a plausible near-term event.** Do not raise the
threshold reflexively; on this evidence each step costs ~40-49 true positives. Adjudicate the single
case. If it is genuinely legitimate, it becomes the new ceiling fixture at its measured run, and the
bracket is re-established at the new value. The check's header already documents that 9 sits in an
8 -> 19 gap "with no corpus mass anywhere inside it," which my measurement confirms exactly.

I also confirmed the two directions the charter asked about: the planted-restatement fixtures
genuinely fire (dropping RETAIN_MIN to 0.55 silences `drift+FLOOR-planted-punchline-restatement`
and aborts), and the legitimate 8-run case genuinely does not (dropping ECHO_RUN_MIN to 8 makes
`echo-CEILING-saga-longest-legitimate-run` fire and aborts).

---

## 4. Guard teeth -- all nine arms reproduce

Run on a scratch mirror outside the worktree. Every arm matches the audit's section 1.5 table,
with one number wrong (F2).

| arm | result |
|---|---|
| `--plant` | exactly **1 echo** (cdc SCALE int2) + **1 drift** (idempotency SCALE int2), different cards, each arm silent on the other's plant. exit 1 |
| neuter `echo` | 3 fixtures fail, "no corpus measurement was attempted", exit 1 |
| neuter `drift` | 2 fixtures fail, corpus never measured, exit 1 |
| `ECHO_RUN_MIN` 9 -> 8 | saga ceiling fixture fires (8 words), abort |
| `ECHO_RUN_MIN` 9 -> 20 | 3 floor fixtures go silent, abort |
| `RETAIN_MIN` 0.60 -> 0.75 | `drift-CEILING-steepest-legitimate-loss` fires, abort |
| `RETAIN_MIN` 0.60 -> 0.55 | `drift+FLOOR-planted-punchline-restatement` goes silent, abort |
| `_generated/` absent | 39 COVERAGE failures, only 128 exchanges / 8 topics measured, exit 1; `--write-snapshot` **REFUSES**, snapshot md5 unchanged |
| snapshot idempotency | two consecutive writes byte-identical, **and byte-identical to the committed file** |

The two plants are orthogonal **by construction**, not by luck: the echo plant splices a short
verbatim run (long run, vocabulary barely moves) and the drift plant appends the answer's tail with
word order reversed (identical vocabulary absorbed, longest run 1). Neither arm is a proxy for the
other.

The self-test runs **before** the corpus is read and aborts -- so a broken detector cannot buy a
green, which is the property that matters most here.

**`bank_pushback` at the empty end state still has teeth.** PASS / exit 0 on the empty ratchet;
`--plant` yields exactly 4 new defects across 4 topics / exit 1; neutering `thin_int` aborts on 3
self-test fixtures / exit 1. (I initially read exit 0 on the neutered run -- that was my own
pipeline bug capturing `tail`'s status rather than node's. Re-tested without the pipe: exit 1.
No finding.)

---

## 5. Mechanical

- **Full gate on the frozen tip: `GATE: PASS`, exit 0. 58 rows, 58 PASS, 0 FAIL, 0 SKIP.**
  Row count verified two independent ways: 58 rows in the capture file's summary block, and **58**
  by parsing `check_all.py` with `ast` and counting tuple literals in the registered for-loop
  iterables (25 + 33). Capture at
  `.../scratchpad/gate_coldverify.txt`, written outside the tree so the tree stayed clean.
- **`build_integrity` strong form confirmed on the final tip**, not a prior commit:
  `COMMITTED deliverable == fresh build of HEAD`, 12022828 bytes, 0 unresolved. The tree was clean
  before the run and clean after it.
- **VR: zero baseline churn, proven by content hash rather than by the check's own match count.**
  All **1292** PNGs are byte-identical between 45ec7fd and 64314c8 -- identical git object listings,
  md5 `45124925...` on both sides. `visual_regression` separately reports 16/16 matched.
- `compiler_conservation` PASS -- every authored item survives compilation intact. This is the row
  that matters for a content wave and it holds the author's raw bytes as its reference.
- `bank_pushback_debt.json` is `{}` (3 bytes). Ratchet EMPTY.
- `bank_novelty` PASS: 46 topics, 820 Int exchanges, longest shared run 8 < 9, 820 kept exchanges
  held their novelty.
- **Scope:** exactly the 14 declared files -- 5 topic markdown files, 4 test files, `check_all.py`,
  2 audit docs, `_gate_freeze.txt`, and the built deliverable. Nothing outside it.
- **Strict ASCII:** 0 non-ASCII bytes across `bank_novelty.cjs`, the snapshot, `bank_pushback.cjs`,
  `check_all.py` and all five edited topic markdown files, verified at the byte level. See F1 for
  the one control character.

---

## 6. Findings -- 0 blocking, 6 non-blocking

**F1 (hygiene, code).** `test/bank_novelty.cjs` contains a **raw NUL byte** at offset 10991, inside
a string literal used as the fingerprint separator: `const s = plain(q) + '<NUL>' + plain(a);`. It
is written as the literal byte rather than as an escape. Consequences: it is 7-bit ASCII, so the
audit's claim is literally true; node parses it; git treats the file as text because the NUL falls
past git's 8000-byte binary sniff window. **But `grep`/`rg` declare the file binary and refuse to
print matching lines** -- I hit this on my first search of it and it cost a detour. For a file whose
thresholds, brackets and rationale all live in its comments, that is a real maintenance cost, and it
is invisible to `ascii_guard` (which covers `src/` .js/.css/.html only). One-character fix:
`'\u0000'`. Not worth blocking a merge; worth a follow-up commit.

**F2 (record).** Audit section 1.5's watched-red table records the echo plant as
"cdc SCALE Int2, **run 31**". The frozen tip produces **run 16** -- the check itself prints "the
Model restates 16 consecutive content words," and the mechanism cannot reach 31 (it splices 22 raw
words, which is 15-16 content words). The **arm works correctly**; this is a record error, not a
behavioural one. Worth noting because it is the same doc-vs-code drift class this wave itself filed
and corrected as N4, one level up. The shipped code header does **not** contain the error -- it is
audit-only.

**F3 (record, trivial).** Audit section 6: "the four ` -- ` instances that were in the Bank belonged
to the replaced Int answers and are gone." The Bank had 4; **three** are gone and one survives, at
line 1062 under `### Frames`, on a line this wave did not touch. Separately, the "508 occurrences vs
43" figure is the pre-existing convention at master (the tip is 543 vs 40) -- which is what that
sentence is asserting, so it reads correctly.

**F4 (content, judgment).** **The FRAME Int is the weakest of the 20.** It passes its own acceptance
test -- its payload is genuinely not in the FRAME Model. But its answer is close to a paraphrase of
the topic's own "Defend the design" Model Answer: the three-condition rule restates that card's
`THE ACTUAL RULE` decision tree, and the pricing of the map (a component that must stay consistent,
partition count decided once, too few = coarse forever, too many = per-partition overhead, changing
it later relocates keys) restates its `TRADE` bullet almost beat for beat. Its first half is also
the complement of the CLOSE Bank Model's when-not-to tree. Same class as N7, which the coldverify
judged not worth acting on; **I agree and would not act on it either** -- recorded so the next
reader knows it was seen and weighed rather than missed.

**F5 (content, precision).** DESIGN Int: *"a hinted write buys availability, not durability, and it
must never be counted toward W."* Correct as prescription, and literally correct for Cassandra,
where hints do not satisfy the consistency level (except the CL=ANY footgun). But read as a
description of sloppy-quorum **mechanics** it inverts Dynamo section 4.6, where operations go to the
first N *healthy* nodes and the substitute node's acknowledgement **is** what satisfies W -- that is
precisely what makes the quorum sloppy. The answer's own next clause ("your acknowledgement came
from a node that was never supposed to hold the key") and its strict-quorum closing show the author
knows this, so the card survives the push; the sentence would be sharper as "must never be counted
toward your **durability** budget." Optional.

**F6 (content, completeness).** The 4096-token Int offers rolling node replacement (correct, and the
right primary answer) or "a second cluster and migrate, costs double the hardware and needs an
application that can dual-write." It omits the canonical play for this exact problem: **stand up a
new datacenter with `num_tokens=16`, `nodetool rebuild`, switch clients, decommission the old DC** --
which needs no dual-write because the database replicates cross-DC for you, and is materially
cheaper than the option given. Everything stated is true; the strictly better option is missing. A
senior interviewer would likely raise it.

---

## 7. What I did not verify

- I did not read the other 44 topics' banks; scope was the 20 regenerated exchanges plus the four
  carry-forwards plus the two donor/corrected cards.
- The corpus run distribution and novelty measurements are mine; the browser-gated rows
  (`visual_regression`, `render`, `e2e_interactions` and the rest) I take from the gate run, with
  VR independently cross-checked by baseline content hash.
- Uncommitted working-tree drafts are unknowable from git. C1 is established on what shipped, on
  omega's own table, on the two-state git history, and on omega's own narrative -- which
  collectively make "no second draft" the well-supported reading, but the underlying proof is that
  **the shipped Model produces 44**, and that is enough for the correction to stand regardless.

---

## 8. Note for the team lead

This file is **untracked** in the main worktree at `D:/claude-workspace/deepdive-rehearsal`, as the
charter specified. Be aware that an untracked path in the repo root is exactly what makes
`build_integrity` report `HEAD-match DEFERRED` -- the trap that took the strong arm away from three
wave-B agents. If you gate master after merging, either commit this file first or expect the
deferral.
