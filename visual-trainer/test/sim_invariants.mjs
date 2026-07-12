// Invariant tests for the queue simulation. Plain node, no framework.
// Run: node test/sim_invariants.mjs   (exit 0 = all pass)
//
// EACH INVARIANT IS A TEACHING POINT. If the sim violates one, the mode does not
// "fail a test" -- it TEACHES SOMETHING FALSE to somebody rehearsing for an
// interview. That is why this file is gated (test/check_all.py -> sim_invariants).
//
// Four sections:
//   K  -- KAFKA (partitioned): the consumer-group truths. Unchanged from the
//         original suite; these were correct and must stay correct.
//   G  -- GENERIC (shared pool): the honest queue truths. Several are the exact
//         NEGATION of a K invariant -- which is the whole point. A worker pool
//         that behaved like a consumer group is what this work removed.
//   X  -- CROSS-MODE: the two models must actually DISAGREE. If a refactor ever
//         collapses them back into one, X goes red before a learner sees it.
//   R  -- REGRESSION: kafka-internals is the one topic shipping a visual today
//         and it was CORRECT. Its authored stories are replayed against a
//         trajectory digest captured from the PRE-generalisation sim. Exact
//         match or red -- no eyeballing.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createSim } from '../src/sim/queue.js';
import { queueFlowMode } from '../src/modes/queue-flow/index.js';
import { kafkaConsumerLagMode } from '../src/modes/kafka-consumer-lag/index.js';
import { replayStory } from './replay.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DT = 1 / 30;
let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  PASS  ' + name); }
  else { failures += 1; console.log('  FAIL  ' + name + '  -- ' + detail); }
}
function run(sim, seconds) { const n = Math.round(seconds / DT); for (let i = 0; i < n; i++) sim.tick(DT); }

// Build sims with the EXACT semantics the shipped modes bind -- spread LAST so a
// test cannot accidentally paper over a mode whose semantics regressed.
const kafka = (o = {}) => createSim({ ...o, ...kafkaConsumerLagMode.semantics });
const pool = (o = {}) => createSim({ ...o, ...queueFlowMode.semantics });
const lagsOf = (sim) => sim.state.lanes.map((l) => l.lag);

console.log('--- K: KAFKA consumer group (partitioned + rebalance) -----------------');

// --- K1. DRAIN: capacity > rate -> lag drains to ~0 -------------------------
{
  const sim = kafka({ producerRate: 200, sinks: 3, sinkCapacity: 30 });
  run(sim, 5);                       // build a backlog (200 in vs 90 out)
  const backlog = sim.totalLag();
  sim.setProducerRate(60);           // now 60 in vs 90 out -> must drain
  run(sim, 40);
  check('K1 drain: lag -> ~0 when capacity (90) > rate (60)',
    backlog > 400 && sim.totalLag() < 2,
    'backlog=' + backlog.toFixed(1) + ' final=' + sim.totalLag().toFixed(2));
}

// --- K2. GROW: rate > capacity -> lag grows at (rate - capacity) ------------
{
  const sim = kafka({ producerRate: 120, sinks: 2, sinkCapacity: 30 });
  run(sim, 10);                      // 120 in vs 60 out for 10s -> ~600
  const lag = sim.totalLag();
  check('K2 grow: lag ~= (rate - capacity) * t = 600', Math.abs(lag - 600) < 30, 'lag=' + lag.toFixed(1));
}

// --- K3. IDLE CONSUMERS: consumers beyond the partition count add NOTHING ----
{
  const mk = (c) => kafka({ lanes: 6, producerRate: 300, sinks: c, sinkCapacity: 30 });
  const s6 = mk(6), s9 = mk(9), s3 = mk(3);
  run(s6, 10); run(s9, 10); run(s3, 10);
  check('K3 idle: lag(C=9) == lag(C=6) with P=6 (consumers 7..9 idle)',
    Math.abs(s9.totalLag() - s6.totalLag()) < 1,
    'C6=' + s6.totalLag().toFixed(1) + ' C9=' + s9.totalLag().toFixed(1));
  check('K3 idle: effectiveCapacity(C=9) == effectiveCapacity(C=6) == 180',
    Math.abs(s9.effectiveCapacity() - 180) < 1e-9 && Math.abs(s6.effectiveCapacity() - 180) < 1e-9,
    'cap6=' + s6.effectiveCapacity() + ' cap9=' + s9.effectiveCapacity());
  check('K3 idle: but C=3 (capacity 90) grows strictly faster',
    s3.totalLag() > s6.totalLag() + 500,
    'C3=' + s3.totalLag().toFixed(1) + ' C6=' + s6.totalLag().toFixed(1));
  // The 'Idle' readout used to be re-derived in the mode adapter as
  // max(0, consumers - partitions). The sim owns it now; it must still agree.
  check('K3 idle: idleSinks() == max(0, consumers - partitions) [the shipped readout]',
    s9.idleSinks() === 3 && s6.idleSinks() === 0 && s3.idleSinks() === 0,
    'C9=' + s9.idleSinks() + ' C6=' + s6.idleSinks() + ' C3=' + s3.idleSinks());
}

// --- K4. REBALANCE STALL: group change stalls consumption, lag spikes -------
{
  const sim = kafka({ producerRate: 60, sinks: 3, sinkCapacity: 30 });
  run(sim, 10);                      // steady: capacity 90 > 60 -> lag ~0
  const before = sim.totalLag();
  sim.setSinkCount(4);               // triggers 2s stop-the-world rebalance
  run(sim, 2);                       // during stall: 60/s in, 0 out -> ~120
  const duringSpike = sim.totalLag();
  run(sim, 15);                      // capacity now 120 > 60 -> drains
  check('K4 rebalance: steady lag ~0 before the group change', before < 2, 'before=' + before.toFixed(2));
  check('K4 rebalance: lag spikes to ~120 during the 2s stall',
    duringSpike > 100 && duringSpike < 140, 'spike=' + duringSpike.toFixed(1));
  check('K4 rebalance: drains back to ~0 after the stall', sim.totalLag() < 2, 'final=' + sim.totalLag().toFixed(2));
}

// --- K5. SLOW CONSUMER: skews lag onto ITS partitions only -------------------
{
  const sim = kafka({ producerRate: 60, sinks: 3, sinkCapacity: 30 });
  sim.setSlowSink(0);                // consumer 0 (owns partitions 0 and 3) at 25%
  run(sim, 15);
  const lags = lagsOf(sim);
  const slowLags = [lags[0], lags[3]];
  const okLags = [lags[1], lags[2], lags[4], lags[5]];
  check('K5 slow consumer: its partitions accumulate lag (> 50 each)',
    slowLags.every((l) => l > 50), 'slow=' + slowLags.map((l) => l.toFixed(1)).join(','));
  check('K5 slow consumer: other partitions stay ~0 (skew, not uniform growth)',
    okLags.every((l) => l < 2), 'ok=' + okLags.map((l) => l.toFixed(1)).join(','));
}

// --- K6. DETERMINISM --------------------------------------------------------
{
  const a = kafka(), b = kafka();
  run(a, 7); run(b, 7);
  check('K6 determinism: two sims, same config, same ticks -> same lag',
    a.totalLag() === b.totalLag(), 'a=' + a.totalLag() + ' b=' + b.totalLag());
}

console.log('--- G: GENERIC worker pool (shared backlog) ---------------------------');

// --- G1. LINEAR CAPACITY, NO PARTITION CAP ----------------------------------
// The headline fix. Under the old sim this returned 180 -- it asserted that
// workers 7, 8 and 9 of a nine-worker pool contribute nothing. For a thread
// pool / retry queue / worker pool that is simply false.
{
  const s = pool({ lanes: 6, sinks: 9, sinkCapacity: 30 });
  const s6 = pool({ lanes: 6, sinks: 6, sinkCapacity: 30 });
  const s1 = pool({ lanes: 6, sinks: 1, sinkCapacity: 30 });
  check('G1 capacity is LINEAR in workers, uncapped by lanes (9 x 30 = 270, NOT 180)',
    Math.abs(s.effectiveCapacity() - 270) < 1e-9, 'cap=' + s.effectiveCapacity());
  check('G1 ...and linear below the lane count too (6 -> 180, 1 -> 30)',
    Math.abs(s6.effectiveCapacity() - 180) < 1e-9 && Math.abs(s1.effectiveCapacity() - 30) < 1e-9,
    'cap6=' + s6.effectiveCapacity() + ' cap1=' + s1.effectiveCapacity());
}

// --- G2. WORKERS PAST THE LANE COUNT REALLY DO DRAIN MORE -------------------
// Capacity is a number; this checks the number is not a lie. Kafka's K3 asserts
// these two are EQUAL. Here the 9-worker pool must be strictly better.
{
  const s6 = pool({ lanes: 6, producerRate: 300, sinks: 6, sinkCapacity: 30 });
  const s9 = pool({ lanes: 6, producerRate: 300, sinks: 9, sinkCapacity: 30 });
  run(s6, 10); run(s9, 10);          // 300 in; 180 out vs 270 out
  check('G2 more workers than lanes -> strictly LESS backlog (Kafka says equal)',
    s9.totalLag() < s6.totalLag() - 500,
    'W6=' + s6.totalLag().toFixed(1) + ' W9=' + s9.totalLag().toFixed(1));
  check('G2 backlog matches (rate - capacity) * t: W6 ~1200, W9 ~300',
    Math.abs(s6.totalLag() - 1200) < 40 && Math.abs(s9.totalLag() - 300) < 40,
    'W6=' + s6.totalLag().toFixed(1) + ' W9=' + s9.totalLag().toFixed(1));
}

// --- G3. NO STOP-THE-WORLD ON SCALE-OUT -------------------------------------
// Adding a thread to a thread pool does not freeze the pool for two seconds.
{
  const sim = pool({ producerRate: 60, sinks: 3, sinkCapacity: 30 });
  run(sim, 10);                      // steady, capacity 90 > 60
  const before = sim.totalLag();
  sim.setSinkCount(4);
  let peak = 0, everStalled = false;
  for (let i = 0; i < Math.round(3 / DT); i++) {
    sim.tick(DT);
    peak = Math.max(peak, sim.totalLag());
    if (sim.stalled()) everStalled = true;
  }
  check('G3 adding a worker NEVER stalls the pool (Kafka stalls 2s)',
    !everStalled && sim.state.stallRemaining === 0, 'stallRemaining=' + sim.state.stallRemaining);
  check('G3 ...and lag does NOT spike (Kafka spikes to ~120; pool stays ~0)',
    before < 2 && peak < 2, 'before=' + before.toFixed(2) + ' peak=' + peak.toFixed(2));
}

// --- G4. WORK-CONSERVING: the pool serves ONE backlog -----------------------
// Backlog piled on a single lane must be drained by the WHOLE pool at full
// capacity -- not at 1/lanes of it. A per-lane split would quietly under-report
// throughput by 6x here, which is a capacity lie of its own.
{
  const sim = pool({ lanes: 6, producerRate: 0, sinks: 3, sinkCapacity: 30 });   // capacity 90/s
  sim.state.lanes[2].lag = 900;                                                  // all of it on one lane
  run(sim, 5);                       // 90/s * 5s = 450 drained if work-conserving
  const left = sim.totalLag();
  check('G4 work-conserving: one hot lane drains at FULL pool capacity (900 -> ~450 in 5s)',
    Math.abs(left - 450) < 5, 'left=' + left.toFixed(1) + ' (a per-lane split would leave ~825)');
  const drained = sim.state.lanes.reduce((s, l) => s + l.consumed, 0);
  check('G4 ...and consumed counters account for exactly what left the queues',
    Math.abs(drained - 450) < 5, 'consumed=' + drained.toFixed(1));
}

// --- G5. SLOW WORKER: cuts throughput, does NOT skew lanes ------------------
// The exact opposite of K5. In a shared pool the other workers absorb the items
// the slow one did not take, so no single queue starves.
{
  const sim = pool({ lanes: 6, producerRate: 60, sinks: 3, sinkCapacity: 30 });
  sim.setSlowSink(0);                // pool capacity 90 -> 30*0.25 + 30 + 30 = 67.5
  check('G5 slow worker cuts TOTAL capacity (90 -> 67.5)',
    Math.abs(sim.effectiveCapacity() - 67.5) < 1e-9, 'cap=' + sim.effectiveCapacity());
  run(sim, 15);                      // 60 in vs 67.5 out -> still drains, evenly
  const lags = lagsOf(sim);
  const spread = Math.max(...lags) - Math.min(...lags);
  check('G5 slow worker does NOT skew any lane (Kafka skews onto ITS partitions)',
    spread < 1e-6, 'lane lags=' + lags.map((l) => l.toFixed(2)).join(','));
}

// --- G6. NO STRUCTURAL IDLENESS + NO OWNERSHIP ------------------------------
// The renderer draws a hollow ring from sinkIdle(). In a pool nobody is a
// spectator, so nobody may be drawn as one.
{
  const sim = pool({ lanes: 6, sinks: 9, sinkCapacity: 30 });
  const anyIdle = [...Array(9).keys()].some((i) => sim.sinkIdle(i));
  check('G6 no worker is ever structurally idle, even 9 workers on 6 lanes',
    !anyIdle && sim.idleSinks() === 0, 'idleSinks=' + sim.idleSinks());
  check('G6 lanes carry NO owner (sink = -1): ownership is a Kafka concept only',
    sim.state.lanes.every((l) => l.sink === -1), 'sinks=' + sim.state.lanes.map((l) => l.sink).join(','));
}

// --- G7. GROW / DRAIN / DETERMINISM in the pool -----------------------------
{
  const sim = pool({ lanes: 6, producerRate: 200, sinks: 3, sinkCapacity: 30 });
  run(sim, 10);                      // 200 in vs 90 out -> ~1100
  const grown = sim.totalLag();
  sim.setProducerRate(30);           // 30 in vs 90 out -> drains
  run(sim, 30);
  check('G7 pool grows at (rate - capacity) then drains to ~0',
    Math.abs(grown - 1100) < 40 && sim.totalLag() < 2,
    'grown=' + grown.toFixed(1) + ' final=' + sim.totalLag().toFixed(2));
  const a = pool(), b = pool();
  run(a, 7); run(b, 7);
  check('G7 determinism: same config, same ticks -> same backlog',
    a.totalLag() === b.totalLag(), 'a=' + a.totalLag() + ' b=' + b.totalLag());
}

console.log('--- X: the two models must genuinely DISAGREE -------------------------');

// If a future refactor collapses the models back into one, these go red. That is
// the regression this whole change exists to prevent.
{
  const cfg = { lanes: 6, producerRate: 300, sinks: 9, sinkCapacity: 30 };
  const k = kafka({ ...cfg }), p = pool({ ...cfg });
  check('X1 same config, DIFFERENT capacity: kafka 180 (capped) vs pool 270 (linear)',
    Math.abs(k.effectiveCapacity() - 180) < 1e-9 && Math.abs(p.effectiveCapacity() - 270) < 1e-9,
    'kafka=' + k.effectiveCapacity() + ' pool=' + p.effectiveCapacity());

  const k2 = kafka({ producerRate: 60, sinks: 3, sinkCapacity: 30 });
  const p2 = pool({ producerRate: 60, sinks: 3, sinkCapacity: 30 });
  k2.setSinkCount(4); p2.setSinkCount(4);
  check('X2 scale-out: kafka stops the world (2s), the pool does not (0s)',
    k2.stalled() && k2.state.stallRemaining === 2 && !p2.stalled() && p2.state.stallRemaining === 0,
    'kafka=' + k2.state.stallRemaining + ' pool=' + p2.state.stallRemaining);

  check('X3 the generic mode is the DEFAULT: bare createSim() is a shared pool',
    createSim().shared === true && createSim({ lanes: 6, sinks: 9 }).effectiveCapacity() === 270,
    'shared=' + createSim().shared);

  let threw = false;
  try { createSim({ capacityModel: 'nonsense' }); } catch (e) { threw = true; }
  check('X4 an unknown capacityModel FAILS LOUDLY (never silently picks one)', threw, 'no throw');
}

console.log('--- R: kafka-internals must render EXACTLY what it rendered before -----');

// The one topic shipping a visual today. Its stories were replayed through the
// PRE-generalisation sim and digested (test/golden/). The kafka-consumer-lag mode
// must reproduce them bit for bit. Regenerating the golden to turn this green
// would destroy the only proof that the refactor moved nothing.
{
  const golden = JSON.parse(readFileSync(resolve(HERE, 'golden/kafka_internals_trajectory.json'), 'utf8'));
  const mdPath = resolve(HERE, '../../src/topics-md/kafka-internals.md');
  const md = readFileSync(mdPath, 'utf8');
  const m = md.match(/## Visual\s*\n+```json\n([\s\S]*?)\n```/);
  const cfg = m ? JSON.parse(m[1]) : null;

  check('R1 kafka-internals names the KAFKA mode (not a generic one)',
    !!cfg && cfg.mode === 'kafka-consumer-lag',
    'mode=' + (cfg ? cfg.mode : 'NO ## Visual BLOCK') +
    ' -- a Kafka topic on a generic mode would silently lose the partition cap and the rebalance');
  check('R2 its authored params are the ones the golden was captured with',
    !!cfg && JSON.stringify(cfg.params) === JSON.stringify(golden.params),
    'md=' + JSON.stringify(cfg && cfg.params) + ' golden=' + JSON.stringify(golden.params));

  for (const story of golden.stories) {
    const got = replayStory(kafkaConsumerLagMode, golden.params, story.steps);
    const ok = got.digest === story.digest && got.ticks === story.ticks;
    let detail = 'digest ' + got.digest + ' != golden ' + story.digest;
    if (!ok) {                       // make a red digest DEBUGGABLE, not just red
      const bad = got.trace.findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(story.trace[i]));
      if (bad >= 0) {
        detail += ' | first divergence at t=' + story.trace[bad].t +
          ': golden ' + JSON.stringify(story.trace[bad]) + ' got ' + JSON.stringify(got.trace[bad]);
      }
    }
    check('R3 story "' + story.name + '" replays bit-identically to the pre-change sim (' +
      story.ticks + ' ticks)', ok, detail);
  }
}

console.log(failures === 0 ? 'SIM INVARIANTS: ALL PASS' : 'SIM INVARIANTS: ' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
