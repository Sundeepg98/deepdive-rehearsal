// Boot: fixed-dt sim ticks (30 Hz) + rAF render. Wires controls and readouts.
import { createSim } from './sim/kafka_lag.js';
import { createScene } from './render/scene.js';

const sim = createSim();
const canvas = document.getElementById('view');
const scene = createScene(canvas, sim);

// Expose for headless verification (playwright reads these).
window.__SIM = sim;
window.__frames = 0;

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
$('spike').addEventListener('click', () => {
  if (spikeUntil > sim.state.t) return;
  preSpikeRate = sim.state.producerRate;
  sim.setProducerRate(preSpikeRate * 3);
  spikeUntil = sim.state.t + 8;
  syncControls();
});
$('addC').addEventListener('click', () => { sim.setConsumerCount(sim.state.consumerCount + 1); syncControls(); });
$('rmC').addEventListener('click', () => { sim.setConsumerCount(sim.state.consumerCount - 1); syncControls(); });
$('slow').addEventListener('click', () => {
  sim.setSlowConsumer(sim.state.slowConsumer === -1 ? 0 : -1);
  $('slow').textContent = sim.state.slowConsumer === -1 ? 'Slow consumer' : 'Heal consumer';
});
$('reset').addEventListener('click', () => window.location.reload());

const DT = 1 / 30;
let last = performance.now(), acc = 0;
function frame(now) {
  let ft = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += ft;
  while (acc >= DT) {
    sim.tick(DT);
    if (spikeUntil > 0 && sim.state.t >= spikeUntil) {
      sim.setProducerRate(preSpikeRate); spikeUntil = 0; syncControls();
    }
    acc -= DT;
  }
  scene.stepParticles(ft);
  scene.draw();
  window.__frames += 1;
  // readouts
  const lag = sim.totalLag(), capE = sim.effectiveCapacity(), st = sim.status();
  $('lagV').textContent = Math.round(lag);
  $('ecapV').textContent = Math.round(capE) + ' msg/s';
  const badge = $('status');
  badge.textContent = st;
  badge.className = 'badge ' + (st === 'REBALANCING' ? 'warn' : st === 'LAG GROWING' ? 'bad' : 'ok');
  requestAnimationFrame(frame);
}
syncControls();
requestAnimationFrame(frame);
