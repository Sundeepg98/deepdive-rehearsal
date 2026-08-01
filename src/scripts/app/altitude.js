/* ===== ALTITUDE -- readiness by INTERVIEW TIER, derived at read time =========================
 *
 * WHY IT EXISTS. The app grades every probe at a tier -- SDE2 / SDE3 / Staff, asserted per topic
 * by test/topic_contract.cjs -- and then reported readiness as a single percentage. A person nine
 * days from a Staff loop does not need to know they are 27% through a syllabus; they need to know
 * whether the top of the ladder is dark. An interviewer checks whether you hold at a BAR. So does
 * this: readiness is a level, not a proportion, and the tier dimension was already in the data.
 *
 * NO STORAGE CHANGE, AND THAT IS THE WHOLE DESIGN.
 * `progress.<id>` already persists `cards:{ cardId: level }` -- the level of every graded probe,
 * keyed by content id -- and the TIER already rides on the card in the bank. So the readout is a
 * JOIN over two things the app already has, done once per home render (~972 lookups), rather than
 * a new field, a migration, or a change to the portable progress code. Nothing here writes.
 *
 * IT COUNTS THE UNTOUCHED. `n` is every probe at that tier across all 46 topics, not just the
 * graded ones, because the honest denominator is the point: "30 solid of 310" says something that
 * "30 solid of 48 attempted" hides. The consumer renders untouched topics as an empty outline for
 * the same reason.
 *
 * LEVELS match the drill's own judge(): >=3 Solid, 2 Shaky, 1 Missed, 0 ungraded -- the same
 * comparison progress.js makes when it derives got/shk, so the two cannot disagree.
 *
 * Offline-safe: pure computation over TopicRegistry / Progress / CardId. No network, no storage. */
var Altitude = (function () {
  'use strict';

  /* high band first -- the gauge draws Staff on top, and the order is the claim */
  var TIERS = ['Staff', 'SDE3', 'SDE2'];

  function blank() { return { n: 0, solid: 0, shaky: 0, missed: 0 }; }

  /* {tiers:{Staff:{n,solid,shaky,missed,topics}}, rows:[{id,title,group,byTier}], thin:'Staff'} */
  function compute() {
    if (typeof TopicRegistry === 'undefined' || typeof Progress === 'undefined'
        || typeof CardId === 'undefined' || !TopicRegistry.ids) return null;

    var ids = TopicRegistry.ids(), tiers = {}, rows = [], i, j;
    for (i = 0; i < TIERS.length; i++) { tiers[TIERS[i]] = blank(); tiers[TIERS[i]].topics = 0; }
    /* the census counts EVERY probe, including the EXTEND tier that is not a ladder rung --
       the status bar reports the whole bank, the gauge reports the three rungs, and the two
       are deliberately different numbers rather than one number used for both */
    var totals = blank(); totals.started = 0;

    for (i = 0; i < ids.length; i++) {
      var id = ids[i], t = TopicRegistry.get(id);
      var cards = (t && t.data && t.data.bank && t.data.bank.cards) || [];
      if (!cards.length) continue;
      var pr = (Progress.get ? Progress.get(id) : null) || {};
      var map = pr.cards || {};
      var keys = CardId.forCards(cards);
      var per = {};

      var touched = 0;
      for (j = 0; j < cards.length; j++) {
        var tier = cards[j] && cards[j].tier;
        var lv = CardId.level(map, keys[j]);
        totals.n++;
        if (lv >= 3) totals.solid++; else if (lv === 2) totals.shaky++; else if (lv === 1) totals.missed++;
        if (lv > 0) touched++;
        if (!tiers[tier]) continue;            /* EXTEND and anything else: not a ladder rung */
        var b = per[tier] || (per[tier] = blank());
        b.n++; tiers[tier].n++;
        if (lv >= 3) { b.solid++; tiers[tier].solid++; }
        else if (lv === 2) { b.shaky++; tiers[tier].shaky++; }
        else if (lv === 1) { b.missed++; tiers[tier].missed++; }
      }
      if (touched) totals.started++;
      for (var k in per) {
        if (per[k].solid + per[k].shaky + per[k].missed > 0) tiers[k].topics++;
      }
      rows.push({
        id: id,
        title: (t.identity && t.identity.title) || id,
        group: (t.identity && t.identity.group) || '',
        byTier: per,
      });
    }

    /* THE THIN RAIL -- and it is null unless the record actually earns the accusation.
       The verdict sentence ("Staff is the thin rail -- the level you are interviewing for is the
       one you have rehearsed least") is the signature's punchline, and a punchline that can be
       provably false is worse than no punchline. A strict `<` alone cannot say that: on a TIE it
       silently keeps whichever tier it looked at first, so an all-zero record printed "Staff is
       the thin rail. 0 solid of 310 probes" -- an accusation derived from nothing -- and a PERFECT
       record printed the same sentence about a tier the user has fully banked. Both are ties.
       So the rule is evidence, not ordering: a rail is thin only when it is STRICTLY thinner than
       every other rail. Ties (including all-zero and all-perfect) yield null, and the consumer
       says what it actually knows instead. */
    var shares = [], thin = null;
    for (i = 0; i < TIERS.length; i++) {
      var a = tiers[TIERS[i]];
      if (a.n) shares.push({ tier: TIERS[i], share: a.solid / a.n });
    }
    if (shares.length > 1) {
      shares.sort(function (x, y) { return x.share - y.share; });
      if (shares[0].share < shares[1].share) thin = shares[0].tier;
    }
    return { order: TIERS.slice(), tiers: tiers, totals: totals, rows: rows,
             thin: thin, nTopics: rows.length };
  }

  /* One rail's segments, ORDERED STRONGEST-FIRST. Scattered lit cells do not communicate a
     quantity; a contiguous lit run does, and the taper between the three rails is the finding.
     The census is unchanged -- every topic still gets its own segment, and pointing at one names
     it -- only the order along the rail is by solid share. */
  function rail(model, tier) {
    var out = [];
    for (var i = 0; i < model.rows.length; i++) {
      var r = model.rows[i], b = r.byTier[tier];
      if (!b || !b.n) continue;
      out.push({
        id: r.id, title: r.title, group: r.group,
        n: b.n, solid: b.solid, shaky: b.shaky, missed: b.missed,
        done: b.solid + b.shaky + b.missed,
        share: b.solid / b.n,
      });
    }
    out.sort(function (x, y) { return (y.share - x.share) || (y.done - x.done); });
    return out;
  }

  /* four brightness steps. A 3px difference in bar height is unreadable at 46 segments; a step
     in tone is not. 0 is reserved for "nothing banked here", which the empty outline shows. */
  function level(share) {
    if (!share) return 0;
    if (share < 0.34) return 0.30;
    if (share < 0.67) return 0.55;
    if (share < 1) return 0.78;
    return 1;
  }

  return { compute: compute, rail: rail, level: level, TIERS: TIERS };
})();
window.Altitude = Altitude;
