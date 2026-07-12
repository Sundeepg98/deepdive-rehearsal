(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ TRADE-OFFS (web component) ============
   A static ledger of design decisions, each with the axis that picks a side.
   Phase 1: converted to the TopicPane contract -- the formerly baked .ledger is now
   data (topics/content-pipeline/trade.js) rendered into child mounts, and
   getDecisions() serves mixed-fire from that data instead of reverse-scraping the
   shadow. The .opt trade-option family is shared with mixed-fire (OPT_SHEET);
   .dec/.dec-q/.dec-tell are pane-exclusive (TRADE_STYLE). Offline-safe. */
var TRADE_STYLE = `
.ledger .lead{font-size:var(--font-size-body);line-height:var(--line-height-loose);color:var(--ink);margin:var(--space-2) var(--space-2) var(--space-16)}
.ledger .lead b{color:var(--accink)}
.dec{background:linear-gradient(135deg,var(--surf) 0%,var(--acc-a02) 100%);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-radius:14px;padding:var(--space-17) var(--space-19);margin-bottom:var(--space-14);border-top:3px solid var(--acc);position:relative;overflow:hidden;transition:box-shadow var(--duration-moderate) var(--ease-base),transform var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.dec:hover{box-shadow:var(--surf-sh),0 6px 24px -8px var(--acc-a12);transform:translateY(-1px);border-color:var(--acc-a15)}
/* .dec::after shineSweep (5s endless diagonal shine over every decision card) deleted --
   ambient decoration behind dense trade-off text. Consistent with the spec's motion kill. */
.dec-q{font-size:var(--font-size-body);font-weight:var(--font-weight-heavy);color:var(--ink);letter-spacing:-.2px;margin-bottom:var(--space-10);line-height:var(--line-height-normal)}
.dec-q .vs{color:var(--mut2);font-weight:var(--font-weight-bold);font-size:var(--font-size-micro);padding:0 var(--space-4)}
.dec-tell{margin-top:var(--space-14);padding-top:var(--space-12);border-top:1px dashed var(--bd);font-size:var(--font-size-caption);color:var(--teal);font-weight:var(--font-weight-bold);line-height:var(--line-height-airy)}
.dec-tell::before{content:"\\2605";font-size:var(--font-size-caption);margin-right:var(--space-8)}
.dec-tell b{color:var(--dec-tell-b-fg);font-weight:var(--font-weight-bold)}
`;

/* Pane-scoped renderers (prefixed so they can't clash with the rf/open agents
   converting in the same wave). They reproduce the former baked .opt / .dec markup
   byte-for-byte -- the literal "pick when" pill lives here, in the renderer, not data. */
function tradeRenderOpt(o) {
  return '<div class="opt"><span class="opt-n">' + o.n + '</span><div class="opt-w"><span class="pw">pick when</span>' + o.when + '</div></div>';
}
function tradeRenderDec(d) {
  return '<div class="dec"><div class="dec-q">' + d.q + '</div>' + d.opts.map(tradeRenderOpt).join('') + '<div class="dec-tell">' + d.tell + '</div></div>';
}

class DeepTradeOffs extends TopicPane {
  static dataKey = 'trade';
  sheets()    { return [BASE_SHEET, OPT_SHEET]; }
  styleText() { return TRADE_STYLE; }
  skeleton()  { return '<div class="ledger"><div class="lead" id="tlead"></div><div id="tdecs"></div></div>'; }
  init(root) {
    this._lead = root.getElementById('tlead');
    this._decs = root.getElementById('tdecs');
  }
  renderTopic(d) {
    this._decisions = d.decisions;
    this._lead.innerHTML = d.lead;
    this._decs.innerHTML = d.decisions.map(tradeRenderDec).join('');
  }
  /* mixed-fire's getTrades() consumes this -- keep the {q, optsHtml, tell} shape
     (optsHtml = the concatenated .opt markup) so mixed-fire.js stays byte-unchanged.
     Derived from this._decisions; the old shadow reverse-scrape is gone. */
  getDecisions() {
    return (this._decisions || []).map(function (d) {
      return { q: d.q, optsHtml: d.opts.map(tradeRenderOpt).join(''), tell: d.tell };
    });
  }
}
customElements.define('deep-trade-offs', DeepTradeOffs);
})();
