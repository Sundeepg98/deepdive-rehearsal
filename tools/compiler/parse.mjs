// tools/compiler/parse.mjs -- the .topic parser (front half of Layer A).
//
// Reads one .topic source into the structured data the modules hold, running each field
// through the right converter (prose/text/flow/code) and DERIVING the mechanical fields:
//   - identity.index / .total   from the topic's position in TOPIC_ORDER (passed in)
//   - identity.h1 / .cramTitle / .reportTitle / .companionTopic   default to title
//   - each step's `k` ("Step N / M")   from step position + view length
// The emitter (other half of Layer A) turns this structure into the 12 module files.

import { prose, text } from './prose.mjs';
import { flow } from './flow.mjs';
import { code } from './code.mjs';

const FIELD = /^(flow|ins|deep|cap)\s(.*)$/;

export function parseTopic(src, { index = 1, total = 1 } = {}) {
  const lines = src.split('\n');
  let i = 0;

  // --- front matter ---
  const fm = {};
  if ((lines[0] || '').trim() === '---') {
    for (i = 1; i < lines.length && lines[i].trim() !== '---'; i++) {
      const m = lines[i].match(/^(\w+):\s*(.*)$/);
      if (m) fm[m[1]] = m[2].trim();
    }
    i++;
  }

  // --- body ---
  const sec = { thesis: [], sub: [], spine: [], cmp: {}, views: {} };
  let mode = null;          // 'thesis' | 'sub' | 'spine' | 'cmp'
  let cmpKey = null, cmpBuf = null;
  let view = null, step = null, codeBuf = null;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (codeBuf) {                              // inside a code block
      if (t === 'end') { step.code = code(codeBuf.join('\n')); codeBuf = null; }
      else codeBuf.push(line);
      continue;
    }

    const flush = () => { if (mode === 'cmp' && cmpKey) sec.cmp[cmpKey] = cmpBuf.slice(0, 3).map(text); };

    if (t === '@thesis') { flush(); mode = 'thesis'; continue; }
    if (t === '@sub')    { flush(); mode = 'sub'; continue; }
    if (t === '@spine')  { flush(); mode = 'spine'; continue; }
    if (t.startsWith('@cmp ')) { flush(); mode = 'cmp'; cmpKey = t.slice(5).trim(); cmpBuf = []; continue; }
    if (t.startsWith('@view ')) { flush(); mode = null; view = t.slice(6).trim(); sec.views[view] = { steps: [] }; continue; }
    if (t.startsWith('@step ')) { flush(); mode = 'step'; step = { t: prose(t.slice(6).trim()) }; sec.views[view].steps.push(step); continue; }

    if (mode === 'step') {
      if (/^code\s+\w+\s*$/.test(t)) { codeBuf = []; continue; }
      const m = line.match(FIELD);
      if (m) {
        if (m[1] === 'flow') step.flow = flow(m[2]);
        else step[m[1]] = prose(m[2]);
      }
      continue;
    }
    if (mode === 'thesis' && t) sec.thesis.push(line);
    else if (mode === 'sub' && t) sec.sub.push(line);
    else if (mode === 'spine' && t.startsWith('- ')) sec.spine.push(prose(t.slice(2)));
    else if (mode === 'cmp' && t) cmpBuf.push(t);
  }
  if (mode === 'cmp' && cmpKey) sec.cmp[cmpKey] = cmpBuf.slice(0, 3).map(text);

  // --- derive k ("Step N / M") per view ---
  for (const v of Object.values(sec.views)) {
    const M = v.steps.length;
    v.steps.forEach((s, n) => { s.k = `Step ${n + 1} / ${M}`; });
  }

  const identity = {
    index, total,
    locatorTail: fm.locatorTail,
    group: fm.group,
    title: fm.title,
    h1: fm.h1 || fm.title,
    sub: prose(sec.sub.join(' ')),
    thesis: prose(sec.thesis.join(' ')),
    spine: sec.spine,
    cramTitle: fm.cramTitle || fm.title,
    reportTitle: fm.reportTitle || fm.title,
    companionTopic: fm.companionTopic || fm.title,
    cmpNotes: sec.cmp,
  };

  return { id: fm.id, prefix: fm.prefix, identity, views: sec.views };
}
