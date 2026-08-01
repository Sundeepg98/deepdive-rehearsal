<!-- VERBATIM COPY. Authored by an independent judge/verifier of the appeal campaign
     (map-conformance lens), 2026-08-01, against appeal/home-instrument @ 532a1a6.
     Preserved unedited as the record round 2 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-2 addendum). -->

# W1 JUDGE — MAP CONFORMANCE

**Subject:** the BUILT home of Deep Rehearsal, branch `appeal/home-instrument` (`532a1a6`), worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`.
**Lens:** one only — does the built home honour the adopted flow map (`_ia/ADOPTED.md`,
`_ia/zonemap-flow.md` §Z1/§Z2, and the rule lifted verbatim from `_ia/zonemap-library.md` §0.1).
**Method:** the built deliverable driven live at 1280×800, 1024×800, 900×800 and 390×844 on the
*exact* seeded returning-user record the receipts used (`appeal-directions/_home-i/receipts.cjs`
`SEED`), plus a cold record and a Staff-strong record. Every number below is measured, not read off
a document.

## VERDICT: **FIXABLE** — three named defects, none blocking

The spine is right and the hard floor is intact. All three defects live below 1280px, on the two
form factors the spec never receipted.

---

## What holds (certified, with the measurement)

### THE DOOR (Z1) — the hard floor is preserved, exactly

Z1's floor is *"1 keystroke, 0 clicks, autofocused, landing on the exact cursor. Any direction that
costs this loop is a regression regardless of what it buys"* (`zonemap-flow.md:114`).

| assertion | measured |
|---|---|
| exactly one autofocus | `document.querySelectorAll('[data-autofocus]').length === 1` at 1280 / 1024 / 900 / 390 |
| it is the resume act | `document.activeElement` = `.hm-cta`, text *"Resume · Caching Strategies · Probe Drill · probe 11 of 21"* |
| one keystroke, zero clicks | `#home` → **`#caching/drill`**; `.stage` computed display flips `none` → `flex` |
| lands on the exact cursor | sub-line *"probe 11 of 21"*, computed through `posRestore` (`home-view.js:96-110`) |

Z1's *"one focused control; everything else visibly subordinate… no competing CTA, no second
autofocus, no telemetry above it"* also holds. The first block in the work column is
`.hm-continue` at **y=28** (desktop) / **y=68** (phone) at every width; `.hm-lead` renders on the
cold branch only (`home-view.js:348`); the status census sits at the frame's **foot** (top=771 in an
800px viewport). The Chanel cut (freeze §7b) removed the saturated slab, so the CTA is now the only
bordered control in the column — Z1's "quiet, singular, imperative" register, met.

`storage-notice.js:18` appends to `document.body`, so Z1's degraded-persistence banner survived the
route becoming a shell tenant. Checked because the map assigns it to the door.

### The DOOR/SPINE fork (§4 ruling 1) is correctly left alone

`pickRec` / `flowRec` / `nextUp` / `flowGo` still appear **0 times** in `home-view.js` and
`panels.js`. §5.1 names that as a live defect, but §4 ruling 1 is one of the five boundary calls the
map explicitly *holds open* (§8: *"Held deliberately open: everything in §4 and §6"*), and
`CHOSEN.md` chose the other branch. Unchanged is the conformant answer here, not a miss.

### "coverage is SHAPE, never VERDICT" — the wave's own furniture is clean

Every number this wave introduced names its own unit and stops there:

- census — *"291 of 972 probes graded · 213 solid · 51 shaky · 27 missed · 19 of 46 topics started"*
- rooms — *"100% drilled"*, *"57% drilled"*, *"7 weak"* — **drilled**, never *ready*
- gauge header — *"Altitude — solid probes by interview tier"*, *"213 solid of 972"*, rails
  *"25 / 310 · 8%"*

The gauge is the one object that could have crossed the line, and it does not. L2 defines readiness
as *level-against-tier* — which is precisely what the gauge measures — and the generated sentence
reports **rehearsal**, not readiness:

> **Staff is the thin rail.** 25 solid of 310 probes, across 7 of 46 topics — the level you are
> interviewing for is the one you have rehearsed least.

Naming which rail is thin is the direct analogue of L2's explicitly permitted *"which rooms are
thin."* No hire verdict, no readiness score, no coverage percentage relabelled as a judgement. Two
adversarial records confirm the copy is honest rather than lucky:

- **cold** (0/972): refuses to accuse — *"Nothing graded yet. Each rail is one interview tier…"*
  (`home-view.js:293-295`). Verified live.
- **Staff-strong** (Staff 65%, SDE3 65%, SDE2 0%): correctly re-points — *"SDE2 is the thin rail."*
  The instrument follows the record, not a hard-coded story.

### THE BOARD (Z2) — fully served at ≥920px

Rail: 6 rooms with counts, Cross-topic drill, Weak-spot review (7), Topic index, weekly goal bar.
Column: the gauge, 6 weak chips carrying **count + age + concept tail**, the goal strip, "Choose a
room" with six four-state coverage bars. Companion: the library with a per-room `Cram →`
(`data-cross="group:<id>"`). All three cross-drill modes present, `dueReview` and the trend wired.
Z2's register — *"counts and ages, not prose"* — is met, and it sits **below and beside** the door,
never above it.

### L3 at the spec'd viewport

At **1280×800**: `.hm-libm` is `display:none`; the 46-card library lives in `.companion` (320px,
`position:sticky`, its own scroll). `#home` scrollHeight = **1805px**. The decision owns the column
outright. This is exactly RULE L3's *"persistent frame, not a scroll block."*

---

## DEFECT 1 — below 1280px the library is back in the decision's vertical budget, at the same 65% the rule was written to kill

**FIXABLE.** `styles.css:2367-2370`

```css
.hm-libm{display:none}
@media(max-width:1279px){
  html[data-view="home"] .hm-libm{display:block}
}
```

`home-view.js:361` renders the full 46-card library into the **work column** as well as into the
companion. Below 1280 the companion is off (`styles.css:1209`, pre-existing) and the column copy
switches on — so the shelf returns to the decision column as an expanded scroll block.

| viewport | `#home` scrollHeight | `.hm-libm` | share | starts at |
|---|---|---|---|---|
| 1280×800 | 1805px | not rendered | **0%** | — |
| 1024×800 | 4418px | 2763px | **62.5%** | y=1434 |
| 900×800 | 4128px | 2641px | **64.0%** | y=1302 |
| 390×844 | 7976px | 5590px | **70.1%** | y=2201 |

RULE L3's own indictment was *"the 46-card library occupies y=1187→3405 of a 3405px home, ~65% of
the home's scroll height"* (`zonemap-library.md:66-68`), and the rule it produced is verbatim:
*"always available, **never occupying the decision's vertical budget**"* (`:71-75`). Flow's
candidate 12 prices the same block. **62.5 / 64.0 / 70.1% is that finding, reproduced** — on the
phone it is 5.1 points *worse* than the number that generated the rule. Corroborating: the phone
home document grew from **7567px** (master `1c533d7`) to **8151px** — the wave that set out to stop
the home reading as a document made the phone document 584px longer, and 5590 of those 8151px are
catalogue.

Seen at 1024, the cost is plain: the rail lists the six rooms down the left while the column repeats
the same six room headings inside "All topics", and the scroll-to-top FAB appears — the tell of a
page that scrolls like a document.

**Why this is fixable and not a judgement call.** The code comment directly above the offending rule
names the right pattern and then drops its load-bearing half:

> `.companion` is display:none below 1280, so `#homelib` goes with it. The app already solves this
> exact problem the same way: `<details class="mcomp">` mirrors the companion's coaching for the
> phone… This is that pattern, one surface over. — `styles.css:2362-2366`

`.mcomp` is a **collapsed** disclosure. `.hm-libm` is `display:block`, fully expanded, all 46 cards.
Two one-element fixes, either of which satisfies L3 at every width: wrap `.hm-libm` in the same
`<details>`, or point the phone's LIBRARY tab at `IndexOverlay` (already the INDEX tab's target, and
an L3-sanctioned expression) and drop the block. R12's counter — *"cold users have no other way to
see the shape of the corpus"* — is answered by this same wave: "Choose a room" renders in the column
at **every** width (6 rooms visible at 390).

Supporting cost: 92 topic-card buttons exist in the document at all times (46 companion + 46
in-column), one set always `display:none`.

## DEFECT 2 — below 920px the home's board loses Cross-topic drill and Weak-spot review

**FIXABLE.** `styles.css:2387-2388`

```css
html[data-view="home"] .hm-rail .hm-rsec,
html[data-view="home"] .hm-rail .hm-goal{display:none}
```

The wave moved both entries out of the work column and into the rail (`home-view.js:146,148`), and
those are the **only** home-surface producers of `data-cross="1"` / `data-cross="weak"`
(grep-verified across `src/`). The phone rail hides its whole `.hm-rsec`, so both go dark — along
with the rail's Rooms nav and the weekly-goal bar.

Measured, seeded identically, at 390×844:

| | master `1c533d7` | `appeal/home-instrument` |
|---|---|---|
| `[data-cross="1"]` | **visible** in the work column | in DOM, **`display:none`** |
| `[data-cross="weak"]` | **visible** in the work column | in DOM, **`display:none`** |

Master rendered `Panels.actionsHtml()` in the column at every width
(`git show 1c533d7:src/scripts/app/home-view.js`); the appeal build does not. This is a
**regression introduced by this wave**, on the two controls Z2 names as its own: *"**Cross-topic
drill**, all three modes… the entry lives here"* and *"'Weak-spot review' action"*
(`zonemap-flow.md:135-136`), against evidence that *"three of the four six-week regimes are
cross-topic"* (`:143`).

Not a dead end — I drove it: the phone's INDEX tab opens `IndexOverlay`, which renders
`Panels.libraryHtml(Panels.actionsHtml())` (`index-overlay.js:34`), and both entries appear there,
visible. So the honest severity is **a two-act demotion off the board**, not a loss. It is still a
deviation: the map's candidate 15 counts the home mount as one of only two `CrossDrill` mounts in
the app, and removing it leaves the phone's most on-thesis returning-user action reachable only
through the addressing overlay.

Fix is cheap and does not disturb the desktop: render `Panels.actionsHtml()` in the column below
920px (a `.hm-rsec` mobile twin), or give the phone tab bar a PRACTICE tab.

## DEFECT 3 — a completion count wearing the word "ready", on the home, at both form factors

**FIXABLE — inherited, but this wave promoted it.** `panels.js:279-281`

```js
else if (_st === 'solid') _bdg = _wbFull
  ? '<span class="ix-c-badge ix-c-ready"><i …></i>ready</span>'
```

A topic card whose drill is fully graded **and** whose whiteboard is fully recalled renders a badge
that reads **`ready`**. Its entire evidence is `done === tot && wb.got >= wb.total` — two completion
counts. That is coverage rendered as a readiness verdict, which is the named failure verbatim:
*"Where have I been and am I ready are two questions"* (`zonemap-library.md:60-64`).

Seeded one topic to that state and drove it: **visible on the home at 1280** (companion column) and
**visible at 390** (in-column library). Both form factors.

`git diff HEAD~2 HEAD -- src/scripts/app/panels.js` shows the wave did not touch this line — it is
pre-existing. But the wave is what made the library a permanent fixture beside the decision, and it
is what put the app's genuine level-against-tier instrument ~1000px above it. The screen now says
both things at once: the gauge says *"the level you are interviewing for is the one you have
rehearsed least"*, and a card in the adjacent column says *"ready."* One word, one fix — `done both
ways`, or the grade-mark vocabulary this wave already adopted (solid / broken / hollow).

---

## Also observed, not charged

- **`"Goal met — nice work."`** (`panels.js:135`) — praise attached to a topics-touched count, ~200px
  below *"you have rehearsed [your tier] least."* It is a verdict on **effort**, not on readiness, so
  it clears L2 as written; but it is the metric R14 exists to indict, and it now contradicts the
  gauge on one screen. Recording it for whoever prices R14, not charging it against W1.
- **Cold-branch gauge legend** — *"the shortest rail is the level you are least ready for"* is the
  instrument's key, shown when all three rails are 0% and there is nothing to judge. Reads to me as
  teaching the instrument, not rendering a verdict. Clears.
- **Tab order** — the CTA is the 13th focusable at 1280 (3 rail actions + 9 rail rows precede it).
  Irrelevant to the floor, which is autofocus + Enter and is verified intact; noted so nobody
  re-derives it as a finding.

## Confidence and limits

High confidence on all three defects: each was reproduced live on the built deliverable at named
viewports with the receipts' own seed, and defect 2 was differentially confirmed against master.
This judgment covers the `#home` route only, in light theme; I did not re-run the gate, did not
verify the topic route (the freeze's byte-identical baseline claim is taken on its receipt), and
judged appearance from the committed receipts plus my own 1024/390 captures.

*Judge: map-conformance lens, W1 of the appeal campaign, 2026-08-01.*
