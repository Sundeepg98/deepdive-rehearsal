# W1.5 COLD VERIFY -- INDEPENDENT FIX VERIFICATION

**Verifier** an independent agent with no part in building W1.5. Nothing below is taken on trust
from `_WAVE_LEDGER.md` or `_audit/2026-08-02-w15-freeze.md`; every figure here was re-measured on
the frozen tree by this verifier with the item's own stated method, and where a number disagrees
with the ledger's it is printed as DISPUTED with my number beside theirs.

**Subject** branch `appeal/w15-refinements`, frozen tip `9421057`, worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\w15-home`.

**READ-ONLY HONOURED.** No file in the worktree was written except this document. Every mutant was
planted in a SCRATCH MIRROR of the built deliverable (a byte copy with one recorded reversion
applied) under `%TEMP%\claude\D--claude-workspace-deepdive-rehearsal\<session>\scratchpad\w15cv\`,
and every check was pointed at the mirror by its own `argv[2]` deliverable parameter. The build
reproduction in section 6 ran in a `git archive` extract of the tip, not in the worktree.
`git status --porcelain` was empty before I started and is empty apart from this file now.

**ASCII.** This file is strict 7-bit ASCII. Where I quote text the app renders with non-ASCII
glyphs, the middle dot U+00B7 is written `.` and the em dash U+2014 is written `--`; the byte-exact
strings are in the raw check output under the scratch path above.

---

## 0. TREE STATE AT THE MOMENT OF VERIFICATION

```
git log -1        9421057 docs(w15): the branch gate did not fire, and the receipt for why
git status        clean
dist/index.html   12,285,811 bytes   md5 a83b26c2635e29e942750b20e40c99ff
deliverable       12,285,811 bytes   md5 a83b26c2635e29e942750b20e40c99ff   (byte-identical)
git diff --stat 08cae96..9421057   _WAVE_LEDGER.md + _audit/*  ONLY -- the post-run-of-record
                                   commits really are docs, and the run of record still describes
                                   the code at the tip
```

---

## 1. WHAT I RAN ON THE FROZEN TREE, BEFORE PLANTING ANYTHING

Every W1.5-bearing check, re-run by me, on the committed deliverable. All green, and the
assertion counts are the ones the freeze publishes:

| check | my run | freeze/ledger says |
|---|---|---|
| `overlay_deadzone` | PASS, **74 assertions**, exit 0 | 74 |
| `home_claims` | PASS, **13 planted mutants detected**, exit 0 | 13 |
| `home_fold` | PASS, **88 assertions across 11 records x 390x844 + 360x844**, 2 planted mutants (one per viewport), exit 0 | 88 |
| `focus_ring` | PASS, **24 assertions**, exit 0 | 24 |
| `touch_floor` | PASS (both stepper sections, both plants), exit 0 | PASS |
| `print_truth` | PASS, exit 0 | PASS |
| `home_reflow` | PASS, 2 planted mutants detected | PASS |
| `home_rhythm` | PASS, **7 rhythm gaps + 11 measures, 0 NEW / 0 STALE** | 7 + 11 |
| `phantom_tokens` | PASS, 3 allowlisted, none stale | PASS |
| `at_name_hygiene` | 52/52 assertions, 9 + 2 mutants detected | 52/52 |
| `ascii_guard` | PASS, 838 files strict 7-bit | PASS |
| `visual_regression` | PASS, **18 baselines, worst = 0 px (home-light), budget 32 px** | identical text |

`home_fold` was run TWICE. The measurement lines (`hero ... band ... chips top ...`) are
**byte-identical across the two runs** -- `md5sum` of all 22 lines is `fa925e70218f9f442ed4fdc401d2b8fe`
both times. Cycle 3's "57px coin flip" fix (FOLD() pins the scroll and asserts it) reproduces.

---

## 2. PER-ITEM VERDICTS

### CYCLE 1 -- six items

**1. `p` on the home -- VERIFIED.**
Source: `src/scripts/app/shell.js:278` reads `if (key === 'p') return;` inside the `if (onHome)`
block. Driven by me, independently of the check, on a home seeded with a `saga` record: before the
press `documentElement.dataset.view === 'home'` and `TopicRegistry.current().id === 'content-pipeline'`
(the BOOT constant -- the defect's precondition is live), after `page.keyboard.press('p')` the open
modal list is `[]`; on `#saga/drill` the same press opens `sessov`. So the guard is a scope, not a
deletion. Negative control NC-01 below.
*Line-number drift:* the freeze cites `shell.js:261`; on the frozen tree it is `:278`.

**2. Cross-act ordinal -- VERIFIED, in all three surfaces.**
`panels.js:333` is `actionsHtml() { return weakDrillBar() + crossDrillBar(); }`. Measured on the
built page with a `weakTopics` record: phone column `[weak, 1]`, switcher lead (evaluating
`Panels.actionsHtml()`) `[weak, 1]`, rail Practice nav `Weak-spot review / Cross-topic drill /
Topic index`. Cycle 2's correction of cycle 1's false coverage sentence is also VERIFIED:
`grep -c "Cross-topic\|Weak-spot" test/rail_integrity.cjs test/at_name_hygiene.cjs` returns **0 and 0**,
so neither file could ever have gone red on the inversion. Negative controls NC-04 (lead + column)
and NC-05 (rail).

**3. Goal single-source -- VERIFIED.**
`grep -rn "hm-goal" src/` returns exactly **two hits, both prose** (`home-view.js:236`,
`styles.css:2598`). Measured on the page: the home renders **exactly one** visible
`.ix-goal / .hm-goal` on 5 record classes x 2 viewports = 10 render paths. Negative control NC-06
puts a second surface back and the count arm fires on all 80 record/viewport cells.

**4. Phone first screen + the fold contract -- VERIFIED (with the ruled contract's own wording).**
The move is in the DOM, not in CSS: measured `getComputedStyle('.hm-practicem').order === "0"` and
the document order is `.hm-continue -> .hm-practicem -> .hm-alt -> .hm-duo -> .hm-rooms` on every
record I drove. At 390x844 on a mid-campaign record `.hm-practicem` top is **359.9px** (cycle 1
reports 360 after, 2136 before). The 22-cell matrix is re-measured under item R1 below.

**5. Cursor integer guard -- VERIFIED (closed on arrival).**
`home-view.js:112` `isIndex(v, n)` with `Number.isInteger`, used at `:127` and `:132`;
`firstUngraded` at `:176`. Both cited line numbers resolve exactly. `git log -S` provenance not
re-run (the code is on the tree, which is what the item claims).

**6. `home_claims` period-blindness -- VERIFIED, with the mutant.**
The matcher at `test/home_claims.cjs:508` is the name-exclusion form. The corrected figure is
re-derived on the built page: the `oneThin` record renders **"Staff is the thin rail. 47 solid of
310 probes, across 46 of 46 topics"** -- 47, not 62. Negative control NC-09 restores `[^.;]{0,40}`
in a scratch copy of the check and gets `MUTANT 7 UNDETECTED ... "Staff is the thin rail. 48 solid
of 310 probes..."` -- the ledger's transcript, character for character.

### CYCLE 2 -- five items plus the adjacent fix

**R1 fold contract + `home_fold` -- VERIFIED, and the 22 cells reproduce to the pixel.**
My own run of the check produces, at 390x844, chip-list tops of **769 / 787 / 847 / 865** for
one-thin x 1 bar / two-thin x 1 bar / one-thin x 2 bars / two-thin x 2 bars on the short hero --
the ledger's cycle-2 table exactly. The first chip is OUT in **all 20 chip-bearing cells** (769
+ 44 = 813, 14px past a fold at 799 on the roomiest), and the ACT carries the contract in **all 22**
(`Weak-spot`/`Cross-topic clears the fold by 216-397px`). Cycle 3's resume-shape control also
reproduces exactly: `390 two-thin x 2 bars x LONG: no-record 1006 | has-record 1006`,
`390 one-thin x 1 bar x short: 769 | 769`, `360 ...: 1087 | 1087`, `360 ...: 856 | 856`, and
`.hm-since` measures **34px in both branches at both widths**. The fourth term is worth **0px**, as
cycle 3 states and against the escalation's "57px".
*One DISPUTED figure inside this item: the compaction's worth. See section 7, D-1.*

**R2 gauge legend -- VERIFIED, and the width sweep bisects where the ledger says.**
The `<=419px` hide rule is gone; the key is visible at every width I swept. Swept myself, width by
width, reading `.hm-key`'s live height:

```
320 340 355 360 361 362 363   -> h = 40   (two rows)
364 365 366 367 368 375 390 400 412 419 420 430 -> h = 15   (one row)
```

**The wrap boundary is 364px**, bisected, exactly as cycle 3 J5 restated it. With the 6px
`margin-top` (read from the live computed style) the hide was worth **21px at 364+ and 46px below
364**. Negative control NC-07 puts the rule back and the `gauge key` judge fires.

**R3 cold goal -- VERIFIED.**
`panels.js:352` is `if (!engaged()) return goalStrip();`. Measured: the COLD home renders one goal
surface at 1280x800 AND at 390x844, and the panel head reads **"This week"**. Negative control
NC-08 restores the `return ''` gate and the check aborts with the ledger's exact words:
`MUTANT 8 CANNOT LAND: the COLD home renders no weekly-goal surface at all ... That is the W1.5
regression itself`.

**J1 the two restated figures -- VERIFIED (47) / VERIFIED-BY-STRUCTURE (the gap arithmetic).**
47 is re-derived above off the live seed. The `--gap-home-*` arithmetic is checked structurally
rather than historically: `tokens.generated.css` gives `--gap-home-continue/-altitude/-section` a
default of `var(--space-26)` and `styles.css:2500-2501` re-values all three to `var(--space-16)` on
the phone -- 3 x 10 = **30px**, which is the "30px on top of the panel's own 105px" the restatement
claims. The 105 / 92 / 43 / 782 halves are cycle-1-era measurements against a build that no longer
exists; they are NOT independently re-derivable on the frozen tree and I do not certify them.

**J2 three arms + the `weakTopics` seed -- VERIFIED.** All three judges fire under NC-04/05/06/07.

**Adjacent: `.hm-tele` was a 248px island -- VERIFIED.**
`styles.css:2320` is `.hm-tele{max-width:var(--measure-home)}` -- no `margin:0 auto`. Measured
widths: **624px on the cold desktop row** (it fills it) and **362px on the phone**. The ledger's two
numbers, both reproduced.

### CYCLE 3 -- nine items

**R4 the kicker -- VERIFIED, and more strongly than the ledger states it.**
`.ix-home-k` count inside the goal is **0**, and `.ix-home-k` anywhere on the home is **0**, on 5
record classes x 2 viewports = **10 render paths** (the ledger measured four). `.ix-goal-top`
computes `justify-content: flex-end` at both viewports. `grep -rn "This week" test/` returns
**nothing**, so no assertion pinned the kicker text -- exactly as claimed.

**J1 the scoped absolute -- VERIFIED.** Both sites read "in the shapes this check pins"; and my own
22-cell run shows the chip list out in every one, which is what the scoped sentence says.

**J2 the confounded fourth term -- VERIFIED.** `cfg.resume` is declared, read back and asserted;
the crossed cells exist; the isolated pair is worth 0px (measured above).

**J3 `.hm-tele`'s bottom margin -- VERIFIED.**
`home_rhythm` on my run: **7 rhythm gaps + 11 measures, registry matches discovery exactly, 0 NEW,
0 STALE** (gaps 8 -> 7 as predicted). `phantom_tokens` PASS -- the deleted `gap.home.telemetry`
left no orphan; `grep -rn gap-home-telemetry src/ design-tokens/` returns only prose comments and
the commented-out registry line at `test/home_rhythm.py:174`. Measured consequence on the frozen
tree: on the cold desktop `.hm-duo` height == `.hm-tele` height == **136.4px**, slack **0**.

**J4 "Anywhere" -- VERIFIED.**
`keyboard-overlay.js`: `[` `]`, `N`, `P` and `Ctrl P` all sit under the head **"While you're in a
topic"**; "Anywhere" holds only route-agnostic keys. My own base run of `overlay_deadzone` shows
each of the four driven BOTH ways ("genuinely dead on #home" and "still ... on a topic route").

**J5 one width licensing a band -- VERIFIED.** The sweep above; and the check runs 390 AND 360.

**J6 `m-home-dark` -- VERIFIED.** 18 PNG baselines on disk against **16 at master 2696291**; the two
new keys are `m-home-light` and `m-home-dark`.

**J7 the met sentence -- VERIFIED.** Driven on a 12-topic week at both viewports:
`12 topics drilled this week . Goal met -- nice work.` No "goal met" three times, no broken clause.
Negative control NC-11 restores the concatenation and gets
`"46 topics drilled, 5-topic goal met with 41 to spare drilled this week . Goal met -- nice work."`

**J8 the destroyed space -- VERIFIED.** `shell.js:279` reads `const homeTabKeys = {`. `ascii_guard`
and the build both pass. (Cited as `:262`; drifted to `:279`.)

**Found while measuring -- `home_fold`'s coin flip -- VERIFIED FIXED.** Two full runs, measurement
lines byte-identical (md5 above). `FOLD()` scrolls to top and the scroll is asserted in the
row-shape arm on all 22 cells ("the page really is at the top").

### CYCLE 4 -- eight items

**R5 Ctrl+P on the home -- VERIFIED.**
`print-qa.js:109` returns without `preventDefault` on `data-view === 'home'` (the cited line number
resolves). `grep -rn "window.open" src/` finds exactly **one** real call site, `print-qa.js:86`.
My base run drives it both ways. Negative control NC-14 reverts the guard and gets
`window.open calls 1, defaultPrevented true`.

**R6 the boot window -- VERIFIED.**
`view-manager.js` exposes `routed()`; `shell.js:226` gates the whole keydown handler on it. The
check's own seeded mutant (the gate line deleted from a COPY of the build) ran on my base run and
came back detected -- `the seeded mutant reproduces the leak -- gate deleted, 'p' opens Session
progress on the BOOT topic and 'w' moves the route`. The natural-window evidence arm printed
**3 of 3 presses landed inside the window** on my run.

**J1+J3 `judgeGoalSentence` -- VERIFIED.** Registered, five rules, three plants. NC-02, NC-10 and
NC-11 each fire one rule in isolation, with the counts the ledger predicts.

**J2 R4's receipt restated -- VERIFIED.** The dated parenthesis is in place and its distinction is
the one `panels.js` draws in its own comment. My 10-path kicker measurement supports the restated
claim, not the struck one.

**J4 `topicWord(n)` -- VERIFIED, driven through the UI the way the judge reached it.**
One topic drilled, then five trusted `locator.click()` presses on `-` at 390x844:

```
start   1 of 5 topics drilled this week . 4 more to go
click1  1 of 4 topics drilled this week . 3 more to go
click2  1 of 3 topics drilled this week . 2 more to go
click3  1 of 2 topics drilled this week . 1 more to go
click4  1 topic drilled this week . Goal met -- nice work.
click5  1 topic drilled this week . Goal met -- nice work.      (the clamp at 1 holds)
```

The ledger's transcript, reproduced press for press. Negative control NC-10 gives exactly **2**
failures, both on `goalOfOne` -- which is the point the ledger makes about that seed.

**J5 `goalLine(g, bold)` -- VERIFIED, with one note.** One composer; `Panels.goalLine(weeklyGoal())`
returns the visible line minus the note on every record I drove. The ledger's cycle-4 table has an
"accessible name" column; on the frozen tree that channel **no longer exists** -- T2 removed it.
That is stated in T2 and is not a contradiction, but a reader of the cycle-4 table alone would be
misled without the T2 section.

**J6 the 44px stepper -- VERIFIED, and the panel-delta table reproduces to the tenth of a pixel.**
See section 5.

### CYCLE 4, CLOSING PASS -- R7-R10

**R7 the receipt -- VERIFIED.** `panels.js:181` is
`(g.met ? n(g.done) + topicWord(g.done) : goalPhrase(g, bold)) + ' drilled this week'` -- so
`goalPhrase` is called only on the UNMET branch, exactly as the restatement says. The met branches
are not dead: NC-02 and NC-11 are composed from them and both fire, so deleting them would delete
two of the wave's thirteen regression proofs. (`panels.js` line citations in the ledger have
drifted -- `goalStrip` is now `:217`, `telemetryHtml` `:351`, the in-place re-render `:619-620`.)

**R8 the focus ring -- VERIFIED, character for character.**
Two rules at `styles.css:1840-1841`; `button:focus-visible` at `styles.css:53` carries the
`0 0 16px -4px` layer, so the generic indicator reaches 12px past the border box, exactly as
computed. Negative control NC-12 deletes both rules and gets **FOCUS RING: FAIL (2)** with
`painted ["ix-goal-b +12px [807,707.8,875,775.8]"]` at 1280 and `[243,387.6,311,455.6]` at 390 --
the ledger's coordinates, to the tenth.

**R9 `routed()` -- VERIFIED, character for character.**
One assignment, at `view-manager.js:107`, before any side effect. Every ingredient checks out:
`HomeView.render` is called from `view-manager.js:118` and nowhere else in `src/`; `Router.emit`
swallows subscriber throws at `router.js:87`; the home branch stamps `data-view` before rendering.
Negative control NC-03 moves the assignment to the two end-of-branch positions and gets
**OVERLAY DEADZONE: FAIL (2 of 74)** with the payload
`{"threw":1,"routed":false,"view":"home","density":"default"}` and `density default -> default` --
the ledger's transcript verbatim, and the honesty arm above it stayed green so the red is
attributable to the flag's placement and not to the hold.

**R10 the arm's second width -- VERIFIED, and it demonstrably catches what the phone arm cannot.**
Measured myself: `.ix-goal-b` is **44x44 at 1280x800 AND at 390x844**. Negative control NC-13
shrinks the box to `var(--space-20)`: three arms go red, including
`the weekly-goal stepper clears the app's own 44px floor at 1280x800 too` -- the arm R10 added --
and the check then ABORTS because its own width-scoped self-test can no longer be attributed. That
abort is the right behaviour and is itself a proof that the check will not report a self-test it
cannot separate.

### TAIL FIXES

**T1 the home print -- VERIFIED, byte-exact.**
I printed the home myself at 1280x900, A4, `preferCSSPageSize`, on the shipped build:
**2 pages / 143,721 bytes** -- the ledger's AFTER figure, to the byte. I then extracted the text
PER PAGE from the PDF (reusing `print_truth`'s own Type0/ToUnicode decoder in a scratch copy):

```
page 1   the intro line, "Start here", the Cross-topic act, the Altitude gauge, "This week"
page 2   the six rooms, the topic list, "0 of 972 probes graded / 0 solid . 0 shaky . 0 missed"
```

`"probes graded"` is on page **[2]** and page [2] only -- the ledger's re-measured figure, and the
evidence that `.hm-status` flows once instead of repeating. Under print media I read
`.hm-rail`/`.hm-tabs`/`.hm-skip` at `display:none`, `.hm-status` at `position:static`, and
`#scrolltop` left alone at `position:fixed` -- every element decision in the ledger, on the page.
Two negative controls, one per cause (NC-15, NC-16), each producing exactly one red with the
ledger's exact payloads. And the DEVIATION is vindicated by NC-17: building the NAMED fix
(`body:not(.print-session) .cram-ov.open`) takes `print_truth`'s never-opened arm to
**1 page / 1,048 bytes, `sections=0`, exactly one arm red** -- the ledger's numbers to the byte.

**T2 the double announcement -- VERIFIED off the accessibility tree.**
I read the CDP full AX tree on the cold home at 1280. Every node whose name contains "drilled this
week":

```
StaticText      " of 5 topics drilled this week . 5 more to go"
InlineTextBox   " of 5 topics drilled this week . 5 more to go"   (that node's own text box)
```

plus `button "Lower the weekly goal"` and `button "Raise the weekly goal"`. The bar carries
`role=null, aria-label=null, aria-labelledby=null, title=null, aria-hidden="true"` on all 10
record/viewport paths I drove. The fact is announced once. Negative control NC-02 puts a name back
and `home_claims` reports **FAIL (80)** -- the ledger's exact count.

---

## 3. NEGATIVE CONTROLS -- SEVENTEEN, ALL PROVEN ABLE TO FAIL

The brief requires at least two. Seventeen were planted, one recorded reversion each, in scratch
mirrors of the frozen deliverable; the arm was then required to go RED and the red required to be
the RIGHT one. Every mirror was verified to differ from the frozen bytes and every anchor was
asserted to occur EXACTLY ONCE before planting (a plant that lands zero or N times proves nothing).

| # | reversion planted | check | RESULT |
|---|---|---|---|
| NC-01 | `if (false && key === 'p')` | `overlay_deadzone` | **FAIL 3 of 74** -- home-keymap arm, "P is dead on #home" arm, and the natural-boot arm; the three control arms beside them stayed green |
| NC-02 | the goal bar given `role="img"` + `aria-label` again | `home_claims` | **FAIL (80)** -- every pinned and generated record at both viewports, all on rule 1 |
| NC-03 | `routeApplied = true` moved to the two end-of-branch sites | `overlay_deadzone` | **FAIL 2 of 74**, payload identical to the ledger's |
| NC-04 | `crossDrillBar() + weakDrillBar()` | `home_claims` | **FAIL (2)** -- the lead at 1280, the column at 390 |
| NC-05 | `railHtml()` Practice nav inverted | `home_claims` | **FAIL (1)** -- the rail at 1280 |
| NC-06 | a second `.ix-goal` surface on the rail | `home_claims` | **FAIL (80)** -- the COUNT arm catches the opposite direction from R3's |
| NC-07 | `.hm-key{display:none}` restored at `<=419` | `home_claims` | **FAIL (26)** -- 3 pinned + 23 generated |
| NC-08 | `telemetryHtml() { if (!engaged()) return ''; ... }` | `home_claims` | **SELF-TEST ABORT** -- `MUTANT 8 CANNOT LAND ... That is the W1.5 regression itself` |
| NC-09 | the period-blind matcher `[^.;]{0,40}` (in a scratch copy of the check) | `home_claims` | **SELF-TEST ABORT** -- `MUTANT 7 UNDETECTED ... "48 solid of 310 probes"` |
| NC-10 | `topicWord()` -> always `' topics'` | `home_claims` | **FAIL (2)**, both on `goalOfOne` -- 2, not 56, which is that seed's whole purpose |
| NC-11 | `goalLine()` -> `goalPhrase(g, bold) + ' drilled this week'` | `home_claims` | **FAIL (56)** with the three-times-met sentence |
| NC-12 | both `.ix-goal-b:focus-visible` rules deleted | `focus_ring` | **FAIL (2)**, one per width, painted rects identical to the ledger's |
| NC-13 | `.ix-goal-b` back to `var(--space-20)` | `touch_floor` | **3 FAILs** (390 both-axes, compact density, **1280**) then a correct self-test ABORT |
| NC-14 | Ctrl+P's home return reverted | `overlay_deadzone` | **FAIL 1 of 74** -- `window.open calls 1, defaultPrevented true` |
| NC-15 | `html[data-view="home"] .cram-ov:not(.open)` deleted | `overlay_deadzone` | **FAIL 1 of 74** -- `painted .cram-ov heights [3260]` |
| NC-16 | `html[data-view="home"] .app{display:block}` deleted | `overlay_deadzone` | **FAIL 1 of 74** -- `{"home":{"w":0,"h":0,"rects":0}, "homeChars":26756}` |
| NC-17 | the NAMED T1 fix built instead of the deviation | `print_truth` | **1 FAILED** -- `file-print-never-opened {"pages":1,"clipped":0,"bytes":1048}`, `sections=0` |

In addition, the plants the checks carry THEMSELVES all ran and were detected on my clean base
runs -- `home_fold` 2 (one per viewport, and the check aborts if it is proved at fewer viewports
than it runs), `focus_ring` 2 (one per width, plus a lift assertion), `touch_floor` 2 (the 20px
restore and the width-scoped `min-width:920px` shrink), `overlay_deadzone` 1 (the gate line deleted
from a copy of the build), `home_claims` 13, `home_reflow` 2, `at_name_hygiene` 11.

---

## 4. THE MEASUREMENTS I TOOK MYSELF, BESIDE THE LEDGER'S

Read off the built page, 5 record classes x 2 viewports, page pinned to the top:

| what | my measurement | ledger |
|---|---|---|
| visible goal surfaces, every record class incl. COLD, both viewports | **1** everywhere | 1 |
| `.ix-home-k` (kicker) anywhere on the home | **0** on all 10 paths | absent on 4 paths |
| `.ix-goal-top` `justify-content` | **flex-end** both viewports | flex-end |
| `.ix-goal-b` box | **44 x 44** at 1280 and at 390 | 44x44 |
| `.ix-goal-g` painted chip | **20 x 20** | 20px chip |
| goal bar attributes | `role=null label=null labelledby=null title=null aria-hidden="true"` | same |
| head of the week panel | **"This week"** | "This week" |
| `.hm-key` visible at 390 | **true**, h **15px**, margin-top **6px** | 21px total |
| `.hm-tele` width, cold | **624px** desktop / **362px** phone | 624 / 362 |
| `.hm-alt`, one-thin @390 | **287.6px** | 288 |
| `.hm-alt`, two-thin @390 | **305.8px** | 306 |
| `.hm-verdict`, one-thin @390 | **61.6px** | 62 |
| `.hm-verdict`, two-thin @390 | **79.8px** | 80 |
| oneThin verdict text | "Staff is the thin rail. **47** solid of 310 probes, across 46 of 46 topics" | 47 |
| engaged-12 goal line | "12 topics drilled this week . Goal met -- nice work." | same |

---

## 5. THE TWO BEFORE/AFTER PAIRS, RE-DERIVED FROM BOTH SIDES

A ledger delta cannot be checked from the frozen tree alone, so I built the counterfactual: the
pre-change declarations planted back into a mirror, and the SAME probe run against both builds.

**The cycle-4 stepper (`box20` + `.ix-goal-top{margin-bottom:6}` + `.ix-goal-set{gap:8}`, with no
`min-height` override so the `<=919px` element floor still applies):**

| | button | `.ix-goal-top` | `.hm-tele` |
|---|---|---|---|
| 1280 before (my mirror) | **20x20** | **20** | **118.4** |
| 1280 after (frozen) | **44x44** | **44** | **136.4** (**+18**) |
| 390 before (my mirror) | **20x44** | **44** | **142.4** |
| 390 after (frozen) | **44x44** | **44** | **136.4** (**-6**) |

**Every cell of the ledger's cycle-4 J6 table, reproduced to the tenth of a pixel** -- including the
counter-intuitive half, that the PHONE panel gets 6px SMALLER while the desktop grows 18px.

**The R1 verdict compaction (the `<=919px` `.hm-alt .hm-verdict` rule removed):** see DISPUTE D-1.

---

## 6. THE ARTEFACT CLAIMS

**Build reproducibility -- VERIFIED INDEPENDENTLY, without touching the worktree.**
`git archive 9421057 | tar -x` into scratch, a `node_modules` junction to the shared store, then
`npm run build`:

```
sync-deliverable: dist/index.html -> deepdive_content_pipeline_rehearsal.html (12285811 bytes)
md5  a83b26c2635e29e942750b20e40c99ff   scratch dist/index.html
md5  a83b26c2635e29e942750b20e40c99ff   scratch deliverable
md5  a83b26c2635e29e942750b20e40c99ff   the COMMITTED deliverable in the worktree
```

That is `build_integrity`'s strong form -- "COMMITTED deliverable == fresh build of HEAD" -- and its
12,285,811-byte figure, re-derived from git rather than from the check.

**VR -- VERIFIED, and the non-home contract holds BYTE-WISE.**
`visual_regression`: **18 baselines compared; worst = 0 px (home-light), budget 32 px**;
`git status test/baselines/` empty. Baseline PNGs: **16 at master 2696291 -> 18 now**. I compared
each of the **14 non-home baselines** against `git show 2696291:...`: **all 14 byte-identical**.
Only `home-light` and `home-dark` moved; `m-home-light` and `m-home-dark` are new. (The two
pre-existing mobile baselines are indeed both `m-walk-*`, the walkthrough pane.)

**VR receipt pairs -- VERIFIED as authentic, by hash.** All six files in `_audit/w15-receipts/`
exist and:

```
home-light-BEFORE-master-2696291.png == git show 2696291:test/baselines/home-light-...   MATCH
home-dark-BEFORE-master-2696291.png  == git show 2696291:test/baselines/home-dark-...    MATCH
home-light-AFTER-w15.png             == test/baselines/home-light-...                    MATCH
home-dark-AFTER-w15.png              == test/baselines/home-dark-...                     MATCH
m-home-light-NEW-w15.png             == test/baselines/m-home-light-...                  MATCH
m-home-dark-NEW-w15.png              == test/baselines/m-home-dark-...                   MATCH
```

**CI -- VERIFIED, including the reason.** `gh run list --branch appeal/w15-refinements` returns
empty. `.github/workflows/` on this branch holds **only `deploy-pages.yml`**; `origin/master` holds
eight workflows including `gate.yml`. The freeze's structural explanation is exactly right.

**The gate of record.** I did not re-run the full 77-check serial gate; I re-ran the twelve checks
that carry this wave's work plus `visual_regression`, all green, and re-derived `build_integrity`'s
strong form from git. The capture in `_audit/2026-08-02-w15-gate.txt` is consistent with everything
I measured.

---

## 7. DISPUTES

**D-1. DISPUTED -- ledger cycle 2 R1(c): "the compaction is worth 10px / 11px of panel, not 20."
My measurement says it is worth 20.2px / 21.6px of panel.**

Method: the one declaration
`html[data-view="home"] .hm-alt .hm-verdict{margin-top:6;padding-top:6;line-height:snug}` deleted
from a mirror of the frozen build, same probe against both, 390x844:

| record | `.hm-verdict` before | after | delta | `.hm-alt` before | after | delta |
|---|---|---|---|---|---|---|
| one-thin | **71.8** | **61.6** | **-10.2** | **307.8** | **287.6** | **-20.2** |
| two-thin | **91.4** | **79.8** | **-11.6** | **327.4** | **305.8** | **-21.6** |
| cold | **91.4** | **79.8** | **-11.6** | **327.4** | **305.8** | **-21.6** |

The AFTER halves reproduce the ledger exactly (62 / 80 element, 288 / 306 panel). The BEFORE halves
do not: the ledger's panel BEFORE is a RECONSTRUCTION -- "277px + 21 (key restored) = 298" -- built
from a cycle-1 measurement of a different record, and it omits the margin half of the rule.
`getBoundingClientRect` on `.hm-verdict` sees the padding and the leading (their 6 / 7px) but never
the `margin-top`, which the same declaration takes from 16 to 6; the panel sees both. So the true
panel delta is `10 (margin) + 10.2 (padding + leading)`. The section's own conclusion --
"no fold outcome flipped in any of the nine measured combinations" -- is unaffected and I re-confirm
it across all 22 cells. **The direction of the error favours the fix**: the compaction bought about
twice what was claimed, and the paragraph that argues against "20" is arguing against its own
measurement.

**D-2. DISPUTED (figure, not finding) -- freeze section 3: "c1: `if (false && key === 'p')` -> 1
red." On the frozen tree the same reversion produces 3 reds.**
NC-01 goes red on the section-5 home-keymap arm, on section 6's "P is genuinely dead on #home", and
on the natural-boot evidence arm. The "1 red" is honest for cycle 1's build -- section 6 and the
boot window did not exist yet -- but the freeze's coverage table is presented as describing the
tree being frozen, and on that tree the number is 3. Coverage is BETTER than advertised.

**D-3. DISPUTED (figure) -- freeze section 7 quotes
`print_truth ... file-print-never-opened: {"pages":3,"clipped":0,"bytes":390220}`. My run reads
`bytes: 391447`.**
`pages` and `clipped` -- the load-bearing halves -- reproduce. The BYTE COUNT does not, and it is
run-to-run variable: the ledger's own T1 section quotes 391,447 for the same arm on the same tree.
A PDF byte count is not a stable receipt and should not be printed as one.

**D-4. DISPUTED (count) -- ledger cycle 2 R2: the gauge-key reversion goes red on "2 more pinned
records, plus 20 of the 24 generated ones". My run: 3 pinned + 23 generated = 26 reds.**
Cycle-2-era figure against a build that has since changed; the finding is unaffected.

**D-5. NOT A DEFECT, but a reader will be sent to the wrong line.** Several source citations have
drifted with later commits and no longer resolve:

```
freeze S1     "shell.js:261 returns"           -> the p-guard is at shell.js:278
ledger c3 J8  "shell.js:262"                   -> `const homeTabKeys` is at shell.js:279
ledger c1 3   "Panels.goalStrip() (panels.js:151)"   -> :217
              "telemetryHtml() (panels.js:276)"      -> :351
              "refreshed IN PLACE (panels.js:543)"   -> :619-620
              "goalPhrase() stays exported (:617)"   -> :149 (definition), :694 (export)
closing pass  ".ix-goal-b (styles.css:1772)"   -> :1821
```

These DO resolve, and I checked them because they carry arguments: `print-qa.js:109`,
`styles.css:53` (`button:focus-visible`), `home-view.js:112` (`isIndex`), `view-manager.js:107`
(`routeApplied = true`), `router.js:87` (the swallowing catch), `view-manager.js:118`
(`HomeView.render`, and it is the only call site), `panels.js:333` (`actionsHtml`),
`test/home_rhythm.py:174` (the deleted registry entry, left as a comment).

**D-6. NOT A DEFECT, an incompleteness.** The ledger's cycle-4 J5 table publishes an "accessible
name" column for the goal bar. On the frozen tree that channel does not exist -- T2 deleted it.
T2 explains this, but the cycle-4 table is not annotated where it sits, and it is the only place in
the wave where a receipt describes a state the tip does not have. Every other superseded figure in
this ledger carries a dated parenthesis in place; this one does not.

**Not re-derivable, and not certified:** cycle 1 item 4b's `105 / 92 / 43 / 782` arithmetic and
cycle 1's `825 -> 782` chip figures are measurements of a build that no longer exists. The
structural half (three phone gaps at 26 -> 16 = 30px) I did verify; the rest I can neither confirm
nor dispute, and the ledger already restated this paragraph once.

---

## 8. VERDICT

**Thirty-four items: 34 VERIFIED as fixed. 0 items dispute the FIX; 4 figures are DISPUTED
(D-1 to D-4) and 2 documentation defects are recorded (D-5, D-6).** Every one of the disputes is a
receipt that does not survive re-derivation, not a defect that survived the fix, and D-1 and D-2
both run in the direction of the work being better than its own paperwork.

Seventeen independent negative controls were planted and every arm this wave shipped went RED on
its own recorded mutant, with the right message and -- in eleven cases -- with the ledger's payload
character for character. Two checks proved they will ABORT rather than report a self-test they
cannot attribute. No arm in this wave was found unable to fail.

The frozen tree builds byte-identically from git, its baselines are pixel-clean with the non-home
contract holding byte-wise, and its VR receipt pairs are hash-authentic.
