# Lens: Visual Design Quality — Mobile

**Audited:** `dist/index.html` (built artifact) via Playwright, `file://`, Chromium
**Viewports:** 390×844 (primary), plus 430 / 375 / 360 / 320 sweep. Both themes.
**Date:** 2026-07-11
**Shots:** `_audit/2026-07-11-state-audit/shots/visual-mobile/`
**Scripts:** `_audit/2026-07-11-state-audit/scripts/visual-mobile*.mjs`

---

## Verdict in one line

The **content** is designed for mobile — the **chrome is not**. Every pane's body copy is a
well-set 16px/1.5 at ~49 characters per line, dark mode passes contrast everywhere I measured,
and the tools bottom-sheet is the right pattern. But the frame around that content is a desktop
sidebar folded flat: it eats **58.8% of the viewport**, it **overflows the screen on every phone
narrower than 396px**, and its two most-used surfaces (the tools sheet, the mock-run modal) are
**silently crushed or stranded out of thumb reach** by layout bugs, not by design choices.

The good news: four of the seven top findings are **one-line CSS fixes**, and two of them
*restore a design that already exists in the code* but is being destroyed at layout time.

---

## What is genuinely good (do not "fix" these)

| Thing | Evidence |
|---|---|
| **Body typography** | 16px / 24px (1.5), ~49 CPL. Textbook mobile reading measure. |
| **Dark mode contrast** | Every probe passed AA. Lowest measured: `.locator` at **6.09:1**; tools rows 6.4:1; tab labels 14.9:1. Nothing below 4.5. |
| **Dark palette craft** | `pane-walk-390-dark.png` — near-black canvas, lifted cards, lavender accent, code chips reflow cleanly to 2 lines. This is the app's strongest visual asset. |
| **Cram sheet / Trade-offs / System Map on a phone** | `ov-cram-390-light.png`, `pane-trade-390-light.png`, `pane-sys-390-light.png` — these read *well*. Good hierarchy, mono chips wrap, no cramping. |
| **Swipe nav works** | Verified with a real touch context: `#walk → #drill → #walk`. Mid-gesture chevron hint renders. |
| **No horizontal page pan** | `window.scrollTo(200,0)` → `scrollX` stays 0 at every width. |

---

## P0 — The frame overflows the screen on almost every phone

### A flexbox `min-width:auto` bug pins the topic-nav at a fixed 380.6px

`#topicnav` measures **exactly 380.6px wide at 390, 375, 360 and 320px viewports** — it never
shrinks. Its right edge is nailed at x=395.6 regardless of screen width.

| Viewport | Device | `#tnnext` (next topic) | `.mockcta` (bottom bar) | `#toolsfab` (Tools) |
|---|---|---|---|---|
| 430 | iPhone 15 Pro Max | ok | ok | ok |
| **390** | iPhone 14/15/16 | **5.6px cut** | **6px past screen** | ok |
| **375** | iPhone SE / 13 mini | **20.6px cut (47%)** | **21px past** | **9% cut** |
| **360** | Galaxy S / most Android | **35.6px cut (81%)** | **36px past** | **32% cut** |
| **320** | iPhone SE 1st gen | **75.6px cut** | **77px past** | **62px cut** |

At 360px the "next topic" chevron is an **8.4px sliver** (`visibleWidthPx: 8.4` of 44) and the
**Tools** button — the entry point to *every* tool in the app — has **32% of itself off-screen**.
The overflow is **not recoverable by scrolling** (`canPan: false`); it is simply cut off.

**Proof:** `shots/visual-mobile/BUG-topicnav-cut-360.png` (the › button is a sliver),
`shots/visual-mobile/BUG-bottombar-cut-360.png` (reads "Tool" with the s sliced off).

**Root cause:** `src/styles.css:624`
```css
.tn-current{flex:1;...;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
```
`.tn-current` is `flex:1` with `white-space:nowrap` but **no `min-width:0`**. Its automatic
minimum size is therefore the full un-truncated width of "Content Pipeline", which floors
`.tn-trigger` at 230.6px, which floors `#topicnav` at 380.6px, which forces `.side-id` (and
through it the fixed `.mockcta`) to 396px. The `text-overflow:ellipsis` on that line **can never
fire** — which is itself the tell that truncation was intended and is being silently defeated.

**Fix (one line):**
```css
/* styles.css:624 */
.tn-current{flex:1;min-width:0;...}          /* add min-width:0 */
/* belt-and-braces, styles.css:619 */
.topic-nav{...;min-width:0}
```
This collapses the entire 6px→77px overflow chain, un-clips the next-topic button, lets the topic
name ellipsize as designed, and pulls the fixed bottom bar back inside the viewport.

---

## P1 — The tools sheet is being crushed 38% below its own design

The tools drawer rows look tight (36.7px). They are not *designed* tight — they are **squashed**.

`.sidebar .mockbar` (styles.css:323) is `display:flex; flex-direction:column; max-height:82vh;
overflow-y:auto`. Its natural content height is **954px**; the cap is **692px**. Its children have
the default `flex-shrink:1`, so instead of **scrolling** (which `overflow-y:auto` already permits),
flexbox **compresses every child** to force a fit.

Measured, by injecting `flex-shrink:0` and re-measuring:

| Element | As shipped | Its own natural height | Crushed by |
|---|---|---|---|
| `.crambtn` × 11 (every tool row) | **36.7px** | **59.6px** | **−22.9px (−38%)** |
| `.crambtn.cram-tog` (Dark mode) | **31.4px** | **43px** | −11.6px (−27%) |
| `::before` grabber handle | **1.27px** | 4px (`--space-4`) | −68% |

So the sheet's **11 rows are designed at a comfortable 59.6px — above the 44px floor — and ship at
36.7px, below it.** These 99 elements are the single largest cluster in the 216 undersized
interactive targets I counted across the app.

The grabber is likewise specced at 4px and renders as a **1.27px hairline** (`w:36px,
h:1.26562px`) — which is why it's nearly invisible in both themes.

**Fix (one line):**
```css
/* styles.css:323 — inside @media(max-width:919px) */
.sidebar .mockbar > *{flex-shrink:0}
```
The sheet then scrolls (as `overflow-y:auto` already intends), rows return to 59.6px, and the
grabber becomes visible. **Compare `shots/visual-mobile/tools-drawer-390-light.png` (shipped,
crushed) with `shots/visual-mobile/tools-drawer-flexshrink-fixed.png` (one line added).** The
second is a materially better sheet.

**Also:** the grabber *implies* drag-to-dismiss but there is no drag handler — I dragged it
120→640px and `body.tools-open` stayed `true`. It is a **false affordance**. Either wire a drag
dismiss or replace the handle with a real close control (the sheet currently has **no close
button and no heading**).

---

## P1 — Swipe navigation desyncs the tab strip (you lose your place indicator)

Swipe is the app's primary mobile nav gesture and it works. But **the top tab strip does not
follow it.**

After swiping `#trade → #model`: `segScrollLeft: 0`, active tab at `btnLeft: 547` — **157px past
the right edge, entirely invisible.** The strip still shows Walkthrough / Probe Drill / Whiteboard
/ Syste… with **no tab highlighted at all**.

**Proof:** `shots/visual-mobile/after-swipe-tabstrip.png` — the stage header says "Model Answers";
the tab bar highlights nothing.

Same failure via hash/deep-link:

| Arrive at | Active tab clipped by |
|---|---|
| `#sys` | 52.1px |
| `#rf` | **472.3px (fully off-screen)** |
| `#open` | **574px (fully off-screen)** |
| via **click** | 0px — scrolls into view correctly |

**Root cause:** `src/scripts/app/shell.js:277`
```js
for (let i = 0; i < buttons.length; i++)
  buttons[i].addEventListener('click', function () {
    setTimeout(function () { updateFades(); ensureActiveVisible(); }, 30); });
```
`ensureActiveVisible()` **exists and is correct** — it is simply wired to a **tab click only**.
Swipe, keyboard (Q–O), deep link, restored session and topic prev/next all bypass it. (The comment
four lines above at shell.js:248 even notes "a plain nav-click listener used to miss keyboard and
routed navigation" — that lesson was applied to the companion sync and not to the tab strip.)

**Fix (one line):**
```js
window.addEventListener('routechange', function () { updateFades(); ensureActiveVisible(); });
```

---

## P1 — 58.8% of the phone is chrome; the identity is stated three times

At 390×844 on first paint (`#walk`), measured:

```
seg tab strip (fixed)   56.0px
.side-id identity block 161.3px   <- the big one
.stage-head              54.7px
.mcomp companion         44.5px
stage padding            18.0px
------------------------------- content starts at y = 373.5
visible content window  347.5px   (41.2% of the viewport)
.mockcta bottom bar     123.0px   (14.4%, fixed)
```

**Only 347.5px of a 844px screen shows rehearsal content.** Identical at 360px — the header does
not compact at all.

Worse, the space is spent on **repetition**. In the top 373px the user is told:

- "**Content Pipeline**" — as the `<h1>` (18px)
- "**Content Pipeline**" — *again*, inside the "REHEARSING [Content Pipeline] ▾" pill
- "**Walkthrough**" — as the active tab in the strip
- "**Walkthrough**" — *again*, as the `.stage-head` title (21px)

Plus a `FOCUS` chip, a `ARCHITECTURE & APIS · INGESTION LAYER` locator pill, and a collapsed
"COMPANION — coaching for this view" accordion. **See `shots/visual-mobile/pane-walk-390-light.png`.**

**Proposed:**
1. **Delete the `.side-id` `<h1>`** on mobile (`@media(max-width:919px){.side-id .hdr{display:none}}`).
   The topic name is already in the topic-nav pill, which is *also* the control that changes it. Saves ~40px.
2. **Merge the locator into the topic pill** as a second line (`Architecture & APIs · ingestion layer`),
   or drop it on mobile — it is 11px mono and duplicates what the home already grouped. Saves ~45px.
3. **Drop `.stage-head`'s title on mobile** (keep the `sh-kick` eyebrow, e.g. `MECHANICS`) — the
   active tab already names the view. Saves ~40px.
4. Collapse `.side-id` from 161px → **~72px** (one row: home ‹ [topic pill] ›). Combined with (3),
   content starts at ~y=210 instead of 373 — **+163px, a 47% larger content window.**

---

## P1 — Mock Run (the flagship) is a desktop modal stranded at the top of the phone

The app's headline CTA ("Mock run — the full round, on the clock") opens a **centered desktop
modal** on a phone. Measured at 390×844:

- `#mockov` has `align-items: flex-start` → panel pinned to the **top**: `y=36, height=338, bottom=374`.
- **470px (56%) of the screen below it is dead blurred space.**
- The two buttons you press on **every single beat** — `Reveal model` (115×**34**px) and
  `Next beat →` (104×**32**px) — sit at **y≈285**, i.e. **525px from the bottom of the screen**:
  the least thumb-reachable zone on the device, while 56% of the screen sits empty beneath them.
- Close `×` is **32×32**.
- It renders **`Space reveal · → or Enter next · Esc close`** (`.mb-keys`, 11px) on a touch device.
  The codebase already has the right utility for this — `.kbd-only` is `display:none` under 919px —
  it just isn't applied here.

**Proof:** `shots/visual-mobile/ov-mock-run-390-light.png`.

**Proposed (mobile only, `@media(max-width:919px)`):**
- `.mock-ov{align-items:stretch}` and `.mock-panel{height:100dvh;max-height:none;border-radius:0}` —
  make it a **full-screen sheet**, the standard for a focused timed task.
- Pin the action row to the **bottom** (`position:sticky;bottom:0`, padding-bottom
  `env(safe-area-inset-bottom)`), make `Next beat` a **full-width 48px primary** button and
  `Reveal model` a full-width 48px secondary above it.
- Sticky header holds the timer + beat counter.
- Add `.kbd-only` to the `.mb-keys` hint line.

---

## P1 — The scroll-to-top FAB lands on top of the bottom bar

`.scrolltop` is `position:fixed; left:50%; bottom:var(--space-24)` — geometry written for a page
with no bottom bar. On mobile there *is* one (123px tall).

Measured with the FAB shown: FAB at **x=173, y=776, 44×44**, z-index **150**. `.inttog`
("Interviewer cuts in mid-answer") at **x=15, y=789, 360×43**, z-index **40**.
`overlapsBottomBar: true`, `overlapsInterviewerToggle: true`,
`elementFromPoint(FAB center) → button.scrolltop`.

The FAB sits **directly on top of the toggle**, obscuring its label — the text reads
"Interviewer cuts in m…swer — off".

**Proof:** `shots/visual-mobile/scrolltop-collision-390.png`.

**Fix:** `@media(max-width:919px){.scrolltop{bottom:calc(123px + var(--space-16) + env(safe-area-inset-bottom,0px)); left:auto; right:var(--space-16); transform:none}}`
— park it above the bar and to the right (out of the primary CTA's column), or suppress it on
mobile entirely since the tab strip is already fixed at the top.

---

## P1 — The companion accordion jumps 500px in a single frame

Tapping "COMPANION — coaching for this view" on `#walk`:

- height **45px → 545px**, and all 6 sampled animation frames read **545** → **`animatedOverFrames: false`**.
  It is an instant, unanimated **+500px** jump.
- After it opens, the pane's actual content starts at **y=874** — **below the 844px viewport**.
  The thing the user was reading is pushed **completely off-screen**.

The CSS declares `transition: all` on the `<details>`, which does nothing — `<details>` height is
not transitionable without `interpolate-size`/grid tricks. So the transition is decorative and the
motion is a hard snap.

**Proposed:** on mobile, make the companion a **bottom sheet** (reusing the existing tools-sheet
pattern) rather than an inline accordion — it is coaching *about* the view, not part of it, and
inlining it structurally guarantees the content gets shoved off-screen. If it must stay inline:
`interpolate-size: allow-keywords` + `transition: height var(--duration-moderate)`, and
`scrollIntoView` the summary after open so the content doesn't vanish.

---

## P2 — The primary controls of three panes are 28–30px tall

Touch-target audit (shadow-DOM pierced) across all 9 panes. Apple HIG floor 44px, Material 48dp.

| Pane | Control | Size | Count |
|---|---|---|---|
| **Whiteboard** | `.wb-rev` / `.wb-got` / `.wb-miss` ("Reveal / Drew it / Missed") | **67×28px**, 11.5px label | **27** — *the entire interaction surface of the pane* |
| **30-Second** | `.op-rev` ("Reveal mine") | **99×28px** | 5 |
| **System Map** | `.piv-jump` ("Jump to → …") | **125×30px** | 7 |
| Walkthrough | `← Prev` / `Next →` | 83×**35px** | 2 |
| Model Answers | question chips | 177×**36px** | 9 |
| Numbers | `input` | 151×**40px** | 4 |
| Drill | `Reveal answer` | 314×**41px** | 1 |
| Shell | `.tools-fab` | 67×**40px** | 1 |
| Shell | `#_focus-toggle` | **60×20px**, **9px font** | 1 |

`shots/visual-mobile/BUG-wb-28px-buttons.png` — the whiteboard's three grading buttons.

The `#_focus-toggle` deserves its own mention: a **20px-tall, 9px-font** chip that toggles a
whole-UI mode. It is under half the touch floor and barely legible.

**Proposed:** a mobile block that raises the *interaction* controls (not every chip) to 44px:
```css
@media(max-width:919px){
  .wb-rev,.wb-got,.wb-miss,.op-rev,.piv-jump,.dn-step{min-height:44px;padding-block:11px}
  .tools-fab{min-height:44px}
  #_focus-toggle{min-height:44px;padding:12px 14px;font-size:var(--font-size-caption)}
}
```
Note the existing `@media(max-width:600px)` block at styles.css:842 already does exactly this for
`.tn-step`/`.tn-trigger`/`.ix-x` — the pattern is established, it just wasn't extended to the pane
controls (and its 600px breakpoint doesn't match the 919px mobile breakpoint used everywhere else,
so tablets in the 600–919px band get the desktop-density targets).

---

## P2 — The home screen's second row is visibly sliced

The home (`#_index-overlay`, auto-opened on first run) has its "Cross-topic drill" row clipped:
`clientHeight: 28`, `scrollHeight: 43`, `overflow: hidden` → **15px of text hidden**. The
descenders of "Random probes from every topic — the interview shuffle" are **cut in half
horizontally**.

**Proof:** `shots/visual-mobile/BUG-home-cross-clip.png` — unmistakable.

This is the **second interactive element a brand-new user ever sees**. It reads as broken.

**Fix:** `.ix-cross{height:auto;min-height:44px;align-items:center}` and let the row wrap, or drop
the description to a single ellipsized line.

**Bigger design point:** the home is a **modal dialog with a 16px gutter floating over a blurred
app**, and inside it is a *nested* 707px scroll area. On a phone the home should be a **full-screen
page**, not a modal — it is the app's entry point and orientation surface (46 topics, 6 groups),
and it is currently squeezed into 364×709 with a nested scroller. Also: **"Reset all saved
progress"** — an irreversible destructive action — sits 71px from the bottom edge, **inside the
prime thumb zone.**

---

## P2 — Dark mode: the two mobile-only surfaces never got the dark-elevation treatment

`src/styles.css:269` defines a genuinely good dark-elevation recipe and applies it to
`.mock-panel, .cram-panel`:

```
box-shadow: 0 24px 70px rgba(0,0,0,.66),      /* ambient depth */
            0 0 0 1px rgba(255,255,255,.08),  /* hairline light edge-ring */
            0 0 60px -20px rgba(170,157,245,.12); /* accent bloom */
```

The **two surfaces that only exist on mobile** were left out:

| Surface | Dark shadow as shipped | On a `rgb(21,20,26)` page |
|---|---|---|
| `.sidebar .mockbar` (tools sheet) | `rgba(0,0,0,0.2) 0 -12px 32px` | **black on black — invisible** |
| `.sidebar .mockcta` (bottom bar) | `rgba(0,0,0,0.14) 0 -8px 24px` | **invisible** |

Their background is `rgb(33,31,41)` against a `rgb(21,20,26)` page — a 12/255 delta with no
shadow and no light edge. They read as flat bands, not floating surfaces.
`shots/visual-mobile/tools-drawer-390-dark.png` — the sheet barely detaches from the page.

The backdrop compounds it: `.tools-bd` is `rgba(0,0,0,.34)` — dimming an already-near-black page
by 34% does almost nothing.

**Fix:** add `.sidebar .mockbar` and `.sidebar .mockcta` to the `html[data-theme="dark"]` elevation
rule at styles.css:269 (the light edge-ring is what actually does the work on dark), and give the
tools backdrop a `backdrop-filter: blur(2px)` so the separation reads.

---

## P2 — Number inputs will auto-zoom iOS Safari

All 4 inputs in the Numbers pane:
```json
{"type":"number","inputmode":"(none)","value":"10000000","h":40,"w":151,"fs":"15px","iosZoom":true}
```
**`font-size: 15px` < 16px → iOS Safari zooms the entire page in on focus and does not zoom back.**
This is the classic mobile-web defect and it fires on the one pane where you *must* type.

Secondary: no `inputmode="numeric"`, and `10000000` is rendered with no thousands separators —
unreadable at a glance on a phone.

**Fix:** `@media(max-width:919px){ #num input{font-size:16px;min-height:44px} }` and add
`inputmode="numeric"`.

---

## P3 — Chrome typography is desktop density on a phone

Body copy is 16px. The chrome around it is not:

| Element | Size |
|---|---|
| `.sh-kick` (stage eyebrow) | **9px** |
| `.mb-sec` (tools section head) | **9px** |
| `#_focus-toggle` | **9px** |
| `.locator`, `.mcomp-cue` | **11px** |
| `.inttog-lbl` | **11.5px** |
| `.crambtn .mb-t` **and** `.mb-d` | **12px / 12px** — title and description are the *same size*; hierarchy carried only by weight+colour |
| `.mockbtn` (the primary CTA) | **13.5px** |

A 13.5px label on the app's single most important button, and 9px legal-print in three places.
**Proposed:** on mobile, raise `.mockbtn` to 16px/600, tools row title to 15px + description to
13px (restoring a real type step), and the 9px eyebrows to 11px with tracking.

---

## P3 — Permanent animation cost on a device with a battery

Always-on, never-idle:
- `.stage::before` — `position:fixed`, 273×591px radial-gradient, `will-change:transform`, `meshA 20s infinite`
- `.stage::after` — `position:fixed`, 234×506px, `will-change:transform`, `meshB 16s infinite`
- `.stage-head::before` — **`accentGlow 3s infinite`, animating `box-shadow`**
- `.dots i.on` — **`dotActivePulse 2s infinite`, animating `box-shadow`**

The two `box-shadow` animations **cannot be composited** — they repaint on the main thread forever,
on every view, for as long as the app is open. Two `will-change:transform` fixed layers are held in
GPU memory permanently.

**Proposed:** drop the mesh gradients to a static gradient under `(max-width:919px)`, and convert
the two `box-shadow` loops to `opacity` on a pseudo-element (compositable) — or simply disable both
on mobile. Nothing is lost visually at phone scale.

---

## P3 — Smaller things, verified

- **Walkthrough flow-grid clips a word.** `.arc-t` "Observability hooks" paints to x=380.7; its
  parent's right edge is x=375 with `overflow:hidden` → **5.7px sliced**, the final "y" is cut.
  Visible in `shots/visual-mobile/scrolltop-collision-390.png` ("Observabilit").
- **Bottom bar spends half its 123px on a niche setting.** Row 2 is the full-width
  "Interviewer cuts in mid-answer — off" toggle (366×43px) — permanently occupying prime thumb
  real estate for an option that **only matters during a mock run**. Move it *into* the mock-run
  overlay (or Tools) and the bar drops from 123px → ~71px, returning **52px (6% of the screen)** to
  content on every view.
- **Model Answers chip grid orphans its 9th item** — a 2-column grid with 9 chips leaves
  "Name the limits" alone in the left column (`pane-model-390-light.png`).
- **The tab strip has no elevation.** It is `background: var(--bg)` — the same flat colour as the
  page — with a 1px border. Content is guillotined at its edge rather than passing under a
  distinct surface. A translucent `backdrop-filter: blur(12px)` would read far better and matches
  what the sidebar already does on desktop (styles.css:357).
- **The tab strip is 976px of content in a 390px window** (2.5 screens). Only 3.5 of 9 tabs are
  ever visible; "Syste[m]" is always clipped mid-word at the right edge. The mask-fade affordance
  is there but reads as a rendering error, not as "scroll me".

---

## Recommended order of work

**Do first — one-line fixes, disproportionate payoff (est. under an hour, all four):**
1. `min-width:0` on `.tn-current` → **fixes the P0 overflow on every phone.**
2. `flex-shrink:0` on `.sidebar .mockbar > *` → **un-crushes the tools sheet, clears 99 of the 216 undersized targets.**
3. `ensureActiveVisible()` on `routechange` in shell.js → **fixes the swipe/deep-link tab desync.**
4. Reposition `.scrolltop` above the bottom bar → **clears the FAB collision.**

**Then — the real mobile redesign (the operator's actual ask):**
5. Compact the header: kill the duplicate `<h1>` and duplicate view title → **+163px of content window (+47%).**
6. Mock Run as a full-screen sheet with bottom-pinned actions → the flagship feature becomes usable one-handed.
7. Companion as a bottom sheet, not an inline 500px accordion.
8. 44px floor on the whiteboard / opener / system-map controls.
9. Home as a full-screen page, not a modal-over-blur (and unclip the cross-topic row; move "Reset all progress" out of the thumb zone).

**Then — polish:**
10. Dark elevation on `.mockbar` / `.mockcta`; 16px inputs; mobile type scale; kill the perpetual box-shadow animations.
