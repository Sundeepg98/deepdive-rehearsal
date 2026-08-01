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

    /* ===== THE SHAPE OF THE RECORD, not a nullable name ==================================
       This is the third round on this function, and both earlier versions failed the same way:
       they returned ONE tier and left the consumer to infer everything else from its absence.
         Round 1 returned the first-seen minimum, so a TIE silently named whichever tier the loop
           reached first -- an all-zero record was told "Staff is the thin rail".
         Round 2 returned null on any tie for last, and the consumer read null as "the rails are
           level" and took its percentage from Staff alone. On a record with Staff at 100% and the
           other two empty, the gauge printed "Every rail is full. Solid on all 972 probes" above
           two visibly empty rails and its own header reading "310 SOLID OF 972".
       An accusation the reader can discount is survivable; a statement of fact the reader can
       check against the picture directly above it is not. So this function now returns the SHAPE
       -- the thin SET, whether the rails are genuinely level, whether the board is full -- and the
       consumer has a distinct sentence per class with nothing left to infer.

       COMPARE AT THE RENDERED PRECISION. The rails print integer percents, so two rails at
       59.98% and 60.02% are identical to every reader and a raw-float `<` would name one of them
       thin on a difference the instrument does not draw. `pct` is what the rail shows; `pct` is
       what decides. */
    var shares = [];
    for (i = 0; i < TIERS.length; i++) {
      var a = tiers[TIERS[i]];
      if (a.n) shares.push({ tier: TIERS[i], pct: Math.round(a.solid / a.n * 100) });
    }
    var thin = null, thinSet = [], level = false, min = null, max = null;
    if (shares.length) {
      min = shares[0].pct; max = shares[0].pct;
      for (i = 1; i < shares.length; i++) {
        if (shares[i].pct < min) min = shares[i].pct;
        if (shares[i].pct > max) max = shares[i].pct;
      }
      for (i = 0; i < shares.length; i++) if (shares[i].pct === min) thinSet.push(shares[i].tier);
      level = (min === max);                       /* EVERY rail equal -- not "two of them" */
      if (!level && thinSet.length === 1) thin = thinSet[0];
    }
    /* THE LADDER IS NOT THE BANK, and the sentence that says "all three tiers" has to count the
       three tiers. `totals` spans every probe including the EXTEND tier, which is not a ladder
       rung -- 972 in the bank against 971 on the rails. Round 3's own claim check caught the
       gauge printing "Solid on all 972 probes across all three tiers" over rails totalling 971,
       which is the same class this round exists to close, one probe wide.
       So `full` is a property of the RAILS (every rendered rail at 100%), and `ladder` carries
       the figures any sentence about the rails is allowed to quote. */
    var ladder = { solid: 0, n: 0 };
    for (i = 0; i < TIERS.length; i++) { ladder.solid += tiers[TIERS[i]].solid; ladder.n += tiers[TIERS[i]].n; }
    var full = shares.length > 0 && min === 100;

    return {
      order: TIERS.slice(), tiers: tiers, totals: totals, rows: rows, nTopics: rows.length,
      ladder: ladder,
      /* the ONE strictly-thinnest tier, or null when several share the minimum */
      thin: thin,
      /* every tier at the minimum -- length 1, 2 or 3; empty only when no tier has probes */
      thinSet: thinSet,
      /* true only when ALL rails share one rendered percentage */
      level: level,
      full: full,
      minPct: min, maxPct: max,
      graded: totals.solid + totals.shaky + totals.missed,
    };
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
