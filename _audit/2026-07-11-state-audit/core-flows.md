# Lens: CORE INTERACTION FLOWS (Playwright)

**Date:** 2026-07-11
**Target:** `file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html` (5.1 MB single-file offline SPA, 46 topics)
**Method:** 10 Playwright scripts driving the real DOM (selectors discovered from the live app, never guessed). Every claim below is backed by a measured value, a code reference, and/or a screenshot.
**Scripts:** `_audit/2026-07-11-state-audit/scripts/core-flows-*.mjs`
**Screenshots:** `_audit/2026-07-11-state-audit/shots/core-flows/`

**Console/page errors observed across every run: 0.**

---

## Headline

The thing I was sent to break — **the TopicPane refactor** — is the healthiest part of the app. I could not make a pane render stale content. **810 (topic-pair × pane) combinations, text-node granularity, zero leaks.**

The failures are all in the surfaces the refactor *didn't* reach: the two overlays that are still plain `HTMLElement` with hard-coded single-topic bodies, the progress snapshotter, and the mock-run beat seeding.

---

## CERTIFIED HEALTHY

### Topic switching / TopicPane contract — clean
`core-flows-01-topicswitch.mjs`, `core-flows-10-stale-rigorous.mjs`

- All 10 panes are `TopicPane` subclasses with shadow roots, built at boot.
- Across 10 topics × 9 panes, I derived each pane's **invariant skeleton** (text fragments common to every topic's render), then checked every topic-pair for any *topic-specific* fragment of topic A surviving into topic B's render.
- **810 combinations checked → 0 leaks.**
- Round-trip `content-pipeline → caching → kafka → rate-limiting → saga → content-pipeline`: all 9 panes byte-identical to the original render.
- Light-DOM identity (`h1`, thesis, spine, locator, cram title, topic-nav pill) is unique per topic — no duplicates across 10 topics.
- Drill state resets cleanly on switch (`di=0, got=0`) and the previous topic's saved progress is preserved separately.

### Drill mechanics — work
`core-flows-03-drill.mjs`

- Reveal chain: 3 stages (answer → follow-up → senior tell + speak line).
- **Must-hit-points checklist renders and scores**: ticking points updates `Covered N / M` live and moves the recommendation (`none covered — Missed` → `dropped 1 — Shaky` → `all covered — Solid`), highlighting the matching grade button via `.j-rec`.
- Grading via buttons and via keys 1/2/3 both work; Solid/Revisit/Left counters, progress bar, revisit strip, and flagged nav chips all update.
- `Space`/`Enter` advance the reveal chain.

### Keyboard — works (10/10 view keys, no dead keys, no collisions)
`core-flows-05-keyboard.mjs`, `core-flows-05b-keyboard-fix.mjs`, `core-flows-05c-tour-and-gradekeys.mjs`

- `q w e r t y u i o v` → all 10 panes. Pane, seg button, hash, and `document.title` all correct. Swap latency 4–153 ms.
- Walkthrough `←`/`→` step correctly and **clamp at both bounds** (15× Right stops at step 9/9; 15× Left stops at 1/9).
- `?` shortcuts, `/` search, `\` index, `[`/`]` topic step, `d` density cycle, `g` tour, `Esc` close — all live.
- Global keys are correctly **suppressed while any overlay is open** (pressing `w` with the shortcuts overlay open does not switch panes).
- No collision between grade keys (1/2/3) and view keys.
- *(An earlier apparent "e"/"o" mismatch was my own 320 ms sampling landing mid view-transition — not a bug. Likewise "g" only appeared dead because an overlay was open, which is correct suppression.)*

### Search — excellent
`core-flows-06b-search-fix.mjs`

| Query | Result |
|---|---|
| `caching` | Caching Strategies **first** (5 hits) |
| `cache invalidation` (multi-word) | 1 precise hit |
| `rate limit token bucket` (4 tokens) | Rate Limiting |
| `thundering herd` (body term) | Load Balancing, Device Fleet Dispatch |
| `bloom filter` (body term) | Probabilistic Data Structures |
| `drill` | Probe Drill (**VIEW** axis, separate section) |
| `circut braker` (typo) | "No results found" → **Did you mean: Circuit Breaker** |
| `cachng` (typo) | **Did you mean: Caching Strategies** |
| `idempotncy` (typo) | **Did you mean: Idempotency** |
| `zzzzqqq` | clean "No results found" empty state |

Exact-title topics rank first in every case tested. Enter navigates cross-topic correctly (`#consistent-hashing/walk`).

### Persistence, theme, export/import — work
`core-flows-03-drill.mjs`, `core-flows-07-*.mjs`, `core-flows-09-export-import.mjs`

- Drill grades snapshot to `localStorage` (`ddr.v1.progress.<topic>`) and **survive reload**.
- Theme: toggle → `data-theme=dark`, `Store.theme="dark"`, `aria-pressed=true`, body bg `rgb(21,20,26)`; **survives reload** with the toggle state intact.
- Export → real `deepdive-rehearsal-backup.json` download (576 B, correct envelope `{app,v,exported,data}`), **zero keys missing**.
- Wipe → Import → **byte-identical round-trip** of progress, theme, bookmarks; confirm dialog + reload as designed.

### Whiteboard, Mock Run timer, Mixed Fire — work
`core-flows-07b-mock-mixed-wb.mjs`

- Whiteboard: 9 steps, **"Drew it" correctly gated `disabled` until Reveal**, count line + verdict + "Reset the N misses", persists to `Progress.wbGet` (`{got:7, missed:2, total:9}`).
- Mock run clock ticks (0:00 → 0:04 over 3 s, `requestAnimationFrame` drift-free).
- Mixed fire is topic-aware (no content-pipeline term leakage into the caching run).

---

## FINDINGS

### P0 — Cram sheet body is frozen on Content Pipeline for all 46 topics (title lies)

`src/scripts/app/cram-overlay.js:12` — `class DeepCram extends HTMLElement` (**not** `TopicPane`), guarded by `if (this._built) return;` + a `rendered` one-shot flag, with the entire body as a **hard-coded Content Pipeline template literal**. It never subscribes to `deeptopicchange`.

Meanwhile `applyIdentity()` (`src/scripts/app/topic-protocol.js:60`) *does* update `.cram-title` from `idn.cramTitle`. So the header renames itself per topic while the body underneath never changes.

**Measured** (`core-flows-02-overlays-stale.mjs`):
```
content-pipeline  title="Cram sheet · Content Pipeline"   bodyLen=2985
caching           title="Cram sheet · Caching Strategies" bodyLen=2985
BODY IDENTICAL ACROSS TOPICS? YES

content-pipeline-only strings leaking into the CACHING cram sheet:
  LEAK "processUpload(key, bucket)"   LEAK "S3 ObjectCreated"   LEAK "PassThrough"
  LEAK "reconciler sweeps orphans"    LEAK "MediaConvert"       LEAK "10M files/day"
caching words that SHOULD be there:
  ABSENT "cache-aside"  ABSENT "TTL"  ABSENT "invalidate"  ABSENT "thundering herd"  ABSENT "eviction"
```

**Screenshot:** `shots/core-flows/cram-caching.png` — header reads **"CRAM SHEET · CACHING STRATEGIES"** above "Event-driven ingestion: S3 → Lambda → route by type…".

This is the worst failure mode for a learning tool: it silently serves the *wrong* content under a *correct-looking* label. The **Print** button prints it too. There is no per-topic cram slice in `TOPIC_CONTRACT.md`'s 11 data slices, so the content was never authored — the overlay is a leftover single-topic artifact that the topic axis grew past.

**Same bug class:** `src/scripts/app/scope-overlay.js:9` — `DeepScope extends HTMLElement`, one-shot, body is pure file-ingestion scoping ("What we're ingesting", "File types & formats?", "Size — KB configs or GB media?", "never inside the Lambda", "Can we ever drop an upload?") while asserting *"Here are the ones that fork **this architecture**"*. On Caching / Rate Limiting / Leader Election those questions are simply wrong. Screenshot: `shots/core-flows/scope-caching.png`.
*(`DeepGameplan` is the same one-shot pattern but its content is genuinely topic-agnostic study advice — no defect.)*

**Recommendation:** convert `DeepCram` and `DeepScope` to `TopicPane` and add `cram` / `scope` data slices to the topic contract. Until authored, gate the overlays off (or show the topic's `thesis` + `spine`) rather than showing another topic's notes.

---

### P1 — Re-drilling a topic silently destroys its saved score and revisit pile

`src/scripts/app/progress.js:44-50`:
```js
function snapshot() {
  var id = curId(), d = drillOf();
  var s = d.getStats();
  if (!s || !s.dTot) return;
  Store.set(pkey(id), { got: s.dGot, shk: s.dShk, done: s.dDone, tot: s.dTot, revisit: s.revisit || [], ts: Date.now() });
}
document.addEventListener('drillgraded', function () { snapshot(); });
```
It persists the **live working set** unconditionally on every grade. But `setMode()` / `setTier()` / `drillWeak()` / `drillRevset()` (`src/scripts/app/drill/logic.js:363-425`) all reset `got/shk/results` to 0 **and replace `cards` with a filtered subset**. There is no merge, no high-water mark, and no guard that the live run is the canonical full set. The record is *last-partial-run-wins*.

**Repro — the app's own recommended next action destroys the data** (`core-flows-04b-overwrite-paths.mjs`):

1. Complete a full 22/22 drill → `{got:19, shk:3, done:22, tot:22, revisit:[3 signals]}`, status `weak`.
2. Click the drill's own **"Drill my 3 Revisit probes →"** button (the app tells you to: *"You flagged 3 probes to revisit. Re-drill them until the signal comes automatically."*).
3. Grade **one** probe.

```
BEFORE: {"got":19,"shk":3,"done":22,"tot":22,"revisit":["Irreversible-decision foresight",
         "Reconciler correctness under concurrency","Blast radius when down"]}  status=weak
AFTER : {"got":1,"shk":0,"done":1,"tot":3,"revisit":[]}                          status=in-progress

tot (the topic's probe count!) : 22 -> 3    *** DENOMINATOR CORRUPTED ***
done                           : 22 -> 1
revisit pile                   : 3 signals -> 0 signals   *** WIPED ***
home rollup now reads          : 1/3 probes, 1% of curriculum
```

Same corruption via **tier filter** (`tot: 22 → 3`) and **Quick 5** (`tot: 22 → 5`), and plain "run again" (`done: 22 → 1`) — `core-flows-04-progress-overwrite.mjs`.

**Downstream blast radius** — the home/index (`index-overlay.js:160-166`) reads `Progress.summary()`:
```
home "Your progress": "2% of the curriculum · 22 probes drilled"  ->  "0% of the curriculum · 1 probes drilled"
home Revisit chips  : ["Content Pipeline3"]  ->  ["Content Pipeline"]
home weak concepts  : ["Irreversible-decision foresight","Reconciler correctness under concurrency",
                       "Blast radius when down"]  ->  []
```
The app's entire guidance system — *what you're weak on and what to drill next* — is erased by the act of drilling. Screenshots: `overwrite-01..07*.png`.

**Recommendation:** make `snapshot()` merge rather than replace: keep `tot` from `_allCards.length` (never the filtered subset), union the revisit set, and only advance `done`/`got` as a high-water mark — or write filtered/partial runs to a separate `session.*` namespace and reserve `progress.*` for full canonical runs.

---

### P1 — Mock run destroys beat 1 and paints a literal "undefined" on 38 of 46 topics

`src/scripts/app/mock-run/logic.js:39-40`:
```js
mockBeats[mockCurveIdx] = curveballPool[Math.floor(Math.random() * curveballPool.length)];
mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];
```
`mockCurveIdx` / `mockFrameIdx` are seeded in `publishBanks()` (`src/scripts/app/topic-protocol.js:32-36`) **only when a beat carries `tag === 'CURVEBALL'` / `'FRAME'`** — otherwise they keep their initial value **`0`**.

**38 of 46 topics have only `[SCALE, DESIGN]` beats.** So `mockBeats[0] = curveballPool[rand]` **overwrites the authored first beat** with a curveball object — and a curveball has `{tag, theme, cue, model}` with **no `task` field**, which the renderer reads → `.mb-task` prints the string `"undefined"`.

**Measured** (`core-flows-08-mockbeat-clobber.mjs`, `core-flows-08b-mockbeat-visual.mjs`):
```
topics total                           : 46
topics with NO 'CURVEBALL'-tagged beat : 38   -> beat 1 clobbered
topics with NO 'FRAME'-tagged beat     : 38   -> beat 1's cue overwritten
curveball objects carry a 'task' field?: false

caching:
  authored beat 1 : tag=SCALE  cue="Half a million reads a day behind a cache"   <- NEVER SHOWN
  LIVE beat 1     : tag=CURVEBALL  (beats in run: 2)
  .mb-task on screen: "undefined"  VISIBLE=true rect={x:381,y:206,w:518,h:20}

CONTROL content-pipeline: beats=6 tags=[FRAME,STRUCTURE,SCALE,FAILURE,CURVEBALL,CLOSE]
  .mb-task = "Frame the scope in one line, then give your one-sentence version."   (correct)
```

**Screenshot:** `shots/core-flows/mockrun-undefined-caching.png` — the Mock Run panel shows *Beat 1 / 2 · CURVEBALL*, the cue, and **"undefined"** in italics where the task line belongs.

"Mock run — the full round, on the clock" is the app's flagship top-level CTA. On 83% of topics it opens a 2-beat run whose first beat is a garbage beat displaying `undefined`, and the authored SCALE beat is never reachable.

**Recommendation:** in `publishBanks()`, set `mockCurveIdx = -1` when no CURVEBALL beat exists and guard the assignments in `openMock()` (`if (mockCurveIdx >= 0)`), or normalize curveballs to carry a `task`. Best: append the curveball as an extra beat instead of overwriting an authored one. A `topic_contract` gate assertion (every topic's `mockBeats` carries a FRAME + a CURVEBALL) would have caught this at build time.

---

### P2 — The shortcuts overlay and the guided tour document the grade keys *backwards*

`src/scripts/app/keyboard-overlay.js:53`:
```html
<div class="ks-row2"><span class="ks-keys"><kbd>1</kbd><kbd>2</kbd></span>
  <span>In the drill, score the probe &mdash; Solid or Revisit</span></div>
```
`src/scripts/app/tour-guide.js:28`: *"Graded follow-ups with self-assessment. Press Space to reveal, **1/2 to grade**."*

But `src/scripts/app/shell.js:100-104` binds a **three-level** scale, and the drill's own buttons confirm it:
```
jm = ✗ Missed [1]      js = ~ Shaky [2]      jg = ✓ Solid [3]
```

**Measured** (`core-flows-05c-tour-and-gradekeys.mjs`) — a user reads *"1/2 — Solid or Revisit"* and presses **1** intending Solid:
```
RESULT: level=1  ok=false  -> Solid counter=0, Revisit counter=1
The probe was recorded as MISSED — the opposite of what the docs promised.
It was ALSO added to the revisit pile: ["Memory model under streaming"]
key "3" -> level=3 ok=true  (the ONLY key that records Solid — undocumented in both places)
```

This is stale copy left behind by the R5 refactor that added the third level (`drill/logic.js:305` comment: *"R5: level is 1 (missed) / 2 (shaky) / 3 (solid)"*). In a self-graded active-recall trainer, an inverted grade key silently poisons the progress model that drives every recommendation. Screenshot: `shots/core-flows/gradekeys-01-buttons.png`.

**Recommendation:** one-line fix — `<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>` → "score the probe — Missed / Shaky / Solid", and update the tour string.

---

### P3 — In-flight drill position is not restored on reload

`core-flows-03-drill.mjs`: graded 3 probes (at Probe 4/22), reloaded → `Progress.get()` survived intact, but the live drill restarts at `di=0, got=0, results=0`. The aggregate is saved; the *position* is not. Defensible as designed (`progress.js` header: *"merely visiting a topic (which resets the live drill) never overwrites the saved progress"*), and low-cost as-is — but it is the mechanism that makes the P1 overwrite so destructive, so it's worth revisiting together with that fix.

---

## Evidence index

| Script | Covers |
|---|---|
| `core-flows-00-discover.mjs` | DOM/selector discovery, 46 topics, 10 TopicPanes, 0 boot errors |
| `core-flows-01-topicswitch.mjs` | stale matrix, 5 topics × 9 panes, round-trip |
| `core-flows-02-overlays-stale.mjs` | **cram / scope / gameplan staleness** |
| `core-flows-03-drill.mjs` | reveal → must-hit → grade → persist → reload → topic switch |
| `core-flows-04-progress-overwrite.mjs` | **complete run destroyed by one grade** |
| `core-flows-04b-overwrite-paths.mjs` | **revisit-redrill / tier-filter / quick-5 corruption** |
| `core-flows-05*.mjs` | keyboard, walkthrough arrows, tour, **grade-key inversion** |
| `core-flows-06b-search-fix.mjs` | search ranking, multi-word, did-you-mean |
| `core-flows-07*.mjs` | whiteboard, mock timer, mixed fire, theme persistence |
| `core-flows-08*.mjs` | **mock-run beat clobber, 38/46 topics, "undefined"** |
| `core-flows-09-export-import.mjs` | export/import byte-identical round-trip |
| `core-flows-10-stale-rigorous.mjs` | **810-combination stale certification, 0 leaks** |
