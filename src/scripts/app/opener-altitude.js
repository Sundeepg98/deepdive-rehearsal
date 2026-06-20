/* ============ OPENER / ALTITUDE ============ */
var opCards=document.querySelectorAll('#open .op');
for(var oc=0;oc<opCards.length;oc++){
  (function(op){
    var a=op.querySelector('.op-a'),r=op.querySelector('.op-rev');
    r.onclick=function(){a.classList.add('show');r.disabled=true;r.textContent='Revealed';};
  })(opCards[oc]);
}
