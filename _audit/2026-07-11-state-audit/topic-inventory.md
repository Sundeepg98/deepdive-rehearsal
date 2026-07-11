# LENS: TOPIC INVENTORY — deepdive-rehearsal (2026-07-11)

Ground truth = the RUNTIME `TopicRegistry` in `dist/index.html`, cross-checked against source.
Raw dump: `_audit/2026-07-11-state-audit/topic-inventory.json`. Scripts: `./scripts/*.mjs`.

---

## 1. The 46-vs-38 discrepancy: RESOLVED

There is no missing content. **46 = 38 + 8**, from two different authoring systems:

| Source | Count | Where | How it registers |
|---|---|---|---|
| **Markdown, compiled at build** | **38** | `src/topics-md/*.md` → `src/topics/_generated/<id>/` | `compileTopicsPlugin` (`tools/compiler/compile.mjs`), wired via `src/topics/_generated-registry.js` |
| **Legacy hand-written JS dirs** | **8** | `src/topics/<id>/` (11 slices + `register.js`) | 8 explicit `@build:include` lines, `src/scripts/app.js:8-15` |

The 8 legacy topics are: `content-pipeline`(1), `signing`(2), `authz`(3), `aws-hardening`(4),
`notifications`(5), `eav`(6), `desired-state`(7), `iac`(8) — i.e. topic indices 1–8, the
originals. Everything from index 9 up is markdown.

Runtime confirms: `TopicRegistry.ids().length === 46`, `TOPIC_ORDER.length === 46`, zero
ids missing from either side, zero page errors. The Topic Index overlay renders
"46 TOPICS ACROSS 6 GROUPS". Groups: Messaging & Events 7, Data & Storage 10,
Reliability & Observability 8, Platform & Infra 11, Architecture & APIs 7, Security & Tenancy 3.
Total drill cards across the app: **971**.

## 2. The headline: there are TWO content classes, and 38 of 46 topics are the thin one

Every measurable pane except `drill` is 2–5x thinner in the 38 markdown topics. Averages,
measured from the live registry:

| Pane slice | legacy (n=8) | markdown (n=38) | markdown as % of legacy |
|---|---|---|---|
| `drill.cards` | 21.5 | 21.0 | **98%**  ← the only gate-enforced pane |
| `walk.steps` | 9.0 | 4.0 | 44% |
| `wb.steps` | 9.0 | 2.0 | 22% |
| **`sys.stages`** | **6.0** | **0.0** | **0%** |
| `sys.pivots` | 7.0 | 2.0 | 29% |
| `trade.decisions` | 7.0 | 3.0 | 43% |
| `model.answers` | 9.0 | 2.0 | 22% |
| `num.inputs` | 4.0 | 3.0 | 75% |
| `rf.flags` | 9.0 | 3.0 | 33% |
| `open.cards` | 2.0 (open + close) | 1.0 (open only) | 50% |
| `bank.curveballs` | 8.0 | 1.0 | 12.5% |
| `bank.mockBeats` | 6.0 | 2.0 | 33% |
| `identity.cmpNotes` | 9/9 panes | **2/9 panes** | 22% |

**The one pane the contract gate measures (`drill`, `>= 18` cards) is the one pane where the
38 match.** Every unenforced pane is a fraction of the reference depth. `test/topic_contract.cjs`
only checks `if (!data[v])` — truthiness — so `{stages: [], pivots: [...]}` passes. The gate
cannot see empty arrays, and the content is exactly as deep as the gate forces it to be.

Tier split: all 38 markdown topics are a flat **7/7/7** (SDE2/SDE3/Staff). `TOPIC_CONTRACT.md:26`
names the canonical split as **5/11/5** (SDE3-weighted, which is the actual interview target).
Only the 8 legacy topics follow it. The gate only requires `>= 3` per core tier, so 7/7/7 passes.

## 3. The System Map pane is BROKEN on all 38 markdown topics — one root cause, three defects

`caching.md:266-272` (and the equivalent in all 38 files) authors the stage chain like this:

```markdown
### Where it sits

Client / CDN: fast, per-user or edge, hard to invalidate
App-local cache: in-process, fastest shared-nothing, per-instance
Shared cache (Redis): consistent across instances, a network hop [*]
Source of truth: the database the cache shields
Fallback path: reads go here when the cache misses or is down
```

The `[*]` is the compiler's "you are here" marker (`tools/compiler/parse_md.mjs:208`). **All 38
files carry exactly one `[*]`** — the authors wrote the chain deliberately, in the intended
grammar. But `parseSys` only fills `stages` from a `bullet_list_open` token
(`parse_md.mjs:203`). These are plain lines, so markdown-it folds them into a single
**paragraph**, which then hits the `paragraph_open` branch (`parse_md.mjs:218`) where — with
`mode === 'stages'` and `piv === null` — **no branch matches and the content is silently
dropped**. Adding a leading `- ` to each line would fix all 38.

Consequences, all measured at runtime (`scripts/sys-pivot.mjs`, `scripts/topic-shots.mjs`):

**(a) The stage chain is empty.** `caching/sys`: `.stg` count = **0**, `#smChain` height =
**0px**. `content-pipeline/sys` (legacy): 6 stages, 364px. The "Where it sits" card renders as
a heading + one line of intro over dead space.
Shot: `shots/topic-inventory/sys-markdown-caching.png` vs `sys-legacy-content-pipeline.png`.

**(b) The pivot answer is crammed into the summary chip; the disclosure body is empty.** Same
lazy-continuation cause — the `-> chip` line and the answer paragraph become one paragraph, so
`parse_md.mjs:222` assigns the whole blob to `piv.chip` and `piv.a` stays `""`. Measured:

| topic | chip text | disclosure body (`.pa`) |
|---|---|---|
| `content-pipeline` (legacy) pivots 1–7 | 9–19 chars (a label) | 231–460 chars (the answer) |
| `caching` (markdown) pivot 1 | **323 chars** | **0 chars** |
| `caching` (markdown) pivot 2 | **287 chars** | **0 chars** |

The chip's `scrollWidth` is 1555px inside a ~590px card — it renders as one long line clipped at
the card edge, so **the answer is literally unreadable**, and expanding the `<details>` reveals
an empty body (the UI shows `— bridge:` followed by nothing).
Shot: `shots/topic-inventory/sys-pivots-expanded-markdown-caching.png`.

**FIX FOR (a) AND (b) — VERIFIED, not speculated.** Both are pure-markdown shape bugs; no code
change is needed. Running the real compiler (`tools/compiler/parse_md.mjs`) over `caching.md`
with two edits — prefix the 5 stage lines with `- `, and put a blank line between the `-> chip`
line and its answer paragraph (`scripts/verify-fix.mjs`, touches no tracked file):

| | as authored (shipping) | with the fix |
|---|---|---|
| `sys.stages` | **0** | **5** (and `[*]` correctly yields `cur:true` on "Shared cache (Redis)") |
| `sys.pivots[0].chip` | 323 chars (the whole answer) | **70 chars** (just the label) |
| `sys.pivots[0].a` | **0 chars** | **258 chars** (the answer, in the disclosure body) |
| every other slice | — | **byte-identical** (only `sys` changes) |

All 38 files share the identical shape (each has exactly one `[*]`; all 38 have every pivot with
`a === ""` — 76 pivots total), so the same two edits apply mechanically across the set.

**(c) The right-hand coaching rail shows ANOTHER TOPIC'S copy.** The 38 markdown topics have
`identity.cmpNotes` for only `walk` and `drill` (2 of 9 panes). `src/scripts/app/shell.js:237`
is:

```js
if (TOPIC_CMP_NOTES[tab]) {
  ...write the rail...
}
// <- no else: the rail silently keeps whatever text was there before
```

With no `else`, an uncovered pane leaves the rail showing the last thing written. Two
manifestations, both reproduced (`scripts/cmpnote-leak2.mjs`):

- *Wrong pane*: **21/27** sampled pane-views on markdown topics show that topic's **drill**
  note instead of the pane's own. On `caching/sys` the rail heading reads "Probe Drill".
- *Wrong topic*: read topic A's System Map, switch to topic B (staying on `sys`) — the rail
  **never updates**. 3/3 reproduced. On **"Caching Strategies"** the rail reads, verbatim:

  > **System Map** — "Zoom out to the six stages — and the exact points an interviewer pivots."
  > **The move here:** Lead with the flow, not the boxes — "upload lands, dispatch routes, sinks fan out."

  That is `content-pipeline/identity.js:31` — the **Content Pipeline** topic's coaching copy,
  displayed while rehearsing Caching. It promises "the six stages" on a pane whose stage chain
  is empty. Scope: 38 topics x 7 uncovered panes = **266 pane-views**.
  Shot: `shots/topic-inventory/cmpnote-leak-caching-sys.png`.

## 4. The Visual pipeline serves exactly ONE topic

`## Visual` appears in **1 of 38** markdown files: `kafka-internals.md:445`. It is the only
topic with `data.visual` at runtime; the `viz` tab is `hidden` on the other 45 (verified:
`kafka-internals` → `hidden:false`, `caching` → `hidden:true`). `manifest.json` declares exactly
one mode, `queue-flow`. So the whole three.js `visual-trainer/` sub-app + the **492KB**
`src/scripts/visuals/kit.js` (~10% of the 5.1MB payload) ship to serve one topic's two stories.

## 5. What is genuinely healthy (do not "fix" these)

- **Placeholder text: zero.** Scanned all 38 `.md` for TODO/FIXME/TBD/lorem/PLACEHOLDER/XXX —
  no hits. `docs/CONTENT_AUDIT_2026-07-08.md`'s claim holds.
- **Structural conformance: real.** All 46 carry all 10 slices, a valid group, all required
  identity fields, `>= 18` drill cards, all 3 core tiers. Zero console/page errors on load.
- **No empty slices anywhere else.** `walk`, `wb`, `trade`, `model`, `num`, `rf`, `open`,
  `bank` are populated (if shallow) on all 46. `num` has a complete `{compute, inputs, lead,
  tell}` shape on all 46. The `wb` mermaid diagram is present on all 46.
- **Prose quality in the 38 is good** — the thinness is *quantity of beats*, not filler.
  This is under-built, not badly built.

## 6. Dead field

`identity.total` is `38` on the generated topics and `8` on the legacy ones — neither is 46. It
has **no consumers** (`applyIdentity` renders the locator from `group` + `locatorTail` only;
`topic-protocol.js:49`). Harmless today, but it is a stale number sitting in 46 files waiting to
be wired to a "topic N of M" display.

---

## Full inventory — all 46 topics

Columns are measured slice counts from the live registry. `sys stages` in bold because 0 = the
pane's primary content is missing.

| # | id | Title | Group | Source | Drill (SDE2/SDE3/Staff) | walk | wb | sys stages | sys pivots | trade | model | num | rf | open | bank CB/MB | Visual | Quality |
|---|----|-------|-------|--------|------------------------|------|----|-----------|-----------|-------|-------|-----|----|------|-----------|--------|---------|
| 11 | `event-driven` | Event-Driven Backbone | Messaging & Events | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 5 | `notifications` | Notifications | Messaging & Events | legacy dir | 21 (5/11/5) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 43 | `real-time-delivery` | Real-Time Delivery | Messaging & Events | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 16 | `cdc` | Change Data Capture | Messaging & Events | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 35 | `kafka-internals` | Kafka Internals | Messaging & Events | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | **YES** | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 45 | `stream-batch-processing` | Stream and Batch Processing | Messaging & Events | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 31 | `saga` | The Saga Pattern | Messaging & Events | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 15 | `caching` | Caching Strategies | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 18 | `soft-delete` | Soft Deletes | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 6 | `eav` | Attribute Store | Data & Storage | legacy dir | 21 (5/11/5) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 14 | `shared-definition` | Shared Definition & Overrides | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 28 | `replication` | Replication and Quorums | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 41 | `consistency-models` | Consistency Models | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 42 | `sharding-strategies` | Sharding and Partitioning | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 29 | `consistent-hashing` | Consistent Hashing | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 37 | `storage-engines` | Storage Engines | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 46 | `probabilistic-structures` | Probabilistic Data Structures | Data & Storage | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 25 | `retries-timeouts` | Retries, Timeouts, Deadlines | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 24 | `idempotency` | Idempotency | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 26 | `circuit-breaker` | Circuit Breaker | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 39 | `error-propagation` | Error Propagation Across Services | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 32 | `backpressure` | Backpressure and Flow Control | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 19 | `observability` | Observability | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 38 | `debugging` | Production Debugging and Incident Diagnosis | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 30 | `slos` | SLOs and Error Budgets | Reliability & Observability | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 8 | `iac` | Infrastructure as Code | Platform & Infra | legacy dir | 22 (5/12/5) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 7 | `desired-state` | Desired State | Platform & Infra | legacy dir | 21 (5/11/5) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 4 | `aws-hardening` | AWS Hardening | Platform & Infra | legacy dir | 21 (5/11/5) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 27 | `load-balancing` | Load Balancing | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 36 | `autoscaling` | Autoscaling | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 33 | `leader-election` | Leader Election | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 34 | `distributed-locks` | Distributed Locks | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 44 | `multi-region` | Multi-Region and Disaster Recovery | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 20 | `lambda-organization` | Lambda Organization at Scale | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 12 | `devices-dispatch` | Device Fleet Dispatch | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 22 | `developer-platform` | Developer Platform Engineering | Platform & Infra | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 21 | `state-machine` | State Machine Design | Architecture & APIs | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 13 | `rules-engine` | Rules Engine & Dual Authorization | Architecture & APIs | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 17 | `feature-flags` | Feature Flags & Dynamic Config | Architecture & APIs | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 40 | `api-design` | API Design and Contracts | Architecture & APIs | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 9 | `rate-limiting` | Rate Limiting | Architecture & APIs | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 1 | `content-pipeline` | Content Pipeline | Architecture & APIs | legacy dir | 22 (3/10/8/+1) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 23 | `microfrontend` | Microfrontend Architecture | Architecture & APIs | markdown | 21 (7/7/7) | 4 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |
| 2 | `signing` | Package Signing | Security & Tenancy | legacy dir | 21 (5/11/5) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 3 | `authz` | Tenant Authorization | Security & Tenancy | legacy dir | 24 (5/13/6) | 9 | 9 | **6** | 7 | 7 | 9 | 4 | 9 | 2 | 8/6 | - | full-depth |
| 10 | `multi-tenant` | Multi-Tenant Isolation | Security & Tenancy | markdown | 21 (7/7/7) | 5 | 2 | **0** | 2 | 3 | 2 | 3 | 3 | 1 | 1/2 | - | SYS-CHAIN EMPTY, no closer, rail notes 2/9 |

---

## Verdict + what to do

**No topic should be CUT.** All 46 are real, coherent, on-syllabus, placeholder-free, and
structurally conformant. The 38 markdown topics are **under-built, not badly built** — the prose
that exists is good; there is simply less of it, because the gate only ever forced depth on the
one pane it measures.

Ranked actions:

1. **Fix the System Map (38 topics).** Pure markdown edit, verified against the real compiler:
   bullet-prefix the stage lines under `### Where it sits`, and blank-line-separate the `-> chip`
   line from its answer. Recovers a whole pane's primary content that is *already authored and
   paid for* and is being silently discarded at build. Highest value per unit effort in the repo.
2. **Add the `else` at `shell.js:237`** so the coaching rail cannot show a stale/foreign note,
   then author the 7 missing `cmpNotes` entries per markdown topic (or make the rail hide when a
   note is absent — a 3-line change that immediately stops 266 pane-views lying to the user).
3. **Teach the gate to count, not just to type-check.** `topic_contract.cjs` should assert
   `sys.stages.length >= 1`, `open.cards >= 2`, `pivots[].a` non-empty, etc. Every defect above
   shipped *through a green 19/19 gate* because the gate tests truthiness, not population. Until
   the gate counts, depth will keep regressing to whatever it does count.
4. **Decide on the Visual pipeline.** 492KB of three.js kit serves 1 of 46 topics. Either author
   `## Visual` for the ~10 topics where a queue/flow animation genuinely teaches (backpressure,
   rate-limiting, load-balancing, autoscaling, real-time-delivery, stream-batch…), or cut the kit
   from the bundle and reclaim ~10% of the payload. It is currently neither.
5. **Backfill depth** on the 38 toward the legacy reference (9 walk steps, 9 wb steps, 7 pivots,
   9 rf flags, 9 model answers, 8 curveballs, the closer card) — the largest body of work, and the
   one that decides whether this is a 46-topic trainer or an 8-topic trainer with 38 stubs.
