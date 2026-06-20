var mai=0, modelBody=document.getElementById('modelBody'), mselBtns=document.querySelectorAll('.msel button');
function renderModel(){
  var m=modelAnswers[mai];
  var h='<div class="mscript-h">'+m.opener+'</div><div class="mscript-sub">'+m.sub+'</div>';
  for(var i=0;i<m.beats.length;i++){ var bt=m.beats[i];
    h+='<div class="mbeat"><div class="mbeat-l l-'+bt.c+'">'+bt.l+'</div><div class="mbeat-t">'+bt.t+'</div></div>'; }
  modelBody.innerHTML=h;
  for(var k=0;k<mselBtns.length;k++) mselBtns[k].classList.toggle('on',k===mai);
}
for(var mb=0;mb<mselBtns.length;mb++){ mselBtns[mb].onclick=function(){ mai=+this.getAttribute('data-i'); renderModel(); }; }
renderModel();
