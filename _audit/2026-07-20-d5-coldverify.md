# D5-mobile — cold-verify verdict (2026-07-20)

**Verifier:** d5-verifier (cold; shares no context with d5-fixer).
**Subject:** `feat/d5-mobile-dock` @ **b6ad193e8d5c8cf8b333d69accdac2b724067a15**, worktree
`D:/claude-workspace/_worktrees/deepdive-rehearsal/d5-mobile`. The re-frozen D5-mobile wave
(chip `69c108a` + freeze `52bed79` → merged master D4 `077d91c` as `c73d4f6` → re-freeze addendum
`b6ad193`). Merges **second** in the train (D4 → **D5** → D2 → D3); this verdict gates it.
**Claims under test:** `_audit/2026-07-20-d5-mobile.md` (freeze + re-freeze addendum), against the
D4 state certified in `_audit/2026-07-20-d4-coldverify.md`.

## VERDICT: **CLEAN — merge-ready.** No BLOCKING findings.

Three non-blocking notes, all about verification process / coverage, none about shipped behaviour.
Every claim in the freeze report and the merge-down addendum reproduced independently. The seam
(two independently-verified waves merged) survived on both sides, verified firsthand at both
viewports and from both directions of a negative control.

---

## 1. Independent full gate on the frozen tip — PASS (STRONG build_integrity)

Cold from the frozen tip, build first, verdict read from capture files (never a piped exit code).
Ran as a background foreground-equivalent; while it ran I did ONLY zero-load static work (file
reads, git, node file-writes) and NO browser work, so nothing of mine competed for the paint window
that produces `dock_contrast`'s known flake.

| | |
|---|---|
| `npm run build` | exit **0**, `dist/index.html → deepdive_content_pipeline_rehearsal.html (11759647 bytes)` — `01-build.txt` |
| git status after MY build | **empty (clean)** — `02-status-after-build.txt` |
| `python3 test/check_all.py` | **GATE: PASS**, exit **0** — `03-gate.txt` |
| checks | **51 named checks, 51 PASS, 0 FAIL, 0 SKIP** |
| git status after gate | **empty (clean)** — `04-status-after-gate.txt` |

**`build_integrity` reported the STRONG form:**

> `BUILD INTEGRITY: PASS (11759647 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)`

The empty pre/post-build status means the strong form ran on a genuinely clean tree, and my second
cold build byte-reproduced the committed deliverable. **Independently corroborated by blob hash:**
`git hash-object deepdive_content_pipeline_rehearsal.html` = `bb5f1fa0bd4ea364bb63813ac5225b2fde9a47c6`
= `HEAD:deepdive_content_pipeline_rehearsal.html`. My build is **blob-identical** to the committed
deliverable — the committed source byte-reproduces the committed deliverable on a cold, independent
build.

The **51** count is clean (D4's `flow_a11y` + `dock_contrast` + D5's `mobile_nextup`, on top of the
base 48). No SKIPs → Chromium present, every browser check ran. Gate wall time ~10.7 min; **zero
flakes, no retry-into-green** — `dock_contrast`'s self-test tripped on the first pass. The box showed
no load artifacts in my run.

Gate greens most load-bearing to this wave: `mobile_nextup` PASS · `flow_a11y` PASS (6 assertions) ·
`dock_contrast` PASS (18 glyph-runs × room, **self-test tripped**) · `visual_regression` PASS (16
baselines match committed pixels) · `click_drift` PASS (118 assertions, **all three probes re-armed
against a planted defect this run**) · `no_dead_ends` PASS · `transition_deadzone` PASS (39) ·
`flow_contract` PASS.

---

## 2. Instruments, and their demonstrated negative controls

I refused to trust the fixer's numbers OR my own instruments until each was shown to fail on a known
defect. All instruments live **outside the repo** (`D:/claude-workspace/_verify-d5/`) so an untracked
file never dirties the tree / downgrades `build_integrity`. No source edit; no commit; no `git
stash`; no `npm install/ci` against the junctioned `node_modules`.

**(a) External plants against a deliverable COPY.** The built deliverable inlines the source JS
**unminified** (`function flowDockMobile(dm, n) {`, `dockAnnounce(rec.kicker, rec.btn)`, the nowrap
rule, `--dock-bg:var(--accbg)` all appear verbatim), so a surgical text edit on a copy reproduces a
real source regression faithfully with no rebuild and no tree-dirtying. Control copy (`deliv-base`)
passed `mobile_nextup` and `flow_a11y` identically to the gate — the plant baseline is sound.

**(b) `git` blob identity** for the VR claim (§7) — byte-exact, tolerance-free, deterministic.

**(c) Self-tested live-region recorder** (§4). My FIRST firsthand recorder had a document-start
`observe(document.documentElement)` bug and returned `[]` everywhere — which `flow_a11y` (proving the
CTA *is* announced) immediately contradicted. I caught it, rebuilt the recorder with a per-run
**self-test** (plant a token into a live region, assert it is caught → `true (teeth OK)` on every
config), and re-verified. A later `[]` for the armed legend is therefore **real silence, not a dead
probe.** (This is the "every fresh instrument has a first-attempt bug" tax, paid and closed.)

---

## 3. Negative controls — every plant watched RED

| plant (external, on a deliverable copy) | check | result |
|---|---|---|
| remove the mock-label `nowrap` (`white-space:nowrap`→`normal`) | `mobile_nextup` | **RED — `[360] bottom bar is ONE row (<=80px)` + `[360] bar height IDENTICAL shown vs hidden`.** Only 360 (390 has room), exactly as the freeze report measured. |
| hide the chip (inject `#ndm{display:none!important}`) | `mobile_nextup` | **RED — `chip shown on meso` + `clears 44px floor` + `reachable` + `real tap navigates`, at BOTH 360 and 390.** The chip probes are not tautologies. |
| neuter the single `dockAnnounce(rec.kicker, rec.btn)` call | `flow_a11y` | **RED — ONLY `#18a`**, diagnostic `Regions: ["Walkthrough"]` — verbatim the D4 verifier's documented pre-fix state. Other 5 assertions stay green (clean isolation). |

The `flow_a11y` plant is the seam's decisive test: it proves **#18a still has teeth on the merged
tree** after the merge folded `dockAnnounce` into `flowDockDesktop`.

**Inherited D4 checks still have teeth on the merged tree** (their per-run self-tests ran in MY gate):
`dock_contrast`'s self-test tripped (planted light `#ndock` bg drops the digit below the 5.0 floor,
or it aborts); `flow_a11y` #18b's self-test passed (a planted armed-legend leak is detected, so
"legend silent" cannot go inert). `mobile_nextup`'s third plant (shrink grade buttons → `<44`) is an
inline self-test that ran and passed in my gate — it lives in the drill shadow root, unreachable by
an HTML-head injection, so I relied on the inline mechanism (a genuine negative control) rather than
an external plant (see N3).

---

## 4. The seam (charter item 3) — both sides survived, firsthand

Both viewports driven firsthand on the built deliverable.

**(a) DESKTOP dock (1280×900, dark) == D4's certified state.** Measured live:
- background `linear-gradient(rgb(26,25,33), rgb(21,20,25))` = `--panel` (flat recessed) — the exact
  value the D4 verifier certified.
- border `rgb(55,51,63)` = `--bd` (neutral, not accent).
- CTA "Back to the drill →" `rgb(236,234,228)` = `--ink`; kicker "Keep going" = `--accink` (accent).
- CTA **announced once** to the dedicated body-level `[data-nd-live]` region; at the judgment point
  the armed legend renders in the dock DOM but **leaks to zero live regions**. D4 #18 intact.

**(b) MOBILE chip (360 & 390, both themes) == D5's original certified state:**
- `#ndock` computed `display:none` <920px (dock unpainted); chip `#ndm` shown on meso, 124×44
  (offsetHeight 44, clears the floor), hit-test `reaches:true`.
- micro (mid-drill): chip `hidden=true`, `tier=micro`.
- real `page.mouse.click` at the chip centre → active tab becomes `drill` (= `nextUp().rec.tab`) —
  `flowGo` fires.
- overflowX = 0; bar one row; `barShown == barChipHidden` (72/72 light, 74/74 dark, 72/72 @390) —
  the chip adds no height; mock + Tools both `reaches:true`.

**No double-announce:** exactly **one** `nd-live` message per CTA on every viewport — `flowDockMobile`
never calls `dockAnnounce`; only `flowDockDesktop` does, de-duped. Verified structurally (source) and
behaviourally (recorder). `mobile_nextup`'s "zero console/page errors" passing confirms `dockAnnounce`
does not throw on mobile.

---

## 5. The mobile announce claim (charter item 4) — firsthand, self-tested instrument

At ≤919px where `#ndock` is `display:none`:
- the body-level `[data-nd-live]` region **receives the next-step** — `"Keep going: Back to the
  drill"` — on both 360/light and 390/dark, so AT hears the same next-step on mobile even though the
  dock is not painted (`flowDockDesktop` runs on mobile too; `dockAnnounce` writes to a region
  independent of the `display:none` dock).
- the chip's `aria-label` is present and truthful: **`"Keep going — Back to the drill"`** — contains
  the visible kicker (WCAG 2.5.3 Label in Name) and the full action.
- the **armed legend leaks to NO region on either viewport** (0 at desktop AND mobile judgment) — the
  region holds only the last CTA (de-duped), never the armed legend.

Recorder self-test = `true (teeth OK)` on every config, so the `0` leaks are real silence.

---

## 6. Merge-condition table (charter item 5) — all six hold

| Condition | Result | Evidence |
|---|---|---|
| 360/390 zero horizontal overflow | **PASS** | firsthand `overflowX=0` at 360/390 both themes (meso + micro); gate `mobile_nextup` |
| FAB / tools reachable with the chip present | **PASS** | firsthand mock+tools `reaches:true`; gate `mobile_nextup` |
| shipped FAB-fix not regressed (scroll-top not intercepting the mock CTA) | **PASS** | firsthand mock `reaches:true` (hit-test lands on the mock, not an overlay); gate `no_dead_ends` |
| click_drift clean | **PASS** | gate `click_drift` (118 assertions, probes re-armed) |
| transition_deadzone clean | **PASS** | gate `transition_deadzone` (39 assertions) |
| 44px floors (chip ≥44, grade buttons, mock/tools) | **PASS** | firsthand chip offH=44; gate `mobile_nextup` grade buttons ≥44 @360/390; `.tools-fab{min-height:44px}` |

---

## 7. Token decision (charter item 6) — behavioural + visual, and VR by hash

**The chip is NOT a second accent element.** Measured at 360, both themes:
- chip background == `--card` (light `rgb(255,255,255)`, dark `rgb(30,28,37)`); **≠ `--accbg`** the
  accent wash. Border == `--bd`. Kicker == `--accink`; arrow == `--acc`. Accent confined to text+arrow.
- Tools FAB background == `--accbg` (wash) + border == `--acc` — so the chip (neutral surface) is
  visually distinct from the accent-outlined Tools FAB. Screenshots confirm it: `chip-360-light-bar.png`,
  `chip-360-dark-bar.png` (Mock run = the one filled loud primary; "Keep going →" = neutral pill,
  hairline border, accent text only; Tools = accent-bordered).

**The rationale's premise is true:** **light `--dock-bg` == `--accbg`** (both `rgb(236,249,247)`, an
accent wash) and **≠ `--card`**. Had the chip adopted `--dock-bg`, in light it would have carried the
same accent-wash background as the adjacent Tools FAB. Staying `--card` is the correct pick for the
chip's container.

**VR claims by hash (charter item 7) — CONFIRMED byte-exact** (git blob SHAs across master `077d91c`,
pre-merge freeze `52bed79`, HEAD `b6ad193`):

| set | vs master `077d91c` | vs freeze `52bed79` | reading |
|---|---|---|---|
| `m-walk-light`, `m-walk-dark` (2 mobile) | **DIFF** | **IDENTICAL** | the 0-delta re-cert holds: merge-down moved zero mobile pixels; DIFF-from-master is the intended chip regeneration |
| all 14 desktop baselines | **IDENTICAL** (14/14) | 12 DIFF, 4 same | zero desktop pixels moved by D5; the 12 that differ from freeze are D4's regenerated set the merge inherited (freeze predates D4), the 4 (home×2, drill×2) are D4's byte-untouched set |

Every hash relationship is fully explained by the known history; no drift to investigate. Gate
`visual_regression` PASS independently confirms the live render matches these committed baselines.

---

## Findings

### BLOCKING — none.

### N1 (non-blocking, process) — my first firsthand instrument had a first-attempt bug, caught and closed
`verify-firsthand.cjs`'s live-region recorder called `observe(document.documentElement)` at
document-start (null then) and silently returned `[]`. `flow_a11y` contradicted it; I rebuilt with a
self-tested recorder (`verify-announce.cjs`) and re-verified item 4 clean. No product impact — recorded
only so the `[]` in `firsthand.txt`'s live-region lines is not later mistaken for evidence of silence
(the authoritative announce evidence is `announce.txt`, self-test = teeth OK).

### N2 (non-blocking, cosmetic) — the mobile bar height is theme-dependent by 2px
`barShown` is 72px in light and 74px in dark at 360. The gate-enforced invariant is *shown == hidden
within a theme* (holds: 72/72, 74/74) and *≤ 80* (holds), so this is conformant; the 2px is a
theme border/padding rounding difference, unrelated to the chip. Noted only so nobody re-derives it
as a regression.

### N3 (non-blocking, coverage) — plant 3 (grade-button shrink) is covered by the inline self-test, not an external plant
The grade buttons live in the drill shadow root, unreachable by an HTML-head style injection, so I
could not build an external deliverable-copy plant for them as I did for the chip/nowrap. The check's
inline plant 3 (shrink → `<44` detected) is a genuine negative control and ran/passed in my
independent gate; the positive floor (`≥44` @360/390) also passed. Adequate; noted for symmetry with
the two externally-planted probes.

### Inherited from D4 (not this wave's to fix)
The dark **desktop** dock still has exactly one pixel baseline (`walk-dark`) — the D4 verifier's N5.
D5 does not regress it (the mobile chip's dark baseline `m-walk-dark` renders the dock `display:none`),
and I add a firsthand dark-dock measurement (§4a) beyond that single baseline; `dock_contrast` covers
6 rooms in dark. No action for D5.

---

## Scar-tissue compliance

No source edit survives (every plant was a copy outside the repo; the worktree was never touched);
no commit, no push, no merge; no `git stash`; no `npm install/ci` against the junctioned
`node_modules`; instruments live outside the repo; every verdict read from a capture file, never a
piped exit code; every new/extended assertion watched RED (external plants) or self-tested (inline).
Final state re-verified: **HEAD `b6ad193…`, `git status` empty, deliverable blob == HEAD, no stray
`_TEAM_LEAD_*.md`.** Browser cleanup: no image-wide `chrome` taskkill — every browser I launched was
closed by its own script (all runs exited 0); 15 chromium PIDs remain but d2/d3/w3 builders are
active and I cannot attribute them, so I left them.

## Evidence pins

All under `D:/claude-workspace/_verify-d5/`:
`00-tip.txt` · `01-build.txt` · `02-status-after-build.txt` · `03-gate.txt` · `04-status-after-gate.txt`
· `run-gate.sh` · `make-plants.cjs`, `deliv-base.html`, `plant-nowrap.html`, `plant-hidechip.html`,
`plant-noannounce.html` · `nc-base.txt`, `nc-nowrap.txt`, `nc-hidechip.txt` (mobile_nextup control+plants)
· `fa-base.txt`, `fa-noannounce.txt` (flow_a11y control+plant) · `verify-firsthand.cjs`, `firsthand.txt`
(items 3/6, live-region lines superseded by ↓) · `verify-announce.cjs`, `announce.txt` (item 4,
self-tested) · `shots/chip-360-light-bar.png`, `shots/chip-360-dark-bar.png`, `shots/chip-390-light-bar.png`.
