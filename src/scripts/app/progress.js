/* ===== scripts/app/progress.js -- per-topic progress tracking =====
   MERGES each grade into the topic's canonical record, keyed by topic. Updates
   ONLY on a grade -- merely visiting a topic (which resets the live drill) never
   overwrites the saved progress. Feeds the home / index badges / cross-topic
   rollup / weakest-topics. All reads degrade cleanly when nothing is stored yet.

   WHY A MERGE AND NOT A SNAPSHOT (the first P0 this file used to cause).
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
   it told you to press. A grade now updates ONE probe inside the whole-topic record,
   and done / tot / got / shk / revisit are DERIVED from the full bank -- never from
   whatever subset happens to be on screen. Same fix, same reason, for the whiteboard.

   WHY THE PROBE MAP IS KEYED BY CONTENT AND NOT BY INDEX (the second P0, fixed here).
   That per-probe map used to be keyed by the probe's INDEX IN THE BANK: cards was
   { 0:3, 1:2, ... } against _allCards, steps the same against the whiteboard spine.
   An index is a POSITION, not an IDENTITY. Insert one probe at the top of a bank --
   which authoring 38 topics guarantees -- and every stored grade below it slides
   silently onto the WRONG question. No error, no gap, a record that still looks
   complete: the app would tell you you had mastered a probe you had never seen. The
   map is now keyed by a hash of the probe's own QUESTION TEXT (card-id.js), so a
   probe keeps its identity across reordering AND insertion, and an author never has
   to maintain an id by hand (they would get it wrong, and it would fail the same
   silent way).

   Record shape. Every field above `cards` / `steps` is UNCHANGED, so every existing
   reader -- badges, summary(), status(), the index overlay, export/import -- is
   untouched by this migration:
     progress.<id> = { got, shk, done, tot, revisit:[signal], cards:{ cardId:level }, cv, ts }
     wbprog.<id>   = { got, missed, total, steps:{ stepId:1|2 }, cv, ts }
   level: 1 missed, 2 shaky, 3 solid (drill's judge()).  step: 1 got, 2 missed.
   cv: the CARD-KEY schema. absent/1 = keyed by bank INDEX (the P0). 2 = keyed by
   content id. A v1 record is migrated on read AND eagerly at boot -- see migrate(). */
var Progress = (function () {
  var N = 'progress.';
  var SKN = 'shakymark.';
  var WBN = 'wbprog.';
  var CV = 2;                 /* card-key schema version -- see the header */
  function pkey(id) { return N + id; }
  function curId() { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null; }
  function drillOf() { return document.querySelector('#drill deep-drill'); }
  function own(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
  function lvl(m, k) { return own(m, k) ? m[k] : 0; }

  /* Ad-hoc "shaky" marks from cross-drill / mixed-fire practice -- kept in a
     separate namespace so all()'s Store.keys(N) never mistakes them for topic
     snapshots. A clean, complete structured drill clears a topic's marks. */
  function skkey(id) { return SKN + id; }
  function markShaky(id) { if (!id) return; Store.set(skkey(id), (Store.get(skkey(id), 0) || 0) + 1); }
  function shakyMarks(id) { return Store.get(skkey(id), 0) || 0; }
  function clearShaky(id) { Store.remove(skkey(id)); }
  function wbkey(id) { return WBN + id; }
  function wbOf() { return document.querySelector('#wb deep-whiteboard'); }

  /* ================= v1 (index-keyed) -> v2 (content-keyed) MIGRATION =================
     Existing users have index-keyed grades in localStorage. They are migrated, never
     dropped on the floor -- but an index only means something against the bank it was
     written against, so the migration is only as sound as the evidence in the record.

     THE EXACT PATH, AND WHY IT COVERS EVERYONE. A v1 record carries `tot` (the bank
     size when it was written). If that still equals today's bank size, the map's
     indices still name the same probes and index -> id is a faithful RENAME: every
     grade is recovered, exactly. That is the state of EVERY record written before this
     shipped -- which is precisely why migrate() runs EAGERLY at boot rather than
     lazily on the next grade: it converts the whole store while index still equals
     truth, i.e. before a single new probe is authored into any bank.

     AND WHY WE STILL DO NOT TRUST IT BLINDLY. A same-size bank could still have been
     REORDERED, and then the positional reading is wrong while looking perfectly
     healthy. So the candidate map is CORROBORATED against the one content-derived
     field a v1 record has -- revisit[], which holds SIGNAL STRINGS: every index the
     map calls non-solid must land on a signal the record itself flagged, and every
     flagged signal must be accounted for. If content disagrees with position, position
     loses.

     WHEN NOTHING CAN BE PROVEN. If the bank changed size (a late upgrader who gets
     this fix and the new content in one step) and the signal evidence cannot
     corroborate a positional reading, then which probe a given grade belonged to is
     GENUINELY UNRECOVERABLE. We salvage exactly what the record proves -- the flagged
     signals, which are content, not position -- and drop the rest. We never guess, and
     we never mis-attribute: a wrong grade is worse than a missing one, because the
     user cannot see that it is wrong. */

  /* the record's own flagged SIGNALS -- the only content-derived evidence in v1 */
  function flagSet(prev) {
    var f = Object.create(null), rv = (prev && prev.revisit) || [], i;
    for (i = 0; i < rv.length; i++) f[String(rv[i])] = 1;
    return f;
  }
  /* salvage: mark every probe whose SIGNAL the record flagged. Position-free, so it
     survives any reorder/insert -- and it is all we can honestly recover. */
  function flaggedMap(prev, ids, sig) {
    var map = Object.create(null), f = flagSet(prev), i;
    for (i = 0; i < ids.length; i++) { if (own(f, String(sig[i]))) map[ids[i]] = 2; }
    return map;
  }
  /* read a v1 index map positionally: cards[i] -> ids[i] */
  function positionalMap(src, ids) {
    var map = Object.create(null), k, i;
    for (k in src) {
      if (!own(src, k)) continue;
      i = +k;
      if (i >= 0 && i < ids.length && src[k]) map[ids[i]] = src[k];
    }
    return map;
  }
  /* Does the positional reading AGREE with the record's own signal evidence? */
  function corroborates(prev, cand, ids, sig) {
    var want = flagSet(prev), hit = Object.create(null), nWant = 0, nHit = 0, i, k, s;
    for (k in want) { if (own(want, k)) nWant++; }
    for (i = 0; i < ids.length; i++) {
      k = ids[i];
      if (!own(cand, k) || cand[k] >= 3) continue;   /* only the non-solid ones carry evidence */
      s = String(sig[i]);
      if (!own(want, s)) return { ok: false, hits: 0 };   /* a flag the record never made */
      if (!own(hit, s)) { hit[s] = 1; nHit++; }
    }
    return { ok: nHit === nWant, hits: nHit };          /* ...and every flag accounted for */
  }
  /* keep only ids the CURRENT bank still has. An id that is gone means that probe's
     QUESTION TEXT changed (or the probe was deleted) -- that one grade is genuinely
     unrecoverable, so drop exactly it and keep every other. This is also the orphan
     prune: the written map is always a subset of the live bank. */
  function liveOnly(src, ids) {
    var map = Object.create(null), live = Object.create(null), i, k;
    for (i = 0; i < ids.length; i++) live[ids[i]] = 1;
    for (k in src) { if (own(src, k) && own(live, k) && src[k]) map[k] = src[k]; }
    return map;
  }
  /* A pre-`cards` record (older still: aggregates only, no per-probe map).
     tot === bank size -> a FULL-mode run. The drill grades in bank order, so probes
                          0..done-1 are exactly the ones graded; the flagged signals
                          were shaky/missed and the rest of that prefix were solid.
                          A COMPLETE run therefore reconstructs EXACTLY.
     tot !== bank size -> the record is itself a subset overwrite, i.e. already
                          corrupted by the bug the MERGE above removed. Only the
                          flagged signals are trustworthy. */
  function legacyMap(prev, ids, sig) {
    var map = Object.create(null), f, done, i;
    if (prev.tot !== ids.length) return flaggedMap(prev, ids, sig);
    f = flagSet(prev);
    done = Math.min(prev.done || 0, ids.length);
    for (i = 0; i < done; i++) map[ids[i]] = own(f, String(sig[i])) ? 2 : 3;
    return map;
  }
  /* THE ONE ENTRY POINT: whatever is on disk -> a content-keyed map. `out.path`
     reports which evidence carried it, so migrate() can report honestly. */
  function cardsMapOf(prev, ids, sig, out) {
    var cand, cor;
    if (out) out.path = 'none';
    if (!prev) return Object.create(null);
    if (prev.cv >= CV) { if (out) out.path = 'current'; return liveOnly(prev.cards, ids); }
    if (prev.cards) {
      cand = positionalMap(prev.cards, ids);
      cor = corroborates(prev, cand, ids, sig);
      /* same bank, and content agrees with position -> exact rename */
      if (prev.tot === ids.length && cor.ok) { if (out) out.path = 'exact'; return cand; }
      /* bank changed, but every flagged probe is still exactly where the record says
         (a prefix-preserving append/insert) -> content POSITIVELY corroborates it */
      if (cor.ok && cor.hits > 0) { if (out) out.path = 'corroborated'; return cand; }
      if (out) out.path = 'salvaged';
      return flaggedMap(prev, ids, sig);
    }
    if (out) out.path = 'legacy';
    return legacyMap(prev, ids, sig);
  }

  /* Derive the whole-topic record from the full bank. done/got/shk/revisit come from
     the BANK, never from the working set -- see the header. null = nothing graded. */
  function record(ids, sig, map) {
    var done = 0, got = 0, shk = 0, revisit = [], k, lv;
    for (k = 0; k < ids.length; k++) {
      lv = lvl(map, ids[k]);
      if (!lv) continue;
      done++;
      if (lv >= 3) got++; else { shk++; revisit.push(sig[k]); }
    }
    if (!done) return null;
    return { got: got, shk: shk, done: done, tot: ids.length, revisit: revisit, cards: map, cv: CV, ts: Date.now() };
  }

  /* MERGE, not replace -- see the header for the data loss this removes. */
  function snapshot() {
    var id = curId(), d = drillOf();
    if (!id || !d || !d.getStats) return;
    var s = d.getStats();
    if (!s) return;
    var sig = s.bankSignals, ids = s.bankIds;
    /* No bank => a grade cannot be placed inside the full-topic record. Skip the
       write. NEVER fall back to writing the working set: that write IS the bug. */
    if (!sig || !sig.length || !ids || ids.length !== sig.length) return;
    var prev = Store.get(pkey(id), null);
    var map = cardsMapOf(prev, ids, sig);
    var g = s.graded || [], k;
    /* one probe, one slot: a re-drill UPDATES the probe's level in place, so a card
       re-graded Solid leaves the revisit list instead of blanking the whole record */
    for (k = 0; k < g.length; k++) { if (g[k].id) map[g[k].id] = g[k].level; }
    var rec = record(ids, sig, map);
    if (!rec) return;
    Store.set(pkey(id), rec);
    /* a clean, COMPLETE structured drill clears the topic's ad-hoc shaky marks --
       now measured against the whole topic, not against whatever subset was drilled */
    if (rec.done === ids.length && rec.shk === 0) clearShaky(id);
  }

  /* ---- whiteboard recall: a distinct readiness signal from drilling (can you
     reconstruct the whole design from blank?). Own namespace, same two fixes. ---- */

  /* Legacy wbprog record (no per-step map). Unlike the drill there is no per-step
     evidence to recover from -- the board is graded in any order and only counts were
     stored -- so seed the counts positionally. That preserves got/missed/total EXACTLY
     (the only thing any reader uses) and self-corrects as steps are re-graded; the sole
     imprecision is WHICH step a legacy miss is attributed to. */
  function legacySteps(prev, total) {
    var map = {}, i = 0, n = 0;
    if (!prev || !prev.total) return map;
    for (n = 0; n < (prev.got || 0) && i < total; n++, i++) map[i] = 1;
    for (n = 0; n < (prev.missed || 0) && i < total; n++, i++) map[i] = 2;
    return map;
  }
  /* The board stores NO cue text, so -- unlike the drill -- a v1 wbprog record carries
     ZERO content-derived evidence. The only sound migration is the one that runs while
     the step count still matches, which is exactly what migrate() at boot guarantees.
     If the spine has already been edited, WHICH step a stored grade belonged to is
     unrecoverable: drop it rather than slide every grade onto the wrong step. */
  function stepsMapOf(prev, ids, out) {
    if (out) out.path = 'none';
    if (!prev) return Object.create(null);
    if (prev.cv >= CV) { if (out) out.path = 'current'; return liveOnly(prev.steps, ids); }
    if (prev.total !== ids.length) { if (out) out.path = 'dropped'; return Object.create(null); }
    if (out) out.path = prev.steps ? 'exact' : 'legacy';
    return positionalMap(prev.steps || legacySteps(prev, ids.length), ids);
  }
  function wbRecord(ids, map) {
    var got = 0, missed = 0, k, lv;
    for (k = 0; k < ids.length; k++) {
      lv = lvl(map, ids[k]);
      if (lv === 1) got++; else if (lv === 2) missed++;
    }
    if (!got && !missed) return null;
    return { got: got, missed: missed, total: ids.length, steps: map, cv: CV, ts: Date.now() };
  }
  /* MERGE, not replace. getStats() reports the LIVE board, and a reload starts it
     blank, so the old wholesale write turned a completed {got:9,total:9} into
     {got:1,total:9} on the first step re-graded after a reload. rerunMissed() resets
     missed steps in place; an ungraded step simply leaves its stored grade standing. */
  function snapshotWb() {
    var id = curId(), w = wbOf();
    if (!id || !w || !w.getStats) return;
    var st = w.getStats();
    if (!st || !st.total || !st.items) return;
    var ids = st.stepIds;
    if (!ids || ids.length !== st.total) return;
    var prev = Store.get(wbkey(id), null);
    var map = stepsMapOf(prev, ids), i, k;
    for (i = 0; i < st.items.length; i++) {
      k = st.items[i].id;
      if (!k) continue;
      if (st.items[i].got) map[k] = 1; else if (st.items[i].missed) map[k] = 2;
    }
    var rec = wbRecord(ids, map);
    if (rec) Store.set(wbkey(id), rec);
  }
  function wbGet(id) { return Store.get(wbkey(id), null); }
  function clearWb(id) { Store.remove(wbkey(id)); }
  /* The topic's whiteboard grades as a normalized { stepIndex: 1 got | 2 missed } map, or
     null if the topic has never been whiteboarded. Legacy counts-only records are seeded
     positionally through the SAME legacySteps() the writer uses, so a reader can never see
     a shape the writer doesn't produce -- and there is exactly one place that knows what a
     wbprog record looks like. `total` is the board's CURRENT step count (a content edit can
     outdate the record's own), so callers pass what they are rendering against. */
  function wbSteps(id, total) {
    var prev = wbGet(id);
    if (!prev) return null;
    return prev.steps ? prev.steps : legacySteps(prev, total || prev.total || 0);
  }

  /* ================= THE EAGER BOOT MIGRATION =================
     Runs ONCE, over EVERY registered topic, as soon as the topic bundle is in memory
     -- not lazily on the next grade. That timing is the whole point: today, before any
     new probe is authored, every stored record still satisfies tot === bank size, so
     every grade migrates EXACTLY. Wait for the user's next grade and the content wave
     may have landed first, at which point the same record is only partially
     recoverable. Idempotent (cv gates it), defensive (one bad topic cannot take out
     the rest), and reportable (migration() -- a drop must be visible, not silent). */
  var mig = { ran: false, drill: {}, wb: {}, dropped: [] };
  function bump(bucket, path) { bucket[path] = (bucket[path] || 0) + 1; }
  function migrateTopic(id) {
    var t = (typeof TopicRegistry !== 'undefined') ? TopicRegistry.get(id) : null;
    if (!t || !t.data) return;
    var bank = (t.data.bank && t.data.bank.cards) || null;
    var steps = (t.data.wb && t.data.wb.steps) || null;
    var prev, ids, sig, rec, out;
    /* A MIGRATION IS NOT A STUDY SESSION.
       record() and wbRecord() both hard-code `ts: Date.now()` -- correct for a grade, WRONG for a
       migration, which rewrites every record on any `cv` mismatch. No path carried prev.ts
       forward, so a content release restamped every topic as "studied just now":
         - dueReview() (needs ts >= 7 days old) was EMPTIED for every user, every release --
           the spaced-repetition nudge silently stopped existing;
         - weeklyGoal() (counts ts >= weekStart) FALSELY COMPLETED the goal, for everyone.
       The user's last-studied time is theirs; a build cannot be allowed to overwrite it. */
    prev = Store.get(pkey(id), null);
    if (prev && prev.cv !== CV && bank && bank.length) {
      ids = CardId.forCards(bank);
      sig = bank.map(function (c) { return c.signal; });
      out = {};
      rec = record(ids, sig, cardsMapOf(prev, ids, sig, out));
      bump(mig.drill, out.path);
      if (rec) { if (prev.ts) rec.ts = prev.ts; Store.set(pkey(id), rec); }
      else { Store.remove(pkey(id)); mig.dropped.push('progress.' + id); }
    }
    prev = Store.get(wbkey(id), null);
    if (prev && prev.cv !== CV && steps && steps.length) {
      ids = CardId.forSteps(steps);
      out = {};
      rec = wbRecord(ids, stepsMapOf(prev, ids, out));
      bump(mig.wb, out.path);
      if (rec) { if (prev.ts) rec.ts = prev.ts; Store.set(wbkey(id), rec); }
      else { Store.remove(wbkey(id)); mig.dropped.push('wbprog.' + id); }
    }
  }
  function migrate() {
    if (mig.ran || typeof TopicRegistry === 'undefined' || typeof CardId === 'undefined') return mig;
    mig.ran = true;
    var ids = TopicRegistry.ids(), i;
    for (i = 0; i < ids.length; i++) { try { migrateTopic(ids[i]); } catch (e) {} }
    return mig;
  }
  function migration() { return mig; }

  function get(id) { return Store.get(pkey(id), null); }
  /* The bank indices this topic still owes work on (level 1 missed / 2 shaky), straight from the
     canonical record -- so "re-drill my weak spots" survives a RELOAD. The drill's own
     drillWeak() / drillRevset() can only see the run currently on screen, and a page load starts
     that empty; the record is the only thing that remembers. Legacy records (no per-probe map)
     are reconstructed through the same legacyCards() the writer uses, so this can never see a
     shape snapshot() does not produce. */
  function weakIdx(id) {
    var tid = id || curId();
    var prev = tid ? get(tid) : null;
    if (!prev) return [];
    var map = prev.cards;
    if (!map) {
      var d = drillOf(), s = (d && d.getStats) ? d.getStats() : null;
      map = legacyCards(prev, (s && s.bankSignals) ? s.bankSignals : []);
    }
    var out = [], k;
    for (k in map) { if (map.hasOwnProperty(k) && map[k] < 3) out.push(+k); }
    out.sort(function (a, b) { return a - b; });
    return out;
  }
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
      /* AN UNTOUCHED TOPIC STILL HAS PROBES. `tot: 0` for a topic with no saved record made it
         vanish from its group's DENOMINATOR, so a group's coverage was measured only across the
         topics you had already started -- i.e. it divided by the work done. Measured on the
         shipped build: Messaging & Events, 7 topics / 147 probes, 1 topic drilled (21 probes),
         showed 100% when the truth is 14%. (overallPct, two lines down, was right all along
         because it divides by ids.length -- two rollups in one function, one of them lying.)
         The bank is the source of truth for how much work a topic IS, whether or not it has
         been started. The room cards also skip groups with tot <= 0, so this is what makes all six
         rooms render instead of only the touched ones. */
      var bankTot = (t && t.data && t.data.bank && t.data.bank.cards) ? t.data.bank.cards.length : 0;
      var rec = { done: p ? p.done : 0, tot: p ? p.tot : bankTot, shk: p ? p.shk : 0, marks: sm, status: status(id) };
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
  /* The topic bundle is a synchronous script in the same file, so the registry is
     fully populated by DOMContentLoaded -- and no grade can land before it. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', migrate);
  else migrate();
  return { snapshot: snapshot, get: get, all: all, clear: clear, clearAll: clearAll, status: status, summary: summary, markShaky: markShaky, shakyMarks: shakyMarks, wbGet: wbGet, wbSteps: wbSteps, weakIdx: weakIdx, snapshotWb: snapshotWb, migrate: migrate, migration: migration };
})();
window.Progress = Progress;
