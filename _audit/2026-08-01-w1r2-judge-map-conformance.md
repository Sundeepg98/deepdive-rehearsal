<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (map-conformance lens, round 2), 2026-08-01, against appeal/home-instrument @ 074eca4.
     Preserved unedited as the record round 3 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-3 addendum). -->

# W1 JUDGE — MAP CONFORMANCE — ROUND 2

**Subject:** the FIXED built home of Deep Rehearsal, `appeal/home-instrument` @ **`074eca4`**
("the hero holds on every path, and the seams close"), worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`, driven from
`deepdive_content_pipeline_rehearsal.html` (byte-identical to `dist/index.html`, tree clean).
**Lens:** one only — does the built home honour the adopted flow map (`_ia/ADOPTED.md`,
`_ia/zonemap-flow.md` §Z1/§Z2, `_ia/zonemap-library.md` §0.1 RULE L2 / RULE L3).
**Method:** driven live at 1280×800, 1279×800, 1024×800, 900×800, 420×844, 390×844 and 360×640 on
the receipts' exact `SEED`, plus cold, perfect, tie, walk-resume and eight constructed tier records.
Where a defect is charged as a regression it is confirmed **differentially against master
`1c533d7`** in the same run. Every number below is measured on `074eca4`, not read off the addendum.
Shots: `_ia/w1-r2-shots/`.

## VERDICT: **BLOCKING**

All three of my round-1 defects are genuinely closed — defect 1 and defect 2 cleanly, defect 3 in
its wording. But two of the six fresh defects are not polish: **F1** kills every room control on
the home at every width below 1280 (a regression against master, six live buttons that do nothing),
and **F3** makes the wave's own signature element state a falsehood that its own rails contradict
on the same screen. Both ride in on this round's fixes or on this wave's own rewrite. A wave whose
thesis is "the home joins the application" cannot ship an application whose room navigation is dead
outside one viewport width.

---

# PART 1 — THE ROUND-1 DEFECTS, RE-MEASURED

## DEFECT 1 — the library in the decision's vertical budget below 1280 → **CLOSED**

`.hm-libm` is now `<details>`, shipped closed (`home-view.js:453-456`). Re-measured at rest, same
seed, same widths as round 1:

| viewport | `#home` scrollHeight | `.hm-libm` height | share | round 1 |
|---|---|---|---|---|
| 1280×800 | 1807 | not rendered | **0%** | 0% |
| 1024×800 | 1800 | 48 | **2.7%** | 62.5% |
| 900×800 | 1717 | 48 | **2.8%** | 64.0% |
| 390×844 | 2576 | 48 | **1.9%** | 70.1% |

The phone home document is **2756px**, against **8151px** in round 1 and 7567px on master — this
build is now 4811px *shorter* than master's phone home, not 584px longer. RULE L3's "always
available, never occupying the decision's vertical budget" is met at rest, and the disclosure is
the app's own `.mcomp` precedent with its load-bearing half restored. Opening the drawer returns
61.0 / 61.2 / 68.9%, which is correct: that is a user-initiated act, not the decision's budget.

Confirmed structurally sound: no horizontal overflow at 1280/1024/900/390/**360**, and no nested
scroller inside the drawer (`.ix-scroll` has no max-height in this mount, so there is no scroll
trap). Content inside the closed drawer is `content-visibility:hidden` and **not focusable**
(`element.focus()` does not land) — so the 46 mirrored cards add no phantom tab stops.

## DEFECT 2 — the board's two cross-drill acts dark below 920px → **CLOSED**

`.hm-practicem` renders `Panels.actionsHtml()` in the work column at ≤919px
(`home-view.js:447`, `styles.css:2426-2434`). Measured visible-instance counts:

| viewport | `[data-cross="1"]` visible | `[data-cross="weak"]` visible | where |
|---|---|---|---|
| 1280×800 | 1 of 2 | 1 of 2 | rail |
| 1024×800 | 1 of 2 | 1 of 2 | rail |
| 900×800 | 1 of 2 | 1 of 2 | **column** |
| 390×844 | 1 of 2 | 1 of 2 | **column** |

Exactly one visible instance at every width — the 919/920 handoff is clean in both directions, with
no overlap window and no gap. Visible in the phone capture (`w1-r2-shots/phone-library-tab.png`).
Z2 keeps its two named acts at every form factor. The six `data-cross="group:<id>"` cram entries
are unaffected.

## DEFECT 3 — a completion count wearing the word "ready" → **CLOSED in wording, but see F2**

`panels.js:286` now reads `drilled + recalled`. Driven on a seeded fully-drilled + fully-recalled
record at 1280 and 390: the word "ready" appears **zero** times on the home in either form factor.
The L2 charge — coverage rendered as a readiness verdict — is answered, and answered in the
grade-mark vocabulary rather than by deletion. The gauge keeps the readiness question alone.

**The word is fixed; the fix broke the card.** See **F2**.

## The certifications from round 1 that still hold

Re-checked, not assumed:

- **Z1's hard floor** — exactly one `[data-autofocus]` at 1280/1024/900/390; `document.activeElement`
  is `.hm-cta`; Enter → `#caching/drill`; the resume sentence carries "probe 11 of 21" through
  `posRestore`. Intact on every record I drove, including cold, perfect and tie.
- **Z1's register** — one bordered control in the column. The `.hm-act` → `.hm-do` rename did land;
  the phantom wrapper is gone.
- **L2 on the wave's own furniture** — census, rooms and gauge header still name their own units.
  "Coverage by room" is a strict improvement over "Choose a room" on the L2 axis.
- **The DOOR/SPINE fork (§4 ruling 1)** — `pickRec`/`flowRec`/`nextUp`/`flowGo` still 0 occurrences.
  Correctly left alone.
- **Landmarks** — one exposed `<main>` (the app's `main.stage` is `display:none` on this route), one
  `role="banner"`, one rendered `h1`. The skip link is off-screen, visible on focus at [11, 8, 197],
  and moves focus into the work column. All clean.

---

# PART 2 — FRESH DEFECTS

## F1 — **BLOCKING.** Every room control on the home is inert below 1280px

`home-view.js:552-560`

```js
function scrollToRoom(gid) {
  var host = (lib && lib.querySelector('.ix-group[data-group="' + gid + '"]')) ||
    (el && el.querySelector('.ix-group[data-group="' + gid + '"]'));
```

`lib` is `#homelib`, which lives inside `.companion` — `display:none` below 1280 (`styles.css:1209`).
`#homelib` is rendered unconditionally (`home-view.js:476-479`), so `lib.querySelector` **always**
returns a node and the `||` fallback to the visible column copy **can never fire**. Below 1280 the
handler then calls `scrollIntoView()` and `focus()` on elements inside a `display:none` subtree.
Both are no-ops. Nothing happens at all.

Measured — click the third visible `[data-room]`, seeded, then read scroll position and focus:

| viewport | visible room buttons | where | scrollY after | focus after |
|---|---|---|---|---|
| 1280×800 | 12 | rail + column | **90** | `.ix-card` ✓ |
| 1279×800 | 12 | rail + column | **0** | `.hm-cta` ✗ |
| 1024×800 | 12 | rail + column | **0** | `.hm-cta` ✗ |
| 900×800 | 6 | column | **0** | `.hm-cta` ✗ |
| 420×844 | 6 | column | **0** | `.hm-cta` ✗ |
| 390×844 | 6 | column | **0** | `.hm-cta` ✗ |

**Differential against master `1c533d7`, identical seed, same click:**

| | master | `074eca4` |
|---|---|---|
| 900×800 | scrollY **2687**, focus `.ix-card` | scrollY **0**, focus unmoved |
| 390×844 | scrollY **4407**, focus `.ix-card` | scrollY **0**, focus unmoved |

Master's handler searched the work column **only** (`git show 1c533d7:src/scripts/app/home-view.js`,
`onRoom:` at :230 — `var sec = el.querySelector(...)`). The wave replaced it with the
companion-first lookup in `e07e2a5` and neither round touched it since.

The **1–6 room hotkeys** are the same casualty: `openRoomByIndex` clicks the rail's room rows,
which route to the same function. Pressing `4` scrolls at 1280 and does nothing at 900 or 390.

**Why this is my headline.** Z2's contents name "Coverage by room — the six rooms with per-room
bars… **and the room keys 1–6 on the home**" (`zonemap-flow.md:135`), and RULE L3 names "the room
grouping" as one of the shelf's four sanctioned expressions (`zonemap-library.md:71-75`). At 1024
the rail lists six rooms with counts, dots, hover states and focus rings, and every one of them is
dead. At 390 the six "Coverage by room" cards are dead. That is not a demotion — round 1's defect 2
was honestly a demotion, because the acts survived in the index overlay. This is **six live,
focusable, styled controls that do nothing**, at every width the receipts do not cover, and it is
the exact charge this wave levelled at its own phone hamburger: *"A false affordance is worse than
no mark"* (`styles.css:2466-2470`).

Round 2 also removed the last accidental repair path: even if the `||` fallback fired, the column's
`.ix-group` nodes now sit inside a **closed** `<details>` whose content is `content-visibility:hidden`,
so `scrollIntoView` would land on a collapsed row and `focus()` would still fail (measured).

**Fix:** prefer the visible mount. `var host = [lib, el].map(h => h && h.querySelector(sel)).find(n => n && n.offsetParent)` — or simply search `el` first, which is what master did. If the
`<details>` is the host, open it before scrolling.

## F2 — **BLOCKING-adjacent.** The `ready` → `drilled + recalled` fix overprints the topic title

`panels.js:286` widened the badge from 5 characters to 18. The badge is absolutely positioned,
`white-space:nowrap`, **transparent background**, and pushed a further 36px inboard by the round-1
reset-button fix:

```css
.ix-c-badge{position:absolute;top:var(--space-10);right:var(--space-11);…;white-space:nowrap}   /* styles.css:1706 */
.ix-cell:has(.ix-c-reset) .ix-c-badge{right:var(--space-36)}                                     /* styles.css:1707 */
```

`.ix-card` reserves no right padding for it (`padding-right:13px`), so the badge paints *over* the
card's flow content. Computed: `background-color: rgba(0,0,0,0)` — there is no plate; it is text on
text.

Measured with every topic seeded to drilled+recalled, companion column at 1280:

| | |
|---|---|
| badges rendered | 46 |
| **badges whose box overlaps `.ix-c-name`** | **28 (61%)** |
| worst overlap | **88px** — "Error Propagation Across Services" |
| identical in dark theme | yes (32px / 0 / 6px on the first three, both themes) |

It is worse on the **Topic index overlay** (`\`), which shares `topicCard()`: cards are 234px there
and "Event-Driven Backbone", "Change Data Capture" and "Real-Time Delivery" are all overprinted
mid-word (`w1-r2-shots/index-overlay-1280.png`). That overlay is one of RULE L3's four sanctioned
expressions of the shelf, and it is also the surface my round-1 defect 2 pointed at as the phone's
fallback — so the fix for defect 3 damaged the escape hatch I credited for defect 2.

Evidence: `w1-r2-shots/companion-all-ready.png` — "Stream and Batch Processing" has the badge's
bullet sitting inside the letter "g" of its own title.

This is squarely a round-2 introduction. The round-1 badge ("ready") was 5 characters and cleared
every title. Two fixes landed on the same 36px of corner in the same round — the reset-button
inboard shift (`styles.css:1707`, added this round) and the 3.6× wider string — and neither was
measured against the other.

**Fix:** the badge needs a floor, not a corner. Either give `.ix-card` a `padding-right` that
reserves the badge's width, or put the badge in flow as the card's first row, or shorten the
string to something that fits the reserved corner (`drilled + recalled` → `recalled` beside the
existing `done`, or the ✎ mark the other states already use).

## F3 — **BLOCKING.** The gauge's new tie-guard prints sentences its own rails refute

`altitude.js:94-96` (new this round):

```js
if (shares.length > 1) {
  shares.sort(function (x, y) { return x.share - y.share; });
  if (shares[0].share < shares[1].share) thin = shares[0].tier;
}
```

The guard tests only the **two lowest** rails. `home-view.js:366-374` then consumes `thin === null`
as a licence to make a claim about **all three**, and reads its percentage from `model.order[0]`
(always Staff) alone:

```js
var lvl = Math.round(model.tiers[model.order[0]].solid / model.tiers[model.order[0]].n * 100);
verdict = lvl >= 100
  ? '<b>Every rail is full.</b> Solid on all ' + model.totals.n + ' probes across all three tiers…'
  : '<b>The rails are level.</b> All three tiers sit at ' + lvl + '% solid…';
```

A tie between the two lowest rails does not mean the rails are level. Three reproductions, driven
live at 1280:

| record | rails the gauge itself renders | sentence the gauge prints |
|---|---|---|
| Staff 100%, SDE3 0%, SDE2 0% | `310/310 · 100%` · `0/359 · 0%` · `0/302 · 0%` | **"Every rail is full. Solid on all 972 probes across all three tiers — there is no thin rail left to name."** |
| Staff 40%, SDE3 0%, SDE2 0% | `124/310 · 40%` · `0/359 · 0%` · `0/302 · 0%` | **"The rails are level. All three tiers sit at 40% solid, so no one level is behind the others yet."** |
| Staff 50%, SDE3 90%, SDE2 50% | `155/310 · 50%` · `323/359 · 90%` · `151/302 · 50%` | **"The rails are level. All three tiers sit at 50% solid…"** |

`w1-r2-shots/gauge-false-full.png` is the first row: a 190px element that contradicts itself three
ways at once — its own header reads **"310 SOLID OF 972"**, two of its three rails are drawn
visibly empty, and the sentence underneath says every rail is full. The census bar at the frame's
foot says "310 solid" too.

Reachability is not exotic. The bottom-two-tie case fires on **any record with zero solid probes at
two tiers and some at the third** — an ordinary early-user state, and precisely the state the
instrument exists to name. `graded === 0` catches only the fully cold record, so the moment a user
banks their first Staff probe with nothing solid below it, the gauge tells them no level is behind.

This is the round-2 fix inverting itself. Bounce item 8 says the guard exists so that "all-zero,
level and perfect records each get a sentence that is true instead of an accusation the record
cannot support." It removed two unearned **accusations** and introduced an unearned **assertion**,
and the assertion is worse: an accusation is a judgement the reader can discount, while
"every rail is full" is a statement of fact the reader can check against the picture directly above
it, and it fails.

Related, same mechanism, milder: with Staff 100% / SDE3 60% / SDE2 60% the two lower rails print
`215/359 · 60%` and `181/302 · 60%` — identical at the instrument's own stated precision — and the
gauge names **SDE3** the thin rail on a 0.046-percentage-point difference the reader cannot see.
The guard's strict `<` on raw floats fires on differences the instrument does not render.

**Fix:** the guard's conclusion must match its premise. Compute the thin **set**, not the thin
tier, and let the copy say what it knows: name all rails that share the minimum ("Staff and SDE2
are the thin rails"), and reserve "every rail is full" for `totals.solid === totals.n`. Compare on
the **rendered** precision, not raw floats.

## F4 — **FIXABLE.** The phone's LIBRARY tab lands on a closed drawer

`home-view.js:543`:

```js
var sel = { top: '.hm-continue', alt: '.hm-alt', lib: '.hm-libm' }[key];
…
node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
```

The round-2 fix closed `.hm-libm`; the tab that names it was not told. Driven at 390×844:

| | |
|---|---|
| tap `LIBRARY` | `details.open` = **false** |
| where it lands | summary top = **436** of an 844 viewport (the document runs out of scroll first) |
| tab state | `aria-current="true"` on **Library** |
| what is below it | the skip checkbox, the footer, and ~350px of empty page |

`w1-r2-shots/phone-library-tab.png`. The user taps the tab named "Library", the tab marks itself
current, and the library is not on the screen — a second, undiscovered tap on the summary row is
required. In round 1 this tab worked (the block was expanded); it is a regression introduced by the
fix for my own defect 1.

RULE L3 requires the shelf be "always available." A tab that claims the destination and delivers a
closed drawer parked mid-screen is not availability; it is the same false-affordance class as F1.

**Fix:** one line — `if (node.tagName === 'DETAILS') node.open = true;` before `scrollIntoView`.

## F5 — **FIXABLE.** The scroll-top disc stops tracking `--chrome-bot` on the phone home

Bounce item 6 added, outside any media query (`styles.css:2387`):

```css
html[data-view="home"] .scrolltop{bottom:calc(var(--space-30) + var(--space-24))}
```

Specificity (0,2,1). The phone rule it lands on is `@media(max-width:919px){ .scrolltop{bottom:calc(var(--chrome-bot) + var(--space-24))} }` (`styles.css:1462`, specificity (0,1,0)) — whose
whole design is that the disc tracks the **measured** bottom chrome: *"No env() term: --chrome-bot
already carries the inset."* The new rule wins at every width, so on the home the disc is now a
constant 54px and the measurement is discarded.

Measured at 390×844, scrolled:

| | disc bottom | tab-bar top | gap |
|---|---|---|---|
| no safe-area inset | 790 | 799 | +9px |
| with a 34px inset on `#hometabs` (exactly what `env(safe-area-inset-bottom)` supplies) | 790 | 765 | **−25px** |

`--chrome-bot` correctly re-measured to **79px** in the second run — the measurement path is alive;
the disc is the part that stopped listening. On any phone with a home indicator or gesture bar the
disc sits 25px inside the fixed tab bar. The desktop overlap the fix was written for is genuinely
gone (measured 0px at 1280 and 900); it was paid for on the phone.

The addendum's claim that this is "the same mechanism the phone case already used" is not accurate:
it is a constant that **overrides** that mechanism.

**Fix:** scope the new rule to the desktop case — put it inside `@media(min-width:920px)`, or write
it as `bottom:calc(var(--chrome-bot, 0px) + var(--space-30) + var(--space-24))` so it composes with
the measurement instead of replacing it.

## F6 — **FIXABLE.** The walk resume path heroes a probe from a pane the user was not in

`home-view.js:125-137`. `heroQuestion()` now reads the drill cursor on **every** path, including
when the resume pointer names another pane. Driven on a walk-resume record (`nav.last.view = 'walk'`,
`pos = {drill:10, walk:4}`):

| element | renders |
|---|---|
| `h1#hm-ask-h` | "Where you stopped · Caching Strategies" |
| `.hm-q` | **"What is the race between a read and a write in cache-aside?"** — bank card 11 of 21 |
| `.hm-since` | "…and stopped at **step 5 of 9**. 9 still ungraded." |
| `.hm-cta-d` | "Walkthrough" |
| Enter lands on | `#caching/walk` |

The panel headed *"Where you stopped"* quotes, in curly quotes, a question from a 21-item collection
the user was not in, one line above a sentence stating a position in a different 9-item collection,
above a button that opens the second. The two counts prove they are different objects.

Round 1's finding on this path was that the hero quoted the topic **thesis** — a declarative
sentence nobody spoke. The fix guarantees the hero is *a* question; it does not make it *the*
question. And it reopens what bounce item 4 claims to have closed: the panel again carries two
positions, one in prose and one silently encoded in the hero.

I record that this is the least severe of the six and the most arguable — the builder's stated
model ("the hero is a pointer back into the interrogation") is coherent. But the pointer points
somewhere Enter does not go, under a heading that says otherwise.

**Fix:** hero the probe only when the resume cursor is a drill cursor; on other panes either drop
the quotation framing or relabel the block so it does not claim to be where you stopped.

---

## Also observed, not charged

- **The 420–919px band has no room nav, no Practice section, no Topic-index entry and no tab bar.**
  The rail's `.hm-rsec` is hidden at ≤919 but `.hm-tabs` only appears at ≤419, so between those two
  widths the only route to the index is the `\` key. `.hm-practicem` restores the two cross-drill
  acts but not the index row. The weekly goal survives in the column via `.hm-tele`, so nothing is
  lost outright — but this band is the one the fix's breakpoint choice creates, and nobody has
  driven it. Recording it because F1 lives there too.
- **"7 of 5 topics drilled this week · Goal met — nice work."** — unchanged from round 1; still the
  metric R14 exists to indict, still ~200px under the gauge. Not this wave's to price.
- **The library drawer's heading demoted to a `<span>`** inside `<summary>` (`home-view.js:454`), so
  below 1280 the library block has no heading in the tree. The summary's own accessible name
  ("All topics 46 across six rooms") carries it. Clears.
- **92 topic-card buttons still in the document at all times.** Unchanged; the closed drawer makes
  it cheaper (no layout, not focusable) but the duplication stands. Not a conformance defect.

## Confidence and limits

High confidence on F1, F2, F3 and F4: each was reproduced live on the committed deliverable at
named viewports, F1 and F2 with paint-level evidence, F1 differentially against master, F3 with
three independent constructed records. F5's mechanism is proven (specificity, the live re-measure of
`--chrome-bot` to 79px, and the resulting −25px) but the 34px inset was injected rather than
supplied by a real device; I did not test on hardware. F6 is proven as a fact and argued as a
defect — a reasonable judge could leave it uncharged.

Not covered: I did not re-run the gate, did not verify any topic route, drove dark theme only on
the badge and gauge, and did no screen-reader pass. This judgment is the `#home` route.

*Judge: map-conformance lens, W1 round 2 of the appeal campaign, 2026-08-01. Shots and harnesses:
`_ia/w1-r2-shots/`.*
