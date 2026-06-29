# 2026-06-29 — Batch 1 Build Verification (rescues + must-hit-points)

Operator's chosen next-build batch ("Quick rescues + must-hit-points"), built in
two worktree-isolated agents, browser-verified, serial-merged GATE-gated, pushed,
CI-deployed live. **5 features.**

## Merged to master

| # | Feature | Commit | Source worktree |
|---|---------|--------|-----------------|
| 1 | Must-hit-points grounded drill self-scoring | `ad0bec1` | build/must-hit-points |
| 2 | text-zoom (A-/A+ reading size) | `12a5b2b` | build/rescues |
| 3 | pomodoro (25/5 focus timer) | `12a5b2b` | build/rescues |
| 4 | page-visibility (pause anims when hidden) | `12a5b2b` | build/rescues |
| 5 | scroll-to-top (window back-to-top) | `12a5b2b` | build/rescues |

master chain: `e93ed7b` (3D card-spotlight) -> `ad0bec1` (MHP) -> `12a5b2b` (rescues).
Both CI runs "Deploy to GitHub Pages (gated on THE GATE)" = success (14s each).

## Must-hit-points (ad0bec1) — what it is
Grounded self-scoring for the Probe Drill. At the judge stage each probe shows a
"Must-hit points" checklist = the bolded `<b>` terms from THAT card's own answer
(`a`) + senior tell (`senior`) — NOT the 9 generic Model-Answer scripts (those are
not 1:1 with the 21 probes). Ticking drives a live "Covered N/M" + a coverage
recommendation that highlights Solid (full) or Revisit (gap) on the grade buttons.
The debrief now names the exact phrase dropped per revisited probe
("dropped: because of backpressure") — fixes the "can't name what you missed" gap.

- Files: `src/scripts/app/drill/logic.js` (+82) + deliverable only. `cards.js`
  byte-identical (data-file unit tests stay green).
- Compat: `judge(ok)` still drives got/shk; `getStats()` returns the unchanged
  `{dTot,dDone,dGot,dShk,revisit}` shape -> CPR1 + session-progress untouched. The
  `cov` field is purely additive.
- Verified (Playwright, light+dark, 0 console errors): per-probe term extraction
  varies correctly (probe1=7, p2=4, p3=3, p4=3, p5=2 terms); ticking 0->1->2 flips
  rec "dropped N - consider Revisit" <-> "all covered - Solid" and moves the .j-rec
  highlight Revisit<->Solid bidirectionally; Quick-5 debrief lists "dropped: ..."
  per revisited probe; getStats() shape exact.

## The 4 rescues (12a5b2b) — all offline-safe (no storage/network/permission APIs)
- **text-zoom** (`#textzoom`, sidebar): A-/A+ over 5 levels (0.85-1.16, default 1.0),
  session-only `--read-zoom` on `.stage` (uses `zoom` to cross the shadow boundary,
  not font-size). Verified: clamps at both ends, buttons disable at extremes.
  CSS `@media(max-width:919px){display:none}` (desktop-sidebar feature).
- **pomodoro** (`#pomodoro`, sidebar): 25/5 focus/break SVG ring, play/pause/reset,
  best-effort WebAudio chime, deliberately separate from SessionTimer. Verified:
  25:00 Focus -> play -> 24:58 (ring animates, aria flips) -> pause freezes ->
  reset -> 25:00.
- **page-visibility** (no UI): `visibilitychange` -> toggles `body.is-hidden`
  (CSS pauses animation-play-state on all descendants) + `window.__appHidden` +
  `app:hidden`/`app:visible` events. Verified: hidden->true/event, visible->false/
  event, and a live `railin` animation went running->paused under `body.is-hidden`.
  Pomodoro intentionally opts out (a focus timer must track real time).
- **scroll-to-top** (`#scrolltop`, body): shows past 400px **window** scroll, smooth
  scroll to top, re-hides, resets on `routechange`. Verified the window (not `.stage`)
  is the real scroller; `.show` activates past 400, opacity settles to 1, click->y=0.

## Merge mechanics (note for future multi-worktree merges)
rescues branched off `e93ed7b` (before MHP), so the two builds' SOURCE files are
disjoint (drill/logic.js vs app.js/styles.css/4 new modules) — only the GENERATED
deliverable overlapped. Resolved by `git checkout build/rescues -- <6 source files>`
onto the MHP master (leaving drill/logic.js as master's MHP version), then
`build.py` to regenerate the deliverable from the union. Clean, linear, no merge
commit, both feature sets present. GATE PASS (478936 B, 42 modules, 47 files).

## Branches preserved (NOT deleted)
build/must-hit-points @ ad0bec1, build/rescues @ 3319008 retained for re-audit.
The 4 remote feature branches still pending the operator-gated cleanup (#9) — now
UNBLOCKED: every salvageable item (3D card-spotlight, zoom+swipe, visual track,
SPA core, guard tests, + these 5) is merged; nothing else needs them.
