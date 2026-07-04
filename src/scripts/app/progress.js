/* ===== scripts/app/progress.js -- per-topic progress tracking =====
   Snapshots the drill's aggregate (getStats) into Store on every grade event,
   keyed by topic. Updates ONLY on a grade -- merely visiting a topic (which
   resets the live drill) never overwrites the saved progress. Feeds the home /
   index badges / cross-topic rollup / weakest-topics. All reads degrade cleanly
   when nothing is stored yet. */
var Progress = (function () {
  var N = 'progress.';
  function pkey(id) { return N + id; }
  function curId() { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; }
  function drillOf() { return document.querySelector('#drill deep-drill'); }

  function snapshot() {
    var id = curId(), d = drillOf();
    if (!id || !d || !d.getStats) return;
    var s = d.getStats();
    if (!s || !s.dTot) return;
    Store.set(pkey(id), { got: s.dGot, shk: s.dShk, done: s.dDone, tot: s.dTot, revisit: s.revisit || [], ts: Date.now() });
  }
  function get(id) { return Store.get(pkey(id), null); }
  function all() {
    var out = {}, ks = Store.keys(N);
    for (var i = 0; i < ks.length; i++) out[ks[i].slice(N.length)] = Store.get(ks[i], null);
    return out;
  }
  function clear(id) { Store.remove(pkey(id)); }
  function clearAll() { var ks = Store.keys(N); for (var i = 0; i < ks.length; i++) Store.remove(ks[i]); }

  /* 'untouched' | 'in-progress' | 'weak' | 'solid' */
  function status(id) {
    var p = get(id);
    if (!p || !p.done) return 'untouched';
    if (p.done < p.tot) return 'in-progress';
    return (p.shk > 0) ? 'weak' : 'solid';
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
      var rec = { done: p ? p.done : 0, tot: p ? p.tot : 0, shk: p ? p.shk : 0, status: status(id) };
      topics[id] = rec;
      totDone += rec.done; totTot += rec.tot; totWeak += rec.shk; if (rec.done) touched++;
      compSum += (rec.tot > 0) ? (rec.done / rec.tot) : 0;
      if (grp) { if (!byGroup[grp]) byGroup[grp] = { done: 0, tot: 0, shk: 0, n: 0, touched: 0 }; var g = byGroup[grp]; g.done += rec.done; g.tot += rec.tot; g.shk += rec.shk; g.n++; if (rec.done) g.touched++; }
      if (rec.shk > 0 || (rec.done > 0 && rec.done < rec.tot)) weakest.push({ id: id, shk: rec.shk, left: rec.tot - rec.done });
    }
    weakest.sort(function (a, b) { return (b.shk - a.shk) || (b.left - a.left); });
    var overallPct = ids.length ? Math.round(100 * compSum / ids.length) : 0;
    return { topics: topics, byGroup: byGroup, weakest: weakest, totDone: totDone, totTot: totTot, totWeak: totWeak, touched: touched, nTopics: ids.length, overallPct: overallPct };
  }

  document.addEventListener('drillgraded', function () { snapshot(); });
  return { snapshot: snapshot, get: get, all: all, clear: clear, clearAll: clearAll, status: status, summary: summary };
})();
window.Progress = Progress;
