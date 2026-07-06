# CSS Design-System Audit — Open Props vs. Our Tokens

This document records, for every design-token category, the decision to use **Open Props**
or the app's **own** tokens — with a clear justification for every "ours." It is the
reference for *why* the CSS is built the way it is, and the roadmap for the remaining
systematization work.

Guiding rule (from the owner): wherever Open Props can *improve* the app, use it directly.
Wherever we keep our own, that choice must be justified here with evidence.

---

## Method

Each category was audited by comparing the app's existing tokens against Open Props'
equivalents, with byte-cost and render-identical verification for anything integrated.
The single-file / offline / shadow-DOM constraints hold throughout: tokens are the only
mechanism that pierces the shadow boundary app-wide, so every decision below is expressed
as CSS custom properties.

---

## Verdict at a glance

| Category | Decision | One-line reason |
|---|---|---|
| Spacing | **Ours** | Finer scale than Open Props (has 12/36/40/44px; OP jumps 8→16). Already tokenized. |
| Color | **Ours** (superior) | Dual-theme (dark+light) + P3 wide-gamut. OP is single-theme sRGB. |
| Shadow | **Ours** (superior) | Warm-tinted multi-layer, tuned to the palette. OP's are neutral/generic. |
| Radius | **Ours** | Already a systematic scale in the `@theme` layer. |
| Easings | **Both** | Ours drive existing motion + OP's 83 curves on tap (additive). |
| Gradients | **Open Props** (+ ours) | OP's 30 curated gradients on tap; our `--canvas` radial kept. |
| Animations | **Open Props** | OP's 26 keyframes on tap; app had ~none (pure addition). |
| Z-index | **Ours** — *systematize (TODO)* | OP's `--layer-1..5` too small for our overlay tiers. Ad-hoc today. |
| Typography | **Ours** — *systematize (TODO)* | No type tokens today; OP weights are 100-steps, ours are fine variable-font. |
| Durations | **Ours** — *minor (TODO)* | Ad-hoc fractional-second values; low-visibility debt. |
| Aspect-ratio | **N/A** | App uses none. |
| Border-width | **Ours** | Fine (1–3px); not ad-hoc. |
| Fonts (families) | **Ours** | The app's own type; variable font with fine weights. |

---

## Per-category detail

### 1. Spacing — OURS
The app ships a 62-value `--space-*` scale, fully tokenized, defined once in `:root` and
inherited across every shadow root. Open Props' size scale is `4 / 8 / 16 / 20 / 24 / 28 /
32 / 48px` — it **jumps 8→16 with no 12**, but the app clusters heavily at 9–14px, and its
scale includes 12/36/40/44 that Open Props lacks. Snapping the app onto Open Props' (or any
clean 4px) scale was measured at a **55.9% pixel shift** app-wide, because spacing cascades
through reflow. So ours is both **finer** and **lower-shift**. **Improvement available:** a
systematic rationalization of the 62 values into a clean scale is a *reversible one-file
token edit* (the 55.9% visualization) — kept as a dial, not applied, because it changes the
look and that is the owner's call.

### 2. Color — OURS (superior to Open Props)
Every color token carries **two values** (a dark-theme and a light-theme value), and the
accents are additionally **P3 wide-gamut** (`--acc-p3: color(display-p3 0.32 0.29 0.72)`).
Open Props' base palette is single-theme sRGB (its OKLCH variant is wide-gamut but is a
different palette entirely). Adopting Open Props colors would mean losing the app's identity
*and* downgrading theme + gamut support. **No improvement — ours is ahead.**

### 3. Shadow — OURS (superior to Open Props)
`--card-sh` is a **warm-tinted three-layer** shadow (`rgba(40,34,28,…)`) deliberately keyed
to the warm palette. Open Props' `--shadow-3` is a neutral five-layer *generic* shadow using
`hsl(var(--shadow-color)/…)`. Ours is tuned to the palette; adopting Open Props' would inject
a neutral cast that fights the warm surfaces. **No improvement.**

### 4. Radius — OURS
Radius is already a systematic scale, formalized in the Tailwind `@theme` layer (it had been
drifting 10/11/12px; that was resolved before this audit). **No improvement.**

### 5. Easings — BOTH
The app's own tuned easings drive existing motion. Open Props' **83** curves
(`--ease-1..5`, `--ease-in/out/in-out-*`, `--ease-elastic-*`, `--ease-spring-*`, `--ease-
squish-*`, `--ease-step-*`) are now **on tap** for new motion and variety. Additive, no
conflict — the app keeps what it has and gains the library.

### 6. Gradients — OPEN PROPS (+ ours)
Open Props' **30** hand-tuned gradients (`--gradient-1..30`) are now on tap for decorative
use. The app's bespoke `--canvas` radial background is kept. This is where Open Props clearly
wins (a curated gradient set is exactly the kind of asset that is tedious to hand-build).

### 7. Animations — OPEN PROPS
Open Props' **26** keyframe animations (`--animation-fade-in`, `--animation-float`,
`--animation-blink`, `--animation-bounce`, …) are on tap; the app previously had essentially
none, so this is a **pure capability addition**. Gradients + animations + easings together
cost **15.6 KB (0% of the single file)** and were verified **render-identical** — nothing
consumes them yet, so the current look is unchanged.

### 8. Z-index — OURS (systematize — TODO)
**The main structural debt.** There are **20 distinct ad-hoc z-index values** today
(`9999, 1202, 1201, 1200, 1100, 1000, 200, 150, 90, 60, 55, 50, 40, 25, 20, 5, 2, 1, 0, -1`)
— no system. **Why not Open Props:** its z-index scale is only `--layer-1..5` (values 1–5),
meant for *local* stacking; it cannot express the app's overlay/modal/toast tiers that live
at 1000–9999. So the fix is **ours**: a semantic scale
(`--z-base / --z-raised / --z-dropdown / --z-sticky / --z-overlay / --z-modal / --z-toast`).
Deferred, not skipped — it requires per-usage tier-mapping to avoid breaking stacking order,
so it is a careful pass, not a blind replace.

### 9. Typography — OURS (systematize — TODO)
**The largest ad-hoc area.** The app defines **no type tokens** — font-size, line-height and
weight are hard-coded per rule. Evidence: **40 distinct font-sizes** (including fine decimals
`11.7 / 12.2 / 12.3 / 12.7 / 12.8px`), **23 line-heights**, and **15 font-weights** — the
weights include variable-font values (`640 / 720 / 780`), which is *more* granular than Open
Props' 100-step weights (`--font-weight-1..8`). So, exactly like spacing, Open Props' generic
font scale is **too coarse** to adopt without a shift. Plan (ours): a tokenized type scale of
the app's own values (0% shift, same pattern proven on spacing), with an optional
rationalization into a clean modular scale as a *dial* — but the type scale is a design
decision, so it is called out for a deliberate pass rather than a mechanical one.

### 10. Durations — OURS (minor — TODO)
Transition durations are ad-hoc fractional-second values (`0.14 / 0.15 / 0.18 / 0.2 / 0.22 /
0.24 / 0.25 / 0.28 / 0.3s …`). Low-visibility debt. Open Props does not expose a clean
duration-token set in the bundle we use, so the fix (if pursued) is a small **ours** scale.
Low priority.

### 11. Aspect-ratio — N/A
The app uses no `aspect-ratio` declarations, so Open Props' `aspects` module is not needed.

### 12. Border-width — OURS
Border widths are 1–3px (thin, not ad-hoc); the single `999px` value is an intentional pill
radius. **No change.**

---

## Summary

- **Ours, and genuinely superior to Open Props:** color, shadow, spacing, radius. The app's
  design system is *more advanced than Open Props* in the areas that define its identity, so
  migrating these onto Open Props would be a **downgrade**. This is the core audit finding.
- **Open Props absorbed (additive, done):** gradients, animations, easings — the decorative
  flourish toolkit, on tap app-wide, 15.6 KB, zero look change.
- **Ad-hoc debt to systematize with *our own* tokens (Open Props does not fit):** z-index
  (its scale is too small), typography (its weights/sizes are too coarse), durations (minor).

The headline: this was not "the app is behind and Open Props fixes it." It was "the app is
ahead where it counts, Open Props fills the decorative gap, and two internal areas (z-index,
typography) still need their own systematic scales."

---

## Improvement roadmap

1. **[DONE]** Spacing tokenized — 62-value `--space-*` scale, pierces shadow DOM.
2. **[DONE]** Open Props flourish integrated — gradients / animations / easings on tap.
3. **[TODO]** Typography → tokenized type scale (largest remaining gap; design decision on the scale).
4. **[TODO]** Z-index → semantic scale (careful per-usage tier-mapping).
5. **[TODO — minor]** Durations → small systematic scale.
6. **[OPTIONAL / DIAL]** Spacing rationalization — the systematic-look snap (reversible; 55.9% shift shown).
7. **[LATER]** Open Props masks (decorative corner-cuts / edges) if wanted; then Iconify (SVG icons) + Satori (CSS→SVG panels).
