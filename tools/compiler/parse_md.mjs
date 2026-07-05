// tools/compiler/parse_md.mjs -- the pure-markdown parser (Layer A, markdown edition).
//
// Consumes a STANDARD markdown document (YAML front-matter + ## / ### headings + fenced
// blocks + prose) -- the language any author or agent writes natively -- and produces the
// same structured data the @directive parser did, so the converters (prose/flow/code/text)
// and emitter are unchanged. This is "markdown end-to-end": no bespoke DSL, just markdown.
//
// Mapping:
//   front-matter        -> id / prefix / group / title / locatorTail
//   ## Thesis|Sub       -> identity prose
//   ## Spine            -> bullet list -> spine[]
//   ## Companion Notes  -> ### <view> + 3 paragraphs -> cmpNotes[view] = [title, desc, tip]
//   ## <View>           -> a view; ### <title> starts a step
//   ```flow / ```ts / ```mermaid  -> the step's flow / code / (svg later)
//   paragraphs in a step -> ins (1st), then deep (before code) / cap (after code)

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { prose, text } from './prose.mjs';
import { flow } from './flow.mjs';
import { code } from './code.mjs';

const md = new MarkdownIt();
const KNOWN_SECTIONS = ['Thesis', 'Sub', 'Spine', 'Companion Notes'];

export function parseMarkdown(src, { index = 1, total = 1 } = {}) {
  const { data: fm, content } = matter(src);
  const toks = md.parse(content, {});

  const sec = { thesis: '', sub: '', spine: [], cmp: {}, views: {} };
  let section = null, view = null, step = null, cmpKey = null, cmpBuf = null;

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];

    if (t.type === 'heading_open') {
      const title = toks[i + 1].content;
      if (t.tag === 'h2') {
        section = title; view = null; step = null; cmpKey = null;
        if (!KNOWN_SECTIONS.includes(title)) { view = title.toLowerCase(); sec.views[view] = { steps: [] }; }
      } else if (t.tag === 'h3') {
        if (section === 'Companion Notes') { cmpKey = title.toLowerCase(); cmpBuf = []; }
        else if (view) { step = { t: prose(title) }; sec.views[view].steps.push(step); }
      }
      i += 2;                                   // skip inline + heading_close
      continue;
    }

    if (t.type === 'fence' && step) {
      const lang = t.info.trim();
      const body = t.content.replace(/\n$/, '');
      if (lang === 'flow') step.flow = flow(body.trim());
      else if (lang === 'mermaid') step.mermaid = body;      // -> inline SVG (build step, later)
      else step.code = code(body);                            // ts / js / sql
      continue;
    }

    if (t.type === 'paragraph_open') {
      const raw = toks[i + 1].content;
      if (section === 'Thesis') sec.thesis = raw;
      else if (section === 'Sub') sec.sub = raw;
      else if (section === 'Companion Notes' && cmpKey) {
        cmpBuf.push(raw);
        if (cmpBuf.length === 3) sec.cmp[cmpKey] = cmpBuf.map(text);
      } else if (step) {
        if (step.ins === undefined) step.ins = prose(raw);
        else if (step.code !== undefined) step.cap = prose(raw);
        else step.deep = prose(raw);
      }
      i += 2;                                   // skip inline + paragraph_close
      continue;
    }

    if (t.type === 'bullet_list_open' && section === 'Spine') {
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') sec.spine.push(prose(toks[j].content));
        j++;
      }
      i = j;
      continue;
    }
  }

  for (const v of Object.values(sec.views)) {
    const M = v.steps.length;
    v.steps.forEach((s, n) => { s.k = `Step ${n + 1} / ${M}`; });
  }

  const identity = {
    index, total,
    locatorTail: fm.locatorTail, group: fm.group, title: fm.title,
    h1: fm.h1 || fm.title,
    sub: prose(sec.sub), thesis: prose(sec.thesis), spine: sec.spine,
    cramTitle: fm.cramTitle || fm.title,
    reportTitle: fm.reportTitle || fm.title,
    companionTopic: fm.companionTopic || fm.title,
    cmpNotes: sec.cmp,
  };
  return { id: fm.id, prefix: fm.prefix, identity, views: sec.views };
}
