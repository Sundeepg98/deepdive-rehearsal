# Lens: TOOLS & OVERLAYS RUNTIME (Playwright)

**Artifact under test:** `D:/claude-workspace/deepdive-rehearsal/dist/index.html` (5.1 MB, offline `file://`)
**Viewports:** desktop 1280x800, mobile 390x844 (Chromium)
**Date:** 2026-07-11
**Scripts:** `_audit/2026-07-11-state-audit/scripts/rt-tools{,2,3,4,5,6,7}.mjs`
**Screenshots (80):** `_audit/2026-07-11-state-audit/shots/rt-tools/`

---

## 1. Discovered tool surface (ground truth, not guessed)

The DOM was inspected first. **27 tools/overlays** exist — 11 modal overlays and 16 non-modal
controls. Three of them (**Text size**, **Focus timer**, **Focus mode**) are *not* in the source
HTML at all — they are injected into `.sidebar` / `.hdr` at runtime by
`text-zoom.js:67`, `pomodoro.js:147`, `focus-mode.js:38`. They would be missed by any audit
that only reads `src/index.html`.

**Entry points.** Desktop: `.mockbar` lives in the sidebar and is always present. Mobile: the
`.mockbar` becomes a `position:fixed` bottom sheet (`transform:translateY(115%)`), raised by the
`#toolsfab` "Tools" button which sets `body.tools-open` (`shell.js:174-212`, `styles.css:323-325`).

| # | Tool | Trigger | Overlay el |
|---|------|---------|-----------|
| 1 | Mock run | `#mockopen` | `#mockov` |
| 2 | Mixed fire | `#mixopen` | `#mixov` |
| 3 | Cram sheet | `#cramopen` | `#cramov` |
| 4 | Session progress | `#sessopen` | `#sessov` |
| 5 | Game plan | `#planopen` | `#planov` |
| 6 | Scope it first | `#scopeopen` | `#scopeov` |
| 7 | Keyboard shortcuts | `#keyopen`, `?` | `#keyov` |
| 8 | Topic index (**= the home screen**) | `#idxopen`, `#homeBtn`, `\` | `#_index-overlay` |
| 9 | Search | `#searchopen`, `/` | `#_search-overlay` |
| 10 | Your notes | `#notesopen` | `#_notes-overlay` |
| 11 | Cross-topic drill (7 modes) | index `[data-cross]` | `#_cross-overlay` |
| 12-27 | Copy link, Star, Print Q&A, Theme, Interrupt toggle, **Text size**, **Focus timer**, **Focus mode**, Density (`d`), Tour (`g`), Topic-nav dropdown, Tools drawer, Export, Import, Reset, Cram-print | — | — |

Two architectures coexist: the **7 static overlays** (in HTML at parse time) are driven by
shell.js's centralized MutationObserver focus manager + `ovShow`/`ovHide`; the **4 dynamic
overlays** (built lazily on first open, after that scan has already run) use the separate
`window.__overlayModal` helper (`overlay-focus.js:12`). **Every defect below falls cleanly along
that seam.**

---

## 2. Pass/fail matrix — MODAL OVERLAYS

`D` = desktop 1280x800, `M` = mobile 390x844. "Render" = panel fully within the viewport
(measured `panel.right - innerWidth` and `panel.bottom - innerHeight`; all <= 0 = nothing clipped).

| Overlay | Opens D/M | Render | ESC | Backdrop click | Close btn | **Scroll-lock** | Focus trap | Focus restore | Console |
|---|---|---|---|---|---|---|---|---|---|
| Mock run | PASS / PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS | clean |
| Mixed fire | PASS / PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS | clean |
| Cram sheet | PASS / PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS | clean |
| Session progress | PASS / PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS | clean |
| Game plan | PASS / PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS | clean |
| Scope it first | PASS / PASS | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS | clean |
| Keyboard shortcuts | PASS / n/a¹ | PASS | PASS | **FAIL** | PASS | PASS | PASS | PASS | clean |
| Topic index (home) | PASS / PASS | PASS | PASS | PASS | PASS | **FAIL** | PASS | PASS | clean |
| Search | PASS / PASS | PASS | PASS | PASS | PASS | **FAIL** | PASS | PASS | clean |
| Your notes | PASS / PASS | PASS | PASS | PASS | PASS | **FAIL** | PASS | PASS | clean |
| Cross-topic drill | PASS / PASS | PASS | PASS | PASS | PASS | **FAIL** | PASS | PASS | clean |

¹ `#keyopen` is `.kbd-only` → `display:none` on mobile **by design**. The `?` key still opens it
(verified `opened:true` at 390px). Correct call — a phone has no keyboard.

**Headline: every one of the 11 overlays opens, renders fully on-screen at both viewports, traps
focus, restores focus to its trigger, and throws zero console errors.** No overlay is clipped or
overflowing at 390px. The two FAIL columns are exactly complementary and split on the
static/dynamic seam.

## 3. Pass/fail matrix — NON-MODAL TOOLS

| Tool | Verdict | Evidence |
|---|---|---|
| Copy link | **PASS** | Copies `…index.html#content-pipeline/num`; carries topic **and** view; round-trip reload restores both (`topicOK:true, viewOK:true`) |
| Star / bookmark | **PASS** | `aria-pressed` false→true, persists `ddr.v1.bookmarks` |
| Theme toggle | **PASS** | `data-theme`→dark, `<meta theme-color>`→`#15141A`, persists |
| Interrupt toggle | **PASS** | toggles; label updates to "…— on" |
| Text size (A−/A+) | **PASS** (desktop) | `.pane` zoom 1 → 1.16, persists `ddr.v1.ui.textzoom=4`. **Control is `display:none` below 920px** (`styles.css:607`) |
| Focus timer (Pomodoro) | **PASS** (desktop) | 25:00 → 24:58, reset restores. **Also `display:none` below 920px** — still built + ticking, invisible |
| **Focus mode** | **FAIL — P1 trap** | see F1 |
| Density (`d`) | **PASS** | default → compact |
| Tour guide (`g`) | **PASS** | `_tour-overlay` + `_tour-spotlight` + `_tour-tooltip` all render on-screen, both viewports |
| Topic-nav dropdown | **PASS w/ defect** | 46 items, scrollable, ESC closes. **Overflows viewport right edge by 6px on mobile** (see F6) |
| Tools drawer (mobile) | **PASS** | opens, 692px tall in an 844px viewport (fits, no scroll needed), scrim (`z:55`) < bar (`z:60`), scrim-tap dismisses. ESC does *not* dismiss (F8) |
| Export backup | **PASS** | downloads `deepdive-rehearsal-backup.json` |
| Import backup | **PASS** | opens picker, `accept="application/json,.json"` |
| Reset all data | **PASS** | `confirm()`-guarded; declining leaves all 3 keys intact |
| Cram Print / `p` key | **PASS** | `window.print()` fires |
| **Print Q&A / Ctrl+P** | **FAIL — P1** | popup opens with correct content but **all CSS tokens are undefined** — see F2 |

---

# FINDINGS

## F1 — P1: Focus mode is an inescapable trap without a physical keyboard

`#_focus-toggle` ("Focus") is injected into `.hdr`, which lives **inside `.sidebar`**
(`focus-mode.js:28-38`). Activating focus mode injects
(`focus-mode.js:21`):

```css
.app._focus-mode .sidebar,.app._focus-mode .companion{opacity:0;visibility:hidden;width:0;…}
```

`visibility:hidden` inherits to every descendant — **including the exit button itself**, and
including the `position:fixed` mobile chrome (`.seg` tab strip at `top:0`, `.mockcta` bar at
`bottom:0`), which are also `.sidebar` children.

**Measured, both viewports** (`rt-tools4.mjs`):

| | desktop | mobile |
|---|---|---|
| Tappable elements on the whole page | **0** | **1** (the `<summary class="mcomp-sum">` accordion — it only expands a coaching panel) |
| `#_focus-toggle` visibility | `hidden` | `hidden` |
| `elementFromPoint` at the button's centre | `stage` (not the button) | `.app._focus-mode` |
| Real `page.click('#_focus-toggle')` | **TimeoutError** | **TimeoutError** |
| `.seg` / `.mockcta` / `#toolsfab` / `#topicnav` visibility | all `hidden` | all `hidden` |
| Escape key exits? | **no** | **no** |
| `f` key exits? | yes | yes (no keyboard on a phone) |
| Reload exits? | yes (not persisted) | yes |

The button **is** visible and tappable *before* activation on mobile (60x20 at y=95). So a phone
user can tap "Focus" in one gesture from the default screen and lose the entire UI — all 9 view
tabs, the tools drawer, the topic switcher, and the exit control — with **no touch-reachable way
back**. The only escape is reloading the page.

- Evidence: `shots/rt-tools/mobile-focusmode-AFTER-trapped.png` (nothing but content — no chrome at all), `desktop-focusmode-AFTER-trapped.png`
- Repro: 390x844 → tap **Focus** (top-left, under the title) → observe: no tabs, no bottom bar, no Tools, no way out.
- Fix (S): keep the toggle out of the hidden subtree — either re-parent `#_focus-toggle` to `.app`, or add `.app._focus-mode #_focus-toggle{visibility:visible;opacity:1;position:fixed;top:12px;right:12px;z-index:var(--z-bar)}`. Also wire Escape → exit focus mode.

## F2 — P1: Print Q&A generates a document with every CSS token undefined

`print-qa.js:47-53` opens a **blank new window** (`window.open('', '_blank')`) and writes a
self-contained document with an inline `<style>`. But that stylesheet (`print-qa.js:8-27`) is
written in **design tokens** — `var(--space-40)`, `var(--font-size-display)`, `var(--space-760)`,
`var(--font-weight-heavy)`, … — and the popup document **never loads `tokens.generated.css`**.
Every token resolves to nothing, so every declaration containing one is invalid at
computed-value time and is dropped.

**Measured inside the real popup** (`rt-tools6.mjs`, both viewports identical):

| Property | Intended | **Actual in popup** |
|---|---|---|
| `--space-40` / `--font-size-display` / `--space-760` | tokens | **`(UNDEFINED)`** |
| `body` padding | `40px 32px 60px` | **`0px`** |
| `body` max-width | `760px` centered | **`none`** → full `1280px` bleed |
| `h1` font-size / weight | display / heavy | **`14px` / `400`** — identical to body text |
| `h2` font-size | subhead | **`14px`** |
| `.sig`, `.a` font-size | micro / small | **`14px`** — zero hierarchy |
| `.fu` margin / padding-left | indented | **`0px` / `0px`** |
| `.sr` padding | `11px 15px` | **`0px`** |
| `article` margin-bottom / padding-bottom | `26px` / `22px` | **`0px` / `0px`** — all 22 probes run together |
| `var(--…)` refs in that stylesheet | — | **45** |

The content is entirely correct (title `Content Pipeline — Q&A`, 22 articles) — it is *purely* a
styling failure, and it is total. The literal hex colors survive; every size and space does not.
This reads like collateral damage from an automated "hardcoded values → design tokens" sweep that
did not exclude the one file whose CSS is destined for a foreign document.

- Evidence: `shots/rt-tools/desktop-printqa-popup-BROKEN-CSS.png` — H1 the same size as body text, text flush to x=0, no gaps between probes.
- Repro: Tools → **Print Q&A** (or Ctrl/Cmd+P anywhere).
- Fix (S): inline literal values in `print-qa.js`'s CSS string (it is a standalone document — tokens buy nothing there), or prepend the resolved token block to the popup's `<style>`.

## F3 — P2: 4 of 11 overlays do not scroll-lock the page behind

`body.style.overflow='hidden'` is set by `cram-sheet.js` (cram/plan/scope/keys),
`mock-run/logic.js:44`, `mixed-fire.js:68`, `session-progress.js:11` — but **not** by
`index-overlay.js`, `search-overlay.js`, `notes-overlay.js`, or `cross-drill.js`.
`overscroll-behavior` appears **0 times in the entire 5.1 MB bundle** (grepped `dist/index.html`).

Measured with the modal open (`body.style.overflow === ""` in all four cases):

| Overlay | desktop leak | mobile leak |
|---|---|---|
| Topic index | 157px | **500px** |
| Search | 157px | **500px** |
| Your notes | 157px | **500px** |
| Cross-topic drill | 157px | 500px |

And the version that bites in **normal use**, not just wheeling on the backdrop: open the topic
index (**this is the home screen**), scroll its 46-topic list to the bottom, keep scrolling —
`.ix-scroll` has `overscroll-behavior-y: auto`, so the wheel chains straight through to the
document:

```
mobile  INDEX-scroll-CHAINING: bodyScrollLock:"(none)"  overscrollBehaviorY:"auto"
        bodyScrollBefore:0  bodyScrollAfter:575  CHAINS_TO_PAGE_BEHIND:true  pxLeaked:575
```

Pick a topic and the overlay closes — you are now 575px down a page you never scrolled.

- Evidence: `shots/rt-tools/mobile-index-SCROLLCHAIN-page-moved.png`
- Fix (S): add `overscroll-behavior:contain` to `.ix-ov`/`.nt-ov`/`.xd-ov`/`#_search-overlay` (and their inner scrollers), and set the body scroll-lock in the 4 dynamic overlays' `open()`/`close()` for parity with the other 7.

## F4 — P2: Backdrop click dismisses only 3 of 11 overlays

Clicking the dimmed backdrop closes **index, search, notes, cross-drill** (they each register
`if (e.target === el) close()` — e.g. `index-overlay.js:330`, `search-overlay.js:121`,
`notes-overlay.js:94`, `cross-drill.js:76`) but does **nothing** on the 7 static overlays — mock
run, mixed fire, cram, session, game plan, scope, keyboard. Neither `shell.js` nor
`cram-sheet.js` nor `mock-run/logic.js` binds a click-out handler for them.

Verified with clicks provably on the backdrop, not the panel — e.g. cram/desktop click at
`(170,400)` with the panel's left edge at `x=340`; mock/desktop click at `(640,18)` with the
panel's top at `y=36`. All 7 stayed open; all 4 dynamic ones closed.

Tap-outside-to-dismiss is a near-universal expectation for a mobile bottom sheet, and here it
works on 4 overlays and silently does nothing on the other 7 — the inconsistency is the defect.
(ESC and the × button both work everywhere, so nobody is stuck.)

- Fix (S): one shared backdrop-click handler for `[role=dialog][aria-modal]` in `shell.js`, next to the existing unified Escape handler (`shell.js:160-166`).

## F5 — P2: One Escape closes two stacked overlays

Two independent Escape handlers are live and neither calls `stopPropagation()`:
`overlay-focus.js:21` (dynamic overlays) and `shell.js:160-166` (static overlays, which clicks the
open overlay's `.mock-x`). With both kinds open they **both** fire on the same keypress.

```
desktop/mobile  ESC-double-close:
  whenBothOpen : {cram:true, search:true, bodyOv:"hidden"}
  afterSingleEsc: {cram:false, search:false, bodyOv:""}
  BOTH_CLOSED_BY_ONE_ESC: true
```

Repro: open the cram sheet, press `/` to search, press Escape once → the search **and** the cram
sheet you were reading both vanish.

- Evidence: `shots/rt-tools/desktop-stacked-search-over-cram.png` → `desktop-stacked-after-one-esc.png`
- Fix (S): have whichever handler closes an overlay call `e.stopPropagation()` / mark the event handled, or maintain one overlay stack and only pop the top.

## F6 — P3: Topic-nav dropdown overflows the viewport on mobile

`#tnmenu` (the 46-topic switcher, opened from the "Rehearsing <topic>" pill) measures
`left:15, right:396, width:381` in a `390px` viewport → **6px past the right edge**, and it drags
the whole document with it: `document.scrollWidth: 396 > innerWidth: 390` → the page gains
horizontal overflow while the menu is open. Clean on desktop (`right:279` of `1280`).

- Evidence: `shots/rt-tools/mobile-topicnav-overflow.png`
- Fix (S): constrain to `max-width: calc(100vw - 30px)` (or `right:0` anchoring) in the <920px branch.

## F7 — P3: Text size and Focus timer are hidden below 920px

`styles.css:607` — `@media(max-width:919px){.textzoom,.pomodoro{display:none}}`.
Deliberate, and defensible for the pomodoro; but it means **mobile has no in-app text-size
control** at all (the `--read-zoom` mechanism works fine there — verified `.pane` zoom 1 → 1.16 at
390px when driven directly — there is simply no UI to reach it). Users on a phone fall back to
browser pinch-zoom. Also: `pomodoro.js` still builds its DOM and runs its timer at 390px for a UI
nobody can see.

- Fix (S/M): surface A−/A+ inside the mobile tools drawer; skip `build()` when the control is hidden.

## F8 — P3: Tools drawer does not close on Escape

The mobile bottom sheet (`body.tools-open`) is dismissed by tapping the scrim (verified) or by
picking any tool, but `Escape` does nothing (`closedByEsc:false`). It is not a `role=dialog`, so
neither Escape handler covers it. Minor, but every other dismissible surface in the app honours ESC.

## F9 — P3: Dead condition in the tools-drawer click handler

`shell.js:208` (present in the shipped bundle):

```js
mockbar.addEventListener('click', function (event) {
  const btn = event.target.closest && event.target.closest('button');
  if (!btn) return;
  if (btn.id === 'inttog' || btn.id === 'themetog') return;   // <-- 'inttog' can never match
  closeMockbar();
});
```

Verified against `dist/index.html` byte offsets: `.mockcta` @151669 → `#inttog` @151916 →
`.mockbar` @152244 → `#themetog` @154949. **`#inttog` lives in `.mockcta`, a sibling of
`.mockbar`** — a click on it never reaches this listener, so the `inttog` branch is unreachable.
(`themetog` is genuinely inside `.mockbar`, so that half is live and correct.) Harmless, but it
encodes a false belief about the DOM.

---

## What is healthy (verified, not assumed)

- **Zero console errors and zero page errors** across every open/close/drive of all 27 tools on both viewports.
- All 11 overlays render **fully within the viewport** at 390x844 — nothing clipped, nothing overflowing, every long panel scrolls internally.
- Focus is **trapped** in all 11 (12 Tab presses never escaped) and **restored to the trigger** on close in all 11.
- Mock run genuinely runs: clock ticks `0:00 → 0:02`, beats advance 1/6 → 5/6 with Enter, and the rAF clock **stops** on close (no leaked timer).
- Copy link produces a real deep link that round-trips topic **and** view.
- Export/import/reset are correct and confirm-guarded.
- The mobile tools drawer is well-built: fits (692px of 844), correct z-order (scrim 55 < sheet 60), scrim-tap dismisses, and deliberately keeps itself open for the two in-drawer toggles.
- Cross-topic drill works in all 7 modes (all/6 groups) — no silent no-ops.
