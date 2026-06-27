/* ============ MODEL ANSWERS (logic, web component) ============
   The #model pane: a selector strip (.msel) and a #modelBody card that
   renderModel() fills from the global modelAnswers data (defined in answers.js,
   included just before this file). Encapsulated in a shadow root adopting
   BASE_SHEET; the render + selector handlers query the shadow. The base .mbeat row
   rules are shared with the walkthrough, so they live once in MBEAT_SHEET
   (shared-sheets.js), adopted here alongside BASE_SHEET; the .mbeat-l / .mbeat-t
   variants stay pane-local. All colors are existing theme tokens. */
var MODEL_STYLE = `
.msel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:16px}
.msel button{flex:1 1 auto;min-width:150px;border:1.5px solid var(--bd);background:linear-gradient(135deg,var(--card) 0%,rgba(83,74,183,.015) 100%);color:var(--mut);font:700 12px -apple-system,sans-serif;padding:10px 12px;border-radius:10px;cursor:pointer;transition:transform .15s ease,border-color .2s ease,color .2s ease,box-shadow .2s ease,background .2s ease}
.msel button:hover{border-color:var(--acc2);color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);transform:translateY(-1px);box-shadow:0 4px 12px -4px rgba(83,74,183,.1)}
.msel button:active{transform:translateY(0) scale(.98)}
.msel button.on{background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.06) 100%);border-color:var(--acc);color:var(--accink);box-shadow:0 2px 8px -2px rgba(83,74,183,.18);font-weight:780}
@media(max-width:560px){.msel{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mscript-h{font-size:17px;font-weight:800;color:var(--ink);letter-spacing:-.3px;margin-bottom:5px}
.mscript-sub{font-size:12.5px;color:var(--mut);line-height:1.55;margin-bottom:8px;padding-bottom:14px;border-bottom:2px solid var(--accbg)}
.mbeat-l{flex:none;width:76px;font:800 9.5px -apple-system,sans-serif;letter-spacing:.4px;text-transform:uppercase;padding-top:4px;line-height:1.35;color:var(--acc)}
.mbeat-t{flex:1;font-size:13px;line-height:1.62;color:var(--ink)}
.mbeat-t b{color:var(--accink);font-weight:700}
`;
var MODEL_HTML = `<div class="msel">
      <button type="button" data-i="0" class="on">Make it reliable</button>
      <button type="button" data-i="1">Make it scale</button>
      <button type="button" data-i="2">Walk a failure</button>
      <button type="button" data-i="3">Defend the design</button>
      <button type="button" data-i="4">Operate it</button>
      <button type="button" data-i="5">Cut scope</button>
      <button type="button" data-i="6">One you built</button>
      <button type="button" data-i="7">Test it</button>
      <button type="button" data-i="8">Name the limits</button>
    </div>
    <div class="card" id="modelBody"></div>`;
class DeepModelAnswers extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, MBEAT_SHEET];
    root.innerHTML = '<style>' + MODEL_STYLE + '</style>' + MODEL_HTML;
    const modelBody = root.querySelector('#modelBody');
    const selectorBtns = root.querySelectorAll('.msel button');
    let currentAnswer = 0;
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
    for (let i = 0; i < selectorBtns.length; i++) {
      selectorBtns[i].onclick = function () {
        currentAnswer = +this.getAttribute('data-i');
        renderModel();
      };
    }
    renderModel();
  }
}
customElements.define('deep-model-answers', DeepModelAnswers);
