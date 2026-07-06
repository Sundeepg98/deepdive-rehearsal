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

// System map: intro paragraph, then ### <whereHead> + a stage bullet list ("<n>: <d>", with
// a trailing "[*]" marking the cur "you are here" stage), then ### <pivHead> + a pivSub
// paragraph + #### <q> per pivot, each with a "-> <chip>" line and an answer paragraph.
function parseSys(toks) {
  let intro = '';
  const stages = [], pivots = [], heads = {};
  let mode = null, piv = null, sawPivSub = false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const title = prose(toks[i + 1].content);
      if (!heads.whereHead) { heads.whereHead = title; mode = 'stages'; }
      else { heads.pivHead = title; mode = 'pivots'; sawPivSub = false; }
      piv = null; i += 2; continue;
    }
    if (t.type === 'heading_open' && t.tag === 'h4' && mode === 'pivots') {
      piv = { q: prose(toks[i + 1].content), chip: '', a: '' }; pivots.push(piv); i += 2; continue;
    }
    if (t.type === 'bullet_list_open' && mode === 'stages') {
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          let raw = toks[j].content;
          const cur = /\[\*\]\s*$/.test(raw);
          raw = raw.replace(/\s*\[\*\]\s*$/, '');
          const k = raw.indexOf(': ');
          const stage = { n: prose(k === -1 ? raw : raw.slice(0, k)), d: prose(k === -1 ? '' : raw.slice(k + 2)) };
          if (cur) stage.cur = true;
          stages.push(stage);
        }
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'paragraph_open') {
      const raw = toks[i + 1].content;
      if (mode === null) intro = prose(raw);
      else if (mode === 'pivots' && !piv && !sawPivSub) { heads.pivSub = prose(raw); sawPivSub = true; }
      else if (piv) {
        const m = /^(->|\u2192)\s*/.exec(raw);
        if (m && !piv.chip) piv.chip = '\u2192 ' + raw.slice(m[0].length);
        else piv.a = prose(raw);
      }
      i += 2; continue;
    }
  }
  return { intro, stages, pivots, heads };
}

// Opener/closer: ## Opener, then ### <k> | <t> per card (1st = open, 2nd = close), a lead
// paragraph, #### <ht> per item (auto-numbered) each with an answer paragraph, an optional
// ##### Hooks block (lead paragraph + "- <q> | <d> | <tab>" bullets), and a "Foot:" paragraph.
function parseOpen(toks) {
  const cards = [];
  let card = null, item = null, inHooks = false, cardIdx = 0;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const raw = toks[i + 1].content; const k = raw.indexOf(' | ');
      card = { kind: cardIdx === 0 ? 'open' : 'close', k: prose(k === -1 ? raw : raw.slice(0, k)), t: prose(k === -1 ? '' : raw.slice(k + 3)), lead: '', items: [], hooks: null, foot: '' };
      cards.push(card); cardIdx++; item = null; inHooks = false; i += 2; continue;
    }
    if (t.type === 'heading_open' && t.tag === 'h4' && card) {
      item = { n: String(card.items.length + 1), ht: prose(toks[i + 1].content), a: '' }; card.items.push(item); inHooks = false; i += 2; continue;
    }
    if (t.type === 'heading_open' && t.tag === 'h5' && card) {
      card.hooks = { lead: '', items: [] }; inHooks = true; item = null; i += 2; continue;
    }
    if (t.type === 'bullet_list_open' && inHooks && card.hooks) {
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const p = toks[j].content.split(' | ');
          card.hooks.items.push({ q: prose(p[0] || ''), d: prose(p[1] || ''), tab: prose(p[2] || '') });
        }
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'paragraph_open' && card) {
      const raw = toks[i + 1].content; const f = /^foot:\s*/i.exec(raw);
      if (f) card.foot = prose(raw.slice(f[0].length));
      else if (inHooks && !card.hooks.lead) card.hooks.lead = prose(raw);
      else if (item) item.a = prose(raw);
      else card.lead = prose(raw);
      i += 2; continue;
    }
  }
  return { cards };
}

// Whiteboard: ## Whiteboard, a sub paragraph, then ### <c> per cue with an answer paragraph,
// a fenced ```html block captured verbatim as the diagram (inherently HTML, not markdown), and
// "Foot:" / "Verdict:" paragraphs. Shape: { steps:[{c,a}], diagram, foot, sub, okVerdict }.
function parseWb(toks) {
  let sub = '', diagram = '', foot = '', okVerdict = '';
  const steps = [];
  let step = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') { step = { c: prose(toks[i + 1].content), a: '' }; steps.push(step); i += 2; continue; }
    if (t.type === 'fence') { diagram = t.content.replace(/\n$/, ''); step = null; continue; }
    if (t.type === 'paragraph_open') {
      const raw = toks[i + 1].content; const fM = /^foot:\s*/i.exec(raw); const vM = /^verdict:\s*/i.exec(raw);
      if (fM) foot = prose(raw.slice(fM[0].length));
      else if (vM) okVerdict = prose(raw.slice(vM[0].length));
      else if (step) step.a = prose(raw);
      else sub = prose(raw);
      i += 2; continue;
    }
  }
  return { steps, diagram, foot, sub, okVerdict };
}

const PANE_PARSERS = { walk: parseSteps, rf: parseRf, trade: parseTrade, sys: parseSys, open: parseOpen, wb: parseWb };

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
