// ADVERSARIAL: the FIX-PLAN says Phase 4 is "the only three things markdown genuinely
// cannot express" and "None of the 38 need them today". For B3 (code.mjs string rule)
// that is FALSE. shikiLang() returns null for js/ts (shiki-highlight.mjs:46), so every
// js/ts fence in the 38 is highlighted by code.mjs. Adding a string alternative to
// TOKEN (code.mjs:27) restyles all of them -> the generated modules CHANGE -> byte
// identity breaks, and the plan's _plan_regress.mjs never tests it.
import fs from 'node:fs';
import { code } from '../../tools/compiler/code.mjs';

const FENCE = /```(js|ts)\r?\n([\s\S]*?)```/g;
const STR = /'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g;

const files = fs.readdirSync('src/topics-md').filter((f) => f.endsWith('.md')).sort();
let fences = 0, withStr = 0, strTokens = 0;
const topicsHit = new Set();
let sample = null;

for (const f of files) {
  const src = fs.readFileSync('src/topics-md/' + f, 'utf8');
  let m;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(src))) {
    fences++;
    const body = m[2];
    // strip comments first: code.mjs treats //... and --... as comment (already <span class="c">)
    const codeOnly = body.split('\n').map((l) => {
      const marks = [l.indexOf('//'), l.indexOf('--')].filter((x) => x >= 0);
      const ci = marks.length ? Math.min(...marks) : -1;
      return ci >= 0 ? l.slice(0, ci) : l;
    }).join('\n');
    const hits = codeOnly.match(STR) || [];
    if (hits.length) {
      withStr++; strTokens += hits.length; topicsHit.add(f);
      if (!sample) sample = { f, body: body.trim(), hits };
    }
  }
}

console.log('=== B3 BLAST RADIUS on the 38 (the plan calls Phase 4 inert -- it is not) ===\n');
console.log('  js/ts fences routed through code.mjs (shikiLang -> null) : ' + fences);
console.log('  ...of those, containing a quoted string                  : ' + withStr);
console.log('  distinct TOPICS whose generated module would change      : ' + topicsHit.size);
console.log('  string tokens that would NEWLY emit <span class="s">     : ' + strTokens);

if (sample) {
  console.log('\n=== sample: ' + sample.f + ' ===');
  console.log('strings found: ' + JSON.stringify(sample.hits.slice(0, 6)));
  console.log('\n--- code() output TODAY (no <span class="s"> anywhere) ---');
  const out = code(sample.body);
  console.log(out.split('\n').slice(0, 4).join('\n'));
  console.log('\n  contains <span class="s">? ' + /class="s"/.test(out));
}
console.log('\nCONCLUSION: B3 is NOT a no-op for the 38. It rewrites ' + strTokens + ' tokens across '
  + topicsHit.size + ' topics, changing generated output. The plan\'s _plan_regress.mjs tests the');
console.log('PARSER only -- it would not catch this. Any visual/byte baseline must be re-blessed.');
