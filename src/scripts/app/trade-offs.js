/* ============ TRADE-OFFS (web component) ============
   A static ledger of design decisions, each with the axis that picks a side.
   Shadow-DOM custom element adopting BASE_SHEET. Coupled to mixed-fire, which
   used to scrape '#trade .dec' directly; that DOM now lives in the shadow, so
   the element exposes getDecisions() -> [{q, optsHtml, tell}] and mixed-fire
   delegates to it. The .opt family is rendered by BOTH this pane and the
   mixed-fire overlay (which injects the scraped .opt HTML into the light DOM),
   so those rules stay in styles.css and are copied here; .dec/.dec-q/.dec-tell
   are pane-exclusive and move here. Two dark overrides become flip tokens
   (--opt-n-bd, shared with the overlay; --dec-tell-b-fg, exclusive). */
var TRADE_STYLE = `
.ledger .lead{font-size:15px;line-height:1.5;color:var(--ink);margin:2px 2px 16px}
.ledger .lead b{color:var(--accink)}
.dec{background:var(--surf);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-radius:13px;padding:15px 17px;margin-bottom:13px;border-top:3px solid var(--acc)}
.dec-q{font-size:14.5px;font-weight:800;color:var(--ink);letter-spacing:-.2px;margin-bottom:9px;line-height:1.4}
.dec-q .vs{color:var(--mut2);font-weight:700;font-size:11.5px;padding:0 3px}
.opt{margin:11px 0}
.opt-n{display:inline-block;font:800 10.5px -apple-system,sans-serif;letter-spacing:.3px;color:var(--accink);background:var(--accbg);border:1px solid var(--opt-n-bd);border-radius:6px;padding:4px 9px;margin-bottom:5px}
.opt-w{font-size:12.8px;line-height:1.57;color:var(--ink)}
.opt-w .pw{font-weight:800;color:var(--mut2);text-transform:uppercase;font-size:9.5px;letter-spacing:.5px;margin-right:6px}
.opt-w b{color:var(--accink)}
.dec-tell{margin-top:12px;padding-top:11px;border-top:1px dashed var(--bd);font-size:12px;color:var(--teal);font-weight:700;line-height:1.5}
.dec-tell::before{content:"\\2605";font-size:11px;margin-right:7px}
.dec-tell b{color:var(--dec-tell-b-fg)}
`;
var TRADE_HTML = `<div class="ledger">
      <div class="lead">The design decisions an interviewer drills &mdash; each with the <b>axis</b> that picks a side. Saying the switch condition out loud is the senior move; defending one option as universally right isn't.</div>

      <div class="dec">
        <div class="dec-q">Lambda per object <span class="vs">vs</span> SQS + worker pool</div>
        <div class="opt"><span class="opt-n">Lambda / object</span><div class="opt-w"><span class="pw">pick when</span>low or spiky volume, no ordering need, you want <b>zero ops</b> and lowest latency.</div></div>
        <div class="opt"><span class="opt-n">SQS + workers</span><div class="opt-w"><span class="pw">pick when</span>you need <b>retries, a DLQ, ordering</b>, burst-smoothing, or jobs over 15&nbsp;min.</div></div>
        <div class="dec-tell">Name the <b>switch condition</b>, don't defend one side.</div>
      </div>

      <div class="dec">
        <div class="dec-q">Hash during upload <span class="vs">vs</span> hash after store</div>
        <div class="opt"><span class="opt-n">During (fork)</span><div class="opt-w"><span class="pw">pick when</span>files are large, or you just want <b>one disk read</b> &mdash; i.e. almost always.</div></div>
        <div class="opt"><span class="opt-n">After / two-pass</span><div class="opt-w"><span class="pw">pick when</span>the file is tiny, or an API needs the <b>digest before</b> you can store it.</div></div>
        <div class="dec-tell">The <b>PassThrough fork</b> is the only path that survives a 500&nbsp;MB object.</div>
      </div>

      <div class="dec">
        <div class="dec-q">SQLite bundle <span class="vs">vs</span> JSON <span class="vs">vs</span> pg_dump</div>
        <div class="opt"><span class="opt-n">SQLite</span><div class="opt-w"><span class="pw">pick when</span>you need <b>real FKs</b> and binary at <b>1:1</b> size in one portable file.</div></div>
        <div class="opt"><span class="opt-n">JSON</span><div class="opt-w"><span class="pw">pick when</span>data is small, human-readable, with <b>no</b> binary or relations.</div></div>
        <div class="opt"><span class="opt-n">pg_dump</span><div class="opt-w"><span class="pw">pick when</span>same engine both ends and you want exact fidelity &mdash; but it's <b>not portable</b>.</div></div>
        <div class="dec-tell">JSON base64-bloats binary <b>~33%</b> and loses referential integrity.</div>
      </div>

      <div class="dec">
        <div class="dec-q">Single PUT <span class="vs">vs</span> multipart upload</div>
        <div class="opt"><span class="opt-n">Single PUT</span><div class="opt-w"><span class="pw">pick when</span>objects are <b>small</b> (&lt;100&nbsp;MB) and the network is reliable.</div></div>
        <div class="opt"><span class="opt-n">Multipart</span><div class="opt-w"><span class="pw">pick when</span>large objects, flaky networks, or you want <b>per-part retry</b> and resumability.</div></div>
        <div class="dec-tell">Multipart resumes <b>per part</b> &mdash; pair it with a lifecycle rule to abort orphans.</div>
      </div>

      <div class="dec">
        <div class="dec-q">Compensating delete <span class="vs">vs</span> reconciler <span class="vs">vs</span> distributed txn</div>
        <div class="opt"><span class="opt-n">Compensating delete</span><div class="opt-w"><span class="pw">pick when</span>cheap cleanup of the <b>common</b> failure, in the request path.</div></div>
        <div class="opt"><span class="opt-n">Reconciler</span><div class="opt-w"><span class="pw">pick when</span>you need a <b>durable backstop</b> that eventually catches every orphan.</div></div>
        <div class="opt"><span class="opt-n">Distributed txn</span><div class="opt-w"><span class="pw">pick when</span>you truly need <b>cross-store atomicity</b> &mdash; rarely worth 2PC / saga cost across S3 + DB.</div></div>
        <div class="dec-tell">Run delete <b>and</b> reconciler; reach for 2PC only when atomicity is non-negotiable.</div>
      </div>

      <div class="dec">
        <div class="dec-q">Sync fast-path <span class="vs">vs</span> async queue</div>
        <div class="opt"><span class="opt-n">Sync inline</span><div class="opt-w"><span class="pw">pick when</span>interactive, small payload, <b>sub-second</b> SLA.</div></div>
        <div class="opt"><span class="opt-n">Async queue</span><div class="opt-w"><span class="pw">pick when</span>heavy or bulk work where <b>eventual</b> completion is fine.</div></div>
        <div class="dec-tell">Two-tier by interactivity: <b>one dispatch map, two execution venues</b>.</div>
      </div>

      <div class="dec">
        <div class="dec-q">Reconciler backstop <span class="vs">vs</span> transactional outbox</div>
        <div class="opt"><span class="opt-n">Reconciler (heal)</span><div class="opt-w"><span class="pw">pick when</span>the two stores <b>can't share a transaction</b>, a brief orphan window is tolerable, and fewer moving parts wins &mdash; dual-write, then sweep orphans on a grace window.</div></div>
        <div class="opt"><span class="opt-n">Outbox (prevent)</span><div class="opt-w"><span class="pw">pick when</span>correctness must be <b>airtight</b> and you can anchor on one DB transaction &mdash; commit the row + an event atomically, and a relay does the S3 work with retries off <b>one commit point</b>.</div></div>
        <div class="dec-tell">The outbox needs a DB transaction to anchor on; the reconciler is the honest backstop for when the stores genuinely can't share one.</div>
      </div>
    </div>`;

class DeepTradeOffs extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + TRADE_STYLE + '</style>' + TRADE_HTML;
    this._root = root;
  }
  getDecisions() {
    if (!this._root) return [];
    const decisions = this._root.querySelectorAll('.dec');
    const out = [];
    for (let i = 0; i < decisions.length; i++) {
      const dec = decisions[i];
      const opts = dec.querySelectorAll('.opt');
      let optsHtml = '';
      for (let o = 0; o < opts.length; o++) optsHtml += opts[o].outerHTML;
      out.push({ q: dec.querySelector('.dec-q').innerHTML, optsHtml: optsHtml, tell: dec.querySelector('.dec-tell').innerHTML });
    }
    return out;
  }
}
customElements.define('deep-trade-offs', DeepTradeOffs);
