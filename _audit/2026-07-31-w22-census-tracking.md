# W22-C1 -- `letter-spacing` census, git-tracked `src/`

Closed-form, read-only census of every `letter-spacing` declaration in authored
source. Produced by child slice w22-c1 for wave lead w22-lead. No source file was
edited; this document is the slice's only write.

| | |
|---|---|
| commit censused | `92aa8d09b5d3275a42a2023eacfc56c1cdef1493` |
| branch | `ledger/l1-token-structure` |
| worktree | `D:\claude-workspace\_worktrees\deepdive-rehearsal\w22-tokens` |
| date | 2026-07-31 |

## Scope

"Authored source" is taken verbatim from this repo's `test/typeface_census.py`
(see its `collect()` docstring and `SCOPE:` note): **what git TRACKS under `src/`**.
`npm run build` writes compiled topic slices into `src/topics/_generated/` and an
esbuild bundle into `src/scripts/visuals/`; both are gitignored and therefore OUT
of scope. That is a git question, not a path-pattern skip -- authored CSS has to be
committed to ship, and the moment it is, it is in scope.

`git ls-files -- src/` reports **228** tracked files, of which **189** carry a
`.css` / `.js` / `.mjs` / `.html` extension (the same extension filter
`typeface_census.py` applies). **21** of those contain `letter-spacing`.

Scope note: the extension filter is inert here. `git grep` over ALL tracked files
under `src/` (no extension filter, binary files included) returns the same 21
files, so no tracked non-CSS/JS file carries a `letter-spacing`.

## Enumeration commands

```
git -C <worktree> rev-parse HEAD
git -C <worktree> ls-files -- src/

# line count and file count (the brief's 110 / 21)
git grep -In  'letter-spacing' -- src/ | wc -l      # -> 110
git grep -Il  'letter-spacing' -- src/ | wc -l      # -> 21
git grep -Ic  'letter-spacing' -- src/              # per-file counts

# DECLARATION count vs LINE count -- the brief warns these may differ
git grep -o   'letter-spacing' -- src/ | wc -l      # -> 110 (one per line)

# no camelCase JS property form anywhere
git grep -In  'letterSpacing' -- src/                # -> no match

# binary-inclusive control: same 21 files
git grep -n --text -c 'letter-spacing' -- src/       # -> 21 files
```

The per-site rows below were then produced by an offset-based analyser rather than
by reading 110 lines by hand. It masks comments before matching, brace-tracks the
CSS to attribute a selector and an at-rule chain, and locates the JS string literal
that holds each declaration so the CSS inside a template literal is parsed as CSS.

### The analyser is proven able to fail

This repo has shipped four checks that could not fail, so the analyser was run
against nine planted negative controls before its zeroes were believed. All nine
fired:

1. `letter-spacing` inside a multi-line `/* */` comment in a `.css` file -- flagged.
2. `letter-spacing` inside a `/* */` comment **inside a JS template literal** --
   flagged. *The first version of this analyser got this case WRONG* (it masked only
   JS-level comments, so CSS prose inside a template literal read as live code).
   This is precisely the trap the brief names; the fix is why section C is trusted.
3. `letter-spacing` in a JS `//` line comment and in a JS `/* */` block comment --
   both flagged, while the live declaration beside them was not.
4. Value terminator: an HTML inline `style="..."` attribute inside a JS string --
   the value stops at the attribute quote, not at the end of the line.
5. A declaration nested in `@layer` > `@media` > `@supports` -- selector and all
   three at-rules reported.
6. Normalisation table, including that `.3px` and `.3em` never normalise equal.
7. `var()` and keyword detectors recognised on a synthetic fixture (sections A and
   B report zero on the real tree -- the detectors are not dead).
8. A `letter-spacing` planted inside a `font:` shorthand value -- flagged.
9. Brace-balance control: the CSS tracker lands at depth 0 at EOF on both
   `src/styles.css` and `src/tw.css`, so its selector attribution is not drifting.

## Per-site table

All 110 occurrences, in file then line order. `raw` is the exact text between the
colon and the declaration terminator, whitespace preserved. `norm` adds a leading
zero where absent and strips whitespace; the unit is never converted.

| # | file | line | raw | norm | medium | context (selector) | media / condition |
|---:|---|---:|---|---|---|---|---|
| 1 | `src/scripts/app/base-styles.js` | 16 | `.4px` | `0.4px` | js-string | `.step-k` | - |
| 2 | `src/scripts/app/base-styles.js` | 18 | `-.2px` | `-0.2px` | js-string | `.step-t` | - |
| 3 | `src/scripts/app/base-styles.js` | 182 | `.7px` | `0.7px` | js-string | `.flow-strip .flow-k` | - |
| 4 | `src/scripts/app/base-styles.js` | 213 | `.2px` | `0.2px` | js-string | `.flow-rcpt` | - |
| 5 | `src/scripts/app/content-sheet.js` | 14 | `.7px` | `0.7px` | js-string | `.cs-one-l` | - |
| 6 | `src/scripts/app/content-sheet.js` | 16 | `.7px` | `0.7px` | js-string | `.cs-st` | - |
| 7 | `src/scripts/app/copy-code.js` | 15 | `.5px` | `0.5px` | js-string | fn (IIFE top level), var COPY_STYLE -- `var COPY_STYLE = 'position:absolute;top:var(--space-6);right:v` -- applied at copy-code.js:38 `btn.style.cssText = COPY_STYLE` | - |
| 8 | `src/scripts/app/drill/logic.js` | 75 | `.5px` | `0.5px` | js-string | `.tierlab` | - |
| 9 | `src/scripts/app/drill/logic.js` | 155 | `.6px` | `0.6px` | js-string | `.score-cap` | - |
| 10 | `src/scripts/app/drill/logic.js` | 161 | `.5px` | `0.5px` | js-string | `.pill .l` | - |
| 11 | `src/scripts/app/drill/logic.js` | 232 | `.4px` | `0.4px` | js-string | `.qk` | - |
| 12 | `src/scripts/app/drill/logic.js` | 233 | `.2px` | `0.2px` | js-string | `.sigtag` | - |
| 13 | `src/scripts/app/drill/logic.js` | 235 | `.8px` | `0.8px` | js-string | `.tier` | - |
| 14 | `src/scripts/app/drill/logic.js` | 241 | `.8px` | `0.8px` | js-string | `.speak .sl` | - |
| 15 | `src/scripts/app/drill/logic.js` | 265 | `-.3px` | `-0.3px` | js-string | `.rec .lvl` | - |
| 16 | `src/scripts/app/drill/logic.js` | 273 | `.1em` | `0.1em` | js-string | `.dnav-h` | - |
| 17 | `src/scripts/app/drill/logic.js` | 274 | `.01em` | `0.01em` | js-string | `.dnav-h .sub` | - |
| 18 | `src/scripts/app/drill/logic.js` | 298 | `.5px` | `0.5px` | js-string | `.mhp-h` | - |
| 19 | `src/scripts/app/drill/logic.js` | 299 | `0` | `0` | js-string | `.mhp-h .mhp-sub` | - |
| 20 | `src/scripts/app/drill/logic.js` | 372 | `.5px` | `0.5px` | js-string | `.dsu-l` | `@media (max-width:919px)` |
| 21 | `src/scripts/app/focus-mode.js` | 74 | `.5px` | `0.5px` | js-string | fn createButton() (focus-mode.js:55) -- `btnEl.style.cssText = 'font-weight:var(--font-weight-bold);le` -- the Focus toggle button | - |
| 22 | `src/scripts/app/keyboard-overlay.js` | 16 | `.1em` | `0.1em` | js-string | `.ks-h` | - |
| 23 | `src/scripts/app/mixed-fire.js` | 338 | `.3px` | `0.3px` | js-string | `.mx-prog` | - |
| 24 | `src/scripts/app/mixed-fire.js` | 339 | `.5px` | `0.5px` | js-string | `.mx-kind` | - |
| 25 | `src/scripts/app/mixed-fire.js` | 347 | `-1px` | `-1px` | js-string | `.mx-end-pct` | - |
| 26 | `src/scripts/app/mixed-fire.js` | 357 | `.4px` | `0.4px` | js-string | `.mx-ek` | - |
| 27 | `src/scripts/app/mock-run/logic.js` | 219 | `.6px` | `0.6px` | js-string | `.mb-prog` | - |
| 28 | `src/scripts/app/mock-run/logic.js` | 220 | `.6px` | `0.6px` | js-string | `.mb-tag` | - |
| 29 | `src/scripts/app/mock-run/logic.js` | 228 | `.6px` | `0.6px` | js-string | `.mb-ml` | - |
| 30 | `src/scripts/app/mock-run/logic.js` | 230 | `.2px` | `0.2px` | js-string | `.mb-keys` | - |
| 31 | `src/scripts/app/mock-run/logic.js` | 261 | `.5px` | `0.5px` | js-string | `.mb-int-h` | - |
| 32 | `src/scripts/app/mock-run/logic.js` | 270 | `.5px` | `0.5px` | js-string | `.mb-int-h2` | - |
| 33 | `src/scripts/app/mock-run/logic.js` | 272 | `.5px` | `0.5px` | js-string | `.mb-int-al` | - |
| 34 | `src/scripts/app/model-answers/logic.js` | 30 | `-.3px` | `-0.3px` | js-string | `.mscript-h` | - |
| 35 | `src/scripts/app/model-answers/logic.js` | 32 | `.4px` | `0.4px` | js-string | `.mbeat-l` | - |
| 36 | `src/scripts/app/num/logic.js` | 23 | `.6px` | `0.6px` | js-string | `.num-h` | - |
| 37 | `src/scripts/app/num/logic.js` | 24 | `.2px` | `0.2px` | js-string | `.num-reset` | - |
| 38 | `src/scripts/app/num/logic.js` | 27 | `.2px` | `0.2px` | js-string | `.ninp label` | - |
| 39 | `src/scripts/app/print-qa.js` | 11 | `-.01em` | `-0.01em` | js-string | `h1` | print document (window.open) |
| 40 | `src/scripts/app/print-qa.js` | 13 | `.07em` | `0.07em` | js-string | `.meta` | print document (window.open) |
| 41 | `src/scripts/app/print-qa.js` | 15 | `.06em` | `0.06em` | js-string | `.sig` | print document (window.open) |
| 42 | `src/scripts/app/search-overlay.js` | 186 | `.7px` | `0.7px` | js-string | fn sectionHeader() (search-overlay.js:184) -- `h.style.cssText = 'font-size:var(--font-size-nano);font-weigh` | - |
| 43 | `src/scripts/app/search-overlay.js` | 207 | `.5px` | `0.5px` | js-string | fn makeResultItem() (search-overlay.js:190) -- `tag.style.cssText = 'font-size:var(--font-size-nano);font-wei` -- the TOPIC / VIEW result tag | - |
| 44 | `src/scripts/app/session-progress.js` | 891 | `.7px` | `0.7px` | js-string | `.ss-rk` | - |
| 45 | `src/scripts/app/session-progress.js` | 918 | `.5px` | `0.5px` | js-string | `.ss-carry-h` | - |
| 46 | `src/scripts/app/session-progress.js` | 926 | `.5px` | `0.5px` | js-string | `.cmp-head` | - |
| 47 | `src/scripts/app/session-progress.js` | 938 | `1px` | `1px` | js-string | `.tr-spark` | - |
| 48 | `src/scripts/app/shared-sheets.js` | 23 | `.3px` | `0.3px` | js-string | `.opt-n` | - |
| 49 | `src/scripts/app/shared-sheets.js` | 25 | `.5px` | `0.5px` | js-string | `.opt-w .pw` | - |
| 50 | `src/scripts/app/shared-sheets.js` | 31 | `-.01em` | `-0.01em` | js-string | `.qq` | - |
| 51 | `src/scripts/app/shared-sheets.js` | 35 | `.8px` | `0.8px` | js-string | `.fu .lab` | - |
| 52 | `src/scripts/app/shared-sheets.js` | 41 | `.8px` | `0.8px` | js-string | `.senior .sl` | - |
| 53 | `src/scripts/app/system-map.js` | 35 | `.6px` | `0.6px` | js-string | `.stg.cur .here` | - |
| 54 | `src/scripts/app/system-map.js` | 36 | `.8px` | `0.8px` | js-string | `.piv-k` | - |
| 55 | `src/scripts/app/system-map.js` | 66 | `.3px` | `0.3px` | js-string | `.piv .chip` | - |
| 56 | `src/scripts/app/tour-guide.js` | 103 | `-.3px` | `-0.3px` | js-string | fn buildTooltip() (tour-guide.js:97), HTML inline style attribute -- `<div style="font:var(--font-weight-heavy) 15px var(--sans);co` -- the tooltip title div in tooltipEl.innerHTML | - |
| 57 | `src/scripts/app/trade-offs.js` | 19 | `-.2px` | `-0.2px` | js-string | `.dec-q` | - |
| 58 | `src/scripts/app/walkthrough/logic.js` | 78 | `.2px` | `0.2px` | js-string | `.wflow-r` | - |
| 59 | `src/scripts/app/walkthrough/logic.js` | 85 | `.3px` | `0.3px` | js-string | `details.model>summary .sub` | - |
| 60 | `src/scripts/app/walkthrough/logic.js` | 88 | `.9px` | `0.9px` | js-string | `.mbeat .ml` | - |
| 61 | `src/scripts/app/walkthrough/logic.js` | 93 | `.1em` | `0.1em` | js-string | `.arc-h` | - |
| 62 | `src/scripts/app/walkthrough/logic.js` | 94 | `.01em` | `0.01em` | js-string | `.arc-h .sub` | - |
| 63 | `src/scripts/app/whiteboard.js` | 36 | `.3px` | `0.3px` | js-string | `.wb-count` | - |
| 64 | `src/styles.css` | 315 | `.2px` | `0.2px` | css | `.locator` | - |
| 65 | `src/styles.css` | 318 | `.5px` | `0.5px` | css | `.loc-key` | - |
| 66 | `src/styles.css` | 323 | `-.7px` | `-0.7px` | css | `.hdr h1` | - |
| 67 | `src/styles.css` | 335 | `.4px` | `0.4px` | css | `.seg button .n` | - |
| 68 | `src/styles.css` | 386 | `.1em` | `0.1em` | css | `.mb-sec` | - |
| 69 | `src/styles.css` | 403 | `.6px` | `0.6px` | css | `.nd-k` | - |
| 70 | `src/styles.css` | 433 | `.2px` | `0.2px` | css | `.nd-armed` | - |
| 71 | `src/styles.css` | 445 | `.2px` | `0.2px` | css | `.mockbtn` | - |
| 72 | `src/styles.css` | 454 | `.1px` | `0.1px` | css | `.mb-t` | - |
| 73 | `src/styles.css` | 479 | `.6px` | `0.6px` | css | `.mock-title` | - |
| 74 | `src/styles.css` | 489 | `.5px` | `0.5px` | css | `.cram-title` | - |
| 75 | `src/styles.css` | 511 | `.6px` | `0.6px` | css | `.sr-rk` | - |
| 76 | `src/styles.css` | 627 | `-.4px` | `-0.4px` | css | `.side-id h1` | - |
| 77 | `src/styles.css` | 679 | `.5px` | `0.5px` | css | `.sidebar .seg button .n` | - |
| 78 | `src/styles.css` | 795 | `.3px` | `0.3px` | css | `.tools-fab` | `@media(max-width:919px)` |
| 79 | `src/styles.css` | 810 | `.2px` | `0.2px` | css | `.nd-m-k` | `@media(max-width:919px)` |
| 80 | `src/styles.css` | 1039 | `1.8px` | `1.8px` | css | `.stage-head .sh-kick` | - |
| 81 | `src/styles.css` | 1041 | `-.5px` | `-0.5px` | css | `.stage-head .sh-name` | - |
| 82 | `src/styles.css` | 1201 | `.13em` | `0.13em` | css | `.mcomp-eyebrow` | - |
| 83 | `src/styles.css` | 1259 | `.12em` | `0.12em` | css | `.cmp-eyebrow` | - |
| 84 | `src/styles.css` | 1261 | `-.014em` | `-0.014em` | css | `.cmp-topic` | - |
| 85 | `src/styles.css` | 1264 | `.12em` | `0.12em` | css | `.cmp-h` | - |
| 86 | `src/styles.css` | 1304 | `-.5px` | `-0.5px` | css | `.side-id h1` | - |
| 87 | `src/styles.css` | 1391 | `1.2px` | `1.2px` | css | `.pomodoro-h` | - |
| 88 | `src/styles.css` | 1397 | `.4px` | `0.4px` | css | `.pomodoro-phase` | - |
| 89 | `src/styles.css` | 1449 | `.3px` | `0.3px` | css | `.app._focus-mode #_focus-exit` | - |
| 90 | `src/styles.css` | 1462 | `1px` | `1px` | css | `.tn-eyebrow` | - |
| 91 | `src/styles.css` | 1503 | `.3px` | `0.3px` | css | `.tn-i-tail` | - |
| 92 | `src/styles.css` | 1504 | `.7px` | `0.7px` | css | `.tn-group` | - |
| 93 | `src/styles.css` | 1634 | `-.2px` | `-0.2px` | css | `.ix-title` | - |
| 94 | `src/styles.css` | 1635 | `.4px` | `0.4px` | css | `.ix-sub` | - |
| 95 | `src/styles.css` | 1640 | `.7px` | `0.7px` | css | `.ix-g-head` | - |
| 96 | `src/styles.css` | 1654 | `.02em` | `0.02em` | css | `.ix-g-cram` | - |
| 97 | `src/styles.css` | 1668 | `.02em` | `0.02em` | css | `.ix-c-badge` | - |
| 98 | `src/styles.css` | 1673 | `.11em` | `0.11em` | css | `.ix-home-k` | - |
| 99 | `src/styles.css` | 1690 | `1.5px` | `1.5px` | css | `.ix-trend-s` | - |
| 100 | `src/styles.css` | 1703 | `.09em` | `0.09em` | css | `.ix-home-btn-k` | - |
| 101 | `src/styles.css` | 1724 | `.04em` | `0.04em` | css | `.cmp-reopen` | - |
| 102 | `src/styles.css` | 1776 | `.09em` | `0.09em` | css | `.xd-prog` | - |
| 103 | `src/styles.css` | 1784 | `.06em` | `0.06em` | css | `.xd-fu-l` | - |
| 104 | `src/styles.css` | 1788 | `.06em` | `0.06em` | css | `.xd-senior-l` | - |
| 105 | `src/styles.css` | 1798 | `-.02em` | `-0.02em` | css | `.xd-end-pct` | - |
| 106 | `src/styles.css` | 1825 | `.3px` | `0.3px` | css | `.ix-c-tail` | - |
| 107 | `src/styles.css` | 1976 | `.04em` | `0.04em` | css | `.hm-brand` | - |
| 108 | `src/styles.css` | 1995 | `.08em` | `0.08em` | css | `.hm-h` | - |
| 109 | `src/styles.css` | 2024 | `.1em` | `0.1em` | css | `.hm-cta-k` | - |
| 110 | `src/tw.css` | 47 | ` 1.6px` | `1.6px` | css | `.badge` | `@layer components` |

Medium totals: `css` 47, `js-string` 63, `js-prop` 0, `html` 0.

There are **no** `js-prop` sites: nothing in tracked `src/` assigns
`.style.letterSpacing = ...` or carries `letterSpacing` as a JS object property
(`git grep letterSpacing -- src/` returns nothing). There are **no** `html` sites:
no tracked `.html` file under `src/` contains a `letter-spacing`. Every non-`.css`
site is CSS text inside a JS string or template literal.

## Section A -- already a `var()` reference

**NONE. 0 of 110.** Not one `letter-spacing` in tracked `src/` is tokenized today;
every single value is a literal length. There is also no tracking token *defined*
anywhere in scope -- `git grep -- '--tracking' src/`, `'--letter-spacing'` and
`'--ls-'` all return nothing. This is a greenfield token surface, not a partial
migration: the lead is naming the first tokens, not extending an existing set.

(The `var()` detector is not dead -- negative control 7 above recognises
`letter-spacing:var(--tracking-wide)` on a synthetic fixture.)

## Section B -- keyword values (`normal` / `inherit`)

**NONE. 0 of 110.** No `letter-spacing:normal`, no `letter-spacing:inherit`, and
no CSS-wide reset keyword (`initial` / `unset` / `revert` / `revert-layer`)
either. Every occurrence in scope is a numeric length and is therefore a
candidate for a numeric token. Nothing has to be carved out of the rollup on
keyword grounds.

(Negative control 7 recognises both `normal` and `inherit` on a fixture.)

## Section C -- comment-only occurrences (PROSE IS NOT CODE)

**NONE. 0 of 110.** No `letter-spacing` in tracked `src/` sits inside a CSS
`/* */` comment, a JS `/* */` block comment, or a JS `//` line comment -- neither
at file level nor inside the CSS text of a template literal.

Two independent passes agree:

- a cheap control, `git grep -In 'letter-spacing' -- src/ | grep -E '/\*|\*/|//'`,
  returns nothing, so no *single* line carries both a declaration and a comment
  marker; and
- the offset-based comment mask, which is the pass that matters because it also
  catches a declaration on a bare line *in the middle of* a multi-line comment --
  the shape the cheap grep cannot see.

The mask is demonstrably able to fire (negative controls 1-3). Therefore all 110
occurrences are live code, and the count deducted here is a real zero rather than
an undetected one.

## Section D -- `font` shorthand and unparseable values

**No flags. 0 of 110 occurrences are unparseable, and 0 sit inside a `font:`
shorthand value.** `letter-spacing` is not a component of the CSS `font` shorthand,
so this was expected -- but it was checked rather than assumed: the analyser scans
backwards for an enclosing `font:` value at every site (negative control 8 proves
the check fires on a planted case). No occurrence carries `!important`. Every value
matches `-?[0-9.]+[a-z%]*` cleanly.

Two shapes did need care, and are recorded here so the lead does not have to
re-derive them. Neither is a flag; both parse cleanly once handled:

- **`src/scripts/app/tour-guide.js:103`** -- the declaration is in an HTML inline
  `style="..."` attribute inside a JS string, so its terminator is the attribute's
  closing `"`, not a `;`. A naive `[^;{}!]` capture over-reads and swallows
  ``-.3px"' + step.title + '</div>' +`` as the value. Handled: raw is `-.3px`.
  Consequence for tokenization: this site is an inline style attribute on an element
  in the light DOM, so a `var(--tracking-*)` there resolves from `:root` normally.
- **`src/scripts/app/drill/logic.js:299`** -- `letter-spacing:0`. A unitless zero.
  It is a valid length and it is live code, so it is counted, but it belongs to
  neither the px table nor the em table and is filed separately in the rollup.
  Do not let it be swept into `0px` or `0em`: it is convertible to both and
  identical to neither in source text.

## Value rollup

Distinct NORMALIZED values, unit-sensitive. px and em are kept in separate tables
and **no value is converted between them** -- `0.3px` and `0.3em` are different
values and are never merged. Sorted by count descending, then by value.

### px values (20 distinct, 83 occurrences)

| value | count | sites |
|---|---:|---|
| `0.5px` | 17 | `src/scripts/app/copy-code.js:15`, `src/scripts/app/drill/logic.js:75`, `src/scripts/app/drill/logic.js:161`, `src/scripts/app/drill/logic.js:298`, `src/scripts/app/drill/logic.js:372`, `src/scripts/app/focus-mode.js:74`, `src/scripts/app/mixed-fire.js:339`, `src/scripts/app/mock-run/logic.js:261`, `src/scripts/app/mock-run/logic.js:270`, `src/scripts/app/mock-run/logic.js:272`, `src/scripts/app/search-overlay.js:207`, `src/scripts/app/session-progress.js:918`, `src/scripts/app/session-progress.js:926`, `src/scripts/app/shared-sheets.js:25`, `src/styles.css:318`, `src/styles.css:489`, `src/styles.css:679` |
| `0.2px` | 10 | `src/scripts/app/base-styles.js:213`, `src/scripts/app/drill/logic.js:233`, `src/scripts/app/mock-run/logic.js:230`, `src/scripts/app/num/logic.js:24`, `src/scripts/app/num/logic.js:27`, `src/scripts/app/walkthrough/logic.js:78`, `src/styles.css:315`, `src/styles.css:433`, `src/styles.css:445`, `src/styles.css:810` |
| `0.3px` | 9 | `src/scripts/app/mixed-fire.js:338`, `src/scripts/app/shared-sheets.js:23`, `src/scripts/app/system-map.js:66`, `src/scripts/app/walkthrough/logic.js:85`, `src/scripts/app/whiteboard.js:36`, `src/styles.css:795`, `src/styles.css:1449`, `src/styles.css:1503`, `src/styles.css:1825` |
| `0.6px` | 9 | `src/scripts/app/drill/logic.js:155`, `src/scripts/app/mock-run/logic.js:219`, `src/scripts/app/mock-run/logic.js:220`, `src/scripts/app/mock-run/logic.js:228`, `src/scripts/app/num/logic.js:23`, `src/scripts/app/system-map.js:35`, `src/styles.css:403`, `src/styles.css:479`, `src/styles.css:511` |
| `0.4px` | 7 | `src/scripts/app/base-styles.js:16`, `src/scripts/app/drill/logic.js:232`, `src/scripts/app/mixed-fire.js:357`, `src/scripts/app/model-answers/logic.js:32`, `src/styles.css:335`, `src/styles.css:1397`, `src/styles.css:1635` |
| `0.7px` | 7 | `src/scripts/app/base-styles.js:182`, `src/scripts/app/content-sheet.js:14`, `src/scripts/app/content-sheet.js:16`, `src/scripts/app/search-overlay.js:186`, `src/scripts/app/session-progress.js:891`, `src/styles.css:1504`, `src/styles.css:1640` |
| `0.8px` | 5 | `src/scripts/app/drill/logic.js:235`, `src/scripts/app/drill/logic.js:241`, `src/scripts/app/shared-sheets.js:35`, `src/scripts/app/shared-sheets.js:41`, `src/scripts/app/system-map.js:36` |
| `-0.3px` | 3 | `src/scripts/app/drill/logic.js:265`, `src/scripts/app/model-answers/logic.js:30`, `src/scripts/app/tour-guide.js:103` |
| `-0.2px` | 3 | `src/scripts/app/base-styles.js:18`, `src/scripts/app/trade-offs.js:19`, `src/styles.css:1634` |
| `-0.5px` | 2 | `src/styles.css:1041`, `src/styles.css:1304` |
| `1px` | 2 | `src/scripts/app/session-progress.js:938`, `src/styles.css:1462` |
| `-1px` | 1 | `src/scripts/app/mixed-fire.js:347` |
| `-0.7px` | 1 | `src/styles.css:323` |
| `-0.4px` | 1 | `src/styles.css:627` |
| `0.1px` | 1 | `src/styles.css:454` |
| `0.9px` | 1 | `src/scripts/app/walkthrough/logic.js:88` |
| `1.2px` | 1 | `src/styles.css:1391` |
| `1.5px` | 1 | `src/styles.css:1690` |
| `1.6px` | 1 | `src/tw.css:47` |
| `1.8px` | 1 | `src/styles.css:1039` |

### em values (14 distinct, 26 occurrences)

| value | count | sites |
|---|---:|---|
| `0.1em` | 5 | `src/scripts/app/drill/logic.js:273`, `src/scripts/app/keyboard-overlay.js:16`, `src/scripts/app/walkthrough/logic.js:93`, `src/styles.css:386`, `src/styles.css:2024` |
| `0.06em` | 3 | `src/scripts/app/print-qa.js:15`, `src/styles.css:1784`, `src/styles.css:1788` |
| `-0.01em` | 2 | `src/scripts/app/print-qa.js:11`, `src/scripts/app/shared-sheets.js:31` |
| `0.01em` | 2 | `src/scripts/app/drill/logic.js:274`, `src/scripts/app/walkthrough/logic.js:94` |
| `0.02em` | 2 | `src/styles.css:1654`, `src/styles.css:1668` |
| `0.04em` | 2 | `src/styles.css:1724`, `src/styles.css:1976` |
| `0.09em` | 2 | `src/styles.css:1703`, `src/styles.css:1776` |
| `0.12em` | 2 | `src/styles.css:1259`, `src/styles.css:1264` |
| `-0.02em` | 1 | `src/styles.css:1798` |
| `-0.014em` | 1 | `src/styles.css:1261` |
| `0.07em` | 1 | `src/scripts/app/print-qa.js:13` |
| `0.08em` | 1 | `src/styles.css:1995` |
| `0.11em` | 1 | `src/styles.css:1673` |
| `0.13em` | 1 | `src/styles.css:1201` |

### unitless (1 distinct, 1 occurrence)

| value | count | sites |
|---|---:|---|
| `0` | 1 | `src/scripts/app/drill/logic.js:299` |

### Distinct-value totals

| bucket | distinct values | occurrences |
|---|---:|---:|
| px | 20 | 83 |
| em | 14 | 26 |
| unitless | 1 | 1 |
| **total** | **35** | **110** |

**Total distinct normalized values (unit-sensitive): 35.**

## Arithmetic reconciliation

Every number stated explicitly, and every subtraction shown.

| quantity | value |
|---|---:|
| matching LINES reported by `git grep -In` | 110 |
| `letter-spacing` tokens reported by `git grep -o` | 110 |
| occurrences the analyser located | 110 |
| ... of which comment-only (section C) | 0 |
| ... of which flagged unparseable (section D) | 0 |
| ... of which inside a `font:` shorthand (section D) | 0 |
| **LIVE DECLARATIONS** = occurrences - comment-only - unparseable | **110** |
| rows in the per-site table | 110 |
| ... of which live | 110 |
| sum of the px rollup counts | 83 |
| sum of the em rollup counts | 26 |
| sum of the unitless rollup counts | 1 |
| **sum of ALL rollup counts** | **110** |

Closure, checked in both directions:

```
lines (git grep -In)          110
tokens (git grep -o)          110   == lines, so exactly one declaration per line;
                                    the DECLARATION count does NOT exceed the LINE
                                    count on this tree, though the brief correctly
                                    warned it could
occurrences located           110   == tokens
  - comment-only                0
  - unparseable / flagged       0
  ------------------------------
  live declarations           110

per-site rows                 110   == occurrences (nothing dropped)
rollup total                  110   == live declarations
  px  83 occurrences over 20 distinct values
  em  26 occurrences over 14 distinct values
  0    1 occurrence  over  1 distinct value
```

**The arithmetic closes.** 
110 lines = 110 tokens = 110 occurrences = 110
per-site rows = 110 live declarations = 110 rollup occurrences, with 0 deducted for
comments and 0 deducted for unparseable values. No row is dropped anywhere.

## Notes for the lead

Observations that bear on naming and on where a token can actually resolve. These
are census by-products, not census rows.

1. **Greenfield.** 0 of 110 sites are tokenized and no tracking token is defined in
   scope. Nothing has to be reconciled against an existing scale.
2. **The px/em split is not cosmetic.** 83 occurrences are px and 26 are em, and the
   two are used for the same visual job -- uppercase micro-labels. Compare
   `.dnav-h` (`0.1em`, drill/logic.js:273) with `.ix-g-head` (`0.7px`,
   styles.css:1640): both are uppercase nano eyebrows. Any token set has to decide
   whether it is one scale expressed in one unit or two parallel scales; the census
   deliberately does not decide that, and never converts between the units.
3. **`src/scripts/app/print-qa.js` (3 sites: lines 11, 13, 15) is a separate
   document.** Its sheet is injected into a `window.open()` document that has no
   `:root` of its own. `tokenBlock()` (print-qa.js:47) regex-harvests every
   `var(--name)` reference *out of the CSS string itself* and copies the computed
   values across, so tokenizing these three IS carried over automatically -- no edit
   to `tokenBlock()` needed -- provided the token name matches its pattern
   `/var\(\s*(--[a-z0-9-]+)\s*[,)]/`, i.e. lowercase letters, digits and hyphens
   only. A name with an uppercase letter or an underscore would be harvested by
   nothing and would resolve to nothing in the printed sheet, silently. This is the
   one place in the census where the token NAME, not just the value, is
   load-bearing.
4. **A stale justification sits next to that harvest**, worth knowing before relying
   on it. The comment at print-qa.js:43 argues the one-level copy is complete
   because "the tokens are @property-registered with a <length>/<number> syntax".
   In this tree only two properties are `@property`-registered -- `--accent-hue` and
   `--glow-opacity` (styles.css:56-57) -- and neither is one it harvests. The
   harvest still works, because an unregistered custom property's computed value
   already has its own `var()` references substituted, but it works for a different
   reason than the one written down. Flagged as an observation, not a defect: no
   measurement here shows the print sheet failing.
5. **Five sites have no CSS selector at all** (marked in the context column):
   `copy-code.js:15`, `focus-mode.js:74`, `search-overlay.js:186`,
   `search-overlay.js:207`, `tour-guide.js:103`. Four are `element.style.cssText`
   strings and one is an HTML inline `style` attribute. All five are INLINE styles,
   which beat every non-important stylesheet rule -- `focus-mode.js` carries two
   comments recording that exact trap biting it twice. A token substituted here
   still resolves, but the declaration cannot be overridden from a stylesheet, so
   these are not sites to "just move into CSS" as part of a token pass.
6. **Only three sites sit under a condition at all**: `styles.css:795` and
   `styles.css:810` under `@media(max-width:919px)`, and `drill/logic.js:372` under
   `@media (max-width:919px)` inside its template literal. `src/tw.css:47` is the
   only site inside an `@layer` (`@layer components`, the `.badge` component). There
   is no `:where()` anywhere in either stylesheet, and no themed
   (`html[data-theme=dark]`) block contains a `letter-spacing` -- tracking is
   theme-invariant in this tree.
7. **The two largest px values are both monospace tickers**: `1.8px`
   (`.stage-head .sh-kick`, styles.css:1039) and `1.5px` (`.ix-trend-s`,
   styles.css:1690), plus `1.6px` on `.badge` (tw.css:47) and `1px` on `.tr-spark`
   (session-progress.js:938). They are the tail of the distribution and probably
   want their own name rather than being rounded into the label scale.

---

Produced read-only. This file is the only write made by w22-c1; no source file, no
git state and nothing under `D:\claude-workspace\deepdive-rehearsal` was touched.
