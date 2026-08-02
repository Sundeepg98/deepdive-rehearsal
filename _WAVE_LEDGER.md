# W1.5 WAVE LEDGER -- the home's refinements

**Worktree** `D:\claude-workspace\_worktrees\deepdive-rehearsal\w15-home`
**Branch** `appeal/w15-refinements`, cut from master tip `2696291`.
**Gate expectation** **77/77 from cycle 2** (cycle 1 was 76/76; cycle 2 registers ONE new check,
`home_fold`, and its other five arms extend existing checks).
**VR contract** home baselines REBASELINE AUTHORIZED; non-home baselines must not move. Cycle 2
adds ONE baseline, `m-home-light` at 390x844 -- the manifest goes 16 -> 17.

---

## CYCLE 1 -- 2026-08-02

Six items opened. **Five closed by build, one closed on arrival** (item 5 had already landed on
master and is verified rather than re-done). One item's stated OUTCOME is met on one record shape
and missed on the other; that half stays open and is stated with its number rather than rounded up.

---

### 1. P-KEY GUARD -- CLOSED

**The defect, measured before the fix.** On the `#home` route, with a seeded record whose resume
topic was `saga`, one press of `p` opened `#sessov` -- the per-topic Session progress panel -- and
`TopicRegistry.current()` read **`content-pipeline`**, the BOOT constant. A topic the user never
chose, reporting its grading, on a route that has no current topic. That is the exact class
`shell.js`'s own titled rule was written for ("THE HOME IS A DESTINATION, NOT A MODAL": the topic
keys "must not silently act on the BOOT topic -- they retarget to the resume topic, or do
nothing"). `w` was gated when it was caught doing this; `n` carries `&& !onHome` for the same
reason; `p` fell through the block.

**The fix.** `src/scripts/app/shell.js:261` -- `if (key === 'p') return;`, inside the existing
`if (onHome)` block, beside the `[` / `]` no-op. No retarget: the panel reports ONE topic's
grading, and the home's own record surfaces (the gauge, the status census, Still shaky) already
state that for every topic. So it does what `n` does on the home: nothing.

**The arm, and which check it extends.** `test/overlay_deadzone.cjs`, new **section 5** (4
assertions). That file is the one whose subject is already "did a layer act when it had no
business acting"; it already drives trusted `page.keyboard.press` and reads
`[role=dialog][aria-modal].open`; and its section-2 arm is the same assertion one context over
(the global keymap must stay suppressed UNDER an open modal). No new instrument was built for a
defect an existing one is shaped for.

Three arms so the first one is not free:
- `p` on the home opens no dialog and moves no route;
- **the probe is not blind** -- the same reader must report the panel when `#sessopen` is
  genuinely clicked (a green above is worthless if this comes back empty too);
- `p` **still works** on a topic route, so the guard cannot be "fixed" by deleting the shortcut.

**MUTANT-TESTED.** Guard removed (`if (false && key === 'p')`), rebuilt, re-run:

```
FAIL  [home keymap] `p` on the home opens NO per-topic panel
      -- opened sessov with TopicRegistry.current()=content-pipeline
         -- a topic the user never chose; the resume topic is saga
OVERLAY DEADZONE: FAIL  (1 of 40 assertions)
```

The other three arms stayed green, so the red is specific to the guard. Guard restored:
`OVERLAY DEADZONE: PASS (40 assertions)`.

---

### 2. CROSS-ACT ORDINAL SWAP -- CLOSED

`src/scripts/app/panels.js:267` -- `actionsHtml()` is now `weakDrillBar() + crossDrillBar()`.
`src/scripts/app/home-view.js` `railHtml()` -- the Practice nav renders Weak-spot review, then
Cross-topic drill, then Topic index. Both carry the same one-line reason: both acts are
cross-topic, but only one is addressed to THIS record ("the 16 topics you have been shaky on")
while the other is the same offer for everybody, so the specific act goes above the generic one
wherever the pair renders.

**COVERAGE SENTENCE CORRECTED IN CYCLE 2 -- the two checks cited here do not carry this swap.**
The original text read "the swap is carried by source, at_name_hygiene (52/52) and rail_integrity
(414 combos)". Both ran green and neither could have gone red on an inversion:
`rail_integrity.cjs`'s own header is "THE COMPANION RAIL MAY NEVER SHOW ANOTHER TOPIC'S COACHING"
and its 414 are (topic, view) combos of the per-topic coaching rail -- a different rail entirely --
while `at_name_hygiene.cjs` is a source-level accessible-NAME string ratchet. Neither file contains
the string "Cross-topic", "Weak-spot", or any ordering assertion. Desktop VR could not see it
either: the captured record is cold, `weakCount()` is 0, so the weak row does not render and there
is nothing to reorder. **For cycle 1 this item shipped with NO arm that could fail on its
reversion.** It has one now -- `home_claims.cjs`'s `act order` judge, asserted on the new
`weakTopics` record in all three surfaces that render the pair, and watched red in each. See
cycle 2, item 2.

---

### 3. GOAL SINGLE-SOURCE COMPLETION -- CLOSED

The rail's `.hm-goal` block is deleted from `railHtml()`, together with its now-unused
`var g = Panels.weeklyGoal()`. Its stylesheet rules go with it in the same commit rather than
waiting to be found by an orphan audit: `.hm-goalbar` and `.hm-goalbar i` are removed, and
`.hm-goal` is dropped from the phone's `display:none` pair at `src/styles.css` (the rule now names
`.hm-rail .hm-rsec` alone).

**grep-verified.** `grep -rn "hm-goal" src/` returns **two hits, both prose** (the explanatory
comment in `home-view.js:236` and the stylesheet note at `styles.css:2430`). No renderer remains.
The weekly goal now has exactly one: `Panels.goalStrip()` (`panels.js:151`), consumed once by
`telemetryHtml()` (`panels.js:276`) and refreshed IN PLACE after a +/- press (`panels.js:543`,
which replaces the one `.ix-goal` element rather than being a second path to the fact).
`goalPhrase()` stays exported (`panels.js:617`) deliberately -- it is the single source any future
surface must call instead of re-deriving the sentence.

Note the shape of what was wrong: below 920 the rail collapses and `.hm-goal` was already
`display:none`, so the PHONE always had one goal surface and the DESKTOP had two. Now every
viewport has one.

---

### 4. PHONE FIRST SCREEN -- CLOSED for the move; the chip-list outcome is MET on one record
###    shape and MISSED by 61px on the other. Read the numbers.

**4a. The move -- done, in `html()`, not with CSS `order`.** `.hm-practicem` now renders directly
below `continueHtml()`. Measured at 390x844 against the live band **57-799**:

| | before | after |
|---|---|---|
| `.hm-practicem` (the two practice acts) | top **2136** | top **360** |
| `.hm-alt` (the gauge panel) | 370-752, h **382** | 442-719, h **277** |
| `.hm-duo` | top **778** | top **735** |
| `.hm-chips` (Still shaky) | top **825** -- OUT | top **782** -- **IN** |

The practice acts were 1337px below the first screen, reachable only past the gauge, both panels
and all six room cards. The adjudicator's prohibition on `order` is honoured: the DOM sequence --
which is what the keyboard, the screen reader and the tab bar's crossing pointer all read -- is
what moved.

**4b. The gauge compaction, below 920 only.** `src/styles.css`, one block: the rail tracks go
32px -> 16px (a rail's information is horizontal -- 46 segments, and the stylesheet's own SIGNAL
RULE puts the grade in the FILL, never in the size, so height is the only dimension that costs the
instrument nothing), tighter panel head/body padding, a tighter verdict rule, and at <=419px the
row gap drops to 2px and the `aria-hidden="true"` key folds away -- the same width where the
status census already leaves for the same reason. The three stack roles above the duo are
**re-valued, not re-picked**: one `--gap-home-*` declaration block on `#home`, phone only, so
`home_rhythm.py` still sees the semantic layer (`HOME RHYTHM: PASS -- 8 rhythm gaps + 11 measures,
registry matches discovery exactly`).

**Disclosed:** re-valuing `--gap-home-continue/-altitude/-section` on the phone is slightly wider
than "compact the gauge". It is 30px **on top of** the panel's own 105px, for 135px recovered
against 92px spent -- the two do not overlap: the 105px is the panel's own shrink (382 -> 277, all
of it from padding / track / verdict / key declarations INSIDE the panel box) and the 30px is three
inter-panel gaps going 26 -> 16, which is outside it. 135 - 92 = 43 net, and 825 - 43 = 782, which
is the figure the table above reports. And the outcome does not close without it: at 26px gaps the
chips land at 812, 13px out. (Arithmetic corrected in cycle 2; the original read "30 of the 105px
recovered", which double-counts. The claim that follows it measured true and stands.)

**4c. RESTATED IN CYCLE 2 WITH THE JUDGE'S MEASURED SPLIT, and one sentence of it DELETED.**

The fold outcome is not one number. It is a function of **(hero-wrap x verdict-class x
bar-count)**, and across that space the chip list's top lands anywhere in a **57-799 band at
390x844**: a two-bar record put the chips at **860, out by 61**; a one-bar record whose verdict is
the two-thin-rails sentence put them at **801, out by 2**; and the shapes that pass clear the fold
by only **17-41px**. A wave that measured one record and generalised was measuring one cell.

**The deleted sentence.** Cycle 1 closed the paragraph with: *"What the first screen does contain
on that record is the Weak-spot review act ... so the record's triage is on the first screen in
both shapes."* That is FALSE whenever `weakCount() == 0` -- there is no Weak-spot act to render,
and on a record with no weak topics the first screen carries the Cross-topic act instead, which is
the generic offer rather than this record's triage. The sentence is struck rather than softened.

**THE RULED CONTRACT, now binding (and now guarded).** At 390x844 the home's first screen always
carries, FULLY INSIDE THE LIVE BAND, either the Still-shaky chip list or ONE drill act -- Weak-spot
review when `weakCount() > 0`, Cross-topic drill when it is 0. Chips below the fold are acceptable
ONLY when such an act is above it. Cycle 2 applies the ruled compaction, builds the arm, and
measures all nine combinations: see cycle 2, item R1.

`home_reflow: PASS` (320/390/430/460/500/530/560/700/900 x 2 themes, nothing clipped, no
horizontal scroll, 2 planted mutants detected).

---

### 5. CURSOR INTEGER GUARD -- CLOSED ON ARRIVAL, no change made this cycle

The guard the ledger asks for is already on the tree and was already on master tip `2696291`:
`src/scripts/app/home-view.js:112`
`function isIndex(v, n) { return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n; }`
used at `:127` (`p.drill`) and `:132` (`p.walk`) -- an out-of-range OR fractional stored cursor
returns `null`, i.e. no field and no claim. `firstUngraded()` (`:176`) returns `-1` when there is
none, so the hero chain reaches it instead of dying on a sentinel that collides with a valid index.

Provenance: `git log -S "Number.isInteger(v) && v >= 0"` -> `2e3aff6 fix(home): round 5 -- one
fact, one renderer, and an arm that can finally fail`, and the round-5 addendum records it under
"ALSO IN THIS COMMIT" as the authorised cursor guard. Re-implementing it would have been churn;
the item is closed by verification, and the receipt is above so a reader can check rather than
trust.

Its named follow-up from that round is NOT in scope and stays where round 5 left it: **Import a
backup validates nothing**, which is the real defect behind fractional cursors and belongs to a
storage-integrity item with its own schema and migration story.

---

### 6. HOME_CLAIMS PERIOD-BLINDNESS -- CLOSED

**The defect.** `judgeQuotedFigures` wrote its gap as `[^.;]{0,40}` while the rendered
single-thin-rail sentence puts a PERIOD exactly there ("Staff is the thin rail. 47 solid of 310
probes"), so the arm was structurally blind to the one sentence it exists for. (The figure read
"62" until cycle 2. 62 is 310 x 0.2 -- the 20% share applied to the TIER TOTAL -- but the `oneThin`
seed takes `Math.round` PER TOPIC, which lands on 47. Re-derived against the live seed and
corrected here and in the comment at `test/home_claims.cjs`; the mutant transcript quoted below,
which reads 48, was always exact because it was captured from the running check.) Found by a mutant
the gate-runtime acceptance battery aimed at it and watched come back NOT DETECTED, then recorded
rather than fixed (`_audit/2026-08-01-gate-runtime-acceptance.md`, pre-existing defects #2).

**The fix.** The period was never the rule worth enforcing -- it was a cheap proxy for one. What
makes an attribution wrong is ANOTHER TIER NAME standing between a name and the figures being read
as its own, so that is what the gap forbids now, character by character:

```
/\b(Staff|SDE3|SDE2)\b(?:(?!\b(?:Staff|SDE3|SDE2)\b)[\s\S]){0,40}?(\d+)\s+(?:solid\s+)?of\s+(\d+)/g
```

Strictly stronger than the old form: it still refuses to attribute "SDE3 ... . Staff shows 4 of
10" to SDE3, it now reads the thin-rail sentence, and on the two-thin sentence each figure pair
still binds to the name immediately before it because the leading names cannot reach past each
other.

**The regression proof is gr-builder's own mutant, adopted.** New **MUTANT 7** in
`test/home_claims.cjs`: take the LIVE thin-rail sentence and inflate its quoted solid count by
one. It is planted from the rendered sentence rather than a literal, and it carries a NEGATIVE
CONTROL (the untouched sentence must come back clean) plus a leak check (`judgeVerdict` must also
see it), because a mutant that fails for the wrong reason proves nothing.

**A coverage gap found while aiming it, and closed.** The first attempt planted on `oneShort` and
the check ABORTED with `MUTANT 7 CANNOT LAND: oneShort no longer renders a single thin-rail
sentence` -- correct behaviour, and it exposed that **no pinned record produced the single-thin-rail
verdict at all**. Every other seed lands on a tie, on level/within-a-point, on full or on cold, so
the class this home prints most often for a real mid-campaign user was reaching the battery only
through the generative arm, where no mutant can be aimed. New seed **`oneThin`** (three distinct
per-tier shares, 20/50/80, so the rendered percentages cannot round together) pins it.

**MUTANT-TESTED.** Matcher reverted to `[^.;]{0,40}`, check re-run:

```
SELF-TEST ABORT -- the analyser does not do what it claims:
  MUTANT 7 UNDETECTED: the single-thin-rail sentence quoted an inflated solid count and the
  quoted-figures arm accepted it -- the period-blind regex is back:
  "Staff is the thin rail. 48 solid of 310 probes, across 46 of 46 topics ..."
HOME CLAIMS: FAIL (self-test)
```

Matcher restored: `7 planted mutants detected`, all `oneThin` arms PASS at both viewports.

`test/gate_acceptance.py`'s `claims` mutant is deliberately LEFT AIMED at `judgeVerdict`. Re-aiming
it would invalidate the acceptance run its audit document reports; the blindness it recorded is
closed here, and the standing regression proof now runs every gate rather than only when that
battery is invoked.

---

## VR CONTRACT -- HONOURED

Rebaselined: **`home-light` and `home-dark` only**. Attribution: **2101 px each (0.2052%), both in
the SAME 261x51 box at (18,613)** -- the deleted rail goal block ("This week", the bar, "0 of 5
topics") and nothing else. Both diff images were reviewed before regenerating, and the new
`home-light` baseline was reviewed as an image after.

`git diff --stat -- test/baselines/` lists exactly three paths: the two home PNGs and
`manifest.json` (two sha256 values + the generated timestamp). **The other 14 baselines rewrote
byte-identical** under `npm run vr:update`, so the non-home contract holds by rewrite, not merely
by abstention. Item 4 moves no desktop pixel by construction: `.hm-practicem` is `display:none`
above 919px and every compaction declaration is inside a `max-width` query.

---

## GATE -- 76/76 PASS

```
  76 checks in 800.4s (13.3 min)
GATE: PASS
```

Full serial run (`python3 test/check_all.py`, no `--fast`, no `--shared-browser`), exit 0, zero
FAIL lines. Capture: **`_audit/2026-08-02-w15-cycle1-gate.txt`** (and, as the brief asked, the
scratch copy at `%TEMP%\claude\D--claude-workspace-deepdive-rehearsal\<session>\scratchpad\
w15-cycle1-gate.txt`). Taken on the **COMMITTED** tree (`cc2a7f2`), which is why
`build_integrity` reads the strong form rather than deferring it:

```
BUILD INTEGRITY: PASS  (12255051 bytes, 0 unresolved, 9 panes + 7 overlays,
build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
```

The two lines that carry this cycle's new work:

```
overlay_deadzone   PASS  (40 assertions: ... the keymap stays suppressed under an open one
                          and on the home, where it has no topic to mean ...)
home_claims        PASS  7 planted mutants detected (... an inflated figure inside the
                          single-thin-rail sentence, checked against its own negative control)
visual_regression  PASS  (16 baselines, win32-chromium149; every capture reached a proven rest
                          state ... and matched its committed pixels)
build_determinism  PASS  (88 Shiki blocks render identically under a simulated 600ms/line stall)
```

Count is **76**, as the freeze states -- both new arms extend existing checks, so nothing
registered separately.

Standalone runs during the cycle, all green: `ascii_guard`, `syntax_check`, `css_syntax`,
`home_rhythm`, `home_reflow`, `home_claims`, `overlay_deadzone`, `at_name_hygiene`,
`rail_integrity`, `cold_open`, `heading_tree`, `sidebar_geometry`, `flow_a11y`, `fold_budget`,
`chrome_metrics`, `visual_regression`.

---

## STILL OPEN AFTER CYCLE 1 -- ALL CLOSED IN CYCLE 2

1. **Item 4c** -- escalated, ruled (R1), and closed below.

---

## CYCLE 2 -- 2026-08-02

Three team-lead rulings on the cycle-1 escalation (R1 / R2 / R3) plus the judges' two non-escalated
open items. **All five closed.** One adjacent defect was found while reviewing a new VR capture and
fixed in the same commit; it is disclosed at the end rather than folded into an item.

The through-line: cycle 1 shipped three build items with NO arm that could fail on their reversion,
and cited two checks for one of them that are structurally incapable of catching it. `grep -rl`
over `test/` returned NOTHING for `hm-key`, `hm-goal`, `ix-goal`, `goalStrip`, `weeklyGoal`,
`hm-practicem` or `actionsHtml`, and the VR manifest's only two mobile baselines were both the
walkthrough pane -- so the entire below-920 home had neither a geometry arm nor a pixel one. Cycle 2
is mostly instrument.

---

### R1 -- THE FOLD CONTRACT -- CLOSED

**(a) Restated.** Section 4c above now carries the judge's measured split and the ruled contract,
and the false sentence is deleted rather than softened. Done in place, above.

**(c) The compaction, MEASURED, and it is not 20px.** `src/styles.css`, inside the EXISTING
`max-width:919px` gauge block:

```css
html[data-view="home"] .hm-alt .hm-verdict{margin-top:var(--space-6);padding-top:var(--space-6);
  line-height:var(--line-height-snug)}
```

| | before | after |
|---|---|---|
| `.hm-verdict`, single-thin-rail sentence (3 lines) | 68px | **62px** |
| `.hm-verdict`, two-thin-rails sentence (4 lines) | 87px | **80px** |
| `.hm-alt` panel, one-thin record | 277px + 21 (key restored) = 298 | **288px** |
| `.hm-alt` panel, two-thin record | 296px + 21 (key restored) = 317 | **306px** |

So the compaction is worth **10px / 11px of panel**, not 20. Recorded rather than rounded: the
element is 68-87px tall in total and 3-4 lines, and there is no 20px in it that is not a line of
the sentence. **The SENTENCE KEEPS ITS SIZE** -- dropping it to `--font-size-small` was measured
(it buys another 4-5px) and refused: it is the one claim the whole instrument exists to deliver and
a phone is the worst place to read 13px prose. The pixels come from leading and from the rule.
`.ix-cross` was not touched, per the ruling.

**What it bought, against the key that R2 restored (+21px), measured at 390x844:**

| shape (short hero) | chips top, cycle 1 | chips top, cycle 2 | fold |
|---|---|---|---|
| one-thin x 1 bar | 758 (41px in) | **769 (30px in)** | in |
| two-thin x 1 bar | 778 (21px in) | **787 (12px in)** | in |
| one-thin x 2 bars | 836 (37px out) | 847 | out; act carries |
| two-thin x 2 bars | 836 (37px out) | 865 | out; act carries |

**No fold outcome flipped in any of the nine measured combinations** -- which is exactly what R2
predicted of the key's 21px, now checked rather than assumed.

**(b/d) THE ARM: `test/home_fold.cjs`, a NEW registered check. Gate 76 -> 77.**
Registered separately rather than grafted on: `fold_budget.cjs` owns the same question for the
drill pane and never visits the home, and `home_reflow.cjs` measures HORIZONTAL clipping at a 720px
viewport and cannot see a fold. It drives **nine records at 390x844** -- the four ruled shapes
(verdict class x bar count) each at BOTH hero extremes (the shortest and the longest question in
the 972-probe bank, 23px vs 164px of hero), plus the cold record -- and asserts four things on
each: the row really is the shape it is named for (a matrix whose rows have silently collapsed onto
one cell reports four greens for one measurement), the ruled disjunction, that the act on offer is
the one the record earned, and that the practice block sits between the decision and the gauge **in
the DOM** with no CSS `order` doing the work (the adjudicator's explicit prohibition, now a check).

The band is COMPUTED from the live fixed chrome, never typed.

**PREFLIGHTED ON THE SEEDED MUTANT the ruling asked for**, planted every run: `.hm-practicem` is
moved back to the END of the column -- the pre-fix DOM position, where cycle 1 measured it at top
2136 -- on the one shape where that genuinely pushes BOTH carriers out. Transcript:

```
SELF-TEST: moving the practice block back below the rooms puts the act at 2314 and the
first chip at 846, both outside the band -- the arm goes red.
```

The check ABORTS if the plant lands and the assertion survives it.

**MEASURED AND DISCLOSED, because cycle 1 rounded this up.** Under the ruling's own word --
**FULLY** above the fold -- the chip list is NEVER the carrier at 390x844. Its TOP is inside the
band on the two tight shapes (769 and 787 against a fold at 799), but its FIRST CHIP ends at 813 on
the roomiest of them: **14px out**. The contract holds in all nine shapes, and in all nine it is
the ACT that carries it. That is what R1(b) anticipated ("chips below the fold are acceptable ONLY
when such an act is above it"); it is now the measured norm rather than the exception.

`home_fold: PASS (36 assertions across 9 records at 390x844)`.

---

### R2 -- THE GAUGE LEGEND -- CLOSED

The `html[data-view="home"] .hm-alt .hm-key{display:none}` rule is DELETED from the
`max-width:419px` home block. The comment that replaces it records the ruling and the measurement
so the rule cannot come back as a fresh idea: the hide bought **21px of a 742px band (2.8%)**,
flipped no fold outcome in any record class (now checked across nine shapes, above), and the key is
the only legend the gauge's four marks have at any width. `aria-hidden` makes it decoration for a
SCREEN READER; that is not an argument for deleting it from the screen where the marks are. If a
future record class needs those 21px they come out of the two-row rail block, as ruled.

**Guarded**, which it was not before: `home_claims.cjs`'s new `gauge key` judge -- a rail that
paints a keel segment must render a visible four-state key. Keyed on the keel because that is the
mark with no other explanation on the panel. WATCHED RED by putting the deleted rule back:

```
FAIL  [390/weakTopics] the gauge key agrees with the numbers beside it
      -- the gauge paints 34 keel segment(s) and renders no visible four-state key at
         this width -- the only legend those marks have
```

(and 2 more pinned records, plus 20 of the 24 generated ones). The arm is conditional, so the check
also counts how many records actually painted a keel and ABORTS at zero -- a conditional arm nothing
satisfies is decoration. It reports **6 pinned records** exercising it.

---

### R3 -- THE COLD GOAL -- CLOSED

`goalStrip()` is hoisted out of `telemetryHtml()`'s `engaged()` gate, and `duoHtml()`'s own
`engaged()` early return is deleted. The reason is stated where the code is: **the weekly goal is
not telemetry.** Everything else in that panel is a report on the past -- a trend across logged
sessions, topics drilled clean a week ago -- and a cold record has no past, so `engaged()` is right
for those two. The goal is a TARGET the user owns and nudges (`goal.weekly`, default 5), and a cold
record has one exactly as a mature one does. The invariant is now TRUE for every record class
instead of the claim being narrowed.

**One thing more than the ruling asked, and it is a correctness fix, not a preference.** The panel
head read "Recent sessions" -- which is the heading for two of its three children, and both of
those are conditional. A one-session record already got "Recent sessions" over nothing but a goal;
a cold record now would too. It reads **"This week"**, which is what its `id` (`hm-week-h`) always
called it and what its only unconditional member is about. The trend keeps its own "Recent
sessions" kicker inside the panel, so the string is not lost -- it stops being asserted of a record
that has no sessions.

**Guarded**: `home_claims.cjs`'s new `goal` judge -- exactly ONE visible `.ix-goal | .hm-goal` per
viewport, asserted on **all 15 pinned records and all 24 generated ones, at both viewports**, which
is strictly more than the ruling's "cold and engaged". Round 5's defect was TWO goal surfaces and
W1.5's was ZERO; a COUNT catches both directions. Plus **MUTANT 8**, planted on the cold record: it
duplicates the live goal and requires the arm to fire -- and if the plant CANNOT LAND, that is the
W1.5 regression reporting itself. WATCHED RED by reverting the hoist:

```
SELF-TEST ABORT -- the analyser does not do what it claims:
  MUTANT 8 CANNOT LAND: the COLD home renders no weekly-goal surface at all, so there is
  nothing to duplicate. That is the W1.5 regression itself.
```

**VR RE-CAPTURED, as authorized.** `home-light` and `home-dark`: **41,462 / 41,486 px (4.05%),
both in the SAME 624x98 box at (316,673)** -- the restored "This week" panel on the cold home and
nothing else. Both diff images were reviewed before regenerating and both new baselines were
reviewed as images after. The receipt pair from cycle 1 (the 2101px delta at (18,613) that recorded
the accidental removal as intended) is kept; this is its correction.

---

### JUDGES' ITEM 1 -- TWO FIGURES THAT DID NOT SURVIVE RE-DERIVATION -- CLOSED

**(1) "62 solid of 310" -> "47 solid of 310".** Re-derived against the live seed rather than taken
on trust -- the `oneThin` record was driven and its rendered verdict read back:

```
"Staff is the thin rail. 47 solid of 310 probes, across 46 of 46 topics -- the level you
 are interviewing for is the one you have rehearsed least."
rails: Staff 47 / 310 - 15%   SDE3 201 / 359 - 56%   SDE2 256 / 302 - 85%
```

62 is 310 x 0.2, the share applied to the tier TOTAL; the seed takes `Math.round` per topic, which
lands on 47. Corrected in section 6 above AND in the comment at `test/home_claims.cjs` (the MUTANT
7 block), so the check's own prose matches what its seed renders.

**(2) The `--gap-home-*` arithmetic.** Section 4b above now reads "30px on top of the panel's own
105px, for 135px recovered against 92px spent" -- 135 - 92 = 43, and 825 - 43 = 782, which is the
figure the table reports. The sentence after it ("the outcome does not close without it") measured
true and stands.

---

### JUDGES' ITEM 2 -- THREE ITEMS WITH NO ARM, AND A FALSE COVERAGE CLAIM -- CLOSED

**The coverage sentence is corrected in place** (section 2 above): `rail_integrity` and
`at_name_hygiene` do not carry the ordinal swap, and cycle 1 shipped it with no arm at all.

**Three arms added to `test/home_claims.cjs`** -- the file whose subject is already "a fact with two
render paths is a fact with two answers", and which already drives pinned records at 1280 and 390.
Same class as its existing arms; the fact is a RENDERER rather than a numeral, which is why nothing
above them could see it. Each is registered in `ALL_JUDGES`, so it cannot be written and never
called.

1. **`goal`** -- exactly one visible goal surface per viewport per record class. (R3, above.)
2. **`act order`** -- wherever both practice acts render, `data-cross="weak"` precedes
   `data-cross="1"`. Asserted in all three surfaces: the home rail at 1280, `.hm-practicem` at 390,
   and the switcher's lead (judged by evaluating `Panels.actionsHtml()` directly, so the switcher's
   copy is covered without opening the overlay). A surface rendering only ONE act is not judged --
   there is no order.
3. **`gauge key`** -- the legend where the keel is painted. (R2, above.)

**A NEW PINNED RECORD was required and is the reason this could not be bolted on.** `weakCount()`
counts topics whose drill is COMPLETE and still carries a shaky probe, which is stricter than
"appears in the weakest list" -- and **not one of the fourteen pinned records satisfied it**. Every
seed either left a topic unfinished (`in-progress`) or finished it clean (`solid`), so
`actionsHtml()` rendered ONE bar on all fourteen and the ordering rule had nothing to order.
`weakTopics` (twelve topics drilled to the end, one probe in seven graded Shaky) is that record; it
also puts keel marks on the rails, which is what gives the legend arm something to label.

**EACH WATCHED RED BY REVERTING THE CORRESPONDING LINE**, one at a time, on a real rebuild:

| reverted | what went red |
|---|---|
| `telemetryHtml()` -> `if (!engaged()) return '';` | `MUTANT 8 CANNOT LAND` -> `HOME CLAIMS: FAIL (self-test)` |
| `actionsHtml()` -> `crossDrillBar() + weakDrillBar()` | `FAIL [1280/weakTopics] ... the lead renders the generic act above the record-addressed one` + `FAIL [390/weakTopics] ... the column ...` |
| `railHtml()` order inverted | `FAIL [1280/weakTopics] ... the rail renders the generic act above the record-addressed one` |
| `.hm-key{display:none}` restored at <=419 | `FAIL [390/absentField]`, `[390/oneShort]`, `[390/weakTopics]` + 20 generated records |

Three more planted mutants now run every gate (8, 9, 10), so the arms stay proven rather than
merely written: **`home_claims` reports 10 planted mutants detected**, up from 7.

**`m-home-light` VR baseline added at 390x844**, so the below-920 home has a pixel guard at all.
The manifest goes 16 -> 17. The hole was real: the two existing mobile baselines are BOTH the
walkthrough pane, so a wave rebuilt the phone home -- the practice move, the gauge compaction, the
key -- and every baseline in the file stayed byte-identical.

---

### ADJACENT DEFECT FOUND WHILE REVIEWING THE NEW CAPTURE -- FIXED

Restoring the cold goal put the "This week" panel ALONE in the `.hm-duo` row, and it rendered
**248px wide, centred, in a 624px column** -- a lone island in a row it was supposed to fill --
wearing two top edges (its own `.hm-panel` border plus a second hairline) with 20px of dead space
between them and its heading.

The cause is not new. `.hm-tele` carried `margin:0 auto var(--gap-home-telemetry)` plus
`padding-top:var(--space-20)` and `border-top` from when it owned a row of the stack. As a GRID
item, `margin:0 auto` is not centring -- it is SIZING: auto side margins make a grid item shrink to
max-content. The defect was already live on the ENGAGED home, where the narrow panel sat beside a
full-width sibling and read as a design. It is on master.

Fixed to `.hm-tele{max-width:var(--measure-home);margin:0 0 var(--gap-home-telemetry)}`. The bottom
gap stays on its `--gap-home-*` token, which is the layer `home_rhythm.py` enforces:
`HOME RHYTHM: PASS (8 rhythm gap(s) + 11 measure(s) ... registry matches discovery exactly,
0 NEW, 0 STALE)`. Measured after: the panel fills the row at 624px on the desktop and 362px on the
phone.

**Disclosed as scope this cycle was not asked for.** It is fixed rather than filed because the
alternative was writing a lone 248px island into a brand-new VR baseline -- which is the check's
own stated failure mode ("regenerating without looking is how a regression becomes the new
reference").

---

## VR CONTRACT, CYCLE 2 -- HONOURED

`git status test/baselines/` lists exactly four paths: the two home PNGs (modified), `manifest.json`
(two sha256 values, the new key, the generated timestamp) and the new
`m-home-light-win32-chromium149.png`. **The other 14 baselines rewrote byte-identical** under
`npm run vr:update`, so the non-home contract holds by rewrite, not by abstention. Verify run after:

```
17 baselines compared; worst = 0 px (home-light), budget 32 px.
VISUAL REGRESSION: PASS  (17 baselines, win32-chromium149)
```

One note for the record: the first `vr:update` attempt DIED mid-run (`browser.newContext: Target
page, context or browser has been closed`) under load from a sibling wave's measurement job, and
the check REFUSED to write baselines from a bad capture -- which is the behaviour that guard exists
for. Re-run clean.
