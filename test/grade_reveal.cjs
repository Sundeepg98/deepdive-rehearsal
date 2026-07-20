#!/usr/bin/env node
/*
 * GRADE AT THE REVEAL MOMENT (audit #4, direction D2) -- the self-grade must be unmissable-by-
 * ignorance for a cold first-timer. The judge row (Missed/Shaky/Solid) used to render ONLY at the
 * full judgment point (stage >= maxStage) -- i.e. after clicking through the ENTIRE follow-up chain,
 * and every probe here carries 2-3 follow-ups -- so a first-timer who revealed the answer and moved
 * on never saw the grade at all, silently forfeiting the spaced-repetition spine the whole app is
 * built on. The fix renders the in-pane judge row the instant the answer is on screen (stage >= 1),
 * with "Interviewer pushes further" kept above it as the optional deepen path.
 *
 * Every assertion drives a REAL reveal and reads REAL geometry (a hit-test at the Solid button's
 * painted centre, across the drill's shadow boundary); the functional check GRADES with a real
 * page.mouse.click -- never el.click(), which reports success on a button that is not there.
 *
 * It covers the four ratified conditions (team-lead, 2026-07-20):
 *   - the row is present at reveal AND remains present all the way to maxStage (grade at any depth);
 *   - "push further" is STILL offered at reveal, so stage 1 is genuinely pre-judgment (a card WITH
 *     follow-ups), not a zero-follow-up card that trivially shows the row;
 *   - a reveal-grade is a first-class grade: it records under the probe's CONTENT id, and a later
 *     re-grade of the same probe (via re-drill) overwrites it -- latest wins, ONE entry (the existing
 *     merge-by-content-id semantics, exercised through a reveal-grade);
 *   - the DOCK stays quiet at reveal and arms only at maxStage (the deliberate, load-bearing in-pane-
 *     vs-dock divergence: _judgeOn is untouched, so anyone who later re-arms the dock at reveal turns
 *     this red), plus a live PLANT (hide the row -> the hit-test must stop finding it).
 *
 * Watched RED against the pre-fix deliverable: at the reveal stage #jm/#js/#jg do not exist, so
 * presence, reachability, the real-click grade, the maxStage-persistence and the merge all fail.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/grade_reveal.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* Read the reveal-stage state in one shot. Reachability is a TWO-SIDED hit-test across the shadow
   boundary: document.elementFromPoint must return the drill host (nothing in the light DOM -- e.g.
   the fixed mock bar or an overlay -- covers the point), AND shadowRoot.elementFromPoint must return
   the Solid button (nothing inside the drill covers it). Either alone can silently pass. */
const REVEAL = () => {
  const host = document.querySelector('#drill deep-drill'), r = host && host.shadowRoot;
  if (!r) return { ready: false };
  const jg = r.getElementById('jg'), adv = r.getElementById('adv');
  let reachable = false;
  if (jg) {
    const rect = jg.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2), cy = Math.round(rect.top + rect.height / 2);
    const lightHit = document.elementFromPoint(cx, cy);
    const shadowHit = r.elementFromPoint(cx, cy);
    const drill = document.getElementById('drill');
    reachable = !!(rect.width && rect.height) &&
      !!lightHit && !!drill && drill.contains(lightHit) &&
      !!shadowHit && (shadowHit === jg || jg.contains(shadowHit));
  }
  return {
    ready: true,
    advExists: !!adv,                              /* push-further still offered => pre-judgment */
    jm: !!r.getElementById('jm'), js: !!r.getElementById('js'), jg: !!jg,
    reachable,
  };
};

/* The dock's (#ndock) armed grade legend -- ".nd-armed" is the "Grade 1 Missed 2 Shaky 3 Solid"
   swap. It must be ABSENT mid-read and PRESENT at the judgment point: the fix leaves _judgeOn (which
   governs the dock alone) maxStage-gated on purpose. */
const DOCK = () => {
  const d = document.getElementById('ndock');
  return d ? { exists: true, armed: !!d.querySelector('.nd-armed') } : { exists: false };
};

/* the Solid/Missed button's painted-centre viewport coords, for a real trusted click (assumes scrollJudge ran) */
const BTN_BOX = (id) => {
  const r = document.querySelector('#drill deep-drill').shadowRoot, b = r && r.getElementById(id);
  if (!b) return null;
  const rect = b.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/* A GUARANTEED fresh session: clear storage, then page.reload() -- which re-runs the JS. A same-file
   hash goto is a SAME-DOCUMENT navigation that keeps the drill's live state (e.g. a prior re-drill's
   debrief) in memory -- the exact trap scoreboard_resume documents -- so between sections we reload. */
async function freshSession(page) {
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} }).catch(() => {});
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
  await B.enterApp(page);
}

async function toDrillReveal(page) {
  await page.evaluate((t) => switchTab(t), 'drill');
  await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.getElementById('adv'); }, null, { timeout: B.ACT_MS }).catch(() => {});
  /* reveal ONCE: stage 0 ("Reveal answer") -> stage 1 (answer on screen, follow-ups still remain) */
  await page.evaluate(() => { const a = document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
  /* The reveal is COMPLETE when the grade row has rendered. Wait for it so downstream geometry reads
     and the real click never race a slow reveal render under gate load (caught: the merge section
     flaked when #jm had not yet painted). Non-throwing: on the pre-fix build the row never appears
     here, so this times out and the assertions below read it absent -- still RED, just slower. */
  await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.getElementById('jg'); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
}

/* Bring a drill-shadow element into view, then SETTLE, before any geometry read. scrollIntoView's
   default behavior animates (async), so a synchronous rect read in the same tick sees the pre-scroll
   position -- on a 360px viewport the reveal-stage row sits ~1200px down and never entered frame.
   behavior:'instant' scrolls synchronously; the settle then guarantees layout/paint before hit-test. */
async function scrollTo(page, id) {
  await page.evaluate((i) => { const b = document.querySelector('#drill deep-drill').shadowRoot.getElementById(i); if (b) b.scrollIntoView({ block: 'center', behavior: 'instant' }); }, id);
  await B.settle(page);
}

/* The Solid button's two-sided reachability, re-asserting the scroll each read. A SINGLE post-scroll
   sample is a knife-edge under load (the scroll/layout can lag the settle), which is how this flaked
   once at [360]; polling turns it into "keep looking until it really is reachable, fail only if it
   never is" -- the _boot.cjs pollFor discipline. */
function reachProbe(page) {
  return page.evaluate(() => {
    const host = document.querySelector('#drill deep-drill'), r = host && host.shadowRoot, jg = r && r.getElementById('jg');
    if (!jg) return { reachable: false, why: 'no jg' };
    jg.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = jg.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width / 2), cy = Math.round(rect.top + rect.height / 2);
    const lightHit = document.elementFromPoint(cx, cy), shadowHit = r.elementFromPoint(cx, cy), drill = document.getElementById('drill');
    const reachable = !!(rect.width && rect.height) && !!lightHit && !!drill && drill.contains(lightHit) && !!shadowHit && (shadowHit === jg || jg.contains(shadowHit));
    return { reachable, top: Math.round(rect.top), cy, light: lightHit && lightHit.tagName, shadow: shadowHit && (shadowHit.id || shadowHit.tagName) };
  });
}
async function assertReachable(page, ok, label) {
  try {
    await B.pollFor(() => reachProbe(page), (s) => s.reachable === true, B.ACT_MS, label);
    ok(label, true);
  } catch (e) { ok(label, false, JSON.stringify(e.last || {})); }
}

const REC = (page, tid) => page.evaluate((t) => { const p = localStorage.getItem('ddr.v1.progress.' + t); return p ? JSON.parse(p) : null; }, tid);

(async () => {
  const fails = [], errs = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  /* ================= DESKTOP (1280x900), fresh session ================= */
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await freshSession(page);
  const topicId = await page.evaluate(() => TopicRegistry.current().id);
  await toDrillReveal(page);
  await scrollTo(page, 'jg');

  const rev = await page.evaluate(REVEAL);
  ok('reveal: "Interviewer pushes further" is still offered (stage 1 is pre-judgment; this card has follow-ups)', rev.ready && rev.advExists === true, JSON.stringify(rev));
  ok('reveal: the in-pane grade row (Missed/Shaky/Solid) is present the moment the answer is shown', rev.ready && rev.jm && rev.js && rev.jg, JSON.stringify(rev));
  await assertReachable(page, ok, 'reveal: the Solid button is reachable by a real two-sided hit-test at its painted centre');

  /* CONDITION 3 -- the dock stays QUIET at reveal (the in-pane row is the discoverable surface; the
     dock's armed legend is deliberately maxStage-gated and UNTOUCHED). Load-bearing boundary guard:
     if anyone re-arms the dock at reveal (touches _judgeOn/atJudgment), this goes red. */
  const dockReveal = await page.evaluate(DOCK);
  ok('reveal: the DOCK legend stays quiet -- no armed grade keys mid-read (the in-pane-vs-dock divergence is intact)', dockReveal.exists && dockReveal.armed === false, JSON.stringify(dockReveal));

  /* LIVE PLANT: hide the judge row -> the shadow hit-test must stop finding the button. Proves the
     reachability assertion above is not one that cannot fail. */
  const planted = await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot, judge = r.querySelector('.judge'), jg = r.getElementById('jg');
    if (!judge || !jg) return { ran: false };
    const rect = jg.getBoundingClientRect(), cx = Math.round(rect.left + rect.width / 2), cy = Math.round(rect.top + rect.height / 2);
    const prev = judge.style.display; judge.style.display = 'none';
    const shadowHit = r.elementFromPoint(cx, cy);
    judge.style.display = prev;
    return { ran: true, reachableWhenHidden: !!shadowHit && (shadowHit === jg || jg.contains(shadowHit)) };
  });
  ok('[plant] hiding the grade row makes the Solid button unreachable (the reachability check can go red)', planted.ran && planted.reachableWhenHidden === false, JSON.stringify(planted));

  /* CONDITION 1a + 3b -- push the SAME card all the way to maxStage: the grade row is STILL present
     (you can grade at any depth, incl. the judgment point), and the dock arms EXACTLY there. Together
     with the reveal assertions this pins the deliberate divergence: row from reveal onward, dock at
     maxStage only. */
  await page.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot; let g = 0; while (r.getElementById('adv') && g++ < 12) r.getElementById('adv').click(); });
  await B.settle(page);
  const maxState = await page.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot; return { adv: !!r.getElementById('adv'), jm: !!r.getElementById('jm'), js: !!r.getElementById('js'), jg: !!r.getElementById('jg') }; });
  const dockMax = await page.evaluate(DOCK);
  ok('maxStage: the grade row is STILL present (the row persists through the deepen path to the judgment point)', maxState.adv === false && maxState.jm && maxState.js && maxState.jg, JSON.stringify(maxState));
  ok('maxStage: the DOCK now arms (the divergence is real and maxStage-gated, not broken)', dockMax.exists && dockMax.armed === true, JSON.stringify(dockMax));

  /* ============= CONDITION 1b -- a reveal-grade is a first-class grade that MERGES by content id =============
     Fresh run. Grade the first probe MISSED with a REAL click AT THE REVEAL MOMENT (record 0 -> 1;
     this is also the functional "the reveal grade actually records" proof). Then re-drill that same
     probe, push through the follow-ups, and re-grade it SOLID. The record must hold the SECOND grade
     for that probe's content id, ONCE -- latest wins, no duplicate. */
  await freshSession(page);
  await toDrillReveal(page);
  const id0 = await page.evaluate(() => { const d = document.querySelector('#drill deep-drill'); const card = cards[d.di]; return CardId.forCards(_allCards)[_allCards.indexOf(card)]; });
  await scrollTo(page, 'jm');
  const missBox = await page.evaluate(BTN_BOX, 'jm');
  if (missBox) {
    await page.mouse.click(missBox.x, missBox.y);
    /* poll the record until the grade lands -- the drillgraded snapshot can lag the click under load */
    await page.waitForFunction((a) => { const p = localStorage.getItem('ddr.v1.progress.' + a.t); if (!p) return false; const r = JSON.parse(p); return !!(r.cards && r.cards[a.id] === 1); }, { t: topicId, id: id0 }, { timeout: B.ACT_MS }).catch(() => {});
  }
  const recMiss = await REC(page, topicId);
  ok('reveal: a real click on Missed at the reveal moment records the grade (level 1) under the probe content id', !!missBox && !!recMiss && recMiss.cards[id0] === 1 && recMiss.done === 1, JSON.stringify({ hadButton: !!missBox, level: recMiss && recMiss.cards[id0], done: recMiss && recMiss.done }));

  /* re-drill JUST that probe (bank index 0), push through its follow-ups, re-grade SOLID */
  await page.evaluate(() => document.querySelector('#drill deep-drill').drillBank([0]));
  await page.waitForFunction(() => { const r = document.querySelector('#drill deep-drill').shadowRoot; return r && r.getElementById('adv'); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await page.evaluate(async () => { const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms)); let g = 0; while (r.getElementById('adv') && g++ < 12) { r.getElementById('adv').click(); await s(3); } const jg = r.getElementById('jg'); if (jg) jg.click(); await s(40); });
  /* poll until the re-grade overwrites (level 3) -- same async-snapshot robustness as above */
  await page.waitForFunction((a) => { const p = localStorage.getItem('ddr.v1.progress.' + a.t); if (!p) return false; const r = JSON.parse(p); return !!(r.cards && r.cards[a.id] === 3); }, { t: topicId, id: id0 }, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);
  const recSolid = await REC(page, topicId);
  ok('merge: re-grading the same probe (via re-drill) overwrites -- record holds the SECOND grade (Solid, level 3)', !!recSolid && recSolid.cards[id0] === 3, JSON.stringify({ level: recSolid && recSolid.cards[id0] }));
  ok('merge: the re-grade is ONE entry, not a duplicate (done stays 1 -- same content id)', !!recSolid && recSolid.done === 1 && Object.keys(recSolid.cards).length === 1, JSON.stringify({ done: recSolid && recSolid.done, keys: recSolid && Object.keys(recSolid.cards).length }));

  /* ================= MOBILE (360x800) -- the in-pane row helps the phone too ================= */
  await page.setViewportSize({ width: 360, height: 800 });
  await freshSession(page);
  await toDrillReveal(page);
  await scrollTo(page, 'jg');
  const revM = await page.evaluate(REVEAL);
  ok('[360] reveal: the in-pane grade row is present the moment the answer is shown', revM.ready && revM.jm && revM.js && revM.jg, JSON.stringify(revM));
  await assertReachable(page, ok, '[360] reveal: the Solid button is reachable by a real hit-test (nothing covers it)');

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('GRADE REVEAL: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
