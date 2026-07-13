# axe-core audit — the room system + the drill scoreboard rework

**Date** 2026-07-13 · **Target** `dist/index.html` @ `4318509` · **axe-core** 4.12.1 · **Playwright** 1.61.1 / Chromium
**Scripts + data** `_audit/2026-07-13-a11y/*.mjs`, `*.json` · **Screenshots** `_audit/2026-07-13-a11y/shots/axe/`

---

## The headline

**axe-core reports ZERO violations across all 252 surfaces** — 6 rooms × 2 themes × (shell + 10 panes + 10 overlays), nothing skipped.

**That number is worth much less than it looks, and I can prove exactly how much.**

axe's `color-contrast` rule **cannot evaluate 92% of this app's text**. On the home surface it resolves 14 of 172 text nodes (**8.1%**); the other 158 bail out as `incomplete`. Across the full matrix that is **9,276 unevaluated contrast checks**. The app's own gradients and decorative pseudo-elements defeat axe's background model:

| axe's reason for refusing to score a node | nodes |
|---|---|
| background could not be determined — **background gradient** | 5,543 |
| background could not be determined — **pseudo element** | 2,984 |
| content contains only non-text characters (icon glyphs) | 455 |
| content too short to judge | 266 |
| partially overlaps other elements | 28 |

The room system **is** a colour system — 177 `color:var(--acc*)` text rules, 253 `var(--acc*)` usages. **The one thing axe cannot do here is the one thing that needed checking.** A violations-only axe report on this app is structurally incapable of failing on contrast. That is the sixth can't-fail check, and I did not ship it — I built a calibrated painted-pixel instrument to cover the blind spot instead (below).

---

## Proof the harness can fail

Six negative controls, each broken then restored (`negative-control.mjs`):

| # | control | baseline | broken | restored | |
|---|---|---|---|---|---|
| 1 | `button-name` — nameless icon button | 0 | **1** | 0 | ✅ |
| 2 | `color-contrast` — flat element, `#b9b9b9` on `#fff`, **light DOM** | 0 | **1** | 0 | ✅ |
| 3 | `color-contrast` — flat element **INSIDE a shadow root** | 0 | **1** | 0 | ✅ |
| 4 | `aria-hidden-focus` — focusable inside `aria-hidden` | 0 | **1** (reports at `incomplete` in 4.12) | 0 | ✅ |
| 5 | `label` — unlabelled input | 0 | **1** | 0 | ✅ |
| 6 | `image-alt` — img with no alt | 0 | **1** | 0 | ✅ |

Control **#3 is the load-bearing one**: all nine panes are `attachShadow({mode:'open'})`, so the room tokens are consumed *inside* shadow roots. axe caught the planted failure at `deep-walkthrough >>> #__nc3`, proving the rule is live and shadow-piercing. The 9,276 `incomplete` results are therefore **the app defeating a working rule**, not a rule that never ran.

### Two traps this harness fell into first — and how it was corrected

Both are worth recording, because they are the same species as the blank-page certification.

**1. The animation trap (invalidated my entire first run).** The app fades in `<body>` (`@keyframes bodyIn`) and every pane (`@keyframes panein`). My first matrix sampled ~300 ms after each pane switch — *inside the fade* — and axe faithfully scored a transient blended frame, reporting **12 phantom "serious" contrast violations that do not exist at rest**:

```
settle  150ms -> no violation
settle  300ms -> VIOLATION 4.17:1  fg #73716b       <- mid-fade blend
settle  600ms -> no violation
settle 5000ms -> no violation
computed color at rest: rgb(107,104,98) = #6b6862, opacity 1   -> 4.71:1, PASSES
```

The fix is `axe-matrix2.mjs`: block on `document.getAnimations()` until nothing is running, and **assert stillness at every scan** (`not-settled: 0` held on all 252). *Any a11y check on this app that does not wait for animations is measuring a frame no user reads.*

**2. A first-run scrim.** On a virgin visit the app auto-opens the index overlay (`#_index-overlay.ix-ov.open.vis`) with an `rgba(30,28,24,.45)` scrim over the whole page. My first pixel sweep measured a screenful of text *through* that scrim and invented dozens of failures. (This also identifies the "home/index surface": it is that first-run overlay. Dimming content behind a modal is correct — not a bug.) Fixed by asserting an un-scrimmed surface before measuring.

---

## Findings

### F1 — `aria-prohibited-attr` on `.locator` · **serious** · **NEW (room system)** · 12/12 room-theme cells

The only non-contrast finding in the entire matrix, and it points straight at the room work.

```
target : .locator                                             (surface: shell; 6/6 rooms, both themes)
html   : <span class="locator" title="Architecture &amp; APIs"
               aria-label="Architecture &amp; APIs — ingestion layer">
rule   : aria-prohibited-attr  ·  impact serious  ·  1 node × 12 contexts
```

`aria-label` on a **roleless `<span>`** (implicit role `generic`) is *prohibited* by ARIA — the name is not guaranteed to be exposed.

**Provenance — measured, not guessed:**
- `39d9c60~1` (pre-room): `<span class="locator">` — no aria-label, no title.
- Shipped now: added by **`f967120` — "Status is not a room: fix the six regressions the colour pass shipped."**

**This is an own goal.** `topic-protocol.js` states the intent outright: *"the spelled-out label … moves to the ACCESSIBLE name … aria-label= so a screen reader still hears 'Architecture & APIs' rather than spelling out three letters."* The accommodation written **specifically for screen-reader users** was placed on the one element where the spec says it must be ignored. It is load-bearing: the visible text is only the 3-letter code — `"ARCingestion layer"`.

**Real-world impact (CDP accessibility tree, `locator-ax.mjs`) — narrower than the spec implies:**

| state | AX role | ignored | AX name |
|---|---|---|---|
| **as shipped** | `generic` | false | `"Architecture & APIs — ingestion layer"` |
| + `role="img"` | `image` | false | `"Architecture & APIs — ingestion layer"` |
| aria-label removed | `generic` | false | `""` |

Chromium **does** honour it today. So this is not broken *right now, in Chromium*. But it is spec-invalid, and accessible names on `generic` nodes are exactly what other engines (Firefox, WebKit) and real AT (NVDA/JAWS/VoiceOver) do **not** reliably announce. Where it is dropped, the room name is lost entirely and the user hears the bare code.

**Fix (verified):** add `role="img"` to the span — axe goes silent *and* the name is preserved (row 2 above). A visually-hidden sibling span would work equally well.
📷 `shots/axe/F1-locator-aria-prohibited.png`

---

### F2 — Drill scoreboard **zero-state** below WCAG AA · **serious** · **PRE-EXISTING, deepened by the rework** · 12/12 cells

**axe cannot see this finding at all** — it is inside the 92% `incomplete` bucket. It was found by the calibrated pixel probe.

The mechanism is one line in `drill/logic.js`:
```css
.pill.z{opacity:.62}      /* .z = the tile's zero state */
```
That 62% composite drags the Solid/Revisit tiles' label and value below threshold:

| node | painted | ratio | needs | cells |
|---|---|---|---|---|
| `.pill.g.z > .l` — "Solid" label (9px/700) | `#9d9992` on `#fcfbf9` | **2.74** | 4.5 | 12/12 |
| `.pill.g.z > .v` — "0" value (24px/800) | `#a09d97` on `#fcfcf9` | **2.63** | 3.0 | 6/12 (light) |
| `.pill.s.z > .l` — "Revisit" label | `#9d9a93` on `#fcfcfa` | **2.73** | 4.5 | 12/12 |
| `.pill.s.z > .v` — "0" value | `#a09e98` on `#fcfcfa` | **2.61** | 3.0 | 6/12 (light) |

**Provenance — measured by counterfactual** (`counterfactual.mjs`), sweeping the opacity and re-measuring painted pixels:

| `.pill.z` opacity | light "Solid" label (4.5) | light "0" value (3.0) | dark label (4.5) |
|---|---|---|---|
| **0.62 — as shipped** | **2.74 FAIL** | **2.63 FAIL** | **3.51 FAIL** |
| 0.70 — pre-rework | 3.21 FAIL | 3.03 pass | 4.12 FAIL |
| 0.80 | 3.95 FAIL | 3.67 pass | 4.94 pass |
| **0.90** | **4.93 pass** | **4.54 pass** | **5.94 pass** |
| 1.00 | 6.11 pass | 5.55 pass | 7.04 pass |

`f967120` changed `.pill.z{opacity:.7}` → `{opacity:.62}`. So the label **already failed** before the rework (pre-existing), but the rework **deepened it** and **newly broke the light "0" value** (3.03 pass → 2.63 fail).

**Fix, measured:** `.pill.z{opacity:.9}` clears AA on every zero-state node in both themes. It preserves the design intent completely — "Left" stays the loudest tile, Solid still does not celebrate 0/21.
📷 `F2-zerostate-shipped-0.62.png` vs `F2-zerostate-fix-0.90.png` (side by side), `F2-scoreboard-zerostate-{light,dark}.png`

**Scope this correctly: it is the EMPTY state only.** Once the counters have anything to say, everything passes, in all 12 cells (`revisit-state.mjs`, drill driven to Solid=2 / Revisit=3 / Left=16, 0 void cells):

| tile (non-zero) | painted | ratio |
|---|---|---|
| `.pill.g` Solid, **filled** | `#ffffff` on `#1d6f3f` | 6.18 ✅ |
| `.pill.s` Revisit value | `#9a5b0b` on `#ffffff` | 5.42 ✅ |
| `.pill.s` Revisit label | `#67615a` on `#ffffff` | 6.11 ✅ |
| `.pill.left` value / label | `#2a2823` on `#ffffff` | 14.72 / 6.11 ✅ |

---

## What the room system did **not** break — an earned green

I nearly reported the opposite. My first (unsettled) controlled experiment showed contrast violations swinging **0 → 10** purely on `data-group`, with `architecture-apis` — the boot default — the only clean room. It looked like a devastating finding: *"the room system was only ever validated in its default room."* **It was an animation artifact.** With settling, it vanishes.

Two independent instruments now agree the room system is contrast-safe:

1. **axe, controlled** (topic held fixed at `state-machine`, only `html[data-group]` varied — this is what separates the room's *colour* from the topic's *content*): **0 violations in all 6 rooms × 2 themes.**
2. **Painted pixels** (`contrast-sweep.mjs`): **5,484 text nodes** measured across 6 rooms × 2 themes × 7 panes = 84 surfaces. Negative control (`#b9b9b9`/white ≈1.96:1 must be caught; black/white =21:1 must pass) **recovered on all 84 surfaces; 0 void**. Result: **12 failures, every one of them the room-invariant zero-state scoreboard tiles of F2. Zero room-dependent contrast failures.**

The 253 `var(--acc*)` usages ship contrast-safe in all six rooms and both themes. The scoreboard rework's core claim — status off the hue channel, fill-vs-outline + glyph, Solid the only tile that fills — **holds up under measurement**, including for the red-green confusion pair (Solid fills green at 6.18:1; Revisit never fills and carries a `↻` glyph).

---

## Coverage

**Scanned with axe (252 surfaces, 0 skipped):** 6/6 rooms × 2/2 themes × (shell + **all 10 panes** — walk, drill, wb, sys, trade, model, num, rf, open, viz — + **10 overlays, opened**: cram, scope, gameplan, keyboard, mock, mixed, session, index, search, notes). The drill was driven into a *graded* state before scanning, so the reworked scoreboard was audited in its real states, not just at rest.

**Also measured:** 5,484 text nodes (painted pixels, 84 surfaces); 144 scoreboard tile measurements across resting + banked states in 12 cells; CDP accessibility tree for F1.

**NOT covered — stated plainly:**
- **Chromium only, 1440×900 only.** F1's real-world severity hinges on non-Chromium AT behaviour, which I did not test — that is precisely why F1 should be fixed despite Chromium currently honouring it.
- **The `viz` pane has no content to audit: 0 of 46 topics define a visual mode**, so it always renders "This topic has no visual mode." (Checked — not a gap, a dead pane.)
- Mobile/responsive layouts, keyboard focus-order, and reduced-motion belong to the other lenses.
- Closed overlays were verified `display:none` + `aria-hidden="true"` and correctly **pass** `aria-hidden-focus` — no bug there.

---

## Recommended order

1. **F1** — one attribute (`role="img"` on `.locator`). NEW, introduced by the room work, defeats an accommodation that was written on purpose for SR users. Cheapest fix in the audit.
2. **F2** — one value (`.pill.z{opacity:.62}` → `.9`). Pre-existing but deepened by the rework, and it is the drill's only feedback surface.
3. **The instrument itself** — if any a11y check is kept in CI, it **must** (a) wait on `document.getAnimations()`, and (b) report axe's `incomplete` bucket, not just `violations`. Without both, an axe run on this app cannot fail on contrast, and the repo will have shipped its sixth check that cannot go red.
