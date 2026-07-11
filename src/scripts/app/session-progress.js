/* The whiteboard custom element exposes resetAll() / rerunMissed() / getStats();
   session-progress reaches it through this helper rather than the old wb globals. */
function wbEl() { return document.querySelector('#wb deep-whiteboard'); }
/* ============ SESSION PROGRESS ============ */
var sessov = document.getElementById('sessov'), sessbody = null, sessRoot = null;
/* Open/close the session-progress overlay (re-rendered fresh on every open). */
function openSession() {
  renderSession();
  ovShow(sessov);
  sessov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeSession() {
  ovHide(sessov);
  sessov.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
/* Reset every tracked surface to a clean slate: drill (back to study mode),
   whiteboard cues, mock-run records, and mixed-fire state. */
function drillEl() { return document.querySelector('#drill deep-drill'); }
function clearSession() {
  const d = drillEl(); if (d) d.reset();
  const wb = wbEl();
  if (wb) wb.resetAll();
  mockLastScore = null; mockLastOutOf = null; mockLastTime = null; mockRuns = 0;
  try { if (typeof Store !== 'undefined' && Store.remove) Store.remove('mock.last'); } catch (e) {}
  mixLog = []; mxRes = []; mxGot = 0; mxShk = 0;
}
/* Pick the single most useful "do this next" recommendation, in priority order:
   flagged revisits and missed whiteboard steps first, then a weak mock, then any
   unfinished surface (drill / whiteboard / mock / mixed fire), else "you're ready".
   Each branch returns a config: kicker, text, button label, target tab, colors. */
/* The mock is scored out of the BEATS THAT TOPIC ACTUALLY HAS (6 for the hand-coded 8,
   2 for the 38 markdown topics) -- never a hardcoded 6, which read a flawless 2-beat run
   as "2 / 6" and recommended re-running it. mOut() is the persisted denominator, falling
   back to 6 for a score persisted before it was recorded. mockMidBar (mixed-fire.js) is
   the SAME two-thirds floor the end-screen verdict uses, so the report, the session sheet
   and the verdict can never disagree; at 6 beats it is 4, exactly the old threshold. */
function mOut(stats) { return (stats && stats.mOut) || 6; }
function mockIsStrong(mScore, outOf) { return mScore !== null && mScore >= mockMidBar(outOf); }
function pickRec(revisit, missed, mScore, dDone, dTot, wbDone, mRuns, mixWeak, mOutOf) {
  if(revisit.length&&dDone>=dTot)return {kicker:'Focus next',text:'You flagged <b>'+revisit.length+'</b> probe'+(revisit.length===1?'':'s')+' to revisit. Re-drill '+(revisit.length===1?'it':'them')+' until the signal comes automatically.',btn:'Re-drill weak spots \u2192',tab:'drill',weak:true,bd:'#e8c5c0',bg:'var(--redbg)',ink:'var(--red)'};
  if(missed.length)return {kicker:'Focus next',text:'You missed <b>'+missed.length+'</b> step'+(missed.length===1?'':'s')+' on the whiteboard. Re-draw '+(missed.length===1?'it':'them')+' from a blank page.',btn:'Re-draw missed steps \u2192',tab:'wb',wbreset:true,bd:'#e8c5c0',bg:'var(--redbg)',ink:'var(--red)'};
  if(mScore!==null&&!mockIsStrong(mScore,mOutOf))return {kicker:'Focus next',text:'Your last mock landed at <b>'+mScore+' / '+mOutOf+'</b>. Run the arc again and target the beats that wobbled.',btn:'Run the round again \u2192',tab:'__mock__',bd:'#e8c5c0',bg:'var(--redbg)',ink:'var(--red)'};
  if(dDone<dTot)return {kicker:'Keep going',text:'You\u2019ve graded <b>'+dDone+' of '+dTot+'</b> probes. Clear the rest so nothing in the round is a surprise.',btn:'Back to the drill \u2192',tab:'drill',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(wbDone===0)return {kicker:'Keep going',text:'You haven\u2019t tried the <b>whiteboard recall</b> yet \u2014 rebuild the whole design from cues alone.',btn:'Try the whiteboard \u2192',tab:'wb',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(mRuns===0)return {kicker:'Keep going',text:'Drill and whiteboard are clean. Now pressure-test the <b>whole arc</b> on the clock.',btn:'Start a mock run \u2192',tab:'__mock__',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(mixWeak&&mixWeak.length)return {kicker:'Sharpen',text:'You fumbled <b>'+mixWeak.length+'</b> item'+(mixWeak.length===1?'':'s')+' in mixed fire \u2014 register-switching is where rounds slip. Re-run a mixed set and clear them.',btn:'Run mixed fire \u2192',tab:'__mix__',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  return {kicker:'You\u2019re ready',text:'Solid across the drill, the whiteboard, and a timed run. Keep it sharp \u2014 run it again faster, or under interruption.',btn:null,tab:null,bd:'#bfe0d3',bg:'var(--tealbg)',ink:'var(--teal)'};
}
/* Gather a full snapshot of progress across all four surfaces (drill,
   whiteboard, mock, mixed fire) into one flat stats object. */
function sessStats() {
  const ds = drillEl() ? drillEl().getStats() : { dTot: 0, dDone: 0, dGot: 0, dShk: 0, revisit: [] };
  const dTot = ds.dTot, dDone = ds.dDone, dGot = ds.dGot, dShk = ds.dShk, dLeft = dTot - dDone;
  const revisit = ds.revisit;
  const wbStats = wbEl() ? wbEl().getStats() : { total: 0, items: [] };
  let wbGot = 0, wbMiss = 0;
  const missed = [];
  for (let i = 0; i < wbStats.items.length; i++) {
    if (wbStats.items[i].got) wbGot++;
    else if (wbStats.items[i].missed) {
      wbMiss++;
      const cue = wbStats.items[i].cue || ('Step ' + (i + 1));
      missed.push(cue.split('&mdash;')[0].replace(/[.\s]+$/, ''));
    }
  }
  const wbTot = wbStats.total, wbDone = wbGot + wbMiss;
  const mixTot = mixLog.length;
  let mixGot = 0;
  const mixLatest = {};
  for (let mi = 0; mi < mixLog.length; mi++) { if (mixLog[mi].ok) mixGot++; mixLatest[mixLog[mi].label] = mixLog[mi].ok; }
  const mixShk = mixTot - mixGot, mixWeak = [];
  for (let label in mixLatest) { if (mixLatest[label] === false) mixWeak.push(label); }
  return { dTot: dTot, dDone: dDone, dGot: dGot, dShk: dShk, dLeft: dLeft, revisit: revisit, wbGot: wbGot, wbMiss: wbMiss, missed: missed, wbTot: wbTot, wbDone: wbDone, mScore: mockLastScore, mOut: mockLastOutOf, mTime: mockLastTime, mRuns: mockRuns, mInt: mockLastInt, mixTot: mixTot, mixGot: mixGot, mixShk: mixShk, mixWeak: mixWeak };
}
/* Build the printable HTML report (used by Save-as-PDF): a header with the
   timestamp, the recommendation, and a section per surface with its stats. */
function buildSessReport() {
  const stats = sessStats();
  const rec = pickRec(stats.revisit, stats.missed, stats.mScore, stats.dDone, stats.dTot, stats.wbDone, stats.mRuns, stats.mixWeak, mOut(stats));
  const now = new Date(), pad = function (x) { return x < 10 ? '0' + x : '' + x; };
  const when = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' &middot; ' + now.getHours() + ':' + pad(now.getMinutes());
  let html = '<div class="sr-head"><div class="sr-ttl">Content Pipeline &mdash; Session Report</div><div class="sr-when">' + when + '</div></div>';
  html += '<div class="sr-rec"><div class="sr-rk">' + rec.kicker + '</div><div class="sr-rt">' + rec.text + '</div></div>';
  html += '<div class="sr-sec"><div class="sr-h">Probe Drill</div>';
  if (stats.dDone === 0) html += '<div class="sr-stat">Not started &mdash; 0 of ' + stats.dTot + ' graded.</div>';
  else { html += '<div class="sr-stat">' + stats.dGot + ' solid &middot; ' + stats.dShk + ' to revisit &middot; ' + stats.dLeft + ' untouched of ' + stats.dTot + '</div>'; if (stats.revisit.length) html += '<div class="sr-list"><b>Revisit:</b> ' + stats.revisit.join(' &middot; ') + '</div>'; }
  html += '</div>';
  html += '<div class="sr-sec"><div class="sr-h">Whiteboard recall</div>';
  if (stats.wbDone === 0) html += '<div class="sr-stat">Not started &mdash; 0 of ' + stats.wbTot + ' graded.</div>';
  else { html += '<div class="sr-stat">' + stats.wbGot + ' recalled &middot; ' + stats.wbMiss + ' missed of ' + stats.wbTot + '</div>'; if (stats.missed.length) html += '<div class="sr-list"><b>Re-draw:</b> ' + stats.missed.join(' &middot; ') + '</div>'; }
  html += '</div>';
  html += '<div class="sr-sec"><div class="sr-h">Mock Run</div>';
  if (stats.mScore === null && stats.mRuns === 0) html += '<div class="sr-stat">Not run yet.</div>';
  else html += '<div class="sr-stat">Last run: ' + (stats.mScore === null ? 'completed, unscored' : stats.mScore + ' / ' + mOut(stats)) + (stats.mTime != null ? ' in ' + mockFmt(stats.mTime) : '') + ' &middot; ' + stats.mRuns + ' run' + (stats.mRuns === 1 ? '' : 's') + (stats.mInt ? ' &middot; cut off on ' + stats.mInt + ' of ' + mOut(stats) + ' beats' : '') + '</div>';
  html += '</div>';
  html += '<div class="sr-sec"><div class="sr-h">Mixed Fire</div>';
  if (stats.mixTot === 0) html += '<div class="sr-stat">Not run yet.</div>';
  else { html += '<div class="sr-stat">' + stats.mixGot + ' handled &middot; ' + stats.mixShk + ' shaky across ' + stats.mixTot + ' mixed item' + (stats.mixTot === 1 ? '' : 's') + '</div>'; if (stats.mixWeak.length) html += '<div class="sr-list"><b>Shaky:</b> ' + stats.mixWeak.join(' &middot; ') + '</div>'; }
  html += '</div>';
  html += '<div class="sr-foot">Generated from this session &middot; Content Pipeline deep-rehearsal trainer. Re-run the weak areas above tomorrow.</div>';
  document.getElementById('sessreport').innerHTML = html;
}
/* Serialize this session into a compact, shareable "CPR1." code string &mdash;
   date, then drill / whiteboard / mock / mixed-fire tallies. Mirrors decodeSession. */
function encodeSession() {
  const stats = sessStats(), now = new Date(), pad = function (x) { return x < 10 ? '0' + x : '' + x; };
  const dt = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
  const ms = (stats.mScore === null ? 'x' : stats.mScore);
  return 'CPR1.' + dt + '.' + stats.dGot + '-' + stats.dShk + '-' + stats.dDone + '-' + stats.dTot + '.' + stats.wbGot + '-' + stats.wbMiss + '-' + stats.wbTot + '.' + ms + '-' + stats.mRuns + '-' + stats.mInt + '.' + stats.mixGot + '-' + stats.mixShk + '-' + stats.mixTot;
}
/* ---- auto-captured trend history ----
   Snapshot each work session's CPR1 code into a small rolling local log so the
   Compare panel shows a trend automatically -- no copy/paste ritual required. The
   manual paste box still works (e.g. to fold in codes from another device). The
   snapshot for THIS page-load is updated in place (not re-appended) as you work,
   so one study session yields one point; a reload starts a fresh point. */
var TREND_KEY = 'trend.hist', TREND_CAP = 30, _mySessIdx = -1;
function trendLoad() { try { var v = Store.get(TREND_KEY); var a = v ? JSON.parse(v) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function trendSave(a) { try { Store.set(TREND_KEY, JSON.stringify(a)); } catch (e) {} }
function trendCapture() {
  var st = sessStats();
  if ((st.dDone + st.wbDone + st.mRuns + st.mixTot) <= 0) return;   // nothing happened this session
  var code = encodeSession(), hist = trendLoad();
  if (_mySessIdx >= 0 && _mySessIdx < hist.length) { hist[_mySessIdx] = code; }
  else { hist.push(code); _mySessIdx = hist.length - 1; }
  while (hist.length > TREND_CAP) { hist.shift(); _mySessIdx--; }
  trendSave(hist);
}
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') trendCapture(); });
window.addEventListener('pagehide', trendCapture);
/* Parse a "CPR1." code back into a stats object (mixed-fire group optional for
   backward compatibility); returns null if the string doesn't match the format. */
function decodeSession(code) {
  if (!code) return null;
  const trimmed = ('' + code).trim();
  const match = trimmed.match(/^CPR1\.(\d{8})\.(\d+)-(\d+)-(\d+)-(\d+)\.(\d+)-(\d+)-(\d+)\.(x|\d+)-(\d+)-(\d+)(?:\.(\d+)-(\d+)-(\d+))?$/);
  if (!match) return null;
  return { date: match[1], dGot: +match[2], dShk: +match[3], dDone: +match[4], dTot: +match[5], wbGot: +match[6], wbMiss: +match[7], wbTot: +match[8], mScore: (match[9] === 'x' ? null : +match[9]), mRuns: +match[10], mInt: +match[11], mixGot: (match[12] != null ? +match[12] : 0), mixShk: (match[13] != null ? +match[13] : 0), mixTot: (match[14] != null ? +match[14] : 0) };
}
/* One comparison row for a single prior session: prior vs current value, plus a
   colored up/down/same delta arrow (upGood flips which direction counts as good). */
function deltaRow(label, prior, cur, upGood) {
  const diff = cur - prior, dir = diff === 0 ? 'same' : (((diff > 0) === upGood) ? 'good' : 'bad');
  const arrow = diff === 0 ? '&mdash;' : (diff > 0 ? '&#9650; ' + Math.abs(diff) : '&#9660; ' + Math.abs(diff));
  return '<div class="cmp-row"><span class="cmp-lbl">' + label + '</span><span class="cmp-val">' + prior + ' &rarr; <b>' + cur + '</b></span><span class="cmp-d cmp-' + dir + '">' + arrow + '</span></div>';
}
/* Render a series of numbers as a unicode block-height sparkline (low to high). */
function spark(vals) {
  const blocks = '\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
  const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), range = max - min;
  let out = '';
  for (let i = 0; i < vals.length; i++) {
    const idx = range === 0 ? 3 : Math.round((vals[i] - min) / range * 7);
    out += blocks.charAt(idx);
  }
  return out;
}
/* Parse pasted text (codes separated by newlines/commas) into decoded sessions,
   sorted oldest-first. */
function parseCodes(text) {
  const lines = (text || '').split(/[\n,]+/);
  const codes = [];
  for (let i = 0; i < lines.length; i++) { const decoded = decodeSession(lines[i]); if (decoded) codes.push(decoded); }
  codes.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  return codes;
}
/* One trend row across many sessions: a sparkline plus first-to-last and a delta. */
function trendRow(label, series, upGood) {
  const first = series[0], last = series[series.length - 1], diff = last - first;
  const dir = diff === 0 ? 'same' : (((diff > 0) === upGood) ? 'good' : 'bad');
  const arrow = diff === 0 ? '&mdash;' : (diff > 0 ? '&#9650; ' + Math.abs(diff) : '&#9660; ' + Math.abs(diff));
  return '<div class="tr-row"><div class="tr-top"><span class="tr-lbl">' + label + '</span><span class="cmp-d cmp-' + dir + '">' + arrow + '</span></div><div class="tr-bot"><span class="tr-spark cmp-' + dir + '">' + spark(series) + '</span><span class="tr-val">' + first + ' &rarr; <b>' + last + '</b></span></div></div>';
}
/* Render the Compare panel: one prior code -> a delta table; multiple -> a trend
   view with sparklines. Each metric only shows when both sides have the data. */
function renderCompare() {
  const pasteEl = sessRoot.getElementById('sspaste'), outEl = sessRoot.getElementById('sscmpout');
  if (!pasteEl || !outEl) return;
  const stats = sessStats();
  const liveActive = (stats.dDone + stats.wbDone + stats.mRuns + stats.mixTot) > 0;
  const pasted = parseCodes(pasteEl.value);
  var series;
  if (pasted.length) {
    series = pasted.concat([stats]);          /* manual: pasted priors, then this live session */
  } else {
    /* Auto: the rolling history IS the trend. Drop this load's own snapshot (the
       live session stands in for it), and append the live session as the latest
       point only once it has activity -- otherwise opening the panel before doing
       anything would show a misleading dip to zero. */
    var hist = trendLoad();
    if (_mySessIdx >= 0 && _mySessIdx === hist.length - 1) hist = hist.slice(0, -1);
    var hobjs = parseCodes(hist.join('\n'));
    series = liveActive ? hobjs.concat([stats]) : hobjs;
  }
  if (series.length < 2) { outEl.innerHTML = '<div class="cmp-hint">Your trend builds itself as you study &mdash; come back after another session to see progress over time. You can also paste <code>CPR1&hellip;</code> codes from another device.</div>'; return; }
  const cur = series[series.length - 1];
  const priors = series.slice(0, -1);
  let html = '';
  if (priors.length === 1) {
    const prior = priors[0];
    const priorDate = prior.date.slice(0, 4) + '-' + prior.date.slice(4, 6) + '-' + prior.date.slice(6, 8);
    html = '<div class="cmp-head">Compared to ' + priorDate + '</div>';
    html += deltaRow('Drill solid', prior.dGot, cur.dGot, true);
    html += deltaRow('To revisit', prior.dShk, cur.dShk, false);
    html += deltaRow('Whiteboard recalled', prior.wbGot, cur.wbGot, true);
    html += deltaRow('Steps missed', prior.wbMiss, cur.wbMiss, false);
    if (prior.mScore !== null && cur.mScore !== null) html += deltaRow('Mock score', prior.mScore, cur.mScore, true);
    if (prior.mixTot > 0 && cur.mixTot > 0) html += deltaRow('Mixed fire %', Math.round(prior.mixGot / prior.mixTot * 100), Math.round(cur.mixGot / cur.mixTot * 100), true);
  } else {
    html = '<div class="cmp-head">Trend across ' + series.length + ' sessions</div>';
    html += trendRow('Drill solid', priors.map(function (p) { return p.dGot; }).concat([cur.dGot]), true);
    html += trendRow('To revisit', priors.map(function (p) { return p.dShk; }).concat([cur.dShk]), false);
    html += trendRow('Whiteboard recalled', priors.map(function (p) { return p.wbGot; }).concat([cur.wbGot]), true);
    html += trendRow('Steps missed', priors.map(function (p) { return p.wbMiss; }).concat([cur.wbMiss]), false);
    const scores = priors.map(function (p) { return p.mScore; }).concat([cur.mScore]);
    if (scores.every(function (v) { return v !== null; })) html += trendRow('Mock score', scores, true);
    const mixTotals = priors.map(function (p) { return p.mixTot; }).concat([cur.mixTot]);
    if (mixTotals.every(function (v) { return v > 0; })) html += trendRow('Mixed fire %', priors.map(function (p) { return Math.round(p.mixGot / p.mixTot * 100); }).concat([Math.round(cur.mixGot / cur.mixTot * 100)]), true);
  }
  outEl.innerHTML = html;
}
/* Render the whole overlay body: the "do this next" card, a stat card per
   surface (drill / whiteboard / mock / mixed fire), the carry-across-days code
   widget, and the Save-PDF / Clear actions &mdash; then wire every button. */
function renderSession() {
  const stats = sessStats();
  const dTot = stats.dTot, dDone = stats.dDone, dGot = stats.dGot, dShk = stats.dShk, dLeft = stats.dLeft, revisit = stats.revisit, wbGot = stats.wbGot, wbMiss = stats.wbMiss, missed = stats.missed, wbTot = stats.wbTot, wbDone = stats.wbDone, mScore = stats.mScore, mTime = stats.mTime, mRuns = stats.mRuns, mInt = stats.mInt;
  const rec = pickRec(revisit, missed, mScore, dDone, dTot, wbDone, mRuns, stats.mixWeak, mOut(stats));
  let html = '';
  html += '<div class="ss-rec" style="border-color:' + rec.bd + ';background:' + rec.bg + '">' +
       '<div class="ss-rk" style="color:' + rec.ink + '">' + rec.kicker + '</div>' +
       '<div class="ss-rt" style="color:' + rec.ink + '">' + rec.text + '</div>' +
       (rec.btn ? '<button class="ss-go" id="ssgo" type="button">' + rec.btn + '</button>' : '') +
     '</div>';
  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--acc)"></span>Probe Drill</div>';
  if (dDone === 0) html += '<div class="ss-stat ss-none">Not started \u2014 0 of ' + dTot + ' graded.</div>';
  else {
    html += '<div class="ss-stat"><span class="ss-g">' + dGot + ' solid</span> &middot; <span class="ss-s">' + dShk + ' to revisit</span> &middot; ' + dLeft + ' untouched of ' + dTot + '</div>';
    if (revisit.length) html += '<div class="ss-list"><b>Revisit:</b> ' + revisit.join(' &middot; ') + '</div>';
  }
  html += '</div>';
  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--teal)"></span>Whiteboard recall</div>';
  if (wbDone === 0) html += '<div class="ss-stat ss-none">Not started \u2014 0 of ' + wbTot + ' graded.</div>';
  else {
    html += '<div class="ss-stat"><span class="ss-g">' + wbGot + ' recalled</span> &middot; <span class="ss-s">' + wbMiss + ' missed</span> of ' + wbTot + '</div>';
    if (missed.length) html += '<div class="ss-list"><b>Re-draw:</b> ' + missed.join(' &middot; ') + '</div>';
  }
  html += '</div>';
  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--indigo)"></span>Mock Run</div>';
  if (mScore === null && mRuns === 0) html += '<div class="ss-stat ss-none">Not run yet \u2014 take the full round on the clock.</div>';
  else html += '<div class="ss-stat">Last run: <span class="' + (mockIsStrong(mScore, mOut(stats)) ? 'ss-g' : 'ss-s') + '">' + (mScore === null ? 'completed, unscored' : mScore + ' / ' + mOut(stats)) + '</span>' + (mTime != null ? ' in ' + mockFmt(mTime) : '') + ' &middot; ' + mRuns + ' run' + (mRuns === 1 ? '' : 's') + (mInt ? ' &middot; cut off on <b>' + mInt + '</b> of ' + mOut(stats) + '' : '') + '</div>';
  html += '</div>';
  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:var(--acc2)"></span>Mixed Fire</div>';
  if (stats.mixTot === 0) html += '<div class="ss-stat ss-none">Not run yet \u2014 mix all three registers under one clock.</div>';
  else {
    html += '<div class="ss-stat"><span class="ss-g">' + stats.mixGot + ' handled</span> &middot; <span class="ss-s">' + stats.mixShk + ' shaky</span> across ' + stats.mixTot + ' item' + (stats.mixTot === 1 ? '' : 's') + '</div>';
    if (stats.mixWeak.length) html += '<div class="ss-list"><b>Shaky:</b> ' + stats.mixWeak.join(' &middot; ') + '</div>';
  }
  html += '</div>';
  html += '<div class="ss-carry"><div class="ss-carry-h">Carry this session across days</div>' +
     '<div class="ss-code-row"><input class="ss-code" id="sscode" readonly aria-label="Session code" value="' + encodeSession() + '"><button class="ss-copy" id="sscopy" type="button">Copy</button></div>' +
     '<div class="ss-cmp-row"><textarea class="ss-paste" id="sspaste" rows="2" aria-label="Past session codes" placeholder="Optional: paste codes from another device" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><button class="ss-cmpbtn" id="sscmpbtn" type="button">Compare</button></div>' +
     '<div id="sscmpout"></div></div>';
  html += '<button class="ss-print" id="ssprint" type="button">Save this session as a PDF &rarr;</button>';
  html += '<button class="ss-clear" id="ssclear" type="button">Clear this session &amp; start fresh</button>';
  sessbody.innerHTML = html;

  /* "do this next" button: close, then jump to the relevant tab/overlay (and
     pre-load the weak-spot drill or whiteboard reset where the rec asks for it). */
  const go = sessRoot.getElementById('ssgo');
  if (go) go.onclick = function () {
    closeSession();
    if (rec.tab === '__mock__') { openMock(); return; }
    if (rec.tab === '__mix__') { openMix(); return; }
    if (rec.tab) { switchTab(rec.tab); if (rec.weak) { const dr = drillEl(); if (dr) dr.weak(); } else if (rec.wbreset) { const w = wbEl(); if (w) w.rerunMissed(); } }
  };
  /* Clear is two-tap (arm, then confirm) so progress can't be wiped by accident. */
  const clr = sessRoot.getElementById('ssclear');
  let clrArmed = false;
  if (clr) clr.onclick = function () {
    if (!clrArmed) { clrArmed = true; clr.classList.add('arm'); clr.textContent = 'Tap again \u2014 this wipes all progress'; return; }
    clearSession();
    renderSession();
  };
  /* Save-as-PDF: build the printable report, flag the body for print CSS, print. */
  const prn = sessRoot.getElementById('ssprint');
  if (prn) prn.onclick = function () { buildSessReport(); document.body.classList.add('print-session'); try { window.print(); } catch (_) {} };
  /* Copy the session code (execCommand with a clipboard-API fallback). */
  const cp = sessRoot.getElementById('sscopy');
  if (cp) cp.onclick = function () {
    const f = sessRoot.getElementById('sscode');
    if (!f) return;
    f.focus();
    f.select();
    try { f.setSelectionRange(0, 400); } catch (_) {}
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    if (navigator.clipboard && navigator.clipboard.writeText) { try { navigator.clipboard.writeText(f.value); } catch (_) {} }
    const b = this;
    b.textContent = ok ? 'Copied' : 'Press \u2318C';
    setTimeout(function () { b.textContent = 'Copy'; }, 1500);
  };
  const cmb = sessRoot.getElementById('sscmpbtn');
  if (cmb) cmb.onclick = renderCompare;
  /* Cmd/Ctrl-Enter in the paste box also triggers Compare. */
  const pst = sessRoot.getElementById('sspaste');
  if (pst) pst.onkeydown = function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); renderCompare(); } };
  renderCompare();   /* auto-show the trend from history on open (no click needed) */
}
/* Wire the overlay open/close triggers. */
document.getElementById('sessopen').onclick = openSession;
document.getElementById('sessx').onclick = closeSession;
/* "Interviewer cuts in" toggle (shared with mock run): flips the interrupt flag,
   updates the pressed state and label, and pre-rolls a fresh interrupt set. */
var inttogEl = document.getElementById('inttog');
if (inttogEl) inttogEl.onclick = function () {
  mockInterrupt = !mockInterrupt;
  this.setAttribute('aria-pressed', mockInterrupt ? 'true' : 'false');
  this.querySelector('.inttog-lbl').innerHTML = 'Interviewer cuts in mid-answer &mdash; <b>' + (mockInterrupt ? 'on' : 'off') + '</b>';
  mockIntSet = mockInterrupt ? pickInterrupts() : {};
};


/* ===== SESSION PROGRESS as a shadow component =====
   The body moves into this shadow; the existing render functions target the
   shadow body via the reassigned `sessbody` global and look up their rendered
   controls through `sessRoot` (ShadowRoot.getElementById, the drill pattern).
   The frame + open/close + the light print container (#sessreport) stay light. */
var SESS_STYLE = `.sess-body{padding:var(--space-18) var(--space-20) var(--space-24);overflow-y:auto;flex:1;min-height:0}
.ss-rec{border-radius:12px;padding:var(--space-15) var(--space-17);margin:0 0 var(--space-16);border:1.5px solid;box-shadow:0 2px 8px -3px rgba(83,74,183,.08)}
.ss-rk{font:var(--font-weight-heavy) 9.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;margin:0 0 var(--space-7)}
.ss-rt{font-size:var(--font-size-small);line-height:var(--line-height-loose);font-weight:var(--font-weight-semibold)}
.ss-rt b{font-weight:var(--font-weight-heavy)}
.ss-go{margin-top:var(--space-12);border:none;border-radius:9px;padding:var(--space-10) var(--space-16);font:var(--font-weight-bold) 12px -apple-system,sans-serif;cursor:pointer;color:var(--ss-go-fg);background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 4px 14px -4px rgba(83,74,183,.25);transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),filter var(--duration-base) var(--ease-base)}
.ss-go:hover{filter:brightness(1.1);box-shadow:0 6px 20px -4px rgba(83,74,183,.3)}
.ss-go:active{transform:translateY(1px) scale(.98);filter:brightness(.95)}
.ss-card{border:1px solid var(--bd);border-radius:12px;padding:var(--space-13) var(--space-15);margin:0 0 var(--space-11);background:linear-gradient(135deg,var(--ss-card-bg) 0%,rgba(83,74,183,.015) 100%);transition:box-shadow var(--duration-moderate) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.ss-card:hover{box-shadow:0 4px 14px -6px rgba(83,74,183,.1);border-color:rgba(83,74,183,.15)}
.ss-h{font:var(--font-weight-heavy) 12.5px -apple-system,sans-serif;color:var(--ink);margin:0 0 var(--space-7);display:flex;align-items:center;gap:var(--space-8)}
.ss-dot{width:var(--space-8);height:var(--space-8);border-radius:50%;flex:none;transition:transform var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base)}
.ss-card:hover .ss-dot{transform:scale(1.2)}
.ss-stat{font-size:var(--font-size-caption);color:var(--mut);line-height:var(--line-height-loose)}
.ss-g{color:var(--teal);font-weight:var(--font-weight-heavy)}
.ss-s{color:var(--amber);font-weight:var(--font-weight-heavy)}
.ss-list{margin:var(--space-9) 0 0;padding:var(--space-10) var(--space-13);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.03) 100%);border-radius:9px;font-size:var(--font-size-micro);line-height:var(--line-height-spacious);color:var(--accink)}
.ss-list b{font-weight:var(--font-weight-heavy)}
.ss-none{color:var(--mut2);font-style:italic}
.ss-clear{width:100%;margin-top:var(--space-7);border:1px dashed var(--bd);background:transparent;color:var(--mut2);font:var(--font-weight-semibold) 11.5px -apple-system,sans-serif;padding:var(--space-11) var(--space-14);border-radius:10px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),border-color var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base)}
.ss-clear:hover{border-color:var(--mut);color:var(--mut);background:rgba(83,74,183,.02);transform:translateY(-1px)}
.ss-clear:active{transform:translateY(1px) scale(.98)}
.ss-clear.arm{transition:transform var(--duration-fast) var(--ease-base),background var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.ss-print{width:100%;margin-top:var(--space-9);border:1.5px solid var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);color:var(--accink);font:var(--font-weight-bold) 12.5px -apple-system,sans-serif;padding:var(--space-12) var(--space-14);border-radius:10px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base)}
.ss-print:hover{background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;box-shadow:0 4px 16px -4px rgba(83,74,183,.25);transform:translateY(-1px)}
.ss-print:active{transform:translateY(1px) scale(.98)}
.ss-carry{margin-top:var(--space-16);padding:var(--space-14) var(--space-16);border:1px solid var(--bd);border-radius:12px;background:linear-gradient(135deg,var(--ss-carry-bg) 0%,rgba(83,74,183,.02) 100%)}
.ss-carry-h{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2);margin-bottom:var(--space-10)}
.ss-code-row,.ss-cmp-row{display:flex;gap:var(--space-8)}
.ss-code-row{margin-bottom:var(--space-9)}
.ss-code{flex:1;min-width:0;font:var(--font-weight-semibold) 11px ui-monospace,Menlo,monospace;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.03) 100%);border:1px solid var(--ss-code-bd);border-radius:8px;padding:var(--space-9) var(--space-10)}
.ss-copy,.ss-cmpbtn{flex:none;border:1.5px solid var(--acc);background:linear-gradient(135deg,var(--ss-btn-bg) 0%,rgba(83,74,183,.03) 100%);color:var(--acc);font:var(--font-weight-bold) 11px -apple-system,sans-serif;padding:var(--space-9) var(--space-13);border-radius:8px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base)}
.ss-copy:hover,.ss-cmpbtn:hover{transform:translateY(-1px);box-shadow:0 3px 10px -3px rgba(83,74,183,.15)}
.ss-copy:active,.ss-cmpbtn:active{transform:translateY(1px) scale(.97);background:var(--accbg)}
.ss-paste{flex:1;min-width:0;font:var(--font-weight-medium) 11px ui-monospace,Menlo,monospace;color:var(--ink);background:var(--ss-btn-bg);border:1px solid var(--bd);border-radius:8px;padding:var(--space-9) var(--space-10);resize:none;line-height:var(--line-height-relaxed)}
.cmp-head{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2);margin:var(--space-14) 0 var(--space-5)}
.cmp-row{display:flex;align-items:center;gap:var(--space-8);padding:var(--space-8) 0;border-top:1px solid var(--bd)}
.cmp-lbl{flex:1;font-size:var(--font-size-caption);color:var(--ink)}
.cmp-val{font-size:var(--font-size-caption);color:var(--mut)}
.cmp-d{font:var(--font-weight-heavy) 11.5px -apple-system,sans-serif;min-width:var(--space-38);text-align:right}
.cmp-err{font-size:var(--font-size-caption);color:var(--red);background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.04) 100%);border:1px solid #e8c5c0;border-radius:8px;padding:var(--space-10) var(--space-12);margin-top:var(--space-12);line-height:var(--line-height-loose)}
.cmp-hint{font-size:var(--font-size-caption);color:var(--mut);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.03) 100%);border:1px solid rgba(83,74,183,.12);border-radius:8px;padding:var(--space-10) var(--space-12);margin-top:var(--space-12);line-height:var(--line-height-loose)}
.ss-cmp-row{align-items:flex-start}
.tr-row{padding:var(--space-9) 0;border-top:1px solid var(--bd)}
.tr-top{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-8)}
.tr-lbl{font-size:var(--font-size-caption);color:var(--ink);font-weight:var(--font-weight-semibold)}
.tr-bot{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-8);margin-top:var(--space-4)}
.tr-spark{flex:1;min-width:0;font:var(--font-weight-semibold) 18px ui-monospace,Menlo,monospace;letter-spacing:1px;line-height:var(--line-height-none);white-space:nowrap;overflow:hidden;text-shadow:0 0 8px rgba(83,74,183,.15)}
.tr-row:hover .tr-spark{text-shadow:0 0 12px rgba(83,74,183,.25)}
.tr-val{flex:none;font-size:var(--font-size-caption);color:var(--mut)}
.ss-clear:hover{border-color:var(--mut);color:var(--mut)}
.ss-clear.arm{border-style:solid;border-color:var(--red);background:var(--redbg);color:var(--red);font-weight:var(--font-weight-heavy)}`;
class DeepSession extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + SESS_STYLE + '</style><div style="display:flex;flex-direction:column;height:100%"><div class="sess-body" id="sessbody"></div></div>';
    sessbody = root.getElementById('sessbody');
    sessRoot = root;
  }
}
customElements.define('deep-session', DeepSession);
