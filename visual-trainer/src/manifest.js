// Pure metadata (no three.js): the mode registry manifest. Imported by the
// kit AND serialized to src/scripts/visuals/manifest.json for the markdown
// compiler to validate ## Visual blocks against at build time.
export const KIT_MANIFEST = {
  version: 1,
  modes: {
    'queue-flow': {
      params: { lanes: 'int', rate: 'number', sinks: 'int', capacity: 'number' },
      sets: ['rate', 'sinks', 'capacity', 'slow'],
      labels: ['src', 'queue', 'sink'],
    },
  },
};
