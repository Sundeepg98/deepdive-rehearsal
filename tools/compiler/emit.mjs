// tools/compiler/emit.mjs -- the emitter (back half of Layer A): structured topic data ->
// the module .js files. Serializes each object as a JS literal, escaping every non-ASCII
// char to \uXXXX so the module stays 7-bit ASCII (matching how the hand-authored modules
// store Unicode). Formatting is canonical, not byte-identical to the hand files -- what
// matters is that the module eval's to the same data, which the app then renders identically.

function jsLiteral(obj) {
  return JSON.stringify(obj, null, 2)
    .replace(/[\u0080-\uFFFF]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase());
}

export function emit(topic) {
  const P = 'TOPIC_' + topic.prefix;
  const files = {};
  files['identity.js'] = `var ${P}_IDENTITY = ${jsLiteral(topic.identity)};\n`;
  const views = Object.keys(topic.views);
  for (const v of views) files[`${v}.js`] = `var ${P}_${v.toUpperCase()} = ${jsLiteral(topic.views[v])};\n`;
  const dataRefs = views.map((v) => `    ${v}: ${P}_${v.toUpperCase()}`).join(',\n');
  files['register.js'] =
    `TopicRegistry.register({\n  id: '${topic.id}',\n  identity: ${P}_IDENTITY,\n` +
    `  data: {\n${dataRefs}\n  }\n});\n`;
  return files;
}
