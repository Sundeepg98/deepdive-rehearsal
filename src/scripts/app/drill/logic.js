/* ============ PROBE DRILL ============ */
/* The drill is a self-contained shadow-DOM component. cards / speakLines stay
   GLOBAL (the opener pane reads cards; the component reads + reassigns both as
   the working set). Stats reach session-progress via getStats(). */
var DRILL_TIER_CLASS = { SDE2: 't2', SDE3: 't3', Staff: 'tS', EXTEND: 'tX' };
var DRILL_TIER_NOTES={all:'<b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.',SDE2:'<b>Fundamentals under pressure</b> &mdash; memory model, I/O, idempotent writes. The bar is &ldquo;this won&rsquo;t fall over&rdquo;: show the mechanics cleanly.',SDE3:'<b>Depth &amp; trade-offs</b> &mdash; consistency, schema evolution, the hidden bill. The bar is &ldquo;it depends, here&rsquo;s the switch&rdquo;: never a one-size answer.',Staff:'<b>Systems judgment</b> &mdash; irreversibility, blast radius, the exactly-once illusion. The bar is &ldquo;I see the failure mode before it ships&rdquo;: name what breaks and name the backstop.'};
/* The full, immutable card / speak banks. cards / speakLines (above, in
   cards.js / speak-lines.js) are the reassignable WORKING set; these keep the
   originals. SHARED: mixed-fire.js reads _allCards to assemble its probe set. */
var _allCards = cards, _allSpeak = speakLines;
var DRILL_HTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
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

.modetog{display:inline-flex;gap:4px;background:var(--modetog-bg);border:1px solid var(--modetog-bd);border-radius:9px;padding:4px}
.modetog button{border:0;background:transparent;color:var(--mut);font:700 12px -apple-system,sans-serif;padding:13px 14px;border-radius:7px;cursor:pointer;transition:.15s}
.modetog button.on{background:var(--card);color:var(--acc);font-weight:780;box-shadow:0 0 0 1px rgba(83,74,183,.32),0 4px 12px rgba(83,74,183,.22)}
.modetog button:not(.on):hover{background:var(--modetog-hover-bg);color:var(--ink)}
.tierrow{display:flex;align-items:center;gap:9px;margin:2px 0 16px;flex-wrap:wrap}
.tierlab{font:700 9.5px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2)}
.tiernote{font:italic 12px/1.55 -apple-system,sans-serif;color:var(--mut);margin:-6px 0 18px;max-width:62ch}
.tiernote b{color:var(--acc);font-style:normal;font-weight:750}
.timer{font:800 15px ui-monospace,Menlo,monospace;color:var(--acc);background:var(--accbg);border:1px solid #cfc7f0;border-radius:8px;padding:6px 13px}
.timer.low{color:var(--red);background:var(--redbg);border-color:#e8c5c0;animation:pulse .9s infinite}
.dbar{height:6px;background:var(--dbar-bg);border-radius:6px;overflow:hidden;margin-bottom:14px}
.dbar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--acc),var(--acc2));transition:width .4s cubic-bezier(.22,.61,.36,1);position:relative;overflow:hidden}
.dbar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);animation:barShimmer 2s ease-in-out infinite}
@keyframes barShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.score{display:flex;gap:9px;margin-bottom:14px}
.pill{flex:1;text-align:center;border:1px solid var(--bd);border-radius:11px;padding:9px;background:var(--card);transition:box-shadow .25s ease,transform .2s ease}
.pill:hover{box-shadow:0 4px 14px -4px rgba(83,74,183,.1);transform:translateY(-1px)}
.pill .v{font-size:20px;font-weight:760;line-height:1}
.pill .l{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mut2);margin-top:3px}
.pill.g .v{color:var(--teal)} .pill.s .v{color:var(--amber)} .pill.left .v{color:var(--acc)}
.pill.z .v{color:var(--mut)}
.revset{display:flex;align-items:center;gap:11px;flex-wrap:wrap;margin:2px 0 18px}
.revset-b{font:650 13px -apple-system,system-ui,sans-serif;color:var(--accink);background:var(--accbg);border:1px solid var(--acc);border-radius:8px;padding:7px 13px;cursor:pointer;transition:background .13s,color .13s,transform .04s;display:inline-flex;align-items:center;gap:6px}
.revset-b:hover{background:var(--acc);color:var(--bg)}
.revset-b:active{transform:translateY(1px)}
.revset-b:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.revset-b b{font-weight:800}
.revset-h{font-size:12px;color:var(--mut);font-style:italic}
.thread{border:1.5px solid var(--bd);border-radius:13px;padding:18px;background:var(--thread-bg)}
.qrow{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:4px}
.qk{font-family:var(--mono);font-size:10px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:var(--acc)}
.sigtag{font-size:10px;color:var(--mut2);font-weight:700;margin-top:5px;letter-spacing:.2px}
.sigtag b{color:var(--acc)}
.tier{display:inline-block;font-size:9.5px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:3px 8px;border-radius:5px;border:1px solid;white-space:nowrap}
.tier.t2{color:var(--teal);background:var(--tealbg);border-color:var(--senior-bd)}
.tier.t3{color:var(--accink);background:var(--accbg);border-color:#cfc7f0}
.tier.tS{color:var(--red);background:var(--redbg);border-color:#e8c5c0}
.tier.tX{color:#fff;background:var(--indigo);border-color:var(--indigo)}
.speak{margin-top:11px;font-size:12.5px;color:var(--speak-fg);background:var(--accbg);border:1px solid #cfc7f0;border-radius:9px;padding:12px 14px;animation:pop .24s ease}
.speak .sl{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--acc);display:flex;align-items:center;gap:6px;margin-bottom:5px}
.speak .sl::before{content:"\\1F5E3"}
.speak b{color:var(--accink)}
.debrief .big{font-size:23px;font-weight:760;text-align:center;margin-bottom:4px}
.debrief .sumline{text-align:center;color:var(--mut);font-size:13px;margin-bottom:18px}
.sigrow{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--sigrow-bd)}
.sigrow:last-of-type{border-bottom:0}
.sigrow .mk{flex:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff}
.sigrow.ok .mk{background:var(--teal)} .sigrow.no .mk{background:var(--amber)}
.sigrow .nm{font-size:13px;font-weight:650}
.sigrow .tr{margin-left:auto}
.verdict{margin-top:18px;font-size:13px;color:var(--ans-fg);background:var(--ans-bg);border-left:3px solid var(--acc);border-radius:9px;padding:14px 16px}
.verdict b{color:var(--accink)}
.debrief button{margin-top:18px;display:block;width:100%;border:1.5px solid var(--acc);background:#fff;color:var(--acc);font:700 13px -apple-system,sans-serif;padding:12px;border-radius:10px;cursor:pointer}
.debrief .btn-sec{margin-top:14px;display:block;width:100%;border:1.5px solid var(--teal);background:var(--tealbg);color:var(--fb-t-fg);font:700 13px -apple-system,sans-serif;padding:12px;border-radius:10px;cursor:pointer;transition:.12s}
.debrief .btn-sec:hover{background:var(--btnsec-hover-bg)}
.btn-sec:active{transform:translateY(1px);filter:brightness(.96)}
.rec{text-align:center;margin-bottom:4px}
.rec .lvl{display:inline-block;font-size:21px;font-weight:800;letter-spacing:-.3px;padding:9px 22px;border-radius:11px;border:2px solid}
.rec.sh .lvl{color:#0a5240;background:var(--tealbg);border-color:var(--teal)}
.rec.h .lvl{color:var(--accink);background:var(--accbg);border-color:var(--acc)}
.rec.lh .lvl{color:var(--fb-a-fg);background:var(--amberbg);border-color:var(--amber)}
.rec.nh .lvl{color:var(--fb-r-fg);background:var(--redbg);border-color:var(--red)}
.rec .tu{font-size:12px;color:var(--mut2);margin-top:9px;font-weight:700}
.cbump{animation:cbump .34s ease}
.dnav-wrap{margin-top:22px}
.dnav-h{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);margin-bottom:12px;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
.dnav-h .sub{font-size:10.5px;font-weight:600;letter-spacing:.01em;text-transform:none;color:var(--mut2)}
.dnav{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dn-step{display:flex;align-items:center;gap:9px;text-align:left;padding:9px 11px;border-radius:10px;border:1px solid var(--bd);background:var(--surf);box-shadow:var(--surf-sh);cursor:pointer;transition:transform .18s cubic-bezier(.22,.61,.36,1),box-shadow .2s ease,border-color .2s ease,background .2s ease;font-family:inherit;min-width:0;position:relative;overflow:hidden}
.dn-step:hover{transform:translateY(-2px);box-shadow:0 6px 18px -6px rgba(83,74,183,.12);border-color:rgba(83,74,183,.2)}
.dn-n{flex:none;width:21px;height:21px;border-radius:6px;display:grid;place-items:center;font:700 10.5px -apple-system,sans-serif;background:var(--accbg);color:var(--accink);transition:.14s}
.dn-t{font-size:11.5px;font-weight:600;color:var(--ink);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dn-step.on{border-color:var(--acc);background:var(--accbg);box-shadow:0 0 0 1px var(--acc),var(--surf-sh)}
.dn-step.on .dn-n{background:var(--acc);color:#fff}
.dn-step.flag{border-color:var(--amber)}
.dn-step.flag .dn-n{background:var(--amber);color:#fff}
.dn-step:active{background:var(--accbg)}`;

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
class DeepDrill extends HTMLElement {
  connectedCallback() {
    if (this._built) return; this._built = true;
    this.mode = 'study'; this.tierFilter = 'all'; this.timerId = null; this.mockLeft = 0;
    this.di = 0; this.got = 0; this.shk = 0; this.results = [];
    this.revisit = {}; this.revisitMode = false;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, ANS_SHEET];
    root.innerHTML = '<style>' + DRILL_STYLE + '</style>' + DRILL_HTML;
    this._root = root;
    this._dwrap = root.getElementById('dwrap'); this._dfill = root.getElementById('dfill');
    this._sGot = root.getElementById('sGot'); this._sShk = root.getElementById('sShk'); this._sLeft = root.getElementById('sLeft');
    this._timerEl = root.getElementById('timer');
    this._modetog = root.getElementById('modetog'); this._tiertog = root.getElementById('tiertog');
    const self = this;
    root.getElementById('dnav').addEventListener('click', function (event) {
      const btn = event.target.closest('.dn-step');
      if (btn) { self.di = +btn.getAttribute('data-i'); self.renderD(); }
    });
    for (let z = 0; z < this._modetog.children.length; z++) {
      this._modetog.children[z].onclick = function () { self.setMode(this.getAttribute('data-m')); };
    }
    for (let z = 0; z < this._tiertog.children.length; z++) {
      this._tiertog.children[z].onclick = function () { self.setTier(this.getAttribute('data-tier')); };
    }
    const rev = root.getElementById('revdrill');
    if (rev) rev.onclick = function () { self.drillRevset(); };
    initCardSpotlight(root);
    this.setMode('study');
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
      html += '<div class="judge"><button type="button" class="got" id="jg">&#10003; Solid <span class="hint">[1]</span></button>' +
        '<button type="button" class="shk" id="js">&#126; Revisit <span class="hint">[2]</span></button></div>';
    }
    html += '</div>';
    this._dwrap.innerHTML = html;
    const advBtn = this._root.getElementById('adv');
    if (advBtn) { advBtn.onclick = function () { self.drawCard(stage + 1); }; }
    const gotBtn = this._root.getElementById('jg');
    if (gotBtn) { gotBtn.onclick = function () { self.judge(true); }; }
    const revisitBtn = this._root.getElementById('js');
    if (revisitBtn) { revisitBtn.onclick = function () { self.judge(false); }; }
  }
  judge(ok) {
    const card = cards[this.di];
    if (ok) this.got++; else this.shk++;
    const originalIdx = _allCards.indexOf(card);
    if (originalIdx > -1) { if (ok) { delete this.revisit[originalIdx]; } else { this.revisit[originalIdx] = true; } }
    this.results.push({ signal: card.signal, tier: card.tier, ok: ok, card: card, speak: speakLines[this.di] });
    this.di++;
    this.renderD();
    const bumpEl = ok ? this._sGot : this._sShk;
    if (bumpEl) { bumpEl.classList.remove('cbump'); void bumpEl.offsetWidth; bumpEl.classList.add('cbump'); }
  }
  renderDebrief() {
    const self = this;
    const pct = Math.round(this.got / cards.length * 100);
    let rows = '';
    for (let r = 0; r < this.results.length; r++) {
      const entry = this.results[r];
      rows += '<div class="sigrow ' + (entry.ok ? 'ok' : 'no') + '"><div class="mk">' + (entry.ok ? '\u2713' : '\u2192') + '</div>' +
        '<div class="nm">' + entry.signal + '</div><div class="tr"><span class="tier ' + DRILL_TIER_CLASS[entry.tier] + '">' + entry.tier + '</span></div></div>';
    }
    let verdict;
    if (pct >= 80) verdict = 'You\'re carrying the signals a senior loop grades on. The shaky ones are polish, not gaps &mdash; re-run those threads until the <b>senior-signal line</b> comes out unprompted.';
    else if (pct >= 50) verdict = 'Solid core, real gaps. The signals you marked <b>Revisit</b> are exactly what an interviewer probes to separate levels &mdash; drill those threads to the last layer before the real round.';
    else verdict = 'You know the happy path; the depth isn\'t there yet. Work the <b>Walkthrough</b> + <b>See the code</b>, then re-run &mdash; the follow-up chains are where this round is won or lost.';
    const weakBtn = this.shk > 0 ? '<button type="button" id="dweak" class="btn-sec">Drill my ' + this.shk + ' Revisit ' + (this.shk === 1 ? 'probe' : 'probes') + ' \u2192</button>' : '';
    this._dwrap.innerHTML = '<div class="card debrief"><div class="big">' + (this.mode === 'quick' ? 'Quick 5 debrief' : 'Interviewer debrief') + '</div>' +
      '<div class="sumline">' + this.got + ' solid &middot; ' + this.shk + ' to revisit &middot; ' + pct + '% ' + (this.mode === 'quick' ? 'of a quick 5' : 'signal coverage') + '</div>' +
      rows + '<div class="verdict">' + verdict + '</div>' + weakBtn +
      '<button type="button" id="drestart">' + (this.mode === 'quick' ? 'Another quick 5 &rarr;' : 'Run the full round again') + '</button></div>';
    if (this.shk > 0) { this._root.getElementById('dweak').onclick = function () { self.drillWeak(); }; }
    this._root.getElementById('drestart').onclick = function () { self.setMode(self.mode); };
  }
  drillWeak() {
    const weakCards = this.results.filter(function (r) { return !r.ok; });
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
      rows += '<div class="sigrow ' + (entry.ok ? 'ok' : 'no') + '"><div class="mk">' + (entry.ok ? '\u2713' : '\u2192') + '</div>' +
        '<div class="nm">' + entry.signal + '</div><div class="tr"><span class="tier ' + DRILL_TIER_CLASS[entry.tier] + '">' + entry.tier + '</span></div></div>';
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
  disconnectedCallback() { this.stopTimer(); }
}
customElements.define('deep-drill', DeepDrill); 