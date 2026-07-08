# Visual pipeline -- graphics with markdown ergonomics

North star (owner's words): "one empty file generates the whole topic --
graphics must work the same way." Today one `src/topics-md/<id>.md` becomes
14 panes via the compiler. This plan gives every topic the SAME move for
graphics: one optional `## Visual` section in the SAME file, and the topic
grows an interactive GPU pane. No sidecar files, no per-topic wiring.

## What the audit established (design constraints, not guesses)

- Grammar is a strict whitelist (`tools/compiler/parse_md.mjs:469` lists
  valid headings) -> adding an OPTIONAL `Visual` heading is a safe,
  fail-fast extension; the 46 existing topics are untouched.
- The app is pure globals + `<!--@build:include-->` composition (zero ESM
  under `src/scripts`) -> per-topic visual config must be emitted as
  `TOPIC_<PREFIX>_VISUAL`, exactly like every other pane global.
- The trainer framework is ESM (`visual-trainer/src/framework/`) -> it
  enters the app as ONE generated IIFE bundle exposing a single global
  (`VisualKit`), built with esbuild `charset: 'ascii'` so `ascii_guard`
  passes, no top-level declarations so `global_collisions` passes, plain
  script so `syntax_check` passes.
- Panes are custom elements routed by token (`shell.js` tabKeys q..o) ->
  the visual pane is a 10th token (`viz`) whose tab renders ONLY when the
  current topic declares `TOPIC_<P>_VISUAL`.

## Authoring spec (what enhancing a topic looks like)

Tier 1 -- config only, inside the topic's own md:

    ## Visual
    mode: queue-flow
    lanes: 6
    labels: { src: producers, queue: partitions, sink: consumers }
    params: { rate: 120, sinks: 3, capacity: 30 }
    stories:
      - name: Spike, then scale out
        steps:
          - { t: 0, cap: "Steady: 60 in, capacity 90." }
          - { t: 3, cap: "Spike 3x -- queues back up.", set: { rate: 180 } }
          - { t: 9, cap: "Scale out -- rebalance, then drain.", set: { sinks: 4 } }

The compiler validates the block against the mode registry manifest at
build time (unknown mode / bad param = build error, same fail-fast feel as
the rest of the grammar) and emits `TOPIC_<P>_VISUAL`.

Tier 2 -- new capability = one folder, mirroring "one md = one topic":
`visual-trainer/src/modes/<mode>/{sim.js, invariants.mjs, scene.js?}` per
the FRAMEWORK.md contract (pure sim + tested invariants first). Building
the bundle registers it; every topic can then use it as Tier-1 config.

## Runtime

`deep-visual` element: lazy -- creates the WebGL2 renderer on first tab
visit, disposes on leave (one GL context alive; the 4.6 MB app grows by a
~500 KB kit, acceptable for a file:// artifact). Sim/render separation,
2D-only, story driver, and the verify harness all come from the kit.

## Phases -- status: P0 + P1 SHIPPED 2026-07-08 (gate green, smoke 9/9)

- [DONE] P0 kit + skeleton (no topic changed, gate must stay green): esbuild IIFE
  step wired into `npm run build` before vite; `deep-visual` element +
  conditional tab; empty registry manifest path proven. ~1 session.
- [DONE] P1 grammar + first topic: `Visual` heading in parse_md whitelist, a
  `visual.mjs` emitter, aggregator include, registry validation; enhance
  `kafka-internals.md` as consumer #1 (config reuses the pilot mode).
  Compiler proof suites gain a visual fixture. ~1-2 sessions.
- P2 authoring docs + Claude Code polish loop on kit primitives (polish
  once, every mode inherits). Owner's eyes are the QA of record; the
  headless harness is the regression net.
- P3 primitives on demand: ring-remap, state-flow, trailing-cursor, heat
  grid -- each unlocks a family of topics, built only when a topic wants
  it (law: no decoration; the 9-pass research stands).

## Rollout reality

Every topic CAN declare a visual after P1. Roughly 12-15 SHOULD (dynamic
concepts: kafka-internals, backpressure/streams, consistent-hashing,
rate-limiting, load-balancing, autoscaling, replication/consistency,
sharding hot-key, retries, circuit-breaking, leader-election, caching).
Static-concept topics stay text+mermaid -- forced motion is negative value.

## What stays

The standalone single-file pilot remains (same sources, separate build):
it is the demo artifact and the resume line. `visual-trainer/` stays the
canonical home of kit source; `src/scripts/visuals/kit.js` is generated.
