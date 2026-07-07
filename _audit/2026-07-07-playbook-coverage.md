# Playbook Coverage Audit -- engineering-playbook -> deepdive-rehearsal

- Date: 2026-07-07
- Source of truth: github.com/Sundeepg98/engineering-playbook (28 sections)
- App: deepdive-rehearsal, 18 topics (10 compiled from `src/topics-md/*.md`, 8 hand-authored JS)

## Verdict

Every playbook section that is a **system-design topic** is covered, except a small, well-defined set:
**observability** (S15 + S27), **lambda-organization-at-scale** (S14), and a **standalone state-machine-design**
(S08, currently only applied inside other topics). The war-story and methodology sections (S01, S02, S03, S05,
S28) are deliberately **not** interactive topics -- they are interview-reserve / process material. Microfrontend
(S07) and developer-platform (S09) are out of scope for a backend system-design trainer (frontend is owned by the
separate Row 9-11 curriculum).

All 18 topics are at **21 drill cards**, all substantive, all grounded in real production work.

## Coverage matrix (28 sections)

| S | Playbook section | App topic | Status |
|---|---|---|---|
| 01 | Distributed error propagation | -- | war-story (reserve) |
| 02 | Production debugging patterns | -- | war-story (reserve) |
| 03 | SQL forensics | -- | reference/forensics (reserve) |
| 04 | Cryptographic signing pipeline | signing | covered |
| 05 | Architecture audit methodology | -- | methodology (not a topic) |
| 06 | Multi-tenant SaaS patterns | multi-tenant | covered |
| 07 | Microfrontend architecture | -- | out of scope (frontend curriculum) |
| 08 | State machine design | (rules-engine, devices-dispatch, content-pipeline) | applied, no standalone -> GAP |
| 09 | Developer platform engineering | -- | showcase/talking-point (borderline) |
| 10 | AWS security quick wins | aws-hardening | covered |
| 11 | Event-driven architecture | event-driven | covered |
| 12 | Caching architecture | caching | covered |
| 13 | IaC templating | iac | covered (enrich: name Jinja2/YAML) |
| 14 | Lambda organization at scale | -- | GAP |
| 15 | Observability & structured logging | -- | GAP |
| 16 | Soft-delete & data lifecycle | soft-delete | covered |
| 17 | Content processing pipeline | content-pipeline | covered |
| 18 | CDC & data pipeline | cdc | covered |
| 19 | Rules engine & approval workflows | rules-engine | covered |
| 20 | Auth & authorization patterns | authz | covered (enrich: materialized-view authz, PCI flag) |
| 21 | Feature flags & dynamic config | feature-flags | covered |
| 22 | API gateway & rate limiting | rate-limiting | covered |
| 23 | Job orchestration & polling | devices-dispatch | covered |
| 24 | Extensible entity attributes (EAV) | eav + shared-definition | covered (eav = application, shared-definition = keystone) |
| 25 | Notification & email architecture | notifications | covered |
| 26 | Desired-state reconciliation | desired-state | covered |
| 27 | OpenTelemetry instrumentation | -- | GAP (folds with S15) |
| 28 | Production incident anti-patterns | -- | war-story (reserve) |

17 sections -> 18 topics covered. 5 deliberately-not-topics. 6 uncovered (3 genuine gaps + 1 embedded + 2 out-of-scope).

## The gaps, categorized

### Genuine topic gaps to add (his production work -> strongest interview material)

1. **Observability** (S15 + S27) -- structured JSON logging (Pino), three-tier audit shipping
   (memory -> database -> stream), vendor-native -> OpenTelemetry APM migration, health-check patterns that
   catch real failures, no-op telemetry fallbacks, async span helpers with context propagation, composite
   propagators (W3C + X-Ray), Pino log correlation, custom metric naming. Currently only touched *incidentally*
   (a Staff drill card in event-driven / devices-dispatch, a health-check mention in notifications) -- no
   dedicated topic. Also the Tier-3 "observability" item. **HIGH PRIORITY.**
2. **Lambda organization at scale** (S14) -- 108 functions across 12 service domains, runtime strategies,
   concurrency models (reserved/provisioned), event-trigger patterns, and the operational reality of serverless
   at enterprise scale. No topic owns this. **GAP.**
3. **State machine design** (S08) -- the 9-status content lifecycle, clone trees, two-approver MFA workflow,
   retry strategies for failed states. Applied across rules-engine (four-eyes), devices-dispatch (job state
   machine 0-5), content-pipeline (statuses) but no standalone "how to design a state machine" topic.
   **Decision needed:** promote to a standalone topic, or accept it as sufficiently covered in application.

### Deliberately not topics (interview-reserve / methodology -- no action)

- **S01 / S02 / S03 / S28** war-stories -- the debugging & anti-pattern reserve. The playbook README frames them
  as "self-contained war stories"; the deep-dive summary calls them "interview reserve." They belong in the
  interview-stories artifact, not as interactive design topics.
- **S05** audit methodology -- a *process* (how to audit a 30-repo platform in iterative rounds), not a
  system-design pattern.

### Out of scope for a backend system-design trainer

- **S07 microfrontend** (single-spa, Angular + React, import maps) -- owned by the separate frontend curriculum
  (Rows 9-11). Add here only if this app is meant to span frontend too.
- **S09 developer platform** (13K-line MCP server, multi-env DB access tooling) -- a "what I built" showcase /
  talking point, not a canonical design topic.

### Minor within-topic enrichment (optional, targeted addenda -- not full topics)

- **authz** (S20): add materialized-view authorization + PCI-DSS-as-a-progressive-feature-flag. It already covers
  tenant authorization, RBAC tiers, and IDP migration; these two sub-points are the section's remainder.
- **iac** (S13): name the Jinja2 + YAML-per-environment specifics. It covers Terraform templating conceptually
  but does not name the templating engine / config format.

## Parity note

All 18 topics are at 21 drill cards. The `.md` topics are 7/7/7; the hand-JS topics lean 5/11/5 (content-pipeline
3/10/8). Totals match, tier split differs -- not a coverage issue, but a rebalance candidate if tier uniformity
is wanted later.

## Recommended sequencing into Tier 3

Close the playbook gaps first (they are grounded in his real work, so they double as resume/interview material):
**observability (S15+S27)**, then **lambda-organization (S14)**, then decide on **state-machine (S08)**. Then
proceed to the generic FAANG breadth topics (circuit-breaker, retries/timeouts, load-balancing, SLOs, idempotency,
Kafka-internals, consistent-hashing, replication/quorums, LSM-vs-B-tree, leader-election, distributed-locks,
saga, backpressure, autoscaling) which extend beyond the playbook.
