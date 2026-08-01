# FREEZE -- appeal/home-instrument -- 2026-07-31

Branch `appeal/home-instrument`, branched from master tip `1c533d7`.
Scope: the `#home` route only. Spec: `appeal-directions/CHOSEN.md` (D1 "The Instrument" spine,
per the blind five-judge panel ruling of 21:05).

Gate: **75/75 PASS** -- capture at `_audit/2026-07-31-appeal-home-gate.txt`, written outside the
repo during the run and copied in.
Baseline for comparison: 74/74 PASS on the untouched tree at `1c533d7`.
Delta: `home_reflow` added. **No check was deleted, weakened, or skipped.**

One flake seen and run down rather than shrugged at: an intermediate full-gate run failed
`grade_reveal` on the arm that clicks Missed and reads the record back, while the adjacent re-grade
arm passed. It then passed 3/3 in isolation. The wave touches neither the drill, the shadow root,
`progress.js` nor `card-id.js`, and the one plausible mechanism it does introduce was checked and
ruled out: `Panels.bind` attaches to the root it is handed, never to `document`, and this wave's
three roots (`#home`, `#homerail`, `#homelib`) are disjoint subtrees that never contain the drill.
The home's own document-level listeners are gated on `HomeView.isOpen()`, which is false on a drill
route. Load artefact on a box that was also rendering receipts; the capture of record above is a
clean run with nothing else on the machine.

---

## 1. What changed, in one line of stylesheet

```
src/styles.css   html[data-view="home"] .app{display:none}
```

That declaration was the operator's whole complaint. The TOPIC routes already shipped a
three-column shell, measured fixed phone chrome (`--chrome-top`/`--chrome-bot`, written at runtime
by `chrome-metrics.js`) and a docked verdict bar (`#ndock`). Entering the home switched all of it
off and painted a centred 980px column on `--bg`. One route, and it was the entire defect.

`#home` is now a tenant of the shell instead of a replacement for it: it sits in the `.stage` slot,
the sidebar carries a HOME tenant beside its untouched TOPIC tenant, the library lives in the
`.companion` column, and a status census bar sits at the frame's foot. Same element per slot, same
geometry, same sticky and scroll behaviour. No parallel shell was built.

## 2. What the home now says

- **The hero is the QUESTION.** The probe you were being interrogated on, in curly quotes at
  display size on a new `--measure-display` (41ch). The rule that token exists to state: display
  type takes a shorter measure than body type. Previously the home heroed a topic NAME, which is
  what a table of contents does.
- **The line under it is second person, with a REASON and a RECENCY**: "You marked 4 probes shaky
  in this topic 3d ago, and stopped. 9 probes left here." Previously: "probe 11 of 21" -- a cursor.
- **ALTITUDE**, the gauge: three rails (Staff / SDE3 / SDE2), 46 segments each, one per topic,
  brightness = that topic's Solid share at that tier, ordered strongest-first so the lit mass is
  contiguous and the taper is legible. Fill and outline carry the grade; hue never does, because
  hue already means WHICH ROOM. Untouched topics keep an empty outline so the denominator is never
  hidden. It is derived at READ TIME from `progress.<id>.cards` joined against the tier on the card
  -- about 972 lookups per render, **no schema change and no migration**.
- **Weakness chips gained AGE and the CONCEPT tail**, both from data already stored (`ts`, and
  `revisit[]`, which holds signal strings).
- **A status census** on the frame's foot, and a **bottom tab bar** on the phone.

## 3. The honest limit, stated rather than papered over

`progress.<id>.ts` is a per-TOPIC last-write stamp. There is **no per-card timestamp anywhere in
the store**, so nothing here can honestly age an individual probe. The copy is written to exactly
what the record can pay: "You marked 4 probes shaky in this topic 3d ago" means *you last worked
this topic three days ago*, and the Still-shaky panel says so in as many words ("The age is how
long since you last worked that topic"). Per-probe recency is a storage change with a migration and
is recorded as a follow-up wave in the spec, not faked here.

The gauge's verdict also refuses to accuse without evidence: on a cold record every rail ties at
0%, so "Staff is the thin rail" would be an accusation derived from nothing. The cold copy explains
the instrument instead. This was caught by looking at the regenerated VR baseline before committing
it, which is the reason that review step exists.

## 4. Two defects this wave introduced and fixed

1. **The focus halo was deleted.** `.hm-act .hm-cta{box-shadow:none}` was written to remove the
   resting drop shadow. `.hm-cta:focus-visible` delivers the focus HALO as a box-shadow at the same
   specificity, so the blanket rule won by source order and silently removed it in both themes.
   `test/focus_ring.cjs` caught it -- the arm exists for exactly this. Fixed with
   `:not(:focus-visible)`, and the reason is written at the rule.
2. **The brand mark lost its neutral.** `styles.css` bound the home brand mark to a roomless
   neutral via `#home .hm-brand`. Moving the mark into the rail took it out of `#home`, so it would
   have worn a room accent -- the exact W15 defect `test/room_browser.cjs` guards. Both the selector
   and the check were re-pointed to `.hm-rail .hm-brand`.

## 5. Checks -- re-anchored, never deleted

| check | what happened |
|---|---|
| `home_rhythm.py` | **Re-anchored** via its own documented procedure. The stack changed membership: `.hm-state`, `.hm-cta` and `.hm-top` left it (the first retired into the status bar; the other two became component-internal and stopped declaring the content measure), and `.hm-continue` / `.hm-alt` / `.hm-duo` joined. REGISTRY and `gap.home.*` tokens moved together, so no orphan is left on either side. The check also learned that `--measure-display` is a DIFFERENT kind of measure -- judged, so a raw `41ch` still fails, but never pulled into the centred column. A 7th planted defect was added for it and the display measure is pinned BOTH ways in the self-test. |
| `search_deadend.cjs` | **Re-anchored, and strengthened.** It used `appVisible === false` as the proxy for "you are on the home". The shell now stays up on every route, so that flag is true everywhere and would have silently weakened four arms. Replaced with `stageVisible` -- down on the home, up on a topic route, which is what the proxy always meant -- and `appVisible === true` is now asserted on the home as the new invariant that the frame never leaves. |
| `room_browser.cjs` | **Re-anchored** to `.hm-rail .hm-brand` (see defect 2). The assertion is unchanged: the product mark claims no room. |
| `at_name_hygiene.cjs` | **Re-anchored.** The separator ratchet went 12 -> 14 because the weakness chip gained a third field. The two new seams are pinned by name in `SEP_SITES` as well as counted, so raising the number without adding the separators still fails. |
| `focus_ring.cjs`, `cold_open.cjs`, `heading_tree.cjs`, `touch_floor.cjs`, `visual_pane_smoke.mjs`, `phantom_tokens.py`, `at_name_layout_probe.cjs`, `flow_cursor.cjs`, `latent_arial.cjs`, `overlay_deadzone.cjs`, `rail_integrity.cjs`, `back_deadend.cjs` | **Passed unmodified.** The cold branch deliberately keeps `.hm-lead` and `.hm-cta .hm-cta-d` so `cold_open`'s contract holds as written. |
| `chrome_metrics.cjs`, `fold_budget.cjs`, `click_drift.cjs`, `sidebar_geometry.cjs` | **Untouched and unmoved.** All four run on TOPIC routes, which this wave does not change. The spec predicted this against my own DIRECTION.md, which had overstated it as "the real work"; measured here, it was none. |
| `home_reflow.cjs` | **NEW.** See below. |

## 6. The new check, and why it had to exist

`test/home_reflow.cjs`. The usual reflow predicate, `documentElement.scrollWidth > clientWidth`, is
**blind in a fixed shell**: a `position:fixed` bar with `overflow:hidden` does not grow the document
when its contents are too wide, it CLIPS them, so the document stays exactly viewport-width and the
predicate stays green while a control sits off-screen and unreachable.

This is not hypothetical. It happened on this wave: at 390px the home's Theme button painted its
right edge at 394 inside a 390px bar, with `scrollWidth` reporting 390 and every existing arm green.
The new check measures each element's painted box against its nearest CLIPPING ancestor instead, and
treats a horizontally-scrollable clipper as reachable rather than lost. It plants two mutants every
run -- one inside the fixed bar (the case `scrollWidth` cannot see) and one in the flow -- and
ABORTS rather than report a green it did not earn. It found the real defect before it was fixed, so
its negative control is demonstrated, not asserted.

## 7. Visual regression

`home-light` and `home-dark` REBASELINED under the authorization; the pair is kept and
`manifest.json` updated. **The other 14 baselines are byte-identical** -- `git diff --stat` over
`test/baselines/` shows exactly three changed files. The new baselines were reviewed before
committing, which is what surfaced the cold-verdict copy defect in section 3.

## 7b. The Chanel cut -- what came off before the receipts

Per the team-lead coherence ruling (rule 5), one accessory was removed before capturing receipts,
and rule 1 named the offender: **the Resume CTA's saturated slab**.

It was a full-saturation room-coloured block with a drop shadow, inherited from the old home where
it was the only thing on the screen worth looking at. On the new home it was the loudest object in
the column -- it beat the altitude gauge on both size and saturation, which is precisely what rule 1
forbids, and it also out-shouted the question sitting directly above it. The fill came off. What
remains still reads as the single primary action: it is the only bordered control in the column, it
wears the room it will open, it carries the arrow, and it is autofocused so Enter is the whole daily
loop. It simply stopped competing with the signature.

Nothing else was cut. Checked against the ruling's other rules: the question-as-hero is set at
`--font-size-heading` inside the Continue strip, not as a second monument (rule 2); the measure
rule, the age stamps, the second-person copy and the fill-vs-outline grade marks all build silently
as craft floor with no feature surface of their own (rule 3); no steal was found fighting the
spine's grammar, so nothing went to the wave-2 list on coherence grounds (rule 4).

The optional cherry-pick note (`be360c0`, room hues named by surface) was declined and the file
deleted: this wave consumes `--room-*` unchanged and adds no colour tokens, so there was nothing
for that refactor to attach to. That is the "if your plan structures tokens differently, ignore
this" branch of the note, not an oversight.

## 8. Appearance receipts

`_audit/appeal-home-receipts/` -- before (master tip `1c533d7`) and after, at 1280x800 and 390x844,
on the SAME seeded returning-user record, so each pair differs by design and nothing else.

Captured AFTER the Chanel cut, so the receipts show what actually ships.

**The note, in the appeal's own register.** The before shot is the operator's sentence made
literal: a centred column on cream, a wordmark and four pill buttons floating with nothing to
belong to, one progress line, a full-bleed blue slab reading a topic's NAME, then sections stacked
down a page that scrolls as one document. Nothing on that screen is chrome, so nothing on it is an
application -- it is a well-set page about an application. The after keeps every one of those
facts and re-houses them: the wordmark and the actions become a rail that persists, the progress
line becomes a census bar that is always at the foot, the library becomes a column that is always
present and never in the way, and the slab stops shouting a topic's name because the loudest thing
on the screen is now the question you were being asked when you stopped. The gauge is the part that
could not have been on the old screen at all: three rails that taper, saying in one look that the
level you are interviewing for is the one you have rehearsed least. On the phone the same frame
survives as a fixed top bar and a bottom tab bar rather than dissolving back into a document. The
reading quality the operator called soothing was never in the frame, and the frame is all that
moved: the prose face, the reading measure and the answer surfaces are untouched by this wave.

## 9. Costs carried forward

- The status census renders on the home route ONLY. Putting new furniture on a topic route would
  have moved fourteen baselines this wave is forbidden to touch. The spec's phrasing ("live state
  at the frame's foot") was narrowed to home-only during the build, deliberately.
- The sidebar now has two tenants, which is a conditional that did not exist before.
- `Progress.summary()` is unchanged, but `Altitude.compute()` is a new derived model over it.
- Age is topic-granular (section 3).
- Follow-up waves are recorded in `CHOSEN.md` section 9: the `_mustHit()` correctness fix, pushes
  as spoken lines, chain depth as count only, a designed pre-reveal state, and per-probe recency.

---
---

# ROUND-2 ADDENDUM -- 2026-08-01

Round 1 was judged by three appeal-register judges (all FIXABLE) and an independent cold verify
(PASS with findings, one FAIL item). All four are preserved verbatim, with their authors credited,
at `_audit/2026-08-01-w1-judge-the-complaint.md`,
`_audit/2026-08-01-w1-judge-direction-fidelity.md`,
`_audit/2026-08-01-w1-judge-map-conformance.md` and `_audit/2026-08-01-w1-coldverify.md`.
Those four are copied UNEDITED, so they carry the typography their authors wrote;
`test/ascii_guard.py` scopes to `src`, `src/topics-md`, `test` and `tools`, and verbatim wins
inside `_audit`.

The headline: *"The complaint is answered and it is not a close call."* This addendum is the
distance from that to zone-clean.

## A. THE CORRECTION FIRST -- section 7b was wrong

Section 7b of this freeze says **"Nothing else was cut."** That sentence is false and it is
withdrawn.

`CHOSEN.md` section 6.4 specifies *"COVERAGE BY ROOM. Six dense rows, four-state proportion bar."*
Round 1 shipped the pre-existing `Panels.roomsHtml()` card grid instead, and section 5 of this
freeze does not record the deviation. The engineering reason was good and is unchanged --
`test/focus_ring.cjs` asserts that all six `.hm-room` focus halos derive from their own room, in
both themes, each against a live negative control, and re-rendering the rooms under new class names
would have quietly retired that assertion. What was missing was the disclosure. It is made here.

**The deviation is KEPT, and the judge's four costs are addressed rather than argued with:**

| cost | answer |
|---|---|
| the only block below the hero outside the panel grammar | it is now `.hm-panel` + `.hm-phead`, like every other block |
| the loudest colour mass in the work column | titles down from 16px/700 to caption weight, room numerals 18px to 15px, bars 5px to 4px; the room hue survives only where it carries identity |
| heading in the navigation register | "Choose a room" becomes **"Coverage by room"**, which is the spec's own label; the rail's room rows are the actual chooser |
| the third presentation of the same six rooms | acknowledged and NOT fixed. Three surfaces still name the rooms (rail rows, these cards, library group heads). Collapsing one is a real design call about what the rail is for, and it belongs to a wave that can price it, not to a bounce fix. Recorded here rather than quietly left. |

## B. The ten bounce items

1. **THE HERO holds on every resume path.** It read the probe only when the resume cursor was a
   DRILL cursor; `LastVisit.resumeView()` defaults to `walk`, so the majority path quoted the topic
   THESIS -- median 435 characters, 0 of 46 ending in a question mark -- and at worst grew the panel
   to 103% of a 1280x800 viewport, pushing the signature off-screen. Now `heroQuestion()` reads the
   bank on every path: the probe the drill cursor sits on, else the first ungraded probe, else the
   first. Only a topic with no bank falls through, and that path drops the quotes and the framing
   rather than quoting prose nobody spoke. `.hm-q` is clamped to four lines. Measured on `walk`,
   `drill`, `sys` and `model`: every hero ends in a question mark, every one is at most 130px, and
   every panel is under 700px.
2. **The phantom `.hm-act` wrapper is gone.** The CTA's wrapper reused the rail's PILL BUTTON class
   and overrode only its padding, so a non-interactive `div` kept the border, the card fill, the
   10px radius, the 44px floor, `cursor:pointer` and an accent hover on dead space -- and clipped
   the CTA's own focus halo. It is `.hm-do` now: layout and nothing else. One control, one
   affordance.
3. **`--measure-display` came off `.hm-since`, and the check that could not see it can now.** `ch`
   is font-relative, so the display token resolved to 265px on 12px body copy against the hero's
   556px -- the rule it was minted to state, applied backwards, on the one pair it governs. A new
   `--measure-body` (68ch) takes the body copy. `home_rhythm` gained a VALUE arm: a measure is now
   judged against the TYPE TIER of the rule it lands on, both directions are planted as fixtures,
   and the arm was mutant-tested by restoring the judge's exact defect in `styles.css` and watching
   it go RED. The form arm alone passed that same mutant.
4. **One truth about position.** The cursor is stated once, in the resume sentence, beside a
   remainder that names its own denominator: *"...and stopped at probe 11 of 21. 9 still
   ungraded."* The CTA sub-line names the destination only. Walk steps are STEPS -- "probe" is what
   the census and the gauge are denominated in.
5. **Spec 6.4** -- see section A.
6. **Census vs scroll-top disc**, desktop: one home-scoped `bottom` on `.scrolltop`, the same
   mechanism the phone case already used. Measured: overlap 5.5px to 0.
7. **Map conformance.** The in-column library is a COLLAPSED `details` -- the load-bearing half of
   the `.mcomp` pattern round 1 cited and then dropped; it was 62/64/70% of the home's scroll height
   at 1024/900/390, now under 25% at all three. Cross-topic drill and Weak-spot review are restored
   below 920px as an in-column twin (they were rail-only, and the phone rail hides its sections --
   a regression against master). The `ready` badge reads **"drilled + recalled"**: coverage is
   SHAPE, never VERDICT.
8. **Complaint-lens extras.** The gauge accuses only on evidence -- `Altitude.compute()` returns
   `thin: null` unless one rail is STRICTLY thinnest, so all-zero, level and perfect records each
   get a sentence that is true instead of an accusation the record cannot support. The
   absent-record resume contradiction is gone (the remainder falls back to the BANK length, not 0).
   The library badge no longer paints over the per-card reset button. The phone's three-bar mark is
   off -- it sat in the canonical hamburger position, did nothing when tapped, and was not a menu;
   the wordmark stays, so the product is still named.
9. **Born-accessible.** Exactly one RENDERED h1 on the home (the Continue block's own heading);
   `role="banner"` declared on the rail's identity row -- declared, not implicit, because `header`
   does not map to banner inside another landmark; a real skip link, off-screen until focused, first
   in tab order, targeting a now-focusable `main#home` that also gained an accessible name; and the
   sidebar is renamed "Home controls" on this route with the symmetric restore in `view-manager.js`.
   `heading_tree` gained an arm asserting exactly one rendered h1, so the criterion can fail.
   **One correction to the bounce, on disk evidence:** item 9 records card names as "the one met
   criterion". The cold verify measured the opposite -- 46 library cards computing their accessible
   name from their whole contents, median 481 characters, zero `aria-describedby` (verdict 4d). The
   INSTRUCTION (leave them alone this round) is followed either way, and it is the right call:
   `topicCard()` is shared with the topic-index overlay and the switcher, and `at_name_hygiene` pins
   its separators. But it is unbuilt, not met, and it should be scheduled rather than closed.
10. **Record-keeping** -- this addendum, the four verbatim verdicts, a fresh full-gate capture, and
    re-shot receipt pairs.

## C. What this round introduced, and what caught it

Recorded for the same reason round 1 recorded its two: the arms that caught them are the ones worth
keeping.

1. **A 38px tap target.** Shrinking the rail's actions to buy phone bar height put them under the
   44px floor. `visual_pane_smoke` said no. The bar grows instead, and `chrome-metrics` reserves the
   truth.
2. **Two checks left pointing at addresses that had moved.** `visual_pane_smoke` measured
   `#home .hm-act` (the actions live in the rail now) and `flow_cursor` read the cursor from the CTA
   sub-line (it lives in the resume sentence now). Both re-anchored to the new address with the
   invariant unchanged; neither was weakened, and `flow_cursor` still proves the same thing -- what
   the home ADVERTISES is what `posRestore` will land on.

## D. Gate and VR

**75/75 PASS**, capture at `_audit/2026-07-31-appeal-home-gate.txt` (rewritten this round; written
outside the repo during the run and copied in). Registration delta against `1c533d7` remains exactly
`+home_reflow`; nothing deleted, nothing skipped.

VR: `home-light` and `home-dark` rebaselined again under the standing authorization, pair kept,
manifest updated. **The other 14 baselines remain byte-identical to `1c533d7`** -- `git diff --stat
1c533d7 HEAD -- test/baselines/` is exactly three changed files.

Receipts re-shot after the round-2 changes: `_audit/appeal-home-receipts/`.

---
---

# ROUND-3 ADDENDUM -- 2026-08-01

Round 2 was judged by the same three lenses: FIXABLE / FIXABLE / BLOCKING. Thirteen closures were
verified on the live page, several re-measured better than asked, and one judge reproduced this
wave's new `home_rhythm` arm's negative control himself. All three verdicts are preserved verbatim
with their authors credited at `_audit/2026-08-01-w1r2-judge-*.md`.

Then all three named the same thing, independently, and it is the third round on that module.

## A. THE CLASS, and the rule that now governs this route

**The home printed claims the record could not support.** Three rounds, three costumes, and every
instance rode in on a CORRECT fix:

| round | the claim | the record |
|---|---|---|
| 1 | "Staff is the thin rail" | nothing graded at any tier |
| 2 | "Every rail is full. Solid on all 972 probes across all three tiers" | two rails visibly empty, the panel's own header reading "310 SOLID OF 972" |
| 2 | "you stopped at step 1 of 9" | no walk position stored, ever |
| 2 | "every hero ends in a question mark" (the addendum) | four renders of one topic; 52 of 972 are imperatives |

**The standing rule for this route, now enforced rather than intended: the home may not print a
claim it cannot derive -- where evidence is absent, it says less.**

Three rounds of judgment found this class and the gate never could. `grep` across `test/` for
`hm-verdict`, `"thin rail"`, `Altitude.` or `hm-seg` returned **zero** before this round: the
signature's punchline, the hero's completeness and the position sentence -- the three things this
wave is *about* -- had no arm that could fail. That is the actual defect behind all four rows above,
and it is what round 3 fixes first.

**`test/home_claims.cjs` is new and it is the class-killer.** Nine edge records (empty, one-solid,
two tiers tied under a higher third in both directions, genuinely level, perfect, absent-field,
mixed-position, no-record) driven at 1280 and 390, asserting each rendered claim **against the
numerals rendered beside it** -- not against taste. Four planted mutants, each one a defect a judge
actually found on a shipped build; the check ABORTS if any goes undetected. **72 assertions.**

It earned its keep on its first run, on my own code: it caught the new gauge printing *"Solid on
all 972 probes across all three tiers"* while the three rails totalled **971**. The bank carries an
EXTEND tier that is not a ladder rung. Same class, one probe wide, caught by the arm written to
catch it rather than by a fourth judge.

## B. The gauge: record class -> exact sentence

`Altitude.compute()` no longer returns a nullable name for the consumer to infer from. It returns
the SHAPE -- `thinSet`, `level`, `full`, `minPct`, `ladder` -- and comparison is at the **rendered
precision** (integer percent), because a raw-float `<` named a thin rail on a 0.046-point
difference the instrument does not draw.

| class | condition | sentence, and every number in it |
|---|---|---|
| **cold** | `graded === 0` | *"Nothing graded yet. Each rail is one interview tier and each mark is one probe -- they fill as you grade yourself, and the shortest rail is the level you are least ready for."* No verdict; it explains the instrument. |
| **full** | every rail at 100% | *"Every rail is full. Solid on all `ladder.n` probes across all three tiers -- there is no thin rail left to name."* `ladder.n`, not the bank total. |
| **level** | all three rails at ONE rendered pct | *"The rails are level. All three tiers sit at `minPct`% solid..."* -- and `minPct` is the number every rail shows. |
| **thin, one** | exactly one rail lowest | *"`T` is the thin rail. `solid` solid of `n` probes, across `topics` of 46 topics..."* -- that rail's own figures. |
| **thin, several** | two rails share the lowest pct | *"`A` and `B` are the thin rails. Both sit at `minPct`% solid -- `A x of y`, `B x of y` -- under a rail that is further along."* Each rail quotes itself; no rail's number is asserted of another. |

The fifth row is the one round 2 did not enumerate, and it is where the false sentence lived.

## C. The remaining eleven items

2. **The hero is never truncated.** The 4-line clamp cut the question mark off 1 of 972 probes at
   1280 and **63 of 972 at 390** -- and what a clamp removes is always the end, which is always
   where the question is. Fixed by fitting rather than by hiding: the narrow column takes a display
   step down (21px -> 18px below 860) and the line budget is sized from a **census of all 972
   probes at every breakpoint**. Measured after the fix: **0 of 972 clipped at 1440, 1280, 1024,
   860, 430, 390, 360 and 320.** `home_claims` asserts the rendered hero is unclipped on every
   record it drives.
3. **The outline heroes what the pixels hero.** Round 2 minted the home's first h1 and pointed it
   at the 9px eyebrow carrying the TOPIC NAME -- so the pixels stopped being a table of contents and
   the document's outline started being one. The **question is the h1** now; the eyebrow is the
   label it looks like; `aria-labelledby` names the panel by the question. A no-bank topic gives the
   eyebrow the h1, so the page always has exactly one.
4. **Position honesty.** `cursor()` gated on `posGet(id)` being truthy and then read a field that
   might not exist -- `posRestore` returns 0 for an absent field, which is right for a pane
   restoring itself and wrong for a sentence claiming where you stopped. The **field** is the gate
   now. The hero matches the pane Enter opens: a stored DRILL cursor earns "Where you stopped" and
   the probe it sits on; any other resume pane heroes the probe the drill would serve **next**,
   under **"Up next"**. That also makes `firstUngraded()` reachable, which it provably was not. And
   the remainder keeps its denominator whenever the position is denominated in something else.
5. **(BLOCKING) The room controls work again.** `scrollToRoom` looked up `#homelib` first with a
   `||` fallback -- but `#homelib` is rendered unconditionally, so the query always returned a node
   and the fallback could never fire. Below 1280 every room control called `scrollIntoView` and
   `focus` inside a `display:none` subtree: six styled, focusable buttons and the 1-6 hotkeys doing
   nothing, a regression against master. Resolution now prefers the **visible** mount (`offsetParent`)
   and opens the drawer if that is the host. Measured moving the page at 1280, 1024, 900 and 390.
6. **The LIBRARY tab delivers the library** -- it opens the drawer before scrolling.
7. **The badge never overprints a title.** Two round-2 fixes landed on the same 36px of corner
   without being measured against each other: the badge moved 25px inboard and its longest string
   more than doubled, against a title reserve that was a constant 50px -- 28 of 46 cards
   overprinted, worst case 88px, and worse in the 234px Topic-index cards. The reserve is sized for
   the badge (92px) **and** the badge says the shorter true thing (`recalled`). Measured by TEXT INK
   across all 46 cards: 0 overlaps.
8. **The census sheds by priority instead of clipping itself.** It was a fixed 719px in an
   `overflow:hidden` bar and cut itself mid-word between 420 and 790px -- first casualty *"Offline
   -- nothing leaves this file"*, the one claim on the bar that is not a number. Segments now drop
   lowest-priority-first; the probes-graded figure never leaves. And `home_reflow` was extended from
   {320, 390} to {320, 390, 500, 700, 900}: **the only bar in the app that actually clipped was
   `display:none` at both widths the fixed-bar clipping check sampled.** The widened check found a
   residual 13px at 500 that this fix then closed.
9. **The disc tracks the measurement again.** Round 2's home-scoped constant at specificity (0,2,1)
   outranked the app's measured rule at (0,1,0), so on a phone with a home-indicator inset
   `--chrome-bot` correctly re-measured 45 -> 79 and the disc stayed at 54: **25px inside the tab
   bar it was dodging.** The census now feeds `--chrome-bot` through `chrome-metrics.js` like every
   other fixed bar, and the disc's offset is the measurement plus the authored gap at every width.
   Verified by growing the bar at runtime and watching the disc move with it.
10. **The tab bar tells the truth.** `aria-current` was set on tap only, so it read "Today" for the
    whole length of the page -- and it is announced. An IntersectionObserver marks whichever target
    owns the viewport. Destinations also gained `scroll-margin-top`, because a tab that scrolls its
    target to y=0 parked it under the 57px fixed rail: you arrived at the gauge with its title and
    headline figure hidden by the bar you navigated from.
11. **The autofocus ring -- the design call, decided.** Z1's hard floor is *"1 keystroke, 0 clicks,
    autofocused... any direction that costs this loop is a regression regardless of what it buys"*,
    so removing the autofocus was not available: Enter would land on `<body>`. But Chromium matches
    `:focus-visible` on a load-time PROGRAMMATIC focus, so at rest the accessory wore the
    highest-contrast edge on the screen (14.72:1) -- exactly what the coherence ruling's
    one-signature rule exists to prevent, and it got louder *because* removing the phantom wrapper
    stopped clipping it. **Decision: keep the autofocus, quiet only its ring until the first real
    keystroke** -- which is also what Firefox does natively. A keyboard user re-arms it with their
    first Tab, before they could need it; a mouse user never sees it; at rest the loudest object is
    the instrument. `focus_ring` is re-anchored to press a key first -- a fairer reading of its own
    question, since a keyboard user has by definition pressed a key -- and **gained an arm** that
    the quiet state is genuinely quiet, so the decision can fail rather than merely being asserted
    here. 12 assertions -> 14.

## D. Claims at measured strength

Round 2's addendum said *"every hero ends in a question mark"*; a judge measured 52 of 972 probes
as imperatives (*"Defend the choice."*). The substance held -- those are still sentences an
interviewer speaks -- but the stated invariant did not, and it was generalised from four renders of
one topic. Round 3 states coverage instead of invariants:

- **Hero completeness:** censused over **all 972 probes at 8 widths** (1440 / 1280 / 1024 / 860 /
  430 / 390 / 360 / 320): **0 clipped**. Not "every hero is a question" -- the claim is that no
  rendered hero is cut off.
- **Claims battery:** **9 records x 2 viewports, 72 assertions**, all green, 4 mutants detected.
- **Round-3 acceptance probe:** 16 assertions over items 3, 5, 6, 7, 9, 10, 11 at four viewports.
- **Not covered, stated plainly:** no real-device test (the safe-area inset is injected, as the
  judge's own was); no screen-reader pass; the 420-919px band still has no room nav or Topic-index
  affordance beyond the `\` key, which is pre-existing and named by the map judge as uncharged; and
  the third presentation of the six rooms is still deliberately unfixed from round 2.

## E. Gate and VR

**76/76 PASS** -- capture at `_audit/2026-07-31-appeal-home-gate.txt`, written outside the repo
during the run and copied in. Registration delta against `1c533d7` is `+home_reflow` and
`+home_claims`; **nothing removed, nothing skipped, nothing weakened.** `focus_ring` gained an
assertion; `home_rhythm` and `home_reflow` both grew their coverage.

VR: the two home baselines rebaselined under the standing authorization, pair kept, manifest
updated. **The other 14 remain byte-identical to `1c533d7`.**

Receipts re-shot after the round-3 changes: `_audit/appeal-home-receipts/`.

---
---

# ROUND-4 ADDENDUM -- 2026-08-01

Round 3 was judged FIXABLE / FIXABLE / BLOCKING. Most items closed and were verified; what remained
clustered on two chronic objects and one structural gap. All three verdicts are preserved verbatim
with their authors credited at `_audit/2026-08-01-w1r3-judge-*.md`.

This round is about exits, not patches.

## A. THE GAP THAT MATTERED: a retrospective seed list cannot cover what has not been found

Round 3 built `test/home_claims.cjs` to kill the "prints a claim it cannot derive" class, and a
judge proved the analyser was right and the inputs were not. He copied the file, **added one
record** -- one probe of 971 graded Shaky -- changed nothing else, and the check **failed on the
shipped build**: *"claims every rail is full while the rails render 970 solid of 971."*

The nine records were the nine defects three judges had already found. None of them sat in the band
where `Math.round` and equality disagree, which is exactly where the fourth instance of the class
was living. A list built from what has been found cannot cover what has not.

**So the battery is now GENERATIVE.** A deterministic PRNG (mulberry32 off a fixed seed, so the
gate stays reproducible byte-for-byte) builds **24 randomized records per viewport**, deliberately
biased toward the boundaries -- all-empty, all-full, and the 99.5-100% band -- because a uniform
sampler almost never lands where the absolutes live. The property is **entailment**: every sentence
and every numeral the home prints must be derivable from the record's exact integers.

The pinned records stay as cheap regression pins, and four were added, including the judge's
`oneShort` and its mirror `nearlyFull`.

**Teeth, demonstrated on the product rather than asserted.** I restored round 3's own
`full = (min === 100)` into `altitude.js`, rebuilt, and ran the check:

```
FAIL [1280/oneShort]   the verdict agrees with the numbers beside it
     -- claims every rail is full while the rails render 970 solid of 971
FAIL [1280/oneShort]   the entailment agrees with the numbers beside it
     -- uses the absolute "every rail is full" on a record with 970 of 971 ladder probes solid
FAIL [1280/nearlyFull] ... 968 solid of 971
```

Then restored. The arms the round-3 teeth-test found toothless were also hardened: `judgeVerdict`
now returns RED on an unrecognised verdict instead of silent green; every `N of M` inside a verdict
must equal the `N / M` on the rail whose tier name precedes it (one rule that covers a whole family
of quoted-figure defects at once); the panel header and the census are **judged**, not merely read;
the h1 arm asserts **identity** (the h1 IS the hero question) rather than cardinality; and
`judgePosition` validates the numeral against the **stored record**, not against the pane name.

**And the hero census moved into the gate.** The named records render ~10 distinct questions of 972,
so the hero arm could not fail on the clamp regression it was written to guard. A new arm clones the
live `.hm-q` box and measures **every question in the bank** at the width in hand.

## B. THE GAUGE, fourth round -- exact integers compared, rounded integers displayed

The remaining lie was one line: `full = (min === 100)` on **rounded** percentages. Every rail at
99.5% or above renders "100%", so one Shaky probe among 971 licensed *"Every rail is full... there
is no thin rail left to name"* while Staff was thin **and flagged** on the same screen. The
consumer's own comment, twenty lines away, had specified the right rule.

**Every comparison in `Altitude.compute` and the sentence chooser now derives from exact integers.
Rounded values are displayed and never compared.** Level is decided by integer cross-multiplication
(`a.solid * b.n === b.solid * a.n`), so no float is involved anywhere.

| class | decided by | condition (exact where it licenses an absolute) | sentence |
|---|---|---|---|
| **cold** | exact | `graded === 0` | *"Nothing graded yet..."* -- explains the instrument, claims nothing |
| **full** | **EXACT** | `ladder.n > 0 && ladder.solid === ladder.n` | *"Every rail is full. Solid on all `ladder.n` probes across all three tiers -- there is no thin rail left to name."* The only absolute on the panel. |
| **level** | **EXACT** | every rail's share exactly equal, by integer cross-multiplication | *"The rails are level. All three tiers sit at `minPct`% solid..."* |
| **tied at this precision** | rounded | all rails render the same percent, NOT exactly equal | *"The rails are within a point of each other, all rendering `minPct`% solid -- nothing separates the levels at this precision yet."* A new class: "level" would be an absolute the record does not support, while this is exactly what the reader can see. |
| **thin, one** | rounded | one rail renders the lowest percent | *"`T` is the thin rail. `solid` solid of `n` probes..."* -- its own figures |
| **thin, several** | rounded | two rails render the lowest percent | names both, each quoting its own figures |

Rounded is correct for `thin`/`tied` and **only** there: the claim is about which rail *looks*
lowest, the sentence quotes each rail's own exact figures, and singling one out on a 0.046-point
difference the instrument does not draw was itself a charged defect in round 2.

**The header seam is closed.** The panel header counted the BANK (972) while its own rails and
verdict counted the LADDER (971) -- both judges hit it independently. One panel, one denominator:
the header reads *"N solid of 971 on the rails"*, and any probe on no rail is **named** in the
legend (*"+ 1 probe outside the three tiers, on no rail"*) rather than folded into a total its own
rails contradict.

## C. THE CENSUS, third round -- the ladder had two dead rungs

The priority-shedding CSS targeted `#st-2` and `#st-3`. `statusHtml()` emitted **neither**, so two of
four rungs matched zero elements and the bar went on clipping itself mid-word through the 420-492 and
520-544 bands. A documented ladder with dead rungs is worse than no ladder: it reads as solved.

The ids are emitted now. Verified by **1px sweep**, not by sampling: on the widest census the bar can
hold (three-digit counts everywhere, 46 of 46 topics started) there is **no clipping at any width
from 400 to 1000**.

And `home_reflow` was fixed at the input as well as the sample list. It drove a **fresh install** --
where every census figure is a single `0`, the narrowest the bar will ever be -- so the arm was
sampling the one record on which the bar cannot clip. It now seeds a mature record first, and its
widths went from {320, 390, 500, 700, 900} to {320, 390, **430**, **460**, 500, **530**, **560**,
700, 900}, because 430 and 530 are where the two bands actually lived and the previous list cleared
them by 6.8px.

## D. The mechanical seven

4. **Cursor validity.** An out-of-range stored cursor (`{drill:24}` on a 21-bank) was clamped to 0
   and asserted as *"stopped at probe 1"* -- a place the record was never in. Out of range is now
   treated as an **absent field**: no claim at all, which also lets the hero fall through to the
   first ungraded probe. Pinned as the `staleCursor` record.
5. **The `firstUngraded` sentinel.** `0` meant both "the first probe is ungraded" and "none are", so
   a fully graded topic heroed probe 1 under **"Up next"** while the sentence below said every probe
   was graded. It returns **-1** for none, and that case gets its own eyebrow (*"Worth another pass"*).
   A sentinel that collides with a valid index is not a sentinel.
6. **The cold home's h1** is its question, the same tag swap round 3 made on the engaged path.
7. **THE FOCUS TRAP (must-fix, an a11y regression this wave introduced).** `render()` re-added
   `hm-quiet-focus` and re-focused on **every** render -- and `render()` is the `rerender` callback
   `Panels.bind` holds, which the per-card reset control calls. A keyboard user who reset a topic had
   focus moved to the CTA with **no indicator at all**. The quiet window now belongs to the session,
   not the render, and any keydown ever closes it for good. `focus_ring` gained an arm that presses a
   key, forces a re-render, and asserts the ring **survives** it -- mutant-tested by restoring the
   shipped behaviour and watching it go red in both themes. 14 assertions -> **16**.
   *Correction to my own first attempt:* I initially also latched on "has autofocused once", which
   was wrong -- the home legitimately renders more than once on a single load, so the second render
   un-quieted the ring at first paint. My own round-3 probe caught it. The keydown is the only signal
   that means anything here.
8. **Tab-bar truth.** The scrollspy's `-45%/-45%` band observed about a tenth of the viewport, so
   ~600px of the page belonged to no target and the bar held a stale mark through it -- and "Today"
   could never be current once `.hm-continue` cleared that sliver. The band is now the top of the
   viewport downward, which **partitions** the page: every scroll position has exactly one owner.
9. **The goal fraction.** *"46 of 5 topics"* -- a ratio whose numerator can pass its denominator is
   not a ratio. Past the goal the phrasing states what it knows: *"46 topics drilled, 5-topic goal
   met with 41 to spare."* Visible text and `aria-label` both, because the bar is `role="img"`.

## E. Claims at the strength of my own coverage

- **Battery:** 13 pinned records + **24 generated per viewport**, 2 viewports, **206 assertions**,
  6 planted mutants. Negative control demonstrated by restoring round 3's own defect into the
  product and watching two arms fail on two records.
- **Hero:** censused over **all 972 probes at both gate viewports, in the gate** -- 0 clipped. The
  earlier one-off builder measurement (8 widths) is superseded by an arm that can fail.
- **Census:** 1px sweep, 400-1000, widest possible record -- 0 clipping. `home_reflow` now seeds a
  mature record and samples 9 widths.
- **Not covered, stated plainly:** no real-device test (the safe-area inset is injected, as the
  judge's own was); no screen-reader pass; the generative arm explores the LADDER's shape and the
  resume pointer, not the whole record space (whiteboard state, bookmarks and trend history are
  untouched by it); the 420-919px band still has no room-nav or Topic-index affordance beyond the
  `\` key, which is pre-existing and disclosed as uncharged since round 2; and the third
  presentation of the six rooms remains deliberately unfixed.

## F. Gate and VR

**76/76 PASS** -- capture at `_audit/2026-07-31-appeal-home-gate.txt`, written outside the repo
during the run and copied in. Registration delta against `1c533d7` is `+home_reflow +home_claims`;
**nothing removed, nothing skipped, nothing weakened.** `focus_ring` 14 -> 16 assertions,
`home_claims` 72 -> 206, `home_reflow` 5 widths -> 9 on a seeded record.

VR: the two home baselines rebaselined under the standing authorization, pair kept, manifest
updated. **The other 14 remain byte-identical to `1c533d7`.**

Receipts re-shot after the round-4 changes: `_audit/appeal-home-receipts/`.
