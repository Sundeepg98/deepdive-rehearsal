// replay.mjs -- deterministic story replay + trajectory digest.
//
// WHY THIS EXISTS: the queue sim was generalised (Kafka's partition-capped
// capacity and stop-the-world rebalance became OPT-IN semantics instead of
// hard-wired truths). kafka-internals ships a visual built on the Kafka
// semantics and it was CORRECT before the change -- so "correct" here does not
// mean "passes some invariants", it means "produces the EXACT trajectory it
// produced before". This module replays a topic's authored ## Visual stories
// through a mode adapter and digests every number the sim produced, so that
// equality can be asserted against a golden captured from the pre-change code.
//
// Pure: no DOM, no three.js, no randomness. Mirrors the kit's loop ordering
// (kit.js: simTick = sim.tick(dt) then driver.tick()) and the story driver's
// step firing (hud.js: fire every step whose t <= elapsed).

export const DT = 1 / 30;

// FNV-1a over the fixed-precision text of every value the sim exposes. A digest
// (not a stored full trace) because the full 30 Hz trajectory of both stories is
// ~36k doubles: too big to commit, and a hash is a STRICTER equality test than a
// rounded trace anyway.
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('0000000' + h.toString(16)).slice(-8);
}

// Every observable the renderer and the HUD can read. If any of these drifts,
// the visual a learner sees has changed.
function sample(sim) {
  const lanes = sim.state.lanes;
  const f = (x) => x.toFixed(6);
  return [
    f(sim.state.t), f(sim.state.producerRate), String(sim.state.sinks),
    f(sim.state.sinkCapacity), String(sim.state.slowSink),
    f(sim.state.stallRemaining), sim.stalled() ? '1' : '0',
    f(sim.totalLag()), f(sim.effectiveCapacity()), String(sim.idleSinks()), sim.status(),
    lanes.map((l) => f(l.lag) + ':' + f(l.produced) + ':' + f(l.consumed) + ':' + l.sink).join(','),
  ].join('|');
}

// Replay ONE authored story exactly as the kit + story driver would run it.
// steps: the topic's authored [{ t, cap?, set? }]; endT defaults to the last t.
export function replayStory(mode, params, steps, opts = {}) {
  const sim = mode.createSim(params);
  mode.reset(sim, params);                       // driver.run() -> init()
  const start = sim.state.t;
  const endT = opts.endT ?? Math.max(...steps.map((s) => s.t));
  const rows = [];
  let i = 0;
  const fire = () => {                           // driver.tick(): all steps due by now
    const el = sim.state.t - start;
    while (i < steps.length && el >= steps[i].t - 1e-9) {
      if (steps[i].set) mode.apply(sim, steps[i].set);
      i += 1;
    }
  };
  fire();                                        // the t=0 step lands before the first tick
  rows.push(sample(sim));
  const n = Math.round(endT / DT);
  for (let k = 0; k < n; k++) {
    sim.tick(DT);                                // kit.js loop: tick, THEN driver
    fire();
    rows.push(sample(sim));
  }
  return {
    digest: fnv1a(rows.join('\n')),
    ticks: rows.length,
    // A small human-readable trace so a digest mismatch is DEBUGGABLE rather
    // than just red. Sampled at 2 Hz.
    trace: rows.filter((_, k) => k % 15 === 0).map((r) => {
      const c = r.split('|');
      return { t: +c[0], lag: +(+c[7]).toFixed(3), cap: +c[8], sinks: +c[2], stalled: +c[6], idle: +c[9], status: c[10] };
    }),
  };
}
