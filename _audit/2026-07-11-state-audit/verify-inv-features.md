# Adversarial verification — `inv-features` lens

**Verifier stance:** default-refute. Every finding re-checked against the real system — source lines re-opened, runtime claims re-measured with 6 fresh Playwright probes (A–F), git claims re-run. Screenshots in `shots/verify-inv-features/`, scripts in `scripts/verify-inv-features-{A..F}.mjs`.

## Verdict

**14 of 14 findings CONFIRMED.** No ghosts. This is an unusually rigorous original lens — I tried hard to kill these and could not. Zero console errors observed across every probe, matching the original.

**But 3 sub-claims inside otherwise-real findings are WRONG and I corrected them** (see *Refuted sub-claims*). One would have sent the operator hunting the wrong symptom; one would have shipped an incomplete fix.

**2 items the original missed**, both reachability holes I hit while verifying.

---

## A confound that nearly cost me two false refutations

On a **fresh browser the Topic-index overlay auto-opens** (`index-overlay.js:427` — by design, the start screen). `shell.js:82-83` bails out of the global keydown handler whenever any `[role=dialog][aria-modal].open` exists. So **every global shortcut is dead until you dismiss it.**

My first pass measured `d` → no density change and `v` → no navigation, and I was about to refute both findings. They were being *swallowed*. With the overlay dismissed, both work exactly as the original said. **Any runtime keyboard claim in this app must dismiss the start screen first** — probes B vs C in this directory are a controlled demonstration.

This confound is *itself* a finding (see *Missed #1*).

---

## Confirmed — the two P0s (strengthened)

`deep-cram` (`cram-overlay.js:12`) and `deep-scope` (`scope-overlay.js:9`) extend **`HTMLElement`, not `TopicPane`** — no `dataKey`, no `renderTopic()`, no `deeptopicchange` listener. Their bodies are static template literals (`cram-overlay.js:25-86`, `scope-overlay.js:15-47`). Meanwhile `applyIdentity()` (`topic-protocol.js:56`) **does** rewrite the header:

```js
var cramT = q('.cram-title'); if (cramT) cramT.innerHTML = 'Cram sheet &middot; ' + idn.cramTitle;
```

**Measured across 12 topics — the cram body is byte-identical (3,836 chars) on every one, including all 8 hand-authored topics:**

| topic | header | body === Content Pipeline's? |
|---|---|---|
| content-pipeline | Cram sheet · Content Pipeline | YES |
| signing | Cram sheet · Package Signing | YES |
| authz | Cram sheet · Tenant Authorization | YES |
| aws-hardening | Cram sheet · AWS Hardening | YES |
| notifications | Cram sheet · Notifications | YES |
| eav | Cram sheet · Attribute Store | YES |
| desired-state | Cram sheet · Desired State | YES |
| iac | Cram sheet · Infrastructure as Code | YES |
| caching | Cram sheet · Caching Strategies | YES |
| kafka-internals | Cram sheet · Kafka Internals | YES |
| multi-tenant | Cram sheet · Multi-Tenant Isolation | YES |
| saga | Cram sheet · The Saga Pattern | YES |

On **Caching Strategies** the cram sheet's spine step 1 reads `Entry: processUpload(key, bucket), fired by S3 ObjectCreated.` — the per-topic header makes wrong content look authoritative. Scope is the same shape: on `caching` it returns firstQ `"File types & formats?"`, byte-identical to `content-pipeline`.

**Root cause re-verified independently:** `TOPIC_CONTRACT.md:18` lists `cramTitle` and `reportTitle` as identity *strings*. Grepping `tools/compiler/*.mjs` for a cram or scope **body** slice returns nothing (only `cramTitle`, plus unrelated hits for JS variable scope and Shiki highlight scopes). **The data slice genuinely does not exist.**

> **Implementation note the original didn't surface:** `print-qa.js` is the working template for the fix. `buildHtml()` (`:31`) reads `curTopic()` → `TopicRegistry.current()` and produces correct per-topic output — verified: Ctrl+P on `caching` opens a popup titled **"Caching Strategies — Q&A"** with 21 probes. The pattern cram/scope/session-report need already exists in-repo.

---

## Confirmed — everything else

| # | Finding | Sev | How I re-confirmed |
|---|---|---|---|
| 3 | Companion stale on 7/9 views (38 generated topics) | P1 | Registry census: 9/9 `cmpNotes` on **exactly** the 8 named hand-authored topics; **exactly** 38 with walk+drill only; 0 other shapes. Runtime on `caching`: drill→"Probe Drill", then num/wb/trade/model/sys/rf/open **all still say "Probe Drill"** while the stage header correctly reads "ESTIMATE / Numbers". Guard `shell.js:237` confirmed. Shape drift confirmed: generated `cmpNotes.walk[0]` = `"A distributed log, not a queue"` (a thesis) vs hand-authored `"Walkthrough"`. |
| 4 | Session PDF hard-codes Content Pipeline | P1 | Clicked the **real** "Save this session as a PDF →" button on kafka-internals. Rendered `.sr-ttl` = `"Content Pipeline — Session Report"`, footer `"…Content Pipeline deep-rehearsal trainer"` — while `identity.reportTitle` = `"Kafka Internals"` and h1 = "Kafka Internals". `session-progress.js:76` + `:94`. `reportTitle` is required by Zod (`topic-schema.mjs:25`) and read by nobody. |
| 5 | viz: 1/46, V-key dead-end, deep-link loses the topic | P2 | `visual` dataKey on **exactly 1 of 46** (kafka-internals). `kit.js` = 492,945 B of 5,163,186 B = **9.55%**, inlined **verbatim** into dist (byte-checked). V on `caching` → **stranded** on `#caching/viz`, pane `.on`, "This topic has no visual mode.", viz tab `hidden` so **no tab appears highlighted**; still there 1.2 s later. Fresh `#caching/viz` → lands on **`#content-pipeline/walk`** (topic lost); control `#caching/num` → correctly stays on caching. Works on kafka-internals (canvas mounts, `window.__VIZ` live, 0 errors). |
| 6 | Mock/mixed-fire records are global, bleed across topics | P2 | Storage proves it: `ddr.v1.mock.last` has **no topic key** while `ddr.v1.viewseen.<topic>` does. Scored a mock, switched to `multi-tenant`, opened Session progress → *"Probe Drill: Not started — 0 of 21"* (multi-tenant's, correct) sitting next to *"Mock Run: Last run: 6 / 6 in 6:01 · 1 run"* (the global one). `mock-run/data.js:7-8`, `mixed-fire.js:31`. |
| 7 | Copy link on Event-Driven reopens on Content Pipeline | P2 | Clicked the **real** Copy-link button on `event-driven` → clipboard got `index.html#walk` (bare). Re-opened `#walk` in a fresh context → `TopicRegistry.current().id === 'content-pipeline'`, h1 "Content Pipeline". Root cause verified: `register()` (`topic-protocol.js:104`) seeds `cur` = first **registered** (`app.js:8` → content-pipeline); `topicPrefix()`/`setTopic()` (`router.js:57`/`:94`) compare against `ids()[0]` = `TOPIC_ORDER[0]` = **event-driven**. `view-manager.js:51-53` skips the switch when `route.topic` is null. |
| 8 | Progress rail frozen for 6 of 10 views | **P3** ↓ | `railPos` (`shell.js:36`) has 4 of 10 keys; `railEl.style.width = undefined + '%'` = `"undefined%"` → invalid CSS → silently retains the prior value. **Confirmed — but the original's evidence is wrong, see below.** Downgraded P2→P3. |
| 9 | `?` overlay documents the grading keys **inverted** | P2 | Categorical. Buttons: `#jm` = **"✗ Missed [1]"**, `#js` = "~ Shaky [2]", `#jg` = **"✓ Solid [3]"**. Runtime: pressing **`1`** → `dShk`(revisit) 0→**1**, `dGot`(solid) stays 0, revisit set = `["Memory model under streaming"]`. Pressing **`3`** → solid 0→**1**. The overlay (`keyboard-overlay.js:53`) says *"1 2 — In the drill, score the probe — **Solid** or Revisit"*. **`1` is Missed, not Solid**, and `3` is absent. Documented kbds: `[Q W E R T Y U I O ← → Space Enter 1 2 / \ [ ] G D Esc ?]`. **Live but undocumented — all 6 verified firing: `V`, `3`, `F`, `Ctrl+K`, `Ctrl+P`, `P`(cram).** *Mitigating:* the judge row on screen shows the correct `[1]/[2]/[3]` hints at grading time. |
| 10 | Guided tour unreachable on touch | P3 | At 390 px: `#keyopen` class `"crambtn kbd-only"`, computed `display:none`, `offsetParent` null (`styles.css:441`). **Zero** elements anywhere — light **or** shadow DOM — whose text/aria mentions "tour". `keyboard-overlay.js:62` lists `G` as *text*, not a button. `tour-guide.js:8`'s docstring claiming it is "wired to … the keyboard-shortcuts overlay" is **false**. |
| 11 | Density: no UI, not persisted | P3 | (After clearing the confound.) `d,d,d` → `compact → cozy → default`. **0** UI controls anywhere incl. shadow DOM; no `density` store key; `set('compact')` → reload → gone. `shell.js:71`, `:91`. |
| 12 | `identity.total` dead, gate-enforced, wrong | P3 | Registry census returns **exactly two values: `{8: 8 topics, 38: 38 topics}`** — never 46. Zero readers in `src/` (every `.total` hit is whiteboard `st.total`/`wb.total`). Required by Zod at `topic-schema.mjs:16`. `groups.js:20` still says *"the full 37-topic order (23 built + 14 declared-ahead)"* above a **46**-entry array. |
| 13 | Repo cruft | P3 | md5 `6fc92f15288ae4567d1b035db3e98e9c` for **both** `deepdive_content_pipeline_rehearsal.html` and `dist/index.html`, 5,163,186 B. `git log --oneline -- <deliverable> \| wc -l` = **223**. `.git` = **173M**. `_mob_diag.mjs` + `_mob_diag2.mjs` git-tracked, **zero** references anywhere, write to `/mnt/user-data/outputs/` (a sandbox path that doesn't exist here). Branding: `package.json` name, README title, `CPR1` prefix. |
| 14 | Mock clock keeps counting after "Round complete" | P3 | `renderMockEnd()` (`mixed-fire.js:197`) calls `clearInterval(mockClock)` — but `mockClock` is a **rAF handle** (`mock-run/logic.js:51,53`). Measured: at the end screen clock = **0:02**; 3.2 s later, still on the end screen, clock = **0:05**. Still ticking. `closeMockClock()` (`logic.js:77`) has the correct `cancelAnimationFrame`. |

---

## Refuted sub-claims (parent findings still stand — do NOT drop them)

### R1. Rail: *"reads 'complete' from the 4th of 10 views onward"* — **false as a general property**

The original measured `walk→25, drill→50, wb→75, sys→100, trade→100 … open→100 (frozen)` and concluded the rail *falsely reads complete*. That reproduces **only because they clicked the tabs in tab order**. The bar doesn't go to 100% — it **sticks at whatever the last *mapped* view set**.

Fresh load, non-sequential path (probe C):

```
boot(walk)=25%  →  trade=25%  →  open=25%  →  walk=25%  →  rf=25%
```

A user who jumps straight to Trade-offs sees **25%**, not 100%. The rail **under-reports as often as it over-reports** — it's *stale*, not *falsely complete*. The underlying defect (`railPos` has 4 of 10 keys) is **real and confirmed**; only the characterisation — and the P2 severity that rested on "it tells you you're done" — is wrong. **Downgraded to P3.**

### R2. *"F → focus mode (`focus-mode.js:32`)"* — **wrong line**

`focus-mode.js:32` is `btnEl.setAttribute('aria-label', 'Toggle focus mode')`, inside `createButton()`. The actual keydown binding is **`focus-mode.js:55-62`**. F **is** live (verified: `aria-pressed` false→true). Cite only.

### R3. viz: *"the `setTimeout` bounce explains the V-key dead-end"* — **conflates two different bugs, and the proposed fix only addresses one**

The bounce lives in `renderTopic()` (`visual-pane.js:36-39`), which `TopicPane._applyTopic` calls **only on topic change / first paint** — *not* on a same-topic `routechange`. So:

- **Pressing `v` while already on a viz-less topic → `renderTopic` never runs → there is NO bounce at all.** You are simply stranded on the empty pane (verified: 1.2 s later still `#caching/viz`, pane `.on`).
- **Deep-linking `#caching/viz` → `renderTopic` *does* run (first paint) → the bounce fires → `goView('walk')` → and because `topicPrefix()` resolves against the *current* topic (content-pipeline, per finding 7) the **topic is lost**.

These are two defects with two fixes. The original's *"2 lines: gate `tabKeys.v` on `TopicRegistry.current().data.visual`"* fixes **only the keypress**; deep links to `#<viz-less-topic>/viz` would still dump you on Content Pipeline. The bounce must additionally preserve the topic (route to `#<currentTopic>/walk`, not bare `walk`) — which finding 7's fix also happens to cure.

---

## Missed by the original lens

### M1 (P2). The first-run start screen suppresses the only entry to the guided tour

Fresh browser → the Topic-index overlay auto-opens as the designed start screen. `shell.js:82-83` then suppresses **every** global shortcut while any modal is open. Measured on a fresh context:

```
FIRST RUN: {"indexOpen":true,"openModal":["_index-overlay"]}
press G on the start screen  -> tour active: false
press ? on the start screen  -> shortcuts overlay open: false
dismiss the start screen, press G -> tour active: TRUE
```

`G` is the **only** way to start the tour (finding 10). `?` is the **only** place `G` is documented. Both are dead on the screen a first-time user lands on. So a new user has **no in-app path to discover or launch the app's only onboarding** — they'd have to already know to dismiss the start screen and press an undocumented key. This *compounds* finding 10 rather than duplicating it: on mobile the tour has no entry point at all; on desktop its entry point is disabled exactly when it's wanted.

Evidence: `shots/verify-inv-features/F1-first-run-start-screen.png`, `F2-tour-only-after-dismissing-start-screen.png`.

### M2 (P3). Modal-guard inconsistency: F / Ctrl+K / Ctrl+P fire *through* open overlays

`shell.js:82-83` guards its keys against open modals. But `focus-mode.js:55`, `search-overlay.js:370` and `print-qa.js:59` each register their **own** `document` keydown listener with **no such guard**. Verified: with the **cram sheet open**, pressing `F` toggles focus mode **behind the modal** (`aria-pressed` false→true while `cramov` stays `.open`) — chrome disappears underneath an overlay the user is still reading.

Evidence: `shots/verify-inv-features/D4-F-toggles-behind-open-modal.png`. Fix: hoist the shell's open-modal check into a shared helper the three satellite listeners also call.

---

## Evidence index

Scripts: `scripts/verify-inv-features-{A,B,C,D,E,F}.mjs` (run from repo root).
Screenshots: `shots/verify-inv-features/` — `A2-cram-caching-SHOWS-CP-BODY.png`, `A3-scope-caching-SHOWS-FILE-INGEST.png`, `A5-companion-stale-num-says-drill.png`, `B1-sessreport-kafka.png`, `B4-deeplink-caching-viz-lands-elsewhere.png`, `B5-copylink-eventdriven-reopens-as-cp.png`, `C0-boot-index-overlay-open.png`, `C3-vkey-caching-SETTLED.png`, `C4-viz-kafka-works.png`, `C6-mock-bleed-multitenant.png`, `C7-rail-nonsequential.png`, `D1-drill-judge-row-1-missed-3-solid.png`, `D2-after-key1-recorded-revisit.png`, `D4-F-toggles-behind-open-modal.png`, `E1-ctrlP-printqa-popup.png`, `F1-first-run-start-screen.png`, `F2-tour-only-after-dismissing-start-screen.png`.
