# Final Content-Coverage & Ordering Audit -- deepdive-rehearsal (37 topics)

- Date: 2026-07-08
- App state: 37 topics (29 compiled from `src/topics-md/*.md`, 8 hand-authored JS), all render, gate green
- Source of truth for coverage: github.com/Sundeepg98/engineering-playbook (28 sections)
- Complementary format: System-Design Set-B (end-to-end design problems) -- see section 3
- Supersedes: `_audit/2026-07-07-playbook-coverage.md` (written at 18 topics)

---

## Headline verdict

The breadth build is complete and the app is in a strong, coherent state. **Every gap the
prior audit identified is closed.** There is exactly one remaining *real* decision (a
debugging/incident cluster), one confirmed *non-gap* (end-to-end design problems belong to
Set-B, not here), and the ordering is sound. Nothing is broken; the question now is whether
to add one more thing.

Since the 18-topic audit: its three named gaps -- **observability (S15+S27)**,
**lambda-organization (S14)**, **state-machine (S08)** -- are all now live topics, and both
its named enrichments -- **authz** (materialized-view authz + PCI-as-data-class-flag) and
**iac** (Jinja2/YAML) -- shipped this session. That audit's entire action list is done.

---

## 1. Does each topic cover its section's actual information? (depth, not presence)

Yes. Coverage is real, not nominal.

- **22 of 28 playbook sections have a dedicated topic**, each covered deeply. The 14-pane
  format is thorough by construction, and the 8 hand-JS topics were authored *from* the real
  production work the playbook documents, so they cover their sections.
- **+14 additional canonical breadth topics** sit *on top* of the playbook -- retries-timeouts,
  idempotency, circuit-breaker, load-balancing, replication, consistent-hashing, slos, saga,
  backpressure, leader-election, distributed-locks, kafka-internals, autoscaling,
  storage-engines. These are general CS / distributed-systems patterns the playbook does not
  contain. **The app covers more than the playbook, not less.**
- **Depth spot-check (evidence, not assertion)** on the three topics the prior audit wanted
  added, against their sections' keyword surface:
  - `observability` vs S15+S27: traces/spans 88, OpenTelemetry present, logs 69,
    cardinality/sampling 37, correlation 29 -- covers all three pillars + OTel + the
    high-cardinality/sampling trade + log correlation. Deep.
  - `lambda-organization` vs S14: cold-start 32, concurrency 77, reserved/provisioned 56,
    triggers 23 -- covers cold-starts, the concurrency models, and event-source triggers. Deep.
  - `state-machine` vs S08: guards/invalid-transition 51, status/lifecycle 42, enum/explicit 28
    -- covers guards, illegal-transition rejection, the status lifecycle, explicit enums. Deep.
- **No under-covered dedicated-topic section was found.** Every section that maps to a topic
  is well-served.

### Coverage matrix (28 playbook sections, at 37 topics)

| S | Playbook section | App topic | Status |
|---|---|---|---|
| 01 | Distributed error propagation | -- | GAP -- debugging cluster (see 2a) |
| 02 | Production debugging patterns | -- | GAP -- debugging cluster (see 2a) |
| 03 | SQL forensics | -- | GAP -- debugging cluster (see 2a) |
| 04 | Cryptographic signing pipeline | signing | covered |
| 05 | Architecture audit methodology | -- | reserve -- meta-skill (see 2b) |
| 06 | Multi-tenant SaaS patterns | multi-tenant | covered |
| 07 | Microfrontend architecture | microfrontend | covered (now a topic) |
| 08 | State machine design | state-machine | covered (now a standalone topic) |
| 09 | Developer platform engineering | developer-platform | covered (now a topic) |
| 10 | AWS security quick wins | aws-hardening | covered |
| 11 | Event-driven architecture | event-driven | covered |
| 12 | Caching architecture | caching | covered |
| 13 | IaC templating | iac | covered (+Jinja2/YAML enrichment shipped) |
| 14 | Lambda organization at scale | lambda-organization | covered (prior gap closed) |
| 15 | Observability & structured logging | observability | covered (prior gap closed) |
| 16 | Soft-delete & data lifecycle | soft-delete | covered |
| 17 | Content processing pipeline | content-pipeline | covered |
| 18 | CDC & data pipeline | cdc | covered |
| 19 | Rules engine & approval workflows | rules-engine | covered |
| 20 | Auth & authorization patterns | authz | covered (+materialized-view/PCI enrichment shipped) |
| 21 | Feature flags & dynamic config | feature-flags | covered |
| 22 | API gateway & rate limiting | rate-limiting | covered (gateway residual: see 2c) |
| 23 | Job orchestration & polling | devices-dispatch | covered |
| 24 | Extensible entity attributes | eav + shared-definition | covered |
| 25 | Notification & email architecture | notifications | covered |
| 26 | Desired-state reconciliation | desired-state | covered |
| 27 | OpenTelemetry instrumentation | observability | covered (folded into S15) |
| 28 | Production incident anti-patterns | -- | GAP -- debugging cluster (see 2a) |

**22 covered by dedicated topics + 14 additional breadth patterns. 6 sections have no
dedicated topic** -- but 5 of them are one coherent cluster, and 1 is a reserve meta-skill.

---

## 2. The reconciled-away sections -- verdict on each

### 2a. The debugging / incident / diagnostics cluster (S01, S02, S03, S28) -- THE ONE REAL DECISION

Four sections, one theme: **diagnosing and propagating failures in production.**
- S01 distributed error propagation -- a machine-readable failure-code taxonomy across
  services, cascading classifier, map codes to user actions, self-timeout.
- S02 production debugging patterns -- 12 real war stories (survivorship bias, NULL-exclusion
  trap, replication-lag 404, Promise.all rate-limiting, APM-vs-logs discrepancy, automation
  storm, config drift...).
- S03 SQL forensics -- Postgres investigation queries (NULL/duplicate/orphan detection,
  timeline analysis with LAG(), EXPLAIN ANALYZE, JSONB pitfalls).
- S28 incident anti-patterns -- 5 systemic failure modes (validation risk asymmetry, client
  retry amplification, false redundancy, performance-filter masking, coupled-state oscillation).

**Why this is the strongest -- and only -- real candidate to add:**
1. It is a **distinct interview competency** -- the debugging/troubleshooting round, and the
   "hardest bug you've ever debugged" behavioral -- that **no current topic trains.** The
   reliability topics teach how to *build* robust systems; none teach how to *diagnose* a
   failing one.
2. It is **your most authentic material**, with hard numbers that land in a room: 17,000+
   silent data-loss/week, 118,933 devices wrongly excluded by a NULL trap, 270,000+ failed API
   calls over 10 days from a validation-plus-retry-storm. This is resume-and-interview gold.
3. The individual failure *modes* are scattered across the reliability topics (retry
   amplification -> backpressure/retries, replication-lag 404 -> replication), but the
   **diagnostic skill and the stories themselves are trainable nowhere in the app.**

**The catch -- decide the shape first.** This is a different *shape* than the 14-pane pattern
format. A pattern topic answers "how do I build X"; this answers "how do I find what's broken,
plus here are the war stories and anti-patterns." Forcing it into the build-a-system mold would
flatten exactly what makes it valuable.

**Verdict:** Worth adding, if you want the app to cover the debugging round. Recommendation: a
**`debugging`** topic carrying the methodology (read error volume *before* the storage layer;
survivorship bias; the meta-patterns) and folding S02 + S03 + S28, with S01's cross-service
error-taxonomy either as its own small topic or a section inside it. But **choose the format
before authoring** -- likely a diagnostic-methodology walkthrough plus a war-story bank, not a
pattern deep-dive. This is a genuine call for you; everything else below is settled.

### 2b. Architecture-audit methodology (S05) -- CORRECTLY RESERVED

A *process* skill: how to audit a 30-repo platform in iterative rounds, classify gaps by
severity/effort/blast-radius, dedup, compress, and map to epics. Low FAANG-interview relevance
-- it is a staff/consulting meta-skill, rarely posed in a coding/design loop. Genuinely valuable
for your actual work and a techno-managerial pitch, but not an interview-prep topic.
**No action; keep as reference material.**

### 2c. The api-gateway residual of S22 -- SUBSUMED

`rate-limiting` covers the core of S22. The residual -- multi-layer defense-in-depth
(edge WAF -> LB -> app global throttle -> per-endpoint) and the gateway middleware-pipeline /
three-tier error-handling angle -- is at most a **small optional enrichment card** on
`rate-limiting` (the same shape as the authz/iac addenda), not a topic. Low priority; not a gap.

---

## 3. Patterns vs end-to-end design problems -- RESOLVED, NOT A GAP

This was the open clarification. It resolves cleanly.

- The 37 topics are **canonical patterns** -- deep, reusable building blocks (caching, saga,
  autoscaling, leader-election, storage-engines...). The app trains you to understand and
  articulate each pattern to interview depth.
- **End-to-end design problems** (design YouTube, a web crawler, a geo/location system) are a
  **different format** -- composing many patterns into a complete system under time pressure --
  and they are **already held in System-Design Set-B** (confirmed present: YouTube/Autocomplete,
  Web Crawler/File Storage, Geo/Location-Based).

**Verdict:** Two complementary, both-needed formats. Design problems are **not a gap in this
app** -- cramming a full-system walkthrough into the 14-pane pattern mold would be a category
error. The "main model topics" -- the canonical patterns -- are all present. Keep this app as
the **patterns trainer**; keep Set-B as the **design-problem trainer**. If there is a future
move, it is to bring Set-B up to this app's polish, **not** to merge them.

---

## 4. Ordering -- SOUND, no change needed

- The six groups flow domain-wise: **messaging-events** (the event backbone) ->
  **data-storage** (the data) -> **reliability-observability** (make it robust + measure it) ->
  **platform-infra** (run it) -> **architecture-apis** (structure it) -> **security-tenancy**
  (protect it). A reasonable conceptual arc.
- Within-group order is sensible -- e.g. reliability runs basic resilience to measurement
  (retries -> idempotency -> circuit-breaker -> backpressure -> observability -> slos); data
  runs application patterns to physical storage (caching ... replication -> consistent-hashing
  -> storage-engines).
- Because topics are **independent deep-dives** -- a browsable reference, not a sequential
  curriculum -- exact order is low-stakes. **No reordering warranted.** (Optional micro-note: if
  you ever want "most-asked first," you could float caching / rate-limiting / load-balancing
  toward the top, but there is no real reason to.)

---

## Bottom line

- **Breadth build: 14/14 complete.** Playbook: 22/28 sections have dedicated deep topics, plus
  14 additive canonical patterns. All prior gaps closed; both enrichments shipped this session.
  37 topics, all render, gate green (build_integrity, 63 unit tests, global collisions).
- **One open decision:** whether to add a **debugging/incident** topic -- your best war-story
  material, a real interview round, a *different* format. Recommend yes, but decide the shape
  (diagnostic methodology + war-story bank) before authoring.
- **Two confirmed non-actions:** architecture-audit methodology (reserve), end-to-end design
  problems (Set-B's job -- keep them separate).
- **Ordering: sound.** Leave it.

---

## Resolution (same day, later) -- "I want it all"

Decision: build the debugging cluster. Shipped as **two topics** in the standard 14-pane
format (the format fits: war stories -> drill cards, methodology -> walk, anti-patterns ->
red-flags, SQL forensics -> walk/drill):

- **debugging** (commit 7a7ffa2) -- production debugging and incident diagnosis, folding
  playbook S02 (debugging patterns) + S03 (SQL forensics) + S28 (incident anti-patterns).
  The diagnostic skill: distrust the success metric, read failures before the storage layer,
  hypothesize the mechanism, confirm on the most specific evidence, fix root cause + amplifier
  + a regression guard. Grounded in the real war stories (survivorship bias / 17k-week, the
  NULL trap / 118,933 devices, retry amplification / 270k-in-10-days).
- **error-propagation** (commit 65fdb72) -- meaningful failures across services, playbook S01.
  The error-contract design pattern: a machine-readable failure-code taxonomy classified at
  the source, preserved across boundaries, mapped to user actions (retry/fix/escalate) at the
  edge; plus the cascading classifier, self-timeout, correlation ids, and an append-only
  contract deployed consumer-first. Grounded in the real 4-service packaging pipeline.

App now **39 topics**. reliability-observability grew to 8: retries-timeouts, idempotency,
circuit-breaker, error-propagation, backpressure, observability, debugging, slos.

### Coverage after the cluster

**27 of 28 playbook sections now have a dedicated deep topic** (debugging folds S02/S03/S28,
observability folds S15/S27). The sole section without one is **S05 architecture-audit-
methodology**, correctly reserved (a staff/consulting meta-skill, low FAANG-interview
relevance). Plus the 14 additive canonical breadth patterns. The debugging gap the earlier
audit flagged is closed; coverage is now effectively complete for interview purposes.

### "Which to keep" -- overlap analysis (evidence-based, keep all)

The new topics are **additive, not duplicative** -- their signature concepts appear in *no*
other topic: survivorship bias and the NULL exclusion trap (debugging only), self-timeout and
the failure-code taxonomy (error-propagation only). The overlaps that do exist are
**complementary (a different angle), not redundant**:

| concept | pattern topic (how to build it) | new topic (how to diagnose / contract it) |
|---|---|---|
| retry storm / amplification | retries-timeouts (17 mentions, design) | debugging (9, diagnostic symptom) |
| replication lag | replication (10, mechanism) | debugging (6, intermittent-404 diagnosis) |
| transient vs permanent | retries-timeouts (1, consumes it) | error-propagation (33, owns the classification) |

A candidate needs both "how to build it" and "how to recognize/handle it when it fails," so
these are two panes on one phenomenon, not duplication. The debugging topic cross-references
the pattern topics explicitly rather than reproducing them. **Verdict: keep all; nothing to
cut.**

### Ordering re-review -- sound

Full app: 39 topics, 6 groups (messaging-events 5, data-storage 7, reliability-observability
8, platform-infra 10, architecture-apis 6, security-tenancy 3). The within-group arc for
reliability-observability is coherent: the error-handling cluster (retries -> idempotency ->
circuit-breaker -> error-propagation) -> flow control (backpressure) -> see-and-diagnose
(observability -> debugging) -> measure (slos). error-propagation slots into the error-handling
cluster after circuit-breaker; debugging pairs with observability (the tooling, then using it).
The 6-group order is unchanged and still sound. **No re-ordering needed.**

### Bottom line (final)

Coverage: 27/28 playbook sections have dedicated deep topics (only S05 reserved) + 14 breadth
patterns. Debugging cluster shipped (2 topics). No redundancy to cut -- the overlaps are
complementary. Ordering sound. Nothing open.
