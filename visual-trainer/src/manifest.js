// Pure metadata (no three.js): the mode registry manifest. Imported by the kit
// AND serialized to src/scripts/visuals/manifest.json for the markdown compiler
// to validate `## Visual` blocks against at build time.
//
// THIS IS THE ENFORCEMENT SURFACE. `params` is the exhaustive whitelist of keys
// a topic may set, and the compiler hard-fails the build on anything else
// (tools/compiler/compile.mjs -> validateVisual). Note what is NOT in either
// mode's list: `capacityModel` and `groupStallSecs`. Simulation SEMANTICS are
// chosen by naming a mode, never by a parameter -- so a topic cannot give
// `queue-flow` a partition cap or a stop-the-world rebalance, and cannot
// silently inherit Kafka's physics under a generic name. Adding a param here is
// how you widen what topics may author; think before you do.
export const KIT_MANIFEST = {
  version: 2,
  modes: {
    // Generic: interchangeable workers, shared backlog. Linear capacity, no
    // stall, work-conserving. The mode the dynamic-concept topics adopt.
    'queue-flow': {
      semantics: 'shared-pool',
      params: { lanes: 'int', rate: 'number', sinks: 'int', capacity: 'number' },
      sets: ['rate', 'sinks', 'capacity', 'slow'],
      labels: ['src', 'queue', 'sink'],
    },
    // Kafka consumer group ONLY: partition-capped capacity + stop-the-world
    // rebalance. Both are false for a worker pool -- do not adopt this for one.
    'kafka-consumer-lag': {
      semantics: 'partitioned-consumer-group',
      params: { lanes: 'int', rate: 'number', sinks: 'int', capacity: 'number' },
      sets: ['rate', 'sinks', 'capacity', 'slow'],
      labels: ['src', 'queue', 'sink'],
    },
  },
};
