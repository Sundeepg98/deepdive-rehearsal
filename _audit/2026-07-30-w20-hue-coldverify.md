# W-X8 "FOCUS HUE" -- COLD VERIFY VERDICT

**VERDICT: PASS-SHIP.** Zero code defects. The fix is correct on all six rooms in both themes,
the outline is byte-identical pre/post, the new guard arms are real and independently falsifiable,
the gate is genuinely 70/70 on my own run, and VR is genuinely object-identical to base. Four
documentation-accuracy findings (F-1..F-4), none blocking; F-1 is a wrong mechanism claim inherited
from the team-lead brief and should be corrected at BOTH ends so it does not propagate to the next
wave. One pre-existing hazard recorded (H-1). The builder's one judgement call is ENDORSED.

**Verifier:** w20-verifier (cold, independent of w20-builder)
**Target:** worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w20-hue`, branch
`xb/x8-focus-hue`, tip `407b3a9`, base `5b94bf6`
**Date:** 2026-07-30

---

## 1. What I re-derived rather than accepted

### 1.1 Own instrument, arithmetic, pre vs post -- 186/186 PASS

`hue_probe.cjs` + `analyze.cjs` (scratch). Deliberately shares NO mechanism with
`test/focus_ring.cjs`: the shipped check resolves its expectation through a `color-mix()` probe and
compares serialised strings, so a mis-serialisation would move both sides together. Mine reads
`--rm` as a plain `rgb()` triple and derives the expected halo NUMERICALLY --
`color-mix(in srgb, X 15%, transparent)` serialises as `color(srgb R/255 G/255 B/255 / 0.15)` --
so the expectation is computed in node, never asked of the engine.

Six rooms x two themes x two builds, isolated contexts, `innerWidth` asserted 1280 (hard throw
otherwise), `:focus-visible` asserted on every read:

| | measured |
|---|---|
| PRE (base `5b94bf6`) | all six halos = the roomless `--acc` (light `rgb(83,74,183)`, dark `rgb(157,147,240)`), alphas .15/.20, `inset=[]` on all 12 card-theme pairs |
| TIP (`407b3a9`) | all six halos = the card's OWN `--rm`, alphas .15/.20, inset stripe restored wearing `--rm` |
| OUTLINE | **byte-identical pre/post on all 12 pairs**: `2px \| solid \| <the room> \| 2px` |
| `.hm-cta` | box-shadow AND outline byte-identical pre/post -- untouched, as claimed |

Every row of the freeze's Section 2.3 table reproduces exactly. The freeze's Section 4 claim that the
outline is unchanged in "same width, same style, same colour, same offset" is verified **per card**,
not assumed.

**Negative control on my own arithmetic (bidirectional).** The SAME conversion identifies `--acc` on
the pre-fix build and `--rm` on the tip. A broken conversion could not match two different colours in
two different builds. The pre-fix run is itself the negative control for "derives from own room".

### 1.2 Real `Tab` presses -- the ground truth the shipped guard does not use

The guard focuses programmatically; `focus({focusVisible:true})` is a HINT to the engine. A fix that
appeared only under the programmatic path would be green on something a keyboard user never sees.
Walked the real tab ring on the tip build: `:focus-visible=true` on all six cards in both themes,
inset stripe present, halo channels equal to `--rm`.

From a cold home the hero is autofocused and **tab 1 -> messaging-events, tab 2 -> data-storage** --
the freeze's Section 2.1 claim is exactly right. (My first probe blurred to the document top and
reached the cards at stops 6-11; the discrepancy was mine, not the freeze's. Reconciled before
reporting.)

**Instrument-bug disclosure.** My throwaway tab probe printed `halo channels match --rm: NO` for dark
messaging-events. That is a rounding bug in my own cosmetic string-match helper (`0.07451` vs the
engine's `0.0745098`), not a defect -- the authoritative numeric comparison in `analyze.cjs` passes
that exact card. Recorded because this repo's standing lesson is that every fresh instrument is buggy
on its first attempt, and that includes mine.

### 1.3 Watched red, reproduced with the SHIPPED check

`node test/focus_ring.cjs <base deliverable>` -> exit **1**, `FOCUS RING: FAIL (4)`, 8 PASS / 4 FAIL
of 12. The measured halo is byte-identical to the "the roomless `--acc` would paint" column in all 12
card-theme pairs, and `inset=[]` on all of them. Matches the committed
`_audit/2026-07-30-w20-hue-watched-red.txt` exactly.

### 1.4 Four static mutants of my own, plus a no-op control

Text substitutions in the file the browser parses (independent of the builder's runtime CSSOM
harness); each anchored to exactly one hit or it aborts.

| mutant | result | what it establishes |
|---|---|---|
| `CONTROL_noop` -- semantically identical rewrite | **12 PASS** | my mutant machinery is not itself breaking the file |
| `A_room_reverted` -- the wave's rule removed | FAIL(4), `.hm-cta` green | the wave's own arms |
| `B_cta_reverted` -- W15's hero rule removed | FAIL(2), hero arms only | the arm watched-red **cannot** demonstrate |
| `C_room_wrong_token` -- halo declared HERE but wearing `--acc`, stripe intact | FAIL(2) on arms **9-10 only**; stripe arms green | arms 9-10 are sensitive to HUE alone |
| `D_room_stripe_dropped` -- room hue correct, inset dropped | FAIL(2) on arms **11-12 only**; halo arms green | arms 11-12 are sensitive to the STRIPE alone |

**C and D establish something the builder's mutants do not.** Their mutants delete the whole
`box-shadow` declaration, which flips hue and stripe together and cannot show which arm did the work.
C/D prove each arm is individually sensitive to exactly its own question. The guard is not two arms
riding one signal.

### 1.5 Hex-free confirmed by parse, not by eye

Stripping block and line comments from `focus_ring.cjs` leaves **zero** colour literals in executable
code -- no `#rrggbb`, no `rgb(`/`rgba(` with a numeric first argument, no `color(srgb <number>`. The
only colour-ish strings remaining in code are the `var()`-bearing declarations handed to the probe.
The W15 pattern holds.

### 1.6 Gate, VR, scope

- **Gate, my own run, on the clean committed tree: 70/70 PASS, 0 FAIL, exit 0.** Verdict-level diff
  against the committed capture: **IDENTICAL for all 70**. No retry consumed -- `grade_reveal` and
  `touch_floor` both passed first time, so the flake allowance went unused. `git status --short`
  empty before and after.
- **Gate count integrity:** 70 check lines in the base capture and in the tip capture, and the
  check-NAME sets diff **empty**. "No check added or removed; `focus_ring` extended 6 -> 12" is
  verified, not accepted.
- **VR:** `git diff --stat 5b94bf6..407b3a9 -- test/baselines/` is **empty** -- 16 baselines, none
  touched. `visual_regression` PASS "matched its committed pixels" on my run. 16/16 object-identical
  to base: no re-baseline, no tolerance spend.
- **Scope:** `git diff --stat 5b94bf6..407b3a9` = exactly 7 files (`src/styles.css`,
  `test/focus_ring.cjs`, the rebuilt deliverable, 4 audit files). No scope creep.
- **No master contact.** Branch `xb/x8-focus-hue`, tip `407b3a9`, nothing merged or pushed. The
  worktree deliverable's sha256 matches `8730247`'s committed blob exactly.

### 1.7 One thing my run establishes that the builder's could not

The committed capture carries `build_integrity ... HEAD-match DEFERRED -- 1 uncommitted path(s)
[_audit/2026-07-30-w20-hue-gate.txt]`, inherent to commit-first-then-gate, and the freeze explains it
correctly. Because I ran on a fully clean tree (that capture already committed), `build_integrity`
performed the full check and returned:

```
BUILD INTEGRITY: PASS  (12148978 bytes, 0 unresolved, 9 panes + 7 overlays,
                        build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)
```

That independently proves the shipped 12,148,978-byte deliverable is a genuine fresh build of the
committed `src/` -- the pairing claim the builder could only defer. **Strengthening, not a defect.**

---

## 2. Adjudication of commit `8730247` (the room_static guard-compat change)

**Verdict: the change is CORRECT and the trade is the right one. Keep it.**

- **Does `room_static` genuinely grep raw text out of `src/`?** Yes. `test/room_static.py:19-23`
  walks `src/` over `.js`/`.css`/`.html` and runs `re.findall(r'83,74,183|109,95,214', txt)` on the
  raw file. It strips nothing, so a comment is scanned exactly like a declaration. The builder's
  account of why the first gate run went red is accurate.
- **Does the hex equal the token it mirrors?** Yes, verified three ways. `#534AB7` = `rgb(83,74,183)`
  and `#9D93F0` = `rgb(157,147,240)` arithmetically; both are the ACTUAL declared token values in
  `src/styles.css` (`--topic-ink:#534AB7` at `:187`/`:1551` light, `#9D93F0` at `:1582` dark); and
  both match what I MEASURED live off `--acc` on both builds. The same holds for the other four
  (`#006B63`, `#13BAAC`, `#694EB0`, `#AD9AEE`) -- all six conversions correct and all six agree with
  my measurements.
- **Was a NEW divergence risk created?** No. The comment is a static historical record of a defect
  measured on 2026-07-30; if the palette is retuned later the note goes stale, but staleness is the
  correct behaviour for a dated historical note and no guard should police it.
- **Is the "comment-only" claim true?** Verified directly: the `.hm-room:focus-visible` DECLARATION
  is byte-identical between `d727819` and `8730247`. Only prose moved.
- **Was weakening the check the alternative?** Teaching `room_static` to skip comments would have
  narrowed a live tripwire to accommodate a sentence that could simply be written differently. The
  builder chose correctly and stayed in scope.

---

## 3. Findings

### F-1 -- WRONG RATIONALE, falsified. Freeze Section 3, **and the W20 BRIEF itself**. (documentation)

The claim that `var(--rm,var(--acc))`'s fallback is "what keeps `phantom_tokens.py` honest about a
token no stylesheet declares" is **false**. `--rm` is already "defined" for that check via the
inline-style `--rm:` that `panels.js:282` emits. The check's own docstring names `--rm` on `.hm-room`
as the exemplar of that legitimate shape (`phantom_tokens.py:36-37`), and its self-test asserts
`--rm` must NOT be flagged (`:165-166`). The bare `var(--rm)` already in the outline and in the rest
stripe at `:2026` make the same point.

**Proof.** I built a deliverable with the fallback stripped to bare `var(--rm)` in the wave's rule and
ran the shipped check: output **byte-identical** -- `phantoms: 3   allowlisted: 3   NEW: 0   STALE: 0`,
`PHANTOM TOKENS: PASS`. The fallback makes zero difference to that guard.

The fallback is still the right code -- it mirrors the hero at `:2007` exactly, and it is a genuine
runtime safety net -- so **no code change is needed**. But the stated reason is wrong, and it
originated in the team-lead brief ("the fallback keeps the phantom-token guard airtight"), so it will
propagate to the next wave unless corrected at both ends.

### F-2 -- STALE LINE CITATIONS. Freeze Sections 3, 8, 9.1. (documentation)

The freeze cites the rule at `src/styles.css:2028-2056` and instructs the verifier to remove the inset
from `:2054`. Those were accurate against `d727819`, but `8730247` inserted 4 comment lines. On the
shipped tip the rule is at **2058-2061** and the inset is at **2059**; line 2054 is now a comment
line. Section 7.1 was folded into the freeze after the shift, but the citations were not refreshed.
The other seven citations (`panels.js:282`, `:2026`, `:2007`, `:116`, `:1502`, `:53`) all verify
exactly.

### F-3 -- ARITHMETIC SLIP (an under-claim). Freeze Section 5. (documentation)

"The four original arms and the two `.hm-cta` arms stayed green on that same run." **Six** original
arms stayed green -- `#adv`, `#jg`, `.ix-c-reset`, `.cmp-fold`, `.cmp-reopen`, `.piv-jump`. Both the
committed capture and my reproduction show 8 PASS / 4 FAIL of 12. "Four" is also inconsistent with
the freeze's own "6 arms -> 12". Likely a slip conflating the P3-6 class size (4 members) with the
pre-X8 arm count (6).

### F-4 -- IMPRECISE. Commit `8730247` message and freeze Section 7.1. (documentation)

"rule 2, the infinite-animation one, explicitly does [skip comments], so the file's author knew the
distinction and did not draw it here." Rule 2 does **not** skip comments -- `room_static.py` strips
nothing anywhere. It uses a shape-constrained regex (`animation[^;{}]*\binfinite\b`) that is merely
unlikely to match prose; the author's intent shows in the code comment at `:29` ("match real
animation declarations, not comments"), achieved by pattern shape, not by stripping. The conclusion
(fix the prose, not the check) is still right; the supporting argument is not.

### H-1 -- HAZARD, PRE-EXISTING, not introduced by this wave. (roadmap material)

The guard the wave deferred to is **narrower than its docstring** ("no hardcoded indigo rgba literal
returns"). `room_static.py:23` greps only the exact unspaced decimal triple. Measured:

| notation | caught? |
|---|---|
| `rgba(83,74,183,.15)` -- the codemod's own form | CAUGHT |
| `rgba(83, 74, 183, .15)` -- **spaced** | MISSED |
| `rgb(83 74 183 / 15%)` -- modern syntax | MISSED |
| `#534AB7` -- hex | MISSED |

The builder neither created nor widened this gap: a comment is not a declaration, and the check is
byte-unchanged. But the wave's resolution establishes hex as the sanctioned in-repo notation for
exactly the colour the guard hunts, which makes the blind spot marginally more likely to be exercised
later. Not a blocker for W-X8; worth a roadmap line if the accent codemod is ever revisited.

---

## 4. The one judgement call -- ENDORSED

Freeze Section 9.1 flags the re-declared inset stripe as the builder's own call rather than the
ruling's. **Keep it.** My measurements strengthen the case rather than merely agreeing with it:

- I independently confirmed `inset=[]` on **all six cards in both themes** on the pre-fix build. The
  generic rule was not recolouring the stripe, it was deleting it -- `box-shadow` is one property.
  So restoring the stripe is a **net improvement over base**, not new scope.
- Dropping it would ship a "wears its own room" fix that deletes the card's clearest room marker --
  self-contradictory under the ruling it ships beneath.
- It is genuinely guarded: mutant D proves arms 11-12 fail on a dropped stripe while the halo arms
  stay green, so the stripe has its own live check rather than riding the hue assertion.
- VR is unaffected -- baselines capture at rest, and nothing is focused on a room card there.

---

## 5. Hazards pre-cleared

- **READ-ONLY on the repo.** Every artifact I created lives under the scratch dir.
  `git status --short` empty before AND after my gate run; the worktree deliverable's sha256 matches
  `8730247`'s committed blob exactly. Nothing merged, nothing pushed, no master contact.
- **Isolated contexts**, fresh per theme per build; `window.innerWidth` asserted `=== 1280` on every
  measurement pass, hard-throwing otherwise.
- **No image-wide kills.** Every browser was launched and closed by my own scripts through
  Playwright's API; no `taskkill` of any kind.
- **No inline PowerShell**; all work driven through bash/node/python.
- **One browser gate at a time**; no concurrent VR run.

## 6. Artifacts (all under the scratch dir)

```
VERDICT.md                    this file
hue_probe.cjs                 independent measurement instrument
analyze.cjs                   arithmetic analyzer (186 assertions)
analysis.txt                  its full output -- ALL 186 PASS
tab_probe.cjs / tab-tip.txt   real Tab-press verification
tab_cold.cjs / tab-cold.txt   cold-landing tab order (autofocus respected)
make_mutants.py               static mutant builder
run_*.txt                     shipped check vs baseline / control / mutants A-D
red-prefix.txt                watched-red reproduction on the base deliverable
measured-prefix.json          raw pre-fix measurements
measured-tip.json             raw tip measurements
gate-coldverify.txt           my own full gate run -- 70/70 PASS
```
