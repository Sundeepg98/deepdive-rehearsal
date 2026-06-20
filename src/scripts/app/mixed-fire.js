/* ============ MIXED FIRE ============ */
function mxProbe(c){return{kind:'Depth probe',badge:'mxb-probe',label:c.signal,prompt:c.q,reveal:'<div class="ans">'+c.a+'</div>'+c.f.map(function(x){return '<div class="fu"><div class="lab">Interviewer pushes further</div><div class="fq">'+x.q+'</div><div class="fa">'+x.a+'</div></div>';}).join('')+'<div class="senior"><div class="sl">What sounds senior here</div>'+c.senior+'</div>'};}
function mxCurve(cb){return{kind:'Curveball',badge:'mxb-curve',label:cb.theme||'Scenario',prompt:cb.cue+'<div class="mx-task">'+cb.task+'</div>',reveal:'<div class="ans">'+cb.model+'</div>'+(cb.int?'<div class="fu"><div class="lab">The interviewer cuts in</div><div class="fq">'+cb.int.q+'</div><div class="fa">'+cb.int.a+'</div></div>':'')};}
var mxPool=[],mxIdx=0,mxGot=0,mxShk=0,mxRes=[],mixLog=[];
function getTrades(){var decs=document.querySelectorAll('#trade .dec'),out=[],i,o;for(i=0;i<decs.length;i++){var d=decs[i],dq=d.querySelector('.dec-q').innerHTML,opts=d.querySelectorAll('.opt'),rev='';for(o=0;o<opts.length;o++)rev+=opts[o].outerHTML;var tell=d.querySelector('.dec-tell').innerHTML;out.push({kind:'Trade-off',badge:'mxb-trade',label:'Name the switch condition',prompt:'Defend the call &mdash; <b>'+dq+'</b>. When would you reach for each side?',reveal:'<div class="mx-opts">'+rev+'</div><div class="senior"><div class="sl">The switch condition to name out loud</div>'+tell+'</div>'});}return out;}
function buildMix(){var pi=dShuffle(_allCards.length).slice(0,4),ci=dShuffle(curveballPool.length).slice(0,2),tr=getTrades(),ti=dShuffle(tr.length).slice(0,2),arr=[],a,b,t;for(a=0;a<pi.length;a++)arr.push(mxProbe(_allCards[pi[a]]));for(b=0;b<ci.length;b++)arr.push(mxCurve(curveballPool[ci[b]]));for(t=0;t<ti.length;t++)arr.push(tr[ti[t]]);var ord=dShuffle(arr.length);mxPool=ord.map(function(i){return arr[i];});}
function openMix(){buildMix();mxIdx=0;mxGot=0;mxShk=0;mxRes=[];var ov=document.getElementById('mixov');ovShow(ov);ov.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';renderMix();}
function closeMix(){var ov=document.getElementById('mixov');ovHide(ov);ov.setAttribute('aria-hidden','true');document.body.style.overflow='';}
function renderMix(){var body=document.getElementById('mixbody');if(mxIdx>=mxPool.length){renderMixEnd();return;}var it=mxPool[mxIdx];body.innerHTML='<div class="mx-top"><span class="mx-prog">Question '+(mxIdx+1)+' / '+mxPool.length+'</span><span class="mx-kind '+it.badge+'">'+it.kind+'</span></div><div class="mx-label">'+it.label+'</div><div class="qq">'+it.prompt+'</div><div id="mxrev"></div><button class="push" id="mxshow" type="button">Reveal a strong answer</button>';document.getElementById('mxshow').onclick=function(){document.getElementById('mxrev').innerHTML=it.reveal;this.style.display='none';var j=document.createElement('div');j.className='judge';j.innerHTML='<button class="got" id="mxg" type="button">&#10003; Handled it <span class="hint">[1]</span></button><button class="shk" id="mxs" type="button">&#126; Shaky <span class="hint">[2]</span></button>';body.appendChild(j);document.getElementById('mxg').onclick=function(){mxJudge(true);};document.getElementById('mxs').onclick=function(){mxJudge(false);};};}
function mxJudge(ok){if(ok)mxGot++;else mxShk++;mxRes.push({item:mxPool[mxIdx],ok:ok});mixLog.push({kind:mxPool[mxIdx].kind,label:mxPool[mxIdx].label,ok:ok});mxIdx++;renderMix();}
function renderMixEnd(){var body=document.getElementById('mixbody');var pct=Math.round(mxGot/mxPool.length*100);var verdict=pct>=80?'Sharp &mdash; you switched registers cleanly.':pct>=50?'Solid. A couple of the gear-changes caught you off guard.':'The jumps between question types are the work &mdash; run it again.';var pk={Probe:[0,0],Curve:[0,0],Trade:[0,0]};mxRes.forEach(function(r){var k=(r.item.kind==='Curveball')?'Curve':(r.item.kind==='Trade-off'?'Trade':'Probe');pk[k][1]++;if(r.ok)pk[k][0]++;});function ek(kd){return kd==='Depth probe'?'Probe':kd;}var rows=mxRes.map(function(r){return '<div class="mx-erow"><span class="mx-edot '+(r.ok?'ok':'no')+'"></span><span class="mx-ek">'+ek(r.item.kind)+'</span><span class="mx-el">'+r.item.label+'</span></div>';}).join('');function bd(lbl,ar){return ar[1]?'<span>'+lbl+' <b>'+ar[0]+'/'+ar[1]+'</b></span>':'';}var shN=0;mxRes.forEach(function(r){if(!r.ok)shN++;});var retry=shN?'<button class="push" id="mxretry" type="button">Retry the '+shN+' you fumbled</button>':'';var again=shN?'<button class="mxghost" id="mxre" type="button">Run a fresh mixed set</button>':'<button class="push" id="mxre" type="button">Run another mixed set</button>';body.innerHTML='<div class="mx-end"><div class="mx-end-h">Mixed fire &mdash; '+mxGot+' / '+mxPool.length+' handled</div><div class="mx-end-pct">'+pct+'%</div><div class="mx-end-v">'+verdict+'</div><div class="mx-bd">'+bd('Probes',pk.Probe)+bd('Curveballs',pk.Curve)+bd('Trade-offs',pk.Trade)+'</div><div class="mx-end-list">'+rows+'</div><div class="mx-end-btns">'+retry+again+'</div></div>';document.getElementById('mxre').onclick=openMix;var rt=document.getElementById('mxretry');if(rt)rt.onclick=retryShaky;}
function retryShaky(){var sh=[];mxRes.forEach(function(r){if(!r.ok)sh.push(r.item);});var ord=dShuffle(sh.length);mxPool=ord.map(function(i){return sh[i];});mxIdx=0;mxGot=0;mxShk=0;mxRes=[];renderMix();}
document.getElementById('mixopen').onclick=openMix;
document.getElementById('mixx').onclick=closeMix;
function pickInterrupts(){
  var idx=[];
  for(var i=0;i<mockBeats.length;i++)if(mockBeats[i].int)idx.push(i);
  for(var j=idx.length-1;j>0;j--){var r=Math.floor(Math.random()*(j+1)),t=idx[j];idx[j]=idx[r];idx[r]=t;}
  var k=2+Math.floor(Math.random()*3); if(k>idx.length)k=idx.length;
  var set={}; for(var m=0;m<k;m++)set[idx[m]]=true;
  return set;
}
function renderMockBeat(){
  if(mockBeat>=mockBeats.length){renderMockEnd();return;}
  var b=mockBeats[mockBeat], last=(mockBeat===mockBeats.length-1);
  var fire=!!(mockInterrupt&&b.int&&mockIntSet[mockBeat]);
  mockbody.innerHTML=
    '<div><span class="mb-prog">Beat '+(mockBeat+1)+' / '+mockBeats.length+'</span><span class="mb-tag">'+b.tag+'</span>'+'</div>'+
    '<div class="mb-cue">'+b.cue+'</div>'+
    '<div class="mb-task">'+b.task+'</div>'+
    '<div class="mb-model"><div class="mb-ml">Model answer</div>'+b.model+'</div>'+
    (fire?'<div class="mb-int" id="mbint"><div class="mb-int-h">&#128308;&nbsp; The interviewer cuts in</div><div class="mb-int-q">'+b.int.q+'</div><button class="mb-irev" id="mbirev" type="button">Reveal a strong reply</button><div class="mb-int-a" id="mbinta"><div class="mb-int-al">A strong reply hits</div>'+b.int.a+'</div>'+(b.int2?'<div class="mb-int2" id="mbint2"><div class="mb-int-h2">&#128308;&nbsp; And they push again</div><div class="mb-int-q">'+b.int2.q+'</div><button class="mb-irev" id="mbirev2" type="button">Reveal a strong reply</button><div class="mb-int-a" id="mbinta2"><div class="mb-int-al">A strong reply hits</div>'+b.int2.a+'</div></div>':'')+'</div>':'')+
    '<div class="mb-act"><button class="mb-rev" id="mbrev" type="button">Reveal model</button>'+
    '<button class="mb-next" id="mbnext" type="button">'+(last?'Finish':'Next beat →')+'</button></div>'+
    '<div class="mb-keys">Space reveal &middot; &rarr; or Enter next &middot; Esc close</div>';
  document.getElementById('mbrev').onclick=function(){mockbody.querySelector('.mb-model').classList.add('show');this.disabled=true;this.textContent='Revealed';if(fire){document.getElementById('mbint').classList.add('show');}};
  if(fire){document.getElementById('mbirev').onclick=function(){document.getElementById('mbinta').classList.add('show');this.disabled=true;this.textContent='Revealed';var i2=document.getElementById('mbint2');if(i2)i2.classList.add('show');};var ir2=document.getElementById('mbirev2');if(ir2)ir2.onclick=function(){document.getElementById('mbinta2').classList.add('show');this.disabled=true;this.textContent='Revealed';};}
  document.getElementById('mbnext').onclick=function(){mockBeat++;renderMockBeat();};
}
function renderMockEnd(){
  if(mockClock){clearInterval(mockClock);mockClock=null;}
  mockRuns++; mockLastTime=mockSec; mockLastInt=mockInterrupt?Object.keys(mockIntSet).length:0;
  var t=mockFmt(mockSec),html='<div class="mb-end"><div class="mb-end-h">Round complete</div>'+
    '<div class="mb-end-t">You ran the full arc in <span class="mb-end-time">'+t+'</span>. A real design round is 35–45 min — this is the spine you expand into it.</div>'+
    '<div class="mb-end-cv">Curveball this run: <b>'+mockBeats[mockCurveIdx].theme+'</b>. '+curveballPool.length+' rotate in &mdash; run again for a different one.</div>'+
    (mockInterrupt&&Object.keys(mockIntSet).length?'<div class="mb-end-int">Cut off on <b>'+Object.keys(mockIntSet).length+'</b> of '+mockBeats.length+' beats &mdash; the version that counts.</div>':'')+
    '<div class="mb-score-q">How many of the six did you deliver cleanly, out loud?</div><div class="mb-score" id="mbscore">';
  for(var i=0;i<=6;i++)html+='<button type="button" data-s="'+i+'">'+i+'</button>';
  html+='</div><div class="mb-verdict" id="mbverdict"></div><div class="mb-again"><button class="pri" id="mbagain" type="button">Run again</button><button id="mbclose2" type="button">Close</button></div></div>';
  mockbody.innerHTML=html;
  var sc=document.getElementById('mbscore');
  for(var k=0;k<sc.children.length;k++){
    sc.children[k].onclick=function(){
      for(var j=0;j<sc.children.length;j++){sc.children[j].style.background='';sc.children[j].style.borderColor='';sc.children[j].style.color='';}
      this.style.background='var(--accbg)';this.style.borderColor='var(--acc)';this.style.color='var(--acc)';
      var n=parseInt(this.getAttribute('data-s'),10),v=document.getElementById('mbverdict');
      mockLastScore=n;
      v.classList.add('show');
      if(n>=6){v.style.background='var(--tealbg)';v.style.color='#0a5240';v.innerHTML='<b>Six for six.</b> You can carry the whole round end to end — now do it faster and under interruption.';}
      else if(n>=4){v.style.background='var(--accbg)';v.style.color='var(--accink)';v.innerHTML='<b>'+n+' / 6.</b> The spine holds. Re-run and target the two that wobbled until they’re automatic.';}
      else{v.style.background='var(--amberbg)';v.style.color='#5e3c0a';v.innerHTML='<b>'+n+' / 6.</b> The arc isn’t solid yet — drill the weak beats in their own tabs, then run it again.';}
    };
  }
  document.getElementById('mbagain').onclick=openMock;
  document.getElementById('mbclose2').onclick=closeMock;
}
document.getElementById('mockopen').onclick=openMock;
document.getElementById('mockx').onclick=closeMock;
