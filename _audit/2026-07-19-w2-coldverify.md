# 2026-07-19 — W2 COLD-VERIFY (w0-verifier)

**Branch `flow/w2-spine`, code tip `1770c99`, freeze `953bf7e`, off master `3c16db5`.**
Independent cold verification of the frozen W2 spine. Own instruments throughout (scratchpad `w0-verify/w2a-d.cjs`, `vrdiff2.cjs`); the freeze report + gates were read as claims to test, never as my oracle. No push, no merge, no source edits.

## VERDICT: **CLEAN** — merge-ready. 0 blocking findings; 1 non-blocking doc note (VR scoping).

---

## 1. Independent full gate (from the clean tip)
`python3 test/check_all.py` on the frozen worktree: **GATE: PASS — 45 checks, 0 real FAIL** (the single `FAIL` grep hit is the benign "0 failed"/"0 fail" zero-count in unit_tests/compiler_md). Green incl. **flow_cursor, flow_contract**, flow_handoff/flow_data/flow_evidence (W1 gates hold), progress_merge, card_identity, visual_regression (16 baselines matched), and `build_integrity` = "COMMITTED deliverable == fresh build of HEAD". Independently reproduces the freeze's 45/45.

## 2. THE INVARIANT — restore-never-regrades (own instrument, `w2a.cjs`)
Mechanism confirmed in source: `drillgraded` fires at drill/logic.js:680 **inside judge()**, never in renderD; the restore path (renderTopic→posRestore→renderD, no judge) cannot snapshot; Progress.snapshot MERGES by content-id (progress.js:204-208, only this session's graded ids). Behaviorally proven:
- **Core (byte-identical):** graded 5 probes on a topic (record written), reload + re-enter the topic → cursor restored to probe 5, and `progress.<id>` is **BYTE-IDENTICAL incl. ts** (RESTORE_HAPPENED ∧ RECORD_BYTE_IDENTICAL both true).
- **Completion-reset (D2):** graded all 21 → cursor stored 0 → re-entry lands at probe 1 (di=0).
- **Tier write-guard (D3):** grading in the SDE2 tier does NOT overwrite the study cursor (stayed drill:4). Study-mode + all-tiers + not-revisit only.

## 3. Negative-control re-witness (planted, ran, observed RED myself)
- **resume-penalty:** reverted the debrief denominator to full-bank (`this.got / cards.length`) → flow_cursor RED on exactly "resume-penalty: a perfect resume of 5..end reads 100% of THIS RUN, not ~77% of the bank"; structural-equivalence stayed GREEN.
- **byte-identical / merge:** broke the merge (`cardsMapOf(prev→null)`) → flow_cursor RED on "restore-never-regrades: 0..4 kept, done reaches the full bank, not this run's" while restore-in-isolation-byte-identical stayed GREEN (orthogonal).
- **one-compute (flow_contract):** appended 'X' to the dock label → flow_contract RED on "dock label == flowRec button" (×2) + "dock is data-driven"; pip/keys/nav stayed GREEN.
Both new gates genuinely encode the design; not checks-that-can't-fail.

## 4. Deviations D1–D5 — all DESIGNED, not regressions
- **D1 (this-run debrief denominator):** source (drill/logic.js:691) + behavior + plant confirm. Kills the resume-penalty; full-run equivalence is STRUCTURAL (results.length == cards.length ⇒ identical old math), gated by structural-equivalence. Copy is un-misreadable ("of N answered this run"). SOUND.
- **D2 (completion-reset):** verified (§2). A finished study walk resets the cursor to 0; progress_merge/card_identity rely on it. SOUND.
- **D3 (drill PROBE, study-only):** write-guard (drill/logic.js:496) is study+all-tiers+not-revisit; mock/quick not persisted (avoids the 22-min timer + reshuffle side effects). SOUND.
- **D4 (boot-safe flowRec):** a robustness fix to my W1-verified flowRec/sessStats. Guards `getStats` against an UN-UPGRADED element (not just null) + un-init mixLog/mock globals; falls back to the canonical record. Verified: deep-link into #walk with pos.walk=lastStep (the pre-fix throw scenario) → **0 page errors**, flowRec runs. Normal path byte-identical to W1 (guard only fires in the boot race). No W1 regression. SOUND.
- **D5 (home keeps RESUME semantics, not "NextUp large"):** a team-lead scope ruling with recorded rationale (resume-to-terminal is no longer a dead end post-W1; NextUp-on-home would teleport past the W1 receipt; the sessStatsFor(id) adapter cost). Not a code defect — a deliberate, reversible scope decision. I concur with the rationale. SOUND.

## 5. One-compute / deferral compliance (`w2b.cjs`)
- **Parity:** forcing flowRec to each target moves BOTH the dock CTA (`#ndock .nd-go`) and the pip/CTA to the same surface (drill/wb→seg pip, mock/mix→`#mockopen`/`#mixopen` CTA). flow_contract proves dock==pip==#ssgo byte-identical (green + red-witnessed). pickRec remains the only ladder; flowRec the only meso compute; #ssgo now renders flowRec (never button-less).
- **Deferral:** `dockArmedKeys()` reads only the CURRENT visible pane's `atJudgment()` (drill), never a hidden pane. One clamp (`posRestore`) serves the panes AND the home sub-line.
- **Boundary-suppression (beat 3):** mid-drill the dock is HIDDEN/quiet; at a judgment point it arms "Grade 1 Missed 2 Shaky 3 Solid" (a legend, never a CTA) and disarms after grading.
- **Home resume sub-line (beat 2/D5):** with proper seg-tab routing, the engaged Resume CTA shows "Probe Drill · probe 9 of 21" via the SAME `posRestore` clamp the drill restores with (`w2c2.cjs`).

## 6. VR (`vrdiff2.cjs`) — visual_regression PASS (16 baselines)
The 10 changed baselines (num, sys, walk-light/dark, wb, 5 rooms) decoded master 3c16db5 → 1770c99: **every change is confined to the LEFT SIDEBAR column** (x≈3-295, y≈207-800); **zero changes in the main pane content**. The change is substantial (~6.6-9.5%) because the desktop Continue dock, inserted between `.side-id` and `.mockcta`, shifts the sidebar content below it down. Honest dock footprint. Fold budget respected: dock height 55px (≤64 cap), mock CTA on-screen at y=365 (bottom 365 ≤ 800). reduced-motion: strip/dock have no animation.

## 7. BEAT 4 (mobile dock) — SEVERED, concur
The mobile `.sidebar .mockcta` is already a load-bearing fixed bottom bar; anti-goal 8 requires ABSORB-not-stack, making beat 4 a redesign of a drift-sensitive surface guarded by the strictest gates. Severing at the tail of a long session over freezing the gate-green core is the right risk call. No mobile code written; reversible (board #37).

---

## FINDINGS

**Blocking:** none.

**Non-blocking:**
1. *VR scoping (documentation).* The freeze report §VR states "No VR baseline regeneration needed … visual_regression PASS unchanged (16 baselines)." That is accurate **only for the author's beats 2-3**. The desktop Continue dock (spine commit `271e4c4`, "authored before this pass — not mine") DID regenerate **10 desktop baselines** with a ~9% change (the sidebar content shifts down below the inserted dock). The change is honest (localized to the sidebar, no pane-content changes, gated green, fold budget respected), but a reader of §VR could miss that W2 as a whole regenerated 10 baselines. Recommend the merge note (or an addendum) record the dock's baseline regeneration for completeness. No code action.

---

*Instruments: `scratchpad/w0-verify/w2a.cjs` (restore-never-regrades), `w2b.cjs` (one-compute/D4/dock-boundary), `w2c2.cjs` (home sub-line), `w2d.cjs` (fold budget), `vrdiff2.cjs` (VR decode), plus the planted artifacts art_w2_fullbank/nomerge/dockdiverge.html. Verdict CLEAN — W2 ships the spine, the honest cursor, and the one-compute contract; restore-never-regrades holds at the mechanism and behavior level.*

---

## ADDENDUM (post-merge, 2026-07-19 ~22:05 IST) — the verifier instrument's OWN negative control

*Recorded by team-lead from w0-verifier's post-merge report; the verifier's direct file update was
lost when the w0-data worktree teardown raced it (uncommitted edits; teardown-precondition lesson
recorded in the fleet-hazards memory). Content reconstructed from the verifier's message verbatim
in substance.*

The original pass proved the PRODUCT's checks can fail (§3) but had not explicitly demonstrated the
**verifier's own probe** (`w2a.cjs` RECORD_BYTE_IDENTICAL) failing. The verifier closed that gap
post-merge, per the dispatch standard ("demonstrate your instrument's negative control before
trusting its green"):

- **Plant:** a fake regrade injected INTO the product's restore site (`if (_pd > 0) {…}` in
  drill/logic.js — flips `got` in `progress.<id>` on restore; the freeze report's check-1 plant),
  in a SCRATCH copy — the worktree artifact untouched.
- **Own-probe result:** `w2a` → RECORD_BYTE_IDENTICAL = **false** (before got:3 → after got:4,
  caught). The byte-comparison probe genuinely detects a regrade; its §2 green is not vacuous.
- **Gate re-witness:** flow_cursor → RED on exactly "restore-in-isolation writes NOTHING to the
  grade record (byte-identical incl. ts)" — the freeze's check 1, independently re-witnessed
  (check 3 was already re-witnessed in §3 via the full-bank denominator plant).

Also recorded: the §1 gate ran on the committed tip with `build_integrity`'s HEAD-match
("COMMITTED deliverable == fresh build of HEAD") proving build-freshness — deliberately
non-mutating in the junction-backed tree, equivalent to a destructive rebuild.

**Verdict unchanged: CLEAN.** The addendum only strengthens the §2 instrument's standing.
