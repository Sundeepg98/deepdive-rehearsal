(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ RED FLAGS (web component) ============
   Multi-topic pane on the TopicPane contract. The base owns shadow + adopted
   sheets + <style> + skeleton (built ONCE in connectedCallback); renderTopic
   paints the lead and the flag list from data on first paint AND every topic
   switch, writing child mounts only. Static presentational, non-interactive:
   no state, no listeners, no timers, no public API. Every color is an existing
   theme token, so the pane themes correctly across the shadow boundary with no
   extra tokens. */
var RF_STYLE = `
.rflead{font-size:15px;line-height:1.5;color:var(--ink);margin:var(--space-2) var(--space-2) var(--space-18)}
.rflead b{color:var(--accink);font-weight:700}
.rf{background:linear-gradient(135deg,var(--surf) 0%,rgba(239,68,68,.03) 100%);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-radius:14px;padding:var(--space-15) var(--space-18);margin-bottom:var(--space-13);border-left:3px solid var(--red);transition:box-shadow .25s ease,transform .2s ease,border-color .2s ease}
.rf:hover{box-shadow:var(--surf-sh),0 4px 18px -6px rgba(239,68,68,.1);transform:translateY(-1px);border-color:rgba(239,68,68,.2)}
.rf-bad{display:flex;gap:var(--space-10);align-items:flex-start;font-size:13.5px;line-height:1.5}
.rf-x{flex:none;color:var(--red);font:800 14px -apple-system,sans-serif;line-height:1.55;width:var(--space-24);height:var(--space-24);border-radius:50%;background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.1) 100%);display:flex;align-items:center;justify-content:center;border:1.5px solid var(--red)}
.rf-bad .rf-t b{color:var(--red);font-weight:700}
.rf-note{color:var(--mut2);font-weight:600;font-style:italic;font-size:11.5px}
.rf-tell{font-size:12.5px;color:var(--mut);line-height:1.55;margin:var(--space-9) 0 var(--space-11);padding-left:var(--space-24)}
.rf-tell b{color:var(--ink);font-weight:700}
.rf-tell i{color:var(--amber);font-style:italic;font-weight:600}
.rf-fix{display:flex;gap:var(--space-10);align-items:flex-start;font-size:12.8px;line-height:1.55;padding-top:var(--space-11);border-top:1px dashed var(--bd)}
.rf-c{flex:none;color:var(--teal);font-weight:800;line-height:1.5;font-size:14px}
.rf-fix .rf-t{color:var(--ink)}
.rf-fix .rf-t b{color:var(--teal);font-weight:700}
`;

/* Reproduces the baked .rf card markup byte-for-byte from a flag record. The
   invariant chrome -- the x chip (&#10007;), the arrow (&rarr;), and the .rf-*
   wrappers -- lives HERE, not in data. The note guard keeps the LEADING space
   that separated the <b> quote from the optional .rf-note in the baked markup
   (only flag #9 carries a note). */
function rfCard(f) {
  return '<div class="rf">'
    + '<div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>' + f.bad + '</b>'
      + (f.note ? ' <span class="rf-note">' + f.note + '</span>' : '') + '</span></div>'
    + '<div class="rf-tell">' + f.tell + '</div>'
    + '<div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">' + f.fix + '</span></div>'
    + '</div>';
}

class DeepRedFlags extends TopicPane {
  static dataKey = 'rf';
  sheets()    { return [BASE_SHEET]; }
  styleText() { return RF_STYLE; }
  skeleton()  { return '<div class="rflead" id="rflead"></div><div id="rflist"></div>'; }
  init(root) {
    this._lead = root.getElementById('rflead');
    this._list = root.getElementById('rflist');
  }
  renderTopic(d) {
    this._lead.innerHTML = d.lead;
    this._list.innerHTML = d.flags.map(rfCard).join('');
  }
}
customElements.define('deep-red-flags', DeepRedFlags);
})();
