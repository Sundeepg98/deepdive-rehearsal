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

    /* ===== THE SHAPE OF THE RECORD, decided on EXACT INTEGERS =========================
       Fourth round on this function. The standing rule for this route, arrived at the hard way:
       EXACT INTEGERS ARE COMPARED, ROUNDED INTEGERS ARE DISPLAYED, NEVER THE REVERSE -- and no
       sentence may use an absolute ("all", "every", "no ... left") unless the exact integer
       condition for it holds.
         r1  returned the first-seen minimum: a tie named whichever tier the loop reached first.
         r2  returned null on any tie for LAST, and the consumer read that as "the rails are
             level", quoting Staff's percentage for all three.
         r3  returned the shape, but decided `full` on ROUNDED percentages -- `min === 100` --
             so one Shaky probe among 971 rendered three rails at "100%" and licensed
             "Every rail is full ... there is no thin rail left to name" while Staff was thin
             AND flagged on the same screen. A comparison at rendered precision licensed an
             absolute about exact counts. The consumer's own comment had specified the right
             rule twenty lines away and the implementation followed the weaker one.

       So each class below states which precision decides it, and why that is the honest one:

         full        EXACT   ladder.solid === ladder.n. An absolute, so nothing but the exact
                             count may license it.
         level       EXACT   every rail's share exactly equal, compared by cross-multiplying
                             integers (a.solid * b.n === b.solid * a.n) so no float is involved.
         tiedDisplay ROUNDED every rail renders the same percent WITHOUT being exactly equal.
                             A separate class because "the rails are level" would be an absolute
                             the record does not support, while "nothing separates them at this
                             precision" is exactly what the reader can see.
         thinSet     ROUNDED the rails rendering the lowest percent. Rounded is correct HERE and
                             only here: the claim is about which rail looks lowest, the sentence
                             quotes each rail's own exact figures, and singling one out on a
                             0.046-point difference the instrument does not draw was itself a
                             charged defect. */
    var shares = [];
    for (i = 0; i < TIERS.length; i++) {
      var a = tiers[TIERS[i]];
      if (a.n) shares.push({ tier: TIERS[i], solid: a.solid, n: a.n, pct: Math.round(a.solid / a.n * 100) });
    }
    /* the ladder is not the bank: the bank carries an EXTEND tier that is not a rung */
    var ladder = { solid: 0, n: 0 };
    for (i = 0; i < TIERS.length; i++) { ladder.solid += tiers[TIERS[i]].solid; ladder.n += tiers[TIERS[i]].n; }

    var thin = null, thinSet = [], level = false, tiedDisplay = false, min = null, max = null;
    if (shares.length) {
      min = shares[0].pct; max = shares[0].pct;
      for (i = 1; i < shares.length; i++) {
        if (shares[i].pct < min) min = shares[i].pct;
        if (shares[i].pct > max) max = shares[i].pct;
      }
      for (i = 0; i < shares.length; i++) if (shares[i].pct === min) thinSet.push(shares[i].tier);
      /* EXACT equality, by integer cross-multiplication -- never solid/n as a float */
      var exactEqual = true;
      for (i = 1; i < shares.length; i++) {
        if (shares[i].solid * shares[0].n !== shares[0].solid * shares[i].n) { exactEqual = false; break; }
      }
      level = exactEqual;
      tiedDisplay = !exactEqual && (min === max);
      if (min !== max && thinSet.length === 1) thin = thinSet[0];
    }
    /* THE ONE ABSOLUTE, AND IT IS EXACT. Not `min === 100`: every rail at >= 99.5% renders
       "100%", so a rounded test licensed "all 971 solid" on records with 968. */
    var full = ladder.n > 0 && ladder.solid === ladder.n;

    return {
      order: TIERS.slice(), tiers: tiers, totals: totals, rows: rows, nTopics: rows.length,
      /* the three rungs only -- the bank total lives on `totals` and the two are never mixed */
      ladder: ladder,
      /* rails render the same percent but are NOT exactly equal */
      tiedDisplay: tiedDisplay,
      /* probes in the bank that are on no rail (the EXTEND tier), named on screen when nonzero */
      offLadder: { solid: totals.solid - ladder.solid, n: totals.n - ladder.n },
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
