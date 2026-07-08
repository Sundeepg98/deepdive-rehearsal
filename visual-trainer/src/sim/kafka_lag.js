// Pure, deterministic simulation of Kafka consumer lag / backpressure.
// No rendering, no DOM, no randomness. Fixed-dt ticks.
// Unit-tested by test/sim_invariants.mjs -- the invariants ARE the teaching
// points this mode exists to convey:
//   1. lag drains when effective capacity > produce rate, grows when below
//   2. consumers beyond the partition count are IDLE and add ZERO capacity
//   3. a consumer-group change causes a stop-the-world rebalance stall
//      during which lag spikes even if capacity is sufficient
//   4. one slow consumer skews lag onto ITS partitions only (hot-consumer skew)
// The renderer may only READ state produced here. Logic never lives in render.

export const DEFAULTS = {
  partitions: 6,
  producerRate: 120,      // msgs/s total, split evenly across partitions
  consumerCount: 3,
  consumerCapacity: 30,   // msgs/s per consumer, split across its partitions
  rebalanceSecs: 2,       // stop-the-world pause when the group changes
  slowFactor: 0.25,       // capacity multiplier for a degraded consumer
};

export function createSim(overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  const P = cfg.partitions;

  const state = {
    t: 0,
    producerRate: cfg.producerRate,
    consumerCount: cfg.consumerCount,
    consumerCapacity: cfg.consumerCapacity,
    slowConsumer: -1,                    // index of degraded consumer, -1 = none
    rebalanceRemaining: 0,               // seconds of stop-the-world left
    partitions: Array.from({ length: P }, (_, id) => ({
      id, lag: 0, produced: 0, consumed: 0, consumer: -1,
    })),
  };

  function assignment() {
    // Round-robin partition -> consumer. With C > P, consumers P..C-1 own
    // nothing: they are idle. This is the point invariant 2 locks in.
    for (const p of state.partitions) p.consumer = p.id % state.consumerCount;
  }
  assignment();

  function partitionsPerConsumer() {
    const n = Array(state.consumerCount).fill(0);
    for (const p of state.partitions) n[p.consumer] += 1;
    return n;
  }

  function capacityOf(c) {
    const base = state.consumerCapacity;
    return c === state.slowConsumer ? base * cfg.slowFactor : base;
  }

  function effectiveCapacity() {
    // Idle consumers (zero partitions) contribute NOTHING.
    const per = partitionsPerConsumer();
    let sum = 0;
    for (let c = 0; c < state.consumerCount; c++) {
      if (per[c] > 0) sum += capacityOf(c);
    }
    return sum;
  }

  function setConsumerCount(n) {
    n = Math.max(1, Math.round(n));
    if (n === state.consumerCount) return;
    state.consumerCount = n;
    if (state.slowConsumer >= n) state.slowConsumer = -1;
    assignment();
    state.rebalanceRemaining = cfg.rebalanceSecs;   // group change => stall
  }

  function tick(dt) {
    state.t += dt;
    const perPartProduce = state.producerRate / P;
    const stalled = state.rebalanceRemaining > 0;
    if (stalled) {
      state.rebalanceRemaining = Math.max(0, state.rebalanceRemaining - dt);
    }
    const per = partitionsPerConsumer();
    for (const p of state.partitions) {
      const inflow = perPartProduce * dt;
      p.produced += inflow;
      p.lag += inflow;
      if (stalled) continue;                        // rebalance: nobody consumes
      const share = capacityOf(p.consumer) / per[p.consumer]; // msgs/s -> this partition
      const take = Math.min(p.lag, share * dt);
      p.lag -= take;
      p.consumed += take;
    }
  }

  const totalLag = () => state.partitions.reduce((s, p) => s + p.lag, 0);

  return {
    cfg,
    state,
    tick,
    totalLag,
    effectiveCapacity,
    setConsumerCount,
    setProducerRate: (r) => { state.producerRate = Math.max(0, r); },
    setConsumerCapacity: (c) => { state.consumerCapacity = Math.max(1, c); },
    setSlowConsumer: (i) => { state.slowConsumer = i; },
    status: () =>
      state.rebalanceRemaining > 0 ? 'REBALANCING'
        : state.producerRate > effectiveCapacity() + 1e-9 ? 'LAG GROWING'
        : totalLag() > 1 ? 'DRAINING'
        : 'STEADY',
  };
}
