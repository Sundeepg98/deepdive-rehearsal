<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (the-complaint lens (the operator's original verdict), round 4), 2026-08-01, against appeal/home-instrument @ 8ef3cb9.
     Preserved unedited as the record ROUND 5 -- the closing round -- was executed from;
     the builder's response is _audit/2026-08-01-appeal-home-r5-addendum.md. -->

# W1 — ROUND 4 JUDGE: THE COMPLAINT

**Subject:** the BUILT home of Deep Rehearsal, `appeal/home-instrument` @ **`8ef3cb9`**
("the battery becomes generative, and the gauge decides on exact integers"), worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i` — tree clean at HEAD before and
after this judgment. Built file `deepdive_content_pipeline_rehearsal.html`, 12,244,103 bytes.

**Lens:** the-complaint. *"the frontend is not looking like an application… the visual design is
not appealing."*

**Judged against:** the ROUND-4 ADDENDUM in `_audit/2026-07-31-appeal-home-freeze.md` (from line
456), cross-referenced with the three round-3 judgments at `_ia/w1-r3-judge-*.md`.

**Method:** Playwright at **1280×800/900** and **390×844** (plus 360×800, 414×896, 320, and a
1px-step width sweep 380→1024 and a 5px sweep 320→1440), both themes, on **21 records** — the
battery's own plus twelve I built to break it. Scroll sweeps are **instant-scroll and
settle-verified** (my first pass fought `scroll-behavior:smooth` and I threw it away). Every number
below is re-derived from `getBoundingClientRect` / `getComputedStyle` / the live DOM; I read the
addendum after measuring, not before.

---

## VERDICT: **FIXABLE**

Three of my five priority items are genuinely closed, and two of them are closed better than the
addendum claims. The gauge's exact-integer rewrite kills the class that survived three rounds — I
drove the record that produced round 3's killer and the panel now tells the truth about it. The
focus trap I opened in round 3 is closed, in both themes, on the real keyboard path, with an arm
behind it that I confirmed is not decorative. The census's dead rungs are alive and **nothing
clips at any width from 380 to 1024** on the widest record the bar can hold.

But I can name concrete defects, so it is not clean — and **two of the three are priority items
this round asserts closed**:

1. **The phone tab bar still names a block that is not on screen, for 43% of the scroll range** —
   the same failure as round 3, inverted. It now marks **"Today"** while Today is 1,320px above the
   viewport, continuously from mid-page to the bottom, and **"Library" is now the tab that can
   never be current**. The addendum's specific claim — *"which **partitions** the page: every
   scroll position has exactly one owner"* — is false at 25 of 56 sampled positions, and the code's
   own comment describes a mechanism the code does not implement.
2. **The goal fraction is fixed on the readout the phone hides and not on the one it shows.**
   `"46 of 5 topics drilled this week"` still ships, inside `#home`, 49px below the sentence that
   replaced it. On the phone it is the **only** weekly-goal readout on the page.
3. **"Up next" is still printed above "Every probe here is graded"** — my round-3 D4, verbatim, on
   a well-formed record at the current schema version. The sentinel fix closed one of the two
   mechanisms that produce that sentence pair. `home_claims` **has the exact assertion for it** and
   cannot fire, because every record the battery writes — all 13 pins and all 24 generated — is
   normalized against the live bank before the home ever reads it.

None of this needs redesign. The fixes are one latch, one function call, and one `||`.

---

## 1. THE PRIORITY FIVE, RE-MEASURED

| # | round-4 item | status | evidence |
|---|---|---|---|
| 4 | **cursor validity** — out of range = no field | **CLOSED** | §2.1 — six cursor records |
| 5 | **the `firstUngraded` sentinel** | **CLOSED as a sentinel**; the sentence pair survives → **D3** | §2.2, §3.3 |
| 6 | **the cold home's h1 is its question** | **CLOSED** | §2.3 |
| 8 | **tab-bar scrollspy partitioning** | **NOT CLOSED** → **D1** | §3.1 |
| 9 | **the goal fraction clamp** | **HALF CLOSED** → **D2** | §3.2 |

And the rest of my scope, re-driven:

| item | status | evidence |
|---|---|---|
| B — the gauge on exact integers | **CLOSED**, and it kills the class | §2.4 |
| B — the header seam (972 vs 971) | **CLOSED**; one a11y residue → **M1** | §2.5 |
| C — the census's two dead rungs | **CLOSED**, wider than claimed | §2.6 |
| 7 — the focus trap (my round-3 D3) | **CLOSED**, mutant-checked in both themes | §2.7 |

---

## 2. WHAT IS GENUINELY CLOSED

### 2.1 — cursor validity. **CLOSED.** Six records, including the two boundaries.

`cursor()` (`home-view.js:107-127`) now rejects an out-of-range index *before* `posRestore` clamps
it. Driven at 1280 and 390, `event-driven` (21-probe bank, 10-step walk):

| stored | in range? | position claimed | eyebrow |
|---|---|---|---|
| `{drill: 24}` on 21 | no | **none** | Up next |
| `{drill: 21}` on 21 — **index === length** | no | **none** | Up next |
| `{drill: -4}` | no | **none** | Up next |
| `{walk: 15}` on 10 steps | no | **none** | Up next |
| `{drill: 20}` — last valid | yes | *"…stopped at **probe 21** of 21. 15 still ungraded."* | Where you stopped |
| absent | — | **none** | Up next |

Round 3's fabrication — *"stopped at probe 1"*, a place the record was never in — is gone, and the
off-by-one boundary (`index === length`) is on the correct side of the guard. The hero falls
through to `firstUngraded` in every rejected case, exactly as the addendum says. `judgePosition`
in the battery now checks the numeral against the **stored field**, which is the right instrument
for this class. **Confirmed closed.**

One residue that is not this: an **in-range non-integer** cursor is not rejected — see **M3**.

### 2.2 — the `firstUngraded` sentinel. **CLOSED as a sentinel.**

`firstUngraded()` returns `-1` for "nothing ungraded" and `heroFor()` branches on it into
`mode:'done'`, which gets its own eyebrow. Driven on `perfect`, `heavy`, `oneShort`, `goalBlown`,
`goalExact` and a record where every probe is **missed**:

> **WORTH ANOTHER PASS · CONTENT PIPELINE**
> *"Export a 1,000,000-row CSV without OOM. How?"*
> You worked this topic earlier today, and stopped. **Every probe here is graded.**

That is coherent: the eyebrow no longer promises a next probe. `0` no longer means two things.
**The sentinel is fixed.** What is not fixed is the *sentence pair* it was fixed for — a second,
independent mechanism still produces it (**D3**), and a second-order consequence of the new branch
is **M2**.

### 2.3 — the cold home's h1. **CLOSED**, and it is the same treatment as the engaged path.

At 1280 and 390, cold record:

| | cold | engaged |
|---|---|---|
| the h1 | `H1.hm-q` — *"Walk me through how you would design this."* | `H1.hm-q` — the probe question |
| computed | 21px / 600 / 27.3px lh @1280 · 18px / 23.4px @390 | **identical** |
| the eyebrow | `P.hm-lbl.hm-eyebrow` — *"Start here"*, 9px / 700 | `P.hm-lbl.hm-eyebrow`, 9px / 700 |
| `aria-labelledby="hm-ask-h"` | resolves to the **H1** | resolves to the H1 |
| rendered h1 count | **1** | **1** |

Heading order, cold: `H1 "Walk me through…"` → `H2 Altitude — solid probes by interview tier` →
`H2 Coverage by room` → `H2 Library — 46 topics, six rooms`. No skipped level. The document has a
second `h1` (`DIV.side-id > h1 "Content Pipeline"`) but it is inside a `display:none` ancestor and
renders zero client rects — off the a11y tree, and pre-existing. Not clipped at either width
(scrollHeight === clientHeight). **Confirmed closed.**

### 2.4 — the gauge, on exact integers. **CLOSED, and this is the round's real win.**

The record that convicted round 3 — one Shaky probe among 971 — now renders:

| | round 3 | round 4 (measured) |
|---|---|---|
| rails | `310/310 100%` · `359/359 100%` · `301/302 100%` | same |
| header | *"971 solid of 972"* | *"**970 solid of 971** on the rails"* |
| verdict | ***"Every rail is full.** Solid on all 971 probes… there is no thin rail left to name."* | *"**The rails are within a point of each other**, all rendering 100% solid — nothing separates the levels at this precision yet."* |

Every clause of that new sentence is checkable against the picture above it: the three rails do
render 100%, the spread is 0.33 points, and the reader can find the missing probe — SDE2's own
label reads `301 / 302`. The absolute is gone and nothing false replaced it.

I drove the whole class table:

| record | rails | verdict | true? |
|---|---|---|---|
| **cold** | 0/310 · 0/359 · 0/302 | *"Nothing graded yet…"* — no verdict | yes |
| **one shaky grade anywhere** | 0% · 0% · 0% | *"**The rails are level.** All three tiers sit at 0% solid…"* | yes — exactly equal, 0 = 0 = 0 |
| **perfect** | 310/310 · 359/359 · 302/302 | *"**Every rail is full.** Solid on all 971 probes…"* | yes — `ladder.solid === ladder.n` |
| **oneShort** | 100% · 100% · 100%, one probe shy | *"within a point… at this precision"* | yes |
| **heavy** | 133/310 43% · 196/359 55% · 177/302 59% | *"**Staff is the thin rail.** 133 solid of 310 probes, across 46 of 46 topics…"* | yes, and that rail wears `.thin` |
| **goalExact** | 33/310 11% · 39/359 11% · 33/302 11% | *"within a point… all rendering 11% solid"* | yes — 10.6% / 10.9% / 10.9%, not exactly equal |
| **staleCursor** | 0/310 · 0/359 · 3/302 1% | *"**Staff and SDE3 are the thin rails.** Both sit at 0% solid — Staff 0 of 310, SDE3 0 of 359 — under a rail that is further along."* | yes |

`full` is now `ladder.solid === ladder.n`; `level` is integer cross-multiplication; `tiedDisplay`
is the new class and its sentence claims only what the precision carries. **The class the appeal
was about is dead.** The `tiedDisplay` split is the right call and I could not break it: I tried
the two rounding seams that broke round 2 and the one-short seam that broke round 3.

### 2.5 — the header seam. **CLOSED.**

`971 solid of 972` above rails totalling 971 is gone. The header now reads *"**506** solid of 971
**on the rails**"*, denominated in the same ladder as the rails and the verdict, and the 972nd
probe is named in the legend: *"+ 1 probe outside the three tiers, on no rail"*. The footer census
keeps the bank's own denominator (*"972 of 972 probes graded · 507 solid · 323 shaky · 142
missed"*) and 507 − 506 = 1 reconciles exactly. Nothing on the page is now derivable two ways.
One residue: the disclosure is inside an `aria-hidden` container — **M1**.

### 2.6 — the census. **CLOSED, and wider than the addendum claims.**

`statusHtml()` emits `id="st-2"` and `id="st-3"`; `document.querySelectorAll('#st-2').length === 1`
at every width. All four rungs of the documented ladder fire, in priority order, on the **widest
record the bar can hold** (972 of 972 graded, three-digit solid/shaky/missed, 46 of 46 started):

| band | what is on screen |
|---|---|
| ≥1024 | Record · graded · **solid/shaky/missed** · **topics started** · offline note |
| 1023–760 | the offline note drops |
| **759–545** | **`#st-3` (topics started) drops** — the rung that matched nothing in round 3 |
| **544–520** | **`#st-2` (the breakdown) drops** — likewise |
| 519–420 | the "Record" eyebrow drops |
| ≤419 | the bar is `display:none` |

**1px sweep, 380→1024: zero clipping at every width**, measured two ways — `scrollWidth −
clientWidth` **and** text ink past the frame's right edge (`getBoundingClientRect().right` of every
descendant). Round 3's receipt width (520) reads 0 over; round 3's worst (420) reads 0 over. The
non-monotonic 519/520 seam is gone. **Confirmed closed**, and my round-3 D1 with it.

### 2.7 — the focus trap. **CLOSED**, and I ran the path that convicted it.

`keyboardSeen` is session-scoped and `render()` now *removes* the quiet class once a key has been
pressed. Driven at 1280, keyboard only, in **both** themes:

| step | `document.activeElement` | outline | halo | `hm-quiet-focus` |
|---|---|---|---|---|
| load, no key yet | `BUTTON.hm-cta` | `none 3px` | none | on |
| press **Tab** | `BUTTON.ix-goal-b` | `solid 2px` | yes | **off** |
| focus a visible card reset | `BUTTON.ix-c-reset` | `solid 2px` | yes | off |
| **Enter on it → `render()`** | `BUTTON.hm-cta` | **`solid 3px`** | **yes** | **off** |

Row 4 is the row that was blank in round 3. Identical in dark. The load-time quiet window still
holds, so the design call the round-2 coherence ruling made is intact. `focus_ring` grew from 14 to
16 assertions and the new arm is real — it presses a key, forces a re-render, and asserts the ring
survives. **My round-3 D3 is confirmed closed.**

*(The `render()` focus **steal** itself — a keyboard activation on a card control moving focus to
the CTA — is unchanged and pre-existing since round 2. It is now at least visible. Not raising it;
it was uncharged in round 3 for the same reason.)*

---

## 3. DEFECTS, RANKED

### D1. The tab bar names a block that is not on screen for 43% of the page — now marking "Today" from mid-page to the bottom — and "Library" can never be current.

**Where.** `watchTabs()` (`home-view.js:742-757`):

```js
var seen = {};
tabObs = new IntersectionObserver(function (entries) {
  entries.forEach(function (en) {
    for (var i = 0; i < nodes.length; i++) if (nodes[i].node === en.target) seen[nodes[i].key] = en.isIntersecting;
  });
  var live = null;
  for (var j = 0; j < nodes.length; j++) if (seen[nodes[j].key]) live = nodes[j].key;
  if (!live) live = nodes[0].key;          /* <-- */
  markTab(live);
}, { rootMargin: '0px 0px -80% 0px', threshold: 0 });
```

The comment two lines above it says *"the **LAST target** in column order that **has crossed** the
band"* and *"whichever target **most recently crossed** the top edge owns the mark"*. **`seen` is
not a crossing latch — it stores `en.isIntersecting`, the *current* state.** So when nothing is in
the band the loop finds nothing, and the fallback hands the mark to `nodes[0]` — the **first**
block, not the most recent one. `-80%` leaves a band of the top 20% (168.8px at 844), and there are
only three targets with roughly 600px of unobserved page between the gauge and the library mount.
The result is the opposite of a partition.

**Measured at 390×844, engaged record, instant-scroll, settle-verified, 25px steps (56 samples over
a 1393px range):**

| | |
|---|---|
| samples with **no target in the band at all** | **25 / 56** |
| samples where the marked tab's block is **entirely off screen** | **25 / 56 — the same 25** |
| the span | **y 775 → 1375, continuous — 600px of 1393 (43%), to the bottom of the page** |
| what the bar reads through it | **Today**, with `aria-current="true"` |
| `.hm-continue` at the last sample | top **−1302**, bottom **−1031** |
| `.hm-continue` at max scroll (y 1393) | top **−1320** |
| tabs ever marked while scrolling | `{top: 34, alt: 22}` — **Library never** |

Receipts: **`w1-r4-receipts/r4-phone-y1000-bar-says-today.png`** — the active indicator and bold
label sit under **TODAY** while the screen shows the six room cards and *Cross-topic drill*;
**`r4-phone-bottom-bar-says-today.png`** — the same at the very bottom of the page.

Reproduced across records and viewports:

| case | marked tab off screen | span | Library ever marked |
|---|---|---|---|
| 390×844 engaged | **25 / 56** | 775→1375 (600 of 1393) | **no** |
| 360×800 engaged | **28 / 62** | 850→1525 (675 of 1525) | **no** |
| 390×844 cold | 17 / 53 | 900→1300 (400 of 1306) | **no** |
| 360×800 cold | 19 / 57 | 950→1400 (450 of 1422) | **no** |
| 390×844 drawer open | 15 / 116 | 780→1620 | yes (88 samples) |

**What genuinely improved, stated plainly.** Round 3's tap bug is **fixed**: tapping Today now
marks Today (y 4), Altitude marks Altitude (y 301), Library marks Library (y 1760). That was half
of my round-3 D2 and it is closed.

**What did not.** Round 3 held a stale **Altitude** for 660 of 1370 (48%) and Today was never
markable. Round 4 holds a false **Today** for 600 of 1393 (43%) and **Library** is never markable.
The wrong-mark span moved by five points; the unreachable tab moved from the first position to the
third. And the new failure is the louder one: a stale mark on the block you just left is at least
adjacent to the truth, while "Today" at the bottom of the page points 1,320px in the wrong
direction — and it is announced.

**No arm can see it.** `home_claims.cjs` reads eight selectors (`.hm-verdict`, `.hm-alt .hm-fig`,
`.hm-status`, `.hm-since`, `.hm-eyebrow`, `.hm-cta-d`, `.hm-q`, `.hm-gr-*`); none of them is a tab.
`seg_state.cjs` drives `.seg button` on `#walk` — the topic-route segment bar, a different control
with different code. The only arm that mentions `.hm-tabs` is `home_reflow.cjs`, and only inside a
generic "nothing is clipped out of reach" node sweep that never reads `aria-current`. **Item 8 is
asserted with zero coverage**, and §E's "Not covered, stated plainly" list does not disclose it —
which is the exact shape my round-3 §4 asked round 4 to stop repeating.

**Fix (one line).** Make `seen` the latch its own comment describes — record the last key whose
`isIntersecting` went true and keep it when the band empties (`if (en.isIntersecting) last = key`),
so the mark is genuinely "the most recently crossed" and the `nodes[0]` fallback only fires before
the first crossing. Then add the arm: scroll the range, assert the marked tab's block is on screen
at every position, and assert every tab is reachable.

---

### D2. The goal fraction is fixed on the readout the phone hides, and the broken one ships 49px away.

**Where.** `goalPhrase()` (`home-view.js:236-247`) fixes `.hm-goal`, which lives in
`ASIDE.sidebar > .hm-rail`. `styles.css:2501` — `@media(max-width:919px){… .hm-rail .hm-goal{display:none}}`.
Meanwhile `telemetryHtml()` (`panels.js:250-252`) composes `goalStrip()` **into the home**, and
`goalStrip()` (`panels.js:133-142`) still emits:

```js
'<div class="ix-home-v"><b>' + g.done + '</b> of ' + g.target + ' topics drilled this week &middot; ' + note + '</div>'
```

**Measured, goal 5 with 46 topics drilled this week:**

| surface | where it lives | 1280×900 | 390×844 |
|---|---|---|---|
| `.hm-goal` (fixed) | `ASIDE.sidebar`, **outside `#home`** | *"**46** topics drilled, 5-topic goal met with 41 to spare"* @ y 602 | **`display:none`** |
| `.ix-goal` (not fixed) | **inside `#home`** | *"**46 of 5** topics drilled this week · Goal met — nice work."* @ y **651** | **visible — the only one** |

Both are on screen simultaneously at 1280, **49px apart**. Receipt:
**`w1-r4-receipts/r4-goal-two-readouts.png`** — the sidebar rail reads *"46 topics drilled, 5-topic
goal met with 41 to spare"* and the panel to its right reads *"46 of 5 topics drilled this week"*.
Two different sentences about the same two integers, in one screenshot.

On the phone the fixed one is `display:none` and the broken one is what the reader gets. The whole
argument for item 9 — *"a ratio whose numerator can pass its denominator is not a ratio"* — is a
claim about the product, and on the viewport this brief names, the product still prints the ratio.

**The steelman, stated fairly.** `goalStrip()` predates this wave; I said so myself in round 3
(*"the identical pattern already ships on master"*). Two things override that here. First, the home
**chooses** to render it — `telemetryHtml()`'s own comment says *"The home renders this BELOW the
decision"*, so it is the home's composition. Second, my round-3 note named `goalStrip()` explicitly
as the sibling surface, so the wave had the pointer and item 9 was written as if the class were
closed. §E does not list it among what is not covered.

**No arm can see it either.** No check in the gate reads `.hm-goal` or `.ix-goal`.

**Fix.** Call `goalPhrase()` from `goalStrip()` too — the function already exists and already
handles `done === target` and `done > target` separately. Then one assertion: *no rendered
"N of M" on the home may have N > M.*

---

### D3. "Up next" is still printed above "Every probe here is graded" — and the arm written for it cannot fire.

**Where.** The sentinel is fixed; the **denominator** is not.
`continueHtml()` (`home-view.js:311-315`):

```js
var tot = pr.tot || bank.length;
var left = Math.max(0, tot - (pr.done || 0));
```

The comment eleven lines above says *"**The bank knows the denominator whether or not the record
does.**"* The code consults the bank only when the record has no `tot` at all. So `left` is derived
from the **stored aggregates** while `firstUngraded()` walks the **live bank** — and when those two
disagree, the panel prints both answers.

They disagree after any content release. `CV` is a hardcoded `2` and its own header calls it *"the
CARD-KEY schema"* — not the content version — so a build that changes a bank does not trip
`migrateTopic`'s `prev.cv !== CV` gate, and `Progress.get()` returns the record raw
(`progress.js:339`).

**Measured.** I wrote the record `record()` itself writes — `{got:18, shk:0, done:18, tot:18,
cards:{18 content keys}, cv:2}` — against a topic whose live bank now holds 21. Nothing else
touched. After boot the record is **unchanged** (`{done:18, tot:18, cv:2, nKeys:18}`), the live
bank is 21, and 3 probes are genuinely ungraded:

> **UP NEXT · EVENT-DRIVEN BACKBONE**
> *"How do you evolve the shape of an event over time?"*
> You worked this topic earlier today, and stopped. **Every probe here is graded.**

Identical at 1280 and 390. Receipt:
**`w1-r4-receipts/r4-upnext-over-every-probe-graded.png`**.

That is my round-3 D4 receipt text, verbatim, on the build that closed round-3 D4. It self-heals on
the user's next grade in that topic (`snapshot()` re-derives `tot` from the live bank) — but the
home is the first screen after an update, which is exactly the window.

**And this is the sharp part: the assertion for it already exists.** `judgePosition`
(`home_claims.cjs:478-481`):

```js
/* "Up next" over "every probe is graded" -- the sentinel collision, in words */
if (/Up next/.test(r.eyebrow || '') && /Every probe here is graded/.test(s)) {
  return 'the eyebrow promises a NEXT probe while the sentence says every probe here is graded';
}
```

The rule is exactly right. It cannot fire, because **every record the battery writes is normalized
against the live bank before the home reads it**:

- all 13 pinned seeds and the generator write **`tot: cards.length`** — the live bank, every time
  (`home_claims.cjs:268`);
- and all 13 write **`cv: 1`** (`grep -c "cv: 2"` → **0**), so `Progress.migrate()` runs at boot,
  `prev.cv !== CV`, and `record()` rewrites each one with `tot: ids.length` and `done`/`got`/`shk`
  recomputed from the live bank.

So the record space the generative arm explores is *{which live cards are graded, at what level,
plus a resume pointer}* — with every aggregate re-derived by construction. A record whose stored
totals are out of step with its bank is **unreachable at either schema version**, and that is the
record every content release manufactures.

This is round 3's lesson recursing one level. Round 3's was *"an arm's negative control has to be
the defect that actually shipped."* Round 4 built a generator precisely to escape a retrospective
**seed list** — and inherited the retrospective **record shape**. Biasing the sampler toward the
99.5–100% band was the right instinct applied to one axis; the axis that was left constant is the
one that fails.

*(Two smaller coverage notes from the same reading: the generator only ever writes a `drill`
cursor, never a `walk` one, so `judgePosition`'s walk branch is exercised by pins only; and its
cursor is always `Math.floor(rnd()*nb)` — always in range and always an integer — so both the
out-of-range and the non-integer paths are pin-only too.)*

**Fix.** `var tot = bank.length;` — the comment already says so. If a stored `tot` is wanted as a
fallback it belongs on the other side of the `||`. Then the existing assertion fires, and one seed
with `cv: 2` and a short `tot` becomes its negative control.

---

## 4. MINOR — named so they are not re-litigated, not ranked with the three above

**M1. The disclosure that closes the 972/971 seam is hidden from assistive tech.**
`.hm-offladder` — *"+ 1 probe outside the three tiers, on no rail"* — is emitted inside
`<div class="hm-key" aria-hidden="true">` (`home-view.js:493-500`). Verified on the live page:
the nearest `aria-hidden="true"` ancestor is `DIV.hm-key`. Nothing false is announced (the header
says *"on the rails"*), but a screen-reader user gets the two denominators — 971 on the panel, 972
in the census — with the sentence that reconciles them removed. One line: move the span outside the
legend, or drop `aria-hidden` from it specifically.

**M2. `mode:'done'` indexes the BANK with a WALK step index.** `heroFor()` (`home-view.js:152-157`):
`var last = (cur && cards[cur.i]) || cards[0];`. A drill cursor returns from the branch above, so on
this line `cur` is **always** a walk cursor — `cur.i` counts steps and `cards` is the probe bank.
Driven: `{walk: 4}` on a fully-graded topic heroes bank card 4 under *"Worth another pass"* while
the line reads *"stopped at **step 5** of 10"*. Nothing printed is false — the eyebrow claims no
position — but this is the two-collections-one-block shape round 3 removed from the *"Where you
stopped"* path, reintroduced in the branch added beside it. Walk steps run 9-10 and banks 21-24, so
it never throws; it just heroes an arbitrary probe. Fix: `cards[0]`, or don't pass a walk cursor in.

**M3. An in-range non-integer cursor renders a fractional probe number.** The new guard tests
`p.drill < 0 || p.drill >= nb` but not integrality, and `posRestore` passes floats through
(`session-progress.js:451`). `{drill: 10.5}` renders *"…stopped at probe **11.5** of 21"* while the
hero falls back to `cards[0]`. I could not find a path by which the app writes a non-integer, so
this is robustness, not a shipped-path defect — but the guard is one `!==` from covering it
(`p.drill !== (p.drill | 0)`), and hardening against a *storage* value is the same argument that
motivated item 4.

**M4. `firstUngraded()` now returns `-1` on exception**, where it returned `0` before — so a
failure inside `Progress.get` / `CardId` reads as *"the topic is fully graded"* and heroes *"Worth
another pass"* on a topic that may have nothing graded at all. A catch that claims completion is a
worse default than a catch that claims the first probe. Not reachable that I can find in the
single-file build; noted because the sentinel's whole argument is about what a value means.

---

## 5. WHAT I CHECKED THAT IS GENUINELY FINE

- **No horizontal document overflow** at any of 225 widths swept 320→1440 on an engaged record.
- **No overflow anywhere on the gauge panel** across the same sweep: the lengthened header
  (*"506 solid of 971 on the rails"*) never wraps to a second client rect at any width, and the
  five-item legend never overflows (it wraps to 3 lines at 12 widths — cosmetic, intended).
- **The hero, re-censused at 320**: all **972** probes through the live `.hm-q` box, 0 clipped,
  worst case **9.0 lines against a clamp of 9**. Same zero-headroom note I carried forward from
  round 3; the addendum has now put that census **in the gate**, which was my §4 ask.
- **Both themes** hold at both breakpoints on an engaged record
  (`r4-desktop-{light,dark}.png`, `r4-phone-{light,dark}.png`).
- **`markTab()`** still removes `aria-current` from every other tab — the mark is *wrong*, never
  *duplicated*.
- **Tapping every tab now lands and marks correctly** — round 3's "tap Today, get Altitude" is gone.
- **The `.thin` rail mark** is applied to exactly the rail the verdict names and withheld whenever
  two or three rails tie, including the new `tiedDisplay` class.
- **The census's own arithmetic**: 507 + 323 + 142 = 972, and 507 − 506 = the one off-ladder probe.
- **The gate is honest about itself**: `home_claims` 206 assertions with 6 planted mutants,
  `focus_ring` 16, `home_reflow` 2 planted mutants — I ran all four home arms plus `seg_state` on
  the shipped build and all pass. The mutants are real defects from real rounds, not strawmen.
- **The 420–919px band** still has no room-nav affordance beyond `\`. Pre-existing, disclosed as
  uncharged since round 2. Not raising it.

---

## 6. THE LESSON I WOULD CARRY INTO ROUND 5

Round 3's lesson was *"an arm's negative control has to be the defect that actually shipped."*
Round 4 answered it properly for the gauge — it restored `full = (min === 100)` into the product,
watched two arms go red on two records, and restored. That is the right method and it is why the
gauge class is finally dead.

Round 4's lesson is the next turn of the same screw: **a generator only explores the axes you let
it vary, and the axis you did not think to vary is where the next defect is.** The battery moved
from nine hand-picked records to a biased random sampler and still cannot express a record whose
stored totals disagree with its bank — because both the pins and the generator hardcode
`tot: cards.length` and `cv: 1`, and the boot migration then re-derives everything else. Every
record it has ever driven is internally consistent by construction, and *inconsistent* records are
what a shipping content pipeline produces.

The other half is simpler and older: **two of the seven mechanical items were asserted with no arm
at all.** The tab bar and the goal fraction are the only two items in my scope with zero coverage
in the gate, and they are the only two items in my scope that are still broken. That correlation
has now held for three consecutive rounds, and it is the cheapest predictor in this appeal: an item
with an arm gets fixed and stays fixed; an item without one gets fixed in prose.

---

**Receipts** (durable, `D:/claude-workspace/appeal-directions/_ia/w1-r4-receipts/`):

| file | shows |
|---|---|
| `r4-phone-y1000-bar-says-today.png` | **D1** — TODAY marked while *Coverage by room* fills the screen |
| `r4-phone-bottom-bar-says-today.png` | **D1** — the same at the bottom of the page |
| `r4-goal-two-readouts.png` | **D2** — the fixed sentence and *"46 of 5 topics"* in one screenshot |
| `r4-upnext-over-every-probe-graded.png` | **D3** — *"Up next"* above *"Every probe here is graded."* |
| `r4-focus-keyboard-rerender.png` | §2.7 — the ring **surviving** the reset re-render |
| `r4-desktop-light/dark.png`, `r4-phone-light/dark.png` | the four states whole |
| `p1.json … p9.json` | every number above — cursor records, verdict classes, band/mark tables, the 1px census sweep, the 320 hero census, the fit sweep, the release record |
| `lib.cjs`, `p0-dom.cjs … p9-final.cjs` | the harness and every probe, re-runnable |

Nothing in this judgment depends on re-running anything; the JSON carries the output.

*Two of my own measurements were wrong before they were right, and I am recording both. My first
scroll sweep fought `scroll-behavior:smooth` and sampled mid-animation — thrown away and redone
instant-scrolled and settle-verified (§3.1 is the second pass). My first census and focus probes
scoped their selectors to `#home`, and `.hm-status`, `.hm-goal` and the desktop library all live
**outside** it — so both came back trivially clean. §2.6 and §2.7 are the re-runs against the real
mounts. A check that cannot fail reads exactly like a check that passed, on either side of the
table.*
