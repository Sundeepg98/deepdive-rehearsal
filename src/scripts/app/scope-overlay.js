/* ============ SCOPE-IT-FIRST OVERLAY (web component) ============
   Static content, encapsulated. Frame (.mock-ov/.mock-panel/.mock-top/close/.cram-body)
   + open-close wiring (cram-sheet.js openScope -> ovShow) stay light-DOM; only the
   content moves into this shadow, styled by BASE_SHEET + the shared CS_SHEET. */
class DeepScope extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, CS_SHEET];
    root.innerHTML = `<div class="cs-one"><span class="cs-one-l">The first signal</span>Before you draw anything, scope it. The first thing the interviewer reads is whether you solution blindly or pin down the problem. Ask the questions whose answers would <b>change your design</b> &mdash; not cosmetic ones. Here are the ones that fork this architecture, and what each answer flips.</div>
      <div class="cs-sec">
        <div class="cs-st">What we&rsquo;re ingesting</div>
        <div class="cs-ha"><span class="cs-ha-l">File types &amp; formats?</span> &mdash; a few known types means a <b>static strategy map</b>; arbitrary user uploads means <b>pluggable handlers</b> and a hard &lsquo;unknown type&rsquo; policy.</div>
        <div class="cs-ha"><span class="cs-ha-l">Size &mdash; KB configs or GB media?</span> &mdash; the single biggest fork. Small &rarr; simple buffered handlers; large &rarr; <b>streaming, multipart</b>, transcode off the hot path.</div>
        <div class="cs-ha"><span class="cs-ha-l">Processing &mdash; light or heavy?</span> &mdash; hash and parse are CPU-light, fine inline; transcode or ML is heavy &rarr; <b>async to a worker pool</b>, never inside the Lambda.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Scale</div>
        <div class="cs-ha"><span class="cs-ha-l">Objects per day, and peak-to-average?</span> &mdash; this sets the ceilings; it&rsquo;s exactly what the <b>Numbers</b> tab plugs in. Peak/s &times; processing time is your concurrency.</div>
        <div class="cs-ha"><span class="cs-ha-l">Bursty or steady?</span> &mdash; bursty means you need a <b>queue to absorb spikes</b>; steady may not.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Who consumes the output</div>
        <div class="cs-ha"><span class="cs-ha-l">Sync API, or poll / subscribe?</span> &mdash; flips whether you owe a <b>status API or webhooks</b>, or just a record.</div>
        <div class="cs-ha"><span class="cs-ha-l">Latency &mdash; minutes fine, or someone waiting?</span> &mdash; sets the whole <b>sync vs async</b> posture.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Correctness &amp; durability &mdash; the senior questions</div>
        <div class="cs-ha"><span class="cs-ha-l">Same upload processed twice &mdash; catastrophic or just wasteful?</span> &mdash; sets the <b>idempotency bar</b>.</div>
        <div class="cs-ha"><span class="cs-ha-l">Can we ever drop an upload?</span> &mdash; <b>at-least-once and a durable queue</b>, or best-effort.</div>
        <div class="cs-ha"><span class="cs-ha-l">Retention, deletion, compliance?</span> &mdash; decides whether you need <b>provenance and tombstones</b> from day one.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Bound it &mdash; what you&rsquo;re NOT doing</div>
        <div class="cs-ha"><span class="cs-ha-l">Designing the upload path, or does the object already land in storage?</span> &mdash; bounds where the design even starts.</div>
        <div class="cs-dim">Then say what&rsquo;s out of scope &mdash; auth, the client UI, billing. Naming non-goals stops you sprawling and shows you scope on purpose.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-st">Cosmetic vs forking &mdash; hear the difference</div>
        <div class="cs-trap"><div class="cs-bad">&lsquo;What language should I use?&rsquo;</div><div class="cs-arr2">vs</div><div class="cs-fix">&lsquo;KB configs or GB media?&rsquo;</div></div>
      </div>
      <div class="cs-sec"><div class="cs-one"><span class="cs-one-l">The tell</span>Juniors ask nothing and start drawing, or ask cosmetic questions. Seniors ask the 3&ndash;4 whose answers <b>fork the architecture</b> &mdash; size, sync vs async, the idempotency bar, in and out of scope &mdash; then <b>state their assumptions out loud</b> and design against them. Asking &lsquo;what&rsquo;s the peak-to-average ratio&rsquo; and then actually <i>using</i> it at the whiteboard is the signal.</div></div>`;
  }
}
customElements.define('deep-scope', DeepScope);
