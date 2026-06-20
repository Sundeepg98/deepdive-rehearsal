/* ============ NUMBERS / NALSD ============ */
function fmtN(x){ if(!isFinite(x))x=0; return Math.round(x).toLocaleString('en-US'); }
function fmtTB(tb){ if(!isFinite(tb))tb=0; if(tb>=1000)return (tb/1000).toFixed(tb>=10000?0:1)+' PB'; if(tb>=10)return tb.toFixed(0)+' TB'; return tb.toFixed(2)+' TB'; }
function nval(id){ var v=+document.getElementById(id).value; return isFinite(v)&&v>0?v:0; }
function calcNumbers(){
  var perDay=nval('n_obj'), sizeMB=nval('n_size'), procS=nval('n_proc'), peakR=nval('n_peak');
  var avg=perDay/86400, peak=avg*peakR, conc=peak*procS, conn=conc;
  var stDay=perDay*sizeMB/1e6, stYr=stDay*365, puts=perDay, putCost=puts/1000*0.005;
  var rows=[
    {k:'Average throughput', v:fmtN(avg),u:'/s', n:'objects/day \u00F7 86,400 seconds', over:false},
    {k:'Peak throughput', v:fmtN(peak),u:'/s', n:'average \u00D7 '+fmtN(peakR)+' peak ratio', over:false},
    {k:'Lambda concurrency at peak', v:fmtN(conc),u:'', n:conc>1000?'exceeds the 1,000 default \u2014 RDS Proxy, or buffer through SQS':'peak/s \u00D7 processing time \u2014 within the 1,000 default', over:conc>1000},
    {k:'DB connections at peak', v:fmtN(conn),u:'', n:conn>100?'far past a Postgres pool (~100) \u2014 needs RDS Proxy or a queue':'\u2248 one connection per invocation \u2014 a pool can hold this', over:conn>100},
    {k:'Storage written / day', v:fmtTB(stDay).split(' ')[0],u:fmtTB(stDay).split(' ')[1], n:fmtTB(stYr)+' per year of raw objects', over:false},
    {k:'S3 PUTs / day', v:fmtN(puts),u:'', n:'\u2248 $'+putCost.toFixed(2)+'/day in PUT requests alone', over:false}
  ];
  var h='';
  for(var i=0;i<rows.length;i++){ var r=rows[i];
    h+='<div class="nrow'+(r.over?' over':'')+'"><div class="nrow-k">'+r.k+'</div><div class="nrow-v">'+r.v+'<span class="nv-u">'+(r.u||'')+'</span></div><div class="nrow-n">'+r.n+'</div></div>'; }
  document.getElementById('nout').innerHTML=h;
}
['n_obj','n_size','n_proc','n_peak'].forEach(function(id){ document.getElementById(id).addEventListener('input',calcNumbers); });
calcNumbers();

/* ============ TABS + RAIL + KEYBOARD ============ */
var segBtns=document.querySelectorAll('.seg button'),panes=document.querySelectorAll('.pane');
var railEl=document.getElementById('rail');
var railPos={walk:25,drill:50,wb:75,sys:100};
var current='walk';
function switchTab(t){
  for(var k=0;k<segBtns.length;k++)segBtns[k].classList.toggle('on',segBtns[k].getAttribute('data-tab')===t);
  for(var p=0;p<panes.length;p++)panes[p].classList.toggle('on',panes[p].id===t);
  railEl.style.width=railPos[t]+'%'; current=t;
}
for(var b=0;b<segBtns.length;b++){ segBtns[b].onclick=function(){switchTab(this.getAttribute('data-tab'));}; }
document.addEventListener('keydown',function(e){
  var tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea')return;
  if(mockov.classList.contains('open')||cramov.classList.contains('open')||sessov.classList.contains('open')||document.getElementById('mixov').classList.contains('open')||document.getElementById('planov').classList.contains('open')||document.getElementById('scopeov').classList.contains('open')||document.getElementById('keyov').classList.contains('open'))return;
  if(e.key==='?'){e.preventDefault();openKeys();return;}
  var key=e.key.toLowerCase();
  var tabKeys={q:'walk',w:'drill',e:'wb',r:'sys',t:'trade',y:'model',u:'num',i:'rf',o:'open'};
  if(tabKeys[key]){switchTab(tabKeys[key]);return;}
  if(current==='walk'){
    if(e.key==='ArrowLeft'&&wi>0){wi--;renderW();}
    if(e.key==='ArrowRight'&&wi<steps.length-1){wi++;renderW();}
  } else if(current==='drill'){
    var adv=document.getElementById('adv');
    if((e.key===' '||e.key==='Enter')&&adv){e.preventDefault();adv.click();}
    if(key==='1'){var jg=document.getElementById('jg');if(jg)jg.click();}
    if(key==='2'){var js=document.getElementById('js');if(js)js.click();}
  }
});
/* modal focus management — dialogs are aria-modal, so trap & restore focus */
(function(){
  /* overlay registry derived from the DOM: every [role=dialog][aria-modal] is auto-covered by the focus trap + global Escape, so a new overlay can't be forgotten (root cause of the keyov/mixov bugs) */
  var ovs=Array.prototype.slice.call(document.querySelectorAll('[role="dialog"][aria-modal="true"]'));
  var ovReturn=null;
  function focusables(ov){
    var nodes=ov.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])');
    return Array.prototype.filter.call(nodes,function(el){return !el.disabled&&el.offsetParent!==null;});
  }
  function curOv(){for(var i=0;i<ovs.length;i++)if(ovs[i].classList.contains('open'))return ovs[i];return null;}
  ovs.forEach(function(ov){
    ov.__open=ov.classList.contains('open');
    new MutationObserver(function(){
      var now=ov.classList.contains('open');
      if(now&&!ov.__open){ov.__open=true;ovReturn=document.activeElement;setTimeout(function(){var f=focusables(ov);if(f.length)f[0].focus();},0);}
      else if(!now&&ov.__open){ov.__open=false;if(ovReturn&&ovReturn.focus){try{ovReturn.focus();}catch(e){}}ovReturn=null;}
    }).observe(ov,{attributes:true,attributeFilter:['class']});
  });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Tab')return;
    var ov=curOv();if(!ov)return;
    var f=focusables(ov);if(!f.length){e.preventDefault();return;}
    var first=f[0],last=f[f.length-1],a=document.activeElement;
    if(!ov.contains(a)){e.preventDefault();first.focus();return;}
    if(e.shiftKey&&a===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&a===last){e.preventDefault();first.focus();}
  },true);
  /* unified Escape: close whichever overlay is open via its own close button (covers all overlays; correct per-overlay cleanup) */
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;var ov=curOv();if(!ov)return;var x=ov.querySelector('.mock-x,.cram-x');if(x)x.click();});
})();

/* ===== shell: mobile tools sheet (v75) ===== */
(function(){
  var fab=document.getElementById('toolsfab');
  var mb=document.querySelector('.mockbar');
  if(fab){fab.addEventListener('click',function(e){e.stopPropagation();document.body.classList.toggle('tools-open');});}
  document.addEventListener('click',function(e){
    if(!document.body.classList.contains('tools-open'))return;
    if(mb&&mb.contains(e.target))return;
    if(fab&&fab.contains(e.target))return;
    document.body.classList.remove('tools-open');
  });
  if(mb){mb.addEventListener('click',function(e){
    var btn=e.target.closest&&e.target.closest('button');if(!btn)return;
    if(btn.id==='inttog'||btn.id==='themetog')return;
    document.body.classList.remove('tools-open');
  });}
})();


/* ===== v76: reset scroll to top on view switch ===== */
(function(){
  var nav=document.querySelectorAll('.sidebar .seg button');
  for(var i=0;i<nav.length;i++){ nav[i].addEventListener('click',function(){ window.scrollTo(0,0); }); }
})();


/* ===== v77: stage header sync ===== */
(function(){
  var cmpNotes={
    walk:['Walkthrough','The dispatch flow, one step at a time — the mechanics you narrate before anyone cuts in.','Say the fork out loud — “one read, two sinks.” That single-read line is what they remember.'],
    drill:['Probe Drill','Twenty graded follow-ups — the ones that separate a passing SDE2 from a Staff signal.','Commit to an answer before you reveal — saying it beats reading it. That’s the rep.'],
    wb:['Whiteboard','Rebuild the whole pipeline from memory — nine cues, nothing in front of you.','Draw the boxes from memory first, then check — recall is the test, not recognition.'],
    sys:['System Map','Zoom out to the six stages — and the exact points an interviewer pivots.','Lead with the flow, not the boxes — “upload lands, dispatch routes, sinks fan out.”'],
    trade:['Trade-offs','The decisions they drill — each with the switch condition that picks a side.','Always say “pick when” — name the condition that flips the choice, not just the options.'],
    model:['Model Answers','Full spoken scripts — the beats, in order, the way you’d actually say them.','Steal the frame, not the words — headline first, then the one risk you’d name.'],
    num:['Numbers','Back-of-envelope the load — and know which number trips which ceiling.','Lead with the peak, not the average — ~1,157/s is the number that sets the ceiling.'],
    rf:['Red Flags','What sinks the round — the anti-patterns, and what to say instead.','Name what the interviewer hears, not just the mistake — that’s the senior tell.'],
    open:['30-Second','The opener and the close — matched to the altitude the question is asked at.','Match the altitude — open at the contract, not the code, and land on the one risk.']
  };
  function upd(){
    var b=document.querySelector('.sidebar .seg button.on'),sh=document.getElementById('stagehead');
    if(!b||!sh)return;
    var nm=b.querySelector('span:not(.n)'),kk=b.querySelector('.n');
    sh.textContent='';
    var k=document.createElement('div');k.className='sh-kick';k.textContent=kk?kk.textContent:'';
    var n=document.createElement('div');n.className='sh-name';n.textContent=nm?nm.textContent:'';
    sh.appendChild(k);sh.appendChild(n);
    sh.classList.remove('headin');void sh.offsetWidth;sh.classList.add('headin');
    var _tb=b.getAttribute('data-tab'),_cv=document.getElementById('cmpView'),_cn=document.getElementById('cmpNote');var _cm=document.getElementById('cmpMove'),_mv=document.getElementById('mCmpView'),_mn=document.getElementById('mCmpNote'),_mm=document.getElementById('mCmpMove');if(cmpNotes[_tb]){if(_cv)_cv.textContent=cmpNotes[_tb][0];if(_cn)_cn.textContent=cmpNotes[_tb][1];if(_cm)_cm.textContent=cmpNotes[_tb][2];if(_mv)_mv.textContent=cmpNotes[_tb][0];if(_mn)_mn.textContent=cmpNotes[_tb][1];if(_mm)_mm.textContent=cmpNotes[_tb][2];}
  }
  var nav=document.querySelectorAll('.sidebar .seg button');
  for(var i=0;i<nav.length;i++)nav[i].addEventListener('click',function(){upd();});
  upd();
})();

/* v80: mobile nav strip fade + keep active view in view */
(function(){
 var strip=document.querySelector('.sidebar .seg'); if(!strip)return;
 function fades(){
  var sl=strip.scrollLeft>4, sr=strip.scrollLeft+strip.clientWidth<strip.scrollWidth-4;
  strip.style.setProperty('--fl', sl?'24px':'0px');
  strip.style.setProperty('--fr', sr?'24px':'0px');
 }
 function ensureVis(){
  if(!window.matchMedia('(max-width:919px)').matches)return;
  var btn=strip.querySelector('button.on'); if(!btn)return;
  var s=strip.getBoundingClientRect(), b=btn.getBoundingClientRect();
  if(b.left<s.left+10||b.right>s.right-10){ btn.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',inline:'center',block:'nearest'}); }
 }
 strip.addEventListener('scroll',fades,{passive:true});
 window.addEventListener('resize',function(){fades();});
 var btns=strip.querySelectorAll('button');
 for(var i=0;i<btns.length;i++)btns[i].addEventListener('click',function(){ setTimeout(function(){fades();ensureVis();},30); });
 if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fades);}
 fades();
})();

