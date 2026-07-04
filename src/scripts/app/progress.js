/* ===== scripts/app/progress.js -- per-topic progress tracking =====
   Snapshots the drill's aggregate (getStats) into Store on every grade event,
   keyed by topic. Updates ONLY on a grade -- merely visiting a topic (which
   resets the live drill) never overwrites the saved progress. Feeds the home /
   index badges / cross-topic rollup / weakest-topics. All reads degrade cleanly
   when nothing is stored yet. */
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
  function snapshotWb() {
    var id = curId(), w = wbOf();
    if (!id || !w || !w.getStats) return;
    var st = w.getStats();
    if (!st || !st.total) return;
    var got = 0, missed = 0;
    for (var i = 0; i < st.items.length; i++) { if (st.items[i].got) got++; else if (st.items[i].missed) missed++; }
    Store.set(wbkey(id), { got: got, missed: missed, total: st.total, ts: Date.now() });
  }
  function wbGet(id) { return Store.get(wbkey(id), null); }
  function clearWb(id) { Store.remove(wbkey(id)); }

  function snapshot() {
    var id = curId(), d = drillOf();
    if (!id || !d || !d.getStats) return;
    var s = d.getStats();
    if (!s || !s.dTot) return;
    Store.set(pkey(id), { got: s.dGot, shk: s.dShk, done: s.dDone, tot: s.dTot, revisit: s.revisit || [], ts: Date.now() });
    if (s.dTot > 0 && s.dDone === s.dTot && s.dShk === 0) clearShaky(id);
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
    var wbRecalled = 0;
    for (var wi = 0; wi < ids.length; wi++) { var wb = wbGet(ids[wi]); if (wb && wb.total > 0 && wb.got === wb.total) wbRecalled++; }
    return { topics: topics, byGroup: byGroup, weakest: weakest, totDone: totDone, totTot: totTot, totWeak: totWeak, touched: touched, nTopics: ids.length, overallPct: overallPct, wbRecalled: wbRecalled };
  }

  document.addEventListener('drillgraded', function () { snapshot(); });
  document.addEventListener('whiteboardgraded', function () { snapshotWb(); });
  return { snapshot: snapshot, get: get, all: all, clear: clear, clearAll: clearAll, status: status, summary: summary, markShaky: markShaky, shakyMarks: shakyMarks, wbGet: wbGet, snapshotWb: snapshotWb };
})();
window.Progress = Progress;
