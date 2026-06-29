# Deep-Dive Content-Pipeline Rehearsal -- Unified Feature Matrix

**Date:** 2026-06-29
**Master at synthesis time:** `4fabb31` ("salvage: rescue zoom-diagrams + touch-swipe") -- verified on disk; this is `c831945` (the task-stated master) + the now-landed zoom/swipe rescue. `c831945` is a strict ancestor of HEAD.
**Sources merged:** 4 per-branch catalogues (`enhance-web-components`, `visual-enhancements`, `feature/animated-bg-interactions`, `feature/parallelize-all-tests`) cross-checked against `_audit/2026-06-29-branch-audit.md`, `_audit/2026-06-29-branch-reaudit.md`, and the live `master` tree.
**Fork point for all 4 branches:** `bca9569`.

Origin legend: **EWC** = `enhance-web-components` - **VE** = `visual-enhancements` - **ABI** = `feature/animated-bg-interactions` - **PAT** = `feature/parallelize-all-tests`.

---

## 1. Executive headline

**Nothing valuable is un-accounted-for.** Every feature across all four branches is either (a) already in master, (b) documented + offline-safe + re-derivable with exact retrieval coordinates (5 DEFERRED), or (c) correctly dropped as offline-unsafe / gimmick / redundant / superseded / generated bloat. The two strongest "reconsider" items -- `zoom-diagrams.js` and `touch-swipe.js` -- have since **LANDED on master** (`4fabb31`), closing the last open value-preservation question. **All four source branches are SAFE TO DELETE** from a value-preservation standpoint; the only outstanding gate (true for every branch, orthogonal to deletion) is a manual light+dark **browser pass**, since all Playwright/`render.cjs` checks auto-skip here without Chrome.

---

## 2. Totals (deduplicated across the whole effort)

The four catalogues hold **199 raw entries**; after merging shared rows (the byte-identical SPA core + guard tests + RCA + generated bloat that appear on multiple branches) they collapse to **153 unique features**.

| Status | Count | Meaning |
|---|---:|---|
| **PRESENT (in master)** | 67 | Live in the master tree today |
| **RESCUED -> landed in master** | 2 | `zoom-diagrams.js` + `touch-swipe.js` (pending at task-time `c831945`; landed at `4fabb31`) |
| **DEFERRED** | 5 | Offline-safe, documented, re-derivable; deliberately scoped out |
| **DROPPED -- offline-unsafe** | 22 | Forbidden API (storage / network / permission / device) |
| **DROPPED -- gimmick / redundant / superseded / non-portable** | 57 | Decorative, duplicated, replaced, or bloat/non-portable |
| **DROPPED total** | 79 | |
| **TOTAL unique features** | **153** | (199 raw catalogue entries deduped) |

**Currently live in master = 69** (67 PRESENT + 2 RESCUED-landed).

### Per-branch raw counts (as catalogued, before cross-branch dedup)

| Branch | PRESENT | RESCUING | DEFERRED | DROPPED | Raw total |
|---|---:|---:|---:|---:|---:|
| EWC `enhance-web-components` | 15 | 0 | 0 | 0 | 15 |
| VE `visual-enhancements` | 45 | 0 | 2 | 15 | 62 |
| ABI `feature/animated-bg-interactions` | 10 | 2 | 2 | 58 | 72 |
| PAT `feature/parallelize-all-tests` | 14 | 0 | 1 | 35 | 50 |
| **Raw sum** | 84 | 2 | 5 | 108 | **199** |

The dedup removes 17 PRESENT duplicates (SPA core counted once across ABI+PAT; guard tests + RCA once across VE+ABI+PAT; scroll-progress once across 3; companion `.cmp-*` folded into the EWC fix) and 29 DROPPED duplicates (shared runner/test/CI scaffolding, generated JSON, PNGs, dup keyframes, etc.), and reclassifies PAT's "3D card-tilt" from DROPPED into the single DEFERRED 3D-card row.

---

## 3. CURRENTLY IN MASTER (kept) -- all 67 PRESENT + 2 RESCUED

### 3.0 Foundation (master Step 0 -- not a per-branch feature, included for completeness)
- `.gitattributes` (`* text=auto eol=lf`) + `git add --renormalize` -- kills the phantom CRLF git-dirty diff and the fresh-Windows-clone `build_integrity` fragility.
- `.gitignore` bloat block: `test/reports/`, `deploy_temp/`, `test/scan_report.json` -- prevents any future salvage from re-introducing generated output.
- Gated gh-pages CI: `.github/workflows/deploy-pages.yml` -- deploys only when `python test/check_all.py` passes (supersedes PAT's deploy-on-push `ci.yml`).
- THE GATE on master = `python test/check_all.py` runs **7 checks**: `ascii_guard`, `syntax_check`, `build_integrity`, `css_syntax`, `file_integrity`, `unit_tests`, `visual_regression` (+ `render.cjs`/`entity_leak.cjs` which skip without Chrome).

### 3.1 EWC -- companion-rail latent-bug fix + CSS chrome (15)
The one branch fully absorbed as a strict ancestor of master. Its headline contribution is a real master bug fix: the light-DOM `.cmp-*` companion family was trapped in the `<deep-session>` shadow sheet, so the rail rendered unstyled; EWC relocates it to light-DOM `styles.css`.

| # | Feature | Why it's kept |
|---|---|---|
| 1 | Companion rail style relocation (latent-bug fix) | `styles.css` L481-509; the one real master bug a branch fixed; shadow sheet now holds only the distinct session-compare family |
| 2 | Companion eyebrow chip + ringed dot-bead | `styles.css` L485-486, byte-identical |
| 3 | Companion topic heading | L487 |
| 4 | Companion thesis + gradient rule | L488-489 |
| 5 | Companion spine thread + ringed gradient beads | L493-496 |
| 6 | Companion key-move callout + quotation index | L502-503 |
| 7 | Companion keycap chip | L501 |
| 8 | Companion structural/typographic classes | L481-500 |
| 9 | Desktop companion rail panel framing | L506-509 (`@media>=1280px`) |
| 10 | Top progress-bar glow + leading-edge cap | L520-521; also in the print-hide set |
| 11 | Brand wordmark optical tightening | L524 |
| 12 | Desktop lit active-nav treatment | L527-532; coexists additively with master's inset-shadow `.on` |
| 13 | Pointer-only hover lifts (tool-openers + mock CTA) | L536-537 (`@media(hover:hover)`) |
| 14 | Card top accent bar | `base-styles.js` L14-15 |
| 15 | Step-k leading gradient tick | `base-styles.js` L16-17 |

### 3.2 SPA core (9) -- extracted file-level from the giant lineage (ABI/PAT)
The 9 named modules salvaged onto master; the byte-identical core came from the cleaner PAT source, ASCII-cleaned, plus the on-rubric extras unique to ABI.

| # | Feature | Module | Origin | Note |
|---|---|---|---|---|
| 16 | HashRouter URL routing | `router.js` | ABI+PAT | deep-linkable views, back/forward; ASCII-clean extraction |
| 17 | ViewManager view switching | `view-manager.js` | ABI+PAT | shows/hides 9 panes, scroll/focus/title lifecycle; skeleton sub-feature dropped |
| 18 | Native View Transitions wrapper | `view-transitions.js` | ABI+PAT | master adds the skipped-transition rejection swallow (`79e0cb7`) |
| 19 | Guided tour overlay | `tour-guide.js` | ABI+PAT | master stripped the `sessionStorage` dismissal-memory |
| 20 | Search overlay (Cmd/Ctrl+K) | `search-overlay.js` | ABI+PAT | byte-identical core |
| 21 | Scroll progress bar | `scroll-progress.js` | ABI(module)+PAT(inline)+VE(inline) | modularized from the old inline `#scrollprog` block |
| 22 | Copy-code buttons | `copy-code.js` | ABI | `clipboard.writeText`, offline-safe after a user gesture |
| 23 | Focus / zen mode | `focus-mode.js` | ABI | distraction-free dimming |
| 24 | Session timer | `session-timer.js` | ABI | the one on-rubric extra unique to ABI (absent on PAT) |

### 3.3 Visual best-of-both (38) -- VE primary, master chrome preferred
Master is a strict superset of VE's at-rule set; every per-component visual treatment diffs +0 branch-only vs master except the 3 `initCardSpotlight()` calls (the deferred 3D effect).

| # | Feature | Why it's kept |
|---|---|---|
| 25 | Mesh gradient animated background (meshA/meshB) | `styles.css` L289/290; the headline visual the salvage took |
| 26 | Glassmorphism panels/overlays | + `prefers-reduced-transparency` fallback; master superset |
| 27 | Neon/accent glow (accentGlow) | L365 |
| 28 | Heading gradient-shift (headingShift) | L103/105 + `@supports(background-clip:text)` |
| 29 | Pane entrance choreography (panein/paneinDark/cardStagger) | L332-336 |
| 30 | Sidebar rail entrance (railin) | master kept the simpler opacity-only `railin`; richer translateX variant superseded |
| 31 | Active-tab dot pulse (dotActivePulse) | supersedes the branch's `activePulse` |
| 32 | Empty-state skeleton shimmer (loadShimmer) | renamed from the colliding `shimmer` |
| 33 | Badge sheen (badgeShimmer) | `.badge::after`, renamed |
| 34 | Button shimmer (btnShimmer) | L140 |
| 35 | Companion reveal (mcompReveal) | L462 |
| 36 | Overlay backdrop/panel animations (ovbg/ovpan/ovbgout/ovpanout/panelIn) | L409-423 |
| 37 | View-transition CSS animations (vtIn/vtOut + @supports) | L412-416; dovetails with `view-transitions.js` |
| 38 | Shimmer/headIn keyframe de-duplication | fixed dup `shimmer` (L42/L100) + `headIn` (L342/L346); the broken-cascade regression class |
| 39 | Print styles + @page | L8, L208 |
| 40 | prefers-reduced-motion guards | master has more instances than the branch |
| 41 | prefers-contrast:more | L546 |
| 42 | prefers-reduced-transparency | L547 |
| 43 | forced-colors:active | L548 |
| 44 | @supports subgrid | L541 |
| 45 | Container queries (@container 500px/380px) | L542/543 |
| 46 | base-styles card surface + step headings | non-3D portions of BASE_SHEET (.card surface, .step-*, ::selection) |
| 47 | Drill: card-bump + bar-shimmer + rec badges | diff +2 (only the `initCardSpotlight` call) |
| 48 | System-map: cursor pulse (curPulse) | +0 branch-only vs master |
| 49 | Trade-offs: shine sweep (shineSweep) | +0 branch-only |
| 50 | Walkthrough: dot/insight/flow-line/step-shine | diff +2 (only `initCardSpotlight`) |
| 51 | Whiteboard visual enhancements | diff +2 (only `initCardSpotlight`) |
| 52 | Shared-sheets push-glow + disclosure-in (pushGlow/discIn) | +0 branch-only |
| 53 | Numbers-NALSD visual enhancements | +16 branch lines were the old pre-SPA scaffolding the router superseded, not lost visuals |
| 54 | Mixed-fire: interruption toggle + visuals (v127) | +0 branch-only |
| 55 | Mock-run theatrical overlay + scroll fixes (v119-120) | +0 branch-only |
| 56 | Remaining per-surface polish (opener/red-flags/content-sheet/cram/keyboard/model-answers) | each +0 branch-only |
| 57 | Overlay flexbox scrolling fix | +0 branch-only; the scrolling fixes are in master |
| 58 | Confirm-before-clear session (.ss-clear.arm) | two-step arm/confirm safety state preserved (4 `arm` refs) |
| 59 | Scroll-to-top on view switch (v76) | provided by the SPA router/view-manager scroll reset |
| 60 | Boot splash + spinner ring (_bs-spin) | `boot.js`; came via the best-of-both (also on PAT) |
| 61 | Live theme switching (prefers-color-scheme + theme-color meta) | `boot.js`; identical in master (also on PAT) |
| 62 | em-dash gate fix | ASCII `--` `boot.js`; `ascii_guard` green |

### 3.4 Shared guard tests + RCA (5) -- VE authored, also carried by both giants, wired into THE GATE

| # | Feature | Origin | Why it's kept |
|---|---|---|---|
| 63 | `unit_tests.py` | VE+ABI+PAT | in `test/`, wired into `check_all.py` |
| 64 | `css_syntax.py` | VE+ABI+PAT | brace-balance + keyframe-integrity validator; wired |
| 65 | `file_integrity.py` | VE+ABI+PAT | build/source integrity; wired |
| 66 | `visual_regression.py` | VE+ABI+PAT | static regression suites; adapted to master's transform-only mockbar (5 suites); wired |
| 67 | `ROOT_CAUSE_ANALYSIS.md` | VE(authored)+ABI+PAT | byte-identical blob `3500741f...` absorbed at `d50aaa8` |

---

## 4. RESCUING NOW (pending at task-time) -- both have since LANDED in master

The task framed these as "being RESCUED right now onto `salvage/zoom-swipe`." Verified on disk: `salvage/zoom-swipe` tip == master HEAD `4fabb31`; both files are tracked, wired into `app.js` (build-includes L30-31), and built into the deliverable (+176 lines). So the rescue is **DONE** -- these are effectively PRESENT now.

| # | Feature | Module | Origin | Status | Note |
|---|---|---|---|---|---|
| 68 | Pinch-zoom diagrams | `zoom-diagrams.js` | ABI | RESCUED -> in master | Offline-safe; pinch + double-tap-reset on `.card img`/diagrams; the single most-defensible add (System-Map/Whiteboard benefit). `app.js` L30 |
| 69 | Touch swipe navigation | `touch-swipe.js` | ABI | RESCUED -> in master | Offline-safe; horizontal swipe to change views on mobile; pairs with the HashRouter. `app.js` L31 |

---

## 5. DEFERRED (5) -- offline-safe, documented, re-derivable (retrieval coordinates included)

All deliberately scoped out by the SPA brief ("when in doubt, DROP"); none lost. Exact `branch:path` coordinates preserved so deletion stays reversible-in-spirit even after origin refs are GC'd.

| # | Feature | Origin | Why deferred (not why-not) | Retrieval coordinate |
|---|---|---|---|---|
| 70 | 3D card-tilt + mouse spotlight + rotating border-glow (`initCardSpotlight`) | VE (primary) + PAT | The marquee visual, offline-safe, but gimmick-leaning: desktop-cursor-only, continuous `borderGlow` + `will-change` + 3D transforms on every card = battery/perf cost. Master deliberately preferred the simpler EWC `.card::before`/`.step-k` accent chrome. **Operator yes/no item.** (ABI ships a simpler `borderGlow`-only variant -- DROPPED #135.) | `origin/visual-enhancements:src/scripts/app/base-styles.js` + call sites `drill/logic.js:154`, `walkthrough/logic.js:130`, `whiteboard.js:156` |
| 71 | `visual_regression` MOBILE SPACING suite (2 checks) | VE | Master's adapted `visual_regression` (5 suites) omits the 2 dot-gutter checks; master still ships the 28px gutter, so this is an un-covered assertion, not a regression. Trivially re-derivable. | `origin/visual-enhancements:test/visual_regression.py` -> `suite("MOBILE SPACING")` |
| 72 | Scroll-to-top button (`scroll-to-top.js`) | ABI | Offline-safe floating back-to-top after >400px; marginal because master already resets scroll on view switch. | `origin/feature/animated-bg-interactions:src/scripts/app/scroll-to-top.js` |
| 73 | Page-visibility pause (`page-visibility.js`) | ABI | Offline-safe minor battery/perf win (pauses anim/timers when tab hidden). | `origin/feature/animated-bg-interactions:src/scripts/app/page-visibility.js` |
| 74 | Modular browser e2e layer (concept) | PAT (+ABI files) | The *idea* of a real Chromium/Playwright e2e layer (shadow DOM / router / a11y / VT) with a `--group/--marker` runner + CI gating is reasonable, but nothing is portably reusable as-is (de-hardcode `/mnt/agents/...` paths from `__file__`, restore `conftest` `router_navigate`, resolve the `test_spa.py` basename collision, add Playwright). Net-new work, not salvage; `check_all.py` covers the portable gate today. | `origin/feature/parallelize-all-tests:test/runner.py` + `test/modules/*` |

---

## 6. DROPPED -- OFFLINE-UNSAFE (22) -- one row per module, exact forbidden API

The trainer runs from `file://` with NO network/storage/permissions ("works on a plane"). Each of these hits a forbidden API and is correctly dropped. (Master's extracted SPA core neutralized the two storage hits that lived inside otherwise-kept modules: rows 95-96.)

| # | Module / feature | Origin | Forbidden API (exact) |
|---|---|---|---|
| 75 | `state-persistence.js` | ABI | `localStorage.getItem/setItem` (L19/25) |
| 76 | `session-logger.js` | ABI | `localStorage` (L18/23) |
| 77 | `bookmark-system.js` | ABI | `localStorage` (L18/23) |
| 78 | `badge-counter.js` | ABI | `localStorage` (L17); also depends on dropped `bookmark-system` |
| 79 | `font-size.js` | ABI | `localStorage` (L20/54) |
| 80 | `animation-speed.js` | ABI | `localStorage` (L18/58) |
| 81 | `night-schedule.js` | ABI | `localStorage` override key (L19) |
| 82 | `typing-intro.js` | ABI | `localStorage` seen-flag (L32/33) |
| 83 | `welcome-banner.js` | ABI | `localStorage` once-per-browser flag (L17/64) |
| 84 | `notification-system.js` | ABI | `localStorage` read-state (L22/27) |
| 85 | `pomodoro-timer.js` | ABI | `sessionStorage` |
| 86 | `permission-request.js` | ABI | `navigator.permissions.query` (L22) + `Notification` + `localStorage` (L15/25) -- triple forbidden |
| 87 | `beacon-unload.js` | ABI | `navigator.sendBeacon('/analytics', ...)` (L28) |
| 88 | `cache-modules.js` | ABI | Cache API `caches.open` (L11/17/32) |
| 89 | `web-share.js` | ABI | `navigator.share()` (L10/21) |
| 90 | `battery-indicator.js` | ABI | `navigator.getBattery()` (L13/52) |
| 91 | `network-indicator.js` | ABI | `navigator.connection.effectiveType` (L13) |
| 92 | `save-data.js` | ABI | `navigator.connection.saveData` (L11) |
| 93 | `storage-estimate.js` | ABI | `navigator.storage.estimate()` (L18) |
| 94 | `haptic-feedback.js` | ABI | `navigator.vibrate()` (L11/16) |
| 95 | Dark-mode toggle (`initDarkMode`, inside `dynamic-features.js`) | PAT | `localStorage.setItem('theme', ...)` (L259); also redundant -- master already has dark mode via `boot.js` |
| 96 | Tour-guide dismissal persistence | PAT (+ABI) | `sessionStorage` get/set/remove (L230/260/283); master kept the coachmarks, stripped the persistence |

---

## 7. DROPPED -- GIMMICK / REDUNDANT / SUPERSEDED / NON-PORTABLE (57)

### 7a. Gimmick -- offline-safe but decorative / low-value (26)
`dynamic-features.js` grab-bag (#97) + its 5 offline-safe members (#98-102, ripple / sliding-indicator / toast / sparkle / route-flash), plus ABI's cursor/novelty effects: `mouse-glow` (#103), `magnetic-button` (#104), `audio-feedback` (#105), `completion-celebration` confetti (#106), `easter-egg` Konami (#107), `double-tap` (#108), `edge-swipe` (#109), `loading-button` (#110, no async to spin for), `pointer-events` (#111), `perf-overlay` (#112, dev tool), `reading-time` (#113), `scroll-direction` (#114, no consumer), `sticky-footer` (#115, redundant w/ keyboard-overlay), `virtual-keyboard` (#116), `undo-toast` (#117), `selection-api` (#118), `share-url` (#119, copies a local `file://` path), `resize-observer` (#120, container queries cover it), `offline-indicator` (#121, `navigator.onLine` not forbidden but pointless offline), `prefetch-hover` (#122, **inert no-op** at tip -- corrects audit-1's "uses fetch").

### 7b. Redundant (5)
`progress-ring.js` (#123), `media-query-listener.js` (#124, CSS `@media` handles it), `text-fragment.js` (#125, router already deep-links), `initProgressTracker` sidebar bar (#126), `lint.py` (#127, overlaps the gate + emoji + hardcoded `/tmp/_lint.js` + false-flags the transform-only mockbar).

### 7c. Superseded -- CSS/keyframes replaced by master chrome (9)
`pulseGlow` comet-head (#128, master `display:none !important`), `activePulse` dot (#129, master uses inset accent bar + `::before`; note the dangling `animation:activePulse` no-op in `model-answers/logic.js`), `navItemIn` (#130, master uses `railin`), `.toast` family (#131, dead CSS -- driver was in dropped `dynamic-features.js`), `.ov`/`.ov-c` glass classes (#132, dead CSS, 0 usages), loading-skeleton + JS-VT keyframes `_sk`/`viewEnter`/`viewLeave`/`cardEnter`/`fadeInUp` (#133, native VT + `panein`/`cardStagger` instead), duplicate single-name `shimmer` keyframe (#134, master split to `loadShimmer`/`badgeShimmer`), `Card borderGlow` simpler ABI variant (#135), per-module cosmetic micro-deltas across 12+ existing modules (#136, master evolved versions).

### 7d. Non-portable / bloat -- test, CI, build artifacts (13 + 4 docs)
`runner.py` (#137, hardcoded `/mnt/agents/...`), `conftest.py` (#138, missing `router_navigate`), `ci.py` (#139), `main.py` (#140), `pytest.ini` (#141), `test/modules/*` modular suite (#142, ABI 24 / PAT 13 files), top-level duplicate-basename pytest scripts (#143, 7 files), standalone Playwright e2e scripts (#144, e2e_comprehensive/full_scroll/full_test/production/scroll), `.github/workflows/ci.yml` (#145, deploy-on-push; superseded by `deploy-pages.yml`), `scan_report.json` (#146), `deploy_temp/index.html` (#147, dup deliverable), generated `test/reports/*.json` (#148, VE 17 / ABI 199 / PAT 135 files = 62-89% of each branch diff), committed PNG screenshots (#149, VE 7 / ABI 8 / PAT 8, multi-MB). Docs: `ARCHITECTURE_MAP.md` (#150), `CHANGELOG.md` (#151), `CI_WORKFLOW.md` (#152), `docs/SPA_DESIGN.md` (#153) -- all describe dropped scaffolding; code + RCA + `_audit/` are the source of truth. Master both excludes AND `.gitignore`s `test/reports/`, `deploy_temp/`, `scan_report.json`.

---

## 8. FULL MATRIX (every feature, deduplicated)

One row per unique feature. Shared rows note all origin branches; statuses: PRESENT / RESCUED (landed) / DEFERRED / DROPPED.

| # | Feature | Origin | Description | Status | Why / Why-not |
|---|---|---|---|---|---|
| 1 | Companion rail style relocation (latent-bug fix) | EWC (+VE shadow copy) | Moves light-DOM `.cmp-*` family out of the shadow SESS_STYLE sheet into `styles.css` so the rail is actually styled | PRESENT | The one real master bug a branch fixed; `styles.css` L481-509; shadow sheet retains only the distinct session-compare family |
| 2 | Companion eyebrow chip + ringed dot-bead | EWC | `.cmp-eyebrow` accent pill + `::before` ringed dot | PRESENT | `styles.css` L485-486, byte-identical |
| 3 | Companion topic heading | EWC | `.cmp-topic` display-font, tight-tracked | PRESENT | L487 |
| 4 | Companion thesis + gradient rule | EWC | `.cmp-thesis` lede + `::before` gradient divider | PRESENT | L488-489 |
| 5 | Companion spine thread + ringed gradient beads | EWC | `.cmp-spine` thread + `.cmp-dot` beads | PRESENT | L493-496 |
| 6 | Companion key-move callout + quotation index | EWC | `.cmp-move` gradient callout + `::before` quote glyph | PRESENT | L502-503 |
| 7 | Companion keycap chip | EWC | `.cmp-kbd` inline keycap | PRESENT | L501 |
| 8 | Companion structural/typographic classes | EWC | `.cmp-inner/block/h/view/note/drive` | PRESENT | L481-500 |
| 9 | Desktop companion rail panel framing | EWC | `@media>=1280px` edge-shadow + masthead accent | PRESENT | L506-509 |
| 10 | Top progress-bar glow + leading-edge cap | EWC | `.rail .fill` glow + `::after` cap | PRESENT | L520-521; also in the print-hide set |
| 11 | Brand wordmark optical tightening | EWC | `.side-id h1` letter-spacing -.5px | PRESENT | L524 |
| 12 | Desktop lit active-nav treatment | EWC | `@media>=920px` animated accent bar + lit `.on` | PRESENT | L527-532; coexists additively with master's inset-shadow `.on` |
| 13 | Pointer-only hover lifts (tool-openers + mock CTA) | EWC | `@media(hover:hover)` translateY lift | PRESENT | L536-537 |
| 14 | Card top accent bar | EWC | `.card::before` inset top gradient bar | PRESENT | `base-styles.js` L14-15 |
| 15 | Step-k leading gradient tick | EWC | `.step-k::before` short gradient tick | PRESENT | `base-styles.js` L16-17 |
| 16 | HashRouter URL routing | ABI+PAT | hash router (#walk/#drill...), deep-link, back/forward | PRESENT | `router.js`; ASCII-clean extraction; did not exist at fork |
| 17 | ViewManager view switching | ABI+PAT | shows/hides 9 panes, scroll/focus/title lifecycle | PRESENT | `view-manager.js`; loading-skeleton sub-feature dropped on extraction |
| 18 | Native View Transitions wrapper | ABI+PAT | wraps `startViewTransition`, reduced-motion fallback | PRESENT | `view-transitions.js`; master adds skipped-transition rejection swallow (79e0cb7) |
| 19 | Guided tour overlay | ABI+PAT | first-run coachmark tour | PRESENT | `tour-guide.js`; master stripped the `sessionStorage` dismissal-memory |
| 20 | Search overlay (Cmd/Ctrl+K) | ABI+PAT | keyboard search / jump across views | PRESENT | `search-overlay.js`; byte-identical core |
| 21 | Scroll progress bar | ABI+PAT+VE | top bar tracking pane scroll | PRESENT | `scroll-progress.js`; modularized from the old inline `#scrollprog` block |
| 22 | Copy-code buttons | ABI | copy button on code blocks | PRESENT | `copy-code.js`; `clipboard.writeText` offline-safe after a gesture |
| 23 | Focus / zen mode | ABI | distraction-free dimming | PRESENT | `focus-mode.js` |
| 24 | Session timer | ABI | sidebar elapsed-time timer | PRESENT | `session-timer.js`; the one on-rubric extra unique to ABI |
| 25 | Mesh gradient animated background | VE (+PAT) | dual-layer meshA/meshB drifting blobs | PRESENT | `styles.css` L289/290; the headline visual taken |
| 26 | Glassmorphism panels/overlays | VE | backdrop-filter blur+saturate | PRESENT | + reduced-transparency fallback; master superset |
| 27 | Neon/accent glow (accentGlow) | VE | pulsing accent box-shadow | PRESENT | L365 |
| 28 | Heading gradient-shift (headingShift) | VE | animated gradient text + @supports | PRESENT | L103/105 |
| 29 | Pane entrance choreography | VE | panein/paneinDark/cardStagger | PRESENT | L332-336 |
| 30 | Sidebar rail entrance (railin) | VE | rail fade-slide-in on mount | PRESENT | master kept the simpler opacity-only `railin`; richer translateX variant superseded |
| 31 | Active-tab dot pulse (dotActivePulse) | VE | pulsing active-indicator ring | PRESENT | supersedes the branch's `activePulse` variant |
| 32 | Empty-state skeleton shimmer (loadShimmer) | VE | `.card:empty` shimmer | PRESENT | renamed from the colliding `shimmer` |
| 33 | Badge sheen (badgeShimmer) | VE | `.badge::after` diagonal sweep | PRESENT | renamed |
| 34 | Button shimmer (btnShimmer) | VE | primary-button shine sweep | PRESENT | L140 |
| 35 | Companion reveal (mcompReveal) | VE | mobile companion summary reveal | PRESENT | L462 |
| 36 | Overlay backdrop/panel animations | VE | ovbg/ovpan/ovbgout/ovpanout/panelIn | PRESENT | L409-423 |
| 37 | View-transition CSS animations (vtIn/vtOut) | VE | + @supports(view-transition-name) | PRESENT | L412-416; dovetails with `view-transitions.js` |
| 38 | Shimmer/headIn keyframe de-duplication | VE | fixed dup shimmer (L42/L100) + headIn (L342/L346) | PRESENT | the broken-cascade regression class master resolved |
| 39 | Print styles + @page | VE | @page margin 1.5cm | PRESENT | L8, L208 |
| 40 | prefers-reduced-motion guards | VE | kills animations/transitions | PRESENT | master has more instances |
| 41 | prefers-contrast:more | VE | thicker borders + focus outlines | PRESENT | L546 |
| 42 | prefers-reduced-transparency | VE | disables backdrop-filter | PRESENT | L547 |
| 43 | forced-colors:active | VE | Windows high-contrast mapping | PRESENT | L548 |
| 44 | @supports subgrid | VE | arc-grid subgrid where supported | PRESENT | L541 |
| 45 | Container queries | VE | @container 500px/380px padding | PRESENT | L542/543 |
| 46 | base-styles card surface + step headings | VE | BASE_SHEET .card surface, .step-*, ::selection | PRESENT | non-3D portions present; only the 3D additions dropped |
| 47 | Drill: card-bump + bar-shimmer + rec badges | VE | cbump/barShimmer/pop/pulse | PRESENT | diff +2 (only the `initCardSpotlight` call) |
| 48 | System-map: cursor pulse (curPulse) | VE | active-node cursor glow | PRESENT | +0 branch-only vs master |
| 49 | Trade-offs: shine sweep (shineSweep) | VE | trade-off card shine | PRESENT | +0 branch-only |
| 50 | Walkthrough: dot/insight/flow-line/step-shine | VE | dotPulse/insIn/flowLine/stepShine | PRESENT | diff +2 (only `initCardSpotlight`) |
| 51 | Whiteboard visual enhancements | VE | card/diagram polish | PRESENT | diff +2 (only `initCardSpotlight`) |
| 52 | Shared-sheets push-glow + disclosure-in | VE | pushGlow/discIn | PRESENT | +0 branch-only |
| 53 | Numbers-NALSD visual enhancements | VE | tab/rail/card polish | PRESENT | +16 branch lines = old pre-SPA scaffolding superseded, not lost visuals |
| 54 | Mixed-fire: interruption toggle + visuals (v127) | VE | interruption toggle control | PRESENT | +0 branch-only |
| 55 | Mock-run theatrical overlay + scroll fixes (v119-120) | VE | overlay experience | PRESENT | +0 branch-only |
| 56 | Remaining per-surface polish | VE | opener/red-flags/content-sheet/cram/keyboard/model-answers | PRESENT | each +0 branch-only |
| 57 | Overlay flexbox scrolling fix | VE | all overlays scroll correctly | PRESENT | +0 branch-only; fixes are in master |
| 58 | Confirm-before-clear session (.ss-clear.arm) | VE | two-step arm/confirm before clear | PRESENT | safety state preserved (4 `arm` refs) |
| 59 | Scroll-to-top on view switch (v76) | VE (+SPA router) | reset scroll on tab/view change | PRESENT | provided by router/view-manager |
| 60 | Boot splash + spinner ring (_bs-spin) | VE (+PAT) | loading splash removed when ready | PRESENT | `boot.js`; came via best-of-both |
| 61 | Live theme switching | VE (+PAT) | prefers-color-scheme + theme-color meta | PRESENT | `boot.js`; identical in master |
| 62 | em-dash gate fix | VE | ASCII `--` in `boot.js` | PRESENT | `ascii_guard` green |
| 63 | unit_tests.py | VE+ABI+PAT | python unit suite over invariants | PRESENT | in `test/`, wired into `check_all.py` |
| 64 | css_syntax.py | VE+ABI+PAT | CSS brace/keyframe validator | PRESENT | wired into the gate |
| 65 | file_integrity.py | VE+ABI+PAT | build/source integrity checks | PRESENT | wired into the gate |
| 66 | visual_regression.py | VE+ABI+PAT | static regression suites | PRESENT | wired; adapted to transform-only mockbar (5 suites) |
| 67 | ROOT_CAUSE_ANALYSIS.md | VE(authored)+ABI+PAT | RCA for whitespace + mockbar regressions | PRESENT | byte-identical blob absorbed at `d50aaa8` |
| 68 | Pinch-zoom diagrams | ABI | pinch + double-tap-reset on `.card img`/diagrams | RESCUED -> in master | landed at `4fabb31`; wired `app.js` L30; most-defensible add |
| 69 | Touch swipe navigation | ABI | horizontal swipe to change views on mobile | RESCUED -> in master | landed at `4fabb31`; wired `app.js` L31; pairs with the router |
| 70 | 3D card-tilt + mouse spotlight + rotating border-glow (initCardSpotlight) | VE(primary)+PAT | preserve-3d tilt, cursor-tracked radial spotlight, conic borderGlow, cardIn | DEFERRED | offline-safe but gimmick-leaning (desktop-cursor-only, continuous borderGlow + will-change + 3D = battery/perf); master preferred EWC chrome; coords `origin/visual-enhancements:src/scripts/app/base-styles.js` + drill:154/walkthrough:130/whiteboard:156 |
| 71 | visual_regression MOBILE SPACING suite (2 checks) | VE | dot gutter 28px + dot position 12px assertions | DEFERRED | master ships the 28px gutter but omits the 2 checks (un-covered, not a regression); coords `origin/visual-enhancements:test/visual_regression.py` suite('MOBILE SPACING') |
| 72 | Scroll-to-top button | ABI | floating back-to-top after >400px | DEFERRED | marginal -- router already resets scroll on view switch; coords `origin/feature/animated-bg-interactions:src/scripts/app/scroll-to-top.js` |
| 73 | Page-visibility pause | ABI | pause anim/timers when tab hidden | DEFERRED | minor battery/perf win; coords `origin/feature/animated-bg-interactions:src/scripts/app/page-visibility.js` |
| 74 | Modular browser e2e layer (concept) | PAT (+ABI files) | --group/--marker Playwright runner + modules (shadow DOM/router/a11y/VT) | DEFERRED | concept useful but nothing portably reusable (hardcoded paths, missing fixtures, basename collisions); net-new work; coords `origin/feature/parallelize-all-tests:test/runner.py` + `test/modules/*` |
| 75 | state-persistence.js | ABI | last view/scroll/theme autosave (5s) | DROPPED | OFFLINE-UNSAFE: `localStorage.getItem/setItem` (L19/25) |
| 76 | session-logger.js | ABI | module-visit log + recently-viewed | DROPPED | OFFLINE-UNSAFE: `localStorage` (L18/23) |
| 77 | bookmark-system.js | ABI | star/unstar favorites | DROPPED | OFFLINE-UNSAFE: `localStorage` (L18/23) |
| 78 | badge-counter.js | ABI | bookmark count badge | DROPPED | OFFLINE-UNSAFE: `localStorage` (L17); depends on dropped bookmark-system |
| 79 | font-size.js | ABI | A-/A+ 5 text-size levels | DROPPED | OFFLINE-UNSAFE: `localStorage` (L20/54) |
| 80 | animation-speed.js | ABI | slow/normal/fast control | DROPPED | OFFLINE-UNSAFE: `localStorage` (L18/58) |
| 81 | night-schedule.js | ABI | auto-dark 8PM-6AM | DROPPED | OFFLINE-UNSAFE: `localStorage` override key (L19); master already has dark mode |
| 82 | typing-intro.js | ABI | one-time typewriter heading | DROPPED | OFFLINE-UNSAFE: `localStorage` seen-flag (L32/33); decorative regardless |
| 83 | welcome-banner.js | ABI | dismissible first-visit banner | DROPPED | OFFLINE-UNSAFE: `localStorage` flag (L17/64) |
| 84 | notification-system.js | ABI | bell dropdown + unread count | DROPPED | OFFLINE-UNSAFE: `localStorage` read-state (L22/27) |
| 85 | pomodoro-timer.js | ABI | 25/5 focus timer + chime | DROPPED | OFFLINE-UNSAFE: `sessionStorage` |
| 86 | permission-request.js | ABI | requests clipboard/notification perms | DROPPED | OFFLINE-UNSAFE: `navigator.permissions.query` (L22) + Notification + `localStorage` (L15/25) |
| 87 | beacon-unload.js | ABI | session analytics on beforeunload | DROPPED | OFFLINE-UNSAFE: `navigator.sendBeacon('/analytics')` (L28) |
| 88 | cache-modules.js | ABI | caches module HTML | DROPPED | OFFLINE-UNSAFE: Cache API `caches.open` (L11/17/32) |
| 89 | web-share.js | ABI | OS share sheet | DROPPED | OFFLINE-UNSAFE: `navigator.share()` (L10/21) |
| 90 | battery-indicator.js | ABI | battery-level + charging badge | DROPPED | OFFLINE-UNSAFE: `navigator.getBattery()` (L13/52) |
| 91 | network-indicator.js | ABI | 4G/3G/offline badge | DROPPED | OFFLINE-UNSAFE: `navigator.connection.effectiveType` (L13) |
| 92 | save-data.js | ABI | data-saver body class | DROPPED | OFFLINE-UNSAFE: `navigator.connection.saveData` (L11) |
| 93 | storage-estimate.js | ABI | storage used/quota in footer | DROPPED | OFFLINE-UNSAFE: `navigator.storage.estimate()` (L18) |
| 94 | haptic-feedback.js | ABI | 15ms vibration on click | DROPPED | OFFLINE-UNSAFE: `navigator.vibrate()` (L11/16) |
| 95 | Dark-mode toggle (initDarkMode in dynamic-features.js) | PAT | sidebar theme toggle, persisted | DROPPED | OFFLINE-UNSAFE: `localStorage.setItem('theme')` (L259); also redundant w/ boot.js dark mode |
| 96 | Tour-guide dismissal persistence | PAT (+ABI) | remember tour dismissal across reloads | DROPPED | OFFLINE-UNSAFE: `sessionStorage` (L230/260/283); master kept coachmarks, stripped persistence |
| 97 | dynamic-features.js grab-bag | ABI+PAT | ripple/sliding-indicator/progress/toast/sparkle/route-flash (+dark-toggle on PAT) | DROPPED | GIMMICK; ABI variant offline-safe (showToast only, no localStorage); PAT variant adds offline-unsafe initDarkMode; master has no toast/ripple layer |
| 98 | Click ripple (initRipple) | PAT | material ripple span on clicks | DROPPED | GIMMICK; purely decorative |
| 99 | Sliding active indicator (initSlidingIndicator) | PAT | glow bar tracking active button (MutationObserver) | DROPPED | GIMMICK; master uses static `.on` + railin/dotActivePulse |
| 100 | Toast notifications (initToast / window.showToast) | PAT | fixed bottom-right toast layer | DROPPED | GIMMICK; master intentionally has no toast layer |
| 101 | Nav hover sparkle (initNavSparkle) | PAT | cursor-position sparkle particles | DROPPED | GIMMICK; desktop-cursor-only |
| 102 | Route-change flash (initRouteFlash) | PAT | flash overlay on routechange | DROPPED | GIMMICK; superseded by native View Transitions |
| 103 | mouse-glow.js | ABI | radial spotlight lerp-following cursor | DROPPED | GIMMICK; the desktop-cursor effect the SPA brief explicitly dropped |
| 104 | magnetic-button.js | ABI | buttons translate toward cursor (80px) | DROPPED | GIMMICK; perf cost, low value |
| 105 | audio-feedback.js | ABI | Web Audio click sounds | DROPPED | GIMMICK; noise inappropriate for an interview trainer |
| 106 | completion-celebration.js | ABI | confetti burst at 95% scroll | DROPPED | GIMMICK; purely decorative |
| 107 | easter-egg.js | ABI | Konami -> rainbow background | DROPPED | GIMMICK; zero training value |
| 108 | double-tap.js | ABI | double-tap to bookmark (heart-burst) | DROPPED | GIMMICK; triggers the dropped bookmark-system |
| 109 | edge-swipe.js | ABI | edge-swipe history nav | DROPPED | GIMMICK; fights native back/forward |
| 110 | loading-button.js | ABI | button spinner state | DROPPED | GIMMICK; no async ops to spin for |
| 111 | pointer-events.js | ABI | pressure-sensitive card drag | DROPPED | GIMMICK; no anchored use |
| 112 | perf-overlay.js | ABI | FPS/memory dev overlay (triple-backtick) | DROPPED | GIMMICK; dev tool, not a user feature |
| 113 | reading-time.js | ABI | 'X min read' badge | DROPPED | GIMMICK; low value for a rehearsal trainer (local word-count, not storage.estimate) |
| 114 | scroll-direction.js | ABI | scrolling-up/down body classes | DROPPED | GIMMICK; no consumer (no hide-on-scroll header) |
| 115 | sticky-footer.js | ABI | desktop shortcut footer bar | DROPPED | GIMMICK; redundant with keyboard-overlay |
| 116 | virtual-keyboard.js | ABI | visualViewport layout adjust | DROPPED | GIMMICK; no text inputs to solve for |
| 117 | undo-toast.js | ABI | undo toast after destructive action | DROPPED | GIMMICK; no destructive flow; needs the dropped toast |
| 118 | selection-api.js | ABI | floating selection toolbar (copy/search) | DROPPED | GIMMICK; clipboard offline-safe but speculative |
| 119 | share-url.js | ABI | copy location.href to clipboard | DROPPED | GIMMICK; copies a local `file://` path |
| 120 | resize-observer.js | ABI | size class on `.app` | DROPPED | GIMMICK; container queries already cover responsive needs |
| 121 | offline-indicator.js | ABI | slide-in banner when offline | DROPPED | GIMMICK; `navigator.onLine` (not forbidden) but pointless for an offline tool |
| 122 | prefetch-hover.js | ABI | claims to preload next module on hover | DROPPED | GIMMICK; inert no-op at tip (only sets dataset flag; corrects audit-1's 'uses fetch') |
| 123 | progress-ring.js | ABI | SVG completion ring (TOTAL=9) | DROPPED | REDUNDANT; scroll-progress + session-progress + rail already convey progress |
| 124 | media-query-listener.js | ABI | dark/reduced-motion/contrast body classes | DROPPED | REDUNDANT; CSS @media handles it declaratively |
| 125 | text-fragment.js | ABI | #:~:text= highlight + scroll | DROPPED | REDUNDANT; HashRouter already deep-links; conflicting scheme |
| 126 | Sidebar session-progress bar (initProgressTracker) | PAT | 'Session Progress N/9' label + fill | DROPPED | REDUNDANT; duplicate progress affordance |
| 127 | lint.py | VE+ABI+PAT | quick build/JS/CSS lint helper | DROPPED | REDUNDANT; overlaps the gate, emoji (fails ascii_guard), hardcoded /tmp/_lint.js, false-flags transform-only mockbar |
| 128 | Progress-rail comet-head glow (pulseGlow) | VE (+ABI/PAT) | glowing comet head on rail fill | DROPPED | GIMMICK; master `.rail .fill::after{display:none!important}`, no pulseGlow keyframe |
| 129 | Sidebar active-tab pulsing dot (activePulse) | VE (+ABI/PAT) | pulsing `::after` dot in active tab | DROPPED | SUPERSEDED; master uses inset accent bar + `::before`; note dangling no-op `animation:activePulse` in model-answers/logic.js |
| 130 | Sidebar nav-item entrance stagger (navItemIn) | VE (+ABI/PAT) | nav buttons slide/fade in | DROPPED | SUPERSEDED; master uses `railin` |
| 131 | Toast notification CSS (.toast family) | VE | .toast/.show/.ok/.warn/.err | DROPPED | dead CSS; no JS driver (driver was in dropped dynamic-features.js) |
| 132 | Overlay glassmorphism classes (.ov/.ov-c) | VE | frosted-glass overlay containers | DROPPED | dead CSS; 0 usages; orphan selectors |
| 133 | Loading skeleton + JS-driven VT keyframes | ABI+PAT | _sk/viewEnter/viewLeave/cardEnter/fadeInUp | DROPPED | SUPERSEDED by native VT + panein/cardStagger; no async load to mask |
| 134 | Duplicate shimmer @keyframes (single colliding name) | ABI+PAT | one 'shimmer' animation | DROPPED | SUPERSEDED; master split to loadShimmer/badgeShimmer (the dup-keyframes regression) |
| 135 | Card borderGlow treatment (simpler ABI variant) | ABI | conic rotating border glow + card entrance | DROPPED | GIMMICK; continuous anim/will-change cost; master preferred EWC .card::before/.step-k chrome (richer 3D variant is DEFERRED #70) |
| 136 | Visual micro-enhancements to existing modules (PAT cosmetic deltas) | PAT | per-module CSS/markup tweaks to 12+ modules | DROPPED | SUPERSEDED; each module exists in master with its own evolved version |
| 137 | runner.py modular async Playwright runner | ABI+PAT | --group/--marker/--test/--list runner (branch namesake) | DROPPED | NON-PORTABLE; hardcodes file:///mnt/agents/... paths; needs Playwright; check_all.py is the portable equivalent |
| 138 | conftest.py pytest fixtures | ABI+PAT | Playwright page/browser fixtures | DROPPED | NON-PORTABLE; hardcoded HTML_PATH; missing router_navigate -> collection errors |
| 139 | ci.py CI orchestrator | ABI+PAT | drives the e2e suite | DROPPED | NON-PORTABLE; superseded by check_all.py + deploy-pages |
| 140 | main.py test orchestrator | ABI+PAT | 249-line suite entry | DROPPED | NON-PORTABLE; redundant with check_all.py |
| 141 | pytest.ini | PAT | asyncio auto-mode + markers + ignores | DROPPED | NON-PORTABLE; config for the dropped Playwright suite |
| 142 | Modular e2e suite (test/modules/*) | ABI(24)+PAT(13) | shadow DOM/router/a11y/VT/keyboard e2e modules | DROPPED | NON-PORTABLE; Playwright + hardcoded paths; collection errors at tip |
| 143 | Top-level duplicate-basename pytest scripts (7) | ABI+PAT | test_spa/_router/_views + test_accessibility/components/layout/performance | DROPPED | NON-PORTABLE/REDUNDANT; basename collisions w/ test/modules; Playwright |
| 144 | Standalone Playwright e2e scripts (5) | VE(4)+ABI+PAT | e2e_comprehensive/full_scroll/full_test/production/scroll | DROPPED | NON-PORTABLE; auto-skip without Chrome; overlapping; static intent covered by visual_regression |
| 145 | .github/workflows/ci.yml (100% E2E CI) | PAT | runs ci.py (Playwright) + deploy on main push | DROPPED | SUPERSEDED; master ships gated deploy-pages.yml; this needs non-portable ci.py + deploy-on-push risk |
| 146 | scan_report.json | ABI+PAT | generated scanner output (751 lines) | DROPPED | generated artifact, not source; gitignored on master |
| 147 | deploy_temp/index.html | ABI+PAT | duplicate built deliverable (byte-identical) | DROPPED | NON-PORTABLE; stray deploy scratch; gitignored on master |
| 148 | Generated test-report JSON bloat (test/reports/*.json) | VE(17)+ABI(199)+PAT(135) | generated Playwright output (62-89% of branch diff) | DROPPED | bloat; master excludes AND gitignores test/reports/ |
| 149 | Committed PNG screenshots | VE(7)+ABI(8)+PAT(8) | desktop/mobile screenshots (multi-MB) | DROPPED | binary bloat; gitignored on master; would bake into history if merged |
| 150 | ARCHITECTURE_MAP.md | VE+PAT | architecture/SPA-layout overview | DROPPED | REDUNDANT aux doc; code + RCA + _audit are source of truth |
| 151 | CHANGELOG.md | VE+PAT | v112->v300 version churn log | DROPPED | REDUNDANT history doc; no product value |
| 152 | CI_WORKFLOW.md | VE+PAT | CI workflow prose | DROPPED | SUPERSEDED by the actual deploy-pages.yml |
| 153 | docs/SPA_DESIGN.md | PAT | SPA design notes | DROPPED | REDUNDANT; code extracted file-level, doc not carried |

---

## 9. Safe to delete? -- per-branch verdict

| Branch | Tip | Unique value left behind? | Verdict |
|---|---|---|---|
| **EWC** `enhance-web-components` | `1495e6a` | None. Branch tip is a strict ancestor of master (`git rev-list --count origin/enhance-web-components ^master` = 0; merged at `801bc72`). All 15 features PRESENT. | **SAFE TO DELETE** |
| **VE** `visual-enhancements` | `120829e` | None lost. Best-of-both took the substantive visual + a11y + the 4 guard tests; master chrome preferred by design. The 2 borderline items (3D card-spotlight #70, MOBILE SPACING suite #71) are DEFERRED with retrieval coords. | **SAFE TO DELETE** (2 deferred, documented) |
| **ABI** `feature/animated-bg-interactions` | `c51be72` | None lost. The 9-module SPA core + the 2 strongest rescues (`zoom-diagrams`, `touch-swipe`) are IN master; the remaining 47 unique modules are correctly offline-unsafe/gimmick/redundant; 2 niceties (#72/#73) DEFERRED with coords. 88.9% generated bloat correctly excluded. | **SAFE TO DELETE** (2 deferred, documented; rescues landed) |
| **PAT** `feature/parallelize-all-tests` | `989b8f5` | None lost. Its only unique src module is the `dynamic-features.js` gimmick grab-bag (one offline-unsafe member); the SPA core it shares with ABI is already extracted; the modular runner/CI is non-portable (#74 records the concept). 88% generated bloat correctly excluded. | **SAFE TO DELETE** (1 deferred concept, documented) |

**Overall: all four branches are SAFE TO DELETE from a value-preservation standpoint.** No critical or clearly-valuable content is left behind; every reconsideration item is either landed (rescues) or DEFERRED with exact `branch:path` coordinates, so deletion stays reversible-in-spirit even after origin refs are GC'd.

**The one outstanding gate (branch-independent):** a manual light+dark **browser pass** on master -- all Playwright/`render.cjs`/`entity_leak.cjs` checks auto-skip here without Chrome, so the visual correctness of the extracted SPA core + visual best-of-both is not machine-verified. This is true for every branch and is orthogonal to deletion safety.





