<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (direction-fidelity lens, round 2), 2026-08-01, against appeal/home-instrument @ 074eca4.
     Preserved unedited as the record round 3 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-3 addendum). -->

# W1 ROUND-2 JUDGE — DIRECTION FIDELITY

**Subject:** the FIXED home of Deep Rehearsal, `appeal/home-instrument` @ `074eca4`
("the hero holds on every path, and the seams close"),
worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`.
**Round-1 record judged from:** `_audit/2026-08-01-w1-judge-direction-fidelity.md` (D1-D6).
**Builder's answer:** the round-2 addendum inside `_audit/2026-07-31-appeal-home-freeze.md`, from line 178.
**One lens only:** does the built thing read as THE INSTRUMENT, is there exactly ONE signature, is
the question-as-hero a correction rather than a monument, is the hygiene silent.

Everything below was re-measured on the built deliverable
(`deepdive_content_pipeline_rehearsal.html`, md5 `c14625df…`, byte-identical to `dist/index.html`)
under Playwright. Nothing is taken from the addendum. Where a charge is a REGRESSION I ran the
round-1 build (`532a1a6`) and, where relevant, master (`1c533d7`) on the identical record as a
control, so "this wave broke it" is a measurement and not an inference.

---

## VERDICT: FIXABLE — five of six closed, seven fresh defects, one must-fix

**The bounce was answered.** Five of the six round-1 defects are genuinely closed on the live page,
and two of them are closed better than they had to be: D3 now ships with a check whose negative
control I demonstrated myself, and D1's fallback holds across every resume pane I could reach. The
`<details>` collapse alone took the phone's scroll height from 8151px to 2756px. The instrument
still reads as the instrument, and the gauge is still the only signature.

**But the signature now lies.** The round-2 fix that was supposed to make the gauge honest — `thin`
is null unless one rail is *strictly* thinnest — treats a tie for LAST place as levelness, and the
consumer then reads one rail's percentage and asserts it of all three. On a record with two rails at
zero the gauge prints **"Every rail is full. Solid on all 972 probes across all three tiers"** with
two visibly empty rails directly beneath it. The round-1 build said something true on the same
record. That is F1, it is must-fix, and it is the exact shape the brief warned about: the error rode
in on the fix.

---

## THE THREE QUESTIONS, ANSWERED FIRST

**Does it read as THE INSTRUMENT? — Yes, and more so than in round 1.** The shell still holds. What
changed is that the column stopped being a document: `.hm-libm` is a CLOSED disclosure now, so the
home's scroll height at 1024 went 4488 -> 1870 and at 390 went 8151 -> 2756 (master: 7567). The
library is present at every width and costs the decision one row. That is the `.mcomp` pattern
actually applied rather than cited.

**Is there exactly ONE signature? — Yes, still the gauge.** Type census of the work column, both
themes: nothing inside `.hm-alt` exceeds **14px**; the rooms block's largest type came down from
16px/700 to **11px** (measured max) and its bars from 5px to 4px. A saturation scan finds no
saturated fill anywhere inside the gauge. The gauge still wins on density and information only.
Untouched segments keep a visible outline in both themes (`border-top` = `rgb(42,40,35)` light /
`rgb(236,234,228)` dark against a transparent fill), so the denominator is still honest.

**Is the question-as-hero a correction rather than a monument? — Yes on screen, no in the document.**
Visually it is a correction: 21px, inside `.hm-continue`, no rule, no slab, panel bounded at
251-279px on every path I measured. But the page's only rendered `h1` is the **9px eyebrow**, and
the hero is a `<p>` that appears in no heading list at all (F3). Navigate the home by headings and
the answer to "what is this page about" is a topic NAME — the table-of-contents voice the appeal
exists to leave behind, now asserted in the one place a machine reads.

**Is the hygiene silent? — Mostly, and more than in round 1.** The measure rule is silent now and
guarded. The rooms block joined the panel grammar. What is not silent is the census bar, which
truncates itself without saying so (F2).

---

# PART 1 — THE ROUND-1 SIX, RE-MEASURED

## D1 — the hero on the default resume path: **CLOSED**

Measured 16 renders: resume view `walk / drill / sys / model / num / wb / cram / flow`, each with a
stored `drill` position and with a stored `walk` position, on the receipts' own seed.

| | round 1 (walk path) | round 2 (all 16 renders) |
|---|---|---|
| `.hm-q` height | 191.1 (7 lines) | **27.3 or 54.6** (1-2 lines) |
| `.hm-continue` height | 417.2 | **251.4 or 278.7** |
| `.hm-alt` bottom in an 800px viewport | 740.4 | **574.6 or 601.9** |
| hero ends in `?"` | no (0 of 46 theses) | **yes, 16 of 16** |
| hero source | topic thesis, 372 chars | the topic's own bank |

`heroQuestion()` reads the bank on every path. The thesis never appears. Closed.

Two things rode in on it — see F5 and F6.

## D2 — the button inside a button: **CLOSED**

`.hm-do` replaces the reused `.hm-act`. Measured at 1280/1440/1000/390, cold and engaged, both
themes — the wrapper is now `border: 0px none`, `border-radius: 0px`,
`background: rgba(0,0,0,0)`, `cursor: auto`, `min-height: 0px`, `display: block`.

The round-1 charge was a live false affordance, so I re-ran the live test.
`document.elementFromPoint()` inside the dead zone right of the CTA still returns `DIV.hm-do` — it
is still the element under the pointer — but it now reports `cursor: auto`, and hovering it for
350ms changes **nothing**: border, colour and background are byte-identical before and after. No
`.hm-continue .hm-act` element exists on any render. The second bordered rectangle is gone, and with
it the second meaningless hue.

The focus halo still starts at `gapT: 0`, but the wrapper no longer paints or clips anything, so
there is nothing left to amputate. Verified with the CTA focused: `box-shadow` 3px spread + `outline`
3px, both rendering into `.hm-ask`'s 20px bottom padding.

## D3 — the display measure on body copy: **CLOSED, and the check now works**

| element | font-size | token | resolves to |
|---|---|---|---|
| `.hm-q` | 21px | `--measure-display` (41ch) | 556.2px |
| `.hm-since` | 12px | `--measure-body` (68ch) | **439.9px** (was 265.2) |

Identical at 1280 / 1440 / 1000; both cap at the 312px column at 390. The rule is now read in
CHARACTERS (41 vs 68), which is what `ch` is for and what the token's own description says.

**I did not take the addendum's word that the new arm can fail.** I mirrored `test/home_rhythm.py`
and `src/styles.css` into a scratch tree, ran it clean (`PASS — 8 rhythm gaps + 11 measures`), then
restored the round-1 defect exactly (`.hm-since{max-width:var(--measure-display)}`) and re-ran:

```
.hm-since   max-width   var(--measure-display)   styles.css:2225
   the DISPLAY measure on BODY type (--font-size-caption) ... Use var(--measure-body)
HOME RHYTHM: FAIL
```

Negative control demonstrated on the real stylesheet, not asserted. This is the only one of the six
that came back with a working guard attached.

## D4 — the retired cursor still arguing: **CLOSED, and replaced by F4**

The CTA sub-line now names the destination and nothing else — measured across all eight panes:
`Walkthrough / Probe Drill / System Map / Model Answers / Numbers / Whiteboard`. No "probe 11 of 21"
anywhere under the CTA. Walk positions are called **steps**, not probes. Both halves of D4 are
closed as written.

The single sentence that replaced them introduces its own irreconcilable pair — F4.

## D5 — spec block 4 built as the old card grid: **CLOSED as a disclosure**

The charge was "missing without a line anywhere saying so." The line is now in §A, the deviation is
kept with its engineering reason (`focus_ring.cjs`'s six live room-halo negative controls), and the
four costs I named are answered on the page, not in prose:

| round-1 cost | measured now |
|---|---|
| only block below the hero outside the panel grammar | `.hm-panel` + `.hm-phead`, like every other block |
| titles 16px/700, the largest type after the hero | **12px/600**; the block's max type is **11px**, below the gauge's 14px |
| loudest colour mass in the work column | bars 5px -> 4px, numerals 18px -> 15px. Still the only saturated mass in the column (largest object 645px² at chroma 131) but no longer competing on type |
| heading in the navigation register | **"Coverage by room"** — the spec's own label |
| third presentation of the six rooms | acknowledged and explicitly NOT fixed |

I am not re-litigating the four-state bar. A deviation that is stated, reasoned and priced is a
decision; round 1's complaint was that it was none of those.

## D6 — census vs the scroll-top disc: **CLOSED on the desktop, REGRESSED on the phone**

Control run, round-1 build vs round-2 build, identical record:

| | r1 | r2 |
|---|---|---|
| 1280x800 clearance | **-5.5px (overlap)** | **+24.5px** |
| 900x800 clearance | -5.5px (overlap) | +24.5px |
| **390x844 clearance** | **+24.0px** | **+9.0px** |

The desktop half is fixed. The phone half was already correct and this fix broke it — see F7, which
is a full defect rather than a footnote, because I could measure it going negative.

---

# PART 2 — FRESH DEFECTS

## F1 — MUST FIX. The gauge prints a provable falsehood on a tie for LAST place

Two changes compound, one in each file.

`src/scripts/app/altitude.js:89-97`

```js
if (shares.length > 1) {
  shares.sort(function (x, y) { return x.share - y.share; });
  if (shares[0].share < shares[1].share) thin = shares[0].tier;
}
```

`thin` is null whenever the two LOWEST rails tie — **regardless of the third**. A tie for last place
is not levelness. The comment above it reasons only about all-zero and all-perfect records, which
are the cases where the two lowest tie *and so do all three*.

`src/scripts/app/home-view.js:367-373`

```js
} else if (!model.thin) {
  var lvl = Math.round(model.tiers[model.order[0]].solid / model.tiers[model.order[0]].n * 100);
  verdict = lvl >= 100 ? 'Every rail is full. Solid on all ' + model.totals.n + ' probes across all three tiers …'
                       : 'The rails are level. All three tiers sit at ' + lvl + '% solid …';
```

`lvl` is read from `model.order[0]` — **Staff alone** — and then asserted of all three tiers.

**Measured, with the round-1 build as a control on the identical record:**

| record | r1 (`532a1a6`) verdict | r2 (`074eca4`) verdict |
|---|---|---|
| every Staff probe solid, SDE3 + SDE2 untouched | "SDE3 is the thin rail. 0 solid of 359 probes…" — **true** | **"Every rail is full. Solid on all 972 probes across all three tiers — there is no thin rail left to name."** |
| every SDE2 probe solid, Staff + SDE3 untouched | "Staff is the thin rail. 0 solid of 310 probes…" — **true** | **"The rails are level. All three tiers sit at 0% solid, so no one level is behind the others yet."** |
| Staff + SDE3 solid, SDE2 untouched (no tie) | "SDE2 is the thin rail" | "SDE2 is the thin rail" — correct, the strict case still works |

Receipt: `shots/gauge-staff-only.png`. In one panel, simultaneously:

- the verdict: **"Every rail is full. Solid on all 972 probes across all three tiers"**
- the two rails **directly beneath it**: `SDE3  0 / 359 · 0%` and `SDE2  0 / 302 · 0%`, both drawn as
  46 empty outlines
- the panel's own header figure: **"310 SOLID OF 972"**
- the census bar at the frame's foot: **"310 of 972 probes graded"**

Four contradictions of one sentence, all on one screen, all above the fold.

**This is not an exotic record.** It fires on ordinary early ones, because two rails at zero is what
every new user has:

- one solid SDE2 probe, nothing else -> *"The rails are level. All three tiers sit at 0% solid, so no
  one level is behind the others yet"*, with SDE2 reading `1 / 302`.
- five solid SDE2 probes -> the same sentence, with SDE2's own numeral reading **`5 / 302 · 2%`**
  one line above "All three tiers sit at 0% solid".

**Direction cost, precisely.** CHOSEN.md §6.2 makes the verdict the gauge's punchline and the freeze
§3 says the gauge "refuses to accuse without evidence." Round 2 kept the refusal and lost the
converse: it now makes a positive claim without evidence, and "Every rail is full" is the strongest
sentence the panel can utter. The signature was the one thing round 1 said not to touch; it was
touched, and it is the only object on the home that can now be caught in a plain falsehood.

**The fix is contained and is two lines.** `thin === null` needs to stop meaning "level": either
return the level/perfect/ambiguous cases distinctly from `compute()`, or have the consumer test the
actual spread (`max share - min share`) rather than the nullness of `thin`, and derive `lvl` from all
three rails rather than `order[0]`.

## F2 — The census truncates itself across 420-790px, and the check built for exactly this cannot see it

The census bar is CHOSEN.md §3.4's one genuinely new region — "live state at the frame's foot." It
is `position:fixed` with `overflow:hidden` and its content is a fixed 719px wide.

Measured, engaged record, `.hm-status` visible:

| viewport | overflow | silently lost |
|---|---|---|
| 800-1280 | 0px | nothing |
| 700 | **19px** | "Offline · nothing leaves this file" |
| 600 | **119px** | "Offline · nothing leaves this file" |
| 500 | **219px** | "19 of 46 topics started" + "Offline · nothing leaves this file" |
| 430 / 420 | **289 / 299px** | the same two |
| <=419 | — | `display:none` by design |

Receipt `shots/census-clip-500.png`: the bar reads *"RECORD 291 of 972 probes graded | 213 solid ·
51 shaky · 27 missed | 19 of 46 topics s"* — cut mid-word, with the bar's hairline running on to the
right edge so nothing indicates a truncation happened. There is no scroll: `overflow` is `hidden`.

**And the wave's own new check cannot reach it.** `documentElement.scrollWidth` equals `clientWidth`
at every one of these widths (measured `docReflow: false` at 320/360/390/430/500/700/920/960/1024/1280)
— which is precisely the blind spot `test/home_reflow.cjs` was written to close. Its header states
its scope: *"the #home route, at 320 and 390 CSS px"*. At both of those widths
`html[data-view="home"] .hm-status{display:none}` (styles.css:2481). **The only fixed bar in the app
that actually clips is `display:none` at both widths the fixed-bar clipping check tests.** The check
is right about the mechanism and blind about the instance, which is the same shape as round-1 D3's
`DISPLAY_TOKEN_RE`.

The cost is a direction cost, not a bookkeeping one: the thing lost first is *"Offline · nothing
leaves this file"* — the one sentence on the census that is a claim about the product rather than a
number, and the one the freeze §8 quotes in its own note.

## F3 — The document's only h1 is the 9px eyebrow; the hero is in no heading list

Measured heading outline of the engaged home, visible headings only:

| level | size | text |
|---|---|---|
| **H1** | **9px/700** | **"Where you stopped · Caching Strategies"** |
| H2 | 9px/700 | "Altitude — solid probes by interview tier" |
| H2 | 9px/700 | "Still shaky" |
| H2 | 9px/700 | "Recent sessions" |
| H2 | 9px/700 | "Coverage by room" |
| H2 | 9px/700 | "Library — 46 topics, six rooms" |

`.hm-q` is a `<p>` at 21px with no `role`. It appears nowhere in that list. And
`.hm-continue`'s `aria-labelledby="hm-ask-h"` points at the same eyebrow, so the panel's accessible
name is **"Where you stopped · Caching Strategies"** too.

Control: master and the round-1 build render **zero** h1s on the home. Round 2's item-9 a11y work
minted the first one and pointed it at the topic name.

**The charge is direction, not WCAG.** CHOSEN.md §6.1 and the module header both say the home used
to hero a topic NAME, "which is what a table of contents does," and that the appeal exists to stop
that. On the pixels it stopped. In the document's own structure — the h1, and the section's
accessible name — the topic name was just promoted to the top of the outline, at 9px, while the
question the direction calls the hero is structurally invisible. A screen-reader user gets the round-1
home.

The cheap fix is the honest one: the hero is the heading. Make `.hm-q` the `h1` (its `--display`
face and 21px already read as one) and demote the eyebrow to the label it looks like, or give the
section `aria-labelledby` pointing at the question.

## F4 — On the DEFAULT resume path the sentence asserts a position the record never stored, and its remainder loses its denominator

Measured, six record variants, same base progress:

| stored | rendered sentence |
|---|---|
| `pos={drill:10}`, `nav.last.view=drill` | "…and stopped **at probe 11 of 21**. **9** still ungraded." — coherent |
| `pos={drill:10}`, **`nav.last.view=walk`** | "…and stopped **at step 1 of 9**. **9** still ungraded." |
| `pos={drill:10}`, no `nav.last` | "…and stopped. **9 of its 21 probes** still ungraded." — coherent |
| no `pos`, no `nav.last` | "…and stopped. **9 of its 21 probes** still ungraded." — coherent |
| `pos={walk:4}`, `nav.last.view=walk` | "…and stopped **at step 5 of 9**. **9** still ungraded." |
| `pos={sys:2}`, `nav.last.view=sys` | "…and stopped. **9 of its 21 probes** still ungraded." — coherent |

Two things go wrong on the walk path, which is `LastVisit.resumeView()`'s own default and the app's
default pane:

**(a) A walk position is manufactured from a drill position.** In row 2 the record contains
`{drill:10}` and no walk key at all. `cursor()` gates on `posGet(id)` being truthy — any position
object — then calls `posRestore('walk', 9, id)`, which returns `0` for an absent field. The home
prints **"you stopped at step 1 of 9"** about a walkthrough the record has no evidence the user
opened. Directly above it, under the eyebrow "Where you stopped", the hero is drill probe 11's
question. One block, two mutually exclusive claims about where you stopped.

**(b) The remainder loses its denominator to a different countable.** The code comment at
`home-view.js:299` justifies dropping "of its 21 probes" because "the remainder does not repeat the
denominator the position just stated." That holds only when the position is denominated in probes.
On the walk path the denominator just stated is **walk steps**, so "9 still ungraded" has no
antecedent noun in the sentence, and it sits four words from a `9` that counts something else.

That collision is not a fluke of one record. Walk steps run 9-10 across the corpus and bank sizes run
21-24, so at a mid-progress record **41 of 46 topics** render `step N of 9` beside `9 still
ungraded`. The reader's parse is "9 of the 9 steps are ungraded," which is both false and
un-gradeable — you cannot grade a walkthrough step, and "probe" is the unit the census and the gauge
are denominated in. This is the round-1 D4 failure with the numbers moved one clause to the left.

## F5 — `heroQuestion()`'s stated middle fallback is dead code

`src/scripts/app/home-view.js:130-138`

```js
if (i < 0) {
  try { if (… posGet(t.id)) { i = posRestore('drill', cards.length, t.id); } } catch (e) { i = -1; }
}
if (i < 0) i = firstUngraded(t, cards);
```

`posRestore` (`session-progress.js:451`) returns `0` when the field is absent and never returns a
negative. So once `posGet(t.id)` is truthy — *any* stored position, including a walkthrough scroll
position — `i` is `0` and **`firstUngraded()` is never called.**

The addendum's item 1 and the module comment both state the chain as "the probe the drill cursor sits
on, **else the first probe not yet graded**, else the first." The middle rung is unreachable for every
engaged user who has ever scrolled a walkthrough in the resume topic.

Measured (variant E, `pos={walk:4}`): the hero is bank card **0** — a probe the seeded record has
already graded — presented under **"Where you stopped."** The screen heroes a question the record
shows you already answered.

## F6 — The four-line clamp truncates real heroes into non-questions

`.hm-q` gained `-webkit-line-clamp:4; overflow:hidden`. Measured against every question in the
corpus, injected into the live node at the live measure:

| viewport | `.hm-q` width | probes clipped | topics affected |
|---|---|---|---|
| 1280 | 556.2px | **1 of 972** | 1 |
| 390 | 312px | **63 of 972 (6.5%)** | **18 of 46** |

Rendered, on the topic's own record with the drill cursor parked at index 19 — probe 20 of 22, a
position `posRestore` will actually land on (receipt `shots/clamp-real-1280.png`):

> "You need to ship a change to this pipeline — say a new field in the import format, or a change to
> how a handler writes records — while it's processing live traffic. How do you roll it out without
> downtime or corrupting**…**

The opening curly quote is there. **The question mark is not, and neither is the closing quote.** At
390 the same hero is cut roughly in half (`scrollHeight` 218 against a 109px box).

The addendum's item 1 says "Measured on `walk`, `drill`, `sys` and `model`: every hero ends in a
question mark." Those four measurements are four resume views of **one topic**. Across the bank the
claim does not hold. The clamp is the right instinct — an unbounded hero was D1 — but it converts the
direction's headline element into a sentence fragment, which is a different way of failing the same
rule: the hero must be a question, and a truncated question is not one.

## F7 — The D6 fix replaces a measured value with a guess, at a specificity that defeats the measurement

`src/styles.css:2387`

```css
html[data-view="home"] .scrolltop{bottom:calc(var(--space-30) + var(--space-24))}   /* = 54px */
```

Specificity (0,2,1). The app's measured rule is `@media(max-width:919px){ .scrolltop{bottom:calc(var(--chrome-bot) + var(--space-24))} }` at (0,1,0). **The new rule wins on the home at every width**, including the phone, where `--chrome-bot` is written at runtime by `chrome-metrics.js` from the real bar.

Measured, both builds, 390x844, with the tab bar's `env(safe-area-inset-bottom)` simulated at a
home-indicator device's 34px and the app allowed to re-measure through a resize:

| build | inset | `--chrome-bot` | disc `bottom` | tab-bar top | clearance |
|---|---|---|---|---|---|
| r1 | 0 | 45px | 69px | 799 | +24.0 |
| r1 | **34** | **79px** | **103px** | 765 | **+24.0** |
| r2 | 0 | 45px | **54px** | 799 | **+9.0** |
| r2 | **34** | **79px** | **54px** | 765 | **-25.0  (the disc sits inside the tab bar)** |

`chrome-metrics` re-measured correctly in both builds (45 -> 79). Only round 2's disc failed to move,
because its offset is now a constant.

This is the app's own documented anti-pattern, re-introduced. `styles.css:1449-1455`, on this exact
control:

> *"the lift was `80px + safe-area + 16` — the SAME guess at the bar's height that `.app`'s padding
> was making, in a second place, and this one decides whether a floating control lands ON the bar it
> is dodging. It is now the measured bar plus the authored 24px of clearance … A bar that grows now
> pushes the FAB up with it instead of underneath it."*

The desktop case needed the census reserved, which is real; the mechanism for that already exists.
The fix is to feed the census into the same measured accounting, or at minimum scope the constant to
the widths where the census is actually shown (`@media(min-width:420px)`), so it stops outranking the
measurement on the phone.

---

## CHECKED AND CLEARED — do not re-litigate these

Six things looked like defects under measurement and are not. Each was killed by a control.

1. **The skip link IS first in tab order.** My first pass said it was skipped — that was an artifact
   of the sequential-focus navigation starting point surviving a `blur()` after the CTA autofocuses.
   Walking backwards with Shift+Tab from the autofocused CTA gives 13 stops, and stop 13 is
   `A.hm-skiplink "Skip to your rehearsal record"` at `domIndex: 0`, `position:fixed`, `z:1000`,
   on-screen at [11, 8, 197, 40] when focused. The 12 rail controls sit between it and the column,
   which is the use case. Addendum item 9's tab-order claim holds as written.
2. **The magenta CTA on Content Pipeline is a real room hue, not the boot constant leaking.**
   `content-pipeline`'s group is `architecture-apis`, and `--room-architecture-apis` is `#963D86` —
   which happens to equal `--acc`. Measured `--rm` resolves through `roomStyle()`, not through
   inheritance. Colour still means exactly one thing.
3. **`.hm-practicem` does not duplicate the rail.** It appears at `<=919px` and the rail's `.hm-rsec`
   / `.hm-goal` are hidden at the same breakpoint. Measured at 1280/1024/900/640/430/390: cross-drill
   and weak-spot appear in exactly one place at every width. Against master they are restored;
   against round 1 they came back from nothing.
4. **The library badge / reset-button collision is fixed.** `.ix-cell:has(.ix-c-reset) .ix-c-badge{right:var(--space-36)}`
   resolves; the badge sits inboard of the reset on every card carrying progress, at 1280 and 1440.
5. **Both themes carry every new surface.** Census, panels, `.hm-libm-s`, the hero, the CTA border and
   the gauge's empty-outline segments all rebind (light `rgb(241,237,228)` / dark `rgb(23,22,29)` on
   the census; CTA border `rgb(49,91,180)` / `rgb(125,166,243)`). Verified by driving the app's own
   `#themetog`, not by guessing at storage.
6. **The Topic index has no rail or tab affordance between 420 and 919px** — but that is unchanged
   from round 1, the in-column `<details>` library reaches every topic, and the `\` shortcut still
   opens the overlay. Named here so it is not mistaken for a round-2 regression; it is not one.

---

## THE SHORT VERSION

Round 2 did the work. Five of six closed, one of them with a guard whose negative control I
reproduced myself, and the phone went from an 8151px scroll to 2756px. The instrument is the
instrument and the gauge is still the only signature.

What is left is one must-fix and six craft debts, and the pattern is consistent: **every one of them
rode in on a round-2 fix.** The honesty fix made the gauge dishonest on ordinary early records (F1).
The clamp that bounded the hero cut the question mark off 63 of 972 probes (F6). The one-sentence
position fix manufactured a walk cursor from a drill cursor and orphaned its own denominator (F4).
The a11y fix minted the home's first h1 and pointed it at the topic name (F3). The disc fix traded a
measured offset for a constant and put the disc inside the phone's tab bar (F7). The new region has
no check that can see it clip (F2). And the fallback chain the addendum describes has a dead middle
rung (F5).

None of it is a redesign. F1 is two lines across two files. F3 is a tag swap. F4 is one branch. F5 is
one comparison. F6 is a bounded source or a visible affordance. F7 is one media-query scope. F2 is a
widths list in a check that already knows how to do the measuring.

---

*Judged 2026-08-01 against `074eca4`. Controls run on `532a1a6` (round 1) and `1c533d7` (master) on
identical records. Evidence and harness:
`D:\claude-workspace\appeal-directions\_ia\r2-dirfid\` — `lib.cjs`, `d1.cjs`, `d2456.cjs`, `ctl.cjs`,
`inv.cjs`, `edge.cjs`, `gauge.cjs`, `hunt.cjs`, `hunt2.cjs`, `hunt3.cjs`, `hunt4.cjs`, `hunt5.cjs`,
`safe.cjs`, `coll.cjs`, `head.cjs`; measurements in `d1.json`, `d2456.json`, `ctl.json`, `inv.json`,
`edge.json`, `gauge.json`, `hunt.json`, `hunt2.json`, `hunt3.json`, `hunt4.json`, `hunt5.json`;
receipts in `shots/` — `gauge-staff-only.png`, `census-clip-500.png`, `census-clip-700.png`,
`clamp-real-1280.png`, `clamp-real-390.png`, `rooms-light.png`, `rooms-dark.png`,
`theme-light-top.png`, `theme-dark-top.png`, `skiplink.png`, `edge-*.png`.*
