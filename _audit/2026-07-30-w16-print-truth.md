# W-X1 "Print truth" -- freeze report

**Wave:** W-X1, the cross-browser round's only P1 - ship-first
**Branch:** `xb/x1-print-truth` - base `d481901`
**Findings:** X1 (P1), X6 (P2), X9 (P3) from `_audit/2026-07-30-crossbrowser-audit.md`
**Gate:** 67 -> 68. Full capture: `_audit/2026-07-30-w16-print-gate.txt` - **68/68 PASS**
**Review artifact:** `_audit/w16-print-before-after/` - six real A4 PDFs + `make-pdfs.cjs`
**VR:** all 16 chromium baselines byte-identical to base. Nothing in this wave touched screen media.

---

## 1. What was wrong, in one paragraph

The cram sheet is the app's one printable artifact - "read five minutes before a loop" - and its
Print button emitted **one A4 page**, silently dropping most of the sheet, in Firefox 151,
Chromium 149 and WebKit 26.5 alike. `styles.css:509` reset four properties on `.cram-panel`
(`box-shadow`, `max-width`, `border-radius`, `margin`) and it read as complete, because all four
are unmistakably screen chrome. But the panel's screen geometry at `:474` is `overflow:hidden` plus
`max-height:calc(100vh - var(--space-36))`, and **on paper there is no scrollbar**: a height-capped,
overflow-hidden box does not paginate, it truncates. The print stylesheet was 90% right; two missing
resets on one selector cost most of the artifact. Sixty-seven checks did not see it because not one
of them had ever looked at print media.

---

## 2. Per-finding receipts

### X1 (P1) - the sheet prints whole

**Fix:** `src/styles.css:525` - `max-height:none !important; overflow:visible !important` added to
the print block's `.cram-panel` reset; `:536` gives `.cram-body` its `overflow:visible`.

`max-height` needs `!important` to beat **both** caps, and the one that actually applies is not the
one the audit named: the A4 content box is **680px** wide, which is inside the app's `<=919px`
breakpoint, so **every printer lays this sheet out in the app's MOBILE layout** and the operative
cap is the bare `max-height:100vh` at `:2139`, not the desktop `calc()` at `:474`. Measured
pre-fix at the A4 box: `.cram-panel` computed `max-height: 1009px`.

| | flagship `content-pipeline` | `consistency-models` (tallest) |
|---|---|---|
| `#cram` scrollHeight (A4 layout, 681px) | 2774 | 6068 |
| clientHeight - BEFORE | 946 | 946 |
| **clipped - BEFORE** | **1828px (65.9%)** | **5122px (84.4%)** |
| clientHeight - AFTER | 2774 | 6068 |
| **clipped - AFTER** | **0px** | **0px** |
| **real A4 `page.pdf` - BEFORE** | **1 page** (354,602 B) | **1 page** (121,301 B) |
| **real A4 `page.pdf` - AFTER** | **3 pages** (403,453 B) | **7 pages** (746,251 B) |
| last section's heading, page - BEFORE | absent | absent |
| last section's heading, page - AFTER | **3 of 3** | **7 of 7** |
| extracted text per page - AFTER | 1657 / 1664 / 1468 | 2330/2858/2624/2476/2153/2627/1020 |

**3 and 7 are exactly the counts the audit's isolated negative control (B) predicted before any fix
existed.** They were also predicted independently, ahead of the fix, by arithmetic: the content
measured 2774px and 6068px at the A4 content-box width, and `ceil(H / 1009.13)` gives 3 and 7.

**One defect found while measuring, not in the audit.** Because the printer uses the mobile layout,
`.cram-jump` - `display:none` on desktop (`:2120`), `display:flex` under `<=919px` (`:2122`) -
rendered a **7-button scrollable nav strip** across the top of page 1. A dead control surface on
paper, the same class as the walkthrough's Prev/Next pair that `base-styles.js` already hides. Now
in the print block's hide list alongside `.cram-top` (`:531`).

### X6 (P2) - the Print Q&A document gets its tokens

**Fix:** `src/scripts/app/print-qa.js:47` `tokenBlock()`, injected at `:68`.

The popup is a separate `window.open` document containing only its own `<style>`, so the app's
`:root` never reached it and every `var()` resolved to nothing. It owns **Ctrl/Cmd+P**, so this is
what the keyboard shortcut has always produced.

| property | BEFORE (shipped) | AFTER | audit's control column |
|---|---|---|---|
| `h1` font-size | **14px** | **24px** | 24px |
| `h1` font-weight | **400** | **800** | 800 |
| `h2` font-size | **14px** | **16px** | 16px |
| answer `.a` font-size | 14px | **13px** | - |
| `.sig` font-size | 14px | **9px** | - |
| inline `code` | 12.6px | 11.7px | - |
| `body` max-width | **none** | **760px** | 760px |
| `article` margin-bottom | **0px** | **26px** | 26px |
| distinct sizes among title/question/answer/signal | **1** | **4** | - |

Every AFTER value matches the audit's "with app tokens injected" control exactly.

**The values are harvested from the live app, not hardcoded.** The token *names* are read back out
of the CSS string itself (`CSS.match(/var\((--[a-z0-9-]+)\)/g)`), so a token added to that string
tomorrow is carried across automatically - the list cannot rot into a stale copy of the design
system, which is the failure mode that produced the bug. The tokens are `@property`-registered with
a `<length>`/`<number>` syntax, so `getComputedStyle` returns them fully resolved
(`--font-size-display` -> `"24px"`, not `"var(--size-font-24)"`) and one level of copying is
complete. Verified at two viewports; the values are density-driven, not viewport-driven, so the
printed sheet now also follows the reader's `html[data-density]` setting.

### X9 (P3) - page-break control

**Fix:** `src/scripts/app/base-styles.js:69-70`.

BASE_SHEET's print block and `cram-derive.js`'s `.cs-*` vocabulary were **disjoint**: measured under
print emulation, `.card`/`.thread`/`.dec`/`.rf`/`.piv` computed `avoid` while every cram class
computed `auto`. The sheet reaching all 17 shadow roots was never the problem; it simply had nothing
to say about the cram sheet.

```css
.cs-one,.cs-dec,.cs-num,.cs-trap,.cs-ha,.cs-30,.cs-tells li,.cs-spine li{break-inside:avoid}
.cs-st{break-after:avoid}
```

**`.cs-sec` is deliberately excluded.** A whole section is not an atom - the tallest measures 1289px
against a ~1009px A4 content box, so `break-inside:avoid` on it is a constraint the fragmenter must
ignore (a box that cannot fit on an empty page is split anyway) and the only thing it can buy is a
page-sized hole before the split. What is genuinely atomic is one cue-and-answer, one decision, one
trap, one number row; a section head is kept with what follows by `break-after`, not by being welded
to the section. This is the "modest, no page-per-section theatrics" the brief asked for, and the
gate's upper page-count bound is what would catch it if a later edit got greedy.

---

## 3. The gate's first print check

`test/print_truth.cjs`, registered at `test/check_all.py:660`. **67 -> 68.**

Five arms: geometry, real A4 pagination, last-section-on-the-final-page, Print Q&A tokens, and
page-break control - run against both the flagship and the tallest topic.

**The page-count band is arithmetic, derived from a height measured in the same run** - a count
someone once observed and typed in is the anti-pattern this avoids.

- **Lower bound `ceil(H / 1122.52)`** - content of height H cannot fit in fewer pages, and 1122.52
  is the *full* A4 height, so the bound holds whatever margin the printer applies. Deliberately the
  weaker of the two available floors: the tighter one (`H / 1009.13`) would be asserting the 1.5cm
  margin as well as the pagination, and a margin assumption is not what the arm is for.
- **Upper bound `ceil(H / 1009.13) + 2`** - the tight floor plus honest headroom, since
  fragmentation can only add pages. This is what catches a runaway X9.

Observed: flagship `pages=3, band=[3,5]`; consistency-models `pages=7, band=[6,9]`.

**The final-page arm reads the PDF page tree.** "The last section is somewhere in the PDF" and "the
last section is on the last sheet of paper" are different claims, and only the second is the
acceptance test. The extractor walks `/Type /Pages /Kids` in page order, follows each `/Page`'s
`/Contents` into the Form XObject Chromium puts the marking operators in, decodes Type0/Identity-H
glyph IDs through each font's `/ToUnicode` CMap, and returns text **per page**.

### Three negative controls, two of which abort rather than fail an arm

1. **Print media is asserted live in-page** (`matchMedia('print').matches`) before anything is read.
   Everything downstream is meaningless otherwise, so a false here aborts the run.
2. **A planted class-less div in the cram shadow root must still read `break-inside:auto`** while
   the cram units read `avoid`. If everything reads `avoid`, the X9 arm cannot fail, so it is not
   run. Observed `control=auto` on every run, before and after.
3. **The PDF text extractor must find the FIRST heading before it is allowed to report on the last.**
   A dead extractor must not be able to buy a green *or* a red. This one is load-bearing and it was
   demonstrated, not assumed - see below.

### The extractor's own negative control, executed

Pointed at the **committed** before/after PDFs (the reader is exported, so this needs no browser):

```
before content-pipeline     pages=1 firstHeadPage=1 lastHeadPage=0 FINAL-PAGE ARM=FAIL perPageChars=1643
after  content-pipeline     pages=3 firstHeadPage=1 lastHeadPage=3 FINAL-PAGE ARM=PASS perPageChars=1657/1664/1468
before consistency-models   pages=1 firstHeadPage=1 lastHeadPage=0 FINAL-PAGE ARM=FAIL perPageChars=2784
after  consistency-models   pages=7 firstHeadPage=1 lastHeadPage=7 FINAL-PAGE ARM=PASS perPageChars=2330/2858/2624/2476/2153/2627/1020
```

The instrument reads the BEFORE PDFs perfectly well - the first heading is found on page 1 in all
four cases - so the red belongs to the artifact, not the reader. The per-page character
distribution is also what distinguishes "7 real pages" from "1 page of text and 6 blanks".

---

## 4. Watched-red - the pre-fix capture, verbatim

`test/print_truth.cjs` was written **before** any fix and run against the unmodified build at base
`d481901`. **36 assertions RED.** Every control passed, so the red is the app's.

```
  PASS  [content-pipeline] print media emulation is ACTIVE  matchMedia(print)=true
  PASS  [content-pipeline] viewport is the A4 content box  innerWidth=681 expected=681
  PASS  [content-pipeline] the cram sheet rendered sections  sections=7
  FAIL  [content-pipeline] .cram-panel has NO height cap on paper  max-height=1009px
  FAIL  [content-pipeline] .cram-panel does NOT hide overflow on paper  overflow=hidden/hidden
  FAIL  [content-pipeline] #cram overflow is visible on paper  overflow-y=auto
  FAIL  [content-pipeline] #cram clips NOTHING  scrollH=2774 clientH=946 clipped=1828px
  PASS  [content-pipeline] .cram-top (close/print controls) does not print  display=none
  FAIL  [content-pipeline] .cram-jump (section nav) does not print  display=flex
  PASS  [content-pipeline] NEGATIVE CONTROL: a class-less div still reads break-inside:auto  control=auto
  FAIL  [content-pipeline] .cs-one avoids splitting across a page  break-inside=auto
  FAIL  [content-pipeline] .cs-ha avoids splitting across a page  break-inside=auto
  FAIL  [content-pipeline] .cs-trap avoids splitting across a page  break-inside=auto
  FAIL  [content-pipeline] .cs-dec avoids splitting across a page  break-inside=auto
  FAIL  [content-pipeline] .cs-num avoids splitting across a page  break-inside=auto
  FAIL  [content-pipeline] .cs-tells li avoids splitting across a page  break-inside=auto
  FAIL  [content-pipeline] .cs-spine li avoids splitting across a page  break-inside=auto
  FAIL  [content-pipeline] .cs-st keeps its section head with what follows  break-after=auto
  FAIL  [content-pipeline] A4 page count reaches the floor implied by the content  pages=1 floor=ceil(2774/1009.13)=3
  PASS  [content-pipeline] A4 page count is not inflated by runaway fragmentation  pages=1 ceiling=5
  ctrl  [content-pipeline] extractor liveness: FIRST heading "The spine - what you draw" found in PDF text (1643 chars)
  FAIL  [content-pipeline] the LAST section reaches the paper  last heading="If they say "quickly" - the 30 seconds" pages=1
  PASS  [consistency-models] print media emulation is ACTIVE  matchMedia(print)=true
  PASS  [consistency-models] viewport is the A4 content box  innerWidth=681 expected=681
  PASS  [consistency-models] the cram sheet rendered sections  sections=7
  FAIL  [consistency-models] .cram-panel has NO height cap on paper  max-height=1009px
  FAIL  [consistency-models] .cram-panel does NOT hide overflow on paper  overflow=hidden/hidden
  FAIL  [consistency-models] #cram overflow is visible on paper  overflow-y=auto
  FAIL  [consistency-models] #cram clips NOTHING  scrollH=6068 clientH=946 clipped=5122px
  PASS  [consistency-models] .cram-top (close/print controls) does not print  display=none
  FAIL  [consistency-models] .cram-jump (section nav) does not print  display=flex
  PASS  [consistency-models] NEGATIVE CONTROL: a class-less div still reads break-inside:auto  control=auto
  FAIL  [consistency-models] .cs-one avoids splitting across a page  break-inside=auto
  FAIL  [consistency-models] .cs-ha avoids splitting across a page  break-inside=auto
  FAIL  [consistency-models] .cs-trap avoids splitting across a page  break-inside=auto
  FAIL  [consistency-models] .cs-dec avoids splitting across a page  break-inside=auto
  FAIL  [consistency-models] .cs-num avoids splitting across a page  break-inside=auto
  FAIL  [consistency-models] .cs-tells li avoids splitting across a page  break-inside=auto
  FAIL  [consistency-models] .cs-spine li avoids splitting across a page  break-inside=auto
  FAIL  [consistency-models] .cs-st keeps its section head with what follows  break-after=auto
  FAIL  [consistency-models] A4 page count reaches the floor implied by the content  pages=1 floor=ceil(6068/1009.13)=7
  PASS  [consistency-models] A4 page count is not inflated by runaway fragmentation  pages=1 ceiling=9
  ctrl  [consistency-models] extractor liveness: FIRST heading "The spine - what you draw" found in PDF text (2784 chars)
  FAIL  [consistency-models] the LAST section reaches the paper  last heading="If they say "quickly" - the 30 seconds" pages=1
  PASS  Print Q&A opens its document
  PASS  Print Q&A: print media emulation is ACTIVE  matchMedia(print)=true
  PASS  Print Q&A: the probe bank rendered  articles=22
  FAIL  Print Q&A: h1 is larger than h2  h1=14px h2=14px
  FAIL  Print Q&A: h2 is larger than the answer body  h2=14px answer=14px
  FAIL  Print Q&A: title / question / answer / signal are four DISTINCT sizes  h1=14 h2=14 a=14 sig=14
  FAIL  Print Q&A: the title is actually bold  font-weight=400
  PASS  Print Q&A: inline code is distinguishable from prose  code=12.6px answer=14px
  FAIL  Print Q&A: the page has a measure (body max-width resolves)  max-width=none
  FAIL  Print Q&A: Q&A blocks are separated  article margin-bottom=0px
  PASS  no page errors during the print run
  ----  pdf summary: {"content-pipeline":{"pages":1,"floor":3,"H":2774,"bytes":354602,"clipped":1828,...},
                      "consistency-models":{"pages":1,"floor":7,"H":6068,"bytes":121301,"clipped":5122,...},
                      "print-qa":{"pages":8,"bytes":114633}}
print_truth: 36 FAILED -- [content-pipeline] .cram-panel has NO height cap on paper  max-height=1009px
EXIT=1
```

*(Two arms legitimately passed pre-fix and are kept honest rather than tuned to fail: the upper
page-count bound - 1 page is not "too many" - and Print Q&A's inline `code`, which is sized in `em`
and so survived the token collapse. `.cram-top` also already hid correctly. The final-page arm
above reads "reaches the paper"; it was strengthened to "ON THE FINAL PAGE" in the second commit,
and that stronger form is separately shown red against the committed before-PDFs in section 3.)*

After the fix, every one of these is PASS - see `_audit/2026-07-30-w16-print-gate.txt`.

---

## 5. VR - byte-identical, as designed

This wave was **VR-neutral by construction**: no committed baseline is captured under print
emulation, `print-qa` is a separate document, and every rule changed lives inside `@media print` or
inside BASE_SHEET's `@media print` block. Zero screen pixels change.

Verified, not assumed:

- `visual_regression` **PASS** in the gate of record - 16 baselines, `win32-chromium149`, every
  capture reached a proven rest state across all 18 roots, cleared the blank-page floor, and
  matched its committed pixels.
- `git diff --stat d481901 HEAD -- test/baselines/` is **empty**: all 16 baseline PNGs are
  **byte-identical to the wave's base**. No `--update` was run at any point.

`.gitattributes` gained `*.pdf binary` in the same commit. The repo pins `* text=auto eol=lf` and
was explicit about `*.png` for exactly this reason; a PDF carries FlateDecode streams whose bytes
include CR and LF, and EOL-normalising one produces stream lengths that no longer match their
`/Length` entries - a corrupt PDF checked out silently on the next Windows clone.

---

## 6. Gate summary

**68/68 PASS**, no SKIP, on the committed tree. `_audit/2026-07-30-w16-print-gate.txt`.

`build_integrity` confirms `COMMITTED deliverable == fresh build of HEAD`.

Commits on `xb/x1-print-truth`:

```
2251ce7  xb(x1): the cram sheet prints whole -- two missing resets cost 66-84% of the artifact
59221cb  xb(x1): the final-page arm reads the PDF page tree, not the whole document
```

---

## 7. Notes for whoever picks this up

- **The printer uses the MOBILE layout.** The A4 content box is 680px, inside the `<=919px`
  breakpoint. Any future print work must be measured at that width, not at 1280px - the desktop
  cap at `:474` is not even the rule that applies. This is also why `.cram-jump` was printing.
- **X8 is still open and is adjacent.** The audit's X8 (the panel is 18px taller than the space it
  is given, `:2139` vs `:2144`) lives in the same `<=919px` block this wave had to reason about.
  Untouched here - it is a screen defect and would churn baselines.
- **The audit reported Print Q&A at 11 A4 pages; this wave measures 8** (114,633 B vs the audit's
  114,518 B - essentially the same document). The difference is margins: the popup declares no
  `@page`, so under `preferCSSPageSize` it paginates at Playwright's default margin rather than the
  1.5cm the app's own stylesheet gives the cram path. Nothing asserts a page count for print-qa, so
  no arm depends on this, but the discrepancy is real and named rather than quietly reconciled.
  Giving that document its own `@page` is a reasonable follow-up.
- **`test/print_truth.cjs` exports `parsePdf` / `norm` / `pdfPageCount`** and guards its run on
  `require.main`, so the PDF reader can be pointed at any committed artifact without a browser.
- **Regenerating the artifact pair:** `node _audit/w16-print-before-after/make-pdfs.cjs [before|after]`.
  It drives the gate check rather than re-implementing it, so producing the BEFORE pair exits
  non-zero - correct, since the before build is the broken one.
