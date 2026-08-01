<!-- VERBATIM COPY. Authored by an independent judge of the appeal campaign
     (the-complaint lens, round 2), 2026-08-01, against appeal/home-instrument @ 074eca4.
     Preserved unedited as the record round 3 was executed from; the builder's
     response is _audit/2026-07-31-appeal-home-freeze.md (round-3 addendum). -->

# W1 — ROUND 2 JUDGE: THE COMPLAINT

**Subject:** the BUILT home of Deep Rehearsal, `appeal/home-instrument` @ **`074eca4`**
("the hero holds on every path, and the seams close"), worktree
`D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i` (clean at HEAD).

**Lens:** the-complaint. *"the frontend is not looking like an application… the visual design is
not appealing."*

**Round-1 record judged against:** `_audit/2026-08-01-w1-judge-the-complaint.md` (six named
defects). **Builder's response:** the round-2 addendum in
`_audit/2026-07-31-appeal-home-freeze.md`, from line 178.

---

## VERDICT: **FIXABLE**

The bounce did real work. **Four of my six defects are cleanly closed, and a fifth is closed in
substance.** The phantom card is gone, the resume line no longer contradicts itself, the badge no
longer paints over the reset button, the phone's fake hamburger is off, and the hero is a probe
question on every resume path I could construct. On the states the receipts capture, this is now
plainly an application, and a well-made one.

But I can name concrete defects, so it is not clean — and the two that matter most **rode in on the
fixes**:

1. The fix for my defect #3 turned the gauge's punchline from an unearned accusation into a
   **provably false statement of fact**, contradicted by the three numbers on its own panel. On one
   record it is a strict regression against round 1, which printed a true sentence there.
2. The fix for defect #1 clamped the hero to four lines. On the phone that clamp **deletes half the
   question** on 6.5% of the bank, including the app's own default topic — and the whole thesis of
   this wave is "the hero is the question."

Seven defects follow, ranked. None require redesign; all are local. The direction remains right.

Everything below was measured on the built file
(`deepdive_content_pipeline_rehearsal.html`, 12.2 MB, mtime matches HEAD) driven under Playwright at
**1280×800** and **390×844**, deviceScaleFactor 2, both themes, plus a 15-width sweep from 320 to
1440. Numbers are CSS px from `getBoundingClientRect` / `getComputedStyle`. Progress records were
seeded as `cv:2` content-keyed records through `CardId.forCards`, so nothing here rides on a record
shape the app would reject at boot. I re-derived every round-1 number rather than reading the
addendum.

---

## 1. THE ROUND-1 CHECKLIST, RE-MEASURED

| # | round-1 defect | round-2 status | evidence |
|---|---|---|---|
| 1 | Hero unbounded, usually not a question | **CLOSED in substance** (new consequence → F2) | below |
| 2 | The phantom `.hm-act` card | **CLOSED** | below |
| 3 | The verdict accuses on a tie | **CLOSED for 3 cases, RE-OPENED WORSE on a 4th** → F1 | below |
| 4 | The resume line contradicts itself | **CLOSED** | below |
| 5 | Library card paints a badge under the reset button | **CLOSED** (new overlap opened → F3) | below |
| 6 | The phone's brand mark reads as a hamburger | **CLOSED** | below |

### #1 — the hero. CLOSED in substance.

`heroQuestion()` (`home-view.js:125-141`) now reads the bank on every path. Driven with the resume
pointer set to `walk`, `drill`, `sys`, `model` and an unregistered view, and separately with **no**
stored drill position (so the `firstUngraded()` arm carries it):

| path | hero | panel h | signature top |
|---|---|---|---|
| walk (1280) | a real 224-char probe | **333.3** | `.hm-alt` at y **360.6** |
| walk, no stored pos (1280) | *"Product wants live video transcoding added…"* | 278.7 | y 306.7 |
| drill (1280) | the probe at the cursor | 333.3 | y 360.6 |
| sys / model (1280) | a real probe | 251.4 | y 360.6 |
| walk (390) | a real probe | 333.3 | y **432.3** |

Round 1's worst case was **826.6px = 103% of the viewport** with the gauge entirely below the fold.
It is now 333.3px and the gauge is on-screen at both breakpoints. No thesis reaches the hero on any
path I could reach. Confirmed closed.

Two corrections to the addendum's wording, neither a defect:

- **"every hero ends in a question mark" is an overclaim.** Censused across the whole bank:
  **52 of 972** probe questions do not end in `?` — they are imperatives (*"Defend the choice."*,
  *"Design something better."*, *"Describe batch processing and the MapReduce/Spark mental model."*).
  Those are still sentences an interviewer speaks, so the substance of the fix holds; the stated
  invariant does not. It was measured on four paths of one topic.
- Bank census, for the record: n = 972, median **62** chars, p90 105, p99 144, max **224**. Every
  topic has a bank (0 fall through the no-bank arm).

### #2 — the phantom `.hm-act` card. CLOSED.

The wrapper is `.hm-do` and it is layout only. Measured on the cold home and the engaged home, both
themes:

| property | value |
|---|---|
| tag / class | `DIV.hm-do` |
| border | **`0px none`** (light) / **`0px`** (dark) |
| background | **`rgba(0, 0, 0, 0)`** both themes |
| border-radius | **`0px`** |
| cursor | **`auto`** |
| min-height | **`0px`** |
| padding | `0px 24px 24px` |

Hovering the dead pad at the centre of the 368px gap to the right of the CTA: `elementFromPoint`
returns `DIV.hm-do`, `:hover` matches — and **nothing changes**. Border stays `0px`, cursor stays
`auto`, background stays transparent. The fake control is gone. Visible in
`r2-desktop-light.png` / `r2-desktop-dark.png`: one bordered pill, no second card.

The 368px of empty plate to the CTA's right is still empty. Round 1 raised that in §3 as context,
not as a ranked defect, and outside a border it reads as ordinary asymmetric white space. **Not
raising it.**

### #3 — the tie verdict. Closed for the three named cases; re-opened worse. → **F1**

`Altitude.compute()` now returns `thin: null` unless one rail is strictly thinnest, and the three
cases round 1 named are genuinely fixed:

- **all-zero** → *"Nothing graded yet. Each rail is one interview tier…"* — true.
- **perfect** (972/972) → *"Every rail is full. Solid on all 972 probes across all three tiers"* — true.
- **level** (all three at 50%) → *"The rails are level. All three tiers sit at 50% solid"* — true.

The fourth case — two rails tied at the minimum under a strictly higher third — was not enumerated,
and it is where the fix breaks. See F1.

### #4 — the resume line. CLOSED.

`tot` falls back to the bank length (`home-view.js:272`). With the resume pointer on a topic that
has **no** progress record at all (engaged via a different topic), the line now reads:

> *"You opened this topic and have not graded a probe in it yet. **22** of its 22 probes still ungraded."*

The old *"Every probe here is graded."* is gone. The two clauses agree. Confirmed closed.

### #5 — the badge over the reset button. CLOSED.

`styles.css:1707` — `.ix-cell:has(.ix-c-reset) .ix-c-badge{right:var(--space-36)}`. Measured across
**all 46 cards**, seeded so every status class is present (`in-progress` 12, `weak` 12, `solid` 11,
`solid + recalled` 11):

- **badge ↔ reset overlaps: 0** in the 1280 companion column.
- **badge ↔ reset overlaps: 0** in the 390 in-column twin.

(Round 1 measured 19px of overlap with *"weak"* printed across a 22px button.) Confirmed closed —
and note this is a two-line CSS fix that did not touch `topicCard()`, so `at_name_hygiene`'s
separators are untouched. Good instinct. But the same rule moved the badge 25px further left into a
reserve that did not grow → **F3**.

### #6 — the phone brand mark. CLOSED.

At 390×844, `.hm-mk` computes `display: none` — the three stacked `<i>` bars in the canonical
hamburger position are gone. `.hm-wm` renders **"Deep rehearsal"** at 101.2 × 16.5 with
`scrollWidth === clientWidth` (not clipped). The product is named and nothing pretends to be a menu.
Visible in `r2-phone.png`. Confirmed closed.

---

## 2. FRESH DEFECTS, RANKED

### F1. The gauge's punchline is provably false whenever the two lowest rails tie — and on one record this is a REGRESSION against round 1.

**Where.** `altitude.js:88-95` + `home-view.js:361-379`.

`compute()` returns `thin: null` on **any** tie for the minimum. `gaugeHtml()` then treats
`!model.thin` as *"the rails are level"* and takes its percentage from **`model.order[0]` — Staff
alone** — before asserting it of all three tiers. Two propositions are being conflated: *"no rail is
strictly thinnest"* and *"all rails are equal."* Those differ exactly when two of three share the
minimum.

**Measured, 1280×800, live:**

| record | rails as rendered | verdict as rendered |
|---|---|---|
| **3 solid probes**, all SDE2 | Staff `0 / 310 · 0%` · SDE3 `0 / 359 · 0%` · **SDE2 `3 / 302 · 1%`** (1 lit segment) | *"**The rails are level.** All three tiers sit at **0%** solid, so no one level is behind the others yet…"* |
| every SDE2 probe solid | Staff `0%` · SDE3 `0%` · **SDE2 `302 / 302 · 100%`** | *"**The rails are level.** All three tiers sit at 0% solid…"* |
| every Staff probe solid | **Staff `310 / 310 · 100%`** · SDE3 `0 / 359 · 0%` · SDE2 `0 / 302 · 0%` | *"**Every rail is full.** Solid on all **972** probes across all three tiers — there is no thin rail left to name."* |

Receipt: **`w1-r2-receipts/crop-every-rail-full2.png`**. In one 1248×502 crop the panel says all of
this simultaneously:

- header: **"310 SOLID OF 972"**
- SDE3 rail: **completely empty**, `0 / 359 · 0%`
- SDE2 rail: **completely empty**, `0 / 302 · 0%`
- verdict: **"Every rail is full. Solid on all 972 probes across all three tiers."**

and the status census at the frame's foot reads *"310 of 972 probes graded."* Three numbers on the
same screen contradict the sentence between them.

**It is a regression.** Round 1's code was
`if (thin === null || (a.solid/a.n) < (tiers[thin].solid/tiers[thin].n)) thin = TIERS[i];`
over `['Staff','SDE3','SDE2']`. On that last record it yields `thin = 'SDE3'` and prints
*"SDE3 is the thin rail. 0 solid of 359 probes…"* — **true**. The fix converted a true sentence
into a false one. My round-1 finding was "the punchline must not be provably false"; it is now
provably false in a way it was not before.

**Reachability is not exotic.** Any record whose grades so far land in fewer than all three tiers
hits the tie. **Three probes** is enough to make the rendered percentages disagree with the
sentence, and a user who works the first probes of a topic in bank order will commonly have graded
one or two tiers only. This is a first-session state.

**Nothing can catch it.** `grep -rn` across `test/` finds **zero** references to `hm-verdict`,
`"thin rail"`, `Altitude.`, `hm-gr` or `hm-seg`. `home_rhythm.py` mentions `.hm-alt` only to assert
its margin token. The signature's punchline — the one sentence the whole instrument exists to
deliver — has no arm that can fail. The addendum asserts the fix ("all-zero, level and perfect
records each get a sentence that is true") with no check behind it, and the absence of that check is
why the fourth case was never enumerated.

**Fix (local).** Return the shape, not a nullable name: e.g. `{thin, level:boolean}` where `level`
is true only when **every** rail shares the share; and take the displayed percentage from the tied
set rather than from `order[0]`. Then plant all four cases as fixtures — the fourth is the one that
must go red.

---

### F2. The 4-line hero clamp cuts the question off — half of it, on the phone, on the app's own default topic.

**Where.** `styles.css:2215-2218` — `.hm-q{ … -webkit-line-clamp:4; overflow:hidden}`. No `title`
attribute, no expand affordance.

The clamp is the right instinct — it is what bounds the worst case round 1 measured at 103% of the
viewport. But it was sized against the desktop measure only, and it lands on the one element whose
entire job is to carry a complete question.

**Measured by rendering all 972 probe questions into a clone of the live `.hm-q` box:**

| | desktop (556.2px box) | phone (312px box) |
|---|---|---|
| cap | 109px = **3.99 lines** | 109px = **3.99 lines** |
| median probe | 2.00 lines | 3.00 lines |
| p90 | 2.00 | **4.00** |
| max | **5.00** | **8.00** |
| **probes exceeding the clamp** | **1 of 972 (0.1%)** | **63 of 972 (6.5%)** |

- **Desktop.** The one that overflows is `content-pipeline` — the app's default first-registered
  topic, and the deliverable's own namesake (`deepdive_content_pipeline_rehearsal.html`). Rendered
  (`w1-r2-receipts/crop-desk-hero2.png`), the hero reads:

  > *"You need to ship a change to this pipeline — say a new field in the import format, or a change
  > to how a handler writes records — while it's processing live traffic. How do you roll it out
  > without downtime or corrupting…"*

  The object of the question, its question mark and its closing quote are all gone. The reader gets
  a scenario and no question.

- **Phone.** Live on the same topic: `scrollHeight 218` vs `clientHeight 109` — **exactly 50% of the
  hero is hidden**. Rendered (`w1-r2-receipts/crop-phone-hero.png`):

  > *"You need to ship a change to this pipeline — say a new field in the import format, or a change
  > to how a handler writ…"*

  At p90 = 4.00 lines the clamp is sitting **on** the distribution, not above it: 1 hero in 15 is a
  fragment, and the part that goes is always the end — which is always where the question is.

**The comment in the stylesheet is false on disk.** It reads: *"Four lines covers every probe in the
bank at this measure with room to spare."* Measured: one probe at 5.00 lines at 556px, and 63 probes
up to 8.00 lines at 312px.

**Fix (local, and it is a design call, not a bug).** The clamp should stay. What it needs is
something to clamp *to*: step `--font-size-heading` down one notch in the narrow column so 4 lines
buys more characters; or fall back to the probe's own `signal` / first sentence when the full text
would clip; or clamp by box rather than by a constant 4. Whatever the choice, the invariant to plant
is *the rendered hero ends in the probe's final clause*, censused across the whole bank at both
breakpoints — which is a check that can fail, and would have failed here.

---

### F3. The badge fix moved the badge onto the topic title.

**Where.** `styles.css:1707` (`right: 36px` when a reset exists) against `styles.css:1862`
(`.ix-c-name{padding-right:var(--space-50)}`), plus this round's copy change from `ready` to
**`drilled + recalled`** (`panels.js:286`).

Two round-2 changes compound. The badge moved **25px further left** (11px → 36px) to clear the reset
button, and the longest badge string **more than doubled** in width — measured **88.4px** for
`drilled + recalled`. The title's reserve did not move: it is still a constant 50px. So the badge
now occupies **124.4px** of the card's right side against a 50px reserve.

**Measured, 1280 companion column, 46 cards, all four status classes present — 4 cards overlap:**

| topic | badge | badge box | title ink | overlap |
|---|---|---|---|---|
| `developer-platform` | `drilled + recalled` (88.4px) | 1144.6 → 1233 | 985 → 1181.7 | **37.1 × 11.5px** |
| `debugging` | `drilled + recalled` | 1144.6 → 1233 | 985 → 1151.1 | 6.5 × 11.5px |
| `multi-region` | `10/21` | 1197.4 → 1233 | 985 → 1204.4 | 7.0 × 11.5px |
| `rules-engine` | `5 weak` | 1192.4 → 1233 | 985 → 1197.3 | 4.9 × 11.5px |

The two short badges overlapping by ~5-7px says the 50px reserve was **already at its limit** before
this round widened the object sitting in it. Not reproducible at 390 (the in-column twin's cards are
proportioned differently) — this is the desktop companion only, which is the surface this wave
promoted from behind-a-keystroke to permanent.

**Fix.** Reserve from the badge rather than from a constant: give the cell a grid/flex row so the
name and the badge cannot occupy the same track, or set the name's right padding from the badge's
measured width. A constant reserve against a variable-width absolutely-positioned label is the same
shape of bug as round-1 #5 — two things pinned to one corner by unrelated rules.

---

### F4. The status census loses its tail on every window between ~420px and ~690px.

**Where.** `#homestatus` — furniture **this wave added** ("live state at the frame's foot"). Its
content is 693px wide, does not wrap, and has no scroll affordance.

**Measured, sweeping the viewport:**

| width | census content | what is lost |
|---|---|---|
| ≥ 700 | fits (`scrollWidth === clientWidth`) | — |
| 640 | clipped | *"…nothing leaves this file"* — 37px off |
| **560** | clipped | *"· nothing leaves this file"* — **117px off** |
| 480 | clipped | *"Offline · nothing leaves this file"* **entirely off** (197px) |
| **420** | clipped | *"Offline…"* entirely off (**257px**) **and** *"5 of 46 topics started"* loses 84px |
| ≤ 400 | not rendered (phone mode, height 0) | — |

Receipt: **`w1-r2-receipts/r2-560-census.png`**. The bar ends mid-phrase at the frame edge —
*"…5 of 46 topics started │ **Offline**"* — with no ellipsis, no wrap and no way to reach the rest.

**Why the gate cannot see it.** `test/home_reflow.cjs` is a well-built check: geometric, walks to
the nearest clipping ancestor, and deliberately exempts clippers that scroll (a designed chip strip
is not a loss). But its own header states its scope: *"the #home route, at **320 and 390** CSS px."*
Those are precisely the two widths at which the census is **not rendered at all**. The instrument is
sound; the sample misses the entire band where the element exists and the window is narrow.

420–690px is not a corner: it is a half-screen browser split on a laptop and a small tablet in
portrait.

**Fix.** Let the census wrap or drop its dim tail below a threshold, and extend `home_reflow`'s
sampled widths to cover the band where the bar is live.

---

### F5. The phone tab bar says "Today" no matter where you are.

**Where.** `home-view.js:535-548`. `onTab()` sets `aria-current` on **click only**. Nothing listens
to scroll.

**Measured at 390×844.** Wheel to the bottom of the home (scrollY 1867 — the maximum), then read the
bar and the blocks:

| block | position | on screen? |
|---|---|---|
| `.hm-continue` ("Today") | y **−1794** → bottom −1461 | no — 1794px above the viewport |
| `.hm-alt` ("Altitude") | y **−1435** → bottom −1069 | no |
| `.hm-libm` ("Library") | y **436** → bottom 484 | **yes — the only one** |

`aria-current`: **`Today* Altitude Library Index`**. Unchanged from the initial paint.

The bottom tab bar is the single most application-shaped thing this wave added to the phone, it is
persistent, and it is wrong for the whole length of the page for anyone who moves with a thumb —
which is how phones are used. Tapping a tab is the only thing that updates it. `aria-current` is
also announced, so a screen-reader user is told they are on Today while reading the library.

The gate's `seg_state` arm reports *"one active, aria-current='true' on it, none stale"* — but it
scopes to `document.querySelectorAll('.seg button')`, the nine **pane** tabs on topic routes. It
never sees `.hm-tab`. `hm-tab` appears in exactly one test file, `home_reflow.cjs`, as part of a
geometry selector.

**Fix.** An `IntersectionObserver` over the three targets, or a throttled scroll read, setting
`aria-current` from position. Plus an arm that scrolls and asserts the marked tab matches what is on
screen — the negative control writes itself.

---

### F6. Every tab-bar destination lands under the fixed top bar.

**Where.** `onTab()` calls `scrollIntoView({block:'start'})`; the phone's fixed rail is **57px**
tall; `scroll-margin-top` computes to **`0px`** on `.hm-continue`, `.hm-alt` and `.hm-libm`.

**Measured after the smooth scroll fully settles (2.2s):**

| tap | target lands at | rail bottom | hidden under the bar |
|---|---|---|---|
| **Altitude** | y **0.3** | 57 | **56.7px** — the whole `.hm-phead`: *"ALTITUDE — SOLID PROBES BY INTERVIEW TIER"* and the *"N SOLID OF 972"* figure |
| **Today** | y **0.0** | 57 | **57px** — the whole *"WHERE YOU STOPPED · <topic>"* heading |
| Library | y 435.6 | 57 | n/a (last block; the page bottoms out first) |

So two of the three in-page destinations put you one heading past where they say — you arrive at the
gauge with its title and its headline number covered by the bar you navigated from.

**Fix.** One declaration: `scroll-margin-top` equal to the bar height on the three targets.

---

### F7. *(minor — a design call, and I flag it as one)* The Chanel cut is undone at first paint by the autofocus ring.

The freeze took the saturated fill off the CTA so nothing would compete with the gauge. But the CTA
is autofocused (`home-view.js:492-493`), and Chromium matches `:focus-visible` on a load-time
programmatic focus — so **with zero user interaction** the resume button wears:

- `outline: 3px solid rgb(42, 40, 35)` at `outline-offset: 3px`
- plus `0 0 0 3px` accent @15% and `0 0 16px -4px` accent @20%

The ring measures **14.72:1 against the panel** — the highest-contrast edge on the screen. It is
visible in every capture I took, both themes, both breakpoints (`r2-desktop-light.png`,
`r2-desktop-dark.png`, `r2-phone.png`, `r2-560-census.png`), and it clears on the first click
anywhere.

It got louder *because of* a good fix: round 1's `.hm-act` wrapper was clipping the halo (the
round-2 CSS comment says so), and removing the wrapper let it draw in full.

**I am not calling this a bug.** The ring is required for the keyboard user and autofocus is a
deliberate, defensible product decision ("Enter is the whole daily loop"). But the screen the
operator opens tomorrow opens with the accessory carrying the loudest edge on the page, which is
exactly what §7b set out to prevent. If you want the cut to hold at rest, the remedy is small: a
lighter treatment on the autofocus path, or defer `:focus-visible` until a real key press. Reasonable
designers can disagree — that is why it is last.

---

## 3. WHAT I CHECKED THAT IS GENUINELY FINE

Listed so this reads as calibrated rather than as a hunt, and so the next round does not re-litigate
settled ground.

- **`.hm-do` chrome**, cold and engaged, light and dark, plus a live hover of the dead pad — clean on
  every property.
- **Contrast.** 17 text roles sampled against their real painted backgrounds. Minimum **4.75:1**
  (light, `#homestatus .hm-st-i` at 11px) and **6.63:1** (dark). Every role passes AA at its size.
  Nothing here is a contrast defect.
- **Focus rings.** Rail buttons, room rows, library cards, the card reset, the skip link and the
  library filter all show a visible indicator.
  **A false finding I killed:** `.ix-filter` looked ring-less on a one-frame read (`outline: 3px
  none`, transparent shadow). That was the `transition: box-shadow` reading at t=0. Measured after
  700ms it has `border-color: rgb(150,61,134)` and a 3px 12%-alpha halo. Fine.
- **Born-accessible.** Exactly **1** rendered `h1` ("Where you stopped · Content Pipeline") of 2 in
  the DOM; `role="banner"` on `.hm-top`; `main#home` is `tabindex="-1"` with
  `aria-label="Your rehearsal record"`; `.sidebar` renamed **"Home controls"**; the skip link is
  genuinely **first** in tab order (verified by enumerating focusables, not by reading source);
  heading order is H1 → six H2s with no skipped level.
- **No horizontal document overflow** at any of 320 / 360 / 390 / 480 / 560 / 700 / 768 / 860 / 919 /
  921 / 960 / 1024 / 1180 / 1280 / 1440. The rail switches at the 920 boundary cleanly (full-width →
  260px), the companion appears at 1280.
- **The phone practice twin is real.** With `Panels.weakCount()` = 12, `.hm-practicem` renders
  **both** "Cross-topic drill" and "Weak-spot review" at 390. My first read showed only one — that
  was an artifact of my own seed (in-progress topics never reach status `weak`), not a defect. The
  addendum's item-7 claim holds.
- **Tap targets.** Every home-owned control is ≥44px tall on the phone (tab bar 97.5 × 44, rail
  actions 44). The sub-44 items are all inherited `ix-*`: a 20px-wide goal `−`/`+`, a 22px-wide card
  reset, a 39.5px filter input. Pre-existing, outside the fix surface, and not my lens — noted, not
  ranked.
- **The collapsed library.** `display:block`, `open=false`, 48px tall on the phone. Opened by hand it
  is 66.8% of scroll height — the same figure the library rule was written to kill — but that is the
  user's own choice, made through an affordance that names itself. Correct, not a defect.
- **No stuck spinner**, no zombie overlay, both themes hold, and the dark theme is still the better
  of the two.

---

## 4. WHAT IS BEST ABOUT THIS ROUND

Said plainly, because it should carry forward.

The two hardest fixes were done by the smallest possible change and without collateral. The badge
overlap was closed with **one CSS rule using `:has()`** rather than by re-rendering `topicCard()` —
which is what preserved `at_name_hygiene`'s separator pins. The phantom card was closed by giving the
wrapper its own class rather than by fighting specificity. `heroQuestion()`'s cascade
(drill cursor → stored position → first ungraded → first) is the right hierarchy and the no-bank
fallback correctly drops the quotes instead of quoting nothing.

Section A of the addendum — withdrawing "Nothing else was cut" and disclosing the 6.4 deviation
unprompted, then keeping the deviation for a stated engineering reason and refusing to fix the
third-presentation-of-six-rooms because it belongs to a wave that can price it — is the right
posture, and it is rarer than the fixes.

The one lesson I would carry into round 3 is the pattern behind F1 and F2: **both were introduced by
a correct fix, and neither has an arm that could have caught it.** The verdict sentence and the hero
are the two things this wave is *about*, and they are the two things `test/` does not measure. The
gate is 75/75 and it is honest about everything it covers; it just does not cover the signature's
claim or the hero's completeness. Add those two arms and this class of bounce stops recurring.

---

**Receipts** (durable copies at `D:/claude-workspace/appeal-directions/_ia/w1-r2-receipts/`):

| file | shows |
|---|---|
| `crop-every-rail-full2.png` | **F1** — two empty rails above "Every rail is full. Solid on all 972 probes", header reading "310 SOLID OF 972" |
| `crop-desk-hero2.png` | **F2** — the desktop hero cut at "…or corrupting…" |
| `crop-phone-hero.png` | **F2** — the phone hero cut at "…a handler writ…", 50% hidden |
| `r2-560-census.png` | **F4** — the census bar ending mid-phrase at "Offline" |
| `r2-desktop-light.png` / `r2-desktop-dark.png` / `r2-phone.png` | the three states whole; `.hm-do` clean, phone mark closed |
| `probe2..9.json` | every number above — geometry, clamp census, verdict states, contrast, focus, width sweep, tab-bar truth |

Probe sources are in the session scratchpad (`w1r2/probe*.mjs`); the JSON carries their output, so
nothing in this judgment depends on re-running them.
