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
.ledger .lead{font-size:var(--font-size-body);max-width:var(--measure);line-height:var(--line-height-loose);color:var(--ink);margin:var(--space-2) var(--space-2) var(--space-16)}
.ledger .lead b{color:var(--accink)}
.dec{background:linear-gradient(135deg,var(--surf) 0%,var(--acc-a02) 100%);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-radius:14px;padding:var(--space-17) var(--space-19);margin-bottom:var(--space-14);border-top:3px solid var(--acc);position:relative;overflow:hidden;transition:box-shadow var(--duration-moderate) var(--ease-base),transform var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.dec:hover{box-shadow:var(--surf-sh),0 6px 24px -8px var(--acc-a12);transform:translateY(-1px);border-color:var(--acc-a15)}
/* PERF (d3-first-visit, audit #8): the Trade-offs pane is the heaviest first-visit reveal in the
   audit's P2 set (217ms @4x). ATTRIBUTION (trace self-time, this branch's _perf/ instrument): that
   cost is the LAYOUT of this pane's shadow subtree the instant .pane.on flips display:none->block --
   NOT script (all JS was ~4ms). The decision cards below the fold don't need to lay out until the
   user scrolls to them, so content-visibility:auto skips their layout on the FIRST reveal. Measured
   matched-load A/B (base build vs this): ~-250ms input->paint on this pane, and ZERO pixels move --
   the skipped cards sit below the 800px VR fold, so the at-rest capture is byte-identical (verified).
   contain-intrinsic-size reserves each card's height so the scrollbar/scroll position stay stable
   (`auto` then remembers the real size after first render). @media print forces full render so a
   printout is never missing a below-fold decision. This does NOT touch the drill reveal region, home,
   or search (product wave's), nor the six-rooms retint (the topic-open cost, left as-is). */
.dec{content-visibility:auto;contain-intrinsic-size:auto 300px}
@media print{.dec{content-visibility:visible}}
/* .dec::after shineSweep (5s endless diagonal shine over every decision card) deleted --
   ambient decoration behind dense trade-off text. Consistent with the spec's motion kill. */
.dec-q{font-size:var(--font-size-body);font-weight:var(--font-weight-heavy);color:var(--ink);letter-spacing:-.2px;margin-bottom:var(--space-10);line-height:var(--line-height-normal)}
.dec-q .vs{color:var(--mut2);font-weight:var(--font-weight-bold);font-size:var(--font-size-micro);padding:0 var(--space-4)}
.dec-tell{margin-top:var(--space-14);padding-top:var(--space-12);border-top:1px dashed var(--bd);font-size:var(--font-size-body);max-width:var(--measure);color:var(--teal);font-weight:var(--font-weight-bold);line-height:var(--line-height-airy)}
.dec-tell::before{content:"\\2605";font-size:var(--font-size-body);margin-right:var(--space-8)}
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
     PERF (perf/chunk-proto): read the CURRENT topic's decisions from the registry, NOT
     this._decisions -- which only renderTopic() assigns, so a hidden pane DEFERRED by
     TopicPaneQueue would serve the PREVIOUS topic's decisions until the drain (~300ms).
     openMix() calls this while #trade is hidden; the cold lane reproduced it user-reachable
     (topic change -> open Mixed Fire within ~90-280ms -> mix items from the old topic).
     THE RULE (contrast the whiteboard, which is eager): make a hidden pane eager only when the
     cross-component read is LIVE state that render+interaction accrue (board grading counts --
     underivable); when it is PURE topic data the registry already owns -- these decisions --
     read it at the source and keep the pane's render deferrable. this._decisions stays as the
     fallback for a host with no registry (a bare probe). */
  getDecisions() {
    var t = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null;
    var src = (t && t.data && t.data.trade && t.data.trade.decisions) || this._decisions || [];
    return src.map(function (d) {
      return { q: d.q, optsHtml: d.opts.map(tradeRenderOpt).join(''), tell: d.tell };
    });
  }
}
customElements.define('deep-trade-offs', DeepTradeOffs);
})();
