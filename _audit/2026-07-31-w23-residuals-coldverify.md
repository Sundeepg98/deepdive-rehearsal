# W23 -- Ledger Round L2 "Residuals" -- COLD VERIFY VERDICT

**VERDICT: CLEAN.** Both declines survive independent re-measurement and both are correctly
reasoned. H-1 is executed correctly and its watched-red reproduces byte-identically. VR is
object-identical to base on all 16 baselines. Gate re-run 73/73, verdict-identical for all 73
checks. **Four NON-BLOCKING notes, no blocking findings.** Nothing here justifies re-opening
either decline; two notes exist precisely so a future reader does not re-open them wrongly.

- **Verifier:** w23-verifier, cold, independent of w23-builder
- **Target:** `D:\claude-workspace\_worktrees\deepdive-rehearsal\w23-residuals`, branch
  `ledger/l2-residuals`, tip `b761788`, base `96deb28`
- **Date:** 2026-07-31 - **Scratch:** `...\scratchpad\w23-verify\`

---

## Instruments -- built here, not borrowed

Every number below comes from instruments I wrote from the app source. I read
`_audit/2026-07-29-w4-census.cjs` only to answer "where does the rect-top method come from",
after my own counts were in hand. The one mechanism I did take from the repo is how to reach
`.dec-tell` through `<deep-trade-offs>`'s shadow root -- there is one correct way to walk an open
shadow root and inventing a second would not make it independent.

| file (scratch) | what it does |
|---|---|
| `discover.cjs` | sidebar column geometry, `.seg` tab rects, `.side-id` descendant display/height |
| `tells.cjs` | four mechanically distinct line counts for every `.dec-tell` in a topic |
| `corpus.cjs` | the same, swept across all 46 topics / 324 tells |
| `h1battery.sh` | watched-red + a 16-mutant battery for `room_static` rule 1, in throwaway trees |
| `badge.cjs` | computed `box-shadow` on `.side-id .badge`, before vs after |

The four line counts, so no single modelling error can carry a verdict:
**A** rect-top (the census method, the instrument under suspicion) - **B** box-model,
`(borderBoxHeight - borders - padding) / line-height` - **C** char-bin, every character's rect
CENTRE binned onto the element's own absolute line grid - **D** distinct bottoms of fragments whose
height equals the line-height.

**Negative disclosure: control D never armed.** Range client rects for inline text carry the inline
box height, not the line box height, so the `|h - lineHeight| < 0.6` filter matched zero fragments
and D returned 0 everywhere. It is a null result, not a third confirmation, and I am not counting
it as evidence. A/B/C did the work; B and C are mechanically independent of each other and of A.

---

## Item 1 -- the `cdc` "9-line tell": DECLINE UPHELD, and the premise was **ALWAYS** wrong

The brief asked whether the prior record was wrong, or the state changed, or the decline
mischaracterises. **The prior record was wrong -- and it was wrong at the moment it was written.**
This is not an expiry.

### Measured on four builds, at 1280x800, `cdc`'s third `.dec-tell`

| build | what it is | A rect-top | **B box-model** | **C char-bin** | client/scroll | overflow / max-h |
|---|---|---|---|---|---|---|
| `e13217c` | W4's own BASE (where "7" was recorded) | **7** | **5** | **5** | 120/120 | visible / none |
| `9aef376` | W4's own TIP (where "9" was recorded) | **9** | **5** | **5** | 120/120 | visible / none |
| `96deb28` | this wave's base | **9** | **5** | **5** | 120/120 | visible / none |
| `b761788` | this tip | **9** | **5** | **5** | 120/120 | visible / none |

Box height 121.438px, border-top 1px, padding-top 12px, line-height 21.7px -> content 108.438px ->
108.438 / 21.7 = **4.997 line boxes**. `scrollHeight == clientHeight` on every build, so nothing is
hidden; `overflow:visible` / `max-height:none`, so nothing is clipped. **The block has been five
lines the whole time, including on the build W4 measured.**

The census's own numbers reproduce exactly on my instrument: `[5,6,7,7,5,5,4]` at `e13217c` and
`[5,5,9,7,5,5,4]` at `9aef376` -- byte-identical to what the W4 cold verify recorded. So W4 and its
verifier both faithfully reported what the instrument told them. **The instrument was the defect.**

### Why the number moved 7 -> 9 while the rendering did not move at all

Rect tops relative to the block top, third tell:

```
e13217c (weight 700)   14,        35.69, 39.69, 40.69, 57.38, 79.06, 100.75   -> 7 distinct
b761788 (weight 500)   14, 18, 19, 35.69, 39.69, 40.69, 57.38, 79.06, 100.75  -> 9 distinct
true line tops (both)  14,        35.69,               57.38, 79.06, 100.75   -> 5, 21.69px apart
```

Under 700 the code span `WHERE published = false` sat on line 2 only (2 fragments). Under 500 it
rewraps across lines 1 and 2 (4 fragments). The block stayed five lines; only the number of
code-span fragments changed. W4's "honest exception" was an artifact of an artifact.

### The corpus-wide discrimination claim reproduces EXACTLY

My own sweep, all 46 topics on the tip:

| | freeze claims | **I measure** |
|---|---|---|
| tells measured | 324 | **324** |
| the two methods agree | 296 | **296** |
| they disagree | 28 | **28** |
| of those 28, how many hold an inline `<code>` | 28 | **28** |
| tells holding an inline `<code>` | 28 | **28** |
| of those, how many the old counter got right | 0 | **0** |
| corpus total, old -> corrected | 1532 -> 1435 | **1532 -> 1435** |
| `content-pipeline` | `[1,1,1,1,2,1,2]` | **`[1,1,1,1,2,1,2]`** (both methods) |
| `multi-region` | `[5,5,6,9,6,5,5]` | **`[5,5,6,9,6,5,5]`** (both methods) |
| `cdc` corrected | `[5,5,5,5,5,5,4]` | **`[5,5,5,5,5,5,4]`** |

The clean double implication holds on my instrument too. My third method (C, absolute-grid binning)
agreed with the box-model count on **all 324 blocks, zero mismatches**, and **no block in the corpus
is clipped or overflowing** -- so the box-model count cannot be hiding content anywhere.

### Fourth channel: the committed PNG

I opened `_audit/w23-receipts/cdc-tell3-1280x800.png` and counted by eye. **Five lines.** The code
span visibly wraps across lines 1 and 2, exactly as the freeze discloses in its "one honest
observation". The receipt shows what the freeze says it shows.

**Disposition: the decline is correct, and declining to edit authored prose to move a number
produced by a broken counter is the right call.** Correcting the instrument rather than forking it
is also right -- W4's two headline rows re-derive byte-identically, which is the property that makes
the committed report still readable.

---

## Item 2 -- `num`'s fold miss: DECLINE UPHELD. The 3px **EXPIRED**; the headroom claim **survives**

The brief asked me to separate these two, and they separate cleanly.

### (a) The 3px was RIGHT WHEN WRITTEN. It expired; it was never wrong.

Measured at 1280x800 with my own instrument, `num` is the 7th of 9 visible pane tabs:

| build | `.seg` top | `num` bottom | miss vs the 800px fold | tab height | gap | `7h + 6g` | fully above |
|---|---|---|---|---|---|---|---|
| `e13217c` (W4 base) | 617.08 | 943.08 | 143.08px | 44px | 3px | 326 | 3 |
| **`9aef376` (W4 tip)** | 476.58 | **802.58** | **2.58px** | 44px | 3px | 326 | 6 |
| `96deb28` (base) | 475.58 | 829.58 | 29.58px | **48px** | 3px | **354** | 6 |
| `b761788` (tip) | 475.58 | **829.58** | **29.58px** | **48px** | 3px | **354** | 6 |

`num` bottom **802.58** on W4's tip reproduces the W4 cold verify's **2.6px** exactly, and the W4
freeze's "bottom 803 ... misses by 3px" is that same number rounded. **The W4 record and its cold
verifier were both correct.** The gap grew 27.00px since: +28px from the tab box (44 -> 48px) and
-1px from `.seg` moving up. Fully attributed, nothing regressed.

The freeze's own arithmetic checks out byte-for-byte: it cites `.seg` top 477 / `num` bottom 803 for
W4 (I measure 476.58 / 802.58) and 475.6 / 829.6 now (I measure 475.58 / 829.58), and the
44px -> 48px tab-box growth is real.

**This matters for the record: the decline stands, but nothing in it impeaches W4 or its verifier.**
The freeze's body states this correctly and explicitly ("Nothing regressed -- the tabs grew"). See
note N-4 on the summary paragraph.

### (b) "The named headroom does not exist, and never did" -- this STRONG claim SURVIVES

Computed `display` and rendered height of the two blocks W4's next-pass note named, measured on
every build including W4's own base and tip:

| build | `.side-id .sub` | `.side-id .kbd-hint` |
|---|---|---|
| `e13217c` (W4's base) | `display:none`, h=0 | `display:none`, h=0 |
| `9aef376` (W4's tip) | `display:none`, h=0 | `display:none`, h=0 |
| `96deb28` | `display:none`, h=0 | `display:none`, h=0 |
| `b761788` | `display:none`, h=0 | `display:none`, h=0 |

`.side-id .sub,.side-id .kbd-hint{display:none}` -- unconditional, not media-gated -- is present at
`8fe3077:src/styles.css:657` (the initial commit), `e13217c:587`, `9aef376:587`, and `96deb28:628`.
Source and rendering agree: **there was 0px there on the day the note was written.** The note was
wrong, not stale. The freeze's strongest claim is the one best supported.

### (c) An independent strengthening the freeze does not make: the reclaim is arithmetically impossible

`src/styles.css:629-656` documents the only reclaimable reserve, and I measured it: the title is an
`lh`-based **two-line** reserve, `.side-id h1` = 46.19px, so one line = **23.1px** (the comment
states 23.1px and "13 of 46 titles need the second; the other 33 get an invisible blank one" --
matching the freeze's "~23px on 33 topics").

**29.58px is needed. 23.1px is available. Reclaiming the entire title reserve -- and eating the
`click_drift` regression on the 13 topics whose titles need the second line -- would still leave
`num` 6.5px below the fold.** The reclaim cannot reach 7-fully-above at all. The decline therefore
does not even depend on the Goodhart argument or the drift-bug trade; it fails on arithmetic first.
Everything else in the column is live chrome (`#ndock` 54.89px, `.mockcta` 128px -- both measured,
both as the freeze states).

### (d) The strict arm is sound, and its own control is genuinely necessary

I re-ran the committed `test/sidebar_geometry.cjs` against the historical deliverables:

- **vs `e13217c` (W4 pre-fix): FAIL, 13 of 15** -- `at least 6 of the 9 pane tabs are FULLY above
  the fold ... 3 fully above; first cut off is 'sys' at bottom=802, 2px past the fold`. Byte-identical
  to the builder's committed watched-red capture. The red is real and constructible.
- **vs `9aef376` (W4 tip): PASS, 15 of 15.** The new arm asserts a floor that was already true in
  the W4 era, so it does not retroactively condemn the wave it re-measures.

The freeze's argument for needing a *separate* control 3 checks out on my own geometry: control 2
anchors on the last ANY-above tab (`num`, top 782) -> shift 20 -> fold 780, which is still below
`model`'s bottom of 778.58, so **the strict count does not move under control 2**. Control 3 anchors
on the last FULLY-above tab (`model`, bottom 779) -> shift 23 -> fold 777, so the count must drop,
and does (6 -> 5). An arm sharing another arm's control would have been an arm with no control. This
is a real catch, not filler.

**On the judgement call the freeze flags for me** (asserting the strict arm at 6 when the brief
conditioned flipping it on taking the reclaim): I agree with it. A reported-but-unasserted number is
exactly how the stale "3px" survived two days, the asserted floor is the true one, it pins the
column against regrowth from above, and it asks no one to trim the thing being measured. It is also
cleanly reversible (delete `MIN_TABS_FULL` and control 3; nothing else depends on them).

---

## Item 3 -- W20 H-1: EXECUTED, correctly, and in the right place

I read `_audit/2026-07-30-w20-hue.md` section 10.1 and checked the change against it.

H-1's table lists four notations. The widened rule 1 handles all four as claimed, hex deliberately
excepted. **In-scope for an S-wave and landed in `test/` + one `src/` declaration**, moving zero
pixels -- correct placement.

### Watched-red, reproduced in throwaway trees (repo never written)

| tree | OLD rule | NEW rule |
|---|---|---|
| `src@96deb28` (base, escapee present) | **PASS** -- blind to it | **FAIL** -- `at src/tw.css:49  rgba(83, 74, 183` |
| `src@b761788` (tip, escapee fixed) | PASS | **PASS** |

The escapee byte at the base is real: `tw.css:49  box-shadow: var(--chip-sh), 0 0 20px -4px
rgba(83, 74, 183, .2);`. And it was **live** -- my `badge.cjs` run finds `.side-id .badge`
("Deep rehearsal") rendered, `display:inline-block`, `visibility:visible`, `opacity:1` on a topic
route. This was a shipped pixel, not dead CSS.

### My own 16-mutant battery (superset of the builder's 7)

Caught by NEW as required: unspaced legacy, spaced legacy, modern slash, **slash with no spaces**,
**padded call `rgba( 83 , 74 , 183 ,.2)`**, second hue spaced, uppercase, and **a hit in a `.js`
file** (the walk is not css-only). Did not narrow: the bare triple in a comment still reds under
NEW, and a file carrying both a comment triple and a call reports **2** sites under NEW where OLD
reported an unattributed count. Did not over-match on: near-miss `184`, unrelated
`rgba(125,110,210)`, and three edge cases the builder did not try -- **leading digit
`rgba(831, 74, 183)`, reversed `rgba(183, 74, 83)`, trailing digit `rgba(83, 74, 1834)`** -- all
green under both rules. The documented gap behaves as documented: hex `#534AB7` stays invisible.

### The colour identity is a genuine sRGB identity, verified not argued

Computed `box-shadow` on the badge, same element, same geometry (rect/display/visibility/opacity all
unchanged):

```
96deb28   rgba(83, 74, 183, 0.2)
b761788   color(srgb 0.32549 0.290196 0.717647 / 0.2)
          0.32549*255 = 83.00   0.290196*255 = 74.00   0.717647*255 = 183.00   alpha .2
```

`--color-acc` resolves to `#534ab7` on both. Same colour; only Chromium's serialization changed.

### Adjacent claims, checked

- **W20 10.2 is genuinely already closed.** `src/styles.css` now reads "...and that was FALSIFIED by
  experiment... Proof and provenance: `_audit/2026-07-30-w20-hue-coldverify.md` F-1. The code is
  right; only the reason was wrong". Read, not assumed. No action needed, correctly recorded.
- **The hex residual the freeze discloses is real.** `src/scripts/app/print-qa.js:15` (`.sig`) and
  `:17` (`.qn`) both carry `color:#534AB7`. Line numbers exact.
- **The pre-existing `U+2192`** is at `_audit/2026-07-29-w4-census.cjs:109` at `96deb28` and `:134`
  at the tip -- the same line of code, shifted by this wave's additions. It genuinely predates the
  wave, and `_audit` is outside `ascii_guard`'s declared `SCOPE` (`src`, `src/topics-md`, `test`,
  `tools`). Observed-and-declined is the right disposition.

---

## VR, gate, and scope

**VR -- object identity, not just "0 pixels".** All 18 blobs under `test/baselines/` (16 PNGs +
`README.md` + `manifest.json`) have **identical git object ids** at `96deb28` and `b761788`; a
per-file `git ls-tree -r` diff is empty. No baseline was regenerated or touched. The pre-authorised
sidebar-reorder churn was genuinely not used.

**Gate -- 73/73, and verdict-identical.** My independent run: `GATE: PASS`, exit 0, **73 result
rows, 0 FAIL**. A name+verdict diff against the committed
`_audit/2026-07-31-w23-residuals-gate.txt` is **empty -- identical for all 73 checks**. No retry was
needed; `touch_floor` and `grade_reveal` both passed first time. The freeze's "gate stays at 73
checks" is correct (`sidebar_geometry` 13 -> 15 internal assertions, no new check).

**Scope -- exactly the 10 declared files**, `src/tw.css` the only `src/` change. Branch
`ledger/l2-residuals`, 2 commits ahead of master, **0 master commits missing** -- master is an
ancestor, so nothing was merged, pushed, or rebased. No master contact, as claimed.

**Read-only honoured.** `git status --porcelain` empty before and after; the deliverable's SHA-256
is unchanged across my gate run (`5b7c610b...`), so `build_integrity`'s in-tree rebuild landed
byte-identical -- which independently confirms the build is reproducible on this box.

---

## Findings -- 4 NON-BLOCKING, 0 BLOCKING

**N-1 (precision -- freeze, Item 1, "the discrimination proof").** The freeze writes *"The corpus
maximum is still 9 (`multi-region`'s fourth tell), by both methods."* Measured: the **corrected**
counter's corpus maximum is indeed 9 (`multi-region` #4). The **old** counter's corpus maximum is
**15** (`shared-definition`, a code-bearing tell). The sentence is true read as "that tell reads 9
under both methods" -- which is the discrimination point, and it holds -- but false read as "the
corpus maximum is 9 under both methods", and a future reader who re-runs the old counter will see
15. One clause fixes it. The discrimination proof itself is sound and I reproduced it.

**N-2 (disclosure gap -- freeze, Item 3; the note most likely to cause a wrong re-open).** The
retired indigo **still ships as a hex literal in the built deliverable**, and the freeze does not say
so. The `.badge` rule in `deepdive_content_pipeline_rehearsal.html` reads
`box-shadow: var(--chip-sh), 0 0 20px -4px #534ab733` at **both** `96deb28` and `b761788`; this
wave's deliverable diff is purely **additive** -- it appends
`@supports (color: color-mix(in lab, red, red)) { .badge { ... color-mix(...) } }` and removes
nothing. So the shipped artifact carries a consumer-position hex of the retired indigo, invisible to
rule 1 on two counts at once (rule 1 scans `src/`, and hex is deliberately unmatched).

**This is not a defect and the fix is not incomplete.** The tip's `src/` contains no rgb/rgba
literal of either triple anywhere (rule 1 passes, and my own greps agree), so the `#534ab733` in the
artifact is **build-generated** -- Lightning CSS resolving `color-mix(in srgb, var(--color-acc) 20%,
transparent)` against the token declared at `tw.css:17` and emitting it as the downlevel fallback.
It therefore regenerates from the token if the brand moves, which is exactly the drift protection
the new source comment claims. Worth one line in the record because a future reader checking
"is the escapee really gone?" will grep the deliverable, find `#534ab733`, and have no way to tell
it is generated rather than regrown.

**N-3 (latent property of a now-committed instrument).** The corrected `lineCount` in
`_audit/2026-07-29-w4-census.cjs` clusters by resetting its anchor to each fragment's top, so a
chain of fragments each within half a line box of the previous one could drift across a real line
boundary and **under**count. It does not bite on this corpus -- my absolute-grid binning (which
cannot drift) agreed with the box-model count on all 324 blocks. Recording it because this file is
now the instrument behind a committed report: the `boxLines` cross-check that aborts the run on any
disagreement is what actually protects future waves from this, and it should not be removed.

**N-4 (presentational).** The freeze's one-paragraph summary reads *"`num`'s '3px' fold miss is
29.6px, and the headroom the note pointed at does not exist and never has"*, which a skimmer can
take as "the 3px was wrong too". It was not -- it was right when written and expired, as I measured
above. The freeze's Item 2 body says this correctly and even reproduces W4's own numbers; only the
summary compresses it. Since the two claims have genuinely different epistemic status (one expired,
one was never true), keeping them distinct in the summary is worth the half-line.

---

## Negative controls -- what I did to keep myself honest

| control | result |
|---|---|
| Control D (fragment-height line counter) | **NEVER ARMED** -- returned 0 on every block; disclosed above and excluded from evidence, not quietly dropped |
| B vs C (box-model vs absolute-grid binning) | two mechanically independent counts, agree on **324/324** blocks |
| Old counter vs new, on code-free blocks | agree on **296/296** -- the census is right where it has no code span, so the correction is surgical, not a rewrite |
| Corrected counter on a genuinely long block | `multi-region` #4 still reads **9** -- it did not floor everything to five |
| Corpus clipping check | **0** blocks clipped, **0** overflowing -- the box-model count cannot be hiding content |
| New guard rule vs old, same tree | OLD **PASS** / NEW **FAIL** at `96deb28` -- the red is constructible on a build this wave did not author |
| Guard over-match probes | leading-digit / reversed / trailing-digit / near-miss / unrelated rgba: **green under both rules** |
| Guard narrowing probe | bare triple in a comment still **red** under NEW; mixed file reports **2** sites |
| Strict fold arm vs `e13217c` | **FAIL 13 of 15**, byte-identical to the builder's capture |
| Strict fold arm vs `9aef376` | **PASS 15 of 15** -- the asserted floor was already true in the W4 era |
| Gate re-run vs committed capture | name+verdict diff **empty across all 73** |
| Deliverable SHA-256 across my gate run | **unchanged** -- the in-tree rebuild is byte-reproducible |

## Hazards pre-cleared

- **Read-only:** repo `git status` empty before and after; all historical builds extracted with
  `git show` / `git archive` into scratch; the entire mutant battery ran in throwaway trees built
  from git objects, and the scratch tree was verified byte-restored afterwards.
- **Isolated contexts, asserted viewport:** every measurement runs in its own `newContext`; every
  script asserts `innerWidth === 1280 && innerHeight === 800` and throws on drift.
- **No image-wide kills.** `node.exe` process count is 14 before and 14 after -- back to baseline,
  nothing orphaned, nothing of the operator's touched.
- **PowerShell:** not used. Everything ran through Git Bash / node / python.
- **Concurrency:** the gate ran alone; no browser sweep overlapped it.
- **Scratch:** `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w23-verify\`

## One thing I could not verify independently

The freeze states its VR churn was declared **before** any edit. The declaration is present and the
outcome matches it exactly (0 px on all 16, baselines object-identical), but temporal ordering
inside a single commit is not recoverable from the artifact. I record it as *stated and met*, not as
*proven to have been stated first*. Given both items resolved to declines and the third change is an
sRGB identity, there was no pixel-moving change available to conceal.
