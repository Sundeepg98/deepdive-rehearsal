# Adversarial verification — `rt-visual-trainer` lens

**Verdict: the lens is substantially CORRECT.** Its headline P0 is real, reproducible, and its
root cause and one-line fix both survive independent re-derivation. I confirm all four findings.
But its P1 carries a **fabricated supporting detail** that would send you to the wrong file, and
I found **three defects it missed** — one of them a proven resource leak that its own
error-only console listener structurally could not see.

All measurements below are mine, taken from the shipped `dist/index.html` over `file://`.

---

## 1. P0 — "visual trainer renders NOTHING" — **CONFIRMED**

Independently reproduced, desktop and mobile, first visit and re-entry.

| Measurement | Lens claimed | I measured | |
|---|---|---|---|
| canvas `width`/`height` attrs | 0 x 0 | **0 x 0** | match |
| CSS box (desktop 1280) | 592 x 2 | **591.6 x 2** | match |
| CSS box (mobile 390) | 360 x 2 | **360 x 2** | match |
| computed height / borders | 2px = 1px+1px border | **2px; borderTop 1px, borderBottom 1px** | match |
| **content-box height** | (implied 0) | **0 px** | the decisive number |
| ancestor chain | canvas 592x2 -> .stageInner 592x2 -> .vz 592x153 | **canvas 591.6x2 -> div.stageInner 591.6x2 -> div.vz 591.6x152.9** | match |
| re-entry (viz->walk->viz) | also 0x0 | **also 2px box, both visits** | match |
| `#vzempty` fallback | stays hidden | **`hidden: true`** | match |
| console / page errors | 0 / 0 | **`[]` / `[]`** | match |
| GL capability | WebGL2 ANGLE/SwiftShader | **`WebGL 2.0 (OpenGL ES 3.0 Chromium)` / `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`** | match — not a headless artifact |
| frames advancing anyway | yes | **39 -> 70** | match |

**Screenshots (mine):**
- As shipped: `shots/inv-rt-visual-trainer/A-desktop-asshipped.png` — the HUD, the 3 sliders, the two
  story buttons and the legend all render; where the diagram belongs there is a **2px hairline**.
- Canvas element alone, as shipped: `shots/inv-rt-visual-trainer/F-canvas-only-ASSHIPPED-2px.png`
  (clip box literally `591 x 2`).
- After the fix: `shots/inv-rt-visual-trainer/B-desktop-after-resize-event.png` — the intended diagram
  appears: 6 partition lanes, grey producers left, green queue bars middle, 3 blue consumer circles right.

### Root cause — independently PROVEN at the moment of mount

The lens asserted the cause but did not instrument it. I did, and it holds — with one refinement.

I first tried wrapping `window.VisualKit.mount`; it never fired. That is not an app bug: the esbuild
IIFE exports `mount` as a **non-configurable getter** (`hasGetter: true, configurable: false,
assignmentTook: false`), so the kit cannot be monkey-patched. I re-probed by reading layout inside the
same `routechange` dispatch that calls `_mount()`:

```
AT MOUNT:  paneClientW: 0   canvasClientW: 0   canvasParentClientW: 0   canvasAttrs: "0x0"
SETTLED:   paneClientW: 592 canvasClientW: 590 canvasParentClientW: 592 canvasAttrs: "0x0"  <- never re-sized
```

So at `visual-pane.js:44-50` `_mount()` runs **synchronously inside the routechange dispatch**, while the
pane still has zero width. `scene.js:94` reads `canvas.clientWidth || canvas.parentElement.clientWidth`
— **both are 0** — and `scene.js:95` calls `renderer.setSize(0, 0, false)`. The third arg
(`updateStyle=false`) means three.js writes only the drawing buffer and never a CSS height; with
`.vz canvas { width:100% }` and no CSS height, the canvas's height comes from its intrinsic aspect ratio
(`0/0`, degenerate) and collapses to 0. The 592px width arrives one moment later, but **nothing re-runs
`resize()`** — `ResizeObserver` appears **nowhere** in the repo (`grep -rn ResizeObserver src/ visual-trainer/ tools/ test/` -> **RC=1, zero matches**), and `scene.js:98` only listens for a `window` resize, which never fires in normal use.

**Refinement to the lens's wording:** the pane is not `display:none` — its computed `display` is `block`
and it has no `hidden` attribute; it simply has no layout box yet at the instant of the synchronous mount.
Same fix.

**Fix proven:** one `window.dispatchEvent(new Event('resize'))` -> drawing buffer **590x332**, CSS box
**591.6 x 333.8**, scene renders and animates. Identical to the lens's independent result.

### Precision nit (does not change the finding)
The lens wrote "GL drawing buffer = {w:0, h:0}". The canvas **attributes** are 0x0, but WebGL clamps
`drawingBufferWidth/Height` to a **1x1** minimum — I measured `{w:1, h:1}`. The substance (no usable
drawing surface, zero visible pixels) is unaffected.

### Scope caveat for prioritisation
The viz pane exists on **exactly 1 of 38 topics** (`src/topics-md/kafka-internals.md` is the only file
with a `## Visual` section — verified). So the blast radius is one topic, not the whole app. Within that
feature, however, it is 100% broken, on every visit, silently. P0 for the feature; the app's core
rehearsal panes are unaffected.

---

## 2. P1 — "the gate asserts the frame COUNTER, not the frame BUFFER" — **CONFIRMED (core), with a fabricated detail REFUTED**

**The core claim is true, and I proved it harder than the lens did — I ran the gate's own test:**

```
$ node test/visual_pane_smoke.mjs
  PASS  kit mounted from TOPIC config; frames advancing
  ...
  PASS  zero page errors across the whole flow
VISUAL PIPELINE SMOKE: ALL PASS      <- 18/18 green, while the canvas is 0x0 and nothing is visible
```

- `test/visual_pane_smoke.mjs:50` is verbatim the claimed line (`chk('kit mounted from TOPIC config;
  frames advancing', !!s1 && !!s2 && s2.f > s1.f + 20, ...)`).
- `test/check_all.py:50` wires it into the gate.
- A grep of `test/` for any canvas width/height/size assertion returns **RC=1 — zero matches**.

A rAF loop rendering into a 0x0 framebuffer increments the counter perfectly happily. Confirmed.

### REFUTED sub-claim (this one is a ghost — do not chase it)
The lens wrote: *"the ONE harness that does real pixel checks — `visual-trainer/_pw_verify.mjs`
(3.5% non-background, floor 3%)"*.

I read all 68 lines of `_pw_verify.mjs`. **It contains no pixel check whatsoever.** It writes
`_shot_a.png` / `_shot_b.png` (lines 22, 25) and never reads them back — no decode, no pixel count, no
percentage, no 3% floor. Its only floor is `fps >= 25` (line 62). The string "3.5%" appears in neither file.

The pixel check is real but lives in a **different file**: `visual-trainer/_verify_pixels.py:17-18`
(`ok = nonbg > 0.03 and moved > 0.002`). The two are a pair, wired by
`visual-trainer/package.json`: `"verify": "node _pw_verify.mjs && python3 _verify_pixels.py"`.
Neither is in the root gate. And `visual-trainer/dist/` **does not exist**, so the harness could not have
been run to produce a "3.5%" reading.

The lens's *substantive* point survives intact — a real non-background pixel floor exists in the sub-app
and is never aimed at the main app's `dist` — but its file attribution and its "3.5%" number are wrong.

---

## 3. P2 — "kit control touch targets 16px / 27px on mobile" — **CONFIRMED**

At 390x844, measured **as shipped** (the lens's "force the canvas to size first" step turns out to be
unnecessary — the controls are laid out either way; I measured identical values in both states):

```
sliders  (.vz input[type=range]) : 16, 16, 16 px
buttons  ("Spike, then scale out",
          "Consumers beyond partitions") : 27, 27 px
#stopStory : 0 px  (display:none by default -- correctly not a defect)
```
Exactly the lens's `[16,16,16,27,27,0]`. No horizontal overflow (`scrollWidth 390 == clientWidth 390`) — also as claimed.

**Sharpening the standard.** The lens cited "44px WCAG 2.5.5 / iOS floor". 2.5.5 is the **AAA** criterion.
Stated precisely: the **16px sliders fail even WCAG 2.2 AA** (2.5.8 Target Size Minimum, 24x24); the
**27px buttons pass AA but fail AAA / the 44px iOS floor**.

**Reinforcement the lens missed:** the project's own smoke test already asserts
`PASS  MOBILE tap targets >= 44px (home + steppers)` — so **44px is the project's own declared standard**;
it simply is never applied to the kit's controls.

---

## 4. P3 — "kit hardcodes a GitHub-dark palette, ignores design tokens" — **CONFIRMED (cosmetic)**

Source (`visual-trainer/src/kit.js:16-43`) verbatim: `.vz { color: #c9d1d9 }`,
`.vz canvas { background: #0d1117 }`, `.vz button { background: #21262d; color: #c9d1d9; border: 1px solid #30363d }`.

Runtime, in the app's **default** theme:
```
html[data-theme] = "light"      body background = rgb(250,249,245)
kit button bg    = rgb(33,38,45)   (#21262d)   kit button fg = rgb(201,209,217) (#c9d1d9)
canvas bg        = rgb(13,17,23)   (#0d1117)
```
Dark chrome on a near-white page — visible in `A-desktop-asshipped.png` (the two black story buttons).
The premise holds: `design-tokens/` exists (`config.json`, `tokens.json`, `build/`) and `npm run build`
runs style-dictionary against it.

**My one caveat:** a dark **canvas** is defensible (3D viewports conventionally are). The genuine
inconsistency is the **chrome** — buttons, labels, HUD. Keep at P3, fix in the same kit pass.

---

## MISSED by the original lens

### M1 (P2) — Every viz mount leaks a window listener and a WebGL context

`scene.js:98` registers `window.addEventListener('resize', resize)` and **nothing ever removes it**.
There is no `removeEventListener` anywhere in `visual-trainer/src/`. The kit's `dispose()`
(`kit.js:147-152`) stops the loop, stops the driver, calls `renderer.dispose()` and clears
`host.innerHTML` — but never unregisters that listener.

Measured with CDP `DOMDebugger.getEventListeners` on `window`, cycling viz -> walk:

| mount/unmount cycles | window `resize` listeners |
|---|---|
| baseline (before any mount) | 3 |
| 1 | 4 |
| 5 | 8 |
| 10 | 13 |
| 18 | **21** |

Exactly **+1 per mount**, forever. The leaked closure holds `canvas` and `renderer`, so the disposed GL
context can never be collected. At ~16 cycles Chromium emits:

```
WARNING: Too many active WebGL contexts. Oldest context will be lost.   (x2)
```

**Why both the gate and the original lens missed it:** it is a console **`warning`**, and the gate
(`zero page errors`) and the lens's harness both listen only for `error` / `pageerror`. My run recorded
`allErrors: []` and `allWarnings: [2x "Too many active WebGL contexts"]`. A post-dispose resize does not
throw, so nothing else signals it either.

This gets **worse once P0 is fixed** — today the lost contexts were rendering nothing anyway; with a real
scene, a user who toggles in and out of Visualize ~16 times starts losing it.

**Fix (same file, same pass as P0):** have `createScene` return a disposer that calls
`window.removeEventListener('resize', resize)` (and `renderer.forceContextLoss()`), and call it from
`kit.js` `dispose()`. If the P0 fix adds a `ResizeObserver`, disconnect it there too.

Repro: `node _audit/2026-07-11-state-audit/scripts/inv-rt-visual-leak.mjs`

### M2 (P2) — The kit's sliders have NO accessible name

Verified against **Chrome's own accessibility tree** (`Accessibility.getFullAXTree`), not inferred:

```
role: slider, name: ""  value: 120     <- Rate (msg/s)
role: slider, name: ""  value: 3       <- Consumers
role: slider, name: ""  value: 30      <- Capacity each
```

All three expose an **empty accessible name**. Cause at `kit.js:93-101`: the `<label>` is created with no
`for`, the `<input type=range>` with no `id` / `aria-label` / `aria-labelledby`, and they are appended as
**siblings** (`box.appendChild(lab); box.appendChild(inp);`) rather than the label wrapping the input. The
visible text ("Rate (msg/s): 120") is therefore never programmatically associated. A screen-reader user
hears "slider, 120" with no idea what it controls.

The `<canvas>` is likewise `role: (none)`, `aria-label: (none)`, with **zero fallback content**
(`innerHTML.length === 0`) — it does not appear in the AX tree at all (`axCanvases: []`). The entire
visualization has no text alternative.

**Fix:** wrap the input in its label (or give it `id` + `for`), and give the canvas an `aria-label` plus a
live-region text summary of the sim state (the HUD strings already exist — they just aren't announced).

Repro: `node _audit/2026-07-11-state-audit/scripts/inv-a11y-kit.mjs`

### M3 (P3) — The viz animates forever with no reduced-motion path and no pause

`grep -rn "prefers-reduced-motion|matchMedia" visual-trainer/src/ src/scripts/app/visual-pane.js` -> **RC=1,
zero matches**. The kit runs a perpetual rAF WebGL animation and offers the user no way to stop it: the only
Stop control is `#stopStory`, which is `display:none` until a story is running (`kit.js:42`). A
vestibular-sensitive user has no escape from the motion. Cheap to fix alongside the others: honour
`prefers-reduced-motion` (render a single static frame) and expose a persistent pause toggle.

---

## Scripts (all mine, all re-runnable from the repo root)

| script | what it proves |
|---|---|
| `scripts/inv-rt-visual-trainer.mjs` | geometry + GL buffer, desktop/mobile/re-entry, the resize-event fix, theme, control heights |
| `scripts/inv-rt-visual-rootcause2.mjs` | the layout state **at the moment of mount** (the real root cause) |
| `scripts/inv-rt-visual-leak.mjs` | listener count per mount + WebGL context exhaustion (M1) |
| `scripts/inv-a11y-kit.mjs` | slider/canvas accessible names via Chrome's AX tree (M2) |

**Discarded, and why:** my first pixel-fraction crop (`scripts/inv-pixel-proof.py`) compared a fixed
rectangle before/after the fix and reported 62.6% -> 100% "non-background". That number is **confounded** —
with the canvas collapsed, the HUD and buttons shift *up into* the crop box, so it measures controls, not a
rendered scene. I am not reporting it. The decisive, unconfounded metric is the canvas's **zero content
height**, which needs no pixel statistics.
