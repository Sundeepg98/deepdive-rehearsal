(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ OPENER / ALTITUDE (web component) ============
   The #open pane, converted to the TopicPane contract (dataKey 'open'): the base
   class attaches the shadow + adopts BASE_SHEET + writes <style>+skeleton ONCE in
   connectedCallback; init() caches the stable #opbody mount and wires ONE DELEGATED
   .op-rev click listener on it; renderTopic(d) paints the cards from data
   (TOPIC_CP_OPEN via the registry) on first paint AND every topic switch. Each
   opener card has a hidden answer (.op-a) revealed by its .op-rev button (show +
   disable + relabel 'Revealed'); the listener lives on the stable #opbody parent so
   it survives the per-render rebuild, and reveal/disabled auto-resets on a switch
   (no teardownTopic). renderOpenCard emits via innerHTML (NEVER textContent) so the
   HTML entities resolve to glyphs -- entity_leak.cjs descends the shadow. OP_STYLE
   keeps its three html[data-theme=dark] flip tokens (--op-hooks-bg / --op-foot-bg /
   --op-foot-fg) -- ancestor selectors cannot reach into a shadow -- and the .op-rev
   border (#cfc7f0, no dark override) stays hardcoded, matching the original. */
var OP_STYLE = `
.op-lead{font-size:15px;line-height:1.5;color:var(--ink);margin:var(--space-2) 0 var(--space-18)}
.op-lead i{color:var(--accink);font-style:italic;font-weight:600}
.op{border:1.5px solid var(--bd);border-radius:13px;padding:var(--space-15) var(--space-17);margin-bottom:var(--space-13);background:linear-gradient(135deg,var(--surf) 0%,rgba(83,74,183,.02) 100%);box-shadow:var(--surf-sh);transition:box-shadow .25s ease,transform .2s ease,border-color .2s ease}
.op:hover{box-shadow:var(--surf-sh),0 6px 20px -8px rgba(83,74,183,.1);transform:translateY(-1px);border-color:rgba(83,74,183,.15)}
.op-h{display:flex;gap:var(--space-12);align-items:flex-start}
.op-n{flex:none;width:var(--space-27);height:var(--space-27);border-radius:50%;background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.06) 100%);border:1.5px solid var(--acc);color:var(--accink);font:800 12px ui-monospace,monospace;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px -2px rgba(83,74,183,.15)}
.op-ht{font-size:13px;color:var(--ink);line-height:1.5;padding-top:var(--space-3)}
.op-ht b{color:var(--accink);font-weight:700}
.op-ht i{color:var(--mut);font-style:italic}
.op-a{display:none;margin:var(--space-12) 0 0 var(--space-39);padding:var(--space-14) var(--space-17);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:10px;font-size:13px;color:var(--ink);line-height:1.62;box-shadow:0 1px 6px -2px rgba(83,74,183,.08)}
.op-a.show{display:block;animation:pop .24s ease}
.op-a b{color:var(--accink);font-weight:700}
.op-rev{margin:var(--space-12) 0 0 var(--space-39);font:700 11.5px -apple-system,sans-serif;padding:var(--space-7) var(--space-15);border-radius:8px;border:1.5px solid #cfc7f0;background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);color:var(--accink);cursor:pointer;transition:transform .12s ease,background .15s ease,border-color .15s ease,box-shadow .2s ease}
.op-rev:hover{background:linear-gradient(135deg,var(--acc) 0%,var(--acc2) 100%);color:#fff;border-color:var(--acc);box-shadow:0 4px 12px -3px rgba(83,74,183,.2);transform:translateY(-1px)}
.op-rev:active{transform:translateY(1px) scale(.98)}
.op-rev:disabled{opacity:.5;cursor:default;transform:none}
.op-hooks{margin-top:var(--space-18);padding:var(--space-15) var(--space-17);background:linear-gradient(135deg,var(--op-hooks-bg) 0%,rgba(83,74,183,.02) 100%);border:1px solid var(--bd);border-radius:13px}
.op-hk-t{font-size:12.7px;color:var(--mut);line-height:1.55;margin-bottom:var(--space-8)}
.op-hk-t i{color:var(--accink);font-style:italic}
.op-hk{margin-top:var(--space-14);padding:var(--space-10) var(--space-12);background:rgba(83,74,183,.02);border-radius:8px;border-left:2px solid var(--acc);transition:background .2s ease,padding .2s ease}
.op-hk:hover{padding-left:var(--space-14);background:rgba(83,74,183,.04)}
.op-q{font-size:12.5px;color:var(--teal);font-weight:700;font-style:italic}
.op-d{font-size:12.5px;color:var(--ink);line-height:1.55;margin-top:var(--space-4)}
.op-arr{color:var(--mut2);font-weight:800;margin-right:var(--space-5)}
.op-tab{display:inline-block;margin-left:var(--space-6);font-size:10.5px;font-weight:700;color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:5px;padding:var(--space-2) var(--space-8);white-space:nowrap;border:1px solid #cfc7f0}
.op-foot{margin-top:var(--space-18);font-size:12.5px;color:var(--op-foot-fg);background:linear-gradient(135deg,var(--op-foot-bg) 0%,rgba(83,74,183,.03) 100%);border-left:3px solid var(--acc);border-radius:9px;padding:var(--space-14) var(--space-17);line-height:1.6}
.op-foot b{color:var(--accink);font-weight:700}
.op-foot i{font-style:italic;color:var(--mut)}
`;
/* Module-level renderer: emits ONE .card -- step-k/step-t/op-lead, THEN its reveal
   items, THEN the .op-hooks block (only when c.hooks), THEN the foot -- reproducing
   the old OP_HTML. The 'Reveal mine' label, the &rarr; arrow span and the
   .op-arr / .op-tab wrappers are STATIC here, not data. Consumed as innerHTML only. */
function renderOpenCard(c) {
  var items = c.items.map(function (it) {
    return '<div class="op">'
      + '<div class="op-h"><span class="op-n">' + it.n + '</span><span class="op-ht">' + it.ht + '</span></div>'
      + '<div class="op-a">' + it.a + '</div>'
      + '<button class="op-rev" type="button">Reveal mine</button>'
      + '</div>';
  }).join('');
  var hooks = c.hooks
    ? '<div class="op-hooks"><div class="op-hk-t">' + c.hooks.lead + '</div>'
        + c.hooks.items.map(function (hk) {
            return '<div class="op-hk"><div class="op-q">' + hk.q + '</div>'
              + '<div class="op-d"><span class="op-arr">&rarr;</span>' + hk.d
              + '<span class="op-tab">' + hk.tab + '</span></div></div>';
          }).join('')
        + '</div>'
    : '';
  return '<div class="card">'
    + '<div class="step-k">' + c.k + '</div>'
    + '<div class="step-t">' + c.t + '</div>'
    + '<div class="op-lead">' + c.lead + '</div>'
    + items
    + hooks
    + '<div class="op-foot">' + c.foot + '</div>'
    + '</div>';
}
class DeepOpener extends TopicPane {
  static dataKey = 'open';
  sheets() { return [BASE_SHEET]; }
  styleText() { return OP_STYLE; }
  skeleton() { return '<div id="opbody"></div>'; }
  init(root) {
    this._body = root.getElementById('opbody');
    /* ONE delegated reveal listener on the stable mount (the per-item .op nodes are
       rebuilt by renderTopic, so the listener must live on the stable parent).
       Reproduces the old per-button behavior: show the answer, disable, relabel. */
    this._body.addEventListener('click', function (e) {
      var btn = e.target.closest('.op-rev');
      if (!btn || btn.disabled) return;
      var answer = btn.closest('.op').querySelector('.op-a');
      if (answer) answer.classList.add('show');
      btn.disabled = true;
      btn.textContent = 'Revealed';
    });
  }
  renderTopic(d) {
    this._body.innerHTML = d.cards.map(renderOpenCard).join('');
  }
}
customElements.define('deep-opener', DeepOpener);
})();
