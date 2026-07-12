#!/usr/bin/env node
/*
 * REGRESSION GUARD: a stored grade belongs to a QUESTION, not to a SLOT.
 *
 * THE BUG THIS LOCKS OUT (P0, silent, and armed the moment content lands):
 *
 *     progress.<id>.cards used to be { 0:3, 1:2, ... } -- keyed by the probe's INDEX
 *     IN THE BANK. Insert one probe at the top of a bank and every stored grade below
 *     it slides onto the WRONG question. Nothing throws. No count changes. The record
 *     still reads {done:20, tot:20}. The app simply starts telling you that you have
 *     nailed a probe you have never been shown -- and marking one you fumbled as solid.
 *
 * 38 topics are about to be heavily authored. Probes WILL be inserted and reordered.
 * So this guard does the thing that detonates it: it completes a topic, then REORDERS
 * the bank AND INSERTS new probes into it, and asserts every surviving grade still
 * lands on its ORIGINAL QUESTION -- matched by content, never by position.
 *
 * The reference is the user's own completed run, captured BEFORE the bank is touched
 * and re-checked against question text AFTER. It is not derived from the writer, so
 * the writer agreeing with itself cannot make it pass.
 *
 * Cases:
 *   1. grades are stored under CONTENT ids (cv:2), not bank indices
 *   2. REORDER + INSERT -> every original grade still on its own question; the
 *      inserted probes are ungraded (they did NOT inherit a shifted grade)
 *   3. an EDITED question drops ONLY its own grade -- every other grade survives
 *   4. v1 (index-keyed) records MIGRATE exactly when the bank is unchanged
 *   5. a v1 record whose bank has SHIFTED under it is never mis-attributed: the
 *      provable (content-derived) grades are recovered onto the RIGHT probes and the
 *      unprovable ones are dropped, not guessed
 *   6. the whiteboard, same bug class: REORDER + INSERT steps, grades stay put
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/card_identity.cjs
 */
const path = require('path');
const { chromium } = require('playwright');

const HTML = process.argv[2] ||
  path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const TOPIC = 'content-pipeline';
const OTHER = 'signing';          /* switching away and back = the real re-publish path */

/* ---------- in-page helpers ---------- */

/* Drive the drill like a human: reveal every stage, then judge. shakyEvery > 0 grades
   every Nth probe Shaky so the record carries a mix of levels. */
const RUN_DRILL = (page, shakyEvery) => page.evaluate(async (se) => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const sleep = (ms) => new Promise(x => setTimeout(x, ms));
  let graded = 0, guard = 0;
  while (guard++ < 400) {
    if (r.getElementById('adv')) { r.getElementById('adv').click(); await sleep(2); continue; }
    const jg = r.getElementById('jg'), js = r.getElementById('js');
    if (!jg || !js) break;
    ((se > 0 && graded % se === se - 1) ? js : jg).click();
    graded++;
    await sleep(4);
  }
  return graded;
}, shakyEvery);

/* Grade ONE specific probe -- addressed by its slot in the working set, the same way
   the drill's own nav does it (di + renderD). Reports WHICH probe it was, by content
   id, so the caller never has to assume which probe sat where. */
const GRADE_AT = (page, at, solid) => page.evaluate(async (a) => {
  const d = document.querySelector('#drill deep-drill'), r = d.shadowRoot;
  const sleep = (ms) => new Promise(x => setTimeout(x, ms));
  d.di = a.at; d.renderD(); await sleep(10);
  const card = cards[d.di];
  const id = CardId.forCards(_allCards)[_allCards.indexOf(card)];
  let g = 0;
  while (r.getElementById('adv') && g++ < 12) { r.getElementById('adv').click(); await sleep(2); }
  r.getElementById(a.solid ? 'jg' : 'js').click();
  await sleep(40);
  return { id: id, signal: card.signal };
}, { at: at, solid: solid });

/* The bank as the app sees it right now: content id <-> question <-> signal. */
const BANK = (page, tid) => page.evaluate((t) => {
  const b = TopicRegistry.get(t).data.bank.cards;
  const ids = CardId.forCards(b);
  return b.map((c, i) => ({ i: i, id: ids[i], signal: c.signal, q: c.q }));
}, tid);

const WB_BANK = (page, tid) => page.evaluate((t) => {
  const s = TopicRegistry.get(t).data.wb.steps;
  const ids = CardId.forSteps(s);
  return s.map((x, i) => ({ i: i, id: ids[i], cue: x.c }));
}, tid);

const REC = (page, tid) => page.evaluate((t) => {
  const p = localStorage.getItem('ddr.v1.progress.' + t);
  const w = localStorage.getItem('ddr.v1.wbprog.' + t);
  return { p: p ? JSON.parse(p) : null, w: w ? JSON.parse(w) : null };
}, tid);

/* THE DETONATOR. Rewrite the bank IN PLACE the way an author's edit would: reverse it
   (reorder) and splice new probes into it (insert). cards[] and speak[] stay paired --
   speak[i] pairs cards[i], and the compiler emits both. Mutating in place keeps every
   alias (_allCards, data.drill.cards) pointing at the same array, exactly as a rebuild
   would. */
const MUTATE_BANK = (page, tid, spec) => page.evaluate((a) => {
  const bank = TopicRegistry.get(a.tid).data.bank;
  const cs = bank.cards, sp = bank.speak;
  const order = cs.map((_, i) => i);
  if (a.reverse) order.reverse();
  const nc = order.map(i => cs[i]), ns = order.map(i => sp[i]);
  const made = (a.insert || []).map(x => ({
    pos: x.pos,
    card: {
      tier: 'SDE2', signal: 'INSERTED ' + x.tag,
      q: 'Inserted probe ' + x.tag + ' -- what ceiling do you hit first, and why that one?',
      a: 'The <b>inserted</b> answer for ' + x.tag + '.',
      f: [{ q: 'Push further on ' + x.tag + '?', a: 'The follow-up for ' + x.tag + '.' }],
      senior: 'The <b>senior tell</b> for ' + x.tag + '.'
    }
  }));
  made.slice().sort((p, q) => q.pos - p.pos).forEach(m => {
    nc.splice(m.pos, 0, m.card);
    ns.splice(m.pos, 0, 'Say the inserted line for ' + m.card.signal + '.');
  });
  cs.length = 0; Array.prototype.push.apply(cs, nc);
  sp.length = 0; Array.prototype.push.apply(sp, ns);
  /* NOTE: deliberately returns NO ids. Inserted probes are recognised downstream by
     their SIGNAL ("INSERTED ..."), i.e. by author content -- never by a CardId, which
     is the thing on trial and must never leak into this test's reference. */
  return { size: cs.length };
}, { tid: tid, reverse: spec.reverse, insert: spec.insert });

/* Edit ONE probe's question text -- the one case where a grade IS genuinely
   unrecoverable, because the question it was about no longer exists. */
const EDIT_Q = (page, tid, at) => page.evaluate((a) => {
  const c = TopicRegistry.get(a.tid).data.bank.cards[a.at];
  const before = CardId.of(c.q);
  c.q = 'A completely rewritten question about something else entirely -- ' + a.at + '?';
  return { before: before, after: CardId.of(c.q), signal: c.signal };
}, { tid: tid, at: at });

const MUTATE_WB = (page, tid) => page.evaluate((t) => {
  const steps = TopicRegistry.get(t).data.wb.steps;
  const nx = steps.slice().reverse();
  const made = [
    { c: 'Inserted step ALPHA -- draw the new box', a: 'The <b>inserted</b> ALPHA answer.' },
    { c: 'Inserted step BETA -- draw the other new box', a: 'The <b>inserted</b> BETA answer.' }
  ];
  nx.splice(0, 0, made[0]);
  nx.splice(3, 0, made[1]);
  steps.length = 0; Array.prototype.push.apply(steps, nx);
  return { size: steps.length };        /* no ids -- recognised by cue, see MUTATE_BANK */
}, tid);

/* The real re-publish path: switch away and back, exactly as a fresh boot on the new
   build would -- publishBanks() reseeds _allCards and every pane re-renders from it.
 *
 * WHY THIS AWAITS THE EVENT INSTEAD OF SLEEPING. setTopic() hands the pane re-render to
 * ViewTransitions.run(), which defers it into document.startViewTransition() -- so
 * `deeptopicchange` fires on a LATER frame, not on return. Fire the second setTopic
 * before the first transition has run its callback and the second transition SKIPS the
 * first, leaving the panes rendering the PREVIOUS topic while the registry and the
 * working-set globals have already moved on. The drill hides that (publishBanks reseeds
 * its globals synchronously, so it looks re-rendered either way); the whiteboard does
 * not (it reads this._steps, which only renderTopic() assigns). A sleep-based version of
 * this helper made the whiteboard cases pass or fail by luck. So: await each switch's
 * event, and then VERIFY the panes actually repainted -- never assume a render happened.
 */
const REPUBLISH = (page, tid) => page.evaluate(async (a) => {
  const switched = (id) => new Promise(res => {
    const h = () => { window.removeEventListener('deeptopicchange', h); setTimeout(res, 30); };
    window.addEventListener('deeptopicchange', h);
    TopicRegistry.setTopic(id);
  });
  await switched(a.other);
  await switched(a.tid);
  const wb = document.querySelector('#wb deep-whiteboard');
  return {
    bank: _allCards.length,
    regBank: TopicRegistry.get(a.tid).data.bank.cards.length,
    wbSteps: wb ? wb.getStats().total : -1,
    wbDom: wb ? wb.shadowRoot.querySelectorAll('#wblist li').length : -1,
    regSteps: TopicRegistry.get(a.tid).data.wb.steps.length
  };
}, { tid: tid, other: OTHER });

const RUN_WB = (page, missEvery) => page.evaluate(async (me) => {
  const r = document.querySelector('#wb deep-whiteboard').shadowRoot;
  const sleep = (ms) => new Promise(x => setTimeout(x, ms));
  const lis = r.querySelectorAll('#wblist li');
  for (let i = 0; i < lis.length; i++) {
    lis[i].querySelector('.wb-rev').click(); await sleep(2);
    lis[i].querySelector((me > 0 && i % me === me - 1) ? '.wb-miss' : '.wb-got').click();
    await sleep(3);
  }
  return lis.length;
}, missEvery);

const GRADE_WB = (page, idx, got) => page.evaluate(async (a) => {
  const w = document.querySelector('#wb deep-whiteboard'), r = w.shadowRoot;
  const sleep = (ms) => new Promise(x => setTimeout(x, ms));
  const li = r.querySelectorAll('#wblist li')[a.idx];
  li.querySelector('.wb-rev').click(); await sleep(3);
  li.querySelector(a.got ? '.wb-got' : '.wb-miss').click(); await sleep(40);
  return w.getStats().stepIds[a.idx];
}, { idx: idx, got: got });

(async () => {
  const errs = [], fails = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };

  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  const url = 'file://' + path.resolve(HTML);
  const fresh = async () => {
    await page.goto(url); await page.waitForTimeout(300);
    await page.evaluate(() => localStorage.clear());
    await page.goto(url); await page.waitForTimeout(350);
  };
  const openDrill = async () => { await page.evaluate(() => switchTab('drill')); await page.waitForTimeout(150); };

  /* ============ 1. a completed topic is stored under CONTENT ids ============ */
  await fresh();
  await openDrill();
  const graded = await RUN_DRILL(page, 3);
  await page.waitForTimeout(100);
  const bank0 = await BANK(page, TOPIC);
  const r1 = (await REC(page, TOPIC)).p;

  ok('drill completes and stores every probe', !!r1 && r1.done === bank0.length && r1.tot === bank0.length,
    'graded=' + graded + ' bank=' + bank0.length + ' rec=' + JSON.stringify(r1 && { done: r1.done, tot: r1.tot, cv: r1.cv }));
  ok('record declares the content-key schema (cv:2)', !!r1 && r1.cv === 2, 'cv=' + (r1 && r1.cv));

  const ids0 = bank0.map(c => c.id);
  const keys1 = Object.keys(r1.cards);
  ok('every stored key is a CONTENT id from this bank',
    keys1.length === bank0.length && keys1.every(k => ids0.indexOf(k) !== -1),
    'keys=' + JSON.stringify(keys1.slice(0, 6)) + ' ids=' + JSON.stringify(ids0.slice(0, 6)));
  ok('no stored key is a bare bank index',
    keys1.every(k => !(/^\d+$/.test(k) && +k < bank0.length)),
    'index-like keys: ' + JSON.stringify(keys1.filter(k => /^\d+$/.test(k) && +k < bank0.length)));

  /* THE REFERENCE, AND WHY IT IS KEYED BY SIGNAL AND NOT BY CardId.
     A test whose reference comes from the system under test cannot fail when that
     system is wrong -- it can only agree with it. Key this by cardId and the whole
     guard collapses: swap CardId back to "the index" and the reference silently
     becomes positional too, so a completely mis-attributed record still "matches".
     (Verified: that mutant passed the headline assertion until this was fixed.)
     So the reference is the AUTHOR'S OWN CONTENT -- the probe's signal, read off the
     registry -- which no bug in the keying can move. CardId is used ONLY to look a
     row up in the stored record, because that is the record's key format, i.e. the
     thing on trial. */
  const want = {};                       /* signal -> level  (independent of the writer) */
  bank0.forEach(c => { want[c.signal] = r1.cards[c.id]; });
  const nShaky = bank0.filter(c => r1.cards[c.id] < 3).length;
  ok('the run really did produce a mix of levels', nShaky > 0 && nShaky < bank0.length,
    'shaky/missed=' + nShaky + ' of ' + bank0.length);
  const isInserted = (sig) => /^INSERTED /.test(sig);   /* also content, not an id */

  /* ============ 2. THE DETONATOR: reorder + insert ============ */
  const mut = await MUTATE_BANK(page, TOPIC, {
    reverse: true,
    insert: [{ pos: 0, tag: 'TOP' }, { pos: 5, tag: 'MID' }, { pos: 99, tag: 'END' }]
  });
  const rp2 = await REPUBLISH(page, TOPIC);
  const size2 = rp2.bank;
  await openDrill();
  ok('the bank really was reordered AND grown', size2 === bank0.length + 3 && mut.size === size2,
    'was ' + bank0.length + ' now ' + size2);
  /* never let a stale pane make the rest of this pass by accident */
  ok('the drill really re-published the NEW bank', rp2.bank === rp2.regBank,
    'globals=' + rp2.bank + ' registry=' + rp2.regBank);

  const bank2 = await BANK(page, TOPIC);
  const pos0 = {}; bank0.forEach(c => { pos0[c.signal] = c.i; });
  const moved = bank2.filter(c => !isInserted(c.signal) && pos0[c.signal] !== c.i).length;
  ok('probes really did change position', moved >= bank0.length - 1,
    moved + ' of ' + bank0.length + ' original probes moved slot');

  /* THE WRITE THAT USED TO CORRUPT EVERYTHING: one grade after the bank changed. Grade
     an ORIGINAL probe (slot 1 -- slot 0 is the inserted TOP), so "no inserted probe
     carries ANY grade" stays an absolutely strict statement below. */
  const g2 = await GRADE_AT(page, 1, true);
  await page.waitForTimeout(60);
  const r2 = (await REC(page, TOPIC)).p;
  ok('the re-graded probe is an ORIGINAL one (test addresses the slot it means)',
    !isInserted(g2.signal), 'graded ' + g2.signal);

  /* THE HEADLINE. For every probe still in the bank, the grade the record hands back
     for it must be the grade the USER gave THAT QUESTION -- looked up by signal, so a
     mis-keyed record cannot launder itself through the reference. */
  const wrong = [];
  bank2.forEach(c => {
    if (isInserted(c.signal)) return;                        /* checked below */
    const expect = (c.signal === g2.signal) ? 3 : want[c.signal];
    const actual = r2.cards[c.id];
    if (actual !== expect) wrong.push(c.signal + ': expected ' + expect + ' got ' + actual);
  });
  ok('REORDER + INSERT: every surviving grade still lands on its ORIGINAL question',
    wrong.length === 0, wrong.length + ' mis-attributed | ' + wrong.slice(0, 4).join(' | '));

  const leaked = bank2.filter(c => isInserted(c.signal) && r2.cards[c.id] !== undefined);
  ok('the inserted probes inherited NOTHING -- they are ungraded', leaked.length === 0,
    'inserted probes carrying a grade: ' + JSON.stringify(leaked.map(c => c.signal)));

  ok('tot tracks the NEW bank size', r2.tot === size2, 'tot=' + r2.tot + ' bank=' + size2);
  ok('done counts only really-graded probes', r2.done === bank0.length,
    'done=' + r2.done + ' expected=' + bank0.length);

  /* ...and an inserted probe, once graded, lands on ITSELF -- it is a first-class card,
     not a hole. (Slot 0 is the inserted TOP probe.) */
  const g2b = await GRADE_AT(page, 0, false);
  await page.waitForTimeout(60);
  const r2b = (await REC(page, TOPIC)).p;
  const ins0 = bank2.find(c => c.signal === g2b.signal);
  ok('a newly INSERTED probe grades onto its own id',
    isInserted(g2b.signal) && !!ins0 && r2b.cards[ins0.id] === 2 && r2b.done === bank0.length + 1,
    'signal=' + g2b.signal + ' level=' + (ins0 && r2b.cards[ins0.id]) + ' done=' + r2b.done);
  const wrong2 = bank2.filter(c => !isInserted(c.signal) &&
    r2b.cards[c.id] !== ((c.signal === g2.signal) ? 3 : want[c.signal]));
  ok('grading the inserted probe disturbed no original grade', wrong2.length === 0,
    wrong2.slice(0, 4).map(c => c.signal).join(' | '));

  /* revisit is derived from the bank, so it must name the RIGHT signals */
  const wantRevisit = bank2.filter(c => !isInserted(c.signal) &&
    ((c.signal === g2.signal) ? 3 : want[c.signal]) < 3).map(c => c.signal).sort();
  ok('the revisit list names the right probes after the shuffle',
    JSON.stringify(r2.revisit.slice().sort()) === JSON.stringify(wantRevisit),
    JSON.stringify(r2.revisit.slice().sort()) + ' vs ' + JSON.stringify(wantRevisit));

  /* ============ 3. an EDITED question drops ONLY its own grade ============ */
  /* Slot 2 of the mutated bank is an ORIGINAL probe (the inserts sit at 0 and 5), and
     it is already graded. Rewriting its question means the probe that grade was ABOUT
     no longer exists -- that one grade is genuinely unrecoverable and must go. Every
     other grade must not even flinch. */
  const edSlot = bank2[2];                            /* an ORIGINAL, already-graded probe */
  const ed = await EDIT_Q(page, TOPIC, 2);
  ok('the edited probe was an original one that carried a grade',
    !isInserted(edSlot.signal) && r2b.cards[edSlot.id] !== undefined && ed.signal === edSlot.signal,
    edSlot.signal + ' level=' + r2b.cards[edSlot.id]);
  const doneBefore = r2b.done;

  await REPUBLISH(page, TOPIC);
  await openDrill();
  await GRADE_AT(page, 4, true);                      /* any write re-derives the record */
  await page.waitForTimeout(60);
  const r3 = (await REC(page, TOPIC)).p;
  const bank3 = await BANK(page, TOPIC);

  /* The probe still exists and still carries its SIGNAL -- only its QUESTION changed.
     So we find it by signal (content), and its grade must be gone: the thing that
     grade was about no longer exists. */
  const edNow = bank3.find(c => c.signal === ed.signal);
  ok('the edited probe LOSES its grade (its question no longer exists)',
    !!edNow && r3.cards[edNow.id] === undefined,
    'probe ' + ed.signal + ' still holds level ' + (edNow && r3.cards[edNow.id]));

  const survivors = bank3.filter(c => !isInserted(c.signal) && c.signal !== ed.signal);
  const lost = survivors.filter(c => r3.cards[c.id] === undefined);
  ok('every OTHER grade survives the edit -- exactly one is dropped, and never the record',
    lost.length === 0 && r3.done === doneBefore - 1,
    lost.length + ' other grades lost ' + JSON.stringify(lost.slice(0, 4).map(c => c.signal)) +
    '; done ' + doneBefore + ' -> ' + r3.done);

  /* ============ 4. v1 (index-keyed) records MIGRATE exactly ============ */
  await fresh();
  const seedA = await page.evaluate((t) => {
    const bank = TopicRegistry.get(t).data.bank.cards;
    const map = {}, revisit = [];
    let got = 0, shk = 0;
    bank.forEach((c, i) => {
      const lv = (i % 3 === 0) ? 2 : 3;
      map[i] = lv;
      if (lv < 3) { shk++; revisit.push(c.signal); } else got++;
    });
    /* NO cv field -- this is exactly what shipped: keyed by BANK INDEX */
    localStorage.setItem('ddr.v1.progress.' + t, JSON.stringify({
      got: got, shk: shk, done: bank.length, tot: bank.length, revisit: revisit, cards: map, ts: Date.now()
    }));
    return { want: bank.map((c, i) => ({ signal: c.signal, level: (i % 3 === 0) ? 2 : 3 })) };
  }, TOPIC);

  await page.goto(url); await page.waitForTimeout(400);      /* boot -> eager migrate() */
  const r4 = (await REC(page, TOPIC)).p;
  const bank4 = await BANK(page, TOPIC);

  ok('a v1 record is migrated at BOOT, with no grade needed', !!r4 && r4.cv === 2,
    'cv=' + (r4 && r4.cv));
  const bad4 = bank4.filter((c, i) => r4.cards[c.id] !== seedA.want[i].level);
  ok('v1 -> v2 migration is EXACT (every grade on its own question)', bad4.length === 0,
    bad4.slice(0, 4).map(c => c.signal).join(' | '));
  ok('the migrated record keeps its totals', r4.done === bank4.length && r4.tot === bank4.length,
    JSON.stringify({ done: r4.done, tot: r4.tot }));

  /* ============ 5. a v1 record whose bank SHIFTED is never mis-attributed ============ */
  /* Simulate the late upgrader: the record was written against an OLDER bank -- the
     current one minus its first two probes -- so old index j now means probe j+2.
     A positional read would put every grade two slots off. It must refuse. */
  await fresh();
  const seedB = await page.evaluate((t) => {
    const bank = TopicRegistry.get(t).data.bank.cards;
    const OLD = bank.length - 2;
    const map = {}, revisit = [];
    let got = 0, shk = 0;
    for (let j = 0; j < OLD; j++) {
      const real = bank[j + 2];                  /* the probe old-index j ACTUALLY meant */
      const lv = (j % 4 === 0) ? 2 : 3;
      map[j] = lv;
      if (lv < 3) { shk++; revisit.push(real.signal); } else got++;
    }
    localStorage.setItem('ddr.v1.progress.' + t, JSON.stringify({
      got: got, shk: shk, done: OLD, tot: OLD, revisit: revisit, cards: map, ts: Date.now()
    }));
    return { flagged: revisit.slice(), shifted: bank.slice(0, 2).map(c => c.signal) };
  }, TOPIC);

  await page.goto(url); await page.waitForTimeout(400);
  const r5 = (await REC(page, TOPIC)).p;
  const bank5 = await BANK(page, TOPIC);
  const graded5 = bank5.filter(c => r5 && r5.cards[c.id] !== undefined);

  ok('the shifted v1 record still migrates to v2', !!r5 && r5.cv === 2, 'cv=' + (r5 && r5.cv));
  ok('the provable (content-derived) grades are recovered onto the RIGHT probes',
    JSON.stringify(graded5.map(c => c.signal).sort()) === JSON.stringify(seedB.flagged.slice().sort()),
    JSON.stringify(graded5.map(c => c.signal).sort()) + ' vs ' + JSON.stringify(seedB.flagged.slice().sort()));
  ok('the unprovable grades are DROPPED, not guessed onto the wrong probe',
    graded5.every(c => r5.cards[c.id] === 2) && r5.done === seedB.flagged.length,
    'done=' + (r5 && r5.done) + ' expected=' + seedB.flagged.length);
  ok('the two probes the record never saw stay ungraded',
    seedB.shifted.every(s => { const c = bank5.find(x => x.signal === s); return !c || r5.cards[c.id] === undefined; }),
    'shifted-in probes: ' + JSON.stringify(seedB.shifted));

  /* ============ 6. the whiteboard, same bug class ============ */
  await fresh();
  await page.evaluate(() => switchTab('wb'));
  await page.waitForTimeout(200);
  const nSteps = await RUN_WB(page, 3);
  await page.waitForTimeout(80);
  const wb0 = await WB_BANK(page, TOPIC);
  const w1 = (await REC(page, TOPIC)).w;

  ok('whiteboard stores every step under a content id',
    !!w1 && w1.cv === 2 && w1.total === nSteps && Object.keys(w1.steps).length === nSteps,
    JSON.stringify(w1 && { cv: w1.cv, total: w1.total, n: Object.keys(w1.steps).length }));

  /* Same discipline as the drill: the reference is the step's CUE (author content),
     never its id -- otherwise a positional keying would launder itself through it. */
  const wantWb = {};                     /* cue -> level */
  wb0.forEach(s => { wantWb[s.cue] = w1.steps[s.id]; });
  const wbInserted = (cue) => /^Inserted step /.test(cue);

  const wmut = await MUTATE_WB(page, TOPIC);
  const rp6 = await REPUBLISH(page, TOPIC);
  /* The board must ACTUALLY be repainted to the new spine before we grade on it --
     grading a stale board would test nothing and pass. */
  ok('the whiteboard really re-rendered the NEW spine',
    rp6.wbDom === wmut.size && rp6.wbSteps === wmut.size && rp6.regSteps === wmut.size,
    'dom=' + rp6.wbDom + ' stats=' + rp6.wbSteps + ' registry=' + rp6.regSteps + ' expected=' + wmut.size);
  await page.evaluate(() => switchTab('wb'));
  await page.waitForTimeout(200);
  const gw = await GRADE_WB(page, 1, true);           /* re-grade one step on the new board */
  await page.waitForTimeout(60);
  const w2 = (await REC(page, TOPIC)).w;
  const wb2 = await WB_BANK(page, TOPIC);
  const gwCue = (wb2.find(s => s.id === gw) || {}).cue;

  ok('the spine really was reordered AND grown', wmut.size === nSteps + 2,
    'was ' + nSteps + ' now ' + wmut.size);

  const wbWrong = [];
  wb2.forEach(s => {
    if (wbInserted(s.cue)) return;
    const expect = (s.cue === gwCue) ? 1 : wantWb[s.cue];
    if (w2.steps[s.id] !== expect) wbWrong.push(s.cue + ': expected ' + expect + ' got ' + w2.steps[s.id]);
  });
  ok('REORDER + INSERT: every whiteboard grade still lands on its ORIGINAL step',
    wbWrong.length === 0, wbWrong.length + ' mis-attributed | ' + wbWrong.slice(0, 3).join(' | '));
  const wbLeak = wb2.filter(s => wbInserted(s.cue) && s.cue !== gwCue && w2.steps[s.id] !== undefined);
  ok('the inserted steps did NOT inherit a shifted grade', wbLeak.length === 0,
    JSON.stringify(wbLeak.map(s => s.cue)));
  ok('whiteboard total tracks the NEW spine', w2.total === wmut.size,
    'total=' + w2.total + ' spine=' + wmut.size);

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('CARD IDENTITY: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
