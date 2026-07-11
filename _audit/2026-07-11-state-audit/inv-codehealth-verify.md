# Adversarial Verification — `inv-codehealth` lens

**Verifier stance:** default to refuting. Every finding re-checked against the real system —
Playwright re-run from scratch (my own scripts, not the original's), every file:line opened,
every git command re-run.

**Headline:** The original lens is **unusually accurate on measurement and unusually sloppy on
causation.** Every number I could check reproduced — several to the byte and to the pixel
(666 globals; 492,945 B; 900 B; host 592x153 -> buffer 0x0 -> 591x332). But **three load-bearing
causal claims are wrong**, and two of them would send a fixer in the wrong direction. Separately,
while verifying the P1, I found a **worse, unreported bug in the same subsystem**.

Verdict: **13 confirmed** (4 with material corrections), **4 sub-claims refuted**, **3 missed**.

---

## 1. The P1 VisualKit finding: symptom CONFIRMED, root cause REFUTED

### Symptom — reproduced exactly

I wrote an independent probe (`scripts/verify-viz.mjs`) that drives the app through its **real UI**
(Escape the boot overlay -> `location.hash` -> click `button[data-tab="viz"]`), not the internal
API the original used. It reproduces the original's numbers **to the pixel**:

| measurement | original claimed | I measured |
|---|---|---|
| host box | 592x153 | **592x153** |
| canvas drawing buffer | 0x0 | **0x0** |
| canvas CSS box | 592x2 | **592x2** |
| after 1px viewport resize | 591x332 | **591x332** |
| console errors | 0 | **0** |

Screenshots (mine): `shots/verify-codehealth/A-first-mount.png` — the HUD renders ("LAG GROWING",
"Total lag 49", sliders, story buttons, caption) above a **blank void**;
`shots/verify-codehealth/B-after-resize.png` — the same page seconds later, scene fully painted
(6 partition lanes, producers, green bars, blue consumers).

Also **broader than reported**: it reproduces at **mobile 390px** too (`buf 0x0, css 360x2`).

`ResizeObserver` count = **0** in `visual-pane.js`, `kit.js`, `scene.js`, **and the built
`dist/index.html`**. Confirmed.

### Root cause — the finding is WRONG

> "scene.js:94-98 binds resize() ONLY to window.addEventListener('resize', resize) and **never
> invokes it at mount**"

**False.** `visual-trainer/src/render/scene.js`:

```
93:  function resize() {
94:    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
95:    renderer.setSize(w, Math.round((w * H) / W), false);
96:    renderer.setPixelRatio(...);
97:  }
98:  window.addEventListener('resize', resize);
99:  resize();                                   // <-- IT DOES INVOKE IT AT MOUNT
```

The cited range "94-98" stops exactly one line short of the line that refutes the claim.

**The actual mechanism** (which I traced through `visual-trainer/src/kit.js:53-81`): `mount()` does
`host.appendChild(wrap)` *before* `mode.buildScene(canvas, sim)`, so the canvas **is** attached when
`resize()` runs. It fails because at that instant the pane host has **zero laid-out size**, so
`canvas.clientWidth` and `canvas.parentElement.clientWidth` are both 0 -> `renderer.setSize(0, 0)`
-> a 0x0 drawing buffer. (WebGL then clamps to a 1x1 `drawingBuffer` — I measured
`glDrawingBuffer {w:1,h:1}` against `canvas.width/height = 0/0`, which is the fingerprint of
`setSize(0,…)`.) Nothing ever re-measures, so it stays 0x0 until a `window` resize event fires.

**Why this matters:** a developer reading "never invokes it at mount" would add a `resize()` call at
mount — which **already exists** and changes nothing. The correct fix is a `ResizeObserver` on
`_host` (or a rAF/layout-settled deferred resize). The finding's *recommendation* happens to also
mention ResizeObserver, so it lands in the right place by accident, but its stated diagnosis is
false.

### "Why it shipped ungated" — also WRONG

> "add 'viz' to the PANES list in test/build_integrity.py:21 — that omission is why this shipped ungated"

**False, and the suggested fix would not catch this bug.** `build_integrity.py`'s PANES check is a
substring test on the built HTML (`if b'id="' + pid + b'"' not in out`). Adding `'viz'` would assert
the *string* `id="viz"` exists in the file. It tells you **nothing** about canvas dimensions.

The real story: **`test/visual_pane_smoke.mjs` exists, is in the gate** (`check_all.py:50`), and
drives the viz pane hard — `goView('viz')`, `__VIZ.frames()` advancing, `sim.totalLag()` growing,
`queues()` choreography, story captions, disposal, zero page errors. **Every one of those assertions
passes on a 0x0 canvas**, because the simulation is pure state independent of rendering and WebGL
renders happily into a zero-size buffer. The suite asserts *the kit is mounted and the sim is alive*
and never once asserts *anything is visible*. That — not the PANES list — is the gate gap.

---

## 2. Findings confirmed clean (numbers reproduced)

| # | Finding | Verdict |
|---|---|---|
| 2 | README documents a dead app | **CONFIRMED**, every sub-claim. `build.py` absent (deleted in `97b746e`); README:46,112-113 still document it. README:38,134 claim "no localStorage" while `store.js` has **11** localStorage refs and its own header says "a thin, defensive wrapper over localStorage". `make test-render` (README:121) — Makefile targets are only build/check/test/clean. README:65 says "34-line shell + 19 include markers"; actual **182 lines, 21 markers**. The Source-layout tree points at 5 files that do not exist. *(Nit: those 5 are in the layout tree; the Editing-guide table itself has 4 code rows, of which 3 are dead — `mock-run/data.js` does exist. Substance intact.)* |
| 3 | .git 18x its content | **CONFIRMED exactly.** `.git` = **173M**; tracked tree = **10,016,249 B (9.6 MB)**; deliverable = **5,163,186 B**, md5 `6fc92f15288ae4567d1b035db3e98e9c`, **byte-identical to dist/index.html**; **223** commits touch it (of 276 total). |
| 5 | Tailwind: 13.7MB toolchain -> 900 bytes | **CONFIRMED exactly.** Block = **900 B** = **0.0174%** of payload. Emitted selectors: **`.badge`, `.badge:after`** and exactly **4** custom props (`--color-white`, `--radius-sm`, `--color-acc`, `--color-acc2`). `--tw-` / `.flex{` / `@layer utilities` = **0 occurrences** in dist. `source(none)` at tw.css:9. Toolchain: @tailwindcss 3.3M + tailwindcss 809K + lightningcss 526K + **lightningcss-win32-x64-msvc 9.1M** = ~13.7MB. |
| 6 | Tokens: no color group; palette duplicated | **CONFIRMED in substance.** `tokens.json` groups = size/font-size/z/duration/ease/space/font-weight/line-height — **no color group**; zero hex/`color` refs. `#534AB7` appears at **`src/styles.css:55`** and **`src/tw.css:17`** (exactly as cited) and **not** in tokens.json. Dead `js` platform emits `design-tokens/build/tokens.js` = **4,206 B** with **zero importers**. *(Correction: leaf tokens = **124**, not 139.)* |
| 7 | axe-core + js-yaml unused | **CONFIRMED.** Zero code references to either — the only hits are `package.json` / `package-lock.json`. *(Nuance: `js-yaml` is also a transitive dep of `gray-matter` and `cosmiconfig`, so removing the devDep won't shrink node_modules — it's declaration hygiene only.)* |
| 8 | Stalled 38-md / 8-js topic migration | **CONFIRMED exactly.** 38 `.md` (1.7M) + 8 legacy JS (`authz, aws-hardening, content-pipeline, desired-state, eav, iac, notifications, signing`), 1,227,210 B across 105 files. Both families carry the **same 12 slices** (`bank drill identity model num open register rf sys trade walk wb`) — verified by diffing `_generated/api-design/` against `topics/authz/`. |
| 9 | `_mob_diag*.mjs` committed at root | **CONFIRMED.** Both tracked, added in `43b7f1d`; `_mob_diag.mjs:6` screenshots to `/mnt/user-data/outputs/mob_01_boot.png`; launches with `executablePath: process.env.CHROME`. |
| 10 | Sandbox path leaks | **CONFIRMED at the exact lines.** `tools/compiler/mermaid.mjs:21` -> `require('/home/claude/.npm-global/lib/node_modules/playwright')`; `tools/visual_audit.mjs:18` -> default OUT `/home/claude/audit_shots`. |
| 11 | Vestigial `mkstemp`; gate not read-only | **CONFIRMED exactly.** `build_integrity.py:24` creates `tmp`, `:25` closes the fd, `:63` unlinks it — **never written, never read**; `:36` reads `ROOT/dist/index.html` instead. Docstring `:4` still claims "Rebuilds src/ to a temp file". `:30` shells `npm run build`, so **running the gate rebuilds dist/**. `PANES` at `:21` does lack `viz`. *(But see §1 — the "that's why it shipped ungated" inference is wrong.)* |
| 12 | DESIGN_SYSTEM_AUDIT / REPORT stale | **CONFIRMED.** "Open Props" appears **33** times in DESIGN_SYSTEM_AUDIT.md; `open-props` is **absent from package.json and not installed**. REPORT.md:3,25,36 describe a "324 KB" deliverable (now 5.1MB) and :8 guarantees `python3 build.py` byte-identical reassembly (build.py is deleted). |
| 13 | 666 top-level globals | **CONFIRMED to the integer.** With a correct `file://` blank-page baseline (1,231 built-ins), the app adds **exactly 666** globals — 510 `TOPIC_*` + 156 app. Sample matches the original's verbatim (`_dk, _tc, _hideBootSplash, _t, _m, VisualKit, __THREE__, Store, BASE_SHEET…`). Mitigation `global_collisions.py` **is** in the gate (`check_all.py:40`). No action needed — correctly triaged. |

Runtime re-measured: **0 console errors, 0 warnings, 429ms load** (orig. 403ms — same ballpark),
**all 10 panes switch** cleanly on `#<topic>/<view>`. `three` at root **is** load-bearing —
`visual-trainer/node_modules` does not exist, so esbuild resolves it from root. Confirmed.

---

## 3. The lint finding: core CONFIRMED, composition REFUTED

Core is solid: **43 errors, true exit code 2** (the original's `$?` would have been `tail`'s — I
checked it properly), and `lint`/`lint:js` (package.json:14-15) appear in **neither**
`test/check_all.py` **nor** `.github/workflows/`. `.oxlintrc.json` does set `"no-unused-vars": "off"`.
oxlint's 13 `unicorn(no-empty-file)` warnings **are** false positives — `src/scripts/app.js` really is
nothing but `<!--@build:include …-->` markers (which JS parses as Annex-B comments -> "empty file").

**But "every one is no-duplicate-selectors" is false.** Actual composition of the 43:

- **34** × `no-duplicate-selectors`
- **6** × **`parseError`** — *"Cannot parse selector (Unexpected '!')"* at `src/styles.css:380`, which is
  the line `<!--@build:include fonts.css-->`. **stylelint cannot parse the include-marker convention.**
- 1 × `function-url-quotes` (fonts.css:1)
- 1 × `selector-no-vendor-prefix` (`::-moz-selection`, styles.css:80 — a legitimately necessary prefix)
- 1 × `declaration-block-no-duplicate-properties` — `.tools-fab` at `styles.css:309` declares
  **`flex:none` twice**. (Same value both times, so zero behavioural impact — but it's the one
  error that is a genuine code smell rather than a config mismatch.)

**Consequence for the recommendation:** option (a) as written — "disable `no-duplicate-selectors`" —
would leave **9 errors and lint still RED**. Making lint green requires *also* teaching stylelint to
skip the `@build:include` markers (the same architectural problem that breaks oxlint). That's a
strictly bigger job than the finding implies.

---

## 4. MISSED — a worse bug in the same subsystem

### Deep-linking to the viz route silently lands the user on the WRONG TOPIC (P1)

While probing the P1 I tested paths the original never did. Loading
`dist/index.html#kafka-internals/viz` **does not open kafka-internals**. It silently ends on
**`#content-pipeline/walk`** — a different topic, a different pane, no canvas, no error.

Deep-link matrix (`scripts/verify-deeplink-matrix.mjs`, fresh load each time):

```
#kafka-internals/viz      -> #content-pipeline/walk    *** WRONG TOPIC + WRONG PANE ***
#kafka-internals/drill    -> #kafka-internals/drill     ok
#kafka-internals/walk     -> #kafka-internals/walk      ok
#api-design/num           -> #api-design/num            ok
#content-pipeline/drill   -> #content-pipeline/drill    ok
```

**`viz` is the only broken deep link in the app.** A **reload while on the viz route** breaks the
same way (kit never mounts; `__VIZ` undefined; shadow DOM shows the "This topic has no visual mode."
empty state).

**Root cause — proven:** `src/scripts/app/visual-pane.js:39` is the **only** caller of
`goView('walk')` in the entire codebase (grep across `src/`). It is the "bounce off a viz-less
topic" guard:

```js
if (!d && this._active) {          // visual-pane.js:35-40
  var self = this;
  setTimeout(function () {
    if (!self._data && self._active && window.goView) window.goView('walk');
  }, 0);
}
```

At boot the app renders the **default topic (content-pipeline, which has no visual)** into the panes
before the hash's topic resolves. So `renderTopic(null)` fires while `this._active === true` (the
hash says `viz`), the deferred bounce runs, and it navigates away — taking the deep-linked topic
with it. The code comment already admits a race here ("the topic protocol rewrites the hash AFTER
this handler"); the `setTimeout` patched one race and exposed this one.

**Why this outranks the 0x0 canvas:** the blank canvas is self-healing (any window resize fixes it).
This is **unrecoverable** — the user asked for kafka-internals/viz and silently got a different
topic. It breaks the app's own **"Copy link"** feature for the viz pane, breaks bookmarks, and
breaks reload. Repro: `node _audit/2026-07-11-state-audit/scripts/verify-deeplink-matrix.mjs`.

### The real gate gap (P2)

Not `build_integrity.py`'s PANES list. `test/visual_pane_smoke.mjs` **is** in the gate and drives
viz thoroughly — but every assertion it makes (frames advancing, lag growing, queues, captions,
disposal, zero page errors) is satisfied by a 0x0 canvas. **Fix:** assert
`canvas.width > 0 && canvas.height > 0` (and ideally a non-blank pixel readback) after mount, and
add a deep-link case (`goto('…#kafka-internals/viz')` -> assert `location.hash` is unchanged). Those
two assertions would have caught **both** the confirmed P1 and the missed one.

### Lint cannot be made green by rule-tuning alone (P3)

See §3 — the 6 `parseError`s at `styles.css:380` are stylelint choking on `<!--@build:include-->`.
Any plan to wire lint into the gate must solve the include-marker convention in **both** linters.

---

## Scripts / evidence produced by this verification

- `_audit/2026-07-11-state-audit/scripts/verify-viz.mjs` — independent P1 reproduction + measurement
- `_audit/2026-07-11-state-audit/scripts/verify-viz-paths.mjs` — deep-link / mobile / reload paths
- `_audit/2026-07-11-state-audit/scripts/verify-deeplink.mjs` — characterises the wrong-topic landing
- `_audit/2026-07-11-state-audit/scripts/verify-deeplink-matrix.mjs` — the 5-case deep-link matrix
- `_audit/2026-07-11-state-audit/scripts/verify-runtime.mjs` — errors / load / pane switching
- `_audit/2026-07-11-state-audit/scripts/verify-globals.mjs` — the 666 count, correct baseline
- `_audit/2026-07-11-state-audit/shots/verify-codehealth/A-first-mount.png` — the blank void
- `_audit/2026-07-11-state-audit/shots/verify-codehealth/B-after-resize.png` — scene rendered
- `_audit/2026-07-11-state-audit/shots/verify-codehealth/C-deeplink.png`, `D-mobile.png`
