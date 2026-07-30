<!-- Committed VERBATIM from the independent cold verification run by w16-verifier on 2026-07-30.
Not edited by the builder: the two BLOCKING findings below are defects in the builder's own gate
check, and a report that the accused rewrites is not a receipt. The response -- what was
reproduced, what was fixed, and the one place this verdict is itself wrong (mutant M4 is a no-op)
-- is the addendum in _audit/2026-07-30-w16-print-truth.md, not an edit to this file. -->

# W16 / W-X1 "Print truth" — independent cold verification

**VERDICT: FINDINGS — 2 BLOCKING (both in `test/print_truth.cjs`, neither in the product), 7 NON-BLOCKING (documentation accuracy + coverage). The three product fixes X1 / X6 / X9 are CORRECT and independently reproduced. The new gate check is not.**

Target: worktree `D:\claude-workspace\_worktrees\deepdive-rehearsal\w16-print`, branch `xb/x1-print-truth`,
tip `fad9bf5`, base `d481901`. Repo untouched: `git status` clean and tip unchanged at start and finish.

Verifier scratch: `C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\bfc4e186-9eb0-4148-a383-84020244f407\scratchpad\w16-verify\`

---

## Instruments I built, and their negative controls

Nothing below leans on the builder's reader.

| instrument | what it is | negative control, demonstrated |
|---|---|---|
| `vprint.cjs` | my own Playwright print harness — own boot, own cram-open, own geometry read, own `page.pdf` | run against the **pre-fix** build it reports `clipped=1828/5122`, `panelMaxH=1009px`, `overflow=hidden`, all `break-inside:auto`, every print-qa token empty — i.e. it can see the defect |
| `vpdf.py` | per-page PDF text via **pypdf** + **pdfminer.six/pdfplumber** — a different codebase from the shipped latin1/CMap parser | on the pre-fix PDFs it finds the FIRST heading on page 1 and the LAST heading nowhere; on the post-fix PDFs it finds the last heading on the last page |
| `pdftotext` + `/Type /Page` object count | third and fourth opinions on page count | used only where the shipped counter and pypdf disagreed; all four agree against the shipped one |
| `mutate.py` → 4 mutant deliverables | re-cap, trailing-blank-page, blanket-avoid, hidden-first-heading, built from the **fixed** build by unique-anchor replacement (anchor uniqueness asserted, `occurrences=1`) | each drives the SHIPPED check and is expected to redden a named arm |
| `blastradius.cjs` | drives File→Print with the cram sheet **never opened** | pre-fix it reports `clipped=1784`, 1 page; post-fix `clipped=0`, 3 pages |

---

## BLOCKING 1 — `print_truth` fails on the committed tree in 5 of 8 runs, on a build that is provably correct

The freeze reports `print_truth PASS`, and my **full gate re-run also passed (68/68, `GATE: PASS`)**. But run the
check on its own and it is a coin flip. Eight runs of the *identical* committed tree, same command the gate uses:

| run | conditions | outcome |
|---|---|---|
| baseline (scratch path) | box loaded | **ABORT** — "PDF text extractor is DEAD ... 0 chars over 3 pages" |
| repo runs 1, 2, 3 | box loaded | **ABORT** — same message, 3/3 |
| repo run 4 | box quiet | **FAIL** — `the LAST section is printed ON THE FINAL PAGE ... found on page 0 of 3` |
| repo runs 5, 6 | box quiet | PASS |
| inside the full gate | box loaded | PASS |

Captures: `flake-repo-1..6.txt`, `run-after.txt`, `gate-rerun.txt`.

**Root cause, isolated to one constant.** `parsePdf`'s `textOf()` bails at `depth > 4`
(`test/print_truth.cjs:185`) while it also propagates the *inherited* XObject map into every recursion
(`myX = Object.assign({}, xobjs, subRes(head,'XObject'))`, then iterates all of `myX`). So `depth` counts path
length through a cross-product of the resource maps, not nesting depth. Chromium emits the flagship page with a
variable number of Form XObjects for byte-identical input — **5 forms in the artifact the builder committed, 24
forms in every one of my renders** — and past that the decoder never reaches a `Tf`, so `cur` stays null and
pages decode to nothing.

Proof, browser-free and decisive: patching **only** `depth > 4` → `depth > 40` makes the dead file extract

```
DEAD-file  SHIPPED(depth>4): [0,0,0]   PATCHED(depth>40): [1657,1664,1468]  lastHeadPage=3
ALIVE-file SHIPPED(depth>4): [1657,1664,1468]  PATCHED(depth>40): [1657,1664,1468]  lastHeadPage=3
```

— byte-for-byte the per-page character counts of the working artifact. (`parser_debug.cjs`, `parser_stress.cjs`.)
The two PDFs are structurally identical everywhere else: 20 fonts, 7 `/ToUnicode` refs, 694 `<hex> Tj`, 245 `Tf`,
no `/ObjStm`, no XRef streams, 0 truncated object scans, and the font map builds correctly in both.

**The app is fine in every failing run.** pypdf and pdfminer on the PDFs those runs produced: 3 pages, first
heading page 1, last heading page 3, `1657/1664/1546` chars. The failures are the instrument's, not the artifact's.

### The sharper half: a partially-dead extractor buys a RED, and the liveness control waves it through

Run 4 is the one that matters, because it is not an abort — it is a **false failure reported as an app defect**:

```
ctrl  [content-pipeline] extractor liveness: FIRST heading "The spine ..." found on page 1 of 3
      (1657 chars extracted; per-page 1657/0/0)
FAIL  [content-pipeline] the LAST section is printed ON THE FINAL PAGE ... found on page 0 of 3
```

`per-page 1657/0/0` — pages 2 and 3 read as empty, the control passed anyway because it only asks about page 1,
and the arm then delivered a verdict on pages it could not read. The freeze's stated principle (§3, and repeated
in `check_all.py`) is *"A dead extractor must not be able to buy a green OR a red."* That holds only for a
**totally** dead extractor. Control 3 has no coverage of partial death, and the tell (`/0/0`) is printed and
ignored.

**Suggested fix (both defects, ~2 lines):** raise/remove the depth cap and stop passing the inherited XObject map
down the recursion (`seen` already prevents cycles, which is what the cap was standing in for); and make control 3
assert that **every** page decoded a non-trivial amount of text, not just that page 1 contains the first heading.

---

## BLOCKING 2 — `pdfPageCount` under-counts any multi-node page tree, and the freeze publishes the wrong number twice

`_audit/w16-print-before-after/before-print-qa.pdf` is **11 pages**. The shipped counter says **8**.
`after-print-qa.pdf` is **12**. The shipped counter says **8**.

Four independent readers agree against it: `pypdf` root `/Count = 11` with 2 kids, `len(pages) = 11`;
`pdfminer/pdfplumber` 11; `pdftotext` 11 form feeds; and 11 `/Type /Page` objects in the file.

**Cause.** That PDF has a three-node page tree. In byte order:

```
node @68682: /Count 8  /Kids 8    <- an intermediate node
node @68801: /Count 3  /Kids 3    <- an intermediate node
node @68887: /Count 11 /Kids 2    <- the ROOT (its two kids are the nodes above)
```

`pdfPageCount` takes the **first** `/Type /Pages` in the file (`/Count 8`). `parsePdf` takes the node with the
**most kids** (`8 > 3 > 2`) — the same wrong node. So the arm that exists to cross-check them,
`the page tree agrees with the page count`, **cannot catch this: both readers share the bug**. (Ironically the
function's own fallback branch, `(s.match(/\/Type \/Page[^s]/g)).length`, would have returned 11.)

**What it put in the freeze.** §7 states: *"The audit reported Print Q&A at 11 A4 pages; this wave measures 8 ...
The difference is margins: the popup declares no `@page`, so under `preferCSSPageSize` it paginates at
Playwright's default margin."* That reconciliation is **false**. The audit's 11 was right; the 8 is a counting
bug. The freeze's own supporting evidence argues against its explanation — *"114,633 B vs the audit's 114,518 B —
essentially the same document"* — two near-identical documents cannot have different page counts. §4's
`pdf summary` likewise publishes `"print-qa":{"pages":8}` for an 11-page file. This is the one place the report
congratulates itself on naming a discrepancy "rather than quietly reconciling" it.

**Blast radius today: none in the product, none in the gate's verdict.** No arm asserts the print-qa page count,
and the cram PDFs (1 / 3 / 7 pages) have single-node trees and are counted correctly. It is a **latent
false-green**: if a cram sheet ever crosses into a multi-node tree, `parsed.pages` becomes the intermediate node's
kids, `lastPageIdx` shrinks with it, and a last heading landing on that node's final page passes while the
remaining pages are never examined.

---

## What is CORRECT — verified, not accepted

### X1 — the sheet prints whole. Confirmed with my own instrument end to end.

| | flagship `content-pipeline` | `consistency-models` |
|---|---|---|
| `#cram` scrollHeight @681px (mine) | 2774 | 6068 |
| clipped BEFORE (mine / freeze) | **1828 / 1828** | **5122 / 5122** |
| clipped AFTER (mine / freeze) | **0 / 0** | **0 / 0** |
| `panelMaxH` BEFORE → AFTER | `1009px` → `none` | `1009px` → `none` |
| panel overflow BEFORE → AFTER | `hidden` → `visible` | `hidden` → `visible` |
| `.cram-jump` BEFORE → AFTER | `flex` → `none` | `flex` → `none` |
| real A4 pages BEFORE → AFTER (mine) | **1 → 3** | **1 → 7** |
| last heading page, AFTER (pypdf **and** pdfminer) | **3 of 3** | **7 of 7** |

Every load-bearing number in the freeze's X1 table reproduced exactly. The committed review PDFs are intact
(all six blobs byte-identical to the working tree) and independently confirm 1 / 3 / 1 / 7 pages with the last
heading absent before and on the final page after.

The freeze's central mechanical claim is right and was worth finding: the A4 content box is 680px, inside the
`<=919px` breakpoint, so **the printer lays the sheet out in the app's mobile layout** and the operative cap is the
bare `max-height:100vh` (base `src/styles.css:2138`, HEAD `:2163`), not the desktop `calc()` at `:474`. I measured
`panelMaxH = 1009px` pre-fix, which is `100vh` at the A4 box — the desktop rule would have given 764px.

### X6 — the Print Q&A document gets its tokens. Mechanism verified in source and live.

Pre-fix, in my run: `hasRootRule: false`, and `--space-760 / --space-40 / --font-size-display /
--font-weight-heavy / --line-height-spacious` all empty. Post-fix: `hasRootRule: true` and all five resolved.
Computed sizes match the freeze's AFTER column exactly — h1 24px/800, h2 16px, answer 13px, sig 9px, code 11.7px,
body `max-width: 760px`, article `margin-bottom: 26px`.

The "cannot rot" argument holds: the harvester's regex matches **45 of 45** `var()` references in that CSS string
(32 unique, none missed, no fallback forms present).

### X9 — present, modest, and `.cs-sec` is correctly excluded.

Under print emulation in the shadow root I measure `.cs-one / .cs-ha / .cs-trap / .cs-dec / .cs-num / .cs-30 /
.cs-tells li / .cs-spine li` = `avoid`, `.cs-st` `break-after: avoid`, `.cs-sec` = `auto`, planted control = `auto`.
No page-per-section explosion: 3 and 7 pages against content heights of 2776 and 6070 — exactly
`ceil(H / 1009.13)`, i.e. the fragmentation added zero pages. `.cs-cue` is excluded correctly (it is an inline
`<span>` label *inside* the protected containers, `cram-derive.js:92`), though the freeze does not say so.

### The watched-red capture is exact

Running the shipped check against the pre-fix build reproduces **36 FAILED**, first failure identical to the
freeze's transcript. Not 35, not 37.

### The final-page strengthening (commit `59221cb`) is real and load-bearing

The source claim checks out — the extractor walks `/Type /Pages /Kids` in page order and reports per page. I broke
it deliberately with a trailing blank page appended to the committed 3-page artifact:

```
ORIGINAL 3pp | liveness=true | WEAK arm "anywhere in doc": PASS | SHIPPED arm "on FINAL page": PASS (page 3 of 3)
MUTANT  4pp | liveness=true | WEAK arm "anywhere in doc": PASS | SHIPPED arm "on FINAL page": FAIL (page 3 of 4)
```

The weak form passes where the shipped form fails. The strengthening is not decorative.

### The shipped arms can be broken — mutation battery on the FIXED build

| mutant | result |
|---|---|
| re-cap (revert the two resets) | **10 FAIL**, led by `.cram-panel has NO height cap on paper max-height=1009px`; pages back to 1/1; both final-page arms red |
| hidden first heading | control 3 correctly refuses; and in the same run ARM C went red specifically (`found on page 0 of 3`) |
| blanket `*{break-inside:avoid !important}` | **control 2 ABORTED the run** — `the break-inside control read "avoid" -- the arm below cannot fail, so it is not run`. Exactly as designed. |
| trailing blank page | ARM C red (above) |

### VR and screen-media containment

- `git diff --stat d481901..fad9bf5 -- test/baselines/` is **empty**; 0 files changed, all 16 PNGs present.
- `visual_regression` **PASS** in my own gate re-run (16 baselines, `win32-chromium149`, matched committed pixels).
- Screen media provably untouched: the `src/styles.css` change occupies new-file lines **509-536**, entirely
  inside the `@media print` block spanning **505-540** (brace-balance verified). All four `base-styles.js`
  additions are inside BASE_SHEET's `@media print{...}` block, which closes before the `@media (max-width:919px)`
  block. `print-qa.js` only affects the `window.open` document. The deliverable diff contains nothing but these
  three changes and their comments.

### Parse sanity — the IDE flags are noise

`node --check` clean on `print_truth.cjs`, `base-styles.js`, `print-qa.js`, `make-pdfs.cjs`;
`python -m py_compile` clean on `check_all.py`. The `print_truth.cjs:585` flag is the `}` closing `main()`, which
is hoisted above its call site at `:356` — valid, and the file parses.

### `.gitattributes`

`*.pdf binary` takes effect (`git check-attr` → `text: unset`, `diff: unset`) and all six committed PDFs
round-trip byte-exactly between blob and worktree. The claim and the reasoning both hold.

### Full gate

**68/68 PASS, `GATE: PASS`** on the committed tree (`gate-rerun.txt`). Same 68 check names as the committed
capture, none missing. Note this passed *while* the standalone check was failing 5 runs in 8 — see BLOCKING 1.

---

## NON-BLOCKING findings

1. **`1289px` is a 1280x800 measurement used in an argument about the 1009px A4 box — and it is in shipped
   source.** `base-styles.js:64` and freeze §2 X9 both say *"the tallest measures 1289px against a ~1009px A4
   content box."* 1289 is the audit's desktop figure (`audit:134`, "sec0 h=1289 vs a 762 clip"). At the A4 box I
   measure the tallest `.cs-sec` at **2173px** (`consistency-models` heights: 2173/516/584/1031/905/453/153). The
   conclusion is unaffected and in fact strengthened — 2173 is more than two A4 boxes tall — but the number is
   wrong by 68% and it lives in code, where the next reader will trust it.

2. **The clipped-px numbers are never reconciled to the audit's.** The audit measured 1456px (65.6%) and 3059px
   (80.1%) at 1280x800; the wave measures 1828px and 5122px at the 681px A4 box. Both are right for their
   viewport and the wave's is the correct convention — but the freeze reconciles the print-qa page discrepancy
   explicitly and leaves this one silent, which reads as a contradiction of the audit rather than a refinement.

3. **§1 attributes Chromium-only numbers to a three-engine claim.** *"in Firefox 151, Chromium 149 and WebKit 26.5
   alike ... measured 1828px of 2774 gone"* — 1828/5122 were measured only in Chromium at the A4 box. The
   cross-engine evidence is the audit's 1456/3059 at 1280x800. The finding is genuinely cross-engine; these
   particular numbers are not.

4. **Line citations mix two file versions without saying so, and two do not resolve.** `:474 / :479 / :509 /
   :2120 / :2122` index the **base** file; `:525 / :531 / :536` index the **fixed** file (both correct in their
   own frame — the fix adds exactly 25 lines). `:2139` is off by one: the `max-height:100vh` rule is at base
   `:2138` (HEAD `:2163`); it was inherited from audit X8 rather than re-verified. `:2144` resolves to
   `@media (pointer:coarse){`, not "the space it is given".

5. **The gate check never exercises the path that made X1 a P1.** The audit's blast radius is that
   `styles.css:508` has **no `.open` requirement**, so a native File→Print from any view emits the sheet.
   `print_truth` always opens the sheet via `#cramopen` first. I tested the other path directly: with the sheet
   never opened (`cramOvOpen: false`, screen `display: none`), pre-fix gives `panelMaxH 1009px`, `clipped 1784`,
   **1 page**, last heading absent; post-fix gives `panelMaxH none`, `clipped 0`, **3 pages**, last heading on
   page 3. **The fix covers it — nothing guards it.**

6. **`.cs-30` is in the shipped rule but not probed by ARM E.** `readBreakControl` reads `.cs-st`, `.cs-one`,
   `.cs-ha`, `.cs-trap`, `.cs-dec`, `.cs-num`, `.cs-tells li`, `.cs-spine li` — `.cs-30` is asserted nowhere.
   (I measured it `avoid`, so it works; it is simply unguarded.)

7. **Two small latent fragilities.** ARM C uses `findIndex`, the *first* page carrying the last heading — if that
   text ever appeared earlier as well, the arm false-reds. And the token harvester's `var\((--[a-z0-9-]+)\)`
   requires a bare close paren, so a future `var(--x, fallback)` would be silently dropped; none exist today
   (0 of 45), so the "cannot rot" claim holds now, with that edge.

---

## Hazards pre-cleared

- **Read-only on the repo throughout.** `git status --porcelain` empty at start and finish; tip still `fad9bf5`.
  History read via `git show` into scratch. `_boot.cjs`'s `finish()` and `print_truth.cjs` write nothing to the
  repo (verified by inspection before running); PDF capture was directed outside it via `PRINT_TRUTH_PDF_DIR`.
- **Never touched `..\w17-exits`.** No path outside the w16 worktree, the shared `node_modules` (read-only), and
  my scratch dir was accessed.
- **No image-wide kills.** No process was killed at all; I only *counted* chrome/node processes.
- **No `npm install` / no `npm ci`** while the sibling builder is live; the `node_modules` junction was read only.
- **Load artifacts:** none observed as boot timeouts. The load-correlated behaviour I did see is BLOCKING 1, and
  I deliberately re-measured it on a quiet box (runs 4-6) rather than attributing it to load and moving on.
- **Deviation to disclose:** the brief says PS-from-bash via `.ps1` only. I twice ran
  `powershell -NoProfile -Command "(Get-Process chrome,node ...).Count"` inline for a read-only process count,
  rather than writing a script file. No state was changed.

---

## Bottom line for the merge decision

The **product change is sound and I could not break it** — X1, X6 and X9 all reproduce independently, the fix
holds on the File→Print path the check does not cover, VR is genuinely byte-identical, screen media is provably
untouched, and the 36-red watched-red capture is exact.

What should not merge as-is is **`test/print_truth.cjs`**. It fails on a correct build in 5 of 8 runs, in two
distinct modes, one of which reports the app as broken; and its PDF page counter is wrong on multi-node page
trees, which has already produced a false statement in the freeze report. Both defects are in the same reader and
both fixes are small. This repo's own doctrine, in the file this check boots from, is that *"a flaky gate is worse
than no gate"* — that is the standard this check has to meet before it becomes check 68.
