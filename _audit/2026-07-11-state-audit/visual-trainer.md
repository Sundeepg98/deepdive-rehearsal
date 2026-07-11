# LENS: Visual trainer — does it actually work?

**Verdict: the pipeline works. The picture does not.**

Everything around the visual — markdown authoring, compile-time validation, the
conditional tab, the mount/dispose lifecycle, the simulation, the stories, the
controls — is genuinely built, wired, and correct. The one thing that does not
work is **the drawing**. In the shipped `dist/index.html` the WebGL canvas is
**0×0 pixels**. The Visualize pane renders its badge, readouts, sliders, story
buttons and legend, and **zero graphics**.

The renderer itself is fine. Give it a size and it draws correctly and passes the
project's own calibrated pixel thresholds. The app just never gives it a size.

---

## 1. Inventory — what is actually there

| Question | Answer (measured) |
|---|---|
| Topics declaring `## Visual` | **1** — `kafka-internals` only (`grep -l '^## Visual' src/topics-md/*.md`) |
| Modes in the kit registry | **1** — `queue-flow` (`src/scripts/visuals/manifest.json`) |
| Kit bundled into `dist`? | **Yes** — `VisualKit` global, `deep-visual` element, `TOPIC_KI_VISUAL`, three.js (`WebGLRenderer`, `InstancedMesh`) all present in `dist/index.html` |
| Kit size | 492,945 B (~481 KB) `src/scripts/visuals/kit.js` |
| Standalone demo *and* wired into the app? | **Both.** `visual-trainer/kafka-lag-pilot.html` renders standalone (canvas 952×536, 0 console errors). It is *also* genuinely integrated into the trainer. |
| three.js based? | Yes — `THREE.WebGLRenderer`, `OrthographicCamera`, `InstancedMesh` particles. 2D orthographic by law. |
| Sim invariants | **11/11 PASS** (ran `node visual-trainer/test/sim_invariants.mjs`) |
| Topics registered at runtime | 46 (38 markdown + 8 hand-written JS) |

The kafka sim renders: 6 producer squares (left) → 6 partition lag bars that
grow/heat with lag (middle) → consumer circles (right), with instanced particles
flowing, queueing backward from the partition column (backpressure), and flying
to their owning consumer. Idle consumers render as hollow rings.

---

## 2. P0 — the canvas is 0×0: the pane draws nothing

**Measured, `dist/index.html`, desktop 1280×900, clicking Visualize on Kafka Internals:**

```
canvas backing store : [0, 0]
canvas bounding rect : 592 × 2 px      (2px = the two 1px CSS borders — nothing else)
```

Identical on mobile 390×844: backing `[0,0]`, rect `360 × 2`.

Screenshots:
- `shots/visual-trainer/A-viz-pane-AS-SHIPPED.png` — badge, readouts, sliders,
  story buttons, legend. **No graphics whatsoever.**
- `shots/visual-trainer/B-viz-pane-AFTER-window-resize.png` — the same pane after
  a window resize: the full scene appears (producers, partition bars, consumers).

### Root cause (directly measured, not inferred)

Instrumented `DeepVisual.prototype._mount`:

```
ENTERING _mount()            paneClass: "pane"   (NOT "pane on")
                             paneDisplay: "none"
                             shadowHostClientW: 0
AFTER scene build            canvasBackingStore: [0, 0]
+250ms (transition done)     paneDisplay: "block", paneOffsetWidth: 592
                             canvasBackingStore: [0, 0]   <-- never recovers
```

The chain:

1. `shell.js:53` swaps `.pane.on` **through `ViewTransitions.run(swap)`** —
   `document.startViewTransition` defers the callback, so the swap is **async**.
2. `visual-pane.js:21-28` mounts **synchronously** from the `routechange`
   listener — i.e. *before* the pane is made visible.
3. `render/scene.js:94` — `const w = canvas.clientWidth || canvas.parentElement.clientWidth;`
   reads **0** (display:none has no layout) → `renderer.setSize(0, 0, false)`.
4. `render/scene.js:98` — the only re-size hook is
   `window.addEventListener('resize', resize)`. In normal use **it never fires.**
   The canvas stays 0×0 forever.

### Proof the renderer is otherwise correct

Applying the project's **own** calibrated thresholds
(`visual-trainer/_verify_pixels.py`: non-background > 3%, inter-frame change > 0.2%)
to two frames 1.5 s apart, clipped to the canvas:

```
AS SHIPPED (user opens Visualize): size=(591, 2)   changed=0.00%  -> FAIL
AFTER window resize (workaround) : size=(830, 468) non-bg=3.98%  changed=0.28%  -> PASS
```

So: **the graphics are correct and animate; the app ships them at zero size.**

### Fix

`scene.js` — observe the element instead of the window (~2 lines). Fixes every
future mode at once:

```js
new ResizeObserver(resize).observe(canvas.parentElement);   // in addition to / instead of the window listener
```

Effort: **S**. This single change turns the pane from blank into working.

---

## 3. P0 — deep-link / reload on the viz route dumps you on an unrelated topic

Cold load of `file://.../dist/index.html#kafka-internals/viz`:

```
#kafka-internals/viz    -> ends at  #content-pipeline/walk   (kit never mounts)
#kafka-internals/walk   -> stays at #kafka-internals/walk    (control: fine)
#kafka-internals/drill  -> stays at #kafka-internals/drill   (control: fine)
```

`viz` **is** a valid route (`router.js:24`), so the router is not at fault.

**Mechanism:** `content-pipeline` is the **first** `TopicRegistry.register()` call
in the bundle (verified in `dist/index.html`), so it seeds `cur` at boot — and it
has no visual. `deep-visual` boots with `_active === true` (hash view is `viz`)
and receives `renderTopic(undefined)` for that seed topic, which trips its
"bounce off a viz-less topic" guard:

```js
// src/scripts/app/visual-pane.js:35-40
if (!d && this._active) {
  setTimeout(function () { if (!self._data && self._active && window.goView) window.goView('walk'); }, 0);
}
```

The bounce fires **before the router applies the deep-linked topic**, navigating
to `walk` and cementing `content-pipeline`.

**User impact: press F5 while viewing the visual and you lose your topic.**
Combined with §2, there is no path by which a user ever sees this pane working.

Fix: don't bounce during boot — gate the guard until the router has applied the
hash topic, or make it preserve the current topic. Effort **S**.

---

## 4. P1 — nothing in the gate can see either bug

`test/check_all.py:50-51` runs `visual_pane_smoke` and `visual_regression`.

`test/visual_pane_smoke.mjs` asserts:

| line | assertion | passes on a 0×0 canvas? |
|---|---|---|
| 50 | frames advancing | **yes** (rAF runs regardless of size) |
| 51 | sim live, lag grows | **yes** (sim is pure + DOM-free) |
| 52 | "queue choreography live" | **yes** — it reads `queues()`, a JS array length, **not pixels** |
| 66 | story runs with captions | **yes** |
| 77-78 | dispose / tab hidden / bounce | **yes** |

**Not one check asserts the canvas has a size or that a single pixel is painted.**
Every check tests the *simulation and DOM bookkeeping* — never the *rendering*.

The repo's only pixel verifier (`visual-trainer/_verify_pixels.py`, the 3% / 0.2%
floors used above) runs **only against the standalone pilot**, via
`visual-trainer`'s own `npm run verify` — which is not part of the root gate.
`test/visual_regression.py` is a structural HTML/CSS regex check, not a pixel check.

And the prior audit (`_audit/2026-07-08-visual-audit.md`) enumerates
*"Panes: 9/9 (walk drill wb sys trade model num rf open)"* — **`viz` is absent.**
The pane has never been looked at, by machine or by eye.

That is the complete explanation of how "P0+P1 SHIPPED, gate green, smoke 9/9"
coexists with a pane that draws nothing.

Fix: two assertions in `visual_pane_smoke.mjs` — `canvas.width > 0`, and two
clipped screenshots that differ. Reuse the existing calibrated thresholds. **S**.

---

## 5. P1 — the one mode is Kafka semantics wearing generic words

`queue-flow` presents a generic vocabulary (`lanes / rate / sinks / capacity`)
but binds straight to `sim/kafka_lag.js`. Changing `sinks` calls
`sim.setConsumerCount()`, which at `kafka_lag.js:71` sets
`rebalanceRemaining = 2s` — a **stop-the-world Kafka consumer-group rebalance**.

Probed live — a config a `backpressure` (bounded-buffer) topic would plausibly
author, adding a worker (`sinks` 2 → 3):

```json
{ "scenario": "backpressure topic adds a worker (sinks 2 -> 3)",
  "statusBefore": "LAG GROWING",
  "statusAfter":  "REBALANCING",          <-- Kafka stall leaks in
  "rebalanceSecsRemaining": 1.93,
  "KAFKA_STALL_LEAKS": true }
```

It also shows the banner *"REBALANCING — consumption paused"*. That behavior is
**factually wrong** for a bounded buffer, a load balancer, an autoscaling queue,
or a retry storm — which are precisely the four modes `FRAMEWORK.md` advertises
as "direct flow.js consumers" (modes 2, 5, 9, 10).

Also Kafka-hardcoded: round-robin assignment `p.consumer = p.id % consumerCount`,
`slowFactor`, and the literal status strings.

**So: the pipeline is generalized; the mode is not.** Authoring a visual for a
second topic is free. Making it *teach the truth* is not.

---

## 6. P2 — `## Visual` validation is name-only; declared types are decorative

`compile.mjs:23-42` (`validateVisual`) checks: mode exists, param **key names**,
story shape, story `set` **key names**. It never checks values, types, or ranges,
even though the manifest declares them (`lanes: 'int'`).

Probed:

| authored config | compiler | runtime result |
|---|---|---|
| `lanes: "six"` | **accepts** | **0 lanes** — empty scene, no error thrown |
| `lanes: 12, sinks: 12` | **accepts** | partitions own consumers 9, 10, 11 — but `scene.js:36` builds **exactly 9** consumer meshes. Particles fly to sinks that do not exist. |

Fix: enforce the declared types + add min/max to the manifest — the same
fail-fast contract the heading grammar already has. **S**.

---

## 7. P2 — the authoring format is undocumented, and the design doc is wrong

`grep -i visual` over `TOPIC_CONTRACT.md`, `tools/compiler/TOPIC_MARKDOWN_FORMAT.md`,
`docs/`, `README.md` → **zero hits**. A topic author has no way to learn the
section exists.

The only description is `VISUAL_PIPELINE.md:28-41`, and **it does not match the
implementation**:

| VISUAL_PIPELINE.md (design) | parse_md.mjs:448-459 (reality) |
|---|---|
| YAML-ish block | a single fenced ` ```json ` block |
| `lanes: 6` at top level | `lanes` lives **inside `params`** |

This is VISUAL_PIPELINE.md's own **P2 phase ("authoring docs"), never done** —
P0 and P1 are marked `[DONE]`, P2 and P3 are not.

---

## 8. What "make the visual trainer work" actually requires

**To make the existing visual work (kafka-internals) — small and well-defined:**

| Task | Effort |
|---|---|
| ResizeObserver in `scene.js` (the 0×0 bug) | **S** — ~2 lines; this alone makes it visible |
| Don't bounce during boot (`visual-pane.js`) | **S** — restores deep-link/reload |
| Pixel assertions in `visual_pane_smoke.mjs` | **S** — so it can never silently regress |
| Enforce manifest types/ranges | **S** |
| Document `## Visual` + fix VISUAL_PIPELINE.md's spec | **S** |

That is a single focused session, and it ends with a genuinely working GPU pane
on kafka-internals — the thing the commit log already claims.

**To make visuals work for MORE topics:**

Good news: the pipeline is real. All 11 of the 12 "should have a visual"
candidates in VISUAL_PIPELINE.md (`backpressure`, `consistent-hashing`,
`rate-limiting`, `load-balancing`, `autoscaling`, `circuit-breaker`,
`retries-timeouts`, `leader-election`, `caching`, `replication`, +
`kafka-internals`) are markdown-authored and could declare a `## Visual` today.
(8 legacy hand-written JS topics can't — but none of them are visual candidates.)

The real cost is **semantic, not structural**:

- Reusing `queue-flow` as-is on any non-Kafka topic **teaches a falsehood** (§5).
- The honest unit of work is a **topic family**, not a topic: one pure sim +
  its invariant tests (the contract `FRAMEWORK.md` already specifies), which the
  existing `loop / hud / flow` framework, the mount/dispose lifecycle, the
  conditional tab and the compiler all inherit for free.
- Cheapest real next step: **parameterize `kafka_lag.js`** into a generic queue
  sim where the stop-the-world rebalance is *opt-in* (`rebalanceSecs: 0` for
  non-Kafka). That one refactor (**M**) legitimately unlocks the four
  queue-shaped families (backpressure, autoscaling, retry storm, load balancing).
- The other families (consistent-hash ring, circuit-breaker state-flow,
  replication cursors, cache heat grid) each need a genuinely new primitive —
  **L each**, exactly as `FRAMEWORK.md` predicted.

**Bottom line:** the visual trainer is roughly 90% built and 100% invisible. The
gap between "shipped" and "works" is two small bugs and one blind test — not a
rewrite. The gap between "works for Kafka" and "works for the curriculum" is one
medium refactor plus one new sim per concept family.

---

## Evidence index

Scripts (`_audit/2026-07-11-state-audit/scripts/`): `viz-discover.mjs`,
`viz-runtime.mjs`, `viz-rootcause.mjs`, `viz-pixels.mjs`, `viz-verdict.mjs`,
`viz-mountproof2.mjs`, `viz-generalize.mjs`, `viz-paths.mjs`, `viz-deeplink.mjs`,
`viz-bounce.mjs`

Screenshots (`_audit/2026-07-11-state-audit/shots/visual-trainer/`):
`A-viz-pane-AS-SHIPPED.png`, `B-viz-pane-AFTER-window-resize.png`,
`V-shipped-a/b.png`, `V-resized-a/b.png`, `S-standalone-pilot-a/b.png`,
`M-mobile-390-viz.png`, `P-deeplink-coldload.png`, `P-reload-on-viz.png`

**Methodology note:** DOM-level canvas readback (`drawImage` → `getImageData`) is
*invalid* against this renderer — WebGL with `preserveDrawingBuffer: false` clears
the drawing buffer after compositing, returning all-transparent. All pixel
evidence here comes from Playwright **screenshots** (the composited output),
analyzed with PIL using the project's own thresholds.
