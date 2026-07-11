import fs from 'node:fs';
import MarkdownIt from 'markdown-it';
import { prose } from '../../tools/compiler/prose.mjs';
const md = new MarkdownIt();

// ===== PATCHED parseSys (the proposed fix) =====
function parseSysFIXED(toks) {
  let intro = '';
  const stages = [], pivots = [], heads = {};
  let mode = null, piv = null, sawPivSub = false;
  // FIX 1: one stage-line parser, shared by the bullet form AND the plain-line form
  const pushStage = (line) => {
    let raw = String(line).trim();
    if (!raw) return;
    const cur = /\[\*\]\s*$/.test(raw);
    raw = raw.replace(/\s*\[\*\]\s*$/, '');
    const k = raw.indexOf(': ');
    const stage = { n: prose(k === -1 ? raw : raw.slice(0, k)), d: prose(k === -1 ? '' : raw.slice(k + 2)) };
    if (cur) stage.cur = true;
    stages.push(stage);
  };
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
    if (t.type === 'bullet_list_open' && mode === 'stages') {          // back-compat: bullet form
      let j = i + 1;
      while (j < toks.length && toks[j].type !== 'bullet_list_close') {
        if (toks[j].type === 'inline') pushStage(toks[j].content);
        j++;
      }
      i = j; continue;
    }
    if (t.type === 'paragraph_open') {
      const raw = toks[i + 1].content;
      if (mode === null) intro = prose(raw);
      else if (mode === 'stages') raw.split('\n').forEach(pushStage);   // <<< FIX 1: was silently discarded
      else if (mode === 'pivots' && !piv && !sawPivSub) { heads.pivSub = prose(raw); sawPivSub = true; }
      else if (piv) {
        const m = /^(->|→)\s*/.exec(raw);
        if (m && !piv.chip) {
          const rest = raw.slice(m[0].length);
          const nl = rest.indexOf('\n');                                 // <<< FIX 2: same idiom as :353 / :411
          piv.chip = '→ ' + prose(nl === -1 ? rest : rest.slice(0, nl));
          if (nl !== -1) piv.a = prose(rest.slice(nl + 1));
        } else if (!piv.a) piv.a = prose(raw);
      }
      i += 2; continue;
    }
  }
  return { intro, stages, pivots, heads };
}

const splitH2 = (toks) => { const bl=[]; let c=null;
  for (let i=0;i<toks.length;i++){ const t=toks[i];
    if(t.type==='heading_open'&&t.tag==='h2'){ c={title:toks[i+1].content,toks:[]}; bl.push(c); i+=2; continue; }
    if(c) c.toks.push(t); } return bl; };

let S=0,P=0,A=0,CUR=0,maxChip=0,topics=0;
for (const f of fs.readdirSync('src/topics-md').filter(f=>f.endsWith('.md')).sort()) {
  const src = fs.readFileSync('src/topics-md/'+f,'utf8').replace(/^---[\s\S]*?\n---\n/,'');
  const blk = splitH2(md.parse(src,{})).find(b=>b.title.toLowerCase()==='system');
  if(!blk) continue;
  const o = parseSysFIXED(blk.toks);
  topics++; S+=o.stages.length; P+=o.pivots.length;
  A+=o.pivots.filter(p=>p.a && p.a.length).length;
  CUR+=o.stages.filter(s=>s.cur).length;
  maxChip=Math.max(maxChip, ...o.pivots.map(p=>p.chip.length));
  if(f==='idempotency.md'){ console.log('=== idempotency.md AFTER FIX ==='); console.log(JSON.stringify(o,null,2)); }
}
console.log('\n=========== RECOVERY ACROSS ALL 38 ===========');
console.log('                     BEFORE      AFTER     TARGET (the 8)');
console.log('stages total          0   ->   ' + String(S).padEnd(6) + '   (8 avg 6.0/topic)');
console.log('stages per topic     0.0  ->   ' + (S/topics).toFixed(1).padEnd(6) + '   6.0');
console.log('"you are here" (cur)  0   ->   ' + String(CUR).padEnd(6) + '   1 per topic = ' + topics);
console.log('pivot answers         0   ->   ' + String(A).padEnd(6) + '   / ' + P + ' pivots');
console.log('max chip length     437ch ->   ' + String(maxChip+'ch').padEnd(6) + '   (8: 19-39ch)');
