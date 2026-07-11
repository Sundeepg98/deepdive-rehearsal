// DROP DETECTOR: run the REAL parser over each of the 38 .md files, then scan the raw
// markdown for authored units in the 5 lens panes and report any unit the parser did not
// carry into its output. Proves PARSER_BUG (content is in the .md, output lacks it) vs
// AUTHORING_GAP (content was never written).
import fs from 'fs';
import path from 'path';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const MD = path.join(ROOT, 'src/topics-md');
const files = fs.readdirSync(MD).filter(f => f.endsWith('.md'));

// Slice the raw lines of one "## Section" out of the file, with 1-based line numbers.
function section(lines, heading) {
  const start = lines.findIndex(l => l.trim().toLowerCase() === '## ' + heading.toLowerCase());
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { end = i; break; }
  }
  return { start: start + 1, end, lines: lines.slice(start + 1, end).map((t, i) => ({ n: start + 2 + i, t })) };
}

const tally = {
  wb_foot_authored: 0, wb_cues: [], wb_para_after_fence: [], wb_multi_para_cue: [],
  rf_note_authored: 0, rf_flags: [], rf_extra_para: [],
  tr_pipe_opts: [], tr_dec: [], tr_multi_tell: [],
  op_cards: [], op_item_multi_para: [], op_para_after_hooks: [],
  num_extra_para: [], num_static_rows: [],
};
const perTopic = [];

for (const f of files) {
  const src = fs.readFileSync(path.join(MD, f), 'utf8');
  const lines = src.split(/\r?\n/);
  const id = f.replace(/\.md$/, '');
  let parsed;
  try { parsed = parseMarkdown(src); } catch (e) { console.log('PARSE FAIL', id, e.message); continue; }
  const V = parsed.views;
  const rec = { id };

  // ---- WHITEBOARD -------------------------------------------------------
  const wb = section(lines, 'Whiteboard');
  if (wb) {
    const cues = wb.lines.filter(l => /^### /.test(l.t));
    const foots = wb.lines.filter(l => /^Foot:/i.test(l.t));
    rec.wb_md_cues = cues.length;
    rec.wb_out_cues = (V.wb?.steps || []).length;
    rec.wb_md_foot = foots.length;
    rec.wb_out_foot = V.wb?.foot ? 1 : 0;
    if (foots.length) tally.wb_foot_authored++;
    tally.wb_cues.push(cues.length);
    // a non-Foot/non-Verdict paragraph AFTER the closing fence would clobber `sub`
    let inFence = false, fenceClosedAt = -1;
    for (const l of wb.lines) {
      if (/^```/.test(l.t)) { inFence = !inFence; if (!inFence) fenceClosedAt = l.n; continue; }
      if (inFence) continue;
      if (fenceClosedAt > 0 && l.t.trim() && !/^(Foot|Verdict):/i.test(l.t) && !/^#/.test(l.t)) {
        tally.wb_para_after_fence.push(id + ':' + l.n + ' | ' + l.t.slice(0, 60));
      }
    }
    // count paragraphs under each cue (2nd+ overwrites step.a)
    let curCue = null, paras = 0, inF = false;
    for (const l of wb.lines) {
      if (/^```/.test(l.t)) { inF = !inF; continue; }
      if (inF) continue;
      if (/^### /.test(l.t)) { if (curCue && paras > 1) tally.wb_multi_para_cue.push(id + ':' + curCue); curCue = l.n; paras = 0; continue; }
      if (curCue && l.t.trim() && !/^(Foot|Verdict):/i.test(l.t)) {
        // a blank-separated block = one paragraph; count block starts
        paras++;
      }
    }
  }

  // ---- RED FLAGS --------------------------------------------------------
  const rf = section(lines, 'Red Flags');
  if (rf) {
    const flags = rf.lines.filter(l => /^### /.test(l.t));
    const notes = rf.lines.filter(l => /^Note:/i.test(l.t));
    rec.rf_md_flags = flags.length;
    rec.rf_out_flags = (V.rf?.flags || []).length;
    rec.rf_md_notes = notes.length;
    rec.rf_out_notes = (V.rf?.flags || []).filter(x => x.note).length;
    if (notes.length) tally.rf_note_authored++;
    tally.rf_flags.push(flags.length);
  }

  // ---- TRADE-OFFS -------------------------------------------------------
  const tr = section(lines, 'Trade-offs');
  if (tr) {
    const decs = tr.lines.filter(l => /^### /.test(l.t));
    const bullets = tr.lines.filter(l => /^- /.test(l.t));
    rec.tr_md_dec = decs.length;
    rec.tr_out_dec = (V.trade?.decisions || []).length;
    rec.tr_md_opts = bullets.length;
    rec.tr_out_opts = (V.trade?.decisions || []).reduce((a, d) => a + d.opts.length, 0);
    // an option bullet with NO ': ' -> parser sets when='' (half the option silently lost)
    for (const b of bullets) {
      const body = b.t.replace(/^- /, '');
      if (body.indexOf(': ') === -1) tally.tr_pipe_opts.push(id + ':' + b.n + ' | ' + body.slice(0, 70));
    }
    rec.tr_out_optbad = (V.trade?.decisions || []).reduce((a, d) => a + d.opts.filter(o => !o.when).length, 0);
    tally.tr_dec.push(decs.length);
  }

  // ---- OPENER -----------------------------------------------------------
  const op = section(lines, 'Opener');
  if (op) {
    const cards = op.lines.filter(l => /^### /.test(l.t));
    const items = op.lines.filter(l => /^#### /.test(l.t));
    const foots = op.lines.filter(l => /^Foot:/i.test(l.t));
    rec.op_md_cards = cards.length;
    rec.op_out_cards = (V.open?.cards || []).length;
    rec.op_out_close = (V.open?.cards || []).filter(c => c.kind === 'close').length;
    rec.op_md_items = items.length;
    rec.op_out_items = (V.open?.cards || []).reduce((a, c) => a + c.items.length, 0);
    rec.op_md_foot = foots.length;
    tally.op_cards.push(cards.length);
  }

  // ---- NUMBERS ----------------------------------------------------------
  const nu = section(lines, 'Numbers');
  if (nu) {
    // paragraphs BEFORE the input bullet list (parser keeps only the first two)
    let paras = 0, prev = '', inF = false;
    for (const l of nu.lines) {
      if (/^```/.test(l.t)) { inF = !inF; continue; }
      if (inF) continue;
      if (/^- /.test(l.t)) break;
      if (l.t.trim() && !prev.trim()) paras++;
      prev = l.t;
    }
    rec.num_md_paras = paras;
    rec.num_out_paras = (V.num?.lead ? 1 : 0) + (V.num?.tell ? 1 : 0);
    if (paras > 2) tally.num_extra_para.push(id + ' (' + paras + ' paragraphs, parser keeps 2)');
    rec.num_md_inputs = nu.lines.filter(l => /^- /.test(l.t)).length;
    rec.num_out_inputs = (V.num?.inputs || []).length;
    rec.num_compute = V.num?.compute ? 1 : 0;
  }
  perTopic.push(rec);
}

// ---------- REPORT ----------
const cols = Object.keys(perTopic[0]);
console.log('=== PER-TOPIC: markdown-authored (md) vs parser-output (out) ===');
console.log(cols.join('\t'));
for (const r of perTopic) console.log(cols.map(c => r[c] ?? '').join('\t'));

console.log('\n=== DROP CHECK: any md count > out count is a PARSER DROP ===');
const pairs = [['wb_md_cues','wb_out_cues'],['wb_md_foot','wb_out_foot'],['rf_md_flags','rf_out_flags'],['rf_md_notes','rf_out_notes'],['tr_md_dec','tr_out_dec'],['tr_md_opts','tr_out_opts'],['op_md_cards','op_out_cards'],['op_md_items','op_out_items'],['num_md_inputs','num_out_inputs'],['num_md_paras','num_out_paras']];
for (const [a, b] of pairs) {
  const bad = perTopic.filter(r => (r[a] ?? 0) > (r[b] ?? 0));
  const sa = perTopic.reduce((s, r) => s + (r[a] ?? 0), 0), sb = perTopic.reduce((s, r) => s + (r[b] ?? 0), 0);
  console.log((a + ' -> ' + b).padEnd(30) + 'md=' + String(sa).padStart(4) + '  out=' + String(sb).padStart(4) + '  DROPPED=' + String(sa - sb).padStart(4) + (bad.length ? '   topics: ' + bad.map(r => r.id).slice(0, 5).join(',') : ''));
}

console.log('\n=== AUTHORED-BUT-ABSENT FEATURES (across all 38) ===');
console.log('Whiteboard "Foot:" authored in      : ' + tally.wb_foot_authored + ' / ' + perTopic.length + ' topics');
console.log('Red-flag "Note:" authored in        : ' + tally.rf_note_authored + ' / ' + perTopic.length + ' topics');
console.log('Opener  ### cards per topic (md)    : ' + [...new Set(tally.op_cards)].sort().join(', ') + '  -> close cards possible only when >1');
console.log('WB cues per topic (md)              : ' + [...new Set(tally.wb_cues)].sort().join(', '));
console.log('RF flags per topic (md)             : ' + [...new Set(tally.rf_flags)].sort().join(', '));
console.log('Trade decisions per topic (md)      : ' + [...new Set(tally.tr_dec)].sort().join(', '));

console.log('\n=== LATENT PARSER BUGS (content present that the parser mishandles) ===');
console.log('Trade option bullets with NO ": " (parser sets when="") : ' + tally.tr_pipe_opts.length);
tally.tr_pipe_opts.slice(0, 10).forEach(x => console.log('   ' + x));
console.log('WB paragraph AFTER the fence (clobbers `sub`)           : ' + tally.wb_para_after_fence.length);
tally.wb_para_after_fence.slice(0, 10).forEach(x => console.log('   ' + x));
console.log('Numbers sections with >2 lead paragraphs (3rd dropped)  : ' + tally.num_extra_para.length);
tally.num_extra_para.slice(0, 10).forEach(x => console.log('   ' + x));
