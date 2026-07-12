# Candidate modes (GPU-accelerated 2D concept trainers)

LAW: pilot-first. Mode 1 must pass human-eye review and beat the deepdive
app's text+mermaid treatment before ANY other mode is built (CLAUDE.md law 5).
Every mode = a pure tested sim + a renderer that reads it. 2D only.

LAW: a mode is a CLAIM ABOUT A SYSTEM, not a picture. Its invariants
(test/sim_invariants.mjs, gated) are its teaching points. Never adopt a mode for
a topic whose behaviour it does not model -- a visual that teaches false systems
intuition is worse than no visual.

## SHIPPED (2 registered modes, one sim: src/sim/queue.js)

0. **queue-flow** -- GENERIC queue: interchangeable workers draining a SHARED
   backlog (thread/worker pool, retry queue, bounded buffer, backpressure).
   Capacity LINEAR in worker count, no cap; adding a worker is free; work is
   conserved across lanes; a slow worker cuts throughput without starving a lane.
   This is the mode the dynamic-concept topics adopt.
1. **kafka-consumer-lag** -- Kafka consumer group ONLY (the original pilot).
   Partition-capped capacity (consumers past the partition count add ZERO) +
   stop-the-world rebalance on any membership change + hot-consumer skew. Both
   caps are TRUE of Kafka and FALSE of every mode-0 system, which is exactly why
   they are not reachable from `queue-flow`: mode identity selects semantics, and
   the manifest does not let a topic set them as params.

   These two started as ONE mode: `queue-flow` bound straight to the Kafka sim,
   so any of the ~12-15 topics slated to adopt it would have shipped a
   simulation claiming that adding a worker freezes the system for 2s and buys
   no throughput. Splitting them is what makes the pipeline safe to expand.

## CANDIDATES (not built)

2. backpressure buffer (producer/consumer/bounded buffer: fill, drain, drop
   vs block). Dynamic: overflow is a rate race. Closest to `queue-flow` -- may
   be config on it rather than a new mode, IF drop/block adds no new physics.
3. consistent-hashing ring rebalance (node join/leave remaps one arc vs
   mod-N remapping nearly everything -- side-by-side). Dynamic: the remap IS
   the lesson.
4. rate limiter (token bucket fill/drain vs sliding window under a burst).
   Dynamic: burst absorption is temporal.
5. load balancing (round-robin vs least-connections under heterogeneous
   backend latency; watch queues skew). Dynamic: imbalance emerges over time.
   NOT `queue-flow`: its lesson is emergent IMBALANCE across STICKY per-backend
   queues (an item is committed to a backend at dispatch), and `queue-flow`
   conserves work across lanes by construction -- so imbalance can never appear
   in it. Needs its own sim.
6. circuit breaker (closed -> open -> half-open under a rising error rate;
   probes, recovery). Dynamic: state transitions driven by a moving rate.
7. replication lag / quorum (async replicas trailing a primary; R+W>N read
   overlap visual). Dynamic: lag is a moving gap.
8. sharding hot key (zipf traffic onto hashed shards; one shard glows/backs
   up; suffix-split fix). Dynamic: skew accumulates.
9. autoscaling feedback loop (queue depth -> scale-out with provisioning
   delay -> oscillation/flapping vs damped). Dynamic: control-loop behavior.
10. retry storm (synchronized retries thundering-herd vs exponential backoff
    + jitter spreading load). Dynamic: the herd is a timing phenomenon.
11. cache eviction heat (LRU/LFU under a zipf stream; hit-rate readout).
    Dynamic: heat decays.
12. leader election failover (heartbeats, timeout, election, fencing the old
    leader). Dynamic: liveness is temporal. Reuses stall treatment.

Modes 2, 9, 10 largely reuse the pilot's queue/rate primitives -- cheapest
next if the pilot proves value.
