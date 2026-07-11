/* LENS: core flows — WHICH user actions corrupt the persisted per-topic record?
   Root cause candidate: progress.js snapshot() persists the LIVE (possibly filtered /
   partial) working set as the topic's canonical record on every grade. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();

async function fresh() {
  const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
  p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  await p.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen()) IndexOverlay.close(); });
  await p.waitForTimeout(250);
  await p.click('.seg button[data-tab="drill"]');
  await p.waitForTimeout(400);
  return p;
}
async function gradeN(p, n, fn) {
  for (let i = 0; i < n; i++) {
    let k = 0;
    while (k < 8) {
      const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'));
      if (!has) break;
      await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv').click());
      await p.waitForTimeout(40); k++;
    }
    const ok = await p.evaluate((id) => { const e = document.querySelector('#drill deep-drill').shadowRoot.getElementById(id); if (!e) return false; e.click(); return true; }, fn(i));
    if (!ok) break;
    await p.waitForTimeout(50);
  }
}
const store = async (p) => await p.evaluate(() => ({ s: Progress.get('content-pipeline'), st: Progress.status('content-pipeline') }));

for (const CASE of ['revisit-redrill', 'tier-filter', 'quick5']) {
  const p = await fresh();
  console.log(`\n\n############### CASE: ${CASE} ###############`);
  console.log('  step 1 — complete a full 22/22 run (some flagged Revisit)');
  await gradeN(p, 22, (i) => (i % 6 === 5 ? 'js' : 'jg'));
  await p.waitForTimeout(300);
  const before = await store(p);
  console.log('    Store:', JSON.stringify(before.s), 'status=' + before.st);

  if (CASE === 'revisit-redrill') {
    console.log("\n  step 2 — the APP'S OWN RECOMMENDED ACTION: click the 'Drill my N flagged probes' button");
    const btnTxt = await p.evaluate(() => {
      const r = document.querySelector('#drill deep-drill').shadowRoot;
      const w = r.getElementById('dweak');  // on the debrief
      if (w) { const t = w.textContent.trim(); w.click(); return t; }
      const rv = r.getElementById('revdrill');
      if (rv) { const t = rv.textContent.trim(); rv.click(); return t; }
      return '(button not found)';
    });
    console.log('    clicked:', JSON.stringify(btnTxt));
    await p.waitForTimeout(400);
    console.log('    Store immediately after the click (no grade yet):', JSON.stringify((await store(p)).s));
    console.log('\n  step 3 — grade the FIRST flagged probe Solid');
    await gradeN(p, 1, () => 'jg');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/overwrite-05-revisit-redrill.png` });
  } else if (CASE === 'tier-filter') {
    console.log("\n  step 2 — user clicks the 'SDE2' tier filter (focus by level)");
    await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('#tiertog button[data-tier="SDE2"]').click());
    await p.waitForTimeout(350);
    const n = await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('.qk').textContent);
    console.log('    drill now shows:', n);
    console.log('\n  step 3 — grade one SDE2 probe Solid');
    await gradeN(p, 1, () => 'jg');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/overwrite-06-tier-filter.png` });
  } else if (CASE === 'quick5') {
    console.log("\n  step 2 — user clicks 'Quick 5' mode");
    await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('#modetog button[data-m="quick"]').click());
    await p.waitForTimeout(350);
    const n = await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('.qk').textContent);
    console.log('    drill now shows:', n);
    console.log('\n  step 3 — grade one Quick-5 probe Solid');
    await gradeN(p, 1, () => 'jg');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${SHOTS}/overwrite-07-quick5.png` });
  }

  const after = await store(p);
  console.log('\n  RESULT');
  console.log('    BEFORE: ' + JSON.stringify(before.s) + '  status=' + before.st);
  console.log('    AFTER : ' + JSON.stringify(after.s) + '  status=' + after.st);
  console.log('    tot (the topic\'s probe count!) : ' + before.s.tot + ' -> ' + after.s.tot + (after.s.tot !== 22 ? '   *** DENOMINATOR CORRUPTED ***' : ''));
  console.log('    done                            : ' + before.s.done + ' -> ' + after.s.done);
  console.log('    revisit pile                    : ' + before.s.revisit.length + ' signals -> ' + after.s.revisit.length + ' signals' + (before.s.revisit.length && !after.s.revisit.length ? '   *** WIPED ***' : ''));
  const sum = await p.evaluate(() => { const s = Progress.summary(); return s.totDone + '/' + s.totTot + ' probes, ' + s.overallPct + '% of curriculum'; });
  console.log('    home rollup now reads           : ' + sum);
  await p.close();
}
await b.close();
