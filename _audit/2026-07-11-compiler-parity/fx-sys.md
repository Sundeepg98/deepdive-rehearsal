# fx-sys — SYSTEM MAP lens: the compiler as ceiling

**Verdict: the sys gap is ~100% ENGINEERING, not authoring.** Every stage and every pivot answer
the 38 need is *already written* in `src/topics-md/*.md`. The parser throws them away on every
build. Two lines of `parseSys` account for the entire `6.0 → 0.0` stage collapse, all 76 empty
pivot answers, the 2098px chips, and 3 jump buttons that navigate out of the topic.

The decisive fact: **the parser cannot parse its own spec's example.**

---

## 0. The reference shape (THE SPEC = the hand-coded 8)

`src/topics/content-pipeline/sys.js:9-40`

```js
var TOPIC_CP_SYS = {
  intro: "...",
  stages: [                                                   // 6, exactly one cur:true
    { n: 'Operator upload',   d: 'content / config pushed to S3' },
    { n: 'Content pipeline',  d: '...', cur: true },           // "you are here"
    ... 4 more
  ],
  pivots: [                                                   // 7, each a CROSS-TOPIC pointer
    { q: "The content is processed — now it must be tamper-proof",
      chip: "→ Signing (2)",                              // 19-39 chars, carries an (N) index
      a:    "The pipeline's output feeds the <b>signing</b> stage: ..." },   // populated
    ... 6 more
  ],
  heads: { whereHead, pivHead, pivSub }
};
```

Measured across all 8: **48 stages (6.0/topic), 56 pivots (7.0/topic), 8 `cur` flags, 0 empty answers,
chips 19-39 chars.**

---

## 1. Field-by-field

| field | the 8 | the 38 (shipped) | attribution |
|---|---|---|---|
| `sys.stages` | 6.0/topic (48) | **0** (`stages: []`, 38/38) | **PARSER_BUG** — 189 authored, 189 dropped |
| `sys.stages[].cur` | 1/topic | **0** | **PARSER_BUG** — 38 `[*]` authored, 38 dropped |
| `sys.pivots[].a` | populated (7/topic) | **`""` — 76/76 empty** | **PARSER_BUG** — 76 authored, 76 swallowed |
| `sys.pivots[].chip` | 19-39 ch | **249-437 ch** (holds the answer) | **PARSER_BUG** — fusion + skips `prose()` |
| `sys.pivots` (count) | 7.0/topic | 2.0/topic | **AUTHORING_GAP** — only 2 `####` written |
| cross-topic `(N)` jump | every chip | **0/76 chips carry an `(N)`** | **AUTHORING_GAP** (+ parser-amplified misfire) |
| `sys.intro` | ✔ | ✔ | OK |
| `sys.heads` (×3) | ✔ | ✔ **full parity** | OK |

---

## 2. PARSER_BUG #1 — 189 stages silently discarded

**The content IS there.** `src/topics-md/idempotency.md`:

```
### Where it sits

Client: generates the idempotency key, reuses it on every retry [*]
Network / queue: at-least-once -- duplicates and ambiguous failures happen here
Dedup store: records key -> status + response, atomic claim, TTL'd
The effect: charge / create / provision -- committed with the key in one tx
Downstream: each side effect independently idempotent on the same key
```

Five plain lines with no blank line between them. markdown-it emits **one `paragraph_open` +
one `inline` (content = the 5 lines joined by `\n`)** — verified token dump — and **no
`bullet_list_open` anywhere.**

**Drop site A — the gate that can never fire.** `tools/compiler/parse_md.mjs:203`

```js
if (t.type === 'bullet_list_open' && mode === 'stages') {   // authored form is a PARAGRAPH → never true
```

**Drop site B — the paragraph handler with no `stages` branch.** `parse_md.mjs:219-228`

```js
if (t.type === 'paragraph_open') {
  const raw = toks[i + 1].content;                          // <-- all 5 stages are in here
  if (mode === null) intro = prose(raw);                    // mode === 'stages' → false
  else if (mode === 'pivots' && !piv && !sawPivSub) {...}   // mode !== 'pivots' → false
  else if (piv) {...}                                       // piv === null      → false
  i += 2; continue;                                         // <-- FALLS THROUGH. DISCARDED.
}
```

There is no `else`. The paragraph holding every stage is read into `raw`, tested against three
conditions that are all false, and thrown away. Result: `stages: []` in all 38 generated modules
(`src/topics/_generated/idempotency/sys.js:3`).

**Recovers: 189 stages + 38 `cur` flags.**

---

## 3. PARSER_BUG #2 — 76 pivot answers swallowed into the chip

`src/topics-md/idempotency.md`:

```
#### Can you guarantee exactly-once?

-> exactly-once effect, not delivery: at-least-once + idempotent processing
Exactly-once delivery is impossible over an unreliable network; you accept duplicates and dedup them...
```

Chip line and answer line are adjacent → **one paragraph**, inline content `"-> chip…\nanswer…"`.

**Drop site.** `parse_md.mjs:225`

```js
if (m && !piv.chip) piv.chip = '→ ' + raw.slice(m[0].length);
//                                         ^^^^^^^^^^^^^^^^^^^^^^ slices to END OF PARAGRAPH:
//                                         the \n AND the whole answer land inside the chip.
//                                         piv.a is never assigned → ""
```

Shipped result, `src/topics/_generated/idempotency/sys.js:5-9`:

```json
{ "q": "Can you guarantee exactly-once?",
  "chip": "→ exactly-once effect, not delivery: at-least-once + idempotent processing\nExactly-once delivery is impossible over an unreliable network; …",
  "a": "" }
```

Two further defects on the same line: the chip **bypasses `prose()`** (every sibling field uses it),
so chip text ships un-escaped.

**This is an omission, not a design choice — the parser already knows the idiom, twice:**
- `parse_md.mjs:353` (`parseDrill`, `Follow:`) — `const nl = rest.indexOf('\n'); q = slice(0,nl); a = slice(nl+1)`
- `parse_md.mjs:411` (`parseBank`, `splitQA`) — identical

`parseSys:225` is the one place that takes a prefixed line and *doesn't* split on the newline.

**Recovers: 76 pivot answers.**

---

## 4. The smoking gun — the parser cannot parse its own spec

`tools/compiler/TOPIC_MARKDOWN_FORMAT.md:236-262` is **self-contradicting**.

Prose (line 238-239): *"the 'where it sits' stages: **bullets** `<n>: <d>`"*
Example (lines 249-262) — the thing authors copy:

```
    ### Where it sits

    Producers: emit events                       <-- PLAIN LINES. NOT BULLETS.
    Notification service: channels + delivery [*]
    Channels: in-app, email

    #### How do you guarantee delivery?

    -> at-least-once + idempotent                <-- chip and answer GLUED,
    At-least-once from the queue; dedup makes it effectively once.      no blank line
```

Fed verbatim to `parseMarkdown()`:

```
stages authored in the example : 3
stages the parser produced     : 0   *** ALL DROPPED ***
pivot answers authored         : 1
pivot answers parser produced  : 0   *** SWALLOWED INTO CHIP ***
```

All 38 authors followed the documented example exactly: **38/38 plain-line stages, 76/76 glued
answers, 0 bullets anywhere.** They did not deviate from the spec — the spec's own example is
unparseable by the spec's own parser. Attribution is not ambiguous.

> **Systemic, not local:** the identical contradiction exists at `TOPIC_MARKDOWN_FORMAT.md:186-190`
> (`## Drill` tier-notes shown as plain lines; `parseDrill:342` demands `bullet_list_open`). That is
> the 114 dropped tier-notes. Same bug class, same root cause → hand to the drill lens.

---

## 5. Why the gate is green while 380 items die

The audit's "self-confirming fixtures" hypothesis is **close but not quite right — the truth is worse.**

- **`prove_md.mjs` ("compiler_md: 23 pass") contains ZERO assertions on `views.sys`.** Its `eq()`
  calls cover `identity.*` (11), `spine`, 2 × `cmpNotes`, and `walk.step1/2` fields. Nothing else.
- **Its only fixture, `tools/compiler/samples/notifications.md`, has NO `## System` section at all.**
  Sections present: `Thesis, Sub, Spine, Companion Notes, Walk`. The sys path is never exercised.
- **`prove_assembly.mjs` ("28 pass") has zero occurrences of `sys` / `stages` / `pivot`.**

So the fixtures weren't written to match buggy behaviour — **the pane was omitted from the fixture
entirely, making the drop structurally unobservable.** 51 green assertions, zero coverage.

And the contract test can't catch it either — `test/topic_contract.cjs:51`:

```js
cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(id + ': missing "' + v + '" slice'); });
```

`data.sys = {intro, stages: [], pivots:[…], heads}` is a **truthy object** → passes. It checks
*presence*, never *population*. Note the asymmetry that proves the thesis: the same file **does**
depth-check `drill.cards` (`MIN_CARDS`, per-tier minimums, lines 53-58) — and drill has content.
**The gate only counts what it counts.**

---

## 6. Downstream damage — all three chased

Live DOM, `dist/index.html`, sys pane visible, per-topic repaint verified.

|  | HAND 8 | MD 38 |
|---|---|---|
| stages rendered (`.stg`) | **6.0**/topic | **0.0**/topic |
| max chip width | **119-220px** | **1206-2098px** |
| chips overflowing their `.piv` card | **0** | **2 of 2, every topic = 76/76** |
| longest jump-button label | 25-42 ch | **322-375 ch** |

**(a) 2098px chips clipped mid-word — YES, same drop.** `.chip{white-space:nowrap}`
(`system-map.js:47`) inside `.piv{overflow:hidden}` (`system-map.js:38`). A 437-char chip cannot
wrap, so it runs to 2098px and the card clips it mid-word. Caused entirely by the answer being
fused into the chip at `parse_md.mjs:225`. After the fix: max chip 138 ch.

**(b) Jump buttons that navigate out of the topic — YES, 3 of them, same drop.**
`resolveChipTarget` (`system-map.js:70-87`) scans the chip for a topic title
(`lc.indexOf(title) > -1`, line 84). Because the chip now contains 250+ chars of *answer prose*, it
matches topic names mentioned only in passing:

```
debugging          --JUMPS TO--> idempotency     (chip line alone resolves to: null)
error-propagation  --JUMPS TO--> idempotency     (chip line alone resolves to: null)
saga               --JUMPS TO--> observability   (chip line alone resolves to: null)
```

All three resolve to `null` from the chip line alone — **they exist only because of the fusion.**
The fix deletes them (verified: 6 jumps → 3, the 3 phantoms gone). The button *label* is
`p.chip.replace(...)` (`system-map.js:95`) → "Jump to \<entire 375-char answer paragraph\> →".

**(c) Literal `undefined` at 3 sites — NOT a sys symptom. The audit mis-attributed this.**
`sys.heads` is fully populated in all 46 topics (whereHead/pivHead/pivSub) — sys renders no
`undefined`. The real site is **`src/scripts/app/drill/logic.js:180`**:

```js
if (this._tiernote) this._tiernote.innerHTML = d.tierNotes.all;   // tierNotes = {} for all 38
```

→ renders the literal string `"undefined"`, **visible**, on all 38 md topics. That is the dropped
tier-notes (§4), and it belongs to the **drill** lens, not sys.

---

## 7. The fix

`tools/compiler/parse_md.mjs`, function `parseSys` (lines 188-232). Two edits, ~8 lines.
(Checked: the sibling `parse_md.FIXED.mjs` in this dir leaves `parseSys` untouched — no conflict.)

```js
function parseSys(toks) {
  let intro = '';
  const stages = [], pivots = [], heads = {};
  let mode = null, piv = null, sawPivSub = false;

  // NEW: one stage-line parser, shared by the bullet form AND the plain-line form
  const pushStage = (line) => {
    let raw = String(line).trim();
    if (!raw) return;
    const cur = /\[\*\]\s*$/.test(raw);
    raw = raw.replace(/\s*\[\*\]\s*$/, '');
    const k = raw.indexOf(': ');
    const stage = { n: prose(k === -1 ? raw : raw.slice(0, k)),
                    d: prose(k === -1 ? '' : raw.slice(k + 2)) };
    if (cur) stage.cur = true;
    stages.push(stage);
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    ... h3 / h4 handlers unchanged ...

    if (t.type === 'bullet_list_open' && mode === 'stages') {   // :203 back-compat, now delegates
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') pushStage(toks[j].content);
        j++;
      }
      i = j; continue;
    }

    if (t.type === 'paragraph_open') {
      const raw = toks[i + 1].content;
      if (mode === null) intro = prose(raw);
      else if (mode === 'stages') raw.split('\n').forEach(pushStage);   // <<< FIX 1 (:219-228 gap)
      else if (mode === 'pivots' && !piv && !sawPivSub) { heads.pivSub = prose(raw); sawPivSub = true; }
      else if (piv) {
        const m = /^(->|→)\s*/.exec(raw);
        if (m && !piv.chip) {                                            // <<< FIX 2 (:225)
          const rest = raw.slice(m[0].length);
          const nl = rest.indexOf('\n');                                 // same idiom as :353 / :411
          piv.chip = '→ ' + prose(nl === -1 ? rest : rest.slice(0, nl));
          if (nl !== -1) piv.a = prose(rest.slice(nl + 1));
        } else if (!piv.a) piv.a = prose(raw);
      }
      i += 2; continue;
    }
  }
  return { intro, stages, pivots, heads };
}
```

**Measured recovery (prototype run over all 38):**

```
                    BEFORE     AFTER      TARGET (the 8)
stages total          0    ->   189       48 (6.0/topic)
stages per topic     0.0   ->   5.0       6.0
"you are here" (cur)  0    ->   38        1 per topic ✔
pivot answers         0    ->   76 / 76   ✔ 100%
max chip length     437ch  ->   138ch     19-39 ch
phantom jumps         3    ->   0         ✔ eliminated
```

Plus `prose()` now applied to chips (`TTL&rsquo;d`, `key &rarr; status` correctly escaped).

**Also fix the spec** (`TOPIC_MARKDOWN_FORMAT.md:238-239`): the prose says "bullets" while the
example shows plain lines. With the parser fix *both* forms work — so change the prose to say so.

---

## 8. What the fix does NOT close (honest residual — genuine authoring gaps)

1. **Stage density 5.0 vs 6.0.** The fix recovers **100% of what was authored** (189/189). The 38's
   authors wrote 5 stages (rate-limiting: 4); the 8 have 6. The remaining 1.0/topic is content to
   write, not code to fix.
2. **Pivot count 2.0 vs 7.0.** Only two `####` blocks per md topic. The syntax works; nobody wrote
   more. **This is the single largest remaining sys gap** — 76 pivots vs the 8's rate of 266.
3. **Cross-topic jumps: 0/76 chips carry an `(N)` index.** The 8 use the chip as a *cross-topic
   pointer* (`→ Signing (2)`); the 38 use it as a *one-line answer summary*
   (`→ exactly-once effect, not delivery: …`). Different semantics. So even after the parser fix,
   **no md pivot resolves a jump via the intended `(N)` path** — the 3 surviving jumps come from
   incidental title collisions in the fallback. Closing this = re-authoring 76 chips as
   `→ <Topic> (N)` and moving the summary into `a`. Format supports it today; nobody used it.

---

## Evidence scripts (this dir)

`_trace.mjs` (token dump + real parse) · `_spec_selftest.mjs` (spec example → parser) ·
`_fix_proto.mjs` (fix + recovery) · `_jump_after.cjs` (phantom-jump before/after) ·
`_jump_truth2.cjs` (live DOM) · `_undef2.cjs` (undefined → drill, not sys)
