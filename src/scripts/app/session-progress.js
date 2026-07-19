/* The whiteboard custom element exposes resetAll() / rerunMissed() / getStats();
   session-progress reaches it through this helper rather than the old wb globals. */
function wbEl() { return document.querySelector('#wb deep-whiteboard'); }
/* ============ SESSION PROGRESS ============ */
var sessov = document.getElementById('sessov'), sessbody = null, sessactions = null, sessRoot = null;
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
   whiteboard cues, mock-run records, and mixed-fire state.
   It must clear what the PANEL READS, or the button is a lie. The panel's drill and
   whiteboard figures come from this topic's canonical record (see sessStats), so resetting
   only the live components would re-render the very same numbers and "Clear this session"
   would visibly do nothing. Progress.clear(id) drops the topic's drill record, its whiteboard
   record and its ad-hoc shaky marks -- and ONLY this topic's, matching the panel's scope
   (Progress.clearAll would wipe the other 45 topics the panel never claimed to report on).
   The mixed-fire log is PERSISTED, so it has to be cleared in the store too, not just in
   memory -- blanking the variable alone let a reload restore everything it had just wiped. */
function drillEl() { return document.querySelector('#drill deep-drill'); }
function clearSession() {
  const d = drillEl(); if (d) d.reset();
  const wb = wbEl();
  if (wb) wb.resetAll();
  const id = sessTopicId();
  try { if (id && typeof Progress !== 'undefined' && Progress.clear) Progress.clear(id); } catch (e) {}
  mockLastScore = null; mockLastOutOf = null; mockLastTime = null; mockRuns = 0; mockLastInt = 0;
  try { if (id && typeof Store !== 'undefined' && Store.remove) Store.remove('mock.' + id); } catch (e) {}
  mixLog = []; mxRes = []; mxGot = 0; mxShk = 0;
  /* REMOVE the per-topic mix key, do not persist an empty log: an empty `mix.<id>` still EXISTS,
     and mixRanAny() (panels.js engaged()) counts existence, so writing [] would leave the home
     falsely "engaged" after a clear. Removal is the honest clear now that the log is per-topic. */
  try { if (id && typeof Store !== 'undefined' && Store.remove) Store.remove('mix.' + id); } catch (e) {}
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
function pickRec(revisit, missed, mScore, dDone, dTot, wbDone, mRuns, mixWeak, mOutOf, mixTot) {
  if(revisit.length&&dDone>=dTot)return {kicker:'Focus next',text:'You flagged <b>'+revisit.length+'</b> probe'+(revisit.length===1?'':'s')+' to revisit. Re-drill '+(revisit.length===1?'it':'them')+' until the signal comes automatically.',btn:'Re-drill weak spots \u2192',tab:'drill',weak:true,bd:'#e8c5c0',bg:'var(--redbg)',ink:'var(--red)'};
  if(missed.length)return {kicker:'Focus next',text:'You missed <b>'+missed.length+'</b> step'+(missed.length===1?'':'s')+' on the whiteboard. Re-draw '+(missed.length===1?'it':'them')+' from a blank page.',btn:'Re-draw missed steps \u2192',tab:'wb',wbreset:true,bd:'#e8c5c0',bg:'var(--redbg)',ink:'var(--red)'};
  if(mScore!==null&&!mockIsStrong(mScore,mOutOf))return {kicker:'Focus next',text:'Your last mock landed at <b>'+mScore+' / '+mOutOf+'</b>. Run the arc again and target the beats that wobbled.',btn:'Run the round again \u2192',tab:'__mock__',bd:'#e8c5c0',bg:'var(--redbg)',ink:'var(--red)'};
  if(dDone<dTot)return {kicker:'Keep going',text:'You\u2019ve graded <b>'+dDone+' of '+dTot+'</b> probes. Clear the rest so nothing in the round is a surprise.',btn:'Back to the drill \u2192',tab:'drill',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(wbDone===0)return {kicker:'Keep going',text:'You haven\u2019t tried the <b>whiteboard recall</b> yet \u2014 rebuild the whole design from cues alone.',btn:'Try the whiteboard \u2192',tab:'wb',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(mRuns===0)return {kicker:'Keep going',text:'Drill and whiteboard are clean. Now pressure-test the <b>whole arc</b> on the clock.',btn:'Start a mock run \u2192',tab:'__mock__',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  /* 6.5 -- the ONLY ladder edit (blast-radius rule). Branch 7 below requires mixWeak NON-EMPTY, so
     the ladder structurally never hands anyone to a FIRST mixed-fire run: a user who drilled,
     whiteboarded and ran a mock but never touched mixed fire fell straight through to branch 8
     ("you're ready") -- a lie, since register-switching is the one surface they have not tested.
     mixTot===0 at this position (past every drill/wb/mock branch) is exactly that state. This
     upgrades the session panel and the printed report for free. Cross-topic logic stays OUTSIDE
     pickRec; the whole decision table is golden-pinned in test/flow_data.cjs. */
  if(mixTot===0)return {kicker:'Sharpen',text:'Drill, whiteboard and a timed run are behind you \u2014 but you haven\u2019t run <b>mixed fire</b> yet. Switching registers cold is where real rounds slip; go clear a mixed set.',btn:'Run mixed fire \u2192',tab:'__mix__',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  if(mixWeak&&mixWeak.length)return {kicker:'Sharpen',text:'You fumbled <b>'+mixWeak.length+'</b> item'+(mixWeak.length===1?'':'s')+' in mixed fire \u2014 register-switching is where rounds slip. Re-run a mixed set and clear them.',btn:'Run mixed fire \u2192',tab:'__mix__',bd:'#cfc7f0',bg:'var(--accbg)',ink:'var(--accink)'};
  return {kicker:'You\u2019re ready',text:'Solid across the drill, the whiteboard, and a timed run. Keep it sharp \u2014 run it again faster, or under interruption.',btn:null,tab:null,bd:'#bfe0d3',bg:'var(--tealbg)',ink:'var(--teal)'};
}
/* ===== THE MICROTASK FRESHNESS LAW (Wave 0 mechanism) =====
   Every completion-moment recommendation MUST be computed through flowFresh, never inline.
   Here is the landmine it steps over, verified in source: a grade updates the canonical record
   SYNCHRONOUSLY, but only AFTER the completion RENDER. The whiteboard grades by running
   _updCount() -- which renders the verdict -- and only THEN _emitGraded(), which fires
   `whiteboardgraded` -> Progress.snapshotWb() (whiteboard.js:124-126, :186; progress.js:418).
   The drill likewise renders its scoreboard before dispatching `drillgraded` (drill/logic.js:638).
   So a rec computed INLINE during that render reads the record ONE GRADE SHORT and recommends the
   state the user just left -- e.g. it never sees the step they just missed. queueMicrotask defers
   the computation until the current task unwinds, i.e. until after the synchronous snapshot, so
   the record is fresh. This is MECHANISM, not per-call-site vigilance: Wave 1's flowRec() routes
   every terminal-state recommendation through here, and test/flow_data.cjs pins the drill AND wb
   last-grade-then-read cases (inline = stale, flowFresh = fresh) so the law cannot silently rot. */
function flowFresh(compute) {
  if (typeof queueMicrotask === 'function') queueMicrotask(compute);
  else Promise.resolve().then(compute);   /* older engines: a resolved promise is the same microtask turn */
}
/* ===================================================================================
   WAVE 1 -- THE HAND-OFF GRAMMAR (scaffold). Direction A, panel doc Wave-1 line (S59).
   ONE compute, N renderings: every forward affordance in the app -- the walk #wnext morph,
   the drill/wb/mock/mixed terminal strips, the seg pip -- renders from flowRec(), never from a
   second recommendation source (the anti-goal). pickRec is the ladder; flowRec is the meso tier
   that WRAPS it (never forks it), attaches the D5 receipt (the raw stored numbers justifying the
   rec), and owns the ONE piece of cross-topic logic pickRec must not: the topic-end hand-off
   (decision-table row 10), computed OUTSIDE pickRec.

   The three primitives the five terminals consume:
     flowRec(stats)      -> the recommendation object (pickRec + receipt + topic-end), fresh
     flowGo(rec)         -> executes rec.tab: pane switch / openMock / openMix / next-topic
     flowStripHtml(rec)  -> the forward strip's HTML (SELF-dedupe: '' when the surface's own
                            button already IS the rec, so no button soup)
   Terminals are wired in subsequent commits; each new gate (flow_handoff, flow_evidence) is
   watched RED before it is trusted. Completion-moment callers MUST route through flowFresh. */

/* The raw-number receipt for a rec -- D5's trust mechanism. flow_evidence recomputes each of
   these from the stored record and fails on mismatch, so a receipt is a claim the gate audits,
   not decoration. Keyed off the rec's tab/flags + the same stats the rec was computed from. */
function flowReceipt(rec, s) {
  if (!rec || !s) return '';
  if (rec.weak) return s.revisit.length + ' to revisit';
  if (rec.wbreset) return s.missed.length + ' step' + (s.missed.length === 1 ? '' : 's') + ' missed';
  if (rec.tab === '__mock__') return (s.mScore != null) ? (s.mScore + ' / ' + mOut(s) + ' last mock') : (s.mRuns + ' mock run' + (s.mRuns === 1 ? '' : 's'));
  if (rec.tab === '__mix__') return (s.mixWeak && s.mixWeak.length) ? (s.mixWeak.length + ' fumbled') : (s.mixTot + ' mixed set' + (s.mixTot === 1 ? '' : 's'));
  if (rec.tab === 'drill') return s.dDone + ' of ' + s.dTot + ' graded';
  if (rec.tab === 'wb') return s.wbDone + ' of ' + s.wbTot + ' recalled';
  return '';
}

/* The next TOPIC to study -- the ONE cross-topic step, kept OUTSIDE pickRec (the anti-goal:
   pickRec is per-topic; nothing cross-topic may live in it). Priority: the weakest OTHER topic by
   the record's own ranking (Progress.summary().weakest), else the next UNTOUCHED topic in the
   current room (same group), else any untouched. Returns { id, label, receipt } or null. */
function flowNextTopic() {
  try {
    if (typeof Progress === 'undefined' || typeof TopicRegistry === 'undefined') return null;
    var cur = TopicRegistry.current() ? TopicRegistry.current().id : null;
    var nameOf = function (id) { var t = TopicRegistry.get(id); return (t && t.identity && t.identity.h1) ? t.identity.h1 : id; };
    var weak = (Progress.summary().weakest || []), i, ids = TopicRegistry.ids(), k;
    for (i = 0; i < weak.length; i++) {
      if (weak[i].id === cur) continue;
      return { id: weak[i].id, label: nameOf(weak[i].id), receipt: weak[i].shk ? (weak[i].shk + ' shaky') : (weak[i].left + ' left') };
    }
    var curT = cur ? TopicRegistry.get(cur) : null, grp = (curT && curT.identity) ? curT.identity.group : null;
    for (k = 0; k < ids.length; k++) {
      if (ids[k] === cur) continue;
      var t2 = TopicRegistry.get(ids[k]);
      if (grp && t2 && t2.identity && t2.identity.group === grp && Progress.status(ids[k]) === 'untouched') return { id: ids[k], label: nameOf(ids[k]), receipt: 'not started' };
    }
    for (k = 0; k < ids.length; k++) { if (ids[k] !== cur && Progress.status(ids[k]) === 'untouched') return { id: ids[k], label: nameOf(ids[k]), receipt: 'not started' }; }
    return null;
  } catch (e) { return null; }
}

/* The meso-tier recommendation: pickRec verbatim + its receipt, PLUS the one cross-topic step.
   When the per-topic ladder is exhausted ("you're ready", no btn), hand forward to the NEXT topic
   (decision-table row 10). Attaching it HERE -- not only in the mixed-fire end -- means every
   terminal that reaches "ready" offers the next topic, from ONE compute. */
function flowRec(stats) {
  var s = stats || sessStats();
  var rec = pickRec(s.revisit, s.missed, s.mScore, s.dDone, s.dTot, s.wbDone, s.mRuns, s.mixWeak, mOut(s), s.mixTot);
  if (rec.btn == null) {
    var nt = flowNextTopic();
    if (nt) return { kicker: 'Banked', text: 'This topic is banked &mdash; solid across the drill, whiteboard, mock and mixed fire. Move to your next weak spot.', btn: 'Next: ' + nt.label + ' &rarr;', tab: '__topic__', nextTopic: nt.id, receipt: nt.receipt, bd: '#bfe0d3', bg: 'var(--tealbg)', ink: 'var(--teal)' };
    return rec;   /* nothing left to hand to -- keep the "you're ready" terminal (no strip) */
  }
  rec.receipt = flowReceipt(rec, s);
  return rec;
}

/* Execute a rec's forward navigation. Extracted VERBATIM from the session panel's #ssgo onclick
   so the two can never drift (one-compute): the panel now calls this. Every future terminal calls
   it too. Boundaries are never auto-crossed -- flowGo runs only from a real press. */
function flowGo(rec) {
  if (!rec || !rec.tab) return;
  if (rec.tab === '__mock__') { if (typeof openMock === 'function') openMock(); return; }
  if (rec.tab === '__mix__') { if (typeof openMix === 'function') openMix(); return; }
  if (rec.tab === '__topic__') { try { if (rec.nextTopic && typeof TopicRegistry !== 'undefined' && TopicRegistry.setTopic) TopicRegistry.setTopic(rec.nextTopic); } catch (e) {} return; }
  switchTab(rec.tab);
  if (rec.weak) {
    var dr = drillEl(), widx = [];
    try { if (typeof Progress !== 'undefined' && Progress.weakIdx) widx = Progress.weakIdx(sessTopicId()); } catch (e) {}
    if (dr) dr.weak(widx);
  } else if (rec.wbreset) { var w = wbEl(); if (w) w.rerunMissed(); }
}

/* The forward strip's HTML for a terminal. SELF-dedupe: when the surface's own existing button
   already IS the recommendation (drill #dweak, wb #wbrerun, mock #mbagain, mixed #mxretry), the
   rec carries `self:true` and this returns '' -- one offered next per screen, no button soup.
   A rec with no button (the "you're ready" terminal) likewise yields no strip. */
function flowStripHtml(rec) {
  if (!rec || !rec.btn || rec.self) return '';
  var receipt = rec.receipt ? '<span class="flow-rcpt">' + rec.receipt + '</span>' : '';
  return '<div class="flow-strip" style="border-color:' + rec.bd + ';background:' + rec.bg + '">' +
    '<div class="flow-k" style="color:' + rec.ink + '">' + rec.kicker + '</div>' +
    '<div class="flow-t" style="color:' + rec.ink + '">' + rec.text + '</div>' +
    '<div class="flow-act"><button class="flow-go" type="button">' + rec.btn + '</button>' + receipt + '</div>' +
    '</div>';
}
/* W1 -- THE SEG RECOMMENDATION PIP. An always-on marker on the surface flowRec points at, so the
   recommended next is visible WITHOUT opening the session panel: a pip on its seg tab, or a
   .flow-cta ring on #mockopen / #mixopen when the next is an overlay. Absolute-positioned (::before
   / box-shadow), so it adds ZERO box delta -- the tab/button never resizes, and the seg strip's
   one-declaration drift immunity + the click-surface verdict are both untouched. Recomputed on
   every state change: topic switch, each grade, and mock/mixed completion. Suppressed on #home and
   on the tab you are already on (the pip points elsewhere). */
function flowPip() {
  try {
    var was = document.querySelectorAll('.flow-pip, .flow-cta');
    for (var i = 0; i < was.length; i++) was[i].classList.remove('flow-pip', 'flow-cta');
    if (typeof flowRec !== 'function' || document.documentElement.dataset.view === 'home') return;
    var rec = flowRec();
    if (!rec || !rec.tab || rec.tab === '__topic__') return;    /* the topic-end hands off elsewhere */
    var t = (rec.tab === '__mock__') ? document.getElementById('mockopen')
          : (rec.tab === '__mix__') ? document.getElementById('mixopen')
          : document.querySelector('.seg button[data-tab="' + rec.tab + '"]');
    if (t) t.classList.add((rec.tab === '__mock__' || rec.tab === '__mix__') ? 'flow-cta' : 'flow-pip');
  } catch (e) {}
}
window.addEventListener('deeptopicchange', flowPip);              /* topic switch (fires post data-load) */
window.addEventListener('routechange', flowPip);                 /* home<->topic: clears the pip on home, restores it on return, where deeptopicchange (same topic) would not fire */
document.addEventListener('drillgraded', function () { flowFresh(flowPip); });
document.addEventListener('whiteboardgraded', function () { flowFresh(flowPip); });
document.addEventListener('flowstatechange', flowPip);            /* mock/mixed completion fire this */
(function () { function boot() { flowPip(); } if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); })();

/* W2 -- NEXTUP: the formalized forward compute over the SAME flowRec/pickRec spine (ONE compute, no
   fork -- the anti-goal is a second recommendation source). Three tiers:
   - MICRO: you are mid-unit in the pane flowRec points at -> the pane owns momentum; the dock stays
     quiet (boundary-suppression, the judges' amendment).
   - MESO: a unit is complete, or you are on a reading pane -> flowRec() verbatim (the recommendation).
   - MACRO: the meso terminal ("you're ready") -> flowRec's cross-topic __topic__ hand-off
     (flowNextTopic). Progress.summary() is read ONLY down this lazy path, never on the hot mid-unit
     path.
   The tier is decided from PURE DATA -- "is the recommendation the pane I am already on?" -- reading
   no pane's live state, so it never trips the perf deferral rule (eager getters / registry data). */
function nextUp() {
  var rec = flowRec();
  if (!rec || !rec.btn || !rec.tab) return { tier: 'none', rec: rec };   /* "you're ready" -- nothing to hand to */
  var curTab = null;
  try { var on = document.querySelector('.seg button.on'); curTab = on ? on.getAttribute('data-tab') : null; } catch (e) {}
  if (rec.tab === curTab) return { tier: 'micro', rec: rec };            /* the pane owns momentum -- stay quiet */
  return { tier: (rec.tab === '__topic__') ? 'macro' : 'meso', rec: rec };
}

/* W2 -- the desktop CONTINUE DOCK (light DOM, between .side-id and .mockcta). Renders nextUp():
   hidden on micro / none / home (it never nags mid-unit), a compact CTA on meso / macro. The label
   and receipt are flowRec's VERBATIM -- byte-identical to the seg pip and the session panel (the
   one-compute contract test proves it). `n` activates it (shell.js: KeyGuard + dialog bail).
   Recomputed on every state change AND on pane switch -- its suppression depends on the current
   pane, unlike the pip, so switchTab fires flowstatechange. */
function flowDock() {
  try {
    var d = document.getElementById('ndock');
    if (!d) return;
    var n = (document.documentElement.dataset.view === 'home') ? { tier: 'home' } : nextUp();
    if (!n.rec || n.tier !== 'meso' && n.tier !== 'macro' || !n.rec.btn) { d.hidden = true; d.innerHTML = ''; return; }
    var rec = n.rec, receipt = rec.receipt ? '<span class="nd-rcpt">' + rec.receipt + '</span>' : '';
    d.innerHTML = '<span class="nd-k" style="color:' + rec.ink + '">' + rec.kicker + '</span>' +
      '<button class="nd-go" type="button" aria-keyshortcuts="N">' + rec.btn + '</button>' + receipt;
    var b = d.querySelector('.nd-go');
    if (b) b.onclick = function () { if (typeof flowGo === 'function') flowGo(rec); };
    d.hidden = false;
  } catch (e) {}
}
window.addEventListener('deeptopicchange', flowDock);
window.addEventListener('routechange', flowDock);
document.addEventListener('drillgraded', function () { flowFresh(flowDock); });
document.addEventListener('whiteboardgraded', function () { flowFresh(flowDock); });
document.addEventListener('flowstatechange', flowDock);              /* mock/mixed completion + pane switch */
(function () { function boot() { flowDock(); } if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); })();
/* The topic the panel is reporting on. Every per-topic figure below is keyed to it. */
function sessTopicId() {
  try { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; } catch (e) { return null; }
}
/* Gather a full snapshot of progress across all four surfaces (drill, whiteboard, mock,
   mixed fire) into one flat stats object.

   CANONICAL RECORD, NOT THE LIVE BOARD -- the panel LIED after a reload without this.
   getStats() on the drill / whiteboard describes their CURRENT WORKING SET, and a page load
   starts both blank. So on a topic whose persisted record said done = 22/22, the panel
   announced "Not started -- 0 of 22 graded" and then recommended "Back to the drill ->" at a
   user who had finished it. Same live-vs-record conflation that used to TRUNCATE the stored
   record before Progress.snapshot() learned to MERGE (see progress.js) -- contained there,
   still misreported here.

   What the panel reports is unchanged: this topic's rehearsal record across four surfaces.
   It now reads all four from the same place. Mock and mixed fire ALREADY did -- mock.last and
   mix.log are restored from Store on load -- so drill and whiteboard were the only two
   surfaces answering a different question from the other two. Progress.snapshot() merges every
   grade into the record the instant it is made, so the record is never staler than the board:
   the panel reads identically DURING a session and, unlike before, still tells the truth after
   a reload.

   The live components remain the source for the two things only they know:
     - the FULL bank size (the denominator) before anything has been graded, and
     - each whiteboard step's CUE TEXT -- the record stores grades by step index, not prose.
   Note dTot is the WHOLE topic's bank, never `cards.length`: Quick 5, a tier filter and every
   re-drill shrink the live working set, and "0 of 22 graded" was always a claim about the
   topic, not about whatever subset happened to be on screen. */
function sessStats() {
  const id = sessTopicId();
  const dLive = drillEl() ? drillEl().getStats() : null;
  const dRec = (id && typeof Progress !== 'undefined') ? Progress.get(id) : null;
  const dTot = (dLive && dLive.bankTot) ? dLive.bankTot : (dRec ? dRec.tot : 0);
  const dDone = dRec ? dRec.done : 0, dGot = dRec ? dRec.got : 0, dShk = dRec ? dRec.shk : 0;
  const revisit = (dRec && dRec.revisit) ? dRec.revisit : [];
  const dLeft = dTot - dDone;

  const wLive = wbEl() ? wbEl().getStats() : null;
  const items = (wLive && wLive.items) ? wLive.items : [];
  const wbTot = wLive ? wLive.total : 0;
  /* grades: the persisted record (survives the reload). cue text: the live board. */
  const steps = (id && typeof Progress !== 'undefined' && Progress.wbSteps) ? Progress.wbSteps(id, wbTot) : null;
  let wbGot = 0, wbMiss = 0;
  const missed = [];
  for (let i = 0; i < wbTot; i++) {
    /* READ THE STEP MAP BY THE STEP'S CONTENT ID, NOT BY THE LOOP COUNTER. snapshotWb writes
       map[stepId] (a content hash -- card-id.js), so indexing it by `i` matched NOTHING for every
       v2 record and reported EVERY whiteboard as 0 recalled / 0 missed -- to the session panel AND
       to pickRec, however much had actually been drawn (measured: an 8-got/1-missed record read as
       0/0). It hid because the panel is below the fold; the flow-grammar surfaces will read this,
       so it must be honest before they do. A legacy record (pre-content-id) is still index-keyed,
       so fall back to `steps[i]` for it; with no record, read the live board. */
    const sid = items[i] && items[i].id;
    const lv = steps ? ((sid != null && steps[sid] != null) ? steps[sid] : steps[i])
                     : (items[i] && items[i].got ? 1 : (items[i] && items[i].missed ? 2 : 0));
    if (lv === 1) wbGot++;
    else if (lv === 2) {
      wbMiss++;
      const cue = (items[i] && items[i].cue) || ('Step ' + (i + 1));
      missed.push(cue.split('&mdash;')[0].replace(/[.\s]+$/, ''));
    }
  }
  const wbDone = wbGot + wbMiss;
  const mixTot = mixLog.length;
  let mixGot = 0;
  const mixLatest = {};
  for (let mi = 0; mi < mixLog.length; mi++) { if (mixLog[mi].ok) mixGot++; mixLatest[mixLog[mi].label] = mixLog[mi].ok; }
  const mixShk = mixTot - mixGot, mixWeak = [];
  for (let label in mixLatest) { if (mixLatest[label] === false) mixWeak.push(label); }
  return { dTot: dTot, dDone: dDone, dGot: dGot, dShk: dShk, dLeft: dLeft, revisit: revisit, wbGot: wbGot, wbMiss: wbMiss, missed: missed, wbTot: wbTot, wbDone: wbDone, mScore: mockLastScore, mOut: mockLastOutOf, mTime: mockLastTime, mRuns: mockRuns, mInt: mockLastInt, mixTot: mixTot, mixGot: mixGot, mixShk: mixShk, mixWeak: mixWeak };
}
/* "Has anything happened on THIS page-load?" -- deliberately a LIVE question, and the one
   thing here that must NOT read the canonical record. The trend keeps ONE point per active
   page-load; the record is CUMULATIVE, so asking it "is this session active?" would answer
   yes on a bare reload of an already-drilled topic and append a fresh, identical point on
   every visit. This is the same expression the trend gate always used -- live drill + live
   whiteboard, plus the mock/mixed counters, which only grow within a load -- so the gate's
   behaviour is unchanged even though the numbers it guards are now canonical. */
function sessLiveActivity() {
  const d = drillEl(), w = wbEl();
  let n = d ? d.getStats().dDone : 0;
  if (w) {
    const items = w.getStats().items;
    for (let i = 0; i < items.length; i++) { if (items[i].got || items[i].missed) n++; }
  }
  return n + mockRuns + mixLog.length;
}
/* Build the printable HTML report (used by Save-as-PDF): a header with the
   timestamp, the recommendation, and a section per surface with its stats. */
function buildSessReport() {
  const stats = sessStats();
  const rec = pickRec(stats.revisit, stats.missed, stats.mScore, stats.dDone, stats.dTot, stats.wbDone, stats.mRuns, stats.mixWeak, mOut(stats), stats.mixTot);
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
  if (sessLiveActivity() <= 0) return;   // nothing happened this session
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
  const liveActive = sessLiveActivity() > 0;
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
/* Status colour for a surface's dot: grey (untouched) / amber (started) / teal (solid --
   done, none weak, >= 80% covered). Replaces the old arbitrary IDENTITY colours (--acc /
   teal / indigo / acc2), which said nothing about where you actually stand. */
function ssDot(done, tot, weak) {
  if (!done) return 'var(--mut)';
  if (!weak && done >= tot * 0.8) return 'var(--teal)';
  return 'var(--amber)';
}
/* The progress track renders ONLY on a surface that has a position to report.
   At zero state a 0%-filled bar is an empty grey hairline that says exactly what the "Not
   started" line directly beneath it already says, only mutely -- 22px of chrome per card for
   no information, 88px across the four. That 88px is what pushed this overlay's own Save-PDF
   and Clear controls off the bottom of the screen, so the track was not merely decorative: it
   was costing the panel its actions. It is worth its height the moment there IS a fraction to
   show, and worth nothing before that -- so it appears exactly then.
   `show` is the NEGATION OF THE CARD'S OWN "not started" TEST, passed in from the one place
   that test is written, so the bar and the stat line can never drift out of agreement.
   The mock gates on RUNS, not score: a round you took and scored 0 on is an honest empty bar
   ("you ran it, you got nothing"); a round you never took has no bar at all. */
function ssBar(show, pct) {
  return show ? '<div class="ss-bar"><i style="width:' + pct + '%"></i></div>' : '';
}
/* Render the whole overlay body: the "do this next" card, a stat card per
   surface (drill / whiteboard / mock / mixed fire), the carry-across-days code
   widget, and the Save-PDF / Clear actions &mdash; then wire every button. */
function renderSession() {
  const stats = sessStats();
  const dTot = stats.dTot, dDone = stats.dDone, dGot = stats.dGot, dShk = stats.dShk, dLeft = stats.dLeft, revisit = stats.revisit, wbGot = stats.wbGot, wbMiss = stats.wbMiss, missed = stats.missed, wbTot = stats.wbTot, wbDone = stats.wbDone, mScore = stats.mScore, mTime = stats.mTime, mRuns = stats.mRuns, mInt = stats.mInt;
  const rec = pickRec(revisit, missed, mScore, dDone, dTot, wbDone, mRuns, stats.mixWeak, mOut(stats), stats.mixTot);
  let html = '';
  html += '<div class="ss-rec" style="border-color:' + rec.bd + ';background:' + rec.bg + '">' +
       '<div class="ss-rk" style="color:' + rec.ink + '">' + rec.kicker + '</div>' +
       '<div class="ss-rt" style="color:' + rec.ink + '">' + rec.text + '</div>' +
       (rec.btn ? '<button class="ss-go" id="ssgo" type="button">' + rec.btn + '</button>' : '') +
     '</div>';
  /* One boolean per card decides BOTH the track and the copy -- see ssBar(). */
  const dStarted = dDone > 0, wbStarted = wbDone > 0;
  const mRan = !(mScore === null && mRuns === 0), mixRan = stats.mixTot > 0;

  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:' + ssDot(dDone, dTot, dShk) + '"></span>Probe Drill</div>' + ssBar(dStarted, dTot ? Math.round(dDone / dTot * 100) : 0);
  if (!dStarted) html += '<div class="ss-stat ss-none">Not started \u2014 0 of ' + dTot + ' graded.</div>';
  else {
    html += '<div class="ss-stat"><span class="ss-g">' + dGot + ' solid</span> &middot; <span class="ss-s">' + dShk + ' to revisit</span> &middot; ' + dLeft + ' untouched of ' + dTot + '</div>';
    if (revisit.length) html += '<div class="ss-list"><b>Revisit:</b> ' + revisit.join(' &middot; ') + '</div>';
  }
  html += '</div>';
  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:' + ssDot(wbDone, wbTot, wbMiss) + '"></span>Whiteboard recall</div>' + ssBar(wbStarted, wbTot ? Math.round(wbDone / wbTot * 100) : 0);
  if (!wbStarted) html += '<div class="ss-stat ss-none">Not started \u2014 0 of ' + wbTot + ' graded.</div>';
  else {
    html += '<div class="ss-stat"><span class="ss-g">' + wbGot + ' recalled</span> &middot; <span class="ss-s">' + wbMiss + ' missed</span> of ' + wbTot + '</div>';
    if (missed.length) html += '<div class="ss-list"><b>Re-draw:</b> ' + missed.join(' &middot; ') + '</div>';
  }
  html += '</div>';
  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:' + (mRuns === 0 ? 'var(--mut)' : (mockIsStrong(mScore, mOut(stats)) ? 'var(--teal)' : 'var(--amber)')) + '"></span>Mock Run</div>' + ssBar(mRan, (mScore != null && mOut(stats)) ? Math.round(mScore / mOut(stats) * 100) : 0);
  if (!mRan) html += '<div class="ss-stat ss-none">Not run yet \u2014 take the full round on the clock.</div>';
  else html += '<div class="ss-stat">Last run: <span class="' + (mockIsStrong(mScore, mOut(stats)) ? 'ss-g' : 'ss-s') + '">' + (mScore === null ? 'completed, unscored' : mScore + ' / ' + mOut(stats)) + '</span>' + (mTime != null ? ' in ' + mockFmt(mTime) : '') + ' &middot; ' + mRuns + ' run' + (mRuns === 1 ? '' : 's') + (mInt ? ' &middot; cut off on <b>' + mInt + '</b> of ' + mOut(stats) + '' : '') + '</div>';
  html += '</div>';
  html += '<div class="ss-card"><div class="ss-h"><span class="ss-dot" style="background:' + ssDot(stats.mixTot, stats.mixTot, stats.mixShk) + '"></span>Mixed Fire</div>' + ssBar(mixRan, stats.mixTot ? Math.round(stats.mixGot / stats.mixTot * 100) : 0);
  if (!mixRan) html += '<div class="ss-stat ss-none">Not run yet \u2014 mix all three registers under one clock.</div>';
  else {
    html += '<div class="ss-stat"><span class="ss-g">' + stats.mixGot + ' handled</span> &middot; <span class="ss-s">' + stats.mixShk + ' shaky</span> across ' + stats.mixTot + ' item' + (stats.mixTot === 1 ? '' : 's') + '</div>';
    if (stats.mixWeak.length) html += '<div class="ss-list"><b>Shaky:</b> ' + stats.mixWeak.join(' &middot; ') + '</div>';
  }
  html += '</div>';
  html += '<div class="ss-carry"><div class="ss-carry-h">Carry this session across days</div>' +
     '<div class="ss-code-row"><input class="ss-code" id="sscode" readonly aria-label="Session code" value="' + encodeSession() + '"><button class="ss-copy" id="sscopy" type="button">Copy</button></div>' +
     '<div class="ss-cmp-row"><textarea class="ss-paste" id="sspaste" rows="2" aria-label="Past session codes" placeholder="Optional: paste codes from another device" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><button class="ss-cmpbtn" id="sscmpbtn" type="button">Compare</button></div>' +
     '<div id="sscmpout"></div></div>';
  sessbody.innerHTML = html;
  /* The two ACTIONS live in a pinned footer, OUTSIDE the scrolling body (see the shadow tree in
     connectedCallback). They used to be the last two children of the scroll area, which made their
     visibility a function of how much progress you happened to have: a long revisit list pushed
     "Save this session as a PDF" past the bottom of the panel, and the panel CLIPPED rather than
     scrolled, so the button did not go below the fold -- it ceased to exist. Out here their
     position does not depend on the content at all, so they cannot be pushed anywhere. */
  sessactions.innerHTML =
    '<button class="ss-print" id="ssprint" type="button">Save this session as a PDF &rarr;</button>' +
    '<button class="ss-clear" id="ssclear" type="button">Clear this session &amp; start fresh</button>';

  /* "do this next" button: close, then jump to the relevant tab/overlay (and
     pre-load the weak-spot drill or whiteboard reset where the rec asks for it).
     The recommendation is computed from the CANONICAL record, so its ACTION has to act on the
     same record -- otherwise the panel promises a re-drill of the probes it just listed and
     hands over an empty one. dr.weak() alone reads the drill's live results, which a reload
     empties; the panel can now legitimately recommend a re-drill on a freshly loaded page (that
     is the whole point of reading the record), so it passes the record's own weak bank indices.
     Falls back to the live run when there is no record to read. */
  const go = sessRoot.getElementById('ssgo');
  /* One-compute: the panel navigates through flowGo(), the same executor every W1 terminal will
     use, so the session sheet and the strips can never disagree on what "go" means. */
  if (go) go.onclick = function () { closeSession(); flowGo(rec); };
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
/* :host(deep-session), NOT :host -- and the argument is load-bearing, not decoration.
   BASE_SHEET declares :host{display:block} and lands in adoptedStyleSheets, which the CSSOM
   orders AFTER a shadow root's own <style>. So at equal specificity the adopted sheet WINS and a
   bare :host{display:flex} here silently loses -- it applied flex-grow and min-height (which
   BASE_SHEET does not set) while leaving display:block, i.e. it looked like it worked and did
   not. Verified by reading display back off the live host, not by reasoning about the cascade.
   :host(<compound>) carries the specificity of :host PLUS its argument (0,1,1 vs 0,1,0), so this
   beats it honestly, without !important and without reaching in from styles.css.

   The chain that makes this panel SCROLL instead of AMPUTATE, one link per line:
     .mock-panel   flex column, max-height:calc(100vh - 36px), overflow:hidden   [styles.css:264]
       :host       flex:1 1 auto + min-height:0  -> may shrink below its content
                   display:flex  + column        -> so its children are flex items at all
         .sess-body  flex:1 + min-height:0 + overflow-y:auto  -> becomes THE scroll container
         .sess-actions  flex:none                             -> never scrolls, never moves
   Every link is a flex item with min-height:0. No percentage height resolves anywhere, which is
   what the old `height:100%` wrapper was betting on -- against a host whose height was auto. */
var SESS_STYLE = `:host(deep-session){display:flex;flex-direction:column;flex:1 1 auto;min-height:0}
.sess-body{padding:var(--space-18) var(--space-20) var(--space-16);overflow-y:auto;flex:1;min-height:0}
.sess-actions{flex:none;display:flex;flex-direction:column;gap:var(--space-8);padding:var(--space-12) var(--space-20) var(--space-14);border-top:1px solid var(--bd);background:var(--card)}
.ss-rec{border-radius:12px;padding:var(--space-15) var(--space-17);margin:0 0 var(--space-16);border:1.5px solid;box-shadow:0 2px 8px -3px var(--acc-a08)}
.ss-rk{font:var(--font-weight-heavy) 9.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;margin:0 0 var(--space-7)}
.ss-rt{font-size:var(--font-size-small);line-height:var(--line-height-loose);font-weight:var(--font-weight-semibold)}
.ss-rt b{font-weight:var(--font-weight-heavy)}
.ss-go{margin-top:var(--space-12);border:none;border-radius:9px;padding:var(--space-10) var(--space-16);font:var(--font-weight-bold) 12px -apple-system,sans-serif;cursor:pointer;color:var(--ss-go-fg);background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 4px 14px -4px var(--acc-a25);transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),filter var(--duration-base) var(--ease-base)}
.ss-go:hover{filter:brightness(1.1);box-shadow:0 6px 20px -4px var(--acc-a30)}
.ss-go:active{transform:translateY(1px) scale(.98);filter:brightness(.95)}
.ss-card{border:1px solid var(--bd);border-radius:12px;padding:var(--space-13) var(--space-15);margin:0 0 var(--space-11);background:linear-gradient(135deg,var(--ss-card-bg) 0%,var(--acc-a02) 100%);transition:box-shadow var(--duration-moderate) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.ss-card:hover{box-shadow:0 4px 14px -6px var(--acc-a10);border-color:var(--acc-a15)}
.ss-h{font:var(--font-weight-heavy) 12.5px -apple-system,sans-serif;color:var(--ink);margin:0 0 var(--space-7);display:flex;align-items:center;gap:var(--space-8)}
.ss-dot{width:var(--space-8);height:var(--space-8);border-radius:50%;flex:none;transition:transform var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base)}
.ss-card:hover .ss-dot{transform:scale(1.2)}
.ss-stat{font-size:var(--font-size-caption);color:var(--mut);line-height:var(--line-height-loose)}
.ss-g{color:var(--teal);font-weight:var(--font-weight-heavy)}
.ss-s{color:var(--amber);font-weight:var(--font-weight-heavy)}
.ss-list{margin:var(--space-9) 0 0;padding:var(--space-10) var(--space-13);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a03) 100%);border-radius:9px;font-size:var(--font-size-micro);line-height:var(--line-height-spacious);color:var(--accink)}
.ss-list b{font-weight:var(--font-weight-heavy)}
.ss-none{color:var(--mut2)}
.ss-bar{height:var(--space-5);background:var(--dbar-bg);border-radius:5px;overflow:hidden;margin:var(--space-8) 0 var(--space-9)}
.ss-bar i{display:block;height:100%;background:var(--topic-solid);border-radius:5px;transition:width var(--duration-slow) var(--ease-base)}
.ss-clear{width:100%;border:1px dashed var(--bd);background:transparent;color:var(--mut2);font:var(--font-weight-semibold) 11.5px -apple-system,sans-serif;padding:var(--space-11) var(--space-14);border-radius:10px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),border-color var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base)}
.ss-clear:hover{border-color:var(--mut);color:var(--mut);background:var(--acc-a02);transform:translateY(-1px)}
.ss-clear:active{transform:translateY(1px) scale(.98)}
.ss-clear.arm{transition:transform var(--duration-fast) var(--ease-base),background var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base)}
.ss-print{width:100%;border:1.5px solid var(--acc);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);color:var(--accink);font:var(--font-weight-bold) 12.5px -apple-system,sans-serif;padding:var(--space-12) var(--space-14);border-radius:10px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base)}
.ss-print:hover{background:linear-gradient(135deg,var(--acc),var(--acc2));color:var(--on-slab);box-shadow:0 4px 16px -4px var(--acc-a25);transform:translateY(-1px)}
.ss-print:active{transform:translateY(1px) scale(.98)}
.ss-carry{margin-top:var(--space-16);padding:var(--space-14) var(--space-16);border:1px solid var(--bd);border-radius:12px;background:linear-gradient(135deg,var(--ss-carry-bg) 0%,var(--acc-a02) 100%)}
.ss-carry-h{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2);margin-bottom:var(--space-10)}
.ss-code-row,.ss-cmp-row{display:flex;gap:var(--space-8)}
.ss-code-row{margin-bottom:var(--space-9)}
.ss-code{flex:1;min-width:0;font:var(--font-weight-semibold) 11px ui-monospace,Menlo,monospace;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a03) 100%);border:1px solid var(--ss-code-bd);border-radius:8px;padding:var(--space-9) var(--space-10)}
.ss-copy,.ss-cmpbtn{flex:none;border:1.5px solid var(--acc);background:linear-gradient(135deg,var(--ss-btn-bg) 0%,var(--acc-a03) 100%);color:var(--acc);font:var(--font-weight-bold) 11px -apple-system,sans-serif;padding:var(--space-9) var(--space-13);border-radius:8px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base)}
.ss-copy:hover,.ss-cmpbtn:hover{transform:translateY(-1px);box-shadow:0 3px 10px -3px var(--acc-a15)}
.ss-copy:active,.ss-cmpbtn:active{transform:translateY(1px) scale(.97);background:var(--accbg)}
.ss-paste{flex:1;min-width:0;font:var(--font-weight-medium) 11px ui-monospace,Menlo,monospace;color:var(--ink);background:var(--ss-btn-bg);border:1px solid var(--bd);border-radius:8px;padding:var(--space-9) var(--space-10);resize:none;line-height:var(--line-height-relaxed)}
.cmp-head{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:var(--mut2);margin:var(--space-14) 0 var(--space-5)}
.cmp-row{display:flex;align-items:center;gap:var(--space-8);padding:var(--space-8) 0;border-top:1px solid var(--bd)}
.cmp-lbl{flex:1;font-size:var(--font-size-caption);color:var(--ink)}
.cmp-val{font-size:var(--font-size-caption);color:var(--mut)}
.cmp-d{font:var(--font-weight-heavy) 11.5px -apple-system,sans-serif;min-width:var(--space-38);text-align:right}
.cmp-err{font-size:var(--font-size-caption);color:var(--red);background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.04) 100%);border:1px solid #e8c5c0;border-radius:8px;padding:var(--space-10) var(--space-12);margin-top:var(--space-12);line-height:var(--line-height-loose)}
.cmp-hint{font-size:var(--font-size-caption);color:var(--mut);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a03) 100%);border:1px solid var(--acc-a12);border-radius:8px;padding:var(--space-10) var(--space-12);margin-top:var(--space-12);line-height:var(--line-height-loose)}
.ss-cmp-row{align-items:flex-start}
.tr-row{padding:var(--space-9) 0;border-top:1px solid var(--bd)}
.tr-top{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-8)}
.tr-lbl{font-size:var(--font-size-caption);color:var(--ink);font-weight:var(--font-weight-semibold)}
.tr-bot{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-8);margin-top:var(--space-4)}
.tr-spark{flex:1;min-width:0;font:var(--font-weight-semibold) 18px ui-monospace,Menlo,monospace;letter-spacing:1px;line-height:var(--line-height-none);white-space:nowrap;overflow:hidden;text-shadow:0 0 8px var(--acc-a15)}
.tr-row:hover .tr-spark{text-shadow:0 0 12px var(--acc-a25)}
.tr-val{flex:none;font-size:var(--font-size-caption);color:var(--mut)}
.ss-clear:hover{border-color:var(--mut);color:var(--mut)}
.ss-clear.arm{border-style:solid;border-color:var(--red);background:var(--redbg);color:var(--red);font-weight:var(--font-weight-heavy)}`;
class DeepSession extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    /* Two children of the HOST itself, and the split is load-bearing: #sessbody SCROLLS
       (flex:1;min-height:0), #sessactions does NOT (flex:none). The old tree wrapped both in a
       `height:100%` div, a percentage that resolved against a host whose own height was
       content-sized -- i.e. against `auto` -- so it collapsed to auto, nothing ever became a
       scroll container, and the panel's overflow:hidden amputated the tail of the panel instead
       of scrolling it. The wrapper is gone: the host is now the flex column directly.
       See the :host(deep-session) rule in SESS_STYLE for the other half of this fix. */
    root.innerHTML = '<style>' + SESS_STYLE + '</style><div class="sess-body" id="sessbody"></div><div class="sess-actions" id="sessactions"></div>';
    sessbody = root.getElementById('sessbody');
    sessactions = root.getElementById('sessactions');
    sessRoot = root;
  }
}
customElements.define('deep-session', DeepSession);
