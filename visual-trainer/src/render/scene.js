// 2D render (Three.js, WebGL2, orthographic -- NO 3D, by law; see CLAUDE.md).
// Reads sim state only; zero domain logic lives here.
//
// True queue choreography (was: dwell-shimmer skeleton):
//   spawn  <- exactly tracks partition.produced (1 particle = MSGS_PER_PARTICLE)
//   queue  <- arrivals stack LEFTWARD from the partition column; stack length
//             mirrors partition.lag (backpressure literally backs up toward
//             the producer, compressing as it grows)
//   release<- exactly tracks partition.consumed; released particles fly to
//             the circle of the consumer that OWNS the partition, so the
//             assignment mapping is visible (and rebalance stalls freeze it)
// Layout, world units: x 0..16, y 0..9.
//   producers x=2 | partition queues ending at x=7.5 | consumers x=13

import * as THREE from 'three';

const W = 16, H = 9;
const COL_PROD = 2, COL_PART = 7.5, COL_CONS = 13;
const MAX_PARTICLES = 4000;
const LAG_FULL = 200;               // lag value that maxes a bar / reddens it
const MSGS_PER_PARTICLE = 2;        // 1 particle represents this many messages
const QUEUE_SPAN = COL_PART - (COL_PROD + 0.8);   // room for a stack

export function createScene(canvas, sim) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x0d1117, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);
  camera.position.z = 1;

  const P = sim.state.partitions.length;
  const laneY = (i, n) => H - 1.2 - (i * (H - 2.4)) / Math.max(1, n - 1);

  // --- partition lag bars (secondary readout; the stack is primary) --------
  const barGeo = new THREE.PlaneGeometry(1, 1);
  const bars = [];
  for (let i = 0; i < P; i++) {
    const m = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x2ea043 }));
    m.position.set(COL_PART + 0.9, laneY(i, P), 0);
    scene.add(m);
    const guide = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 3, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x21262d }),
    );
    guide.position.set(W / 2, laneY(i, P), -1);
    scene.add(guide);
    bars.push(m);
  }

  // --- consumers: filled circle when active, ring outline when idle --------
  const consumers = [];
  for (let i = 0; i < 9; i++) {
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true }),
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x484f58, transparent: true }),
    );
    fill.position.set(COL_CONS, laneY(i, 9), 0);
    ring.position.set(COL_CONS, laneY(i, 9), 0);
    scene.add(fill); scene.add(ring);
    consumers.push({ fill, ring });
  }
  // producers (static markers per lane)
  for (let i = 0; i < P; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x8b949e }),
    );
    m.position.set(COL_PROD, laneY(i, P), 0);
    scene.add(m);
  }

  // --- particles (instanced) ------------------------------------------------
  const inst = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.09, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    MAX_PARTICLES,
  );
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
  scene.add(inst);

  // phase: 0 = travel in, 1 = queued (position = queue slot), 2 = travel out
  const pool = Array.from({ length: MAX_PARTICLES }, () => ({
    alive: false, lane: 0, phase: 0, x: 0, y: 0, ty: 0, jy: 0,
  }));
  // per-lane bookkeeping ties visuals EXACTLY to the sim's counters
  const lanes = Array.from({ length: P }, (_, i) => ({
    queue: [],
    spawnAcc: 0, relAcc: 0,
    lastProduced: sim.state.partitions[i].produced,
    lastConsumed: sim.state.partitions[i].consumed,
  }));

  function spawn(lane) {
    for (const p of pool) {
      if (p.alive) continue;
      p.alive = true; p.phase = 0; p.lane = lane;
      p.x = COL_PROD + 0.3;
      p.jy = (Math.random() - 0.5) * 0.28;
      p.y = laneY(lane, P) + p.jy;
      return;
    }
  }

  const spacing = (len) => Math.max(0.05, Math.min(0.18, QUEUE_SPAN / Math.max(1, len)));

  function stepParticles(dt) {
    // 1) spawn/release from the sim's produced/consumed deltas (exact tie)
    for (let L = 0; L < P; L++) {
      const sp = sim.state.partitions[L], st = lanes[L];
      st.spawnAcc += (sp.produced - st.lastProduced) / MSGS_PER_PARTICLE;
      st.lastProduced = sp.produced;
      while (st.spawnAcc >= 1) { spawn(L); st.spawnAcc -= 1; }
      st.relAcc += (sp.consumed - st.lastConsumed) / MSGS_PER_PARTICLE;
      st.lastConsumed = sp.consumed;
      while (st.relAcc >= 1 && st.queue.length) {
        const p = st.queue.shift();
        p.phase = 2;
        p.ty = laneY(sp.consumer, 9);
        st.relAcc -= 1;
      }
      // The sim consumes instantly; particles take ~1.2s to arrive. Without a
      // cap, that latency banks release credit and early arrivals all fly
      // through, so queues form seconds late. A consumer cannot pre-consume
      // what has not visually arrived: allow only a small smoothing credit.
      if (!st.queue.length) st.relAcc = Math.min(st.relAcc, 2);
    }
    // 2) movement
    const speed = 4.5;
    for (const p of pool) {
      if (!p.alive) continue;
      const st = lanes[p.lane];
      if (p.phase === 0) {
        p.x += speed * dt;
        const tail = COL_PART - st.queue.length * spacing(st.queue.length);
        if (p.x >= Math.min(COL_PART - 0.02, tail)) {
          if (st.relAcc >= 1) {          // consumed while still in flight: fly through
            p.phase = 2;
            p.ty = laneY(sim.state.partitions[p.lane].consumer, 9);
            st.relAcc -= 1;
          } else {
            p.phase = 1;
            st.queue.push(p);
          }
        }
      } else if (p.phase === 2) {
        p.x += speed * 1.25 * dt;
        p.y += (p.ty - p.y) * Math.min(1, 4 * dt);
        if (p.x > COL_CONS) p.alive = false;
      }
      // phase 1 positions are assigned from queue order in draw()
    }
  }

  const CLR = new THREE.Color();
  const M = new THREE.Matrix4();

  function draw() {
    // queue slot positions: stack grows leftward, compresses, clamps at the
    // producer edge ("backed up to the source")
    for (let L = 0; L < P; L++) {
      const q = lanes[L].queue, sp = spacing(q.length), y0 = laneY(L, P);
      for (let i = 0; i < q.length; i++) {
        const p = q[i];
        p.x = Math.max(COL_PROD + 0.8, COL_PART - 0.1 - i * sp);
        p.y = y0 + p.jy;
      }
    }
    // bars
    for (let i = 0; i < P; i++) {
      const lag = sim.state.partitions[i].lag;
      const f = Math.min(1, lag / LAG_FULL);
      bars[i].scale.set(0.7, 0.1 + f * 1.1, 1);
      bars[i].material.color.setHSL(0.33 * (1 - f), 0.75, 0.45);
    }
    // consumers
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
      c.ring.visible = idle;                 // idle = hollow ring, no fill
      c.fill.material.color.setHex(slow ? 0xff6b6b : 0x4da3ff);
      c.fill.material.opacity = stalled ? 0.3 : 1;
      c.ring.material.opacity = stalled ? 0.3 : 0.9;
      c.fill.scale.setScalar(1);
      c.ring.scale.setScalar(0.85);
    }
    // particles
    let n = 0;
    for (const p of pool) {
      if (!p.alive) continue;
      M.makeTranslation(p.x, p.y, 0.5);
      inst.setMatrixAt(n, M);
      const lagF = Math.min(1, sim.state.partitions[p.lane].lag / LAG_FULL);
      CLR.setHSL(0.55 - 0.55 * lagF, 0.8, 0.7);
      inst.setColorAt(n, CLR);
      n += 1;
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = Math.round((w * H) / W);
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    stepParticles,
    draw,
    renderer,
    queues: () => lanes.map((l) => l.queue.length),
  };
}
