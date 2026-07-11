# Adversarial verification — `vd-desktop` lens

**Verifier stance:** default to refuting. Every finding independently re-measured against
`dist/index.html` at 1440×900 with my own Playwright scripts and my own reads of the cited source
lines. Nothing below is taken on the original lens's word.

**Headline:** the lens is **unusually accurate on measurement** — 16 of 18 findings reproduce, most
to the exact pixel. But it is **systematically wrong on causation**: four of its root-cause
attributions blame innocent code, and it **missed the single upstream defect that explains six of
its own findings**. Two findings are refuted outright.

| Verdict | Count |
|---|---|
| CONFIRMED (re-measured, evidence reproduces) | 16 |
| REFUTED (could not reproduce / measurably false) | 2 |
| Root causes CORRECTED on otherwise-confirmed findings | 4 |
| MISSED by the original lens | 5 |

---

## THE THING THE LENS MISSED (and it reframes the whole report)

**46 topics = 8 hand-authored (`src/topics/<id>/`) + 38 markdown-authored (`src/topics-md/*.md`).
The 38 markdown topics are missing data that the 8 hand-authored ones have.** That one gap produces
**six** of the lens's "independent" findings:

| Lens finding | event-driven (MD) | content-pipeline (HAND) |
|---|---|---|
| drill `.tiernote` | `"undefined"` | real text |
| mock-run `.mb-task` | `"undefined"` | real text |
| sys-map `.chip` / `.pa` | 294-char chip / **empty** `.pa` | 13-char chip / 272-char `.pa` |
| companion view sync | **8/9 views wrong** | **0/9 wrong** |
| `.wb-foot` | 704×**26**, **empty** | 704×64, 184 chars |
| dead canvas (model/wb/sys) | 358 / 316 / 277 px | **−119 / −422 / −282** (overflows) |

The lens reported these as six unrelated UI bugs across six files and prescribed six different fixes.
They are one data/compiler defect. **Remediation locus is `tools/compiler/parse_md.mjs` + the 38 `.md`
files — not the six renderers the lens pointed at.**

---

## CONFIRMED — 16

### 1. Cram sheet AND Scope overlay serve the build-time default topic (P0) — CONFIRMED
- **Code:** `src/scripts/app/cram-overlay.js:12-24` — `class DeepCram extends HTMLElement`, `if (this._built) return`,
  `root.innerHTML = '<style>…' + \`<div class="cs-one">…Event-driven ingestion: S3 → Lambda…\`` — a hardcoded literal.
  No `renderTopic`, not a `TopicPane`. `src/scripts/app/scope-overlay.js:9-15` is identical in shape.
- **Runtime (mine):** cram body **byte-identical, 3330 chars** across `event-driven` / `content-pipeline` /
  `consistency-models`, while the title *does* update (`Cram sheet · Event-Driven Backbone`, `· Consistency Models`)
  via `src/scripts/app/topic-protocol.js:56`. Scope body **byte-identical, 2275 chars**.
- **Correction:** the scope overlay's title is *generic* ("Scope it first · the questions before the design"),
  so "under a correct-looking title" applies to the **cram sheet only**.
- Evidence: `scripts/vd-desktop-verify-01-p0.mjs`, `scripts/_vd-p0.json`.

### 2. Literal "undefined" in Probe Drill (7/9) and Mock Run (P0) — CONFIRMED, exact
- `.tiernote.innerHTML === "undefined"` on **7 of 9** sampled topics; measured rect **(348, 254), 414×19px** —
  the lens said "(348,254), 414px wide". Exact.
- The 2 that work — `content-pipeline`, `authz` — are **hand-authored**. It's the 38 MD topics.
- Mock Run: `.mb-task.innerHTML === "undefined"` (a literal text node inside `DIV.mb-task`). Confirmed.
- `src/scripts/app/drill/logic.js:180` reads verbatim `if (this._tiernote) this._tiernote.innerHTML = d.tierNotes.all;` — confirmed.
- Evidence: `scripts/vd-desktop-verify-02-panes.mjs`, shot `shots/verify-vd-desktop/mock-run-open.png`.

### 3. System Map pivot rows collapse (P0) — CONFIRMED exact; **ROOT CAUSE WRONG**
All four cited overflow figures reproduce **to the pixel** in a 702px `<summary>`:

| topic | scrollWidth | overflow | chip len | `.pa` |
|---|---|---|---|---|
| event-driven | 1504 | +802 | 294 ch | **empty** |
| stream-batch-processing | 2168 | +1466 | 437 ch | **empty** |
| shared-definition | 1709 | +1007 | 348 ch | **empty** |
| retries-timeouts | 1310 | +608 | 256 ch | **empty** |

`.chip{white-space:nowrap}` (system-map.js:47) and `.piv{overflow:hidden}` confirmed.

**The lens blamed the wrong line.** It says *"system-map.js:93,97 puts the pivot answer into the .chip span"*.
It does not — line 93 is `var headChip = '<span class="chip">' + p.chip + '</span>';` and line 98 puts `p.a`
into `.pa`. The renderer is **correct**; the **data** is mis-shaped.

**Real cause — `tools/compiler/parse_md.mjs:225`:**
```js
const m = /^(->|→)\s*/.exec(raw);
if (m && !piv.chip) piv.chip = '→ ' + raw.slice(m[0].length);   // swallows the WHOLE paragraph
else piv.a = prose(raw);
```
The markdown authors the chip and the answer as **one paragraph with no blank line between them**:
```
#### Which delivery guarantee?

-> at-least-once plus an idempotent consumer, never exactly-once delivery
The broker retries until acked, so it never drops but may duplicate. …
```
`markdown-it` yields one `inline` token, the regex matches its start, and the whole 294-char blob lands in
`chip` while `a` stays `''`. **38 of 38 md files have this shape** (verified by grep). My captured chip text even
contains the embedded `\n` — proof the two lines are one paragraph.

**Fix is 1 line, not M-effort:** split `chip` at the first newline; the remainder becomes `a`. That repairs the
System Map, refills `.pa`, and restores the jump buttons (see MISSED #3) across all 38 topics at once.

### 4. Companion coaches the WRONG VIEW on 8/9 views (P0) — CONFIRMED exact; **ROOT CAUSE WRONG; SCOPE NARROWED**
Re-measured with a 1200 ms settle per switch:
- `event-driven` (MD): **8/9 mismatch** — `walk` shows *"A message from emit to ack"* (a phrase, not the view name);
  `wb/sys/trade/model/num/rf/open` all frozen on **"Probe Drill"**. The lens's 8/9 count is **right** (I initially
  doubted it and was wrong).
- `cdc` (MD): 8/9 mismatch.
- **`content-pipeline` (HAND): 0/9 mismatch — it works perfectly.**

**The lens's recommendation is a dead end.** It says *"Wire #cmpView/#cmpNote/#cmpMove to the same view-change
event the stage-head listens to."* They are **already in the same function** — `shell.js` `upd()` writes the
stage head *and* the companion, and `window.__syncCompanion = upd` is called by `switchTab()` on every path.
It demonstrably works on hand-authored topics.

**Real cause — `src/scripts/app/shell.js:237`:**
```js
if (TOPIC_CMP_NOTES[tab]) {      // <-- silent truthiness guard
```
The 38 md topics declare **only 2** `## Companion Notes` views (`### walk`, `### drill`) — verified across all 38
files. For the other 7 views the key is absent, the guard skips the write, and the rail keeps the previous
topic's text. **Fix:** fall back to the nav button's own label when the key is missing (S), and author the 7
missing notes (M).

### 5. Ambient "mesh" renders as a hard-edged drifting rectangle (P1) — CONFIRMED; **MECHANISM WRONG**
I did not accept the eyeball claim — I ran a **first-derivative pixel scan** across the stage (animations frozen):

| scan | biggest single-pixel step | next biggest |
|---|---|---|
| row y=700 | **x=576, Δ=9** | Δ=4 |
| row y=800 | **x=576, Δ=12** | Δ=4 |
| row y=860 | **x=576, Δ=9** | Δ=3 |
| col x=1120 | **y=360, Δ=15** | Δ=5 |

A Δ=12–15 one-pixel jump against Δ≤4 gradient noise **is** a hard edge. `x=576` and `y=360` are **exactly**
`.stage::after`'s own box edges (`60vw`/`60vh` anchored bottom-right of a 1440×900 viewport). It animates
(`meshB 16s infinite`), so the edges drift. Confirmed.

**But the lens's mechanism is false.** It claims `.stage{overflow-x:hidden}` *clips* the pseudo-elements.
It cannot: I measured `.stage` → `transform:none, filter:none, will-change:auto, contain:none`, so it
establishes **no containing block** for a `position:fixed` descendant, and fixed boxes escape ancestor overflow.
The decisive discriminator: **the seam sits at the blob's own edge (x=576), not at the stage's clip boundary
(x=296 / x=1150).** The cause is the gradient never reaching `transparent` at its near edges
(`radial-gradient(ellipse at 70% 80%, …, transparent 100%)` → transparent only at the *farthest* corner).
The lens's *recommended fix* is nonetheless correct.

### 6. Tool-row chevron ripped out of flow (P1) — CONFIRMED exact
`getComputedStyle('.crambtn', '::after')` →
`content:"›"`, **`position:absolute`**, **`inset:0px`**, `margin-left:**0px**` (the `margin-left:auto` is
neutralised), `opacity:0.5`, `background: radial-gradient(circle, rgba(255,255,2…` — the ripple's gradient.
Host button: `overflow:hidden`, `border-radius:11px`. Two rules fight over one pseudo-element
(`styles.css:159` vs `styles.css:370-371`); the class wins `content`, the ripple's `position/inset` still
cascade in. 11 rows affected (12 `.crambtn`, minus `.cram-tog`). Confirmed.

### 7. Sidebar overflows by 593px (P1) — CONFIRMED exact
`.sidebar` scrollHeight **1493** vs clientHeight **900** = **593px** (66% over). Exact.

### 8. Topic switcher renders one character (P1) — CONFIRMED exact
`#tncurrent` clientWidth **21px** vs scrollWidth **103px** ("Content Pipeline") / **146px** ("Event-Driven Backbone").
`.tn-trigger` computes `display:flex; flex-direction:row; align-items:center` — the eyebrow sits *beside* the name.
The lens's one-line fix (`flex-direction:column`) is sound.

### 9. Numbers value column clipped (P1) — CONFIRMED; **SCOPE + FIX CORRECTED**
Exact reproductions: `"250 workers"` **58 / 86 (+28)**, `"18,000 msgs"` **86 / 93 (+7)**, `"5,000 ops/s"` **77 / 90 (+13)**.
`.nrow-v{white-space:nowrap; overflow:visible}` → text **paints past** the box (right edge 1075 + 28 = **1103**)
and over the card border at **1098**. Confirmed.

**Two corrections:**
- **8 of 9 topics, not 9 of 9** — `content-pipeline` has **0** clipped rows. Across the sample: **27 of 47 rows**.
- **The fix is inverted.** The lens recommends *"split the unit into its own fixed-width column"*. The unit
  **already has one** — `.nv-u{display:inline-block; width:var(--space-30)}` with `--space-30: 30px`. A hard 30px
  box for arbitrary units ("workers", "of requests may fail", "(set above this)") **is the bug**. Give `.nv-u`
  `width:auto; min-width:30px`.

### 10. One verb, four buttons — 15.4× area spread (P1) — CONFIRMED exact
| pane | selector | size | area | type | radius | fill |
|---|---|---|---|---|---|---|
| drill | `#adv` "Reveal answer" | 704×41 | **28,864px²** | 13px/700 | 11px | gradient + shadow |
| walk | `#wnext` "Next →" | 82.8×35 | **2,898px²** | 13px/600 | 10px | white, no shadow |
| open | `.op-rev` "Reveal mine" | 99.1×28 | **2,776px²** | 11.5px/700 | 8px | lavender gradient |
| wb | `.wb-rev` "Reveal" | 67.1×28 | **1,879px²** | 11.5px/700 | 8px | lavender gradient |

Ratio **28,864 / 1,879 = 15.36×**. Every figure matches the lens. (Nit: it's **two** distinct sizes, not three.)

### 11. Inverted composition (P1 → **P2**) — PARTIALLY CONFIRMED; one plank REFUTED
**Confirmed:** sidebar Mock-run CTA **17,358px²**; sidebar H1 **21px/800** with an animated gradient text-fill
(`animation-name: headingShift`, **6s**, **infinite**, `background-clip: text`) — the only animated chromatic text
on the page; stage title **24px/800 solid ink** `rgb(42,40,35)`, `animation:none`; walk's real next action **2,898px²**.
Dead canvas on MD topics: model **358**, wb **316**, rf **311**, sys **277**, walk **169** — matching the lens's
355/314/309/276/166 within ~3px.

**Refuted plank:** see REFUTED #1 (the companion does not overflow).
**Re-attributed plank:** the dead canvas is **content depth, not layout**. On hand-authored topics the same panes
**overflow** the fold (model −119, wb −422, rf −647, trade −1527). MD topics ship 2 pivots where hand-authored ship 7.
Widening the stage (the lens's L-effort recommendation) would **worsen** it; authoring the missing content fixes it.

### 12. Type scale not honoured (P2) — CONFIRMED
**7 off-scale sizes** — 9.5, 10, 10.5, 11.5, **13.3333**, 13.5, 17 — and **11 distinct sizes in the 9–14px band**
(9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 13.3333, 13.5, 14). 13.3333px is Chrome's UA `<button>` default, independently
confirmed on `.dn-step` (×22) and `.ix-card` (46 cards). `font:` shorthand: **91 uses** measured (the lens said ~30 — an undercount).

### 13. Prose 118.7ch / 36.6ch (P2) — CONFIRMED exact
`.nrow-n` 704px @ 11px = **118.7ch**; `.sm-intro` 704px @ 12px = **108.8ch**; `.opt-w` 684px @ 13px = **97.6ch**;
`.cmp-thesis` 237px @ 12px = **36.6ch**. `max-width: none` on all four.

### 14. Group-colour identity is invisible, and it's unmodified Tailwind (P2) — CONFIRMED exact
`rgb(13,148,136) rgb(37,99,235) rgb(217,119,6) rgb(124,58,237) rgb(219,39,119) rgb(220,38,38)` =
Tailwind teal/blue/amber/violet/pink/red-**600**, unmodified. `--topic-accent` is **unset**; `.sh-kick` and
`.cmp-eyebrow` both compute to `rgb(83,74,183)` — the **generic** accent. The colour never reaches the stage.

### 15. Two overlay design languages ship side by side (P2) — CONFIRMED
| overlay | width | radius | close | title |
|---|---|---|---|---|
| mock / mixed / session / keyboard / scope / gameplan | 560 | 18px | **LEFT** | UPPERCASE |
| cram | 600 | 18px | **LEFT** | UPPERCASE |
| topic index | 760 | 16px | **RIGHT** | sentence |
| notes | 660 | 16px | **RIGHT** | sentence, top:292 (not top-anchored) |

Four widths, two radii, two close sides, two title treatments. Confirmed.

### 16. disabled = opacity .32; empty styled box in the Whiteboard (P2) — CONFIRMED
`#wprev` disabled → `opacity: 0.32`, background still `rgb(255,255,255)` — the whole control fades uniformly.
`.wb-foot` on MD topics: **704×26, textLen 0, empty**, carrying `border-left: 3px solid rgb(83,74,183)` — exactly the
lens's 704×26. On hand-authored topics it is populated (704×64/84, 184–323 chars). Confirmed; MD-scoped.

### 17. Home is a 760px modal over a blurred topic; topic name appears 3× (P3) — CONFIRMED
Index overlay: **760px wide, top 72, radius 16px, 3-column grid, 46 cards, open at boot**. Topic title renders
exactly **3× simultaneously**: `H1` (21px), `.tn-current` (13px, truncated to 21px of box), `.cmp-topic` (24px).

---

## REFUTED — 2

### R1. "The companion overflows by 668–686px on every pane, cut mid-sentence with no scroll affordance" — **FALSE**
Measured `.companion` on **9 views × 6 topics (54 cells)**:

```
topic             kind     walk  drill     wb    sys  trade  model    num     rf   open
event-driven      MD          0      0      0      0      0      0      0      0      0
slos              MD          0      0      0      0      0      0      0      0      0
caching           MD          0      0      0      0      0      0      0      0      0
content-pipeline  HAND        0      0      0      0      0      0      0      0      0
authz             HAND        0      0      0      0      0      0      0      0      0
signing           HAND        0      0      0      0      0      0      0      0      0
```
`scrollHeight === clientHeight === 900` everywhere; **overflow = 0px**. The claimed "1568px of content in a 900px
column" does not exist. Deepest descendant bottom = 900 (913 on `walk` — a 13px decorative overhang).

And the "no scroll affordance" half is also false: `styles.css:447` sets `.companion{overflow-y:auto}` and
`styles.css:37-38` gives it a **styled 5px scrollbar with an accent thumb**.

This was a **load-bearing plank of the P1 "Inverted composition" finding** ("space is allocated backwards").
Half that argument is fabricated.

### R2. "A destructive action is styled exactly like a benign one" (P3) — **FALSE as written**
Measured, in the Session Progress overlay:

| button | size | border | text | weight |
|---|---|---|---|---|
| "Save this session as a PDF →" | 518×**40** | `rgb(83,74,183)` **accent** | `rgb(58,46,134)` **accent** | **700** |
| "Clear this session & start fresh" | 518×**36** | `rgb(232,228,220)` **muted** | `rgb(103,97,90)` **muted** | **600** |

They are **not** "of identical visual weight" — the destructive action already carries a muted border, muted text
(`--mut`), a lighter weight and a shorter box. The lens's own prescription ("de-emphasise it, set the label to
`--mut`") is **already implemented**. Only a residual survives: no danger colour on hover and no confirm step —
a different, smaller finding than the one filed.

---

## MISSED by the original lens — 5

1. **One upstream cause, not six bugs.** 38 of 46 topics are markdown-authored and missing data the 8 hand-authored
   topics have. This single gap produces findings #2, #3, #4, #16 and the dead-canvas plank of #11. The lens filed
   them as six independent defects across six files with six different fixes. **Fix locus is the compiler + the
   `.md` files.** (P0 — this is the highest-leverage fact in the report.)
2. **The md defect is one missing blank line, in 38/38 files.** `parse_md.mjs:225` swallows the `->` chip line *and*
   the following answer line into `chip` because they form a single markdown paragraph. A **1-line** compiler change
   (split `chip` at the first `\n`; remainder → `a`) repairs the System Map, refills `.pa` and restores the jump
   buttons across all 38 topics simultaneously. The lens rated this M-effort against the wrong file.
3. **Cross-topic "Jump to …" navigation is dead on 38/46 topics.** `sysRenderPivot` renders the jump `<button>`
   *inside* `.pa` — and `.pa` is empty on md topics. Measured: **1 jump button across 10 md pivots** vs **17 across
   21 hand-authored pivots**. A real navigational feature is silently absent on 83% of the app. (P1)
4. **The ripple gradient is stuck permanently ON at 50% on all 11 tool rows.** The lens caught the chevron
   displacement but missed the other half of the same collision: `.crambtn:not(.cram-tog)::after` wins `opacity:.5`
   over the ripple rule's `opacity:0`, so the ripple's white radial-gradient — meant to appear only on `:active` —
   paints continuously on every tool row. (P2)
5. **MD topics ship 2 pivots where hand-authored ship 7** (and 2 companion notes vs 9). The "stage sits 30–40%
   empty" symptom the lens attributed to *composition* is a **content-depth** deficit. Its L-effort recommendation
   (widen the stage, rebalance columns, move the companion's "spine" into the stage) would make the emptiness worse
   and is aimed at the wrong problem. (P1 — a false-remediation trap.)

---

## Scripts & evidence (all under `_audit/2026-07-11-state-audit/`)
- `scripts/vd-desktop-verify-00-discover.mjs` — DOM/selector discovery (real selectors, no guessing)
- `scripts/vd-desktop-verify-01-p0.mjs` → `scripts/_vd-p0.json` — companion sync, cram, scope
- `scripts/vd-desktop-verify-02-panes.mjs` → `scripts/_vd-panes.json` — drill/sys/num/mock
- `scripts/vd-desktop-verify-03-visual.mjs` → `scripts/_vd-visual.json` — chevron, mesh CSS, buttons, colours
- `scripts/vd-desktop-verify-04-recheck.mjs` → `scripts/_vd-recheck.json` — stage, companion, overlays, session
- `scripts/vd-desktop-verify-05-topicaxis.mjs` → `scripts/_vd-topicaxis.json` — **md vs hand-authored sweep**
- `scripts/vd-desktop-verify-06-mesh.mjs` — pixel first-derivative seam scan
- `scripts/vd-desktop-verify-07-type.mjs` → `scripts/_vd-type.json` — type scale, prose, index
- `scripts/vd-desktop-verify-08-jump.mjs` — cross-topic jump-button loss
- Shots: `shots/verify-vd-desktop/` (`mock-run-open.png`, `wb-event-driven.png`, `mesh-full-rf.png`,
  `session-overlay.png`, `index-home.png`, `00-boot.png`)

**Console/page errors across every run: zero.**
