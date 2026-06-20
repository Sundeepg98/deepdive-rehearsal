var wi = 0; /* SHARED: current step index — the keyboard handler in numbers-nalsd.js drives this too */
const walkCard = document.getElementById('wcard');
const dotsRow = document.getElementById('wdots');
const counterEl = document.getElementById('wctr');
const prevBtn = document.getElementById('wprev');
const nextBtn = document.getElementById('wnext');

/* one small progress dot per walkthrough step */
for (let i = 0; i < steps.length; i++) {
  dotsRow.appendChild(document.createElement('i'));
}

/* the "arc" rail: one jump-button per step that leaps straight to it */
const arcRow = document.getElementById('warc');
for (let i = 0; i < steps.length; i++) {
  (function (stepIdx) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arc-step';
    btn.innerHTML = '<span class="arc-n">' + (stepIdx + 1) + '</span>' +
                    '<span class="arc-t">' + steps[stepIdx].t + '</span>';
    btn.onclick = function () { wi = stepIdx; renderW(); };
    arcRow.appendChild(btn);
  })(i);
}

/* Render the current step into #wcard, then sync the dots, the arc rail, the
   "N of M" counter, and the prev/next button disabled states. */
function renderW() {
  const step = steps[wi];
  let html = '<div class="step-k">' + step.k + '</div><div class="step-t">' + step.t + '</div>' +
    '<div class="flow">' + step.flow + '</div><div class="ins">' + step.ins + '</div>';
  if (step.deep) {
    html += '<details class="disc"><summary>Go deeper</summary><div class="body">' + step.deep + '</div></details>';
  }
  if (step.code) {
    html += '<details class="disc"><summary>See the code</summary><pre class="code">' + step.code + '</pre><div class="codecap">' + step.cap + '</div></details>';
  }
  walkCard.innerHTML = html;

  const dots = dotsRow.children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = i < wi ? 'done' : (i === wi ? 'on' : '');
  }
  if (arcRow) {
    const arcSteps = arcRow.children;
    for (let i = 0; i < arcSteps.length; i++) {
      arcSteps[i].className = 'arc-step' + (i < wi ? ' done' : (i === wi ? ' on' : ''));
    }
  }
  counterEl.textContent = (wi + 1) + ' of ' + steps.length;
  prevBtn.disabled = wi === 0;
  nextBtn.disabled = wi === steps.length - 1;
}

prevBtn.onclick = function () { if (wi > 0) { wi--; renderW(); } };
nextBtn.onclick = function () { if (wi < steps.length - 1) { wi++; renderW(); } };
renderW();
