var mode='study',tierFilter='all',timerId=null,mockLeft=0,_allCards=cards,_allSpeak=speakLines;
var di=0,got=0,shk=0,results=[];
var revisit={},revisitMode=false;
var dwrap=document.getElementById('dwrap'),dfill=document.getElementById('dfill');
var sGot=document.getElementById('sGot'),sShk=document.getElementById('sShk'),sLeft=document.getElementById('sLeft');
var tierClass={SDE2:'t2',SDE3:'t3',Staff:'tS',EXTEND:'tX'};
function renderNav(){var nav=document.getElementById('dnav');if(!nav)return;var h='';for(var k=0;k<cards.length;k++){var c=cards[k],oi=_allCards.indexOf(c),fl=revisit[oi];h+='<button type="button" class="dn-step'+(k===di?' on':'')+(fl?' flag':'')+'" data-i="'+k+'"><span class="dn-n">'+(k+1)+'</span><span class="dn-t">'+c.signal+'</span></button>';}nav.innerHTML=h;}
(function(){var nav=document.getElementById('dnav');if(nav){nav.addEventListener('click',function(e){var b=e.target.closest('.dn-step');if(b){di=+b.getAttribute('data-i');renderD();}});}})();
function renderD(){
  sGot.textContent=got;sGot.parentNode.classList.toggle('z',got===0);sShk.textContent=shk;sShk.parentNode.classList.toggle('z',shk===0);sLeft.textContent=cards.length-di;sLeft.parentNode.classList.toggle('z',cards.length-di===0);
  dfill.style.width=(di/cards.length*100)+'%';
  renderNav();
  if(di>=cards.length){ if(mode==='mock'){renderVerdict();}else{renderDebrief();} updRevset(); return; }
  drawCard(0); updRevset();
}
function drawCard(stage){
  var c=cards[di], maxStage=1+c.f.length;
  var html='<div class="card"><div class="thread">'+
    '<div class="qrow"><div><div class="qk">Probe '+(di+1)+' / '+cards.length+'</div>'+
    '<div class="sigtag">signal &middot; <b>'+c.signal+'</b></div></div>'+
    '<span class="tier '+tierClass[c.tier]+'">'+c.tier+'</span></div>'+
    '<div class="qq">'+c.q+'</div>';
  if(stage>=1){ html+='<div class="ans'+(stage===1?' dnr':'')+'">'+c.a+'</div>'; }
  for(var k=0;k<c.f.length;k++){
    if(stage>=2+k){
      html+='<div class="fu"><div class="lab">Interviewer pushes further</div>'+
        '<div class="fq">'+c.f[k].q+'</div><div class="fa">'+c.f[k].a+'</div></div>';
    }
  }
  if(stage>=maxStage){ html+='<div class="senior"><div class="sl">What sounds senior here</div>'+c.senior+'</div>'; html+='<div class="speak"><div class="sl">Say it out loud like this</div>'+speakLines[di]+'</div>'; }
  html+='</div>';
  if(stage<maxStage){
    html+='<button type="button" class="push'+(stage>=1?' more':'')+'" id="adv">'+
          (stage<1?'Reveal answer':'&#8627; Interviewer pushes further')+'</button>';
  } else {
    html+='<div class="judge"><button type="button" class="got" id="jg">&#10003; Solid <span class="hint">[1]</span></button>'+
          '<button type="button" class="shk" id="js">&#126; Revisit <span class="hint">[2]</span></button></div>';
  }
  html+='</div>';
  dwrap.innerHTML=html;
  var adv=document.getElementById('adv');
  if(adv){adv.onclick=function(){drawCard(stage+1);};}
  var jg=document.getElementById('jg');if(jg){jg.onclick=function(){judge(true);};}
  var js=document.getElementById('js');if(js){js.onclick=function(){judge(false);};}
}
function judge(ok){
  var c=cards[di];
  if(ok)got++;else shk++;
  var _oi=_allCards.indexOf(c); if(_oi>-1){ if(ok){delete revisit[_oi];}else{revisit[_oi]=true;} }
  results.push({signal:c.signal,tier:c.tier,ok:ok,card:c,speak:speakLines[di]});
  di++;renderD();
  var _be=ok?sGot:sShk; if(_be){_be.classList.remove('cbump'); void _be.offsetWidth; _be.classList.add('cbump');}
}
function renderDebrief(){
  var pct=Math.round(got/cards.length*100),rows='';
  for(var r=0;r<results.length;r++){
    var x=results[r];
    rows+='<div class="sigrow '+(x.ok?'ok':'no')+'"><div class="mk">'+(x.ok?'\u2713':'\u2192')+'</div>'+
      '<div class="nm">'+x.signal+'</div><div class="tr"><span class="tier '+tierClass[x.tier]+'">'+x.tier+'</span></div></div>';
  }
  var verdict;
  if(pct>=80) verdict='You\'re carrying the signals a senior loop grades on. The shaky ones are polish, not gaps — re-run those threads until the <b>senior-signal line</b> comes out unprompted.';
  else if(pct>=50) verdict='Solid core, real gaps. The signals you marked <b>Revisit</b> are exactly what an interviewer probes to separate levels — drill those threads to the last layer before the real round.';
  else verdict='You know the happy path; the depth isn\'t there yet. Work the <b>Walkthrough</b> + <b>See the code</b>, then re-run — the follow-up chains are where this round is won or lost.';
  var weakBtn = shk>0 ? '<button type="button" id="dweak" class="btn-sec">Drill my '+shk+' Revisit '+(shk===1?'probe':'probes')+' \u2192</button>' : '';
  dwrap.innerHTML='<div class="card debrief"><div class="big">'+(mode==='quick'?'Quick 5 debrief':'Interviewer debrief')+'</div>'+
    '<div class="sumline">'+got+' solid &middot; '+shk+' to revisit &middot; '+pct+'% '+(mode==='quick'?'of a quick 5':'signal coverage')+'</div>'+
    rows+'<div class="verdict">'+verdict+'</div>'+weakBtn+
    '<button type="button" id="drestart">'+(mode==='quick'?'Another quick 5 →':'Run the full round again')+'</button></div>';
  if(shk>0){ document.getElementById('dweak').onclick=drillWeak; }
  document.getElementById('drestart').onclick=function(){setMode(mode);};
}
function drillWeak(){
  var weak=results.filter(function(r){return !r.ok;});
  if(!weak.length)return false;
  cards=weak.map(function(r){return r.card;});
  speakLines=weak.map(function(r){return r.speak;});
  di=0;got=0;shk=0;results=[];revisitMode=true;renderD();
  return true;
}
function drillRevset(){
  var idx=[],k; for(k in revisit){if(revisit.hasOwnProperty(k))idx.push(+k);}
  if(!idx.length)return;
  idx.sort(function(a,b){return a-b;});
  cards=idx.map(function(i){return _allCards[i];});
  speakLines=idx.map(function(i){return _allSpeak[i];});
  di=0;got=0;shk=0;results=[];revisitMode=true;stopTimer();renderD();
}
function updRevset(){
  var n=0,k; for(k in revisit){if(revisit.hasOwnProperty(k))n++;}
  var box=document.getElementById('revset'); if(!box)return;
  if(n>0&&!revisitMode&&di<cards.length){
    box.style.display='';
    document.getElementById('revn').textContent=n;
    document.getElementById('revw').textContent=(n===1?'probe':'probes');
  } else { box.style.display='none'; }
}
function fmt(s){var m=Math.floor(s/60),x=s%60;return m+':'+(x<10?'0':'')+x;}
var timerEl=document.getElementById('timer');
function startTimer(){
  mockLeft=22*60; timerEl.textContent=fmt(mockLeft); timerEl.style.display='block'; timerEl.classList.remove('low');
  if(timerId)clearInterval(timerId);
  timerId=setInterval(function(){
    mockLeft--; timerEl.textContent=fmt(mockLeft);
    if(mockLeft<=60)timerEl.classList.add('low');
    if(mockLeft<=0){clearInterval(timerId);timerId=null;di=cards.length;renderD();}
  },1000);
}
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}timerEl.style.display='none';}
function dShuffle(n){var a=[];for(var i=0;i<n;i++)a.push(i);for(var i=n-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function basePoolIdx(){var a=[];for(var i=0;i<_allCards.length;i++){if(tierFilter==='all'||_allCards[i].tier===tierFilter)a.push(i);}return a;}
function setMode(m){
  mode=m;
  var base=basePoolIdx();
  if(m==='quick'){var qi=dShuffle(base.length).slice(0,5).map(function(i){return base[i];});cards=qi.map(function(i){return _allCards[i];});speakLines=qi.map(function(i){return _allSpeak[i];});}
  else{cards=base.map(function(i){return _allCards[i];});speakLines=base.map(function(i){return _allSpeak[i];});}
  di=0;got=0;shk=0;results=[];revisitMode=false;
  var mb=document.getElementById('modetog').children;
  for(var z=0;z<mb.length;z++)mb[z].classList.toggle('on',mb[z].getAttribute('data-m')===m);
  if(m==='mock')startTimer();else stopTimer();
  renderD();
}
function recLevel(pct,depthOk){
  if(pct>=85&&depthOk)return{c:'sh',t:'Strong Hire'};
  if(pct>=70)return{c:'h',t:'Hire'};
  if(pct>=50)return{c:'lh',t:'Lean Hire'};
  return{c:'nh',t:'No Hire'};
}
function renderVerdict(){
  stopTimer();
  var answered=results.length, pct=Math.round(got/cards.length*100);
  var depthSolid=0,depthTotal=0;
  for(var r=0;r<results.length;r++){if(results[r].tier==='Staff'||results[r].tier==='EXTEND'){depthTotal++;if(results[r].ok)depthSolid++;}}
  var depthOk=depthTotal>0&&depthSolid/depthTotal>=0.66;
  var rec=recLevel(pct,depthOk),rows='';
  for(var r2=0;r2<results.length;r2++){var x=results[r2];
    rows+='<div class="sigrow '+(x.ok?'ok':'no')+'"><div class="mk">'+(x.ok?'\u2713':'\u2192')+'</div>'+
      '<div class="nm">'+x.signal+'</div><div class="tr"><span class="tier '+tierClass[x.tier]+'">'+x.tier+'</span></div></div>';
  }
  var note;
  if(rec.c==='sh')note='Depth held under the Staff / EXTEND probes — that\'s exactly what tips a packet from Hire to <b>Strong Hire</b>.';
  else if(rec.c==='h')note='Strong coverage. To reach Strong Hire, the <b>Staff-tier</b> threads have to be solid, not just attempted.';
  else if(rec.c==='lh')note='Enough signal for a phone screen, not an onsite. The gap is <b>depth</b> — drill the multi-layer threads to the end.';
  else note='Below bar — the happy path isn\'t enough. Work Walkthrough + See-the-code, then run the round again.';
  var used=22*60-mockLeft; if(used<0)used=0;
  dwrap.innerHTML='<div class="card debrief"><div class="rec '+rec.c+'"><div class="lvl">'+rec.t+'</div>'+
    '<div class="tu">'+got+' / '+cards.length+' signals &middot; '+answered+' probes reached &middot; '+fmt(used)+' on the clock</div></div>'+
    '<div style="height:12px"></div>'+rows+'<div class="verdict">'+note+'</div>'+
    '<button type="button" id="vrestart">Run another round</button></div>';
  document.getElementById('vrestart').onclick=function(){setMode('mock');};
}
var mtog=document.getElementById('modetog');
for(var mt=0;mt<mtog.children.length;mt++){mtog.children[mt].onclick=function(){setMode(this.getAttribute('data-m'));};}
var ttog=document.getElementById('tiertog');
var tierNotes={all:'<b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.',SDE2:'<b>Fundamentals under pressure</b> &mdash; memory model, I/O, idempotent writes. The bar is &ldquo;this won&rsquo;t fall over&rdquo;: show the mechanics cleanly.',SDE3:'<b>Depth &amp; trade-offs</b> &mdash; consistency, schema evolution, the hidden bill. The bar is &ldquo;it depends, here&rsquo;s the switch&rdquo;: never a one-size answer.',Staff:'<b>Systems judgment</b> &mdash; irreversibility, blast radius, the exactly-once illusion. The bar is &ldquo;I see the failure mode before it ships&rdquo;: name what breaks and name the backstop.'};
function setTier(t){tierFilter=t;var tn=document.getElementById('tiernote');if(tn)tn.innerHTML=tierNotes[t]||tierNotes.all;for(var z=0;z<ttog.children.length;z++)ttog.children[z].classList.toggle('on',ttog.children[z].getAttribute('data-tier')===t);setMode(mode);}
for(var tt=0;tt<ttog.children.length;tt++){ttog.children[tt].onclick=function(){setTier(this.getAttribute('data-tier'));};}
var _rd=document.getElementById('revdrill');if(_rd)_rd.onclick=drillRevset;
setMode('study');
