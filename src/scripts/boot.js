/* ============ BOOT ============
   Theme initialization: runs before any render. Sets the data-theme attribute
   and meta theme-color based on system preference, then watches for changes. */
(function(){
  var mql=matchMedia('(prefers-color-scheme:dark)');
  function setTheme(dark){
    document.documentElement.dataset.theme=dark?'dark':'light';
    var tc=document.querySelector('meta[name="theme-color"]');
    if(tc)tc.setAttribute('content',dark?'#15141A':'#FAF9F5');
    // Set color-scheme for native form controls
    document.documentElement.style.colorScheme=dark?'dark':'light';
  }
  setTheme(mql.matches);
  // Live theme switching without page reload
  if(mql.addEventListener)mql.addEventListener('change',function(e){setTheme(e.matches)});
  // Ambient floating particles — subtle background dust motes for a premium feel
  var stage=document.querySelector('.stage');
  if(stage){
    for(var i=0;i<6;i++){
      var p=document.createElement('div');
      p.className='particle';
      p.style.left=(10+i*15)+'%';
      p.style.animationDelay=(i*3.5)+'s';
      p.style.animationDuration=(15+Math.random()*10)+'s';
      stage.appendChild(p);
    }
  }
})();