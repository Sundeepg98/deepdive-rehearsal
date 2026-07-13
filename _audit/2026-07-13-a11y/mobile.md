# Mobile accessibility audit — deepdive-rehearsal

**Target:** `dist/index.html` @ `4318509` (byte-identical to `deepdive_content_pipeline_rehearsal.html`, sha256 `91580e33…`)
**Viewports:** 390×844 and 360×640, `hasTouch`, `isMobile`, DPR 3; plus a 320→430 sweep and both landscapes.
**Tooling:** Playwright 1.61.1 / Chromium, axe-core 4.12.1, Chrome AX tree via CDP.
**Scripts:** `_audit/2026-07-13-a11y/scripts/` · **Data:** `…/data/*.json` · **Screenshots:** `…/shots/mobile/` (135)

---

## 0. Instrument validation — every check, proven able to fail

This app has shipped five checks that could not fail. The rule for this audit was that no
number gets quoted until I have watched its instrument go red. Twelve controls, run every time:

| # | Instrument | Negative control | Result |
|---|---|---|---|
| 1 | **Painted pixels** (ink) | force `body{opacity:0}` | ink **1,934,662 → 0**, while a node counter still reports **666 "visible" nodes**. Reproduces the exact trap. ✅ |
| 2 | **Tap target — can go RED** | shrink `#idxopen` | `358×44` PASS → `358×18` **FAIL** ✅ |
| 3 | **Tap target — can go GREEN** | shrink `#toolsfab` to 20×16, add `::before{inset:-16px}` | border box stays `20×16`, **tap area 50×46 → PASS**. We measure fingers, not border boxes. ✅ |
| 4 | **Fixed-chrome occlusion** | inflate the bottom bar to 300px | trapped controls **0 → 3** ✅ |
| 5 | ~~**Reflow via `scrollWidth`**~~ | inject a 900px-wide div at 320px | **still reported "no overflow". DEAD.** ❌ **Discarded — see below.** |
| 6 | **Reflow via clipping** (replacement) | same 900px div | caught: **610px cut on `.stage`** ✅ |
| 7 | **Text-zoom loss** | clamp `.mcomp` to `height:10px` | flagged ✅ |
| 8 | **Control overlap** | park a 300×300 FAB over the UI | overlaps **1 → 10** ✅ |
| 9 | **Touch `tap()` is real** | bury the drill under a transparent full-screen cover | tap **delivered → BLOCKED**. Passing taps are real evidence, not forced clicks. ✅ |
| 10 | **Focus-obscured** | inflate bar to 400px | fully-buried stops **2 → 5** ✅ |
| 11 | **axe is live** | inject unlabelled `<button>` + `<img>` with no alt | both raised ✅ |
| 12 | **axe sees shadow DOM** | plant an unlabelled button inside a **visible** shadow root | caught as `["deep-drill","#__nc_shadow_nolabel"]` ✅ |

### The check that could not fail (and would have become the sixth)

My first reflow detector asked `documentElement.scrollWidth > innerWidth`. It reported **CLEAN at
every width from 320 to 430**. The negative control killed it: I injected a **900px-wide div into a
320px viewport** and it *still* said "no overflow".

The cause is `styles.css:422` — **`.stage{overflow-x:hidden}`**. The content column *clips*
horizontal overflow, so the document never widens and `scrollWidth` can never grow. Without the
negative control I would have shipped **"REFLOW: CLEAN 320–430px"** as a finding. It was decoration.

This matters beyond my script: **`overflow-x:hidden` does not satisfy WCAG 1.4.10 — it hides it.**
1.4.10 has two halves, "no horizontal scrolling" *and* "without loss of content". `hidden` buys the
first by violating the second. The replacement detector asks every clipping container
`scrollWidth > clientWidth?` — i.e. *is anything being cut off* — and it finds real losses (M7, M10).

### Two false-positive classes I had to remove before trusting any number

- **`cursor` is an inherited property.** Every `<span>` inside a `<button>` computes `cursor:pointer`,
  so a naive "cursor:pointer ⇒ it's a target" sweep invents a target for every label in every button.
- **Clipped-by-a-scroller.** The nine pane tabs live in a strip whose `scrollWidth` is **976px inside a
  390px phone**. Measuring the sliver still poking into view reported "tap area 18×37" for buttons that
  are genuinely 109×44. Anchoring the hit-test on the element's own **centre** (not any owned pixel)
  fixed it.

### What the ink metric is, honestly

It is a **blank-page detector and nothing more.** `painted` saturates (~87% of viewport) across
different rendered panes — two panes returned byte-identical counts. The split it *does* resolve is the
only one it was built for: **blank = 0 painted / 1 colour** vs **rendered = ~2.5M painted / 10–13k
colours**. I do not use it as a content diff.

---

## 1. Findings

### M1 · CRITICAL · The tools menu destroys itself at 200% text zoom — WCAG 1.4.4 (AA)

**12 of 13 rows lose their text. Three render completely blank. Not one row shows its own name.**

`shots/mobile/04b-390-tools-drawer-200pct.png`

What a user sees instead of the menu: *"topics"*, *"topic or"*, *(blank)*, *"it to"*, *"notes &"*,
*(blank)*, *(blank)*, *"you're"*, *"&"*, *"rehearse"* — random mid-word fragments of the wrapped
descriptions, vertically centred so the actual button names ("Topic index", "Search", "Copy link",
"One-page cram sheet"…) are scrolled out of a 42px window.

| row | box | content needs | cut |
|---|---|---|---|
| One-page cram sheet | 42px | **705px** | **−663px** |
| Search / Star / Session / Mixed fire / Game plan | 42px | 638px | −596px |
| Copy link / Print Q&A / Scope it first | 42px | 571px | −529px |
| Topic index / Your notes | 42px | 503px | −461px |

Text-only zoom is not exotic: it is the Android "Font size" slider and iOS Dynamic Type — *the*
most-used accessibility setting on phones. The app's own text-zoom control is `display:none` below
919px (`styles.css:790`), so a phone user has **no in-app escape hatch**.

**Mechanism — isolated by neutralising each suspect in turn (`data/04c-mechanism.json`):**

| trial | result |
|---|---|
| as shipped | 12/13 clipped, worst −663px |
| `overflow:visible` on buttons alone | **12/13 still clipped** (box is still 42px) |
| `height:auto` on rows alone | **12/13 still clipped** |
| **`flex-shrink:0` on the rows** | **0/13 clipped** ✅ |

`.mockbar` is a **column flex container with `max-height:82vh`** (`styles.css:473`). Its rows are flex
items carrying the CSS default **`flex-shrink:1`**, so when content exceeds the max-height the browser
**crushes every row** instead of letting the container scroll. They bottom out at
**`min-height:44px`** — *the tap-target fix itself* (`styles.css:1136`) — and
**`button{position:relative;overflow:hidden}`** (`styles.css:527`, added to clip the ripple effect)
then hides the wreckage. Two well-intentioned fixes combine into a content shredder.

**Fix (verified): `.mockbar .crambtn{flex-shrink:0}`** → 0/13 clipped.

Also at 200%: the fixed **"Mock run" CTA sits on top of 5 tool rows** (251×44px overlaps with
`#cramopen`, `#sessopen`, `#mixopen`, `#planopen`, `#scopeopen`) — tapping those rows hits Mock run.

---

### M2 · SERIOUS · 12 phantom controls in the closed tools sheet — WCAG 4.1.2 / 2.4.3

`.sidebar .mockbar` is a `position:fixed` bottom sheet parked at **`transform:translateY(115%)`**
(rect top **948** vs viewport **844** — fully off-screen). It has **no `inert`, no `aria-hidden`,
`visibility:visible`, `display:flex`**.

Confirmed in **Chrome's real accessibility tree** (CDP `Accessibility.getFullAXTree`), not just tab order:

> **12 / 12** controls of the closed, off-screen sheet are **still announced**:
> Topic index · Search · Copy link · Star this topic · Your notes · Print Q&A · One-page cram sheet ·
> Session progress · Mixed fire · Game plan · Scope it first · Dark mode

A TalkBack/VoiceOver user swiping through the page, and any keyboard or switch-control user, traverses
**12 invisible controls** that are announced as available. `data/07b-axtree-axe.json`.

**Fix:** toggle `inert` (and/or `aria-hidden="true"`) on `.mockbar` whenever the sheet is closed.

---

### M3 · SERIOUS · Focus order contradicts visual order — WCAG 1.3.2 / 2.4.3

The nine pane tabs — the app's **primary navigation**, rendered at **y=8, the very top of the screen** —
are **focus stops #20–28 of 40**, reached only *after* the 12 phantom controls above.

```
stop  1–5   focus-toggle, home, prev, topic, next        (y=95…187)
stop  6–7   Mock run, Tools                              (y=785…787)
stop  8–19  ← 12 PHANTOM controls, off-screen            (y=1010…1583)
stop 20–28  ← the nine pane tabs, which render at y=8
```

Cause: the mobile sidebar reorders visually with CSS `order:` (`.tools-fab{order:0}`, `.seg{order:1}`,
`.mockbar{order:2}`). **`order` changes paint order, never DOM or tab order.**

---

### M4 · WCAG 2.5.8 (AA) FAIL · Search input is 245×**19**px, and it zooms iOS on focus

`#_search-overlay input` — `shots/mobile/dbg-search-overlay.png`

- **height 19px** — below even the **24px AA minimum** (`height:19px`, `padding:0`, `border:0`).
  This is one of only **2 hard AA target-size failures** in the whole app; both are this input.
- **`font-size:14px`.** Any input under **16px** makes **iOS Safari auto-zoom the page on focus** and
  it does not zoom back — the classic mobile search trap.

---

### M5 · The 44px rule sets `min-height` only — no `min-width`. Seven close buttons fail on **width**.

| control | size |
|---|---|
| `#cramx` · `#sessx` · `#mockx` · `#mixx` · `#planx` · `#scopex` | **32 × 44** |
| `.nt-x` ("Close notes") | **30 × 44** |

Both the light-DOM rule (`styles.css:1136`) and the shadow-DOM `BASE_SHEET` rule
(`base-styles.js:44`) are identical:

```css
@media (max-width:919px){ button,summary,[role="button"]{min-height:44px} }
```

Height was the only lever pulled. Every icon-only control is a tall, thin sliver.

---

### M6 · The same rule's selector omits `input`, `select`, `a`. Every input misses the floor.

| control | size |
|---|---|
| `.ix-filter` (topic-index filter — light DOM) | **316 × 39.5** |
| `deep-numbers` `#msgRate` `#procMs` `#maxRecv` `#dedupDays` (shadow DOM) | **151 × 40** / **136 × 40** |
| `#_search-overlay input` | **245 × 19** (see M4) |

`button, summary, [role="button"]` was the whole selector — in *both* halves.

> Note: the CSS comment calls 44px "the a11y floor (WCAG 2.5.8)". **2.5.8 (AA) is 24×24.** 44×44 is
> **2.5.5 (AAA)** / platform HIG. The code is aiming at AAA and citing AA.

---

### M7 · Content loss · The topic name is truncated at every mobile width, and vanishes at 200%

`#tncurrent` is `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` in a box that never grows,
while the static **"REHEARSING"** eyebrow takes the space.

- **320px: 46 / 46 topic names truncated. Zero fully visible.**
  Worst: *"Production Debugging and Incident Diagnosis"* — **4% visible (12px of 286px)**.
  The header literally reads **"REHEARSING E."** → `shots/mobile/03c-320-header-topicname.png`
- **390px: 39 / 46 truncated** (reads "Event-Driv…") → `shots/mobile/03c-390-header-topicname.png`
- **At 200% text zoom `#tncurrent` clientWidth = 0** — the only on-screen indicator of *what you are
  studying* disappears completely.

---

### M8 · Screen reader · **One** heading in the entire application

`<h1>Event-Driven Backbone</h1>` — that is all, across the light DOM **and all 17 shadow roots**.
Section titles are `<div class="mb-sec">` ("Find a topic", "This topic", "Study aids", "Settings") and
`<div class="stage-head">`.

Heading navigation is a screen-reader user's primary way of moving through a page. Here it does not
exist. Also: **no `banner` landmark, no skip link**, and the nine pane tabs use `role="group"` rather
than `tablist`/`tab` (so no "tab 3 of 9", no arrow-key navigation).

*Credit:* there **is** a correct `aria-live="polite"` region announcing topic changes
("Messaging & Events: Event-Driven Backbone"), plus `main` and `nav` landmarks.

---

### M9 · Dead affordance · The 10 walkthrough step-dots look tappable and do nothing

`deep-walkthrough #wdots i` — **9×9px** (12×12 when active), `cursor:pointer`, a `:hover` scale
transform… and **no `role`, no `tabindex`, no `aria-label`**. Clicking the last dot **does not change
the step** (`stepChangedOnClick: false`, measured).

Pagination dots are *the* universal mobile idiom. A phone user will tap them. Nothing happens.
(Correctly excluded from the tap-target tally — they are not targets. That is the point.)

---

### M10 · Labels clipped inside controls at 320–360px

- `deep-walkthrough .arc-step` — label cut **33px** @320, 20px @360, 10px @390
- `deep-drill .dn-step .dn-t` — label cut **32px** @320, 18px @360

---

### M11 · AAA only · Focus partially obscured by the fixed bottom bar

`#wnext` ("Next →") is **50% covered** and `summary` ("See the code") **22% covered** when focused.
**WCAG 2.4.11 (AA) passes** — nothing is *entirely* hidden (0 fully-buried stops). Fails 2.4.12 (AAA).
Reported honestly as AAA, not AA.

---

### M12 · Note · Nine tabs in a 976px scroller on a 390px screen

`.seg` has `scrollWidth 976` / `clientWidth 390` — about **3.5 of the 9 core views are visible at once**,
with only a mask-gradient as the hint that more exist. Not a WCAG failure; a discoverability one.

---

## 2. Verified passes — each proven able to fail

These are real, and the instrument that produced them has been watched going red.

- **Reflow / no horizontal scrolling, 320–430px: genuinely clean.** 0px overshoot at 320/340/360/375/390/412/430,
  across the boot, app, and tools-open states. (Verified with the *clipping* detector, after the
  `scrollWidth` one was caught dead.)
- **Tap targets: 365/397 pass 44px; 395/397 pass 24px AA** across 44 surfaces × 2 viewports, shadow DOM
  pierced, hit-tested. **The "22/59 → 59/59" fix is real for buttons** — including inside shadow roots via
  `BASE_SHEET`. The residue is entirely explained by the two gaps in one CSS rule (M5 width, M6 selector).
  The original "59" was a subset: a document-only query sees **157** interactive elements; piercing the 17
  shadow roots finds **263**.
- **The core loop works on a phone.** Pick a topic → open Probe Drill → Reveal answer → push twice → tick a
  must-hit point → grade Solid: **7/7 steps by real touch, at 100% *and* 200% text zoom**, scoreboard
  **0 → 1**. Grade controls measure **98×58** (Missed/Shaky/Solid) and **280×44** (must-hit) — all pass.
- **The scoreboard's red-green fix is real.** Solid is the only **filled** tile: luminance **0.1199**
  against white outline tiles at **1.0** — a **0.88 luminance spread** that survives greyscale entirely.
  Status is genuinely off the hue channel. *(Caveat: I found no `::before`/`::after` glyph on the tiles —
  the fill difference is what carries it.)*
- **Landscape works.** 844×390 and 640×360: renders (ink 2.14M / 1.45M), no horizontal scroll, Tools FAB
  reachable, tools sheet `overflow-y:auto` and scrollable.
- **Reduced motion does not blank the page on a phone.** 390×844 and 360×640, `reducedMotion:'reduce'`:
  **2,584,045** and **1,724,635** painted px — identical to `no-preference`. Negative control run *inside*
  the reduced-motion context: `body{opacity:0}` → **0 painted**, while the node counter still claimed 675
  visible nodes. The old bug is dead and the instrument that missed it now catches it.
- **axe-core: 0 WCAG A/AA violations** at 390×844 — **and I verified this covers the shadow DOM.** A planted
  unlabelled button inside a *visible* shadow root was caught as `["deep-drill","#…"]`.
  *(My first attempt at this control was invalid — I planted the button in `deep-drill` while the walkthrough
  pane was showing, so it was hidden and axe rightly skipped it. That nearly became a published false finding
  "axe is blind to shadow DOM". It isn't.)*

### What axe's clean bill does **not** cover

`target-size` is **`enabled:false` by default** in axe-core 4.12.1, and even when force-run it evaluated
**exactly 1 node** on the page and passed it — while direct measurement found a **245×19px input** (hard AA
failure) and 32 controls under the 44px floor. **"axe is clean" is not evidence about tap targets.** That gap
is the whole reason this audit measured geometry directly.

---

## 3. Limits of this audit

- Emulated Chromium, not real iOS Safari / Android Chrome. The **iOS zoom-on-focus** in M4 is inferred from
  the documented `<16px` rule, not observed on a device.
- Text zoom emulated by scaling every computed `font-size` ×2 (which is what Chrome's text scaling does to
  px sizes). Not the OS setting itself.
- I drove one topic ("Event-Driven Backbone") through all nine panes; M7 was swept across all 46 topics, the
  other pane findings were not.
- **Colour contrast and the group-colour "room" system are not in this lens** — another auditor's.
- My dark-theme scoreboard run is **inconclusive**: the in-app `#themetog` appears to have inverted my
  `colorScheme:dark` context. The light-theme luminance result stands; I make no dark-theme claim.

## 4. Re-running

```bash
node _audit/2026-07-13-a11y/scripts/00-smoke.mjs                  # ink + its negative control
node _audit/2026-07-13-a11y/scripts/01-tap-targets.mjs            # 44 surfaces, shadow-pierced, hit-tested
node _audit/2026-07-13-a11y/scripts/02-scroll-and-fixed-chrome.mjs
node _audit/2026-07-13-a11y/scripts/03b-reflow-clipping.mjs       # the detector that CAN fail
node _audit/2026-07-13-a11y/scripts/03d-worst-topic.mjs           # all 46 topic names
node _audit/2026-07-13-a11y/scripts/04-text-zoom.mjs
node _audit/2026-07-13-a11y/scripts/04c-mechanism.mjs             # isolates the flex-shrink cause
node _audit/2026-07-13-a11y/scripts/05-drill-task.mjs             # real touch, end to end
node _audit/2026-07-13-a11y/scripts/06-grade-controls-scoreboard.mjs
node _audit/2026-07-13-a11y/scripts/07b-axtree-axe.mjs
node _audit/2026-07-13-a11y/scripts/07d-axe-shadow-retest.mjs     # the valid control
node _audit/2026-07-13-a11y/scripts/08-reduced-motion-mobile.mjs
```

Every script prints its own negative control and fails loudly if the instrument is dead.
