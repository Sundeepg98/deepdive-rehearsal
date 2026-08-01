# COLD VERIFY: the gate-runtime wave

**Verifier:** gr-verifier, independent, no shared context with gr-builder.
**Subject:** `D:\claude-workspace\_worktrees\deepdive-rehearsal\gate-runtime`, branch
`infra/gate-runtime`, tip `f543a1b`, 3 commits on base `45bc4f4`.
**Worktree and main repo:** READ-ONLY throughout. Nothing was written to either. Every run,
mutant and capture happened in scratch mirrors (below).

> ### THE SUBJECT MOVED WHILE I WAS VERIFYING -- read this before quoting anything below
>
> The brief named tip `f543a1b`, and that is what this verdict measures. **By the time I
> finished, the branch tip was `9538419` -- two new commits:**
>
> - `cdb3268` *infra(gate): Phase 2 measured both ways, as ruled -- it is worse, and it stays off*
> - `9538419` *docs(audit): the capture of record, taken green under a sibling agent's load*
>
> They touch `test/_gate_browser_server.cjs` (+77), `test/_gate_runtime.cjs` (+46),
> `test/check_all.py` (6 lines), `test/gate_acceptance.py` (+29), and add 208 lines to the two
> audit documents. **The app deliverable is not among the changed files.**
>
> I delta-checked the two highest-stakes items against the new tip and **both still hold**:
>
> - **Item 3 (serial default untouched):** re-ran my AST registry comparison at `9538419` vs
>   `45bc4f4` -- native identical, browser identical, order identical, 76 checks. The entire
>   6-line `check_all.py` delta lives inside the `if SHARED and SHARE_TERMS:` branch and
>   `start_browser_server` (a `ws` -> `cdp` endpoint rename plus `GATE_OWNER_PID`). **Nothing in
>   the no-flag path changed.**
> - **Item 4 (share/cold policy):** re-ran it at `9538419`. `seg_state` -> `path:"shared"` in
>   31ms; `visual_regression` -> `path:"cold"`, `reason:"args"`, both PASS. The policy survives
>   the transport rewrite.
>
> **Everything else below was measured on `f543a1b`.** Items 1, 5 and 6 are unaffected in
> substance (the deliverable and the checks themselves are untouched by the new commits). My
> claims audit (item 7) reads the `f543a1b` text -- I re-checked the disputed figures and
> **findings 2, 3 and 4 persist verbatim at the new tip.**

## Environment I built, and why it is trustworthy

Two independent `git clone`s of the worktree at `f543a1b`, `node_modules` junctioned to the main
repo's (never removed recursively):

| mirror | path | purpose |
|--------|------|---------|
| C: mirror | `...\scratchpad\gr-verify\mirror` | all mutants, gate runs, batteries |
| D: mirror | `D:\claude-workspace\_gr-verify-scratch\mirror-d` | volume control for the flake rate |

**Faithfulness receipt:** `npm run build` in the C: mirror produced
`sha256 21eaaaf1786317f8f01857f3c7ef49204ad09bf2f7925ae9b765e15a8df85f38` -- byte-identical to
the committed deliverable -- and left `git status` clean. The mirror is the same tree, and the
build is reproducible across directories.

---

## VERDICT SUMMARY

| # | item | verdict |
|---|------|---------|
| 1 | the touch_floor 13.3% claim | **PASS (finding CONFIRMED, rate UNDERSTATED)** |
| 2 | the six mutants re-armed + two novel mutants | **PASS, with a new disagreement found** |
| 3 | the serial default is untouched | **PASS (proved by AST, not by reading) -- re-checked at `9538419`** |
| 4 | Phase 2 share/cold policy | **PASS -- re-checked at `9538419`** |
| 5 | my own stability sample (>=3 fast vs my serial) | **PASS 3/3** |
| 6 | byte-identity + diff surface | **PASS** |
| 7 | claims audit (>=5 numbers spot-derived) | **PASS on 14 numbers; 3 do not reproduce** |
| 8 | negative controls on my own instruments | **PASS (one probe caught defective, fixed)** |

---

## ITEM 1 -- the touch_floor rate. THE FINDING IS REAL; THE PUBLISHED RATE IS LOW.

The brief's inversion condition was: *if you measure ~0/30, the fast lane owns the two
disagreements.* **I did not measure ~0/30. I measured 14/60.** No inversion. The builder's
reading of the two disagreements stands.

**My independent measurement, `--only touch_floor`, serial, solo, quiet box:**

| sample | geometry flake | harness error | all red |
|--------|---------------:|--------------:|--------:|
| C: mirror, n=30 | 8 (26.7%) | 0 | 8 (26.7%) |
| D: mirror, n=30 | 6 (20.0%) | 2 (6.7%) | 8 (26.7%) |
| **my pooled, n=60** | **14 (23.3%)** | 2 (3.3%) | 16 (26.7%) |

**Every one of the 14 geometry failures is the byte-identical `{"w":42.2,"h":42.2}`** on the
byte-identical assertion (*"the cram sheet's close button clears 44px in BOTH axes"*). Zero
variation across 14 failures on two volumes. The signature the builder published is exact.

**The rate:** builder 4/30 = 13.3% [95% CI 5.3-29.7]; mine 14/60 = 23.3% [14.4-35.4]; pooled
18/90 = **20.0% [13.0-29.4]**. Fisher exact two-sided p = 0.402 -- the two samples are
statistically compatible, so this is not a contradiction, but 13.3% is the low end of a range
whose pooled centre is 20%. **The honest number for the repo is ~20%, not 13.3%.**

**The volume is not the confound.** I built the D: mirror specifically because my first sample
ran on C: temp while the builder measured on D:. Both volumes returned 8/30 all-red. My rate is
a property of the check, not of my scratch location.

### The mechanism is sharper than the document states, and it is a rule you can point at

The document says 42.2 is `44 x 0.959`, *"a control sampled mid-transform"*. From the source:

- `src/styles.css:1191` -- `.cram-ov.open .cram-panel{animation:panelIn var(--duration-slow) var(--ease-glide)}`
- `src/styles.css:1190` -- `@keyframes panelIn{from{...transform:translateY(28px) scale(.96)...}}`
- `src/tokens.generated.css` -- `--duration-slow: 300ms`, `--ease-glide: cubic-bezier(.22,.61,.36,1)`
- no `perspective` exists anywhere in `styles.css`, so the `translateZ(-30px)` contributes no
  scaling

**44 x 0.96 = 42.24, which is exactly "42.2" at `toFixed(1)`.** The easing is monotonic with no
undershoot, so the scale can never go below .96. The observed value is therefore not an arbitrary
mid-flight scale -- **it is `panelIn`'s FIRST keyframe.** The check is not catching the animation
in motion; it is catching it before it has advanced at all, twice, 100ms apart (`B.pollFor`
sleeps 100ms between probes). With `cubic-bezier(.22,.61,.36,1)` over 300ms the scale leaves .96
almost immediately, so two agreeing reads at .96 mean the animation had not started.

This matters for the fix the freeze document proposes: *"require agreement across a rAF with an
identity-transform precondition"* is the right fix and this pins why -- the precondition needs to
be **transform is identity**, not merely **two reads agree**, because the two reads agree most
easily exactly when the animation has not begun.

### A second flake class the wave did not report

2 of my 60 solo runs (both on D:) failed with
`harness error: page.evaluate: Target page, context or browser has been closed` -- a browser
death, not a geometry read. Distinct from the 42.2 signature and not mentioned in the audit
documents. Low rate (3.3%), but it is a second way `touch_floor` goes red for a non-defect
reason. See also the contamination incident under Item 5.

### One thing I tested and could not support

I noticed failures clustering in faster runs and hypothesised the flake is a fast-box artifact.
**A median split refutes it:** faster half 7/28 red (25.0%), slower half 7/30 (23.3%). I am
recording the hypothesis as tested and rejected rather than reporting the eyeball impression.

Solo (18/90 = 20.0%) vs inside a full 76-check gate run (2/26 = 7.7%, pooling the builder's 22
full-gate receipts with my 4) gives Fisher p = 0.237 -- **not significant**. The gate may
experience a lower rate than the solo battery suggests, but the evidence does not establish it
and I make no claim.

---

## ITEM 2 -- the mutants

### 2a. The builder's six, re-armed independently: **6/6 DETECTED**

`python3 test/gate_acceptance.py preflight` in my mirror:

```
  geometry     chrome_metrics         sites=1  build=True  verdict=FAIL  detected=True
  content      compiler_conservation  sites=1  build=True  verdict=FAIL  detected=True
  atname       at_name_hygiene        sites=8  build=True  verdict=FAIL  detected=True
  vr           visual_regression      sites=1  build=True  verdict=FAIL  detected=True
  determinism  build_determinism      sites=1  build=True  verdict=FAIL  detected=True
  claims       home_claims            sites=1  build=True  verdict=FAIL  detected=True
```

Every site count matches the published table. Tree clean afterwards.

### 2b. My own two mutants -- classes the six do not cover

Both target checks are in the **parallel pool**, not `SERIAL_TAIL`, so both exercise concurrency.
Both anchors are refused unless they occur exactly once.

| id | class | target | edit |
|----|-------|--------|------|
| `keyboard` | keyboard-a11y | `overlay_keyboard` | `src/overlays/scope.html`: drop `tabindex="0"` from `#scopebody` -- one dialog scroll region unreachable by keyboard, the exact defect `#keybody` shipped with. No pixel moves, no content changes. |
| `navigation` | navigation-routing | `search_deadend` | `src/scripts/app/last-visit.js`: invert `navigateAfterPick`'s guard (`rc.view !== 'home'` -> `=== 'home'`) so picking a topic from `#home` strands the user. |

**Preflight: 2/2 detected.** Deliverable hash returned to gold after each.

`search_deadend` caught the navigation mutant on eight assertions including its own control
arm -- *"[X3/E] navigateAfterPick REFUSES off the home route ... (catches guard deletion, which no
interaction arm can see)"* and *"[control/X3/E] ...but it DOES fire on the home for a topic pick --
so the two arms above are not satisfied by a stub that always returns false"*. The mutant is
precisely the defect that check was built to catch.

### 2c. Serial vs fast on each novel mutant tree

| mutant | serial | fast | target red both ways | disagreements |
|--------|--------|------|----------------------|---------------|
| `keyboard` | 774.1 s, red = `overlay_keyboard` | 514.6 s, red = `focus_ring`, `overlay_keyboard` | **YES** | **`focus_ring`** |
| `navigation` | 666.9 s, red = `overlay_deadzone`, `search_deadend` | 457.5 s, red = `overlay_deadzone`, `search_deadend` | **YES** | **NONE** |

Both mutants were detected in both configurations, which is the acceptance property. `navigation`
agreed perfectly, including its cascade into `overlay_deadzone`.

**`keyboard` did not, and that is the finding of this verify: a serial-vs-fast disagreement on a
check that is NOT `touch_floor`.**

### The focus_ring disagreement, run to ground

`focus_ring` is in the **parallel pool**, not `SERIAL_TAIL` -- so unlike `touch_floor` (which was
in the tail and ran alone on both occasions it disagreed), `focus_ring` runs concurrently with
three siblings under `--fast`. If its verdict moves under concurrency, that is a tail-membership
question, not merely a flaky check. So I measured it the same way the builder measured
`touch_floor`:

| context | red |
|---------|----:|
| solo serial, clean tree | **0/25** |
| solo serial, keyboard-mutant tree | **0/25** |
| serial full gate (clean, and mutant tree) | **0/2** |
| `--fast --jobs 4`, clean tree | **0/3** |
| `--fast --jobs 4`, keyboard-mutant tree | **1/4** |

**Serial contexts: 0/52. `--fast` contexts: 1/7.** Fisher exact two-sided p = 0.119 -- not
significant. Rule of three puts the true serial rate below 5.8%.

**My probe is negative-controlled, and the first control I built was inadequate** -- I appended a
cascade-proof `outline-width:0px!important` on `.ix-c-reset`, `.cmp-fold`, `.cmp-reopen` only
after an earlier attempt (editing `button:focus-visible` at `styles.css:53`) left the check green
because a more specific rule outranked it. With the working control the probe reports `FOCUS RING:
FAIL (3)` naming all three light-DOM assertions. **So 0/50 solo is a real zero, not a blind
instrument.**

**Honest reading:** `focus_ring` is deterministic when run alone -- 50 solo runs, zero reds, proven
instrument. It went red once, under `--fast`, as `FOCUS RING: FAIL (1)` (a single assertion; the
dump was overwritten by the next run before I could name it, and it did not recur in 3 further
`--fast` runs on the identical tree). **One event cannot distinguish "load-sensitive" from "very
rare nondeterminism".** What it does establish is that **`touch_floor` is not the only check in
this gate that has produced a fast-only red**, and the acceptance document's *"One check in this
gate is not [deterministic], and it is named above"* is, on my evidence, an undercount.

---

## ITEM 3 -- the serial default is untouched: **PASS, proved mechanically**

Reading a 449-line diff and concluding "the registry looks unchanged" is not a proof, so I parsed
both revisions with Python's `ast` and compared the registry literals:

```
BASE native=30 browser=46 total=76      (45bc4f4, the for-loop iterables)
HEAD native=30 browser=46 total=76      (f543a1b, NATIVE_CHECKS / BROWSER_CHECKS)
NATIVE identical: True
BROWSER identical: True
ORDER identical: True | len 76
```

Every check name and every command/script path is identical, in identical order. 76 unique names,
no duplicates (which matters: the runner now keys `results` and dispatch by name via `dict(...)`,
so a duplicate name would silently collapse -- there is none).

Dispatch equivalence for the no-flag path, traced by hand:

- `PROFILE`/`SHARED`/`FAST`/`CHANGED` all false; `trace_env()` returns a plain `dict(os.environ)`,
  which is what `run(cmd)` built from `env=None` before. Native checks: identical env.
- Browser checks: `dict(trace_env(name), CHROME=chrome)` == the old `dict(os.environ, CHROME=chrome)`.
- `srv` is `None`, `write_profile()` returns immediately, no `--verdicts` file is written.
- `run_serial` walks `ORDER` = native-then-browser, one subprocess at a time.
- Empirically: my own no-flag run reported **76 checks, 0 FAIL, 0 SKIP, exit 0** in 761.4s.

**One behavioural difference I did find, and it is benign:** the `chrome = browser()` probe (a
node one-liner resolving Chromium's path) now runs *before* the native block instead of after it.
No native check installs or removes Playwright, so nothing can change the answer between those two
points. Worth knowing, not worth acting on.

---

## ITEM 4 -- Phase 2's share/cold policy: **PASS**

Shared server up, then the two traces, verbatim from `test/_trace/`:

```
seg_state.jsonl          {"ev":"connect","ms":84,"path":"shared","check":"seg_state",...}
visual_regression.jsonl  {"ev":"launch","ms":390,"path":"cold","reason":"args","check":"visual_regression",...}
```

`visual_regression` took a **cold** browser with **`reason: "args"`**, exactly as claimed, and
passed its 16 baselines under the shared-browser configuration -- so the mechanical refusal is
doing the job it exists for. **The instrument has its own negative control built in:** `seg_state`
in the same run recorded `path: "shared"`, so `"cold"` is a decision, not a stuck value.

---

## ITEM 5 -- my own stability sample: **PASS 3/3**

One serial run I captured myself as the reference, then three `--fast --jobs 4` runs:

| run | wall | exit | red | diff vs my serial | excl. touch_floor |
|-----|-----:|-----:|-----|-------------------|-------------------|
| serial (reference) | 761.4 s | 0 | none | -- | -- |
| fast 1 | 441.2 s | 0 | none | NONE | NONE |
| fast 2 | 427.2 s | 0 | none | NONE | NONE |
| fast 3 | 441.1 s | 0 | none | NONE | NONE |

**3/3 verdict-identical, raw AND excluding touch_floor** -- the two agree here because
`touch_floor` passed in all four of my full-gate runs. Mean speedup **1.74x** against my own
serial (the wave reports 1.44x; mine is higher because my serial was slower and my fast runs
faster -- speedup is not a constant, exactly as the freeze document says).

### An incident worth recording, because it nearly became a false finding

My **first** serial attempt returned six reds -- `click_drift`, `overlay_keyboard`, `flow_a11y`,
`no_dead_ends`, `scoreboard_salience`, `progress_merge` -- on a tree whose deliverable hashed
gold and whose `git status` was clean. They were **not assertion failures**: the reports end in
`Node.js v25.2.1` and raw stack frames, i.e. node-level crashes, interleaved with passing checks.
The `--fast` run immediately after passed all 76 on the same tree, and the re-run serial passed
all 76. Signature matches the two `Target page, context or browser has been closed` errors in my
D: battery. Most consistent with browsers being killed out from under the run by something else
on this box -- a documented hazard here, with ~30 agents in session.

I discarded that run, preserved it as evidence
(`green_stability.json:serial_contaminated_attempt1`, `gs_log_serial_CONTAMINATED1.txt`), and
re-captured. **Reported because had I not re-run, I would have filed six phantom findings.**

Side note: `fail_dump` is last-run-wins, so the passing re-run **erased** the failing run's
diagnostics before I could read them. If a future investigation depends on a red's evidence,
copy `test/_last_fail_*.txt` before re-running.

---

## ITEM 6 -- byte-identity and diff surface: **PASS**

```
21eaaaf1786317f8f01857f3c7ef49204ad09bf2f7925ae9b765e15a8df85f38 *deepdive_content_pipeline_rehearsal.html
```

Matches the freeze document exactly. Verified in the worktree, in a fresh clone, after a rebuild
in a different directory, and after every mutant revert in every battery.

`git diff --name-status 45bc4f4 HEAD` -- 11 files, and the surface is exactly as claimed:

- `.gitignore` (M) -- adds instrumentation-scratch ignores only
- `_audit/` (A x3) -- the three wave documents
- `test/` (M x1, A x6) -- `check_all.py` plus six new harness files

**No file under `src/`, `tools/` or `design-tokens/` is touched.** Confirmed against the
name-status list, not against the prose.

---

## ITEM 7 -- claims audit

I re-derived every number below from raw evidence in the tree rather than from the prose.
**14 reproduce exactly. 3 do not.**

### Reproduce exactly

| claim | stated | derived | source |
|-------|--------|---------|--------|
| boot tax | 2.3% | **2.30%** (19.9s / 863.5s) | `_profile_run3.json` |
| launches per gate | 45 | **45** | `_profile_run3.json` |
| contexts / pages | 147 / 241 | **147 / 241** | `_profile_run3.json` |
| node boot share | 4.9% | **4.92%** | `_profile_run3.json` |
| "everything else" | 92.8% | **92.78%** | `_profile_run3.json` |
| run totals | 873.1 / 845.0 / 863.5 | **exact** | `_profile_run{1,2,3}.json` |
| cold/warm confound | native -81.4s, browser +53.4s | **exact** | run1 vs run2 |
| green pair speedup | 1.44x | **1.44** (692.4 / 480.5) | `green.json` |
| stability range | 563-938 s | **563.2 - 937.9**, mean 665.4, spread 56.3% | `stability.json` |
| preflight | 6/6 | **6/6** (and re-armed by me: 6/6) | `preflight.json` |
| mutant disagreements | touch_floor on `vr` and `claims` only | **exact** | `mutants.json` |
| `gate_cost.json` = max(run2, run3) | claimed | **76/76 entries match, 0 missing** | derived |
| `--changed` selection | 1 / 16 / 11 / 76 | **1 / 16 / 11 / 76** | measured via `--dry-run` |
| serial-tail arithmetic | tail ~270s, barrier ~20s, floor ~6 min, ceiling ~2.4x | **268.5s / 20.6s / 6.1 min / 2.36x** (863.5 / 366.2) | `gate_cost.json` |
| "14 of 16 baselines red" on the `vr` tree | claimed identical both ways | **byte-identical report in both logs**, same 1914 px, same box | `log_mut_vr_*.txt` |
| "9 launch sites in overlay_deadzone" was miscounted | claimed | **1 `chromium.launch(`, 4 `newContext(`, 4 `newPage(`; measured 1/9/9** | source + profile |
| the two `.mjs` checks were unhooked | claimed | **both show `launches=0`** | `_profile_run3.json` |

### Do NOT reproduce

1. **`2/8 under --fast (25%)` is wrong against the wave's own receipts.** Counting `touch_floor`
   across every `verdicts_*.json`: **15 fast full-gate runs, 2 red = 13.3%** (the denominator
   omits the 8 stability runs, all of which passed). Serial: the doc says `0/9`; on disk there
   are **7** full-gate serial verdict files plus 3 profile runs, all PASS -- so 0/7 or 0/10, not
   0/9. **Direction matters: the error makes the fast lane look WORSE than the receipts show.**
   Corrected, the fast rate (13.3%) equals the builder's own solo rate (13.3%) exactly, which
   *strengthens* the document's conclusion that the data does not separate "load raises it" from
   "it was always like this."

2. **The headline 13.3% has no receipt in the tree.** The acceptance document opens *"Every number
   below is generated from `test/_acceptance/*.json` by `test/_acceptance_report.py`"* -- but
   `_acceptance_report.py` emits only the preflight/green/mutants/stability tables, and no
   solo-`touch_floor` receipt exists anywhere in the worktree. The single most consequential
   number in the wave is the one number that is hand-entered and unreproducible from the
   committed evidence. (This is now remedied: my 60-run battery is receipted at
   `touch_floor_solo.json` and `touch_floor_solo_Dvolume.json`.)

3. **`seg_state: 34ms against 450ms cold` does not reproduce.** I measure **84ms** shared connect
   and the profile records **337ms** cold for `seg_state` in run 3. The qualitative point (connect
   is several times cheaper than launch) holds; the specific pair does not, and its trace evidence
   is gitignored and absent.

### Minor imprecisions, not errors

- *"about 380ms each"* for launches -- measured mean **356ms**.
- *"Contexts are 16-30ms"* -- measured per-check means span **10-48ms**.

Neither moves the 2.3% headline, which I recomputed independently at 2.30%.

---

## ITEM 8 -- negative controls on my own instruments

A check that cannot fail certifies nothing, so each instrument had to be shown capable of the
opposite answer:

| instrument | negative control | result |
|------------|------------------|--------|
| touch_floor battery | planted `.mock-x{min-width:44px}` -> `30px`, recreating the real audit P3-5 defect (close button 32 wide) | harness reported **FAIL** naming the exact assertion; reverted, hash back to gold |
| mutant harness | every mutant refuses to apply unless its anchor occurs exactly n times; preflight requires the target to go red | 6/6 and 2/2 landed |
| share/cold trace | `seg_state` recorded `path:"shared"` in the same run | proves `"cold"` is a decision, not a stuck value |
| verdict-diff | attempt-1 serial reported six disagreements | proves the differ can report non-empty |
| `--changed` probe | **caught defective mid-flight**: my first `src/topics-md` probe used `touch`, which changes mtime but not content, so git reported no diff and the probe returned 1 instead of 16. Re-run with a real content edit -> **16**. | the instrument was fine; my input was a no-op, and I would have filed a false finding |
| mirror faithfulness | rebuild in a different directory | byte-identical deliverable, clean tree |

---

## FINDINGS BY SEVERITY

### BLOCKING

**None.** The brief's stated inversion condition -- measuring ~0/30 on `touch_floor`, which would
hand the two disagreements to the fast lane -- did not occur. I measured 14/60 with the identical
signature. The serial certification path is byte-equivalent in behaviour and produced 76/76 PASS
under my own no-flag run. The deliverable is byte-identical. Nothing here should stop the merge.

### NON-BLOCKING

1. **`touch_floor` is not the only check that has produced a fast-only red.** My `keyboard`
   mutant surfaced `focus_ring`: PASS serial, FAIL under `--fast --jobs 4`, on a tree where
   `focus_ring` is 0/50 in solo serial runs with a proven instrument. Not reproduced in 3 further
   `--fast` runs (1/7 fast overall vs 0/52 serial, p = 0.119). Two consequences: the acceptance
   document's claim that exactly one check is nondeterministic is an undercount on my evidence,
   and **`focus_ring` sits in the parallel pool, so if this is load sensitivity rather than rare
   flake, the serial tail is missing a member.** Severity is capped because `--fast` is opt-in and
   explicitly not certified for trains or CI. Recommend: give `focus_ring` the same 30-run
   treatment under `--fast` that `touch_floor` got serially, before anyone promotes `--fast`.

2. **The published `touch_floor` rate is low.** 13.3% (4/30) vs my 23.3% (14/60); pooled
   20.0% [13.0-29.4]. Statistically compatible (p = 0.402), so not a contradiction -- but the
   number a reader will quote should be ~20%, and the freeze document's argument that fixing this
   is *"worth more than anything this wave shipped"* is stronger at 20% than at 13.3%.

3. **`2/8 under --fast (25%)` contradicts the wave's own receipts.** The correct count from
   `test/_acceptance/verdicts_*.json` is **2/15 = 13.3%** (the denominator drops the 8 stability
   runs, every one of which passed). `0/9` for serial should be 0/7 verdict files, or 0/10
   including the three profile runs. The error is in the direction that flatters nothing -- it
   makes the fast lane look worse -- and correcting it strengthens the document's own conclusion,
   since the corrected fast rate (13.3%) equals the builder's solo rate exactly.

4. **The headline number has no receipt.** The acceptance document asserts *"Every number below
   is generated from `test/_acceptance/*.json` by `test/_acceptance_report.py`"*, but no
   solo-`touch_floor` receipt exists in the tree and `_acceptance_report.py` emits no such table.
   The 4/30 is hand-entered. In a campaign whose stated invariant is that unverified counts are
   wrong, the most load-bearing count in the wave is the unverified one. My 60-run battery is
   receipted and can be adopted.

5. **A second `touch_floor` failure class is unreported.** 2 of my 60 solo runs died with
   `harness error: page.evaluate: Target page, context or browser has been closed` -- a browser
   death, not the 42.2 geometry read. 3.3%, distinct signature, not mentioned anywhere.

6. **`seg_state: 34ms against 450ms cold` -- half of it reproduces, and only at the new tip.**
   At `f543a1b` (the `chromium.connect(ws)` transport) I measured **84ms**, not 34ms. At
   `9538419` (the CDP transport) I measured **31ms**, which matches. The `450ms cold` half does
   not reproduce either way -- the profile records `seg_state` cold at **337ms**. The underlying
   trace evidence is gitignored and absent from the tree, so neither figure can be audited from
   the repo.

7bis. **The new tip builds a fresh inference on the unreceipted rate.** The added acceptance text
   argues the 8 clean stability runs are unsurprising because *"0/8 has probability ~0.33"* at the
   13.3% solo rate. That arithmetic is correct **for that rate** (0.867^8 = 0.318). At my pooled
   20% it is 0.168, and at my measured 23.3% it is 0.119. The conclusion (0/8 is not surprising)
   survives; but it is a live inference resting on the one number in the wave that has no
   receipt.

7. **A `--fast` run stamps `certifying: true` into its `--verdicts` file** while its own summary
   line prints `[parallel -- not the capture of record]` and both audit documents say the fast
   lane is not certified for trains, captures of record, or CI. The field tracks *coverage*
   (`not CHANGED`), which is defensible, but any consumer reading `certifying` will read a
   `--fast` run as a certification -- the exact "partial run read as a full one" failure the
   `--changed` banner design exists to prevent.

### NOTES

8. **The 42.2 mechanism is more specific than documented, and the sharper statement helps the
   fix.** `44 x 0.96 = 42.24 -> "42.2"`, and `.96` is `panelIn`'s literal `from` scale
   (`styles.css:1190`) under a monotonic `cubic-bezier(.22,.61,.36,1)` with no `perspective`
   anywhere to make `translateZ(-30px)` contribute. The sample is not caught mid-flight at an
   arbitrary scale -- it is caught at the animation's **first keyframe, before it advances**, twice,
   100ms apart. That is why the "two agreeing reads" guard fails exactly here: agreement is
   *easiest* before the animation starts. The freeze document's proposed fix (an
   identity-transform precondition) is the right one; this is the reason it is.

9. **A stale filename in a shipped comment.** `test/check_all.py` (PROFILING block) refers to
   *"the NODE_OPTIONS preload in `test/_gate_trace.cjs`"*. The file is `test/_gate_runtime.cjs`;
   `_gate_trace.cjs` does not exist. The code itself uses the correct path.

10. **`visual_pane_smoke` is registered as a NATIVE check but drives a browser** (profile:
    `registered_browser=False`, and it is one of the two `.mjs` checks the document identifies as
    Playwright-driving). It therefore does not get the `if not chrome: SKIP` guard the browser
    list provides. **Pre-existing** -- the registry is byte-identical to `45bc4f4` -- and out of
    this wave's scope, but it means a browserless CI box would hard-FAIL rather than SKIP it.

11. **`fail_dump` is last-run-wins, and it destroyed evidence twice during this verify.** A
    passing re-run erases the failing run's `test/_last_fail_*.txt` before it can be read. It cost
    me the identity of the `focus_ring` assertion and the six contaminated-run diagnostics. Anyone
    investigating a red should copy the dump before re-running.

12. **Minor imprecisions:** launches average 356ms (doc: "about 380ms"); per-check context means
    span 10-48ms (doc: "16-30ms"). Neither moves the 2.3% headline, which I recomputed at 2.30%.

13. **The build is reproducible across directories** -- a fresh clone in a different volume and
    path rebuilt the deliverable to the identical `21eaaaf1...` hash and left the tree clean. Not
    a claim the wave made; worth having on the record.

---

## WHAT I DID NOT VERIFY

- **Any platform but this one.** One box, one OS, one browser build, `win32-chromium149`
  baselines. The wave says the same; I add nothing.
- **`--jobs` values other than 4.** Frozen configuration only, as shipped.
- **The shared browser under `--fast`.** I proved the share/cold policy holds; I did not run a
  stability battery with `--shared-browser` enabled, so its load argument remains unmeasured --
  exactly as the freeze document's follow-up #5 says.
- **The `home_claims.judgeQuotedFigures` blind spot.** I read the regex and the document's
  reasoning and find them consistent, but I did not plant a mutant to confirm the blind spot
  independently.
- **Long-run wall-time degradation.** My 3 fast runs (427-441s) were too few and too tightly
  clustered to speak to the 563-938s spread the wave reports over 8 runs.

## RECEIPTS ON DISK

All under `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\gr-verify\`:

| file | what |
|------|------|
| `touch_floor_solo.json`, `touch_floor_solo_Dvolume.json` | the 60 solo runs, per-run verdict + measured box |
| `tf_faildump_*.txt`, `tfD_faildump_*.txt` | all 16 failing dumps |
| `green_stability.json` | my serial reference + 3 fast runs, plus the preserved contaminated attempt |
| `gs_log_*.txt`, `gs_log_serial_CONTAMINATED1.txt` | full gate logs |
| `novel_preflight.json`, `novel_pairs.json`, `nv_log_*.txt` | my two mutants: preflight and both serial/fast pairs |
| `focus_ring_clean.json`, `focus_ring_mutant.json`, `focus_ring_fast.json` | the 50 solo + 3 fast focus_ring runs |
| `novel_mutants.py`, `green_stability.py`, `focus_ring_probe.py`, `focus_ring_fast.py`, `tf_battery_d.py` | every harness I wrote |
| `mirror/` | the C: scratch mirror (node_modules junction removed after the run) |

