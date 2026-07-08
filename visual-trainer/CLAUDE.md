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

## Structural tasks: DONE (machine-verified). Your job is aesthetics.

The original task list (queue choreography, teaching beats, story mode,
perf) has been implemented and headlessly verified -- see `npm run verify`
(13 checks) and the verified-state section below. What remains is visual
judgment that requires human eyes on a live reload (`npm run dev`):

1. **Tuning.** Particle size/opacity, queue spacing and compression feel,
   easing on release flights, bar-vs-stack visual weight, color contrast,
   caption/banner typography, layout breathing room. Keep the color language
   (green/amber/red = lag heat; blue/ring/red = consumer state).
2. **Legibility passes on the three beats.** The mechanics are verified;
   make them *read at a glance*: idle rings obviously disconnected, the
   rebalance freeze unmistakable, skewed lanes visually loud.
3. **Story-mode feel.** Caption pacing/wording, optional step highlights
   (for example, briefly outline the consumer a step just added).
4. **Optional, only after sign-off:** TSL migration (law 2 -- re-verify from
   file://) and MODES.md mode 2.

Known edge (accepted): at extreme slider settings (for example rate 400,
capacity 10, one consumer, left for minutes) total lag can exceed the 4000-
particle pool; stacks saturate visually while bars and readouts stay exact.
Not worth complexity before sign-off; revisit only if a story needs it.

## Implemented choreography (do not regress)

- Spawn exactly tracks `partition.produced`; release exactly tracks
  `partition.consumed` (1 particle = 2 messages, per-lane delta accumulators
  in `stepParticles`). Release credit is capped while a lane's visual queue
  is empty -- the sim consumes instantly but particles take ~1.2s to travel,
  and without the cap queues form seconds late (found and fixed by test).
- Queues stack LEFTWARD from the partition column, compress as they grow,
  and clamp at the producer edge: backpressure literally backs up to the
  source.
- Released particles fly to the circle of the consumer that OWNS the
  partition, making the assignment mapping (and its rebalance changes)
  visible.
- Idle consumers render as hollow rings and receive no flights; a rebalance
  shows a banner, dims the group, and freezes releases (queues keep growing).
- Story mode drives the real sim through timed steps with captions ending in
  an "interview line"; manual controls lock during playback.

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

## Verified state at handoff (2026-07-08, structural pass complete)

- 11/11 sim invariants pass; deterministic.
- `npm run verify`: 13/13 headless checks pass -- renders (frames advancing),
  sim live, queue stacks grow with lag, queued*2 tracks lag within the
  in-flight band, rebalance flips status + shows the banner, slow-consumer
  skew lands on lanes 0 and 3 only, story mode advances captions and drives
  the sim (consumers 3 -> 4 on schedule) with controls locked, 60.5 fps under
  spike load (headless swiftshader; floor 25), zero console errors. Pixel
  checks: 3.5% non-background (floor 3%), 0.3% inter-frame change (floor
  0.2%).
- Single-file build: 481 KB, ~2s. Tracked pilot: `kafka-lag-pilot.html`.
- Screenshot: outputs/kafka_lag_pilot_screenshot.png.
