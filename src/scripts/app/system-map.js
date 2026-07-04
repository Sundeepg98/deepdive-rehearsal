/* ============ SYSTEM MAP (web component) ============
   The #sys pane, converted to the TopicPane contract (dataKey 'sys'): the base class
   attaches the shadow + adopts BASE_SHEET + writes <style>+skeleton ONCE in
   connectedCallback; init() caches the six child mounts (NO listeners -- the pivots
   are native <details>, zero script); renderTopic(d) paints the intro, the stage
   chain, the pivots, and the three headings from data (TOPIC_CP_SYS via the registry)
   on first paint AND every topic switch. BOTH .map builders (chain dot number i+1 +
   the .cur "you are here" badge; pivots) moved OUT of build-once INTO renderTopic
   because the counts are per-topic. The two .card wrappers and the .chain container
   stay in the skeleton so zoom-diagrams (.chain) and card-spotlight (.card) keep
   matching live via composedPath. SYS_STYLE stays in the pane as styleText(); the
   few hardcoded light/dark colors flip via the inherited --sm-* tokens in styles.css.
   STATELESS -- no timers, no transient state, so no teardownTopic. Offline-safe. */
var SYS_STYLE = `
.card + .card{margin-top:16px}
.sm-intro{font-size:12.5px;color:var(--mut);margin-bottom:18px;line-height:1.6}
.chain{position:relative;padding-left:8px}
.stg{position:relative;display:flex;gap:15px;padding:0 0 20px 0}
.stg:last-child{padding-bottom:0}
.stg .ln{position:absolute;left:14px;top:30px;bottom:-2px;width:2px;background:linear-gradient(180deg,var(--sm-line) 0%,rgba(83,74,183,.15) 50%,var(--sm-line) 100%);border-radius:1px}
.stg:last-child .ln{display:none}
.stg .dot{flex:none;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--sm-dot-bg) 0%,#E8E4DA 100%);border:2px solid #D6D0C5;display:flex;align-items:center;justify-content:center;font:700 11px ui-monospace,monospace;color:var(--mut2);z-index:1;transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s ease,border-color .2s ease}
.stg:hover .dot{transform:scale(1.08);box-shadow:0 0 0 4px rgba(83,74,183,.08)}
.stg .body{padding-top:3px}
.stg .nm{font-size:14px;font-weight:680;transition:color .2s ease}
.stg:hover .nm{color:var(--accink)}
.stg .ds{font-size:12px;color:var(--mut);margin-top:2px}
.stg.cur .dot{background:linear-gradient(135deg,var(--acc),var(--acc2));border-color:var(--acc);color:#fff;box-shadow:0 0 0 5px var(--accbg),0 2px 10px -2px rgba(83,74,183,.3);animation:curPulse 2s ease-in-out infinite}
@keyframes curPulse{0%,100%{box-shadow:0 0 0 5px var(--accbg),0 2px 10px -2px rgba(83,74,183,.3)}50%{box-shadow:0 0 0 8px rgba(83,74,183,.1),0 0 20px -4px rgba(83,74,183,.4)}}
.stg.cur .nm{color:var(--accink);font-weight:700}
.stg.cur .here{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--sm-here-fg);background:linear-gradient(135deg,var(--acc),var(--acc2));border-radius:5px;padding:2px 8px;margin-left:8px;vertical-align:middle;box-shadow:0 2px 6px -2px rgba(83,74,183,.25)}
.piv-k{font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--acc);margin-bottom:4px}
.piv-sub{font-size:12px;color:var(--mut);margin-bottom:16px}
.piv{border:1px solid var(--bd);border-radius:12px;margin-bottom:10px;overflow:hidden;background:linear-gradient(135deg,var(--sm-card-bg) 0%,rgba(83,74,183,.015) 100%);transition:border-color .2s ease,box-shadow .25s ease,transform .2s ease}
.piv:hover{border-color:var(--acc);box-shadow:0 6px 20px -8px rgba(83,74,183,.2);transform:translateY(-1px)}
.piv[open]{border-color:rgba(83,74,183,.2);box-shadow:0 0 0 1px rgba(83,74,183,.06),0 6px 20px -8px rgba(83,74,183,.15)}
.piv summary{list-style:none;cursor:pointer;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;transition:background .18s ease}
.piv summary:hover{background:rgba(109,95,214,.04)}
.piv-jump{margin-top:12px;font:700 12px -apple-system,sans-serif;color:var(--acc);background:var(--accbg);border:1px solid rgba(83,74,183,.2);border-radius:8px;padding:7px 12px;cursor:pointer;transition:background .15s ease,border-color .15s ease}
.piv-jump:hover,.piv-jump:focus{background:var(--acc);color:#fff;border-color:var(--acc);outline:none}
.piv summary::-webkit-details-marker{display:none}
.piv .pq{font-size:13px;font-weight:600;color:var(--ink);line-height:1.4}
.piv .chip{flex:none;font-size:9.5px;font-weight:800;letter-spacing:.3px;color:var(--indigo);background:linear-gradient(135deg,var(--indigobg) 0%,rgba(83,74,183,.04) 100%);border:1px solid #cfc7f0;border-radius:6px;padding:3px 9px;white-space:nowrap;margin-top:1px;margin-left:auto}
.piv .chip.chip-link{cursor:pointer;transition:border-color .15s ease,background .15s ease,color .15s ease}
.piv .chip.chip-link:hover,.piv .chip.chip-link:focus-visible{border-color:var(--acc);color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.06) 100%);outline:none}
.piv .pa{padding:2px 17px 16px 43px;font-size:12px;color:var(--sm-pa-fg);line-height:1.6}
.piv .pa b{color:var(--accink);font-weight:700}
.piv[open] summary .pq::after{content:" \\2014 bridge:";color:var(--mut2);font-weight:700}
`;

/* Module-level renderers (prefixed so they can't clash with other panes converting in
   the same wave). They reproduce the former baked .stg / .piv markup byte-for-byte:
   the chain dot is numbered i+1, the .cur stage gets a " you are here" badge, and the
   pivots are native <details class="piv"> (no script). Consumed as innerHTML only. */
function sysRenderStage(s, i) {
  return '<div class="stg' + (s.cur ? ' cur' : '') + '">' +
    '<div class="ln"></div><div class="dot">' + (i + 1) + '</div>' +
    '<div class="body"><div class="nm">' + s.n +
    (s.cur ? '<span class="here">you are here</span>' : '') + '</div>' +
    '<div class="ds">' + s.d + '</div></div></div>';
}
/* A pivot chip like "-> AWS hardening (4)" cross-refs another topic by its index
   number; resolve it to a registered topic id (never the current one) so the chip
   becomes a one-click jump. Chips with no "(N)" point at not-yet-built topics and
   stay plain text. */
function resolveChipTarget(chipText) {
  if (typeof TopicRegistry === 'undefined' || !TopicRegistry.ids) return null;
  var cur = TopicRegistry.current ? TopicRegistry.current() : null, ids = TopicRegistry.ids(), i, t;
  var self = function (id) { return (cur && id === cur.id) ? null : id; };
  var m = /\((\d+)\)/.exec(chipText);
  if (m) {                                   /* primary: "(N)" -> topic with identity.index === N */
    var idx = parseInt(m[1], 10);
    for (i = 0; i < ids.length; i++) { t = TopicRegistry.get(ids[i]); if (t && t.identity && t.identity.index === idx) return self(ids[i]); }
    return null;                             /* an explicit (N) that doesn't resolve is not a link */
  }
  var lc = chipText.toLowerCase();           /* fallback: a full topic title inside the chip (name-based chips, M1) */
  for (i = 0; i < ids.length; i++) {
    t = TopicRegistry.get(ids[i]);
    var title = (t && t.identity && t.identity.title) ? t.identity.title.toLowerCase() : '';
    if (title.length >= 4 && lc.indexOf(title) > -1) return self(ids[i]);
  }
  return null;
}
function sysRenderPivot(p) {
  var target = resolveChipTarget(p.chip);
  /* Header chip is a plain, non-interactive label (avoids an interactive control
     nested inside the interactive <summary>). The one-click jump is a real <button>
     in the disclosure body, so it's natively keyboard-operable. */
  var headChip = '<span class="chip">' + p.chip + '</span>';
  var jump = target
    ? '<button class="piv-jump" type="button" data-goto="' + target + '">Jump to ' + p.chip.replace(/\s*\(\d+\)\s*/g, ' ').trim() + ' &rarr;</button>'
    : '';
  return '<details class="piv"><summary><span class="pq">' + p.q + '</span>' + headChip + '</summary>' +
    '<div class="pa">' + p.a + jump + '</div></details>';
}

class DeepSystemMap extends TopicPane {
  static dataKey = 'sys';
  sheets()    { return [BASE_SHEET]; }
  styleText() { return SYS_STYLE; }
  /* INVARIANT chrome: the two .card wrappers + the .chain container (kept so zoom /
     spotlight match live via composedPath) with EMPTY mounts (ids prefixed `sm`). */
  skeleton()  {
    return '<div class="card"><div class="step-t" id="smWhere"></div>' +
      '<div class="sm-intro" id="smIntro"></div>' +
      '<div class="chain" id="smChain"></div></div>' +
      '<div class="card"><div class="piv-k" id="smPivK"></div>' +
      '<div class="piv-sub" id="smPivSub"></div>' +
      '<div class="pivs" id="smPivs"></div></div>';
  }
  init(root) {
    this._where  = root.getElementById('smWhere');
    this._intro  = root.getElementById('smIntro');
    this._chain  = root.getElementById('smChain');
    this._pivK   = root.getElementById('smPivK');
    this._pivSub = root.getElementById('smPivSub');
    this._pivs   = root.getElementById('smPivs');
    if (this._pivs && !this._pivs.__linkWired) {
      this._pivs.__linkWired = true;
      var goChip = function (e) {
        var chip = (e.target && e.target.closest) ? e.target.closest('.piv-jump') : null;
        if (!chip) return;
        e.preventDefault(); e.stopPropagation();
        var id = chip.getAttribute('data-goto');
        if (id && typeof TopicRegistry !== 'undefined' && TopicRegistry.setTopic) TopicRegistry.setTopic(id);
      };
      this._pivs.addEventListener('click', goChip);
    }
  }
  renderTopic(d) {
    this._where.innerHTML  = d.heads.whereHead;
    this._intro.innerHTML  = d.intro;
    this._chain.innerHTML  = d.stages.map(sysRenderStage).join('');
    this._pivK.innerHTML   = d.heads.pivHead;
    this._pivSub.innerHTML = d.heads.pivSub;
    this._pivs.innerHTML   = d.pivots.map(sysRenderPivot).join('');
  }
}
customElements.define('deep-system-map', DeepSystemMap);
