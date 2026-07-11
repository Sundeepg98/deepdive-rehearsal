# Adversarial verification — `vd-mobile` lens

**Verifier:** independent re-measurement, Playwright + Chromium, `file://` on the shipped `dist/index.html`.
**Date:** 2026-07-11
**Scripts:** `_audit/2026-07-11-state-audit/scripts/verify-vd-mobile-*.mjs`
**Shots:** `_audit/2026-07-11-state-audit/shots/verify-vd-mobile/`

## Headline

The original lens is **substantively strong and honest**. All 15 findings reproduce; most of its
numbers match my independent measurements *to the decimal*. It did not hallucinate.

But it has **two defects that would cost the operator real time**, and I only found them by
re-measuring instead of re-reading:

1. **The P0's root cause and primary fix are wrong — the recommended one-liner is a proven no-op.**
   The fix that *does* work is the parenthetical the lens tacked on as an afterthought.
2. **The lens missed a systemic blocker: 10 of the selectors it tells you to fix in `styles.css`
   live inside shadow roots, where page CSS cannot reach them.** Roughly half the fix list is
   dead on arrival as written. This affects findings 8, 11, 13, 15 and half of 5.

It also **under-scoped the P0 by an order of magnitude**: on 5+ of the 46 topics the Tools button
is *completely off-screen and unreachable on every phone size, including 430px* — which the lens
explicitly cleared as "430px = ok".

## A methodology note that decides everything

The lens's numbers only reproduce under **`isMobile: true`** (true mobile emulation: meta-viewport
honoured, ICB allowed to expand past the visual viewport). Under a plain desktop-sized viewport the
fixed bottom bar is clamped to the screen and the bar-overhang symptom *disappears*.

I initially could not reproduce `#toolsfab hiddenPct=32` and was ready to refute it. Re-running with
`isMobile: true` reproduced it **exactly** — because a real phone expands the layout viewport to the
document's scroll width, stretching every `position:fixed; left:0; right:0` bar to 396px.

| viewport | `isMobile:false` — `.mockcta` | `isMobile:true` — `.mockcta` | `#toolsfab` hidden |
|---|---|---|---|
| 390 | w=390, right=390, 0% hidden | **w=396, right=396** | 0% |
| 375 | w=375 | **w=396** | 9% |
| 360 | w=360 | **w=396 (36px past screen)** | **32%** ← lens said 32% |
| 320 | w=320 | **w=397 (77px past)** | **93%** |

The lens was right and used the correct emulation mode. Anyone re-verifying this app on mobile
**must** use `isMobile: true`, or they will refute real bugs.

---

## 1. P0 topic-nav overflow — CONFIRMED, ESCALATED, but ROOT CAUSE + PRIMARY FIX REFUTED

### The symptom reproduces exactly

`#topicnav` is pinned at **380.6px** at 393/390/375/360/320 — it never shrinks. `canPan: false`, so
the overflow is not scrollable-away.

| viewport | docScrollWidth | overflow | `#tnnext` hidden |
|---|---|---|---|
| 430 | 430 | 0 | 0% |
| 393 | 396 | 3px | 6% |
| 390 | 396 | 6px | 13% |
| 375 | 396 | 21px | 47% |
| 360 | 396 | 36px | **81%** |
| 320 | 396 | 76px | **100%** |

All match the lens. Confirmed.

### The root cause is NOT what the lens says

The lens: *"styles.css:624 — `.tn-current` has NO `min-width:0`, so its automatic minimum size = the
full untruncated text width; that floors `.tn-trigger` at 230.6px."*

Two measurable problems with that:

- **`.tn-trigger` already computes `min-width: 0px`** — it is set explicitly at `src/styles.css:620`.
  Nothing can "floor" it. Measured computed styles at 360px:

```
.side-id     display=flex   flexWrap=wrap   flex=0 1 auto   min-width=auto   overflow=visible
#topicnav    display=flex   flexWrap=nowrap flex=0 1 100%   min-width=auto   overflow=visible
#tntrigger   display=flex   flexWrap=nowrap flex=1 1 0%     min-width=0px    overflow=hidden   <-- already 0
#tncurrent   display=block                  flex=1 1 0%     min-width=auto   overflow=hidden   <-- overflow:hidden
```

- **`.tn-current` has `overflow:hidden`**, so per CSS Flexbox §4.5 its `min-width:auto` *already*
  resolves to 0. Adding `min-width:0` there is a literal no-op.

### Proof the recommended fix does nothing (bisect @360px, `isMobile:true`)

```
[BROKEN]  A. baseline (shipped)
    overflow=36px   #topicnav w=380.6   #tnnext hidden=81%   #toolsfab hidden=32%   ellipsis firing: false

[BROKEN]  B. LENS PRIMARY FIX:  .tn-current{min-width:0}
    overflow=36px   #topicnav w=380.6   #tnnext hidden=81%   #toolsfab hidden=32%   ellipsis firing: false
    ^^^ IDENTICAL TO BASELINE IN EVERY MEASURED VALUE. ZERO EFFECT.

[FIXED]   C. LENS PARENTHETICAL: .topic-nav{min-width:0}
    overflow=0px    #topicnav w=330     #tnnext hidden=0%    #toolsfab hidden=0%    ellipsis firing: TRUE
```

**The real root cause:** `#topicnav` (`.topic-nav`, `styles.css:619`) computes `min-width: auto` and
is a **flex item of `.side-id`**, which is `display:flex; flex-wrap:wrap` (`styles.css:304`). A flex
item's `min-width:auto` resolves to its **content-based minimum** = its min-content size = 380.6px.
That is the floor. It is on `.topic-nav`, not on `.tn-current`.

**The correct fix is one line — but a different one than recommended:**

```css
.topic-nav{ min-width: 0 }   /* styles.css:619 — NOT .tn-current at :624 */
```

This alone collapses the entire chain: overflow 36→0, `#topicnav` 380.6→330, next-topic button fully
visible, bottom bar and tab strip back inside the screen, and the `text-overflow:ellipsis` that was
already authored on `.tn-current` **finally fires** (clientW 52 vs scrollW 103).

If the operator applies the lens's stated fix (`styles.css:624`) and skips the parenthetical, **the
bug is 100% unchanged.**

### The severity is far worse than reported — the lens only tested one short topic name

"Content Pipeline" is 16 chars. I forced all 46 topic names through the layout, then **navigated for
real** to the worst one:

```
REAL NAVIGATION to "Production Debugging and Incident Diagnosis" (43 chars):

  430px:  docScrollWidth=579  OVERFLOW=149px  #topicnav=564px  #tnnext 100% hidden  #toolsfab 100% HIDDEN
  393px:  docScrollWidth=579  OVERFLOW=186px                                        #toolsfab 100% HIDDEN
  360px:  docScrollWidth=579  OVERFLOW=219px                                        #toolsfab 100% HIDDEN
```

Hit-test at 430px on that topic:

```json
{
  "viewport": { "vw": 430 }, "icb": 579,
  "mockcta": { "left": 0, "width": 579, "position": "fixed", "opacity": "1", "visibility": "visible" },
  "toolsfab": { "left": 497, "right": 564 },
  "TOOLS_BUTTON_REACHABLE_ANYWHERE_ON_SCREEN": false,
  "canPanRight": false
}
```

**The Tools button starts 67px beyond the right edge of the screen and cannot be reached by any
point on the display, and the page cannot pan.** Tools is the *only* mobile entry point to the tools
sheet — topic index, search, cram sheet, notes, bookmarks, export/import, theme, session progress,
game plan, scope. On those topics, all of it is dead.

At least 5 topics overflow by >100px at 390px: Production Debugging (189), Multi-Region & DR (126),
Error Propagation (119), Rules Engine & Dual Auth (117), Feature Flags (103).

The lens's framing — *"every phone narrower than 396px"*, *"430px = ok"* — is wrong. The bug is
**topic-dependent** and fires on **every phone width**, including the largest.

Verified fix at 430px on that topic: `overflow=0, #toolsfab visible=67px, ellipsis=true`.

Shots: `f1c-360-A-baseline.png`, `f1c-360-B-lens-primary-fix-NOOP.png`,
`f1c-360-C-topicnav-minwidth0-WORKS.png`, `EVIDENCE-430-longtopic-BROKEN.png`,
`EVIDENCE-430-longtopic-FIXED.png`.

---

## 2. THE BIG MISS — half the fix list cannot be applied where the lens says to apply it

The 9 panes were migrated to web components (`deep-walkthrough`, `deep-whiteboard`, …). Their
internals live in **shadow roots** that adopt `[BASE_SHEET, <component sheet>]` via
`adoptedStyleSheets`. `src/scripts/app/base-styles.js:3` says it outright:

> *"Foundational rules every componentized pane needs inside its shadow root, **because global CSS
> does not cross the shadow boundary**"*

`topic-protocol.js:154: sheets() { return [BASE_SHEET]; }` — **`styles.css` is never adopted into a
pane's shadow root.**

I proved the consequence empirically: inject a page-level rule for each selector the lens tells you
to fix, then re-measure. A light-DOM control group is included to show the method works.

```
  .wb-rev          inShadowRoot=true   height: 28    -> 28     [NO-OP - page CSS CANNOT REACH IT]
  .wb-got          inShadowRoot=true   height: 28    -> 28     [NO-OP]
  .wb-miss         inShadowRoot=true   height: 28    -> 28     [NO-OP]
  .op-rev          inShadowRoot=true   height: 28    -> 28     [NO-OP]
  .piv-jump        inShadowRoot=true   height: 30    -> 30     [NO-OP]
  .arc-t           inShadowRoot=true   font: 12px    -> 12px   [NO-OP]
  .msel            inShadowRoot=true   cols: 2-col   -> 2-col  [NO-OP]
  .dots i          inShadowRoot=true   anim: dotPulse-> dotPulse[NO-OP]
  #num input       inShadowRoot=true   font: 15px    -> 15px   [NO-OP]
  .mb-rev          inShadowRoot=true   height: 34    -> 34     [NO-OP]
  ---- control group (light DOM) ----
  .tools-fab       inShadowRoot=false  height: 40    -> 44     [page CSS APPLIED]
  #_focus-toggle   inShadowRoot=false  height: 20    -> 44     [page CSS APPLIED]
  .mockbtn         inShadowRoot=false  font: 13.5px  -> 16px   [page CSS APPLIED]
  .crambtn         inShadowRoot=false  height: 36.7  -> 44     [page CSS APPLIED]
  .tn-step         inShadowRoot=false  height: 44    -> 60     [page CSS APPLIED]
  .mcomp           inShadowRoot=false  border: 1px   -> 7px    [page CSS APPLIED]
```

**Dead on arrival as written:**

| lens finding | recommendation | verdict |
|---|---|---|
| F8 touch targets | `@media(max-width:919px){.wb-rev,.wb-got,.wb-miss,.op-rev,.piv-jump,.dn-step{min-height:44px}}` in styles.css | **~70% inert** — only `.tools-fab` / `#_focus-toggle` land |
| F11 number inputs | `@media(...){#num input{font-size:16px}}` in styles.css | **fully inert** — the iOS zoom bug survives |
| F13 dot animation | convert `.dots i.on` box-shadow loop at styles.css:346 | **fully inert** — runtime anim is `dotPulse` inside the shadow root; `styles.css:345`'s `dotActivePulse` rule matches nothing |
| F15 polish | `.arc-t` wrap; `.msel` `grid-template-columns` | **fully inert** |
| F5 mock run | add `kbd-only` to `.mb-keys`; restyle the action row | **CSS half inert** (`.mock-ov`/`.mock-panel` ARE light DOM, so the full-screen-sheet part works) |

The lens's own rationale for F8 is exactly backwards. It writes:
> *"styles.css:842 already does exactly this for .tn-step/.tn-trigger/.ix-x — the pattern is
> established, it just wasn't extended to the pane controls."*

It wasn't extended because **it cannot be**. `.tn-step` is light DOM (my control proves it: 44→60).
The pane controls are not. The fixes must go into each pane's component stylesheet — e.g. the
whiteboard's 28px buttons are styled at **`src/scripts/app/whiteboard.js:52`**
(`.wb-rev,.wb-got,.wb-miss{font:bold 11.5px …;padding:var(--space-7) var(--space-14)}`) — or into
the shared `BASE_SHEET` in `base-styles.js`.

### Corroborating artifact: there are already dead rules in styles.css

`styles.css:370-372` (the v141 button-ripple effect) explicitly names
`.dn-step, .op-rev, .wb-rev, .wb-got, .wb-miss, .mb-rev, .mb-next` — **all now inside shadow roots.**
Those three rules are already dead: the tap-feedback ripple the design intends **never fires on any
pane control**. That is both a live (small) defect and proof that the shadow-boundary drift is
already in the codebase, not a hypothetical.

---

## 3. Verdicts on the remaining findings

Every one reproduces. Exact-match measurements unless noted.

| # | finding | verdict | note |
|---|---|---|---|
| 2 | Tools sheet flex-shrunk 38% | **CONFIRMED (exact)** | rows 36.7→59.6, `.cram-tog` 31.4→43, grabber **1.26562px** (specced 4px), scrollHeight 691→954, 13/13 rows <44px, no close button. Fix `.sidebar .mockbar > *{flex-shrink:0}` verified working (light DOM). |
| 3 | Swipe desyncs the tab strip | **CONFIRMED** | `shell.js:265-277` — `ensureActiveVisible()` wired to a click listener only. Deep-link `#rf` → active tab **0px visible**; `#open` → **0px visible**; `segScrollLeft=0`. Click control → `segScrollLeft=411, fullyVisible=true`. Recommended fix is **valid**: `routechange` is a real `window` event (`router.js:66`) already consumed by 5 modules. |
| 4 | 58.8% chrome; name stated twice | **CONFIRMED (exact)** | seg 56 + `.side-id` 161.3 + `.stage-head` 54.7 + `.mcomp` 44.5 → first content pixel **y=373.5**; `.mockcta` 123px. Identical component heights at 360px (zero compaction). h1 "Content Pipeline" == pill "Content Pipeline"; active tab "Walkthrough" == stage-head "Walkthrough". |
| 5 | Mock Run = top-pinned desktop modal | **CONFIRMED (exact)** | `align-items:flex-start`; panel y=36 h=338 w=360 bottom=374; **dead space 483px = 56%**; `.mb-rev` 115x34, `.mb-next` 104x32, ~560px from the bottom edge; `.mb-keys` **display:block, 11px**, "Space reveal · → or Enter next · Esc close" on a touch device. (Requires shadow piercing — the lens's numbers are right.) |
| 6 | Scroll-top FAB covers the toggle | **CONFIRMED (exact)** | FAB `fixed; bottom:24px; left:50%` → x=176 y=789 44x44 z=150. `#inttog` x=15 y=802 366x43. `overlapsBottomBar=true`, `overlapsInterviewerToggle=true`, `document.elementFromPoint(FAB centre)` → **`button.scrolltop`**. |
| 7 | Companion accordion +500px snap | **CONFIRMED (exact)** | 44.5→544.6px; **8/8 rAF frames identical** (no animation); `transition:"all"` is inert on `<details>`; pane content pushed to **y=873.5 > viewport 857 → off-screen**. |
| 8 | Pane controls 28–30px | **CONFIRMED, counts corrected** | `.wb-rev` 67.1x28 / `.wb-got` 68.3x28 / `.wb-miss` 69x28 (9 each = **27**, the whole whiteboard surface, 11.5px labels); `.op-rev` 99.1x28 (n=5); `.piv-jump` 150.7x30 (n=7); `#_focus-toggle` **60x20 @ 9px**; `.tools-fab` 66.6x40; seg tabs 39px; num inputs 151x40. **Counts wrong: 89 distinct sub-44px elements, not 216; `.crambtn` is 12–13 elements, not 99.** |
| 9 | Home `.ix-cross` sliced | **CONFIRMED (exact)** | clientHeight 28 / scrollHeight 43 / `overflow:hidden` → **15px hidden**. Home auto-opens. `.ix-panel` 364x709. "Reset all saved progress" ~85px from the bottom edge. |
| 10 | Dark elevation missing on the 2 mobile-only surfaces | **CONFIRMED (exact)** | `.sidebar .mockbar` → `rgba(0,0,0,0.2) 0 -12px 32px`; `.sidebar .mockcta` → `rgba(0,0,0,0.14) 0 -8px 24px`; `.mock-panel` gets the full recipe incl. the `rgba(255,255,255,.08)` edge-ring. Page bg `rgb(21,20,26)` vs sheet `rgb(33,31,41)` = 12/255. `.tools-bd` `rgba(0,0,0,.34)`. Both surfaces are **light DOM → fixable in styles.css.** |
| 11 | 15px number inputs → iOS zoom | **CONFIRMED (exact)** | 4 × `type=number`, 151x40, **font-size 15px**, `inputmode` absent, value `10000000` unseparated. **But the fix must go in the `deep-numbers` component, not styles.css.** |
| 12 | Chrome typography is desktop density | **CONFIRMED (exact)** | `.sh-kick` 9px, `.mb-sec` 9px, `#_focus-toggle` 9px, `.locator` 11px, `.mcomp-cue` 11px, `.inttog-lbl` 11.5px, `.mockbtn` **13.5px**, `.crambtn .mb-t` **12px** and `.mb-d` **12px** (no size step). All light DOM → fixable in styles.css. |
| 13 | Infinite non-compositable animations | **CONFIRMED, name corrected** | `.stage::before` = `meshA 20s infinite`, `will-change:transform`, 273x590.8; `.stage::after` = `meshB 16s -6s infinite`, 234x506.4; `.stage-head::before` = `accentGlow 3s infinite` (box-shadow). **The dots run `dotPulse`, not `dotActivePulse`, and they are in a shadow root** — styles.css:345 matches nothing. |
| 14 | Bottom bar spends half its 123px on a mock-only setting | **CONFIRMED (exact)** | `.mockcta` 123px = 14.4%; `#mockopen` 289x47, `#inttog` 366x43, `#toolsfab` 67x40. |
| 15 | Polish: clipped word, orphan chip, flat tab strip | **CONFIRMED (exact)** | `.arc-t` "Observability hooks" right=380.7 vs parent 375 (`overflow:hidden`) → **5.7px sliced**. Model Answers grid is **`.msel`, `grid-template-columns: 176.5px 176.5px`, 9 children, last = "Name the limits" → orphaned** (the lens was right; my first selector guess was wrong). Tab strip `background: rgb(250,249,245)` == page bg, `backdrop-filter:none`; scrollWidth 976 vs clientWidth 396; **only 3 of 9 tabs fully visible, "System Map" 51% clipped, 6 tabs 0% visible**. |

---

## 4. Refuted claims

1. **"Root cause = `.tn-current` missing `min-width:0` (styles.css:624); add it."**
   Proven no-op — `.tn-current` already has `overflow:hidden` (auto min size already 0) and
   `.tn-trigger` already has an explicit `min-width:0`. Injecting the fix changes **nothing**.
   The working fix is `.topic-nav{min-width:0}` (styles.css:619).

2. **"216 sub-44px touch targets"; "`.crambtn` tools rows (x99)".**
   Both inflated by counting persistent chrome once per pane visit. Deduplicated by element
   identity: **89 distinct** sub-44px elements; **12–13** `.crambtn` rows (not 99). The per-element
   measurements are all correct — only the aggregates are wrong.

3. **"All 9 panes are custom elements with shadow roots."**
   The 9 `.pane` elements are plain `<div>`s; **0 of 10 have a shadow root**. The shadow roots belong
   to the nested `deep-*` custom elements *inside* them. Harmless as methodology (piercing is still
   required) — but the imprecision is exactly what let the shadow-boundary blocker (§2) go unnoticed.

4. **"Sweep: 430px = ok."**
   False. At 430px on long-named topics the overflow is **149px** and the Tools button is **100%
   off-screen and unreachable**. The bug is topic-dependent, not width-bounded.

## 5. Things I checked and did NOT find

- **Swipe is not broken on System Map.** I initially saw swipe dead-end at `#sys`, but it works at
  y=420/500 and is blocked only at y≥600 — the intentional `.chain/.dgm` zoomable-diagram guard
  (`touch-swipe.js:35`). Correct behaviour; not reported.
- **No console or page errors** across every flow exercised (boot, home, 9 panes, tools sheet, mock
  run, swipe, deep-link, dark mode).
- **`.mockcta` does not overflow under desktop-viewport emulation** — the bar-overhang finding is
  real but *only* observable with `isMobile:true`. Worth knowing before someone "refutes" it.
