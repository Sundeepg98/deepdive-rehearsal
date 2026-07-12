// queue-flow -- the GENERIC queue mode: interchangeable workers draining a
// shared backlog. This is the mode the ~12-15 dynamic topics in
// VISUAL_PIPELINE.md are meant to adopt (backpressure, retry storms,
// autoscaling, rate limiting, worker/thread pools, bounded buffers).
//
// WHAT IT ASSERTS (and what the sim invariants lock in):
//   - adding a worker adds capacity, LINEARLY, with no cap;
//   - adding a worker costs nothing: no stall, no stop-the-world;
//   - work is shared, so no lane starves and no worker is ever a spectator;
//   - a slow worker cuts total throughput; the others absorb its share.
//
// WHAT IT DOES *NOT* MODEL -- adopt a different mode, do not bend this one:
//   - a Kafka consumer group -> `kafka-consumer-lag`. Ownership caps
//     parallelism and membership changes stop the world; both are false here.
//   - sticky per-backend queues (a load balancer that COMMITS an item to one
//     backend at dispatch). There the lesson is emergent IMBALANCE, which this
//     mode cannot show, because it conserves work across lanes by construction.
//
// This mode used to BE the Kafka sim wearing generic words: `sinks` triggered a
// 2s stop-the-world rebalance and workers past the lane count added zero
// capacity. Both were flatly false for everything on the adopt list above.
import { makeQueueMode } from '../queue-base.js';

export const queueFlowMode = makeQueueMode({
  id: 'queue-flow',
  semantics: { capacityModel: 'shared', groupStallSecs: 0, stallLabel: 'PAUSED' },
  defaults: { lanes: 6, rate: 120, sinks: 3, capacity: 30 },
  controls: [
    { key: 'rate', label: 'Arrival rate (/s)', min: 0, max: 400, step: 10,
      get: (s) => s.state.producerRate, set: 'rate' },
    { key: 'sinks', label: 'Workers', min: 1, max: 9, step: 1,
      get: (s) => s.state.sinks, set: 'sinks' },
    { key: 'capacity', label: 'Capacity each', min: 10, max: 60, step: 5,
      get: (s) => s.state.sinkCapacity, set: 'capacity' },
  ],
  readouts: (sim) => [
    { label: 'Backlog', value: String(Math.round(sim.totalLag())) },
    { label: 'Capacity', value: Math.round(sim.effectiveCapacity()) + ' /s' },
    { label: 'Workers', value: String(sim.state.sinks) },
  ],
  // No REBALANCING tone and no banner: this mode cannot stall, so a stall
  // affordance here would be dead UI advertising a behaviour that never happens.
  status: (sim) => {
    const st = sim.status();
    return { text: st, tone: st === 'LAG GROWING' ? 'bad' : 'ok', banner: null };
  },
});
