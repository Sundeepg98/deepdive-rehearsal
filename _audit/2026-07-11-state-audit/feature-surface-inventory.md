# Feature Surface Inventory — deepdive-rehearsal

**Lens:** FEATURE SURFACE INVENTORY (what exists, where it lives, wired vs orphaned)
**Date:** 2026-07-11
**Artifact audited:** `D:/claude-workspace/deepdive-rehearsal/dist/index.html` (5,163,186 bytes, single-file offline SPA)
**Method:** full source read of `src/scripts/app/**` (57 modules) + `src/topics/**` (46 topics) + 4 Playwright runtime probes against `file://` dist.
**Console/page errors observed across all probes: 0.**

---

## 1. HEADLINE

The **module layer is clean**: all 57 JS modules under `src/scripts/app/` are included in the build and every one has a reachable entry point. There is **no dead code to delete**.

The rot is one layer down, in **data and content**:

- **Two shipped study aids (Cram sheet, Scope it first) render Content Pipeline's content for all 46 topics**, under a per-topic header. 45 of 46 topics show confidently-wrong material.
- **The companion coaching rail goes stale on 7 of 9 views for the 38 compiler-generated topics** — it keeps showing the previous view's coaching.
- **Mock-run / mixed-fire records are global, not per-topic** — a mock scored on Content Pipeline appears as Multi-Tenant's mock in Session progress and in the CPR1 trend code.
- The **`viz` pane** is a designed pilot at **1/46 adoption carrying 493 KB (9.5%) of the payload**.

Everything else — 9 panes × 46 topics, 16 tool entry points, the 15-key persistence layer, export/import, search, bookmarks, notes, spaced repetition, must-hit-points scoring, streaks, weekly goals — is genuinely wired and works.

---

## 2. THE PANES (10)

All ten extend `TopicPane` (`src/scripts/app/topic-protocol.js:126`) and repaint on `deeptopicchange`. Nine are universal; one is not.

| # | Pane | Route | Key | Class : file:line | Data slice | Status |
|---|------|-------|-----|-------------------|-----------|--------|
| 1 | Walkthrough | `walk` | Q | `DeepWalkthrough` — `walkthrough/logic.js:112` | `walk` | WIRED · 46/46 |
| 2 | Probe Drill | `drill` | W | `DeepDrill` — `drill/logic.js:143` | `drill` | WIRED · 46/46 |
| 3 | Whiteboard | `wb` | E | `DeepWhiteboard` — `whiteboard.js:97` | `wb` | WIRED · 46/46 |
| 4 | System Map | `sys` | R | `DeepSystemMap` — `system-map.js:101` | `sys` | WIRED · 46/46 |
| 5 | Trade-offs | `trade` | T | `DeepTradeOffs` — `trade-offs.js:36` | `trade` | WIRED · 46/46 |
| 6 | Model Answers | `model` | Y | `DeepModelAnswers` — `model-answers/logic.js:35` | `model` | WIRED · 46/46 |
| 7 | Numbers (NALSD) | `num` | U | `DeepNumbers` — `num/logic.js:47` | `num` | WIRED · 46/46 |
| 8 | Red Flags | `rf` | I | `DeepRedFlags` — `red-flags.js:45` | `rf` | WIRED · 46/46 |
| 9 | 30-Second | `open` | O | `DeepOpener` — `opener-altitude.js:79` | `open` | WIRED · 46/46 |
| 10 | **Visualize** | `viz` | **V** | `DeepVisual` — `visual-pane.js:7` | `visual` | **PARTIAL · 1/46** |

**Verified at runtime:** `dataKeysPerTopic` = `{drill:46, walk:46, wb:46, sys:46, trade:46, model:46, num:46, rf:46, open:46, bank:46, visual:1}`. The only topic with a visual is `kafka-internals`.

The `viz` tab is `hidden` in markup (`src/index.html:73`) and un-hidden per-topic by `visual-pane.js:32-33`. It genuinely works on kafka-internals (WebGL2 canvas mounts, `window.__VIZ` live) — shot: `shots/feature-surface/EVIDENCE-viz-works-kafka-only.png`.

### Pane feature detail worth knowing
- **Drill** carries the richest machinery: 3-level grading (1=Missed / 2=Shaky / 3=Solid, `drill/logic.js:308`), tier filter (SDE2/SDE3/Staff/EXTEND), study/quick-5/mock modes with a 22-min timer (`:397`), a revisit set, `drillWeak()` re-drill, an interviewer verdict (Strong Hire → No Hire, `recLevel():435`), and **must-hit-points coverage scoring** (`_mustHit():218` parses the `<b>` terms out of each card's own answer + senior tell; the checklist drives a recommendation on the grade buttons at `_updCov():231`). All wired — shot: `shots/feature-surface/drill-must-hit-points.png`.
- **Numbers** is parametric: `d.compute(vals, fmt)` is a per-topic escape hatch (`num/logic.js:119`); per-topic assumption tweaks persist under `num.<id>` with a "Reset to canonical" button.
- **System Map** pivot chips become one-click topic jumps when the chip text carries `(N)` matching another topic's `identity.index` (`system-map.js:75-77`).

---

## 3. TOOLS & OVERLAYS

### 3.1 Tools bar / CTA — 16 entry points (all verified present at runtime)

| Entry | id | Module | Status |
|---|---|---|---|
| Mock run | `#mockopen` | `mock-run/logic.js:34` | WIRED |
| Interviewer cuts in (toggle) | `#inttog` | `session-progress.js:310` | WIRED |
| Tools FAB (mobile sheet) | `#toolsfab` | `shell.js:174` | WIRED |
| Topic index | `#idxopen` | `index-overlay.js:416` | WIRED |
| Search | `#searchopen` | `search-overlay.js:373` | WIRED |
| Copy link | `#copylink` | `copy-link.js` | WIRED (but see F-7) |
| Star this topic | `#starbtn` | `bookmarks.js:20` | WIRED |
| Your notes | `#notesopen` | `notes-overlay.js:130` | WIRED |
| Print Q&A | `#printqa` | `print-qa.js:56` | WIRED |
| One-page cram sheet | `#cramopen` | `cram-sheet.js:32` | **WIRED but WRONG CONTENT (F-1)** |
| Session progress | `#sessopen` | `session-progress.js:305` | WIRED (but see F-4, F-6) |
| Mixed fire | `#mixopen` | `mixed-fire.js:138` | WIRED |
| Game plan | `#planopen` | `cram-sheet.js:73` | WIRED (correctly topic-agnostic) |
| Scope it first | `#scopeopen` | `cram-sheet.js:74` | **WIRED but WRONG CONTENT (F-2)** |
| Keyboard shortcuts | `#keyopen` | `cram-sheet.js:76` | WIRED (hidden <920px, `styles.css:441`) |
| Dark mode | `#themetog` | `cram-sheet.js:97` | WIRED |

### 3.2 Overlays — 7 static + 4 lazily created

Static in DOM: `mockov`, `mixov`, `cramov`, `sessov`, `keyov`, `scopeov`, `planov`.
Created on first open: `_index-overlay`, `_notes-overlay`, the search overlay, the cross-drill overlay.

**Topic-awareness split:**
- `deep-mock-run`, `deep-mixed-fire`, `deep-session` extend `HTMLElement` but read the registry-republished cross-pane globals (`publishBanks()`, `topic-protocol.js:28`) → effectively topic-aware. ✅
- `deep-keyboard`, `deep-gameplan` are app-level and correctly static. ✅
- **`deep-cram` (`cram-overlay.js:12`) and `deep-scope` (`scope-overlay.js:9`) are static template literals about S3/Lambda file ingestion.** ❌ See F-1/F-2.

### 3.3 Features with NO tools-bar entry (reachable, but only sideways)

| Feature | Where it lives | Only entry point |
|---|---|---|
| **Cross-topic drill** / Weak-spot review / Group cram | `cross-drill.js` (`window.CrossDrill`) | **Only inside the Topic index overlay** (`index-overlay.js:346`) — three separate buttons: `[data-cross="1"]`, `="weak"`, `="group:<id>"` |
| **Focus mode** | `focus-mode.js` | A "Focus" button injected into `.hdr` + the `F` key |
| **Text zoom (A− / A+)** | `text-zoom.js:48` | Injected into `.sidebar` above `.mockbar` |
| **Pomodoro 25/5 timer** | `pomodoro.js:98` | Injected into `.sidebar` |
| **Guided tour** | `tour-guide.js` (8 steps, `:21`) | **`G` key only** — see F-9 |
| **Density cycle** | `shell.js:71` (`window.Density`) | **`D` key only, no UI, not persisted** — see F-10 |
| Scroll-to-top FAB | `scroll-to-top.js` | Auto (appears past 400 px) |
| Companion fold / reopen | `companion-fold.js` | `.cmp-fold` / `.cmp-reopen` |
| Storage-degraded banner | `storage-notice.js` | Auto on `storagedegraded` |

---

## 4. PERSISTENCE — the complete `Store` surface

`Store` (`store.js:12`) wraps `localStorage` under prefix **`ddr.v1.`**, with an in-memory fallback and a `storagedegraded` event. **15 key families**, all verified live:

| Key | Scope | Written by |
|---|---|---|
| `progress.<topicId>` | per-topic | `progress.js:45` (on `drillgraded`) |
| `shakymark.<topicId>` | per-topic | `progress.js:19` (cross-drill / mixed-fire) |
| `wbprog.<topicId>` | per-topic | `progress.js:35` (on `whiteboardgraded`) |
| `viewseen.<topicId>` | per-topic | `shell.js:28` (seen-tab dots) |
| `num.<topicId>` | per-topic | `num/logic.js:91` |
| `notes.<topicId>` | per-topic | `notes-overlay.js:25` |
| `bookmarks` | global | `bookmarks.js:11` |
| `nav.last` | global | `last-visit.js:18` (Resume) |
| **`mock.last`** | **global — should be per-topic** | `mock-run/data.js:8` |
| **`mix.log`** | **global — should be per-topic** | `mixed-fire.js:31` |
| `trend.hist` | global, cap 30 | `session-progress.js:113` |
| `goal.weekly` | global | `index-overlay.js:365` |
| `cmp.collapsed` | global | `companion-fold.js:11` |
| `ui.textzoom` | global | `text-zoom.js:43` |
| `theme` | global | `cram-sheet.js:100` (read pre-paint at `index.html:19`) |

**Export / import / reset:** `Store.dump()` / `restore()` / `clearAll()` → the Topic-index footer (`index-overlay.js:205-208`, `downloadBackup():227`, `importBackup():239`). Per-topic reset has a 6-second soft **Undo** (`:257`). The storage-degraded banner also offers Export.

**Not persisted (by design or by omission):** Density, TourGuide dismissal (`tour-guide.js:19` — "in-memory only"), in-flight drill/mock state.

### Progress-derived features (all wired, all in `index-overlay.js`)
- Overall % + probes drilled + topics started (`homeStrip():134`)
- **Study streak** — consecutive days from `trend.hist` dates (`studyStreak():52`)
- **Weekly goal** with ± nudge, Monday-start, auto-resets (`weeklyGoal():119`)
- **Spaced-repetition nudge** — "Refresh · drilled clean a while ago", topics clean but ≥7 days stale (`dueReview():72`)
- **Per-area progress bars** by group (`groupBars():93`)
- **Trend sparkline** (`trendSparkHome():37`, reusing `spark()`/`parseCodes()` from `session-progress.js`)
- **Resume** (via `LastVisit`), **Revisit** (weakest 3 + dropped concepts), **Starred shelf**

---

## 5. KEYBOARD — implemented vs documented

| Key | Does | Documented in the `?` overlay? |
|---|---|---|
| `Q W E R T Y U I O` | jump to the 9 panes | ✅ |
| **`V`** | **jump to `viz`** | ❌ **undocumented** |
| `←` `→` | step the walkthrough | ✅ |
| `Space` / `Enter` | reveal / advance | ✅ |
| **`1` `2` `3`** | **drill: Missed / Shaky / Solid** | ❌ **documented WRONG** — the overlay says *"1 2 — In the drill, score the probe — Solid or Revisit"* (`keyboard-overlay.js:53`). `1` is **Missed**, not Solid; `3` is missing entirely. |
| `/` | search | ✅ |
| **`Cmd/Ctrl+K`** | search | ❌ undocumented (`search-overlay.js:370`) |
| `\` | topic index | ✅ |
| `[` `]` | prev / next topic | ✅ |
| `G` | guided tour | ✅ |
| `D` | density cycle | ✅ (but the feature has no UI and doesn't persist) |
| **`F`** | **focus mode** | ❌ undocumented (`focus-mode.js:32`) |
| **`Cmd/Ctrl+P`** | **Print Q&A** | ❌ undocumented (`print-qa.js:60`) |
| **`P`** | **print (while the cram sheet is open)** | ❌ undocumented (`cram-sheet.js:18`) |
| `Esc` | close any overlay | ✅ |
| `?` | this list | ✅ |

**5 shortcuts undocumented; 1 documented incorrectly.**

---

## 6. FINDINGS

### F-1 · P0 — The Cram sheet shows Content Pipeline's content for all 46 topics
`deep-cram` (`src/scripts/app/cram-overlay.js:12`) extends **`HTMLElement`, not `TopicPane`**. It has no `dataKey`, no `renderTopic()`, and never listens to `deeptopicchange`. Its body is a static template literal (`:25-100`) about S3 → Lambda file ingestion.

Meanwhile `applyIdentity()` (`topic-protocol.js:56`) *does* rewrite the header per topic: `cramT.innerHTML = 'Cram sheet · ' + idn.cramTitle`. So the header is right and the body is wrong — the worst combination, because nothing looks broken.

**Evidence** (`shots/feature-surface/EVIDENCE-cram-caching-shows-content-pipeline.png`): on **Caching Strategies**, the panel header reads **"CRAM SHEET · CACHING STRATEGIES"** while the body reads:
> *The one-liner — Event-driven ingestion: S3 → Lambda → route by type → streaming handler (hash + store + record) → reconciler for partial failures.*
> *1. Entry: `processUpload(key, bucket)`, fired by S3 ObjectCreated.*
> *Ceilings — 10M files/day ≈ 116/s avg · ~1,157/s peak · ~$50/day in PUTs.*

**Structural cause:** `TOPIC_CONTRACT.md` defines 11 data slices (identity, walk, drill, wb, sys, trade, model, num, rf, open, bank). **There is no `cram` slice** — the per-topic data does not exist.

### F-2 · P0 — "Scope it first" shows a file-ingestion checklist for all 46 topics
Same defect class. `deep-scope` (`src/scripts/app/scope-overlay.js:9`) extends `HTMLElement` with a static body (`:15-47`).

**Evidence** (`shots/feature-surface/EVIDENCE-scope-caching-shows-file-ingestion.png`): on **Caching Strategies**, the scoping questions are `["What we're ingesting", "Scale", "Who consumes the output", "Correctness & durability", "Bound it", "Cosmetic vs forking"]` and the first question is **"File types & formats?"** — followed by *"KB configs or GB media?"* and *"Objects per day"*. Verbatim identical to Content Pipeline. No `scope` data slice exists either.

> **Note:** the third `.cs-*` overlay, **Game plan** (`gameplan-overlay.js:9`), is *correctly* topic-agnostic — it's a study-method plan referencing the tool's own surfaces. **Keep it as-is.** Only cram and scope are miscast.

### F-3 · P1 — Companion coaching is stale on 7 of 9 views for the 38 generated topics
`identity.cmpNotes` maps a view id → `[label, note, move]`, consumed by `shell.js:237` (`if (TOPIC_CMP_NOTES[tab])`). When a view has no entry, the block is skipped and **the previous view's coaching stays on screen**.

**Measured across all 46 topics at runtime:**
- **9/9 keys:** exactly the 8 hand-authored topics (`notifications, eav, iac, desired-state, aws-hardening, content-pipeline, signing, authz`)
- **2/9 keys (walk + drill only):** exactly the 38 compiler-generated topics — missing `wb, sys, trade, model, num, rf, open`

**Evidence** (`shots/feature-surface/EVIDENCE-companion-stale-numbers-says-probe-drill.png`): on **Caching Strategies**, with the **Numbers** pane active (nav highlighted, stage header "ESTIMATE / Numbers"), the companion rail still reads **"THIS VIEW: Probe Drill"** with the drill's note and the drill's "move here". Reproduced for all 7 views.

Secondary shape drift: generated topics put a *thesis* string where hand-authored ones put the *view name* — `cmpNotes.walk[0]` is `"A read through the cache"` (caching) / `"A distributed log, not a queue"` (kafka) instead of `"Walkthrough"`. So even the 2 views that *do* have coaching mislabel themselves.

### F-4 · P1 — The session PDF report hard-codes "Content Pipeline"; `identity.reportTitle` is authored 46× and never read
`buildSessReport()` (`session-progress.js:76`) emits `'<div class="sr-ttl">Content Pipeline &mdash; Session Report</div>'` and a footer (`:94`) reading *"Content Pipeline deep-rehearsal trainer"* — both string literals.

**Evidence:** on **kafka-internals**, `document.getElementById('sessreport')` renders title `"Content Pipeline — Session Report"` while `TopicRegistry.current().identity.reportTitle === "Kafka Internals"`.

`reportTitle` is authored by **all 46 topics**, defaulted by the compiler (`tools/compiler/parse_md.mjs:499`), and **required by the Zod schema** (`tools/compiler/topic-schema.mjs:25`) — an orphaned field with a gate enforcing it. The fix is a one-line read; the field is already there.

### F-5 · P2 — The `viz` pane: 1/46 adoption, 493 KB (9.5%) of the payload, and an undocumented key that dead-ends
The visual pipeline is a *deliberate, designed* extension (`VISUAL_PIPELINE.md`) — not an accident. But today:
- `src/scripts/visuals/kit.js` = **492,945 bytes** of a 5,163,186-byte deliverable = **9.5%**, shipped to every user.
- `manifest.json` declares exactly **one** mode (`queue-flow`).
- Exactly **one** topic (`kafka-internals`) uses it.
- The `V` key (`shell.js:89`) is live on **all 46 topics** and is **not in the keyboard-shortcuts overlay**. On the other 45, it lands the user on an empty pane reading *"This topic has no visual mode."* — with **no `Visualize` tab visible** (correctly hidden) and **no tab highlighted** in the nav. Shot: `shots/feature-surface/EVIDENCE-viz-empty-pane-vkey.png`.
- Related boot-order bug: a `#<topic>/viz` deep link for a visual-less topic **loses the topic too**. `file://…/dist/index.html#caching/viz` lands on **`#content-pipeline/walk`** (verified). `DeepVisual.renderTopic()`'s bounce (`visual-pane.js:39`) queues a `setTimeout(…, 0)` during `customElements.define`, which runs **before** the `DOMContentLoaded` → `Router.init()` task, so it rewrites the hash using the boot topic before the deep link is ever parsed.

This is the app's single biggest keep/drop call — see §7.

### F-6 · P2 — Mock-run and mixed-fire records are global, not per-topic, and bleed into Session progress + the trend code
`mock.last` (`mock-run/data.js:8`) and `mix.log` (`mixed-fire.js:31`) are stored with no topic key, and `mockRuns`/`mockLastScore`/`mixLog` are module globals that `TopicRegistry.setTopic()` never resets (it only *closes* in-flight overlays, `topic-protocol.js:80`).

`sessStats()` (`session-progress.js:45`) therefore mixes **the current topic's** live drill/whiteboard with a **global** mock/mixed-fire record.

**Evidence** (`shots/feature-surface/EVIDENCE-mock-bleeds-across-topics.png`): score a 6/6 mock on **content-pipeline**, switch to **multi-tenant**, open Session progress:
```
Probe Drill        Not started — 0 of 21 graded.      <- multi-tenant (correct)
Whiteboard recall  Not started — 0 of 2 graded.       <- multi-tenant (correct)
Mock Run           Last run: 6 / 6 in 0:00 · 1 run    <- CONTENT PIPELINE's mock
Mixed Fire         Not run yet.
```
The exported session code is `CPR1.20260711.0-0-0-21.0-0-2.6-1-0.0-0-0` — multi-tenant's drill (`0-0-0-21`) welded to content-pipeline's mock (`6-1-0`). Since `trend.hist` is built from these codes, **the whole trend/sparkline/streak history is topic-mismatched.**

(Also: the `CPR1` prefix literally means *Content-Pipeline-Rehearsal-1* — a single-topic format now carrying 46 topics' data with no topic field.)

### F-7 · P2 — Copy link on Event-Driven Backbone produces a URL that reopens on Content Pipeline
Two different definitions of "the default topic":
- `TopicRegistry.register()` (`topic-protocol.js:104`) sets `cur` to the **first *registered*** topic = `content-pipeline` (it's first in `src/scripts/app.js:8`).
- `Router.topicPrefix()` / `Router.setTopic()` (`router.js:57`, `:95`) treat **`TopicRegistry.ids()[0]`** as the bare-URL topic — and `ids()` sorts by `TOPIC_ORDER` (`topic-protocol.js:121`), making it **`event-driven`**.

So on `event-driven` the router emits a **bare `#walk`** (no prefix), but a fresh load of bare `#walk` resolves `route.topic = null`, so `ViewManager` never switches topic and you land on the boot topic — **content-pipeline**.

**Verified:** on event-driven, `location.hash === '#walk'`. Fresh page at `#walk` → `TopicRegistry.current().id === 'content-pipeline'`, `h1 === 'Content Pipeline'`.

`Copy link` (`copy-link.js`) copies `window.location.href` verbatim, so sharing Event-Driven Backbone silently sends people to Content Pipeline. (Resume is unaffected — `LastVisit.hash()` always writes an explicit `#<id>/<view>`.)

### F-8 · P2 — The progress rail is dead for 6 of the 10 views
`railPos` (`shell.js:36`) has **4 entries**: `{walk:25, drill:50, wb:75, sys:100}`. For the other six views `railPos[t]` is `undefined`, so `railEl.style.width = 'undefined%'` is rejected as invalid CSS and the bar **keeps its previous value**.

**Measured:** `walk→25%`, `drill→50%`, `wb→75%`, `sys→100%`, then `trade→100%`, `model→100%`, `num→100%`, `rf→100%`, `open→100%` — frozen. The rail claims "done" from the 4th of 10 views onward. It's a 4-view artifact left in a 10-view app.

### F-9 · P3 — The guided tour is unreachable on touch devices
`TourGuide.start()` is bound only to the **`G` key** (`shell.js:87`). Its own docstring (`tour-guide.js:8`) claims it's "wired to the `g` shortcut **and the keyboard-shortcuts overlay**", but that overlay only *lists* `G` as text — there is no button. And the overlay's own launcher is `.kbd-only`, `display:none` below 920 px (`styles.css:441`). **On a phone or tablet there is no way to start the tour.** The 8 tour steps (`tour-guide.js:21`) are the app's only onboarding.

Also: dismissal is in-memory only (`:19`), so the tour is re-offerable every reload — fine, but it means `G` can surprise a returning user.

### F-10 · P3 — Density: no UI, no persistence, undiscoverable
`window.Density` (`shell.js:71`) cycles `default → compact → cozy` via a `data-density` attribute. Verified working (pressing `d` sets `data-density="compact"`). But: **no UI control exists anywhere** (probed: `hasUIControl: false`), and the choice is **not persisted** — it resets on every reload. It is documented in the `?` overlay, which is the only thing keeping it from being fully orphaned. Either give it a control next to Text size (which *does* persist, `ui.textzoom`) and a Store key, or drop it.

### F-11 · P3 — `identity.total` is a dead field, wrong in both variants
Authored by all 46 topics, defaulted by the compiler, and **required by the Zod schema** (`topic-schema.mjs`) — but **read by nothing**. Runtime values: `total: 38` on the 38 generated topics and `total: 8` on the 8 hand-authored ones. Neither is 46. A relic of an 8-topic then 38-topic era, now a gate-enforced lie.

(Same staleness in a comment: `groups.js:20` still says *"the full 37-topic order (23 built + 14 declared-ahead)"* above a 46-entry `TOPIC_ORDER`.)

### F-12 · P3 — Repo cruft and stale single-topic branding
- **`deepdive_content_pipeline_rehearsal.html`** (repo root) is **byte-identical to `dist/index.html`** (md5 `6fc92f15288ae4567d1b035db3e98e9c`). `dist/` is gitignored and this is the intentionally-committed deliverable — but it is a **5.16 MB blob rewritten on every build and committed 223 times**. `.git` is **173 MB**. Keep the committed deliverable (offline open-and-go is the product) but the name is a 46-topic app wearing a 1-topic filename, and the history cost is real.
- **`_mob_diag.mjs`, `_mob_diag2.mjs`** (repo root, tracked): unreferenced Playwright scratch scripts that write to **`/mnt/user-data/outputs/`** — a claude.ai sandbox path that does not exist on this machine. Dead.
- **Stale naming:** `package.json` `"name": "deepdive-content-pipeline-rehearsal"`; `README.md` title *"# Deep-Dive Content-Pipeline Rehearsal"*; the `CPR1` session-code prefix.

### F-13 · P3 — The mock clock keeps counting after "Round complete"
`renderMockEnd()` (`mixed-fire.js:197`) calls `clearInterval(mockClock)` — but `mockClock` is a **`requestAnimationFrame` handle** (`mock-run/logic.js:51,53`). `clearInterval` on a rAF id is a no-op, so `tickMock` keeps rescheduling while the overlay is open.

**Verified:** at the "Round complete" screen the clock read `0:01`; 2.5 s later it read `0:03` — still ticking behind the results. (`closeMock()` does call the correct `cancelAnimationFrame`, so it stops on close, and the *recorded* time is captured before the drift — this is cosmetic, not a data corruption.)

---

## 7. THE BIG KEEP/DROP CALL: the `viz` pane

This is the one that deserves an owner decision, because it's not a bug — it's an unfinished bet.

**The case to KEEP + finish:** it's a deliberately designed pipeline (`VISUAL_PIPELINE.md`), the plumbing is *done and correct* (TopicPane contract, lazy GL mount, single-context dispose, per-topic tab gating, markdown-authored `## Visual` section), and it works on kafka-internals. The marginal cost of topic #2, #3… is a few lines of markdown. The framework cost is already paid and already shipped.

**The case to DROP (or split):** 493 KB — **9.5% of what every user downloads** — currently serves **2% of the content**. The manifest has one mode (`queue-flow`), so topics 2–46 can't reuse it without new modes anyway. And it leaks: an undocumented `V` key dead-ends on 45 topics (F-5), plus a deep-link bug.

**Three honest options:**
1. **Commit** — author `## Visual` for 5–10 more topics in the next content pass; fix the `V`-key dead-end and the deep-link bounce. The 493 KB starts earning its keep.
2. **Park** — strip `kit.js` from the default build behind a flag; ship a separate "visuals" build. Saves 9.5% for everyone today, keeps the code.
3. **Cut** — delete `visual-pane.js`, `viz.html`, the `V` key, the `visual` slice, `kit.js`, and `visual-trainer/`. Recovers 9.5% and one dead-end.

I'd recommend **(1) or (2), not (3)** — the hard part is built and it's the only feature here that differentiates the app. But (1) is only right if visuals are actually going to be authored; otherwise (2) is the honest holding pattern. **Either way, fix the `V`-key dead-end now** — that's a 2-line change (gate `tabKeys.v` on the current topic having a visual) and it's independent of the strategic call.

---

## 8. WHAT'S HEALTHY (don't touch)

- **All 57 modules are wired.** No orphaned module. The `@build:include` graph in `src/scripts/app.js` is complete and every module has a live entry point.
- **The TopicPane contract works.** 10/10 panes repaint correctly on topic switch; the registry's `publishBanks()` → `applyIdentity()` → `deeptopicchange` sequence is clean and the panes are genuinely data-driven.
- **The persistence layer is solid.** Defensive `Store` with in-memory fallback, a degraded-mode banner, full dump/restore, per-topic soft-undo on reset.
- **The progress model is rich and correct** — 4 status levels, group rollups, weakest-topic ranking, whiteboard recall folded into the badge, streaks, weekly goals, spaced-repetition nudges.
- **Accessibility plumbing is real** — `__overlayModal` focus-trap/restore, an ARIA live region for view changes, `aria-modal` auto-discovery in `shell.js:122` so new overlays can't be forgotten.
- **Zero console errors** across every probe (boot, 46-topic registry, all 10 panes, all 11 overlays, WebGL mount, topic switching).

---

## 9. RECOMMENDED ORDER OF WORK

1. **F-1 + F-2** — the cram sheet and scope overlay. This is the highest-value fix in the audit: two study aids are actively teaching the wrong topic to 45/46 topics. Requires adding `cram` + `scope` data slices to the topic contract and converting both to `TopicPane`. (Big, but it's the whole point of the product.)
2. **F-3** — generate `cmpNotes` for all 9 views in the compiler. The companion rail is on screen constantly and is wrong most of the time.
3. **F-4** — one-line: read `identity.reportTitle` in `buildSessReport()`.
4. **F-6** — key `mock.last` / `mix.log` by topic, add a topic field to `CPR1`.
5. **F-5 (the `V`-key half)**, **F-7**, **F-8** — small, self-contained correctness fixes.
6. **F-12** — delete `_mob_diag*.mjs`; rename the deliverable + package.
7. **The `viz` strategic call** (§7) — owner decision, not a bug fix.
