# 2026-07-13 — Room-accent system: VERIFIED ALREADY SHIPPED (do not rebuild)

> Provenance: pixel-verified by a dedicated agent ("accent-rooms") dispatched to *build* accent
> threading off a stale brief; it correctly reported the premise dead instead of building. Its host
> process crashed before it could persist this record, so the orchestrator persisted its report
> verbatim-in-substance here. Independently disk-verified before acceptance (file/line claims below
> were each checked). Companion memory: `reference-2026-07-13-accent-rooms-verified.md`.

## Verdict
The topic-group "six rooms" accent system is **fully built, mature, contrast-solved and
test-guarded** at `compiler-parity @ 9555183`. The 2026-07-11 audit line that motivated the brief —
*"the 6 group colours render as a 7px dot and `--topic-accent` is never set"* — was **stale**: it
predates the wave that shipped the room system. **Any future brief citing the 07-11 audit for
visual state is suspect.** No net-new threading is warranted; the dispatched branch
(`vis/v-accent`) was closed as a deliberate no-op with zero commits.

Verified by RENDERING, not reading: 12 screenshots (6 groups × desktop 1280×800 + mobile 360×740),
zero page errors, each room's runtime `--acc` equal to its group ink. Teal (messaging) / raspberry
(security) / blue (data) / violet (platform) / amber (reliability) / magenta (architecture) render
as six clearly distinct rooms with one restrained treatment at both viewports.

## Where the system actually lives
- **`src/styles.css:177-203` — THE ROOM SYSTEM.** Per-`data-group` custom-property blocks:
  `--topic-ink / --topic-solid / --topic-wash / --topic-edge`, light + dark, hand-tuned per group.
  Line 203 rebinds the app-wide consumption aliases:
  `--acc:var(--topic-ink); --acc2:var(--topic-solid); --accbg:var(--topic-wash)` (+ `--accink` via
  `color-mix`).
- **`src/scripts/app/topic-protocol.js:76-82`** — `applyIdentity()` stamps `data-group` on `<html>`
  on every topic switch; `src/index.html` pre-stamps it so the FIRST paint is already a room.
- **`src/scripts/app/groups.js:8-15`** — the six Tailwind-600 group entries feed ONLY the 7px index
  dot. They are **not** the room look; the audit line was measuring the wrong palette.
- **The literal variable `--topic-accent` was never the mechanism.** Checks that read it and find
  it empty are measuring a name that was never wired; the live tokens are the four above.

## Consumption (why it can't be "unbuilt")
~688–690 `var(--acc*)` sites across 23 shadow-pane stylesheets (custom properties are the one CSS
mechanism that inherits through the shadow boundary). Surfaces confirmed in the shots: active
pane-tab rule + wash, reading-slab top rule + left edge, step/drill cards, primary CTA gradient
(Mock run / Reveal), companion-rail dot + "THE MOVE HERE" callout + spine dots, locator badge,
`:focus-visible` rings (`outline:2px solid var(--acc)` — styles.css:53/334/632). Mobile threads it
too (tab underline, CTA, slab edge). Body prose stays neutral grey.

## Design intent worth protecting
- **Security-tenancy is deliberately DEEP RASPBERRY (`ink #A73A57`), not Tailwind fire-engine red**
  — a saturated red primary CTA ("Reveal answer") reads as *destructive*. The stylesheet carries
  the full rationale in a comment (~styles.css:183+). Do not "restore" it to red.
- **Deliberately NEUTRAL surfaces (restraint decisions, not omissions):** the constant pane-name
  card ("Walkthrough · MECHANICS") and inactive nav tabs stay neutral — tinting a label identical
  in every room adds noise, no identity. **Do not "fix" these.**
- Calibration is "felt, not flood": if everything is accent, nothing is.

## Contract + guards (all verified present)
- Contrast (styles.css:132-135 documents the floors): ink/bg 5.89–6.07 light, 7.89–8.17 dark;
  on-slab/solid 5.18–5.23 light, 7.29–7.55 dark. Floors: ink/bg ≥ 4.5, on-slab ≥ 5.0.
- Guarded by `test/room_contrast.py` + `check_all.py` `room_contract`; the 6 rooms are pixel-keyed
  in `test/visual_regression.cjs` baselines (`room-<group>`).
- Risk checks clean: `prefers-reduced-motion` blocks are motion-only (no display/opacity kill — no
  blank-page regression); focus rings retint per room; forced-colors falls back to system
  Highlight.

## Evidence
- Shots: `_audit/shots/2026-07-13-rooms/` — 12 files, `desktop__<group>__<topic>.png` +
  `mobile__<group>__<topic>.png`, one topic per group. **Untracked on purpose** (repo bloat-guard);
  the matrix is trivially regenerable (boot app → set `data-group` per topic entry → screenshot at
  1280×800 and 360×740; the original generation script lived in the agent's session and was not
  preserved by name).
- Gate baseline: `_audit/2026-07-13-vfix-css/gate.txt` — committed full run `GATE: PASS` 30/30
  incl. `build_integrity`, `room_static`, `room_contrast`, `room_browser`, `visual_regression`
  (34 captures incl. the 6 rooms). Its tree was byte-identical to `9555183`.

## Standing decision (orchestrator, 2026-07-13)
**No intensity bump.** The calibration is contract-backed; revisit only if the independent sweep's
topic-identity lens or the operator's own eyes say the rooms don't read. Baseline for any future
change: the 12 shots above.
