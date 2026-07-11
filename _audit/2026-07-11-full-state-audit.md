# deepdive-rehearsal — FULL STATE AUDIT

**Date:** 2026-07-11 · **Artifact:** `dist/index.html` (5,163,186 B, byte-identical to the tracked
`deepdive_content_pipeline_rehearsal.html`, md5 `6fc92f15288ae4567d1b035db3e98e9c`) · **HEAD:** `3f51bc1`
**Method:** 16 lenses (5 inventory, 8 runtime/Playwright, 3 visual-design), each independently
adversarially re-verified by a second agent. Refuted findings were stripped. Every number below was
measured, not inferred.

**Evidence base:** `_audit/2026-07-11-state-audit/` — 16 lens reports, 16 verification reports,
~120 scripts, ~400 screenshots.

---

## 1. EXECUTIVE SUMMARY

1. **The engineering is good; the app is broken in ways the gate cannot see.** 57 modules, zero
   orphans, zero duplication, zero console errors across 460 topic×pane states, a clean TopicPane
   contract (810 topic-pair × pane combinations, zero stale-content leaks). All 19 gate checks pass.
2. **The app renders a BLANK WHITE PAGE for any user with `prefers-reduced-motion: reduce`.**
   `styles.css:90` makes `body{opacity:0}` and depends on an animation to reveal it; `styles.css:137`
   deletes that animation. Zero console errors. Four independent lenses caught it; the accessibility
   lens *certified it passing*. This is the single most severe defect in the repo. **One-line fix.**
3. **On a phone, the Tools button — the ONLY entry point to 12 tools — is off-screen on 16–24 of 46
   topics, and on the longest topic it is unreachable at ANY point on the display, even at 430px.**
   One missing `min-width:0`. **One-line fix.**
4. **46 topics is real, but 38 of them are 28% of reference depth** — and a large fraction of the
   "missing" content **is already authored and silently discarded at build.** The markdown compiler
   requires bullet-list tokens; the authors used the plain-line form *the compiler's own docs show*.
   **189 System-Map stages, 114 drill tier-notes and 76 pivot answers are thrown away on every build.**
5. **Consequences of #4 are user-visible and ugly:** the System Map has no map on 38/46 topics; the
   literal string `undefined` renders on screen at three sites; pivot answers glob into a 1,500–2,100px
   nowrap chip that gets clipped mid-word; cross-topic jump navigation is dead on 38/46.
6. **Two flagship tools serve the wrong topic's content on 45 of 46 topics.** The Cram sheet (the
   night-before artifact) renders Content Pipeline's S3/Lambda spine under a correctly-renamed
   "CRAM SHEET · CACHING STRATEGIES" header. Same for "Scope it first".
7. **The app's own recommended button destroys the user's progress.** Clicking "Drill my 3 Revisit
   probes →" and grading one card rewrites a completed 22/22 run to `{done:1, tot:3, revisit:[]}`.
8. **The visual trainer does not draw anything** — the WebGL canvas is 0×0 — but it is **two S-effort
   bugs from working.** The sim is correct (11/11 invariants pass), the pipeline is correct, the
   standalone pilot renders flawlessly. Cruel irony: the *only* configuration in which it renders is
   `prefers-reduced-motion`, i.e. the configuration in which the whole app is invisible.
9. **The 5.1 MB is NOT a problem.** Counterfactual: removing 1,286,662 bytes (25% of the file) changed
   `domInteractive` by −89 ms — it got *slower*, inside noise. Boot is layout-bound (309 ms layout vs
   79 ms V8 compile). Do not "optimize" the bundle.
10. **Root cause of everything:** the gate tests *truthiness*, not *population*
    (`if (!data[v])` — `{stages: []}` is truthy). You get exactly what you measure. Every defect above
    shipped through a green 19/19.

**Verdict: this is a fundamentally sound app with a broken build-time content path and four one-line
show-stoppers. Nothing here needs a rewrite. Almost nothing needs to be cut.**

---

## 2. TOPIC INVENTORY — the definitive answer to "what topics are there now"

**46 topics = 38 markdown + 8 legacy JS.** There is no missing content and no phantom count.

| Source | n | Where | Registered by |
|---|---|---|---|
| Markdown, compiled at build | **38** | `src/topics-md/*.md` → `src/topics/_generated/<id>/` | `compileTopicsPlugin` (`tools/compiler/compile.mjs`) via `src/topics/_generated-registry.js` |
| Legacy hand-written JS dirs | **8** | `src/topics/<id>/` (11 slices + `register.js`) | 8 explicit `@build:include` lines, `src/scripts/app.js:8-15` |

Runtime confirms: `TopicRegistry.ids().length === 46`, `TOPIC_ORDER.length === 46`, zero orphans
either way, zero page errors. **971 drill cards** total (798 md + 173 legacy). 6 groups.

`depth` = sum of the ten panes the gate does **not** measure (walk + wb + sys.stages + pivots + trade
+ model + rf + open + curveballs + mockBeats). Legacy reference = **72**.

| # | id | Title | Group | Src | Cards | Tiers | Depth | %ref | cmpNotes | sys.stages | Viz |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | event-driven | Event-Driven Backbone | Messaging & Events | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 2 | **notifications** | Notifications | Messaging & Events | **JS** | 21 | 5/11/5 | **72** | **100%** | 9/9 | 6 | — |
| 3 | real-time-delivery | Real-Time Delivery | Messaging & Events | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 4 | cdc | Change Data Capture | Messaging & Events | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 5 | kafka-internals | Kafka Internals | Messaging & Events | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | **YES** |
| 6 | stream-batch-processing | Stream and Batch Processing | Messaging & Events | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 7 | saga | The Saga Pattern | Messaging & Events | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 8 | caching | Caching Strategies | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 9 | soft-delete | Soft Deletes | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 10 | **eav** | Attribute Store | Data & Storage | **JS** | 21 | 5/11/5 | **72** | **100%** | 9/9 | 6 | — |
| 11 | shared-definition | Shared Definition & Overrides | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 12 | replication | Replication and Quorums | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 13 | consistency-models | Consistency Models | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 14 | sharding-strategies | Sharding and Partitioning | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 15 | consistent-hashing | Consistent Hashing | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 16 | storage-engines | Storage Engines | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 17 | probabilistic-structures | Probabilistic Data Structures | Data & Storage | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 18 | retries-timeouts | Retries, Timeouts, Deadlines | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 19 | idempotency | Idempotency | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 20 | circuit-breaker | Circuit Breaker | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 21 | error-propagation | Error Propagation Across Services | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 22 | backpressure | Backpressure and Flow Control | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 23 | observability | Observability | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 24 | debugging | Production Debugging and Incident Diagnosis | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 25 | slos | SLOs and Error Budgets | Reliability & Obs. | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 26 | **iac** | Infrastructure as Code | Platform & Infra | **JS** | 22 | 5/12/5 | **72** | **100%** | 9/9 | 6 | — |
| 27 | **desired-state** | Desired State | Platform & Infra | **JS** | 21 | 5/11/5 | **72** | **100%** | 9/9 | 6 | — |
| 28 | **aws-hardening** | AWS Hardening | Platform & Infra | **JS** | 21 | 5/11/5 | **72** | **100%** | 9/9 | 6 | — |
| 29 | load-balancing | Load Balancing | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 30 | autoscaling | Autoscaling | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 31 | leader-election | Leader Election | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 32 | distributed-locks | Distributed Locks | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 33 | multi-region | Multi-Region and Disaster Recovery | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 34 | lambda-organization | Lambda Organization at Scale | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 35 | devices-dispatch | Device Fleet Dispatch | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 36 | developer-platform | Developer Platform Engineering | Platform & Infra | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 37 | state-machine | State Machine Design | Architecture & APIs | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 38 | rules-engine | Rules Engine & Dual Authorization | Architecture & APIs | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 39 | feature-flags | Feature Flags & Dynamic Config | Architecture & APIs | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 40 | api-design | API Design and Contracts | Architecture & APIs | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 41 | rate-limiting | Rate Limiting | Architecture & APIs | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 42 | **content-pipeline** | Content Pipeline | Architecture & APIs | **JS** | 22 | 3/10/8 | **72** | **100%** | 9/9 | 6 | — |
| 43 | microfrontend | Microfrontend Architecture | Architecture & APIs | MD | 21 | 7/7/7 | 20 | 28% | 2/9 | 0 | — |
| 44 | **signing** | Package Signing | Security & Tenancy | **JS** | 21 | 5/11/5 | **72** | **100%** | 9/9 | 6 | — |
| 45 | **authz** | Tenant Authorization | Security & Tenancy | **JS** | 24 | 5/13/6 | **72** | **100%** | 9/9 | 6 | — |
| 46 | multi-tenant | Multi-Tenant Isolation | Security & Tenancy | MD | 21 | 7/7/7 | 21 | 29% | 2/9 | 0 | — |

### The two content classes (mean per topic, measured from the live registry)

| Slice | Legacy (n=8) | Markdown (n=38) | % of reference |
|---|---|---|---|
| `drill.cards` | 21.6 | 21.0 | **98%** ← *the only pane the gate counts* |
| `walk.steps` | 9.0 | 4.0 | 44% |
| `wb.steps` | 9.0 | 2.0 | 22% |
| **`sys.stages`** | **6.0** | **0.0** | **0%** |
| `sys.pivots` | 7.0 | 2.0 | 29% |
| `sys.pivots` **with an answer** | 56/56 | **0/76** | **0%** |
| `trade.decisions` | 7.0 | 3.0 | 43% |
| `model.answers` | 9.0 | 2.0 | 22% |
| `rf.flags` | 9.0 | 3.0 | 33% |
| `open.cards` | 2.0 (open+close) | 1.0 (open only) | 50% |
| `bank.curveballs` | 8.0 | 1.0 | 12% |
| `bank.mockBeats` | 6.0 | 2.0 | 33% |
| `identity.cmpNotes` | 9/9 panes | 2/9 panes | 22% |
| drill cards with a follow-up probe (`f`) | 173/173 | **0/798** | **0%** |
| drill cards with a `senior` note | 173/173 | **0/798** | **0%** |
| cross-topic pivot jump chips | 43 | **0** | **0%** |

**The one pane the gate enforces (`drill`, ≥18 cards) is the one pane where the 38 match.**

### Content quality: the 38 are UNDER-BUILT, not badly built
- **Zero** placeholder text (TODO / FIXME / TBD / lorem / XXX) across all 38 `.md` files.
- A deep read of 13 topics found **zero technical errors**. Bloom-filter math (`k = (m/n)·ln2`), the
  Redlock/fencing-token critique, the RUM conjecture, CAP-vs-PACELC, and Kafka's commit-ordering
  semantics are all precisely correct and current. This is senior-grade prose.
- The deficiency is **quantity of beats**, not filler. **No topic should be cut.**

---

## 3. VISUAL TRAINER — true state, and exactly what "make it work" requires

### What genuinely works (verified, not assumed)
- **The simulation is correct.** `node visual-trainer/test/sim_invariants.mjs` → **11/11 PASS**
  (drain/grow by capacity, consumers-beyond-partitions add zero capacity, rebalance stall,
  slow-consumer skew, determinism). `src/sim/kafka_lag.js` is pure, deterministic, DOM-free.
- **The framework is real:** fixed-dt loop, HUD/story driver, counter-driven particle choreography.
- **The standalone pilot renders flawlessly** — `visual-trainer/kafka-lag-pilot.html`, canvas
  952×536, animating, 0 console errors, in the same headless browser.
- **The in-app pipeline is correct end to end:** `## Visual` fenced-JSON in a topic's markdown →
  `parse_md.mjs:448` → `compile.mjs:23 validateVisual` (against the generated kit manifest) →
  `TOPIC_<P>_VISUAL` → registry → `deep-visual` (a proper TopicPane) lazily mounts VisualKit on route
  `viz`, disposes on leave. The tab is correctly hidden on the 45 topics without a visual
  (zero mismatches across all 46).

### What does not work: **it draws nothing**
In the shipped app the WebGL canvas is **0×0** (backing store), CSS box **592×2px** — where the 2px
is *entirely* its own 1px top + 1px bottom border. The user sees the badge, the readouts, three
working sliders, two story buttons and a legend **above a completely empty void**. Zero console
errors. Desktop AND mobile. Every visit, including re-entry.

**Root cause (proven, not inferred):** `scene.js:93-99` calls `resize()` once, synchronously, at
mount — while the pane is still `display:none`, because `shell.js:55` hands the `.on` class swap to
`document.startViewTransition()` (async) while `router.js:66` dispatches `routechange` (which
`visual-pane.js:26` mounts on) synchronously. `canvas.clientWidth` is 0 → `renderer.setSize(0,0,false)`
→ and `updateStyle=false` means three.js never writes a CSS height either. Its ONLY re-trigger is
`window.addEventListener('resize', resize)`, which never fires. **`ResizeObserver` appears zero times
in the entire codebase.** Dispatching one window `resize` event snaps the canvas to 590×332 and it
renders and animates correctly.

**The cruel detail:** under `prefers-reduced-motion: reduce`, `view-transitions.js:24` takes the
synchronous `apply()` path, the pane is revealed synchronously, and **the canvas renders correctly**.
So the only configuration in which the visual trainer works is the one in which the entire app is a
blank white page (§4/ISSUE-1). That is almost certainly how both bugs shipped.

### What "make it work" requires — exactly

| # | Change | File | Effort |
|---|---|---|---|
| 1 | `ResizeObserver` on the canvas's parent, re-running `resize()`; disconnect in `dispose()` | `visual-trainer/src/render/scene.js:93-99` | **S** |
| 2 | Fix the deep-link bounce so `#<topic>/viz` doesn't discard the topic | `src/scripts/app/visual-pane.js:39` (see ISSUE-9) | **S** |
| 3 | Stop the WebGL context leak: `removeEventListener('resize')` + `renderer.forceContextLoss()` in `dispose()` (currently **zero call sites**; leaks +1 GL context per open, Chrome warns at the 17th) | `scene.js:98`, `kit.js:150` | **S** |
| 4 | Gate it: assert `canvas.width > 0 && canvas.height > 0` **and** a non-blank pixel readback. The size assertion is load-bearing — the project's own `non-bg > 3%` floor **passes at 100%** on the degenerate 592×2 strip (it's pure border colour). Only the inter-frame-change metric (0.00%) catches it. | `test/visual_pane_smoke.mjs` | **S** |
| 5 | Enforce the manifest's declared param types (today `lanes:"six"`, `lanes:-5`, `rate:"fast"`, `sinks:12` all compile clean; `sinks:12` renders consumers below the camera frustum) | `tools/compiler/compile.mjs:31-33` | **S** |
| 6 | Fix the docs: `VISUAL_PIPELINE.md:28-41` specifies an *unfenced YAML block with top-level `lanes:`*; the compiler requires **fenced JSON with `lanes` inside `params`**. `## Visual` is documented in **zero** authoring surfaces (TOPIC_CONTRACT.md, TOPIC_MARKDOWN_FORMAT.md, README, docs/ — all 0 hits). | docs | **S** |

**Total to make it work: ~4 hours of S-effort changes.** Nothing structural.

### The strategic question it then poses
`kit.js` is **492,945 B = 9.5% of the 5.16 MB payload** and serves exactly **1 of 46 topics**. There
is exactly **one** mode in the registry (`queue-flow`). After the fixes, the operator must choose
COMMIT or PARK (see §8, Option D). One caveat if committing: `queue-flow` is **Kafka semantics in
generic clothing** — changing `sinks` triggers a 2-second stop-the-world REBALANCE stall
(`kafka_lag.js:71`), which is factually **wrong** for a bounded buffer, worker pool, load balancer or
autoscaling queue. Parameterize `rebalanceSecs` out before mode #2 lands. (Latent, not live: for
Kafka, today's semantics are correct.)

---

## 4. RUNTIME VERDICT

### Healthy — genuinely, measurably
- **Zero console errors, zero page errors, zero failed requests** across 460 topic×pane states, all
  27 tools, every overlay, all 15 keyboard shortcuts, drill grading, search, theme, mock run, mixed
  fire and an export/import round-trip. Eight independent Playwright runs.
- **The offline contract is airtight.** Across 8 runs the ONLY network request ever issued was the
  document itself. No CDN, font, telemetry or beacon. Zero runtime libraries ship (no mermaid /
  mathjax / shiki at runtime — the 796 KB of SVG is pre-rendered at build).
- **The TopicPane refactor is a success.** 810 (topic-pair × pane) combinations checked at text-node
  granularity → **0 stale-content leaks**; A→B→A round-trip byte-identical; topic switch median
  14.8 ms.
- **No memory leak in the core app.** 24 topic switches with forced GC: heap +0.07 MB, listeners
  **flat at 135**, DOM nodes bounded. (The only leak is in the viz pane — see ISSUE-16.)
- **Overlays are solid.** All 11 modal overlays open, render fully inside a 390px viewport, trap
  focus, restore focus to their trigger, and close on ESC and on their × button.
- **Persistence is solid.** Defensive localStorage wrapper with in-memory fallback + a
  `storagedegraded` banner, full export/import (byte-identical round-trip), per-topic soft-undo.
- **Performance is fine and the 5.1 MB is not the problem.** Whole file reads off disk in ~90 ms; V8
  compiles the 4.5 MB main script in 79 ms (83.5% of it is string literals — scanned, never compiled).
  Counterfactual (6 cold runs/variant): stripping **1,286,662 bytes** (the whole three.js kit + all
  796 KB of SVG) changed `domInteractive` by **−89 ms** — it got *slower*, inside noise. Boot is
  **layout-bound** (309 ms layout vs 79 ms compile). **Do not optimize the bundle.**

### Broken
- **The whole app is invisible under reduced motion** (ISSUE-1). Not degraded — blank.
- **Mobile chrome overflows the viewport on 46/46 topics at ≤360px** and pushes the *only* Tools entry
  point off-screen on 16–24 of 46 topics; unreachable at any point on the display on the longest topic
  even at 430px (ISSUE-2).
- **Silent content clipping.** `.stage{overflow-x:hidden}` eats real content on **40 of 414** mobile
  states (Numbers on 31/46 topics, Walkthrough on 9/46, worst +208px) and on **22/46** topics at
  1280px desktop — including part of an actual *number* on the Numbers/NALSD pane, which is the one
  pane where the number is the whole point.
- **Three tools render another topic's content or literal `undefined`** (ISSUE-3, ISSUE-5).
- **The progress model can be destroyed by the app's own CTA** (ISSUE-4).

### Accessibility
axe returned **0 violations across 53 scenarios** — and that result is close to vacuous. axe could
only adjudicate **7.3%** of the app's text for contrast (9 nodes decided, 114 abstained on gradients
and pseudo-elements), and its heading rules pass *precisely because the entire application contains
exactly one heading*. Contrast is genuinely clean (19/19 text roles pass AA in both themes,
5.27–15.22:1). The real gaps: no heading structure anywhere; the 9-section primary nav exposes no
selected state; **the drill's answer reveal — the core loop — is completely silent to screen readers**
(and so is Mixed Fire, and cross-drill); the mock timer is a per-second `aria-live="polite"` region
(~1,320 announcements per 22-minute round); the closed mobile Tools sheet keeps 12 focusable,
screen-reader-exposed buttons off-screen. **Zero of the 19 gate checks is an accessibility check**,
though `axe-core` is an installed devDependency wired into nothing.

---

## 5. VISUAL IMPROVEMENT PLAN (prioritized, concrete)

> ⚠️ **Read this first — it will otherwise waste a day.** The 9 panes are **shadow-DOM web
> components** that adopt `[BASE_SHEET, <component sheet>]`. **Global CSS does not cross the shadow
> boundary.** A verification agent empirically proved 10 recommended selectors are **no-ops** in
> `styles.css` (`.wb-rev`, `.wb-got`, `.wb-miss`, `.op-rev`, `.piv-jump`, `.arc-t`, `.msel`,
> `.dots i`, `#num input`, `.mb-rev`), while the light-DOM control group applied fine. There are
> **already dead rules in `styles.css` from the migration**: `styles.css:370-372` names
> `.dn-step, .op-rev, .wb-rev, .wb-got, .wb-miss, .mb-rev, .mb-next` for the button-ripple effect —
> **none of those exist in light DOM any more**, so the :active tap feedback never fires on any pane
> control. **Split every fix by DOM boundary.** Pane-internal fixes go in the component's own
> stylesheet, or once into `BASE_SHEET` (`src/scripts/app/base-styles.js`).

### Tier 0 — stop shipping wrong or invisible pixels (these are not polish; they are why it looks broken)
1. **Reduced-motion blank page** — 1 line (ISSUE-1).
2. **`min-width:0` on `.side-id .topic-nav`** (`styles.css:825`) — 1 line. Verified to fix, in one
   change: the 46/46-topic document overflow, the off-screen Tools button, the clipped `.seg` tab
   strip, and the overhanging fixed bottom bar (ISSUE-2).
3. **The compiler parse fix** (ISSUE-5) — turns 76 clipped 1,500–2,100px nowrap chips into ~50-char
   labels, fills 38 empty System Maps with their 189 authored stages, and removes the on-screen
   `undefined`. **This is the single largest visual improvement available, and it is a parser branch.**
4. **Viz canvas `ResizeObserver`** — turns a blank void into a working GPU visualization (§3).
5. **Numbers pane clipping** — `grid-template-columns: 1fr minmax(0,auto)` + drop `white-space:nowrap`
   from `.nrow-v`; and `.nv-u` has a **hard 30px width** for units like "workers" (exactly the +28px
   overrun). Fixes desktop *and* mobile.

### Tier 1 — composition (the app currently shouts in the wrong places)
6. **The sidebar overflows by 593px at 1440×900** — the wordmark, the topic title AND the primary CTA
   all scroll off-screen. Collapse the 11 desktop tool rows into a Tools popover (mobile already does
   exactly this). **M**
7. **The composition is inverted.** The left rail has an *animated gradient* topic title (the only
   animated chromatic text on the page) and a 17,358px² purple CTA, while the stage's own title is
   monochrome solid ink and its actual next action is 2,898px² — 6× smaller than the rail's *secondary*
   CTA. Move the chroma + motion onto the stage-head; promote each pane's advance action. **M**
8. **One verb, four buttons.** The "reveal / advance" action ships as four different treatments with a
   **15.4× area spread**: drill `#adv` 28,864px² → walk `#wnext` 2,898 → `.op-rev` 2,776 → `.wb-rev`
   1,879. Define exactly two button roles (primary = adopt the drill's treatment; secondary). **M**
9. **The topic switcher renders ONE character of the topic name** (`#tncurrent` clientWidth **21px** vs
   scrollWidth 103–146px). `.tn-trigger` is `flex-direction:row`, so the "REHEARSING" eyebrow eats the
   width. One rule: `flex-direction:column; align-items:flex-start`. The eyebrow is already styled as
   an eyebrow — it was plainly *designed* to sit above the name. **S**
10. **Mobile: 58.8% of the phone is chrome**, and the top 373px states the topic name **twice** and the
    view name **twice**. Hide `.side-id .hdr` (the name is already in the topic pill, which is also the
    control that changes it) and `.stage-head .sh-name`. Recovers ~163px → a **47% larger content
    window**. Move the "Interviewer cuts in" toggle (a mock-run-only setting occupying 43px of prime
    thumb real estate on all 9 views) into the Mock Run overlay: the bottom bar drops 123px → ~71px. **M**

### Tier 2 — identity (the biggest distinctiveness win in the app)
11. **The group-colour system is invisible — and it's stock Tailwind.** The six group colours are
    unmodified Tailwind-600s (`#0D9488 #2563EB #D97706 #7C3AED #DB2777 #DC2626`) beside a hand-picked
    warm-paper palette — used **only as a 7px dot**. `--topic-accent` is never set; both `.sh-kick` and
    `.cmp-eyebrow` resolve to the generic accent. **Re-mix the six hues toward the paper palette (drop
    chroma ~25%, warm the blues), set `--topic-accent` on `<html>` at topic-switch, and thread it
    through the stage-head, the kicker and a 2px pane accent → six groups become six rooms.** This is
    the single highest-leverage move for making the app feel *designed* rather than assembled. **M**
12. **Fix the mesh-gradient artifact.** It currently renders as a hard-edged rectangle that slowly
    drifts on a 16–20s loop — measured single-pixel first-derivative steps of Δ=9–15 at exactly the
    blob's own box edges (x=576, y=360). `radial-gradient(circle closest-side, …, transparent 100%)`
    (+ `border-radius:50%` / `blur`) turns a visible bug into the atmosphere it was meant to be. **S**
13. **The Numbers spec-sheet row is a genuinely distinctive component** (label + explanation left, big
    mono value right). Fix the clip (Tier 0 #5), add `font-variant-numeric: tabular-nums`, and it
    becomes a signature element. **S**

### Tier 3 — system hygiene
14. **Type scale is not honoured:** 7 off-scale sizes (9.5 / 10 / 10.5 / 11.5 / 13.333 / 13.5 / 17) and
    **11 distinct sizes inside a 5px band**. Direct cause: **91 uses of the `font:` shorthand**
    (13.333px is Chrome's UA `<button>` default leaking through). Ban the shorthand; set an explicit
    tokenised `font-size` on every `button`. **M**
15. **Measure:** 118.7ch in the stage, 36.6ch in the rail — both ends of wrong (comfortable is 45–75).
    `max-width: 68ch` on every prose role; widen the companion to ~330px. **S**
16. **Two overlay design languages ship side by side:** 4 widths (560/600/660/760), 2 radii, 2
    close-button *sides*, 2 title treatments, 2 vertical anchors. Pick one. **S**
17. **Tap targets:** 46 distinct controls under 44×44 — including the whiteboard's **entire** interaction
    surface (`.wb-rev`/`.wb-got`/`.wb-miss` at 28px) and `#_focus-toggle` at **60×20px with a 9px font**
    (below even the 24px AA floor). Add ONE mobile block to `BASE_SHEET` so all 9 panes inherit it. **M**
18. **Dark mode is genuinely well-crafted** (separate ramps, real elevation, accent glow, all AA) — but
    the two *mobile-only* surfaces (`.sidebar .mockbar`, `.sidebar .mockcta`) were left out of the
    dark-elevation rule at `styles.css:269`, so they carry **black shadows on a near-black page** and
    read flat. Add them to that rule; the 1px `rgba(255,255,255,.08)` edge-ring is what does the work. **S**
19. **Print Q&A is visually dead** (ISSUE-13) — 45 `var(--…)` refs written into a blank popup that never
    loads the token sheet. **S**

---

## 6. KEEP / DROP REGISTER

### Branches — **DROP all 20 non-master**
Verified at the **content** level, not by ancestry. 10 are plain ancestors of master. The other 9 read
"unmerged" to `git branch --no-merged` only because serial integration regenerated the 5.1 MB
deliverable and changed the patch-id — **zero unique JS logic; master is strictly ahead of every one**
(it later added IIFE-scoping + design tokens). An independent verifier re-derived absorption across
every touched file (not a hardcoded 1-file-per-branch map) and triaged all 81 non-matching lines as
false positives (topic renumbering / token-ization / comment prose / master-is-a-superset refactors).

| Branch | Ahead | Verdict | Why |
|---|---|---|---|
| `build/e2e-refine`, `build/e2e-verify`, `build/keystone-foundation`, `build/must-hit-points`, `build/pane-rf`, `ci/gh-pages-deploy`, `salvage/card-3d`, `salvage/spa-core`, `salvage/visual-enhancements`, `salvage/zoom-swipe` | 0 | **DROP** (`-d`) | Plain ancestors of master. Fully absorbed. |
| `build/pane-{drill,model,num,open,sys,trade,walk,wb}`, `build/rescues` | 1 | **DROP** (`-D`) | Patch-id artifact of serial integration. Zero unique logic; master evolved *further* on each (e.g. `num` gained 7 methods, `text-zoom` gained Store persistence). Reversible via reflog. |
| `gh-pages` (local) | 0 | **DROP** (`-D`) | 27 behind `origin/gh-pages`, strict ancestor, zero unique work. Pushing it would roll the live site back to 2026-06-29. |

The 2026-06-29 salvage was genuinely **executed**: every borderline candidate that audit flagged
(zoom-diagrams, touch-swipe, 3D card-spotlight, scroll-to-top, page-visibility, pomodoro) is **live on
master** and behaviourally verified at runtime.

### Tags — KEEP 3, DROP 3

| Tag | Verdict | Why |
|---|---|---|
| `archive/feature-animated-bg-interactions` (`c51be72`) | **KEEP** | Sole keeper of all three giant lineages. Pins **77 MB on disk = 48% of the 160 MiB pack** — a deliberate, informed reversibility net for 77 commits. **Re-create as an ANNOTATED tag** (all 4 archive tags are lightweight — `git cat-file -t` returns `commit`, no reason recorded). |
| `archive/feature-parallelize-all-tests` (`989b8f5`) | **DROP** | Proven **ancestor** of animated-bg, not a sibling: **0 unique commits, 0 unique objects.** A redundant label. |
| `archive/visual-enhancements` (`120829e`) | **DROP** | Ancestor of *both* other giants. **0 unique commits, 0 unique objects.** |
| `archive/ci-gh-pages-deploy` (`06d3fcb`) | **DROP** | Its only content (a 62-line `deploy-pages.yml`) is present in master **and superseded** (master's is 75 lines). |
| `v1.0.0`, `v1.1.0` | **KEEP** | Legitimate release markers. |

> Note the earlier audit's headline is corrected: the three "giant" tags are a **strict linear chain**
> (visual-enh ⊂ parallelize ⊂ animated-bg), not parallel lineages. And the reclaim is **77 MB on disk**,
> not the 109 MB an uncompressed byte-count suggests (git delta-compresses the near-identical HTML ~33×).

### Dead code / orphaned features

| Item | Verdict | Why |
|---|---|---|
| **All 57 modules in `src/scripts/app/`** | **KEEP** | **Zero orphans.** Every module is in the build AND has a reachable UI entry point. Zero duplication (no pair exceeds 20% normalized-line overlap). **There is no dead code at the module layer — the rot is in DATA.** |
| `_mob_diag.mjs`, `_mob_diag2.mjs` (tracked, repo root) | **DROP** | Referenced by nothing; screenshot to `/mnt/user-data/outputs/` — a claude.ai sandbox path that does not exist on this machine. Their assertions already live in `visual_pane_smoke.mjs:23,102`. |
| devDep `axe-core` | **DROP** | Zero references anywhere. Every apparent hit is the English word "axes" in topic prose. |
| devDep `js-yaml` | **DROP** | Zero references. Every hit is `'yaml'` as a **shiki language name**. (Declaration hygiene only — it stays as a transitive dep of gray-matter.) |
| `design-tokens/config.json` → `js` platform | **DROP** | Emits a 4,206-byte ES module on every build, imported by **nobody**. (The `css` platform IS load-bearing — keep it.) |
| `identity.total` (46 files, **zod-required**) | **DROP** | Zero consumers (`grep` returns nothing). Its only two values are **8** and **38** — neither is 46. A gate enforcing a field nothing reads, carrying a wrong number, in 46 files. |
| `btn.id === 'inttog'` guard (`shell.js:208`) | **DROP** | Unreachable: `#inttog` lives in `.mockcta`, a **sibling** of the `.mockbar` the listener is bound to. Byte-offset verified in the shipped dist. |
| `Makefile clean:` + `build_integrity.py:24/63` mkstemp/unlink | **DROP** | `build.py`-era vestiges. The temp file is never written to; the docstring still claims "Rebuilds src/ to a temp file". |
| `/home/claude/...` paths (`tools/compiler/mermaid.mjs:21`, `tools/visual_audit.mjs:18`) | **DROP** | Hardcoded Linux-sandbox paths — one of them **inside the build path**. |
| **Tailwind** (`@tailwindcss/vite` + `src/tw.css`) | **FIX or DROP** | **~13.7 MB of toolchain (incl. a 9.1 MB native lightningcss binary) emits 900 bytes containing exactly ONE class** (`.badge`) + 4 custom props. `source(none)` generates **zero** utilities. Inline `.badge` into `styles.css` and drop it — or genuinely adopt utilities. |
| **stylelint + oxlint** (+ 2 configs, 2 npm scripts) | **FIX or DROP** | Permanently **RED** (43 errors, exit 2) and wired into **neither the gate nor CI**. And it **cannot be made green by rule-tuning**: 6 of the 43 are `parseError`s on the `<!--@build:include-->` markers (the repo's own core build convention), which is the same thing that generates oxlint's 13 false `no-empty-file` warnings. Decide: lint the *built* output and wire it in, or delete both. Installed-configured-red-unrun is the worst of all worlds. |
| `identity.reportTitle` (46 files, zod-required) | **FIX** | Orphaned — never read. `session-progress.js:76` hard-codes `'Content Pipeline — Session Report'` instead. The data already exists and is already validated. **One line.** |
| `railPos` map (`shell.js:36`) | **FIX** | 4 entries for a 10-view app → `'undefined%'` is silently rejected as invalid CSS and the progress rail **freezes** at whatever the last mapped view set. Derive it from the route table. |
| Density cycle (`shell.js:71` + the `d` key) | **FIX or DROP** | Half-wired: works, but has **zero UI control and no persistence**. Its sibling `text-zoom.js` has both. Finish it (~15 lines) or delete it. |
| Cross-topic drill / Weak-spot review / Group cram | **KEEP** (surface it) | Fully wired and genuinely the app's best cross-topic feature — but its **only** entry points are three buttons buried inside the Topic-index overlay. |
| `visual-trainer/` + `kit.js` (492 KB, 9.5%, 1/46 topics) | **KEEP + FIX + DECIDE** | See §3. The hard parts are done and verified. Two S-effort bugs from working. Then COMMIT or PARK (§8/Option D). **Do not cut it** — it's the only differentiating feature and the bytes cost ~0 ms. |
| The 5.1 MB single-file bundle | **KEEP** | Proven by counterfactual (§4). Removing 25% of the bytes made boot *slower*. |
| The committed `deepdive_content_pipeline_rehearsal.html` | **KEEP** | It **is** the product (`dist/` is gitignored precisely so this is the tracked copy). But: 223 commits × 5 MB have driven `.git` to **173 MB** against a **9.6 MB** working tree. Needs an explicit strategy (squash / release artifact / LFS) and a **topic-neutral rename** — it, `package.json` (`deepdive-content-pipeline-rehearsal`), `README.md`, and the `CPR1` session code all still say "Content Pipeline" in a 46-topic app. |
| `README.md` | **FIX** | Documents an application that no longer exists: `build.py` (deleted in `97b746e`), "no localStorage, fully portable" (`store.js` has 11 localStorage refs), a `make test-render` target that doesn't exist, a "34-line shell" (it's 182), and a source tree pointing at 5 files that are all absent. |
| `REPORT.md`, `DESIGN_SYSTEM_AUDIT.md`, `ROOT_CAUSE_ANALYSIS.md` | **ARCHIVE** | `DESIGN_SYSTEM_AUDIT.md` is framed entirely around **Open Props** (33 mentions) — no longer a dependency. `REPORT.md`'s central guarantee ("`python3 build.py` reassembles src/ byte-identical") is dead on both counts. Move to `docs/` with a superseded header. |

### Thin topics — **DROP NONE**
No topic warrants cutting. All 46 are real, on-syllabus, coherent, **placeholder-free**, technically
correct and structurally conformant. The 38 are **under-built, not badly built** — and a large fraction
of the "missing" content is already written and being thrown away at build (ISSUE-5). Cutting would
destroy genuine value. **Finish, don't cut.**

**Keep the 8 legacy JS topics as-is.** They are the depth reference and the only fully-realized
topics — they define what "done" means. Do **not** migrate them to markdown until the compiler can
round-trip that depth without loss.

---

## 7. FINDINGS REGISTER — filable issues, P0 → P3

---
### 🔴 ISSUE-1 — The entire app renders a BLANK PAGE under `prefers-reduced-motion: reduce`
**Severity:** P0 · **Category:** correctness / a11y · **Effort:** S (1 line)

Two individually-reasonable CSS rules are lethal together:
- `src/styles.css:90` — `body{…opacity:0; animation:bodyIn var(--duration-slowest) … forwards}` +
  `:91` `@keyframes bodyIn{from{opacity:0}to{opacity:1}}` → **body is invisible by default** and
  depends on an animation to be revealed.
- `src/styles.css:137` — `@media (prefers-reduced-motion: reduce){*{animation:none!important;…}}` →
  the `animation` **shorthand** sets `animation-name:none` on `*`, so the `forwards` fill never
  applies and body stays at `opacity:0` **forever**.

**Evidence:** measured on the shipped `dist/index.html` at first load, no clicks. With
`reducedMotion:'reduce'` → `getComputedStyle(body).opacity === '0'`, `animationName === 'none'`,
`getAnimations().length === 0`, page uniformly blank — while `body.innerText.length === 27,186` and
`elementFromPoint(centre)` returns a real element. The DOM is fully built and hit-testable; **nothing
is painted.** **Zero console errors.** Control (`no-preference`): opacity `1`, animation `bodyIn`,
app renders. Setting `body.style.opacity='1'` on the blank page instantly restores the entire working
app. Shots: `shots/verify-rt-desktop/PROOF-reduce-blank.png`, `PROOF-reduce-fixed-with-body-opacity-1.png`,
`shots/verify-rtperf/boot-reduce.png`.
**Found independently by 4 lenses** (inv-visual-trainer, rt-desktop, rt-console, rt-perf).

**Repro:** Chrome DevTools → Rendering → *Emulate CSS `prefers-reduced-motion: reduce`* → reload
`dist/index.html`. Blank cream page. Or OS-level: Windows *Accessibility → Visual effects → Animation
effects OFF*; macOS *Reduce Motion*.

**Fix:** add `@media (prefers-reduced-motion: reduce){ body{opacity:1} }`, **or** (better) drop
`opacity:0` from the base body rule. Note `styles.css:22` and `:832` already use the *correct*
`animation-duration:.01ms!important` form, which is harmless (a 0.01 ms `forwards` animation still
lands at opacity 1). **Only `styles.css:137`'s blunt `animation:none` is destructive.** Two competing
reduced-motion implementations exist; the blunt one wins.

**Why it shipped — and why this matters more than the bug:** the accessibility lens **certified
`prefers-reduced-motion` as PASSING** (`accessibility.md:24` — "TRUE … all 9 probed elements collapse
to `animation-duration: 1e-05s`"). That observation is correct and **completely irrelevant**: it
verified the *mechanism* and never checked the *outcome*. It never read `body`'s opacity and never
looked at a screenshot. **A DOM/computed-style assertion structurally cannot catch "the page is
blank." Add a pixel assertion to the gate.**

---
### 🔴 ISSUE-2 — Mobile: the Tools button (the ONLY entry to 12 tools) is off-screen, and on the longest topic it is unreachable at ANY point on the display
**Severity:** P0 · **Category:** mobile layout · **Effort:** S (1 line)

`nav#topicnav` is a flex item of `.side-id` with the default `min-width:auto`, so it can never shrink
below its min-content floor (`3 × 44px .tn-step` + the `.tn-trigger`'s nowrap `.tn-current` + gaps).
The layout viewport expands to the overflowed width, dragging every `position:fixed; left:0; right:0`
bar with it.

**Evidence:**
- Document overflow at every phone width: **320px → 46/46 topics** (+133px), **360px → 46/46**
  (+93px), 390px → 35/46, 414px → 26/46, **430px → 19/46**. Desktop: clean (+0px).
- Worst topic (`debugging`, "Production Debugging and Incident Diagnosis"): document `scrollWidth`
  **579px** at a 360px viewport (+219px).
- **`#toolsfab` is FULLY outside the visible viewport on 16/46 topics at 360px** and partially clipped
  on 8 more. `#tnnext` (next-topic) is fully outside on 28/46 and **0/46 are fully usable**.
- **At 430px (iPhone 16 Pro Max) on `debugging`:** `#toolsfab` sits at x=497…564 against a
  `clientWidth` of 430, `canPanRight:false`, and an `elementFromPoint` sweep across the whole visible
  width returns **`TOOLS_BUTTON_REACHABLE_ANYWHERE_ON_SCREEN: false`.**
- Behind that button: **topic index, search, copy link, bookmark, notes, print, cram sheet, session
  progress, mixed fire, game plan, scope, theme.** All of it is dead on those topics.
- The `.seg` tab strip overhangs identically (396px / 579px wide against a 360/430px viewport).

Shots: `shots/verify-vd-mobile/EVIDENCE-430-longtopic-BROKEN.png`,
`shots/verify-rt-mobile/v-real-360-debugging-walk.png`.

**Repro:** 430×844, `isMobile:true` → dismiss the home → switch to "Production Debugging and Incident
Diagnosis" → `document.querySelector('#toolsfab').getBoundingClientRect().left` → **497** vs
`document.documentElement.clientWidth` → **430**.

**Fix — ONE LINE:** add `min-width:0` to `.side-id .topic-nav` in the `@media(max-width:900px)` block
at **`src/styles.css:825`**. **Verified independently by two agents:** doc `scrollWidth` 579→360
(over = 0); `#tnnext` moves from x=535…579 (off-screen) to x=301…345; `#toolsfab` moves from
x=497…564 to x=278…345; both then **click successfully**; the fixed bottom bar and tab strip return
inside the viewport; and the already-authored `text-overflow:ellipsis` on `.tn-current` finally fires.

> ⚠️ **Do NOT apply it to `.tn-current`** — that is a **proven no-op** (`.tn-trigger` at
> `styles.css:620` already carries `min-width:0`). The culprit is `.topic-nav` itself
> (`styles.css:619`, no `min-width`).
>
> **Contradiction resolved:** one verifier downgraded this to P2 arguing "the page pans, nothing is
> broken" — but it tested only the *default* topic (16 chars), where overflow is 36px. The
> longest-topic measurement (43 chars, `canPanRight:false`, hit-test false) is the worst case and it
> wins. Even on its own numbers, `#toolsfab` starts fully off-screen on 16/46 topics. **P0.**

---
### 🔴 ISSUE-3 — The Cram sheet and "Scope it first" serve Content Pipeline's content on all 46 topics
**Severity:** P0 · **Category:** wrong content · **Effort:** L (needs a data slice + authoring)

`deep-cram` (`cram-overlay.js:12`) and `deep-scope` (`scope-overlay.js:9`) extend **`HTMLElement`, not
`TopicPane`** — no `dataKey`, no `renderTopic()`, no `deeptopicchange` listener, guarded by
`if (this._built) return`. Their bodies are **static template literals**. Meanwhile `applyIdentity()`
(`topic-protocol.js:56`) **does** rewrite the cram *header* per topic.

**Evidence:** cram body **byte-identical at 3,836 chars across 12 topics** — including all 7 other
**hand-authored** topics — while each header is correctly per-topic. On "Caching Strategies" the cram
sheet's spine step 1 reads *"Entry: `processUpload(key, bucket)`, fired by S3 ObjectCreated."* Scope
body identical at 2,517 chars on every topic; its first question is *"File types & formats?"* and it
asks *"KB configs or GB media?"* on all 46. **No `cram` or `scope` slice exists** in
`TOPIC_CONTRACT.md`, the zod schema, or the compiler — grep returns nothing. Shots:
`shots/verify-inv-features/A2-cram-caching-SHOWS-CP-BODY.png`,
`shots/verify-rt-interactions/FIXED-cram-caching.png`.

**Repro:** switch to any topic other than Content Pipeline → Tools → "One-page cram sheet". Header says
your topic; body is the S3/Lambda pipeline.

**Fix:** add `cram` + `scope` slices to the topic contract and the markdown compiler; convert both to
`TopicPane`. `print-qa.js` is the working in-repo template (it reads `TopicRegistry.current()` and
produces correct per-topic output). **Until the slice lands, drop the per-topic header rewrite at
`topic-protocol.js:56`** — the correct header is what makes the wrong content look authoritative.

> **Note:** "Game plan" (`gameplan-overlay.js`) is *also* a static HTMLElement but is **correctly
> topic-agnostic** (a study-method plan about the tool itself). Do **not** "fix" it alongside these two.
>
> **Correction to the raw lens:** the *scope* overlay's title is generic ("Scope it first · the
> questions before the design"), so "wrong content under a correct-looking title" applies to the
> **cram sheet** specifically. The wrong content applies to both.

---
### 🔴 ISSUE-4 — The app's own recommended button silently destroys the user's saved progress
**Severity:** P0 · **Category:** data loss · **Effort:** M

`Progress.snapshot()` (`progress.js:45`) is an **unconditional `Store.set()` replace** on every
`drillgraded` event, and `getStats()` (`drill/logic.js:479`) reads `dTot` from the **live, filtered**
`cards` global with `revisit` derived from `this.results` — which every filter path resets to `[]`.

**Evidence (real mouse click on a visible 546×41 button):**
```
baseline (complete 22/22 run): {got:19, shk:3, done:22, tot:22, revisit:[3 signals]}  status=weak
click "Drill my 3 Revisit probes →" (#dweak)  → working set = 3 of 22
grade ONE probe                              → {got:1, shk:0, done:1, tot:3, revisit:[]}
```
`tot` 22→3 **corrupted**, `done` 22→1 **regressed**, revisit pile **wiped**. Home rollup goes
`{22 done / 22 total}` → `{1 / 3}`; weakest-topic list `["content-pipeline(3)"]` → `["content-pipeline(0)"]`.
**Three independently user-reachable paths, all verified with real clicks:** `#dweak` on the debrief,
`#revdrill` mid-run, and the **always-visible SDE2 tier toggle**. Shots:
`shots/verify-rt-interactions/reach2-02-dweak-corrupted.png`, `reach2-04-tier-corrupted.png`.

**Fix:** make `snapshot()` **merge**, not replace — take `tot` from `_allCards.length` (never the
filtered subset), **union** the revisit set, and advance `done`/`got` as a **high-water mark**. Or
write filtered/partial runs to a separate `session.*` namespace and reserve `progress.*` for canonical
runs. *(In a trainer whose entire value proposition is the progress model, this is the most damaging
non-visual bug in the app.)*

---
### 🔴 ISSUE-5 — BUILD-TIME DATA LOSS: 189 authored System-Map stages, 114 tier notes and 76 pivot answers are silently discarded on every build
**Severity:** P0 · **Category:** content loss · **Effort:** S (a parser branch)

**This is the root cause of six separately-reported defects.** All 38 markdown files **do** author
their System-Map stage chains (`### Where it sits` + the compiler's `[*]` you-are-here marker — **38/38
files carry it**), their drill tier-notes, and their pivot answers. **The compiler throws them away.**

`parseSys` (`parse_md.mjs:203`) and `parseDrill` (`:342`) only fill from a markdown
**`bullet_list_open`** token. The authors wrote the **plain-line form that the compiler's OWN
documentation shows as the example** (`TOPIC_MARKDOWN_FORMAT.md:238-248` and `:187-190`). markdown-it
folds those into a *paragraph*; the branch never fires; the parser emits `[]` / `{}` **with no error**.
Separately, `parse_md.mjs:225` globs the `-> chip` line **and** the answer paragraph into one blob
(they are authored on adjacent lines), so `chip` gets 223–437 chars and `a` stays `''`.

**Evidence (in the SHIPPED compiler output, not just at runtime):**
- `grep -l '"stages": \[\]' src/topics/_generated/*/sys.js | wc -l` → **38 of 38**.
- `grep -lE '^\S.*\[\*\]\s*$' src/topics-md/*.md` → **38 files** (plain lines, dropped);
  `grep -lE '^-\s.*\[\*\]\s*$'` → **0 files** (bullet lines, would parse).
- 76 markdown pivots, **0 with a non-empty answer** (legacy: 56/56 have one).
- Runtime: `#caching/sys` renders `.stg = 0`, `#smChain` height **0px**, innerHTML **0 chars**.
  `#content-pipeline/sys` renders 6 numbered stages, 364px tall, with a YOU-ARE-HERE badge.
- **PROVEN FIX:** a *shape-only* reshape of the 38 files (adding `- ` prefixes and one blank line —
  **zero new words, zero compiler changes**), run through the **real compiler**, recovers
  **0 → 189 `sys.stages`** (with `cur:true` landing on exactly one stage), **0 → 114 `tierNotes`**,
  and **0 → 76/76 pivot answers**. Every other slice byte-identical.
  Reference diff: `_audit/2026-07-11-state-audit/caching.FIXED.md`.

**Six defects this one bug causes:**
1. **The System Map has no map** on 38/46 topics (`.stg = 0`, a heading over dead space).
2. **The literal string `undefined` on screen** (`tierNotes:{}` → `drill/logic.js:180`) — ISSUE-6.
3. **Pivot chips balloon to 1,500–2,100px nowrap spans and are clipped mid-word** inside a ~704px card
   (`.piv{overflow:hidden}`), while the disclosure body (`.pa`) renders **empty** — 76/76 chips overflow.
4. **Spurious "Jump to" buttons that MIS-NAVIGATE.** `resolveChipTarget` (`system-map.js:80-85`) falls
   back to matching any topic *title* as a substring of the chip. Now that the chip carries a whole
   answer paragraph, incidental prose matches real topics: **6 of 38 topics** render a jump button whose
   **label is the entire 322–375-char answer paragraph** and whose target is an unrelated topic. On
   `saga/sys` the pivot "Choreography or orchestration?" renders a four-line button that calls
   `setTopic('observability')` and **yanks the candidate out of Saga mid-rehearsal** — purely because
   the word "observability" appeared in the prose. Shot:
   `shots/verify-inv-topics/CLEAN-sys-markdown-saga-spurious-jump.png`.
5. **Cross-topic jump navigation is DEAD on 38/46 topics** — the jump button is rendered *inside* `.pa`,
   which is empty. Originals: 43 jump chips across 8 topics. Markdown: **0** across 38.
6. Chips are the **only** sys field never escaped (`parse_md.mjs:225` bypasses `prose()`), and they now
   carry raw prose containing `>` characters — latent markup break.

**Fix:** teach `parseSys`/`parseDrill` to accept the plain-line form **its own docs show** (or
mechanically reshape the 38 files). **Then add population assertions to the gate** (ISSUE-7), or this
regresses the moment anyone touches it. Also harden `resolveChipTarget` to require the explicit `(N)`
index form.

> **Contradiction resolved:** three lenses blamed the *renderer* (`system-map.js`) or
> `.stage{overflow-x:hidden}`. Both are **wrong** and a fixer following them would find nothing.
> `system-map.js:93` correctly renders `p.chip` into `.chip` and `:98` correctly renders `p.a` into
> `.pa`. The clipper on sys is **`.piv{overflow:hidden}`** (`system-map.js:38`), and `.stage` clips
> **0px** there. The bug is 100% in `tools/compiler/parse_md.mjs`.

---
### 🔴 ISSUE-6 — The literal string `undefined` renders on screen, at THREE sites, on 38 of 46 topics
**Severity:** P0 · **Category:** correctness · **Effort:** S (3 guards) + M (author the data)

| Site | Code | What the user sees |
|---|---|---|
| Probe Drill | `drill/logic.js:180` — `this._tiernote.innerHTML = d.tierNotes.all` with `tierNotes:{}` | a 414×19px box reading **`undefined`** in grey italic under the tier toggle |
| Mixed Fire | `mixed-fire.js:18` — `cb.cue + '<div class="mx-task">' + cb.task` (38/38 md curveballs have **no `task`**) | **`undefined`** in italics under the curveball prompt |
| Mock Run end | `mixed-fire.js:205` — `mockBeats[mockCurveIdx].theme` | **"Curveball this run: `undefined`."** |

All three verified on screen with hit-tests (`elementFromPoint`, `occluded:false`) and pixel crops:
`shots/vfy-content/CROP-tiernote-idempotency.png`, `CROP-mixfire-idempotency.png`. 38/38 markdown
topics affected; 0/8 legacy. **Note `document.body.innerText` does NOT contain "undefined"** — the text
is inside shadow roots, so a body-text smoke check will miss all three.

**Fix:** guard all three writes (`(d.tierNotes && d.tierNotes.all) || ''`, `cb.task || ''`, the mock end
theme). **The `tierNotes` half is fixed for free by ISSUE-5** (the notes are already authored). Add a CI
assertion that **no rendered text node in any pane or overlay, on any of the 46 topics, equals
`undefined` / `null` / `NaN`.**

---
### 🟠 ISSUE-7 — The contract gate tests truthiness, not population — every defect above shipped through a green 19/19
**Severity:** P1 · **Category:** test coverage · **Effort:** S

`test/topic_contract.cjs:52`:
```js
cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(id + ': missing "' + v + '" slice'); });
```
A pure truthiness check. **`{stages: [], pivots: [...]}` is truthy**, so a slice whose primary array is
**empty** passes. `drill.cards` is the **only** slice in the entire file with a count assertion
(`MIN_CARDS: 18`, `MIN_PER_CORE: 3`). Consequently `sys.stages === []` on 38/46, `pivot.a === ''` on
76/76, `open.cards === 1` on 38/46, `cmpNotes` 2/9 on 38/46, `f: []` on **798/798** cards, and
`senior: ''` on **798/798** are all **invisible** — while the gate prints
*"TOPIC CONTRACT: PASS (46 topics: all slices + group + tiers + cards conform)."*

**There is a SECOND blind gate:** `tools/compiler/topic-schema.mjs` `NEED_ARRAY` includes
`['sys','stages']` but only asserts it **is** an array — `[]` passes.

**And a third:** `test/visual_pane_smoke.mjs:50` asserts the **frame counter** advances — which it does
perfectly happily into a **0×0 framebuffer**. I ran the project's own gate against the exact `dist` I
had just measured as a 0×0 canvas: **18/18 PASS, "VISUAL PIPELINE SMOKE: ALL PASS."**

**And a fourth:** **zero** of the 19 gate checks is an accessibility check (`axe-core` is an installed
devDependency wired into nothing) — which is exactly why ISSUE-1 shipped.

**"You get what you measure" is the single sentence that explains this entire audit.** The one pane the
gate counts (`drill`) is the one pane where the 38 markdown topics match the reference.

**Fix — do this BEFORE any backfill, or the backfill silently rots:**
- `sys.stages.length >= 4`; every `sys.pivots[].a` non-empty; `open.cards >= 2`; `walk.steps >= 4`;
  `model.answers >= 2`; `rf.flags >= 3`; `trade.decisions >= 3`; `bank.curveballs >= 1`;
  `identity.cmpNotes` has all 9 view keys; every curveball has a `task`; mockBeats include a FRAME and
  a CURVEBALL.
- `canvas.width > 0 && canvas.height > 0` **and** a two-frame pixel diff (keep **both** — the size check
  is load-bearing).
- `getComputedStyle(document.body).opacity !== '0'` under `reducedMotion:'reduce'`.
- No rendered text node equals `undefined`/`null`/`NaN` on any of 46 topics.
- A 46-topic URL round-trip assertion (ISSUE-14).
- `#toolsfab`'s rect lies within `documentElement.clientWidth` at 360px, all 46 topics.

---
### 🟠 ISSUE-8 — The coaching rail shows another topic's / another view's advice
**Severity:** P1 · **Category:** correctness · **Effort:** S (the guard) + M (author the notes)

`shell.js:237` is `if (TOPIC_CMP_NOTES[tab]) { … }` with **no `else`**. The data object IS swapped
correctly on topic switch — but when the new topic lacks a note for the current pane, **the DOM
`textContent` is never overwritten and keeps the last value written.**

**Coverage:** the 38 markdown topics compile `cmpNotes` for **only `walk` and `drill`** (2 of 9); the 8
legacy topics have all 9. → **266 of 414 (topic, view) pairs = 64.3%** render a stale note.

**Two failure modes, both reproduced 100%:**
- **Wrong VIEW:** at `#storage-engines/num` on a fresh load the rail renders the **walk** note ("How data
  is stored on disk") while the user is on the Numbers pane.
- **Wrong TOPIC:** land on `#authz/sys`, switch to Caching Strategies without leaving the pane → the
  header correctly reads **"YOU'RE REHEARSING: Caching Strategies"** while the rail is **byte-identical
  to authz's**: *"Zoom out: authorization sits between the identity that proves who you are and the data
  layer that enforces what you can touch."* **The user is coached on authorization while rehearsing
  caching.** Visible on **desktop AND mobile** (`#cmpNote` 237×38px, `#mCmpView` 326×21px).

Shots: `shots/verify-inv-features/A5-companion-stale-num-says-drill.png`,
`shots/verify-rt-desktop/f4-leak-companion-crop.png`.

**Fix:** add the `else` at `shell.js:237` — blank or fall back to a generic per-view note. **Actively
wrong information is worse than absent information**, and this ships wrong information to an interview
candidate mid-rehearsal. Then compile all 9 `cmpNotes` per topic and assert 9 keys in the gate.

---
### 🟠 ISSUE-9 — The visual trainer draws nothing (0×0 canvas), and `#<topic>/viz` deep links discard the topic
**Severity:** P1 · **Category:** correctness · **Effort:** S + S · **See §3 for the full treatment**

**(a) 0×0 canvas.** Backing store `[0,0]`, CSS box 592×2 (2px = its own borders), `drawingBuffer [1,1]`.
Root cause: `scene.js:93-99` resizes once, synchronously, while the pane is still `display:none`
(the ViewTransitions async gap). No `ResizeObserver` anywhere in the codebase. One window `resize`
event → 590×332, renders correctly, **passes the project's own calibrated pixel thresholds**
(non-bg 3.98% vs a 3% floor; inter-frame change 0.28% vs 0.2%). Shots:
`shots/inv-visual-trainer-verify/desktop-AS-SHIPPED-full.png` vs `desktop-AFTER-RESIZE-full.png`.

**(b) Deep link loses the topic.** `#kafka-internals/viz` → lands on `#content-pipeline/walk`. Controls
prove it is viz-specific (`#kafka-internals/walk`, `/drill`, `/num` all land correctly). **This is the
only broken deep link in the app**, and it means the one topic whose visual could work **cannot be
linked to it** — it also breaks Copy-link, bookmarks, and F5.

**Root cause of (b) — proven by an instrumented boot trace, not inferred:**
`Router.init()` is deferred to `DOMContentLoaded` (`src/index.html:174-179`), while `deep-visual`'s
`connectedCallback` → `renderTopic(bootTopic.visual = null)` queues the bounce `setTimeout(…, 0)`
(`visual-pane.js:39`) during **synchronous `app.js` evaluation**. The timer beats `DOMContentLoaded`:
```
Router ASSIGNED @522ms (#saga/viz) → Router.navigate('walk') @557ms → EXIT @562ms (hash ALREADY rewritten)
→ DOMContentLoaded @563ms → Router.init() @566ms  (parses the wreckage)
```
Decisive A/B: suppressing that single pre-init `Router.navigate()` and nothing else makes
`#kafka-internals/viz` resolve **perfectly** (topic kafka-internals, pane viz, kit mounted) and
`#saga/viz` → `#saga/walk` **with the topic preserved**.

**Fix:** gate the viz-less bounce so it cannot fire before the router has applied the hash — resolve
against `TopicRegistry.get(Router.current().topic)` rather than `TopicRegistry.current()`, or defer it
until after `Router.init()` emits. (Also gate the `v` key on the current topic having a visual — today
it strands the user on an empty pane with no tab highlighted on all 45 other topics.)

---
### 🟠 ISSUE-10 — Focus mode is an inescapable trap without a physical keyboard
**Severity:** P1 · **Category:** mobile lockout · **Effort:** S

`focus-mode.js:30-38` appends `#_focus-toggle` to `.hdr` — which `src/index.html:25` places **inside
`<aside class="sidebar">`**. `focus-mode.js:21` then injects
`.app._focus-mode .sidebar{opacity:0; visibility:hidden; width:0}` — and **`visibility:hidden` inherits
to every descendant, including the exit button.**

**Evidence (both viewports):** after a real click, `#_focus-toggle`'s computed `visibility` is
`hidden`; `elementFromPoint` at its centre returns `stage`, not the button; a real
`page.click('#_focus-toggle')` **throws TimeoutError**; **tappable elements on the ENTIRE page = 0
(desktop) / 1 (mobile — a useless accordion)**; `.seg` / `.mockcta` / `#toolsfab` / `#topicnav` all
`visibility:hidden`; **ESC does not exit.** The only escapes are the `f` key or a page reload. Shot:
`shots/verify-rt-tools/mobile-focus-AFTER.png` — the content pane with literally zero chrome.

**On a phone, tapping "Focus" removes the entire UI with no way back.**

**Fix:** re-parent `#_focus-toggle` out of `.sidebar` (e.g. to `.app`), or add
`.app._focus-mode #_focus-toggle{visibility:visible; opacity:1; position:fixed; top:12px; right:12px}`.
Wire ESC to exit focus mode.

---
### 🟠 ISSUE-11 — Mock Run and Mixed Fire are structurally broken on 38/46 topics
**Severity:** P1 · **Category:** correctness · **Effort:** S (code) + M (content)

Four interlocking defects in the flagship tools:

1. **The mock is scored out of 6 but only has 2 beats** → **every mock run on all 38 markdown topics
   lands in the bottom verdict bucket regardless of performance.** `mixed-fire.js:222-224` hard-codes
   `if (score >= 6) 'Six for six.' else if (score >= 4) … else 'The arc isn't solid yet'`, while the md
   topics author only `### SCALE` and `### DESIGN` (the legacy 8 have FRAME/STRUCTURE/SCALE/FAILURE/
   CURVEBALL/CLOSE). The UI literally renders **"Beat 1 / 2"**.
2. **`openMock()` clobbers the authored beat 1.** `mockCurveIdx`/`mockFrameIdx` stay at their init value
   `0` when no CURVEBALL/FRAME beat exists (`topic-protocol.js:34-38`), so `mock-run/logic.js:39-40`
   overwrites `mockBeats[0]` with a curveball → the pane renders **"Beat 1 / 2 · CURVEBALL"** with a
   *frame bullet* as its cue and the literal **`undefined`** where the task belongs.
3. **It permanently CORRUPTS the canonical topic bank** — violating an explicit invariant comment
   (`topic-protocol.js:25-27`: *"the canonical topic data is never clobbered"*). `curveballPool =
   b.curveballs.slice()` is a **shallow** copy, so `mockBeats[0].cue = framePool[rand]` mutates the
   shared canonical object. Measured on `caching`: the authored curveball *"stampede | A celebrity's
   profile is cached; the key just expired under peak traffic. What happens?"* becomes *"Invalidate on
   write, and a TTL backstops what you miss"* — **a declarative statement replacing a question** — and
   the corruption **survives a topic switch away and back** and **leaks into Mixed Fire**.
4. **A compiler off-by-one puts the literal word "CURVEBALL" on screen.** `parse_md.mjs:407` reads
   `theme: p[0]` (the tag token) where the sibling branch one line down correctly reads `p[1]`. So the
   Mixed-Fire label renders **"CURVEBALL"** instead of the authored theme *"stampede"*, and the raw
   ` | ` delimiter leaks into the cue. 38/38 md topics; 0/8 legacy.

**Fix:** (a) make the verdict denominator `mockBeats.length`; (b) deep-copy the curveball on assignment
(or `b.curveballs.map(c => ({...c}))` in `publishBanks`) and guard the indices; (c) one-line compiler fix
at `:407`; (d) author the missing 4 beats + curveball `task` lines into the 38 md Bank sections; (e) gate
it (ISSUE-7).

---
### 🟠 ISSUE-12 — Content is silently clipped by `.stage{overflow-x:hidden}` — including actual numbers
**Severity:** P1 · **Category:** content loss · **Effort:** S

Real content is cut off with **no scrollbar, no affordance, no error**.

- **Mobile (360px):** **40 of 414** topic×pane states clip. **Numbers on 31/46 topics** (worst +112px);
  **Walkthrough on 9/46** (worst **+208px**, `stream-batch-processing`).
- **Desktop:** **22/46** topics clip at 1280px. And **every single clipping pair, at every width, is a
  `/num` view.** At 1920px: **zero**.
- **The clipped thing is the number.** `storage-engines/num` at 1280px: the row "Workload mix" has the
  value `"write-heavy 50,000 w/s : 10,000 r/s"` whose `.nrow-v` box ends at x=916 but whose **nowrap
  text paints to x=1058** — 68px past the x=990 clip edge, **invisible**. Another row's `"…+ WAL"` is
  clipped 4px and reads as **"WAI"**. Shot:
  `shots/verify-rt-desktop/f3-num-1280-storage-engines-VERIFY.png`.
- Cause: `num/logic.js:32` `.nrow{grid-template-columns:1fr auto}` (the `1fr` track carries an implicit
  `min-width:auto`) + `:36` `.nrow-v{white-space:nowrap}`. Same shape in `walkthrough/logic.js:31`
  (`.fb{white-space:nowrap}`).

**Fix:** `grid-template-columns: 1fr minmax(0,auto)` and drop `white-space:nowrap` from `.nrow-v`;
`.fb{white-space:normal}` or an `overflow-x:auto` scroller. **An estimation pane that hides part of a
number is a functional failure, not a cosmetic one.**

---
### 🟠 ISSUE-13 — Print Q&A produces a document with every CSS token undefined
**Severity:** P1 · **Category:** styling · **Effort:** S

`print-qa.js:49` opens `window.open('','_blank')` — a **blank** document — and writes a page whose
inline `<style>` (`:8-27`) is authored **entirely in design tokens** (`var(--space-40)`,
`var(--font-size-display)`, `var(--space-760)`, `var(--font-weight-heavy)` …). That popup **never loads
`tokens.generated.css`**, so all **45** token-bearing declarations are invalid at computed-value time
and are dropped.

**Measured inside the real popup:** `--space-40` / `--space-760` / `--font-size-display` /
`--font-weight-heavy` all resolve to `(UNDEFINED)`; body `padding: 0px` (intended `40px 32px 60px`);
`max-width: none` → full 1280px bleed (intended 760px centred); **h1 `font-size: 14px`, `weight: 400`
— byte-identical to body text**; all 22 probes run together with zero separation. The **content** is
perfectly correct. Shot: `shots/verify-rt-tools/desktop-printqa-popup.png`.

Looks like collateral damage from an automated "hardcoded values → design tokens" sweep that did not
exclude this file.

**Fix:** inline literal px/weight values — it builds a standalone foreign document, so tokens buy
nothing there.

---
### 🟠 ISSUE-14 — CI is broken and the live site is 183 commits stale (**already fixed in the working tree — land it**)
**Severity:** P1 · **Category:** CI/deploy · **Effort:** S

`gh run list --workflow=deploy-pages.yml` → **7 consecutive failures** (2026-07-08 08:41 → 14:10); last
success **2026-07-04T07:09**, which matches `origin/gh-pages` HEAD exactly.
`git rev-list --count 1977244..master` → **183**.

**The real cause is NOT the dead `python build.py` step** (a plausible but wrong diagnosis): **`three` is
absent from the committed `package.json` AND `package-lock.json`.** CI runs `npm ci` (installs exactly
the lockfile) → no `three` → `tools/build-visual-kit.mjs` (added by `672a08c`, which esbuild-bundles
`visual-trainer/src/kit.js`, which imports `three`) **cannot resolve it and throws**. Timing is exact:
`672a08c` landed at 09:43 and the **09:43 run is the first gate failure**; 08:41 and 09:02 were green.
Locally `node_modules/three` exists (installed ad hoc), so the dev machine builds fine — textbook
lockfile drift. **A clean clone currently cannot build the app at all.**

> `Node.js v20.20.2` in the CI log is a **RED HERRING** (it's Node's fatal-exception footer, the last
> stderr line the gate surfaces). Installed `vite@8.1.3` declares `engines: ^20.19.0 || >=22.12.0`,
> which 20.20.2 satisfies. **Do not "fix" this by bumping Node.**

**Status:** a concurrent agent's **uncommitted working-tree diff already does both halves** — adds
`"three": "^0.170.0"` to `package.json` + `node_modules/three` to `package-lock.json`, and removes the
dead `python build.py` step. `git status` confirms 6 modified tracked files.
**Action: land that diff, then RELOAD-VERIFY that `origin/gh-pages` actually advances** (a green run is
not proof the site moved).

---
### 🟡 ISSUE-15 — `#event-driven`'s URL never round-trips: refresh, bookmark or share teleports you to Content Pipeline
**Severity:** P2 · **Category:** routing · **Effort:** S

Two disagreeing definitions of "the default topic":
- `TopicRegistry.register()` (`topic-protocol.js:104`) seeds `cur` to the **first-REGISTERED** topic =
  `content-pipeline` (the first `@build:include`).
- `Router.topicPrefix()` (`router.js:54-59`) and `Router.setTopic()` (`:88-97`) treat
  **`TopicRegistry.ids()[0]`** as the topic that gets a **bare** hash — and `ids()` is **sorted by
  TOPIC_ORDER**, whose first entry is **`event-driven`**.

`router.js:52-53`'s own comment states the intent — *"empty for the default (first-registered) topic"* —
but the code uses the sort-order first. **Comment and code disagree; `event-driven` falls in the gap.**

**Evidence:** full 46-topic round-trip matrix → **45/46 pass, `event-driven` is the sole failure.**
Driven through the **real dropdown UI**: topic becomes `event-driven` (h1 "Event-Driven Backbone") but
`href` stays `…/index.html#walk` (bare, no prefix). Clicking the **real Copy-link button** (with a stubbed
clipboard) captures exactly that string; re-opening it cold → **topic `content-pipeline`**. A plain **F5
reload** does it too.

**Impact is higher-frequency than it looks:** `event-driven` is `TOPIC_ORDER[0]` — the first topic in the
index overlay and the dropdown, a prime entry point.

**Fix:** always emit the explicit `#<topic>/<view>` prefix and drop the bare-hash special case entirely.
Deep links then never depend on registration order. (This also removes half of ISSUE-9's routing fragility.)

---
### 🟡 ISSUE-16 — WebGL context leak: +1 leaked context per Visualize open; Chrome starts dropping them at the 17th
**Severity:** P2 · **Category:** memory leak · **Effort:** S

`scene.js:98` registers `window.addEventListener('resize', resize)` and **nothing ever removes it** —
there is no `removeEventListener` anywhere in `visual-trainer/src/`. `dispose()` (`kit.js:147-152`)
stops the loop, calls `renderer.dispose()` and clears `host.innerHTML` — but `renderer.dispose()` does
**not** release the WebGL context, and **`renderer.forceContextLoss()` has zero call sites**.

**Measured over 20 open/close cycles (forced GC before each sample), strictly monotonic, no plateau:**
heap 6.22 → **17.67 MB**; JS event listeners 149 → **289** (exactly **+7 every cycle**); DOM nodes
3,129 → 4,375 (+62/cycle); **WebGL contexts 0 → 20 (+1/cycle)**. At **cycle 17** Chrome emitted, verbatim:
*"WARNING: Too many active WebGL contexts. Oldest context will be lost."* Proven by CDP
`DOMDebugger.getEventListeners(window)`: window `resize` listeners grow **+1 per cycle**, never removed —
that closure captures `renderer` and `canvas` and is the GC root.

**Currently masked** (the pane renders nothing anyway) — **fixing ISSUE-9(a) exposes this to users. Land
both together.**

**Fix:** have `createScene()` return a disposer that calls `removeEventListener('resize', resize)` and
`renderer.forceContextLoss()`; invoke it from `kit.js:150`. Replacing the window listener with a
`ResizeObserver` disconnected on dispose fixes both bugs in one change.

---
### 🟡 ISSUE-17 — The keyboard-shortcuts overlay documents the drill grade keys INVERTED, and omits 6 live shortcuts
**Severity:** P2 · **Category:** stale docs · **Effort:** S

`keyboard-overlay.js:53` says: *"`1` `2` — In the drill, score the probe — **Solid or Revisit**."*
The drill is **three levels**: `1` = ✗ Missed, `2` = ~ Shaky, `3` = ✓ Solid (`shell.js:111-113`,
`drill/logic.js:280-282`).

**Verified at runtime:** a user who reads the overlay and presses `1` intending *Solid* gets
`level=1, ok=false`; the Solid counter **stays 0**, the Revisit counter increments, and the signal joins
the revisit pile. **Both documented keys record a NON-Solid grade, and `3` — the only key that records
Solid — is undocumented** in both the overlay and the guided tour (`tour-guide.js:28`).

Also live but undocumented (all verified firing): `V`, `3`, `F`, `Cmd+K`, `Cmd+P`, `P`.

**In a self-graded trainer, an inverted grade key silently poisons the progress model that drives every
recommendation.** *(Mitigating: the judge row on screen does show the correct `[1]`/`[2]`/`[3]` hints, so
only a user who learned the keys from the `?` overlay is misled.)*

---
### 🟡 ISSUE-18 — Mock-run and mixed-fire records are global, not per-topic — they bleed across topics
**Severity:** P2 · **Category:** correctness · **Effort:** M

`mock.last` (`mock-run/data.js:7-8`) and `mix.log` (`mixed-fire.js:31`) are stored with **no topic key**,
and `TopicRegistry.setTopic()` never resets the module globals. The live storage key set proves it:
`['ddr.v1.mock.last', 'ddr.v1.nav.last', 'ddr.v1.viewseen.content-pipeline', 'ddr.v1.viewseen.multi-tenant']`
— `mock.last` carries **no topic suffix** while `viewseen.<topic>` does.

**Reproduced end to end:** score a mock on Content Pipeline → switch to Multi-Tenant → Session progress
shows *"Probe Drill — Not started, 0 of 21 graded"* (correct) **directly beside** *"Mock Run — Last run:
6 / 6 in 6:01"* (Content Pipeline's). `trend.hist` is built from these codes, so **the whole trend /
sparkline / streak history is topic-mismatched.**

The session code format is literally **`CPR1` = Content-Pipeline-Rehearsal-1** — a single-topic format now
carrying 46 topics' data with no topic field.

**Fix:** key `mock.last` / `mix.log` by topic id, reset the in-memory globals in `setTopic()`, add a topic
field to the session code, rename `CPR1`.

---
### 🟡 ISSUE-19 — The Session PDF report hard-codes "Content Pipeline"; `identity.reportTitle` is authored 46× and never read
**Severity:** P2 · **Category:** orphaned data · **Effort:** S (one line)

`session-progress.js:76` emits the literal `<div class="sr-ttl">Content Pipeline &mdash; Session
Report</div>` and `:94` the footer *"Content Pipeline deep-rehearsal trainer"*. Driving the **real**
"Save this session as a PDF →" button on `kafka-internals`: the rendered `.sr-ttl` is **"Content Pipeline
— Session Report"** while `identity.reportTitle === 'Kafka Internals'` and the `h1` says "Kafka
Internals". `reportTitle` is **required by the zod schema** (`topic-schema.mjs:25`) and read by **nobody**.
**One line: read `TopicRegistry.current().identity.reportTitle`.**

---
### 🟡 ISSUE-20 — Accessibility: no headings, no nav state, and the core loop is silent to screen readers
**Severity:** P2 · **Category:** a11y · **Effort:** M

- **The entire document contains exactly ONE heading** (`<h1>Content Pipeline</h1>`, `index.html:26`).
  Zero headings inside `<main>`. Zero in any of the 9 panes. `role="heading"` → 0 matches. axe's heading
  rules pass *precisely because there is nothing to order*.
- **The 9-section primary nav exposes no selected state.** Before/after `switchTab('num')`:
  `aria-current`, `aria-selected`, `aria-pressed`, `role` are all **`null`** — only the `on` class flips.
  The CDP AX tree returns `role=button name="Numbers ESTIMATE"` with no selected/pressed/current. **One
  line** in `switchTab()`; the codebase already emits `aria-current="true"` in two other places.
- **The drill's answer reveal — the app's core loop — is completely silent.** After Space, `.ans` exists
  in the shadow root with `aria-live: null`, `role: null`, `tabIndex: -1`; focus does not move; and
  **`aria-live` is null on EVERY ancestor** (`.ans → .thread → .card → #dwrap → DEEP-DRILL → #drill →
  .stage → .app → BODY → HTML`). The document-level live region still reads "Walkthrough". **The same
  defect recurs in Mixed Fire and cross-drill.**
- **The mock timer is a per-second `aria-live="polite"` region** (`drill/logic.js:19` + a 1s
  `setInterval`) → **~1,320 queued announcements over a 22-minute round.** `role="timer"` carries an
  implicit `aria-live="off"` *precisely* to prevent this, and the explicit `polite` overrides that safety
  default. (The mock-run overlay's own clock has no `aria-live` at all — the app is internally
  inconsistent, which shows this is an oversight.) **Combined with the silent reveal: an AT user in Mock
  mode hears the countdown and nothing else.**
- **On mobile the CLOSED Tools sheet keeps 12 focusable, screen-reader-exposed buttons off-screen.** It is
  hidden with `transform: translateY(115%)` **only** — which removes it from neither the tab order nor the
  a11y tree (`shell.js:172` comment: *"No display manipulation needed."*). A 26-press Tab sweep lands on
  12 consecutive buttons at `top: 1012 … 1586` in an 844px viewport, all `ignored: false` in the AX tree.
  **This is a documented regression** — `ROOT_CAUSE_ANALYSIS.md`'s "Final Fix Applied" records a
  `display:none` guard that no longer exists. Fix with `inert` + `aria-hidden`.
- **The keyboard-shortcuts overlay is the one overlay you cannot read with a keyboard.** `#keybody` has
  no `tabindex`/`role`/`aria-label` and 0 focusable descendants, and the app's own focus trap defeats
  Chrome's native focusable-scrollers rescue. At 640×400, **378 of 681px is unreachable — 0% scrollable
  from any tab position.** Its sibling `#cram` **did** get the fix (commit `2954f71` touched cram /
  gameplan / scope / mock — **not** keyboard.html) and scrolls fine. **One line.**

---
### ⚪ ISSUE-21 — P3 cluster (small, cheap, real)
**Severity:** P3 · Each is S effort unless noted.

| # | Defect | Evidence |
|---|---|---|
| a | **The progress rail is frozen for 6 of 10 views.** `railPos` (`shell.js:36`) has 4 entries `{walk:25, drill:50, wb:75, sys:100}`; for the other six `'undefined%'` is silently rejected as invalid CSS and the bar keeps its previous value. Boot(walk)=25% → trade=25% → open=25% → rf=25%. | measured |
| b | **The mock-run clock keeps counting after "Round complete."** `mixed-fire.js:197` calls `clearInterval(mockClock)` — but `mockClock` is a **requestAnimationFrame handle**. `clearInterval` on a rAF id is a no-op. Measured: 0:02 at the end screen → 0:05 three seconds later, still ticking behind the results. Use the existing `closeMockClock()`. | measured |
| c | **Density cycle is half-wired:** works via the `d` key, but has **zero UI control and no persistence** (reload → gone). Its sibling `text-zoom.js` has both. Finish or delete. | measured |
| d | **The guided tour is unreachable on touch** (bound only to `G`; the `?` overlay that documents it is `.kbd-only`, `display:none` <920px) — **and its only launcher is dead on the exact screen a first-time user lands on**, because the first-run start screen is a modal and `shell.js:82-83` kills every global shortcut while any modal is open. A new user has **no in-app path** to the app's only onboarding. | measured |
| e | **Modal-guard inconsistency:** `F`, `Ctrl+K` and `Ctrl+P` fire **through** open overlays (their listeners lack the `shell.js:82-83` guard). Focus mode toggles *behind* an open cram sheet. | measured |
| f | **Backdrop click dismisses only 4 of 11 overlays** (the dynamic ones); the 7 static ones silently ignore it. And **4 of 11 never scroll-lock the page behind** — the Topic index (which IS the home screen) chain-scrolls the page **562px** on mobile. `overscroll-behavior` appears **0 times** in the 5.1 MB bundle. | measured |
| g | **The tools drawer does not close on Escape** (it isn't a `[role=dialog]`, so neither Escape handler covers it) — while all 11 overlays and the topic menu do. | measured |
| h | **`identity.total` is a dead, zod-required field with a wrong value in all 46 files** (values: 8 and 38; neither is 46; zero consumers). | measured |
| i | **46 tap targets under 44×44**, incl. the whiteboard's **entire** interaction surface (28px) and `#_focus-toggle` at **60×20px / 9px font** (below even the 24px AA floor). **42 text elements under 12px**, incl. `.mbeat-l` at **9.5px ALL-CAPS holding 68–74-character full sentences**. (M) | measured |
| j | **`.msel` reserves 3 grid tracks for 2 tabs** on all 38 md topics → a dead third of the tab strip. | measured |
| k | **The tool-row chevron is ripped out of flow and clipped** on all 11 sidebar rows (two rules fight over one `::after`: the chevron and the global ripple) — **and the ripple's white radial-gradient is stuck permanently ON at 50% opacity**. | measured |
| l | **Repo cruft:** `_mob_diag.mjs` + `_mob_diag2.mjs` tracked at root (they write to `/mnt/user-data/outputs/`, a sandbox path); `axe-core` + `js-yaml` unused devDeps; the dead `js` token platform; `/home/claude/…` paths in `tools/`; `.git` = **173 MB** vs a **9.6 MB** working tree (223 commits × the 5 MB deliverable). | measured |
| m | **The gate is not read-only:** `test/build_integrity.py:30` shells out to `npm run build`, so running the gate **rebuilds `dist/`**. Worth knowing before any parallel-agent run. | measured |

---

## 8. RECOMMENDED SEQUENCING + STRATEGIC OPTIONS

### Wave 0 — do this now, no debate (≈1 day, all S)
These are one-liners and guards. They are the difference between "the app works" and "the app doesn't."
1. **ISSUE-1** — reduced-motion blank page (1 line). *Nothing else matters if the page is white.*
2. **ISSUE-2** — `min-width:0` on `.side-id .topic-nav` (1 line). *Restores mobile Tools + tab strip + bottom bar.*
3. **ISSUE-14** — land the in-flight `three` + deploy fix. CI goes green; the live site catches up 183 commits. *A clean clone currently cannot build.*
4. **ISSUE-6** — 3 `undefined` guards. **ISSUE-8** — the missing `else` on the coaching rail.
5. **ISSUE-4** — `snapshot()` merge/high-water. *Stops the app destroying the user's record.*
6. **ISSUE-9 + ISSUE-16** — viz `ResizeObserver` + listener/context cleanup (one change, same function).
7. **ISSUE-13**, **ISSUE-17**, **ISSUE-19**, **ISSUE-10** — print tokens, grade-key docs, reportTitle, focus-mode exit.

### Wave 1 — the force multiplier (≈2–3 days)
8. **ISSUE-7 FIRST — harden the gate.** Population assertions, a pixel assertion, a reduced-motion
   assertion, an `undefined`-on-screen assertion, a 46-topic URL round-trip. **Do this BEFORE any
   backfill or the backfill silently rots.** *The gate is why all of this shipped.*
9. **ISSUE-5 — the compiler parse fix.** One parser branch recovers **189 stages + 114 tier notes + 76
   pivot answers** that are **already written and paid for**, across all 38 topics. It simultaneously
   lights up the System Map, kills the `undefined`, un-globs the clipped chips, restores cross-topic
   jumps, and removes the mis-navigating jump buttons. **Highest value-per-hour in the entire repo.**
10. **ISSUE-11 + ISSUE-12** — mock/mixed-fire bank fixes + the clipping grid fixes.

### Wave 2 — the fork. Pick one.

**OPTION A — "FINISH THE 46" (content-first).** Backfill the 38 toward the legacy reference: 7 cmpNotes
each, the closer card, follow-up probes, the 6-beat mock bank, curveball tasks, `senior` notes.
- *Trade-off:* **XL** — the largest body of work in the repo. Zero visual payoff; the app looks the same.
- *But it decides whether this is a 46-topic trainer or an 8-topic trainer with 38 stubs.* Depth **is**
  the product.
- **Cheaper than it looks:** Wave 1 recovers ~380 items for free, and **`Follow:` and the beat-script
  grammar already parse** — a verifier fed the real compiler a `Follow:` card and got back a populated
  `f: [...]`, **zero compiler changes**. This is pure authoring, not schema work. Effort drops **XL → L**.

**OPTION B — "MAKE IT LOOK LIKE A PRODUCT" (visual-first).** §5 Tiers 1–2: the sidebar overflow, the
inverted composition, the four-buttons-one-verb problem, the one-character topic switcher, the mobile
chrome diet, and the **group-colour identity system**.
- *Trade-off:* fast, highly visible, makes the app feel *designed* rather than assembled.
- *But* it polishes the frame around content that is 28% of reference depth on 83% of topics.

**OPTION C — "SHIP THE 8" (scope-cut).** Ship only the 8 fully-realized topics; park the 38.
- **I recommend AGAINST this.** It throws away 798 genuinely good drill cards and 38 topics of correct,
  placeholder-free, senior-grade prose. The content is **under-built, not bad**. Cutting is the one move
  that destroys value the audit found.

**OPTION D — "COMMIT TO THE VISUAL TRAINER."** After Wave 0's two S-fixes it *works*. Author `## Visual`
for the ~10 topics where a queue/flow animation genuinely teaches (backpressure, rate-limiting,
load-balancing, autoscaling, real-time-delivery, stream-batch, distributed-locks, circuit-breaker, saga).
- *Trade-off:* it is the **only differentiating feature** and the 492 KB is already paid for (and costs
  ~0 ms of boot). But `queue-flow` is **Kafka semantics in generic clothing** — `sinks` triggers a 2s
  stop-the-world rebalance stall that is factually wrong for a bounded buffer or a worker pool. **Mode #2
  requires parameterizing the sim first (M).**
- The *alternative* is PARK: strip `kit.js` behind a build flag and reclaim 9.5% of the payload today.
  **Do not CUT** — the hard part is done and verified.

### MY RECOMMENDATION
> **Wave 0 → Wave 1 → then run A and B IN PARALLEL, with D as a fast follow.**

- **Why not B alone / first:** the app's most *visible* visual defects — 2,100px chips clipped mid-word,
  empty System Maps, `undefined` on screen, a blank canvas, a blank *page* — are **content/compiler bugs
  wearing a visual costume**. Doing pure visual polish first means restyling a pane that renders nothing.
- **Why not A alone / first:** ISSUE-1 and ISSUE-2 mean a real fraction of users **cannot use the app at
  all**. No amount of content is worth authoring behind a white screen.
- **Why parallel after Wave 1:** A (markdown + compiler + gate) and B (CSS + shell + tokens) are
  **disjoint file sets** — worktree-parallelizable with a clean serial merge, exactly the flow this repo
  already uses.
- **Fix the visual trainer in Wave 0** (it's 2 × S) but **defer the mode-2 authoring decision (D)** until
  the content backfill has proven out. Deciding it now buys nothing and risks authoring 10 more visuals
  against a sim that teaches a falsehood.

**And the durable fix, above all of them: make the gate count.** Every single defect in this report —
including the blank page — shipped through a green 19/19. Until the gate measures population, pixels and
reachability, this exact report will be true again in three months.

---

## 9. COVERAGE / HONESTY

**Completed:** 16 of 16 lenses. **Zero dropped.** Each was independently re-verified by a second agent
that attempted to refute it; refuted claims were stripped, and several were — including two of my own
(a `span.badge` "clip" that was an animation artifact, and an inv-topics viz attribution that was an
off-by-one from a 12 ms DOM read).

**What this audit did NOT cover:**
- **No real devices.** All mobile measurements are Chromium/Playwright emulation. The **iOS Safari 16px
  input auto-zoom** finding is inferred from a documented threshold, **not observed**.
- **No screen reader was actually run.** The a11y findings come from the CDP accessibility tree and
  computed styles — strong, but not the same as hearing NVDA / VoiceOver.
- **No cross-browser testing.** Chromium only. Firefox and Safari were never opened.
- **No security review**, no load/soak beyond 20 viz cycles, no i18n, no offline-storage-quota testing.
- **The prose of only 13 of 46 topics was deep-read** for technical accuracy (all 13 clean). The other 33
  were measured structurally, not fact-checked line by line.
- **Effort estimates are S/M/L/XL judgements**, not measured.

**What remains uncertain:**
- `visual-trainer/` declares `vite ^6` while root has `vite 8` — a **two-major skew, unverified** (the
  read-only rule forbade running its build). Its config is trivial, so risk is low but **unconfirmed**.
- Whether the 46-topic content is **pedagogically** calibrated. I can measure depth; I cannot measure
  teaching quality. "28% of reference depth" is a structural claim, not a claim that the topics fail to
  teach.
- The `.git` reclaim (~77 MB) assumes the archive tag is the only ref pinning those objects; not
  re-verified after a hypothetical `gc`.

**Contradictions between lenses, resolved explicitly:**
1. **Mobile Tools reachability (P2 vs P0).** One verifier tested the *default* topic and found the page
   pans; another navigated to the *longest* topic and measured `canPanRight: false` +
   `TOOLS_BUTTON_REACHABLE_ANYWHERE_ON_SCREEN: false` at 430px. **The worst-case measurement wins. P0.**
2. **System Map root cause.** Three lenses blamed `system-map.js` or `.stage{overflow-x:hidden}`. Both
   are **wrong** — the renderer is innocent (`:93` and `:98` are correct) and `.stage` clips **0px** on
   sys. **The bug is entirely in `tools/compiler/parse_md.mjs`.** A fixer following the original lenses
   would have found nothing.
3. **Viz deep-link root cause.** One lens blamed `TopicRegistry.setTopic()` deferring through a
   ViewTransition; an instrumented boot trace **proved `setTopic()` is never called** in the failing
   path — it is `Router.init()` being deferred to `DOMContentLoaded` while the bounce's `setTimeout(…,0)`
   fires first. **The trace wins.**
4. **`prefers-reduced-motion`.** The a11y lens marked it **PASSING**; four other lenses found it makes the
   app **blank**. **The screenshot wins.** (Its observation — animations collapse to 1e-05s — is *true*
   and *irrelevant*.)
5. **Archive-tag reclaim.** One lens reported 109 MB / 68% of the pack (uncompressed bytes ÷ compressed
   pack size). Re-measured with `objectsize:disk`: **77 MB / 48%**. **The disk figure wins.**

**Methodology hazards for whoever fixes this** (worth more than any single finding):
- **The panes are SHADOW DOM.** A `styles.css` rule targeting `.wb-rev`, `.op-rev`, `.piv-jump`, `.msel`,
  `.arc-t`, `#num input`, `.dots i` or `.mb-rev` is a **proven no-op**. There are already **dead rules in
  `styles.css`** from the migration (the `:active` button-ripple never fires on any pane control). **Split
  every fix by DOM boundary**; pane-internal fixes belong in the component sheet or in `BASE_SHEET`.
- **The pane DOM lags `setTopic()` by up to ~400 ms** (it routes through `ViewTransitions`). Short-wait DOM
  probes read the **previous** topic. This corrupted three separate intermediate measurements during the
  audit. **Poll until the shadow DOM reflects the target topic before reading.**
- **The first-run Topic-Index overlay auto-opens and swallows every keypress and click.** A naive
  click-driven test on a fresh profile produces **460 false failures**. Drive with a boot hash or dismiss
  it first.
- **Running the gate is NOT read-only** — `build_integrity.py` shells out to `npm run build`.

**One live caveat:** 6 **tracked** source files were modified during this audit by a concurrent agent (the
ISSUE-14 fix). `dist/index.html` is **byte-identical** (5,163,186 B) to what every lens measured, so the
evidence base is stable — but the working tree is not clean, and that diff should be reviewed and landed
deliberately.
