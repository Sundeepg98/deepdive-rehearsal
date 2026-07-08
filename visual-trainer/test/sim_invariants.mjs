// Invariant tests for the kafka_lag simulation. Plain node, no framework.
// Run: node test/sim_invariants.mjs   (exit 0 = all pass)
// Each invariant is a TEACHING POINT: if the sim violates one, the mode
// would teach something false. These must pass before any visual work.

import { createSim } from '../src/sim/kafka_lag.js';

const DT = 1 / 30;
let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  PASS  ' + name); }
  else { failures += 1; console.log('  FAIL  ' + name + '  -- ' + detail); }
}
function run(sim, seconds) { const n = Math.round(seconds / DT); for (let i = 0; i < n; i++) sim.tick(DT); }

// --- 1. DRAIN: capacity > rate -> lag drains to ~0 -------------------------
{
  const sim = createSim({ producerRate: 200, consumerCount: 3, consumerCapacity: 30 });
  run(sim, 5);                       // build a backlog (200 in vs 90 out)
  const backlog = sim.totalLag();
  sim.setProducerRate(60);           // now 60 in vs 90 out -> must drain
  run(sim, 40);
  check('drain: lag -> ~0 when capacity (90) > rate (60)',
    backlog > 400 && sim.totalLag() < 2,
    'backlog=' + backlog.toFixed(1) + ' final=' + sim.totalLag().toFixed(2));
}

// --- 2. GROW: rate > capacity -> lag grows at (rate - capacity) ------------
{
  const sim = createSim({ producerRate: 120, consumerCount: 2, consumerCapacity: 30 });
  run(sim, 10);                      // 120 in vs 60 out for 10s -> ~600
  const lag = sim.totalLag();
  check('grow: lag ~= (rate - capacity) * t = 600',
    Math.abs(lag - 600) < 30,
    'lag=' + lag.toFixed(1));
}

// --- 3. IDLE CONSUMERS: consumers beyond partition count add NOTHING -------
{
  const mk = (c) => createSim({ partitions: 6, producerRate: 300, consumerCount: c, consumerCapacity: 30 });
  const s6 = mk(6), s9 = mk(9), s3 = mk(3);
  run(s6, 10); run(s9, 10); run(s3, 10);
  check('idle: lag(C=9) == lag(C=6) with P=6 (consumers 7..9 idle)',
    Math.abs(s9.totalLag() - s6.totalLag()) < 1,
    'C6=' + s6.totalLag().toFixed(1) + ' C9=' + s9.totalLag().toFixed(1));
  check('idle: effectiveCapacity(C=9) == effectiveCapacity(C=6) == 180',
    Math.abs(s9.effectiveCapacity() - 180) < 1e-9 && Math.abs(s6.effectiveCapacity() - 180) < 1e-9,
    'cap6=' + s6.effectiveCapacity() + ' cap9=' + s9.effectiveCapacity());
  check('idle: but C=3 (capacity 90) grows strictly faster',
    s3.totalLag() > s6.totalLag() + 500,
    'C3=' + s3.totalLag().toFixed(1) + ' C6=' + s6.totalLag().toFixed(1));
}

// --- 4. REBALANCE STALL: group change stalls consumption, lag spikes -------
{
  const sim = createSim({ producerRate: 60, consumerCount: 3, consumerCapacity: 30 });
  run(sim, 10);                      // steady: capacity 90 > 60 -> lag ~0
  const before = sim.totalLag();
  sim.setConsumerCount(4);           // triggers 2s stop-the-world rebalance
  run(sim, 2);                       // during stall: 60/s in, 0 out -> ~120
  const duringSpike = sim.totalLag();
  run(sim, 15);                      // capacity now 120 > 60 -> drains
  check('rebalance: steady lag ~0 before the group change',
    before < 2, 'before=' + before.toFixed(2));
  check('rebalance: lag spikes to ~120 during the 2s stall',
    duringSpike > 100 && duringSpike < 140, 'spike=' + duringSpike.toFixed(1));
  check('rebalance: drains back to ~0 after the stall',
    sim.totalLag() < 2, 'final=' + sim.totalLag().toFixed(2));
}

// --- 5. SLOW CONSUMER: skews lag onto ITS partitions only -------------------
{
  const sim = createSim({ producerRate: 60, consumerCount: 3, consumerCapacity: 30 });
  sim.setSlowConsumer(0);            // consumer 0 (owns partitions 0 and 3) at 25%
  run(sim, 15);
  const lags = sim.state.partitions.map((p) => p.lag);
  const slowLags = [lags[0], lags[3]];
  const okLags = [lags[1], lags[2], lags[4], lags[5]];
  check('slow consumer: its partitions accumulate lag (> 50 each)',
    slowLags.every((l) => l > 50), 'slow=' + slowLags.map((l) => l.toFixed(1)).join(','));
  check('slow consumer: other partitions stay ~0 (skew, not uniform growth)',
    okLags.every((l) => l < 2), 'ok=' + okLags.map((l) => l.toFixed(1)).join(','));
}

// --- 6. DETERMINISM: identical configs -> identical trajectories ------------
{
  const a = createSim(), b = createSim();
  run(a, 7); run(b, 7);
  check('determinism: two sims, same config, same ticks -> same lag',
    a.totalLag() === b.totalLag(),
    'a=' + a.totalLag() + ' b=' + b.totalLag());
}

console.log(failures === 0 ? 'SIM INVARIANTS: ALL PASS' : 'SIM INVARIANTS: ' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
