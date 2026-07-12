// Attribute every byte of the bundle to a topic / pane, so "what dominates" is a
// measurement, not an opinion. Spans run from one top-level TOPIC_* decl to the next.
import fs from 'node:fs';
import zlib from 'node:zlib';

const src = fs.readFileSync(process.argv[2], 'utf8');
const fileBytes = Buffer.byteLength(src, 'utf8');
const tagRe = /<script\b([^>]*)>/gi;
let m, mega = '';
while ((m = tagRe.exec(src)) !== null) {
  const bs = m.index + m[0].length;
  const ci = src.slice(bs).search(/<\/script\s*>/i);
  if (ci < 0) continue;
  const b = src.slice(bs, bs + ci);
  if (b.length > mega.length) mega = b;
  tagRe.lastIndex = bs + ci;
}

const declRe = /(?:^|\n)\s*(?:const|var|let)\s+(TOPIC_[A-Z0-9_]+)\s*=/g;
const decls = [];
while ((m = declRe.exec(mega)) !== null) decls.push({ name: m[1], at: m.index });
decls.sort((a, b) => a.at - b.at);

const spans = [];
for (let i = 0; i < decls.length; i++) {
  const end = i + 1 < decls.length ? decls[i + 1].at : mega.length;
  spans.push({ name: decls[i].name, bytes: end - decls[i].at, at: decls[i].at });
}

// TOPIC_<SLUG>_<PANE>  -- pane is the last segment
const byTopic = new Map(), byPane = new Map();
let topicMass = 0;
for (const s of spans) {
  const parts = s.name.replace(/^TOPIC_/, '').split('_');
  const pane = parts.length > 1 ? parts[parts.length - 1] : '(single)';
  const slug = parts.length > 1 ? parts.slice(0, -1).join('_') : parts[0];
  byTopic.set(slug, (byTopic.get(slug) || 0) + s.bytes);
  byPane.set(pane, (byPane.get(pane) || 0) + s.bytes);
  topicMass += s.bytes;
}

const kb = (n) => (n / 1024).toFixed(0).padStart(7) + ' KB';
const pf = (n) => ((n / fileBytes) * 100).toFixed(1).padStart(5) + '%';

console.log(`\nfile ${fileBytes.toLocaleString()} B   mega-script ${Buffer.byteLength(mega, 'utf8').toLocaleString()} B`);
console.log(`TOPIC_* declarations: ${spans.length}   distinct topics: ${byTopic.size}   distinct panes: ${byPane.size}`);
console.log(`\n### TOPIC MASS (sum of all TOPIC_* spans) = ${kb(topicMass)}  ${pf(topicMass)} of file\n`);

console.log('-- by PANE (across all topics) --');
for (const [p, b] of [...byPane.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${p.padEnd(14)} ${kb(b)}  ${pf(b)}`);
}

console.log('\n-- by TOPIC (top 20 of ' + byTopic.size + ') --');
const sorted = [...byTopic.entries()].sort((a, b) => b[1] - a[1]);
for (const [t, b] of sorted.slice(0, 20)) console.log(`  ${t.padEnd(14)} ${kb(b)}  ${pf(b)}`);
console.log('  ...');
for (const [t, b] of sorted.slice(-5)) console.log(`  ${t.padEnd(14)} ${kb(b)}  ${pf(b)}`);

const tb = sorted.map((x) => x[1]);
const mean = tb.reduce((a, c) => a + c, 0) / tb.length;
console.log(`\n  mean ${(mean / 1024).toFixed(0)} KB/topic   max ${(tb[0] / 1024).toFixed(0)} KB   min ${(tb[tb.length - 1] / 1024).toFixed(0)} KB`);

// everything NOT topic content = the engine
const engine = fileBytes - topicMass;
console.log(`\n### ENGINE (everything that is not a TOPIC_* span) = ${kb(engine)}  ${pf(engine)}`);
console.log(`    (app code + web components + three.js kit + css + markup + fonts)`);
console.log('');
