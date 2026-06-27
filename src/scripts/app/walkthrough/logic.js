/* ============ WALKTHROUGH (web component) ============
   Nine-step guided trace: dots + a rendered step card + prev/next + the arc
   jump-rail + a static model-script disclosure. Shadow-DOM custom element
   adopting BASE_SHEET; reads the step data from the global `steps` (steps.js,
   included just before this). Coupled to numbers-nalsd, whose keyboard handler
   drove wi/renderW directly; it now calls prev()/next() (each bounds-checks
   internally). The flow chips (.fb/.flow/.arr), .ins, .arc-*, pre.code/.codecap,
   details.model and .mq are pane-exclusive and stay here. The base .mbeat row
   rules are shared with model-answers and live in MBEAT_SHEET; the details.disc
   disclosure family is shared with whiteboard and lives in DISC_SHEET -- both
   adopted here (shared-sheets.js). Ten dark overrides become flip tokens. */
var WALK_STYLE = `
.dots{display:flex;gap:7px;justify-content:center;margin:0 0 16px;padding:2px 0}
.dots i{width:9px;height:9px;border-radius:50%;background:var(--dots-i-bg);transition:transform .35s cubic-bezier(.34,1.56,.64,1),background .25s ease,opacity .25s ease,box-shadow .3s ease;cursor:pointer;position:relative}
.dots i.on{background:var(--dots-on-bg);transform:scale(1.35);box-shadow:0 0 0 3px rgba(83,74,183,.12),0 0 12px 2px rgba(83,74,183,.18);animation:dotPulse 2s ease-in-out infinite}
@keyframes dotPulse{0%,100%{box-shadow:0 0 0 3px rgba(83,74,183,.12),0 0 12px 2px rgba(83,74,183,.18)}50%{box-shadow:0 0 0 5px rgba(83,74,183,.2),0 0 20px 4px rgba(83,74,183,.3)}}
.dots i.done{background:var(--dots-done-bg);opacity:.45}
.dots i:hover:not(.on){transform:scale(1.15);background:rgba(83,74,183,.35)}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:8px 0 4px}
.fb{font:650 11.5px ui-monospace,Menlo,monospace;padding:7px 11px;border-radius:8px;border:1.5px solid;white-space:nowrap;transition:transform .15s ease,box-shadow .15s ease;cursor:default}
.fb:hover{transform:translateY(-1px) scale(1.02);box-shadow:0 4px 12px -3px rgba(83,74,183,.15)}
.fb.p{background:var(--accbg);border-color:var(--acc);color:var(--accink)}
.fb.t{background:var(--tealbg);border-color:var(--teal);color:var(--fb-t-fg)}
.fb.r{background:var(--redbg);border-color:var(--red);color:var(--fb-r-fg)}
.fb.a{background:var(--amberbg);border-color:var(--amber);color:var(--fb-a-fg)}
.fb.n{background:var(--fb-n-bg);border-color:#C9C3B8;color:var(--fb-n-fg)}
.arr{color:var(--mut2);font-weight:800;font-size:14px}
.ins{margin-top:14px;font-size:12.5px;color:var(--ins-fg);background:linear-gradient(135deg,var(--ins-bg) 0%,rgba(83,74,183,.03) 100%);border-left:3px solid var(--acc);border-radius:9px;padding:13px 16px;line-height:1.6;box-shadow:0 1px 4px -2px rgba(83,74,183,.08)}
.ins b{color:var(--accink)}
pre.code{margin:2px 14px 13px;background:linear-gradient(180deg,rgba(42,39,64,.98) 0%,rgba(36,33,58,.98) 100%),var(--code);border-radius:9px;padding:13px 15px;overflow-x:auto;font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.65;color:var(--codeink);position:relative;border-top:3px solid var(--acc);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 4px 12px -4px rgba(0,0,0,.3)}
pre.code .c{color:#9b95c9} pre.code .k{color:#C9A2F0} pre.code .s{color:#9DD9B6} pre.code .hl{color:#FFD479}
.codecap{font-size:11px;color:var(--codecap-fg);margin:0 14px 13px;padding-left:11px;border-left:3px solid var(--acc)}
.nav{display:flex;justify-content:space-between;align-items:center;margin-top:16px}
.nav button{border:1.5px solid var(--bd);background:var(--card);color:var(--ink);font:650 13px -apple-system,sans-serif;padding:9px 18px;border-radius:10px;cursor:pointer;transition:border-color .2s ease,color .2s ease,transform .12s ease,box-shadow .2s ease,background .2s ease}
.nav button:hover:not(:disabled){border-color:var(--acc);color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);box-shadow:0 4px 14px -4px rgba(83,74,183,.18);transform:translateY(-2px)}
.nav button:active:not(:disabled){transform:translateY(0) scale(.98);box-shadow:0 2px 6px -2px rgba(83,74,183,.12)}
.nav button:disabled{opacity:.32;cursor:default}
.nav .ctr{font-family:var(--mono);font-size:12px;color:var(--mut2);font-weight:700}
details.model{margin-top:18px;background:linear-gradient(135deg,var(--card) 0%,rgba(83,74,183,.02) 100%);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-left:4px solid var(--acc);border-radius:12px;overflow:hidden;transition:box-shadow .25s ease}
details.model[open]{box-shadow:0 0 0 1px rgba(83,74,183,.08),var(--surf-sh)}
details.model>summary{cursor:pointer;list-style:none;padding:15px 18px;font:800 13.5px -apple-system,sans-serif;color:var(--accink);display:flex;align-items:baseline;gap:10px;user-select:none;transition:background .18s ease,padding .2s ease}
details.model>summary::-webkit-details-marker{display:none}
details.model>summary::before{content:"\\25B8";color:var(--acc);transition:transform .25s cubic-bezier(.34,1.56,.64,1);font-size:12px;flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;background:var(--accbg)}
details.model[open]>summary::before{transform:rotate(90deg)}
details.model>summary .sub{font-weight:600;color:var(--mut);font-size:11px;letter-spacing:.3px}
details.model>summary:hover{background:rgba(109,95,214,.07);padding-left:20px}
.mbody{padding:6px 20px 20px;border-top:1px solid var(--bd)}
.mbeat .ml{display:block;font-size:10px;font-weight:800;letter-spacing:.9px;text-transform:uppercase;color:var(--acc);margin-bottom:4px}
.mq{margin:17px 0 0;padding:11px 13px;background:var(--mq-bg);border-radius:9px;font-size:13px;color:var(--mut);font-style:italic}
.mbeat.ans{background:var(--accbg);border-radius:9px;padding:11px 14px;margin-top:7px}
.mbeat.ans:last-child{padding-bottom:11px}/* the answer box keeps its own padding; the shared .mbeat:last-child reduction (now in MBEAT_SHEET, so it cascades after this inline rule at equal specificity) is meant only for plain beats */
.arc-wrap{margin-top:24px}
.arc-h{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:12px;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
.arc-h .sub{font-size:10.5px;font-weight:600;letter-spacing:.01em;text-transform:none;color:var(--mut2)}
.arc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;position:relative}
.arc-grid::before{content:"";position:absolute;top:23px;left:8%;right:8%;height:2px;background:linear-gradient(90deg,var(--acc) 0%,var(--acc2) 50%,var(--acc) 100%);opacity:.12;border-radius:1px;z-index:0}
.arc-step{z-index:1}
.arc-step{display:flex;align-items:center;gap:10px;text-align:left;padding:11px 13px;border-radius:11px;border:1px solid var(--bd);background:var(--surf);box-shadow:var(--surf-sh);cursor:pointer;transition:transform .22s cubic-bezier(.22,.61,.36,1),box-shadow .25s ease,border-color .2s ease,background .2s ease;font-family:inherit;position:relative;overflow:hidden}
.arc-step::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(83,74,183,.06) 50%,transparent 60%);background-size:250% 250%;opacity:0;transition:opacity .3s ease}
.arc-step:hover::before{opacity:1;animation:stepShine 3s ease-in-out infinite}
@keyframes stepShine{0%{background-position:250% 250%}100%{background-position:-250% -250%}}
.arc-step:hover{transform:translateY(-3px) scale(1.01) rotateX(2deg);box-shadow:var(--glow-hover),0 8px 24px -8px rgba(83,74,183,.15);border-color:rgba(83,74,183,.25);background:var(--mix-surf)}
.arc-step:active{transform:translateY(-1px) scale(.99)}
.arc-step:nth-child(3n+1):hover{transform:translateY(-3px) scale(1.01) rotateX(2deg) rotateY(-1deg)}
.arc-step:nth-child(3n+2):hover{transform:translateY(-3px) scale(1.01) rotateX(2deg) rotateY(1deg)}
.arc-n{flex:none;width:23px;height:23px;border-radius:7px;display:grid;place-items:center;font:700 11px -apple-system,sans-serif;background:var(--accbg);color:var(--accink);transition:background .2s ease,color .2s ease,box-shadow .2s ease,transform .2s cubic-bezier(.34,1.56,.64,1)}
.arc-t{font-size:12px;font-weight:600;color:var(--ink);line-height:1.25}
.arc-step.on{border-color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.06) 100%);box-shadow:0 0 0 1px var(--acc),0 0 20px -6px rgba(83,74,183,.18),var(--surf-sh);transform:translateY(-2px)}
.arc-step.on .arc-n{background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;box-shadow:0 2px 8px -2px rgba(83,74,183,.4)}
.arc-step.done .arc-n{background:transparent;color:var(--acc);box-shadow:inset 0 0 0 1.5px var(--acc)}
.arc-step.done .arc-n::after{content:"\\2713";font-size:8px;margin-left:1px}
.arc-step:active{background:var(--accbg)}
`;
var WALK_HTML = `<div class="dots" id="wdots"></div>
    <div class="card" id="wcard"></div>
    <div class="nav">
      <button type="button" id="wprev">&larr; Prev</button>
      <span class="ctr" id="wctr"></span>
      <button type="button" id="wnext">Next &rarr;</button>
    </div>
    <details class="model">
      <summary>What a complete answer sounds like <span class="sub">model script &middot; the full arc, not just the opener</span></summary>
      <div class="mbody">
        <div class="mbeat"><span class="ml">Frame it before diving</span>"Before I trace it &mdash; I'll assume single region, files up to ~500&nbsp;MB, and that downstream consumers need the result within a few seconds. Stop me if any of that's off."</div>
        <div class="mbeat"><span class="ml">Headline in one breath</span>"At a high level: the object lands in S3, that fires a trigger, I hash and validate it <b>while it streams</b>, write the metadata transactionally, then fan it out to the processors &mdash; built so memory stays flat no matter the file size."</div>
        <div class="mbeat"><span class="ml">Walk the path</span>"Concretely &mdash; the upload completes to S3 and emits an event. My handler opens a read stream and forks it through a <b>PassThrough</b>: one branch computes the SHA&#8209;256, the other feeds the processor, so I never buffer the whole file or read it twice. Once I have the hash and size, I write the row &mdash; key, hash, status &mdash; to the metadata DB."</div>
        <div class="mbeat"><span class="ml">Name the risk yourself</span>"The thing I'd flag without being asked is the <b>dual&#8209;write</b>: the object is already in S3, but if the DB write fails I've got an orphan. The compensating delete covers the common case, but the real backstop is a <b>reconciler</b> that sweeps S3 for keys with no committed row. I wouldn't claim the delete alone is safe."</div>
        <div class="mbeat"><span class="ml">Name the trade-off line</span>"For dispatch I'd run a Lambda per object at this volume &mdash; the simplest thing that works. The moment I need retries, ordering, or a DLQ, I'd put <b>SQS</b> in front and make the processors consumers. That's the line I'd move on, and I'd say so before they ask."</div>
        <div class="mbeat"><span class="ml">Be honest about the ceiling</span>"This holds to low thousands of objects a minute. Past that the metadata DB is the bottleneck &mdash; I'd shard by tenant or key&#8209;prefix and move fully onto SQS&#8209;fronted consumers. I'd call that out as the next redesign rather than pretend it scales forever."</div>
        <div class="mq">Interviewer: "What if two uploads race on the same key?"</div>
        <div class="mbeat ans"><span class="ml">Absorb the follow-up</span>"S3 is last&#8209;writer&#8209;wins on the object, so the bytes are fine &mdash; but my metadata could interleave. I'd make the DB write <b>idempotent on the key</b> with a conditional put, so the second writer updates cleanly or no&#8209;ops. And if ordering genuinely matters to the business, that's one more reason to move to a queue with a per&#8209;key partition."</div>
      </div>
    </details>

    <div class="arc-wrap">
      <div class="arc-h">The whole flow <span class="sub">tap any step to jump</span></div>
      <div class="arc-grid" id="warc"></div>
    </div>`;

class DeepWalkthrough extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this._wi = 0;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, MBEAT_SHEET, DISC_SHEET];
    root.innerHTML = '<style>' + WALK_STYLE + '</style>' + WALK_HTML;
    this._card = root.getElementById('wcard');
    this._dots = root.getElementById('wdots');
    this._ctr = root.getElementById('wctr');
    this._prev = root.getElementById('wprev');
    this._next = root.getElementById('wnext');
    this._arc = root.getElementById('warc');
    const self = this;
    for (let i = 0; i < steps.length; i++) { this._dots.appendChild(document.createElement('i')); }
    for (let i = 0; i < steps.length; i++) {
      (function (stepIdx) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'arc-step';
        btn.innerHTML = '<span class="arc-n">' + (stepIdx + 1) + '</span><span class="arc-t">' + steps[stepIdx].t + '</span>';
        btn.onclick = function () { self._wi = stepIdx; self._renderW(); };
        self._arc.appendChild(btn);
      })(i);
    }
    this._prev.onclick = function () { self.prev(); };
    this._next.onclick = function () { self.next(); };
    initCardSpotlight(root);
    this._renderW();
  }
  _renderW() {
    const step = steps[this._wi];
    let html = '<div class="step-k">' + step.k + '</div><div class="step-t">' + step.t + '</div>' +
      '<div class="flow">' + step.flow + '</div><div class="ins">' + step.ins + '</div>';
    if (step.deep) { html += '<details class="disc"><summary>Go deeper</summary><div class="body">' + step.deep + '</div></details>'; }
    if (step.code) { html += '<details class="disc"><summary>See the code</summary><pre class="code">' + step.code + '</pre><div class="codecap">' + step.cap + '</div></details>'; }
    this._card.innerHTML = html;
    const dots = this._dots.children;
    for (let i = 0; i < dots.length; i++) { dots[i].className = i < this._wi ? 'done' : (i === this._wi ? 'on' : ''); }
    const arcSteps = this._arc.children;
    for (let i = 0; i < arcSteps.length; i++) { arcSteps[i].className = 'arc-step' + (i < this._wi ? ' done' : (i === this._wi ? ' on' : '')); }
    this._ctr.textContent = (this._wi + 1) + ' of ' + steps.length;
    this._prev.disabled = this._wi === 0;
    this._next.disabled = this._wi === steps.length - 1;
  }
  prev() { if (this._wi > 0) { this._wi--; this._renderW(); } }
  next() { if (this._wi < steps.length - 1) { this._wi++; this._renderW(); } }
}
customElements.define('deep-walkthrough', DeepWalkthrough);
