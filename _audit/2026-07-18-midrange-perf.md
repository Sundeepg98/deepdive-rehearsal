# 2026-07-18 — Mid-range (4x CPU) perf track: attribution → chunking prototype → cold A/B verdict

**Track type: PROTOTYPE.** Nothing here is merged. The prototype exists only as working-tree modifications in worktree `D:/claude-workspace/_worktrees/deepdive-rehearsal/perf-chunk` (branch `perf/chunk-proto`, 7 files, +276/−22, on top of `54596e7`; the change is NOT committed). Base repo and `master` untouched by all three passes. Merging is a separate operator decision — this report ends in a recommendation, not a merge.

**Context:** this track runs RC-D of the 2026-07-18 smoothness analysis to ground — the "mid-range 4x-CPU explodes 21x" finding. Target: `deepdive_content_pipeline_rehearsal.html` (11.6MB single file), file://, headless Chromium (repo Playwright), CPU throttle via CDP `Emulation.setCPUThrottlingRate`, throttle verified live by calibration spin (81.9ms → 327.1ms = 3.99x).

**TL;DR:** Attribution exonerated pane-render script (~6–9% of the entry task) and indicted forced full-document reflows + reveal-deferred layout + the 11.6MB boot parse floor. The prototype (TopicPaneQueue: active-pane-first, hidden panes drained one-per-macrotask) was cold-verified **PARTIAL**: real −45% input→paint at 4x when a heavy pane is active and −20..−53% entries on heavy topics, 1x safe, gates pass — but total work is redistributed not reduced, the headline "855–1185ms entry task" turned out load-inflated (calm base entries are 96–422ms), and there is **one named, reproduced correctness regression** (stale visible-pane content via the `_tpOnScreen` hash oracle). **Recommendation: ITERATE.**

---

## 1. Attribution — where 4x main-thread blocked time actually goes

Method: two passes per rate (1x, 4x). Pass A = CDP `Profiler` (200µs sampling) + in-page wall-clock wrappers on every custom element's `connectedCallback`/`renderTopic` and on `setTopic`/`applyIdentity`/`publishBanks`/`switchTab`/`dispatch(deeptopicchange)`. Pass B = `browser.startTracing` (devtools.timeline + v8 + user_timing), scenario windows delimited by marks; blocked = Σ main-thread `RunTask` > 50ms wall. Topics by data size: small=`signing` (151KB), medium=`soft-delete` (278KB), large=`lambda-organization` (586KB); boot topic `content-pipeline`.

> **⚠️ Measurement trap (for anyone re-verifying):** the PerformanceObserver `longtask` API silently DROPS the big throttled tasks at 4x — it reported 0–114ms per entry while the trace shows the same window contains an 855–1185ms single task (it still reported 52–62ms paint tasks, so it looks alive). Use trace `RunTask` durations; API-based blocked time at 4x is garbage.

> **⚠️ Load caveat (added post-verdict):** the cold verifier could not reproduce the 855–1185ms entry tasks at *calm* 4x — clean base entries measured 96–422ms; 650–925ms appeared only under heavy ambient load (other agents active on this box). The attribution run's **absolute 4x milliseconds are load-inflated**; its *decomposition, rankings, and ratios* are the durable content — and its candidate-#2 prediction band (−80..−130ms/entry) matched the cold-measured ~100–130ms almost exactly.

### Scenario totals (trace; blocked = Σ tasks >50ms / busy = Σ all tasks, ms)

| scenario | 1x busy | 1x blocked | 4x busy | 4x blocked |
|---|---|---|---|---|
| cold boot → interactive | 2,189 | 1,845 | 14,011 | **13,372** (FCP 6.0s) |
| entry-small (first entry after boot) | 702 | 559 | 2,491 | **1,710** |
| entry-medium | 201 | 77 | 1,654 | **1,126** |
| entry-large | 192 | 73 | 1,923 | **1,386** |
| switch→drill | 137 | 68 | 1,066 | **701** |
| switch→wb/sys/trade/model/num/rf/open/walk | 91–135 | 0–66 | 1,002–1,428 | **512–987** each |

Non-boot blocked: 843ms (1x) → 11,222ms (4x) = 13.3x — the smoothness analysis's 21x superlinearity reproduces as a 50ms-threshold effect (work split into 10–45ms tasks at 1x crosses the longtask line at 4x) plus paint frames multiplying during the longer settle. Entry cost is **topic-size-INSENSITIVE** (medium 855ms task vs large 880ms) — document-size-bound, not content-bound.

### The topic-entry mega-task (central finding)

Every entry = ONE synchronous click task containing, in order: `setTopic` → `applyIdentity` → `dispatch(deeptopicchange)` → 10 pane `renderTopic`s → `afterTopicSwap` → `Router` → `switchTab`. Inside it (4x trace decomposition):

- **Style-recalc 346–504ms as 3–4 SEPARATE full-document passes** and **layout 282–357ms as 3–4 SEPARATE passes** — forced by interleaved reads-after-writes: `upd()` line 76592 `void stageHead.offsetWidth` (runs TWICE per entry — via `applyIdentity`→`__syncCompanion` and again via `switchTab`), `DeepCram._maybeRender` line 77168 `offsetParent` read on every `deeptopicchange`, `pinTop` line 77959 `pageYOffset`, `scrollTop()` line 80784. One recalc+layout (~200–250ms) is legitimate; **~450–650ms per entry is pure forced-reflow waste**.
- Script-call 105–225ms total, of which **all 10 pane `renderTopic`s sum to only 49–73ms** (1x: 8–10ms): wb 24, sys 14, num 9, walk 7, rf 6, trade 5, drill 5, open 3, model 2, visual 0.6.
- Parse-html 39–62ms (hidden-pane innerHTML fragment parsing), then separate paint tasks 75–129ms.

**Hypothesis verdict: CONFIRMED mechanically, INVERTED financially.** All 9 tab panes + hidden `deep-visual` DO re-render synchronously on every topic entry (per-pane wrappers fired n=1 each; every shadow root's innerHTML changed) — but that render script is ~6–9% of the entry task. The money is (a) repeated forced full-document style+layout inside the task, and (b) each pane's LAYOUT bill deferred to its first reveal — `.pane{display:none}` means hidden renders skip layout, so every pane SWITCH pays 105–521ms layout at 4x when its subtree first becomes visible (trade 501, drill 396, rf 332, open 256, wb 195, sys 189, model 182, num 157, walk 105). "Drill build" cost is NOT `DeepDrill.renderTopic` (5ms) — it is drill-pane reveal layout (396ms) plus its share of entry forced reflows. Whiteboard-blame inversion consistent: wb's renderTopic is the largest pane script (24ms) yet noise vs the ~650ms of forced style/layout around it.

### Ranked hot list (self time; 4x ms, 1x in parens)

1. `(program)` boot parse/compile/eval of the 11.6MB file — 4,875 (≈1,100): v8.compile 3,095 + script-eval 1,339 + parse-html 1,768, incl. one 5,006ms task.
2. Layout (forced + flush) — boot 3,974 (386); per entry 282–357 (26–42); per switch 105–521 (9–53).
3. `upd()` @76583 companion/stage-head sync, `void offsetWidth` — boot 582 (≈150); ~337/entry (runs 2x); rides every switchTab (69–379/switch).
4. UpdateLayoutTree (style recalc ×3–4 per entry task) — entries 346–504 (46–50); boot 433 (177).
5. `pinTop` @77959 router boot scroll-pin, 5 scheduled `pageYOffset` reads — boot 664 (≈165).
6. Paint — entries 240–355 (30); switches 169–331 (15–23); boot 261.
7. Pane `renderTopic` Σ (all 10) — 49–73/entry (8–10); boot first-renders Σ ≈400 (110), dominated by deep-numbers 197 (35) — 178 of it is `_fmtN` @75471 first-`toLocaleString` Intl warmup.
8. `_maybeRender` @77166 deep-cram `offsetParent` probe — ~55/entry (≈13).
9. `scrollTop()` @80784 — boot 172 (43), ~19/entry.
10. MajorGC 286 one-off (churn from full 10-pane rebuild per entry); topicnav 46-item menu rebuild ~6/entry; visual-kit bundle `query` ~45/entry-large.

Above-fold-critical at entry: identity header + walk pane's first viewport + sidebar (~200–250ms of one recalc+layout+first paint at 4x). Below-fold/invisible-yet-synchronous (deferrable): 9 hidden pane builds, topicnav menu, cram probe, all forced reflows, home teardown scroll work — together ~75% of the entry task.

### Top 3 chunking candidates (attribution's predictions at 4x)

1. **Batch the switch path — remove the 3–4 forced synchronous reflows per entry/switch.** `upd()`: restart the `headin` animation without `void offsetWidth` (rAF re-add or `getAnimations()` restart); `_maybeRender`: drop the `offsetParent` read (the IntersectionObserver path already handles reveal); `pinTop`/`scrollTop()`: write-only `scrollTo(0,0)` / cache `scrollY`. Invisible bookkeeping, zero UX change. **Predicted: −450 to −700ms/entry (40–50% of entry blocked), −1.0 to −1.4s boot, −50 to −150ms/switch.** *(NOT prototyped this track.)*
2. **Defer hidden-pane `renderTopic` to first reveal** (DeepCram's `_dirty` pattern minus its offsetParent bug). **Predicted: −80 to −130ms/entry** (script+fragment parse), **−~400ms boot** (10 panes render topic-1 into display:none shadow roots while the user is on #home; includes lazying the 178ms Intl warmup), minus ~7/9 of per-entry pane work for panes never visited, plus GC relief (286ms MajorGC observed). Marginal cost: +5–25ms on a pane's first reveal. ***(This is the candidate the prototype implemented.)***
3. **`content-visibility:auto` (+`contain-intrinsic-size`) on below-fold cards inside panes and the home grid** — the only lever on the LAYOUT term, the single biggest interactive cost (viewport shows ~20–40% of a pane's cards; home = 46 cards, ~7 visible; boot layout tasks 1,329+1,266+492ms). **Predicted: −150 to −350ms/switch (trade 501→~150), −100 to −200ms/entry, −0.5 to −1.3s boot.** Must re-run visual gates (containment × shadows/animations). *(NOT prototyped this track.)*

Not worth chunking: pane script (too small), topic-data restructuring (entry cost doesn't scale with topic bytes). The remaining boot floor — ~6.2s parse/compile/eval at 4x — is inherent to the 11.6MB single-file design; splitting it means lazy `<template>`-hydration of the topic bundle (strategic surgery, out of scope).

Attribution artifacts (read-only run, repo untouched): profiles + summaries in scratchpad `…\scratchpad\perf\rate1\` and `…\perf\rate4\` (`boot/entry-*/switch-*.cpuprofile`, `trace.json`, `summary.json`, `topics.json`, `scripts.json`); runners/analyzers `prof_runner.cjs`, `trace_runner.cjs`, `analyze_prof.cjs`, `analyze_trace.cjs`, `decompose_task.cjs`. Key source lines: `upd` 76583–76597, `_maybeRender` 77166–77174, `pinTop` 77955–77965, `scrollTop` 80784–80787, `setTopic` 6672–6692, `TopicPane.connectedCallback` 6702–6713, `switchTab` 76150–76165.

---

## 2. The prototype — mechanism and claimed numbers

**Mechanism (`TopicPaneQueue`, chunking candidate #2):** on topic entry, only the ACTIVE pane renders synchronously inside the input task; the 9 hidden panes are queued and drained **one pane per macrotask** (paint/input can interleave between slices), with a **flush-before-reveal** guarantee (`__tpFlush`) so a tab switch synchronously renders any still-queued pane before it becomes visible. Stated invariant: *"stale content is never on screen"*; stated threat model: a false "on screen" classification merely costs one sync render. Footprint: 7 files, +276/−22 in `perf-chunk` worktree (branch `perf/chunk-proto`); built HTML 11,660,994 B embeds the change (`TopicPaneQueue` ×6, `__tpFlush` ×4; base has 0).

**Claimed numbers (as framed going into cold verify):**
- Inherited the attribution's headline: every topic entry = ONE 855–1185ms synchronous task at 4x, with the 9 hidden-pane renders inside it — implying the deferral guts the entry mega-task.
- Attribution's own prediction for this candidate was the modest band: −80 to −130ms/entry script+parse, −~400ms boot, ~7/9 of per-entry pane work never paid for unvisited panes.
- Zero-UX-change on fast hardware; queue always drains so no pane is permanently stale.

---

## 3. COLD verdict (independent verifier, own instrument, never reused the tracks' tooling)

### VERDICT: **PARTIAL** — the 4x improvement is real where it matters but narrower than claimed; fast hardware is not regressed; one named, reproduced correctness regression.

**Provenance:** clean A/B confirmed — base `deepdive_content_pipeline_rehearsal.html` == git HEAD == the worktree's ancestor blob (`364951c4`); sole delta is the prototype. Own instrument: Playwright + CDP throttle, in-page buffered longtask observer, real trusted clicks (`#tnnext`, `.seg button[data-tab=drill]`), first-frame rAF probes, byte-level pane-content snapshots. Negative control reproduced (base@4x big single input task). Throttle **verified by calibration spin per cycle** (after catching a genuine mid-run throttle drop); cells interleaved B/P/B/P against ambient load, per-cycle load covariate recorded. Instrument + raw JSON in scratchpad: `perfverify.cjs`, `repro-ssgo.cjs`, `results/*.json`.

### Numbers (medians of throttle-valid cycles; 26 proto / 19 base)

| metric (ms) | base@4x | proto@4x | base@1x | proto@1x |
|---|---|---|---|---|
| entry click-task (walk active) | 227 | 232 | 0 | 0 |
| entry input→first-frame | 210 | 211 | 35 | **22** |
| entry, **drill pane active** | 261 | **145** | 0 | 0 |
| input→paint, drill active | 239 | **132** | 28 | **19** |
| drill reveal right after entry (flush cost) | 99 | 116 | — | — |
| drill reveal toFrame (1x) | — | — | 24 | 31 |
| all-panes-current (drain) | 251 | 378 | 40 | 75 |
| cycle total long-task (work conservation) | 356 | 339 | 0 | 0 |

Per-topic 4x entry (task/frame): heavy topics improve — microfrontend 359→236, signing 422→339, authz 209→98 (**−20..−53%**); light topics are a wash within noise (proto's task is a strict subset of base's; deltas ±35ms at n=2 with load covariate bouncing 2.9–8.1x). Drain slices at calm 4x are sub-50ms (exactly 1 long task ≥50ms across all drain windows, both rounds) — paint/input interleave as designed. 1x has essentially zero long tasks on either build (1 vs 2 across entire runs).

### Confirmed
1. **4x active-pane-first is real where the active pane is heavy:** input task −45% (261→145) and input→active-pane-paint −45% (239→132) with drill active; −20..−53% entries on heavy topics; active pane byte-current at first frame in all 45 hash-consistent cycles.
2. **No fast-hardware regression:** 1x long tasks ≈ nonexistent both builds; entry paint 35→22ms *better*; only +7ms (24→31, sub-frame) on immediate drill reveal.
3. **Correctness on normal paths:** 9/9 data panes content-verified re-rendered and current after settling on every one of 45 cycles (3+ topics, both builds); flush-before-reveal always current; `node test/topic_contract.cjs` PASS (46 topics, 100% depth) and `node test/click_drift.cjs` PASS (118 assertions, negative controls re-armed) on the prototype build.

### Refuted / inflated
- **"Every topic entry was ONE 855–1185ms task at 4x": not reproducible at calm 4x** — clean base entries are 96–422ms; 650–925ms appeared only under heavy ambient load (the attribution trace was load-inflated). The deferral moves **~100–130ms** of hidden-pane work off the input task, not ~800ms. (Note: that measured saving lands inside attribution's own −80..−130ms prediction for this candidate — the headline was inflated, the decomposition was right.)
- **Total blocked time is redistributed, not reduced** (cycle blocked 228 vs 239; totals conserved), and all-panes-current lands ~+130ms later (251→378). Acceptable by design — the queue always drains — but it is a cost, not a saving.

### THE REGRESSION (named, reproduced end-to-end through the real UI)
**Stale content on the pane the user is looking at.** `_tpOnScreen()` (worktree `src/scripts/app/topic-protocol.js`, the `raw = location.hash` check) uses the **route hash as the visibility oracle** — but `session-progress.js:380` reveals a pane via bare `switchTab(rec.tab)` (pre-existing code, benign on base) without touching the hash, and `router.js:120` `setTopic()` re-derives the view from the **old hash**, so the desync never self-heals on topic change. Repro (`repro-ssgo.cjs`, real clicks): session panel → "Back to the drill →" (**the default recommendation on a fresh profile**, `rec.tab:'drill'`) → hash still `#walk` while drill is visible → any topic change → the visible drill pane is classified off-screen and deferred: **byte-identical OLD-topic content on screen at first frame — stale for 390ms @4x / an 84ms flash @1x, on every topic change until a seg tab is clicked**. Base, identical sequence: current at first frame. This violates the prototype's own stated invariant and its comment's threat model (a false OFF-screen IS possible and DOES show stale content). Fix direction (fixer's call): classify from `.pane.on` — the class `switchTab` itself owns — instead of the hash, and/or route `#ssgo` through `Router.navigate`.

---

## 4. Recommendation to the operator: **ITERATE**

*(Prototype track — merging is a separate decision; this is the track's advice on what that decision should be.)*

- **Not SHIP:** it violates its own stated correctness invariant on a reproduced, default-recommendation user path (stale visible content on every topic change after the session panel's "Back to the drill"). Gates pass, but the gates don't cover this path — do not land as-is.
- **Not PARK:** the mechanism is sound and pays off exactly where RC-D hurts — heavy pane active, heavy topics, mid-range CPU: **−45% input→paint** and **−20..−53% heavy-topic entries at 4x**, with 1x strictly safe and drain slices paint-interleavable. The fix is one named hole with a named direction, not a redesign.
- **ITERATE, concretely:**
  1. Close the `_tpOnScreen` hash-oracle hole (classify from `.pane.on`, and/or route `#ssgo` through `Router.navigate`); re-run `repro-ssgo.cjs` as the regression's negative-control-armed guard, plus the A/B spot-check and both repo gates.
  2. **Re-state the win honestly before any merge pitch:** ~100–130ms off the 4x input task + active-pane-first paint — not "855–1185ms task eliminated"; total work conserved; all-panes-current ~+130ms later by design.
  3. Then it's a legitimate merge candidate (operator decision, with the usual serial verified-merge discipline).
- **Beyond this prototype:** candidates **#1 (forced-reflow batching, predicted −450..−700ms/entry — the biggest single win, untouched)** and **#3 (`content-visibility:auto` on the layout term)** remain unharvested and are both predicted larger than #2's measured yield; the ~6.2s @4x boot parse floor is a strategic single-file question, not a chunking one. If the operator wants more mid-range headroom, #1 is the next track.

---

*Artifacts: attribution scratchpad `…\scratchpad\perf\rate{1,4}\` + runners; verifier scratchpad `perfverify.cjs`, `repro-ssgo.cjs`, `results/*.json`; prototype worktree `D:/claude-workspace/_worktrees/deepdive-rehearsal/perf-chunk` (uncommitted). Scratchpad base: `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad`. Note: scratchpad is session-ephemeral — if this track is picked up later, re-derive instruments from this report's method sections or copy the artifacts into the repo first.*
