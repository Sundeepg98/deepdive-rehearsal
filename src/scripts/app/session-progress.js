/* ============ SESSION PROGRESS ============ */
var sessov=document.getElementById('sessov'),sessbody=document.getElementById('sessbody');
function openSession(){renderSession();ovShow(sessov);sessov.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  }
function closeSession(){ovHide(sessov);sessov.setAttribute('aria-hidden','true');document.body.style.overflow='';}
function clearSession(){
  setMode('study');
  var lis=wblist.querySelectorAll('li');
  for(var i=0;i<lis.length;i++)wbReset(lis[i]);
  updCount();
  mockLastScore=null;mockLastTime=null;mockRuns=0;
  mixLog=[];mxRes=[];mxGot=0;mxShk=0;
}
function pickRec(revisit,missed,mScore,dDone,dTot,wbDone,mRuns,mixWeak){
  if(revisit.length&&dDone>=dTot)return {kicker:'Focus next',text:'You flagged <b>'+revisit.length+'</b> probe'+(revisit.length===1?'':'s')+' to revisit. Re-drill '+(revisit.length===1?'it':'them')+' until the signal comes automatically.',btn:'Re-drill weak spots \u2192',tab:'drill',weak:true,bd:'#e8c5c0',bg:'var(--redbg)',ink:'#7d2222'};
  if(missed.length)return {kicker:'Focus next',text:'You missed <b>'+missed.length+'</b> step'+(missed.length===1?'':'s')+' on the whiteboard. Re-draw '+(missed.length===1?'it':'them')+' from a blank page.',btn:'Re-draw missed steps \u2192',tab:'wb',wbreset:true,bd:'#e8c5c0',bg:'var(--redbg)',ink:'#7d2222'};
  if(mScore!==null&&mScore<4)return {kicker:'Focus next',text:'Your last mock landed at <b>'+mScore+' / 6</b>. Run the arc again and target the beats that wobbled.',btn:'Run the round again \u2192',tab:'__mock__',bd:'#e8c5c0',bg:'var(--redbg)',ink:'#7d2222'};
  if(dDone<dTot)return {kicker:'Keep going',text:'You\u2019ve graded <b>'+dDone+' of '+dTot+'</b> probes. Clear the rest so nothing in the round is a surprise.',btn:'Back to the drill \u2192',tab:'drill',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(wbDone===0)return {kicker:'Keep going',text:'You haven\u2019t tried the <b>whiteboard recall</b> yet \u2014 rebuild the whole design from cues alone.',btn:'Try the whiteboard \u2192',tab:'wb',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(mRuns===0)return {kicker:'Keep going',text:'Drill and whiteboard are clean. Now pressure-test the <b>whole arc</b> on the clock.',btn:'Start a mock run \u2192',tab:'__mock__',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(mixWeak&&mixWeak.length)return {kicker:'Sharpen',text:'You fumbled <b>'+mixWeak.length+'</b> item'+(mixWeak.length===1?'':'s')+' in mixed fire \u2014 register-switching is where rounds slip. Re-run a mixed set and clear them.',btn:'Run mixed fire \u2192',tab:'__mix__',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  return {kicker:'You\u2019re ready',text:'Solid across the drill, the whiteboard, and a timed run. Keep it sharp \u2014 run it again faster, or under interruption.',btn:null,tab:null,bd:'#bfe0d3',bg:'var(--tealbg)',ink:'#0a5240'};
}
function sessStats(){
  var dTot=cards.length, dDone=results.length, dGot=got, dShk=shk, dLeft=dTot-dDone;
  var revisit=results.filter(function(r){return !r.ok;}).map(function(r){return r.signal;});
  var wbLis=wblist?wblist.querySelectorAll('li'):[];
  var wbGot=0,wbMiss=0,missed=[];
  for(var i=0;i<wbLis.length;i++){
    if(wbLis[i].classList.contains('got'))wbGot++;
    else if(wbLis[i].classList.contains('missed')){wbMiss++;var cue=(wbSteps[i]&&wbSteps[i].c)||('Step '+(i+1));missed.push(cue.split('&mdash;')[0].replace(/[.\s]+$/,''));}
  }
  var wbTot=wbSteps.length, wbDone=wbGot+wbMiss;
  var mixTot=mixLog.length,mixGot=0,mixLatest={};
  for(var mi=0;mi<mixLog.length;mi++){if(mixLog[mi].ok)mixGot++;mixLatest[mixLog[mi].label]=mixLog[mi].ok;}
  var mixShk=mixTot-mixGot,mixWeak=[];
  for(var mlb in mixLatest){if(mixLatest[mlb]===false)mixWeak.push(mlb);}
  return {dTot:dTot,dDone:dDone,dGot:dGot,dShk:dShk,dLeft:dLeft,revisit:revisit,wbGot:wbGot,wbMiss:wbMiss,missed:missed,wbTot:wbTot,wbDone:wbDone,mScore:mockLastScore,mTime:mockLastTime,mRuns:mockRuns,mInt:mockLastInt,mixTot:mixTot,mixGot:mixGot,mixShk:mixShk,mixWeak:mixWeak};
}
function buildSessReport(){
  var S=sessStats();
  var rec=pickRec(S.revisit,S.missed,S.mScore,S.dDone,S.dTot,S.wbDone,S.mRuns,S.mixWeak);
  var d=new Date(),pad=function(x){return x<10?'0'+x:''+x;};
  var when=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' &middot; '+d.getHours()+':'+pad(d.getMinutes());
  var r='<div class="sr-head"><div class="sr-ttl">Content Pipeline &mdash; Session Report</div><div class="sr-when">'+when+'</div></div>';
  r+='<div class="sr-rec"><div class="sr-rk">'+rec.kicker+'</div><div class="sr-rt">'+rec.text+'</div></div>';
  r+='<div class="sr-sec"><div class="sr-h">Probe Drill</div>';
  if(S.dDone===0)r+='<div class="sr-stat">Not started &mdash; 0 of '+S.dTot+' graded.</div>';
  else{r+='<div class="sr-stat">'+S.dGot+' solid &middot; '+S.dShk+' to revisit &middot; '+S.dLeft+' untouched of '+S.dTot+'</div>';if(S.revisit.length)r+='<div class="sr-list"><b>Revisit:</b> '+S.revisit.join(' &middot; ')+'</div>';}
  r+='</div>';
  r+='<div class="sr-sec"><div class="sr-h">Whiteboard recall</div>';
  if(S.wbDone===0)r+='<div class="sr-stat">Not started &mdash; 0 of '+S.wbTot+' graded.</div>';
  else{r+='<div class="sr-stat">'+S.wbGot+' recalled &middot; '+S.wbMiss+' missed of '+S.wbTot+'</div>';if(S.missed.length)r+='<div class="sr-list"><b>Re-draw:</b> '+S.missed.join(' &middot; ')+'</div>';}
  r+='</div>';
  r+='<div class="sr-sec"><div class="sr-h">Mock Run</div>';
  if(S.mScore===null&&S.mRuns===0)r+='<div class="sr-stat">Not run yet.</div>';
  else r+='<div class="sr-stat">Last run: '+(S.mScore===null?'completed, unscored':S.mScore+' / 6')+(S.mTime!=null?' in '+mockFmt(S.mTime):'')+' &middot; '+S.mRuns+' run'+(S.mRuns===1?'':'s')+(S.mInt?' &middot; cut off on '+S.mInt+' of 6 beats':'')+'</div>';
  r+='</div>';
  r+='<div class="sr-sec"><div class="sr-h">Mixed Fire</div>';
  if(S.mixTot===0)r+='<div class="sr-stat">Not run yet.</div>';
  else{r+='<div class="sr-stat">'+S.mixGot+' handled &middot; '+S.mixShk+' shaky across '+S.mixTot+' mixed item'+(S.mixTot===1?'':'s')+'</div>';if(S.mixWeak.length)r+='<div class="sr-list"><b>Shaky:</b> '+S.mixWeak.join(' &middot; ')+'</div>';}
  r+='</div>';
  r+='<div class="sr-foot">Generated from this session &middot; Content Pipeline deep-rehearsal trainer. Re-run the weak areas above tomorrow.</div>';
  document.getElementById('sessreport').innerHTML=r;
}
function encodeSession(){
  var S=sessStats(),d=new Date(),pad=function(x){return x<10?'0'+x:''+x;};
  var dt=d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
  var ms=(S.mScore===null?'x':S.mScore);
  return 'CPR1.'+dt+'.'+S.dGot+'-'+S.dShk+'-'+S.dDone+'-'+S.dTot+'.'+S.wbGot+'-'+S.wbMiss+'-'+S.wbTot+'.'+ms+'-'+S.mRuns+'-'+S.mInt+'.'+S.mixGot+'-'+S.mixShk+'-'+S.mixTot;
}
function decodeSession(code){
  if(!code)return null;
  var c=(''+code).trim();
  var m=c.match(/^CPR1\.(\d{8})\.(\d+)-(\d+)-(\d+)-(\d+)\.(\d+)-(\d+)-(\d+)\.(x|\d+)-(\d+)-(\d+)(?:\.(\d+)-(\d+)-(\d+))?$/);
  if(!m)return null;
  return {date:m[1],dGot:+m[2],dShk:+m[3],dDone:+m[4],dTot:+m[5],wbGot:+m[6],wbMiss:+m[7],wbTot:+m[8],mScore:(m[9]==='x'?null:+m[9]),mRuns:+m[10],mInt:+m[11],mixGot:(m[12]!=null?+m[12]:0),mixShk:(m[13]!=null?+m[13]:0),mixTot:(m[14]!=null?+m[14]:0)};
}
function deltaRow(label,prior,cur,upGood){
  var diff=cur-prior, dir=diff===0?'same':(((diff>0)===upGood)?'good':'bad');
  var ar=diff===0?'&mdash;':(diff>0?'&#9650; '+Math.abs(diff):'&#9660; '+Math.abs(diff));
  return '<div class="cmp-row"><span class="cmp-lbl">'+label+'</span><span class="cmp-val">'+prior+' &rarr; <b>'+cur+'</b></span><span class="cmp-d cmp-'+dir+'">'+ar+'</span></div>';
}
function spark(vals){
  var bl='\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
  var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), rng=mx-mn, o='';
  for(var i=0;i<vals.length;i++){var idx=rng===0?3:Math.round((vals[i]-mn)/rng*7);o+=bl.charAt(idx);}
  return o;
}
function parseCodes(text){
  var lines=(text||'').split(/[\n,]+/), o=[];
  for(var i=0;i<lines.length;i++){var d=decodeSession(lines[i]);if(d)o.push(d);}
  o.sort(function(a,b){return a.date<b.date?-1:(a.date>b.date?1:0);});
  return o;
}
function trendRow(label,series,upGood){
  var first=series[0], last=series[series.length-1], diff=last-first;
  var dir=diff===0?'same':(((diff>0)===upGood)?'good':'bad');
  var ar=diff===0?'&mdash;':(diff>0?'&#9650; '+Math.abs(diff):'&#9660; '+Math.abs(diff));
  return '<div class="tr-row"><div class="tr-top"><span class="tr-lbl">'+label+'</span><span class="cmp-d cmp-'+dir+'">'+ar+'</span></div><div class="tr-bot"><span class="tr-spark cmp-'+dir+'">'+spark(series)+'</span><span class="tr-val">'+first+' &rarr; <b>'+last+'</b></span></div></div>';
}
function renderCompare(){
  var el=document.getElementById('sspaste'), out=document.getElementById('sscmpout');
  if(!el||!out)return;
  var priors=parseCodes(el.value);
  if(!priors.length){out.innerHTML='<div class="cmp-err">No session code found &mdash; paste one or more full <code>CPR1&hellip;</code> lines from past sessions.</div>';return;}
  var S=sessStats(), h='';
  if(priors.length===1){
    var prior=priors[0];
    var pd=prior.date.slice(0,4)+'-'+prior.date.slice(4,6)+'-'+prior.date.slice(6,8);
    h='<div class="cmp-head">Compared to '+pd+'</div>';
    h+=deltaRow('Drill solid',prior.dGot,S.dGot,true);
    h+=deltaRow('To revisit',prior.dShk,S.dShk,false);
    h+=deltaRow('Whiteboard recalled',prior.wbGot,S.wbGot,true);
    h+=deltaRow('Steps missed',prior.wbMiss,S.wbMiss,false);
    if(prior.mScore!==null&&S.mScore!==null)h+=deltaRow('Mock score',prior.mScore,S.mScore,true);
    if(prior.mixTot>0&&S.mixTot>0)h+=deltaRow('Mixed fire %',Math.round(prior.mixGot/prior.mixTot*100),Math.round(S.mixGot/S.mixTot*100),true);
  } else {
    h='<div class="cmp-head">Trend across '+(priors.length+1)+' sessions</div>';
    h+=trendRow('Drill solid',priors.map(function(p){return p.dGot;}).concat([S.dGot]),true);
    h+=trendRow('To revisit',priors.map(function(p){return p.dShk;}).concat([S.dShk]),false);
    h+=trendRow('Whiteboard recalled',priors.map(function(p){return p.wbGot;}).concat([S.wbGot]),true);
    h+=trendRow('Steps missed',priors.map(function(p){return p.wbMiss;}).concat([S.wbMiss]),false);
    var ms=priors.map(function(p){return p.mScore;}).concat([S.mScore]);
    if(ms.every(function(v){return v!==null;}))h+=trendRow('Mock score',ms,true);
    var mxt=priors.map(function(p){return p.mixTot;}).concat([S.mixTot]);
    if(mxt.every(function(v){return v>0;}))h+=trendRow('Mixed fire %',priors.map(function(p){return Math.round(p.mixGot/p.mixTot*100);}).concat([Math.round(S.mixGot/S.mixTot*100)]),true);
  }
  out.innerHTML=h;
}
function renderSession(){
  var S=sessStats();
  var dTot=S.dTot,dDone=S.dDone,dGot=S.dGot,dShk=S.dShk,dLeft=S.dLeft,revisit=S.revisit,wbGot=S.wbGot,wbMiss=S.wbMiss,missed=S.missed,wbTot=S.wbTot,wbDone=S.wbDone,mScore=S.mScore,mTime=S.mTime,mRuns=S.mRuns,mInt=S.mInt;
  var rec=pickRec(revisit,missed,mScore,dDone,dTot,wbDone,mRuns,S.mixWeak);
  var h='';
  h+='<div class="ss-rec" style="border-color:'+rec.bd+';background:'+rec.bg+'">'+
       '<div class="ss-rk" style="color:'+rec.ink+'">'+rec.kicker+'</div>'+
       '<div class="ss-rt" style="color:'+rec.ink+'">'+rec.text+'</div>'+
       (rec.btn?'<button class="ss-go" id="ssgo" type="button">'+rec.btn+'</button>':'')+
     '</div>';
  h+='<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--acc)"></span>Probe Drill</div>';
  if(dDone===0)h+='<div class="ss-stat ss-none">Not started \u2014 0 of '+dTot+' graded.</div>';
  else{h+='<div class="ss-stat"><span class="ss-g">'+dGot+' solid</span> &middot; <span class="ss-s">'+dShk+' to revisit</span> &middot; '+dLeft+' untouched of '+dTot+'</div>';
    if(revisit.length)h+='<div class="ss-list"><b>Revisit:</b> '+revisit.join(' &middot; ')+'</div>';}
  h+='</div>';
  h+='<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--teal)"></span>Whiteboard recall</div>';
  if(wbDone===0)h+='<div class="ss-stat ss-none">Not started \u2014 0 of '+wbTot+' graded.</div>';
  else{h+='<div class="ss-stat"><span class="ss-g">'+wbGot+' recalled</span> &middot; <span class="ss-s">'+wbMiss+' missed</span> of '+wbTot+'</div>';
    if(missed.length)h+='<div class="ss-list"><b>Re-draw:</b> '+missed.join(' &middot; ')+'</div>';}
  h+='</div>';
  h+='<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--indigo)"></span>Mock Run</div>';
  if(mScore===null&&mRuns===0)h+='<div class="ss-stat ss-none">Not run yet \u2014 take the full round on the clock.</div>';
  else h+='<div class="ss-stat">Last run: <span class="'+(mScore!==null&&mScore>=4?'ss-g':'ss-s')+'">'+(mScore===null?'completed, unscored':mScore+' / 6')+'</span>'+(mTime!=null?' in '+mockFmt(mTime):'')+' &middot; '+mRuns+' run'+(mRuns===1?'':'s')+(mInt?' &middot; cut off on <b>'+mInt+'</b> of 6':'')+'</div>';
  h+='</div>';
  h+='<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--acc2)"></span>Mixed Fire</div>';
  if(S.mixTot===0)h+='<div class="ss-stat ss-none">Not run yet \u2014 mix all three registers under one clock.</div>';
  else{h+='<div class="ss-stat"><span class="ss-g">'+S.mixGot+' handled</span> &middot; <span class="ss-s">'+S.mixShk+' shaky</span> across '+S.mixTot+' item'+(S.mixTot===1?'':'s')+'</div>';if(S.mixWeak.length)h+='<div class="ss-list"><b>Shaky:</b> '+S.mixWeak.join(' &middot; ')+'</div>';}
  h+='</div>';
  h+='<div class="ss-carry"><div class="ss-carry-h">Carry this session across days</div>'+
     '<div class="ss-code-row"><input class="ss-code" id="sscode" readonly aria-label="Session code" value="'+encodeSession()+'"><button class="ss-copy" id="sscopy" type="button">Copy</button></div>'+
     '<div class="ss-cmp-row"><textarea class="ss-paste" id="sspaste" rows="2" aria-label="Past session codes" placeholder="Paste past codes (one per line) for a trend" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><button class="ss-cmpbtn" id="sscmpbtn" type="button">Compare</button></div>'+
     '<div id="sscmpout"></div></div>';
  h+='<button class="ss-print" id="ssprint" type="button">Save this session as a PDF &rarr;</button>';
  h+='<button class="ss-clear" id="ssclear" type="button">Clear this session &amp; start fresh</button>';
  sessbody.innerHTML=h;
  var go=document.getElementById('ssgo');
  if(go)go.onclick=function(){closeSession();if(rec.tab==='__mock__'){openMock();return;}if(rec.tab==='__mix__'){openMix();return;}if(rec.tab){switchTab(rec.tab);if(rec.weak)drillWeak();else if(rec.wbreset)wbRerun();}};
  var clr=document.getElementById('ssclear'),clrArmed=false;
  if(clr)clr.onclick=function(){if(!clrArmed){clrArmed=true;clr.classList.add('arm');clr.textContent='Tap again \u2014 this wipes all progress';return;}clearSession();renderSession();};var prn=document.getElementById('ssprint');if(prn)prn.onclick=function(){buildSessReport();document.body.classList.add('print-session');try{window.print();}catch(_){}};var cp=document.getElementById('sscopy');if(cp)cp.onclick=function(){var f=document.getElementById('sscode');if(!f)return;f.focus();f.select();try{f.setSelectionRange(0,400);}catch(_){}var ok=false;try{ok=document.execCommand('copy');}catch(_){}if(navigator.clipboard&&navigator.clipboard.writeText){try{navigator.clipboard.writeText(f.value);}catch(_){}}var b=this;b.textContent=ok?'Copied':'Press \u2318C';setTimeout(function(){b.textContent='Copy';},1500);};var cmb=document.getElementById('sscmpbtn');if(cmb)cmb.onclick=renderCompare;var pst=document.getElementById('sspaste');if(pst)pst.onkeydown=function(e){if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();renderCompare();}};
}
document.getElementById('sessopen').onclick=openSession;
document.getElementById('sessx').onclick=closeSession;
var inttogEl=document.getElementById('inttog');
if(inttogEl)inttogEl.onclick=function(){mockInterrupt=!mockInterrupt;this.setAttribute('aria-pressed',mockInterrupt?'true':'false');this.querySelector('.inttog-lbl').innerHTML='Interviewer cuts in mid-answer &mdash; <b>'+(mockInterrupt?'on':'off')+'</b>';mockIntSet=mockInterrupt?pickInterrupts():{};};
