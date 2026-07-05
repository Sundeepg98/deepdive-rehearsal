(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ NUMBERS / NALSD pane (logic, web component) ============
   The back-of-envelope capacity calculator, converted to the TopicPane contract
   (dataKey 'num'): the base class attaches the shadow + adopts the inherited
   [BASE_SHEET] + writes <style>+skeleton ONCE; init() caches the lead/input/output/
   tell mounts and wires ONE DELEGATED input listener on the stable #ninp container;
   renderTopic(d) stashes the per-topic d.inputs + d.compute, fills lead/tell, rebuilds
   the input fields from d.inputs (count is per-topic -> here, not init), then _calc().
   Unlike the array-driven panes this one is PARAMETRIC: _calc reads the inputs
   DYNAMICALLY and defers the arithmetic + the Lambda-1,000 / Postgres-100 ceilings to
   d.compute (the escape hatch, design 3.2), which returns the row array the pane
   renders verbatim. NUM_STYLE is topic-invariant and stays here; _fmtN/_fmtTB/_nval
   are pure helpers, and _fmtN/_fmtTB are passed into compute as fmt.n/fmt.tb. The
   tab / rail / keyboard nav that used to share this file lives in shell.js
   (foundation). Child-mounts only -- renderTopic never rewrites this._root.innerHTML.
   Per-topic input tweaks persist via local Store (key num.<topic>); a Reset to
   canonical button restores the reference scenario. Offline-safe: no network/permission. */
var NUM_STYLE = `.numlead{font-size:15px;line-height:1.5;color:var(--ink);margin:2px 2px 18px}
.numlead b{color:var(--accink);font-weight:700}
.num-h{font:800 10px -apple-system,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mut2);margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.num-reset{font:600 10px -apple-system,sans-serif;color:var(--mut);background:transparent;border:1px solid var(--bd);border-radius:6px;padding:3px 9px;cursor:pointer;text-transform:none;letter-spacing:.2px;transition:color .15s ease,border-color .15s ease}
.num-reset:hover{color:var(--acc);border-color:var(--acc)}
.ninp{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ninp label{display:flex;flex-direction:column;gap:6px;font:700 11px -apple-system,sans-serif;color:var(--mut);letter-spacing:.2px}
.ninp input{font:700 15px ui-monospace,Menlo,monospace;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border:1.5px solid var(--ninp-bd);border-radius:9px;padding:10px 12px;width:100%;-moz-appearance:textfield;transition:border-color .2s ease,box-shadow .2s ease,transform .15s ease}
.ninp input::-webkit-outer-spin-button,.ninp input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.ninp input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px rgba(83,74,183,.12),0 2px 8px -2px rgba(83,74,183,.1);transform:translateY(-1px)}
.ninp input:hover:not(:focus){border-color:rgba(83,74,183,.3)}
.nrow{display:grid;grid-template-columns:1fr auto;grid-template-areas:"k v" "n n";gap:3px 12px;padding:12px 0;border-bottom:1px solid var(--bd);transition:padding .2s ease}
.nrow:last-child{border-bottom:0}
.nrow:hover{padding-left:4px}
.nrow-k{grid-area:k;font-size:13px;font-weight:700;color:var(--ink);align-self:center}
.nrow-v{grid-area:v;font:800 17px ui-monospace,Menlo,monospace;color:var(--acc);align-self:center;white-space:nowrap;transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
.nrow:hover .nrow-v{transform:scale(1.05)}
.nrow-n{grid-area:n;font-size:11.5px;color:var(--mut2);line-height:1.45}
.nrow.over .nrow-v{color:var(--red);text-shadow:0 0 20px rgba(239,68,68,.1)}
.nrow.over .nrow-n{color:var(--red);font-weight:600}
.nrow.over{background:linear-gradient(90deg,transparent 0%,rgba(239,68,68,.02) 100%)}
.num-tell{margin-top:15px;font-size:12px;color:var(--teal);font-weight:700;line-height:1.55;padding:14px 17px;background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);border-radius:11px;box-shadow:0 1px 6px -2px rgba(10,133,100,.08)}
.nprog{height:5px;background:var(--dbar-bg);border-radius:5px;overflow:hidden;margin:12px 0}
.nprog i{display:block;height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:5px;transition:width .5s cubic-bezier(.22,.61,.36,1)}
.num-tell b{color:var(--dec-tell-b-fg);font-weight:700}
.nv-u{display:inline-block;width:30px;text-align:left;padding-left:8px;box-sizing:border-box;font-size:13px;font-weight:600;color:var(--mut)}`;
class DeepNumbers extends TopicPane {
  static dataKey = 'num';
  styleText() { return NUM_STYLE; }
  skeleton() {
    return `<div class="numlead" id="nlead"></div>
    <div class="card">
      <div class="num-h">Assumptions <button type="button" class="num-reset" id="nreset" hidden>Reset to canonical</button></div>
      <div class="ninp" id="ninp"></div>
    </div>
    <div class="card" style="margin-top:13px">
      <div class="num-h">What falls out</div>
      <div id="nout"></div>
    </div>
    <div class="num-tell" id="ntell"></div>`;
  }
  init(root) {
    this._lead = root.getElementById('nlead');
    this._ninp = root.getElementById('ninp');
    this._out = root.getElementById('nout');
    this._tell = root.getElementById('ntell');
    /* ONE delegated input listener on the stable #ninp container -- the per-topic
       fields are rebuilt by renderTopic, so the listener must live on the stable parent. */
    this._reset = root.getElementById('nreset');
    var self = this;
    this._ninp.addEventListener('input', function () { self._calc(); self._saveCurrent(); self._syncResetBtn(); });
    if (this._reset) this._reset.addEventListener('click', function () { self._resetToCanonical(); });
  }
  renderTopic(d) {
    this._inputs = d.inputs;
    this._compute = d.compute;
    this._topicId = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null;
    this._lead.innerHTML = d.lead;
    this._tell.innerHTML = d.tell;
    /* COUNT-DRIVEN input fields from d.inputs, seeded from any saved per-topic tweaks
       (else the canonical f.value), rebuilt here so a topic with a different assumption
       count rebuilds cleanly. */
    this._buildInputs(false);
  }
  _numKey() { return this._topicId ? ('num.' + this._topicId) : null; }
  _loadSaved() { var k = this._numKey(); if (!k || typeof Store === 'undefined' || !Store.get) return null; return Store.get(k, null); }
  _saveCurrent() {
    var k = this._numKey(); if (!k || typeof Store === 'undefined' || !Store.set || !this._inputs) return;
    var m = {}, canon = true;
    for (var i = 0; i < this._inputs.length; i++) { var f = this._inputs[i], el = this._root.getElementById(f.id); if (el) { m[f.id] = el.value; if (String(el.value) !== String(f.value)) canon = false; } }
    if (canon) { if (Store.remove) Store.remove(k); } else { Store.set(k, m); }
  }
  _clearSaved() { var k = this._numKey(); if (k && typeof Store !== 'undefined' && Store.remove) Store.remove(k); }
  _buildInputs(useCanonical) {
    var saved = useCanonical ? null : this._loadSaved(), html = '';
    for (var i = 0; i < this._inputs.length; i++) {
      var f = this._inputs[i], v = (saved && saved[f.id] != null) ? saved[f.id] : f.value;
      html += '<label>' + f.label + '<input id="' + f.id + '" type="number" value="' + v + '" min="' + f.min + '"' + (f.step != null ? ' step="' + f.step + '"' : '') + '></label>';
    }
    this._ninp.innerHTML = html;
    this._syncResetBtn();
    this._calc();
  }
  _syncResetBtn() { if (!this._reset) return; var sv = this._loadSaved(); this._reset.hidden = !(sv && Object.keys(sv).length > 0); }
  _resetToCanonical() { this._clearSaved(); this._buildInputs(true); }
  _fmtN(x) { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); }
  _fmtTB(tb) {
    if (!isFinite(tb)) tb = 0;
    if (tb >= 1000) return (tb / 1000).toFixed(tb >= 10000 ? 0 : 1) + ' PB';
    if (tb >= 10) return tb.toFixed(0) + ' TB';
    return tb.toFixed(2) + ' TB';
  }
  _nval(id) { const v = +this._root.getElementById(id).value; return isFinite(v) && v > 0 ? v : 0; }
  _calc() {
    /* Read the inputs DYNAMICALLY (iterate the per-topic this._inputs), defer the
       arithmetic + ceilings to this._compute, then render the returned rows verbatim. */
    var vals = {};
    for (var i = 0; i < this._inputs.length; i++) { var id = this._inputs[i].id; vals[id] = this._nval(id); }
    var rows = this._compute(vals, { n: this._fmtN, tb: this._fmtTB });
    var html = '';
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      html += '<div class="nrow' + (row.over ? ' over' : '') + '"><div class="nrow-k">' + row.k + '</div><div class="nrow-v">' + row.v + '<span class="nv-u">' + (row.u || '') + '</span></div><div class="nrow-n">' + row.n + '</div></div>';
    }
    this._out.innerHTML = html;
  }
}
customElements.define('deep-numbers', DeepNumbers);
})();
