# CODE-LANE audit — drift-fixer's click-drift fix (a7b0dc9 + f31d730 on fix/n-drift)
Auditor: determinism-verifier (CODE side only; drift-verifier owns BEHAVIOR, independent). 2026-07-18.

## OVERALL: CLEAN — no bounce.
The fix is sound and correctly scoped; the check is genuinely armed (red-green witnessed, negative
controls fire); the 12 baselines are correct by my own decode/diff AND a 0px fresh capture. Two NON-
blocking notes below (a comment nit + a cross-workstream recommendation).

## Item 1 — the 12 rebaselined PNGs: CLEAN
My OWN decode+diff (scratchpad/baseline_diff.cjs, using test/_pixels.cjs decoder, not their maps):
- All 12 changed baselines (1280x800): changed-pixel right edge 279–290px; paneChanged(x>=320)=0 on
  EVERY one -> pane content pixel-identical, delta confined to the left sidebar column (claim: ~291px).
- room-data-storage moves most (83,624 changed px, widest bbox x7..290) — matches the "caching's short
  locator was beside the badge, now on its own row" explanation.
- home/mobile are NOT in the changed set -> "home and mobile unchanged" confirmed.
- visual_regression PASS: 16 baselines, worst = 0px (incl. mobile m-walk 390x844). "Fresh capture matches
  every committed baseline at 0px" — verified.
Evidence: n-drift/_verify/visual_regression.txt ; scratchpad/baseline_diff.cjs output.

## Item 2 — click_drift.cjs honesty (red-green re-witnessed MYSELF): CLEAN
- Real hit-tested input: page.mouse.click throughout (not el.click()). Verified in source (lines 351/379).
- FOUR negative controls welded in and WITNESSED firing on both runs (fixer said "three"; there are four):
  tab-drift (BREAK_SIDEBAR), pane-switch (BREAK_PANEIN), topic-switch (BREAK_TOPIC), reduced-motion
  (opacity:0). Each hard-finish(1)s if its planted defect isn't detected. On my runs: re-injected slide ->
  28px click lands on <li>; topic-path animation -> miss; opacity:0 -> 0% ink. Not decoration.
- Anti-vacuity + coverage gates present and PASS (switch-happened, both-title-kinds, >=3 panes x 5 delays).
- RED-GREEN, observed not assumed:
  - PRE-FIX (reconstructed: reverted styles.css to 41f09dc, rebuilt): CLICK DRIFT: FAIL (11/128), exit 1.
    Dominated by the real defect — all 9 pane tabs move 55.6px (y=502.1 "Caching Strategies" vs 557.7
    "Stream and Batch Processing"), exactly the claimed magnitude.
  - FIXED (committed deliverable): CLICK DRIFT: PASS (128/128), exit 0, all delays land.
Evidence: n-drift/_verify/clickdrift-prefix.txt ; n-drift/_verify/clickdrift-fixed.txt.

## Item 3 — the timing-dependent failure count: ACCEPTABLE (no deterministic settle needed) + NOTE
Judgment: the +60ms sample does NOT need a deterministic settle, because the check is deterministic where
it matters: (a) the FIXED build passes 128/128 deterministically — zero displacement means no timing
sensitivity; (b) the negative controls run at +0ms, where displacement is maximal and the miss is
deterministic; (c) the 9 tab-drift + 1 behavioral fails are a DETERMINISTIC BACKBONE (55.6px is a static
layout measurement), so the check can NEVER false-green on the defect regardless of timing.
NOTE (not a bounce): the "14-15 of 128" pre-fix count UNDERSTATES the variance — I measured 11 under heavy
load (the timing-dependent panein click-miss arm gave 1 miss vs their 4-5). Suggest the comment describe
the deterministic backbone (">=10 from tab-drift; the panein arm adds a timing-dependent few") rather than
a specific flaky number, so a future reader doesn't treat "14-15" as an invariant.

## Item 4 — gate triage / contention: build_integrity PASSES DIRECTLY; contention is a gate-reliability finding
- build_integrity.py run directly in n-drift: PASS (exit 0, 31s, "matches committed, 9 panes + 7 overlays").
  The 7 "transient" reds under the ~25-min full gate are a gate-reliability issue (checks crash under
  resource pressure), NOT a merge blocker — merge-time gates run on a quiet box.
- FINDING (cross-workstream): n-drift is based on 41f09dc and LACKS the shiki determinism fix (685ef36;
  tokenizeTimeLimit count = 0 in tools/compiler/shiki-highlight.mjs). So build_integrity here is ALSO
  exposed to the ~10% shiki wall-clock flip, which CONTENTION TRIGGERS (the budget is a wall clock) — a
  "rebuilt != committed" transient distinct from a process crash. Recommend n-drift pick up 685ef36 (via
  the merge queue / rebase) to eliminate that axis; it's already merged into compiler-parity.
Evidence: n-drift/_verify/build_integrity.txt.

## Item 5 — cta_contrast: orthogonal + pre-existing (#6); did NOT fix
- The two commits touch ZERO cta/mock/button-contrast code (only .side-id + panein) — confirmed by name-
  only + styles grep. So cta_contrast's result is independent of the click-drift fix.
- One run: PASS (36 CTA x room x theme; DARK band worst 5.20:1 — only 0.20 above the 5.0 floor). This run
  passed; the near-floor DARK margin corroborates drift-verifier's "contrast-value jitter near the floor"
  second-axis concern. Flaky/pre-existing, owned by #6. Not introduced here; not fixed (per instruction).
Evidence: n-drift/_verify/cta_contrast.txt.

## Housekeeping
Both worktrees restored clean (n-drift @ f31d730, n-build @ 685ef36; only untracked _verify/). Pre-fix
reconstruction touched only src/styles.css (restored from HEAD) and dist/ (gitignored, rebuilt to fixed by
build_integrity). The committed deliverable was never modified.
