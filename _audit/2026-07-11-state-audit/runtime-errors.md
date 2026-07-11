# Runtime Error Sweep — deepdive-rehearsal

**Lens:** RUNTIME ERROR SWEEP (Playwright)
**Target:** `dist/index.html` (5.1 MB single-file offline SPA), loaded from `file://`
**Date:** 2026-07-11
**Browser:** Chromium 1.61.1 (headless), viewports 1280×900 and 390×844

---

## Headline

**The app is exceptionally clean at runtime.** Across the full 46 topics × 10 panes matrix (460 cells),
every overlay, every keyboard shortcut, drill grading, search, theme, topic switching, mock run, mixed
fire, and an export/import round-trip, I recorded:

| metric | result |
|---|---|
| console errors | **0** |
| uncaught page errors | **0** |
| failed requests | **0** |
| **network requests (total)** | **1 — the document itself** |
| empty/unrendered content panes | **0 / 414** |

The offline contract is **airtight**. Across 8 independent Playwright runs, the only request ever issued
was `file:///…/dist/index.html`. Zero outbound network. No CDN, no font, no telemetry, no beacon.

Two genuine defects surfaced, both isolated to the **Visualize (`viz`) pane**. Everything else is healthy.

---

## FINDING 1 — P1: the app's only WebGL visual renders a 0×0 canvas (shows nothing)

`kafka-internals` is the **only** topic in the app with a `## Visual` section
(`src/topics-md/kafka-internals.md` — the sole match for `grep -rln "^## Visual" src/topics-md/`).
Its "Visualize / GPU MODE" pane mounts, runs, and **draws nothing**.

### Evidence

Navigate to `#kafka-internals/walk`, click the **Visualize** tab, wait 3s:

```
onPane: "viz"          hasVisualData: true     hasVisualKit: true
vizInstance: true      ← VisualKit.mount() SUCCEEDED, no exception thrown
canvasAttr:  "0x0"     ← the canvas backing store is ZERO BY ZERO
canvasCSS:   "592x2"   ← 2 pixels tall on screen
drawBuf:     "1x1"     ← the WebGL drawing buffer is 1×1
paneH:       153       ← the pane collapses, because the canvas has no height
```

This is **not** a GPU/headless artifact. A control canvas in the same browser gets a real surface:

```
plain 300x200 canvas -> webgl: true, drawingBuffer "300x200", renderer "WebKit WebGL"
```

**It fails silently** — no console error, no page error, and the "This topic has no visual mode."
fallback stays correctly hidden (`emptyMsgShown: false`). The user just sees a blank rectangle.

### The user-visible result

`shots/runtime-errors/kafka-viz-clicked.png` — the entire HUD renders and is **live**: a red
`LAG GROWING` badge, `Total lag 93`, `Capacity 90 msg/s`, three working sliders (Rate/Consumers/
Capacity), two scenario buttons ("Spike, then scale out", "Consumers beyond partitions"), and the
caption *"producers (left) -> partitions backing up (middle) -> consumer group (right)"* — all sitting
above **a completely blank area**. The simulation is running; it just paints to a 0×0 surface.

### It is a mount-time sizing race — the feature itself works

Resize the window once and the visual **appears**, exactly as its caption describes
(`shots/runtime-errors/canvas-B-after-resize.png` — producers as grey squares on the left, partitions
as green bars in the middle, a consumer group as blue circles on the right):

| state | canvas attr | drawingBuffer | pane height |
|---|---|---|---|
| on mount (click Visualize) | **0x0** | **1x1** | 153px |
| after a window resize | 590x332 | 590x332 | 485px |
| leave the pane and re-enter | **0x0** again | **1x1** | 153px |

The kit's **resize** handler sizes the canvas correctly; the **mount** path does not. Re-entering the
pane re-breaks it. So the visualization is fully built and functional — it simply never receives a
drawing surface unless the user happens to resize their window.

### Root cause (app-side, not kit-side)

The mount runs while the pane is still `display:none`, so the host has no layout to measure:

1. `src/scripts/app/router.js:62-67` — `emit()` notifies its `subscribe()` listeners **first**
   (ViewManager), and only **then** dispatches the DOM `routechange` event.
2. ViewManager → `switchTab()` → `src/scripts/app/shell.js:55` — the `.on` class swap is handed to
   `ViewTransitions.run(swap)`, which defers it into `document.startViewTransition()` (**async**).
3. `src/scripts/app/visual-pane.js:26` — `if (self._active && !was) self._mount();` fires on that
   DOM `routechange`, i.e. **before** the view transition has committed `.on`.
4. `visual-pane.js:47` — `VisualKit.mount(this._host, this._data)` therefore measures a zero-height
   `#vzhost` and sizes the canvas to 0.

**Fix direction:** size the canvas after the pane is actually laid out — mount on the committed
transition (or `requestAnimationFrame` after `.on` lands), or give the kit a `ResizeObserver` on
`#vzhost` so its existing (working) resize path runs once on first layout.

**Repro:** open `dist/index.html#kafka-internals/walk` → click **Visualize** → blank canvas.
Resize the browser window → the visual appears.

---

## FINDING 2 — P2: any `#<topic>/viz` deep link discards BOTH the topic and the view

A deep link to a viz route silently lands on the **wrong topic** and the **wrong pane**, and then
**rewrites the URL** so the original request is destroyed.

### Evidence

```
#kafka-internals/viz  ->  topic "content-pipeline", pane "walk", hash rewritten to "#content-pipeline/walk"
#saga/viz             ->  topic "content-pipeline", pane "walk", hash rewritten to "#content-pipeline/walk"
```

`content-pipeline` is simply the **first-registered** (boot) topic — it is not what was asked for.
Note this hits `#kafka-internals/viz` too, the one topic that *does* have a visual: the only topic
whose Visualize pane could work **cannot be linked to it**.

Controls on the same topic prove the bug is `viz`-specific (all three land correctly):

```
#stream-batch-processing/num    -> pane "num"    topic "stream-batch-processing"  (OK)
#stream-batch-processing/drill  -> pane "drill"  topic "stream-batch-processing"  (OK)
#stream-batch-processing/wb     -> pane "wb"     topic "stream-batch-processing"  (OK)
```

### Users can actually generate these URLs

The `v` keyboard shortcut (`shell.js:89`, the QWERTY row `q..o` + `v`) navigates to the viz route on
**any** topic, including the 45 whose Visualize tab is deliberately `display:none`. Verified:

```
on topic "saga", press "v"  ->  hash "#saga/viz", pane "viz", topic "saga"
```

That URL is what **Copy link** would share and what a refresh would reload — and reopening it lands the
reader on `content-pipeline`, a completely unrelated topic.

### Root cause

`src/scripts/app/visual-pane.js:35-40` — the "bounce off a viz-less topic" guard:

```js
if (!d && this._active) {
  var self = this;
  setTimeout(function () { if (!self._data && self._active && window.goView) window.goView('walk'); }, 0);
}
```

At boot the guard evaluates against the **first-registered topic** (`content-pipeline`, `visual: null`),
not the deep-linked one, because `TopicRegistry.setTopic()` defers the `deeptopicchange` event through a
ViewTransition (`topic-protocol.js:114`). The `setTimeout(…, 0)` therefore fires **before** `renderTopic()`
ever sees the requested topic's real visual data. It calls `goView('walk')`, which routes through
`Router.navigate()` → `topicPrefix()` and stamps the **then-current** topic (`content-pipeline`) into the
hash — overwriting the deep link.

The code comment on that block already anticipates a version of this race ("*the topic protocol rewrites
the hash AFTER this handler*"); the deferred `setTimeout` fixes the *hash* ordering but not the *data*
ordering.

**Repro:** open `dist/index.html#saga/viz` → you land on **Content Pipeline / Walkthrough**.

---

## What is healthy (verified, not assumed)

- **460/460 matrix cells** driven by real tab clicks — **0 console errors, 0 page errors**.
- **All 9 content panes render on all 46 topics.** Zero empty panes. Per-pane text length across
  46 topics (min/median/max characters):

  | pane | min | med | max |
  |---|---|---|---|
  | walk | 12917 | 14335 | 16824 |
  | drill | 15170 | 15293 | 15556 |
  | wb | 11104 | 13892 | 15293 |
  | sys | 5854 | 6055 | 11286 |
  | trade | 2770 | 3399 | 6479 |
  | model | 2539 | 2647 | 4298 |
  | num | 4713 | 5037 | 5363 |
  | rf | 2973 | 3471 | 9472 |
  | open | 5010 | 5834 | 8733 |

- **Every overlay opens and closes cleanly, 0 errors:** mock run, mixed fire, cram sheet, session
  progress, keyboard, scope, game plan, topic index, search, notes, print Q&A, tools FAB.
- **Interactions, 0 errors:** drill grading (keyboard `1`/`2`/`3`/space **and** the in-shadow
  `jm`/`js`/`jg`/`adv` buttons), whiteboard (12 buttons clicked), search (type / arrow / enter /
  no-match), all 15 keyboard shortcuts (`q w e r t y u i o v d / [ ] \ ? g` + walk arrows), theme
  toggle ×3, density cycle, topic next/prev, topic dropdown, home, star/bookmark, copy link, focus
  mode, interviewer-cuts-in, guided tour, mock run (10 beats), mixed fire (8 answers), session
  progress, cram sheet, scroll-to-top.
- **Export / import round-trips correctly.** Export produces a valid 451-byte JSON
  (`{app, v, exported, data}`); wiping all progress then importing it restores the keys. Malformed
  JSON is handled gracefully with an `alert("That file is not valid JSON.")` — no crash.
- **Routing is robust:** deep links, back/forward, and a garbage hash (`#not-a-topic/not-a-view`) all
  behave — the unknown route falls back to `walk` with no error.
- **Mobile (390×844): 0 errors, 1 request.** Boot, pane keys, topic stepping, search, index overlay
  and the Tools FAB all work.
- **Graceful degradation:** the 45 viz-less topics correctly hide the Visualize tab
  (`hidden=true, display:none`) and, if reached via the `v` key, show a clean
  *"This topic has no visual mode."*

### Not a bug: the "START HERE" overlay covers the app on first boot

On a fresh profile the topic index (`#_index-overlay`) auto-opens full-viewport (z-index 1000) and
intercepts all clicks. This is **by design** — `src/scripts/app/index-overlay.js:420-427` carries an
explicit owner verdict ("*the index overlay IS the designed start screen ("START HERE")*"), gated on
`if (!window.__bootHash && !hasProgress)`. A returning user or any hash deep-link skips it.

**Testing hazard worth recording:** a naive click-driven test on a fresh profile produces **460 false
failures** (every tab click times out, blocked by this overlay). My first click-matrix run hit exactly
this. Drive the app with a boot hash (`#walk`) or dismiss the overlay first.

---

## Coverage

**Covered**
- 46/46 topics × 10/10 panes = **460 cells**. 415 reached by real tab clicks; the remaining 45 `viz`
  cells have a `display:none` tab **by design**, so they were reached programmatically via
  `switchTab()` (same code path the click handler and the `v` key call) — all rendered the
  "no visual mode" fallback with 0 errors.
- 12 overlays/tools, 15 keyboard shortcuts, drill grading, whiteboard, search, theme, density,
  topic nav (buttons + dropdown + `[`/`]`), focus mode, guided tour, mock run, mixed fire, session
  progress, cram, print, export/import (incl. malformed-file path), deep links, back/forward,
  garbage hashes.
- Viewports: 1280×900 desktop, 390×844 mobile.
- Network instrumentation (`page.on('request')` / `requestfailed`) active on **every** run.

**Not covered**
- Firefox / WebKit (Chromium only).
- A real discrete GPU — headless uses SwiftShader ("WebKit WebGL"). This does **not** weaken Finding 1:
  WebGL demonstrably works in this browser, and the same canvas renders correctly after a resize.
- Long-session memory/perf profiling (a different lens).
- The native print dialog (headless cannot display it); `#printqa` was clicked and threw no error.

## Scripts & evidence

All under `D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/`:

| script | purpose |
|---|---|
| `scripts/errsweep-discover.mjs` | boot: DOM/API discovery, first network check |
| `scripts/errsweep-matrix.mjs` | click-driven 46×10 (blocked by START HERE — see hazard above) |
| `scripts/errsweep-matrix2/3.mjs` | programmatic 46×10 + render-health |
| `scripts/errsweep-final.mjs` | **definitive** click-driven 46×10 in real user state |
| `scripts/errsweep-tools.mjs` | all overlays, drill, search, keys, theme, mock, mixed fire |
| `scripts/errsweep-vtstall.mjs` / `errsweep-blocked.mjs` | tracked the "unclickable tabs" to the START HERE overlay |
| `scripts/errsweep-idxov.mjs` | proved the START HERE overlay is open-by-design at boot |
| `scripts/errsweep-viz.mjs` / `errsweep-vizbounce.mjs` / `errsweep-kafka.mjs` | Findings 1 & 2 |
| `scripts/errsweep-canvas.mjs` | proved the 0×0 canvas is a sizing race, not a GPU issue |
| `scripts/errsweep-io.mjs` | export/import round-trip |

53 screenshots in `shots/runtime-errors/`. Key ones:
`kafka-viz-clicked.png` (blank canvas + live HUD), `canvas-B-after-resize.png` (the same visual
working after a resize), `canvas-A-after-click.png`, `canvas-C-after-reentry.png`,
`idxov-fresh-boot.png` (START HERE screen), `final2-mobile-boot.png`.
