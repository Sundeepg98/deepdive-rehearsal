# W-ADDRESSES WAVE LEDGER -- the home delight verdict, worked

**Worktree** `D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses`
**Branch** `fix/w-addresses`, cut from master tip `0aba404`.
**Sources of record** the home-delight verdict `appeal-directions/_ia/home-delight-check.md`
(including its INHABITANT READING, section 13); the coverage audit
`_audit/2026-08-02-e2e-journey-coverage.md` (GAP-3 part 2); the zone amendments in the tail of
`appeal-directions/_ia/ADOPTED.md`.
**Gate expectation** **78/78**. Master was 77; this wave registers exactly ONE new check,
`craft_hygiene` (item 9). Every other arm extends an existing check -- `home_claims`,
`scoreboard_salience`, `home_reflow`, `latent_arial`, `search_deadend`, `home_fold` -- so nothing
else moves the count.
**VR contract** the FOUR home baselines are REBASELINE AUTHORIZED (items 7 and 8 move pixels by
construction); the other fourteen must not move. Manifest stays at **18** -- no baseline is added
or removed. Receipt pairs kept in `_audit/w-addresses-home-before-after/`.

**Predecessor note, recorded because it changed what this cycle did.** The build work for all ten
items was already on disk, uncommitted, when this cycle opened -- a stalled earlier instance. It
was audited item by item against the tree rather than trusted, and the audit found five defects in
it that a gate would have caught and a hand-off would not have. They are listed under THE AUDIT OF
THE INHERITED TREE below, because "the work was already done" is exactly the claim that needs
receipts.

---

## CYCLE 1 -- 2026-08-03

Ten items opened. **Ten closed.** One deliberately closed at HALF its named scope, with the reason
and the blocking wave named (item 10). One item's own class is partly deferred behind a ratchet
rather than fixed, with the argument recorded (item 9).

---

### 1. THE DOOR LIGHTS IN THE ROOM YOU ARE RETURNING TO -- CLOSED

**The defect.** `applyIdentity()` stamps `data-group` on `<html>` on every topic switch
(`topic-protocol.js:82`) and nothing ever clears it; `index.html` hard-codes
`data-group="architecture-apis"` for first paint. So on a seeded record whose resume topic was
Event-Driven Backbone (Messaging & Events) the home rendered with `--acc` = `#963D86` MAGENTA --
the BOOT CONSTANT -- while the Resume CTA's border was correctly teal, because it alone uses
`--rm`. The one element that had been fixed knew the right room; the focus ring on all 46 topic
cards, both Cram buttons, every hover border, the boot ring and the skip link did not.

**The fix.** `home-view.js` -- `doorRoom()` reads `Panels.resumeTarget()`, the SAME function the
resume act renders from, and falls back to the first topic when there is no resume target (which
is what the cold START card points at, so the rule is read off the act in both record classes).
`stampDoorRoom()` sets the attribute BEFORE `innerHTML`, so the first paint is already in the room
and there is no magenta-then-teal flip. It needs no teardown: leaving a topic re-stamps through
`applyIdentity`, and arriving at the resume topic without a switch leaves the group where this put
it -- which is that topic's own room. The two writers cannot disagree because they agree.

**The arm + its mutant.** `home_claims` -- the home's `data-group` must equal the resume target's
group on seeded records. MUTANT: stamp the boot constant while the resume act is in another room
-- **RED**, and it is the exact state every `var(--acc)` consumer wore before this wave.

---

### 2. SEVERITY IS AN ORDERING -- CLOSED, AND THE FIRST FIX WAS NOT ENOUGH

**The defect.** Grades run `lv >= 3` solid, `lv === 2` shaky, `lv === 1` missed
(`altitude.js:58`), so MISSED IS THE WORST. The gauge wired MISSED to `--st-warn-edge` and SHAKY
to `--st-warn`, and `--st-warn-edge` is the subdued BORDER companion of `--st-warn` -- used
off-label as the fill of a primary signal. Against the trough: SHAKY 4.64:1 light / 8.21:1 dark,
MISSED 2.02:1 / 2.96:1. The worst grade drawn 2.30x quieter than the middle one, and the only one
of the two below the 3:1 floor, in both schemes.

**The fix, and the second half of it is the interesting part.** `--keel-missed` is `--st-warn`
(the loud primary); `--keel-shaky` is a mid rung derived by scaling `--st-warn` in LINEAR LIGHT,
which preserves chromaticity exactly -- the same colour dimmed, so the pair reads as one channel
at two strengths rather than two hues. That matters because the gauge's own SIGNAL RULE forbids
hue from carrying a grade.

Swapping the tokens fixed the ordering **against the trough** and did NOT fix what the eye sees,
because a keel is never drawn on the trough: a topic with flagged probes has necessarily been
graded, so its capsule is `.open` and the keel's real neighbour is the capsule's own FILL, which
runs from the pale rule to full `--ink`. The two values STRADDLE that range, so their order FLIPS
WITH THE GROUND -- measured after the swap: light missed 2.60 vs shaky 3.54, dark missed 1.82 vs
shaky 4.40, still inverted, and 1.13:1 in the middle of the fill range. **No pair of colours can
order correctly against a ground that sweeps Y 0.85 to Y 0.02.** So the fill now stops short of
the bottom 2px and the keel paints into that gap, on the trough, always -- a hard-stop gradient
gives `.open` the same base. The mark is literally a keel now: the hull sits in the channel and
the mark is below the waterline. `--keel-h` is one number, so fill and mark cannot drift.

**Measured after, off the panel's own pixels** (`scoreboard_salience`, `--lv` swept over all four
fill steps):

| | MISSED | SHAKY | floor |
|---|---|---|---|
| light | **4.64** | 3.67 | 3.0 |
| dark | **8.21** | 3.62 | 3.0 |

**The mutant:** the shipped keel wiring restored -> `missed 2.02 vs 4.64 (INVERTED, caught)` light,
`2.96 vs 8.21` dark.

**A named consequence, solved rather than discovered later.** Raising the untouched capsule's rule
(item 3) while leaving `.open`'s at `--bd` would have drawn a topic you HAVE started at 0% solid
QUIETER than one you never opened -- a second inversion created by the fix for the first. Both take
`--gauge-rule`, so the ramp is monotone by construction.

---

### 3. THE GAUGE'S DENOMINATOR -- CLOSED

**The defect.** "Untouched keeps an empty outline so the honest denominator is never hidden" is the
panel's own stated law. Drawn with `--bd` it measured **1.09:1** light / 1.46:1 dark against the
trough, so at 46 segments the lattice dissolved into a beige trough and the pre-attentive read
became "a progress bar, about 15% full" -- the generic form the mark was invented to escape.

**The fix.** `--bd` is the app-wide hairline with ~200 consumers and cannot move for this, so the
lattice gets its own rule. Solved against BOTH grounds, because the capsules sit on `--side` and
the legend's swatches sit on `--card`, and which pair is tighter flips by scheme.

**Measured after (rasterised):** untouched rule **4.10:1** light / **4.23:1** dark, floor 3.0.
**MUTANT:** rule back to `--bd` -> **1.09:1 light / 1.46:1 dark, under floor, caught.**

The legend's four swatches take the same values and the same `--keel-h`, or a legend would be
drawing something other than the mark it names.

---

### 4. THE 138 MARKS GET A TEXT EQUIVALENT -- CLOSED

**The defect is stronger than "title is mouse-only".** Each capsule names its topic through a
`title` attribute, which does not fire on touch and is not reachable by keyboard -- but the track
above it carries `role="img"`, and **role="img" makes its descendants PRESENTATIONAL**: the 138
titles are removed from the accessibility tree BY CONSTRUCTION, not merely awkward to reach.

**The fix, and why it is a description rather than 138 names.** Dropping `role="img"` would put 46
unlabelled spans per rail into browse mode; naming each would announce 138 marks before the reader
reached the verdict. The app already has a ruled pattern for "this visual carries something the
name cannot" (`session-progress.js:247`): an `aria-describedby` pointing at a real off-screen text
node. The NAME is unchanged, so nothing regresses; the DESCRIPTION is the lattice read out in the
order it is drawn, every segment contributing its own clause from the same `s` the mark is drawn
from -- so the text cannot drift from the picture, and there is no cap to get wrong. The `<p>` sits
OUTSIDE the `role="img"` subtree, because a descendant of it could not be referenced out of
presentational-ness.

`.hm-vh` is a second off-screen primitive rather than a fold into `.nsep`, and the duplication is
FORCED: `at_name_hygiene` arm A pins the `.nsep` rule by a regex, so folding a selector into it
breaks that guard. `.hm-vh` takes `white-space:normal` because these are sentences.

**The arm + mutant.** `home_claims` asserts the rail's AX node carries a description AND that it
names the topics THAT rail draws, read from the registry rather than from the rendering. MUTANT:
strip the tie -> **RED**.

---

### 5. THE 367px VOID -- CLOSED

**The defect.** Every panel on the home is content-fitted to within 1px -- Where you stopped
251/250, Altitude 286/285, Still shaky 546/545, Coverage 381/380 -- except the paired row's second
cell, which ran **520px tall over 153px of content**. Grid items stretch by default, so the taller
sibling set the row height. Layout, not missing data.

**The fix.** `align-items:start` on `.hm-duo`. One declaration.

**The arm + mutant.** `home_reflow` -- "no home panel is a hollow card (content-fitted within
40px)" at 700 and 900. MUTANT: `align-items:stretch` put back -> **RED**, checked against its own
negative control.

The inhabitant pass named this exactly: *"the only visual rest the home offers is a layout bug."*

---

### 6. THE TWO ARIAL LEAKS -- CLOSED, AND THE AUDIT'S DIAGNOSIS WAS WRONG

The delight census read the home's only two non-system-face nodes as "Arial 12px/600 [ix-star-ic]
x2" and called them the star GLYPHS. **They are two separate defects, and neither is what was
named.**

**(a) The PILL, not the glyph.** `.ix-star-pill` is a `<button>` that declares a size and a weight
and never re-declares a FAMILY, so the UA form-control stylesheet keeps Arial and both the star
span and the topic title inherit it. `font-family:inherit` fixes it. This is exactly the class
`latent_arial` ratchets -- and its debt file read `{}`, because that check drives a COLD record
and the STARRED block only renders when something is bookmarked. The check now seeds a bookmark on
its home surface, so the blind spot cannot come back.

**(b) The STAR IS A SHAPE, NOT A CHARACTER.** `--sans` is `-apple-system, BlinkMacSystemFont,
"Segoe UI", Roboto, Helvetica, Arial, sans-serif` and **not one of those faces carries U+2605**, so
Chromium fell through the whole list and the PLATFORM picked the face per glyph (Segoe UI Symbol
here; Arial on the build the audit ran). That IS the defect -- the app did not make the choice. A
`font-family` on the rule would only move the choice from the platform to a documented exception,
and this item's bar is ZERO new exceptions. So the mark stops being text: a `clip-path` polygon,
which takes no font, cannot substitute, and is identical on every platform, sized in `em` so it
still tracks the pill's type. The glyph is gone from the markup too.

**Measured after:** `latent_arial` **0 components in UA default, 0 new, 0 stale**;
`typeface_census` **2 documented exceptions -- the same two as master**, so zero new.

**The rest of the class is NAMED, not silently left:** nine more codepoints resolve outside the
stack (the reset arc and command key to Cambria Math, the house glyph to Arial, six to Segoe UI
Symbol). They sit in the app FRAME and on topic routes, whose VR baselines this wave may not move,
so they are ratcheted as declared debt in `craft_hygiene_allow.json` -- the class cannot grow, and
the app-wide fix has somewhere to land.

---

### 7. ARRIVAL ORDER: THE ACTS LEAD, THE AUDIT RECEDES -- CLOSED

**The inversion this fixes.** The COLD home opens with an invitation -- *"Walk me through how you
would design this"*. The ENGAGED home opened with what you got wrong: the decision, then
immediately the gauge, whose verdict is the largest sentence on the page and is an accusation
(*"the level you are interviewing for is the one you have rehearsed least"*), then a panel headed
**STILL SHAKY -- 41 FLAGGED**. The app was at its most hospitable to the person who has done
nothing and least hospitable to the person who has done the work -- on a surface whose one
inhabited moment is the gap between two hard rounds.

**The fix is ORDER, NOT COPY. Not one string moved and the reserved voice is untouched.**
`.hm-duo` comes up under the acts and the gauge goes below it, so the arrival runs: where you
stopped -> your week, and what to re-drill -> your altitude -> the rooms. The audit moves from
second to fourth. Within the duo the WEEK leads, so the first panel after the decision carries
*"6-topic goal met with 1 to spare"* -- the only genuinely happy fact this product ever tells
anyone, which was rendered second, to the right of STILL SHAKY.

**One order for every record class, deliberately** -- a cold record renders the same sequence with
the shaky panel absent, so there is no engaged/cold branch to keep in sync.

**It HELPS the phone fold rather than costing it:** the chip list ran 769..1006 at 390x844 against
a live band ending at 799; lifting the duo above a 288-306px gauge moves it up by that whole panel.

**The arm + mutant.** `home_claims`' `arrival` judge, DOM order, on every seed it drives. MUTANT,
both halves: the gauge restored above the paired row, and the paired row restored with the deficit
panel first -> **RED**.

---

### 8. CHEAP DEPTH, AND A GROUND THAT STOPS GLARING -- CLOSED

**The defect.** Card vs page ground measured **1.053:1** light and 1.142:1 dark. At 1.05:1 the five
panels are not surfaces on a ground; they are regions of one flat plane with a 1px rule between
them -- which is why the inhabitant pass counted 154 hairlines and called it RULED PAPER. And the
light field sat at mean luminance 0.941 with 94.8% of its pixels in the top band, carrying body
text at 14.72:1: WCAG-excellent and tiring. **Contrast floors set a MINIMUM; comfort also has a
MAXIMUM.**

**The fix, and its asymmetry is the design.** In LIGHT the surface is already `#fff` and cannot be
brightened, so depth comes out of the ground; in DARK the ground is already the house black
(Y 0.0046) and cannot be darkened -- 1.3:1 there would need a NEGATIVE luminance -- so it comes out
of the surface. Both land on the same step. Scoped to `#home` so no topic route repaints and only
the authorised baselines move.

**Measured after, from the panel's own pixels:** light **1.329:1**, dark **1.298:1**.

Also here: the verdict is capped at the app's own body measure (it ran 590px = 78ch, and
comfortable prose is 45-75ch).

**Floors hold, and it is measured as a DELTA rather than asserted.**
`_audit/w-addresses-home-before-after/text-floor-sweep.txt` sweeps every text node under `#home` on
**both builds** -- master `0aba404` and this one -- in both schemes and both record classes:

| cell | min CR before | after | under before / after |
|---|---|---|---|
| light/engaged | 4.64 | 4.64 | 0 / 0 |
| light/cold | 5.27 | **4.93** | 0 / 0 |
| dark/engaged | 2.35 | 2.35 | 2 / 2 |
| dark/cold | 2.35 | 2.35 | 1 / 1 |

The three elements that sit on the BARE ground (the skip-the-home label, the backup buttons, the
lead line) go **5.27 -> 4.93 and CLEAR the 4.5 floor** -- which is what `--mut` being deepened on
this route by the same linear-light factor was for; without it the ground drop would have taken
them to 4.18:1. **VERDICT: NO REGRESSION.** It is a before/after ON PURPOSE: the home already
carries text that misses AA in dark, and a single-build sweep would have billed it to this wave.
See CARRIED below.

---

### 9. THE CRAFT SWEEP, AND ONE NEW CHECK -- CLOSED

`craft_hygiene` is the third census in its family: `typeface_census` asks whether the app owns the
FACE it declares, `tracking_census` whether it owns the SPACE, and this asks whether it owns the
MARKS it prints -- a straight apostrophe where the typeset form is `&rsquo;`, three periods where
an ellipsis belongs, a spaced hyphen doing an em dash's job, and a codepoint no face in `--sans`
carries so the platform picks the typeface. None can fail a correctness panel: every one renders
and every one is legible, which is exactly why the class grows one string at a time.

**It is a SOURCE check, and the brief said "the built deliverable's text nodes". The deviation is
measured, not preferred.** The shipped 12.3MB deliverable is **99.73% `<script>`/`<style>` by
bytes**; real HTML text nodes hold about **5.1k characters, 0.04% of the file** (verified this
cycle, independently of the check). A text-node walk would have swept a rounding error of the copy
and reported clean. So it reads string literals with a real JS scanner -- comments are not copy: a
bare `>...<` regex reported 523 straight quotes that were all design commentary -- and judges only
PROSE, since `SELECT count(*) ... WHERE` is an elision in SQL, not a trailing-off sentence.

**Result: the app CHROME is at ZERO for prose.** The three instances the sweep found there -- the
library filter placeholder, the Print Q&A description, the cold home CTA -- are now typeset.

**77 ruled exceptions remain, and what they are matters:** 73 are the topic CORPUS and 4 are app
scripts. Typesetting 57 apostrophes across 46 authored topics is a **content pass with its own
review**, not a side effect of a chrome wave; the glyph entries sit on surfaces whose VR baselines
this wave may not move. A stale entry (one matching nothing) FAILS the check, so the list may be
shortened without ceremony and lengthened only with an argument.

**Self-test every invocation:** five planted defects (three periods, a straight apostrophe,
straight quotes, a hyphen doing a dash's job, a codepoint outside the stack) plus two negative
controls including a design comment that must NOT be judged.

**Gate count: 77 -> 78.**

---

### 10. THE CHIP IS A CONTROL, AND IT LANDS -- CLOSED AT HALF ITS NAMED SCOPE, DELIBERATELY

GAP-3 part 2. `.hm-chip` had ONE reference in the whole test tree -- `at_name_hygiene`, a SOURCE
check on accessible names -- so nothing in the gate had ever clicked the home's own triage.

**Three things asserted** in `search_deadend` (which already owns "does this control land you where
it says", with hit-tested clicks): the route LEAVES the home; it lands on the chip's OWN topic,
matched by id; and the chip's printed integer equals that topic's STORED `shk`. The oracle is
localStorage, not another rendering. Seeds three topics with DIFFERENT counts, none of them the
first id, so a chip that silently lands on the boot topic cannot pass.

**MUTANT:** the record cleared -> the panel must render NO chip, so an arm that "passed" by finding
some other button goes red. **Proven.**

**THE HALF THAT IS NOT DONE, AND WHY IT MUST NOT BE.** The coverage audit's part 2 also asks that
"the landing drill's flagged set matches the chip's count". That is **GAP-2**, which the same audit
assigns to **W2 room**, and it is UNFIXED TODAY: `drill/logic.js:552-556` blanks `this.revisit` on
teardown and `:563` draws the flag class from it rather than from the stored record, so a returning
user sees 0 of 31 tiles flagged. Asserting that leg now would red on another wave's open defect,
not on this one's work. The audit says as much -- *"part 2 composes with GAP-2's arm"*. This wave
ships the half whose oracle is the record; the composition becomes available the moment W2 lands.

---

## THE AUDIT OF THE INHERITED TREE -- five defects found in work that was already written

Recorded in full because the tempting move was to run the gate on it and call it done.

1. **Thirty raw non-ASCII bytes in three checks** (`home_claims`, `scoreboard_salience`,
   `search_deadend`) -- ten U+2019 right single quotes inside assertion strings. `test/` is in
   `ascii_guard`'s SCOPE, so this was a certain gate red. Replaced with escaped ASCII apostrophes;
   the block-comment instances were left alone, since a bare `'` in a comment is legal and needs no
   escape. **The first repair pass was itself wrong** -- it wrote bare apostrophes into
   single-quoted JS strings, which `node --check` caught as a syntax error on all three files. The
   scripted second pass carried an ABORT on any anchor matching a count other than 1, and that
   abort fired on a phrase that appears twice, once in a comment and once in a string -- which is
   the only reason the comment was not corrupted.
2. **`src/styles.css` was two closing braces out of balance** -- `css_syntax` FAIL and one
   `unit_tests` FAIL. A new comment quoted a regex containing `\{[^}]*...[^}]*\}`: one `{`, three
   `}`. It broke no rule and no browser, which is exactly how it reached a green build and a red
   gate. The comment now describes the anchor instead of quoting it, and says why.
3. **`home_rhythm` FAIL, caused by item 8's measure cap.** `.hm-verdict` was given
   `max-width:var(--measure)` -- the hand-declared app-wide literal. Declaring a measure is how
   that check decides a block is a member of the home's centred column, so the rule was pulled into
   scope and dragged two more violations with it (a bare-primitive gap, and a registry entry it did
   not have). `var(--measure-body)` is the right answer on every axis: it is the SEMANTIC role, it
   is the half of a pair whose whole content is "body copy takes 68 characters", it is judged
   against the rule's own type tier (`--font-size-body`), and it correctly marks the rule as type
   INSIDE a block rather than a column member. Same 68ch, three violations gone.
4. **`home_fold` SELF-TEST ABORT** -- and this one is the wave's best receipt for the arms, because
   the check refused to certify itself. The fold contract is a DISJUNCTION (the first screen
   carries the triage if EITHER the act or the chip list is in the band) and its negative control
   moved only the act. Through W1.5 that emptied the band by accident -- the chip list was OUT in
   all 20 chip-bearing cells, a hazard W1.5's own ledger recorded as carried item F7. Item 7's
   reorder lifted `.hm-duo` above the gauge and put the first chip at 676 in a band ending at 799,
   so the second disjunct went live and the one-move plant stopped being a negative control. The
   plant now restores the WHOLE pre-wave order -- practice block to the end AND the paired row back
   below the gauge -- and aborts if either anchor is missing. Measured under the new plant: act at
   2267/2367, first chip at 998/1046, **both outside the band -- the arm goes red.** W1.5's F7 is
   closed as a side effect.
5. **A claim in shipped source with no receipt behind it.** The depth comment asserted the floors
   were "proven by a rasterised sweep of every text node on the route, both schemes, in the wave
   receipt" -- and no such receipt existed anywhere on disk. The sweep was then actually run (item
   8), which is how the pre-existing dark unders were found and correctly attributed instead of
   being blamed on this wave. The comment now states the real method (a COMPUTED sweep, ancestor
   grounds composited in sRGB), names the file, and states the carried exceptions.

---

## VR CONTRACT -- HONOURED

Rebaselined: **the four home baselines only** -- `home-light`, `home-dark`, `m-home-light`,
`m-home-dark`. Watched red before regenerating, captured at
`_audit/w-addresses-home-before-after/watched-red-visual-regression.txt`:

```
home-light     227229 px (22.1903%)  in a 1249x771 box at (0,0)
home-dark      404672 px (39.5187%)  in a 1249x771 box at (0,0)
m-home-light   117253 px (35.6219%)  in a 390x742 box at (0,57)
m-home-dark    199616 px (60.6441%)  in a 362x670 box at (14,129)
18 baselines compared; the other 14 at 0 px.
```

`git diff --stat -- test/baselines/` lists exactly **five** paths: the four home PNGs and
`manifest.json`. **The other fourteen rewrote byte-identical** under `npm run vr:update`, so the
non-home half of the contract holds by REWRITE, not by abstention. Manifest stays at **18**.

Both desktop plates were reviewed as images before regenerating and after. The four visible
changes are the four items that were supposed to move pixels: the ground stands off the panels,
the arrival leads with the act and the week, the 46-capsule lattice is countable where it was a
beige trough, and the verdict wraps at a shorter measure. Receipt pairs (`before-*.png` /
`after-*.png`) kept alongside.

---

## GATE -- 78/78 PASS

Full serial run (`python3 test/check_all.py`, no `--fast`, no `--shared-browser`) on the
**COMMITTED** tree (`72e8f28`), exit 0, zero FAIL lines. Capture:
`_audit/2026-08-03-w-addresses-cycle1-gate.txt`.

```
  78 checks in 802.0s (13.4 min)
GATE: PASS
```

Taken on the committed tree, which is why `build_integrity` reads the strong form rather than
deferring it:

```
BUILD INTEGRITY: PASS  (12323503 bytes, 0 unresolved, 9 panes + 7 overlays,
build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
```

The lines that carry this cycle's work:

```
craft_hygiene       PASS  (9280 rendered-copy spans, 77 ruled exceptions, all of them
                           still matching something)
scoreboard_salience PASS  ... the worst grade is never drawn quieter than the middle one
                           across the whole fill range, both keel marks and the untouched
                           capsule's rule clear the 3:1 non-text floor on the pixels, and
                           the panels stand off their ground
home_claims         PASS  17 planted mutants detected (... THE HOME LIT IN THE BOOT
                           CONSTANT'S ROOM ...; the arrival inverted in both of its
                           halves ...; the rails' aria-describedby tie stripped ...)
home_fold           PASS  (88 assertions across 11 records x 390x844 + 360x844)
search_deadend      PASS  (33 assertions: ... a real click on a Still-shaky chip leaves
                           the home for the topic it names ...)
latent_arial        PASS  (0 known component(s) allowlisted; no new latent-Arial button)
typeface_census     PASS  (186 declarations, 0 orphans, 2 documented exception(s))
visual_regression   PASS  (18 baselines, win32-chromium149; ... matched its committed pixels)
build_determinism   PASS  (88 Shiki blocks render identically under a simulated 600ms/line stall)
```

**Independent cross-check, free:** the branch CI gate (`python test/ci.py gate --nowait`, run
`30773318052`, 6 shards on `ubuntu-latest`) came back **success on every shard** -- so the wave is
green on a second platform as well as on the certifying win32 serial run.

The count is **78**, as the freeze states: one new registered check (`craft_hygiene`); every other
arm extends an existing one.

**The run before it was a FAIL, and it is worth keeping in the record**: 78 checks, five red --
`css_syntax`, `home_rhythm`, `unit_tests`, `home_fold`, `visual_regression`. Four were the
inherited-tree defects above and one was the authorised rebaseline. That run is the reason this
ledger can say the arms work: `home_fold` red-flagged its own negative control rather than passing.

---

## CARRIED -- not fixed here, each with the reason and the wave that owns it

1. **Three text nodes miss AA in DARK, pre-existing on master and identical to the decimal**:
   `.hm-room-n`, the six room-count badges, white on a saturated room fill at **2.35-2.44:1**; and
   `.hm-room-weak` at **3.48:1**. Measured on BOTH builds in the item-8 receipt. They are the six
   rooms' own pigments, so this is a PALETTE decision (`room_contrast`'s territory, which currently
   asserts ink/bg and on-slab/solid but not the badge pair) and not a home-ground one. Fixing it
   inside a home wave would either restate a room pigment or special-case the badge.
2. **GAP-2, the landing drill's flagged set** -- item 10's other half. Owned by **W2 room**.
3. **73 corpus prose spans + 4 app-script glyph spans** ratcheted in `craft_hygiene_allow.json`.
   The corpus is a content pass with its own review; the app-script glyphs sit on surfaces whose VR
   baselines this wave may not move. The list cannot grow silently -- a stale entry fails.
4. **The delight verdict's remaining candidates, none of them in this wave's ten**: the three rails
   sorted independently so columns carry no topic identity (the audit's own "one candidate risk");
   the per-room focus gel not carried from the six room buttons to the topic cards inside them; the
   arrival as ORDERED POSITIONS rather than three simultaneous fades; a display register for the
   probe question. All four are design calls, not repairs.
