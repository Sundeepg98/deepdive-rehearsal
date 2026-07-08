# Trainer framework -- the reusable pipeline

Answer to "do we have a pipeline everything can leverage?": we do now.
The kafka-lag pilot is the first consumer; it contains ~120 lines of
mode-specific code (static art + sim wiring + stories) on top of these
shared modules. All hard laws in CLAUDE.md apply to every mode.

## Modules (src/framework/)

- **loop.js** -- fixed-dt sim ticks + rAF render driver. Determinism at any
  display rate.
- **hud.js** -- status badge, event banner, caption bar, the story-mode
  driver (timed steps with captions against sim time), control locking.
- **flow.js** -- counter-driven queue-flow particle choreography. The crown
  jewel: spawn tracks a produced counter, release tracks a consumed counter
  (visuals CANNOT drift from the sim), queues stack backward and compress
  (backpressure to the source), releases fly to the lane's current owner
  (assignment made visible). Includes the empty-queue credit cap that fixes
  the sim-instant-vs-travel-latency artifact (found by headless test).

## What a new mode supplies (the contract)

1. `src/sim/<mode>.js` -- pure, deterministic, fixed-dt, DOM-free, exposing
   monotonic counters, PLUS `test/` invariants that encode its teaching
   points. Invariants first; no visuals until they pass.
2. A scene: static art + one or more `createQueueFlow` configs (or a new
   framework primitive if the mode's motion is genuinely not queue-flow --
   extract it INTO framework/, never fork it).
3. Stories: timed `{ t, cap, do }` steps ending in an interview line, run
   through the framework driver.
4. Controls schema in index.html following the existing id conventions
   (status/banner/caption/stopStory), so hud.js and the verify harness work
   unchanged.
5. A `_pw_verify` section asserting its own teaching-point mechanics.

## Mode fit (from MODES.md)

Direct flow.js consumers: 2 backpressure buffer, 9 autoscaling queue,
10 retry storm, 5 load balancing (multi-source variant). Need one new
primitive each: 3 consistent-hash ring (arc remap), 6 circuit breaker
(state-flow), 7 replication lag (trailing cursors), 11 cache heat (grid).
Law 5 still gates all of them behind pilot sign-off.

## Non-negotiables inherited by every mode

2D orthographic only; single-file file:// WebGL2 output; sim/render
separation with counters as the only bridge; invariants are the curriculum;
`npm test` + `npm run verify` green before any commit.
