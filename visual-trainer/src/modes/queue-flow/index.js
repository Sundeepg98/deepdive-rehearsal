// queue-flow mode adapter: maps the generic authoring vocabulary
// (lanes/rate/sinks/capacity, set patches) onto the kafka-lag sim and the
// existing scene. The sim's invariants remain the tested source of truth.
import { createSim } from '../../sim/kafka_lag.js';
import { createScene } from '../../render/scene.js';

export const queueFlowMode = {
  id: 'queue-flow',
  createSim(params = {}) {
    return createSim({
      partitions: params.lanes ?? 6,
      producerRate: params.rate ?? 120,
      consumerCount: params.sinks ?? 3,
      consumerCapacity: params.capacity ?? 30,
    });
  },
  buildScene(canvas, sim) { return createScene(canvas, sim); },
  apply(sim, set = {}) {
    if (set.rate !== undefined) sim.setProducerRate(set.rate);
    if (set.sinks !== undefined) sim.setConsumerCount(set.sinks);
    if (set.capacity !== undefined) sim.setConsumerCapacity(set.capacity);
    if (set.slow !== undefined) {
      sim.setSlowConsumer(set.slow === true ? 0 : set.slow === false ? -1 : set.slow);
    }
  },
  reset(sim, params = {}) {
    this.apply(sim, { rate: params.rate ?? 120, capacity: params.capacity ?? 30, slow: false });
    if (sim.state.consumerCount !== (params.sinks ?? 3)) sim.setConsumerCount(params.sinks ?? 3);
    sim.state.rebalanceRemaining = 0;
    for (const p of sim.state.partitions) p.lag = 0;
  },
  controls: [
    { key: 'rate', label: 'Rate (msg/s)', min: 0, max: 400, step: 10,
      get: (s) => s.state.producerRate, set: 'rate' },
    { key: 'sinks', label: 'Consumers', min: 1, max: 9, step: 1,
      get: (s) => s.state.consumerCount, set: 'sinks' },
    { key: 'capacity', label: 'Capacity each', min: 10, max: 60, step: 5,
      get: (s) => s.state.consumerCapacity, set: 'capacity' },
  ],
  readouts: (sim) => [
    { label: 'Total lag', value: String(Math.round(sim.totalLag())) },
    { label: 'Capacity', value: Math.round(sim.effectiveCapacity()) + ' msg/s' },
    { label: 'Idle', value: String(Math.max(0, sim.state.consumerCount - sim.state.partitions.length)) },
  ],
  status: (sim) => {
    const st = sim.status();
    return { text: st, tone: st === 'REBALANCING' ? 'warn' : st === 'LAG GROWING' ? 'bad' : 'ok',
      banner: st === 'REBALANCING'
        ? 'REBALANCING -- consumption paused (' + sim.state.rebalanceRemaining.toFixed(1) + 's)' : null };
  },
};
