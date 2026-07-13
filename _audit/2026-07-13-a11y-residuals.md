# a11y residuals — OPEN after the 2026-07-13 push (b6966f8)

The three a11y fixes are MERGED AND LIVE and are all genuine improvements.
But 2 of 3 verifiers said INCOMPLETE, and the push happened before they landed.


---

## # VERDICT: the fix is REAL, it crossed the shadow boundary — but it is INCOMPLETE. I found a 5th focus-destruction site the fixer missed.

# VERDICT: the fix is REAL, it crossed the shadow boundary — but it is INCOMPLETE. I found a 5th focus-destruction site the fixer missed.

I wrote my own harness from scratch (shadow-piercing live-region monitor + focus probe), reused none of their scripts, and re-measured everything.


## 2. The claims hold — proven, with controls that flip

My strongest control wasn't a mock: I extracted the **pre-fix shipped build** (`git show 6a6153b:deepdive_content_pipeline_rehearsal.html`) and ran the *identical* harness against it.

| Claim | FIXED (measured by me) | PREFIX (same code) |
|---|---|---|
| Grade announces | `"Solid. 1 solid, 0 revisit, 21 left."` | **0 announcements** |
| Focus after reveal/grade/nav-jump | new, painted, correct block | **`<body>` every time** |
| Mock timer | `effective=off`, 0 utterances/4.2s | `polite`, 4 ticks/4.2s |
| Mock grade | announced | **only thing spoken was the clock: `"21:55"`** |

That last row independently confirms their escalation #2: **the timer really was burying the grade.** Not an argument — a measurement.

**Full round: 68 reveals + 22 grades = 90 focus events, zero failures.** Every landing was a *newly-appeared* block (content-compared, not class-compared), painted, and the **spoken score never drifted from the visible tiles across all 22 grades**, including the `Round complete` variant.

**The shadow boundary is genuinely crossed.** The `:focus-visible` rules live in the drill shadow root's own `<style>` (2 rules); `adoptedStyleSheets` contain **zero** `:focus-visible` rules, so there is no cascade conflict. I deleted the rule at runtime and **watched the ring die** (`solid 2px` → `none`). It is the rule that paints.

Negative controls, all observed flipping: stub `announce()` → capture 0, restore → capture returns · `blurDeep()` → probe really says `body` · re-add `aria-live` to the timer → `polite` + 4 ticks reappear · delete the shadow rule → ring dies.

**Their axe "trap" claim is correct and important:** `violations: 0` on **both** builds — a violations-only gate is *structurally incapable* of catching this — while the node moves `incomplete(1) → passes(1)`. Whoever builds the a11y gate must assert on the bucket.

**Two of my own checks were wrong first.** A synthetic `el.click()` does not set Chrome's input modality, so I initially measured a focus ring on "mouse" clicks. With *trusted* Playwright input: mouse → `none`, keyboard → `solid 2px`. The modalities genuinely discriminate. My second false red was testing the judge row before it existed.

**No regressions.** Boot, topic switch, pane switch, mode toggles, tier toggle all keep focus. No tab-stop leak (only ever one `tabindex="-1"` at a time). All 6 rooms resolve a real `var(--acc)` ring colour. Works under dark/light, reduced-motion, forced-colors (`solid 2px`, still visible), and mobile-390 with no horizontal overflow.


## 3. THE DEFECT — `logic.js:573`, the mock timer expiry

```js
if (self.mockLeft <= 0) { clearInterval(self.timerId); self.timerId = null; self.di = cards.length; self.renderD(); }
```

`renderD()` — **no argument**. `renderVerdict()` then does `this._dwrap.innerHTML = ...`, destroying the focused element.

Measured, with the *same destination reached by grading out* as the control:

| | focus after | announced |
|---|---|---|
| **Clock runs out** | **`<body>`** | **nothing** |
| Grade the last card (control) | `.card.debrief` | `"Solid. Round complete. 5 solid, 0 to revisit."` |

Same `renderD` → `renderVerdict`/`renderDebrief`. One entry opts in; the other doesn't. This is the **fifth** focus-destruction site — and the worst one, because it is the only path the user *did not trigger*: the clock silently ends a 22-minute mock round, the verdict replaces their card, focus falls to the top of the document, and the screen reader says nothing. They cannot know the round is over. It also hits sighted keyboard users (Tab restarts from the top).

It is an **incompleteness, not a regression** (PREFIX is equally broken), and their `sr-verify.mjs` has **zero references to `mockLeft`**, so nothing guards it. Fix is one line plus an announce, mirroring `judge()`:

```js
self.di = cards.length; self.renderD(true);
ViewManager.announce('Time. Round complete. ' + self.got + ' solid, ' + self.shk + ' to revisit.');
```


---

## # VERDICT: the fix is real, it crosses the shadow boundary, and it holds. Merge it.

## 2. My negative control is the real shipped bug
`git show HEAD~1:deepdive_content_pipeline_rehearsal.html` **is** the pre-fix deliverable. Every assertion ran against both builds. A DEFECT assertion that passes on BEFORE has no power and I would have named it decoration.

| | BEFORE (the shipped bug) | AFTER (`f78e211`) |
|---|---|---|
| DEFECT assertions | **0 / 14 pass** | **14 / 14 pass** |
| GUARD assertions (regression tripwires) | 7 / 7 pass | 7 / 7 pass |

Plus **4 / 4 runtime negative controls** go red on demand inside the fixed build. The sharpest: restore the original DOM order + `order:1/2` and **paint still looks correct (seg at 526px, above mockbar at 960px) while tab order inverts (seg @ Tab#25, after mockbar @ Tab#12)** — the WCAG 2.4.3 bug, reproduced on command.


## 4. Tried to break it — couldn't
**6 rooms × 2 themes** (all six enumerated: messaging-events, data-storage, reliability-observability, platform-infra, architecture-apis, security-tenancy), **mobile 390×844**, **reduced-motion**, **forced-colors** — no typing leak, no drill hijack, `#scrolltop` hidden in all. Zero page/console errors.

**Paint neutrality, my own differ, proven able to fail:**
- desktop **0 / 284,160 px** changed (negative control: a real reorder moves **87,424 px**)
- mobile **0 / 329,160 px**, drawer closed *and* open (negative control: a 6px nudge moves **8,091 px**)

The fixer is right that `visual_regression.py` is a regex over source — I confirmed it never imports playwright/PIL/screenshot. **It structurally cannot see a pixel.** A paint regression from this DOM reorder would have shipped green.


## 5. NEW — a seventh check that cannot fail, and it's in `test/_boot.cjs`
`src/scripts/app/index-overlay.js:410` removes the `.open` class on a **220 ms `setTimeout`**, while `IndexOverlay.isOpen()` flips to `false` immediately. The shell's global keydown handler bails on **the class**:
```js
for (dlg of [role=dialog][aria-modal=true]) if (dlg.classList.contains('open')) return;
```
**For 220 ms after the landing overlay closes, the entire keyboard is dead while the app's own API reports it closed.** `test/_boot.cjs::closeIndex()` waits for `isOpen()===false` then `settle()` (2 rAFs ≈ 32 ms) — **it returns inside the dead window.** Any harness that closes the landing overlay and immediately presses keys is driving a switched-off keyboard, and *"key X does not leak"* goes **green for the wrong reason**. This bit me directly: my v1 passed on timing luck, my v2 was faster and walked straight into it. It is the most likely explanation for the audit's undercount. Correct predicate: wait for `!document.querySelector('[role=dialog][aria-modal=true].open')`.


## 6. Corrections and residuals (all minor; none block the merge)
- **The fixer's "leaks no global; `global_collisions` still 643" is misleading.** `test/global_collisions.py` counts `var/let/const/function` declarations — it **never looks at `window.X =`**. `window.KeyGuard` *is* a new window global (0 occurrences in BEFORE); the count is unchanged because the check cannot see it, not because nothing was added. Harmless (matches the existing `window.Density`/`TourGuide` pattern), but the claim implies a check that doesn't exist.
- **`.scrolltop` residual, measured:** the visibility step is delayed by `--vis-delay: var(--duration-slow)` to preserve the fade-out, so after scrolling back to top the button stays focusable while opacity ≤ 0.08 from **t=285 ms to t=425 ms** — a ~140 ms transient phantom stop. The *permanent* phantom (the actual P1-4 defect) is gone; under reduced-motion the window collapses to ~0. Known residual, not a blocker.
- **Dead code contradicting its own comment:** `src/styles.css:476` and `:483` still carry `.sidebar .seg{order:1}` / `.sidebar .mockbar{order:2}` inside `@media(max-width:919px)`. The fixer deleted only the desktop pair and wrote *"Do not reintroduce `order` in this column"* 50 lines above. **Verified inert** (both compute `position:fixed` on mobile; mobile tab order is correct — seg @ #8 before mockbar @ #17), but it should be deleted — it is exactly the plausible-looking-but-dead selector class this repo keeps tripping over.
- **Fixer's new mock-run finding: CONFIRMED independently.** Mock overlay open, initial focus lands on `#mockx` (its own close button); Enter fires `mbnext` and **does not close** (`clicks:[mbnext]`). Real WCAG 2.1.1 defect. I also confirm his reason for *not* one-lining it: the overlay traps focus on buttons, so gating on `ownsActivationKeys` would kill Space-to-reveal entirely. Needs a design call, not a one-liner.
- **A regression I predicted and withdrew:** "mouse-click the pane button, then Space re-activates the button instead of advancing the drill." **Measured false** — after a mouse click on a `.seg` button `document.activeElement` is `<body>` (both builds), so Space still advances exactly once.


---

## # VERDICT: The fix is real. All 5 claims hold. But it is INCOMPLETE, and it introduces one regression.

# VERDICT: The fix is real. All 5 claims hold. But it is INCOMPLETE, and it introduces one regression.

I rebuilt every instrument from scratch and watched each one go red before quoting a number. **Gate: PASS 30/30** (my own run); `render.cjs` reports `h-overflow 0/385, js-errors 0`.


## THE DEFECT: HIGH-4 is incomplete, and "It is hiding NOTHING" is false

The negative control is decisive and vindicates the removal: on BEFORE, a 900px div injected into `.stage` at 320px produces **0px** document overflow — **the gate's own detector was switched off.** On AFTER it produces **+595px**.

But `render.cjs` sweeps a **cross-shape, not a cross-product**: 9 panes on *one* topic + 46 topics on *one* pane. So the `num` pane is only ever measured on the default topic — where it happens to be clean.

I swept **46 topics × 10 panes × 4 widths = 1840 states. 153 overflow.**

- **38/46 topics overflow in `num`** at 320–768px (26/46 at 1024px, 0/46 at ≥1280px). Worst **+133px**.
- Offender: `.nrow-v` / `.nrow-n` inside `<deep-numbers>` — a shadow root. (`render.cjs`'s offender-namer uses `document.querySelectorAll('body *')`, which doesn't enter shadow roots, so even when it fires it can't name the cause.)
- **It is pre-existing.** Forcing `overflow-x:visible` on BEFORE reproduces the identical +121px — the clip was silently cutting this text off on 38 topics for the app's whole life, *unreachably*. The fix makes it reachable by scrolling.
- **So their comment is wrong**: *"the true document overflow is 0px … across walk, drill, wb, sys and num. It is hiding NOTHING."* They measured `num` on the default topic only.

**Remedy verified — 38/46 → 0/46** — the same treatment they already applied to `.dnav`/`.arc-grid`/`.fb`, in `deep-numbers`' shadow sheet:
```css
.nrow{grid-template-columns:1fr} .nrow>*{min-width:0;overflow-wrap:anywhere} .nrow-v{white-space:normal}
```


## THE REGRESSION: forced-colors flattens the `.dec`/`.rf` accent edges

BEFORE forced-colors had **3 distinct border signatures** (`.card` 1/1/1/1, `.dec` **3**/1/1/1 thick-top, `.rf` 1/1/1/**3** thick-left — pixel-confirmed, 3 black rows). AFTER: **1** — every surface is an identical 2/2/2/2 box.

They preserved exactly these accents under `prefers-contrast`, with a long comment about the trap — then used the shorthand for `forced-colors` and argued *"an accent HUE carries no information any more."* **That conflates hue with width.** forced-colors recolours borders; it does not erase their width or side. Those were carrying the distinction. (`.rf` survives via its `✗` glyph; `.dec` has no such marker.)

**Remedy verified**: `.dec{border-top-width:3px}` + `.rf{border-left-width:3px}` in BASE_SHEET's forced-colors block restores 3/5 signatures while keeping the thicker 2px frame. **Critically — the same two lines in a shadow root's own `<style>` are a no-op**, because `adoptedStyleSheets` cascade after it. I made that exact mistake on my first attempt. It must go in `base-styles.js`.

