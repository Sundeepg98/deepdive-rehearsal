# Adversarial verification — `rt-tools` lens

**Verdict: 6 of 9 findings CONFIRMED, 1 REFUTED outright, 2 confirmed-but-materially-corrected.**
Every runtime claim was independently re-measured in Chromium at 1280x900 and 390x844; every code
claim was opened and read; the byte-offset claim was re-run against `dist/index.html`.

The two P1s are **real and reproduce exactly** — I hit the same numbers the original lens did, including
the 45 `var(--)` refs and the `tappableCount: 0 / 1`. The lens's core architectural thesis (two divergent
modal plumbings; every defect falls on that seam) is **correct and well-evidenced**.

Where it went wrong, it went wrong in ways that would have **sent the operator to the wrong file**:

| # | Finding | Verdict |
|---|---------|---------|
| 1 | Focus mode is an inescapable trap | **CONFIRMED** (P1, exact) |
| 2 | Print Q&A CSS tokens undefined | **CONFIRMED** (P1, exact) |
| 3 | 4 overlays never scroll-lock; index chain-scrolls page | **CONFIRMED** (P2) — desktop sub-claim refuted |
| 4 | Backdrop click closes only 3 of 11 | **CONFIRMED** (P2) |
| 5 | One Escape closes two stacked overlays | **CONFIRMED, REPRO WRONG** (P3, downgraded) |
| 6 | Topic-nav **dropdown** overflows -> page h-overflow | **REFUTED** (wrong cause, wrong effect, wrong fix) |
| 7 | Text size / Focus timer hidden < 920px | **CONFIRMED** (P3) — pomodoro-timer sub-claim refuted |
| 8 | Tools drawer does not close on Escape | **CONFIRMED** (P3) |
| 9 | Dead `btn.id === 'inttog'` condition | **CONFIRMED** (P3) |

Scripts: `scripts/verify-rt-tools.mjs`, `verify-esc-stack.mjs`, `verify-mobile.mjs`,
`verify-topicnav.mjs`, `verify-hoverflow.mjs`, `verify-overflow-src.mjs`
Raw data: `verify-rt-tools.json`, `verify-esc-stack.json`, `verify-mobile.json`, `verify-topicnav.json`, `verify-hoverflow.json`
Shots: `shots/verify-rt-tools/`

---

## A note on my own first measurement (why polling matters)

My first pass reported `escapeCloses: false` for **all 7 static overlays** — which would have been a
dramatic "ESC is broken" finding contradicting the lens. **It was my bug, not the app's.**
`ovHide()` (`src/scripts/app/mock-run/logic.js:26`) carries a `setTimeout(finishHide, 500)` fallback,
and I was sampling at 450ms. Re-measured with polling: **ESC closes all 7, in 361–642ms.** The lens's
"ESC closes all 11" is **correct**. Recording this because it is exactly the class of false finding this
pass exists to kill — including my own.

---

## CONFIRMED

### 1. Focus mode is an inescapable trap (P1) — reproduces exactly

Structure re-read: `focus-mode.js:30-38` appends `#_focus-toggle` to `.hdr`; `src/index.html:25` puts
`.hdr` inside `<aside class="sidebar">` (opened line 23, closed line 76). `focus-mode.js:21` injects
`.app._focus-mode .sidebar{opacity:0;visibility:hidden;width:0}`. `visibility:hidden` inherits — so the
exit button hides itself along with `.seg`, `.mockcta`, `#toolsfab`, `#topicnav` (all `.sidebar` children).

Independently measured, both viewports:

| probe | desktop | mobile |
|---|---|---|
| `#_focus-toggle` inside `.sidebar` | `true` (parent `hdr`) | `true` |
| computed `visibility` after activation | `hidden` | `hidden` |
| `elementFromPoint` at its centre | `stage` | `app _focus-mode` |
| tappable elements on entire page | **0** | **1** (`mcomp-sum` accordion) |
| real `page.click('#_focus-toggle')` | **TimeoutError** | **TimeoutError** |
| Escape exits | **false** | **false** |
| `f` key exits | true | true |
| `.seg` / `.mockcta` / `#toolsfab` / `#topicnav` visibility | all `hidden` | all `hidden` |

Screenshot `shots/verify-rt-tools/mobile-focus-AFTER.png` shows the content pane with **literally zero
chrome** — no view tabs, no bottom bar, no Tools button, no topic switcher, no exit affordance.
On a touch device the only recovery is a page reload. **P1 stands.**

### 2. Print Q&A renders with every CSS token undefined (P1) — reproduces exactly

`print-qa.js:49` opens `window.open('', '_blank')` — a blank document — and writes a self-contained page
whose `<style>` (`print-qa.js:8-27`) is authored entirely in design tokens (`var(--space-40)`,
`var(--font-size-display)`, `var(--space-760)`…). That document never loads `tokens.generated.css`, so
every declaration containing a token is invalid at computed-value time and is dropped.

Measured **inside the real popup**:

- `stylesheetVarRefs: 45` (identical to the lens's count)
- `--space-40`, `--space-760`, `--font-size-display`, `--font-weight-heavy` → all `(UNDEFINED)`
- `body` padding `0px` (intended `40px 32px 60px`); `max-width: none` → full **1280px** bleed (intended 760px centred)
- `h1`: **14px / weight 400** — `h1EqualsBody: true`, i.e. byte-identical to body text
- `h2`, `.a`, `.sig` all `14px`; `.fu` margin/padding-left `0px`; `.sr` padding `0px`; `article` margin-bottom `0px`
- content itself is correct: title `Content Pipeline — Q&A`, **22** articles

`shots/verify-rt-tools/desktop-printqa-popup.png` confirms visually: the H1 is indistinguishable from body
copy, text runs flush to x=0 edge-to-edge, and all 22 probes run together with no separation.
A pure, total styling failure. **Confirmed.**

*Severity nuance:* this is a self-contained export, not a core flow — content is fully correct and legible.
An operator could defensibly schedule it P2. It is a genuine break either way, and the fix is trivial
(inline literal px/weights, or prepend the resolved `:root` token block to the popup's `<style>`).

### 3. Four overlays never scroll-lock; the home screen chain-scrolls the page (P2)

Code, verified by grep across `src/scripts/`: `document.body.style.overflow` is set by
`cram-sheet.js` (cram/plan/scope/keys), `mixed-fire.js:68`, `mock-run/logic.js:44`,
`session-progress.js:11` — **the 7 static overlays only**. `index-overlay.js`, `search-overlay.js`,
`notes-overlay.js`, `cross-drill.js` never touch it. `overscroll-behavior` appears **0 times** in the
entire 5.1 MB `dist/index.html`. All confirmed.

Runtime, **mobile 390x844** (the repro in the finding):

```
bodyOverflowStyle: ""            <- no scroll lock, confirmed
.ix-scroll overscrollBehaviorY: "auto"
pageScrollableBehindPx: 562
bodyScrollBefore: 0 -> bodyScrollAfterWheel: 562
pxLeaked: 562   CHAINS_TO_PAGE_BEHIND: true
```

**Confirmed** — the lens measured 575px, I measured 562px (the page behind can scroll 562px and it leaked
*all* of it). Trivial delta from viewport-chrome differences; same defect. Open the Topic index (which IS
the home screen), scroll the 46-topic list to its end, keep scrolling → the page behind scrolls to its
bottom. Close the overlay and the app is scrolled down.

**Sub-claim REFUTED:** the lens's *desktop* numbers ("157px desktop"). Measured desktop `pxLeaked: 0`,
`CHAINS_TO_PAGE_BEHIND: false` — and desktop only has **70px** of scrollable page height, so a 157px leak
is arithmetically impossible there. **This is a mobile-only defect.** The headline stands; the desktop
figure does not.

### 4. Backdrop click dismisses only the dynamic overlays (P2)

Code: `index-overlay.js:330`, `search-overlay.js:121`, `notes-overlay.js:94`, `cross-drill.js:76` each
register `if (e.target === el) close()`. The 7 static overlays have **no** click-out handler anywhere —
confirmed by grepping `e.target ===` across `src/scripts/app/*.js` (exactly 4 hits, all dynamic).

Runtime, both viewports — clicks placed by computing a point provably on the backdrop and asserting
`document.elementFromPoint()` returns the overlay itself (`hitElementIsOverlay: true`) before clicking:

- all 7 static → `backdropCloses: false`
- index overlay → `backdropCloses: true`

**Confirmed.** Nobody is stuck (ESC and the X close everything — re-verified), so this is a consistency
defect, exactly as the lens framed it.

### 5. One Escape closes two stacked overlays (P3) — DEFECT REAL, **REPRO WRONG**

The defect is real. Two document-level Escape handlers are live and **neither calls `stopPropagation()`**:
`overlay-focus.js:21` (dynamic, gated on `isOpen()`) and `shell.js:160-166` (static — finds the open
overlay and clicks its `.mock-x`). With one of each open, both fire on the same keypress:

```
afterCtrlK:      { cramOpen: true,  searchOpen: true  }   CTRLK_STACKS: true
afterONE_Escape: { cramOpen: false, searchOpen: false }   BOTH_CLOSED_BY_ONE_ESC: true
```
Reproduced on **both** viewports. Shots: `desktop-stacked-search-over-cram.png` → `desktop-stacked-after-one-esc.png`.

**But the lens's stated repro is impossible.** It says: *"Open the cram sheet. Press `/` to open Search on
top of it."* `shell.js:82-83` bails the entire global shortcut handler whenever **any**
`[role=dialog][aria-modal="true"]` carries `.open`:

```js
var _openDlgs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
for (var _oi = 0; _oi < _openDlgs.length; _oi++) { if (_openDlgs[_oi].classList.contains('open')) return; }
```

So `/` does **nothing** while the cram sheet is open. Measured, both viewports:
`afterSlash: { cramOpen: true, searchOpen: false }` → `SLASH_STACKS: false`.

The **only** way to stack is **Ctrl/Cmd+K** — `search-overlay.js:370` registers its own listener that is
*not* behind that guard. An operator following the written repro would fail to reproduce a real bug and
might discard it.

**Downgraded P2 → P3:** stacking requires Ctrl+K and escaping requires Escape — both need a physical
keyboard. This cannot happen on a phone; it is a desktop/keyboard-only annoyance where two overlays close
instead of one. No data loss, nothing stuck.

### 7. No text-size control on mobile (P3) — core CONFIRMED, sub-claim REFUTED

`styles.css:607` — `@media(max-width:919px){.textzoom,.pomodoro{display:none}}` — exact line, exact rule.
Measured at plain 390x844: `#textzoom` display `none`, `offsetParent` null, **0 reachable buttons**;
`#pomodoro` display `none`. The tools drawer screenshot (`mobile-drawer-open.png`) confirms no A-/A+ control
anywhere. **Confirmed:** the only path to larger text on a phone is browser pinch-zoom.

**Sub-claim REFUTED:** *"pomodoro.js still runs build() and its timer at 390px … verified: 25:00 -> 24:58
counting on the mobile viewport."* The timer **does not run**. `setInterval` is called in exactly one place —
`toggle()` (`pomodoro.js:74-81`), bound to the play button — and that button is `display:none` on mobile.
Measured on mobile with nothing driving it: `t0: "25:00"` → after 3.5s: `"25:00"` → `TIMER_RUNS_UNPROMPTED: false`.
Only `build()` runs (a handful of hidden DOM nodes — negligible). There is no wasted timer to remove; the
"dead weight" half of this finding is wrong.

### 8. Tools drawer does not close on Escape (P3)

Measured at 390x844: `{ opened: true, stillOpenAfterEsc: true, closedByEsc: false }`. The sheet is not a
`[role=dialog][aria-modal]`, so neither of the app's two Escape handlers covers it, while every other
dismissible surface does. Scrim-tap and tool-selection both dismiss correctly. **Confirmed.**

### 9. Dead `btn.id === 'inttog'` condition (P3)

`shell.js:208` guards `if (btn.id === 'inttog' || btn.id === 'themetog') return;` inside a listener attached
to `.mockbar` — but `#inttog` lives in `.mockcta`, a **sibling**. Re-run against the shipped artifact:

```
mockcta @151669  <  #inttog @151916  <  .mockbar @152244  <  #themetog @154949
```
Byte offsets **identical** to the lens's. Runtime: `.mockbar.contains(#inttog) === false`,
`.mockbar.contains(#themetog) === true`. The `inttog` branch is unreachable; the `themetog` half is live and
correct. Harmless, but it encodes a false belief about the DOM. **Confirmed.**

---

## REFUTED

### 6. "Topic-nav **dropdown** overflows the viewport, giving the page horizontal overflow" — REFUTED

Three separate errors, and the recommended fix would not fix the bug.

**(a) The dropdown is not the cause.** Measured at plain 390x844 **with the menu still `hidden`**:

```
tnmenuHidden: true
innerWidth: 390     docScrollWidth: 396     hOverflowBefore: TRUE
```

The 6px document overflow **pre-exists the dropdown entirely**. The menu is `position:absolute; left:0;
right:0` inside `#topicnav`, so it simply inherits `#topicnav`'s width (380.6px) — its right edge landing at
396 is a *consequence* of the existing overflow, not the source.

**(b) The page cannot pan sideways.** The finding says *"the whole page can pan sideways while the menu is
open."* Measured `canPan: false` both before and after opening the menu (`window.scrollTo(9999,0)` leaves
`scrollX` at 0). The overhang is clipped at the viewport edge, not scrollable-to.

**(c) The true source, isolated** (elements overflowing the viewport that are **not** inside a scroll
container, menu hidden):

```json
[{ "tag":"nav",    "id":"topicnav", "right":395.6, "width":380.6, "overflowPx":5.6 },
 { "tag":"button", "id":"tnnext",   "right":395.6, "width":44,    "overflowPx":5.6 }]
```

It is `#topicnav` itself — and the rightmost element is **`#tnnext`, the "next topic" `>` button**, whose
right edge is cut off at the viewport boundary. See `shots/verify-rt-tools/mobile-topicnav-CLIPPED-menu-hidden.png`
(red = `#topicnav`, magenta = `#tnnext`, green line = the 390px edge) — the `>` button is visibly clipped
**with the dropdown closed**.

The lens's recommendation — *"Constrain the menu in the <920px branch: `max-width: calc(100vw - 30px)`"* —
would restyle the dropdown and leave the 6px document overflow and the clipped `#tnnext` button exactly as
they are. Applying it would produce no measurable change to the reported symptom. Replacement finding below.

### Sub-claims refuted inside otherwise-good findings

- **"157px desktop wheel-leak"** (finding 3) — measured `0px` on desktop; only 70px is even available. Mobile-only defect.
- **"pomodoro … timer at 390px (25:00 -> 24:58)"** (finding 7) — the timer never starts; `TIMER_RUNS_UNPROMPTED: false`.
- **"Press `/` to open Search on top of the cram sheet"** (finding 5) — blocked by `shell.js:82-83`; must be Ctrl/Cmd+K.

---

## MISSED by the original lens

### M1. `#topicnav` overflows the viewport by 5.6px at 390px, clipping the "next topic" button (P3)

The correct version of finding 6. `#topicnav` measures `right: 395.6` in a 390px viewport with the dropdown
closed; `#tnnext` (a 44px primary-navigation tap target) has its right edge sheared off. Fix belongs on
`#topicnav`'s width/padding in the `<920px` branch, not on `#tnmenu`.
Evidence: `verify-overflow-src.mjs`, `shots/verify-rt-tools/mobile-topicnav-CLIPPED-menu-hidden.png`.

### M2. The search overlay is `role=dialog aria-modal=true` but **never gets a `.open` class** (P3, latent)

Every other overlay — the 7 static (via `ovShow`, `mock-run/logic.js:14`) *and* the other 3 dynamic
(`index-overlay.js:398`, `notes-overlay.js:118`, `cross-drill.js:97`) — toggles `.open`. The search overlay
alone is shown by mutating `style.display` (`search-overlay.js:347`) and is tracked only by a private
`isOpen` boolean.

**Consequence:** any code that detects "is a modal open" the idiomatic way —
`document.querySelector('[role=dialog][aria-modal=true].open')`, which is precisely what `shell.js:82-83`
does — **silently misses the search overlay**. This is not hypothetical: `touch-swipe.js:20-22` already
carries *two* special-case workarounds for exactly this element:

```js
if (document.querySelector('[role="dialog"][aria-modal="true"].open')) return true;
if (document.querySelector('.mock-ov.open, .cram-ov.open, #_search-overlay[style*="flex"]')) return true;  // <- workaround
if (window.SearchOverlay && window.SearchOverlay.isOpen && window.SearchOverlay.isOpen()) return true;      // <- workaround
```

A `[style*="flex"]` string-match on an inline style is a load-bearing modal check. This is the root of the
double-Escape bug (finding 5) and the next overlay-aware feature will trip on it too. Making the search
overlay toggle `.open` like every other overlay collapses three checks into one and removes the seam.

### M3. Coverage correction (informational, not a defect)

The lens states it drove *"all 11 modal overlays … on both viewports."* `#keyopen` (Keyboard shortcuts)
carries class `kbd-only`, and `styles.css:441` sets `@media(max-width:919px){.kbd-only{display:none}}` — it
is **not tappable at 390px** (Playwright: *"element is not visible"*; absent from the drawer screenshot).
It can only be opened by the `?` key, which needs a keyboard. This is correct, intentional design — but the
overlay cannot have been driven from the UI on mobile, so that coverage claim is overstated.

---

## Re-confirmed healthy (spot-checks held)

- **Zero console errors, zero page errors** across every interaction on both viewports (`M.errors: []`).
- **ESC closes all 7 static overlays** (361–642ms, polled) and releases the scroll lock every time.
- **Scroll lock is correct on all 7 static overlays** (`body.style.overflow === 'hidden'` while open, `''` after).
- The two coexisting modal architectures, and the claim that every defect falls on that seam, is **accurate**
  and is the most valuable thing in the original report.
