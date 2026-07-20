# D2-product wave — cold-verify verdict (2026-07-20)

**Verifier:** d2-verifier (independent; shares no context with d2-fixer).
**Frozen tip:** `feat/d2-grade-reveal` @ `fcbd3f0` in worktree `_worktrees/deepdive-rehearsal/d2-product`,
5 commits off `master` @ `dfbfe9d`.
**VERDICT: CLEAN — merge-ready on the engineering.** Zero BLOCKING findings. (The wave additionally
waits on the operator's C1–C6 copy nod — not an engineering gate, out of my scope.)

Every claim below was tested firsthand on the frozen tree; RED results are from deliberate plants
(deterministic structural defects), reverted after observation. The worktree is CLEAN at `fcbd3f0`
after all work; my instruments live outside the repo (session scratchpad), none committed.

---

## 1. Independent full gate — PASS (strong build_integrity)

`npm run build` then `python3 test/check_all.py`, foreground, verdict read from a capture file
(`scratchpad/d2-gate.txt`), not a piped exit code.

- **GATE: PASS.** 51 checks, **zero FAIL, zero SKIP** (the one "skipped" token is inside
  syntax_check's pass line — "52 aggregator files skipped", expected).
- **`build_integrity` reached the STRONG form:** `COMMITTED deliverable == fresh build of HEAD`
  (11759259 bytes, 0 unresolved). No DEFERRED — the tree was clean, no stray untracked file.
- Tree verified clean (`git status --porcelain` empty) both before and after the build; HEAD still
  `fcbd3f0`.
- The three new checks green alongside the full suite: `grade_reveal`, `search_deadend`, `cold_open`.
- `build_determinism` PASS, `visual_regression` PASS (16 baselines, all reached rest, matched pixels).

## 2. Negative controls — the new checks have TEETH (each planted, watched RED, reverted)

**`grade_reveal.cjs`** — plant: gate the reveal-stage row off (`if (stage >= 1)` → `stage >= 99`).
RED on **exactly** the reveal-moment assertions and nothing else:
- FAIL: in-pane grade row present at reveal (desktop + 360); Solid reachable at reveal (desktop + 360);
  the real-click-at-reveal record; the test's own hide-the-row plant.
- Correctly still PASS: push-further-offered (stage 1 pre-judgment), dock-quiet-at-reveal,
  maxStage-row-present, maxStage-dock-arms, merge. Precise discriminator on the fix. Reverted, clean.

**`search_deadend.cjs`** — two plants:
- *Disable chips* (`if (sys) renderSystemPrompt(sys)` → `if (false) …`): RED on the core
  "offers chips / every chip real / clicking routes" assertions for all 4 prompts; honest-miss and
  both anti-overfire assertions correctly stay green. Reverted.
- *Overfire* (`systemPromptMatch`'s final `return null` → return a fixed match, i.e. fire for any
  query): RED on **exactly** the gibberish anti-overfire assertion
  ("a gibberish miss shows NO component chips"). This is the charter's specifically-flagged risk —
  "an empty-state that fires for everything would be worse than the dead-end" — and the guard catches
  it. Reverted, clean.
- **Both anti-overfire assertions accounted for:** the *gibberish→0-chips* guard has proven teeth
  (above). The *genuine-hit→0-chips* guard is guaranteed **by construction**, verified in source:
  `renderSystemPrompt` has exactly ONE call site (`search-overlay.js:359`), lexically inside
  `if (results.length === 0)` (opened at `:351`) — when there are real hits the call is unreachable,
  so chips structurally cannot render on a genuine hit.

## 3. Grade-record invariant — PASS (my own instrument + its demonstrated negative control)

Instrument: `scratchpad/d2_record_probe.cjs` (independent of the fixer's test; reuses only the
shared `_boot.cjs` launch plumbing). Persisted record = `localStorage['ddr.v1.progress.<topicId>']`,
a contentId→level map (`snapshot()` writes only `{id, level}`; `cov{n,m}` rides on the in-memory
`results` entry, never persisted — the exact distinction 3(c) turns on).

- **(a)** A reveal-moment Missed click records **level 1 under the probe's CONTENT id**, `done===1`,
  one key, `shk===1/got===0`. PASS.
- **(b)** Latest-wins, ONE entry: Missed at reveal → re-drill the same probe → Solid at the end →
  record holds **level 3, done===1, exactly one card key, right id**. PASS.
- **(c)** The reveal grade records **`cov{n:0,m:0}`** = "coverage not assessed" — `m===0`, NOT a fake
  "0 of N" (which would be `m>0,n=0`). Mechanism verified: `_mhp`/`_cov` are **cleared** at reveal
  (`_mhp.length===0`). Contrast proven: a maxStage chain-grade DID assess coverage (`_mhp>0`,
  `cov.m>0`), so `{0,0}` is a genuine, distinguishable "not assessed". PASS.
- **(d)** **No record write/mutation** on mere reveal, on push-further, or on tab-away-and-back — the
  record stays `null` through all three until a grade is actually taken. PASS.
- **Instrument's own negative control (teeth demonstrated):** the probe CATCHES a planted phantom
  duplicate entry (two keys), a corrupted level (Solid flipped to Shaky), and a wrong content-id
  (record keyed by the wrong probe) — and still PASSES the genuine record. Discriminates both ways.

## 4. Boundary guard — PASS, and the guard has TEETH

- Witnessed firsthand: at reveal the **in-pane row appears** while the **sidebar dock stays quiet**
  (no `.nd-armed`); at maxStage the **dock arms**. The in-pane-vs-dock divergence is real.
- `_judgeOn` / `atJudgment()` **UNTOUCHED**: the only diff line naming them is inside the *added
  comment*; the assignment `this._judgeOn = (stage >= maxStage)` is present once and identical at both
  `dfbfe9d` and `fcbd3f0`.
- **Guard teeth:** plant an early dock arm (`_judgeOn = (stage >= maxStage)` → `stage >= 1`) →
  `grade_reveal` goes RED on **exactly and only** the "dock stays quiet at reveal" assertion (all
  others, incl. maxStage-arms, still pass). If a parallel wave re-arms the dock early, this catches it.
  Reverted, clean.

## 5. Reachability + keyboard — PASS

- **360px reachability:** the in-pane row is present and the Solid button passes a two-sided
  shadow-boundary hit-test at 360px (gate's `grade_reveal` + my re-run). PASS.
- **Keyboard 1/2/3 at reveal** (my instrument `scratchpad/d2_keyboard_probe.cjs`, real
  `page.keyboard.press`): pressing **3/1/2** at reveal records **level 3/1/2** under the right content
  id — on **desktop AND at 360px**. The digit handler (`shell.js:294-296`) gates on button *presence*,
  not `_judgeOn`, so the `[1]/[2]/[3]` hints are honest at reveal. PASS.

## 6. VR claim — PASS (verified by blob hash + pixel forensics)

- Exactly **home-light + home-dark** baselines regenerated; the **other 14 are byte-identical**
  (same git blob) to `master dfbfe9d`. `manifest.json` changed only the 2 home `sha256` entries
  (+ `generated` timestamp); committed PNG bytes match those hashes.
- **room-architecture-apis** baseline is **byte-identical to master** — the reverted noise re-capture
  is confirmed reverted.
- **Home delta is a vertical shift, not an unrelated repaint** (independent pixel decode of the two
  committed home-light PNGs): top **96 rows identical** (header), first divergence exactly where
  `.hm-lead` is inserted, and **481 lower rows match master translated down by a consistent 35px**
  (the lead line's height). A localized/color change could not produce a consistent 35px translation
  of hundreds of rows. Consistent with the copy-only source diff (leadHtml + CTA text + `.hm-lead`
  CSS) and the `visual_regression` PASS.

## 7. Honest-copy check — PASS

Live `TopicRegistry` has **46 topics**. All **16 distinct chip targets** across the 14 whole-system
prompts are **registered and `TopicRegistry.get()`-resolvable** (queried from the running app;
`scratchpad/reg_probe.cjs`) — none silently dropped by the code's `.filter(TopicRegistry.get)`.
Every prompt→component mapping in the freeze report resolves to a real topic; no dead or wrong link.

---

## Non-blocking notes (not merge gates)

- **N1.** `grade_reveal`'s "dock arms at maxStage" positive assertion was not independently
  teeth-tested (my plant made the dock arm *early*, which still arms at maxStage). The load-bearing
  guard per the charter — "dock quiet at reveal" — IS teeth-proven (§4). Low value to add.
- **N2.** No load-induced anomalies observed. My RED results are all deterministic plants; my GREEN
  results (full gate, record probe, keyboard probe) ran clean without needing a re-run. Other
  verifiers may have been active; nothing in my runs shows load interference.
- **N3.** The freeze report's own "open coherence question" (should the dock also arm at reveal?) is
  a deliberate post-merge design question, correctly deferred — not an engineering defect.

## Scar-tissue honored
No `npm install/ci` (node_modules is a junction); no `git stash`; no source edits, no commits, no
push/merge; every plant reverted via `git checkout` and re-verified clean; verdict read from a capture
file; instruments outside the repo; browser cleanup was Playwright-launched chromium only (per-run
`browser.close()`), never image-wide taskkill. Worktree CLEAN at `fcbd3f0`.

— d2-verifier
