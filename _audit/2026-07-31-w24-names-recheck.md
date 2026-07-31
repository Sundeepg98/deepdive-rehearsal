# W24 -- RE-CHECK: the cold verify's six, as heard on the merged tree

**Author:** `w24-verifier` (the same independent cold verify that filed
`_audit/2026-07-31-w24-names-coldverify.md`), commissioned by team-lead as a round-2 re-check.
**Question asked:** narrow -- *did they fix the things you found?* Not a fresh audit.
**Measured on:** master `bfee840` (the merged, pushed tree), against round-1 tip `3e18fcc` and
pre-wave base `8b2599b` as controls. Disk was verified against the order before any work: master
clean at `bfee840`, commits `c9cce21` / `a1c79f5` / `8144c15` present, the `w24-names` worktree
gone. Everything the order stated matched disk.

---

## VERDICT

**6 of 6 FIXED. 0 PARTIAL, 0 NOT-FIXED, 0 regressions.** Round 2 changed no pixels (1327 of 1327
PNG blobs identical `3e18fcc` -> `bfee840`) and introduced no new offending names.

| # | Round-1 finding | Verdict | Decided by |
|---|---|---|---|
| F1 | `.arc-step.done .arc-n::after` U+2713 in the name, spoken as "check" | **FIXED** | by ear, A/B on one script across two builds |
| F2 | a period passed the ratchet at all twelve separator sites | **FIXED** | my own breaks, now RED |
| F3 | the DOM-API separator's text was unchecked | **FIXED** | my own break, now RED |
| F4 | `check_all.py` said "41 of 44"; measured 44 of 47 | **FIXED** | re-measured: 47 of 50, exact |
| F5 | the two-viewport + 116%-zoom claim had no committed receipt | **FIXED** | I re-ran their probe |
| F6 | I classified the `<details>` triangle as a UA marker, out of scope | **FIXED -- and my classification was WRONG** | source + AX + by ear |

---

## F1 -- FIXED. The check is silent, and it still paints.

**Source** (`src/scripts/app/walkthrough/logic.js:122`) now carries the wave's own fix shape #4:

```css
.arc-step.done .arc-n::after{content:"\\2713";content:"\\2713" / "";...}
```

**By ear -- and this is the part that needed care.** The fix makes the defect *silent*, so silence
from a broken harness would be indistinguishable from a pass. I ran ONE script against TWO builds,
the round-1 tip first as the control that gives master's silence its meaning:

```
R1TIP  3e18fcc | clickable, 1, check, ,The producer emits and moves on, button
                | 2, check, ,The emit is made atomic -- the outbox, button
                | 3, check, ,The router fans out to each consumer's own queue, button
                | 4,The queue buffers and the consumer pulls, button      <- step 4 not done

MASTER bfee840 | clickable, 1,The producer emits and moves on, button
                | 2,The emit is made atomic -- the outbox, button
                | 3,The router fans out to each consumer's own queue, button
                | 4,The queue buffers and the consumer pulls, button
```

spoken "check": **3 -> 0**. The authored comma survives at every step.

**The vacuity gap, closed explicitly.** On master the by-ear read can no longer prove the steps
were `.done`, because the signal that used to prove it is the thing that was silenced. So I proved
it on the identical advance sequence out of band:

```
MASTER   doneCount 3 of 9   ::after content "[U+2713]" / ""    width 6.75px
R1TIP    doneCount 3 of 9   ::after content "[U+2713]"         width 6.75px
```

The state is genuinely instantiated, the alt text is empty, **and the glyph still paints at exactly
the same 6.75px** -- silent to AT, unchanged on screen.

**By AX tree:** my stateful sweep, 1027 named controls over 16 stops, identical on both builds --
`R1TIP 7 distinct offenders -> MASTER 0`.

## F2 -- FIXED. The separator character is now pinned, not merely non-blank.

Arm A asserts the text is **exactly** `", "` and that **twelve** separators are found (not the
eleven visible to a markup scan). My round-1 breaks, re-run against the patched ratchet on a
scratch copy (baseline 50/50 green, anchor count aborts a silent no-op):

```
period at the kicker/description seam (drive 1's exact defect)  applied=1   -> RED  49/50
period at every markup separator in panels.js                   applied=6   -> RED  49/50
```

Both now fail on `[nsep] every separator is EXACTLY ", " -- markup AND the DOM-API site`.

## F3 -- FIXED. The twelfth separator is read through the DOM.

The arm now parses `pomodoro.js`'s `className = 'nsep'` / `textContent` pair and requires
`found === 12`. My break:

```
bare space at the DOM-API separator   applied=1   -> RED  49/50
```

## F4 -- FIXED, and the new number is right.

`check_all.py` now reads "RED on 47 of 50 assertions against the pre-wave source". Re-measured with
the **shipped** instrument against `git archive 8b2599b src`:

```
at_name_hygiene: 3/50 assertions, 9 + 2 mutants all detected
FAILED 47 assertion(s)
   3 [nsep]   12 [sep]   25 [glyph]   2 [toggle]   5 [collision]
```

Exact. The glyph arm grew 22 -> 25: the arc-step check plus the two `summary::before` rules.
Spot-checked from the committed train gate at `bfee840`:
`at_name_hygiene PASS -- 50/50 assertions, 9 + 2 mutants all detected`, `GATE: PASS`.

## F5 -- FIXED. The receipt exists, and it reproduces.

`test/at_name_layout_probe.cjs` + `_audit/2026-07-31-w24-names-layout.txt`. I ran the probe myself
rather than reading the committed output:

```
MASTER   sites x conditions: 21   separator present: 21   GLUED: 0
BASE     sites x conditions: 21   separator present:  0   GLUED: 21     <- negative control
--read-zoom measured: 1440x900 -> 1 | 1024x768 -> 1 | 1440x900 @116% text -> 1.16
```

The zoom arm reads its own state back rather than assuming the press took, and the base run proves
the assertions can fail. This is what my F5 asked for. **Noted, not a finding:** the probe is not
registered in the gate -- deliberate, and stated in its own header (once the separator is an
authored character the layout dependence is gone by construction, and arm A is the ongoing guard).
It can still rot silently, since nothing runs it.

## F6 -- FIXED, and I was wrong about it.

My round-1 verdict filed this as "a UA-generated marker outside the accessible name", out of scope.
**That was wrong, and the builder was right to overrule it on a measurement.** The source carried an
*authored* `summary::before{content:"\\25B8"}` in two rules -- `shared-sheets.js:93`
(`details.disc summary`) and `walkthrough/logic.js:83` (`details.model>summary`) -- and authored
generated content contributes to name-from-contents. "filled right-pointing small triangle" is
literally the Unicode name of U+25B8, which I should have read as the tell.

Re-measured on the round-1 tip, U+25B8 appears in **three** control names, one more than the two the
builder reported -- the same `details.disc` rule also serves the whiteboard:

```
DisclosureTriangle  "[U+25B8] Go deeper"
DisclosureTriangle  "[U+25B8] What a complete answer sounds like , model script ..."
DisclosureTriangle  "[U+25B8] The assembled diagram -- what you draw on the board"
```

On master: **0 nodes carrying U+25B8, at any role.** By ear, same script, two builds:

```
R1TIP  | filled right-pointing small triangle, What a complete answer sounds like,model script ...
        | filled right-pointing small triangle, The assembled diagram -- what you draw on the board, button, collapsed
MASTER | What a complete answer sounds like,model script the full arc, not just the opener, button, collapsed
        | The assembled diagram -- what you draw on the board, button, collapsed
```

spoken "triangle": **2 -> 0**, with the wave's own comma separator intact at the model-script seam.
The triangle still paints: `summary::before` resolves `"[U+25B8]" / ""` at **18x18px** on master
against `"[U+25B8]"` at **18x18px** on the round-1 tip.

**Why my instrument missed it, stated plainly.** My round-1 AX sweep had two blind spots, and both
were mine: U+25B8 was not in my nineteen-code-point set (I carried U+25B6 and U+25C0 but not the
small triangles), and `DisclosureTriangle` was not in my role allowlist. A sweep that filters by a
hand-written role list can only find what someone thought to list -- the same failure mode this
wave already diagnosed for `#wnext`, arriving this time in my own instrument. Both are corrected
here, and the corrected instrument was **proven capable on the round-1 tip before being trusted on
master**: it fired on all three triangles there, and returned zero here.

---

## Observations (not findings, nothing owed)

- **Seven `DisclosureTriangle` names still carry U+2192, and they should.** They are authored
  CORPUS content, not markup decoration -- e.g. `src/topics/content-pipeline/sys.js:22`,
  `chip: "\\u2192 Authz (3)"` -- so the arrow is part of the visible label and carries meaning
  ("this question leads to that topic"). They are byte-identical on the round-1 tip, so they are
  pre-existing, and Wave A's own arm D exists precisely to stop anyone "fixing" glue by editing the
  corpus. Out of remit by construction; worth a future content-scope call, not a defect here.
- **One of my own controls was badly built.** `G2-walkthrough-advanced` asserted on the utterances
  produced by pressing Next -- which are silent -- so it logged FAIL on both builds. It is a
  harness artifact, not a result; G3/G4 and the cross-build A/B carry the proof. Recorded so it is
  not reused in that shape.

---

## Method and hygiene

Two NVDA drives on the standing bench, both against the merged deliverable and its control build,
with the bench used read-only (`lib.mjs` / `at1-lib.mjs` imported by absolute path; only new
`logs/w24v-r2-*.jsonl` written). Every SPIKE-REPORT hazard honoured: Speech Viewer off and oneCore
volume 0 verified in the portable config before starting, no NVDA running beforehand, real desktop
session, key names validated before the machine was touched, profile reset per run, controls
matched by spoken name and never by tab index, focus gate at every phase boundary -- **8 of 8
passed first attempt across both drives.** Browser sweeps were run before NVDA and never
concurrently.

One run aborted loudly and was re-run rather than reported: the master drive's `resetProfile()`
threw EPERM because the control run's Chrome still held the profile. It produced no data, which is
the correct failure.

No image-wide kills: Chrome was censused by executable path (all ~50 processes the operator's own,
left untouched) and the spike's browser closed with the bench's own `close-spike-chrome.ps1`, which
filters on the isolated `--user-data-dir`. PowerShell was invoked only via `.ps1` files. The repo
was read-only throughout except this file.

**Receipts.** `D:\claude-workspace\at-spike\logs\w24v-r2-R1TIP.jsonl` and
`w24v-r2-MASTER.jsonl` are the two utterance logs (raw UTF-8; the transcripts quoted above are the
ASCII transliteration this repo's `_audit` files use). Sweep, mutation, layout-probe and
glyph-paint captures are in the verifier's scratch at
`...\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w24-verify\` (`r2-*`, `axsweep-*.json`,
`donecheck.cjs`, `tricheck.cjs`).
