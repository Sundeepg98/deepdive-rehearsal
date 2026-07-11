import fs from 'fs'; import path from 'path';
const G='src/topics/_generated', H='src/topics';
const hand=['content-pipeline','signing','authz','aws-hardening','notifications','eav','desired-state','iac'];
function loadGen(f){ let s=fs.readFileSync(f,'utf8');
  s=s.replace(/^var\s+\w+\s*=\s*/,'').replace(/;\s*$/,'');
  s=s.replace(/TOPIC_\w+_DRILL\.\w+/g,'[]');
  return JSON.parse(s); }
const rows=[];
for(const d of fs.readdirSync(G)){ const f=path.join(G,d,'bank.js'); if(!fs.existsSync(f)) continue;
  let b; try{ b=loadGen(f);}catch(e){ rows.push({t:d,err:e.message}); continue; }
  const mb=b.mockBeats||[], cv=b.curveballs||[], fr=b.frames||[];
  rows.push({ t:d, kind:'GEN', beats:mb.length,
    frameTag: mb.filter(x=>x.tag==='FRAME').length, curveTag: mb.filter(x=>x.tag==='CURVEBALL').length,
    bModel: mb.filter(x=>x.model).length, bInt: mb.filter(x=>x.int).length, bInt2: mb.filter(x=>x.int2).length,
    bTaskSwallow: mb.filter(x=>x.task&&/\n\s*model:/i.test(x.task)).length,
    curve: cv.length, cvTask: cv.filter(x=>x.task).length, cvInt: cv.filter(x=>x.int).length,
    cvBadTheme: cv.filter(x=>x.theme==='CURVEBALL').length, frames: fr.length });
}
// hand-coded: eval the IIFE with stubs
for(const d of hand){ const f=path.join(H,d,'bank.js'); const src=fs.readFileSync(f,'utf8');
  const m=src.match(/var\s+(TOPIC_\w+_BANK)\s*=/); const name=m[1];
  const sandbox=`var cards=[],speakLines=[],${['CP','SIGN','AUTHZ','AWSHARD','NOTIF','EAV','DS','IAC'].flatMap(p=>[`${p}_CARDS`,`${p}_SPEAK`]).join('=[],')}=[];`;
  let b; try{ b=eval(sandbox+src+';'+name); }catch(e){ rows.push({t:d,err:e.message}); continue; }
  const mb=b.mockBeats||[], cv=b.curveballs||[], fr=b.frames||[];
  rows.push({ t:d, kind:'HAND', beats:mb.length,
    frameTag: mb.filter(x=>x.tag==='FRAME').length, curveTag: mb.filter(x=>x.tag==='CURVEBALL').length,
    bModel: mb.filter(x=>x.model).length, bInt: mb.filter(x=>x.int).length, bInt2: mb.filter(x=>x.int2).length,
    bTaskSwallow: 0, curve: cv.length, cvTask: cv.filter(x=>x.task).length, cvInt: cv.filter(x=>x.int).length,
    cvBadTheme: cv.filter(x=>x.theme==='CURVEBALL').length, frames: fr.length });
}
const gen=rows.filter(r=>r.kind==='GEN'), hnd=rows.filter(r=>r.kind==='HAND');
const sum=(a,k)=>a.reduce((s,r)=>s+(r[k]||0),0);
console.log('GENERATED topics:',gen.length,' HAND topics:',hnd.length, ' errors:',rows.filter(r=>r.err).length);
for(const r of rows.filter(r=>r.err)) console.log('  ERR',r.t,r.err);
const hdr=['beats','frameTag','curveTag','bModel','bInt','bInt2','bTaskSwallow','curve','cvTask','cvInt','cvBadTheme','frames'];
console.log('\n=== TOTALS ===');
console.log('field'.padEnd(14), 'GEN(38)'.padStart(9), 'HAND(8)'.padStart(9));
for(const k of hdr) console.log(k.padEnd(14), String(sum(gen,k)).padStart(9), String(sum(hnd,k)).padStart(9));
console.log('\n=== PER-TOPIC GEN (beats/curve/model/int) ===');
for(const r of gen) console.log(r.t.padEnd(24), 'beats='+r.beats, 'curve='+r.curve, 'model='+r.bModel, 'int='+r.bInt, 'swallowed='+r.bTaskSwallow, 'FRAMEtag='+r.frameTag, 'CURVEtag='+r.curveTag);
console.log('\n=== ZERO-CURVEBALL topics (openMock CRASH risk) ===');
console.log(gen.filter(r=>r.curve===0).map(r=>r.t).join(', ')||'(none)');
console.log('\n=== PER-TOPIC HAND ===');
for(const r of hnd) console.log(r.t.padEnd(24), 'beats='+r.beats, 'curve='+r.curve, 'model='+r.bModel, 'int='+r.bInt, 'int2='+r.bInt2, 'frames='+r.frames);
