# W19b FREEZE-LITE -- the fallback arm asks for closeness, not cross-platform equality

**Branch** `xb/x2b-fallback-arm` - **base** `bab66c3` - **local gate** 70/70 PASS
(`_audit/2026-07-30-w19b-fallback-arm-gate.txt`) - **VR** 16/16 byte-identical, no baseline touched.

Hotfix for the CI failure that gated the deploy after W19 merged. Product behaviour is unchanged:
the only non-comment edit is inside `test/chrome_metrics.cjs`.

---

## 1. The defect

CI run **30541221701** (`ubuntu-latest`, `Deploy to GitHub Pages (gated on THE GATE)`) failed on
`chrome_metrics`, at both viewports, on one arm:

```
chrome_metrics  FAIL  CHROME METRICS: FAIL
  ([360x844] the stylesheet FALLBACK pair equals the measured truth (JS off, or the frame before it runs);
   [844x390] the stylesheet FALLBACK pair equals the measured truth (JS off, or the frame before it runs))
GATE: FAIL (chrome_metrics)
```

It was the **only** failure in the run (`visual_regression` SKIPs on Linux for want of
`linux-chromium149` baselines -- pre-existing, and true of every previously green run too).

**The arm was wrong, not the app.** It demanded `fallback === measured`. `measured` carries a
font-metric term, so a single hardcoded fallback can be exactly right on at most one platform --
which is the entire thesis of the wave this check belongs to, applied to the check itself. It
passed on the Windows box it was anchored on and failed everywhere else. That is also a guard with
a font-metric dependence, which this repo's checks are not allowed to have.

The check's own header said the quiet part out loud and then did the opposite: *"a fallback nobody
checks is just a constant with a better name"* is right, but the answer to it is a **band**, not
equality.

---

## 2. The cause, measured rather than reasoned about

The CI log carries only the summary line (the detail went to `test/_last_fail_chrome_metrics.txt`,
which is not uploaded), so the Ubuntu numbers were not in hand. Rather than anchor a band on a
guess, the same probe was run in **real Linux Chromium** -- the
`mcr.microsoft.com/playwright:v1.61.1-noble` container (matching the repo's Playwright 1.61.1), on
the same commit, in the same context the check uses (`isMobile`, `hasTouch`, dSF2):

| tallest child of the bar | Windows Chromium 149 | Linux Chromium | |
|---|---|---|---|
| `.seg` -> `BUTTON.on` | **44** (at the tap floor) | **44** (at the tap floor) | |
| `.mockcta` -> `BUTTON.mockbtn` | **47** (3 over the floor) | **44** (at the floor) | |

| var | Windows (portrait / landscape) | Linux (portrait / landscape) | drift |
|---|---|---|---|
| `--chrome-top` | 61 / 51 | **61 / 51** | **0** |
| `--chrome-bot` | 72 / 60 | **69 / 57** | **3** |

Both bars are `padding + border + max(44px tap floor, the tallest control's line box)`. The only
term that can move across platforms is **how far a control overshoots the 44px floor**; where the
floor clamps, there is no font term at all. `.seg`'s tab sits exactly at the floor on both
platforms, so `--chrome-top` is identical. `.mockcta`'s mock button clears the floor by 3px on
Windows and is clamped by it on Linux -- and because it is the same button, the delta is the same
3px in both orientations.

So the failure was **3px, in one variable, from one button's line box**. Not a vague
"font metrics differ".

---

## 3. The contract, restated

> The fallback is a **best-effort pre-JS approximation**. It is used for one frame before
> `chrome-metrics.js` runs, and for JS off entirely. Its job is to catch **gross drift** --
> somebody restructures a bar and leaves the fallback describing the old one -- not to be
> cross-platform exact, which it cannot be.

**Band = 8px**, anchored:

- **2.7x** the 3px delta measured between two real platforms;
- covers a face with ~20% taller metrics than the Windows one (about 3px more overshoot at this
  font size) with room left;
- and stays far below any structural change to a bar: adding a control row costs at least the 44px
  tap floor. The gross-drift mutant plants 20px and must go red.

**What the band deliberately does not cover.** A one-token padding edit (2-4px) is now
indistinguishable from font variance on this arm. That is accepted: such an edit leaves the app
**correct** -- the JS-on measured arms are exact and platform-relative, so `--chrome-top/-bot` and
every consumer follow it -- and leaves the fallback merely a few px stale for one pre-JS frame.
Gating a deploy on that would be the same mistake in the other direction.

**Both vars are banded, not just the one that moved.** `.seg`'s child sitting at the floor today is
a property of the current labels and font sizes, not a guarantee. Keeping `--chrome-top` exact
because it happened to match on two platforms is precisely the platform-anchored reasoning that
produced this defect. Both bars have the same `max(floor, line box)` shape; both get the same
treatment. (This is also why no baseline-platform-gated strict arm was added -- it would be strict
about the one thing already known to be luck, and blind on CI.)

**Direction, recorded rather than asserted.** A fallback that is too **low** under-reserves and
puts content under the bar (the defect W19 exists to remove); one that is too **high** merely
leaves a gap. The committed pair (61/72, 51/60) is the Windows measurement, which is the **high**
side of the two platforms measured -- the safe direction. Kept unchanged for that reason.

---

## 4. Mutant receipts

Both run **every invocation**, against a genuine planted fallback (a late-appended `:root`
stylesheet outranks the media-block declaration by order, and is re-read through the same path the
arm uses). The check **aborts** rather than report a green it did not earn if either misbehaves, or
if the plant leaves anything behind.

| mutant | required | Windows | Linux |
|---|---|---|---|
| **+3px** -- the exact delta that failed CI | **PASS** (the band must absorb the real thing) | PASS (fallback 75 vs measured 72) | PASS (fallback 75 vs measured 69) |
| **+20px** -- gross drift | **FAIL** (the band must not swallow a restructured bar) | caught (fallback 92 vs measured 72) | caught (fallback 92 vs measured 69) |

**End-to-end reproduction and repair, both in the container:**

- **pre-fix check (`bab66c3`) on Linux** -- FAIL at exactly the two arms CI named, and nothing else.
- **fixed check on Linux** -- PASS, printing `fallback 61/72 vs measured 61/69 drift 0/3px` and
  `fallback 51/60 vs measured 51/57 drift 0/3px`. The drift is now visible in the log on every run
  rather than being a pass/fail cliff.

Every other arm was green on Linux both before and after, including the measured-truth arms, which
read `.seg=51 .mockcta=57 -> --chrome-top/bot=51/57, .app pad=51/61, seat=59/73, fab=71` there
against 51/60, 51/64, 59/76, 74 here. Different numbers, both correct -- which is the wave working.

---

## 5. Over-claiming comments corrected

Four places asserted equality and now state the banded contract, with the measurement behind it:

- `test/chrome_metrics.cjs` -- header, and arm 5's block comment (the full anchoring lives there)
- `test/check_all.py` -- the `chrome_metrics` registration comment
- `src/styles.css` -- the `:root` fallback comment, which now also records why these values (the
  high side) are the right ones to keep
- `src/scripts/app/chrome-metrics.js` -- the "THE FALLBACKS STAY IN THE STYLESHEET" paragraph

**Correction against the merged W19 freeze** (`_audit/2026-07-30-w19-bar.md`, left as the record of
what shipped, corrected here per this repo's convention): its section 4 says the check *"requires
`styles.css`'s **fallback** pair to equal the measured truth"* and calls that a virtue. It was the
defect. The same claim appears in its section 1 table note and in the commit message of `9487a6a`.

---

## 6. Gate and scope

`_audit/2026-07-30-w19b-fallback-arm-gate.txt` -- **70/70 PASS, 0 FAIL, 0 SKIP** on the committed
tree. `visual_regression` PASS on all 16 baselines, byte-identical: the only non-comment change is
in a test file, and comment text does not move pixels. `build_integrity` confirms committed
deliverable == fresh build of HEAD. `ascii_guard` 822 files 7-bit.

**Not touched:** `master`, any product behaviour, the fallback values themselves, the W19 freeze
report, and the two m-walk baselines.

**One discrepancy with the resume order, reported not acted on:** the order stated the old
`w19-bar` worktree was swept. It is still present at
`D:\claude-workspace\_worktrees\deepdive-rehearsal\w19-bar`. Left alone -- worktree teardown is the
lead's, and removing one that may still be in use is the documented hazard.
