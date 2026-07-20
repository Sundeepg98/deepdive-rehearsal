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
var NUM_STYLE = `.numlead{font-size:var(--font-size-body);max-width:var(--measure);line-height:var(--line-height-loose);color:var(--ink);margin:var(--space-2) var(--space-2) var(--space-18)}
.numlead b{color:var(--accink);font-weight:var(--font-weight-bold)}
.num-h{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mut2);margin-bottom:var(--space-12);display:flex;align-items:center;justify-content:space-between;gap:var(--space-10)}
.num-reset{font:var(--font-weight-semibold) 10px -apple-system,sans-serif;color:var(--mut);background:transparent;border:1px solid var(--bd);border-radius:6px;padding:var(--space-3) var(--space-9);cursor:pointer;text-transform:none;letter-spacing:.2px;transition:color var(--duration-fast) var(--ease-base),border-color var(--duration-fast) var(--ease-base)}
.num-reset:hover{color:var(--acc);border-color:var(--acc)}
.ninp{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-12)}
.ninp label{display:flex;flex-direction:column;gap:var(--space-6);font:var(--font-weight-bold) 11px -apple-system,sans-serif;color:var(--mut);letter-spacing:.2px}
.ninp input{font:var(--font-weight-bold) 15px ui-monospace,Menlo,monospace;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);border:1.5px solid var(--ninp-bd);border-radius:9px;padding:var(--space-10) var(--space-12);width:100%;-moz-appearance:textfield;transition:border-color var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),transform var(--duration-fast) var(--ease-base)}
.ninp input::-webkit-outer-spin-button,.ninp input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.ninp input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px var(--acc-a12),0 2px 8px -2px var(--acc-a10);transform:translateY(-1px)}
.ninp input:hover:not(:focus){border-color:var(--acc-a30)}
/* ===================== A CELL THAT CANNOT HOLD ITS OWN CONTENT (WCAG 1.4.10) =====================
   THE MEASUREMENT FIRST. 46 topics x 5 widths, measured INSIDE the shadow root (render.cjs names
   offenders with querySelectorAll('body *'), which does not enter a shadow root, so even when it
   fires it cannot say what overflowed): 44 of 46 topics overflow here, and -- this is the part the
   earlier passes missed -- THEY OVERFLOW AT EVERY WIDTH FROM 320px TO 1920px. 171px, unchanged.

   It was reported as a narrow-viewport bug ("38/46 at 320-768px, 0/46 at >=1280px") because what
   was being measured was DOCUMENT overflow -- and above 1280px the stage finally has enough margin
   to ABSORB the spill without widening the page. The horizontal scrollbar goes away; the text is
   still outside its box. Symptom, not defect.

   THE DEFECT, from the worst row (retries-timeouts, "Retry amplification"):
       .nv-u is a FIXED 30px unit gutter -- sized for "ms", "GB", "req/s" -- and this topic's unit
       is the phrase "worst-case load on the leaf". 201px of text in a 30px box.
       .nrow-v is white-space:nowrap, so none of it can wrap: 229px of content in a 58px cell.
       Grid items default to min-width:AUTO (= min-content), so the row cannot shrink either: the
       key alone claims 172px of a 244px row.
   Three independent things all had to be true, and all three were.

   NO BREAKPOINT CAN FIX THIS, and reaching for one would have been the shadow-boundary mistake in
   another costume -- measuring with an instrument that cannot see the thing. A media query reads
   the VIEWPORT, and this container's width is NOT monotonic in the viewport: #nout is 824px at a
   900px viewport, 600px at 1024px (the sidebar lands), and 516px at 1280px (the companion rail
   lands too) -- NARROWER at 1280 than at 600. Any max-width breakpoint would stack the layout
   where it is roomiest and leave it broken where it is tightest.

   So the fix is width-independent: make the cell able to hold what is put in it.

   AND IT IS A FLOOR UNDER THE KEY, NOT A CAP ON THE VALUE. My first attempt capped the value
   column at 45%. It zeroed the overflow and it MOVED TWO TOPICS THAT HAD NOTHING WRONG WITH THEM
   (pixel-diffed: content-pipeline and signing both re-wrapped, and the pane grew taller at 390px).
   Measuring the pre-fix layout says why: a HEALTHY value legitimately claims up to 75% of its row
   -- the figures are short, so the key simply does not need the space. Any fixed cap on the value
   is therefore guaranteed to break well-formed rows. The thing that must be bounded is the KEY's
   refusal to shrink, which is what jams the row open.
     minmax(20%,1fr)  the key gets a FLOOR, not a demand. It never binds on a healthy row (those
                      leave the key 25% or more, so the 20% minimum is slack) -- which is why they
                      are pixel-identical. It binds only where min-content was forcing the row
                      wider than the row: 172px of key in a 244px row.
     auto             the value column is UNCHANGED. It hugs max-content exactly as before, so a
                      short figure still sits tight against the key. Grid can no longer let it
                      exceed the space that is actually there, so it wraps instead of spilling.
     white-space      normal, so the value CAN wrap. This costs healthy rows nothing: an auto
                      track sizes to MAX-content, and max-content is the unwrapped width -- the
                      same number nowrap gave. It only matters once the space is gone.
                      (NO BACKTICKS IN THIS COMMENT. NUM_STYLE is a JS template literal, so quoting
                      that word as code TERMINATES THE STRING and the rest of the sheet is parsed
                      as JavaScript: "Unexpected identifier 'auto'", customElements.define
                      ('deep-numbers') never runs, and the WHOLE PANE silently fails to upgrade --
                      the identical failure drill/logic.js documents, in the identical words, for
                      the identical reason. The build stays GREEN either way; a bundler does not
                      execute the string. I hit it twice in one sitting. It is not a hypothetical.)
     .nv-u            grows past the gutter instead of spilling out of it; min-width keeps the
                      short units aligned, which is the one thing the fixed width was there for.
     overflow-wrap    the backstop: a single pathological token can never spill, whatever a future
                      topic decides to call a unit. */
.nrow{display:grid;grid-template-columns:minmax(20%,1fr) auto;grid-template-areas:"k v" "n n";gap:var(--space-3) var(--space-12);padding:var(--space-12) 0;border-bottom:1px solid var(--bd);transition:padding var(--duration-base) var(--ease-base)}
.nrow:last-child{border-bottom:0}
.nrow:hover{padding-left:var(--space-4)}
.nrow>*{min-width:0}
.nrow-k{grid-area:k;font-size:var(--font-size-small);font-weight:var(--font-weight-bold);color:var(--ink);align-self:center;overflow-wrap:anywhere}
.nrow-v{grid-area:v;font:var(--font-weight-heavy) 17px ui-monospace,Menlo,monospace;color:var(--ink);align-self:center;white-space:normal;overflow-wrap:anywhere}
/* .nrow-v is INK now (was --acc): painting every figure accent destroyed the breach-red
   signal. The hover scale(1.05) is deleted -- a number you point at must not grow, or you
   cannot compare it. Only the breached rows carry colour, and now they land. */
.nrow-n{grid-area:n;font-size:var(--font-size-caption);max-width:var(--measure);color:var(--mut2);line-height:var(--line-height-relaxed);overflow-wrap:anywhere}
.nrow.over .nrow-v{color:var(--red)}
.nrow.over .nrow-n{color:var(--red);font-weight:var(--font-weight-semibold)}
.nrow.over{background:linear-gradient(90deg,transparent 0%,rgba(239,68,68,.02) 100%);border-left:2px solid var(--red)}
.num-tell{margin-top:var(--space-15);font-size:var(--font-size-body);max-width:var(--measure);color:var(--teal);font-weight:var(--font-weight-bold);line-height:var(--line-height-airy);padding:var(--space-14) var(--space-17);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);border-radius:11px;box-shadow:0 1px 6px -2px rgba(10,133,100,.08)}
.nprog{height:var(--space-5);background:var(--dbar-bg);border-radius:5px;overflow:hidden;margin:var(--space-12) 0}
.nprog i{display:block;height:100%;background:linear-gradient(90deg,var(--acc),var(--acc2));border-radius:5px;transition:width var(--duration-slowest) var(--ease-glide)}
.num-tell b{color:var(--dec-tell-b-fg);font-weight:var(--font-weight-bold)}
/* width -> min-width. The fixed gutter was there to ALIGN short units, and it still does that --
   but a fixed width on a box whose content is author-supplied free text is a spill waiting to
   happen, and 44 topics found it. Grow instead of overflow. */
.nv-u{display:inline-block;min-width:var(--space-30);width:auto;text-align:left;padding-left:var(--space-8);box-sizing:border-box;font-size:var(--font-size-small);font-weight:var(--font-weight-semibold);color:var(--mut)}`;
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
