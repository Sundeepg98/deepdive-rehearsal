# THE GATE PROFILE -- where the 14 minutes actually go

**Wave:** gate-runtime, Phase 1. **Tree:** `infra/gate-runtime` off master tip `45bc4f4`.
**Box:** the dev box, deliberately quiet -- no sibling wave, no browser fleet, nothing else
scheduled. **Runs:** three full SERIAL gate runs, back to back, 76/76 PASS and zero SKIP on
every one of them.

Every number below is generated from the raw `--profile` dumps by `test/_profile_report.py`.
None of them is retyped, because a profile whose figures are retyped drifts from its own
evidence the first time somebody repeats a run.

---

## The headline: the premise was wrong, and it was wrong by a factor of thirty

The wave was commissioned on the theory that the gate is slow because "76 checks, many paying a
full ~12MB browser boot each". The first half is true. The second half is not, and it is not
close.

**Every `chromium.launch()` and `newContext()` in an entire gate run sums to 19.9 seconds --
2.3% of the run.** That is the whole ceiling of Phase 2. A perfect shared browser, one that
eliminated browser startup completely and cost nothing, would take a 14.4 minute gate to
14.1 minutes.

Three measurements say the same thing from different directions:

1. **Each browser check launches Chromium exactly ONCE.** 45 launches in the whole gate, about
   380ms each. The static reading that motivated the boot-tax theory -- "9 launch sites in
   `overlay_deadzone`" -- was counting `newContext`/`newPage`, not `launch`. Contexts are
   16-30ms. It is the page loads and the assertions that cost, not the process spawn.
2. **The single most expensive check in the gate has no browser at all.** `syntax_check` is
   48-78 seconds depending on cache state. `ascii_guard` is another 31 seconds cold. Between
   them they are ~12% of a cold run and nothing about a browser would touch either.
3. **92.8% of the run is neither engine boot nor node boot** -- it is navigating to a 12.2MB
   single-file app and asserting against it, repeatedly, across viewports and topics. `render`
   sweeps 7 widths x 46 topics x 9 panes. `home_claims` drives 9 edge records at 2 viewports
   and opens 76 pages. That is the bill.

The corollary sets the wave's direction: **the only lever with real headroom is concurrency.**
19.9 seconds of browser boot cannot be worth a persistent server in a correctness gate on its
own; 801 seconds of genuine work spread over N workers can be worth a scheduler.

---

## How the boot tax was measured

The per-check wall time is easy -- `check_all.py` holds the stopwatch. The boot tax is not
visible from outside the process, so it had to be measured from inside one, and the honest
options were to edit 41 checks or to intercept one function.

`test/_gate_runtime.cjs` is loaded into every check by `NODE_OPTIONS=--require` and wraps
Playwright's factory methods in place. No check file was touched. It is inert unless
`GATE_TRACE_DIR` is set, and every hook is wrapped so an instrument fault degrades to a missing
trace line rather than a red -- a profiler that can turn a green check red would make the
baseline runs unusable as the correctness reference they also serve as.

**Two limitations, both found by looking rather than by assuming.**

- `browser.newPage()` is deliberately NOT hooked. Playwright implements it as `newContext()`
  followed by `context.newPage()`, both of which the hooks already see, and the first version of
  this instrument booked one page as two. Caught by reading the trace of a check whose source
  clearly opened one page and whose trace claimed two.
- **An ESM entry point cannot be hooked lazily.** `import { chromium } from 'playwright'` does
  not route through `Module._load`, so the gate's two `.mjs` checks (`visual_pane_smoke`,
  `shadow_css_guard`) sailed straight past the hook: their first trace files contain a
  `node_start`, an `exit`, and nothing in between, while both demonstrably drive a browser. Runs
  1-3 in the tables below therefore **undercount launches by two** (their wall times are exact;
  only their engine-boot columns are missing). Fixed after run 3 by eagerly requiring and
  patching Playwright when the entry script is `.mjs`, and verified: `shadow_css_guard` now
  records its 226ms launch. Two launches is ~0.8s and moves the 2.3% headline by nothing, which
  is why the tables were not re-run -- but a shim that silently fails to hook is exactly the
  shape of instrument this repo has been burned by before, so it is written down rather than
  quietly repaired.

---

## The box is not a constant, and that matters more than the spread

The brief asked for the serial tail to include "anything the profile flags as timing-variant
between your two baseline runs". Executing that instruction honestly required a third run,
because the first two are not comparable.

**Run 1 was COLD.** The worktree had been checked out minutes earlier -- 2733 files -- so run 1
paid first-traversal filesystem costs that no later run pays. `ascii_guard` went 31.09s -> 1.68s
between runs 1 and 2. `syntax_check` went 78.26s -> 48.54s. In aggregate the native checks got
**81.4 seconds faster**.

**And the browser checks got 53.4 seconds SLOWER over the same interval**, consistently, across
many checks at once (`home_claims` +15.5s, `rail_integrity` +10.1s, `scoreboard_salience`
+8.5s). Two effects of opposite sign, roughly cancelling in the total, which is why run 1 and
run 2 look like near-neighbours (873.1s vs 845.0s) while almost every individual row moved.

Run 3 was added as a warm-vs-warm partner for run 2. Even that pair spreads widely, and the
reason is instructive: percentage spread is dominated by **absolute jitter on sub-second
checks**. `layout_static` at 0.14s vs 0.59s is a 122% "spread" and 0.44 seconds of noise.
Ranking by it puts eleven native checks that take under two seconds above every browser check in
the gate.

**So wall-time spread was REJECTED as the instrument for serial-tail membership.** It measures
box drift and measurement noise, not load sensitivity, and a tail chosen from it would be
padded with cheap native checks while missing the browser checks that actually race. The tail is
instead seeded **structurally** -- from what each check's own documentation says it measures
(animation frames, transition windows at +0/+16/+60/+150/+300ms, rasterised pixels, a wall-clock
tokenize budget, geometry "at rest") -- and then arbitrated **empirically by verdict**, in the
repeated-run battery in the acceptance document. What decides whether a check belongs in the
tail is whether its VERDICT moves under load, and no amount of timing data answers that.

One check names the effect in its own comment already: `click_drift` records "observed totals:
11 of 128 under heavy load, 14-15 idle". It is in the tail.

---

## What this means for Phases 2-4

| phase | measured headroom | disposition |
|-------|-------------------|-------------|
| 2 -- shared browser | **2.3%** (19.9s of 863.5s) | built, proven, **OFF by default** (`--shared-browser`). Not worth a persistent server in a correctness gate on the wall-time argument alone. Retained because it may reduce machine load under `--fast`, which is a stability argument and is settled in the acceptance battery, not here. |
| 3 -- parallel lanes | the remaining **92.8%**, bounded by a serial tail and by the longest single check | the wave's actual product. |
| 4 -- `--changed` | n/a (a development convenience, not a runtime optimisation) | built, and built to be impossible to mistake for a certification. |

The floor for Phase 3 is arithmetic and worth stating plainly: barrier (`build_integrity`,
~20s, which rewrites the deliverable every other check reads and therefore cannot have a
neighbour) + the serial tail + the longest single pool check (`home_claims`/`syntax_check`, ~70s).
No number of workers goes below that.

---

## Totals

| run | when | total wall | native | browser |
|-----|------|-----------:|-------:|--------:|
| run 1 (COLD tree) | | 873.1 s (14.55 min) | 202.1 s | 670.9 s |
| run 2 (warm) | | 845.0 s (14.08 min) | 120.7 s | 724.3 s |
| run 3 (warm) | | 863.5 s (14.39 min) | 170.0 s | 693.5 s |

### Where the time is NOT going

| | seconds | share of run 3 |
|-|--------:|---------------:|
| engine boot -- every `chromium.launch()` + `newContext()` summed | 19.9 | **2.3%** |
| node boot + `require('playwright')` before the first launch | 42.5 | 4.9% |
| everything else -- navigating and asserting | 801.1 | **92.8%** |

Census for one whole gate run: **45** `chromium.launch()` calls, 147 browser contexts, 241 pages.

## Ranked cost table

Sorted by the warm cost actually used to pack the parallel lanes (`test/gate_cost.json` = max of runs 2 and 3).

| # | check | run1 (cold) | run2 | run3 | kind | launches | ctx | pages | engine s |
|---|-------|------------:|-----:|-----:|------|---------:|----:|------:|---------:|
| 1 | `home_claims` | 61.52 | 77.06 | 60.19 | browser | 1 | 2 | 76 | 0.28 |
| 2 | `syntax_check` | 78.26 | 48.54 | 70.20 | native | 0 | 0 | 0 | - |
| 3 | `click_drift` | 71.36 | 58.42 | 64.55 | browser | 1 | 15 | 15 | 0.97 |
| 4 | `scoreboard_salience` | 36.27 | 44.77 | 38.88 | browser | 1 | 13 | 13 | 0.66 |
| 5 | `cta_contrast` | 28.26 | 36.05 | 34.69 | browser | 1 | 13 | 13 | 0.88 |
| 6 | `render` | 28.43 | 30.43 | 36.02 | browser | 1 | 8 | 8 | 0.64 |
| 7 | `visual_pane_smoke` | 31.58 | 28.53 | 32.81 | native | 0 | 0 | 0 | - |
| 8 | `visual_regression` | 27.03 | 30.88 | 24.12 | browser | 1 | 16 | 16 | 0.42 |
| 9 | `rail_integrity` | 18.79 | 28.85 | 20.33 | browser | 1 | 1 | 1 | 0.34 |
| 10 | `dock_contrast` | 21.10 | 28.05 | 22.97 | browser | 1 | 8 | 8 | 0.63 |
| 11 | `overlay_keyboard` | 27.41 | 25.91 | 27.05 | browser | 1 | 1 | 1 | 0.45 |
| 12 | `overlay_deadzone` | 20.93 | 16.38 | 22.98 | browser | 1 | 9 | 9 | 0.87 |
| 13 | `flow_cursor` | 21.49 | 19.05 | 22.79 | browser | 1 | 1 | 1 | 0.48 |
| 14 | `flow_handoff` | 24.22 | 20.07 | 21.92 | browser | 1 | 1 | 1 | 0.43 |
| 15 | `home_reflow` | 14.90 | 20.98 | 13.12 | browser | 1 | 1 | 18 | 0.27 |
| 16 | `build_integrity` | 17.20 | 14.18 | 20.64 | native | 0 | 0 | 0 | - |
| 17 | `transition_deadzone` | 16.63 | 13.49 | 18.24 | browser | 1 | 4 | 4 | 0.55 |
| 18 | `flow_contract` | 16.80 | 11.99 | 16.30 | browser | 1 | 1 | 1 | 0.42 |
| 19 | `back_deadend` | 13.18 | 11.40 | 15.46 | browser | 1 | 5 | 5 | 0.49 |
| 20 | `cram_surface` | 11.00 | 15.43 | 11.89 | browser | 1 | 2 | 2 | 0.34 |
| 21 | `numbers_lattice` | 12.06 | 6.87 | 15.23 | native | 0 | 0 | 0 | - |
| 22 | `print_truth` | 9.61 | 13.97 | 9.12 | browser | 1 | 1 | 2 | 0.37 |
| 23 | `progress_merge` | 12.01 | 13.41 | 13.17 | browser | 1 | 1 | 1 | 0.54 |
| 24 | `focus_ring` | 11.71 | 13.04 | 10.48 | browser | 1 | 3 | 5 | 0.33 |
| 25 | `cram_fit` | 11.85 | 11.45 | 12.99 | browser | 1 | 3 | 3 | 0.43 |
| 26 | `sidebar_geometry` | 8.80 | 12.91 | 8.06 | browser | 1 | 6 | 6 | 0.37 |
| 27 | `room_static` | 13.39 | 9.94 | 12.15 | native | 0 | 0 | 0 | - |
| 28 | `fold_budget` | 9.65 | 11.97 | 10.02 | browser | 1 | 1 | 1 | 0.34 |
| 29 | `flow_data` | 7.61 | 10.89 | 9.01 | browser | 1 | 1 | 1 | 0.28 |
| 30 | `no_dead_ends` | 6.12 | 6.59 | 10.62 | browser | 1 | 1 | 1 | 0.82 |
| 31 | `shadow_css_guard` | 9.38 | 10.11 | 8.36 | browser | 0 | 0 | 0 | - |
| 32 | `search_deadend` | 7.57 | 9.51 | 8.41 | browser | 1 | 1 | 1 | 0.33 |
| 33 | `e2e_interactions` | 8.57 | 8.82 | 8.99 | browser | 1 | 1 | 1 | 0.34 |
| 34 | `card_identity` | 8.72 | 7.64 | 8.93 | browser | 1 | 1 | 1 | 0.36 |
| 35 | `cram_scope_distinct` | 8.97 | 8.82 | 8.01 | browser | 1 | 1 | 1 | 0.29 |
| 36 | `mobile_nextup` | 5.34 | 7.64 | 8.21 | browser | 1 | 3 | 3 | 0.50 |
| 37 | `flow_a11y` | 10.27 | 6.80 | 8.01 | browser | 1 | 1 | 1 | 0.40 |
| 38 | `trend_integrity` | 7.78 | 7.81 | 7.73 | browser | 1 | 1 | 1 | 0.41 |
| 39 | `latent_arial` | 7.14 | 7.43 | 7.49 | browser | 1 | 4 | 4 | 0.55 |
| 40 | `touch_floor` | 4.62 | 7.28 | 6.53 | browser | 1 | 1 | 1 | 0.37 |
| 41 | `room_browser` | 8.35 | 5.96 | 7.20 | browser | 1 | 5 | 5 | 0.45 |
| 42 | `chrome_metrics` | 4.53 | 6.88 | 6.05 | browser | 1 | 1 | 1 | 0.29 |
| 43 | `heading_tree` | 4.41 | 6.77 | 4.96 | browser | 1 | 1 | 1 | 0.30 |
| 44 | `grade_reveal` | 6.49 | 6.44 | 6.14 | browser | 1 | 1 | 1 | 0.37 |
| 45 | `flow_evidence` | 6.17 | 5.62 | 6.21 | browser | 1 | 1 | 1 | 0.38 |
| 46 | `entity_leak` | 6.22 | 5.58 | 5.96 | browser | 1 | 1 | 1 | 0.30 |
| 47 | `scoreboard_resume` | 5.63 | 5.42 | 5.24 | browser | 1 | 1 | 1 | 0.27 |
| 48 | `seg_state` | 4.18 | 5.25 | 4.95 | browser | 1 | 1 | 1 | 0.37 |
| 49 | `cold_open` | 3.19 | 3.82 | 4.49 | browser | 1 | 1 | 1 | 0.36 |
| 50 | `token_liveness` | 3.48 | 4.33 | 4.21 | browser | 1 | 1 | 1 | 0.32 |
| 51 | `compiler_conservation` | 4.17 | 2.01 | 3.81 | native | 0 | 0 | 0 | - |
| 52 | `topic_contract` | 3.25 | 2.94 | 2.40 | browser | 1 | 1 | 1 | 0.29 |
| 53 | `ascii_guard` | 31.09 | 1.68 | 1.52 | native | 0 | 0 | 0 | - |
| 54 | `compiler_doc_examples` | 1.29 | 0.64 | 1.52 | native | 0 | 0 | 0 | - |
| 55 | `compiler_emit_serializer` | 1.45 | 0.63 | 1.32 | native | 0 | 0 | 0 | - |
| 56 | `compiler_md` | 1.23 | 0.63 | 1.27 | native | 0 | 0 | 0 | - |
| 57 | `css_syntax` | 1.82 | 0.83 | 1.14 | native | 0 | 0 | 0 | - |
| 58 | `compiler_prose` | 0.92 | 0.55 | 1.05 | native | 0 | 0 | 0 | - |
| 59 | `compiler_legacy_topic` | 0.97 | 0.54 | 0.81 | native | 0 | 0 | 0 | - |
| 60 | `bank_novelty` | 0.71 | 0.80 | 0.53 | native | 0 | 0 | 0 | - |
| 61 | `build_determinism` | 0.98 | 0.58 | 0.73 | native | 0 | 0 | 0 | - |
| 62 | `at_name_hygiene` | 0.52 | 0.65 | 0.64 | native | 0 | 0 | 0 | - |
| 63 | `layout_static` | 0.30 | 0.14 | 0.59 | native | 0 | 0 | 0 | - |
| 64 | `global_collisions` | 0.48 | 0.57 | 0.56 | native | 0 | 0 | 0 | - |
| 65 | `bank_pushback` | 0.38 | 0.57 | 0.47 | native | 0 | 0 | 0 | - |
| 66 | `typeface_census` | 0.48 | 0.29 | 0.51 | native | 0 | 0 | 0 | - |
| 67 | `slab_ink` | 0.62 | 0.42 | 0.40 | native | 0 | 0 | 0 | - |
| 68 | `tracking_census` | 0.51 | 0.23 | 0.40 | native | 0 | 0 | 0 | - |
| 69 | `unit_tests` | 0.39 | 0.17 | 0.33 | native | 0 | 0 | 0 | - |
| 70 | `sim_invariants` | 0.26 | 0.14 | 0.31 | native | 0 | 0 | 0 | - |
| 71 | `phantom_tokens` | 0.28 | 0.17 | 0.28 | native | 0 | 0 | 0 | - |
| 72 | `home_rhythm` | 0.25 | 0.13 | 0.25 | native | 0 | 0 | 0 | - |
| 73 | `file_integrity` | 0.17 | 0.10 | 0.21 | native | 0 | 0 | 0 | - |
| 74 | `compiler_flow` | 0.12 | 0.06 | 0.12 | native | 0 | 0 | 0 | - |
| 75 | `room_contrast` | 0.14 | 0.08 | 0.10 | native | 0 | 0 | 0 | - |
| 76 | `compiler_code` | 0.09 | 0.06 | 0.08 | native | 0 | 0 | 0 | - |

## Appendix: the cold/warm confound, stated in full

Biggest movers, run 1 -> run 2:

| check | run1 | run2 | delta | kind |
|-------|-----:|-----:|------:|------|
| `syntax_check` | 78.26 | 48.54 | -29.72 | native |
| `ascii_guard` | 31.09 | 1.68 | -29.41 | native |
| `click_drift` | 71.36 | 58.42 | -12.95 | browser |
| `numbers_lattice` | 12.06 | 6.87 | -5.19 | native |
| `flow_contract` | 16.80 | 11.99 | -4.81 | browser |
| `overlay_deadzone` | 20.93 | 16.38 | -4.55 | browser |
| `home_reflow` | 14.90 | 20.98 | +6.08 | browser |
| `dock_contrast` | 21.10 | 28.05 | +6.95 | browser |
| `cta_contrast` | 28.26 | 36.05 | +7.78 | browser |
| `scoreboard_salience` | 36.27 | 44.77 | +8.51 | browser |
| `rail_integrity` | 18.79 | 28.85 | +10.07 | browser |
| `home_claims` | 61.52 | 77.06 | +15.54 | browser |

Aggregate: native **-81.4 s**, browser **+53.4 s**.

