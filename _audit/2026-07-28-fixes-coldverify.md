# Cold verification -- the two frozen content-fix waves (C cram-fixes + D numbers-fixes)

**Verifier:** wFix-verifier, independent, no context shared with either builder
**Date:** 2026-07-28 · **Subjects:** `content/c-fixes` @ `9f8d82e`, `content/d-fixes` @ `5c0e2f9`, both off master `521663d`
**Untracked verdict file.** Every number below was measured by me, in the worktree named, with my own
instruments. Nothing here is read from a freeze report except the claims being tested.

---

## VERDICT: CLEAN -- both branches are safe to merge. Nothing blocking.

Both gates are genuinely green at **56/56**, both deliverables rebuild to their committed bytes, both
VR baseline sets are untouched, and the substantive engineering in both waves holds up: I re-derived
the load-bearing claims from scratch and they reproduce, several of them exactly.

**Eight non-blocking findings** follow. Three matter enough to act on:

- **F3** -- C's `--plant` watched-red arm silently went from 5 classes to **4**. The dangling plant is now
  a no-op. The class still has teeth (I proved both remaining arms fire), and the fix is one line.
- **F4** -- C's claim that 2 of the sweep's 6 named Class-E quotes were *already* gone pre-wave is wrong;
  both were live at master and **C fixed them itself**, so they are double-counted.
- **F1** -- C's gate row count is wrong again (54 claimed, **56** measured). Fourth miscount in this fleet.

**The design disagreement C flagged as its highest-value attack: the two-unit mirror is CORRECT.**
I measured the alternative across the whole corpus. It would have caught **zero** additional duplicates
and **silenced two real ones**. Section 3.

---

## 1. THE GATE COUNT, settled AST-exact and by measurement

`test/check_all.py` is **byte-identical on all three trees** -- sha256
`8589569475ef35575aef9cbadec29aa8d9a083ab7c50062ec658b0aa9135e0e2`, git blob
`065b7a9b07a9186b004c563970dd9d5130f30a69`. Neither branch adds, removes, or edits a check.

AST parse of the two `for name, ... in [...]` registration loops (the only registration sites;
`results = []` at line 90 starts empty):

| loop | entries |
|---|---:|
| line 91 (browserless) | 23 |
| line 199 (browser) | 33 |
| **total registrations** | **56** |

Each loop body appends **exactly one** row per registration, unconditionally (`results.append` at 195,
581, 589 -- 581 is the no-browser SKIP branch of the same iteration). There is no code path that yields
54 rows. Both branches carry `cram_surface` **and** `numbers_lattice`; the check-name lists are
identical to master's, diffed line by line.

Full gate, foreground, **serial** (never concurrent), verdict read from a capture file:

| branch | GATE | rows | PASS | FAIL | SKIP | report claims |
|---|---|---:|---:|---:|---:|---|
| `content/c-fixes` @ `9f8d82e` | **PASS** (exit 0) | **56** | 56 | 0 | 0 | 54/54 -- **wrong** |
| `content/d-fixes` @ `5c0e2f9` | **PASS** (exit 0) | **56** | 56 | 0 | 0 | 56/56 -- **correct** |

**The one true number is 56.** 54 was master's count *before* the two tool waves merged; `521663d`
already contains both, so a branch that adds no check gates at 56. Browser present on both runs
(`visual_regression PASS (16 baselines, win32-chromium149)`), so these are full gates, not the CI-safe
subset -- which is why SKIP is 0.

**F1 (non-blocking, record correction).** Correct C's record to 56/56. This is the fleet's fourth
miscount of this same number; the AST method above is cheap and settles it -- consider running it in
the gate itself so the number can never be typed by hand again.

---

## 2. BUILD INTEGRITY + VR -- the strong form, verified by hash on both branches

The claim for a wave that edits the deliverable is *committed deliverable == fresh build of HEAD*.
I ran `npm run build` on each frozen tip myself and compared hashes:

| branch | committed blob | `git hash-object` of my fresh build | identical | `git status` after |
|---|---|---|:--:|---|
| `content/c-fixes` | `ef8c5d46a509570a10c0d69130fbcf2bb7f0306f` | `ef8c5d46a509570a10c0d69130fbcf2bb7f0306f` | **yes** | clean |
| `content/d-fixes` | `57a9bbd4bf82ba662fcba531f2189174f3935493` | `57a9bbd4bf82ba662fcba531f2189174f3935493` | **yes** | clean |

sha256 of the on-disk file was unchanged by the rebuild on both. The gate's own `build_integrity`
independently reports *"COMMITTED deliverable == fresh build of HEAD"* on each. The build is also
reproducible on this box today -- worth recording given this repo's history of build nondeterminism.

**VR: 16/16 baselines matched committed pixels on BOTH branches**, no re-capture, from the gate rows.
I checked the mechanism behind each wave's zero-churn claim rather than taking it:

- **C** -- the cram sheet is an overlay rendered into a shadow root on demand; no baseline captures it,
  and the trade-pane baselines pin the flagship topic. Holds.
- **D** -- `visual_regression.cjs:163` pins `const T0 = 'event-driven'`, confirmed. The 16 baselines are
  `drill/home/m-walk/num/room-*/sys/walk/wb` -- **neither `distributed-locks` nor `retries-timeouts`
  (the only two topics whose defaults moved) is among them.** Holds.

**Scope**, by diff-stat vs `521663d`:

- **C** -- 33 files: 23 `src/topics-md/*.md`, 3 `src/topics/*/trade.js`, `cram-derive.js`,
  `content-sheet.js`, **`test/cram_surface.cjs`**, `test/cram_surface_debt.json`, 2 `_audit/`.
- **D** -- 19 files: 11 `src/topics-md/*.md`, 5 `src/topics/*/num.js`,
  `test/numbers_lattice_debt.json`, deliverable, 1 `_audit/`.

**F2 (non-blocking, scope correction).** The charter's premise -- *tools byte-identical to master on
both branches* -- is **false for C**: `test/cram_surface.cjs` moved `b803424 -> 381bee8`. This is
disclosed in C's own report and it is **necessary**: the checker mirrors the composer, so a composer
change that the mirror does not follow trips mirror-drift on all 415 spine lifts. I read the diff in
full and it only **adds** teeth:

- `DUP_MIN` (0.65), `DUP_MIN_WORDS` (8), `RE_PRONOUN`, `RE_ELLIPTIC` -- **all unchanged**.
- `dup` still filters and compares `L.text` (the answer). Untouched.
- **New guard 4** asserting the composed line reaches the rendered sheet.
- **New negative-control fixture** `dangling-NEG-cue-lifted`, bracketing the new shape against the old.

No threshold was loosened and no detector was weakened. D's tools (`numbers_lattice.mjs`,
`check_all.py`, `visual_regression.cjs`) **are** byte-identical to master.

---

## 3. THE DESIGN DISAGREEMENT -- should `dup` see the composed line? **NO. The two-unit mirror holds.**

C flagged this as the highest-value thing to attack. I attacked it two ways and both say the shipped
design is right.

### 3.1 The structural reason (from the code, not the report)

`dup` **only compares lifts in different sections** (`if (cand[i].sec === cand[j].sec) continue`). The
spine is a single section, so two spine lines are *never* compared to each other -- whatever unit is
measured. Therefore the unit choice can only affect **spine-vs-non-spine** pairs, and on those,
prepending a cue adds tokens to **one side only**, which drags a Jaccard score down. The unit choice
cannot buy spine-internal detection, and it can only cost cross-section detection.

### 3.2 The measurement (my own instrument, whole corpus, same tokeniser and threshold)

I built `wfix_dup.cjs` from `cram_surface.cjs` by adding a **parallel** score on the composed line, so
both candidate units are measured on the same pairs in the same run. On the **pre-fix** corpus (master's
deliverable), 58 cross-section pairs scored >= 0.45 on either unit:

```
MISSED by the shipped answer-unit but caught by the line-unit: 0
CAUGHT by the shipped answer-unit but silenced by the line-unit: 2
```

The two are exactly the pairs C named, and **C's numbers reproduce to three decimals**:

| pair | answer-unit | line-unit |
|---|---:|---:|
| `notifications` wb.steps[7].a + trade.decisions[5].opts[1].when | 0.682 **fires** | 0.577 silenced |
| `rules-engine` wb.steps[4].a + rf.flags[2].fix | 0.722 **fires** | 0.565 silenced |
| `autoscaling` wb.steps[6].a + rf.flags[4].fix | 0.912 fires | 0.775 fires |

**Ruling: the two-unit design holds.** Moving `dup` to the composed line would have laundered two real
duplicates and gained nothing anywhere in the corpus. C's instinct and its receipt are both correct.

**Charter question (a) -- can two duplicate *composed lines* (same cue AND same answer) slip
sentence-level dup?** No. Identical answers give the answer-unit a Jaccard of 1.00, so it is *strictly
more* sensitive there. The only shape the line-unit could add is **different answers under near-identical
cues** -- and I checked: **all 415 cues are unique within their topic**, so that shape does not exist in
this corpus. (It would also be same-section, so the section rule blocks it anyway.)

### 3.3 Charter question (b) -- does anything read as a duplicate on the sheet while passing? **Yes, four.**

Post-fix, 49 pairs score >= 0.45 and **none fires on either unit**. But the top of that band reads as
duplication to a human on the rendered sheet:

| pair | answer-unit | what a reader sees |
|---|---:|---|
| `kafka-internals` wb.steps[7].a + rf.flags[3].fix | **0.640** | the same four-link durability chain (`acks=all` + `min.insync.replicas=2` + `unclean.leader.election=false` + producer retries) prints near-verbatim in **The spine** and again in **Traps** |
| `multi-tenant` wb.steps[6].a + rf.flags[4].fix | 0.606 | "Set it transaction-scoped ... under PgBouncer transaction pooling, session state isn't just leaky, it's meaningless" -- twice |
| `state-machine` wb.steps[4].a + rf.flags[5].fix | 0.567 | the transition-outbox mechanism twice |
| `real-time-delivery` wb.steps[7].a + rf.flags[7].fix | 0.563 | the buffer-bound policy, incl. the 200k x 1MB = 200GB figure, twice |

**This is not an argument for the line-unit** -- it scores every one of these *lower* (0.582, 0.556,
0.486, 0.529). It is a **threshold** observation, and it is **F7** below. All four are pre-existing:
identical scores on master, untouched by C, and below threshold so never in the 66-entry baseline.

---

## 4. THE EMPTY-RATCHET END STATE -- the guard works, but one arm quietly died

`test/cram_surface_debt.json` is `{}` on the C tip (3 bytes). This is the exact state where a dead
detector becomes a permanent false green, so I re-witnessed every arm on a **scratch copy** -- the
checker takes the HTML path as an argument, so I pointed it at *copies* of the deliverable and never
modified either worktree.

**Control:** unmodified scratch run reproduces `CRAM SURFACE: PASS (46 topics, 0 known ... across 0
topics; mirror verified against deriveCram on all 46)`, exit 0.

| arm | result | verdict |
|---|---|---|
| **Guard 4** -- composer reverted to lifting `.a` bare (patched in a *copy* of the deliverable) | **exactly 415 mirror-drift**, exit 1 | **HOLDS, exactly as claimed** |
| **Detector neuter** -- `detectDangling` returns `''` | **6 self-test fixtures abort**, *"no corpus measurement was attempted"*, exit 1, no browser launched | **HOLDS** |
| **Planted NEW defect** vs the empty baseline (`--plant`) | **4** new defects, exit 1 | **HOLDS, but see F3 -- should be 5** |

**Guard 4 is the load-bearing one and it earned it.** With the composer reverted, the run reported
`0 new defect(s), 0 live defects across 0/46 topics` -- the `dangling` class stayed **green** while the
sheet had gone back to printing bare answers. Guard 4 alone turned that into 415 hard failures. This is
precisely the "green for the wrong reason" failure this repo has paid for before, and it is closed.
It is also *why* pointing `dangling` at the composed line is safe: the guard pins the composer, so the
unit the detector measures is provably the unit the reader meets.

### F3 -- the `--plant` arm silently degraded from 5 classes to 4 (non-blocking, but fix it)

The dangling plant is `p1.data.wb.steps[0].a = 'They do. And that is the whole trick.'` -- a **spine
answer**. Before the composer fix, `dangling` measured that answer and the pro-form "They" fired it.
Now `dangling` measures `cue + arrow + answer`, so the line begins with the cue and the plant is a
**no-op**. `--plant` yields 4, not the 5 the previous cold-verify measured on master. Nothing in the
code or the report notes this.

I confirmed the class itself is fine, and that the fix is trivial: I retargeted the plant at
`open.cards[0].items[1].a` -- an opener item, which C's own report states is still lifted **bare** --
and got **5 NEW defects, exit 1**, with `content-pipeline [dangling] open.cards[0].items[1].a` restored.

Severity: non-blocking. `--plant` is a manual watched-red arm, not run by `check_all.py`, and the
dangling class retains two independent proofs of teeth (6 fixtures + guard 4). But the plant is the
documented end-to-end proof that each class can fail on the real corpus, and it now silently covers
4 of 5. One line restores it.

---

## 5. THE COMPOSER FIX ON THE RENDERED SHEET -- holds, measured not eyeballed

I rendered real sheets (`deriveCram` + `BASE_SHEET` + `CS_SHEET` in a shadow root, exactly as
`cram-overlay.js` mounts them) and read them as the reader meets them.

**All 46 topics, 415 spine lines: 0 missing cue, 0 missing arrow, 0 overflowing.** The 415 matches the
guard-4 failure count exactly, which independently confirms C's "all 415 steps carry a cue" claim.

**Cue styling, measured as WCAG contrast against the sheet background, both themes** (6 topics,
55 lines: `feature-flags`, `saga`, `event-driven`, `observability`, `notifications`, `circuit-breaker`):

| theme | cue | answer | cue quieter |
|---|---|---|---|
| light | `rgb(103,97,90)` -- **5.80:1** | `rgb(42,40,35)` -- 13.98:1 | **55/55 lines** |
| dark | `rgb(173,167,157)` -- **8.05:1** | `rgb(236,234,228)` -- 15.98:1 | **55/55 lines** |

Quieter than the answer in every line in both themes, and both cue values still clear AA for normal
text -- muted, not degraded.

**Longest composed line in the corpus:** `consistency-models[7]`, **1074 chars** (cue 82). Rendered:
`scrollWidth 1260 == clientWidth 1260` (no horizontal overflow), `withinParent: true`, wraps to 140px.
No layout breakage. Top five longest are all `consistency-models`; none overflows.

**The five F3 detached answers, read off the rendered `feature-flags` sheet -- all self-contained:**

```
[4] Why salt the bucket with the flag key?  ->  So cohorts don't correlate across flags. ...
[5] What are the three fallback layers?     ->  In-memory ruleset -> persisted local cache -> the default ...
[6] What is the kill switch's real speed?   ->  Bounded by the refresh window: sub-second on a stream ...
[7] What can a flag NOT roll back?          ->  Data. The flag flips code, not the rows already written. ...
[8] What is the retire order, and why?      ->  Code first, definition second. ...
```

The charter's named example reads exactly as promised. `saga[3]` likewise now reads *"Step order --
which steps even need a compensation? -> Only the ones before the pivot."* The F3 false negatives --
which the checker structurally could not see and which no baseline entry ever named -- are genuinely
retired by the composer route.

---

## 6. THE 19 TELLS, and an audit of the ones left alone

I wrote my own extractor for both authoring formats (markdown `## Trade-offs` sections and hand-coded
`trade.js` `tell:` fields) and diffed master against the C tip.

**Corpus: 289 tells across 46 topics on both trees. Exactly 19 changed. Zero added, zero removed.**
The 19 match C's table **topic-for-topic and index-for-index** -- no undisclosed edit, no quiet
deletion. Five quotes sampled from the report's "after" column appear verbatim in the corpus.

**Judgement on the 19: all are genuine improvements.** Each replaces a preference or a restatement with
a condition that can flip the call, the engineering is sound, and each stays in its topic's voice.
The strongest: `retries-timeouts[0]` ("once retries are more than a few percent of your traffic to that
dependency, you have stopped recovering from a blip and started **being the load**"),
`multi-tenant[2]` (the trigger is a per-tenant obligation you cannot express as a predicate on a row --
and "scale is never the reason"), `storage-engines[0]` (Bloom filters rescue point reads and do nothing
for range scans), `slos[0]` (start from what you measured, set the target a notch below).
`circuit-breaker[0]` correctly fixes the sweep's named tautology by giving a *rate not count* rule with
a worked 10-calls-a-minute example.

### The left-alone audit -- I read 39 of them, not the 8 asked for

**`distributed-locks` -- all 7 flagged, all 7 left. The call is DEFENSIBLE; the stated reason is not.**
C justified it as *"every one turns on efficiency vs correctness, which is the axis of the topic."*
That is true of only **three** ([0], [3], [4]). The others turn on different axes -- [5] on whether the
contended resource *is* the database, [6] on contention level, [2] on critical-section duration, [1] on
avoidability. The tells are **more varied** than C claimed, which is a *better* defence than the one
given. I also checked the second Class-E form (*restates its own bullets*) against the actual option
bullets: [0], [3], [4], [5], [6] each introduce a switch the bullets do not state.

**One genuine near-miss:** `distributed-locks[1]` -- *"Design the lock out ... whenever possible; reserve
a distributed lock for genuinely-exclusive operations against resources you can't coordinate otherwise."*
The condition is close to circular (use a lock when you cannot avoid a lock) and it partly restates its
own bullets ("irreducibly-exclusive", "only fits when the operation can be made idempotent/conditional/
partitioned"). What rescues it is the **ordered ladder** (idempotency -> OCC -> single-writer), which is
new and actionable. Borderline, not wrong to leave.

Other left-alone topics sampled in full: **`error-propagation`** (7) -- all carry testable triggers; [0]'s
*"does this code change what someone does?"* is a real test. **`stream-batch-processing`** (7) -- all name
measurable axes (freshness need, replayability, the **measured** p99 of out-of-orderness, state size).
**`lambda-organization`** (7) -- exceptional; the utilization crossover is computed, and [6] actively
corrects a dead argument. **`debugging`** (7) -- every one pairs a rule with its named failure mode.
Spot-checked: `state-machine[1]`, `retries-timeouts[1]`, `observability[0]`, `api-design[3]`.

**Two more borderline leaves, both disclosed by C:** `api-design[3]` resolves to *"use both"* -- literally
the sweep's named pattern -- but immediately names which failure each half is for, which is the saving
move. `observability[0]` says *"it isn't a choice of one"*, rescued by assigning a distinct role per
pillar. Neither is wrong; both are the kind of call worth naming out loud, and C did.

### F4 -- the "2 quotes already gone" claim is wrong, and double-counts C's own work

C writes that the rest already carry a trigger, *"several visibly sharpened by the P0 waves since the
sweep: **2 of the sweep's own 6 named quotes no longer exist in the corpus at all** ... both since
reworded."* Measured against the corpus at master `521663d`:

- **`multi-tenant`** -- *"reach for schema-per-tenant only when a middle ground ... is genuinely needed"*
  exists **verbatim** at `src/topics-md/multi-tenant.md:707`. Not gone.
- **`replication`** -- the exact 8-word string *"Prefer semi-synchronous by default"* is absent, but the
  tell at `src/topics-md/replication.md:670` reads *"Default to semi-synchronous (sync to one follower,
  async to the rest) for durability without a single slow node stalling everything"* -- the same claim,
  with no trigger. Substantively the flagged defect, still live.

**Both were live at master, and C rewrote both -- they are items 6 and 9 of its own 19.** So they cannot
also be evidence that prior waves had already reduced the work-list; they are counted twice. The content
outcome is unaffected (both are fixed, and fixed well). Correct the record.

---

## 7. THE D-SIDE "LIE DIED" TABLE -- re-derived, and it under-claims

I wrote my own numbers driver from `src/scripts/app/num/logic.js` -- **not** from `numbers_lattice.mjs`
(the thing under judgement) and **not** the previous verifier's `drive.mjs` (independence). It parses
topic source directly out of a materialised tree at any git rev, so it needs no compiler run, and it
reproduces the three mechanics verbatim: `_fmtN` (non-finite -> 0, then `Math.round`), `_fmtTB`, and
`_nval` (a **cleared** field yields 0 whatever the declared `min`).

**Positive control:** at authored defaults `probabilistic-structures` renders `~10 bits` -- the value the
topic's own prose states ("about 10 bits/element for 1%"). The driver is reading what the pane reads.

### 7.1 All three charter-named rows, confirmed

| row | pre-wave (master, field cleared) | frozen tip |
|---|---|---|
| `probabilistic-structures` Bloom filter size | **`~Infinity GB`** | `n/a` |
| `sharding-strategies` Usable shards | `v="~NaN"` + `u="of 0"` = **`~NaN of 0`** | `n/a` |
| `signing` HSM utilization at peak | `v="0"` `u="%"` **`over=true` (RED)** | `n/a`, **`over=false`** |

The signing row is the sharpest: the fabricated `0%` was *also* raising a false red flag, and both are gone.

### 7.2 The table under-claims: 26 tabulated, **34** measured

Driving every listed (topic, cleared field) pair on both trees, **34 rows change**, not 26. Every one of
the 34 lands on `n/a`; **none** becomes a bare `0`. The binding constraint -- *the lie must die, not just
the entry* -- holds on all 34: there are **zero relocated lies**.

The 8 uncredited rows include two of the more interesting kills, both in `load-balancing` with
`instances` cleared:

- *"If one instance dies"* rendered **`"6,000 req/s (400%)"`** -- a plausible, confident, entirely
  fabricated figure. Not non-finite, so the harness's `swallowed` class structurally cannot see it.
- *"Instances you can lose"* rendered **`"-4"`** -- a negative count.

Also uncredited: `probabilistic-structures` "Bloom vs exact saving" (`~0x`), four more
`sharding-strategies` rows, and `desired-state` "Reconciles/sec per tenant".

**`n/a` is the corpus's own absent token, and more established than claimed.** C's report cites one
precedent (`distributed-locks`); I found **two** at master -- `distributed-locks.md` and
`kafka-internals.md`. ASCII, pre-existing, correct choice.

### 7.3 The F6 pair and the third find -- all three demonstrate their thesis, and are anchored in the topic

Driven at authored defaults on the frozen tip, against master:

| topic | row | master | frozen tip |
|---|---|---|---|
| `distributed-locks` | [2] Op + pause vs the lease | `"fits (17s spare)"`, no badge | **`"YES: expires"` / `unsafe` / over=true** |
| `distributed-locks` | [0] Serialized throughput | `"~0"` ops/s | **`"~0.2"`** ops/s |
| `retries-timeouts` | [2] Attempts the deadline affords | `"4"`, no badge | **`"2"`, over=true** (vs 3 configured) |

**The anchoring claims are true, which is what makes these fixes legitimate rather than tuned.**
`distributed-locks.md:1004` is the topic's own curveball, verbatim: *"Your lock has a **30-second TTL**.
A holder checks it, then a stop-the-world GC freezes the process for **45 seconds**."* The input default
is now exactly `pause | Max STW/GC pause (s) | 45`; `ttl` stays 30 and `op` stays 5, so exactly one
default moved. For `retries-timeouts`, *"three attempts, exponential, seems safe"* is the topic's own
named canonical policy (line 206), and I confirmed **no prose anywhere in that file anchors any deadline
in ms** on either tree -- so moving the budget breaks nothing.

### 7.4 The corpus-wide defaults claim, reproduced exactly

Comparing the **full row tuple** (`k`, `v`, `u`, `n`, `over`) at every topic's own authored defaults:

```
DEFAULTS UNCHANGED: 44 / 46
MOVED AT DEFAULTS:   2      distributed-locks (rows 0, 2) · retries-timeouts (rows 2, 3)
total moved rows:    4
```

Identical to D's claim, down to the note-only fourth row (`retries-timeouts[3]`: figure `2,700` and flag
unchanged, note now says "against a 1,000ms budget").

**`event-driven` tuple identity holds.** Pre-wave and frozen tuples are **identical** under my own
serialisation (my sha256 `95b234fd8218...`; D's `d9cf8dbb...` is a different serialisation of the same
claim, so the hash string is not comparable -- the *identity* is, and it holds). Meanwhile the flag
genuinely moves: `maxRecv` 5 -> no badge, 10 -> no badge, **11 -> badge**, 20 -> badge. Real behaviour,
zero pixels. The row **key** also tracks the input (*"To DLQ after 11 tries"*), consistent with the
previous cold-verify's F5.

### 7.5 A completeness sweep -- zero regressions, and a surviving sibling class

The table tests *"are their rows right?"*. I also asked *"did they get them all?"*: for all 46 topics,
clear each input in turn (all others at defaults) and scan every rendered field for a fabricated figure.

**Negative control first** -- the instrument finds **18** on master, including all four known non-finite
renders. It works. (First pass reported 25; **7 were my own false positives** -- `state-machine`'s note
uses the English word "undefined" correctly, *"every (state, event) the table leaves undefined is
refused"*. Tightened to `Infinity|NaN` for note prose and re-ran.)

```
master 521663d : 18        frozen tip 5c0e2f9 : 13
REMOVED by the wave : 5    ADDED by the wave : 0
```

**Every non-finite render in the corpus is gone, and the wave introduced nothing.**

**F6 (non-blocking, for a future wave).** The 13 survivors are one coherent, undetected family: a cleared
field yields a confident **negative** figure. Because the arithmetic subtracts rather than divides, the
result is finite, so `fmt` never sees a non-finite value and the `swallowed` class structurally cannot
fire. 13 rows across 10 topics -- `api-design` (`~-4,000`, `~-1 MB/s`), `autoscaling` (`~-5,000`, x2),
`backpressure` (`-1,000`), `caching` (`-2%`), `consistency-models` (`-2 of 0`, x2), `distributed-locks`
(`~-5`, `-5`), `leader-election` (`-1`), `load-balancing` (`-5,994`), `microfrontend` (`-260`). All
pre-existing on master, none touched by D, none in its charter. Same defect shape as the 34 it did kill.

---

## 8. CLASS-H HONESTY -- both records are clean

- **C's record §4** is explicitly titled *"And an empty baseline is NOT 'Class H is closed'"* and names
  all three semantic instances as remaining open: `feature-flags`' Opener saying "instant", its
  whiteboard cues 1-2 carrying a pre-correction framing beside their own debunk, and
  `error-propagation`'s Red Flag left un-localized from `notifications`.
- **D's record contains no Class-H claim anywhere** -- correct; it is a numbers wave and cannot close it.

I verified the three instances genuinely still exist on the C tip: `feature-flags.md` still says a change
is reversible "instantly" (26 occurrences of the stem), and `error-propagation.md:891` still reads
`### "If a send fails, we just log it and move on"`. Nowhere does either record claim otherwise.

Worth recording as a nice piece of self-evidence: the same `feature-flags` sheet now renders whiteboard
step [6] as *"What is the kill switch's real speed? -> Bounded by the refresh window ... so state it,
**never say 'instant'**."* -- directly adjacent, on the same sheet, to the Opener that says "instant".
The contradiction is now more visible than before, and correctly still open.

**F8 (cosmetic).** D's §7 says *"`num-light` and `num-dark` capture event-driven's Numbers pane"*. There
is no `num-dark` baseline -- only `num-light` exists among the 16. Substance unaffected: event-driven's
Numbers pane **is** baselined, and I verified the tuple identity independently.

---

## 9. Findings summary

**BLOCKING: none.**

| # | wave | finding | severity |
|---|---|---|---|
| F1 | C | Gate row count claimed 54/54; measured **56/56**. `check_all.py` is byte-identical across all three trees and AST-registers 56. D's 56/56 is correct. Fleet's 4th miscount | non-blocking, **record correction** |
| F2 | C | `test/cram_surface.cjs` is **not** byte-identical to master (charter assumed it was). Disclosed, necessary, and adds teeth only -- no threshold or detector loosened | non-blocking, **scope correction** |
| F3 | C | `--plant` silently covers **4 of 5** classes: the dangling plant targets a now-cue-prefixed spine site and is a no-op. Class still has teeth (6 fixtures + guard 4 both fire). Retargeting at `open.cards[0].items[1].a` restores 5/5 | non-blocking, **fix it -- one line** |
| F4 | C | "2 of the sweep's 6 named quotes no longer exist" is wrong: both were live at master (`multi-tenant.md:707` verbatim; `replication.md:670` substantively) and **C fixed both itself** -- double-counted | non-blocking, **record correction** |
| F5 | D | The "lie died" table tabulates 26 rows; **34** actually changed, all to `n/a`, none to a bare 0. Two uncredited kills are notable (`"6,000 req/s (400%)"`, `"-4"`) | non-blocking, under-claim |
| F6 | D | A sibling class survives, undetectable by the harness: **13 rows across 10 topics render a confident negative figure** on a cleared field. Pre-existing; D added zero | non-blocking, **future wave** |
| F7 | tool | Dup threshold headroom is smaller than the checker's own note claims (it says legitimate restatement tops out ~0.525). Four pairs sit 0.56-0.64 and read as duplicates on the sheet; sharpest `kafka-internals` at **0.640**. All pre-existing, all on the spine<->Red-Flag axis | non-blocking, **future wave** |
| F8 | D | `num-dark` baseline does not exist; only `num-light` | non-blocking, cosmetic |

**What I could not break.** Guard 4 fires with exactly 415 failures on a reverted composer while
`dangling` stays green -- proving the guard, and proving the composed-line unit is safe *because* of it.
Detector neutering aborts pre-browser on 6 fixtures at the empty baseline. The two-unit dup design
survives a whole-corpus adversarial comparison (0 missed, 2 saved). Both deliverables rebuild to their
committed bytes. 44/46 numbers panes are byte-stable at defaults and the 2 that moved are exactly the
intended fixes. 34/34 fabricated figures die into the corpus's own absent token with zero relocated lies
and zero new ones. 19/19 tell rewrites are real, in-voice, and carry triggers; 39 left-alone tells audited
with 3 borderline calls named. Zero fabricated claims found in either report.

---

## 10. Evidence pins

- **Worktrees:** `D:/claude-workspace/_worktrees/deepdive-rehearsal/w6-cfix` (`9f8d82e`),
  `D:/claude-workspace/_worktrees/deepdive-rehearsal/w6-dfix` (`5c0e2f9`); main repo `521663d`.
- **Gate captures:** `<scratchpad>/CFIX_gate.log`, `<scratchpad>/DFIX_gate.log` (56 rows each),
  plus `*_pre.log` / `*_build.log` / `*_post.log` carrying the blob-hash comparisons.
- **My instruments** (verifier-owned, on no branch; deliberately *not* the previous verifier's `drive.mjs`):
  `count_checks.py` (AST registration count), `tells.py` (both-format tell extractor),
  `wfix_drive.mjs` (numbers driver written from `num/logic.js`), `liedied.mjs` (the 34-row re-derivation),
  `sweep.mjs` (completeness sweep + its negative control), `defaults.mjs` (corpus-wide tuple compare),
  `probe/test/wfix_dup.cjs` (parallel answer-unit vs line-unit dup), `probe/test/wfix_sheet.cjs` and
  `probe/test/wfix_long.cjs` (rendered-sheet reads + contrast + geometry).
- **Negative controls demonstrated:** the completeness sweep finds 18 defects on master before finding 13
  on the tip; the dup probe reproduces C's pre-fix scores to three decimals; the numbers driver reproduces
  the topic's own published sanity figure; guard 4, the detector neuter, and the plant each watched red.
- **Plants and patches ran on scratch copies only.** The checker accepts the HTML path as an argument, so
  the composer-revert and detector-neuter probes ran against *copies* under
  `<scratchpad>/probe/`. **No file in either worktree was modified at any point.**

**Tree state at end of run:** `w6-cfix` clean @ `9f8d82e`, `w6-dfix` clean @ `5c0e2f9`, main repo clean @
`521663d [master]` -- all three exactly as found. The only change anywhere is this untracked file.
No commits, no pushes, no merges, no `npm install`, no `git stash`.

**Recommendation to team-lead: proceed with the serial merge train, C first, D second**, rebuilding the
deliverable on the merged tree at merge 2. The two waves are disjoint (C: cram/trade/wb + the cram
checker; D: numbers panes only) and no file is touched by both. F3 is worth a one-line follow-up commit
on C before or after merge; F1/F4/F8 are record corrections; F6 and F7 are candidate scope for a later wave.
