// framework/flow.js -- counter-driven queue-flow particle choreography.
// The reusable heart of the trainer pipeline: ANY mode whose story is
// "things are produced into per-lane queues and consumed toward owners"
// (kafka lag, bounded buffers, retry storms, autoscaling queues, load
// balancing) gets its visuals from this module by supplying counters.
//
// Contract: visuals may ONLY be driven by monotonic sim counters
// (producedOf / consumedOf), never by independent rates -- so the render can
// not drift from the sim. 1 particle = msgsPerParticle units of the counter.
//
// Phases: 0 travel-in (source -> queue tail), 1 queued (slot position from
// queue order; stacks grow BACKWARD from the queue column, compress, clamp
// at the source edge = literal backpressure), 2 travel-out (queue head ->
// this lane's current sink y, so ownership/assignment is visible).
import * as THREE from 'three';

export function createQueueFlow({
  scene,
  lanes,                       // number of lanes
  laneY,                       // (laneIndex) => world y of the lane
  srcX, queueX,                // world x of source column and queue head
  sinkX,                       // world x of the sink column
  producedOf, consumedOf,      // (lane) => monotonic sim counters
  sinkYOf,                     // (lane) => world y of the lane's CURRENT owner
  heatOf,                      // (lane) => 0..1 for particle color heat
  stalled = () => false,       // freeze releases (e.g. rebalance) -- optional,
                               // normally implied by consumedOf not advancing
  msgsPerParticle = 2,
  maxParticles = 4000,
  particleRadius = 0.09,
  speed = 4.5,
  emptyQueueCreditCap = 2,     // see note below
}) {
  const inst = new THREE.InstancedMesh(
    new THREE.CircleGeometry(particleRadius, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    maxParticles,
  );
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxParticles * 3), 3);
  scene.add(inst);

  const pool = Array.from({ length: maxParticles }, () => ({
    alive: false, lane: 0, phase: 0, x: 0, y: 0, ty: 0, jy: 0,
  }));
  const st = Array.from({ length: lanes }, (_, i) => ({
    queue: [], spawnAcc: 0, relAcc: 0,
    lastProduced: producedOf(i), lastConsumed: consumedOf(i),
  }));
  const span = queueX - (srcX + 0.8);
  const spacing = (len) => Math.max(0.05, Math.min(0.18, span / Math.max(1, len)));

  function spawn(lane) {
    for (const p of pool) {
      if (p.alive) continue;
      p.alive = true; p.phase = 0; p.lane = lane;
      p.x = srcX + 0.3;
      p.jy = (Math.random() - 0.5) * 0.28;
      p.y = laneY(lane) + p.jy;
      return;
    }
  }

  function step(dt) {
    for (let L = 0; L < lanes; L++) {
      const s = st[L];
      s.spawnAcc += (producedOf(L) - s.lastProduced) / msgsPerParticle;
      s.lastProduced = producedOf(L);
      while (s.spawnAcc >= 1) { spawn(L); s.spawnAcc -= 1; }
      s.relAcc += (consumedOf(L) - s.lastConsumed) / msgsPerParticle;
      s.lastConsumed = consumedOf(L);
      while (s.relAcc >= 1 && s.queue.length) {
        const p = s.queue.shift();
        p.phase = 2; p.ty = sinkYOf(L);
        s.relAcc -= 1;
      }
      // The sim consumes instantly; particles take ~span/speed seconds to
      // arrive. Unbounded credit banking during that latency lets early
      // arrivals all fly through and queues form seconds late (found by
      // headless test in the kafka pilot). A sink cannot pre-consume what
      // has not visually arrived: cap the bank while the queue is empty.
      if (!s.queue.length) s.relAcc = Math.min(s.relAcc, emptyQueueCreditCap);
    }
    for (const p of pool) {
      if (!p.alive) continue;
      const s = st[p.lane];
      if (p.phase === 0) {
        p.x += speed * dt;
        const tail = queueX - s.queue.length * spacing(s.queue.length);
        if (p.x >= Math.min(queueX - 0.02, tail)) {
          if (s.relAcc >= 1 && !stalled()) { p.phase = 2; p.ty = sinkYOf(p.lane); s.relAcc -= 1; }
          else { p.phase = 1; s.queue.push(p); }
        }
      } else if (p.phase === 2) {
        p.x += speed * 1.25 * dt;
        p.y += (p.ty - p.y) * Math.min(1, 4 * dt);
        if (p.x > sinkX) p.alive = false;
      }
    }
  }

  const M = new THREE.Matrix4();
  const CLR = new THREE.Color();
  function updateInstances() {
    // queued slot positions from queue order
    for (let L = 0; L < lanes; L++) {
      const q = st[L].queue, sp = spacing(q.length), y0 = laneY(L);
      for (let i = 0; i < q.length; i++) {
        const p = q[i];
        p.x = Math.max(srcX + 0.8, queueX - 0.1 - i * sp);
        p.y = y0 + p.jy;
      }
    }
    let n = 0;
    for (const p of pool) {
      if (!p.alive) continue;
      M.makeTranslation(p.x, p.y, 0.5);
      inst.setMatrixAt(n, M);
      CLR.setHSL(0.55 - 0.55 * Math.min(1, heatOf(p.lane)), 0.8, 0.7);
      inst.setColorAt(n, CLR);
      n += 1;
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }

  return { step, updateInstances, queues: () => st.map((s) => s.queue.length) };
}
