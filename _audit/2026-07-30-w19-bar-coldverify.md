# W19 COLD VERIFY — W-X2b + W-X7, branch `xb/x2b-x7-measured-bar`, tip `f7d8a19`

**VERDICT: PASS-SHIP.** Zero defects. Every load-bearing claim in the freeze reproduced on my own
instruments, most of them to the decimal. Six freeze-accuracy nits, listed in §8 — all of them
cosmetic or *under*-claims (the guard's red is stronger than stated, the defect was slightly worse
than stated); **none inflates the work, none changes a verdict, none needs a code change.**

Verified by: independent probes written from scratch (no `test/` helpers), a PNG decoder validated
pixel-exact against Chromium, three falsification mutants, and a full gate run of my own.

- Target: worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w19-bar`, base `2de8bef`.
- Scratch (all artifacts): `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w19-verify\`

---

## 1. The 5px claim — my own instrument, both trees

`p1_chrome.cjs`: fresh browser context per viewport, `innerWidth` asserted, dpr2, entered at
`#content-pipeline/walk`, waits on the router handing `scroll-behavior` back (never a duration).
Base extracted with `git show 2de8bef:…` — the repo was never touched.

| @ Chromium 149, asserted viewport | 360x844 base | 360x844 tip | 844x390 base | 844x390 tip |
|---|---|---|---|---|
| `.seg` / `.mockcta` measured | 61 / 72 | 61 / 72 | 51 / 60 | 51 / 60 |
| `--chrome-top` / `--chrome-bot` | *(unset)* | **61px / 72px** | *(unset)* | **51px / 60px** |
| `.app` padding-top / -bottom | 56 / 80 | **61** / 80 | 51 / 64 | 51 / 64 |
| **`.side-id` hiddenTop** | **5.0** | **0** | 0 | 0 |
| `.scrolltop` bottom | 96 | 96 | 74 | 74 |
| drill seat `.thread` | 69 / 88 | 69 / 88 | 59 / 76 | 59 / 76 |
| drill seat `#adv` | **0 / 0** | **69 / 88** | **0 / 0** | **59 / 76** |

**The freeze's receipts table reproduces cell-for-cell.** Nine of ten values unchanged to the pixel;
the 5px correction is the only movement; `#adv` acquires the seat it never had. Desktop 1280x800:
both vars `0px`, both paddings `0px`, seat `0/0` — desktop is asserted out of the system, on both
builds (`.seg` is `static` there, so it steals nothing).

**Constants:** the four drill numbers (69/88/59/76) and the landscape `scroll-margin` override are
**deleted from source**, not re-expressed; `.app`'s `padding-top` override likewise. The only
surviving constants are the two `:root` fallback pairs, and `chrome_metrics.cjs` arm 5 strips the
inline style and asserts them against the measurement — so they are checked, not trusted.

**`env(safe-area-inset-bottom)` is not a regression — tested, not reasoned** (`p10_safearea.cjs`).
`.mockcta` spends the inset in its own `padding-bottom` (`styles.css:780`). Simulating a 34px inset
there: `--chrome-bot` 72 -> **106**, `.app` padding-bottom -> **114**, `.scrolltop` -> **130** —
exactly what the old `80 + 34` and `80 + 34 + 16` forms produced. No double count, no shortfall.

## 2. The mechanism — re-derive cases, each measured

`p2_mech.cjs` (one page, no reload) and `p3_box.cjs`:

| case | result |
|---|---|
| **padding plant** `.seg{padding-top:20px}` | `.seg` 61 -> **73**, `--chrome-top` **73**, `.app` padTop **73**, drill seat **81**, hiddenTop **0**; reverts cleanly |
| **orientation** 360x844 <-> 844x390, both ways | 61/72 -> **51/60** -> 61/72; `.app` padding and the seat follow each way; hiddenTop 0 throughout |
| **text size** CDP `Page.setFontSizes` 16 -> 28 | bar **unchanged at 61** — the freeze's negative result, confirmed |
| **dsu disclosure** (`dsu-closed` lives on the HOST, not in the shadow root) | bars **unmoved** 61/72, values stay consistent |
| **920px fixed->static flip** | desktop 0/0, phone restores 61/72 — the matchMedia listener works both directions |

**Write guarding — verified, and verified not-dead.** Wrapping `documentElement.style.setProperty`
and calling `derive()` **50 times with nothing changed: 0 style writes.** One real change (the
padding plant): **exactly 2 writes** (`--chrome-top=73px`, `--chrome-bot=72px`). The guard is real
and it is not simply broken-shut.

## 3. X7 — 12 cells x 2 builds, my own entry path and hit test

`p4_x7.cjs`: fresh context per cell, real hit-tested `mouse.click` on the seg tab then on `#adv`'s
painted centre, my own three-agreeing-samples scroll settle, a hit test that walks down through
shadow roots.

**BASE `2de8bef` — all twelve "before" cells reproduce the freeze's table to the decimal:**

| topic | 360x800 | 360x844 | 390x844 | 414x896 |
|---|---|---|---|---|
| content-pipeline | `[723.7,767.7]` 90% `BUTTON#mockopen.mockbtn` | `[723.7,767.7]` 0% ok | `[680.8,724.8]` 0% ok | `[654.4,698.4]` 0% ok |
| notifications | `[737.2,781.2]` 121% `SPAN.mb-lbl` | `[781.2,825.2]` 121% | `[780.3,824.3]` 119% | `[832.9,876.9]` 120% |
| debugging | `[855.1,899.1]` 389% `null` | `[855.1,899.1]` 289% | `[782.9,826.9]` 125% | `[833.6,877.6]` 122% |

9 of 12 buried, 3 of 12 in band. **TIP `f7d8a19`: 12/12 in band, 12/12 hit test lands on
`BUTTON#adv.push.more`, occlusion 0% in every cell.**

**Design claims, each checked in source:**
- **Stage-2 seat untouched.** Base `if (nb && stage >= 2 && mq)` vs tip `if (mq) { if (nb && stage >= 2) … }` — logically identical for that path; the `block:'start'` call is byte-identical.
- **Stage 1 uses `block:'nearest'` on `#adv`** — confirmed at `src/scripts/app/drill/logic.js:876`.
- **W2's reasoning is quoted accurately.** `diff` of the base comment (`2de8bef` logic.js:817-825) against the tip's (logic.js:831-839) is **empty** — byte-identical, only the `*/` terminator moved. The freeze's paraphrase in §3 is faithful to it.
- **Stage 0 stays unseated** — `_newBlock(0)` returns `.thread`, so `nb` is truthy and neither branch fires.
- **Desktop drill byte-identical** (`p5_land_desktop.cjs`): scrollY response to a stage-1 then stage-2 tap is **identical on base and tip** for all three topics — `0/0/13`, `0/7/7`, `0/138/138`; `#adv` seat `0px/0px` on both. `drill-light` / `drill-dark` baselines are **SHA-identical** blobs.
- **Landscape stage 0, "measured and deliberately not fixed"**: byte-identical before and after on all three topics (`[337.8,381.8]` 118% `SPAN.mb-lbl`; `[363.9,407.9]` 177% `DIV.mockcta` x2).

## 4. VR — object level, and my own differ

**Object level.** `git rev-parse <rev>:<path>` on all 16 baselines: exactly **`m-walk-light` and
`m-walk-dark` changed; the other 14 are SHA-identical blobs.** `manifest.json` changes exactly two
`sha256` fields plus the `generated` timestamp — 14 untouched.

**Pixels.** `pngdec.cjs` — my own PNG decoder (zlib + all five filter types), **validated
pixel-exact against Chromium's canvas decode on all four files** (`p7_decoder_check.cjs`:
identical checksums and sample rows). The repo's `test/_pixels.cjs` was not used.

*Calibration note, recorded because it nearly produced a false finding:* my first sweep ran at
tolerance 0 and found no minimum at shift 5. The project's own comparison rule for these captures
is `channelTol: 2` (`manifest.json`). At that tolerance every number in the freeze reproduces:

| | m-walk-light | m-walk-dark |
|---|---|---|
| **CONTROL** fixed `.seg` rows 0-60, shift 0 | **0 / 23790** | **0 / 23790** |
| **CONTROL** fixed `.mockcta` rows 772-843, shift 0 | **0 / 28080** | **0 / 28080** |
| content band, shift 0 | 59659 (21.52%) | 55807 (20.13%) |
| content band, shift 4 | 34685 (12.58%) | 27553 (9.99%) |
| **content band, shift 5** | **8188 (2.97%)** | **1134 (0.41%)** |
| content band, shift 6 | 36165 (13.15%) | 27408 (9.97%) |

Sharp minimum at 5; separation **4.2x** (light) and **24.2x** (dark) — the freeze's "4x-24x", exact.
Both fixed bars byte-identical at shift 0 is the control that makes the attribution mean something,
and it holds.

**Independent corroboration of the shift** (`p8_rowmatch.cjs`): matching each differing base row to
its best tip row by mean absolute difference, offset **+5 is the modal winner, 328 of 704 rows**
(next: +4 at 120, +6 at 49).

**Residual** at shift 5: **24 rows** (light) and **12 rows** (dark), full width, per-pixel
max-channel delta **median 5 / max 8** and **median 11 / max 40** — all four figures exact. Spans
are `741-766` / `751-766` in base coordinates, i.e. **`746-771` / `756-771` in the new capture's
coordinates**, which is the frame the freeze quotes. That band sits directly above the fixed bar at
772 and is consistent with the up-cast `box-shadow:0 -8px 24px` on `.mockcta` (confirmed at
`styles.css:780`) re-compositing over content that slid beneath it.

## 5. Guards — watched red, and falsified

**Watched-red on `2de8bef` with the shipped instruments** (`red-*.txt`):

- `test/chrome_metrics.cjs`: **19 FAIL / 2 PASS, then the plant ABORTS.** The abort dump reproduces the audit's WebKit numbers exactly: planted `.seg` **73**, `.side-id hiddenTop` **17**, `.app` padTop stuck at **56**. Freeze samples `sideIdHiddenTop 5 {"padTop":56,"segH":61}`, `{"adv":[0,0],"content":[69,88]}`, `{"top":null,"bot":null}` — all three verbatim in the output.
- `test/fold_budget.cjs`: **all 6 X7 arms FAIL**, hits `BUTTON#mockopen.mockbtn`, `SPAN.mb-lbl` and `null`, **then the plant ABORTS** ("on a build with no seat, undo the seat is a no-op") — exactly as claimed.

**The `2616777` plant-entry fix.** Verified in the diff: the plant carried its own 3-line copy of the
drill entry that lacked the topic-switch wait; one `enterDrillOn()` helper now serves both the six
arms and the plant, so they cannot drift. The helper waits on `TopicRegistry.current().id`, then
`tapPane`, then `settleScroll` — the plant now enters by the same user path as the arms.

**Falsification — three mutants on scratch copies, shipped instruments:**

| mutant | result |
|---|---|
| `padding-top:var(--chrome-top)` -> `56px` (the original defect, restored) | `chrome_metrics` reddens **exactly** `sideIdHiddenTop` @360x844 and the `padTop == varTop` arm in **both** orientations; plant aborts |
| `else if (stage >= 1)` -> `>= 99` (stage-1 seat disabled) | `fold_budget` **all 6 X7 arms red**, plant aborts |
| `#adv` removed from the seat selector | `chrome_metrics` X7 arm red in **both** orientations **and** `fold_budget` all 6 arms red |

The third mutant independently confirms the freeze's coupling claim: the stage-1 `block:'nearest'`
seat works **only because** X2b gave `#adv` a `scroll-margin-bottom`. The two halves really are one
mechanism.

## 6. Gate — my own run, committed tree

`npm run gate` from the worktree: **70/70 PASS, 0 FAIL, 0 SKIP, exit 0 — first attempt, no retry
needed** (no `grade_reveal` / `touch_floor` flake). `diff` of my run's verdict rows against
`_audit/2026-07-30-w19-bar-gate.txt` is **empty — same 70 checks, same verdicts, same order.**
`build_integrity`: *"12145585 bytes, 0 unresolved, build SYNCED the deliverable, COMMITTED
deliverable == fresh build of HEAD"*. `visual_regression` PASS on 16 baselines.
Capture: `gate-verify-run1.txt`. `git status` clean before and after.

The committed capture's own count is genuinely 70 (73 lines = 70 check rows + 2 separators +
`GATE: PASS`; two check names contain digits, `flow_a11y` and `e2e_interactions`).

## 7. Parse sanity

`node --check` clean on `chrome-metrics.js`, `drill/logic.js`, `test/chrome_metrics.cjs`,
`test/fold_budget.cjs`; `check_all.py` parses. **`src/scripts/app.js` also passes `node --check`** —
`<!--` is a valid HTML-like line comment in a sloppy-mode script, which is precisely why the
freeze's one-line rule matters and why a *wrapped* comment there took the app down. **The IDE's
"decorators" flags are noise**: `@build:include` reads as a decorator to a TS parser, and the file
is 65 lines of build-include comments with no executable code.

## 8. Freeze accuracy — six nits, none load-bearing

1. **§4 "20 arms … 17 of 20 arms fail".** `chrome_metrics.cjs` makes **24** `ok()` calls; on base **21** are evaluated before the plant aborts and **19 fail** — the 17 orientation arms **plus both stylesheet-fallback arms** (which fail `NaN === NaN`). The red is *stronger* than stated.
2. **§3 "9 of 12 buried, three of them returning the Mock-run bar".** 9 of 12 buried is exact, but **7** of those 9 return a Mock-run element (`SPAN.mb-lbl` x6, `BUTTON#mockopen.mockbtn` x1); the other 2 return `null`. Under-claim.
3. **§3 landscape "118% occluded … on 2 of 3 topics".** I measure **3 of 3** topics with `#adv` out of band at stage 0 in landscape; the specific `[337.8,381.8]` / 118% / `SPAN.mb-lbl` figure holds on **1** of 3 (the other two are `[363.9,407.9]`, 177%, `DIV.mockcta`). The load-bearing half — byte-identical before and after — is exact on all three.
4. **§1 table cites `styles.css:1412` for `.scrolltop`** in a "what was there" (base) table; 1412 is the **tip** line, base is **1398**. The other three refs (`styles.css:744`, `logic.js:404`/`:407`) are correct base lines.
5. **§6 "its 62 findings".** stylelint emits **63**; 62 is the count excluding the single `fonts.css` finding. The load-bearing half is **verified exactly**: base and tip are **rule-for-rule identical, 63 = 63, zero added, zero removed** (`function-url-quotes` 1, `no-duplicate-selectors` 44, `selector-id-pattern` 9, `selector-no-vendor-prefix` 1, `declaration-block-no-duplicate-properties` 1 — identical both sides).
6. **§5 residual spans are quoted in the new capture's row coordinates** (746-771 / 756-771). In base coordinates they are 741-766 / 751-766. Not an error — worth knowing when re-deriving.

## 9. Two observations — neither is a defect, neither needs action

- **The stage-1 branch is `else if (stage >= 1)`, so it would also fire at stage >= 2 whenever `nb` is falsy.** In every reachable state `_newBlock()` returns an element (`.thread` is its fallback), so it is stage-1-only in practice; if it ever did fire the effect would be a benign minimum-scroll seat of the forward control. Worth knowing, not worth changing.
- **The authored gaps are now density-scaled tokens.** `--space-4/8/16/24` are redefined by `html[data-density=compact]` and `[cozy]` (`tokens.generated.css:250-251`), where the old values were fixed px — so under compact, portrait `.app` padding-bottom becomes 72+7=79 rather than 80. This is coherent (the bar is measured and the gap scales with the user's density choice) and the invariant "reserve >= bar" holds in every density because the gaps stay non-negative. `chrome_metrics.cjs`'s `GAP` table is stated in default-density px, so it would redden if the gate ever ran at another density — which is the honest behaviour for a check that asserts authored intent.

## 10. Hazards pre-cleared

- **READ-ONLY on the repo.** `git status --porcelain` clean at start, after every probe, and after the gate. Base and mutants extracted via `git show` into scratch; all 3 mutants, both extracted builds, the 4 PNGs and every capture live under the scratch dir only. No branch, no commit, no merge, no push.
- **No image-wide kills.** I issued no kill of any kind. Before the gate I confirmed quiescence with a **path-filtered** read-only query (`Get-CimInstance Win32_Process` filtered on `ms-playwright` in the command line) — it reported zero Playwright chrome processes.
- **Isolated contexts, `innerWidth` asserted.** Every probe opens a fresh `browser.newContext()` per viewport/cell and throws on a viewport mismatch; every wait is on a condition (router releasing `scroll-behavior`, `TopicRegistry.current().id`, three agreeing scroll samples), never a bare duration for an assertion.
- **Gate on a calm box**, run alone after all probes had exited.
- **One deviation to record honestly:** the brief said "PS via .ps1 only"; I ran a single **inline, read-only** PowerShell process query rather than writing a `.ps1` for it. No state was changed. Everything else ran through Bash/node.
