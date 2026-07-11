# FX-FORMAT — the Ceiling Map

**Lens:** FORMAT PARITY. *Can the markdown format express everything the hand-coded JS schema can?*

**Verdict: YES. The markdown format is NOT the ceiling.**

I re-authored **content-pipeline** — the flagship, the deepest hand-coded topic — entirely in
markdown and compiled it with the real `parse_md.mjs`. **0 of 35 structural fields were lost.**
All 46 follow-up probes, all 9 companion-note panes, all 6 system stages with the `[*]` marker,
all 7 pivot answers, all 6 mock beats with `model` + `int` + `int2`, all 58 model-answer beats —
every one round-tripped.

> The thesis said the compiler is a CEILING. It is not a ceiling. It is a **sieve**.
> The format can carry the whole spec. The *parser* drops 531 items on the floor —
> and it drops them **because the authors followed the format spec's own examples.**

Reproduce: `node _audit/2026-07-11-compiler-parity/fx-roundtrip.mjs`

---

## 1. The root cause — one bug, five sites

`markdown-it` merges soft-wrapped consecutive lines into **ONE paragraph token** whose `.content`
carries the embedded `\n`s. Every pane parser treats a paragraph as a **single record**: it
regex-matches a `Label:` prefix, then takes `raw.slice(...)` — **swallowing every following line
into the first field**. And the two list-shaped sections only accept `bullet_list_open` tokens.

`TOPIC_MARKDOWN_FORMAT.md` **demonstrates the plain-line form in exactly these five places.** All
38 authors followed the doc. The parser cannot read its own spec.

**The control that proves the mechanism:** `bank.curveballs[].model` — where `Model:` sits *alone*
in its paragraph (`FORMAT.md:388`) — is authored 38 times and parsed **38/38**. The identical
`Model:` line inside a mock beat, where a `Task:` line precedes it in the same paragraph
(`FORMAT.md:379`), is authored 76 times and parsed **0/76**. Same field, same syntax; the only
variable is whether a sibling line shares the paragraph.

---

## 2. Doc/parser contradictions — the format spec's own example topic

I copied every example out of `TOPIC_MARKDOWN_FORMAT.md` verbatim into one topic and parsed it.
**9 of 17 fields come out wrong** (`node _audit/2026-07-11-compiler-parity/fx-docspec.mjs`):

| # | The doc demonstrates | Parser wants | Result |
|---|---|---|---|
| 1 | `FORMAT.md:249-253` — stages as **plain lines** | `parse_md.mjs:203` — `bullet_list_open` | `stages: []` |
| 2 | `FORMAT.md:186-190` — tier notes as **plain lines** | `parse_md.mjs:342` — `bullet_list_open` | `tierNotes: {}` |
| 3 | `FORMAT.md:261-262` — chip line, **answer on next line** | `parse_md.mjs:225` — `raw.slice()` | chip **eats** the answer; `a: ""` |
| 4 | `FORMAT.md:378-381` — `Task:`/`Model:`/`Int:`+answer, **4 consecutive lines** | `parse_md.mjs:431` — `raw.slice()` | `task` **eats** all 3; `model`/`int` `undefined` |
| 5 | `FORMAT.md:201-202` — `Senior:` / `Speak:` on **consecutive lines** | `parse_md.mjs:354` — `raw.slice()` | `senior` **eats** `Speak:`; `speak[i]: ""` |
| 6 | `FORMAT.md:386` — `### CURVEBALL \| theme \| cue` | `parse_md.mjs:407` — `theme: p[0]` | `theme` = the literal string `"CURVEBALL"` |

Note the prose in the doc says *"bullets"* for #1 and #2 (`FORMAT.md:181`, `:238`) while the
**example directly below it shows plain lines**. The doc contradicts itself; the examples won.

---

## 3. What is actually lost — measured, per build

`node _audit/2026-07-11-compiler-parity/fx-dropcount2.mjs` (authored in the `.md` → returned by the parser):

| Field | Authored | Parsed | Lost | Parser site |
|---|---:|---:|---:|---|
| `sys.stages[]` | 189 | **0** | **189** | `parse_md.mjs:203` |
| `drill.tierNotes{}` | 114 | **0** | **114** | `parse_md.mjs:342` |
| `sys.pivots[].a` | 76 | **0** | **76** | `parse_md.mjs:225` |
| `bank.mockBeats[].model` | 76 | **0** | **76** | `parse_md.mjs:431` |
| `bank.mockBeats[].int` (q) | 76 | **0** | **76** | `parse_md.mjs:431` |
| `bank.mockBeats[].int` (a) | 76 | **0** | **76** | `parse_md.mjs:431` |
| `bank.curveballs[].theme` | 38 | 38 *junk* | 38 | `parse_md.mjs:407` |
| **TOTAL** | | | **531 + 38 corrupted** | |

### It is user-visible, in the shipped app

`node _audit/2026-07-11-compiler-parity/fx-runtime.cjs` (read-only, against `dist/index.html`, 46 topics registered):

| | content-pipeline (hand-JS) | idempotency (markdown) |
|---|---:|---:|
| `sys.stages` | 6 | **0** |
| `sys.pivots` WITH an answer | 7 | **0** |
| `drill.tierNotes.all` | `<b>All four…` | **`undefined`** |
| `bank.mockBeats` with a model answer | 6 | **0** |
| `bank.mockBeats` with an interrupt | 6 | **0** |
| `cmpNotes` panes (of 9) | 9 | **2** |

* **`drill/logic.js:180`** — `this._tiernote.innerHTML = d.tierNotes.all` → `tierNotes` is `{}` →
  the drill pane renders the literal word **"undefined"** on all 38 markdown topics.
* **`mixed-fire.js:166`** — `'…Model answer</div>' + beat.model + '</div>'` → renders the literal
  word **"undefined"**.
* **`mixed-fire.js:161`** — `const fire = !!(mockInterrupt && beat.int && …)` → `beat.int` is
  `undefined`, so `fire` is **always false**: the *"the interviewer cuts in"* feature is **dead on
  every markdown topic**. A whole product feature, silently disabled by a `raw.slice()`.

### Why the gate never caught it

`topic-schema.mjs:62-66` `NEED_ARRAY` asserts `Array.isArray(v[pane][field])` — **shape, never
population**. `stages: []` is an array, so it passes. **38/38 topics pass zod** with `sys.stages`
empty, every `drill.f` empty, `bank.model` undefined and 7/9 companion panes absent. This is the
same truthiness disease as `test/topic_contract.cjs:52`.

---

## 4. THE CEILING MAP — every schema field, 3 columns

Reference spec = the 8 hand-coded topics (`node _audit/2026-07-11-compiler-parity/fx-keyset.mjs`).
**A = markdown syntax exists · B = documented · C = parser consumes it.**

| Schema field | A: md syntax | B: doc'd | C: parser consumes | Verdict |
|---|---|---|---|---|
| `identity.{index,total,group,title,h1,locatorTail}` | frontmatter | yes | yes | **OK** |
| `identity.{thesis,sub,spine[]}` | `## Thesis/Sub/Spine` | yes | yes | **OK** |
| `identity.{cramTitle,reportTitle,companionTopic}` | frontmatter | yes | yes | **OK** |
| `identity.cmpNotes{9 panes}` | `### <view>` + 3 paras | yes | **yes (generic)** | **AUTHORING** — only `walk`+`drill` written (76/342) |
| `walk.steps[].{t,k,ins,deep,cap}` | `###` + paragraphs | yes | yes | **OK** |
| `walk.steps[].flow` | ```` ```flow ```` DSL | yes | yes | **FORMAT GAP** ×2 (below) |
| `walk.steps[].code` | ```` ```js ```` + `==hl==` | yes | yes | **FORMAT GAP** (no string span) |
| `walk.steps[].diagram` | ```` ```mermaid ```` | yes | yes | **OK** |
| `walk.modelScript[].{ml,t,mq,ans}` | `### Model Script` bullets | yes | yes | **OK** |
| `drill.cards[].{tier,signal,q,a}` | `### tier \| signal` | yes | yes | **OK** |
| `drill.cards[].f[]` (follow-ups) | `Follow:` + next line | yes | **yes — verified PASS** | **AUTHORING** — 0 authored vs 41.9/topic in the 8 |
| `drill.cards[].senior` | `Senior:` | yes | **eaten by `Speak:`** | **PARSER** + **AUTHORING** (0 authored) |
| `drill.speak[]` | `Speak:` | yes | **eaten by `Senior:`** | **PARSER** + **AUTHORING** (0 authored) |
| `drill.tierNotes{}` | plain lines *(doc)* / bullets *(parser)* | **contradicts** | **NO** | **PARSER — 114 lost** |
| `drill.tierNotes.all` | same | yes | n/a | **AUTHORING** — the 38 write only SDE2/SDE3/Staff; `logic.js:180` needs `.all` → renders `undefined` |
| `wb.{sub,steps[].c,steps[].a,diagram,foot,okVerdict}` | `###`/fence/`Foot:`/`Verdict:` | yes | yes | **OK** |
| `sys.intro`, `sys.heads.*` | paragraph / `###` | yes | yes | **OK** |
| `sys.stages[].{n,d,cur}` | plain lines *(doc)* / bullets *(parser)* | **contradicts** | **NO** | **PARSER — 189 lost** |
| `sys.pivots[].{q,chip}` | `####` + `-> ` | yes | yes | **OK** |
| `sys.pivots[].a` | next line | yes | **swallowed into `chip`** | **PARSER — 76 lost** |
| `trade.{lead,decisions[].q,.opts[],.tell}` | `###` + bullets | yes | yes | **OK** |
| `model.{selectors,answers[].opener,.sub,.beats[]}` | `### sel \| opener` + bullets | yes | yes | **OK** |
| `num.{lead,tell,inputs[],compute}` | paras + bullets + fence | yes | yes | **OK** |
| `rf.{lead,flags[].bad,.tell,.fix,.note}` | `###` + paras + `Note:` | yes | yes | **OK** |
| `open.cards[].{kind,k,t,lead,items[],hooks,foot}` | `###`/`####`/`#####` | yes | yes | **OK** |
| `bank.mockBeats[].{tag,cue,task}` | `### tag \| cue` + `Task:` | yes | yes | **OK** (task lands as a 4-line blob) |
| `bank.mockBeats[].model` | `Model:` | yes | **swallowed into `task`** | **PARSER — 76 lost** |
| `bank.mockBeats[].int{q,a}` | `Int:` + next line | yes | **swallowed into `task`** | **PARSER — 76 lost** |
| `bank.mockBeats[].int2{q,a}` | `Int2:` + next line | yes | swallowed | **PARSER** + **AUTHORING** (0 authored) |
| `bank.mockBeats[].theme` | `### tag \| theme \| cue` | yes | yes | **AUTHORING** — 0 authored (2-part headings) |
| `bank.curveballs[].theme` | `### CURVEBALL \| theme \| cue` | yes | **takes the tag as the theme** | **PARSER — 38 corrupted** |
| `bank.curveballs[].{task,int}` | `Task:`/`Int:` | yes | yes | **AUTHORING** — 0 authored |
| `bank.frames[]`, `bank.cards`/`speak` | bullets / emitter refs | yes | yes | **OK** |

**Bottom line: of ~60 schema fields, exactly THREE have a true format gap — and all three are
cosmetic sub-DSL limits inside `flow`/`code`, not structural.**

### The 3 real FORMAT gaps (markdown genuinely cannot express these)

| # | Field | What the 8 use | Why md can't | Uses in the 8 |
|---|---|---|---|---|
| **F1** | `walk.steps[].flow` | connectors `+`, `vs`, `<->` | `flow.mjs:21` `CONN = {'->','.','/'}` — anything else **THROWS** at `flow.mjs:34` | 9 |
| **F2** | `walk.steps[].flow` | box label `strategies[ext]` | `flow.mjs:24` `boxRe = /([a-z]+)\[([^\]]*)\]/` — label runs to the **first** `]`; **no escape**. The stray `]` then reads as a connector and **THROWS** | ≥1 (flagship step 1) |
| **F3** | `walk.steps[].code` | `<span class="s">` string literals | `code.mjs:27` `TOKEN` matches only `==hl==` and keywords — **no string rule** | 50 |

F1 and F2 **fail the build loudly** (good — they cannot ship silently). F3 degrades silently:
a markdown-authored `js` block simply never colors string literals.

> These three are the *entire* answer to "what can the 8 do that markdown cannot." Nine flow
> connectors, one bracket escape, and one syntax-highlighting rule. Roughly 30 lines of code.

---

## 5. The fix, and what it recovers

`_audit/2026-07-11-compiler-parity/parse_md.PARITY.mjs` — six changes, all in the paragraph
handlers. Two helpers (`lines()`, `segment()`) encode the one missing idea: **a paragraph's
soft-wrapped lines are separate logical records.**

Measured over the **same 38 `.md` files, zero content edits**
(`node _audit/2026-07-11-compiler-parity/fx-recover.mjs`):

| Field | Shipping | Fixed | Recovered |
|---|---:|---:|---:|
| `sys.stages[]` | 0 | 189 | **+189** |
| `sys.stages[].cur` | 0 | 38 | **+38** |
| `sys.pivots[].a` | 0 | 76 | **+76** |
| `drill.tierNotes{}` | 0 | 114 | **+114** |
| `bank.mockBeats[].model` | 0 | 76 | **+76** |
| `bank.mockBeats[].int` (q) | 0 | 76 | **+76** |
| `bank.mockBeats[].int` (a) | 0 | 76 | **+76** |
| `bank.curveballs[]` real theme | 0 | 38 | **+38** |
| *controls* (drill.cards 798, walk.steps 153, model.answers 76, rf.flags 114, trade 114, open 38) | — | — | **unchanged** |
| **TOTAL** | | | **+683** |

Every control is byte-identical → the fix is **additive**, not a re-interpretation. zod: 38/38
before, 38/38 after. Spot-checked semantically correct: the `[*]` lands on the right stage, the
chip/answer split cleanly, `curveballs[0].theme` becomes `"ordering"` instead of `"CURVEBALL"`.

### The six changes

| # | Site | Change |
|---|---|---|
| 1 | `parse_md.mjs:219` (`parseSys`) | add a `mode === 'stages'` paragraph branch → plain-line stages |
| 2 | `parse_md.mjs:225` (`parseSys`) | split the chip paragraph on the first `\n`: line 1 = `chip`, rest = `a` |
| 3 | `parse_md.mjs:342` (`parseDrill`) | accept a plain-line paragraph before the first card → tier notes |
| 4 | `parse_md.mjs:352` (`parseDrill`) | `segment()` the paragraph on `Follow:`/`Senior:`/`Speak:` |
| 5 | `parse_md.mjs:407` (`parseBank`) | drop the literal `CURVEBALL` token before reading `theme` |
| 6 | `parse_md.mjs:430` (`parseBank`) | `segment()` the beat paragraph on `Task:`/`Model:`/`Int2:`/`Int:` |

Keep the bullet branches: both forms then parse, so nothing already working breaks.

### Then close the gate that let it happen

`topic-schema.mjs:62-66` must assert **population, not shape**: `sys.stages`, `sys.pivots`,
`rf.flags`, `bank.mockBeats` etc. need `.min(1)`, and the render-critical `drill.tierNotes.all`
must be required. Until it does, the next silent drop ships exactly the same way. The
`compiler_md` fixtures must be re-derived from the **doc's** examples, not from the parser's
current behaviour.

---

## 6. What a parser fix does NOT buy — the honest remainder

The 531 are a *compiler* debt. The rest of the depth gap is a genuine **authoring** debt, and no
parser change touches it. The format supports every one of these **today**:

| Field | The 8 | The 38 | Authorable now? |
|---|---:|---:|---|
| `drill.cards[].f[]` follow-up probes | 335 (41.9/topic) | **0** | **Yes** — `Follow:` verified PASS against the doc's example |
| `drill.cards[].senior` | 8/8 | **0** | Yes (needs fix #4 for the consecutive-line form) |
| `drill.speak[]` | 8/8 | **0** | Yes (needs fix #4) |
| `identity.cmpNotes` panes | 9/9 | **2/9** | **Yes** — parser is generic over `### <view>`; 266 notes unwritten |
| `drill.tierNotes.all` | 8/8 | **0** | Yes — one bullet per topic; today it renders `undefined` |
| `bank.mockBeats[].int2` | 3/topic | **0** | Yes (needs fix #6) |
| `bank.mockBeats[].theme` | 8/8 | **0** | Yes — use the 3-part `### tag \| theme \| cue` heading |
| model answers / beats | 9 / 62 | 2 / 6 | Yes — pure volume |
| walk steps · wb steps · rf flags · sys pivots · trade decisions | 9 · 9 · 9 · 7 · 7 | 4 · 2 · 3 · 2 · 3 | Yes — pure volume |

**Split of the depth gap: ~683 items are a compiler bug (free, one file). The remainder is
content nobody wrote (expensive, but unblocked).** Fix the parser first — otherwise every new
`Follow:` an author writes lands in a field the renderer already ignores.

---

## Files

* `fx-keyset.mjs` — key-path census, the 8 vs the 38
* `fx-docspec.mjs` — the doc's own example topic → 9/17 fields mis-parsed
* `fx-dropcount2.mjs` — precise authored→parsed accounting (531)
* `fx-roundtrip.mjs` — **the killer test**: the flagship re-authored in markdown, 0/35 lost
* `content-pipeline.ROUNDTRIP.md` — the generated flagship markdown (proof it is authorable)
* `parse_md.PARITY.mjs` — the 6-change fix
* `fx-recover.mjs` — +683 recovered, controls unchanged
* `fx-runtime.cjs` — runtime proof in `dist/` (the literal `undefined`; the dead interrupt feature)
