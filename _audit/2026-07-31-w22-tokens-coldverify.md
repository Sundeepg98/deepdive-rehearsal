# W22 COLD VERIFY -- Ledger Round L1 "Token structure"

**VERDICT: CLEAN.** No blocking findings. Three NON-BLOCKING notes (N1-N3), none of which
touches the wave's contract. Every load-bearing number in the freeze reproduced or reconciled
against my own instruments; the two new gate arms are falsifiable on all fourteen defect
classes I could construct, in both cross-check directions.

Target: worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w22-tokens`,
branch `ledger/l1-token-structure`, tip `845d44c`, base `92aa8d0`.
Verifier: independent, no shared context with the builder. Scratch:
`...\scratchpad\w22-verify\`.

---

## 1. The zero-pixel contract -- HOLDS, proven four independent ways

**Baselines were not re-baselined.** All 16 VR PNG blobs are object-identical between base
`92aa8d0` and tip `845d44c` (`git ls-tree -r` on both; hashes match one for one), as are
`manifest.json` (`ea1a5624`) and `test/visual_regression.cjs`. So the green cannot come from
moved goalposts. Confirmed no instrument tampering anywhere: the ONLY `test/` changes on the
whole branch are the two new checks plus their `check_all.py` registration --
**977 insertions, 0 deletions**, nothing edited.

**My own VR run on the committed tree** (`node test/visual_regression.cjs`, exit 0):

    16 baselines compared; worst = 0 px (home-light), budget 32 px.

Every one of the 16 reported `changed px = 0` -- not "within budget", zero. Viewport asserted
per baseline by the instrument itself: 1280x800 for 14, 390x844 for the two mobile roots.
Capture: `vr-run.txt`.

**Per-SITE re-derivation (my own instrument, `persite.py`).** An aggregate histogram cannot
catch two sites swapping tokens, so I paired the base and tip trees line for line, expanded
every `var()` on BOTH sides through `design-tokens/tokens.json` (plus the hand-rolled
properties in `styles.css`), and compared normalised lengths:

    files compared      : 228
    changed lines       : 120
    sites re-derived OK : 139   (letter-spacing 110, margin 18, max-width 11)
    fallback DRIFT      : 0
    MISMATCHES          : 0
    changed lines with NO letter-spacing/max-width/margin : 0

Every token resolves to exactly the literal that stood at that exact site. Output:
`persite-out.txt`, `persite-sites.txt`.

**Rebuild determinism, on my own gate run.** `build_integrity` PASS --
`COMMITTED deliverable == fresh build of HEAD` -- and I bracketed the run with hashes:
`sha256(deliverable)` = `1f64ae46...e02a3c01` **before and after** the build. Byte-identical.

**The alias tier is not flattened** -- the failure mode VR structurally cannot see, because no
check anywhere sets `data-density`. Both the generated CSS and the SHIPPED deliverable carry
`--measure-home: var(--space-980)` and all eight `--gap-home-*: var(--space-N)`; nothing
resolved to a literal. The density block still scales the referent
(`--space-980` -> 804px compact / 1127px cozy). I re-derived the freeze's measured density
figures from the generator's own constants (`.82` / `1.15`, `Math.round`) rather than trusting
the probe: 24->20, 980->804, 980->1127 -- exact. Likewise the em arithmetic: `0.08em x 11px =
0.88px` at the use site vs `0.08em x 16px = 1.28px` against `:root`. Both freeze figures exact.

## 2. The censuses -- reproduce exactly, and the delegated one is exact row-by-row

My own grep of the base tree, independent of any committed instrument:

| | claimed | mine |
|---|---|---|
| declarations / files | 110 / 21 | **110 / 21** |
| distinct px / em / zero | 20 / 14 / 1 = 35 | **20 / 14 / 1 = 35** |
| occurrences px / em / zero | 83 / 26 / 1 = 110 | **83 / 26 / 1 = 110** |
| migration split | 46 + 1 + 63 | **46 (styles.css) + 1 (tw.css) + 63 (scripts)** |
| raw literals post-fix | 0 | **0** |

Changed lines partition exactly as the delegation record states: 63 across 19 files under
`src/scripts/` (c3) and 57 in `styles.css`+`tw.css` (56+1, c4) = 120. c3 and c4 were genuinely
file-disjoint; `git diff --numstat` shows no overlap.

**The shipped deliverable carries 110 `letter-spacing` declarations and all 110 are
`var(--track-*)` -- zero non-token.** So the guard's `src/`-scoped green is not concealing an
unguarded shipped surface (no topic-markdown or tool-injected tracking exists outside the
census). This was my own probe, not a claim in the freeze.

**Child c1's census audited row-by-row** (`census_audit.py`) against my extraction --
file, line, raw value AND its normalisation:

    my extraction : 110 declarations across 110 file:line sites
    census table  : 110 rows across 110 file:line sites
    row numbering : contiguous 1..110
    DISCREPANCIES : 0

Re-running the shipped instruments myself reproduces the registry counts independently:
`tracking_census` -> 110 declarations / 35 tokens / 0 literals / 0 orphans / 0 registered;
`home_rhythm` -> 8 rhythm gaps + 9 measures, registry matches discovery exactly. My own greps
confirm 8 `--gap-home-*` use sites and 9 `--measure-home` use sites.

## 3. Guards falsifiable -- 16-mutant battery, 16/16 as predicted

Each mutant planted on an isolated scratch copy of the shipped tree, run against the
**SHIPPED** instruments (`mutants.py`, `mutants-out.txt`). Pristine control first: both exit 0.

`tracking_census`, all six arms fire:

| mutant | result |
|---|---|
| T1 raw literal | RED -- "a RAW TRACKING LITERAL" |
| T2 foreign token (`var(--space-2)`) | RED -- "OUTSIDE the --track-* family" |
| T3 drifted fallback | RED -- "--track-em-0-04 is 0.04em, the fallback says .09em" |
| T4 undefined token | RED -- "defined in no token file" |
| T5 orphan token (mint-on-use) | RED -- "an ORPHAN token: defined, used by NOTHING" |
| T6 `@property --track-em-*` in deliverable | RED -- the zero-pixel tripwire fires |

`home_rhythm`:

| mutant | result |
|---|---|
| H1 slot swap, decision->section (**both 26px**) | RED -- "the WRONG semantic slot" |
| H2 raw gap / H3 bare primitive gap | RED / RED |
| H4 raw measure / H5 bare primitive measure | RED / RED |
| H6 hardcoded fallback on a slot | RED |
| H7 slot loses its site | RED -- `cross-check: 0 NEW, 1 STALE` |
| H8 unregistered new home block | RED |

H1 is the one that matters: the three 26px roles mean a swapped name renders byte-identically
forever, so nothing but that assertion can catch it. It catches it. Both cross-check directions
were exercised (1 STALE, 1 NEW).

**Watched-red reproduced with the shipped instruments**, matching the committed capture exactly:

    pre-fix tree      tracking_census FAIL 110 violations   home_rhythm FAIL 17 violations
    token layer only  tracking_census FAIL 145 violations, "0 token(s) used, 35 orphan(s)"

Self-tests green in every lab. Capture: `watched-red-repro.txt`.

## 4. The 8-vs-10 adjudication -- both stated reasons hold, and I probed the boundary BOTH ways

Verified against the tree, not the prose:

- **`#home .ix-panel`** (`styles.css:1966-67`) is `margin:0 auto` -- a 2-value shorthand, so
  `margin-bottom` takes the FIRST value = 0. It **does** declare the measure, so it is one of
  the 9 measures; it contributes no gap because its gap is zero, not because it was skipped.
- **`#home .ix-foot`** (`styles.css:1969`) declares **no** `max-width`, so it is not a column
  member under the derived scope; and it is a route override of a shared component class
  (`.ix-foot` is also styled at `styles.css:1711`). Both stated reasons check out.

Under the alternative 10-slot scoping both would be aliases onto the same primitives, so both
would render byte-identically -- the call is taxonomy, with no pixel consequence. Claim holds.

I then probed the boundary from both sides, which the freeze does not do:

- **H9** -- giving `#home .ix-panel` a non-zero gap (`margin:0 auto 14px`) **DOES** fire
  (`cross-check: 1 NEW`). The derived scope genuinely ratchets; it is not a static list.
- **H10** -- a raw `margin-top:28px` on `#home .ix-foot` **stays green**, confirming the
  documented hole is exactly as wide as stated and no wider. See N2.

## 5. Delegation-record honesty -- everything disk-checkable corroborates

Both census artifacts exist at `379a8e1` as described, contents match their stated slices
(c1: per-site + rollup + arithmetic reconciliation; c2: G1/G2/G3 + every `--space-980` site +
candidate-run survey + the density mechanism). All five committed W22 `_audit` artifacts are
**ASCII-clean (0 non-ASCII lines)** -- I checked directly, because `ascii_guard` enumerates only
`src/`, `src/topics-md/`, `test/`, `tools/` and does **not** cover `_audit/`.
`_TEAM_LEAD_W22_BRIEF.md` is gitignored (`.gitignore:49`) and correctly not committed.

**Not verifiable from disk:** the "0 bounces" and wall-clock figures -- no artifact records
them. Stated plainly rather than blessed. Every element that *can* be checked (outputs, counts,
file-disjointness, the 63/57 line partition) corroborates the record.

## 6. Gate -- my own full re-run, on the TIP

`GATE: PASS` -- **73 checks, 73 PASS, 0 FAIL, 0 SKIP**, tree verified clean at start and still
clean after. All 73 check names and verdicts are identical to the committed capture. Capture:
`gate-run.txt`; comparison: `mine.txt` vs `theirs.txt`.

The builder's capture was taken on `379a8e1` and the pin commit argues by reasoning that the
result carries to `845d44c`. **I ran on `845d44c` directly, so that argument is now an
empirical result rather than an inference.** Independently confirmed en route: all 11 mentions
of `_audit` in `test/` are comment prose, no filesystem read.

No flake retry was needed -- `touch_floor` and `grade_reveal` both passed first time, so the
one-quiet-retry budget went unused.

## 7. Freeze accuracy

Every figure reproduced: 44 tokens (35+8+1), 127 call sites (110+8+9), 120 changed source
lines, 73 checks, 16/16 VR at 0px, the 110/35/83/26/1 census, the 110/17/145 watched-red,
density 24->20 / 980->804 / 980->1127, em 0.88 / 1.28, and zero `--track-*` under `@property`.
No over-claims found.

One citation I chased and cleared: `phantom_tokens.py:13` records `--space-980` as
"0 definitions, 9 use sites", which would mean `--measure-home` aliases a phantom. It does not
-- that line is the file's **historical pre-fix record** ("MEASURED on the pre-fix build,
2026-07-29"); `--space-980` is defined today (980px at `:root`, 804/1127 under density) and is
not in `phantom_tokens_debt.json`. The freeze cites only the 9-site count, which is accurate.

---

## NON-BLOCKING notes

**N1 (documentation clarity).** Freeze section 4 says "113 `@property` lines before and after"
while section 7 says "115 distinct declarations before and after". This reads as a
self-contradiction; it is not. **Both are correct and measure different artifacts:** 113 is
`src/tokens.generated.css`, the generator's own output -- the right denominator for an argument
about widening `tools/postprocess-tokens.mjs` -- and 115 is the count of distinct `@property`
names in the shipped deliverable (116 occurrences; the extra two are authored outside the
generator). I verified the deliverable's `@property` name list is byte-identical base to tip,
with 0 `--track-*` in either. One clarifying clause would stop a future reader chasing it.

**N2 (scope, already disclosed -- sharpening the consequence).** H10 proves a raw literal on
`#home .ix-foot` passes silently. Both the freeze and the gaps census disclose that the block is
out of scope. The consequence the census states but the freeze does not carry forward: because
`.hm-skip`'s trailing 20px and `.ix-foot`'s leading 28px are adjacent collapsing siblings, the
gap that actually RENDERS at the stack's last junction is `.ix-foot`'s 28 -- so the one gap that
visually dominates that junction is the one outside the guard, while `--gap-home-skip` (20px)
never renders as a distinct gap at all. Nothing to fix here; this is precisely the information
the parked normalisation pass needs, and it is already written down.

**N3 (namespace, pre-existing).** `--measure-home` (generated, from `tokens.json`) now shares a
prefix with the hand-rolled `html{--measure:68ch;--measure-tight:58ch}` at `src/styles.css:258`.
Two sources of truth for the `--measure*` family. Neither was introduced by this wave and
`home_rhythm` governs only `--measure-home`, but a future `--measure-topic` could land in either
place with nothing to arbitrate.

---

## Hazards pre-cleared

- **Repo read-only for source.** No source, test, token or audit file in the worktree was
  edited. Every mutation ran on isolated scratch copies (three separate scratch git repos built
  via `git archive` / `git show`). Worktree `git status --porcelain` verified **empty before and
  after** all runs, including the gate and VR, both of which build.
- No `git stash` (shared across worktrees), no `git worktree add/remove`, no branch, merge,
  push, or master contact.
- **No image-wide browser kill.** Playwright managed its own chromium lifecycle; no `taskkill`
  was issued at any point.
- Scratch confined to the assigned `w22-verify` directory.
- No inline PowerShell -- Bash and Python throughout.
- Browser measurement viewport asserted: VR prints the viewport per baseline (1280x800 x14,
  390x844 x2).

## Artifacts

    VERDICT.md              this file
    gate-run.txt            my full 73/73 gate run on the tip, hash-bracketed
    vr-run.txt              my standalone VR run, per-baseline changed-px
    persite.py / -out.txt   per-site token re-derivation, 139 sites, 0 mismatches
    census_audit.py         row-by-row audit of the delegated census, 110/110, 0 discrepancies
    mutants.py / -out.txt   16-mutant falsification battery, 16/16 as predicted
    watched-red-repro.txt   watched-red reproduced on pre-fix and token-layer-only trees
    mklab.sh, lab/          the three isolated labs (pre / mid / tip) + mutation lab
    mine.txt, theirs.txt    73-row gate verdict comparison
