# W-ADDRESSES WAVE LEDGER -- the home delight verdict, worked

**Worktree** `D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses`
**Branch** `fix/w-addresses`, cut from master tip `0aba404`.
**Sources of record** the home-delight verdict `appeal-directions/_ia/home-delight-check.md`
(including its INHABITANT READING, section 13); the coverage audit
`_audit/2026-08-02-e2e-journey-coverage.md` (GAP-3 part 2); the zone amendments in the tail of
`appeal-directions/_ia/ADOPTED.md`.
**Gate expectation** **78/78**. Master was 77; this wave registers exactly ONE new check,
`craft_hygiene` (item 9). Every other arm extends an existing check -- `home_claims`,
`scoreboard_salience`, `home_reflow`, `latent_arial`, `search_deadend`, `home_fold`, and in cycle 2
also `room_static` and `room_browser` -- so nothing else moves the count.
**VR contract** the FOUR home baselines are REBASELINE AUTHORIZED (items 7 and 8 move pixels by
construction); the other fourteen must not move. Manifest stays at **18** -- no baseline is added
or removed. Receipt pairs kept in `_audit/w-addresses-home-before-after/`. **Cycle 2 used none of
that authorisation: all 18 came back at 0 changed px.**

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

> **NARROWED IN CYCLE 2 (R5), and this sentence is left standing with its correction rather than
> quietly edited.** Two of the consumers listed above are no longer the door light's: a topic
> card's focus ring and its hover border now wear THEIR OWN SECTION's room (`--rm`), which is what
> they should always have worn on a surface that shows six rooms at once. What the door light
> actually moves on the home is the rest of the `--acc` surface -- the boot ring, the skip link,
> both Cram buttons, `::selection`, the goal strip's focus indicator, and the card hover WASH.
> See CYCLE 2 / R5.

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

> **FALSIFIED AND FIXED IN CYCLE 2 (R3), and the sentence above is kept so the error is legible.**
> The gap and the mark were the SAME two pixels, so a flagged capsule's keel still abutted the
> fill and nothing about its ground changed; the claim survived only because the instrument was
> pointed at the trough, where an opaque mark's colour is identical either way. Measured with a
> second ground: MISSED 2.75 / SHAKY 2.88 light, MISSED 1.94 / SHAKY 3.11 dark -- inverted, three
> of four minima under the floor. The waterline is now a real channel (`--keel-gap`), and the
> neighbour reading collapses onto the trough reading. See CYCLE 2 / R3.

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

> **"THE CLASS CANNOT GROW" WAS FALSE WHEN WRITTEN, AND IS TRUE NOW (CYCLE 2, R1 + R2).** Three
> holes, all pressed: the glyph rule ran only on PROSE spans, so a bare `<span>&#9733;</span>` was
> never judged; `.css` was out of scope, so six real marks shipped un-ratcheted and a planted
> seventh passed; and the key was a 120-character prefix of the span ALONE, so a mark excused in
> one file excused every future copy of itself anywhere. All three are closed and each has a
> proven RED plant. See CYCLE 2 / R1, R2.

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

---

## CYCLE 2 -- 2026-08-03

Five team-lead rulings on the cycle-1 escalation and six judge items, opened. **Eleven closed.**
Two of them closed differently from the way they were written, and both deviations are recorded
with the measurement that forced them: the ratchet key needed a THIRD binding nobody had asked for
(R1), and the boot constant turned out to be RIGHT about a question the ruling did not name (R4).

**What cycle 2 did NOT need:** the VR rebaseline. All 18 baselines returned **0 changed px** --
the keel geometry that moved is only drawn on a graded record and every home baseline boots cold,
the ring colours are focus/hover states, and the boot stamp settles to the value the constant had.
Manifest stays at 18.

---

### R1. THE CRAFT GLYPH GUARD -- CLOSED, AND THE SPLIT WAS NOT ENOUGH

**The ruling, applied exactly.** `judge()` now runs the glyph rule on EVERY span, unconditionally,
BEFORE the prose gate; the four typeset rules keep PROSE+space+not-CODE under them. Font ownership
is a fact about a codepoint and a stylesheet and has nothing to do with whether the string around
it reads as a sentence.

**Then the press found the ratchet was still open, in a way the escalation had not seen.** With
the split in place and the glyphs ratcheted, restoring
`<span class="ix-star-ic" aria-hidden="true">&#9733;</span>` in panels.js **still passed**. The
reason: the allowlist was keyed on the span alone, and `content:" \2605"` in styles.css strips to
the same single character -- so a mark excused in ONE file excused every future copy of itself
ANYWHERE. "The class cannot grow" was still false, in the exact place R1 named.

**So the key binds three things, not one.** `key = sha256(file + "\n" + stripped span)`, and each
entry declares a `count` of sites in that file. A hit whose rule the entry does not declare is a
finding; a declared rule that no longer fires is stale; one MORE site is the class growing; one
FEWER is debt that was paid and not written down. All four are gate failures.

**The five presses, on the real tree, receipt
`_audit/w-addresses-cycle2/press-craft-ratchet.txt`:**

| plant | verdict |
|---|---|
| the reinstated U+2605 star span | **RED** |
| a planted U+27A4 (a codepoint the app has never shipped) | **RED** |
| a planted CSS `content:"\2620 flagged for review"` | **RED** |
| an `ellipsis` 251 chars inside an allowlisted span declaring only `apostrophe` | **RED** |
| a SECOND site for a mark already excused in that file | **RED** |

**The ratchet: 77 -> 117 entries**, and the growth is arithmetic rather than debt. 79 carry over
from cycle 1 (some corpus spans live in more than one file and now hold one entry per file); 38 are
new -- 21 distinct spans the unconditional glyph rule and the CSS reader made visible, keyed per
file. The argument for all of them is the app-wide GLYPH pass: each needs a DRAWN substitute (the
`.ix-star-ic` treatment), they are SHARED marks (U+25BE is the topic-nav chevron, the mobile
library chevron, the drill chevron and a CSS `::after`, so fixing one site leaves the app drawing
one chevron two ways), and every surface but the home has a VR baseline this wave may not move.

**The ledger claim, restated so it is true:** the class cannot grow *silently* -- a new codepoint,
a new file, or a new site in the same file is a FAIL, proven by the five presses above.

---

### R2. CRAFT READS CSS -- CLOSED

`.css` is in `tracked_sources()`. A `content:` reader takes the printed strings of every
declaration in every tracked stylesheet, decodes CSS backslash escapes (`\2605`, with the one
optional whitespace terminator consumed -- getting that wrong silently changes what the rules
judge), strips CSS comments first (a design comment that quotes a declaration is not one), and
SKIPS the alt-text half of `content: "x" / "alt"`: that half is the accessible name, never
rasterised, so demanding a font for it would be a category error.

**Nine sites across five codepoints were already shipping there** and are now ratcheted per site:
U+203A (three sites), U+2039, U+25BE, U+2605 x2 (`.crambtn.starred .mb-t::after`, the one the
escalation named), U+25CF x2. U+201C was found and NOT ratcheted -- it is in the OWNED set, which
is the negative control working.

> **CORRECTED IN CYCLE 3, and the correction is left visible rather than quietly applied.** This
> paragraph said "six real marks" and "U+203A (two sites)". The allowlist R2 shipped declares
> 3+1+1+2+2 = **nine sites over five codepoints**, and re-measuring `src/styles.css` with
> craft_hygiene's own CSS reader returns exactly that -- so the instrument and the ratchet were
> right and only the prose was wrong, which is the same class of defect as judge item 3 and item
> 8. The entries' informational `lines` arrays had ALSO drifted 13-29 lines against the shipped
> file they index (U+25BE [1092] vs 1105, U+2605 [2011] vs 2028, U+25CF [2070] vs 2099). They are
> not part of the key and nothing enforced them -- so `--report` REGENERATES them now, and the
> refresh moved 14 entries. Enforcing them was considered and rejected: it would red the gate for
> inserting a line above a mark.

**Press: the planted `.hm-lbl::after{content:"\2620 flagged for review"}` -> RED.** The self-test
carries a CSS fixture too, with both halves: a clean stylesheet (an em dash, a ratcheted mark, an
empty alt half, and a comment quoting a `content:` rule) must come back clean, and its one real
mark must be SEEN -- otherwise a green from the CSS reader would mean only that it read nothing.

---

### R3. THE WATERLINE -- MEASURED FIRST, AND THE MEASUREMENT CHANGED THE ANSWER

**The measurement, taken before any CSS moved.** `readMarks()` now samples a SECOND ground: the
band immediately above each keel, inside its own rail, one CSS px in from each side and inset a
device row top and bottom -- the pixels the eye actually compares the mark against. On the cycle-1
build, over 70 keel marks per scheme:

| | trough | neighbour min | neighbour max | floor |
|---|---|---|---|---|
| light MISSED | 4.64 | **2.75** | 6.70 | 3.0 |
| light SHAKY | 3.67 | 2.88 | 5.39 | 3.0 |
| dark MISSED | 8.21 | **1.94** | 6.50 | 3.0 |
| dark SHAKY | 3.62 | 3.11 | 6.59 | 3.0 |

**Inverted in both schemes, three of four minima under the floor.** The escalation's structural
diagnosis is confirmed on pixels: cycle 1 reserved two pixels and *the mark ate both of them*.
The fill stopped 2px short and the keel was drawn 2px tall at the bottom, so the gap and the mark
were the SAME two pixels; the keel is opaque, and what it abutted above was still the fill.
Nothing changed for a flagged capsule. It read as a fix only because the sole instrument pointed
at the trough, where an opaque mark's own colour is identical either way.

**THE KEEP-OR-STRIKE, ON THE MEASUREMENT.** Striking the waterline would leave the mark inverted
against the ground the eye uses and merely stop claiming otherwise. Keeping it as written would
keep a claim the pixels deny. So the waterline is KEPT and MADE REAL, which is the only reading of
"earns its keep" the measurement supports: `--keel-gap` is a second number, the fill stops at
`--keel-h + --keel-gap`, and the mark occupies only `--keel-h`. The channel between them is
transparent, so the band above the mark is the track's own trough on every capsule at every fill
level.

**Measured after -- and the shape of the result is the proof:**

| | trough | neighbour min | neighbour max | --lv swept |
|---|---|---|---|---|
| light MISSED | 4.64 | **4.64** | 4.64 | 0, 0.3, 0.55, 0.78 |
| light SHAKY | 3.67 | **3.67** | 3.67 | 0, 0.3, 0.55, 0.78 |
| dark MISSED | 8.21 | **8.21** | 8.21 | 0, 0.3, 0.55, 0.78 |
| dark SHAKY | 3.62 | **3.62** | 3.62 | 0, 0.3, 0.55, 0.78 |

The neighbour reading COLLAPSES ONTO the trough reading, min equal to max. That collapse is the
evidence the ground is constant -- it is not a number to be trusted, it is the property the design
claimed, stated as an identity.

**MUTANT C, the negative control the ruling demanded:** both declarations reverted -- the fill run
to the bottom and `.open`'s hard-stop gradient made flat -- gives missed **2.06 vs 3.84** light and
**1.94 vs 3.99** dark on the neighbour ground: **inverted, caught.** The plant that PASSED in
cycle 1 now reds.

**The "ground, not a better hue" paragraph is DELETED as written** and replaced with one that
states the two-pixel error, the measurement that found it, the geometry that fixes it, and the
control that guards it. `styles.css` claims only what the arm derives.

---

### R4. THE BOOT RING -- CLOSED, AND THE CONSTANT WAS RIGHT ABOUT A DIFFERENT QUESTION

**Measured before:** on a seeded record whose room is security-tenancy, three cold loads sampled
every animation frame from document_start: **6, 5 and 0 frames of `architecture-apis`** before the
home re-stamped. (The zero is the sampler starting late on a cold browser, and it is exactly why a
post-render read reports this clean -- `judgeDoor` did.)

**The fix.** `scripts/boot.js` derives the room before anything paints and `index.html`'s
`data-group="architecture-apis"` is gone. The derivation is four statements: the hash when it names
a topic (a deep link names the room the browser is actually loading), else the resume pointer, else
the newest-graded record, else the route's own fallback. The localStorage reads sit in their own
`catch`, so private mode falls through to the route fallback rather than to nothing.

**THE DEVIATION, AND IT IS THE FINDING OF THIS ITEM.** The ruling says to read the resume target's
group "from localStorage directly". **The group is not in localStorage** -- the record stores an
id and the room lives in the registry, which boot cannot import. So three registry facts are
carried in boot.js and none of them is trusted: the id-to-room table, the boot topic, and the cold
door's topic. `home_claims` compares all three against `TopicRegistry` -- the table in BOTH
directions, so a topic added, moved between rooms or renamed reds instead of silently lighting the
wrong door.

**And deleting the constant cost one measured regression before the comment was written.** Two
routes ask two different questions. A TOPIC route asks which room the topic about to be shown is
in, and at boot `TopicRegistry.current()` is `content-pipeline` -- architecture-apis, *exactly the
constant*. The HOME asks which room you are RETURNING to, which with nothing to resume is
`TopicRegistry.ids()[0]` (`event-driven`, messaging-events) -- the topic the cold START card points
at. **Those two answers disagree, and one attribute was carrying both.** Dropping the constant with
only the door's answer in hand left every topic route roomless for the entire session -- nothing
else stamps it, because `applyIdentity` runs on SWITCHES and a session that boots onto the default
topic never calls it. `room_browser` arm 1 caught it, which is what that arm is for.

**A second consequence, also measured rather than reasoned about:** with the attribute now
absent-able, the roomless default became reachable -- and it had no DARK half, because index.html
had made that state impossible. `#534AB7` on the dark ground `#0F0E13` is **2.77:1**, under the 3:1
non-text floor. The dark half is the app's own dark `--indigo` `#9D93F0`: 7.20:1 on `--bg`, 6.73:1
on `--side`.

**The arms.** `home_claims` gains five (and its mutant tally goes 17 -> 19):

- the id-to-room table equals the registry, both directions, no duplicates
- the declared COLD DOOR equals `TopicRegistry.ids()[0]`
- a bare-view boot is lit in the BOOT TOPIC's room, and the declared boot topic is the one the
  registry actually makes current -- the half of the old constant that was correct, kept and
  checked instead of deleted
- **SEEDED: every value `<html data-group>` EVER HOLDS across three cold loads is the resume
  target's room** -- 0 off-room stamps and 0 off-room painted frames, where the shipped build
  wore the constant for 5-6 frames per load
- **COLD: the first-time visitor's home is lit in the COLD DOOR's room (messaging-events) from the
  first frame, NOT the boot topic's (architecture-apis)** -- and the arm ABORTS rather than pass if
  those two ever become the same string

**Two mutants, both through the real code path.** `window.__doorRooms` is redefined as an accessor
whose setter swallows boot's assignment, so boot derives from a table the test controls: one that
answers `architecture-apis` for the resume topic (**the constant, restored, arriving by the honest
route -- RED**) and one that answers nothing (**the stamp deleted -- RED**, and with index.html's
constant gone an unstamped boot is roomless, not safe).

**THE ARM WAS WEAKER THAN ITS FIRST WRITE-UP CLAIMED, AND THE WRITE-UP IS WHAT EXPOSED IT.** The
cycle-2 commit message says "0 of 213 frames". That number was never measured. Measuring it found
the rAF sampler catches a WILDLY variable slice -- 2, 12 and 13 frames on one run of three loads,
31/58/55 on another -- because rAF stops once the page goes idle. A load that samples 2 late frames
asserts almost nothing, and on a late start the sampler would only ever see the state AFTER the
home had corrected a wrong stamp: a clean report for a broken build, which is this wave's own
failure class committed inside its own fix.

So the attribute is now watched by a **MutationObserver from document_start** as well: every value
`data-group` ever holds, in order, whatever the frame timing does. The frame count is no longer
quoted anywhere, because it is not a stable quantity.

**And hardening the recorder immediately falsified MUTANT B.** With the stamp deleted, the mutation
log holds exactly one entry -- the home's later corrective stamp, which is the CORRECT room -- so a
log-only judgement read it clean and the mutant went GREEN on a broken build. What the deleted
stamp actually costs is **eight PAINTED frames with no room at all**, and only the frames can see
that. The two defects live in two different recorders: a WRONG stamp is a value in the log, a
MISSING stamp is a gap in the paint. Both mutants are now judged on the UNION of the two, which is
the only formulation under which either can fail.

(The first attempt at the observer also threw: at document_start `document.documentElement` does
not exist yet, and observing null took the rest of the init script -- including the frame sampler
-- down with it, so the arm ERRORED rather than failed. It observes `document` with `subtree`
instead.)

`room_static`'s arm 4 is INVERTED to match: it used to REQUIRE `data-group=` hard-coded on `<html>`
and was satisfied by a value correct for one room in six. It now fails if the constant comes back,
fails if boot.js stops stamping, and fails if boot.js is not the FIRST script include.

---

### R5. THE 46 RINGS -- CLOSED

`.ix-group .ix-card:hover{border-color:var(--rm,var(--acc))}` and
`.ix-group .ix-card:focus-visible{outline-color:var(--rm,var(--acc))}` -- plus the halo, in the
same declarations `.hm-room:focus-visible` already uses one screen over, because a `--rm` outline
inside an `--acc` glow is two rooms on one control, which is the defect with an extra step. The
per-section binding already existed (`--rm` is emitted inline on every `.ix-group`, and the REST
border already mixes 25% of it); only the two ACTIVE states were reading the document's `--acc`.

**The press, as `room_browser` arm 4:** three real cards in three DIFFERENT rendered sections,
focused through the KEYBOARD path (focus, step off, step back -- `:focus-visible` is a heuristic
about how focus arrived, and a scripted `.focus()` does not reliably satisfy it), each ring's
computed `outline-color` compared to ITS section's `--rm`. The arm requires the three to be **three
distinct colours**, so a build where every section resolved to one value cannot pass by accident.
The first draft of this arm read the PHONE's hidden `<details>` mirror of the library, measured an
unfocusable card, and reported the initial black outline as the app's ring -- that is why the arm
now filters to rendered sections and asserts `:focus-visible` explicitly.

**The item-1 claim is narrowed accordingly.** The door light's consumer list on the home is no
longer "the focus ring on all 46 topic cards ... every hover border": those two now wear their own
SECTION's room. What the door light still moves is everything bound to `--acc` on the surface --
the boot ring, the skip link, both Cram buttons, `::selection`, the goal strip's focus indicator
and the card hover WASH (`--accbg`, deliberately left: there is no per-room wash token, and
inventing one is a palette decision with six values to solve and its own contrast pass).

---

### JUDGE ITEM 1 -- the waterline guarded by nothing: CLOSED by R3

The named fix and R3 are the same instrument. The sentence *"this sweep drives all four --lv steps
and would go red if that waterline were removed"* is not struck -- it is now **carried**, by the
neighbour arm and MUTANT C, and rewritten to say which ground each half is measured on.

### JUDGE ITEM 2 -- the ratchet claim false in two ways: CLOSED by R1 + R2, and a third way found

Both named ways are fixed and pressed. The third -- a site-blind key -- was found by pressing the
fix, and is the reason the ledger claim can now be stated at all. Both new plant classes are in the
self-test PLANTS with proven negative controls.

### JUDGE ITEM 3 -- three numeric claims disagreeing with themselves: CLOSED

**(a) The `--gauge-rule` comment** carried a SUPERSEDED solve (`#7E786E` / `#74707C`, ~3.75:1) as
the answer and the shipped pair (`#76726A` / `#7D7985`) four lines later. Both pairs verified
arithmetically correct; only the second is in the file. The comment now carries **one pair, the one
that ships**, measured on all four grounds, names the binding cell (dark-on-card, 3.49:1, 16% clear
of the floor), and records that a superseded solve was left standing, so the next reader knows what
the deleted lines were.

**(b) The text-node volume, measured once, method stated, used in both places.** The committed
build holds **2,799 characters of copy in 177 real HTML text nodes -- 0.023% of the file**, and
**99.73%** of its bytes are inside `<script>` or `<style>`. Method: `html.parser`; `<script>` and
`<style>` elements dropped whole; the remaining character data entity-decoded, each whitespace run
collapsed to one space, each node stripped. Raw and uncollapsed the same walk gives 4,028 (0.033%)
-- the same finding, and the collapsed figure is the one this ledger and `craft_hygiene.py`'s
docstring both now quote, with the method beside it.

> **THE BUILD THIS WAS ATTRIBUTED TO WAS ALREADY WRONG WHEN IT WAS WRITTEN (cycle 3).** The
> paragraph above said "the committed build (12,323,503 bytes)" and "12,290,458 of those bytes" --
> that is the CYCLE-1 build (`git show 437fdb5:...` = 12,323,503). The cycle-2 commit that carried
> this correction shipped a **12,334,544**-byte build, whose script+style bytes are 12,301,530, as
> `build_integrity`'s own PASS line in this same ledger says. Re-derived by the stated method on
> the ACTUAL committed build, every derived figure reproduces to the character -- 177 nodes, 2,799
> collapsed, 4,028 raw, 0.023%, 99.73% -- so the FINDING survives and only the attribution was
> stale. This is judge item 3's own defect class ("measured once, method stated, used in both
> places") committed inside its own fix, and the same shape as the docstring confessing an earlier
> receipt that named a build which no longer existed. **The fix is not a newer number: the
> ABSOLUTE BYTE COUNT IS GONE from both places.** Only the derived figures are quoted, and they
> are build-stable -- a sentence that cannot go stale on the next rebuild is worth more than a
> sentence that is briefly right.

**(c) The `--lv` sweep is now four steps for BOTH variants, and the seed is fixed rather than the
sentence.** The cause was structural: `share` was `(k % 6) / 5` and the variant was `k % 2`, and
`k % 2` is *determined by* `k % 6` -- so the variant was welded to the fill share, and SHAKY could
only ever land on the even steps (0 and 0.55, two of four) while the docstring claimed all four.
`GAUGE_SEED` now drives the two from independent counters over the GRADED topics, and no step is
`share = 1` (a topic with every card solid has no flagged probes, so it paints no keel at all, and
a step that cannot carry the mark is not coverage). Measured: **MISSED and SHAKY both at 0 / 0.3 /
0.55 / 0.78, 35 marks each, both schemes.** The assertion is now PER VARIANT -- the pooled
`M.lvs.length + K.lvs.length >= 4` was satisfied by four-plus-two, which is exactly the state that
shipped.

**The item-8 receipt is re-derived, not re-stamped**, and the reason it went stale is fixed: it was
run by hand and pasted. `tools/home_text_floors.cjs` now takes two builds and emits the table, with
one seed applied to both so the delta means something. Re-run against master `0aba404` on the
cycle-2 build, it reproduces the ledger's four cells to the decimal:

```
light/engaged   4.64 -> 4.64    0 under / 0 under
light/cold      5.27 -> 4.93    0 / 0
dark/engaged    2.35 -> 2.35    2 / 2
dark/cold       2.35 -> 2.35    1 / 1
VERDICT: NO REGRESSION
```

### JUDGE ITEM 4 -- the 120-character prefix key: CLOSED by R1's re-key

Keyed on the whole stripped span (plus the file), `rules` intersected and enforced, `count`
enforced. Pressed with the named plant -- a new `ellipsis` at offset 251 inside the `iac/drill.js`
span whose entry declares only `apostrophe` -- **RED**. The self-test carries three ratchet presses
of its own: whole-span keying, rule intersection, and site binding.

### JUDGE ITEM 5 -- the star vanishing in forced colours: CLOSED

`@media(forced-colors:active)` gains `.ix-star-ic{background:CanvasText!important}` -- which is
exactly what the U+2605 text node it replaced would have been forced to, so the shape survives as
the same silhouette the character had. `print-color-adjust:exact` (with the `-webkit-` prefix)
keeps it under the browser's default "no background graphics". Both are one declaration; the mark
is decorative either way (`aria-hidden`, and the pill's own text names the topic), which is why
this is not a redesign.

### JUDGE ITEM 6 -- "IMPROVES every --mut/surface pair": CLOSED, and half the finding was wrong

**The clause is scoped, with the arithmetic.** In LIGHT it improves (5.55 -> 6.55:1 on `#fff`). In
DARK the ground did not move, so `--mut` has nothing to follow, while the SURFACE moved UP -- Y
0.0124 -> 0.0209, a rise of **1.68x** -- so the pair LOSES about 12%: **6.63:1 -> 5.84:1**, clear of
AA, no floor breached. Independently confirmed by the re-derived text-floor sweep, which lists
every `--mut` selector in dark going 6.63 -> 5.84.

**But the second half of the finding does not survive contact with the cascade.** The judges call
`html[data-theme="dark"][data-view="home"] #home{--mut:#A7A29A}` "a literal no-op" that restates
the dark root value, and recommend deleting it. **It is load-bearing.** The LIGHT home rule beside
it -- `html[data-view="home"] #home{--mut:#605D58}` -- carries NO theme qualifier and matches in
dark as well. MEASURED by suppressing the dark rule on the built page: `--mut` computes `#605D58`,
which is **2.93:1 on the dark ground and 2.26:1 on the dark surface** -- a hard AA failure on every
muted string on the route. It stays, with an in-line note that says exactly this, because the next
reader will otherwise delete it for the same good reason.

---

## CYCLE 2 -- VR CONTRACT: HONOURED BY ABSTENTION

```
18 baselines compared; worst = 0 px (home-light), budget 32 px.
VISUAL REGRESSION: PASS
```

No baseline regenerated, manifest unchanged at 18. The four home baselines were AUTHORISED to move
and did not need to: they boot cold, so no capsule is `.open` and no keel paints -- the waterline
geometry is invisible to them by construction. The ring colours are focus and hover states, and the
boot stamp settles to the value the constant had.

---

## CYCLE 2 -- GATE: 78/78 PASS

Full serial run (`python test/check_all.py`, no `--fast`, no `--shared-browser`) on the
**COMMITTED** tree, exit 0, zero FAIL lines. Capture:
`_audit/2026-08-03-w-addresses-cycle2-gate.txt`.

```
  78 checks in 1202.0s (20.0 min)
GATE: PASS
```

Taken on **`9abb32d`**, the tree this branch ends on. The previous capture was one PASS-message
string out of date -- `home_claims`' mutant tally, edited after that run to say how the two boot
plants are actually judged. A print string in a green line is inert, and "inert" is what every
claim this cycle falsified had said about itself, so the run was retaken rather than argued.

**Three full runs were taken and the middle one is worth recording rather than hiding.** The first
(`00f1962`) was 78/78 in 1306.5s. The boot arm was then hardened -- see R4 -- and the re-run on the
final tree came back **FAIL (grade_reveal)**: a real click on Missed landed (`ok:true`, painted
coordinates) and the record read back null, one assertion in a check this cycle never touched.
Diagnosed rather than re-rolled: `grade_reveal` is **3/3 green standalone**, and the src it ran
against is BYTE-IDENTICAL to the src that passed it in the first run (the only files that changed
between them are `test/home_claims.cjs` and this ledger). A persist/read race under serial-gate
load, not a regression. The run of record above is the clean re-run on the same tree.

Taken on the committed tree, which is why `build_integrity` reads the strong form:

```
BUILD INTEGRITY: PASS  (12334544 bytes, 0 unresolved, 9 panes + 7 overlays,
build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
```

The count is still **78** -- cycle 2 registered no new check. R1/R2 and judge items 2 and 4 are
inside `craft_hygiene`; R3 and judge items 1 and 3c are inside `scoreboard_salience`; R4 is split
across `home_claims` and `room_static`; R5 is inside `room_browser`.

The lines that carry this cycle's work:

```
craft_hygiene       PASS  (9290 rendered-copy spans, 117 ruled exceptions, every one still
                           matching something, each excused only from the rules it declares,
                           only in the file it names, and only as many times as it declares)
scoreboard_salience PASS  ... the worst grade is never drawn quieter than the middle one, and
                           both keel marks clear the 3:1 non-text floor, against TWO grounds --
                           the stable trough AND the band each mark actually abuts -- with each
                           variant swept over all four fill steps ...
home_claims         PASS  19 planted mutants detected (... THE BOOT CONSTANT RESTORED through
                           boot.js's own derivation, and the door stamp DELETED, both caught on
                           the animation frames rather than after the home has already
                           corrected them)
room_static         PASS  (... boot derives the door room first and no constant is hard-coded)
room_browser        PASS  (... a focused topic card wears ITS OWN section's room -- three
                           sections, three rings, three distinct colours)
visual_regression   PASS  (18 baselines, win32-chromium149; ... matched its committed pixels)
```

**Independent cross-check, free:** the branch CI gate (`python test/ci.py gate --nowait`, run
`30781499203`, 6 shards on `ubuntu-latest`) came back **exit 0 on every shard** -- green on a
second platform as well as on the certifying win32 serial run.

---

## CARRIED OUT OF CYCLE 2 -- each with the reason and the wave that owns it

1. **The app-wide GLYPH pass.** 21 distinct spans across the frame, the app scripts, the
   stylesheet and the corpus, ratcheted per file with a count. Each needs a DRAWN substitute and
   they are shared marks, so it is one wave, not 21 edits -- and every surface but the home has a
   VR baseline this wave may not move. The class is now closed in three directions (codepoint,
   file, count), so it can only shrink without an argument.
2. **The corpus prose pass** -- 73 spans, unchanged from cycle 1. A content pass with its own
   review.
3. **A per-room WASH token.** `.ix-card:hover` still takes `--accbg`, the document's wash, under a
   `--rm` border. Inventing `--room-<id>-wash` is a palette decision with six values to solve and
   its own contrast pass; named here rather than left silent.
4. **The three dark text nodes under AA** (`.hm-room-n` at 2.35:1, `.hm-room-weak` at 3.48:1),
   re-confirmed identical on both builds by the re-derived text-floor sweep. Still a PALETTE
   decision, still `room_contrast`'s territory.
5. **GAP-2, the landing drill's flagged set** -- item 10's other half. Still owned by **W2 room**.

---

## CYCLE 3 -- 2026-08-03

Four team-lead rulings on the cycle-2 escalation and eight judge items, opened. **Twelve closed.**
One of them (R6) was decided by a measurement taken before any code moved, and the measurement
went the way the geometry needed; one (item 5) was a REGRESSION THIS WAVE SHIPPED, on the route
family the gate itself drives; and one (item 6) is a whole class of guard that could be deleted
with the gate still green.

**What cycle 3 did NOT need:** the VR rebaseline. R6's IF-NO branch (a proportional channel) was
authorised and is not taken, because the measurement says the fixed channel reads at 390. All 18
baselines returned **0 changed px**; manifest stays at 18. R9's declarations are print-media only
and cannot move a screen pixel by construction.

---

### R6. THE PHONE KEEL -- MEASURED FIRST; THE GEOMETRY STANDS, THE SENTENCE DOES NOT

**The measurement, taken before any CSS moved.** The compact block takes `.hm-gr-t` from 32px to
16px below 920, so the capsule is **24 CSS px at 1280 and 8.00 at 390** (measured: 3.95 x 8.00),
and `--keel-h + --keel-gap` is **4px at both** -- 4 of 24 on the desktop, **4 of 8** on the phone.
The question is whether grade ORDER survives the 4px strip that is left. Sampled off the built
m-home registers, 93 open capsules per scheme, the strip alone:

| | --lv 0 | 0.3 | 0.55 | 0.78 | 1.0 | tightest adjacent |
|---|---|---|---|---|---|---|
| 390 light | .1765 | .1136 | .0772 | .0496 | .0275 | **1.276:1** (.55/.78) |
| 390 dark | .1941 | .3270 | .4633 | .6260 | .8097 | **1.272:1** (.78/1) |
| 1280 light | .1697 | .1061 | .0676 | .0402 | .0216 | 1.261:1 (.78/1) |
| 1280 dark | .1971 | .3325 | .4733 | .6388 | .8220 | 1.266:1 (.78/1) |

**YES: monotone in both schemes at both widths, and the four tightest pairs sit within 0.015 of
each other.** The phone's ramp is not the desktop's ramp compressed -- it is the same ramp on a
smaller area, which is what "the grade is carried in the fill's OPACITY" actually predicts: a
strip presents the same colour whatever its height, so shrinking it spends AREA and not VALUE. So
**the geometry stands and the reserved channel stays a constant**, and the ledger records that the
IF-NO branch was authorised and declined on evidence rather than on preference.

**The sentence is deleted either way, as ruled.** `styles.css` said the fill "loses 4 of 24px,
which costs it nothing, because the SIGNAL RULE puts the grade in lightness and never in size" --
UNCONDITIONAL, written from the desktop, and it would have licensed a 1px strip by the same
argument. The block now derives BOTH cases with the numbers above, says what the channel actually
costs (17% of the capsule at 1280, **50%** at 390), and says the ramp clears the floor with 10% to
spare rather than that it costs nothing.

**The arm, and it is also judge item 4's fix.** `scoreboard_salience`'s whole gauge section ran at
1280 only, while two of the eighteen VR baselines are m-home. It now runs at **both widths** (DSF 3
at 390, because the marks are half the size and a 2-device-row neighbour band is thinner than the
phase noise this file already learned to fear), with a fifth claim: the fill strip's own luminance
per step, monotone, every adjacent pair clearing **1.15:1**.

**MUTANT D, the control the ruling demanded:** `opacity:min(var(--lv),.78)` paints the top two fill
steps at ONE lightness -- the ramp still runs and two of its rungs are the same rung. Caught at all
four cells: **1.001 / 1.000 / 1.033 / 1.005:1 adjacent**, against a 1.15 floor. It is invisible to
every other arm in the file (keels, rule and depth are untouched by it), which is why it is worth
having.

**FOUR INSTRUMENT DEFECTS WERE FOUND BY POINTING THIS SECTION AT A SECOND WIDTH, and three of them
were already there.** They are recorded in full because the tempting move was to re-roll the run.

1. **The fill box insetted by `border-radius`** -- correct at 1280, and at 390 it makes the box THE
   STRIP'S BOTTOM HALF, sitting on the fill's own antialiased bottom edge where the transparent
   channel blends through at full width. Measured that way, light read **0.2825 at --lv 0 where
   `--gauge-rule`'s own luminance is 0.176**, and the top pair compressed to **1.074:1** -- a
   reading about an EDGE reported as a reading about a grade, which would have condemned a design
   that is fine. (The radius cannot be insetted away at that width in any case: 2 x radius is 4px
   and the capsule is 3.95px wide.) One device row at top and bottom instead.
2. **The TROUGH box was four constants picked at 1280** -- `x: track.x + 60, w: 50, y: track.y + 2,
   h: 1`. At 390 the track is ~280 CSS px wide with a label column beside it, so the x range ran
   OFF the track and averaged `--side` with the white panel behind it: the trough read Y 0.8568
   where the track computes `rgb(241,237,228)` = **0.8487 at both widths** (verified by reading the
   computed background, so it was the sampler and not the app).
3. **`.hm-gr-t` has `border-radius:8px`**, so inside the top 8 rows the leftmost and rightmost 8
   columns of the CONTENT box are outside the rounded rect and show the panel. At 1280 that is ~16
   of ~870 columns and the mean absorbs it; at 390 it is 6% of a 272px band. The box is derived
   from the track's own geometry now -- content box inset by the radius, top border to capsule
   top, one device row/column off every edge with ceil/floor -- so it is strictly interior at any
   phase and at any width, and needs no constant a third viewport could falsify.
4. **THE BOOT SPLASH WAS STILL FADING OVER EVERY SAMPLE, and this was the big one.**
   `#_bootsplash` is `position:fixed; inset:0; z-index:9999` filled with `var(--bg)`, and `_bs-done`
   starts a 400ms opacity fade before app.js removes it. Measured at the exact moment this section
   used to begin measuring, five loads at 390: **opacity 1.000, 0.294, 0.075, 0.355, 0.198** --
   present every time, a different veil each time. `t` is the denominator of every ratio here, so a
   tinted trough does not merely shift the numbers: `FAR()` picks the pixel FURTHEST FROM t, so a
   wrong t makes it choose the wrong side of the mark on SOME capsules and not others. That is the
   signature the failing runs showed -- the untouched rule reading 4.10 / 3.98 / 3.93 / 4.13 across
   runs where every stable cell reports **min == max exactly**, and MISSED spreading 7.24..10.28
   inside one run. **This is a PRE-EXISTING hazard, not a 390 one:** the same race exists at 1280
   and simply resolved in time there, so this arm has been reading through a veil whenever the
   machine was slow enough. The section now waits on the ELEMENT BEING GONE, which is the
   condition-not-duration rule the file already states.

**The proof it is fixed is not a green, it is an IDENTITY.** With the splash wait in, four
consecutive runs return **4.64 / 3.67 / 4.10 in light and 8.21 / 3.62 / 4.23 in dark AT 390,
byte-identical to 1280 and to each other**, with min == max on every variant. The two widths draw
the same colours, so an instrument that measures colours must return the same numbers -- and it now
does. ~~The fill-strip figures likewise reproduce an independent probe's to four decimals.~~

> **RESTATED, CYCLE 4 (b079b95's headline was true of PART of this section).** The identity claim
> holds exactly as written for the KEEL and RULE readings -- those come off a removal diff over a
> box that is the whole capsule grown by a pixel, and six independent re-runs by the cycle-3 judges
> confirmed them byte-identical at both widths in every run. **It did NOT hold for the fill strip**,
> which is the one absolute reading in the section: one of those six runs returned a whole ramp
> lifted toward the light ground (0.2280 / 0.1664 / 0.1305 / 0.1016 / 0.0786 against the stable
> 0.1765 / 0.1136 / 0.0772 / 0.0496 / 0.0275), tightest adjacent pair **1.179:1** against a floor of
> 1.15 -- 80% of the arm's margin gone, on a clean tree, ~2.5% from red. So "an instrument that
> measures colours must return the same numbers -- and it now does" was earned by the removal-diff
> readings and merely assumed for the fill. **The boot-splash wait reduced that flake; it did not
> remove it, because the splash was not the only veil.** Diagnosed, reproduced by construction and
> fixed in CYCLE 4 / R12 -- and the fix is three conditions, not a tighter number.

**One guard was added on a hypothesis the measurement then REFUTED, and is kept anyway:** the
stacked 390 layout really does move between loads (track y 1159.188 on five, 1162.797 on one), and
geometry is read once against three later screenshots, so `shoot()` now re-reads the track's y and
FAILS if it moved. It never fired. It stays because a silent misalignment is the worst thing that
can happen to a removal diff, and `GAUGE_SEED` backdates its record three hours so a ticking age
string cannot rewrap the phone's chip list mid-run.

---

### R7. THE TEXT-SINK CHANNEL -- CLOSED, AND THE "ZERO FOR PROSE" CLAIM IS NOW TRUE

`copy_spans()` reads a third channel: string literals assigned to
`.textContent` / `.innerText` / `.placeholder` / `.value`, and the value argument of
`setAttribute('title'|'aria-label'|'placeholder'|'alt', ...)`. These put copy on the screen without
ever passing through markup, so a scanner that reads only `>text<` and `attr="..."` was blind to
them by construction. 53 sink spans in the tracked corpus; **six findings, and every one of them is
app CHROME** -- the surface the wave's ZERO-for-prose claim is about.

**FIXED, not ratcheted:** `search-overlay.js:99` (the overlay's own placeholder) and `:228` (its
empty state) carried straight ellipses. Both are the house form now -- `…`, which is what the
same file already uses at :180 and :182; `&hellip;` is the house form for MARKUP (panels.js:490)
and a sink would print the entity literally.

**RATCHETED, with an ownership argument each:** ~~the four chrome glyphs~~ -- **CORRECTED,
CYCLE 4: FOUR WAS THE SINK CHANNEL'S COUNT, NOT THE CHROME'S.** U+2715 (focus-mode dismiss;
substitute = two rotated rules on a ::before/::after). U+21BB (pomodoro reset; substitute = the arc
the boot splash ring already draws). U+2191 (scroll-to-top; --sans carries U+2192 and U+2190 and
not this one, which is the near-miss that makes a glyph inventory necessary). U+2318 (the search
overlay's command-key hint -- **the one mark here that is not decoration**: it names a physical
key, so the honest substitute is a platform-conditional label, not a shape, which is a behaviour
change with its own copy decision). On the channel-free rule the chrome carries **53 sites over 38
entries and 29 distinct marks, in 16 files** (CORRECTED IN CYCLE 5 from "14 files", which is the
count of .js files: `src/index.html` carries 6 entries over 9 sites and `src/styles.css` 5 over 9,
and both are inside the 38/53/29 this sentence quotes) -- and cycle 3's own "38 chrome sites" was the ENTRY
count wearing the word "sites". Five of the marks it never saw were printed by three ternary sinks
this channel's pattern could not match; three more sit in a `const` and a call argument, which no
bounded channel could reach at all. See CYCLE 4 / R10.

**THE CLAIM IS RESTATED ONLY NOW THAT IT IS TRUE ACROSS EVERY CHANNEL.** ~~Measured: 0 ellipsis /
0 apostrophe / 0 quote / 0 dash across markup, tails, sinks, CSS `content:` and markdown~~ --
**RETRACTED, CYCLE 4.** That sentence was true of the five channels cycle 3 had and false of the
app: **four straight apostrophes were live in the drill and mock debrief verdicts**
(`drill/logic.js:1016`, `:1018`, `:1186`, `:1189`) -- three in HEAD runs, one in a tagless literal,
none of them reachable by any channel that existed when the sentence was written. All four are
typeset now (`&rsquo;`, the entity form that file already uses for `&mdash;` and `&middot;`).
**The SECOND half held and still holds:** zero prose exceptions ruled anywhere outside
`src/topics`. RESTATED ON THE WIDENED CHANNELS: **0 / 0 / 0 / 0 / 0** across the channel-free glyph
rule and six bounded prose channels, with the ratcheted corpus at **111 apostrophes, 49 quotes and
2 dashes** -- also a correction, since "52 apostrophes, 2 dashes and 2 quotes" was that same corpus
seen through narrower channels, not a smaller debt.

---

### R8. THE MARKDOWN DOOR -- CLOSED, AND THE KEY IS THE MARK RATHER THAN THE LINE

`.md` is in `tracked_sources()`: 38 authored files, **447 non-ASCII runs**, of which **two are
outside OWNED** -- U+25BC x3 (multi-region.md's `dgm-v` diagram chevrons) and U+00E0 x1
(leader-election.md, written `&agrave;` because `src/topics-md` is in `ascii_guard`'s scope). Both
ratcheted with the same corpus argument as their js twins.

**GLYPH RULE ONLY, and the reason is a fact about the pipeline rather than a preference.**
`tools/compiler/prose.mjs:18` runs markdown-it with `typographer:true`, which converts the corpus's
15,703 raw apostrophes into the typeset form on the way to the screen. They are therefore NOT
defects, and a check that reported them would demand that a solved problem be solved again by hand
in 38 files. What no typographer chooses is a FONT, so font ownership applies to markdown exactly
as it does to a span. `judge(span, glyph_only)` carries the distinction, and the CLEAN_MD fixture
(ellipses, apostrophes, straight quotes and a spaced hyphen, all of which must come back clean) is
its negative control.

**THE DEVIATION, recorded with its arithmetic.** The ruling says the `.md` branch feeds "the GLYPH
rule + inline-HTML spans ONLY". The span yielded is each contiguous NON-ASCII RUN rather than the
`>text<` span, because the ratchet key is the whole stripped span -- so a line- or span-keyed
markdown entry would go STALE, a gate failure, the first time anyone edited a word of that
sentence. The mark is the stable carrier, `count` already carries site multiplicity, and the
arithmetic is identical: **3 + 1**, exactly as the ruling names.

**PRESS: a fresh `&#10148;` planted in `src/topics-md/caching.md` -> RED**; removed.

---

### R9. PAPER CARRIES THE LATTICE -- CLOSED, AND THE SURVEY FOUND THREE MORE

`print-color-adjust:exact` (+ the `-webkit-` prefix) on `.hm-seg`, `.hm-seg::after`, `.hm-seg.open`,
`.hm-seg.keel::before`, `.hm-k i`, `.hm-k i::after`. styles.css:637's print block hands `#home` to
the browser's own print, so the panel really does reach paper -- and every mark it draws is a
BACKGROUND, which the reader's default (`economy`, Background graphics unticked) is free to drop.
Stripped, the page prints "41 flagged" beside a blank strip and a legend keying four marks that are
not there.

**THE ARM IS BYTES, and that is the point:** a PDF's content stream carries one paint op per
printed background, so removing the declarations removes the ops -- a property of the DOCUMENT, not
of a rasteriser, needing no baseline image. `print_truth` ARM F renders the seeded home twice at
`printBackground:false` (the reader default; at `true` the browser prints backgrounds whatever the
stylesheet says, and the arm would measure nothing):

> **RESTATED, CYCLE 4: THE BYTE ARM COVERS THE GAUGE LATTICE AND NOTHING ELSE.** ~~The survey's
> three grade-bearing fixes are asserted by this arm~~ -- they are not. Pressed on the committed
> deliverable with `.hm-room-n`, `.hm-room-bar`, `.hm-room-bar i`, `.ix-goal-bar`,
> `.ix-goal-bar span` and `.hm-gr-t` dropped from the OFF override, the delta moves **38 bytes of
> 125,089 -- 0.030%** (RE-MEASURED IN CYCLE 5; this said 14, and 14 is neither of the two numbers
> the two sentences that quoted it describe -- see the cycle-5 section), against a 100,000-byte
> floor with 25% headroom, and the arm still reads
> **PASS**. So every selector this survey contributed could have been deleted with the gate green,
> including `.hm-room-n`, the survey's own "worst case". That is judge item 6's defect class
> committed inside the cycle that closed item 6. **ASSERTED NOW, by a second instrument rather
> than a bigger budget:** ARM F2 reads `getComputedStyle().printColorAdjust` under
> `emulateMedia({media:'print'})` -- a property of the document, deterministic, no threshold -- for
> all six, with a discrimination control (the surfaces styles.css DECLARED must read `economy`) and
> a liveness control (an economy override must flip all six). Pressed: deleting the six leaves the
> byte arm **PASS** and turns ARM F2 **RED**. See CYCLE 4 / judge items 2 and 4.

```
[lattice] CONTROL: exact 301686/301686, economy 176597/176597 -- worst pair differs 0 bytes (max 3000)
[lattice] exact - economy = 125089 bytes (floor 100000)
```

**Both halves of the judges' method assert, but ONE OF THEIR CONSTANTS DID NOT SURVIVE A SECOND
PLATFORM -- and the free CI gate falsified it on the first run.** The negative control shipped as
"two identical baselines differ <= ~3k", which is what three pairs measured here: **exactly 0
bytes, every time**. On `ubuntu-latest` the same pair measured
`exact 315723/291886, economy 168507/167418` -- **23,837 bytes of run-to-run wobble**, 7.5% of the
render. The SIGNAL was never in doubt there either (123,379 bytes, clearing the 100k floor by 23%);
only the control's constant was. **A constant that is 0 on one platform and 23k on another is not a
threshold, it is a local observation**, and this whole wave is about claims that were true where
they were measured and nowhere else.

Two fixes, and the first is the same class as R6's fourth instrument defect:

1. **THE BOOT SPLASH IS CONTENT IN A PDF.** ARM F waited on the keel and then rendered; on a slow
   runner one render of a pair can carry a half-faded `#_bootsplash` and the next cannot, and that
   difference is real paint. It waits for the element to be GONE now. **That is the second arm in
   this cycle found to have been reading through it.**
2. **THE CONTROL IS RELATIVE:** the effect must be at least **3x the reproducibility the SAME RUN
   measured on the SAME machine** -- and a DIMENSIONLESS form is asserted beside the absolute one,
   `exact / economy >= 1.35` (measured **1.707** on win32 and **1.732** on ubuntu-latest), so a
   platform whose PDFs are simply bigger or smaller cannot buy a pass or manufacture a failure.

A WARM-UP render is taken first regardless: the first `page.pdf()` of a page differs from every
later one by ~7k, a font-cache artefact this arm's first draft mistook for signal.

**THE CHECK-NOT-FIX SURVEY, run rather than reasoned.** Every painted background under print media
on the seeded home, with its computed `print-color-adjust`: 24 selectors remained after the
lattice. Three are GRADE-BEARING, same class, one declaration each, so they are FIXED here:

- **`.hm-room-n`** -- `background:var(--rm); color:#fff`. Stripped, the room's count is **white on
  white**: not a figure beside a blank mark, the figure GONE. The worst case in the survey and the
  cheapest.
- **`.hm-room-bar i`** -- `width:<pc>%` of the room's coverage. Stripped, six rooms print an empty
  track under the percentage the track is meant to be showing.
- **`.ix-goal-bar span`** -- the week's goal fill. It is the one that ALSO has a text equivalent
  (the sentence directly beneath it), so the fact survives on paper either way -- but an empty bar
  beside "6-topic goal met with 1 to spare" is a picture contradicting its own caption.

Both TRACKS take it too (a fill on a stripped track is a bar floating in space), and `.hm-gr-t` --
the gauge's own trough, the ground every ordering in that panel is measured against.

**DECLARED, NOT FIXED, and the line is drawn at GRADE-BEARING:** the panel / body / chip / button
surfaces (`--card` and `--bg` on white paper) and the radial press-gradients on every button.
Paper has no hover and no press, and a white panel on white paper is the correct print rendering of
a white panel rather than a lost fact.

---

### JUDGE ITEM 1 -- the stale build attribution: CLOSED, by DELETING the number

Recorded in place, under CYCLE 2 / judge item 3b above. The finding survives on the actual
committed build to the character; only the attribution was stale, and the byte count is gone from
both the ledger and `craft_hygiene.py` rather than refreshed. A sentence that cannot go stale on
the next rebuild is worth more than one that is briefly right.

### JUDGE ITEM 2 -- six marks that are nine: CLOSED, and the index regenerates itself

Recorded in place, under CYCLE 2 / R2. Nine sites over five codepoints, which is what the shipped
allowlist already declared. The `lines` arrays are regenerated by `--report` (14 entries moved on
the first run), because an index nothing enforces will drift, and enforcing line numbers would red
the gate for inserting a line above a mark.

### JUDGE ITEM 3 -- the concatenated TAIL: CLOSED, and it is nine entries rather than 2,057

`'<button ...>' + t.identity.title + '</button>'` is the commonest emit shape in this codebase, and
`>text<` cannot see past the first literal's end. The judges planted the same U+27A4 twice in
panels.js -- inside a `>text<` run (**RED**) and at a concatenated tail (**PASS**, span count
unchanged). The tail run is yielded now, **glyph rule only**: a tail has no closing tag to bound it
and routinely stops mid-sentence or mid-SQL, so the four typeset rules have nothing well-formed to
be true of, while a codepoint is unowned wherever it sits.

**The feared allowlist explosion did not happen, and the reason is the glyph-only gate.**
~~3,034 tail runs in the tracked corpus; nine carry an unowned mark~~ -- **CORRECTED, CYCLE 4:**
3,034 literals END AT A TAIL POSITION, **2,135** of them with a non-empty run, and **nine** of
those 2,135 carry an unowned mark (U+2011 NON-BREAKING HYPHEN, U+2260 NOT EQUAL TO), all in
`src/topics`, all folded into the existing corpus argument. 3,034 counts the regex's matches
INCLUDING the empty ones; 2,135 is the denominator the "nine" actually sits in, and quoting the
larger number made the ratio look four times better than it is. Both figures re-derived on the
committed tree by the scanner itself -- the same discipline judge item 8 imposed on 2,840, applied
to a number this ledger wrote in the same breath. Had the four prose rules ridden along, the
2,057-entry ratchet the item predicted is roughly what would have arrived -- and every one of
those entries would have been a fragment, not a defect. *(Cycle 4 RETIRED this channel: the glyph
rule now reads the whole literal, so a mark after the last tag is simply a mark in the literal --
same marks, same sites, same files. See CYCLE 4 / R10.)*

**PRESS, on the real tree:** the judges' own plant at the tail of panels.js:425 -> **RED**, with the
`>text<` control beside it -> **RED**. Both in the self-test as `glyph-tail`.

### JUDGE ITEM 4 -- the neighbour arm never ran at the phone: CLOSED by R6's two-width pass

The guard was `s.w < 4` in CSS px, tuned to a 1280 capsule of ~7.8; the 390 capsule is 3.95, so
pointing the section at the phone would have skipped EVERY neighbour box and reported zero samples.
It fails safe rather than silently, which is why it was invisible. The minimum is in **DEVICE
columns** now (`(s.w - 2) * dsf < 3`), which is the only unit in which "can this be read off a
bitmap" is a real question -- 5.85 columns at DSF 3, 3.9 at DSF 2. Measured at 390, both grounds,
both schemes: MISSED 4.64 / 8.21, SHAKY 3.67 / 3.62, neighbour min equal to max exactly as at 1280,
and **MUTANT C lands at the phone too** (missed 3.15 vs 6.68 light, 1.62 vs 7.75 dark -- inverted,
caught). The zero-sample FAIL is kept as the backstop.

### JUDGE ITEM 5 -- THE SHIPPED REGRESSION: CLOSED

**This wave put its own defect back, on the route family the gate drives.** `boot.js:38` consulted
the RECORD before the ROUTE, so `__doorBoot` could only ever fire on an empty record. On any
bare-view route with a record -- `#walk`, `#drill` -- the whole document was lit in the resume
topic's room while the app showed the boot topic, **for the entire session**, because
`applyIdentity()` runs on switches and a bare-view boot never switches. Driven in Chromium against
the committed cycle-2 deliverable, seed = caching (data-storage): `#walk` gave
`<html data-group>=data-storage` against an app showing content-pipeline (architecture-apis), and
the MutationObserver log held that ONE value for the whole load. Master's deleted
`data-group="architecture-apis"` constant made that route CORRECT.

**The fix is the split the comment already described and the code did not do:**

```js
var _hr=_rm(_h),_door=_rm(_nl&&_nl.id)||_rm(_bi)||_rm(window.__doorCold);
var _dg=_hr||((!_h||_h==='home')?_door:_rm(window.__doorBoot));
```

a topic hash wins; nothing or `#home` takes the door's answer; **any other hash is a bare view of
the boot topic and takes the boot topic's room** -- which is router.js:155's own rule ("#walk
resolves to the boot topic"), at boot, before anything paints. The uncomfortable half is recorded
in the source: deleting a constant is only an improvement if what replaces it answers every
question the constant was answering, and cycle 2's comment named both questions while its code
asked one.

**The arms.** `home_claims`' boot ring gains the bare-view SEEDED cells at `#walk` and `#drill`,
judged against `TopicRegistry.current()`'s room read from the page rather than against a constant,
on the union of the MutationObserver and the painted frames. **MUTANT: cycle 2's own derivation,
planted through `window.__doorBoot` so it arrives by boot's real code path -> RED.** (Mutant tally
19 -> 20.)

### JUDGE ITEM 6 -- FOUR GUARDS THAT COULD BE DELETED WITH THE GATE STILL GREEN: CLOSED

The rules INTERSECTION, the `count` GREW check, the STALE detector and the SHRANK check were all in
the PASS line and none was driven by anything in the gate. The cycle-2 self-test "pressed" the
intersection with an expression **it had written itself**
(`[r for r,_w in judge(span) if r not in set(ent['rules'])]`), and the wave's press receipt did not
cover it either -- plant #4 is caught 100% by the whole-span KEY, because any edit inside an
allowlisted span changes its hash, so it produces IDENTICAL output with and without the
intersection. **The attribution in `_audit/w-addresses-cycle2/press-craft-ratchet.txt` and in
cycle 2's R1 paragraph is therefore wrong: that plant evidences the KEY fix, not the RULES fix.**

`main()`'s per-span decision is now `decide()` and the ledger audit is `audit()`, and `self_test()`
drives BOTH over synthetic file+allowlist pairs. Mutation-tested on the real tree, each reverted
one at a time -- **all six SELF-TEST ABORT at exit 1**, where cycle 2 returned exit 0 and printed
"each excused only from the rules it declares":

| reverted | cycle 2 | cycle 3 |
|---|---|---|
| rules intersection removed (cycle 1's defect) | GREEN, exit 0 | **ABORT** |
| count-GREW disabled | GREEN | **ABORT** |
| count-SHRANK disabled | GREEN | **ABORT** |
| STALE detector disabled | GREEN | **ABORT** |
| OVER-DECLARED detector disabled | GREEN | **ABORT** |
| glyph-before-prose-gate split reverted | ABORT | **ABORT** |

Receipt: `_audit/w-addresses-cycle3/press-craft-channels.txt`, which also carries the six channel
plants. (One method note, because it cost a real deliverable: the press's first version restored
planted files with `git checkout` and silently deleted this cycle's own uncommitted
search-overlay fix along with the plant. It snapshots content in memory now -- a press that
reverts the tree to HEAD is not a press, it is a rollback.)

### JUDGE ITEM 7 -- the boot arm certified two of four cells: CLOSED

`frames()` wrote `ddr.v1.nav.last` and `ddr.v1.progress.<id>` with the SAME id, so the ORDER
between them -- which must match `Panels.resumeTarget()`'s LastVisit-first rule at panels.js:289 --
was untested in both directions; and every boot-ring load used `#home`, with the one bare-view load
run on an EMPTY record, **the single record class in which item 5's defect cannot appear**. Both
cells added: an `alt` seed writes a NEWER progress record on a topic in a THIRD room (so "followed
nav.last", "followed the newest graded record" and "followed the route" are three different
strings), and the assertion is against `Panels.resumeTarget()` **read from the page** rather than a
constant -- boot.js and panels.js are two derivations of one rule and the only honest claim is that
they agree. Measured: nav.last `caching` (data-storage) vs newest `retries-timeouts`
(reliability-observability) -> the door lights data-storage, `resumeTarget()` returns `caching`.
The arm ABORTS if no topic sits outside all three rooms at once.

*(A readiness note, found by running it: `ViewManager` stamps `data-view` for the HOME ONLY -- on a
bare-view route it stays `null` for the whole session -- so the arm waits on `.stage .pane.on`
there instead. Waiting for "data-view is not home" waits forever.)*

### JUDGE ITEM 8 -- a number that reproduces under none of its own methods: CLOSED

`check_all.py:346` still carried cycle 1's "2,840 characters in real HTML text nodes" / "0.02%".
Independently re-derived by the documented method: **177 nodes / 2,799 characters / 0.0227%**, and
the raw uncollapsed 4,028 reproduces exactly too. 2,840 matches nothing (the nearest is 2,858 =
non-blank, unstripped). The registry entry now carries craft_hygiene's own re-derivation, quotes
no absolute byte count for the same reason as item 1, and names the four channels and the twelve
plants rather than the five it used to claim.

---

## CYCLE 3 -- VR CONTRACT: HONOURED BY ABSTENTION

```
18 baselines compared; worst = 0 px (home-light), budget 32 px.
VISUAL REGRESSION: PASS
```

No baseline regenerated, manifest unchanged at 18. R6's rebaseline authorisation was conditional on
the IF-NO branch and that branch was not taken. R9 is print-media only: `print-color-adjust` cannot
move a screen pixel by construction. Item 5 changes which room a BARE-VIEW route wears, and the
four home baselines are `#home` roots.

---

## CYCLE 3 -- GATE: 78/78 PASS

Full serial run (`python test/check_all.py`, no `--fast`, no `--shared-browser`) on the
**COMMITTED** tree (`83c178e`, the tree this branch ends on), exit 0, zero FAIL lines. Capture:
`_audit/2026-08-03-w-addresses-cycle3-gate.txt`.

```
  78 checks in 958.3s (16.0 min)
GATE: PASS
```

**Taken on the FINAL tree, not the first one that went green.** An earlier full run passed at
78/78 on `b079b95`, and the lattice arm's negative control was then rewritten because the CI cross-
check falsified its constant -- so that capture described a `print_truth` that no longer exists.
The run above is the retake. (Cycle 2 established this discipline for a PRINT STRING that had
changed; the same rule holds a fortiori for an assertion.)

**Independent cross-check, free:** the branch CI gate (`python test/ci.py gate --nowait`, run
`30804536382`, 6 shards on `ubuntu-latest`) came back **success on every shard** -- green on a
second platform as well as on the certifying win32 serial run. The run before it,
`30803979529`, was RED on shard 3, and that red is the reason the lattice control is relative: see
R9. **The free gate earned its keep this cycle** -- it found a platform assumption the certifying
run structurally could not.

Taken on the committed tree, which is why `build_integrity` reads the strong form:

```
BUILD INTEGRITY: PASS  (12341724 bytes, 0 unresolved, 9 panes + 7 overlays,
build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
```

The count is still **78** -- cycle 3 registered no new check. R6 and judge item 4 are inside
`scoreboard_salience`; R7, R8 and judge items 1, 2, 3 and 6 are inside `craft_hygiene`; R9 is a
sixth arm inside the existing `print_truth`; judge items 5 and 7 are inside `home_claims`, with
`room_static` and `room_browser` corroborating; judge item 8 is a registry line in `check_all.py`.

The lines that carry this cycle's work:

```
craft_hygiene       PASS  (11925 rendered-copy spans over four channels, 132 ruled exceptions,
                           every one still matching something, each excused only from the rules
                           it declares, only in the file it names, and only as many times as it
                           declares)
scoreboard_salience PASS  ... the altitude gauge at 1280px and 390px in both schemes ... adjacent
                           grades stay discriminable from the FILL STRIP ALONE, which is the
                           claim the 4px channel has to earn twice over on the phone, where it
                           costs half the capsule ...
print_truth         PASS  "lattice":{"exact":301713,"economy":176712,"delta":125001,"noise":0}
home_claims         PASS  20 planted mutants detected (... THE RECORD CONSULTED BEFORE THE ROUTE
                           -- cycle 2's own shipped derivation ...), plus the cell that could not
                           see it: the boot arm certified two of four route x record cells
room_static         PASS  (... boot derives the door room first and no constant is hard-coded)
visual_regression   PASS  (18 baselines, win32-chromium149; ... matched its committed pixels)
```

**The run before it was a FAIL, and it is the cycle's best receipt.** 78 checks, one red --
`scoreboard_salience`, at `[light/gauge@390]`, on the two-width pass this cycle added. It was
diagnosed rather than re-rolled, and the diagnosis found four instrument defects, three of them
pre-existing and one of them (the boot splash) latent at 1280 as well. See R6 above. A cycle whose
own new arm goes red on the first full run, and whose fix turns the phone's numbers into an exact
copy of the desktop's, is a cycle that measured something.

---

## CARRIED OUT OF CYCLE 3 -- each with the reason and the wave that owns it

1. **The app-wide GLYPH pass**, now **38 chrome sites + 76 corpus sites** across the frame, the app
   scripts, the stylesheet, the markdown corpus and the concatenated tails. Cycle 3 did not grow
   the debt -- it grew the SIGHT of it: every entry added this cycle was already shipping, and
   three new channels are what made it visible. The class is closed in four directions now
   (codepoint, file, count, and channel), so it can only shrink without an argument. One entry is
   NOT a shape problem and should be split out when that wave runs: **U+2318** names a physical
   key, so its substitute is a platform-conditional label with its own copy decision.
2. **The corpus prose pass** -- 52 apostrophes, 2 dashes, 2 quotes, all in `src/topics`. A content
   pass with its own review. The markdown half of the corpus is NOT in this debt: the compiler's
   typographer already typesets it, which is why `.md` is in scope for the glyph rule only.
3. **A per-room WASH token.** Unchanged from cycle 2.
4. **The three dark text nodes under AA** (`.hm-room-n` at 2.35:1, `.hm-room-weak` at 3.48:1).
   Still a PALETTE decision, still `room_contrast`'s territory. Noted here because R9 has now made
   `.hm-room-n`'s background survive to PAPER, where the ground is white rather than the dark
   theme's -- the print case is fine and the dark screen case is untouched.
5. **GAP-2, the landing drill's flagged set** -- item 10's other half. Still owned by **W2 room**.
6. **THE BOOT-SPLASH VEIL IS A CLASS, NOT AN INCIDENT, AND THIS CYCLE FOUND TWO ARMS INSIDE IT.**
   `#_bootsplash` covers the whole viewport with `var(--bg)` at an uncontrolled alpha for 400ms
   after the app is otherwise ready. `scoreboard_salience` was reading pixels through it at BOTH
   widths whenever the box was slow enough (measured opacities 1.000 / 0.294 / 0.075 / 0.355 /
   0.198 at the moment it began measuring), and `print_truth`'s new lattice arm was rendering it
   INTO the PDF on `ubuntu-latest`, which is where its 23,837-byte run-to-run wobble came from.
   Two independent arms, two different symptoms, one cause -- so any check that screenshots,
   samples pixels, or prints shortly after boot is exposed. Fixed in those two only, deliberately:
   the general fix belongs in `test/_boot.cjs`'s shared readiness, which every browser check in
   the gate depends on, and that is not a change to make inside a home wave at the end of a cycle.
   **Named for whichever wave next touches the gate's boot primitives** -- the one-line condition
   is `!document.getElementById('_bootsplash')`, and the two call sites added here are the
   worked examples.
7. **ABSOLUTE THRESHOLDS TAKEN ON ONE PLATFORM.** The lattice arm's noise control shipped as a byte
   count measured here (0 on win32) and the CI gate returned 23,837 on ubuntu. It is relative now.
   Worth a sweep: any check whose threshold is a raw byte count, pixel count or millisecond taken
   from one machine is carrying the same assumption, and the free branch CI is the instrument that
   finds them -- it found this one on the first run after the arm existed.

---

## CYCLE 4 -- 2026-08-03

Three team-lead rulings on the cycle-3 escalation, and five non-escalated judge items. The shape
of this cycle is one sentence: **every finding here is a claim that was true of the CHANNEL it was
measured through, and false of the app.** R10 and R11 are that in the scanner, R12 is that in the
pixels, and judge items 2 and 4 are that in a PDF.

---

### R10. THE GLYPH RULE GOES CHANNEL-FREE -- CLOSED, AND THE SPAN IS THE MARK

`judge()` no longer takes a per-span exception flag. There are two channels and they do not
overlap:

* **GLYPH** -- every contiguous non-ASCII run of every string literal `js_literals()` yields, of
  every CSS `content:` string, of every markdown line and of every HTML text/attribute run. No
  bound, no prose gate, no code gate. A codepoint is a fact wherever it lives.
* **PROSE** -- the four typeset rules, on bounded runs that are whole thoughts (see R11).

**THE HOLE WAS FIVE MARKS IN THREE FILES, AND THEY WERE ALL SHIPPING.** Cycle 3's sink pattern was
`.textContent\s*=\s*<string>` -- an opener followed IMMEDIATELY by a literal -- so the commonest
shape this app writes matched nothing at all:

```
playBtn.textContent = running ? '\u2759\u2759' : '\u25B6';        pomodoro.js:70
playBtn.setAttribute('aria-label', running ? 'Pause focus timer' : ...);   pomodoro.js:71
hintEl.textContent  = dir === 'prev' ? '\u2039' : '\u203a';       touch-swipe.js:47
b.textContent       = ok ? 'Copied' : 'Press \u2318C';         session-progress.js:855
```

The token after `=` is an identifier, so the regex never started. The sink shape is matched against
`blank_comments(src)` now and **every literal from the opener to the terminating `;` at depth 0** is
read -- depth tracked over `()`, `[]` and `{}` so a `;` inside a nested call cannot end the
statement early.

**AND THE WIDENED GLYPH CHANNEL FOUND THREE MORE THAT NO BOUNDED CHANNEL COULD EVER HAVE REACHED**,
which is the part the ruling did not predict and the part that justifies its shape:

```
const blocks = '\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';   session-progress.js:656
'&#9650; ' / '&#9660; '  (the compare row's delta arrows)            session-progress.js:651
decBtn = makeBtn('A\u2212', 'Decrease text size', -1);            text-zoom.js:104
```

A `const`, a concatenation fragment and a call argument. `A\u2212` (U+2212 MINUS SIGN) is the
sharpest of the three:
the ASCII hyphen in the **"A+"** button beside it is owned and the MINUS SIGN in **"A-"** is not, so
two buttons of one control are rasterised by two different faces. Corpus additions from the same
widening: U+00F7 in three `num.js` files, U+2248 in `content-pipeline/num.js`, U+2260 in
`desired-state/model.js` and `sys.js`, U+2011 in `signing/num.js` and `signing/walk.js`.

**THE SPAN IS THE MARK, AND THAT IS NOT A DETAIL -- IT IS WHAT MAKES A CHANNEL-FREE RULE
RATCHETABLE.** The ratchet key is the whole stripped span bound to its file, so keying a glyph on
its enclosing literal makes the entry go STALE -- a gate FAILURE -- the first time anyone edits an
unrelated word of that sentence. R8 met this in markdown one cycle ago and settled it; cycle 4
generalises it. Pressed both ways: with the key back on the enclosing span the check goes **RED**
(press B6). Two consequences worth naming:

* **THE TAIL CHANNEL IS RETIRED, subsumed rather than removed.** It existed only to carry glyphs
  past the `>text<` bound, and a codepoint after the last tag is a codepoint in the literal. Same
  marks, same sites, same files. The cycle-3 `glyph-tail` fixture is still in the self-test and
  still goes RED.
* **THE FILE BOUND IS UNCHANGED AND STILL FIRES.** U+2318 is ruled in `keyboard-overlay.js` and,
  separately, in `session-progress.js`; neither excuses the other. A press that plants the same
  mark in a THIRD file goes **RED** (A6), and one more site of a ruled mark in the SAME file goes
  **RED** (A7).

**THE ALLOWLIST: 132 -> 237 entries, and every one of the 105 new entries was already on the screen.**
95 entries kept their key unchanged (their span already WAS the mark); 142 were re-keyed or newly
surfaced, and **every re-keyed entry carries its predecessor's argument verbatim** -- the migration
was mechanical, the arguments are not. Every entry with no predecessor got a written one: nine
per-site chrome arguments and one corpus argument each for glyph and prose.

The inventory, measured rather than recalled:

| | entries | sites | distinct marks |
|---|---|---|---|
| chrome (**16** files) | 38 | 53 | 29 |
| corpus `src/topics` | 37 | 106 | 8 |
| corpus `src/topics-md` | 2 | 4 | 2 |
| **glyph total** | **77** | **163** | **36** |
| corpus prose (**20** files) | 160 | 111 apostrophes, 49 quotes, 2 dashes | -- |

**THE RETRACTIONS, MADE IN PLACE.** R7's "the chrome's FOUR un-owned glyphs" and its
"0 ellipsis / 0 apostrophe / 0 quote / 0 dash" are struck through and restated above and in
`craft_hygiene.py`'s docstring, which now carries a RETRACTION block naming both. Four was the sink
channel's count. Cycle 3 also printed its chrome figure as "38 sites" when 38 was the ENTRY count --
sites and entries are different numbers and the `count` field is exactly what separates them.

---

### R11. THE HEAD CHANNEL AND THE TAGLESS LITERAL -- CLOSED, AND THE FOUR SITES ARE TYPESET

`HEAD_TEXT = ^([^<>{}\n]+)<`, applied to each unescaped literal, **`glyph_only=False`**. The tail's
argument does not transfer and the reason is directional: a tail has no closing tag on its RIGHT
and stops wherever its literal does, while a head run starts where the literal starts and ends at a
markup boundary **the author wrote**. It routinely ends a complete sentence, so all four typeset
rules are well-founded on it -- and all four are pressed there, one fixture each. A channel that
carries four rules while only one of them can fire is the same defect class as an unguarded PASS
line.

**THE FOUR LIVE SITES, AND THEY ARE THE APP'S OWN VERDICT COPY:**

```
drill/logic.js:1016   'You're carrying the signals ... <b>senior-signal line</b> ...'
drill/logic.js:1018   'You know the happy path; the depth isn't there yet. Work the <b>Walkthrough</b>...'
drill/logic.js:1186   'Depth held under the Staff / EXTEND probes - that's exactly ... <b>Strong Hire</b>.'
drill/logic.js:1189   'Below bar - the happy path isn't enough. Work Walkthrough + See-the-code, ...'
```

Three are head runs -- `>text<` saw only the two words INSIDE the bold tag. The fourth is
**TAGLESS**: rendered copy with no markup in it at all, reaching the screen through an `innerHTML` a
few lines later, so head, tail and `>text<` all miss it by construction. All four are typeset to
`&rsquo;`, which is the entity form that same file already uses for `&mdash;` and `&middot;`.

**THE BARE-LITERAL CHANNEL IS BOUNDED AT FOUR CONDITIONS AND EACH ONE IS LOAD-BEARING**: no markup
characters (a literal with a tag belongs to a tag-bounded channel and would double-count), no
newline (a template literal spanning lines is a document, not a sentence), **four or more words**,
and a **terminal punctuation mark** -- which is the discriminator that matters, because a fragment
ending mid-thought is exactly what the tail channel refused to judge. The negative control is a
one-word label, an unpunctuated placeholder, a storage key and **a two-word RANGE label
(`'p50 - p99.'`, where the hyphen separates two endpoints and is not a dash doing an em dash's
job)** -- the last of those exists because the first draft's control could not fail: with the
word-count bound deleted the gate stayed GREEN, so the bound was written into the PASS line and
guarded by nothing. It is guarded now (press B5 **ABORTS**).

**THE MEASURED RESULT, WHICH IS WHY THE WIDENING IS AFFORDABLE.** 23,683 spans over 228 files
(10,611 glyph, 13,072 prose), 1,841 head runs and 1,941 sink-or-bare literals. Prose findings
**outside** `src/topics`: **exactly four**, the ones above, all fixed. Inside: **160 sites / 162
rule-sites / 174 rule-matches over 20 files**, ratcheted with the corpus argument. (CORRECTED IN
CYCLE 5. This said "113 findings over 18 files" and 113 reproduces under no reading the scanner
offers -- not sites, not rule-sites, not matches, not distinct spans, not distinct file+line, not
the apostrophe count. Re-derived from a sweep with an EMPTY allowlist: 174 rule-matches collapse to
160 distinct (file, key) SITES -- which is exactly the 160 ratcheted entries -- and to 162
(file, key, rule) pairs, because two spans carry two rules each. Twenty files, from the allowlist
by bucketing on the file prefix.) So the ledger's "zero prose exceptions ruled anywhere
outside `src/topics`" survives the widening -- it is the half of the cycle-3 sentence that held --
and the corpus figure moves from 52/2/2 to **111 apostrophes / 49 quotes / 2 dashes**, which is the
same debt seen properly rather than a bigger one.

---

### R12. THE COLD DRAW -- DIAGNOSED, REPRODUCED BY CONSTRUCTION, FIXED BY THREE CONDITIONS

**THE DIAGNOSIS CAME FIRST AND IT NAMED THE CONTRIBUTOR.** A standalone instrument
(`_audit/w-addresses-cycle4/colddraw.cjs`) reproduces the gauge path at 390/light on a **FRESH
BROWSER PROFILE each iteration** -- `chromium.launch()` makes a new user-data-dir, so every
iteration is a cold one -- and dumps the raw sampled device rows plus the state of the world at
shot time. Eight cold profiles:

```
bodyIn STILL RUNNING when the shot was taken:  4 of 8
body computed opacity at that moment:          0.9117, 0.9851, 0.9851, 0.9851
```

`body{animation:bodyIn var(--duration-slowest) ... backwards}` ramps opacity 0 -> 1 **after** the
boot splash is gone, and an element at opacity < 1 composites its whole subtree over the canvas.
Every pixel this section samples is inside that subtree. **The cycle-3 splash wait made the flake
rarer and hid the second veil behind it.**

**THEN IT WAS REPRODUCED BY CONSTRUCTION, not inferred.** `body{animation:none;opacity:.9117}` --
the exact state a cold profile was caught in -- with every other condition identical:

| --lv | 0 | 0.3 | 0.55 | 0.78 | 1 | tightest adjacent |
|---|---|---|---|---|---|---|
| unveiled | 0.1765 | 0.1136 | 0.0772 | 0.0496 | 0.0275 | **1.276:1** |
| veiled @ .9117 | 0.2168 | 0.1504 | 0.1104 | 0.0770 | 0.0502 | **1.249:1** |
| judges' run 3 | 0.2280 | 0.1664 | 0.1305 | 0.1016 | 0.0786 | **1.179:1** |

Every step lifted toward the light ground and the ramp's own margin fell, on a build nobody had
touched. The judges' outlier sits BEYOND the constructed one in the same direction, which is what a
deeper point in the same fade looks like. **HONESTLY STATED: this reproduces the class and the
direction; it does not prove that run 3 was this exact alpha, and no claim is made that it does.**

**THE FIX IS THREE CONDITIONS, AND NOT ONE OF THEM IS A DURATION.**

1. **THE ENTRANCE FADE MUST BE IDLE.** Before any shot: every element from `.hm-alt` to the
   document root at computed opacity 1, with no animation still `running` on that chain. Scoped to
   the gauge's own ancestor chain deliberately -- "no animation anywhere" is a promise this app does
   not make and a looping ornament elsewhere would hang the wait. **Press P7: veil the body before
   the wait -> the run FAILS naming the condition.**
2. **THE SAME-SHOT GROUND INVARIANT** -- the guard the track-y one should have been. The track's own
   `background-color` is read off the page in the same run and converted to luminance in node; the
   trough band must EQUAL it within 0.002, and must be UNIFORM (min == max). It is not a tolerance:
   measured unveiled at 390/light the band returns **0.84871 over 4,740 device pixels with min ==
   max exactly**, against a computed `rgb(241,237,228)` = **0.84877** -- agreement to 6e-5, which is
   the arithmetic's own rounding. The 0.9117 veil moves it to **0.85683**, a gap of 0.00813, four
   times the epsilon. **Press P3 -> FAILS naming the veil; press P4, the same veil with the
   invariant reverted -> GREEN, reporting the shifted ramp as a grade.** That pair is what makes P3
   a press of the invariant rather than of something else.
3. **THE COLD-RUN IDENTITY REQUIREMENT.** A CI runner is always cold, and an arm that is only true
   warm is not CI-honest. The fill strip is read again at the END of the cell -- five `readMarks()`
   calls later, on a page as warm as it gets inside one run, with the strip untouched between -- and
   every step must return the same number within the same epsilon. Measured: **identical in all four
   cells.** **Press P6: force the warm re-read to differ -> FAILS.**

**AND THE ACROSS-RUN FORM WAS MEASURED TOO, BECAUSE THE IN-RUN ONE IS A PROXY FOR IT.** Three
independent runs of the shipped file on the committed tree, each a fresh browser:

```
390/light   0.1765 0.1136 0.0772 0.0496 0.0275   IDENTICAL 3/3
390/dark    0.1941 0.3270 0.4633 0.6260 0.8097   IDENTICAL 3/3
1280/light  0.1697 ... 0.0216  |  run 3: 0.1694 ... 0.0213     max drift 0.0005
1280/dark   0.1972 ... 0.8226  |  run 2: 0.1971 ... 0.8220     max drift 0.0006
```

**The two phone cells are exactly reproducible; the two desktop ones are reproducible to three
decimal places and not beyond.** That split is not mysterious and it is the file's own note: 1280
runs at `GAUGE_DSF` 2 and 390 at 3, and this file already records that at DSF 2 the marks "have no
interior pixel that a sub-pixel phase shift cannot reach". The residual is 3x SMALLER than the
0.002 epsilon and does not move a single reported margin at three decimals (1280/light's tightest
pair is 1.2598 and 1.2609 across the two, both printing 1.261). **Recorded rather than smoothed
over: the honest claim is "identical at DSF 3, and stable to 3dp at DSF 2 with a bounded residual
of 0.0006", not "identical".** The epsilon is now a measured quantity with a defect four times
above it and noise three times below it, which is the only shape in which a tolerance is not a
guess.

**AND THE SHOT-ALIGNMENT GUARD HAD TWO DEFECTS IN ONE LINE.** It compared **y only**, and it
anchored `shotY` on **the first shot** rather than on the geometry read -- so the one window in
which every box is computed against a layout that no longer exists was invisible by construction.
"The guard never fired" was therefore not evidence that nothing moved. It is anchored at `geo` now
and compares **x as well**, because a one-device-column slip puts the fill box on the capsule's
antialiased side, which reads as a grade. **Press P5: a 3px shift injected between the geometry read
and shot A -> FAILS** ("the track was at (81.000, 1159.188) ... and is at (81.000, 1162.188) now"),
where cycle 3's guard could not have seen it.

**THE MARGINS, RE-DERIVED.** The guarded readings reproduce cycle 3's table exactly -- 1.261 (1280
light), 1.266 (1280 dark), 1.276 (390 light), 1.272 (390 dark) -- so nothing about the DESIGN
changed. What changed is that the numbers are now conditional on a shot this arm will refuse to
take through a veil. `GRADE_STEP_MIN`'s "leaves 10.6% of headroom" comment says so in those words:
GIVEN the three conditions the worst pair is 1.272:1 and the floor leaves 10.6%; without them the
arm has no business quoting a margin, and the worst reading ever observed in the wild was 1.179:1.

**PRESS RECEIPT: `_audit/w-addresses-cycle4/press-gauge-veil.txt`, 7 mutants, 7 pressed.** P1 is the
one to read: cycle-3's code with the constructed veil returns the shifted ramp and **exits 0**. That
is the defect, alive, green, on a tree nobody had touched.

---

### JUDGE ITEM 5 -- THE DEPTH ARM HAD NO MUTANT: CLOSED, AND THE FIRST PLANT WAS WRONG

MUTANT E paints the panel at its ground's own value, which IS "the panels are regions of one
plane". Landed: **1.000:1 in all four cells**, against a floor of 1.25 and shipped readings of 1.329
(light) / 1.298 (dark).

**THE FIRST DRAFT PLANTED A TOKEN AND IT WAS THE WRONG COLOUR.** `#home .hm-panel{background:
var(--bg)}` landed in dark (1.000) and NOT in light (1.261, still over the floor) -- and the arm
duly reported "MUTANT E UNDETECTED", i.e. it reported the depth arm as unpressed when it was the
PLANT that was wrong. Probed rather than reasoned about: the pixel under the gap in light is
**rgb(228,223,212)** while `--bg` is **rgb(250,249,245)**, because the element at that point is
transparent and the paint comes from an ancestor further up. So the plant reads the first PAINTED
ancestor under the gap point and uses what is actually there. A mutant is a measurement too, and a
mutant derived from a token is a mutant that can be wrong in exactly one theme.

---

### JUDGE ITEMS 2 AND 4 -- ARM F COULD NOT FAIL FOR HALF OF WHAT IT CLAIMED: CLOSED

The byte arm's PASS line asserted "the altitude gauge, its legend, THE ROOM BARS AND THE ROOM
COUNTS", and the six grade-bearing selectors R9 added were worth **38 bytes of 125,089 -- 0.030%,
against a 100,000-byte floor with 25% headroom** (re-measured in cycle 5; this said 14). Reproduced here on the committed tree: with those
six deleted the byte arm still reads **PASS**. That is judge item 6's defect class committed inside
the cycle that closed item 6.

**THE FIX IS A DIFFERENT INSTRUMENT, NOT A BIGGER BUDGET.** ARM F2 asserts
`getComputedStyle(el).printColorAdjust === 'exact'` under `emulateMedia({media:'print'})` for
`.hm-room-n`, `.hm-room-bar`, `.hm-room-bar i`, `.ix-goal-bar`, `.ix-goal-bar span` and `.hm-gr-t`
-- a property of the DOCUMENT: deterministic, no threshold, no rasteriser, no platform assumption.
Three controls, because "everything computes exact" is exactly the shape that passes when the read
is broken:

* **print media is live** (`matchMedia('print').matches`), or the whole cascade is the wrong one;
* **DISCRIMINATION** -- the surfaces styles.css deliberately DECLARED rather than fixed (the panel,
  a chip, the body) come back **economy**, so "exact" is a declaration and not a browser default;
* **LIVENESS** -- with an economy override the same six reads **FLIP**, so the assertion can go red.

And the byte arm's own claim is **narrowed to what bytes can carry**: the gauge and its legend.

**THE NOISE CONTROL WAS SATISFIED BY THE NULL RESULT.** `noise * 3 <= delta` is trivially true at
`0 <= 0`, so on the whole-rule-deleted mutant cycle 3's control printed **PASS** with "worst
identical pair differs 0 bytes against a 0-byte effect". A control whose job is to prove the effect
outruns the noise announced success when there was no effect at all. It reads `delta > 0 && noise *
NOISE_FACTOR <= delta` now.

**PRESS RECEIPT: `_audit/w-addresses-cycle4/press-print-arm-f.txt`**, two mutants built and run
through `npm run build`:

| mutant | byte arm | noise control | ARM F2 |
|---|---|---|---|
| six grade selectors deleted | PASS | PASS | **FAIL** |
| the whole rule deleted | **FAIL** | **FAIL** | **FAIL** |

Row 1 is the finding and the fix in one line: the bytes cannot see those six selectors, and the new
arm can. Row 2 is the null-result fix: cycle 3's control passed there.

---

### JUDGE ITEM 3 -- TWO FIGURES THAT DID NOT REPRODUCE UNDER THEIR OWN METHOD: CLOSED

**(a)** `craft_hygiene.py:56` opened "NO ABSOLUTE BYTE COUNT IS QUOTED HERE, and that is
deliberate" and then quoted two. Both verified against git (437fdb5 = 12,323,503; 00f1962 =
12,334,544) -- they are correct **frozen history**, not attributions to a current build, so the
sentence was sound about the attribution and contradicted itself about the prose. The opener reads
**"NO CURRENT BUILD'S BYTE COUNT IS QUOTED HERE"** and the paragraph says which two figures are
history and why they stay. The smaller correction was the right one.

**(b)** "3,034 tail runs in the tracked corpus; nine carry an unowned mark" counted the regex's
matches INCLUDING the empty ones. Re-derived on the committed tree by the scanner itself: **3,034
literals end at a tail position, 2,135 of them with a non-empty run**, and the nine sit in the
2,135. Corrected in place above, in the same words judge item 8 imposed on 2,840.

---

### FOUND WHILE PRESSING -- THE FAILURE BRANCH COULD NOT PRINT ITS OWN FINDING

`craft_hygiene`'s findings loop had an encoding guard and its STALE / GREW / SHRANK loops did not,
so the one path that prints a ratcheted mark's own text died with a **UnicodeEncodeError traceback**
instead of reporting -- on the win32 cp1252 console the gate actually runs on. A check whose failure
output cannot be printed has no failure output. Fixed with one `say()` helper and **pressed on that
console specifically** (press C1: a planted stale entry carrying U+21BB, run without `-X utf8` ->
exit 1, the stale list printed, no traceback). Found by running the failure branch rather than by
reading the code, which is the only way this class ever turns up.

---

## CYCLE 4 -- PRESS SUMMARY

| receipt | mutants | pressed |
|---|---|---|
| `press-craft-channels.txt` (R10, R11, judge item 3a) | 18 | 18 |
| `press-gauge-veil.txt` (R12) | 7 | 7 |
| `press-print-arm-f.txt` (judge items 2, 4) | 2 | 2 |

Every press snapshots the file in memory and restores it, and every receipt ends with the shipped
tree re-run green. (The cycle-3 method note stands and is why: a press that reverts the tree with
`git checkout` is not a press, it is a rollback, and it ate an uncommitted fix once.)

Four presses came back UNPRESSED on their first run and each one was a real gap, not a bad plant:
the two ternary GLYPH fixtures are satisfied by the channel-free glyph rule whether the sink walks
the whole statement or not (so a **prose** fixture in a far branch was added -- three words, no
terminal mark, reachable by no other channel); the bare-literal word bound had no control that could
fail; and two press plants of my own were malformed JavaScript, which the scanner correctly refused
to guess past.

---

## CYCLE 4 -- VR CONTRACT

```
VISUAL REGRESSION: PASS  (18 baselines, win32-chromium149; every capture reached a proven
rest state across all 18 roots, cleared the blank-page floor, and matched its committed pixels)
```

*(Quoted from the gate capture verbatim. The first draft of this block reproduced cycle 3's
"18 baselines compared; worst = 0 px (home-light), budget 32 px" from memory -- a line this run
never printed. Caught by grepping the capture for it. In a cycle whose whole subject is claims that
were true where they were measured, a receipt copied from a previous receipt is the same defect in
its smallest form.)*

**HONOURED BY ABSTENTION, and this cycle had a real reason to check rather than assume.** No
baseline was regenerated and the manifest is unchanged at 18. R10, R12 and judge items 2/4/5 are
instrument-only. R11 is NOT: it changed four rendered strings in `drill/logic.js`, turning a
straight apostrophe into `&rsquo;` in the drill and mock debrief verdicts -- a different GLYPH on
the screen, and `drill-light` / `drill-dark` are two of the eighteen roots. Measured rather than
argued: all 18 matched their committed pixels, because those roots capture the drill's ENTRY state
and the debrief is written only after a round completes. A glyph change that happens to be
invisible to every baseline is still a glyph change, and the only honest way to know is to run the
comparison.

## CYCLE 4 -- GATE: 78/78 PASS

Full serial run (`python test/check_all.py`, no `--fast`, no `--shared-browser`) on the
**COMMITTED** tree (`2f6be37`, the tree this branch ends on), exit 0, zero FAIL lines. Capture:
`_audit/2026-08-03-w-addresses-cycle4-gate.txt`.

**TAKEN ON THE FINAL TREE, NOT THE FIRST ONE THAT WENT GREEN.** Two earlier full runs passed at 78/78 -- on `1f6fd7e` (841.7s) and on `24d8163` (812.5s) -- and both were superseded: the first by a comment change in the gate registry, the second by judge item 1's other half, the styles.css restatement, which is comment-only in `src/` and therefore rebuilds the deliverable. Neither changed a check's behaviour and both captures described a tree this branch no longer ends on, which is the only thing that matters about a receipt. The run above is the retake, and the deliverable it certifies is the committed one (`build_integrity` reads the strong form).

```
  78 checks in 1049.0s (17.5 min)
GATE: PASS
```

**THE COUNT IS STILL 78, and that is the point of R10 and R11 rather than an omission.** Widening a
channel does not add a check: `craft_hygiene` reads more of the same tree and reports more of the
same class, so there is no new number to register and no new cost line. The same holds for R12 and
judge item 5, which are conditions and a mutant inside `scoreboard_salience`, and for judge items 2
and 4, which are a second arm and a repaired control inside `print_truth`. **Cycle 4 registered no
new check and every widening is inside a check the gate already ran.**

The lines that carry this cycle's work:

```
build_integrity     PASS  (12344284 bytes, 0 unresolved, 9 panes + 7 overlays,
                          build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
craft_hygiene       PASS  (23683 rendered-copy spans; the glyph rule CHANNEL-FREE over every
                          string literal and the four typeset rules on six bounded prose
                          channels; 237 ruled exceptions, every one still matching something,
                          each excused only from the rules it declares, only in the file it
                          names, and only as many times as it declares)
scoreboard_salience PASS  ... and the panels stand off their ground, pressed by painting the
                          panel at that ground's own colour. EVERY GAUGE READING IS GATED ON THE
                          SHOT BEING UNVEILED: the entrance fade must be idle before any shot is
                          taken, the trough must equal the colour the track itself declares
                          within 0.002 in the SAME shot, and the COLD first reading -- the only
                          one a CI runner ever takes -- must reproduce a warm re-read later in
                          the same run
print_truth         PASS  "lattice":{"exact":301713,"economy":176712,"delta":125001,"noise":0,
                          "ratio":1.707}
                          "latticeProp":{"exact":6,"of":6,"control":"economy/economy/economy"}
visual_regression   PASS  (18 baselines, win32-chromium149; every capture reached a proven rest
                          state across all 18 roots, cleared the blank-page floor, and matched
                          its committed pixels)
```

**Independent cross-check, free:** the branch CI gate (`python test/ci.py gate --nowait`, run
6 shards on `ubuntu-latest`) was fired after every push and came back **success on every shard, every time**: `30819255688` on `1f6fd7e`, `30821836898` on `336b5cf`, and `30823962544` on `973480a` -- the last of which is this branch's final commit, so the free gate covers the tree the certifying win32 run could not (a serial gate is taken before the commit that records it, and the commit that records it is docs). 79/69/78/115/169/178s on the final run. Green on a second platform as well as on the certifying one.

---

## CYCLE 4 -- THE FREEZE

### What is now part of `scoreboard_salience`'s CONTRACT, not merely of its current behaviour

Three conditions, all enforced on every gauge cell at both widths and in both schemes, all pressed:

1. **THE SHOT MUST BE UNVEILED BEFORE IT IS TAKEN.** Every element from `.hm-alt` to the document
   root at computed opacity 1, with no animation still running on that chain. Not a duration.
2. **THE GROUND MUST BE ITSELF, IN THE SAME SHOT.** The trough band must equal the colour the track
   declares -- read off the page, converted in node -- within 0.002, and must be uniform
   (min == max). A veil moves it; a slipped box breaks the uniformity first.
3. **THE COLD READING MUST REPRODUCE THE WARM ONE.** The fill strip is read at the start of the
   cell and again at the end, five `readMarks()` calls later, and every step must agree to the same
   epsilon. **A CI RUNNER IS ALWAYS COLD, so an arm that is only true warm is not CI-honest** --
   this is the clause that makes the first reading of a fresh profile a first-class subject rather
   than the one nobody re-checks.

Plus the alignment guard, which now anchors on the GEOMETRY READ (not on the first shot) and
compares x as well as y -- the two defects that made "the guard never fired" uninformative.

### THE RETRACTION LEDGER -- every sentence this cycle took back, and what replaced it

| where | retracted | restated |
|---|---|---|
| ledger R7 | "the chrome's FOUR un-owned glyphs" | 53 sites / 38 entries / 29 distinct marks over **16** files (cycle 4 wrote 14 here, which is the JS-only count -- corrected in cycle 5). Four was the SINK channel's count. |
| ledger R7 | "38 chrome sites" | 38 was the ENTRY count. Sites and entries are different numbers; `count` is what separates them. |
| ledger R7 | "0 ellipsis / 0 apostrophe / 0 quote / 0 dash across markup, tails, sinks, CSS content: and markdown" | FALSE of the app: four straight apostrophes were live in the drill and mock debrief verdicts. All four typeset; 0/0/0/0/0 now holds across the channel-free glyph rule and six bounded prose channels. |
| ledger R7 | "52 apostrophes, 2 dashes and 2 quotes remain, all corpus" | 111 apostrophes, 49 quotes, 2 dashes. The same debt through wider channels, not a bigger one. |
| ledger judge item 3 | "3,034 tail runs in the tracked corpus; nine carry an unowned mark" | 3,034 literals END at a tail position, 2,135 with a non-empty run; the nine sit in the 2,135. |
| ledger R6 (b079b95) | "an instrument that measures colours must return the same numbers -- and it now does" | TRUE of the keel and rule readings (removal diffs, six independent re-runs byte-identical). FALSE of the fill strip until R12: one of those six runs read 1.179:1 against a 1.15 floor. |
| ledger R6 | "the fill-strip figures likewise reproduce an independent probe's to four decimals" | struck. They reproduce when the shot is unveiled, which is now a precondition rather than an assumption. |
| `craft_hygiene.py:56` | "NO ABSOLUTE BYTE COUNT IS QUOTED HERE" (while quoting two) | "NO CURRENT BUILD'S BYTE COUNT IS QUOTED HERE". Both historical figures verified against git and kept as frozen history. |
| `craft_hygiene.py` docstring | the four-glyph inventory and the 0/0/0/0 sentence | a RETRACTION block naming both, with the measured replacements. |
| `styles.css` ASSERTED-NOT-ARGUED | "test/print_truth.cjs measures the PDF BYTES ... and a build that has lost them comes back the same size" (of all twelve selectors) | the byte arm claims the gauge and its legend; ARM F2 asserts the six grade-bearing selectors on a computed property. The bytes were worth **38** of 125,089 on those six (cycle 4 wrote 14 -- corrected in cycle 5, with the mutation named). |
| `scoreboard_salience.cjs` | "the floor leaves 10.6% of headroom on the worst of them" | conditional on the three guards, with the worst reading ever observed in the wild (1.179:1) named beside it. |
| `check_all.py` registry | "It reads FOUR channels" / "Twelve planted defects and five negative controls" | two channels by KIND (channel-free glyph, bounded prose), 19 plants and 6 negative controls. |

Eleven sentences, and not one of them was wrong about the app when it was written -- every one was
right about the instrument that measured it. That is the class this cycle exists to name.

---

## CARRIED OUT OF CYCLE 4 -- each with the reason and the wave that owns it

1. **The app-wide GLYPH pass**, now **77 entries over 163 sites and 36 distinct marks** -- 38/53 in
   the chrome across **16** files (14 of them .js, plus `src/index.html` and `src/styles.css`),
   39/110 in the corpus across 29. Cycle 4 did not grow the debt; it grew the
   SIGHT of it for the second cycle running, and this time the channel that was widened was the
   last one with a bound on it. The class is closed in five directions now (codepoint, file, count,
   channel and CARRIER), so it can only shrink without an argument. Three entries are NOT shape
   problems and should be split out when that wave runs: **U+2318** names a physical key (its
   substitute is a platform-conditional label, and it is now ruled in TWO files, individually);
   **U+2581..U+2588** is a sparkline, whose substitute is a different WIDGET with its own layout;
   and **U+2212** is one half of a two-button control whose other half is ASCII, so the fix is a
   typographic decision about the PAIR.
2. **The corpus prose pass** -- **111 apostrophes, 49 quotes, 2 dashes**, all in `src/topics`, over
   **20** files (160 sites; 162 rule-sites; 174 rule-matches). The quotes are almost all the walkthroughs' spoken lines (`Interviewer: "..."`), which
   the head and tagless channels are what finally read. A content pass with its own review. The
   markdown half of the corpus is still NOT in this debt: the compiler's typographer typesets it.
3. **A per-room WASH token.** Unchanged from cycle 2.
4. **The three dark text nodes under AA** (`.hm-room-n` at 2.35:1, `.hm-room-weak` at 3.48:1).
   Still a PALETTE decision, still `room_contrast`'s territory.
5. **GAP-2, the landing drill's flagged set** -- item 10's other half. Still owned by **W2 room**.
6. **THE VEIL CLASS IS STILL OPEN OUTSIDE THESE TWO CHECKS, AND CYCLE 4 FOUND ITS SECOND MEMBER.**
   Cycle 3 named `#_bootsplash`; cycle 4 found `body{animation:bodyIn}` sitting right behind it,
   live at shot time in **4 of 8 cold profiles**. Two veils, one after the other, both invisible to
   `test/_boot.cjs`'s shared readiness -- which every browser check in the gate depends on. The
   general fix belongs there and the two worked examples now exist: the splash condition
   (`!document.getElementById('_bootsplash')`) and the fade condition (every element from the
   subject to the document root at opacity 1 with no animation running on that chain). **Named for
   whichever wave next touches the gate's boot primitives.** Any check that screenshots, samples
   pixels or prints shortly after boot is still exposed; `scoreboard_salience` and `print_truth`
   are fixed, and they are two of many.
7. **ABSOLUTE THRESHOLDS TAKEN ON ONE PLATFORM.** Unchanged from cycle 3, and cycle 4 adds a
   COROLLARY it proved the hard way: an absolute threshold is safe exactly when it is compared
   against a value the DOCUMENT declares in the same run. The gauge's ground invariant (0.002
   against the track's own `background-color`) and `print_truth`'s ARM F2 (a computed property, no
   threshold at all) are both instances. The sweep for raw byte/pixel/millisecond constants is
   still owed.
8. **THE FIRST-RUN-OF-A-FRESH-PROFILE QUESTION IS BIGGER THAN ONE ARM.** `scoreboard_salience` now
   carries a cold-run identity requirement; nothing else in the gate does, and every check in it
   runs cold on `ubuntu-latest` six shards at a time. The cheap general form is the one written
   here: take the reading twice, once at the start of the cell and once at the end, and demand
   they agree. **Owed by whichever wave next audits the browser checks as a family.**

---

## CYCLE 5 -- 2026-08-03

Two team-lead rulings on the cycle-4 escalation and eight non-escalated judge items. The shape of
this cycle is one sentence, and it is cycle 4's own sentence turned on cycle 4: **every finding
here is a claim that was true where it was measured and false of the thing it named** -- and six of
the ten are that inside the cycle whose whole subject was that class. R12's veil closed in ONE
SCHEME while the freeze said both. Judge item 6's "a check that cannot fail" was committed in the
receipt for the plants that press it. Judge item 3's "a figure that does not reproduce" was
committed in the retraction table that retracts figures that do not reproduce.

---

### R13. RECEIPTS CERTIFY TREES -- ADOPTED AS THE FREEZE CONVENTION

Settled and applied below in CYCLE 5 -- THE FREEZE. A gate receipt names the TREE HASH it
certified, never "the commit this branch ends on": the last receipt of a cycle can never name its
own commit, because writing it moves the tip -- the self-reference is structural, not sloppy. A
docs-only tail cannot invalidate a tree receipt, so **no gate is retaken for a docs-only tail**.
The free push-triggered Branch gate is the closing cross-check, because it fires on every commit
including the docs tail and records its own `head_sha`.

**AND A LEDGER NOTE THAT CHANGES HOW THE FREE GATE IS CITED.** `test/ci.py gate` dispatches a
`workflow_dispatch` with a `-f ref` INPUT; the run it returns records THAT INPUT, not a verified
sha of the tree the runner checked out. Where a dispatch run is cited it is now marked "inferred
from the ref at dispatch time", and the PUSH-triggered run is preferred wherever one exists.

---

### R14. THE GAUGE ARM LEARNS TO FAIL -- CLOSED, AND ALL FOUR JUDGE MUTANTS ARE RED

The arm shipped as one line: `axFor('.hm-alt .hm-gr-t')` -- querySelector, so the FIRST rail -- and
asserted that THREE SAMPLED TITLES were CONTAINED in its description. Three defects in one line:

* **ONE RAIL OF THREE.** Two whole rails could lose their description with this green.
* **CONTAINMENT, NOT EQUALITY.** A description holding three clauses and stopping satisfies it. 3
  is not 46.
* **NO COUNT AND NO ORDER.** Clauses could be dropped, doubled or shuffled invisibly.

Rebuilt to the law this wave applies everywhere else. **POPULATION FROM THE DOM**: every `.hm-gr`
the gauge rendered, keyed by tier, and the count of nodes is itself asserted against the number of
rail-bearing tiers in the model. **SELECTED BY POSITION, NOT BY THE TIE** -- a selector built on
`[aria-describedby]` stops matching under the very mutant that strips it, so "no node" and "no
description" would be one result and MUTANT 16b could pass by disappearing. **ORACLE FROM THE
REGISTRY**: `Altitude.rail(m, tier)` formatted by a segLabel written out in the test, not read back
off the app -- reading it back would compare the rendering with itself. **EQUALITY**: the
description must equal `tier + ', topic by topic. ' + row.map(segLabel).join('. ') + '.'` character
for character, and the failure message prints the index of the first divergence. **AND THE COUNT
AGAINST THE PICTURE**: clauses == that rail's own `.hm-seg` count, 46 per rail here.

**MUTANT 16b: THE TIE STRIPPED FROM EXACTLY ONE RAIL** -- the partial revert, on the rail the old
arm never read. It also asserts the OTHER two are still described, so a plant that accidentally
stripped everything could not stand in for it.

**THE FOUR JUDGE MUTANTS, RE-PRESSED, ALL FOUR RED** (receipt:
`_audit/w-addresses-cycle5/press-gauge-names.txt`; each is applied to `src/scripts/app/
home-view.js`, BUILT, and run through the real check):

| mutant | exit | gauge-names assertions RED |
|---|---|---|
| CAP -- description = the first three clauses only | 1 | **6** (count + equality, on both rails that carry three tiers' worth) |
| FIRST -- every rail describes the FIRST tier's rail | 1 | **2** (SDE3 and SDE2; Staff is unchanged, which is exactly why the old arm was green) |
| WRONGNUM -- every clause's `solid` figure off by one | 1 | **3** |
| SHUFFLE -- the clauses emitted in reverse | 1 | **3** |

The FIRST row is the one to read: it reddens the two rails the old arm did not look at and leaves
the one it did look at untouched. The plants were removed and the tree rebuilt and re-run green in
the same script, and that restoration is in the receipt.

---

### JUDGE ITEM 1 -- THE VEIL CLASS WAS CLOSED IN LIGHT ONLY: CLOSED IN BOTH, BY MEASURING IT

**THE JUDGES' FINDING REPRODUCED, AND THEN THE MECHANISM.** Three consecutive runs of the
committed deliverable; run 3's 390/dark fill strip read 0.1759/0.2964/0.4202/0.5688/0.7360 against
runs 1-2's 0.1941/0.3270/0.4633/0.6260/0.8097 -- a least-squares fit of b = 0.9101*a with max
residual 0.0004, which is a pure compositing veil, not noise. Exit 0. Every removal-diff reading in
the same cell was byte-identical (MISSED 8.21, SHAKY 3.62, untouched 4.23, depth 1.298), because a
veil moves an ABSOLUTE reading and cancels out of a differential one. Condition 3 printed "cold vs
warm re-read: identical" because the veil sat across both reads.

**THE ARITHMETIC IS THE INVARIANT'S OWN.** A veil at alpha moves the trough by
`(1 - alpha) * |Y(compositing ground) - Y(trough)|`. Measured, in this run, and printed per cell:

```
light   trough 0.84871   canvas 0.75074   gap 0.09797   catches down to alpha 0.980
dark    trough 0.00845   canvas 0.00463   gap 0.00382   catches down to alpha 0.476
```

In light a 9% veil moves the trough 0.0081, four times the epsilon -- caught. In dark the same veil
moves it 0.00034 and no alpha above 0.474 can reach the epsilon at all. **The dark invariant was
not lenient. It was INERT, and inert reads exactly like clean.**

**SO THE LOAD-BEARING GUARD IS NOW A MEASUREMENT AND NOT AN INFERENCE.** The veil is read from the
page in the SAME `page.evaluate` that reads the track's box immediately before `page.screenshot()`,
and again immediately after it: every element from `.hm-alt` to the document root at computed
opacity exactly `'1'`, and nothing `running` on that chain. No epsilon, no luminance arithmetic, no
scheme dependence -- an opacity is a number the page reports. **A pre-cell `B.until` proves a state
BEFORE the shot, which is a different claim from the state AT it**, and the second read exists
because the rasteriser is not atomic.

**AND THE GROUND INVARIANT STAYS, PRICED.** It is the backstop for compositing that is NOT an
ancestor opacity -- an overlay, a filter, a box that slipped -- and it now computes the gap above,
prints the strongest veil it could catch, and **FAILS where no alpha could cross the epsilon**
rather than passing while asserting nothing.

**PRESSED, four ways** (receipt: `_audit/w-addresses-cycle5/press-veil-dark.txt`; addendum written
into `_audit/w-addresses-cycle4/press-gauge-veil.txt` as P8-P10 per the ruling):

| press | exit | what it shows |
|---|---|---|
| P8 veil .9101 past the fade wait, light@390 | 1 | shot-time read names it; ground invariant beside it |
| P8 veil .9101 past the fade wait, **dark@390** | 1 | shot-time read names it -- the claim P1-P7 did not carry |
| P9 the same veil, shot-time read deleted, dark@390 | 1 | **the KEY ARM catches it** (see below) |
| P9b **both cycle-5 guards deleted = cycle 4's coverage**, dark@390 | **0** | 1.256:1 reported as a measurement, through a veil |
| P10 compositing ground forced to the trough's own colour | 1 | "THE GROUND INVARIANT IS INERT HERE" |

**P9 FOUND SOMETHING NOBODY PLANTED.** With the shot-time read deleted, dark STILL fails -- and the
arm that catches it is judge item 8's new KEY arm, whose ground cross-check compares a measured
pixel against `.hm-panel`'s declared colour. That lever is `|Y(panel) - Y(canvas)| = 0.0163` in
dark, **4.3x** the trough/canvas gap, so it clears the epsilon at alpha 0.91 where the trough
cannot. Two of this cycle's items turned out to be one instrument. P9b is the honest reproduction
of the judges' finding, and it is the row that matters: **cycle 4's coverage, on cycle 4's own
tree, exits 0 through a veil it was declared to catch in both schemes.**

---

### JUDGE ITEM 2 -- THE FILE COUNTS: CLOSED, RE-DERIVED, SEVEN SITES CORRECTED

Re-derived from `test/craft_hygiene_allow.json` by bucketing on the file prefix, and from a sweep
with an EMPTY allowlist:

```
chrome        38 entries   53 sites   29 distinct marks   16 FILES   (14 of them .js)
              src/index.html   6 entries /  9 sites
              src/styles.css   5 entries /  9 sites
corpus glyph  37 entries  106 sites    8 marks            27 files
corpus-md      2 entries    4 sites    2 marks             2 files
corpus prose 160 entries  160 sites  162 rule-sites  174 rule-matches   20 FILES
              111 apostrophes / 49 quotes / 2 dashes
```

**"14 files" is the JS-only count** and does not match the 38/53/29 printed beside it -- both
`src/index.html` and `src/styles.css` carry entries that are inside those three numbers. **"113
findings over 18 files" reproduces under no reading the scanner offers**: not sites (160), not
rule-sites (162), not matches (174), not distinct spans (160), not distinct file+line (150), not
apostrophes (111). Every OTHER figure in that table reproduced exactly.

Corrected in seven places: `test/craft_hygiene.py`'s RETRACTION block, and ledger lines 1089,
1554, 1558, 1605, 1914(retraction table), 1934 and 1945 (the carried list) -- including the
retraction table's own restatement, which is where a fresh unverified number is least excusable.

---

### JUDGE ITEM 3 -- "14 BYTES OF 125,089": CLOSED, RE-RUN, THE MUTATION NAMED

The baseline reproduces EXACTLY and repeatably -- delta **125,089**, noise 0, twice -- matching the
quoted `exact 301686/301686, economy 176597/176597`, so the figure was taken on this basis and
simply does not come out of it. Re-run through ARM F itself (receipt:
`_audit/w-addresses-cycle5/press-bytes.txt`):

| mutation | economy | delta | the selectors are worth |
|---|---|---|---|
| baseline, OFF as shipped | 176,597 | 125,089 | -- |
| the **SIX** of `GRADE_SEL` dropped from OFF (the ledger's sentence) | 176,635 | 125,051 | **38 bytes, 0.030%** |
| the **FIVE** the code comment lists, no `.hm-gr-t` (the comment's sentence) | 176,618 | 125,068 | **21 bytes, 0.017%** |

Two sentences, two different experiments, two different answers, and one number printed under both.
**The FINDING is untouched** -- the bytes cannot see those selectors and ARM F2 can -- and the
figure is corrected in six places with the mutation named beside it.

**A METHOD NOTE, KEPT BECAUSE IT IS THE SAME CLASS AS THE FINDING.** The first attempt measured
this standalone and got 59 / 26 bytes against a baseline of 133,962: a fresh page's CONSECUTIVE
`exact` renders drift ~7k, which is precisely the font-cache artefact ARM F's warm-up render and
its on/off/on/off interleave exist to defeat. A drop measured beside a different baseline is a
different experiment. The mutation has to be named -- and so does the instrument it is measured
through.

---

### JUDGE ITEM 4 -- THE REGISTRY ENTRY DESCRIBED HALF ITS CHECK: CLOSED

`check_all.py`'s `scoreboard_salience` entry ended "6 rooms x 2 themes x 4 score states. ~1m50s"
and said nothing about the altitude gauge -- in the cycle that gave that check its largest contract
addition, and one line below the sibling `craft_hygiene` entry that cycle 4 rewrote for exactly
this reason. A grep for `altitude gauge|keel|fill strip|unveiled|entrance fade` returned nothing.

Extended, in the same voice as the craft_hygiene repair: the gauge at two widths and two schemes,
the removal-diff method, the five reading arms including the new key one, the six planted mutants,
and the three UNVEILED conditions **named as a contract rather than as behaviour**. Re-timed:
**90.5s standalone on win32** (`time node test/scoreboard_salience.cjs`, with the gauge, the key
arm and all six mutants running), against the entry's stale "~1m50s". **No in-gate figure is
quoted, because `check_all.py` prints no per-check timing** -- the judges' "23.1 min for the
registry as a whole" is a figure about the GATE, and this cycle's serial run came in at 15.4 min;
a per-check number derived from either would be arithmetic wearing a measurement's clothes, which
is the class this cycle exists to close.

---

### JUDGE ITEM 5 -- 1.277 AND 1.276 FOR ONE CELL: CLOSED

The R12 table and three comments printed the 390/light tightest adjacent pair as **1.277:1** -- the
value you get by recomputing the ratio from the DISPLAYED row (0.0772 / 0.0496) -- while the arm
divides the full precision it holds (0.07715 / 0.04963) and prints **1.276:1**, in every run and in
the cycle-4 press receipts. The same document said both. Corrected to what the instrument prints,
in the ledger table and at `scoreboard_salience.cjs:190`, `:202` and `:483`, with the provenance of
the 1.277 named so nobody re-derives it. **Exact values compared, rounded values displayed** -- the
house rule, applied to the file that states it.

---

### JUDGE ITEM 6 -- A RECEIPT THAT COULD NOT REPORT THE LOSS OF ITS OWN PLANTS: CLOSED

`craft_hygiene.py:1236` computed the printed count as `len(PLANTS) + len(PLANTS_PRESSED) +
len(PLANTS_HEAD) + 1` = 19, while the driving loop at :988 ALSO ran `PLANTS_SINK` -- 21 plants ran.
The two missing ones are the only fixtures that press R10's widened sink (the file's own comment
says so: the two ternary GLYPH fixtures are satisfied whether the sink walks the whole statement or
stops at its first literal). **Proven, and it is worse than an off-by-two:**

| press | exit | receipt printed |
|---|---|---|
| R1 `PLANTS_SINK` emptied | 0 | **21 plants** (cycle 4 printed the identical 19) |
| R2 `sink_bodies` reverted to cycle 3's first token, plants intact | 1 | SELF-TEST ABORT |
| R3 both -- the widening reverted AND its only guard deleted | 0 | 21 plants, and 30 fewer spans |

So under cycle 4's receipt R3 was silent, green, and printed the same sentence as a healthy tree.

**BOTH FIGURES ARE DERIVED NOW.** The plant count reads `CHANNEL_PLANTS`, the one list the loop
iterates, so deleting a plant CHANGES THE PASS LINE. The negative-control count is the length of a
roster `self_test()` appends to as each control actually runs -- both receipts said "six" while
seven ran, and the eighth arrived this cycle. The PASS line also now NAMES the two far-branch
PROSE sink plants (it enumerated only the two far-branch GLYPH ones), and `check_all.py:374` is
corrected from "NINETEEN planted defects and six negative controls" to twenty-three and eight, with
the note that both are derived in-file.

---

### JUDGE ITEM 7 -- 138 SPACED DOUBLE HYPHENS ON THE HOME, UNDER `dash 0`: CLOSED, AND THE CLASS WITH IT

`home-view.js:543` returned `s.title + ' -- ' + ...`, and this wave routed that string into a
RENDERED text node as well as the pre-existing `title=`. Measured on the committed deliverable:
**138 matches of `\S -{1,2} \S` in `#home` innerText, all 138 inside `.hm-vh`, zero outside** --
while the same home carries 5 real em dashes elsewhere, including the Still-shaky panel's own
`&mdash;` four elements away. Verbatim the failure mode cycle 4's own commit message names.

**WHY THE CHECK COULD NOT SEE IT, WHICH IS THE PART WORTH FIXING.** `' -- '` is a SEPARATOR: a
joiner whose context is in the concatenation and not in the string. Every bound in this file is a
bound on a SENTENCE, so all three refused it independently -- the tagless channel wants four words
and terminal punctuation, the prose gate wants a letter and an internal space, and the dash rule's
lookarounds want alphanumerics on both sides. A separator-only literal was unreachable by
construction rather than merely unnoticed.

**THE INSTANCE:** a real EM DASH (`'\u2014'`), which typesets the title attribute and the new description in one
edit. Not `&mdash;` -- the string is esc()'d into an attribute AND set as text, so an entity would
print literally in one of the two; `\u2014` is the form `search-overlay.js:327` already uses.

**THE CLASS:** a literal matching `^\s*[-.\u2013\u2014\u2026\u00b7]{1,3}\s*$` is judged by the dash
and ellipsis rules with no word count and no prose gate. **A LONE HYPHEN IS NOT JUDGED** -- `p50 -
p99` is a range, and a separator-only literal carries no context to tell a range from an aside;
that bound is the negative control, beside an owned em dash, a middot and a decimal point. Two
plants (`' -- '`, `'...'`) and one control fixture.

**PRESSED ON THE LIVE TREE** (receipt: `_audit/w-addresses-cycle5/press-craft-separator.txt`):

| press | exit | result |
|---|---|---|
| S1 segLabel reverted to `' -- '` | 1 | `dash 1` at `src/scripts/app/home-view.js:558` |
| S2a the SEP_ONLY branch disabled, plants kept | 1 | SELF-TEST ABORT -- the rule can no longer be removed quietly |
| S2b branch AND its plants removed = cycle 4's code | **0** | **`dash 0`** -- the blindness, reproduced |
| S3 a RANGE label `' - '` at the same site | 0 | green; the bound holds |

The sweep admits 48 more spans and reports zero new findings, so the widening costs nothing and the
tree had exactly one member of this class.

---

### JUDGE ITEM 8 -- THE LEGEND'S SWATCHES WERE ASSERTED BY NOTHING: CLOSED, AND THE GROUND WAS MISNAMED

`styles.css`'s `--gauge-rule` block solves the token against two grounds, calls the KEY's dark cell
**the binding one** at 3.49:1 (16% clear of the 3:1 floor), and wrote that "the rasterised minimum,
which is what `test/scoreboard_salience.cjs` actually asserts, is read off the pixels". That file
contained **zero occurrences of `.hm-k`**. Its denominator arm reads `.hm-seg`'s inset rule against
`--side` -- the 4.10 / 4.23 pair, the LOOSER one. The tightest cell in the block had 16% of
headroom and no instrument, in a file whose own scar note records a pair solved to 3.41/3.40
nominal that RASTERISED at 3.16/3.28.

**THE ARM.** All four `.hm-k i` swatches, by the same removal diff as every other mark here: shot
A, shot B with every swatch's own paint suppressed, and the differing pixels ARE the swatch. The
GROUND is read off shot B **at the same box** -- the pixels the mark was covering -- and
cross-checked against `.hm-panel`'s own computed background. Measured, and it lands on the block's
own arithmetic to two decimals:

```
light   full 14.72   part 8.97   flag 5.42   none 4.79      (the block computes 4.79)
dark    full 12.31   part 7.39   flag 6.77   none 3.49      (the block computes 3.49)
```

`.hm-k.none i` is declared the binding cell. **MUTANT F** repaints `--gauge-rule` at the panel's own
MEASURED colour, scoped to `.hm-k i` so the capsule rule is untouched (a plant that reddens two
arms proves neither): the binding swatch VANISHES -- 0 pixels differ from its ground -- in all four
cells. Its liveness is read off the DOM, not off the pixels: **a swatch painted at its own ground
differs in no pixel from the removal shot, so "the mark vanished" and "the plant never landed" are
the same zero**, and the first draft of this mutant read the first as the second. The computed
box-shadow settles it before any pixel is looked at.

**AND THE GROUND WAS NAMED WRONG.** The block said the swatches sit on `--card`; they sit on
`.hm-panel`, which is `--home-surface` (dark `#292632`, not `--card`'s `#1E1C25`). The NUMBER was
always the panel figure, so "MEASURED ON ALL FOUR GROUNDS" named three grounds correctly and one
incorrectly -- a solve nobody could re-derive. Corrected in both blocks, with the arm's own ground
cross-check now failing if the swatches ever stop sitting where the arithmetic says they do. That
cross-check is what caught the dark veil in press P9.
