function mockFmt(s){var m=Math.floor(s/60),x=s%60;return m+':'+(x<10?'0':'')+x;}
function ovShow(ov){if(ov._exT){clearTimeout(ov._exT);ov._exT=null;}ov.classList.remove('closing');ov.classList.add('open');}
function ovHide(ov){if(!ov.classList.contains('open')){ov.classList.remove('closing');return;}ov.classList.add('closing');var pan=ov.querySelector('.mock-panel,.cram-panel')||ov;var fin=function(){ov.classList.remove('open','closing');if(ov._exT){clearTimeout(ov._exT);ov._exT=null;}pan.removeEventListener('animationend',fin);};pan.addEventListener('animationend',fin,{once:true});ov._exT=setTimeout(fin,500);}
function openMock(){
  if(mockClock){clearInterval(mockClock);mockClock=null;}
  mockBeat=0; mockSec=0; mockclockEl.textContent='0:00';
  mockBeats[mockCurveIdx]=curveballPool[Math.floor(Math.random()*curveballPool.length)];
  mockBeats[mockFrameIdx].cue=framePool[Math.floor(Math.random()*framePool.length)];
  mockIntSet=mockInterrupt?pickInterrupts():{};
  ovShow(mockov); mockov.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  mockClock=setInterval(function(){mockSec++;mockclockEl.textContent=mockFmt(mockSec);},1000);
  if(!mockEscBound){document.addEventListener('keydown',function(e){
    if(!mockov.classList.contains('open'))return;
    if(e.key===' '){e.preventDefault();var rv=document.getElementById('mbrev');if(rv&&!rv.disabled){rv.click();return;}var ir=document.getElementById('mbirev');if(ir&&!ir.disabled){ir.click();return;}var ir2=document.getElementById('mbirev2');if(ir2&&!ir2.disabled)ir2.click();return;}
    if(e.key==='Enter'||e.key==='ArrowRight'){e.preventDefault();var nx=document.getElementById('mbnext');if(nx)nx.click();}
  });mockEscBound=true;}
  renderMockBeat();
}
function closeMock(){
  ovHide(mockov); mockov.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  if(mockClock){clearInterval(mockClock);mockClock=null;}
}