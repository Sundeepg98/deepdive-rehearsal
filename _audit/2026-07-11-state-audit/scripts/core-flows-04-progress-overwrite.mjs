/* LENS: core flows — does a NEW drill run destroy the PREVIOUS run's saved score + revisit pile? */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen()) IndexOverlay.close(); });
await p.waitForTimeout(300);
await p.click('.seg button[data-tab="drill"]');
await p.waitForTimeout(500);

// Grade N probes using the REAL shadow-DOM buttons (same handlers a user hits).
// gradeFn(i) -> 'jg' | 'js' | 'jm'
async function gradeN(n, gradeFn) {
  for (let i = 0; i < n; i++) {
    let k = 0;
    while (k < 8) {
      const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'));
      if (!has) break;
      await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv').click());
      await p.waitForTimeout(45); k++;
    }
    const btn = gradeFn(i);
    const ok = await p.evaluate((id) => { const e = document.querySelector('#drill deep-drill').shadowRoot.getElementById(id); if (!e) return false; e.click(); return true; }, btn);
    if (!ok) { console.log(`   (no grade button at probe ${i + 1} — run already finished)`); break; }
    await p.waitForTimeout(60);
  }
}
const snap = async () => await p.evaluate(() => ({
  store: Progress.get('content-pipeline'),
  status: Progress.status('content-pipeline'),
  summary: (() => { const s = Progress.summary(); return { totDone: s.totDone, totTot: s.totTot, totWeak: s.totWeak, overallPct: s.overallPct, startedTopics: s.startedTopics, weakest: s.weakest.slice(0, 3) }; })(),
}));

console.log('########## RUN 1: a COMPLETE 22/22 drill (18 solid, 4 flagged Revisit) ##########');
await gradeN(22, (i) => (i % 6 === 5 ? 'js' : 'jg'));   // every 6th = shaky
await p.waitForTimeout(400);
const s1 = await snap();
console.log('  Store after a COMPLETE run:', JSON.stringify(s1.store));
console.log('  Progress.status:', s1.status);
console.log('  Rollup:', JSON.stringify(s1.summary));
await p.screenshot({ path: `${SHOTS}/overwrite-01-complete-run.png` });

console.log('\n  --- Home / index badge for this topic after the complete run:');
await p.evaluate(() => IndexOverlay.open());
await p.waitForTimeout(700);
const home1 = await p.evaluate(() => {
  const ov = document.getElementById('_index-overlay');
  const weakBtns = [...ov.querySelectorAll('.ix-weak-b')].map(b => b.textContent.trim());
  const concepts = [...ov.querySelectorAll('.ix-wc')].map(b => b.textContent.trim());
  const prog = (ov.querySelector('.ix-home-v') || {}).textContent;
  const card = [...ov.querySelectorAll('.ix-card')].find(c => (c.getAttribute('data-topic') || '') === 'content-pipeline');
  return { weakBtns, concepts, prog, cardTxt: card ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : null };
});
console.log('  home "Your progress":', home1.prog);
console.log('  home Revisit chips :', JSON.stringify(home1.weakBtns));
console.log('  home weak concepts :', JSON.stringify(home1.concepts));
console.log('  content-pipeline card:', home1.cardTxt);
await p.screenshot({ path: `${SHOTS}/overwrite-02-home-after-complete.png` });
await p.evaluate(() => IndexOverlay.close());
await p.waitForTimeout(400);

console.log('\n########## RUN 2: user comes back and grades ONE probe (a fresh run) ##########');
// restart the run exactly like a user would: press the Study mode button (the "run again" path)
await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('#modetog button[data-m="study"]').click());
await p.waitForTimeout(300);
console.log('  (restarted the drill via the Study mode button — Store untouched so far:', JSON.stringify((await snap()).store), ')');
await gradeN(1, () => 'jg');
await p.waitForTimeout(400);
const s2 = await snap();
console.log('\n  Store after grading just ONE probe in the new run:');
console.log('    ', JSON.stringify(s2.store));
console.log('  Progress.status:', s2.status, '  (was: ' + s1.status + ')');
console.log('  Rollup:', JSON.stringify(s2.summary));
await p.screenshot({ path: `${SHOTS}/overwrite-03-after-one-grade.png` });

console.log('\n  === DELTA ===');
console.log('    done   : ' + s1.store.done + ' -> ' + s2.store.done);
console.log('    got    : ' + s1.store.got + ' -> ' + s2.store.got);
console.log('    shk    : ' + s1.store.shk + ' -> ' + s2.store.shk);
console.log('    revisit: ' + JSON.stringify(s1.store.revisit) + '\n           -> ' + JSON.stringify(s2.store.revisit));
console.log('    status : ' + s1.status + ' -> ' + s2.status);
const lost = s1.store.revisit.length > 0 && s2.store.revisit.length === 0;
console.log('\n  >>> PREVIOUS RUN\'S REVISIT PILE DESTROYED BY ONE GRADE? ' + (lost ? '*** YES — DATA LOSS ***' : 'no'));
console.log('  >>> COMPLETED RUN (' + s1.store.done + '/' + s1.store.tot + ') COLLAPSED TO ' + s2.store.done + '/' + s2.store.tot + '? ' + (s2.store.done < s1.store.done ? '*** YES ***' : 'no'));

console.log('\n  --- Home / index after the single grade:');
await p.evaluate(() => IndexOverlay.open());
await p.waitForTimeout(700);
const home2 = await p.evaluate(() => {
  const ov = document.getElementById('_index-overlay');
  return {
    weakBtns: [...ov.querySelectorAll('.ix-weak-b')].map(b => b.textContent.trim()),
    concepts: [...ov.querySelectorAll('.ix-wc')].map(b => b.textContent.trim()),
    prog: (ov.querySelector('.ix-home-v') || {}).textContent,
  };
});
console.log('  home "Your progress":', home2.prog, '   (was: ' + home1.prog + ')');
console.log('  home Revisit chips :', JSON.stringify(home2.weakBtns), '  (was: ' + JSON.stringify(home1.weakBtns) + ')');
console.log('  home weak concepts :', JSON.stringify(home2.concepts), '  (was: ' + JSON.stringify(home1.concepts) + ')');
await p.screenshot({ path: `${SHOTS}/overwrite-04-home-after-one-grade.png` });

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
