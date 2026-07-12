// One factory behind every queue mode. Both registered modes are built here, so
// they cannot drift in the wiring that ought to be identical (createSim / apply /
// reset / scene) and can only differ in the things that are genuinely different:
// their SEMANTICS, their vocabulary, and their readouts.
//
// THE LOAD-BEARING LINE IS `...spec.semantics`.
// A mode's capacityModel and groupStallSecs come from the MODE, and are NOT in
// the authorable param list the compiler validates a topic's `## Visual` block
// against (see ../manifest.js). So a topic author physically cannot hand
// `queue-flow` a partition cap or a stop-the-world rebalance: those keys are
// rejected at BUILD time. To get Kafka semantics you must name the Kafka mode --
// a name that states what it teaches. Semantics you cannot silently inherit.
import { createSim } from '../sim/queue.js';
import { createScene } from '../render/scene.js';

export function makeQueueMode(spec) {
  const D = spec.defaults;
  return {
    id: spec.id,
    semantics: spec.semantics,
    createSim(params = {}) {
      return createSim({
        lanes: params.lanes ?? D.lanes,
        producerRate: params.rate ?? D.rate,
        sinks: params.sinks ?? D.sinks,
        sinkCapacity: params.capacity ?? D.capacity,
        ...spec.semantics,            // NOT author-settable -- see the note above
      });
    },
    buildScene(canvas, sim) { return createScene(canvas, sim); },
    apply(sim, set = {}) {
      if (set.rate !== undefined) sim.setProducerRate(set.rate);
      if (set.sinks !== undefined) sim.setSinkCount(set.sinks);
      if (set.capacity !== undefined) sim.setSinkCapacity(set.capacity);
      if (set.slow !== undefined) {
        sim.setSlowSink(set.slow === true ? 0 : set.slow === false ? -1 : set.slow);
      }
    },
    reset(sim, params = {}) {
      this.apply(sim, { rate: params.rate ?? D.rate, capacity: params.capacity ?? D.capacity, slow: false });
      const n = params.sinks ?? D.sinks;
      if (sim.state.sinks !== n) sim.setSinkCount(n);
      sim.state.stallRemaining = 0;             // a story starts clean, never mid-stall
      for (const ln of sim.state.lanes) ln.lag = 0;
      // NB: produced/consumed are deliberately NOT zeroed. The particle layer is
      // driven by DELTAS of those monotonic counters (framework/flow.js), so
      // resetting them would emit a negative delta and stall every lane's spawn.
    },
    controls: spec.controls,
    readouts: spec.readouts,
    status: spec.status,
  };
}
