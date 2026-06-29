# Branch Re-Audit -- value-preservation check before deletion

**Project:** Deep-Dive Content-Pipeline Rehearsal
**Date:** 2026-06-29
**Master:** `79e0cb7` (final; Steps 0-4 landed: EOL/gitignore foundation, enhance-web-components, visual-enhancements best-of, SPA core + VT-skip fix)
**Method:** READ-ONLY. Per branch, compared content vs current master at the file / CSS-at-rule / module / forbidden-API level. Master worktree confirmed unmodified by this audit.
**Scope guard:** did not touch the gh-pages worktree or `ci/gh-pages-deploy` (salvage-ve Step 5 work).

Fork point for all four feature branches: `bca9569`. Known bloat (`test/reports/`, PNGs, `deploy_temp/`, `scan_report.json`) and the deliberately-dropped gimmick/network modules are excluded from "candidates" unless misclassified.

---

## Bottom line per branch

| Branch | Tip | Verdict | One-liner |
|---|---|---|---|
| `enhance-web-components` | `1495e6a` | **SAFE TO DELETE** | Fully absorbed -- branch tip is an ancestor of master (0 commits outside master). |
| `visual-enhancements` | `120829e` | **HAS-CANDIDATES** (2 borderline) | Best-of-both faithful; only the 3D card-spotlight treatment + a 2-check test suite were not taken. |
| `feature/parallelize-all-tests` | `989b8f5` | **SAFE TO DELETE** | Only unique module is a gimmick grab-bag; the modular test runner/CI is non-portable + redundant + broken. |
| `feature/animated-bg-interactions` | `c51be72` | **HAS-CANDIDATES** (4 optional) | 70+ modules correctly dropped (offline-unsafe or gimmick); ~4 offline-safe niceties were scoped out, not lost. |

**Overall: no critical or clearly-valuable content was left behind.** Every "candidate" is BORDERLINE/optional and was deliberately scoped out. All four branches are safe to delete from a value-preservation standpoint. This document records the exact retrieval coordinates for the borderline items so deletion remains reversible-in-spirit even if origin refs are later GC'd.

---

## 1. `enhance-web-components @ 1495e6a` -- SAFE TO DELETE

- `git rev-list --count origin/enhance-web-components ^master` = **0**. `git merge-base master origin/enhance-web-components` = `1495e6a` (the branch tip). The branch is wholly an ancestor of master (merged at `801bc72`).
- `git diff master origin/enhance-web-components -- src/` shows only master's *later* additions (the SPA boot block) as removals on the branch side -- nothing exists on the branch that master lacks.

**Candidates: none.** Fully infused (the companion `.cmp-*` shadow-trapped fix + card/step-k accents are live on master). **SAFE TO DELETE.**

---

## 2. `visual-enhancements @ 120829e` -- HAS-CANDIDATES (both borderline)

Master took the best-of-both (mesh gradient + JS logic + the 4 guard tests `unit_tests`/`css_syntax`/`file_integrity`/`visual_regression`), preferring master chrome. Master's CSS at-rule set is a superset-or-equal of visual-enh's (print + `@page`, multiple `prefers-reduced-motion`, `prefers-contrast:more`, `prefers-reduced-transparency`, `forced-colors:active`, `@supports` background-clip/view-transition/subgrid, container queries all present).

### UNEXTRACTED candidates

1. **3D card-tilt + mouse-tracking spotlight + rotating border-glow** -- **BORDERLINE**
   - Where: `origin/visual-enhancements:src/scripts/app/base-styles.js` (the `.card` block with `transform-style:preserve-3d; will-change:transform`, `.card::before` radial spotlight driven by `--mouse-x/--mouse-y`, `.card::after` conic-gradient `borderGlow 4s linear infinite`, `.card:hover` `rotateX/rotateY` tilt, `@keyframes cardIn`/`borderGlow`, and the `initCardSpotlight(root)` mousemove helper), plus its 3 call sites (`drill/logic.js`, `walkthrough/logic.js`, `whiteboard.js`, each `initCardSpotlight(root);`).
   - Assessment: a genuinely rich visual treatment, BUT it is the `mouse-glow`-class effect the SPA brief explicitly dropped -- desktop-cursor-only, a continuously-running `borderGlow` animation + `will-change` + 3D transforms on every card (battery/perf cost), and master deliberately preferred the simpler enhance-web-components `.card::before`/`.step-k` accent chrome. Surface for an explicit operator yes/no; not an accidental loss.

2. **`visual_regression.py` "MOBILE SPACING" suite (2 checks)** -- **BORDERLINE-LOW**
   - Where: `origin/visual-enhancements:test/visual_regression.py` -- `suite("MOBILE SPACING")` with `check("Active tab has right padding for dot", ... '28' ...)` and `check("Dot indicator has right position", ... '12' ...)`.
   - Assessment: master's `visual_regression.py` (5 suites, 43 checks) was correctly *adapted* to master's transform-only mockbar (visual-enh asserted a `display:none` mockbar that master does not use), but it did not carry the 2 cosmetic dot-gutter checks. Master still ships the active-dot gutter feature (`.sidebar .seg button.on::after` + `padding-right:28px`), so this is a minor un-covered assertion, not a regression. Trivial to re-add if wanted.

### Correctly dropped (verified, not candidates)
- Unique keyframes `activePulse` / `navItemIn` / `pulseGlow` -- cosmetic micro-animations superseded by master chrome (`dotActivePulse`, `railin`, `accentGlow`). `shimmer` was the duplicate `@keyframes` master FIXED (renamed to `loadShimmer`/`badgeShimmer`).
- `.toast` / `.ov` / `.ov-c` / `.show` / `.ok` / `.warn` / `.err` classes -- **dead CSS**: no JS driver exists on the branch (`git grep showToast|.toast` in `src/scripts` = nothing). The toast that would drive them lives in `dynamic-features.js`, which is dropped (see below).
- `boot.js` -- only diff is `--` vs an em-dash in a comment; master has the corrected (ASCII) version. The boot splash itself is identical.
- `session-progress.js` `.cmp-*` "+" lines -- the companion styles, correctly relocated by master to light-DOM `styles.css` (the enhance-web-components fix). The `.ss-clear.arm` confirm-before-clear safety state is preserved (3 `arm` refs in both master and visual-enh session-progress.js).
- `index.html` "+" lines -- the OLD inline scroll-progress block, which the SPA work modularized into `scroll-progress.js` + `Router.init()` boot. Master's version is the evolution.

**Bottom line: HAS-CANDIDATES** -- one borderline visual treatment (3D card-spotlight) + one trivial test nit (MOBILE SPACING). Nothing clearly WORTH-INFUSING was missed.

---

## 3. `feature/parallelize-all-tests @ 989b8f5` -- SAFE TO DELETE

SPA core extracted (router, view-manager, view-transitions, tour-guide, search-overlay -- the 5 byte-identical-with-animated-bg modules). Only one src module and the test/CI scaffolding remain unextracted.

### UNEXTRACTED candidates

1. **`dynamic-features.js`** (284 LOC) -- **CORRECTLY-DROPPED**
   - A grab-bag: `initRipple` (click ripple), `initSlidingIndicator`, `initNavSparkle` (cursor sparkle), `initRouteFlash`, `initProgressTracker`, `initToast`/`window.showToast`, and `initDarkMode` which calls `localStorage.setItem('theme', ...)` (line 259) -- **offline-unsafe**. Master already has dark mode (boot.js theme detection + the themetog button). The only arguably-reusable piece is the generic toast (`window.showToast`), but master intentionally has no toast layer and does not need one.

2. **Modular test runner + CI scaffolding** -- **CORRECTLY-DROPPED as-is** (concept BORDERLINE)
   - `test/runner.py` (468 LOC) hardcodes `file:///mnt/agents/output/workspace/deepdive-rehearsal/...` sandbox paths at 6 sites (lines 42, 43, 257, 262, 265, 270, 274) -- **non-portable**; fails on any other machine. Requires Playwright/Chrome. `test/modules/test_*.py` (13 files: accessibility, shadow_dom, router_deep, view_transitions, tour_guide, keyboard_shortcuts, layout, performance, ...) had collection errors at tip (missing `router_navigate` in conftest; `test_spa.py` basename collision with the top-level duplicate). `.github/workflows/ci.yml`, `pytest.ini`, `test/ci.py`, `test/main.py` round out the scaffolding.
   - Master's `check_all.py` is the portable, working, browser-graceful equivalent (7 checks, skips browser cleanly). The modular Playwright suite's *concept* (a real browser e2e layer covering shadow DOM / router / a11y) is reasonable, but **nothing is portably reusable without a rewrite** (de-hardcode paths from `__file__`, restore `conftest`, resolve the basename collision, add Playwright) -- that is net-new work, not salvage.
   - `test/lint.py` -- **CORRECTLY-DROPPED**: redundant with master's gate (build/syntax/css already covered), contains emoji, writes to a hardcoded `/tmp/_lint.js`, and flags master's *deliberate* transform-only mockbar as a defect (false positive).

3. Unique CSS (`@keyframes _sk*` skeleton, `viewEnter`/`viewLeave`, `cardEnter`/`fadeInUp`) -- **CORRECTLY-DROPPED**: the ViewManager skeleton and JS-driven view-transition keyframes were intentionally superseded by native View Transitions + master's existing CSS `panein`/`cardStagger`. `base-styles.js`/`shared-sheets.js` have zero unique class selectors vs master.

**Bottom line: SAFE TO DELETE.** Only the e2e-runner *idea* has aspirational value; no clean salvage exists.

---

## 4. `feature/animated-bg-interactions @ c51be72` -- HAS-CANDIDATES (4 optional, all borderline)

Near-superset of parallelize. 47 `src/scripts/app` modules not on master. Definitively bucketed by forbidden-API grep:

### Correctly dropped -- offline-unsafe (23): network / storage / permission
`animation-speed, badge-counter, battery-indicator, beacon-unload, bookmark-system, cache-modules, dynamic-features, font-size, haptic-feedback, network-indicator, night-schedule, notification-system, permission-request, pomodoro-timer, prefetch-hover, save-data, selection-api, session-logger, share-url, state-persistence, typing-intro, web-share, welcome-banner` -- each hits localStorage / sessionStorage / fetch / sendBeacon / Notification / navigator.share|clipboard|vibrate|getBattery|connection. Correct to drop in an offline `file://` tool.

### Correctly dropped -- offline but gimmick / redundant infra (~20)
`audio-feedback` (click sounds), `completion-celebration` (confetti), `double-tap`, `easter-egg` (Konami), `edge-swipe`, `loading-button` (no async here), `magnetic-button`, `media-query-listener` (CSS handles it), `mouse-glow`, `offline-indicator` (pointless for an offline app), `perf-overlay` (dev FPS/memory), `pointer-events`, `progress-ring` (redundant with master's scroll-progress + session-progress + rail), `reading-time` (low value for a trainer), `resize-observer`, `scroll-direction`, `sticky-footer`, `storage-estimate`, `text-fragment` (router already deep-links), `undo-toast` (needs the dropped toast; no destructive flow to undo), `virtual-keyboard`.

### UNEXTRACTED candidates -- offline-safe AND arguably useful (4) -- all BORDERLINE
Verified free of every forbidden API:

1. **`zoom-diagrams.js`** -- pinch/zoom on images + diagram elements. **BORDERLINE (strongest reconsideration).** A design-interview trainer has a System Map + Whiteboard with diagrams that genuinely benefit from zoom. Retrieval: `origin/feature/animated-bg-interactions:src/scripts/app/zoom-diagrams.js`.
2. **`touch-swipe.js`** -- swipe left/right to change views on mobile. **BORDERLINE.** Pairs naturally with the new HashRouter (`Router.navigate` on swipe). Mobile UX nicety.
3. **`scroll-to-top.js`** -- floating "back to top" button after scrolling. **BORDERLINE-LOW.** Offline-safe; master already resets scroll on view switch, so marginal.
4. **`page-visibility.js`** -- pause animations/timers when the tab is hidden. **BORDERLINE-LOW.** Small battery/perf win; offline-safe.

These were deliberately scoped out by the SPA brief ("only the 9 named core modules come in; when in doubt, DROP"). They are *optional future enhancements*, not lost value.

### Correctly dropped -- unique CSS
`@keyframes _sk*`, `viewEnter`/`viewLeave`, `cardEnter`/`fadeInUp`, `timerIn`, `activePulse`/`navItemIn`/`pulseGlow`/`shimmer` -- skeleton + JS-VT + cosmetic entrance animations, all superseded by master's native-VT + CSS approach.

**Bottom line: HAS-CANDIDATES** -- 4 optional offline-safe niceties (zoom-diagrams the one worth a real second look). None were lost in error.

---

## Overall recommendation

**The Steps 0-4 work was faithful: nothing critical or clearly-valuable was left behind.** enhance-web-components is fully absorbed; the visual best-of-both took the substantive visual + a11y + test work and preferred master chrome by design; the SPA extraction took the 9 genuinely-useful modules and correctly dropped 70+ gimmick / network / storage / redundant modules and a non-portable test harness.

**All four branches are SAFE TO DELETE** from a value-preservation standpoint. The complete set of "things not taken" that a reasonable person could reconsider is small and entirely BORDERLINE/optional:

- `zoom-diagrams.js` (pinch-zoom diagrams) -- the single most defensible add.
- `touch-swipe.js` (mobile swipe nav, pairs with the router).
- The 3D card-tilt + mouse-spotlight treatment (visual-enhancements `base-styles.js`).
- `scroll-to-top.js`, `page-visibility.js` (minor niceties).
- The MOBILE SPACING 2-check test suite (visual-enhancements `visual_regression.py`).

Recommendation: **before deleting origin refs, decide whether to rescue any of the above** (this doc already records exact `branch:path` retrieval coordinates, so deletion stays reversible-in-spirit even post-GC). If the operator wants zero residual risk, the cleanest move is a single tiny follow-up: cherry-pick `zoom-diagrams.js` (and optionally `touch-swipe.js`) onto a clean branch off master, gate + browser-verify, merge -- then delete. Otherwise, delete now: the borderline items are documented and re-deriving any of them is a small, well-scoped task, not a lost-forever loss.
