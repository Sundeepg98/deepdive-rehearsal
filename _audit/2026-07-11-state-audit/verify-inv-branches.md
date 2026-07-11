# Adversarial verification — `inv-branches` lens

**Verifier:** independent re-check of every finding against the real system (git, GitHub Actions API, Playwright on `dist/index.html`).
**Date:** 2026-07-11 · **Repo:** `D:/claude-workspace/deepdive-rehearsal` · **master:** `3f51bc1`

## Headline

The lens's **inventory work is excellent and reproduces almost exactly** — branch/tag counts, ancestry, the linear archive chain, the lightweight tags, the stray debug files all confirm to the digit. Its **deletion-safety conclusion is correct** (all 20 non-master branches are genuinely absorbed; I closed the gaps its own script left open).

But its **flagship P1 finding has the wrong root cause**, and acting on it as written would leave production broken:

| # | Lens claim | Verdict |
|---|---|---|
| 1 | Deploy broken, site 183 commits stale | **CONFIRMED** (with *stronger* evidence than they had) |
| 1a | …*because* `deploy-pages.yml:58` runs the deleted `python build.py` | **REFUTED as the active cause** — CI never reaches line 58 |
| 2 | Local `gh-pages` is a live-site **rollback hazard** (P1) | **REFUTED** — git rejects the push (non-fast-forward) |
| 3 | 20 stale branches, `-d` refuses 9, all absorbed | **CONFIRMED** (evidence gaps closed by me) |
| 4 | Archive chain pins **109.45 MB = ~68%** of the pack | **CONFIRMED w/ corrected numbers** — really **76.98 MB = 48%** |
| 5 | Archive tags are a linear chain; 2 preserve 0 unique objects | **CONFIRMED** exactly |
| 6 | All 4 archive tags are lightweight | **CONFIRMED** exactly |
| 7 | MOBILE SPACING suite absent from master | **CONFIRMED w/ correction** — the dot itself is gone too |
| 8 | Stray `_mob_diag*.mjs` tracked at root | **CONFIRMED** exactly |

---

## F1 — deploy broken: RIGHT SYMPTOM, WRONG CAUSE

### The symptom is real (and I have better proof than the lens)
The lens *reasoned* the deploy would fail from reading the YAML. It never checked a CI run. I did:

```
gh run list --workflow=deploy-pages.yml
completed  failure  ... 2026-07-08T14:10:46Z   <- 7 consecutive failures
completed  failure  ... 2026-07-08T11:59:55Z
completed  failure  ... 2026-07-08T10:29:55Z
completed  failure  ... 2026-07-08T10:09:16Z
completed  failure  ... 2026-07-08T09:43:17Z
completed  failure  ... 2026-07-08T09:02:48Z
completed  failure  ... 2026-07-08T08:41:32Z
completed  success  ... 2026-07-04T07:09:01Z   <- last green
```
Last success `2026-07-04T07:09:01Z` matches `origin/gh-pages` HEAD `17f049c` (2026-07-04 07:09:57) exactly. `git rev-list --count 1977244..master` = **183**. Symptom **CONFIRMED, P1**.

### The stated cause is wrong
Step-level result of the latest failed run (`gh run view 28949221041`):

```
  ✓ Install Playwright + Chromium
  X THE GATE -- hard gate, deploy only if this passes     <- dies HERE (line 55)
  - Build the deliverable from src/                       <- NEVER RUNS (line 58, python build.py)
  - Assemble served paths
  - Publish to gh-pages branch
```

The job **never reaches `python build.py`**. The gate itself fails:

```
  build_integrity    FAIL  Node.js v20.20.2
  visual_pane_smoke  FAIL  Node.js v20.20.2
GATE: FAIL (build_integrity, visual_pane_smoke)
##[error]Process completed with exit code 1.
```

`build.py` **was** the cause for exactly the two oldest failures (08:41, 09:02 — those show `✓ THE GATE` / `X Build the deliverable`). From **09:43 onward the gate breaks first**, and `build.py` has been unreachable ever since.

**Consequence:** the lens's recommendation ("delete the `python build.py` step … THE GATE's build_integrity.py already runs `npm run build`, so dist/ exists by that point") is **necessary but NOT sufficient**. Applied alone, the gate still fails and the site stays frozen. Its supporting evidence — "a healthy artifact exists: dist/index.html … 0 console errors" — is true **locally** and precisely masks the fact that **CI cannot reproduce that build**.

---

## MISSED (P1) — the *real* blocker: `three` is missing from the committed manifests

Verified causal chain, every link checked:

1. `tools/build-visual-kit.mjs:14-25` (added by **`672a08c`, 2026-07-08 09:43**) runs `esbuild.build({ bundle: true, entryPoints: ['visual-trainer/src/kit.js'] })`, and is wired into `npm run build`.
2. That bundle transitively imports three:
   `visual-trainer/src/framework/flow.js:15: import * as THREE from 'three';`
   `visual-trainer/src/render/scene.js:4:   import * as THREE from 'three';`
3. **`three` is absent from `origin/master:package.json` AND `origin/master:package-lock.json`.**
4. CI runs `npm ci` (deploy-pages.yml:51) → installs *exactly* the lockfile → **no `three`**.
5. → esbuild cannot resolve `three` → the script throws → Node prints its fatal-exception footer, `Node.js v20.20.2`, which is the last stderr line `check_all.py` surfaces. Both `build_integrity` (shells `npm run build`) and `visual_pane_smoke` (needs the mounted kit) fail with it.
6. **Timing is exact:** `672a08c` landed at **09:43**; the **09:43** CI run is the **first** one where the gate fails. The two runs before it (08:41, 09:02) had a green gate.
7. Locally `node_modules/three` **exists** (installed ad hoc) — classic works-on-my-machine lockfile drift.

**Note the "Node.js v20.20.2" string is a red herring, not a version problem.** I checked: installed `vite@8.1.3` declares `engines: {"node":"^20.19.0 || >=22.12.0"}`, which Node **20.20.2 satisfies**. Do not "fix" this by bumping the Node version.

**Corroboration:** a concurrent agent's uncommitted working-tree fix adds `"three": "^0.170.0"` to **both** `package.json` and `package-lock.json` (`"node_modules/three"`), *and* removes the `python build.py` step — i.e. an independent party converged on the same two-part diagnosis. That fix looks complete; the lens's does not.

This also means **a clean clone cannot build the app at all** — the breakage is wider than the deploy.

---

## F2 — REFUTED: `gh-pages` is not a rollback hazard

The facts are right (local `gh-pages` `869ee9e` is 27 behind, 0 ahead, a strict ancestor of `origin/gh-pages`). The **hazard is not**. The lens claims "a `git push origin gh-pages` from it would roll the production site back to 2026-06-29." Live dry-run:

```
$ git push --dry-run origin gh-pages:gh-pages
 ! [rejected]        gh-pages -> gh-pages (non-fast-forward)
error: failed to push some refs
hint: Updates were rejected because a pushed branch tip is behind its remote counterpart.
```

Git **actively prevents** exactly this. Rolling prod back would require a deliberate `git push --force`. P1 is unjustifiable; this is a **P3 tidy-up** already subsumed by F3 ("drop all 20 branches"). Reported as P1, it sends the operator chasing a ghost.

---

## F3 — CONFIRMED, but the lens's evidence had holes I had to close

Confirmed: all 9 "unmerged" branches are exactly **1 ahead / 203–216 behind**; all 9 claimed equivalent commits are genuinely on master with matching subjects.

**Holes in their instrument** (`scripts/logic-parity.mjs` — it does reproduce, I ran it):
- Its `MAP` is **hardcoded to one file per branch**, but the branches actually touch **2–7 files each** (e.g. `pane-drill` touches 6 source files; the MAP checks 1).
- **`build/rescues` is not in the MAP at all** — yet the finding claims the script proves all 9 absorbed.
- `symbols()` ignores arrow-function consts, data, and anything inside template literals (it collapses **all** backtick literals to `` `CSS` ``) — a big blind spot in a UI codebase that renders HTML from template strings.

**I re-derived it independently** (`scripts/verify-inv-branches.mjs`): discover the real touched files from each commit, take every substantive added line, and search **all** of master's tracked source. 81 lines didn't literally match — and **all 81 are false positives**, each explained and checked:

| cluster | explanation | proof |
|---|---|---|
| `pane-sys` (15) | topic **renumbering** (registry grew 8 → 46) | branch `Signing (17)/Authz (18)/EAV (21)` → master `Signing (2)/Authz (3)/EAV (6)`; all **7 chips survive** |
| `build/rescues` CSS | **pre-tokenization** CSS | branch `.textzoom{…gap:6px;padding:9px 11px…}` → master `.textzoom{…gap:var(--space-6);padding:var(--space-9) var(--space-11)…}` |
| `build/rescues` prose | block-comment continuation lines | my `substantive()` filter let comment prose through |
| `num`/`walk`/`model`/`drill` | refactored internals; master is a **superset** | master added `resolveChipTarget` (`system-map.js:70`), and content-pipeline drill went 34 → **38** cards |

**Runtime proof** (`dist/index.html`, `shots/verify-inv-branches/sys-pane-chips.png`): the sys pane renders its cross-link chips **"→ Signing (2)"**, **"→ Authz (3)"** — master's renumbered values, live. The `build/rescues` payload the lens never checked is **all live**: `.textzoom` (2 buttons — "Text size A− A+"), `.pomodoro` ("FOCUS TIMER 25:00"), `.scrolltop`, page-visibility. **0 console errors.** Counting distinct `TOPIC_<SLUG>_*` globals gives exactly **46 topics** ✓.

**Verdict: the conclusion stands — dropping all 20 branches loses nothing.** The evidence backing it is now actually sound.

*(Nit: the lens's "5 TopicPane custom elements" is a mis-measurement — `TopicRegistry` has 5 keys, but the DOM carries **17** `deep-*` custom elements including all 9 pane tags.)*

---

## F4 — CONFIRMED, numbers CORRECTED (unit error)

The finding divides **uncompressed** blob bytes by **compressed** pack size. Those aren't comparable. Measured with `%(objectsize:disk)`:

```
archive-only objects: n=1227
uncompressed        = 109.45 MB   <- the lens's number (correct, but not the cost)
ON-DISK (pack cost)  =  76.98 MB   <- the real reclaimable amount
=> 76.98 MB of 160.37 MiB = 48.0% of the pack   (not ~68%)
```
748 blobs ✓ and `size-pack: 160.37 MiB` ✓ both match exactly. The finding's substance and its **"keep the tag" recommendation are unaffected** — 77 MB is still the single biggest reclaim available.

*How much this matters:* the tracked 5 MB deliverable has **221 versions = 335.7 MB uncompressed but only 10.1 MB on disk** (git delta-compresses near-identical HTML ~33×). Uncompressed figures are worthless for sizing git. I checked the tracked deliverable as a possible bloat source and it is **not one** — reporting it would have been the same mistake.

---

## F5, F6, F8 — CONFIRMED exactly

- **F5:** `visual-enhancements ⊂ parallelize-all-tests ⊂ animated-bg-interactions` (both `--is-ancestor` checks TRUE); `animated-bg..parallelize` = 0, `parallelize..visual-enh` = 0, `parallelize..animated-bg` = 10; **unique objects in the 2 redundant tags = 0**. Exact.
- **F6:** all 4 `archive/*` tags return `commit` from `git cat-file -t` → lightweight, unannotated. Exact.
- **F8:** `master:_mob_diag.mjs` (3,096 B) and `master:_mob_diag2.mjs` (1,698 B), both from `43b7f1d`. Exact.

## F7 — CONFIRMED, with a correction the lens missed

`archive/visual-enhancements:test/visual_regression.py:146` = `suite("MOBILE SPACING")` with the 2 checks ✓; master has **0** ✓; master `src/styles.css:358` has `padding-right:var(--space-28)` ✓ (line-exact).

**But the lens's "only the assertion is missing, not the behavior" is half wrong.** Assertion 2 checks `.sidebar .seg button.on::after { right: …12… }`. The archive has that rule (`::after{content:"";position:absolute;right:12px;…width:6px}` — the dot). **Master has no `.sidebar .seg button.on::after` at all** (only `::before{height:64%}`). So re-adding the two checks verbatim yields **1 PASS + 1 FAIL** — the dot indicator was dropped, leaving a **vestigial 28px gutter** (runtime: computed `padding-right: 28px`, no `::after` box) that reserves space for a dot that no longer renders.

---

## Artifacts
- `scripts/verify-inv-branches.mjs` — independent absorption check (discovers real touched files)
- `scripts/verify-inv-branches-rt.mjs` — runtime verification of artifact health + rescued features
- `shots/verify-inv-branches/sys-pane-chips.png` — sys chips + text-zoom + pomodoro, live
- `logs/run-28949221041.log` — the CI log proving the gate, not `build.py`, is the blocker
