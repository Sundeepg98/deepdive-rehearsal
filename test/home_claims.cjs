#!/usr/bin/env node
/* ============ THE HOME MAY NOT PRINT A CLAIM IT CANNOT DERIVE ==============================
 *
 * WHY THIS FILE EXISTS, and it is a class rather than a bug.
 *
 * Three consecutive rounds of judgment found the same failure in different clothes, and every
 * instance rode in on a CORRECT fix:
 *
 *   round 1  the gauge named a thin rail on an all-zero record -- an accusation from nothing.
 *   round 2  the fix returned `thin:null` on any tie for LAST place and the consumer read that
 *            as "the rails are level", taking its percentage from Staff alone. On a record with
 *            Staff at 100% and the other two empty the gauge printed "Every rail is full. Solid
 *            on all 972 probes across all three tiers" -- above two visibly empty rails, under its
 *            own header reading "310 SOLID OF 972". A true sentence became a false one.
 *   round 2  the resume line printed "you stopped at step 1 of 9" from a record that stored no
 *            walk position at all (posRestore returns 0 for an absent field).
 *
 * None of it was catchable. `grep -rn` across test/ found ZERO references to `hm-verdict`,
 * "thin rail", `Altitude.` or `hm-seg`: the signature's punchline -- the one sentence the whole
 * instrument exists to deliver -- had no arm that could fail. Same for the hero and the position
 * sentence. The gate was 75/75 and honest about everything it covered; it covered none of this.
 *
 * WHAT IT ASSERTS. Not "the copy is nice" -- that a rendered claim is CONSISTENT WITH THE
 * NUMERALS RENDERED BESIDE IT. Every arm reads the page's own figures and checks the sentence
 * against them, so it fails on exactly the class above and stays quiet on wording.
 *
 * THE BATTERY. Fifteen records driven at 1280 and 390: empty, one-solid, two-tiers-tied-under-a-
 * higher-third (both directions), genuinely level, perfect, mixed-position (drill cursor with a
 * walk resume), absent-field (a stored drill position, resume pointer on walk), one-short,
 * nearly-full, stale-cursor, topic-done, ONE-THIN (a strict unique minimum -- the single-thin-rail
 * sentence, added by W1.5 because every other pinned record lands on a tie, a level/within-a-point
 * or a full, so the class this home prints most often was pinned by nothing), WEAK-TOPICS (twelve
 * topics drilled to the end with a shaky probe left in them -- the only class where BOTH practice
 * acts render and the rails carry keel marks, added in W1.5 cycle 2 because the ordering rule and
 * the gauge legend had no record that could exercise them), and no-record.
 * The judges kept finding defects on seeds the builder had not run; this is that list, run.
 *
 * THREE ARMS THAT ARE NOT ABOUT A NUMERAL (W1.5 cycle 2). Same class -- one fact, two answers --
 * where the fact is a RENDERER: exactly one visible weekly-goal surface per viewport in EVERY
 * record class (cold included); the record-addressed practice act above the generic one in all
 * three surfaces that render the pair; and the gauge's four-state key present wherever the rails
 * paint the keel mark it is the legend for. All three shipped in cycle 1 with nothing in test/
 * that so much as mentioned them.
 *
 * ROUND 4: THE RETROSPECTIVE SEED LIST WAS THE GAP, AND IT IS NOW THE SMALLER HALF.
 * A judge copied this file, added ONE record -- one probe of 971 graded Shaky -- changed nothing
 * else, and the check FAILED on the shipped build: "claims every rail is full while the rails
 * render 970 solid of 971". The analyser was right; the inputs were a list of defects that had
 * already been found, and a list like that cannot cover what has not been found yet. It had no
 * record in the band where Math.round and equality disagree, which is exactly where the fourth
 * instance of the class was living.
 *
 * So the battery is now GENERATIVE. A deterministic PRNG (mulberry32 off a fixed seed, so the
 * gate stays reproducible byte-for-byte) builds N randomized records per run, and the property is
 * ENTAILMENT: every sentence and every numeral the home prints must be derivable from the
 * record's EXACT integers. The named records stay -- they are cheap regression pins for defects
 * that really happened -- but they are no longer what makes this check the class-killer.
 *
 * A separate arm censuses the hero over the WHOLE bank at the widths the design claims, because
 * the named records only ever render ~10 distinct questions of 972 and could not fail on the
 * clamp regression they were written to guard.
 *
 * SELF-TEST, every run: planted mutants must each be caught -- a verdict naming a thin rail that
 * is not the minimum, a "level" claim over unequal rails, a "full" claim with unsolid probes, a
 * position asserted from an absent field, a verdict quoting one rail's figures for another, an
 * inflated panel header, an inflated figure inside the SINGLE-THIN-RAIL sentence, a duplicated
 * weekly-goal surface on the COLD record, the two practice acts inverted in the phone's practice
 * block, and the gauge's key hidden while its rails still paint keel marks. If any goes undetected
 * the check ABORTS -- and so does a run in which no record painted a keel at all, because a
 * conditional arm nothing satisfies is decoration.
 *
 * THAT LAST ONE IS THE ONE THIS FILE GOT WRONG. The quoted-figures gap was written `[^.;]{0,40}`,
 * the rendered thin-rail sentence puts a period between the tier name and its figures, and so the
 * arm was blind to the exact sentence it was written for -- proven by a mutant that came back NOT
 * DETECTED, and recorded as a defect rather than fixed, by the gate-runtime acceptance battery
 * (_audit/2026-08-01-gate-runtime-acceptance.md). Fixed at judgeQuotedFigures; the mutant is
 * MUTANT 7 and now runs every gate.
 *
 * Usage: node test/home_claims.cjs [file]
 * Exit:  0 = pass, 1 = FAIL */
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || process.cwd() + '/dist/index.html';

/* ---- the records. Each returns a description of what the home must be able to say. ---- */
const SEEDS = {
  /* nothing anywhere */
  empty: () => {},

  /* one solid probe at one tier -- the ordinary first-session state that round 2 called "level" */
  oneSolid: () => {
    const id = TopicRegistry.ids()[0];
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards);
    const i = cards.findIndex((c) => c.tier === 'SDE2');
    const map = {}; map[keys[i]] = 3;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: 1, shk: 0, done: 1, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
  },

  /* every Staff probe solid, the two lower rails untouched -> two tied at the MINIMUM under a
     strictly higher third. This is the record that printed "Every rail is full". */
  staffOnly: () => {
    TopicRegistry.ids().forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      cards.forEach((c, i) => { if (c.tier === 'Staff') map[keys[i]] = 3; });
      const n = Object.keys(map).length;
      if (!n) return;
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: n, shk: 0, done: n, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* the mirror: every SDE2 probe solid, Staff and SDE3 empty */
  sde2Only: () => {
    TopicRegistry.ids().forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      cards.forEach((c, i) => { if (c.tier === 'SDE2') map[keys[i]] = 3; });
      const n = Object.keys(map).length;
      if (!n) return;
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: n, shk: 0, done: n, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* genuinely level: the same share at every tier */
  level: () => {
    TopicRegistry.ids().forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      const byTier = {};
      cards.forEach((c, i) => { (byTier[c.tier] = byTier[c.tier] || []).push(i); });
      Object.keys(byTier).forEach((tier) => {
        const idx = byTier[tier];
        const half = Math.round(idx.length / 2);
        idx.slice(0, half).forEach((i) => { map[keys[i]] = 3; });
      });
      const n = Object.keys(map).length;
      if (!n) return;
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: n, shk: 0, done: n, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* every probe in the bank solid */
  perfect: () => {
    TopicRegistry.ids().forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      cards.forEach((c, i) => { map[keys[i]] = 3; });
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: cards.length, shk: 0, done: cards.length, tot: cards.length,
        revisit: [], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* a stored DRILL position with the resume pointer on WALK -- the record that fabricated
     "stopped at step 1 of 9" out of a field it never stored */
  absentField: () => {
    const id = TopicRegistry.ids()[0];
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    for (let i = 0; i < 6; i++) map[keys[i]] = i % 2 ? 2 : 3;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: 3, shk: 3, done: 6, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    localStorage.setItem('ddr.v1.pos.' + id, JSON.stringify({ drill: 10 }));
    localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id, view: 'walk', hash: '#' + id + '/walk' }));
  },

  /* both positions stored, resume on walk */
  mixedPosition: () => {
    const id = TopicRegistry.ids()[0];
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    for (let i = 0; i < 6; i++) map[keys[i]] = 3;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: 6, shk: 0, done: 6, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    localStorage.setItem('ddr.v1.pos.' + id, JSON.stringify({ drill: 10, walk: 4 }));
    localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id, view: 'walk', hash: '#' + id + '/walk' }));
  },

  /* ONE PROBE SHORT OF PERFECT -- the band where Math.round and equality disagree. Every rail
     renders "100%" from 99.5% up, so a rounded `full` test licensed "all 971 solid" here. This is
     the record a judge added to prove the retrospective seed list was the gap; it is pinned. */
  oneShort: () => {
    let done = false;
    TopicRegistry.ids().forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      cards.forEach((c, i) => {
        if (!done && c.tier === 'Staff') { map[keys[i]] = 2; done = true; }
        else map[keys[i]] = 3;
      });
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: cards.length, shk: 0, done: cards.length, tot: cards.length,
        revisit: [], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* one ungraded per tier -- the same band, approached from the other side */
  nearlyFull: () => {
    const seen = {};
    TopicRegistry.ids().forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      cards.forEach((c, i) => {
        if (!seen[c.tier]) { seen[c.tier] = 1; return; }      /* leave one per tier ungraded */
        map[keys[i]] = 3;
      });
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: Object.keys(map).length, shk: 0, done: Object.keys(map).length, tot: cards.length,
        revisit: [], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* EXACTLY ONE STRICT MINIMUM -- the record that renders the SINGLE-thin-rail sentence, which is
     the one verdict class the pinned list did not cover. Every other seed here lands on a tie
     (oneSolid, staffOnly, sde2Only), on level/within-a-point (level, oneShort, nearlyFull), on
     full (perfect) or on cold. So the sentence the home is MOST likely to print for a real
     mid-campaign user -- and the one judgeQuotedFigures was blind to -- was reaching this battery
     only through the generative arm, where no mutant could be aimed at it. Three distinct shares,
     one per tier, so the rendered percentages cannot round together. */
  oneThin: () => {
    const share = { Staff: 0.2, SDE3: 0.5, SDE2: 0.8 };
    TopicRegistry.ids().forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      const byTier = {};
      cards.forEach((c, i) => { (byTier[c.tier] = byTier[c.tier] || []).push(i); });
      Object.keys(byTier).forEach((tier) => {
        const idx = byTier[tier];
        const take = Math.round(idx.length * (share[tier] === undefined ? 0.5 : share[tier]));
        idx.slice(0, take).forEach((i) => { map[keys[i]] = 3; });
      });
      const n = Object.keys(map).length;
      if (!n) return;
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: n, shk: 0, done: n, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* TOPICS THE RECORD CALLS WEAK -- the class that makes BOTH practice acts render, and the one
     the pinned list had no record for. `Panels.weakCount()` counts topics whose drill is COMPLETE
     and still carries a shaky probe (progress.js status()), which is a stricter thing than
     "appears in the weakest list": every seed above either leaves a topic unfinished
     (in-progress) or finishes it clean (solid), so `Panels.actionsHtml()` rendered ONE bar on all
     fourteen and the ordering rule below had nothing to order. Twelve topics drilled to the end,
     one probe in seven graded Shaky -- which also puts keel marks on the rails, so the gauge's
     four-state key has something to label. */
  weakTopics: () => {
    TopicRegistry.ids().slice(0, 12).forEach((id) => {
      const cards = TopicRegistry.get(id).data.bank.cards;
      const keys = CardId.forCards(cards); const map = {};
      cards.forEach((c, i) => { map[keys[i]] = (i % 7 === 0) ? 2 : 3; });
      const shk = Object.keys(map).filter((k) => map[k] < 3).length;
      localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
        got: cards.length - shk, shk: shk, done: cards.length, tot: cards.length,
        revisit: ['idempotency', 'backpressure'], cards: map, cv: 1, ts: Date.now() }));
    });
  },

  /* a stale cursor past the end of a shorter bank -- must produce NO position claim */
  staleCursor: () => {
    const id = TopicRegistry.ids()[0];
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    for (let i = 0; i < 5; i++) map[keys[i]] = 3;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: 5, shk: 0, done: 5, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    localStorage.setItem('ddr.v1.pos.' + id, JSON.stringify({ drill: cards.length + 3 }));
    localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id, view: 'drill', hash: '#' + id + '/drill' }));
  },

  /* a topic graded to completion -- "Up next" must not appear over "every probe is graded" */
  topicDone: () => {
    const id = TopicRegistry.ids()[0];
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    cards.forEach((c, i) => { map[keys[i]] = 3; });
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: cards.length, shk: 0, done: cards.length, tot: cards.length,
      revisit: [], cards: map, cv: 1, ts: Date.now() }));
    localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id, view: 'drill', hash: '#' + id + '/drill' }));
  },

  /* engaged elsewhere, resume pointer at a topic with NO record of its own */
  noRecord: () => {
    const ids = TopicRegistry.ids();
    const o = ids[0], cards = TopicRegistry.get(o).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {}; map[keys[0]] = 3;
    localStorage.setItem('ddr.v1.progress.' + o, JSON.stringify({
      got: 1, shk: 0, done: 1, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: ids[3], view: 'drill', hash: '#' + ids[3] + '/drill' }));
  },
};

/* ---- THE GENERATIVE ARM ------------------------------------------------------------------
   mulberry32 off a FIXED seed, so the gate is reproducible byte-for-byte while still exploring
   states no hand-written list would reach. Each record picks a per-tier solid RATE and a per-tier
   grading DEPTH, which is what actually varies the shape of the ladder -- including, crucially,
   the band between 99.5% and 100% that three rounds of hand-picked records never entered. */
const GENERATIVE = (seed) => {
  const mul = (a) => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const rnd = mul(seed);
  /* deliberately biased toward the boundaries: all-empty, all-full and one-short are where the
     absolutes live, and a uniform sampler would almost never land on them */
  const pick = () => {
    const r = rnd();
    if (r < 0.18) return 0;
    if (r < 0.36) return 1;
    if (r < 0.52) return 0.995 + rnd() * 0.005;
    return rnd();
  };
  const rate = { Staff: pick(), SDE3: pick(), SDE2: pick() };
  const depth = { Staff: rnd(), SDE3: rnd(), SDE2: rnd() };
  const ids = TopicRegistry.ids();
  const take = Math.max(1, Math.floor(rnd() * ids.length));
  ids.slice(0, take).forEach((id) => {
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    let g = 0, sol = 0;
    cards.forEach((c, i) => {
      const d = depth[c.tier] !== undefined ? depth[c.tier] : 0.5;
      if (rnd() > d) return;                       /* ungraded */
      const rt = rate[c.tier] !== undefined ? rate[c.tier] : 0.5;
      const lv = rnd() < rt ? 3 : (rnd() < 0.5 ? 2 : 1);
      map[keys[i]] = lv; g++; if (lv >= 3) sol++;
    });
    if (!g) return;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: sol, shk: g - sol, done: g, tot: cards.length,
      revisit: [], cards: map, cv: 1, ts: Date.now() - Math.floor(rnd() * 20) * 86400000 }));
  });
  const rid = ids[Math.floor(rnd() * ids.length)];
  const view = rnd() < 0.5 ? 'drill' : 'walk';
  localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: rid, view, hash: '#' + rid + '/' + view }));
  if (rnd() < 0.7) {
    const nb = TopicRegistry.get(rid).data.bank.cards.length;
    localStorage.setItem('ddr.v1.pos.' + rid, JSON.stringify({ drill: Math.floor(rnd() * nb) }));
  }
};

/* ---- read the page's OWN numerals, then the sentences that must agree with them ---- */
const READ = () => {
  const txt = (n) => (n ? (n.textContent || '').replace(/\s+/g, ' ').trim() : null);
  const rails = [...document.querySelectorAll('.hm-gr')].map((r) => {
    const m = /(\d+)\s*\/\s*(\d+)\s*.\s*(\d+)%/.exec(txt(r.querySelector('.hm-gr-n')) || '');
    return {
      tier: txt(r.querySelector('.hm-gr-l')),
      solid: m ? +m[1] : null, n: m ? +m[2] : null, pct: m ? +m[3] : null,
    };
  });
  const q = document.querySelector('.hm-q');
  /* the model's own exact integers, so the entailment property compares the page against the
     record rather than against another rendering of the record */
  let model = null;
  try { model = (typeof Altitude !== 'undefined') ? Altitude.compute() : null; } catch (e) { model = null; }
  return {
    rails,
    model: model && {
      ladder: model.ladder, totals: model.totals, thinSet: model.thinSet, level: model.level,
      tiedDisplay: model.tiedDisplay, full: model.full, minPct: model.minPct, graded: model.graded,
      tiers: model.tiers, offLadder: model.offLadder,
    },
    verdict: txt(document.querySelector('.hm-verdict')),
    header: txt(document.querySelector('.hm-alt .hm-fig')),
    census: txt(document.querySelector('.hm-status')),
    since: txt(document.querySelector('.hm-since')),
    eyebrow: txt(document.querySelector('.hm-eyebrow')),
    ctaSub: txt(document.querySelector('.hm-cta-d')),
    hero: q ? { text: txt(q), clipped: q.scrollHeight > q.clientHeight + 1 } : null,
    /* ---- THREE STRUCTURAL FACTS THIS HOME KEEPS GETTING WRONG IN THE SAME WAY --------------
       Same class as the sentences above -- one fact, two answers -- but the fact is a RENDERER
       rather than a numeral, so no arm above could see it. All three shipped in W1.5 cycle 1 with
       nothing in test/ that mentioned them (`grep -rl` over test/ returned NOTHING for hm-key,
       hm-goal, ix-goal, goalStrip, weeklyGoal, hm-practicem or actionsHtml), which made three of
       that wave's five build items silently revertible at a green 76/76. */
    /* (1) the weekly goal. One renderer, one surface, per viewport, in every record class. */
    goals: [...document.querySelectorAll('.ix-goal, .hm-goal')].filter((e) => e.getClientRects().length).length,
    /* (2) the two practice acts, in DOM order, in each of the three surfaces that render the pair.
       `lead` is what the topic switcher puts at the top of its scroller -- Panels.actionsHtml()
       itself -- so the switcher's copy is judged without having to open the overlay. */
    order: (() => {
      const seq = (root) => (root
        ? [...root.querySelectorAll('[data-cross="weak"],[data-cross="1"]')]
          .filter((e) => e.getClientRects().length)
          .map((e) => e.getAttribute('data-cross'))
        : []);
      let lead = [];
      try {
        const d = document.createElement('div');
        d.innerHTML = Panels.actionsHtml();
        lead = [...d.querySelectorAll('[data-cross]')].map((e) => e.getAttribute('data-cross'));
      } catch (e) { lead = []; }
      return {
        rail: seq(document.getElementById('homerail')),
        column: seq(document.querySelector('#home .hm-practicem')),
        lead,
      };
    })(),
    /* (3) the gauge's only legend, against the marks it is the legend FOR */
    keel: document.querySelectorAll('.hm-alt .hm-seg.keel').length,
    keyVisible: (() => {
      const k = document.querySelector('.hm-alt .hm-key');
      return !!k && k.getClientRects().length > 0;
    })(),
    h1s: [...document.querySelectorAll('h1')].filter((h) => h.getClientRects().length).map(txt),
    /* IDENTITY: the visible h1 must BE the hero question, not merely be unique */
    h1IsHero: !!q && q.tagName === 'H1' && q.getClientRects().length > 0
      && [...document.querySelectorAll('h1')].filter((h) => h.getClientRects().length).length === 1,
    /* the record as stored, so a position claim is checked against the field it claims to read */
    stored: (() => {
      try {
        const last = JSON.parse(localStorage.getItem('ddr.v1.nav.last') || 'null');
        const id = last && last.id;
        return { id, view: last && last.view,
          pos: id ? JSON.parse(localStorage.getItem('ddr.v1.pos.' + id) || 'null') : null };
      } catch (e) { return null; }
    })(),
  };
};

/* ---- the claim rules. Each returns null when consistent, or why it is not. ---- */
/* Every `N of M` inside a verdict must equal the N / M on the rail whose tier name precedes it.
   This single rule covers a whole family the earlier arm could not see: a thin-rail sentence
   quoting another rail's figures, inflating its own, or quoting a percentage no rail renders. */
/* THE GAP MAY CROSS A FULL STOP; IT MAY NOT CROSS ANOTHER TIER NAME.
   The first version wrote the gap as `[^.;]{0,40}` -- and the home's single-thin-rail sentence
   puts a PERIOD exactly there: "Staff is the thin rail. 4 solid of 10 probes". `[^.;]` cannot
   reach across it, so THE ARM WAS STRUCTURALLY BLIND TO THE ONE SENTENCE THIS CHECK EXISTS FOR,
   and an inflated figure in it was invisible. That was found by a mutant the gate-runtime
   acceptance battery aimed here, watched NOT DETECTED, and recorded rather than fixed
   (_audit/2026-08-01-gate-runtime-acceptance.md, pre-existing defects #2). It is fixed here, and
   that same mutant is now planted every run as MUTANT 7 below.

   The period was never the rule worth enforcing -- it was a cheap proxy for one. What actually
   makes an attribution wrong is ANOTHER TIER NAME standing between a name and the figures being
   read as its own, so that is what the gap forbids now, character by character. This is strictly
   stronger than the old form: it still refuses to attribute "SDE3 ... . Staff shows 4 of 10" to
   SDE3 (the gap would have to swallow "Staff"), it now reads the thin-rail sentence, and on the
   two-thin sentence -- "SDE3 and SDE2 are the thin rails. Both sit at 12% solid -- SDE3 18 of
   359, SDE2 192 of 302" -- the leading names cannot reach past each other to the figures, so each
   pair still binds to the name immediately before it. */
function judgeQuotedFigures(v, rails) {
  const re = /\b(Staff|SDE3|SDE2)\b(?:(?!\b(?:Staff|SDE3|SDE2)\b)[\s\S]){0,40}?(\d+)\s+(?:solid\s+)?of\s+(\d+)/g;
  let m;
  while ((m = re.exec(v))) {
    const rail = rails.find((x) => x.tier === m[1]);
    if (!rail) return 'quotes figures for ' + m[1] + ', which is not a rendered rail';
    if (+m[2] !== rail.solid || +m[3] !== rail.n) {
      return 'quotes ' + m[1] + ' as ' + m[2] + ' of ' + m[3] + ' while that rail renders '
        + rail.solid + ' / ' + rail.n;
    }
  }
  return null;
}

function judgeVerdict(r) {
  const v = r.verdict || '';
  const rails = r.rails.filter((x) => x.pct !== null);
  if (!rails.length) return null;
  const pcts = rails.map((x) => x.pct);
  const min = Math.min.apply(null, pcts), max = Math.max.apply(null, pcts);
  const totalSolid = rails.reduce((a, x) => a + x.solid, 0);
  const totalN = rails.reduce((a, x) => a + x.n, 0);

  if (/is the thin rail/.test(v)) {
    const named = rails.find((x) => new RegExp('^' + x.tier + ' is the thin rail').test(v));
    if (!named) return 'names a thin rail that is not one of the rendered tiers: "' + v.slice(0, 90) + '"';
    if (named.pct !== min) return 'names ' + named.tier + ' (' + named.pct + '%) the thin rail while ' + min + '% is on the board';
    if (pcts.filter((p) => p === min).length > 1) return 'names ONE thin rail while ' + pcts.filter((p) => p === min).length + ' tiers share ' + min + '%';
  }
  if (/are the thin rails/.test(v)) {
    const tied = rails.filter((x) => x.pct === min).map((x) => x.tier);
    for (const t of tied) if (v.indexOf(t) === -1) return 'claims tied thin rails but omits ' + t + ' which is also at ' + min + '%';
    for (const x of rails) if (x.pct !== min && new RegExp('\\b' + x.tier + '\\b.*are the thin rails').test(v)) return 'includes ' + x.tier + ' (' + x.pct + '%) among the thin rails';
    if (max === min) return 'claims some rails are thinner while every rail is at ' + min + '%';
  }
  if (/The rails are level/.test(v)) {
    if (min !== max) return 'claims the rails are level while they render ' + pcts.join('% / ') + '%';
    const m = /sit at (\d+)% solid/.exec(v);
    if (m && +m[1] !== min) return 'claims ' + m[1] + '% while every rail renders ' + min + '%';
  }
  if (/Every rail is full/.test(v)) {
    if (totalSolid !== totalN) return 'claims every rail is full while the rails render ' + totalSolid + ' solid of ' + totalN;
    const m = /all (\d+) probes/.exec(v);
    if (m && +m[1] !== totalN) return 'claims all ' + m[1] + ' probes while the rails total ' + totalN;
  }
  if (/Nothing graded yet/.test(v) && totalSolid > 0) {
    return 'claims nothing is graded while the rails render ' + totalSolid + ' solid';
  }
  if (/within a point of each other/.test(v)) {
    if (min !== max) return 'claims the rails are within a point while they render ' + pcts.join('% / ') + '%';
    const m = /rendering (\d+)% solid/.exec(v);
    if (m && +m[1] !== min) return 'claims ' + m[1] + '% while every rail renders ' + min + '%';
  }
  /* every quoted pair must belong to the rail it names */
  const q = judgeQuotedFigures(v, rails);
  if (q) return q;

  /* NO SILENT GREEN. An unrecognised verdict is a claim this analyser cannot check, and an
     unchecked claim on this element is exactly the class. Round 3 returned null here, so a
     sentence in a shape the arm did not know passed for free. */
  const KNOWN = [/Nothing graded yet/, /Every rail is full/, /The rails are level/,
    /within a point of each other/, /is the thin rail/, /are the thin rails/];
  if (!KNOWN.some((k) => k.test(v))) {
    return 'the verdict is in no known class, so nothing here could check it: "' + v.slice(0, 110) + '"';
  }
  return null;
}

/* THE PANEL HEADER AND THE CENSUS were read and never judged, so the header could be inflated by
   500 and the battery stayed green. One panel, one denominator: the header counts the ladder. */
function judgeHeader(r) {
  const rails = r.rails.filter((x) => x.pct !== null);
  if (!rails.length || !r.header) return null;
  const m = /(\d+)\D+(\d+)/.exec(r.header);
  if (!m) return 'the panel header states no figures: "' + r.header + '"';
  const solid = rails.reduce((a, x) => a + x.solid, 0);
  const n = rails.reduce((a, x) => a + x.n, 0);
  if (+m[1] !== solid || +m[2] !== n) {
    return 'the header reads ' + m[1] + ' of ' + m[2] + ' while its own rails total ' + solid + ' of ' + n;
  }
  return null;
}

function judgeCensus(r) {
  if (!r.census || !r.model) return null;
  const t = r.model.totals;
  const graded = t.solid + t.shaky + t.missed;
  const flat = r.census.replace(/\s+/g, ' ');
  const m = /(\d+) of (\d+) probes graded/.exec(flat);
  if (!m) return null;                              /* shed at this width -- not a claim */
  if (+m[1] !== graded || +m[2] !== t.n) {
    return 'the census reads ' + m[1] + ' of ' + m[2] + ' graded while the record holds '
      + graded + ' of ' + t.n;
  }
  return null;
}

/* THE ENTAILMENT PROPERTY. Not "is the sentence nice" -- is every claim on the panel derivable
   from the record's EXACT integers. This is the arm the generative records feed. */
function judgeEntailment(r) {
  const M = r.model;
  if (!M) return null;
  const v = r.verdict || '';
  const exactFull = M.ladder.n > 0 && M.ladder.solid === M.ladder.n;
  if (/Every rail is full/.test(v) && !exactFull) {
    return 'uses the absolute "every rail is full" on a record with ' + M.ladder.solid
      + ' of ' + M.ladder.n + ' ladder probes solid -- an absolute needs the EXACT condition';
  }
  if (exactFull && !/Every rail is full/.test(v) && M.graded > 0) {
    return 'the ladder IS exactly full (' + M.ladder.solid + '/' + M.ladder.n + ') and the verdict does not say so';
  }
  if (/The rails are level/.test(v) && !M.level) {
    return 'claims the rails are level while their exact shares differ';
  }
  if (/is the thin rail/.test(v) && M.thinSet.length !== 1) {
    return 'names ONE thin rail while the model holds ' + M.thinSet.length + ' at the minimum';
  }
  if (/are the thin rails/.test(v) && M.thinSet.length < 2) {
    return 'names several thin rails while the model holds ' + M.thinSet.length;
  }
  return null;
}

function judgePosition(r) {
  const s = r.since || '';
  const m = /stopped at (probe|step) (\d+) of (\d+)/.exec(s);
  if (m) {
    const unit = m[1];
    const pane = (r.ctaSub || '').toLowerCase();
    if (unit === 'step' && pane.indexOf('walk') === -1) return 'asserts a STEP position while Resume opens "' + r.ctaSub + '"';
    if (unit === 'probe' && pane.indexOf('drill') === -1) return 'asserts a PROBE position while Resume opens "' + r.ctaSub + '"';
    /* AGAINST THE RECORD, not against the pane name. A position sentence is a claim about a
       stored field, so the stored field is what it is checked against -- the pane name only says
       which field. An absent or out-of-range field must produce NO claim at all. */
    if (r.stored) {
      const field = unit === 'probe' ? 'drill' : 'walk';
      const have = r.stored.pos && typeof r.stored.pos[field] === 'number' ? r.stored.pos[field] : null;
      if (have === null) return 'asserts "' + m[0] + '" while the record stores no ' + field + ' position';
      if (have < 0 || have >= +m[3]) return 'asserts "' + m[0] + '" from an out-of-range stored ' + field + ' of ' + have;
      if (have + 1 !== +m[2]) return 'asserts ' + unit + ' ' + m[2] + ' while the record stores ' + field + ' = ' + have;
    }
    /* a remainder in probes must keep its denominator when the position is in steps */
    if (unit === 'step' && /\b\d+<?\/?b?>? still ungraded/.test(s.replace(/\s+/g, ' '))) {
      if (!/of its \d+ probes/.test(s)) return 'a step position beside a bare "still ungraded" -- the remainder lost its denominator: "' + s + '"';
    }
  }
  if (/have not graded a probe in it yet/.test(s) && /Every probe here is graded/.test(s)) {
    return 'says both "not graded yet" and "every probe graded": "' + s + '"';
  }
  /* "Up next" over "every probe is graded" -- the sentinel collision, in words */
  if (/Up next/.test(r.eyebrow || '') && /Every probe here is graded/.test(s)) {
    return 'the eyebrow promises a NEXT probe while the sentence says every probe here is graded';
  }
  return null;
}

function judgeHero(r) {
  if (!r.hero) return null;
  /* IDENTITY, not cardinality. Round 3 asserted "exactly one h1" -- which a page of eyebrows
     satisfies forever. The direction's claim is that the QUESTION is the heading. */
  if (!r.h1IsHero) return 'the h1 is not the hero question (it is "' + (r.h1s[0] || '') + '")';
  if (r.hero.clipped) return 'the hero is visually truncated -- a cut-off question is not a question: "' + r.hero.text.slice(-46) + '"';
  const eyebrow = r.eyebrow || '';
  const pane = (r.ctaSub || '').toLowerCase();
  if (/Where you stopped/.test(eyebrow) && pane && pane.indexOf('drill') === -1) {
    return '"Where you stopped" heroes a probe while Resume opens "' + r.ctaSub + '"';
  }
  return null;
}

/* EXACTLY ONE WEEKLY-GOAL SURFACE, PER VIEWPORT, IN EVERY RECORD CLASS.
   Round 5 found the goal rendered twice (the home rail and the telemetry strip) and taught both
   paths to call goalPhrase() so they would agree; W1.5 deleted the rail's copy, which left the
   ENGAGED home with one and the COLD home with none -- under a commit that stated "now every
   viewport has one". Both failures are the same rule broken in opposite directions, so the rule is
   asserted as a COUNT, on every record this battery drives, cold ones included. Nothing in test/
   referenced .ix-goal, .hm-goal or goalStrip before this line existed. */
function judgeGoal(r) {
  if (r.goals === 1) return null;
  return 'the home renders ' + r.goals + ' visible weekly-goal surfaces (.ix-goal / .hm-goal); '
    + 'the rule is exactly one per viewport, and it holds for a cold record as well as an engaged one';
}

/* THE RULED ORDER IS WEAK-SPOT FIRST, IN ALL THREE SURFACES THAT RENDER THE PAIR.
   Both acts are cross-topic, but only one is addressed to THIS record ("the 16 topics you have
   been shaky on") while the other is the same offer for everybody, so the specific act goes above
   the generic one wherever the pair renders: the home rail (desktop), .hm-practicem (phone) and
   the switcher's lead. W1.5 swapped all three and cited two checks as its coverage -- neither of
   which contains the string "Cross-topic", "Weak-spot" or any ordering assertion -- so the swap
   could invert silently. A surface that renders only ONE act is not judged: there is no order. */
function judgeActOrder(r) {
  const o = r.order || {};
  for (const where of ['rail', 'column', 'lead']) {
    const seq = o[where] || [];
    const w = seq.indexOf('weak'), c = seq.indexOf('1');
    if (w === -1 || c === -1) continue;            /* only one act here -- nothing to order */
    if (w > c) {
      return 'the ' + where + ' renders the generic act above the record-addressed one: '
        + seq.map((x) => (x === 'weak' ? 'Weak-spot' : 'Cross-topic')).join(' then ');
    }
  }
  return null;
}

/* THE GAUGE KEEPS ITS LEGEND WHEREVER IT PAINTS THE MARK THE LEGEND EXPLAINS.
   The key is the only place the four marks are named (filled / part-filled / hollow / keel), and
   a `display:none` at <=419px deleted it on the phone for one cycle -- measured worth 21px of a
   742px band, and it flipped no fold outcome, so it was instrument sold for nothing. The keel is
   the mark with no other explanation on the panel, so it is what this arm keys on: a rail that
   paints a keel must render the legend that says what a keel is. */
function judgeKey(r) {
  if (!r.keel) return null;                        /* no keel painted -- the legend is not owed */
  if (r.keyVisible) return null;
  return 'the gauge paints ' + r.keel + ' keel segment(s) and renders no visible four-state key '
    + 'at this width -- the only legend those marks have';
}

/* one place that names every arm, so a new judge cannot be written and then never called --
   which is how judgeHeader and judgeCensus would otherwise have stayed decorative */
const ALL_JUDGES = (r) => [
  ['verdict', judgeVerdict(r)],
  ['entailment', judgeEntailment(r)],
  ['header', judgeHeader(r)],
  ['census', judgeCensus(r)],
  ['position', judgePosition(r)],
  ['hero', judgeHero(r)],
  ['goal', judgeGoal(r)],
  ['act order', judgeActOrder(r)],
  ['gauge key', judgeKey(r)],
];

/* THE HERO CENSUS, IN THE GATE. The named records render ~10 distinct questions of 972, so the
   hero arm could not fail on the clamp regression it was written to guard -- the 972-probe census
   that actually establishes the claim was a one-off builder measurement with nothing behind it.
   This clones the live .hm-q box and measures every question in the bank at the width in hand. */
const HERO_CENSUS = () => {
  const q = document.querySelector('.hm-q');
  if (!q) return { err: 'no hero to measure' };
  const all = [];
  TopicRegistry.ids().forEach((id) => {
    ((TopicRegistry.get(id).data.bank || {}).cards || []).forEach((c) => all.push(c.q));
  });
  const probe = q.cloneNode(false);
  q.parentNode.appendChild(probe);
  let over = 0, worst = 0, sample = null;
  const scrub = document.createElement('div');
  for (const raw of all) {
    scrub.innerHTML = raw;
    probe.textContent = '\u201c' + (scrub.textContent || '').replace(/\s+/g, ' ').trim() + '\u201d';
    const d = probe.scrollHeight - probe.clientHeight;
    if (d > 1) { over++; if (d > worst) { worst = d; sample = probe.textContent.slice(-52); } }
  }
  probe.remove();
  return { n: all.length, over, worst, sample };
};

/* Fixed so the gate is reproducible; raise GEN_N to explore harder, the seed stays put. */
const GEN_SEED = 0x5EEDF00D;
const GEN_N = 24;

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const out = [];
  let aborted = null;
  /* NO SILENT GREEN ON THE LEGEND ARM. judgeKey is conditional on a keel being painted, so a
     battery whose records never paint one would report it green forever without ever running it.
     Counted, and asserted non-zero below. */
  let keelChecked = 0;

  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    for (const name of Object.keys(SEEDS)) {
      const page = await ctx.newPage();
      await B.gotoApp(page, HTML, { hash: '#home' });
      await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
      await page.evaluate(SEEDS[name]);
      await B.gotoApp(page, HTML, { hash: '#home' });
      await B.until(page, () => !!document.querySelector('#home .hm-continue, #home .hm-alt'),
        null, B.ACT_MS, 'home rendered on ' + name);
      const r = await page.evaluate(READ);

      for (const [arm, why] of ALL_JUDGES(r)) {
        out.push(['[' + w + '/' + name + '] the ' + arm + ' agrees with the numbers beside it', !why, why || '']);
      }

      /* ---- MUTANTS, planted once, on the record where each class actually bit ---- */
      if (w === 1280 && name === 'staffOnly') {
        const m = await page.evaluate(() => {
          const v = document.querySelector('.hm-verdict');
          v.innerHTML = '<b>Every rail is full.</b> Solid on all 972 probes across all three tiers.';
          return true;
        });
        const bad = await page.evaluate(READ);
        if (!m || !judgeVerdict(bad)) {
          aborted = 'MUTANT 1 UNDETECTED: "Every rail is full" over rails rendering ' +
            bad.rails.map((x) => x.pct + '%').join('/') + ' was accepted. This is round 2 verbatim.';
        }
        await page.evaluate(() => {
          document.querySelector('.hm-verdict').innerHTML = '<b>The rails are level.</b> All three tiers sit at 0% solid.';
        });
        const bad2 = await page.evaluate(READ);
        if (!judgeVerdict(bad2)) aborted = aborted || 'MUTANT 2 UNDETECTED: a "level" claim over unequal rails was accepted.';
        await page.evaluate(() => {
          const r2 = document.querySelectorAll('.hm-gr-l');
          document.querySelector('.hm-verdict').innerHTML = '<b>' + (r2[0] ? r2[0].textContent : 'Staff') + ' is the thin rail.</b> x';
        });
        const bad3 = await page.evaluate(READ);
        if (!judgeVerdict(bad3)) aborted = aborted || 'MUTANT 3 UNDETECTED: a thin rail named on the HIGHEST tier was accepted.';
      }
      if (w === 1280 && name === 'staffOnly') {
        /* MUTANT 5: the two-thin sentence quotes the NON-thin rail's figures */
        await page.evaluate(() => {
          document.querySelector('.hm-verdict').innerHTML =
            '<b>SDE3 and SDE2 are the thin rails.</b> Both sit at 0% solid &mdash; SDE3 310 of 310, SDE2 310 of 310 &mdash; under a rail that is further along.';
        });
        const bad5 = await page.evaluate(READ);
        if (!judgeVerdict(bad5)) aborted = aborted || 'MUTANT 5 UNDETECTED: a verdict quoting one rail\u2019s figures for another was accepted.';
        /* MUTANT 6: the panel header inflated */
        await page.evaluate(() => {
          const h = document.querySelector('.hm-alt .hm-fig');
          if (h) h.innerHTML = '<b>1007</b> solid of 1472 on the rails';
        });
        const bad6 = await page.evaluate(READ);
        if (!judgeHeader(bad6)) aborted = aborted || 'MUTANT 6 UNDETECTED: an inflated panel header was accepted.';
      }
      /* ---- MUTANT 7: THE SENTENCE THIS ARM COULD NOT SEE ------------------------------------
         `oneThin` is the record that renders the SINGLE-thin-rail verdict -- "Staff is the thin
         rail. 47 solid of 310 probes" (the seed takes Math.round PER TOPIC, so the 20% share
         lands on 47, not on 310 x 0.2) -- and the period after "rail" is what the old
         `[^.;]{0,40}` gap could not cross, so an inflated figure in exactly this sentence was
         invisible. This is the mutant the gate-runtime acceptance battery aimed here and watched
         come back NOT DETECTED; it is adopted verbatim as the regression proof.

         It is planted from the LIVE sentence, not from a literal, so it cannot drift away from
         what the app actually renders -- and it carries a NEGATIVE CONTROL, because a mutant that
         fails for the wrong reason proves nothing: the same sentence with the TRUE figure must
         come back clean, and the caught reason must be the quoted-figures one. Without that
         control an unrecognised-verdict-class red, or a wrong thin-rail name, would read as
         success. */
      if (w === 1280 && name === 'oneThin') {
        const seen = await page.evaluate(() => {
          const v = document.querySelector('.hm-verdict');
          return v ? { html: v.innerHTML, text: (v.textContent || '').replace(/\s+/g, ' ').trim() } : null;
        });
        const single = seen && /\bis the thin rail\./.test(seen.text) &&
          /(\d+)\s+solid\s+of\s+(\d+)/.test(seen.text);
        if (!single) {
          aborted = aborted || 'MUTANT 7 CANNOT LAND: `oneThin` no longer renders a single '
            + 'thin-rail sentence with quoted figures, so the arm it proves is untested here: "'
            + (seen ? seen.text.slice(0, 120) : 'no verdict') + '"';
        } else {
          /* the control first: the untouched sentence must be clean */
          const clean = await page.evaluate(READ);
          if (judgeQuotedFigures(clean.verdict, clean.rails.filter((x) => x.pct !== null))) {
            aborted = aborted || 'MUTANT 7 CONTROL FAILED: the SHIPPED thin-rail sentence is '
              + 'already rejected by the quoted-figures arm, so a red on the mutant would prove '
              + 'nothing: ' + judgeQuotedFigures(clean.verdict, clean.rails.filter((x) => x.pct !== null));
          }
          await page.evaluate((h) => {
            document.querySelector('.hm-verdict').innerHTML =
              h.replace(/(\d+)(\s+solid\s+of\s+)/, (s, n, tail) => (+n + 1) + tail);
          }, seen.html);
          const bad7 = await page.evaluate(READ);
          const why = judgeQuotedFigures(bad7.verdict, bad7.rails.filter((x) => x.pct !== null));
          if (!why) {
            aborted = aborted || 'MUTANT 7 UNDETECTED: the single-thin-rail sentence quoted an '
              + 'inflated solid count and the quoted-figures arm accepted it -- the period-blind '
              + 'regex is back: "' + (bad7.verdict || '').slice(0, 120) + '"';
          } else if (!judgeVerdict(bad7)) {
            aborted = aborted || 'MUTANT 7 LEAKED: judgeQuotedFigures caught it but judgeVerdict '
              + 'returned clean, so the battery would never see it.';
          }
        }
      }
      if (w === 1280 && name === 'absentField') {
        await page.evaluate(() => {
          document.querySelector('.hm-since').innerHTML = 'You worked this topic, and stopped at step 1 of 9. <b>9</b> still ungraded.';
        });
        const bad4 = await page.evaluate(READ);
        if (!judgePosition(bad4)) {
          aborted = aborted || 'MUTANT 4 UNDETECTED: a step position beside a bare probe remainder was accepted -- round 2 verbatim.';
        }
      }

      /* ---- MUTANT 8: A SECOND GOAL RENDERER, ON THE COLD RECORD ----------------------------
         Planted on `empty` on purpose. Round 5's defect was TWO goal surfaces; W1.5's was ZERO on
         a cold record; both are the same rule broken, so the mutant duplicates the live one -- and
         the plant CANNOT LAND if the cold record has no goal to duplicate, which is exactly the
         W1.5 regression reporting itself. */
      if (name === 'empty') {
        const planted = await page.evaluate(() => {
          const g = document.querySelector('.ix-goal');
          if (!g) return false;
          g.parentNode.appendChild(g.cloneNode(true));
          return true;
        });
        if (!planted) {
          aborted = aborted || 'MUTANT 8 CANNOT LAND: the COLD home renders no weekly-goal surface '
            + 'at all, so there is nothing to duplicate. That is the W1.5 regression itself -- the '
            + 'goal sat inside the engaged() gate in telemetryHtml().';
        } else {
          const bad8 = await page.evaluate(READ);
          if (!judgeGoal(bad8)) {
            aborted = aborted || 'MUTANT 8 UNDETECTED: two visible weekly-goal surfaces were accepted.';
          }
          await page.evaluate(() => {
            const all = [...document.querySelectorAll('.ix-goal')];
            if (all.length > 1) all[all.length - 1].remove();
          });
        }
      }

      /* ---- MUTANTS 9 + 10: THE PHONE'S PRACTICE BLOCK AND THE GAUGE'S LEGEND ---------------
         Both planted on `weakTopics` at 390, which is the only record and the only width where
         the pair of acts renders in the column AND the rails carry keel marks. */
      if (w === 390 && name === 'weakTopics') {
        const swapped = await page.evaluate(() => {
          const host = document.querySelector('#home .hm-practicem');
          const weak = host && host.querySelector('[data-cross="weak"]');
          const cross = host && host.querySelector('[data-cross="1"]');
          if (!weak || !cross) return false;
          host.insertBefore(cross, weak);                 /* the inversion, verbatim */
          return true;
        });
        if (!swapped) {
          aborted = aborted || 'MUTANT 9 CANNOT LAND: `weakTopics` does not render BOTH practice '
            + 'acts in .hm-practicem at 390, so the ordering arm is untested on the surface it '
            + 'guards.';
        } else {
          const bad9 = await page.evaluate(READ);
          if (!judgeActOrder(bad9)) {
            aborted = aborted || 'MUTANT 9 UNDETECTED: Cross-topic rendered above Weak-spot in the '
              + 'phone practice block and the ordering arm accepted it.';
          }
          await page.evaluate(() => {
            const host = document.querySelector('#home .hm-practicem');
            const weak = host.querySelector('[data-cross="weak"]');
            host.insertBefore(weak, host.firstChild);
          });
        }

        const hid = await page.evaluate(() => {
          const k = document.querySelector('.hm-alt .hm-key');
          if (!k || !document.querySelector('.hm-alt .hm-seg.keel')) return false;
          k.style.display = 'none';                        /* the deleted rule, verbatim */
          return true;
        });
        if (!hid) {
          aborted = aborted || 'MUTANT 10 CANNOT LAND: at 390 the gauge either paints no keel or '
            + 'renders no key, so the legend arm is untested at the width where the key was cut.';
        } else {
          const bad10 = await page.evaluate(READ);
          if (!judgeKey(bad10)) {
            aborted = aborted || 'MUTANT 10 UNDETECTED: the four-state key was hidden while the '
              + 'rails still painted keel marks, and the legend arm accepted it -- the <=419px '
              + 'display:none is back.';
          }
          await page.evaluate(() => { document.querySelector('.hm-alt .hm-key').style.display = ''; });
        }
      }
      if (r.keel > 0 && r.keyVisible) keelChecked++;
      await page.close();
    }

    /* ---- THE PROPERTY ARM: N randomized records, one fixed PRNG seed ---- */
    for (let k = 0; k < GEN_N; k++) {
      const page = await ctx.newPage();
      await B.gotoApp(page, HTML, { hash: '#home' });
      await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
      await page.evaluate(GENERATIVE, GEN_SEED + k);
      await B.gotoApp(page, HTML, { hash: '#home' });
      await B.until(page, () => !!document.querySelector('#home .hm-continue, #home .hm-alt'),
        null, B.ACT_MS, 'home rendered on generated record ' + k);
      const r = await page.evaluate(READ);
      const why = ALL_JUDGES(r).filter((x) => x[1]);
      out.push(['[' + w + '/gen#' + k + '] every printed claim is entailed by the record',
        why.length === 0, why.map((x) => x[0] + ': ' + x[1]).join(' | ')]);
      await page.close();
    }

    /* ---- THE HERO CENSUS: the whole bank, at this width ---- */
    {
      const page = await ctx.newPage();
      await B.gotoApp(page, HTML, { hash: '#home' });
      await B.until(page, () => !!document.querySelector('#home .hm-q'), null, B.ACT_MS, 'hero rendered');
      const c = await page.evaluate(HERO_CENSUS);
      out.push(['[' + w + '] no probe in the bank overflows the hero box',
        !c.err && c.over === 0,
        c.err || (c.over + ' of ' + c.n + ' clipped, worst ' + c.worst + 'px: "' + (c.sample || '') + '"')]);
      await page.close();
    }

    await ctx.close();
  }
  await browser.close();

  if (!keelChecked) {
    aborted = aborted || 'THE LEGEND ARM NEVER RAN: no pinned or generated record painted a keel '
      + 'segment, so judgeKey could not fail on any of them. A conditional arm with no record that '
      + 'meets its condition is decoration.';
  }

  if (aborted) {
    console.log('=== HOME CLAIMS ===');
    console.log('SELF-TEST ABORT -- the analyser does not do what it claims:');
    console.log('  ' + aborted);
    return B.finish(1, 'HOME CLAIMS: FAIL (self-test)');
  }

  const bad = out.filter((o) => !o[1]);
  for (const [label, pass, detail] of out) console.log((pass ? '  PASS  ' : '  FAIL  ') + label + (pass ? '' : '  -- ' + detail));
  console.log('\n  the legend arm was exercised on ' + keelChecked + ' record(s) that actually paint a keel');
  console.log('  10 planted mutants detected (a full claim over empty rails; a level claim over '
    + 'unequal rails; a thin rail named on the highest tier; a step position beside a bare probe '
    + 'remainder; a verdict quoting one rail\u2019s figures for another; an inflated panel header; '
    + 'an inflated figure inside the single-thin-rail sentence, checked against its own negative '
    + 'control; a SECOND weekly-goal surface on the cold record; Cross-topic rendered above '
    + 'Weak-spot in the phone practice block; the four-state key hidden while the rails still paint '
    + 'keel marks) -- every one of them a defect a judge or a battery found on a shipped build');
  if (bad.length) return B.finish(1, 'HOME CLAIMS: FAIL (' + bad.length + ')');
  return B.finish(0, 'HOME CLAIMS: PASS  (' + out.length + ' assertions: '
    + Object.keys(SEEDS).length + ' pinned records + ' + GEN_N + ' generated from a fixed PRNG, '
    + 'x 2 viewports, plus a 972-probe hero census at each -- every printed claim entailed by the '
    + 'record\u2019s exact integers)');
})();
