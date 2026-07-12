// kafka-consumer-lag -- a Kafka consumer group, and ONLY a Kafka consumer group.
//
// Two behaviours here are TRUE of Kafka and FALSE of every generic queue. They
// live behind this name, instead of behind a generic one, precisely so that no
// topic can inherit them by accident:
//
//   1. PARTITION-CAPPED CAPACITY. Consumers beyond the partition count own no
//      partition, so they add ZERO throughput -- the scene draws them as hollow
//      rings. (Partition count caps consumer-group parallelism: the interview
//      line this topic exists to teach.)
//   2. STOP-THE-WORLD REBALANCE. ANY membership change pauses the WHOLE group
//      for ~2s, and lag spikes even though capacity was always sufficient.
//
// A thread pool, worker pool, retry queue, bounded buffer or load balancer does
// NEITHER. Those adopt `queue-flow`, whose semantics are the honest generic ones.
//
// Everything user-visible in this file -- control labels, readout labels, the
// 'msg/s' unit, the REBALANCING badge and banner text -- is preserved verbatim
// from the pre-generalisation mode. test/sim_invariants.mjs replays this mode
// against a trajectory captured from the OLD sim and asserts the digests match
// exactly, so the one visual that already shipped correct still ships correct.
import { makeQueueMode } from '../queue-base.js';

export const kafkaConsumerLagMode = makeQueueMode({
  id: 'kafka-consumer-lag',
  semantics: { capacityModel: 'partitioned', groupStallSecs: 2, stallLabel: 'REBALANCING' },
  defaults: { lanes: 6, rate: 120, sinks: 3, capacity: 30 },
  controls: [
    { key: 'rate', label: 'Rate (msg/s)', min: 0, max: 400, step: 10,
      get: (s) => s.state.producerRate, set: 'rate' },
    { key: 'sinks', label: 'Consumers', min: 1, max: 9, step: 1,
      get: (s) => s.state.sinks, set: 'sinks' },
    { key: 'capacity', label: 'Capacity each', min: 10, max: 60, step: 5,
      get: (s) => s.state.sinkCapacity, set: 'capacity' },
  ],
  readouts: (sim) => [
    { label: 'Total lag', value: String(Math.round(sim.totalLag())) },
    { label: 'Capacity', value: Math.round(sim.effectiveCapacity()) + ' msg/s' },
    // Was Math.max(0, consumers - partitions) computed in the adapter -- i.e. the
    // partition cap re-derived OUTSIDE the sim that owns it. Now the sim answers.
    { label: 'Idle', value: String(sim.idleSinks()) },
  ],
  status: (sim) => {
    const st = sim.status();
    return {
      text: st,
      tone: st === 'REBALANCING' ? 'warn' : st === 'LAG GROWING' ? 'bad' : 'ok',
      banner: st === 'REBALANCING'
        ? 'REBALANCING -- consumption paused (' + sim.state.stallRemaining.toFixed(1) + 's)' : null,
    };
  },
});
