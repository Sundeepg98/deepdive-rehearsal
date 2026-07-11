// tools/compiler/parse_md.mjs -- pure-markdown parser with per-pane dispatch.
//
// Consumes standard markdown (YAML front-matter + ## / ### headings + fenced blocks + prose)
// and produces { id, prefix, identity, views } -- the structured data the emitter serializes.
// The document is split into ## blocks; identity blocks (Thesis/Sub/Spine/Companion Notes)
// feed identity, and each pane block dispatches to its parser (PANE_PARSERS) via a heading->key
// map. Adding a pane = one markdown convention + one parser fn; the emitter is unchanged.
//
// ---------------------------------------------------------------------------------------
// CONSERVATION IS THE CONTRACT (2026-07-11). This parser used to DISCARD 571 authored items
// on every build -- 189 system-map stages, 114 drill tier-notes, 76 pivot answers, 76 bank
// models, 76 bank interviewer questions, a code block, a caption -- and say nothing. The gate
// was green throughout, because every compiler test compared the parser against a fixture
// curated to its working subset, or against its own output.
//
// TWO RULES NOW GOVERN EVERY LINE BELOW.
//
//   1. READ WHAT THE DOCS DEMONSTRATE, NOT WHAT THEY ASSERT. TOPIC_MARKDOWN_FORMAT.md
//      contradicted itself: its prose said System stages are "bullets" (:238) while its own
//      worked example wrote them as PLAIN LINES (:251-253) -- and all 38 authors copied the
//      EXAMPLE. markdown-it merges soft-wrapped adjacent lines into ONE paragraph whose
//      .content carries the newlines; the old parser matched a "Label:" prefix and then took
//      raw.slice(), so the first field swallowed every line beneath it. Both list-shaped
//      sections (sys stages, drill tier-notes) now accept BOTH forms, and every "Label:" block
//      is segmented so a field owns only its own lines. prove_doc_examples.mjs holds the spec's
//      worked examples to this: the documented format must survive the parser that documents it.
//
//   2. NEVER DISCARD SILENTLY -- THROW. Every branch that could drop or overwrite authored
//      content now calls fail(), which reports the pane, the SOURCE LINE and what to do. A
//      build that stops is a bug an author can fix in a minute; a build that quietly ships
//      two-thirds of a topic is a bug nobody finds for months. Silent loss was the original sin
//      here, and the only structural cure is that unparseable content cannot compile.
//
// prove_conservation.mjs enforces both against the author's raw bytes on every gate run.
// ---------------------------------------------------------------------------------------

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { prose, text } from './prose.mjs';
import { flow } from './flow.mjs';
import { code } from './code.mjs';
import { shikiLang } from './shiki-highlight.mjs';

const md = new MarkdownIt();

// --- authoring errors ----------------------------------------------------------------------
// Set per-parse so fail() can name the line in the AUTHOR'S file (markdown-it's token.map is
// relative to the post-front-matter content).
let LINE_OFF = 0;

// The one function that stands between an authoring mistake and a silently truncated topic.
function fail(pane, tok, msg, hint) {
  const at = tok && tok.map ? ':' + (tok.map[0] + 1 + LINE_OFF) : '';
  throw new Error(
    '## ' + pane + at + ' -- ' + msg +
    (hint ? '\n    ' + hint : '') +
    '\n    (the compiler refuses to drop authored content; see TOPIC_MARKDOWN_FORMAT.md)',
  );
}

// --- text helpers --------------------------------------------------------------------------
// A LEAF field (a chip, a tier note, a drill answer, a bank task) is ONE value. markdown-it
// hands us soft-wrapped source lines glued with "\n"; a newline inside a leaf means one field
// swallowed the next -- the exact signature of every fusion bug this file ever had, and what
// prove_conservation LAW 3 fails on. Collapse the wrap here, once, so leaf text is leaf text.
// (No-op on today's content -- the authors write a leaf on one line -- so the emitted modules
// are byte-identical; it future-proofs the soft-wrapping the format has always allowed.)
const oneLine = (s) => String(s).replace(/\s*\n\s*/g, ' ').trim();
const proseLine = (s) => prose(oneLine(s));
const textLine = (s) => text(oneLine(s));

// A paragraph's logical records -- the plain-line form the format spec's own examples use for
// System stages (:251-253) and Drill tier notes (:186-190).
const lines = (raw) => String(raw).split('\n').map((l) => l.trim()).filter(Boolean);

// Split a paragraph into [{key, body}] on "Label:" line prefixes, so a continuation line stays
// attached to the field that owns it. This is what the old raw.slice() could not do: given
//     Task: size the storage and the read path.
//     Model: ~100-byte rows, partial index on unread.
//     Int: what dominates cost?
//     Storage, not compute.
// (TOPIC_MARKDOWN_FORMAT.md:379-382 -- four ADJACENT lines, hence ONE markdown paragraph) it
// yields task / model / int(+its answer line), instead of assigning the whole blob to `task`.
// An unlabelled leading run comes back as { key: null } -- the drill card's q and a.
function segment(raw, labelRe) {
  const segs = [];
  let cur = { key: null, lines: [] };
  for (const ln of String(raw).split('\n')) {
    const m = labelRe.exec(ln.trim());
    if (m) {
      if (cur.key || cur.lines.join('').trim()) segs.push(cur);
      cur = { key: m[1].toLowerCase(), lines: [ln.trim().slice(m[0].length)] };
    } else cur.lines.push(ln);
  }
  if (cur.key || cur.lines.join('').trim()) segs.push(cur);
  return segs.map((s) => ({ key: s.key, body: s.lines.join('\n').trim() }));
}

// Panes whose readable heading differs from their data-slice key.
const PANE_KEY = {
  walk: 'walk', drill: 'drill', whiteboard: 'wb', system: 'sys', 'trade-offs': 'trade',
  'model answers': 'model', numbers: 'num', 'red flags': 'rf', opener: 'open', bank: 'bank',
  visual: 'visual',
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

// A tight markdown list marks its item paragraphs hidden; they carry no content of their own
// (the item's `inline` token does), and every list here is consumed whole by a bullet branch.
// Skipping them keeps the "unplaceable paragraph" guards from firing on a phantom.
const isPara = (t) => t.type === 'paragraph_open' && !t.hidden;

function bulletsAsProse(toks, pane) {
  const out = [];
  let seen = false;
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].type === 'bullet_list_open') {
      if (seen) fail(pane, toks[i], 'a second bullet list -- only the first was ever read, the rest was discarded');
      seen = true;
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') out.push(proseLine(toks[j].content));
        j++;
      }
      i = j;
      continue;
    }
    if (isPara(toks[i])) fail(pane, toks[i], 'prose here is not part of the format -- it would be discarded', 'this section is a bullet list; fold the text into an item or delete it.');
  }
  return out;
}

// Companion Notes: ### <view> then exactly 3 paragraphs -> cmp[view] = [title, desc, tip] (text()).
// The old code committed a note only `if (buf.length === 3)`: author two paragraphs or four and
// the ENTIRE note vanished without a word. Now the count is checked and a miscount throws.
function parseCompanion(toks) {
  const cmp = {};
  const bufs = {};
  const at = {};
  let key = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      key = toks[i + 1].content.toLowerCase();
      if (bufs[key]) fail('Companion Notes', t, 'duplicate "### ' + key + '" -- the second overwrites the first');
      bufs[key] = []; at[key] = t; i += 2; continue;
    }
    if (isPara(t)) {
      if (!key) fail('Companion Notes', t, 'prose before the first "### <pane>" heading -- it belongs to no note');
      bufs[key].push(toks[i + 1].content);
      i += 2; continue;
    }
    if (t.type === 'bullet_list_open') fail('Companion Notes', t, 'a bullet list -- a note is exactly three paragraphs (title, desc, tip)');
  }
  for (const k of Object.keys(bufs)) {
    if (bufs[k].length !== 3) {
      fail('Companion Notes', at[k], '"### ' + k + '" has ' + bufs[k].length + ' paragraph(s); a note is exactly 3 (title, desc, tip)',
        'the old parser discarded the whole note silently when the count was wrong.');
    }
    cmp[k] = bufs[k].map(textLine);
  }
  return cmp;
}

// --- pane parsers -------------------------------------------------------------

// Walk: ### <title> starts a step; a fenced `flow`/`mermaid` is the step's diagram; every other
// fence is a CODE BLOCK. The first paragraph is `ins`; a paragraph before any code is `deep`; a
// paragraph after a code block is that block's caption.
//
// F7 -- A STEP MAY CARRY MORE THAN ONE CODE BLOCK. The old model held exactly one
// (`step.code = ...`, `step.cap = ...`, both unconditional last-wins), so api-design.md's step 4
// -- python, its caption, json, its caption -- compiled to the JSON block and the LAST caption,
// and the python block and the first caption were destroyed on every build. Blocks are now a
// sequence: block 0 keeps the `code`/`shiki` + `cap` slots the hand-coded 8 use (so every step
// with one block emits byte-identically), and blocks 1..N land in `step.blocks[]`, which the
// walkthrough pane renders inside the same "See the code" disclosure.
function parseSteps(toks) {
  const steps = [];
  const model = [];
  const extrasByStep = new Map();   // step -> blocks 1..N (kept off the step until `k` is set,
                                    // so a one-block step's key order -- and its bytes -- are unchanged)
  let step = null;          // the open step
  let capTarget = null;     // whose `cap` the next paragraph fills: the step (block 0) or an extra block
  let nBlocks = 0;          // code blocks in the open step
  let extras = null;        // blocks 1..N of the open step
  let modelMode = false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const title = prose(toks[i + 1].content);
      // A "### Model Script" heading ends the steps and begins the spoken model-answer beats.
      if (title === 'Model Script') { modelMode = true; step = null; capTarget = null; i += 2; continue; }
      if (modelMode) fail('Walk', t, 'a step after "### Model Script" -- Model Script must be last (it ends the steps)');
      step = { t: title }; steps.push(step);
      capTarget = null; nBlocks = 0; extras = []; extrasByStep.set(step, extras);
      i += 2; continue;
    }
    if (t.type === 'bullet_list_open') {
      if (!modelMode) fail('Walk', t, 'a bullet list inside a step -- it belongs to no field and was discarded', 'bullets are only the "### Model Script" beats.');
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const raw = toks[j].content;
          if (/^Interviewer:/.test(raw)) model.push({ mq: proseLine(raw) });   // interviewer interjection
          else { const k = raw.indexOf(' | '); model.push({ ml: proseLine(k === -1 ? raw : raw.slice(0, k)), t: proseLine(k === -1 ? '' : raw.slice(k + 3)) }); }
        }
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'fence') {
      if (!step) fail('Walk', t, 'a fenced block before the first "### <step title>" -- it belongs to no step');
      const lang = t.info.trim(); const body = t.content.replace(/\n$/, '');
      if (lang === 'flow') {
        if (step.flow !== undefined) fail('Walk', t, 'a second ```flow diagram in one step -- the first would be destroyed', 'a step renders one flow chain; split the step.');
        step.flow = flow(body.trim());
      } else if (lang === 'mermaid') {
        if (step.mermaid !== undefined) fail('Walk', t, 'a second ```mermaid diagram in one step -- the first would be destroyed');
        step.mermaid = body;
      } else {
        const sl = shikiLang(lang);
        nBlocks++;
        if (nBlocks === 1) {
          // Block 0 -- the shape the hand-coded 8 use, so a one-block step is unchanged.
          if (sl) step.shiki = { lang: sl, code: body }; else step.code = code(body);
          capTarget = step;
        } else {
          const blk = sl ? { shiki: { lang: sl, code: body } } : { code: code(body) };
          extras.push(blk);
          capTarget = blk;
        }
      }
      continue;
    }
    if (isPara(t)) {
      if (modelMode) fail('Walk', t, 'prose inside "### Model Script" -- the beats are a bullet list');
      if (!step) fail('Walk', t, 'prose before the first "### <step title>" -- it belongs to no step');
      const raw = toks[i + 1].content;
      if (step.ins === undefined) step.ins = proseLine(raw);
      else if (capTarget && capTarget.cap === undefined) capTarget.cap = proseLine(raw);
      else if (nBlocks === 0) {
        if (step.deep !== undefined) fail('Walk', t, 'a third paragraph before any code block -- it would overwrite "deep"', 'a step holds ins + deep before the code; move this under a code fence as its caption, or split the step.');
        step.deep = proseLine(raw);
      } else {
        fail('Walk', t, 'a paragraph after a code block that already has its caption -- it would be destroyed', 'each code block takes ONE caption paragraph; add a fence for it or split the step.');
      }
      i += 2; continue;
    }
  }
  // Extra blocks are attached AFTER `k` so a single-block step's key order (and therefore its
  // emitted bytes) is exactly what it was before this fix.
  const M = steps.length;
  steps.forEach((s, n) => { s.k = `Step ${n + 1} / ${M}`; });
  extrasByStep.forEach((list, s) => { if (list.length) s.blocks = list; });
  // The .mbeat.ans beat MUST be last; only attach modelScript when a Model Script section was authored.
  if (model.length) { model[model.length - 1].ans = true; return { steps, modelScript: model }; }
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
    if (t.type === 'bullet_list_open') fail('Red Flags', t, 'a bullet list -- it belongs to no field and was discarded', 'a flag is: ### <bad phrasing>, a tell paragraph, a fix paragraph, an optional "Note: ...".');
    if (isPara(t)) {
      const raw = toks[i + 1].content;
      if (!flag) {
        if (lead) fail('Red Flags', t, 'a second lead paragraph before the first "### <bad phrasing>" -- it would overwrite the lead');
        lead = proseLine(raw);
      } else {
        const m = /^note:\s*/i.exec(raw);
        if (m) {
          if (flag.note) fail('Red Flags', t, 'a second "Note:" on one flag -- the first would be destroyed');
          flag.note = proseLine(raw.slice(m[0].length));
        } else if (!flag.tell) flag.tell = proseLine(raw);
        else if (!flag.fix) flag.fix = proseLine(raw);
        else fail('Red Flags', t, 'a fourth paragraph on one flag -- a flag holds a tell, a fix and an optional "Note:"');
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
    if (t.type === 'bullet_list_open') {
      if (!dec) fail('Trade-offs', t, 'a bullet list before the first "### <decision>" -- its options belong to no decision');
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const raw = oneLine(toks[j].content);
          const k = raw.indexOf(': ');
          dec.opts.push({ n: prose(k === -1 ? raw : raw.slice(0, k)), when: prose(k === -1 ? '' : raw.slice(k + 2)) });
        }
        j++;
      }
      i = j; continue;
    }
    if (isPara(t)) {
      const raw = toks[i + 1].content;
      if (!dec) {
        if (lead) fail('Trade-offs', t, 'a second lead paragraph before the first "### <decision>" -- it would overwrite the lead');
        lead = proseLine(raw);
      } else {
        if (dec.tell) fail('Trade-offs', t, 'a second paragraph on one decision -- it would overwrite the tell');
        dec.tell = proseLine(raw);
      }
      i += 2; continue;
    }
  }
  return { lead, decisions };
}

// System map: intro paragraph, then ### <whereHead> + the "where it sits" stages, then
// ### <pivHead> + a pivSub paragraph + #### <q> per pivot, each carrying a "-> <chip>" line and
// an answer.
//
// F1 -- STAGES ARE AUTHORED AS PLAIN LINES. TOPIC_MARKDOWN_FORMAT.md:251-253 (the section's own
// worked example) writes them as adjacent lines, and all 38 topics followed it. The old parser
// read only `bullet_list_open` (:203), so every plain-line stage was discarded -- 189 of them.
// Both forms are accepted now; the doc's example is the one authors actually copy.
//
// F2 -- THE CHIP AND ITS ANSWER ARE ADJACENT LINES (:261-262), hence ONE paragraph. The old code
// matched "-> " and took raw.slice(), so the chip swallowed the answer: 76 answers lost, and the
// System pane's disclosure body rendered blank on all 38.
function parseSys(toks) {
  let intro = '';
  const stages = [], pivots = [], heads = {};
  let mode = null, piv = null, sawPivSub = false;
  const addStage = (rawLine, t) => {
    const cur = /\[\*\]\s*$/.test(rawLine);
    const s = oneLine(rawLine).replace(/\s*\[\*\]\s*$/, '');
    const k = s.indexOf(': ');
    if (k === -1) fail('System', t, 'stage "' + s.slice(0, 40) + '" has no "<name>: <detail>" -- it would emit an empty description', 'a stage line is "Producers: emit events", with a trailing [*] on the current one.');
    const stage = { n: prose(s.slice(0, k)), d: prose(s.slice(k + 2)) };
    if (cur) stage.cur = true;
    stages.push(stage);
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const title = prose(toks[i + 1].content);
      if (!heads.whereHead) { heads.whereHead = title; mode = 'stages'; }
      else if (!heads.pivHead) { heads.pivHead = title; mode = 'pivots'; sawPivSub = false; }
      else fail('System', t, 'a third "### <heading>" -- System has exactly two (the stages, then the pivots)');
      piv = null; i += 2; continue;
    }
    if (t.type === 'heading_open' && t.tag === 'h4') {
      if (mode !== 'pivots') fail('System', t, 'a "#### <question>" outside the pivots section -- it belongs to no pivot');
      piv = { q: prose(toks[i + 1].content), chip: '', a: '' }; pivots.push(piv); i += 2; continue;
    }
    if (t.type === 'bullet_list_open') {
      if (mode !== 'stages') fail('System', t, 'a bullet list outside the stages section -- it belongs to no field');
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') addStage(toks[j].content, t);
        j++;
      }
      i = j; continue;
    }
    if (isPara(t)) {
      const raw = toks[i + 1].content;
      if (mode === null) {
        if (intro) fail('System', t, 'a second intro paragraph before "### <where it sits>" -- it would overwrite the intro');
        intro = proseLine(raw);
      } else if (mode === 'stages') {
        for (const ln of lines(raw)) addStage(ln, t);     // F1: the plain-line form the spec demonstrates
      } else if (!piv && !sawPivSub) { heads.pivSub = proseLine(raw); sawPivSub = true; }
      else if (!piv) fail('System', t, 'a second paragraph before the first "#### <question>" -- it belongs to no pivot');
      else {
        const m = /^(->|→)\s*/.exec(raw.trim());
        if (m && !piv.chip) {
          // F2: chip line + answer line arrive as ONE paragraph. Keep them apart.
          const rest = raw.trim().slice(m[0].length);
          const nl = rest.indexOf('\n');
          piv.chip = '→ ' + oneLine(nl === -1 ? rest : rest.slice(0, nl));
          if (nl !== -1) piv.a = proseLine(rest.slice(nl + 1));
        } else if (m) fail('System', t, 'a second "-> chip" line on one pivot -- the first would be destroyed');
        else if (!piv.a) piv.a = proseLine(raw);
        else fail('System', t, 'a third paragraph on one pivot -- it would overwrite the answer', 'a pivot is: #### <question>, a "-> <chip>" line, then the answer.');
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
    if (t.type === 'heading_open' && t.tag === 'h4') {
      if (!card) fail('Opener', t, 'a "#### <item>" before the first "### <k> | <t>" card');
      item = { n: String(card.items.length + 1), ht: prose(toks[i + 1].content), a: '' }; card.items.push(item); inHooks = false; i += 2; continue;
    }
    if (t.type === 'heading_open' && t.tag === 'h5') {
      if (!card) fail('Opener', t, 'a "##### Hooks" before the first "### <k> | <t>" card');
      if (card.hooks) fail('Opener', t, 'a second "##### Hooks" on one card -- the first would be destroyed');
      card.hooks = { lead: '', items: [] }; inHooks = true; item = null; i += 2; continue;
    }
    if (t.type === 'bullet_list_open') {
      if (!inHooks || !card || !card.hooks) fail('Opener', t, 'a bullet list outside "##### Hooks" -- it belongs to no field');
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const p = oneLine(toks[j].content).split(' | ');
          card.hooks.items.push({ q: prose(p[0] || ''), d: prose(p[1] || ''), tab: prose(p[2] || '') });
        }
        j++;
      }
      i = j; continue;
    }
    if (isPara(t)) {
      if (!card) fail('Opener', t, 'prose before the first "### <k> | <t>" card -- it belongs to no card');
      const raw = toks[i + 1].content; const f = /^foot:\s*/i.exec(raw);
      if (f) {
        if (card.foot) fail('Opener', t, 'a second "Foot:" on one card -- the first would be destroyed');
        card.foot = proseLine(raw.slice(f[0].length));
      } else if (inHooks && !card.hooks.lead) card.hooks.lead = proseLine(raw);
      else if (inHooks) fail('Opener', t, 'a second paragraph inside "##### Hooks" -- Hooks holds one lead paragraph and its bullets');
      else if (item) {
        if (item.a) fail('Opener', t, 'a second paragraph on one "#### <item>" -- it would overwrite the answer');
        item.a = proseLine(raw);
      } else {
        if (card.lead) fail('Opener', t, 'a second lead paragraph on one card -- it would overwrite the lead');
        card.lead = proseLine(raw);
      }
      i += 2; continue;
    }
  }
  return { cards };
}

// Whiteboard: ## Whiteboard, a sub paragraph, then ### <c> per cue with an answer paragraph,
// a fenced ```html block captured verbatim as the diagram (inherently HTML, not markdown), and
// "Foot:" / "Verdict:" paragraphs. Shape: { steps:[{c,a}], diagram, foot, sub, okVerdict }.
function parseWb(toks) {
  let sub = '', diagram = '', mermaid = '', foot = '', okVerdict = '';
  const steps = [];
  let step = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') { step = { c: prose(toks[i + 1].content), a: '' }; steps.push(step); i += 2; continue; }
    if (t.type === 'bullet_list_open') fail('Whiteboard', t, 'a bullet list -- it belongs to no field and was discarded', 'a cue is: ### <cue> + one answer paragraph.');
    if (t.type === 'fence') {
      if (diagram || mermaid) fail('Whiteboard', t, 'a second fenced diagram -- the first would be destroyed', 'the whiteboard renders ONE diagram.');
      const body = t.content.replace(/\n$/, '');
      if (t.info.trim() === 'mermaid') mermaid = body; else diagram = body;
      step = null; continue;
    }
    if (isPara(t)) {
      const raw = toks[i + 1].content; const fM = /^foot:\s*/i.exec(raw); const vM = /^verdict:\s*/i.exec(raw);
      if (fM) {
        if (foot) fail('Whiteboard', t, 'a second "Foot:" -- the first would be destroyed');
        foot = proseLine(raw.slice(fM[0].length));
      } else if (vM) {
        if (okVerdict) fail('Whiteboard', t, 'a second "Verdict:" -- the first would be destroyed');
        okVerdict = proseLine(raw.slice(vM[0].length));
      } else if (step) {
        if (step.a) fail('Whiteboard', t, 'a second paragraph on one cue -- it would overwrite the answer');
        step.a = proseLine(raw);
      } else {
        if (sub) fail('Whiteboard', t, 'a second lead paragraph -- it would overwrite the sub');
        sub = proseLine(raw);
      }
      i += 2; continue;
    }
  }
  return { steps, ...(mermaid ? { mermaid } : { diagram }), foot, sub, okVerdict };
}

// Model answers: ## Model Answers, then ### <selector> | <opener> per answer (selector feeds
// the selectors array, opener is the question), a sub paragraph, then beat bullets
// "- <l> | <c> | <t>" (label, CSS class, text). Shape: { selectors:[], answers:[{opener,sub,beats:[{l,c,t}]}] }.
function parseModel(toks) {
  const selectors = [], answers = [];
  let ans = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const raw = toks[i + 1].content; const k = raw.indexOf(' | ');
      selectors.push(prose(k === -1 ? raw : raw.slice(0, k)));
      ans = { opener: prose(k === -1 ? '' : raw.slice(k + 3)), sub: '', beats: [] }; answers.push(ans); i += 2; continue;
    }
    if (t.type === 'bullet_list_open') {
      if (!ans) fail('Model Answers', t, 'a bullet list before the first "### <selector> | <opener>" -- its beats belong to no answer');
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const p = oneLine(toks[j].content).split(' | ');
          ans.beats.push({ l: prose(p[0] || ''), c: (p[1] || '').trim(), t: prose(p.slice(2).join(' | ')) });
        }
        j++;
      }
      i = j; continue;
    }
    if (isPara(t)) {
      if (!ans) fail('Model Answers', t, 'prose before the first "### <selector> | <opener>" -- it belongs to no answer');
      // The old code was `if (... && !ans.sub)`: a second paragraph was dropped without a word.
      if (ans.sub) fail('Model Answers', t, 'a second paragraph on one answer -- it would be discarded', 'an answer holds ONE sub paragraph; the rest of the arc is the beat bullets.');
      ans.sub = proseLine(toks[i + 1].content); i += 2; continue;
    }
  }
  return { selectors, answers };
}

// Drill: ## Drill, optional tier notes ("<tier> | <note>"), then ### <tier> | <signal> per card --
// first paragraph = q, second = a; "Follow: <q>" starts a follow-up (its answer is the next line
// or the next paragraph); "Senior: <text>" = senior; "Speak: <text>" = the card's paired speak line.
//
// F3 -- TIER NOTES ARE AUTHORED AS PLAIN LINES (TOPIC_MARKDOWN_FORMAT.md:188-190). The old parser
// read only `bullet_list_open` (:342), so all 114 were discarded and the drill landing view
// rendered the literal string "undefined".
//
// F4 -- "Senior:" AND "Speak:" ON ADJACENT LINES ARE ONE PARAGRAPH (:201-202, the spec's own Drill
// example). The old code matched ^senior: and took raw.slice(), so `senior` swallowed the Speak:
// line whole. segment() keeps each field's continuation lines with the field that owns them --
// which is also what makes "Follow: <q>" + its next-line answer work.
function parseDrill(toks) {
  const cards = [], speak = [], tierNotes = {};
  let card = null, expectFollowA = null, seenCard = false;
  const addTierNote = (ln, t) => {
    const s = ln.replace(/^-\s+/, '');
    const k = s.indexOf(' | ');
    if (k === -1) fail('Drill', t, 'tier note "' + s.slice(0, 40) + '" has no "<tier> | <note>"');
    tierNotes[s.slice(0, k).trim()] = proseLine(s.slice(k + 3));
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const raw = toks[i + 1].content; const k = raw.indexOf(' | ');
      card = { tier: (k === -1 ? raw : raw.slice(0, k)).trim(), signal: prose(k === -1 ? '' : raw.slice(k + 3)), q: '', a: '', f: [], senior: '' };
      cards.push(card); speak.push(''); expectFollowA = null; seenCard = true; i += 2; continue;
    }
    if (t.type === 'bullet_list_open') {
      if (seenCard) fail('Drill', t, 'a bullet list inside a card -- it belongs to no field and was discarded', 'a card is prose: the question, the answer, then Follow:/Senior:/Speak: lines.');
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') addTierNote(oneLine(toks[j].content), t);
        j++;
      }
      i = j; continue;
    }
    // F3: the plain-line tier-note block that sits before the first card.
    if (isPara(t) && !seenCard) {
      for (const ln of lines(toks[i + 1].content)) addTierNote(ln, t);
      i += 2; continue;
    }
    if (isPara(t)) {
      // F4: Follow:/Senior:/Speak: on adjacent lines are ONE paragraph. Segment it so each
      // field owns only its own lines -- Follow:'s answer line stays with Follow:.
      for (const s of segment(toks[i + 1].content, /^(follow|senior|speak)\s*:\s*/i)) {
        if (!s.key) {
          if (!s.body) continue;
          if (expectFollowA) { expectFollowA.a = proseLine(s.body); expectFollowA = null; }
          else if (!card.q) card.q = proseLine(s.body);
          else if (!card.a) card.a = proseLine(s.body);
          else fail('Drill', t, 'a third plain paragraph on one card -- it would be discarded', 'a card holds a question and an answer; extra depth goes in Follow:/Senior:/Speak:.');
        } else if (s.key === 'follow') {
          const nl = s.body.indexOf('\n');
          const fu = { q: proseLine(nl === -1 ? s.body : s.body.slice(0, nl)), a: proseLine(nl === -1 ? '' : s.body.slice(nl + 1)) };
          card.f.push(fu); expectFollowA = nl === -1 ? fu : null;
        } else if (s.key === 'senior') {
          if (card.senior) fail('Drill', t, 'a second "Senior:" on one card -- the first would be destroyed');
          card.senior = proseLine(s.body); expectFollowA = null;
        } else if (s.key === 'speak') {
          if (speak[speak.length - 1]) fail('Drill', t, 'a second "Speak:" on one card -- the first would be destroyed');
          speak[speak.length - 1] = proseLine(s.body); expectFollowA = null;
        }
      }
      i += 2; continue;
    }
  }
  return { cards, speak, tierNotes };
}

// Numbers (parametric): ## Numbers, a lead paragraph, a tell paragraph, an input bullet list
// ("<id> | <label> | <value> | <min> | <step?>"), and a fenced code block captured as the
// compute function source (emitted raw, not serialized). Shape: { lead, tell, inputs, compute }.
function parseNum(toks) {
  let lead = '', tell = '', compute = '';
  const inputs = [];
  let paraCount = 0, sawList = false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'bullet_list_open') {
      if (sawList) fail('Numbers', t, 'a second bullet list -- its inputs would be appended to the first list\'s', 'Numbers holds ONE input list.');
      sawList = true;
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') {
          const p = oneLine(toks[j].content).split(' | ').map((s) => s.trim());
          const inp = { id: p[0], label: p[1], value: Number(p[2]), min: Number(p[3]) };
          if (p[4] !== undefined) inp.step = Number(p[4]);
          inputs.push(inp);
        }
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'fence') {
      if (compute) fail('Numbers', t, 'a second fenced block -- the first compute function would be destroyed');
      compute = t.content.replace(/\n$/, ''); continue;
    }
    if (isPara(t)) {
      const raw = toks[i + 1].content;
      if (paraCount === 0) lead = proseLine(raw);
      else if (paraCount === 1) tell = proseLine(raw);
      else fail('Numbers', t, 'a third paragraph -- it would be discarded', 'Numbers holds a lead paragraph and a tell paragraph, then the inputs and the compute fence.');
      paraCount++; i += 2; continue;
    }
  }
  return { lead, tell, inputs, compute };
}

// Bank (mock-run + mixed-fire data): ## Bank, then ### <tag> | <cue> (or
// ### CURVEBALL | <theme> | <cue>) per mock beat with "Task:"/"Model:"/"Int:"/"Int2:" fields
// (Int/Int2 = a "<q>" line + a next-line answer). A ### Frames bullet list and ### Extra
// Curveballs beats hold the additions; curveballs prepend the sequence's CURVEBALL beat, frames
// prepend the FRAME beat's cue. cards/speak are added by the emitter as drill references.
//
// F5 -- THE CURVEBALL HEADING IS "CURVEBALL | <theme> | <cue>" (TOPIC_MARKDOWN_FORMAT.md:386).
// The old mkBeat took p[0] as the THEME, so all 38 curveballs carried the literal theme
// "CURVEBALL" (the mock end screen read: 'Curveball this run: CURVEBALL.') and the real theme was
// shifted into the cue.
//
// F6 -- Task:/Model:/Int:/Int2: ARE ADJACENT LINES OF ONE PARAGRAPH (:379-382, the spec's own
// Bank example). The old code matched ^task: then took raw.slice(), so `task` swallowed Model,
// Int and Int's answer: 76 model answers and 76 interviewer questions destroyed per build.
function parseBank(toks) {
  const mockBeats = [], extraCurve = [], extraFrames = [];
  let mode = 'mock', beat = null, sawFrames = false;
  const mkBeat = (raw, m) => {
    const p = raw.split(' | ');
    if (m === 'curve') {
      // F5: strip the literal CURVEBALL tag so the AUTHOR'S theme lands in `theme`.
      const q = p[0].trim().toUpperCase() === 'CURVEBALL' ? p.slice(1) : p;
      return { tag: 'CURVEBALL', theme: (q[0] || '').trim(), cue: prose(q.slice(1).join(' | ')) };
    }
    const tag = p[0].trim();
    return p.length >= 3 ? { tag, theme: p[1].trim(), cue: prose(p.slice(2).join(' | ')) } : { tag, cue: prose(p[1] || '') };
  };
  const splitQA = (s) => { const nl = s.indexOf('\n'); return { q: proseLine(nl === -1 ? s : s.slice(0, nl)), a: proseLine(nl === -1 ? '' : s.slice(nl + 1)) }; };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const raw = toks[i + 1].content;
      if (!raw.includes(' | ')) {
        const low = raw.toLowerCase();
        if (low.includes('frame')) { mode = 'frames'; sawFrames = true; }
        else if (low.includes('curveball')) mode = 'curve';
        else fail('Bank', t, '"### ' + raw.slice(0, 40) + '" is neither a beat ("<tag> | <cue>") nor a section switch ("### Frames" / "### Extra Curveballs")');
        beat = null;
      } else { beat = mkBeat(raw, mode); (mode === 'curve' ? extraCurve : mockBeats).push(beat); }
      i += 2; continue;
    }
    if (t.type === 'bullet_list_open') {
      if (mode !== 'frames') fail('Bank', t, 'a bullet list outside "### Frames" -- it belongs to no field', 'a beat\'s fields are the Task:/Model:/Int:/Int2: lines.');
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') { if (toks[j].type === 'inline') extraFrames.push(proseLine(toks[j].content)); j++; }
      i = j; continue;
    }
    if (isPara(t)) {
      if (!beat) {
        if (sawFrames && mode === 'frames') fail('Bank', t, 'prose inside "### Frames" -- frames are a bullet list');
        fail('Bank', t, 'prose before the first "### <tag> | <cue>" beat -- it belongs to no beat');
      }
      // F6: segment the paragraph so Task/Model/Int/Int2 each own only their own lines.
      // int2 is tested before int -- /^int:/ would also prefix-match "Int2:".
      for (const s of segment(toks[i + 1].content, /^(task|model|int2|int)\s*:\s*/i)) {
        if (!s.key) fail('Bank', t, 'a line on a beat with no "Task:" / "Model:" / "Int:" / "Int2:" label -- it would be discarded', 'beat text must be labelled; an unlabelled line has no field to land in.');
        if (beat[s.key] !== undefined) fail('Bank', t, 'a second "' + s.key + ':" on one beat -- the first would be destroyed');
        if (s.key === 'task') beat.task = proseLine(s.body);
        else if (s.key === 'model') beat.model = proseLine(s.body);
        else if (s.key === 'int2') beat.int2 = splitQA(s.body);
        else if (s.key === 'int') beat.int = splitQA(s.body);
      }
      i += 2; continue;
    }
  }
  const cb = mockBeats.find((b) => b.tag === 'CURVEBALL');
  const fr = mockBeats.find((b) => b.tag === 'FRAME');
  return { curveballs: (cb ? [cb] : []).concat(extraCurve), mockBeats, frames: (fr ? [fr.cue] : []).concat(extraFrames) };
}

// ## Visual -- one fenced json block: { mode, labels?, params?, stories? }.
// Kept deliberately dumb here (find fence, JSON.parse); semantic validation
// against the kit's mode-registry manifest happens in compile.mjs where the
// filesystem context lives, so authoring errors fail the build with the
// topic id attached.
function parseVisual(toks) {
  for (const t of toks) {
    if (t.type === 'fence') {
      let cfg;
      try { cfg = JSON.parse(t.content); }
      catch (e) { throw new Error('Visual section: fenced block is not valid JSON (' + e.message + ')'); }
      if (!cfg || typeof cfg.mode !== 'string') throw new Error('Visual section: config must set "mode"');
      return cfg;
    }
  }
  throw new Error('Visual section: needs one fenced json block with the config');
}

const PANE_PARSERS = { visual: parseVisual, walk: parseSteps, rf: parseRf, trade: parseTrade, sys: parseSys, open: parseOpen, wb: parseWb, model: parseModel, drill: parseDrill, num: parseNum, bank: parseBank };

// --- top level ----------------------------------------------------------------

export function parseMarkdown(src, { index = 1, total = 1 } = {}) {
  const { data: fm, content } = matter(src);
  // markdown-it's token.map is relative to `content`; fail() reports lines in the AUTHOR'S file.
  LINE_OFF = String(src).split('\n').length - String(content).split('\n').length;
  const blocks = splitH2(md.parse(content, {}));

  let thesisRaw = '', subRaw = '', spine = [], cmp = {};
  const views = {}, unknownHeadings = [];

  for (const b of blocks) {
    const name = b.title.toLowerCase();
    if (name === 'thesis') thesisRaw = firstParaRaw(b.toks);
    else if (name === 'sub') subRaw = firstParaRaw(b.toks);
    else if (name === 'spine') spine = bulletsAsProse(b.toks, 'Spine');
    else if (name === 'companion notes') cmp = parseCompanion(b.toks);
    else {
      const key = PANE_KEY[name] || name;
      const parser = PANE_PARSERS[key];
      if (parser) views[key] = parser(b.toks);
      else unknownHeadings.push(b.title);
    }
  }
  if (unknownHeadings.length) {
    throw new Error(
      'unknown section heading(s): ' + unknownHeadings.map((h) => '"## ' + h + '"').join(', ') +
      '. Valid headings: Thesis, Sub, Spine, Companion Notes, Walk, Drill, Whiteboard, ' +
      'System, Trade-offs, Model Answers, Numbers, Red Flags, Opener, Bank, Visual.',
    );
  }

  const identity = {
    index: fm.index ?? index, total: fm.total ?? total,
    locatorTail: fm.locatorTail, group: fm.group, title: fm.title,
    h1: fm.h1 || fm.title,
    sub: proseLine(subRaw), thesis: proseLine(thesisRaw), spine,
    cramTitle: fm.cramTitle || fm.title,
    reportTitle: fm.reportTitle || fm.title,
    companionTopic: fm.companionTopic || fm.title,
    cmpNotes: cmp,
  };
  return { id: fm.id, prefix: fm.prefix, identity, views };
}
