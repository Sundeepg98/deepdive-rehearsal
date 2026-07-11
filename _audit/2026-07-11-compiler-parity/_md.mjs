import fs from 'fs';
const D='src/topics-md';
let T={files:0,beatH:0,cbH:0,task:0,model:0,int:0,int2:0,frameB:0, cbH3:0, cbH2:0, mdlSwallowed:0, intSwallowed:0, int2Swallowed:0, cbTask:0};
const perFile=[];
for(const f of fs.readdirSync(D).filter(x=>x.endsWith('.md'))){
  const src=fs.readFileSync(`${D}/${f}`,'utf8');
  const bank=src.split(/^## Bank\s*$/m)[1]; if(!bank){ console.log('NO BANK:',f); continue; }
  T.files++;
  // split bank into sections by ### heading
  const lines=bank.split('\n');
  let mode='mock', cur=null; const beats=[],curves=[];
  let frameBullets=0;
  for(let i=0;i<lines.length;i++){ const L=lines[i];
    const h=/^###\s+(.*)$/.exec(L);
    if(h){ const raw=h[1].trim();
      if(!raw.includes(' | ')){ const low=raw.toLowerCase();
        mode = low.includes('frame')?'frames' : low.includes('curveball')?'curve':mode; cur=null; continue; }
      cur={raw, mode, task:0,model:0,int:0,int2:0, para:[]};
      (mode==='curve'?curves:beats).push(cur);
      if(mode==='curve'){ const p=raw.split(' | '); if(p.length>=3) T.cbH3++; else T.cbH2++; }
      continue; }
    if(mode==='frames' && /^\s*-\s+/.test(L)) frameBullets++;
    if(cur){ if(/^task:/i.test(L)) cur.task++; if(/^model:/i.test(L)) cur.model++; if(/^int:/i.test(L)) cur.int++; if(/^int2:/i.test(L)) cur.int2++; cur.para.push(L); }
  }
  // Detect SWALLOW: a Model:/Int: line that is NOT preceded by a blank line (=> same paragraph as prior field)
  for(const b of beats.concat(curves)){
    const L=b.para;
    for(let i=0;i<L.length;i++){
      const prevBlank = i===0 || L[i-1].trim()==='';
      if(/^model:/i.test(L[i])){ T.model++; if(!prevBlank) T.mdlSwallowed++; }
      if(/^int:/i.test(L[i])){ T.int++; if(!prevBlank) T.intSwallowed++; }
      if(/^int2:/i.test(L[i])){ T.int2++; if(!prevBlank) T.int2Swallowed++; }
      if(/^task:/i.test(L[i])) T.task++;
    }
  }
  T.beatH+=beats.length; T.cbH+=curves.length; T.frameB+=frameBullets;
  T.cbTask += curves.filter(c=>c.task>0).length;
  perFile.push({f,beats:beats.length,curves:curves.length,frames:frameBullets});
}
console.log('=== AUTHORED IN THE 38 .md FILES (## Bank sections) ===');
console.log(JSON.stringify(T,null,2));
console.log('\nSWALLOWED = field label on a line NOT preceded by a blank line => same md paragraph as the previous field => parser cannot see it');
const bad=perFile.filter(p=>p.beats!==2||p.curves!==1);
console.log('\nfiles deviating from 2 beats/1 curveball:', bad.length? JSON.stringify(bad):'(none - all uniform 2/1)');
