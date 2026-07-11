/* LENS: core flows — DRILL: reveal -> must-hit checklist -> grade -> advance -> persist -> reload */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen()) IndexOverlay.close(); });
await p.waitForTimeout(300);

const drill = p.locator('#drill deep-drill');

async function drillState() {
  return await p.evaluate(() => {
    const d = document.querySelector('#drill deep-drill'), r = d.shadowRoot;
    const g = id => r.getElementById(id);
    return {
      pane_on: document.getElementById('drill').classList.contains('on'),
      probeLabel: (r.querySelector('.qk') || {}).textContent || null,
      question: ((r.querySelector('.qq') || {}).textContent || '').slice(0, 70),
      hasAnswer: !!r.querySelector('.ans'),
      advText: g('adv') ? g('adv').textContent.trim() : null,
      hasJudge: !!r.querySelector('.judge'),
      mhpCount: r.querySelectorAll('.mhp-i').length,
      mhpCovered: g('mhpN') ? g('mhpN').textContent : null,
      mhpRec: g('mhpRec') ? g('mhpRec').textContent : null,
      jRec: ['jm', 'js', 'jg'].filter(id => g(id) && g(id).classList.contains('j-rec')),
      sGot: g('sGot') ? g('sGot').textContent : null,
      sShk: g('sShk') ? g('sShk').textContent : null,
      sLeft: g('sLeft') ? g('sLeft').textContent : null,
      dfillW: g('dfill') ? g('dfill').style.width : null,
      internal: { di: d.di, got: d.got, shk: d.shk, results: d.results.length, mode: d.mode },
      stats: d.getStats ? d.getStats() : null,
    };
  });
}
const log = (label, s) => console.log(`  ${label.padEnd(28)} ${s.probeLabel} | ans=${s.hasAnswer} judge=${s.hasJudge} mhp=${s.mhpCount} cov=${s.mhpCovered} rec="${s.mhpRec}" jrec=[${s.jRec}] | Solid=${s.sGot} Revisit=${s.sShk} Left=${s.sLeft} bar=${s.dfillW} | di=${s.internal.di}`);

console.log('\n########## DRILL: one probe, end to end ##########');
await p.click('.seg button[data-tab="drill"]');
await p.waitForTimeout(600);
console.log('  hash after tab click:', await p.evaluate(() => location.hash));
let s = await drillState(); log('initial', s);
await p.screenshot({ path: `${SHOTS}/drill-01-initial.png` });

// walk the reveal chain to the end (adv exists until the last stage)
let stages = 0;
while (true) {
  const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'));
  if (!has) break;
  await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv').click());
  await p.waitForTimeout(200);
  stages++;
  s = await drillState(); log('after adv #' + stages, s);
  if (stages > 8) break;
}
await p.screenshot({ path: `${SHOTS}/drill-02-revealed-mhp.png` });
console.log(`  -> reveal chain took ${stages} clicks; must-hit checklist rendered with ${s.mhpCount} points`);

console.log('\n########## MUST-HIT CHECKLIST scoring ##########');
if (s.mhpCount === 0) console.log('  !! NO must-hit points rendered for this probe');
// tick 1
await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('.mhp-i[data-i="0"]').click());
await p.waitForTimeout(150);
s = await drillState(); log('tick 1 point', s);
// tick all
const n = s.mhpCount;
await p.evaluate((n) => { const r = document.querySelector('#drill deep-drill').shadowRoot; for (let i = 1; i < n; i++) r.querySelector('.mhp-i[data-i="' + i + '"]').click(); }, n);
await p.waitForTimeout(150);
s = await drillState(); log('tick ALL points', s);
await p.screenshot({ path: `${SHOTS}/drill-03-mhp-all-ticked.png` });
// untick all -> should recommend Missed
await p.evaluate((n) => { const r = document.querySelector('#drill deep-drill').shadowRoot; for (let i = 0; i < n; i++) r.querySelector('.mhp-i[data-i="' + i + '"]').click(); }, n);
await p.waitForTimeout(150);
s = await drillState(); log('untick ALL points', s);

console.log('\n########## GRADE via KEYBOARD (1 = Missed, 2 = Shaky, 3 = Solid) ##########');
await p.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot; for (let i = 0; i < r.querySelectorAll('.mhp-i').length; i++) r.querySelector('.mhp-i[data-i="' + i + '"]').click(); });
await p.waitForTimeout(120);
await p.locator('body').press('3');            // Solid
await p.waitForTimeout(350);
s = await drillState(); log('after key "3" (Solid)', s);
const afterSolid = { ...s.internal };

// probe 2: reveal fully via keyboard Space, then grade Shaky with key 2
console.log('\n########## KEYBOARD: Space to reveal/push, then "2" (Shaky) ##########');
let spaces = 0;
while (spaces < 8) {
  const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'));
  if (!has) break;
  await p.locator('body').press(' ');
  await p.waitForTimeout(200);
  spaces++;
}
s = await drillState(); log(`after ${spaces}x Space`, s);
console.log(`  -> Space advanced the reveal chain: ${spaces > 0 ? 'YES' : 'NO (dead key!)'}`);
await p.locator('body').press('2');
await p.waitForTimeout(350);
s = await drillState(); log('after key "2" (Shaky)', s);

// probe 3: grade Missed with "1"
let sp = 0;
while (sp < 8) {
  const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'));
  if (!has) break;
  await p.locator('body').press(' '); await p.waitForTimeout(180); sp++;
}
await p.locator('body').press('1');
await p.waitForTimeout(350);
s = await drillState(); log('after key "1" (Missed)', s);
await p.screenshot({ path: `${SHOTS}/drill-04-after-3-grades.png` });

console.log('\n  Score tally check: expect Solid=1, Revisit=2 (shaky+missed), di=3');
console.log('  ACTUAL:', JSON.stringify(s.internal), ' | stats:', JSON.stringify(s.stats));

console.log('\n########## REVISIT PILE ##########');
const rev = await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const box = r.getElementById('revset');
  return { visible: box.style.display !== 'none', n: (r.getElementById('revn') || {}).textContent, flagged: r.querySelectorAll('.dn-step.flag').length };
});
console.log('  revisit strip visible=' + rev.visible + '  count=' + rev.n + '  flagged nav chips=' + rev.flagged);

console.log('\n########## PERSISTENCE: Store snapshot after grading ##########');
const stored = await p.evaluate(() => {
  const out = {};
  for (const k of Object.keys(localStorage)) out[k] = localStorage.getItem(k);
  return { ls: out, progress: Progress.get('content-pipeline'), status: Progress.status('content-pipeline') };
});
console.log('  localStorage:', JSON.stringify(stored.ls, null, 1));
console.log('  Progress.get("content-pipeline"):', JSON.stringify(stored.progress));
console.log('  Progress.status:', stored.status);

console.log('\n########## RELOAD -> does the saved progress survive? ##########');
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(900);
const after = await p.evaluate(() => ({
  hash: location.hash,
  indexOpen: window.IndexOverlay ? IndexOverlay.isOpen() : null,
  progress: Progress.get('content-pipeline'),
  status: Progress.status('content-pipeline'),
  summary: Progress.summary().totDone + '/' + Progress.summary().totTot + ' weak=' + Progress.summary().totWeak,
  liveDrill: (() => { const d = document.querySelector('#drill deep-drill'); return { di: d.di, got: d.got, shk: d.shk, results: d.results.length }; })(),
}));
console.log('  hash after reload:', after.hash, '| index overlay auto-opened?', after.indexOpen);
console.log('  Progress.get survived reload:', JSON.stringify(after.progress));
console.log('  Progress.status:', after.status, '| rollup:', after.summary);
console.log('  LIVE drill component state after reload:', JSON.stringify(after.liveDrill));
console.log('  -> saved progress persists: ' + (after.progress && after.progress.done === 3 ? 'YES' : 'NO/PARTIAL'));
console.log('  -> in-flight drill position restored: ' + (after.liveDrill.di === 3 ? 'YES' : 'NO (drill restarts at probe 1)'));
await p.screenshot({ path: `${SHOTS}/drill-05-after-reload.png` });

console.log('\n########## TOPIC SWITCH mid-drill: does drill state leak? ##########');
await p.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen()) IndexOverlay.close(); });
await p.waitForTimeout(300);
await p.click('.seg button[data-tab="drill"]'); await p.waitForTimeout(400);
// grade 2 on content-pipeline
for (let g = 0; g < 2; g++) {
  let k = 0;
  while (k < 8) { const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv')); if (!has) break; await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv').click()); await p.waitForTimeout(140); k++; }
  await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg').click());
  await p.waitForTimeout(250);
}
const beforeSwitch = await drillState();
console.log('  before switch (content-pipeline): di=' + beforeSwitch.internal.di + ' got=' + beforeSwitch.internal.got + ' probe=' + beforeSwitch.probeLabel);
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(800);
const afterSwitch = await drillState();
console.log('  after  switch (caching):        di=' + afterSwitch.internal.di + ' got=' + afterSwitch.internal.got + ' probe=' + afterSwitch.probeLabel);
console.log('  question now: "' + afterSwitch.question + '"');
console.log('  -> drill reset on topic switch: ' + (afterSwitch.internal.di === 0 && afterSwitch.internal.got === 0 ? 'YES (clean)' : 'NO -- STALE SCORE LEAK'));
const persisted = await p.evaluate(() => ({ cp: Progress.get('content-pipeline'), ca: Progress.get('caching') }));
console.log('  content-pipeline progress preserved in Store:', JSON.stringify(persisted.cp));
console.log('  caching progress (should be null/untouched):', JSON.stringify(persisted.ca));
await p.screenshot({ path: `${SHOTS}/drill-06-after-topic-switch.png` });

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
