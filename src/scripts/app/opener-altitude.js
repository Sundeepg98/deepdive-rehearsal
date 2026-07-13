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
.op-lead{font-size:var(--font-size-body);line-height:var(--line-height-loose);color:var(--ink);margin:var(--space-2) 0 var(--space-18)}
.op-lead i{color:var(--accink);font-style:italic;font-weight:var(--font-weight-semibold)}
.op{border:1.5px solid var(--bd);border-radius:13px;padding:var(--space-15) var(--space-17);margin-bottom:var(--space-13);background:linear-gradient(135deg,var(--surf) 0%,var(--acc-a02) 100%);box-shadow:var(--surf-sh);transition:box-shadow var(--duration-moderate) var(--ease-base),transform var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.op:hover{box-shadow:var(--surf-sh),0 6px 20px -8px var(--acc-a10);transform:translateY(-1px);border-color:var(--acc-a15)}
.op-h{display:flex;gap:var(--space-12);align-items:flex-start}
.op-n{flex:none;width:var(--space-27);height:var(--space-27);border-radius:50%;background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a06) 100%);border:1.5px solid var(--acc);color:var(--accink);font:var(--font-weight-heavy) 12px ui-monospace,monospace;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px -2px var(--acc-a15)}
.op-ht{font-size:var(--font-size-small);color:var(--ink);line-height:var(--line-height-loose);padding-top:var(--space-3)}
.op-ht b{color:var(--accink);font-weight:var(--font-weight-bold)}
.op-ht i{color:var(--mut);font-style:italic}
.op-a{display:none;margin:var(--space-12) 0 0 var(--space-39);padding:var(--space-14) var(--space-17);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);border-radius:10px;font-size:var(--font-size-small);color:var(--ink);line-height:var(--line-height-spacious);box-shadow:0 1px 6px -2px var(--acc-a08)}
.op-a.show{display:block;animation:pop var(--duration-moderate) var(--ease-base)}
.op-a b{color:var(--accink);font-weight:var(--font-weight-bold)}
.op-rev{margin:var(--space-12) 0 0 var(--space-39);font:var(--font-weight-bold) 11.5px -apple-system,sans-serif;padding:var(--space-7) var(--space-15);border-radius:8px;border:1.5px solid #cfc7f0;background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);color:var(--accink);cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base),border-color var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base)}
.op-rev:hover{background:linear-gradient(135deg,var(--acc) 0%,var(--acc2) 100%);color:var(--on-slab);border-color:var(--acc);box-shadow:0 4px 12px -3px var(--acc-a20);transform:translateY(-1px)}
.op-rev:active{transform:translateY(1px) scale(.98)}
.op-rev:disabled{opacity:.5;cursor:default;transform:none}
.op-hooks{margin-top:var(--space-18);padding:var(--space-15) var(--space-17);background:linear-gradient(135deg,var(--op-hooks-bg) 0%,var(--acc-a02) 100%);border:1px solid var(--bd);border-radius:13px}
.op-hk-t{font-size:var(--font-size-small);color:var(--mut);line-height:var(--line-height-airy);margin-bottom:var(--space-8)}
.op-hk-t i{color:var(--accink);font-style:italic}
.op-hk{margin-top:var(--space-14);padding:var(--space-10) var(--space-12);background:var(--acc-a02);border-radius:8px;border-left:2px solid var(--acc);transition:background var(--duration-base) var(--ease-base),padding var(--duration-base) var(--ease-base)}
.op-hk:hover{padding-left:var(--space-14);background:var(--acc-a04)}
.op-q{font-size:var(--font-size-caption);color:var(--teal);font-weight:var(--font-weight-bold);font-style:italic}
.op-d{font-size:var(--font-size-caption);color:var(--ink);line-height:var(--line-height-airy);margin-top:var(--space-4)}
.op-arr{color:var(--mut2);font-weight:var(--font-weight-heavy);margin-right:var(--space-5)}
.op-tab{display:inline-block;margin-left:var(--space-6);font-size:var(--font-size-micro);font-weight:var(--font-weight-bold);color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);border-radius:5px;padding:var(--space-2) var(--space-8);white-space:nowrap;border:1px solid #cfc7f0}
.op-foot{margin-top:var(--space-18);font-size:var(--font-size-caption);color:var(--op-foot-fg);background:linear-gradient(135deg,var(--op-foot-bg) 0%,var(--acc-a03) 100%);border-left:3px solid var(--acc);border-radius:9px;padding:var(--space-14) var(--space-17);line-height:var(--line-height-spacious)}
.op-foot b{color:var(--accink);font-weight:var(--font-weight-bold)}
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
