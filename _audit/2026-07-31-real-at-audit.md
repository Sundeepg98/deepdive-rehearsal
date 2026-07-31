# The Real-AT Audit -- what NVDA actually says

**Date:** 2026-07-31 - **Round:** AT-1 (discovery) - **Instrument:** real NVDA 2026.1.1
driven over its Remote Access channel, Chrome headed, Windows desktop session.
**Scope:** the five core surfaces, driven serially. **Repo state:** read-only except this file.

---

## Verdict

**The app is navigable by a real screen reader, and the announcement machinery built
this month genuinely works. What fails is not the plumbing -- it is the naming.**

Every announcement feature the recent waves shipped was confirmed BY EAR: pane switches
speak, `aria-current` is voiced and tracks state, all three drill grades announce with a
correct running score, text size announces including its ceiling, all four overlays
announce their dialog role and name, three of the four restore focus on Escape, and the
modal virtual buffer is genuinely contained. Two failures predicted from static analysis
did NOT occur, and are recorded here as refuted.

The defects are concentrated in ACCESSIBLE NAMES and in DOCUMENT STRUCTURE ON THE HOME:

1. **Search is silent about its results.** Typing produces character echo and nothing
   else -- no count, no result, no selection. This is the one surface that is unusable
   as heard.
2. **A topic card's accessible name is its entire description** -- up to 193 words in a
   single name, across 38 topics. The app's primary browsing surface cannot be skimmed.
3. **The home screen exposes zero landmarks and no h1**, while the topic view exposes
   three well-labelled landmarks and an h1. The entry point is the one screen a blind
   user cannot survey.
4. **The kicker/description separator is missing on every topic card.** NVDA's own
   word-splitter accidentally repairs 18 of 20; the 2 audible failures are only the
   places the accident could not reach. This is a systemic markup fix, not two content
   edits.

Counts: **2 P1, 13 P2, 8 P3.** All are attribute, naming, ordering, or structural changes
-- no layout work -- so the remediation is expected to be visual-regression-neutral except
where noted per wave.

---

## What this round can claim that no prior audit could

Every prior a11y pass on this app used axe, DOM assertions, or synthetic key presses.
Those instruments verify that an attribute EXISTS. They cannot hear what is SAID. Three
results here could only have come from a real screen reader, and two of them contradict
what static analysis predicted:

| Question | Static answer | What NVDA actually says |
|---|---|---|
| Is the kicker separator missing on 2 cards or 20? | 2 cards look wrong | **20** -- NVDA repairs 18 by accident (proof below) |
| Do the overlays only trap Tab, letting arrows escape? | predicted escape | **No escape** -- buffer contained, detector proven live |
| Did the W1 `#stagehead` focus move silence the pane announcement? | predicted regression | **No** -- pane names still speak |

---

## Findings

Severity: **P1** unusable as heard - **P2** real friction - **P3** polish.
Class: **APP** app defect - **NVDA** screen-reader interpretation by design - **HARNESS** instrument limit.

### P1

#### P1-1 - Search type-ahead is entirely silent about results - APP

Typing a query produces only character echo. The results settle is silent. Arrowing
through results announces nothing but the text already typed.

Verbatim, `at1-d4b-shortcuts-search`:

```
[S2-1-open-ctrl-k]  | Search surfaces, dialog. Search surfaces, dialog. Search, edit,
                      Search topics, concepts, views..., blank
[S2-3-type-idem]    | i
                    | d
                    | e
                    | m
[S2-4-results-settle]  (silence)
[S2-5-arrow-down]   | idem
[S2-6-arrow-down]   | idem
[S2-7-arrow-up]     | idem
[S2-9-narrowed-settle] (silence)
[S2-11-report-focus] | Search, edit, focused, idempotenc
```

Contradicts: `search-overlay.js` implements `selectIndex()` (:404-406) moving a selection
and `navigateTo()` on Enter -- a selection model with no accessible expression. There is
no `role="combobox"`/`listbox`, no `aria-activedescendant`, and no results live region.

**The root cause is in the markup and is provable independently of whether any results
rendered.** On open the field announces `Search, edit, ...` -- role `edit`. Not `combo box`,
no `expanded`, no `has auto complete`. A correctly built combobox announces its role and
expanded state on focus regardless of the query, so their absence is a property of the
markup, not of the result set. ArrowDown therefore moves the caret inside a plain textbox
and NVDA re-reads the field value, which is exactly what was captured.

Worse, `idem` is byte-identical to what the user just typed. So the user cannot even
distinguish "the arrow key did nothing" from "the arrow key moved a selection I cannot
perceive".

Why P1: the user cannot learn whether the query matched anything, cannot perceive the
selection moving, and Enter navigates to a destination that was never announced. Search
is the app's fastest path to any topic and it is closed to screen-reader users.

#### P1-2 - A topic card's accessible name is its whole description - APP

Verbatim, `at1-d1-boot-home`:

```
| Real-Time Delivery PUSHING TO CONNECTED CLIENTS Real-time delivery is pushing data to
  connected clients the moment it changes -- a chat message, a live feed update, a
  presence change, a score -- which inverts the usual request slash response model: ...
  , button
```

Measured across the sweep: 20 topic cards captured, mean **95.5 spoken words per card**,
maximum **193 words / 1200 characters** in one accessible name (Probabilistic Data
Structures). There are 38 topics.

Why P1: choosing a topic is the app's primary navigation act. Tabbing the list means
sitting through a paragraph per stop with no way to skim, and no shorter name exists to
fall back on. The name is not merely verbose -- it is the only name there is.

### P2

#### P2-1 - The home exposes zero landmarks and no h1 - APP

Verbatim, `at1-d5b-arrowread`, all three quick-nav axes from the same cursor start on the
same screen:

```
[N1-home-landmark-d-01..04] | no next landmark   (x4)
[N3-home-button-b-01]       | Search slash, button
[N3-home-button-b-02]       | Topic index, button
[N3-home-button-b-03]       | Shortcuts, button
[N5-home-heading-h-01]      | CHOOSE A ROOM, heading, level 2
[N5-home-heading-h-02]      | ALL TOPICS, heading, level 2
[N5-home-heading-h-03]      | no next heading
```

**This finding carries its own negative control.** Button and heading quick-nav both
return results on that screen, so browse-mode quick-nav is demonstrably alive; the
absence of landmarks is real and not a dead instrument.

The contrast is stark -- the topic view is well built (`at1-d5-browse-reader`):

```
[C3-topic-landmark-01] | Switch topic, navigation landmark, Home -- topic index, button, H
[C3-topic-landmark-02] | Study content, main landmark, MECHANICS, heading, level 2
[C3-topic-landmark-03] | Rehearsal companion, complementary landmark, Coaching for this
                         view, region, Hide companion panel, button
[C1-topic-heading-01]  | Event-Driven Backbone, heading, level 1
```

So the app knows how to do this. The home is the one screen where it does not, and it is
the screen every user arrives on. Note also that the home has no level-1 heading at all --
its two headings are both level 2, so the outline starts mid-tree.

Interpretation note: Drive 1's page-load utterance DID name a "Topic controls,
complementary landmark" and a "main landmark". That is the topic scaffolding present
during boot before the router settles the home view (`.app` is `display:none` on the home
-- shell.js:98). The settled home has none. An audit that sampled only the load event
would have recorded the opposite of the truth.

#### P2-2 - No skip affordance: 14 tab stops and 140 spoken words before the first topic - APP

The first Tab from the top of the document lands on:

```
[B2-first-tab-stop] | Search, slash, button
```

Not a bypass link. Nothing in the 36-stop sweep is a link at all. Confirmed independently
in source: `shell.js:90` records "skipCandidates was []: there is no skip link".

Measured cost: **14 tab stops / 140 spoken words** -- Search, Topic index, Shortcuts,
Theme, the hero CTA, six room buttons, Cross-topic drill, the filter field and a Cram
button -- before the first topic card. It repeats on every arrival, and there is no way
past it.

#### P2-3 - The six room buttons fuse the numeral to the name - APP

All six, verbatim:

```
| 1Messaging and Events 7 topics 0 of 7 started 0 percent drilled, button
| 2Data and Storage 10 topics 0 of 10 started 0 percent drilled, button
| 3Reliability and Observability 8 topics 0 of 8 started 0 percent drilled, button
| 4Platform and Infra 11 topics 0 of 11 started 0 percent drilled, button
| 5Architecture and AP Is 7 topics 0 of 7 started 0 percent drilled, button
| 6Security and Tenancy 3 topics 0 of 3 started 0 percent drilled, button
```

A sighted user sees a numeral and a title; NVDA speaks one fused word ("1Messaging").
`"AP Is"` for `APIs` is NVDA's word-splitter, not an app defect -- see P3-6 -- but it is
the same mechanism that hides P2-4, so it is worth reading the two together.

#### P2-4 - The kicker/description separator is missing on ALL 20 cards, audible on 2 - APP

Audible failures, verbatim:

```
| Attribute Store ATTRIBUTE BOUNDARYA schema-flexible attribute store -- per-device ...
| Consistency Models THE CONSISTENCY SPECTRUMA consistency model is the contract a ...
```

and the same defect in the cram sheet (`at1-d6-overlay-containment`):

```
| Cram sheet content, region, THE ONE-LINERA private bucket where nothing is public ...
```

**The scope is not 2 cards. It is all of them.** NVDA applies a case-transition word
splitter to everything it speaks. Fingerprints measured in the D1 log, with the
counter-check that decides it:

| spoken | count | from | unsplit form present? |
|---|---|---|---|
| `AP Is` | 4 | `APIs` | **0 occurrences** |
| `Web Socket` | 8 | `WebSocket` | **0 occurrences** |
| `Rocks DB` | 4 | `RocksDB` | **0 occurrences** |
| `Hyper Log Log` | 4 | `HyperLogLog` | **0 occurrences** |

The unsplit forms never appear anywhere in the capture, so the splitter is universal.
Apply it to a kicker concatenated to a description with no separator:

- `ASYNC BACKBONE` + `Decoupling` -> `BACKBONEDecoupling` -> uppercase run meets a capital
  followed by lowercase -> splitter fires -> heard as `BACKBONE Decoupling`. Sounds fine.
- `ATTRIBUTE BOUNDARY` + `A schema-flexible` -> `BOUNDARYA schema-flexible` -> the final
  capital is followed by a SPACE, so there is no case transition -> splitter cannot fire
  -> heard as `BOUNDARYA`. Broken.

Classified over all 20 captured cards this predicts the observed string in **20 of 20**
cases, with zero contradictions. **18 cards are being repaired by accident.** Any new
topic whose description opens with a single-letter word ("A", "I") joins the broken set.
Fix the separator in markup once; do not edit two strings.

**And there is a second, independent trigger: LAYOUT.** The same three companion-panel
controls are spoken with separators in one run and glued in another:

```
at1-d3  | Infrastructure as Code provisioning boundary, button
at1-d4  | Infrastructure as Codeprovisioning boundary, button
at1-d3  | Load Balancing the traffic spreader, button
at1-d4  | Load Balancingthe traffic spreader, button
```

Same controls, same app, opposite outcomes. The two sweeps ran at different effective
widths (one in the drill with focus mode engaged, one in the walkthrough with panels
open), so the text wrapped differently -- and browser text flattening inserts a space at a
rendered line break but not between inline siblings sitting on one line.

**Implication for remediation: any "glue fixed" check that runs at a single viewport and
text size proves nothing.** Verify at two widths at minimum, and remember text zoom goes to
116 percent, which re-wraps everything. Confidence: high that the two logs disagree;
medium-high on the wrapping mechanism.

The same defect appears in a third costume inside the cram sheet, where a period butts
against the following capital and NVDA speaks the word "dot" -- **64 times in one
overlay**.

#### P2-5 - The documented shortcuts are unreachable in NVDA's default mode, and the shortcuts overlay does not say so - APP + NVDA

In browse mode -- what every NVDA user gets by default -- the app's own documented keys
are swallowed by quick-nav, and answer with something unrelated to the app:

```
[B-browse-key-w] | Not supported in this document
[B-browse-key-q] | no next block quote
[B-browse-key-e] | no next edit field
[B-browse-key-r] | no next radio button
[B-browse-key-3] | No next heading at level 3
[B-browse-key-n] | no more text after a block of links
```

The interception is NVDA behaving correctly. The defect is that the app's keyboard design
assumes a mode the user is not in, and the shortcuts overlay teaches the shortcuts without
mentioning it. Its entire content, verbatim:

```
| Keyboard shortcuts content, region, JUMP STRAIGHT TO ANY VIEW, Q Walkthrough W Probe
  Drill E Whiteboard R System Map T Trade-offs Y Model Answers U Numbers I Red Flags O ...
```

A blind user is being taught nine shortcuts, every one of which does nothing when they
try it, with no hint that focus mode is required. The controls compound this by
advertising the keys: `"Reveal answer, button, Space Enter"`.

In focus mode every one of them works correctly (see Working Well).

#### P2-6 - Four identically-named "Cram" buttons - APP

```
[C-home-tab-12] | Cram right arrow, button
[C-home-tab-20] | Cram right arrow, button
[C-home-tab-31] | Cram right arrow, button
```

and a fourth in the longer sweep of `at1-d3-drill-deep`
(`A-find-start-09 / -17 / -28 / -37`), all four announcing exactly `Cram right arrow, button`.

These are per-room controls -- the card runs between them are exactly 7 and 10, matching
"1Messaging and Events **7 topics**" and "2Data and Storage **10 topics**". From speech
alone they are indistinguishable, so the user cannot tell which room they are about to
cram, and in NVDA's Elements List they appear as identical rows. Name them
`Cram: Data and Storage` and so on.

#### P2-7 - Decorative glyphs are verbalized inside accessible names - APP

```
| Cram right arrow, button
| START Event-Driven Backbone ... then run a timed mock dot right arrow, button
| downwards arrow tip rightwards INTERVIEWER PUSHES FURTHER Why scope the resource ...
| x-shaped bullet Missed 1, button, 1
| check Solid 3, button, 3
| button, play button Mock run -- the full round, on the clock
```

**The rule used to decide this, established empirically on the bench:** when NVDA
verbalizes a symbol the capture contains the ENGLISH WORDS; when it does not, the capture
contains the RAW GLYPH. So `"right arrow"` as words is proof the glyph is spoken aloud.

Applying the same rule in the other direction prevents a false finding: 11 sidebar buttons
carry U+203A in their names and it stays a raw character in every capture -- it is NOT
spoken. Those 11 are **not** reported as defects. Likewise the em dash (U+2014).

#### P2-8 - Two headings per view, and none inside the panes - APP

```
[C1-topic-heading-01] | Event-Driven Backbone, heading, level 1
[C1-topic-heading-02] | Study content, main landmark, MECHANICS, Walkthrough, heading, level 2
[C1-topic-heading-03..14] | no next heading   (x12)
```

Same in the drill: an h1, the stage head, then nothing. The probe content, the follow-ups
and the model answers carry no headings, so a reader cannot skim within a pane and must
arrow-read linearly.

#### P2-9 - Reading from the top traverses the whole tool rail before any content - APP

26 ArrowDowns from the top of a topic route stayed entirely in the chrome -- topic
switcher, mock run, the ten seg tabs, text size, focus timer -- and never reached study
prose. Combined with P2-2 (no skip link) this is the practical cost: the linear reader
pays for the entire toolbar before every read.

#### P2-10 - Escape from the search overlay strands focus inside it - APP

Three of the four overlays restore focus to their trigger on Escape. Search does not:

```
[S2-10-escape]       | (a single empty utterance -- nothing announces the close)
[S2-11-report-focus] | Search, edit, focused, idempotenc
```

Compare the three that behave, e.g. `Topic index ?, button, focused, backslash`.

After Escape, focus is still on the search input and the typed query is still present.
The log cannot distinguish "the overlay did not close" from "it closed but focus was left
on a now-hidden input" -- both are app defects, and both leave a screen-reader user with
no idea where they are and no announcement of any context change. Worth re-probing with a
single Tab after Escape to report the landing.

#### P2-11 - The grade verdict is spoken AFTER the entire next probe - APP

```
| PROBE 5 slash 21 signal Encryption in transit SDE 2 You've encrypted at rest. How do
  you guarantee firmware is never transferred as plaintext?, section. Solid. 2 solid,
  2 revisit, 17 left.
```

The verdict the user is waiting for -- Solid, Shaky or Missed -- arrives last, after 20 to
30 words of a brand-new question. A sighted user reads the verdict badge instantly.
Reproduced at **all nine** grade steps, so it is systematic ordering, not a race: the
verdict region should be committed before the probe content mutates, or verdict and probe
should be one message with the verdict first.

#### P2-12 - Overlay content regions are single-focus-stop text dumps - APP

`[S4-cram-3-tab-02]` is ONE utterance of roughly 1,800 words: the entire cram sheet --
spine, decisions, ceilings, traps, senior tells, harder angles, the 30-second close --
delivered on a single Tab stop, with the only exit being the next Tab.

The shortcuts overlay does the same with roughly 400 words, and because its Tab cycle is
only two stops (content region, then Close), **every second Tab re-reads the whole
shortcut list from the top** -- four times over in `[S1-3-tab-01/03/05/07]`.

Give these regions real heading and list structure, and take them out of the tab order or
give them a skip target.

#### P2-13 - The shortcuts overlay silently omits every punctuation key it teaches - APP

This is the one surface whose entire job is teaching the keyboard, and the keys whose
labels are punctuation vanish, because NVDA does not speak bare punctuation at default
symbol level. Verbatim from `[S1-3-tab-01]`:

```
| ... slash or Ctrl K Search topics, concepts and views Open the Topic index H Home ...
| ... Previous next topic N Go to your next step ...
| ... Esc Close any open panel Bring up this list, The single keys pause ...
```

- "Open the Topic index" arrives with **no key at all**. It is backslash -- confirmed
  elsewhere by `Topic index, ?, button, backslash`.
- "Previous / next topic" has **no keys**. They are left and right bracket -- confirmed by
  `button, left bracket, Previous topic` and `button, right bracket, Next topic`.
- "Bring up this list" has **no key**. It is the question mark -- confirmed by
  `Keyboard shortcuts ?, button, question`.

The same blob also fuses labels for want of separators: `left arrow right arrow Step back
and forward` (two keys run together), `Reveal the answer advance the next beat` (two
descriptions), `123In the drill` (three keys fused into the following word), and
`Cycle spacing density -- compact cozy default` (three values).

Fix by giving each key a text alternative (`aria-label="Backslash"`) and restoring the
separators. Note the compounding: a blind user is taught nine letter shortcuts that do not
work in their default mode (P2-5), and the punctuation shortcuts that WOULD have worked are
not read out at all.

### P3

| ID | Finding | Receipt | Class |
|---|---|---|---|
| P3-1 | Overlays announce their name twice on open -- **4 of 4** | `Topic index, dialog. Topic index, dialog. Filter topics, edit...`; same shape for cram, shortcuts and search | NVDA (focus event plus dialog event). Uniform across all four overlays, which is itself evidence the cause is the reader, not any one overlay's markup |
| P3-2 | Timer value fuses to its label | `25:00FOCUS` | APP |
| P3-3 | Home header buttons announce an empty field where the topic view announces a shortcut | home: `Topic index, , button` / `Shortcuts, , button` vs topic: `Topic index, ?, button, backslash` | APP |
| P3-4 | Multi-value `aria-keyshortcuts` renders oddly | `Print Q and A ?, button, Control plus P Meta plus, P` | NVDA |
| P3-5 | `current` is announced in an inconsistent position | `button, current, Q` vs `button, Recommended next, W, current` | NVDA |
| P3-6 | Technical identifiers are degraded by the word splitter | `s 3` (S3), `UR Ls` (URLs), `Io T` (IoT), `Signature V 4`, `Cloud Front`, `SSE-S 3` | NVDA -- see note |
| P3-7 | Text size re-announces on no-op presses at the ceiling | 7 further presses each repeated `Text size 116 percent , largest` | APP -- arguably deliberate feedback; low priority |
| P3-8 | Toggle buttons are inconsistent about stating their condition | `? Dark mode -- off, toggle button, not pressed` and `Interviewer cuts in mid-answer -- off` state it twice; `Star this topic ?, toggle button, not pressed` does not state it at all | APP |

Note on P3-6: this is NVDA working as designed and is not fixable by markup in general.
It is listed because it materially degrades this app's content, which is dense with such
identifiers, and because a targeted `aria-label` on the handful of highest-traffic strings
is the only lever available. Recommend accepting it rather than chasing it.

---

## Working well -- protect these

Confirmed by ear, with receipts. Several are recent work, now verified for the first time
by a real screen reader.

| Behaviour | Receipt |
|---|---|
| `aria-current` is voiced AND tracks state | walk active: `Walkthrough MECHANICS, button, current, Q`; after switching: `Probe Drill GRADED, button, Recommended next, W, current` and Walkthrough drops it |
| Pane switches announce (W1's `#stagehead` work) | `Probe Drill` / `Walkthrough` / `Whiteboard` / `System Map` / `Trade-offs` / `Model Answers` |
| All three grades announce with a running score | `Solid. 1 solid, 0 revisit, 20 left.` / `Shaky. ...` / `Missed. 1 solid, 2 revisit, 18 left.` |
| No truncated, interleaved, missing or inconsistent grade announcement under load | 9 grade keypresses -> 9 grade utterances, none missing; arithmetic self-consistent at **every** step (`solid + revisit + left == 21` and `left == 22 - probe`, verified independently at all 9). See the limit on this below -- it is narrower than "no collision" |
| Text size announces, including its ceiling | `Text size 108 percent`; at the bound `unavailable. Text size 116 percent , largest`; re-focus gives `Increase text size, button, unavailable` |
| Overlays announce their dialog role and name | all four: `Cram sheet, dialog`, `Topic index, dialog`, `Keyboard shortcuts, dialog`, `Search surfaces, dialog` |
| Tab trap holds -- on the two overlays where it was properly exercised | cram cycles Print / content / Close four times; shortcuts cycles two stops four times. Topic index and search were NOT proven either way -- see limits |
| Focus restores to the trigger on Escape -- on three of four | `One-page cram sheet ?, button, focused`; `Topic index ?, button, focused, backslash`; `Keyboard shortcuts ?, button, focused, question`. Search is the exception -- P2-10 |
| **Modal virtual buffer is contained** | see refutation below |
| Topic view structure | navigation, main and complementary landmarks, all labelled, plus an h1 |
| `aria-keyshortcuts` exposed and spoken | `button, Q` ... `button, O`; `Reveal answer, button, Space Enter`; `button, left bracket, Previous topic` |
| Topic entry announces the topic | `Study content, main landmark, MECHANICS, Walkthrough, heading, level 2. Platform and Infra: AWS Hardening` |
| Seg tab names are correctly separated | `Red Flags ANTI-PATTERNS`, `Walkthrough MECHANICS` -- the two-span pattern works here |
| Cram content reads with real structure | `list, with 9 items, 1. Entry -- where the signed firmware lands ...` |

---

## Predictions refuted -- two failures that did not happen

Both were derived from the prior audits by static reasoning, and both were driven directly.

**1. "The overlays trap Tab but arrows escape the virtual buffer."** The reasoning was
sound: a keydown Tab handler cannot constrain NVDA's browse-mode buffer, and no prior
audit recorded `inert` or `aria-hidden` on the background. Driven with the cram sheet
open: **30 ArrowDowns, 10 button quick-navs, 6 heading quick-navs and 5 landmark
quick-navs produced ZERO background strings.**

The detector was proven capable rather than assumed: the same background strings
(`Walkthrough MECHANICS`, `Increase text size`, `DEEP REHEARSAL`, `Rehearsal sections`,
...) were heard **6 times** immediately after the dialog closed. A containment verdict
from a detector that could not fire would be worthless; this one fires.

**2. "The W1 `#stagehead` focus move silenced the pane announcement."** The reasoning was
that a focus change preempts pending polite speech. Driven across six panes: the pane name
is spoken every time (`Probe Drill`, `Walkthrough`, `Whiteboard`, `System Map`,
`Trade-offs`, `Model Answers`). No regression.

Related: `#stagehead`'s name was predicted to be heard as the run-together word
`MECHANICSWalkthrough`. It is not -- it is heard as `MECHANICS, Walkthrough`. The
underlying markup concern is real and is the same class as P2-4, but the audible outcome
is fine, by the same accidental repair.

---

## Remediation waves

Sizing assumes the fixes are attribute and markup changes only. **VR = visual-regression
risk.**

| Wave | Size | Contents | VR |
|---|---|---|---|
| **A -- Name hygiene** | S | Separator between room numeral and name (P2-3); separator between kicker and description everywhere, in markup, not per string (P2-4); `aria-hidden` on decorative glyphs in names (P2-7); timer/label separator (P3-2); disambiguate the four Cram buttons (P2-6); fix the empty header-button field (P3-3); toggle state consistency (P3-8) | **Neutral-but-verify.** Text-node separators and `aria-hidden` only. But a real space can reflow a tight card, so re-shoot the home and cram baselines. **Verify the fix at two viewport widths and at 116 percent text zoom** -- P2-4 is layout-dependent, so a single-width check proves nothing. |
| **B -- Topic card names** | M | Give each card a concise accessible name (title plus kicker) and demote the description out of the name, via `aria-label` on the control plus `aria-describedby`, or by moving the description outside the nameable element (P1-2) | **Neutral** -- no visual change intended. The description must stay visible; verify it is still painted identically. |
| **C -- Home structure** | S | Add an h1; add banner/main/navigation landmarks to the home view; add a real skip link (P2-1, P2-2, P2-9) | **Small delta.** A skip link is visible on focus by convention, so it is a new painted state. Add a VR case for it rather than hiding it off-screen permanently. |
| **D -- Search accessibility** | M | `role="combobox"` + `listbox`, `aria-activedescendant` tracking `selectIndex()`, a polite region announcing the result count as the query narrows (P1-1), and fix Escape so it closes and returns focus to the trigger (P2-10) | **Neutral** -- roles, attributes and focus handling only, no layout change. |
| **E -- The keyboard-teaching surface** | S | Give every punctuation key in the shortcuts overlay a text alternative and restore its separators, so backslash, the brackets and the question mark are actually spoken (P2-13); state the browse/focus-mode requirement (P2-5) | **Neutral** -- content and attributes inside an existing overlay. |
| **F -- Readable structure** | M | Real headings for panes and probe blocks (P2-8); give overlay content regions heading/list structure and take them out of the tab order or add a skip target (P2-12) | **Neutral-but-verify** -- heading elements may inherit different type styles; check the drill, walkthrough, cram and shortcuts baselines. |
| **G -- Announcement ordering** | S | Commit the grade verdict before the probe content mutates, or make verdict and probe one message with the verdict first (P2-11) | **Neutral** -- live-region sequencing only, no DOM structure change. |

Suggested order: **A, C, D, G, B, E, F.** A and C are cheap and lift every surface; D closes
the only P1 that blocks a whole feature; G is a small ordering change with a
disproportionate effect on the app's core loop; B is the largest single user win but
touches the most templates; F is the largest structural change and should land last.

---

## What NVDA cannot tell us

This round is one screen reader, one browser, one platform, one synthetic user. The
following are explicitly NOT covered, and no finding here should be generalised past them.

- **JAWS and VoiceOver will differ, and some findings are reader-specific.** P2-4 depends
  entirely on NVDA's case-transition splitter. A reader without that behaviour would
  expose the missing separator on **all 20** cards audibly rather than 2 -- so the fix is
  more urgent on other readers, not less. Conversely P3-4, P3-5 and P3-6 are NVDA
  rendering choices and may simply not exist elsewhere.
- **Only Chrome was driven.** The accessibility tree is computed by the browser; Firefox
  and Safari compute names differently, particularly for concatenated content.
- **No real screen-reader user was involved.** This measures what is SAID, not what is
  understood, learnable, or tolerable. Verbosity judgements here (P1-2 especially) are
  inferred from word counts, not from anyone's actual patience.
- **Braille output was not captured at all.** A braille display renders the same
  accessible names without any of the audible repairs described in P2-4, so the glue
  defects are likely worse there. Untested.
- **Speech rate, symbol level and verbosity were left at defaults.** Users tune these
  heavily; a user at a higher symbol level would hear the U+203A glyphs that this round
  correctly reports as silent.
- **Not covered by any drive:** the mock-run timed flow, the whiteboard and system-map
  panes, the tour guide, the session/progress panels, print output, and mobile or
  touch-AT behaviour.
- **THE CAPTURE RECORDS SPEECH REQUESTS, NOT AUDIO -- so live-region collision is NOT
  settled.** This is the most important limit in this document, because it bounds a
  conclusion that looked clean. Guidepup taps the text NVDA is handed to speak. A
  collision as a USER experiences it is an in-progress utterance being cut off mid-word --
  and a log of the request stream shows that text complete even if only four words were
  ever heard. Two further cautions on the same probe: the real keystroke-to-keystroke
  interval was about **2.05 s**, not 700 ms (the 700 ms settle is additive to a ~1.4 s
  round trip), while each utterance is a 60-150 word paragraph, i.e. 20-45 seconds of
  speech -- so the audio backlog grew monotonically throughout. And the silent
  post-probe drain step proves only that no NEW request was issued; the synthesizer queue
  sits downstream of the capture point. The honest claim is the narrow one in the table
  above. Closing this properly needs an audio-side probe or NVDA's own speech-interrupt
  signalling, not a faster settle.
- **The dock's second live region was never heard speaking.** The dock is deliberately
  silent mid-unit by design, so the two-region contention scenario never arose. It remains
  untested at a unit boundary.
- **Two overlay behaviours were never exercised**: the topic index's Tab trap (8 forward
  stops into a 40-plus item list never wrapped, which proves nothing either way) and the
  search overlay's Tab behaviour (no Tab sweep was run there at all). Neither is claimed
  as trapped or as not trapped.

---

## Harness limits -- results that are NOT app findings

Recorded so a later round does not mistake an instrument artifact for a defect. Each of
these produced a plausible-looking silence.

- **`/` and `?` cannot be sent.** guidepup's `parseKey` resolves both to an EMPTY keyCode
  and returns success -- a silent no-op. These are the search and shortcuts triggers, so a
  drive that pressed them would have logged "the shortcut does nothing". Both overlays
  were opened by their real buttons instead; search was additionally opened with Ctrl+K.
- **`\`, `[` and `]` carry shifted vk_codes** (191, 186, 187 -- respectively `/`, `;`, `=`
  on a US layout) while their scan codes are correct. Pressing them produced silence. The
  app demonstrably EXPOSES these shortcuts -- verbatim `button, left bracket, Previous
  topic` and `Topic index, ?, button, backslash` -- so the exposure is not in doubt.
  Whether the app also HANDLES them correctly is **UNRESOLVED**: the transport defect is
  sufficient to explain the silence, but does not prove the app would have responded. Do
  not file it either way; re-probe with `nvda.type()`, which uses a different transport.
- **NVDA's mode-change utterance captured empty**, so browse-vs-focus was proven
  BEHAVIOURALLY instead -- `w` returning `Not supported in this document` in one mode and
  `Probe Drill` in the other is stronger evidence than the announcement would have been.
- **The AT-0 spike report is wrong on one point:** it states `nvda.press("Space")` sends
  nothing. `Space` IS a valid key name (vk 32, identical to `Spacebar`). The underlying
  warning is still correct -- unknown names ARE dropped silently -- but the example is not
  one. Bare digits are also fine: `parseKey` rewrites `/^\d$/` to `Digit<n>`.
- **Three of this round's own positive controls failed for instrument reasons**, all
  corrected rather than reported: D1's landmark control was evaluated against a phrase set
  that excluded the arrival step (landmarks ARE announced); D3's text-size control failed
  because the Tab sweep exhausted itself in the drill's 21-probe jump strip without ever
  reaching the control (re-driven in D3b, where it passes); D5's content control used a
  regex that could not match across spaces.

**Anti-vacuity:** every drive carried at least one positive control asserting a known-good
utterance, so silence from a dead capture channel could not be mistaken for a clean
result. Where a control failed, the cause was found before any finding was written.

---

## Operating the bench

Reproduction and scheduling notes for the next round.

- **The machine is visibly possessed while a drive runs.** Chrome is launched maximized
  and force-foregrounded, focus rings move on their own, and overlays open and close. NVDA
  is muted at the config level (`nvda.ini` `[speech] volume = 0`), so it is silent, but the
  Speech Viewer must stay disabled or it steals foreground and the capture silently
  records the wrong window. Do not schedule drives into a window where the operator needs
  the desktop.
- **Nothing can share the machine.** NVDA narrates whatever is foregrounded; a single
  stray window steals the capture. All six drives ran serially for this reason, and all
  analysis was delegated to file-only children with an explicit no-GUI instruction.
- **Chrome must be closed between drives** or `resetProfile()` fails with EPERM and the
  run aborts before the first utterance. Close by profile path
  (`scripts/close-spike-chrome.ps1`), never image-wide -- the operator's own browser must
  survive.
- **Cost:** roughly 3.5 to 6 minutes per drive wall-clock, dominated by a 22 s app boot
  and a ~1.3 s round trip per captured utterance. Six drives plus re-drives came to about
  40 minutes of machine time.

---

## Logs -- the receipts

All under `D:\claude-workspace\at-spike\logs\`, each as strict-ASCII `.ascii.txt` (the
quotable transcript) plus `.jsonl` (original UTF-8, timings, positive-control verdicts).
The raw JSONL is the source of record for any glyph question, since the ASCII rendering
masks non-ASCII characters.

| Surface | Log |
|---|---|
| 1. Boot + home | `at1-d1-boot-home` |
| 2. Topic nav + panes | `at1-d2-topicnav-panes`, `at1-d2b-segstrip-switcher`, `at1-d2c-ariacurrent` |
| 3. Drill loop deep | `at1-d3-drill-deep`, `at1-d3b-textsize` |
| 4. Overlays | `at1-d4-overlays`, `at1-d4b-shortcuts-search` |
| 5. Browse-mode reader | `at1-d5-browse-reader`, `at1-d5b-arrowread` |
| 6. Modal containment | `at1-d6-overlay-containment` |

Drive scripts sit beside them in `..\scripts\at1-*.mjs`; the harness additions, including
the key validator that refuses to send an unsendable key, are in `scripts\at1-lib.mjs`.
Supporting analysis: `..\analysis\intent-aria-map.md`, `prior-claims-ledger.md`,
`d1-boot-home-findings.md`, `d3-d4-drill-overlay-findings.md`.
