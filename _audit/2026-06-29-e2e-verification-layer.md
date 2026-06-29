# 2026-06-29 — e2e / Playwright Verification Layer (closes the #1 risk)

Operator-chosen next build after Batch 1. Makes THE GATE actually RUN browser
checks instead of skipping everywhere. Built by spa-extract in an isolated
worktree, independently re-verified (gate run locally + on master with browser
checks RUNNING), serial-merged ff-only, pushed, **CI-validated end-to-end**.

master: `2bef4a5` -> `ebd7203` (test: make THE GATE run browser checks). Test-infra
ONLY — src/ + deliverable byte-unchanged (478,936 B, build_integrity green).

## The problem it closes
`check_all.py` located Chromium only via a hardcoded sandbox glob
(`/opt/pw-browsers/chromium-*/chrome-linux/chrome`) + `NODE_PATH=/home/claude/...`.
Neither exists on dev machines or CI, so `render` + `entity_leak` showed **SKIP on
every run** — the #1 documented risk (no automated browser verification; the whole
session's UI checks had to be hand-driven via Playwright MCP).

## What landed
- **check_all.py** — portable browser detection via `playwright.chromium.executablePath()`
  (no hardcoded paths, no NODE_PATH; relies on local node_modules). Added
  `e2e_interactions` to the browser-check set. SKIP-not-FAIL preserved (CI-safe +
  dev-without-browser-safe). Note: the legacy `/opt` fallback was dropped (it was
  paired with the NODE_PATH hardcode; the sandbox is not a gate/deploy target here).
- **package.json + package-lock.json** — `playwright` as a devDependency. The shipped
  deliverable stays zero-dependency; this is dev/test tooling only. (node_modules
  already gitignored.)
- **.github/workflows/deploy-pages.yml** — `npm ci` + `npx playwright install
  --with-deps chromium` before THE GATE, so CI runs the browser checks. Deploy still
  gated on the full green gate.
- **test/e2e_interactions.cjs (new)** — interaction regression net codifying the
  hand-verified flows: theme toggle flips `html[data-theme]`; text-zoom changes
  `--read-zoom` on `.stage`; drill must-hit checklist renders + ticking updates
  coverage (0->1); rescues (scroll-to-top built/reveals, pomodoro counts down on
  play, page-visibility wired); zero console/page errors throughout. Reaches shadow
  roots directly, so robust to view-transition paint timing.
- **test/render.cjs (robustness fix)** — making render actually RUN exposed a latent
  flake: its fixed 70ms per-pane wait raced the SPA's async View Transitions and
  flaky-failed on `wb`. Replaced with a deterministic `waitForFunction` (<=2s). NOT a
  deliverable bug — exactly the kind of latent issue the SKIP had been hiding.

## Proof
- Local (worktree + on master, real Chromium): GATE PASS with `render PASS`,
  `entity_leak PASS`, `e2e_interactions PASS` — all RUN, none SKIP.
- **CI run 28371382740: success in 53s** — "Install Playwright + Chromium" + "THE
  GATE (browser checks included)" both green, then deployed. First time the browser
  checks have ever run in CI.

## Honest scope notes (acceptable; both behaviors hand-verified earlier this session)
- scroll-to-top e2e asserts softly (`shown || scrolled<400`) — the default view may
  not be scrollable past the 400px threshold in a fixed test viewport.
- page-visibility e2e is a WIRING check (`window.__appHidden` boolean + visibilitychange
  dispatches without error) — headless can't force `document.hidden` true. The full
  hidden->paused transition was verified by hand (a running `railin` anim went
  running->paused under `body.is-hidden`).
- Minor: GitHub deprecation warning (node20 action runtime auto-forced to node24);
  harmless, trivial future bump of the action versions.
