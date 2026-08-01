# FREEZE: the gate-runtime wave

**Branch:** `infra/gate-runtime` off master tip `45bc4f4`. **Scope:** `test/` and runner infra
only. **App deliverable: BYTE-IDENTICAL throughout** --
`sha256 21eaaaf1786317f8f01857f3c7ef49204ad09bf2f7925ae9b765e15a8df85f38`, verified at the start,
after every planted mutant was reverted, and at freeze.

---

## What the wave was asked to do, and what the measurement said instead

The wave was commissioned to remove a per-check browser boot tax from a ~15-20 minute gate.
Phase 1 measured that tax at **2.3%** -- 19.9 seconds of an 863.5 second run. Every browser
check launches Chromium exactly once, at about 380ms; the reading that motivated the theory was
counting `newContext`/`newPage`, not `launch`. The most expensive check in the gate has no
browser at all.

So the brief's own instruction -- "this document replaces every estimate with measurement and
drives phases 2-3" -- redirected the wave. Phase 2 was built, proven, measured, and left OFF.
Phase 3 became the product. Details and the full ranked cost table:
`_audit/2026-08-01-gate-profile.md`.

---

## What shipped

**The registry/runner split.** `test/check_all.py` now has a hard line through it. Above it is
the CHECK REGISTRY -- every check, every comment, every threshold, unchanged. Below it is
ORCHESTRATION. No assertion, no threshold and no exemption lives below that line. **With no
flags the file dispatches exactly what it dispatched before:** native checks in order, then
browser checks in order, one subprocess at a time.

**Phase 1 -- `--profile`.** Per-check wall time, plus browser lifecycle from inside each check
via a `NODE_OPTIONS` preload (`test/_gate_runtime.cjs`) that wraps Playwright in place. No check
file was edited. Inert unless asked; every hook degrades to a missing trace line rather than a
red.

**Phase 2 -- `--shared-browser`. Built, measured BOTH WAYS as ruled, and DISABLED on the
evidence.** One shared Chromium reached over CDP; checks connect instead of launching
(`seg_state`: 34ms against 450ms cold). Off for two independent reasons, either of which is
sufficient: 2.3% does not buy a persistent server inside a correctness gate, and the battery the
ruling required came back **negative, not neutral** -- 3/3 shared runs red against 8/8 clean
without it, on `connectOverCDP` handshake timeouts when four workers contend on one
browser-level CDP endpoint. It fails hardest under exactly the concurrency it exists to serve.
And the hypothesis cannot be rescued: with a baseline of 0 red in 8 runs there is no flake rate
left to lower, so a fixed shared browser could at best draw level -- never *measurably lower*,
which is the condition the ruling set. Full receipts, including the earlier `launchServer` design
that would have HUNG the gate on three natural-exit checks, are in the acceptance document.
Its one genuinely interesting property is the safety mechanism: **sharing is refused
mechanically, not by a list.** The server publishes the launch terms it was started with, and the
shim compares every intercepted `launch()` against them, sharing only on an exact match.
`visual_regression` launches with `--force-color-profile=srgb --disable-lcd-text` -- PROCESS-level
rasterisation flags its baselines were captured under -- so it takes a cold browser automatically,
with `reason: "args"` in the trace. Any future check that adds a flag is exempted the day it is
written, by nobody.

**Phase 3 -- `--fast [--jobs N]`.** A barrier, a pool, and a serial tail.
- The **barrier** is `build_integrity`. It runs `npm run build`, which rewrites `dist/`, the
  deliverable and `src/topics/_generated/`; every other check reads at least one of those. It
  does not merely go first, it goes ALONE. Not a tuning knob.
- The **pool** is longest-first from `test/gate_cost.json` (committed, so lane packing is
  reproducible). A check missing from that file sorts FIRST, not last -- a new check is more
  likely to be expensive than free.
- The **tail** is 15 checks that measure time-relative phenomena, run one at a time.

**Phase 4 -- `--changed` (and `--only`, `--dry-run`).** Selects the checks a diff could plausibly
have broken. Verified: clean diff -> 1, `src/topics-md` -> 16, `design-tokens` -> 11, an unmapped
path -> all 76. **Unrecognised paths always widen to the whole gate**, so forgetting a mapping
rule can only make the lane slower, never blinder. It prints `FAST LANE -- NOT A CERTIFICATION`,
lists only the checks it ran, names how many it did not, and stamps `certifying:false` into any
`--verdicts` file.

---

## How the serial tail was chosen, and why not the way the brief proposed

The brief asked for the tail to include "anything the profile flags as timing-variant between
your two baseline runs". That instrument was measured and rejected, on evidence:

- Run 1 was COLD (a freshly checked-out worktree, 2733 files). Native checks are **81.4s faster**
  by run 2 while browser checks are **53.4s slower** -- two effects of opposite sign that nearly
  cancel in the total while almost every individual row moves.
- Even a warm-vs-warm pair spreads on absolute jitter: `layout_static` ranks top at a "122%
  spread" over 0.44 seconds of noise. Ranking by spread puts eleven sub-two-second native checks
  above every browser check in the gate.

A tail chosen that way would be padded with cheap native checks and miss the browser checks that
actually race. So the tail is seeded **structurally** -- from what each check's own documentation
says it measures (animation frames, transition windows at +0/+16/+60/+150/+300ms, rasterised
pixels, a wall-clock tokenize budget, geometry "at rest") -- and arbitrated **by verdict** in the
acceptance battery. What decides membership is whether a check's VERDICT moves, and no amount of
timing data answers that.

**VERDICT-STABILITY-UNDER-LOAD IS THEREFORE THE METHOD OF RECORD** for serial-tail membership in
this repo (team-lead ruling, 2026-08-01), superseding the wall-time-spread instrument the brief
proposed. The doctrine floor stands on top of it and is not subject to measurement at all:
`grade_reveal`, `touch_floor`, `visual_regression`, `chrome_metrics` and the determinism/build
checks stay in the tail regardless of what any spread or battery says, because doctrine and this
repo's flake history outrank a small number of samples.

---
## What acceptance proved

Full receipts: `_audit/2026-08-01-gate-runtime-acceptance.md`.

| question | result |
|----------|--------|
| are the six planted defects real? | **6/6** turn their target check red (two were re-aimed after the preflight caught them landing on nothing) |
| green tree, serial vs fast | **76/76 both ways, zero disagreements**, 692.4s -> 480.5s (1.44x) |
| six planted-broken trees, one per check class | **5/6 zero disagreements**; the 6th disagrees on one check, twice |
| repeated runs, full parallel configuration | **8/8 verdicts identical**, zero red (raw AND excluding the known-nondeterministic check -- nothing went red either way) |
| the same battery WITH `--shared-browser` (ruled: Phase 2's only path to shipping) | **3/3 runs red** -- a measured regression, so Phase 2 stays disabled |

**The one disagreement is a check that disagrees with itself.** `touch_floor` was measured alone,
serially, on a quiet box, 30 times: **4 false reds, 13.3%**, every one of them the identical
`{"w":42.2,"h":42.2}` -- 44 x 0.959, a control sampled mid-transform rather than a control that
is short. So the honest form of the claim is: **the fast lane is verdict-identical wherever the
checks themselves are deterministic.** It is written that way in the acceptance document and it
should be quoted that way.

---

## Speed, honestly

| | wall |
|-|-----:|
| serial, the capture of record | 692-863 s depending on box state |
| `--fast --jobs 4` | 480-938 s across eleven measured runs |
| `--changed` on a `src/topics-md` edit | 16 checks instead of 76 |

The measured green-pair speedup is **1.44x**, and it is not a constant: eight stability runs on
an unchanging tree ranged 563-938s, degrading under sustained back-to-back execution while the
verdicts did not move.

The floor is arithmetic and worth stating so nobody expects more: barrier (~20s) + the 15-check
serial tail (~270s) + the longest single pool check (~70s) is about 6 minutes no matter how many
workers. **~2.4x is the ceiling of this design**, and the tail is most of it.

For the inner loop, `--changed` is the bigger practical win and always was -- but it is a
development convenience that certifies nothing, and it says so itself.

---

## Follow-ups this wave deliberately did not do

1. **Fix `touch_floor`'s sampling. RULED (team-lead, 2026-08-01) as a separate CHECK-HYGIENE
   MICRO-WAVE immediately after this wave's train**, bundled with the two already-queued
   family-list coverage holes (`.nt-ov`/`.xd-ov` in `visual_regression` and `overlay_deadzone`) --
   same class, one small train. Its scope, as ruled: the at-rest guard design (poll until
   genuinely still -- compare against the untransformed box, or require N agreeing reads separated
   by a rAF plus a non-identity-transform precondition), and the acceptance it deserves -- a
   planted SLOW animation the new guard must hold against, a genuinely short control that must
   still FAIL, and a 30-run soak with the observed rate stated, target 0/30.
   The arc to state plainly in that wave's record: **protocol -> measurement -> root cause -> fix
   -> protocol retired.** The conductor's standing-order flake entry for `touch_floor` is the
   symptom record and should be cited as this defect's provenance; once the soak is clean, that
   entry RETIRES and the standing order is amended. Removing a 13% false red from a 76-check gate
   is worth more than anything this wave shipped: a check that cries wolf teaches the team that
   red means "run it again", and this repo has already paid for that lesson once.
2. **Fix `home_claims.judgeQuotedFigures`'s blind spot** on the single-thin-rail sentence.
   Received and **routed to W1.5** (the home's staged refinement wave, which already carries
   check-arm work). The mutant definition in `test/gate_acceptance.py` is the regression proof for
   whoever fixes it.
3. **Trim the serial tail.** It is the wall-clock floor and it holds 15 checks, only 5 of which
   the brief named. Trimming needs per-check evidence that a verdict does not move under load --
   the same 30-run treatment `touch_floor` got -- not an assumption.
4. **Tune `--jobs`.** 4 was frozen before the battery so that what was measured is what ships.
   The profile projects modest gains at 6; nothing here tested it.
4b. **`syntax_check`'s 48-78s internals are OUT OF SCOPE** for this wave by ruling, and correctly
   so -- parallelising browserless checks across lanes addresses it structurally rather than by
   optimising one check. Named here only because the profile makes it the single largest check in
   the gate and the next person to look at gate wall time will find it first. No trivially safe
   internal win was identified, so nothing was built.
5. ~~**Decide the shared browser's fate.**~~ **DECIDED, by the both-ways battery the ruling
   required: it stays disabled.** Not "we did not measure a benefit" -- a measured regression
   (3/3 red vs 8/8 clean). Reopening it would need a reason other than stability, because
   stability is the one argument the evidence has now closed: there is no flake rate left to
   lower. The code remains as a documented, disabled artifact with its failure mode written down,
   so the next person to have this idea starts from the measurement instead of the intuition.

---

## Operational hazard the cold verifier should know about

**This environment killed three long background runs outright during this wave**, with no signal
the harness could catch. Each time the acceptance battery died mid-mutant, leaving a planted
defect applied to the working tree -- and once with the deliverable already rebuilt from mutated
source. Nothing was lost, because the recovery rule held every time: **check `git status` and the
deliverable hash BEFORE doing anything else**, then revert and rebuild. Every recorded receipt was
written before its run died, so no result was corrupted.

Three permanent consequences:

- `do_mutants` and `do_stability` are RESUMABLE, merging by id rather than overwriting. An
  interrupted battery adds to its receipt instead of restarting or, worse, truncating it.
- Long phases run in sub-30-minute chunks, never as one unattended block.
- `test/_gate_browser_server.cjs` carries a PID watchdog on top of its stdin-EOF shutdown, because
  a killed parent on Windows delivered neither EOF nor a signal and left a server plus five
  Chromium processes on the box.

Browser cleanup throughout was done by PATH filter (`ms-playwright` in the command line), by PID,
never by image name. The operator's own ~35 Chrome processes were confirmed untouched after every
sweep. One caution learned here: Git Bash `pkill -f` does NOT reliably reach Windows processes --
a server it reported killing was still running, and was briefly mistaken for a teardown defect in
the runner before the PID was checked against the one the run had reported.

---

## Files

| file | what it is |
|------|-----------|
| `test/check_all.py` | registry above the RUNNER banner (unchanged); orchestration below it |
| `test/_gate_runtime.cjs` | `NODE_OPTIONS` preload: browser-lifecycle tracing + the share/cold decision |
| `test/_gate_browser_server.cjs` | the persistent browser, which publishes its own launch terms |
| `test/gate_cost.json` | measured per-check cost, committed, so lane packing is reproducible |
| `test/gate_acceptance.py` | the six mutants, the preflight, and the four acceptance phases |
| `test/_profile_report.py`, `test/_acceptance_report.py` | generate every number in the two audit documents |
| `_audit/2026-08-01-gate-profile.md` | Phase 1: where the 14 minutes go |
| `_audit/2026-08-01-gate-runtime-acceptance.md` | Phases 2-4: the receipts |

No file under `src/`, `tools/` or `design-tokens/` is modified by this wave. Planted mutants
touched five of them transiently and every one was reverted and rebuilt; the deliverable hash was
re-verified after each.

---
## The gate capture of record

SERIAL gate (`python3 test/check_all.py`, no flags) on the frozen tree at this commit.
**76 PASS, 0 FAIL, 0 SKIP, exit 0.**

**Taken under adversarial load, and that makes it stronger rather than weaker.** A sibling
agent was running its own browser-driven gate on this box throughout: sampled every 20
seconds for the duration of the run, it was active in 41 of 42 samples. The serial gate went
green anyway, in 15.2 minutes against the ~13.6 a quiet box gives it. A capture of record
that holds while another agent saturates the machine is a better certificate than one taken
in ideal conditions.

An earlier attempt at this capture, on the same code and also contended, came back 75/76
with `cta_contrast` red -- "[dark/architecture-apis] no core glyph pixels found", a
screenshot taken before the glyphs reached full alpha. Run alone on a quiet box immediately
afterwards it was **8/8 PASS**, and it passed in this run too. So: a load-sensitive
intermittent, not a regression -- tree clean and deliverable hash unchanged across both.
It is the same defect FAMILY as `touch_floor`: a stillness guard whose own condition is
timing-dependent, sampling early under load. That is the second instance of that family this
wave has measured, and it is noted for the ruled check-hygiene micro-wave.

```
================================================================
  ascii_guard               PASS  ASCII GUARD: PASS  (876 files strict 7-bit ASCII: src 688, src/topics-md 38, test 125, tools 25)
  syntax_check              PASS  SYNTAX CHECK: PASS  (614 modules parse; 52 aggregator files skipped)
  global_collisions         PASS  GLOBAL COLLISIONS: PASS  (690 top-level globals, each declared in exactly one module)
  build_integrity           PASS  BUILD INTEGRITY: PASS  (12249669 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
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
  76 checks in 914.7s (15.2 min)
GATE: PASS
```
