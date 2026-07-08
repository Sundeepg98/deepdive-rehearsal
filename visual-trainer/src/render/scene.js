// Kafka-lag mode scene: static art (lanes, bars, consumers, producers) plus
// the framework queue-flow for all particle choreography. 2D orthographic by
// law (CLAUDE.md). Reads sim state only.
import * as THREE from 'three';
import { createQueueFlow } from '../framework/flow.js';

const W = 16, H = 9;
const COL_PROD = 2, COL_PART = 7.5, COL_CONS = 13;
const LAG_FULL = 200;

export function createScene(canvas, sim) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x0d1117, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);
  camera.position.z = 1;

  const P = sim.state.partitions.length;
  const laneYn = (i, n) => H - 1.2 - (i * (H - 2.4)) / Math.max(1, n - 1);
  const laneY = (i) => laneYn(i, P);

  // --- static art -----------------------------------------------------------
  const bars = [];
  for (let i = 0; i < P; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x2ea043 }));
    m.position.set(COL_PART + 0.9, laneY(i), 0);
    scene.add(m);
    const guide = new THREE.Mesh(new THREE.PlaneGeometry(W - 3, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x21262d }));
    guide.position.set(W / 2, laneY(i), -1);
    scene.add(guide);
    bars.push(m);
  }
  const consumers = [];
  for (let i = 0; i < 9; i++) {
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x484f58, transparent: true }));
    fill.position.set(COL_CONS, laneYn(i, 9), 0);
    ring.position.set(COL_CONS, laneYn(i, 9), 0);
    scene.add(fill); scene.add(ring);
    consumers.push({ fill, ring });
  }
  for (let i = 0; i < P; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x8b949e }));
    m.position.set(COL_PROD, laneY(i), 0);
    scene.add(m);
  }

  // --- particle choreography: the framework, fed by sim counters ------------
  const flow = createQueueFlow({
    scene,
    lanes: P,
    laneY,
    srcX: COL_PROD, queueX: COL_PART, sinkX: COL_CONS,
    producedOf: (L) => sim.state.partitions[L].produced,
    consumedOf: (L) => sim.state.partitions[L].consumed,
    sinkYOf: (L) => laneYn(sim.state.partitions[L].consumer, 9),
    heatOf: (L) => sim.state.partitions[L].lag / LAG_FULL,
    stalled: () => sim.state.rebalanceRemaining > 0,
  });

  function draw() {
    for (let i = 0; i < P; i++) {
      const f = Math.min(1, sim.state.partitions[i].lag / LAG_FULL);
      bars[i].scale.set(0.7, 0.1 + f * 1.1, 1);
      bars[i].material.color.setHSL(0.33 * (1 - f), 0.75, 0.45);
    }
    const per = Array(sim.state.consumerCount).fill(0);
    for (const p of sim.state.partitions) per[p.consumer] += 1;
    const stalled = sim.state.rebalanceRemaining > 0;
    for (let i = 0; i < 9; i++) {
      const on = i < sim.state.consumerCount;
      const c = consumers[i];
      if (!on) { c.fill.visible = false; c.ring.visible = false; continue; }
      const idle = (per[i] || 0) === 0;
      const slow = i === sim.state.slowConsumer;
      c.fill.visible = !idle;
      c.ring.visible = idle;
      c.fill.material.color.setHex(slow ? 0xff6b6b : 0x4da3ff);
      c.fill.material.opacity = stalled ? 0.3 : 1;
      c.ring.material.opacity = stalled ? 0.3 : 0.9;
      c.fill.scale.setScalar(1);
      c.ring.scale.setScalar(0.85);
    }
    flow.updateInstances();
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    renderer.setSize(w, Math.round((w * H) / W), false);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  }
  window.addEventListener('resize', resize);
  resize();

  return { stepParticles: flow.step, draw, renderer, queues: flow.queues };
}
