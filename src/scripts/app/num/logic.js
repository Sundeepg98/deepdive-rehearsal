/* ============ NUMBERS / NALSD pane ============ */
/* The back-of-envelope capacity calculator: four assumptions in, derived
   throughput / concurrency / connection / storage / cost figures out, each row
   flagged when it breaches a known ceiling (Lambda's 1,000 default, a ~100-conn
   Postgres pool). A self-contained shadow component; the tab / rail / keyboard
   nav that used to share this file stays global below. */
var NUM_STYLE = `.numlead{font-size:15px;line-height:1.5;color:var(--ink);margin:2px 2px 18px}
.numlead b{color:var(--accink);font-weight:700}
.num-h{font:800 10px -apple-system,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:var(--mut2);margin-bottom:12px}
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
var NUM_HTML = `<div class="numlead">The estimation an interviewer makes you do at the whiteboard. State your assumptions and the <b>ceilings fall out of the arithmetic</b> &mdash; adjust any input and the math recomputes.</div>
    <div class="card">
      <div class="num-h">Assumptions</div>
      <div class="ninp">
        <label>Objects / day<input id="n_obj" type="number" value="10000000" min="0"></label>
        <label>Avg size (MB)<input id="n_size" type="number" value="2" min="0" step="0.1"></label>
        <label>Processing (sec)<input id="n_proc" type="number" value="2" min="0" step="0.1"></label>
        <label>Peak : average<input id="n_peak" type="number" value="10" min="1"></label>
      </div>
    </div>
    <div class="card" style="margin-top:13px">
      <div class="num-h">What falls out</div>
      <div id="nout"></div>
    </div>
    <div class="num-tell">The number you say isn't the point &mdash; the <b>ceiling</b> it reveals is. Concurrency past 1,000 says &lsquo;buffer through SQS&rsquo;; connections past the pool say &lsquo;RDS Proxy.&rsquo;</div>`;
class DeepNumbers extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + NUM_STYLE + '</style>' + NUM_HTML;
    this._root = root;
    this._out = root.getElementById('nout');
    const self = this;
    ['n_obj', 'n_size', 'n_proc', 'n_peak'].forEach(function (id) {
      root.getElementById(id).addEventListener('input', function () { self._calc(); });
    });
    this._calc();
  }
  _fmtN(x) { if (!isFinite(x)) x = 0; return Math.round(x).toLocaleString('en-US'); }
  _fmtTB(tb) {
    if (!isFinite(tb)) tb = 0;
    if (tb >= 1000) return (tb / 1000).toFixed(tb >= 10000 ? 0 : 1) + ' PB';
    if (tb >= 10) return tb.toFixed(0) + ' TB';
    return tb.toFixed(2) + ' TB';
  }
  _nval(id) { const v = +this._root.getElementById(id).value; return isFinite(v) && v > 0 ? v : 0; }
  _calc() {
    const perDay = this._nval('n_obj'), sizeMB = this._nval('n_size'), procS = this._nval('n_proc'), peakR = this._nval('n_peak');
    const avg = perDay / 86400, peak = avg * peakR, conc = peak * procS, conn = conc;
    const stDay = perDay * sizeMB / 1e6, stYr = stDay * 365, puts = perDay, putCost = puts / 1000 * 0.005;
    const rows = [
      { k: 'Average throughput', v: this._fmtN(avg), u: '/s', n: 'objects/day \u00F7 86,400 seconds', over: false },
      { k: 'Peak throughput', v: this._fmtN(peak), u: '/s', n: 'average \u00D7 ' + this._fmtN(peakR) + ' peak ratio', over: false },
      { k: 'Lambda concurrency at peak', v: this._fmtN(conc), u: '', n: conc > 1000 ? 'exceeds the 1,000 default \u2014 RDS Proxy, or buffer through SQS' : 'peak/s \u00D7 processing time \u2014 within the 1,000 default', over: conc > 1000 },
      { k: 'DB connections at peak', v: this._fmtN(conn), u: '', n: conn > 100 ? 'far past a Postgres pool (~100) \u2014 needs RDS Proxy or a queue' : '\u2248 one connection per invocation \u2014 a pool can hold this', over: conn > 100 },
      { k: 'Storage written / day', v: this._fmtTB(stDay).split(' ')[0], u: this._fmtTB(stDay).split(' ')[1], n: this._fmtTB(stYr) + ' per year of raw objects', over: false },
      { k: 'S3 PUTs / day', v: this._fmtN(puts), u: '', n: '\u2248 $' + putCost.toFixed(2) + '/day in PUT requests alone', over: false }
    ];
    let html = '';
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      html += '<div class="nrow' + (row.over ? ' over' : '') + '"><div class="nrow-k">' + row.k + '</div><div class="nrow-v">' + row.v + '<span class="nv-u">' + (row.u || '') + '</span></div><div class="nrow-n">' + row.n + '</div></div>';
    }
    this._out.innerHTML = html;
  }
}
customElements.define('deep-numbers', DeepNumbers);
