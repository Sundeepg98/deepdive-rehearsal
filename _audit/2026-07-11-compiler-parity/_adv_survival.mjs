// ADVERSARIAL PROBE v2 (rigorous): TEXT-SURVIVAL against the REAL parser.
//
// Method: run the ACTUAL shipping parseMarkdown() over all 38 .md. Flatten the
// resulting structure to one string. For every source paragraph / list-item /
// heading, take a clean alphanumeric fingerprint (longest run free of markdown
// punctuation, >=25 chars) and ask: does it survive anywhere in the output?
//
// A missing fingerprint == the parser DROPPED that authored content. This cannot
// produce the loose-list false positive that killed probe v1, and it is agnostic
// to prose()/HTML transformation.
//
// Usage: node _audit/2026-07-11-compiler-parity/_adv_survival.mjs [--parser <path>]
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const argi = process.argv.indexOf('--parser');
const PARSER = argi > -1 ? process.argv[argi + 1] : '../../tools/compiler/parse_md.mjs';
const { parseMarkdown } = await import(PARSER);

const md = new MarkdownIt();
const DIR = 'src/topics-md';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

// longest substring free of chars that prose()/flow()/code() rewrite
function fingerprint(raw) {
  const runs = String(raw).split(/[^A-Za-z0-9 ]+/).map((s) => s.trim()).filter((s) => s.length >= 25);
  if (!runs.length) return null;
  runs.sort((a, b) => b.length - a.length);
  return norm(runs[0]).slice(0, 50);
}

function flatten(o, acc = []) {
  if (o == null) return acc;
  if (typeof o === 'string') { acc.push(o); return acc; }
  if (typeof o === 'number' || typeof o === 'boolean') return acc;
  if (Array.isArray(o)) { for (const v of o) flatten(v, acc); return acc; }
  for (const k of Object.keys(o)) { acc.push(k); flatten(o[k], acc); }
  return acc;
}

// Collect source content units per ## section
function units(toks) {
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'inline') {
      // a paragraph may hold several logical lines; test each independently
      for (const line of t.content.split('\n')) {
        const fp = fingerprint(line);
        if (fp) out.push({ fp, line });
      }
    }
    if (t.type === 'fence') continue; // code/flow/json: handled by Layer C, not prose
  }
  return out;
}

function splitH2(toks) {
  const blocks = []; let cur = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h2') { cur = { title: toks[i + 1].content, toks: [] }; blocks.push(cur); i += 2; continue; }
    if (cur) cur.toks.push(t);
  }
  return blocks;
}

const bySection = {};
const samples = {};
let totalUnits = 0, totalLost = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const parsed = parseMarkdown(src, { index: 1, total: 38 });
  const flat = norm(flatten(parsed).join(''));

  const { content } = matter(src);
  for (const b of splitH2(md.parse(content, {}))) {
    const sec = b.title;
    bySection[sec] ??= { units: 0, lost: 0 };
    for (const u of units(b.toks)) {
      bySection[sec].units++; totalUnits++;
      if (!flat.includes(u.fp)) {
        bySection[sec].lost++; totalLost++;
        (samples[sec] ??= []).push(`${f}: ${u.line.slice(0, 88)}`);
      }
    }
  }
}

console.log('=== TEXT-SURVIVAL vs the REAL parser: ' + PARSER + ' ===');
console.log('    (a "lost" unit = authored text with NO surviving trace in the parsed output)\n');
const rows = Object.entries(bySection).sort((a, b) => b[1].lost - a[1].lost);
console.log('  LOST / UNITS   SECTION');
for (const [sec, v] of rows) {
  const flag = v.lost > 0 ? '  <== DROPPED' : '';
  console.log(String(v.lost).padStart(6) + ' /' + String(v.units).padStart(5) + '   ' + sec.padEnd(18) + flag);
}
console.log('\n  TOTAL LOST: ' + totalLost + ' / ' + totalUnits + ' authored units');
console.log('\n=== samples of lost content (max 3/section) ===');
for (const [sec, list] of Object.entries(samples)) {
  console.log('\n## ' + sec + '  (' + list.length + ' lost)');
  for (const s of list.slice(0, 3)) console.log('   - ' + s);
}
