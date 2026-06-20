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
