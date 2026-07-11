# Mobile Layout Audit (Playwright) — deepdive-rehearsal

**Date:** 2026-07-11
**Lens:** rt-mobile — mobile layout, runtime, `dist/index.html` (file://, offline — the app's real usage mode)
**Viewports:** 320×568 (stress floor), 360×640, 390×844, 414×896 (+430×932 for blast radius)
**Coverage:** 180 deep-measured states (4 viewports × 5 topics × 9 panes) + 2 full sweeps across all **46 topics × 9 panes** (414 states each)
**Method:** all measurement pierces shadow DOM — all 9 panes are shadow-DOM web components (`deep-walkthrough`, `deep-drill`, …). `isMobile:true, hasTouch:true`.

**Console health: 0 console errors, 0 page errors across all 180 states.**

---

## Verdict

The app is **structurally broken on every phone width tested**. The headline defect is a single
CSS omission in the topic-nav that puts **every one of the 46 topics into horizontal document
overflow at 320px and 360px**, and renders the "next topic" button off-screen and **unclickable**.
Two panes (`num`, `walk`) additionally cut off real content.

The good news: the three regressions documented in `ROOT_CAUSE_ANALYSIS.md` are **mostly still
fixed** — the 146px mesh-gradient phantom scroll has **not** returned, and the fixed bars do not
occlude content. But **Root Cause 3 (mockbar) has partially regressed** — its `display:none`
guard is gone from the stylesheet.

---

## P1 — Horizontal document overflow: `#topicnav` cannot shrink (MOBILE-ONLY)

### Measurement

| viewport | doc `scrollWidth` | `clientWidth` | overflow | topics affected | topics losing the `›` button |
|---|---|---|---|---|---|
| 320×568 | 453 | 320 | **+133px** | **46/46** | **46/46** |
| 360×640 | 453 | 360 | **+93px** | **46/46** | **46/46** |
| 390×844 | 453 | 390 | **+63px** | **34/46** | 34/46 |
| 414×896 | 453 | 414 | **+39px** | **26/46** | 26/46 |
| 430×932 (iPhone 16 Pro Max) | 453 | 430 | **+23px** | **19/46** | 19/46 |
| 1440×900 (desktop) | 1440 | 1440 | **+0px** | 0 | — |

Worst topic: **"Production Debugging and Incident Diagnosis" → +219px at 360px.**
The overflow is **identical across all 9 panes** within a topic and scales with the topic-name
length ⇒ it is a shell/header bug, not pane content.

### Root cause (bisected, exact)

`#topicnav` measures a **constant 437.7px at every viewport** (320→414) — the signature of a
min-content floor, not a shrink failure. Measured via a `width:min-content` clone:
`topicnavMinContent = 437.7px`.

```
437.7 = 3 × 44px (.tn-step: home, prev, next)
      + 287.7px (.tn-trigger min-content, driven by .tn-current{white-space:nowrap})
      + 3 × 6px  (gap)
```

`#topicnav` is a **flex item of `.side-id`** (`display:flex;flex-wrap:wrap`, styles.css:304) and
computes **`min-width: auto`** — so it can never shrink below 437.7px. It forces the document to
`15px (.side-id padding) + 437.7 = 452.7 → scrollWidth 453`.

- `src/styles.css:619` — `.topic-nav{position:relative;display:flex;gap:...}` — **no `min-width:0`**
- `src/styles.css:825` — `@media(max-width:900px){.side-id .topic-nav{flex-basis:100%;order:3}}` — sets `flex-basis` but **not `min-width:0`**
- `.tn-trigger`'s existing `min-width:0` (styles.css:620) is **useless** — the *container* never gets constrained, so the trigger never has to shrink.

> **The 2026-07-08 tap-target commit made this worse.** `src/styles.css:843`
> `@media(max-width:600px){.tn-step{min-width:44px;min-height:44px}}` raised the three step
> buttons from `--space-32` (32px) to 44px, adding **3 × 12 = 36px** to the min-content floor.
> It did not *cause* the bug (401.7px still overflowed 360px) but it deepened it. Both must be
> fixed together.

### User-visible consequence (the severe part)

- `#tnnext` (the `›` next-topic button) renders at **x = 408.7 … 452.7** on a 360px screen — entirely off-screen.
- The document **cannot scroll horizontally**: `documentElement.scrollLeft`, `body.scrollLeft` and `window.scrollTo(999,0)` all leave `scrollX = 0`. `htmlOverflowX/bodyOverflowX = visible` — the overflow lives between the layout and visual viewport, not in a document scroller.
- **A real Playwright click on `#tnnext` TIMES OUT** (`locator.click: Timeout 4000ms exceeded`) — the control fails the actionability check. It is not reliably tappable.
- The topic name itself is cut: `#tncurrent` right edge = 373.1px on a 360px screen.

**Evidence:**
- `shots/rt-mobile/hoverflow-360-scrolledRight.png` — at rest: the `›` button is **absent**, topic name cut off.
- `shots/rt-mobile/topicnav-clipped-360-annotated.png` — panned right: the `›` button (orange outline) sits beyond the red viewport-edge marker.
- `shots/rt-mobile/hoverflow-{320,390,414}-*.png`
- Raw: `blast-radius.json`

### Fix (both verified in-page — doc `scrollWidth` drops to *exactly* the viewport width)

```css
/* src/styles.css:825 */
@media(max-width:900px){
  .side-id .topic-nav{ flex-basis:100%; order:3; margin:var(--space-6) 0 0;
                       min-width:0;      /* <- the fix */ }
}
```
Verified: `min-width:0` on `#topicnav` → scrollWidth **360** (was 453) at 360px; **320/390/414** likewise exact.
`flex-wrap:wrap` on `.topic-nav` also fixes it (scrollWidth 360). Effort: **S** (one line).

---

## P1 — Numbers (NALSD) pane cuts off content on 31 of 46 topics

`.stage{overflow-x:hidden}` (styles.css:290) silently **clips** anything wider than the stage —
there is no scroll affordance, so the content is simply gone.

**Sweep (all 46 topics × 9 panes @ 360px): 40/414 states clip content.**

| pane | topics affected | worst |
|---|---|---|
| **num** | **31/46** | +112px |
| **walk** | **9/46** | +208px |
| drill, wb, sys, trade, model, rf, open | 0/46 | clean |

### num — root cause

`src/scripts/app/num/logic.js:32,36`
```css
.nrow{display:grid; grid-template-columns:1fr auto; grid-template-areas:"k v" "n n"; ...}
.nrow-v{grid-area:v; font:900 17px ui-monospace,...; white-space:nowrap; ...}
```
The `auto` value column is `nowrap` and the `1fr` label column has an implicit `min-width:auto`,
so neither can shrink. Measured on `api-design/num` @360px:

| row | box | content | overflow |
|---|---|---|---|
| "Rows wasted / sec (fleet)" = `~19,996,000` | 284px | 419px | **+135px** |
| "Stability under inserts" | 284px | 341px | +57px |
| "Offset penalty at this depth" = `5,000x` | 284px | 326px | +42px |
| "Rows scanned (offset)" = `~100,000` | 284px | 319px | +35px |

Overflow leaks up (`overflow-x:visible`) → `.card` → `deep-numbers` → `#num.pane` → clipped by
`.stage`. Stage: `clientWidth 360 / scrollWidth 457` → **+97px cut off**.

> **Not mobile-specific.** At 1440px the same rows overflow by the *same absolute* +135/+57/+42/+35px
> (box 704px, content 839px) and the stage still clips +60px. A media query will not fix it —
> the `auto` column needs `minmax(0,auto)` / the value needs to wrap or shrink.

**Evidence:** `shots/rt-mobile/num-rows-clipped-360.png` (overflowing rows outlined red), `clip-sweep.json`. Effort: **S–M**.

### walk — root cause

`src/scripts/app/walkthrough/logic.js:31`
```css
.fb{font:600 11.5px ui-monospace,...; white-space:nowrap; ...}
```
Long authored fork-box text renders as one unwrapped line. Worst: `stream-batch-processing/walk`
— `span.fb` is **397px wide, +208px past the stage's right edge**, text
`"bounded finite dataset → batch: all at once, hig…"` — clipped and unreadable.
Also: multi-region (+170), saga (+145), storage-engines (+107), probabilistic-structures (+100).

**Fix:** allow wrapping (`white-space:normal`) or make the container an `overflow-x:auto` scroller. Effort: **S**.

---

## P2 — Tools sheet (mockbar): RCA "Root Cause 3" has REGRESSED

`ROOT_CAUSE_ANALYSIS.md` §"Final Fix Applied" documents the fix as an explicit **`display:none` /
`display:flex`** toggle, because `transform:translateY(115%)` alone "visually moves the element
off-screen but it remains in the layout."

**That guard is gone.** `src/styles.css:323-324` now reads:
```css
.sidebar .mockbar{ ...; transform:translateY(115%); transition:transform ...; max-height:82vh; overflow-y:auto }
body.tools-open .sidebar .mockbar{ transform:none }        /* no display toggle anywhere */
```
and `styles.css:148` sets `.mockbar{display:flex}` globally.

**Measured (closed state, 390×844):**
```json
{ "display":"flex", "visibility":"visible", "transform":"matrix(1,0,0,1,0,795.89)",
  "top":960.8, "vh":857, "aria-hidden":null, "inert":false }
```

**Confirmed harm — keyboard focus enters the closed, off-screen sheet.** Tab trail from page load:
```
1. _focus-toggle  2. homeBtn  3. tnprev  4. tntrigger  5. tnnext
6. mockopen  7. inttog  8. toolsfab
9. >>> idxopen — INSIDE THE CLOSED MOCKBAR — top=1025, viewport h=857, offscreen=true
```
**12 buttons** (`idxopen, searchopen, copylink, starbtn, notesopen, printqa, cramopen, sessopen,
mixopen, planopen, scopeopen, themetog`) are keyboard-focusable and exposed to screen readers
while the sheet is closed. Focus lands on nothing visible and the page does not scroll (the sheet
is `position:fixed`). **WCAG 2.4.3 (Focus Order) / 2.4.7 (Focus Visible).**

**Important nuance:** the *visual* half of the original bug has **not** returned — the sheet is not
shown without user action (it is `fixed` + translated 795px down, off-screen). Only the
accessibility half regressed.

**Fix:** restore the `display:none` toggle, or add `inert` + `aria-hidden="true"` when closed
(the modern, correct form — `inert` removes it from the tab order *and* the a11y tree). Effort: **S**.

**Healthy:** when *opened*, the sheet fits the viewport exactly (top=164.9, height=692.1, **0px cut off**).

---

## P2 — The `.seg` tab strip never scrolls the active tab into view

The mobile view switcher is a fixed, horizontally-scrolling strip
(`styles.css:316`, `overflow-x:auto`, `scrollWidth 976 / clientWidth 396`, maxScroll **580px**).
**`scrollLeft` is pinned at 0** — nothing ever scrolls the active tab into view.

Measured via the keyboard tab shortcuts (`q…o`) at 360px:

| key | tab | active tab x | visible? |
|---|---|---|---|
| e | wb | 229..330 | ✓ |
| **r** | **sys** | **336..442** | **✗** |
| **t** | trade | 448..541 | ✗ |
| **y** | model | 547..672 | ✗ |
| **u** | num | 678..764 | ✗ |
| **i** | rf | 770..862 | ✗ |
| **o** | open | **868..964** | ✗ |

(strip's visible right edge = **396px**)

**6 of the 9 views** leave the highlighted tab entirely off-screen — the user loses the
"you are here" indicator. Same on **deep-link** (`#…/open`, `#…/rf` → `activeVisible=false`,
`scrollLeft=0`). Reproduced on keyboard + deep-link paths; the swipe path was **not** verified
(my synthetic touch events did not trigger `touch-swipe.js`).

**Fix:** `activeTabEl.scrollIntoView({inline:'nearest', block:'nearest'})` on view change. Effort: **S**.
**Evidence:** `shots/rt-mobile/seg-active-tab-offscreen-360.png`.

---

## P2 — 30 controls below the 44×44 tap-target floor (WCAG 2.5.5)

The 2026-07-08 "comfortable tap targets" fix (`styles.css:842-846`) covered only **three**
selectors — `.tn-step`, `.tn-trigger`, `.ix-x`. Everything else was left below the floor.

| measured | control | source | where |
|---|---|---|---|
| **60 × 20** | `#_focus-toggle` "Focus" | `focus-mode.js:32` | all 9 panes — **also below the 24px WCAG 2.5.8 AA floor** (the only one) |
| 67 × 28 | `.wb-rev` "Reveal" | whiteboard | wb |
| 99 × 28 | `.op-rev` "Reveal mine" | opener-altitude | open |
| 151 × 30 | `.piv-jump` | `system-map.js:43` | sys |
| 83 × 35 | `#wnext` "Next →" | walkthrough | walk |
| 150 × 36 | `#msel > button` | model-answers | model |
| 364 × **36.7** | **all 13 `.crambtn`** (tools sheet) | styles.css | every pane |
| 364 × 31.4 | `#themetog` | styles.css | tools sheet |
| 109 × 39 | `.seg button` (view tabs) | `styles.css:317` | every pane |
| 116 × 40 | **16 `num` inputs** (`#n_obj`, `#rate`, …) | num | num |
| 242 × 40 | `summary` "Go deeper" | walk/wb | walk, wb |
| 288 × 42.5 | `.mcomp-sum` (Companion) | styles.css:471 | all 9 panes |
| 356 × 43 | `#inttog` | styles.css | all 9 panes |
| 67 × 40 | `#toolsfab` "Tools" | styles.css:309 | all 9 panes |

Full list: `rt-mobile-raw.json`. Effort: **M** (a systemic `min-height:44px` pass on mobile controls).

---

## P2 — 29 text elements below 12px; some are content, not decoration

Most sub-12px text is a deliberate uppercase micro-label device (`.sh-kick`, `.cmp-h`, `.mb-sec`
at 9px) — defensible. But these carry **real content** and are a genuine legibility failure:

| size | element | content |
|---|---|---|
| **9.5px + `text-transform:uppercase`** | `.mbeat-l.l-key/.l-store/.l-note` (model) | **68–74-char full sentences**: "A topic is N append-only partitions; records retained, not deleted on…" — rendered ALL-CAPS in a narrow gutter and **clipped mid-word** ("A TOPIC IS N APPEND-") |
| **9px** | `.dgm-lbl` (whiteboard diagram connector labels) | "S3 ObjectCreated event", "extname → strategies map · O(1)", "persist across two stores" |
| **9px** | `.qk` (drill) | "Probe 1 / 22" — progress state |
| 9px | `.chip` (sys) | "→ Signing (2)" |
| 11px | `#wbcount` | "0 recalled · 0 missed · 2 left" |

`.mbeat-l` is a short-label slot ("FRAME", "HEADLINE") that some topics fill with a whole sentence —
the same *long-text-into-a-short-slot* pattern as the `.piv .chip` bug below.

**Evidence:** `shots/rt-mobile/model-9px-prose-360.png`, `shots/rt-mobile/wb-diagram-9px-labels-360.png`. Effort: **M**.

---

## P2 — `.piv` pivot chip: 1601px of text clipped (NOT mobile-specific)

`src/scripts/app/system-map.js:38,47`
```css
.piv{ ...; overflow:hidden }
.piv .chip{ flex:none; white-space:nowrap; margin-left:auto; ... }   /* cannot shrink, cannot wrap */
```
On `api-design/sys` the chip is **1804.7px wide** inside a **284px** `.piv` → **1601.5px (89%) of the
text is invisible** and unrecoverable (`overflow:hidden`, no scroll). Only ~203px shows.

The chip contains an entire answer *plus* its explanation:
> "→ additive changes with a tolerant reader; version only to break, with a deprecation window **Most changes can be additive (new optional fields, new endpoints) needing no version; a tolerant reader ignores unknowns…**"

**This is a compiler bug, not just CSS.** The source `src/topics-md/api-design.md:311-312` authors
the `->` chip line and the explanation as *separate* lines, but the compiler concatenates both into
`p.chip` (`system-map.js:93`) — and `.pa` (the disclosure body, which should hold the explanation)
renders **empty**.

> **Reproduces on desktop** (+1181.5px cut off at 1440px) — flagging so this is routed to the
> content/compiler owner, not treated as a mobile media-query issue.

**Evidence:** `shots/rt-mobile/sys-piv-chip-clipped-360.png`. Effort: **M**.

---

## HEALTHY — documented regressions that did NOT return

| RCA root cause | status | evidence |
|---|---|---|
| **#1 — mesh-gradient pseudo-elements (146px phantom scroll)** | **NOT regressed** | `.stage` computes `position:relative` (the fix, styles.css:390); `::before`/`::after` compute `position:fixed` — fixed elements cannot expand `scrollHeight`. Max phantom slack below last content across all 180 states = **0.5px**. |
| **#2 — companion panel overflow** | **N/A on mobile / no issue** | the desktop `.companion` is hidden below 1280px; mobile uses the `.mcomp` `<details>`. No overflow measured. |
| **#3 — mockbar visible without user action** | **half-regressed** | *Visually* still correct (not shown without tapping Tools). But the `display:none` guard is gone → keyboard/a11y regression. **See P2 above.** |

**Also healthy:**
- **No fixed-bar occlusion.** `.seg` = **56px** and `.app{padding-top:56px}` — exact. `.mockcta` = **123px** vs `.app{padding-bottom:126px}` — 3px slack; at the true bottom of scroll the active pane clears the bar by **153px** on all 9 panes. Verified at 320/360/390/414.
- **Tools sheet fits** when opened (0px cut off, no internal scroll needed).
- **`[hidden]` guard works** — `#tnmenu` (display:none) contributes 0 to layout, confirming the styles.css:856 boilerplate.
- **0 console errors, 0 page errors** across 180 states.

---

## Reproduce

```bash
cd D:/claude-workspace/deepdive-rehearsal
node _audit/2026-07-11-state-audit/scripts/rt-mobile.mjs        # 180-state deep audit -> rt-mobile-raw.json
node _audit/2026-07-11-state-audit/scripts/bisect-topicnav.mjs  # proves the min-content floor + the fix
node _audit/2026-07-11-state-audit/scripts/blast-radius.mjs     # 46 topics x 5 viewports -> blast-radius.json
node _audit/2026-07-11-state-audit/scripts/clip-sweep.mjs       # 46 topics x 9 panes  -> clip-sweep.json
node _audit/2026-07-11-state-audit/scripts/evidence.mjs         # mockbar tab-trail + screenshots
node _audit/2026-07-11-state-audit/scripts/seg-swipe.mjs        # seg strip auto-scroll
node _audit/2026-07-11-state-audit/scripts/desktop-compare.mjs  # which bugs are mobile-specific
```

## Suggested fix order

1. **`min-width:0` on `.side-id .topic-nav`** (styles.css:825) — one line, kills the P1 overflow on all 46 topics at every width. *Verified.*
2. **`inert` + `aria-hidden` on the closed mockbar** — one line, closes the documented RCA regression.
3. **`scrollIntoView({inline:'nearest'})` on tab change** — restores the "you are here" indicator.
4. **`.fb{white-space:normal}`** + **`.nrow` `grid-template-columns:1fr minmax(0,auto)`** — stops the content clipping (both also fix desktop).
5. Systemic `min-height:44px` tap-target pass; then the sub-12px content text.
