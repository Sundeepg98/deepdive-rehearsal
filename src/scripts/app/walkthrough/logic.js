(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ WALKTHROUGH (web component) ============
   Nine-step guided trace: dots + a rendered step card + prev/next + the arc
   jump-rail + a model-script disclosure. Phase 1: converted to the TopicPane
   contract (dataKey 'walk') -- the base class attaches the shadow + adopts
   [BASE_SHEET, MBEAT_SHEET, DISC_SHEET] + writes <style>+skeleton ONCE; init()
   caches the stable mounts and wires prev/next + ONE delegated arc click (reads
   data-i); renderTopic(d) reads { steps, modelScript } (topics/content-pipeline/
   walk.js, via the registry) and (re)builds the COUNT-dependent dots + arc + the
   model-script on first paint AND every topic switch, so a topic with a different
   step count never keeps stale dots/arc. The formerly baked model-script blob is
   now data, emitted by the module-level renderBeat(); the .mbeat.ans beat MUST
   stay LAST (WALK_STYLE + MBEAT_SHEET last-child rules). The keyboard handler in
   shell.js calls prev()/next() (each bounds-checks internally); the host is
   preserved across switches so it keeps working. The flow chips (.fb/.flow/.arr),
   .ins, .arc-*, pre.code/.codecap, details.model and .mq are pane-exclusive and
   stay here (WALK_STYLE). The base .mbeat row rules are shared with model-answers
   (MBEAT_SHEET); the details.disc disclosure family is shared with whiteboard
   (DISC_SHEET) -- both adopted via sheets(). Offline-safe. */
var WALK_STYLE = `
.dots{display:flex;gap:var(--space-7);justify-content:center;margin:0 0 var(--space-16);padding:var(--space-2) 0}
.dots i{width:var(--space-9);height:var(--space-9);border-radius:50%;background:var(--dots-i-bg);transition:transform var(--duration-slow) var(--ease-spring),background var(--duration-moderate) var(--ease-base),opacity var(--duration-moderate) var(--ease-base),box-shadow var(--duration-slow) var(--ease-base);cursor:pointer;position:relative}
.dots i.on{background:var(--dots-on-bg);transform:scale(1.35);box-shadow:0 0 0 3px var(--acc-a12),0 0 12px 2px var(--acc-a18)}
/* dotPulse (2s infinite) deleted -- the scale(1.35) + fill IS the current-step state. */
.dots i.done{background:var(--dots-done-bg);opacity:.45}
.dots i:hover:not(.on){transform:scale(1.15);background:var(--acc-a35)}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-7);margin:var(--space-8) 0 var(--space-4)}
/* ===== A FLOW CHIP MUST NOT BE WIDER THAN THE SCREEN (WCAG 1.4.10) =====
   white-space:nowrap is right for a chip that says "batch" or "back-pressure" -- you do not want a
   two-word token splitting across lines. But the chip text is AUTHORED PER TOPIC, and some topics
   put a whole sentence in one: stream-batch-processing ships
       "bounded finite dataset -> batch: all at once, ..."
   which lays out at 530px. With nowrap it cannot wrap and it cannot shrink, so on a 320px phone it
   simply ran off the right-hand edge -- and .stage{overflow-x:hidden} silently ATE the rest of the
   sentence. 45 of 385 (topic x pane x width) states were losing content this way, across 46 topics.
   NOBODY EVER SAW IT: the clip meant there was no scrollbar, no reflow, and no way for any check to
   notice. Removing the clip is what surfaced this -- which is the entire argument for removing it.

   white-space:normal lets a long chip wrap at its spaces; overflow-wrap:anywhere breaks a single
   unbreakable token only if it STILL does not fit; max-width:100% guarantees the box can never
   exceed its flex line. Short chips have no spaces and are far under the line width, so none of
   the three ever engages on them -- the existing look is unchanged. Only the sentences move. */
.fb{font:var(--font-weight-semibold) 11.5px ui-monospace,Menlo,monospace;padding:var(--space-7) var(--space-11);border-radius:8px;border:1.5px solid;white-space:normal;overflow-wrap:anywhere;max-width:100%;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-fast) var(--ease-base);cursor:default}
.fb:hover{transform:translateY(-1px) scale(1.02);box-shadow:0 4px 12px -3px var(--acc-a15)}
.fb.p{background:var(--accbg);border-color:var(--acc);color:var(--accink)}
.fb.t{background:var(--tealbg);border-color:var(--teal);color:var(--fb-t-fg)}
.fb.r{background:var(--redbg);border-color:var(--red);color:var(--fb-r-fg)}
.fb.a{background:var(--amberbg);border-color:var(--amber);color:var(--fb-a-fg)}
.fb.n{background:var(--fb-n-bg);border-color:#C9C3B8;color:var(--fb-n-fg)}
.arr{color:var(--mut2);font-weight:var(--font-weight-heavy);font-size:var(--font-size-body)}
.ins{margin-top:var(--space-14);font-size:var(--font-size-reading);color:var(--ins-fg);max-width:var(--measure);background:linear-gradient(135deg,var(--ins-bg) 0%,var(--acc-a03) 100%);border-left:3px solid var(--acc);border-radius:9px;padding:var(--space-13) var(--space-16);line-height:var(--line-height-max);box-shadow:0 1px 4px -2px var(--acc-a08);animation:insIn var(--duration-slow) var(--ease-base) var(--duration-instant) backwards}
@keyframes insIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
.ins b{color:inherit;font-weight:var(--font-weight-semibold)}
pre.code{margin:var(--space-2) var(--space-14) var(--space-13);background:linear-gradient(180deg,rgba(42,39,64,.98) 0%,rgba(36,33,58,.98) 100%),var(--code);border-radius:9px;padding:var(--space-13) var(--space-15);overflow-x:auto;font-family:ui-monospace,Menlo,monospace;font-size:var(--font-size-micro);line-height:var(--line-height-max);color:var(--codeink);position:relative;border-top:3px solid var(--acc);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 4px 12px -4px rgba(0,0,0,.3)}
pre.code .c{color:#9b95c9} pre.code .k{color:#C9A2F0} pre.code .s{color:#9DD9B6} pre.code .hl{color:#FFD479}
.codecap{font-size:var(--font-size-micro);color:var(--codecap-fg);margin:0 var(--space-14) var(--space-13);padding-left:var(--space-11);border-left:3px solid var(--acc)}
.nav{display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-16)}
.nav button{border:1.5px solid var(--bd);background:var(--card);color:var(--ink);font:var(--font-weight-semibold) 13px -apple-system,sans-serif;padding:var(--space-9) var(--space-18);border-radius:10px;cursor:pointer;transition:border-color var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base)}
.nav button:hover:not(:disabled){border-color:var(--acc);color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);box-shadow:0 4px 14px -4px var(--acc-a18);transform:translateY(-2px)}
.nav button:active:not(:disabled){transform:translateY(0) scale(.98);box-shadow:0 2px 6px -2px var(--acc-a12)}
.nav button:disabled{opacity:.32;cursor:default}
.nav .ctr{font-family:var(--mono);font-size:var(--font-size-caption);color:var(--mut2);font-weight:var(--font-weight-bold)}
details.model{margin-top:var(--space-18);background:linear-gradient(135deg,var(--card) 0%,var(--acc-a02) 100%);box-shadow:var(--surf-sh);border:1px solid var(--bd);border-left:4px solid var(--acc);border-radius:12px;overflow:hidden;transition:box-shadow var(--duration-moderate) var(--ease-base)}
details.model[open]{box-shadow:0 0 0 1px var(--acc-a08),var(--surf-sh)}
details.model>summary{cursor:pointer;list-style:none;padding:var(--space-15) var(--space-18);font:var(--font-weight-heavy) 13.5px -apple-system,sans-serif;color:var(--accink);display:flex;align-items:baseline;gap:var(--space-10);user-select:none;transition:background var(--duration-base) var(--ease-base),padding var(--duration-base) var(--ease-base)}
details.model>summary::-webkit-details-marker{display:none}
details.model>summary::before{content:"\\25B8";color:var(--acc);transition:transform var(--duration-moderate) var(--ease-spring);font-size:var(--font-size-caption);flex:none;display:inline-flex;align-items:center;justify-content:center;width:var(--space-18);height:var(--space-18);border-radius:5px;background:var(--accbg)}
details.model[open]>summary::before{transform:rotate(90deg)}
details.model>summary .sub{font-weight:var(--font-weight-semibold);color:var(--mut);font-size:var(--font-size-micro);letter-spacing:.3px}
details.model>summary:hover{background:var(--acc2-a07);padding-left:var(--space-20)}
.mbody{padding:var(--space-6) var(--space-20) var(--space-20);border-top:1px solid var(--bd)}
.mbeat .ml{display:block;font-size:var(--font-size-micro);font-weight:var(--font-weight-heavy);letter-spacing:.9px;text-transform:uppercase;color:var(--acc);margin-bottom:var(--space-4)}
.mq{margin:var(--space-17) 0 0;padding:var(--space-11) var(--space-13);background:var(--mq-bg);border-radius:9px;font-size:var(--font-size-body);max-width:var(--measure);color:var(--mut);font-style:italic}
.mbeat.ans{background:var(--accbg);border-radius:9px;padding:var(--space-11) var(--space-14);margin-top:var(--space-7)}
.mbeat.ans:last-child{padding-bottom:var(--space-11)}/* the answer box keeps its own padding; the shared .mbeat:last-child reduction (now in MBEAT_SHEET, so it cascades after this inline rule at equal specificity) is meant only for plain beats */
.arc-wrap{margin-top:var(--space-24)}
.arc-h{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:var(--space-12);display:flex;align-items:baseline;gap:var(--space-9);flex-wrap:wrap}
.arc-h .sub{font-size:var(--font-size-micro);font-weight:var(--font-weight-semibold);letter-spacing:.01em;text-transform:none;color:var(--mut2)}
/* ===== THREE COLUMNS DO NOT FIT ON A PHONE (WCAG 1.4.10, loss of content) =====
   Same defect as the drill's .dnav, one pane over: repeat(3,1fr) with no breakpoint. At 320px each
   step is ~91px, and after the number badge + gap + padding the LABEL gets ~33px -- so the step
   titles were cut by 43px at 320, 30px at 360, 20px at 390. The step names ARE the flow this pane
   exists to teach; a step you cannot read is a step that is not there.
   The ::before connector line is drawn for a 3-across row (left:8% -> right:8%, at the badge's
   y-offset). Once the grid stacks it would be a stray rule struck through the first card, so it
   goes with the third column. It is decoration at opacity .15; the steps are the content. */
.arc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-10);position:relative}
.arc-grid::before{content:"";position:absolute;top:var(--space-23);left:8%;right:8%;height:var(--space-2);background:linear-gradient(90deg,transparent 0%,var(--acc) 20%,var(--acc2) 50%,var(--acc) 80%,transparent 100%);opacity:.15;border-radius:1px;z-index:var(--z-base)}
@media (max-width:600px){.arc-grid{grid-template-columns:repeat(2,1fr)}.arc-grid::before{display:none}}
@media (max-width:400px){.arc-grid{grid-template-columns:1fr}}
/* flowLine (3s infinite) deleted -- the connector line is static now. */
.arc-step{z-index:1}
.arc-step{display:flex;align-items:center;gap:var(--space-10);text-align:left;padding:var(--space-11) var(--space-13);border-radius:11px;border:1px solid var(--bd);background:var(--surf);box-shadow:var(--surf-sh);cursor:pointer;transition:transform var(--duration-base) var(--ease-glide),box-shadow var(--duration-moderate) var(--ease-base),border-color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base);font-family:inherit;position:relative;overflow:hidden}
.arc-step::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,var(--acc-a06) 50%,transparent 60%);background-size:250% 250%;opacity:0;transition:opacity var(--duration-slow) var(--ease-base)}
.arc-step:hover::before{opacity:1}
/* stepShine (3s infinite hover shimmer) deleted -- hover reveal is instant, not a loop. */
.arc-step:hover{transform:translateY(-3px) scale(1.01) rotateX(2deg);box-shadow:var(--glow-hover),0 8px 24px -8px var(--acc-a15);border-color:var(--acc-a25);background:var(--mix-surf)}
.arc-step:active{transform:translateY(-1px) scale(.99)}
.arc-step:nth-child(3n+1):hover{transform:translateY(-3px) scale(1.01) rotateX(2deg) rotateY(-1deg)}
.arc-step:nth-child(3n+2):hover{transform:translateY(-3px) scale(1.01) rotateX(2deg) rotateY(1deg)}
.arc-n{flex:none;width:var(--space-23);height:var(--space-23);border-radius:7px;display:grid;place-items:center;font:var(--font-weight-bold) 11px -apple-system,sans-serif;background:var(--accbg);color:var(--accink);transition:background var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),transform var(--duration-base) var(--ease-spring)}
.arc-t{font-size:var(--font-size-caption);font-weight:var(--font-weight-semibold);color:var(--ink);line-height:var(--line-height-snug);overflow-wrap:anywhere}
.arc-step.on{border-color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a06) 100%);box-shadow:0 0 0 1px var(--acc),0 0 20px -6px var(--acc-a18),var(--surf-sh);transform:translateY(-2px)}
.arc-step.on .arc-n{background:linear-gradient(135deg,var(--acc),var(--acc2));color:var(--on-slab);box-shadow:0 2px 8px -2px var(--acc-a40)}
.arc-step.done .arc-n{background:transparent;color:var(--acc);box-shadow:inset 0 0 0 1.5px var(--acc)}
.arc-step.done .arc-n::after{content:"\\2713";font-size:var(--font-size-nano);margin-left:var(--space-1)}
.arc-step:active{background:var(--accbg)}
`;
var WALK_HTML = `<div class="dots" id="wdots"></div>
    <div class="card" id="wcard"></div>
    <div class="nav">
      <button type="button" id="wprev" aria-keyshortcuts="ArrowLeft">&larr; Prev</button>
      <span class="ctr" id="wctr"></span>
      <button type="button" id="wnext" aria-keyshortcuts="ArrowRight">Next &rarr;</button>
    </div>
    <details class="model">
      <summary>What a complete answer sounds like <span class="sub">model script &middot; the full arc, not just the opener</span></summary>
      <div class="mbody" id="wmbody"></div>
    </details>

    <div class="arc-wrap">
      <div class="arc-h">The whole flow <span class="sub">tap any step to jump</span></div>
      <div class="arc-grid" id="warc"></div>
    </div>`;

/* Module-level beat renderer: reproduces the former baked model-script markup
   byte-for-byte from data -- a plain beat, the interviewer .mq line, or the
   .mbeat.ans answer box. Consumed as innerHTML (renderTopic), never textContent. */
function renderBeat(b) {
  if (b.mq) return '<div class="mq">' + b.mq + '</div>';
  return '<div class="mbeat' + (b.ans ? ' ans' : '') + '"><span class="ml">' + b.ml + '</span>' + b.t + '</div>';
}

class DeepWalkthrough extends TopicPane {
  static dataKey = 'walk';
  sheets()    { return [BASE_SHEET, MBEAT_SHEET, DISC_SHEET]; }
  styleText() { return WALK_STYLE; }
  skeleton()  { return WALK_HTML; }
  init(root) {
    this._card = root.getElementById('wcard');
    this._dots = root.getElementById('wdots');
    this._ctr = root.getElementById('wctr');
    this._prev = root.getElementById('wprev');
    this._next = root.getElementById('wnext');
    this._arc = root.getElementById('warc');
    this._mbody = root.getElementById('wmbody');
    var self = this;
    this._prev.onclick = function () { self.prev(); };
    this._next.onclick = function () { self.next(); };
    /* ONE delegated arc click on the stable #warc mount: the per-step buttons are
       rebuilt (count-dependent) in renderTopic, so the listener lives on the parent
       and reads data-i. */
    this._arc.addEventListener('click', function (e) {
      var btn = e.target.closest('.arc-step');
      if (!btn) return;
      self._wi = +btn.getAttribute('data-i');
      self._renderW();
    });
  }
  renderTopic(d) {
    this._steps = d.steps;
    this._wi = 0;
    /* COUNT-dependent structure rebuilds HERE (not init): a topic with != 9 steps
       must not keep stale dots/arc buttons. */
    this._dots.innerHTML = '';
    for (var i = 0; i < this._steps.length; i++) { this._dots.appendChild(document.createElement('i')); }
    this._arc.innerHTML = '';
    for (var j = 0; j < this._steps.length; j++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'arc-step';
      btn.setAttribute('data-i', j);
      btn.innerHTML = '<span class="arc-n">' + (j + 1) + '</span><span class="arc-t">' + this._steps[j].t + '</span>';
      this._arc.appendChild(btn);
    }
    /* model-script is data now (was a baked blob); .mbeat.ans stays LAST. */
    this._mbody.innerHTML = (d.modelScript || []).map(renderBeat).join('');
    this._renderW();
  }
  _renderW() {
    const step = this._steps[this._wi];
    let html = '<div class="step-k">' + step.k + '</div><div class="step-t">' + step.t + '</div>' +
      '<div class="flow">' + step.flow + '</div><div class="ins">' + step.ins + '</div>';
    if (step.deep) { html += '<details class="disc"><summary>Go deeper</summary><div class="body">' + step.deep + '</div></details>'; }
    /* A step may carry MORE THAN ONE code block: step.code/.cap is the first (the shape the
       hand-coded topics use -- unchanged for them), and step.blocks holds any further
       {code, cap} pairs, rendered into the SAME disclosure so the summary is not repeated.
       Before this, a second fence in one markdown step silently annihilated the first at
       compile time (parse_md.mjs F7). */
    if (step.code) {
      html += '<details class="disc"><summary>See the code</summary><pre class="code">' + step.code + '</pre><div class="codecap">' + step.cap + '</div>';
      var blocks = step.blocks || [];
      for (var b = 0; b < blocks.length; b++) {
        html += '<pre class="code">' + blocks[b].code + '</pre><div class="codecap">' + blocks[b].cap + '</div>';
      }
      html += '</details>';
    }
    this._card.innerHTML = html;
    const dots = this._dots.children;
    for (let i = 0; i < dots.length; i++) { dots[i].className = i < this._wi ? 'done' : (i === this._wi ? 'on' : ''); }
    const arcSteps = this._arc.children;
    for (let i = 0; i < arcSteps.length; i++) { arcSteps[i].className = 'arc-step' + (i < this._wi ? ' done' : (i === this._wi ? ' on' : '')); }
    this._ctr.textContent = (this._wi + 1) + ' of ' + this._steps.length;
    this._prev.disabled = this._wi === 0;
    this._next.disabled = this._wi === this._steps.length - 1;
  }
  prev() { if (this._wi > 0) { this._wi--; this._renderW(); } }
  next() { if (this._wi < this._steps.length - 1) { this._wi++; this._renderW(); } }
}
customElements.define('deep-walkthrough', DeepWalkthrough);
})();
