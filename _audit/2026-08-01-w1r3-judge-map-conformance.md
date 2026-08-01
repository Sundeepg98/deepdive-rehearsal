<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (map-conformance lens, round 3), 2026-08-01, against appeal/home-instrument @ f08c4ac.
     Preserved unedited as the record round 4 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-4 addendum). -->

# W1 JUDGE — MAP CONFORMANCE — ROUND 3

**Subject:** the built home of Deep Rehearsal, `appeal/home-instrument` @ **`f08c4ac`**
("the home says only what the record can support"), worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`, driven from
`deepdive_content_pipeline_rehearsal.html` — verified **byte-identical** to `dist/index.html`
(md5 `b10b1304f195b8d53f031e53c3569e59`), tree clean at judgment time.
**Lens:** one only — does the built home honour the adopted flow map (`_ia/ADOPTED.md`,
`_ia/zonemap-flow.md` §Z1/§Z2, `_ia/zonemap-library.md` §0.1 RULE L2 / RULE L3).
**Method:** driven live at 1440 / 1280 / 1279 / 1024 / 900 / 860 / 790 / 759 / 700 / 600 / 560 /
559 / 520 / 519 / 500 / 480 / 460 / 440 / 430 / 428 / 420 / 419 / 390 / 360 / 320, on sixteen
constructed records (the battery's nine plus seven of my own), both themes where it mattered, all
three spacing densities, and with reduced-motion both ways. The hero census is **every one of the
972 probes in the bank re-measured at ten widths**, not a sample. The battery teeth-test ran a
**control + two planted product mutants**, and then the battery's own analyser was re-run with
**one record added and not one character of the analyser changed**.
Harnesses and shots: `_ia/w1-r3-shots/` (`h1-mechanical.cjs` … `h7-verdicts.cjs`).

## VERDICT: **BLOCKING**

Nine of my eleven in-scope items are genuinely closed, and four of them are closed better than the
addendum claims. All five of my round-2 defects that had a mechanical fix — **F1** (room controls
dead below 1280), **F2** (badge overprint), **F4** (LIBRARY tab), **F5** (the disc), **F6** (the
walk-resume hero) — are closed on the live page, re-measured, with the differentials that convicted
them now reading clean. The new `test/home_claims.cjs` is **not vacuous**: it passes 72/72 on the
clean tree and goes red on both product mutants I planted, including round 2's own `thin:null`
mechanism restored verbatim.

But the round's thesis is that a class was closed, and **the class is not closed.**

**F3 is still alive.** On a record one probe short of perfect the gauge prints *"Every rail is
full. Solid on all 971 probes across all three tiers — there is no thin rail left to name"*
directly under a Staff rail rendering **309 / 310 · 100%** and a panel header reading **971 SOLID
OF 972**. That is the same sentence, on the same element, contradicted by the same numerals, for
the third consecutive round. I did not have to argue it: I added **one record** to the wave's own
class-killer, changed nothing else, and the check the wave built to prove this class dead
**FAILED on the shipped deliverable** — `claims every rail is full while the rails render 970
solid of 971`.

And item 8's fix was never wired. The census "sheds by priority" through a documented three-rung
ladder whose **middle two rungs are dead selectors** — `#st-2` and `#st-3` match **zero elements in
the deliverable**. At 430 CSS px (an iPhone 15/16 Pro Max) on an ordinary mid-use record the bar
still cuts itself mid-word: *"…20 of 46 topic"*.

Two of eleven claimed closures are false, both on the wave's own headline mechanism, and both are
provable by the wave's own new instruments with a one-line change to their **inputs** — the
analysers are right, the records they are fed are not.

---

# PART 1 — THE ELEVEN ROUND-3 ITEMS, RE-MEASURED

## Item 1 / §B — the gauge: record class → exact sentence → **NOT CLOSED** (my F3)

`Altitude.compute()` returning a SHAPE instead of a nullable name is the right correction, and
**four of the five classes are now provably right.** Driven live at 1280×900, every figure read off
the rendered page:

| record | rails as rendered | sentence |
|---|---|---|
| cold | `0/310 · 0%` · `0/359 · 0%` · `0/302 · 0%` | "Nothing graded yet. Each rail is one interview tier…" — no verdict ✓ |
| Staff only | `310/310 · 100%` · `0/359 · 0%` · `0/302 · 0%` | "**SDE3 and SDE2 are the thin rails.** Both sit at 0% solid — SDE3 0 of 359, SDE2 0 of 302 — under a rail that is further along." ✓ |
| SDE2 only | `0/310 · 0%` · `0/359 · 0%` · `302/302 · 100%` | "**Staff and SDE3 are the thin rails.** …Staff 0 of 310, SDE3 0 of 359…" ✓ — mirrored correctly |
| near-level | `177/310 · 57%` · `201/359 · 56%` · `174/302 · 58%` | "**SDE3 is the thin rail.** 201 solid of 359 probes, across 46 of 46 topics…" ✓ |
| one thin | `104/310 · 34%` · `359/359 · 100%` · `302/302 · 100%` | "**Staff is the thin rail.** 104 solid of 310 probes…" ✓ |
| **hairline** | `186/310 · 60%` · `324/359 · 90%` · `182/302 · 60%` | "**Staff and SDE2 are the thin rails.** Both sit at 60% solid — Staff 186 of 310, SDE2 182 of 302…" ✓ |
| perfect | `310/310` · `359/359` · `302/302` | "Every rail is full. Solid on all **971** probes…" ✓ — the EXTEND tier is correctly excluded |

The hairline row is the one I charged as the milder half of F3 in round 2 (SDE3 named thin on a
0.046-point difference). It is gone: the two rails at the same *rendered* percentage are now named
together, each quoting its own figures, and the `[THIN]` rail mark is withheld. Round 2's
`thin:null` → "the rails are level" inversion is gone in both directions. `perfect` quotes 971 and
not the bank's 972.

**The fifth class is still false, and it is the same sentence.**

```
altitude.js:122     var full = shares.length > 0 && min === 100;
```

`min` is `Math.round(solid / n * 100)`. **Rendered precision decides whether the board is full; an
exact count is then asserted about it.** Every rail whose share is ≥ 99.5% renders "100%", so:

| record | rails as rendered | header | the sentence |
|---|---|---|---|
| **ONE probe of 971 graded Shaky** | `309/310 · 100%` · `359/359 · 100%` · `302/302 · 100%` | `971 SOLID OF 972` | **"Every rail is full. Solid on all 971 probes across all three tiers — there is no thin rail left to name."** |
| one ungraded per tier | `309/310 · 100%` · `358/359 · 100%` · `301/302 · 100%` | `969 SOLID OF 972` | **identical sentence** |

`_ia/w1-r3-shots/gauge-one-short.png` is the first row: **309 / 310 · 100%** sits 6px above a
sentence that says all 971 are solid and that there is no thin rail left to name. Staff *is* the
thin rail. The first Staff segment carries the FLAGGED treatment, so the picture disagrees too.
Identical at 1280 and 390.

**The code contradicts its own documented contract, written twenty lines from the consumer.**
`home-view.js:359-361` states the rule verbatim:

> `full` … "Every rail is full" — the only sentence that may claim all three, **and only on
> `totals.solid === n`**

`altitude.js:122` implements `min === 100`. `altitude.js:119` then documents the *other* rule
("`full` is a property of the RAILS (every rendered rail at 100%)"). Two comments, two rules, one
implementation, and the implementation follows the weaker one — which is exactly the seam the class
rule exists to close: a comparison at rendered precision may only license a claim at rendered
precision.

**Band:** Staff 310 → 100% from 309; SDE3 359 → from 358; SDE2 302 → from 301. So the false
sentence fires on **any record with 968–970 of the 971 ladder probes solid**. It is late-game — I
say that plainly, it is narrower than round 2's F3, which fired the moment a user banked their
first Staff probe. But it is the state in which the instrument is at its most actionable (the
answer is "one probe"), and it is the state in which the reader is most able to check the claim,
because they know exactly how many they have left. The wave charged itself for a **one-probe-wide**
error in this same clause (972 vs 971) and called it "the same class, one probe wide". This is the
same clause, up to three probes wide, in the other direction.

**Fix:** `full` must be exact — `ladder.solid === ladder.n` — which is what the consumer's own
comment already specifies. `level`/`thin` may keep rendered precision; they only ever quote the
rendered number. Add the record to `home_claims` (§PART 2 shows it already fails there).

## Item 2 — the hero is never truncated → **CLOSED**, and measured harder than claimed

Census of **all 972 probes in the bank**, each set into the live `.hm-q` and measured against its
own clamp, at ten widths (the addendum's eight plus 900 and 419):

| width | 1440 | 1280 | 1024 | 900 | 860 | 430 | 419 | 390 | 360 | 320 |
|---|---|---|---|---|---|---|---|---|---|---|
| clipped | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| worst overflow | 0px | 0px | 0px | 0px | 0px | 0px | 0px | 0px | 0px | 0px |
| display step | 21px/6 | 21px/6 | 21px/6 | 21px/6 | 18px/7 | 18px/7 | 18px/9 | 18px/9 | 18px/9 | 18px/9 |

`0 of 972` at every width, including the two the addendum did not name. The 860 and 419 step-downs
land on the right side of their own breakpoints. The fix is by fitting, not by hiding, and the
clamp is still a real bound for a future bank.

## Item 3 — the outline heroes what the pixels hero → **CLOSED**

Exactly one rendered `h1` on every record I drove, and it is the question. The document outline at
1280 on a drill-resume record:

```
H1  "How do you get ordering in an event-driven system?"
H2  Altitude — solid probes by interview tier
H2  Still shaky
H2  Recent sessions
H2  Coverage by room
```

`aria-labelledby="hm-ask-h"` names the panel by the question. The no-bank fallback keeps the count
at one by construction. Navigate by headings and the answer to "what is this page about" is now an
interview question, not a table of contents.

## Item 4 — position honesty → **CLOSED** (my F6)

Three records, driven at 1280, every string read off the page:

| record | eyebrow | hero | the line | Resume opens |
|---|---|---|---|---|
| `{drill:10, walk:4}`, resume=**walk** | "**Up next** · Event-Driven Backbone" | the first ungraded probe | "…stopped at **step 5 of 10**. **15 of its 21 probes** still ungraded." | Walkthrough |
| `{drill:10}` only, resume=**walk** | "**Up next** · …" | the first ungraded probe | "You marked 3 probes shaky in this topic earlier today, **and stopped.**" — *no position asserted* | Walkthrough |
| `{drill:10}`, resume=**drill** | "**Where you stopped** · …" | probe 11 | "…stopped at **probe 11 of 21**. **15** still ungraded." | Probe Drill |

Row 1 is F6 exactly, and it is answered on both halves: the hero no longer claims to be where you
stopped when Enter goes somewhere else, and the remainder keeps its denominator the moment the
position is denominated in steps. Row 2 is round 2's fabricated "step 1 of 9" — the field is the
gate now, and an absent field yields silence rather than a zero. Row 3 keeps the bare remainder,
correctly, because the position already stated that denominator. `firstUngraded()` is reachable and
is what rows 1 and 2 hero.

## Item 5 — the room controls work again → **CLOSED** (my F1, the round-2 headline)

Driven at eight widths on a seeded record. Click the third **visible** `[data-room]`, then measure
whether the room's `.ix-group` is actually on screen — not merely whether the page moved:

| viewport | where the control lives | scroll trace | room top after | in view | focus |
|---|---|---|---|---|---|
| 1280×800 | rail + companion | 0 → 90 | **90** | **yes** | `.ix-card` in that room |
| 1024×800 | rail + column | 0 → 1970 → 2577 → **2639** | **0** | **yes** | `.ix-card` in that room |
| 900×800 | column | 0 → 1857 → 2490 → **2555** | **0** | **yes** | `.ix-card` in that room |
| 390×844 | column | 0 → 2357 → 3946 → 4340 → **4379** | **0** | **yes** | `.ix-card` in that room |

Identical under `prefers-reduced-motion: reduce` (instant, same landing y). Second activation from
a cold scroll position lands equally (1024 → 3763, 900 → 3568, 390 → 6602). The **1–6 hotkeys**
route through the same function and move the page at every width (1279 → 2477, 1024 → 3096, 900 →
2891, 700 → 3341, 420 → 4751, 390 → 4810, 360 → 4936). Round 2's `scrollY 0, focus unmoved` at
900/420/390 does not reproduce anywhere. The `offsetParent` preference plus opening the host drawer
is the correct resolution and it holds at the 1279/1280 boundary in both directions.

**One honest note against my own first measurement.** My initial pass clicked a room row within
milliseconds of `#home .hm-continue` appearing and recorded no scroll. It reproduces at that
timing and does not reproduce at +400ms. That is a harness artefact — the click landed before first
layout settled — and I am recording it rather than charging it, because a human cannot click a
control they have not yet seen painted. The mechanism is real but it is mine, not the product's.

## Item 6 — the LIBRARY tab delivers the library → **CLOSED**

At 390×844 on a seeded record, tapping LIBRARY: `details.open = true`, `scrollY 0 → 2187`, summary
top = **69px** — exactly `--chrome-top` (57) plus the authored 12px gap, i.e. flush under the fixed
rail — and `aria-current="lib"`. Round 2's "summary parked at 436 of an 844 viewport with the
document out of scroll" is gone. Same at 360 and 419.

**Recorded, not charged:** a tap dispatched inside the first ~300ms after the home renders opens
the drawer and does not scroll (`scrollY 165`, summary top 2091, and the observer then marks
`alt`); from 300ms on it is correct at every delay I tried (300 / 600 / 900 / 1200). The mechanism
is visible in the source — `scrollToRoom` reads `node.offsetParent` and therefore flushes layout
before it scrolls, while `onTab` sets `node.open = true` and calls `scrollIntoView` in the same
task with no flush. A one-line `void node.offsetHeight` between them would make the two paths
identical. I am not charging it: 300ms after a fully-loaded, fonts-ready paint is at the edge of
human reach, and I could not produce it with any plausible human cadence.

## Item 7 — the badge never overprints a title → **CLOSED**, and extended

Measured by **text ink** (Range rects of the badge's text nodes against the title's text nodes,
not box-against-box), every `.ix-card` in both the companion mount and the in-column drawer, plus
the Topic-index overlay which shares `topicCard()`:

| surface | width | cards | badge string | **ink overlaps** |
|---|---|---|---|---|
| home, all topics drilled + recalled | 1280 / 1440 / 1024 / 390 | 46 | `recalled` | **0** |
| Topic index overlay (`\`) | 1280 / 1440 / 1024 / 390 | 92 | `recalled` | **0** |
| home, drilled only | 1280 → 390 | 46 | `done` | **0** |

Round 2's 28-of-46 and its 88px worst case are gone, and the overlay — which I credited in round 1
as the phone's fallback and then watched the round-2 fix damage — is clean at 92 cards.

I extended this past the brief because the reserve is a **space** token and the badge is **type**,
and the app ships a `D` key that rescales every space token without touching type. All three
densities measured:

| density | `--space-92` reserve | badge width | badge right offset | slack | ink overlaps |
|---|---|---|---|---|---|
| default | 92px | 46px | 37px | **+9px** | 0 / 46 |
| compact | 75px | 44px | 31px | **0px** | 0 / 46 |
| cozy | ~106px | 48px | 42px | +16px | 0 / 46 |

Compact clears by exactly zero. It clears — I am not charging a measurement that reads 0 — but the
reserve and the thing it reserves for are denominated in different units, and the margin at one of
the three shipped densities is nothing. Worth a note in the fix, not a bounce.

## Item 8 — the census sheds by priority instead of clipping itself → **NOT CLOSED**

The stylesheet states the ladder (`styles.css:2429-2441`):

> Priority, lowest first: the offline note, then topics-started, then the solid/shaky/missed
> breakdown. The probes-graded figure never leaves.

```css
@media(max-width:1023px){ .hm-status .hm-st-dim{display:none} }     /* live   */
@media(max-width:759px){  #st-3,#st-3 + .hm-st-sep{display:none} }  /* DEAD   */
@media(max-width:559px){  #st-2,#st-2 + .hm-st-sep{display:none} }  /* DEAD   */
@media(max-width:519px){  .hm-status > .hm-st-i:first-child{display:none} }  /* live */
```

`statusHtml()` (`home-view.js:224-236`) emits six bare `<span class="hm-st-i">` / `hm-st-sep`
children. **It assigns no ids at all.** `grep -rn 'st-2\|st-3' src/` returns nothing;
`grep -c 'id="st-2"\|id="st-3"' dist/index.html` returns **0**. The two middle rungs of the
priority ladder select nothing, so the census still clips.

Measured on an **ordinary mid-use record** — 240 of 972 probes graded, 20 of 46 topics started, a
user a few weeks in — with per-child geometry against the bar's own border box:

| viewport | what is cut | reader sees |
|---|---|---|
| 419px | *(census correctly hidden)* | — |
| **420px** | "20 of 46 topics started" loses **51px of 112px** | `240 of 972 probes graded · 80 solid · 80 shaky · 80 missed · 20 of 46 t` |
| **428px** | loses **43px** | cut mid-word |
| **430px** | loses **41px** | `…20 of 46 topic` |
| **440px** | loses **31px** | cut mid-word |
| **460px** | loses **11px** | cut mid-word |
| 480px | 3px spacer only | fits |
| 500px | — | fits |
| **520px** | "20 of 46 topics started" loses **3px** | the `Record` eyebrow returns above 519 and pushes it back out |
| 560px | — | fits |

`_ia/w1-r3-shots/census-430.png` is the paint: **"…20 of 46 topic"**, cut mid-word, no ellipsis, no
wrap, no scroll. 430 CSS px is an iPhone 15/16 Pro Max; 428 is a 12/13/14 Pro Max. On a heavier
record (972 graded) the band widens and 500 and 559 clip too (18px and 11px).

The claim that "the widened check found a residual 13px at 500 that this fix then closed" does not
survive either: `home_reflow` samples 320 / 390 / 500 / 700 / 900, the census is `display:none`
below 420, and **the only sampled width where the census renders and could clip is 500 — which is
one of the two widths in the whole 420-560 band that happens to fit.** The check was widened for
this bar and still does not sample the band where the bar breaks. §PART 2 shows what happens when
it is fed a record instead of a fresh install.

The first rung is live and the last figure does survive — that half of the claim is true.

## Item 9 — the disc tracks the measurement again → **CLOSED** (my F5)

At 390×844, scrolled, with the census feeding `--chrome-bot` through `chrome-metrics.js`:

| | `--chrome-bot` | disc bottom | tab-bar top | gap |
|---|---|---|---|---|
| no safe-area inset | 45px | 789 | 799 | **+10** |
| 34px inset injected on `#hometabs` | **79px** | 755 | 765 | **+10** |
| 1280 (census is the bottom chrome) | 30px | 746 | 771 | **+25** |

The disc moved **−34px, exactly the −34px the bar moved.** Round 2's −25px (the disc sitting inside
the tab bar it was dodging) is gone, and the desktop overlap the round-2 constant was written for
has not come back. The measurement composes now instead of being overridden — the specificity
inversion is genuinely repaired, not papered.

## Item 10 — the tab bar tells the truth → **PARTLY**; one named defect

`aria-current` does now follow the scroll, and it is right at the ends: at scrollY 2400 it reads
`lib` while the library fills the screen, which is the failure round 2 charged. `scroll-margin-top`
is `69px` on all three destinations and a tab lands its target flush under the 57px rail rather
than beneath it — item 10's second half is clean and I confirmed it directly (summary top = 69
after a LIBRARY tap).

But the observer's band is the middle 10% of the viewport (`rootMargin: -45% 0px -45%`) and `live`
is the first *intersecting* target, with `if (!live) return` holding the previous mark otherwise.
Measured at 390×844 on a seeded record:

| scrollY | tab marked | what actually owns the viewport middle |
|---|---|---|
| **0** | **alt** | `.hm-alt` |
| 400 | alt | *(no tabbed block)* |
| 900 | alt | *(no tabbed block)* |
| 1600 | alt | *(no tabbed block)* |
| 2400 | lib | *(no tabbed block)* |

Two consequences. First, **the Today tab is never current at 390×844** — not even at scrollY 0,
where the hero, the resume sentence and the autofocused Resume button own the screen and the bar's
own first-paint markup says `aria-current="true"` on Today. The mark flips to Altitude with no user
action, and it is announced. Second, the mark is **sticky across ~1500px** of Still-shaky, Recent
sessions, Coverage by room and Practice, so for most of the page's length the bar reports Altitude
for the same reason it used to report Today: nothing in the band, so nothing changes it. This is
milder than what it replaced — it is right at both ends now — but "marks whichever target owns the
viewport" is true for three of the page's seven blocks. **Nearest-preceding-destination**, rather
than "first intersecting the middle 10%", would make all five rows above read correctly.

## Item 11 — the autofocus ring → **CLOSED as designed**, and the mechanism opens a new hole

The decision is implemented exactly as stated, and it is measurable rather than asserted:

| | focused | `:focus-visible` | box-shadow | outline |
|---|---|---|---|---|
| at rest, zero interaction | `.hm-cta` ✓ | true | **none** | **none** |
| after one bare modifier keydown (focus does not move) | `.hm-cta` ✓ | true | `…0 0 0 3px` ring | `solid 3px` |

Enter still lands the route with one keystroke and no click, so Z1's hard floor is intact; the ring
is quiet only until the user touches a key, and it re-arms without focus having to move. The
`focus_ring` arm that now presses a key first is a fairer reading of its own question, and the
gate capture shows it at 14 assertions.

**But the suppressor is re-applied on every `render()`, and `render()` is the rerender callback.**
See **G3** below.

---

# PART 2 — THE BATTERY IS NOT VACUOUS, AND IT IS NOT SUFFICIENT

## The teeth-test: it has teeth

Three runs against mirrors of the deliverable in scratch (originals untouched, tree still clean):

| mirror | one-token change to the product | `home_claims.cjs` |
|---|---|---|
| **clean** | — | **PASS** — 72 assertions, 9 records × 2 viewports, 4 planted mutants detected |
| **mutant A** | `model.ladder.n` → `model.totals.n` in the "full" sentence — round 3's *own* first catch, replanted | **FAIL (2)** — `[1280/perfect] claims all 972 probes while the rails total 971` |
| **mutant B** | `level = (min === max)` → `level = (thinSet.length > 1)` — **round 2's F3 mechanism verbatim** | **FAIL (8)** — `[1280/staffOnly] claims the rails are level while they render 100% / 0% / 0%` |

Mutant B is the exact defect I charged as BLOCKING in round 2, restored into the build. The check
catches it on four records at both viewports and names it by quoting the page's own numerals. The
self-test abort fires on its own four mutants every run. This is a real instrument with a
demonstrated negative control, and it is the right shape: it fails on the class and stays quiet on
wording.

## What it cannot see, and the one-record proof

I copied `home_claims.cjs`, added **one record** — one probe of 971 graded Shaky instead of Solid —
and changed **nothing else**: not `READ`, not `judgeVerdict`, not `judgePosition`, not `judgeHero`.
Against the **shipped, unmodified** deliverable:

```
FAIL  [1280/oneShort] the verdict agrees with the numbers beside it
      -- claims every rail is full while the rails render 970 solid of 971
FAIL  [390/oneShort]  the verdict agrees with the numbers beside it
      -- claims every rail is full while the rails render 970 solid of 971
HOME CLAIMS: FAIL (2)
```

The analyser was right the whole time. The nine records are the nine defects three judges already
found — which is exactly the trap the file's own header describes ("The judges kept finding defects
on seeds the builder had not run; this is that list, run"). A list built from what has already been
found cannot cover what has not been. The missing record is the boundary of the check's own
comparison rule: **the band where `Math.round` and equality disagree.** Nine records, and not one
of them sits between 99.5% and 100%.

Same experiment on the other new check. I copied `home_reflow.cjs` and added the same seeded record
before the home renders — analyser byte-untouched:

```
FAIL  [500/light] the status census fits the bar it is painted in -- 18px of content clipped inside a 500px bar
FAIL  [500/dark]  the status census fits the bar it is painted in -- 18px of content clipped inside a 500px bar
HOME REFLOW: FAIL (2)
```

`home_reflow` drives a **fresh install** — every figure on the census is a single `0`, which is the
narrowest the bar will ever be. The check was widened from {320, 390} to {320, 390, 500, 700, 900}
precisely because "a check has to be sampled where the thing it guards is alive." It is now sampled
at the right widths and driven on the one record where the thing it guards cannot fail.

**Both new checks are correct instruments pointed at insufficient inputs.** That is a much better
place to be than round 2 — but it means the gate's 76/76 does not yet mean what §E claims it means.

## Gate and VR, verified rather than accepted

- `_audit/2026-07-31-appeal-home-gate.txt`: **76 PASS lines, `GATE: PASS`** ✓
- registration delta `1c533d7 → f08c4ac` on `test/check_all.py`: exactly `+('home_reflow', …)` and
  `+('home_claims', …)`. **No removals, no skips, no weakenings** ✓
- `git diff --stat 1c533d7 HEAD -- test/baselines/`: exactly **3 files** — `home-light`, `home-dark`,
  `manifest.json`. The other 14 baselines are byte-identical ✓
- `home_reflow` and `home_claims` re-run by me on the deliverable: both PASS as committed ✓
- `focus_ring` at 14 assertions, `room_browser` and `home_rhythm` present and passing ✓

---

# PART 3 — FRESH DEFECTS

## G1 — **BLOCKING.** The gauge still prints "Every rail is full" over rails that are not

Charged in full in Item 1 above. Summary of the evidence:

- `altitude.js:122` `full = (min === 100)` where `min` is a **rounded** percentage; the sentence it
  licenses asserts an **exact** count and an absolute ("there is no thin rail left to name").
- Reproduced live on two constructed records at 1280 and 390; paint at
  `_ia/w1-r3-shots/gauge-one-short.png` — `309 / 310 · 100%` above "Solid on all 971 probes",
  under a header reading `971 SOLID OF 972`.
- The wave's own class-killer, analyser untouched, **fails on the shipped build** with one record
  added.
- The correct condition is already written down, in the consumer, at `home-view.js:361`:
  *"only on `totals.solid === n`"*.

**Fix:** `var full = ladder.n > 0 && ladder.solid === ladder.n;`, and add `oneShort` to `SEEDS`.

## G2 — **FIXABLE (strong).** The census priority ladder has two dead rungs

Charged in full in Item 8. `#st-2` and `#st-3` match zero elements; `statusHtml()` emits no ids.
Mid-word clipping of "N of 46 topics started" at 420 / 428 / 430 / 440 / 460 on an ordinary record,
and again at ~520 where the eyebrow returns. Paint at `_ia/w1-r3-shots/census-430.png`.

**Fix:** emit the ids the stylesheet already names (`id="st-2"` on the solid/shaky/missed span,
`id="st-3"` on topics-started), or replace the id rules with `nth-child` — and seed a record in
`home_reflow` so the arm can fail. Note the two live rungs' thresholds also want re-checking once
the middle two fire: the 519 eyebrow rule currently re-introduces a clip at 520.

## G3 — **FIXABLE.** A reset from the library moves keyboard focus and hides the ring on arrival

`home-view.js:560-568` re-adds `hm-quiet-focus` and re-focuses `[data-autofocus]` on **every**
`render()`, and `render()` is the `rerender` callback handed to `Panels.bind`
(`home-view.js:578`). `panels.js:500-509` calls `rerender()` on the per-topic reset — the `↺` that
sits on every touched topic card, on the shelf, at every width — and again from its Undo.

Driven from the keyboard: Tab to arm the ring, focus the `↺` on a topic card, press Enter.

| viewport | focus before | focus after | on screen? | `hm-quiet-focus` | ring |
|---|---|---|---|---|---|
| 1280×800 | "Reset progress for Event-Driven Backbone" | `.hm-cta` (Resume) | yes | **re-applied** | shadow `none`, outline `none` |
| 390×844 | same, at y 2485 | `.hm-cta` (Resume) | **no** | **re-applied** | shadow `none`, outline `none` |

The suppressor is scoped to exactly one selector —
`#home.hm-quiet-focus .hm-cta[data-autofocus]:focus-visible{outline:none;box-shadow:none}` — which
is precisely the element focus is thrown to. So a keyboard user acts on the shelf and lands, with
no visible indicator, on a control in a different region; at 390 that control is off screen. It
stays invisible until they press another key. WCAG 2.4.7 Focus Visible, and 2.4.3 on the order.

This is a round-3 introduction: before item 11 the ring was visible, and the design call's own
premise ("a keyboard user re-arms it with their first Tab, **before they could need it**") assumes
the class is applied once, at first paint, with zero interaction — which is the only moment its
justification covers.

**Fix:** apply `hm-quiet-focus` and the autofocus only on the **first** render of the route (a
module flag), or skip both when `document.activeElement` is already inside the home. Either keeps
the at-rest quiet screen the ruling asked for and stops it firing after a user action.

## G4 — **FIXABLE (minor).** The Today tab is never current at 390×844

Charged in Item 10. The bar's first-paint markup says Today; the observer flips it to Altitude at
scrollY 0 with no user action and holds Altitude through ~1500px of untabbed page. It is
announced. Nearest-preceding-destination instead of first-in-band closes it.

---

## Also observed, not charged

- **Compact density leaves the badge exactly 0px of slack** (reserve 75px, badge occupies 75px).
  It clears; it clears by nothing, and the reserve is a space token while the badge is type.
- **The `[THIN]` rail mark is withheld whenever two rails share the minimum** — the sentence names
  both, the picture marks neither. Defensible (marking two rails "thin" would be noisier than the
  sentence), and it is consistent across `staffOnly` / `sde2Only` / `hairline`. Recording it because
  it is the one place the sentence and the drawing carry different amounts of the finding.
- **The 420–919px band still has no room nav in the rail and no Topic-index affordance beyond `\`.**
  Unchanged, correctly named by the addendum as uncharged, and F1's closure means the column's six
  room cards now work there — so the band is materially better than in round 2.
- **"7 of 5 topics drilled this week · Goal met"** — unchanged from rounds 1 and 2. Still not this
  wave's to price.
- **92 topic-card buttons in the document at all times.** Unchanged. Not a conformance defect.

## Confidence and limits

High confidence on **G1** (two constructed records, both form factors, paint-level evidence, and
the wave's own check failing on the unmodified deliverable with one record added) and on **G2**
(per-child geometry at eleven widths on an ordinary record, paint-level evidence, the dead
selectors confirmed absent from the deliverable, and `home_reflow` failing on a seeded record).
High confidence on **G3** — reproduced from the keyboard at both form factors, with the suppressing
rule read directly and the call chain traced through `panels.js`. **G4** is proven as a fact and
argued as a defect; a reasonable judge could leave it uncharged, as I nearly did.

The closures I credit are each measured, not read off the addendum: item 2 is a full 972-probe
census rather than a sample, item 5 is measured as *"is the room on screen"* rather than *"did the
page move"*, item 7 is text-ink rather than boxes and covers all three densities, item 9 is a
differential against an injected inset.

**Not covered.** No real device (the 34px safe-area inset is injected, as it was in round 2). No
screen-reader pass — G4's "it is announced" is read from `aria-current` in the tree, not heard.
I did not verify any topic route, did not re-run the full gate (I ran `home_claims`, `home_reflow`
and read the committed capture), and drove dark theme only on the census and the badge. The hero
census sets text into the live element rather than rendering 972 separate resume records — a fair
proxy for the clamp, not a proof about `text-wrap:balance` under every possible sibling. This
judgment is the `#home` route.

*Judge: map-conformance lens, W1 round 3 of the appeal campaign, 2026-08-01. Harnesses, mirrors and
shots: `_ia/w1-r3-shots/`.*
