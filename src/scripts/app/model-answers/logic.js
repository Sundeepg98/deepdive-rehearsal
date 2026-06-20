let currentAnswer = 0;
const modelBody = document.getElementById('modelBody');
const selectorBtns = document.querySelectorAll('.msel button');

/* Render the model answer at index `currentAnswer` into #modelBody: an opener
   line, a sub-line, then one ".mbeat" row per beat (each beat carries a colour
   class `c`, a label `l`, and body text `t`). Also flags the active selector. */
function renderModel() {
  const ans = modelAnswers[currentAnswer];
  let html = '<div class="mscript-h">' + ans.opener + '</div>' +
             '<div class="mscript-sub">' + ans.sub + '</div>';
  for (let i = 0; i < ans.beats.length; i++) {
    const beat = ans.beats[i];
    html += '<div class="mbeat"><div class="mbeat-l l-' + beat.c + '">' + beat.l +
            '</div><div class="mbeat-t">' + beat.t + '</div></div>';
  }
  modelBody.innerHTML = html;
  for (let k = 0; k < selectorBtns.length; k++) {
    selectorBtns[k].classList.toggle('on', k === currentAnswer);
  }
}

/* Each selector button switches the visible answer (its data-i is the index). */
for (let i = 0; i < selectorBtns.length; i++) {
  selectorBtns[i].onclick = function () {
    currentAnswer = +this.getAttribute('data-i');
    renderModel();
  };
}

renderModel();
