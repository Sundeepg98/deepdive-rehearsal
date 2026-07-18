# 2026-07-18 — Why it feels "totally manually constrained, no smoothness" (5-lens synthesis)

**System of record** for the manual-constraint / smoothness analysis. Question posed by the operator: *"analyze all the manual things — there is no smoothness — what is the reason?"* Five lenses were driven against the shipped single-file app (click-ledger, motion-inventory, jank-trace, input-grammar, flow-critique); the load-bearing findings were adversarially re-verified by a second instrument that imported none of the first's tooling. Verdict-first below; evidence tables cite the lens and the verification status of every number.

Screenshots referenced live under `_audit/shots/2026-07-18-manual-analysis/` (all cited files confirmed on disk).

---

## VERDICT (read this first)

**The feeling is real and the operator's phrase is literally true — but this is NOT an absence of capability. It is a wiring, surfacing, and application problem. Every one of the five lenses, independently, found that the smooth/guided version of the thing already exists in the codebase and is simply not applied to the default path.**

- The click-ledger found the machinery for momentum and memory **already ships, and is used in 2 places out of dozens** (drill self-advance; reload-resume).
- The motion map found the app **owns a full, correct motion system** (tokens, easings, keyframes, 14 reduced-motion guards) — spent on 7 low-traffic overlays and withheld from the high-traffic core.
- The jank trace found the fast-machine problem is **not stalls** (668 ms blocked across 30 interactions, 24/30 with zero long tasks) — it is the *absence of motion* over a ~111 ms swap.
- The input audit found **22 of 22 keyboard shortcuts work** and a real mobile gesture layer ships — both hidden behind one "?" badge.
- The flow critique found a **complete path engine** (weakness ranking, an ideal Drill→Whiteboard→Mock→Mixed-Fire arc, a `pickRec()` next-move computer, a 4-surface session tracker) **wired as a passive control panel** — computed for nobody, pushed nowhere.

**One sentence:** *The app has a smooth, guided product bolted to a control-panel chassis — the ingredients of flow and motion are built and correct, but the default path re-derives a neutral read-state after every click, moves you nowhere on its own, and paints the change with no motion, while the fast layer that would relieve all of it is invisible.*

That is good news for cost: the dominant fixes are re-wiring existing mechanisms and adding opacity-only motion, **not building a motion system or a curriculum engine from scratch.**

### The three strongest numbers

| # | Number | What it proves | Lens | Verified |
|---|--------|----------------|------|----------|
| 1 | **62 of 63** journey actions are hand-driven — the entire product auto-advances in **exactly one** place (drill self-grade → next probe) | "manually constrained" is literal, systemic, and topic-independent | click-ledger | CONFIRMED (Playwright ledger, reproducible) |
| 2 | **~50%** of state-change types (8 of ~16) are motion-dead hard snaps — concentrated on the **highest-traffic** surfaces — with `transition-duration:0s` on `#home`, the pane host, and all 7 overlay backdrops, so every click paints after a **~111 ms un-animated swap** | "no smoothness" on a fast machine = missing motion, not jank | motion-map + jank-trace | CONFIRMED |
| 3 | **22 of 22** keyboard shortcuts work, yet **0** key hints appear on the 9 pane tabs and there are **0** `aria-keyshortcuts` in the whole document — so the default user drives **~100%** of the session by pointer on **21 of 49** sub-44px targets | the fast path is built but hidden — the manual burden is self-inflicted by invisibility | input-grammar | tested, 22/22 pass |

Fourth number, load-bearing for the mid-range story: **668 ms → 14,008 ms** total main-thread blocked, 1× → 4× CPU — a **21×** super-linear blow-up that is invisible on the operator's fast machine and brutal on a mid-range device.

---

## 1. Ranked root causes

Ranked by contribution to the felt problem and by cross-lens evidence strength. Each is one distinct mechanism; they compound but do not overlap.

### RC-A — No forward-chaining flow grammar (the app is a control panel, not a path) — DOMINANT

The literal cause of "manually constrained." The interaction model is **click → read → return to neutral → click again**, with no momentum. Nothing chains pane→pane, step→step, tool→tool, or topic→topic except the single drill self-grade.

| Evidence | Value | Lens | Verified |
|---|---|---|---|
| Total actions, one realistic pass (9 panes + 1 drill cycle + 3 tools + 3 topics) | **63** clicks/keys | click-ledger | CONFIRMED |
| Of those, hand-driven | **62** (the 1 exception is drill self-grade) | click-ledger | CONFIRMED |
| Pure-navigation floor (visit each pane, choose topics, no engagement) | ~11 | click-ledger | — |
| Completion surfaces that hand the user forward to the next surface | **0 of 4** (all loop back or dead-end: Walk-10/10 `Next` disabled + 0 next-pane affordance; Drill "Another quick 5"; Mock "Run another round"; Mixed-fire "run it again") | flow-critique | CONFIRMED (identical across 3 groups) |
| "continue / next up / what's next / keep going" controls, whole document | **0** | click-ledger | CONFIRMED |
| Pane tabs carrying a completion marker, `aria-current` order, or "recommended-next" | **0 of 9** | flow-critique | — |
| Simultaneous interactive controls on one topic+drill screen | **~64**, of which **~1** carries a system recommendation | flow-critique | — |
| The next-move engine `pickRec()` (8-branch ladder) is real — its only UI entry is `#sessopen` at | y=**1214 px**, **314 px below** the 900 px fold, behind a modal | flow-critique | CONFIRMED (`inViewport=false`) |
| Weakness ranking (`Progress.summary().weakest`) drives primary navigation | **never** (46 topics order by list position, not weakness) | flow-critique | — |

**Type:** *Architecture (flow grammar).* This predates and is untouched by the correctness wave. The product **computes** the right next move on every graded card and **shows it to nobody**; it **tracks** position and **defaults to the lobby** on reopen (auto-resume is a checkbox, default OFF). The user is forced to make ~64 choices per screen that the product already has the data to make.

Screens: `flow-01-home-dashboard.png`, `flow-03-walk-deadend-step10.png`, `flow-04-drill-controlpanel.png`, `flow-05-session-progress-modal.png`, `flow-08-debrief-loops-back.png`, `manual-04-sidebar-toolstack.png`.

### RC-B — Motion is dead on the highest-traffic surfaces (the smooth version was removed and never re-wired) — DOMINANT for "no smoothness"

The literal cause of "no smoothness" **on the operator's fast machine.** The app is not missing animation code; ~half of its state-change vocabulary is spent on the wrong (low-traffic) surfaces, and the biggest-context changes get the least motion.

| Evidence | Value | Lens | Verified |
|---|---|---|---|
| Distinct state-change types that are motion-dead hard snaps | **8 of ~16 (~50%)** | motion-map | — |
| Topic switch (the app's single biggest content change): active pane **body** opacity across the swap | flat **[0.99,1,1,1,…]** for 28 frames — only a ~40 px header (`headin` 250 ms) fades | motion-map | rAF-anchored, all 4 topics |
| Core study loop — drill/whiteboard **reveal**: `.show{animation:pop}` is assigned but | opacity flat **1.00** across 24 frames — `pop` never interpolates because `display:none→block` has no `@starting-style`/`allow-discrete` anywhere (**grep count = 0**) | motion-map | element-level trajectory |
| HOME→index return: animations fired | **0** — screenshot at +40 ms is **byte-identical** to +540 ms (**93,495 bytes** both) | motion-map | CONFIRMED |
| Topic dropdown (~60-item jump control): panel animation | **none** — only the caret rotates | motion-map | `getAnimations()` |
| Crossfades / shared-element transitions anywhere | **0 / 0** — every A→B replacement is enter-only or a cut | motion-map | structural census |
| `transition-duration` on `#home`, pane host, `#mockov`, `#cramov` (all 7 overlay backdrops) | **0s** | jank-trace | computed CSS |
| Per-click un-animated swap on a fast machine | **~111 ms** input-to-paint after a **33 ms** synchronous handler, with nothing bridging the gap | jank-trace | CONFIRMED |
| `transition` declarations in the file, of which hover/focus micro-feedback | **648**, ~**95%** micro-feedback (not state-change choreography) | motion-map | — |

**Type:** *Deliberate trade + application gap.* Two layers, and both matter for the fix: **(a)** the correctness wave stripped transform-based motion off hit surfaces and removed `document.startViewTransition()` for real reasons (see §3); **(b)** the hit-test-safe replacement (opacity crossfade) was kept on the overlays but **never re-wired onto the default navigation path.** The consequence is not forced by the constraint — the pane's own `panein` is opacity+blur (transform-free) and ships today; opacity does not move click targets.

> **Internal-consistency note (not a contradiction):** the overlays animate via `@keyframes` (`panelIn`/`ovbg`), which is why the motion map calls them choreographed while the jank trace reads their CSS `transition-duration` as `0s`. Both are correct — the overlays have a *keyframe*, no *transition*. The dead surfaces (topic body, home return, dropdown) have **neither**.

Screens: `01-topicswitch-A-before.png`, `manual-02-wb-reveal-wall.png`, `02-home-B-plus40ms.png`, `04-dropdown-B-plus40ms.png`, `03-tab-A-walk.png`, `03-mock-overlay.png`.

### RC-C — The fast paths are built but invisible (amplifier of RC-A)

Why every one of the 62 manual actions is executed the slow, pointer-precise way: the keyboard and gesture layers that would relieve the burden are undiscoverable in-topic.

| Evidence | Value | Lens | Verified |
|---|---|---|---|
| Documented keyboard shortcuts that test functional | **22 of 22** (panes Q–O, walk ←/→, drill Space/Enter, grade 1/2/3, `/ \ [ ] G D Esc ?`) | input-grammar | tested, 0 flakes |
| Key hints on the 9 in-topic pane tabs | **0** (markup is bare `<span>Walkthrough</span>`) | input-grammar | — |
| `aria-keyshortcuts` attributes in the whole document | **0** | input-grammar | — |
| Visible keyboard cues inside a topic | **1** (a lone "?" badge) | input-grammar | — |
| In-topic interactive targets below the 44 px comfortable minimum | **21 of 49** (Toggle-focus 60×20 is the only sub-24 WCAG-AA fail; timer/text-size/companion 24–28px) | input-grammar | byte-identical across 3 groups |
| Overlay tools with **no** open shortcut (pointer-only) | **5 of 7** (Mock, Mixed-fire, Cram, Game-plan, Scope) | input-grammar | — |
| Mobile swipe navigation dead-ends | at the **2 diagram panes** — last 5 panes (trade/model/num/rf/open) unreachable by a natural swipe (diagram spans y=453→925, swallows the gesture) | input-grammar | CDP touch |
| The one shortcut a user meets mid-drill (`keyov`) is | **mis-documented** — panel lists 1/2, the live judge row is 1/2/3 (Missed/Shaky/Solid) | input-grammar | tested |
| Keyboard-only topic entry from home (`/` type Enter) | **silently no-ops** (sets `TopicRegistry` but hash stays `home`) | input-grammar | CONFIRMED |

**Type:** *Input-modality gap (discoverability + coverage).* The cheapest root cause to fix and the one that does not touch the motion constraint at all — these are hints, keys, and gesture-gating, not transforms on hit surfaces.

Screens: `discover-01-intopic-full.png`, `discover-02-tabstrip-nokeys.png`, `gesture-03-sysmap-mobile.png`, `gesture-04-overlay-mobile-closeX.png`, `measure-04-drill-judge-row.png`, `journey-01-search-typed.png`.

### RC-D — Genuine main-thread jank, latent on fast HW, brutal on mid-range (the one real measured cost)

The honest "this is not just missing motion" cause. On a fast machine it is **latent**; on a mid-range 4×-CPU device it dominates.

| Evidence | Value (1× → 4× CPU) | Lens | Verified |
|---|---|---|---|
| Total main-thread blocked, 30-interaction battery | **668 ms → 14,008 ms (21×)** | jank-trace | CONFIRMED |
| Interactions firing **zero** long tasks, unthrottled | **24 of 30** | jank-trace | CONFIRMED |
| Boot to interactive | **1,076 ms → 8,444 ms** (single 2,843 ms boot long task; FCP 2,356 ms) | jank-trace | — |
| Worst frozen input (click sits unserviced behind a long task) | **2,481 ms** at 4× (circuit-breaker entry) | jank-trace | — |
| Avg per-click synchronous processing | **33 ms → 214 ms (6.5×)** | jank-trace | CONFIRMED |
| Worst first-render long task | **~1.2–1.4 s** at 4× (replication 1,361 ms; sharding 1,157 ms) | jank-trace | **ADJUSTED ↓** — claim of 2,442 ms not reproduced (real peak ~1.2–1.4 s) |
| Heaviest steady pane | **topic entry (walk), then drill (max 625 ms)** | jank-trace | **ADJUSTED** — claim "wb is heaviest" is **inverted**; wb is among the *lightest* (~230–310 ms) |

**Type:** *Performance (measured compute).* This is CPU-bound main-thread work (DOM-build + style/layout recalc), not IO or raster — the wave already baked diagrams to static SVG (0 runtime mermaid) and cached them, which *removed* a large chunk of first-render cost. The super-linear 21× means it degrades hard on real mid-range hardware and **cannot be masked by motion there** — it needs the work reduced (chunking/deferral), separately from the fast-machine motion fix.

Screens: `00-boot-index.png`, `02-drill-pane.png`.

---

## 2. What KIND of problem is each

| Root cause | Kind | Predates the wave? | Fixable without reopening a correctness bug? | Felt where |
|---|---|---|---|---|
| **RC-A** control-panel, no flow grammar | **Architecture (flow grammar)** | Yes — orthogonal to the wave | Yes (re-wire existing engines) | Everywhere; the "manual" feeling |
| **RC-B** motion dead on high-traffic core | **Deliberate trade + application gap** | Trade introduced by the wave; the *withholding* is the gap | Yes — opacity/crossfade is hit-test-safe and already ships on overlays | Fast machine; the "no smoothness" feeling |
| **RC-C** fast paths invisible | **Input-modality gap (discoverability + coverage)** | Yes | Yes — hints/keys/gesture-gating, no transforms | Amplifies RC-A on every action |
| **RC-D** main-thread jank | **Performance (measured compute)** | Partly mitigated by the wave (SVG bake) | Yes — chunk/defer, no correctness impact | Boot + first-render + mid-range only |

The two dominant causes map cleanly onto the operator's two words: **RC-A is "manually constrained," RC-B is "no smoothness."** RC-C is why RC-A hurts as much as it does; RC-D is the honest caveat that one slice of the problem is real compute, not just missing animation — and it lives on hardware the operator is probably not testing on.

---

## 3. What the correctness wave did — and did NOT — cost here

The recent wave (compiler parity, n-drift, room-accent, the 7/7 visual wave, the **binding click-surface verdict**) did real, correct work, and it is worth being candid about its footprint on smoothness, because the answer determines whether RC-B is a tradeoff we must live with or a debt we can pay down.

**What it legitimately cost (and was right to):**
- It **stripped transform-based motion off hit surfaces.** The wave's signature fix was click-surface stability — a click target that drifted **55.6 px → 0**. A transform on an interactive layer moves the thing you are trying to click; that is a correctness defect, and removing it was correct.
- It **removed `document.startViewTransition()`** — the jank trace found its own code comment: the API "ate 150–500 ms of input on this 11.6 MB doc." On an offline single-file payload that is a defensible latency call.
- Net effect on the **default navigation path** (topic switch, pane host, home return, dropdown): motion was removed and `transition-duration` went to `0s`. **This is the origin of ~half of RC-B.**

**What it did NOT have to cost — and this is the key point:**
- **Hit-test-safe motion still exists and still ships.** The 7 overlays are fully choreographed (`panelIn` + `ovbg` + symmetric `ovbgout`/`ovpanout` exits), and the pane's own `panein` is **opacity + blur, transform-free.** Opacity does not move click targets, so it does **not** re-open the click-surface bug the wave closed. The constraint the wave enforced — *no transform on interactive layers* — is fully satisfied by opacity crossfade, non-interactive-layer choreography, and clip/height reveals.
- Therefore **most of RC-B is a re-wiring debt, not a tradeoff that must stand.** The smooth version was removed for a real reason on the hit surfaces, kept on the overlays, and simply never re-applied to the high-traffic default path. The overlays are the standing proof that the motion system works under the exact constraint.
- On performance, the wave was **net-positive:** baking diagrams to static SVG (0 runtime mermaid/highlighter, per the jank-trace re-verify) removed raster and highlight cost from every first-render, leaving only deterministic DOM-build + layout. RC-D is what remains of the *JS* build cost, not something the wave introduced.

**The candid bottom line:** the correctness wave did not trade away smoothness in principle. It removed the unsafe (transform) version of motion on hit surfaces for good reasons, and the safe (opacity) replacement was deferred on the default path. RC-A (flow grammar) is entirely orthogonal to the wave — it was a control panel before and after. So none of the "manual/no-smoothness" verdict is an argument against the correctness work; it is a punch list of what to wire back now that correctness is banked.

---

## 4. Fix-direction map (directions, not designs)

Every direction is tagged with the root cause it addresses and the three invariants it must not break. The invariants are hard:

- **[click-surface]** — no transform on interactive layers (the binding click-surface verdict, 55.6 px → 0). Motion must be opacity / clip / height, or transform only on **non-interactive** layers.
- **[reduced-motion]** — 14 guards exist and the app has blanked-paged under `prefers-reduced-motion` before (the `body{opacity:0}` + `animation:none` bug). Every motion addition must degrade to an **instant content swap**, never to a hidden element.
- **[offline]** — 11.6 MB inline single file, no network, no external deps. Every fix stays inline CSS/JS; no CDN, no fonts, no fetch.

### Quick wins (cheap, high-impact, mostly opacity-only or additive)

| # | Direction | Addresses | Must NOT break | Proof it's safe |
|---|---|---|---|---|
| QW-1 | **Opacity crossfade on the default path** — replay the existing `panein`/`bodyIn` (opacity, transform-free) on pane-host swap, topic-switch **body**, `#home` return, and the dropdown; overlap outgoing→incoming so there's no blank frame. Covers the ~111 ms swap so the delay reads as motion, not lag. | RC-B (+ masks RC-D on fast HW) | [click-surface] opacity moves nothing · [reduced-motion] gate to instant swap · [offline] pure CSS | overlays + `panein` already do this under the constraint |
| QW-2 | **Fix the `pop` no-op** — add `@starting-style{opacity:0}` (or set `opacity:0` in the base `.show` rule) so drill/whiteboard reveals actually interpolate. This is the **core study loop**, the most-repeated action in the app. | RC-B | [click-surface] opacity-led · [reduced-motion] guard · [offline] CSS | `pop` is already opacity-led; it just never starts |
| QW-3 | **Surface the keyboard layer in-topic** — key badges/tooltips on the 9 tabs + nav arrows, real `aria-keyshortcuts`, a persistent "press ? for keys" affordance (not the `display:none`-on-touch button). Correct `keyov` to 1/2/3 (Missed/Shaky/Solid); document `h`/`p`. | RC-C (+ relieves RC-A) | nothing — purely additive hints | keys already work 22/22 |
| QW-4 | **Persist per-topic sub-position** — store `{activePane, walkStep, drillProbe, revealed}` in the same store that already survives reload; restore on topic re-entry. Removes the measured 5-action re-establish. | RC-A | [offline] same store | topic+pane already resume across full reload |
| QW-5 | **Default auto-resume ON** (or make the Home "Resume" CTA honor `nav.last` before any grade) so a reopen lands on the work, not the lobby. | RC-A | [offline] `nav.last` already tracked | position is already written to Store |
| QW-6 | **Enlarge / key the pointer-only micro-controls** (timer, text-size, companion, focus toggle) to ≥44 px and/or give them keys — the spots where precise pointing is genuinely unavoidable today. | RC-C | — | — |
| QW-7 | **Fix the mobile diagram-swipe gate** — gate pinch on `touches.length===2` only (already tracked) so a 1-finger horizontal drag isn't swallowed; unlocks the last 5 panes by swipe. | RC-C | — | — |
| QW-8 | **Route home-search into the topic** — from home, a result should `Router.navigate` INTO the topic, not just `setTopic` behind the still-open overlay. | RC-C | — | — |

### Structural (the spine — higher effort, addresses the dominant cause)

| # | Direction | Addresses | Must NOT break | Notes |
|---|---|---|---|---|
| ST-1 | **Add a "Continue" spine** — a persistent primary affordance that carries the user to the logical next unit (next walk step, next uncovered pane, next probe), so a session has forward momentum instead of returning to neutral after every click. **Extend the drill's proven advance-on-action chain** — the one place the pattern already works. | RC-A | keep the tab bank as an **override**; don't remove manual access | the drill proves the pattern ships and is liked |
| ST-2 | **Turn every completion into a hand-off** — make `pickRec()`'s computed next-step the **primary button** at each terminal state ("Now rebuild it on the whiteboard →"), and promote the "Focus next" nudge out of the below-fold modal into the post-completion surface + the coaching rail. Keep the modal only as the detailed breakdown. | RC-A | [reduced-motion] no motion dependency | engine already computes it every graded card |
| ST-3 | **Give the 9 tabs completion state + a "recommended next" emphasis** following the intended Drill→Whiteboard→Mock→Mixed-Fire arc; finishing one pane lights the next rather than leaving 9 equal-weight buttons. | RC-A | keep all tabs clickable | arc exists as prose only today |
| ST-4 | **Sequence by the weakness ranking the product already owns** (`Progress.summary().weakest`) — order probes/panes/next-topic by measured weakness; demote the full grid to an override affordance. | RC-A | reversible/overridable | data already computed, drives nothing |
| ST-5 | **Chunk / defer first-render + boot** — build panes lazily in idle callbacks, yield between sections so no task > 50 ms; break the single 2.8 s boot long task by deferring non-index work until the overlay is interactive. This is the **only** fix that matters on mid-range and it cannot be substituted by motion. | RC-D | [offline] still one file — lazy-build DOM, no new payload | wb is *not* the priority (it's light); topic-entry/drill build are |

**Sequencing guidance:** QW-1/QW-2/QW-3 are the highest impact-per-effort on the operator's fast machine and should ship first (they fix the felt deadness and expose the fast layer). ST-1/ST-2 are the real cure for "manually constrained" and are where the durable value is. ST-5 is a separate track for mid-range and must not be conflated with the motion work — the jank trace is explicit that fixing one does nothing for the other, and testing on the wrong machine wastes the effort.

---

## 5. Honest counterpoints — where the app is already smooth or guided

The verdict is not "the app is broken." Four of the five lenses volunteered a counterpoint, and the machinery they point to is exactly what the fixes reuse. Being candid here also means recording where the adversarial verification **walked the first pass back.**

### Already good today (do not "fix" these)

| Surface | What already works | Lens |
|---|---|---|
| **Drill self-grade** | Auto-advances to the next probe **and** resets the reveal in one action — a genuine, well-built chain (the one place with momentum) | click-ledger, flow-critique |
| **Reload-resume** | A full page reload restores the exact topic + pane (not bounced to Home); active pane persists across topic switches | click-ledger |
| **The 7 overlays** | Fully choreographed AND symmetric — `ovbg` blur 0→8px + `panelIn` (opacity+scale, settles ≤165 ms) on open; `ovbgout` + `ovpanout` on close. Proof the motion system works under the constraint | motion-map |
| **First topic-entry** | The richest transition in the app — `railin` 500 ms + `headin` 250 ms + `panein` 500 ms layered | motion-map |
| **Theme toggle** | 159 synchronized 200 ms color transitions — a clean global crossfade | motion-map |
| **Scroll-to-top** | Eased, decelerating ~480 ms glide, not a jump | motion-map |
| **Fast machine steady state** | Not jank — 24/30 interactions fire zero long tasks; repeated tab switches run 0 ms blocked | jank-trace |
| **Keyboard capability** | 22/22 shortcuts pass on first test, no flakes; pane tabs are a comfortable 260×44; Esc closes every dialog uniformly | input-grammar |
| **Mobile capability** | Real horizontal-swipe pane nav + pinch-zoom + double-tap-reset on diagrams; vertical swipe correctly ignored (no scroll hijack) | input-grammar |
| **Entry & coaching content** | HomeView computes "what to do today" with Resume/Start + a "Still shaky" list; the coaching rail delivers per-view "THE MOVE HERE"; Session Progress tracks the full 4-surface arc with a portable code | flow-critique |

The sharpest tell of the whole analysis, from the flow lens: the opener pane tags each interviewer follow-up with its home register (`[drill]`, `[walk]`, `[trade]`) — **visually implying cross-pane passage** — but those chips are decorative (0 interactive; clicking `drill` left the hash unchanged). **The connective tissue is painted on, not wired.** That single observation is the whole verdict in miniature.

### Where the adversarial re-verify corrected the first pass (kept for honesty)

| Claim (first pass) | Corrected value | Impact |
|---|---|---|
| First-render worst long task = **2,442 ms** (circuit-breaker, 4×) | **~1.2–1.4 s** peak (circuit-breaker median ~680 ms); never near 2.4 s | RC-D real but ~1.7× overstated at the tail |
| **"wb is the single heaviest steady pane"** | **Inverted** — wb is among the *lightest* (~230–310 ms); heaviest is topic-entry, then drill (max 625 ms) | fixes the ST-5 priority: don't optimize wb |
| 4× dropped-frame figures (e.g. 1,517 ms / 129 frames on wb; 2,450 ms / 196 on circuit-breaker) | Inflated **~3–6×** and internally inconsistent with a validated 4× throttle; real cold worst ~490 ms / 62 dropped | direction correct, magnitudes not |
| Real GPU (headed) "no transition runs at 60fps" | **Overstated** — light panes and repeat visits sustain 60fps on real GPU; only cold heavy first-renders jank | RC-D is a first-render/cold problem, not every switch |
| Whiteboard **9 cards / 18 clicks** everywhere | 45/46 topics yes; **saga = 10 cards / 20 clicks** (still no bulk, no advance) | claim holds; one outlier |
| Walkthrough **9 Next clicks / 10 stages** | Representative topic is **9 stages / 8 Next** (45/46); event-driven (the default "Start" target) is the **1/46** with 10 stages / 9 Next; the dots rail is a **passive** indicator, not a 3rd navigator | claim exact on the default topic; refined elsewhere |

None of these corrections touch RC-A, RC-B, or RC-C — they refine the tail magnitudes of RC-D and confirm the fast-machine story (RC-B) is the right lever for the operator's machine.

---

## Appendix — evidence & screenshot manifest

All paths relative to `_audit/shots/2026-07-18-manual-analysis/`.

- **RC-A (flow):** `flow-01-home-dashboard.png`, `flow-03-walk-deadend-step10.png`, `flow-04-drill-controlpanel.png`, `flow-05-session-progress-modal.png`, `flow-06-reopen-lands-on-menu.png`, `flow-08-debrief-loops-back.png`, `manual-01-walk-deadend-step10.png`, `manual-04-sidebar-toolstack.png`, `manual-05-model-subtabs.png`
- **RC-B (motion):** `01-topicswitch-A-before.png`, `01-topicswitch-B-plus40ms.png`, `02-home-B-plus40ms.png`, `02-home-C-after.png`, `04-dropdown-B-plus40ms.png`, `03-tab-A-walk.png`, `03-tab-D-settled.png`, `05-overlay-B-plus45ms-rising.png`, `manual-02-wb-reveal-wall.png`, `01-topic-entered.png`
- **RC-C (input):** `discover-01-intopic-full.png`, `discover-02-tabstrip-nokeys.png`, `gesture-01-mobile-topic.png`, `gesture-03-sysmap-mobile.png`, `gesture-04-overlay-mobile-closeX.png`, `measure-04-drill-judge-row.png`, `journey-01-search-typed.png`
- **RC-D (jank):** `00-boot-index.png`, `02-drill-pane.png`, `03-mock-overlay.png`

**Lens sources:** click-ledger (manual-work inventory, journey ledger), motion-map (rAF-anchored opacity/transform + `getAnimations()`, 4 topics × 4 groups), jank-trace (PerformanceObserver longtask + Event Timing + rAF sampling, 1× and 4× CPU, 30 interactions), input-grammar (22 shortcuts + target sizing + gesture coverage, 3 groups), flow-critique (design lens, every claim driven on screen). Load-bearing findings re-verified by an independent second instrument; verification status is in each table.
