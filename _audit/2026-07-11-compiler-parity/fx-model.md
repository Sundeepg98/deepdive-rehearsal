# FX-MODEL — Model Answers pane: parity audit of THE 38 vs THE 8

**Lens:** model pane (`d.selectors` + `d.answers[{opener, sub, beats[{l,c,t}]}]`)
**Verdict: AUTHORING_GAP.** Proven by construction. The compiler is **not** the ceiling here.
**Items recoverable by any parser/compiler fix: 0.**

> This lens **falsifies the working thesis** for its own pane. The "compiler is a CEILING, not an
> ENABLER" thesis is well-founded elsewhere (sys.stages, tier-notes, pivot answers — ~380 dropped
> items). It is **not** true of model answers. `parseModel` is a faithful, uncapped pass-through.
> Reported as found, per the evidence standard.

---

## 1. The reference spec (THE 8)

`src/topics/content-pipeline/model.js:5-103` — the canonical shape:

```js
var TOPIC_CP_MODEL = {
  selectors: ['Make it reliable', 'Make it scale', 'Walk a failure', 'Defend the design',
              'Operate it', 'Cut scope', 'One you built', 'Test it', 'Name the limits'],  // 9
  answers: [
  { opener:"“How would you make this reliable?”",                    // a QUESTION
    sub:"Production-grade = no data lost across S3+DB, and no work done twice on a retry.",
    beats:[                                                                    // 7 beats
      {l:"FRAME",   c:"frame", t:"Reliability here is two guarantees: <b>no data lost</b> ..."},
      {l:"HEADLINE",c:"head",  t:"The central risk is the <b>dual-write</b> — ..."},
      ...
      {l:"CLOSE",   c:"close", t:"So: idempotent effects, compensating cleanup, ..."}
    ] }, ... ]  // x9
};
```

Measured across all 8 (`grep -c "opener\s*:"` / `grep -oE "\{\s*l\s*:"`):

| topic | answers | beats |
|---|---|---|
| authz | 9 | 62 |
| aws-hardening | 9 | 63 |
| content-pipeline | 9 | 58 |
| desired-state | 9 | 63 |
| eav | 9 | 63 |
| iac | 9 | 63 |
| notifications | 9 | 63 |
| signing | 9 | 61 |
| **TOTAL** | **72** | **496** |

Invariant: **9 answers, ~62 beats/topic (~6.9 beats/answer)**, `c` ∈ `frame|head|sub|risk|trade|close|ceil`.
The rhetorical ladder is FRAME → HEADLINE → evidence → NAME THE RISK → TRADE-OFF → CLOSE, and
`'Name the limits'` is always LAST (documented at `src/topics/eav/model.js:1-4`).

## 2. What THE 38 get

`src/topics/_generated/idempotency/model.js:1-50` — **2 answers × 3 beats.**

Across all 38: **76 answers, 228 beats** (2 answers, 6 beats/topic, 3 beats/answer).
Uniform — *every single one of the 38* is exactly 2×3. Zero variance across 38 files.

**Per topic: 6 beats vs 62 = 9.7% of the 8's depth.**

## 3. Where the content actually is: THE .MD ONLY CONTAINS 2

`src/topics-md/idempotency.md:317-333` — the complete authored section:

```markdown
## Model Answers

### the reframe | Exactly-once effect, not delivery
The frame to lead with.
- Delivery is at-least-once | key | duplicates and ambiguous failures are inherent
- Make processing idempotent | store | so a duplicate has no additional effect
- Net: exactly-once effect | note | what exactly-once actually means

### the mechanism | Atomic key claim
How you buy it.
- Idempotency key = operation identity | key | client generates once, reuses on retry
- Claim it atomically | store | unique constraint -> one winner does the effect
- Commit key + effect together | note | or a crash double-charges or loses the charge
```

Counted across all 38 md files (`awk` over the `## Model Answers` block): **`answers=2 bullets=6` for
all 38, without exception.** The content was never written. It is **MISSING, not DROPPED.**

## 4. The parser is INNOCENT — it is a faithful, uncapped pass-through

`tools/compiler/parse_md.mjs:302-326`:

```js
function parseModel(toks) {
  const selectors = [], answers = [];
  let ans = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {            // every h3 -> one answer
      const raw = toks[i + 1].content; const k = raw.indexOf(' | ');
      selectors.push(prose(k === -1 ? raw : raw.slice(0, k)));    // NO CAP
      ans = { opener: prose(...), sub: '', beats: [] }; answers.push(ans); i += 2; continue;
    }
    if (t.type === 'bullet_list_open' && ans) {
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {   // every bullet -> one beat
        if (toks[j].type === 'inline') {
          const p = toks[j].content.split(' | ');
          ans.beats.push({ l: prose(p[0]||''), c: (p[1]||'').trim(), t: prose(p.slice(2).join(' | ')) });
        }                                                         // NO CAP
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'paragraph_open' && ans && !ans.sub) { ans.sub = prose(toks[i+1].content); i += 2; continue; }
  }
  return { selectors, answers };
}
```

- **No `.slice()`, no cap, no limit, no filter** anywhere in the model path (grepped `tools/compiler/*.mjs`).
- `tools/compiler/emit.mjs` contains **zero** occurrences of `model`/`answers`/`beats` — it is a generic
  serializer. Nothing downstream can drop a beat.
- The n-answers-in → n-answers-out property is confirmed by the output itself: md has 2 → module has 2.

### Rich text is fully supported AND already exercised

`tools/compiler/prose.mjs:50-59` runs markdown-it with `html:true, typographer:true` and rewrites
`<strong>`→`<b>`, `<em>`→`<i>`, ` -> `→`&rarr;`, then maps all non-ASCII to named entities.
So `**bold**`, `` `code` ``, `---`→`&mdash;`, `"…"`→`&ldquo;…&rdquo;` all work.

Live proof in the generated output — `src/topics/_generated/idempotency/model.js:40`:
```json
"t": "unique constraint &rarr; one winner does the effect"
```
The md wrote `->`; `prose()` converted it. The rich-text pipeline **runs on every build**. The authors
simply never wrote any `**bold**`.

## 5. CONSTRUCTIVE PROOF: the format expresses the 8's full shape, today, unmodified

`_audit/2026-07-11-compiler-parity/probe_model.mjs` re-authors content-pipeline's answer #1 (7 rich
beats) plus 8 more selectors as markdown, and runs it through the **real** `parseModel` + **real**
`prose()`:

```
selectors: 9 ["Make it reliable","Make it scale","Walk a failure","Defend the design",
              "Operate it","Cut scope","One you built","Test it","Name the limits"]
answers  : 9
beats/ans: 7,2,1,1,1,1,1,1,1

--- answer[0] as emitted ---
{
  "opener": "&ldquo;How would you make this reliable?&rdquo;",
  "sub": "Production-grade = no data lost across S3+DB, and no work done twice on a retry.",
  "beats": [
    { "l": "FRAME",    "c": "frame", "t": "Reliability here is two guarantees: <b>no data lost</b> across the S3-and-DB boundary, and <b>no work done twice</b> on a retry. Let me take them in turn." },
    { "l": "HEADLINE", "c": "head",  "t": "The central risk is the <b>dual-write</b> &mdash; the DB and S3 can disagree &mdash; so every write is idempotent and a <b>reconciler</b> is the real backstop." },
    ...
```

This is **shape-identical to `src/topics/content-pipeline/model.js:8-18`** (the 8 store `“`/`—`
as JS escapes, the compiler emits `&ldquo;`/`&mdash;` entities — both go through `innerHTML` at
`src/scripts/app/model-answers/logic.js:63-70` and render identically).

**The markdown format + parser can already produce a full-depth model pane. Nobody used it.**
The fix is 266 answers and ~2,128 beats of writing — not a line of parser code.

---

## 6. Why nobody wrote them: THE SPEC TAUGHT THE FLOOR

`tools/compiler/TOPIC_MARKDOWN_FORMAT.md:280-292` — the entire canonical example:

```
### `## Model Answers`

Per answer: `### <selector> | <opener>`, an optional sub paragraph, then beat
bullets `<l> | <c> | <t>` where `<c>` is a CSS class name.

    ## Model Answers

    ### idempotency | The core guarantee

    How I frame it under time pressure.

    - Deterministic id | key | hash(user, event, channel)
    - Dedup store | store | SET NX with a TTL
```

The spec demonstrates **1 answer, 2 beats, a throwaway sub, no rich text, no selector ladder, and the
`key`/`store` c-tags**. The 38 reproduced it almost exactly (2 answers, 3 beats, `key`/`store`/`note`).

It never states the real contract, which exists **only** in the 8's source header —
`src/topics/eav/model.js:1-4`:

```js
/* topics/eav/model.js -- topic 6 model answers. selectors[i] pairs answers[i]; 'Name the
   limits' is LAST. answers[6] is the Invenco device-attribute-store "one you built" story.
   openers use single-backslash “ .. ” curly quotes and ’ / —. beats carry
   c-tags frame|head|sub|risk|trade|close. 7-bit ASCII. */
```

**That knowledge was never transferred into the markdown spec.** This is the proximate cause of the
gap, and it *is* an engineering artifact with a file and a line number — just not a parser bug.

## 7. Why the gate can't see it (corroborates the self-confirming-apparatus finding)

Three independent failures, all "presence, never population":

1. **`tools/compiler/topic-schema.mjs:63`** — `NEED_ARRAY` lists `['model','selectors']` but
   **omits `['model','answers']` entirely**. The check (`topic-schema.mjs:80`) is
   `if (v[pane] != null && !Array.isArray(v[pane][field]))` — `Array.isArray([])` is `true`, so an
   **empty** selectors array passes, and `answers` is never checked at all.

2. **`test/topic_contract.cjs:52`** — `cfg.VIEWS.forEach(function (v) { if (!data[v]) ... })`.
   `{selectors: [], answers: []}` is truthy → **passes**.

3. **The gate has a counted depth floor for exactly one pane — drill, not model.**
   `test/topic_contract.cjs:54-60` enforces `MIN_CARDS` and `MIN_PER_CORE` on `drill.cards`. There is
   **no `MIN_ANSWERS`, no `MIN_BEATS`**. This is precisely why "compiler_md: 23 pass, 0 fail" coexists
   with a 2-vs-9 shortfall: the gate never counts model answers.

**Latent crash the schema currently permits** (verified by executing the renderer's logic):
`{selectors: [], answers: []}` passes the schema AND the gate, but
`src/scripts/app/model-answers/logic.js:63` does `var ans = this._answers[this._cur];` then
`ans.opener` →
```
RENDER CRASH: TypeError: Cannot read properties of undefined (reading 'opener')
```
A topic authoring `## Model Answers` with no `###` sub-headings compiles clean and hard-crashes the
pane on first click.

## 8. Secondary authoring defects (shape, not count)

| field | THE 8 | THE 38 | note |
|---|---|---|---|
| `opener` | a **question**: `"How would you make this reliable?"` | a **topic label**: `"Exactly-once effect, not delivery"` | rendered into `.mscript-h`; the 38's openers aren't questions, so the pane no longer reads as an interview drill |
| `sub` | a thesis: *"Production-grade = no data lost across S3+DB…"* | a stub: *"The frame to lead with."* (5 words) | |
| `beats[].c` | `frame\|head\|sub\|risk\|trade\|close\|ceil` | `key\|store\|note` | **`c` is DEAD CSS** — no `.l-*` rule exists anywhere in `src/scripts/` (confirmed by grep; `logic.js:20-21` says so outright). Cosmetically inert, but it means the 38's beats carry no rhetorical ladder. |
| `beats[].t` | 40–80 words, `<b>`/`<code>`/`<i>` | ~8-word fragments, no markup | format supports it (§4); unused |

---

## 9. THE FIX

Ordered. Only step 4 recovers content; steps 1–3 make the shortfall *impossible to ship silently again*.

1. **`tools/compiler/TOPIC_MARKDOWN_FORMAT.md:280-292`** — replace the 1×2 example with a full
   9-selector example carrying the real ladder (`FRAME/HEADLINE/…/NAME THE RISK/TRADE-OFF/CLOSE`),
   rich `**bold**` beat text, and the rule from `eav/model.js:1-4` ("selectors[i] pairs answers[i];
   'Name the limits' is LAST; c-tags are frame|head|sub|risk|trade|close"). **The doc is the bug.**

2. **`test/topic_contract.cjs`** (after line 60, mirroring the existing `MIN_CARDS` block) — add a
   counted floor so a 2-answer topic FAILS:
   ```js
   var ans = (data.model && Array.isArray(data.model.answers)) ? data.model.answers : null;
   if (!ans) { problems.push(id + ': model.answers is not an array'); }
   else {
     if (ans.length < cfg.MIN_ANSWERS) problems.push(id + ': ' + ans.length + ' model answers (< ' + cfg.MIN_ANSWERS + ')');
     ans.forEach(function (a, i) {
       if (!a.beats || a.beats.length < cfg.MIN_BEATS) problems.push(id + ': model answer ' + i + ' has ' + ((a.beats||[]).length) + ' beats (< ' + cfg.MIN_BEATS + ')');
     });
     if (data.model.selectors.length !== ans.length) problems.push(id + ': model selectors/answers length mismatch');
   }
   ```
   with `MIN_ANSWERS: 9, MIN_BEATS: 5` in `cfg` (line ~23). This turns the invisible gap into 38 red lines.

3. **`tools/compiler/topic-schema.mjs:63`** — add `['model','answers']` to `NEED_ARRAY`, and change the
   `NEED_ARRAY` check (line 80) from `!Array.isArray(x)` to `!Array.isArray(x) || x.length === 0`, so the
   empty-array → renderer-crash path (§7) becomes a compile error.

4. **Author the content.** 38 topics × 7 missing answers = **266 answers**; 38 × ~56 missing beats =
   **~2,128 beats**. There is no code fix for this — and after steps 1–3, no way to skip it.

## 10. Bottom line

| | |
|---|---|
| Content in the .md and dropped by the parser? | **No.** `parseModel` is uncapped and faithful; `emit.mjs` never touches the model slice. |
| Markdown format incapable of 9 answers? | **No.** Proven: the real parser emits 9 answers / 7 rich beats from md today (§5). |
| Nobody wrote them? | **Yes.** All 38 md files author exactly 2×3. The spec's own example taught 1×2. |

**Attribution: AUTHORING_GAP** (enabled by a doc that documented the floor, and a gate that counts
drill cards but not model answers). **Parser fix recovers 0 items.**
