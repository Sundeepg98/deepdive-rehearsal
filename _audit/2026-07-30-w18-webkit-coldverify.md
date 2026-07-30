# W18 COLD VERIFY -- W-X2a + W-X5 (+X8, grade_reveal hardening)

**VERDICT: PASS -- SHIP. No blocking findings. The freeze's numbers reproduce, its headline retraction of the audit is correct, and the two hypotheses I was pointed at as potential blockers are both refuted.**

**Verifier:** w18-verifier (cold, no shared context with w18-builder) - 2026-07-30
**Target:** worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w18-webkit`, branch `xb/x2a-x5-webkit`,
tip `df16e81`, base `a84d68a`. Repo touched **READ-ONLY** throughout (every build under test extracted via
`git show` into scratch; every falsification made on a scratch copy).
**Engines:** Playwright 1.61.1 - WebKit 26.5 (`webkit-2311`) and Chromium 149 (`chromium-1228`), both from
the repo's own playwright. Isolated context per run, `deviceScaleFactor: 1`, `innerWidth`/`innerHeight`
asserted on every read.

---

## 0. THE TWO THINGS I WAS ASKED TO TREAT AS POTENTIALLY BLOCKING

### (a) "The IDE flags an unused `clickWhenReachable` at :112 -- is the hardening actually wired, or a no-op?"

**REFUTED four independent ways. The hardening is wired. Not a finding.**

| probe | result |
|---|---|
| source | defined `test/grade_reveal.cjs:112`, **called at :243** (`try { missBox = await clickWhenReachable(page, 'jm'); }`) |
| `oxlint test/grade_reveal.cjs` | **no findings** |
| VS Code `getDiagnostics` on that file | **`diagnostics: []`** -- zero. The warning in the brief does not reproduce. |
| cclsp/LSP `find_references` | **cannot resolve the symbol at all** -- the language server is not indexing `test/*.cjs`, which is the likely source of the stale/bogus "unused" flag |
| **RUNTIME (decisive)** | scratch copy `f3-break-click-wiring.cjs`: delete **only** `page.mouse.click(s.cx, s.cy)` from inside the helper -> **`GRADE REVEAL: FAIL`, exactly one arm red** ("a real click on Missed at the reveal moment records the grade"), all 12 others still PASS |

A helper that is never called cannot redden an arm when you break its body. It is on the live path.

### (b) "Any m-walk baseline delta is a BLOCKING finding" (X2a chromium-neutrality)

**No delta. Not a finding.** Object-level compare of the committed baseline blobs, `a84d68a` -> `df16e81`:
**16/16 identical SHA-1**, including both affected-viewport baselines
(`m-walk-light` `3b33cff6…`, `m-walk-dark` `82933164…` -- unchanged). **Nothing was re-baselined.**

> **NEGATIVE CONTROL ON MY OWN INSTRUMENT, recorded because it nearly cost the finding.** My first
> compare ran against `test/baseline` (singular). That path does not exist -- the dir is `test/baselines`
> -- so `git ls-tree` returned **empty on both sides** and `diff` printed **"IDENTICAL"**. A check that
> could not fail. Caught by asserting the count, and the compare only counts now that it asserts
> `png count == 16` before comparing. The 16/16 above is from the corrected instrument.

---

## 1. X2a -- WEBKIT SCROLLBAR BAND. CONFIRMED, and I can discriminate where the builder could not.

My instrument is independent of the builder's: besides the box model I run a **1px hit-test scan** down each
control's own centreline, counting the rows that actually return the button. That is what a finger gets.

| 390x844, dpr 1 | **WK pre-fix** | **WK tip** | CR pre-fix | CR tip |
|---|---|---|---|---|
| `.seg` offsetH / clientH | **73 / 60** | **61 / 60** | 61 / 60 | 61 / 60 |
| gutter (offsetH-clientH) | **13** | **1** | 1 | 1 |
| bar px (gutter - borders) | **12** | **0** | 0 | 0 |
| computed `scrollbar-width` | `auto` | `none` | `auto` | `none` |
| `scrollWidth / clientWidth` | 977 / 390 | 977 / 390 | 976 / 390 | 976 / 390 |
| **`#homeBtn` hit-test rows** | **38 of 44** | **44 of 44** | 44 | 44 |
| **`#tntrigger` hit-test rows** | **38 of 44** | **44 of 44** | 44 | 44 |
| element at the button's top row | **`seg`** | **`homeBtn`** | `homeBtn` | `homeBtn` |

Every figure matches the freeze **and** the original audit exactly, including the audit's button box
`[67..111]` (my scan: pre-fix first hit y=73, last y=110 -> 38 rows; the fixed strip ends at 61, so the
6 occluded rows come back). The audit's `6.0px / 13.6% of 44px` is exactly these 6 rows.

**The builder's stated instrument limitation is now closed, in the builder's disfavour-free direction:**
they reported their `elementFromPoint` column "does not discriminate" and declined to offer it. **Mine
does** -- the top row returns `DIV.seg` pre-fix and `#homeBtn` post-fix. Extra evidence for the same
conclusion; no conflict.

### Mechanism adjudication: the pseudo does the work, the standard property does nothing (WebKit 26.5)

Runtime injection on the **pre-fix** build (the discriminating experiment), WebKit:

| injected | offsetH/clientH | gutter | computed `scrollbar-width` | `#homeBtn` rows |
|---|---|---|---|---|
| (nothing) | 73 / 60 | 13 | auto | 38 |
| `.sidebar .seg{scrollbar-width:none}` **alone** | **73 / 60** | **13** | **none** | **38** |
| `.sidebar .seg::-webkit-scrollbar{display:none}` **alone** | **61 / 60** | **1** | auto | **44** |

**Confirmed: `scrollbar-width:none` moves nothing in WebKit 26.5** -- it flips the computed value and
leaves all 12px reserved. **The `::-webkit-scrollbar` pseudo is the shipped mechanism**, which is what the
wave ships. Carrying the standard property alongside is a no-op today in both engines and matches what
`.cram-jump` already does.

### Scope check (my own addition -- a leaked rule would have been a real regression)

Suppression must not reach desktop. Measured across the breakpoint, both engines, both builds:

| width | pre-fix `scrollbar-width` | tip `scrollbar-width` | tip gutter (WK) |
|---|---|---|---|
| 390 | auto | **none** | 1 |
| 919 | auto | **none** | 1 |
| **920** | auto | **auto** | 0 |
| 1024 / 1280 | auto | **auto** | 0 |

Correctly confined to `@media(max-width:919px)`; at >=920 the strip does not overflow at all
(`overflow:visible`, `scrollHeight == clientHeight == 420`), so there was never anything to suppress.
The landscape phone case (844x390) is inside the same width rule.

**X2b confirmed untouched:** the hardcoded 56/69/88 and landscape 51/59/76 appear nowhere in the diff.
The wave stayed in its lane.

---

## 2. X5 -- THE FREEZE'S HEADLINE RETRACTION IS CORRECT, AND I CAN SHOW WHY THE AUDIT MISSED IT

The audit filed X5 **"WebKit-attributable -- Chromium has all 7 chips in the *first* sample."**
The freeze retracts that and says the race is present in Chromium too. **Independently reproduced -- the
freeze is right and the audit was wrong.**

| first open, 390x844, virgin page | **WK pre-fix** | **WK tip** | **CR pre-fix** | **CR tip** |
|---|---|---|---|---|
| frames showing sections with an empty strip | **1** | **0** | **1** | **0** |
| chips at the sections' first paint | **0** | **7** | **0** | **7** |
| body relayout (`#cram.offsetTop` travel) | **44px** | **0px** | **44px** | **0px** |
| layout offsets seen | `[88, 132]` | `[132]` | `[88, 132]` | `[132]` |
| t(sections) -> t(chips) | 140 -> 274ms | 60 -> 60ms | 30.1 -> 59.9ms | 30.2 -> 30.2ms |

Identical to the freeze's table in all four columns.

**Why the audit's Chromium control was blind -- it is a sampling-cadence artifact, not a disagreement.**
The audit sampled wall-clock at `t=60/123/235/...ms` and reported *"t=60ms chips=7 ... populated in the
first sample, no empty window at all."* My Chromium rAF-per-frame trace shows the race opening at
**t=30.1ms and closing at t=59.9ms**. The audit's **first** sample landed ~0.1ms *after* the Chromium race
had already resolved. The window was real; the instrument stepped over it. The engine split is only the
**cost** of that one frame -- I measure **29.8ms Chromium / 134ms WebKit**, against the freeze's
"~30ms / ~140ms". That reproduces.

The audit's "26.5px shift" and the freeze's "44px travel" are **different quantities, not a conflict**: the
audit read viewport-relative rects during `panelIn`'s translate+scale (the contamination the freeze
documents in its discarded-instruments section); the freeze reads `offsetTop` in layout space. The audit's
own strip growth `16.4 -> 61` (+44.6px) is the same 44px.

### Mechanism: MutationObserver, adjudicated

- **W2's rendered-DOM invariant is preserved.** `renderCramJump` is fed by `cramSections()` -- the titles
  `<deep-cram>` actually rendered. There is still no second list, so the tradeoff record is accurate: the
  observer buys the timing without spending the property, and the derive-source alternative is strictly
  worse here rather than a close call.
- **The surviving `buildCramJump` rAF recursion is only the shadow-root-*acquisition* fallback** (fires
  solely when the custom element has not upgraded yet, `!root`), still bounded at 30, and it clears the
  strip rather than leaving stale chips. The old racing retry is gone.

### Observer lifecycle -- no leak (MutationObserver patched **before** boot, accounting scoped to `<deep-cram>`'s root)

| step | observers created on that root | disconnected | **live** | `cramJumpWatch` | chips |
|---|---|---|---|---|---|
| after boot, before any open | 0 | 0 | 0 | `null` | 0 |
| open + close **in the same tick** (armed, then abandoned before render) | 1 | **1** | **0** | `null` | 0 |
| 5 full open/close cycles (each rendered) | **1** | **1** | **0** | `null` | 7 |

**Exactly one observer is ever created, it is disconnected, and `cramJumpWatch` is `null` at every single
sample** -- including the open-then-immediately-close path, which is precisely what the new
`stopCramJumpWatch()` in `closeCram` exists for. After the first build no further observer is created
(subsequent opens find their sections and return early), so the one-shot semantics the freeze claims to
preserve are preserved, measured.

### A fragility I went looking for, and did not find

The app's observer guard is `if (!rendered.length && !root.firstElementChild) return;`. **If the shadow
root gained its `<style>` child in a separate mutation batch *before* the sections, that guard would let
the callback clear the strip and stop watching -- chips would never appear.** Probed directly in both
engines: the observer attaches to a **genuinely empty** root (`firstElementChild: null`, `children: []`),
and the **first and only** callback already sees `secs: 7` with `[STYLE, DIV, DIV, ...]`. The render lands
as one batched delivery, so the risky ordering never occurs. **Cleared, not assumed.**

---

## 3. X8 -- CONFIRMED, BOTH ORIENTATIONS, BOTH ENGINES

| | **WK pre-fix** | **WK tip** | **CR pre-fix** | **CR tip** |
|---|---|---|---|---|
| 390x844 panel rect | `[18, 862]` h 844 | `[18, 826]` h 808 | `[18, 862]` h 844 | `[18, 826]` h 808 |
| vs `innerHeight` 844 | **+18 below fold** | **-18 clearance** | **+18** | **-18** |
| computed `max-height` | 843.999939px | 807.999939px | 844px | 808px |
| 844x390 panel rect | `[18, 408]` h 390 | `[18, 372]` h 354 | `[18, 408]` | `[18, 372]` |
| vs `innerHeight` 390 | **+18** | **-18** | **+18** | **-18** |

Byte-identical between engines apart from WebKit's `vh` float artifact. Confirms the freeze's
"engine-independent, a gate blind spot rather than a WebKit difference". The freeze reported landscape
post-fix only as "fits"; the number is **-18px**, consistent.

---

## 4. THE GUARD (`test/cram_fit.cjs`) -- WATCHED RED REPRODUCED, AND BOTH ARMS FALSIFIED

### Watched RED on the pre-fix deliverable -- verbatim match

`node test/cram_fit.cjs <a84d68a artifact>` -> **`CRAM FIT: FAIL`, exit 1, 9 PASS / 4 FAIL, 13 total.**
The 4 reds are exactly the 4 the freeze records, with the same payloads:

```
FAIL [390x844] the cram panel ends inside the viewport   -> {"over":18,...,"maxHeight":"844px","running":0}
FAIL [844x390] the cram panel ends inside the viewport   -> {"over":18,...,"maxHeight":"390px","running":0}
FAIL first open: ... populated in the SAME frame ...     -> {"racingFrames":1,"chipsAtSectionFirstPaint":0,"bodyTravel":44,"offsets":[88,132]}
FAIL first open: the sheet body never relayouts          -> {"bodyTravel":44,"offsets":[88,132]}
```

No other assertion moved, and both in-check plants still PASSED on the pre-fix build -- the correct
behaviour, and the freeze says so.

### My own falsifications, on the GOOD build (the harder direction -- an arm that only reddens on a known-bad artifact has proved less than it looks)

| # | scratch mutation | expected | **observed** |
|---|---|---|---|
| **F1** | fit arm demands 20px clearance where the fix delivers 18 (`over <= 0` -> `over <= -20`) | fit arm red on tip | **RED, both orientations**, nothing else -- the arm reads the real number, it is not a constant |
| **F2** | run the **clean** arm-2 page under the same one-frame observer deferral the plant uses | first-open arms red on tip | **RED: `racingFrames:1, chipsAtSectionFirstPaint:0, bodyTravel:44, offsets:[88,132]}`** |

**F2 is the load-bearing one and it settles two questions at once.** The deferral reproduces the pre-fix
signature *digit for digit* on the fixed build -- so (i) the plant genuinely reconstructs the pre-fix
timing rather than merely perturbing something, and (ii) the arm discriminates on the tip build, not only
against a stale artifact. It also isolates the fix's mechanism: **deliver the observer callback one frame
later instead of as a microtask and the entire defect returns**, which is the freeze's causal claim, tested.

---

## 5. `grade_reveal` HARDENING -- NO ASSERTION WEAKENED (traced, not taken on trust)

**Assertion-set diff, `a84d68a` -> `df16e81`:** 11 `ok(...)` call sites on both sides, **names identical,
no addition, removal, or rename**. Diffing the **full expressions**, exactly one line differs -- and only
in its third argument, the failure-detail string:

```
- ... , !!missBox && !!recMiss && recMiss.cards[id0] === 1 && recMiss.done === 1, JSON.stringify({ hadButton: !!missBox, ...
+ ... , !!missBox && !!recMiss && recMiss.cards[id0] === 1 && recMiss.done === 1, JSON.stringify({ clicked: missBox || missWhy, ...
```

**The condition is byte-identical.** The d341750 must-not-weaken standard holds. And the precondition is
strictly *stronger*: `missBox` used to mean "a rect existed"; it now means "the button was at rest (two
consecutive agreeing samples) **and** two-sided reachable (`document.elementFromPoint` inside `#drill`
**and** `shadowRoot.elementFromPoint` on `#jm`), and the click was delivered at those very coordinates."

**The dropped `await scrollTo(page, 'jm')` is not lost coverage:** `scrollTo` was
`scrollIntoView({block:'center', behavior:'instant'}) + settle`, and `btnProbe` performs that same
`scrollIntoView` **on every poll iteration** -- re-asserted per read rather than once, matching the
discipline the sibling `reachProbe` already uses. `scrollTo` is still called by the two `'jg'` arms.

### Stability -- 6/6, and earned under real load

Run **concurrently with my own full gate re-run** (verified live: CPU ~59%, 15 node + 24 chrome + the
gate's python), which is a genuinely loaded box rather than a proxy for one.

| runs | load | result | assertions |
|---|---|---|---|
| 1-3 | sequential, gate running | **PASS** x3 | 13 PASS / 0 FAIL each |
| 4-6 | **3x concurrent**, gate running (7s wall for the batch) | **PASS** x3 | 13 PASS / 0 FAIL each |

**6/6 PASS**, all 13 assertions in every run (no run silently covered less), and the previously-flaky arm
green in all six. **I endorse the freeze's own honest limit:** six passes cannot prove a race is gone.
What carries the claim is the mechanism -- the click is now gated on the same at-rest + two-sided
reachability proof the sibling arm has used since it stopped flaking -- and F3 above proves that gate is
really the thing delivering the click.

---

## 6. GATE (re-run by me, on the committed tree)

**`python3 test/check_all.py` on the committed tree (`df16e81`, working tree verified clean before, during,
and after) -> `GATE: PASS`, exit 0, `69 PASS / 0 FAIL / 0 SKIP`** (tallied from the capture, not from a
summary line). Capture: `.../w18-verify/gate-rerun.txt`.

**My re-run's check set is byte-identical to the committed capture** -- same 69 names, all PASS, zero
added or missing (`diff` of the two extracted name lists is empty). Corroborating lines, all reproduced:

| check | line |
|---|---|
| `cram_fit` | `CRAM FIT: PASS` -- the new registration runs green in the train |
| `grade_reveal` | `GRADE REVEAL: PASS` -- 7th consecutive pass, on top of my 6 standalone |
| `build_integrity` | `12125603 bytes ... COMMITTED deliverable == fresh build of HEAD` -- the fixes are in the shipped bytes |
| `visual_regression` | `16 baselines ... matched its committed pixels` |
| `ascii_guard` | `820 files ... test 71` |
| `global_collisions` | `688 top-level globals, each declared in exactly one module` |
| `touch_floor` / `print_truth` | PASS -- the siblings that share this surface are unaffected |

**Count claim independently confirmed at source, not just by the total:** the check registration list goes
**42 -> 43** with exactly one addition (`cram_fit`) and **zero removals**, and the whole `check_all.py` diff
is **31 insertions / 0 deletions** -- so nothing was removed, renamed, or made conditional to reach 69.

### VR standalone -- the X2a acceptance test, quantified

`node test/visual_regression.cjs`:

```
16 baselines compared; worst = 0 px (home-light), budget 32 px.
VISUAL REGRESSION: PASS
```

| baseline | viewport | changed px |
|---|---|---|
| **`m-walk-light`** | **390x844** | **0** |
| **`m-walk-dark`** | **390x844** | **0** |
| `home-light` (the reported "worst") | 1280x800 | **0** |
| the other 13 | - | **0** |

**16/16 at zero changed pixels against a FRESH capture** -- which is a strictly stronger statement than the
blob-identity check in S0(b), and the two together close the brief's blocking clause from both ends:
nothing was re-baselined, *and* a fresh Chromium capture still lands on the committed pixels, including
both baselines at the exact viewport where WebKit was losing 12px.

---

## 7. FREEZE ACCURACY

**Every load-bearing number in `_audit/2026-07-30-w18-webkit.md` reproduced. No over-claims found.**

| freeze claim | my result |
|---|---|
| X2a WK `73/60` gutter 13 -> `61/60` gutter 1 | exact |
| X2a taps 38 of 44 -> 44 (both controls) | exact, by an independent hit-test scan |
| X2a `scrollWidth` 977 WK / 976 CR, unchanged by the fix | exact |
| X2a chromium-neutral except the computed `scrollbar-width` string | exact |
| `scrollbar-width:none` alone does nothing in WebKit 26.5; the pseudo does the work | reproduced by injection |
| X5 1 racing frame / 0 chips / 44px travel / `[88,132]` -- **both engines** | exact, both engines, both builds |
| X5 frame cost ~30ms CR / ~140ms WK | 29.8ms / 134ms |
| X5 "not engine-attributable; the audit was wrong" | **confirmed**, and I identified the audit's cadence blind spot |
| X8 +18px both orientations -> 18px clearance; byte-identical in CR | exact |
| `cram_fit` = 13 assertions; watched RED = 4 specific reds | exact |
| both plants fire; both ABORT rather than fail an arm | confirmed, plus my two independent falsifications |
| `grade_reveal` 6/6, 13 assertions, no assertion weakened | reproduced under heavier load; diff traced |
| 68 -> 69, exactly one new check, none removed | confirmed at source: registration list 42 -> 43, one addition, zero removals, `check_all.py` diff is 31 insertions / 0 deletions |
| VR 16/16, nothing re-baselined | confirmed at blob level, all 16 SHA-1 unchanged |

**Three presentational notes, none a defect:**

0. **The freeze's S6 gate block is a paraphrase formatted as verbatim output.** It shows
   ```
   GATE: PASS        exit 0
   69 PASS / 0 FAIL / 0 SKIP
   ```
   The gate emits only `GATE: PASS`; neither the committed capture nor my re-run contains a
   `69 PASS / 0 FAIL / 0 SKIP` line or an `exit 0` suffix. **The numbers are true** -- I counted 69 PASS,
   0 FAIL, 0 SKIP independently and the exit code really is 0 -- so this is formatting, not an over-claim
   of substance. Flagged only because it is the one place in the freeze that reads as quoted output and
   is not.

1. **Absolute timings differ from the freeze's traces** (my WK pre-fix open->chips is 140->274ms; theirs
   483->668ms). Wall-clock is load- and box-dependent; every *structural* number -- frame counts, chip
   counts, layout travel, offsets -- is identical. The freeze's claims rest on the structural ones.
2. **My X5 open used a synthetic `.click()`**, because at 390x844 in the walk view `#cramopen` sits ~450px
   below the fold and my reachability pre-check correctly refused a blind mouse click. The builder reports
   a real trusted tap. Both paths, plus `cram_fit`'s own `.click()`, produce identical structural results,
   so this does not qualify the finding -- recorded so nobody reads my trace as contradicting theirs.

---

## 8. HAZARDS PRE-CLEARED

- **Repo untouched.** `git status --porcelain` empty before, during, and after; tip still `df16e81`. Every
  build under test came from `git show` into scratch; all three falsifications (`f1`,`f2`,`f3`) are scratch
  copies. No commit, no merge, no push, no rebaseline, no `_audit` write.
- **No image-wide kills.** No `taskkill /IM`; browsers were closed by their own Playwright handles.
- **A sibling was live** (w17's node/chrome present throughout). I added at most one concurrent browser at
  a time and never touched another worktree.
- **Isolated context per run**, `deviceScaleFactor: 1`, `innerWidth`/`innerHeight` asserted on every read.
- **Negative controls before greens** throughout -- including on my own instruments, one of which
  (the baselines path) was a false pass and was corrected before use.

## 9. NOT VERIFIED (stated, not implied)

- **Real iOS/macOS Safari.** Everything here is Playwright's WebKit 26.5 **Windows** build, which uses
  classic space-reserving scrollbars. The freeze already says default iOS overlay scrollbars may show X2a
  as 0. That disclosure is accurate and the suppression is measurably free where the defect is absent.
- **The topic-switch-while-open staleness** the freeze files as found-not-fixed. I confirmed the fix does
  not change that path (the observer is one-shot in both builds, so it is not a regression), but I did not
  independently reproduce the staleness itself. It is disclosed, out of scope, and correctly left alone.
