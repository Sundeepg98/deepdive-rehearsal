# COMPILER PARITY — THE EXECUTABLE FIX PLAN
**Date:** 2026-07-11 · **Tree:** `D:/claude-workspace/deepdive-rehearsal` (master, build works, gate 19/19 green)

## VERDICT

The thesis holds, **with one correction and two amplifications**, all measured in this session:

- **HOLDS:** the compiler drops **607 authored items** and **corrupts 76 more** on every build. A **6-change, one-file parser fix** recovers all 607 and repairs all 76 — **zero markdown edits, zero regressions** (verified: `prove_md` 23/23 still pass; zod 38/38 still pass).
- **CORRECTION:** the depth gap is **not** all engineering. `model.answers` (2 vs 9), `drill.follows` (0 vs 335), `cmpNotes` (2/9), `wb.steps` (2 vs 9), `rf.flags` (3 vs 9), `trade.decisions` (3 vs 7) are **content nobody wrote**. The format expresses them today. A parser fix recovers **zero** of them.
- **AMPLIFICATION 1 — the parser fix does NOT heal the runtime.** Two user-visible P0 bugs survive it (proven below): the literal string `undefined` on 38 topics, and permanent in-session corruption of the canonical bank. They need independent renderer fixes.
- **AMPLIFICATION 2 — the apparatus is worse than self-confirming.** 28 of the 51 green compiler assertions (`prove_assembly` + `prove_emit`) test `parse.mjs`, the `.topic` parser. **`find src -name '*.topic' | wc -l` = 0.** They verify a code path **no shipping topic uses**.

---

## GROUND TRUTH (measured this session — `_audit/2026-07-11-compiler-parity/_plan_measure.mjs`)

Current parser vs the 6-fix parser, over the **same 38 `.md` files, zero content edits**:

| field | current | fixed | delta |
|---|---:|---:|---:|
| `sys.stages` | 0 | 189 | **+189** |
| `sys.stages[].cur` (`[*]`) | 0 | 38 | **+38** |
| `sys.pivots[].a` | 0 | 76 | **+76** |
| `sys.pivots[].chip` (multiline = corrupt) | 76 | 0 | **76 repaired** |
| `drill.tierNotes` (keys) | 0 | 114 | **+114** |
| `bank.mockBeats[].model` | 0 | 76 | **+76** |
| `bank.mockBeats[].int{q,a}` | 0 | 76 | **+76** |
| `bank.curveballs[].theme` (real, not `"CURVEBALL"`) | 0 | 38 | **+38** |
| **TOTAL** | | | **607 recovered + 76 repaired** |

**Controls — all byte-identical, zero regressions:** `drill.cards` 798, `walk.steps` 153, `model.answers` 76, `model.beats` 228, `rf.flags` 114, `trade.decisions` 114, `wb.steps` 76, `open.cards` 38, `num.inputs` 114, `cmpNotes` 76, `bank.mockBeats` 76, `bank.curveballs` 38, `bank.frames` 114, `bank.mockBeats[].task` 76.

**Reconciling the lens numbers:** 380 (original audit) = 189+114+76, bank ignored. 531 (format lens) counted `int.q`/`int.a` separately and omitted `cur`/`theme`. **607 + 76 is the de-duplicated truth.**

**Zero authored today (so no drop is possible):** `Follow:` 0, `Senior:` 0, `Speak:` 0, `Int2:` 0, `all |` 0, Whiteboard `Foot:` 0. (The 38 `^Foot:` hits are all in `## Opener` — `open.foot` — verified; `wb.foot` is populated in **0/38** generated modules.)

---

## PHASE 0 — BASELINE (5 min, do not skip)

```bash
cd D:/claude-workspace/deepdive-rehearsal
python3 test/check_all.py          # expect: GATE: PASS (19/19) -- green while 607 items are on the floor
git switch -c compiler-parity
```
Record the green gate. It is the control for every claim below.

---

## PHASE 1 — (c) TEST HARDENING: make it RED first

> The whole incident exists because the gate only counts `drill.cards` — and `drill.cards` is the **only** collection at parity (798, 97% of the 8). One field is measured; one field is at parity; **they are the same field.** Goodhart's law with a file and a line number. Fix the instrument before the code.

### 1.1 — NEW `tools/compiler/prove_conservation.mjs` (the anti-self-confirming test)

**Source:** `_audit/2026-07-11-compiler-parity/prove_conservation.mjs` (written, run, validated RED→GREEN).

```bash
cp _audit/2026-07-11-compiler-parity/prove_conservation.mjs tools/compiler/prove_conservation.mjs
```
**Then edit `tools/compiler/prove_conservation.mjs:30`:**
```diff
-  : '../../tools/compiler/parse_md.mjs';
+  : './parse_md.mjs';
```

**Why it can never become self-confirming (by construction):** its reference is the **author's raw bytes** (not a fixture, not parser output), and its counter is a **line scanner** — a different mechanism from the parser's markdown-it token walk, so a bug in one cannot mask the same bug in the other. It runs over **all 38 real topics**.

**MANDATORY EXTENSION — it currently has a 190-item blind spot.** As shipped it covers only `sysStages, tierNotes, pivotAnswers, drillCards, follows, seniors, speaks`. Add to `scanSource()` (:39-77), `scanParsed()` (:82-97) and `FIELDS` (:99):

| add | scanSource rule (line-scan) | scanParsed rule | today |
|---|---|---|---|
| `bankModels` | `h2==='bank'` and `/^Model:/i` | `mockBeats.filter(b=>b.model).length` | 76 → **0** |
| `bankInts` | `h2==='bank'` and `/^Int:/i` | `mockBeats.filter(b=>b.int&&b.int.q).length` | 76 → **0** |
| `bankInt2s` | `h2==='bank'` and `/^Int2:/i` | `mockBeats.filter(b=>b.int2&&b.int2.q).length` | 0 → 0 (latent) |
| `bankTasks` | `h2==='bank'` and `/^Task:/i` | `mockBeats.filter(b=>b.task).length` | conserved (sentinel) |
| `stageCur` | `h2==='system' && h3n===1` and `/\[\*\]\s*$/` | `stages.filter(s=>s.cur).length` | 38 → **0** |
| `curveTheme` **(corruption probe)** | — | `curveballs.filter(c=>String(c.theme).toUpperCase()==='CURVEBALL').length` must be **0** | **38 corrupt** |
| regression sentinels | `wbSteps, rfFlags, tradeDecisions, modelAnswers, openCards, numInputs, cmpNotes` | matching `.length` | all conserved — freeze them |

> `curveTheme` and the existing `chipSwallowedAnswer` (:95) are **corruption probes, not counts**. Counting alone misses them: the chip *is* populated and the theme *is* populated — both are just **wrong**. Any purely-count-based gate is blind to this class.

**Wire into the gate — `test/check_all.py`, insert after line 59** (after `('compiler_code', ...)`, inside the same list):
```python
                  ('compiler_conservation', ['node', 'tools/compiler/prove_conservation.mjs']),
```

**Expected on run:** `EXIT 1 — 607 authored items DROPPED, 76 pivot chips CORRUPTED, 38 curveball themes CORRUPTED`, each with `file:line` and the dropped text. **This is the test the parser fix must turn green.** It does (verified: `PARSER_MODULE=… → EXIT 0, "PASS -- every authored item survives compilation"`).

### 1.2 — REPLACE `test/topic_contract.cjs` (population, not truthiness)

**Source:** `_audit/2026-07-11-compiler-parity/topic_contract.HARDENED.cjs` (written, run: **EXIT 1, 684 shortfalls + 152 corruption/population violations**).

**The bug it replaces — `test/topic_contract.cjs:52`:**
```js
cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(id + ': missing "' + v + '" slice'); });
```
`!data[v]` is **truthiness**. `{stages: []}` is truthy. `{}` is truthy. Nine of ten slices are checked for *existence*; only `drill.cards` (`:55`, `MIN_CARDS: 18`) is checked for *population*.

```bash
cp _audit/2026-07-11-compiler-parity/topic_contract.HARDENED.cjs test/topic_contract.cjs
```
What it does — keep all five properties, they are the design:
1. **19 population probes** over every render-critical collection.
2. **Floors DERIVED FROM THE 8 AT RUNTIME** — `floor[f] = ceil(min(...REFERENCE_8.map(counts)) * PARITY)`. The 8 *are* the spec, literally; no magic-number table to rot.
3. **Reference-rot guard** — if a reference topic ever reads 0, **FAIL** ("the spec itself is degraded") rather than silently lowering the bar for all 46.
4. **Corruption probes** — a chip that swallowed its answer; a `"CURVEBALL"` theme.
5. **`parity_debt.json` ratchet** — a new shortfall FAILS; a fixed one must be deleted ("stale"); a worse one FAILS ("backslide"). **The number can only go down.**

**Seed the debt file once, after Phase 2 lands** (not before — you want the parser's 607 items *outside* the allowlist so the ratchet starts from the true residual, not from the compiler's bug).

> The instrument reproduces the Goodhart finding unaided: **`drill.cards` does not appear in the shortfall table.** 18 fields × 38 topics = 684. Not one of them is the field the old gate counted.

### 1.3 — `tools/compiler/samples/notifications.md` — the fixture omits every broken pane

`grep -n '^## ' tools/compiler/samples/notifications.md` → **Thesis, Sub, Spine, Companion Notes, Walk.** That is all five. A real topic (`src/topics-md/idempotency.md`) has **fourteen**. The fixture contains **no `## System`, no `## Drill`, no `## Model Answers`, no `## Bank`** — so `parseSys`, `parseDrill`, `parseModel`, `parseBank`, the four functions holding **every dropped item**, are **dead code under test**. "23 pass, 0 fail" is vacuous.

The tell: the fixture's `## Companion Notes` has exactly two `###` blocks (walk, drill) and `prove_md.mjs:17-18` asserts **exactly those two** — while `src/topics/notifications/identity.js` has **all nine sitting right there**, available to assert.

**Do:** promote the fixture to a **full 14-section topic** by round-tripping the real hand-coded `notifications` topic into markdown (`_audit/.../content-pipeline.ROUNDTRIP.md` is the worked precedent — a full hand-topic re-authored in md, 0/35 fields lost).

### 1.4 — `tools/compiler/prove_md.mjs` — assert all 10 views, not 2

`prove_md.mjs:6-7` evals **`identity.js` + `walk.js` only** — 2 of 12 modules. Replace with a loop over all 11 data modules of `src/topics/notifications/` and deep-equal per view:
```js
for (const [mod, key] of [['sys','SYS'],['drill','DRILL'],['bank','BANK'],['model','MODEL'],
                          ['wb','WB'],['trade','TRADE'],['num','NUM'],['rf','RF'],['open','OPEN']])
  eq('views.' + mod, out.views[mod], g[key]);
```
**Any one of these assertions would have caught all 607 drops on the first build.**

### 1.5 — RELABEL `tools/compiler/prove_emit.mjs` (do not delete)

`prove_emit.mjs:17-18` — `JSON.stringify(g.WALK) === JSON.stringify(topic.views.walk)` where `topic = parseTopic(...)`. **The reference IS the parser's own output.** A dropped item is absent from both sides and the assertion agrees. It is **structurally incapable of failing from a drop**. It is a valid *emitter* test and a zero *parser* test — but `check_all.py:55` labels it `compiler_emit` next to lines that say "data-equivalence", which is what made a round-trip read as verification.

Change its final line so it can never again be misread:
```js
console.log('\nEmitter round-trip (NOT a parser check -- the reference is the parser''s own output): ' + pass + ' pass, ' + fail + ' fail');
```

### 1.6 — FLAG `prove_assembly.mjs` (28 of the 51 green assertions are dead)

`prove_assembly.mjs:12` parses `samples/notifications.topic` via `parse.mjs`. **`find src -name '*.topic'` → 0 files.** All 38 shipping topics are `.md` → `parseMarkdown` (`compile.mjs:63-65`). These 28 assertions verify a parser with **no production consumers**. Either retire it or annotate it `(legacy .topic path -- no shipping topic uses this)`. Do **not** let it keep padding the green count.

### 1.7 — NEW `tools/compiler/prove_doc_examples.mjs` (the doc becomes executable)

Machine-extract every indented example block from `TOPIC_MARKDOWN_FORMAT.md`, parse it, assert it yields a **populated** structure (`stages > 0`, `tierNotes > 0`, every pivot has a non-empty `.a`, every bank beat has `model` + `int`). Wire into `check_all.py`.

**Today it fails.** Fed its own canonical example (`TOPIC_MARKDOWN_FORMAT.md:245-262`), the parser returns `stages: []`, `tierNotes: {}`, `pivots[0].a: ""`. **The parser cannot parse its own spec.** This test permanently kills the "docs demonstrate X, parser implements Y" divergence that caused the entire incident.

---

## PHASE 2 — (a) PARSER FIXES: turn it GREEN. 607 items, one file, zero authoring.

**The single root cause, five sites:** markdown-it merges soft-wrapped consecutive lines into **ONE paragraph token** carrying embedded `\n`. Every pane parser treats a paragraph as a single record — it regex-matches a `Label:` prefix, then `raw.slice(...)` to **end of paragraph**, swallowing every following line into the first field. The two list-shaped sections accept **only** `bullet_list` tokens. **`TOPIC_MARKDOWN_FORMAT.md` demonstrates the plain-line / consecutive-line form in exactly these five places.** All 38 authors followed the examples. The authors were not wrong.

**The control that nails the mechanism:** `bank.curveballs[].model` — where `Model:` sits **alone** in its paragraph — is authored 38× and parsed **38/38**. The identical `Model:` inside a mock beat, where `Task:` precedes it in the same paragraph, is authored 76× and parsed **0/76**. Same field, same syntax; the only variable is a sibling line.

### EXECUTION

```bash
cp _audit/2026-07-11-compiler-parity/parse_md.PARITY.mjs tools/compiler/parse_md.mjs
```
**⚠️ THEN IMMEDIATELY FIX THE IMPORTS — lines 11-14. The prototype ran from the audit dir:**
```diff
-import { prose, text } from '../../tools/compiler/prose.mjs';
-import { flow } from '../../tools/compiler/flow.mjs';
-import { code } from '../../tools/compiler/code.mjs';
-import { shikiLang } from '../../tools/compiler/shiki-highlight.mjs';
+import { prose, text } from './prose.mjs';
+import { flow } from './flow.mjs';
+import { code } from './code.mjs';
+import { shikiLang } from './shiki-highlight.mjs';
```

### THE SIX CHANGES (all inside `tools/compiler/parse_md.mjs`)

**Two shared helpers** (new, top of file) — a paragraph's soft-wrapped lines are *separate logical records*:
```js
const lines = (raw) => String(raw).split('\n').map((l) => l.trim()).filter(Boolean);

function segment(raw, labelRe) {          // -> [{key, body}]; continuation lines stay with their field
  const segs = []; let cur = { key: null, lines: [] };
  for (const ln of String(raw).split('\n')) {
    const m = labelRe.exec(ln.trim());
    if (m) { if (cur.key || cur.lines.join('').trim()) segs.push(cur); cur = { key: m[1].toLowerCase(), lines: [ln.trim().slice(m[0].length)] }; }
    else cur.lines.push(ln);
  }
  if (cur.key || cur.lines.join('').trim()) segs.push(cur);
  return segs.map((s) => ({ key: s.key, body: s.lines.join('\n').trim() }));
}
```

| # | site | defect | change | recovers |
|---|---|---|---|---|
| **F1** | `parse_md.mjs:203` + `:219-228` (`parseSys`) | `:203` gates stages on `bullet_list_open`, which **never fires** — the authored (and documented, `FORMAT.md:249-253`) form is a **paragraph**. The paragraph handler at `:219-228` has branches for `mode===null`, `mode==='pivots'`, `piv` — and **no branch for `mode==='stages'`, no else** → `i += 2; continue;` **discards it.** | add `else if (mode === 'stages') { for (const ln of lines(raw)) { …strip trailing `[*]` → `cur:true`; split on first `': '` → `{n,d}`; `prose()` both… } }`. **Keep the `:203` bullet branch** for back-compat — both forms parse. | **+189 stages, +38 `cur`** |
| **F2** | `parse_md.mjs:225` (`parseSys`) | `piv.chip = '→ ' + raw.slice(m[0].length)` slices to **end of paragraph** — the `\n` *and the entire answer* land inside the chip; `piv.a` is never assigned. Chips ship at 249-437 chars (the 8: 19-39) and render **2098px wide**, clipped mid-word by `.piv{overflow:hidden}` (`system-map.js:38`). | split at the **first `\n`**: chip = line 1 (through `prose()` — `:225` is the one field that skips it), `a` = the rest. **The idiom already exists twice in this file** — `:353` (`Follow:`) and `:411` (`splitQA`). `:225` is the one place that forgets to split. | **+76 answers, 76 chips repaired** |
| **F3** | `parse_md.mjs:342` + `:350` (`parseDrill`) | `:342` demands `bullet_list_open`; the authored (and documented, `FORMAT.md:186-190`) form is plain lines → one paragraph → gated out by `:350`'s `&& card` (`card === null` before the first `###`) → **dropped silently.** | add `if (t.type === 'paragraph_open' && !seenCard)` → split on `\n`, split each on `' \| '` → `tierNotes[tier] = prose(note)`. | **+114** |
| **F4** | `parse_md.mjs:354-355` (`parseDrill`) | **LATENT, blocks ~1,600 items.** `FORMAT.md:201-202` prints `Senior:` and `Speak:` on **consecutive lines** → one paragraph → `:354` takes everything after `Senior: ` **including the whole `Speak:` line**. `Follow:` (`:353`) splits on `\n`; `Senior:`/`Speak:` do not. **The parser is internally inconsistent.** | route the paragraph through `segment(raw, /^(follow\|senior\|speak)\s*:\s*/i)`; `Follow:`'s answer line stays attached to `Follow:`. | **0 today — MUST land before any authoring** |
| **F5** | `parse_md.mjs:407` (`parseBank.mkBeat`) | `theme: p[0].trim()` reads **the literal token `"CURVEBALL"`** as the theme and folds the real theme into the cue. **Off-by-one: it forgot to skip the tag.** The non-curve branch one line below (`:409`) does it correctly (`theme: p[1]`). | `const q = p[0].trim().toUpperCase() === 'CURVEBALL' ? p.slice(1) : p;` then `theme: q[0]`, `cue: q.slice(1).join(' \| ')`. Tolerates both forms. | **+38 real themes** (1 distinct → 35) |
| **F6** | `parse_md.mjs:428-436` (`parseBank`) | `/^task:/i` has **no `m` flag** → `^` = start-of-**string**. `Task:`/`Model:`/`Int:` are consecutive lines (`FORMAT.md:378-381`) = one paragraph. `taskM` wins the `else if` chain and `raw.slice()` swallows **Model:, Int:, and the Int answer** into `task`. | route through `segment(raw, /^(task\|model\|int2\|int)\s*:\s*/i)` — **`int2` before `int`**, or `/^int:/` prefix-matches `Int2:`. `Int`/`Int2` bodies go through the existing `splitQA` (`:411`). | **+76 model, +76 int{q,a}** |

### VERIFY PHASE 2
```bash
node tools/compiler/prove_conservation.mjs   # RED -> GREEN: 0 dropped, 0 corrupted
node tools/compiler/prove_md.mjs             # 23 pass, 0 fail  (VERIFIED: no regression)
npm run build                                # regenerates src/topics/_generated/ (untracked build output)
python3 test/check_all.py                    # everything that was green stays green
```
**Already verified this session:** 23/23 `prove_md` assertions pass under the fixed parser; **38/38** topics still pass zod; all 14 control collections byte-identical.

**Caveat to know:** F1's paragraph branch treats *every* paragraph under the first `###` of `## System` as stage lines. A prose paragraph there would parse as `{n: <whole line>, d: ''}`. The doc specifies stages-only in that block, and all 38 comply — but the new `prove_doc_examples` + population floors will catch any future violation.

---

## PHASE 3 — RUNTIME GUARDS: two P0 bugs the parser fix does **NOT** heal

> **This is the most important ordering finding in this plan, and I proved both.** Do not assume the compiler fix fixes the app.

### 3.1 — The literal string `undefined` ships on 38 of 46 topics (83% of the app)

`src/scripts/app/drill/logic.js:180`
```js
if (this._tiernote) this._tiernote.innerHTML = d.tierNotes.all;
```
**MEASURED: after the parser fix, `drill.tierNotes.all` is still `0/38`** (`_plan_measure.mjs`: `drill.tierNotes.all  0 → 0`). F3 recovers `SDE2`/`SDE3`/`Staff` — **nobody authored an `all |` line** (`grep -c '^all |' src/topics-md/*.md` = **0**). So `d.tierNotes.all` stays `undefined`, and `innerHTML = undefined` coerces to the **literal string "undefined"**, visible on the drill pane's **default landing view** of all 38. Same at `:475` (`DRILL_TIER_NOTES[t] || DRILL_TIER_NOTES.all` — the fallback is also undefined).

**FIX (ship regardless of authoring):**
```diff
- if (this._tiernote) this._tiernote.innerHTML = d.tierNotes.all;
+ if (this._tiernote && d.tierNotes && d.tierNotes.all) this._tiernote.innerHTML = d.tierNotes.all;
```
`drill/logic.js:22` already holds a sane default string that line 180 blindly overwrites with `undefined`. Guard `:475` the same way.

### 3.2 — Every mock run permanently corrupts the canonical bank

**Three-part mechanism, all verified:**
- `src/scripts/app/topic-protocol.js:32` — `curveballPool = b.curveballs.slice()` is a **shallow** array copy: the curveball **objects are the bank's own**. Line `:33` correctly deep-copies `mockBeats`. It hardened one pool and not the other — while its own comment at `:25-27` claims *"the canonical topic data is never clobbered."*
- `topic-protocol.js:34-38` — `mockCurveIdx = 0; mockFrameIdx = 0;` then overwrite only when a beat is tagged `CURVEBALL`/`FRAME`. **MEASURED: 0/76 generated beats carry either tag** — and **the parser fix does not change this** (the tags come from the authored `### <tag> | <cue>` headings; the 38 wrote `SCALE`/`DESIGN`/…; `bank.curveballs` = 38 = 1/topic, all from `### Extra Curveballs`; `bank.frames` = 114 = 3/topic, all extras → **no in-sequence FRAME or CURVEBALL beat exists**). So for all 38 the two indices **collide at 0**.
- `src/scripts/app/mock-run/logic.js:39-40` — `:39` assigns the **canonical** curveball object into `mockBeats[0]`; `:40` then writes `mockBeats[mockFrameIdx].cue = framePool[…]` **through that same reference into the bank.**

**Live proof (`_audit/.../_leak.mjs`):** `TOPIC_API_BANK.curveballs[0].cue` goes from `"breaking-change | A product requirement forces…"` → `"Idempotency key + atomic dedupe…"` (a **frame** string) after **one** mock run. A topic switch away-and-back does **not** heal it — only a page reload. `mixed-fire.js:51,56` reads the same poisoned objects, so opening Mock Run once permanently turns Mixed Fire's "Curveball" into a framing statement. **The 8 never trip this only because their FRAME (beat 0) and CURVEBALL (beat 4) indices differ.**

**FIX — all three, they are independent:**
```diff
  // src/scripts/app/topic-protocol.js:32
- curveballPool = b.curveballs.slice();
+ curveballPool = b.curveballs.map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; return o; });

  // src/scripts/app/topic-protocol.js:34
- mockCurveIdx = 0; mockFrameIdx = 0;
+ mockCurveIdx = -1; mockFrameIdx = -1;   // "absent tag" must mean absent, not index 0
```
```diff
  // src/scripts/app/mock-run/logic.js:39-40
- mockBeats[mockCurveIdx] = curveballPool[Math.floor(Math.random() * curveballPool.length)];
- mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];
+ if (mockCurveIdx >= 0 && curveballPool.length) {
+   var _cb = curveballPool[Math.floor(Math.random() * curveballPool.length)];
+   mockBeats[mockCurveIdx] = Object.assign({}, _cb);
+ }
+ if (mockFrameIdx >= 0 && framePool.length) mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];
```
Also guard `mixed-fire.js:205` (`mockBeats[mockCurveIdx].theme` → crashes/NaNs at `-1`) and `topic-protocol.js:39`'s `framePool` fallback.

### 3.3 — Unguarded `innerHTML` of absent fields (renders the word `undefined`)
- `src/scripts/app/mixed-fire.js:18` — `prompt: cb.cue + '<div class="mx-task">' + cb.task + '</div>'` → **`cb.task` is undefined on all 38** (0/38 author a curveball `Task:`). Measured live: `"taskHTML": "undefined"`. Guard: `+ (cb.task ? '<div class="mx-task">' + cb.task + '</div>' : '')`.
- `mixed-fire.js:165-166` — same for `beat.task` / `beat.model`. (F6 fixes `model`; `task` was never the problem — the **corrupted** beat[0] is.)
- `src/scripts/app/whiteboard.js:134` — `this._foot.innerHTML = d.foot;` with `wb.foot === ''` on **0/38 populated** → an **empty, fully-decorated 26px box** (3px accent border + gradient) ships on all 38. Add `this._foot.hidden = !d.foot;`.
- `src/scripts/app/model-answers/logic.js:66-67` — `var ans = this._answers[this._cur]; … ans.opener` → **`TypeError: Cannot read properties of undefined (reading 'opener')`** on a `## Model Answers` section with no `###` sub-headings. The schema and the gate **both currently permit** that shape (see 6.1). Guard it.

### 3.4 — The `/6` mock score (structurally unwinnable on 38 topics)
`mixed-fire.js:207` hardcodes the word **"six"**; `:208` renders **7 buttons** (`i <= 6`); `:222-224` thresholds at `>= 6` / `>= 4` with literal `"/ 6"` strings. The 38 have **2 beats** (1 after the corruption bug destroys beat[0]), so an honest self-score maxes at 2 — **every run on 38/46 topics lands in the bottom amber bucket, by construction.**
```diff
+ const n = mockBeats.length;
- '<div class="mb-score-q">How many of the six did you deliver cleanly, out loud?</div>…'
+ '<div class="mb-score-q">How many of the ' + n + ' did you deliver cleanly, out loud?</div>…'
- for (let i = 0; i <= 6; i++) …
+ for (let i = 0; i <= n; i++) …
- if (score >= 6) … else if (score >= 4) …
+ if (score >= n) … else if (score >= Math.ceil(n * 2 / 3)) …
```
`Math.ceil(6 * 2/3) === 4` — **exactly preserves the hand-coded 8's current behaviour** while making the 38 scorable.

### 3.5 — The 64% cross-topic companion leak
`src/scripts/app/shell.js:237` — `if (TOPIC_CMP_NOTES[tab]) {` … `:244` `}` — **no `else`.** `:235-236` are (grep-confirmed) the **only** writers of those six DOM nodes, so when the guard falls through **nothing writes and nothing clears**: the rail retains the last topic/pane pair that had a note. **Stale by omission.**

**The leak set IS the depth gap, exactly:** 46×9 = 414 pairs; populated = 8×9 + 38×2 = 148; missing = **266 = 64.3%** — and the audit independently measured the leak at "64% of pairs". That is an **identity, not a correlation**. On the 8 (9/9) the else-branch is **dead code** — which is why it survived 8 topics and detonated across 38. Live: the page reads **"Caching Strategies"** while the coach says **"Zoom out to the six stages"** — Content Pipeline's note, verbatim.

**FIX:** add the `else` — clear (or set a generic per-pane default on) `cmpView`/`cmpNote`/`cmpMove` + the mobile mirrors. This adds no content; it makes the failure **honest-empty instead of wrong-topic**, and it stops 266 wrong renders while the authoring (7.4) is in flight.

### 3.6 — Harden the chip→jump resolver (removes 3 phantom jumps)
`src/scripts/app/system-map.js:84` — `if (title.length >= 4 && lc.indexOf(title) > -1)` scans the **chip** for any topic title. With 250+ chars of answer prose fused into the chip (F2), it fires on topics **mentioned in passing**: `debugging→idempotency`, `error-propagation→idempotency`, `saga→observability` — buttons that **yank the user out of the topic**. F2 removes the prose and kills all three (verified: 6 jumps → 3). **Additionally** bound the fallback (`chip.length < 60`, or require the explicit `(N)` form) — a loose substring scan over prose is inherently fragile.

---

## PHASE 4 — (b) FORMAT EXTENSIONS: the only three things markdown genuinely cannot express

**This is the entire delta between the JS schema and the markdown format. ~30 lines.** None of the 38 need them *today*; **all three are required to migrate the 8 onto the md path** (the real end-state: one authoring surface). Two of the three **throw the build** — they are hard blockers, not degradations.

| # | site | gap | fix | uses in the 8 |
|---|---|---|---|---|
| **B1** | `tools/compiler/flow.mjs:21` | `const CONN = { '->': …, '.': …, '/': '/' }` — **3 connectors.** The 8 use **6**: `&rarr;`(130) `&middot;`(59) `/`(20) **`+`(4) `vs`(3) `&harr;`(2)** *(measured across all 8 `walk.js`)*. `flow.mjs:34` **THROWS** `flow: unknown connector "+"`. | `CONN = { '->': '&rarr;', '.': '&middot;', '/': '/', '+': '+', 'vs': 'vs', '<->': '&harr;' }` — **one line.** | **9** |
| **B2** | `tools/compiler/flow.mjs:24` | `boxRe = /([a-z]+)\[([^\]]*)\]/g` — the label runs to the **first `]`**, no escape. The flagship's own box label `strategies[ext]` (`src/topics/content-pipeline/walk.js:11`) parses as `strategies[ext` and the stray `]` is read as a connector → **THROW**. *(Found by the round-trip failing to compile.)* | support a backslash escape: `/([a-z]+)\[((?:[^\\\]]|\\.)*)\]/g` + unescape in the label at `:37`. ~3 lines. | **1** |
| **B3** | `tools/compiler/code.mjs:27` | `TOKEN = new RegExp('==([^=]+)==\|\\b(' + KW_ALT + ')\\b','g')` — matches only `==emphasis==` and keywords. **No string rule**, so `<span class="s">` can **never** be emitted. The 8 use it **50×** (`createHash(<span class="s">'sha256'</span>)`). **Degrades silently** — the block renders, just uncoloured. | add a string alternative **before** the keyword group (so a keyword inside a string isn't re-tokenized) and emit `<span class="s">` for it in `highlightCode` (`:34-37`). ~5 lines. *(js/ts/unlabelled path only — Shiki already colours strings for sql/yaml.)* | **50** |

---

## PHASE 5 — (d) DOC FIXES: every place the spec demonstrates a form the parser rejects

**The doc is the proximate cause.** Fed its own examples verbatim, the shipping parser gets **9 of 17 fields wrong** (`_audit/.../fx-docspec.mjs`). It **contradicts itself** — prose says *"bullets"*, the example directly beneath shows **plain lines**.

| `tools/compiler/TOPIC_MARKDOWN_FORMAT.md` | says | shows | after Phase 2 |
|---|---|---|---|
| `:181` vs `:186-190` | "Optional tier-note **bullets** first" | `SDE2 \| baseline mechanics` (plain lines) | **example now correct** → fix the **prose** to "plain lines (bullets also accepted)" |
| `:238-239` vs `:249-253` | "stages: **bullets** `<n>: <d>`" | `Producers: emit events` (plain lines) | same — fix the **prose** |
| `:201-202` | — | `Senior:` / `Speak:` on consecutive lines | F4 makes this parse. **Keep the example.** |
| `:261-262` | — | `-> chip` + answer on the next line | F2 makes this parse. **Keep.** |
| `:378-381` | — | `Task:`/`Model:`/`Int:` on consecutive lines | F6 makes this parse. **Keep.** |
| `:386` | — | `### CURVEBALL \| <theme> \| <cue>` | F5 makes this parse. **Keep.** |

> **Fix the parser to accept the documented forms, NOT the docs to match the parser.** The plain-line form is better authoring ergonomics and is what all 38 files already use; changing the docs would instead require rewriting 38 `.md` files.

**Three more doc defects that CAUSED the authoring gaps** (these are the real root cause of Phase 7 — *the example is the real spec*):
- **`:280-292` (Model Answers)** — the **entire** documentation, and its only example shows **1 answer / 2 beats**, a throwaway sub (*"How I frame it under time pressure."*), no rich text, c-tags `key`/`store`. **All 38 have almost exactly that**, with **zero variance**. The real contract (9 selectors, *"Name the limits"* LAST, c-tags `frame\|head\|sub\|risk\|trade\|close`) exists **only as a source comment at `src/topics/eav/model.js:1-4`** and was never transferred into the spec. → **Replace with a full 9-answer ladder example.**
- **`:343` vs `:348-365` (Opener)** — line 343 documents *"subsequent `### <k> | <t>` are close cards"*, but the **worked example shows exactly ONE card**. **0 of 38 have a close card.** → **Add a second `### Land it | How to close` card to the example.**
- **`:288` (Model opener)** — the only example opener is a **label** (`### idempotency | The core guarantee`), not the quoted interview **question** the 8 use. All 38 wrote labels. → Fix the example.

**And the DX failure that made all of it inevitable:** `grep -rn 'TOPIC_MARKDOWN_FORMAT' --exclude-dir=node_modules .` returns **nothing outside the file itself**. No README, no `TOPIC_CONTRACT.md`, no Makefile, no CONTRIBUTING. It lives in `tools/compiler/`, not `docs/`. **The machine never told anyone how to write a topic, and the one example it did provide was defective.** → Link it from `README.md` + `TOPIC_CONTRACT.md`, and move/symlink it into `docs/`.

---

## PHASE 6 — SCHEMA + GATE: population floors (make the residual visible and non-regressable)

### 6.1 — `tools/compiler/topic-schema.mjs:62-66, :80-84` — presence, never population
```js
const NEED_ARRAY = [['walk','steps'], ['sys','stages'], ['sys','pivots'], ['model','selectors'],
                    ['num','inputs'], ['rf','flags'], ['open','cards'],
                    ['bank','mockBeats'], ['bank','curveballs'], ['bank','frames']];
…
if (v[pane] != null && !Array.isArray(v[pane][field]))     // :81 -- `[]` IS an array. It passes.
```
`sys.stages` **is listed** — and `[]` passes. The build-time validator **watches the system map get emptied and signs off.** The only `.min()` in the whole schema is `drill.min(18)` (`:40`). Worse, **`wb.steps` and `trade.decisions` are not in the list at all**, despite the comment at `:61` declaring it to be *"the fields the app renders with `.map` — if absent they throw"* and `whiteboard.js:136` / `trade-offs.js:48` doing exactly that. **Proven** (`_audit/.../schema-hole.mjs`): `validateTopic()` **accepts** `wb.steps` missing entirely + `trade.decisions` missing entirely + `rf.flags: []` + `open.cards: []` — which then throws `TypeError: Cannot read properties of undefined (reading 'map')` on first tab click, **the exact failure `topic-schema.mjs:55-56` says it exists to prevent.**

**FIX — carry a minimum:**
```js
const NEED_ARRAY = [
  ['walk','steps',5], ['sys','stages',4], ['sys','pivots',2], ['model','selectors',2],
  ['model','answers',2],            // <-- WAS NOT CHECKED AT ALL (crash path, see 3.3)
  ['num','inputs',3], ['rf','flags',3], ['open','cards',1],
  ['wb','steps',2],                 // <-- WAS NOT IN THE LIST
  ['trade','decisions',3],          // <-- WAS NOT IN THE LIST
  ['bank','mockBeats',2], ['bank','curveballs',1], ['bank','frames',1],
];
// :81
const arr = v[pane] != null ? v[pane][field] : undefined;
if (v[pane] != null && (!Array.isArray(arr) || arr.length < min)) ctx.addIssue({ … });
```
Plus: `sys.pivots` — **every pivot must have a non-empty `.a`**. `drill.tierNotes` — require the 3 core tiers **and `all`** (the renderer dereferences `.all` unconditionally). `identity.cmpNotes` (`:27`, currently `z.record(z.string(), z.array(z.string()))` — an **empty record passes**) — require all 9 pane keys, each a 3-tuple.

> **Set these floors at the CURRENT post-fix reality, not at the 8's parity level.** Floors are a *ratchet against regression*; the *gap to parity* is the `parity_debt.json` ledger in 1.2. Two instruments, two jobs. Do not conflate them, or the build stays red for months and everyone learns to ignore it.

### 6.2 — Two latent parser landmines under the authoring push (0 items today, catastrophic tomorrow)
The Phase-7 fix pushes **798 new companion paragraphs** through this exact code path:
- `parse_md.mjs:73` — `if (buf.length === 3) cmp[key] = buf.map(text);` — **strict `=== 3`, no else, no throw.** A 2-paragraph note **vanishes entirely**; a 4-paragraph note is **silently truncated**. Clean build, passing gate, and a leak. → **Throw** on `!== 3`, naming topic + pane + count.
- `parse_md.mjs:70` — `key = toks[i+1].content.toLowerCase();` — **raw, unvalidated, un-aliased.** `### Whiteboard` yields key `"whiteboard"`, never `"wb"` → the renderer reads `TOPIC_CMP_NOTES['wb']` → `undefined` → **leak forever**, compiling clean. And the human-readable name is the *natural* thing to write (the note's own first paragraph **is** the human title). **The damning part: `parse_md.mjs:19-23` already defines `PANE_KEY` (`whiteboard→wb`, `system→sys`, …) and `:479`/`:485-490` already alias AND hard-throw on unknown `##` headings.** That discipline sits **51 lines above the bug** and was never wired into the companion path. → `const raw = toks[i+1].content.toLowerCase(); key = PANE_KEY[raw] || raw;` then validate against the 9 pane ids and throw in the same style as `:486-490`.

---

## PHASE 7 — (e) TRUE AUTHORING GAPS: what genuinely must be WRITTEN

**Verified NOT recoverable by code.** For each: the syntax exists, the parser consumes it (or will, after Phase 2), and the source scan shows **zero occurrences**. A parser fix recovers **0** of these.

Ordered by **user-visible leverage per unit of writing**:

| # | gap | authored today | target (the 8's floor) | to write | why first |
|---|---|---|---|---|---|
| **7.1** | `drill.tierNotes.all` | **0/38** (`grep -c '^all \|'` = 0) | 1/topic | **38 lines** | Cheapest fix on the board. The "undefined" P0 (3.1). One line per file. |
| **7.2** | bank `FRAME` + `CURVEBALL` tagged mock beats | 0/76 | 1 each per topic | **76 headings** | **Un-collides `mockCurveIdx`/`mockFrameIdx`** (3.2). Restores the mock arc's spine. Also auto-fills the 4th frame free (`parse_md.mjs:439-440`). |
| **7.3** | `drill.card.f` (follow-up probes) | **0** across 798 cards | 39/topic min (the 8: 335 total, 1.94/card, **100%** of cards) | **~1,500** | `drill/logic.js:246` — `maxStage = 1 + card.f.length` **IS the reveal ladder.** With `f:[]`, `maxStage===1` → the "↳ Interviewer pushes further" button **never renders**. The pane's entire premise does not exist on 38/46 topics. |
| **7.4** | `identity.cmpNotes` — the 7 missing panes | 2/9 (walk, drill) on all 38 | 9/9 | **266 notes = 798 paras** | Kills the 64% leak (3.5) **at the source**. ⚠️ Land **6.2** first or every miscounted note silently vanishes. |
| **7.5** | `drill.card.senior` + `drill.speak` | 0 / 0 | 798 each | **1,596** | ⚠️ **F4 MUST be in first** or every `Speak:` line is eaten by `Senior:`. Also restores half of `_mustHit`'s input: the 38 have **243 cards (30%) with an EMPTY scoring checklist** vs the 8's **5 (3%)** — on those cards the Solid/Shaky/Missed grade is **ungrounded**. Recovered for free. |
| **7.6** | `model.answers` + `model.beats` | 2 answers / 6 beats per topic (**zero variance across all 38**) | 9 / 58-62 | **266 answers, ~2,000 beats** | The biggest raw volume. **6 vs 62 beats/topic = 9.7% of the 8's depth — worse than the 28% headline.** ⚠️ Fix the spec example (Phase 5) first — the doc taught the floor. |
| **7.7** | `bank` depth: mockBeats 2→6, curveballs 1→8, `Int2:`, curveball `Task:` | 76 beats / 38 curveballs | 6 / 8 per topic | **152 beats, 266 curveballs, ~114 int2, ~300 tasks** | Makes the `/n` score (3.4) meaningful. ⚠️ Worthless until F6 lands — every `Model:`/`Int:` written into a new beat is swallowed exactly like the existing 152. |
| **7.8** | `sys.pivots` 2→7, `sys.stages` 5→6, chip `(N)` cross-topic index | 2 pivots, 5 stages, **0/76 chips carry `(N)`** | 7 / 6 / all | **190 pivots, 38 stages, 76 chip rewrites** | Even **after** F2, **zero** md pivots resolve a jump via the intended `(N)` path — the 38 used the chip slot as a one-line answer summary, not a `→ Topic (N)` pointer. |
| **7.9** | `wb.steps` 2→9, `wb.foot`, `rf.flags` 3→9, `trade.decisions` 3→7, `walk.steps` 4→9, `open` close card, `num.inputs` 3→4 | see the table | the 8's counts | **~1,100** | The "sieve with no mesh" panes. **ZERO items dropped here** — I diffed authored-vs-emitted for all of them: 76→76 wb, 114→114 rf, 114→114 trade, 232→232 opts, 38→38 open, 76→76 items, 114→114 num. Purely thin. |
| **7.10** | `num` metric-row **liveness** | 67% live (127/190) | 90% (the 8: 43/48) | **63 rows** | Quality, not capability. **`num` is the compiler's one genuine success** — 38/38 ship a live executing `compute` fn, **0 dead inputs in 114**. But 63 rows are **hardcoded prose dressed as derived metrics** (`storage-engines.md:376-380` freezes 4 of 5). Convert to real arithmetic or move the prose to `tell`. |

**Honest total: ~6,000 authored items.** That is the real cost, and **no compiler change pays any of it.**

---

## WHAT THIS PLAN DOES *NOT* DO (do not let a green gate be mistaken for parity)

After Phases 1-6 the compiler conserves **100%** of what was authored, the gate can **see** the gap, and the app stops rendering `undefined` / corrupting itself. **It is still not at parity.** Post-fix, measured:
- `sys.stages` **5.0**/topic vs the 8's floor of **6**
- `drill.tierNotes` **3** keys vs **4** (no `all`)
- `sys.pivotAnswers` **2.0** vs **7.0**
- `drill.follows` **0** vs **41.9** · `senior` **0** vs 21.6 · `speak` **0** vs 21.6
- `model.answers` **2** vs **9** · `cmpNotes` **2** vs **9**

The parser fix recovers **607 items that were already written** — free, hours of work. Everything else is **content**, and the `parity_debt.json` ratchet exists precisely so it can only shrink.

---

## EXECUTION CHECKLIST (verbatim order)

```bash
cd D:/claude-workspace/deepdive-rehearsal && git switch -c compiler-parity

# PHASE 0
python3 test/check_all.py                       # GATE: PASS (the control)

# PHASE 1 -- RED
cp _audit/2026-07-11-compiler-parity/prove_conservation.mjs tools/compiler/
#   edit :30  '../../tools/compiler/parse_md.mjs' -> './parse_md.mjs'
#   extend scanSource/scanParsed/FIELDS with the 7 bank/cur/theme rows (1.1)
cp _audit/2026-07-11-compiler-parity/topic_contract.HARDENED.cjs test/topic_contract.cjs
#   + prove_md.mjs all-10-views (1.4) · notifications.md -> 14 sections (1.3)
#   + prove_emit relabel (1.5) · prove_doc_examples.mjs (1.7)
#   + check_all.py: add ('compiler_conservation', [...])  after :59
node tools/compiler/prove_conservation.mjs      # EXPECT EXIT 1: 607 dropped, 76+38 corrupted
python3 test/check_all.py                       # EXPECT: GATE: FAIL  <-- the true deficit, finally visible

# PHASE 2 -- GREEN
cp _audit/2026-07-11-compiler-parity/parse_md.PARITY.mjs tools/compiler/parse_md.mjs
#   *** FIX IMPORTS lines 11-14: '../../tools/compiler/X' -> './X' ***
node tools/compiler/prove_conservation.mjs      # EXPECT EXIT 0: PASS, 0 dropped, 0 corrupted
node tools/compiler/prove_md.mjs                # EXPECT 23 pass, 0 fail  (VERIFIED)
npm run build                                   # regenerates src/topics/_generated/ (untracked)

# PHASE 3 -- the runtime the parser does NOT heal
#   drill/logic.js:180,475 · topic-protocol.js:32,34 · mock-run/logic.js:39-40
#   mixed-fire.js:18,165-166,205,207-208,222-224 · whiteboard.js:134
#   model-answers/logic.js:66 · shell.js:237 (else) · system-map.js:84
npm run build && python3 test/check_all.py

# PHASE 4-6 -- flow.mjs:21,24 · code.mjs:27 · TOPIC_MARKDOWN_FORMAT.md · topic-schema.mjs · parse_md.mjs:70,73
npm run build && python3 test/check_all.py      # then SEED parity_debt.json from the residual

# PHASE 7 -- authoring, gated by the ratchet (the number can only go down)
```

**Every phase ends with `npm run build && python3 test/check_all.py`. Never stack an unverified change.**
