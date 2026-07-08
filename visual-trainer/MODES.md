# Candidate modes (GPU-accelerated 2D concept trainers)

LAW: pilot-first. Mode 1 must pass human-eye review and beat the deepdive
app's text+mermaid treatment before ANY other mode is built (CLAUDE.md law 5).
Every mode = a pure tested sim + a renderer that reads it. 2D only.

1. kafka consumer lag / backpressure -- PILOT (this repo). Dynamic: rates,
   queues, rebalance stalls, skew are motion by nature.
2. backpressure buffer (producer/consumer/bounded buffer: fill, drain, drop
   vs block). Dynamic: overflow is a rate race. Reuses pilot queue primitives.
3. consistent-hashing ring rebalance (node join/leave remaps one arc vs
   mod-N remapping nearly everything -- side-by-side). Dynamic: the remap IS
   the lesson.
4. rate limiter (token bucket fill/drain vs sliding window under a burst).
   Dynamic: burst absorption is temporal.
5. load balancing (round-robin vs least-connections under heterogeneous
   backend latency; watch queues skew). Dynamic: imbalance emerges over time.
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
