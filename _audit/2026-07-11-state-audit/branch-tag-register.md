# Branch / Tag KEEP-or-DROP Register

**Lens:** branch + tag keep-or-drop register
**Date:** 2026-07-11
**Master:** `3f51bc1` ("content audit: 46/46 pass; 2 unicode fixes; audit doc", 2026-07-08)
**Method:** READ-ONLY git forensics. Ancestry + patch-equivalence + **content-level** verification (JS-logic parity with CSS/comments stripped; topic-data string presence). No source file modified; no build run.

---

## Executive summary

**All 20 non-master local branches are fully absorbed into master and are safe to DROP.** Nothing is stranded. The salvage work the 2026-06-29 audits prescribed was **executed** — every named module (`zoom-diagrams`, `touch-swipe`, `card-spotlight`, `scroll-to-top`, `page-visibility`, `pomodoro`, the whole SPA core) is live on master.

Three things this audit found that the prior triage did not:

1. **The gh-pages auto-deploy is BROKEN. The live site is 183 commits stale.** `deploy-pages.yml:58` runs `python build.py`; `build.py` was deleted on 2026-07-05 by the Vite migration. Last successful deploy: 2026-07-04. This is the highest-value finding here and it is a one-step fix.
2. **The three "giant" archive tags are a strict LINEAR CHAIN, not parallel lineages.** `visual-enhancements (54) ⊂ parallelize-all-tests (67) ⊂ animated-bg-interactions (77)`. Two of the three tags preserve **zero** unique commits and **zero** unique objects — they are redundant labels. The prior audit's "all four fork at `bca9569`" framing (true w.r.t. *master*) obscured this.
3. **The archive chain pins 109.45 MB across 748 blobs** reachable from nothing else — ~68% of the 160 MiB pack — all of it generated bloat (test-report JSON + PNG screenshots) whose source content is verifiably 100% salvaged.

**The deletion trap.** `git branch --no-merged master` reports **9 branches + gh-pages** as unmerged, so `git branch -d` refuses them. That is an artifact of the serial-integration rebuild (each branch's tip regenerated the deliverable, changing its patch-id), **not** unmerged work. Content verification below proves all 9 carry **zero unique JS logic**.

---

## THE REGISTER — 21 local branches

| # | Branch | Tip | Ahead | `--merged`? | Verdict | Evidence |
|---|---|---|---|---|---|---|
| 1 | **master** | `3f51bc1` | — | — | **KEEP** | System of record. Built artifact healthy: 46 topics, 5 TopicPane elements, **0 console errors**. |
| 2 | build/e2e-refine | `2a4233bd` | 0 | yes | **DROP** | Tip is an ancestor commit of master. |
| 3 | build/e2e-verify | `ebd72032` | 0 | yes | **DROP** | Ancestor of master (`ebd7203` is in master's log). |
| 4 | build/keystone-foundation | `82a93808` | 0 | yes | **DROP** | Ancestor (`82a9380` = "Keystone A Phase 0" in master). |
| 5 | build/must-hit-points | `ad0bec1f` | 0 | yes | **DROP** | Ancestor of master. |
| 6 | build/pane-rf | `39ca3de2` | 0 | yes | **DROP** | Ancestor (`39ca3de` = master's rf commit). |
| 7 | build/pane-drill | `da04f95` | 1 | **NO** | **DROP** | 0 unique JS logic. Master's drill deck is a **superset**: 64 cards vs 58. All 10 distinctive content strings present in master. |
| 8 | build/pane-model | `bca35ef` | 1 | **NO** | **DROP** | JS logic **byte-identical** to master after stripping CSS/comments. |
| 9 | build/pane-num | `8136774` | 1 | **NO** | **DROP** | 0 unique. Master added 7 methods (`_loadSaved`/`_saveCurrent`/`_resetToCanonical`…). Topic data identical. |
| 10 | build/pane-open | `20974d0` | 1 | **NO** | **DROP** | JS logic identical; topic data identical. |
| 11 | build/pane-sys | `473d281` | 1 | **NO** | **DROP** | 0 unique. Master added `resolveChipTarget`. Topic data: **0 lines** unmatched. |
| 12 | build/pane-trade | `f55baaf` | 1 | **NO** | **DROP** | JS logic identical; topic data identical. |
| 13 | build/pane-walk | `3cd9caa` | 1 | **NO** | **DROP** | 0 unique JS logic; topic data identical. |
| 14 | build/pane-wb | `8539acb` | 1 | **NO** | **DROP** | 0 unique. Master added `_emitGraded`. |
| 15 | build/rescues | `3319008` | 1 | **NO** | **DROP** | All 4 modules in master; `text-zoom` even **gained** persistence there. Master merge: `12a5b2b`. |
| 16 | ci/gh-pages-deploy | `c8319455` | 0 | yes | **DROP** | Ancestor of master. (Upstream already `[gone]`.) |
| 17 | salvage/card-3d | `e93ed7b2` | 0 | yes | **DROP** | Ancestor; `card-spotlight.js` live on master. |
| 18 | salvage/spa-core | `79e0cb79` | 0 | yes | **DROP** | Ancestor; router/view-manager/view-transitions/tour-guide/search-overlay all on master. |
| 19 | salvage/visual-enhancements | `6a07f721` | 0 | yes | **DROP** | Ancestor of master. |
| 20 | salvage/zoom-swipe | `4fabb315` | 0 | yes | **DROP** | Ancestor; `zoom-diagrams.js` + `touch-swipe.js` live on master. |
| 21 | **gh-pages (local)** | `869ee9e` | 0 vs origin | **NO** | **DROP** | 27 behind `origin/gh-pages`, **0 ahead**, and a strict ancestor of it. Pure stale pointer — **and a rollback hazard** (see F2). |

**Net: KEEP 1 (master), DROP 20.**

### Why the 9 "unmerged" branches are safe

Each is exactly **1 commit ahead** because the serial-integration flow re-applied the work onto an evolving master and **regenerated the 5.1 MB deliverable**, changing the patch-id. Master carries an equivalent commit for every one (`0b65ff3` drill, `922039c` num, `532acd5` wb, `2092eac` walk, `f3069d3` model+sys, `5f8523a` open, `43715c0` trade, `39ca3de` rf, `12a5b2b` rescues).

Verified programmatically (`scripts/logic-parity.mjs`): stripping CSS template literals + comments + the later IIFE wrapper, **every one of the 9 has zero JS symbols that master lacks.** The only branch-side differences are *pre-tokenization CSS* (hardcoded `16px` where master now has `var(--space-16)`) — i.e. the branch is **behind**, not ahead.

---

## THE REGISTER — 6 tags

| Tag | Commit | Type | Verdict | Evidence |
|---|---|---|---|---|
| **archive/feature-animated-bg-interactions** | `c51be72` | lightweight | **KEEP** | **Sole keeper of all three giant lineages.** No other ref contains it. Pins 109.45 MB / 748 blobs. Salvage verified complete — but it is the only reversibility net for 77 commits. **Recommend re-tagging as annotated.** |
| archive/feature-parallelize-all-tests | `989b8f5` | lightweight | **DROP** | **0 commits** and **0 objects** unique vs `animated-bg` (it is an *ancestor* of it). Redundant label. Commit stays reachable via animated-bg; SHA recorded here + in the 2026-06-29 audit → re-tagging is a one-liner. |
| archive/visual-enhancements | `120829e` | lightweight | **DROP** | Same: an ancestor of both other tags. 0 unique commits/objects. |
| archive/ci-gh-pages-deploy | `06d3fcb` | lightweight | **DROP** | Its sole content (`deploy-pages.yml`, 62 lines) is in master **and superseded** — master's is 75 lines (adds `paths-ignore`, Playwright install, collapses the double served path). Nothing to preserve. |
| v1.0.0 | ancestor | lightweight | **KEEP** | Legitimate release marker; ancestor of master. |
| v1.1.0 | ancestor | lightweight | **KEEP** | Legitimate release marker; ancestor of master. |

### The chain (correcting the prior audit)

```
bca9569 (fork from master)
   └── … ── 120829e  archive/visual-enhancements        (54 commits)
              └── … ── 989b8f5  archive/feature-parallelize-all-tests  (67)
                         └── … ── c51be72  archive/feature-animated-bg-interactions (77)
```
`git rev-list --count $PARALLELIZE..$ANIMATED_BG` = **10**; `$ANIMATED_BG..$PARALLELIZE` = **0**; `$PARALLELIZE..$VISUAL_ENH` = **0**.
Three tags imply three archives. There is **one chain with three labels**.

---

## Salvage verification — is anything still stranded?

Swept every `src/scripts/app/*.js` on all three tags against master (`scripts/tag-salvage-sweep.mjs`):

| Bucket | Count | Status |
|---|---|---|
| SPA core + niceties salvaged into master | 36 | ✅ router, view-manager, view-transitions, tour-guide, search-overlay, focus-mode, scroll-progress, copy-code, zoom-diagrams, touch-swipe, scroll-to-top, page-visibility, card-spotlight, pomodoro… |
| Stranded, **offline-UNSAFE** (correctly dropped) | 21 | localStorage / sendBeacon / fetch / Notification / navigator.share / getBattery — all forbidden in an offline `file://` tool. |
| Stranded, offline-safe **gimmicks** (correctly dropped) | ~24 | audio-feedback, easter-egg, mouse-glow, magnetic-button, confetti, perf-overlay, reading-time, undo-toast… |
| Old topic-data files (superseded by relocation) | 5 | `cards.js`→`topics/…/drill.js` (3/3 strings), `answers.js`→`model.js` (3/3), `steps.js`→`walk.js` (6/6), `speak-lines.js`→`drill.js` (2/2), `numbers-nalsd.js`→`num/logic.js`+`num.js`. **All absorbed.** |

**`session-timer.js`** — the one module the original plan said to *take* from animated-bg — is **not** in master as a file, but its function is **covered and improved**: `mock-run/logic.js:45-50` implements a **drift-free** `performance.now()` elapsed clock, and `pomodoro.js` covers the repeating-focus case. No action needed.

**The only genuinely un-taken item across all three archives** is the `MOBILE SPACING` 2-check suite from `visual-enhancements:test/visual_regression.py:146-154`. The *feature* still ships (`master:src/styles.css:358` — `padding-right:var(--space-28)` on `.sidebar .seg button.on`); only the assertion is missing. Trivial, optional.

The 2026-06-29 reaudit's borderline list is **fully closed**: zoom-diagrams ✅, touch-swipe ✅, 3D card-spotlight ✅, scroll-to-top ✅, page-visibility ✅ — all rescued and live. Only MOBILE SPACING remains.

---

## Findings

### F1 — [P1] gh-pages auto-deploy is broken; the live site is 183 commits stale
`master:.github/workflows/deploy-pages.yml:58` → `run: python build.py`.
`build.py` was **deleted from master on 2026-07-05** by commit `97b746e` *("Vite migration Phases 1-3 … build.py retired")*. `git cat-file -e master:build.py` → **absent**.
The workflow was last touched **2026-06-29** (`ebd7203`) — it never learned about the Vite migration.
`origin/gh-pages` HEAD = `17f049c`, *"Deploy 1977244… (gate-green)"*, **2026-07-04 07:09** — the day *before* build.py died. `git rev-list --count 1977244..master` = **183**.
A healthy artifact exists (`dist/index.html`: 46 topics, 5 TopicPane elements, 0 console errors — shot: `shots/branch-tag-register/dist-artifact-healthy.png`); it simply never ships.
**Fix (S):** delete the `python build.py` step (THE GATE's `build_integrity.py` already runs `npm run build`, so `dist/` exists by then) and assemble from `dist/index.html`.

> **Status note (observed mid-audit).** Confirmed still live on **`origin/master`** — `git show origin/master:.github/workflows/deploy-pages.yml` line 58 is `run: python build.py`, and `origin/master:build.py` is **absent**. That is the tree GitHub Actions checks out, so the deploy is still broken in production.
> A **fix is in flight in the shared working tree** (uncommitted at the time of this audit) by a concurrent agent — it removes the dead step and cites the same commit `97b746e`. Independent corroboration of this finding. **It is not yet committed or pushed, so the live site remains 183 commits stale.** Whoever lands it should verify `origin/gh-pages` actually advances afterward (per the "a Save can silently no-op — reload-verify" rule).

### F2 — [P1] The local `gh-pages` branch is a live-site rollback hazard
Local `gh-pages` = `869ee9e` (2026-06-29), **27 commits behind** `origin/gh-pages`, **0 ahead**, and a strict ancestor of it. It holds no unique work. gh-pages is now **CI-managed**; a stale local branch of the same name is a loaded gun — a `git push origin gh-pages` would roll the production site back to 2026-06-29. **DROP it.**

### F3 — [P2] 20 stale local branches; 9 of them `git branch -d` refuses
`git branch --no-merged master` lists `build/pane-{drill,model,num,open,sys,trade,walk,wb}`, `build/rescues`, `gh-pages` — so the safe-delete path refuses them and they *look* like unmerged work. They are not: content-verified zero unique JS logic (F-evidence above). This is exactly the paralysis the register exists to break. **DROP all 20** (`git branch -D` is required for the 9; that is expected, not a warning sign).

### F4 — [P2] The archive chain pins 109.45 MB of verifiably-salvaged bloat
Objects reachable **only** from `archive/feature-animated-bg-interactions` (not from master/origin): **748 blobs, 109.45 MB uncompressed** — ~68% of the repo's 160.37 MiB pack. Composition (measured via `git ls-tree -l`): 199 generated `test/reports/` files (6.75 MB), 8 committed PNG screenshots (3.38 MB), 160,776 insertions vs the fork point.
This is a **deliberate, informed cost**, not a leak: master's `.gitignore` now pre-empts it (`test/reports/`, `deploy_temp/`, `test/scan_report.json`, `dist/` — lines 14-18), so it cannot recur. Keep the tag as the reversibility net; if repo size ever matters, this is the single biggest reclaim available and this audit is the evidence that makes dropping it safe.

### F5 — [P3] Two of the three giant archive tags are redundant labels
See "The chain" above. `archive/feature-parallelize-all-tests` and `archive/visual-enhancements` preserve **0** unique commits and **0** unique objects. Dropping them frees nothing but removes the false impression of three independent archives. Fully reversible (their commits stay reachable via animated-bg; SHAs recorded here).

### F6 — [P3] All 4 archive tags are lightweight — no annotation, no reason recorded
`git cat-file -t` → `commit` for all four. An archive tag with no message is a mystery to a future reader. **Fix (S):** re-create the one surviving archive as annotated: `git tag -a -f archive/feature-animated-bg-interactions c51be72 -m "Abandoned auto-feature lineage (v112→v308). SPA core salvaged to master; 88% generated bloat + offline-violating network code. Superset of parallelize-all-tests (989b8f5) and visual-enhancements (120829e). See _audit/2026-06-29-branch-audit.md."`

### F7 — [P3] Stray debug files tracked at repo root
`master:_mob_diag.mjs` (3,096 B) and `master:_mob_diag2.mjs` (1,698 B), both committed by `43b7f1d` ("Mobile polish", 2026-07-08). Ad-hoc diagnostics, not part of the build or the gate. **DROP** (or move under `test/`).

---

## Recommended execution order

```bash
# 0. Fix the deploy FIRST -- it is the only user-visible defect here.
#    (edit .github/workflows/deploy-pages.yml: drop `python build.py`,
#     assemble from dist/index.html) -> push -> confirm gh-pages advances.

# 1. Drop the 20 absorbed local branches (9 need -D; that is expected).
git branch -d build/e2e-refine build/e2e-verify build/keystone-foundation \
              build/must-hit-points build/pane-rf ci/gh-pages-deploy \
              salvage/card-3d salvage/spa-core salvage/visual-enhancements salvage/zoom-swipe
git branch -D build/pane-drill build/pane-model build/pane-num build/pane-open \
              build/pane-sys build/pane-trade build/pane-walk build/pane-wb \
              build/rescues gh-pages          # gh-pages: CI-managed on origin

# 2. Collapse the archive tags to the one that actually preserves the chain.
git tag -d archive/feature-parallelize-all-tests   # 0 unique commits/objects
git tag -d archive/visual-enhancements             # 0 unique commits/objects
git tag -d archive/ci-gh-pages-deploy              # superseded by master's 75-line version
git tag -a -f archive/feature-animated-bg-interactions c51be72 -m "<see F6>"

# 3. Optional: re-add the MOBILE SPACING 2-check assertion; drop _mob_diag*.mjs.
```

Deleting a local branch is **reversible** while its commits remain reachable and in the reflog; the archive tag keeps the giant chain alive regardless. Nothing above is destructive to unique work — that is the whole point of the content verification.

---

## Appendix — verification scripts (re-runnable)

| Script | Proves |
|---|---|
| `scripts/logic-parity.mjs` | The 9 "unmerged" pane branches carry **zero** unique JS logic vs master (CSS/comments/IIFE stripped). |
| `scripts/drill-sys-content.mjs` | `drill.js` / `sys.js` topic data fully absorbed (normalizes `\'` escaping + topic renumbering). |
| `scripts/tag-salvage-sweep.mjs` | Per-tag module census: salvaged / stranded-unsafe / stranded-safe, classified by forbidden-API grep. |
| `scripts/branch-tag-register.mjs` | The current built artifact is healthy (46 topics, 0 console errors) → a good artifact exists to deploy. |
