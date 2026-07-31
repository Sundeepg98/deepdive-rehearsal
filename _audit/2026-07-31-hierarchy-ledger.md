# The Hierarchy Ledger — the Ledger Round's verdict · 2026-07-31

The round's purpose: test the three-tier operating structure (Fable orchestrator -> Opus leads ->
children) with the model tier held constant (all-Opus, the loaded pin), so the structure itself was
the only variable. Two waves, both live and byte-verified.

## The rows

| | L1 token-structure (M, DELEGATED) | L2 residuals (S, MONOLITHIC) |
|---|---|---|
| build | lead + 4 children, 4 slices, **0 bounces**; both censuses independently re-derived by the lead before acceptance | single builder |
| build wall-clock | ~87 min (children pairwise concurrent, overlapping lead work) | ~68 min |
| cold verify | CLEAN, 3 notes, guards falsified on 14 constructed defect classes | CLEAN, 4 notes; **both declines upheld by time-travel measurement** (the "3px" was right when written — 2.58px on W4's tip — and expired when later waves grew the sidebar) |
| honesty rounds needed | **0** | **0** |
| train | conductor maiden run — all nine liturgy steps correct on disk review | conductor run 2 — handled an in-band touch_floor flake per protocol (standalone x2 + rerun, nothing touched), escalated a record decision rather than inventing data |
| shipped | c317e9c, 73/73, live 1f64ae46 | f2dc062, 73/73, live 5b7c610b |

## Findings of the round's machinery

1. **The conductor pays for itself immediately**: two trains, ~80 min of team-lead liturgy time
   reclaimed, zero deviations, and its failure-handling (flake protocol, escalate-don't-invent)
   matched the written standing order exactly. The train-log file hardening proved out on its first
   use when the message channel ate the report again.
2. **Delegation held on the M-wave**: 4 closed-form slices, file deliverables, zero bounces, and the
   children's own verification discipline (planted negative controls, round-trip value proofs,
   surprise-escalation on the concurrent-writer observation and a mis-briefed selector) matched the
   house standard unprompted.
3. **The S-monolith rule confirmed by contrast**: L2's overhead-free build at ~68 min would have
   gained nothing from decomposition.
4. **Bounce rounds went to zero** this round (historical baseline: ~1 docs/honesty round per wave).
   Small n (2 waves) — directional, not proof.
5. Zero blocking findings anywhere; the verify layer's notes were pinning-quality (existence proofs
   against future re-litigation), not defects.

## THE VERDICT (team-lead, under the operator's delegation)

The hierarchy is **boringly stable** — the bar set for tier activation. Therefore:
**Sonnet 5 implementers ACTIVATE next round** for closed-form child slices, under the containment
already in place (typed `implementer` agents, escalate-on-surprise briefs, lead review before
freeze, Opus-independent cold verify unchanged, the gate unchanged). The A/B measures the next
round's rows against THIS round's Opus-children baseline: internal bounce count, verify findings,
wall-clock. Pre-declared revert: material climb in bounces or findings -> one env value back.

*Recorded by the team-lead at round close; the operator's standing question — "why can't Sonnet do
work?" — gets its measured answer one round from now.*
