// Boot: fixed-dt sim ticks (30 Hz) + rAF render. Controls, readouts,
// rebalance banner, and STORY MODE (scripted teaching-beat scenarios).
import { createSim } from './sim/kafka_lag.js';
import { createScene } from './render/scene.js';
import { createLoop } from './framework/loop.js';
import { createHUD, createStoryDriver, makeControlLocker } from './framework/hud.js';

const sim = createSim();
const canvas = document.getElementById('view');
const scene = createScene(canvas, sim);

// Headless-verification hooks
const hud = createHUD();
const lockControls = makeControlLocker();
const driver = createStoryDriver({ now: () => sim.state.t, hud, lockControls });
window.__SIM = sim;
window.__frames = 0;
window.__QUEUES = () => scene.queues();
window.__STORY = () => driver.currentCaption();

const $ = (id) => document.getElementById(id);
const rate = $('rate'), cons = $('cons'), cap = $('cap');

function syncControls() {
  rate.value = sim.state.producerRate;
  cons.value = sim.state.consumerCount;
  cap.value = sim.state.consumerCapacity;
  $('rateV').textContent = Math.round(sim.state.producerRate);
  $('consV').textContent = sim.state.consumerCount;
  $('capV').textContent = Math.round(sim.state.consumerCapacity);
}
rate.addEventListener('input', () => { sim.setProducerRate(+rate.value); syncControls(); });
cons.addEventListener('input', () => { sim.setConsumerCount(+cons.value); syncControls(); });
cap.addEventListener('input', () => { sim.setConsumerCapacity(+cap.value); syncControls(); });

let spikeUntil = 0, preSpikeRate = 0;
function doSpike() {
  if (spikeUntil > sim.state.t) return;
  preSpikeRate = sim.state.producerRate;
  sim.setProducerRate(preSpikeRate * 3);
  spikeUntil = sim.state.t + 8;
  syncControls();
}
$('spike').addEventListener('click', doSpike);
$('addC').addEventListener('click', () => { sim.setConsumerCount(sim.state.consumerCount + 1); syncControls(); });
$('rmC').addEventListener('click', () => { sim.setConsumerCount(sim.state.consumerCount - 1); syncControls(); });
$('slow').addEventListener('click', () => {
  sim.setSlowConsumer(sim.state.slowConsumer === -1 ? 0 : -1);
  $('slow').textContent = sim.state.slowConsumer === -1 ? 'Slow consumer' : 'Heal consumer';
});
$('reset').addEventListener('click', () => window.location.reload());

// keyboard: s = spike, ArrowUp/Down = consumers, x = slow toggle
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 's') doSpike();
  else if (e.key === 'ArrowUp') { sim.setConsumerCount(sim.state.consumerCount + 1); syncControls(); }
  else if (e.key === 'ArrowDown') { sim.setConsumerCount(sim.state.consumerCount - 1); syncControls(); }
  else if (e.key === 'x') $('slow').click();
});

// ---------------- STORY MODE (framework driver) -----------------------------
// Each story: reset to a known state, then timed steps { t, cap, do }.
// Captions narrate the teaching beat; the human rehearses by re-narrating.
function baseState(rateV, consV, capV) {
  sim.setProducerRate(rateV);
  sim.setConsumerCapacity(capV);
  if (sim.state.consumerCount !== consV) sim.setConsumerCount(consV);
  sim.state.rebalanceRemaining = 0;       // stories start clean
  sim.setSlowConsumer(-1);
  for (const p of sim.state.partitions) p.lag = 0;
  $('slow').textContent = 'Slow consumer';
  syncControls();
}

const STORIES = {
  spike: {
    label: 'Spike, then scale out',
    init: () => baseState(60, 3, 30),
    steps: [
      { t: 0,  cap: 'Steady: 60 msg/s in, capacity 90. Lag ~0.' },
      { t: 3,  cap: 'Traffic spikes 3x (180 msg/s). Capacity 90 -- watch every queue back up.', do: () => { sim.setProducerRate(180); syncControls(); } },
      { t: 9,  cap: 'Scale out: add a consumer. Rebalance stall first... then capacity 120.', do: () => { sim.setConsumerCount(4); syncControls(); } },
      { t: 13, cap: 'Still growing: 180 in vs 120 out. Add another -- capacity 150.', do: () => { sim.setConsumerCount(5); syncControls(); } },
      { t: 17, cap: 'Spike ends (back to 60). Capacity 150 -- the backlog drains.', do: () => { sim.setProducerRate(60); syncControls(); } },
      { t: 24, cap: 'Drained. The interview line: scale consumers to drain lag -- capacity vs rate.' },
      { t: 28 },
    ],
  },
  idle: {
    label: 'Consumers beyond partitions',
    init: () => baseState(150, 6, 30),
    steps: [
      { t: 0,  cap: '6 partitions, 6 consumers, capacity 180 vs 150 in. Balanced.' },
      { t: 4,  cap: 'Add a 7th consumer. It has NO partition to own -- a hollow ring. Capacity unchanged.', do: () => { sim.setConsumerCount(7); syncControls(); } },
      { t: 10, cap: 'An 8th. Still nothing. Consumers beyond the partition count are IDLE.', do: () => { sim.setConsumerCount(8); syncControls(); } },
      { t: 16, cap: 'The interview line: partition count caps consumer-group parallelism.' },
      { t: 20 },
    ],
  },
  rebalance: {
    label: 'The rebalance cost',
    init: () => baseState(60, 3, 30),
    steps: [
      { t: 0,  cap: 'Steady at 60 in / 90 capacity. Lag ~0.' },
      { t: 3,  cap: 'Add a consumer. The WHOLE group pauses to rebalance -- nobody consumes.', do: () => { sim.setConsumerCount(4); syncControls(); } },
      { t: 6,  cap: 'Lag spiked ~120 during the stall -- even though capacity was always sufficient.' },
      { t: 11, cap: 'Drained. The interview line: every membership change has a stop-the-world cost.' },
      { t: 15 },
    ],
  },
  slow: {
    label: 'One slow consumer (skew)',
    init: () => baseState(60, 3, 30),
    steps: [
      { t: 0,  cap: '3 consumers, all healthy. Lag ~0 everywhere.' },
      { t: 3,  cap: 'Consumer 1 degrades to 25%. Watch ONLY its two partitions back up.', do: () => { sim.setSlowConsumer(0); $('slow').textContent = 'Heal consumer'; } },
      { t: 12, cap: 'Skew, not uniform growth -- total capacity lies; per-partition lag tells the truth.' },
      { t: 16, cap: 'Healed. Its backlog drains; the others never suffered.', do: () => { sim.setSlowConsumer(-1); $('slow').textContent = 'Slow consumer'; } },
      { t: 22 },
    ],
  },
};

for (const key of Object.keys(STORIES)) {
  $('story-' + key).addEventListener('click', () =>
    driver.run(STORIES[key].steps, { init: STORIES[key].init, onEnd: () => baseState(120, 3, 30) }));
}
$('stopStory').addEventListener('click', () => driver.stop());

// ---------------- frame loop -----------------------------------------------
const loop = createLoop({
  simTick: (dt) => {
    sim.tick(dt);
    if (spikeUntil > 0 && sim.state.t >= spikeUntil) {
      sim.setProducerRate(preSpikeRate); spikeUntil = 0; syncControls();
    }
    driver.tick();
  },
  onFrame: (ft) => {
    scene.stepParticles(ft);
    scene.draw();
    window.__frames += 1;
    const lag = sim.totalLag(), capE = sim.effectiveCapacity(), st = sim.status();
    $('lagV').textContent = Math.round(lag);
    $('ecapV').textContent = Math.round(capE) + ' msg/s';
    $('idleV').textContent = Math.max(0, sim.state.consumerCount - sim.state.partitions.length);
    hud.setBadge(st, st === 'REBALANCING' ? 'warn' : st === 'LAG GROWING' ? 'bad' : 'ok');
    hud.banner(st === 'REBALANCING'
      ? 'REBALANCING -- consumption paused (' + sim.state.rebalanceRemaining.toFixed(1) + 's)'
      : null);
  },
});
syncControls();
loop.start();
