# Independent type-verifier evidence — PKG-B & PKG-D (visual-fix wave)

Produced by the **independent type-verifier** for the visual-fix wave close-out. Both verifications
returned **CLEAN, no-asterisk**; both packages merged.

- **PKG-B** (pane typography & reading measure) — verdict CLEAN → merged as `9809103`.
- **PKG-D** (mobile pane-strip scroll affordance + companion-rail B1 light-DOM lift + load-bearing
  pin guard) — verdict CLEAN → merged as `9608730` (final merge of the wave).

All instruments here are **my own** — built blind to the fixers' harnesses/shots. Every claim was
measured in a rendered browser (Playwright), with a negative control captured first to prove the
instrument reproduces the "before" disease before certifying the "after" cure.

---

## ⚠️ POLLUTION DISAMBIGUATION (read before filing any screenshot)

My instruments ran from a session-temp scratchpad whose `shots/` subdir was **already populated with
the fixers' proof screenshots** (co-located before I arrived — names like `d1440-*`, `m390-*`,
`HAND-*`, `MYBEFORE-*`/`MYAFTER-*`, `BEFORE-*`/`AFTER-*`, `FIXED-*`, `PREFIX-*`, `DIAG-*`).

**Only the 7 PNGs in `../shots/2026-07-13-typeverifier/` are mine** (produced by my own
`measure-d.js` and `focus-shot.js`). None of the fixers' shots were copied into this evidence set,
and none should ever be filed under this independent verification — that cross-attribution is exactly
the corruption this manifest exists to prevent. The fixers' files were left untouched in place; the
close-out handles fixer evidence separately.

---

## Triangulation artifacts (NOT copied — reproducible via `git show <sha>:deepdive_content_pipeline_rehearsal.html`)

30 MB of reproducible built HTML does not belong in the store. The exact artifacts I measured, by
commit SHA + byte size (byte size is the integrity check):

| Verification | Role | Commit | Bytes |
|---|---|---|---|
| PKG-B | cure (pkg-b) | `d1f6dd2` | 11,639,745 |
| PKG-B | negative control (trunk at verify time) | `aba793e` | 11,645,183 |
| PKG-D | cure (pkg-d) | `dadf736` | 11,642,847 |
| PKG-D | negative control (current trunk at verify time) | `dc20e91` | 11,649,422 |
| PKG-D | pristine base (isolates PKG-D on its unrebased branch) | `9555183` | 11,638,958 |

PKG-D used **three-artifact triangulation** (cure vs moved-trunk vs pristine-base) because `vis/pkg-d`
branched from `9555183` and was never rebased — so pkg-d-vs-trunk alone would carry PKG-A/B/C
light-DOM noise. Measuring the pristine base isolates PKG-D's changes exactly.

---

## Instruments (`.js`) and raw results (`.json`)

**Legend:** CORE = verdict-producing; DISCOVERY = exploratory (mapped structure/mechanism).

### PKG-B
| File | Kind | What it is |
|---|---|---|
| `discovery.js` | DISCOVERY | mapped the 9 shadow-DOM pane hosts + the 46-topic registry |
| `group-probe.js` | DISCOVERY | mapped 46 topics → 6 colour groups (for the ≥4-group sample) |
| `drill-debug.js` | DISCOVERY | worked out driving the drill reveal → debrief to expose gated selectors |
| `measure.js` | CORE | computed font-size across 6 topics × 3 viewports, all 9 panes + driven drill answer-stack (claims 1,2,4,5) |
| `analyze.js` | CORE | turns `measure.js` output into per-claim verdicts + the ch/measure table (claim 3) |
| `probe2.js` | CORE | whiteboard `dgm-*` labels with the pane ACTIVE + boxed-card widths (claim 3 cards) |
| `claim6.js` | CORE | 4,447-signature light-DOM boundary diff (claim 6) |
| `out-pkgb.json` / `out-trunk.json` | data | `measure.js` results — cure vs negative control |
| `c6-pkgb.json` / `c6-trunk.json` | data | `claim6.js` light-DOM signatures |
| `p2-pkgb.json` / `p2-trunk.json` | data | `probe2.js` whiteboard-label + card-width results |

### PKG-D
| File | Kind | What it is |
|---|---|---|
| `measure-d.js` | CORE | rail `.cmp-*` font-size + mobile scroll affordance (`--fl/--fr`, scrim widths, chevrons) + desktop-inert + a11y (claims 1,2,3) |
| `desktop-diff.js` | CORE | 1280 desktop light-DOM signature, classified deltas (claim 2) |
| `ancestor.js` | CORE | proved the stray 14px `<b>/<i>` desktop deltas all sit inside `.cmp-*` (nothing outside the rail) |
| `a11y-probe.js` | CORE | seg-button dimensions (44px targets; `viz` display:none) + focus-ring geometry |
| `focus-shot.js` | CORE | keyboard-focus an edge tab, capture geometry + `myfocus.png` |
| `d-pkgd.json` / `d-trunk.json` / `d-base.json` | data | `measure-d.js` across the three triangulation artifacts |
| `dd-pkgd.json` / `dd-trunk.json` / `dd-base.json` | data | `desktop-diff.js` across the three |

## Screenshots — `../shots/2026-07-13-typeverifier/` (UNTRACKED, local-only)

Per the repo bloat-guard, PNGs stay local-only (not committed). The 7 that are mine:
- `pkgd-strip-{light,dark}-{start,mid,end}.png` — the mobile `.seg` strip at each scroll state, both
  themes: start = right chevron only, mid = both, end = left only (claim 1 visual proof).
- `myfocus.png` — a keyboard-focused edge tab; focus scrolls it to centre, 2px ring fully visible,
  clear of both edge scrims (claim 1 a11y: focus rings unobscured).

## Provenance / hazard
This evidence originated in **session temp** (`…/bfc4e186-…/scratchpad/`) and was swept here at
close-out before that temp is reaped. That session-temp ephemerality is the named hazard on the
close-out task; this directory is the durable copy.
