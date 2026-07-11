# LENS: Visual Trainer Runtime (Playwright)

**Operator's ask:** "I want the visual trainer to also work."

**Verdict: it does not work in the shipped app — and it is one small fix away from working.**
The simulation, the controls, the story mode, the HUD, and the WebGL kit are all genuinely
healthy. The canvas is simply never given a size: it is created with a **0x0 drawing buffer**
and collapses to a **2px-tall** CSS box. The user clicks "Visualize" and sees an **empty void**.

This is **not** a headless-WebGL artifact. I ruled that out explicitly (see Control below).

---

## 1. The headline: the visual is invisible, on 100% of visits

| Context | GL drawing buffer | CSS box | What the user sees |
|---|---|---|---|
| App, desktop 1280px, **as shipped** | **0 x 0** | 592 x **2px** | HUD + sliders, then a blank void |
| App, desktop, **re-entry** (viz -> walk -> viz) | **0 x 0** | 592 x **2px** | same (so it is every visit, not a first-load race) |
| App, mobile 390px, **as shipped** | **0 x 0** | 360 x **2px** | same |
| App, after **one `window.resize` event** | **590 x 332** | 592 x 334 | **renders + animates correctly** |
| **Standalone pilot** (control) | **952 x 536** | 954 x 538 | renders + animates, 0 errors |

The `2px` is exactly the canvas's `1px` top + `1px` bottom border (`.vz canvas { border: 1px solid #21262d }`).
The content box is literally **zero pixels tall**.

**Evidence (screenshots):**
- `shots/rt-visual-trainer/desktop-full.png` — desktop: "GPU MODE / Visualize", the live HUD
  (`LAG GROWING`, `Total lag 91`, `Capacity 90 msg/s`), 3 sliders, 2 story buttons, the legend...
  and then a large **empty white area** where the visualization should be.
- `shots/rt-visual-trainer/mobile390-asshipped.png` — same on mobile: full HUD, **empty void** below.
- `shots/rt-visual-trainer/proof-AFTER-canvas.png` — the SAME app after one synthetic resize:
  the intended diagram appears (6 partition lanes, grey producers left, green queue bars middle,
  3 blue consumer circles right).
- `shots/rt-visual-trainer/control-pilot-standalone.png` — the standalone pilot, fully working.

It fails **silently**: no exception, and the `#vzempty` fallback ("This topic has no visual mode.")
stays hidden. **Zero console errors, zero page errors** in every run. Nothing tells the user or
the build that anything is wrong.

---

## 2. Root cause (exact, file:line)

`visual-trainer/src/render/scene.js:93-99`

```js
function resize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  renderer.setSize(w, Math.round((w * H) / W), false);   // <- 3rd arg updateStyle=false
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
}
window.addEventListener('resize', resize);
resize();                                                 // <- called ONCE, at mount
```

The chain:

1. `deep-visual._mount()` (`src/scripts/app/visual-pane.js:44-50`) mounts the kit while the viz
   pane still has **zero width** -> `canvas.clientWidth === 0` and `parentElement.clientWidth === 0`.
2. -> `renderer.setSize(0, 0, false)` -> the GL drawing buffer is **0 x 0**.
3. `updateStyle = false` means three.js sets **only** the drawing buffer and **never writes a CSS
   width/height**. The canvas's only CSS is `width: 100%` (no height), so its height comes from its
   intrinsic ratio — which, at attributes `0 x 0`, collapses to **0** -> total box = 2px of border.
4. **Nothing ever re-runs `resize()`.** There is **no `ResizeObserver` anywhere in the codebase**
   (grep-verified across `visual-trainer/src/` and `src/scripts/app/visual-pane.js`). `resize()` is
   re-invoked *only* by a `window` resize event, which never fires in normal use — and never on a
   phone in portrait.

**Proof of the diagnosis AND of the fix, in one experiment:** dispatching a single
`window.dispatchEvent(new Event('resize'))` in the shipped app re-runs `resize()` — now with a
laid-out, nonzero `clientWidth` — and the canvas immediately snaps to **590 x 332** and renders and
animates (canvas-only pixel diff over 1.2s = changed). Script: `scripts/rt-visual-3.mjs`.

---

## 3. Control: this is NOT a headless-WebGL limitation

I explicitly ruled this out, because it is the obvious way to misreport this finding.

- Headless Chromium reports **full WebGL2**:
  `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)` /
  `WebGL 2.0 (OpenGL ES 3.0 Chromium)`.
- The **standalone pilot** `visual-trainer/kafka-lag-pilot.html` renders **perfectly in the exact
  same headless browser** — canvas 952x536, animating, **0 console errors**.
- The kit initialises fine inside the app too: `window.VisualKit` is an object, `.mount` is a
  function, `TOPIC_KI_VISUAL` is present, `window.__VIZ` is live, and the **frame counter advances**
  (55 -> 102).

So three.js, WebGL2, the kit, and headless Chromium are **all fine**. The defect is **purely the
app-side embed**.

---

## 4. What DOES work (and it's a lot)

Once the canvas has a size, the trainer is in good shape. Everything below is measured, not assumed:

- **Simulation runs:** frame counter advances (19 -> 39 -> 55 -> 102); queue depths advance
  (`[7,7,7,7,7,7]` -> `[17,17,17,16,16,16]`).
- **Sliders drive the sim:** moving *Consumers* 3 -> 8 flipped the HUD to
  `REBALANCING -- consumption paused (0.8s)`, `Total lag 227`, `Capacity 180 msg/s`, **`Idle 2`** —
  which is the exact teaching invariant (8 consumers vs 6 partitions -> 2 idle, adding zero capacity).
- **Story mode works:** clicking "Spike, then scale out" shows the caption
  `Steady: 60 msg/s in, capacity 90. Lag near zero.` Both stories are wired.
- **The conditional tab works:** the `Visualize` tab (`VisualizeGPU MODE`) renders only for
  `kafka-internals`; other topics correctly do not show it.
- **Sim invariants: 11/11 PASS** (I ran the dependency-free `visual-trainer/test/sim_invariants.mjs`
  directly — read-only, no build): drain/grow by capacity, idle-consumers-add-zero-capacity,
  rebalance stall, slow-consumer skew, determinism.
- **No horizontal overflow on mobile** (`scrollWidth 390 == clientWidth 390`).

---

## 5. Why the green gate missed it

`test/visual_pane_smoke.mjs:50` asserts:

```js
chk('kit mounted from TOPIC config; frames advancing', !!s1 && !!s2 && s2.f > s1.f + 20, ...)
```

It checks the **frame counter**, not the **frame buffer**. A `requestAnimationFrame` loop rendering
into a 0x0 framebuffer increments `frames()` perfectly happily. There is **no assertion anywhere in
the root gate that the canvas has nonzero dimensions or that a single pixel was painted** — so a
completely invisible visual ships as "smoke 9/9 green."

The one harness that *would* have caught it — `visual-trainer/_pw_verify.mjs`, which does real pixel
checks (3.5% non-background, floor 3%) — points at `process.cwd() + '/dist/index.html'`, i.e. the
**sub-app's own** dist (the pilot). It is never aimed at the main app's `dist/index.html`. The pixel
check exists; it is just pointed at the artifact that isn't broken.

---

## 6. The recommended fix

Fix it **in the kit** (`scene.js`), not the app — this matches the project's own stated law
("polish lands in framework primitives so every future mode inherits it"), and it makes every future
mode immune:

```js
function resize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  if (!w) return;                                   // never size to zero
  renderer.setSize(w, Math.round((w * H) / W), false);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
}
const ro = new ResizeObserver(resize);              // fires when the pane becomes visible/laid out
ro.observe(canvas.parentElement);
window.addEventListener('resize', resize);
resize();
```
(and dispose the observer in the existing `dispose()` path).

Belt-and-braces: give the canvas a CSS `aspect-ratio` so it can never collapse to its borders even
if a size arrives late.

**Then close the test gap** so it cannot regress: add to `test/visual_pane_smoke.mjs` an assertion
that the viz canvas has `width > 100 && height > 100` **and** that a pixel readback / element
screenshot is non-blank. That single assertion is what separates "the loop is spinning" from
"the user can see it."

**Effort: S.** A few lines in one file + a kit rebuild. The hard parts (sim, choreography,
invariants, story mode, GPU instancing) are all already done and verified.

---

## 7. The standalone `visual-trainer/` sub-app

**It already runs today, with zero install.** `visual-trainer/kafka-lag-pilot.html` is the tracked,
prebuilt 482 KB single-file artifact — I opened it via `file://` and it renders, animates, and
throws **0 console errors** (`shots/rt-visual-trainer/control-pilot-standalone.png`). Double-click
and it works. It has its own sidebar (Status/Total lag/Effective capacity/Idle consumers), a
sandbox (Traffic spike x3, Add/Remove consumer, Slow consumer, Reset), and 4 story buttons —
a *richer* control surface than the embedded pane.

**Building it from source** (assessed from source only — I did not run install/build, per the rules):
- It declares `three ^0.170.0`, `vite ^6.0.0`, `vite-plugin-singlefile ^2.0.0`, `playwright ^1.61.1`.
- It has **no `node_modules` of its own**, but the **repo root already has all of them**:
  `three@0.170.0` (exact match), `vite@8.1.3`, `vite-plugin-singlefile@2.3.3`, `playwright@1.61.1`,
  `esbuild@0.28.1`. Node/Vite resolution walks *up* the directory tree, so `npx vite build` from
  `visual-trainer/` would very likely work off the hoisted root deps **with no separate install**.
- **The one risk:** the sub-app declares `vite ^6` but the root has **vite 8** — a two-major skew.
  Its `vite.config.js` is trivial (just `viteSingleFile()` + `build.target: 'esnext'`), so the risk
  is low, but I did not execute it and cannot claim it verified.
- `npm test` needs **nothing** — the sim is pure and dependency-free. I ran it: **11/11 PASS**.

The sub-app is also **not orphaned**: `tools/build-visual-kit.mjs` esbuild-bundles
`visual-trainer/src/kit.js` into `src/scripts/visuals/kit.js` as a step of the root `npm run build`.
The pipeline is properly wired — it is only the runtime sizing that is broken.

---

## 8. Secondary findings

- **Mobile touch targets (P2).** At 390px, the kit's range sliders measure **16px** tall and the
  story buttons **27px** — both below the 44px WCAG 2.5.5 / iOS floor. (The 3rd measured `0`
  is `#stopStory`, which is `display:none` by default — expected.)
  Evidence: `mobile390-post-rescue.png`, measured `ctlHeights: [16,16,16,27,27,0]`.

- **Coverage: 1 of 38 topics (P2/by-design).** Only `src/topics-md/kafka-internals.md` has a
  `## Visual` section. `VISUAL_PIPELINE.md` states ~12-15 topics *should* get one. This is the
  documented phase plan (P0+P1 shipped, P2/P3 pending), so it is the intended state rather than a
  defect — but "the visual trainer works" currently means "one topic has a visual."

- **Theme mismatch (P3, cosmetic).** The kit hardcodes a GitHub-dark palette (`color: #c9d1d9`,
  canvas `background: #0d1117`, buttons `#21262d`) and does not consume the app's design tokens. In
  the app's light theme the black story buttons and dark HUD read as pasted-in — clearly visible in
  `desktop-full.png`. Cosmetic only; worth folding into the same kit pass.

---

## Artifacts

- Scripts: `_audit/2026-07-11-state-audit/scripts/rt-visual-trainer.mjs`, `rt-visual-2.mjs`,
  `rt-visual-3.mjs` (the root-cause proof + control), `rt-visual-4.mjs` (re-entry/controls/mobile).
- Screenshots: `_audit/2026-07-11-state-audit/shots/rt-visual-trainer/`.
