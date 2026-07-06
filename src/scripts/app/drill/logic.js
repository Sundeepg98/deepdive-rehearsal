/* ============ PROBE DRILL ============ */
/* The drill is a TopicPane (built once, re-rendered in place on topic switch).
   cards / speakLines are the registry-owned working-set globals (declared in
   topic-protocol.js, seeded by publishBanks from the bank); the real probe bank
   lives in topics/content-pipeline/drill.js. The component reads + reassigns the
   working set to filtered subsets. Stats reach session-progress via getStats(). */
var DRILL_TIER_CLASS = { SDE2: 't2', SDE3: 't3', Staff: 'tS', EXTEND: 'tX' };
var DRILL_TIER_NOTES = {};  /* per-topic; renderTopic sets this from the topic data (the 4 notes now live in topics/content-pipeline/drill.js) */
/* cards / speakLines (the reassignable WORKING set) and _allCards / _allSpeak (the
   immutable originals) are declared + owned by topic-protocol.js (foundation) and
   seeded by publishBanks() from topics/content-pipeline/drill.js's bank. SHARED:
   mixed-fire.js reads _allCards to assemble its probe set; drill reads them as before. */
var DRILL_HTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-12)">
      <div class="modetog" id="modetog">
        <button type="button" class="on" data-m="study">Study</button>
        <button type="button" data-m="mock">Mock round</button>
        <button type="button" data-m="quick">Quick 5</button>
      </div>
      <div class="timer" id="timer" role="timer" aria-live="polite" aria-label="Mock round time remaining" style="display:none">22:00</div>
    </div>
    <div class="tierrow"><span class="tierlab">Focus by level</span><div class="modetog" id="tiertog"><button class="on" data-tier="all" type="button">All 20</button><button data-tier="SDE2" type="button">SDE2</button><button data-tier="SDE3" type="button">SDE3</button><button data-tier="Staff" type="button">Staff</button></div></div>
    <div class="tiernote" id="tiernote"><b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.</div>
    <div class="dbar"><i id="dfill"></i></div>
    <div class="score">
      <div class="pill g"><div class="v" id="sGot">0</div><div class="l">Solid</div></div>
      <div class="pill s"><div class="v" id="sShk">0</div><div class="l">Revisit</div></div>
      <div class="pill left"><div class="v" id="sLeft">0</div><div class="l">Left</div></div>
    </div>
    <div class="revset" id="revset" style="display:none"><button type="button" id="revdrill" class="revset-b">&#8635; Drill my <b id="revn">0</b> flagged <span id="revw">probes</span></button><span class="revset-h">your Revisit pile across this session &middot; clears as you nail them</span></div>
    <div id="dwrap"></div>
    <div class="dnav-wrap"><div class="dnav-h">Your drill set <span class="sub">tap a probe to jump &middot; flagged ones are marked</span></div><div class="dnav" id="dnav"></div></div>`;
var DRILL_STYLE = `@keyframes pop{from{opacity:0;transform:translateY(7px) scale(.99)}to{opacity:1;transform:none}}
@keyframes cbump{0%{transform:scale(1)}28%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

.modetog{display:inline-flex;gap:var(--space-4);background:var(--modetog-bg);border:1px solid var(--modetog-bd);border-radius:9px;padding:var(--space-4)}
.modetog button{border:0;background:transparent;color:var(--mut);font:var(--font-weight-bold) 12px -apple-system,sans-serif;padding:var(--space-13) var(--space-14);border-radius:8px;cursor:pointer;transition:color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base),transform var(--duration-fast) var(--ease-base)}
.modetog button.on{background:var(--card);color:var(--acc);font-weight:var(--font-weight-heavy);box-shadow:0 0 0 1px rgba(83,74,183,.32),0 4px 12px rgba(83,74,183,.22)}
.modetog button:not(.on):hover{background:var(--modetog-hover-bg);color:var(--ink)}
.tierrow{display:flex;align-items:center;gap:var(--space-9);margin:var(--space-2) 0 var(--space-16);flex-wrap:wrap}
.tierlab{font:var(--font-weight-bold) 9.5px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2)}
.tiernote{font:italic 12px/1.55 -apple-system,sans-serif;color:var(--mut);margin:-6px 0 var(--space-18);max-width:62ch}
.tiernote b{color:var(--acc);font-style:normal;font-weight:var(--font-weight-heavy)}
.timer{font:var(--font-weight-heavy) 15px ui-monospace,Menlo,monospace;color:var(--acc);background:var(--accbg);border:1px solid #cfc7f0;border-radius:8px;padding:var(--space-6) var(--space-13)}
.timer.low{color:var(--red);background:var(--redbg);border-color:#e8c5c0;animation:pulse var(--duration-slowest) infinite}
.dbar{height:var(--space-7);background:var(--dbar-bg);border-radius:7px;overflow:hidden;margin-bottom:var(--space-16);box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}
.dbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--acc),var(--acc2) 60%,#8B7FE8);transition:width var(--duration-slow) var(--ease-glide);position:relative;overflow:hidden;border-radius:7px}
.dbar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.25) 50%,transparent 100%);animation:barShimmer var(--duration-slowest) ease-in-out infinite}
@keyframes barShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.score{display:flex;gap:var(--space-9);margin-bottom:var(--space-14)}
.pill{flex:1;text-align:center;border:1px solid var(--bd);border-radius:12px;padding:var(--space-10);background:linear-gradient(135deg,var(--card) 0%,rgba(83,74,183,.02) 100%);transition:box-shadow var(--duration-moderate) var(--ease-base),transform var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.pill:hover{box-shadow:0 4px 16px -4px rgba(83,74,183,.14);transform:translateY(-2px);border-color:rgba(83,74,183,.15)}
.pill .v{font-size:var(--font-size-heading);font-weight:var(--font-weight-heavy);line-height:1;transition:transform var(--duration-base) var(--ease-spring)}
.pill:hover .v{transform:scale(1.08)}
.pill .l{font-size:var(--font-size-nano);font-weight:var(--font-weight-bold);text-transform:uppercase;letter-spacing:.5px;color:var(--mut2);margin-top:var(--space-4)}
.pill.g .v{color:var(--teal)} .pill.s .v{color:var(--amber)} .pill.left .v{color:var(--acc)}
.pill.z .v{color:var(--mut)} .pill.z{opacity:.7}
.revset{display:flex;align-items:center;gap:var(--space-11);flex-wrap:wrap;margin:var(--space-2) 0 var(--space-18)}
.revset-b{font:var(--font-weight-semibold) 13px -apple-system,system-ui,sans-serif;color:var(--accink);background:var(--accbg);border:1px solid var(--acc);border-radius:8px;padding:var(--space-7) var(--space-13);cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast),transform var(--duration-instant);display:inline-flex;align-items:center;gap:var(--space-6)}
.revset-b:hover{background:var(--acc);color:var(--bg)}
.revset-b:active{transform:translateY(1px)}
.revset-b:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.revset-b b{font-weight:var(--font-weight-heavy)}
.revset-h{font-size:var(--font-size-caption);color:var(--mut);font-style:italic}
.thread{border:1.5px solid var(--bd);border-radius:14px;padding:var(--space-20);background:linear-gradient(135deg,var(--thread-bg) 0%,rgba(83,74,183,.015) 100%);box-shadow:var(--surf-sh);transition:box-shadow var(--duration-moderate) var(--ease-base)}
.thread:hover{box-shadow:var(--surf-sh),0 0 30px -8px rgba(83,74,183,.06)}
.qrow{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-12);margin-bottom:var(--space-4)}
.qk{font-family:var(--mono);font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.4px;text-transform:uppercase;color:var(--acc)}
.sigtag{font-size:var(--font-size-nano);color:var(--mut2);font-weight:var(--font-weight-bold);margin-top:var(--space-5);letter-spacing:.2px}
.sigtag b{color:var(--acc)}
.tier{display:inline-block;font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.8px;text-transform:uppercase;padding:var(--space-3) var(--space-8);border-radius:5px;border:1px solid;white-space:nowrap}
.tier.t2{color:var(--teal);background:var(--tealbg);border-color:var(--senior-bd)}
.tier.t3{color:var(--accink);background:var(--accbg);border-color:#cfc7f0}
.tier.tS{color:var(--red);background:var(--redbg);border-color:#e8c5c0}
.tier.tX{color:#fff;background:var(--indigo);border-color:var(--indigo)}
.speak{margin-top:var(--space-11);font-size:var(--font-size-caption);color:var(--speak-fg);background:var(--accbg);border:1px solid #cfc7f0;border-radius:9px;padding:var(--space-12) var(--space-14);animation:pop var(--duration-moderate) var(--ease-base)}
.speak .sl{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.8px;text-transform:uppercase;color:var(--acc);display:flex;align-items:center;gap:var(--space-6);margin-bottom:var(--space-5)}
.speak .sl::before{content:"\\1F5E3"}
.speak b{color:var(--accink)}
.debrief .big{font-size:var(--font-size-display);font-weight:var(--font-weight-heavy);text-align:center;margin-bottom:var(--space-4)}
.debrief .sumline{text-align:center;color:var(--mut);font-size:var(--font-size-small);margin-bottom:var(--space-18)}
.sigrow{display:flex;align-items:center;gap:var(--space-11);padding:var(--space-11) 0;border-bottom:1px solid var(--sigrow-bd)}
.sigrow:last-of-type{border-bottom:0}
.sigrow .mk{flex:none;width:var(--space-24);height:var(--space-24);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--font-size-small);font-weight:var(--font-weight-heavy);color:#fff}
.sigrow.ok .mk{background:var(--teal)} .sigrow.no .mk{background:var(--amber)} .sigrow.miss .mk{background:var(--red)}
.sigrow .nm{font-size:var(--font-size-small);font-weight:var(--font-weight-semibold)}
.sigrow .tr{margin-left:auto}
.verdict{margin-top:var(--space-18);font-size:var(--font-size-small);color:var(--ans-fg);background:var(--ans-bg);border-left:3px solid var(--acc);border-radius:9px;padding:var(--space-14) var(--space-16)}
.verdict b{color:var(--accink)}
.debrief button{margin-top:var(--space-18);display:block;width:100%;border:1.5px solid var(--acc);background:#fff;color:var(--acc);font:var(--font-weight-bold) 13px -apple-system,sans-serif;padding:var(--space-12);border-radius:10px;cursor:pointer}
.debrief .btn-sec{margin-top:var(--space-14);display:block;width:100%;border:1.5px solid var(--teal);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);color:var(--fb-t-fg);font:var(--font-weight-bold) 13px -apple-system,sans-serif;padding:var(--space-12);border-radius:10px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),filter var(--duration-base) var(--ease-base)}
.debrief .btn-sec:hover{transform:translateY(-1px);box-shadow:0 4px 14px -4px rgba(10,133,100,.2);filter:brightness(1.02)}
.debrief .btn-sec:active{transform:translateY(1px) scale(.98)}
.debrief .btn-sec:hover{background:var(--btnsec-hover-bg)}
.btn-sec:active{transform:translateY(1px);filter:brightness(.96)}
.rec{text-align:center;margin-bottom:var(--space-6)}
.rec .lvl{display:inline-block;font-size:var(--font-size-heading);font-weight:var(--font-weight-heavy);letter-spacing:-.3px;padding:var(--space-10) var(--space-24);border-radius:12px;border:2px solid;box-shadow:0 2px 8px -2px rgba(83,74,183,.1);transition:transform var(--duration-base) var(--ease-spring),box-shadow var(--duration-moderate) var(--ease-base)}
.rec.sh .lvl{color:#0a5240;background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.08) 100%);border-color:var(--teal);box-shadow:0 2px 8px -2px rgba(10,133,100,.15)}
.rec.h .lvl{color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.06) 100%);border-color:var(--acc);box-shadow:0 2px 8px -2px rgba(83,74,183,.15)}
.rec.lh .lvl{color:var(--fb-a-fg);background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.06) 100%);border-color:var(--amber);box-shadow:0 2px 8px -2px rgba(176,108,20,.15)}
.rec.nh .lvl{color:var(--fb-r-fg);background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.06) 100%);border-color:var(--red);box-shadow:0 2px 8px -2px rgba(239,68,68,.15)}
.rec .tu{font-size:var(--font-size-caption);color:var(--mut2);margin-top:var(--space-10);font-weight:var(--font-weight-bold)}
.cbump{animation:cbump var(--duration-slow) var(--ease-base)}
.dnav-wrap{margin-top:var(--space-22)}
.dnav-h{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:var(--space-12);display:flex;align-items:baseline;gap:var(--space-9);flex-wrap:wrap}
.dnav-h .sub{font-size:var(--font-size-micro);font-weight:var(--font-weight-semibold);letter-spacing:.01em;text-transform:none;color:var(--mut2)}
.dnav{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-8)}
.dn-step{display:flex;align-items:center;gap:var(--space-10);text-align:left;padding:var(--space-10) var(--space-12);border-radius:11px;border:1px solid var(--bd);background:linear-gradient(135deg,var(--surf) 0%,rgba(83,74,183,.015) 100%);box-shadow:var(--surf-sh);cursor:pointer;transition:transform var(--duration-base) var(--ease-glide),box-shadow var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base);font-family:inherit;min-width:0;position:relative;overflow:hidden}
.dn-step:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 6px 20px -6px rgba(83,74,183,.14);border-color:rgba(83,74,183,.2);background:linear-gradient(135deg,var(--mix-surf) 0%,rgba(83,74,183,.04) 100%)}
.dn-n{flex:none;width:var(--space-22);height:var(--space-22);border-radius:7px;display:grid;place-items:center;font:var(--font-weight-bold) 10.5px -apple-system,sans-serif;background:var(--accbg);color:var(--accink);transition:background var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),transform var(--duration-base) var(--ease-spring)}
.dn-t{font-size:var(--font-size-micro);font-weight:var(--font-weight-semibold);color:var(--ink);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dn-step.on{border-color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.06) 100%);box-shadow:0 0 0 1px var(--acc),0 4px 14px -4px rgba(83,74,183,.12);transform:translateY(-1px)}
.dn-step.on .dn-n{background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;box-shadow:0 2px 6px -2px rgba(83,74,183,.3)}
.dn-step.flag{border-color:var(--amber);background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.04) 100%)}
.dn-step.flag .dn-n{background:linear-gradient(135deg,var(--amber),#d4902a);color:#fff}
.dn-step:active{transform:translateY(0) scale(.99)}
.mhp{margin-top:var(--space-14);border:1px solid var(--bd);border-radius:12px;padding:var(--space-14) var(--space-16);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.02) 100%);animation:pop var(--duration-moderate) var(--ease-base)}
.mhp-h{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--acc)}
.mhp-h .mhp-sub{display:block;margin-top:var(--space-3);font:var(--font-weight-semibold) 11px -apple-system,sans-serif;letter-spacing:0;text-transform:none;color:var(--mut2)}
.mhp-list{display:flex;flex-direction:column;gap:var(--space-7);margin-top:var(--space-10)}
.mhp-i{display:flex;align-items:flex-start;gap:var(--space-10);width:100%;text-align:left;border:1px solid var(--bd);background:var(--card);border-radius:9px;padding:var(--space-9) var(--space-11);cursor:pointer;font:inherit;transition:border-color var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base)}
.mhp-i:hover{border-color:rgba(83,74,183,.3)}
.mhp-box{flex:none;width:var(--space-18);height:var(--space-18);border-radius:5px;border:1.5px solid var(--mut2);display:flex;align-items:center;justify-content:center;font-size:var(--font-size-micro);color:transparent;transition:background var(--duration-fast) var(--ease-base),border-color var(--duration-fast) var(--ease-base),color var(--duration-fast) var(--ease-base)}
.mhp-i.on{border-color:var(--teal);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%)}
.mhp-i.on .mhp-box{background:var(--teal);border-color:var(--teal);color:#fff}
.mhp-t{font-size:var(--font-size-caption);line-height:1.4;color:var(--ink);font-weight:var(--font-weight-semibold)}
.mhp-cov{margin-top:var(--space-11);font-size:var(--font-size-caption);color:var(--mut);font-weight:var(--font-weight-semibold)}
.mhp-cov b{color:var(--accink);font-weight:var(--font-weight-heavy)}
.judge .got.j-rec,.judge .shk.j-rec,.judge .miss.j-rec{box-shadow:0 0 0 2px var(--acc),0 6px 16px -5px rgba(83,74,183,.32)}
.sigdrop{font-size:var(--font-size-micro);color:var(--fb-a-fg);font-weight:var(--font-weight-semibold);margin-top:var(--space-2)}`;

/* Fisher-Yates shuffle of [0..count). SHARED: mixed-fire.js calls it too,
   so it stays a module-level global rather than a component method. */
function dShuffle(count) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}
class DeepDrill extends TopicPane {
  static dataKey = 'drill';
  sheets()    { return [BASE_SHEET, ANS_SHEET]; }
  styleText() { return DRILL_STYLE; }
  skeleton()  { return DRILL_HTML; }
  init(root) {
    /* one-time HOST state not reset per-topic (renderTopic/setMode reset the rest) */
    this.timerId = null; this.mockLeft = 0; this.revisit = {};
    this._dwrap = root.getElementById('dwrap'); this._dfill = root.getElementById('dfill');
    this._sGot = root.getElementById('sGot'); this._sShk = root.getElementById('sShk'); this._sLeft = root.getElementById('sLeft');
    this._timerEl = root.getElementById('timer');
    this._modetog = root.getElementById('modetog'); this._tiertog = root.getElementById('tiertog');
    this._tiernote = root.getElementById('tiernote');
    const self = this;
    /* DELEGATED listeners wired ONCE on the stable shell nodes: dnav contents are
       rebuilt every draw; modetog / tiertog / revdrill live in the invariant skeleton. */
    root.getElementById('dnav').addEventListener('click', function (event) {
      const btn = event.target.closest('.dn-step');
      if (btn) { self.di = +btn.getAttribute('data-i'); self.renderD(); }
    });
    this._modetog.addEventListener('click', function (event) {
      const btn = event.target.closest('button');
      if (btn) self.setMode(btn.getAttribute('data-m'));
    });
    this._tiertog.addEventListener('click', function (event) {
      const btn = event.target.closest('button');
      if (btn) self.setTier(btn.getAttribute('data-tier'));
    });
    root.getElementById('revdrill').addEventListener('click', function () { self.drillRevset(); });
  }
  renderTopic(d) {
    /* registry already reseeded cards / _allCards via publishBanks before this fires */
    DRILL_TIER_NOTES = d.tierNotes;
    this.tierFilter = 'all'; this.revisitMode = false;
    for (let z = 0; z < this._tiertog.children.length; z++) {
      this._tiertog.children[z].classList.toggle('on', this._tiertog.children[z].getAttribute('data-tier') === 'all');
    }
    if (this._tiernote) this._tiernote.innerHTML = d.tierNotes.all;
    const allBtn = this._tiertog.querySelector('[data-tier="all"]');
    if (allBtn) allBtn.textContent = 'All ' + _allCards.length;
    this.setMode('study');
  }
  teardownTopic() {
    this.stopTimer();
    this.di = 0; this.got = 0; this.shk = 0; this.results = [];
    this.revisit = {}; this.revisitMode = false;
  }
  renderNav() {
    const nav = this._root.getElementById('dnav');
    if (!nav) return;
    let html = '';
    for (let k = 0; k < cards.length; k++) {
      const card = cards[k], originalIdx = _allCards.indexOf(card), flagged = this.revisit[originalIdx];
      html += '<button type="button" class="dn-step' + (k === this.di ? ' on' : '') + (flagged ? ' flag' : '') + '" data-i="' + k + '"><span class="dn-n">' + (k + 1) + '</span><span class="dn-t">' + card.signal + '</span></button>';
    }
    nav.innerHTML = html;
  }
  renderD() {
    this._sGot.textContent = this.got; this._sGot.parentNode.classList.toggle('z', this.got === 0);
    this._sShk.textContent = this.shk; this._sShk.parentNode.classList.toggle('z', this.shk === 0);
    this._sLeft.textContent = cards.length - this.di; this._sLeft.parentNode.classList.toggle('z', cards.length - this.di === 0);
    this._dfill.style.width = (this.di / cards.length * 100) + '%';
    this.renderNav();
    if (this.di >= cards.length) {
      if (this.mode === 'mock') { this.renderVerdict(); } else { this.renderDebrief(); }
      this.updRevset();
      return;
    }
    this.drawCard(0);
    this.updRevset();
  }
  /* The must-hit points for a probe = the bolded <b> terms already curated into
     its own answer + senior tell. Pure curation of existing content (no new
     copy); parsed via a throwaway element so entities/nested tags resolve to
     clean text. Author-controlled card data, so innerHTML here is safe. */
  _mustHit(card) {
    const tmp = document.createElement('div');
    tmp.innerHTML = (card.a || '') + ' ' + (card.senior || '');
    const bs = tmp.querySelectorAll('b'), seen = {}, out = [];
    for (let i = 0; i < bs.length; i++) {
      const t = (bs[i].textContent || '').trim().replace(/[\s:;,.]+$/, '');
      const key = t.toLowerCase();
      if (t && t.length <= 64 && !seen[key]) { seen[key] = 1; out.push(t); }
    }
    return out;
  }
  /* Live coverage readout + a coverage-derived recommendation on the grade
     buttons -- full coverage points at Solid, a gap points at Revisit. */
  _updCov() {
    const m = this._mhp ? this._mhp.length : 0;
    let n = 0;
    for (const k in this._cov) { if (this._cov[k]) n++; }
    const nEl = this._root.getElementById('mhpN'); if (nEl) nEl.textContent = n;
    const recEl = this._root.getElementById('mhpRec');
    const jg = this._root.getElementById('jg'), js = this._root.getElementById('js'), jm = this._root.getElementById('jm');
    const full = m > 0 && n >= m, none = m > 0 && n === 0, partial = m > 0 && n > 0 && n < m;
    if (jg) jg.classList.toggle('j-rec', full);
    if (js) js.classList.toggle('j-rec', partial);
    if (jm) jm.classList.toggle('j-rec', none);
    if (recEl) recEl.textContent = m === 0 ? '' : (full ? 'all covered \u2014 Solid' : none ? 'none covered \u2014 Missed' : ('dropped ' + (m - n) + ' \u2014 Shaky'));
  }
  drawCard(stage) {
    const self = this;
    const card = cards[this.di], maxStage = 1 + card.f.length;
    let html = '<div class="card"><div class="thread">' +
      '<div class="qrow"><div><div class="qk">Probe ' + (this.di + 1) + ' / ' + cards.length + '</div>' +
      '<div class="sigtag">signal &middot; <b>' + card.signal + '</b></div></div>' +
      '<span class="tier ' + DRILL_TIER_CLASS[card.tier] + '">' + card.tier + '</span></div>' +
      '<div class="qq">' + card.q + '</div>';
    if (stage >= 1) { html += '<div class="ans' + (stage === 1 ? ' dnr' : '') + '">' + card.a + '</div>'; }
    for (let k = 0; k < card.f.length; k++) {
      if (stage >= 2 + k) {
        html += '<div class="fu"><div class="lab">Interviewer pushes further</div>' +
          '<div class="fq">' + card.f[k].q + '</div><div class="fa">' + card.f[k].a + '</div></div>';
      }
    }
    if (stage >= maxStage) {
      html += '<div class="senior"><div class="sl">What sounds senior here</div>' + card.senior + '</div>';
      html += '<div class="speak"><div class="sl">Say it out loud like this</div>' + speakLines[this.di] + '</div>';
    }
    html += '</div>';
    if (stage < maxStage) {
      html += '<button type="button" class="push' + (stage >= 1 ? ' more' : '') + '" id="adv">' +
        (stage < 1 ? 'Reveal answer' : '&#8627; Interviewer pushes further') + '</button>';
    } else {
      /* grounded scoring: surface this probe's must-hit points as a checklist so
         the Solid/Revisit call reflects actual coverage, not a gut feel */
      this._mhp = this._mustHit(card); this._cov = {};
      if (this._mhp.length) {
        let items = '';
        for (let i = 0; i < this._mhp.length; i++) {
          items += '<button type="button" class="mhp-i" data-i="' + i + '" aria-pressed="false"><span class="mhp-box">&#10003;</span><span class="mhp-t">' + this._mhp[i] + '</span></button>';
        }
        html += '<div class="mhp"><div class="mhp-h">Must-hit points<span class="mhp-sub">tick what you actually said &middot; your score reflects coverage</span></div>' +
          '<div class="mhp-list">' + items + '</div>' +
          '<div class="mhp-cov">Covered <b id="mhpN">0</b> / ' + this._mhp.length + ' &middot; <span id="mhpRec"></span></div></div>';
      }
      html += '<div class="judge"><button type="button" class="miss" id="jm">&#10007; Missed <span class="hint">[1]</span></button>' +
        '<button type="button" class="shk" id="js">&#126; Shaky <span class="hint">[2]</span></button>' +
        '<button type="button" class="got" id="jg">&#10003; Solid <span class="hint">[3]</span></button></div>';
    }
    html += '</div>';
    this._dwrap.innerHTML = html;
    const advBtn = this._root.getElementById('adv');
    if (advBtn) { advBtn.onclick = function () { self.drawCard(stage + 1); }; }
    const missBtn = this._root.getElementById('jm');
    if (missBtn) { missBtn.onclick = function () { self.judge(1); }; }
    const shkBtn = this._root.getElementById('js');
    if (shkBtn) { shkBtn.onclick = function () { self.judge(2); }; }
    const gotBtn = this._root.getElementById('jg');
    if (gotBtn) { gotBtn.onclick = function () { self.judge(3); }; }
    const mhpList = this._dwrap.querySelector('.mhp-list');
    if (mhpList) {
      mhpList.addEventListener('click', function (event) {
        const it = event.target.closest('.mhp-i');
        if (!it) return;
        const i = +it.getAttribute('data-i');
        self._cov[i] = !self._cov[i];
        it.classList.toggle('on', !!self._cov[i]);
        it.setAttribute('aria-pressed', self._cov[i] ? 'true' : 'false');
        self._updCov();
      });
      this._updCov();
    }
  }
  judge(level) {
    /* R5: level is 1 (missed) / 2 (shaky) / 3 (solid). got/shk stay derived --
       solid (3) is a "got", missed + shaky (1,2) are "to revisit" -- so every
       downstream consumer (debrief, weak-drill, session-progress, persistence) is
       untouched; the finer level rides on the result for the richer debrief and a
       missed-first re-drill. A bare boolean is still accepted defensively. */
    if (level === true) level = 3; else if (level === false) level = 2;
    const solid = (level >= 3);
    const card = cards[this.di];
    if (solid) this.got++; else this.shk++;
    const originalIdx = _allCards.indexOf(card);
    if (originalIdx > -1) { if (solid) { delete this.revisit[originalIdx]; } else { this.revisit[originalIdx] = true; } }
    /* grounded coverage: how many must-hit points were ticked, and which dropped */
    const mhp = this._mhp || [], cov = this._cov || {}, dropped = [];
    let covered = 0;
    for (let i = 0; i < mhp.length; i++) { if (cov[i]) covered++; else dropped.push(mhp[i]); }
    this.results.push({ signal: card.signal, tier: card.tier, ok: solid, level: level, card: card, speak: speakLines[this.di], cov: { n: covered, m: mhp.length, dropped: dropped } });
    this.di++;
    this.renderD();
    try { this.dispatchEvent(new CustomEvent('drillgraded', { bubbles: true })); } catch (e) {}
    const bumpEl = solid ? this._sGot : this._sShk;
    if (bumpEl) { bumpEl.classList.remove('cbump'); void bumpEl.offsetWidth; bumpEl.classList.add('cbump'); }
  }
  renderDebrief() {
    const self = this;
    const pct = Math.round(this.got / cards.length * 100);
    let nMissed = 0, nShaky = 0, nSolid = 0;
    for (let ri = 0; ri < this.results.length; ri++) { const _l = this.results[ri].level || (this.results[ri].ok ? 3 : 2); if (_l >= 3) nSolid++; else if (_l === 2) nShaky++; else nMissed++; }
    const sumParts = [];
    if (nMissed) sumParts.push(nMissed + ' missed');
    if (nShaky) sumParts.push(nShaky + ' shaky');
    sumParts.push(nSolid + ' solid');
    let rows = '';
    for (let r = 0; r < this.results.length; r++) {
      const entry = this.results[r];
      const drop = (!entry.ok && entry.cov && entry.cov.dropped && entry.cov.dropped.length) ? '<div class="sigdrop">dropped: ' + entry.cov.dropped.join(', ') + '</div>' : '';
      const _lv = entry.level || (entry.ok ? 3 : 2), _cls = _lv >= 3 ? 'ok' : (_lv === 2 ? 'no' : 'miss'), _mk = _lv >= 3 ? '\u2713' : (_lv === 2 ? '\u007e' : '\u2717');
      rows += '<div class="sigrow ' + _cls + '"><div class="mk">' + _mk + '</div>' +
        '<div class="nm">' + entry.signal + drop + '</div><div class="tr"><span class="tier ' + DRILL_TIER_CLASS[entry.tier] + '">' + entry.tier + '</span></div></div>';
    }
    let verdict;
    if (pct >= 80) verdict = 'You\'re carrying the signals a senior loop grades on. The shaky ones are polish, not gaps &mdash; re-run those threads until the <b>senior-signal line</b> comes out unprompted.';
    else if (pct >= 50) verdict = 'Solid core, real gaps. The signals you marked <b>Revisit</b> are exactly what an interviewer probes to separate levels &mdash; drill those threads to the last layer before the real round.';
    else verdict = 'You know the happy path; the depth isn\'t there yet. Work the <b>Walkthrough</b> + <b>See the code</b>, then re-run &mdash; the follow-up chains are where this round is won or lost.';
    const weakBtn = this.shk > 0 ? '<button type="button" id="dweak" class="btn-sec">Drill my ' + this.shk + ' Revisit ' + (this.shk === 1 ? 'probe' : 'probes') + ' \u2192</button>' : '';
    this._dwrap.innerHTML = '<div class="card debrief"><div class="big">' + (this.mode === 'quick' ? 'Quick 5 debrief' : 'Interviewer debrief') + '</div>' +
      '<div class="sumline">' + sumParts.join(' &middot; ') + ' &middot; ' + pct + '% ' + (this.mode === 'quick' ? 'of a quick 5' : 'signal coverage') + '</div>' +
      rows + '<div class="verdict">' + verdict + '</div>' + weakBtn +
      '<button type="button" id="drestart">' + (this.mode === 'quick' ? 'Another quick 5 &rarr;' : 'Run the full round again') + '</button></div>';
    if (this.shk > 0) { this._root.getElementById('dweak').onclick = function () { self.drillWeak(); }; }
    this._root.getElementById('drestart').onclick = function () { self.setMode(self.mode); };
  }
  drillWeak() {
    const weakCards = this.results.filter(function (r) { return !r.ok; }).sort(function (a, b) { return (a.level || (a.ok ? 3 : 2)) - (b.level || (b.ok ? 3 : 2)); });
    if (!weakCards.length) return false;
    cards = weakCards.map(function (r) { return r.card; });
    speakLines = weakCards.map(function (r) { return r.speak; });
    this.di = 0; this.got = 0; this.shk = 0; this.results = []; this.revisitMode = true;
    this.renderD();
    return true;
  }
  drillRevset() {
    const self = this;
    const indices = [];
    for (let key in this.revisit) { if (this.revisit.hasOwnProperty(key)) indices.push(+key); }
    if (!indices.length) return;
    indices.sort(function (a, b) { return a - b; });
    cards = indices.map(function (i) { return _allCards[i]; });
    speakLines = indices.map(function (i) { return _allSpeak[i]; });
    this.di = 0; this.got = 0; this.shk = 0; this.results = []; this.revisitMode = true;
    this.stopTimer();
    this.renderD();
  }
  updRevset() {
    let count = 0;
    for (let key in this.revisit) { if (this.revisit.hasOwnProperty(key)) count++; }
    const box = this._root.getElementById('revset');
    if (!box) return;
    if (count > 0 && !this.revisitMode && this.di < cards.length) {
      box.style.display = '';
      this._root.getElementById('revn').textContent = count;
      this._root.getElementById('revw').textContent = (count === 1 ? 'probe' : 'probes');
    } else {
      box.style.display = 'none';
    }
  }
  _fmt(s) { const minutes = Math.floor(s / 60), seconds = s % 60; return minutes + ':' + (seconds < 10 ? '0' : '') + seconds; }
  startTimer() {
    const self = this;
    this.mockLeft = 22 * 60;
    this._timerEl.textContent = this._fmt(this.mockLeft);
    this._timerEl.style.display = 'block';
    this._timerEl.classList.remove('low');
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(function () {
      self.mockLeft--;
      self._timerEl.textContent = self._fmt(self.mockLeft);
      if (self.mockLeft <= 60) self._timerEl.classList.add('low');
      if (self.mockLeft <= 0) { clearInterval(self.timerId); self.timerId = null; self.di = cards.length; self.renderD(); }
    }, 1000);
  }
  stopTimer() { if (this.timerId) { clearInterval(this.timerId); this.timerId = null; } this._timerEl.style.display = 'none'; }
  basePoolIdx() {
    const indices = [];
    for (let i = 0; i < _allCards.length; i++) {
      if (this.tierFilter === 'all' || _allCards[i].tier === this.tierFilter) indices.push(i);
    }
    return indices;
  }
  setMode(m) {
    const self = this;
    this.mode = m;
    const base = this.basePoolIdx();
    if (m === 'quick') {
      const quickIdx = dShuffle(base.length).slice(0, 5).map(function (i) { return base[i]; });
      cards = quickIdx.map(function (i) { return _allCards[i]; });
      speakLines = quickIdx.map(function (i) { return _allSpeak[i]; });
    } else {
      cards = base.map(function (i) { return _allCards[i]; });
      speakLines = base.map(function (i) { return _allSpeak[i]; });
    }
    this.di = 0; this.got = 0; this.shk = 0; this.results = []; this.revisitMode = false;
    const modeBtns = this._modetog.children;
    for (let z = 0; z < modeBtns.length; z++) modeBtns[z].classList.toggle('on', modeBtns[z].getAttribute('data-m') === m);
    if (m === 'mock') this.startTimer(); else this.stopTimer();
    this.renderD();
  }
  recLevel(pct, depthOk) {
    if (pct >= 85 && depthOk) return { c: 'sh', t: 'Strong Hire' };
    if (pct >= 70) return { c: 'h', t: 'Hire' };
    if (pct >= 50) return { c: 'lh', t: 'Lean Hire' };
    return { c: 'nh', t: 'No Hire' };
  }
  renderVerdict() {
    const self = this;
    this.stopTimer();
    const answered = this.results.length, pct = Math.round(this.got / cards.length * 100);
    let depthSolid = 0, depthTotal = 0;
    for (let r = 0; r < this.results.length; r++) {
      if (this.results[r].tier === 'Staff' || this.results[r].tier === 'EXTEND') { depthTotal++; if (this.results[r].ok) depthSolid++; }
    }
    const depthOk = depthTotal > 0 && depthSolid / depthTotal >= 0.66;
    const rec = this.recLevel(pct, depthOk);
    let rows = '';
    for (let r = 0; r < this.results.length; r++) {
      const entry = this.results[r];
      const drop = (!entry.ok && entry.cov && entry.cov.dropped && entry.cov.dropped.length) ? '<div class="sigdrop">dropped: ' + entry.cov.dropped.join(', ') + '</div>' : '';
      const _lv = entry.level || (entry.ok ? 3 : 2), _cls = _lv >= 3 ? 'ok' : (_lv === 2 ? 'no' : 'miss'), _mk = _lv >= 3 ? '\u2713' : (_lv === 2 ? '\u007e' : '\u2717');
      rows += '<div class="sigrow ' + _cls + '"><div class="mk">' + _mk + '</div>' +
        '<div class="nm">' + entry.signal + drop + '</div><div class="tr"><span class="tier ' + DRILL_TIER_CLASS[entry.tier] + '">' + entry.tier + '</span></div></div>';
    }
    let note;
    if (rec.c === 'sh') note = 'Depth held under the Staff / EXTEND probes &mdash; that\'s exactly what tips a packet from Hire to <b>Strong Hire</b>.';
    else if (rec.c === 'h') note = 'Strong coverage. To reach Strong Hire, the <b>Staff-tier</b> threads have to be solid, not just attempted.';
    else if (rec.c === 'lh') note = 'Enough signal for a phone screen, not an onsite. The gap is <b>depth</b> &mdash; drill the multi-layer threads to the end.';
    else note = 'Below bar &mdash; the happy path isn\'t enough. Work Walkthrough + See-the-code, then run the round again.';
    let used = 22 * 60 - this.mockLeft;
    if (used < 0) used = 0;
    this._dwrap.innerHTML = '<div class="card debrief"><div class="rec ' + rec.c + '"><div class="lvl">' + rec.t + '</div>' +
      '<div class="tu">' + this.got + ' / ' + cards.length + ' signals &middot; ' + answered + ' probes reached &middot; ' + this._fmt(used) + ' on the clock</div></div>' +
      '<div style="height:12px"></div>' + rows + '<div class="verdict">' + note + '</div>' +
      '<button type="button" id="vrestart">Run another round</button></div>';
    this._root.getElementById('vrestart').onclick = function () { self.setMode('mock'); };
  }
  setTier(t) {
    this.tierFilter = t;
    const tn = this._root.getElementById('tiernote');
    if (tn) tn.innerHTML = DRILL_TIER_NOTES[t] || DRILL_TIER_NOTES.all;
    for (let z = 0; z < this._tiertog.children.length; z++) this._tiertog.children[z].classList.toggle('on', this._tiertog.children[z].getAttribute('data-tier') === t);
    this.setMode(this.mode);
  }
  getStats() { return { dTot: cards.length, dDone: this.results.length, dGot: this.got, dShk: this.shk, revisit: this.results.filter(function (r) { return !r.ok; }).map(function (r) { return r.signal; }) }; }
  reset() { this.setMode('study'); }
  weak() { return this.drillWeak(); }
}
customElements.define('deep-drill', DeepDrill); 