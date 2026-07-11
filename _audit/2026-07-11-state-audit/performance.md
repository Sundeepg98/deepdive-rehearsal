# PERFORMANCE lens — deepdive-rehearsal

Audit date: 2026-07-11 · Artifact: `dist/index.html` (5,163,186 B) · Chromium via Playwright, `file://`
Scripts: `_audit/2026-07-11-state-audit/scripts/` · Screenshots: `_audit/2026-07-11-state-audit/shots/perf/`

---

## Headline verdict on the 5.1 MB

**5.1 MB is NOT a problem, and I can prove it. But 9.5% of the bundle (the 493 KB three.js kit)
currently buys a feature that renders nothing.**

The size question and the health question have opposite answers, so do not conflate them.

### The bytes are nearly free — measured, not asserted

| Measurement | Value |
|---|---|
| File size | 5,163,186 B (4.92 MiB); gzip 1,410,162 B; brotli 972,560 B |
| **Disk read of the whole file (`responseEnd`, file://)** | **90 ms** |
| **V8 compile of the entire 4.5 MB main script** | **79 ms** |
| Script execute | 97 ms |
| Recalc style | 90 ms |
| **Layout** | **309 ms** ← the actual dominant cost |
| `domInteractive` | 565 ms |
| `load` | 616 ms |
| Total blocking (long tasks) | 486 ms |
| JS heap after boot (post forced-GC, CDP) | **5.5 MB** |
| DOM at boot | 781 elements |

V8 compiles 4.5 MB in 79 ms because **83.5% of the main script is string literals** (3,762,494 B of
33,278 literals). V8 *scans* strings; it does not compile them. The "5 MB of JavaScript" intuition is
wrong here — this is 5 MB of *content* that happens to live in a `.js` string table.

### Counterfactual: I removed 25% of the file and boot did not improve

Built stripped variants and measured **6 cold runs each** (`perf-bytes-vs-boot.mjs`):

| | FULL (5.16 MB) | minus three.js kit (4.67 MB) | minus kit + all 796 KB of SVG (3.88 MB) |
|---|---|---|---|
| disk read | 90 ms | 72 ms | 48 ms |
| **V8 compile** | **79 ms** | 81 ms | 76 ms |
| **domInteractive (median)** | **565 ms** | 604 ms | 654 ms |
| total blocking | 486 ms | 558 ms | 632 ms |

Removing **1,286,662 bytes (25% of the file)** changed `domInteractive` by **−89 ms — i.e. it got
*slower*, comfortably inside run-to-run noise** (full-variant samples ranged 456–664 ms). V8 compile
moved ~3 ms. **Boot is layout-bound, not byte-bound.**

### So: is the corpus "eagerly parsed at boot when it could be lazy"?

Eagerly parsed, yes — one script, all 46 topics. Cost of that eagerness: **79 ms of compile and
5.5 MB of heap.** Making it lazy would save nothing measurable, would fight the single-file/offline
constraint, and would add real complexity. **Correct as-is. Do not "fix" this.**

For an offline, zero-network, double-click-openable trainer, the bytes buy 46 topics × 9 panes of
authored content, 39 pre-rendered diagrams (no runtime mermaid library, no runtime render cost), and
a GPU trainer — with zero network dependency, which is the entire product premise. The marginal cost
is ~90 ms of local disk read, paid once. **Calling this bloat would be a reflex, not an analysis.**

### Runtime health of the core app: excellent

- **Topic switch: median 14.8 ms** synchronous handler cost (15 topics; max 60.6 ms on the first,
  cold). Pane switches 10–36 ms. All under the 50 ms long-task threshold.
- **No leak in the core app.** Across **24 topic switches** with forced GC between each:
  heap 5.73 → 5.80 MB (+0.07 MB, noise), **JS event listeners flat at 135** (zero growth — the app
  uses event delegation correctly), DOM nodes bounded (oscillate 3,000–4,000 with topic size, never
  accumulate). Panes render lazily into shadow DOM; only the active pane is materialised.

---

## Byte composition (measured, `composition.mjs` / `svg-census.mjs`)

| Section | Bytes | % of file |
|---|---|---|
| Main app script (content + engine) | 4,505,281 | 87.3% |
| — of which: **39 pre-rendered mermaid SVGs** | 796,150 | 15.4% |
| — of which: string literals overall | 3,762,494 | 83.5% *(of the script)* |
| **three.js visual kit** (`kit.js`) | 492,963 | 9.5% |
| `<style>` block | 139,044 | 2.7% |
| HTML/markup/icons | ~14,825 + 7.5 KB icons | 0.4% |
| **Inlined fonts (base64 woff2)** | **29,735** | **0.58%** |

**Fonts are a non-issue** (0.58%) — a common suspect, ruled out. The 39 SVG diagrams average
20.4 KB each (median 21.2 KB, largest 25.9 KB).

---

## Findings

### P0 — The Visualize (GPU mode) pane renders NOTHING as shipped

The whole 493 KB three.js kit — 9.5% of the bundle — is dead weight in the shipped artifact.

**Measured, via a purely natural user flow (real clicks, no injection, `perf-viz-natural.mjs`), at
two viewports:**

```
viewport 1280x900 : canvasAttr:[0,0]  canvasRenderedBox:[592,2]  drawingBuffer:[1,1]
viewport 1512x950 : canvasAttr:[0,0]  canvasRenderedBox:[822,2]  drawingBuffer:[1,1]
```

The canvas has **zero width/height attributes** and a **1×1 pixel WebGL drawing buffer**. It occupies
a 2px-tall sliver. The GL context is alive and healthy (`isContextLost() === false`, SwiftShader
active) — it is simply drawing into a 1×1 buffer.

The user sees every part of the visualizer *except the visualization*: readouts tick live ("LAG
GROWING", "Total lag 123"), sliders and story buttons all work — above an empty void. It reads as a
broken/loading state.
- Broken: `shots/perf/15-viz-natural-1280.png`, `shots/perf/12-viz-BLANK-as-shipped.png`
- Working: `shots/perf/13-viz-ALIVE-after-window-resize.png`

**Root cause** — `visual-trainer/src/render/scene.js:93-99`:
```js
function resize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  renderer.setSize(w, Math.round((w * H) / W), false);   // 3rd arg updateStyle=false
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
}
window.addEventListener('resize', resize);   // line 98 — the ONLY re-trigger
resize();                                    // line 99 — runs before the pane has layout
```
`resize()` is called synchronously inside `buildScene()`, at which point the viz pane has no layout
yet, so `clientWidth` and `parentElement.clientWidth` are both `0` → `renderer.setSize(0, 0, false)`
→ canvas attrs 0×0, buffer clamps to 1×1. `updateStyle=false` means three.js also sets no CSS
dimensions, leaving CSS height 0. The **only** thing wired to re-run `resize()` is a `window` resize
event, which never fires in normal use.

**Proof of mechanism:** dispatching a single window resize repairs it completely —
drawing buffer `1×1 → 590×332`, and the visualization renders correctly (see
`13-viz-ALIVE-after-window-resize.png`: producers, green lag bars, blue consumers, all correct).

This is why the standalone `visual-trainer` passes its own headless verify (3.5% non-background
pixels) while the embedded copy is blank: standalone, the canvas is in normal visible layout at
build time; embedded, it is mounted into a not-yet-laid-out pane inside a shadow root.

**Fix:** attach a `ResizeObserver` to the canvas's parent (and disconnect it on dispose — which also
serves the P1 fix), or defer the initial `resize()` to a `requestAnimationFrame` after the pane
becomes visible. Do not rely on the `window` resize event.

---

### P1 — WebGL context + memory leak on every Visualize open

Each open of the viz pane creates a **new WebGL context that is never released**. Strictly linear,
measured post-forced-GC (`perf-viz-leak.mjs`, 10 cycles):

| cycle | heap (MB) | JS listeners | DOM nodes | GL contexts |
|---|---|---|---|---|
| 1 | 7.12 | 142 | 3,249 | 1 |
| 5 | 9.79 | 170 | 3,492 | 5 |
| 10 | **12.61** | **205** | **3,802** | **10** |

**+0.61 MB heap, +7 listeners, +62 DOM nodes, +1 GL context — per cycle, monotonic.**

**It breaks the feature.** At the **17th** open Chrome emits (verbatim, captured):
```
WARNING: Too many active WebGL contexts. Oldest context will be lost.
```
and fires a real `webglcontextlost` event. After 18 opens, `isContextLost()` returns **true for 2 of
the 18 contexts** (`perf-viz-evidence.mjs`). Chrome's live-context cap (~16) is blown.

**Root cause (two defects, both required for the fix):**

1. `visual-trainer/src/render/scene.js:98` registers `window.addEventListener('resize', resize)`,
   whose closure captures `renderer` and `canvas`. `buildScene()` returns
   `{ stepParticles, draw, renderer, queues }` (line 101) — **no teardown hook**. The listener is
   therefore unremovable and permanently retains the renderer → the GL context → the canvas. This is
   the retainer that defeats GC.
2. `visual-trainer/src/kit.js:150` — `dispose()` calls only `scene.renderer.dispose()`. In three.js
   that frees internal caches but **does not release the WebGL context**; that requires
   `renderer.forceContextLoss()`, which appears **nowhere** in the authored sources (grep over
   `visual-trainer/src`: no matches).

Aggravating: `src/scripts/app/visual-pane.js:53` — `try { this._inst.dispose(); } catch (e) {}` — a
silent empty catch that would hide any dispose failure.

Note the pane-level code is *intentionally* correct: `visual-pane.js` mounts lazily, calls
`_unmount()` on route change and `teardownTopic()`, and its header comment states "disposes on
leave/switch so exactly one GL context lives." Exactly one `<deep-visual>` element ever exists
(verified). The intent is right; the kit's dispose contract does not honour it.

**Good news:** the rAF render loop *is* correctly cancelled on close — **0 rAF callbacks over 3 s**
with the pane closed. There is no background CPU burn. This is purely a dispose/retain bug.

**Fix:** have `buildScene()` return a `dispose()` that calls `window.removeEventListener('resize',
resize)` and `renderer.forceContextLoss()` (after `renderer.dispose()`), and call it from
`kit.js:150`. Replacing the `window` listener with a `ResizeObserver` (disconnected on dispose) fixes
P0 and P1 together.

**Sequencing:** P1 is currently masked by P0 (an invisible feature leaks unnoticed). Fixing P0 alone
would immediately expose P1 to users. **Fix both in the same change.**

---

### P3 — 171 KiB of byte-identical duplicated CSS inside the SVGs

**38 of the 39** pre-rendered mermaid SVGs each embed the **same 4,714-byte `<style>` block** — only
**2 unique style bodies among 39 SVGs**. Total inline `<style>` = 179,702 B = **22.6% of the 796 KB
SVG payload**, 3.5% of the whole file. Deduping to one shared stylesheet reclaims **~171 KiB raw**.

Also ~26 KiB of float precision beyond 2 decimal places across the SVG geometry (7,325 numbers with
≥3 decimals; e.g. `220.5882352941`, `8.5000000002`).

**Deliberately P3.** Boot is not byte-bound (proven above), so this buys no measurable speed — it is
housekeeping, worth doing only if the compile step is being touched anyway. It gzips well (the SVGs
compress at ratio 0.179), so the shipped-over-network cost is already small. **Do not prioritise this
over P0/P1.**

---

## What I checked and found healthy (no action)

- **Fonts**: 29,735 B of base64 woff2 = 0.58% of the file. Ruled out as a suspect.
- **Core-app memory**: no leak across 24 topic switches; listeners flat at 135.
- **Eager corpus parse**: real, but costs 79 ms / 5.5 MB. Correct trade. Leave it.
- **Interaction jank**: topic switch median 14.8 ms; pane switches 10–36 ms. No long tasks in normal
  navigation.
- **rAF loop teardown**: correct (0 callbacks/3 s when viz closed).
- **Console**: zero page errors and zero console errors across all boot and navigation runs.
- **Lazy pane rendering**: panes render into shadow DOM on demand; DOM stays ~781 elements at boot
  and 3–4 k with a topic open.

## Bottom line

Ship the 5.1 MB without apology — it is the right call for an offline single-file trainer, and the
numbers back it (90 ms to read, 79 ms to compile). The performance problem in this app is **not
size**; it is that the **Visualize feature is invisible (P0) and leaks a WebGL context per open
(P1)**. Both are ~10-line fixes in `visual-trainer/src/render/scene.js` + `kit.js`, and both should
land together.
