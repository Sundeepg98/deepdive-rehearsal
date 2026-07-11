// B3 blast radius, CORRECTED. code() (code.mjs) is reachable from exactly ONE call site:
//   parse_md.mjs:113  parseSteps -> `const sl = shikiLang(lang); if (sl) step.shiki=...; else step.code = code(body);`
// So ONLY fences inside ## Walk, with lang in {'', js, ts, javascript, typescript}, are highlighted by code.mjs.
//   - ## Numbers  js fence -> parse_md.mjs:387 captures compute RAW (never code())
//   - ## Whiteboard fence -> parse_md.mjs:286 captures diagram RAW
//   - ## Visual   fence -> JSON.parse
// Measure the REAL set.
import fs from 'node:fs';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { code } from '../../tools/compiler/code.mjs';
import { shikiLang } from '../../tools/compiler/shiki-highlight.mjs';

const md = new MarkdownIt();
const STR = /'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g;

function splitH2(toks) {
  const blocks = []; let cur = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h2') { cur = { title: toks[i + 1].content, toks: [] }; blocks.push(cur); i += 2; continue; }
    if (cur) cur.toks.push(t);
  }
  return blocks;
}

const files = fs.readdirSync('src/topics-md').filter((f) => f.endsWith('.md')).sort();
let walkCodeFences = 0, withStr = 0, strTokens = 0;
const topicsHit = new Set();
let sample = null;

for (const f of files) {
  const { content } = matter(fs.readFileSync('src/topics-md/' + f, 'utf8'));
  for (const b of splitH2(md.parse(content, {}))) {
    if (b.title.toLowerCase() !== 'walk') continue;   // ONLY ## Walk reaches code()
    for (const t of b.toks) {
      if (t.type !== 'fence') continue;
      const lang = t.info.trim();
      if (lang === 'flow' || lang === 'mermaid') continue;
      if (shikiLang(lang)) continue;                  // routed to shiki, NOT code.mjs
      walkCodeFences++;
      const body = t.content.replace(/\n$/, '');
      const codeOnly = body.split('\n').map((l) => {
        const marks = [l.indexOf('//'), l.indexOf('--')].filter((x) => x >= 0);
        const ci = marks.length ? Math.min(...marks) : -1;
        return ci >= 0 ? l.slice(0, ci) : l;
      }).join('\n');
      const hits = codeOnly.match(STR) || [];
      if (hits.length) {
        withStr++; strTokens += hits.length; topicsHit.add(f);
        if (!sample) sample = { f, body, hits };
      }
    }
  }
}

console.log('=== B3 BLAST RADIUS -- CORRECTED (only ## Walk fences reach code.mjs) ===\n');
console.log('  ## Walk fences highlighted by code.mjs        : ' + walkCodeFences);
console.log('  ...of those, containing a quoted string       : ' + withStr);
console.log('  distinct TOPICS whose generated walk.js changes: ' + topicsHit.size + ' / 38');
console.log('  string tokens that would NEWLY emit class="s" : ' + strTokens);
if (sample) {
  console.log('\n  sample (' + sample.f + '): ' + JSON.stringify(sample.hits.slice(0, 5)));
  console.log('  today contains class="s"? ' + /class="s"/.test(code(sample.body)));
}
console.log('\nVERDICT: B3 changes generated walk.js for ' + topicsHit.size + ' of 38 topics ('
  + strTokens + ' tokens).');
console.log('It is NOT the inert "the 38 do not need it" change the plan claims, and');
console.log('_plan_regress.mjs (parser-only) does not test it.');
