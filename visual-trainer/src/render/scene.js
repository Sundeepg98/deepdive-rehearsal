// Queue scene, shared by BOTH queue modes (queue-flow and kafka-consumer-lag):
// static art (lanes, bars, sinks, producers) plus the framework queue-flow for
// all particle choreography. 2D orthographic by law (CLAUDE.md).
//
// THE RENDERER READS SIM FACTS; IT DOES NOT RE-DERIVE THEM. It used to compute
// ownership itself (`per[p.consumer]`) and paint a hollow "idle" ring from that
// -- i.e. Kafka's partition cap was hard-coded a SECOND time, here, outside the
// sim that owns it. So the honest generic sim would still have been drawn with
// Kafka's conclusions: workers correctly adding capacity, rendered as idle
// spectators. Idleness and stalls now come from the sim (sinkIdle / stalled),
// which is the only thing that knows whether they are even possible.
import * as THREE from 'three';
import { createQueueFlow } from '../framework/flow.js';

const W = 16, H = 9;
const COL_PROD = 2, COL_PART = 7.5, COL_CONS = 13;
const LAG_FULL = 200;
const MAX_SINKS = 9;                       // sink meshes drawn (matches the mode control max)

export function createScene(canvas, sim) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x0d1117, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);
  camera.position.z = 1;

  const P = sim.state.lanes.length;
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
  const sinks = [];
  for (let i = 0; i < MAX_SINKS; i++) {
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x4da3ff, transparent: true }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0x484f58, transparent: true }));
    fill.position.set(COL_CONS, laneYn(i, MAX_SINKS), 0);
    ring.position.set(COL_CONS, laneYn(i, MAX_SINKS), 0);
    scene.add(fill); scene.add(ring);
    sinks.push({ fill, ring });
  }
  for (let i = 0; i < P; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x8b949e }));
    m.position.set(COL_PROD, laneY(i), 0);
    scene.add(m);
  }

  // --- particle choreography: the framework, fed by sim counters ------------
  // SINK ROUTING is display choreography, never a capacity claim -- and the two
  // models genuinely route differently:
  //   partitioned -- an item goes to its lane's OWNER. Ownership IS the lesson;
  //     it is why a consumer past the partition count receives nothing.
  //   shared      -- any worker can take any item, so releases fan out
  //     round-robin across EVERY worker. This is also what makes the linear
  //     capacity readout legible: add a 7th worker and you SEE it start taking
  //     work, rather than watch a hollow ring do nothing while the number climbs.
  let rr = 0;
  const sinkYOf = (L) => (sim.shared
    ? laneYn((rr++) % sim.state.sinks, MAX_SINKS)
    : laneYn(sim.state.lanes[L].sink, MAX_SINKS));

  const flow = createQueueFlow({
    scene,
    lanes: P,
    laneY,
    srcX: COL_PROD, queueX: COL_PART, sinkX: COL_CONS,
    producedOf: (L) => sim.state.lanes[L].produced,
    consumedOf: (L) => sim.state.lanes[L].consumed,
    sinkYOf,
    heatOf: (L) => sim.state.lanes[L].lag / LAG_FULL,
    stalled: () => sim.stalled(),
  });

  function draw() {
    for (let i = 0; i < P; i++) {
      const f = Math.min(1, sim.state.lanes[i].lag / LAG_FULL);
      bars[i].scale.set(0.7, 0.1 + f * 1.1, 1);
      bars[i].material.color.setHSL(0.33 * (1 - f), 0.75, 0.45);
    }
    const stalled = sim.stalled();
    for (let i = 0; i < MAX_SINKS; i++) {
      const on = i < sim.state.sinks;
      const c = sinks[i];
      if (!on) { c.fill.visible = false; c.ring.visible = false; continue; }
      // ASK THE SIM. A hollow ring is a claim that this sink CANNOT work no
      // matter the backlog -- true only under partitioned ownership. In the
      // shared model sinkIdle() is false by construction, so a worker that is
      // pulling real work is never drawn as a spectator.
      const idle = sim.sinkIdle(i);
      const slow = i === sim.state.slowSink;
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

  // --- sizing ---------------------------------------------------------------
  // We are mounted while the pane is still display:none: the app defers the
  // .pane.on swap into document.startViewTransition(), so the swap lands AFTER
  // the routechange listener that mounts us (view-transitions.js:24 ->
  // shell.js:55). A one-shot measure therefore reads 0x0, and on a static
  // offline page no window 'resize' ever fires to correct it -- the canvas
  // stays 0x0 forever. (Under prefers-reduced-motion the swap runs
  // synchronously, which is the only reason the visual ever appeared to work.)
  //
  // So: never trust a single measurement, and never apply a zero size. Observe
  // the box; the observer fires the moment the pane gains a layout box
  // (0 -> real width) and on every later reflow -- pane re-show, container
  // resize, sidebar fold, mobile rotate.
  let lastW = 0, lastH = 0, lastDpr = 0;
  function resize() {
    const box = canvas.parentElement;
    const w = Math.floor(canvas.clientWidth || (box && box.clientWidth) || 0);
    if (!w) return;                       // hidden / not laid out: keep the last good size
    const h = Math.round((w * H) / W);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w === lastW && h === lastH && dpr === lastDpr) return;  // idempotent: no RO feedback loop
    lastW = w; lastH = h; lastDpr = dpr;
    renderer.setPixelRatio(dpr);          // before setSize: setPixelRatio re-applies the last size
    renderer.setSize(w, h, false);        // false = drawing buffer only; CSS keeps width:100%
    draw();                               // paint now, so the first visible frame is never blank
  }

  const obs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (obs) obs.observe(canvas.parentElement || canvas);
  window.addEventListener('resize', resize);   // ResizeObserver does not fire on DPR-only changes
  resize();

  // --- teardown -------------------------------------------------------------
  // renderer.dispose() frees three's caches but does NOT release the WebGL
  // context -- the context stays live on the detached canvas until GC, and
  // Chrome hard-caps ~16 live contexts (the 17th evicts the oldest: "Too many
  // active WebGL contexts"). One mount per pane visit therefore killed the
  // visual permanently after ~16 opens. forceContextLoss() releases it
  // deterministically. dispose() first, so three's own webglcontextlost
  // listener is already gone and the forced loss is silent.
  function dispose() {
    if (obs) obs.disconnect();
    window.removeEventListener('resize', resize);
    flow.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
    });
    scene.clear();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { stepParticles: flow.step, draw, resize, renderer, queues: flow.queues, dispose };
}
