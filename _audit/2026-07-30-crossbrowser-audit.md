# CROSS-BROWSER AUDIT — WebKit 26.5 / Firefox 151 vs the Chromium gate

**Date:** 2026-07-30
**Target (byte-verified by all five lenses independently):** `dist/index.html`
md5 `cabc7905341f26e83a6fb4dd87c4a185`, 12,112,419 bytes — identical to the repo-root
`deepdive_content_pipeline_rehearsal.html`. Loaded over `file://`.
**Repo HEAD:** `ff26858` (master, clean) — "W15 train gate capture — merged-tree run of record, 67/67 PASS".
**Nothing was written inside the repo except this file.** Not committed — for team-lead review.

**Engines driven:** Playwright 1.61.1 · **WebKit 26.5** (`webkit-2311`) · **Firefox 151.0** (`firefox-1532`) ·
**Chromium 149.0.7827.55** (`chromium-1228`) as the control, because "differs" and "differs from the
known-green baseline" are different claims.
**Coverage: 5 of 5 sweep lenses returned.** No lens was dropped; there is no coverage-gap section for a
missing lens. What the five collectively could not reach is in §9.

---

## 0. VERDICT

**The two engines nothing had ever measured run this app. Neither is broken; the gate's blind spot is
bigger than the engine gap.**

Across ~90 independent browser launches in three engines, both target engines booted the 12MB
single-file offline app with **zero console messages, zero pageerrors, zero failed requests and exactly
one network request** (the file itself). Every high-risk feature the brief nominated — `color-mix()` in
srgb *and* oklab, 115 `@property` registrations, constructed `adoptedStyleSheets` across all shadow
roots, `:focus-visible` inside shadow DOM, CSS `zoom` on a shadow host, `env()` fallbacks,
`scroll-margin-*`, `clip-path`, `backdrop-filter`, `@layer` — computes to the same value in all three
engines. The 9-pane router contract, the full drill loop, the four overlays, reduced-motion token
collapse, `file://` persistence and the theme toggle all pass in both target engines.

**Ten app defects, deduped from eleven raw findings across the five lenses.** The headline is not the
engine split — it is this:

> **Eight of the ten reproduce byte-for-byte in Chromium 149, the engine the 67-check gate is green on.**

They are **coverage gaps, not engine regressions**. Only two are engine-attributable, and both are the
same root mechanism (WebKit reserves layout space for a scrollbar the app never suppressed).

| | count |
|---|---|
| **APP DEFECTS** (fixable here) | **10** — P1 ×1, P2 ×5, P3 ×4 |
| — of those, reproduce in Chromium too (gate coverage gaps) | **8** |
| — of those, engine-attributable (WebKit-only, one root cause) | **2** |
| **ENGINE DIFFERENCE BY DESIGN** (graceful, recorded only) | 12 |
| **INSTRUMENT LIMIT** (emulation boundary, not a result) | 12 |
| **Typeface findings** | **0** — see §6 |

**Nothing renders worse than the ledgered Windows-Arial state (W4-coldverify F-2) in either engine.**
Four lenses measured it independently and all four found the two target engines byte-identical to
Chromium. F-2 stays a ledger entry, and this audit adds only its cross-engine receipt.

**The one P1 is print, and it is engine-universal.** The cram sheet's Print button emits one A4 page and
silently drops 66–80% of the artifact, in all three engines, because the print stylesheet resets four
properties on `.cram-panel` and not the two that matter. The gate cannot see it: **there is not one print
check in the 67** (verified — `grep -rl "emulateMedia|media:'print'|page.pdf" test/` returns nothing).

---

## 1. FINDINGS LEDGER

`CR` = Chromium 149 (gate engine) · `WK` = WebKit 26.5 · `FF` = Firefox 151
`•` = defect present and measured · `–` = measured clean · `?` = not measured in that engine

| # | Sev | Finding | CR | WK | FF | Attribution | Lens(es) |
|---|---|---|---|---|---|---|---|
| **X1** | **P1** | Cram Print emits 1 page, drops 66–80% of the sheet — and every native File→Print from any view emits it | • | • | • | app / gate gap | print-offline |
| **X2** | P2 | WebKit reserves + paints a 12px scrollbar inside the fixed phone nav strip; 3 hardcoded chrome constants don't know | – | **•** | – | **engine-attributable** | wk-iphone + census |
| **X3** | P2 | Picking a topic in Search or the Topic index **from `#home`** switches the topic but never navigates — the pick is silently lost | • | • | ? | app / gate gap | wk-core (+wk-iphone xref) |
| **X4** | P2 | Keyboard-shortcuts overlay clips 206px of its own content and the clipped part is keyboard-unreachable | • | ? | • | app / gate gap | ff-core |
| **X5** | P2 | Cram jump-strip lazy-render fix does not hold in WebKit — 0 chips for ~675ms, then a 26.5px shift under the reader | – | **•** | ? | **engine-attributable** | wk-iphone |
| **X6** | P2 | Print Q&A (the Ctrl/Cmd+P surface) ships with every design token undefined — 11 pages, no typographic hierarchy | • | • | • | app / gate gap | print-offline |
| **X7** | P3 | The drill's only forward control is 100% under the fixed bottom bar at stage 1; a tap at its centre opens Mock-run | • | • | ? | app / gate gap | wk-iphone |
| **X8** | P3 | Cram panel is 18px taller than the space it is given at ≤919px — the mobile override drops the desktop padding correction | • | • | ? | app / gate gap | wk-iphone |
| **X9** | P3 | The cram sheet is the only printable surface with no page-break control — latent behind X1 | • | • | • | app / gate gap | print-offline |
| **X10** | P3 | A focused room card wears two hues 3px apart: room-coloured outline, retired-indigo halo | • | ? | • | app / gate gap | ff-core |

### Dedupe performed

- **X2** merges `webkit-iphone` F-1 and `feature-census` §4 — same defect, same element, same root cause,
  found independently by two lenses. They are complementary, not redundant: the census **proved the fix
  causally by runtime injection** and swept 8 viewport widths; the iphone lens **proved the downstream
  cost** (tap floors, the W2 seat, and a dpr1 pixel decode showing the thumb is *painted*, not merely
  reserved). Both receipts are carried below.
- **X3** was filed by `webkit-core` and independently cross-referenced (deliberately not re-filed) by
  `webkit-iphone` with a phone receipt. One finding, two viewports.
- 11 raw findings → **10 unique**.

---

## 2. P1 — one finding

### X1 — The cram sheet's Print button prints ONE page and silently drops 66–80% of the sheet

**Classification: APP DEFECT. Engine-independent — Firefox 151 = Chromium 149 = WebKit 26.5, identical numbers.**
**Where:** `src/styles.css:509` (the print block's `.cram-panel` reset) vs `:474` / `:479` (screen geometry).

`styles.css:505` opens `@media print`. Line 509 resets four properties on the panel:

```css
.cram-panel{box-shadow:none!important;max-width:none!important;border-radius:0!important;margin:0!important}
```

It does **not** reset `max-height` or `overflow`. The screen rule at `:474` carries
`overflow:hidden; max-height:calc(100vh - var(--space-36))`, so on paper the sheet is still a
height-capped, overflow-hidden scroll box. There is no scrollbar on paper; the remainder is simply gone.
*(Source verified at those exact lines during synthesis.)*

**Receipts — print emulation @1280x800, identical in all three engines:**

| topic | `.cram-panel` max-height | overflow | `#cram` clientH | scrollH | **clipped** |
|---|---|---|---|---|---|
| flagship `content-pipeline` | `764px` | `hidden` | 762 | 2218 | **1456px (65.6%)** |
| `consistency-models` (tallest) | `764px` | `hidden` | 762 | 3821 | **3059px (80.1%)** |

Per-engine `#cram` scrollHeight (flagship / consistency-models): FF 2225/3830 · CR 2218/3821 · WK 2222/3874.

**Receipts — REAL A4 pagination** (`page.pdf`, `format:'A4'`, `preferCSSPageSize`, `@page{margin:1.5cm}`;
Chromium-only in Playwright, which is why it is the print reference):

| topic | **A — SHIPPED** | B — panel clamp released | C — B + body overflow cleared |
|---|---|---|---|
| flagship | **1 page** (354,482 B) | **3 pages** (442,120 B) | 3 pages (442,120 B) |
| `consistency-models` | **1 page** (121,176 B) | **7 pages** (826,514 B) | 7 pages (826,514 B) |

**The negative control passes and isolates the cause.** Control B injected only
`.cram-panel{max-height:none!important;overflow:visible!important}` + `.cram-body{overflow:visible!important}`.
**B == C proves the panel clamp is the SOLE cause** — additionally clearing the inline `body{overflow:hidden}`
that `openCram()` sets (`cram-sheet.js:85`) changed nothing. Independently corroborated: 4055px of session
report paginates to 5 pages *under that same body overflow*.

**Section-level fate** (section boxes vs the clip window `#cram` y=1.0…763.0, identical in all engines):
flagship — **1 of 7 sections complete, 1 cut mid-section, 5 never print**. `consistency-models` — **0 of 7
complete** (sec0 h=1289 vs a 762 clip), 6 never print.

**Blast radius — this is why it is P1 and not P2.** `styles.css:508` is
`body:not(.print-session) .cram-ov{display:block!important;…}` with **no `.open` requirement**. Measured on
a walkthrough view with the sheet **never opened**: `.cram-ov` goes `display:none → block`, box 1280x764,
`.app → none`, 7 sections rendered in `deep-cram`, real PDF = **1 page**. So a native **File → Print from
any view** emits the truncated cram sheet. (Ctrl/Cmd+P does not reach this path — `print-qa.js:60`
intercepts it, which is X6.)

**What already works, so the fix is not a rewrite:** app-chrome hiding is correct in all three engines —
`.sidebar`, `.companion`, `.seg`, `#scrollprog`, `.mockbar`, `.topic-nav`, `.inttog`, `.app`, `.badge` all go
`screenVisible=1 → printVisible=0`. `.cram-ov` correctly flattens to `display:block; position:static;
overflow:visible; background:#fff`. **The print stylesheet is 90% right; two missing property resets on one
selector cost 66–80% of the artifact.**

**Contrast case, measured:** the session-report print path (`#ssprint` → `body.print-session` →
`#sessreport`) is healthy — light DOM, no panel clamp, carries `break-inside:avoid` (`styles.css:514`),
forced to 4055px it paginates to 5 A4 pages. That is what the cram path should look like.

---

## 3. P2 — five findings

### X2 — WebKit reserves AND paints a 12px scrollbar gutter inside the fixed phone nav strip; the app's three hardcoded chrome constants don't know about it

**Classification: APP DEFECT (a missing suppression the app already ships on two sibling surfaces),
surfaced by an engine difference. WebKit-attributable of the three engines measured.**
**Where:** `src/styles.css:773` (`.sidebar .seg{position:fixed;overflow-x:auto}`) + `:1044`
(`::-webkit-scrollbar{height:var(--space-12)}`) + the three constants: `:716` `.app{padding-top:56px}` and
`src/scripts/app/drill/logic.js:404` (`scroll-margin-top:69px;scroll-margin-bottom:88px`), `:407`
(landscape `59px/76px`). *All five lines verified in source during synthesis.*

**Mechanism.** The strip genuinely overflows — 9 tabs, `scrollWidth 977` in `clientWidth 390` — so
`overflow-x:auto` produces a real scrollbar, and the app's own global rule gives it a 12px cross-size.
WebKit reserves that 12px of layout height. Chromium and Firefox reserve none.

| @ 390x844 (`iw`/`ih`/`dpr` asserted on every read) | CR 149 | **WK 26.5** | FF 151 |
|---|---|---|---|
| `.sidebar .seg` bounding height | 61.0 | **73.0** | 61.0 |
| `offsetHeight / clientHeight` | 61 / 60 | **73 / 60** | 61 / 60 |
| gutter (`offsetH − clientH`) | 1 (border) | **13** (1px border + **12px scrollbar**) | 1 |
| `elementFromPoint(homeBtn.cx, top+2)` | `BUTTON.tn-step tn-home` | **`DIV.seg`** | `BUTTON.tn-step tn-home` |
| `#homeBtn` covered | 0px / 0.0% | **6.0px / 13.6%** of 44px | 0px |
| `#tntrigger` covered | 0px / 0.0% | **6.0px / 13.6%** | 0px |
| `.side-id .hdr` covered | 0px / 0.0% | **11.0px / 20.4%** of 54px | 0px |
| viewport left for content | 711px | **699px** | 711px |

**Effective (unoccluded) tap heights**, computed in-page against the live band — this is the cost the app's
own 44px floor was written to prevent:

| control | box | **WK EFFECTIVE** | CR |
|---|---|---|---|
| `#tntrigger` (topic switcher) | 44x44 [67..111] | **38** ✗ | 44 ✓ |
| `#homeBtn` (Home) | 44x44 [67..111] | **38** ✗ | 44 ✓ |
| `#_focus-toggle` | 44x44 [72..116] | **43** ✗ | 44 ✓ |

Landscape 844x390: `.seg` 63/50 → gutter 12 (CR 51/50/0); `#tntrigger` and `#homeBtn` **EFFECTIVE 40px**
(CR 44). After "Interviewer pushes further" (stage 2): the new `.fu` computes `scroll-margin-top:69px`
against a `bandTop` of **73** → `hiddenTop 13.7px` (CR 1.7px), and its label
`"Interviewer pushes further"` shows **7.3px visible of 21px — 65% buried** (CR: 19.3 of 21). The `.fq`
question text itself is clear (`hiddenTop 0`).

**It is painted, not merely reserved.** dpr1 pixel decode of the strip: rows y=63..68 carry 148px of
`rgb(185,213,208)` — the thumb (`--acc-a20` composited, 6px = the 12px scrollbar minus the
`border:3px solid transparent;background-clip:padding-box` at `styles.css:1046`). Chromium's rows 60+ are
the 1px border `rgb(232,228,220)` and nothing else.

**Not a mobile-emulation artifact.** With emulation OFF (`DESKTOP=1`, dpr1, plain 390x844) WebKit still
reports `.seg 73/60/12`, `.side-id hiddenTop 17`, `#tntrigger EFFECTIVE 38`. **It is the whole sub-920
tier**, not one breakpoint — measured at 360/390/414/600/768/900/919 (all `wk=73/g13/DIV.seg`), stopping
at 920 where the strip is no longer fixed.

**Root cause is an app omission, not an engine gap** — the app already suppresses this on both sibling
surfaces and not on `.seg`:

| element | `scrollbar-width:none`? | `::-webkit-scrollbar{display:none}`? |
|---|---|---|
| `.sidebar` | – | **yes** (`styles.css:45`) |
| `.cram-jump` (the analogous horizontal strip) | **yes** (`:2124`) | **yes** (`:2125`) |
| **`.sidebar .seg`** | **no** | **no** |

*(`.sidebar::-webkit-scrollbar` does not reach `.seg` — the pseudo-element addresses that element's own
scrollbar, not a descendant's. Verified in source.)*

**The fix is proven causally by runtime injection** (style element added, `.seg` re-measured, removed):

| injected rule | CR | **WK** | FF |
|---|---|---|---|
| *(baseline)* | 61 / g1 | **73 / g13 / `DIV.seg`** | 61 / g1 |
| `.sidebar .seg::-webkit-scrollbar{display:none}` | 61 / g1 | **61 / g1 / `BUTTON.tn-home`** ✅ | 61 / g1 |
| `.sidebar .seg{scrollbar-width:none}` | 61 / g1 | **73 / g13** ❌ no effect | 61 / g1 |
| both (the exact shape already on `.cram-jump`) | 61 / g1 | **61 / g1** ✅ | 61 / g1 |

**The standards-only route is not sufficient for WebKit 26.5.** And note the chromium column: the fix is
measured **pixel-and-geometry neutral in the gate's own engine** — load-bearing for VR (§8).

**The class, not just the instance.** Three constants (56 / 69 / 88, plus landscape 51/59/76) are
hand-tuned to a bar height the app never measures — and they are **already 5px wrong in Chromium today**
(`.side-id hiddenTop 5px` at CR). Any engine, zoom level or font fallback that changes `.seg`'s height
desyncs all three at once.

**Honest scope caveat.** This is measured on WebKit 26.5/Windows, which uses classic space-reserving
scrollbars. Default Safari on macOS/iOS uses *overlay* scrollbars and would not show it. It does bite:
macOS with **Show scroll bars: Always** (a common accessibility preference), WebKitGTK/GNOME Web, and any
Blink build in classic-scrollbar mode. The styling gap is engine-agnostic; only the trigger is not.
One-liner to settle it on real hardware: `document.querySelector('.sidebar .seg').offsetHeight` — **61 is
healthy, 73 is X2.**

---

### X3 — Picking a topic in Search or the Topic index **from `#home`** switches the topic but never navigates; the pick is silently lost

**Classification: APP DEFECT. Engine-independent — reproduces field-for-field in Chromium.**
**Where:** `src/scripts/app/search-overlay.js:409` `navigateTo()` (topic branch calls only
`TopicRegistry.setTopic`, never `Router.navigate`) + `src/scripts/app/router.js:126` `setTopic()`
(early-returns on `TOPICLESS={home:1}`, `:34`). *Both halves read in source during synthesis — the
mechanism is explicit, not inferred.*

**Receipt (WK 26.5, `iw=1280 ih=800` asserted on every read):**

```
AT_HOME               {hash:"#home", title:"Home — Deep Rehearsal", dataView:"home",
                       topic:"content-pipeline", homeVisible:true, appVisible:false}
'/' then type "kafka" → SEARCH_RESULTS {n:1, first:"Kafka Internals TOPIC Messaging & Events · …"}
--- press Enter ---
AFTER_ENTER_FROM_HOME {hash:"#home", title:"Home — Deep Rehearsal", dataView:"home",
                       topic:"kafka-internals",   ← topic DID change
                       homeVisible:true, appVisible:false}
```

Same via the **Topic index** with a hit-tested real mouse click
(`INDEX_PICK {cx:396, cy:394, hit:true, label:"Event-Driven Backbone ASYNC BACKBONE Dec…"}`) →
`AFTER_INDEX_PICK_FROM_HOME {hash:"#home", dataView:"home", topic:"event-driven", homeVisible:true}`.

**Chromium control, identical field for field:** `AFTER_ENTER_FROM_HOME {hash:"#home", title:"Home — Deep
Rehearsal", dataView:"home", topic:"kafka-internals", homeVisible:true, appVisible:false}`.

**Phone receipt (WK, 390x844):** from `#home`, tap "Topic index" → tap "Production Debugging and Incident
Diagnosis" → `location.hash` stays `#home`, `document.title` stays `Home — Deep Rehearsal`, while
`.side-id h1` becomes `"Production Debugging and Incident Diagnosis"`. The home is never re-rendered, so
its hero still advertises the *old* topic.

**Scope — what is NOT broken:** the home's own 46-card library works (phone: tapping the `.ix-card` for
"Idempotency" navigated correctly to `#idempotency/walk`), because `HomeView.bind` supplies
`onPick: kind => { if (kind !== 'hash' && window.Router) Router.navigate(lastView()); }`. The two overlays
have no equivalent. And picking a result while already *inside* that topic correctly no-ops
(`#event-driven/drill → #event-driven/drill`). **`TOPICLESS` is correct and must not be touched** — the
source comments at `router.js:32-34` and `:124-126` record (twice, both "Measured") that it exists to stop
a topic switch destroying the home's own history entry. The missing piece is the caller's navigate, not
the guard.

**Zero console errors are emitted, which is why nothing has flagged it.**

---

### X4 — The keyboard-shortcuts overlay clips 206px of its own content, and the clipped part is unreachable by keyboard

**Classification: APP DEFECT. Engine-independent — reproduced byte-for-byte in Chromium 149.**
**Where:** `#keyov` → `#keybody` (`src/overlays/keyboard.html:8`); focus trap
`src/scripts/app/shell.js:338` + `src/scripts/app/overlay-focus.js:14`.

Measured at `1280x800`, dpr 1, overlay opened with a **real `?` keypress**:

| measurement | **FF 151** | CR 149 |
|---|---|---|
| `#keybody.scrollHeight / clientHeight` | **909 / 703** | 911 / 703 |
| clipped px | **206** | 208 |
| `#keybody` `tabindex` / `role` | **`null` / `null`** | `null` / `null` |
| app's own shadow-inclusive focus-trap set | **`["button#keyx"]`** | `["button#keyx"]` |
| distinct stops over 12 real `Tab` presses | **1** (`button#keyx.mock-x`, 12/12) | 1 |
| `#keybody.scrollTop` after `ArrowDown`×3 → `PageDown` → `End` | **0 → 0** | 0 → 0 |
| `#keybody.scrollTop` after mouse wheel | 0 → **206** | 0 → 208 |

**Why this is a defect and not a layout preference** — `#keybody` is the only one of the app's four
`.cram-body` scroll regions shipped **without** `tabindex="0" role="region"`. Measured census of every
`[role=dialog][aria-modal=true]`:

| dialog | body | tabindex | role |
|---|---|---|---|
| `cramov` | `#cram` | `"0"` | `region` |
| `scopeov` | `#scopebody` | `"0"` | `region` |
| `planov` | `#planbody` | `"0"` | `region` |
| **`keyov`** | **`#keybody`** | **`null`** | **`null`** |

The three that carry it all appear as real tab stops in the measured Firefox tab order; `keyov` does not.
*(Confirmed in source: `keyboard.html:8` is `<div class="cram-body" id="keybody">` with no tabindex/role —
the other three carry them.)* It is a single-attribute omission on the one surface whose entire purpose is
documenting the keyboard.

**Content actually below the fold** (`#keybody` rect top 78 / bottom 781 / h 703): `D Cycle spacing
density` (top 803) · `Esc Close any open panel` (838) · `? Bring up this list` (873) · the footer *"The
single keys pause while a panel like this one is open…"* (915) · partially cut, `G Start the guided tour`
(768/792). **The `Esc` and `?` rows are hidden from the keyboard user who went looking for them.**

Not P1: the overlay opens, traps and closes correctly, pointer users reach everything by wheel, and 15 of
19 rows are legible.

---

### X5 — The cram sheet's jump-strip lazy-render fix does NOT hold in WebKit: 0 chips for ~675ms on first open, then the strip pops in and pushes the sheet down under the reader

**Classification: APP DEFECT (an rAF-based fix whose premise fails when the main thread is the busy
thing). WebKit-attributable — Chromium has all 7 chips in the *first* sample.**
**Where:** `src/scripts/app/cram-sheet.js:45-53` (`buildCramJump` rAF retry loop), called from `:88`.

The fix retries `buildCramJump` on `requestAnimationFrame` up to 30 times, on the stated assumption that
"rAF, not setTimeout — it is the same clock the render is waiting on" *(source comment verified at
`cram-sheet.js:44`)*. In WebKit, opening this sheet costs two frames worth ~570ms and ~337ms, so the retry
loop gets **exactly one retry** in the first 0.9s.

**rAF timeline instrumented from the moment of the real tap on `#cramopen` (hit `span.mb-d`), WK 390x844:**

```
n=1 @   0.0ms  cramov open=false  .cs-sec 0  chips 0
n=2 @   7.0ms  cramov open=true   .cs-sec 0  chips 0
n=3 @ 579.0ms  .cs-sec 7  labelled 7  chips 0     ← 572ms gap
n=4 @ 916.0ms  .cs-sec 7  labelled 7  chips 7     ← 337ms gap
n=5 @ 943.0ms  … steady ~15ms cadence from here
```

**Wall-clock sampling of the same open** (viewport asserted on every row):
`t=60/123/235/346/455/564ms` → all `chips=0 stripH=16.4 bodyTop=129.9 firstSecTop=267.9`;
`t=675ms` → `chips=7 stripH=61 bodyTop=151 firstSecTop=294.4`.

**The shift:** strip `16.4 → 61` (**+44.6px**), `#cram` body box top **+21.1px**, first section
**+26.5px** — and the body is scrollable throughout (`scrollHeight 7619 / clientHeight 710`), so a user who
starts reading immediately, which is the whole premise of a cram sheet, is shoved 26.5px mid-sentence
about two-thirds of a second in.

**Chromium control, same script, same viewport:** `t=60ms chips=7 stripH=59.3` — populated in the first
sample, no empty window at all. **Landscape 844x390 WK:** same shape, `.cs-sec` at 380ms, chips at 688ms.
**Reopen and topic-switch-then-reopen are clean** (7 chips immediately) — first-open only, which the
source itself calls *"the only open most users get"*.

**Attributable root cause:** frames 2→3 span the synchronous render of `<deep-cram>` into its shadow root
(a 7-section, 7619px sheet) on top of the overlay's `backdrop-filter: blur(8px) saturate(1.2)` over a 12MB
document. A `MutationObserver` on the `<deep-cram>` shadow root, or building the strip from `deriveCram`'s
output rather than from the rendered DOM, would not depend on frame cadence.

---

### X6 — "Print Q&A" (the Ctrl/Cmd+P surface) ships with every design token undefined: 11 pages with no typographic hierarchy

**Classification: APP DEFECT. Engine-independent — identical in FF 151, CR 149, WK 26.5.**
**Where:** `src/scripts/app/print-qa.js:7-27` (the CSS string) and `:47-53` (`window.open`); shipped
verbatim at `dist/index.html` byte offset 12,002,443.

This is a **second print surface** and it owns **Ctrl/Cmd+P** (`print-qa.js:56-61`:
`e.preventDefault(); openPrint();` — verified in source). The popup CSS is authored with the app's design
tokens and injected into a document containing **only that `<style>`**, so there is no `:root` carrying
them. Verified in the **shipped artifact**, not just the source.

Token resolution measured in the real popup (22 articles, title `Content Pipeline — Q&A`, vp 1280x800):
`--space-760`, `--space-40`, `--font-size-display`, `--font-weight-heavy`, `--line-height-spacious` → **all
`(UNDEFINED)`**.

| property | **SHIPPED** | with app tokens injected (control) | consequence |
|---|---|---|---|
| `body.max-width` | **none** | `760px` | body measures **1280px** vs 760 |
| `body.padding` | **0px** | `40px 32px 60px` | page inset lost |
| `h1.font-size` | **14px** | `24px` | **title identical to body copy** |
| `h1.font-weight` | **400** | `800` | title not bold |
| `h2.font-size` | **14px** | `16px` | **all 22 question headings = their answers** |
| `article.margin-bottom` | **0px** | `26px` | **22 Q&A blocks run together** |
| `article.padding-bottom` | **0px** | `22px` | — |
| `article.break-inside` | `avoid` | `avoid` | literal — page-break control here is *fine* |

**Negative control passes:** injecting the app's own token values restores every single one. Causation
proven, not inferred. **Real A4 output: 11 pages** (114,518 B) of undifferentiated 14px/400 text.
Document `scrollHeight` 6494 shipped vs 8952 with tokens.

*Synthesis note:* the popup's `body` font **stack** is complete (`-apple-system,BlinkMacSystemFont,'Segoe
UI',Roboto,Helvetica,Arial,sans-serif` — verified in source), so this is **not** a member of the Arial
family (§6). It is the *size and weight* half of typographic truth.

---

## 4. P3 — four findings

### X7 — The drill's only forward control is 100% under the fixed bottom bar the moment it appears, and a tap at its centre opens the Mock-run overlay

**Classification: APP DEFECT. Engine-independent — reproduces in Chromium within ~1px.**
**Where:** `src/scripts/app/drill/logic.js:826` (the `scrollIntoView` is gated `stage >= 2`) vs `.mockcta`
(fixed, `styles.css:738`).

WK 390x844, immediately after tapping "Reveal answer" (app moved `scrollY 0→7`): `#adv "↳ Interviewer
pushes further"` rect `[780.7, 824.7]` h44 vs `.mockcta` (fixed, opaque `rgb(255,255,255)`, z40)
`[772, 844]` → **occludedPx 44/44, occludedPct 100, visiblePx 0**; `elementFromPoint(195, 802.7)` returns
`span.mb-lbl` — the Mock-run bar. The lens's first pass tapped that coordinate without scrolling and it
**opened `#mockov`**; the next tap then hit `div#mockov.mock-ov`. **CR: `#adv [780.3,824.3]`,
occludedPct 100, hit `span.mb-lbl` — identical.**

Landscape 844x390 at `scrollY 0` **before any interaction**: band `[63,330]`, `#adv "Reveal answer"`
`[338.7,382.7]` → `inBand FALSE`, entirely inside `.mockcta [330,390]` (CR band `[51,330]`, `#adv
[337.8,381.8]`, same verdict). So in landscape the drill's first screen shows the probe and no way to
answer it without scrolling; in portrait the same thing happens one interaction later.

**Held at P3, deliberately.** Content below a fixed bottom bar is normal web layout and scrolling is a
normal user action — the button is below the fold, not unreachable. What is genuinely defective is the
*inconsistency with the app's own intent*: the W2 `scrollIntoView` fix seats the follow-up at stages ≥2 but
not at stage 1 (or stage 0 in landscape), so the app seats its content and abandons its control. The
originating lens filed P3 and that is the honest severity.

**Related, recorded not filed:** at the judgment point `.judge [1210, 1268.7]` vs band `[73,772]` = **438px
below the fold**, occludedPct 100 (CR `[1186.9,1244.9]`, band `[61,772]`). Reading the senior-signal block
before grading is plausibly the intent.

### X8 — The cram panel is 18px taller than the space it is given, in every orientation

**Classification: APP DEFECT. Engine-independent — byte-identical in Chromium.**
**Where:** `src/styles.css:2139` (`@media(max-width:919px) .cram-panel{max-width:none;max-height:100vh;
border-radius:0}`) vs `:474` (desktop `.cram-panel{max-height:calc(100vh - var(--space-36))}`) inside
`.cram-ov{padding:18px}`. *Both verified in source; the ≤919px override drops the padding correction.*

WK 390x844: panel rect `[18, 862]` h=844, computed `max-height 843.999939px`, `.cram-ov` padding 18px,
`innerHeight 844` → **18px below the fold**; `#cram` body bottom 861 → 17px of scrollport permanently off
screen. WK 844x390: `[18, 408]` h=390, max-height 390px → 18px below fold. CR 390x844: `[18, 862]`,
max-height 844px → 18px below fold. CR 844x390: `[18, 408]` → 18px below fold.

Nothing becomes unreachable (the body scrolls), but the sheet's bottom edge is never on screen.
**Likely worse on real iOS**, where `100vh` is the *large* viewport — with the URL bar showing the overflow
would be 18px + the URL bar height. Not testable here.

### X9 — The cram sheet is the only printable surface with no page-break control

**Classification: APP DEFECT. Engine-independent. Latent behind X1 — it materialises the moment X1 is fixed.**
**Where:** `src/scripts/app/base-styles.js:52` (the BASE_SHEET `@media print` selector list) vs the `.cs-*`
vocabulary in `src/scripts/app/cram-derive.js`.

```css
@media print{.card,.thread,.dec,.rf,.piv,details.model[open]{break-inside:avoid} …}
```

**That selector list and the cram sheet's vocabulary are disjoint.** *(Verified in source at
`base-styles.js:52`.)*

**Instrument proven alive first** — measured FF 151 + CR 149 under print emulation, 17 shadow hosts,
`deep-cram` `adoptedStyleSheets=2`, `cramAdoptedHasPrintBlock=true`:

| selector | screen | **print** |
|---|---|---|
| `.card` / `.thread` / `.dec` / `.rf` / `.piv` | auto | **avoid** |
| `.cs-sec` / `.cs-cue` / `.cs-one` / `.cs-dec` / `.cs-trap` / `.cs-ha` | auto | **auto** |

BASE_SHEET's print block **is** reaching every shadow root — it just never names a cram class. Contrast
cases that do have it: `.sr-sec` (session report, `styles.css:514`) = `avoid`; print-qa `article` = `avoid`.
Impact today is zero because only one page prints; once X1 is fixed the flagship's 3 pages and
`consistency-models`' 7 pages will split sections arbitrarily.

*The irony is in the source:* `base-styles.js:49-51` says the rule exists because *"the shipped 'Print Q&A'
tool has therefore never had page-break control"* — it was added for the pane classes but not for the one
surface that actually owns a Print button.

### X10 — A focused room card wears two hues 3px apart: room-coloured outline, retired-indigo halo

**Classification: APP DEFECT (a cascade gap the W15 hero fix did not carry across). Engine-independent —
identical computed values in Chromium 149.**
**Where:** `.hm-room:focus-visible` (`src/styles.css:1956`) declares only `outline`; the halo falls through
to the generic `button:focus-visible` (`:53`) whose `box-shadow` is `var(--acc-a15)/var(--acc-a20)`, and
inside `.ix-panel` `--acc` is the roomless neutral `#534AB7` (`:1478`). *All three lines verified.*

FF 151 @1280x800, home route, `.hm-room` card 1 (Messaging & Events), `:focus-visible = true` — reached
both programmatically and by **2 real `Tab` presses from a cold home**:

```
outline    : 2px solid rgb(0,107,99)   → #006B63 = var(--rm), room 1 teal
box-shadow : color(srgb 0.32549 0.290196 0.717647 / 0.15) 0 0 0 3px,
             color(srgb 0.32549 0.290196 0.717647 / 0.2)  0 0 16px -4px   → #534AB7 @ .15/.20
--acc resolved on the element : #534AB7      --rm resolved on the element : #006B63
```

**The same shape W15 fixed one element away.** `.hm-cta:focus-visible` (`:1935`) was given its own
`color-mix(in srgb, var(--rm) …)` halo precisely because the inherited tokens painted a #534AB7 ring
hugging a #006B63 fill. Verified on cold boot: the hero now measures `outline #2a2823` (`var(--ink)`) +
halo `#006B63 @ .15/.20` — **correct, and byte-identical in Chromium**. The six room cards were not carried
across. The W15 comment at `styles.css:1934` even records *"The global rule at :53 is untouched."*

**Judgment note, stated plainly:** `styles.css:1465-1478` argues the neutral `--acc` is *correct* on
surfaces that enumerate rooms, so a design owner may consider a neutral halo intended here. What is not
arguable is that the **outline** on this element does claim the room while the halo does not — one focus
indicator, two meanings. **This needs a design ruling before it is coded.**

---

## 5. FEATURE × ENGINE MATRIX

From the `feature-census` lens. **OK** = computes correctly / behaves as the Chromium control ·
**GRACE** = engine difference, measured, no user-visible defect · **DEFECT** = user-visible in this engine.
Viewports asserted on every probe (1440x900 dpr1 and 390x844 dpr1, plus a 360→920 width sweep).
**18 full drives (6 probe scripts × 3 engines): `pageerror` = 0 and console error/warning = 0 in every one.**

| # | Feature (real element probed) | Chromium 149 (control) | **WebKit 26.5** | **Firefox 151** |
|---|---|---|---|---|
| 1 | `color-mix(in srgb …)` → `.dock` border-color | `color(srgb 0 0.419608 0.388235 / 0.32)` | **OK** identical string | **OK** identical string |
| 2 | `color-mix(in oklab …)` → `.mock-title` color | `oklab(0.439266 -0.0679177 -0.0052853)` | **OK** Δ<7e-6 | **OK** Δ<7e-6 |
| 3 | `color-mix` parse survival (light/adopted/shadow-inline) | 66/0/2 | **OK** 66/0/2 | **OK** 66/0/2 |
| 4 | `@property` — 115 `CSSPropertyRule`s + registered initials | 115; `--accent-hue`=250deg, `--glow-opacity`=0.06 | **OK** identical | **OK** identical |
| 5 | `adoptedStyleSheets` across all 17 shadow roots | 17 hosts, `[3,2,2,1,2,2,1,1,1,1,2,4,2,1,1,2,2]` | **OK** byte-identical | **OK** identical |
| 6 | `:focus-visible` — 14 real Tab presses, deep shadow resolution | 14/14 show a ring, `2px solid rgb(0,107,99)` | **OK** 14/14 identical | **OK** 14/14; `<summary>` → Gecko `outline-style:auto` 1px, author accent colour, still visible |
| 7 | `scroll-margin-top` → `.thread` in `deep-drill` @390x844 | `69px` / `-bottom 88px` | **OK** | **OK** |
| 8 | `clip-path: inset(50%)` → `.side-id` sr-only pair | `inset(50%)`, 1x1 at (355.5, 88.5) | **OK** | **OK** |
| 9 | `text-wrap: balance` → `h1`, `.step-t`, `.qq` | `balance`; `.step-t` 674x27 | **OK** 674x27 | **OK** 674x27 |
| 10 | `text-wrap: pretty` → `html`, inherited into shadow DOM | `pretty` | `pretty` accepted | **GRACE** → `wrap`; `CSS.supports` false; see §6.1 |
| 11 | CSS `zoom` on `.stage .pane` (shadow host), 2 real `A+` clicks | `--read-zoom` 1→1.16, `.step-t` 27→31.31px (ratio **1.1596**) | **OK** ratio **1.1596** | **OK** ratio **1.16** |
| 12 | Interaction *inside* a zoomed pane — real click at rect centre | `shadowRoot.elementFromPoint` → `button.arc-step`, activates | **OK** identical | **OK** identical |
| 13 | Horizontal overflow under zoom 1.16 | `scrollWidth 1440 == clientWidth` | **OK** none | **OK** none |
| 14 | `env(safe-area-inset-bottom, 0px)` → `.app` padding-bottom | `80px` | **OK** `80px` | **OK** `80px` |
| 15 | `-webkit-line-clamp:2` → 46 `.ix-c-thesis` on `#home` | clientH 31, 2.01 lines, clamped; `display: flow-root` | **OK** same geometry; `display:-webkit-box` | **OK** same geometry; `flow-root` |
| 16 | `backdrop-filter` → `.mock-ov` opened by a real click | `blur(8px) saturate(1.2)` | **OK**; also serialises `-webkit-` twin | **OK**; `-webkit-` twin dropped (harmless) |
| 17 | `accent-color` → `:root` | `rgb(0, 107, 99)` | **OK** | **OK** |
| 18 | `@layer theme/app/components/utilities` | 1 statement + 3 block rules | **OK** | **OK** |
| 19 | `scrollbar-width: thin` → `html` | `thin` | **OK** `thin` | **unmeasurable** — harness forces `none` globally (§7) |
| 20 | `scrollbar-color` → `html` | accent value | **GRACE** `""`, `CSS.supports` false; 22 `::-webkit-scrollbar*` rules supply the same tint | **OK** identical to control |
| 21 | `::-webkit-scrollbar*` rules in CSSOM | 22 present | **OK** 22 | **GRACE** 12 dropped; each has a standards equivalent the app ships |
| 22 | `::selection` / `::-moz-selection` / `::target-text` | 4 + 1 | **OK** 4 + 1 | **OK** 5 (`::-moz-selection` re-serialised) + 1 |
| 23 | `prefers-reduced-transparency` / `-contrast` / `forced-colors` / `-reduced-motion` | all 4 supported, `.media` round-trips | **OK** all 4 | **OK** all 4 |
| 24 | `matchMedia('(max-width:919px)')` + `change`, driven 390→1200→390 | `addEventListener` present, hits `[false,true]` | **OK** | **OK** |
| 25 | `IntersectionObserver` / `ResizeObserver` / `structuredClone` / `CSSStyleSheet` ctor | all present | **OK** | **OK** |
| 26 | `scrollIntoView({block, inline})` — real drive in `deep-drill` | executes, page scrolls | **OK** | **OK** |
| 27 | Overall CSSOM rule survival (light / adopted / shadow-inline) | 957 / 122 / 581 | **OK** 957/122/581 | 946/122/581 — the 11-rule delta is entirely row 21 |
| 28 | **`.sidebar .seg` fixed nav strip @360–919px** | h **61px**, gutterY 1 | **DEFECT** h **73px**, gutterY 13 — **X2** | **OK** 61px, gutterY 1 |
| 29 | `.sidebar .mockbar` tools sheet (real click on `.tools-fab`) | clientW 390, gutterX 0, 0 clipped | **GRACE** clientW 378, gutterX 12, **0 clipped** on all 18 rows | **OK** clientW 390, gutterX 0 |
| 30 | Horizontal document overflow @390x844 | `scrollWidth 390 == clientWidth` | **OK** none | **OK** none |

**Static census, for scope:** the source uses `color-mix()` ×67, `@property` ×115 real at-rules,
`adoptedStyleSheets` ×8 assignment sites, `:focus-visible` ×34, `backdrop-filter` ×12 (+9 prefixed),
`::-webkit-scrollbar*` ×22, `env(safe-area-inset-bottom)` ×6, `matchMedia` ×11 sites. It uses **none** of
`:has()`, `:is()`, `:where()`, `<dialog>`/`popover`/`::backdrop`, `@container`, `oklch()`, `::part`/
`::slotted`/`:host-context`, `scrollbar-gutter`, `light-dark()`, `dvh`/`svh`/`lvh` — so a large slice of the
usual cross-engine risk surface is simply not present.

---

## 6. TYPEFACE TRUTH — no new finding, and the ledger is now cross-engine verified

**Per the brief, a typeface finding is filed only if an engine renders WORSE than the known
W4-coldverify F-2 state. None does.** Four lenses measured this independently:

| lens | method | result |
|---|---|---|
| webkit-core | canvas fingerprint of **all 71 rendered buttons** (light + every shadow root), matched against explicit single-family widths | WK **47 Segoe UI / 24 Arial\|Helvetica**; CR **47 / 24** — identical. Reference probes identical: `sans-serif` and `-apple-system, sans-serif` both 332.38px, full app stack 323.52px |
| firefox-core | canvas width probe @13px on `"✓ Solid [3] Reveal answer WWWiii"` | declared stack `-apple-system, sans-serif` = **199.02px**, `Arial` = **199.02px** (Segoe UI 193.97, Tahoma 197.43 differ). CR: 199.01 / 199.01. **Both engines resolve the stack to Arial identically** |
| webkit-iphone | canvas fingerprint @16px on 6 phone controls | `.seg button` 222.000, `#tntrigger` 204.883, `.mockcta .mockbtn` 256.102, `.tools-fab` 220.664, `#cramopen` 204.883, `#adv` 222.000 — **every one identical in Chromium to three decimals** |
| print-offline | the single embedded `@font-face` (Space Grotesk, variable 300–700, data-URI) | FF **430.27px** / WK **430.25px** vs fallback 422.40 / 460.88 — agrees to **0.02px across engines**; the embedded face renders in both |

**Instrument caveat carried forward:** `document.fonts.check()` **cannot fail** —
`check('700 24px "__NoSuchFontZZ"')` also returns `true` in FF and WK. The boolean is worthless alone; the
width delta is the receipt.

### Members of a combined typeface-truth wave

| item | status | shape |
|---|---|---|
| **W4-coldverify F-2** (ledgered, not re-filed) | 17 rules specify `-apple-system,sans-serif`; on Windows `-apple-system` does not resolve so the generic `sans-serif` wins = Arial. 26 buttons render in Arial incl. all nine `.seg` pane tabs, `.textzoom-btn`, `.inttog`, `.flow-pip`, `.nd-go`, `.mockbtn`. Invisible to `latent_arial` **by design** — that guard's question is "does this button carry a declaration", and these do | the **family** half |
| **X6** (this audit, P2) | Print Q&A: every `--font-size-*` / `--font-weight-*` / `--space-*` token resolves `(UNDEFINED)`; h1 = 14px/400, h2 = 14px, identical to body copy | the **size/weight** half |

Both are the same disease — *the type the CSS declares is not the type that renders* — and both are
engine-independent. **X6's fix ships in the print wave** (that is where the file and the proven negative
control live); the typeface wave owns only the family half. §8 sizes the VR consequence, which is large.

### 6.1 `text-wrap: pretty` — the one place Chromium is the outlier

`CSS.supports('text-wrap: pretty')` → CR true / WK true / **FF false**; computed `text-wrap` =
`pretty` / `pretty` / **`wrap`**. The consequence was **measured, not assumed** —
`Range.getClientRects()` over 93 real prose blocks on `#home` @1440x900: where `pretty` changes anything,
**WebKit lands on Firefox's answer, not Chromium's** (e.g. `.ix-card` w229: CR 12 line rects, WK **11**,
FF **11**). Last-line widths byte-identical across all three in every sample; `.ix-c-thesis` height
30.78 / 30.78 / 30.80px. **Not a finding.**

---

## 7. ENGINE DIFFERENCES BY DESIGN, AND INSTRUMENT LIMITS

### 7a. Engine difference by design — graceful, recorded only (12)

1. **WebKit: focus after Esc returns to `<body>`, not the trigger, when the overlay was opened by MOUSE.**
   WebKit does not focus a `<button>` on mouse-down (the macOS convention). Receipt: hit-tested real click
   `{cx:83, cy:453, hit:true}` on `#cramopen` → `activeElement = body` (CR: `button#cramopen`).
   **The keyboard path — the one that matters for a11y — is correct in WebKit:** `#cramopen.focus()` →
   Enter → open → Esc → `activeElement = button#cramopen`. A mouse user had no keyboard focus to lose.
2. **Firefox: `text-wrap: pretty` dropped** — §6.1, measured consequence nil.
3. **WebKit: `scrollbar-color` unsupported** (`CSS.supports` false, `""` on a bare div on `about:blank`) —
   but `scrollbar-width:thin` *is* supported and all 22 `::-webkit-scrollbar*` rules survive, including
   `::-webkit-scrollbar-thumb{background:var(--acc-a26)}`, which paints the same accent tint.
4. **Firefox drops 12 `::-webkit-scrollbar*` rules** (and gains `::-moz-selection` re-serialised) = the
   entire 11-rule CSSOM delta. Every one has a standards equivalent the app also ships.
5. **CR and FF drop `-webkit-backdrop-filter`; WK keeps it.** The app writes both; measured
   `backdrop-filter: blur(8px) saturate(1.2)` on the opened `.mock-ov` in all three.
6. **WebKit `-webkit-line-clamp` computes `display:-webkit-box`** where CR/FF compute `flow-root` —
   identical clamped geometry (clientH 31, 2.01 lines).
7. **WebKit `.mockbar` (tools sheet) also reserves a 12px gutter** — same mechanism as X2 with **zero
   consequence**: `rowsClipped 0`, `btnsClipped 0`, `scrollWidth == clientWidth` on all 18 rows. A
   scrollbar on a deliberately-scrollable sheet is correct.
8. **WebKit `requestIdleCallback` is `undefined`** — `grep -rn "requestIdleCallback" src/` returns nothing.
9. **WebKit `navigator.maxTouchPoints` reads 0 and the `Touch` constructor throws** — the app gates on
   `'ontouchstart' in window`, which is `true`, so `touch-swipe.js` and `zoom-diagrams.js` both initialise.
   Real swipe pane-change verified working and engine-identical.
10. **Firefox `location.origin === "null"` on `file://`** (CR/WK: `"file://"`) — nothing in `src/` reads
    `location.origin` (grep = 0 hits). `localStorage` works in both.
11. **WebKit's Visualize pane composites the intended `#0D1117` backdrop where Chromium paints black** —
    WebGL 2.0 live in both (51→55 distinct colours over 2.5s in WK, i.e. a live animation). WK not worse.
12. **`history.pushState` on a `file://` origin works in both target engines** — a real risk point (WebKit
    has historically thrown `SecurityError`); `history.length` reached 12 in WK and 11 in FF, and the
    router's `catch` fallback was never needed.

### 7b. Instrument limits — emulation boundaries, not results (12)

1. **`performance.getEntriesByType('resource')` is BLIND on `file://` in all three engines** — 0 entries
   for a resource that provably loaded. Discarded rather than quoted as "0 requests".
2. **Playwright's request channel is dead in Firefox on `file://`** — a 1x1 PNG that demonstrably loaded
   (`complete=true, naturalWidth=1`) produced 0 events in FF vs 2 in CR/WK. The Firefox offline premise is
   therefore covered by a static scan of the shipped bytes + the WK/CR logs, and is **not claimed as a
   live-measured pass**.
3. **`document.fonts.check()` cannot fail** (§6).
4. **`page.pdf()` is Chromium-only in Playwright** — page counts are Chromium-measured; FF/WK clipping is
   established by computed styles + geometry under `emulateMedia`, matching Chromium to within a few px.
5. **PDF text-layer extraction — discarded as a dead instrument** (it was reading embedded subset-font
   binaries, so its character counts were meaningless). Output deleted rather than quoted.
6. **Headless paints no programmatic `::selection` in any engine** — byte-identical before/after
   screenshots and identical pixel histograms in all three. Only CSSOM parse-survival is verified.
7. **The Playwright Firefox build forces `scrollbar-width:none` globally** — proven on `about:blank` with
   zero author CSS (a fresh `<div>` and `<html>` both compute `none` in FF vs `auto` in CR/WK). The app's
   `html{scrollbar-width:thin}` reading back as `none` is a **harness artefact**, not a defect.
8. **Overlay vs classic scrollbar mode cannot be toggled from Playwright** — X2's dependence on classic
   scrollbars is reasoned, not measured.
9. **`scrollIntoView({block:'start'})` never came to rest at the scroll-margin offset in ANY engine on the
   drill route** (wanted `scrollY 275.3`; actual CR 6, WK 80, FF 80). The census therefore **refused to
   file** the "69px margin under a 73px strip = 4px occlusion" arithmetic as a finding. Correct call —
   recorded here so nobody re-derives it as measured.
10. **`env(safe-area-inset-*)` resolves to 0; there is no dynamic URL bar.** `100vh`, `100dvh` and
    `visualViewport.height` all measured 843.98/844 — so every `vh`-vs-`dvh` divergence real iOS exposes is
    invisible here.
11. **`prefers-contrast:more`, `forced-colors:active` and `prefers-reduced-transparency` bodies are
    unexercised in both target engines** — all report `supported:true` with correct `.media` round-trips,
    but could not be forced ON uniformly across engines. The 3 `forced-colors` blocks
    (`styles.css:1271`, `drill/logic.js:217`, `base-styles.js:152`) are untested.
12. **Playwright cannot synthesize a real AltGr layout** — `shell.js:222`'s non-US carve-outs (German
    `\` = AltGr+ß) are untested.

---

## 8. WHY THE 67-CHECK GATE IS GREEN — and what each wave must add

**Verified during synthesis, not assumed:**

- **The entire gate is Chromium-only.** `grep -rl "firefox|webkit" test/*.cjs test/*.mjs` returns two files,
  and both hits are the CSS property name `-webkit-text-fill-color`. Every check resolves its browser via
  `require('playwright').chromium`. So X2 and X5 are invisible **by construction**, not by oversight.
- **There is not one print check in the 67.** `grep -rl "emulateMedia|media: *'print'|page.pdf" test/`
  returns nothing. X1, X6 and X9 are unreachable by any current check.
- **`focus_ring.cjs` never reads `box-shadow`.** All three of its probe returns are
  `{fv, width, style, color, offset, accRgb}` — outline only. It structurally cannot see X10 (a halo hue),
  and `.hm-room` is not among its selectors.
- **`search_deadend.cjs` tests only the whole-system-prompt 0-hit path** (`design twitter`, `url shortener`,
  …) and asserts the `[data-sys-topic]` chips route. It never presses Enter on a topic result from `#home`
  — the X3 path.
- **`touch_floor.cjs` measures box height at rest, correctly and deliberately** (its header records that it
  exists partly to avoid the `#scrolltop` 39.6px transform trap). It does not measure *effective unoccluded*
  height under a fixed bar — and in Chromium there is nothing to measure, because the gutter is 0.
- **`overlay_keyboard.cjs` guards Enter-activation and the shadow-blind focus trap** and counts distinct tab
  stops. It does not assert that every scrollable dialog body is itself a tab stop, which is X4.

**Net: the gate is honest about what it asks. Eight of these ten defects sit in questions it does not ask,
and two sit in an engine it does not run.**

---

## 9. FIX WAVES

Sized **S** (one surface, one file, hours) / **M** (multi-file or needs a new check + a design call).
Grouped so that **the 16 committed VR baselines — all `win32-chromium149`, 9 desktop 1280x800 + 5 room
1280x800 + 2 mobile 390x844 (`m-walk-light`, `m-walk-dark`) — are protected**, and so that any churn is
**explicitly attributed** rather than absorbed.

Baseline inventory read from `test/baselines/manifest.json`: tolerance `channelTol 2 / maxChanged 32`,
capture pinned on dSF/locale/timezone/reducedMotion/forcedColors/colorProfile/lcdText/seeded-`Math.random`.

| wave | size | findings | files | **VR baselines** |
|---|---|---|---|---|
| **W-X1 · PRINT TRUTH** | **M** | **X1 (P1)**, X6, X9 | `styles.css:509` (add `max-height`/`overflow` resets), `print-qa.js:7-27` (inline the token values or emit a `:root` into the popup), `base-styles.js:52` (add the `.cs-*` vocabulary) | **NEUTRAL by construction.** No baseline is captured under print emulation; print-qa is a separate document. Zero screen pixels change. |
| **W-X2a · SEG SCROLLBAR** | **S** | X2 (half 1) | one line: `.sidebar .seg::-webkit-scrollbar{display:none}` beside the existing `.cram-jump` pair at `styles.css:2125` | **MEASURED NEUTRAL in Chromium** — the injection experiment shows CR `61/g1 → 61/g1` unchanged, and the dpr1 pixel decode shows CR paints nothing in that band at rest. `m-walk-light`/`m-walk-dark` are the two at the affected viewport: **re-verify, do not re-baseline.** A diff here is a finding, not churn. |
| **W-X2b · THE MEASURED BAR** | **M** | X2 (half 2) | replace the hardcoded 56/69/88 (and landscape 51/59/76) with a custom property written from `.seg.getBoundingClientRect().height` — `styles.css:716`, `drill/logic.js:404`+`:407` | **WILL CHURN `m-walk-light` + `m-walk-dark`, attributed.** The constant is already **5px wrong in Chromium today** (`.side-id hiddenTop 5px`), so correcting it moves mobile pixels in the gate's own engine. Desktop baselines untouched — every rule is inside `@media(max-width:919px)`. Re-baseline as a reviewed step naming this wave. |
| **W-X3 · HOME EXITS** | **S** | X3 | `search-overlay.js:409` `navigateTo()` + the index overlay's equivalent — give the topic branch the same treatment `HomeView.bind`'s `onPick` already has. **Do NOT touch `router.js`'s `TOPICLESS`** (§3, X3) | **NEUTRAL** — no at-rest pixel changes; `home-light`/`home-dark` capture the un-navigated home. |
| **W-X4 · KEYBOARD SURFACE** | **S** | X4 | one attribute pair: `tabindex="0" role="region"` on `#keybody`, `overlays/keyboard.html:8` | **NEUTRAL** — `#keyov` is in no baseline and the attributes change no at-rest pixel. |
| **W-X5 · CRAM SHEET** | **M** | X5, X8 | `cram-sheet.js:45-53` (MutationObserver on the `<deep-cram>` shadow root, or build the strip from `deriveCram`'s output instead of the rendered DOM), `styles.css:2139` (`max-height:100vh` → `calc(100vh - var(--space-36))`, matching `:474`) | **NEUTRAL** — the cram overlay is in no baseline and is `display:none` at rest; the CSS change is inside `@media(max-width:919px)`. |
| **W-X6 · TYPEFACE TRUTH** | **M** | **W4-coldverify F-2** (ledgered) — X6's fix ships in W-X1; this wave owns only the family half | 17 rules specifying `-apple-system,sans-serif` | **THE ONLY WAVE THAT INTENTIONALLY CHURNS DESKTOP BASELINES.** `.seg` tabs, `.mockbtn`, `.inttog`, `.textzoom-btn`, `.flow-pip`, `.nd-go` re-face → expect **walk-l/d, drill-l/d, sys-l, num-l, wb-l, all 5 room-\*, m-walk-l/d** to churn ≈ **14 of 16**. `home-light`/`home-dark` may survive (home chrome is `.ix-*`/`.hm-*`, already fixed by `latent_arial`) — **verify, do not assume**. **Schedule LAST and ALONE**; re-baseline as an attributed, reviewed step. |
| **W-X7 · DRILL FOLD SEAT** | **S** | X7 | `drill/logic.js:826` — the `stage >= 2` gate | **NEUTRAL, and the source says so.** `logic.js:824-825`: *"Desktop has no fixed chrome and no fold problem — it is untouched, so drill-light / drill-dark and every desktop behaviour check see byte-identical behaviour."* The branch is additionally gated on `this._dsuMq.matches`. |
| **W-X8 · FOCUS HUE** | **S** | X10 | `styles.css:1956` — either give `.hm-room:focus-visible` the `color-mix(in srgb,var(--rm) …)` halo the hero got at `:1935`, or neutralise the outline to match the neutral halo. **Needs a design ruling first** (§4, X10) | **NEUTRAL** — baselines capture at rest and `.hm-room` is not focused in `home-light`/`home-dark`. (The hero's autofocus ring *is* in those baselines; `.hm-cta` is not being touched.) |

### Sequencing

1. **W-X1 first** — it carries the only P1, it is VR-neutral, and its negative control (the A/B/C PDF
   experiment) already exists and doubles as the acceptance test.
2. **W-X2a, W-X3, W-X4, W-X7, W-X8** are all S and all VR-neutral — they can run in parallel, subject to the
   standing **≈2 concurrent browser-gated builders** ceiling. W-X8 needs the design ruling before it starts.
3. **W-X2b and W-X5** next — both M, both mobile-geometry; W-X2b owns the `m-walk-*` re-baseline, so **do
   not let W-X5 or W-X6 run concurrently with it** or the churn attribution is lost.
4. **W-X6 LAST and ALONE**, so its 14-baseline re-capture is the only thing moving and the diff is
   reviewable.

### Gate checks each wave must add

| wave | new/extended check | why |
|---|---|---|
| W-X1 | a **print check** — `emulateMedia({media:'print'})` + `page.pdf` page-count assertion on the flagship and the tallest topic, with the released-clamp control as its negative control | the gate has **zero** print coverage |
| W-X2a/b | assert `.seg.offsetHeight === .seg.clientHeight + borderBottom` at ≤919px, **and run it in WebKit** | the whole gate is Chromium-only |
| W-X3 | extend `search_deadend.cjs`: from `#home`, pick a topic result → assert the hash left `#home` | the existing check only walks the 0-hit prompt path |
| W-X4 | extend `overlay_keyboard.cjs`: census every `[role=dialog]` scrollable body for `tabindex`/`role` and assert no content is keyboard-unreachable | the existing check counts stops, not reachable content |
| W-X5 | assert chips are non-zero within N frames of first open, and assert no layout shift after open | first-open-only races need a first-open-only check |
| W-X8 | extend `focus_ring.cjs` to read **`box-shadow`** and assert outline hue == halo hue | it reads `outlineColor` only |

---

## 10. WHAT THIS AUDIT DOES **NOT** COVER

**Engine/platform reality:**

- **Real macOS/iOS Safari.** Every WebKit result here is Playwright's **WebKit 26.5 Windows build**. Font
  resolution, scrollbar mode, form-control chrome and clipboard permissions on genuine Safari can differ.
  Nothing here should be read as a macOS or iOS Safari result. **X2 in particular may be 0 on default iOS**
  (overlay scrollbars) — what *is* proven is that it is not an emulation artifact.
- **Headed Firefox.** All 11 Firefox runs were headless. Glyph rasterisation, subpixel antialiasing, native
  scrollbar chrome and GPU compositing differ headed; any purely-rasterisation defect is outside this.
- **Dynamic browser chrome.** No growing/shrinking URL bar, no momentum, no rubber-banding, no
  scroll-anchoring under a flick. `100vh`/`100dvh`/`visualViewport.height` were all identical here, so the
  entire `vh`-vs-`dvh` bug class is invisible. **X8 is likely worse on real iOS for exactly this reason.**
- **Real safe-area insets.** `env(safe-area-inset-bottom)` measured 0. The app spends those insets in
  `.mockcta`, `.mockbar`, `.scrolltop`, `#_focus-exit`; on a notched iPhone the bottom bar grows and the
  band bottom X7 is measured against moves.
- **Real assistive technology.** No screen reader (NVDA/JAWS/VoiceOver/Orca) was driven anywhere. Every a11y
  claim here — including X4 — is a **keyboard and DOM-attribute** measurement, not an AT measurement.
- **Real scrollbar-mode variation, forced-colors, prefers-contrast, prefers-reduced-transparency,
  non-US keyboard layouts** — all §7b instrument limits.
- **Physical paper.** X1/X6/X9 page counts are Chromium `page.pdf` output.

**Scope the five lenses did not reach** (no lens was dropped; this is honest scope, not a coverage gap):

- **Per-topic content across all 46 topics.** The 9 panes were driven fully on `event-driven`, with
  `content-pipeline`, `kafka-internals`, `debugging`, `probabilistic-structures`, `saga`, `notifications`,
  `consistency-models` and `microfrontend` touched along the topic axis. **The remaining ~38 were not swept
  in any engine.**
- **Dark theme in WebKit only.** `webkit-core` verified it (body `rgb(250,249,245)→rgb(15,14,19)`, hero
  `#006B63→rgb(19,186,172)`, `.ix-c-name` contrast 15.98). **Firefox dark theme is unverified** — the
  `html[data-theme="dark"]` `--topic-ink` overrides at `styles.css:1509` were out of the ff-core brief, and
  the census drove light theme only.
- **390x664** — the stock iPhone descriptor height, i.e. **URL bar SHOWN**, which is the more common
  real-world state. The iphone lens honoured the brief's 390x844 and declared the deviation. 664 shrinks
  the band by 180px and would make X7 and X8 worse.
- **Six of the ten panes at phone width** (`wb`, `sys`, `trade`, `model`, `num`, `rf`, `open`, `viz`) were
  measured by CSSOM/computed-style probe on their attached shadow roots and by an overflow sweep, **not by
  driving their UI**.
- **Overlays not driven at phone width:** mock run, mixed fire, session, gameplan, scope, notes, search.
- **`pre.code` under `overflow-x:auto`** (`styles.css:698`) — the third `overflow-x:auto` surface, and the
  one most likely to share X2's mechanism. **No `<pre>` rendered on any route driven. Untested in every
  engine.**
- **The Visualize pane's intended populated state.** `#viz` renders 69px tall in both engines with the tab
  hidden and WebGL 2.0 available, so its emptiness could not be classified either way.
- **Storage pressure.** The quota-exceeded → in-memory fallback → `storagedegraded` → `.storage-notice`
  path never triggered (storage was healthy on `file://`); the banner is unverified in both engines.
- **Perf and long-session behaviour.** Deliberately not measured — concurrent lenses meant a loaded box, and
  a perf number off a loaded box is worthless. The 572ms/337ms frame gaps behind X5 are real *measurements*
  of a defect's existence, **not calibrated timings**. Longest continuous drive was ~40 interactions; no
  leak testing.
- **Tab-order comparison across engines** — the focus reset did not put all three at a common start point,
  so the observed order divergence is not a controlled measurement. Focus-*ring visibility* was measured
  properly (14/14 stops, ring present, all three engines).

---

## 11. WHAT PASSED — the part that is not a finding

Recorded because "the gate is blind to eight defects" is only half the truth, and the other half is that
both new engines run this app well.

- **Cold boot, both engines:** zero console messages of any severity, zero `pageerror`s, zero
  `requestfailed`, zero dialogs, exactly **one** network request (the file). Asserted with listeners
  attached before `goto` on every run — 22 boots in wk-core, 11 launches in ff-core, 24 boots in wk-iphone,
  18 drives in the census, and every print/offline run. **Not one message.**
- **Offline premise:** static scan of the shipped 12,112,419 bytes finds **zero fetching positions** —
  `src=` 0, `<link href=` 0, `url()` 0, `@import` 0, `fetch(` 0, XHR `.open` 0, `new Worker` 0,
  `serviceWorker.register` 0. All 626 URL-like matches are non-fetching (613 × `www.w3.org` XML namespaces,
  the rest inside syntax-highlighted code samples and a license comment). One `@font-face`, one
  `data:font/woff2`, zero external.
- **Router contract:** all 9 panes by real hit-tested click, `hash` **and** `document.title` correct at every
  step, exactly one `.pane.on`, Back/Forward/reload/cold-deep-link all landing correctly, and the
  direct-entry Back guard working (one Back from a no-referrer cold boot → `#home`, not a blank document).
- **Drill loop:** reveal by Space and by real click, grading by key from `<body>` and by hit-tested shadow
  click, tiles conserved and summing to the bank (21/21 and 22/22 full grinds), debrief rendered, `n`
  correctly no-op mid-unit and correctly advancing the router at `meso`.
- **Overlays:** all four (and all ten dialogs in sequence) open, trap focus shadow-inclusively, close on Esc
  and restore focus — with X4 as the single documented exception.
- **`adoptedStyleSheets`:** all 17 shadow roots carry BASE_SHEET (29 rules) in both engines, and a
  BASE_SHEET rule genuinely **computes** in every root (proven three ways in WK — the `*` reset on shadow
  buttons, `button:focus-visible` on `#jg`/`#jm`, and `@keyframes pop` resolving inside three different
  shadow scopes via real reveals; and in FF by an injected `<p>` computing `margin-top:0px` in all 17).
- **Reduced motion:** all six duration tokens collapse to `0.00001s` and the suppression crosses the shadow
  boundary in both engines; `body` opacity stays 1 and `innerText.length` is unchanged — not the blank-page
  trap.
- **`file://` persistence and theme:** `localStorage` works in both (FF `location.origin === "null"`
  notwithstanding), progress records are **byte-identical across engines**, and both survive a full 12MB
  reload; the theme toggle applies (computed `body` background actually changes) and persists.
- **Horizontal overflow: zero, everywhere.** `document.scrollWidth == clientWidth` on the home and all 9
  panes, at desktop and at 390x844 **and** 844x390, at `scrollY 0` and at the bottom of each pane, scanning
  the document and every shadow root — in all three engines. Under CSS `zoom:1.16` too.
- **The W2 phone acceptance holds in WebKit:** 12/12 measurements PASS across three topics (including the
  43-char title), both orientations, and the `drill → wb → drill` return path. The short-viewport
  breakpoint fires at 844x390 and hands back exactly the 22px it promises, without spending the 44px floor.
- **17 shadow roots, not 18** — measured at boot and again after opening all ten dialogs, in both engines.
  `_search-overlay`, `_index-overlay` and `_notes-overlay` are light DOM. The brief's "18 roots" is off by
  one; **nothing is missing.**

---

*Synthesised from five sweep reports; every source line cited above was independently re-read in
`D:\claude-workspace\deepdive-rehearsal\src\` during synthesis, and every gate-blindness claim in §8 was
verified against `test/` rather than inferred. Source reports:*
`D:\claude-workspace\deepdive-crossengine-2026-07-30\webkit-core.md` ·
`D:\claude-workspace\_xengine-2026-07-30\firefox-core.md` ·
`D:\claude-workspace\deepdive-crossengine-2026-07-30\webkit-iphone.md` ·
`D:\claude-workspace\deepdive-crossengine-2026-07-30\feature-census.md` ·
`D:\claude-workspace\deepdive-crossengine-2026-07-30\firefox-print-offline.md`
