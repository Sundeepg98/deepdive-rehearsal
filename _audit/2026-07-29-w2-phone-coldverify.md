<!-- AUTHORED BY: w2-verifier (independent cold verify, no shared context with the builder).
     Committed VERBATIM by w12-builder as the wave's round-2 record; not one word of the verdict
     below is the builder's. Target: frontend/w2-phone-budget @ 039c2b6, base 2c74cb7.
     Disposition of all six findings, and the F6 decision, live in the round-2 addendum at the
     foot of _audit/2026-07-29-w2-phone-budget.md. -->

# W2 COLD-VERIFY VERDICT — `frontend/w2-phone-budget` @ `039c2b6`

**VERDICT: CLEAN — 6 NON-BLOCKING findings, 0 BLOCKING. The freeze holds; the P1 is fixed and the
two new guards are real.**

Verifier: `w2-verifier`, independent (no shared context with the builder). Every headline number was
re-derived with instruments written from scratch, and every instrument was made to fail before its
green was accepted. Target: worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w12-phone`,
branch `frontend/w2-phone-budget`, tip `039c2b6`, base `2c74cb7` (extracted with `git show` into
scratch; the repo was never written to — `git status --porcelain` empty and HEAD `039c2b6` at both
the start and the end of this pass).

All artifacts:
`C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w2-verify\`

---

## Summary of findings

| # | Severity | Finding |
|---|---|---|
| F1 | NON-BLOCKING | `test/fold_budget.cjs`'s own header claims 37px landscape headroom; the check prints **20px** and the freeze body says 20px. Stale number inside the shipped instrument. |
| F2 | NON-BLOCKING | Freeze's VR attribution says `.mcomp` and `.pane` moved "**both exactly -121.3**" and headlines m-walk as a "pure 121.3px upward translation". `.pane` moved **-135.3**. Confirmed in the pixels. Two translations, not one. Nothing unexplained changed. |
| F3 | NON-BLOCKING | `fold_budget`'s RETURN-PATH arm does not establish its own precondition — `scrollTo(0,700)` + 2 rAFs under `html{scroll-behavior:smooth}` leaves scrollY at ~0. I re-ran it from a scroll that genuinely landed: the assertion still holds, and still fails on base. Conclusion sound, premise overstated. |
| F4 | NON-BLOCKING | P2-8's "933 → 474" is the **first** push in the chain. On the terminal push the grade row lands at 959, 231px **below** the bar. The diagnosed defect (no scroll response) is fixed at every stage and is strictly better than base throughout; the residual is not stated in the freeze. |
| F5 | NON-BLOCKING (nit) | `capture-pairs.cjs` asserts theme as `dataset.theme \|\| 'light'`, so the *light* shots pass even if no theme was applied. Dark shots are properly asserted. Also uses two wall-clock `waitForTimeout`s. |
| F6 | NON-BLOCKING (nit) | `touch_floor`'s jump-strip comment says "hold it to the same floor"; the assertion uses the 24px AA floor, not the app's 44px. Chips are 36px. Prose overstates the assertion by one floor. |

Nothing here changes the freeze's disposition. F2 and F4 are precision-of-claim defects in the
report; F1/F3/F5/F6 are instrument-documentation defects. No measurement in the freeze was found to
be wrong in a way that would have hidden a regression.

---

## 1. THE HEADLINE — reproduced with an independent instrument (`vfold.cjs`)

Two methods, deliberately disjoint from the builder's:

- **(A) geometric, with no element named.** Enumerates *every* painted `position:fixed` element in
  the document and derives the occlusion bands from whichever ones span the viewport. If the
  builder's band arithmetic had been cherry-picked to two selectors, this would disagree. It did not.
- **(B) hit test.** `document.elementsFromPoint()` at the first line's own centre, at three x
  positions. The topmost element must be the `<deep-drill>` host. No arithmetic at all — this is
  what the compositor says is on that pixel.

Every record carries `innerWidth`/`innerHeight` and the node side throws on drift. Zero drift across
this pass. Isolated context, `isMobile`/`hasTouch`, dSF 2. Entry is a real hit-tested
`page.mouse.click` on the Probe Drill seg button from the Walkthrough.

| case | BEFORE (`2c74cb7`) | AFTER (`039c2b6`) | band | geom | hit-test | overflowX |
|---|---|---|---|---|---|---|
| 360×800 content-pipeline | **762.7** (0px visible) | **414.8** (+287) | [61,728] | in | in | 0 → 0 |
| 360×800 notifications | **746.2** | **398.3** (+304) | [61,728] | in | in | 0 → 0 |
| 360×800 debugging *(longest title)* | **781.5** | **414.8** (+287) | [61,728] | in | in | 0 → 0 |
| 360×800 RETURN (drill→wb→drill) | **781.5** | **414.8** | [61,728] | in | in | 0 → 0 |
| 844×390 content-pipeline | **701.5** | **283.8** (+20) | [61,318] → **[51,330]** | in | in | 0 → 0 |
| 844×390 debugging | **700.5** | **283.8** | [51,330] | in | in | 0 → 0 |
| 360×800 content-pipeline dark | **762.7** | **414.8** (+285) | [61,726] | in | in | 0 → 0 |

`qqVisiblePx` on the base build is **0** on every portrait row — the audit's "ZERO pixels of the
probe visible" is literal, and my hit test agrees (the topmost element at the question's first line
is not the drill).

**The honesty question — 742 vs 763 — holds.** On `2c74cb7` (which carries W1+W3) my instrument reads
**762.7**, not the audit's 742. The freeze says it re-measured rather than copying, and states the
reason. That is exactly what I find. Every "before" figure in the freeze (763/746/781/701) is within
0.5px of mine.

**Landscape chrome, exactly as claimed:** 61 + (390−318) = **133px** before; 51 + (390−330) =
**111px** after; band **257 → 279**. Both numbers match the freeze to the pixel.

Receipts: `vfold-before.json`, `vfold-after.json`, `vfold.cjs`.

---

## 2. THE BAND IS COMPUTED, NOT TYPED — proven by negative control

Source reads correctly (`test/fold_budget.cjs:64-97`): `bandTop = segFixed ? sr.bottom : 0`,
`bandBot = barFixed ? br.top : window.innerHeight`, both from `getBoundingClientRect` +
`getComputedStyle().position` on the live elements.

**Negative control T1** (`tamper/t1-chrome-grows.cjs`): a scratch copy that injects
`@media(max-width:919px){.sidebar .mockcta{padding-top:400px}}` after boot. `.qq` does not move one
pixel in the document — it still reads **415**. The band drops **[61,728] → [61,340]** and **every
band assertion goes red; exit 1.**

```
FAIL [360x800] content-pipeline: ... -> {"band":[61,340],"qqTop":415,"firstLineIn":false,"marginPx":-101}
FOLD BUDGET: FAIL (...6 assertions...)      T1 exit=1
```

A check with 728 typed into it could not have noticed. This one did. Claim verified.

---

## 3. THE TRADES

### (a) Title ellipsis — the accessible name still computes to the full topic

Asked **Chromium itself**, via CDP `DOM.querySelector` → `Accessibility.getPartialAXTree` (not by
reading `aria-*` and hoping):

```
.side-id .tn-trigger  role=button
                      name="REHEARSING Production Debugging and Incident Diagnosis"
                      ignored=false  expanded=false
```

`.tn-current` is **1×1, `position:absolute`, `clip-path:inset(50%)`, `display:block`** — clipped, and
**not** `display:none`, so it stays in the name computation. Its `textContent` is the full topic name.
WCAG 4.1.2 holds. The visible h1 is genuinely truncated (`scrollWidth 334` vs `clientWidth 122`,
`text-overflow:ellipsis`), which is the stated trade.

*Nit, not a finding:* the freeze says the h1 gets "116px"; I measure **121.8px** on `debugging` at
360. Same order, same conclusion; room-chip width varies by room.

### (b) Prev/next steppers hidden below 920px — all three alternate paths DRIVEN, all three work

`#tnprev`/`#tnnext` are `display:none`, 0×0 at 360 and 390. Each path below was driven with real
hit-tested clicks and verified by `TopicRegistry.current().id` changing:

| path | result |
|---|---|
| trigger's topic menu | menu opens with **46 items**; clicked one → `debugging` → `event-driven` ✓ |
| Tools → Topic index | `.tools-fab` → `#idxopen` → overlay opens with **46 `data-topic` rows**; hit test confirms `button.ix-card` is topmost at the click point → `debugging` → `event-driven`, hash `#event-driven/walk`, overlay closed ✓ |
| Search | `#searchopen` → typed "kafka" → clicked the result → `debugging` → `kafka-internals` ✓ |

**Bonus the freeze understates:** the `[` / `]` keys still work on the phone
(`debugging` → `slos` → `debugging`). Adjacency is not lost even for a keyboard user; only the
on-screen affordance is.

### (c) Focus toggle icon-only at 44px, label intact

44.0 × 44.0 at 360 (and at 390). `aria-label="Toggle focus mode"` present, `aria-pressed="false"`
present, and Chromium's computed accessible name is **"Toggle focus mode"**. ✓

*Also verified:* the room chip's mechanism is exactly as described — `.locator`'s children are
`<span class="loc-key">REL</span>` (font-size 11px, visible) plus a **bare `#text` node**
("finding what is broken"), with the parent at `font-size: 0px`. A text node has no box to hide;
`font-size:0` on the parent is what reaches it. `aria-label="Reliability & Observability — finding
what is broken"` is untouched.

### (d) Landscape hides the companion and nothing that grades or navigates

At 844×390: `.mcomp` `display:none`. Everything else present and at or above the tap floor —
seg strip 844×51 with all **9 real tabs at 44px**, `.mockcta` 844×60 with `.mockbtn` 743×47,
`.tools-fab` 44, `.tn-trigger` 44×44, `#adv` 768×44, `.dnav` present, `.dsu-tog` 814×**44** (the
source comment's "min-height stays 44, the 4px came out of the padding" is true in the measurement),
cram button present, `overflowX 0`.

**The one zero-height tab is attributed:** the 10th seg button is `viz`, `display:none` — and it is
`display:none` in **portrait too**, on this topic. A pre-existing conditional pane, not a landscape
casualty. (`segPortrait` vs `segLandscape` in `vtrades2.json` are identical lists.)

---

## 4. P2-8 — reproduced exactly, with one narrowing (F4)

Driven with a hit-test-verified driver: before each click, `elementsFromPoint` must return the drill
host, otherwise the driver scrolls the target into the live band and re-checks. *This mattered* — my
first driver clicked at `(180, 734)` and silently hit `div.mockcta`, doing nothing, which is itself a
faithful reproduction of the defect's neighbourhood.

**AFTER, first "Interviewer pushes further" (stage 2):**

```
jmTop=474.0   barTop=728   254px ABOVE the bar   jmInBand=true   hit-test at the grade row = DRILL
new .fu seated at band top (60.7)   scrollY 0 -> 647 (the screen moved)
```

**474 and 254px above the bar — the freeze's number, to the pixel.**

BEFORE, same tap: `jmTop=953.9`, **226px below** the bar, `jmInBand=false`, hit-test OFFSCREEN.
(The freeze records 933/205; the base absolute is scroll-position-dependent at the moment of the tap,
so a few tens of px of difference between runs is expected. The *sign and the fact* are identical.)

`scroll-margin` verified in the computed style, not just the source: `.thread` computes
`scroll-margin-top: 69px` / `scroll-margin-bottom: 88px` at 360×800, and **`0px` / `0px` at
1280×800** — the media gate is real.

### F4 — the claim is narrower than the table row reads

On the **terminal** push of the same card (stage 3, two follow-ups):

| | BEFORE | AFTER |
|---|---|---|
| last `.fu` top | 351.6 (not seated) | **60.0 — seated at the band top** ✓ |
| scrollY response | 521 → 978 | 647 → 921 (the screen moved) ✓ |
| grade row | 1299.3 (**571px below** the bar) | 959.0 (**231px below** the bar) |
| grade row on screen | no | **no** |

So: the defect **as diagnosed** — "`scrollY` unchanged, the app ignored me" — is fixed at *every*
stage, and the result is strictly better than base at every stage. But the freeze's row
"grade row after 'push further' | 933 | 474" is the first push only; on the last push the grade row
is again past the fold, because the block the user asked for is seated at the top and is itself
taller than the band. The audit's phrasing was "once per follow-up, on a chain of 2–3", so a reader
of the freeze could reasonably conclude more was fixed than was. **Recommend a one-line qualifier in
the freeze; no code change.** Seating the requested content at the top is the right behaviour, and
the freeze's rejection of both alternatives (sticky judge, bar swap) is argued on structural grounds
I did not find fault with (`.judge` is the last child of `.card`, so its sticky travel is zero).

### Desktop is byte-identical

`matchMedia('(max-width:919px)').matches === false` at 1280, so the `stage>=2` seat cannot fire.
Element-level, BEFORE vs AFTER at 1280×800 — every value identical:

```
#_focus-toggle  60x20  font-size 9px  padding 4px 12px  top 152.7  left 19
.hdr 76.2   .side-id 183.7   .dsu-tog display:none
```

`drill-light` / `drill-dark` baseline blobs are **identical objects** (below).

---

## 5. THE GUARDS — both reproduce their reds; all four negative controls fire

### Reds on the extracted `2c74cb7` build

`node test/fold_budget.cjs <base.html>` → **FAIL, 6 assertions**, exactly the freeze's shape:

```
content-pipeline qqTop=763   band [61,728]   marginPx=-61    scrollToSeat=702
notifications    qqTop=746   band [61,728]   marginPx=-44
debugging        qqTop=781   band [61,728]   marginPx=-80
RETURN PATH      qqTop=781   band [61,728]   red
844x390          qqTop=701   band [61,318]   bandPx=257  ->  both landscape arms red
```

`node test/touch_floor.cjs <base.html>` → **FAIL, 5 assertions**:

```
FAIL .ninp input     {"count":4,"min":40}
FAIL cram close x    {"w":32,"h":44}
FAIL cram jump strip {"missing":true}          (this wave's own addition — absent on base)
PASS #scrolltop      <-- PASSES pre-fix, as the freeze claims
FAIL kafka viz range {"count":3,"min":16}
FAIL hm-skip label   {"w":272.4,"h":18}
```

### `#scrolltop` — I adjudicated it myself, and the freeze is right

Measured directly on the phone build:

| state | computed `width`/`height` | `offsetWidth/Height` (transform-blind) | computed transform | `getBoundingClientRect` |
|---|---|---|---|---|
| resting (hidden) | **44px / 44px** | **44 / 44** | `matrix(0.9, 0, 0, 0.9, 0, 16)` | **39.6 × 39.6** |
| `.show` (at rest) | 44px / 44px | 44 / 44 | `matrix(1,0,0,1,0,0)` | **44 × 44** |

`39.6 / 44 = 0.9000` exactly, and `44 × 0.9 = 39.6` — the exact number the audit filed. **The control
was never short; the sample was early.** Declining to "fix" it, and letting the check pass it on the
pre-fix build, is the correct answer and would have kept a false receipt out of the repo.

### Negative controls

| control | what I did | result |
|---|---|---|
| **T1** | grew only the fixed bottom bar by 400px; `.qq` unmoved | band [61,340], **6 assertions red, exit 1** — the band is live |
| **T2** | neutered `fold_budget`'s plant (no disclosure re-open, spacer forced to 0) on the FIXED build | **`ABORT ... the check cannot fail`, exit 1** — it does not silently green |
| **T5** | made the plant move the CHROME as well as the card (`.mockcta{padding-top:60px}`) | **ABORT**, `planted band [61,680] vs fixedBand [61,728]` — the band-unchanged guard is real, not prose |
| **T4** | replaced `touch_floor`'s `atRest` with a single sample, on the FIXED build | **2 FALSE failures**: cram × reads 42.2, `#scrolltop` reads **41.5** with `transform: matrix(0.943116,…)` — mid-transition. The at-rest polling is load-bearing. |

**On the shipped build the plant is non-vacuous:** `planted .qq top=763 vs fixed 415 (spacer 136px,
band unchanged)` — it lands on the pre-fix 763 exactly, as designed.

**T3 note (my instrument, not the build).** I tried to reproduce the freeze's rejected "first
version" plant by un-clipping `.tn-current` alone; it did *not* perturb the band, because
`.tn-trigger` is now `overflow:hidden` at 44px so the nowrap label cannot widen the document. Their
first version must have undone more of the identity block. The *mechanism* they cite is documented on
disk and independently true — `src/styles.css:723-731` records that a widened document resizes the
fixed `.mockcta` — and T5 proves the guard that would catch it fires. So the claim stands; my T3 was
simply not a faithful reproduction, and I am recording that rather than counting it as a refutation.

### Font / wall-clock dependence

Neither guard has a wall clock in any assertion; both read computed layout at a pinned and asserted
viewport. `fold_budget`'s only font sensitivity is `.qq`'s line box, and it prints the margin every
run. **The freeze's landscape-margin caveat is honest and, if anything, understated to the good:**
measured `lineHeight` is 26.1px, so a font rendering 10% taller costs ~2.6px against a **20px**
margin — ~7.7× headroom. Which brings me to F1.

### F1 — a stale number inside the shipped instrument

`test/fold_budget.cjs:29-30` says: *"Measured headroom at the time of writing: 287px portrait, 11px
landscape -> after the landscape card-head fix, **37px**."* The check itself prints
`margin=20px`, the freeze body says 20px twice, and I measure 20. The 37 is stale. It is only a
comment, but it is the one place a future reader would look to decide how much room landscape has.

---

## 6. VR — every number in the freeze's table reproduces exactly

**Object-level compare of all 16 baselines** (git blob SHAs, `2c74cb7` vs `039c2b6`):
**exactly 3 changed** — `m-walk-light`, `m-walk-dark`, `num-light` — and **13 byte-identical**,
including `home-light`/`home-dark` (the zero-pixel skip-label claim) and `drill-light`/`drill-dark`.
Manifest diff is **4 lines**: the timestamp and the three hashes. Matches the pre-authorised set
exactly; nothing outside it moved.

**My own differ** (`vbbox.cjs`, Chromium canvas decode, at the manifest's own `channelTol: 2`):

| baseline | freeze | mine | verdict |
|---|---|---|---|
| m-walk-light | 225,717 (68.6%) 390×705 @ (0,67) | **225,717 (68.57%) 390×705 @ (0,67)** | exact |
| m-walk-dark | 175,946 (53.5%) 390×703 @ (0,67) | **175,946 (53.45%) 390×703 @ (0,67)** | exact |
| num-light | 66,153 (6.5%) 581×531 @ (338,269) | **66,153 (6.46%) 581×531 @ (338,269)** | exact |

**`num-light` is inputs-only, as claimed.** 4 assumption inputs `40 → 44` (width 251.8 unchanged),
`.ninp` grid `128 → 136`, grid top 236 and width 515.6 unchanged; row 1 top unchanged at 254, row 2
`324 → 328`. Exactly "+4px per input, ×2 rows = +8px".

### F2 — the translation is 121.3 *and* 135.3, not "both exactly -121.3"

Element-level at 390×844 `#event-driven/walk`, BEFORE → AFTER:

```
.side-id   h 188.3 -> 67.0      .hdr       h 73.8 -> 54.0
.locator   top 148.8 -> 78.5    .topic-nav top 187.3 -> 67.0
.mcomp     top 262.3 -> 141.0   (-121.3)
.pane      top 332.3 -> 197.0   (-135.3)   <-- NOT -121.3
.pane HEIGHT unchanged           overflowX 0 -> 0      document delta -135
```

The pixels agree. My **tolerant row-alignment scan** (per-row luminance profile, MAD vs candidate
`dy`; an exact row-signature scan is useless here because a 121.3px shift is fractional and re-hints
every row — my first differ failed its own negative control on that, and I rebuilt it):

| region (m-walk-light) | best `dy` | MAD at best | MAD at 0 | MAD at 121 | MAD at 135/136 |
|---|---|---|---|---|---|
| identity block (y 130–200) | **121** | 1.09 | 8.13 | **1.09** | 10.08 / 10.42 |
| pane region (y 210–772) | **136** | 8.60 | 15.04 | 22.71 | 10.16 / **8.60** |
| pane region, m-walk-dark | **136** | 2.80 | 16.10 | 17.07 | 4.11 / **2.80** |

Sharp, unambiguous minima — so it *is* a translation (a reflow would not produce one), but it is
**two** translations: −121.3 above the companion, −135.3 from the companion's bottom margin down. The
extra 14px is fully accounted for by the freeze's own budget table (`.mcomp` companion + margin
70 → 56 = 14 reclaimed) and by the new `.mcomp{margin-bottom:var(--space-10)}` rule. **Nothing
unexplained changed and the rebaseline is correct** — the attribution sentence is imprecise, and the
freeze contradicts itself between its budget table and its VR table.

*(One absolute I could not reproduce under my framing: the freeze reports `.pane HEIGHT 1142.8 ->
1142.8`; I read 1281.5 → 1281.5, almost certainly a `.pane` vs `.pane.on` selector difference. The
load-bearing claim — **unchanged** — reproduces.)*

**Committed review pairs** are genuinely different images and correctly framed: 720×1600 for the two
360×800 pairs and 1688×780 for the 844×390 pair (dSF 2, from the PNG IHDR chunks), change beginning
at device row 134 = CSS row 67. All six framing lines quoted in the freeze reproduce in my own runs
to within 0.5px, including the dark band `[61,726]`.

---

## 7. THE NEAR-MISS FIX — verified, and it is the wave's best receipt

At 1280×800, `#_focus-toggle`, BEFORE vs AFTER, identical in every field:

```
w=60  h=20  top=152.7  left=19  font-size=9px  padding=4px 12px 4px 12px
display=inline-block  margin-top=10px  .hdr=76.2  .side-id=183.7
aria-label="Toggle focus mode"  aria-pressed="false"  text="Focus"
```

**And the sheet is installed at first paint with no toggle performed:** on `039c2b6`,
`#_focus-style` is present (668 chars) and contains the `#_focus-toggle{font-size…}` base rule while
`.app._focus-mode` is absent. On `2c74cb7` the sheet is absent at first paint — which was harmless
*then*, because it held no rule needed at first paint. `injectStyle()` in `init()` is the correct
fix, and the 14-baseline regression it prevents was real.

---

## 8. THE CRAM CHIP-STRIP

- **First open of a fresh page** (this context had never opened the sheet): **0 chips at t=0, 7 chips
  by ~70ms.** The bounded rAF retry works, and the lazy-render bug the freeze describes is real —
  a single sample at open time does read an empty shadow root.
- **DOM nodes, not `innerHTML`:** each chip's `childNodes` is `[3]` — one text node. The labels carry
  raw `&`, `→`, `—` and curly quotes ("Decisions **&** switch conditions", "Traps **→** the fix",
  "If they say **“**quickly**”**") and **zero** entity strings. An `innerHTML` concat would have
  re-encoded every one of those; this is the exact class `test/entity_leak.cjs` guards.
- **Built from the sheet's own render:** chip labels are `===` (deep-equal, in order) to
  `<deep-cram>`'s rendered `.cs-st` titles. No second list.
- **Navigation works:** hit-test-verified clicks on chips 1 and 2 scroll `#cram` to within **0.5px**
  of the target section (0 → 1281 → 1931) and set `.on` on the correct chip. *(My first attempt
  failed because I clicked a chip that had scrolled out of the horizontally-scrolling strip — an
  instrument miss, not an app defect.)*
- **Print is pointer-gated, not width-gated:** `display:none` at 360 coarse; **`display:block` at
  400px wide with a FINE pointer**, where `matchMedia('(max-width:919px)')` is still true. Exactly
  the claim.
- The cram close button reads **43.2 / 42.2 mid-animation and 44.0 × 44.0 at rest**
  (`transform: none`) — I hit the artifact myself before adding a rest poll, which independently
  corroborates why `touch_floor` polls.

---

## 9. `latent_arial` / the mid-wave catch (`43acaa2`)

`.dsu-tog{display:none;font:inherit}` is now unconditional. At **desktop width** — where the check
walks the declaration and the button is `display:none` — the computed `font-family` equals
`document.body`'s stack exactly (`matchesBody: true`). `test/latent_arial_debt.json` is
**byte-unchanged** between base and tip, **15 keys**, and `.dsu-tog` is **not** among them — it was
fixed, not allowlisted. Gate reports "15 known component(s)".

---

## 10. PARSE SANITY — the IDE noise is noise

`node --check` passes on all eight touched/added JS files:

```
src/scripts/app/drill/logic.js  src/scripts/app/focus-mode.js  src/scripts/app/cram-sheet.js
src/scripts/app/num/logic.js    visual-trainer/src/kit.js
test/fold_budget.cjs            test/touch_floor.cjs           _audit/.../capture-pairs.cjs
```

`oxlint` on the four `src/` files: clean, no output. The gate's own `syntax_check` parses 612 modules
green. **The IDE's complaint on `drill/logic.js` is TypeScript-service noise on valid JavaScript** —
the file contains large template literals holding HTML and CSS, which a TS parser in a JS file
routinely mis-lexes. There is no syntax defect. (Worth noting the source itself carries three
comments warning that a stray backtick in `DRILL_HTML`/`DRILL_STYLE` has silently killed the pane
three times; `syntax_check` is the check that catches it, and it is green.)

---

## 11. FULL GATE RE-RUN — 66/66 on the committed tree

I re-ran `python3 test/check_all.py` on `039c2b6` myself, on a quiet box, with nothing else running:

```
GATE: PASS      66 checks, 66 PASS, 0 FAIL
```

`diff` of the check-name + verdict list against the committed
`_audit/2026-07-29-w2-phone-gate.txt`: **identical**. Capture at `gate-rerun.txt`.
`visual_regression` PASS against the *committed* pixels; `fold_budget` PASS; `touch_floor` PASS;
`latent_arial` PASS at 15. `git status --porcelain` empty and HEAD still `039c2b6` afterwards.

---

## 12. P2-12 — "no result" is the correct and conservative reading

| viewport | delta | before-run spread | \|delta\| / spread | ranges overlap | warm-`wb` control |
|---|---|---|---|---|---|
| 1280×800 | −12.0ms | 146.3ms | **0.08** | yes | 182.9 → 211.2 = **+28.3ms slower** |
| 360×800 | −27.8ms | 194.7ms | **0.14** | yes | 212.3 → 219.8 = **+7.5ms slower** |

The control moved the **wrong way in both passes** (the box was busier during "after"), and both
deltas sit at 8–14% of the run-to-run spread with heavily overlapping ranges. The numbers support
"no result", and the reading is if anything conservative: a busier box during the "after" pass means
any real improvement is at least as large as measured, and the freeze still declines to claim one.
The desktop half is additionally settled by construction — `drill-light`/`drill-dark` are identical
blobs, so "no change" is the *expected* desktop outcome. Consistent with the audit's WON'T-FIX;
"do not re-chase" is right. The instrument (`_perf/ab.cjs`) is pre-existing and is a matched-load
interleaved A/B with calibration spins, as described.

---

## Hazards pre-cleared (named even though clean)

1. **Viewport drift — the audit's 59-of-60 loss.** Every record in all nine of my scripts carries
   `innerWidth`/`innerHeight`, and the node side throws `VIEWPORT DRIFT` on mismatch. Roughly 45
   measurements across 8 runs: **zero drift**. Every context was created fresh and isolated; no page
   was ever shared between probes.
2. **Mid-animation sampling.** I walked into it twice — cram × at 42.2/43.2, `#scrolltop` at 41.5
   under `matrix(0.943…)` — and both are exactly what `touch_floor`'s at-rest poll exists to prevent.
   This corroborates the builder rather than contradicting them, and T4 quantifies it: single-sampling
   manufactures 2 false failures on a compliant build.
3. **`html{scroll-behavior:smooth}` (styles.css:36).** Every programmatic scroll here is animated, so
   a 2-rAF settle reads it mid-flight. This cost me two false "occluded" throws before I added a
   scroll-to-rest poll, and it is the mechanism behind F3.
4. **Clicking through the fixed chrome.** My first P2-8 driver clicked at y=734 and hit
   `div.mockcta`; the stage never advanced and nothing errored. Every click in the final runs is
   preceded by an `elementsFromPoint` check that the intended target is topmost.
5. **Fractional-pixel translation defeats exact image alignment.** My first differ's row-signature
   scan found `dy=0, 139/844 rows` for a genuine 121.3px shift — it failed its own negative control,
   so I rebuilt it tolerantly rather than reporting the null result. F2 comes from the rebuilt one.
6. **Read-only discipline.** No commits, no edits, no `vr:update`, no writes of any kind inside the
   worktree. The base build was extracted with `git show 2c74cb7:… > scratch`. All scratch lives
   under the assigned directory. `git status --porcelain` was empty at the start and is empty now,
   HEAD `039c2b6` unchanged.
7. **No image-wide browser kills;** every browser was launched and closed by its own script via
   Playwright. PowerShell was not used.
8. **Disclosed gap I did not treat as a finding:** `touch_floor`'s plant re-arms only the **44px**
   arm; the 24px AA arm has no negative control. The header discloses this ("the 44px arm is re-armed
   every run"), and both AA targets are additionally proven red on the base build, so the arm is
   demonstrably capable of failing. Worth a plant if the AA set ever grows.
9. **Disclosed gap #2:** `fold_budget`'s plant exercises the **portrait** assertion only; the
   landscape arm shares the same `FOLD()` probe but has no plant of its own. Its `bandPx > 257` arm
   does go red on the base build, so it is not a check that cannot fail.

---

## Behaviour claims spot-checked and true (not otherwise itemised)

- Disclosure row: `aria-expanded="false"` when closed, `aria-controls="dmoderow tierrow tiernote"`
  and **all three ids resolve** inside the shadow root; all three are `display:none` when closed;
  the row is 44px and states **"Study · All 22"**.
- Changing the tier through the real control updates the row to **"Study · SDE3"** — `setMode` is the
  single funnel and it holds.
- **Mock round forces the row open** (trade 3): after deliberately closing it, clicking "Mock round"
  reopens it (`dsu-closed` removed, `aria-expanded="true"`), the value reads **"Mock round · SDE3"**,
  and the countdown is visible at **22:00** inside it. Collapsing a running clock was avoided, as
  claimed.
- `#hm-skip-cb` label: **272.4 × 44** (was 272.4 × 18), `align-self:stretch`, `display:flex`,
  `min-height:24px`, inside a 44px row whose top it shares exactly — and `home-light`/`home-dark`
  are identical blobs, which is the decisive proof that nothing moved.
- kafka viz range: **3 sliders at 140 × 24** (was 140 × 16), computed `height: 24px`.
- Zero console errors and zero page errors across every run on both builds.
