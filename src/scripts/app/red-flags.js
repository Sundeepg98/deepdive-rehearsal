/* ============ RED FLAGS (web component) ============
   Static presentational pane, now encapsulated. No data or logic: the markup is
   rendered into the shadow root, styled by the shared BASE_SHEET plus the
   red-flag-specific rules below. Every color is an existing theme token, so the
   pane themes correctly across the shadow boundary with no extra tokens. */
var RF_STYLE = `
.rflead{font-size:15px;line-height:1.5;color:var(--ink);margin:2px 2px 18px}
.rflead b{color:var(--accink);font-weight:700}
.rf{background:linear-gradient(135deg,var(--surf) 0%,rgba(239,68,68,.03) 100%);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-radius:14px;padding:15px 18px;margin-bottom:13px;border-left:3px solid var(--red);transition:box-shadow .25s ease,transform .2s ease,border-color .2s ease}
.rf:hover{box-shadow:var(--surf-sh),0 4px 18px -6px rgba(239,68,68,.1);transform:translateY(-1px);border-color:rgba(239,68,68,.2)}
.rf-bad{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.5}
.rf-x{flex:none;color:var(--red);font:800 14px -apple-system,sans-serif;line-height:1.55}
.rf-bad .rf-t b{color:var(--red);font-weight:700}
.rf-note{color:var(--mut2);font-weight:600;font-style:italic;font-size:11.5px}
.rf-tell{font-size:12.5px;color:var(--mut);line-height:1.55;margin:9px 0 11px;padding-left:24px}
.rf-tell b{color:var(--ink);font-weight:700}
.rf-tell i{color:var(--amber);font-style:italic;font-weight:600}
.rf-fix{display:flex;gap:10px;align-items:flex-start;font-size:12.8px;line-height:1.55;padding-top:11px;border-top:1px dashed var(--bd)}
.rf-c{flex:none;color:var(--teal);font-weight:800;line-height:1.5;font-size:14px}
.rf-fix .rf-t{color:var(--ink)}
.rf-fix .rf-t b{color:var(--teal);font-weight:700}
`;
var RF_HTML = `<div class="rflead">The moves that quietly tank a candidate on this topic. Each one is something a weaker answer actually says &mdash; what the interviewer hears, and the line that flips it.</div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;I'd query all the rows, then write them to the CSV.&rdquo;</b></span></div>
      <div class="rf-tell">The driver buffers the <b>entire result set</b> in memory before your code runs &mdash; OOM at a million rows. The interviewer hears <i>&ldquo;never run this at scale.&rdquo;</i></div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">Server-side cursor, 100 rows at a time, piped with backpressure &mdash; <b>constant memory</b> at any row count.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;I'll store the file, then read it back to hash it.&rdquo;</b></span></div>
      <div class="rf-tell">Two full disk reads, or the whole file buffered in RAM &mdash; it dies on a 500&nbsp;MB object.</div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">A <b>PassThrough fork</b> &mdash; one read feeds the hash and the upload at once.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;A switch statement routes each file type to its handler.&rdquo;</b></span></div>
      <div class="rf-tell">Complexity grows with every new type, and each addition <b>edits the router</b> &mdash; a merge-conflict magnet that never stops touching shared code.</div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">An <b>O(1) dispatch map</b>. A new type is one entry and zero router changes.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;It writes to S3 and Postgres, so the data's consistent.&rdquo;</b></span></div>
      <div class="rf-tell">There's <b>no atomicity across two stores</b> &mdash; a partial failure orphans objects or rows. The interviewer hears <i>&ldquo;hasn't thought about the failure path.&rdquo;</i></div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">Track created keys, <b>compensating delete</b> on failure, and a <b>reconciler</b> as the durable backstop.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;Exactly-once delivery means I won't double-process.&rdquo;</b></span></div>
      <div class="rf-tell">Exactly-once <i>delivery</i> doesn't exist &mdash; S3 and every queue are at-least-once. You <b>will</b> see the same file twice.</div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">Idempotent <b>effects</b> &mdash; a content-hash key or a processed-marker check-and-set. Replays no-op.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;On any failure, I just retry.&rdquo;</b></span></div>
      <div class="rf-tell">Retrying a non-idempotent op <b>double-charges</b>; retrying a <b>poison message</b> stalls the whole lane forever.</div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">Idempotency + a <b>DLQ</b> + backoff + a per-job timeout, so one bad input fails fast instead of hanging.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;Lambda per object &mdash; that's the design.&rdquo;</b></span></div>
      <div class="rf-tell">Defending one choice without naming <b>when it breaks</b> reads as inexperience. The interviewer wants the boundary, not loyalty.</div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">Name the <b>switch condition</b> &mdash; move to SQS the moment you need retries, a DLQ, or ordering.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;A reconciler deletes any S3 key with no DB row.&rdquo;</b></span></div>
      <div class="rf-tell">It will delete an <b>in-flight upload</b> &mdash; object written, row not yet committed. You just corrupted a live request.</div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t">A grace window, or a <b>PENDING marker</b>, so the reconciler never touches in-flight work.</span></div>
    </div>

    <div class="rf">
      <div class="rf-bad"><span class="rf-x">&#10007;</span><span class="rf-t"><b>&ldquo;&hellip;so I'd use a Lambda and an S3 trigger and&mdash;&rdquo;</b> <span class="rf-note">(straight into components)</span></span></div>
      <div class="rf-tell">No assumptions stated, no numbers, no ceiling named &mdash; the interviewer can't <b>see you reason</b>, only that you've memorized an architecture.</div>
      <div class="rf-fix"><span class="rf-c">&rarr;</span><span class="rf-t"><b>Frame first</b> (scope + load), then design, then name the <b>resource that gives out first</b>. Reasoning visible beats architecture recited.</span></div>
    </div>`;
class DeepRedFlags extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + RF_STYLE + '</style>' + RF_HTML;
  }
}
customElements.define('deep-red-flags', DeepRedFlags);
