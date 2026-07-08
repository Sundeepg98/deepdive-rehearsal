# Visual Trainer -- Claude Code handoff

GPU-accelerated **2D** concept trainers for the deepdive-rehearsal interview
curriculum. **Pilot mode: Kafka consumer lag / backpressure** (this directory).
The structure below was built and machine-verified headlessly; your job is the
**visual choreography and polish**, iterated with human eyes on a live reload.

## Hard laws (non-negotiable -- encode the research, do not relitigate)

1. **2D / 2.5D ONLY. No 3D.** Orthographic camera, no scene rotation, no
   perspective, no camera controls. Nine research passes concluded true 3D
   earns its place in essentially zero curriculum concepts and *actively
   harms* learning (seductive-detail effect, g ~= -0.33). If a change makes it
   look more like a game and less like a diagram in motion, revert it.
2. **Single-file, double-click-openable output.** `npm run build` must emit
   one self-contained `dist/index.html` that works from `file://` offline.
   WebGPU is **blocked** from `file://` by Chrome secure-context rules, so
   **WebGL2 is the mandatory runtime**. (TSL authoring is permitted ONLY via
   `three/webgpu` WebGPURenderer with `forceWebGL: true`, and ONLY if you
   re-verify from `file://` -- plain WebGLRenderer is the safe default and is
   what ships now.)
3. **Sim / render separation.** `src/sim/*` is pure, deterministic, fixed-dt,
   DOM-free, and unit-tested. The renderer READS state; it never computes
   domain logic. Any new behavior goes in the sim WITH a new invariant test.
4. **The invariants are the curriculum.** `test/sim_invariants.mjs` must pass
   before and after any change. They encode the teaching points:
   drain-vs-grow by capacity; **consumers beyond the partition count are idle
   and add ZERO capacity**; a group change causes a **stop-the-world rebalance
   stall** that spikes lag even when capacity is sufficient; a **slow consumer
   skews lag onto its own partitions only**. If a visual contradicts an
   invariant, the visual is wrong.
5. **Pilot-first.** Do NOT start a second mode until the pilot passes
   human-eye review (below) and is judged to beat the deepdive app's existing
   text + mermaid treatment of the same concept. Candidate modes: `MODES.md`.
6. **Standalone.** Do not embed this into the deepdive app's build or gate.
   It ships as its own artifact; the app may link to it later.

## Commands (all must stay green)

    npm install                 # deps (three, vite, vite-plugin-singlefile)
    npm test                    # sim invariants -- the curriculum checks
    npm run build               # single-file dist/index.html (~470 KB)
    npm run dev                 # live reload for visual iteration
    CHROME=<chromium> PLAYWRIGHT_BROWSERS_PATH=<dir> npm run verify
                                # headless: renders, animates, sim live,
                                # rebalance triggers, 0 console errors

`npm run verify` proves "renders and animates" mechanically. It cannot judge
whether it looks right or teaches well -- that is the human review below.

## Your task list (the choreography upgrade), in order

1. **True queue semantics.** Replace the dwell-shimmer approximation in
   `src/render/scene.js` (`stepParticles`) with real accumulation: particles
   arriving at a partition column while its lag > 0 join a visible **stack**
   (a queue that physically grows leftward/upward with lag and shrinks as it
   drains); departures to the consumer column happen at the consume rate.
   Spawn rate must track produce rate; the stack length must visually track
   `partition.lag`. The bars can then become secondary or be merged into the
   stacks.
2. **Make the three teaching beats unmissable.**
   (a) *Idle consumers*: adding consumer 7/8/9 (P=6) must read as "nothing
   changed" -- grey, smaller, visibly disconnected from any lane.
   (b) *Rebalance stall*: on any add/remove, freeze all consumption motion for
   the stall window with an explicit "REBALANCING" treatment; lag visibly
   climbs during it.
   (c) *Slow consumer*: its lanes back up while others stay clear -- skew, not
   uniform growth.
3. **Story mode.** A "play scenario" button per teaching beat that drives the
   controls on a timeline (~15s each) with one-line captions:
   spike -> lag grows -> add consumer -> drains -> add past 6 -> nothing
   changes. This is the rehearsal artifact: watch, then narrate it yourself.
4. **Polish.** 60 fps at 5k particles (instancing is already in place);
   consistent color language (green/amber/red = lag, blue/grey/red =
   consumer state); a compact legend; keyboard shortcuts optional.
5. **Only after human sign-off:** consider TSL (law 2) and mode #2 (MODES.md).

## Human-eye review criteria (Sundeep judges; the machine cannot)

- Can you SEE that adding consumer #4 helps and adding consumer #7 does
  nothing? (The single most valuable beat -- interviewers probe exactly this.)
- Is the rebalance pause legible as "stop-the-world, lag climbs anyway"?
- Does the slow-consumer skew read at a glance?
- Honest question: does watching this beat re-reading the kafka-internals
  drill cards in the app? If no, stop at one mode -- the research says
  decoration that does not teach is negative value.

## Resume line (once the pilot passes review)

Interactive WebGL2/Three.js visualizer for distributed-systems concepts
(Kafka consumer-group dynamics): deterministic simulation core with invariant
tests, GPU-instanced particle rendering, single-file offline distribution.

## Verified state at handoff (2026-07-08)

- 11/11 sim invariants pass; deterministic.
- Single-file build: 474 KB, 2.3 s.
- Headless verify: 183 frames, live lag 47 -> 98, group change flips status to
  REBALANCING, 0 console errors; canvas 4.2% non-background, 0.5% inter-frame
  pixel change (floors 3% / 0.2%).
- Screenshot: outputs/kafka_lag_pilot_screenshot.png.
