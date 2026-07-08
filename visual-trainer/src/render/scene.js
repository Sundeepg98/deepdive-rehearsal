// 2D render skeleton (Three.js, WebGL2, orthographic -- NO 3D, by law; see
// CLAUDE.md). Reads sim state only; contains zero simulation logic.
// Layout, world units: x 0..16, y 0..9.
//   producers column x=2 | partition lag bars x=7..8 | consumers column x=13
// This is a verified-to-render SKELETON. The visual choreography upgrade
// (true queue semantics, story mode) is Claude Code's task list in CLAUDE.md.

import * as THREE from 'three';

const W = 16, H = 9;
const COL_PROD = 2, COL_PART = 7.5, COL_CONS = 13;
const MAX_PARTICLES = 4000;
const LAG_FULL = 200;                 // lag value that maxes a bar / reddens it

export function createScene(canvas, sim) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x0d1117, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);
  camera.position.z = 1;

  const P = sim.state.partitions.length;
  const laneY = (i, n) => H - 1.2 - (i * (H - 2.4)) / Math.max(1, n - 1);

  // --- partition lag bars ---------------------------------------------------
  const barGeo = new THREE.PlaneGeometry(1, 1);
  const bars = [];
  for (let i = 0; i < P; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x2ea043 });
    const m = new THREE.Mesh(barGeo, mat);
    m.position.set(COL_PART, laneY(i, P), 0);
    scene.add(m);
    // lane guide
    const guide = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 3, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x21262d }),
    );
    guide.position.set(W / 2, laneY(i, P), -1);
    scene.add(guide);
    bars.push(m);
  }

  // --- consumers (max 9 circles; visibility follows consumerCount) ----------
  const consGeo = new THREE.CircleGeometry(0.32, 24);
  const consumers = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(consGeo, new THREE.MeshBasicMaterial({ color: 0x4da3ff }));
    m.position.set(COL_CONS, laneY(i, 9), 0);
    scene.add(m);
    consumers.push(m);
  }
  // producers (static markers, one per partition lane)
  const prodGeo = new THREE.PlaneGeometry(0.4, 0.4);
  for (let i = 0; i < P; i++) {
    const m = new THREE.Mesh(prodGeo, new THREE.MeshBasicMaterial({ color: 0x8b949e }));
    m.position.set(COL_PROD, laneY(i, P), 0);
    scene.add(m);
  }

  // --- particles (instanced) -------------------------------------------------
  const partGeo = new THREE.CircleGeometry(0.09, 8);
  const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const inst = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
  scene.add(inst);

  const pool = Array.from({ length: MAX_PARTICLES }, () => ({
    alive: false, lane: 0, x: 0, y: 0, dwell: 0,
  }));
  let spawnAcc = 0;
  const M = new THREE.Matrix4();
  const CLR = new THREE.Color();

  function spawn(lane) {
    for (const p of pool) {
      if (p.alive) continue;
      p.alive = true; p.lane = lane;
      p.x = COL_PROD + 0.3;
      p.y = laneY(lane, P) + (Math.random() - 0.5) * 0.3;
      p.dwell = 0;
      return;
    }
  }

  function stepParticles(dt) {
    // Visual-only choreography: spawn at produce rate, travel to the partition
    // column, dwell there proportional to that partition's current lag, then
    // travel on to the consumer column and despawn. (Upgrade path in CLAUDE.md.)
    spawnAcc += sim.state.producerRate * dt;
    while (spawnAcc >= 1) { spawn(Math.floor(Math.random() * P)); spawnAcc -= 1; }
    const speed = 4.5;
    for (const p of pool) {
      if (!p.alive) continue;
      const lag = sim.state.partitions[p.lane].lag;
      const atPartition = p.x >= COL_PART - 0.4 && p.x <= COL_PART + 0.6;
      const held = atPartition && (p.dwell < Math.min(3, lag / 40) || sim.state.rebalanceRemaining > 0);
      if (held) {
        p.dwell += dt;
        // queue churn: held particles shimmer in place so pressure reads as
        // motion (visual only -- position center is unchanged)
        p.y += (Math.random() - 0.5) * 0.06;
        p.x += (Math.random() - 0.5) * 0.04;
        p.x = Math.min(COL_PART + 0.6, Math.max(COL_PART - 0.4, p.x));
      } else {
        p.x += speed * dt;
      }
      if (p.x > COL_CONS) p.alive = false;
    }
  }

  function draw() {
    // bars: height + green->red by lag
    for (let i = 0; i < P; i++) {
      const lag = sim.state.partitions[i].lag;
      const f = Math.min(1, lag / LAG_FULL);
      const h = 0.12 + f * 1.1;
      bars[i].scale.set(1.6, h, 1);
      bars[i].material.color.setHSL(0.33 * (1 - f), 0.75, 0.45);
    }
    // consumers: hidden beyond count; grey if idle (owns no partitions);
    // red if slow; dim while rebalancing
    const per = Array(sim.state.consumerCount).fill(0);
    for (const p of sim.state.partitions) per[p.consumer] += 1;
    const stalled = sim.state.rebalanceRemaining > 0;
    for (let i = 0; i < 9; i++) {
      const on = i < sim.state.consumerCount;
      consumers[i].visible = on;
      if (!on) continue;
      const idle = (per[i] || 0) === 0;
      const slow = i === sim.state.slowConsumer;
      const c = slow ? 0xff6b6b : idle ? 0x484f58 : 0x4da3ff;
      consumers[i].material.color.setHex(c);
      consumers[i].material.opacity = stalled ? 0.35 : 1;
      consumers[i].material.transparent = true;
      consumers[i].scale.setScalar(idle ? 0.7 : 1);
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

  return { stepParticles, draw, renderer };
}
