# Visual audit -- 2026-07-08 (app tip fd017c7)

## Method
`tools/visual_audit.mjs` (permanent, rerunnable): boots the tracked
deliverable headlessly, enumerates routes and overlays at runtime (route
fallback = the shell.js tab map), captures every pane x 2 sample topics
(event-driven = legacy row, probabilistic-structures = newest), every
overlay it can open (button-text probes + shadow-piercing probes + key
probes), the topic-index dropdown, and a 390px mobile sample. 33 shots,
0 page errors. Judgment split: mechanical checks by model, aesthetic
judgment by human eyes on the contact sheets (outputs/audit_sheet_1..6.png).

## Coverage
- Panes: 9/9 (walk drill wb sys trade model num rf open) x 2 topics,
  + mid-scroll captures for the three long panes.
- Overlays: 7/7 opened and closed cleanly (mock-run and cram required
  shadow-DOM probes -- their triggers live inside pane shadow roots),
  + the topic-index overlay (an 8th, discovered by the tool when route
  #topicnav left it open and blocked clicks -- tool is now overlay-aware).
- Mobile 390x844: walk, drill, dropdown.

## Mechanical findings: 0 defects
- No blank/near-blank surface: every shot has rich content (50-89
  quantized color clusters; a blank page scores ~3).
- Routing real: all same-topic pane pairs differ pairwise (no stuck pane).
- Topic switching real: same pane across topics differs 18-31 percent.
- All overlays open, render content, and close via Escape.
- Zero pageerror events across the whole run.

## Model sight status (honesty note)
PNG viewing by the model was verified working twice earlier today
(described banner text, queue skew, layout -- matching mechanical
readouts) and then went dark mid-session, including on a previously
rendered file. Treat model still-sight as INTERMITTENT: mechanical
verification is the backbone; final visual judgment belongs to human
eyes. This is encoded in the workflow below.

## Human-eye checklist (Claude Code session, sheets or live app)
Per pane: spacing rhythm, heading hierarchy, code-block readability,
accent-color consistency with the topic's group, scroll comfort on the
three long panes. Overlays: dim/backdrop consistency, focus visibility,
close affordance discoverability (mock/cram triggers are inside panes --
consider surfacing them in a consistent spot). Mobile: tap-target size in
the dropdown, drill-card ergonomics. Dropdown: 46-topic list scanability.

## Pipeline verdict (the second audit question)
Before today: no reusable GPU pipeline -- the trainer pilot was hardwired
(mode 2 would be copy-paste). Now: src/framework/{loop,hud,flow}.js with a
mode contract (visual-trainer/FRAMEWORK.md); the kafka pilot is consumer
number one, re-verified byte-for-behavior by the 13-check harness after
the refactor. Remaining gap is intentional: new primitives (ring remap,
state-flow, trailing cursors, heat grid) are built only when their mode is
unlocked by pilot sign-off (law 5).

## Rerun
CHROME=<chromium> PLAYWRIGHT_BROWSERS_PATH=<dir> node tools/visual_audit.mjs
then the contact-sheet step in the session transcript, or view shots raw.

---

## Addendum: mobile polish pass (owner report, same day)

Owner-reported defects, root causes, and fixes -- all mechanically verified
by the hardened test/visual_pane_smoke.mjs (16 checks, both viewports):

1. App boots into the "home page" overlay. Root cause: a deliberate earlier
   decision (C1 in index-overlay.js) auto-opened the Topic Index on any
   hash-less load; the only escape was a 26x25px close glyph. Retired: boot
   lands in the app; the index is an intentional destination.
2. No Home affordance in the chrome. Added: a house-glyph Home button in the
   topic-nav row (both widths), wired to IndexOverlay.open().
3. Stray "Visualize" tab on every topic (regression from the visual-pipeline
   P0 commit). Root cause: the [hidden] attribute's UA display:none loses to
   any authored display rule -- .sidebar .seg button{display:flex} outranked
   the scoped fix too. Fix: the standard global guard
   [hidden]{display:none !important} at the end of the app layer, plus a
   page-wide smoke invariant (every [hidden] element must measure 0px) so
   this bug class cannot return. The original smoke asserted the attribute,
   not computed visibility -- a false-positive test, now corrected.
4. Sub-44px tap targets on mobile (topic steppers, index close, Home).
   Raised to a 44px floor at <=600px (WCAG 2.5.8 / platform HIGs).
