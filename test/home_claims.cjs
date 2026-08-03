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

  /* A WEEK OF ONE, WITH A GOAL OF ONE -- the record that makes the goal sentence say "1".
     Reached through the UI alone on the shipped build: drill one topic, then press the goal
     stepper's `-` four times (it clamps at 1) and the line walks 1 of 5 -> 1 of 4 -> ... -> met,
     where the noun was hard-coded plural: "1 topics drilled this week". Every other pinned record
     is either unmet (where the noun counts the TARGET) or met with many, so the singular branch of
     the goal sentence was rendered by nothing in this battery.
     goal.weekly is written directly rather than clicked because a seed is a RECORD, not a
     rehearsal of the gesture -- Store clamps it to 1..20 and 1 is inside that range. */
  goalOfOne: () => {
    const id = TopicRegistry.ids()[0];
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    for (let i = 0; i < 4; i++) map[keys[i]] = 3;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: 4, shk: 0, done: 4, tot: cards.length, revisit: [], cards: map, cv: 1, ts: Date.now() }));
    localStorage.setItem('ddr.v1.goal.weekly', JSON.stringify(1));
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
    /* (1b) THE SENTENCE INSIDE THAT SURFACE, AND THE ONE CHANNEL IT IS ALLOWED TO HAVE.
       A COUNT of goal surfaces cannot see a word of what the surface says, and until this line
       existed nothing in test/ could: `grep -rn "drilled this week|Goal met|goalPhrase|ix-home-v"
       test/` returned exactly one hit in the whole tree, and it was a PROSE COMMENT. Every home VR
       baseline is the COLD record (the matrix seeds theme + RNG only), so weeklyGoal().done is 0
       in all 18 captures and the MET branch is in no baseline either -- which made cycle 3's
       item-7 fix silently revertible at a green 77/77. `line` is what the eye reads, `bold` is the
       figure it emphasises, and `g` is the record's own arithmetic, so the sentence is checked
       against the numbers rather than against another rendering of itself.
       `goalName` is EVERY way the bar could acquire an accessible name of its own -- aria-label,
       aria-labelledby, title -- not just the attribute the defect happened to use, so re-labelling
       it by a different route is the same red. null means the bar names nothing, which is the
       ruled state: it is a picture of the line beneath it, and a picture that is read is the
       sentence announced twice. */
    goalLine: txt(document.querySelector('.ix-goal .ix-home-v')),
    goalBold: txt(document.querySelector('.ix-goal .ix-home-v b')),
    goalName: (() => {
      const b = document.querySelector('.ix-goal .ix-goal-bar');
      if (!b) return null;
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const lb = b.getAttribute('aria-labelledby');
      const from = [
        b.getAttribute('aria-label') ? 'aria-label="' + clean(b.getAttribute('aria-label')) + '"' : null,
        lb ? 'aria-labelledby="' + clean(lb) + '"' : null,
        b.getAttribute('title') ? 'title="' + clean(b.getAttribute('title')) + '"' : null,
      ].filter(Boolean);
      return from.length ? from.join(' + ') : null;
    })(),
    /* read alongside it so a FAIL can say WHY the bar is exposed, not merely that it is */
    goalBarRole: (() => {
      const b = document.querySelector('.ix-goal .ix-goal-bar');
      return b ? (b.getAttribute('role') || null) : null;
    })(),
    goalBarHidden: (() => {
      const b = document.querySelector('.ix-goal .ix-goal-bar');
      return b ? b.getAttribute('aria-hidden') : null;
    })(),
    g: (() => { try { return Panels.weeklyGoal(); } catch (e) { return null; } })(),
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
    /* ---- THE DOOR'S ROOM ------------------------------------------------------------------
       `door` is the room the page is LIT in (the data-group on <html>, which rebinds --acc and
       therefore every focus ring, hover border and Cram button on the surface). `doorWant` is the
       room the home is ABOUT -- the resume target's, or the first topic's when there is nothing to
       resume, which is exactly what the START card points at. Read from the REGISTRY rather than
       from any rendering, so the judge compares the page against the record and not against
       another rendering of the record. */
    door: document.documentElement.getAttribute('data-group'),
    doorWant: (() => {
      try {
        const r = Panels.resumeTarget && Panels.resumeTarget();
        let t = (r && r.topic) || null;
        if (!t) { const ids = TopicRegistry.ids(); t = ids.length ? TopicRegistry.get(ids[0]) : null; }
        return (t && t.identity && t.identity.group) || null;
      } catch (e) { return null; }
    })(),
    /* the room the CTA is gelled in, so a FAIL can say whether the two disagree */
    ctaRoom: (() => {
      const c = document.querySelector('#home .hm-cta');
      return c ? (c.getAttribute('style') || '') : null;
    })(),
    /* ---- ARRIVAL ORDER --------------------------------------------------------------------
       The rendered top-level sections of the home column, in DOM order, filtered to the ones that
       actually paint. DOM order is the thing that matters: it is what the keyboard, the screen
       reader and the phone tab bar's crossing pointer all read, which is why the practice block
       was moved in html() rather than with CSS `order`. */
    arrival: [...document.querySelectorAll('#home > .ix-panel > *')]
      .filter((e) => e.getClientRects().length)
      .map((e) => {
        const c = (e.className || e.tagName).toString().split(/\s+/);
        for (const k of ['hm-continue', 'hm-practicem', 'hm-duo', 'hm-alt', 'hm-rooms', 'hm-libm', 'hm-skip', 'ix-foot', 'hm-lead']) {
          if (c.indexOf(k) !== -1) return k;
        }
        return c[0] || 'unknown';
      }),
    /* and the duo's own two cells, in DOM order -- "This week" leads */
    duoOrder: [...document.querySelectorAll('#home .hm-duo > section')]
      .filter((e) => e.getClientRects().length)
      .map((e) => (e.classList.contains('hm-tele') ? 'week' : 'shaky')),
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

/* AND WHAT THAT ONE SURFACE SAYS, IN BOTH CHANNELS, AGAINST THE RECORD'S OWN ARITHMETIC.
   judgeGoal above is a COUNT -- it cannot see a word -- and until this arm existed nothing else
   could either, so three separate defects lived in this sentence at a green 77/77:
     (a) the met clause was CONCATENATED onto a phrase that already ended in "goal met", so a
         41-topic week rendered "41 topics drilled, 5-topic goal met with 36 to spare drilled this
         week . Goal met -- nice work." Cycle 3 fixed it with no arm that could fail on its
         reversion, which is the exact class cycle 2's judges raised.
     (b) the noun was hard-coded plural, so a one-topic week printed "1 topics drilled this week".
     (c) the bar's aria-label was still built from goalPhrase's raw met branch, so the eye and a
         screen reader were given the SAME fact in two different sentences -- this home's own
         named failure mode, landed in the surface cycle 3 had just consolidated.
   FIVE RULES, in the order a reader would notice them breaking:
     1. one sentence, ONE channel -- the bar carries no accessible name of its own;
     2. the emphasised figure is the record's own `done`;
     3. the met state is named ONCE ("goal met" at most once);
     4. and it is not named mid-clause ("drilled this week" never follows "goal met");
     5. every noun agrees with the figure standing immediately before it.
   Rule 5 skips a hyphenated compound ("5-topic goal met") on purpose: that is an adjective, and it
   is singular whatever the number is.

   RULE 1 WAS RE-POINTED, and the reason is the fix that closing pass shipped. It used to read
   "the accessible name IS the visible line, character for character" -- which cycle 4 made TRUE,
   and true is what made it audible: the bar sat directly above the line, so a screen reader
   announced the same sentence twice in a row. Measured on the cold home:

     image  "0 of 5 topics drilled this week, 5 more to go"     <- .ix-goal-bar, role=img
     text   "0 of 5 topics drilled this week . 5 more to go"    <- .ix-home-v, right beneath it

   The bar is a picture OF that line and adds no fact, so it is aria-hidden with no role and no
   name. The rule that guards that is therefore the ABSENCE of an independent name, not a match --
   and it is strictly stronger than what it replaces: the old form went red only on a name that
   DIVERGED, so it was green on the defect it is named for. It still fails the whole pre-cycle-4
   divergence class, because any name at all is now a red (MUTANT 13 plants exactly that). */
function judgeGoalSentence(r) {
  if (r.goalLine === null) return null;          /* judgeGoal owns "there must be a surface" */
  if (!r.g) return 'the page renders a weekly-goal sentence but Panels.weeklyGoal() is unreadable, '
    + 'so nothing can be checked against the record';
  const line = r.goalLine;

  /* 1. ONE CHANNEL. The bar may not name itself -- by any route, and a role that takes a name is
     reported with it so the message says what to remove. */
  if (r.goalName !== null) {
    return 'the goal bar carries an accessible name of its own (' + r.goalName + ', role='
      + (r.goalBarRole || 'none') + ', aria-hidden=' + (r.goalBarHidden === null ? 'absent' : r.goalBarHidden)
      + '), so the fact is announced twice in a row -- once off the bar and again off the line\n'
      + '        directly beneath it: "' + line + '"';
  }
  /* 2. the emphasised figure is the record's own count */
  if (r.goalBold === null || +r.goalBold !== r.g.done) {
    return 'the line emphasises "' + r.goalBold + '" while the record has ' + r.g.done
      + ' topic(s) drilled this week';
  }
  /* 3 + 4. the met state is named once, and not mid-clause */
  const met = line.match(/goal met/gi) || [];
  if (met.length > 1) {
    return 'the met state is named ' + met.length + ' times in one sentence: "' + line + '"';
  }
  if (/goal met[\s\S]*drilled this week/i.test(line)) {
    return '"drilled this week" follows "goal met", which is the pre-cycle-3 concatenation: "' + line + '"';
  }
  /* 5. the noun agrees with the figure before it. One channel now, and rule 1 above guarantees
     there is no second one to walk. */
  for (const [where, s] of [['visible line', line]]) {
    const re = /(\d+) (topics?)\b/g;
    let m;
    while ((m = re.exec(s))) {
      const want = +m[1] === 1 ? 'topic' : 'topics';
      if (m[2] !== want) {
        return 'the ' + where + ' reads "' + m[1] + ' ' + m[2] + '" -- the noun does not agree with '
          + 'the figure it counts: "' + s + '"';
      }
    }
  }
  return null;
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

/* THE DOOR LIGHTS IN THE ROOM YOU ARE RETURNING TO.
   `applyIdentity()` stamps data-group on every topic switch and NOTHING EVER CLEARED IT, so the
   home wore either index.html's hard-coded boot room or whatever room you last visited -- never
   its own. MEASURED on the shipped build with a resume pointer at Event-Driven Backbone
   (Messaging & Events): data-group read `architecture-apis` and --acc was #963D86 MAGENTA, which
   is what lit the focus ring on all 46 topic cards, both Cram buttons and every hover border,
   while the Resume CTA next to them was correctly teal because it uses --rm. One page, two
   answers about which room the user is in, and the one with 688 consumers had the wrong one.
   The judge compares the stamp against the REGISTRY's group for the resume target, so it cannot
   be satisfied by re-deriving the stamp from the stamp. */
function judgeDoor(r) {
  if (!r.doorWant) return null;              /* no topics registered -- nothing to be lit as */
  if (r.door === r.doorWant) return null;
  return 'the home is lit in room "' + r.door + '" while the act it is about is in "' + r.doorWant
    + '" -- every var(--acc) consumer on this surface (focus rings, Cram, hover borders) is '
    + 'wearing a room the user is not going to';
}

/* THE ARRIVAL ORDER, AS DOM ORDER.
   The engaged home opened with the decision and then, immediately, the audit: the gauge, whose
   verdict is the largest sentence on the page and is an accusation, then a panel headed
   STILL SHAKY -- 41 FLAGGED. The cold home, by contrast, opens with an invitation. So the app was
   most hospitable to the person who had done nothing. This pins the fixed sequence rather than a
   vague "acts before audit": ONE order for every record class, with absent members skipped, so a
   later wave cannot restore the inversion one panel at a time. `hm-lead` (cold only) and the two
   phone-only members are allowed wherever they render; what is asserted is the RELATIVE order of
   the four that carry the argument. */
const ARRIVAL_RANK = { 'hm-continue': 0, 'hm-practicem': 1, 'hm-duo': 2, 'hm-alt': 3, 'hm-rooms': 4 };
function judgeArrival(r) {
  const seq = (r.arrival || []).filter((k) => k in ARRIVAL_RANK);
  for (let i = 1; i < seq.length; i++) {
    if (ARRIVAL_RANK[seq[i]] < ARRIVAL_RANK[seq[i - 1]]) {
      return 'the home arrives in the order ' + seq.join(' then ') + ' -- the audit (hm-alt) must '
        + 'sit below the acts and the week, not above them';
    }
  }
  /* and within the paired row, the week's shape leads the triage */
  const d = r.duoOrder || [];
  if (d.length === 2 && d[0] !== 'week') {
    return 'the paired row renders ' + d.join(' then ') + ' -- the deficit panel is first, which is '
      + 'the inversion this order exists to fix';
  }
  return null;
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
  ['goal sentence', judgeGoalSentence(r)],
  ['act order', judgeActOrder(r)],
  ['gauge key', judgeKey(r)],
  ['door room', judgeDoor(r)],
  ['arrival order', judgeArrival(r)],
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

      /* ---- MUTANT 14: THE DOOR LIT IN A ROOM THE USER IS NOT IN --------------------------
         Planted as the SHIPPED DEFECT, not as an arbitrary wrong value: index.html's hard-coded
         boot group, which is what the home wore on every load before the resume room was stamped.
         Planted on `mixedPosition`, whose resume topic has a room of its own to disagree with.
         The control matters as much as the plant here -- if the resume topic happened to BE in
         architecture-apis the plant would be a no-op and the mutant would report a false green,
         so the check aborts rather than pretending it landed. */
      if (w === 1280 && name === 'mixedPosition') {
        const clean14 = await page.evaluate(READ);
        if (clean14.doorWant === 'architecture-apis') {
          aborted = aborted || 'MUTANT 14 CANNOT LAND: this seed\'s resume topic is itself in '
            + 'architecture-apis, so the boot constant and the correct room are the same string '
            + 'and the plant proves nothing. Point the seed at a topic in another room.';
        } else if (judgeDoor(clean14)) {
          aborted = aborted || 'MUTANT 14 CONTROL FAILED: the SHIPPED home is already lit in the '
            + 'wrong room before anything was planted: ' + judgeDoor(clean14);
        } else {
          await page.evaluate(() => document.documentElement.setAttribute('data-group', 'architecture-apis'));
          const bad14 = await page.evaluate(READ);
          if (!judgeDoor(bad14)) {
            aborted = aborted || 'MUTANT 14 UNDETECTED: the home lit in the BOOT CONSTANT room '
              + '(architecture-apis) while its resume act is in ' + bad14.doorWant + ' was '
              + 'accepted. That is the shipped defect verbatim.';
          }
          await page.evaluate((g) => document.documentElement.setAttribute('data-group', g), clean14.door);
        }
      }

      /* ---- MUTANT 15: THE AUDIT BACK ON TOP ----------------------------------------------
         The arrival inversion, replanted by moving the gauge above the paired row exactly as it
         shipped. Planted on `weakTopics`, the one seed that renders BOTH duo cells -- on a record
         with no chips the row has one cell and the second half of the judge has nothing to order,
         so the plant would only exercise half the rule. */
      if (w === 1280 && name === 'weakTopics') {
        const clean15 = await page.evaluate(READ);
        if (clean15.duoOrder.length !== 2) {
          aborted = aborted || 'MUTANT 15 CANNOT LAND: `weakTopics` renders ' + clean15.duoOrder.length
            + ' duo cell(s), so the paired-row half of the arrival rule is untested. This seed is '
            + 'the one that must render both.';
        } else if (judgeArrival(clean15)) {
          aborted = aborted || 'MUTANT 15 CONTROL FAILED: the SHIPPED arrival order is already '
            + 'wrong before anything was planted: ' + judgeArrival(clean15);
        } else {
          const moved = await page.evaluate(() => {
            const alt = document.querySelector('#home .hm-alt');
            const duo = document.querySelector('#home .hm-duo');
            if (!alt || !duo) return false;
            duo.parentNode.insertBefore(alt, duo);       /* the shipped order */
            return true;
          });
          const bad15 = await page.evaluate(READ);
          if (!moved) {
            aborted = aborted || 'MUTANT 15 CANNOT LAND: no .hm-alt / .hm-duo on this record.';
          } else if (!judgeArrival(bad15)) {
            aborted = aborted || 'MUTANT 15 UNDETECTED: the gauge restored above the paired row -- '
              + 'the shipped arrival -- was accepted: ' + bad15.arrival.join(' then ');
          }
          /* and the second half, on its own, so one rule cannot cover for the other */
          await page.evaluate(() => {
            const duo = document.querySelector('#home .hm-duo');
            const alt = document.querySelector('#home .hm-alt');
            if (alt && duo) duo.parentNode.insertBefore(duo, alt);          /* order restored */
            if (duo && duo.children.length === 2) duo.insertBefore(duo.children[1], duo.children[0]);
          });
          const bad15b = await page.evaluate(READ);
          if (!judgeArrival(bad15b)) {
            aborted = aborted || 'MUTANT 15b UNDETECTED: the paired row with the deficit panel '
              + 'first was accepted: ' + bad15b.duoOrder.join(' then ');
          }
        }
      }

      /* ---- MUTANTS 11, 12, 13: THE THREE DEFECTS THAT LIVED IN ONE SENTENCE ----------------
         EACH PLANT WRITES EXACTLY THE CHANNEL ITS RULE IS ABOUT, so the rule under test is the one
         that fires -- an arm whose later rules can never be the reason it went red is four rules
         of decoration behind one. That means something different now than it did in cycle 4. Then
         the bar had a name and rule 1 demanded the two channels MATCH, so a plant had to write
         both or rule 1 fired first. The closing pass made the bar aria-hidden, so rule 1 is now
         "the bar names nothing" -- and writing an aria-label at all IS the rule-1 defect. So 11
         and 12 touch only the visible line (their rules are about that line), and 13 touches only
         the bar (its rule is about that bar). Same principle, inverted plumbing. */
      const plantGoal = async (which) => page.evaluate((kind) => {
        const v = document.querySelector('.ix-goal .ix-home-v');
        const bar = document.querySelector('.ix-goal .ix-goal-bar');
        const g = (typeof Panels !== 'undefined') ? Panels.weeklyGoal() : null;
        if (!v || !bar || !g || !g.met) return null;
        const EM = String.fromCharCode(0x2014), DOT = String.fromCharCode(0xB7);
        const NOTE = 'Goal met ' + EM + ' nice work.';
        let out = null;
        /* each case is the REVERTED CODE'S OWN OUTPUT, composed from the live Panels API rather
           than from a pasted literal, so a mutant cannot drift away from the defect it names */
        if (kind === 'concat') {
          out = { line: Panels.goalPhrase(g, true) + ' drilled this week &middot; ' + NOTE };
        } else if (kind === 'plural') {
          if (g.done !== 1) return null;
          out = { line: '<b>' + g.done + '</b> topics drilled this week &middot; ' + NOTE };
        } else if (kind === 'aria') {
          /* the state cycle 4 shipped: the bar re-acquires a name of its own. Composed from the
             live API, and it does not matter whether it MATCHES the line -- the defect rule 1
             names is a second channel existing at all, and the cycle-4 form (which matched
             exactly) is the one that made the duplication audible. */
          out = { aria: Panels.goalPhrase(g) + ' this week', role: 'img' };
        }
        if (!out) return null;
        const before = { html: v.innerHTML, aria: bar.getAttribute('aria-label'),
          role: bar.getAttribute('role'), hidden: bar.getAttribute('aria-hidden') };
        if (out.line !== undefined) v.innerHTML = out.line;
        if (out.aria !== undefined) {
          bar.setAttribute('aria-label', out.aria);
          if (out.role) bar.setAttribute('role', out.role);
          bar.removeAttribute('aria-hidden');
        }
        return { before, after: (v.textContent || '').replace(/\s+/g, ' ').trim(),
          spoken: bar.getAttribute('aria-label'), dot: DOT };
      }, which);
      const goalMutant = async (n, which, cannot, undetected) => {
        const planted = await plantGoal(which);
        if (!planted) { aborted = aborted || 'MUTANT ' + n + ' CANNOT LAND: ' + cannot; return; }
        const bad = await page.evaluate(READ);
        if (!judgeGoalSentence(bad)) {
          aborted = aborted || 'MUTANT ' + n + ' UNDETECTED: ' + undetected + ' -- visible "'
            + planted.after + '" / accessible "' + planted.spoken + '"';
        }
        /* RESTORE BY ATTRIBUTE STATE, not by re-setting a value. `setAttribute('aria-label', null)`
           writes the literal string "null" onto a bar that had no label, which would leave every
           judge after this mutant reading a name the app never rendered -- the plant's own defect,
           left behind by its cleanup. */
        await page.evaluate((b) => {
          const v = document.querySelector('.ix-goal .ix-home-v');
          const bar = document.querySelector('.ix-goal .ix-goal-bar');
          v.innerHTML = b.html;
          const put = (k, val) => { if (val === null) bar.removeAttribute(k); else bar.setAttribute(k, val); };
          put('aria-label', b.aria);
          put('role', b.role);
          put('aria-hidden', b.hidden);
        }, planted.before);
      };

      /* 11: THE PRE-CYCLE-3 CONCATENATION. Planted on `perfect`, which drills all 46 topics with
         ts = Date.now(), so weeklyGoal() reports 46 >= 5 and the MET branch renders. Composed from
         the LIVE Panels API rather than from a literal, so it is the reverted code's own output:
         goalStrip() said `goalPhrase(g, true) + ' drilled this week'` before cycle 3. */
      if (name === 'perfect') {
        await goalMutant(11, 'concat',
          '`perfect` does not render the MET branch of the weekly-goal sentence, so the '
          + 'concatenation cycle 3 removed cannot be planted and the goal-sentence arm is untested '
          + 'on the branch it was written for.',
          'the met state was named three times in one sentence and the arm accepted it');
      }

      /* 12: THE HARD-CODED PLURAL, on the one pinned record whose met figure is 1. Without
         `goalOfOne` this rule has no record to fail on: every other seed is unmet (where the noun
         counts the TARGET, 5) or met with many. */
      if (name === 'goalOfOne') {
        await goalMutant(12, 'plural',
          '`goalOfOne` no longer renders a MET week with exactly one topic drilled, so the singular '
          + 'branch of the goal sentence is rendered by no pinned record and the noun rule cannot '
          + 'fail on any of them.',
          '"1 topics" was accepted -- the noun does not have to agree with the figure it counts');

        /* 13: THE BAR SPEAKS AGAIN -- the whole pre-cycle-4 divergence class AND the cycle-4
           duplication, in one plant, because rule 1 no longer cares whether the name matches. It
           restores role="img" + an aria-label built from goalPhrase's raw met branch (the state
           cycle 3 shipped, where the eye read the composed sentence and a screen reader got "1
           topic drilled, goal met this week") and clears aria-hidden. The visible line is left
           EXACTLY as the app renders it, so only rule 1 can catch this -- and if rule 1 had been
           left as "the two channels must MATCH", the cycle-4 state (they matched perfectly, and
           the sentence was read twice) would have been GREEN. */
        await goalMutant(13, 'aria',
          '`goalOfOne` is not a met week, so the accessible name cannot be pointed at the met '
          + 'branch and rule 1 is untested.',
          'the goal bar was given an accessible name of its own -- role=img with the sentence '
          + 'already carried by the line beneath it -- and the arm accepted it');
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

  /* ================== THE STEPPER IS PRESSED, AND NOTHING ELSE IN THE GATE PRESSES IT ==========
   * THE GAP THIS CLOSES, stated plainly because it is the root cause of the defect it guards:
   * `grep -rn "data-goal" test/` returned TWO files before this section -- touch_floor.cjs
   * (getBoundingClientRect only) and focus_ring.cjs (programmatic .focus() only). Across 77 checks
   * NOTHING PRESSED THIS CONTROL. So the whole [data-goal] interaction path -- clamp, re-render,
   * focus, announcement -- was unguarded, on a control this wave rebuilt to 44px and, by hoisting
   * goalStrip() out of the engaged() gate, put on the first-run home of every new user.
   *
   * WHAT SHIPPED THROUGH THAT GAP. The handler rebuilt the strip and `replaceWith`-ed it, which
   * DESTROYED and recreated the aria-live node on every press -- so the region never fired. That
   * matters here more than anywhere: cycle 4 removed the bar's role="img" + aria-label (it
   * duplicated the line beneath it) and named this very aria-live as the compensation. The
   * compensation was a region that could not fire. And `goalTarget()` clamps to 1..20 while
   * nothing said so: three of seven presses on `-` did nothing, aria-disabled null throughout.
   *
   * This lives in home_claims rather than touch_floor because the oracle is judgeGoalSentence --
   * the sentence must still be entailed by the record AFTER each press, which is exactly this
   * file's subject. touch_floor's subject is the 44px box, and it still owns that.
   *
   * aria-disabled is ADVISORY, so the presses use force:true: a real user can still press a
   * clamped button and the press is a no-op by Math.min/Math.max, not by the attribute --
   * Playwright's actionability check is the only thing that treats it as disabled, and asserting
   * through it would be asserting Playwright's opinion instead of the app's behaviour. */

  /* ===== THE 138 MARKS ARE REACHABLE BY SOMETHING OTHER THAN A MOUSE ==========================
   * WHAT WAS WRONG, and it is stronger than the audit's "title is mouse-only". Each altitude
   * capsule names its topic through a `title` attribute -- which does not fire on touch and is not
   * reachable by keyboard -- but the TRACK above it carries `role="img"`, and role="img" makes its
   * descendants PRESENTATIONAL. So the 138 titles were removed from the accessibility tree by
   * construction: not awkward to reach, unreachable. Measured on the shipped build: segHasTitle
   * true, segTabbable false, and no description anywhere on the rail.
   *
   * IT IS ASSERTED ON THE ACCESSIBILITY TREE, not on the attribute, because the attribute is the
   * thing that was already there and already useless. What has to be true is that a reader landing
   * on the rail can get at what the picture says -- so the rail's own AX node must carry a
   * DESCRIPTION, and that description must name the topics the marks stand for.
   *
   * THE ORACLE IS THE REGISTRY, not the rendering: the description has to contain the titles of
   * topics that are really on this rail, so a description built from the wrong tier -- or an empty
   * one -- cannot pass. And the mutant removes the tie and requires this to go red, because an AX
   * assertion that cannot fail is the most flattering kind of green there is.
   *
   * ===== R14 (cycle 5): WHAT THAT FIRST DRAFT COULD NOT SEE, AND THE WAVE'S OWN LAW APPLIED ====
   * The arm above shipped as `axFor('.hm-alt .hm-gr-t')` -- querySelector, so the FIRST rail --
   * asserting that THREE SAMPLED TITLES appear SOMEWHERE in its description. Three defects in one
   * line, each of which a real regression fits through:
   *   ONE RAIL OF THREE. Two whole rails could lose their description with this green.
   *   SUBSTRING CONTAINMENT. A description holding the first three clauses and stopping -- a cap,
   *   a slice, a truncation -- passes, because containment is not equality and 3 is not 46.
   *   NO COUNT AND NO ORDER. Clauses could be dropped, doubled or shuffled invisibly.
   * So the arm is rebuilt to the same law this wave applies everywhere else: the POPULATION comes
   * from the DOM (every rail the gauge rendered, keyed by its tier, selected by POSITION so that
   * stripping the tie cannot also hide the node), the ORACLE comes from the registry (Altitude
   * .rail, formatted here rather than read back from the app), and the assertion is EQUALITY --
   * the description must be the whole lattice, in the order it is drawn, character for character.
   * The clause count is asserted against that rail's own `.hm-seg` count, so "the text is the
   * picture" is a number and not a hope.
   * THE FORMATTER IS DUPLICATED HERE ON PURPOSE. Reading segLabel back off the app would make
   * this a comparison of the rendering with itself; writing it out means a copy change to the
   * lattice's spoken form has to be made twice, deliberately, which is the correct price for a
   * text equivalent that claims to be lossless. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML, { hash: '#home' });
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.evaluate(SEEDS.weakTopics);
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.until(page, () => !!document.querySelector('#home .hm-alt .hm-seg'), null, B.ACT_MS, 'the gauge');
    await B.settle(page);

    /* READ THROUGH CDP, not through page.accessibility -- that helper is gone from current
       Playwright, and the protocol is the tree itself rather than a wrapper's view of it. */
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('Accessibility.enable');
    const axFor = async (sel) => {
      const doc = await cdp.send('DOM.getDocument', { depth: -1 });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
      if (!nodeId) return null;
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const n = (nodes || []).find((x) => x.ignored !== true) || (nodes || [])[0];
      if (!n) return null;
      const val = (p) => (n[p] && n[p].value !== undefined ? String(n[p].value) : '');
      return { role: val('role'), name: val('name'), description: val('description') };
    };
    /* THE EXPECTED TEXT, BUILT FROM THE REGISTRY. Same shape as home-view.js's segLabel and
       gaugeHtml, written out here rather than imported -- see the note above. */
    const segLabel = (s, tier) => s.title + ' \u2014 ' + (s.done
      ? s.solid + ' solid of ' + s.n + ' ' + tier + ' probes'
      : 'not started at ' + tier)
      + (s.missed ? ', missed probes flagged' : (s.shaky ? ', shaky probes flagged' : ''));
    const railsOf = async () => page.evaluate(() => {
      const m = Altitude.compute();
      const tiers = m.order.filter((t) => m.tiers[t] && m.tiers[t].n);
      const nodes = [...document.querySelectorAll('.hm-alt .hm-gauge > .hm-gr')];
      return {
        tiers,
        nodes: nodes.length,
        rails: tiers.map((tier, i) => ({
          tier,
          row: Altitude.rail(m, tier).map((s) => ({ title: s.title, done: !!s.done, solid: s.solid,
            n: s.n, missed: !!s.missed, shaky: !!s.shaky })),
          segs: nodes[i] ? nodes[i].querySelectorAll('.hm-seg').length : -1,
        })),
      };
    });
    /* SELECTED BY POSITION, NOT BY THE TIE. A selector built on [aria-describedby] would stop
       matching under the very mutant that strips it, so "no node" and "no description" would be
       the same result and MUTANT 16b could pass by disappearing. */
    const railSel = (i) => '.hm-alt .hm-gauge > .hm-gr:nth-child(' + (i + 1) + ') .hm-gr-t';
    const model = await railsOf();

    out.push(['[gauge names] every rail the gauge drew was found and read (population from the '
      + 'DOM, not one querySelector)',
      model.nodes === model.tiers.length && model.tiers.length >= 1,
      'the model has ' + model.tiers.length + ' rail-bearing tiers (' + model.tiers.join(', ')
      + ') and the DOM has ' + model.nodes + ' .hm-gr nodes -- an arm that reads the first of an '
      + 'unknown number is asserting nothing about the rest']);

    for (let i = 0; i < model.rails.length; i++) {
      const r = model.rails[i];
      const a = await axFor(railSel(i));
      const d = a ? a.description.replace(/\s+/g, ' ').trim() : '';
      const clauses = r.row.map((s) => segLabel(s, r.tier));
      const want = r.tier + ', topic by topic. ' + clauses.join('. ') + '.';
      out.push(['[gauge names] the ' + r.tier + ' rail carries an accessible NAME (the summary it '
        + 'always had)', !!(a && a.name && a.name.trim()), JSON.stringify(a && a.name)]);
      out.push(['[gauge names] ...and a DESCRIPTION, which is the only path its marks have to '
        + 'anything that is not a mouse (role="img" makes their titles presentational)',
        d.length > 0, 'the ' + r.tier + ' rail\'s AX node carries no description: '
        + JSON.stringify(a)]);
      /* THE COUNT, AGAINST THE PICTURE. Split on '. ' is only meaningful while no clause contains
         one; if a topic title ever does, the split stops being a count and says so rather than
         reporting a wrong number. */
      const splittable = !clauses.some((c) => c.indexOf('. ') !== -1);
      const got = splittable && d ? d.replace(/^[^.]*\. /, '').replace(/\.$/, '').split('. ').length : -1;
      out.push(['[gauge names] ...one clause per MARK on the ' + r.tier + ' rail -- the text is '
        + 'lossless or it is a summary of a picture nobody can see',
        !splittable || got === r.segs,
        splittable
          ? ('the ' + r.tier + ' rail draws ' + r.segs + ' capsules and its description carries '
            + got + ' clauses (registry says ' + r.row.length + ')')
          : 'a clause contains ". " so the split is not a count -- assert equality only']);
      /* EQUALITY, NOT CONTAINMENT. Containment is what let three sampled titles stand in for
         forty-six clauses; a cap, a slice or a shuffle all satisfy it. */
      let why = 'the ' + r.tier + ' rail\'s description is not the rail.';
      if (d !== want) {
        let k = 0;
        while (k < d.length && k < want.length && d[k] === want[k]) k++;
        why += ' First divergence at character ' + k + ' of ' + want.length + ' (got '
          + d.length + '): expected ' + JSON.stringify(want.slice(k, k + 90))
          + ' and read ' + JSON.stringify(d.slice(k, k + 90));
      }
      out.push(['[gauge names] ...and it is the WHOLE lattice, VERBATIM and IN THE ORDER IT IS '
        + 'DRAWN -- Altitude.rail(' + r.tier + ') formatted from the registry, compared for '
        + 'equality', d === want, why]);
    }

    /* MUTANT 16: the tie removed -- the shipped state, where the marks had a title and no path */
    const stripAll = () => page.evaluate(() => {
      document.querySelectorAll('.hm-alt .hm-gr-t').forEach((t) => t.removeAttribute('aria-describedby'));
    });
    await stripAll();
    await B.settle(page);
    for (let i = 0; i < model.rails.length; i++) {
      const a2 = await axFor(railSel(i));
      const d2 = a2 ? a2.description.trim() : '';
      if (d2.length > 0) {
        aborted = aborted || 'MUTANT 16 UNDETECTED: aria-describedby stripped from every rail and '
          + 'the accessibility tree STILL reported a description on the '
          + model.rails[i].tier + ' rail (' + JSON.stringify(d2.slice(0, 80))
          + '). The arm above is reading something other than the tie it claims to guard.';
      }
    }
    /* MUTANT 16b (R14): THE TIE REMOVED FROM EXACTLY ONE RAIL -- the partial revert, and the
       mutant MUTANT 16 cannot see. Stripping EVERY tie is a mutation the old one-rail arm also
       caught; stripping the SECOND one is the shape a real regression takes (a branch that skips
       a tier, a thin rail rendered by another path) and the old arm was blind to it by
       construction. It is pressed on the rail the old arm did not read. */
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.until(page, () => !!document.querySelector('#home .hm-alt .hm-seg'), null, B.ACT_MS,
      'the gauge');
    await B.settle(page);
    const victim = Math.min(1, model.rails.length - 1);
    if (model.rails.length < 2) {
      aborted = aborted || 'MUTANT 16b CANNOT LAND: the seeded record rendered '
        + model.rails.length + ' rail(s), so "the tie removed from exactly one of them" is not a '
        + 'distinguishable state and the per-rail loop above is unpressed.';
    } else {
      await page.evaluate((k) => {
        const t = document.querySelectorAll('.hm-alt .hm-gauge > .hm-gr')[k];
        if (t) t.querySelector('.hm-gr-t').removeAttribute('aria-describedby');
      }, victim);
      await B.settle(page);
      const seen = [];
      for (let i = 0; i < model.rails.length; i++) {
        const a3 = await axFor(railSel(i));
        seen.push((a3 ? a3.description.trim() : '').length);
      }
      if (seen[victim] > 0) {
        aborted = aborted || 'MUTANT 16b UNDETECTED: aria-describedby was stripped from the '
          + model.rails[victim].tier + ' rail ONLY and its AX node still reported a description of '
          + seen[victim] + ' characters. A partial revert is the shape this regression actually '
          + 'takes, and an arm that reads one rail cannot see it -- lengths were ' + seen.join('/');
      }
      if (seen.filter((n) => n > 0).length !== model.rails.length - 1) {
        aborted = aborted || 'MUTANT 16b CANNOT LAND: stripping ONE tie left '
          + seen.filter((n) => n > 0).length + ' of ' + model.rails.length + ' rails described ('
          + seen.join('/') + '), so the plant did not isolate a single rail and a red would not be '
          + 'about the partial revert.';
      }
    }
    await ctx.close();
  }

  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await B.gotoApp(page, HTML, { hash: '#home' });
    await B.settle(page);
    const ARM = () => {
      window.__lm = { region: 0 };
      const t = document.querySelector('.ix-goal .ix-goal-t');
      if (!t) return false;
      window.__node = t;
      new MutationObserver((m) => { window.__lm.region += m.length; })
        .observe(t, { childList: true, characterData: true, subtree: true, attributes: true });
      return true;
    };
    const STEP = () => {
      const el = document.querySelector('.ix-goal');
      const t = el && el.querySelector('.ix-goal-t');
      const dec = el && el.querySelector('[data-goal=dec]');
      const inc = el && el.querySelector('[data-goal=inc]');
      return {
        target: t ? t.textContent.trim() : null,
        ariaLive: t ? t.getAttribute('aria-live') : null,
        regionMutations: window.__lm ? window.__lm.region : -1,
        sameNode: window.__node === t,
        attached: !!(window.__node && document.contains(window.__node)),
        decAD: dec ? dec.getAttribute('aria-disabled') : null,
        incAD: inc ? inc.getAttribute('aria-disabled') : null,
        decNativeDisabled: dec ? dec.disabled : null,
        decTabIndex: dec ? dec.tabIndex : null,
        goal: (typeof Panels !== 'undefined') ? Panels.weeklyGoal() : null,
      };
    };
    const armed = await page.evaluate(ARM);
    out.push(['[stepper] the press arm found a weekly-goal strip to press', armed,
      'no .ix-goal-t on the cold home -- nothing to observe, so every assertion below would be free']);

    if (armed) {
      await page.locator('#home [data-goal="inc"]').click();
      await B.settle(page);
      await page.waitForTimeout(150);
      const s1 = await page.evaluate(STEP);
      /* (1) THE LIVE REGION SURVIVES THE PRESS. This is the whole fix: a region must already be in
         the accessibility tree BEFORE its content changes (view-manager.js's own rule). */
      out.push(['[stepper] one press UPDATES the aria-live target in place rather than replacing it',
        s1.sameNode === true && s1.attached === true && s1.regionMutations > 0
        && s1.ariaLive === 'polite',
        JSON.stringify(s1) + ' -- sameNode false / regionMutations 0 is the replaceWith swap, '
        + 'where the region is destroyed and recreated and therefore never announces']);
      /* (2) and the sentence still follows the record -- the file's own judge, re-applied */
      const r1 = await page.evaluate(READ);
      out.push(['[stepper] and the sentence is still entailed by the record after the press',
        !judgeGoalSentence(r1), judgeGoalSentence(r1) || '']);

      /* (3) THE CLAMP SAYS SO, at both ends, and stays reachable while it does */
      const down = [];
      for (let i = 0; i < 7; i++) {
        await page.locator('#home [data-goal="dec"]').click({ force: true });
        await page.waitForTimeout(70);
        down.push(await page.evaluate(STEP));
      }
      const low = down[down.length - 1];
      out.push(['[stepper] at the lower clamp the control says it is at the bound, and is still '
        + 'focusable while saying it (aria-disabled, NOT disabled -- text-zoom.js\'s ruled pattern)',
        low.target === '1' && low.decAD === 'true' && low.incAD === null
        && low.decNativeDisabled === false && low.decTabIndex === 0,
        'walk ' + down.map((d) => d.target + (d.decAD ? '[ad]' : '')).join(' -> ')
        + ' final ' + JSON.stringify(low)]);
      /* "0 of 1 topic drilled this week" -- the clamped target is where rule 5's singular branch
         is reachable through the UI, which is how the judge found it in the first place. */
      const rLow = await page.evaluate(READ);
      out.push(['[stepper] and the sentence agrees with the clamped target, singular noun included',
        !judgeGoalSentence(rLow) && / 1 topic\b/.test(rLow.goalLine || ''),
        judgeGoalSentence(rLow) || ('line reads "' + (rLow.goalLine || '') + '"')]);
      for (let i = 0; i < 21; i++) {
        await page.locator('#home [data-goal="inc"]').click({ force: true });
        await page.waitForTimeout(25);
      }
      const high = await page.evaluate(STEP);
      out.push(['[stepper] at the upper clamp the other end says so, and the lower end stops saying it',
        high.target === '20' && high.incAD === 'true' && high.decAD === null,
        JSON.stringify(high)]);

      /* (4) THE SELF-TEST. The probe must be able to SEE the pre-fix state, or every green above
         is a green about an instrument that cannot tell "updated" from "swapped". So the strip is
         swapped here the way the handler used to swap it, and the same reader is required to
         report a detached, different node. */
      const swapped = await page.evaluate(() => {
        const g = document.querySelector('.ix-goal');
        if (!g) return null;
        const holder = document.createElement('div');
        holder.innerHTML = g.outerHTML;
        g.replaceWith(holder.firstChild);
        return {
          sameNode: window.__node === document.querySelector('.ix-goal .ix-goal-t'),
          attached: document.contains(window.__node),
        };
      });
      out.push(['[stepper][self-test] the probe can see the pre-fix swap -- replacing the strip '
        + 'reports a DETACHED, different live region',
        !!swapped && swapped.sameNode === false && swapped.attached === false,
        JSON.stringify(swapped) + ' -- if this stays "same node", the arm above cannot fail and '
        + 'the replaceWith regression would ship green']);
    }
    await page.close();
    await ctx.close();
  }

  /* ========== THE BOOT RING: THE DOOR IS LIT BEFORE ANYTHING PAINTS ==========================
   * judgeDoor above reads the stamp AFTER the home has rendered, which is exactly late enough to
   * miss the defect it was written for. index.html hard-coded data-group="architecture-apis" on
   * <html>, so on a seeded record in another room the first frames of every session were painted
   * in the BOOT CONSTANT and only then corrected -- MEASURED on the shipped build, three cold
   * loads on a security-tenancy record: 5 and 6 frames of architecture-apis before the home
   * re-stamped, and one load where the sampler started late enough to see none. A post-render
   * read reports that as clean. This arm samples <html data-group> on EVERY animation frame from
   * document_start, so the frames themselves are the evidence.
   *
   * THREE THINGS ARE ASSERTED, and the third is the one that keeps boot.js honest:
   *   1. SEEDED   every sampled frame is the resume target's room -- no wrong room, no roomless
   *               frame, across three cold loads.
   *   2. COLD     with no record the home boots in the COLD DOOR's room -- TopicRegistry.ids()[0],
   *               which is what the cold START card points at -- and NOT in the boot topic's. The
   *               two disagree (ids()[0] is event-driven, TopicRegistry.current() at boot is
   *               content-pipeline), which is precisely why one hard-coded attribute could not
   *               answer both questions, and the arm aborts rather than pass if they ever agree.
   *   3. THE FACTS boot.js cannot import app modules, so it carries three things the registry
   *               owns: the id->room table, the boot topic and the cold door's topic. All three
   *               are compared against TopicRegistry -- the table in BOTH directions -- so a topic
   *               added, moved between rooms or renamed reds here instead of silently lighting the
   *               wrong door.
   *
   * THE MUTANTS GO THROUGH THE REAL CODE PATH. `window.__doorRooms` is redefined as an accessor
   * whose setter swallows boot's assignment, so boot derives from a table the test controls: one
   * that answers "architecture-apis" for the resume topic (the constant, restored, arriving by
   * the honest route) and one that answers nothing (the stamp deleted). Both must go red. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const probe = await ctx.newPage();
    await B.gotoApp(probe, HTML, { hash: '#home' });

    /* a topic whose room is NOT the cold door's room, so a stamp that ignores the record and a
       stamp that reads it cannot agree by accident */
    const pick = await probe.evaluate(() => {
      const ids = TopicRegistry.ids();
      if (!ids.length) return null;
      const cold = ((TopicRegistry.get(ids[0]) || {}).identity || {}).group;
      for (const id of ids) {
        const g = ((TopicRegistry.get(id) || {}).identity || {}).group;
        if (g && g !== cold) return { id, group: g, cold };
      }
      return null;
    });
    if (!pick) {
      aborted = aborted || 'THE BOOT-RING ARM CANNOT LAND: every registered topic is in the same '
        + 'room as the cold door, so a stamp read from the record and a stamp that ignores it are '
        + 'the same string and the arm proves nothing.';
    }
    /* a SECOND topic, in a third room -- neither pick's nor the room the app shows on a bare-view
       boot -- so "the door followed nav.last", "the door followed the newest graded record" and
       "the door followed the route" are three DIFFERENT strings and no cell can pass by accident */
    const alt = !pick ? null : await probe.evaluate((p) => {
      const bootGroup = ((((TopicRegistry.current && TopicRegistry.current()) || {}).identity)
        || {}).group || '';
      for (const id of TopicRegistry.ids()) {
        const g = ((TopicRegistry.get(id) || {}).identity || {}).group;
        if (g && g !== p.group && g !== p.cold && g !== bootGroup) return { id, group: g };
      }
      return null;
    }, pick);
    if (pick && !alt) {
      aborted = aborted || 'THE PRECEDENCE CELL CANNOT LAND: no topic sits outside the resume '
        + 'room, the cold-door room and the boot room all at once, so nav.last-vs-newest cannot '
        + 'be told apart from the route\'s own answer and the cell would prove nothing.';
    }

    /* 3. THE TABLE vs THE REGISTRY, and the two topic constants beside it. `__doorBoot` is read
          on a BARE-VIEW boot (#walk), because that is the route whose room is the boot topic's --
          TopicRegistry.current() moves as you navigate, so reading it anywhere else would be
          comparing boot.js's constant against a value that is no longer the boot value. */
    const bootTopic = await (async () => {
      const p2 = await ctx.newPage();
      await B.gotoApp(p2, HTML, { hash: '#walk' });
      const v = await p2.evaluate(() => ({
        cur: (TopicRegistry.current && TopicRegistry.current() || {}).id || null,
        declared: window.__doorBoot || null,
        stamped: document.documentElement.getAttribute('data-group'),
        curGroup: (((TopicRegistry.current && TopicRegistry.current()) || {}).identity || {}).group || null,
      }));
      await p2.close();
      return v;
    })();
    out.push(['[boot] a bare-view boot is lit in the BOOT TOPIC\'s room, and boot.js\'s declared '
      + 'boot topic is the one the registry actually makes current -- the half of the old constant '
      + 'that was correct, kept and checked instead of deleted',
      !!bootTopic.cur && bootTopic.declared === bootTopic.cur
        && bootTopic.stamped === bootTopic.curGroup && !!bootTopic.curGroup,
      JSON.stringify(bootTopic)]);

    const tab = await probe.evaluate(() => {
      const m = window.__doorRooms;
      if (!m) return null;
      const flat = {}, dupes = [];
      for (const g in m) for (const id of String(m[g]).split(' ')) {
        if (!id) continue;
        if (flat[id]) dupes.push(id);
        flat[id] = g;
      }
      const missing = [], wrong = [], extra = [], reg = {};
      for (const id of TopicRegistry.ids()) {
        const g = ((TopicRegistry.get(id) || {}).identity || {}).group || '';
        reg[id] = g;
        if (!flat[id]) missing.push(id);
        else if (flat[id] !== g) wrong.push(id + ' (table ' + flat[id] + ', registry ' + g + ')');
      }
      for (const id in flat) if (!(id in reg)) extra.push(id);
      const ids = TopicRegistry.ids();
      return { n: Object.keys(flat).length, regN: Object.keys(reg).length, dupes, missing, wrong, extra,
        cold: window.__doorCold || null, coldWant: ids[0] || null };
    });
    out.push(['[boot] boot.js\'s id->room table agrees with the registry entry by entry, both '
      + 'directions -- it is a duplicate of a fact boot cannot import, so it is checked rather '
      + 'than trusted',
      !!tab && !tab.dupes.length && !tab.missing.length && !tab.wrong.length && !tab.extra.length
        && tab.n === tab.regN,
      tab ? (tab.n + ' in the table vs ' + tab.regN + ' registered; missing ' + JSON.stringify(tab.missing)
        + ' wrong ' + JSON.stringify(tab.wrong) + ' extra ' + JSON.stringify(tab.extra)
        + ' duplicated ' + JSON.stringify(tab.dupes))
        : 'window.__doorRooms is not defined -- boot.js is not deriving the door room at all']);
    out.push(['[boot] and its declared COLD DOOR is the registry\'s first topic -- the one the '
      + 'cold home\'s START card points at, which is a different topic from the boot topic and so '
      + 'a different answer',
      !!tab && !!tab.cold && tab.cold === tab.coldWant,
      tab ? ('boot.js declares ' + tab.cold + ', registry ids()[0] is ' + tab.coldWant) : 'no table']);
    await probe.close();

    /* one cold load, sampling every frame; `plant` runs at document_start.
       OPTS: `hash` drives the ROUTE SHAPE (the arm certified two of four route x record cells
       until cycle 3 -- every load here was '#home', and the one bare-view load was run on an
       EMPTY record, which is the single record class in which the bare-view defect cannot
       appear). `alt` writes a SECOND, NEWER progress record on a topic in another room, so the
       order between nav.last and newest-graded is exercised in both directions instead of being
       hidden by seeding one id into both keys. */
    const frames = async (seed, plant, opts) => {
      const o = opts || {};
      const p = await ctx.newPage();
      await p.addInitScript(({ id, pl, alt }) => {
        try {
          localStorage.clear();
          if (id) {
            localStorage.setItem('ddr.v1.nav.last', JSON.stringify({ id: id, view: 'drill' }));
            localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
              got: 3, shk: 2, done: 5, tot: 12, revisit: ['x'], cards: {}, cv: 1, ts: Date.now() }));
          }
          if (alt) {
            /* NEWER than the nav.last topic's, so "most recently graded" and "last visited"
               disagree. Panels.resumeTarget() puts LastVisit FIRST (panels.js:289) and boot.js
               duplicates that order; seeding one id into both keys could not tell the two
               orders apart, so neither could the arm. */
            localStorage.setItem('ddr.v1.progress.' + alt, JSON.stringify({
              got: 4, shk: 1, done: 5, tot: 9, revisit: ['x'], cards: {}, cv: 1,
              ts: Date.now() + 60000 }));
          }
        } catch (e) {}
        if (pl === 'record') {
          /* THE BARE-VIEW MUTANT, and it is cycle 2's SHIPPED derivation rather than an invented
             one: consult the record BEFORE the route, so a bare view is lit in the room of
             whatever topic you last visited. Planted at the constant boot.js reads for that
             branch, so it arrives through boot's own code path. */
          let heldB = null;
          Object.defineProperty(window, '__doorBoot', {
            configurable: true, get() { return id; }, set(v) { heldB = v; },
          });
          void heldB;
        } else if (pl) {
          let held = null;
          Object.defineProperty(window, '__doorRooms', {
            configurable: true,
            get() { return pl === 'none' ? {} : { 'architecture-apis': id }; },
            set(v) { held = v; },
          });
          void held;
        }
        /* TWO RECORDERS, because one of them cannot be trusted about WHEN it started.
           The rAF sampler shows what was PAINTED, but its first callback lands at whatever
           moment the compositor gets to it -- measured across loads it caught 2 frames on one
           and 58 on another, and on a late start it would sample only AFTER the home had already
           corrected a wrong stamp, reporting a clean run for a broken build. So the attribute is
           ALSO watched from document_start: a MutationObserver records every value data-group
           ever holds, in order, whatever the frame timing does. The mutation log is the arm; the
           frames are the corroboration. */
        /* OBSERVE `document`, NOT `document.documentElement`. At document_start the <html>
           element may not exist yet -- it did not here, and observing null threw, which took the
           rest of this init script (including the frame sampler) down with it and made the whole
           arm error rather than fail. `document` is always there, and an attribute change on
           documentElement is in its subtree. */
        window.__doorSeen = [document.documentElement
          ? document.documentElement.getAttribute('data-group') : null];
        new MutationObserver((recs) => {
          for (const r of recs) window.__doorSeen.push(r.target.getAttribute(r.attributeName));
        }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-group'] });
        window.__doorFrames = [];
        const tick = () => {
          window.__doorFrames.push(document.documentElement.getAttribute('data-group'));
          if (window.__doorFrames.length < 90) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, { id: seed, pl: plant || null, alt: o.alt || null });
      const hash = o.hash || '#home';
      await B.gotoApp(p, HTML, { hash });
      /* THE READINESS SIGNAL DIFFERS BY ROUTE, and it is not a choice: ViewManager stamps
         `data-view` for the HOME only -- on a bare-view route it stays NULL for the whole
         session (measured: `#walk` gives data-view=null, data-group=architecture-apis). So
         waiting for "data-view is not home" there waits forever. The topic routes announce
         themselves by mounting their pane instead. */
      await B.until(p, (h) => (h === '#home'
        ? document.documentElement.getAttribute('data-view') === 'home'
        : !!document.querySelector('.stage .pane.on')),
      hash, B.ACT_MS, 'the route rendered (' + hash + ')');
      await B.settle(p);
      const f = await p.evaluate(() => ({
        frames: window.__doorFrames.slice(), seen: window.__doorSeen.slice(),
        resume: (typeof Panels !== 'undefined' && Panels.resumeTarget && Panels.resumeTarget()) || null,
        shown: ((((typeof TopicRegistry !== 'undefined' && TopicRegistry.current
          && TopicRegistry.current()) || {}).identity) || {}).group || null,
      }));
      await p.close();
      /* the document_start reading is ALWAYS null -- nothing has run yet -- and asserting on it
         would fail every build. Every value AFTER it is a value the document really wore. */
      return { frames: f.frames, seen: f.seen.slice(1), first: f.seen[0],
        resumeGroup: ((f.resume || {}).topic || {}).identity
          ? f.resume.topic.identity.group : null,
        resumeId: (f.resume || {}).id || null, shown: f.shown };
    };
    const rle = (f) => {
      const o = [];
      for (const v of f) {
        if (o.length && o[o.length - 1][0] === v) o[o.length - 1][1]++;
        else o.push([v, 1]);
      }
      return o.map(([v, n]) => (v === null ? '(no room)' : v) + ' x' + n).join(' -> ');
    };

    if (pick) {
      /* 1. SEEDED -- three cold loads, no value the attribute ever held is another room */
      let offSeen = 0, seenN = 0, offFrame = 0, frameN = 0, tape = [];
      for (let i = 0; i < 3; i++) {
        const f = await frames(pick.id, null);
        seenN += f.seen.length;
        offSeen += f.seen.filter((v) => v !== pick.group).length;
        frameN += f.frames.length;
        offFrame += f.frames.filter((v) => v !== pick.group).length;
        tape.push(f.seen.length + ' stamp(s) [' + f.seen.join(',') + '] / '
          + f.frames.length + ' frames ' + rle(f.frames));
      }
      out.push(['[boot] on a seeded record EVERY value <html data-group> ever holds is the resume '
        + 'target\'s room -- three cold loads, watched from document_start, so no correcting '
        + 're-stamp can hide behind a late sampler',
        seenN > 0 && offSeen === 0 && offFrame === 0,
        offSeen + ' of ' + seenN + ' stamps and ' + offFrame + ' of ' + frameN + ' painted frames '
        + 'were not ' + pick.group + ' (cold door is ' + pick.cold + '): ' + tape.join(' | ')]);

      /* BOTH MUTANTS ARE JUDGED ON THE UNION OF THE TWO RECORDERS, and that is not belt-and-
         braces -- the two defects are visible in DIFFERENT recorders and judging either one
         alone lets the other through. A WRONG stamp is a value in the mutation log. A DELETED
         stamp writes nothing at all, so the log holds only the home's later corrective stamp and
         reads clean; what it costs is eight PAINTED frames with no room, and only the frames can
         see that. Mutant B was written against the log first and passed the broken build. */
      const everWore = (f) => f.seen.concat(f.frames);
      const mA = await frames(pick.id, 'const');
      out.push(['[boot][mutant] THE BOOT CONSTANT PUT BACK: the door lit in architecture-apis '
        + 'while the resume act is in ' + pick.group + ' is caught',
        everWore(mA).some((v) => v !== pick.group),
        'stamps [' + mA.seen.join(',') + '] / frames ' + rle(mA.frames)]);

      const mB = await frames(pick.id, 'none');
      out.push(['[boot][mutant] THE STAMP DELETED: a seeded record booting with no room on <html> '
        + 'is caught -- with index.html\'s constant gone, an unstamped boot is roomless, not safe',
        everWore(mB).some((v) => v !== pick.group),
        'stamps [' + mB.seen.join(',') + '] / frames ' + rle(mB.frames)]);

      /* ---- 1b. THE BARE-VIEW ROUTE, ON A RECORD -- the cell this arm did not have -----------
         Until cycle 3 the arm drove FOUR route x record cells and certified two: every boot-ring
         load used '#home', and the ONE bare-view load (the __doorBoot check above) ran on an
         EMPTY record -- the single record class in which the bare-view defect cannot appear,
         because with nothing to resume the record branch falls through to the route branch
         anyway. So a shipped regression was invisible: cycle 2 consulted the RECORD before the
         ROUTE, and on any bare-view route with a record the whole document was lit in the resume
         topic's room while the app showed the boot topic -- for the entire session, since
         applyIdentity() runs on switches and a bare-view boot never switches. The room the
         document wears is compared against the room of the topic the app IS SHOWING, read from
         TopicRegistry.current() rather than from a constant, so this cannot drift. */
      for (const h of ['#walk', '#drill']) {
        const bv = await frames(pick.id, null, { hash: h });
        const wore = bv.seen.concat(bv.frames);
        out.push(['[boot] a BARE-VIEW route (' + h + ') on a SEEDED record is lit in the room of '
          + 'the topic the app actually shows, not the room of the record -- every value '
          + '<html data-group> ever holds, watched from document_start',
          !!bv.shown && wore.length > 0 && wore.every((v) => v === bv.shown),
          'the app shows ' + bv.shown + ' while the record resumes ' + pick.id + ' ('
          + pick.group + '); stamps [' + bv.seen.join(',') + '] / frames ' + rle(bv.frames)]);
      }
      const mD = await frames(pick.id, 'record', { hash: '#walk' });
      out.push(['[boot][mutant] THE RECORD CONSULTED BEFORE THE ROUTE -- cycle 2\'s shipped '
        + 'derivation, in which #walk on a record took the HOME\'s answer -- is caught',
        !!mD.shown && mD.seen.concat(mD.frames).some((v) => v !== mD.shown),
        'the app shows ' + mD.shown + '; stamps [' + mD.seen.join(',') + '] / frames '
        + rle(mD.frames)]);

      /* ---- 1c. nav.last vs THE NEWEST GRADED RECORD, IN DIFFERENT ROOMS ---------------------
         frames() used to write both keys with the SAME id, so the ORDER between them -- which
         must match Panels.resumeTarget()'s LastVisit-first rule at panels.js:289 -- was untested
         in both directions, and boot.js's duplicate of that order was guarded by nothing. The
         oracle is resumeTarget() READ FROM THE PAGE, not a constant: boot.js and panels.js are
         two derivations of one rule, and the only honest assertion is that they agree. */
      if (alt) {
        const two = await frames(pick.id, null, { alt: alt.id });
        const wore = two.seen.concat(two.frames);
        out.push(['[boot] with nav.last (' + pick.id + ', ' + pick.group + ') and the NEWEST '
          + 'graded record (' + alt.id + ', ' + alt.group + ') in DIFFERENT rooms, the door is '
          + 'lit in the room Panels.resumeTarget() returns when read from the page -- boot.js '
          + 'duplicates that precedence and is checked against it rather than against a constant',
          two.resumeId === pick.id && !!two.resumeGroup && wore.length > 0
            && wore.every((v) => v === two.resumeGroup),
          'resumeTarget() -> ' + two.resumeId + ' (' + two.resumeGroup + '); stamps ['
          + two.seen.join(',') + '] / frames ' + rle(two.frames)]);
      }
    }

    /* 2. COLD -- the cold DOOR's room, which is not the boot topic's */
    const coldWant = await (async () => {
      const p3 = await ctx.newPage();
      await B.gotoApp(p3, HTML, { hash: '#home' });
      const v = await p3.evaluate(() => {
        const ids = TopicRegistry.ids();
        const first = ids.length ? TopicRegistry.get(ids[0]) : null;
        const cur = (TopicRegistry.current && TopicRegistry.current()) || null;
        return { door: ((first || {}).identity || {}).group || null,
          boot: ((cur || {}).identity || {}).group || null };
      });
      await p3.close();
      return v;
    })();
    if (coldWant.door && coldWant.door === coldWant.boot) {
      aborted = aborted || 'THE COLD-DOOR ARM CANNOT LAND: the registry\'s first topic and its '
        + 'boot topic are in the SAME room, so "the cold home lights its own door" and "the cold '
        + 'home lights the boot topic\'s room" are the same string and the arm proves nothing.';
    } else {
      const cold = await frames(null, null);
      const off = cold.seen.filter((v) => v !== coldWant.door).length;
      const offF = cold.frames.filter((v) => v !== coldWant.door).length;
      out.push(['[boot] a first-time visitor\'s home is lit in the COLD DOOR\'s room ('
        + coldWant.door + ', the registry\'s first topic -- what the START card points at) and '
        + 'NEVER in the boot topic\'s room (' + coldWant.boot + '), which is what the deleted '
        + 'constant said',
        cold.seen.length > 0 && off === 0 && offF === 0,
        off + ' of ' + cold.seen.length + ' stamps [' + cold.seen.join(',') + '] and ' + offF
        + ' of ' + cold.frames.length + ' frames were not ' + coldWant.door + ': ' + rle(cold.frames)]);
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
  console.log('  21 planted mutants detected (a full claim over empty rails; a level claim over '
    + 'unequal rails; a thin rail named on the highest tier; a step position beside a bare probe '
    + 'remainder; a verdict quoting one rail\u2019s figures for another; an inflated panel header; '
    + 'an inflated figure inside the single-thin-rail sentence, checked against its own negative '
    + 'control; a SECOND weekly-goal surface on the cold record; Cross-topic rendered above '
    + 'Weak-spot in the phone practice block; the four-state key hidden while the rails still paint '
    + 'keel marks; the pre-cycle-3 goal concatenation, which named the met state three times in one '
    + 'sentence; "1 topics drilled this week" on a week of one; the goal bar given an '
    + 'accessible name of its own again, so the fact is announced off the bar and again off the '
    + 'line beneath it; THE HOME LIT IN THE BOOT CONSTANT\'S ROOM while its resume act is in '
    + 'another, which is what every var(--acc) consumer on the surface wore before this wave; and '
    + 'the arrival inverted in both of its halves -- the gauge restored above the paired row, and '
    + 'the paired row restored with the deficit panel first; the rails\' aria-describedby tie '
    + 'stripped, which is the state in which 138 marks name their topics to a mouse and to nothing '
    + 'else, AND that tie stripped from EXACTLY ONE rail -- the partial revert, which the arm this '
    + 'wave replaced could not see, because it read the first rail of three and asserted three '
    + 'sampled titles were CONTAINED in its description rather than that the description WAS the '
    + 'rail; and the two boot-ring plants -- THE BOOT CONSTANT RESTORED through boot.js\'s own '
    + 'derivation, and the door stamp DELETED -- judged on the UNION of a document_start '
    + 'MutationObserver and the painted frames, because a WRONG stamp is a value in the log while '
    + 'a MISSING one is only a gap in the paint, and each recorder alone lets the other defect '
    + 'through; and THE RECORD CONSULTED BEFORE THE ROUTE -- cycle 2\'s own shipped derivation, '
    + 'under which any bare-view route on a record lit the whole document in the resume topic\'s '
    + 'room while the app showed the boot topic, for the entire session, on the route family the '
    + 'gate itself drives), plus the cell that could not see it: the boot arm certified two of '
    + 'four route x record cells, because every load was #home and the one bare-view load ran on '
    + 'an EMPTY record -- the ONE record class in which the bare-view defect cannot appear, '
    + 'since with nothing to resume the record branch falls through to the route branch '
    + 'anyway. Four cells now, and the precedence between nav.last and the newest graded '
    + 'record is driven in both directions against Panels.resumeTarget() read from the page '
    + 'rather than against a constant)'
    + ' -- every one of them a defect a judge or a battery found on a shipped build');
  if (bad.length) return B.finish(1, 'HOME CLAIMS: FAIL (' + bad.length + ')');
  return B.finish(0, 'HOME CLAIMS: PASS  (' + out.length + ' assertions: '
    + Object.keys(SEEDS).length + ' pinned records + ' + GEN_N + ' generated from a fixed PRNG, '
    + 'x 2 viewports, plus a 972-probe hero census at each -- every printed claim entailed by the '
    + 'record\u2019s exact integers; and the weekly-goal stepper is PRESSED, which nothing in the '
    + 'gate did before: the aria-live target is updated in place rather than swapped, the sentence '
    + 'still follows the record after the press, and both clamps say so while staying focusable)');
})();
