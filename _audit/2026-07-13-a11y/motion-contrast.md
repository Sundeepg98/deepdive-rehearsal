# A11y audit — REDUCED MOTION · FORCED COLORS · CONTRAST

**Target:** `dist/index.html` @ `4318509` (46 topics × 9 panes, 17 shadow roots)
**Date:** 2026-07-13 · **Scope:** 6 rooms × 2 themes, pixel-decoded
**Scripts:** `_audit/2026-07-13-a11y/mc-*.mjs` · **Screenshots:** `shots/motion-contrast/`

---

## 0. The instruments, and proof each one can fail

This repo has shipped five checks that could not fail. The audit that certified a completely blank
page as passing counted *text nodes* — and `opacity:0` on `<body>` does not propagate into a
descendant's computed opacity, so the node counter reported hundreds of "visible" nodes on a page
that painted nothing. **Every check below is a decoded framebuffer, and every one was shown to go
red before it was used.** (`mc-00-calibrate.mjs`, output in `mc-data-calibration.txt`.)

| Instrument | Negative control | Result |
|---|---|---|
| **Painted pixels** — decode the PNG, find the modal (background) colour, count pixels differing from it | force `body{opacity:0}` | painted **453,508 → 0**, while the naive node counter still reports **167 → 167**. The trap, reproduced. |
| **Contrast** — analytic alpha recovery (below) | hand-computed swatches | `#000/#fff` → **21.00** (Δ0.000); `#767676/#fff` → **4.54 PASS**; `#777/#fff` → **4.48 FAIL**. Correctly splits the AA boundary. Independently reproduces the repo's own claimed **6.18** and **9.17** for `--st-ok` (styles.css:181) *from pixels alone*. |
| **forced-colors emulation** | does it actually force? | body colour `rgb(42,40,35) → rgb(0,0,0)`, CTA `background-image: linear-gradient(…) → none`. Genuinely substitutes system colours — not just an MQ flip. |
| **Fill detection** (scoreboard) | zero-state vs graded | tile-vs-tile colour distance **0 → 551** when a probe is graded Solid. It can see a fill. |
| **Force/restore cycle** | assert page is unchanged | Runs every sweep. **It caught a false positive I had already produced** — see §4.0. |

**How contrast is measured.** `getComputedStyle` returns `rgba(0,0,0,0)` for the gradient CTAs and a
useless literal string for `backgroundImage`. And "worst background pixel in the button" is not a
metric — it samples pixels no glyph touches (gradient extremes, inset highlights, the border), which
is what manufactured six bogus ~3.1:1 failures. Instead, per target, four renders:

```
A = text forced #000  ->  A = α·0   + (1-α)·bg
B = text forced #fff  ->  B = α·255 + (1-α)·bg     =>  B - A = 255α  on EVERY channel
T = text transparent  ->  T = bg exactly, at every pixel INCLUDING under the glyph core
N = normal            ->  what the eye actually sees
```

α is per-pixel glyph coverage, recovered exactly. Contrast is `WCAG(N, T)` over the **glyph core
only** (α ≥ 0.98·α_max, relative — an absolute cut admits antialiased edges and read black-on-white
as 14.9:1 instead of 21:1). Chromium uses subpixel AA here: per-channel coverage disagreement runs
~0.72 at glyph edges and **collapses to exactly 0 on the core**, which is why this is exact.

---

## FINDINGS

| # | Severity | Finding |
|---|---|---|
| **F1** | **HIGH** | The `forced-colors` and `prefers-contrast` blocks target shadow-only classes from the light DOM — **they match zero elements**. Third instance of a bug class this repo has already fixed twice. |
| **F2** | **HIGH** | Under forced-colors the drill scoreboard's **fill-vs-outline encoding is destroyed**. The one channel the redesign called "the load-bearing one" is exactly the one forced-colors removes. |
| **F3** | **HIGH** | `.pomodoro-play` — white ▶ on `var(--teal)` at **1.96:1** in dark mode, all 6 rooms. A foreground-ink token used as a button fill. |
| **F4** | **MEDIUM** | Drill scoreboard's **default state** (`.pill.z`, what every user sees on opening the drill) is **2.51–2.66:1**. |
| **F5** | **MEDIUM** | `.badge` "DEEP REHEARSAL" at **3.89:1** in both themes; its dark-theme fix (styles.css:394) is a **dead rule**. |
| **F6** | **LOW** | Reduced motion kills both overlay exit animations; they close only via a 500 ms `setTimeout` fallback. |
| **F7** | **LOW** | Three hairline sub-4.5 surfaces (4.43–4.49). |
| **R1** | **RISK** | The reduced-motion landmine is armed and **asymmetric across the shadow boundary**. Proven, not inferred. |

---

## 1. REDUCED MOTION — the app renders. The blank page is genuinely fixed.

`mc-01-motion.mjs` → `mc-data-motion.txt`

All **6 rooms × 2 themes** paint under `prefers-reduced-motion: reduce`, and paint **pixel-identical
to normal** (delta `+0%` in all 12 states):

```
room                        theme  painted(reduce)  painted(normal)  delta  verdict
messaging-events            light        559,481          559,483     +0%   RENDERS
messaging-events            dark         434,338          434,337     +0%   RENDERS
data-storage                light        547,134          547,135     +0%   RENDERS
…12 of 12 states…                                                           RENDERS
```

All **10 panes** render (`walk` 425,793 px … `model` 799,811 px), and a cross-mode scan of effective
opacity — the *ancestor-chain product*, crossing shadow boundaries, which is the thing
`getComputedStyle(el).opacity` cannot see — finds **zero elements** that are visible normally and
invisible under reduced motion. Nothing depends on an animation to appear.

### R1 (RISK) — the landmine is armed, and it is asymmetric

`mc-01b-landmine.mjs` → `mc-data-landmine.txt`. I planted the exact failing pattern
(`opacity:0` base + `animation: … forwards`) on **both sides of the shadow boundary** and decoded
painted pixels in each element's box:

| | computed opacity | animation-name | painted px | |
|---|---|---|---|---|
| **light DOM**, reduce | `0` | **`none`** | **0** | ***INVISIBLE*** |
| **shadow DOM**, reduce | `1` | `mcReveal` (dur `1e-05s`) | **26,028** | fine |
| both, motion allowed | `1` | `mcReveal` | 26,178 / 26,028 | fine |

**The identical CSS is a blank-screen bug in the light DOM and completely safe inside a shadow root.**

- styles.css:260 `*{animation:none!important}` strips **animation-NAME**, so a `forwards` fill can
  never apply.
- BASE_SHEET (base-styles.js:31) only zeroes **animation-DURATION**, so inside a shadow root the
  animation still runs to completion in .01 ms and `forwards` lands.

The app is safe **only because every reveal currently happens to use `backwards`** (body at
styles.css:207; `.ins` at walkthrough/logic.js:39; `details.disc` at shared-sheets.js:76). Nothing in
the codebase marks the difference, and nothing in the test suite would catch a regression except a
painted-pixel count. This is the trap that already shipped once.

### F6 (LOW) — the exit animations are dead under reduced motion

styles.css:596-7 close the overlays with `animation: … forwards`, and `mock-run/logic.js:25` waits on
`animationend`. Reduced motion sets `animation-name: none`, so **`animationend` never fires**. Both
overlays close only via the 500 ms `setTimeout` fallback (logic.js:26):

```
mock  closed after 528ms      cram  closed after 529ms
```

Not a break — the fallback was written for exactly this — but the overlay sits fully opaque for half
a second after Escape, with no fade. The fallback is load-bearing, not a safety net.

### The onboarding trap (measurement validity)

`index-overlay.js:427` — `if (!window.__bootHash && !hasProgress) setTimeout(open, 30)` — auto-opens
the full-screen **Topic index** over the app on any profile with no saved progress, i.e. **every
fresh browser, which is what every Playwright run is**. It carries `backdrop-filter: blur(8px)`.

```
on load, no interaction:  #_index-overlay = "ix-ov open vis"   painted = 866,882
                          ^ those pixels are THE ONBOARDING PANEL. The app behind it is BLURRED.
after Escape (286ms):     painted = 548,494   <- this is the app
```

**A painted-pixel check that does not dismiss this would happily certify the overlay and never look
at the app**, and every contrast number taken of the app behind it would be of blurred text. All
numbers in this report are taken with it dismissed. (Its close path is a 220 ms `setTimeout`, not
`animationend`, so it is itself motion-safe.)

---

## 2. FORCED COLORS — F1: the rules match nothing

`mc-02-forced.mjs` → `mc-data-forced.txt`

The app renders under `forced-colors: active` in all 12 states (95,736–107,179 painted px). But the
support is not real. Element counts on the walkthrough view:

```
selector      lightDOM   shadowDOM
.card              0          10    *** MATCHES NOTHING ***
.dec               0           7    *** MATCHES NOTHING ***
.rf                0           9    *** MATCHES NOTHING ***
.piv               0           7    *** MATCHES NOTHING ***
.thread            0           1    *** MATCHES NOTHING ***
.dgm-s             0           7    *** MATCHES NOTHING ***
.pill              0           3    (never named in either block anyway)
```

**styles.css:751** (`@media(forced-colors:active)`) and **styles.css:749**
(`@media(prefers-contrast:more)`) both target `.card, .dec, .rf, .piv, .thread` **from the light-DOM
stylesheet**. Every one of those elements lives inside a shadow root. A light-DOM rule cannot cross a
shadow boundary. **Those declarations apply to zero elements** — the high-contrast and forced-colors
"support" for the card surfaces, which is where *all* the content lives, never executes.

This is not a subtle inference. Dumping `adoptedStyleSheets` on `<deep-walkthrough>`:

```
sheet[0]  2172 chars   forced-colors:false   prefers-contrast:false   reduced-motion:TRUE   print:TRUE
sheet[1]   393 chars   forced-colors:false   prefers-contrast:false   reduced-motion:false  print:false
```

The shadow side carries a reduced-motion rule and a print rule — **each added precisely because a
light-DOM rule could not reach** (base-styles.js:33-36 and :38-43 say so in as many words, and
styles.css:22 says it a third time for the same five classes). Forced-colors and prefers-contrast
were never given the same treatment. **Same bug, third time, still open.**

### F1b — `prefers-contrast: more` is half-dead

The light-DOM half of styles.css:749 *does* work (`segOutline 3px→2px`, `mockbtnBorder 0→1px`,
`locatorColor → --ink`). The shadow half does not:

```
.card border-width:   1px  ->  1px    (rule asks for 2px; never runs)
```

Two declarations in that block are dead for *different* reasons — worth separating:
- `.card,.dec,.rf,.piv,.thread{border-width:2px}` and `.cmp-note,.cmp-thesis,.dgm-s{color:…}` — dead
  by **shadow boundary**.
- `.sub{color:var(--ink)}` — dead by **specificity**: `.hdr .sub` (0,2,0) at styles.css:228 already
  sets `color:var(--mut)` and outranks the `.sub` (0,1,0) in the media block. Measured: `.sub` colour
  is unchanged (`rgb(107,104,98)`) under `prefers-contrast:more`.

### F2 (HIGH) — the scoreboard's load-bearing channel dies in forced-colors

`drill/logic.js:68` is explicit about what the redesign relies on:

> `FILL vs OUTLINE` — **the load-bearing one**. SOLID is the ONLY tile that ever fills. A filled slab
> beats an outline against ANY wallpaper because that is an area+luminance contrast, not a hue
> contrast — it holds in all six rooms and in greyscale.

It does not hold in forced-colors. I drove the **real** drill state machine (`#adv` → `#jg`) to grade
three probes Solid, then decoded the tile backgrounds:

| | SOLID tile bg | REVISIT tile bg | distance |
|---|---|---|---|
| **normal**, Solid=0 | `[252,252,250]` | `[252,252,250]` | 0 |
| **normal**, Solid=3 | **`[29,111,63]`** | `[252,252,250]` | **551** ← fills |
| **forced-colors**, Solid=0 | `[255,255,255]` | `[255,255,255]` | 0 |
| **forced-colors**, Solid=3 | **`[255,255,255]`** | `[255,255,255]` | **0** ← ***does not fill*** |

`forced-color-adjust: auto` → the UA forces `background-color` to `Canvas`, and
`.pill.g:not(.z){background:var(--st-ok)}` is overridden. The SOLID tile becomes visually identical
to LEFT. See `shots/motion-contrast/scoreboard-forced-pane.png`.

**What survives:** the glyphs (`✓` / `↻`) and the labels and the numbers. The board is still
*decodable* — this is not a catastrophe, and the redundant-encoding decision is what saves it. But
the channel the design leans on is gone, and the "only Solid fills" celebration signal with it.

**The fix is one line, and the codebase already knows it.** styles.css:751 does exactly the right
thing for `.badge`: `background: Highlight !important; color: HighlightText !important`. `.pill` never
got it — because `.pill` is in a shadow root and that block cannot reach it. Add to the drill's
shadow sheet:

```css
@media (forced-colors: active) {
  .pill.g:not(.z) { background: Highlight; border-color: Highlight; forced-color-adjust: none; }
  .pill.g:not(.z) .v, .pill.g:not(.z) .l { color: HighlightText; }
}
```

*(Room identity under forced-colors: the six rooms do collapse to one palette — correct and
unavoidable. The `.loc-key` letter code (`SEC`, …) survives and carries room identity, exactly as
styles.css:217-219 intends.)*

---

## 3. CONTRAST — the full band

`mc-03-contrast.mjs` → `mc-data-contrast.{txt,json}`

**1,964 text elements** measured (light DOM + all 17 shadow roots), 6 rooms × 2 themes, walk + drill.
**77 below their WCAG AA floor** across **8 distinct surfaces**. A further 12 are below floor but are
**disabled controls** — WCAG 1.4.3 exempts inactive components, so they are *not* counted (see §4.0).

```
element                                text                   ratio        floor  states      themes
button.pomodoro-btn.pomodoro-play      "▶"                    1.96         4.5    6 of 6      dark      F3
deep-drill::div.v  (.pill.z)           "0"                    2.51         3.0    6 of 6      light     F4
deep-drill::div.l  (.pill.z)           "Revisit"              2.63 .. 3.37  4.5   12 of 12    both      F4
deep-drill::div.l  (.pill.z)           "Solid"                2.66 .. 3.37  4.5   12 of 12    both      F4
span.badge                             "Deep rehearsal"       3.89         4.5    12 of 12    both      F5
deep-walkthrough::div.arc-h            "The whole flow…"      4.43 .. 4.46  4.5   3           light     F7
deep-drill::div.dnav-h                 "Your drill set…"      4.45         4.5    1           light     F7
deep-walkthrough::span.sub             "model script · …"     4.49         4.5    1           light     F7
```

Everything else passes. The rest of the band runs **4.51 → 19.46**, with the bulk of body copy in
5–7.5:1.

### F3 (HIGH) — `.pomodoro-play`: 1.96:1, white ▶ on light teal, dark mode, every room

styles.css:785 — `.pomodoro-play{background:var(--teal); color:#fff}`. And `--teal` flips by theme:

```
light:  --teal = #0F6E56   ->  white on it = 6.09:1   pass
dark:   --teal = #4FCDAB   ->  white on it = 1.96:1   FAIL
```

`--teal`'s dark value is a **light tint, designed to be an ink on a dark background** — and here it
is used as a **button fill with white text on top**. Verified two ways (pixel-decoded 1.96;
independently hand-computed from computed styles 1.97) and eyeballed:
`shots/motion-contrast/verify-pomodoro-dark.png`. Even under the more lenient 3:1 non-text floor
(WCAG 1.4.11, if you call ▶ an icon) it fails.

This is the *same class of bug* the scoreboard redesign was written to kill — `--teal` is one of the
legacy hue tokens the drill was explicitly moved **off** (drill/logic.js:51-56). It is still load-
bearing on this button.

### F4 (MEDIUM) — the drill scoreboard's default state is under-contrast

`.pill.z{opacity:.62}` (drill/logic.js:105) multiplies an already-muted ink. On opening the drill —
Solid 0, Revisit 0, the state **every user starts in** — the two status tiles read:

```
"0"        --mut  #6B6862 × .62  ->  2.51:1  (floor 3.0 for 24px/800)
"Solid"    --mut2 #67615A × .62  ->  2.66:1  (floor 4.5 for 9px/700)
"Revisit"  --mut2 #67615A × .62  ->  2.63:1
```

Confirmed by both methods (pixel 2.51 / hand 2.57 — the small delta is the exact blend). Once a probe
is graded the tiles un-dim and pass comfortably (Solid fills at 6.18:1). It is the **initial** state
that fails, and it is the one everyone sees.

### F5 (MEDIUM) — `.badge` at 3.89:1, and a dead dark-theme rule

White 10px/800 text on a fixed indigo gradient (`linear-gradient(135deg,#534AB7,#6D5FD6 60%,…)`) →
**3.89:1** against the background *local to the glyphs*, in **both** themes.

styles.css:394 has `html[data-theme="dark"] .badge{color:#1A1622}` — measured computed colour in dark
is **`rgb(255,255,255)`**. That rule is **overridden and never applies**. (It would not have helped:
`#1A1622` on that gradient is ~3.5:1. But it is dead, and it is worth knowing that it is.)

**This element is the whole argument for the method.** An independent computed-style check reports
**1.05:1** for the badge — because `backgroundColor` is `rgba(0,0,0,0)`, so it walks *past* the
gradient up to `body`. `getComputedStyle` cannot see this. The pixel pipeline decoded the gradient
actually under each glyph and returned 3.89.

### F7 (LOW) — three hairline surfaces

`.arc-h` (4.43), `.dnav-h` (4.45), `.span.sub` (4.49) — all within 0.07 of the 4.5 floor, all in
light theme, all 9–11px semibold section eyebrows. A ~2% darkening clears them.

### `#mockopen` — the known thin spot, confirmed and passing

The brief flags `#mockopen` light at ~4.77:1. The button's text lives in child spans; measured on
`span.mbl-tail`, the band across all 12 states is **4.77 … 5.37** — bottoming out at **exactly 4.77
in data-storage / light**. The pipeline reproduced the known value independently from pixels, on a
**gradient** background where `getComputedStyle` returns nothing. It **passes** AA (4.77 ≥ 4.5), thinly.

---

## 4. Instrument integrity

### 4.0 The false positive this audit produced, and caught

The first contrast sweep reported the sidebar **"Focus" chip at 1.28:1** in dark theme (computed
colour `rgb(0,0,0)` — pure black on a dark background) across five rooms. It looked like a serious
bug. It was **my instrument corrupting the page.**

`forceTargetColor` restored by calling `removeProperty('color')`. The app sets that chip's colour
**inline via JS** — so the restore deleted *the app's own declaration*, and the chip fell back to a
stylesheet black. Every later state on that page object inherited the corruption.

A crop of the real render (`verify-sidebar-dark.png`) shows a perfectly legible rose pill, and an
independent computed-style path said **6.49:1**. A dedicated test (`mc-05-restore-test.mjs`) found
**exactly 1 of 118** targets failing to restore — the chip. Fixed by saving and replaying the original
inline declarations; the corrected sweep reports it at **5.06–6.49, pass**.

This is the exact failure mode that manufactured the previous six bogus ~3.1:1 failures, and it is why
`mc-03` now **asserts the force/restore cycle leaves the page byte-identical and aborts if it does
not** — printed as `[guard] … : YES` at the top of every run.

### 4.1 What each finding was confirmed with

| Finding | Pixel-decoded | Independent hand-computation | Looked at |
|---|---|---|---|
| F2 scoreboard fill | ✅ distance 551 → 0 | ✅ `background-color` forced to `rgb(255,255,255)` | ✅ `scoreboard-forced-pane.png` |
| F3 pomodoro | ✅ 1.96 | ✅ 1.97 | ✅ `verify-pomodoro-dark.png` |
| F4 pill zero-state | ✅ 2.51 | ✅ 2.57 | ✅ `verify-pill-zero-light.png` |
| F5 badge | ✅ 3.89 | ❌ **1.05 — hand method is wrong here** (walks past the gradient) | ✅ `verify-badge-light.png` |
| R1 landmine | ✅ 0 vs 26,028 px | ✅ computed opacity 0 vs 1 | ✅ `landmine-reduce.png` |
| ~~Focus chip 1.28~~ | ~~✅~~ | ❌ 6.49 | ✅ **legible → RETRACTED** |

Where the two methods disagree, the disagreement is itself the signal: on the **badge** the pixel
value is right and the computed-style value is nonsense (gradient); on the **Focus chip** the
computed-style value was right and the pixel value was my own artifact. Neither method alone is
sufficient, which is the point.

---

## 5. Fix list, cheapest first

1. **F3** — `.pomodoro-play`: don't fill with `--teal` in dark. Use the room solid (`--acc2`) or a
   dark-mode-specific fill with a ≥4.5 ink. *One declaration.*
2. **F5** — `.badge`: darken the gradient, or drop to a solid `--acc`-family fill that clears 4.5
   against white. Delete or fix the dead styles.css:394. *One declaration.*
3. **F4** — `.pill.z`: raise `opacity:.62` to ~`.78`, or de-emphasise with a lighter *ink* rather
   than a blanket opacity (opacity multiplies text and border alike). *One declaration.*
4. **F2** — add a `@media (forced-colors: active)` block to the **drill's shadow sheet** using
   `Highlight`/`HighlightText` + `forced-color-adjust: none` on `.pill.g:not(.z)` (snippet in §2).
5. **F1** — move the forced-colors and prefers-contrast rules for `.card/.dec/.rf/.piv/.thread/.dgm-s`
   into **BASE_SHEET**, beside the print and tap-floor rules that are already there for exactly this
   reason. Fix `.sub`'s specificity while you're in there.
6. **F7** — nudge three eyebrow colours ~2% darker.
7. **R1** — make the asymmetry impossible rather than documented: either add
   `animation-name: none !important` to BASE_SHEET's reduced-motion block (so both halves behave
   alike), or drop `*{animation:none}` from styles.css:260 in favour of the duration-zeroing already
   at styles.css:26 (so `forwards` fills land everywhere). Then add a painted-pixel assertion to
   `test/` — it is the only check that would have caught the original blank page, and it is the only
   one that will catch its return.
