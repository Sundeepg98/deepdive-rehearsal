# Branch Merge-Triage Report — deepdive-rehearsal

**Project:** Deep-Dive Content-Pipeline Rehearsal (offline, zero-dep, single-file interview-rehearsal trainer; source-of-truth is `src/`, shipped as `deepdive_content_pipeline_rehearsal.html` via `python build.py`).
**Date:** 2026-06-29
**Merge target:** `master @ d50aaa8`
**Method:** per-branch audit + adversarial verify, reconciled here; cross-branch claims re-verified on disk by the synthesis lead.

---

## Executive Summary

Six branches were triaged. **No verifier overturned an audit verdict** — all six were upheld at **high confidence**. The shape of the work:

- **`master` is a healthy BASELINE.** Clean DRY shadow-DOM architecture, no bloat, gate green for the 3 checks that can run locally. Its only blemishes are *hygiene/observability*, not code regressions: an EOL/line-ending fragility, an over-claiming `ROOT_CAUSE_ANALYSIS.md`, and two gate checks (render + entity-leak) that cannot run without a browser.
- **`enhance-web-components` is the one near-ready win.** Smallest branch, zero bloat, and it actually **fixes a latent master bug** (the companion rail's `.cmp-*` styles are trapped in a shadow stylesheet while the markup lives in light DOM → unstyled on master). It ships a **red gate only** because the last commit edited source but never rebuilt the artifact. One rebuild flips it green.
- **The two enormous branches (`feature/animated-bg-interactions` v308 and `feature/parallelize-all-tests` v300) are the SAME automated feature-infusion lineage.** Verified on disk: they share a **byte-identical SPA core and an identical `test/runner.py`**; `parallelize`'s entire set of new modules is a **strict subset** of `animated-bg`'s. Both are **~88% non-gitignored generated bloat** (78K–134K lines of test-report JSON + multi-MB PNG screenshots), both ship a **RED ascii_guard gate**, and `animated-bg` additionally carries **anti-rubric network/permission code** (`sendBeacon`, `fetch`, Cache API, `web-share`, `Notification`) inside a tool that is explicitly offline. **Neither can be merged or rebased** (history poisoning); the genuine ~1.2K-LOC SPA core must be **extracted at the file level, once**, onto a clean branch.
- **`visual-enhancements` is the genuine "rich visual" lineage**, fixed at its tip. SALVAGE: strip its 62% generated bloat, fix one em-dash, de-duplicate two `@keyframes`, drop the duplicate RCA, then merge. It also carries the **real prevention tests** (`unit_tests` 69/69, `css_syntax`, `file_integrity`, `lint`) that master's RCA over-claims as already present.
- **`gh-pages` is a stale, off-lineage deploy → REDEPLOY (gated).** The live site serves an **unmerged** commit (`361de0c`, 45 commits behind even its own source branch) that still carries a real whitespace regression. **Correction to the gh-pages audit:** its claim that "master is NOT redeploy-ready / build invariant VIOLATED" is **false** — execution-verified here as a pure line-ending phantom; master's committed artifact is content-faithful and redeploy-ready as-is.

**The single highest-value, branch-independent fix:** add a `.gitattributes` (`* text=auto eol=lf`) + `git add --renormalize .` on master. This resolves the phantom git-dirty diff, removes the fresh-Windows-clone `build_integrity` fragility, and makes every downstream branch's build-invariant check read cleanly.

**Biggest unverifiable surface:** all browser/Playwright checks (`render.cjs`, `entity_leak.cjs`, every e2e) auto-SKIP in this environment (no Chrome). The visual correctness of every CSS/SPA change — exactly the surfaces with the documented regression classes — is **not machine-verified on any branch.** Each visual merge needs a manual light+dark browser pass before it lands.

---

## Verdict Table

| Branch | Verdict | Confidence | One-liner |
|---|---|---|---|
| `master @ d50aaa8` | **BASELINE** | high | Healthy merge target; clean DRY shadow-DOM, gate green (3/5; browser checks skip). Only EOL-hygiene + RCA over-claim blemishes. |
| `enhance-web-components` | **SALVAGE → MERGE** (after 1 rebuild) | high | Smallest, zero-bloat; fixes a latent master bug (companion `.cmp-*` trapped in shadow). One rebuild flips the red `build_integrity` green. |
| `feature/animated-bg-interactions` (v308) | **SALVAGE** (file-extract; do **not** merge) | high | Near-superset of `parallelize`; 88.9% generated bloat + 3.2MB PNG + RED gate + anti-rubric network code. Extract the ~1.2K-LOC SPA core only. |
| `feature/parallelize-all-tests` (v300) | **SALVAGE** (file-extract; do **not** merge) | high | Same lineage/SPA core as `animated-bg` (byte-identical) but cleaner (no network/gimmick modules); 88% bloat + RED gate + broken suite. Salvage jointly, once. |
| `visual-enhancements @ 120829e` | **SALVAGE** (take-then-clean) | high | Rich-visual lineage fixed at tip; 62% generated bloat + em-dash gate fail + dup `@keyframes`. Carries the REAL guard tests the RCA over-claims. |
| `gh-pages @ f69f7f6` | **REDEPLOY** (gated) | high | Live site = stale unmerged `361de0c` (45 behind), still has the content-visibility whitespace regression. Redeploy after the lineage decision. |

---

## Reconciliation: audit vs verifier

Every branch's adversarial verifier **upheld** the audit verdict at high confidence. The verifiers contributed sharpenings and corrections, none verdict-changing:

- **`master`** — verifier added that `build_integrity.py` passes in this worktree only because the on-disk deliverable is already a prior build artifact; on a *fresh Windows clone* it could fail outright. **High-confidence inference, not execution-verified** (no one performed an actual fresh `autocrlf` clone). Flagged below.
- **`enhance-web-components`** — verifier reproduced the red→green rebuild end-to-end; found only cosmetic line-count errors in the audit (`html +70` not "~88"; `base-styles +4/-2` not "+6/-2"). Verdict unchanged.
- **`feature/animated-bg-interactions`** — verifier confirmed the SPA-core commit `7c9ea9d` itself also commits 27 report JSON + 7 PNGs (rules out whole-commit cherry-pick), and that `keyboard-overlay.js` is **already on master** (so not unique). Verdict unchanged.
- **`feature/parallelize-all-tests`** — verifier confirmed the byte-identical `deploy_temp` duplicate, found `runner.py` hardcodes `/mnt/agents/output/workspace` sandbox paths (non-portable), and that the 7 pytest collection errors are mixed-cause (missing `router_navigate` **plus** a `test_spa.py` basename collision). Verdict unchanged.
- **`visual-enhancements`** — verifier re-ran every named validator (dup `@keyframes`, em-dash, `unit_tests` 69/69) and confirmed the bloat is, if anything, *slightly larger* than stated (17 JSON / 6,562 lines vs the audit's 18 / 6,545). Verdict unchanged.
- **`gh-pages`** — verifier upheld REDEPLOY but **materially corrected the rationale**: the "master build invariant VIOLATED / NOT redeploy-ready" claim is a CRLF false-positive, and the "RC3 mobile-mockbar broken" claim is unsupported (deploy/master/tip all use transform-only hiding; render was never browser-verified). Only the content-visibility whitespace (RC1) is a valid live-site defect. **Use the corrected rationale.**

---

## Per-Branch Detail

### 1. `master @ d50aaa8` — BASELINE (high)

The bar every other branch is measured against, and it holds it. 65 tracked files, all hand-authored; no `node_modules`/venv/binaries. The 368KB committed deliverable is the intended single-file product; `fonts.css` (29KB) is the expected base64-inlined fonts. Build invariant holds at the content level (`build_integrity` PASS; deliverable content-identical to the git blob). Gate green for the 3 locally-runnable checks (ascii_guard, syntax_check, build_integrity); render + entity_leak SKIP (no Playwright). Architecture is genuinely DRY: every surface is a custom element with constructable stylesheets consolidated in `shared-sheets.js`; CSS brace-balanced 259/259; zero `@supports`, zero `content-visibility` — none of the visual-enhancements regression classes ever landed here.

**Blemishes (hygiene/observability, not regressions):**
- **EOL/build fragility** (most actionable) — see Cross-Branch Finding #5.
- **`ROOT_CAUSE_ANALYSIS.md` over-claims coverage.** It documents commits (`d43f089`, `008d3ab`, `224f1e0`, `47c13cb`, `15ae23a`) and four guard tests (`e2e_scroll_test.py`, `css_syntax.py`, `visual_regression.py`, `unit_tests.py`) that are **absent from master** — they live on `visual-enhancements`. Anyone trusting the RCA believes master is guarded against the scroll/mockbar regression classes; it is not.
- **Transform-only mobile mockbar hide** (`styles.css` 218-219: `transform:translateY(115%)` + `body.tools-open → transform:none`, no `display:none` toggle). This is literally one of the project's named regression classes and contradicts the RCA's own Prevention #3. Benign today (master lacks the layout regressions that made it leak) but it is the fragile pattern.
- **`innerHTML`-everywhere idiom** (44 sinks). Currently safe: offline `file://`, author-controlled content, and the one user-input path (session-compare paste) is regex-hardened. Flag only if a free-text field is ever added.

### 2. `enhance-web-components @ 1495e6a` — SALVAGE → MERGE after one rebuild (high)

A 4-commit cosmetic polish branch (two commits co-authored by Vercel v0). It relocates the companion-rail `.cmp-*` styles out of the `<deep-session>` shadow sheet into light-DOM `styles.css`, elevates the companion rail + shell, and adds card/step-k gradient accents.

**Why it matters:** it **fixes a latent master bug** — the companion markup (`.companion` / `.mcomp`) lives in light-DOM `index.html`, but its styles were trapped in the shadow `SESS_STYLE` sheet (which `attachShadow` makes unreachable to light DOM), so the rail renders **unstyled on master**. The branch moves exactly that family to `styles.css`, correctly **leaving** the distinct session-compare family (`.cmp-head/row/lbl/val/d/err`, rendered inside the shadow root) in `SESS_STYLE`. Net code-health improvement (-19 misplaced lines from the component).

**Why SALVAGE not MERGE:** the final commit `1495e6a` edited `base-styles.js` (`.card::before`, `.step-k::before`) but **did not rebuild the artifact**, so `build_integrity` FAILs and that commit's feature is **dead in the shipped file**. Merging as-is lands a red gate + a dead feature. The fix is a single proven step (rebuild + commit → gate fully green). All absolutely-positioned pseudo-elements added have a positioned ancestor (scrollable-whitespace class avoided); hover lifts gated behind `@media(hover:hover)`; no new `innerHTML`/XSS surface.

Source delta (3-dot, from fork): `styles.css +69`, `base-styles.js +4/-2`, `session-progress.js +1/-20`, regenerated deliverable `+70/-20`. Zero bloat. Merge is structurally clean (master's only post-fork commit is the disjoint RCA doc).

### 3. `feature/animated-bg-interactions @ c51be72` (v308) — SALVAGE / file-extract; do NOT merge (high)

77 commits churning version tags v112→v308 ("48 unique features, 404 tests", "aggressive visual magic"). It (a) converts toward an SPA (HashRouter + ViewManager + view-transitions + skeletons), (b) dumps ~57 new feature modules, and (c) commits a large pytest+Playwright harness **and its generated output**.

- **88.9% bloat (142,963 lines):** `test/reports/` generated JSON (134,014 lines / 191 files) + stray `deploy_temp/index.html` (8,198) + `test/scan_report.json` (751), plus **3.23MB across 8 committed PNG screenshots**. `.gitignore` is byte-identical to master (excludes none of it). Verified: the SPA-core commit `7c9ea9d` itself bundles 27 JSON + 7 PNGs, and 33/77 commits touch `test/reports/` → **whole-commit cherry-pick is contaminated**.
- **RED gate:** `ascii_guard` FAIL — 33 non-ASCII chars (em-dash + arrows) across 11 source files; master passes the same guard. A real encoding-invariant regression.
- **Anti-rubric in an offline tool:** `beacon-unload.js` calls `navigator.sendBeacon('/analytics', …)`; `prefetch-hover.js`/`cache-modules.js`/`web-share.js`/`permission-request.js`/`notification-system.js` use `fetch`/Cache/`navigator.share`/`Notification`. The shipped artifact has zero external URLs, so this is dead, off-rubric weight.
- **Genuine value (~1.2K LOC):** `view-manager.js` (325), `router.js` (119), `view-transitions.js` (185), `session-timer.js` (110), `tour-guide.js` (296), plus `scroll-progress`/`copy-code`/`focus-mode`. Competently written. (`keyboard-overlay.js` is already on master — not unique.)

**Path:** file-level extraction onto a clean branch off master; never merge/rebase (134K generated lines + PNGs would bake permanently into history). See Cross-Branch #1/#2 — extract jointly with `parallelize`, once.

### 4. `feature/parallelize-all-tests @ 989b8f5` (v300) — SALVAGE / file-extract; do NOT merge (high)

Despite the name, a 67-commit multi-purpose enhancement wave: the same SPA conversion + new modules + the namesake modular async Playwright runner (`test/runner.py`) + CI scaffolding + docs.

- **88% bloat (84,517 lines):** `test/reports/` (78,396 / 143 files) + a **byte-identical** `deploy_temp/index.html` duplicate of the shipped artifact (5,370; same md5) + `test/scan_report.json` (751) + 8 PNGs. None gitignored.
- **RED gate:** `ascii_guard` FAIL — 19 non-ASCII chars (em-dash + arrow) in the new SPA modules; master clean.
- **Broken suite at tip:** `pytest --collect-only` = 133 collected, **7 collection errors** (`router_navigate` missing from `conftest.py`; plus a `test_spa.py` basename collision). `runner.py` hardcodes `/mnt/agents/output/workspace` sandbox paths → non-portable, which is **why the "199/225 tests passing" commit claims are unverifiable** anywhere else.
- **Genuine value:** the SPA core (same files as v308) + `test/runner.py` (468-line modular `--group/--marker/--test/--list` runner) + the modular suite + docs.

**Cleaner than v308 for extraction:** it carries **none** of the network/permission/gimmick modules and **less** generated bloat (143 vs 199 report files). See Cross-Branch #2.

### 5. `visual-enhancements @ 120829e` — SALVAGE / take-then-clean (high)

A 54-commit visual wave (v112-v168): mesh gradient, glassmorphism, neon glow, boot splash, scroll progress, print styles, a11y, live theme switching, shadow-DOM card/code polish — across all 9 surfaces + 7 overlays. Turbulent history (20/54 fix/revert commits around the known regression classes).

- **62% bloat:** 17 generated `e2e_report_*.json` (6,562 lines) + 7 PNGs (~2.6MB); no `test/reports/` ignore rule.
- **Gate FAIL** on a single `U+2014` em-dash in `boot.js:3` (1-char fix). Build invariant otherwise HOLDS (byte-identical build).
- **Real defects its own validators catch:** duplicate `@keyframes shimmer` (`styles.css` L42 vs L100) and `headIn` (L342 vs L346) — the second silently overrides the first (broken-cascade regression class); `lint.py` flags the transform-only mockbar.
- **Genuine value:** ~746 lines of buildable visual source; **and the real prevention tests** — `unit_tests.py` 69/69, `file_integrity.py` 31/31, `css_syntax.py` + `lint.py` validators that actively catch defects. These are exactly the guards master's RCA over-claims. Bringing them in (de-emoji'd + wired into `check_all.py`) **resolves the RCA over-claim.**

**Path:** take-the-branch-then-clean (per-commit cherry-pick impractical given fix/revert churn). This is the visual-polish track and should land **before** the SPA salvage so the visual baseline is settled.

### 6. `gh-pages @ f69f7f6` — REDEPLOY, gated (high)

Orphan deploy branch: the built single-file trainer, committed twice (root + a byte-identical `docs/index.html`). Not bloated (legitimate artifact); the only redundancy is the double copy.

- **Live site is stale + off-lineage:** the served blob `5439b08a` == commit **`361de0c`** ("aggressive refinements") on `visual-enhancements`, which is **not an ancestor of master**, matches no current branch tip, and is **45 commits behind** even the `visual-enhancements` tip. It still ships `content-visibility:auto` whitespace (RC1) that is absent from both master and the tip → a known-broken live page.
- **Provenance drift:** production is silently serving **unmerged feature work**.
- **Correction (from the verifier, re-confirmed here):** master **is** redeploy-ready. The audit's "build invariant VIOLATED" is a CRLF false-positive — do **not** "commit a rebuilt html" (it is an empty no-op; git re-normalizes to the same blob). The "RC3 mobile-mockbar broken" claim is unsupported (all three lineages use transform-only hiding; render unverified).

**Path:** decide the canonical lineage, rebuild from a verified master, GATE + browser-verify, then publish overwriting **both** served paths; automate as a CI job gated on `check_all.py`.

---

## Cross-Branch Findings

1. **The two giant branches are one lineage — `animated-bg` (v308) is a near-superset of `parallelize` (v300).** Both fork at `bca9569`. Verified on disk: `parallelize`'s **6** new `src/scripts/app` modules are a **strict subset** of `animated-bg`'s **57** (set-difference empty). The SPA core — `view-manager.js`, `router.js`, `view-transitions.js`, `tour-guide.js`, `search-overlay.js` — **and the namesake `test/runner.py`** are **byte-identical** on both (`git diff` = 0 lines). Only `dynamic-features.js` diverges (80 lines); `session-timer.js` exists on `animated-bg` only. **Implication:** salvage them as ONE effort and extract the shared core **once** — the bytes are the same regardless of source.

2. **`parallelize` is the cleaner extraction source for the core.** The off/anti-rubric modules — `beacon-unload`, `cache-modules`, `web-share`, `prefetch-hover`, `permission-request`, `notification-system`, `mouse-glow`, `magnetic-button`, `easter-egg`, `pomodoro-timer` — exist **only on `animated-bg`** (verified absent on `parallelize`). `parallelize` also carries less generated bloat (143 vs 199 report files). Take the byte-identical core from `parallelize`, and grab the one on-rubric extra (`session-timer.js`) from `animated-bg`.

3. **Neither giant can be merged or rebased.** Both bake 78K–134K lines of generated test-report JSON + multi-MB PNG screenshots permanently into git history (none gitignored), and both ship a RED `ascii_guard` gate. Merge/rebase/whole-commit-cherry-pick all preserve the bloat. **File-level extraction onto a clean branch off master is the only clean path.**

4. **`ROOT_CAUSE_ANALYSIS.md` is already absorbed into master.** Blob `3500741f62e457b46668d81311d201c187c5ab66` is identical across `master`, `visual-enhancements`, **and both giants**. `visual-enhancements` authored it; master absorbed it as `d50aaa8`. **Drop the RCA from every salvage set.** (`enhance-web-components` forked before `d50aaa8`, so it simply lacks the file; the three-way merge keeps master's copy — clean. The "-265" in its two-dot diff is a fork-point artifact, not a deletion.)

5. **EOL is a master-level root cause (EXECUTION-VERIFIED here).** No `.gitattributes` + `core.autocrlf=true` + mixed source EOL (`index.html` LF, `styles.css` CRLF). The committed deliverable blob is pure-LF (`5f1b12cf`, 365683 B). A prior agent's `build.py` left a 368164-byte mongrel on disk in the main worktree; it shows ` M` in `git status` **but `git hash-object` of it returns exactly `5f1b12cf`** and `git diff --ignore-cr-at-eol` is empty → a **pure-EOL phantom, content-identical**. This **refutes** the gh-pages audit's "master invariant VIOLATED." The companion claim — that `build_integrity.py` (raw-byte sha) would FAIL on a *fresh Windows clone* (git checks out LF as ~369360-byte CRLF ≠ build.py's 368164 mongrel) — is well-grounded **inference, not execution-verified.** **One fix resolves both:** `.gitattributes` (`* text=auto eol=lf`) + `git add --renormalize .`. Land it before any merge.

6. **Only `enhance-web-components` fixes a real master bug** (companion `.cmp-*` styles trapped in shadow → unstyled rail). **Only `visual-enhancements` carries the real prevention tests** the master RCA over-claims (`unit_tests` 69/69, `css_syntax`, `file_integrity`, `lint`). The two are complementary and both land cleanly before any SPA work.

7. **Browser/Playwright checks auto-SKIP everywhere** (no Chrome). Visual correctness of every CSS/SPA change — the surfaces with the documented regression classes (scrollable whitespace, mockbar visibility, `@supports` brace balance, content-visibility, shadow-DOM padding) — is **unverified across all branches.** Every visual merge needs a manual light+dark browser pass.

---

## Recommended Integration Plan

Disciplined serial flow: lay the shared foundation first, then **serial, GATE-gated, one-at-a-time** merges (never stack unverified merges). Each step ends with `python build.py` → `python test/check_all.py` GATE PASS + a clean `git status` + a manual browser pass for any visual change.

### Step 0 — Foundation on master (no branch dependency; do first)

0a. **Normalize EOL.** Add `.gitattributes` (`* text=auto eol=lf`; or pin `deepdive_content_pipeline_rehearsal.html` + `src/**` to `eol=lf`), `git add --renormalize .`, commit. Verify `python build.py` is byte-identical to the blob and `git status` is clean afterward. *(Fixes the phantom diff + the fresh-clone `build_integrity` fragility for everyone downstream.)*

0b. **Pre-empt the bloat.** Add `test/reports/`, `deploy_temp/`, and `test/scan_report.json` to `.gitignore` on master now, so no future salvage can leak generated output back in.

0c. *(Optional, or fold into Step 2.)* Annotate `ROOT_CAUSE_ANALYSIS.md` that the four guard tests are not yet on master — Step 2 makes this true and removes the note.

### Step 1 — MERGE `enhance-web-components` (lowest risk, fixes a master bug)

- In its worktree: `python build.py`, commit the regenerated deliverable (ideally **squash into `1495e6a`** so no commit ever carries source↔artifact drift); confirm `build_integrity` PASS.
- Manual browser-verify (light+dark) the companion rail + card/step-k accents render.
- Serial verified merge into master. Gate must be green.

### Step 2 — SALVAGE-then-MERGE `visual-enhancements` (the visual track; settle it before SPA)

- New branch off the updated master; take-the-branch-then-clean:
  - `git rm -r test/reports/` (+ rely on Step 0b ignore rule).
  - Fix `U+2014` → `--` in `src/scripts/boot.js:3`.
  - Rename the duplicate `@keyframes` pairs (`shimmer` L42/L100, `headIn` L342/L346) to unique names.
  - Drop the duplicate `ROOT_CAUSE_ANALYSIS.md` (byte-identical to master's).
  - De-emoji the new python tests; consolidate the 4 overlapping e2e scripts; **wire `unit_tests`/`css_syntax`/`file_integrity`/`lint` into `test/check_all.py`** (this resolves the RCA over-claim).
- `python build.py` + GATE until green; manual browser-verify against the regression classes; resolve/accept the `lint` mockbar finding; serial verified merge.

### Step 3 — OPERATOR SCOPE GATE (genuine strategic fork — escalate)

**Decide: does a HashRouter / ViewManager SPA conversion belong in a self-contained OFFLINE single-file trainer?** This is irreversible in spirit (it reshapes the app's architecture) and is the one decision that should not be made tactically.
- **If NO** → abandon both giants entirely (optionally keep the *idea* of `runner.py`, rebuilt portably). Skip Step 4.
- **If YES** → proceed to Step 4.

### Step 4 — SALVAGE the SPA core ONCE (only if Step 3 = yes)

- New branch off master. **File-level extraction** (never merge/rebase either giant):
  - Core (byte-identical — take from `parallelize`, the cleaner source): `view-manager.js`, `router.js`, `view-transitions.js`, `tour-guide.js`, `search-overlay.js`, `scroll-progress.js`, `copy-code.js`, `focus-mode.js`; plus `dynamic-features.js` (pick the better of the two variants).
  - On-rubric extra from `animated-bg`: `session-timer.js`. (`keyboard-overlay.js` is already on master — skip.)
  - **Drop** all network/permission/gimmick modules (`beacon-unload`, `cache-modules`, `web-share`, `prefetch-hover`, `permission-request`, `notification-system`, `mouse-glow`, `magnetic-button`, `easter-egg`, `pomodoro`, battery/network/offline indicators).
- Fix all non-ASCII chars (em-dashes/arrows → `--`/`->`) on anything kept, so `ascii_guard` passes.
- If salvaging `runner.py`/the modular suite: de-hardcode the `/mnt/agents/output/workspace` paths (derive from `__file__`), restore `router_navigate` in `conftest.py`, resolve the `test_spa.py` basename collision, and replace script-text-grep assertions with real ones — otherwise discard the suite.
- `python build.py` + GATE + manual browser-verify each increment; serial verified merge.

### Step 5 — REDEPLOY `gh-pages` (gated; after the lineage is settled)

- The canonical lineage = master after Steps 1–4. master is **already** content-consistent/redeploy-ready (do **not** "commit a rebuilt html").
- Rebuild from the verified master commit, run GATE + manual browser-verify, publish to `gh-pages` overwriting **both** root and `docs/index.html` (collapse to one served path).
- Automate as a CI `gh-pages` job gated on `python test/check_all.py` from a verified master commit, so the live site cannot silently drift to an unmerged snapshot again.
- If tightening `build_integrity.py` to compare against the git HEAD blob, it **must normalize line endings first** (after Step 0a this is moot) or it will permanently false-fail on Windows — the exact trap the gh-pages audit fell into.

---

## Risks, Caveats & What Was NOT Verifiable

- **Browser/Playwright checks SKIP everywhere (no Chrome/Playwright).** `render.cjs`, `entity_leak.cjs`, and all e2e tests are unverified. Every visual/CSS/SPA change must get a manual light+dark browser pass before merge. This is the single largest unverified surface and it covers exactly the documented regression classes.
- **"Fresh-clone `build_integrity` FAIL on Windows" is inference, not execution-verified.** Arithmetically self-consistent (365683 LF + 3677 newlines = 369360 CRLF ≠ 368164 mongrel) but nobody ran an actual fresh `autocrlf` clone. The Step 0a fix makes it moot regardless.
- **Commit-message test counts are unreliable.** "404 tests" (v308), "199/225 passing" (v300), "66 tests" (visual-enh): the suites are non-portable (hardcoded sandbox paths), broken at tip (collection errors), or shallow (existence/string-grep smoke). `check_all.py` also **crashes as a one-shot on Windows (cp1252)** on the giant branches — run its components individually.
- **gh-pages RC3 (mobile mockbar visible) is unsupported.** Static markers don't distinguish broken from fixed (deploy/master/tip all use transform-only hiding); render was never browser-verified. Only RC1 (content-visibility whitespace, present on the live deploy, absent on master + tip) is a verified live-site defect. The transform-only mockbar remains a latent pattern on the named regression list across master too.
- **`innerHTML` string-concat sinks** (44 on master, more on branches) are currently safe (offline `file://`, author-controlled content, regex-hardened user-input path). Flag only if a free-text user field is ever added.
- **Cosmetic audit inaccuracies (none verdict-changing):** `enhance-web-components` line counts (html +70 not "~88"; base-styles +4/-2 not "+6/-2"); `visual-enhancements` bloat slightly larger than stated (17 JSON/6,562 vs 18/6,545); `keyboard-overlay.js` already on master (not unique to the giants); ~23 fix commits vs the stated 19/20 on `parallelize`.

---

## Appendix A — Precomputed Facts

| Branch | Ahead of master | Diffstat | Mergeability |
|---|---|---|---|
| `master` | 0 | baseline / target | N/A (merge target) |
| `enhance-web-components` | 4 | 4 files, +144/-42 | CLEAN (no conflicts) |
| `feature/animated-bg-interactions` | 77 | 330 files, +160,776/-969 (ENORMOUS) | CLEAN |
| `feature/parallelize-all-tests` | 67 | 215 files, +95,612/-969 (ENORMOUS) | CLEAN |
| `visual-enhancements` | 54 | 59 files, +10,540/-693 | CLEAN |
| `gh-pages` | orphan history | built HTML deploy artifact | N/A (orphan) |

All four mergeable feature branches fork at **`bca956936c0741442b1093bc38373ca9be61a479`**; master is `bca9569 + d50aaa8` (RCA doc). Toolchain note: `make` is not installed — use `python build.py` (build) and `python test/check_all.py` (GATE: ascii_guard + syntax_check + build_integrity + render + entity_leak; browser checks auto-skip without a browser).

## Appendix B — Synthesis-lead on-disk verifications (2026-06-29)

- Fork points: all four = `bca9569`; ahead/behind vs master = `enhance` 1/4, `animated-bg` 1/77, `parallelize` 1/67, `visual-enh` 1/54.
- **Giant-branch dedup:** `view-manager.js`/`router.js`/`view-transitions.js`/`tour-guide.js`/`search-overlay.js` and `test/runner.py` → `git diff parallelize animated-bg` = **0 lines** (byte-identical). `dynamic-features.js` differs (80 lines); `session-timer.js` exists on `animated-bg` only. New `src/scripts/app` modules: `parallelize` **6**, `animated-bg` **57**; set-difference (parallelize − animated-bg) = **empty** (strict subset).
- **Anti-rubric modules** (`beacon-unload`, `cache-modules`, `web-share`, `prefetch-hover`, `permission-request`, `notification-system`, `mouse-glow`, `magnetic-button`, `easter-egg`, `pomodoro-timer`): present on `animated-bg`, **absent on `parallelize`**. Bloat dirs: `test/reports/` = 143 files (`parallelize`) vs 199 (`animated-bg`); `deploy_temp/` = 1 each.
- **RCA absorbed:** blob `3500741f…` identical across `master`, `visual-enhancements`, `feature/animated-bg-interactions`, `feature/parallelize-all-tests`. Identical on `enhance-web-components`? No — it forked before `d50aaa8` and lacks the file (clean three-way merge keeps master's).
- **EOL phantom (master worktree):** committed blob `5f1b12cf` (365683 B, 0 CR-bearing lines, pure LF); on-disk deliverable 368164 B (prior `build.py` mongrel) shows ` M`, but `git hash-object` = `5f1b12cf` (identical) and `git diff --ignore-cr-at-eol` = empty; CR-stripped content sha256 `e2b32028…` == committed-blob content sha256 `e2b32028…`. `core.autocrlf=true`; `.gitattributes` ABSENT.
