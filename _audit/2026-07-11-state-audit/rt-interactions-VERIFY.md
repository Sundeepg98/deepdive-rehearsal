# Adversarial verification — `rt-interactions` lens

**Verdict: 5 confirmed, 0 refuted, 3 missed.**

I set out to refute this lens and could not. Every finding reproduced against the real
system, several to the exact digit (the P1 store values `{got:19,shk:3,done:22,tot:22}` →
`{got:1,shk:0,done:1,tot:3,revisit:[]}` came out byte-identical on an independent run).
I re-drove the app with 6 fresh Playwright scripts, re-read every cited file, and
re-derived every number from the live `TopicRegistry` rather than trusting the report.

The lens's real gap is not accuracy — it is **coverage of the blast radius**. It found the
mock-run "undefined" but never checked the *other* tool that reads the same corrupt data
(mixed fire), never noticed that opening the mock run **permanently corrupts the canonical
topic bank**, and never traced the `undefined` back to a **one-line compiler off-by-one**
that also prints the literal string `CURVEBALL` as the curveball's name on 38/46 topics.
Its recommended fix for Finding 3 ("guard the assignments in `openMock()`") would leave
**all three** of those defects in place.

---

## Verification method

| Script | Purpose |
|---|---|
| `verify-rt-01-data.mjs` | Re-derive the 38/46 beat-tag census from the live `TopicRegistry` |
| `verify-rt-02-discover.mjs` | Discover real overlay ids / globals from the live DOM (no guessed selectors) |
| `verify-rt-03-mock-mixed.mjs` | Mock-run render + mixed-fire render + canonical-bank mutation probe |
| `verify-rt-04-theme-misparse.mjs` | Curveball `theme`/`cue` misparse census + mock end screen |
| `verify-rt-05-cram-scope.mjs` | Cram/scope body identity + leak/absence scan across 3 topics |
| `verify-rt-06-progress.mjs` | Full 22-probe run → overwrite repro; reload-position check |
| `verify-rt-08-reachable2.mjs` | Which corruption paths are **actually clickable** (real mouse clicks) |
| `verify-rt-09-gradekeys.mjs` | Shortcuts overlay copy vs. what key `1` really records |
| `verify-rt-10-corruption-render.mjs` | End-to-end: does the canonical corruption *render* to the user? |

Zero console/page errors across every run — consistent with the lens's claim.

**Two notes on my own rigour** (both are the exact class of error I was sent to catch):

1. My first reachability pass (`verify-rt-07`) reported the debrief buttons as invisible
   (0×0). That was **my harness bug**, not a finding — the drill pane was `display:none`
   because my `ViewManager.show()` call never activated it, so every rect was zero. I caught
   it (the *tier toggles* also read 0×0, which is impossible), rebuilt the harness to
   navigate by real click and assert `paneOn:true, 591×970`, and re-measured. It would have
   produced a **false refutation of a true finding**.
2. My first screenshots (`mockrun-caching-undefined.png` etc.) caught the **boot Topic-Index
   overlay stacked on top** of the tool overlay — the DOM numbers were sound, but the images
   did not show the defect. Rather than cite them, I rebuilt the shot script
   (`verify-rt-11-shots.mjs`) to dismiss the boot overlay, assert the tool overlay is the only
   open dialog, and **hit-test** the defect text with `elementFromPoint` (`occluded:false`)
   before shooting. **Cite only the `FIXED-*` screenshots.** The superseded ones are left on
   disk but are not evidence.

---

## CONFIRMED (5/5)

### 1. Cram sheet + scope overlay are frozen on Content Pipeline — **P0**

Independently re-measured. Body is **byte-identical across every topic**, while the title
correctly renames:

```
content-pipeline  title="Cram sheet · Content Pipeline"   bodyLen=3836
caching           title="Cram sheet · Caching Strategies" bodyLen=3836
kafka-internals   title="Cram sheet · Kafka Internals"    bodyLen=3836
CRAM bodyLen identical across topics? *** YES — SAME BODY (3836 chars) ***
```

On the **Caching** cram sheet, all six Content-Pipeline markers leak
(`processUpload(key, bucket)`, `S3 ObjectCreated`, `PassThrough`, `MediaConvert`,
`10M files/day`) and **zero** cache terms are present (`cache-aside`, `TTL`, `invalidate`,
`thundering herd`, `eviction`, `hit ratio` → *none*). Scope overlay likewise: identical
2517-char body on all topics, still asking "KB configs or GB media?" and "never inside the
Lambda" while claiming to list "the ones that fork **this** architecture".

Class check confirms the root cause — neither is a `TopicPane`:
```json
{"cramCtor":"DeepCram","cramIsTopicPane":"HTMLElement","cramDataKey":"undefined",
 "scopeCtor":"DeepScope","scopeIsTopicPane":"HTMLElement"}
```
`cram-overlay.js:12` / `scope-overlay.js:9` extend `HTMLElement`, are guarded by
`if (this._built) return;` + a `rendered` one-shot flag, and never subscribe to
`deeptopicchange` — while `topic-protocol.js:56` *does* repaint `.cram-title` per topic.
That title-without-body split is the whole defect.

*Minor discrepancy, not a refutation:* the lens reported `bodyLen=2985`, I measured 3836
(I counted the shadow root's `<style>` prefix; they evidently did not). The load-bearing
claim — **identical across topics** — reproduces.

**Shot (hit-tested, unoccluded): `shots/verify-rt-interactions/FIXED-cram-caching.png`** — header
reads "CRAM SHEET · CACHING STRATEGIES" over a body that opens "Event-driven ingestion: S3 →
Lambda → route by type…" and goes on through `processUpload(key, bucket)`, `S3 ObjectCreated`,
`PassThrough`, `MediaConvert`, "10M files/day ≈ 116/s avg". The real topic (Caching Strategies)
is visible behind the dimmed overlay. Also `cram-kafka.png`, `scope-caching.png`.

### 2. Re-drilling destroys the saved score and the revisit pile — **P1**

Reproduced to the digit, via a **real mouse click on a visible 546×41 button**:

```
STORE baseline: {"got":19,"shk":3,"done":22,"tot":22,"revisit":["Design adaptability",
                 "Format & schema evolution","Compressing the export"]}   status=weak
REAL CLICK on #dweak ("Drill my 3 Revisit probes →")  -> working set: cards=3 of 22
grade ONE probe:
STORE after   : {"got":1,"shk":0,"done":1,"tot":3,"revisit":[]}           status=in-progress
  tot     22 -> 3  *** CORRUPTED ***
  done    22 -> 1  *** REGRESSED ***
  revisit [3 signals] -> []  *** WIPED ***
HOME: {"totDone":22,"totTot":22} -> {"totDone":1,"totTot":3}
      weakest: ["content-pipeline(3)"] -> ["content-pipeline(0)"]
```

Mechanism confirmed at source:
- `drill/logic.js:479` — `getStats() { return { dTot: cards.length, ... , revisit: this.results.filter(r => !r.ok).map(r => r.signal) } }` — `dTot` reads the **live, filtered** `cards` global and `revisit` is derived from `this.results`, which the filter paths just reset to `[]`.
- `progress.js:45` — `Store.set(pkey(id), {...})` — an **unconditional replace** on every `drillgraded`.

**Three independently user-reachable paths**, all verified with real clicks:
| Control | Visible when | Result |
|---|---|---|
| `#dweak` "Drill my 3 Revisit probes →" | on the debrief (546×41) | tot 22→3, revisit wiped |
| `#revdrill` "↻ Drill my 2 flagged probes" | mid-run (200×34) | same |
| `SDE2` tier toggle | **always**, top of the drill | tot 22→3, revisit wiped |

*Repro correction (cosmetic):* the lens's repro attributes the helper copy of `#revdrill`
to the button labelled "Drill my 3 Revisit probes →", which is actually `#dweak`
(`drill/logic.js:352`). `#revdrill` is `display:none` on the debrief (`updRevset()` hides it
once `di === cards.length`, `logic.js:386`). Both buttons exist, both call a reset-and-filter
path, both corrupt. The finding stands unchanged; only the button id in step 3 is off.

Shots: `reach2-01-debrief.png`, `reach2-02-dweak-corrupted.png`, `reach2-03-revdrill-midrun.png`, `reach2-04-tier-corrupted.png`

### 3. Mock run paints a literal "undefined" on 38/46 topics — **P1**

Census re-derived from the live registry — the lens's numbers are **exactly right**:
```
TOTAL TOPICS: 46
no CURVEBALL-tagged beat : 38     no FRAME-tagged beat: 38     missing BOTH: 38
topics w/ >=1 curveball lacking .task: 38
distinct beat-tag shapes:
  38 | [SCALE,DESIGN]
   8 | [FRAME,STRUCTURE,SCALE,FAILURE,CURVEBALL,CLOSE]
       -> notifications eav iac desired-state aws-hardening content-pipeline signing authz
```
Live render on **caching** (`curveIdx=0 frameIdx=0`), hit-tested as genuinely on screen
(`elementFromPoint` → `.mb-task`, `occluded:false`):
```
prog: "Beat 1 / 2"   tag: "CURVEBALL"
cue : "Invalidate on write, and a TTL backstops what you miss"   <- a FRAME BULLET
.mb-task textContent : "undefined"    rect {x:381,y:183,w:518,h:20}   occluded: false
```
The authored beat 1 (`tag:SCALE`, cue "Half a million reads a day behind a cache") is
destroyed. Mechanism confirmed: `topic-protocol.js:34-38` leaves `mockCurveIdx`/`mockFrameIdx`
at their init value `0` when no tagged beat exists; `mock-run/logic.js:39-40` then overwrites
`mockBeats[0]`; `mixed-fire.js:165` string-concatenates `beat.task` raw. No empty
`curveballPool` anywhere, so there is no crash — only silent nonsense.

**Shot: `FIXED-mockrun-caching-undefined-crop.png`** — "Beat 1 / 2 · CURVEBALL", a frame bullet
as the cue, and *undefined* in italics exactly where the task line belongs.

### 4. Shortcuts overlay documents the grade keys wrongly — **P2**

```
SHORTCUTS OVERLAY (?):  keys=["1","2"]  desc="In the drill, score the probe — Solid or Revisit"
  documents key "3"? *** NO ***      mentions "Missed"? false    mentions "Shaky"? false
DRILL'S OWN BUTTONS:  jm="✗ Missed [1]"   js="~ Shaky [2]"   jg="✓ Solid [3]"

User reads "1/2 — Solid or Revisit", presses "1" for Solid:
  recorded level = 1 | ok = false | signal = "Memory model under streaming"
  Solid counter:  0 -> 0   (unmoved)
  Revisit counter: 0 -> 1
  revisit pile = ["0"]
```
Confirmed. **Sharpened characterisation:** the overlay never literally says "1 = Solid", so
"backwards" is a shade strong — but the unimpeachable form is worse in a way that matters:
**both documented keys record a NON-Solid grade, and key `3` — the only key that records
Solid — is undocumented in both the overlay (`keyboard-overlay.js:53`) and the guided tour
(`tour-guide.js:28`).** Ground truth `shell.js:111-113` binds 1→`jm`, 2→`js`, 3→`jg`.
In a self-graded trainer this silently poisons the progress model that drives every
recommendation. Fix is two strings.

Shots: `gradekeys-01-shortcuts-overlay.png`, `gradekeys-02-drill-buttons.png`, `gradekeys-03-after-pressing-1.png`

### 5. In-flight drill position not restored on reload — **P3**

```
PRE  store: {"got":1,"shk":2,"done":3,"tot":22,"revisit":[2 signals]}
PRE  live : di=3 got=1 shk=2 results=3
POST store: {"got":1,"shk":2,"done":3,"tot":22,"revisit":[2 signals]}  <- survived
POST live : di=0 got=0 shk=0 results=0                                 <- restarted at probe 1
```
Confirmed exactly. Agree with the lens that this is defensible in isolation and only matters
because it feeds the P1 path.

---

## MISSED — three defects the lens did not report

### A. Mixed Fire prints the same literal "undefined" — independent of the mock run — **P1**

The lens attributed the `undefined` solely to `openMock()`'s clobber. But **`mxCurve()`
(`mixed-fire.js:18`) reads `cb.task` too**, and mixed fire draws 2 curveballs straight from
`curveballPool` (`mixed-fire.js:51,56`). Since all 38 md-authored curveballs have **no `task`
field at all**, mixed fire prints `undefined` on its own.

Proved on a **fresh page that never opened the mock run**:
```
MIXED FIRE (caching, mock run NEVER opened):
  kind=Curveball   task="undefined"
  prompt="stampede | A celebrity's profile is cached; the key just expired under peak traffic.
          What happens?undefined"
```
**This is why it matters:** the lens's primary recommendation — *"set mockCurveIdx/mockFrameIdx
to -1 … and guard the assignments in openMock()"* — **does not fix this at all.** The root
cause is upstream of `openMock()`: the curveball objects themselves lack `task`.

**Shot: `FIXED-mixedfire-caching-undefined-crop.png`** (hit-tested, `occluded:false`) — "Question
3 / 7 · CURVEBALL" with *undefined* in italics under the prompt. Also `mix-BEFORE-mockrun-clean.png`
for the never-opened-the-mock-run case.

### B. `openMock()` permanently corrupts the CANONICAL topic bank — **P1**

`topic-protocol.js:25-27` carries an explicit invariant comment:

> *"mock-run MUTATES mockBeats in place, so it gets a private deep-ish copy; the canonical
> topic data is never clobbered."*

**That comment is false on 38/46 topics.** `publishBanks()` deep-copies `mockBeats` — but
`curveballPool = b.curveballs.slice()` (line 32) is a **shallow** copy: the objects are
shared references into the canonical bank. `openMock()` then does:
```js
mockBeats[mockCurveIdx] = curveballPool[rand];   // puts the SHARED canonical object into mockBeats
mockBeats[mockFrameIdx].cue = framePool[rand];   // when both idx are 0 -> MUTATES IT IN PLACE
```
When `mockCurveIdx === mockFrameIdx === 0` (exactly the 38 topics), the second line writes a
frame bullet onto the **canonical curveball object**. Measured:
```
canonical curveball cue BEFORE: "stampede | A celebrity's profile is cached; the key just
                                 expired under peak traffic. What happens?"
canonical curveball cue AFTER : "Invalidate on write, and a TTL backstops what you miss"
MUTATED? *** YES ***     survives a topic switch away and back: *** STILL CORRUPTED ***
```
The corruption is **permanent for the session** (`publishBanks` re-slices from the same
mutated objects) and **leaks across tools**. End-to-end user story, verified:

| | Mixed-fire curveball prompt |
|---|---|
| never opened mock run | `"stampede \| A celebrity's profile is cached; the key just expired under peak traffic. What happens?undefined"` |
| **after** opening mock run once | `"Invalidate on write, and a TTL backstops what you missundefined"` |

The authored curveball **question is destroyed and replaced by a frame bullet — a statement,
not a question.** A user who runs a mock and then a mixed fire is drilled on a declarative
sentence. Fix is small: deep-copy on assignment (or guard the indices), and the invariant
the comment already promises is restored.

Shots: `mix-AFTER-mockrun-corrupted.png` vs `mix-BEFORE-mockrun-clean.png`, and
`FIXED-mixedfire-caching-undefined-crop.png` — which captures **all three missed findings in a
single frame**: the label reads `CURVEBALL` (misparse C), the prompt is a frame bullet
(corruption B), and the task line is *undefined* (A).

### C. Compiler off-by-one prints the literal word "CURVEBALL" as the curveball's name — **P2**

`tools/compiler/parse_md.mjs:407`:
```js
if (m === 'curve') return { tag:'CURVEBALL', theme: p[0].trim(), cue: prose(p.slice(1).join(' | ')) };
```
The heading format (documented on line 398) is `### CURVEBALL | <theme> | <cue>`, so `p[0]`
is the **tag token**, not the theme. The general branch one line below (`:409`) gets this
right — `theme: p[1].trim(), cue: prose(p.slice(2)…)`. The curve branch forgets to skip the tag.

Census: **38/46 topics** have `theme === "CURVEBALL"`; the 8 correct ones are exactly the 8
hand-authored topics. The real theme is stranded as a prefix inside the cue:
```
event-driven       theme=["CURVEBALL"]  cue="ordering | Events for one device must be applied in order — how?"
real-time-delivery theme=["CURVEBALL"]  cue="thundering-herd | A deploy restarts your connection servers…"
kafka-internals    theme=["CURVEBALL"]  cue="ordering | You keyed a Kafka topic by user_id…"
saga               theme=["CURVEBALL"]  cue="isolation | Two concurrent sagas both act on the same item…"
(good) notifications themes=["Double-send / retry","Polling meltdown","Offline user","Notification storm"]
```
Three user-visible symptoms on 38/46 topics, all measured live and unoccluded:
1. **Mock-run end screen** (`mixed-fire.js:205`) literally prints:
   `"Curveball this run: CURVEBALL. 1 rotate in — run again for a different one."`
   (`.mb-end-cv`, rect 514×40, `occluded:false`)
2. **Mixed-fire label** (`mxCurve`: `label: cb.theme`) reads `CURVEBALL` instead of `stampede`.
3. Every curveball prompt carries a stray `"ordering | "` / `"stampede | "` prefix.

One-line fix; needs a rebuild.
Shots: `FIXED-mockrun-end-crop.png`, `FIXED-mixedfire-caching-undefined-crop.png`

---

## What I would tell the operator

The lens is trustworthy — take its five findings at face value. But **do not apply its
Finding-3 fix as written.** All of Finding 3, missed-A, missed-B and missed-C share one
root: *the 38 markdown-authored topics were never authored to the shape the mock-run/mixed-fire
runtime expects, and nothing in the build gate checks it.* The durable fix is the one the lens
gestured at only in passing —

1. `parse_md.mjs:407` → `theme: p[1].trim(), cue: prose(p.slice(2).join(' | '))` (one line);
2. normalise curveballs to always carry a `task` (or make the two renderers tolerate its absence);
3. deep-copy in `publishBanks`/`openMock` so the canonical bank is never mutated;
4. **add a `topic_contract` gate assertion** that every topic's `mockBeats` carry a FRAME and a
   CURVEBALL beat and that every beat/curveball has a `task` — `TOPIC_CONTRACT.md` currently
   specifies nothing about `bank.js`'s internals, which is precisely why 38 topics drifted.

Item 4 is the one that stops this class of bug from coming back.
