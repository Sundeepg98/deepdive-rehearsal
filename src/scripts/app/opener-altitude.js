/* ============ OPENER / ALTITUDE (web component) ============
   The #open pane: opener cards each with a hidden answer (.op-a) and a reveal
   button (.op-rev). Encapsulated in a shadow root that adopts the shared
   BASE_SHEET; the reveal handlers are wired against the shadow's own buttons.
   Three colors had html[data-theme=dark] overrides (.op-hooks bg, .op-foot bg
   and fg); those ancestor selectors cannot reach into a shadow, so each is a
   flip token (--op-hooks-bg / --op-foot-bg / --op-foot-fg). The .op-rev border
   (#cfc7f0) has no dark override, so it stays hardcoded -- matching the original. */
var OP_STYLE = `
.op-lead{font-size:15px;line-height:1.5;color:var(--ink);margin:2px 0 18px}
.op-lead i{color:var(--accink);font-style:italic;font-weight:600}
.op{border:1.5px solid var(--bd);border-radius:13px;padding:15px 17px;margin-bottom:13px;background:linear-gradient(135deg,var(--surf) 0%,rgba(83,74,183,.02) 100%);box-shadow:var(--surf-sh);transition:box-shadow .25s ease,transform .2s ease,border-color .2s ease}
.op:hover{box-shadow:var(--surf-sh),0 6px 20px -8px rgba(83,74,183,.1);transform:translateY(-1px);border-color:rgba(83,74,183,.15)}
.op-h{display:flex;gap:12px;align-items:flex-start}
.op-n{flex:none;width:27px;height:27px;border-radius:50%;background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.06) 100%);border:1.5px solid var(--acc);color:var(--accink);font:800 12px ui-monospace,monospace;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px -2px rgba(83,74,183,.15)}
.op-ht{font-size:13px;color:var(--ink);line-height:1.5;padding-top:3px}
.op-ht b{color:var(--accink);font-weight:700}
.op-ht i{color:var(--mut);font-style:italic}
.op-a{display:none;margin:12px 0 0 39px;padding:14px 17px;background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:10px;font-size:13px;color:var(--ink);line-height:1.62;box-shadow:0 1px 6px -2px rgba(83,74,183,.08)}
.op-a.show{display:block;animation:pop .24s ease}
.op-a b{color:var(--accink);font-weight:700}
.op-rev{margin:12px 0 0 39px;font:700 11.5px -apple-system,sans-serif;padding:7px 15px;border-radius:8px;border:1.5px solid #cfc7f0;background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);color:var(--accink);cursor:pointer;transition:transform .12s ease,background .15s ease,border-color .15s ease,box-shadow .2s ease}
.op-rev:hover{background:linear-gradient(135deg,var(--acc) 0%,var(--acc2) 100%);color:#fff;border-color:var(--acc);box-shadow:0 4px 12px -3px rgba(83,74,183,.2);transform:translateY(-1px)}
.op-rev:active{transform:translateY(1px) scale(.98)}
.op-rev:disabled{opacity:.5;cursor:default;transform:none}
.op-hooks{margin-top:18px;padding:15px 17px;background:linear-gradient(135deg,var(--op-hooks-bg) 0%,rgba(83,74,183,.02) 100%);border:1px solid var(--bd);border-radius:13px}
.op-hk-t{font-size:12.7px;color:var(--mut);line-height:1.55;margin-bottom:8px}
.op-hk-t i{color:var(--accink);font-style:italic}
.op-hk{margin-top:14px;padding:10px 12px;background:rgba(83,74,183,.02);border-radius:8px;border-left:2px solid var(--acc);transition:background .2s ease,padding .2s ease}
.op-hk:hover{padding-left:14px;background:rgba(83,74,183,.04)}
.op-q{font-size:12.5px;color:var(--teal);font-weight:700;font-style:italic}
.op-d{font-size:12.5px;color:var(--ink);line-height:1.55;margin-top:4px}
.op-arr{color:var(--mut2);font-weight:800;margin-right:5px}
.op-tab{display:inline-block;margin-left:6px;font-size:10.5px;font-weight:700;color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:5px;padding:2px 8px;white-space:nowrap;border:1px solid #cfc7f0}
.op-foot{margin-top:18px;font-size:12.5px;color:var(--op-foot-fg);background:linear-gradient(135deg,var(--op-foot-bg) 0%,rgba(83,74,183,.03) 100%);border-left:3px solid var(--acc);border-radius:9px;padding:14px 17px;line-height:1.6}
.op-foot b{color:var(--accink);font-weight:700}
.op-foot i{font-style:italic;color:var(--mut)}
`;
var OP_HTML = `<div class="card">
      <div class="step-k">Match the altitude</div>
      <div class="step-t">The same system, said three ways</div>
      <div class="op-lead">Interviewers open with <i>&ldquo;quickly, how does it work?&rdquo;</i> as often as <i>&ldquo;design it.&rdquo;</i> Give the altitude they asked for &mdash; the frame when they want the frame, depth when they want depth &mdash; then expand only when they pull. Say each out loud before you reveal mine.</div>

      <div class="op">
        <div class="op-h"><span class="op-n">1</span><span class="op-ht"><b>One breath.</b> The whole system in a single sentence &mdash; for <i>&ldquo;high level&rdquo;</i> or <i>&ldquo;quickly.&rdquo;</i></span></div>
        <div class="op-a">An event-driven ingestion pipeline: an S3 upload fires a Lambda that routes each file by type to a streaming handler &mdash; which hashes it, stores it, and records it &mdash; with a <b>reconciler</b> to mop up partial failures.</div>
        <button class="op-rev" type="button">Reveal mine</button>
      </div>

      <div class="op">
        <div class="op-h"><span class="op-n">2</span><span class="op-ht"><b>Thirty seconds.</b> What you lead with, unprompted &mdash; the load-bearing ideas, no code.</span></div>
        <div class="op-a">Operators push content to S3, which triggers the processor. It routes on file type through an <b>O(1) strategy map</b> &mdash; not a switch &mdash; so a new format is a one-line add. Each handler <b>streams the file once</b> and forks that read to hash and upload in parallel, so memory stays flat no matter the size. The catch: the object store and the database share no transaction, so I track written keys and <b>compensate on failure</b>, with a reconciler as the backstop. And since every trigger is <b>at-least-once</b>, processing is idempotent &mdash; a replay no-ops on a content-hash marker.</div>
        <button class="op-rev" type="button">Reveal mine</button>
      </div>

      <div class="op-hooks">
        <div class="op-hk-t">The 30-second version names three loose threads <i>on purpose</i> &mdash; you're steering. Each is a tab you go deep on the moment they pull it:</div>
        <div class="op-hk">
          <div class="op-q">&ldquo;memory stays flat&rdquo;</div>
          <div class="op-d"><span class="op-arr">&rarr;</span>how the export streams a million rows without OOM<span class="op-tab">Numbers &middot; Walkthrough</span></div>
        </div>
        <div class="op-hk">
          <div class="op-q">&ldquo;compensate &middot; reconciler&rdquo;</div>
          <div class="op-d"><span class="op-arr">&rarr;</span>the dual-write, and keeping two stores consistent<span class="op-tab">Trade-offs &middot; Red Flags</span></div>
        </div>
        <div class="op-hk">
          <div class="op-q">&ldquo;at-least-once&rdquo;</div>
          <div class="op-d"><span class="op-arr">&rarr;</span>why exactly-once is a myth and replays stay safe<span class="op-tab">Probe Drill</span></div>
        </div>
      </div>

      <div class="op-foot"><b>The skill isn't knowing one version.</b> <i>&ldquo;Walk me through it&rdquo;</i> is the next altitude up &mdash; the Walkthrough's nine steps &mdash; and every tab here is a deeper zoom. It's having all of them, and reading which one they want.</div>
    </div>
    <div class="card">
      <div class="step-k">Land it</div>
      <div class="step-t">How to close &mdash; don&rsquo;t trail off</div>
      <div class="op-lead">When time&rsquo;s nearly up &mdash; or they ask <i>&ldquo;anything else?&rdquo;</i> &mdash; <b>don&rsquo;t just stop.</b> A proactive close is a seniority signal: summarize the shape, name what you&rsquo;d watch, hand the wheel back. Thirty seconds, unprompted. Say each out loud before you reveal mine.</div>
      <div class="op">
        <div class="op-h"><span class="op-n">1</span><span class="op-ht"><b>Summarize in one line.</b> Re-state the spine so they remember the shape, not the detours.</span></div>
        <div class="op-a">&ldquo;So &mdash; event-driven ingestion, routed by type to streaming handlers, kept consistent across two stores by a reconciler, and idempotent against replays. That&rsquo;s the core.&rdquo;</div>
        <button class="op-rev" type="button">Reveal mine</button>
      </div>
      <div class="op">
        <div class="op-h"><span class="op-n">2</span><span class="op-ht"><b>Name the three you&rsquo;d watch.</b> Naming your own risks reads as senior &mdash; not insecure.</span></div>
        <div class="op-a">&ldquo;In production I&rsquo;d watch three things: <b>reconciler correctness under concurrency</b>, the piece most likely to hide a race; the <b>cost curve</b>, since per-object Lambda gets pricey fast; and the <b>exactly-once illusion</b> &mdash; I&rsquo;d keep proving idempotency rather than trusting delivery.&rdquo;</div>
        <button class="op-rev" type="button">Reveal mine</button>
      </div>
      <div class="op">
        <div class="op-h"><span class="op-n">3</span><span class="op-ht"><b>Say what&rsquo;s next, and what you cut.</b> Shows you scoped on purpose, not from missing it.</span></div>
        <div class="op-a">&ldquo;With more time I&rsquo;d add the <b>status API</b> for consumers and the <b>multi-region</b> story. I left out auth and the client deliberately &mdash; out of scope for the pipeline. Where would you like to go deeper?&rdquo;</div>
        <button class="op-rev" type="button">Reveal mine</button>
      </div>
      <div class="op-foot"><b>The close hands the wheel back</b> &mdash; <i>&ldquo;where would you like to go deeper?&rdquo;</i> &mdash; so the last minute is theirs, and your named risks are the threads they&rsquo;ll pull. The tell: juniors stop when they run out of things to say; seniors stop on a <i>summary, a risk list, and an invitation.</i></div>
    </div>`;
class DeepOpener extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + OP_STYLE + '</style>' + OP_HTML;
    const cards = root.querySelectorAll('.op');
    for (let i = 0; i < cards.length; i++) {
      (function (card) {
        const answer = card.querySelector('.op-a');
        const btn = card.querySelector('.op-rev');
        btn.onclick = function () {
          answer.classList.add('show');
          btn.disabled = true;
          btn.textContent = 'Revealed';
        };
      })(cards[i]);
    }
  }
}
customElements.define('deep-opener', DeepOpener);
