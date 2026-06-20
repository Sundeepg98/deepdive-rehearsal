/* ============ PROBE DRILL ============ */
/* Drill state. cards / speakLines are the SHARED, reassignable working sets
   (filtered subsets of the full banks); _allCards / _allSpeak keep the
   originals so a filter can always be widened or a "revisit" set rebuilt. */
var mode = 'study', tierFilter = 'all', timerId = null, mockLeft = 0, _allCards = cards, _allSpeak = speakLines;
var di = 0, got = 0, shk = 0, results = [];
var revisit = {}, revisitMode = false;
var dwrap = document.getElementById('dwrap'), dfill = document.getElementById('dfill');
var sGot = document.getElementById('sGot'), sShk = document.getElementById('sShk'), sLeft = document.getElementById('sLeft');
var tierClass = { SDE2: 't2', SDE3: 't3', Staff: 'tS', EXTEND: 'tX' };

/* Render the side navigation: one numbered step per card, marking the current
   card ("on") and any flagged-for-revisit card ("flag"). */
function renderNav() {
  const nav = document.getElementById('dnav');
  if (!nav) return;
  let html = '';
  for (let k = 0; k < cards.length; k++) {
    const card = cards[k], originalIdx = _allCards.indexOf(card), flagged = revisit[originalIdx];
    html += '<button type="button" class="dn-step' + (k === di ? ' on' : '') + (flagged ? ' flag' : '') + '" data-i="' + k + '"><span class="dn-n">' + (k + 1) + '</span><span class="dn-t">' + card.signal + '</span></button>';
  }
  nav.innerHTML = html;
}
/* clicking a nav step jumps directly to that card */
(function () {
  const nav = document.getElementById('dnav');
  if (nav) {
    nav.addEventListener('click', function (event) {
      const btn = event.target.closest('.dn-step');
      if (btn) { di = +btn.getAttribute('data-i'); renderD(); }
    });
  }
})();
/* Repaint the whole drill view: counters, progress bar, nav, and either the
   current card or — once past the last card — the debrief/verdict screen. */
function renderD() {
  sGot.textContent = got; sGot.parentNode.classList.toggle('z', got === 0);
  sShk.textContent = shk; sShk.parentNode.classList.toggle('z', shk === 0);
  sLeft.textContent = cards.length - di; sLeft.parentNode.classList.toggle('z', cards.length - di === 0);
  dfill.style.width = (di / cards.length * 100) + '%';
  renderNav();
  if (di >= cards.length) {
    if (mode === 'mock') { renderVerdict(); } else { renderDebrief(); }
    updRevset();
    return;
  }
  drawCard(0);
  updRevset();
}
/* Build the current card's HTML at a given reveal `stage`: stage 0 = question
   only, 1 = + answer, 2..n = + each interviewer follow-up, final = + the
   senior-signal line and spoken script. Below the card sit either the "advance"
   button (more to reveal) or the Solid/Revisit self-grade buttons. */
function drawCard(stage) {
  const card = cards[di], maxStage = 1 + card.f.length;
  let html = '<div class="card"><div class="thread">' +
    '<div class="qrow"><div><div class="qk">Probe ' + (di + 1) + ' / ' + cards.length + '</div>' +
    '<div class="sigtag">signal &middot; <b>' + card.signal + '</b></div></div>' +
    '<span class="tier ' + tierClass[card.tier] + '">' + card.tier + '</span></div>' +
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
    html += '<div class="speak"><div class="sl">Say it out loud like this</div>' + speakLines[di] + '</div>';
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
  dwrap.innerHTML = html;
  const advBtn = document.getElementById('adv');
  if (advBtn) { advBtn.onclick = function () { drawCard(stage + 1); }; }
  const gotBtn = document.getElementById('jg');
  if (gotBtn) { gotBtn.onclick = function () { judge(true); }; }
  const revisitBtn = document.getElementById('js');
  if (revisitBtn) { revisitBtn.onclick = function () { judge(false); }; }
}
/* Grade the current card Solid (got++) or Revisit (shk++): update the revisit
   map keyed by ORIGINAL index, log the result, advance, and bump the counter
   that changed. */
function judge(ok) {
  const card = cards[di];
  if (ok) got++; else shk++;
  const originalIdx = _allCards.indexOf(card);
  if (originalIdx > -1) { if (ok) { delete revisit[originalIdx]; } else { revisit[originalIdx] = true; } }
  results.push({ signal: card.signal, tier: card.tier, ok: ok, card: card, speak: speakLines[di] });
  di++;
  renderD();
  const bumpEl = ok ? sGot : sShk;
  if (bumpEl) { bumpEl.classList.remove('cbump'); void bumpEl.offsetWidth; bumpEl.classList.add('cbump'); }
}
/* Study/quick debrief: a per-signal results list, a coverage-% verdict, an
   optional "drill my revisit set" button, and a restart. */
function renderDebrief() {
  const pct = Math.round(got / cards.length * 100);
  let rows = '';
  for (let r = 0; r < results.length; r++) {
    const entry = results[r];
    rows += '<div class="sigrow ' + (entry.ok ? 'ok' : 'no') + '"><div class="mk">' + (entry.ok ? '\u2713' : '\u2192') + '</div>' +
      '<div class="nm">' + entry.signal + '</div><div class="tr"><span class="tier ' + tierClass[entry.tier] + '">' + entry.tier + '</span></div></div>';
  }
  let verdict;
  if (pct >= 80) verdict = 'You\'re carrying the signals a senior loop grades on. The shaky ones are polish, not gaps — re-run those threads until the <b>senior-signal line</b> comes out unprompted.';
  else if (pct >= 50) verdict = 'Solid core, real gaps. The signals you marked <b>Revisit</b> are exactly what an interviewer probes to separate levels — drill those threads to the last layer before the real round.';
  else verdict = 'You know the happy path; the depth isn\'t there yet. Work the <b>Walkthrough</b> + <b>See the code</b>, then re-run — the follow-up chains are where this round is won or lost.';
  const weakBtn = shk > 0 ? '<button type="button" id="dweak" class="btn-sec">Drill my ' + shk + ' Revisit ' + (shk === 1 ? 'probe' : 'probes') + ' \u2192</button>' : '';
  dwrap.innerHTML = '<div class="card debrief"><div class="big">' + (mode === 'quick' ? 'Quick 5 debrief' : 'Interviewer debrief') + '</div>' +
    '<div class="sumline">' + got + ' solid &middot; ' + shk + ' to revisit &middot; ' + pct + '% ' + (mode === 'quick' ? 'of a quick 5' : 'signal coverage') + '</div>' +
    rows + '<div class="verdict">' + verdict + '</div>' + weakBtn +
    '<button type="button" id="drestart">' + (mode === 'quick' ? 'Another quick 5 →' : 'Run the full round again') + '</button></div>';
  if (shk > 0) { document.getElementById('dweak').onclick = drillWeak; }
  document.getElementById('drestart').onclick = function () { setMode(mode); };
}
/* Re-run just the cards graded Revisit in this session (study mode). */
function drillWeak() {
  const weakCards = results.filter(function (r) { return !r.ok; });
  if (!weakCards.length) return false;
  cards = weakCards.map(function (r) { return r.card; });
  speakLines = weakCards.map(function (r) { return r.speak; });
  di = 0; got = 0; shk = 0; results = []; revisitMode = true;
  renderD();
  return true;
}
/* Re-run the persistent revisit SET (flagged across sessions), in original order. */
function drillRevset() {
  const indices = [];
  for (let key in revisit) { if (revisit.hasOwnProperty(key)) indices.push(+key); }
  if (!indices.length) return;
  indices.sort(function (a, b) { return a - b; });
  cards = indices.map(function (i) { return _allCards[i]; });
  speakLines = indices.map(function (i) { return _allSpeak[i]; });
  di = 0; got = 0; shk = 0; results = []; revisitMode = true;
  stopTimer();
  renderD();
}
/* Show/update the "you have N flagged probes" call-to-action between rounds. */
function updRevset() {
  let count = 0;
  for (let key in revisit) { if (revisit.hasOwnProperty(key)) count++; }
  const box = document.getElementById('revset');
  if (!box) return;
  if (count > 0 && !revisitMode && di < cards.length) {
    box.style.display = '';
    document.getElementById('revn').textContent = count;
    document.getElementById('revw').textContent = (count === 1 ? 'probe' : 'probes');
  } else {
    box.style.display = 'none';
  }
}
/* Format seconds as "M:SS". */
function fmt(s) { const minutes = Math.floor(s / 60), seconds = s % 60; return minutes + ':' + (seconds < 10 ? '0' : '') + seconds; }
var timerEl = document.getElementById('timer');
/* Mock mode: a 22-minute countdown; at zero, force the verdict screen. */
function startTimer() {
  mockLeft = 22 * 60;
  timerEl.textContent = fmt(mockLeft);
  timerEl.style.display = 'block';
  timerEl.classList.remove('low');
  if (timerId) clearInterval(timerId);
  timerId = setInterval(function () {
    mockLeft--;
    timerEl.textContent = fmt(mockLeft);
    if (mockLeft <= 60) timerEl.classList.add('low');
    if (mockLeft <= 0) { clearInterval(timerId); timerId = null; di = cards.length; renderD(); }
  }, 1000);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } timerEl.style.display = 'none'; }
/* Fisher-Yates shuffle of [0..count). */
function dShuffle(count) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}
/* Indices into _allCards matching the current tier filter ("all" or one tier). */
function basePoolIdx() {
  const indices = [];
  for (let i = 0; i < _allCards.length; i++) {
    if (tierFilter === 'all' || _allCards[i].tier === tierFilter) indices.push(i);
  }
  return indices;
}
/* Switch drill mode (study / quick / mock): rebuild the working card set from
   the tier-filtered pool (quick = a random 5), reset progress, sync the mode
   buttons, start or stop the clock, and repaint. */
function setMode(m) {
  mode = m;
  const base = basePoolIdx();
  if (m === 'quick') {
    const quickIdx = dShuffle(base.length).slice(0, 5).map(function (i) { return base[i]; });
    cards = quickIdx.map(function (i) { return _allCards[i]; });
    speakLines = quickIdx.map(function (i) { return _allSpeak[i]; });
  } else {
    cards = base.map(function (i) { return _allCards[i]; });
    speakLines = base.map(function (i) { return _allSpeak[i]; });
  }
  di = 0; got = 0; shk = 0; results = []; revisitMode = false;
  const modeBtns = document.getElementById('modetog').children;
  for (let z = 0; z < modeBtns.length; z++) modeBtns[z].classList.toggle('on', modeBtns[z].getAttribute('data-m') === m);
  if (m === 'mock') startTimer(); else stopTimer();
  renderD();
}
/* Map a coverage % (and whether the deep-tier probes held) to a hire signal. */
function recLevel(pct, depthOk) {
  if (pct >= 85 && depthOk) return { c: 'sh', t: 'Strong Hire' };
  if (pct >= 70) return { c: 'h', t: 'Hire' };
  if (pct >= 50) return { c: 'lh', t: 'Lean Hire' };
  return { c: 'nh', t: 'No Hire' };
}
/* Mock-mode verdict: a recommendation banner (gated on depth at Staff/EXTEND),
   the per-signal list, a tailored note, and time used. */
function renderVerdict() {
  stopTimer();
  const answered = results.length, pct = Math.round(got / cards.length * 100);
  let depthSolid = 0, depthTotal = 0;
  for (let r = 0; r < results.length; r++) {
    if (results[r].tier === 'Staff' || results[r].tier === 'EXTEND') { depthTotal++; if (results[r].ok) depthSolid++; }
  }
  const depthOk = depthTotal > 0 && depthSolid / depthTotal >= 0.66;
  const rec = recLevel(pct, depthOk);
  let rows = '';
  for (let r = 0; r < results.length; r++) {
    const entry = results[r];
    rows += '<div class="sigrow ' + (entry.ok ? 'ok' : 'no') + '"><div class="mk">' + (entry.ok ? '\u2713' : '\u2192') + '</div>' +
      '<div class="nm">' + entry.signal + '</div><div class="tr"><span class="tier ' + tierClass[entry.tier] + '">' + entry.tier + '</span></div></div>';
  }
  let note;
  if (rec.c === 'sh') note = 'Depth held under the Staff / EXTEND probes — that\'s exactly what tips a packet from Hire to <b>Strong Hire</b>.';
  else if (rec.c === 'h') note = 'Strong coverage. To reach Strong Hire, the <b>Staff-tier</b> threads have to be solid, not just attempted.';
  else if (rec.c === 'lh') note = 'Enough signal for a phone screen, not an onsite. The gap is <b>depth</b> — drill the multi-layer threads to the end.';
  else note = 'Below bar — the happy path isn\'t enough. Work Walkthrough + See-the-code, then run the round again.';
  let used = 22 * 60 - mockLeft;
  if (used < 0) used = 0;
  dwrap.innerHTML = '<div class="card debrief"><div class="rec ' + rec.c + '"><div class="lvl">' + rec.t + '</div>' +
    '<div class="tu">' + got + ' / ' + cards.length + ' signals &middot; ' + answered + ' probes reached &middot; ' + fmt(used) + ' on the clock</div></div>' +
    '<div style="height:12px"></div>' + rows + '<div class="verdict">' + note + '</div>' +
    '<button type="button" id="vrestart">Run another round</button></div>';
  document.getElementById('vrestart').onclick = function () { setMode('mock'); };
}
var mtog = document.getElementById('modetog');
for (let mt = 0; mt < mtog.children.length; mt++) {
  mtog.children[mt].onclick = function () { setMode(this.getAttribute('data-m')); };
}
var ttog = document.getElementById('tiertog');
/* Per-tier framing shown under the tier selector (what the bar is at each level). */
var tierNotes={all:'<b>All four levels, mixed</b> &mdash; the way a real loop actually comes at you.',SDE2:'<b>Fundamentals under pressure</b> &mdash; memory model, I/O, idempotent writes. The bar is &ldquo;this won&rsquo;t fall over&rdquo;: show the mechanics cleanly.',SDE3:'<b>Depth &amp; trade-offs</b> &mdash; consistency, schema evolution, the hidden bill. The bar is &ldquo;it depends, here&rsquo;s the switch&rdquo;: never a one-size answer.',Staff:'<b>Systems judgment</b> &mdash; irreversibility, blast radius, the exactly-once illusion. The bar is &ldquo;I see the failure mode before it ships&rdquo;: name what breaks and name the backstop.'};
/* Apply a tier filter: update the note, sync the tier buttons, and rebuild. */
function setTier(t) {
  tierFilter = t;
  const tn = document.getElementById('tiernote');
  if (tn) tn.innerHTML = tierNotes[t] || tierNotes.all;
  for (let z = 0; z < ttog.children.length; z++) ttog.children[z].classList.toggle('on', ttog.children[z].getAttribute('data-tier') === t);
  setMode(mode);
}
for (let tt = 0; tt < ttog.children.length; tt++) {
  ttog.children[tt].onclick = function () { setTier(this.getAttribute('data-tier')); };
}
var revDrillBtn = document.getElementById('revdrill');
if (revDrillBtn) revDrillBtn.onclick = drillRevset;
setMode('study');
