// tools/compiler/emit.mjs -- the emitter: structured topic data -> the module .js files.
// Serializes each object as a JS literal, escaping every non-ASCII char to \uXXXX so the
// module stays 7-bit ASCII (matching how the hand-authored modules store Unicode). Two views
// need raw injection rather than serialization:
//   - num.compute is a FUNCTION (its source captured verbatim); emitted as raw code.
//   - bank.cards / bank.speak REFERENCE the drill slice (TOPIC_<P>_DRILL.*), so the large card
//     array is not duplicated (drill.js loads before bank.js in the bundle).

function escapeAscii(s) {
  return s.replace(/[\u0080-\uFFFF]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase());
}
function jsLiteral(obj) { return escapeAscii(JSON.stringify(obj, null, 2)); }

export function emit(topic) {
  const P = 'TOPIC_' + topic.prefix;
  const files = {};
  files['identity.js'] = `var ${P}_IDENTITY = ${jsLiteral(topic.identity)};\n`;
  const views = Object.keys(topic.views);
  for (const v of views) {
    const val = topic.views[v];
    if (v === 'num' && val.compute !== undefined) {
      const lit = jsLiteral({ ...val, compute: '__COMPUTE_FN__' }).replace('"__COMPUTE_FN__"', () => escapeAscii(val.compute));
      files['num.js'] = `var ${P}_NUM = ${lit};\n`;
    } else if (v === 'bank') {
      const lit = jsLiteral({ cards: '__CARDS__', speak: '__SPEAK__', ...val })
        .replace('"__CARDS__"', () => `${P}_DRILL.cards`).replace('"__SPEAK__"', () => `${P}_DRILL.speak`);
      files['bank.js'] = `var ${P}_BANK = ${lit};\n`;
    } else {
      files[`${v}.js`] = `var ${P}_${v.toUpperCase()} = ${jsLiteral(val)};\n`;
    }
  }
  const dataRefs = views.map((v) => `    ${v}: ${P}_${v.toUpperCase()}`).join(',\n');
  files['register.js'] =
    `TopicRegistry.register({\n  id: '${topic.id}',\n  identity: ${P}_IDENTITY,\n` +
    `  data: {\n${dataRefs}\n  }\n});\n`;
  return files;
}
