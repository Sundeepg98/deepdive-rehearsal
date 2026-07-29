<!-- COMMITTED VERBATIM. Authored by w4-verifier (cold -- no context shared with w14-builder);
     committed by w14-builder because the verifier has no write access to this worktree. Not one
     word of the verdict below is edited: it is the record of what an independent reader found,
     including where it disagrees with the freeze report beside it.

     TWO ANNEXES stay in session scratch and are NOT reproduced here (they are ~1,600 lines of
     per-finding adjudication):
       GUARD-ADJUDICATION.md   every guard broken on purpose, control by control
       SRC-ADJUDICATION.md     the source-side reading behind sections 3-7
     Both live beside the verifier's instruments and raw data at the scratch path named in
     section 0. If that path has been reaped, the reproducible part is the instruments -- the
     verdict names all six and what each measured.

     Round-3 disposition of the nine non-blocking findings is recorded in the freeze report's
     round-3 addendum: F-1/F-3/F-4/F-7/F-8/F-9 fixed, F-5/F-6 fixed as guard-integrity code,
     F-2 carried forward to a future wave as a ledger entry. -->

# W4 COLD VERIFICATION -- VERDICT

**VERDICT: CLEAN.** No BLOCKING finding. Nine NON-BLOCKING findings: seven are defects in the
RECORDED WORDING rather than in the shipped code (F-1, F-3, F-4, F-7, F-8 and the two halves of
F-9's prose), one is a 1px type change the separability note does not disclose (F-7), and two are
pre-existing weaknesses in guards this wave did not write but whose stakes it raised (F-5, F-6 --
F-6 is the strongest carry-forward). Every load-bearing number in the freeze reproduced on
instruments built independently of the builder's, and every number that did NOT reproduce at first
-- the p50/p90, the line totals, the tab-stop index, the four VR pixel counts -- reconciled to a
convention the freeze or its checks state, not to an error.

**Target:** `frontend/w4-longform-sidebar` @ `6ca159f`, base `e13217c`, worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\w14-longform` (tree clean at start and at end).
**Verifier:** w4-verifier, cold -- no context shared with w14-builder.
**Scratch (all instruments + raw data):**
`C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w4-verify\`

---

## 0. METHOD, AND WHAT MAKES THESE GREENS WORTH ANYTHING

Every number below comes from an instrument I wrote from the app source, not from
`_audit/2026-07-29-w4-census.cjs`. I read that file only AFTER my own numbers were in hand, and
only to explain the two places we disagreed. Both sides of every comparison are the COMMITTED
deliverables -- `git show e13217c:deepdive_content_pipeline_rehearsal.html` (md5 `d0409385`) and
the tree's own (md5 `5d868341`, identical to the tracked file) -- extracted into scratch, never
built in place.

Instruments and their negative controls:

| instrument | what it measures | its negative control | control demonstrated? |
|---|---|---|---|
| `census-a.cjs` | cram heights, `.cs-*` counts/computed style, `.dec-tell` weights/lines/contrast, 46 topics | two independent line-count methods (Range rects vs height/line-height) cross-checked per tell | yes -- they disagree on 28 of 324, which is how I found the merge question |
| `census-b.cjs` | switcher at 9 widths, 46-topic ratio population, fold, real Tab walk, button font walk | a PLANTED bare `<button>` must NOT match `<body>`'s family | yes -- planted button reads `Arial`, body reads the app stack |
| `fontprobe.cjs` | the face Chromium ACTUALLY rasterised, via CDP `CSS.getPlatformFontsForNode` | CTRL-bare must render the UA face; CTRL-inherit and a `<p>` must render the body face | yes -- `Arial:11` vs `Segoe UI:11` vs `Segoe UI:13` |
| `slice2.cjs` | the declined `.a` first-sentence slice, my own slicer | the freeze's five named survivors must reproduce by id+index | yes -- all five byte-exact |
| `vrdiff2.cjs` | per-baseline changed pixels at the check's own `CHANNEL_TOL=2`, x/y band occupancy | manifest sha256 re-hashed from the files on disk | yes -- 16/16 match |
| `boxes.cjs` | whether sub-scope A's surfaces render at all on the baseline routes | rendered AREA, not DOM presence (the `opacity:0` trap `_pixels.cjs` documents) | yes -- `.dec-tell` is present-but-zero-area, which a DOM-only probe would have called "present" |

I also ran the wave's own guards, and BROKE each of their controls to prove the controls can fail.

---

## 1. THE SCOREBOARD, RE-DERIVED

Pre-fix build vs the committed deliverable, my instruments, 46 topics, 1280x800 unless stated.

| freeze claims | I measured | verdict |
|---|---|---|
| `.cs-cue` `inline`/400 -> `block`/700 | `inline/400/15px` -> `block/700/15px`, identical on all 46 | EXACT |
| inline `.cs-arr` per cram sheet 9 -> 0 | inside `.cs-spine`: 9 -> 0 per sheet, **415 -> 0** corpus-wide; sheet TOTAL 16 -> 7 (the 7 `.cs-dec` arrows survive) | EXACT, see F-1 |
| cram flagship 3101 -> 3194 (+3.0%) | 3101 -> 3194 | EXACT |
| sharding-strategies 6679 -> 6749 | 6679 -> 6749 | EXACT |
| consistency-models (corpus max) 7724 -> 7793 | 7724 -> 7793, and it IS the max on both sides | EXACT |
| corpus p50 5325 -> 5442 | upper-median s[23] 5325 -> 5442 (my mid-average gives 5318 -> 5423) | EXACT once the percentile convention is fixed |
| ceiling 9000 = max x 1.155 | 9000 / 7793 = **1.1549** | EXACT |
| `.dec-tell` 700 -> 500, `b` stays 700 | `700/700` -> `500/700`, single distinct value across all 46 | EXACT |
| tell / `b` contrast 5.89 : 8.69, unchanged | 5.89 / 8.69 on BOTH sides, single distinct value across all 46; size 14px both sides, so the 4.5:1 normal-text floor applies at both weights and both clear it | EXACT |
| total rendered lines 1577 -> 1532 (-45) | **1577 -> 1532** by the freeze's stated method (distinct rounded Range-rect tops) | EXACT |
| topics fewer / unchanged / more = 23 / 22 / 1 | **23 / 22 / 1** | EXACT |
| multi-region `[5,5,7,10,6,6,5]` -> `[5,5,6,9,6,5,5]` | identical | EXACT |
| content-pipeline line vector UNCHANGED | `[1,1,1,1,2,1,2]` both sides | EXACT |
| cdc's third tell 7 -> 9 (the honest exception) | `[5,6,7,7,...]` -> `[5,5,9,7,...]` | EXACT |
| latent-Arial 15 -> 0, 253 buttons walked | debt json 15 entries -> `{}`; guard walks **253**; 0 in the UA default | EXACT, see F-2 |
| `.tn-current` 18/146 = 0.123 -> 103/142 = 0.725 at 1024/1280/1440/1600/1920 | identical at all five, both sides | EXACT |
| mobile 360/500/600/919 unchanged at 1px clip | clientWidth **1px** at all four, before AND after | EXACT |
| tabs above fold 4 -> 7 (6 fully) | anyAbove 4 -> 7, fullyAbove 3 -> 6 | EXACT |
| `num` misses full visibility by ~3px | `num` bottom 802.6 against an 800 fold = **2.6px** | EXACT |
| `.seg` top 617 -> 477 | 617.1 -> 476.6 | EXACT |
| first `.seg` tab stop 13th -> 9th of 35 | 32nd -> 28th of 54 whole-document; minus the 19 stage+companion stops that precede the sidebar = **13th -> 9th of 35** | EXACT once the walk origin is fixed |
| gate 66 -> 67 checks | see section 9 | -- |

**The two initial disagreements, both resolved to convention, not error:**

1. **p50/p90.** My mid-average median gave 5423/6393 against the freeze's 5442/6462. The sorted
   corpus is `... s[22]=5404, s[23]=5442 ...` and `s[40]=6393, s[41]=6462`: the freeze indexes the
   upper element, I averaged the pair. `cram_surface.cjs` prints `p50 5442 p90 6462` itself, so the
   freeze is quoting its own check. Min (3194) and max (7793) -- which have no convention -- match
   exactly on both sides.
2. **Line totals.** My first counter merged rect tops within 4px and gave 1531 -> 1484 (-47).
   Re-run with NO merge -- the method the freeze states -- it gives **1577 -> 1532 (-45)**, and the
   23/22/1 split and the cdc 7->9 exception fall out exactly. The merged variant makes the wave look
   slightly BETTER (-47), so nothing is being flattered by the published method.

---

## 2. THE DECLINES' RECEIPTS -- the freeze's strongest claims, re-derived

I wrote my own first-sentence slicer (abbreviation, decimal, ellipsis and initial guards) and ran it
over `TopicRegistry.get(id).data.wb.steps[].a` for all 46 topics. Raw, it disagreed with the freeze.
Normalised to the freeze's own convention -- HTML tags and entities stripped, indices 1-based -- it
lands on top of it:

| | freeze | mine |
|---|---|---|
| authored steps | 415 | **415** |
| answers the slice CHANGES | 366 (88%) | 364 (88%) |
| authored spine text | 130,801 -> 47,484 (64% removed) | **130,882 -> 47,886 (63% removed)** |
| GUTTED under 25% | 122, across 37 topics | **125, across 38 topics** |
| cannot shorten (single-sentence) | 49 (13%) | 51 (12%) |

The residual +-2 is my abbreviation guards against theirs. Note the direction: my slicer finds the
gutting slightly WORSE than the freeze reports (125 across 38 vs 122 across 37), so the decline is
if anything under-argued.

**All five named verdict-first survivors reproduce byte-exactly** (source chars -> sliced chars, and
the surviving string):

```
consistent-hashing[6]   301 ->  3ch  "No."                                 EXACT
error-propagation[8]    466 -> 11ch  "Additively."                         EXACT
idempotency[5]          268 ->  9ch  "It races."                           EXACT
sharding-strategies[5]  629 -> 22ch  "Underneath each shard."              EXACT
consistency-models[5]   907 -> 34ch  "Draw two arrows and one non-arrow."  EXACT
```

My own worst list adds two the freeze did not name and which strengthen it further:
`soft-delete[6]` 289 -> 3ch `"No."` and `feature-flags[8]` 172 -> 5ch `"Data."`.

**The string-coverage guard would indeed trip.** `cram_surface.cjs` guard 3 asserts the full
`wb.steps[].a` text appears in the rendered sheet; a first-sentence slice changes 364-366 of 415
answers, so it trips on every changed step. (Precision nit, F-6: it trips on the ~366 CHANGED
answers, not literally "every step" -- the 49 single-sentence answers the freeze itself counts are
unaffected. The operative conclusion, that the slice cannot ship without weakening this check, is
untouched.)

**The 3-line-cap decline.** The freeze says the cap would hide authored content on "~38 of 46
topics". Measured: **41 of 46** topics carry at least one tell over 3 lines, 221 of 324 tells are
over 3 lines, and a 3-line cap would hide **598 of 1532 rendered lines (39%)**. The freeze
understates its own case; the decline holds a fortiori.

**Supporting receipts for P3-4's load-bearing half.** The diff of `88e4736` against
`src/scripts/app/trade-offs.js` is exactly one declaration changed --
`font-weight:var(--font-weight-bold)` -> `var(--font-weight-medium)` -- plus a comment; every other
declaration in the rule, `--teal` included, is byte-identical, and the commit touches only that file
and the deliverable. I counted **262 authored `<b>` spans across the 324 tells, in 36 of 46
topics**, identical pre and post: those are the spans that were rendering at 700 inside a 700 block,
i.e. as no emphasis at all. (Precision nit: the freeze's "324 tells' worth of authored emphasis"
describes the block population, not the span count -- 262 is the span figure.)

**The mirror genuinely follows the composer.** `cram_surface.cjs:417-418` composes
`'<span>' + s.c + '</span>' + (s.c ? ' ' : '') + s.a`; `cram-derive.js:92` composes
`'<span class="cs-cue">' + c + '</span> ' + a`. Same separator, and the mirror deliberately does not
call the function it mirrors. The `.cs-spine li` textContent confirms it end-to-end: the pre-fix
sheet extracts as `"...what fires it.->processUpload(key, bucket)..."` and the shipped one as
`"...what fires it. processUpload(key, bucket)..."` -- the deliberate literal space survives
extraction, exactly as the code comment claims.

---

## 3. P2-4's STALE-PREMISE CORRECTION -- the most falsifiable claim in the freeze, and it holds

The freeze asserts the audit's stated remedy (`styles.css:1658-1677`, a `.tn-trigger` flex-wrap
gated to `@media(max-width:600px)`) had ALREADY become dead code when W2 merged. Measured on the
**pre-fix** build, isolated context per width, `innerWidth` asserted:

| width | computed `flex-wrap` of `.tn-trigger` | `.tn-current` clientWidth |
|---|---|---|
| 360 | `nowrap` | **1px** |
| 500 | `nowrap` | **1px** |
| 600 | `nowrap` | **1px** |
| 919 | `nowrap` | **1px** |

The wrap the audit pointed at did not apply at any width it was written for, and the value box was
clipped to 1px underneath it. **The premise was stale and the correction is right.** Post-fix,
`flex-wrap` is `wrap` at 1024+ and still `nowrap` at 360/500/600/919 with clientWidth still 1px --
the fresh `>=920px` rule is the live mechanism and mobile is untouched.

Source side (independently adjudicated, receipts in `SRC-ADJUDICATION.md` section A): the specificity
arithmetic is right ((0,2,0) beating (0,1,0), later in the file); the dead declarations ARE deleted
from the `<=600px` block; the `min-height:44px` tap floor IS kept; the fresh `@media(min-width:920px)`
rule is present; the history note pointing readers at it is present. One correction, F-3 below.

---

## 4. P2-6 AS A DOM MOVE -- proved by the one thing `order` cannot do

`order` reorders paint and never tab order. So the decisive test is not "is there an `order`
property" but "did the TAB ORDER move". I walked it for real -- press Tab, read the deepest
`activeElement` through shadow roots, until focus wraps:

```
PRE  ... 27 #inttog  28 .textzoom-btn  29 .textzoom-btn  30 .pomodoro-play  31 .pomodoro-reset
         32 [seg:walk] ... 40 [seg:open]  41 #idxopen.crambtn ...     (54 stops)

POST ... 27 #inttog  28 [seg:walk] ... 36 [seg:open]
         37 .textzoom-btn  38 .textzoom-btn  39 .pomodoro-play  40 .pomodoro-reset
         41 #idxopen.crambtn ...                                      (54 stops)
```

The four set-once controls moved from BEFORE the nav to AFTER it, and the nav is reached **4 stops
earlier by keyboard**. Computed `order` on `.seg` is `0` on BOTH builds, and the source diff
introduces no new `order:` declaration anywhere (the whole `order:` set in `styles.css` is
byte-identical pre/post). A `order:`-based fix could not have produced this walk.

The freeze's "13th of 35" is this same walk scoped to the sidebar region: 54 total minus the 19
stage + companion stops that precede it = 35, and 32 -> 28 becomes **13th -> 9th**. Both counts are
correct; theirs is scoped to the region the finding is about.

`styles.css:628` does carry the comment explaining why, and all three old-anchor comments
(`text-zoom.js`, `pomodoro.js`, `index.html`) are rewritten rather than left lying. One note, F-4.

---

## 5. THE GUARDS -- watched-reds reproduced, and every control BROKEN on purpose

### `sidebar_geometry` (new, 66 -> 67)

**Watched-red reproduced exactly on the pre-fix deliverable: 11 of 13 assertions FAIL** -- 18/146 =
0.123 at all five desktop widths (both arms), and 4 of 9 tabs above the fold, `.seg` top 617,
sidebar scrollHeight 1650. Identical to my own instrument's numbers.

**Threshold populations re-derived over all 46 topics at 1280px, my instrument:**

| | ratio | clientWidth |
|---|---|---|
| pre-fix | 0.063 .. 0.243 | **18px on every one of the 46** |
| fixed | 0.365 .. 1.000 | **103px on every one of the 46** |

Nothing lies in 0.243 .. 0.365, so 0.30 separates them with real margin on both sides. The named
worst case is right: `debugging` at 103/282 = **0.3652**, "Production Debugging and Incident
Diagnosis". `MIN_PX = 60` is genuinely name-independent -- clientWidth is a single constant across
all 46 on both sides, so it survives a future title that drags the ratio down. The refusal to pin
`MIN_RATIO` at today's floor of 0.365 is correct guard design.

**Both negative controls BROKEN, on the shipping build:**

| mutant | result |
|---|---|
| control 1 neutered (never inject the forced-off style) | `FAIL -- forced-off ratio 0.725 vs live 0.725`, check exits **1** |
| control 2 shift forced to 0 | `FAIL -- shifted count 7 vs live 7`, check exits **1** |

Neither control can pass without doing its job. (One caveat, F-5: control 1 tests an ABSOLUTE
threshold, so on a build already below the floor it passes vacuously -- which is exactly what
happened on my pre-fix run. It cannot manufacture a green, because such a build is already red on
all ten switcher assertions, but it is uninformative there.)

### `cram_surface` height arm

`node test/cram_surface.cjs --plant` -> `consistency-models 10661px (15.2 screens, 1661px over)`
against the 9000 ceiling. **Byte-exact to the freeze.** The same run prints `p50 5442 p90 6462`,
confirming the percentile convention above, and `body 703px`, confirming the screens divisor. The
per-run 400px control is present and armed. The ceiling's anchoring (max x 1.155 = room for one
extra authored whiteboard step on a 9-step topic) is arithmetically right: 9000/7793 = 1.1549.

### `focus_ring`, 6th arm

**Watched-red reproduced on the pre-fix build:**
`FAIL .piv-jump ... outline=3px none rgb(255, 255, 255) offset=2px vs --acc rgb(150, 61, 134)`.
The assertion reads the style KEYWORD, not just the width, so `3px none` -- a 3px-wide nothing --
cannot pass as a ring. It opens the `<details class="piv">` before measuring. PASS on the shipped
build.

### `latent_arial` at an empty baseline

- Shipped build: **253 buttons walked over 4 surfaces, 0 in the UA default, 0 allowlisted, 0 NEW,
  0 STALE -> PASS**, with the self-test line reporting all three controls.
- **I planted a real bare `<button class="w4v-planted-bare">` into a copy of the deliverable.** The
  guard walked 254 and reported `NEW 1 x .w4v-planted-bare` -> **FAIL**. The ratchet fires at an
  empty baseline against a real button, not just against its own probe.
- **Controls broken:** forcing control A false -> `SELF-TEST ABORT: CONTROL A ... the detector is
  blind`, exit 1. Forcing control B false -> `SELF-TEST ABORT: CONTROL B ... the detector flags
  everything`, exit 1. Neither degrades to a pass.

---

## 6. THE LATENT-ARIAL CLAIM, MEASURED AT THE RASTERISER

Computed `font-family` is the SPECIFIED stack, not the face that got drawn, so I went one level
lower with CDP `CSS.getPlatformFontsForNode`. Controls first: a bare `<button>` draws in `Arial`, a
`font:inherit` button and a `<p>` both draw in `Segoe UI`. The detector can see the defect.

**Every component the wave claims to have fixed moved at the rasteriser**, pre -> post:

```
#_focus-toggle   Arial                        -> Segoe UI
.cmp-fold        Arial                        -> Segoe UI
.scrolltop       Arial                        -> Segoe UI
.tn-step         Arial                        -> Segoe UI
.cmp-rel         Arial + Arial                -> Segoe UI Semibold + Segoe UI
.tn-trigger      Cambria Math + Arial Black + Arial -> Cambria Math + Segoe UI Black + Segoe UI
.crambtn cram-tog  ... + Arial Black + Arial  -> ... + Segoe UI Semibold + Segoe UI Black
```

Two things that look like misses and are not:

- `.crambtn` (13 nodes) and `#homeBtn.tn-step.tn-home` still report `Arial:1` post-fix -- but their
  SPECIFIED stack is now the correct app stack (it was the bare UA `Arial` before), and the count is
  **one glyph**. CDP reports the node's own direct text; these buttons' direct text is a single icon
  character (`"\u2302"` for tn-home) that Segoe UI does not carry, so Chromium falls back for that
  one glyph. Their label text sits in child spans and now inherits the app stack. Not a miss.
- Source-side, the debt list is genuinely `{}` and the 15 pre-fix entries are gone.

**Carry-forward, out of this wave's scope (F-2):** 26 buttons still RENDER in Arial on this box --
including all nine `.seg` pane tabs, `.textzoom-btn`, `.inttog`, `.flow-pip`, `.nd-go`, `.mockbtn` --
because `styles.css:320` and 16 sibling rules specify `-apple-system,sans-serif`, and on Windows
`-apple-system` does not resolve, so the generic `sans-serif` wins, which is Arial. This is
**pre-existing and byte-identical pre/post** (same components, same glyph counts on both builds),
and it is invisible to `latent_arial` by design -- the guard's question is "does this button carry
NO author family", and these carry one. The freeze's "15 -> 0" is true of the ledger it names. The
wave is not responsible for these, but "latent Arial is at zero" is true of the guard's definition,
not of the screen.

---

## 7. VR, AT THE OBJECT LEVEL

Diffed every baseline `e13217c` -> HEAD with the repo's own PNG decoder and the check's own
`CHANNEL_TOL = 2`.

- **14 baselines differ; `home-light` and `home-dark` are BYTE-IDENTICAL (0 px).** Exactly as claimed.
- **All four contested px counts reproduce byte-exactly:** `drill-light` **73515**,
  `drill-dark` **82382**, `m-walk-light` **3016**, `m-walk-dark` **2431**. (At exact equality
  instead of the check's tolerance they read 91231 / 90589 / 5426 / 3198 -- the tolerance is the
  difference, and the freeze is quoting the check's own metric.)
- **Manifest:** 16 entries, every `sha256` re-hashed from the file on disk -> **0 mismatches**. The
  `env`, `capture` and `tolerance` blocks are UNCHANGED; only `generated` moved (11:02Z -> 17:00Z)
  and exactly 14 `sha256` fields changed -- the same 14 PNGs. The baseline key set is identical.
- **Spatial confinement, measured rather than eyeballed.** For every desktop baseline the changed
  columns occupy exactly two bands: `x 3..294` and `x 1254..1257`. Live measurement puts `.sidebar`
  at `x 0..296` and `.cmp-fold` at `x 1244..1268, y 12..36`; the second band sits at `y 22..27`,
  inside `.cmp-fold`. **Nothing changed between x=295 and x=1253** -- the centre stage and the
  companion rail are untouched, by measurement.
- **`m-walk-*`:** changed rows are `y 85..99` and `y 784..843` only. The mobile topic-nav chrome sits
  at `y 56..123`, and the viewport is 844 tall. **Nothing changed between y=100 and y=782** -- the
  walkthrough content is pixel-identical. The freeze's reason for leaving these red in round 1 (the
  churn was latent-Arial on mobile chrome, NOT `.dec-tell`/cram) is correct at the pixel level.
- **SUB-SCOPE A CONTRIBUTES ZERO PIXELS TO ANY COMMITTED BASELINE -- the separability claim the
  operator gate relied on.** Not inferred from the route list; measured. On all seven baseline
  surfaces (`walk`, `drill`, `sys`, `num`, `wb`, `home`, `m-walk`): `.cs-cue` / `.cs-arr` /
  `.cs-spine` count **0**, `#cramov.open` is **false**, and `.dec-tell` -- which IS in the DOM, 7 of
  them -- has a total rendered area of **0**. A DOM-presence probe would have called that "present";
  area is the honest measure, and it is zero on every one.

---

## 8. REVIEW PAIRS

Re-ran the committed `_audit/2026-07-29-w4-pairs.cjs` with the pre-fix build as BEFORE and the
committed deliverable as AFTER, into scratch:

- **14 shots, 7 pairs, every frame asserted and matched**, exit 0. Clips identical to the committed
  `INVENTORY.json` (`560x764@360,18` cram, `664x800@296,0` trade, `308x800@0,0` sidebar), same
  themes, same topics, same byte sizes, `framesMatched: true`, `frameProblems: []`.
- **13 of the 14 PNGs are BYTE-IDENTICAL to the committed images.** The 14th
  (`sidebar.before.png`) differs in **3 pixels, each by 1/255 on one channel** -- sub-perceptual
  rasteriser noise, inside the check's own 2/255 tolerance and 700x below its 32-px budget.
- So the `before-*` half genuinely is a base-build render: I produced it from `e13217c`'s committed
  deliverable and got the committed file back.
- The `cram-tallest` pair being one MORE than the brief asked for is justified -- my census confirms
  `consistency-models` (7793px), not `sharding-strategies` (6749px), is the true corpus maximum, and
  the ceiling is anchored on that number.

---

## 9. THE HARNESS COMMIT (`d341750`) AND PARSE SANITY

`d341750` was the one place I expected to find an assertion quietly weakened, and it is not there.
Adjudicated in `GUARD-ADJUDICATION.md` section 1: the commit touches only harness files (zero app
bytes -- the deliverable md5 is `5d868341` before and after it); the old rAF poller ended only on
"splash exists AND carries `_bs-done`", so a splash removed before any frame caught the class left
`window.__fading` never flipping and burned the full 60s; the new exit ("splash absent AND
`document.readyState === 'complete'`") only changes which runs REACH the pre-existing skip path,
which is unchanged. The two assertions that would actually catch a splash eating input -- the first
real click reaching its target, and that click having done something -- run on BOTH paths. The old
behaviour in the failing scenario was process death with zero of 35 rows printed, which is strictly
worse on every axis. **Hardening, not weakening.**

**Parse sanity.** All **15** JS/CJS files in `e13217c..6ca159f` pass `node --check` (no ESM false
errors -- none of them uses `import`/`export`). `test/syntax_check.py` reports
`612 modules parse; 52 aggregator files skipped`, matching the committed gate row. `oxlint` on the
five new/changed test files produces **zero output**; on `src/` it produces 13 warnings, all
`unicorn(no-empty-file)` on `@build:include` aggregator stubs -- pre-existing and on no file this
wave touched. **The three IDE flags (`system-map.js`, `trade-offs.js`, `cram_surface.cjs`) are
noise:** each passes both `node --check` and `oxlint`.

---

## 10. THE GATE -- RE-RUN INDEPENDENTLY, 67/67, FIRST TRY

I ran `python3 test/check_all.py` myself on the committed tree, on a quiet box, with no other
browser work in flight (capture: `scratchpad/w4-verify/gate-rerun.txt`).

```
MY RE-RUN :  67 rows, 67 PASS, 0 FAIL, 0 SKIP     GATE: PASS   (exit 0)
COMMITTED :  67 rows, 67 PASS, 0 FAIL, 0 SKIP     GATE: PASS
same check set: True        status differences: NONE
```

- `sidebar_geometry` is registered at `check_all.py:702`, taking the gate 66 -> 67. PASS,
  13 assertions, both negative controls moved.
- `build_integrity` PASS -- **"COMMITTED deliverable == fresh build of HEAD"**, the HEAD-match arm
  firing rather than DEFERRED (my run's capture is written outside the repo, so the tree stayed
  clean).
- `visual_regression` PASS, 16 baselines, matched its committed pixels.
- `cram_surface` PASS -- 46 topics, mirror verified against `deriveCram` on all 46, every sheet
  under the 9000px ceiling, height probe armed.
- `latent_arial` PASS at 0 allowlisted. `focus_ring` PASS, 6 assertions incl. `.piv-jump`.
- **`overlay_deadzone` PASS with all 35 assertions, on the first try.** This is the check `d341750`
  fixed, and the freeze's claim that the fix ends the 60s hang without costing an assertion holds
  under an independent gate run.

**Reproducibility bonus.** The deliverable's md5 is `5d868341a5c307001b453ee7b365c187` both before
and after the gate (which rebuilds and syncs it), `git status` is clean, and HEAD is still
`6ca159f`. The build is byte-reproducible on this box, and my verification left the worktree
exactly as I found it.

---

# FINDINGS

## BLOCKING

**None.**

I went looking for the two shapes that would have blocked: an assertion weakened under cover of a
timeout fix (`d341750`), and a guard whose green could not be earned. Neither exists. Every
watched-red reproduced on the pre-fix build, every negative control failed the check when I broke
it, and the ratchet caught a real planted button rather than only its own probe.

## NON-BLOCKING

**F-1 -- the `.cs-arr` scoreboard row is scoped shorthand.** "inline `.cs-arr` per cram sheet 9 ->
0" is true of the CUE-LINE arrows (415 -> 0 corpus-wide, 9 -> 0 per flagship sheet), but a sheet
still contains 7 `.cs-arr` elements from `.cs-dec`. The freeze's prose says this explicitly one
paragraph later ("The arrow still renders in `.cs-dec`'s 'A -> B when ...'"), so a reader of the
report is not misled -- only a reader of the table alone. *Fix: one qualifier in the row.*

**F-2 -- "latent Arial is at zero" is true of the LEDGER, not of the screen. Carry-forward.**
26 buttons still rasterise as Arial on Windows, among them all nine `.seg` pane tabs -- the very nav
this wave lifted above the fold -- plus `.textzoom-btn`, `.inttog`, `.flow-pip`, `.nd-go`,
`.mockbtn`. Cause: 17 rules in `styles.css` (e.g. `:320`, `:1304`) specify `-apple-system,sans-serif`;
`-apple-system` does not resolve off Apple platforms, so the generic `sans-serif` wins, which is
Arial. **Pre-existing and unchanged by this wave** (byte-identical faces and glyph counts pre/post),
and invisible to `latent_arial` by construction, since those buttons DO carry an author family. The
freeze already treats this class as real -- it folds `.xd-again`'s bespoke `-apple-system` stack onto
the scale for exactly this reason -- but does not say 17 such rules remain. *Recommend a ledger entry
for the next wave; not this wave's debt.*

**F-3 -- the `<=600px` deletion removed three declarations, not "the dead pair".** `row-gap:var(--space-1)`
went with the wrap. It was INERT rather than overridden (`row-gap` separates flex LINES, and
`flex-wrap:nowrap` guarantees one line), so the rendered result is unchanged -- but the in-source
comment's "these two declarations were dead in every viewport they were written for" is a 2-of-3
enumeration, and the omitted one has a different proof of deadness. *Fix: one clause in the comment.*

**F-4 -- three attribution/precision nits in the freeze's prose.**
(a) "THE AUDIT'S PREMISE WAS STALE" reads as an indictment; `05368c2:src/styles.css` shows the audit
was correct when written, and W2's merge is what killed the rule -- the freeze attributes the
mechanism correctly but never says the audit was right at authoring time.
(b) `styles.css:628` is cited as the reason for choosing a DOM move; it is byte-identical at
`e13217c` and is not this wave's work.
(c) The freeze BODY says 66/67 while its ADDENDUM and the committed capture say 67/67 -- read
linearly the document contradicts itself. The addendum supersedes, but a reader who stops early gets
the wrong number.

**F-5 -- `sidebar_geometry` negative control 1 is absolute, not relative.** It asserts
`off.ratio < MIN_RATIO` rather than "moved relative to live", so on a build already below the floor
it passes without the forced-off style having done anything -- which is exactly what happened on my
pre-fix run (it PASSed inside an 11-of-13 red). It cannot manufacture a green, because any build
where it is vacuous is already red on all ten switcher assertions. *One-line fix:
`off.ratio < control.r.ratio * 0.5`.*

**F-6 -- `latent_arial`'s control A is a check that cannot fail, and nothing asserts the walk was
non-empty. STRONGEST CARRY-FORWARD.** `A_bareDetected = getComputedStyle(bare).fontFamily === UA`
compares an element against a value read from that same element, and the walker explicitly skips
`[data-latent-probe]`, so the planted probe never reaches the detection path. Separately,
`buttonsSeen` is printed and never asserted, so a run that enumerated ZERO application buttons would
still print `LATENT ARIAL: PASS`. **Mitigating, and it is why this is not blocking:** controls B and
C are genuinely platform-sensitive and do fail when broken (demonstrated above), and my end-to-end
plant proves the DETECTOR works on a real button even though control A does not test it. The
weakness is pre-existing -- W4 touched only the header comment -- but W4 emptied the debt file, which
is what raises the stakes. *One-line fix: `if (!(buttonsSeen > 0)) ctlFails.push(...)`.*

**F-7 -- `3ab7e0e` is not purely a `font:inherit` addition: `.xd-again` loses 1px of type.**
`font:...13px...` -> `font:inherit;font-size:var(--font-size-caption)`, and `--font-size-caption`
resolves to **12px**; `--font-size-small` (13px) was available for a size-neutral fold. I checked all
16 rewritten rules mechanically: **zero have any non-font change**, and every other one preserves its
previous size/weight/line-height token exactly -- `.xd-again` is the only value change in the commit.
Blast radius is nil (the drill end screen is inside a closed overlay; no baseline moves). The freeze's
prose does say `.xd-again` was "folded onto the scale", so the intent IS disclosed -- it is the
separability parenthetical, "touches `styles.css` too but only adds `font:inherit`", that an operator
deciding a partial revert would read and that is not literally true. *Recommend naming it there.*

**F-8 -- the separability parenthetical is incomplete, and "a partial revert is a single
`git revert`" understates the workflow.** The A/B file lists omit `focus-mode.js`,
`search-overlay.js`, `test/latent_arial*`, `test/cram_surface.cjs` (A) and `test/focus_ring.cjs` (B),
and all four commits rewrite the built deliverable -- so because `build_integrity` asserts the
committed deliverable equals a fresh build of HEAD, a partial revert needs rebuild + re-gate, not just
the revert. Reverting `c721c80` would also delete `_audit/2026-07-29-w4-census.cjs`, the wave's own
measurement instrument. **The operator-facing claim this supports is nonetheless TRUE and I verified
it independently:** sub-scope A moves zero pixels in every committed baseline (section 7), so
accepting or modifying A changes no baseline in this commit.

**F-9 -- two further guard-hygiene nits, both pre-existing.** `cram_surface`'s height control proves
DETACHED, not stale-content (nothing asserts the 46 heights VARY, and `switchTo` has a silent
fallback) -- mitigated by `cram_scope_distinct` proving 46/46 distinct bodies in the same run.
`latent_arial` overwrites `controls` each surface, so only the LAST surface's control readings are
adjudicated. `focus_ring.cjs:27` still says "all five arms" where there are now six.

---

# HAZARDS PRE-CLEARED (named even though clean)

1. **A weakened assertion smuggled in as a timeout fix.** The named risk in `d341750`. Traced the
   code path; the skip branch is pre-existing and unchanged, both input-eating assertions run on both
   paths, and the commit touches zero app bytes. NOT PRESENT.
2. **A guard that cannot fail.** Ran every new/extended guard against the pre-fix build and got the
   claimed reds (`sidebar_geometry` 11/13, `focus_ring` `.piv-jump`, `cram_surface --plant` 10661px).
   Broke both `sidebar_geometry` controls and both testable `latent_arial` controls; all four turned
   the check red. The one control that genuinely cannot fail is F-6, and I say so.
3. **A ratchet that is green because it is empty.** Planted a real bare `<button>` into a copy of the
   deliverable; `latent_arial` caught it and failed. The zero is earned.
4. **A threshold picked from air.** Re-derived both `sidebar_geometry` populations over all 46 topics
   independently: `0.063..0.243` vs `0.365..1.000`, clean gap, `MIN_PX` name-independent. The
   ceiling's `x1.155` arithmetic checks out. The freeze's own account of a first draft at 0.40 that
   would have failed its own build is consistent with what I measured (the real floor is 0.3652).
5. **A before/after pair framed two different ways.** Re-ran the committed capture script; 13 of 14
   PNGs byte-identical, the 14th differing by 3 pixels at 1/255, all frames asserted and matched.
6. **Sub-scope A leaking into a committed baseline.** Measured rendered AREA (not DOM presence) on
   all seven baseline surfaces: zero. The operator gate's premise holds.
7. **A VR rebaseline hiding a real regression outside the wave's surfaces.** Band analysis puts every
   changed desktop pixel inside `.sidebar` (0..296) or `.cmp-fold` (1244..1268), and every changed
   mobile pixel in the top chrome or the bottom bar. Stage, companion rail and walkthrough content
   are untouched, by measurement.
8. **A manifest that disagrees with the files it describes.** Re-hashed all 16 from disk: 0
   mismatches; only the 14 changed PNGs' sha fields moved; `capture`/`tolerance`/`env` unchanged.
9. **Read-only discipline.** Every measurement ran against copies in scratch; the only repo-touching
   commands were `git show` / `git diff` / `git log` and the committed checks themselves (whose
   outputs are gitignored). Worktree `git status` clean at start and at end.
