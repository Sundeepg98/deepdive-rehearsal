# Deep-Dive Content-Pipeline Rehearsal -- Tiered Reconsideration of Dropped / Deferred Features

**Date:** 2026-06-29
**Master at synthesis time:** `4fabb31` (foundation + companion-fix + visual best-of-both + SPA core [router / view-manager / view-transitions / tour / search / scroll-progress / copy-code / focus / session-timer] + gh-pages CI + zoom-diagrams + touch-swipe).
**Lens applied (operator's, strict):** offline-unsafety / non-portability describes an *implementation*, not a feature's *value*. A useful feature is RE-IMPLEMENTED to comply (Tier-1: offline + permission-free + single self-contained file), never dropped for a *fixable* detail. Only REDUNDANT / SUPERSEDED / pure GIMMICK / NON-FEATURE are clean drops. Tier-2 fixable-env (hardcoded `/mnt` paths -> derive from `__file__`; no-Chrome verification) may NEVER be a reason to drop a useful feature.
**Inputs:** four per-chunk re-classifications -- (1) 22 offline-unsafe modules; (2) ~26 gimmick/decorative modules; (3) redundant/superseded + the non-portable Playwright e2e layer + the 5 DEFERRED; (4) 10 tier-0 non-features -- each verified on disk in the ABI/PAT/VE worktrees under `D:/claude-workspace/_worktrees/deepdive-rehearsal`, cross-checked against `_audit/2026-06-29-feature-matrix.md`, `_audit/2026-06-29-branch-reaudit.md`, `_audit/2026-06-29-branch-audit.md`.

> **This version supersedes the earlier 3-chunk / 58-item draft of this same file.** That draft scoped out the modular browser e2e layer as "DEFERRED, not rescued" and counted only 2 rescues. Chunk 3 explicitly re-scores the e2e/Playwright layer and the 5 deferred items under the lens, lifting the rescue count to **12 across 77 items**. The earlier two rescues (font-size, pomodoro) and the pomodoro phantom-storage correction are retained.

---

## 1. Headline -- did we throw away useful things?

**Almost nothing useful was lost to a merely-fixable detail -- the salvage discipline held -- but the complete re-score surfaces one strategic miss and a cluster of cheap wins.** Of **77** previously-dropped/deferred items re-scored under the lens:

- **12 are RESCUE_WORTHY** -- genuinely useful AND offline-safe-re-implementable, dropped/deferred over a *fixable* implementation detail.
- **47 are genuine CLEAN_DROPs** -- redundant / superseded by master, forbidden-API-inherent non-features, or generated bloat / dead CSS / stale docs.
- **18 are OPERATOR_TASTE** -- offline-safe but decorative or marginal; keep-or-drop loses nothing of substance (pure taste; default drop).

**The single most important finding is a clean structural one: all 12 RESCUE_WORTHY items are exactly the 12 TIER-2 (fixable-env) items, and vice versa.** The operator's lens maps *precisely* onto Tier-2: every feature blocked only by a fixable detail is worth rescuing, and nothing useful is trapped in Tier-1 (inherent) or mis-filed in Tier-3/0. That is the proof the bucketing is sound.

**The one strategic miss:** the **real-browser Playwright e2e / verification layer** (DEFERRED #74) -- the documented **#1 project risk**. Today every render/browser check auto-SKIPs (no Chrome), so the SPA core + visual best-of-both are NOT machine-verified, and the project's named regression classes (scrollable whitespace, mockbar visibility, shadow-DOM padding, content-visibility) can ONLY be caught in a real browser -- static `visual_regression.py` just greps CSS text. It is **test/CI tooling, not in the shipped single file**, so Tier-1 does not apply and Playwright is a dev-only dep; its blockers (hardcoded `/mnt` paths, needs-Chrome) are *exactly* the Tier-2 items the lens forbids dropping a useful feature over. Effort **L**, but it closes the top risk.

**The cheap wins:** four S-effort singles dropped by SPA-brief scope, not by any constraint -- `font-size` (A-/A+ a11y control), `scroll-to-top`, `pomodoro-timer`, `page-visibility` -- plus a ~4-line test guard (`MOBILE SPACING`) that re-asserts a gutter master already ships.

**The standout false-positive:** `pomodoro-timer.js` was dropped on a **phantom** `sessionStorage` tag that exists only in its own stale doc-comment -- the real code uses **no storage at all**.

---

## 2. Totals

### By verdict

| Verdict | Count | Meaning |
|---|---:|---|
| **RESCUE_WORTHY** | **12** | Useful + offline-safe-re-implementable; dropped/deferred over a fixable detail. **The actionable output.** |
| **OPERATOR_TASTE** | 18 | Offline-safe but decorative/marginal; keep-or-drop loses nothing -- pure taste (default drop). |
| **CLEAN_DROP** | 47 | Redundant / superseded by master, forbidden-API-inherent non-feature, or generated bloat / dead CSS / stale docs. |
| **Total** | **77** | |

### By tier

| Tier | Count | Of which RESCUE_WORTHY | What it means here |
|---|---:|---:|---|
| **TIER 0 -- NON-FEATURE** | 13 | 0 | Generated output / orphan dead CSS / stale docs / dead capability. Never-commit. |
| **TIER 1 -- INHERENT** | 3 | 0 | Capability *inherently* needs a forbidden API (no offline substitute). **No useful feature trapped here.** |
| **TIER 2 -- FIXABLE** | 12 | **12** | Offline-unsafety / non-portability is an *incidental, fixable* detail. **Every Tier-2 item is rescue-worthy.** |
| **TIER 3 -- GIMMICK** | 23 | 0 | Offline-safe but decorative/low-value. 17 operator-taste, 6 clean drops (context makes them wrong). |
| **TIER 3 -- REDUNDANT/SUPERSEDED** | 26 | 0 | Master already does it (better). 25 clean drops, 1 operator-taste (night-schedule). |
| **Total** | **77** | **12** | |

> **Tier-2 == rescue-worthy, exactly.** All 12 fixable items are rescues; all 12 rescues are fixable. No useful feature is stranded in Tier-1 or Tier-0/3.

### By usefulness (the lens's own axis)

| Useful? | Count |
|---|---:|
| USEFUL (genuine feature value) | 12 |
| GIMMICK (decorative novelty) | 25 |
| REDUNDANT (master supersedes) | 25 |
| NOT_A_FEATURE (plumbing / telemetry / bloat / dead code / generated) | 15 |
| **Total** | **77** |

### Verdict x Tier cross-tab (reconciliation)

| | T0 non-feature | T1 inherent | T2 fixable | T3 gimmick | T3 redundant | Total |
|---|---:|---:|---:|---:|---:|---:|
| RESCUE_WORTHY | 0 | 0 | **12** | 0 | 0 | 12 |
| OPERATOR_TASTE | 0 | 0 | 0 | 17 | 1 | 18 |
| CLEAN_DROP | 13 | 3 | 0 | 6 | 25 | 47 |
| **Total** | 13 | 3 | 12 | 23 | 26 | **77** |

---

## 3. RESCUE SHORTLIST (the actionable output)

The 12 RESCUE_WORTHY items, ranked by value/effort. Cheap standalone wins first; the strategic e2e layer (highest absolute value, effort L) and its enabling components last. This is what the operator picks from.

### Tier A -- cheap standalone wins (do-now, effort S)

**#1 -- `visual_regression` MOBILE SPACING guard (#71)  *(value: high - effort: S)*** -- VE
Trivial ~4-line re-add to master's `visual_regression.py`: `suite('MOBILE SPACING')` with `check(.sidebar .seg button.on padding-right contains '28')` + `check(.sidebar .seg button.on::after right contains '12')`. Master **ships** the 28px dot-gutter but never asserts it -- this restores an un-covered guard (a missing assertion, not a regression). Test tooling, so Tier-1 N/A; just align the selector/value to master's actual mockbar. Highest value/effort ratio in the list.

**#2 -- `font-size.js` : A-/A+ reading-size control  *(value: high - effort: S)*** -- ABI
A genuine a11y control for a text-heavy design-interview trainer (5 levels, 85-116%, reduced-motion-aware); broad benefit, **zero overlap** with any master feature. Dropped only over an *incidental* `localStorage` of the chosen level (3 sites). **Re-impl:** delete all `localStorage` calls; hold the level index (default 100%) in a module-scoped var; A-/A+ mutate it and set `.stage.style.fontSize` live via the existing `apply()` mechanism, keeping the reduced-motion-aware transition. **In-memory only** -- do NOT pollute the CPR1 copy/paste progress-code with a cosmetic pref; native browser zoom remains the cross-reload fallback. Wire as a build-include + one sidebar control.

**#3 -- `scroll-to-top.js` (#72)  *(value: medium-high - effort: S)*** -- ABI
Floating back-to-top button after >400px pane scroll (smooth, reduced-motion-aware, re-binds on routechange). Already Tier-1 clean (DOM + `pane.scrollTo`, no forbidden API) -- dropped purely by SPA-brief scope. The "redundant with view-switch scroll reset" objection is weak: that's *changing views* vs *scrolling back up within the SAME long pane* (panes scroll internally; body/html are `overflow:hidden`). **Re-impl:** take nearly as-is; add to `app.js` build-includes. Genuine minor UX win for long walkthrough / model-answers panes.

**#4 -- `pomodoro-timer.js` : 25/5 focus timer  *(value: medium-high - effort: S)*** -- ABI
A study-rhythm tool (SVG ring countdown, play/pause/reset) fitting a trainer's "drill in focused blocks" workflow. **FALSE-POSITIVE drop:** the "sessionStorage" reason is a **phantom** -- verified on disk, the code uses **no storage at all** (only a stale doc-comment claims it); its sole non-self-contained dependency is `window.showToast` (offline-safe DOM, not a forbidden API). **Re-impl:** strip the stale comment; replace the one `showToast` phase-change call with a self-contained cue (the ring already flips teal->amber) or a tiny optional WebAudio beep; keep the in-memory countdown. **Design note:** distinct from master's `session-timer` (a mock-exam countdown) -- to avoid two timer widgets, **consider folding a "pomodoro mode" INTO `session-timer`**.

**#5 -- `page-visibility.js` (#73)  *(value: medium - effort: S)*** -- ABI
Pauses CSS animations/timers when the tab is hidden (injected `animation-play-state:paused` + body class). Already Tier-1 clean -- the Page Visibility API (`visibilitychange` / `document.hidden`) is NOT on the forbidden list. Marginal alone (browsers already throttle background-tab animation) but its value RISES if the 3D card-spotlight (#70) lands -- that adds a continuous 4s `borderGlow` on every card, exactly what this pauses when hidden. **Re-impl:** take as-is into `app.js`; rescue as a pair with #70.

### Tier B -- strategic: the real-browser e2e / verification layer (#74)

**#6 -- Modular browser e2e layer -- OVERALL CONCEPT  *(value: highest absolute - effort: L)*** -- PAT/ABI
THE one genuinely-useful item dropped over Tier-2 details. Closes the documented **#1 risk** (no browser verification anywhere; render/Playwright auto-skip; named regression classes are browser-only -- static greps cannot catch a real layout regression). Test/CI tooling, NOT in the single-file deliverable, so Tier-1 does NOT apply; Playwright is a dev-only dep. **Scope:** (1) de-hardcode the 7 `/mnt` sites in `runner.py` + `HTML_PATH` in `conftest.py:21` / `ci.py:23` / `main.py:31` -> derive from `Path(__file__)` as a file URI; (2) restore the `router_navigate` fixture/alias in conftest (modules import it; conftest only defines `navigate_to`); (3) resolve the `test_spa.py` basename collision (drop top-level dups, keep `test/modules/`); (4) add Playwright dev-dep + graceful auto-skip when Chrome absent so the LOCAL gate stays green; (5) wire as a **CI-only gated** e2e job. Delivered via the components below.

**#7 -- `conftest.py` (pytest-asyncio fixtures)  *(effort: S)*** -- ABI/PAT
De-hardcode `HTML_PATH` (L21) from `Path(__file__)`; add the missing `router_navigate` helper/fixture (alias the existing `navigate_to`) that the modules import -> **fixes the 7 pytest collection errors**. Fixtures (browser/page/mobile_page/app/app_mobile) are otherwise clean and reusable as-is.

**#8 -- `pytest.ini` (asyncio auto-mode + markers)  *(effort: S)*** -- PAT
Essentially portable as-is (no hardcoded paths; `asyncio_mode=auto`, sane markers, `--ignore`s the legacy standalone scripts). Take with the pytest stack; only update the `--ignore` list once the standalone `e2e_*` scripts are dropped.

**#9 -- `.github/workflows/ci.yml` -- e2e job ONLY  *(effort: S)*** -- PAT/ABI
Extract ONLY the Playwright e2e job (setup-python -> `pip install playwright` -> `playwright install chromium` -> run suite -> upload reports) and add it to master's existing CI as a **gated** stage. **DROP the build/deploy job** -- it deploys on push to main (the deploy-on-push risk) and is superseded by master's gated `deploy-pages.yml`. Do not couple e2e to deploy.

**#10 -- `test/modules/*` (the maintainable PRIMARY layer)  *(effort: M)*** -- ABI/PAT
Keep the genuine e2e modules (`shadow_dom`, `router_deep`, `view_transitions`, `accessibility`, `keyboard_shortcuts`, `layout`, `performance`, `tour_guide`, `components`) -- `test_shadow_dom.py` verified as well-structured real-browser assertions. **DROP** the per-version smoke churn (`test_v305/306/307/308_features`, `test_gap_features/genuine_gaps/redundancy/unique_features`). Resolve the `test_spa.py` basename collision (package `__init__` or unique names). Runs portably once conftest is de-hardcoded.

**#11 -- e2e driver: adopt `main.py`, retire `runner.py` + `ci.py`  *(effort: M)*** -- ABI/PAT
`main.py` (module-discovery + `asyncio.gather`, per-test context isolation) is the cleanest single driver -- de-hardcode its `HTML_PATH` (L31; `MODULES_DIR`/`REPORT_DIR` already use `__file__`). **Keep ONE driver:** `runner.py`, `main.py` and `ci.py` are three overlapping drivers over the same assertions. Fold `ci.py`'s parallel-orchestrator role into `ci.yml`; retire `runner.py` in favour of `main.py`'s module-discovery.

**#12 -- `runner.py` (modular async Playwright runner)  *(effort: M)*** -- ABI/PAT
De-hardcode the 7 `/mnt/agents` sites (L42,43,257,262,265,270,274): `ROOT=Path(__file__).resolve().parents[1]`; `HTML_PATH=(ROOT/'deepdive_content_pipeline_rehearsal.html').as_uri()`; `REPORT_DIR=ROOT/'test/reports'`. The runner design (`--group/--marker/--test/--list`, per-group page isolation, JSON report) is sound -- but per #11, prefer `main.py`'s discovery and **retire this** if adopting the pytest stack. Listed for completeness; the consolidation makes it the lowest-priority of the 12.

> **Practical path:** Tier A (#1-#5) is ~half a day of S-effort wins on a single follow-up branch off master (build + gate + a manual light/dark browser pass). Tier B (#6) is one focused L-effort branch delivering the gated e2e job via #7-#11 (and dropping #12 + the redundant duplicate scripts in section 7). After both land, the four source branches are clean to delete.

---

## 4. TIER 1 -- INHERENT (forbidden API with no offline substitute)

**Finding: nothing useful is trapped behind a truly-inherent constraint.** All 3 Tier-1 items are clean drops -- the forbidden API *is* the feature, with no offline substitute that preserves the capability. The lens has nothing to rescue here; the useful-but-implementation-violating items it exists to rescue are **Tier 2, not Tier 1**, because their forbidden-API use is *incidental* (fixable), not inherent.

| Module | Useful? | Verdict | Why inherent / why drop |
|---|---|---|---|
| `permission-request.js` | NOT_A_FEATURE | CLEAN_DROP | Pure plumbing; its entire purpose is `navigator.permissions.query` + `Notification` (+ `localStorage` tracking) -- triple-forbidden, no user-facing capability. Master's copy-code needs no permission (`clipboard.writeText` after a gesture). |
| `beacon-unload.js` | NOT_A_FEATURE | CLEAN_DROP | Server analytics via `navigator.sendBeacon('/analytics')` -- inherently needs a network endpoint; anti-rubric for a "works-on-a-plane" tool. Not a user feature. |
| `haptic-feedback.js` | GIMMICK | CLEAN_DROP | Real haptics inherently require `navigator.vibrate` -- no offline substitute (CSS `:active` is visual, not tactile, and master buttons already have press states). Low-value mobile nicety regardless. |

---

## 5. TIER 2 -- FIXABLE (the rescue tier)

**Every Tier-2 item is RESCUE_WORTHY (12/12), and every rescue is Tier-2.** These features have real value blocked only by a *fixable* implementation choice: an incidental `localStorage` (`font-size`), a phantom storage tag (`pomodoro`), pure SPA-brief scope (`scroll-to-top`, `page-visibility`, `MOBILE SPACING`), or fixable-env non-portability (the whole e2e layer: hardcoded `/mnt` paths + needs-Chrome). Full re-impl paths are in the RESCUE SHORTLIST (section 3).

| Item | Useful? | Verdict | Fixable detail -> compliant re-impl | Effort |
|---|---|---|---|---|
| `font-size.js` | USEFUL | **RESCUE_WORTHY** | Incidental localStorage -> module var + live `.stage.style.fontSize` via `apply()`; in-memory only | S |
| `pomodoro-timer.js` | USEFUL | **RESCUE_WORTHY** | "sessionStorage" is a phantom comment; code is storage-free. Swap one `showToast` for ring/beep cue; consider folding into `session-timer` | S |
| `scroll-to-top.js` (#72) | USEFUL | **RESCUE_WORTHY** | Already Tier-1 clean; take near as-is into `app.js`; distinct from view-switch reset (within-pane scroll-up) | S |
| `page-visibility.js` (#73) | USEFUL | **RESCUE_WORTHY** | Page Visibility API not forbidden; take as-is; pairs with 3D card #70 | S |
| `visual_regression` MOBILE SPACING (#71) | USEFUL | **RESCUE_WORTHY** | ~4-line `suite('MOBILE SPACING')`: assert `.seg button.on` padding-right `28` + `::after` right `12` | S |
| Modular browser e2e layer -- OVERALL (#74) | USEFUL | **RESCUE_WORTHY** | De-hardcode `/mnt` paths; restore `router_navigate`; fix basename collision; add Playwright + auto-skip; gated CI-only job | L |
| `conftest.py` | USEFUL | **RESCUE_WORTHY** | De-hardcode `HTML_PATH` (L21); add `router_navigate` alias -> fixes 7 collection errors | S |
| `pytest.ini` | USEFUL | **RESCUE_WORTHY** | Portable as-is; update `--ignore` list once standalone scripts dropped | S |
| `ci.yml` (e2e job only) | USEFUL | **RESCUE_WORTHY** | Extract ONLY the Playwright job; drop build/deploy-on-push (superseded by gated `deploy-pages.yml`) | S |
| `test/modules/*` | USEFUL | **RESCUE_WORTHY** | Keep real e2e modules; drop per-version smoke churn; resolve `test_spa.py` basename collision | M |
| `ci.py` + `main.py` | USEFUL | **RESCUE_WORTHY** | Adopt `main.py` as the ONE driver (de-hardcode `HTML_PATH` L31); fold `ci.py` into `ci.yml` | M |
| `runner.py` | USEFUL | **RESCUE_WORTHY** | De-hardcode 7 `/mnt` sites from `__file__`; retire in favour of `main.py` (keep one driver) | M |

---

## 6. TIER 3 -- GIMMICK (offline-safe but decorative -> OPERATOR TASTE)

Every item here is **already offline-safe** -- there is no Tier-1 violation to fix. The blocker is never offline-safety; it is that the feature itself is decorative, marginal, or context-wrong for an *active* rehearsal trainer. So the lens rescues nothing: "keeping" any is just include + reduced-motion/pointer gating (effort S); "dropping" loses nothing of substance. **17 are pure operator-taste; 6 are clean drops** where context makes the gimmick actively wrong (dead consumer, false premise, dev-only tool, or no possible caller).

### 6a. Operator-taste calls (17) -- keep only if the flourish is wanted

| Module / feature | Origin | Effort | Trade-off (lean) |
|---|---|---|---|
| 3D card-tilt + spotlight + conic border-glow (#70) | VE/PAT | M | Offline-safe + Tier-1-reimplementable (NOT a portability drop). Perf-guarded reimpl converts the only objection into a no-op: wrap the whole `.card` 3D block in `@media (hover:hover) and (prefers-reduced-motion:no-preference)`; gate the continuous `borderGlow` AND `will-change:transform` to `:hover` only. **Operator is already rescuing this** (salvage/card-3d). |
| `mouse-glow.js` (cursor spotlight) | ABI | S | Ambient eye-candy; permanent rAF + full-viewport blended layer for flourish only. Lean drop. |
| `magnetic-button.js` (buttons pull to cursor) | ABI | S | Usability anti-pattern (buttons slide from the pointer) + per-element mousemove. Refactor to one delegated handler + hover gate if kept. Lean drop. |
| `audio-feedback.js` (Web Audio click sounds) | ABI | S | Click sounds unwanted in quiet/shared interview-prep contexts; no mute UI. Add in-memory opt-in/mute first if kept. Lean drop. |
| `completion-celebration.js` (confetti at 95% scroll) | ABI | S | Hollow reward -- fires on passive scroll, not mastery. Earns its place only if retargeted to a real completion signal (drill graded / whiteboard recalled / mock scored). |
| `easter-egg.js` (Konami -> rainbow) | ABI | S | Harmless hidden delight, zero rehearsal value; degrades without showToast. Lean drop unless an egg is wanted. |
| `double-tap.js` (double-tap -> heart-burst) | ABI | S | Gesture for the dropped bookmark-system; overlaps zoom-diagrams' double-tap-reset. Retarget or drop. |
| `pointer-events.js` (card scale-on-press) | ABI | S | Binds once at load to existing `.card`s (mostly inert); a CSS `.card:active{transform:scale(.98)}` does it. Add the CSS rule instead. |
| `reading-time.js` ("X min read" badge) | ABI | S | Frames the tool as *passive reading* -- wrong mental model for an *active* trainer. Lean drop. |
| `virtual-keyboard.js` (visualViewport offset) | ABI | S | Legit mobile kernel, but only sets unused vars; consuming CSS for the lone code-paste textarea bumps to M. Lean drop. |
| `selection-api.js` (selection toolbar) | ABI | S | As-built only offers Copy (dup of Ctrl/Cmd+C). The useful variant (select -> push into Cmd+K search) is net-new (M). Lean drop the dup. |
| `share-url.js` (copy deep-link) | ABI | S | On file:// copies a machine-local path nobody can open; only useful on the hosted gh-pages copy. Lean drop for offline-first. |
| `ripple` (initRipple) | PAT/ABI | S | Decorative alternative press style; master already has `:active` press feedback. Lift `initRipple` only if wanted. |
| `toast` (initToast / showToast) | PAT/ABI | S | A toast primitive is reasonable but adopting it is a design-direction change, not a fix; master deliberately uses inline feedback. |
| `nav-sparkle` (cursor sparkle on nav hover) | PAT/ABI | S | Desktop-cursor-only flourish; visual noise. Gate on hover+reduced-motion if kept. Lean drop. |
| `animation-speed.js` (slow/normal/fast) | ABI | S | reduced-motion already covers the a11y need; the original `calc()` rule is buggy (no `--_orig-duration` set). Settings-bloat. |
| `typing-intro.js` (one-time typewriter heading) | ABI | S | Decorative; briefly delays the heading content. Recommend drop. |

> Two faint "kernels of value" are net-new enhancements, **not** lost salvage: (a) `selection-api`'s hinted select->Cmd+K-search bridge, and (b) retargeting `completion-celebration` to a genuine completion signal. Build them against the existing search-overlay / progress system if wanted -- they are not preserved by rescuing these modules as-built.

### 6b. Clean drops within Tier-3-gimmick (6) -- context makes the gimmick wrong

| Module | Origin | Why clean drop (not taste) |
|---|---|---|
| `notification-system.js` (fake bell + canned tips) | ABI | A fake inbox of hardcoded marketing tips with no real event source in an offline single file; real tips live in keyboard-overlay/tour. |
| `perf-overlay.js` (FPS/memory HUD) | ABI | Dev diagnostic relying on Chrome-only `performance.memory`; not a user-facing trainer feature. |
| `offline-indicator.js` ("you are offline" banner) | ABI | The trainer is offline-FIRST; nothing breaks offline, so the premise is false and needlessly alarming. Counterproductive. |
| `battery-indicator.js` (battery badge) | ABI | Device-stat, zero rehearsal value; OS already shows battery; `getBattery` forbidden, no offline substitute. |
| `network-indicator.js` (4G/3G/offline badge) | ABI | Self-contradictory in an offline tool; `navigator.connection` forbidden, no offline data source. |
| `storage-estimate.js` (used/quota readout) | ABI | App stores nothing by design -> reads ~0/meaningless; `storage.estimate` forbidden. Device-stat gimmick. |

---

## 7. TIER 3 -- REDUNDANT / SUPERSEDED (clean drops)

Master's existing architecture already delivers the value -- usually *better* and already offline-safe. These are the lens working correctly: the useful intent survives on master; only a duplicate implementation is dropped. (25 clean drops here; `night-schedule` is also Tier-3-redundant but its *decision* is taste, so it appears in 6a -- no value lost either way.)

| Module / feature | Origin | Superseded by (on master) |
|---|---|---|
| `state-persistence.js` (autosave view/scroll/theme) | ABI | CPR1 copy/paste progress-code (the meaningful progress) + the router (in-session view state). Only the fresh-reload restore is storage-bound + low value. |
| `session-logger.js` ("recently viewed" trail) | ABI | The always-visible 9-tab rail (all modules one click away) + session-timer for duration. |
| `bookmark-system.js` (star/unstar modules) | ABI | The right-granularity form -- per-probe "flag to revisit" in the drill, surfaced in the session summary. |
| `badge-counter.js` (bookmark count badge) | ABI | Ornament for bookmark-system, itself redundant; no standalone value. |
| `welcome-banner.js` (first-visit tips banner) | ABI | On-demand tour-guide ('g') + keyboard-overlay; the banner even advertises dropped features. |
| `cache-modules.js` (Cache-API "offline reading") | ABI | The app is already ONE self-contained offline file -- solves a non-problem (and `caches.open` is forbidden). |
| `web-share.js` (`navigator.share`) | ABI | CPR1 code-copy IS the portable export/share; nothing meaningful to share from file://. |
| `save-data.js` (data-saver -> reduce animations) | ABI | `prefers-reduced-motion` guards already deliver "reduce animations" offline-safe; the `connection.saveData` trigger is meaningless offline. |
| Dark-mode toggle persistence (`initDarkMode`) | PAT | boot.js `prefers-color-scheme` + theme-color meta + the themetog toggle ("live theme switching" PRESENT, matrix #61). |
| Tour-guide dismissal persistence | PAT/ABI | Master re-implemented the tour offline-safe: in-memory "dismissed" flag + on-demand start ('g'), so cross-reload dismissal-memory is moot. **A model of the lens already applied.** |
| `edge-swipe.js` (edge-swipe history nav) | ABI | Duplicates the OS edge-back gesture (and risks fighting it); master ships touch-swipe for view nav. Conflict-prone. |
| `sticky-footer.js` (persistent shortcut bar) | ABI | keyboard-overlay (on-demand '?' panel) + the tour; a permanent bar is clutter duplicating discoverable help. |
| `undo-toast.js` (undo after destructive action) | ABI | Master's "Clear session" uses a two-tap arm/confirm guard -- prevention, stronger than post-hoc undo. Safety need already met. |
| `resize-observer.js` (size classes on `.app`) | ABI | Container queries (@container 500px/380px) + media queries; nothing consumes the JS size classes. |
| `scroll-direction.js` (scrolling-up/down body classes) | ABI | Working enabler with **no consumer** -- master has no hide-on-scroll header. Dead in context. |
| `sliding-indicator` (initSlidingIndicator) | PAT/ABI | Master's active-nav treatment (inset accent bar + `::before`, railin, dotActivePulse, EWC lit desktop active-nav). |
| `route-flash` (initRouteFlash) | PAT/ABI | Native View Transitions (`view-transitions.js`) -- the real, smoother view-change animation. |
| `progress-tracker` (initProgressTracker) | PAT | Counts tabs *visited*, not work done -- misleading; master's real session-progress (drill/whiteboard/mock + CPR1) + scroll-progress + session-timer. |
| `progress-ring.js` (SVG 9-module completion ring) | ABI | scroll-progress (top bar) + session-timer + the lit rail; its host `#_progress-tracker` (dropped PAT bar) doesn't exist on master, so `create()` returns early anyway. Gamification that resets each reload. |
| `media-query-listener.js` (body `_prefers-*` classes from matchMedia) | ABI | Master handles dark/reduced-motion/contrast declaratively via the full CSS `@media` a11y set; nothing consumes the JS classes. |
| `text-fragment.js` (`#:~:text=` parse + highlight) | ABI | Redundant AND conflicting: the HashRouter owns `#` (collides with `#:~:text=`); Cmd/Ctrl+K search-overlay covers in-app find; URL-shareable text links are meaningless for file://. |
| `lint.py` (build/JS/CSS lint helper) | VE/ABI/PAT | `check_all.py` (syntax_check / css_syntax / build_integrity / file_integrity) + `visual_regression` already cover build+JS+CSS; lint.py's only extra (presence-grep) is covered. Smells (emoji fails ascii_guard, hardcoded `/tmp`, false-flags the transform-only mockbar) are Tier-2 but fixing them wouldn't remove the redundancy. |
| Superseded keyframes/CSS variants (pulseGlow comet, activePulse dot, navItemIn, `.toast`/`.ov`/`.ov-c`, loading-skeleton `_sk`/viewEnter/viewLeave/cardEnter/fadeInUp, dup single-name shimmer, ABI simpler card borderGlow) | VE/ABI/PAT | Verified on master: pulseGlow absent (`.rail .fill::after` is a static accent cap); shimmer split into loadShimmer+badgeShimmer (the broken-cascade fix); dotActivePulse+railin supersede activePulse/navItemIn; `.toast`/`.ov`/`.ov-c` = 0 occurrences; loading-skeleton + JS-VT keyframes superseded by native View Transitions + panein/cardStagger; ABI borderGlow-only card is the lesser variant of the deferred VE 3D effect (#70). |
| Top-level duplicate-basename pytest scripts (`test_spa/_router/_views`, `test_accessibility/components/layout/performance` at `test/` root) | ABI/PAT | Collide by basename with the `test/modules/` versions and ARE the duplicates (the collision that breaks pytest collection). Keep `test/modules/`; drop these. |
| Standalone Playwright e2e scripts (`e2e_comprehensive` / `full_scroll` / `full_test` / `production` / `scroll`) | VE/ABI/PAT | Five overlapping monolithic scripts superseded by the modular suite; `pytest.ini` already `--ignore`s them. Fold any unique assertion into `test/modules/`, then drop. |

---

## 8. TIER 0 -- NON-FEATURE (confirmed never-commit, 13)

All 13 are generated output, orphan dead CSS, stale/superseded docs, or dead capability -- none is a useful feature mis-bucketed (verified on disk). Master already recognizes the bloat via BOTH exclusion (0 carried) AND `.gitignore` (`test/reports/`, `deploy_temp/`, `test/scan_report.json`, `e2e_report_*.json`). Source of truth is code + `ROOT_CAUSE_ANALYSIS.md` + `_audit/`. Nothing re-implementable lives here.

| Item | Origin | Why never-commit |
|---|---|---|
| Generated test-report JSON (`test/reports/*.json`) | VE(24)/ABI(199)/PAT(143) | Playwright/CI output, timestamp-named; 62-89% of each branch diff; regenerated by running tests. Gitignored on master. |
| Committed PNG screenshots | VE(7)/ABI(8)/PAT(8) | Multi-MB binary regression captures; would bake into history if merged. Gitignored. |
| `deploy_temp/index.html` | ABI/PAT | Verified md5 byte-identical to the shipped `deepdive_content_pipeline_rehearsal.html` -- a stray deploy-scratch copy. Gitignored. |
| `scan_report.json` | ABI/PAT | Generated per-selector CSS-scan dump (751 lines); regenerable, not authored. Gitignored. |
| Dead `.toast` CSS family (`.toast/.show/.ok/.warn/.err`) | VE (styles.css L522-526) | Zero usages; the would-be driver `dynamic-features.js` isn't even on VE; absent from master. The toast FEATURE-value call lives in 6a (master chose no toast layer). |
| Dead `.ov`/`.ov-c` glass-overlay CSS | VE (styles.css L548-549) | Zero usages; absent from master, which already ships glassmorphism overlays (8 backdrop-filter instances, #26 PRESENT) under its own class names. Redundant + dead. |
| `loading-button.js` (`setLoading()` spinner) | ABI | The app performs **no async ops** -- zero possible callers. Dead capability. |
| `prefetch-hover.js` (claims to preload on hover) | ABI | Inert no-op (only sets `pane.dataset._prefetched`; the fetch/iframe preload was never implemented). Single-file app has nothing to prefetch. Non-feature. |
| `ARCHITECTURE_MAP.md` | VE/ABI/PAT | Stale by construction: enumerates the giant-branch superset ("31 JS files / 14 components") whereas master extracted only the 9 SPA modules. Would mislead. |
| `CHANGELOG.md` | VE/ABI/PAT | Internal version-churn log itemizing dropped/deferred work; git history + RCA + `_audit/` are the durable record. |
| `CI_WORKFLOW.md` | VE/ABI/PAT | Prose for the deploy-on-push `ci.yml` -- exactly the approach master superseded with the gated `deploy-pages.yml`. Describes the inferior, dropped path. |
| `docs/SPA_DESIGN.md` | ABI/PAT | Describes the full router/view-manager design incl. the loading-skeleton sub-feature dropped on extraction (#17). Redundant/stale. |
| **[MASTER HYGIENE]** dangling `animation:activePulse` no-op (`model-answers/logic.js:15`) | master | Not a branch feature -- a dead reference ON master: declares `animation:activePulse 2s ease-in-out infinite` but `@keyframes activePulse` does not exist (confirmed by grep). Harmless no-op but a dead-code smell. **1-line fix: drop the declaration, or repoint to the live `dotActivePulse`.** |

> The only adjacent re-impl candidates are explicitly *elsewhere* and *net-new*: the copy-confirmation/toast concept (6a, master chose no toast layer) and the OPTION to author fresh accurate architecture/SPA docs against master. Neither is preservation of these files.

---

## 9. Full reconsideration table (all 77 items)

Sorted by verdict (RESCUE_WORTHY -> OPERATOR_TASTE -> CLEAN_DROP), then tier. Origin legend: **ABI** = `feature/animated-bg-interactions`, **PAT** = `feature/parallelize-all-tests`, **VE** = `visual-enhancements`, **master** = already on `4fabb31`.

| # | Feature | Origin | Tier | Useful? | Verdict | Re-impl approach | Effort |
|---:|---|---|---|---|---|---|---|
| 1 | `visual_regression` MOBILE SPACING suite (#71) | VE | T2 fixable | USEFUL | **RESCUE_WORTHY** | ~4-line `suite('MOBILE SPACING')`: assert `.seg button.on` padding-right `28` + `::after` right `12` | S |
| 2 | `font-size.js` -- A-/A+ text-size control | ABI | T2 fixable | USEFUL | **RESCUE_WORTHY** | Drop localStorage; module var; live `.stage.style.fontSize` via `apply()`; in-memory only | S |
| 3 | `scroll-to-top.js` (#72) | ABI | T2 fixable | USEFUL | **RESCUE_WORTHY** | Tier-1 clean; take near as-is into `app.js`; rebinds on routechange; within-pane scroll-up | S |
| 4 | `pomodoro-timer.js` -- 25/5 focus timer + SVG ring | ABI | T2 fixable | USEFUL | **RESCUE_WORTHY** | Storage tag is a phantom; strip comment; swap one `showToast` for ring/beep; consider folding into `session-timer` | S |
| 5 | `page-visibility.js` (#73) | ABI | T2 fixable | USEFUL | **RESCUE_WORTHY** | Page Visibility API not forbidden; take as-is; pair with 3D card #70 | S |
| 6 | Modular browser e2e layer -- OVERALL (#74) | PAT/ABI | T2 fixable | USEFUL | **RESCUE_WORTHY** | De-hardcode `/mnt` paths; restore `router_navigate`; fix basename collision; add Playwright + auto-skip; gated CI-only job | L |
| 7 | `conftest.py` (pytest-asyncio fixtures) | ABI/PAT | T2 fixable | USEFUL | **RESCUE_WORTHY** | De-hardcode `HTML_PATH` (L21); add `router_navigate` alias -> fixes 7 collection errors | S |
| 8 | `pytest.ini` (asyncio auto-mode + markers) | PAT | T2 fixable | USEFUL | **RESCUE_WORTHY** | Portable as-is; update `--ignore` list once standalone scripts dropped | S |
| 9 | `.github/workflows/ci.yml` -- e2e job only | PAT/ABI | T2 fixable | USEFUL | **RESCUE_WORTHY** | Extract ONLY the Playwright job; drop build/deploy-on-push (superseded by gated `deploy-pages.yml`) | S |
| 10 | `test/modules/*` (modular e2e) | ABI/PAT | T2 fixable | USEFUL | **RESCUE_WORTHY** | Keep real e2e modules; drop per-version smoke churn; resolve `test_spa.py` basename collision | M |
| 11 | `ci.py` + `main.py` (driver) | ABI/PAT | T2 fixable | USEFUL | **RESCUE_WORTHY** | Adopt `main.py` as the ONE driver (de-hardcode `HTML_PATH` L31); fold `ci.py` into `ci.yml` | M |
| 12 | `runner.py` (modular async Playwright runner) | ABI/PAT | T2 fixable | USEFUL | **RESCUE_WORTHY** | De-hardcode 7 `/mnt` sites from `__file__`; retire in favour of `main.py` (keep one driver) | M |
| 13 | 3D card-tilt + spotlight + conic border-glow (#70) | VE/PAT | T3 gimmick | GIMMICK | OPERATOR_TASTE | Wrap `.card` 3D block in `@media(hover:hover)+(prefers-reduced-motion:no-preference)`; gate `borderGlow`+`will-change` to `:hover`. Operator already rescuing (salvage/card-3d) | M |
| 14 | `mouse-glow.js` -- cursor spotlight | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Offline-safe + gated; include if wanted; permanent rAF/paint cost. Lean drop | S |
| 15 | `magnetic-button.js` -- buttons pull to cursor | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | One delegated mousemove + hover/reduced-motion gate; usability anti-pattern. Lean drop | S |
| 16 | `audio-feedback.js` -- Web Audio click sounds | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Add in-memory mute/opt-in; noise>value. Lean drop | S |
| 17 | `completion-celebration.js` -- confetti at 95% scroll | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Retarget to a real completion signal (drill graded/mock scored) to earn its place | S |
| 18 | `easter-egg.js` -- Konami -> rainbow | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Degrades w/o showToast. Lean drop unless an egg is wanted | S |
| 19 | `double-tap.js` -- double-tap heart-burst | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Gesture for dropped bookmark-system; overlaps zoom double-tap. Retarget or drop | S |
| 20 | `pointer-events.js` -- card scale-on-press | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Use CSS `.card:active{transform:scale(.98)}` instead of the module | S |
| 21 | `reading-time.js` -- "X min read" badge | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Wrong (passive-reading) mental model for an active trainer. Lean drop | S |
| 22 | `virtual-keyboard.js` -- visualViewport offset | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Add consuming CSS for the one code-paste overlay (->M) or drop; marginal | S |
| 23 | `selection-api.js` -- selection toolbar | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Drop the native-copy dup; build select->Cmd+K-search net-new (M) if wanted | S |
| 24 | `share-url.js` -- copy deep-link | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Keep only for the hosted gh-pages copy; pointless on file://. Lean drop | S |
| 25 | `ripple` (initRipple) -- material click ripple | PAT/ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Lift the `initRipple` slice if wanted; master's `:active` press states suffice | S |
| 26 | `toast` (initToast/showToast) -- notice layer | PAT/ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Adopting a toast primitive is a design change, not a fix; master uses inline feedback | S |
| 27 | `nav-sparkle` -- cursor sparkle on nav hover | PAT/ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Gate on hover+reduced-motion if kept; pure flourish. Lean drop | S |
| 28 | `animation-speed.js` -- slow/normal/fast | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | In-memory speed var + duration multiplier; reduced-motion covers the need; orig rule buggy | S |
| 29 | `typing-intro.js` -- typewriter heading | ABI | T3 gimmick | GIMMICK | OPERATOR_TASTE | Show-once via module flag; delays heading. Recommend drop | S |
| 30 | `night-schedule.js` -- auto-dark 8PM-6AM | ABI | T3 redundant | REDUNDANT | OPERATOR_TASTE | `Date().getHours()` at boot + in-memory override; redundant w/ prefers-color-scheme. Lean redundant | S |
| 31 | Generated test-report JSON | VE/ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Regenerated by the suite; gitignored on master | - |
| 32 | Committed PNG screenshots | VE/ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Re-derived by the regression run; gitignored | - |
| 33 | `deploy_temp/index.html` | ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | md5-identical dup of the artifact; build is the single source; gitignored | - |
| 34 | `scan_report.json` | ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Generated scanner dump; gitignored | - |
| 35 | Dead `.toast` CSS family | VE | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Orphan selectors, zero drivers; if toast wanted, write fresh CSS (6a) | - |
| 36 | Dead `.ov`/`.ov-c` glass classes | VE | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Zero usages; feature ships via master's own overlay classes (#26) | - |
| 37 | `loading-button.js` -- setLoading() spinner | ABI | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | No async ops -> zero callers; dead capability | - |
| 38 | `prefetch-hover.js` -- claims to preload | ABI | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Inert no-op; single-file app has nothing to prefetch | - |
| 39 | `ARCHITECTURE_MAP.md` | VE/ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Stale superset snapshot ("31 JS files"); author fresh if docs wanted (net-new) | - |
| 40 | `CHANGELOG.md` | VE/ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Version-churn log of dropped features; git history + `_audit/` cover it | - |
| 41 | `CI_WORKFLOW.md` | VE/ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Describes deploy-on-push ci.yml; superseded by gated `deploy-pages.yml` | - |
| 42 | `docs/SPA_DESIGN.md` | ABI/PAT | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Describes the loading-skeleton sub-feature dropped on extraction; stale | - |
| 43 | `[MASTER HYGIENE]` dangling `animation:activePulse` (logic.js:15) | master | T0 non-feature | NOT_A_FEATURE | CLEAN_DROP | Dead ref ON master (no matching @keyframes); 1-line fix: drop decl or repoint to `dotActivePulse` | - |
| 44 | `permission-request.js` | ABI | T1 inherent | NOT_A_FEATURE | CLEAN_DROP | Pure permission plumbing (permissions.query + Notification + localStorage); no capability | - |
| 45 | `beacon-unload.js` | ABI | T1 inherent | NOT_A_FEATURE | CLEAN_DROP | Server analytics via sendBeacon; needs a network endpoint; not a feature | - |
| 46 | `haptic-feedback.js` | ABI | T1 inherent | GIMMICK | CLEAN_DROP | Vibrate has no offline substitute; CSS press states already exist; low value | - |
| 47 | `notification-system.js` | ABI | T3 gimmick | GIMMICK | CLEAN_DROP | Fake inbox of canned tips, no event source; real tips in overlay/tour | - |
| 48 | `perf-overlay.js` | ABI | T3 gimmick | GIMMICK | CLEAN_DROP | Dev FPS/memory HUD (Chrome-only performance.memory); not a user feature | - |
| 49 | `offline-indicator.js` | ABI | T3 gimmick | GIMMICK | CLEAN_DROP | "You are offline" is a false premise for an offline-first tool; alarming | - |
| 50 | `battery-indicator.js` | ABI | T3 gimmick | GIMMICK | CLEAN_DROP | Device-stat, zero rehearsal value; getBattery forbidden | - |
| 51 | `network-indicator.js` | ABI | T3 gimmick | GIMMICK | CLEAN_DROP | Network badge in an offline tool is self-contradictory; connection forbidden | - |
| 52 | `storage-estimate.js` | ABI | T3 gimmick | GIMMICK | CLEAN_DROP | App stores nothing -> reads ~0; storage.estimate forbidden | - |
| 53 | `state-persistence.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | CPR1 code + router already cover progress/view state; fresh-reload restore low value | - |
| 54 | `session-logger.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Always-visible 9-tab rail + session-timer supersede recents/duration | - |
| 55 | `bookmark-system.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Per-probe revisit flags are the right-granularity form | - |
| 56 | `badge-counter.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Ornament for redundant bookmark-system; no standalone value | - |
| 57 | `welcome-banner.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | tour-guide ('g') + keyboard-overlay serve onboarding better | - |
| 58 | `cache-modules.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | App is already one offline file; Cache-API solves a non-problem | - |
| 59 | `web-share.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | CPR1 code-copy is the portable share; nothing to share from file:// | - |
| 60 | `save-data.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | prefers-reduced-motion already reduces animations offline-safe | - |
| 61 | Dark-mode toggle persistence (`initDarkMode`) | PAT | T3 redundant | REDUNDANT | CLEAN_DROP | Master ships dark mode (boot.js + themetog); only the localStorage delta dropped | - |
| 62 | Tour-guide dismissal persistence | PAT/ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Master uses in-memory flag + on-demand start; cross-reload memory moot | - |
| 63 | `edge-swipe.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Duplicates OS edge-back; master ships touch-swipe; conflict-prone | - |
| 64 | `sticky-footer.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | keyboard-overlay + tour supersede a permanent shortcut bar | - |
| 65 | `undo-toast.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Master's arm/confirm guard (prevention) beats post-hoc undo; needs dropped toast | - |
| 66 | `resize-observer.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Container queries + media queries cover responsive; classes unconsumed | - |
| 67 | `scroll-direction.js` | ABI | T3 redundant | GIMMICK | CLEAN_DROP | Sets body classes nothing consumes; no hide-on-scroll header | - |
| 68 | `sliding-indicator` (initSlidingIndicator) | PAT/ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Master's active-nav treatment supersedes the glow bar | - |
| 69 | `route-flash` (initRouteFlash) | PAT/ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Native View Transitions supersede the tint flash | - |
| 70 | `progress-tracker` (initProgressTracker) | PAT | T3 redundant | REDUNDANT | CLEAN_DROP | Counts tabs visited, not work; master's session-progress + scroll-progress + timer | - |
| 71 | `progress-ring.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | scroll-progress + session-timer + lit rail; host element absent so create() returns early | - |
| 72 | `media-query-listener.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | Master handles a11y media declaratively in CSS; JS classes unconsumed | - |
| 73 | `text-fragment.js` | ABI | T3 redundant | REDUNDANT | CLEAN_DROP | HashRouter owns `#` (collides); Cmd/Ctrl+K covers find; meaningless for file:// | - |
| 74 | `lint.py` | VE/ABI/PAT | T3 redundant | REDUNDANT | CLEAN_DROP | `check_all.py` + `visual_regression` already cover build/JS/CSS; extras redundant | - |
| 75 | Superseded keyframes/CSS variants (pulseGlow / activePulse / navItemIn / `.toast`/`.ov` / loading-skeleton / dup shimmer / ABI borderGlow card) | VE/ABI/PAT | T3 redundant | REDUNDANT | CLEAN_DROP | Verified superseded on master (dotActivePulse+railin, loadShimmer/badgeShimmer split, native VT, #70 3D variant) | - |
| 76 | Top-level duplicate-basename pytest scripts | ABI/PAT | T3 redundant | REDUNDANT | CLEAN_DROP | Collide with `test/modules/` (the collision that breaks collection); keep modules, drop these | - |
| 77 | Standalone Playwright e2e scripts (comprehensive/full_scroll/full_test/production/scroll) | VE/ABI/PAT | T3 redundant | REDUNDANT | CLEAN_DROP | Superseded by the modular suite; pytest.ini already --ignores them | - |

---

## 10. What to do with this

1. **Tier-A rescues (5 x effort S) -- one small follow-up branch off master.** `MOBILE SPACING` guard, `font-size`, `scroll-to-top`, `pomodoro-timer`, `page-visibility`. Build + gate (`check_all.py`) + a manual light/dark browser pass lands all five. Pair `page-visibility` with the 3D card if #70 is taken.
2. **Tier-B rescue (effort L) -- one focused branch: the gated browser e2e layer (#74).** De-hardcode paths, restore the `router_navigate` fixture, fix the `test_spa.py` basename collision, add Playwright + auto-skip, wire a CI-only gated e2e job (NOT deploy-coupled). Adopt `main.py` as the one driver + `test/modules/` as the suite; retire `runner.py`, `ci.py`, the top-level duplicate scripts, and the standalone monolithic scripts. **This closes the documented #1 risk** -- the only strategic item lost over fixable details.
3. **3D card-spotlight (#70):** operator already rescuing; land it with the perf-guarded reimpl (hover + reduced-motion gating; `borderGlow`/`will-change` confined to `:hover`).
4. **18 operator-taste calls:** default is **drop** (the salvage's "when in doubt, DROP" held). If any single flourish is specifically wanted, it is an include + reduced-motion/pointer gate (S) -- decide per item, no analysis owed.
5. **47 clean drops:** confirmed. Do not commit. Tier-0 bloat is already gitignored on master; redundant/superseded items are already done better; Tier-1-inherent items have no offline substitute and no user-facing value.
6. **Master-hygiene 1-liner (free):** drop or repoint the dead `animation:activePulse` declaration in `model-answers/logic.js:15`.
7. **Two net-new ideas (not rescues), if ever wanted:** the select->Cmd+K-search bridge (against search-overlay) and retargeting a completion celebration to a real mastery signal. Build fresh; do not resurrect the dropped modules.

**Net verdict:** the value-preservation question is closed. 12 of 77 carry rescuable value, and they are *exactly* the Tier-2 (fixable) set -- proof the bucketing is sound. The headline residue is the real-browser e2e layer (the #1 risk, effort L) plus four S-effort UX/a11y singles and a 4-line test guard. The only outright mistake was the `pomodoro` phantom-storage drop. Everything else the lens confirms as correctly dropped (redundant/superseded/non-feature) or pure taste.
