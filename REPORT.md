# Refactor Report — Monolith → Modular Source

This records how the single 324 KB `deepdive_content_pipeline_rehearsal.html`
file was refactored into the `src/` tree, and the verification at each step.

## Guarantee

Every step is **byte-identical**: `python3 build.py` reassembles `src/` into a
file that is byte-for-byte the same as the original deliverable
(`sha256 a0c25f46…`). The refactor moved zero bytes of the shipped output. This
was checked after every layer by rebuilding to a temp path and comparing the
hash, and the final result was additionally confirmed by a live browser render
(all 9 panes switch and render, overlays open, **zero JS errors**, no
horizontal overflow).

The build mechanism: include markers `<!--@build:include RELPATH-->` (RELPATH
relative to `src/`), resolved recursively on raw bytes — no transform. Splitting
a file and re-joining it through markers is therefore lossless by construction;
the per-block boundary assertions are what guarantee each partial is a complete
semantic unit, and the hash is the backstop against any byte drift.

## Starting point

```
deepdive_content_pipeline_rehearsal.html   324 KB, one file
  ├─ one <style>      ~105 KB CSS incl. a 30 KB inlined woff2
  ├─ two <script>     a 249-byte theme bootstrap + a 157 KB app (11 sections)
  └─ HTML body        9 pane scaffolds + 7 role="dialog" overlays
```

## Layers

| Tag | What was extracted | Result |
|---|---|---|
| `refactor-pilot` | first pane → `panes/sys.html`; created `build.py` | proved the mechanism |
| `refactor-full`  | CSS, both scripts, all 9 panes → partials | shell 324 KB → 34 KB |
| `layer-a-fonts`  | the `@font-face` block → `fonts.css` | `styles.css` is pure rules |
| `layer-b-overlays` | the 7 overlays → `overlays/*.html` | shell → 16 KB |
| `layer-c-appjs`  | `app.js` → 11 section files + readable index | logic navigable |
| `layer-d-drill`  | `drill.js` → `cards` / `speak-lines` / `logic` | 37 KB data isolated |
| `layer-e-content` | `model-answers`, `walkthrough`, `mock-run` → content/logic | content isolated |

`git checkout <tag>` restores the tree at any layer.

### The organizing principle: data/logic seams

The valuable split was isolating **editable content arrays** from **stable
behavior**, but only where a genuine seam exists:

- `drill.js` (53 KB) was 69% one `var cards=[…]` array → split.
- `model-answers.js` (21 KB) was 96% one `var modelAnswers=[…]` array → split.
- `mock-run.js` (22 KB) was ~85% two data arrays → split.
- `walkthrough.js` (12 KB) was ~88% one `var steps=[…]` array → split.

Sections without a dominant data array (`session-progress` 16 KB,
`numbers-nalsd` 11 KB, `mixed-fire` 11 KB, …) were **left whole** — they are
cohesive single features, and chopping them would be fragmentation, not
modularity. A flat list of question objects has no seam to split on either; it
stays as one data file.

## The CSS decision (deliberately not split)

`styles.css` (75 KB) was evaluated for a by-concern split and **kept as one
file**. Unlike the JS, it is authored chronologically (base → dark theme → a
long tail of dated polish), and its concerns are **interleaved**. Concretely:
of 94 dark-mode rules, 86 sit in the dark block but **8 are scattered at byte
offsets 59 869–74 580**, well past it. A `dark-theme.css` cut at the block
boundary would silently omit those eight — a file that misrepresents its own
contents. A *correct* by-concern split would require reordering rules, which is
not byte-identical and risks the cascade. So the principled call is a single,
honest, grep-able stylesheet rather than misleading partials.

## Final shape

```
324 KB monolith  →  16 KB shell + 40 partials  (41 source files)
```

- `index.html` 16 KB — skeleton + 19 include markers
- `styles.css` 75 KB + `fonts.css` 30 KB
- `scripts/boot.js` 0.2 KB + `scripts/app.js` index + 11 sections
  (4 of them further split into content/logic subdirs)
- `panes/` 9 files + `overlays/` 7 files

Editing now lands in a small, named file; the shipped artifact is regenerated,
byte-identical, by `python3 build.py`.

## Encoding standard and the gate (the invariant that replaces per-edit vigilance)

The same glyph used to be written three ways across the tree -- raw UTF-8 bytes,
`\u` escapes, and HTML entities -- with nothing enforcing a choice. That made every
edit carry a silent-corruption risk (a hyphen typed in place of an em-dash is
visually identical and slips past review), so each change needed a manual character
census. A census on every edit is a symptom of a missing invariant, not a workflow.

The fix is one enforced invariant: **source is ASCII-only.** No byte > 0x7F in any
`src/**/*.{js,css,html}` file. Glyphs are written as:

- **HTML entities** (`&mdash;`, `&rarr;`, ...) in markup contexts -- `.html` files and
  JS strings assigned to `innerHTML`. The browser decodes them; a typo renders as
  visible literal text (loud failure).
- **`\u` escapes** (`\u2014`, ...) in JS plain-text sinks -- `.textContent`, `.value`.
  The JS parser decodes them before assignment; a malformed escape is a parse error
  (loud failure).
- **never** as raw bytes -- the only representation that fails *silently*. Forbidden
  and machine-checked.

There is no single literal that works everywhere, because `innerHTML` and
`textContent` decode differently -- so the representation is context-dictated, but
both allowed forms are ASCII and both fail loudly. The enforced, global part is
"ASCII-only".

`tools/normalize_to_ascii.py` did the one-time migration (258 raw chars across 17
files, deterministically -- not by hand). `make check` enforces it from then on,
running five checks and blocking on any failure:

| check | enforces |
|---|---|
| `ascii_guard` | source is ASCII-only |
| `syntax_check` | every editable module parses (`node --check`; build-include aggregators skipped) |
| `build_integrity` | build resolves, rebuilt deliverable matches, 9 panes + 7 overlays present |
| `render` | panes/overlays render, no JS/reference errors, no horizontal overflow |
| `entity_leak` | no HTML entity reaches visible text (catches the `textContent` trap) |

The browser checks skip cleanly when Playwright/Chrome are absent, so `make check` is
CI-safe. This is not theoretical: on its first run the gate caught a real defect --
the `cmpNotes` coaching strings were entitized by the migration but are consumed via
`textContent`, so `&mdash;` would have shown up literally. They were switched to `\u`
escapes and the gate went green. Tooling finds the exceptions that per-edit vigilance
misses.

## Web components: pilot conversion (the sys pane)

Goal: encapsulate each pane/overlay as a custom element with its own shadow DOM,
so DOM, styles, and state are scoped instead of living in one global scope over a
flat document. This is a migration of the app's model, not a refactor, so it is
done incrementally from a proven pilot -- exactly like the source split
(`refactor-pilot` -> `refactor-full`).

The first pilot is the **system map** (`<deep-system-map>`), chosen because it is
genuinely isolated: it owns its data and reaches for nothing global. After the
conversion the only thing in the light DOM is `<deep-system-map>` inside the
`#sys` pane host; its markup, styles, and data all live in the shadow root. Gate
green; a direct check confirms 6 stages + 7 pivots render in the shadow, the theme
tokens flip through the boundary, and nothing leaks to the light DOM.

### The reusable recipe (per pane/overlay)

1. **Move markup + data + render logic into the element class**; build the shadow
   root once in `connectedCallback` and `innerHTML` the content into it. Data
   strings stay entity-encoded (they are innerHTML'd, so the ASCII standard holds).
2. **Move the pane's CSS into a `<style>` in the shadow.** Global CSS cannot reach
   into a shadow root, so any reused base class (here `.card`, `.step-t`) is carried
   in too. (Rollout optimization: once every pane is a component, the shared base
   rules move to one constructable stylesheet adopted by all shadows via
   `adoptedStyleSheets`, removing that duplication.)
3. **Theme through the boundary with CSS custom properties.** var()-based colors
   (`--acc`, `--surf`, `--mut`, ...) inherit into the shadow for free. Hardcoded
   colors that flip light/dark must be tokenized -- the sys pane needed five
   (`--sm-line`, `--sm-dot-bg`, `--sm-card-bg`, `--sm-pa-fg`, `--sm-here-fg`),
   defined on `:root` and `html[data-theme="dark"]`. No `:host-context` (no Firefox
   support); inherited custom properties work everywhere.
4. **Keep the `<div class="pane" id="X">` host in the light DOM** so `switchTab` and
   the build-integrity pane check keep working; the custom element sits inside.
5. **Remove the moved rules from `styles.css`** so the CSS is moved, not duplicated.
6. The **entity-leak gate now descends into shadow roots**, so componentized panes
   stay covered.

### The real cost is the shared-state coupling, not the DOM/CSS

The pilot was deliberately an isolated pane; most are not. The audit mapped the
coupling the rollout must untangle, because shadow DOM severs these global
reach-throughs and each must become an explicit public API (a method or event) on
the element:

- **`session-progress`** (the progress-report overlay) reads the **whiteboard's**
  `wblist` DOM node, its `wbSteps` data, and calls `wbReset` / `wbRerun` /
  `updCount`; it also reads the **drill** (`results` / `got` / `shk`, `drillWeak`)
  and **mixed-fire** (`mixLog` / `mxRes` / `mxGot` / `mxShk`) internals.
- **`mixed-fire`** reads the **trade-offs** pane via `getTrades`.
- **`numbers-nalsd`** defines the global nav (`switchTab` / `current`) the keyboard
  handler and `session-progress` call.

Rollout order: the isolated/presentational panes first (sys done; red-flags,
opener, model-answers convert mechanically), then the coupled panes (whiteboard,
drill, mock-run, mixed-fire, session-progress) where the public-API seam is designed
first, then the overlays (open/close wiring is their seam). Each conversion lands
gate-green before the next.
