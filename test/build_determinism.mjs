// GUARD: the build's syntax highlighting does not depend on the wall clock (i.e. on machine
// load). This is the check for the bug that made `npm run build` a coin flip -- same source,
// different bytes, ~10% of builds -- which build_integrity correctly caught as a nondeterministic
// build but could only FLAG intermittently, never localise.
//
// ROOT CAUSE. Shiki's tokenizer (@shikijs/primitive) gives each LINE a wall-clock budget, default
// 500ms, read from Date.now() inside the scan loop. Preempt a line past that budget -- a GC pause,
// a busy machine, ten builds back to back -- and the tokenizer BAILS, emitting the rest of the
// line as one unstyled token and silently dropping its colors. tools/compiler/shiki-highlight.mjs
// now passes tokenizeTimeLimit:0, which disables that branch so tokenization runs to completion
// regardless of load.
//
// WHY NOT "build twice and diff the bytes". That is the obvious check and it is DECORATION for
// this bug: the flip is intermittent and load-dependent, so two clean builds agree ~90% of the
// time and the gate would pass on the broken code almost always. A check you cannot make fail on
// demand cannot prove a fix. So this drives the INVARIANT directly: it renders the real build's
// Shiki path under a SIMULATED stall (a Date.now that jumps past any budget, which is exactly what
// a scheduler preemption looks like to that loop) and asserts the output is byte-identical to the
// unstalled render. With the fix, the timeout branch is dead and the two match; without it, the
// stalled render degrades and they differ -- deterministically, every run.
//
// NEGATIVE CONTROL (so this is not the twelfth check here that cannot fail): before trusting the
// stall, it proves the stall is REAL -- a raw highlighter at the DEFAULT budget must degrade under
// the same clock. If it does not, the clock is toothless and the whole check is meaningless, so it
// ABORTS as a harness fault rather than reporting a green it did not earn.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';
import { shikiLang, renderShiki, closeShiki } from '../tools/compiler/shiki-highlight.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MD_DIR = path.join(ROOT, 'src', 'topics-md');

// A clock that jumps forward one budget+ per read: to the tokenize loop this is indistinguishable
// from being preempted mid-line, and it trips the timeout on the FIRST in-loop check. Restored in
// finally so it cannot leak into the rest of the process. Tokenization inside codeToHtml is
// synchronous, so installing this around an awaited render keeps it active for the whole tokenise.
function underStall(fn) {
  const real = Date.now;
  let t = real.call(Date);
  Date.now = () => { t += 600; return t; };
  try { return fn(); } finally { Date.now = real; }
}
async function underStallAsync(fn) {
  const real = Date.now;
  let t = real.call(Date);
  Date.now = () => { t += 600; return t; };
  try { return await fn(); } finally { Date.now = real; }
}

function fail(msg) { console.error('BUILD DETERMINISM: FAIL\n  - ' + msg); process.exit(1); }

// Every Shiki-eligible fenced block the authors actually wrote -- the real corpus the build feeds
// through renderShiki, deduped. Guarding the mechanism on a hardcoded sample would leave a new
// authored block untested; extracting from source keeps the check honest as content grows.
function corpus() {
  const blocks = [];
  const seen = new Set();
  for (const f of fs.existsSync(MD_DIR) ? fs.readdirSync(MD_DIR).filter((x) => x.endsWith('.md')).sort() : []) {
    const src = fs.readFileSync(path.join(MD_DIR, f), 'utf8');
    for (const m of src.matchAll(/```([A-Za-z0-9_-]+)\r?\n([\s\S]*?)\r?\n```/g)) {
      const lang = shikiLang(m[1]);
      if (!lang) continue;                       // JS/TS/unknown stay on the minimal highlighter
      const key = lang + '\0' + m[2];
      if (seen.has(key)) continue;
      seen.add(key);
      blocks.push({ file: f, lang, code: m[2] });
    }
  }
  return blocks;
}

async function main() {
  // --- NEGATIVE CONTROL: prove the simulated stall genuinely trips a default-budget tokenizer. --
  // Independent of renderShiki on purpose: its own highlighter, at Shiki's default budget. If the
  // stalled render equals the clean one, the clock is not hostile and every assertion below is
  // vacuous -- abort rather than pass.
  const ctrlCode = "-- the database appends the predicate, even if a query forgets it";
  const ctrlTheme = { name: 't', type: 'dark', colors: { 'editor.foreground': '#E7E4F5' },
                      tokenColors: [{ scope: ['comment', 'punctuation.definition.comment'],
                                      settings: { foreground: '#9b95c9' } }] };
  const ctrlHl = await createHighlighter({ themes: [ctrlTheme], langs: ['sql'] });
  const ctrlClean = ctrlHl.codeToHtml(ctrlCode, { lang: 'sql', theme: 't' });          // default budget
  const ctrlStalled = underStall(() => ctrlHl.codeToHtml(ctrlCode, { lang: 'sql', theme: 't' }));
  ctrlHl.dispose();
  if (ctrlStalled === ctrlClean) {
    console.error('BUILD DETERMINISM: FAIL');
    console.error('  - HARNESS FAULT: the simulated stall did not change a default-budget render, so it '
      + 'proves nothing. The check cannot certify determinism with a toothless control. (Did Shiki change '
      + 'how tokenizeTimeLimit is read?)');
    process.exit(1);
  }

  // --- THE INVARIANT: the BUILD's Shiki path must be load-independent. -------------------------
  const blocks = corpus();
  if (blocks.length === 0) fail('found no Shiki code blocks in src/topics-md/ to test -- extraction is broken (the SQL/python/yaml blocks that ship should be here).');

  await renderShiki('SELECT 1;', 'sql');       // warm the module highlighter before the clock games
  let checked = 0;
  for (const b of blocks) {
    const clean = await renderShiki(b.code, b.lang);
    const stalled = await underStallAsync(() => renderShiki(b.code, b.lang));
    if (stalled !== clean) {
      const i = [...clean].findIndex((c, k) => c !== stalled[k]);
      await closeShiki();
      fail('renderShiki output depends on the wall clock -- the build is NONDETERMINISTIC. A '
        + b.lang + ' block in ' + b.file + ' highlights differently under load (first diff at char '
        + i + '). tools/compiler/shiki-highlight.mjs must pass tokenizeTimeLimit:0 so tokenization '
        + 'ignores machine load. clean[' + JSON.stringify(clean.slice(Math.max(0, i - 20), i + 40))
        + '] stalled[' + JSON.stringify(stalled.slice(Math.max(0, i - 20), i + 40)) + ']');
    }
    checked++;
  }
  await closeShiki();
  console.log('BUILD DETERMINISM: PASS  (%d Shiki blocks render identically under a simulated 600ms/line '
    + 'stall; control confirmed the stall trips a default-budget tokenizer)', checked);
}

main().catch((e) => { console.error('BUILD DETERMINISM: FAIL\n  - ' + (e && e.stack || e)); process.exit(1); });
