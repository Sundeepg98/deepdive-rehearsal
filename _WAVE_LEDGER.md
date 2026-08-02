# W1.5 WAVE LEDGER -- the home's refinements

**Worktree** `D:\claude-workspace\_worktrees\deepdive-rehearsal\w15-home`
**Branch** `appeal/w15-refinements`, cut from master tip `2696291`.
**Gate expectation** 76/76 (no new check registers; the two new arms extend existing checks).
**VR contract** home baselines REBASELINE AUTHORIZED; non-home baselines must not move.

---

## CYCLE 1 -- 2026-08-02

Six items opened. **Five closed by build, one closed on arrival** (item 5 had already landed on
master and is verified rather than re-done). One item's stated OUTCOME is met on one record shape
and missed on the other; that half stays open and is stated with its number rather than rounded up.

---

### 1. P-KEY GUARD -- CLOSED

**The defect, measured before the fix.** On the `#home` route, with a seeded record whose resume
topic was `saga`, one press of `p` opened `#sessov` -- the per-topic Session progress panel -- and
`TopicRegistry.current()` read **`content-pipeline`**, the BOOT constant. A topic the user never
chose, reporting its grading, on a route that has no current topic. That is the exact class
`shell.js`'s own titled rule was written for ("THE HOME IS A DESTINATION, NOT A MODAL": the topic
keys "must not silently act on the BOOT topic -- they retarget to the resume topic, or do
nothing"). `w` was gated when it was caught doing this; `n` carries `&& !onHome` for the same
reason; `p` fell through the block.

**The fix.** `src/scripts/app/shell.js:261` -- `if (key === 'p') return;`, inside the existing
`if (onHome)` block, beside the `[` / `]` no-op. No retarget: the panel reports ONE topic's
grading, and the home's own record surfaces (the gauge, the status census, Still shaky) already
state that for every topic. So it does what `n` does on the home: nothing.

**The arm, and which check it extends.** `test/overlay_deadzone.cjs`, new **section 5** (4
assertions). That file is the one whose subject is already "did a layer act when it had no
business acting"; it already drives trusted `page.keyboard.press` and reads
`[role=dialog][aria-modal].open`; and its section-2 arm is the same assertion one context over
(the global keymap must stay suppressed UNDER an open modal). No new instrument was built for a
defect an existing one is shaped for.

Three arms so the first one is not free:
- `p` on the home opens no dialog and moves no route;
- **the probe is not blind** -- the same reader must report the panel when `#sessopen` is
  genuinely clicked (a green above is worthless if this comes back empty too);
- `p` **still works** on a topic route, so the guard cannot be "fixed" by deleting the shortcut.

**MUTANT-TESTED.** Guard removed (`if (false && key === 'p')`), rebuilt, re-run:

```
FAIL  [home keymap] `p` on the home opens NO per-topic panel
      -- opened sessov with TopicRegistry.current()=content-pipeline
         -- a topic the user never chose; the resume topic is saga
OVERLAY DEADZONE: FAIL  (1 of 40 assertions)
```

The other three arms stayed green, so the red is specific to the guard. Guard restored:
`OVERLAY DEADZONE: PASS (40 assertions)`.

---

### 2. CROSS-ACT ORDINAL SWAP -- CLOSED

`src/scripts/app/panels.js:267` -- `actionsHtml()` is now `weakDrillBar() + crossDrillBar()`.
`src/scripts/app/home-view.js` `railHtml()` -- the Practice nav renders Weak-spot review, then
Cross-topic drill, then Topic index. Both carry the same one-line reason: both acts are
cross-topic, but only one is addressed to THIS record ("the 16 topics you have been shaky on")
while the other is the same offer for everybody, so the specific act goes above the generic one
wherever the pair renders.

**Receipts.** `at_name_hygiene: 52/52 assertions, 9 + 2 mutants all detected` (it pins by name, not
order, as the brief said). `rail_integrity: PASS -- 414 combos, 0 leaks, 0 empty boxes`.

**Stated honestly:** this moves ZERO pixels in the VR capture, because the captured record is cold
-- `weakCount()` is 0, so the weak row does not render at all and there is nothing to reorder. The
swap is verified from source and by the two checks above, NOT by the rebaselined pixels.

---

### 3. GOAL SINGLE-SOURCE COMPLETION -- CLOSED

The rail's `.hm-goal` block is deleted from `railHtml()`, together with its now-unused
`var g = Panels.weeklyGoal()`. Its stylesheet rules go with it in the same commit rather than
waiting to be found by an orphan audit: `.hm-goalbar` and `.hm-goalbar i` are removed, and
`.hm-goal` is dropped from the phone's `display:none` pair at `src/styles.css` (the rule now names
`.hm-rail .hm-rsec` alone).

**grep-verified.** `grep -rn "hm-goal" src/` returns **two hits, both prose** (the explanatory
comment in `home-view.js:236` and the stylesheet note at `styles.css:2430`). No renderer remains.
The weekly goal now has exactly one: `Panels.goalStrip()` (`panels.js:151`), consumed once by
`telemetryHtml()` (`panels.js:276`) and refreshed IN PLACE after a +/- press (`panels.js:543`,
which replaces the one `.ix-goal` element rather than being a second path to the fact).
`goalPhrase()` stays exported (`panels.js:617`) deliberately -- it is the single source any future
surface must call instead of re-deriving the sentence.

Note the shape of what was wrong: below 920 the rail collapses and `.hm-goal` was already
`display:none`, so the PHONE always had one goal surface and the DESKTOP had two. Now every
viewport has one.

---

### 4. PHONE FIRST SCREEN -- CLOSED for the move; the chip-list outcome is MET on one record
###    shape and MISSED by 61px on the other. Read the numbers.

**4a. The move -- done, in `html()`, not with CSS `order`.** `.hm-practicem` now renders directly
below `continueHtml()`. Measured at 390x844 against the live band **57-799**:

| | before | after |
|---|---|---|
| `.hm-practicem` (the two practice acts) | top **2136** | top **360** |
| `.hm-alt` (the gauge panel) | 370-752, h **382** | 442-719, h **277** |
| `.hm-duo` | top **778** | top **735** |
| `.hm-chips` (Still shaky) | top **825** -- OUT | top **782** -- **IN** |

The practice acts were 1337px below the first screen, reachable only past the gauge, both panels
and all six room cards. The adjudicator's prohibition on `order` is honoured: the DOM sequence --
which is what the keyboard, the screen reader and the tab bar's crossing pointer all read -- is
what moved.

**4b. The gauge compaction, below 920 only.** `src/styles.css`, one block: the rail tracks go
32px -> 16px (a rail's information is horizontal -- 46 segments, and the stylesheet's own SIGNAL
RULE puts the grade in the FILL, never in the size, so height is the only dimension that costs the
instrument nothing), tighter panel head/body padding, a tighter verdict rule, and at <=419px the
row gap drops to 2px and the `aria-hidden="true"` key folds away -- the same width where the
status census already leaves for the same reason. The three stack roles above the duo are
**re-valued, not re-picked**: one `--gap-home-*` declaration block on `#home`, phone only, so
`home_rhythm.py` still sees the semantic layer (`HOME RHYTHM: PASS -- 8 rhythm gaps + 11 measures,
registry matches discovery exactly`).

**Disclosed:** re-valuing `--gap-home-continue/-altitude/-section` on the phone is slightly wider
than "compact the gauge". It is 30 of the 105px recovered and the outcome does not close without
it. Phone-only, zero desktop pixels.

**4c. WHAT IS NOT CLOSED.** With a record that has weak TOPICS (16 of them), `.hm-practicem`
renders BOTH bars and is 144px rather than 66px. Then: practice 360-504, gauge 520-797 (still
inside the band), duo 813, **chips 860 -- 61px below the fold**. Gauge compaction cannot pay for
that; closing it would need the practice bars themselves compacted, which this item did not
authorise. What the first screen does contain on that record is the **Weak-spot review act**,
which carries the same triage the chip list carries ("the 16 topics you have been shaky on"), so
the record's triage is on the first screen in both shapes -- by chips on one, by the act on the
other. Recorded, not claimed as closed.

`home_reflow: PASS` (320/390/430/460/500/530/560/700/900 x 2 themes, nothing clipped, no
horizontal scroll, 2 planted mutants detected).

---

### 5. CURSOR INTEGER GUARD -- CLOSED ON ARRIVAL, no change made this cycle

The guard the ledger asks for is already on the tree and was already on master tip `2696291`:
`src/scripts/app/home-view.js:112`
`function isIndex(v, n) { return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n; }`
used at `:127` (`p.drill`) and `:132` (`p.walk`) -- an out-of-range OR fractional stored cursor
returns `null`, i.e. no field and no claim. `firstUngraded()` (`:176`) returns `-1` when there is
none, so the hero chain reaches it instead of dying on a sentinel that collides with a valid index.

Provenance: `git log -S "Number.isInteger(v) && v >= 0"` -> `2e3aff6 fix(home): round 5 -- one
fact, one renderer, and an arm that can finally fail`, and the round-5 addendum records it under
"ALSO IN THIS COMMIT" as the authorised cursor guard. Re-implementing it would have been churn;
the item is closed by verification, and the receipt is above so a reader can check rather than
trust.

Its named follow-up from that round is NOT in scope and stays where round 5 left it: **Import a
backup validates nothing**, which is the real defect behind fractional cursors and belongs to a
storage-integrity item with its own schema and migration story.

---

### 6. HOME_CLAIMS PERIOD-BLINDNESS -- CLOSED

**The defect.** `judgeQuotedFigures` wrote its gap as `[^.;]{0,40}` while the rendered
single-thin-rail sentence puts a PERIOD exactly there ("Staff is the thin rail. 62 solid of 310
probes"), so the arm was structurally blind to the one sentence it exists for. Found by a mutant
the gate-runtime acceptance battery aimed at it and watched come back NOT DETECTED, then recorded
rather than fixed (`_audit/2026-08-01-gate-runtime-acceptance.md`, pre-existing defects #2).

**The fix.** The period was never the rule worth enforcing -- it was a cheap proxy for one. What
makes an attribution wrong is ANOTHER TIER NAME standing between a name and the figures being read
as its own, so that is what the gap forbids now, character by character:

```
/\b(Staff|SDE3|SDE2)\b(?:(?!\b(?:Staff|SDE3|SDE2)\b)[\s\S]){0,40}?(\d+)\s+(?:solid\s+)?of\s+(\d+)/g
```

Strictly stronger than the old form: it still refuses to attribute "SDE3 ... . Staff shows 4 of
10" to SDE3, it now reads the thin-rail sentence, and on the two-thin sentence each figure pair
still binds to the name immediately before it because the leading names cannot reach past each
other.

**The regression proof is gr-builder's own mutant, adopted.** New **MUTANT 7** in
`test/home_claims.cjs`: take the LIVE thin-rail sentence and inflate its quoted solid count by
one. It is planted from the rendered sentence rather than a literal, and it carries a NEGATIVE
CONTROL (the untouched sentence must come back clean) plus a leak check (`judgeVerdict` must also
see it), because a mutant that fails for the wrong reason proves nothing.

**A coverage gap found while aiming it, and closed.** The first attempt planted on `oneShort` and
the check ABORTED with `MUTANT 7 CANNOT LAND: oneShort no longer renders a single thin-rail
sentence` -- correct behaviour, and it exposed that **no pinned record produced the single-thin-rail
verdict at all**. Every other seed lands on a tie, on level/within-a-point, on full or on cold, so
the class this home prints most often for a real mid-campaign user was reaching the battery only
through the generative arm, where no mutant can be aimed. New seed **`oneThin`** (three distinct
per-tier shares, 20/50/80, so the rendered percentages cannot round together) pins it.

**MUTANT-TESTED.** Matcher reverted to `[^.;]{0,40}`, check re-run:

```
SELF-TEST ABORT -- the analyser does not do what it claims:
  MUTANT 7 UNDETECTED: the single-thin-rail sentence quoted an inflated solid count and the
  quoted-figures arm accepted it -- the period-blind regex is back:
  "Staff is the thin rail. 48 solid of 310 probes, across 46 of 46 topics ..."
HOME CLAIMS: FAIL (self-test)
```

Matcher restored: `7 planted mutants detected`, all `oneThin` arms PASS at both viewports.

`test/gate_acceptance.py`'s `claims` mutant is deliberately LEFT AIMED at `judgeVerdict`. Re-aiming
it would invalidate the acceptance run its audit document reports; the blindness it recorded is
closed here, and the standing regression proof now runs every gate rather than only when that
battery is invoked.

---

## VR CONTRACT -- HONOURED

Rebaselined: **`home-light` and `home-dark` only**. Attribution: **2101 px each (0.2052%), both in
the SAME 261x51 box at (18,613)** -- the deleted rail goal block ("This week", the bar, "0 of 5
topics") and nothing else. Both diff images were reviewed before regenerating, and the new
`home-light` baseline was reviewed as an image after.

`git diff --stat -- test/baselines/` lists exactly three paths: the two home PNGs and
`manifest.json` (two sha256 values + the generated timestamp). **The other 14 baselines rewrote
byte-identical** under `npm run vr:update`, so the non-home contract holds by rewrite, not merely
by abstention. Item 4 moves no desktop pixel by construction: `.hm-practicem` is `display:none`
above 919px and every compaction declaration is inside a `max-width` query.

---

## GATE

Full serial gate for this cycle: see the capture noted in the follow-up commit
(`_audit/2026-08-02-w15-cycle1-gate.txt`), taken on the COMMITTED tree so `build_integrity` reads
the HEAD match rather than deferring it.

Standalone runs during the cycle, all green: `ascii_guard`, `syntax_check`, `css_syntax`,
`home_rhythm`, `home_reflow`, `home_claims`, `overlay_deadzone`, `at_name_hygiene`,
`rail_integrity`, `cold_open`, `heading_tree`, `sidebar_geometry`, `flow_a11y`, `fold_budget`,
`chrome_metrics`, `visual_regression`.

---

## STILL OPEN AFTER CYCLE 1

1. **Item 4c** -- the Still-shaky chip list is 61px below the fold at 390x844 on a record with weak
   topics (two practice bars, 144px). Needs a decision this cycle did not have authority to take:
   compact the `.ix-cross` bars themselves, or accept that on that record shape the first screen
   carries the triage as an ACT rather than as a chip list.
