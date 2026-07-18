const fs = require('fs');
const P = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const T = JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const TOPICS = ['content-pipeline','saga','sharding-strategies','circuit-breaker','autoscaling','multi-tenant'];
const VPS = Object.keys(P.byViewport);
const eq = (a,b)=>a!=null&&Math.abs(a-b)<0.15;

// Collect, per selector, the set of px values seen across all topics/viewports (pkgb) and (trunk)
function collect(SRC){
  const m = {}; // key -> {pxset:Set, ns:[], missingIn:[]}
  for(const vp of Object.keys(SRC.byViewport)){
    const fsData = SRC.byViewport[vp].fs;
    for(const topic of Object.keys(fsData)){
      const rec = fsData[topic];
      for(const key of Object.keys(rec)){
        const {px,n} = rec[key];
        (m[key]=m[key]||{px:new Set(),found:0,missing:0,txt:''});
        if(n>0 && px!=null){ m[key].px.add(px); m[key].found++; if(rec[key].txt) m[key].txt=rec[key].txt; }
        else m[key].missing++;
      }
    }
  }
  return m;
}
const PM = collect(P), TM = collect(T);

// FS spec (mirror of harness) with claim + expected
const SPEC = [
 ['deep-walkthrough|.ins',1,16.5],['deep-model-answers|.mbeat-t',1,16.5],['deep-drill|.ans',1,16.5],
 ['deep-red-flags|.rf-tell',2,14],['deep-red-flags|.rf-bad',2,14],['deep-red-flags|.rf-fix',2,14],
 ['deep-trade-offs|.opt-w',2,14],['deep-trade-offs|.dec-tell',2,14],['deep-system-map|.sm-intro',2,14],
 ['deep-system-map|.pq',2,14],['deep-system-map|.pa',2,14],['deep-numbers|.num-tell',2,14],
 ['deep-opener|.op-lead',2,14],['deep-model-answers|.mscript-sub',2,14],['deep-whiteboard|.step-sub',2,14],
 ['deep-drill|.speak',2,14],['deep-drill|.verdict',2,14],['deep-drill|.senior',2,14],['deep-drill|.mhp-t',2,14],
 ['deep-whiteboard|.dgm-lbl',4,11],['deep-whiteboard|.dgm-note',4,11],['deep-whiteboard|.dgm-foot',4,11],
 ['deep-system-map|.chip',4,11],['deep-system-map|.here',4,11],['deep-drill|.qk',4,11],
 ['deep-drill|.sigtag',4,11],['deep-drill|.tier',4,11],['deep-model-answers|.mbeat-l',4,11],['deep-numbers|.nrow-n',4,12],
 ['deep-numbers|.nrow-k',5,13],['deep-numbers|.nv-u',5,13],['deep-drill|.sigrow .nm',5,13],['deep-drill|.mhp-cov',5,12],
 ['deep-drill|.revset-h',5,12],['deep-walkthrough|.nav .ctr',5,12],['deep-walkthrough|.arc-t',5,12],
 ['deep-whiteboard|.dgm-t',5,12.5],['deep-whiteboard|.dgm-s',5,11],
 ['deep-walkthrough|.arc-h',5,null],['deep-numbers|.num-h',5,null],['deep-drill|.dnav-h',5,null],
 ['deep-drill|.tierlab',5,null],['deep-drill|.pill .l',5,null],['deep-drill|.speak .sl',5,null],['deep-trade-offs|.opt-w .pw',5,null],
];

function pxs(m,k){ return m[k]?[...m[k].px].sort((a,b)=>a-b):[]; }
console.log('CLAIM | SELECTOR | EXPECT | PKGB px(set) [found/miss] | TRUNK px(set) | VERDICT');
console.log('-'.repeat(110));
let fails=[];
for(const [key,claim,exp] of SPEC){
  const pp=pxs(PM,key), tp=pxs(TM,key);
  const pfound=PM[key]?PM[key].found:0, pmiss=PM[key]?PM[key].missing:0;
  let verdict='';
  if(pfound===0){ verdict='PKGB-NOTFOUND'; }
  else if(claim===1){ verdict = pp.every(v=>eq(v,16.5))&&pp.length? 'OK' : 'FAIL'; }
  else if(claim===2){ verdict = pp.every(v=>v>=13.99)? 'OK(>=14)' : 'FAIL(<14)'; }
  else if(claim===4){ verdict = pp.every(v=>v>=(exp-0.15))? 'OK(>=11)' : 'FAIL'; }
  else if(claim===5){
    if(exp===null){ verdict = pp.every(v=>v<=10.01)? 'OK(eyebrow<=10)' : 'CHECK'; }
    else { verdict = pp.every(v=>eq(v,exp))? ('OK(='+exp+')') : 'CHECK'; }
    // restraint must NOT be bumped vs trunk
    if(tp.length && pp.length && pp[pp.length-1]>tp[tp.length-1]+0.15) verdict+=' BUMPED!';
  }
  if(/FAIL|BUMPED|NOTFOUND/.test(verdict)) fails.push(key+' -> '+verdict+' pkgb='+JSON.stringify(pp));
  const flag = pmiss>0&&pfound>0?('['+pfound+'/'+pmiss+'miss]'):('['+pfound+']');
  console.log(`${claim} | ${key.replace('deep-','').replace('|',' ')} | ${exp} | ${JSON.stringify(pp)} ${flag} | ${JSON.stringify(tp)} | ${verdict}`);
}

// Claim 3: measure/ch
console.log('\n=== CLAIM 3: measure (ch) ===');
console.log('viewport | view sel | PKGB ch (per topic) | TRUNK ch | note');
for(const vp of VPS){
  if(!P.byViewport[vp].ch || !Object.keys(P.byViewport[vp].ch).length) continue;
  const chP=P.byViewport[vp].ch, chT=T.byViewport[vp].ch;
  const keys = Object.keys(chP[TOPICS[0]]||{});
  for(const k of keys){
    const pv=TOPICS.map(t=>chP[t]&&chP[t][k]?(chP[t][k].ch??('ERR:'+ (chP[t][k].err||'?'))):'-');
    const tv=TOPICS.map(t=>chT[t]&&chT[t][k]?(chT[t][k].ch??('e:'+(chT[t][k].err||'?'))):'-');
    const pnum=pv.filter(x=>typeof x==='number');
    const tnum=tv.filter(x=>typeof x==='number');
    const pmax=Math.max(...pnum.filter(Number.isFinite),0), tmax=Math.max(...tnum.filter(Number.isFinite),0);
    let note='';
    if(vp.startsWith('1536')){ note = pmax<=72? 'PKGB<=72 OK':'PKGB CH HIGH'; note+=' | trunkMax='+tmax.toFixed(0); }
    if(vp.startsWith('1280')){ note = 'noop? pmax='+pmax.toFixed(0)+' tmax='+tmax.toFixed(0)+' d='+(tmax-pmax).toFixed(1); }
    console.log(`${vp} | ${k} | [${pv.map(x=>typeof x==='number'?x.toFixed(0):x).join(',')}] | [${tv.map(x=>typeof x==='number'?x.toFixed(0):x).join(',')}] | ${note}`);
  }
}

// Claim 3 card spot-check
console.log('\n=== CLAIM 3: boxed card width (should match trunk; cap-independent) ===');
for(const vp of VPS){
  if(!P.byViewport[vp].card||!Object.keys(P.byViewport[vp].card).length) continue;
  for(const t of TOPICS){
    const p=P.byViewport[vp].card[t]||{}, tt=T.byViewport[vp].card[t]||{};
    console.log(`${vp} ${t}: rf pkgb=${p.rf} trunk=${tt.rf} | sys pkgb=${p.sys} trunk=${tt.sys}`);
  }
}

console.log('\n=== FS viewport-independence check (pkgb) ===');
// any selector whose px set differs across viewports
for(const [key] of SPEC){
  const perVp = VPS.map(vp=>{
    const s=new Set();
    const d=P.byViewport[vp].fs;
    for(const t of Object.keys(d)) if(d[t][key]&&d[t][key].px!=null) s.add(d[t][key].px);
    return [...s];
  });
  const flat=new Set(perVp.flat());
  if(flat.size>1) console.log('VARIES ACROSS VP:', key, JSON.stringify(VPS.map((vp,i)=>vp+':'+JSON.stringify(perVp[i]))));
}

console.log('\n=== SUMMARY FAILS ===');
console.log(fails.length? fails.join('\n') : 'NONE');
