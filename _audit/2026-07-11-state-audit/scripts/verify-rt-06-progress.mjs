/* VERIFY Finding 2 (P1 data-loss): does completing a full 22-probe drill and then
   clicking the app's OWN "Drill my N flagged probes" button (#revdrill ->
   drillRevset()) destroy the saved score AND the revisit pile?
   Mechanism under test:
     drill/logic.js:479 getStats() -> dTot: cards.length   (LIVE FILTERED global)
     drill/logic.js:377 drillRevset() -> cards = subset; results = []
     progress.js:45     snapshot() -> Store.set(pkey, {...}) UNCONDITIONAL REPLACE
   Also re-check Finding 5 (in-flight drill position lost on reload). */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(700);

const TOPIC = 'content-pipeline';
await p.evaluate((t) => { if (TopicRegistry.current().id !== t) TopicRegistry.setTopic(t); }, TOPIC);
await p.evaluate(() => { if (window.ViewManager && ViewManager.show) ViewManager.show('drill'); });
await p.waitForTimeout(500);

const store = () => p.evaluate((t) => {
  const raw = localStorage.getItem('ddr.v1.progress.' + t);
  return { raw: raw ? JSON.parse(raw) : null, status: Progress.status(t) };
}, TOPIC);

const drillState = () => p.evaluate(() => {
  const d = document.querySelector('#drill deep-drill');
  const s = d.getStats();
  return { di: d.di, got: d.got, shk: d.shk, results: d.results.length, cardsLen: cards.length, allLen: _allCards.length, stats: s };
});

// Grade every probe in the CURRENT working set. shakyEvery=n -> every nth probe Shaky.
const runAll = async (shakyEvery) => {
  for (let n = 0; n < 40; n++) {
    const done = await p.evaluate(() => {
      const d = document.querySelector('#drill deep-drill');
      return d.di >= cards.length;
    });
    if (done) break;
    // click #adv until the grade buttons exist
    for (let k = 0; k < 6; k++) {
      const has = await p.evaluate(() => {
        const r = document.querySelector('#drill deep-drill').shadowRoot;
        return !!r.getElementById('jg');
      });
      if (has) break;
      await p.evaluate(() => {
        const r = document.querySelector('#drill deep-drill').shadowRoot;
        const a = r.getElementById('adv'); if (a) a.click();
      });
      await p.waitForTimeout(60);
    }
    await p.evaluate((se) => {
      const d = document.querySelector('#drill deep-drill');
      const r = d.shadowRoot;
      const shaky = se > 0 && (d.di % se === se - 1);
      const btn = r.getElementById(shaky ? 'js' : 'jg');
      if (btn) btn.click();
    }, shakyEvery);
    await p.waitForTimeout(70);
  }
};

// ---- PHASE 1: complete the FULL 22-probe round, every 7th probe Shaky ----
await runAll(7);
await p.waitForTimeout(300);
const afterFull = await store();
const stateFull = await drillState();
await p.screenshot({ path: SHOT + 'progress-01-full-run-complete.png' });

// what does the HOME / index overlay say?
const homeBefore = await p.evaluate(() => {
  const s = Progress.summary();
  return { totDone: s.totDone, totTot: s.totTot, overallPct: s.overallPct, touched: s.touched,
           weakest: s.weakest.slice(0, 3).map(w => w.id + '(' + w.shk + ')') };
});

// ---- PHASE 2: click the app's OWN recommendation: #revdrill ----
const revBtn = await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const box = r.getElementById('revset');
  const btn = r.getElementById('revdrill');
  return { boxVisible: box ? box.style.display !== 'none' : false,
           label: btn ? btn.textContent.replace(/\s+/g, ' ').trim() : null };
});
await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  r.getElementById('revdrill').click();
});
await p.waitForTimeout(400);
const afterRevClick = await drillState();
const storeAfterClick = await store();   // NOT yet graded — store should still be intact
await p.screenshot({ path: SHOT + 'progress-02-revdrill-clicked.png' });

// ---- PHASE 3: grade exactly ONE probe ----
for (let k = 0; k < 6; k++) {
  const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg'));
  if (has) break;
  await p.evaluate(() => { const a = document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
  await p.waitForTimeout(60);
}
await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg').click());
await p.waitForTimeout(400);
const afterOneGrade = await store();
await p.screenshot({ path: SHOT + 'progress-03-after-one-grade.png' });

const homeAfter = await p.evaluate(() => {
  const s = Progress.summary();
  return { totDone: s.totDone, totTot: s.totTot, overallPct: s.overallPct, touched: s.touched,
           weakest: s.weakest.slice(0, 3).map(w => w.id + '(' + w.shk + ')') };
});

console.log('=== PHASE 1: full 22-probe round complete ===');
console.log('  live drill :', JSON.stringify(stateFull.stats));
console.log('  STORE      :', JSON.stringify(afterFull.raw));
console.log('  status     :', afterFull.status);
console.log('  HOME       :', JSON.stringify(homeBefore));

console.log('\n=== PHASE 2: the app RECOMMENDS this button ===');
console.log('  revset visible:', revBtn.boxVisible);
console.log('  button label  : "' + revBtn.label + '"');
console.log('  after click -> cards.length =', afterRevClick.cardsLen, '(_allCards =', afterRevClick.allLen + ')');
console.log('  after click -> results =', afterRevClick.results, 'di =', afterRevClick.di);
console.log('  STORE (not yet graded):', JSON.stringify(storeAfterClick.raw));

console.log('\n=== PHASE 3: grade ONE probe -> snapshot() fires ===');
console.log('  STORE  :', JSON.stringify(afterOneGrade.raw));
console.log('  status :', afterOneGrade.status);
console.log('  HOME   :', JSON.stringify(homeAfter));

const bfr = afterFull.raw, aft = afterOneGrade.raw;
console.log('\n=== VERDICT ===');
console.log('  tot     :', bfr.tot, '->', aft.tot, bfr.tot !== aft.tot ? '*** CORRUPTED ***' : 'ok');
console.log('  done    :', bfr.done, '->', aft.done, aft.done < bfr.done ? '*** REGRESSED ***' : 'ok');
console.log('  got     :', bfr.got, '->', aft.got);
console.log('  revisit :', JSON.stringify(bfr.revisit), '->', JSON.stringify(aft.revisit),
            (bfr.revisit.length && !aft.revisit.length) ? '*** WIPED ***' : '');
console.log('  status  :', afterFull.status, '->', afterOneGrade.status);

// ---- Finding 5: in-flight position on reload ----
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(700);
await p.evaluate((t) => { if (TopicRegistry.current().id !== t) TopicRegistry.setTopic(t); }, TOPIC);
await p.evaluate(() => { if (window.ViewManager && ViewManager.show) ViewManager.show('drill'); });
await p.waitForTimeout(400);
for (let i = 0; i < 3; i++) {
  for (let k = 0; k < 6; k++) {
    const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg'));
    if (has) break;
    await p.evaluate(() => { const a = document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
    await p.waitForTimeout(60);
  }
  await p.evaluate((i) => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    (r.getElementById(i === 0 ? 'jg' : 'js')).click();
  }, i);
  await p.waitForTimeout(80);
}
const preReload = { store: (await store()).raw, live: await drillState() };
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => { if (window.ViewManager && ViewManager.show) ViewManager.show('drill'); });
await p.waitForTimeout(400);
const postReload = { store: (await store()).raw, live: await drillState() };
await p.screenshot({ path: SHOT + 'progress-04-after-reload.png' });
console.log('\n=== FINDING 5: reload ===');
console.log('  PRE  store:', JSON.stringify(preReload.store));
console.log('  PRE  live :', 'di=' + preReload.live.di, 'got=' + preReload.live.got, 'shk=' + preReload.live.shk, 'results=' + preReload.live.results);
console.log('  POST store:', JSON.stringify(postReload.store), '<- survived?', postReload.store ? 'YES' : 'NO');
console.log('  POST live :', 'di=' + postReload.live.di, 'got=' + postReload.live.got, 'shk=' + postReload.live.shk, 'results=' + postReload.live.results,
            postReload.live.di === 0 ? '<- restarted at probe 1' : '<- restored');

console.log('\nPAGE ERRORS:', errs.length, errs.slice(0, 3));
await b.close();
