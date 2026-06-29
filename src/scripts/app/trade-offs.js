/* ============ TRADE-OFFS (web component) ============
   A static ledger of design decisions, each with the axis that picks a side.
   Phase 1: converted to the TopicPane contract -- the formerly baked .ledger is now
   data (topics/content-pipeline/trade.js) rendered into child mounts, and
   getDecisions() serves mixed-fire from that data instead of reverse-scraping the
   shadow. The .opt trade-option family is shared with mixed-fire (OPT_SHEET);
   .dec/.dec-q/.dec-tell are pane-exclusive (TRADE_STYLE). Offline-safe. */
var TRADE_STYLE = `
.ledger .lead{font-size:15px;line-height:1.5;color:var(--ink);margin:2px 2px 16px}
.ledger .lead b{color:var(--accink)}
.dec{background:linear-gradient(135deg,var(--surf) 0%,rgba(83,74,183,.02) 100%);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-radius:14px;padding:17px 19px;margin-bottom:14px;border-top:3px solid var(--acc);position:relative;overflow:hidden;transition:box-shadow .25s ease,transform .2s ease,border-color .2s ease}
.dec:hover{box-shadow:var(--surf-sh),0 6px 24px -8px rgba(83,74,183,.12);transform:translateY(-1px);border-color:rgba(83,74,183,.15)}
.dec::after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,.12) 50%,transparent 60%);background-size:200% 200%;animation:shineSweep 5s ease-in-out infinite;pointer-events:none}
@keyframes shineSweep{0%{background-position:200% 200%}100%{background-position:-200% -200%}}
.dec-q{font-size:14.5px;font-weight:800;color:var(--ink);letter-spacing:-.2px;margin-bottom:10px;line-height:1.4}
.dec-q .vs{color:var(--mut2);font-weight:700;font-size:11.5px;padding:0 4px}
.dec-tell{margin-top:14px;padding-top:12px;border-top:1px dashed var(--bd);font-size:12px;color:var(--teal);font-weight:700;line-height:1.55}
.dec-tell::before{content:"\\2605";font-size:12px;margin-right:8px}
.dec-tell b{color:var(--dec-tell-b-fg);font-weight:700}
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
