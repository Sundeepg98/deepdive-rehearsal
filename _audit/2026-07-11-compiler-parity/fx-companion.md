# FX-COMPANION — the coaching rail (cmpNotes 2/9) and the 64% cross-topic leak

**Lens:** companion / coaching rail. **Verdict on the lens question: the leak is a SYMPTOM of the depth gap. Proven by trigger-set identity, not correlation.**

**But the headline for this lens cuts against the thesis, and the evidence says so plainly: the 266 missing companion notes are MISSING, not DROPPED.** The parser does not eat companion content. Fixing the compiler recovers **zero** companion items. (Other lenses — sys.stages, tier-notes, pivot answers — may well be genuine parser drops; this report claims nothing about them.)

The engineering failure here is real but it is a *different* failure than "the parser is a ceiling": the toolchain **failed to demand the content, failed to demonstrate it in its own worked example, and certified its absence as passing — at four independent layers.**

---

## 1. The reference spec (THE 8)

`src/topics/content-pipeline/identity.js:27-37` — `cmpNotes` is a record of **9 panes** → `[title, note, tip]`:

```js
cmpNotes: {
  walk:[...], drill:[...], wb:[...], sys:[...], trade:[...],
  model:[...], num:[...], rf:[...], open:[...]
}
```

Measured across all 46 topics (`identity.js` eval, all dirs):

| companion panel field | hand-coded 8 | compiled 38 | verdict |
|---|---|---|---|
| `companionTopic` | 1.0/1 | 1.0/1 | **OK** |
| `thesis` (avg chars) | 209.9 | 582.9 | **OK** (the 38 are richer) |
| `spine` (avg bullets) | 4.0 | 4.0 | **OK** (exact parity) |
| **`cmpNotes` (panes of 9)** | **9.0** | **2.0** | **← THE GAP** |

Every note that *exists* is well-formed: **148 notes present, 0 with wrong arity.** The compiler produces correct output for everything it is given. It is not corrupting the companion path — it is under-fed.

## 2. Attribution: AUTHORING_GAP, proven three ways

**(a) The content is not in the markdown.** All 38 files, zero variance:

```
$ awk '/^## Companion Notes/{f=1;next} /^## /{f=0} f && /^### /{print tolower($2)}' src/topics-md/*.md | sort | uniq -c
     38 walk
     38 drill
```

38/38 have exactly `walk` + `drill`. No `wb`/`sys`/`trade`/`model`/`num`/`rf`/`open` companion heading exists in **any** md file in the repo. The content does not exist anywhere, wired or unwired.

**(b) The format CAN express all 9** — so it is not a FORMAT_GAP. `parseCompanion` is generic over `### <key>`. Probe (`probe_companion.mjs`, reproducible):

```
PROBE 1 -- 9 views x 3 paras => keys: walk drill wb sys trade model num rf open
   count: 9 | sys = ["Para 1 for sys.","Para 2 for sys.","Para 3 for sys."]
```

The syntax works today, unmodified. Nobody wrote the content.

**(c) The panes themselves DO have content.** `caching.md` has all 9 pane sections (`## Whiteboard:237`, `## System:262`, `## Trade-offs:288`, `## Model Answers:313`, `## Numbers:331`, `## Red Flags:355`, `## Opener:379`). So the user opens the Whiteboard pane, the pane renders — and the coaching rail beside it talks about **another topic**.

## 3. Root cause of the authoring gap: the golden sample is itself truncated

This is the leverage point, and it has a file and a line.

| file | cmpNotes it contains |
|---|---|
| `src/topics/notifications/identity.js` (hand-coded JS) | **9** — walk drill wb sys trade model num rf open |
| `tools/compiler/samples/notifications.md` (**the golden sample**) | **2** — walk, drill |

**Same topic. The only worked example of the markdown format transcribed 2 of its own 9 companion notes.** Every one of the 38 was authored against that template — which is exactly why all 38 have an identical 2-key shape with zero variance. The template *is* the ceiling.

## 4. The verification apparatus is self-confirming — at four layers

| layer | file:line | why it cannot see a 7/9 gap |
|---|---|---|
| md data-equivalence proof | `tools/compiler/prove_md.mjs:17-18` | asserts **only** `cmpNotes.walk` + `cmpNotes.drill` — precisely the 2 keys that survived the sample's truncation. Its golden JS (`notifications/identity.js`) has all 9 available to assert. It checks 2. |
| assembly proof | `tools/compiler/prove_assembly.mjs:26-27` | identical — only `walk` + `drill`. |
| schema | `tools/compiler/topic-schema.mjs:27` | `cmpNotes: z.record(z.string(), z.array(z.string()))` — a 2-key record passes; no required-pane set, no `.length(3)` arity check. Rubber stamp. |
| contract test | `test/topic_contract.cjs` | **zero** cmpNotes assertions. |
| THE GATE | `test/check_all.py` | **zero** companion checks. |

"compiler_md: 23 pass, 0 fail" is fully compatible with 7 of 9 companion notes missing on 38 topics. The proofs assert exactly the fields where the truncation is invisible.

## 5. THE LEAK — `shell.js:237`, and why it is a symptom

```js
237:     if (TOPIC_CMP_NOTES[tab]) {
238:       if (deskView) deskView.textContent = TOPIC_CMP_NOTES[tab][0];
...
243:       if (mobileMove) mobileMove.textContent = TOPIC_CMP_NOTES[tab][2];
244:     }                                    // <-- NO ELSE
```

`topic-protocol.js:73` swaps the whole map on every topic switch (`TOPIC_CMP_NOTES = idn.cmpNotes;`) then calls `__syncCompanion()`. `shell.js:235-236` are — grep-confirmed — **the only writers of those six DOM nodes in the entire codebase.** So when the guard at :237 falls through, nothing writes and nothing clears: the nodes retain the last topic/pane pair that *had* a note. It does not "fall back" by design; it simply **never writes**. Stale-by-omission.

### Live proof (`leak_proof.cjs`, Playwright, against `dist/index.html`)

```
STEP 1: topic "Content Pipeline", pane "sys"   (a 9/9 hand-coded topic)
   cmpView : "System Map"
   cmpNote : "Zoom out to the six stages — and the exact points an interviewer pivot..."

STEP 2: switched topic -> "Caching Strategies" (compiled, 2/9), still on pane "sys"
   page H1        : "Caching Strategies"
   companion topic: "Caching Strategies"
   cmpView        : "System Map"                                    <-- Content Pipeline's
   cmpNote        : "Zoom out to the six stages — ..."              <-- Content Pipeline's

=> LEAK: CONFIRMED (stale cross-topic coaching)

STEP 3: same topic (Caching), pane "drill" (one of its 2 POPULATED panes)
   cmpView : "Probe Drill"   <- correct, guard passed
```

The page says **Caching Strategies**. The coach says **"Zoom out to the six stages."** Six stages is Content Pipeline's structure. Caching has none. Step 3 isolates the mechanism exactly: same topic, a *populated* pane → renders correctly. Only unpopulated panes leak.

### Trigger-set identity — the numeric proof

The leak fires **iff** `TOPIC_CMP_NOTES[tab]` is falsy — i.e. **iff** the topic lacks a cmpNote for that pane. That is, precisely, the depth gap's missing set.

```
46 topics x 9 panes            = 414 pairs
populated  (8 x 9) + (38 x 2)  = 148
missing    (leak surface)      = 266  =  64.3%
```

**64.3%** — the audit independently measured the leak at **"64% of pairs."** That is not a correlation. It is an **identity**: the leaking pairs *are* the missing-cmpNote pairs, all 266 of them.

**Therefore: the leak has zero independent trigger. It is 100% a symptom of the depth gap.** On the hand-coded 8 (9/9) the else-branch is **dead code** — which is exactly why it survived review for 8 topics and then detonated across 38.

**But it is still an independent defect worth fixing**, for two reasons:
1. It converts a *missing-data* condition into **actively wrong coaching** (topic A's advice under topic B's title) instead of a neutral/empty state. Silently showing another topic's coaching to someone rehearsing for an interview is worse than showing nothing.
2. It stays a loaded gun. Authoring the 266 notes makes it unreachable *today* — but §6's two fail-silent parser bugs mean a single malformed note re-arms it with **no diagnostic**.

## 6. Two live parser bugs — the landmine under the fix

These drop **0 items today** (no md exercises them). They are prophylactic, and they matter *because* the fix is 798 paragraphs of new authoring straight through this code path.

**(a) `parse_md.mjs:73` — silent drop on any note that isn't exactly 3 paragraphs.**
```js
73:       if (buf.length === 3) cmp[key] = buf.map(text);
```
Strict `=== 3`, no else, no throw. Probe 2:
```
PROBE 2 -- walk=3, sys=2, num=4 paras => keys: walk num
   sys survived? false          <-- a 2-paragraph note VANISHES, silently
   num arity: 3 (want 3)        <-- a 4-paragraph note is TRUNCATED, silently
```
An author writing `### sys` with 2 paragraphs gets nothing, no warning, a clean build, a passing gate — and a leak.

**(b) `parse_md.mjs:70` — the companion key is never validated or aliased.**
```js
70:     if (t.type === 'heading_open' && t.tag === 'h3') { key = toks[i + 1].content.toLowerCase(); ... }
```
Probe 3:
```
PROBE 3 -- "### Whiteboard" / "### System Map" => keys: ["whiteboard","system map"]
```
Neither matches the pane ids `wb` / `sys`. The renderer reads `TOPIC_CMP_NOTES['wb']` → `undefined` → **leak**. Compiles clean, passes schema, passes the gate. And the human-readable name is the *natural* thing to write, because the first paragraph of every note **is** the human title ("Probe Drill", "System Map").

**The damning part: the parser already has this exact discipline, 51 lines above the bug, and never wired it into the companion path.**

```js
19: const PANE_KEY = { walk:'walk', drill:'drill', whiteboard:'wb', system:'sys',
20:   'trade-offs':'trade', 'model answers':'model', numbers:'num', 'red flags':'rf', opener:'open', ... };
...
479:       const key = PANE_KEY[name] || name;     // <-- ## headings get aliased
482:       else unknownHeadings.push(b.title);
485:   if (unknownHeadings.length) throw new Error('unknown section heading(s): ...');   // <-- and hard-throw
```

`## Whiteboard` is aliased to `wb` and an unknown `##` heading **throws with a helpful message listing every valid heading**. `### Whiteboard` inside `## Companion Notes` gets neither. The enabler exists. It was not connected. *That* is this lens's instance of the operator's thesis — not a parser that eats content, but a compiler that has the discipline and declines to apply it where it counts.

---

## 7. The fixes

| # | file:line | change | effort | items recovered |
|---|---|---|---|---|
| 1 | `src/scripts/app/shell.js:237-244` | add the `else` — clear/neutral-default the 6 nodes. Never render topic A's coaching under topic B. | **S** | 0 (correctness: kills 266 wrong renders) |
| 2 | `tools/compiler/parse_md.mjs:70` | `key = PANE_KEY[raw] || raw` — reuse the map at :19. Throw on a key outside the 9. | **S** | 0 (prophylactic) |
| 3 | `tools/compiler/parse_md.mjs:73` | throw on `buf.length !== 3` instead of silently dropping/truncating. | **S** | 0 (prophylactic) |
| 4 | `tools/compiler/topic-schema.mjs:27` | require all 9 panes, each a 3-tuple: `z.object({walk: z.tuple([z.string(),z.string(),z.string()]), ...})` — 9 keys. | **S** | 0 (makes the gap *fail the build*) |
| 5 | `tools/compiler/prove_md.mjs:17-18` + `prove_assembly.mjs:26-27` | loop all 9 panes, not 2. | **S** | 0 (de-self-confirms the proof) |
| 6 | `tools/compiler/samples/notifications.md` | **restore the 7 missing companion notes from `src/topics/notifications/identity.js`.** The template is the ceiling — fix it first or every future topic inherits the gap. | **M** | 0 (unblocks all future authoring) |
| 7 | `src/topics-md/*.md` × 38 | author the 7 missing `### <pane>` companion blocks × 3 paragraphs. | **XL** | **0 — this is writing, not recovery** |

**Sequence matters.** Do **4 + 5 + 2 + 3 first** (the schema + proofs + parser strictness). That flips the gap from *invisible* to *build-breaking*, which is what makes the 38-topic authoring pass tractable and verifiable instead of another silent 64%. Then **6** (the template). Then **1** (so the interim state is honest-empty, not wrong-topic). Then **7**, the real cost.

**The honest bottom line for this lens: the compiler is not the ceiling here — the compiler is the reason nobody noticed the ceiling.** 266 notes / 798 paragraphs of expert coaching copy have to be written. No compiler fix produces them. What the compiler fixes buy is that the next 38 topics cannot ship this gap silently.
