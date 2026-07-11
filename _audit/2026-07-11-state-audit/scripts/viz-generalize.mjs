// Is queue-flow a GENERIC mode, or Kafka semantics wearing generic words?
// Mount configs a *different* topic would plausibly author and observe.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-trainer/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(900);
const R = {};

// Mount into a scratch, LAID-OUT host (sidestepping the 0x0 bug) so we can
// see what a second topic would actually get.
R.scenarios = await p.evaluate(async () => {
  const out = [];
  const mk = () => {
    const d = document.createElement('div');
    d.style.cssText = 'width:900px;height:520px;position:fixed;left:0;top:0;z-index:99999;background:#0d1117';
    document.body.appendChild(d);
    return d;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // --- Scenario 1: a "backpressure / bounded buffer" topic adds a consumer.
  // In a bounded-buffer world, adding a worker must NOT stop the world.
  {
    const host = mk();
    const inst = window.VisualKit.mount(host, {
      mode: 'queue-flow',
      labels: { src: 'producer', queue: 'bounded buffer', sink: 'workers' },
      params: { lanes: 4, rate: 100, sinks: 2, capacity: 30 },
    });
    await sleep(400);
    const before = inst.sim.status();
    inst.sim.setConsumerCount(3);           // "add a worker"
    await sleep(120);
    out.push({
      scenario: 'backpressure topic adds a worker (sinks 2 -> 3)',
      statusBefore: before,
      statusAfter: inst.sim.status(),
      rebalanceSecsRemaining: +inst.sim.state.rebalanceRemaining.toFixed(2),
      KAFKA_STALL_LEAKS: inst.sim.status() === 'REBALANCING',
    });
    inst.dispose(); host.remove();
  }

  // --- Scenario 2: param VALUES the compiler accepts but the scene cannot draw.
  // validateVisual only checks KEY NAMES, never values/ranges.
  {
    const host = mk();
    const inst = window.VisualKit.mount(host, {
      mode: 'queue-flow',
      params: { lanes: 12, sinks: 12, rate: 200, capacity: 30 },
    });
    await sleep(700);
    // scene.js builds exactly 9 consumer meshes; sim assigns partitions to 0..11
    const owners = inst.sim.state.partitions.map(x => x.consumer);
    out.push({
      scenario: 'lanes:12, sinks:12 (compiler accepts: it only checks key names)',
      partitionOwners: owners,
      ownersBeyondThe9RenderedMeshes: owners.filter(o => o > 8),
      sceneConsumerMeshes: 9,
      SILENT_BREAKAGE: owners.some(o => o > 8),
    });
    inst.dispose(); host.remove();
  }

  // --- Scenario 3: garbage param types the compiler also accepts.
  {
    const host = mk();
    let threw = null, lanes = null;
    try {
      const inst = window.VisualKit.mount(host, {
        mode: 'queue-flow', params: { lanes: 'six', rate: 100, sinks: 2, capacity: 30 },
      });
      await sleep(300);
      lanes = inst.sim.state.partitions.length;
      inst.dispose();
    } catch (e) { threw = e.message; }
    host.remove();
    out.push({
      scenario: "lanes:'six' (manifest declares lanes:'int' -- is the type enforced?)",
      threw, resultingLaneCount: lanes,
      note: 'manifest types are declared but validateVisual never checks them',
    });
  }
  return out;
});
R.errors = errs;
console.log(JSON.stringify(R, null, 2));
await b.close();
