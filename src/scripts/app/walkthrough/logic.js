var wi=0;
var wcard=document.getElementById('wcard'),wdots=document.getElementById('wdots'),
    wctr=document.getElementById('wctr'),wprev=document.getElementById('wprev'),wnext=document.getElementById('wnext');
for(var i=0;i<steps.length;i++){wdots.appendChild(document.createElement('i'));}
var warc=document.getElementById('warc');
for(var ai=0;ai<steps.length;ai++){(function(k){var b=document.createElement('button');b.type='button';b.className='arc-step';b.innerHTML='<span class="arc-n">'+(k+1)+'</span><span class="arc-t">'+steps[k].t+'</span>';b.onclick=function(){wi=k;renderW();};warc.appendChild(b);})(ai);}
function renderW(){
  var s=steps[wi];
  var html='<div class="step-k">'+s.k+'</div><div class="step-t">'+s.t+'</div>'+
    '<div class="flow">'+s.flow+'</div><div class="ins">'+s.ins+'</div>';
  if(s.deep){ html+='<details class="disc"><summary>Go deeper</summary><div class="body">'+s.deep+'</div></details>'; }
  if(s.code){ html+='<details class="disc"><summary>See the code</summary><pre class="code">'+s.code+'</pre><div class="codecap">'+s.cap+'</div></details>'; }
  wcard.innerHTML=html;
  var ds=wdots.children;
  for(var j=0;j<ds.length;j++){ds[j].className=j<wi?'done':(j===wi?'on':'');}
  if(warc){var as=warc.children;for(var k=0;k<as.length;k++){as[k].className='arc-step'+(k<wi?' done':(k===wi?' on':''));}}
  wctr.textContent=(wi+1)+' of '+steps.length;
  wprev.disabled=wi===0; wnext.disabled=wi===steps.length-1;
}
wprev.onclick=function(){if(wi>0){wi--;renderW();}};
wnext.onclick=function(){if(wi<steps.length-1){wi++;renderW();}};
renderW();
