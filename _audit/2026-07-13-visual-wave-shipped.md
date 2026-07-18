# 2026-07-13 — The visual wave: 7/7 merged, gate 40/40 — NOT YET PUSHED

**System of record for the punch-list fix wave** (source: `2026-07-13-visual-sweep.md`).
Trunk: `compiler-parity @ 9608730`. Full quiet-box gate: **PASS 40/40** (capture:
`2026-07-13-wave-final-gate.txt`). `origin/master` untouched all wave — push is an operator decision.

## The seven merges, each independently verified before landing

| # | Merge | What shipped | Verification |
|---|-------|--------------|--------------|
| 1 | `c5eedb8` | Shiki determinism fix (`tokenizeTimeLimit:0`) + `build_determinism` guard | 10/10 byte-identical builds; deterministic red-green with forced stall; bytes-unchanged proof |
| 2 | `0627b74` | Click-surface stability (55.6px pair-dependent tab drift → 0; pane translate → 0) + `click_drift` check | Blind behavioral advisory + binding run-of-record (sha-attested) + independent code audit (baselines re-decoded, red re-witnessed) |
| 3 | `7d79750` | `cta_contrast` paint-settle repair (`B.waitPainted`) | Root-caused by measurement (2-rAF settle vs 300ms fade); 5/12→0/32 flakes; forced-red FLOOR=8.0 detection proof; two-box 5.20:1 exact match |
| 4 | `aba793e` | Group-colour single-sourcing (`TOPIC_GROUPS[].color` DELETED; consumers → `var(--room-*)`); dark dots 2.95→6.9:1 | Independent re-measure + third-consumer sweep CERTIFIED NONE; befores reproduced to 2 d.p. |
| 5 | `9809103` | Typography: ONE body role (16.5), ≥14px prose floor (303 blocks), 68ch measures, ≥11px labels — shadow sheets only | 4,447-signature light-DOM diff (1 delta, correctly attributed trunk-side); restraint ledger verified unchanged-not-bumped |
| 6 | `dc20e91` | Back-navigation fix (referrer-gated single guard entry; reload-safe via sessionStorage) + `back_deadend` check | Round 1 CONFIRMED + caught reload re-seat → bounced → round 2 flat deltas [0,0,0,0,0] on exact committed blob |
| 7 | `9608730` | Mobile tab-strip affordance (directional scrim+chevron, zero new JS); load-bearing pin comment + computed-style assertion; companion-rail 14px lift (B1 light-DOM half) | Three-artifact triangulation (package/trunk/base); pin assertion teeth-checked; desktop-inert proven |

## Verification culture receipts
- Every instrument was **negative-control-proven** (watched failing on broken code) before its green was trusted.
- Two deliberate **parallel replications** (mobile-drift dual-instrument 0px/0px with fired synthetic controls; cta two-lane verify).
- One **bounce-for-fix** (reload re-seat) kept the wave asterisk-free.
- Mobile drift **certified negative** (not assumed): the immunity is one `position:fixed` — now commented + asserted.

## Evidence map
- `2026-07-13-typeverifier-evidence/` (committed): instruments + raw JSON for merges 5+7, MANIFEST with provenance + pollution disambiguation.
- `D:/claude-workspace/v-back-verifier/` + `v-drift-verifier/` (durable workspaces): instruments + results for merges 2, 3, 6, 8-lens sweep verdicts. Key JSONs copied alongside this file.
- `_audit/shots/` (untracked by design): room matrix, verifier strips, swept sweep-shots.
- Per-verdict documents already in `_audit/`: code-lane verdict, binding click-surface verdict, room-accent verification, visual sweep punch list (+PKG-E), determinism 10-build hashes.

## Deferred nits (next small batch — none block anything)
`check_all` "14-15" comment → deterministic-backbone wording · `waitPainted` shadow-crossing walk (`getRootNode().host`) · overlay P3s ED1-ED4 · PKG-E rows 15-17 (+ **row 14 keyov-unreachable-on-touch P2 — still unowned**) · Cram pill 21px · 5px stage-head flourish (accepted-cosmetic) · promotion decision for the mobile-drift + Back instruments into the repo gate.

## Open operator decisions
1. **PUSH** — the wave is local; deploy-on-push serves GitHub Pages (free tier).
2. **HOMEPAGE vs index overlay** — operator chose decide-after-wave; the P1 Back trap is fixed either way; the overlay remains the designed start.
