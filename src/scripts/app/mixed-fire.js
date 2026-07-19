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
    /* task is OPTIONAL -- the 38 markdown topics' curveballs are cue + model only, and this
       interpolated it unguarded, so mixed fire printed a literal "undefined" after the cue
       on every one of them. */
    prompt: cb.cue + (cb.task ? '<div class="mx-task">' + cb.task + '</div>' : ''),
    reveal: '<div class="ans">' + (cb.model || '') + '</div>' +
      (cb.int ? '<div class="fu"><div class="lab">The interviewer cuts in</div><div class="fq">' + cb.int.q + '</div><div class="fa">' + cb.int.a + '</div></div>' : '')
  };
}
/* Mixed-fire state: the assembled question pool, cursor, tallies, and the
   per-item log shared with the session-progress overlay. */
var mxPool = [], mxIdx = 0, mxGot = 0, mxShk = 0, mxRes = [], mixLog = [];
/* S3 + Wave 0 re-key: persist the mixed-fire log PER TOPIC under `mix.<id>` (was the global,
   topic-less `mix.log`). Like the mock record, sessStats/pickRec read this as the CURRENT topic's
   truth; keyed globally it leaked topic A's fumbles into topic B's "run mixed fire again" nudge.
   Mixed fire always assembles from the CURRENT topic's bank (buildMix -> _allCards/curveballPool/
   getTrades), so the log IS per-topic data -- it was only ever STORED topic-less. Capped so the
   store stays bounded (mixLog is cumulative). The topic-level shaky marks already persist via
   Progress.markShaky; this restores what session-progress' summary() derives from mixLog. Mirrors
   mock-run/data.js's mockPersist. */
function mixCurId() { try { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; } catch (e) { return null; } }
function mixKey(id) { return 'mix.' + id; }
function mixPersist() { try { var id = mixCurId(); if (id && typeof Store !== 'undefined' && Store.set) Store.set(mixKey(id), mixLog.slice(-500)); } catch (e) {} }
/* Load THIS topic's mixed-fire log into the live global -- or empty it when the topic has none, so
   switching topics can never leak the previous one's fumbles. Fired on every deeptopicchange and
   once for the boot topic (register() seeds it WITHOUT firing the event -- see mockLoadForTopic). */
function mixLoadForTopic(id) {
  var a = (id && typeof Store !== 'undefined' && Store.get) ? Store.get(mixKey(id), null) : null;
  mixLog = Array.isArray(a) ? a : [];
}
/* Cross-topic "has the user mixed-fired on ANY topic?" for panels.js engaged() -- see mockRanAny. */
function mixRanAny() {
  try {
    if (typeof Store === 'undefined' || !Store.keys) return false;
    var ks = Store.keys('mix.');
    for (var i = 0; i < ks.length; i++) { if (ks[i] !== 'mix.log') return true; }
  } catch (e) {}
  return false;
}
/* Legacy discard: the old global `mix.log` is a cumulative blob spanning every topic touched --
   unattributable to any one, so discarded, never mis-attributed (same doctrine as __mockMig). */
var __mixMig = { legacy: 'none' };
function mixMigrateLegacy() {
  try {
    if (typeof Store === 'undefined' || !Store.get) return;
    if (Store.get('mix.log', null) != null) { __mixMig.legacy = 'discarded'; Store.remove('mix.log'); }
  } catch (e) {}
}
window.addEventListener('deeptopicchange', function (e) { mixLoadForTopic(e && e.detail ? e.detail.id : mixCurId()); });
(function () {
  function boot() { mixMigrateLegacy(); mixLoadForTopic(mixCurId()); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
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
  if (ok) mxGot++; else { mxShk++; try { var _mid = (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; if (_mid && typeof Progress !== 'undefined' && Progress.markShaky) Progress.markShaky(_mid); } catch (e) {} }
  mxRes.push({ item: mxPool[mxIdx], ok: ok });
  mixLog.push({ kind: mxPool[mxIdx].kind, label: mxPool[mxIdx].label, ok: ok });
  mixPersist();
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
  body.innerHTML = '<div class="mx-end"><div class="mx-end-h">Mixed fire &mdash; ' + mxGot + ' / ' + mxPool.length + ' handled</div><div class="mx-end-pct">' + pct + '%</div><div class="mx-end-v">' + verdict + '</div><div class="mx-bd">' + scoreBadge('Probes', byKind.Probe) + scoreBadge('Curveballs', byKind.Curve) + scoreBadge('Trade-offs', byKind.Trade) + '</div><div class="mx-end-list">' + rows + '</div><div class="flow-slot" id="mxflow"></div><div class="mx-end-btns">' + retry + again + '</div></div>';
  mixRoot.getElementById('mxre').onclick = openMix;
  const rt = mixRoot.getElementById('mxretry');
  if (rt) rt.onclick = retryShaky;
  /* W1 rows 9-10: a CLEAN mixed set (no fumbles) is the end of the arc -- hand forward. flowRec
     attaches the topic-end ("Next: <weakest || next-in-room>") when the whole per-topic ladder is
     done, else the honest next surface. Fumbles keep #mxretry as the SELF affordance (row 9), no
     strip. flowFresh honors the freshness law (mxJudge's mixPersist just ran); closeMix before the
     hand-off so the overlay is gone first. */
  var mxflow = mixRoot.getElementById('mxflow');
  if (mxflow && shakyCount === 0 && typeof flowFresh === 'function' && typeof flowRec === 'function') {
    flowFresh(function () {
      var rec = flowRec();
      mxflow.innerHTML = (typeof flowStripHtml === 'function') ? flowStripHtml(rec) : '';
      var b = mxflow.querySelector('.flow-go');
      if (b) b.onclick = function () { if (typeof closeMix === 'function') closeMix(); if (typeof flowGo === 'function') flowGo(rec); };
    });
  }
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
  const held = mockHoldsFocus();   /* this render is about to destroy the focused control */
  const beat = mockBeats[mockBeat], last = (mockBeat === mockBeats.length - 1);
  const fire = !!(mockInterrupt && beat.int && mockIntSet[mockBeat]);
  /* task is OPTIONAL: none of the 38 markdown topics' curveballs author one (they are cue +
     model only), and the old code interpolated it unguarded -- so the literal string
     "undefined" was painted into the task line of every markdown mock run. */
  mockbody.innerHTML =
    '<div><span class="mb-prog">Beat ' + (mockBeat + 1) + ' / ' + mockBeats.length + '</span><span class="mb-tag">' + beat.tag + '</span>' + '</div>' +
    '<div class="mb-cue">' + beat.cue + '</div>' +
    (beat.task ? '<div class="mb-task">' + beat.task + '</div>' : '') +
    '<div class="mb-model"><div class="mb-ml">Model answer</div>' + (beat.model || '') + '</div>' +
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
  mockRestoreFocus(held);   /* back onto the run surface -- never let it fall to <body> */
}
/* Mock-run end screen: stop the clock, record run stats, show time + which
   curveball and interruptions fired, then a self-score OUT OF THE BEATS THIS RUN
   ACTUALLY ASKED that paints a verdict.

   The denominator was hardcoded 6 -- the beat count of the 8 hand-coded topics. The
   38 markdown topics author TWO beats, so a flawless run scored 2, landed under the
   `score >= 4` middle bucket, and was told "the arc isn't solid yet": the bottom
   verdict, unreachable-to-escape, on 38 of 46 topics. Everything is relative to
   mockBeats.length now. At 6 beats the buckets, the copy and the thresholds are
   byte-identical to before, so the 8 are untouched. */
function mockOutOf() { return mockBeats.length; }
/* The middle bucket's floor: two thirds of the beats. At 6 -> 4, exactly the old
   hardcoded threshold. Never 0, so a 1-beat topic still has a bottom bucket. */
function mockMidBar(n) { return Math.max(1, Math.round(n * 2 / 3)); }
var MOCK_NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function mockWord(n) { return MOCK_NUMWORD[n] || String(n); }
function renderMockEnd() {
  closeMockClock();                     /* was clearInterval() on a requestAnimationFrame handle -- a no-op, so the clock kept ticking through the end screen */
  const held = mockHoldsFocus();        /* this render is about to destroy the focused control */
  mockRuns++;
  mockLastTime = mockSec;
  mockLastInt = mockInterrupt ? Object.keys(mockIntSet).length : 0;
  const nBeats = mockOutOf(), midBar = mockMidBar(nBeats);
  mockLastOutOf = nBeats;               /* the score is meaningless without the denominator it was scored against -- persist both */
  mockPersist();
  const t = mockFmt(mockSec);
  let html = '<div class="mb-end"><div class="mb-end-h">Round complete</div>' +
    '<div class="mb-end-t">You ran the full arc in <span class="mb-end-time">' + t + '</span>. A real design round is 35&ndash;45 min &mdash; this is the spine you expand into it.</div>' +
    (mockCurveIdx >= 0 && mockBeats[mockCurveIdx] ? '<div class="mb-end-cv">Curveball this run: <b>' + mockBeats[mockCurveIdx].theme + '</b>. ' + curveballPool.length + ' rotate in &mdash; run again for a different one.</div>' : '') +
    (mockInterrupt && Object.keys(mockIntSet).length ? '<div class="mb-end-int">Cut off on <b>' + Object.keys(mockIntSet).length + '</b> of ' + nBeats + ' beats &mdash; the version that counts.</div>' : '') +
    '<div class="mb-score-q">How many of the ' + mockWord(nBeats) + ' did you deliver cleanly, out loud?</div><div class="mb-score" id="mbscore">';
  for (let i = 0; i <= nBeats; i++) html += '<button type="button" data-s="' + i + '">' + i + '</button>';
  html += '</div><div class="mb-verdict" id="mbverdict"></div><div class="flow-slot" id="mbflow"></div><div class="mb-again"><button class="pri" id="mbagain" type="button">Run again</button><button id="mbclose2" type="button">Close</button></div></div>';
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
      mockLastOutOf = nBeats;
      mockPersist();
      verdictEl.classList.add('show');
      const w = mockWord(nBeats), missed = nBeats - score, mw = mockWord(missed);
      if (score >= nBeats) { verdictEl.style.background = 'var(--tealbg)'; verdictEl.style.color = '#0a5240'; verdictEl.innerHTML = '<b>' + w.charAt(0).toUpperCase() + w.slice(1) + ' for ' + w + '.</b> You can carry the whole round end to end &mdash; now do it faster and under interruption.'; }
      else if (score >= midBar) { verdictEl.style.background = 'var(--accbg)'; verdictEl.style.color = 'var(--accink)'; verdictEl.innerHTML = '<b>' + score + ' / ' + nBeats + '.</b> The spine holds. Re-run and target the ' + mw + ' that wobbled until ' + (missed === 1 ? 'it&rsquo;s' : 'they&rsquo;re') + ' automatic.'; }
      else { verdictEl.style.background = 'var(--amberbg)'; verdictEl.style.color = '#5e3c0a'; verdictEl.innerHTML = '<b>' + score + ' / ' + nBeats + '.</b> The arc isn&rsquo;t solid yet &mdash; drill the weak beats in their own tabs, then run it again.'; }
      /* W1 decision-table rows 6-7: a STRONG mock (score >= midBar) hands forward to the next
         surface -- typically mixed fire (the 6.5 rung), the first surface a solid arc has not
         tested. A weak score keeps #mbagain as its SELF affordance (row 6), so no strip. Recomputed
         on every score click. flowFresh honors the freshness law (mockPersist just ran); one compute
         (flowRec). Row 7 mechanism: closeMock BEFORE flowGo so the overlay is gone first. */
      var mbflow = mockRoot.getElementById('mbflow');
      if (mbflow) {
        mbflow.innerHTML = '';
        if (score >= midBar && typeof flowFresh === 'function' && typeof flowRec === 'function') {
          flowFresh(function () {
            var rec = flowRec();
            rec.self = (rec.tab === '__mock__');   /* a re-run-mock rec already IS #mbagain */
            mbflow.innerHTML = (typeof flowStripHtml === 'function') ? flowStripHtml(rec) : '';
            var b = mbflow.querySelector('.flow-go');
            if (b) b.onclick = function () { if (typeof closeMock === 'function') closeMock(); if (typeof flowGo === 'function') flowGo(rec); };
          });
        }
      }
    };
  }
  mockRoot.getElementById('mbagain').onclick = openMock;
  mockRoot.getElementById('mbclose2').onclick = closeMock;
  mockRestoreFocus(held);   /* the score row + Run again are now Tab-reachable; land on the surface */
}
/* Wire the mock-run overlay open/close triggers. */
document.getElementById('mockopen').onclick = openMock;
document.getElementById('mockx').onclick = closeMock;


/* ===== MIXED FIRE as a shadow component =====
   The body moves into this shadow; renderMix/renderMixEnd target it via the
   mixBody global and look up their rendered controls through mixRoot. The frame,
   open/close, and the mock-run render below (still light) stay as they are. */
var MIX_STYLE = `
.mx-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-12);gap:var(--space-10)}
.mx-prog{font:var(--font-weight-bold) 12px -apple-system,sans-serif;color:var(--mut2);letter-spacing:.3px}
.mx-kind{font:var(--font-weight-heavy) 10.5px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;padding:var(--space-5) var(--space-12);border-radius:20px;white-space:nowrap;box-shadow:0 1px 4px -2px var(--acc-a08)}
.mxb-probe{background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);color:var(--accink)}
.mxb-curve{background:linear-gradient(135deg,var(--mxb-curve-bg) 0%,rgba(176,108,20,.04) 100%);color:var(--amber)}
.mxb-trade{background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);color:var(--mxb-trade-fg)}
.mx-label{font:var(--font-weight-bold) 14px -apple-system,sans-serif;color:var(--ink);margin-bottom:var(--space-10);line-height:var(--line-height-relaxed)}
.mx-task{display:block;margin-top:var(--space-10);font:var(--font-weight-semibold) 13.5px -apple-system,sans-serif;font-style:italic;color:var(--mut)}
.mx-end{text-align:center;padding:var(--space-10) var(--space-4)}
.mx-end-h{font:var(--font-weight-heavy) 17px -apple-system,sans-serif;color:var(--ink);margin-bottom:var(--space-5)}
.mx-end-pct{font:var(--font-weight-heavy) 44px -apple-system,sans-serif;color:var(--acc);line-height:var(--line-height-none);margin:var(--space-10) 0;text-shadow:0 2px 24px var(--acc-a20),0 0 40px var(--acc-a08);letter-spacing:-1px}
.mx-end-v{font:var(--font-weight-semibold) 14px -apple-system,sans-serif;color:var(--mut);margin:0 auto var(--space-18);line-height:var(--line-height-loose);max-width:var(--space-300)}
.mx-bd{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--space-9) var(--space-18);margin-bottom:var(--space-20);font:var(--font-weight-semibold) 13px -apple-system,sans-serif;color:var(--mut)}
.mx-bd b{color:var(--ink);font-weight:var(--font-weight-heavy)}
.mx-end-list{text-align:left;margin-bottom:var(--space-20)}
.mx-erow{display:flex;align-items:center;gap:var(--space-10);padding:var(--space-8) var(--space-4);border-bottom:1px solid var(--bd);transition:padding var(--duration-base) var(--ease-base)}
.mx-erow:hover{padding-left:var(--space-8)}
.mx-edot{flex:none;width:var(--space-10);height:var(--space-10);border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.5)}
.mx-edot.ok{background:linear-gradient(135deg,var(--teal),#2dd4a8)}
.mx-edot.no{background:linear-gradient(135deg,var(--amber),#d4902a)}
.mx-ek{flex:none;font:var(--font-weight-heavy) 9.5px -apple-system,sans-serif;text-transform:uppercase;letter-spacing:.4px;color:var(--mut2);width:var(--space-74)}
.mx-el{font:var(--font-weight-semibold) 13px -apple-system,sans-serif;color:var(--ink)}
.mx-end-btns{display:flex;flex-direction:column;gap:var(--space-10)}
.mx-end-btns button{margin-top:0}
.mxghost{width:100%;font:var(--font-weight-heavy) 13px -apple-system,sans-serif;padding:var(--space-12) var(--space-16);border-radius:11px;background:linear-gradient(135deg,transparent 0%,var(--acc-a02) 100%);color:var(--acc);border:1.5px solid var(--bd);cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),border-color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base)}
.mxghost:hover{border-color:var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);transform:translateY(-1px);box-shadow:0 4px 14px -4px var(--acc-a12)}
.mxghost:active{transform:translateY(1px) scale(.98)}
.push:active{transform:translateY(1px);box-shadow:0 2px 7px rgba(30,28,24,.18),inset 0 1px 0 rgba(255,255,255,.10)}`;
class DeepMixedFire extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, OPT_SHEET, ANS_SHEET, MOCK_SHEET];
    root.innerHTML = '<style>' + MIX_STYLE + '</style><div style="display:flex;flex-direction:column;height:100%"><div class="mock-body" id="mixbody" style="overflow-y:auto;flex:1;min-height:0;padding:var(--space-18) var(--space-20) var(--space-24)"></div></div>';
    mixBody = root.getElementById('mixbody');
    mixRoot = root;
  }
}
customElements.define('deep-mixed-fire', DeepMixedFire);
