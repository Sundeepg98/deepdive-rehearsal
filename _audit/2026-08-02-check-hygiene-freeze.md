# FREEZE: the check-hygiene micro-wave

**Branch:** `infra/check-hygiene` off master `b989e4a`. **Scope:** check and test semantics -- the
wave the gate-runtime wave deliberately was not. **App deliverable BYTE-IDENTICAL throughout:**
`sha256 21eaaaf1786317f8f01857f3c7ef49204ad09bf2f7925ae9b765e15a8df85f38`. No file under `src/`,
`tools/` or `design-tokens/` is modified.

---

## What shipped

1. **The at-rest primitive** in `test/_boot.cjs` (`B.atRest`, `B.waitPainted`, `B.REST_STATE`),
   adopted by `touch_floor` and `cta_contrast` -- and inherited for free by `dock_contrast`, the
   third pixel-decode check, which already called `waitPainted`.
2. **The overlay family lists**, widened from three classes to all five at every site.
3. **`focus_ring` moved to the serial tail**, on measurement.
4. **Runner stamp hygiene**: `certifying` split into `full_coverage` and `capture_of_record`.

---

## 1. The primitive, and the arm that had to be corrected

The ruled design was **transform-is-identity + full effective alpha + rAF-separated
confirmation**. Two of those three shipped as ruled. The identity arm did not survive contact with
the battery, and the correction is the most useful thing in this wave.

**Identity was built first, exactly as specified.** It defeats the 42.2 defect: at `panelIn`'s
first keyframe the transform is `scale(.96)`, which is not identity, so the poll waits instead of
agreeing with itself. Then the battery ran, and `cta_contrast` **began failing on a CLEAN tree**,
timing out with the primitive's own diagnostic naming the culprit:

```
moving: "button transform=matrix(1, 0, 0, 1, 0, -1)"
```

That is `.mockbtn:hover{transform:translateY(-1px)}` (`styles.css:476`). Playwright's cursor rests
over the CTA it is measuring, so the button sits -- permanently, correctly, **at rest** -- one
pixel high. Identity would never arrive. **A guard that hangs on a compliant control is a worse
defect than the one it replaced**: a false red is loud, a false timeout is a red nobody can act on.

**The corrected predicate is "nothing is in flight", via `getAnimations()`.** It is the only
signal that separates the two states a geometry read cannot tell apart:

| state | transform | animation | is it at rest? |
|-------|-----------|-----------|----------------|
| hover lift, transition finished | `translateY(-1px)` | none | **yes** |
| panel parked at `panelIn`'s first keyframe | `scale(.96)` | `running`/`pending` | **no** |

Identity is required by nothing. The transform CHAIN is still compared across the rAF gap, so a
transform changing without an Animation object behind it is caught anyway. Infinite animations are
excluded deliberately -- the boot spinner never finishes, and waiting on it would hang rather than
settle (the pixel gate pins those to a fixed phase for the same reason).

**This is a deviation from the ruling, made on evidence and reported rather than absorbed.** The
ruling's intent -- do not let a guard mistake "not started" for "at rest" -- is fully met; the
mechanism named in it is not the one that meets it.

**A second defect of my own, found the same way:** the first primitive returned `null` from its
poll probe on "not yet", so `pollFor` reported `last=null` and the timeout **could not say what
was moving**. A guard built to abolish blank reds does not get to emit one. The probe now returns
the state and the predicate judges it; `atRest` appends the blocking reason to its error. Every
diagnostic quoted in this document exists because that was fixed first.

---

## 2. The overlay family lists

The app has exactly five overlay classes -- `.ix-ov`, `.mock-ov`, `.cram-ov`, `.nt-ov`, `.xd-ov`
(`styles.css`, plus `notes-overlay.js` and `cross-drill.js` which construct the last two). The
stillness and zombie guards listed **three**, and one site listed four.

All five sites now list all five: `visual_regression` x2 (the `openOverlay` capture probe and the
"no overlay carrying .open" wait) and `overlay_deadzone` x2 (the `inOverlay` hit-test attribution
and the modal-suppression probe). Both `.nt-ov` and `.xd-ov` are real overlays with `.open` states
and opacity transitions, so these were live holes: a capture could have been taken with one of
them still fading over the viewport.

Verified after the edit: zero three-class lists remain in `test/`. The full attribute-predicate
conversion stays W2's, per the room spec -- this is the stopgap that was ruled, not a redesign.

---

## 3. `focus_ring`: moved to the tail, on measurement

The gate-runtime cold verify found it red once under `--fast` against 0/52 serial (p = 0.119) and
recommended a 30-run treatment before anyone promoted the fast lane.

**How it was measured, and the substitution stated plainly:** 30 full fast gates would be ~5
hours, and the variable under test is concurrency, not the other 72 checks. So each trial ran
`focus_ring` in a 4-worker pool beside three heavyweight pool siblings it genuinely competes with
(`render`, `cta_contrast`, `scoreboard_salience`). A reader is entitled to judge that substitution;
it is why the number below is not "1/30 full fast gates".

| context | red | rate |
|---------|----:|-----:|
| concurrent, this wave | 1/30 | 3.3% |
| concurrent, cold verify | 1/7 | 14.3% |
| **concurrent, pooled** | **2/37** | **5.4%** |
| serial solo, this wave | 0/30 | 0.0% |
| serial, cold verify | 0/52 | 0.0% |
| **serial, pooled** | **0/82** | **0.0%** |

Fisher exact two-sided **p = 0.0949**. Rule of three puts the true serial rate below **3.7%**.

**Suggestive, not significant, and not claimed as significant.** What settles it is the wave's own
stated criterion -- *0/30 means rare flake, leave it in the pool* -- and the measurement was
**1/30**. Reinforcing it: two independent observers have now each seen a fast-only red, and
neither has seen a serial red in 82 trials. And the costs are asymmetric: moving it adds ~12s to
the tail; leaving it risks an unexplainable red in the lane people are being asked to trust.

**The failure's identity is still unknown, and that is now a recorded gap.** Both occurrences
reported `FOCUS RING: FAIL (1)` -- one assertion, unnamed. `fail_dump` is last-run-wins, so the
next passing run deleted the dump before it could be read, in the verify AND again here at trial
7. The battery now copies the dump the instant a trial fails, so the next occurrence will name it;
no further occurrence happened in trials 8-30.

---

## 4. Runner stamp hygiene

`certifying: not CHANGED` became two fields, because it was answering two questions with one
name and a `--fast` run stamped `certifying: true` while its own banner said the opposite:

- `full_coverage` -- every registered check ran (false under `--changed`/`--only`)
- `capture_of_record` -- may stand as THE gate result: full coverage, serial, no shared browser

Verified across the matrix: a `--only` run stamps both **false**; the no-flag serial capture below
stamps both **true**.

---

## Acceptance

**The primitive battery drives both failure directions**, because a stillness guard can be wrong
in two opposite ways and only one of them is loud:

| mutant | check | expected | got |
|--------|-------|----------|-----|
| `slow_animation` -- `panelIn` stretched to 2.5s | `touch_floor` | PASS (must wait) | **PASS** |
| `slow_fade` -- 2.2s app-wide fade | `cta_contrast` | PASS (must wait) | **PASS** |
| `short_control` -- `#cramx` forced to 30px | `touch_floor` | **FAIL** (must still catch) | **FAIL** |
| `low_contrast` -- `#mockopen` text to `#9a9a9a` | `cta_contrast` | **FAIL** (must still catch) | **FAIL** |

**4/4.** The two SLOW mutants prove the guard is no longer fooled by motion; the two BROKEN
mutants prove it did not buy that green by ceasing to measure -- which is the failure a fix like
this is most likely to introduce and least likely to notice.

**Soaks, solo, quiet box:**

| check | red | rate | pre-fix baseline |
|-------|----:|-----:|------------------|
| `touch_floor` | **0/30** | 0.0% | 18/90 = **20.0%** [13.0-29.4] |
| `cta_contrast` | **0/30** | 0.0% | observed under load; 8/8 solo pre-fix |
| `focus_ring` (serial) | **0/30** | 0.0% | -- |

0/30 does not prove 0%: rule of three puts the true post-fix `touch_floor` rate below **10.0%**,
which does not by itself exclude the pre-fix 20%. What excludes it is the pair -- 18/90 before
against 0/30 after, **Fisher exact two-sided p = 0.0061** -- plus a named, source-level mechanism
and a mutant that reproduces the defect on demand. (Both figures in this paragraph were computed,
not estimated; an earlier draft had them as 9.5% and 0.0068 from memory, which is the exact habit
the previous wave's cold verify caught and this one is not going to repeat.)

---

## PROPOSED amendment to the conductor's standing order (flake protocol)

For the team-lead to apply at train time. Current entry covers `touch_floor` as a known flake.

> **`touch_floor` -- RETIRED 2026-08-02.** Root-caused and fixed, not merely re-run. The 42.2
> signature was the check sampling `panelIn`'s first keyframe before it advanced; its
> "two agreeing reads" guard was anti-correlated with the property it tested, because agreement is
> easiest before an animation starts. Replaced by the shared at-rest primitive in `test/_boot.cjs`
> (nothing in flight + full alpha + rAF-separated confirmation). Measured 18/90 = 20.0% before,
> **0/30 after**. No re-run allowance remains: a `touch_floor` red is now evidence.
>
> **`cta_contrast` -- same family, same fix, no entry required.** Its "no core glyph pixels"
> failure under load was the same defect on the paint side; it adopted the same primitive and
> soaked 0/30.
>
> **`focus_ring` -- NOT retired; moved to the serial tail.** 2/37 red under concurrency against
> 0/82 serial across two independent observers (p = 0.095). Unproven as load-sensitivity and
> unexplained as an assertion -- both occurrences reported `FAIL (1)` and both dumps were destroyed
> by `fail_dump`'s last-run-wins before they could be read. Under `--fast` it is now in the tail,
> so the exposure is closed; the open question is only whether the underlying assertion is sound.
> Keep an entry for it, pointing here.

---

## Follow-ups this wave did not do

1. **`fail_dump` is last-run-wins and has now destroyed evidence three times** in this campaign
   (twice in the cold verify, once here). A passing re-run deletes the failing run's
   `test/_last_fail_*.txt` before anyone reads it, which is precisely how a rare failure gets
   reproduced and then spent for nothing. Recommend keeping the last N dumps per check, or naming
   them by run. Not done here: it is runner infrastructure, and this wave is check semantics.
2. **`focus_ring`'s failing assertion is still unnamed.** The battery now preserves the dump; the
   next occurrence answers it.
3. **The full attribute-predicate overlay conversion** stays W2's, per the room spec.
4. **`visual_pane_smoke` is registered NATIVE but drives a browser**, so it hard-FAILs rather than
   SKIPs on a browserless box (cold-verify note 10). Pre-existing, registry-level, untouched.

---

## The gate capture of record

SERIAL gate (`python3 test/check_all.py`, no flags), quiet box, on the frozen tree.
**76 PASS, 0 FAIL, 0 SKIP, exit 0**, 702.4s (11.7 min). Its `--verdicts` file stamps
`full_coverage: true, capture_of_record: true`.

```
================================================================
  ascii_guard               PASS  ASCII GUARD: PASS  (966 files strict 7-bit ASCII: src 688, src/topics-md 38, test 215, tools 25)
  syntax_check              PASS  SYNTAX CHECK: PASS  (614 modules parse; 52 aggregator files skipped)
  global_collisions         PASS  GLOBAL COLLISIONS: PASS  (690 top-level globals, each declared in exactly one module)
  build_integrity           PASS  BUILD INTEGRITY: PASS  (12249669 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the deliverable, HEAD-match DEFERRED -- 7 uncommitted path(s) [.gitignore, test/_boot.cjs, test/check_all.py]: commit src/ AND the rebuilt deliverable together, or CI will reject the pair)
  css_syntax                PASS    PASS All checks passed (18 keyframes validated)
  room_static               PASS  ROOM STATIC: PASS  (codemod=0, styles.css infinite=0, 6 room blocks + rebind, boot stamped)
  room_contrast             PASS  ROOM CONTRAST: PASS  (12 rooms: ink/bg >= 4.5, on-slab/solid >= 5.0)
  slab_ink                  PASS  SLAB INK: PASS
  phantom_tokens            PASS  PHANTOM TOKENS: PASS  (3 known phantom(s) allowlisted in phantom_tokens_debt.json; no new one, none left stale)
  typeface_census           PASS  TYPEFACE CENSUS: PASS  (185 declarations, 0 orphans, 2 documented exception(s), both pinned to --sans or argued in place)
  tracking_census           PASS  TRACKING CENSUS: PASS  (116 declarations, 35 from the token layer, 0 literals, 0 orphans, 0 registered)
  home_rhythm               PASS  HOME RHYTHM: PASS  (8 rhythm gap(s) + 11 measure(s), all from the semantic layer; registry matches discovery exactly)
  file_integrity            PASS  PASS All 65 files passed integrity check
  unit_tests                PASS    Results: 73 passed, 0 failed
  sim_invariants            PASS  SIM INVARIANTS: ALL PASS
  visual_pane_smoke         PASS  VISUAL PIPELINE SMOKE: ALL PASS
  layout_static             PASS  LAYOUT STATIC: PASS  (35 source assertions; NO PIXELS INSPECTED -- test/visual_regression.cjs is the check that looks at the screen)
  compiler_conservation     PASS  CONSERVATION: PASS -- every authored item survives compilation intact.
  compiler_doc_examples     PASS  DOC EXAMPLES: PASS -- every worked example in the spec survives the parser intact.
  compiler_md               PASS  Markdown-parser data-equivalence vs the hand-coded spec: 54 pass, 0 fail
  compiler_emit_serializer  PASS  That is prove_conservation.mjs / prove_doc_examples.mjs, which have an INDEPENDENT reference.
  compiler_legacy_topic     PASS    This says NOTHING about the compiler that ships. See prove_conservation.mjs.
  compiler_prose            PASS  Layer B prose reproduction: 3/3 byte-identical
  compiler_flow             PASS  Layer C flow reproduction: 3/3 byte-identical
  compiler_code             PASS  Layer C code reproduction: 3/3 byte-identical
  build_determinism         PASS  BUILD DETERMINISM: PASS  (88 Shiki blocks render identically under a simulated 600ms/line stall; control confirmed the stall trips a default-budget tokenizer)
  numbers_lattice           PASS  NUMBERS LATTICE: PASS  (46/46 topics driven across 567,131 evaluations (37 exhaustive), 1 defect(s) in 1 topic(s), all allowlisted)
  bank_pushback             PASS  BANK PUSHBACK: PASS  (46 topics, 613 cards, 0 known pushback defect(s) allowlisted in bank_pushback_debt.json across 0 topics)
  bank_novelty              PASS  BANK NOVELTY: PASS  (46 topics, 826 Int exchanges, longest shared run 8 < 9; 826 kept exchange(s) held their novelty against the snapshot)
  at_name_hygiene           PASS  at_name_hygiene: 52/52 assertions, 9 + 2 mutants all detected
  render                    PASS  RENDER TEST: PASS
  entity_leak               PASS  ENTITY LEAK: PASS  (no HTML entity reaches visible text; 3/3 overlay bodies opened + inspected)
  overlay_deadzone          PASS  OVERLAY DEADZONE: PASS  (35 assertions: the first real click lands; no layer hit-tests while fading; focus leaves a closing dialog; the keymap stays suppressed under an open one; no unrequested modal at first paint)
  transition_deadzone       PASS  TRANSITION DEADZONE: PASS  (39 assertions: real clicks and keys land throughout every pane and topic switch, including straight out of the index overlay; the hit-test never collapses to the captured root; and every switch under test provably happened)
  click_drift               PASS  CLICK DRIFT: PASS  (118 assertions: the nine pane tabs sit at an identical y on all 46 topics, and a real click at the resting centre of the shortest control in five shadow roots lands on that control at +0/+16/+60/+150/+300ms after both a pane switch and a topic switch; all three probes were re-armed against a planted defect on this run)
  overlay_keyboard          PASS  OVERLAY KEYBOARD: PASS  (57 assertions across 7 dialogs: every focusable is Tab-reachable through the shadow boundary; focus never escapes; Enter AND Space on the focused close button close it; focus restores to the trigger; every dialog scroll region is a focusable, named, scrollable keyboard surface; the mock run opens on its surface and keeps Space-to-reveal)
  flow_a11y                 PASS  FLOW A11Y: PASS  (6 assertions: N documented; dock CTA announced; armed legend silent; pip described; strip focus ring)
  room_browser              PASS  ROOM BROWSER: PASS  (data-group + --topic-ink + --acc rebind at boot; reduced-motion renders in both themes; the home brand mark wears the brand indigo and claims no room)
  back_deadend              PASS  BACK DEADEND: PASS
  no_dead_ends              PASS  NO DEAD ENDS: PASS
  mobile_nextup             PASS  MOBILE NEXTUP: PASS
  search_deadend            PASS  SEARCH DEADEND: PASS  (29 assertions: the whole-system prompts route to real component topics; a topic picked from #home in Search or the Topic index actually lands on it; navigateAfterPick refuses off the home route; and a cross-drill pick from #home exits too)
  cold_open                 PASS  COLD OPEN: PASS
  cta_contrast              PASS  CTA CONTRAST: PASS  (36 CTA x room x theme, every core glyph pixel >= 5.0:1)
  latent_arial              PASS  LATENT ARIAL: PASS  (0 known component(s) allowlisted in latent_arial_debt.json; no new latent-Arial button, no fixed entry left stale)
  dock_contrast             PASS  DOCK CONTRAST: PASS  (armed legend >= 5.0:1 on the flattened dark dock, 18 glyph-runs x room; self-test tripped)
  scoreboard_salience       PASS  SCOREBOARD SALIENCE: PASS  (48 room x theme x score; Solid is the loudest tile whenever it is non-empty, in every room, both themes, and never fills at zero)
  scoreboard_resume         PASS  SCOREBOARD RESUME: PASS
  grade_reveal              PASS  GRADE REVEAL: PASS
  e2e_interactions          PASS  E2E INTERACTIONS: PASS
  progress_merge            PASS  PROGRESS MERGE: PASS
  flow_data                 PASS  FLOW DATA: PASS
  trend_integrity           PASS  TREND INTEGRITY: PASS
  flow_handoff              PASS  FLOW HANDOFF: PASS
  flow_evidence             PASS  FLOW EVIDENCE: PASS
  flow_contract             PASS  FLOW CONTRACT: PASS
  flow_cursor               PASS  FLOW CURSOR: PASS
  card_identity             PASS  CARD IDENTITY: PASS
  topic_contract            PASS  TOPIC CONTRACT: PASS  (46 topics: population, parity, tiers, cards conform)
  cram_scope_distinct       PASS  CRAM/SCOPE DISTINCT: PASS  (46 topics: 46/46 distinct cram bodies, 46/46 distinct scope bodies; shortest 2960 chars)
  cram_surface              PASS  CRAM SURFACE: PASS  (46 topics, 0 known cram-surface defect(s) allowlisted in cram_surface_debt.json across 0 topics; mirror verified against deriveCram on all 46; every sheet under the 9000px ceiling, height probe armed)
  print_truth               PASS    ----  pdf summary: {"content-pipeline":{"pages":3,"band":[3,5],"H":2768,"bytes":390220,"clipped":0,"lastHead":"If they say \u201cquickly\u201d \u2014 the 30 seconds","lastHeadPage":3,"chars":4789,"coverage":0.938},"consistency-models":{"pages":7,"band":[6,9],"H":6062,"bytes":740697,"clipped":0,"lastHead":"If they say \u201cquickly\u201d \u2014 the 30 seconds","lastHeadPage":7,"chars":16088,"coverage":0.981},"file-print-never-opened":{"pages":3,"clipped":0,"bytes":391493}}
  cram_fit                  PASS  CRAM FIT: PASS
  rail_integrity            PASS  rail_integrity: PASS -- 414 combos, 0 leaks, 0 empty boxes, all 414 authored notes render
  shadow_css_guard          PASS    PASS: every class styles.css selects is reachable from the light DOM.
  token_liveness            PASS  TOKEN LIVENESS: PASS  (10 assertions: every --ease-*/--duration-* resolves, survives a shorthand, and the two audited elements animate -- both themes)
  seg_state                 PASS  SEG STATE: PASS  (31 assertions across 10 tabs: one active, aria-current="true" on it, none stale)
  focus_ring                PASS  FOCUS RING: PASS  (18 assertions: 3 light-DOM chrome buttons kept their ring; the shadow #adv, #jg and .piv-jump get the BASE_SHEET ring; and in both themes the .hm-cta and all six .hm-room focus HALOS derive from their own room, each against a live negative control)
  sidebar_geometry          PASS  SIDEBAR GEOMETRY: PASS  (15 assertions: .tn-current readable at 5 desktop widths, 7+ pane tabs above the 1280x800 fold and 6+ of them fully; all three negative controls moved)
  heading_tree              PASS  HEADING TREE: PASS  (9 assertions: #home control holds; every topic route exposes >1 heading; #stagehead is a named, focusable level-2)
  fold_budget               PASS  FOLD BUDGET: PASS
  chrome_metrics            PASS  CHROME METRICS: PASS
  touch_floor               PASS  TOUCH FLOOR: PASS
  home_reflow               PASS    2 planted mutants detected (a wide child in the FIXED bar -- invisible to documentElement.scrollWidth -- and a wide child in the flow)
  home_claims               PASS    6 planted mutants detected (a full claim over empty rails; a level claim over unequal rails; a thin rail named on the highest tier; a step position beside a bare probe remainder; a verdict quoting one rail\u2019s figures for another; an inflated panel header) -- every one of them a defect a judge found on a shipped build
  visual_regression         PASS  VISUAL REGRESSION: PASS  (16 baselines, win32-chromium149; every capture reached a proven rest state across all 18 roots, cleared the blank-page floor, and matched its committed pixels)
================================================================
  76 checks in 702.4s (11.7 min)
GATE: PASS
```

---

# ADDENDUM: closing the cold verify (2026-08-02)

The independent cold verify returned **0 blocking, 4 non-blocking, 5 notes**
(`_audit/2026-08-02-check-hygiene-coldverify.md`). It endorsed the deviation and reproduced its
justification independently -- its scenario B returns `still: true` on a resting
`matrix(1,0,0,1,0,-1)`, which is the hover-lift refutation arrived at from the other side. All
four non-blocking findings are closed below. **Nothing in this addendum was argued with.**

## NB-1: `paused` animations were judged at rest -- CLOSED

The predicate skipped any `playState` that was not `running`/`pending`, so a **paused** animation
contributed nothing. A paused animation holds its element mid-transform *indefinitely*, which is
the exact state the primitive exists to refuse. The verify isolated it: a 44px control parked at
`scale(.961)` read **42.3px**, `still: true`, `alpha: 1`, and **the rAF chain-compare was blind to
it, because a paused transform is identical across frames.**

That is the 42.2 defect through a different door -- **and it is the one door the ruled
identity predicate would have closed.** Worth stating plainly rather than glossing: dropping
identity bought a real fix (it hung on a resting hover lift) and cost this, until now.

**Fix:** `paused` now blocks, alongside `running` and `pending`. Infinite animations remain
excluded, so no new hang risk is introduced.

**Why the mutant still ends in FAIL, and why that is correct.** A permanently paused animation
means the page never comes to rest, so there is nothing honest to measure. What the fix changes is
*which* failure:

| | before | after |
|-|--------|-------|
| verdict | FAIL (30s timeout) | FAIL (30s timeout) |
| diagnostic | `{"alpha":0,"still":true,"moving":null}` -- blank, and **wrong** | `"moving":"div <- panelIn [paused]"` |

The verdict alone cannot prove the fix, so the adopted mutant asserts on the **message**
(`expect_msg: "[paused]"`). A guard that fails blankly and a guard that names a paused animation
are different instruments, and only the second is actionable.

## NB-2: the focus battery no longer measured concurrency -- CLOSED

The commit that moved `focus_ring` into `SERIAL_TAIL` routed it out of the pool the battery built,
so its own command ran it **alone, after** the other three. The verify measured the tell: adding it
cost **+9s and +12s** -- its full solo runtime -- rather than the ~0s a spare worker would cost.
The 1/30 receipt was no longer re-derivable, and any re-run would have reported a meaningless 0/N
under a docstring claiming concurrency. **A harness that cannot fail.**

`do_focus` now spawns the four checks as **parallel subprocesses itself** and **asserts they
overlapped**, recording `overlap_s` per trial; a trial with zero overlap is reported INVALID and
excluded rather than counted. Concurrency is guaranteed rather than hoped for, and the battery
proves it measured what it claims.

Re-measured on the corrected harness: **`focus_ring` 0/10 red, 10/10 trials valid, 22-27s of
proven overlap with all three siblings per trial.**

**The old 1/30 is NOT pooled forward.** That harness did not run it concurrently, so the number
does not mean what it was recorded to mean. The tail move stands on the cold verify's independent
1/7 and on the ruled criterion, not on a figure now known to be mismeasured -- and the verify
endorsed the move on exactly those grounds.

## NB-3: `touch_floor.cjs:74` described the refuted design -- CLOSED

It said the primitive *"demands transform-identity as well as agreement"*. Identity is precisely
the arm the battery refuted. Rewritten to state the shipped contract: nothing in flight, full
alpha, rAF-separated confirmation, and **not** identity.

## NB-4: the null-probe claim was broader than the change -- CLOSED

True of `waitPainted`; the page-level `atRest` still returned `null` from its probe, and the
verify's paused mutant printed `last=null` verbatim. `atRest`'s probe now returns
`{ok, why}`/`{ok, value}` so both entry points report state rather than relying on the `catch` to
recover it.

## Notes 5, 6, 9

- **(6) "All five sites" -- there are FOUR sites**, two in each of `overlay_deadzone` and
  `visual_regression`. The edit was complete; the count was off by one. Corrected here.
- **(5) A second infinite animation exists**: `.timer.low{animation:pulse ... infinite}`
  (`drill/logic.js:79`), besides the boot spinner. Both are correctly excluded; the census behind
  the exclusion was one short, and `room_static` cannot see either because it scans only
  `styles.css`.
- **(9) `identity()` returns true for any transform form it does not model.** Safe direction -- it
  can only under-record `tf`, never block spuriously -- but the chain-compare arm is vacuous for
  any computed transform that is not `matrix()`/`matrix3d()`. Computed styles resolve to those two
  today. Left as-is, recorded.
- **(7) `touch_floor` got ~2x faster** (11.9s -> 5.8s). Benign, and expected from replacing a
  100ms-cadence agreement poll with rAF confirmation -- but it is also what "the check stopped
  measuring" looks like, and `short_control` re-arming is what rules that out.
- **(8) `fail_dump` destroyed evidence a fourth time**, to the verifier this session. Follow-up #1
  stands and is now the wave's most-repeated finding. `run_check` in the battery preserves every
  dump at the moment of failure.

## Re-run receipts

| battery | result |
|---------|--------|
| primitive mutants (now **6**, two adopted from the verify) | **6/6** |
| `touch_floor` re-soak | **0/10** |
| `cta_contrast` re-soak | **0/10** |
| `focus_ring` concurrency, corrected harness | **0/10**, all trials valid |

**`touch_floor` post-fix pooled across both authors: 0/55** (this wave 30 + verify 15 + re-soak
10). Fisher exact vs the pre-fix 18/90: **p = 0.000127**. Rule of three: true post-fix rate
**< 5.5%**. P(0/55 | rate still 20%) = **4.7e-6**. `cta_contrast` likewise **0/55**.

## The gate capture of record (SUPERSEDES the one above)

The capture earlier in this document was taken before the four non-blocking fixes. This one is
taken on the frozen tree at the addendum's commit, quiet box, no flags.
**76 PASS, 0 FAIL, 0 SKIP, exit 0**, 775.1s (12.9 min).

```
================================================================
  ascii_guard               PASS  ASCII GUARD: PASS  (907 files strict 7-bit ASCII: src 688, src/topics-md 38, test 156, tools 25)
  syntax_check              PASS  SYNTAX CHECK: PASS  (614 modules parse; 52 aggregator files skipped)
  global_collisions         PASS  GLOBAL COLLISIONS: PASS  (690 top-level globals, each declared in exactly one module)
  build_integrity           PASS  BUILD INTEGRITY: PASS  (12249669 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the deliverable, HEAD-match DEFERRED -- 5 uncommitted path(s) [_audit/2026-08-02-check-hygiene-freeze.md, test/_boot.cjs, test/primitive_battery.py]: commit src/ AND the rebuilt deliverable together, or CI will reject the pair)
  css_syntax                PASS    PASS All checks passed (18 keyframes validated)
  room_static               PASS  ROOM STATIC: PASS  (codemod=0, styles.css infinite=0, 6 room blocks + rebind, boot stamped)
  room_contrast             PASS  ROOM CONTRAST: PASS  (12 rooms: ink/bg >= 4.5, on-slab/solid >= 5.0)
  slab_ink                  PASS  SLAB INK: PASS
  phantom_tokens            PASS  PHANTOM TOKENS: PASS  (3 known phantom(s) allowlisted in phantom_tokens_debt.json; no new one, none left stale)
  typeface_census           PASS  TYPEFACE CENSUS: PASS  (185 declarations, 0 orphans, 2 documented exception(s), both pinned to --sans or argued in place)
  tracking_census           PASS  TRACKING CENSUS: PASS  (116 declarations, 35 from the token layer, 0 literals, 0 orphans, 0 registered)
  home_rhythm               PASS  HOME RHYTHM: PASS  (8 rhythm gap(s) + 11 measure(s), all from the semantic layer; registry matches discovery exactly)
  file_integrity            PASS  PASS All 65 files passed integrity check
  unit_tests                PASS    Results: 73 passed, 0 failed
  sim_invariants            PASS  SIM INVARIANTS: ALL PASS
  visual_pane_smoke         PASS  VISUAL PIPELINE SMOKE: ALL PASS
  layout_static             PASS  LAYOUT STATIC: PASS  (35 source assertions; NO PIXELS INSPECTED -- test/visual_regression.cjs is the check that looks at the screen)
  compiler_conservation     PASS  CONSERVATION: PASS -- every authored item survives compilation intact.
  compiler_doc_examples     PASS  DOC EXAMPLES: PASS -- every worked example in the spec survives the parser intact.
  compiler_md               PASS  Markdown-parser data-equivalence vs the hand-coded spec: 54 pass, 0 fail
  compiler_emit_serializer  PASS  That is prove_conservation.mjs / prove_doc_examples.mjs, which have an INDEPENDENT reference.
  compiler_legacy_topic     PASS    This says NOTHING about the compiler that ships. See prove_conservation.mjs.
  compiler_prose            PASS  Layer B prose reproduction: 3/3 byte-identical
  compiler_flow             PASS  Layer C flow reproduction: 3/3 byte-identical
  compiler_code             PASS  Layer C code reproduction: 3/3 byte-identical
  build_determinism         PASS  BUILD DETERMINISM: PASS  (88 Shiki blocks render identically under a simulated 600ms/line stall; control confirmed the stall trips a default-budget tokenizer)
  numbers_lattice           PASS  NUMBERS LATTICE: PASS  (46/46 topics driven across 567,131 evaluations (37 exhaustive), 1 defect(s) in 1 topic(s), all allowlisted)
  bank_pushback             PASS  BANK PUSHBACK: PASS  (46 topics, 613 cards, 0 known pushback defect(s) allowlisted in bank_pushback_debt.json across 0 topics)
  bank_novelty              PASS  BANK NOVELTY: PASS  (46 topics, 826 Int exchanges, longest shared run 8 < 9; 826 kept exchange(s) held their novelty against the snapshot)
  at_name_hygiene           PASS  at_name_hygiene: 52/52 assertions, 9 + 2 mutants all detected
  render                    PASS  RENDER TEST: PASS
  entity_leak               PASS  ENTITY LEAK: PASS  (no HTML entity reaches visible text; 3/3 overlay bodies opened + inspected)
  overlay_deadzone          PASS  OVERLAY DEADZONE: PASS  (35 assertions: the first real click lands; no layer hit-tests while fading; focus leaves a closing dialog; the keymap stays suppressed under an open one; no unrequested modal at first paint)
  transition_deadzone       PASS  TRANSITION DEADZONE: PASS  (39 assertions: real clicks and keys land throughout every pane and topic switch, including straight out of the index overlay; the hit-test never collapses to the captured root; and every switch under test provably happened)
  click_drift               PASS  CLICK DRIFT: PASS  (118 assertions: the nine pane tabs sit at an identical y on all 46 topics, and a real click at the resting centre of the shortest control in five shadow roots lands on that control at +0/+16/+60/+150/+300ms after both a pane switch and a topic switch; all three probes were re-armed against a planted defect on this run)
  overlay_keyboard          PASS  OVERLAY KEYBOARD: PASS  (57 assertions across 7 dialogs: every focusable is Tab-reachable through the shadow boundary; focus never escapes; Enter AND Space on the focused close button close it; focus restores to the trigger; every dialog scroll region is a focusable, named, scrollable keyboard surface; the mock run opens on its surface and keeps Space-to-reveal)
  flow_a11y                 PASS  FLOW A11Y: PASS  (6 assertions: N documented; dock CTA announced; armed legend silent; pip described; strip focus ring)
  room_browser              PASS  ROOM BROWSER: PASS  (data-group + --topic-ink + --acc rebind at boot; reduced-motion renders in both themes; the home brand mark wears the brand indigo and claims no room)
  back_deadend              PASS  BACK DEADEND: PASS
  no_dead_ends              PASS  NO DEAD ENDS: PASS
  mobile_nextup             PASS  MOBILE NEXTUP: PASS
  search_deadend            PASS  SEARCH DEADEND: PASS  (29 assertions: the whole-system prompts route to real component topics; a topic picked from #home in Search or the Topic index actually lands on it; navigateAfterPick refuses off the home route; and a cross-drill pick from #home exits too)
  cold_open                 PASS  COLD OPEN: PASS
  cta_contrast              PASS  CTA CONTRAST: PASS  (36 CTA x room x theme, every core glyph pixel >= 5.0:1)
  latent_arial              PASS  LATENT ARIAL: PASS  (0 known component(s) allowlisted in latent_arial_debt.json; no new latent-Arial button, no fixed entry left stale)
  dock_contrast             PASS  DOCK CONTRAST: PASS  (armed legend >= 5.0:1 on the flattened dark dock, 18 glyph-runs x room; self-test tripped)
  scoreboard_salience       PASS  SCOREBOARD SALIENCE: PASS  (48 room x theme x score; Solid is the loudest tile whenever it is non-empty, in every room, both themes, and never fills at zero)
  scoreboard_resume         PASS  SCOREBOARD RESUME: PASS
  grade_reveal              PASS  GRADE REVEAL: PASS
  e2e_interactions          PASS  E2E INTERACTIONS: PASS
  progress_merge            PASS  PROGRESS MERGE: PASS
  flow_data                 PASS  FLOW DATA: PASS
  trend_integrity           PASS  TREND INTEGRITY: PASS
  flow_handoff              PASS  FLOW HANDOFF: PASS
  flow_evidence             PASS  FLOW EVIDENCE: PASS
  flow_contract             PASS  FLOW CONTRACT: PASS
  flow_cursor               PASS  FLOW CURSOR: PASS
  card_identity             PASS  CARD IDENTITY: PASS
  topic_contract            PASS  TOPIC CONTRACT: PASS  (46 topics: population, parity, tiers, cards conform)
  cram_scope_distinct       PASS  CRAM/SCOPE DISTINCT: PASS  (46 topics: 46/46 distinct cram bodies, 46/46 distinct scope bodies; shortest 2960 chars)
  cram_surface              PASS  CRAM SURFACE: PASS  (46 topics, 0 known cram-surface defect(s) allowlisted in cram_surface_debt.json across 0 topics; mirror verified against deriveCram on all 46; every sheet under the 9000px ceiling, height probe armed)
  print_truth               PASS    ----  pdf summary: {"content-pipeline":{"pages":3,"band":[3,5],"H":2768,"bytes":390220,"clipped":0,"lastHead":"If they say \u201cquickly\u201d \u2014 the 30 seconds","lastHeadPage":3,"chars":4789,"coverage":0.938},"consistency-models":{"pages":7,"band":[6,9],"H":6062,"bytes":740697,"clipped":0,"lastHead":"If they say \u201cquickly\u201d \u2014 the 30 seconds","lastHeadPage":7,"chars":16088,"coverage":0.981},"file-print-never-opened":{"pages":3,"clipped":0,"bytes":391494}}
  cram_fit                  PASS  CRAM FIT: PASS
  rail_integrity            PASS  rail_integrity: PASS -- 414 combos, 0 leaks, 0 empty boxes, all 414 authored notes render
  shadow_css_guard          PASS    PASS: every class styles.css selects is reachable from the light DOM.
  token_liveness            PASS  TOKEN LIVENESS: PASS  (10 assertions: every --ease-*/--duration-* resolves, survives a shorthand, and the two audited elements animate -- both themes)
  seg_state                 PASS  SEG STATE: PASS  (31 assertions across 10 tabs: one active, aria-current="true" on it, none stale)
  focus_ring                PASS  FOCUS RING: PASS  (18 assertions: 3 light-DOM chrome buttons kept their ring; the shadow #adv, #jg and .piv-jump get the BASE_SHEET ring; and in both themes the .hm-cta and all six .hm-room focus HALOS derive from their own room, each against a live negative control)
  sidebar_geometry          PASS  SIDEBAR GEOMETRY: PASS  (15 assertions: .tn-current readable at 5 desktop widths, 7+ pane tabs above the 1280x800 fold and 6+ of them fully; all three negative controls moved)
  heading_tree              PASS  HEADING TREE: PASS  (9 assertions: #home control holds; every topic route exposes >1 heading; #stagehead is a named, focusable level-2)
  fold_budget               PASS  FOLD BUDGET: PASS
  chrome_metrics            PASS  CHROME METRICS: PASS
  touch_floor               PASS  TOUCH FLOOR: PASS
  home_reflow               PASS    2 planted mutants detected (a wide child in the FIXED bar -- invisible to documentElement.scrollWidth -- and a wide child in the flow)
  home_claims               PASS    6 planted mutants detected (a full claim over empty rails; a level claim over unequal rails; a thin rail named on the highest tier; a step position beside a bare probe remainder; a verdict quoting one rail\u2019s figures for another; an inflated panel header) -- every one of them a defect a judge found on a shipped build
  visual_regression         PASS  VISUAL REGRESSION: PASS  (16 baselines, win32-chromium149; every capture reached a proven rest state across all 18 roots, cleared the blank-page floor, and matched its committed pixels)
================================================================
  76 checks in 775.1s (12.9 min)
GATE: PASS
```
