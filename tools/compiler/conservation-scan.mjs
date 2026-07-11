// conservation-scan.mjs -- the shared, side-effect-free core of the LOSSLESSNESS gate.
//
// Extracted so the SAME conservation law can be applied to two different bodies of evidence:
//   prove_conservation.mjs   -> the 38 authored topics in src/topics-md/
//   prove_doc_examples.mjs   -> the worked examples in TOPIC_MARKDOWN_FORMAT.md
// One definition of "what the author wrote", used against both. If the format spec's own
// examples do not survive the format spec's own parser, that is the root cause of every drop.
//
// NOTHING here imports the parser. scanSource() is a plain line scanner over raw bytes: it is
// the INDEPENDENT reference, and a parser bug therefore cannot mask itself inside it.

// ---------------------------------------------------------------------------------------
// THE INDEPENDENT REFERENCE. A line scanner over the raw markdown. No markdown-it, no
// parse_md. It shares no code with the system under test, so it cannot inherit its bugs.
// ---------------------------------------------------------------------------------------
export function scanSource(src) {
  const lines = src.split('\n');
  const A = {
    sysStages: [], sysStageCur: [], sysPivots: [], sysPivotAnswers: [],
    drillCards: [], drillTierNotes: [], drillFollows: [], drillSeniors: [], drillSpeaks: [],
    bankBeats: [], bankTasks: [], bankModels: [], bankInts: [], bankInt2s: [],
    walkSteps: [], walkFences: [], walkParas: [],
    wbSteps: [], tradeDecisions: [], rfFlags: [], openCards: [], modelAnswers: [],
    cmpNotes: [],
  };
  // LAW 4 reference: the theme the author actually wrote in a curveball heading.
  const curveThemes = [];

  let h2 = '', h3n = 0, h4 = '', inFence = false, fmSeen = 0, inFm = false;
  let bankMode = 'mock';      // mirrors the author's intent, not the parser's state
  let inWalkStep = false, walkModelScript = false;
  let sawBankBeat = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i], line = raw.trimEnd(), t = line.trim();
    const ln = i + 1;

    // front-matter
    if (/^---\s*$/.test(t) && fmSeen < 2 && !h2) { fmSeen++; inFm = fmSeen === 1; continue; }
    if (inFm) continue;

    // Fenced blocks: count them where they matter, never scan inside them. The fence's BODY is
    // captured (not just the ``` marker) so LAW 2 can prove a code block was annihilated -- a
    // marker line has no fingerprintable text, and F7 destroys the BODY, not the marker.
    if (/^```/.test(t)) {
      if (!inFence) {
        const body = [];
        for (let j = i + 1; j < lines.length && !/^```/.test(lines[j].trim()); j++) body.push(lines[j]);
        if (h2 === 'walk' && inWalkStep && !walkModelScript) A.walkFences.push({ ln, text: body.join('\n') || t });
      }
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (/^## /.test(line)) {
      h2 = t.slice(3).trim().toLowerCase();
      h3n = 0; h4 = ''; bankMode = 'mock'; inWalkStep = false; walkModelScript = false; sawBankBeat = false;
      continue;
    }

    if (/^### /.test(line)) {
      const head = t.slice(4).trim();
      h3n++; h4 = '';
      if (h2 === 'walk') {
        if (head === 'Model Script') { walkModelScript = true; inWalkStep = false; }
        else { inWalkStep = true; A.walkSteps.push({ ln, text: head }); }
      } else if (h2 === 'drill') A.drillCards.push({ ln, text: head });
      else if (h2 === 'whiteboard') A.wbSteps.push({ ln, text: head });
      else if (h2 === 'trade-offs') A.tradeDecisions.push({ ln, text: head });
      else if (h2 === 'red flags') A.rfFlags.push({ ln, text: head });
      else if (h2 === 'opener') A.openCards.push({ ln, text: head });
      else if (h2 === 'model answers') A.modelAnswers.push({ ln, text: head });
      // A companion note is `### <pane>` + EXACTLY THREE paragraphs. parse_md.mjs:73 commits the
      // note only `if (buf.length === 3)` -- author two paragraphs or four and the entire note is
      // discarded without a word. That landmine has not fired yet (76 authored, 76 emitted), so
      // this counter exists to catch it the first time it does, not to report it after the fact.
      else if (h2 === 'companion notes') A.cmpNotes.push({ ln, text: head });
      else if (h2 === 'bank') {
        // A heading with no " | " is a MODE SWITCH (### Frames / ### Extra Curveballs).
        // A heading with " | " is a BEAT.
        if (!head.includes(' | ')) {
          const low = head.toLowerCase();
          if (low.includes('frame')) bankMode = 'frames';
          else if (low.includes('curveball')) bankMode = 'curve';
          sawBankBeat = false;
        } else {
          sawBankBeat = true;
          const parts = head.split(' | ');
          A.bankBeats.push({ ln, text: head });
          // `### CURVEBALL | <theme> | <cue>` -- the authored theme is parts[1].
          if (parts[0].trim().toUpperCase() === 'CURVEBALL' && parts.length >= 3) {
            curveThemes.push({ ln, theme: parts[1].trim(), cue: parts.slice(2).join(' | ').trim() });
          }
        }
      }
      continue;
    }

    if (/^#### /.test(line)) {
      h4 = t.slice(5).trim();
      if (h2 === 'system' && h3n >= 2) A.sysPivots.push({ ln, text: h4 });
      continue;
    }

    if (!t) continue;

    // ---- ## System -------------------------------------------------------------------
    // The first ### block holds the stages. The project's own format spec writes them as
    // PLAIN LINES (TOPIC_MARKDOWN_FORMAT.md:251-253 "Producers: emit events"), and all 38
    // topics follow that example. The parser demands a bullet list (parse_md.mjs:203) and
    // discards everything else without a word.
    if (h2 === 'system' && h3n === 1 && !h4) {
      const m = /^(?:-\s+)?([^:#>`|].*?): (.+)$/.exec(t);   // accept BOTH forms; the author may use either
      if (m) {
        A.sysStages.push({ ln, text: t });
        if (/\[\*\]\s*$/.test(t)) A.sysStageCur.push({ ln, text: t });
      }
      continue;
    }
    // Inside a #### pivot: a "-> chip" line, then the answer on the NEXT line
    // (TOPIC_MARKDOWN_FORMAT.md:261-262 -- adjacent, no blank line between them).
    if (h2 === 'system' && h4 && /^(->|\u2192)/.test(t)) {
      const next = (lines[i + 1] || '').trim();
      if (next && !/^(#|-|>|```)/.test(next)) A.sysPivotAnswers.push({ ln: ln + 1, text: next });
      continue;
    }

    // ---- ## Drill --------------------------------------------------------------------
    // Tier notes sit before the first card, one "<key> | <note>" per line (a bullet list of the
    // same is also accepted). The key is matched GENERICALLY, not against a hardcoded tier list:
    // an earlier version enumerated SDE2|SDE3|Staff|EXTEND and was therefore blind to `all` -- the
    // key the drill LANDING view reads, which every hand-coded topic carries. A reference that
    // only knows the keys someone remembered is not an independent reference; it is a second
    // place for the same omission to hide.
    if (h2 === 'drill' && h3n === 0) {
      if (/^(?:-\s+)?[^|#>`-][^|]*\|/.test(t)) A.drillTierNotes.push({ ln, text: t });
      continue;
    }
    if (h2 === 'drill' && h3n > 0) {
      if (/^Follow:/i.test(t)) A.drillFollows.push({ ln, text: t });
      else if (/^Senior:/i.test(t)) A.drillSeniors.push({ ln, text: t });
      else if (/^Speak:/i.test(t)) A.drillSpeaks.push({ ln, text: t });
      continue;
    }

    // ---- ## Bank ---------------------------------------------------------------------
    // Task:/Model:/Int: are authored as ADJACENT lines -- exactly as the format spec's own
    // worked example shows (TOPIC_MARKDOWN_FORMAT.md:379-382). markdown-it merges adjacent
    // lines into ONE paragraph, so parse_md.mjs:431 matches "Task:" and assigns the ENTIRE
    // blob -- Model, Int and the answer included -- to beat.task.
    if (h2 === 'bank' && sawBankBeat) {
      if (/^Task:/i.test(t)) A.bankTasks.push({ ln, text: t });
      else if (/^Model:/i.test(t)) A.bankModels.push({ ln, text: t });
      else if (/^Int2:/i.test(t)) A.bankInt2s.push({ ln, text: t });
      else if (/^Int:/i.test(t)) A.bankInts.push({ ln, text: t });
      continue;
    }

    // ---- ## Walk ---------------------------------------------------------------------
    // Prose paragraphs inside a step. The step model holds exactly three text slots
    // (ins / deep / cap) and every assignment is unconditional last-wins
    // (parse_md.mjs:116-122), so a fourth paragraph destroys one of them.
    if (h2 === 'walk' && inWalkStep && !walkModelScript) {
      const prev = (lines[i - 1] || '').trim();
      if (!prev || /^```/.test(prev) || /^#/.test(prev)) A.walkParas.push({ ln, text: t });   // paragraph START only
      continue;
    }
  }
  return { A, curveThemes };
}

// ---------------------------------------------------------------------------------------
// THE SYSTEM UNDER TEST: what the parser actually kept.
// ---------------------------------------------------------------------------------------
export function scanParsed(out) {
  const v = out.views || {};
  const idn = out.identity || {};
  const drill = v.drill || {}, sys = v.sys || {}, bank = v.bank || {}, walk = v.walk || {};
  const cards = drill.cards || [], pivots = sys.pivots || [];

  // A CURVEBALL beat can appear in mockBeats AND be re-exported in curveballs (parse_md.mjs:438),
  // so count over a de-duplicated set of object identities -- never double-count a beat.
  const beats = new Set([...(bank.mockBeats || []), ...(bank.curveballs || [])]);
  const steps = walk.steps || [];
  // A walk step's code blocks are a SEQUENCE: block 0 rides in the step's own code/shiki + cap
  // (the shape the hand-coded 8 use), blocks 1..N in step.blocks[]. Count both, or this counter
  // is blind to exactly the field that F7 added -- and a counter blind to a field is how the old
  // suite stayed green. The REFERENCE side (scanSource, the author's raw bytes) is untouched:
  // it still counts the 8 fences api-design.md actually contains.
  const blk = (s) => s.blocks || [];
  const has = (o) => (o.shiki ? 1 : 0) + (o.code ? 1 : 0);
  const fenceFields = (s) => (s.flow ? 1 : 0) + (s.mermaid ? 1 : 0) + has(s) + blk(s).reduce((n, b) => n + has(b), 0);
  const textFields = (s) => (s.ins ? 1 : 0) + (s.deep ? 1 : 0) + (s.cap ? 1 : 0) + blk(s).reduce((n, b) => n + (b.cap ? 1 : 0), 0);

  return {
    sysStages: (sys.stages || []).length,
    sysStageCur: (sys.stages || []).filter((s) => s.cur).length,
    sysPivots: pivots.length,
    sysPivotAnswers: pivots.filter((p) => p.a && p.a.trim()).length,
    drillCards: cards.length,
    drillTierNotes: Object.keys(drill.tierNotes || {}).length,
    drillFollows: cards.reduce((n, c) => n + (c.f || []).length, 0),
    drillSeniors: cards.filter((c) => c.senior && c.senior.trim()).length,
    drillSpeaks: (drill.speak || []).filter((s) => s && s.trim()).length,
    bankBeats: beats.size,
    bankTasks: [...beats].filter((b) => b.task).length,
    bankModels: [...beats].filter((b) => b.model).length,
    bankInts: [...beats].filter((b) => b.int).length,
    bankInt2s: [...beats].filter((b) => b.int2).length,
    walkSteps: steps.length,
    walkFences: steps.reduce((n, s) => n + fenceFields(s), 0),
    walkParas: steps.reduce((n, s) => n + textFields(s), 0),
    wbSteps: ((v.wb || {}).steps || []).length,
    tradeDecisions: ((v.trade || {}).decisions || []).length,
    rfFlags: ((v.rf || {}).flags || []).length,
    openCards: ((v.open || {}).cards || []).length,
    modelAnswers: ((v.model || {}).answers || []).length,
    cmpNotes: Object.keys(idn.cmpNotes || {}).length,
  };
}

// LAW 3: leaves that are legitimately multi-line (Layer C payloads, not prose leaves).
const MULTILINE_OK = new Set(['code', 'compute', 'diagram', 'mermaid', 'flow']);

export function fusedLeaves(obj, topic) {
  const hits = [];
  const walk = (o, trail) => {
    if (o == null) return;
    if (typeof o === 'string') {
      const leaf = trail[trail.length - 1];
      if (!MULTILINE_OK.has(leaf) && o.includes('\n')) {
        hits.push({ topic, path: trail.filter((s) => !/^\d+$/.test(s)).join('.'), text: o });
      }
      return;
    }
    if (typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((v, i) => walk(v, trail.concat(String(i)))); return; }
    for (const k of Object.keys(o)) walk(o[k], trail.concat(k));
  };
  walk(obj, []);
  return hits;
}

// LAW 2: a fingerprint that survives prose()/flow()/code() HTML rewriting -- the longest run of
// plain alphanumerics, normalized. If THIS cannot be found anywhere in the emitted data, the
// authored unit was not transformed, it was destroyed.
//
// The emitted side is stripped of HTML tags FIRST. The parsers legitimately inject markup INTO
// the middle of authored prose -- parse_md.mjs:163 rewrites "Offset vs cursor" as
// "Offset <span class=\"vs\">vs</span> cursor" -- which splits an otherwise clean fingerprint
// and would report 65 perfectly-intact trade decisions as annihilated. Markup is transformation;
// only the TEXT is content. Measuring content survival means comparing text to text.
// Sample text printed by the gates goes through this: the parsed data legitimately contains
// non-ASCII (parse_md.mjs:225 prepends U+2192 to every chip), and a single such byte reaching a
// Windows console/CI pipe used to crash the whole gate at the subprocess decode. Escape, never
// emit raw.
export const show = (s, n = 64) => JSON.stringify(String(s).slice(0, n))
  .replace(/[\u0080-\uFFFF]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase());

export const stripTags = (s) => String(s).replace(/<[^>]+>/g, ' ');
export const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
export function fingerprint(raw) {
  const runs = String(raw).split(/[^A-Za-z0-9 ]+/).map((s) => s.trim()).filter((s) => s.length >= 25);
  if (!runs.length) return null;
  runs.sort((a, b) => b.length - a.length);
  return norm(runs[0]).slice(0, 50);
}
export function flatten(o, acc = []) {
  if (o == null) return acc;
  if (typeof o === 'string') { acc.push(o); return acc; }
  if (typeof o !== 'object') return acc;
  if (Array.isArray(o)) { for (const v of o) flatten(v, acc); return acc; }
  for (const k of Object.keys(o)) flatten(o[k], acc);
  return acc;
}

export const FIELDS = [
  'sysStages', 'sysStageCur', 'sysPivots', 'sysPivotAnswers',
  'drillCards', 'drillTierNotes', 'drillFollows', 'drillSeniors', 'drillSpeaks',
  'bankBeats', 'bankTasks', 'bankModels', 'bankInts', 'bankInt2s',
  'walkSteps', 'walkFences', 'walkParas',
  'wbSteps', 'tradeDecisions', 'rfFlags', 'openCards', 'modelAnswers', 'cmpNotes',
];
