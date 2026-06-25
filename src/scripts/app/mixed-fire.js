/* ============ MIXED FIRE ============ */
var mixBody = null, mixRoot = null;
/* Wrap a probe card as a mixed-fire item: question + every follow-up + the
   senior-signal line, all revealed together. */
function mxProbe(c) {
  return {
    kind: 'Depth probe', badge: 'mxb-probe', label: c.signal, prompt: c.q,
    reveal: '<div class="ans">' + c.a + '</div>' +
      c.f.map(function (x) { return '<div class="fu"><div class="lab">Interviewer pushes further</div><div class="fq">' + x.q + '</div><div class="fa">' + x.a + '</div></div>'; }).join('') +
      '<div class="senior"><div class="sl">What sounds senior here</div>' + c.senior + '</div>'
  };
}
/* Wrap a curveball scenario as a mixed-fire item: cue + task, with the model
   answer and an optional interviewer cut-in revealed together. */
function mxCurve(cb) {
  return {
    kind: 'Curveball', badge: 'mxb-curve', label: cb.theme || 'Scenario',
    prompt: cb.cue + '<div class="mx-task">' + cb.task + '</div>',
    reveal: '<div class="ans">' + cb.model + '</div>' +
      (cb.int ? '<div class="fu"><div class="lab">The interviewer cuts in</div><div class="fq">' + cb.int.q + '</div><div class="fa">' + cb.int.a + '</div></div>' : '')
  };
}
/* Mixed-fire state: the assembled question pool, cursor, tallies, and the
   per-item log shared with the session-progress overlay. */
var mxPool = [], mxIdx = 0, mxGot = 0, mxShk = 0, mxRes = [], mixLog = [];
/* Turn the Trade-offs pane's decisions into mixed-fire items (each becomes a
   "name the switch condition" prompt revealing the options + the tell). The
   decision DOM now lives inside <deep-trade-offs>, so we ask it via getDecisions()
   instead of scraping #trade directly. */
function getTrades() {
  const el = document.querySelector('#trade deep-trade-offs');
  const decisions = el ? el.getDecisions() : [];
  const out = [];
  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i];
    out.push({ kind: 'Trade-off', badge: 'mxb-trade', label: 'Name the switch condition', prompt: 'Defend the call &mdash; <b>' + d.q + '</b>. When would you reach for each side?', reveal: '<div class="mx-opts">' + d.optsHtml + '</div><div class="senior"><div class="sl">The switch condition to name out loud</div>' + d.tell + '</div>' });
  }
  return out;
}
/* Assemble a fresh mixed set: 4 random probes, 2 curveballs, 2 trade-offs, all
   shuffled together into mxPool. */
function buildMix() {
  const probeIdx = dShuffle(_allCards.length).slice(0, 4);
  const curveIdx = dShuffle(curveballPool.length).slice(0, 2);
  const trades = getTrades();
  const tradeIdx = dShuffle(trades.length).slice(0, 2);
  const arr = [];
  for (let a = 0; a < probeIdx.length; a++) arr.push(mxProbe(_allCards[probeIdx[a]]));
  for (let b = 0; b < curveIdx.length; b++) arr.push(mxCurve(curveballPool[curveIdx[b]]));
  for (let t = 0; t < tradeIdx.length; t++) arr.push(trades[tradeIdx[t]]);
  const order = dShuffle(arr.length);
  mxPool = order.map(function (i) { return arr[i]; });
}
/* Open the mixed-fire overlay: build a fresh set, reset state, show, render. */
function openMix() {
  buildMix();
  mxIdx = 0; mxGot = 0; mxShk = 0; mxRes = [];
  const ov = document.getElementById('mixov');
  ovShow(ov);
  ov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  renderMix();
}
function closeMix() {
  const ov = document.getElementById('mixov');
  ovHide(ov);
  ov.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
/* Render the current mixed-fire item: badge + label + prompt, with a Reveal
   button that exposes the answer and the Handled-it / Shaky self-grade pair. */
function renderMix() {
  const body = mixBody;
  if (mxIdx >= mxPool.length) { renderMixEnd(); return; }
  const item = mxPool[mxIdx];
  body.innerHTML = '<div class="mx-top"><span class="mx-prog">Question ' + (mxIdx + 1) + ' / ' + mxPool.length + '</span><span class="mx-kind ' + item.badge + '">' + item.kind + '</span></div><div class="mx-label">' + item.label + '</div><div class="qq">' + item.prompt + '</div><div id="mxrev"></div><button class="push" id="mxshow" type="button">Reveal a strong answer</button>';
  mixRoot.getElementById('mxshow').onclick = function () {
    mixRoot.getElementById('mxrev').innerHTML = item.reveal;
    this.style.display = 'none';
    const judgeRow = document.createElement('div');
    judgeRow.className = 'judge';
    judgeRow.innerHTML = '<button class="got" id="mxg" type="button">&#10003; Handled it <span class="hint">[1]</span></button><button class="shk" id="mxs" type="button">&#126; Shaky <span class="hint">[2]</span></button>';
    body.appendChild(judgeRow);
    mixRoot.getElementById('mxg').onclick = function () { mxJudge(true); };
    mixRoot.getElementById('mxs').onclick = function () { mxJudge(false); };
  };
}
/* Grade the current mixed-fire item and advance (logs to mxRes + mixLog). */
function mxJudge(ok) {
  if (ok) mxGot++; else mxShk++;
  mxRes.push({ item: mxPool[mxIdx], ok: ok });
  mixLog.push({ kind: mxPool[mxIdx].kind, label: mxPool[mxIdx].label, ok: ok });
  mxIdx++;
  renderMix();
}
/* End screen: overall %, a verdict, a per-category breakdown (probes /
   curveballs / trade-offs), the item list, and retry / re-run buttons. */
function renderMixEnd() {
  const body = mixBody;
  const pct = Math.round(mxGot / mxPool.length * 100);
  const verdict = pct >= 80 ? 'Sharp &mdash; you switched registers cleanly.' : pct >= 50 ? 'Solid. A couple of the gear-changes caught you off guard.' : 'The jumps between question types are the work &mdash; run it again.';
  const byKind = { Probe: [0, 0], Curve: [0, 0], Trade: [0, 0] };
  mxRes.forEach(function (r) {
    const k = (r.item.kind === 'Curveball') ? 'Curve' : (r.item.kind === 'Trade-off' ? 'Trade' : 'Probe');
    byKind[k][1]++;
    if (r.ok) byKind[k][0]++;
  });
  function shortKind(kd) { return kd === 'Depth probe' ? 'Probe' : kd; }
  const rows = mxRes.map(function (r) { return '<div class="mx-erow"><span class="mx-edot ' + (r.ok ? 'ok' : 'no') + '"></span><span class="mx-ek">' + shortKind(r.item.kind) + '</span><span class="mx-el">' + r.item.label + '</span></div>'; }).join('');
  function scoreBadge(lbl, ar) { return ar[1] ? '<span>' + lbl + ' <b>' + ar[0] + '/' + ar[1] + '</b></span>' : ''; }
  let shakyCount = 0;
  mxRes.forEach(function (r) { if (!r.ok) shakyCount++; });
  const retry = shakyCount ? '<button class="push" id="mxretry" type="button">Retry the ' + shakyCount + ' you fumbled</button>' : '';
  const again = shakyCount ? '<button class="mxghost" id="mxre" type="button">Run a fresh mixed set</button>' : '<button class="push" id="mxre" type="button">Run another mixed set</button>';
  body.innerHTML = '<div class="mx-end"><div class="mx-end-h">Mixed fire &mdash; ' + mxGot + ' / ' + mxPool.length + ' handled</div><div class="mx-end-pct">' + pct + '%</div><div class="mx-end-v">' + verdict + '</div><div class="mx-bd">' + scoreBadge('Probes', byKind.Probe) + scoreBadge('Curveballs', byKind.Curve) + scoreBadge('Trade-offs', byKind.Trade) + '</div><div class="mx-end-list">' + rows + '</div><div class="mx-end-btns">' + retry + again + '</div></div>';
  mixRoot.getElementById('mxre').onclick = openMix;
  const rt = mixRoot.getElementById('mxretry');
  if (rt) rt.onclick = retryShaky;
}
/* Re-run only the items graded Shaky this round, reshuffled. */
function retryShaky() {
  const shaky = [];
  mxRes.forEach(function (r) { if (!r.ok) shaky.push(r.item); });
  const order = dShuffle(shaky.length);
  mxPool = order.map(function (i) { return shaky[i]; });
  mxIdx = 0; mxGot = 0; mxShk = 0; mxRes = [];
  renderMix();
}
/* Wire the mixed-fire overlay open/close triggers. */
document.getElementById('mixopen').onclick = openMix;
document.getElementById('mixx').onclick = closeMix;
/* Pick a random subset of interruptible beats to actually interrupt this run:
   shuffle the eligible beats and take 2-4 of them. Returns a set of beat indices. */
function pickInterrupts() {
  const eligible = [];
  for (let i = 0; i < mockBeats.length; i++) if (mockBeats[i].int) eligible.push(i);
  for (let j = eligible.length - 1; j > 0; j--) {
    const r = Math.floor(Math.random() * (j + 1));
    const t = eligible[j]; eligible[j] = eligible[r]; eligible[r] = t;
  }
  let k = 2 + Math.floor(Math.random() * 3);
  if (k > eligible.length) k = eligible.length;
  const set = {};
  for (let m = 0; m < k; m++) set[eligible[m]] = true;
  return set;
}
/* Render one mock-run beat: cue + task + model answer, plus (when this beat is
   flagged for interruption) one or two interviewer cut-ins, each separately
   revealable. Wires Reveal-model, the cut-in reveals, and the Next/Finish button. */
function renderMockBeat() {
  if (mockBeat >= mockBeats.length) { renderMockEnd(); return; }
  const beat = mockBeats[mockBeat], last = (mockBeat === mockBeats.length - 1);
  const fire = !!(mockInterrupt && beat.int && mockIntSet[mockBeat]);
  mockbody.innerHTML =
    '<div><span class="mb-prog">Beat ' + (mockBeat + 1) + ' / ' + mockBeats.length + '</span><span class="mb-tag">' + beat.tag + '</span>' + '</div>' +
    '<div class="mb-cue">' + beat.cue + '</div>' +
    '<div class="mb-task">' + beat.task + '</div>' +
    '<div class="mb-model"><div class="mb-ml">Model answer</div>' + beat.model + '</div>' +
    (fire ? '<div class="mb-int" id="mbint"><div class="mb-int-h">&#128308;&nbsp; The interviewer cuts in</div><div class="mb-int-q">' + beat.int.q + '</div><button class="mb-irev" id="mbirev" type="button">Reveal a strong reply</button><div class="mb-int-a" id="mbinta"><div class="mb-int-al">A strong reply hits</div>' + beat.int.a + '</div>' + (beat.int2 ? '<div class="mb-int2" id="mbint2"><div class="mb-int-h2">&#128308;&nbsp; And they push again</div><div class="mb-int-q">' + beat.int2.q + '</div><button class="mb-irev" id="mbirev2" type="button">Reveal a strong reply</button><div class="mb-int-a" id="mbinta2"><div class="mb-int-al">A strong reply hits</div>' + beat.int2.a + '</div></div>' : '') + '</div>' : '') +
    '<div class="mb-act"><button class="mb-rev" id="mbrev" type="button">Reveal model</button>' +
    '<button class="mb-next" id="mbnext" type="button">' + (last ? 'Finish' : 'Next beat &rarr;') + '</button></div>' +
    '<div class="mb-keys">Space reveal &middot; &rarr; or Enter next &middot; Esc close</div>';
  mockRoot.getElementById('mbrev').onclick = function () {
    mockbody.querySelector('.mb-model').classList.add('show');
    this.disabled = true;
    this.textContent = 'Revealed';
    if (fire) { mockRoot.getElementById('mbint').classList.add('show'); }
  };
  if (fire) {
    mockRoot.getElementById('mbirev').onclick = function () {
      mockRoot.getElementById('mbinta').classList.add('show');
      this.disabled = true;
      this.textContent = 'Revealed';
      const nested2 = mockRoot.getElementById('mbint2');
      if (nested2) nested2.classList.add('show');
    };
    const reveal2Btn = mockRoot.getElementById('mbirev2');
    if (reveal2Btn) reveal2Btn.onclick = function () {
      mockRoot.getElementById('mbinta2').classList.add('show');
      this.disabled = true;
      this.textContent = 'Revealed';
    };
  }
  mockRoot.getElementById('mbnext').onclick = function () { mockBeat++; renderMockBeat(); };
}
/* Mock-run end screen: stop the clock, record run stats, show time + which
   curveball and interruptions fired, then a 0-6 self-score that paints a verdict. */
function renderMockEnd() {
  if (mockClock) { clearInterval(mockClock); mockClock = null; }
  mockRuns++;
  mockLastTime = mockSec;
  mockLastInt = mockInterrupt ? Object.keys(mockIntSet).length : 0;
  const t = mockFmt(mockSec);
  let html = '<div class="mb-end"><div class="mb-end-h">Round complete</div>' +
    '<div class="mb-end-t">You ran the full arc in <span class="mb-end-time">' + t + '</span>. A real design round is 35&ndash;45 min &mdash; this is the spine you expand into it.</div>' +
    '<div class="mb-end-cv">Curveball this run: <b>' + mockBeats[mockCurveIdx].theme + '</b>. ' + curveballPool.length + ' rotate in &mdash; run again for a different one.</div>' +
    (mockInterrupt && Object.keys(mockIntSet).length ? '<div class="mb-end-int">Cut off on <b>' + Object.keys(mockIntSet).length + '</b> of ' + mockBeats.length + ' beats &mdash; the version that counts.</div>' : '') +
    '<div class="mb-score-q">How many of the six did you deliver cleanly, out loud?</div><div class="mb-score" id="mbscore">';
  for (let i = 0; i <= 6; i++) html += '<button type="button" data-s="' + i + '">' + i + '</button>';
  html += '</div><div class="mb-verdict" id="mbverdict"></div><div class="mb-again"><button class="pri" id="mbagain" type="button">Run again</button><button id="mbclose2" type="button">Close</button></div></div>';
  mockbody.innerHTML = html;
  const scoreBtns = mockRoot.getElementById('mbscore');
  for (let k = 0; k < scoreBtns.children.length; k++) {
    scoreBtns.children[k].onclick = function () {
      for (let j = 0; j < scoreBtns.children.length; j++) { scoreBtns.children[j].style.background = ''; scoreBtns.children[j].style.borderColor = ''; scoreBtns.children[j].style.color = ''; }
      this.style.background = 'var(--accbg)';
      this.style.borderColor = 'var(--acc)';
      this.style.color = 'var(--acc)';
      const score = parseInt(this.getAttribute('data-s'), 10), verdictEl = mockRoot.getElementById('mbverdict');
      mockLastScore = score;
      verdictEl.classList.add('show');
      if (score >= 6) { verdictEl.style.background = 'var(--tealbg)'; verdictEl.style.color = '#0a5240'; verdictEl.innerHTML = '<b>Six for six.</b> You can carry the whole round end to end &mdash; now do it faster and under interruption.'; }
      else if (score >= 4) { verdictEl.style.background = 'var(--accbg)'; verdictEl.style.color = 'var(--accink)'; verdictEl.innerHTML = '<b>' + score + ' / 6.</b> The spine holds. Re-run and target the two that wobbled until they&rsquo;re automatic.'; }
      else { verdictEl.style.background = 'var(--amberbg)'; verdictEl.style.color = '#5e3c0a'; verdictEl.innerHTML = '<b>' + score + ' / 6.</b> The arc isn&rsquo;t solid yet &mdash; drill the weak beats in their own tabs, then run it again.'; }
    };
  }
  mockRoot.getElementById('mbagain').onclick = openMock;
  mockRoot.getElementById('mbclose2').onclick = closeMock;
}
/* Wire the mock-run overlay open/close triggers. */
document.getElementById('mockopen').onclick = openMock;
document.getElementById('mockx').onclick = closeMock;


/* ===== MIXED FIRE as a shadow component =====
   The body moves into this shadow; renderMix/renderMixEnd target it via the
   mixBody global and look up their rendered controls through mixRoot. The frame,
   open/close, and the mock-run render below (still light) stay as they are. */
var MIX_STYLE = `.mock-body{padding:19px 18px 22px}
.mx-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px;gap:10px}
.mx-prog{font:700 12px -apple-system,sans-serif;color:var(--mut2);letter-spacing:.3px}
.mx-kind{font:800 10.5px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;padding:5px 11px;border-radius:20px;white-space:nowrap}
.mxb-probe{background:var(--accbg);color:var(--accink)}
.mxb-curve{background:var(--mxb-curve-bg);color:var(--amber)}
.mxb-trade{background:var(--tealbg);color:var(--mxb-trade-fg)}
.mx-label{font:700 14px -apple-system,sans-serif;color:var(--ink);margin-bottom:9px}
.mx-task{display:block;margin-top:9px;font:600 13.5px -apple-system,sans-serif;font-style:italic;color:var(--mut)}
.mx-end{text-align:center;padding:8px 4px}
.mx-end-h{font:800 17px -apple-system,sans-serif;color:var(--ink);margin-bottom:4px}
.mx-end-pct{font:800 40px -apple-system,sans-serif;color:var(--acc);line-height:1;margin:8px 0}
.mx-end-v{font:600 14px -apple-system,sans-serif;color:var(--mut);margin:0 auto 16px;line-height:1.5;max-width:300px}
.mx-bd{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;margin-bottom:18px;font:600 13px -apple-system,sans-serif;color:var(--mut)}
.mx-bd b{color:var(--ink);font-weight:800}
.mx-end-list{text-align:left;margin-bottom:18px}
.mx-erow{display:flex;align-items:center;gap:9px;padding:7px 2px;border-bottom:1px solid var(--bd)}
.mx-edot{flex:none;width:9px;height:9px;border-radius:50%}
.mx-edot.ok{background:var(--teal)}
.mx-edot.no{background:var(--amber)}
.mx-ek{flex:none;font:800 9.5px -apple-system,sans-serif;text-transform:uppercase;letter-spacing:.4px;color:var(--mut2);width:74px}
.mx-el{font:600 13px -apple-system,sans-serif;color:var(--ink)}
.mx-end-btns{display:flex;flex-direction:column;gap:9px}
.mx-end-btns button{margin-top:0}
.mxghost{width:100%;font:750 13px -apple-system,sans-serif;padding:12px 14px;border-radius:11px;background:transparent;color:var(--acc);border:1.5px solid var(--bd);cursor:pointer;transition:.15s}
.mxghost:hover{border-color:var(--acc);background:var(--accbg)}
.qq{font-size:15.5px;font-weight:680;color:var(--ink);line-height:1.45}
.ans{font-size:13px;color:var(--ans-fg);margin-top:13px;padding:13px 15px;background:var(--ans-bg);border-left:3px solid var(--acc);border-radius:8px;animation:pop .22s ease}
.ans b{color:var(--accink)}
.fu{margin-top:13px;animation:pop .24s ease}
.fu .lab{font-size:10px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--amber);display:flex;align-items:center;gap:6px;margin-bottom:6px}
.fu .lab::before{content:"\\21B3";font-size:14px}
.fu .fq{font-size:14px;font-weight:650;color:var(--ink);line-height:1.45}
.fu .fa{font-size:12.5px;color:var(--ans-fg);margin-top:9px;padding:11px 14px;background:var(--fa-bg);border-left:3px solid var(--amber);border-radius:8px}
.fu .fa b{color:var(--fa-b-fg)}
.senior{margin-top:14px;font-size:12.5px;color:var(--senior-fg);background:var(--tealbg);border:1px solid var(--senior-bd);border-radius:9px;padding:12px 14px;animation:pop .24s ease}
.senior .sl{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--teal);display:flex;align-items:center;gap:6px;margin-bottom:5px}
.senior .sl::before{content:"\\2605"}
.senior b{color:var(--fb-t-fg)}
.push{margin-top:15px;width:100%;border:0;color:var(--push-fg);font:700 13px -apple-system,sans-serif;padding:13px;border-radius:11px;cursor:pointer;transition:.12s;background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 5px 15px rgba(83,74,183,.27),inset 0 1px 0 rgba(255,255,255,.14)}
.push.more{background:linear-gradient(135deg,var(--amber),#b9740f);box-shadow:0 5px 15px rgba(176,108,20,.30),inset 0 1px 0 rgba(255,255,255,.16)}
.push:active{transform:translateY(1px);box-shadow:0 2px 7px rgba(30,28,24,.18),inset 0 1px 0 rgba(255,255,255,.10)}
.judge{display:flex;gap:10px;margin-top:15px}
.judge button{flex:1;border:1.5px solid;background:var(--judge-btn-bg);font:700 13px -apple-system,sans-serif;padding:12px;border-radius:11px;cursor:pointer;transition:.12s}
.judge .got{border-color:var(--teal);color:var(--teal)} .judge .got:hover{background:var(--tealbg)}
.judge .shk{border-color:var(--amber);color:var(--amber)} .judge .shk:hover{background:var(--amberbg)}
.judge .hint{font-size:9px;font-weight:700}
.push:hover:not(.more){box-shadow:0 9px 26px rgba(83,74,183,.42),inset 0 1px 0 rgba(255,255,255,.14);transform:translateY(-1px)}
.push.more:hover{box-shadow:0 9px 26px rgba(176,108,20,.42),inset 0 1px 0 rgba(255,255,255,.14);transform:translateY(-1px)}
.push:active:not(.more),.push.more:active{transform:translateY(1px);box-shadow:0 2px 7px rgba(30,28,24,.18),inset 0 1px 0 rgba(255,255,255,.1)}
.got:active,.shk:active{transform:translateY(1px);filter:brightness(.96)}`;
class DeepMixedFire extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, OPT_SHEET];
    root.innerHTML = '<style>' + MIX_STYLE + '</style><div class="mock-body" id="mixbody"></div>';
    mixBody = root.getElementById('mixbody');
    mixRoot = root;
  }
}
customElements.define('deep-mixed-fire', DeepMixedFire);
