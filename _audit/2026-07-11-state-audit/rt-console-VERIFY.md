# rt-console — ADVERSARIAL VERIFICATION

**Role:** skeptic. Re-check every claim of the `rt-console` lens against the real system; refute by default.
**Target:** `dist/index.html` (5.1 MB single-file offline SPA), `file://`, Chromium 1.61.1 headless.
**Date:** 2026-07-11

---

## Verdict

| original finding | verdict |
|---|---|
| F1 — viz pane renders a 0×0 canvas (P1) | **CONFIRMED** — reproduced exactly; root cause **confirmed and strengthened** with a controlled A/B the original did not have |
| F2 — `#<topic>/viz` deep link discards topic + view (P2) | **CONFIRMED as a defect** — reproduced exactly — but its **ROOT CAUSE IS REFUTED** (the named mechanism never executes) |

| what the lens MISSED | severity |
|---|---|
| **M1 — the app renders 100% BLANK under `prefers-reduced-motion`** | **P0** |
| M2 — `event-driven`'s URL never round-trips: refresh/share silently teleports you to `content-pipeline` | P2 |

The headline claims (**0 console errors, 0 page errors, 0 failed requests, 1 network request**) are all **CONFIRMED**, and in fact **stronger** than reported — see "What held up" below. But the lens's core methodology — *count console errors, conclude health* — is exactly what let a **total app blackout (M1) sail through with a clean bill of health**. M1 produces **zero console errors** in every configuration.

---

## CONFIRMED — F1: the app's only WebGL visual renders a 0×0 canvas (P1)

Independently reproduced. `kafka-internals` is the only topic with a `## Visual` section (sole `grep -rln "^## Visual" src/topics-md/` hit — re-run, confirmed). Loading `#kafka-internals/walk` and clicking the **Visualize** tab:

| state | canvas attr | canvas CSS | drawingBuffer | pane height |
|---|---|---|---|---|
| after click (mount) | **0x0** | 592x2 | **1x1** | 153 |
| after one window resize | 591x332 | 593x334 | 591x332 | 485 |
| leave → re-enter the pane | **0x0** | 593x2 | **1x1** | 153 |

`vizInstance: true` (mount threw nothing), `emptyShown: false`, **0 console errors**. Control canvas in the same browser: `drawingBuffer 300x200`, renderer `WebKit WebGL` → **not** a GPU/headless artifact.

Screenshot `shots/rt-console-verify/vc-A-viz-after-click.png` (I viewed it): the HUD is **live** — red `LAG GROWING` badge, `Total lag 104`, `Capacity 90 msg/s`, three working sliders, two scenario buttons, and the caption *"producers (left) -> partitions backing up (middle) -> consumer group (right)"* — sitting above a **completely blank area**. The simulation runs; it paints to a 0×0 surface.

### Root cause — CONFIRMED, and proven rather than inferred

The original inferred the mechanism from code reading. I **proved it with a controlled experiment**.

`ViewTransitions.run()` (`view-transitions.js:24,36`) uses `document.startViewTransition()` **unless** the user prefers reduced motion, in which case it calls `apply()` **synchronously**. That is a free A/B switch on the exact suspected cause. Instrumenting `VisualKit.mount` to record host geometry **at the moment of mount**:

| `prefers-reduced-motion` | pane display AT MOUNT | `.on` class | host size AT MOUNT | resulting canvas |
|---|---|---|---|---|
| `no-preference` (startViewTransition **async**) | **`none`** | **false** (`.pane.on` was still `walk`) | **0x0** | **0x0 — BROKEN** |
| `reduce` (swap applied **synchronously**) | `block` | true (`viz`) | 592x0 | **590x332 — WORKS** |

Bypassing `startViewTransition` fixes the canvas. The chain is exactly as the original described: `router.js:62-67` `emit()` notifies subscribers (ViewManager → `switchTab()`) **before** dispatching the DOM `routechange`; `shell.js:55` hands the `.on` swap to `ViewTransitions.run()` which defers it; `visual-pane.js:26` mounts on that raw `routechange` — while `#viz` is still `display:none` (`styles.css:120` `.pane{display:none}`) — so `visual-pane.js:47` `VisualKit.mount()` measures a 0-width `#vzhost`.

**Two refinements the original missed:**
1. The kit only needs a laid-out **width** — in the `reduce` run the host was `592x0` (height still 0, the div is empty) and the canvas still came out `590x332`. So the fix does not need a height, only real layout.
2. **Users with `prefers-reduced-motion` enabled never hit this bug at all** — but see M1: those users can't see the app anyway.

*(Aside: a plain monkey-patch of `VisualKit.mount` silently no-ops — the kit defines `mount` via `Object.defineProperty(obj,'mount',{get,enumerable})`, i.e. a **non-configurable accessor**. I had to Proxy the object. Worth knowing for whoever writes the fix's test.)*

**Scripts:** `scripts/vc-02-viz.mjs`, `scripts/vc-03-viz-cause.mjs`
**Shots:** `vc-A-viz-after-click.png`, `vc-B-viz-after-resize.png`, `vc-C-viz-after-reentry.png`, `vc-cause-no-preference.png`

---

## CONFIRMED (defect) / REFUTED (root cause) — F2: `#<topic>/viz` deep links

**The defect is real and reproduced exactly:**

```
#kafka-internals/viz  -> hash #content-pipeline/walk   topic content-pipeline   pane walk
#saga/viz             -> hash #content-pipeline/walk   topic content-pipeline   pane walk
#viz                  -> hash #content-pipeline/walk   topic content-pipeline   pane walk
```

Controls land correctly, so it is viz-specific: `#saga/num` → saga/num ✓, `#kafka-internals/walk` → kafka-internals/walk ✓. The `v`-key claim also reproduces: on `saga`, pressing `v` yields hash `#saga/viz` with the clean "This topic has no visual mode." fallback — a URL `Copy link` (`copy-link.js:26`, copies `window.location.href` verbatim) will happily share, and which reopens on the wrong topic.

### The stated ROOT CAUSE IS FALSE

> *"…because `TopicRegistry.setTopic()` defers the `deeptopicchange` event through a ViewTransition (`topic-protocol.js:114`) — so the `setTimeout(…,0)` fires BEFORE `renderTopic()` ever sees the requested topic's real visual data."*

**`TopicRegistry.setTopic()` is never called at all in the failing path.** Instrumented boot trace for `#saga/viz`:

```
 522.2ms  cur=content-pipeline  hash=#saga/viz               Router ASSIGNED
 557.0ms  cur=content-pipeline  hash=#saga/viz               Router.navigate(walk) ENTER   <-- THE BOUNCE
 562.8ms  cur=content-pipeline  hash=#content-pipeline/walk  Router.navigate EXIT          <-- deep link ALREADY destroyed
 563.6ms  cur=content-pipeline  hash=#content-pipeline/walk  DOMContentLoaded
 566.8ms  cur=content-pipeline  hash=#content-pipeline/walk  Router.init() ENTER           <-- router parses the WRECKAGE
 612.8ms  cur=content-pipeline  hash=#content-pipeline/walk  Router.init EXIT
```

No `TopicRegistry.setTopic` line appears — it never runs. (In the healthy `#event-driven/walk` trace it appears right on cue, at `Router.init()+0.3ms`.) There is no ViewTransition deferral involved.

**The actual root cause:** `Router.init()` is deferred to **`DOMContentLoaded`** (`src/index.html:174-179` — `if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)`). Meanwhile `deep-visual`'s `connectedCallback` runs during the **synchronous** `app.js` evaluation, calls `renderTopic(bootTopic.data.visual)` — which for the boot topic `content-pipeline` is `null` — and queues the bounce `setTimeout(…, 0)` (`visual-pane.js:39`). That timer macrotask **beats DOMContentLoaded**, so `goView('walk')` → `Router.navigate()` → `topicPrefix()` stamps the *boot* topic into the hash and overwrites the deep link **before the router has ever parsed it**.

**Causal proof.** Suppress the single pre-`init()` `Router.navigate()` and nothing else:

| | stock | pre-init navigate suppressed |
|---|---|---|
| `#kafka-internals/viz` | `#content-pipeline/walk`, topic content-pipeline | **`#kafka-internals/viz`, topic kafka-internals, pane viz** ✓ |
| `#saga/viz` | `#content-pipeline/walk`, topic content-pipeline | **`#saga/walk`, topic saga** ✓ (bounce fires later and behaves *correctly*) |

**This also refutes half the original's recommendation.** It advises "have the bounce preserve the topic when it does redirect (route to `<topic>/walk`, never a bare `walk` that re-derives the prefix from the stale current topic)". Unnecessary: `goView('walk')` **already** preserves the topic via `topicPrefix()` once the registry holds the right topic — demonstrated above (`#saga/viz` → `#saga/walk`, topic kept). The guard's *logic* is fine; only its **timing** is broken. The correct fix is to not let it run before the router has applied the initial route (or to resolve the requested topic from the route rather than from `TopicRegistry.current()`).

**Why this matters:** an operator handed the original's root cause would go rework the ViewTransition deferral in `topic-protocol.js:114` — code that is not involved — and the bug would survive.

**Scripts:** `scripts/vc-01-routing.mjs`, `scripts/vc-07-cause2.mjs`

---

## MISSED — M1 (P0): the app renders **100% BLANK** under `prefers-reduced-motion`

The single most important thing in this lens's territory, and it was missed — because it produces **zero console errors**.

```css
/* src/styles.css:90  (and verbatim in dist/index.html) */
body{ … ;opacity:0;animation:bodyIn var(--duration-slowest) var(--ease-glide) var(--duration-fast) forwards}

/* src/styles.css:137 (and verbatim in dist/index.html) */
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
```

`body` has **base `opacity: 0`** and depends entirely on the `bodyIn` keyframe animation (`forwards` fill) to become visible. The reduced-motion block applies **`animation: none !important` to `*`** — the shorthand sets `animation-name: none`, killing `bodyIn` outright. `body` is then stuck at `opacity: 0` forever.

Measured on the shipped `dist/index.html`:

| case | reduced-motion | `body` computed opacity | `body` animation-name | console errors |
|---|---|---|---|---|
| desktop 1280×900, fresh boot | no-preference | `1` | `bodyIn` | 0 |
| desktop 1280×900, fresh boot | **reduce** | **`0`** | **`none`** | **0** |
| desktop 1280×900, `#walk` | no-preference | `1` | `bodyIn` | 0 |
| desktop 1280×900, `#walk` | **reduce** | **`0`** | **`none`** | **0** |
| mobile 390×844, `#walk` | no-preference | `1` | `bodyIn` | 0 |
| mobile 390×844, `#walk` | **reduce** | **`0`** | **`none`** | **0** |

Universal: every viewport, fresh boot and deep link alike. The DOM is fully built, laid out and **hit-testable** (`elementFromPoint` at the viewport centre returns real elements; Playwright clicks succeed) — the app is simply **invisible**. No error, no warning, no console output of any kind. A user with OS "Reduce motion" enabled (macOS Accessibility → Display → Reduce motion; Windows → Accessibility → Visual effects → Animation effects off; iOS/Android equivalents) opens this offline trainer and sees **a blank cream page**.

**Proof it is solely the opacity:** setting `document.body.style.opacity = '1'` in the reduced-motion page instantly restores the entire, fully-functional app — see `vc-P0-blank-desktop-walk.png` (blank) vs `vc-P0-fixproof-desktop-walk.png` (the complete working UI, same page, one property changed).

Note the codebase already contains **two correct** reduced-motion blocks that neuter animation via `animation-duration: .01ms !important` (`styles.css:22`, `styles.css:832`) — which lets `bodyIn` still run (instantly) and land its `forwards` fill at `opacity: 1`. Only `styles.css:137`'s `animation: none` is destructive. That one line is the bug.

**Fix (S):** give `body` a base `opacity: 1` and animate *from* 0, **or** drop `animation` from the `*` rule at `styles.css:137` in favour of the `animation-duration: .01ms !important` form already used at lines 22 and 832.

> Also missed by the **accessibility lens**, which affirmed reduced-motion support as **"TRUE"** (`accessibility.md:24`) on the strength of "all 9 probed elements collapse to `animation-duration: 1e-05s`" — it measured animation timings and never checked whether the page was *visible*.

**Script:** `scripts/vc-10-rmblank.mjs`, `scripts/vc-09-blank.mjs`
**Shots:** `vc-P0-blank-{desktop-freshboot,desktop-walk,mobile-walk}.png`, `vc-P0-fixproof-desktop-walk.png`, `vc-P0-ok-desktop-walk.png`

---

## MISSED — M2 (P2): `event-driven`'s URL never round-trips — refresh or share teleports you to `content-pipeline`

The original declared *"Routing is robust: deep links, back/forward, and a garbage hash all fall back cleanly."* Not quite.

I ran a full **share/refresh round-trip matrix over all 46 topics**: switch to the topic the way the UI does (`TopicRegistry.setTopic` — `topic-nav.js:52` calls this "the ONE switch path"; the dropdown, `[`/`]`, the index overlay and the related-topic buttons all funnel here), read the URL the app leaves in the bar (exactly what `copy-link.js:26` copies), then re-open that URL cold.

**45/46 round-trip correctly. `event-driven` is the sole failure.**

Driven through the **real dropdown UI** (`#tntrigger` → `.tn-item[data-topic="event-driven"]`):

```
after real dropdown click -> topic "event-driven", h1 "Event-Driven Backbone",
                             href  .../dist/index.html#walk      <-- bare, no topic prefix
"Copy link" would copy    :  .../dist/index.html#walk
re-open that link cold    -> topic "content-pipeline", h1 "Content Pipeline"     *** WRONG TOPIC ***
```

And a plain **F5 reload** in the same warm profile does it too:

```
before reload: {"topic":"event-driven","hash":"#walk","h1":"Event-Driven Backbone"}
after  reload: {"topic":"content-pipeline","hash":"#walk","h1":"Content Pipeline"}
>>> RELOAD TELEPORTED: event-driven -> content-pipeline
```

(`last-visit.js` only *records* the last topic for the index overlay's Resume affordance; it does not restore on boot, so it does not rescue this.)

### Root cause: two disagreeing definitions of "the default topic"

- `router.js:54-59` `topicPrefix()` and `router.js:88-97` `Router.setTopic()` both treat **`TopicRegistry.ids()[0]`** as the topic that gets a **bare** hash. `ids()` is **sorted** by `topicOrderIndex` (`topic-protocol.js:121` → `groups.js:31`), and `TOPIC_ORDER[0] === 'event-driven'` (`groups.js:25`).
- But `TopicRegistry.register()` (`topic-protocol.js:104`) seeds the boot topic `cur` to the **first-REGISTERED** topic, which is **`content-pipeline`**.
- `parseHash()` maps a bare `#walk` to `topic: null`, and `ViewManager.applyRoute()` (`view-manager.js:51`) only switches topic when `route.topic` is truthy — so a bare hash silently means *"the boot topic"* = `content-pipeline`.

`router.js:52-53`'s own comment states the intent — *"empty for the default (**first-registered**) topic"* — but the code uses the **sort-order** first. Comment and code disagree; `event-driven` falls into the gap.

**Impact is higher-frequency than the confirmed F2.** `event-driven` is `TOPIC_ORDER[0]` — the first topic in the index and the dropdown, a prime entry point. Every refresh while on it silently swaps the user's topic; every bookmark and every shared link to it opens a different topic. (F2, by contrast, needs the user to reach the `viz` route first.) The two bugs also compound: the F2 bounce on `event-driven` would emit a bare `#walk` too.

**Fix (S):** make the bare-hash topic the same one `register()` actually boots to (compare against the first-**registered** id, not `ids()[0]`), or simply always emit the topic prefix.

**Script:** `scripts/vc-04-roundtrip.mjs`
**Shots:** `vc-rt-eventdriven-before.png`, `vc-rt-eventdriven-after.png`, `vc-reload-eventdriven.png`

---

## What held up — and is actually stronger than claimed

The original's headline error/network claims all survive re-measurement, and I pushed them harder:

| claim | my independent result |
|---|---|
| 0 console errors | **0** — across 46 topics × page loads, 10 panes × 3 topics by real tab clicks, 9 overlays, all keyboard shortcuts, search, tour, topic stepping, reload |
| 0 uncaught page errors | **0** |
| 0 unhandled promise rejections | **0** (explicit in-page `unhandledrejection` listener) |
| 0 failed requests | **0** |
| 1 network request (the document) | **1 unique URL** — `file:///…/dist/index.html`. Zero outbound. Offline contract **airtight**. |

**And a harder test the original did not run.** The app has **59 empty `catch (e) {}` blocks** in `src/scripts` and registers **no** `window.onerror`/`unhandledrejection` handler — so "0 console errors" does *not* by itself prove "0 exceptions"; a thrown-and-swallowed exception (e.g. `router.js:64` `try { listeners[i](route); } catch (e) {}`) is invisible to `page.on('console')`. I re-ran the full drive under **CDP `Debugger.setPauseOnExceptions: 'all'`**, which catches *caught* exceptions too:

```
EXCEPTIONS THROWN (including ones swallowed by catch{}):  0
```

**Instrument validated** (`scripts/vc-06-canary.mjs`): a deliberate `try { throw new Error('CANARY-SWALLOWED') } catch(e){}` inside the page **is** detected by the probe (and produces 0 console errors, as expected). So the zero is real, not a broken sensor. The app genuinely throws **nothing at all** on these paths — a better result than the original was able to claim.

**"START HERE" overlay:** confirmed by-design (`index-overlay.js:420-427`, gated `if (!window.__bootHash && !hasProgress)`), and the testing hazard is real — a boot hash or a dismissal is required to drive the app.

### Reported by me as nothing

In one long run I saw 4 console **warnings** (`GL Driver Message … GPU stall due to ReadPixels`). I could not reproduce them in isolation — 0 warnings both with and without screenshotting (`scripts/vc-08-warn.mjs`) — so I cannot attribute them to the app and **am not raising them as a finding**.

---

## Scripts & evidence

All under `D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/`:

| script | purpose |
|---|---|
| `scripts/vc-01-routing.mjs` | deep-link matrix + instrumented boot trace → **refuted F2's root cause** |
| `scripts/vc-02-viz.mjs` | re-measured the 0×0 canvas (confirms F1) |
| `scripts/vc-03-viz-cause.mjs` | **A/B causal test** of F1's root cause via reduced-motion |
| `scripts/vc-04-roundtrip.mjs` | 46-topic share/refresh round-trip matrix → **found M2** |
| `scripts/vc-05-console.mjs` | console/network/exception ground truth + CDP pause-on-all-exceptions |
| `scripts/vc-06-canary.mjs` | validates the exception probe (so the "0" means something) |
| `scripts/vc-07-cause2.mjs` | **causal proof** of F2's real root cause (suppress the pre-init navigate) |
| `scripts/vc-08-warn.mjs` | attribution check on GL warnings → not the app, not reported |
| `scripts/vc-09-blank.mjs` / `vc-10-rmblank.mjs` | **found M1** — `body{opacity:0}` under reduced motion |

Screenshots in `shots/rt-console-verify/`.
