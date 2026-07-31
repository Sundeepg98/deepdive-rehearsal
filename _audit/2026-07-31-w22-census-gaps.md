# W22-C2 -- CLOSED-FORM CENSUS: the home structural stack, --space-980, rhythm runs, density

    slice        w22-c2 (child of w22-lead)
    date         2026-07-31
    worktree     D:\claude-workspace\_worktrees\deepdive-rehearsal\w22-tokens
    branch       ledger/l1-token-structure
    commit       92aa8d09b5d3275a42a2023eacfc56c1cdef1493
    tree state   clean at start of run (git status --porcelain: empty)
    mode         READ-ONLY. No source file edited, no commit, no branch change.
                 This file is the only write.

Scope note: this is a STATIC read of the committed tree plus the generated (untracked)
`src/tokens.generated.css`. Nothing here was measured in a browser. Every claim that depends
on layout behaviour rather than on file contents is labelled INFERENCE.


## 0. COMMANDS RUN (every count below is reproducible from one of these)

    cd D:/claude-workspace/_worktrees/deepdive-rehearsal/w22-tokens

    # provenance
    git rev-parse HEAD
    git rev-parse --abbrev-ref HEAD
    git status --porcelain

    # Task 2
    git grep -n  'space-980' -- src/
    git grep -o  'space-980' -- src/ | wc -l
    git grep -n  'space-980' -- test/ tools/ design-tokens/
    git grep -n  -- '--space-980\s*:'                       # definition scan, whole repo
    rg  -n --no-ignore 'space-980' src/tokens.generated.css  # untracked generated file

    # tokens.json primitives (1:1 check + lookups)
    python -c "import json; d=json.load(open('design-tokens/tokens.json')); sp=d['space']; \
      print(len([k for k in sp if not k.startswith('$')]), \
            [(k,v['$value']) for k,v in sp.items() if not k.startswith('$') and v['$value']!=k+'px'])"

    # Task 1 + Task 3 -- CSS parse (comment-stripped, @media-aware, line-accurate)
    python <scratch>/w22c2_census.py     # rules, decls, home filter, family tallies
    python <scratch>/w22c2_census2.py    # margin-top leading-rhythm scan + flex/grid column-gap scan
      (<scratch> = C:\Users\Dell\AppData\Local\Temp\claude\D--claude-workspace-deepdive-rehearsal\
                   bfc4e186-9eb0-4148-a383-84020244f407\scratchpad)

    # Task 1 completeness -- is any #home / .hm-* rule outside src/styles.css?
    git grep -l -E '#home|\.hm-' -- src/ test/ tools/
    rg -n --no-ignore 'hm-|#home' src/tw.css src/fonts.css src/index.html src/overlays/ src/panes/

    # DOM order of the stack (which blocks are actually siblings)
    sed -n '183,197p' src/scripts/app/home-view.js
    grep -n -E 'hm-rooms|ix-foot' src/scripts/app/panels.js
    rg -n 'id="home"' src/index.html

    # Task 4
    cat tools/postprocess-tokens.mjs
    git grep -n -E 'data-density|density' -- src/ test/
    git grep -n -i 'density' -- test/
    rg  -n --no-ignore --hidden 'data-density' src/ test/   # includes the gitignored generated CSS
    python -c "<regex replay against src/tokens.generated.css; see section 5b>"

The CSS parser used for Tasks 1 and 3 strips `/* */` comments while preserving line numbering,
walks braces to track `@media` nesting, and splits declarations on `;` with a real line number per
declaration. It parsed **754 style rules** out of `src/styles.css` (2289 lines).


## 1. TASK 1 -- THE HOME STRUCTURAL STACK

### 1.0 Where the rules live, and the DOM the CSS is talking to

Every rule in this census is in **`src/styles.css`**. The completeness sweep
(`git grep -l -E '#home|\.hm-' -- src/ test/ tools/` plus an `rg` over `src/tw.css`,
`src/fonts.css`, `src/index.html`, `src/overlays/`, `src/panes/`) found **no `#home` or `.hm-*`
CSS rule in any other file**. The only other hit in a non-JS source is `src/index.html:48`, which
is prose inside an HTML comment, and `src/index.html:220` which is the element itself:
`<main class="homev" id="home"></main>`.

The parser found **47 rules** whose selector is `#home`, a `#home` descendant, or a `.hm-*` class.
**44 declarations** across those rules touch a target property.

DOM order, from `src/scripts/app/home-view.js:183-197` (`html()`), `panels.js:289` (`roomsHtml`)
and `panels.js:301-307` (`footerHtml`). Note `.hm-top` is a SIBLING of `.ix-panel`, not a child:

    #home                              padding 28 / 20 / 80
      header.hm-top                    margin-bottom 24
      div.ix-panel                     max-width 980, margin 0 auto, bottom 0
        div.hm-lead                    margin-bottom 16    (cold users only)
        div.hm-state                   margin-bottom 18
        button.hm-cta                  margin-bottom 26
        section.hm-sec  "Still shaky"  margin-bottom 26    (conditional)
        section.hm-rooms               margin-bottom 30
        section.hm-sec  actions        margin-bottom 26
        section.hm-tele                margin-bottom 26    (conditional)
        section.hm-sec  "All topics"   margin-bottom 26
        div.hm-skip                    margin-bottom 20
        div.ix-foot                    margin-TOP     28

The audit's P3-11 line -- "Home's five stacked sections use five different gaps
(24/16/18/26/30)" -- is **literally correct for the first five blocks**
(`.hm-top` 24, `.hm-lead` 16, `.hm-state` 18, `.hm-cta` 26, `.hm-rooms` 30) and **incomplete for
the run as a whole**: the stack is 11 blocks deep in DOM (8 distinct CSS rules carrying an
explicit trailing gap, plus one leading gap and one explicit zero), and it uses **seven** distinct
non-zero values, not five.

Primitive lookups are from `design-tokens/tokens.json`. All **63** `space.*` tokens are exact 1:1
pixel passthroughs (`space.N.$value == "Npx"`); the verifier command above returns an empty
exception list. So `var(--space-24)` resolves to `24px` at default density. See section 5 for what
happens under `data-density`.

### 1.1 GROUP G1 -- STACK RHYTHM (gap BETWEEN stacked top-level blocks)

10 rows. All in `src/styles.css`, none inside an `@media` block.

| # | LINE | SELECTOR | PROPERTY | RAW VALUE | RESOLVED GAP | MEDIA |
|---|------|----------|----------|-----------|--------------|-------|
| 1 | 1966 | `#home .ix-panel` | `margin` | `0 auto` | bottom **0px** (2-value shorthand; bottom takes the 1st value) | none |
| 2 | 1974 | `.hm-top` | `margin` | `0 auto var(--space-24)` | bottom **24px** | none |
| 3 | 1988 | `.hm-lead` | `margin` | `0 auto var(--space-16)` | bottom **16px** | none |
| 4 | 1994 | `.hm-state` | `margin` | `0 auto var(--space-18)` | bottom **18px** | none |
| 5 | 2006 | `.hm-cta` | `margin` | `0 auto var(--space-26)` | bottom **26px** | none |
| 6 | 2035 | `.hm-rooms` | `margin` | `0 auto var(--space-30)` | bottom **30px** | none |
| 7 | 2093 | `.hm-sec` | `margin` | `0 auto var(--space-26)` | bottom **26px** | none |
| 8 | 2095 | `.hm-tele` | `margin` | `0 auto var(--space-26)` | bottom **26px** | none |
| 9 | 2098 | `.hm-skip` | `margin` | `0 auto var(--space-20)` | bottom **20px** | none |
| 10 | 1969 | `#home .ix-foot` | `margin-top` | `var(--space-28)` | leading **28px** | none |

G1 summary:

    rows                       10
    explicit trailing gaps      8   (rows 2-9)
    leading gap                 1   (row 10, the only margin-TOP in the stack)
    explicit zero               1   (row 1)
    distinct non-zero values    7   -- 16, 18, 20, 24, 26, 28, 30
    distinct trailing values    6   -- 16, 18, 20, 24, 26, 30
    repeats                     26 appears 3x, and only because .hm-cta, .hm-sec and
                                .hm-tele were each written 26 independently; the three
                                RENDERED .hm-sec instances share one rule.

Two facts the lead should carry:

- **INFERENCE (not browser-measured): the last gap collapses.** `.hm-skip` (bottom 20) and
  `.ix-foot` (top 28) are adjacent in-flow siblings inside `.ix-panel`, which under `#home` is
  `display:block; overflow:visible` (styles.css:1966-1967). Adjacent-sibling vertical margins
  collapse, so the rendered gap there is **max(20,28) = 28**, not 48. Consequence: raising
  `.hm-skip`'s 20 to anything <= 28 changes nothing on screen; changing `.ix-foot`'s 28 does.
- **Mixed direction.** Nine blocks push the next one away with a trailing margin; one
  (`.ix-foot`) pulls itself down with a leading margin. Any normalisation has to pick a direction
  or keep both.

### 1.2 GROUP G2 -- CONTENT WIDTH on those same blocks

11 rows. All in `src/styles.css`, none inside an `@media` block.

| # | LINE | SELECTOR | PROPERTY | RAW VALUE | RESOLVED | MEDIA |
|---|------|----------|----------|-----------|----------|-------|
| 1 | 1966 | `#home .ix-panel` | `width` | `100%` | 100% of `#home` content box | none |
| 2 | 1966 | `#home .ix-panel` | `max-width` | `var(--space-980)` | **980px** | none |
| 3 | 1974 | `.hm-top` | `max-width` | `var(--space-980)` | **980px** | none |
| 4 | 1988 | `.hm-lead` | `max-width` | `var(--space-980)` | **980px** | none |
| 5 | 1994 | `.hm-state` | `max-width` | `var(--space-980)` | **980px** | none |
| 6 | 2005 | `.hm-cta` | `width` | `100%` | 100% | none |
| 7 | 2006 | `.hm-cta` | `max-width` | `var(--space-980)` | **980px** | none |
| 8 | 2035 | `.hm-rooms` | `max-width` | `var(--space-980)` | **980px** | none |
| 9 | 2093 | `.hm-sec` | `max-width` | `var(--space-980)` | **980px** | none |
| 10 | 2095 | `.hm-tele` | `max-width` | `var(--space-980)` | **980px** | none |
| 11 | 2097 | `.hm-skip` | `max-width` | `var(--space-980)` | **980px** | none |

G2 summary:

    rows                     11
    max-width rows            9   -- exactly the 9 --space-980 sites of Task 2
    width rows                2   -- both `100%`, on the two blocks that need to fill
    distinct max-width values 1   -- var(--space-980) only. There is no second content width
                                    on this route.

**INFERENCE (static, not browser-measured): 7 of the 9 max-widths are no-ops.**
`#home .ix-panel` is `display:block; width:100%; max-width:980px; margin:0 auto`, with `border:0`
(styles.css:1966-1967) and no `padding` declared on `.ix-panel` in either the base rule
(styles.css:1631) or the `#home` override. Its content box is therefore at most 980px wide, and
every one of its block-level children is already capped at 980 by its containing block. The
`max-width:var(--space-980)` on `.hm-lead`, `.hm-state`, `.hm-cta`, `.hm-rooms`, `.hm-sec`,
`.hm-tele`, `.hm-skip` (7 rules) changes no used width; nor do their `auto` side margins, which
resolve to 0 against a full-width auto/100% box. The two load-bearing sites are
`#home .ix-panel` (the actual column) and `.hm-top` (a SIBLING of `.ix-panel`, outside it, so it
needs its own cap and its own centring). This is a static reading; it has not been confirmed with
`getComputedStyle`.

### 1.3 GROUP G3 -- INTERNAL (padding, inner flex/grid gap, inner sizing/offsets)

23 rows. Two are inside `@media(max-width:919px)`.

| # | LINE | SELECTOR | PROPERTY | RAW VALUE | RESOLVED | MEDIA |
|---|------|----------|----------|-----------|----------|-------|
| 1 | 1960 | `#home` | `padding` | `var(--space-28) var(--space-20) 80px` | 28px 20px 80px | none |
| 2 | 1973 | `.hm-top` | `gap` | `var(--space-14)` | 14px | none |
| 3 | 1975 | `.hm-brand` | `gap` | `var(--space-10)` | 10px | none |
| 4 | 1977 | `.hm-acts` | `gap` | `var(--space-8)` | 8px | none |
| 5 | 1978 | `.hm-act` | `padding` | `var(--space-8) var(--space-14)` | 8px 14px | none |
| 6 | 1980 | `.hm-act` | `gap` | `var(--space-6)` | 6px | none |
| 7 | 1983 | `.hm-act kbd` | `padding` | `0 var(--space-4)` | 0 4px | none |
| 8 | 1996 | `.hm-h` | `margin` | `0 0 var(--space-12)` | bottom 12px | none |
| 9 | 2005 | `.hm-cta` | `gap` | `var(--space-14)` | 14px | none |
| 10 | 2006 | `.hm-cta` | `padding` | `var(--space-18) var(--space-20)` | 18px 20px | none |
| 11 | 2031 | `.hm-cta-d` | `margin-top` | `2px` | **2px, RAW -- off the token scale** | none |
| 12 | 2032 | `.hm-cta-ar` | `margin-left` | `auto` | no length (layout push) | none |
| 13 | 2036 | `.hm-room-grid` | `gap` | `var(--space-12)` | 12px | none |
| 14 | 2037 | `.hm-room` | `gap` | `var(--space-8)` | 8px | none |
| 15 | 2038 | `.hm-room` | `padding` | `var(--space-14) var(--space-16)` | 14px 16px | none |
| 16 | 2082 | `.hm-room-k` | `gap` | `var(--space-8)` | 8px | none |
| 17 | 2083 | `.hm-room-n` | `width` | `18px` | **18px, RAW** | none |
| 18 | 2089 | `.hm-room-f` | `gap` | `var(--space-8)` | 8px | none |
| 19 | 2095 | `.hm-tele` | `padding-top` | `var(--space-20)` | 20px | none |
| 20 | 2097 | `.hm-skip` | `gap` | `var(--space-8)` | 8px | none |
| 21 | 2099 | `.hm-skip input` | `width` | `16px` | **16px, RAW** | none |
| 22 | 2110 | `#home` | `padding` | `var(--space-16) var(--space-14) 80px` | 16px 14px 80px | `@media(max-width:919px)` |
| 23 | 2112 | `.hm-cta` | `padding` | `var(--space-14) var(--space-16)` | 14px 16px | `@media(max-width:919px)` |

G3 summary:

    rows                              23
    inside @media(max-width:919px)     2  (rows 22, 23)
    distinct gap values                5  -- 6, 8, 10, 12, 14   (8 used 5x: rows 4,14,16,18,20)
    distinct padding values (block)    4  -- 8, 14, 18, 20, plus the 28/16 route padding
    raw non-token lengths              4  -- `80px` twice (rows 1, 22), `2px` (11),
                                            `18px` (17), `16px` (21)

Note on the route padding: `#home`'s bottom padding is the literal `80px` in BOTH the base rule
and the mobile override. It is the only length in the whole home block that is written as a raw
pixel on purpose and never varied.

### 1.4 AMBIGUOUS -- declarations where the G1/G2/G3 boundary is genuinely arguable

Each row below is PLACED in the group named, and listed here with the reasoning. Nothing was
silently picked.

**A1. `#home .ix-panel { margin: 0 auto }` (line 1966) -- placed in G1, value 0.**
The brief defines G1 as "a margin-bottom, or the third value of a `margin:0 auto X` shorthand".
This shorthand has no third value, so by the letter of the rule it contributes nothing. But a
2-value `margin` shorthand sets `margin-bottom` to the FIRST value, so this declaration does
explicitly set the bottom gap, to 0. Placing it in G1 with an explicit 0 keeps the stack's gap
ledger complete (it is the last child of `#home`, so 0 is correct); dropping it would hide the
fact that this block's rhythm is declared rather than defaulted. Its `auto` side margins are a G2
concern and are noted there.

**A2. `#home .ix-foot { margin-top: var(--space-28) }` (line 1969) -- placed in G1.**
It is a margin-TOP, not a margin-bottom, so it does not match the brief's stated G1 shapes. But
the brief's G1 definition is "the trailing/LEADING gap BETWEEN stacked top-level blocks", and
`.ix-foot` is a direct child of `.ix-panel` emitted last by `home-view.js:195`
(`Panels.footerHtml(false)`, `panels.js:307` returns `<div class="ix-foot">`). It is stack rhythm
by role, expressed from the other side. G1 is correct; the direction mismatch is flagged in 1.1.

**A3. `.hm-h { margin: 0 0 var(--space-12) }` (line 1996) -- placed in G3.**
`.hm-h` is the `<h2>` INSIDE `.hm-sec` / `.hm-rooms` (`home-view.js:157,193`; `panels.js:289`),
so this 12px is heading-to-body spacing inside a block, not a gap between top-level blocks: not
G1. But the brief's G3 is literally "padding and inner flex/grid `gap`", and this is neither -- it
is an inner MARGIN. Placed in G3 on structural role (internal), against the letter of the
property list. If the lead's normalisation only touches padding and gap, this row will be missed.

**A4. `.hm-cta-d { margin-top: 2px }` (line 2031) -- placed in G3.**
Same class of problem as A3 (an inner margin, not padding/gap) plus a second issue: `2px` is a raw
literal, not a token. `--space-2` exists and is `2px`, so this is an unconverted site sitting
inside the home block, invisible to any audit that greps for `var(--space-`.

**A5. `.hm-cta-ar { margin-left: auto }` (line 2032) -- placed in G3.**
An inner margin like A3/A4, but it carries no length at all: it is a flex alignment push that
shoves the arrow to the right edge of the CTA. It has no resolved pixel value and no rhythm
meaning. Included for completeness only; it must not be swept into any numeric normalisation.

**A6. `.hm-room-n { width: 18px }` (line 2083) and `.hm-skip input { width: 16px }` (line 2099)
-- placed in G3.**
By PROPERTY these belong to G2 ("max-width / width"). By STRUCTURE they do not: `.hm-room-n` is
the small numeric badge inside a room card, `.hm-skip input` is the checkbox. The brief scopes G2
to "max-width / width on those same blocks", meaning the top-level stacked blocks, and neither is
one. Placed in G3 as internal sizing. Both are raw pixels, not tokens.

**A7. `.hm-tele { padding-top: var(--space-20) }` (line 2095) -- placed in G3.**
It is padding inside the block, so G3 by the letter. But `.hm-tele` also carries
`border-top:1px solid var(--bd)` (line 2096), and the preceding sibling is a `.hm-sec` with
`margin-bottom:26`. The whitespace a user perceives around that rule is therefore 26 above it and
20 below it -- the padding participates in the inter-block rhythm even though it lives inside the
block. If the lead normalises G1 without looking at this row, the divider will end up visually
off-centre.

**Not ambiguous, recorded so the lead knows it was considered and excluded:**
`.hm-cta { width: 100% }` (2005) is G2, because `.hm-cta` IS a top-level stacked block.
`#home { padding: ... }` (1960, 2110) is G3, because `#home` is the container of the stack, not a
member of it; its padding is the route's inset, not a gap between blocks.


## 2. TASK 2 -- EVERY `--space-980` SITE

Command: `git grep -n 'space-980' -- src/`

| # | FILE | LINE | SELECTOR | PROPERTY |
|---|------|------|----------|----------|
| 1 | `src/styles.css` | 1966 | `#home .ix-panel` | `max-width` |
| 2 | `src/styles.css` | 1974 | `.hm-top` | `max-width` |
| 3 | `src/styles.css` | 1988 | `.hm-lead` | `max-width` |
| 4 | `src/styles.css` | 1994 | `.hm-state` | `max-width` |
| 5 | `src/styles.css` | 2006 | `.hm-cta` | `max-width` |
| 6 | `src/styles.css` | 2035 | `.hm-rooms` | `max-width` |
| 7 | `src/styles.css` | 2093 | `.hm-sec` | `max-width` |
| 8 | `src/styles.css` | 2095 | `.hm-tele` | `max-width` |
| 9 | `src/styles.css` | 2097 | `.hm-skip` | `max-width` |

    TOTAL in src/ (tracked)   9 lines
    TOTAL occurrences         9   (`git grep -o 'space-980' -- src/ | wc -l` = 9; one per line)
    distinct files            1   (src/styles.css only)
    distinct properties       1   (max-width only -- never a padding, gap or margin)
    outside the home route    NONE. All 9 sit between styles.css:1966 and :2097, inside the
                              home block that opens at :1944 (`#home{display:none}`) and closes
                              before the phone-budget section at :2115. Every one of them is
                              either `#home <descendant>` or a `.hm-*` class.

Hits OUTSIDE `src/` (for completeness; none is a use site):

    test/phantom_tokens.py:13                  docstring, historical record
    test/check_all.py:151                      registration comment, historical record
    _audit/2026-07-29-w3-home-coldverify.md:315,317   prior audit prose
    deepdive_content_pipeline_rehearsal.html:234      the built deliverable, `--space-980: 980px`
    deepdive_content_pipeline_rehearsal.html:265,266  the two density override blocks

Hits in `src/` that `git grep` CANNOT see, because `src/tokens.generated.css` is gitignored
(`.gitignore:20`) and untracked. Found with `rg -n --no-ignore`:

    src/tokens.generated.css:64    @property --space-980{syntax:"<length>";inherits:true;initial-value:980px}
    src/tokens.generated.css:219   --space-980: 980px;      (inside :root)
    src/tokens.generated.css:250   html[data-density=compact] ... --space-980:804px
    src/tokens.generated.css:251   html[data-density=cozy]    ... --space-980:1127px

### 2.1 Verdict on `test/phantom_tokens.py`'s recorded "9 use sites"

The docstring line is:

    --space-980      0 definitions, 9 use sites   every home max-width

**The "9 use sites" half is CONFIRMED against today's tree.** Still exactly 9, still all
`max-width`, still all on the home route. Nothing has been added or removed.

**The "0 definitions" half is HISTORICAL, not current, and must not be read as a live claim.**
Today `--space-980` IS defined: `design-tokens/tokens.json` carries `space.980 = {"$value":
"980px"}` (verified by direct JSON read), Style Dictionary emits `--space-980: 980px` into
`src/tokens.generated.css:219`, `tools/postprocess-tokens.mjs` registers
`@property --space-980` at :64, and the shipped deliverable embeds it at
`deepdive_content_pipeline_rehearsal.html:234`.

The docstring is not wrong -- it is explicitly headed "MEASURED on the pre-fix build (2026-07-29
frontend audit, P3-12)", i.e. it is the record of the defect the check was written to catch, and
the fix (adding the token) is what makes the check pass now. Confirmed independently at
`_audit/2026-07-29-w3-home-coldverify.md:315-317`, which records the same before/after.
Correction for the lead: **9 use sites, 1 definition** as of commit 92aa8d0.


## 3. TASK 3 -- THE SCOPING MAP (no recommendation; the lead decides)

Question asked: is the home stack the only place in `src/styles.css` with the shape "a run of
sibling top-level blocks each carrying its own hand-picked `margin-bottom` / `margin:0 auto X`"?

Enumeration basis: the parser scanned all 754 rules for `margin-bottom`, any `margin` shorthand
(flagging those containing `auto`), `margin-block`/`margin-block-end` (**59 rows**), and
separately for `margin-top`/`margin-block-start` (**31 rows**). It also listed every flex-column
or grid container that expresses its stack with a single `gap` (**18 rows**) -- that is the shape
the home stack is NOT using, and it is the useful contrast. DOM adjacency for each family was
confirmed by reading the markup builder that emits it, cited per candidate.

**Answer: NO. There are 8 candidate runs, of which 1 (C2) is the same shape at smaller scale,
3 (C3, C4, C5) are partial matches, and 1 (C8) is the counter-example.**

### C1 -- `.hm-*` + `#home .ix-panel` / `#home .ix-foot` -- THE HOME STACK (the subject)

    markup       src/scripts/app/home-view.js:183-197, panels.js:289 + :301-307
    blocks       11 in DOM (8 distinct rules with an explicit trailing gap, 1 leading, 1 zero)
    gap values   16, 18, 20, 24, 26, 26, 26, 30  (+ leading 28, + explicit 0)
    width        one shared max-width, var(--space-980), declared 9 times
    judgement    SCATTERED ONE-OFFS. Seven distinct values for a single vertical run, with no
                 repeating interval and no visible progression; the only repeat (26 x3) is
                 partly an artefact of `.hm-sec` being one rule rendered three times.

### C2 -- `.stage-head` / `.mcomp` / `.stage .pane` -- THE TOPIC ROUTE CONTENT COLUMN

    rules        styles.css:1035 (.stage-head), :1197 (.mcomp), :750 (.stage .pane)
                 + :2201 `.mcomp{margin-bottom:var(--space-10)}` @media(max-width:919px)
    markup       src/index.html:131-153  (main.stage > .stage-head, details.mcomp, .pane)
    blocks       3 sibling top-level blocks
    gap values   20 (.stage-head), 24 (.mcomp), none (.pane, last in the column)
                 mobile override: 10 (.mcomp)
    width        one shared max-width, var(--space-830), declared 3 times
                 (.stage-head, .mcomp, .stage .pane) -- plus `.mcomp` also sets width:100%
    judgement    THE SAME SHAPE AS HOME, at a third of the size: a shared content-width token
                 repeated per block, each block hand-picking its own trailing margin, plus one
                 hand-picked mobile override. This is the closest structural sibling to C1 in
                 the file, and it is the one a "home-only" scope would leave inconsistent.

### C3 -- `.sr-*` -- THE SESSION REPORT (print / save-as-PDF body)

    rules        styles.css:507 (.sr-head 16), :510 (.sr-rec 16), :513 (.sr-sec 13),
                 :517 (.sr-foot margin-top 18); inner labels :511 (.sr-rk 4), :514 (.sr-h 5),
                 :509 (.sr-when margin-top 3), :516 (.sr-list margin-top 5)
    markup       src/scripts/app/session-progress.js:555-573 (buildSessReport)
    blocks       6 top-level siblings inside #sessreport
                 (.sr-head, .sr-rec, .sr-sec x4, .sr-foot)
    gap values   16, 16, 13, 13, 13, 13 (+ leading 18 on .sr-foot); inner tier 3, 4, 5
    judgement    READS AS A DELIBERATE TWO-TIER RHYTHM. The four repeated report sections all
                 share 13 because they share a class AND that is the right answer; the header
                 pair shares 16; inner labels sit at 3-5. Coherent, not scattered -- the
                 opposite verdict to C1 on the same measurement.

### C4 -- `.xd-*` -- THE CROSS-TOPIC DRILL OVERLAY BODY

    rules        styles.css:1775 (.xd-top 12), :1778 (.xd-q 14), :1782 (.xd-ans 12),
                 :1783 (.xd-fu 10), :1784/:1785 (.xd-fu-l / .xd-fu-q 5),
                 :1788 (.xd-senior-l 5), :1787 (.xd-senior margin-top 4),
                 :1789 (.xd-judge margin-top 16), :1799 (.xd-end-sub `8 0 22`)
    markup       src/scripts/app/cross-drill.js:39-53, :63-65
    blocks       .xd-body holds 4 top-level siblings (.xd-top, .xd-q, .xd-rev, .xd-reveal);
                 .xd-rev holds a second-level stack (.xd-ans, .xd-fu*, .xd-senior)
    gap values   top level 12, 14;  reveal level 12, 10;  label tier 5, 5, 5;  plus 4, 16, 22
    judgement    MIXED, LEANING SCATTERED. The label tier (5,5,5) is a real rhythm; the two
                 block tiers are hand-picked pairs that differ by 2px each (12 vs 14, 12 vs 10)
                 for no structural reason. A miniature of C1's problem.

### C5 -- `.ix-*` -- THE INDEX OVERLAY / SHARED LIBRARY PANEL (also rendered inside home)

    rules        styles.css:1639 (.ix-group margin-top 16), :1735 (.ix-starred 14),
                 :1811 (.ix-cross `0 0 12`), :1640 (.ix-g-head 8),
                 :1827 (.ix-g-desc `-4px 0 10`), :1711 (.ix-foot margin-top 6,
                 overridden to 28 under #home at :1969), :1672 (.ix-home `0 0 10`),
                 :1673/:1675 (.ix-home-k 6 / .ix-home-bar 7),
                 :1681/:1686 (.ix-goal-top 6 / .ix-goal-bar 7)
    markup       src/scripts/app/index-overlay.js:34, panels.js:218 + :258-266
    blocks       inside .ix-scroll: the actions lead, .ix-starred, then N repeated .ix-group
                 sections (one per room)
    gap values   repeated run: a single 16 (.ix-group margin-top, uniform across all six groups)
                 surrounding one-offs: 14, 12, 10, 8, 6, 7
    judgement    SPLIT VERDICT. The repeated `.ix-group` run is a GENUINE deliberate rhythm --
                 one rule, one value, applied to every sibling in the run, which is exactly what
                 C1 does not do. The one-off blocks around it (starred 14, cross 12, foot 6) are
                 scattered.
    side finding `.ix-home` (styles.css:1672, `margin:0 0 var(--space-10)` plus padding and a
                 gradient) is emitted by NOTHING. `rg 'ix-home' src/` returns 10 hits in
                 styles.css and 6 in JS, and every JS hit is a DESCENDANT class
                 (.ix-home-k / -bar / -v at home-view.js:91-92 and panels.js:70,116,136,141).
                 There is no `class="ix-home"` anywhere. The container rule is dead.

### C6 -- `.cmp-*` -- THE RAIL COMPANION

    rules        styles.css:1261 (.cmp-topic margin-top 13), :1262 (.cmp-thesis `13 0 0`),
                 :1263 (.cmp-thesis::before 11), :1264 (.cmp-h `0 0 11`), :1271 (.cmp-view 6),
                 :1273 (.cmp-spine flex gap 13)
    blocks       4-5, mostly leading margins rather than trailing
    gap values   13, 13, 11, 11, 6
    judgement    LOOSE BUT REPEATED. 13 and 11 each appear twice and the container also uses 13
                 as a flex gap; it reads as a small coherent set rather than a run of one-offs.

### C7 -- `.nt-*` -- THE NOTES OVERLAY

    rules        styles.css:1748/:1756 (.nt-ta / .nt-all `14 18 4`), :1757 (.nt-search 10),
                 :1745 (.nt-sub margin-top 3), :1759 (.nt-list flex gap 8)
    blocks       3 with a margin; the item list itself uses a single container gap (8)
    judgement    NOT A RHYTHM RUN. Two of the three margin rules are the same value written
                 twice for two mutually-exclusive states (.nt-ta / .nt-all), and the actual
                 repeated run (.nt-item) is gap-driven. Little to normalise.

### C8 -- `.sidebar` -- THE COUNTER-EXAMPLE

    rule         styles.css:624
                 `.sidebar{...display:flex;flex-direction:column;gap:var(--space-16);...}`
    markup       src/index.html:29 onward (.side-id, .topic-nav, .seg, .mockbar, .dock, .mockcta)
    blocks       6 top-level siblings
    gap values   ONE. var(--space-16), declared once, on the container.
    judgement    THIS IS THE SHAPE C1 IS NOT. The sidebar states its stack rhythm exactly once
                 and then explicitly zeroes the legacy per-child margins that would fight it:
                 `.sidebar .seg{...margin:0}` (:676) kills `.seg{margin-bottom:var(--space-20)}`
                 (:332), and `.sidebar .mockcta{...margin:0}` (:797, mobile) / `{margin:0 0
                 var(--space-14)}` (:1853, >=920px) restates it deliberately.
    residue      `.mockbar{margin:0 0 var(--space-16)}` (:384) is NOT reset at desktop --
                 `.sidebar .mockbar` (:724) only adds `margin-top:auto` -- so that one child's
                 own 16 stacks with the container's 16. One survivor of an otherwise clean
                 conversion; the lead may want it on the list.

### Task 3 tally, for scoping

    candidate runs found besides the home stack        7  (C2 through C8)
    same shape as home (shared width token + per-block hand-picked margin)   1  (C2)
    partial match (a real rhythm mixed with one-offs)  3  (C3, C4, C5)
    small / not really a run                           2  (C6, C7)
    counter-example (single container gap)             1  (C8)


## 4. TASK 4 -- DENSITY INTERACTION

Source: `tools/postprocess-tokens.mjs` (19 lines, read in full). It rewrites
`src/tokens.generated.css` in place: it PREPENDS the `@property` block and APPENDS the two
density blocks, wrapping the Style-Dictionary output.

### 4a. The exact scale factors

    compact   k = 0.82
    cozy      k = 1.15
    default   no block emitted; the :root values stand

Applied per token as, verbatim from the file:

    const spaces = [...css.matchAll(/--space-(\d+):\s*(\d+)px/g)].map(m => [m[1], +m[2]]);
    const dens = (name, k) =>
      `html[data-density=${name}]{` +
      spaces.map(([n,v]) => `--space-${n}:${Math.max(1,Math.round(v*k))}px`).join(';') + '}';

So each override is `Math.max(1, Math.round(value * k))` px. The `max(1, ...)` floor matters at
the bottom of the scale: `--space-1` stays 1px in compact (0.82 rounds to 1 anyway) and
`--space-2` and `--space-3` both land on 2px in compact, collapsing two rungs into one.

The selector-set the density scan uses (`/--space-(\d+):\s*(\d+)px/g`) matches all **63**
`--space-N` tokens, so both blocks re-declare the entire spacing scale. Verified in the shipped
output: `src/tokens.generated.css:250` (compact) and `:251` (cozy), each 63 declarations,
identical set, and the same two lines are embedded in the committed deliverable at
`deepdive_content_pipeline_rehearsal.html:265-266`.

**The fact the lead needs:** `--space-980` is in that set. Under compact it becomes **804px**;
under cozy it becomes **1127px**. Since all 9 of its use sites are `max-width` (Task 2), the
home's content column WIDTH is driven by the spacing-density toggle. The same is true of
`--space-830` (the topic route column, C2 above): **681px** compact, **954px** cozy. A token
named for spacing is being scaled as spacing while it is in fact acting as a layout measure.

### 4b. The exact `@property` selection regexes and what they match

Verbatim from `tools/postprocess-tokens.mjs`, in file order. `add(re, syntax)` pushes one
`@property NAME{syntax:"SYNTAX";inherits:true;initial-value:CAPTURE2}` per match:

| # | REGEX | SYNTAX | MATCHES TODAY | NAME PATTERN IT ACCEPTS |
|---|-------|--------|---------------|-------------------------|
| 0 | (hand-written, not a regex) | `<number>` | 1 | `--density-scale` literally, initial-value 1 |
| 1 | `/(--space-\d+):\s*(\d+px)/g` | `<length>` | 63 | `--space-` + digits only; value must be integer px |
| 2 | `/(--size-font-\d+):\s*(\d+px)/g` | `<length>` | 11 | `--size-font-` + digits only; integer px |
| 3 | `/(--z-[a-z-]+):\s*(-?\d+)\b/g` | `<number>` | 16 | `--z-` + lowercase letters and hyphens; signed integer |
| 4 | `/(--duration-[a-z]+):\s*(\d+ms)/g` | `<time>` | 6 | `--duration-` + lowercase letters only; integer ms |
| 5 | `/(--line-height-[a-z]+):\s*([\d.]+)/g` | `<number>` | 9 | `--line-height-` + lowercase letters only; unitless |
| 6 | `/(--font-weight-[a-z]+):\s*(\d+)/g` | `<number>` | 7 | `--font-weight-` + lowercase letters only; integer |

    1 + 63 + 11 + 16 + 6 + 9 + 7 = 113
    actual `@property` lines in src/tokens.generated.css = 113   (exact match; replay verified)

Reproduce: replay the six regexes against the `:root` region of `src/tokens.generated.css` (the
slice from `:root` to `html[data-density=compact]`) and compare with
`grep -c '^@property' src/tokens.generated.css`.

**What the regexes miss.** 129 custom properties are declared in `:root`; 113 get an `@property`;
**17 do not**:

    --size-font-16-5      double miss: the NAME `16-5` fails `--size-font-\d+` (a hyphen is not
                          \d), and the VALUE `16.5px` fails `(\d+px)`. The only spacing/size
                          primitive in the file with no registered type.
    --font-size-body, -caption, -display, -display-xl, -heading, -micro, -nano, -reading,
    --font-size-reading-sm, -small, -subhead, -title      (12 tokens)
                          These are the SEMANTIC aliases, e.g. `--font-size-body: var(--size-font-14)`
                          (tokens.generated.css:236-246). Their values are `var(...)` references,
                          not literal px, so no regex can match them. Only the PRIMITIVE tier is
                          typed; the semantic tier a stylesheet actually consumes is untyped.
    --ease-base, --ease-glide, --ease-in, --ease-spring   (4 tokens; cubic-bezier values,
                          no regex targets them)

Consequence worth noting: the density blocks and the `@property` blocks use DIFFERENT regexes for
the space tier (`(\d+px)` vs `(\d+)px`), but both currently select the identical 63 tokens. Any
future non-integer or non-px space token would silently fall out of both.

### 4c. Does anything in `src/` or `test/` ever SET `data-density`?

Commands: `git grep -n -E 'data-density|density' -- src/ test/`, `git grep -n -i 'density' --
test/`, and `rg -n --no-ignore --hidden 'data-density' src/ test/` (the `rg` pass is required
because `src/tokens.generated.css` is gitignored and `git grep` cannot see it).

Every hit, classified:

| FILE:LINE | WHAT IT IS |
|-----------|------------|
| `src/scripts/app/shell.js:116` | **THE ONLY SETTER.** `function set(m) { if (m === 'default') delete document.documentElement.dataset.density; else document.documentElement.dataset.density = m; }` |
| `src/scripts/app/shell.js:117` | reader: `var cur = document.documentElement.dataset.density \|\| 'default';` inside `cycle()` |
| `src/scripts/app/shell.js:114-118` | the `window.Density` IIFE; `modes = ['default','compact','cozy']` |
| `src/scripts/app/shell.js:286` | **THE ONLY CALLER.** `if (key === 'd') { if (window.Density) window.Density.cycle(); return; }` -- a global keyboard shortcut |
| `src/scripts/app/shell.js:112` | comment. Says the mechanism is "a single --density-scale token override on <html>". **This is inaccurate:** the code sets `data-density`, and `--density-scale` is declared by `@property` (tokens.generated.css:1) but is READ BY NOTHING -- `rg 'density-scale' src/ tools/ test/` returns exactly two hits, that comment and the line in postprocess-tokens.mjs that creates it. |
| `src/scripts/app/keyboard-overlay.js:76` | the shortcuts overlay row advertising `D` -- "Cycle spacing density -- compact, cozy, default" |
| `src/scripts/app/print-qa.js:46` | comment: "density setting: html[data-density=compact] and =cozy redefine the whole space scale." |
| `src/tokens.generated.css:250` | the compact override block (declaration, not a set) |
| `src/tokens.generated.css:251` | the cozy override block (declaration, not a set) |
| `src/styles.css:649` | the word "density" in a comment about font metrics and line boxes. Unrelated. |
| `src/topics-md/multi-tenant.md:146,152,329,693,753,757,851,873,1007` | authored topic prose about multi-tenant data density. Unrelated. |
| `test/numbers_lattice.mjs:71,270` | comment prose about the same multi-tenant content. Unrelated. |
| `test/bank_pushback.cjs:89` | comment, "SEMICOLON-DENSITY". Unrelated. |

**Answer: NO. Nothing under `test/` sets, reads, or asserts `data-density`.** A case-insensitive
sweep of the whole `test/` tree for the substring `density` returns three hits and all three are
unrelated prose in comments. There is zero occurrence of `data-density` anywhere in `test/`.

The density path is therefore **shipped, reachable, and entirely unexercised by the gate**:

- reachable by a real user via the `D` key (`shell.js:286`), and advertised to them in the
  shortcuts overlay (`keyboard-overlay.js:76`);
- 126 declarations of live CSS ride on it (63 tokens x 2 modes) and they are embedded in the
  committed deliverable at `deepdive_content_pipeline_rehearsal.html:265-266`;
- no check sets it, so no VR baseline, no contrast run, no touch-target run, no layout smoke test
  has ever been taken at compact or cozy;
- and because `--space-980` and `--space-830` are in the scaled set, the two content columns
  resize with the toggle (980 becomes 804 / 1127; 830 becomes 681 / 954) in a path nothing tests.

Anything the lead changes about the home's use of `--space-*` tokens will propagate into both
density modes automatically, and no gate will report what it looks like there.


## 5. SELF-VERIFICATION SUMMARY

| CLAIM | COMMAND THAT REPRODUCES IT | VALUE |
|-------|---------------------------|-------|
| rules parsed in styles.css | `w22c2_census.py` final line | 754 |
| `#home` / `.hm-*` rules | `w22c2_census.py` "ALL home/hm rules" | 47 |
| Task 1 target declarations | `w22c2_census.py` "TASK1 RAW ROWS" | 44 |
| G1 / G2 / G3 partition | this document, sections 1.1 / 1.2 / 1.3 | 10 + 11 + 23 = 44 |
| home CSS lives in one file | `git grep -l -E '#home\|\.hm-' -- src/` + `rg` over the other CSS/HTML | src/styles.css only |
| `--space-980` sites in src/ | `git grep -o 'space-980' -- src/ \| wc -l` | 9 |
| all 9 inside home | line numbers 1966-2097 vs the home block 1944-2113 | yes, 0 outside |
| space tokens are 1:1 px | tokens.json exception list | 63 tokens, 0 exceptions |
| margin-bottom / shorthand rows, whole file | `w22c2_census.py` "TASK3" | 59 |
| margin-top rows, whole file | `w22c2_census2.py` | 31 |
| single-gap column containers | `w22c2_census2.py` | 18 |
| `@property` count | replay of the 6 regexes vs `grep -c '^@property'` | 113 = 113 |
| untyped `:root` tokens | set difference, declared minus typed | 17 |
| `data-density` setters in src/ | `rg -n --no-ignore 'data-density' src/` | 1 (shell.js:116) |
| `data-density` in test/ | `rg -n --no-ignore 'data-density' test/` | 0 |

Unverified by measurement, and flagged as such in the body: the margin-collapse claim in 1.1, and
the "7 of 9 max-widths are no-ops" claim in 1.2. Both are static readings of the cascade and
would each take one `getComputedStyle` probe to settle.


## 6. PROVENANCE CAVEAT -- A SECOND WRITER WAS LIVE IN THIS WORKTREE DURING THIS RUN

`git status --porcelain` was **empty** when this slice started and **not empty** when it finished.
A concurrent writer (not this slice) added the following to the same worktree while this census
was running. This slice wrote exactly one file and edited nothing:

    07:18:34   test/tracking_census.py                        (new, not mine)
    07:23:52   _audit/2026-07-31-w22-census-tracking.md        (new, not mine)
    07:25:11   test/home_rhythm.py                             (new, not mine)
    07:26:49   test/check_all.py                               (MODIFIED, +40 lines, not mine)
    07:28:03   _audit/2026-07-31-w22-tokens-watched-red.txt    (new, not mine)
    07:29:28   _audit/2026-07-31-w22-census-gaps.md            (THIS FILE -- the only write
                                                               by w22-c2)

Everything in sections 1 through 5 was read from the committed tree at
`92aa8d09b5d3275a42a2023eacfc56c1cdef1493`, plus the generated `src/tokens.generated.css`.
`HEAD` is unchanged. `src/styles.css`, `design-tokens/tokens.json`,
`tools/postprocess-tokens.mjs` and every `src/scripts/app/*.js` file cited here are all clean --
the second writer touched only `test/` and `_audit/`.

Two of this census's counts were re-checked against the second writer's new files, because a new
file under `test/` could have invalidated them. Both hold:

- **Task 2 is unaffected.** `test/home_rhythm.py` mentions `--space-980` at its lines 10, 283 and
  323, but it is an untracked file under `test/`, not a use site in `src/`. The `src/` total is
  still **9**, all still on the home route. (Its line 323 carries a fixture reading
  `.hm-sec{max-width:var(--space-980);margin:0 auto var(--gap-home-section)}`, i.e. the other
  slice is already drafting a semantic gap token. That is the other slice's deliverable, noted
  here only so the lead knows the two outputs touch the same ground.)
- **Task 4c is unaffected.** `rg -i 'data-density|density' test/home_rhythm.py
  test/tracking_census.py` returns **zero** hits. Nothing in `test/` sets `data-density`, in the
  committed tree or in the live working tree as of 07:29.

A future reader reproducing the section 0 commands should expect a dirty tree and should check out
`92aa8d0` (or read `src/` only, which is untouched) rather than assuming the clean state this run
started from.

### 6.1 Late arrival: `design-tokens/tokens.json` went dirty at the end of this run

After the section-5 verification pass, `design-tokens/tokens.json` also showed as modified
(+155 lines, again not this slice). The change adds a NEW top-level `gap` block of semantic
aliases -- `gap.home.header = {space.24}`, `.lead = {space.16}`, `.state = {space.18}`,
`.decision = {space.26}`, plus `.rooms`, `.section`, `.telemetry`, `.skip` -- with a
`$description` naming audit P3-11 and `test/home_rhythm.py` as its guard.

**The `space` block itself is untouched.** Re-verified against the live working tree: still 63
tokens, still 0 exceptions to the 1:1 rule, `space.980` still `980px`. Every resolved pixel value
in sections 1 and 2 of this document is therefore correct against the working tree as well as
against `92aa8d0`.

Two things the lead should take from this, since the sibling slice's slot list and this census
were produced independently:

- **They corroborate.** The 8 slots minted (`header`, `lead`, `state`, `decision`, `rooms`,
  `section`, `telemetry`, `skip`) are exactly the 8 explicit trailing gaps this census found in
  G1 rows 2-9, with the same values (24, 16, 18, 26, 30, 26, 26, 20). Two independent reads of
  the same stack agree on its membership.
- **They differ on the edges, and the difference is the lead's call.** G1 here has **10** rows,
  not 8. The two with no slot are `#home .ix-foot { margin-top: var(--space-28) }` (the leading
  28px gap, and per 1.1 the one that actually survives the collapse against `.hm-skip`'s 20) and
  `#home .ix-panel { margin: 0 auto }` (the explicit bottom-0). Neither appears in the new `gap`
  block. Whether the stack's rhythm layer should end at `.hm-skip` or continue through `.ix-foot`
  is a scoping decision this census does not make.
