// Runtime half of findings #4 (Kafka semantics leak) and #5 (unenforced params).
// Mounts the REAL shipped VisualKit with crafted configs into a properly-sized host.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-visual-trainer-verify';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
await p.goto(BASE, { waitUntil: 'load' });
await p.waitForTimeout(1800);

const out = await p.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const mk = () => { const h = document.createElement('div'); h.style.cssText = 'width:800px;position:fixed;left:0;top:0;z-index:99999'; document.body.appendChild(h); return h; };
  const res = {};

  // --- #4: a BOUNDED-BUFFER / worker-pool topic adds a worker. Does Kafka's
  //         stop-the-world consumer-group rebalance leak into it?
  {
    const inst = VisualKit.mount(mk(), { mode: 'queue-flow',
      labels: { src: 'clients', queue: 'bounded buffer', sink: 'workers' },
      params: { lanes: 4, rate: 100, sinks: 2, capacity: 30 } });
    await wait(600);
    const before = inst.sim.status();
    inst.sim.setConsumerCount(3);                 // == queue-flow apply({sinks:3})
    const after = inst.sim.status();
    const rebal = inst.sim.state.rebalanceRemaining;
    await wait(120);
    res.kafkaLeak = { statusBefore: before, statusAfter: after, rebalanceSecsRemaining: +rebal.toFixed(2),
      STOP_THE_WORLD_STALL_LEAKED: after === 'REBALANCING' && rebal > 0,
      bannerText: (document.querySelectorAll('#banner')[0] || {}).textContent || null,
      roundRobinAssignment: inst.sim.state.partitions.map((x) => x.consumer) };
    inst.dispose();
  }

  // --- #5a: lanes:"six" -- accepted by the compiler. What does it render?
  {
    const inst = VisualKit.mount(mk(), { mode: 'queue-flow', params: { lanes: 'six', rate: 120, sinks: 3, capacity: 30 } });
    await wait(500);
    res.lanesString = { resultingLaneCount: inst.sim.state.partitions.length,
      totalLag: inst.sim.totalLag(), status: inst.sim.status(), threw: false };
    inst.dispose();
  }

  // --- #5b: sinks:12 vs the scene's hardcoded 9 consumer meshes
  {
    const inst = VisualKit.mount(mk(), { mode: 'queue-flow', params: { lanes: 12, rate: 200, sinks: 12, capacity: 30 } });
    await wait(700);
    const owners = inst.sim.state.partitions.map((x) => x.consumer);
    // scene.js:36 builds meshes for i in [0,9); sinkYOf maps owner -> laneYn(owner, 9)
    const H = 9, laneYn = (i, n) => H - 1.2 - (i * (H - 2.4)) / Math.max(1, n - 1);
    res.sinksOverflow = { consumerCount: inst.sim.state.consumerCount, partitionOwners: owners,
      ownersBeyondThe9RenderedMeshes: [...new Set(owners)].filter((o) => o >= 9),
      // camera is Orthographic(0,W,H,0) -> visible y is [0,9]
      offScreenSinkY: [...new Set(owners)].filter((o) => o >= 9).map((o) => ({ consumer: o, y: +laneYn(o, 9).toFixed(2), visible: laneYn(o, 9) >= 0 })) };
    inst.dispose();
  }
  return res;
});
await p.waitForTimeout(300);
await b.close();
out.pageErrors = errs;
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_inv-viz-probes.json', JSON.stringify(out, null, 1));
