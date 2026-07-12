// Pure, deterministic simulation of a queue under load: producers -> lanes ->
// sinks. No rendering, no DOM, no randomness. Fixed-dt ticks.
// Unit-tested by test/sim_invariants.mjs -- the invariants ARE the teaching
// points the modes exist to convey, so a violated invariant does not mean "a
// test is red", it means THE VISUAL IS TEACHING SOMETHING FALSE.
//
// ONE sim, TWO capacity models. They are not cosmetic variants: they give
// OPPOSITE answers to the single most common thing a learner will do with this
// simulation, which is drag the sink slider up.
//
//   'shared' (THE DEFAULT) -- a pool of interchangeable workers draining a
//     shared backlog: a thread pool, a worker pool, a retry queue, the drain
//     side of a bounded buffer. Its truths:
//       - capacity is LINEAR in the sink count, with NO cap. A 7th worker on 6
//         queues is a 7th worker, not a spectator.
//       - no sink is ever structurally idle: they all pull from the same work.
//       - work is CONSERVED: capacity a lane cannot absorb (its queue ran dry)
//         spills to lanes that still have work.
//       - a slow worker cuts TOTAL throughput but skews no individual lane,
//         because the others simply take the items it did not.
//       - adding a worker costs NOTHING. Nothing stops the world.
//
//   'partitioned' -- a Kafka consumer group. Every lane has exactly ONE owner:
//       - consumers beyond the partition count own nothing and add ZERO
//         capacity (partition count caps group parallelism).
//       - a slow owner starves ITS partitions only -- hot-consumer skew.
//     Both are TRUE of Kafka and FALSE of every generic queue above.
//
// groupStallSecs -- seconds of STOP-THE-WORLD after any change to the sink
//   count: Kafka's rebalance, where the entire group pauses and lag spikes even
//   though capacity was always sufficient. DEFAULT 0, because a thread pool does
//   not freeze when you add a thread.
//
// WHY THIS FILE IS SHAPED THIS WAY: the two Kafka behaviours used to be
// unconditional, inside a sim wired to a mode called `queue-flow`. Every topic
// that adopted that generic-sounding mode -- and ~12-15 are slated to -- would
// have shipped a simulation asserting that adding a worker freezes the system
// and buys no throughput. Both flags now default to the honest generic answer,
// and the Kafka answers are selected by MODE IDENTITY (see ../modes/), never by
// a flag a topic author can typo, omit, or copy-paste by accident.

export const DEFAULTS = {
  lanes: 6,
  producerRate: 120,      // units/s total, split evenly across lanes
  sinks: 3,
  sinkCapacity: 30,       // units/s per sink
  capacityModel: 'shared',
  groupStallSecs: 0,
  stallLabel: 'PAUSED',   // status text while stalled (Kafka: 'REBALANCING')
  slowFactor: 0.25,       // capacity multiplier for a degraded sink
};

const EPS = 1e-12;
const posInt = (v, dflt) => Math.max(1, Math.round(Number(v)) || dflt);

export function createSim(overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  if (cfg.capacityModel !== 'shared' && cfg.capacityModel !== 'partitioned') {
    // Fail loudly: a silently-wrong capacity model is exactly the bug this
    // module was rewritten to make impossible.
    throw new Error('queue sim: unknown capacityModel "' + cfg.capacityModel + '"');
  }
  const shared = cfg.capacityModel === 'shared';
  const L = posInt(cfg.lanes, DEFAULTS.lanes);

  const state = {
    t: 0,
    producerRate: cfg.producerRate,
    sinks: posInt(cfg.sinks, DEFAULTS.sinks),
    sinkCapacity: cfg.sinkCapacity,
    slowSink: -1,                        // index of the degraded sink, -1 = none
    stallRemaining: 0,                   // seconds of stop-the-world left
    lanes: Array.from({ length: L }, (_, id) => ({
      id, lag: 0, produced: 0, consumed: 0, sink: -1,
    })),
  };

  // OWNERSHIP -- partitioned only. Round-robin lane -> owner; with sinks > lanes
  // the sinks past the lane count own nothing (invariant K3).
  // SHARED HAS NO OWNERSHIP AT ALL, and says so with sink = -1, so that nothing
  // downstream can mistake a rendering hint for a capacity claim. (The renderer
  // routes shared-mode particles round-robin across every sink instead.)
  function assign() {
    for (const ln of state.lanes) ln.sink = shared ? -1 : ln.id % state.sinks;
  }
  assign();

  // Structural idleness: a sink that CANNOT do work however deep the backlog
  // gets. Only ownership can create one. In the shared model every sink pulls
  // from the same backlog, so a structurally idle sink does not exist -- and the
  // renderer must therefore never draw one as a hollow "idle" ring.
  function sinkIdle(i) {
    if (shared || i < 0 || i >= state.sinks) return false;
    for (const ln of state.lanes) if (ln.sink === i) return false;
    return true;
  }
  function idleSinks() {
    let n = 0;
    for (let i = 0; i < state.sinks; i++) if (sinkIdle(i)) n += 1;
    return n;
  }

  function capacityOf(i) {
    const base = state.sinkCapacity;
    return i === state.slowSink ? base * cfg.slowFactor : base;
  }

  function effectiveCapacity() {
    let sum = 0;
    for (let i = 0; i < state.sinks; i++) {
      // PARTITIONED: a sink owning no lane contributes NOTHING -- the partition
      // cap (K3). SHARED: every sink contributes -- capacity is linear (G1).
      if (shared || !sinkIdle(i)) sum += capacityOf(i);
    }
    return sum;
  }

  const stalled = () => state.stallRemaining > 0;
  const totalLag = () => state.lanes.reduce((s, ln) => s + ln.lag, 0);

  function setSinkCount(n) {
    n = Math.max(1, Math.round(n));
    if (n === state.sinks) return;
    state.sinks = n;
    if (state.slowSink >= n) state.slowSink = -1;
    assign();
    // KAFKA: the whole group stops while partitions are reassigned.
    // GENERIC: groupStallSecs is 0, so this is a no-op -- adding a worker to a
    // pool is free, which is the truth for a pool and a lie for a group.
    state.stallRemaining = cfg.groupStallSecs;
  }

  // --- PARTITIONED tick: preserved verbatim from the original Kafka sim. -------
  // Every lane is drained ONLY by its owner, at that owner's capacity split
  // across the lanes it owns. An owner with no lanes drains nothing; a slow owner
  // starves its own lanes and nobody else's. The operation order here is load-
  // bearing: test/sim_invariants.mjs asserts this reproduces the pre-change
  // trajectory of the shipped kafka-internals visual bit for bit.
  function tickPartitioned(dt, perLaneIn, frozen) {
    const per = Array(state.sinks).fill(0);
    for (const ln of state.lanes) per[ln.sink] += 1;
    for (const ln of state.lanes) {
      const inflow = perLaneIn * dt;
      ln.produced += inflow;
      ln.lag += inflow;
      if (frozen) continue;                                 // rebalance: nobody consumes
      const share = capacityOf(ln.sink) / per[ln.sink];     // units/s -> this lane
      const take = Math.min(ln.lag, share * dt);
      ln.lag -= take;
      ln.consumed += take;
    }
  }

  // --- SHARED tick: one backlog, interchangeable workers. ----------------------
  // WORK-CONSERVING by water-filling: split the pool's budget evenly across the
  // lanes that still have backlog, then redistribute whatever the lanes that ran
  // dry did not use. Without the redistribution step, a pool draining one hot
  // lane would run at 1/lanes of its real throughput -- which would quietly
  // reintroduce a capacity lie of its own.
  // Terminates in <= lanes passes: each pass either spends the whole budget or
  // empties at least one lane.
  function tickShared(dt, perLaneIn, frozen) {
    for (const ln of state.lanes) {
      const inflow = perLaneIn * dt;
      ln.produced += inflow;
      ln.lag += inflow;
    }
    if (frozen) return;
    let budget = effectiveCapacity() * dt;                  // N x capacity: LINEAR, uncapped
    let active = state.lanes.filter((ln) => ln.lag > EPS);
    while (budget > EPS && active.length > 0) {
      const share = budget / active.length;
      const next = [];
      let used = 0;
      for (const ln of active) {
        const take = Math.min(ln.lag, share);
        ln.lag -= take;
        ln.consumed += take;
        used += take;
        if (ln.lag > EPS) next.push(ln);
      }
      budget -= used;
      if (next.length === active.length) break;             // all took a full share: budget spent
      active = next;
    }
  }

  function tick(dt) {
    state.t += dt;
    const perLaneIn = state.producerRate / L;
    const frozen = stalled();
    if (frozen) state.stallRemaining = Math.max(0, state.stallRemaining - dt);
    if (shared) tickShared(dt, perLaneIn, frozen);
    else tickPartitioned(dt, perLaneIn, frozen);
  }

  return {
    cfg,
    state,
    shared,                              // renderers branch on this, never on a mode id
    tick,
    totalLag,
    effectiveCapacity,
    sinkIdle,
    idleSinks,
    stalled,
    setSinkCount,
    setProducerRate: (r) => { state.producerRate = Math.max(0, r); },
    setSinkCapacity: (c) => { state.sinkCapacity = Math.max(1, c); },
    setSlowSink: (i) => { state.slowSink = i; },
    status: () =>
      (stalled() ? cfg.stallLabel
        : state.producerRate > effectiveCapacity() + 1e-9 ? 'LAG GROWING'
          : totalLag() > 1 ? 'DRAINING'
            : 'STEADY'),
  };
}
