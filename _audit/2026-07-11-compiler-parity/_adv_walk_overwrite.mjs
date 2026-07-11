// F7 (NEW — absent from the FIX-PLAN): parseSteps supports exactly ONE code block and
// ONE caption per walk step. A second fence OVERWRITES step.code/step.shiki; a second
// post-code paragraph OVERWRITES step.cap; a third pre-code paragraph OVERWRITES step.deep.
// parse_md.mjs:109-122 -- every assignment is unconditional, last-wins.
//
// This measures how much authored content the CURRENT parser annihilates in ## Walk,
// and proves the plan's "607 recovered = 100% conservation" claim is incomplete.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { shikiLang } from '../../tools/compiler/shiki-highlight.mjs';

const md = new MarkdownIt();
const DIR = 'src/topics-md';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();

function splitH2(toks) {
  const blocks = []; let cur = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h2') { cur = { title: toks[i + 1].content, toks: [] }; blocks.push(cur); i += 2; continue; }
    if (cur) cur.toks.push(t);
  }
  return blocks;
}

let lostCode = 0, lostCap = 0, lostDeep = 0;
const hits = [];

for (const f of files) {
  const { content } = matter(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const b of splitH2(md.parse(content, {}))) {
    if (b.title.toLowerCase() !== 'walk') continue;
    const toks = b.toks;
    let step = null, modelMode = false;
    // replicate parse_md.mjs:84-123 EXACTLY, but count overwrites instead of silently doing them
    let hasCode = false, capSet = false, deepSet = false, insSet = false;
    const open = (title) => { step = title; hasCode = false; capSet = false; deepSet = false; insSet = false; };
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (t.type === 'heading_open' && t.tag === 'h3') {
        const title = toks[i + 1].content;
        if (title === 'Model Script') { modelMode = true; step = null; i += 2; continue; }
        open(title); i += 2; continue;
      }
      if (modelMode) continue;
      if (t.type === 'fence' && step) {
        const lang = t.info.trim();
        if (lang === 'flow' || lang === 'mermaid') continue;      // separate slots, not overwritten by code
        const isCode = true;                                       // shiki OR code -- both land in the ONE code slot
        if (isCode && hasCode) {
          lostCode++;
          hits.push(`${f} :: step "${step.slice(0, 44)}" -- 2nd fence (${lang || 'plain'}) OVERWRITES the 1st code block [${(shikiLang(lang) ? 'shiki' : 'code')}]`);
        }
        hasCode = true;
        continue;
      }
      if (t.type === 'paragraph_open' && step) {
        if (!insSet) { insSet = true; }
        else if (hasCode) {
          if (capSet) { lostCap++; hits.push(`${f} :: step "${step.slice(0, 44)}" -- extra post-code paragraph OVERWRITES step.cap`); }
          capSet = true;
        } else {
          if (deepSet) { lostDeep++; hits.push(`${f} :: step "${step.slice(0, 44)}" -- extra pre-code paragraph OVERWRITES step.deep`); }
          deepSet = true;
        }
        i += 2; continue;
      }
    }
  }
}

console.log('=== F7: ## Walk last-wins OVERWRITES (NOT in the FIX-PLAN, NOT in prove_conservation) ===\n');
console.log('  code blocks annihilated by a later fence : ' + lostCode);
console.log('  captions   annihilated by a later para   : ' + lostCap);
console.log('  deep paras annihilated by a later para   : ' + lostDeep);
console.log('  ------------------------------------------------');
console.log('  TOTAL authored units destroyed in Walk   : ' + (lostCode + lostCap + lostDeep));
console.log('\n=== every occurrence ===');
for (const h of hits) console.log('  - ' + h);
