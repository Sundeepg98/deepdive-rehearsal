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

## Choosing a mode -- semantics, not decoration

**A mode is a claim about how a system behaves. Picking the wrong one ships a
simulation that teaches a falsehood, which is worse than shipping no visual.**
The registry (`visual-trainer/src/manifest.js`) is the contract:

| mode | models | asserts |
|---|---|---|
| `queue-flow` | interchangeable workers draining a **shared backlog**: thread pool, worker pool, retry queue, bounded buffer, backpressure | capacity is **linear** in the worker count (uncapped); adding a worker is **free** (no stall); work is **conserved** across lanes; a slow worker cuts total throughput but starves no lane |
| `kafka-consumer-lag` | a **Kafka consumer group** | consumers beyond the partition count own nothing and add **zero** capacity; **any** membership change **stops the world** ~2s; a slow owner starves **its** partitions only |

These two disagree about the most common thing a learner does here -- drag the
worker slider up. Both are right about their own system and wrong about the
other's, so **do not reach for `kafka-consumer-lag` because a topic mentions
queues**; reach for it when the topic *is* a consumer group.

Simulation semantics are chosen by **naming a mode**, never by a parameter:
`capacityModel` / `groupStallSecs` are deliberately absent from the manifest's
`params` whitelist, so a topic *cannot* hand `queue-flow` a partition cap or a
rebalance stall -- the compiler rejects the key and the build fails. (This is
why `queue-flow` used to be a hazard: it was Kafka's sim under a generic name,
so a rate-limiting or worker-pool topic adopting it would have silently taught
that adding a worker freezes the system and buys no throughput.)

If a topic's motion is neither of these -- e.g. a load balancer with **sticky**
per-backend queues, whose lesson is emergent *imbalance* -- that is a Tier-2 new
mode, not a bent existing one.

## Authoring spec (what enhancing a topic looks like)

Tier 1 -- config only, inside the topic's own md (one fenced `json` block):

    ## Visual

    ```json
    {
      "mode": "queue-flow",
      "labels": { "src": "producers", "queue": "queues", "sink": "workers" },
      "params": { "lanes": 6, "rate": 120, "sinks": 3, "capacity": 30 },
      "stories": [
        { "name": "Spike, then scale out",
          "steps": [
            { "t": 0, "cap": "Steady: 60 in, capacity 90.", "set": { "rate": 60 } },
            { "t": 3, "cap": "Spike 3x -- queues back up.", "set": { "rate": 180 } },
            { "t": 9, "cap": "Add a 4th worker -- capacity 120, immediately.", "set": { "sinks": 4 } },
            { "t": 15 }
          ] }
      ]
    }
    ```

Note the caption at `t: 9`. Under `queue-flow` the new worker helps *at once*.
Writing "rebalance, then drain" there would narrate a stall this mode does not
have -- captions are claims too, and they must match the mode's semantics.

The compiler validates the block against the mode registry manifest at
build time (unknown mode / bad param / unknown story `set` key = build error,
same fail-fast feel as the rest of the grammar) and emits `TOPIC_<P>_VISUAL`.

Tier 2 -- new capability = one folder, mirroring "one md = one topic":
`visual-trainer/src/modes/<mode>/index.js` per the FRAMEWORK.md contract (pure
sim + tested invariants FIRST -- `visual-trainer/test/sim_invariants.mjs`, which
the gate runs). Register it in `src/manifest.js` + `src/kit.js`; every topic can
then use it as Tier-1 config.

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

But "SHOULD adopt a visual" is not "SHOULD adopt `queue-flow`". Of that list
only the shared-backlog ones (backpressure/streams, retries, rate-limiting,
autoscaling, worker pools) are honestly `queue-flow`; `kafka-internals` is
`kafka-consumer-lag`; consistent-hashing, load-balancing, circuit-breaking,
leader-election and caching each need their own sim (see MODES.md) and must NOT
be forced onto a queue mode whose invariants say nothing about them. **Adopting
a mode whose semantics do not match the topic is the one failure this pipeline
must never ship** -- an interview candidate who internalises a false systems
intuition is worse off than one who read plain text.

## What stays

The standalone single-file pilot remains (same sources, separate build):
it is the demo artifact and the resume line. `visual-trainer/` stays the
canonical home of kit source; `src/scripts/visuals/kit.js` is generated.
