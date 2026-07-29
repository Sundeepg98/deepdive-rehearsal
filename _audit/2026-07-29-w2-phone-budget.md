# W2 freeze — "The phone gets a vertical budget"

**Branch** `frontend/w2-phone-budget` · **base** `2c74cb7` (contains W1 + W3) · **2026-07-29**
**Scope:** audit P1-1, P2-7, P2-8, P3-5, P2-5's mobile half · **Gate:** 66/66 PASS
**Gate capture:** `_audit/2026-07-29-w2-phone-gate.txt` · **Review pairs:** `_audit/w2-phone-before-after/`

---

## The headline

**`.qq` top 763 → 415** at 360×800, entered as a user does (tap Probe Drill from the
Walkthrough), at scrollY 0. The question's first line — and "Reveal answer" with it — is inside
the live band on first entry **and on every return**. The acceptance target is met with 287px of
margin.

| | before | after | band | first line in band |
|---|---|---|---|---|
| 360×800 · content-pipeline | 763 | **415** | [61, 728] | yes (+287px margin) |
| 360×800 · notifications | 746 | **398** | [61, 728] | yes (+304px) |
| 360×800 · debugging *(longest title)* | 781 | **415** | [61, 728] | yes (+287px) |
| 360×800 · return path (drill→wb→drill) | 781 | **415** | [61, 728] | yes |
| 844×390 · landscape | 701 | **284** | [51, 330] *(was [61, 318])* | yes (+20px) |

Horizontal overflow is 0 at both viewports on every topic measured — the vertical budget was not
bought with a sideways scroll.

**The audit's number was 742; mine measured 763 on this base.** Both are the same defect; the base
carries W1 and W3, which the audit did not. Every "before" figure in this report was re-measured
on `2c74cb7` in this session, not copied from the audit.

---

## Where the 702px went, and what each fix bought

Measured at 360×800, from the live band's top edge to the first character of the question:

| block | before | after | reclaimed |
|---|---|---|---|
| `.side-id` identity | 188 | 67 | **121** |
| `.stage` padding-top | 18 | 18 | 0 |
| `.mcomp` companion (collapsed) + margin | 70 | 56 | 14 |
| drill: mode row + FOCUS BY LEVEL + explainer | 214 | 56 | **158** |
| drill: progress bar + "This run" + three tiles | 115 | 68 | 47 |
| `.thread` card padding | 23 | 17 | 6 |
| `.qrow` card head | 58 | 58 | 0 *(portrait; −15 in landscape)* |
| **total above `.qq`** | **702** | **354** | **348** |

### P1-1 · the identity block: three rows to one (121px)

`.side-id` is a sidebar *column* on desktop and costs the content nothing. Below 920px that column
unstacks onto the vertical axis, and its three rows — room chip, title, topic-nav — land end to
end. It is now one row: `[ARC] [Content Pipeline] [◫] [⌂] [▾]`.

Nothing was deleted and nothing became unreachable:

- The **room chip keeps its letters** (the CVD/greyscale-safe marker the codebase deliberately
  added) and drops the gloss tail. `applyIdentity()` writes that tail as a bare text node, which
  has no box to hide — `font-size:0` on the parent is what reaches it. The full name is untouched
  in the `aria-label`.
- The **h1 stays visible** and ellipsises. It is the page's h1 and the heading tree is thin enough
  already (P1-2); hiding it to buy 20px would have been the wrong 20px.
- The **switcher becomes a chevron** beside the name it would otherwise repeat. Its label is
  **clipped, never `display:none`** — the accessible name must still compute to
  "Rehearsing <topic>" (WCAG 4.1.2), and `display:none` deletes a node from name computation.
- The **focus-mode toggle** sits beside the title as a 44px icon instead of stacked under it.
  `.hdr` is a column by construction and `focus-mode.js` appends the button as a fourth child, so
  the block measured 71.6px to render a 17.6px title. Its accessible name never came from the
  visible word — `aria-label="Toggle focus mode"` is untouched.
- The **prev/next topic steppers stand down below 920px.** See the trade below.

### P2-7 · landscape exists — the codebase's first short-viewport query

`@media (max-width:919px) and (max-height:480px)`. Before this wave `@media … max-height` returned
**zero** hits in 1827 lines; the single `orientation` match was `text-orientation`, a property.

At 844×390 the fixed chrome was 133px of a 390px viewport (34%) and `.pane` began at y=329 against
a band ending at 318 — **zero pixels of the pane on the first screen.** Now:

- fixed chrome 133 → **111** (the padding *around* the controls shrinks; the 44px tap targets do
  not), so the band goes **257 → 279px**;
- the coaching accordion stands down (metadata, not the task — still one tap away in portrait and
  fully present in the desktop rail); nothing that grades or navigates is hidden;
- the card head **spends the 844px of width it has**: "Probe 1 / 22" and the signal go side by
  side instead of stacking, which is the audit's own complaint about landscape ("the 844px of
  width is spent on nothing") answered where it buys the question a line.

Landscape now delivers more than portrait per screen, which is what a user turns the phone for.

### P2-8 · "push further" now moves the screen — and the cause was not a missing scroll

Tapping `#adv` grew the card 273px, left `scrollY` **unchanged**, and put the grade row **205px
below the fixed bar** while the bar read "Mock run · Tools".

**The mechanism is worth recording, because the obvious diagnosis is wrong.** `_focusNew()` already
called `.focus()` on the new block, and `focus()` scrolls. It did not scroll because *the browser
counts the fixed chrome as visible scrollport*: `.seg` over 0–61 and `.mockcta` over the last 72px
are, as far as scroll-into-view is concerned, perfectly good places to put content. The browser was
already satisfied. So the fix is to tell it the truth — `scroll-margin-top`/`-bottom` on the drill's
landing blocks — plus a `block:'start'` seat on `stage >= 2`, which is exactly P2-8's trigger.

| | before | after |
|---|---|---|
| grade row after the FIRST "push further" | 933 (**205px below** the bar) | 474 (**254px above** it) |
| grade row after the TERMINAL push | 1299 (**571px below**) | 959 (**231px below**) |
| scrollY response to the tap | unchanged, at every stage | seats the new follow-up at the band top, at every stage |

**Qualifier, cold-verify F4 — read the two rows together.** The 933 → 474 figure is the **first**
push. On the terminal push of a 2–3 link chain the seated follow-up is itself taller than the band,
so the grade row below it is again past the fold (959, 231px below the bar) — better than base's
571px, but not on screen. **What is fixed at every stage is the defect as diagnosed:** "scrollY
unchanged, the app ignored me". The screen now responds to every push, the block the user asked for
is seated at the top of the band every time, and the result is strictly better than base at every
stage. The audit's phrasing was "once per follow-up, on a chain of 2–3", so a reader of the
single-row version could reasonably have concluded more was fixed than is. Seating the requested
content at the top remains the right behaviour: the alternative is to seat a grade control the user
has not yet earned the information to use.

**Why this and not the bar swap** (the brief offered either): I built the sticky-judge option first
and it cannot work as specified. `.judge` is the **last child** of `.card`, and a sticky element can
only travel inside its containing block — with nothing after it, its travel is zero. Making it work
would mean restructuring the card, which is load-bearing for `grade_reveal`, `mobile_nextup` and the
focus-landing contract. The bar swap was the other option, and it would put a **second grade
surface** on screen against the drill's stated "one decision engine… never a second one", in a bar
that `mobile_nextup` pins to one row of fixed height. Seating the content the user asked for solves
the finding without adding a control or moving a contract.

*Scoped to the phone* (`matchMedia('(max-width:919px)')`): desktop has no fixed chrome and no fold
problem, so its behaviour is byte-identical.

### P3-5 · touch floors — and one finding that was a measurement artifact

| target | before | after | floor |
|---|---|---|---|
| `.ninp input` (~25 controls, 6 topics) | 136.2×40 | 136.2×**44** | app's 44px |
| cram close `×` | **32**×44 | **44**×44 | app's 44px |
| kafka viz range | 140×**16** | 140×**24** | WCAG 2.5.8 AA |
| `#hm-skip-cb` label strip | 272×**18** | 272×**44** | WCAG 2.5.8 AA |
| `#scrolltop` | **not changed — see below** | 44×44 | app's 44px |

Two notes that matter more than the numbers:

**`#scrolltop` was never short.** It is filed at 39.6×39.6. The rule says `width/height:
var(--space-44)`, and 39.6 is 44 × 0.9 — the `scale(.9)` of its own fade-out. `getBoundingClientRect`
on a transformed element returns the *transformed* box. The audit measured the animation, not the
control. `touch_floor` drives it to its shown state, waits for the transition, and **passes it on the
pre-fix build** — which is the correct answer. Changing it would have put a false receipt in the repo.

**The home skip label moves zero pixels.** `.hm-skip` already reserved `min-height:44px` for the row;
the label was an 18px text line floating in it. `align-self:stretch` spends that reserve on the
target and an inner flex re-centres the text at the y it already had. Verified: `home-light` and
`home-dark` are byte-identical, which they had to be — they are not in this wave's authorised set.

### P2-5 mobile half · the cram sheet gets a way through itself

7 screens on the flagship (11.5 on the longest topic) with a control surface of exactly `×` and
Print — `querySelector('nav,[class*=toc],[class*=jump]')` returned null.

- A **sticky section chip-strip**, built from the sheet's **own rendered section titles** by reading
  `<deep-cram>`'s shadow root. There is no second list to drift: `deriveCram` emits a section only
  when its slice has content, so a hardcoded index would have been wrong on the first topic that
  omitted one. Chips are built as DOM nodes, not an `innerHTML` concat — the labels are already
  *decoded* text, and re-inserting them as markup is precisely the entity-leak class
  `test/entity_leak.cjs` exists to catch.
- **Print is demoted on `(pointer:coarse)`** — not on width. Coarse pointer is the property that
  actually predicts "there is no printer at the end of this gesture"; a small desktop window keeps it.
- One bug found and fixed in the build: `<deep-cram>` renders **lazily** and not on the open path, so
  the strip built one frame too early and silently rendered **0 chips on the first open of every
  session** — which is the only open most users get. It now retries on animation frames, bounded.

---

## The two watched-red guards (64 → 66 checks)

Both are registered in `check_all.py`, both read live layout at a **pinned and asserted** viewport
(the audit lost 59 of 60 rows to a page whose viewport was silently reset), and both carry a plant
that re-arms every run and **aborts** rather than passing if it does not fire.

### `fold_budget` — RED on the pre-fix build at both viewports

Asserts the question's first line is inside the live band at scrollY 0: three topics at 360×800
(including the corpus's longest title), the **return path**, and 844×390 under the new breakpoint.
The band is **computed from the live fixed bars**, never typed as 61/72 — so a future change to the
chrome moves the target automatically instead of silently invalidating a constant.

Pre-fix: `.qq` 746 / 781 / 701 against bands ending at 728 / 728 / 318 — every band assertion red.

**Its plant is single-variable on purpose, and the first version was not.** That version re-created
the pre-fix CSS by un-clipping `.tn-current`, which reintroduced a *different*, older bug: the
un-ellipsised nowrap title widens the document, and `styles.css:723-731` records that the fixed
`.mockcta` is then sized by the widened layout viewport. The bar's top moved 728 → 777, the band
grew to 716px, and the plant "passed" for a reason unrelated to the fold. A negative control that
perturbs the thing it measures against proves nothing. The plant now re-opens the setup disclosure
and adds an inert spacer sized from the live gap, lands `.qq` on the pre-fix 763 exactly, and
asserts the band is **unchanged** before it will accept the red.

### `touch_floor` — RED on the pre-fix build for the four genuine offenders

44px where the app claims it, 24px where WCAG does, kept as separate arms because conflating them is
how `#scrolltop` was nearly "fixed". Pre-fix reds reproduce the audit exactly: `.ninp input` 40, cram
`×` 32 wide, viz range 16, skip label 272.4×18. `#scrolltop` passes pre-fix, as it should.

**It measures at rest** — polling for two consecutive agreeing reads, the same proof
`visual_regression` uses before it captures — because three targets here arrive under a transform
that is still running two rAFs after their state flips. Sampling during motion is how a compliant
44px FAB becomes a 39.6px finding.

---

## VR — exactly the three pre-authorised baselines

`m-walk-light`, `m-walk-dark`, `num-light` changed. **The other 13 are byte-identical** —
`vr:update` rewrote all 16 and git reports content changes in only these three plus the manifest,
whose diff is 4 lines: the timestamp and the three hashes. No sub-tolerance jitter this time.

| baseline | changed px | box | attribution |
|---|---|---|---|
| `m-walk-light` | 225,717 (68.6%) | 390×705 at (0,67) | pure **121.3px upward translation** |
| `m-walk-dark` | 175,946 (53.5%) | 390×703 at (0,67) | same translation, dark |
| `num-light` | 66,153 (6.5%) | 581×531 at (338,269) | **+4px per input**, ×2 rows = +8px |

**m-walk is a translation, not a reflow — but it is TWO translations, not one.** Element-level,
before → after:

```
.side-id   188.3 -> 67.0     .hdr        73.8 -> 54.0    (focus toggle beside the title)
.locator   148.8 -> 78.5     .topic-nav  187.3 -> 67.0   (own rows -> the same row)
.mcomp     262.3 -> 141.0   (-121.3)     the identity block's reclaim, and nothing else
.pane      332.3 -> 197.0   (-135.3)     that reclaim PLUS the companion's own 14px
.pane HEIGHT unchanged        document 1705 -> 1570      overflowX 0 -> 0
```

**Correction, cold-verify F2.** An earlier revision of this section said `.mcomp` and `.pane` moved
"both exactly −121.3" and headlined the baseline as "a pure 121.3px upward translation". `.pane`
moved **−135.3**. The arithmetic error was mine, made against my own attribution data, and it made
this table contradict the budget table twenty lines above it: the extra 14px is precisely the
companion row of that table (`.mcomp` collapsed + margin, 70 → 56 = 14 reclaimed, from the new
`.mcomp{margin-bottom:var(--space-10)}`). So everything above the companion shifts −121.3 and
everything from its bottom margin down shifts −135.3. Nothing unexplained changed and the
rebaseline is correct; the sentence was.

The verifier confirmed both shifts **in the pixels**, with a tolerant row-alignment scan (per-row
luminance profile, MAD against candidate `dy`): the identity region minimises sharply at `dy=121`
and the pane region at `dy=136`, in both themes. Their note that an *exact* row-signature scan is
useless here is worth keeping — a 121.3px shift is fractional and re-hints every row, which failed
their first differ's own negative control.

*Framing note for the next reader:* the verifier reads `.pane` height as 1281.5 where this report
reads 1142.8. That is a `.pane` vs `.pane.on` selector difference, not a disagreement — the
load-bearing claim, **unchanged across the wave**, reproduces on both framings.

The diff box starting at y=67 is the first painted row below the fixed seg, which is where a
translation of everything beneath the identity block would start. `num-light`: the four assumption
inputs 40 → 44, `.ninp` grid 128 → 136, top and width unchanged.

### A 14-baseline desktop regression, caught mid-wave and fixed rather than rebaselined

Worth recording as the wave's near-miss. Making the focus toggle icon-only required moving
`font-size` and `padding` out of its inline style (an inline declaration beats any non-important
rule) into `focus-mode.js`'s injected sheet. **That sheet was injected lazily, from `toggle()`** —
correct while it held only `.app._focus-mode` rules, wrong the moment it held a rule needed at first
paint. The desktop button rendered at the UA default 13.33px with padding 0, was 17px instead of
20px, `.hdr` lost 1px, and every element below it in the sidebar moved up one pixel: **14 of 16
baselines red** from a change that was supposed to be mobile-only. `injectStyle()` is now called
from `init()` (it is idempotent). Desktop is byte-identical again — verified at the element:
20×60, 9px, `4px 12px`, `.hdr` 76.2px, all matching the pre-fix build exactly.

**This is the argument for the "STOP, do not rebaseline" rule stated as evidence:** had those 14
been rebaselined, a one-pixel sidebar shift on every desktop surface would now be the reference.

---

## Deliberate trades, stated with their numbers

1. **The topic title ellipsises on a phone.** Fixed items in the 360px identity row (room chip 53,
   home 44, chevron 44, focus 44, gaps) leave the h1 **116px**. Measured across the corpus: 97% of
   the flagship's title shown, 34% of the longest ("Production Debugging and Incident Diagnosis",
   334px of text). No arrangement fits a 334px title beside 44px tap targets in a 360px row, and
   this is the behaviour the app already ships for `.tn-current` with the same justification: the
   full name stays in the `aria-label`, the topic menu, and every viewport ≥920px.
   *An interim version was worse and is worth naming:* with the prev/next steppers still present the
   title rendered as the single character **"C"** — P2-4's defect one breakpoint down. It was found
   by looking at the capture, not by any check.
2. **Prev/next topic steppers are hidden below 920px.** They are an adjacency affordance whose real
   home is the keyboard (`[` / `]`), and the keyboard hints, the seg key badges and the shortcuts
   panel are all already desktop-gated. Every destination stays reachable three other ways: the
   trigger's full topic menu, Topic index in Tools, and search. `no_dead_ends` passes; it drives
   focus mode through the API, so nothing here depends on the hidden controls.
3. **The setup disclosure opens itself for a mock round.** The countdown timer lives inside the
   collapsed row; hiding a running clock would trade the P1 for a worse one.
4. **Landscape hides the companion accordion.** Coaching is the first thing to yield when the axis
   is that scarce. Nothing that grades or navigates is hidden.

---

## P2-12 — record-only, no wave (per the audit's WON'T-FIX)

Matched-load paired A/B, both builds measured in the same run window on the same box, @4× CPU
throttle, continuous-rAF instrument (the audit's own corrected one).

| viewport | before p50 | after p50 | warm-`wb` control | read |
|---|---|---|---|---|
| 1280×800 | 364.6 (316.8–463.1) | **352.6** (197.7–437.3) | 182.9 → 211.2 | unchanged |
| 360×800 | 391.5 (307.9–502.6) | **363.7** (319.5–410.9) | 212.3 → 219.8 | −27.8ms, inside the spread |

**No result claimed.** At desktop the drill is byte-identical (drill-light/drill-dark at 0 changed
px), so no change is the *expected* outcome and this confirms the mobile-only scoping. The mobile
−27.8ms is directionally consistent with rendering ~350px less above the fold, but the control
moved the wrong way (the box was busier during the "after" pass) and the delta sits inside the
run-to-run spread. Consistent with the audit's disposition; **do not re-chase.**

---

## Review pairs — `_audit/w2-phone-before-after/`

Captured by `capture-pairs.cjs`, committed alongside them. It **asserts its own framing** and
refuses to write a file it cannot vouch for: exact `innerWidth`/`innerHeight`, drill is the active
pane *and* has drawn a `.qq`, `scrollY === 0`, and the theme actually applied. Entry is a real
hit-tested click on the Probe Drill tab, never `location.hash`.

```
before-360-light.png   360x800 light   .qq 763  band [61,728]  firstLineInBand=false
after-360-light.png    360x800 light   .qq 415  band [61,728]  firstLineInBand=true
before-360-dark.png    360x800 dark    .qq 763  band [61,726]  firstLineInBand=false
after-360-dark.png     360x800 dark    .qq 415  band [61,726]  firstLineInBand=true
before-844-light.png   844x390 light   .qq 701  band [61,318]  firstLineInBand=false
after-844-light.png    844x390 light   .qq 284  band [51,330]  firstLineInBand=true
```

---

## Gate

**66/66 PASS** on the committed tree — `_audit/2026-07-29-w2-phone-gate.txt`. Inherited 64, added
`fold_budget` and `touch_floor`. Every pre-existing check is green, including the ones this wave
was most likely to disturb: `mobile_nextup`, `no_dead_ends`, `grade_reveal`, `visual_pane_smoke`,
`render` (all topics × all phone widths, zero overflow), `click_drift`, `shadow_css_guard`,
`scoreboard_resume`, `heading_tree` and `latent_arial`.

`latent_arial` earned its keep: it failed the first full run on `.dsu-tog`, because the rule
declared `font:inherit` only inside the mobile query and the check walks the *declaration* at
desktop width, where the button is `display:none`. A latent Arial re-facing, armed for whoever next
showed it. Fixed unconditionally; the debt list is unchanged at 15 known components.

## Limits of this wave's evidence

- **Emulation boundary.** The Pixel-7 context is trustworthy for layout — which is this wave's
  whole target — and weak for momentum scroll, keyboard-overlay resize and dynamic browser chrome.
  A real iOS Safari URL bar that collapses on scroll changes the live band in a way nothing here
  measured. No claim is made beyond layout.
- **Chromium only**, like every prior wave here. The short-viewport query, `clip-path`, `env(safe-area-inset-*)`
  and `scroll-margin` are all well-supported, but unmeasured outside Chromium.
- **The 20px landscape margin is the thinnest number in this report.** The app's body face is a
  system stack, so `.qq`'s line box differs between this box and a CI runner. 20px is roughly an
  order of magnitude more than a 10%-taller font can consume, and `fold_budget` prints the margin
  on every run so a regression arrives as "the margin shrank", not as a surprise red.
- **P2-12 absolutes are upper bounds**, per the audit's standing rule. Only the paired deltas above
  are load-cancelling; do not quote the absolutes as a baseline.

---

# Round-2 addendum — the honesty round

Cold verify (`w2-verifier`, independent) returned **CLEAN: 0 blocking, 6 non-blocking**, all
precision-of-claim or instrument-documentation. Verdict committed verbatim at
`_audit/2026-07-29-w2-phone-coldverify.md`. All six are addressed; two corrections (F2, F4) are
folded into the body above rather than quarantined here, because a correction filed in an appendix
is a correction most readers will not see.

| # | disposition |
|---|---|
| F1 | `fold_budget`'s header claimed 37px landscape headroom; the check prints **20**. Comment corrected to the measured number, with its provenance and the fact that the check itself never printed 37. |
| F2 | VR attribution rewritten as **two** translations (−121.3 / −135.3) and reconciled with the budget table. `.pane` vs `.pane.on` framing difference noted. |
| F3 | `fold_budget`'s return-path precondition made real — and it found a second bug. See below. |
| F4 | P2-8 receipt qualified with the terminal-push row and the exact scope of the fix. |
| F5 | `capture-pairs.cjs` now asserts the raw `data-theme` attribute. The two wall-clock waits stay, with a comment stating why they are acceptable here and what would have to change first. |
| F6 | **Decided (a): chips raised to 44px.** Reasoning below. |
| gaps | Both disclosed plant gaps **closed** rather than left disclosed — they were each about ten lines. |

## F6 — the decision, and why it went this way

The cram jump chips shipped at 36px under a comment claiming the app's 44px floor while the
assertion used the 24px AA floor. Comment and assertion disagreed, and the gap between them was the
whole question.

**Chips raised to 44px; the assertion now reads 44 too.** The argument that settled it is this
wave's own: `.dsu-tog` was briefly 40px in the landscape block to buy fold pixels, and I put it back
with the note that *"a wave that raises three targets to 44 while quietly shipping a fourth at 40
has not fixed anything, it has moved the defect."* A dense secondary strip has a real case for the
AA floor — but not in the wave whose thesis is the app floor, and not for a control the wave itself
added. The cost is bounded and one-directional: the strip scrolls **horizontally**, so the extra 8px
buys nothing back except 8px of a panel that already scrolls vertically.

Blast radius checked, not assumed: the cram overlay is closed at rest, so it appears in **no** VR
baseline — `m-walk-*` capture the walk pane with the sheet shut. Confirmed by the gate's
`visual_regression` passing against the committed pixels after the change, with no rebaseline.

## F3 found a second bug, in my own instrument

The ruling was to make the return-path precondition real, because `scrollTo(0,700)` under
`html{scroll-behavior:smooth}` (styles.css:36) had not actually scrolled before the assertion ran.
It did — and the first repair was **also wrong**, in a way worth recording:

- A rest test of "two consecutive equal samples 100ms apart" is **not** a rest proof under a smooth
  scroll. A single stalled frame satisfies it. The poll returned early, the pane switch fired into a
  still-settling scroll, and the return-path arm then measured `scrollY 189` on a build that
  genuinely rests at 0.
- Repaired properly, both waits now have definite end states: the precondition polls until scrollY
  **reaches its clamped target**, and the post-switch wait demands **three** consecutive agreeing
  samples.
- Independently confirmed with a standalone probe on both builds: with a fully rested scroll the
  return path lands at `scrollY 0`, `.qq` **415**, in band — and on base at `scrollY 0`, `.qq`
  **763**, out of band. The original conclusion was right; only its premise was unproven.

The arm is now red on base **with its precondition passing**, so it is exercised rather than
vacuously red.

## Plant coverage after this round

| plant | before | now |
|---|---|---|
| `fold_budget` portrait | present | present (band-unchanged guard intact) |
| `fold_budget` landscape | disclosed gap | **present** — plant refactored to a function, run at both viewports, each anchored to its own pre-fix number (763 / 701) |
| `touch_floor` 44px arm | present | present |
| `touch_floor` 24px AA arm | disclosed gap | **present** — reverts the skip-label fix and requires the arm to notice |

All four abort rather than pass if their control fails to fire. Both guards re-verified watched-red
on the extracted `2c74cb7` build after every change in this round.

## What the verifier corroborated that I could not have

Recorded because it is stronger evidence than anything in the original freeze:

- **The band is live, not typed.** Their T1 grew only the fixed bottom bar by 400px, leaving `.qq`
  unmoved, and all six band assertions went red. T5 made the plant move the chrome as well as the
  card and the band-unchanged guard **aborted**, proving that guard is real rather than prose.
- **The at-rest polling is load-bearing.** Their T4 replaced it with a single sample and
  manufactured **two false failures on a compliant build** — cram × at 42.2, `#scrolltop` at 41.5
  under `matrix(0.943…)`. They also hit the artifact by hand twice before adding their own poll.
- **The accessible name survives the title trade.** Asked of Chromium itself via CDP
  `Accessibility.getPartialAXTree`, not by reading `aria-*`: the trigger's computed name is
  `"REHEARSING Production Debugging and Incident Diagnosis"`, `ignored=false`.
- **All three alternate topic paths work on a phone**, driven with hit-tested clicks and verified by
  `TopicRegistry.current().id` changing — and the `[` / `]` keys still work there too, which this
  report understated: adjacency is not lost even for a keyboard user, only its on-screen affordance.
- **`#scrolltop` adjudicated independently:** `39.6 / 44 = 0.9000` exactly. The control was never
  short.
