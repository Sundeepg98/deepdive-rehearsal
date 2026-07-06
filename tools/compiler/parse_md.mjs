// tools/compiler/parse_md.mjs -- pure-markdown parser with per-pane dispatch.
//
// Consumes standard markdown (YAML front-matter + ## / ### headings + fenced blocks + prose)
// and produces { id, prefix, identity, views } -- the structured data the emitter serializes.
// The document is split into ## blocks; identity blocks (Thesis/Sub/Spine/Companion Notes)
// feed identity, and each pane block dispatches to its parser (PANE_PARSERS) via a heading->key
// map. Adding a pane = one markdown convention + one parser fn; the emitter is unchanged.

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { prose, text } from './prose.mjs';
import { flow } from './flow.mjs';
import { code } from './code.mjs';

const md = new MarkdownIt();

// Panes whose readable heading differs from their data-slice key.
const PANE_KEY = {
  walk: 'walk', drill: 'drill', whiteboard: 'wb', system: 'sys', 'trade-offs': 'trade',
  'model answers': 'model', numbers: 'num', 'red flags': 'rf', opener: 'open', bank: 'bank',
};

// --- token helpers ------------------------------------------------------------

// Split a flat token stream into [{ title, toks }] blocks, one per ## heading.
function splitH2(toks) {
  const blocks = [];
  let cur = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h2') {
      cur = { title: toks[i + 1].content, toks: [] };
      blocks.push(cur);
      i += 2;                         // skip the h2's inline + heading_close
      continue;
    }
    if (cur) cur.toks.push(t);
  }
  return blocks;
}

const firstParaRaw = (toks) => {
  const i = toks.findIndex((t) => t.type === 'paragraph_open');
  return i === -1 ? '' : toks[i + 1].content;
};

function bulletsAsProse(toks) {
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].type === 'bullet_list_open') {
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') out.push(prose(toks[j].content));
        j++;
      }
      break;
    }
  }
  return out;
}

// Companion Notes: ### <view> then exactly 3 paragraphs -> cmp[view] = [title, desc, tip] (text()).
function parseCompanion(toks) {
  const cmp = {};
  let key = null, buf = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') { key = toks[i + 1].content.toLowerCase(); buf = []; i += 2; continue; }
    if (t.type === 'paragraph_open' && key) {
      buf.push(toks[i + 1].content);
      if (buf.length === 3) cmp[key] = buf.map(text);
      i += 2; continue;
    }
  }
  return cmp;
}

// --- pane parsers -------------------------------------------------------------

// Step-based views (walk): ### <title> starts a step; paragraphs = ins (1st) / deep / cap (after
// code); fences = flow / mermaid / code.
function parseSteps(toks) {
  const steps = [];
  let step = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') { step = { t: prose(toks[i + 1].content) }; steps.push(step); i += 2; continue; }
    if (t.type === 'fence' && step) {
      const lang = t.info.trim(); const body = t.content.replace(/\n$/, '');
      if (lang === 'flow') step.flow = flow(body.trim());
      else if (lang === 'mermaid') step.mermaid = body;
      else step.code = code(body);
      continue;
    }
    if (t.type === 'paragraph_open' && step) {
      const raw = toks[i + 1].content;
      if (step.ins === undefined) step.ins = prose(raw);
      else if (step.code !== undefined) step.cap = prose(raw);
      else step.deep = prose(raw);
      i += 2; continue;
    }
  }
  const M = steps.length;
  steps.forEach((s, n) => { s.k = `Step ${n + 1} / ${M}`; });
  return { steps };
}

// Red flags: lead paragraph (before the first ###), then ### "<bad>" items with tell (first
// paragraph) + fix (second); an optional paragraph prefixed "Note:" -> note.
function parseRf(toks) {
  let lead = '';
  const flags = [];
  let flag = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') { flag = { bad: prose(toks[i + 1].content), note: null, tell: '', fix: '' }; flags.push(flag); i += 2; continue; }
    if (t.type === 'paragraph_open') {
      const raw = toks[i + 1].content;
      if (!flag) { lead = prose(raw); }
      else {
        const m = /^note:\s*/i.exec(raw);
        if (m) flag.note = prose(raw.slice(m[0].length));
        else if (!flag.tell) flag.tell = prose(raw);
        else flag.fix = prose(raw);
      }
      i += 2; continue;
    }
  }
  return { lead, flags };
}

// Trade-offs: lead paragraph, then ### <decision q> per decision with a bullet list of
// "<option name>: <when to pick it>" options and a following paragraph as the tell.
function parseTrade(toks) {
  let lead = '';
  const decisions = [];
  let dec = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') { dec = { q: prose(toks[i + 1].content).replace(/ vs /g, ' <span class="vs">vs</span> '), opts: [], tell: '' }; decisions.push(dec); i += 2; continue; }
    if (t.type === 'bullet_list_open' && dec) {
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const raw = toks[j].content;
          const k = raw.indexOf(': ');
          dec.opts.push({ n: prose(k === -1 ? raw : raw.slice(0, k)), when: prose(k === -1 ? '' : raw.slice(k + 2)) });
        }
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'paragraph_open') {
      const raw = toks[i + 1].content;
      if (!dec) lead = prose(raw); else dec.tell = prose(raw);
      i += 2; continue;
    }
  }
  return { lead, decisions };
}

const PANE_PARSERS = { walk: parseSteps, rf: parseRf, trade: parseTrade };

// --- top level ----------------------------------------------------------------

export function parseMarkdown(src, { index = 1, total = 1 } = {}) {
  const { data: fm, content } = matter(src);
  const blocks = splitH2(md.parse(content, {}));

  let thesisRaw = '', subRaw = '', spine = [], cmp = {};
  const views = {};

  for (const b of blocks) {
    const name = b.title.toLowerCase();
    if (name === 'thesis') thesisRaw = firstParaRaw(b.toks);
    else if (name === 'sub') subRaw = firstParaRaw(b.toks);
    else if (name === 'spine') spine = bulletsAsProse(b.toks);
    else if (name === 'companion notes') cmp = parseCompanion(b.toks);
    else {
      const key = PANE_KEY[name] || name;
      const parser = PANE_PARSERS[key];
      if (parser) views[key] = parser(b.toks);
    }
  }

  const identity = {
    index, total,
    locatorTail: fm.locatorTail, group: fm.group, title: fm.title,
    h1: fm.h1 || fm.title,
    sub: prose(subRaw), thesis: prose(thesisRaw), spine,
    cramTitle: fm.cramTitle || fm.title,
    reportTitle: fm.reportTitle || fm.title,
    companionTopic: fm.companionTopic || fm.title,
    cmpNotes: cmp,
  };
  return { id: fm.id, prefix: fm.prefix, identity, views };
}
