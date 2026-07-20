# Correctness wave — cold-verify verdict (2026-07-20)

**Verifier:** w3-verifier (independent cold verifier; shares no context with the fixer).
**Branch:** `fix/correctness-wave`, frozen tip **430c547** (code tip 7b40071), 7 commits off `master` @ ffa6187.
**Deliverable under test:** `deepdive_content_pipeline_rehearsal.html` (11,748,602 bytes), rebuilt by me from the frozen tip.
**Instruments:** the fixer's own checks (re-run, each with its pre-fix negative control re-witnessed) + one new probe (`envelope_probe.cjs`, negative-control demonstrated). All instruments live untracked in scratch, outside the repo. The tree was never touched — `git status` clean, HEAD still 430c547, at start and end.

## VERDICT: CLEAN — merge-ready. Zero BLOCKING findings.

Every claim in the freeze report that I could test, I tested against the genuine pre-fix artifact (not the fixer's word), and every one held. The independent full gate is green and reproducible; every new/extended check demonstrated teeth on exactly its defect; the flake-hardened FAB check still fails when the defect is restored; the fix-4 behavior change does not leak; the VR regen is exactly 2 baselines; and both recorded deviations are sound.

---

## Item 1 — Independent full gate on the frozen tip: **PASS**

Built (`npm run build`, exit 0, deliverable synced 11,748,602 bytes) then `python3 test/check_all.py`, run to completion, **verdict read from a capture file** (`scratch/gate_full.log`), never a piped exit code.

- **`GATE: PASS` — 49/49 checks PASS, zero FAIL, zero SKIP.** Every browser check ran (Chromium present; none skipped).
- **`build_integrity PASS ... COMMITTED deliverable == fresh build of HEAD`** — the direct strong form (not the "DEFERRED" variant the freeze report's confirming run showed; I built from the frozen tip where src+deliverable are already paired). Charter item 1's build-integrity requirement is met directly.
- **Post-build `git status --porcelain` was empty** → the fresh build reproduced the committed deliverable byte-for-byte (build determinism held on this box, win32-chromium149).
- The three new checks (`no_dead_ends`, `trend_integrity`, `scoreboard_resume`) and the extended `flow_contract` are green, alongside `visual_regression` (16 baselines) and `build_determinism` (88 Shiki blocks under a simulated 600ms/line stall).

## Item 2 — Negative-control re-witness of every new check: **PASS (all teeth confirmed)**

Primary method: run the branch-tip checks against **master ffa6187's committed deliverable — the genuine pre-fix artifact** (verified pre-fix: all four fix anchors `_focus-exit`/`score-cap`/`atDebrief`/`drillAtTerminal` are absent from it, present in HEAD's build). No rebuild, no hand-approximation. Reds observed = exactly the fix-specific assertions:

| Check | Result vs pre-fix master | Reds (the defect, re-witnessed) |
|-------|--------------------------|----------------------------------|
| `no_dead_ends` (fix 1) | FAIL | 12 focus reds: chip absent (structural/exists/displayed/inView/reachable/44px/plant), **Escape a no-op**, chip-click no-op, mobile ×3 |
| `no_dead_ends` (fix 2) | FAIL | FAB↔CTA **overlap** at [360] and [390] (the discriminator the freeze report names) |
| `trend_integrity` (fix 3) | FAIL | legacy blob renders **`cmp-bad`** (not discarded); no build-it-up hint; `{t,c}` same-topic points don't compare; storage **double-encoded** |
| `flow_contract` (fix 4) | FAIL (only the debrief block) | `atDebrief` false; dock CTA absent; **phantom grade legend PRESENT** (the re-planted stale `_judgeOn`); `n` inert. All 13 W2 one-compute assertions stay green |
| `scoreboard_resume` (fix 5) | FAIL (only the caption) | "This run" caption absent. The four pre-existing behaviors (record holds 3, cursor restored, tiles 0/0, record intact) stay green |

Each red matches the freeze report's described plant. `flow_contract` and `scoreboard_resume` self-isolate at master (W2 and the resume mechanics already shipped there), so the reds are cleanly attributable to the fix-4 / fix-5 additions.

## Item 3 — Flake-fix teeth (commit 7b40071): **PASS — teeth intact**

7b40071 replaced the flaky real-scroll-reveal FAB check with a **force-`.show` deterministic geometry check** after the first final gate flaked. To prove the replacement can still fail, I reverted **only fix 2** on the otherwise-fixed HEAD build (scratch copy `neg_fab.html`: the fix-2 `@media(max-width:919px)` `.scrolltop` rules restored to base centered-low positioning, everything else fixed) and re-ran `no_dead_ends`:

- **Exactly 2 reds** — `[360] FAB…overlap` and `[390] FAB…overlap` — while **all focus-exit assertions stayed green** (fix 1 intact).

So the force-show geometry check fails precisely when the pre-fix FAB positioning is restored and nothing else changes. It is not a check that cannot fail; the overlap discriminator survived the flake hardening. (Confirmed twice — it also fires red on the genuine pre-fix master build.)

## Item 4 — Fix-4 behavior envelope (no leak): **PASS**

The debrief-as-meso change is designed (real "Re-drill weak spots →" CTA + live `n` + no armed legend at the drill debrief). It does not leak:

- **Mid-drill judgment points still arm the grade legend** — `flow_contract` line 78 (`micro armed keys … 1/2/3 … not a CTA`) PASS on the fixed gate, and also PASS at master (fix 4 didn't touch it).
- **Mock mode still never arms** — the shipped deliverable carries `atJudgment() { return !!this._judgeOn && this.mode !== 'mock' && this.di < cards.length; }` and `atDebrief() { return this.mode !== 'mock' && this.di >= cards.length; }`. Both exclude mock, and fix 4 only *tightened* `atJudgment` (added the `di` guard, kept the pre-existing mock exclusion) — so there is no code path by which fix 4 can newly arm in mock. *(Method: code inspection of the built artifact; the guard is a simple boolean exclusion, not a runtime-drivable behavior gap.)*
- **Non-drill panes unaffected** — shipped `nextUp` gate is `if (rec.tab === curTab && !drillAtTerminal(curTab)) return { tier: 'micro', … }`, and `drillAtTerminal(tab)` short-circuits `false` for any `tab !== 'drill'`; the meso/macro fallthrough is unchanged. Confirmed at runtime: a `sys` reading pane still shows the meso CTA == flowRec.
- **dock == pip == #ssgo parity at the debrief** — the gate checks dock==flowRec at the debrief but not pip/#ssgo there, so I ran `envelope_probe.cjs` against the fixed build: at the drill debrief, **dock label == #ssgo label == flowRec button ("Re-drill weak spots →"), and the seg pip sits on flowRec.tab (drill)** — all three surfaces agree. (Negative control demonstrated: vs pre-fix master the probe goes red on `atDebrief` and the **dock** parity — the dock was the broken surface at master; pip/#ssgo were already correct there, and fix 4 brings the dock into line.)

## Item 5 — VR surgical claim: **PASS — verified by hash**

Blob-hash comparison of every baseline, master ffa6187 vs HEAD:

- **Exactly 2 PNG baselines differ:** `drill-dark` and `drill-light`. The **other 14 are byte-identical** (blob-hash SAME). 16 baselines both sides — none added or removed.
- **`manifest.json` changed only the 2 drill `sha256` entries** (drill-light `1a633e09→4ba249fb`, drill-dark `8778f05a→d68a043e`); nothing else in the manifest moved.

Matches the freeze report's claim exactly. The regen is justified by the caption's ~20px vertical shift on the drill pane.

## Item 6 — Deviations judged against recorded rationale: **both sound**

- **Fix 5 — RELABEL over seed-from-record (ratified):** the tiles are genuinely this-run counters the debrief depends on — shipped `drill/logic.js:710` `const pct = Math.round(this.got / Math.max(1, this.results.length) * 100)`, and the round-end announcement (`:479`, `:697`) reads `got`/`shk`. Seeding the tiles from the canonical record would inflate `got` relative to the actual this-run `results.length` and corrupt that denominator — the exact W2 D1 mirror. Relabel is the honest fix. **Correct.**
- **Fix 3 — DISCARD legacy untagged trend points (never misattribute):** a topicless CPR point cannot be truthfully attributed to the current topic (that misattribution *is* audit #7). Discarding is the W0 honest-discard law. Re-witnessed by `trend_integrity`: the legacy point is discarded, not painted as this topic's regression. **Correct.**

---

## Coverage honesty (what I relied on vs. independently re-witnessed)

- **Independently re-witnessed:** my own build + full gate; every negative control against the genuine pre-fix master artifact; the isolated fix-2 teeth test; the VR hashes; the fix-4 debrief parity (runtime probe with its own negative control).
- **Relied on code inspection (not a runtime drive):** "mock mode never arms" — the shipped `mode !== 'mock'` guards in both `atJudgment` and `atDebrief`, plus the fact that fix 4 only tightened `atJudgment`. Defensible for a boolean exclusion; flagged here for honesty.
- **Not re-checked (out of charter scope):** the 21 P2/P3 audit items the wave deliberately deferred; the parity-debt ledger; content depth. This verdict certifies the 5 fixes + their gate wiring, not the whole audit backlog.

## Hygiene
No `npm install/ci` in the junctioned worktree; no `git stash`; no source edits, commits, push, or merge. **No image-wide `chrome.exe` taskkill** — every Chromium I launched was spawned by a check/probe and self-closed via `browser.close()`. All instruments and captures are in the OS scratchpad, outside the repo.

**Handoff:** CLEAN → team-lead runs the merge train. This file is written UNTRACKED per charter; commit it as handoff mechanics if desired.
