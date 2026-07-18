# 2026-07-13 — Click-surface drift: BINDING verdict (run of record) — CONFIRMED-FIXED

Independent behavioral verifier, blind to the fixer's branch/harness throughout. Chain of custody:
shipped default-path deliverable sha-identical to the advisory artifact (11,644,555 bytes, sha256
dda746f4…); instrument hash 36c55b40… identical across advisory + binding runs; base results
snapshotted and restored. Numbers (base → post-merge, deterministic 5/5 across all runs):

- **D1 settled tab shift: 55.6px → 0px** on all 7 pairs incl. worst-case caching→error-propagation;
  same-wrap controls 0→0; every pre-switch tab coordinate still hits its own tab (base drifted onto
  the drill tab / pomodoro timer / bare aside). Mechanism measured: h1 reserves 2 lines uniformly →
  one tab-column Y for all 46 topics.
- **D2 pane translate: 16px → 0px**; concrete pane-button displacement 15.5–18.2px → 0px.
- **D2 head: 5px → 5px** — the stage-head title flourish, ACCEPTED-COSMETIC on the record
  (non-interactive label, transform-only; PKG-D motion-budget scope if ever revisited).
- **Must-not-move controls all hold** (9 tabs present, scrollY=0, column x=19, right panel,
  transitions act) — the fix did not stabilize tabs by breaking something else.

Companion documents: `2026-07-13-ndrift-code-lane-verdict.md` (the independent CODE audit),
`2026-07-13-drift-binding-verdict.json` (raw run-of-record output). Merge: `0627b74`.
