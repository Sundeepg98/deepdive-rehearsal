/* ============ CRAM SHEET OVERLAY (web component) ============
   The densest overlay; uses the full .cs-* vocabulary. Frame (cram-ov/cram-panel/
   cram-top/cram-print/close) + open-close + Print wiring (cram-sheet.js openCram ->
   ovShow) stay light-DOM. Content moves into this shadow, styled by BASE_SHEET + the
   shared CS_SHEET. One cram-specific rule below: the inline :host code styling, which
   restores the light-DOM `.cram-body code` look (BASE_SHEET's code rule differs in
   size/bg/color), with color:var(--accink) matching the global code rule the original code inherits, not BASE_SHEET's accink and dark via token. */
class DeepCram extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const self = this;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, CS_SHEET];
    /* Lazy-render: defer the heaviest DOM in the app until the overlay is visible.
       Reduces initial page weight and improves tab-switch responsiveness. */
    var rendered = false;
    function renderNow() {
      if (rendered) return;
      rendered = true;
      root.innerHTML = '<style>:host code{font-size:10.5px;background:linear-gradient(135deg,var(--cram-code-bg) 0%,rgba(83,74,183,.04) 100%);border-radius:5px;padding:2px 6px;font-family:ui-monospace,Menlo,monospace;color:var(--accink);border:1px solid rgba(83,74,183,.08)}:host b{color:var(--accink);font-weight:700}</style>' + `<div class="cs-one"><span class="cs-one-l">The one-liner</span>Event-driven ingestion: S3 &rarr; Lambda &rarr; route by type &rarr; streaming handler (<b>hash + store + record</b>) &rarr; reconciler for partial failures.</div>
      <div class="cs-sec">
        <div class="cs-st">The spine &mdash; what you draw</div>
        <ol class="cs-spine">
          <li>Entry: <code>processUpload(key, bucket)</code>, fired by S3 ObjectCreated.</li>
          <li>Route: <code>extname</code> &rarr; <b>O(1) strategy map</b>, never a switch.</li>
          <li>Unknown ext &rarr; <code>skip</code>; a match &rarr; the format handler.</li>
          <li>Handler: <code>readStream &rarr; PassThrough &rarr; [hash | s3.upload] &rarr; Promise.all</code> &mdash; one read.</li>
          <li>Export: <code>cursor(100) &rarr; csv &rarr; res</code> + backpressure &mdash; <b>constant memory</b>.</li>
          <li>Import ladder: <b>REUSE / REMAP / REGEN / INSERT</b> + <code>oldId&rarr;newId</code> FK remap.</li>
          <li>Dual-write: track S3 keys + <b>compensating-delete</b> on rollback.</li>
          <li>Reconciler sweeps orphans &mdash; guarded by grace window / <b>PENDING</b> marker.</li>
          <li>Replay-safe: <b>processed-marker</b> (conditional put) &mdash; idempotent.</li>
        </ol>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Decisions &amp; switch conditions</div>
        <div class="cs-dec"><b>Lambda per object</b><span class="cs-arr">&rarr;</span>SQS the moment you need retries / DLQ / ordering.</div>
        <div class="cs-dec"><b>SQLite / Postgres over JSON</b><span class="cs-arr">&rarr;</span>need real FKs + 1:1 BLOBs.</div>
        <div class="cs-dec"><b>Hash during upload (fork)</b><span class="cs-arr">&rarr;</span>2&times; read or buffering won't survive 500&nbsp;MB.</div>
        <div class="cs-dec"><b>Inline sync</b><span class="cs-arr">&rarr;</span>async ECS / MediaConvert once transcoding is heavy.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Ceilings &mdash; the numbers</div>
        <div class="cs-num"><b>Lambda concurrency &gt; 1,000</b> &rarr; buffer through SQS.</div>
        <div class="cs-num"><b>DB connections &gt; pool</b> &rarr; RDS Proxy.</div>
        <div class="cs-num"><b>S3 PUT / prefix rate</b> &rarr; spread key prefixes.</div>
        <div class="cs-num cs-dim">10M files/day &asymp; 116/s avg &middot; ~1,157/s peak &middot; ~$50/day in PUTs.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Traps &rarr; the fix</div>
        <div class="cs-trap"><span class="cs-bad">load all rows then write CSV</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">cursor + backpressure</span></div>
        <div class="cs-trap"><span class="cs-bad">hash after store</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">PassThrough fork</span></div>
        <div class="cs-trap"><span class="cs-bad">switch() routing</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">O(1) dispatch map</span></div>
        <div class="cs-trap"><span class="cs-bad">two writes = consistent</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">compensate + reconciler</span></div>
        <div class="cs-trap"><span class="cs-bad">exactly-once delivery</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">idempotent effects</span></div>
        <div class="cs-trap"><span class="cs-bad">just retry</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">DLQ + idempotency</span></div>
        <div class="cs-trap"><span class="cs-bad">reconciler deletes orphans</span><span class="cs-arr2">&rarr;</span><span class="cs-fix">grace / PENDING guard</span></div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Senior tells &mdash; say these</div>
        <ul class="cs-tells">
          <li>Name the <b>switch condition</b>, don't defend one choice.</li>
          <li>Memory is constant <b>because of backpressure</b>.</li>
          <li>Volunteer the <b>reconciler as the real backstop</b>.</li>
          <li>Reframe: <b>exactly-once delivery is impossible</b> &rarr; idempotent effects.</li>
          <li>Name the <b>resource that gives out first</b>.</li>
        </ul>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Harder angles &mdash; curveball-ready</div>
        <div class="cs-ha"><b class="cs-ha-l">Operate</b> &mdash; four signals: queue depth &middot; latency p99 &middot; error rate &middot; <b>orphan count</b> (the correctness canary); alert on <b>SLO burn</b>, not single blips.</div>
        <div class="cs-ha"><b class="cs-ha-l">Security</b> &mdash; the strategy map <b>is the allowlist</b>; validate by content not extension; sandbox the processor; a <b>per-job timeout</b> contains a poison input.</div>
        <div class="cs-ha"><b class="cs-ha-l">Cost</b> &mdash; at firehose scale <b>per-object Lambda is the expensive choice</b> &rarr; batch through SQS; lifecycle cold objects to Glacier.</div>
        <div class="cs-ha"><b class="cs-ha-l">Ordering</b> &mdash; S3 events aren't ordered &rarr; <b>SQS FIFO per key</b> or a sequence number; first challenge whether you need <i>global</i> order.</div>
        <div class="cs-ha"><b class="cs-ha-l">Backfill</b> &mdash; reprocess through the <b>same pipeline</b>, rate-limited, with <b>reserved concurrency</b> so it can't starve live traffic; safe because idempotent.</div>
        <div class="cs-ha"><b class="cs-ha-l">Cut scope</b> &mdash; MVP is S3&rarr;Lambda&rarr;handler&rarr;row; defer DLQ / multipart / reconciler; <b>never cut</b> idempotency or the strategy-map seam.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">If they say &ldquo;quickly&rdquo; &mdash; the 30 seconds</div>
        <div class="cs-30">Operators push to S3 &rarr; the processor routes by type through an O(1) map &rarr; each handler streams once, forking the read to hash + upload, so memory stays flat. Two stores, no shared txn &rarr; track keys, compensate, reconciler backstop. At-least-once &rarr; a processed-marker makes replays no-op.</div>
      </div>`;
    }
    /* Render immediately if already visible; otherwise use IntersectionObserver */
    if (self.offsetParent !== null) { renderNow(); }
    else {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { renderNow(); io.disconnect(); }
      }, { rootMargin: '200px' });
      io.observe(self);
      self._io = io;
    }
  }
  disconnectedCallback() { if (this._io) { this._io.disconnect(); this._io = null; } }
}
customElements.define('deep-cram', DeepCram);
