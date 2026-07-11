# rt-perf — ADVERSARIAL VERIFICATION

**Verdict: the rt-perf lens is unusually accurate.** All 3 findings reproduce. I re-measured every
number independently and hit near-exact agreement on the load-bearing ones. Two minor sub-claims
inside P3 are factually wrong (both in the lens's *own disfavour* — the real numbers strengthen
their argument). Nothing substantive is refuted.

**But the lens missed a P0 that is strictly worse than everything it found:
under `prefers-reduced-motion: reduce` the ENTIRE APP renders blank.** I found it by testing a
mechanism prediction for their P0. Every lens in this audit missed it, and the accessibility lens
actively graded it as a PASS.

---

## 1. Reproduction scoreboard

| Lens claim | My independent measurement | Verdict |
|---|---|---|
| dist = 5,163,186 B | 5,163,186 | EXACT |
| gzip 1,410,162 / brotli 972,560 | 1,410,162 / 972,560 | EXACT |
| 39 SVGs, 796,150 B (15.4%) | 39, 796,150 B (15.42%) | EXACT |
| mermaid `<style>` 4,714 B × 38 | 4,714 B × 38 | EXACT |
| ~171 KiB reclaimable | 174,418 B = 170.3 KiB | EXACT |
| 7,325 numbers ≥3dp, ~26 KiB | 7,325, 26.2 KiB | EXACT |
| viz canvasAttr [0,0], box [592,2], buffer [1,1] | [0,0], [592,2], [1,1] | EXACT |
| +7 JS listeners / viz cycle | +7, every cycle, 149→289 over 20 | EXACT |
| +62 DOM nodes / viz cycle | +62 | EXACT |
| +1 WebGL context / viz cycle | +1, strictly monotonic | EXACT |
| **17th open → context-cap warning** | **fired at cycle 17, verbatim string** | EXACT |
| after 18 opens, 2 of 18 contexts lost | at cycle 18: ctxLost = 2 | EXACT |
| rAF loop correctly cancelled (0 over 3s) | 0 | EXACT |
| heap +0.61 MB / cycle | +0.52 MB / cycle | ~ (same order) |
| responseEnd 70–90ms, domInteractive ~565ms | 57ms / 499ms | ~ (same shape) |

Scripts: `scripts/vrt-p0.mjs`, `vrt-p1.mjs`, `vrt-p1b.mjs`, `vrt-p3.mjs`, `vrt-load.mjs`, `vrt-rm.mjs`, `vrt-blank.mjs`.

---

## 2. MISSED — P0: the whole app is invisible under `prefers-reduced-motion: reduce`

This is the single most severe defect in the artifact and no lens reported it.

**The mechanism is two CSS rules that are individually reasonable and lethal together:**

- `src/styles.css:90` — body is **statically invisible**, and depends *entirely* on an animation to
  become visible:
  ```css
  body{ … opacity:0; animation:bodyIn var(--duration-slowest) var(--ease-glide) var(--duration-fast) forwards}
  ```
- `src/styles.css:91` — `@keyframes bodyIn{from{opacity:0}to{opacity:1}}`
- `src/styles.css:137` — the reduced-motion reset **deletes that animation**:
  ```css
  @media (prefers-reduced-motion: reduce){*{animation:none!important; …}}
  ```

`animation:none` clears `animation-name`, so the `forwards` fill never applies and the static
`opacity:0` from line 90 is the final computed value. (Note line 22's *other* reduced-motion rule,
`animation-duration:.01ms!important`, would have been harmless — a 0.01ms `forwards` animation still
completes and holds opacity 1. Line 137's `animation:none` is the killer.)

**Measured at FIRST LOAD, no clicks, in the shipped `dist/index.html`:**

| | `reduce` | `no-preference` |
|---|---|---|
| `getComputedStyle(body).opacity` | **`"0"`** | `"1"` |
| `getComputedStyle(body).animationName` | **`"none"`** | `"bodyIn"` |
| `document.getAnimations().length` | 0 | 6 |
| body text present | 27,186 chars | 27,186 chars |
| DOM elements | 781 | 781 |

The DOM is **fully and identically built** — it is simply never painted. Screenshot (blank cream
page, nothing else): `shots/verify-rtperf/boot-reduce.png` vs working `boot-no-preference.png`.

**Reach:** every user with "Reduce motion" enabled at OS level (Windows "Show animations" off,
macOS "Reduce motion") opens the app and sees an empty page. All 38 topics, all panes, all tools.
Total product loss — and silent: zero console errors.

**The accessibility lens graded this a PASS.** `_audit/2026-07-11-state-audit/accessibility.md:24`
records `prefers-reduced-motion | TRUE` because all probed elements collapse to
`animation-duration: 1e-05s`. It verified the animations were *suppressed* and never checked that
anything remained *visible*. A false pass on the exact rule that breaks the app.

**Fix (S):** give `body` a non-animated visible resting state. Either drop `opacity:0` from line 90
and let `bodyIn` animate from its keyframe only, or add
`@media (prefers-reduced-motion: reduce){body{opacity:1!important}}`. Then add a regression check
that asserts painted (not merely present) content under reduced motion.

---

## 3. MISSED — the viz blast radius is 1 topic, not "the app"

The lens never states how many topics have a Visualize pane. **Exactly one does.**

```
$ grep -ln "^## Visual" src/topics-md/*.md
src/topics-md/kafka-internals.md          # 1 of 38
$ grep -o 'TOPIC_[A-Z0-9_]*_VISUAL' dist/index.html | sort -u
TOPIC_KI_VISUAL                            # 1 config in the shipped artifact
```

`visual-pane.js:32-33` hides the nav tab for every other topic (`btn.hidden = !d`). So both viz
findings are scoped to **one optional enrichment tab on one topic**. The findings are real; the
severities are inflated. This is why I regrade P0→P1 and P1→P2 below. It does not change the fix —
both are still worth doing, and the fix is 3 lines.

---

## 4. MISSED — the real trigger is the View Transitions async gap (and it makes the bug *conditional*)

The lens says `resize()` "runs before the pane has layout". True in effect, but they never identified
*why*, and the actual cause is more specific and more interesting:

- `shell.js:55` — on the **first** navigation to a pane (`!target.classList.contains('on')`), the
  DOM mutation that reveals it is deferred inside `document.startViewTransition()`:
  ```js
  if (!target.classList.contains('on') && window.ViewTransitions && window.ViewTransitions.run) window.ViewTransitions.run(swap);
  else swap();
  ```
- `router.js:62-67` — `emit()` runs subscribers (→ `switchTab`) and *then* synchronously dispatches
  the `routechange` DOM event that `visual-pane.js:21` listens to.

So `switchTab` returns having only *scheduled* the reveal; `routechange` fires immediately, mounts
the kit, and `resize()` reads a still-hidden pane → `clientWidth === 0` → `setSize(0,0)`.

**Falsifiable prediction, and it holds:** `view-transitions.js` skips `startViewTransition` when
reduced motion is set, so `swap()` runs *synchronously* and the pane has layout before `routechange`.
Measured with `reducedMotion:'reduce'`: **canvas 590×332, drawing buffer 590×332, 3.36% lit pixels**
— matching the standalone trainer's own 3.5% verify floor. The viz renders **correctly**, with no
resize event at all.

(Cosmic joke: under reduced motion the visualization works perfectly — and you can't see it, because
the body is at `opacity:0`.)

The lens's proposed ResizeObserver fix is still the right fix. But the diagnosis matters: this is a
*mount-ordering* bug, and any pane that measures layout on mount is exposed to the same gap.

My T1 run also captured the detail that makes the diagnosis airtight and that the lens missed: at
measurement time the pane **is** laid out — `paneHasOnClass:true, paneClientWidth:592,
hostClientWidth:592` — while the canvas is still `[0,0]`. The width was always available; `resize()`
just never ran again.

---

## 5. P1 root cause — proven directly, not inferred

The lens inferred the retention from reading the code. I measured it. CDP
`DOMDebugger.getEventListeners(window)`:

```
BASELINE window 'resize' listeners = 3
after 1 open/close cycle  -> 4
after 2                   -> 5
after 3                   -> 6
after 4                   -> 7
after 5                   -> 8
after 6                   -> 9
```

**+1 per cycle, never removed** — exactly `visual-trainer/src/render/scene.js:98`
(`window.addEventListener('resize', resize)`), with `createScene()` returning
`{stepParticles, draw, renderer, queues}` at line 101 and **no teardown hook**. That closure captures
`renderer` and `canvas`, which retains the GL context *and*, via `canvas.parentElement`, the entire
detached kit subtree — which is what produces the +62 DOM nodes and the other +6 listeners per cycle.
One unremoved listener is the GC root for the whole leak.

Corroborating the second defect: `renderer.forceContextLoss()` has **zero call sites**. The only
occurrence anywhere in the built kit is three.js's own method *definition*
(`this.forceContextLoss=function(){let y=Ut.get("WEBGL_lose_context");y&&y.loseContext()}`), and
there are no matches at all in `visual-trainer/src/`. `kit.js:150` calls only `scene.renderer.dispose()`,
which frees three's caches but never releases the context.

---

## 6. P3 — confirmed, with two erroneous sub-claims corrected

The finding stands (170.3 KiB of byte-identical duplicated mermaid CSS). Two numbers in the evidence
are wrong:

- **"only 2 unique style bodies among 39 SVGs"** → there is exactly **1** unique style body,
  replicated **38×**. The 39th SVG carries no `<style>` at all; the lens's script counted its
  absence as a second "body". `38 × 4,714 = 179,132 B` (the lens reported 179,702 B — off by 570).
- **"it already gzips at ratio 0.179"** → the SVG payload gzips at **0.075**
  (796,150 → 59,997 B). Their figure is wrong by 2.4×, and the true number *strengthens* their
  argument for leaving it at P3.

P3's deprioritisation is justified: I confirm boot is not byte-bound. Reading all 5,163,186 bytes off
disk takes a median of **57ms** against a **499ms** domInteractive — ~11% of boot.

---

## 7. Severity regrade

| Finding | Lens | Mine | Why |
|---|---|---|---|
| Reduced-motion blank app | *(missed)* | **P0** | Entire app, all topics, silent. |
| Viz pane renders nothing | P0 | **P1** | Real and 100% dead — but 1 optional tab on 1 of 38 topics. P0 should mean "the product is broken"; that's the reduced-motion bug. |
| WebGL context leak | P1 | **P2** | Unbounded and it genuinely breaks at open #17 — but same 1-topic reach, needs sustained interaction, and is currently masked by the pane bug. |
| Duplicated mermaid CSS | P3 | **P3** | Agreed. Housekeeping. |

Fix sequencing is unchanged from the lens's (good) advice: the viz-blank and viz-leak fixes land in
the same function. Returning a `dispose()` from `createScene()` that calls
`window.removeEventListener('resize', resize)` + `renderer.forceContextLoss()`, and replacing the
window listener with a `ResizeObserver` on the canvas parent, fixes both at once. But do the
reduced-motion P0 first — it is a one-line CSS change and it is the difference between the app
working and not working.
