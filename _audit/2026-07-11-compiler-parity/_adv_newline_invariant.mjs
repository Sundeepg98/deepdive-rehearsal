// A GENERIC corruption invariant the plan does not propose.
//
// The plan's conservation test detects DROPS generically (counts) but CORRUPTIONS only
// via hand-written per-bug probes (chipSwallowedAnswer, curveTheme). A probe you must
// write per-bug cannot catch the NEXT bug.
//
// But every fusion bug in this parser (F2 chip, F4 senior/speak, F6 task/model/int) has
// ONE signature: markdown-it merged soft-wrapped lines into a paragraph, and the field
// swallowed the rest -- so the emitted leaf carries an EMBEDDED NEWLINE. A single
// invariant catches the whole class, today and in future:
//
//     no single-value leaf field may contain "\n"
//
// (Legitimately multi-line fields -- code, shiki.code, diagram, mermaid, compute -- are
// exempt by name.)
import fs from 'node:fs';

const PARSER = process.argv[2] || '../../tools/compiler/parse_md.mjs';
const { parseMarkdown } = await import(PARSER);

// fields that are legitimately multi-line (Layer C payloads, not prose leaves)
const MULTILINE_OK = new Set(['code', 'compute', 'diagram', 'mermaid', 'flow']);

const files = fs.readdirSync('src/topics-md').filter((f) => f.endsWith('.md')).sort();
const byPath = {};
let total = 0;

function walk(o, trail, topic) {
  if (o == null) return;
  if (typeof o === 'string') {
    const leaf = trail[trail.length - 1];
    if (MULTILINE_OK.has(leaf)) return;
    if (o.includes('\n')) {
      const p = trail.filter((s) => !/^\d+$/.test(s)).join('.');
      (byPath[p] ??= { n: 0, ex: null });
      byPath[p].n++; total++;
      if (!byPath[p].ex) byPath[p].ex = topic + ': ' + JSON.stringify(o.slice(0, 72));
    }
    return;
  }
  if (typeof o !== 'object') return;
  if (Array.isArray(o)) { o.forEach((v, i) => walk(v, trail.concat(String(i)), topic)); return; }
  for (const k of Object.keys(o)) walk(o[k], trail.concat(k), topic);
}

for (const f of files) {
  const out = parseMarkdown(fs.readFileSync('src/topics-md/' + f, 'utf8'), { index: 1, total: 38 });
  walk(out.views, [], f);
  walk(out.identity, [], f);
}

console.log('=== GENERIC FUSION INVARIANT: "no single-value leaf may contain \\n" ===');
console.log('    parser: ' + PARSER + '\n');
if (!total) {
  console.log('  PASS -- 0 fused leaves. No paragraph-merge corruption anywhere.');
} else {
  console.log('  ' + 'FIELD'.padEnd(28) + 'FUSED');
  console.log('  ' + '-'.repeat(52));
  for (const [p, v] of Object.entries(byPath).sort((a, b) => b[1].n - a[1].n)) {
    console.log('  ' + p.padEnd(28) + String(v.n).padStart(4));
    console.log('      e.g. ' + v.ex);
  }
  console.log('\n  TOTAL FUSED LEAVES: ' + total + '   <== FAIL');
}
