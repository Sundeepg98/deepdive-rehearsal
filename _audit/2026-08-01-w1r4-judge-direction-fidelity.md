<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (direction-fidelity lens, round 4), 2026-08-01, against appeal/home-instrument @ 8ef3cb9.
     Preserved unedited as the record ROUND 5 -- the closing round -- was executed from;
     the builder's response is _audit/2026-08-01-appeal-home-r5-addendum.md. -->

# W1 ROUND-4 JUDGE — DIRECTION FIDELITY

**Subject:** the home of Deep Rehearsal, `appeal/home-instrument` @ `8ef3cb9`
("the battery becomes generative, and the gauge decides on exact integers"),
worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`.
Built deliverable md5 `9235efbf1c21799bbf34b50040ae2db9`, byte-identical to `dist/index.html`.
**Bounce list judged against:** the ROUND-4 ADDENDUM in `_audit/2026-07-31-appeal-home-freeze.md`
(line 456+). **My round-3 record:** `_ia/w1-r3-judge-direction-fidelity.md` (F-A … F-F).
**One lens only:** does the built thing read as THE INSTRUMENT, is there exactly ONE signature, is
the question-as-hero a correction rather than a monument, is the hygiene silent — and does the home
say only what the record can support.

Everything below was re-measured on the built deliverable under Playwright. Nothing is taken from
the addendum. The gauge was driven by **exact integer counts** rather than by percentages, so every
row is a record specified by the numbers it is supposed to print. Worktree never modified —
`git status` clean at `8ef3cb9`, deliverable md5 unchanged after every run.

---

## VERDICT: FIXABLE — the gauge is genuinely right, and two of the round's other seven fixes landed on the surface the defect isn't on

**The headline claim is true and I could not break it.** I drove 17 records built from exact counts,
concentrated in the 99.5–100% band where round 3 died, and read every sentence against the numerals
rendered beneath it. **Zero inconsistencies.** The absolute fires only on an exactly-full ladder; one
Shaky of 971 and one-ungraded-per-tier both fall to the new *tied-at-this-precision* class instead of
licensing "every rail is full"; every rail's rendered percent is the round of its own exact figures;
the header quotes the ladder it sits on. My round-3 must-fix (F-A, the census clipping) is dead —
**1562 widths swept, 0 clipping.** F-C, F-D, F-E and F-F are closed too.

**Two things stop this being clean, and they are the same shape as each other.**

**The goal fraction was fixed on one of the two surfaces that print it — and the unfixed one is the
only one the phone shows.** `panels.js:141` still renders **"46 of 5 topics drilled this week"**, the
exact string the addendum quotes as the defect. At 1280×800 it sits **side by side** with the
corrected phrasing, 68px apart, both in the first screen. At 390×844 the corrected surface is
`display:none`.

**The focus-trap fix restores the ring's paint but not its visibility.** A keyboard user who resets a
topic now gets a `solid 3px` ring — painted on a control **145px above the viewport** at 1280×800 and
**1502px above it** at 390×844, because `cta.focus({ preventScroll: true })` suppresses the scroll
that would reveal it. The user-facing outcome the item was written against — a keyboard user who
cannot tell where focus went — is unchanged. The new gate arm re-renders at scrollY 0, the one scroll
position at which the CTA is guaranteed visible, and asserts only the class bit.

---

## THE FOUR QUESTIONS, ANSWERED FIRST

**Does it read as THE INSTRUMENT? — Yes**, and more so than in round 3. The gauge now survives
hostile record construction rather than hostile record sampling.

**Is there exactly ONE signature? — Yes, measured in both real themes.** At first paint, zero
interaction:

| | light | dark |
|---|---|---|
| CTA outline / box-shadow at rest | **none / none** | **none / none** |
| CTA resting border vs panel | 6.40:1 | 6.93:1 |
| **gauge segment border vs panel** | **14.72:1** | **13.99:1** |
| after one keystroke, CTA outline | `solid` + shadow | `solid` + shadow |

*(Note on method: a pre-seeded `ddr.v1.theme` does **not** take in this harness — `documentElement.dataset.theme`
stayed `light`. Every "dark" number above and everywhere below was re-measured with the theme set on
the document the way the toggle sets it. Any earlier-round dark claim built on the seed alone is
worth re-checking.)*

**Is the question-as-hero a correction rather than a monument? — Yes, and now on both paths.**
Cold and engaged both: hero is `H1` at 21px carrying the question, panel accessible name is the
question, exactly one visible h1. **My round-3 F-D is closed.**

**Is the hygiene silent? — No.** Three separate objects speak out of turn: the goal fraction (F-A),
the tab bar (F-C), and an orphan hairline in the census bar (F-F).

---

# PART 1 — THE ROUND-4 ITEMS IN MY SCOPE, RE-MEASURED

## §B — the gauge on exact integers: **CLOSED, and it survived a hostile construction**

The bank, measured rather than assumed: **Staff 310, SDE3 359, SDE2 302 = 971 on the ladder; 1
EXTEND probe on no rail; 972 in the bank.** The rounding thresholds that matter, derived from those
denominators: a rail renders "100%" from **Staff ≥ 309, SDE3 ≥ 358, SDE2 ≥ 301** — so 968/971 is the
deepest a record can sit while every rail still shows 100%.

Records were built by grading every probe Solid and then demoting a named count per tier, so each row
is specified by its integers. Independent judge: every rail's percent must be the round of its own
figures; an absolute must be licensed by exact counts; every quoted `N of M` must equal the rail whose
tier name precedes it; the header must equal the sum of the rails; the census must reconcile with the
header through the named off-rail probe.

| record | rails | header | verdict | ok |
|---|---|---|---|---|
| perfect 971/971 | 310/310 · 359/359 · 302/302 all 100% | 971 of 971 | "**Every rail is full.** Solid on all 971 probes…" | ✓ |
| **one Shaky Staff 970/971** | **309/310 100%** ⚑ · 359/359 100% · 302/302 100% | 970 of 971 | "The rails are **within a point** of each other, all rendering 100% solid…" | ✓ |
| one Shaky SDE3 970/971 | 310/310 · **358/359 100%** ⚑ · 302/302 | 970 of 971 | within a point, 100% | ✓ |
| one Shaky SDE2 970/971 | 310/310 · 359/359 · **301/302 100%** ⚑ | 970 of 971 | within a point, 100% | ✓ |
| one Missed Staff 970/971 | 309/310 100% ⚑ | 970 of 971 | within a point, 100% | ✓ |
| one **ungraded** Staff 970/971 | 309/310 100% | 970 of 971 | within a point, 100% | ✓ |
| **one ungraded per tier 968/971** | **309/310 · 358/359 · 301/302, all 100%** | **968 of 971** | within a point, 100% | ✓ |
| one Shaky per tier 968/971 | same, all three ⚑ | 968 of 971 | within a point, 100% | ✓ |
| two Shaky per tier 965/971 | 308/310 · 357/359 · 300/302 all **99%** | 965 of 971 | within a point, **99%** | ✓ |
| **Staff drops out of the band 969/971** | **308/310 99% [THIN]** · 359/359 100% · 302/302 100% | 969 of 971 | "**Staff is the thin rail.** 308 solid of 310 probes, across 46 of 46 topics…" | ✓ |
| EXTEND probe demoted 971/971 | all 100% | 971 of 971 | "Every rail is full… all 971 probes" | ✓ |
| EXTEND probe ungraded 971/971 | all 100% | 971 of 971 | "Every rail is full… all 971 probes" | ✓ |
| only the EXTEND probe graded | 0/310 · 0/359 · 0/302 | 0 of 971 | "The rails are level. All three tiers sit at 0% solid…" | ✓ |
| only 1 Staff Shaky | 0/310 ⚑ · 0/359 · 0/302 | 0 of 971 | "The rails are level… 0% solid" | ✓ |
| 1 solid SDE2 | 0/310 · 0/359 · **1/302 0%** | 1 of 971 | "within a point… all rendering 0% solid" | ✓ |
| cold | all 0 | 0 of 971 | "Nothing graded yet…" — no verdict | ✓ |

**17 records, 0 inconsistencies.** Row 2 is round 3's killer and it no longer licenses the absolute.
Row 7 is the deepest point of the 100%-rendering band (three probes short, three rails at 100%) and
the sentence still claims nothing it cannot derive. Row 10 shows the transition out of the band
naming the thin rail with its own figures.

**The mechanism is right, not just the output.** `altitude.js:137` `full = ladder.n > 0 &&
ladder.solid === ladder.n`; equality by integer cross-multiplication at `:128-130` so no float is
compared anywhere; `tiedDisplay = !exactEqual && (min === max)` at `:132`. And *"within a point"* is
provably safe rather than luckily true: two values that round to the same integer both lie in
`[k−0.5, k+0.5)`, so `tiedDisplay` entails an exact spread under 1 point. Receipts:
`shots/gauge-oneShaky-staff.png`, `gauge-perTier-968.png`, `gauge-perfect-971.png`.

## The header seam (my round-3 F-F): **CLOSED visually, open in the accessibility tree — F-E**

The header quotes the ladder on every record and the off-rail probe is named. But the note lives
inside `<div class="hm-key" aria-hidden="true">`. See F-E.

## §C — the census (my round-3 F-A, must-fix): **CLOSED, and by measurement**

The two middle rungs match elements now: `#st-2` → 1, `#st-3` → 1.

**1px sweep, 320–1100px, two records** — the mature record my round-3 receipt used, and the widest
the bar can ever be (46/46 started, three-digit solid/shaky/missed):

```
MATURE  781 widths   bar display:none 320-419   CLIPPING WIDTHS: 0
WIDEST  781 widths   bar display:none 320-419   CLIPPING WIDTHS: 0
```

**1562 widths, 0 clipping**, measured both as bar overflow and as per-segment self-clip. My round-3
bands re-checked directly: 420, 430, 460, 492, 500, 520, 530, 544 — worst overflow **+0.0px** at every
one. Third-round object, closed.

## Item 2 — the hero clamp: **CLOSED, censused independently**

Every probe in the bank measured through a clone of the live `.hm-q` box at both gate viewports:

```
1280x800  n=972  clamp 6  21px  col 556px   CLIPPED 0
 390x844  n=972  clamp 9  18px  col 312px   CLIPPED 0     (longest probe 242 chars)
```

## Items 4 and 5 — cursor validity and the sentinel: **CLOSED for integers; see F-D for the rest**

| stored | eyebrow | sentence | hero |
|---|---|---|---|
| `{drill:10}` (in range) | Where you stopped | "…stopped **at probe 11 of 21**. 15 still ungraded." | card 10, ungraded ✓ |
| `{drill:24}` on a 21-bank | **Up next** | "…and **stopped.** 15 of its 21 probes still ungraded." | card 6, ungraded ✓ |
| `{drill:999}` | Up next | "…and stopped." | ungraded ✓ |
| `{drill:-3}` | Up next | "…and stopped." | ungraded ✓ |
| fully graded, no cursor | **Worth another pass** | "…and stopped. **Every probe here is graded.**" | ✓ |
| fully graded, `{drill:5}` | Where you stopped | "…stopped at probe 6 of 21. Every probe here is graded." | ✓ |
| **`{drill:2.7}`** | Where you stopped | "…stopped **at probe 3.7 of 21**" | **card 0, ALREADY GRADED** ✗ |

My round-3 F-C is closed as written. The last row is F-D.

## Item 6 — the cold home's h1 (my round-3 F-D): **CLOSED**

| | cold | engaged |
|---|---|---|
| hero element | **`H1` @ 21px** | **`H1` @ 21px** |
| panel accessible name | *"Walk me through how you would design this."* | *"What does an event-driven architecture mean?"* |
| visible h1 count | 1 | 1 |

## Item 7 — the focus trap: **half closed — see F-B**

The claimed axis holds: after a keystroke, a re-render never re-quiets the ring
(`quiet=false`, `outline: solid 3px`, shadow set) at 1280×800 and 390×844, in both real themes. My
round-3 F-E (the ring re-quieted every lap of the daily loop) is closed. What is not closed is where
the ring is painted.

## Item 8 — tab-bar truth: **NOT CLOSED — see F-C**

## Item 9 — the goal fraction: **NOT CLOSED — see F-A**

---

# PART 2 — FRESH DEFECTS

## F-A — MUST FIX. "46 of 5 topics" is still on the home, on the only goal readout the phone has

The addendum's item 9: *"'46 of 5 topics' — a ratio whose numerator can pass its denominator is not a
ratio… past the goal the phrasing states what it knows."* That fix went into `goalPhrase()`
(`home-view.js:235-244`), which feeds the **sidebar** goal rail. The home renders the weekly goal on
**two** surfaces. The second is `panels.js:141`, inside `goalStrip()`, reached from `telemetryHtml()`
→ `duoHtml()` → the home column:

```js
'<div class="ix-home-v"><b>' + g.done + '</b> of ' + g.target + ' topics drilled this week …'
```

Measured on a record with every topic drilled this week (goal 5), **1280×800**:

```
.hm-goal    x= 19  y=602   "This week  46 topics drilled, 5-topic goal met with 41 to spare"
.ix-home-v  x=495  y=670   "46 of 5 topics drilled this week · Goal met — nice work."
```

Both **on screen at the same time**, 68px apart, in the first screen-and-a-bit. Receipt
`shots/goal-two-phrasings-side-by-side.png`; full page `shots/goal-both-surfaces.png`.

**And at 390×844 the corrected surface is gone:** `.hm-goal` measures `visible=false`, box `0×0`
(the sidebar is `display:none` on the phone), while `.ix-goal` is visible at y=832. **On the phone the
only weekly-goal readout is the broken one.** Controls confirm the branch is otherwise fine: at 2 of 5
both surfaces read "2 of 5"; at exactly 5 of 5 the rail reads "5 topics drilled, goal met" and the
telemetry reads "5 of 5 … Goal met".

`home_claims.cjs` reads `.hm-gr`, `.hm-q`, `.hm-verdict`, `.hm-alt .hm-fig`, `.hm-status`,
`.hm-since`, `.hm-eyebrow`, `.hm-cta-d`, `h1`. **It never reads `.ix-home-v` or `.hm-goal`**, so
neither surface has an arm and the 206 assertions cannot see this.

**Direction cost.** This is the instrument printing an impossible ratio about the user's own week, on
the screen whose entire thesis is that it says only what the record supports — and it is the phrasing
the freeze names as fixed. **Fix:** call `goalPhrase()` from `goalStrip()` (or inline the same
past-goal branch), and give one arm the two surfaces at a `done > target` record.

## F-B — MUST FIX. The ring survives the re-render; the focused control leaves the viewport

`home-view.js:627-633`:

```js
setTimeout(function () {
  if (quiet) el.classList.add('hm-quiet-focus'); else el.classList.remove('hm-quiet-focus');
  cta.focus({ preventScroll: true });
}, 0);
```

A keyboard user (one real Tab), parked on a per-card reset control, presses Enter. Measured on the
built deliverable, both viewports, **both real themes**:

| | before (on the reset) | after the re-render |
|---|---|---|
| 1280×800 light | `.ix-c-reset`, viewport top **+168**, in view | `.hm-cta`, viewport top **−145**, **out of view** |
| 1280×800 dark | +168, in view | **−145**, **out of view** |
| 390×844 light | +401, in view | **−1502**, **out of view** |
| 390×844 dark | +402, in view | **−1502**, **out of view** |

In every row the ring is genuinely armed — `quiet=false`, `outline: solid 3px`, box-shadow set. It is
painted on a button the user cannot see. `preventScroll: true` is doing exactly what it says: the
viewport does not follow the focus.

The addendum states the defect as *"focus moved to the CTA with **no indicator at all**"*. The
indicator now exists; **the keyboard user still cannot tell where focus is**, and the next Enter
navigates them into a topic drill from a control 145–1502px off screen. At 390 the Library
`<details>` they were working in also collapses under them (document height 8129 → 2575).

**The guard cannot fail on it.** `focus_ring.cjs:366-379`:

```js
await hp.keyboard.press('Shift');
const afterRerender = await hp.evaluate(async () => {
  if (window.HomeView && HomeView.render) HomeView.render();          // at scrollY 0
  …
  return { quietClass: …, focused: … };
});
chk('… a RE-RENDER after any keystroke never re-quiets the ring …', afterRerender.quietClass === false, …);
```

It never scrolls, never drives the reset control the comment names, and asserts only the class bit.
`quietClass === false` is **true in every row above** — the arm passes on the exact state I measured
as broken. This is round 3's pattern for a fourth round: *the fix lands, and the guard written beside
it is sampled where the defect isn't.*

**Fix:** drop `preventScroll` on a re-render focus (keep it for first paint, where the CTA is already
at the top), or restore focus to the equivalent control in the rebuilt card rather than the CTA. And
give the arm a scroll: re-render at a scrolled position and assert the focused element's rect
intersects the viewport. Receipts: `shots/focus-offscreen-{1280x800,390x844}-{light,dark}.png`.

## F-C — The tab bar names the wrong block for a third of the page, and "Library" is unreachable

`home-view.js:watchTabs()`. The comment claims: *"The band is now the top of the viewport downward,
which PARTITIONS the page: whichever target most recently crossed the top edge owns the mark, and
every scroll position has exactly one owner."* Neither half is what the code does:

- `rootMargin: '0px 0px -80% 0px'` shrinks the root's bottom by 80% of the viewport, so the band is
  the **top 169px strip** at 390×844 — not "the top of the viewport downward".
- the selector keeps the last **currently intersecting** target (`if (seen[nodes[j].key]) live = …`),
  not the one that most recently **crossed**; when none intersects, `if (!live) live = nodes[0].key`
  pins the mark to **'top' (Today)**.

25px sweep of the entire scrollable range at 390×844, against which block actually fills the screen:

```
geometry   vh 844   band 169px   maxScroll 1809
           .hm-continue [73,344]   .hm-alt [370,758]   .hm-libm [2245,2293]

73 samples   bar says: Today 51 · Altitude 22 · Library 0
mismatch (bar names a block other than the one filling the screen): 25 / 73  (34%)

   y=798 … 1398   bar "Today"   screen: no block dominant   (~700px owned only by the fallback)
   y=1498 … 1809  bar "Today"   screen: Library             <-- the bottom of the page
   at the very bottom: scrollY 1809, .hm-libm is 436px from the viewport top, bar says "Today"
```

**"Library" can never become current by scrolling.** `.hm-libm` needs `scrollY ∈ (2076, 2293)` to
enter the band; `maxScroll` is **1809** — 267px short. It becomes current only when you tap the tab,
which programmatically scrolls past the natural maximum.

Round 3's complaint was *"~600px of the page belonged to no target and the bar held a stale mark
through it."* Round 4 inverts the failure rather than removing it: ~700px still belongs to no target,
and the mark held through it is now **always the first block**, so the bar reads "Today" while the
user is 1700px away reading the Library. "Every scroll position has exactly one owner" is true only
because the fallback always names one. **Fix:** track the last target whose top has **crossed** the
band (a monotone pointer over `boundingClientRect().top <= band`), which is what the comment
describes; and either give `.hm-libm` bottom padding so it can reach the band, or make the last
target own everything below it. Receipt `shots/tab-bottom-says-today.png`.

## F-D — The position sentence prints "probe 3.7 of 21" and heroes a probe already graded

`home-view.js:cursor()` added a **range** test and no **integer** test:

```js
if (p.drill < 0 || p.drill >= nb) return null;
return { kind: 'drill', i: posRestore('drill', nb, id), n: nb, unit: 'probe' };
```

`2.7` passes both that gate and `posRestore`'s (`v >= 0 && v < count`), so `cur.i = 2.7` and the
sentence prints `i + 1`. Measured, receipt `shots/cursor-fractional.png`:

> **WHERE YOU STOPPED · EVENT-DRIVEN BACKBONE**
> "What does an event-driven architecture mean?"
> You marked 3 probes shaky in this topic earlier today, and stopped **at probe 3.7 of 21**. 15 still ungraded.

`heroFor` does `cards[cur.i] || cards[0]` — `cards[2.7]` is `undefined`, so the hero is **card 0,
which `CardId.level` confirms is graded Solid on this record**. Same outcome as my round-3 F-C —
a fabricated position over an already-answered probe — on the round whose thesis is exact integers.
Reproduced identically at `{drill:10.5}`, `{drill:0.5}`, `{drill:20.9999}`.

**Reachability** is narrower than F-C's was: the app's own writers (`drill/logic.js:668`,
`walkthrough/logic.js:202`) store integers, so this arrives through **Import a backup**
(`panels.js:402-412`), which checks only `typeof parsed === 'object'` before `Store.restore(data)` and
a reload — no shape or value validation at all. That is an advertised first-class feature, and a
hand-edited or foreign backup is exactly what it is for. **Fix:** one predicate —
`if (!Number.isInteger(p.drill) || p.drill < 0 || p.drill >= nb) return null;` — which also routes the
hero to `firstUngraded()` where it belongs.

## F-E — The reconciliation that closes the header seam is inside `aria-hidden="true"`

`home-view.js:493-499` appends the off-rail note to the legend:

```js
'<div class="hm-key" aria-hidden="true">' + … +
  (model.offLadder.n ? '<span class="hm-lbl hm-offladder">+ ' + model.offLadder.n + ' probe… on no rail</span>' : '')
```

Measured on every one of the 17 records: `.hm-key` `aria-hidden="true"`, and the note's
`closest('[aria-hidden="true"]')` matches. `aria-hidden` on an ancestor removes the whole subtree from
the accessibility tree, so a screen-reader user gets:

```
census : "972 of 972 probes graded, 971 solid · 1 shaky · 0 missed, 46 of 46 topics started"
header : "970 solid of 971 on the rails"
rails  : "Staff: 309 solid out of 310…"  "SDE3: 359 out of 359…"  "SDE2: 302 out of 302…"
off-rail note: NOT ANNOUNCED
```

971 solid in the census, 970 on the rails, and the one sentence that explains the difference removed.
The panel is internally consistent for AT (the header quotes the rails, and "on the rails" scopes it),
so this is **milder than my round-3 F-F** — a parity gap, not a falsehood. But the sentence the fix
added to reconcile two numbers was placed in a container marked decoration, and the colour swatches
are the only thing in `.hm-key` that deserves to be. **Fix:** move the `.hm-offladder` span out of
`.hm-key` (a descendant cannot override an ancestor's `aria-hidden`).

## F-F — One rung of the shedding ladder is still a dead selector, and it leaves an orphan hairline

`styles.css` — `@media(max-width:759px){#st-3, #st-3 + .hm-st-sep{display:none}}`. `#st-3` matches
now; **`#st-3 + .hm-st-sep` matches 0**, because `#st-3`'s next sibling is `.hm-st-sp` (the flex
spacer), not a separator. The pairing is off by one: `#st-2 + .hm-st-sep` is the separator that sits
*before* `#st-3`, so hiding `#st-3` leaves that separator behind. Measured child sequence, mature
record:

```
1024px  [ITEM ITEM SEP ITEM SEP ITEM gap ITEM]   dangling 0
 760px  [ITEM ITEM SEP ITEM SEP ITEM gap]        dangling 0
 700px  [ITEM ITEM SEP ITEM SEP gap]             dangling 1
 530px  [ITEM ITEM SEP gap]                      dangling 1
 420px  [ITEM SEP gap]                           dangling 1
last separator painted: 1 × 11px, background rgb(232,228,220)
```

At every width from 420 to 759 the bar ends on a hairline separating a figure from nothing; at
420–519 it reads *"291 of 972 probes graded │"* and stops. Small — a 1px rule — but item C's own
thesis is *"a documented ladder with dead rungs is worse than no ladder: it reads as solved,"* and one
of its four rungs is still dead. **Fix:** hide the separator that *precedes* each shed item
(`#st-3` pairs with `#st-2 + .hm-st-sep`, `#st-2` pairs with the separator before it), or use
`.hm-st-i:not([style]):last-of-type + .hm-st-sep`-style pairing that survives shedding.

---

## CHECKED AND CLEARED — do not re-litigate these

Each was a live hypothesis I tried to charge and killed with a control.

1. **"…nothing separates the levels at this precision yet" over a rail with a flagged segment is
   NOT a defect.** I pushed hard on this: on `oneShaky Staff` the panel draws one flagged keel mark
   and prints `309 / 310` beside `359 / 359`, which does separate the rails. But the qualifier scopes
   to the rendered percent, all three rails genuinely render the same integer, each rail quotes its own
   exact figures, and `tiedDisplay` **entails** an exact spread below one point (two values rounding to
   `k` both lie in `[k−0.5, k+0.5)`). Singling a rail out on a 0.046-point difference was a charged
   defect in round 2; the design is deliberately steered here and the steering is sound.
2. **`level` is reachable only at 0%, and that is harmless.** `s₁/310 = s₂/359` forces `310 | s₁`
   (gcd(359,310)=1), so exactly-equal shares require all-zero or all-full — and `full` is tested
   first. The class is near-vacuous on this bank, but the only sentence it can ever print
   ("All three tiers sit at 0% solid…") is true on every record that reaches it. Not a defect;
   recorded so the next round does not mistake the narrowness for a bug.
3. **The cold gate is bank-scoped while the panel is ladder-scoped, and no false claim results.**
   Grading only the EXTEND probe gives `graded = 1`, so the cold branch is skipped and the panel
   prints "The rails are level. All three tiers sit at 0% solid" over three empty rails. Honest, if
   slightly odd. Cleared.
4. **The stale-`quiet` closure race is real but too narrow to charge.** `quiet = !keyboardSeen` is
   captured at render and applied in `setTimeout(…, 0)`; a keydown landing inside that window removes
   the class and the stale closure re-adds it. Reproduced by dispatching a keydown in the same task as
   a reset click — final state `quiet=true` after a keydown was seen. The window is one task turn and
   the next keystroke self-heals it. Noted so it is not rediscovered as new.
5. **The goal bar does not overflow past the goal.** `weeklyGoal()` clamps
   `pct: Math.min(100, …)` (`panels.js:131`); measured width 266.8px inside a 267px track at 46-of-5.
   The *number* is wrong (F-A); the bar is not.
6. **The 420–919px band still has no room-nav or Topic-index affordance beyond `\`.** Unchanged,
   pre-existing, disclosed as uncharged since round 2. Not a round-4 regression.

---

## THE SHORT VERSION

Round 4 did the thing it set its name on. The gauge decides on exact integers and I could not make it
lie: 17 records built from exact counts, concentrated in the 99.5–100% band, produced zero
inconsistencies, and the one absolute on the panel is licensed by `ladder.solid === ladder.n` and
nothing weaker. The census clip that survived three rounds is dead across 1562 measured widths. The
hero holds on all 972 probes at both gate viewports. The cold home's outline, the out-of-range cursor
and the re-quieted ring — my last three opens — are all closed.

What is left is two must-fixes and four smaller, none of them a redesign, and **two of them are the
same failure mode**: a fix applied to one instance of a duplicated surface. **F-A** — the goal
fraction is corrected on the sidebar rail and untouched on the telemetry panel, which is the only
goal readout at 390 and sits 68px from the corrected one at 1280; "46 of 5 topics" is still on the
screen. **F-B** — the focus fix restores the ring but the control it is painted on is 145px
(1280) and 1502px (390) outside the viewport, so the keyboard user still cannot see where focus went,
and the new arm re-renders at scrollY 0 where the CTA cannot be off screen. **F-C** — the tab bar
names a block other than the one on screen at 34% of scroll positions and can never name the Library.
**F-D**, **F-E**, **F-F** are small.

The pattern I named in round 3 is now four rounds old and it has narrowed to something more specific
and more fixable than "sampled where the defect isn't": **when a defect has two instances, this wave
fixes the one it was shown.** The goal fraction had two renderers and one was fixed. The focus trap
had a paint half and a visibility half and one was fixed. The shedding ladder had four selectors and
two were fixed. The remedy is the one this round already demonstrated on the gauge and on the census —
enumerate the instances before fixing, and let the check drive the product rather than the DOM.

---

*Judged 2026-08-01 against `8ef3cb9`. Worktree never modified — `git status` clean, deliverable md5
`9235efbf1c21799bbf34b50040ae2db9` unchanged after every run.
Harness and evidence: `D:\claude-workspace\appeal-directions\_ia\r4-dirfid\` — `lib.cjs` (the
exact-integer seeder), `bank.cjs`, `gauge.cjs`, `goal.cjs`, `goal2.cjs`, `focus3.cjs`, `focus4.cjs`,
`focus5.cjs`, `census.cjs`, `rest.cjs`, `tabs.cjs`, `final.cjs`, `sig2.cjs`, `mounts.cjs`,
`reset-probe.cjs`, `themeprobe.cjs`; measurements in `gauge.txt`, `goal.txt`, `census.txt`,
`rest.txt`, `tabs.txt`, `focus.txt`, `focus4.txt`, `focus5.txt`, `signature.txt`, `final.txt`;
receipts in `shots/`.*
