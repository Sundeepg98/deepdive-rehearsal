<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (direction-fidelity lens, round 3), 2026-08-01, against appeal/home-instrument @ f08c4ac.
     Preserved unedited as the record round 4 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-4 addendum). -->

# W1 ROUND-3 JUDGE — DIRECTION FIDELITY

**Subject:** the home of Deep Rehearsal, `appeal/home-instrument` @ `f08c4ac`
("the home says only what the record can support"),
worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`.
Built deliverable md5 `b10b1304f195b8d53f031e53c3569e59`, byte-identical to `dist/index.html`.
**Bounce list judged against:** the ROUND-3 ADDENDUM in `_audit/2026-07-31-appeal-home-freeze.md` (line 300+).
**My round-2 record:** `_ia/w1-r2-judge-direction-fidelity.md` (F1–F7).
**One lens only:** does the built thing read as THE INSTRUMENT, is there exactly ONE signature, is the
question-as-hero a correction rather than a monument, is the hygiene silent — and, this round, does the
home say only what the record can support.

Everything below was re-measured on the built deliverable under Playwright. Nothing is taken from the
addendum. Controls were run on `074eca4` (round 2) and `1c533d7` (master) on identical records, so
"this wave fixed it" and "this wave broke it" are both measurements rather than inferences.

---

## VERDICT: FIXABLE — six of seven of mine closed, one re-opens, and the class-killer kills one class in four

**The wave did the hardest thing it was asked to do.** F1 — the must-fix, the signature printing a
provable falsehood — is genuinely dead, and not by patching the one record I shot: `Altitude.compute()`
returns the record's SHAPE and `verdictFor` enumerates five classes, so I drove nine record classes and
every sentence was true against the rails beneath it. The 971-vs-972 catch in the addendum is real and
the verdict now quotes the ladder. F6 came back better than asked (0 of 972 clipped at **23** widths,
not the 8 claimed). F7 is closed against a live inset control that reproduces round 2's failure exactly.
F3 and F4/F5 are closed on the engaged path and on every ordinary record variant.

**Two things stop this being clean.**

**F2 did not close.** The census still truncates itself mid-word — **420–492px (worst +73px)** and
**520–544px** — because two of the four rungs of the new priority ladder are selectors that match
nothing: `#st-3` and `#st-2` appear **zero** times in `src/` and zero times in the built deliverable.
And `home_reflow`'s widened width list misses both bands: 320/390 the bar is `display:none`, 500 fits
with **6.8px** to spare against a band that ends at 492. The check passes an arm literally named *"the
status census fits the bar it is painted in"* while it does not. Third round, same shape.

**And the class-killer kills one class in four.** I planted each of the four round-2 defects back into
a scratch mirror of the real build and ran `test/home_claims.cjs` against it. The gauge defect: caught,
8 failures, exit 1. The position defect, the hero-clip defect and the outline defect: **exit 0, green,
every time.** The battery is not vacuous — but it is load-bearing for one of the three things this
wave is about, and the freeze presents it as the answer to all of them.

---

## THE THREE QUESTIONS, ANSWERED FIRST

**Does it read as THE INSTRUMENT? — Yes.** Unchanged from round 2 and undamaged by round 3's work. The
gauge is still the only signature and it now wins on contrast as well as density: at first paint the
loudest drawn edge on the screen is the gauge segment border at **14.72:1** light / **13.99:1** dark,
against the CTA's resting border at 6.39:1 / 6.91:1.

**Is there exactly ONE signature? — Yes, and round 3 gave it back its edge.** This is the real win of
item 11. Round 2's autofocus painted a 14.72:1 ring on an accessory with zero user interaction; at rest
that ring is now `outline:none; box-shadow:none` in both themes, verified live, and it re-arms to
`solid 3px` on the first keystroke.

**Is the question-as-hero a correction rather than a monument? — Yes, and now in the document too.**
`.hm-q` is an `<h1>` at 21px carrying the question; the eyebrow is a `<p>`; the panel's accessible name
is the question. Exactly one visible h1. My F3 is closed as written — **on the engaged path** (see D4).

**Is the hygiene silent? — No, and it is the same object as last round.** The census bar still cuts
itself off mid-word with nothing indicating it happened.

---

# PART 1 — THE ROUND-3 ITEMS IN MY SCOPE, RE-MEASURED

## §B / item 1 — the gauge (my F1, the must-fix): **CLOSED**

Nine record classes driven at 1280, each sentence read against the numerals rendered beneath it.

| record | rails | verdict | true? |
|---|---|---|---|
| cold | 0/310 0% · 0/359 0% · 0/302 0% | "Nothing graded yet…" — no verdict, explains the instrument | ✓ |
| one solid SDE2 | 0% · 0% · **0%** (1/302) | "The rails are level. All three tiers sit at 0% solid" | ✓ at the rendered precision |
| five solid SDE2 | 0% · 0% · 2% | "**Staff and SDE3** are the thin rails. Both sit at 0% — Staff 0 of 310, SDE3 0 of 359" | ✓ |
| **staff only** | **100%** · 0% · 0% | "**SDE3 and SDE2** are the thin rails. Both sit at 0% — SDE3 0 of 359, SDE2 0 of 302" | ✓ |
| sde2 only | 0% · 0% · 100% | "Staff and SDE3 are the thin rails…" | ✓ |
| staff+sde3 solid | 100% · 100% · 0% | "SDE2 is the thin rail. 0 solid of 302 probes, across 0 of 46 topics" | ✓ |
| mid-progress | 57% · 56% · 58% | "SDE3 is the thin rail. 201 solid of 359 probes" | ✓ |
| near-tie | 43% · 44% · 42% | "SDE2 is the thin rail" | ✓ |
| perfect | 100% · 100% · 100% | "Every rail is full. Solid on all **971** probes across all three tiers" | ✓ |

Row 4 is the record that printed *"Every rail is full. Solid on all 972 probes across all three tiers"*
over two empty rails in round 2. It now names both tied rails and quotes each rail's own figures.
The fifth class — the one round 2 never enumerated, where the falsehood lived — is enumerated and
correct in both directions. Receipt: `shots/gauge-staffonly.png`, `shots/gauge-perfect.png`.

The mechanism is right, not just the output: `compute()` returns `thinSet / level / full / minPct /
ladder`, comparison is at the rendered integer percent, `full` is a property of the RAILS (`min === 100`),
and `ladder.n` (971) is what the sentence quotes rather than the bank's 972.

## Item 2 — the hero is never truncated (my F6): **CLOSED, better than claimed**

The clamp has three bands (6 lines at ≥861, 7 at 420–860, 9 at ≤419). The addendum censused eight
widths; the two band edges — 861 and 420, each the narrowest width of its band and therefore its worst
case — were not among them. I drove **all 972 probes at 23 widths** including every band edge:

```
vw 1440..861   col 556.2  21px  clamp 6   CLIPPED 0/972      (the measure caps the column, not the viewport)
vw  860..600   col 476.7  18px  clamp 7   CLIPPED 0/972
vw  500        col 422.0  18px  clamp 7   CLIPPED 0/972
vw  421/420    col 343/342 18px clamp 7   CLIPPED 0/972      <- worst case of the middle band
vw  419..320   col 341..242 18px clamp 9  CLIPPED 0/972
```

**0 of 972 at every width.** The band edges are not worst cases in the top band because
`--measure-display` caps the column at 556.2px well before the viewport does. Closed.

## Item 3 — the outline heroes what the pixels hero (my F3): **CLOSED on the engaged path**

| | round 2 | round 3 |
|---|---|---|
| only visible h1 | 9px eyebrow, "Where you stopped · Caching Strategies" | **21px `.hm-q`, the question** |
| `.hm-q` element | `<p>`, in no heading list | **`<h1 id="hm-ask-h">`** |
| `.hm-continue` accessible name | the topic name | **the question** |
| h1 count | 1 | 1 |

The table-of-contents voice is out of the outline. (The cold path is a different story — D4.)

## Item 4 — position honesty (my F4 and F5): **CLOSED on every ordinary variant**

Ten record variants, same base progress, read off the live page:

| stored | resume pane | rendered |
|---|---|---|
| `{drill:10}` | drill | "Where you stopped" · "…stopped **at probe 11 of 21**. 15 still ungraded." |
| `{drill:10}` | **walk** | "Up next" · "…and **stopped.** 15 **of its 21 probes** still ungraded." |
| `{drill:10}` | sys | "Up next" · "…and stopped. 15 of its 21 probes still ungraded." |
| `{walk:4}` | walk | "Up next" · "…stopped **at step 5 of 10**. 15 **of its 21 probes** still ungraded." |
| `{walk:4}` | drill | "Up next" · "…and stopped." |
| `{drill:10, walk:4}` | walk | "…stopped at step 5 of 10. 15 of its 21 probes still ungraded." |
| `{sys:2}` / none / no nav | — | "…and stopped." |

Row 2 is round 2's fabrication (`"you stopped at step 1 of 9"` from a record storing no walk key) and it
is gone: the FIELD is the gate. Row 4 is F4(b) and the denominator is kept whenever the unit differs.
F5 is closed too — `firstUngraded()` is reachable, and the 'next' rows hero a probe that is not card 0.

## Item 8 — the census sheds by priority (my F2): **NOT CLOSED — see F-A**

## Item 9 — the disc tracks the measurement (my F7): **CLOSED, against a live control**

390×844 home, `env(safe-area-inset-bottom)` injected at a home-indicator device's 34px, app allowed to
re-measure through a resize:

| build | inset | `--chrome-bot` | disc `bottom` | tab-bar top | clearance |
|---|---|---|---|---|---|
| round 2 `074eca4` | 0 | 45px | 54px | 799 | +8.6 |
| round 2 `074eca4` | **34** | **79px** | **54px** (frozen) | 765 | **−25.0 — inside the bar** |
| round 3 `f08c4ac` | 0 | 45px | **69px** | 799 | **+23.4** |
| round 3 `f08c4ac` | **34** | **79px** | **103px** | 765 | **+24.0** |

Round 2's defect reproduced exactly; round 3's disc moves with the bar. I also checked the fix did not
leak: `styles.css:2422` `.scrolltop{…}` is unconditional and **not** scoped to `html[data-view="home"]`,
which looked like a re-run of the F7 specificity mistake — but measured against master on
`#caching/drill` at 1280/900/390 the disc is **identical** (`--chrome-bot` 0/71/71, bottom 24/95/95).
`stolen()` returns 0 for a `display:none` census, so topic routes are untouched. Not a defect.

## Item 11 — the autofocus ring: **DECIDED, DOCUMENTED, GUARDED — and the gauge has its edge back**

The three questions I was asked:

**Was it decided?** Yes, and against the right constraint. Z1's floor ("1 keystroke, 0 clicks,
autofocused") made removing the autofocus unavailable, so the decision quiets the ring rather than the
focus. Recorded at `home-view.js:548-566` and again in `focus_ring.cjs:337-348`.

**Is it documented?** Yes, with reasoning and the measured number that motivated it (14.72:1).

**Is the gauge once again the highest-contrast object at first paint?** **Yes — measured, both themes,
zero user interaction:**

| | light | dark |
|---|---|---|
| CTA outline / box-shadow at rest | **none / none** | **none / none** |
| CTA resting border | 6.39:1 | 6.91:1 |
| **gauge segment border** | **14.72:1** | **13.99:1** |
| after one keystroke, CTA outline | `solid 3px` @ 14.72:1 | re-armed |

The accessory is no longer the loudest edge on the screen; the instrument is. And the decision can fail
rather than being asserted — `focus_ring` gained an arm that the quiet state is genuinely quiet (14
assertions, PASS in both themes). One residual, F-E below.

## Gate and VR — as claimed

`GATE: PASS`; registration delta against `1c533d7` is `+home_reflow` and `+home_claims` and nothing
else; `visual_regression PASS (16 baselines)`. `home_claims` 72/72 with 4 mutants detected;
`home_reflow` PASS with 2 mutants; `focus_ring` 14 assertions. All re-run by me on the committed tree.

---

# PART 2 — THE BATTERY TEETH-TEST

The four planted mutants inside `home_claims.cjs` prove the **analyser** works: given bad DOM, the judge
functions flag it. They do not prove the battery would catch a bad **build** — whether the nine seeds
actually reach the defective code path. So I mirrored the real deliverable, planted each round-2 defect
back into it verbatim, and ran the shipped check against the mirror.

| # | planted defect (round-2 verbatim) | `home_claims.cjs` |
|---|---|---|
| 1 | `level = (thinSet.length > 1)` + `full` read from `shares[0]` — the F1 gauge defect | **FAIL, 8 assertions, exit 1** |
| 2 | `cursor()` gates on `posGet(id)` truthy, not on the field — F4(a)/F5 | **PASS, exit 0** |
| 3 | flat 4-line clamp, no responsive step-down — F6 | **PASS, exit 0** |
| 4 | eyebrow is the `h1`, question is a `<p>` — F3 | **PASS, exit 0** |

**Plant 1 — the battery has real teeth.** Its failure messages are my own round-2 finding in the check's
own voice: *"claims every rail is full while the rails render 310 solid of 971"*, on four records at both
viewports. This is a genuine end-to-end guard, and it is the answer to the class the freeze names first.

**Plant 2 — proven blind, with both builds side by side on the battery's OWN `absentField` seed:**

```
SHIPPED f08c4ac : "...and stopped. 15 of its 21 probes still ungraded."
PLANTED         : "...and stopped at step 1 of 10. 15 of its 21 probes still ungraded."
                   (record stores {"drill":10} and nothing else)
```
`judgePosition` compares the sentence to the rendered pane name and to the presence of a denominator.
A fabricated walk position is consistent with both. Nothing in the check reads the RECORD, and the walk
cursor has no numeral anywhere else on the page — so the battery's stated principle ("assert each
rendered claim against the numerals rendered beside it") is structurally unable to see it. The seed is
carried; its own comment names this exact defect; the arm cannot fail on it.

**Plant 3 — proven blind, and it is a sampling problem, not a logic one.** On the planted mirror **63 of
972** probes clip at 390 (exactly my round-2 F6 number). But the nine seeds between them render only
**five distinct heroes**, 30–67 characters, all short:

```
[*/empty]        "Walk me through how you would design this."        44 chars
[*/oneSolid]     "Why put a queue between two services...?"           67
[*/staffOnly]    "Export a 1,000,000-row CSV without OOM. How?"       46
[*/absentField]  "How do two independent services each consume...?"   62
[*/noRecord]     "What is change data capture?"                       30
```
None is anywhere near the clamp. The arm is satisfied by construction. The census that actually guards
item 2 lives in the addendum's prose; nothing in `test/` re-runs it.

**Plant 4 — proven blind by design.** The arm is `r.h1s.length === 1`. Reverting the tag swap leaves
exactly one visible h1 (the eyebrow), so it passes. The arm checks **cardinality, not identity**.

**Also collected and never asserted:** `READ` gathers `header` (`.hm-alt .hm-fig`) and `census`
(`.hm-status`) at lines 166–167 and no judge function reads either. The panel header the file's own
prologue quotes as evidence of the round-2 defect — *"its own header reading 310 SOLID OF 972"* — has no
arm. And `judgeVerdict` returns `null` when no pattern matches, so a verdict that is deleted, empty, or
reworded is green by default.

---

# PART 3 — FRESH DEFECTS

## F-A — MUST FIX. The census still clips, two of the four shedding rungs are dead selectors, and the widened check misses both bands

**The rungs.** `styles.css:2436-2441` implements the stated ladder — *"Priority, lowest first: the
offline note, then topics-started, then the solid/shaky/missed breakdown"*:

```css
@media(max-width:1023px){ .hm-status .hm-st-dim{display:none} }        /* wired   */
@media(max-width:759px) { #st-3,#st-3 + .hm-st-sep{display:none} }     /* DEAD    */
@media(max-width:559px) { #st-2,#st-2 + .hm-st-sep{display:none} }     /* DEAD    */
@media(max-width:519px) { .hm-status > .hm-st-i:first-child{display:none} }  /* wired */
```

The census markup (`home-view.js:227-235`) emits five `<span class="hm-st-i">` with **no id attributes
at all**. `grep -rn 'id="st-'` over `src/` returns nothing; `grep -c 'id="st-2"'` over the built
deliverable returns **0**, same for `st-3`. The two middle rungs match nothing at any width.

**The consequence, 1px sweep, engaged record, `.hm-status` visible:**

| band | worst overflow | segment cut |
|---|---|---|
| **420–492px** | **+73.3px** | "19 of 46 topics started" |
| **520–544px** | **+25.1px** | "19 of 46 topics started" |

Receipt `shots/census-clip-430.png` — the bar reads *"291 of 972 probes graded │ 213 solid · 51 shaky ·
27 missed │ 19 of 46 topi"*, cut mid-word, hairline running on to the right edge, no ellipsis, no
scroll (`overflow:hidden`). This is round-2 F2's receipt with a different segment in the casualty slot.

**And the check written for it still cannot see it:**

```
home_reflow.cjs samples: 320  390  500  700  900
  320 : the census bar is display:none   -- nothing to see
  390 : the census bar is display:none   -- nothing to see
  500 : fits, with 6.8px to spare        -- the band ends at 492
  700 : fits    900 : fits
```

`home_reflow` PASSES, including an arm named **"the status census fits the bar it is painted in"**. The
addendum says *"the widened check found a residual 13px at 500 that this fix then closed"* — the residual
was closed **at the sampled width**, and the 73px band eight pixels below it was never looked at. Round 1
this was `DISPLAY_TOKEN_RE`; round 2 it was a check whose only clipping instance was `display:none` at
both its widths; round 3 it is a check whose widths straddle the band by 8px.

**Direction cost.** Same as round 2's, one segment over: what the bar loses is the last countable that
isn't the headline figure, silently, on a bar whose whole job is to be the honest live state at the
frame's foot. **Fix:** give the two middle segments the ids the stylesheet already addresses (or move
those rules to `:nth-child`/class selectors), and sample `home_reflow` inside the bands rather than
around them — 430 and 530 would have caught both.

## F-B — The battery is presented as the class-killer and closes one of the four classes it names

Part 2 is the evidence. This is not a request to re-architect the check — plant 1 shows the design
works when the seed reaches the defect. It is three specific holes, each cheap:

- **position**: the seeds are authored by the check, so the check knows what each record stores. Assert
  the sentence against the seed's own position shape (`absentField` → must print no "stopped at";
  `mixedPosition` → must print "step 5 of 10").
- **hero**: the clip guard needs the corpus, not the nine seeds. The census that sized the clamp is
  already written — run it in the check at the band edges rather than quoting its result in prose.
- **outline**: assert the h1 **is** `.hm-q` when a hero renders, not that there is one h1.
- and assert the two fields already collected (`header`, `census`), plus fail on an unrecognised or
  empty verdict rather than returning `null`.

## F-C — An out-of-range drill cursor asserts "Where you stopped at probe 1 of N" and heroes a probe already graded

`cursor()` gates on `typeof p[view] === 'number'` — field presence. `posRestore` clamps an out-of-range
value to **0**, not to `n-1`:

```js
function posRestore(field, count, id) { … return (v >= 0 && v < count) ? v : 0; }
```

That is right for a pane restoring itself and wrong for a sentence claiming where you stopped — which is
the round-3 fix's own reasoning, applied to absence but not to validity. Measured, record storing
`{drill:24}` against a 21-probe bank (receipt `shots/cursor-out-of-range.png`):

> **WHERE YOU STOPPED · EVENT-DRIVEN BACKBONE**
> "What does an event-driven architecture mean?"
> You worked this topic earlier today, and stopped **at probe 1 of 21**. 13 still ungraded.

Card 0, and `CardId.level()` confirms it is **already graded on this record** — the exact outcome of my
round-2 F5, *"the screen heroes a question the record shows you already answered,"* through a different
door. Reachability is a bank that shrinks under a stored cursor, which is an ordinary content edit in a
repo whose banks run 21–24 and whose contract floor is 18. **Fix:** one comparison — treat an
out-of-range field as no field (`p[view] >= 0 && p[view] < n`), which also makes the hero fall through to
`firstUngraded()` where it belongs.

## F-D — The cold home still heroes a `<p>` under a 9px `h1`

`home-view.js:246`:

```js
'<div class="hm-ask"><h1 class="hm-lbl" id="hm-ask-h">Start here</h1>' +
'<p class="hm-q">&ldquo;Walk me through how you would design this.&rdquo;</p>' +
```

Measured on the cold home: only visible h1 is **9px "Start here"**; the 21px question is a `<p>` in no
heading list; the panel's accessible name is "Start here". This is my F3's structure surviving on the
path the fix did not touch — and it is the **first paint a new user ever gets**. It is milder than round
2's version (the h1 is an instruction, not a topic name, so the table-of-contents charge does not apply),
but the addendum's own rule for item 3 is "the outline heroes what the pixels hero," and here it does
not. The stated carve-out covers "a no-bank topic"; the cold start block is neither. **Fix:** the same
tag swap, four lines up.

## F-E — The ring re-arms "for the rest of the session" but is re-quieted on every render

`home-view.js:601` — *"the first real keystroke re-arms the focus ring for the rest of the session"* —
and `render()` unconditionally re-adds `hm-quiet-focus` before re-focusing. Measured on the daily loop:

```
first paint, zero interaction              focused=true  quiet=true
after Tab -- an established KEYBOARD user  focused=false quiet=false
Enter -> #caching/drill -> back to #home   focused=true  quiet=TRUE   <- ring quiet again
```

So a keyboard user who has been on the keyboard the whole session returns to the home with focus on the
CTA and no visible indication of where it is, every lap of the loop. The behaviour is defensible — each
return is a fresh programmatic focus — but it is not what the comment says, and `focus_ring`'s new arm
only tests first paint, so the gap cannot fail. Smallest of the six: either scope the re-quiet to the
first render of a session, or correct the sentence to say what it does.

## F-F — The gauge panel's header figure and its own rails disagree by one probe

On the perfect record, in one panel, three lines apart:

```
header  : 972 solid of 972            (model.totals -- the whole bank)
rails   : 310/310  359/359  302/302   (= 971, the ladder)
verdict : "Every rail is full. Solid on all 971 probes across all three tiers"
```

Both numbers are true and the addendum diagnosed exactly this ("972 in the bank against 971 on the
rails") — but it fixed the verdict and left the header, under a panel titled *"Altitude — solid probes
by interview tier"*. A reader who adds the three rails gets 971 twice and the header says 972, with
nothing on screen naming the EXTEND probe. Minor, and the least certain of the six — it is a seam
rather than a falsehood — but it is the same "two honest numbers, irreconcilable by a reader" shape I
charged in round-2 F4, and `home_claims` reads `.hm-fig` into `header` and never asserts on it.

---

## CHECKED AND CLEARED — do not re-litigate these

Each was a live hypothesis killed by a control.

1. **The unconditional `.scrolltop` rule does NOT leak to topic routes.** `styles.css:2422` is not
   scoped to the home and looked like round-2 F7's mistake repeating. Measured against master on
   `#caching/drill` at 1280/900/390: `--chrome-bot` 0/71/71 and disc `bottom` 24/95/95 on **both**
   builds, identical. `stolen()` returns 0 for a `display:none` census.
2. **It does not defeat the landscape tightening either.** `styles.css:2693`
   (`@media(max-width:919px) and (max-height:480px)`) is LATER in source order at equal specificity, so
   the tighter 14px gap still wins where it applies.
3. **The second h1 is hidden.** A quick probe showed `H1 21px "Content Pipeline"` beside the hero — it
   is the shell's own heading with `getClientRects().length === 0`, and the battery correctly filters to
   visible h1s. Not a defect; my first probe was wrong.
4. **"The rails are level. All three tiers sit at 0%" over a rail reading `1 / 302` is honest.** The
   rail renders 0% and the sentence says 0%. Comparison at the rendered precision is the documented rule
   and it is the right one.
5. **The "thin rails" plural sentence quotes each rail's own figures correctly** in both tie directions,
   verified independently. (`home_claims` does not check the percentage in that branch — a gap in the
   check, not in the page.)
6. **The 420–919px band still has no room nav or Topic-index affordance beyond `\`.** Unchanged,
   pre-existing, named by the map judge as uncharged. Not a round-3 regression.

---

## THE SHORT VERSION

Round 3 answered the bounce. The must-fix is dead at the mechanism rather than at the symptom, the hero
holds on all 972 probes at 23 widths, the outline heroes the question, the position sentence follows the
record, the disc tracks the measurement again under a live inset control, and the autofocus decision was
made against the right constraint and gave the gauge back the loudest edge on the screen. The gauge is
still the only signature and it is now the most legible object at first paint.

What is left is one re-open and five fresh, none of them a redesign. **F-A is must-fix and is the third
round on the same object**: the census clips 420–492 and 520–544 because `#st-2` and `#st-3` do not
exist, and the widened check clears it by eight pixels. **F-B is the honest cost of the round's headline
claim**: the class-killer catches the gauge class and not the other three, proven by planting each one
back into the real build and watching the gate stay green. F-C fabricates a position from an
out-of-range cursor. F-D leaves the cold home's outline where round 2 left the engaged one. F-E and F-F
are small.

The pattern is worth naming, because it is now three rounds old and it is not carelessness: **every fix
lands, and the guard written beside it is sampled where the defect isn't.** The remedy is the one this
round already demonstrated once — plant the defect back and watch the check fail — applied to the other
three arms before the next freeze.

---

*Judged 2026-08-01 against `f08c4ac`. Controls on `074eca4` and `1c533d7` on identical records.
Harness and evidence: `D:\claude-workspace\appeal-directions\_ia\r3-dirfid\` — `lib.cjs`, `hero.cjs`,
`focus.cjs`, `focus2.cjs`, `verify.cjs`, `pos.cjs`, `pos-teeth.cjs`, `hero-teeth.cjs`, `disc.cjs`,
`disc2.cjs`, `census.cjs`, `census2.cjs`, `census3.cjs`, `receipts.cjs`; measurements in `hero.json`,
`verify-full.txt`, `pos.txt`; receipts in `shots/` — `census-clip-430.png`, `census-clip-520.png`,
`cursor-out-of-range.png`, `gauge-staffonly.png`, `gauge-perfect.png`, `focus-rest-light.png`,
`focus-armed-light.png`, `focus-rest-dark-real.png`, `census-{1024,700,500,430,420}.png`.
The scratch mirror used for the four plants was restored to the shipped md5 after each; the worktree
was never modified — `git status` clean at `f08c4ac`, deliverable md5 `b10b1304…` unchanged.*
