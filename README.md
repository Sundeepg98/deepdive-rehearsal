# Deep-Dive Content-Pipeline Rehearsal

A self-contained, **offline**, single-file interview-rehearsal trainer for the
content-pipeline / distributed-systems design loop (S3 ingest → strategy-map
dispatch → streaming hash + upload → idempotent import → exactly-once effect).
Nine practice surfaces, seven overlays, in-browser scoring and a portable
progress code — no server, no build step required to *use* it, no network.

## Quick start

Just open the file:

```
open deepdive_content_pipeline_rehearsal.html      # macOS
xdg-open deepdive_content_pipeline_rehearsal.html  # Linux
# …or double-click it. It runs from file:// with zero dependencies.
```

Fonts and icons are base64-inlined; there is nothing to install and nothing to
fetch. It works on a plane.

## What's inside

| Surface | What it drills |
|---|---|
| **Walkthrough** | the 9-step canonical pipeline, narrated |
| **Drill** | active-recall flashcards (SDE2 → Staff), self-scored |
| **Whiteboard** | blank-slate recall with a verdict checklist |
| **System map** | the pipeline diagram + per-stage pivots |
| **Trade-offs** | the decisions and their alternatives |
| **Model answers** | full reference answers |
| **Numbers / NALSD** | back-of-envelope estimation drills |
| **Red flags** | the anti-patterns that fail the loop |
| **Opener / altitude** | how to open the round and set scope |

Overlays: cram sheet · scope-it-first · game plan · keyboard shortcuts ·
mock run · mixed fire · session tracker (with a copy/compare/export progress
code — no `localStorage`, fully portable).

## Architecture

The shipped file is a **build artifact**. The source of truth is `src/`, a tree
of partials assembled by a tiny, zero-dependency Python script:

```
src/  ──python3 build.py──▶  deepdive_content_pipeline_rehearsal.html
```

`build.py` resolves include markers of the form

```html
<!--@build:include RELPATH-->
```

where `RELPATH` is **relative to `src/`**, recursively (a partial may include
further partials), operating on raw **bytes** — the output is a byte-for-byte
concatenation with no transform, minification, or re-encoding. That property is
what lets the refactor be verified: the assembled file is provably identical to
the hand-authored original.

### Source layout

```
src/
  index.html                     34-line shell: skeleton + 19 include markers
  styles.css                     all CSS rules  (one honest cascade — see note)
  fonts.css                      the woff2 @font-face (29 KB base64), isolated
  scripts/
    boot.js                      pre-paint dark-mode bootstrap (avoids flash)
    app.js                       readable 11-line index of the app sections
    app/
      walkthrough.js             ├─ index → steps · logic
      walkthrough/steps.js       │    the 9-step content array
      walkthrough/logic.js       │    step navigation
      drill.js                   ├─ index → cards · speak-lines · logic
      drill/cards.js             │    the drill question bank (37 KB data)
      drill/speak-lines.js       │    TTS lines
      drill/logic.js             │    scoring / nav / timer
      model-answers.js           ├─ index → answers · logic
      model-answers/answers.js   │    model-answer content (20 KB data)
      model-answers/logic.js     │    render
      mock-run.js                ├─ index → data · logic
      mock-run/data.js           │    beats + curveball pool (20 KB data)
      mock-run/logic.js          │    run behavior
      whiteboard.js  system-map.js  mixed-fire.js  numbers-nalsd.js
      session-progress.js  cram-sheet.js  opener-altitude.js   (single-file)
  panes/      *.html             the 9 pane scaffolds (content rendered by JS)
  overlays/   *.html             the 7 dialog overlays
```

The **data/logic split** is the organizing principle: wherever a section is
dominated by an editable content array (drill cards, model answers, mock beats,
walkthrough steps), that array lives in its own file, separated from the stable
behavior. Sections that are cohesive logic are left whole — splitting them
would be fragmentation, not modularity.

### Editing guide

| To change… | Edit… |
|---|---|
| a drill question | `src/scripts/app/drill/cards.js` |
| a model answer | `src/scripts/app/model-answers/answers.js` |
| the walkthrough steps | `src/scripts/app/walkthrough/steps.js` |
| mock-run beats | `src/scripts/app/mock-run/data.js` |
| any styling | `src/styles.css` |
| an overlay's content | `src/overlays/<name>.html` |
| page structure | `src/index.html` |

Then rebuild:

```
python3 build.py                 # → deepdive_content_pipeline_rehearsal.html
python3 build.py out.html        # → a custom path
```

## Development

```
make build        # assemble src/ -> the deliverable
make check        # dependency-free integrity check (rebuild + verify, no browser)
make test-render  # functional browser test (needs: npm i playwright && npx playwright install chromium)
```

`make check` rebuilds the source and asserts the output is **byte-identical to
the committed deliverable** (so source and shipped file never drift), that no
include markers are left unresolved, and that the 9 panes + 7 overlays are
present. `make test-render` loads the built file in a real browser and confirms
every pane switches, every overlay exists, and there are no JS errors or
horizontal overflow.

## Design notes

- **Standalone & offline is a hard constraint.** Fonts/icons are inlined; no
  CDN, no fetch, no `localStorage`. State is in-memory; progress exports as a
  portable text code.
- **Light + dark** via a `data-theme` attribute, set pre-paint by `boot.js`.
- **Code samples use Courier New 10pt**, not Consolas — a kerning bug in some
  PowerPoint/preview engines makes Consolas misrender; Courier is safe.
- **The CSS is one cascade by design.** It is organized chronologically (base →
  dark theme → iterative polish) and its concerns are interleaved — e.g. dark
  rules appear both in the dark block and scattered through later refinements.
  Splitting it into `dark-theme.css` / `layout.css` / … would create files that
  misrepresent their contents and risk the cascade order, so it is kept as a
  single, grep-able stylesheet. (See `REPORT.md`.)

## License

MIT — see `LICENSE`.
