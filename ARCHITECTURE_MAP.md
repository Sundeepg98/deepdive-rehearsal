# Content Pipeline Deep-Dive — Component Architecture Map

## Overview
- **14 Web Components** using Shadow DOM
- **4 shared CSSStyleSheet objects** (constructable stylesheets)
- **Light DOM CSS** for page chrome, overlays, companion panel
- **31 JS source files** in `src/scripts/`

---

## 14 Web Components (Shadow DOM)

| # | Custom Element | Class | File | Uses Sheets | disconnectedCallback |
|---|---------------|-------|------|-------------|---------------------|
| 1 | `<deep-walkthrough>` | DeepWalkthrough | walkthrough/logic.js | BASE + WALK | No |
| 2 | `<deep-drill>` | DeepDrill | drill/logic.js | BASE + DRILL | **Yes** (timer cleanup) |
| 3 | `<deep-whiteboard>` | DeepWhiteboard | whiteboard.js | BASE + MISC | No |
| 4 | `<deep-system-map>` | DeepSystemMap | system-map.js | BASE + MISC | No |
| 5 | `<deep-trade-offs>` | DeepTradeOffs | trade-offs.js | BASE + MISC | No |
| 6 | `<deep-model-answers>` | DeepModelAnswers | model-answers/logic.js | BASE + MISC | No |
| 7 | `<deep-numbers>` | DeepNumbers | numbers-nalsd.js | BASE + MISC | No |
| 8 | `<deep-red-flags>` | DeepRedFlags | red-flags.js | BASE + MISC | No |
| 9 | `<deep-opener>` | DeepOpener | opener-altitude.js | BASE + MISC | No |
| 10 | `<deep-mock-run>` | DeepMockRun | mock-run/logic.js | BASE + MISC | No |
| 11 | `<deep-cram>` | DeepCram | cram-overlay.js | BASE + CS | **Yes** (IO cleanup) |
| 12 | `<deep-session>` | DeepSession | session-progress.js | CONTENT | No |
| 13 | `<deep-gameplan>` | DeepGameplan | gameplan-overlay.js | BASE + MISC | No |
| 14 | `<deep-scope>` | DeepScope | scope-overlay.js | BASE + MISC | No |

---

## 4 Shared CSSStyleSheet Objects

| Sheet | Defined In | Used By | Contents |
|-------|-----------|---------|----------|
| **BASE_SHEET** | base-styles.js | All 14 components | Card styles, push button, judge buttons, pills, dots, typography, code blocks, card spotlight, 3D tilt |
| **WALK_STYLE** | walkthrough/logic.js | walkthrough only | Step card, flow chips, arc grid, dots, nav buttons |
| **DRILL_STYLE** | drill/logic.js | drill only | Score pills, dn-step cards, progress bar, timer, tier badge |
| **CS_SHEET** | content-sheet.js | cram only | Cram-specific typography |
| **MISC_SHEET** | shared-sheets.js | ~10 components | Push button, judge, score ring, threads, keyboard hints |
| **CONTENT_SHEET** | session-progress.js | session only | Session UI + **companion styles (leaked to shadow)** |

---

## Light DOM CSS (`styles.css`)

### Structural
- `.app` — main flex container
- `.stage` — content area with perspective
- `.sidebar` — left navigation
- `.companion` — right coaching panel (desktop 1280px+)

### Navigation
- `.seg button` — tab buttons with accent bar
- `.tools-fab` — floating tools button
- `.mockbar` — bottom tool bar

### Overlays
- `.cram-ov`, `.cram-panel`, `.cram-body` — cram sheet
- `.mock-ov`, `.mock-panel` — mock run, session, mixed-fire
- `.cram-top`, `.mock-top` — overlay headers

### Animation
- `bodyIn`, `panein`, `railin`, `ovbg`, `ovpan` — entrance animations
- `meshA`, `meshB` — mesh gradient drift
- `dotActivePulse`, `cardStagger` — micro-animations

---

## Style Domain Classification

### MUST be in Light DOM CSS
| Class | Status | Notes |
|-------|--------|-------|
| `.cmp-*` (companion) | ✅ Fixed | Was in session-progress.js shadow |
| `.cram-ov`, `.cram-panel` | ✅ OK | Overlay containers are light DOM |
| `.mock-ov`, `.mock-panel` | ✅ OK | Overlay containers are light DOM |
| `.seg button` | ✅ OK | Navigation is light DOM |
| `.stage`, `.sidebar` | ✅ OK | Page structure |

### MUST be in Shadow DOM sheets
| Class | Status | Notes |
|-------|--------|-------|
| `.card` | ✅ OK | Used in shadow only (walkthrough, drill) |
| `.push` | ✅ OK | Shadow only |
| `.judge`, `.got`, `.shk` | ✅ OK | Shadow only |
| `.pill`, `.dn-step` | ✅ OK | Shadow only |
| `.arc-step`, `.fb` | ✅ OK | Shadow only |

### Cross-Domain (used in both)
| Class | Status | Notes |
|-------|--------|-------|
| `.card` | ⚠️ In both | Light: system-map cards; Shadow: walkthrough/drill cards |
| `.dots` | ⚠️ In both | Light: dot indicators; Shadow: walkthrough dots |

---

## Identified Bug History

### Bug 1: Companion panel unstyled
- **Root cause**: `.cmp-*` styles defined in `session-progress.js` (shadow DOM) but companion panel is in `index.html` (light DOM)
- **Fix**: Moved all `.cmp-*` styles to `styles.css`
- **Verification**: All 14 companion classes now in light CSS ✅

### Bug 2: File truncation (drill/logic.js)
- **Root cause**: `edit_file` matched string inside file and corrupted ending
- **Effect**: `class DeepDrill` not closed, `customElements.define()` missing → ALL JS broke
- **Fix**: Restored proper file ending
- **Prevention**: `test/file_integrity.py` now checks all 31 JS files

### Bug 3: Overlay content not scrolling
- **Root cause**: `.cram-panel` had `overflow: hidden` with no internal scroll
- **Effect**: Cram sheet content cut off at viewport bottom
- **Fix**: Added `overflow-y: auto` + `max-height` to cram-body and mock-panel

---

## 31 JS Source Files

```
src/scripts/
├── boot.js                          (theme switching)
├── app.js                           (app initialization)
└── app/
    ├── base-styles.js               (BASE_SHEET + initCardSpotlight)
    ├── shared-sheets.js             (MISC_SHEET + PUSH_SHEET)
    ├── content-sheet.js             (CS_SHEET)
    ├── cram-sheet.js                (light DOM cram overlay logic)
    ├── cram-overlay.js              (DeepCram component)
    ├── drill.js                     (drill pane wrapper)
    ├── drill/
    │   ├── cards.js                 (20 drill cards data)
    │   ├── logic.js                 (DeepDrill component)
    │   └── speak-lines.js           (drill narration)
    ├── gameplan-overlay.js          (DeepGameplan component)
    ├── keyboard-overlay.js          (DeepKeyboard component)
    ├── mixed-fire.js                (DeepMixedFire component)
    ├── mock-run.js                  (mock run pane wrapper)
    ├── mock-run/
    │   ├── data.js                  (mock run data + globals)
    │   └── logic.js                 (DeepMockRun component)
    ├── model-answers.js             (model answers pane wrapper)
    ├── model-answers/
    │   ├── answers.js               (9 model answer scripts)
    │   └── logic.js                 (DeepModelAnswers component)
    ├── numbers-nalsd.js             (DeepNumbers component)
    ├── opener-altitude.js           (DeepOpener component)
    ├── red-flags.js                 (DeepRedFlags component)
    ├── scope-overlay.js             (DeepScope component)
    ├── session-progress.js          (DeepSession + CONTENT_SHEET)
    ├── system-map.js                (DeepSystemMap component)
    ├── trade-offs.js                (DeepTradeOffs component)
    ├── walkthrough.js               (walkthrough pane wrapper)
    ├── walkthrough/
    │   ├── logic.js                 (DeepWalkthrough + WALK_STYLE)
    │   └── steps.js                 (9 walkthrough steps data)
    └── whiteboard.js                (DeepWhiteboard component)
```
