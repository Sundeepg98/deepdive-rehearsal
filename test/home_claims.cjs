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
 * THE BATTERY. Nine records driven at 1280 and 390: empty, one-solid, two-tiers-tied-under-a-
 * higher-third (both directions), genuinely level, perfect, mixed-position (drill cursor with a
 * walk resume), absent-field (a stored drill position, resume pointer on walk), and no-record.
 * The judges kept finding defects on seeds the builder had not run; this is that list, run.
 *
 * SELF-TEST, every run: four planted mutants must each be caught -- a verdict naming a thin rail
 * that is not the minimum, a "level" claim over unequal rails, a "full" claim with unsolid probes,
 * and a position asserted from an absent field. If any goes undetected the check ABORTS.
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
  return {
    rails,
    verdict: txt(document.querySelector('.hm-verdict')),
    header: txt(document.querySelector('.hm-alt .hm-fig')),
    census: txt(document.querySelector('.hm-status')),
    since: txt(document.querySelector('.hm-since')),
    eyebrow: txt(document.querySelector('.hm-eyebrow')),
    ctaSub: txt(document.querySelector('.hm-cta-d')),
    hero: q ? { text: txt(q), clipped: q.scrollHeight > q.clientHeight + 1 } : null,
    h1s: [...document.querySelectorAll('h1')].filter((h) => h.getClientRects().length).map(txt),
  };
};

/* ---- the claim rules. Each returns null when consistent, or why it is not. ---- */
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
    /* a remainder in probes must keep its denominator when the position is in steps */
    if (unit === 'step' && /\b\d+<?\/?b?>? still ungraded/.test(s.replace(/\s+/g, ' '))) {
      if (!/of its \d+ probes/.test(s)) return 'a step position beside a bare "still ungraded" -- the remainder lost its denominator: "' + s + '"';
    }
  }
  if (/have not graded a probe in it yet/.test(s) && /Every probe here is graded/.test(s)) {
    return 'says both "not graded yet" and "every probe graded": "' + s + '"';
  }
  return null;
}

function judgeHero(r) {
  if (!r.hero) return null;
  if (r.hero.clipped) return 'the hero is visually truncated -- a cut-off question is not a question: "' + r.hero.text.slice(-46) + '"';
  const eyebrow = r.eyebrow || '';
  const pane = (r.ctaSub || '').toLowerCase();
  if (/Where you stopped/.test(eyebrow) && pane && pane.indexOf('drill') === -1) {
    return '"Where you stopped" heroes a probe while Resume opens "' + r.ctaSub + '"';
  }
  return null;
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const out = [];
  let aborted = null;

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

      for (const [arm, why] of [['verdict', judgeVerdict(r)], ['position', judgePosition(r)], ['hero', judgeHero(r)]]) {
        out.push(['[' + w + '/' + name + '] the ' + arm + ' agrees with the numbers beside it', !why, why || '']);
      }
      out.push(['[' + w + '/' + name + '] exactly one rendered h1', r.h1s.length === 1, JSON.stringify(r.h1s)]);

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
      if (w === 1280 && name === 'absentField') {
        await page.evaluate(() => {
          document.querySelector('.hm-since').innerHTML = 'You worked this topic, and stopped at step 1 of 9. <b>9</b> still ungraded.';
        });
        const bad4 = await page.evaluate(READ);
        if (!judgePosition(bad4)) {
          aborted = aborted || 'MUTANT 4 UNDETECTED: a step position beside a bare probe remainder was accepted -- round 2 verbatim.';
        }
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();

  if (aborted) {
    console.log('=== HOME CLAIMS ===');
    console.log('SELF-TEST ABORT -- the analyser does not do what it claims:');
    console.log('  ' + aborted);
    return B.finish(1, 'HOME CLAIMS: FAIL (self-test)');
  }

  const bad = out.filter((o) => !o[1]);
  for (const [label, pass, detail] of out) console.log((pass ? '  PASS  ' : '  FAIL  ') + label + (pass ? '' : '  -- ' + detail));
  console.log('\n  4 planted mutants detected (a full claim over empty rails; a level claim over '
    + 'unequal rails; a thin rail named on the highest tier; a step position beside a bare probe '
    + 'remainder) -- every one of them a defect a judge found on a shipped build');
  if (bad.length) return B.finish(1, 'HOME CLAIMS: FAIL (' + bad.length + ')');
  return B.finish(0, 'HOME CLAIMS: PASS  (' + out.length + ' assertions over '
    + Object.keys(SEEDS).length + ' edge records x 2 viewports: every rendered claim agrees with '
    + 'the numerals rendered beside it)');
})();
