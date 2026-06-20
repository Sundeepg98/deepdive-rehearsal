/* ============ CRAM SHEET ============ */
var cramov=document.getElementById('cramov'), cramEscBound=false;
function openCram(){
  ovShow(cramov); cramov.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  if(!cramEscBound){document.addEventListener('keydown',function(e){
    if(!cramov.classList.contains('open'))return;
    if(e.key.toLowerCase()==='p'){e.preventDefault();document.body.classList.remove('print-session');try{window.print();}catch(_){}}
  });cramEscBound=true;}
}
function closeCram(){ovHide(cramov); cramov.setAttribute('aria-hidden','true'); document.body.style.overflow='';}
document.getElementById('cramopen').onclick=openCram;
document.getElementById('cramx').onclick=closeCram;

function openPlan(){var pv=document.getElementById('planov');ovShow(pv);pv.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function closePlan(){var pv=document.getElementById('planov');ovHide(pv);pv.setAttribute('aria-hidden','true');document.body.style.overflow='';}

function openScope(){var sv=document.getElementById('scopeov');ovShow(sv);sv.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function closeScope(){var sv=document.getElementById('scopeov');ovHide(sv);sv.setAttribute('aria-hidden','true');document.body.style.overflow='';}
function openKeys(){var kv=document.getElementById('keyov');ovShow(kv);kv.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function closeKeys(){var kv=document.getElementById('keyov');ovHide(kv);kv.setAttribute('aria-hidden','true');document.body.style.overflow='';}
document.getElementById('planopen').onclick=openPlan;document.getElementById('scopeopen').onclick=openScope;document.getElementById('scopex').onclick=closeScope;document.getElementById('keyopen').onclick=openKeys;document.getElementById('keyx').onclick=closeKeys;
document.getElementById('planx').onclick=closePlan;

(function(){var html=document.documentElement,btn=document.getElementById('themetog');function paint(){var d=html.dataset.theme==='dark';if(btn){btn.setAttribute('aria-pressed',d?'true':'false');var st=btn.querySelector('.tt-state');if(st)st.textContent=d?'on':'off';}var _tc=document.querySelector('meta[name="theme-color"]');if(_tc)_tc.setAttribute('content',d?'#15141A':'#FAF9F5');}paint();if(btn)btn.onclick=function(){html.dataset.theme=html.dataset.theme==='dark'?'light':'dark';paint();};})();
document.getElementById('cramprint').onclick=function(){document.body.classList.remove('print-session');try{window.print();}catch(e){}};
window.addEventListener('afterprint',function(){document.body.classList.remove('print-session');});
