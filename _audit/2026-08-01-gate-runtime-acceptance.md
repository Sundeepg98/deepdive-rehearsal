# ACCEPTANCE: does the fast gate agree with the slow one?

**Wave:** gate-runtime, Phases 2-4. **Tree:** `infra/gate-runtime` off master tip `45bc4f4`.
**Configuration under test, frozen before the battery ran so that what was measured is what
ships:** `python3 test/check_all.py --fast --jobs 4` -- a 1-check barrier, a 4-worker pool, and a
15-check serial tail. The shared browser (`--shared-browser`) is OFF.

Every number below is generated from `test/_acceptance/*.json` by `test/_acceptance_report.py` --
**with one historical exception, now corrected: the solo `touch_floor` rate was hand-entered and
had no receipt in the tree.** The cold verify caught it, and the receipted pooled figure has
replaced it throughout. See the amendments block at the end.

**AMENDED 2026-08-02 after the independent cold verify** (no blocking findings):
`_audit/2026-08-02-gate-runtime-coldverify.md`, by gr-verifier. Where this document and that one
disagreed on a number, the receipted number won.

---

## The claim, stated narrowly

`--fast` changes the ORDER and the CONCURRENCY of the checks and nothing else. It therefore has
exactly one thing to prove: **for any tree, it must reach the same verdict on every check as the
serial gate does.** A faster gate that disagrees with the slow one about whether the app is
broken is not a faster gate, it is a second opinion nobody asked for.

The serial path is unchanged and remains the capture of record for trains, captures and CI. The
fast configuration is opt-in by explicit flag. Nothing below asks for that to change.

---

## Method, and why there is a preflight

Four phases: preflight, green tree, six planted-broken trees (one per check class), and repeated
runs of the full parallel configuration.

**The preflight exists because of a specific way this could all have been a lie.** The expensive
phases compare a serial run against a fast run on a broken tree. If a planted defect fails to
land -- a bad anchor, a no-op edit -- both runs come back green, the verdicts match perfectly,
and the battery reports success. That is agreement about a tree that was never broken, and it is
the same failure this gate's own header warns about: a test whose reference comes from the system
under test cannot fail, it can only agree. So before any full run, each mutant is applied and
**only the check it targets** is run, and the mutant must turn it red.

It earned its keep on the first attempt: **two of six mutants were NOT DETECTED**, and both
misses were informative rather than clerical.

- **content.** The first version capped `bulletsAsProse()`. `compiler_conservation` compares
  `scanSource` (a line scanner over the author's raw bytes) against `scanParsed`, and `scanParsed`
  counts STRUCTURED fields -- `walkSteps`, `drillCards`, `bankBeats` -- not loose prose lines.
  Re-aimed at `walk.steps`, which appears on both sides of that comparison.
- **claims.** The first version inflated a quoted figure in the thin-rail sentence.
  `judgeQuotedFigures` matches `\b(Staff|SDE3|SDE2)\b[^.;]{0,40}?(\d+)\s+of\s+(\d+)` -- and the
  rendered sentence puts a PERIOD between the tier name and its numbers ("Staff is the thin rail.
  4 solid of 10"). `[^.;]` cannot cross it. **That arm of `home_claims` is structurally blind to
  the single-thin-rail sentence.** This is a pre-existing gap in a check built after three rounds
  of judgment; it is reported, not fixed, because fixing checks is not this wave's scope. The
  mutant was re-aimed at `judgeVerdict`, which catches a verdict naming a tier that is not on the
  board.

Both misses are recorded in the mutant definitions in `test/gate_acceptance.py` rather than
quietly repaired, because how a mutant was aimed is part of what the mutant proves.

**THE PREFLIGHT IS STANDING LITURGY FOR ACCEPTANCE BATTERIES FROM HERE ON** (team-lead ruling,
2026-08-01). Any battery that argues from planted defects must first prove each defect lands, by
running the check it targets and watching it go red. A battery without that step cannot
distinguish "both configurations agreed" from "neither configuration had anything to disagree
about", and the second is indistinguishable from success right up until it matters.

---

## The finding that matters more than the speedup

Two of the six planted-broken trees produced a verdict disagreement, both on the same check:
`touch_floor` FAIL under `--fast`, PASS under serial.

`touch_floor` is already in the serial tail, so on both occasions it ran ALONE. Parallel load
could not be the whole story, so the check was measured directly: **run by itself, serially, on a
quiet box, 30 times.**

**THE NUMBER OF RECORD IS 18/90 = 20.0% [95% CI 13.0-29.4]** -- pooled across my 30 runs and the
cold verify's independent 60 (two scratch volumes, 30 each).

My own sample was 4/30 = 13.3% [5.3-29.7]; the verifier's was 14/60 = 23.3% [14.4-35.4]. Fisher
exact two-sided p = 0.402, so the two are statistically compatible and this is not a
contradiction -- but 13.3% is the low end of a range whose pooled centre is 20%, and **the pooled
figure is the one a reader should quote.**

**Why the verifier's battery is adopted as the number of record rather than mine, which is the
more important half:** mine was HAND-ENTERED. This document opens by claiming every number in it
is generated from `test/_acceptance/*.json`, and the 4/30 was the one number that was not -- no
solo-`touch_floor` receipt existed anywhere in the tree, and `_acceptance_report.py` emits no such
table. In a campaign whose whole thesis is that an unverified count is a wrong count, the most
load-bearing count in the wave was the unreceipted one. The verifier's 60 runs are receipted
(`touch_floor_solo.json`, `touch_floor_solo_Dvolume.json`, plus all 16 failing dumps), so the
receipted number wins. That is the rule, and it should cost its author nothing to apply it to
himself.

Every geometry failure is byte-identical across all 18: the cram sheet's close button measures
`{"w":42.2,"h":42.2}` against a 44px floor -- zero variation across two authors and two volumes.

**And the mechanism is sharper than this document originally stated.** The verify pinned it to
source: `panelIn`'s literal `from` keyframe is `scale(.96)` (`styles.css:1190`), `44 x 0.96 =
42.24`, which is exactly "42.2" at `toFixed(1)`; the easing is monotonic
(`cubic-bezier(.22,.61,.36,1)`, 300ms) so the scale can never go below .96, and no `perspective`
exists in `styles.css` for the `translateZ(-30px)` to act through. So the sample is **not** caught
mid-flight at an arbitrary scale, as written below -- **it is caught at the animation's FIRST
KEYFRAME, before it has advanced at all**, twice, 100ms apart (`B.pollFor`'s poll interval). That
is precisely why "two agreeing reads" fails here: **agreement is EASIEST before the animation
starts.** It also settles the fix -- the precondition has to be *transform is identity*, not
merely *two reads agree*.

`touch_floor` knows about this class of error. Its own comment names the case that taught it
("#scrolltop was FILED at 39.6x39.6, which is 44 x the .9 scale of its own fade-out -- the
control was never short, the sample was early"), and its defence is to poll for TWO CONSECUTIVE
AGREEING READS before asserting. That guard assumes the animation advances faster than the poll.
When it does not, two consecutive samples agree AT THE SAME INTERMEDIATE SCALE, the guard is
satisfied, and the check asserts on a transformed box. **The guard is itself timing-dependent, so
it degrades in exactly the conditions it exists to defend against.**

**Observed rates, corrected against the receipts.** The first version of this line said
`2/8 under --fast (25%)` and `0/9 in full serial gate runs`. Both denominators were wrong, and
the claims audit caught them by counting `test/_acceptance/verdicts_*.json` instead of reading the
prose. Re-derived here independently:

| context | rate | denominator |
|---------|-----:|-------------|
| serial, solo, quiet box (pooled, receipted) | **18/90 = 20.0%** | this wave's 30 + the verify's 60 |
| shipped `--fast --jobs 4`, full gate | **2/15 = 13.3%** | full-gate fast verdict files |
| serial, full gate | **0/7** | full-gate serial verdict files |

(2/18 = 11.1% if the three `--shared-browser` runs are pooled in, but that configuration is
disabled and not shipped, so 2/15 is the honest denominator for the lane that ships.)

**The correction runs AGAINST this document's own interest, which is why it matters.** The old
`2/8 = 25%` made the fast lane look worse than the receipts support. Corrected, the fast-lane rate
(13.3%) lands on the low end of the same distribution as the solo rate, and the conclusion is
unchanged and better supported: the data does NOT cleanly separate "load raises it" from "it was
always like this", and no claim is made that it does.

**Consequence for the acceptance claim, stated no more favourably than the evidence supports:
the fast lane is verdict-identical wherever the checks themselves are deterministic.** The
disagreeing check disagrees with itself, serially, alone, at ~20%. Writing "verdict-identical"
without that qualifier would not be true.

`touch_floor` has NOT been touched. Making its sampling genuinely at-rest would strengthen it
rather than weaken it, but it is a change to a check's semantics inside a wave scoped to runtime
orchestration, with an independent cold verify to follow -- and a check fix smuggled into a
runtime wave is how a verifier loses the ability to tell what the wave actually did.

---

## Receipts

### Preflight: is each planted defect real?

| mutant | class | target check | sites patched | target verdict | real defect? |
|--------|-------|--------------|--------------:|----------------|--------------|
| `geometry` | browser-geometry | `chrome_metrics` | 1 | FAIL | YES |
| `content` | content | `compiler_conservation` | 1 | FAIL | YES |
| `atname` | AT-name | `at_name_hygiene` | 8 | FAIL | YES |
| `vr` | VR | `visual_regression` | 1 | FAIL | YES |
| `determinism` | determinism | `build_determinism` | 1 | FAIL | YES |
| `claims` | claims | `home_claims` | 1 | FAIL | YES |

6 of 6 mutants turn their target check red.

### The green tree

| | wall | checks | red | exit |
|-|-----:|-------:|----:|-----:|
| serial (capture of record) | 692.4 s | 76 | 0 | 0 |
| `--fast --jobs 4` | 480.5 s | 76 | 0 | 0 |

**Verdict disagreements: NONE.** Speedup 1.44x.

### The planted-broken trees

| mutant | class | target | serial red | fast red | target red both ways | disagreements |
|--------|-------|--------|-----------:|---------:|----------------------|---------------|
| `geometry` | browser-geometry | `chrome_metrics` | 3 | 3 | YES | NONE |
| `content` | content | `compiler_conservation` | 4 | 4 | YES | NONE |
| `atname` | AT-name | `at_name_hygiene` | 1 | 1 | YES | NONE |
| `vr` | VR | `visual_regression` | 1 | 2 | YES | **touch_floor** |
| `determinism` | determinism | `build_determinism` | 1 | 1 | YES | NONE |
| `claims` | claims | `home_claims` | 1 | 2 | YES | **touch_floor** |

Every red set, in full, so the comparison can be re-read rather than trusted:

- `geometry` (browser-geometry) -- serial: `chrome_metrics`, `fold_budget`, `visual_regression`
  fast: `chrome_metrics`, `fold_budget`, `visual_regression`
- `content` (content) -- serial: `compiler_conservation`, `compiler_md`, `topic_contract`, `visual_regression`
  fast: `compiler_conservation`, `compiler_md`, `topic_contract`, `visual_regression`
- `atname` (AT-name) -- serial: `at_name_hygiene`
  fast: `at_name_hygiene`
- `vr` (VR) -- serial: `visual_regression`
  fast: `touch_floor`, `visual_regression`
- `determinism` (determinism) -- serial: `build_determinism`
  fast: `build_determinism`
- `claims` (claims) -- serial: `home_claims`
  fast: `home_claims`, `touch_floor`

**4 of 6 planted-broken trees produced identical verdicts in both configurations.**

### Repeated-run stability, full parallel configuration

| run | wall | exit | red |
|-----|-----:|-----:|-----|
| 1 | 563.2 s | 0 | none |
| 2 | 600.9 s | 0 | none |
| 3 | 592.6 s | 0 | none |
| 4 | 782.7 s | 0 | none |
| 5 | 937.9 s | 0 | none |
| 6 | 706.3 s | 0 | none |
| 7 | 565.8 s | 0 | none |
| 8 | 574.0 s | 0 | none |

**8 of 8 runs reached verdicts identical to run 1.**

Wall time across the 8 runs: min 563.2 s, max 937.9 s, mean 665.4 s (spread 56.3% of mean -- TIMING varies, verdicts did not).

---

### Stability reported BOTH ways

The ruling asks for stability raw and with the known-nondeterministic check excluded, because
they answer different questions -- "would this configuration have held up a train?" and "is the
ARRANGEMENT stable?".

On this battery the two answers coincide: **8/8 identical raw, and 8/8 identical excluding
`touch_floor`, because zero checks went red in any of the eight runs.** `touch_floor` passed all
eight times. At the pooled 20.0% rate that is a 0.168 outcome (0.80^8); at the verifier's 23.3%,
0.119; at the 13.3% this line originally quoted, 0.318. Unremarkable on any of them, but the
inference is weaker than first written, and it rests on a rate rather than on a receipt.
That is worth stating plainly rather than as a clean 8/8 with no caveat: the battery did not
demonstrate that `touch_floor` is stable under `--fast`; it happened not to fire.

---

## Phase 2 measured BOTH WAYS, as ruled -- and it is worse, not neutral

The ruling gave the shared browser exactly one path to shipping: run the parallel battery both
ways, and if fewer concurrent Chromium processes produce a **measurably lower** flake rate, it may
ship as part of the parallel configuration only. It does not, and the measurement is not close.

| configuration | runs | runs with any red | verdict |
|---------------|-----:|------------------:|---------|
| `--fast --jobs 4` | 8 | **0** | 8/8 identical |
| `--fast --jobs 4 --shared-browser` | 3 | **3** | every run red |

The shared battery was stopped at 3 runs. 3/3 is decisive against, and the remaining five would
have bought nothing but an hour of a contended box.

**Failures, and the mechanism.** `dock_contrast` failed in all three runs; `overlay_keyboard` in
two; `room_browser` in one. Every one is the same crash, and the stack names this wave's own shim:

```
browserType.connectOverCDP: Timeout 30000ms exceeded.
  - <ws preparing> retrieving websocket url from http://127.0.0.1:9411
  - <ws connecting> ws://127.0.0.1:9411/devtools/browser/f86e18ae-...
  - <ws connected>  ws://127.0.0.1:9411/devtools/browser/f86e18ae-...
```

The socket opens and the CDP handshake never completes. Four parallel workers contend on a single
browser-level CDP endpoint, which is not built to serve several Playwright clients at once -- so
the shared browser fails hardest under exactly the concurrency it exists to support.

**And no amount of further engineering can change the answer, which is the part worth stating.**
The baseline is 0 red in 8 runs. A hypothesis of the form "this lowers the flake rate" is not
falsifiable upward against a baseline with no flakes in it: the best possible outcome of a fixed
shared browser is to draw level with 8/8 clean, which is not a *measurably lower* rate and
therefore never satisfies the ruling's condition. The shared browser could be made to work; it
could not be made to win.

**Disposition: ships DISABLED, documented, exactly as the ruling's fallback specifies.**

### What the earlier design cost, recorded because it is the more useful half

The first implementation used `chromium.launchServer()` + `chromium.connect()`, and it did not
merely underperform -- **it would have hung the gate.** A connected Playwright client holds an open
WebSocket, an open socket keeps Node's event loop alive, and the shim could not let a check's
`browser.close()` through (over `connect()` that closes the browser for every check queued
behind). Overriding `close()` to drop only the check's own contexts left the socket open.
Measured: `room_browser` completed all of its work and was killed at 100s (exit 124), while
`seg_state` exited 0 -- the difference being that `seg_state` routes its exit through
`B.finish()`, which calls `process.exit()` and force-exits past the live handle. **Three gate
checks exit naturally** (`room_browser`, `topic_contract`, `cold_open`), so the gate would have
hung on the first one it reached.

`connectOverCDP` removed that dilemma -- Playwright does not own a browser it reached over CDP, so
`close()` terminates the connection and leaves the browser up, with no override and no hang. It is
what made the both-ways measurement possible at all, and it is why the measurement is a clean
statement about contention rather than about a hang.

The safety property survived every configuration: `visual_regression` refused to share in all of
them, automatically, on its `--force-color-profile=srgb --disable-lcd-text` mismatch
(`shared=0, cold=1` in the trace, `reason: "args"`).

---

## Reading the two disagreements

Both are `touch_floor`, and `touch_floor` was in the serial tail for both -- it ran alone, so the
parallel pool was not competing with it at the moment it failed. The 30-run solo measurement
above is what settles it: the check is nondeterministic at ~20% with nothing else on the box.

Note also what the red SETS show. On the `vr` tree the fast run's extra red is `touch_floor` and
nothing else; `visual_regression` fired identically in both, with 14 of 16 baselines red -- the
exact figure that check's own comment predicts for a 1px change inside a shadow root. On the
`content` tree both configurations named the same four checks in the same order. The
disagreement is one flaky check, not a drifting arrangement.

---

## What is NOT claimed

- **The fast lane is not certified for trains, captures of record, or CI.** The serial path is
  the default, is unchanged, and remains the capture of record. `--fast` is opt-in by flag.
- **"Verdict-identical" carries a qualifier**: identical wherever the checks themselves are
  deterministic. **This document originally said exactly one check in this gate is not, and on the
  cold verify's evidence that is an UNDERCOUNT.** Two further items, both stated as
  recorded-not-claimed because neither is established:
  - **`focus_ring` produced a fast-only red.** On the verifier's `keyboard` mutant tree it passed
    serial and failed under `--fast --jobs 4`. Measured: **0/52 across serial contexts, 1/7 across
    `--fast` contexts** (Fisher exact two-sided p = 0.119 -- NOT significant), with a proven
    instrument (50 solo runs at zero, and a negative control that makes it report `FOCUS RING:
    FAIL (3)`). One event cannot separate "load-sensitive" from "very rare nondeterminism", and no
    claim is made either way. **It matters structurally regardless: `focus_ring` sits in the
    PARALLEL POOL, not the serial tail** -- so if it is load-sensitive, the tail is missing a
    member. It should get the same 30-run treatment under `--fast` that `touch_floor` got serially
    before anyone promotes the fast lane.
  - **`touch_floor` has a SECOND failure class this wave did not report**: 2 of the verifier's 60
    solo runs died with `harness error: page.evaluate: Target page, context or browser has been
    closed` -- a browser death, not the 42.2 geometry read. 3.3%, distinct signature. Possibly the
    same external-kill hazard that contaminated one of the verifier's serial runs; not established.
- **This is one box, one OS, one browser build.** `visual_regression` baselines are per-platform
  by design; nothing here says the parallel arrangement behaves the same on the Ubuntu runner.
- **The serial tail was not minimised.** It holds 15 checks and it is the wall-clock floor.
  Trimming it would buy real time and I did not do it: membership is a correctness judgement and
  the evidence to shrink it safely does not exist yet.
- **`--changed` is not certified at all**, by construction. It runs a subset and says so in a
  banner, in its summary line, and in its machine-readable output.
- **The shared browser was measured, not certified.** It is off by default; the acceptance
  battery above ran without it.
- **Speedup is not a constant.** Measured 1.44x on the green pair, and the eight stability runs
  ranged 563-938s on an unchanging tree. Wall time degrades under sustained back-to-back runs
  while verdicts did not move -- which is the property that actually matters here.

---

## Operational notes from running this

**The environment killed two multi-hour background runs outright.** Each time the battery died
with a planted mutant still applied to the tree, and once with the deliverable rebuilt from
mutated source. Both were caught by checking `git status` and the deliverable hash BEFORE doing
anything else, then reverted and rebuilt; the recorded receipts were unaffected. Consequences,
both now permanent in the harness:

- `do_mutants` and `do_stability` are RESUMABLE, merging by id rather than overwriting, so an
  interrupted battery adds to its receipt instead of restarting or truncating it.
- Long phases are run in sub-30-minute chunks rather than one unattended block.

**Orphaned browsers were cleared by PATH filter, never by image name.** Seven `chrome.exe`
processes from the killed run were matched on their `ms-playwright` command line and terminated
by PID; the operator's own 35 Chrome processes were untouched and confirmed still running
afterwards.

---

## Pre-existing defects this wave found and did NOT fix

All are out of a runtime wave's scope, and all are recorded rather than patched so that an
independent verifier can see what this wave did and did not touch. (It said "two" before the cold
verify; the count grew, which is the system working.)

1. **`touch_floor` false-reds at ~20%** (18/90 pooled and receipted, serial, alone, quiet box;
   this wave's 4/30 plus the cold verify's 14/60 across two volumes), always the byte-identical
   `{"w":42.2,"h":42.2}`. That is `44 x 0.96` -- **`panelIn`'s literal `from` keyframe**, not an
   arbitrary mid-flight scale: the easing is monotonic over 300ms and there is no `perspective` in
   `styles.css`, so the scale never goes below .96 and the check is sampling **before the
   animation has advanced at all**, twice, 100ms apart. Its "two consecutive agreeing reads" guard
   is therefore not merely timing-dependent, it is **anti-correlated with the thing it tests**:
   agreement is easiest exactly when nothing has started moving. The fix must gate on
   *transform is identity*, not on *two reads agree*.
   A second, distinct failure class exists at 3.3% (2/60): `page.evaluate: Target page, context or
   browser has been closed` -- a browser death rather than a geometry read.
1b. **`cta_contrast` is the SECOND member of `touch_floor`'s family**, found while taking the
   freeze capture. Under cross-agent load it failed with `[dark/architecture-apis] no core glyph
   pixels found` -- a screenshot taken before the glyphs reached full alpha, so the check found
   nothing to measure. Run alone on a quiet box immediately afterwards: **8/8 PASS**. It also
   passed in a second, equally contended full run. So it is load-sensitive, not broken, and not a
   regression -- tree clean and deliverable hash unchanged throughout.
   The pattern is now worth naming, because it is the same shape twice: **a stillness guard whose
   own condition is timing-dependent.** `touch_floor` waits for two agreeing reads and gets two
   agreeing reads of a mid-transform box; `cta_contrast` waits for effective opacity ~1 and then
   samples pixels that have not reached alpha 0.95. Both degrade in exactly the conditions they
   exist to defend against. The ruled check-hygiene micro-wave should treat this as a CLASS rather
   than fix one instance.
2. **`home_claims.judgeQuotedFigures` is structurally blind to the single-thin-rail sentence.**
   Its regex allows `[^.;]{0,40}` between a tier name and its figures, and the rendered sentence
   puts a period there ("Staff is the thin rail. 4 solid of 10"). A wrong figure in that
   particular sentence is not caught by that arm. Found by a mutant that this check should have
   detected and did not.

---

## Amendments after the cold verify (2026-08-02)

The independent verify returned **no blocking findings**, re-derived 14 of this document's numbers
exactly, and disagreed with three. Every disagreement is applied above rather than argued with.
Recorded here so the delta is auditable rather than silently absorbed.

| # | was | now | why |
|---|-----|-----|-----|
| 1 | solo rate `4/30 = 13.3%` | **`18/90 = 20.0%` [13.0-29.4]** | mine was hand-entered with no receipt in the tree; the verifier's 60 runs are receipted. The receipted number wins -- that rule has to apply to its author too. Statistically compatible (p = 0.402), so a correction, not a contradiction. |
| 2 | `2/8 under --fast (25%)` | **`2/15 = 13.3%`** | wrong denominator. Re-derived independently from `verdicts_*.json`; the 8 stability runs were omitted. The error made the fast lane look WORSE than the receipts support. |
| 3 | `0/9 in full serial gate runs` | **`0/7`** | wrong denominator, same audit. |
| 4 | "exactly one check is nondeterministic" | **an undercount** | `focus_ring` produced a fast-only red (1/7 fast vs 0/52 serial, p = 0.119, unproven); and `touch_floor` has a second failure class (browser death, 2/60). Both recorded-not-claimed. |
| 5 | 42.2 is "a control sampled mid-transform" | **it is `panelIn`'s FIRST keyframe** | `44 x 0.96 = 42.24`; monotonic easing, no `perspective`. The sample is taken before the animation advances at all -- which is why "two agreeing reads" fails here, and why the fix must gate on identity-transform. |

Two further figures did not reproduce and are corrected in the freeze document: `seg_state`'s
`34ms vs 450ms cold` (measured 84ms at the old transport, 31ms at the current one, against a
337ms cold), and the launch/context means ("about 380ms" / "16-30ms" against measured 356ms /
10-48ms). Neither moves the 2.3% headline, which the verifier recomputed independently at 2.30%.

**Verified-not-claimed, added by the verify:** the build is reproducible across directories and
volumes -- a fresh clone elsewhere rebuilt the deliverable to the identical `21eaaaf1...` hash.
