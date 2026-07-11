# Adversarial verification — `inv-topics` lens

**Verdict: the lens is substantially CORRECT. All 9 findings survive independent re-checking.**
I could not refute a single finding on substance. I did refute three specific *evidence claims*
inside otherwise-valid findings, and I found one **P1 the lens missed** (an active mis-navigation
trap), plus two P3s.

Evidence base: `dist/index.html`, 5,163,186 bytes, md5 `6fc92f15288ae4567d1b035db3e98e9c`,
mtime 14:12 — byte-identical to the artifact the original lens measured. No source file was
modified by me; all writes confined to `_audit/2026-07-11-state-audit/`.

---

## Method

I did **not** reuse the original lens's scripts. I re-derived every number from:
- the **generated compiler output** (`src/topics/_generated/*/sys.js` etc.) — the ground truth for
  what actually shipped;
- an **independent Playwright census** of the live registry
  (`scripts/verify-inv-topics.mjs`);
- the **real compiler parser** (`import { parseMarkdown } from tools/compiler/parse_md.mjs`) run
  against an in-memory fixed copy, to test the proposed fix (`scripts/verify-fix-independent.mjs`);
- direct file reads for every cited line.

---

## CONFIRMED (9/9)

### 1. P0 — System Map stage chain silently dropped on 38/46 topics ✅ CONFIRMED

Strongest possible evidence — it's visible in the **shipped compiler output**, not just at runtime:

```
$ grep -l '"stages": \[\]' src/topics/_generated/*/sys.js | wc -l
38            # ...out of 38 generated sys.js files. ALL of them.
```

`src/topics/_generated/caching/sys.js` literally contains `"stages": [],`.

The content **is** authored — `src/topics-md/caching.md:266` is `### Where it sits`, and lines
268–272 carry 5 stage lines with the compiler's `[*]` you-are-here marker on line 270
(`Shared cache (Redis): ... [*]`). And it is authored in **all 38**:

```
$ grep -lE '^\S.*\[\*\]\s*$' src/topics-md/*.md | wc -l   → 38   (plain lines, dropped)
$ grep -lE '^-\s.*\[\*\]\s*$' src/topics-md/*.md | wc -l  → 0    (bullet lines, would parse)
```

Root cause confirmed by reading the parser: `parseSys` only fills `stages` from a
`bullet_list_open` token (**parse_md.mjs:203**). Authors wrote plain lines → markdown-it folds them
into one paragraph → the `paragraph_open` branch (**parse_md.mjs:219**, *not* :218 as cited) is
reached with `mode==='stages'` and `piv===null`, which matches **no** branch (`mode===null`? no.
`mode==='pivots'`? no. `piv`? null.) → content silently discarded, no error.

Runtime + DOM: `caching/sys` renders `.stg = 0`, `#smChain` height **0px**, `innerHTML` **0 chars**.
Legacy `content-pipeline/sys` renders `.stg = 6`, height **364px**. All 8 legacy topics have
`stages = 6`; all 38 markdown have `stages = 0`.

- Empty: `shots/verify-inv-topics/CLEAN-sys-markdown-caching.png` — "Where it sits" is a heading +
  one line of intro over dead space.
- Full: `shots/verify-inv-topics/CLEAN-sys-legacy-content-pipeline.png` — 6 numbered stages with a
  "YOU ARE HERE" badge.

**The proposed fix is real — I verified it against the actual compiler** (`verify-fix-independent.mjs`,
in-memory only): prefixing the stage lines with `- ` takes `caching` from `stages: 0 → 5`, with
`cur:true` landing correctly on exactly one stage (`Shared cache (Redis)`). Every other slice is
byte-identical (`slices changed: 1`; `identity identical: true`). No code change needed.

### 2. P1 — Pivot answers crammed into the summary chip; disclosure body empty ✅ CONFIRMED

```
TOTAL pivots (markdown)     : 76
markdown pivots WITH answer : 0        ← every single one has a === ''
legacy pivots WITH answer   : 56 of 56
```

`caching/sys.js` ships `"chip": "→ cache-aside by default...\nCache-aside caches only what's read
and keeps writes simple, at the cost of a stale-populate race...", "a": ""` — the answer is inside
the chip, behind a `\n`. 38/38 markdown topics have a newline inside a chip.

I re-measured the clipping **correctly** (chip box vs its containing card — the right test):

| | markdown | legacy |
|---|---|---|
| pivots whose chip box overflows the card | **76 / 76** | **0 / 56** |
| chip box width | 1054–2098px | 60–220px |
| card width | ~704px | ~704px |
| chip text length | 223–437 chars | short labels |

caching pivot 1: chip **323 chars / 1555px** inside a **704px** card, `.pa` body = **0 chars**.
Exactly the lens's numbers. Fix verified: chip 323→70, `a` 0→258.

*(Note: the lens said "~590px card"; it's 704px at 1440px viewport. Viewport-dependent, conclusion
unchanged.)*

### 3. P1 — Coaching rail shows another topic's advice ✅ CONFIRMED (100% reproducible)

**shell.js:237** is `if (TOPIC_CMP_NOTES[tab]) {` … closing at 244 with **no `else`**. The data
object *is* swapped correctly on switch (topic-protocol.js:73), but when the new topic has no note
for the current pane the DOM `textContent` is simply **never overwritten** — it keeps the last
value written.

Coverage confirmed: markdown topics carry cmpNotes for `["walk,drill"]` only (2 of 9 panes); all 8
legacy carry `["walk,drill,wb,sys,trade,model,num,rf,open"]` (9 of 9).

Wrong-topic repro — deterministic:
```
AT content-pipeline/sys : {"view":"System Map","note":"Zoom out to the six stages — and the exact points an interviewer pivots."}
AT caching/sys (switched): {"view":"System Map","note":"Zoom out to the six stages — and the exact points an interviewer pivots."}
header now reads         : Caching Strategies
>> RAIL UNCHANGED AFTER TOPIC SWITCH: true
```
That string is `src/topics/content-pipeline/identity.js:31` **verbatim** — the line cite is correct.
It also promises "the six stages" on a pane whose stage chain is empty (finding 1).

**Impact is worse than the lens said — the rail is visible on BOTH surfaces.** I checked computed
style and ancestor visibility:
- desktop 1440px: `#cmpNote` 237×38px, `display:block`, `hiddenBy: null` → **visible**
- mobile 390px: desktop rail hidden by `aside.companion`, but the mobile mirror `#mCmpView`
  is 326×21px and **visible** — same leaked text.

Shots: `rail-leak-desktop.png`, `rail-leak-mobile.png`, and `CLEAN-sys-markdown-saga-spurious-jump.png`
(Content Pipeline's note displayed while rehearsing **The Saga Pattern**).

### 4. P1 — Systematic depth gap ✅ CONFIRMED (independent re-measure matches)

My census, computed from the live registry without reference to theirs:

| slice | legacy (n=8) | markdown (n=38) |
|---|---|---|
| drill.cards | 21.6 | 21.0 ← the only gate-measured pane; the only one that matches |
| walk.steps | 9.0 | 4.0 |
| wb.steps | 9.0 | 2.0 |
| sys.stages | 6.0 | **0.0** |
| sys.pivots | 7.0 | 2.0 |
| trade.decisions | 7.0 | 3.0 |
| model.answers | 9.0 | 2.0 |
| num.inputs | 4.0 | 3.0 |
| rf.flags | 9.0 | 3.0 |
| open.cards | 2.0 | 1.0 |
| bank.curveballs | 8.0 | 1.0 |
| bank.mockBeats | 6.0 | 2.0 |
| identity.cmpNotes | 9/9 panes | 2/9 panes |

Every figure reproduces (their `drill.cards` legacy mean 21.5 vs my 21.6 — 173/8 = 21.625, a
rounding artifact, immaterial). The "you get what you measure" conclusion holds: `drill` is the one
pane the gate counts and the one pane that isn't thin.

### 5. P2 — The contract gate tests truthiness, not population ✅ CONFIRMED

**test/topic_contract.cjs:52** (cited as :53):
```js
cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(id + ': missing "' + v + '" slice'); });
```
`{stages: [], pivots: [...]}` is truthy → passes. I read the whole file: `drill.cards` is the
**only** slice with a count assertion (`MIN_CARDS: 18`, `MIN_PER_CORE: 3`, lines 27–28). Nothing
else is counted, so `sys.stages === []` on 38/46 and `pivot.a === ''` on 76/76 are invisible to it.

### 6. P2 — 30-Second pane missing its closer on 38/46 ✅ CONFIRMED (but the lens's DOM evidence is wrong)

Data level, unambiguous:
```
markdown openCards===1 : 38 / 38   kinds = [open]
legacy   openCards===2 :  8 / 8    kinds = [open, close]
```
The compiler supports both (parse_md.mjs:244 assigns `kind: cardIdx === 0 ? 'open' : 'close'`); the
markdown simply never authors a second card. The nav button label is literally
`"30-SecondOPEN & CLOSE"` — the UI promises a close 83% of topics don't have. Card headings show the
gap plainly: caching = `["30s / The one-liner"]`; content-pipeline = `["Match the altitude / …",
"Land it / How to close — don't trail off"]`.

⚠️ **The lens's cited evidence — "3 `.op` elements vs 7" — does not reproduce.** See Refuted (a).

### 7. P2 — 492KB three.js kit ships for exactly 1 of 46 topics ✅ CONFIRMED

`src/scripts/visuals/kit.js` = **492,945 bytes**; `dist/index.html` = 5,163,186 bytes → **9.5%** of
payload. `VisualKit` appears 5× in dist (inlined). `## Visual` appears in exactly one file:
`src/topics-md/kafka-internals.md:445`. `data.visual` is set on `kafka-internals` only.

**The viz-tab claim is correct and I initially got it wrong.** My first sweep reported the tab
visible on `stream-batch-processing`; that was an off-by-one from a 12ms wait (see Missed #3). With
a proper 400ms settle: **viz visible on `kafka-internals` only, hidden on 45, zero mismatches
between `viz.hidden` and `data.visual`.** The lens was right.

### 8. P3 — Flat 7/7/7 tier split vs the canonical 5/11/5 ✅ CONFIRMED

All 38 markdown topics are **exactly** `7/7/7/0` (SDE2/SDE3/Staff/EXTEND) — a single distinct value
across all 38. Legacy: 5/11/5 ×5, 5/12/5 (iac), 5/13/6 (authz), 3/10/8/1 (content-pipeline).
`TOPIC_CONTRACT.md:26` does say "(canonical split 5 / 11 / 5)". The gate only enforces ≥3, so 7/7/7
passes. 971 drill cards total. Doc and 83% of content genuinely disagree.

### 9. P3 — `identity.total` is a dead field with a wrong value ✅ CONFIRMED

```
$ grep -rn 'identity\.total\|idn\.total' src/scripts/
(no output — exit 1)
```
Zero consumers. Values are `38` on all generated and `8` on all legacy — neither is 46. The only
`.total` hits in `src/scripts/app/` are whiteboard-progress stats (`progress.js:32/35`,
`session-progress.js:60`, `index-overlay.js:289`), an unrelated field. Exactly as reported.

---

## REFUTED — false evidence inside valid findings

These do **not** kill their findings, but anyone who checks the cited numbers will find them wrong,
which undermines trust in the report.

### (a) "3 `.op` elements vs 7" — WRONG. `.op` is not the card selector.

`.op` is an **item** inside a card (`opener-altitude.js:55`); the card is `.card` (line 70). Real,
settled counts:

| topic | `.card` | `.op` | data.open.cards |
|---|---|---|---|
| caching (md) | **1** | **2** | 1 `[open]` |
| saga (md) | **1** | **2** | 1 `[open]` |
| content-pipeline (legacy) | **2** | **5** | 2 `[open, close]` |
| authz (legacy) | **2** | **5** | 2 `[open, close]` |

Neither 3 nor 7 appears anywhere. The correct DOM evidence is **`.card` 1 vs 2**. The finding stands
on the registry data; only this evidence line is bad. (Likely cause: a stale DOM read — see Missed #3.)

### (b) "21/27 pane-views show that topic's *drill* note" — the *drill* specificity is wrong.

The rail shows whatever was **last written**, which is nav-path dependent — not always drill.
Navigating straight to `caching/sys` from boot, the rail shows caching's **walk** note ("A read
through the cache"). After visiting `content-pipeline/sys`, it shows **content-pipeline's sys** note.
In my own sweep (walk→drill→…→sys) it showed "Probe Drill", matching theirs — but only because
`drill` happened to be the last covered pane visited. The leak is real and 100% reproducible; the
"always shows the drill note" characterization is not. My sweep: **35/45** sampled pane-views
mismatch (they reported 21/27 — different sample, same phenomenon).

### (c) Line-cite drift (minor)

- `parse_md.mjs:218` → the `paragraph_open` branch is at **:219**
- `parse_md.mjs:222` → the chip assignment is at **:225** (`:222` is the `pivSub` branch)
- `test/topic_contract.cjs:53` → **:52**
- ✅ `content-pipeline/identity.js:31`, `caching.md:266`, `kafka-internals.md:445`,
  `TOPIC_CONTRACT.md:26`, `app.js:8-15`, `parse_md.mjs:203`, `shell.js:237` — all **correct**.

---

## MISSED by the original lens

### M1. P1 — Bloated chips create giant "Jump to" buttons that MIS-NAVIGATE to unrelated topics

This is a **functional** bug, not cosmetic, and it's a direct second-order consequence of finding 2.

`resolveChipTarget` (**system-map.js:80-85**) falls back to matching **any registered topic title as
a substring of the chip text**. Now that the chip carries an entire 223–437-char answer paragraph,
incidental words in the prose match real topic titles — producing a `.piv-jump` button whose **label
is the whole answer paragraph** and whose target is an unrelated topic.

Deterministically measured (polling until the shadow DOM reflects the target topic — **0 stale
reads**), `scripts/verify-jumps-robust.mjs`:

```
markdown topics rendering a .piv-jump: 6 / 38
  saga                 -> observability        button label = 322 chars
  sharding-strategies  -> consistent-hashing   button label = 356 chars
  error-propagation    -> idempotency          button label = 371 chars
  debugging            -> idempotency          button label = 345 chars
  distributed-locks    -> idempotency          button label = 327 chars
  api-design           -> idempotency          button label = 375 chars

CONTROL — legacy label lengths: 15–42 chars (all sane)
```

On `saga/sys` the pivot "Choreography or orchestration?" renders a **four-line button** reading
*"Jump to → choreography = event-driven, decoupled, implicit flow; … and choreography's hardest cost
is observability. →"* which, when clicked, calls `TopicRegistry.setTopic('observability')` and yanks
the candidate out of Saga mid-rehearsal — because the word "observability" happened to appear in the
prose.

Screenshot: `shots/verify-inv-topics/CLEAN-sys-markdown-saga-spurious-jump.png`.

**Fixed for free by finding 1/2's markdown fix** (chip collapses to a ~40–70 char label, so the
substring match stops firing). Worth hardening anyway: require the `(N)` index form, or cap the
chip length, before doing a title-substring match.

### M2. P3 — The `chip` is the one sys field never escaped, and it now carries whole paragraphs

`parseSys` assigns `piv.chip = '→ ' + raw.slice(...)` (**parse_md.mjs:225**) — the **only**
field in the parser that does **not** go through `prose()`. `sysRenderPivot` then inserts it via
`innerHTML` (**system-map.js:93**). That was low-risk when a chip was a 9–19-char label; now that
full authored paragraphs land in it, **5 of 76 chips already carry raw `>` characters**
(`replication`: "R + W > N"; `storage-engines`, `stream-batch-processing`,
`probabilistic-structures`: "->"; `kafka-internals`).

**Honest scope: latent, not currently triggered.** No chip today contains a tag-opening `<`, so
nothing is broken right now. But a future author writing `latency < 100ms` in a pivot answer would
silently break the markup. The asymmetry with every other field is the real smell.

### M3. P3 (methodology) — The pane DOM lags `setTopic` by up to ~400ms; short-wait probes read the PREVIOUS topic

`TopicRegistry.setTopic()` routes the repaint through `ViewTransitions.run()`
(topic-protocol.js:114). The shadow DOM and the nav-tab `hidden` flags do **not** update
synchronously. Probe:

```
at kafka-internals (settled)    : viz.hidden = false
at stream-batch (IMMEDIATE 0ms) : viz.hidden = false   <-- STALE (still kafka's state)
at stream-batch (settled 400ms) : viz.hidden = true
```

This corrupted **two of my own intermediate measurements** (a 12ms sweep put the viz tab on
`stream-batch-processing`; a 220ms sweep invented a `caching → observability` jump button that was
actually saga's, betrayed by an exact 322-char label match). It is almost certainly the source of
the lens's bad `.op` counts too.

**Consequence for the operator:** registry/data-derived numbers in the inv-topics report are solid
(I reproduced them all). Any **DOM-derived** number obtained with a short wait should be treated as
soft. Correct method: poll until the shadow DOM reflects the target topic before reading.

*(As a product bug this is marginal — the end state is always correct within ~400ms — so I am not
elevating it. I did not confirm a user-visible break from clicking the tab in the stale window.)*

---

## Also verified clean (no finding)

- 46 topics registered; `TOPIC_ORDER.length === 46`; **zero console errors, zero page errors** on load.
- Groups sum correctly: 7 + 10 + 8 + 11 + 7 + 3 = **46** across 6 groups. Topic Index overlay renders
  "46 TOPICS ACROSS 6 GROUPS" (visible in `sys-caching.png`).
- All 10 required slices non-null on all 46; `num` has the full `{compute, inputs, lead, tell}` shape
  on all 46; the `wb` mermaid/diagram is present on all 46.
- **Zero** placeholder text (TODO/FIXME/TBD/lorem/PLACEHOLDER/XXX) across all 38 `.md` — the
  `docs/CONTENT_AUDIT_2026-07-08.md` claim holds.
- 971 drill cards total.

## Note for the orchestrator (independently reconfirmed)

The lens's warning is real: **6 tracked source files are modified** in the working tree
(`.github/workflows/deploy-pages.yml`, `deepdive_content_pipeline_rehearsal.html`, `package.json`,
`package-lock.json`, `test/build_integrity.py`, `tools/build-visual-kit.mjs`) — 95 insertions,
68 deletions — despite the read-only rule. `dist/index.html` is untracked (gitignored) and was
byte-stable throughout my run, so both our evidence bases are sound. Worth noting that
`test/topic_contract.cjs` defaults to auditing `deepdive_content_pipeline_rehearsal.html` — one of
the modified files.
