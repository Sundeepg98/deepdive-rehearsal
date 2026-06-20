/* ============ MIXED FIRE ============ */
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
/* Scrape the Trade-offs pane into mixed-fire items (each decision becomes a
   "name the switch condition" prompt that reveals the options + the tell). */
function getTrades() {
  const decisions = document.querySelectorAll('#trade .dec');
  const out = [];
  for (let i = 0; i < decisions.length; i++) {
    const dec = decisions[i];
    const decQ = dec.querySelector('.dec-q').innerHTML;
    const opts = dec.querySelectorAll('.opt');
    let optsHtml = '';
    for (let o = 0; o < opts.length; o++) optsHtml += opts[o].outerHTML;
    const tell = dec.querySelector('.dec-tell').innerHTML;
    out.push({ kind: 'Trade-off', badge: 'mxb-trade', label: 'Name the switch condition', prompt: 'Defend the call &mdash; <b>' + decQ + '</b>. When would you reach for each side?', reveal: '<div class="mx-opts">' + optsHtml + '</div><div class="senior"><div class="sl">The switch condition to name out loud</div>' + tell + '</div>' });
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
  const body = document.getElementById('mixbody');
  if (mxIdx >= mxPool.length) { renderMixEnd(); return; }
  const item = mxPool[mxIdx];
  body.innerHTML = '<div class="mx-top"><span class="mx-prog">Question ' + (mxIdx + 1) + ' / ' + mxPool.length + '</span><span class="mx-kind ' + item.badge + '">' + item.kind + '</span></div><div class="mx-label">' + item.label + '</div><div class="qq">' + item.prompt + '</div><div id="mxrev"></div><button class="push" id="mxshow" type="button">Reveal a strong answer</button>';
  document.getElementById('mxshow').onclick = function () {
    document.getElementById('mxrev').innerHTML = item.reveal;
    this.style.display = 'none';
    const judgeRow = document.createElement('div');
    judgeRow.className = 'judge';
    judgeRow.innerHTML = '<button class="got" id="mxg" type="button">&#10003; Handled it <span class="hint">[1]</span></button><button class="shk" id="mxs" type="button">&#126; Shaky <span class="hint">[2]</span></button>';
    body.appendChild(judgeRow);
    document.getElementById('mxg').onclick = function () { mxJudge(true); };
    document.getElementById('mxs').onclick = function () { mxJudge(false); };
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
  const body = document.getElementById('mixbody');
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
  document.getElementById('mxre').onclick = openMix;
  const rt = document.getElementById('mxretry');
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
    '<button class="mb-next" id="mbnext" type="button">' + (last ? 'Finish' : 'Next beat →') + '</button></div>' +
    '<div class="mb-keys">Space reveal &middot; &rarr; or Enter next &middot; Esc close</div>';
  document.getElementById('mbrev').onclick = function () {
    mockbody.querySelector('.mb-model').classList.add('show');
    this.disabled = true;
    this.textContent = 'Revealed';
    if (fire) { document.getElementById('mbint').classList.add('show'); }
  };
  if (fire) {
    document.getElementById('mbirev').onclick = function () {
      document.getElementById('mbinta').classList.add('show');
      this.disabled = true;
      this.textContent = 'Revealed';
      const nested2 = document.getElementById('mbint2');
      if (nested2) nested2.classList.add('show');
    };
    const reveal2Btn = document.getElementById('mbirev2');
    if (reveal2Btn) reveal2Btn.onclick = function () {
      document.getElementById('mbinta2').classList.add('show');
      this.disabled = true;
      this.textContent = 'Revealed';
    };
  }
  document.getElementById('mbnext').onclick = function () { mockBeat++; renderMockBeat(); };
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
    '<div class="mb-end-t">You ran the full arc in <span class="mb-end-time">' + t + '</span>. A real design round is 35–45 min — this is the spine you expand into it.</div>' +
    '<div class="mb-end-cv">Curveball this run: <b>' + mockBeats[mockCurveIdx].theme + '</b>. ' + curveballPool.length + ' rotate in &mdash; run again for a different one.</div>' +
    (mockInterrupt && Object.keys(mockIntSet).length ? '<div class="mb-end-int">Cut off on <b>' + Object.keys(mockIntSet).length + '</b> of ' + mockBeats.length + ' beats &mdash; the version that counts.</div>' : '') +
    '<div class="mb-score-q">How many of the six did you deliver cleanly, out loud?</div><div class="mb-score" id="mbscore">';
  for (let i = 0; i <= 6; i++) html += '<button type="button" data-s="' + i + '">' + i + '</button>';
  html += '</div><div class="mb-verdict" id="mbverdict"></div><div class="mb-again"><button class="pri" id="mbagain" type="button">Run again</button><button id="mbclose2" type="button">Close</button></div></div>';
  mockbody.innerHTML = html;
  const scoreBtns = document.getElementById('mbscore');
  for (let k = 0; k < scoreBtns.children.length; k++) {
    scoreBtns.children[k].onclick = function () {
      for (let j = 0; j < scoreBtns.children.length; j++) { scoreBtns.children[j].style.background = ''; scoreBtns.children[j].style.borderColor = ''; scoreBtns.children[j].style.color = ''; }
      this.style.background = 'var(--accbg)';
      this.style.borderColor = 'var(--acc)';
      this.style.color = 'var(--acc)';
      const score = parseInt(this.getAttribute('data-s'), 10), verdictEl = document.getElementById('mbverdict');
      mockLastScore = score;
      verdictEl.classList.add('show');
      if (score >= 6) { verdictEl.style.background = 'var(--tealbg)'; verdictEl.style.color = '#0a5240'; verdictEl.innerHTML = '<b>Six for six.</b> You can carry the whole round end to end — now do it faster and under interruption.'; }
      else if (score >= 4) { verdictEl.style.background = 'var(--accbg)'; verdictEl.style.color = 'var(--accink)'; verdictEl.innerHTML = '<b>' + score + ' / 6.</b> The spine holds. Re-run and target the two that wobbled until they’re automatic.'; }
      else { verdictEl.style.background = 'var(--amberbg)'; verdictEl.style.color = '#5e3c0a'; verdictEl.innerHTML = '<b>' + score + ' / 6.</b> The arc isn’t solid yet — drill the weak beats in their own tabs, then run it again.'; }
    };
  }
  document.getElementById('mbagain').onclick = openMock;
  document.getElementById('mbclose2').onclick = closeMock;
}
/* Wire the mock-run overlay open/close triggers. */
document.getElementById('mockopen').onclick = openMock;
document.getElementById('mockx').onclick = closeMock;
