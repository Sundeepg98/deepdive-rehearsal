/* ===== scripts/app/progress.js -- per-topic progress tracking =====
   MERGES each grade into the topic's canonical record, keyed by topic. Updates
   ONLY on a grade -- merely visiting a topic (which resets the live drill) never
   overwrites the saved progress. Feeds the home / index badges / cross-topic
   rollup / weakest-topics. All reads degrade cleanly when nothing is stored yet.

   WHY A MERGE AND NOT A SNAPSHOT (the P0 this file used to cause).
   getStats() describes the drill's CURRENT WORKING SET, and that set is a SUBSET
   of the topic far more often than not:
     - the three "re-drill what you flagged" buttons the app itself recommends --
       the debrief's "Drill my N Revisit probes", the revset bar's "Drill my N
       flagged probes", and the session overlay's "Re-drill weak spots";
     - Quick 5, and any tier filter (SDE2 / SDE3 / Staff);
     - a plain page RELOAD, which starts the drill at results = [].
   The old code wrote those numbers straight into the topic record, so ONE grade
   inside a 3-probe re-drill turned a completed {done:22,tot:22,revisit:[3]} into
   {done:1,tot:3,revisit:[]} -- the app destroyed a finished run through the button
   it told you to press. The record is now keyed by each probe's index in the FULL
   bank: a grade updates ONE probe inside the whole-topic record, and done / tot /
   got / shk / revisit are DERIVED from the full bank -- never from whatever subset
   happens to be on screen. Same fix, same reason, for the whiteboard below.

   Record shape (fields above `cards` are unchanged, so every existing reader --
   badges, summary(), status(), the index overlay, export/import -- is untouched):
     progress.<id> = { got, shk, done, tot, revisit:[signal], cards:{ idx:level }, ts }
     wbprog.<id>   = { got, missed, total, steps:{ idx:1|2 }, ts }
   level: 1 missed, 2 shaky, 3 solid (drill's judge()).  step: 1 got, 2 missed. */
var Progress = (function () {
  var N = 'progress.';
  var SKN = 'shakymark.';
  var WBN = 'wbprog.';
  function pkey(id) { return N + id; }
  function curId() { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; }
  function drillOf() { return document.querySelector('#drill deep-drill'); }

  /* Ad-hoc "shaky" marks from cross-drill / mixed-fire practice -- kept in a
     separate namespace so all()'s Store.keys(N) never mistakes them for topic
     snapshots. A clean, complete structured drill clears a topic's marks. */
  function skkey(id) { return SKN + id; }
  function markShaky(id) { if (!id) return; Store.set(skkey(id), (Store.get(skkey(id), 0) || 0) + 1); }
  function shakyMarks(id) { return Store.get(skkey(id), 0) || 0; }
  function clearShaky(id) { Store.remove(skkey(id)); }

  /* Whiteboard recall -- a distinct readiness signal from drilling: can you
     reconstruct the whole design from blank? Own namespace, snapshotted per topic
     on each whiteboard grade. */
  function wbkey(id) { return WBN + id; }
  function wbOf() { return document.querySelector('#wb deep-whiteboard'); }
  /* Legacy wbprog record (no per-step map). Unlike the drill there is no per-step
     evidence to recover from -- the board is graded in any order and only counts
     were stored -- so seed the counts positionally. That preserves got/missed/total
     EXACTLY (the only thing any reader uses) and self-corrects as steps are
     re-graded; the sole imprecision is WHICH step a legacy miss is attributed to. */
  function legacySteps(prev, total) {
    var map = {}, i = 0, n = 0;
    if (!prev || !prev.total) return map;
    for (n = 0; n < (prev.got || 0) && i < total; n++, i++) map[i] = 1;
    for (n = 0; n < (prev.missed || 0) && i < total; n++, i++) map[i] = 2;
    return map;
  }
  /* MERGE, not replace -- see the header. getStats() reports the LIVE board, and a
     reload starts it blank, so the old wholesale write turned a completed
     {got:9,total:9} into {got:1,total:9} on the first step re-graded after a reload.
     rerunMissed() (the "Re-draw missed steps" rec) resets missed steps in place; an
     ungraded step simply leaves its stored grade standing until it is re-graded. */
  function snapshotWb() {
    var id = curId(), w = wbOf();
    if (!id || !w || !w.getStats) return;
    var st = w.getStats();
    if (!st || !st.total || !st.items) return;
    var prev = Store.get(wbkey(id), null);
    var map = (prev && prev.steps) ? prev.steps : legacySteps(prev, st.total);
    for (var i = 0; i < st.items.length; i++) {
      if (st.items[i].got) map[i] = 1; else if (st.items[i].missed) map[i] = 2;
    }
    var got = 0, missed = 0;
    for (var k = 0; k < st.total; k++) { if (map[k] === 1) got++; else if (map[k] === 2) missed++; }
    Store.set(wbkey(id), { got: got, missed: missed, total: st.total, steps: map, ts: Date.now() });
  }
  function wbGet(id) { return Store.get(wbkey(id), null); }
  function clearWb(id) { Store.remove(wbkey(id)); }

  /* Legacy progress record (written before the per-probe map existed). Reconstruct
     only what the old aggregate PROVES and invent nothing beyond it:
       tot === bank size -> a FULL-mode run. The drill grades in bank order, so
                            probes 0..done-1 are exactly the ones graded; the flagged
                            signals were shaky/missed and the rest of that prefix were
                            solid. A COMPLETE run therefore reconstructs EXACTLY.
       tot !== bank size -> the record is itself a subset overwrite, i.e. already
                            corrupted by the bug this merge removes. Only the flagged
                            signals are trustworthy; salvage those and leave the rest
                            ungraded rather than invent grades. */
  function legacyCards(prev, sig) {
    var map = {}, i;
    if (!prev) return map;
    var flagged = {}, rv = prev.revisit || [];
    for (i = 0; i < rv.length; i++) flagged[rv[i]] = 1;
    if (prev.tot === sig.length) {
      var done = Math.min(prev.done || 0, sig.length);
      for (i = 0; i < done; i++) map[i] = flagged[sig[i]] ? 2 : 3;
    } else {
      for (i = 0; i < sig.length; i++) { if (flagged[sig[i]]) map[i] = 2; }
    }
    return map;
  }
  /* MERGE, not replace -- see the header for the data loss this removes. */
  function snapshot() {
    var id = curId(), d = drillOf();
    if (!id || !d || !d.getStats) return;
    var s = d.getStats();
    if (!s) return;
    var sig = s.bankSignals;
    /* No bank => a grade cannot be placed inside the full-topic record. Skip the
       write. NEVER fall back to writing the working set: that write IS the bug. */
    if (!sig || !sig.length) return;
    var prev = Store.get(pkey(id), null);
    var map = (prev && prev.cards) ? prev.cards : legacyCards(prev, sig);
    var g = s.graded || [], k;
    /* one probe, one slot: a re-drill UPDATES the probe's level in place, so a card
       re-graded Solid leaves the revisit list instead of blanking the whole record */
    for (k = 0; k < g.length; k++) { if (g[k].i >= 0 && g[k].i < sig.length) map[g[k].i] = g[k].level; }
    var done = 0, got = 0, shk = 0, revisit = [], lv;
    for (k = 0; k < sig.length; k++) {
      lv = map[k];
      if (!lv) continue;
      done++;
      if (lv >= 3) got++; else { shk++; revisit.push(sig[k]); }
    }
    if (!done) return;
    Store.set(pkey(id), { got: got, shk: shk, done: done, tot: sig.length, revisit: revisit, cards: map, ts: Date.now() });
    /* a clean, COMPLETE structured drill clears the topic's ad-hoc shaky marks --
       now measured against the whole topic, not against whatever subset was drilled */
    if (done === sig.length && shk === 0) clearShaky(id);
  }
  function get(id) { return Store.get(pkey(id), null); }
  function all() {
    var out = {}, ks = Store.keys(N);
    for (var i = 0; i < ks.length; i++) out[ks[i].slice(N.length)] = Store.get(ks[i], null);
    return out;
  }
  function clear(id) { Store.remove(pkey(id)); clearShaky(id); clearWb(id); }
  function clearAll() { var ks = Store.keys(N); for (var i = 0; i < ks.length; i++) Store.remove(ks[i]); var sk = Store.keys(SKN); for (var j = 0; j < sk.length; j++) Store.remove(sk[j]); var wk = Store.keys(WBN); for (var w = 0; w < wk.length; w++) Store.remove(wk[w]); }

  /* 'untouched' | 'in-progress' | 'weak' | 'solid' */
  function status(id) {
    var p = get(id), sm = shakyMarks(id);
    if (!p || !p.done) return sm > 0 ? 'weak' : 'untouched';
    if (p.done < p.tot) return 'in-progress';
    return (p.shk > 0 || sm > 0) ? 'weak' : 'solid';
  }

  /* rollup across all registered topics + per group + weakest list */
  function summary() {
    var data = all(), topics = {}, byGroup = {}, weakest = [];
    var ids = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.ids() : Object.keys(data);
    var totDone = 0, totTot = 0, totWeak = 0, touched = 0, compSum = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], p = data[id] || null;
      var t = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.get(id) : null;
      var grp = t && t.identity ? t.identity.group : null;
      var sm = shakyMarks(id);
      var rec = { done: p ? p.done : 0, tot: p ? p.tot : 0, shk: p ? p.shk : 0, marks: sm, status: status(id) };
      topics[id] = rec;
      totDone += rec.done; totTot += rec.tot; totWeak += rec.shk + sm; if (rec.done) touched++;
      compSum += (rec.tot > 0) ? (rec.done / rec.tot) : 0;
      if (grp) { if (!byGroup[grp]) byGroup[grp] = { done: 0, tot: 0, shk: 0, n: 0, touched: 0 }; var g = byGroup[grp]; g.done += rec.done; g.tot += rec.tot; g.shk += rec.shk; g.n++; if (rec.done) g.touched++; }
      var wshaky = rec.shk + sm;
      if (wshaky > 0 || (rec.done > 0 && rec.done < rec.tot)) weakest.push({ id: id, shk: wshaky, left: rec.tot - rec.done });
    }
    weakest.sort(function (a, b) { return (b.shk - a.shk) || (b.left - a.left); });
    var overallPct = ids.length ? Math.round(100 * compSum / ids.length) : 0;
    var wbRecalled = 0, wbTouched = 0, startedTopics = 0;
    for (var wi = 0; wi < ids.length; wi++) {
      var wb = wbGet(ids[wi]), wbHas = !!(wb && wb.total > 0);
      if (wbHas && wb.got === wb.total) wbRecalled++;
      if (wbHas) wbTouched++;
      /* U4: a topic counts as "started" if it's been drilled OR whiteboarded */
      if ((topics[ids[wi]] && topics[ids[wi]].done > 0) || wbHas) startedTopics++;
    }
    return { topics: topics, byGroup: byGroup, weakest: weakest, totDone: totDone, totTot: totTot, totWeak: totWeak, touched: touched, startedTopics: startedTopics, wbTouched: wbTouched, nTopics: ids.length, overallPct: overallPct, wbRecalled: wbRecalled };
  }

  document.addEventListener('drillgraded', function () { snapshot(); });
  document.addEventListener('whiteboardgraded', function () { snapshotWb(); });
  return { snapshot: snapshot, get: get, all: all, clear: clear, clearAll: clearAll, status: status, summary: summary, markShaky: markShaky, shakyMarks: shakyMarks, wbGet: wbGet, snapshotWb: snapshotWb };
})();
window.Progress = Progress;
