# Visual-regression baselines

These PNGs are the **reference pixels** for `test/visual_regression.cjs`. A baseline is a claim
that *this is what the app is supposed to look like*. Treat changing one the way you would treat
changing an assertion, because that is what it is.

## Regenerating them (deliberately)

```bash
npm run build          # writes dist/index.html AND the deliverable -- the check reads the deliverable
npm run vr:update      # re-captures every baseline for THIS platform, rewrites manifest.json
git add test/baselines && git diff --cached --stat
```

The `npm run build` line is not a formality. `vr:update` captures whatever is in the
**deliverable** — and until `tools/sync-deliverable.mjs` was wired into the build, `npm run build`
did not write that file (only the `make build` target did, and `make` is not installed on the dev
box). Running this recipe on a stale deliverable re-baselines the **old** pixels and commits them
as the new reference: the check then certifies the past, forever, and no diff shows it. This step
now syncs the deliverable by construction, so the trap is closed — but that is *why* the line is
there.

Then **look at the PNGs that changed.** `git diff` cannot show you a picture; open them. If a
baseline moved and you cannot say *why* in one sentence, do not commit it — regenerating without
looking is exactly how a regression becomes the new reference, and it is the single way this check
can be defeated.

`--update` refuses to write a capture that fails the blank-page ink floor, is still animating, or
throws a page error, so it cannot silently enshrine a broken render. It will not protect you from
enshrining a *wrong but healthy* one. That part is your job.

## Why the filenames carry a platform

`walk-light-win32-chromium149.png`

The app renders body text in a **system font stack** (`-apple-system, "Segoe UI", Roboto, ...`).
The glyphs are Segoe UI on Windows and something else on the `ubuntu-latest` CI runner — and even
with an identical font file, DirectWrite and FreeType do not rasterise the same bytes. There is no
pixel tolerance that absorbs *a different typeface* while still catching a 1px shift, so
cross-platform pixel baselines are not a tuning problem, they are a category error. Playwright's own
snapshot tool makes the same call and names its files `-win32` / `-linux`.

So baselines are keyed by `platform + chromium major`, and on an environment with no baselines the
check **exits 2 = SKIP**: the gate prints SKIP, not a PASS it did not earn.

### To cover an environment (e.g. CI)

Run `npm run vr:update` **on that machine** and commit the artifact. Do **not** generate baselines
for a platform you cannot run the app on — a reference nobody has verified is worse than no
reference, and this repo has the scar tissue to prove it.

## What is covered

16 baselines: the `home` route, the `walk`/`drill`/`sys`/`num`/`wb` panes, light + dark, at
1280x800; the accent rebind across all **six rooms** (walk pane, light); and mobile 390x844
(walk, light + dark).

**Not covered**, on purpose: the `viz` pane (WebGL — a Playwright screenshot cannot see that layer
at all; `visual_pane_smoke` reads its drawing buffer directly instead), the overlays (stateful and
shuffled; `overlay_deadzone` owns their behaviour), hover/focus/active states, and the other 40
topics (46 x 10 is not a baseline set, it is a liability; `rail_integrity` and `topic_contract` own
per-topic content).

## THE TRAP THAT WILL BITE YOU: Playwright ships TWO Chromiums

`chromium.launch()` in headless mode launches **`chromium_headless_shell`**. The moment you pass
`executablePath`, it launches the **full `chrome.exe`** instead — and `check_all.py` always passes
one, because the gate resolves `CHROME=...` so it has no hardcoded paths.

**They do not rasterise text the same way.** Measured here: same build, same baselines, same code —

| launched as | worst diff |
|---|---|
| `chromium_headless_shell` (bare `node test/...`) | 9 px — PASS |
| full `chrome.exe` (via the gate) | **13,804 px — FAIL, all 16** |

Nothing in the app had changed. `browser.version()` returns the *same string* for both, so the
manifest could not have caught it either. The check now resolves **one** executable explicitly
(`process.env.CHROME || chromium.executablePath()`) so both paths launch the same binary, and the
manifest records which one. If you ever see a baseline "drift" for no reason, suspect this first.

## Determinism, and the numbers worth knowing

Each capture pins viewport, DPR, theme, locale, timezone, reduced-motion, forced-colors, colour
profile, **the browser binary**, and **seeds `Math.random`** (`dShuffle()` shuffles drill decks — an
unseeded check measures the RNG, not the render). Nothing is captured until every animation across
**all 18 roots** — document plus 17 shadow roots — is finished or pinned, *and* two consecutive
frames come back byte-identical.

- **Noise floor**: **0 changed px**, on all 16 baselines, across 9 consecutive runs and 2 full gate
  runs. (The worst jitter ever seen in this app on *any* binary was 9 px at a channel delta of
  6/255 — imperceptible text-AA.)
- **Budget**: **32** changed px — ~3.5x the worst jitter ever observed, ~700x below the weakest real
  signal. Not larger, because a 120-px budget would let a 10x10 icon change colour *completely* and
  still go green. Not zero, because a check that cries wolf gets ignored.
- **Signal**: one `1px` -> `2px` border on a single rule *inside a shadow root* moves
  **22,656 - 58,086 px** and reddens **14 of 16** baselines. The two that stay green are `home-light`
  and `home-dark` — the home route renders no `.card`. It fails exactly where the rule paints, and
  passes exactly where it does not.

The budget is on the **count**, not the magnitude: a faint colour drift across a *large* area is
still thousands of pixels and still goes red. Small-and-faint is forgiven; faint-but-everywhere is
not.

Verify the machinery yourself any time: `npm run vr:prove` races the fade on purpose, then stretches
every animation to 20s and shows the stillness gate landing the capture exactly on the at-rest
baseline while those animations still have 19 seconds to run.
