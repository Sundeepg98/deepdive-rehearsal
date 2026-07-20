#!/usr/bin/env node
/*
 * RESUMED-DRILL SCOREBOARD HONESTY (audit #22, direction D4-correctness slice).
 *
 * THE BUG: the drill scoreboard tiles (Solid / Revisit / Left) count THIS RUN's grading -- got/shk
 * are live working-set counters (the debrief's own pct = got / results.length depends on that, and
 * so does the round-end announcement). On RESUME, the cursor is restored (you land on probe 4) but
 * got/shk start at 0 for the fresh page-load, so the board reads "0 Solid / 0 Revisit" while the
 * dock, the pip and the session panel all correctly say "3 of 21 graded" -- intact data reading as
 * lost, at exactly the moment a returning user is orienting.
 *
 * THE FIX (chosen: RELABEL, not seed-from-record): the tiles ARE this-run counters, so seeding them
 * from the canonical record would corrupt the debrief denominator and the round-end message from the
 * other side. Instead, a "This run" caption scopes the board honestly, so the 0/0 reads as "nothing
 * graded THIS load yet" and the record's 3 (shown elsewhere) is understood as a different, larger
 * count -- two honest numbers, not a contradiction.
 *
 * Watched RED against the pre-fix build: the .score-cap caption is absent.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/scoreboard_resume.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

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

  await B.gotoApp(page, HTML, { hash: '#walk' });
  await page.evaluate(() => localStorage.clear());
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  const topicId = await page.evaluate(() => TopicRegistry.current().id);

  /* grade THREE probes (Solid, Shaky, Solid) on the drill, then flush the resume cursor */
  await page.evaluate((t) => switchTab(t), 'drill');
  await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.getElementById('adv'); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await page.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms));
    const grades = ['jg', 'js', 'jg'];   /* Solid, Shaky, Solid */
    for (let n = 0; n < grades.length; n++) {
      let g = 0; while (r.getElementById('adv') && g++ < 20) { r.getElementById('adv').click(); await s(4); }   /* reveal to the judge row */
      const b = r.getElementById(grades[n]); if (b) b.click(); await s(40);
    }
    /* flush the throttled pos.<id> cursor so the reload resumes at probe 4, not probe 1 */
    if (typeof posFlush === 'function') posFlush();
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await B.settle(page);

  /* the canonical record BEFORE reload -- 3 graded */
  const recBefore = await page.evaluate((id) => (typeof Progress !== 'undefined' && Progress.get) ? Progress.get(id) : null, topicId);
  ok('pre-reload: the canonical record holds 3 graded', !!recBefore && recBefore.done === 3, JSON.stringify(recBefore));

  /* RELOAD -> resume. A REAL page.reload() (not a hash-only goto, which is same-document and would
     leave the drill's live got/shk in memory) re-inits the JS: the drill starts fresh (got/shk 0)
     and renderTopic restores the cursor from pos.<id>. The current hash is already #<topic>/drill
     (switchTab set it), so the reload deep-links straight back onto this topic's drill. */
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
  await B.enterApp(page);
  await page.evaluate((t) => switchTab(t), 'drill');
  await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.getElementById('sGot'); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await B.settle(page);

  const resumed = await page.evaluate((id) => {
    const d = document.querySelector('#drill deep-drill'), r = d && d.shadowRoot;
    const cap = r ? r.querySelector('.score-cap') : null;
    const stats = (d && d.getStats) ? d.getStats() : null;
    const rec = (typeof Progress !== 'undefined' && Progress.get) ? Progress.get(id) : null;
    return {
      sGot: r && r.getElementById('sGot') ? r.getElementById('sGot').textContent.trim() : null,
      sShk: r && r.getElementById('sShk') ? r.getElementById('sShk').textContent.trim() : null,
      di: stats ? (stats.dTot - (r && r.getElementById('sLeft') ? +r.getElementById('sLeft').textContent : 0)) : null,
      liveDone: stats ? stats.dDone : null,          /* this run's answered = results.length */
      capText: cap ? cap.textContent.trim() : null,
      recDone: rec ? rec.done : null,
    };
  }, topicId);

  ok('resume: the drill cursor is restored past probe 1 (a genuine resume)', resumed.liveDone === 0 && resumed.recDone === 3, JSON.stringify(resumed));
  ok('resume: this-run tiles read 0 Solid / 0 Revisit (they ARE this-run counters)', resumed.sGot === '0' && resumed.sShk === '0', JSON.stringify(resumed));
  ok('resume: the record still holds 3 graded (data intact, not lost)', resumed.recDone === 3, JSON.stringify(resumed));
  ok('the scoreboard is scoped "This run" so 0/0 is honest, not a contradiction with the record', /this run/i.test(resumed.capText || ''), JSON.stringify(resumed));

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('SCOREBOARD RESUME: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
