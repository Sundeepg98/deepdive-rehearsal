# W21 / W-X6 "TYPEFACE TRUTH" -- COLD VERIFICATION VERDICT

**VERDICT: CLEAN -- SHIP.** No BLOCKING finding. The defect is real, the fix is complete, the
guard is a genuine ratchet with individually-sensitive arms and a self-test that actually
aborts, the rebaseline is metric-only, and every load-bearing number in the freeze reproduced
on my own instruments. Seven NON-BLOCKING findings: two documentation-accuracy defects that
live in SHIPPED SOURCE COMMENTS (F-A, F-G), two reproducibility defects in committed
instruments (F-B, F-C), two latent guard blind spots (F-D, F-E), and one stale committed
capture (F-F). **The hazard the brief fed me does not reproduce (see Section 9); the real
Pyright finding is different, and no NameError is reachable on any path.**

**Verifier:** w21-verifier (cold, no shared context with w21-builder)
**Target:** worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w21-typeface`, branch
`xb/x6-typeface-truth`, tip `0f55309`, base `f7eb2dd`
**Date:** 2026-07-30 · box quiet, gate run alone, no parallel browser work
**Discipline:** READ-ONLY on the repo throughout. Every mutation ran on `git archive` exports in
scratch. `git status` verified clean before and after the gate run; HEAD unmoved at `0f55309`.

---

## 1. THE CENSUS -- my own instrument, and the "17 rules" reconciliation

Wrote `my_census.py` (scratch): an **occurrence-first** walk that finds every literal
`-apple-system` in git-tracked `src/` and reads backwards to the carrier property, rather than
a property-first regex. Different failure mode on purpose.

**Instrument-bug disclosure, mine.** First run reported `in CODE: 0 / in COMMENT: 93` -- absurd
on a tree known to carry the defect. My comment-blanker collapsed comments to newlines, which
shifted every later character offset. Fixed to blank in place (same length). This repo's
standing lesson is that every fresh instrument is buggy on its first attempt; mine was, and the
negative control is what caught it.

### Base `f7eb2dd` -- reproduces the freeze exactly

| shape | my count | freeze |
|---|---|---|
| `-apple-system,sans-serif` (TRUNCATED -- the defect) | **83** | 83 |
| `-apple-system,system-ui,sans-serif` | **5** | 5 |
| `-apple-system,BlinkMacSystemFont,system-ui,sans-serif` | **1** | 1 |
| `-apple-system,BlinkMacSystemFont,'Segoe UI',...,sans-serif` | **2** | 1 (see below) |
| `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif` | **1** | not in table |
| **code occurrences total** | **92** | -- |
| in-COMMENT occurrences | **1** (`styles.css:1788`) | 1 |

The two shapes the freeze's table does not list are **correctly** absent from it: the canonical
stack appears **twice** (once at `body` = the freeze's 1 finding, once at `print-qa.js:9` = the
documented exception, not a finding), and the partial `Roboto,sans-serif` tail is the
`--display` **token definition**, which the guard skips by design. So
92 = 90 findings-eligible + 1 exception + 1 token def, and 90 findings + the missing `--sans` =
**91**, the freeze's number. Reconciles with nothing left over.

**The ledger's "17 rules", pinned exactly.** The brief carried forward "17 rules in styles.css".
Measured: `-apple-system,sans-serif` in `src/styles.css` alone = **exactly 17**. That is the
identity -- 17 is the *truncated-shaped* count in styles.css, not all defect-shaped ones there
(which is 22 = 17 truncated + 5 second-spellings), and not the total (89 folded / 91 findings).
See F-G: the freeze's phrasing blurs this by one clause.

**Per-file distribution: every one of the freeze's 16 files matches my count** (drill 13,
mixed-fire 11, mock-run 9, session-progress 9, shared-sheets 4, num 3, tour-guide 3, walkthrough
3, whiteboard 3, base-styles 2, content-sheet 2, model-answers 2, opener-altitude 1, red-flags 1,
system-map 1 = 67 under `scripts/app/`; styles.css 22 folded). 22 + 67 = **89**. Independently
corroborated by `git diff --stat`: every one of those 15 JS files shows exactly 2x its fold count
in changed lines.

### Tip `0f55309` -- zero defect-shaped, and the replacements mirror the app stack

Exactly **2** `-apple-system` code occurrences remain: the `--sans` definition and the
`print-qa.js:9` pinned literal. **They are byte-identical to each other.** Zero truncated, zero
second-spellings. `var(--sans)` appears **90** times (89 folds + `body`), matching the freeze.

**No invented stacks.** My independent parse of every family list on the tip yields only:
`var(--sans)` 90, `inherit` 46, mono stacks 27, `var(--display)` 4, the `@font-face` descriptor
`'Space Grotesk'` 1, the print literal 1, `Georgia,'Times New Roman',serif` 1 (the argued serif
masthead). Nothing else. My total is 181 vs the guard's 180 -- the one-file difference is
`src/fonts.css`, which the guard skips (and see F-D).

**The W3/W4 ordering discipline.** The freeze's argument for swapping the family list in place
rather than folding to `font:inherit` is that these are `font` SHORTHANDS whose reset of
`line-height` to `normal` is load-bearing. I did not take this on argument -- I measured it. See
Section 3.

---

## 2. THE RASTERISER PROOF -- re-measured on my own probe

Wrote `vprobe.cjs` (scratch). Independent in **selection** (targets the W4-ledgered buttons by
explicit selector -- `.seg button`, `.textzoom-btn`, `#inttog`, `.flow-pip`, `.nd-go`,
`.mockbtn`, `#wprev`/`#wnext`, `.crambtn` -- rather than walking all buttons and filtering),
in **arithmetic**, and in **scope** (ONE surface, so nothing is multiplied by surface count).
The CDP method `CSS.getPlatformFontsForNode` is shared by necessity: there is no independent
alternative for "what did the rasteriser actually receive".

Isolated context per (build, viewport); `innerWidth` asserted (hard throw); aborts if any
rendered target returns no platform fonts. BEFORE materialised from
`git show f7eb2dd:deepdive_content_pipeline_rehearsal.html`, both builds through the same binary.

| desktop 1280x800, `#event-driven/walk` | BEFORE | AFTER |
|---|---|---|
| ledgered targets rendered | 30 | 30 |
| **buttons rasterising an Arial-family face** | **29** | **0** |
| ...with real label text | 16 | **0** |
| ...single-glyph | 13 | 0 |
| Arial glyphs | 259 | **0** |
| `--sans` token | *(absent)* | the app stack |

Mobile 390x844: **25 -> 0**. Every ledgered button now rasterises Segoe UI / Segoe UI Semibold /
Segoe UI Black. **Zero Arial glyphs on any ledgered button, either viewport.**

**The nine `.seg` pane tabs -- claim verified, not assumed.** I initially suspected the claim was
wrong, because the builder's own JSON shows no `.seg` key. It is right: the nine are one
`.on.seen` (Walkthrough), one `.flow-pip` (Probe Drill), and seven classless `button` keys
(Whiteboard, System Map, Trade-offs, Model Answers, Numbers, Red Flags, 30-Second) -- confirmed
by reading each row's label text. All nine went `Arial:15..22` -> `Segoe UI:15..22`.

**Single-glyph fallbacks classified honestly.** The 13 `.crambtn` icon buttons report `Arial:1`
BEFORE and **`Segoe UI:1` AFTER** -- so they were *not* icon fallback at all, exactly as the
freeze's §4 correction of W4 says. The only genuine fallback left is `#homeBtn.tn-step.tn-home`
rendering U+2302 (3 rows = 1 button x 3 surfaces). `#themetog` reports Segoe UI Symbol in both
builds -- never Arial, correctly not counted.

**The builder's committed JSONs check out.** Re-analysed both: 898 rows over 4 surfaces
(220+222+225+231); the (surface, key, text) population is **identical** across the two runs, so
before/after compare like with like; and the family glyph histogram matches the freeze on all
five claimed families exactly -- Arial 705->3, Arial Black 75->0, Segoe UI 26380->26950, Segoe UI
Semibold 1288->1420, Segoe UI Black 45->120. `home` is 0-of-220 in both, as claimed.

---

## 3. THE STOP MOMENT -- adjudicated, and the resolution is genuinely metric-only

**What the freeze describes.** Two distinct moments, and they should not be conflated:

**(a) The avoided STOP (freeze §2).** The W3/W4 discipline is to fold to `font:inherit`. The
builder did not, arguing that these are `font` shorthands whose implicit `line-height:normal`
reset is load-bearing against a `body` carrying `--line-height-loose`, so folding would have
inherited the loose line-height and moved every one of these boxes *for a reason that is not the
typeface* -- the brief's stop condition. **This is a hazard correctly anticipated and designed
around, not a stop condition that fired.** The premise checks out: I measured
`body { line-height: 24px }` in both builds, and the swapped rules keep their own shorthand
line-heights.

**Was the STOP honored? YES, and I can prove the resolution is family-only rather than take the
argument.** Two independent measurements:

1. **On my 56 ledgered targets** (30 desktop + 26 mobile), computed `font-size`, `font-weight`,
   `line-height` and `letter-spacing` are **IDENTICAL on every single one**. Only the resolved
   family differs (16 of 30 desktop, 12 of 26 mobile).
2. **Across the whole app**: re-running the committed `layout-delta.cjs` dumper on both builds
   and classifying with my own rules over all **1792 boxes on six surfaces** --
   **ZERO boxes changed computed font-size, font-weight, or line-height.** 337 changed the
   computed font-family string.

That is the claim the wave needs, established over the entire element population rather than a
sample.

**(b) The one flagged STRUCTURAL box.** My own classifier, run blind against the same dumps:

| | mine | freeze |
|---|---|---|
| boxes | **1792** | 1792 |
| appeared / vanished | **0 / 0** | 0 / 0 |
| moved | **1073** | 1073 |
| boxes where a NON-TEXT layout property also changed | **1** | 1 |

The single box is `m-walk div.app[1]`, padding `61px 0px 80px` -> `61px 0px 79px`. **I traced the
mechanism independently, without reading their explanation first:** on mobile my probe measures
`.mockbtn` **47px -> 46px** (Segoe UI's line box is 1px shorter than Arial's at that size), the
dock therefore measures **72 -> 71**, `--chrome-bot` reads **72px -> 71px**, and `.app`'s
`calc(var(--chrome-bot) + var(--space-8))` carries it into padding **80px -> 79px**. Every link
in that chain reproduces. It is a font metric travelling through a runtime measurement, flagged
only because the classifier reads computed `padding`, which here is downstream of the metric.
**Explained, not waived -- and I agree with the adjudication.**

(My TEXT-SIZED/REFLOW sub-split is 391/681 against the freeze's 174/898. Same total, different
partition rule -- I split on the dumper's `textSized` flag, they split on line-count and ancestor
causation. Not a discrepancy in fact; see F-C on why the arbitrating code is not available.)

---

## 4. VR -- object level, and per-baseline attribution on my own differ

**Object level (git blob OIDs, not file mtimes).** 18 objects under `test/baselines/`; **15
changed = 14 PNG + manifest.json**; 3 identical = `home-light.png`, `home-dark.png`, `README.md`.
**`home-light` and `home-dark` are BYTE-IDENTICAL blobs** -- the brief's verify-don't-assume
condition, verified at the object level. **Zero baselines added or removed.**

**Manifest discipline, field by field.** `env`, `capture` and `tolerance` blocks **IDENTICAL**;
baseline key set identical (16 keys); `generated` moved; **exactly 14 `sha256` fields changed**,
and `home-light`/`home-dark`'s sha256 are among the unchanged.

**Per-baseline, my own differ** (`vrdiff.py`: numpy/PIL, not the repo's JS PNG decoder, matching
its `channelTol=2` semantics):

**All 14 changed-pixel counts and all 14 bounding boxes reproduce EXACTLY** -- walk-light 98365 @
900x540(11,260); walk-dark 81782; drill-light 92189; drill-dark 87490; sys-light 32343; num-light
92154; wb-light 74818; the five `room-*` 114693 / 91416 / 94587 / 110874 / 93787; m-walk-light
8269; m-walk-dark 7135. Both `home` baselines: **0 px**.

**Attribution, spot-checked on five baselines** (walk-light, drill-light, room-architecture-apis,
sys-light, m-walk-light):

*My first attribution instrument was wrong and I discarded it.* I tested whether one vertical
translation of the lower band explains the churn. It does not, and it never could -- the seg
strip grows inside the LEFT RAIL, so rail content shifts while the pane beside it does not.
Wrong model.

The discriminator that works: **erode the changed mask.** Glyph repaint is thin (1-3px strokes)
and erodes away; a moved or resized solid block survives. Large solid blocks DID survive 5x5
erosion, so I did not stop at the pixels -- **I identified every one of them live, in both
builds, by hit-testing their centres** (`pointprobe.cjs`). Result:

- **Every solid block resolves to the SAME ELEMENT in both builds.** `div#warc.arc-grid`
  (y 715.83 -> 699.33, identical w/h), three `button.arc-step` (pure translation, identical
  180.55x70.78), `button#inttog.inttog` (h 55->56), `button.flow-pip` (h 44->48), the seg tabs
  (h 44->48), `div.nav` (h 35->37), a `<summary>` (h 68 -> 49.5, a text RE-WRAP -- Segoe UI is
  narrower, so it fits fewer lines).
- The one point that resolved to a *different* element did so because the `summary` above it
  moved; the same `summary` is present in both builds and I confirmed it at its new position.
- Row-occupancy test: **0 rows gained text from empty and 0 rows lost all text** on the four
  desktop probes. m-walk shows 2/3 rows at the very bottom edge -- the 1px dock shrink.
- sys-light's churn is **100% inside the rail** (x<300) and 0% in the pane, consistent with only
  the rail's tabs being re-faced on that surface.

**Nothing structural. Nothing appeared. Nothing vanished.** The churn is glyph-region repaint
plus metric reflow, on all five probes.

**Named reflows reproduce exactly:** nine seg tabs **44 -> 48px**, strip **420 -> 456**, width
unchanged at **260**; `.nd-go` **103.91 -> 92.36** wide; `#mockopen.mockbtn` **66 -> 64**;
`#inttog.inttog` **55 -> 56**; `.crambtn` heights **42.80 / 59.59 / 62.00 unchanged**; mobile
`.mockbtn` **47 -> 46**. `sidebar_geometry` and `fold_budget` both PASS on my gate run.

---

## 5. THE REVIEW PAIR -- reproduced byte-for-byte, assertions falsified

Re-ran the committed `seg-strip-pair.cjs` from a scratch copy with the two deliverables passed
explicitly and output redirected to scratch (nothing written into the repo).

**All four PNGs came back BYTE-IDENTICAL to the committed ones.** `seg-light-BEFORE.png` 30327,
`seg-dark-BEFORE.png` 24492, `seg-light-AFTER.png` 29013, `seg-dark-AFTER.png` 23792 -- `cmp`
clean on all four. **before == base render, confirmed.**

Every framing fact the freeze states reproduces: strip carries **10** buttons, **9 rendered**;
before tab **44px** / strip **420** / face `-apple-system, sans-serif`; after tab **48px** /
strip **456** / face the app stack; light and dark place the rail **2px** apart (476.58 vs
478.58); the crop is the union over both builds and both schemes (x=7 y=463 w=284 h=337); and
**the rail clears SIX tabs before and six after** -- the freeze's "4px x 9 does not cost a tab"
is correct.

**Negative controls on the framing assertions (they are live).** Demanding 10 rendered tabs:
throws, **0 PNGs written**. Forcing a 1000px viewport: `FRAMING ASSERT: innerWidth is 1000`,
**0 PNGs written**. The assertions genuinely gate output rather than decorating it.

But see **F-B** -- the one thing this instrument does not assert.

---

## 6. THE GUARD -- watched red, mutants, and my own falsification battery

**Watched RED reproduced with the SHIPPED guard against the base tree** (scratch export,
`git init`-ed so `git ls-files` answers): **orphans 90, 91 findings, exit 1**, and the shape
breakdown is identical to the committed capture -- 83 truncated / 5 system-ui / 1 canonical at
`body` / 1 BlinkMacSystemFont+system-ui / 1 missing `--sans`. (The committed capture's *header*
differs from what the shipped check prints -- see F-F.)

**Green on the real worktree**: `189 AUTHORED (git-tracked) files scanned, 498 build artefacts not
scanned, 180 declarations, 0 orphans, 2 documented exceptions, drift arm 1 copy / 0 drifted`.
Both counts in §3 of the freeze verified.

**All five committed mutants reproduce**, including the honest one: **Mutant B fails via the
EXCEPTIONS-key miss with a SECOND-SPELLING reason and `drift arm: 0 copies / 0 drifted`** -- so
the freeze is right that without Mutant E the drift arm would be undemonstrated. **Mutant E
(`--sans` drifts, print literal left behind) fires the drift arm ALONE**: `orphans: 0`,
`drift arm: 1 drifted`, FAIL. The two arms are genuinely separable.

### My own battery (13 probes beyond the committed five)

| probe | result |
|---|---|
| plant one truncated stack | **RED**, orphans 1, correct reason + site |
| defect inside a `/* comment */` | **PASS** -- prose is not code (no false positive) |
| **a SECOND `--sans` definition** | **RED** -- an arm the mutants did not exercise |
| `--sans` deleted | **RED**, single-definition arm |
| unowned face (Verdana) | **RED** |
| `--sans` drifts, literal left | **RED** via drift arm alone |
| **analyser blinded to `-apple-system`** | **SELF-TEST ABORT**, exit 1 |
| **`LEGIT_TOKENS` broken (false positive)** | **SELF-TEST ABORT**, exit 1 |
| `git ls-files` returns nothing | clean **ABORT**, exit 1, **no traceback** |
| `subprocess.run` raises `FileNotFoundError` | clean **ABORT**, exit 1, **no traceback** |
| untracked `src/*.css` carrying the defect | PASS -- documented scope, argument holds |

**The self-test is not decorative.** My first blinding attempt was a bad mutation on my part
(I only changed the failure *reason*, so the declarations were still flagged and the self-test
correctly did not fire). Redone properly -- making `classify()` return `'ok'` for
`-apple-system` -- the check **ABORTS** with "missed the truncated stack / missed a partial
system-ui stack". Breaking it the other way (false positive on `var(--sans)`) also ABORTS. It
detects blindness in both directions.

**The untracked-file argument holds.** A defect in an untracked `src/*.css` evades, as
documented -- but `build_integrity` requires the committed deliverable to equal a fresh build of
HEAD, and a fresh build of HEAD cannot contain an untracked file's CSS. The escape is closed by
a different check, which is what the freeze claims.

---

## 7. THE F-1 RESIDUE (W20 §10.2) -- corrected, and the correction matches the proof

The falsified rationale is gone from the live text at `src/styles.css:2052-2060` and replaced
with a correction that matches W20's cold verify point for point: `panels.js:282` emits the
inline `--rm:`; `phantom_tokens.py:36-37` names that exact shape as legitimate; its self-test
asserts `--rm` must not be flagged; a deliverable with the fallback stripped to bare `var(--rm)`
runs the shipped check **byte-identical (NEW: 0, PASS)**; provenance cited as
`_audit/2026-07-30-w20-hue-coldverify.md F-1`; and it states the code is right and only the
reason was wrong. **The `var(--rm,var(--acc))` code itself is untouched** -- no `+`/`-` line in
the diff alters it, exactly as W20 recommended.

The old phrase still appears in the file, but as a **quotation inside the correction** ("It was
documented here as `...`, and that was FALSIFIED by experiment"). That is the correction citing
what it corrects, not a surviving residue. Same discipline as the preserved W4 F-7 prose, which
I confirmed is **byte-identical** base->tip (base `styles.css:1786-1791` == tip `1795-1800`).

**W20 §10.1 (H-1) correctly left ledgered.** I checked the surface claim rather than accepting
it: the `src/` diff is **91 pure family-swap line pairs plus exactly two comment blocks** (see
Section 8). No colour literal is added, removed or altered anywhere in the wave. H-1 is a
colour-literal guard blind spot; this wave cannot make it more or less reachable. Agreed, and
agreed that folding it in would have put an unattributable change inside the round's one
authorized rebaseline.

---

## 8. THE DIFF -- "no line that is not a family swap or the new token comment", verified

Mechanical check on `git diff -U0 -- src/`: **93 lines removed, 109 added**. Masking every
`-apple-system...sans-serif` run and every `var(--sans)` to one sentinel, **91 line pairs become
identical** -- i.e. 91 pure family swaps (89 folds + `body` + `--display`). The residue is
**exactly 2 removed / 18 added**: the new `--sans` token comment block + its definition (9
lines), and the F-1 comment correction (2 removed, 9 added). **Nothing else changed in `src/`.**
This corroborates the freeze's claim precisely.

---

## 9. THE FED HAZARD -- it does not reproduce, and no NameError is reachable

The brief told me Pyright flags `"collect is not defined"` at `typeface_census.py:266` and
`"subprocess is not defined"` at `:218`, and asked me to determine reachability.

**Neither diagnostic exists.** Pyright **1.1.411** on the shipped file reports exactly **one**
diagnostic, and it is neither of those:

```
severity error  rule reportOptionalMemberAccess
"group" is not a known attribute of "None"
typeface_census.py:296  ->  pinned = norm(SANS_DEF_RE.search(FIXTURE_OK[1]).group(1))
```

Line 218 is prose inside `collect()`'s docstring; line 266 is `''')`, the close of `FIXTURE_OK`.
Neither mentions the named symbol. `import subprocess` is line 65 and `def collect()` is line
207 -- **both bind at module scope**; ruff's F821 (undefined name) is clean; and loading the
module confirms `collect` and `subprocess` are both present as attributes.

**Reachability of the real finding: NONE.** `FIXTURE_OK[1]` is a module constant whose text
contains `--sans:`, so `SANS_DEF_RE.search` cannot return `None`. It is a static-analysis
false positive on a hardcoded fixture. Empirically: `self_test()` runs first on **every**
invocation, and it executed without a traceback in every one of my 20+ runs, including all
13 mutation probes.

**Reachability of a NameError: NONE, demonstrated two ways.** I removed `.git` so
`git ls-files` returns nothing, and I monkey-patched `subprocess.run` to raise
`FileNotFoundError`. Both produce the **clean ABORT** path -- the check prints its explanation
and returns 1, with **no traceback in either case**. There is no red, plant, or mutant path on
which this check crashes instead of failing.

*Recommendation:* the one-line hardening would be to bind the match first and assert it, so the
static analyser is satisfied and a future edit to `FIXTURE_OK` fails loudly rather than by
`AttributeError`. Cosmetic; not a defect in behaviour.

---

## 10. GATE -- 71/71, re-run independently

`npm run gate` on the committed tree, box otherwise quiet, tree clean before and after,
HEAD unmoved at `0f55309`. Capture: `gate-rerun.txt`.

**71 checks, 71 PASS, 0 FAIL, 0 SKIP. `GATE: PASS`.** No retry was needed -- `grade_reveal` and
`touch_floor` both passed first time.

- Check **name set is identical** to the committed capture.
- Base `f7eb2dd` (W20 train capture) had **70**; the single addition is **`typeface_census`**.
  70 + 1 = 71, as the freeze states.
- `build_integrity`: *"12149084 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the
  deliverable, **COMMITTED deliverable == fresh build of HEAD**"* -- the full HEAD match, so the
  rasteriser numbers were measured on the file this branch ships. I also confirmed the worktree
  deliverable is byte-identical to `0f55309:deepdive_content_pipeline_rehearsal.html`.
- `visual_regression`: 16 baselines matched their committed pixels -- so the 14 rebaselined PNGs
  are genuinely what the tip build renders.
- `latent_arial`: PASS at zero, now standing beside the check that asks the other half.

**Exactly one line differs from the committed capture**, and it is evidence my run is real
rather than a copy: `print_truth`'s `file-print-never-opened` PDF is **391492** bytes in the
committed capture and **391493** in mine. A 1-byte PDF serialisation difference, not a check
result.

`0f55309` touches only `_audit/` (the gate capture + 11 lines of the freeze), so the gated tree
state is `9f54d09`'s -- correct commit-first-then-gate practice.

---

## 11. FINDINGS

### F-A -- "48 buttons" is a surface-instance count, not a button count. It is in SHIPPED SOURCE. (documentation)

`src/styles.css` (the new `--sans` comment) says *"48 buttons -- all nine .seg pane tabs among
them -- rasterised in ARIAL"*, and `test/check_all.py` says *"48 buttons with real label text
rasterised in Arial/Arial Black"*.

The measurement is **16 distinct buttons**, walked on **3 topic surfaces** (16 x 3 = 48). The
builder's own JSON shows `real-text per surface: {walk: 16, index-overlay: 16, search-overlay: 16}`
and only **9 distinct keys**; my independent probe on one surface counts **16**. Likewise "90
buttons rasterising an Arial-family face" is 30 per surface x 3, and "3 genuine fallbacks remain"
is **one** button (`#homeBtn.tn-step.tn-home`) x 3.

The freeze itself is honest -- §4 states *"each topic surface ran 16 real-text + 14
single-glyph"* right below the table, so a reader can reconcile it. **The two shipped source
comments carry the 48 without that breakdown**, and they are the copies a future wave opens.
Additionally, the W4 ledger's **26 buttons** is never reconciled to 48/90 anywhere.

*This is the exact failure mode this wave just fixed for F-1: a number a future wave reads out of
the file and cannot check.* **Fix: one clause** -- "16 buttons on each of three topic surfaces
(48 button-surface instances)", plus a sentence reconciling W4's 26.

### F-B -- the review pair cannot reproduce itself, and a re-run silently DESTROYS it. (reproducibility)

`seg-strip-pair.cjs:44` resolves the BEFORE build from **`git rev-parse HEAD`**. That was the base
when the builder ran it. On the committed tree HEAD is **`0f55309`**, and
`HEAD:deepdive_content_pipeline_rehearsal.html` is byte-identical to the AFTER build.

Demonstrated: pointing the script at the tip as "BEFORE" produces all four PNGs, exits **0**,
fires **no assertion**, and the resulting `seg-*-BEFORE.png` are **byte-identical to the
`seg-*-AFTER.png`**. Running the committed script today overwrites the committed evidence with a
degenerate pair that looks exactly like a successful run.

The script asserts exhaustively about framing and **nothing about the two builds being
different** -- "evidence-shaped and evidence-free" one level up from the hazard its own header
warns about. **Mitigating and why this is not blocking:** the committed PNGs are genuine -- I
reproduced all four byte-for-byte from `f7eb2dd` and `0f55309`. *Fix: pin the base rev, or assert
the two deliverables differ (the strip heights 420 vs 456 are already measured and would do).*

### F-C -- the §5 attribution ships without the instrument that produced it. (reproducibility)

`layout-delta.cjs` is committed, but it only **DUMPS** boxes. The classifier that produced
*"174 TEXT-SIZED, 898 REFLOW, 1 flagged STRUCTURAL"* is not in the commit, and neither are its
two JSON dumps -- unlike the rasteriser proof, which committed the instrument **and** both data
files. So §5's headline classification is not reproducible from the repository.

**Mitigating:** I re-derived every load-bearing figure with my own classifier over the same
dumps -- **1792 boxes, 1073 moved, 0 appeared, 0 vanished, exactly 1 box with a non-text cause**
(the `m-walk div.app` padding), and **0 boxes with a changed font-size/weight/line-height**. The
TEXT-SIZED/REFLOW sub-split differs (391/681 vs 174/898) purely because the arbitrating rule is
the part that was not committed. *Fix: commit the comparator, or state the classification rule in
the freeze so the split is checkable.*

### F-D -- `src/fonts.css` is skipped WHOLESALE, not just its `@font-face` descriptors. (guard scope, latent)

`typeface_census.py:194`: `if rel.endswith('fonts.css'): continue`, commented *"@font-face
descriptor, not a use"*. It skips the whole **file**. I planted
`.evil-in-fonts{font:var(--font-weight-bold) 12px -apple-system,sans-serif}` in `src/fonts.css`
and the census stayed **PASS**.

Reachability is currently **zero** (fonts.css holds one `@font-face` descriptor), but of all the
gaps this is the most plausible place for a future author to add a family rule -- it is the file
named after fonts. *Fix: skip only the `@font-face` block, or only the descriptor context.*

### F-E -- the `font:` shorthand parser is blind to three shapes. (guard scope, latent)

All three verified by plant on a scratch copy; all three returned **PASS**:

1. **A font-size unit `SIZE_RE` does not enumerate.** It lists `px|rem|em|%` and
   `var(--font-size-*)`. `font:var(--font-weight-bold) 12pt -apple-system,sans-serif` and the
   `3vw` variant are both invisible -- and *silently*, since `family_of()` returns `None` and the
   declaration is not even counted in the printed `declarations` total. `pt` is the conventional
   print-stylesheet unit and this app has a print path.
2. **A declaration split across two lines** -- `declarations()` iterates `splitlines()`.
3. **`FONT-FAMILY:` in uppercase** -- CSS property names are case-insensitive; the regexes are not.

**Reachability today: zero on all three.** I grepped the tip: 0 font shorthands with
`pt|vw|vh|ch|ex|cm|in|pc|vmin|vmax`, 0 uppercase font properties, 0 multi-line font declarations.
The only tracked `src/` files outside the `.css/.js/.mjs/.html` filter are 38 `.md` and one
`.gitkeep`, and **none contains a font declaration**. So the ratchet holds against everything
currently in the tree -- but a ratchet's whole job is the code that has not been written yet.
*Fix: add the missing units, add `re.I`, and count-then-warn on a `font:` shorthand whose family
could not be parsed rather than skipping it silently.* The last of those is the important one: a
declaration the parser cannot read should not be indistinguishable from one that is clean.

### F-F -- the committed watched-red capture is not what the shipped guard emits. (documentation, minor)

The capture's header reads `scanned : 189 files under src/` with no `not scanned` block, and
lists `src/styles.css:320` first. The shipped guard prints
`scanned : 189 AUTHORED (git-tracked) files under src/` followed by a three-line `not scanned`
block, and sorts `src/scripts/app/...` first. The capture therefore came from an **earlier
revision** of the check than the one that ships.

**Every number in it reproduces exactly** when I run the shipped guard against the base tree
(90 orphans, 91 findings, 83/5/1/1/1, exit 1), so nothing is misstated -- the artifact simply is
not a byte-reproducible run of the committed check. *Fix: re-capture, or note the revision.*

### F-G -- the "17 rules" reconciliation is one clause off. (documentation, minor)

Freeze §2: *"The 17 rules the brief carried forward were the count in `styles.css` alone"*. The
count of *defect-shaped* declarations in `styles.css` alone is **22** (the freeze's own
distribution row and §10 inventory both say 22). **17** is specifically the *truncated*
`-apple-system,sans-serif` count there, which I measured exactly. The following clause, *"the
class is four times that size"*, is 4.1x against 22 and 5.2x against 17 -- it reads as attaching
to the 17. *Fix: "the 17 truncated-stack rules in `styles.css`".*

### Observation (not a finding) -- the named-reflow list is a selection, not an enumeration

Two metric reflows I measured are not in the freeze's named list: `div.nav` (the walkthrough
prev/next row) **35 -> 37px** tall with `#wprev` **82.81 -> 78.59** wide, and a `<summary>` on the
walk surface **68 -> 49.5px** -- an 18.5px shrink from Segoe UI re-wrapping the text into fewer
lines, the largest single-element geometry change I found anywhere. Both are squarely
metric-driven and inside the 1073; the freeze names the ledgered buttons the brief asked about
and cannot name all 898. Recorded for completeness only.

---

## 12. WHAT I CHECKED AND FOUND NOTHING WRONG WITH

- The census: every count, every shape, every per-file figure, base and tip.
- The `--sans` token: single definition, byte-identical to what `body` declared before, byte-identical
  to the pinned print literal.
- Both documented exceptions: argued in place, and the print literal genuinely **compared** rather
  than trusted.
- The rasteriser proof: my own probe, my own selection, both viewports.
- The metric-only claim: over all 1792 boxes, not a sample.
- VR: 14 changed / 2 byte-identical at the blob level, all 14 px counts and bboxes, manifest
  field by field, attribution on five baselines by two methods.
- The review pair: byte-identical reproduction, assertions falsified in two directions.
- The guard: watched red, all five mutants, plus 13 probes of my own including two self-test
  sabotages and two abort paths.
- The F-1 correction against W20's proof; the preserved W4 F-7 prose byte-for-byte.
- H-1 correctly out of surface: no colour literal moves anywhere in the diff.
- The gate: 71/71 on my own run, name set identical, base was 70, the delta is `typeface_census`.

**Nothing in this wave ships a face the stylesheet was not already asking for, and nothing moved
that font metrics do not explain.**
