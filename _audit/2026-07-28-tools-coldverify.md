# Cold verification -- the two frozen tool waves (cram-checker + numbers-harness)

**Verifier:** wTools-verifier, independent, no context shared with either builder
**Date:** 2026-07-28 - **Subjects:** `tool/cram-checker` @ `50dd1fb`, `tool/numbers-harness` @ `be42ced`, both off master `807b063`
**Untracked verdict file.** Every number below was measured by me in the worktree named, not read from a freeze report.

---

## VERDICT: CLEAN -- both branches are safe to merge.

Nothing blocking. Both tools have real teeth: I re-witnessed the load-bearing arms from scratch and
each one failed when it was supposed to fail. Both baselines are truthful work-lists -- I confirmed
13 sampled entries against the artifact and found **zero fabricated defects**. Both deliverables are
byte-unchanged by hash.

**Six non-blocking findings** follow, four of which are record corrections the merged `_audit/`
files should carry (F1-F3 and F6 in particular), because these reports become the citation for
Waves C part 2 and D part 2.

---

## 1. Byte-unchanged deliverable, by hash (charter 5)

git blob hash of `deepdive_content_pipeline_rehearsal.html`:

| commit | blob |
|---|---|
| master `807b063` | `46ac5661846bd7fedb67c2bafd85172f16fc1a29` |
| `tool/cram-checker` `50dd1fb` | `46ac5661846bd7fedb67c2bafd85172f16fc1a29` |
| `tool/numbers-harness` `be42ced` | `46ac5661846bd7fedb67c2bafd85172f16fc1a29` |

Identical. Additionally, I ran `npm run build` on **both** tips: `git status` stayed clean on each,
so each branch also rebuilds to its committed deliverable byte-for-byte.

**Scope by diff-stat vs master** -- no `src/`, no styles, no deliverable:

- checker: `_audit/2026-07-28-cram-surface-baseline.md` (new), `_audit/INDEX.md` (+1 line),
  `test/check_all.py` (+26/-0), `test/cram_surface.cjs` (new), `test/cram_surface_debt.json` (new)
- harness: `_audit/2026-07-28-numbers-lattice-baseline.md` (new), `test/check_all.py` (+21/-1),
  `test/numbers_lattice.mjs` (new), `test/numbers_lattice_debt.json` (new)

The harness's single "deletion" is the `]:` list terminator moving to accommodate the appended
tuple -- I read the hunk; no check was removed or altered on either branch.

---

## 2. THE GATE, and the arithmetic (charter 6) -- **F1: both reports overstate**

Full gate, foreground, serial, one at a time on an otherwise quiet box, verdict read from a capture
file (never a piped exit code). `npm run build` then `python3 test/check_all.py` on each frozen tip.

| branch | GATE | rows | PASS | FAIL | SKIP | report claims |
|---|---|---|---|---|---|---|
| `tool/cram-checker` @ `50dd1fb` | **PASS** (exit 0) | **55** | 55 | 0 | 0 | 56/56 |
| `tool/numbers-harness` @ `be42ced` | **PASS** (exit 0) | **55** | 55 | 0 | 0 | 57/57 |

Both gates are green, and the two new rows read exactly as advertised:

```
cram_surface     PASS  CRAM SURFACE: PASS  (46 topics, 66 known cram-surface defect(s) allowlisted
                       in cram_surface_debt.json across 35 topics; mirror verified against
                       deriveCram on all 46)
numbers_lattice  PASS  NUMBERS LATTICE: PASS  (46/46 topics driven across 567,844 evaluations
                       (37 exhaustive), 21 defect(s) in 15 topic(s), all allowlisted)
```

Browser was present on both runs (`visual_regression PASS (16 baselines, win32-chromium149)`), so
these are full gates, not the CI-safe subset -- which is why SKIP is 0.

### The arithmetic, settled

The charter's framing -- *"counts differ because each branch carries only its own check"* -- cannot
be right, and that is what flagged this. If both branches add their own single check to a **common
base**, their totals must be **equal**, not different. They are equal. Both are 55.

- master `807b063` registers **54** checks. Verified three ways: an AST parse of the two
  `for name, ... in [...]` loops (the only registration sites; `results = []` starts empty at
  line 89), the same parse walked back through `check_all.py`'s history (54 since `794fe8a`,
  51 before it), and the measured row counts above.
- Each branch adds exactly one and drops none (`cram_surface` / `numbers_lattice`). So each is
  **55**, and the union is **56**.

So the checker's "56/56" is off by one and the harness's "57 of 57" is off by two. This is a
**documentation error only** -- it has no effect on what either tool does, and both gates genuinely
pass with zero failures and zero skips. But these records are what future waves cite, so both
`_audit/` files should be corrected to **55/55**, with a note that the post-union gate is **56**.

**Post-union gate will be 56/56** -- verified on the merged tree, below.

---

## 3. THE UNION MERGE -- **F2: the predicted conflict does not exist**

Both freeze reports predict a `check_all.py` collision ("the one expected merge collision").
There isn't one. Dry-run with `git merge-tree --write-tree` (touches no working tree):

```
master 807b063 + checker 50dd1fb  -> tree c2d29067e089b6046a94e07b4e9070757c7cb9d7   exit 0
        + harness be42ced         -> tree 48a87700f8f85c5e68afd35d41796b60fdd4c57c   exit 0
```

Clean, because the hunks are **disjoint**: the harness appends to the *browserless* block (~line
170) while the checker touches the module docstring (line 12) and the *browser* block (~line 473).
They never meet.

I verified the merged tree is not silently dropping one of them:

- **56 registrations**, with `cram_surface` **and** `numbers_lattice` both present
- 8 files changed vs master, all under `_audit/` and `test/`; deliverable untouched

Team-lead: the serial merge should need no manual resolution. Still merge one at a time and gate
each, per standing practice -- but budget zero conflict-resolution time.

---

## 4. CRAM-SURFACE CHECKER -- claim-by-claim

Run independently in `D:/claude-workspace/_worktrees/deepdive-rehearsal/w5-checker`.

| claim | verdict | evidence |
|---|---|---|
| reproduces its baseline | **HOLDS** | 48 dangling / 6 dup / 12 when-conj / 0 ceiling / 0 void-lift = 66 across 35/46. Exit 0, ~4.6s |
| deterministic | **HOLDS** | two runs byte-identical |
| `--write-debt` byte-identical | **HOLDS** | sha256 `9e2cdf32...` unchanged; `git status` clean after the rewrite |
| `--plant`: exactly 5, one per class | **HOLDS** | exactly 5 new at exactly the named paths (`content-pipeline` dangling, `authz` when-conj, `iac` ceiling NaN, `signing` void-lift, `eav` dup 1.00); 0 mirror-drift, 0 stale, exit 1 |
| DUP_MIN bracket, **up** | **HOLDS** | 0.65 -> 0.66: `dup+ANCHOR-sweep-case: expected FIRE, got SILENCE` -> abort, *"no corpus measurement was attempted"* |
| DUP_MIN bracket, **down** | **HOLDS** | 0.65 -> 0.52: `dup-NEG-by-design-restatement: expected SILENCE, got FIRE` -> abort |
| detector neuterings abort | **HOLDS** (2 of 8 sampled) | `detectDangling -> ''`: 6 fixtures abort. `detectWhenConj -> ''`: 3 fixtures abort |
| a mirror-drift guard can fail | **HOLDS** | re-pointed the mirror `wb.steps[].a -> .c`: **exactly 415 mirror-drift failures**, exit 1 |
| ratchet: new -> red | **HOLDS** | the plant arm |
| ratchet: baseline -> green | **HOLDS** | unmodified run, exit 0 |
| ratchet: stale -> red | **HOLDS** | planted `api-design::dangling::wb.steps[99].a` into the debt JSON -> `1 STALE baseline entr(ies)`, exit 1; baseline restored to its exact committed sha |

### The mirror-drift guard is the most valuable thing on this branch

Worth stating plainly, because it is easy to under-rate. With the mirror re-pointed to `.c`, the
run **without** that guard would have reported a calm, plausible-looking

> `20 live defects across 11/46 topics`

-- a quieter number than the truth, auditing strings no reader ever sees. The guard turns that into
415 hard failures. This is precisely the "green for the wrong reason" failure this repo has already
paid for twice, and it is genuinely closed.

### Baseline truth -- 8 entries sampled across all 3 classes (charter 3)

I did not take the checker's word for any of these. I wrote my own dump script that calls the
**real** `deriveCram`/`deriveScope` and prints the composed sheet as plain text, then read each
flagged string where the reader meets it. **All 8 are real.**

| entry | verdict as rendered |
|---|---|
| `saga::dangling::wb.steps[3].a` | REAL. Spine bullet reads *"Only the ones before the pivot."* with no question anywhere on the sheet |
| `saga::dangling::wb.steps[2].a` | REAL. Opens *"Because each local transaction already committed..."* -- answering a deleted question |
| `saga::dangling::open.cards[0].items[1].a` | REAL but WEAK -- *"It's ACD without isolation"*; the topic is named at the sheet head. The report already calls this one arguable |
| `circuit-breaker::dangling::open.cards[0].items[1].a` | REAL but WEAK -- *"Not recovering a single call, but containing the blast radius"*. Also pre-flagged as arguable |
| `consistency-models::when-conj::trade.decisions[4].opts[1].when` | REAL. Renders *"Strict quorum->Sloppy quorum (hinted handoff) **when when** the home replicas are down"* |
| `microfrontend::when-conj` x3 (`opts[1]` sites) | REAL. Three literal `when when` on the cram sheet |
| `autoscaling::dup::rf.flags[4].fix + wb.steps[6].a` | REAL. *"Drain, then terminate..."* appears in **The spine** and again in **Traps -> the fix** on one sheet |
| `kafka-internals::dup::open.cards[0].items[0].a + items[1].a` | REAL. The one-liner and the 30-seconds are the same sentence with the payoff list reshuffled |

I also confirmed the report's claim that **scope coverage is not redundant**: `microfrontend`'s
`opts[0]` entries are invisible on the cram sheet and render on the **scope** sheet as
*"single-spa + import maps **if when** deployment independence is what you're maximizing"*.

### False-negative probe -- 2 of the 11 "clean" topics -- **F3**

**`feature-flags` reads clean, and it should not.** It carries at least four instances of the very
defect the `dangling` class exists to catch. I dumped the `wb.steps` `{c, a}` pairs to show the cue
the sheet drops:

| cue (dropped) | answer (lifted alone onto the spine) |
|---|---|
| *"Why salt the bucket with the flag key?"* | *"**So** cohorts don't correlate across flags."* |
| *"What can a flag NOT roll back?"* | *"**Data.**"* |
| *"What is the retire order, and why?"* | *"**Code first, definition second.**"* |
| *"What are the three fallback layers?"* | *"In-memory ruleset -> persisted local cache -> the default..."* |
| *"What is the kill switch's real speed?"* | *"**Bounded by** the refresh window..."* |

"So" back-references its question identically to "Because" -- which the detector *does* catch --
but "So" is not in its opener set. "Data." as a standalone spine bullet is opaque cold.

**Control:** `observability`, also listed clean, genuinely is. Its answers are self-contained noun
phrases (*"A span is one timed unit of work with a parent-span pointer..."*); only step 5
(*"Injected on every hop"*, subjectless) is arguable. So the detector is **not** systematically
broken -- but it is signature-based, and **"11 topics are clean" is a floor, not a clean bill.**

This *strengthens* the report's own headline recommendation. The composer fix (lift the cue
alongside the answer) retires this whole class including the misses; a per-item rewrite pass driven
by the 66-entry baseline would leave these behind. If Wave C part 2 goes the per-item route, treat
the baseline as a floor and re-read the 11 "clean" topics.

### Honesty claim (charter 4) -- **HOLDS, and is unusually well executed**

`feature-flags` does read CLEAN under the checker, and I verified both of the sweep's Class-H
findings for it are genuinely beyond mechanical reach:

1. Opener item 2 says an *"instant"* kill switch, while the topic says three times that what
   separates the levels is refusing to say "instantly" -- requires cross-pane knowledge of what
   the topic asserts elsewhere.
2. Whiteboard cues 1-2 are pre-correction framings that cues 4-5 fix. I confirmed this **is**
   visible on the sheet -- step 1's *"A consistent hash of the user id"* and step 4's
   *"hash(user_id) alone means the same unlucky 1 percent lead every rollout forever"* print as
   adjacent equal bullets with no marker for which is current -- but nothing structural can see it.

Neither the tool's output nor its report claims otherwise anywhere. The report states 4-of-7
calibration against the sweep, names `feature-flags` as clean-despite-carrying-two, and warns that
an empty baseline will not mean Class H is closed. That is against-interest disclosure done right.

---

## 5. NUMBERS-LATTICE HARNESS -- claim-by-claim

Run independently in `D:/claude-workspace/_worktrees/deepdive-rehearsal/w5-harness`, plus a
self-contained scratch copy (`test/` + `src/topics/` + `src/topics-md/`; the tool imports only node
builtins, so no `node_modules` and no risk to the real tree).

| claim | verdict | evidence |
|---|---|---|
| reproduces its baseline | **HOLDS** | `46/46 topics driven across 567,844 evaluations (37 exhaustive), 21 defect(s) in 15 topic(s)`, exit 0 |
| deterministic | **HOLDS** | two `--verbose` runs byte-identical |
| `--write-debt` byte-identical | **HOLDS** | sha256 `6df47472...` unchanged; `git status` clean |
| **plant: the real pre-fix lambda compute** | **HOLDS, exactly** | I rebuilt the plant myself from `37cdd8c^:src/topics-md/lambda-organization.md` (5 inputs, no `peakToAvg`) and spliced it into the generated slice. Result: exit 1, **one** new finding, `lambda-organization dead_flag_always_positive:4 Lambda vs always-on -- over is always true across all 15149 sampled points with every assumption > 0` |
| coverage arm | **HOLDS, and stronger than claimed** | see below |
| detector neuters | **HOLDS** (2 of 3 sampled) | dead-flag test -> `false`: 2 fixtures mis-detect, corpus not judged. `isLiteralExpr` -> always false: the **clean** fixture goes red (`const_row:2, dead_flag_never:2`) -- the over-eagerness arm works |
| ratchet: new / baseline / stale | **HOLDS** | plant -> red; unmodified -> green; planted `api-design / dead_flag_never:99` -> `1 STALE entr(ies)`, exit 1 |

### The coverage arm survives a harder test than the builder ran

The report's arm hides the whole generated tree (0 of 38). That is the easy case. The historical
failure in this repo was the compiler silently dropping *some* items, so I removed **3 of 38**
slices and re-ran:

```
NUMBERS LATTICE: FAIL (35 compiled num slices for 38 authored topics in src/topics-md/ --
                       3 missing. This is a COVERAGE SHORTFALL, not a clean corpus...)
```

Exit 1, naming the exact shortfall. The independent reference (counting authored `.md` files) is
genuinely load-bearing at partial granularity, not just all-or-nothing.

### Baseline truth -- 5 findings re-derived with my own driver (charter 3)

I wrote an independent driver from the renderer (`src/scripts/app/num/logic.js`), not from the
harness, using the pane's verbatim `fmt` and its real read path
(`_nval: isFinite(v) && v > 0 ? v : 0`). First I confirmed the three mechanics the report rests on:
`_fmtN` zeroes non-finite input, `_nval` returns 0 for any cleared field regardless of declared
`min`, and `row.v` is injected into the DOM verbatim (so a string value reaches the screen
unformatted). All three check out. **All 5 findings are real.**

| finding | re-derived |
|---|---|
| `probabilistic-structures` `nonfinite:2` | **CONFIRMED, and it is the sharpest.** At `p = 0` -- the input's own declared minimum -- row 2 renders literally **`~Infinity GB`**. It formats its own string, so `fmt.n` never touches it: this reaches the screen |
| `real-time-delivery` `dead_flag_always_positive:6` | **CONFIRMED.** "Write amplification" `over` is false only at exactly zero audience. Input steps by 50 (thousands), so every stepper-reachable positive value trips it. Correctly classed `_positive` |
| `event-driven` `input_decorative:maxRecv` | **CONFIRMED.** Moves row 6's key (*"To DLQ after N tries"*) and its note; `v` stays the literal `"bounded"` and `over` stays false. No figure, no flag |
| `signing` `input_decorative:s_size` | **CONFIRMED, exactly as written.** Moves only the notes on rows 3 and 4 |
| `load-balancing` `nonfinite_zero:1` | **CONFIRMED.** Clearing "Backend instances" (declared `min=1`) renders `Infinity%` for Utilization |

### The discarded findings -- all three discards were RIGHT (charter 3)

This is the tool's failure mode by construction, so I probed it directly. Each row/flag genuinely
moves, so discarding it was correct:

| discarded | my measurement |
|---|---|
| `caching` "Cost of losing 1 point" can never fire | **Fires.** `over` flips false->true between 99 and 99.4% hit ratio (report said 99.5 -- it is alive slightly *earlier* than claimed) |
| `distributed-locks` "Serialized throughput" never moves | **Moves.** 5 distinct rendered values across the critical section (`~10, ~4, ~2, ~1, ~0`). The report's explanation is exactly right: `fmt.n` rounds everything under 0.5 to `~0`, and the coarse ladder's smallest positive point already sat in that flat region |
| `stream-batch-processing` "Keyed state" can never fire | **Fires.** Flips between 1e8 and 1.4e8 keys (report said ~1.47e8) |

Both threshold slips err toward the flags being *more* alive than stated, so the discards stand.

### My own false-negative sweep -- no misses found

I ran a wider, denser single-input sweep than the tool's (including percentage-aware points out to
99.99) across all 46 topics, independently of the harness:

- **0 rows render NaN/Infinity at the authored defaults** -- corroborates the tool.
- 33 rows render a constant value. I extracted each one's `v` expression from source: **all 33 are
  authored literals** (`v: '32'`, `v: 'bounded'`, `v: '~1'`, ...) -- legitimate verdict rows, which
  the static gate correctly excuses. The single apparent exception was my own off-by-one on
  `backpressure`, caused by exactly the documented `fillRow` splice; its real expression row ("Shed
  rate") varies across 10 values.
- Invariant `over` flags I spot-checked are authored literals too (`retries-timeouts` row 4
  `over: true`, `distributed-locks` row 0 `over: false`), correctly excused; the live one
  (`over: worstHold >= ttl`) genuinely varies.

**The static literal gate is correctly calibrated.** Without it this check would open with ~180
fabricated findings, exactly as the report says.

### F4 -- the partial-coverage note does NOT print on a normal run

Report section 6 says the `backpressure` partial is *"reported by the check on every run rather
than buried here."* It is not. `test/numbers_lattice.mjs:792` gates it behind
`if (VERBOSE || isNew.length || stale.length)`, so on a green run it is silent:

- normal run: **0** occurrences of the note
- `--verbose`: prints `PARTIAL COVERAGE (1): backpressure: rows [1] are not object literals...`
- **the full gate log: 0 occurrences** -- which is where it matters, since that is the only place
  anyone will read this check's output from now on

The gate row reads `46/46 topics driven ... all allowlisted` with no asterisk, so the one excluded
row is invisible precisely when the check is passing. Substantively minor -- one row of one topic,
excluded from two of six classes -- but the claim as written is false, and the fix is one line:
print `noteLines` unconditionally.

### F5 -- minor precision slips in the harness report

- `real-time-delivery`: *"over is false only below 1 follower"* -- the input is in **thousands**, so
  the measured boundary is **1,000 followers** (`over` is false at `followers=0.9`, i.e. 900).
  Substance unaffected.
- `event-driven`: *"moves only note prose"* undersells it -- the row **key** changes too
  (*"To DLQ after 5 tries"*). The report's own parenthetical is accurate; the headline sentence
  isn't. The `input_decorative` classification is right either way.
- Discard thresholds: 99.4% not 99.5%, ~1.4e8 not ~1.47e8 (above).

### F6 -- SCOPE GAP: the harness does not answer its own wave's question

Wave D is titled *"do the defaults demonstrate the thesis?"* and its brief names three exemplars.
The harness structurally covers **one**.

| brief exemplar | harness result | why |
|---|---|---|
| `lambda-organization` unreachable branch | **caught** (proven by the plant) | genuinely a dead flag |
| `distributed-locks` *"fits (17s spare)"* default | **not reported** | measured: `over: worstHold >= ttl` is **alive** (varies), just **false at the authored defaults** |
| `retries-timeouts` dark badge on "the killer figure" | **not reported** | measured: "Attempts the deadline affords" = `4 fit the budget`, `over` false at defaults, flag **alive** |

The harness asks *"is this flag dead across the lattice?"* -- a different question from *"do the
shipped defaults demonstrate the thesis?"* A flag that is alive but **off at the defaults**, on a
row the topic's own note calls the killer figure, is a real Class-G defect the sweep named and this
tool has no class for. The report's stated limits (section 6) cover under-reporting at 100-1000x,
the source gate, percentage inference and the `_positive` cut -- none of them name this.

**Consequence for team-lead:** the 21-entry baseline does **not** subsume the sweep's Class-G
findings. Wave D part 2 must carry `distributed-locks` and `retries-timeouts` from
`2026-07-20-content-catalog-sweep.md` separately, or it will close the wave believing they were
covered. This is the one finding here with real downstream cost, and it is a scope-disclosure gap,
not a tool defect.

---

## 6. Findings summary

**BLOCKING: none.**

| # | finding | severity | fix |
|---|---|---|---|
| F1 | Both gate row counts wrong: measured 55/55 on each branch, reports claim 56 and 57. master is 54; each branch adds exactly 1; union is 56 | non-blocking, **record correction** | edit both `_audit/` files to 55/55, note union = 56 |
| F2 | Both reports predict a `check_all.py` union conflict; the merge is clean (hunks disjoint) | non-blocking, informational | drop the warning; budget no resolution time |
| F3 | `dangling` is signature-based and under-reports; `feature-flags` is listed clean while carrying >=4 detached-answer defects | non-blocking, **affects the C-fixes work-list** | note that the 66-entry baseline is a floor; prefer the composer fix, which retires the misses too |
| F4 | Harness partial-coverage note does not print on a normal run, contradicting report section 6; invisible in the gate log | non-blocking, **honesty** | one line: print `noteLines` unconditionally |
| F5 | Units slip (`1 follower` should be 1,000) + two conservative discard thresholds + `event-driven` also moves the row key | non-blocking, cosmetic | correct the prose |
| F6 | Harness does not cover "defaults don't demonstrate the thesis"; 2 of Wave D's 3 named exemplars fall outside it, undisclosed | non-blocking, **affects the D-fixes work-list** | add a stated limit; carry the 2 sweep findings into Wave D part 2 separately |

**What I could not break.** Every teeth arm I re-witnessed failed correctly: 2 dup brackets, 4
detector neuterings across both tools, a mirror-drift guard (415 failures), 2 plants, 2 coverage
arms, 6 ratchet arms. Zero fabricated baseline entries in 13 sampled. Zero false negatives in my
independent const-row / NaN-at-defaults sweep of all 46 topics.

---

## 7. Evidence pins

- Worktrees: `D:/claude-workspace/_worktrees/deepdive-rehearsal/w5-checker`,
  `D:/claude-workspace/_worktrees/deepdive-rehearsal/w5-harness`
- Gate captures: `<scratchpad>/gate_checker.log` (55 rows), `<scratchpad>/gate_harness.log`
  (55 rows), plus the two build logs
- My independent instruments (verifier-owned, not on either branch): `<scratchpad>/drive.mjs`
  (num driver written from `logic.js`), `p1`-`p9.mjs` (re-derivations, discard probes,
  false-negative sweeps); two temporary browser scripts in the checker's `test/` that dumped the
  real `deriveCram` output and the `wb.steps` cue/answer pairs -- **both deleted**
- Plant source rebuilt from `git show 37cdd8c^:src/topics-md/lambda-organization.md`
- Merge dry-run: `git merge-tree --write-tree`, trees `c2d29067...` and `48a87700...`

**Tree state at end of run:** `w5-checker` clean, `w5-harness` clean, main repo clean. No commits,
no pushes, no merges, no `npm install`, no `git stash`. Every plant ran on a scratch copy or was
restored via `git checkout` with the sha re-verified.
