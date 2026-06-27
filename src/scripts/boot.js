/* === Boot: theme detection + loading splash === */
try{var _dk=matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.dataset.theme=_dk?'dark':'light';var _tc=document.querySelector('meta[name="theme-color"]');if(_tc)_tc.setAttribute('content',_dk?'#15141A':'#FAF9F5');}catch(e){}
/* v147: Loading splash — removed by app.js when ready */
(function(){
  var s=document.createElement('div');
  s.id='_bootsplash';
  s.innerHTML='<div class="_bs-ring"><div></div><div></div><div></div><div></div></div>';
  s.style.cssText='position:fixed;inset:0;z-index:9999;background:var(--bg,#FAF9F5);display:flex;align-items:center;justify-content:center;transition:opacity .4s ease,visibility .4s ease';
  var st=document.createElement('style');
  st.textContent='._bs-ring{display:inline-block;position:relative;width:48px;height:48px}._bs-ring div{box-sizing:border-box;display:block;position:absolute;width:36px;height:36px;margin:6px;border:3px solid transparent;border-top-color:var(--acc,#534AB7);border-radius:50%;animation:_bs-spin 1.2s cubic-bezier(.5,0,.5,1) infinite}._bs-ring div:nth-child(1){animation-delay:-.45s}._bs-ring div:nth-child(2){animation-delay:-.3s}._bs-ring div:nth-child(3){animation-delay:-.15s}@keyframes _bs-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}#_bootsplash._bs-done{opacity:0;visibility:hidden}';
  document.head.appendChild(st);
  (document.body||document.documentElement).appendChild(s);
  window._hideBootSplash=function(){var el=document.getElementById('_bootsplash');if(el){el.classList.add('_bs-done');setTimeout(function(){el.remove()},400)}};
  setTimeout(window._hideBootSplash,3000);
})();
