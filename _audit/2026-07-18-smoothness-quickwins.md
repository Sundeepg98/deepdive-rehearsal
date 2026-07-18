# 2026-07-18 — Smoothness quick-wins wave (QW1–QW3): 3/3 CLEAN, merge-ready

The three opacity-only quick wins from the 2026-07-18 manual-smoothness fix map (`2026-07-18-manual-smoothness-analysis.md`, RC-B and RC-C), built in three isolated worktree branches off base `54596e7`, each cold-verified by an independent verifier with its own instrument and a negative control on the base build.

## BOUNCED / UNRESOLVED

**NONE.** Coverage complete (3 expected / 3 delivered, no dropped agents). All three wins came back **CLEAN on the first cold verify — 1 round each, zero bounces**. One pre-merge *recommendation* (not a bounce) stands on QW2: its loaded-box full-gate runs were 38–40/40 with every red attributed to sibling-agent load and every check green in ≥1 full run — take the clean 40/40 run-of-record on a quiet box at merge time (the serial merge gate provides exactly that anyway). Details in "Pre-merge notes".

## Verdict table

| # | Win | Branch | Commit | Verdict | Rounds | Key numbers |
|---|-----|--------|--------|---------|--------|-------------|
| QW1 | Crossfade the default path | `qw/crossfade` | `93dfae6` | **CLEAN** | 1 | The 3 genuinely dead swaps now fade 150ms opacity-only: topic 0→.95@107ms, home-enter 0→1@~205ms, dropdown 0→1@~156ms; pane switch **byte-identical** (panein untouched); rapid-repeat @+115ms restarts cleanly; gate **40/40** (click_drift 118 w/ all 3 negative controls re-armed); VR **16/16, worst diff 0 px, zero re-captures**; verifier cold-reproduced flat-1.0 before / 0→1 ramp after, 2/2 runs |
| QW2 | `pop` reveal no-op | `qw/pop` | `c52df50` | **CLEAN** | 1 | **One BASE_SHEET definition revives 11 rules across 5 shadow scopes** (before: 0 animation events, `getAnimations()`=[] in 4/5 scopes); real mid-animation click lands @t=59ms; hit-tests 22/22 + 19/19 frames; reduced-motion 1e-05s in all 5 scopes; loaded-box gates 38/40→39/40→39/40 with **every check green in ≥1 full run** + reds attributed (see notes); verifier re-ran click_drift **118 PASS** + transition_deadzone **39 PASS**; commit = exactly 4 files / 4 deliverable hunks; zero re-captures |
| QW3 | Surface the keyboard layer | `qw/keys` | `c873aef` (impl `6821721` + VR re-capture `c873aef`) | **CLEAN** | 1 | `aria-keyshortcuts` **0 → 26** light-DOM (+≤6 shadow); 10 tab key-badges desktop-only, tab geometry **byte-identical (all 44px)** with badges force-hidden AND base→fix; keyov grade row was **wrong on 3 axes** → fixed; bonus fix: 3 modifier-chord leaks (Ctrl+P, Ctrl/Cmd+F, Alt+←); probes 44/44 (fixer, committed) + **74/74** (verifier, cold; base negative control 50/50); gate **40/40**, overlay_keyboard 47/7 dialogs; **12/16 VR baselines re-captured, justified; 4 must-not-change sha256-proven byte-identical** |

All three: not merged, not pushed, main repo tree untouched, no npm install/ci, no stash. Verified against base `54596e7`.

## Root causes (what the fixers actually found)

### QW2 — WHY `pop` no-opped: `@keyframes` are TREE-SCOPED in shadow DOM (the marquee finding)

**The brief's hypothesis was wrong, and the fixer measured it wrong before fixing it right.** The 07-18 analysis (RC-B) attributed the no-op to a missing `@starting-style` — but `pop` is a CSS **animation**, not a transition; `@starting-style` is a transition-entry mechanism and was never in play. The real mechanism:

- **Keyframes names resolve per shadow tree.** `animation-name` inside a shadow root resolves only against `@keyframes` defined in that shadow scope (its own or adopted sheets). A document-level definition in `styles.css` serves nothing inside shadow — proven empirically.
- **11 rules across 5 shadow scopes referenced `pop`** (drill `.speak`/`.mhp` + ANS_SHEET `.ans`/`.fu`/`.senior`; mixed-fire same family; mock-run `.mb-model`/`.mb-verdict`/`.mb-int`/`.mb-int2.show`; whiteboard `.wb-ans.show`; opener `.op-a.show`) — but the only in-scope definition lived in `DRILL_STYLE`. **One scope of five animated; four silently no-opped.**
- The failure is invisible to computed-style inspection: the broken scopes showed computed `animation-name: pop` + `0.25s` **applied**, yet `element.getAnimations()` returned `[]`, zero `animationstart` events ever fired, and opacity was already 1 in the click's own task. The answer just appeared.
- The `styles.css` copy was dead twice over: unreachable from shadow, and its only light-DOM consumer `.dnr` was stamped exclusively *inside* the drill's shadow.

**Fix (repo-native):** define `pop` ONCE in `BASE_SHEET` — the sheet all 17 shadow hosts adopt — byte-identical body; delete the `DRILL_STYLE` duplicate, the dead `styles.css` pair (`.dnr` + keyframes), and the dead `'dnr'` class stamp in drill `drawCard`. The in-shadow reduced-motion rule travels with the definition (1e-05s computed in all five scopes). Verifier confirmed the root cause independently (base `styles.css` DID carry the document-level copy and shadow still resolved nothing), confirmed the drill **still** animates after losing its private copy (the key internal regression risk of the move), and confirmed a static sweep leaves exactly one real definition and no orphaned shadow references.

**Correction to the record:** `2026-07-18-manual-smoothness-analysis.md` RC-B's "(0 `@starting-style`)" attribution for the pop no-op is superseded by this measured mechanism.

### QW1 — why half the app hard-snapped

Three distinct dead paths, one shared symptom (rAF-sampled opacity flat at 1.0, zero running animations on the first painted frame):

1. **Topic switch:** the pane switch replays `panein` by re-toggling `.pane.on`, but `setTopic` repaints the shadow panes **in place** — it never touches `.on`, so no animation ever restarts. One-frame snap after a ~43ms synchronous re-render stall.
2. **`#home` enter:** a bare `display:none → block` flip, no entrance animation.
3. **Topic-dropdown open:** a bare `hidden` toggle.

So ~half of state changes hard-snapped while the other half glided — exactly the operator's "no smoothness" percept. **Fix:** `.stage.topicswap → @keyframes stagefade` (opacity + 2px blur, `--duration-fast` 150ms, `--ease-glide`) stamped synchronously in `afterTopicSwap` — it decorates the already-swapped frame, never defers it; `#home` gains `homein` (opacity-only — boot surface), `.tn-menu:not([hidden])` gains `menuin`; **menu close stays instant** so a dismissed menu can never eat clicks. Deliberately NO `startViewTransition` (stays torn out per its removal rationale; verifier count 6==6, dead module only) and NO transforms (hit-tests/geometry untouched — the exact class `click_drift`'s planted-defect control polices, re-armed and detected this run). The two already-faded paths (pane switch, home leave) were measured and left byte-identical. Reduced-motion: two CSS belts + a JS `matchMedia` gate on the stamp — added after the fixer caught a 1412ms forced-layout stall re-stamping the parked class under emulated reduce (the residual ~180ms second-switch stall is proven pre-existing: 178.8ms base vs 191.7ms fixed, same probe). All 10 `position:fixed` elements live outside the blurred subtrees on both builds (containing-block trap empty).

### QW3 — discoverability was never built (and testing the bindings exposed a real defect)

The QWERTY keymap shipped in `shell.js` with **no surface representation anywhere**: no badges, zero `aria-keyshortcuts` document-wide, and a keyov overlay **written from memory rather than from the bindings** — its grade row documented two keys with wrong labels ("1 2 — Solid or Revisit") while the buttons themselves carried [1][2][3] hints; tested reality is 1=Missed, 2=Shaky, 3=Solid. Hence RC-C: 22/22 shortcuts worked and ~100% of users pointer-drove anyway.

**Bonus defect found by testing instead of trusting:** every document-level single-key handler ignored modifier state, so browser chords leaked into plain-key bindings — **Ctrl+P opened the Session panel underneath the print popup, Ctrl/Cmd+F hijacked find-in-page, Alt+ArrowLeft stepped the walkthrough**. Fixed with a layout-aware guard (blocks Cmd-anything, Ctrl-without-Alt, Alt+non-printable; deliberately passes AltGr/Option punctuation and Shift, since `?` IS Shift+/ — AltGr+`\` still opens the index). The fixer's committed probe has been seen red: on base it failed 2/35 by catching the pre-existing Ctrl+P double-fire. Verifier note for future probes: its first base run proved that testing Alt+ArrowLeft from step 1 is a check that cannot fail — test from step 2.

## Baseline changes

| Win | VR baselines | Justification |
|-----|--------------|---------------|
| QW1 | **None** — 16/16 matched committed pixels, worst diff 0 px | Captures are at a proven rest state; completed fades leave rest pixels untouched (opacity 1, blur 0, `.topicswap` removed on `animationend`). `vr:update` never run. |
| QW2 | **None** — 16/16 in every run | Completed pops land exactly on the captured rest state (opacity 1, transform none). |
| QW3 | **12 of 16 re-captured** (`vr:update`; thresholds untouched: channelTol=2, maxChanged=32) | **One cause: the new visible-at-rest badge column in the sidebar** (gate's own diff on walk-light: 755 px in a 16×248 box at x=252 = exactly the badge strip). Re-captured set = precisely the desktop topic-views that show the sidebar (walk/drill light+dark, sys/num/wb light, 5 room shots). **The 4 that must not change did not:** home-light/dark (home hides `.app`, no sidebar) and m-walk-light/dark (badges `display:none` <920px) proven **byte-identical** via the committed pre-update sha256 record (`_audit/qw3-keys/pre-update-stable-baselines.sha256`, verifies OK post-update; git records no change to those 4 PNGs). Verifier audited scope honesty: commit `c873aef` touches exactly 12 PNGs + manifest.json (manifest diff = timestamp + 12 sha lines), nothing else under `test/` or `tools/` on the whole branch. |

## Pre-merge notes

- **QW2 quiet-box run-of-record.** Full-gate runs on QW2 executed under sibling-agent load (48 procs / 71% CPU measured): 38/40, 39/40, 39/40 — every check green in ≥1 full run. The three reds, each attributed with evidence: (1) `css_syntax` — the fixer's own styles.css tombstone comment contained the literal text "@keyframes pop", tripping its comment-blind regex; reworded, green since; (2) `overlay_deadzone` — a bare process crash in run 1 (Node-version tail), passes 35/35 standalone and in runs 2–3; (3) `click_drift`'s own planted-defect negative-control canary — a 400–500ms injected slide racing trusted-click delivery, documented at 397–1580ms under saturation in `_boot.cjs`; passes 118/118 standalone ×2, 3× concurrent against base, and base+fix simultaneously under 6-core synthetic saturation; its probe path never runs the pop animation. The fixer armed a load watcher (task `bmgvr01zn`). **The serial merge gate IS the quiet-box run — just don't run it with sibling fleets active.** (QW3 saw one intermediate flake of the same click_drift canary under full-gate concurrency; its committed re-run is green 40/40.)
- **Serial merge + deliverable rebuild.** All three branches rebuilt the generated deliverable, so it will conflict pairwise; resolution is the established recipe (merge sources, regenerate the deliverable — `2026-06-29-batch1-verification.md`). Source overlap is minimal but real: QW1 and QW2 both touch `styles.css` (QW1 adds keyframes; QW2 deletes the dead `.dnr` pair) — different regions, trivial merge.
- **Merge order is flexible on VR evidence:** QW1/QW2 leave rest pixels untouched (both proved 16/16 worst-0px against committed baselines), so QW3's 12 re-captured baselines remain valid whether QW3 merges first or last; each serial gate run confirms.
- **Reduced-motion is covered in all three** (the blank-page bug class from the 07-11 audit cannot recur): QW1 base opacity is 1 everywhere + matchMedia-gated stamp, all six verifier arms op 1.0 from first frame; QW2 zero-width active intervals in all five scopes, nothing invisible; QW3 introduces zero motion, badges paint op 1.0, keyov readable.

## Evidence

- **Rerunnable instruments (committed / in-worktree):** QW3 `_audit/qw3-keys/probe.cjs` + badge shots `_audit/qw3-keys/badges-*.png` + `pre-update-stable-baselines.sha256` (committed on `qw/keys`); QW2 `_probe_pop.cjs` / `_probe_pop_after.cjs` (worktree root, untracked, rerunnable).
- **Session-scratchpad artifacts (ephemeral):** QW1 fixer frame captures (`frames/`) + verifier `qw1-coldverify-probe.cjs` + BASE/FIXED/FIXED-reduce JSONs + `qw1-shots/`; QW2 verifier `pop_probe.cjs` + base/fixed/fixed-rm JSONs; QW3 verifier `qw3-verify.cjs` + `qw3-out/` (results JSON + 10 shots).
- **Worktrees:** `D:/claude-workspace/_worktrees/deepdive-rehearsal/{qw-crossfade,qw-pop,qw-keys}` — tracked files clean == HEAD at verification on all three.

*Wave synthesized 2026-07-19 from per-win fixer reports + independent cold verdicts (all 1-round).*
