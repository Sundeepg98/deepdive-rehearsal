# FX-MOCK — Mock Run + Curveballs + Mixed Fire

Lens report, 2026-07-11. Every claim below is file:line or a live browser measurement.

## Verdict

The thesis holds, and it is stronger than the audit stated. Of the depth gap on this lens,
**190 authored items are DROPPED by the compiler** (76 model answers, 76 interviewer cut-ins,
38 curveball themes) — the content is sitting in the `.md` files right now. On top of that,
**three runtime defects** destroy content that survived the parse: the mock run's first beat is
overwritten with a Frankenstein, the canonical bank is permanently corrupted, and the score is
out of a hardcoded 6.

The compiler is not merely a ceiling. **It cannot parse its own documented format.**

---

## 1. THE SMOKING GUN — the parser fails the spec's own worked example

`tools/compiler/TOPIC_MARKDOWN_FORMAT.md:379-382` is the project's normative example of a mock beat:

```
    Task: size the storage and the read path.
    Model: ~100-byte rows, partial index on unread.
    Int: what dominates cost?
    Storage, not compute.
```

Four consecutive lines, no blank lines → **one markdown paragraph** → markdown-it emits ONE `inline`
token whose `.content` is all four lines joined by `\n`.

`tools/compiler/parse_md.mjs:428-435`:

```js
if (t.type === 'paragraph_open' && beat) {
  const raw = toks[i + 1].content;
  const taskM = /^task:\s*/i.exec(raw), modelM = /^model:\s*/i.exec(raw),
        intM  = /^int:\s*/i.exec(raw),  int2M  = /^int2:\s*/i.exec(raw);
  if (taskM) beat.task = prose(raw.slice(taskM[0].length));
  else if (modelM) beat.model = prose(raw.slice(modelM[0].length));
  else if (int2M)  beat.int2  = splitQA(raw.slice(int2M[0].length));
  else if (intM)   beat.int   = splitQA(raw.slice(intM[0].length));
```

Two defects in four lines:
1. **No `m` flag.** `^` anchors to start-of-STRING, not start-of-line. Only a label on line 1 can match.
2. **`else if` chain.** Even with `m`, only ONE field could ever be set per paragraph.

Result: `^task:` matches, and `beat.task` is assigned **the entire rest of the paragraph** — the Model
and the Int are swallowed into the task string. `beat.model` and `beat.int` are never assigned.

Run the spec's own example through the shipped parser and you get:

```js
{ tag:'SCALE', cue:'A million notifications a day',
  task:'size the storage and the read path.\nModel: ~100-byte rows...\nInt: what dominates cost?\nStorage, not compute.' }
// model: undefined   int: undefined
```

### The natural experiment is inside a single file

`src/topics-md/api-design.md` contains BOTH forms:

| md form | line | parser result |
|---|---|---|
| `Task:`/`Model:`/`Int:` on **consecutive lines** (the beats) | `api-design.md:441-444` | `model` **DROPPED**, `int` **DROPPED** |
| `Model:` after a **blank line** (the curveball) | `api-design.md:458` | `model` **extracted correctly** |

Same file, same parser, same run. The only variable is a blank line. That is proof the authors are not
at fault: they wrote the form the spec demonstrates, and the blank-line form only works by accident.

Confirmed in the emitted artifact `src/topics/_generated/api-design/bank.js:16` — the `task` field
literally contains `"...ad-hoc verb endpoints.\nModel: model resources acted on by...\nInt: what is the
single most consequential decision here?\n..."`, while `bank.js:9` (the curveball) has a proper `model` key.

## 2. Second parser bug — the curveball theme off-by-one

`parse_md.mjs:398` documents the heading as `### CURVEBALL | <theme> | <cue>`. All 38 files use exactly
that (38/38 three-part headings, 0 two-part). `parse_md.mjs:407`:

```js
if (m === 'curve') return { tag:'CURVEBALL', theme: p[0].trim(), cue: prose(p.slice(1).join(' | ')) };
```

`p[0]` is the literal token `"CURVEBALL"`, not the theme. So for `### CURVEBALL | breaking-change | A
product requirement forces...`:
- `theme` = `"CURVEBALL"`  (should be `"breaking-change"`)
- `cue`   = `"breaking-change | A product requirement forces..."` — **the theme name and the pipe leak
  into the question text the user reads.**

The non-curve branch one line below (`parse_md.mjs:409`) handles the 3-part form correctly
(`theme: p[1]`). The curve branch simply forgot to skip the tag token. Effect: **38/38 topics have
`theme === "CURVEBALL"`** and a polluted cue. Mock's end screen renders
`Curveball this run: CURVEBALL.` (measured live) and Mixed Fire labels the card `CURVEBALL`.

## 3. RUNTIME BUG — the canonical bank is permanently corrupted (the bank-corruption bug)

**Which file mutates the canonical data: `src/scripts/app/mock-run/logic.js:39-40`, in `openMock()`.**

```js
mockBeats[mockCurveIdx] = curveballPool[Math.floor(Math.random() * curveballPool.length)];  // :39
mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];      // :40
```

The three-part mechanism:

**(a) `src/scripts/app/topic-protocol.js:32-33`** — the copy is asymmetric:
```js
curveballPool = b.curveballs.slice();                                              // :32  SHALLOW: the OBJECTS are the bank's own
mockBeats = b.mockBeats.map(function (x) { var o={}; for (var k in x) o[k]=x[k]; return o; }); // :33  per-object copy
```
`mockBeats` gets private objects; `curveballPool` does **not** — `curveballPool[i] === b.curveballs[i]`.
Verified live: `poolIsCanonical: true`. The comment at `topic-protocol.js:25-27` claims "the canonical
topic data is never clobbered." It is wrong, because it only hardened one of the two pools.

**(b) `src/scripts/app/topic-protocol.js:34-38`** — the indices default to 0 when the tags are absent:
```js
mockCurveIdx = 0; mockFrameIdx = 0;
for (var i = 0; i < mockBeats.length; i++) {
  if (mockBeats[i].tag === 'CURVEBALL') mockCurveIdx = i;
  if (mockBeats[i].tag === 'FRAME')     mockFrameIdx = i;
}
```
No generated topic has a `FRAME` or `CURVEBALL` beat (0/76 — measured). So for **all 38**,
`mockCurveIdx === mockFrameIdx === 0`. For the hand-coded 8, FRAME is beat 0 and CURVEBALL is beat 4,
so the indices differ — **which is the only reason the 8 never trip this.**

**(c) The write-through.** With both indices 0, `logic.js:39` puts the *canonical* curveball object into
`mockBeats[0]`, and then `logic.js:40` writes `.cue` **through that same reference** into the bank.

Measured live on `api-design` (`_audit/2026-07-11-compiler-parity/_leak.mjs`):

```
1) CLEAN                       TOPIC_API_BANK.curveballs[0].cue = "breaking-change | A product requirement forces..."
2) AFTER ONE MOCK RUN          TOPIC_API_BANK.curveballs[0].cue = "Idempotency key + atomic dedupe = effectively-once writes..."
3) AFTER TOPIC SWITCH AWAY+BACK TOPIC_API_BANK.curveballs[0].cue = "Idempotency key + atomic dedupe = effectively-once writes..."
```

The curveball's question is overwritten with **a frame string**. `publishBanks` re-slices the array on a
topic switch but the *objects* are the same, so **switching topics does not heal it — only a page reload does.**

### The Mixed Fire leak

`mixed-fire.js:51,56` builds from `curveballPool` — the same corrupted objects. Measured: Mixed Fire's
"Curveball" card, after one mock run, prompts with `"Idempotency key + atomic dedupe = effectively-once
writes..."` — a *framing statement*, presented as a curveball. Open Mock Run once and Mixed Fire is
poisoned for the rest of the session.

### What Beat 1 actually looks like on all 38 topics

Live DOM read of `deep-mock-run` on `api-design`:

```json
{ "prog": "Beat 1 / 2",
  "tag":  "CURVEBALL",                                    // the authored SCALE beat is GONE (logic.js:39)
  "cue":  "An API is a contract clients couple to → ...", // a FRAME string      (logic.js:40)
  "task": "undefined",                                    // literal text in the UI (mixed-fire.js:165)
  "modelHTML": "...the breaking-change curveball model..." }
```

**Beat 1 is a Frankenstein** — a CURVEBALL tag, a FRAME cue, a curveball's model, and the literal string
`undefined` as its task. The authored SCALE beat (cue, task, and its swallowed Model/Int) **never renders
at all**. So the 38 do not have 2 usable beats. They have **one**.

## 4. RUNTIME BUG — the score is out of a hardcoded 6

`src/scripts/app/mixed-fire.js:207-208`:
```js
'<div class="mb-score-q">How many of the six did you deliver cleanly, out loud?</div>...'
for (let i = 0; i <= 6; i++) html += '<button type="button" data-s="' + i + '">' + i + '</button>';
```
`mixed-fire.js:222-224` — verdicts at `>= 6` (teal), `>= 4` (accent), else amber
*"The arc isn't solid yet."*

Measured live after a 2-beat run: the end screen asks **"How many of the six did you deliver cleanly, out
loud?"** and renders **7 buttons (0-6)**. An honest self-score after a 2-beat run cannot exceed 2, so
**every run on 38 of 46 topics lands in the bottom verdict bucket.** Confirmed.

## 5. RUNTIME BUG — `undefined` rendered into the UI

- `mixed-fire.js:18` — `prompt: cb.cue + '<div class="mx-task">' + cb.task + '</div>'`. No curveball in
  any of the 38 has a `task` (0/38 authored) → Mixed Fire renders the literal string **`undefined`**.
  Measured: `"taskHTML": "undefined"`, `"promptHasUndefined": true`.
- `mixed-fire.js:165-166` — `beat.task` / `beat.model` are equally unguarded.

## 6. The verification apparatus is not self-confirming — it is *absent*

The gate reports `compiler_md: data-equivalence 23 pass, 0 fail` while the compiler drops 190 items. Why:

- **`tools/compiler/prove_md.mjs:6-21`** loads `notifications/identity.js` and `notifications/walk.js`.
  It **never loads `bank.js`.** Its 23 assertions are 14 identity fields + walk steps 1-2. **Zero bank assertions.**
- **`tools/compiler/samples/notifications.md`** — the fixture the proof parses — **has no `## Bank`
  section at all** (headings: Thesis, Sub, Spine, Companion Notes, Walk). The parser's entire bank path
  (`parseBank`, `mkBeat`, `splitQA`) is exercised by a fixture that does not contain the section.
- **`tools/compiler/prove_assembly.mjs:23-35`** — same: identity + walk steps only.
- **`test/topic_contract.cjs:52`** — `if (!data[v])` for `v='bank'`. `{mockBeats:[2], curveballs:[1]}` is
  truthy → pass. The gate deep-checks `drill.cards` (>=18, tier minimums, per-card `signal`/`q`) and
  checks the bank **only for existence**.
- `grep -rln "mockBeats\|curveballs" test/ tools/compiler/prove_*.mjs` → **NONE.**

Not one check in the 19/19 gate makes any assertion about a mock beat or a curveball.

---

## THE FIX

### F1 — `tools/compiler/parse_md.mjs:428-436` — line-aware field splitter (recovers 152 items)

Replace the paragraph handler with one that splits on field labels *within* the paragraph and keeps each
field's continuation lines (`Int:`/`Int2:` need the answer on the next line, which `splitQA` already expects):

```js
if (t.type === 'paragraph_open' && beat) {
  const raw = toks[i + 1].content;
  const LABEL = /^(task|model|int2|int)\s*:\s*/i;
  let key = null, buf = [];
  const flush = () => {
    if (!key) return;
    const body = buf.join('\n');
    if (key === 'task') beat.task = prose(body);
    else if (key === 'model') beat.model = prose(body);
    else if (key === 'int2') beat.int2 = splitQA(body);
    else if (key === 'int') beat.int = splitQA(body);
    buf = [];
  };
  for (const ln of raw.split('\n')) {
    const m = LABEL.exec(ln);
    if (m) { flush(); key = m[1].toLowerCase(); buf.push(ln.slice(m[0].length)); }
    else if (key) buf.push(ln);
  }
  flush();
  i += 2; continue;
}
```
Backward-compatible: blank-line-separated fields arrive as separate paragraphs and still work.

### F2 — `tools/compiler/parse_md.mjs:407` — drop the literal tag token (recovers 38 themes + 38 cues)

```js
if (m === 'curve') {
  const q = p[0].trim().toUpperCase() === 'CURVEBALL' ? p.slice(1) : p;
  return { tag: 'CURVEBALL', theme: q[0].trim(), cue: prose(q.slice(1).join(' | ')) };
}
```

**F1+F2 measured over all 38 `.md` files** (`_audit/2026-07-11-compiler-parity/_prove_fix.mjs`):

| metric | current | fixed | recovered |
|---|---|---|---|
| beats with `model` | 0 | **76** | +76 |
| beats with `int` (q+a) | 0 | **76** | +76 |
| curveballs with a real theme + clean cue | 0 | **38** | +38 |
| distinct curveball themes | 1 (`"CURVEBALL"`) | **35** | — |

**190 items recovered. Zero markdown edits.**

### F3 — `src/scripts/app/topic-protocol.js:32` — stop sharing the canonical curveball objects

```js
curveballPool = b.curveballs.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; return o; });
```
Alone this kills the canonical-bank corruption **and** the Mixed Fire leak.

### F4 — `src/scripts/app/topic-protocol.js:34-38` + `mock-run/logic.js:39-40` — absent tags must mean absent

`topic-protocol.js:34` → `mockCurveIdx = -1; mockFrameIdx = -1;` and `topic-protocol.js:39`'s `framePool`
fallback guarded. Then `mock-run/logic.js:39-40`:

```js
if (mockCurveIdx >= 0 && curveballPool.length) {
  var _cb = curveballPool[Math.floor(Math.random() * curveballPool.length)];
  mockBeats[mockCurveIdx] = { ..._cb };          // copy, never the pool's object
}
if (mockFrameIdx >= 0 && framePool.length)
  mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];
```
Also guard `mixed-fire.js:205` (`mockBeats[mockCurveIdx].theme` → throws / prints garbage when there is no
curveball beat).

### F5 — `src/scripts/app/mixed-fire.js:207-208,222-224` — score out of N, not 6

```js
const n = mockBeats.length;
'...How many of the ' + n + ' did you deliver cleanly, out loud?...'
for (let i = 0; i <= n; i++) ...
if (score >= n) { /* teal */ } else if (score >= Math.ceil(n * 2 / 3)) { /* accent */ } else { /* amber */ }
```
`Math.ceil(6 * 2/3) === 4` — exactly preserves the hand-coded 8's current behaviour.

### F6 — `src/scripts/app/mixed-fire.js:18,165-166` — guard the optional fields

```js
prompt: cb.cue + (cb.task ? '<div class="mx-task">' + cb.task + '</div>' : '')
```
and the same for `beat.task` / `beat.model` in `renderMockBeat`.

### F7 — the gate must actually assert the bank

Add to `tools/compiler/prove_md.mjs` an equivalence block against `src/topics/notifications/bank.js`
(`mockBeats.length`, `curveballs.length`, `frames.length`, and per-beat `model`/`int`/`int2` population),
and add a `## Bank` section to `tools/compiler/samples/notifications.md` — **it has none today.**
Add to `test/topic_contract.cjs` a populated-not-truthy assertion: every topic needs
`bank.mockBeats.length >= 6`, a `FRAME` and a `CURVEBALL` beat, `bank.curveballs.length >= 4`, and every
beat to carry `model` + `int`. That check is what would have caught all of this.

---

## What is genuinely an AUTHORING gap (the syntax exists and works)

After F1-F2 the format expresses everything the hand-coded 8 hold. These remain unwritten:

| item | the 8 | the 38 | note |
|---|---|---|---|
| beats per topic | 6 | 2 | `.md` supports N beats. Need +4 × 38 = **152 beats**. |
| `FRAME` + `CLOSE` + `STRUCTURE`/`FAILURE` tags | all present | **none** | Absent FRAME/CURVEBALL tags are also what *triggers* the corruption (§3b). |
| curveballs per topic | 8 | 1 | `### Extra Curveballs` supports N. Need +7 × 38 = **266**. |
| `Int2:` (second push) | 24 (3/topic) | **0** | Syntax exists; parser handles it after F1. |
| curveball `Task:` | 64 (all) | **0** | Syntax exists. Currently renders `undefined` (§5). |
| frames per topic | 4 | 3 | The 4th is the FRAME beat's cue, auto-prepended at `parse_md.mjs:439-440`. Authoring a FRAME beat fixes this for free. |

## Bottom line for this lens

| | dropped by the compiler | never authored |
|---|---|---|
| model answers | **76** | 0 |
| interviewer cut-ins (`int`) | **76** | 0 |
| curveball themes + clean cues | **38** | 0 |
| second pushes (`int2`) | 0 | 114 |
| extra beats | 0 | 152 |
| extra curveballs | 0 | 266 |
| curveball tasks | 0 | 38 |

**190 items are already written and thrown away on every build.** Two functions in `parse_md.mjs` get them
back. Four runtime guards stop the app from destroying what survives. The authoring backlog is real, but it
is the *second* problem — and it cannot even be measured until the compiler stops lying about what it was given.

### Evidence scripts (this dir)
- `_count.mjs` — bank shape across all 46 compiled topics
- `_md.mjs` — what is authored in the 38 `.md` Bank sections
- `_live.mjs` — live browser: beats, Frankenstein beat 1, `/6` scoring, corruption
- `_leak.mjs` — live browser: clean → corrupted → topic-switch-does-not-heal
- `_prove_fix.mjs` — F1+F2 recovery measured over all 38
- `_selfconfirm.mjs` — the bank equivalence assertion the gate never makes
- `parse_md.FIXED.mjs` — the patched parser (F1+F2 applied)
