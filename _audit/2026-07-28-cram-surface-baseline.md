# Wave C part 1 — the cram-surface checker + its ratchet baseline

**Branch** `tool/cram-checker` off master `807b063` · **2026-07-28** · tool-only wave, deliverable byte-unchanged
**Ships:** `test/cram_surface.cjs`, `test/cram_surface_debt.json`, a `check_all.py` registration
**Gate:** 55/55 PASS *(count corrected by cold-verify; post-union with the numbers harness = 56)* · **Baseline:** 66 defects across 35/46 topics — *this file's §4 table is the C-fixes work-list*

---

## 0. The headline, and the thing that changes Wave C part 2

The 2026-07-20 sweep estimated **~14 topics** with a cram-surface defect (Class H). The measurement
says **35 of 46**. That is not a contradiction — the sweep says so itself in its own §8:

> *"The cram-sheet findings are reasoning about `cram-derive.js`, not inspection of a generated sheet."*

Nobody had ever rendered one and read it. This is the first time the strings have been looked at.

**But the count is misleading, and the shape matters more.** 46 of the 48 `dangling` hits are
`wb.steps[].a` — whiteboard answers. `wb.steps` is `{c, a}`: a **cue** and an **answer**.
`cram-derive.js:91` lifts `.a` alone and drops `.c`. So this:

| where | text |
|---|---|
| cue (`wb.steps[3].c`, **not lifted**) | *"Step order — which steps even need a compensation?"* |
| answer (`wb.steps[3].a`, **lifted**) | *"Only the ones **before the pivot**."* |

…is perfectly clear in the Whiteboard pane and unreadable on the cram sheet, where "the ones" has
nothing to attach to. The sweep named this exact string. **It is not an authoring defect — it is one
composition defect, in one line of the composer, replicated 46 times.**

So the natural first move for Wave C part 2 is a **composer change** (lift the cue alongside the
answer, or render the pair), which would retire ~46 of 66 baseline entries at a stroke — not 46
content rewrites. I did not make that change: it edits the deliverable, and this is a tool-only
wave. Flagging it as the highest-leverage option, with the caveat that it needs a design call on how
the spine section should read (a numbered list of Q/A pairs is a different artifact from a numbered
list of things you draw) and a VR pass, since it changes rendered output.

The remaining 20 are genuine per-item work: 12 `when-conj`, 6 `dup`, 2 `dangling` in Opener items.

---

## 1. What the checker covers — the lift-site inventory

Derived by reading `cram-derive.js` end to end; every site below is mirrored field-for-field, and
the mirror is verified against the real `deriveCram`/`deriveScope` on every run (§3).

| # | cram section | source (cram-derive.js) | lifted |
|---|---|---|---|
| 1 | The one-liner | `open.cards[0].items[0].a`, else `identity.thesis` | :84 |
| 2 | The spine | `wb.steps[].a`, else `identity.spine[]` | :91 / :95 |
| 3 | Decisions & switch conditions | `trade.decisions[].opts[0].n`, `opts[1].n`, `opts[1].when` (or `opts[0].when` when a decision has one option) | :104-105 |
| 4 | Ceilings | `num.compute(authored defaults)[].k/.v/.u/.n` + `num.tell` | :65-73, :110-117 |
| 5 | Traps → the fix | `rf.flags[].bad`, `.fix` | :124 |
| 6 | Senior tells | `trade.decisions[].tell` | :130 |
| 7 | Harder angles | `bank.curveballs[].theme` + `.task \|\| .cue` | :143 |
| 8 | The 30 seconds | `open.cards[0].items[1].a` | :148 |
| — | scope: The forks | `trade.decisions[].opts[*].n`, `.when` — **all** options, not just `opts[1]` | :175 |
| — | scope: Scale | `num.inputs[].label`, `num.tell` | :186-189 |

**6,168 lifted strings across 46 topics** (4,591 cram, 1,577 scope). The data source is the live
`TopicRegistry` in the built deliverable — the same object `deriveCram` consumes at runtime — so
authored-vs-compiled drift cannot hide, and the 8 hand-coded topics and the 38 compiled ones are
measured identically. (The brief pointed at `src/topics/_generated/`; that directory does not
exist. `TopicRegistry` in the build is the runtime source of truth.)

Scope's `opts[*].when` coverage is not redundant: `replication::trade.decisions[4].opts[2].when` is
a real defect that only the **scope** sheet renders, because cram lifts `opts[1]` alone.

---

## 2. The flag classes, each with a real example

### `dangling` — 48 defects, 31 topics
An answer lifted **away from its question** that opens on a back-reference the question supplied.
Scoped to the sites where the sheet actually detaches a Q from its A (`wb.steps[].a`,
`identity.spine[]`, `open.cards[0].items[0..1].a`) — applying it to every lifted string would flag
Red-Flag quotes, which are quoted deliberately and read fine.

Two syntactic signatures, both structural rather than stylistic:
- **bare pro-form subject** — `caching wb.steps[6].a`: *"**It** evicts. LRU is not scan-resistant…"* — it *what*?
- **elliptical fragment** — `multi-region wb.steps[8].a`: *"**You do not**, until you have failed over under a game day…"* (the sweep's own named case)

Sub-breakdown of the 48: `Because…` 24, pro-form 13, `Not…` 4, `No.` 2, `Only…` 2, `You do/cannot…` 3.
By site: `wb.steps[].a` **46**, `open.cards[0].items[1].a` **2**, `items[0].a` **0** — the one-liner
slot is clean on all 46 topics.

### `when-conj` — 12 defects, 5 topics
The composer supplies the conjunction; the option body repeats it. `cram-derive.js:104` emits
``<b>X</b> when `` + `when`, and `:175` (scope) emits ``<b>X</b> if `` + `when`. So
`consistency-models trade.decisions[4].opts[1].when` = *"when the home replicas are down…"* renders
as **"…when when the home replicas are down"** on the cram sheet and **"…if when…"** on the scope
sheet. Purely mechanical, zero judgement, zero false positives.
Topics: `microfrontend` 5, `eav` 2, `iac` 2, `replication` 2, `consistency-models` 1.

### `dup` — 6 defects, 6 topics
The same sentence reaching two sections of one page. Per-pane restatement is **by design** (the
sweep's Class L says so — panes are consumed independently), but the sheet puts those panes
adjacent, where it reads as a bug and burns the scarcest space in the app.
Worst: `autoscaling` at 0.91 — `wb.steps[6].a` *"Drain, then terminate. Stop sending it new work…"*
against `rf.flags[4].fix` *"Drain, then terminate: stop sending new work…"*.
Also the sweep's named case, `kafka-internals` Opener `items[0]` vs `items[1]` — the same sentence
with the payoff list reshuffled, printed in both the one-liner and the 30-seconds sections.

### `ceiling` — **0 defects**
A Ceilings row whose value at the authored defaults is NaN / Infinity / undefined / null / blank,
or a `compute()` that throws or returns nothing (which makes the whole section silently vanish).
**Ships as a pure regression guard with zero current yield — see §5, this is the class the brief
expected to find things and it does not.**

### `void-lift` — **0 defects**
A lift site whose value is absent, which `cram-derive` interpolates unguarded (an `opts[1]` with no
`when` renders the literal text "undefined"). Also a pure regression guard.

---

## 3. The mirror is pinned three ways — the anti-Goodhart guard

This check **mirrors** the composer. A mirror can drift out of sync with the thing it mirrors, at
which point it audits strings the reader never sees while ignoring the ones they do — green for the
wrong reason. That is the shape of two defects this repo has already paid for (a gate comparing the
parser to the parser's own output; a length floor its own `<style>` tag satisfied). So:

| guard | catches | proven able to fail |
|---|---|---|
| **section set** — rendered `.cs-st` headings must equal `EXPECTED_SECS` | a renamed / added / dropped section | renamed one section → **46 drift failures** |
| **block counts** — per section, rendered `.cs-*` blocks must equal what the mirror predicts | a **new lift site inside an existing section** (the section-set guard is blind to this) | disabled the tells lift → *"predicts 0, rendered 7"*, **46 failures** |
| **string coverage** — every mirrored string must appear in the rendered sheet | a re-pointed field | re-pointed the mirror `wb.steps[].a` → `.c` → **415 failures** |

All 46 topics pass all three today. **Stated limit rather than papered over:** a lift site added
inside an existing section that also renders no new block *and* whose text the mirror already
carries would slip all three. No such shape exists in `cram-derive` today.

---

## 4. THE BASELINE — the C-fixes work-list

`test/cram_surface_debt.json`, 66 entries, machine-written, keyed `topic::class::path`,
deterministically sorted, strict ASCII, byte-identical across repeated runs.

| topic | dangling | dup | when-conj | total |
|---|---:|---:|---:|---:|
| `microfrontend` | - | - | 5 | **5** |
| `kafka-internals` | 3 | 1 | - | **4** |
| `saga` | 4 | - | - | **4** |
| `autoscaling` | 2 | 1 | - | **3** |
| `circuit-breaker` | 3 | - | - | **3** |
| `idempotency` | 3 | - | - | **3** |
| `load-balancing` | 3 | - | - | **3** |
| `replication` | 1 | - | 2 | **3** |
| `backpressure` | 1 | 1 | - | **2** |
| `consistency-models` | 1 | - | 1 | **2** |
| `consistent-hashing` | 2 | - | - | **2** |
| `eav` | - | - | 2 | **2** |
| `error-propagation` | 2 | - | - | **2** |
| `iac` | - | - | 2 | **2** |
| `leader-election` | 2 | - | - | **2** |
| `multi-region` | 1 | 1 | - | **2** |
| `probabilistic-structures` | 2 | - | - | **2** |
| `rules-engine` | 1 | 1 | - | **2** |
| `soft-delete` | 2 | - | - | **2** |
| `api-design` `caching` `cdc` `debugging` `developer-platform` `event-driven` `multi-tenant` `rate-limiting` `real-time-delivery` `retries-timeouts` `sharding-strategies` `signing` `slos` `state-machine` `storage-engines` | 1 each | - | - | **1** each |
| `notifications` | - | 1 | - | **1** |
| **TOTAL** | **48** | **6** | **12** | **66** |

**11 topics are clean:** `authz`, `content-pipeline`, `desired-state`, `aws-hardening`,
`distributed-locks`, `feature-flags`, `observability`, `shared-definition`, `stream-batch-processing`,
`devices-dispatch`, `lambda-organization`.

### The ratchet
Copied from `parity_debt.json`'s proven pattern. A defect **not** in the baseline → FAIL (new
regression). A baseline entry **no longer observed** → FAIL (stale, delete the line). So the file
may only shrink; when it is empty the mechanism can be deleted. Refresh with
`node test/cram_surface.cjs --write-debt` (which refuses to write while the mirror is stale).

---

## 5. False positives, and the two classes the corpus talked me out of

Reported honestly, because two of the brief's four flag classes did not survive contact with data.

**The brief's "ceiling rows whose value is not a number (NaN/undefined/**string**)" would have been a
disaster as written.** 101 of the corpus's ceiling values are non-numeric strings — and they are
*legitimate verdict rows*: `real-time-delivery` *"pull (on-read)"*, `kafka-internals` *"n/a"* and
*"yes"*, `event-driven` *"bounded"*, `saga` *"eventual"*, `caching` *"many to 1"*, plus approximated
numerics like *"~8,333"* and *"~1.2 min"*. A strict numeric rule manufactures **101 false failures**
and the gate gets overridden in a week. The detector ships narrow — NaN / Infinity / undefined /
null / blank only — and finds **zero**. I am reporting a class with no hits rather than widening it
to look productive.

**Exact cross-section duplicates are also zero**, so `dup` had to become a near-match test, which
means a threshold. Rather than pick one: all 55 cross-section pairs at ≥0.45 Jaccard were read by
hand. Below ~0.6 they are the corpus's deliberate per-pane restatement, and at 0.62 sits a clear
false positive (`load-balancing`: an option *name* against a Red Flag *quote* of the same phrase —
different rhetorical roles). The sweep's own named duplicate measures **0.657**. `DUP_MIN = 0.65`
sits just under it, so **the threshold is set by the worked example the sweep supplied**, the same
move `topic_contract` makes deriving its floor from the hand-coded 8. The margin is 0.007; that is
deliberate, since the anchor *is* the line, and §6 shows both sides are guarded.

**`dangling` false-positive rate, by inspection of all 48:** I judge 46–48 genuine. Every pro-form
hit is real ("It evicts", "It races", "Both ordering and load"). The two I would accept an argument
about are `saga open.cards[0].items[1].a` (*"It's ACD without isolation…"* — "it" is the topic, and
the sheet header names it) and `circuit-breaker open.cards[0].items[1].a` (*"Not recovering a single
call, but containing the blast radius"* — an elliptical contrast that reads acceptably). Both are in
the baseline; if the fixes wave judges them fine, they should be *fixed by rewording*, not by
loosening the detector, because loosening it re-admits the 46 real ones.

**One false-positive source was found and killed during tuning:** `\bNo\b` matches inside
*"**No**-op fallbacks when uninitialized"* (`observability wb.steps[8].a`), which is not an
elliptical answer at all. The rule now requires `no` followed by punctuation, or by whitespace not
leading into a hyphenated word. That case is a permanent negative-control fixture (§6), so the
detector cannot be loosened back into it.

### Calibration against the sweep's own Class H
| sweep's named instance | caught? |
|---|---|
| `saga` — *"Only the ones before the pivot"* | **yes** (`dangling`) |
| `multi-region` — *"You do not, until you have failed over…"* | **yes** (`dangling`) |
| `replication` — *"Because a write set of W nodes…"* | **yes** (`dangling`) |
| `kafka-internals` — Opener items duplicated | **yes** (`dup`) |
| `feature-flags` — Opener item 2 says *"instant"* kill switch | **no** — semantic |
| `feature-flags` — Whiteboard cues 1–2 are pre-correction framings | **no** — semantic |
| `error-propagation` — Red Flag un-localized from `notifications` | **no** — semantic |

**4 of 7.** This checker covers the *mechanical* half of Class H. The other three require knowing
what the topic asserts elsewhere ("the topic calls 'instantly' the junior tell, and then says it") —
no structural detector reaches that, and `feature-flags` accordingly comes back **clean** here
despite carrying two Class H findings. **Wave C part 2 must not treat an empty baseline as "Class H
is closed."**

---

## 6. Watched-red receipts

All plants are pure text/JS — no font, clock, filesystem-order or layout dependence (the
`mobile_nextup` CI lesson).

**(a) Synthetic plant** — `--plant` injects one defect of each class into topics that carry none,
by mutating the in-memory registry (no file touched, no build modified). Result: **exactly 5 new
defects, one per class, at exactly the planted paths; 0 stale; 0 mirror-drift.**

| planted | detected as |
|---|---|
| `content-pipeline wb.steps[0].a` := *"They do. And that is the whole trick."* | `dangling` — pro-form "They" |
| `authz …opts[1].when` := *"when the tenant count crosses…"* | `when-conj` |
| `iac num.compute()[0].v` := `NaN` | `ceiling` |
| `signing …opts[1].when` deleted | `void-lift` |
| `eav rf.flags[0].fix` := its own `wb.steps[0].a` | `dup` (similarity 1.00) |

**(b) Baseline-green** — unmodified corpus with the baseline present: **PASS, exit 0.** Re-running
`--write-debt` reproduces the baseline **byte-identically**.

**(c) Neutered detector** — the ratchet's staleness rule only protects a class while that class
still *has* baseline entries, so at the empty-baseline end state Wave C part 2 is aiming for, a
silently-dead detector would leave this gate green forever. Every detector therefore self-tests
against fixed synthetic fixtures **on every run, before the browser launches**, and aborts if one
stops firing or starts firing on its own negative control:

| neutering | outcome |
|---|---|
| `detectDangling` returns `''` | **abort** — 6 fixtures "expected FIRE, got SILENCE" |
| `detectWhenConj` returns `''` | **abort** — 3 fixtures |
| `detectCeiling` returns `''` | **abort** — 4 fixtures |
| `detectVoid` returns `''` | **abort** — 1 fixture |
| `dangling` **loosened** to `no\b` (re-admits "No-op") | **abort** — negative control fired |
| `DUP_MIN` 0.65 → 0.66 (just past the sweep anchor) | **abort** — anchor fixture went silent |
| `DUP_MIN` 0.65 → 0.70 | **abort** — same |
| `DUP_MIN` 0.65 → 0.52 (into by-design restatement) | **abort** — negative control fired |

The `dup` threshold is bracketed from **both** sides by corpus verbatims: the sweep's named
duplicate (0.657) must fire; a Class-L by-design restatement (`multi-region`'s Red-Flag fix vs its
Trade-off tell, 0.525) must not.

**(d) Mirror-drift guards** — each proven able to fail; see the table in §3.

---

## 7. Gate verdict and the byte-unchanged claim

**`npm run build` → exit 0. Full gate → `GATE: PASS`, 55/55, 0 FAIL, 0 SKIP, exit 0** *(count corrected by cold-verify: master registers 54, this branch adds one)*.
Run twice: once on the working tree (`/tmp/wC_gate.log`) and again on the **freeze commit
`017278c`** (`/tmp/wC_gate_freeze.log`), so the run of record is the tree that actually freezes.
Verdict read from the capture file, never a piped exit code.

```
cram_surface   PASS  CRAM SURFACE: PASS  (46 topics, 66 known cram-surface defect(s)
                     allowlisted in cram_surface_debt.json across 35 topics;
                     mirror verified against deriveCram on all 46)
```

**Deliverable byte-unchanged.** git blob hash of
`deepdive_content_pipeline_rehearsal.html` **before** the build, **after** a full rebuild, and at
master `807b063` are all `46ac5661846bd7fedb67c2bafd85172f16fc1a29`
(sha256 `3cdf0c4b…d86a3c20`); `git status` clean. `build_integrity` independently confirms
*"COMMITTED deliverable == fresh build of HEAD"*. This wave touches `test/` only. As a side effect
it re-proves build determinism on this box.

Runtime of the check: ~6s, single page load, no topic switching (it calls `deriveCram` directly
rather than driving the overlays, unlike `cram_scope_distinct`).

---

## 8. What this does NOT cover

- **The semantic half of Class H** (§5) — three of the sweep's seven named instances are invisible
  to any structural detector. An empty baseline will not mean Class H is closed.
- **Scope-sheet prose.** `deriveScope`'s fixed coaching text and its "Cosmetic vs forking" ear-test
  are topic-agnostic and unaudited; only its *lifted* strings are checked.
- **Whether a lifted string is TRUE.** This is a readability-under-detachment check. Class D
  (self-contradiction), Class E (tells that carry no trigger) and Class K (substrate facts) are
  untouched — `replication`'s Trade-off tell still ships *"Prefer semi-synchronous by default"* into
  "Senior tells", and nothing here objects, because the string reads fine in isolation.
- **The Numbers lattice.** Ceilings are evaluated at the **authored defaults only**. Behaviour
  across the input lattice — Class G2/G3, NaN at declared minimums — is the parallel
  `numbers-harness` wave's surface, and the two overlap only at the defaults row.
- **Rendered layout.** Text only; no pixels. A sheet whose text is perfect and whose CSS crops it
  passes here.

---

## 9. Merge note for team-lead

`check_all.py` was predicted to union-conflict with the parallel `numbers-harness` wave (cold-verify
measured the hunks DISJOINT — different anchor lines — so the auto-merge is clean) — both
waves add a docstring line and a registration tuple. Mine: the `cram_surface` line after
`cram_scope_distinct` in the module docstring, and the commented `('cram_surface',
'test/cram_surface.cjs')` tuple after the `cram_scope_distinct` tuple. Everything else is disjoint
(`test/cram_surface.cjs`, `test/cram_surface_debt.json`, this file).

Commits: `e91fec4` (checker + baseline), `17178a4` (gate registration), plus this record.
No push, no merge, no `npm install`, no `git stash`.
