(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ MODEL ANSWERS (logic, web component) ============
   The #model pane, converted to the TopicPane contract (dataKey 'model'): the
   base class attaches the shadow + adopts [BASE_SHEET, MBEAT_SHEET] + writes
   <style>+skeleton ONCE in connectedCallback; init() caches the stable #msel and
   #modelBody mounts and wires ONE DELEGATED .msel click listener; renderTopic(d)
   builds the selector strip from d.selectors and fills the body from d.answers
   (TOPIC_CP_MODEL via the registry) on first paint AND every topic switch. The
   selector strip is COUNT-DRIVEN (one button per selector, indexed by data-i), so
   it is rebuilt in renderTopic, not init; selectors[i] selects answers[i]
   (parallel). renderModel() is an instance METHOD (hoisted from the old closure),
   called by both the delegated handler and renderTopic; this._cur replaces the old
   currentAnswer closure. The base .mbeat row rules are shared with the walkthrough,
   so they live once in MBEAT_SHEET (shared-sheets.js), adopted here alongside
   BASE_SHEET; the .mbeat-l / .mbeat-t variants stay pane-local. The l-<c>
   beat-label classes are dead CSS but kept for parity. All colors are existing
   theme tokens. Child-mounts only -- renderTopic never rewrites this._root.innerHTML. */
var MODEL_STYLE = `
.msel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-7);margin-bottom:var(--space-16)}
.msel button{flex:1 1 auto;min-width:var(--space-150);border:1.5px solid var(--bd);background:linear-gradient(135deg,var(--card) 0%,rgba(83,74,183,.015) 100%);color:var(--mut);font:700 12px -apple-system,sans-serif;padding:var(--space-10) var(--space-12);border-radius:10px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),border-color var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base)}
.msel button:hover{border-color:var(--acc2);color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);transform:translateY(-1px);box-shadow:0 4px 12px -4px rgba(83,74,183,.1)}
.msel button:active{transform:translateY(0) scale(.98)}
.msel button.on{background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.08) 100%);border-color:var(--acc);color:var(--accink);box-shadow:0 0 0 1px var(--acc),0 4px 14px -4px rgba(83,74,183,.18);font-weight:var(--font-weight-heavy);position:relative}
.msel button.on::after{content:"";position:absolute;right:var(--space-8);top:50%;transform:translateY(-50%);width:var(--space-6);height:var(--space-6);border-radius:50%;background:var(--acc);box-shadow:0 0 8px rgba(83,74,183,.4);animation:activePulse 2s ease-in-out infinite}
@media(max-width:560px){.msel{grid-template-columns:repeat(2,minmax(0,1fr))}}
.mscript-h{font-size:var(--font-size-subhead);font-weight:var(--font-weight-heavy);color:var(--ink);letter-spacing:-.3px;margin-bottom:var(--space-5)}
.mscript-sub{font-size:var(--font-size-caption);color:var(--mut);line-height:var(--line-height-airy);margin-bottom:var(--space-8);padding-bottom:var(--space-14);border-bottom:2px solid var(--accbg)}
.mbeat-l{flex:none;width:var(--space-76);font:800 9.5px -apple-system,sans-serif;letter-spacing:.4px;text-transform:uppercase;padding-top:var(--space-4);line-height:var(--line-height-snug);color:var(--acc)}
.mbeat-t{flex:1;font-size:var(--font-size-small);line-height:var(--line-height-spacious);color:var(--ink)}
.mbeat-t b{color:var(--accink);font-weight:var(--font-weight-bold)}
`;
class DeepModelAnswers extends TopicPane {
  static dataKey = 'model';
  sheets()    { return [BASE_SHEET, MBEAT_SHEET]; }
  styleText() { return MODEL_STYLE; }
  skeleton()  { return '<div class="msel" id="msel"></div><div class="card" id="modelBody"></div>'; }
  init(root) {
    this._msel = root.getElementById('msel');
    this._modelBody = root.getElementById('modelBody');
    /* ONE delegated selector listener on the stable .msel mount (the per-selector
       buttons are rebuilt by renderTopic, so it must live on the stable parent).
       Reads data-i, sets this._cur, re-renders -- replaces the old per-button loop. */
    var self = this;
    this._msel.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      self._cur = +btn.getAttribute('data-i');
      self.renderModel();
    });
  }
  renderTopic(d) {
    this._answers = d.answers;
    this._cur = 0;
    /* COUNT-DRIVEN selector strip from d.selectors (one button per selector,
       indexed by data-i) -- built here, not init, so a topic with a different
       selector count rebuilds cleanly. */
    this._msel.innerHTML = d.selectors.map(function (label, i) {
      return '<button type="button" data-i="' + i + '">' + label + '</button>';
    }).join('');
    this.renderModel();
  }
  renderModel() {
    var ans = this._answers[this._cur];
    var html = '<div class="mscript-h">' + ans.opener + '</div>' +
               '<div class="mscript-sub">' + ans.sub + '</div>';
    for (var i = 0; i < ans.beats.length; i++) {
      var beat = ans.beats[i];
      html += '<div class="mbeat"><div class="mbeat-l l-' + beat.c + '">' + beat.l +
              '</div><div class="mbeat-t">' + beat.t + '</div></div>';
    }
    this._modelBody.innerHTML = html;
    var btns = this._msel.querySelectorAll('button');
    for (var k = 0; k < btns.length; k++) {
      btns[k].classList.toggle('on', k === this._cur);
    }
  }
}
customElements.define('deep-model-answers', DeepModelAnswers);
})();
