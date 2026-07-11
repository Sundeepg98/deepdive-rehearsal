# Visual Design Quality — Desktop (1440×900)

**Lens:** senior product-design critique of the built app.
**Method:** Playwright @ 1440×900, both themes. 9 panes + home + 8 overlays screenshot in light and dark
(40 shots), then a systemic scan across 9 topics × 9 panes, plus computed-style / geometry / composited-pixel
measurement. All shots: `_audit/2026-07-11-state-audit/shots/visual-desktop/`.

**Verdict in one line:** the *design language* is genuinely good — warm-paper palette, a real dark theme,
a coherent card system, and one or two beautiful surfaces (the keyboard panel, the Numbers spec-sheet).
But the **execution has four systemic defects that a user hits within 60 seconds**, and the desktop
composition is inverted: the left rail shouts, the stage is 30–40 % empty, and the right rail overflows.
Fix the P0 layer *before* any aesthetic pass — no amount of polish survives a cram sheet that shows the
wrong topic.

Contrast, notably, is **clean**: all 19 measured text roles pass WCAG AA in **both** themes (5.27–15.22:1).
No contrast findings.

---

## P0 — Broken. These destroy perceived craft.

### 1. The Cram sheet and the Scope overlay serve the WRONG TOPIC on all 46 topics
The cram/scope bodies are the **build-time default topic (Content Pipeline)** baked into
`src/overlays/cram.html` / `src/overlays/scope.html`, and are never re-rendered on topic switch.
The cram *title* updates correctly, which makes it worse — it looks authoritative.

Measured (`scripts/verify-stale2.mjs`, `scripts/scope-diff.mjs`, shadow-pierced):

| topic selected | cram title | cram body (first 90 chars) |
|---|---|---|
| Event-Driven Backbone | "Cram sheet · Event-Driven Backbone" | "Event-driven ingestion: S3 → Lambda → route by type → streaming handler (hash + store + record)…" |
| Change Data Capture | "Cram sheet · Change Data Capture" | *identical* |
| Consistency Models | "Cram sheet · Consistency Models" | *identical* |

Scope overlay body is **byte-identical, 2688 chars**, across Event-Driven Backbone / Consistency Models /
Leader Election — and its content is Content-Pipeline-specific ("File types & formats?", "Size — KB configs
or GB media?", "Can we ever drop an *upload*?", "transcode off the hot path", "never inside the *Lambda*").

Shots: `light-ov-cram.png`, `light-ov-scope.png` (both taken while **Event-Driven Backbone** was selected).
→ 45 of 46 topics get another topic's study aid.

### 2. Literal `undefined` rendered to the user — in the drill AND in the flagship Mock Run
- **Probe Drill**, `.tiernote`: `innerHTML === "undefined"` — italic grey, directly under the FOCUS BY LEVEL
  control, at (348, 254), 414px wide. Present on **7 of 9 sampled topics**.
  Root cause: `src/scripts/app/drill/logic.js:180` → `this._tiernote.innerHTML = d.tierNotes.all;`
  (`d.tierNotes.all` is undefined for most topics). Shot: `detail-drill-undefined.png`.
- **Mock Run** overlay, `.mb-task`: literal `undefined` under the beat title. This is behind the app's
  single biggest CTA. Shot: `light-ov-mock-run.png`.

### 3. System Map — the pivot rows are a layout collapse (7 of 9 topics)
`sysRenderPivot()` (`src/scripts/app/system-map.js:93,97`) puts the pivot **answer** into the `.chip` span,
and `.chip` is `white-space:nowrap; flex:none; margin-left:auto`
(`src/scripts/app/system-map.js:47`). Result inside a 702px `<summary>`:

| topic | `.piv` box | content width | clipped |
|---|---|---|---|
| Event-Driven Backbone | 702px | 1504px | **+802px** |
| Stream and Batch Processing | 702px | 2168px | **+1466px** |
| Shared Definition & Overrides | 702px | 1709px | **+1007px** |
| Retries, Timeouts, Deadlines | 702px | 1310px | **+608px** |

Visible symptom: the *question* collapses to a ~50px column ("How do / you / handle / a / message / that /
keeps / failing?" — 7 lines), while the answer runs off the card edge and is sliced mid-word by
`.piv{overflow:hidden}`. Shot: `light-pane-sys.png`.

**Fix:** the answer belongs in `.pa` (already in the markup, currently rendering **empty**, 702×18px).
Give `.chip` a real short label; drop `white-space:nowrap` or `max-width` it.

### 4. The companion rail coaches the WRONG VIEW on 8 of 9 views
`#cmpView` vs the stage title, with a **2500 ms settle** (rules out a race):

```
STALE walk   stage="Walkthrough"     companion="A message from emit to ack"
OK    drill  stage="Probe Drill"     companion="Probe Drill"
STALE wb     stage="Whiteboard"      companion="Probe Drill"
STALE sys    stage="System Map"      companion="Probe Drill"
STALE trade  stage="Trade-offs"      companion="Probe Drill"
STALE model  stage="Model Answers"   companion="Probe Drill"
STALE num    stage="Numbers"         companion="Probe Drill"
STALE rf     stage="Red Flags"       companion="Probe Drill"
STALE open   stage="30-Second"       companion="Probe Drill"
```
It latches on the first correct value and freezes. The entire right third of the desktop layout — 290px,
20 % of the viewport — shows coaching for a view you left. Visible in every `light-pane-*.png` after `drill`.

---

## P1 — Major visual defects

### 5. The "ambient mesh" gradient renders as a hard-edged rectangle on the work surface
`.stage::before` (1008×630, `position:fixed`, top-left) and `.stage::after` (864×540, `position:fixed`,
bottom-right) are **clipped by `.stage{overflow-x:hidden}`** (`src/styles.css:290–292`). The stage spans
x = 296…1150, so both blobs' box edges land *inside* the visible canvas. Their `radial-gradient(ellipse at
70% 80%, … transparent 100%)` only reaches transparent at the *farthest corner*, so the near edges are cut
**mid-gradient** → a crisp straight boundary. `meshA`/`meshB` then `translate/scale` them on 20 s / 16 s
loops, so **the rectangle's edges slowly drift across the page**.

Measured (composited pixels, `scripts/pixel-and-states.mjs`, light theme, y=800):
`stage LEFT #f5f2eb` (warm cream) → `stage RIGHT #e9e5e7` (cool grey) = **1.116:1 step + a hue shift**.

Shot: **`detail-canvas-seam-rf.png`** — the vertical seam and the horizontal seam are both unmistakable.

**Fix:** make the gradient fully transparent at every box edge — `radial-gradient(circle closest-side, …)`
— and/or `border-radius:50%` + `filter:blur(60px)`. Or move the blobs to a `position:fixed` layer *outside*
the clipped `.stage`.

### 6. The tool-row chevron is stranded at the top-left of all 11 rows (CSS collision)
`.crambtn:not(.cram-tog)::after{content:"›"; margin-left:auto}` (`src/styles.css:159`) collides with the
global ripple rule `button::after{content:""; position:absolute; inset:0}` (`src/styles.css:371`).
The class selector wins `content`, but the **ripple's `position:absolute; inset:0` still cascades in** —
so the "›" is torn out of the flex row and pinned to the button's top-left corner, where the 11px radius
clips it.

Shot: **`detail-tools-grid-chevron.png`** — every tools row ("Topic index", "Search", "Copy link", "Star this
topic", "Your notes", "Print Q&A", "One-page cram sheet", "Session progress"…) wears a half-cut "›" at its
top-left. It reads as a rendering artifact.

**Fix:** move the chevron to a `::before` on an inner span, or give the ripple its own element.

### 7. The sidebar does not fit the viewport — brand + topic + primary CTA scroll away
`.sidebar` `scrollHeight = 1493px` vs `clientHeight = 900px` → **593px of overflow** at 1440×900.
Reaching the last nav item ("30-Second") or any tool scrolls the wordmark, the topic title, the topic
switcher **and the Mock-run CTA** out of view. Shot: `light-pane-open.png` (sidebar top is gone).

**Fix:** pin `.side-id` + `.mockcta` as a non-scrolling header, scroll only the nav + tools; or collapse the
11 tool rows into a single "Tools" popover on desktop (as mobile already does).

### 8. The topic switcher shows one character of the topic name
`#tncurrent`: **clientWidth 21px, scrollWidth 146px.** The eyebrow "REHEARSING" eats 76.5px of the 149px
trigger; the topic name gets **14 %** and renders as "E…". Shot: `detail-topicnav-truncated.png`.

**Fix:** `.tn-trigger{flex-direction:column;align-items:flex-start}` — the eyebrow is *already styled* as an
eyebrow (9px, 1px tracking, uppercase); it was clearly meant to sit **above** the name, not beside it.

### 9. Numbers — the value column is clipped and the unit breaks the card border
`.nrow-v` is `white-space:nowrap` in a squeezed `auto` grid track (`src/scripts/app/num/logic.js:32,36`):

| value | box | content | clipped |
|---|---|---|---|
| 250 workers | 58px | 86px | **+28px** |
| 18,000 msgs | 86px | 93px | +7px |
| 5,000 ops/s | 77px | 90px | +13px |

Overflows on **9 of 9** topics. Because `.nrow-v` has no `overflow:hidden`, the text paints **past the card's
22px right padding and over its border** (card border at x=1098; "workers" paints to ≈1103).
Shot: **`detail-num-value-overflow.png`** — "workers" sits on the card edge.

**Fix:** `grid-template-columns: 1fr max-content`; split the unit into its own fixed-width column and add
`font-variant-numeric: tabular-nums` so the digits form a true right-aligned column (they currently only
*look* aligned because the box is overflowing).

### 10. One verb, four buttons — the "reveal / advance" action is styled 4 different ways
This is the single most-pressed control in the product. Measured:

| pane | label | size | **area** | font | fill | radius | shadow |
|---|---|---|---|---|---|---|---|
| drill | "Reveal answer" | 704×41 | **28,864 px²** | 13/700 | white on purple gradient | 11px | yes |
| walk | "Next →" | 83×35 | 2,898 px² | 13/**600** | ink on white | 10px | none |
| open | "Reveal mine" | 99×28 | 2,775 px² | **11.5**/700 | #3A2E86 on pale lavender | **8px** | none |
| wb | "Reveal" | 67×28 | **1,879 px²** | **11.5**/700 | #3A2E86 on pale lavender | **8px** | none |

**The drill's reveal is 15.4× the area of the whiteboard's reveal.** Three fills, three radii, three sizes.

**Fix:** define exactly two button roles — `btn-primary` (drill's treatment) and `btn-secondary` — and use
`btn-primary` for the pane's one advance action, everywhere.

### 11. The composition is inverted: the rail shouts, the stage is empty, the companion overflows
Focal weight, measured:

| element | area | treatment |
|---|---|---|
| sidebar **Mock run** CTA | **17,358 px²** | purple gradient, white 13.5/800, `0 6px 18px` colored shadow |
| sidebar **topic H1** | 6,074 px² | 21/800, **animated gradient text-fill** (`headingShift`, 6 s, infinite) |
| stage **page title** | 19,318 px² | 24/800, **solid ink #2A2823**, no colour, no motion |
| walk's **actual next action** | 2,898 px² | white bg, 1px border, no shadow |

The only *animated, chromatic* text on the page is in the sidebar. The biggest saturated block is a
secondary action in the sidebar. The stage's own title is monochrome. The eye lands left; the task is centre.

And the space is allocated backwards:

| pane | dead canvas below content | companion overflow |
|---|---|---|
| model | **355px** | 668px |
| wb | 314px | 668px |
| rf | 309px | 668px |
| sys | 276px | 668px |
| walk | 166px | 686px |

The stage is **30–40 % empty** on 5 of 9 panes while the 290px companion needs **1568px in a 900px column**
and gets cut mid-sentence at the viewport edge with no scroll affordance (visible in every pane shot:
"…the broker can't tell a crashed consumer" is sliced).

**Fix:** widen the content column and move the companion's *spine* (the part that overflows) into the stage
as a right-hand sidecar on tall panes; or give the companion a sticky, scrollable body with a fade mask.

---

## P2 — Typography & system consistency

### 12. The type scale is not honoured — 7 off-scale sizes, 11 distinct sizes in a 5px band
The DTCG scale defines 10 sizes: **9, 11, 12, 13, 14, 16, 18, 21, 24, 48**. Actually rendered:

| off-scale px | where | count |
|---|---|---|
| **9.5** | `.mbeat-l` (model ×3), `.tierlab` (drill) | 4 |
| **10** | `.badge` (shell), `.num-h` (num ×2) | 3 |
| **10.5** | `.dn-n` (drill ×21), `.opt-n` (trade ×6), `.seg button.seen` (×9) | 36 |
| **11.5** | `.inttog`, `.wb-rev/.wb-got/.wb-miss` (×6), `.op-rev` (×2), `.fb` (×3) | 13 |
| **13.3333** | `.ix-card` (×46), `.tn-item` (×46), `.dn-step` (×21), `.arc-step` (×4), `.cmp-rel` (×3) | 120 |
| **13.5** | `.mockbtn` / `.mb-lbl` / `.mbl-tail`, `summary` (walk) | 4 |
| **17** | `.nrow-v` (num ×5) | 5 |

`13.3333px` is **Chrome's UA default for `<button>`** — i.e. the app's three most-repeated components
(46 index cards, 46 topic-menu items, 21 drill steps) inherit the browser default instead of a token.

Between 9px and 14px the app renders at **9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 13.3333, 13.5, 14** — eleven
sizes across five pixels. Half-pixel steps are invisible to the eye and guarantee drift. The cause is the
`font:` shorthand (`font: var(--font-weight-heavy) 13.5px -apple-system,…`), which bypasses the size tokens
entirely — there are ~30 such shorthands.

**Fix:** ban the `font:` shorthand; collapse 9/9.5/10/10.5 → `nano`(9) + `micro`(11), and
11.5/13.3333/13.5 → `caption`(12) / `small`(13); set an explicit `font-size` on every `button`.

### 13. Line length runs to 119ch in the stage and 37ch in the rail — both ends of wrong
Measured at 1440px (canvas `measureText('0')`):

| element | width | **ch** | size |
|---|---|---|---|
| `.nrow-n` (Numbers row note) | 704px | **118.7ch** | 11px |
| `.sm-intro` (System Map intro) | 704px | **108.8ch** | 12px |
| `.opt-w` (Trade-offs "pick when") | 684px | **97.6ch** | 13px |
| `.cmp-thesis` (companion) | 237px | **36.6ch** | 12px |
| `.cmp-drive` (companion) | 237px | **36.6ch** | 12px |

Comfortable prose is 45–75ch. The stage runs **1.3–1.6× over**; the rail runs **under**. The reason is
structural: the stage's content column is 750px wide with *nothing* capping the measure, and the companion
is 290px wide with prose in it.

**Fix:** `max-width: 68ch` on every prose role in the stage (`.nrow-n`, `.sm-intro`, `.opt-w`, `.rf-x`,
`.step-x`); widen the companion to ~330px or drop its prose to short, chunked lines.

### 14. Two overlay design languages
| overlay | width | radius | close btn | title |
|---|---|---|---|---|
| mock run / mixed fire / session / keyboard / scope / game plan | 560 | **18px** | **LEFT** | **UPPERCASE** |
| cram sheet | 600 | 18px | LEFT | UPPERCASE |
| **topic index** | **760** | **16px** | **RIGHT** | **sentence case** |
| **notes** | 660 | 16px | **RIGHT** | **sentence case**, and vertically **centred** (all others top-anchored) |

Pick one. (The left-hand close is also unconventional — 6 overlays break the Western top-right convention
and 2 follow it.)

### 15. `disabled` is `opacity: .32` on the whole button
The walkthrough "← Prev" when disabled: `opacity:.32`, colour still full ink, background still white.
Dimming the *whole* control fades the border, the fill and the label uniformly — it reads as a paint bug,
not a designed state. **Fix:** keep the border at full strength, set the label to `--mut`, drop the shadow,
leave opacity at 1.

### 16. An empty, styled box ships in the Whiteboard
`.wb-foot`: **704×26px**, `border-left: 3px solid #534AB7`, lavender gradient fill, **no content**.
Renders as a stray empty pill under the prompts. Shot: `detail-wb-empty-footer.png`.

### 17. The group-colour identity system is invisible, and it's stock Tailwind
The 6 group colours are `#0D9488 #2563EB #D97706 #7C3AED #DB2777 #DC2626` — **unmodified Tailwind 600s**.
They sit beside a hand-picked accent (`#534AB7`) and warm paper neutrals (`#FAF9F5`/`#F4F1EA`), and they're
far more saturated and cooler than that palette — they don't belong to it.

Worse, they're used only as a **7–9px dot** in the index and the locator chip. Measured: the stage kicker is
`rgb(83,74,183)` and the companion eyebrow is `rgb(83,74,183)` — the *generic* accent, not the group colour.
**Every topic in all 6 groups looks 100 % identical once you're inside it.**

**This is the single biggest distinctiveness opportunity.** Bind the group colour to a `--topic-accent`
custom property on `<html>` at topic-switch, and thread it through: the `.stage-head::before` rule, the
`.sh-kick` kicker, the `.cmp-eyebrow`, the `.cmp-spine` beads, and a 2px top-accent on the pane's first card.
Six groups → six *rooms*. Re-mix the six hues toward the paper palette first (drop chroma ~25 %, warm the
blues) so they read as one family.

---

## P3 — Polish

### 18. The home is a 760px modal in a 1440px viewport
The topic index — the app's *home* — uses 47 % of the width (760px, top 72px, 756px tall) and shows 3
columns of a 46-item grid over a blurred, half-visible topic. Widening to ~1150px gives 5 columns and
roughly halves the scrolling. Shot: `light-00-home.png`.

### 19. The topic name appears three times on one screen
Sidebar H1 (21px, animated gradient) + companion `.cmp-topic` (24px, display face) + the topic-switcher
trigger. Pick one — the companion's is the best-designed of the three.

### 20. A destructive action is styled exactly like a benign one
Session overlay: "Save this session as a PDF →" and "Clear this session & start fresh" are both full-width
outline buttons of the same weight. Shot: `dark-ov-session.png`.

---

## What is genuinely good (keep, and copy)

- **The keyboard panel** (`light-ov-keyboard.png`) is the best surface in the app: a clean 3-column key grid,
  consistent `kbd` chips, accent-eyebrow sectioning, real whitespace. **This is the design language the rest
  of the app should adopt.**
- **The Numbers "what falls out" spec-sheet** — label + explanation left, big mono value right — is a
  genuinely distinctive component (once the clipping in #9 is fixed).
- **Trade-offs** is the best-composed pane: "A vs B" head, two option blocks, a teal ★ verdict.
- **Dark mode is designed, not inverted** — separate surface, border, accent and semantic ramps
  (`--card #211F29`, `--acc #AA9DF5`, `--teal #4FCDAB`), with real elevation shadows and an accent glow.
- **Contrast is clean**: 19/19 text roles pass AA in both themes (5.27–15.22:1).
- The warm-paper light palette (`#FAF9F5` / `#F4F1EA` / `#534AB7`) is a real, considered choice — it is *not*
  a bootstrap default.

---

## Suggested order of work

1. **P0 (1–4)** — cram/scope topic binding, the two `undefined`s, the sys-map chip, the companion sync.
   Nothing below matters until these land.
2. **#5 (blob seam), #6 (chevron), #9 (num clip), #16 (empty box)** — four small CSS fixes that remove every
   "this looks broken" cue from the canvas.
3. **#7, #8, #11** — the desktop shell: make the rail fit, stack the topic switcher, rebalance stage↔rail.
4. **#10, #12, #13, #14, #15** — the system pass: two button roles, kill the `font:` shorthand, cap the
   measure at 68ch, unify the overlays.
5. **#17** — the group-colour identity. This is the change that will make it feel *crafted* rather than
   *competent*.
