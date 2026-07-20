# D4-polish — cold-verify verdict (2026-07-20)

**Verifier:** d4-verifier (cold; shares no context with d4-fixer).
**Subject:** `fix/d4-dock-polish` @ **e3924723df4b0c610f71259def1cbb94eef07dcb**, worktree
`D:/claude-workspace/_worktrees/deepdive-rehearsal/d4-polish`, 4 commits off master `dfbfe9d`.
**Claims under test:** `_audit/2026-07-20-d4-polish.md` (freeze report) against
`_audit/2026-07-19-postship-cold-audit.md` items #3, #10, #11, #18, #19, #20, #23, #24.

## VERDICT: **CLEAN — merge-ready.** No BLOCKING findings.

Five non-blocking findings, all documentation/coverage rather than shipped behaviour. One of them
(**N1**) materially corrects the freeze report's evidence for the #11 skip and should not be
inherited as settled by a later wave.

---

## 1. Independent full gate on the frozen tip — PASS

Run cold from the frozen tip, build first, verdict read from capture files (never a piped exit code).

| | |
|---|---|
| `npm run build` | exit **0** — `01-build.txt` |
| git status after MY build | **empty (clean)** — `02-status-after-build.txt` |
| `python3 test/check_all.py` | **GATE: PASS**, exit **0** — `03-gate.txt` |
| checks | **50 named checks, 50 PASS, 0 FAIL, 0 SKIP** |
| git status after gate | **empty (clean)** — `04-status-after-gate.txt` |

**`build_integrity` reported the STRONG form**, not DEFERRED:

> `BUILD INTEGRITY: PASS (11754274 bytes, 0 unresolved, 9 panes + 7 overlays, build SYNCED the deliverable, COMMITTED deliverable == fresh build of HEAD)`

No stray file at the worktree root; no `_TEAM_LEAD_*.md` present at any boundary. Because
`build_integrity.py` samples `git status` **before** running its own build, my pre-gate build could
have silently downgraded the HEAD-match to DEFERRED had it produced different bytes — it did not
(`02-status-after-build.txt` is empty), so the strong form ran on a genuinely clean tree. That empty
status is *itself* an independent corroboration: **the committed deliverable byte-reproduces from
the committed source on a second, cold build.**

*Method note:* the gate ran as a detached foreground-equivalent process with capture files; while it
ran I did only zero-load static work (file reads, git, PNG decoding) and no browser work, so nothing
of mine competed for the paint window that produced the fixer's `dock_contrast` flake. No red
appeared under load, so no re-run was needed. Other builders were active in *other* worktrees
throughout; nothing I measured showed load sensitivity.

*Count nit:* the freeze report says 50 checks (commit 1) / **51** (commit 2). I count **50** named
checks on the frozen tip. All green either way; noting only so the number isn't propagated.

---

## 2. My instruments, and their own demonstrated negative controls

I refused to accept any of the fixer's numbers, and refused to trust my own instruments until each
had been shown to fail on a known defect.

**(a) `pngdiff.cjs`** — pure-Node PNG differ (zlib only; no browser, no project code), used for the
VR baseline claim. Negative control, run before use:

```
SELFTEST identical             -> changed=0    OK
SELFTEST 1 planted pixel(+120) -> changed=1 box={x:700,y:400,w:1,h:1}  OK (detects, and localises)
SELFTEST 1 planted pixel(+2)   -> changed=0    OK (tolerance honoured)
```

**(b) `probe.cjs` contrast math** — my own WCAG implementation, independent of `cta_contrast`'s
`ANALYZE`. Negative control against known values:

```
white on black 21.00  |  white on white 1.00  |  black on yellow 19.56
white on blue   8.59  |  grey #777 on white 4.48        (all exact)
```

Cross-validation: my math predicted the planted `#787878` digit at ~4.03:1 on `--panel`; the repo's
independent `dock_contrast` instrument measured **4.03:1**. Two separate implementations, two
decimal places.

**(c) Instrument hygiene.** Every instrument lives **outside the repo**
(`D:/claude-workspace/_verify-d4/`), specifically because an untracked file inside the worktree
dirties `git status` and would itself downgrade `build_integrity` to DEFERRED. Nothing of mine was
committed; no source edit survived; no `git stash`; no `npm install/ci` against the junctioned
`node_modules`.

---

## 3. Negative controls — every new/extended assertion watched RED on its own defect

Plant → rebuild → run → revert from a byte backup, **one defect at a time**. Every plant asserted it
actually applied (a silently-missed plant would read as "no teeth"). Full log: `negctl-run.txt`,
per-plant output in `neg/*.check.txt`.

| plant | check | result |
|---|---|---|
| remove the `N` row from KBD_HTML | `flow_a11y` | RED — **only** `#10`: *"no N row found among 23 rows … (absent)"* |
| remove the `dockAnnounce(...)` call | `flow_a11y` | RED — **only** `#18a`: *"Regions: ["Walkthrough"]"* |
| remove `aria-describedby` on the pip | `flow_a11y` | RED — **only** `#19`: *"aria-describedby=null -> null"* |
| announce the armed legend (leak) | `flow_a11y` | RED — **only** `#18b`: *"a live region leaked the armed legend: ["Grade: 1 Missed 2 Shaky 3 Solid"]"* |
| remove `.flow-go:focus-visible` | `flow_a11y` | RED — **only** `#20`: *"outline=1px auto rgb(16,16,16)"* |
| neuter `__liveText` (out-of-repo copy) | `flow_a11y` | RED — **the `[self-test]` assertion itself**: *"the #18b assertion is inert"* |
| `.nd-armed b` → `#787878` (genuine sub-floor) | `dock_contrast` | RED — **4.03:1 < 5.0 in all 6 rooms** |
| undo the dark flatten | `visual_regression` | RED — `walk-dark` 13507px in a 260x55 box at (19,230), budget 32 |
| `.mockbtn` label → `#3A3A44` | `cta_contrast` | RED — 6 rooms |

Each of the five `flow_a11y` plants produced **exactly one** failure — its own — with the other five
assertions staying green. Two of the diagnostics independently reproduce the fixer's claimed
pre-fix states verbatim (`Regions: ["Walkthrough"]` for #18a; `1px auto rgb(16,16,16)` for #20).

**The `[self-test]` assertion is not decorative.** With the detector neutered, `#18b` *passes
trivially* (the inert-pass trap) while the self-test fails and takes the check red — which is
precisely the failure mode it exists to catch.

**`flow_contract`** self-arms its own negative control every run (per its header: a forced flowRec
target must move the dock's label); it passed on the frozen tip. `cta_contrast` and
`visual_regression` were both proven red by plant, so the pre-existing suite still has teeth after
the restyle.

### Hardening scrutiny (charter item 7) — the `dock_contrast` bounded retry is sound

The retry is bounded at **5 attempts** and re-runs **only** when `ANALYZE` returns an `err`
(`no core glyph pixels` / `geometry moved`) — a transient paint state. A decoded-but-low contrast
returns `{n,min,max}` with no `err`, breaks the loop on the first pass, and fails. A persistent
`err` after 5 attempts is also a FAIL, not a silent pass. **Proven empirically:** the planted
genuine sub-floor defect failed at 4.03:1 in all six rooms rather than retrying into green. The
retry cannot launder a real defect.

---

## 4. The P1 claim (#3), measured myself — CONFIRMED

Measured live at 1280x900 across **three** rooms x both themes (blue `data-storage`, pink
`security-tenancy`, teal `messaging-events`); armed-legend contrast across **all six** rooms.

**Dark — the dock is a flat quiet panel:**
- background `linear-gradient(rgb(26,25,33), rgb(21,20,25))` — i.e. `--panel`; the freeze report's
  claimed `#1A1921 → #151419` is an **exact** match.
- border `rgb(55,51,63)` == `--bd` **exactly** (neutral, not accent).
- `.nd-go` label `rgb(236,234,228)` == `--ink` **exactly**.
- kicker retains the room accent. Identical in all three rooms.

**Dark — the Mock CTA is unambiguously the single loud primary:** tinted fill
(`color(srgb 0.177 0.196 0.274)`) + **1px `--acc` border** + `--acc` text. The dock now carries a
neutral border and ink text on a recessed panel. They are no longer the same family; the collapse
the audit named is resolved.

**Light — byte-identical, as claimed:** dock background resolves to `--accbg` exactly
(`rgb(241,246,255)` in data-storage), border to `--acc-a32`, label to `--accink`. Independently
corroborated by pixels: `walk-light` shows **zero** delta in the dock's region (its only change is
the 12x20 pip box).

**Armed-legend contrast — the claimed improvement is real.** My independent measurement, 6 rooms x 3
glyph runs, painted pixels, my own WCAG:

> **7.01 – 7.56:1** (fixer claimed 7.02–7.57; audit baseline 5.11–6.81)

Agreement to 0.01–0.02, the residue explained by method (they decode per-glyph local background; I
take the element-box luminance extremes, which is the more conservative worst case). **Contrast
improved; it did not degrade.**

**#24 and #23** follow: `--dock-bg`/`--dock-bd` are consumed by `.dock` and nothing else (grep-
verified), so the active seg tab keeps `--accbg` with no shared semantics; the pip's desktop
re-top from `--space-4` (4px, centre 7px) to `--space-14` (14px, centre 17px) lands it on the label
row, and the pixel evidence shows the move is a clean 12x20 box with no layout shift anywhere else.

---

## 5. Ratified deviations — both behave as ratified

**#20, the OUTWARD ring.** Measured: `outline: 2px solid rgb(125,166,243)`, **`outline-offset: 2px`**,
`:focus-visible = true`, and `--acc` resolves to `rgb(125,166,243)` — like-for-like match. The
button's own background is `linear-gradient(135deg, rgb(125,166,243), rgb(125,166,243))`, i.e. a
saturated accent gradient, so an inward `var(--acc)` ring would indeed paint accent-on-accent and be
invisible. **The deviation's rationale is measurably correct**, and outward lands the ring on the
pane background.

**#18, the dedicated live region.** The rationale is not a rationalisation — I read the shared
announcer:

```js
function announce(msg) { region.textContent = ''; if (pending) clearTimeout(pending);
  pending = setTimeout(function () { pending = null; region.textContent = msg; }, 30); }
```

One module-scoped `pending`, **cancelled** on the next call. Two messages within 30ms means one is
silently dropped — the collision is real. Measured behaviour:

- **At the judgment point:** dock renders `"Grade 1 Missed 2 Shaky 3 Solid"`; live regions hold only
  `[shared] "Probe Drill"` and `[DEDICATED] "Keep going: Back to the drill"`. **The armed legend
  leaked to no region.** (legend-stays-silent honoured)
- **At the debrief — the collision case:** `[shared] "Solid. Round complete. 21 solid, 0 to
  revisit."` **and** `[DEDICATED] "Keep going: Try the whiteboard"`. **Both survive.** The debrief
  readout is not collapsed, and the CTA is still audible — which is exactly what a shared region
  could not have delivered.

---

## 6. VR surgical claim — CONFIRMED, and cleaner than reported

Blob-hash comparison `dfbfe9d` → `e392472`: **exactly 10 changed, 6 byte-identical**, and precisely
the ones claimed. No baseline added or removed. Manifest diff is 10 `sha256` entries + the
`generated` timestamp, nothing else.

Byte-untouched (0 changed pixels by my differ): `home-light`, `home-dark`, `drill-light`,
`drill-dark`, `m-walk-light`, `m-walk-dark`.

Where the 10 changed (my differ, channel tolerance 2 = the manifest's own `channelTol`):

| baselines | changed | box | bands |
|---|---|---|---|
| `walk/sys/num/wb-light` + 5 `room-*` (9) | 212–213 px | **12x20 at (22,665)** | x 22–33, 100% |
| `walk-dark` | 14146 px | 260x457 at (19,230) | y 230–284 (13933px, dock) + y 667–686 (213px, pip) |

**The sidebar column is `width: var(--space-296)` = 296px. The maximum x of any changed pixel across
all ten baselines is 278.** Every delta is inside the sidebar; **zero pane-content deltas.**

The `walk-dark` dock region is independently corroborated from the other direction: undoing the
flatten made `visual_regression` report **13507px in a 260x55 box at (19,230)** — the same region my
differ found, proving the regenerated baseline genuinely encodes the flatten rather than noise.

---

## Findings

### BLOCKING — none.

### N1 (non-blocking, **but do not inherit**) — the #11 skip's stated evidence is partly wrong; the decision still stands

I tried to refute the skip and **partly succeeded**. Driving real drills to both terminals:

- **Confirmed:** at a **with-revisit** terminal (first probe Shaky, 21 graded) the strip is genuinely
  **ABSENT** — `rec.self = (self.shk > 0)` self-dedupes, exactly as claimed.
- **Confirmed:** structurally the dock is the only sidebar next-affordance and all five
  `flowStripHtml` mount points are pane/overlay, so they are always in different columns.
- **REFUTED — the co-visibility claim.** The report says they sit "~1400px apart" and "a 1280x900
  viewport can't show both at once." The sidebar is `position:sticky; top:0; height:100vh`
  (styles.css:547), so **the dock never scrolls away.** At the all-solid terminal, scrolling the
  strip into view — which a user must do to act on it — leaves the dock pinned:

  ```
  dock  vp(19,230)  inViewport=true      strip vp(370,383) inViewport=true
  BOTH SIMULTANEOUSLY ON SCREEN = true   [horizontal gap 91px, vertical offset 153px]
  dock CTA  = "Try the whiteboard →"     strip CTA = "Try the whiteboard →"   IDENTICAL
  ```

  The "~1400px" figure compares the dock's **viewport** y against the strip's **document** y. In
  consistent document coordinates the gap is 1035px; in consistent viewport coordinates, 153px.

- **Overstated — the architecture argument.** The report cites `nextUp`'s comment *"reads no pane's
  live state"*. But the code immediately below that comment calls `drillAtTerminal(curTab)` →
  `dr.atDebrief()`, a live read of the **current visible** pane (added by the preceding correctness
  wave for audit #6), and `dockArmedKeys()` does the same via `atJudgment()`. "Is a strip mounted in
  the current visible pane?" is the *same class* of read that already ships twice in this file. The
  barrier is lower than described; the header comment is stale relative to its own function.

**Why I still recommend keeping the SKIP** — for a reason the report does not give: `flow_contract`
**mandates** that every visible next-affordance render the same `flowRec` compute ("No surface may
drift from the engine — that split-brain is the whole bug class W0-W2 kills"). Byte-identical CTA
copy across dock and strip is the *gate-enforced invariant*, not a defect; audit #11 arguably
mis-framed a deliberate one-compute guarantee as duplication. Suppressing a surface would be a
conscious exception to that contract and belongs to the design owner, not to a quiet dedupe.

**Action:** merge as-is; re-open audit #11 with this corrected evidence so the next wave does not
inherit "they can't both be on screen" as settled fact. Nothing regresses by merging — the
co-occurrence predates this wave and the wave changes nothing about it.

### N2 (non-blocking) — `#20`'s guard does not assert the ratified property

`flow_a11y` asserts `:focus-visible`, `outline-style: solid`, width `>= 2px`, and colour `== var(--acc)`
— but **not `outline-offset`**. The ratified deviation is specifically that the ring is **OUTWARD**;
an inward regression would keep the guard green while re-introducing the invisible accent-on-accent
ring the deviation exists to avoid. One-line hardening: assert `parseFloat(outlineOffset) > 0`. (I
measured `2px` on the frozen tip, so this is a guard gap, not a defect.)

### N3 (non-blocking) — the `num-light` "256x407 box / ~4 extra px" note is not reproducible

The freeze report explains `num-light` as having a larger 256x407 box with ~4 incidental
antialiasing pixels near the top. From the **committed** baselines, at **zero** tolerance,
`num-light` is shape-identical to every other pip-only pane: **217px in a 12x20 box at (22,665)**,
nothing else. The report was evidently describing a live-render-vs-baseline VR measurement (which
carries run-to-run AA noise), not the baseline-to-baseline delta. **The committed result is cleaner
than claimed** — recorded only so nobody re-derives a phantom.

### N4 (non-blocking) — the new `N` overlay row is incomplete on one tier

The row reads "Go to your next step — the drill, whiteboard or mock the app points you at". But
`nextUp`'s **macro** tier hands off to the **next topic** (`__topic__` → `flowNextTopic`), which the
enumeration omits; and the row does not state the contextual no-op the audit's direction suggested
noting ("acts only when a next step is offered"). Copy accuracy only.

### N5 (non-blocking, coverage observation) — the dark dock has exactly one pixel baseline

`walk-dark` is the only baseline that renders the dark dock (`home-dark`: dock hidden on home;
`drill-dark`: hidden at a fresh drill; `m-walk-dark`: `display:none` under 920px). All five `room-*`
baselines are light. So the per-room dark dock is covered by `dock_contrast` (6 rooms) but by
pixels in exactly one place. Adequate today; worth knowing before the D5 mobile wave inherits these
tokens.

---

## Scar-tissue compliance

No source edit survives (every plant restored from a byte backup, verified); no commit, no push, no
merge; no `git stash`; no `npm install/ci` in the junctioned worktree; instruments live outside the
repo; every verdict read from a capture file, never a piped exit code. Final state re-verified:
**HEAD `e3924723df4b0c610f71259def1cbb94eef07dcb`, `git status` empty, deliverable == HEAD.**

Browser cleanup: no image-wide `chrome` taskkill. Nine Playwright chromium processes remain alive,
but every browser I launched was closed by its own script (all runs exited 0) and D3/W3 builders are
still active — I cannot attribute those PIDs to my runs, so per the standing rule I left them rather
than risk killing another agent's live browser.

## Evidence pins

All under `D:/claude-workspace/_verify-d4/`:
`00-tip.txt` · `01-build.txt` · `02-status-after-build.txt` · `03-gate.txt` · `04-status-after-gate.txt`
· `pngdiff.cjs` (+ `old/`, `new/`) · `probe.cjs`, `probe-run.txt` · `negctl.sh`, `negctl-run.txt`,
`neg/*.check.txt` · `flow_a11y_broken.cjs`, `selftest-neg.txt`.
