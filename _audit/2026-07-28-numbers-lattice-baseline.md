# Wave D part 1 — the NUMBERS-LATTICE HARNESS

**Branch** `tool/numbers-harness` (off master 807b063) · **2026-07-28** · tool-only, deliverable
byte-unchanged · **frozen, not merged**

Every topic's Numbers pane is a parametric calculator: `inputs` declares the assumptions,
`compute(vals, fmt)` turns them into rows, and the defaults are supposed to *demonstrate the
topic's thesis*. Nothing checked that moving an assumption moves anything. This wave builds the
check that drives all 46 `compute()` functions across their declared input lattice, ships its
current defect set as a may-only-shrink ratchet, and hands the D-fixes wave a verified work-list.

The exemplar is `_audit/2026-07-20-p0-floor.md` #8: `lambda-organization` shipped a "Lambda wins"
branch unreachable at every legal input, found by **running** the function rather than reading it.
This is that method, productionized.

---

## 1. The headline

| | |
|---|---|
| **Ships** | `test/numbers_lattice.mjs`, `test/numbers_lattice_debt.json`, one line in `test/check_all.py` |
| **Coverage** | 46/46 topics driven, 0 skipped, 1 partial (named in §6) |
| **Density** | 567,844 evaluations in the gate (37/46 exhaustive). A `--full` run is **46/46 exhaustive** at 4,458,711 evaluations and returns the **identical** finding set — the cap costs nothing (§8.1). |
| **Runtime** | ~21s, pure node, no browser, no network |
| **Baseline** | 21 findings across 15 topics |
| **Watched red** | 4 ways, all with real exit codes (§5) |
| **Deliverable** | `sha256 3cdf0c4b03fe29c3186ed130a638eb0c040e3694b488bf7dfcfa1340d86a3c20`, identical to `master:deepdive_content_pipeline_rehearsal.html`. The branch touches 3 files, all under `test/`. |

**The single most important sentence in this report: the first version of this check ran GREEN on
the lambda-organization defect it was built to catch.** §4 is why, and what it cost.

---

## 2. What the corpus actually is (measured, not assumed)

Four facts fell out of reading the renderer (`src/scripts/app/num/logic.js`) and the corpus, and
each one changed the design:

**`max` does not exist.** Zero of 46 topics declare a `max` on any input, and the markdown input
grammar has no field for one (`id | label | value | min | step`, `parse_md.mjs:638`). The brief's
"declared min..max range" has no upper half. Every ceiling in this harness is therefore inferred
and *stated*, never read.

**`min` is not enforced either.** The pane renders `<input type="number" min=...>` — advisory only,
since HTML `min` marks a typed value invalid without changing what `.value` returns — and the read
path is `_nval: isFinite(v) && v > 0 ? v : 0` (logic.js:175). So the reachable domain of every
assumption is `[0, inf)`, and **zero is reachable on every field regardless of its declared
minimum**: clearing the box is enough. Dividing by an assumption whose `min` is 1 is a live defect.

**The app swallows NaN.** `_fmtN` opens `if (!isFinite(x)) x = 0` (logic.js:168). A row that
computes NaN renders a confident **"0"**, not an error. Any detector that looks for "NaN" in the
rendered output misses every row that formats through `fmt.n`, which is most of them.

**A constant `over` is usually correct.** 180 of the corpus's 292 `over:` sites are the literal
`false` (or `true`) — that row simply has no threshold, which is a legitimate design, not a dead
flag. The same holds for 32 `v:` sites that are literal figures.

---

## 3. Methodology

### 3.1 Sourcing and purity
The 38 compiled topics are read from `src/topics/_generated/<id>/num.js` — the slices the build
concatenates into the shipped file, proven in Wave A to be identical to the authored markdown — and
the 8 hand-coded topics from `src/topics/<id>/num.js`. Each is a plain `var <PREFIX>_NUM = {...}`
script, evaluated in a bare `node:vm` context **with no DOM globals present**, so a `compute()` that
reached for `document` would throw rather than be quietly tolerated. That is the purity guard; no
topic needed it.

### 3.2 Two ladders, because the two questions have different costs
Deterministic throughout — there is no `Math.random` in the file, and no dependence on the clock,
the filesystem, or fonts.

**The factorial ladder (~9–14 points per input)** is raised to the power of the input count, so it
is kept small: `min`, `1`, `min+step`, the `min`..`default` midpoint, `default/100`, `/10`, `/2`,
`default`, `x2`, `x10`, `x100`, `x1000`, plus `50/90/99/100` for a percentage. Topics carry 4–6
inputs (37/5/4 topics respectively). **37 of 46 topics are exhaustive** at this ladder; the rest
are capped at 20,000 points sampled as `(j * 7919) mod total`. That is a *permutation* of the index
space — 7919 is prime and every radix is far smaller, so it cannot share a factor with the product —
which matters, because a plain stride can alias a digit to a constant and silently freeze an input.
All-min, all-default and all-top are always included. `--full` lifts the cap (§8.1).

**The sweep ladder (~40–60 points per input)** adds 25 linear steps across the near field and 25
geometric steps out to 1000x. It is walked **one input at a time from the defaults**, so its cost is
*summed* rather than multiplied and the density is nearly free. It decides `input_inert` /
`input_decorative` — literally the question those classes ask — and it is also what keeps the
constancy verdicts honest, since more points can only ever turn "constant" into "varies".

### 3.3 The two gates that stop it being a false-positive machine

**A static read of the row's source.** Every constancy verdict is gated on whether the row's `v` or
`over` is written as an *expression* or as a *literal*. Only an expression is claiming to be
computed; a literal `false` is a design decision. Ungated, this check would have opened with 180
fabricated findings and deserved to be deleted the same day.

The scanner is comment- and string-aware, which is not decoration: `lambda-organization`'s compute
contains the line comment `// Little's Law`, and a naive scanner treats that apostrophe as an
opening quote and mis-parses every row after it. Classification is **per row**, so `backpressure` —
which inserts a pre-built row variable rather than an object literal — loses only that one row
rather than the whole topic.

**An instrumented `fmt`.** `fmt.n` / `fmt.tb` are copied verbatim from the pane (the swallowing
behaviour is the thing being worked around, so a "cleaner" reimplementation would change what
`compute` sees) and wrapped to record every non-finite argument. Detection is three-pronged: the
wrapper, a scan of the returned strings (for rows that format their own numbers with `.toFixed`,
where "NaN%" does reach the screen), and the raw values. One prong is not enough.

### 3.4 Where NaN is hunted
Scoped to **the declared bounds and the defaults** — all-min, all-top, all-default, and each input
alone at each — which is what the brief asks for and, as §4 records, the only scope that stays
useful. The reachable-zero probe is run separately and reported as its own lower-severity class,
deliberately kept **out** of the variation lattice so that an undeclared value can never make a
dead flag look alive.

---

## 4. What it cost to make the verdicts trustworthy

Peak finding count was **37**. Final is **21**. Every discard is recorded here because the discards
are the part that makes the remainder worth acting on. Nothing was dropped to tidy the list.

### 4.1 The miss that matters — one degenerate corner hid the exemplar
The first working version reported `lambda-organization`'s pre-fix compute (pulled from `37cdd8c^`,
the real shipped source) as **clean**. The p0-floor audit had already proven that flag dead by hand.

Measured: of 10,584 product points, `over: ratio > 1` was false at **1,764 — and every one of them
had `rps = 0`**, where `fargateMo` becomes 0 and the guard `fargateMo > 0 ? ... : 0` hands back a
ratio of 0. At zero traffic the pane is not teaching anything; it is showing the guard.

Fix: every row is judged **twice** — over the whole declared lattice, and over the points where
every assumption is strictly positive. A row constant only in the second pass gets a `_positive`
class: still a defect, because the pane demonstrates nothing across its entire meaningful range,
but named so the fix wave knows the flag does technically move at a zeroed input. Zero is the right
place to cut because it is structurally where guards fire and models degenerate — not a tuned
threshold. The verdict is withheld when too few positive points exist to support it.

That pre-fix compute is now **fixture #10 of 11**, re-armed on every run.

### 4.2 Ladder coarseness — three findings that were real-looking and wrong
Each was refuted by an independent, denser sweep before being believed:

| Reported | Refuted by |
|---|---|
| `distributed-locks` "Serialized throughput" never moves | it moves at a 1s critical section; the ladder's smallest positive point was 2.5s, and `fmt.n` (Math.round) renders every throughput below 0.5 as the same "~0" |
| `caching` "Cost of losing 1 point" flag can never fire | it fires at a **99.5%** hit ratio; the ladder stepped 90 -> 180, straight over the top of a bounded percentage |
| `stream-batch-processing` "Keyed state" flag can never fire | it fires at ~1.47e8 keys; the ladder topped out at 1e8 |

This is what drove the asymmetric geometry in §3.2. A check that reports a defect because it did
not look hard enough is worse than no check.

### 4.3 The absurd-corner class, deliberately dropped
Sweeping NaN across a continuous lattice finds arithmetic edge cases faster than anyone can triage
them, and they are all technically true:

- `saga` returns NaN when the per-step failure rate exceeds 100% **and** the step count is
  fractional (a negative base to a fractional exponent).
- `slos` returns "Infinity%" for a **150% availability target** across **3,000 hard dependencies**
  (`Math.pow(1.5, 3000)`).

Neither is a scenario anyone will fix. Percentages are therefore capped at their semantic ceiling
of 100 (recognised from the authoring convention for the unit — `(%)` or `% of`), and NaN hunting
is scoped to the bounds. The genuinely reachable robustness case — a user clearing a field — is not
lost; that is exactly what `nonfinite_zero` covers.

### 4.4 The honest consequence
**After the artifacts were removed the corpus has one dead flag and zero constant rows.** The sweep
report's "~19 topics" estimate for this class does not survive execution — which is the same lesson
the p0-floor audit recorded in the first place: read-derived counts and run-derived counts are
different numbers.

The check is deliberately **conservative and under-reports**. A flag that fires only at 100–1000x
the default is counted as alive here, and a reader may reasonably call such a flag dead in practice.
That is a known, stated limit, not an oversight — see §6.

---

## 5. Watched red, four ways

| Arm | Method | Result |
|---|---|---|
| **(a) Plant** | Not a synthetic slice — `lambda-organization`'s **real pre-fix compute** from `37cdd8c^`, dropped into `src/topics/_generated/` | **exit 1**, exactly one new finding, exactly the right row: `dead_flag_always_positive:4  Lambda vs always-on`. Slice restored byte-identical. |
| **(b) Baseline present** | unmodified corpus + committed baseline | **exit 0**, `NUMBERS LATTICE: PASS (46/46 topics driven across 567,844 evaluations (37 exhaustive), 21 defect(s) in 15 topic(s), all allowlisted)` |
| **(c) Neutered detector** | three separate neuters, each in a throwaway copy | **exit 1** each; the self-test names the mis-detected fixtures and refuses to judge the corpus |

The (c) arm in detail — this is the one that proves the detectors are load-bearing:

- Neuter the dead-flag test (`overSets[i].size === 1` -> `false`): fixtures `dead_flag_never` and
  `dead_flag_always` mis-detect.
- Neuter the static literal gate (`isLiteralExpr` -> always false): the **clean** fixture goes red
  with `const_row:2, dead_flag_never:2`, and the historical lambda fixture picks up three phantom
  findings. This is the over-eagerness arm: without a deliberately clean fixture, a predicate
  stubbed to `true` would satisfy every planted one.
- Neuter the input sweep: `input_inert` degrades to `input_decorative`.

**The self-test runs on every invocation**, not at review time: 11 fixtures, 9 with one planted
defect each (one per class), 1 real historical defect, 1 deliberately clean. A mismatch aborts the
run before the corpus is judged.

### 5.1 A fourth arm, added because the check could have lied about its own coverage
`src/topics/_generated/` is gitignored build output; the 8 hand-coded slices are committed. So with
the generated tree absent, the first version drove 8 topics and reported **"8/8 topics driven"** — a
true sentence and a completely misleading one. On an empty baseline it would have printed **PASS
while covering 8 of 46**, which is precisely the shape `check_all.py`'s own header warns about
("PASS 19/19 while the compiler silently discarded 571 authored items").

Coverage is now asserted against an **independent reference**: the count of authored files in
`src/topics-md/`, which this check does not write, parse, or depend on. Watched both arms:

- generated tree hidden -> `FAIL (0 compiled num slices for 38 authored topics in src/topics-md/ --
  38 missing. This is a COVERAGE SHORTFALL, not a clean corpus...)`, **exit 1**
- restored -> `PASS 46/46`, **exit 0**

### 5.2 Determinism
The lattice is a fixed arithmetic construction, sampling is `(j * 7919) mod total`, and there is no
`Math.random`, clock, font, or filesystem-order dependence anywhere in the file. Verified rather
than asserted: two consecutive `--verbose` runs are **byte-identical**, and `--write-debt` is
**idempotent** — re-running it reproduces the committed baseline byte-for-byte.

---

## 6. Coverage statement

**46 of 46 topics driven. Zero skipped. Zero faked.**

One partial, reported by the check on every run rather than buried here:

> `backpressure: rows [1] are not object literals -- excluded from const_row/dead_flag`

`backpressure` builds one row (`fillRow`) as a variable and splices it into the returned array, so
the source gate cannot classify that row's `v`/`over` as literal-or-expression. That **one row** is
excluded from the two source-gated classes; its other five rows, and all four other classes, are
judged normally. Nothing else in the corpus is opaque.

**Stated limits** (things this check does *not* claim):

1. It under-reports by construction. A threshold reachable only at 100–1000x the default counts as
   alive. Making it stricter means picking a "plausible range" per input, which is a judgement the
   authors own, not the harness.
2. `const_row` / `dead_flag` verdicts depend on the source gate, so a topic that built rows in a
   loop would be invisible to those two classes. One row in one topic is affected today.
3. Percentages are inferred from the unit convention in the label. A percentage authored without
   `(%)` or `% of` in its label gets the generic geometric ladder.
4. The `_positive` carve-out cuts at exactly zero. A flag that flips only at a *fractional* count
   (0.5 followers) is still reported — correctly, in my reading, but the finding text says
   "sampled points" rather than "all points" precisely so the claim stays literally true.

---

## 7. The baseline — the D-fixes work-list

21 findings across 15 topics, in `test/numbers_lattice_debt.json`, machine-written in deterministic
order. **Ratchet semantics** (parity_debt discipline exactly): a finding **not** in the baseline
FAILS as new; a baseline entry **no longer detected** FAILS as stale and must be deleted. The list
can only shrink. Refresh with `node test/numbers_lattice.mjs --write-debt`.

Ordered by what the fix wave should do first.

### Tier 1 — the pane does not teach (3)

| Topic | Finding | What it means |
|---|---|---|
| `real-time-delivery` | `dead_flag_always_positive:6` | "Write amplification" — the breach flag is on for **every follower count the pane can be given**. Verified: `over` is false only below 1 follower. |
| `event-driven` | `input_decorative:maxRecv` | "Max receives" is a user-settable assumption that moves **only note prose** (row 6's key and note). It feeds no figure and no flag. |
| `signing` | `input_decorative:s_size` | "Avg package (MB)" likewise — moves only the notes on rows 3 and 4. |

### Tier 2 — a visibly wrong number reaches the screen (6)

| Topic | Finding | What it means |
|---|---|---|
| `probabilistic-structures` | `nonfinite:2` + `nonfinite:swallowed` | **The sharpest one.** At `p = 0` — its *declared minimum* — "Bloom filter size" renders **"~Infinity GB"**. Not swallowed, not hypothetical: on screen, at a value the pane itself declares legal. |
| `load-balancing` | `nonfinite_zero:1` | "Utilization" renders NaN/Infinity when a field is emptied. |
| `sharding-strategies` | `nonfinite_zero:2`, `nonfinite_zero:3` | "Hot shard vs average" and "Usable shards", same cause. |
| `retries-timeouts` | `nonfinite:swallowed` | fmt handed a non-finite value at a declared bound; renders a confident "0". |

### Tier 3 — swallowed-NaN robustness (12)
`api-design`, `authz`, `desired-state`, `devices-dispatch`, `feature-flags`, `iac`,
`load-balancing`, `notifications`, `real-time-delivery`, `rules-engine`, `sharding-strategies`,
`signing` — each `nonfinite_zero:swallowed`: clearing a field makes `fmt.n` render a plausible
"0" for a non-finite result.

Real, but low value, and separable by class prefix if the fix wave wants to skip the tier. They are
in the baseline because dropping a true finding to make a list look better is the wrong trade — and
because the ratchet then guards against them spreading.

---

## 8. Gate verdict

`npm run build` then `python3 test/check_all.py`, run in the foreground to a capture file on
branch `tool/numbers-harness`.

```
GATE: PASS
GATE EXIT=0
```

**57 of 57 checks PASS. Zero FAIL, zero SKIP** — the browser was present, so this is the full gate
including the pixel-diffing `visual_regression`, not the CI-safe subset. The new row:

```
numbers_lattice  PASS  NUMBERS LATTICE: PASS  (46/46 topics driven across 567,844
                       evaluations (37 exhaustive), 21 defect(s) in 15 topic(s), all allowlisted)
```

Two rows are worth quoting as independent corroboration of the tool-only claim, because neither is
mine and both have their own reference:

```
build_integrity  PASS  BUILD INTEGRITY: PASS  (11784837 bytes, 0 unresolved, 9 panes + 7 overlays,
                       build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
visual_regression PASS VISUAL REGRESSION: PASS  (16 baselines, win32-chromium149; every capture
                       reached a proven rest state across all 18 roots, cleared the blank-page
                       floor, and matched its committed pixels)
```

`build_integrity` re-derives the deliverable from source and asserts byte-equality with the
committed file; `visual_regression` diffs decoded pixels against committed baselines. Both green
means this branch changed nothing a user can see — which is what "tool-only" has to mean to be
worth saying.

### 8.1 Full-density run — the cap costs nothing

`--full` lifts the per-topic cap from 20,000 product points to 5,000,000. Run once on a quiet box
after the gate went green:

```
NUMBERS LATTICE: PASS  (46/46 topics driven across 4,458,711 evaluations (46 exhaustive),
                        21 defect(s) in 15 topic(s), all allowlisted)
```

**46 of 46 topics exhaustive. 4.46M evaluations. 2m46s. The identical 21 findings — zero new, zero
stale.**

That is the result worth having, and it was not the expected one. Density can only ever turn
"constant" into "varies", so an exhaustive run is *able* to refute a constancy verdict — and a
refuted baseline entry shows up as **stale**, which is a FAIL by design. The one entry exposed to
that risk is `real-time-delivery` `dead_flag_always_positive:6`; the other 20 come from the bounds
probes and the one-at-a-time sweep and are structurally unaffected by the product cap. It survived.

So on today's corpus the 20,000-point cap is **free**: the gated run and the exhaustive run agree
exactly. The cap exists for the runtime budget (21s vs 2m46s), not because it is buying a weaker
answer. `--full` stays out of the gate for the budget alone, and is worth re-running after any wave
that edits a `compute()` — it is the audit of whether the cap has started costing something.

---

## 9. Merge notes for team-lead

- Registered as `numbers_lattice` in the **browserless** block of `check_all.py`, appended after
  `build_determinism`. It reads `src/topics/_generated/`, which `build_integrity`'s `npm run build`
  has already written by the time it runs (and the check fails with an explicit "run `npm run
  build`" message rather than a confusing error if the directory is ever absent).
- **The one expected merge collision** is the `check_all.py` registration tuple, which the parallel
  cram-checker wave also appends to. My change is one tuple plus its comment; the union is
  mechanical.
- Nothing else is shared. `test/numbers_lattice.mjs` and `test/numbers_lattice_debt.json` are new
  files no other wave touches.
- Both new files are **strict ASCII** (verified byte-wise: 0 bytes > 0x7E in either). Non-ASCII row
  keys are `\uXXXX`-escaped into the JSON, which reads back as the original character while keeping
  the file byte-ASCII.
- Commits: `b3e163e` harness · `0a48af6` baseline · `48be0e4` gate registration · this report.
