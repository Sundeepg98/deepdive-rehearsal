# Adversarial verification — `inv-visual-trainer` lens

**Verdict: 6 findings checked, 6 CONFIRMED, 0 refuted.** I re-measured every runtime claim with
my own Playwright scripts (not the original agent's), re-read every cited file:line, and ran the
project's own gate. I also tried hard to *break* the two causal stories (findings #1 and #2) with
controlled counterfactuals — both survived. This is an unusually clean lens report: the numbers it
quotes are reproducible to the pixel.

I found **two things it missed**, one of which is a P0 that is *worse* than anything in the original
report — and which a sibling lens (`accessibility.md`) actively marked as PASSING.

All evidence below is mine, produced by scripts in `_audit/2026-07-11-state-audit/scripts/inv-viz-*`.

---

## CONFIRMED — 1. The Visualize pane draws nothing; the WebGL canvas is 0x0 (P0)

Reproduced exactly, on the first try, at both viewports.

| measurement | desktop 1280x900 | mobile 390x844 |
|---|---|---|
| `canvas.width/height` (WebGL backing store) | **[0, 0]** | **[0, 0]** |
| `width`/`height` **attributes** | `"0"` / `"0"` | `"0"` / `"0"` |
| `getBoundingClientRect()` | **592 x 2** | **360 x 2** |
| `borderTop` + `borderBottom` | 1px + 1px = **the entire 2px** | 1px + 1px |
| `clientHeight` | **0** | **0** |
| `gl.drawingBufferWidth/Height` | [1, 1] (GL's floor) | [1, 1] |
| render loop | `frames: 38` — **running** | `frames: 117` |
| page errors | **0** — fails silently | 0 |

The original's "bounding rect 592x2, where 2px is just the CSS borders" is exact.

**The project's own calibrated pixel thresholds** (`visual-trainer/_verify_pixels.py`: non-bg > 3%,
inter-frame change > 0.2%), applied to screenshots *I* captured:

```
shipped-desktop   size=(592, 2)    changed= 0.00%  (floor 0.2%)  -> FAIL
resized-desktop   size=(593, 334)  non-bg= 4.54%   changed= 0.27%  -> PASS
```

- As shipped: `shots/inv-visual-trainer-verify/desktop-AS-SHIPPED-full.png` — badge, readouts, three
  sliders, both story buttons, legend, and **zero graphics**.
- After one window resize: `shots/inv-visual-trainer-verify/desktop-AFTER-RESIZE-full.png` — the full
  scene appears (6 lanes, producers, green partition bars, 3 consumer circles).

**The renderer is correct. It is only ever denied a size.**

### Root cause — I tried to refute it and could not

`kit.js:64` creates the canvas with `width:1280 height:720`, so a 0x0 backing store can *only* come
from `setSize()` overwriting it. Instrumenting `DeepVisual.prototype._mount` at runtime:

```json
{ "phase": "ENTER _mount", "paneClass": "pane", "paneDisplay": "none", "vzhostClientW": 0 }
{ "phase": "AFTER _mount (scene built)", "canvasBacking": [0,0], "canvasAttrs": ["0","0"] }
```

The pane is `display:none` when the scene is built, so `scene.js:94`
(`canvas.clientWidth || canvas.parentElement.clientWidth`) reads 0 and calls `setSize(0,0)`.
Its only re-size hook is `window.addEventListener('resize', resize)` (`scene.js:98`), which never
fires in normal use. **`dist/index.html` contains 0 occurrences of `ResizeObserver`.**

A clean 2x2 isolates `ViewTransitions` as the discriminator:

| probe | canvas backing | verdict |
|---|---|---|
| default motion (control) | **[0, 0]** | broken |
| `prefers-reduced-motion: reduce` — **no code injection** | **[590, 332]** | renders |
| `window.ViewTransitions = null` | **[590, 332]** | renders |

`view-transitions.js:24` skips `document.startViewTransition` when reduced motion is set, taking the
**synchronous** `apply()` path — so the pane has layout before `_mount()` runs. Confirmed.

> **Nuance the original missed:** the bug is *motion-preference dependent*. It disappears for users
> who have OS "reduce motion" enabled. That likely explains how it shipped — and it means a
> "works on my machine" report is possible. (See MISSED #1: those users have a different, worse problem.)

The recommended fix (`ResizeObserver` on the canvas's parent) is sound — forcing a real resize is
exactly what made it render.

---

## CONFIRMED — 2. Deep-link / reload on the viz route dumps you on an unrelated topic (P0)

Effect reproduced on cold load, fresh browser context each time:

| deep-link | ends at | topic | kit |
|---|---|---|---|
| `#kafka-internals/viz` | **`#content-pipeline/walk`** | **content-pipeline** | never mounts |
| `#kafka-internals/walk` | `#kafka-internals/walk` | kafka-internals | — |
| `#kafka-internals/drill` | `#kafka-internals/drill` | kafka-internals | — |
| `#kafka-internals/num` | `#kafka-internals/num` | kafka-internals | — |

Navigating to viz normally and pressing **F5**: `#kafka-internals/viz` -> `#content-pipeline/walk`.
Only the `viz` route breaks; the router is fine.

### I attempted to refute the mechanism — and the original turned out to be right

The report claims `content-pipeline` is the **first** `TopicRegistry.register()` call and therefore
seeds `cur`. My first check appeared to refute this: `TopicRegistry.ids()` returns
`["event-driven", "notifications", "real-time-delivery", "cdc", "kafka-internals"]`.

**I was measuring the wrong array.** `topic-protocol.js:121` — `ids()` returns a *sorted curriculum*
order (`_a.sort(topicOrderIndex)`), while `topic-protocol.js:104` seeds the current topic from
**registration** order: `if (cur === null) { cur = t.id; ... }`. A no-hash cold boot proves it:

```json
{ "current": "content-pipeline", "idsFirst": "event-driven", "same": false }
```

The original was correct. **Recording this because a lesser check would have produced a false refutation.**

### Decisive A/B on the bounce guard

`goView('walk')` has **exactly one call site in the entire codebase** — the bounce at
`visual-pane.js:39`. Intercepting `customElements.define` to patch `renderTopic` with/without that
guard, changing nothing else:

| variant | end hash | topic | kit mounted | active pane |
|---|---|---|---|---|
| **bounce removed** | `#kafka-internals/viz` | kafka-internals | **true** | `viz` |
| **bounce intact** (control) | `#content-pipeline/walk` | content-pipeline | false | `walk` |

And the `renderTopic` call log shows the predicted race precisely:

```
bounce removed: [{hasData:false, active:true, t:256},   <- the seed topic (no visual) -- guard's trigger
                 {hasData:true,  active:true, t:829}]   <- the router applies kafka-internals; kit mounts
bounce intact:  [{hasData:false, active:true, t:405}]   <- bounce fires first; second call never happens
```

Mechanism **confirmed**, and the recommendation (gate the bounce so it cannot fire during boot) is
validated: removing it makes the deep-link work perfectly.

---

## CONFIRMED — 3. The gate cannot see either bug (P1)

Proven by the strongest available evidence: **I ran the project's own gate against the exact
`dist/index.html` I measured as 0x0.**

```
$ node test/visual_pane_smoke.mjs
  PASS  kit mounted from TOPIC config; frames advancing
  PASS  sim live (lag grows at authored params 120 vs 90)
  PASS  queue choreography live inside the app pane
  ... 18/18
VISUAL PIPELINE SMOKE: ALL PASS
```

Green on an artifact that draws nothing. Every cited line number checks out (`check_all.py:50-51`;
smoke lines 50/51/52/66/77/78). Not one assertion touches canvas size or pixels: `frames()` advances
regardless of size, the sim is pure and DOM-free, and `queues()` returns a **JS array length**, not pixels.

Supporting checks:
- `visual-trainer/_verify_pixels.py` / `_pw_verify.mjs`: **zero references** in `test/` or root `package.json` — not in the gate.
- `test/visual_regression.py`: self-described *"structure-based checks ... inspecting the built HTML + CSS"*, `import re`. Regex, not pixels. (It loads `deepdive_content_pipeline_rehearsal.html`, which I verified is **byte-identical** to `dist/index.html` — same MD5. Not a finding.)
- `_audit/2026-07-08-visual-audit.md:14`: *"Panes: 9/9 (walk drill wb sys trade model num rf open)"* — `viz` absent. Confirmed.

> **Caveat that matters for the fix:** the project's *non-background* floor is **fooled** by the
> degenerate canvas — I measured **non-bg = 100%** on the shipped 592x2 strip (it is pure border
> colour). Only the *inter-frame change* metric (0.00%) catches it. So the new smoke assertion **must**
> include the explicit `canvas.width > 0 && canvas.height > 0` check; a pixel-delta check alone could
> be satisfied by a degenerate clip.

---

## CONFIRMED — 4. The only mode is Kafka semantics wearing generic words (severity adjusted P1 -> P2)

Facts confirmed at runtime. Mounting the shipped `VisualKit` with a config a **bounded-buffer** topic
would plausibly author (`labels: clients / bounded buffer / workers`, `lanes:4, rate:100, sinks:2`),
then adding a worker (`sinks` 2 -> 3, which is exactly `queue-flow`'s `apply()` path):

```json
{ "statusBefore": "LAG GROWING",
  "statusAfter":  "REBALANCING",
  "rebalanceSecsRemaining": 2,
  "bannerText": "REBALANCING -- consumption paused (1.9s)",
  "roundRobinAssignment": [0, 1, 2, 0],
  "STOP_THE_WORLD_STALL_LEAKED": true }
```

A 2-second stop-the-world consumer-group rebalance is factually wrong for a bounded buffer, worker
pool, load balancer, or autoscaling queue. Code path: `queue-flow/index.js:20` -> `kafka_lag.js:71`
(`state.rebalanceRemaining = cfg.rebalanceSecs`). Round-robin `p.id % consumerCount` (`kafka_lag.js:40`)
and `slowFactor` are likewise Kafka-shaped. The **pipeline** is generalized; the **mode** is not.

**I am downgrading this to P2.** Every technical claim is true, but the harm is *latent*: exactly one
topic (kafka-internals) uses `queue-flow` today, and for Kafka the semantics are **correct**. No user
is currently taught a falsehood. This is a trap for the *next* author, not a live defect — real, worth
fixing before mode #2, but not in the same class as a pane that draws nothing.

---

## CONFIRMED — 5. `## Visual` validation is name-only (P2)

Confirmed against the **real compiler** (`compileTopic()` -> `validateVisual`), run on scratch files in
`_audit/` with the real manifest mirrored into the directory shape it expects. **No tracked file touched.**
Controls prove the validator is genuinely wired:

```
CONTROL-A: unknown mode ....................... REJECTED -> Visual mode "no-such-mode" is not in the kit registry
CONTROL-B: unknown param KEY .................. REJECTED -> Visual param "bogusKey" is not accepted
CONTROL-C: unknown story set key .............. REJECTED -> Visual story "x" sets unknown key "nope"
CASE-1: lanes: "six"  (manifest declares int) . ACCEPTED
CASE-2: sinks: 12     (scene has 9 meshes) .... ACCEPTED
CASE-3: lanes: -5     (negative) .............. ACCEPTED
CASE-4: rate: "fast"  (declares number) ....... ACCEPTED
```

`compile.mjs:31-33` only checks that param **keys** exist in `mode.params`; declared types
(`"lanes": "int"`) are decorative. **Broader than the original reported** — negative lanes and a string
`rate` also sail through.

Runtime consequences (shipped kit):
- `lanes: "six"` -> `Array.from({length:"six"})` -> **`resultingLaneCount: 0`**. An empty scene, no throw, no error.
- `sinks: 12` -> sim assigns partitions to consumers **[9, 10, 11]**, but `scene.js:36` builds exactly
  9 consumer meshes (`for (let i = 0; i < 9; i++)`). I computed where those sinks land via the scene's
  own `laneYn`: consumer 10 -> **y = -0.45**, consumer 11 -> **y = -1.27** — *below the orthographic
  camera's visible range [0, 9]*. Particles fly **off-screen**.

---

## CONFIRMED — 6. `## Visual` is undocumented, and VISUAL_PIPELINE.md contradicts the implementation (P2)

Grep for "visual" across the authoring surface:

| file | hits |
|---|---|
| `TOPIC_CONTRACT.md` | **0** |
| `tools/compiler/TOPIC_MARKDOWN_FORMAT.md` | **0** |
| `README.md` | **0** |
| `docs/` | **0 files** |

The only description is `VISUAL_PIPELINE.md:28-41`, and it does not match the code — on **two** counts:

```yaml
## Visual                 # doc: an UNFENCED, YAML-ish block
mode: queue-flow
lanes: 6                  # doc: lanes at TOP LEVEL
params: { rate: 120, sinks: 3, capacity: 30 }
```

The compiler (`parse_md.mjs:448-459`) requires **one fenced ```json block** and the real schema nests
`lanes` **inside `params`** (`kafka-internals.md:445`). An author following the doc verbatim gets a
build error. The doc also promises *"bad param = build error"*, which finding #5 shows is false.

The grammar's valid-headings error message (`parse_md.mjs:486-489`) is the only place `## Visual` is
discoverable — exactly as the original said.

---

# MISSED by the original lens

## MISSED-1 (P0) — The ENTIRE APP is a blank page under `prefers-reduced-motion: reduce`

Found while building the counterfactual for finding #1. This is **not** a screenshot artifact — it is
computed style, and it ships.

`src/styles.css:90` declares the body **invisible**, relying on an *animation* to reveal it:

```css
body{ ... opacity:0; animation:bodyIn var(--duration-slowest) ... forwards}
@keyframes bodyIn{from{opacity:0}to{opacity:1}}
```

`src/styles.css:137` then kills that animation for reduced-motion users:

```css
@media (prefers-reduced-motion: reduce){*{animation:none!important; ...}}
```

With `animation-name: none`, the `forwards` fill never applies and the body stays at its declared
`opacity: 0`. Measured live on `dist/index.html`:

| | `body` opacity | `body` animation | page |
|---|---|---|---|
| **`reduce`** | **0** | **none** | **BLANK** |
| `no-preference` (control) | 1 | `bodyIn` | renders normally |

Layout is fully present (`innerText` = 1483 chars, `elementFromPoint(centre)` = `DEEP-WALKTHROUGH`) —
it is simply invisible. Verbatim in `dist/index.html`.

- Blank: `shots/inv-visual-trainer-verify/rm-reduce-2-after-close.png`
- Control: `shots/inv-visual-trainer-verify/rm-no-preference-2-after-close.png`

**This affects every user with OS "reduce motion" enabled** (Windows: Settings > Accessibility >
Visual effects > Animation effects; macOS: Reduce Motion) — a common accessibility setting, and one
frequently defaulted-on in VMs and remote-desktop sessions. They get a white screen. The app is not
degraded for them; it is *gone*.

**The sibling `accessibility.md` lens marked this PASSING.** Its table row reads:
*"`prefers-reduced-motion` | `fd50959` | **TRUE** | ... all 9 probed elements collapse to
`animation-duration: 1e-05s`"*. That observation is *correct but incomplete* — two competing
`!important` rules exist (`styles.css:22` sets `animation-duration:.01ms`, `styles.css:137` sets
`animation:none`), so duration collapses **and** `animation-name` becomes `none`. The lens verified the
mechanism and never checked the outcome: it never read `opacity`, and never looked at a screenshot.

**Fix (S):** give the body a non-animated visible base — e.g. add
`@media (prefers-reduced-motion: reduce){ body{opacity:1} }`, or drop `opacity:0` from the base rule
and animate from a wrapper. Then assert `getComputedStyle(document.body).opacity === '1'` under
`reducedMotion:'reduce'` in the gate.

## MISSED-2 (P3) — The project's own non-background pixel floor is fooled by a degenerate canvas

`_verify_pixels.py`'s `non-bg > 3%` check **passes at 100%** on the shipped 0x0 canvas, because the
592x2 strip is pure border colour — further from `(13,17,23)` than the threshold. Only the
`changed > 0.2%` metric catches the failure (0.00%).

This is a booby-trap for finding #3's fix: a pixel check bolted on *without* an explicit canvas-size
assertion could be trivially satisfied. The original's recommendation does include the size assertion —
this note just explains *why that half is load-bearing* and must not be dropped as redundant.

---

## Reproduction

```bash
cd D:/claude-workspace/deepdive-rehearsal
node _audit/2026-07-11-state-audit/scripts/inv-viz-verify-core.mjs      # canvas 0x0, desktop+mobile+standalone control
python3 _audit/2026-07-11-state-audit/scripts/inv-viz-pixels.py         # project's own thresholds on my shots
node _audit/2026-07-11-state-audit/scripts/inv-viz-causal.mjs           # the 2x2 root-cause isolation
node _audit/2026-07-11-state-audit/scripts/inv-viz-reducedmotion.mjs    # MISSED-1: body opacity:0
node _audit/2026-07-11-state-audit/scripts/inv-viz-deeplink.mjs         # deep-link + reload
node _audit/2026-07-11-state-audit/scripts/inv-viz-bounce2.mjs          # bounce-removal A/B
node _audit/2026-07-11-state-audit/scripts/inv-viz-compilerprobe.mjs    # REAL compiler validation + controls
node _audit/2026-07-11-state-audit/scripts/inv-viz-runtime-probes.mjs   # Kafka leak + lanes/sinks
node test/visual_pane_smoke.mjs                                         # the gate: ALL PASS on a 0x0 canvas
```
