# Lens: CODE HEALTH / TECH DEBT — 2026-07-11

Scope: `src/` structure, build chain (style-dictionary -> postprocess-tokens -> build-visual-kit -> vite),
design-token pipeline, the markdown compiler, the test suite, dependency hygiene, payload composition,
and doc truthfulness. Read-only audit. No build, no install, no source mutation.

**Headline:** the *engineering* is in better shape than the *documentation* or the *peripheral tooling*.
The module graph is clean (zero orphans, zero duplication), the payload is genuinely content (not bloat),
and runtime is error-free. But the flagship 492 KB WebGL feature paints a blank box on first view, the
README describes an application that no longer exists, and three whole quality subsystems (lint, Tailwind,
the token pipeline) are installed, configured, and enforcing nothing.

---

## What is HEALTHY (verified, not assumed)

| Area | Measurement |
|---|---|
| Module graph | 681 files reachable from `src/index.html`; **0 orphaned app modules, 0 orphaned topic files** (`scripts/module-graph.mjs`) |
| Duplication | **0 pairs** of the 57 app modules exceed 20% normalized-line overlap |
| Runtime | **0 console errors, 0 warnings**, 403 ms load; all 9 panes switch clean (`shots/code-health/boot-desktop.png`) |
| Payload libraries | **ZERO runtime libraries shipped.** No mermaid / mathjax / shiki / markdown-it runtime, no three.js in the main bundle, no external `http(s)` refs. Build-time rendering genuinely works. |
| Test suite | 19 checks incl. 6 compiler proofs + `global_collisions.py`, a real guard for the concatenated-script architecture |
| CI | `deploy-pages.yml` gates deploy on the full `check_all.py`; `paths-ignore` correctly skips doc-only pushes |
| `three` at root | **Load-bearing and correctly declared.** `visual-trainer/node_modules` does not exist, so esbuild resolves `three` from ROOT `node_modules` when bundling `visual-trainer/src/kit.js`. The recent fix was right. |

### The 5.1 MB payload is DEFENSIBLE

Decomposition of `dist/index.html` (5,163,186 B):

| Block | Bytes | % | What it is |
|---|---:|---:|---|
| `<script>` #1 | 4,505,281 | **87.3%** | app logic + all 46 topics' content. Starts at `store.js`. |
| `<script>` #2 (VisualKit) | 492,945 | 9.5% | the three.js/WebGL kit (see P1 below) |
| `<style>` | 139,029 | 2.7% | `styles.css` + generated tokens |
| markup | 22,398 | 0.4% | |
| Tailwind `<style>` | 900 | 0.017% | (see P2-3) |

- base64 across the WHOLE file: **4 blobs / 37 KB** (one inlined woff2 + 3 icons). Fonts are *not* the bloat.
- inline SVG (pre-rendered mermaid/mathjax): 796 KB = 15.4%.
- Source totals corroborate: 2.91 MB compiled topics + 1.22 MB hand-written topics + 0.40 MB app logic ≈ the 4.5 MB script.

**Verdict: the payload is content, exactly as the architecture intends.** Shipping build-time-rendered SVG
instead of mermaid+mathjax+shiki runtimes is the right call and is working. The `minify:false` comment in
`vite.config.mjs` is honest.

---

## TECH-DEBT REGISTER

### P1-1 — The 492 KB VisualKit renders a BLANK 0x0 canvas on first mount

The single largest discretionary payload item ships to every user, serves **1 of 46 topics (2.2%)**, and on
that one topic it **paints nothing** until the user happens to resize the window. **Zero console errors** —
it fails completely silently.

Measured (`scripts/viz-canvas.mjs`), on `kafka-internals` -> Visualize, reached through the real UI:

```
host box:                592 x 153
canvas drawing buffer:     0 x 0        <-- nothing is painted
canvas CSS box:          592 x 2
simRunning:             true            (sim IS ticking; lag counter climbs)
webgl2 context:         true
console errors:            0
--- then a window resize ---
canvas drawing buffer:   591 x 332      <-- scene appears, correctly
```

Screenshots (the same page, seconds apart):
- `shots/code-health/viz-WORKING.png` — HUD + sliders + "LAG GROWING 123", and a **blank void** where the GPU scene belongs.
- `shots/code-health/viz-after-resize.png` — the scene renders perfectly (6 partition lanes, producers, consumers).

**Root cause** (two cooperating gaps):
- `visual-trainer/src/render/scene.js:94-98` — `resize()` is bound *only* to `window.addEventListener('resize', resize)`. It is never invoked at mount, and nothing observes the host element.
- `src/scripts/app/visual-pane.js` — the pane's only listener is `routechange` (line 21). **No `ResizeObserver`** (`grep -c ResizeObserver` = 0 in both `visual-pane.js` and the bundled `kit.js`). `_mount()` (line 45) calls `VisualKit.mount(this._host, ...)` while the pane is still being revealed, so the canvas measures 0.

**Fix (S):** call `resize()` once after layout settles on mount, and/or attach a `ResizeObserver` to `_host` in `visual-pane.js`. Small, local, high payoff — it is the difference between 492 KB of dead weight and a working flagship feature.

**Also:** `test/build_integrity.py:21` lists only the 9 original panes — the gate never asserts `viz` exists, which is why this shipped ungated.

### P1-2 — README.md documents an application that no longer exists

Every load-bearing claim is false. A new contributor following it cannot build or edit the app.

| README claim | Reality |
|---|---|
| `src/ ──python3 build.py──▶ …` and "rebuild: `python3 build.py`" (L46, L112-113) | **`build.py` does not exist** — deleted in commit `97b746e` ("build.py retired"). The build is style-dictionary -> postprocess -> build-visual-kit -> vite. |
| "no `localStorage`, fully portable" (L38); "no CDN, no fetch, no `localStorage`. State is in-memory" (L134) | **False.** `src/scripts/app/store.js` is a localStorage wrapper — 11 `localStorage` references; its own header: *"Everything the app persists … goes through here."* |
| "`make test-render`" (Development) | **No such Makefile target.** Targets are: `build`, `check`, `test`, `clean`. |
| "index.html — 34-line shell + 19 include markers" | Actually **182 lines, 21 include markers**. |
| Editing guide: `drill/cards.js`, `model-answers/answers.js`, `walkthrough/steps.js`, `drill/speak-lines.js`, `numbers-nalsd.js` | **All 5 files do not exist.** Content moved to `src/topics-md/<id>.md`. |
| Framed as ONE topic (content-pipeline), "Nine practice surfaces" | The app is a **46-topic**, 10-pane trainer. |

**Fix (M):** rewrite README against the actual Vite/compiler/topics-md architecture.

### P2-3 — Git repo is 18x its own content (223 commits x a 5.1 MB build artifact)

- tracked working tree: **9.6 MB**
- `.git`: **173 MB**
- `deepdive_content_pipeline_rehearsal.html` (5,163,186 B, byte-identical to `dist/index.html`, md5 `6fc92f15…`) is **tracked**, and **223 commits have touched it**.

The `.gitignore` comment says this is deliberate ("the deliverable itself IS committed (ready to open)"), and for a *download-and-open* product that is a real requirement. But every build re-commits 5 MB. Options: keep committing but squash history / use a release artifact / Git LFS. Worth a deliberate decision rather than drift.

### P2-4 — The lint layer is decorative: it is RED and nobody runs it

- `npm run lint` (stylelint): **43 errors, exit code 2** — all `no-duplicate-selectors`, in `src/styles.css` + `src/fonts.css`.
- `npm run lint:js` (oxlint): 13 `unicorn(no-empty-file)` warnings — false positives on the HTML-comment-only include-wrapper files (`src/topics/*.js`, `src/scripts/app.js`), a pattern oxlint cannot parse.
- **Neither runs in the gate (`test/check_all.py`) nor in CI (`deploy-pages.yml`).** Verified: no `lint` reference in either.

Worse, the stylelint failures aren't bugs — `no-duplicate-selectors` directly contradicts the *documented, deliberate* single-cascade design ("organized chronologically … its concerns are interleaved"). The config was never tuned to the architecture, so it is permanently red and permanently ignored.

And `.oxlintrc.json` sets `"no-unused-vars": "off"` — disabling the single most useful rule for finding the dead code this lens is hunting.

**Fix (S):** either tune the configs to the architecture and wire them into the gate, or delete `stylelint`, `stylelint-config-standard`, `oxlint`, `.stylelintrc.json`, `.oxlintrc.json` and the two npm scripts. The current state is the worst of both.

### P2-5 — Tailwind: ~13.7 MB of toolchain for 900 bytes of output

The entire Tailwind v4 pipeline emits **900 bytes = 0.017% of the payload**, containing exactly:

```
selectors: [".badge", ".badge:after"]     custom properties: 4
```

- `src/tw.css:9` — `@import "tailwindcss/utilities" source(none)` means **no source scanning -> ZERO utilities generated**. Confirmed in `dist`: `--tw-` ABSENT, `.flex{` ABSENT, `@layer utilities` ABSENT.
- The `@theme` block declares ~22 colors; only 4 survive into output (only `.badge` consumes any).
- Cost in `node_modules`: `@tailwindcss` 3.3 MB + `tailwindcss` 809 KB + `lightningcss` 526 KB + `lightningcss-win32-x64-msvc` **9.1 MB** (a platform-native binary) = **~13.7 MB**.

`tw.css`'s own comment admits the plan: *"adoption is then progressive and each step is proven."* Adoption reached **one component** and stopped. This is a stalled migration, not a design system.

**Fix (S):** inline `.badge` into `styles.css` and drop `@tailwindcss/vite` from the build — or actually adopt utilities. One class does not justify a native-binary toolchain.

### P2-6 — Design tokens: three uncoordinated sources of truth, and the pipeline doesn't own colors

The style-dictionary pipeline exists to be the single source of truth for tokens. It **has no color group at all**:

- `design-tokens/tokens.json` — 139 leaf tokens across `size, font-size, z, duration, ease, space, font-weight, line-height`. **No colors.**
- The palette is instead hand-declared **verbatim in two places**:
  - `src/styles.css:55` — `--acc:#534AB7; --acc2:#6D5FD6; --accbg:#EFEDFA; …`
  - `src/tw.css:17` — `--color-acc: #534AB7; --color-acc2: #6D5FD6; --color-accbg: #EFEDFA; …`

Changing the accent colour requires editing two files by hand, and the token pipeline — the machinery built to prevent exactly this — cannot help.

Additionally, `design-tokens/config.json` emits a **`js` platform** to `design-tokens/build/tokens.js` (4,206 B, regenerated every build) that **nothing imports**. The app is a plain concatenated script; an ES6-export module is unusable by it. Dead build output.

**Fix (M):** move the palette into `tokens.json` and generate both consumers; delete the `js` platform from `design-tokens/config.json`.

### P2-7 — Dead dependencies: `axe-core` and `js-yaml`

Cross-checked all 18 devDeps against every import/require and every config/CLI reference:

| Dep | Verdict |
|---|---|
| `axe-core` | **UNUSED.** Zero references. (Every apparent hit is the English word *"axes"* in topic prose.) |
| `js-yaml` | **UNUSED.** Zero references. (Every apparent hit is the string `'yaml'` as a *language name* in `shiki-highlight.mjs`.) |
| `mermaid` | USED — but via a raw path (`node_modules/mermaid/dist/mermaid.min.js`, `tools/compiler/mermaid.mjs:17`), not an import. |
| `shiki` | USED — dynamic `await import('shiki')` (`shiki-highlight.mjs:54`). |
| `three` | USED — transitively; esbuild resolves it from root `node_modules`. Correctly declared. |
| all others | legitimately used (imports or npm-script CLI). |

**Fix (S):** remove `axe-core` and `js-yaml`.

### P2-8 — Stalled topic-authoring migration: 38 markdown vs 8 hand-written JS

- 38 topics: `src/topics-md/<id>.md` -> compiled at build into `src/topics/_generated/` (gitignored).
- 8 topics: hand-written JS committed under `src/topics/` — `authz, aws-hardening, content-pipeline, desired-state, eav, iac, notifications, signing` (**1.22 MB** of committed JS).

The two families are **structurally identical** (same 12 slices, same include-bundle shape, same order) — the generated one is literally the machine-made version of the hand-written one. The migration is **38/46 = 83% complete and parked**.

The cost is not aesthetic: the 8 legacy topics **bypass the entire compiler guarantee stack** — the zod schema (`tools/compiler/topic-schema.mjs`), build-time mermaid/mathjax/shiki rendering, and all 6 compiler proof tests. Only the runtime `topic_contract.cjs` check backstops them. Two authoring paths with two different safety levels.

*(`docs/CONTENT_AUDIT_2026-07-08.md` already tracks this honestly as "38 markdown topics + 8 legacy directory topics" — the audit doc is accurate; the migration just hasn't finished.)*

### P2-9 — Committed debug scratch at repo root

`_mob_diag.mjs` (3,096 B) and `_mob_diag2.mjs` (1,698 B) are **tracked**, added in commit `43b7f1d` ("Mobile polish…"). They are one-off Playwright probes: they screenshot to **`/mnt/user-data/outputs/`** (a claude.ai sandbox path that does not exist on this machine), depend on `process.env.CHROME`, and target the root deliverable. Pure leftover scratch. **DROP.**

### P3-10 — Sandbox path leaks in build/tooling

- `tools/compiler/mermaid.mjs:21` — `catch { return require('/home/claude/.npm-global/lib/node_modules/playwright').chromium; }`. A hardcoded Linux-sandbox fallback **inside the build path**. It can never fire on a normal machine, and if the primary `require` ever fails, the error will name a bogus `/home/claude` path.
- `tools/visual_audit.mjs:18` — output defaults to `/home/claude/audit_shots`.

### P3-11 — Vestigial build.py-era artifacts inside the gate and Makefile

- `test/build_integrity.py:24` — `fd, tmp = tempfile.mkstemp(suffix='.html')` creates a temp file that is **never written to** (line 63 just unlinks it). It reads `dist/index.html` instead. Leftover from when `build.py` could emit to an arbitrary path. Its docstring still says *"Rebuilds src/ to a temp file"* — it doesn't; it runs `npm run build` and reads `dist/`.
- `Makefile` `clean:` -> `rm -f /tmp/tmp*.html` — cleans temp files nothing creates any more.
- Note: because `build_integrity.py` shells out to `npm run build`, **running the gate is not read-only** — it rebuilds `dist/`. Worth knowing before wiring it anywhere unexpected.

### P3-12 — Two more docs that now misdescribe the architecture

- **`DESIGN_SYSTEM_AUDIT.md`** — titled *"Open Props vs. Our Tokens"* and mentions Open Props **33 times**, but `open-props` is **not a dependency** and `src/tw.css:11-13` records that it was removed ("a full audit found ZERO actual usage… ~15KB of dead CSS removed"). The doc's entire framing is a comparison against a library that is gone.
- **`REPORT.md`** — a refactor record for the **324 KB** monolith (now 5.1 MB) whose central guarantee is that *"`python3 build.py` reassembles `src/` … byte-identical"*. Both the size and the mechanism are dead. It is a valid historical artifact but carries no "superseded" marker at repo root.

### P3-13 — 666 top-level globals share one scope (architectural, mitigated)

Measured at runtime: **666 app-owned properties on `window`** (`_dk`, `_tc`, `_t`, `_m`, `Store`, `VisualKit`, `__THREE__`, `TOPIC_*`, …). This is inherent to the concatenate-everything-into-one-`<script>` design. It is *knowingly* mitigated by `test/global_collisions.py`, which walks the include set and fails on any duplicate top-level name. Flagging it as a standing structural risk, not a defect — the guard is the right answer, and it exists.

---

## KEEP / DROP

| Item | Verdict | Why |
|---|---|---|
| `_mob_diag.mjs`, `_mob_diag2.mjs` | **DROP** | Tracked one-off debug scratch (commit `43b7f1d`); write to a non-existent `/mnt/user-data/outputs/` sandbox path. |
| devDep `axe-core` | **DROP** | Zero references anywhere. |
| devDep `js-yaml` | **DROP** | Zero references anywhere. |
| `design-tokens/config.json` -> `js` platform (`design-tokens/build/tokens.js`) | **DROP** | 4.2 KB ES6 module regenerated every build, imported by nothing; unusable by a plain-script app. |
| `Makefile` `clean:` target | **DROP** | `rm -f /tmp/tmp*.html` — cleans artifacts of the retired `build.py`. |
| `test/build_integrity.py:24` `mkstemp` | **DROP** | Temp file created and unlinked, never written. build.py-era vestige. |
| `tools/compiler/mermaid.mjs:21` `/home/claude/...` fallback | **DROP** | Hardcoded sandbox path in the build path. |
| `tools/visual_audit.mjs:18` `/home/claude/audit_shots` default | **FIX** | Default to a repo-relative path. |
| Tailwind (`@tailwindcss/vite` + `src/tw.css`) | **FIX** | 900 B of output (one `.badge`) for ~13.7 MB of toolchain incl. a native binary. Inline `.badge` and drop it, or actually adopt utilities. |
| `stylelint` + `stylelint-config-standard` + `oxlint` + their 2 rc files | **FIX** | Currently RED (43 errors) and wired into nothing. Tune to the architecture and gate them, or remove entirely. |
| `README.md` | **FIX** | Documents `build.py`, "no localStorage", `make test-render`, and 5 non-existent files. Actively misleading. |
| `DESIGN_SYSTEM_AUDIT.md` | **ARCHIVE** | Framed against Open Props, which is no longer a dependency. |
| `REPORT.md` | **ARCHIVE** | Historical record of the 324 KB / `build.py` era. Valid history, wrong tense, no superseded marker. |
| `ROOT_CAUSE_ANALYSIS.md` | **ARCHIVE** | Dated (2026-06-27) postmortem for a specific fixed bug on a merged branch. Move to `_audit/` or `docs/`. |
| `visual-trainer/_pw_verify.mjs`, `_shot_a.png`, `_shot_b.png`, `_verify_pixels.py` | **KEEP** | Tracked, but genuinely wired: `visual-trainer/package.json` `"verify"` script runs both. Not junk. |
| `src/tw.css` | **FIX** | Not orphaned (linked at `src/index.html:17`), but see Tailwind verdict. |
| `src/scripts/visuals/manifest.json` | **KEEP** | Not dead — read at build time by `tools/compiler/compile.mjs:25` to validate `## Visual` sections. |
| devDep `three` at root | **KEEP** | Load-bearing: `visual-trainer/node_modules` does not exist, so esbuild resolves `three` from root when bundling the kit. The recent declaration fix was correct. |
| The committed 5.1 MB deliverable | **KEEP (decide)** | Deliberate per `.gitignore` (download-and-open product), but it has driven `.git` to 173 MB across 223 commits. Needs an explicit strategy, not drift. |
| The 8 hand-written topics | **FIX** | Finish the markdown migration (38/46 done) so all 46 get the compiler's schema + rendering + proof-test guarantees. |
| Everything else in `src/scripts/app/` (57 modules) | **KEEP** | Zero orphans, zero duplication, zero runtime errors. Genuinely healthy. |

---

## Evidence artifacts

- `scripts/module-graph.mjs` — include-closure / orphan analysis
- `scripts/code-health-runtime.mjs` — boot cleanliness, global count, pane switching
- `scripts/viz-truth.mjs`, `scripts/viz-canvas.mjs` — the VisualKit canvas measurement
- `shots/code-health/viz-WORKING.png` — the blank canvas as a user first sees it
- `shots/code-health/viz-after-resize.png` — the same scene, rendering correctly after a resize
- `shots/code-health/boot-desktop.png` — clean boot

## Note on method

I initially suspected the VisualKit was entirely unreachable (the `viz` tab read `hidden:true` on every
topic). That was **my own bug**: I used `#/kafka-internals/viz`, but the router's grammar is
`#<topic>/<view>` with **no leading slash** (`src/scripts/app/router.js:6-8`), so the route was rejected and
the topic never switched. Driving the app's real API (`TopicRegistry.setTopic`) showed the tab appears
correctly and the kit mounts. The finding was then re-derived from the actual defect (a 0x0 canvas), not the
artifact of my bad URL.
