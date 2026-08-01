# W1 ROUND 5 -- THE CLOSING ROUND

Builder: appeal-d1 (the direction's author, carried through build and five rounds).
Branch `appeal/home-instrument`, worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\appeal-home-i`.
Judged against: `_audit/2026-08-01-w1r4-judge-{direction-fidelity,map-conformance,the-complaint}.md`
(all three copied in verbatim with their provenance headers).
Gate: **76/76 PASS**, capture `_audit/2026-08-01-appeal-home-r5-gate.txt`.
Deliverable md5 `3e7ec0836beb5263874eaf01df0708de`, byte-identical to `dist/index.html`, 12249669 bytes.

The round's named pattern held up as a diagnosis: **a fact with two render paths is a fact with two
answers.** Items 1, 4 and 5 were all one fact rendered twice, and in each case the fix was to delete
the second renderer rather than teach it the same rule.

---

## THE FIVE

**1. "46 of 5 topics" -- the second surface.** `goalPhrase(g, bold)` moved out of `home-view.js`
into `panels.js` and is now exported; `goalStrip()` calls it for the visible text AND for a new
`role="img"` aria-label, so the strip's two channels can no longer disagree with each other or with
the rail. Verified in the over-target state (46 topics started against a 5-topic goal) at 1280x800
and 390x844: both surfaces read *"46 topics drilled, 5-topic goal met with 41 to spare this week"*,
and the regex `\d+\s+of\s+5\s+topics` matches **nothing** in rendered text at either viewport.

**2. Focus lands off-screen.** `preventScroll` is now true only on FIRST paint; every later render
lets the browser reveal the control it just moved focus to. This item cost the most and the honest
account is below under COVERAGE -- the fix is one line, but the arm guarding it took four attempts
to make capable of failing, and two of those attempts were green against the unfixed build.

**3. Tab bar: the monotone crossing pointer.** Implemented as the comment had described for two
rounds: the owner is the LAST target whose top has crossed the band, so the last target owns
everything below it and no scroll position is unowned; at the document bottom the final target owns
outright. Swept 21 positions across the full scroll range at 390x844 and 700x800 -- monotone
Today -> Altitude -> Library, **zero unowned positions**, and Library is current at max scroll,
which is item 3's stated acceptance. One extra line inside the same function: a target whose
`offsetParent` is null no longer counts as crossed. `.hm-libm` is `display:none` above the phone
breakpoint and a hidden element reports a rect of all zeros, so its top read as 0 -- above the band
-- making it the last crossed target at **every** scroll position from the top of the page down. No
user ever saw a wrong answer because the bar is itself hidden at those widths, which is exactly why
this is worth naming: the pointer was wrong everywhere it was invisible, and would have surfaced the
moment the bar earned a wider breakpoint.

**4. The shedding ladder's dead rung.** Separators are now emitted with `id="sep-2"` / `id="sep-3"`
and named for the item they PRECEDE, so each shed item takes its own separator with it. The prior
CSS paired on the following sibling (`#st-3 + .hm-st-sep`), which matched nothing -- `#st-3`'s next
sibling is the flex spacer -- so every width from 420 to 759 ended the bar on an orphan hairline
separating a figure from nothing.

**5. The off-ladder note, out of aria-hidden.** `.hm-offladder` moved outside `.hm-key` (which is
`aria-hidden="true"`) and became a `<p>` rather than a `<span>`. A descendant cannot override an
ancestor's `aria-hidden`, so the one sentence that reconciles the panel's 971 with the census's 972
was the one sentence no screen reader could reach. This is the only change that moved pixels.

---

## ALSO IN THIS COMMIT, AND NOT ONE OF THE FIVE

**The authorized cursor guard.** `isIndex(v, n)` (`Number.isInteger` + range) replaces the bare
range tests in `cursor()`, per the bounce's explicit "add it". A fractional cursor passed the old
range test and printed *"stopped at probe 3.7 of 21"* over a hero of `cards[2.7]` -- undefined, so
the hero silently fell back to card 0, a probe the record had already graded.

**The denominator, disclosed.** `var tot = pr.tot || bank.length` became `bank.length || pr.tot || 0`.
The live bank is the denominator; the stored aggregate is a cache of it. The old order consulted the
bank only when the record carried no `tot` **at all**, so after a content release -- a stored
`tot:18` against a live bank of 21 -- `left` came from the aggregate while `firstUngraded()` walked
the bank, and the panel printed both answers at once: *"Up next"* above *"Every probe here is
graded"*. Same disease as items 1, 4 and 5, found while fixing them, one line, so it is fixed here
and disclosed rather than smuggled. It was **not** on the bounce list.

---

## COVERAGE -- WHAT IS GUARDED, AND WHAT IS NOT

**Item 2's arm, and three failures to earn it.** `focus_ring` gained a visibility arm and now runs
18 assertions. The arm as first written **passed against both mutants**, and the reasons are worth
recording because each one is a way an assertion can be true for free:

- It ran on `hp`, a FRESH INSTALL, where the home is 1349px tall against an 800px viewport --
  a maxScroll of 549. The focused control is on screen there no matter what the focus call does.
- Reseeded FULLY graded, the home is still only 668px of scroll: every "up next" is spent and the
  weak chips are empty, so a mature record is SHORTER than a mid-campaign one. Seeded partial
  instead (8 cards per topic, one revisit flag) the page runs past 1000px.
- The scroll did not survive. The home restores its own scroll position shortly after load, and a
  `scrollTo` issued before that lands is silently undone -- measured, scrollY back to 0.
- The ORDER was wrong. Re-rendering and then scrolling is not a sequence any user produces; the
  user is already scrolled when the re-render arrives. That ordering also collapses the document
  mid-rebuild, which clamps scroll to 0 and puts the control on screen by accident.

The arm now seeds a mid-campaign record on its own page at 1280x800, lets the restore settle,
scrolls to the bottom, **reports the scroll offset it actually achieved**, and only then re-renders.
It refuses to grade a run where the page was too short or the scroll did not survive -- a green
under either condition is unearned, and that is precisely the state that let two mutants through.
Negative control on the shipped code: restoring `preventScroll: true` reads **top -845, onScreen
false** in both themes. RED, for the stated reason.

**A branch I added and then removed.** Between attempts I added a post-layout pass that re-checked
visibility on the next frame and scrolled the control into view if the browser's post-reflow scroll
restoration had stranded it. I measured that case at top -789 and the pass fixed it. It is **not in
this commit.** The only sequence that produced it drives `render()` and `scrollTo` in the same tick
on an unsettled page, and on a settled page the document does not collapse at all -- so the branch
guarded an ordering I could not produce without writing it myself, and no arm could exercise it.
An unexercisable branch in an a11y path is a liability, not a belt. The prescribed one-line fix
stands alone and the arm proves it.

**Not guarded by a check, verified by measurement only:** item 1's over-target phrasing (probed at
both viewports, both surfaces), item 3's sweep (21 positions x 2 viewports), item 4's separator
pairing, item 5's placement outside `aria-hidden`. Items 4 and 5 are visible in the rebaselined VR
pixels; items 1 and 3 are not, because neither state occurs in a baseline capture. No new check was
written for them -- the bounce said no new instrumentation beyond item 2's arm, and I did not add
any.

**The `offsetParent` guard has no negative control.** It is a correctness fix on a surface with no
user-visible symptom at any shipped breakpoint, and I did not build an instrument for it.

---

## NAMED FOLLOW-UPS (recorded, NOT built)

**Import validation (storage integrity).** The `Number.isInteger` guard in `cursor()` is the cheap
half and it is in. The real defect is that **Import a backup validates nothing** -- a fractional or
out-of-range cursor, a `cards` map keyed to content that no longer exists, a `tot` disagreeing with
the bank, all arrive through that surface unchecked. That belongs to a storage-integrity item with
its own schema and its own migration story, not to a home wave.

**Battery reach (`home_claims`).** Two limits the map judge found, both real, neither fixed:
`take = Math.max(1, Math.floor(rnd() * 46))` caps the generated ladder at **97.84%**, so the
generative arm can never enter the 99.5-100% band where the `full` and `level` claims live -- those
are covered only by the pinned records; and the quoted-figures regex cannot cross a full stop, so a
claim that states its figures in two sentences is invisible to it. Rides with **W4 SPINE+LEDGER**,
where single-source-of-fact makes entailment assertions natural.

---

## VISUAL REGRESSION

Rebaselined: **`home-light` and `home-dark` only**, as authorized. Attribution: **33400 px
(3.2617%) and 33460 px (3.2676%), both in the SAME 624x169 box at (316,602)** -- the off-ladder note
leaving the key row for its own line (item 5) and pushing "Coverage by room" down about 19px.
Nothing else in either frame moved. **The other 14 baselines are byte-identical to `1c533d7`**
(`git diff --stat 1c533d7 -- test/baselines/` lists exactly the two PNGs and the manifest), and no
jitter rewrite was baked in. Both new baselines were reviewed as images before committing, which is
what the check's own `--update` banner demands.

Receipts re-shot at 1280x800 and 390x844 on the same seeded record for both builds:
`_audit/appeal-home-receipts/`.
