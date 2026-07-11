/* The corruption is real (proved in 06). But is the LENS'S REPRO PATH real?
   updRevset() (drill/logic.js:386): the #revdrill box is shown only while
     count > 0 && !revisitMode && di < cards.length
   -> after a COMPLETE run (di === cards.length) the box is display:none.
   So "complete all 22, then click Drill my 3 Revisit probes" is NOT reachable as written.
   Which buttons ARE on screen, and do they corrupt? Test every VISIBLE control. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const TOPIC = 'content-pipeline';

const vis = async (p, id) => p.evaluate((i) => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const el = r.getElementById(i);
  if (!el) return { exists: false };
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { exists: true, visible: rect.width > 0 && rect.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
           rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
           label: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 48) };
}, id);

const store = (p) => p.evaluate((t) => {
  const raw = localStorage.getItem('ddr.v1.progress.' + t);
  return raw ? JSON.parse(raw) : null;
}, TOPIC);

const gradeOne = async (p, which) => {
  for (let k = 0; k < 6; k++) {
    const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg'));
    if (has) break;
    await p.evaluate(() => { const a = document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
    await p.waitForTimeout(60);
  }
  await p.evaluate((w) => document.querySelector('#drill deep-drill').shadowRoot.getElementById(w).click(), which);
  await p.waitForTimeout(120);
};

const fullRun = async (p) => {
  for (let n = 0; n < 40; n++) {
    const done = await p.evaluate(() => document.querySelector('#drill deep-drill').di >= cards.length);
    if (done) break;
    const di = await p.evaluate(() => document.querySelector('#drill deep-drill').di);
    await gradeOne(p, (di % 7 === 6) ? 'js' : 'jg');
  }
};

const fresh = async (p) => {
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(700);
  await p.evaluate((t) => { if (TopicRegistry.current().id !== t) TopicRegistry.setTopic(t); }, TOPIC);
  await p.evaluate(() => { if (window.ViewManager && ViewManager.show) ViewManager.show('drill'); });
  await p.waitForTimeout(400);
};

const { chromium: cr } = await import('playwright');
const b = await cr.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });

// ============ A: what is VISIBLE on the debrief after a full run? ============
await fresh(p);
await fullRun(p);
await p.waitForTimeout(300);
const baseline = await store(p);
const dbg = {};
for (const id of ['revdrill', 'revset', 'dweak', 'drestart']) dbg[id] = await vis(p, id);
await p.screenshot({ path: SHOT + 'reachable-01-debrief.png' });
console.log('=== A. DEBRIEF SCREEN after a complete 22/22 run ===');
console.log('  STORE baseline:', JSON.stringify(baseline));
for (const [k, v] of Object.entries(dbg)) console.log('   #' + k.padEnd(9), JSON.stringify(v));
console.log('  => LENS\'S REPRO ("click Drill my N Revisit probes" on the debrief):',
  dbg.revdrill.visible ? 'REACHABLE' : '*** NOT REACHABLE — #revdrill is display:none here ***');

// ============ B: the DEBRIEF'S OWN button (#dweak) — is it the real path? ============
if (dbg.dweak.exists && dbg.dweak.visible) {
  await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('dweak').click());
  await p.waitForTimeout(300);
  const cl = await p.evaluate(() => ({ cards: cards.length, all: _allCards.length }));
  await gradeOne(p, 'jg');
  await p.waitForTimeout(300);
  const after = await store(p);
  console.log('\n=== B. clicked the DEBRIEF\'s OWN "#dweak" button ("' + dbg.dweak.label + '") ===');
  console.log('  working set after click: cards=' + cl.cards + ' (of ' + cl.all + ')');
  console.log('  STORE before:', JSON.stringify(baseline));
  console.log('  STORE after :', JSON.stringify(after));
  console.log('  tot ' + baseline.tot + ' -> ' + after.tot, baseline.tot !== after.tot ? '*** CORRUPTED ***' : 'ok');
  console.log('  revisit ' + JSON.stringify(baseline.revisit) + ' -> ' + JSON.stringify(after.revisit),
    (baseline.revisit.length && !after.revisit.length) ? '*** WIPED ***' : '');
  await p.screenshot({ path: SHOT + 'reachable-02-dweak-corrupted.png' });
}

// ============ C: #revdrill MID-run (where it IS visible) ============
await fresh(p);
for (let i = 0; i < 4; i++) await gradeOne(p, i < 2 ? 'js' : 'jg');   // flag 2, then 2 solid
const midVis = await vis(p, 'revdrill');
const midStore = await store(p);
console.log('\n=== C. #revdrill MID-run (4 of 22 graded, 2 flagged) ===');
console.log('  #revdrill:', JSON.stringify(midVis));
await p.screenshot({ path: SHOT + 'reachable-03-revdrill-midrun.png' });
if (midVis.visible) {
  await p.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('revdrill').click());
  await p.waitForTimeout(300);
  await gradeOne(p, 'jg');
  await p.waitForTimeout(300);
  const after = await store(p);
  console.log('  STORE before:', JSON.stringify(midStore));
  console.log('  STORE after :', JSON.stringify(after));
  console.log('  tot ' + midStore.tot + ' -> ' + after.tot, midStore.tot !== after.tot ? '*** CORRUPTED ***' : 'ok');
}

// ============ D: the ALWAYS-VISIBLE toggles (Quick 5 / tier filter) ============
await fresh(p);
await fullRun(p);
const baseD = await store(p);
const toggles = await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const grab = sel => [...r.querySelectorAll(sel)].map(e => {
    const rect = e.getBoundingClientRect();
    return { txt: e.textContent.trim().slice(0, 18), mode: e.getAttribute('data-mode'), tier: e.getAttribute('data-tier'),
             visible: rect.width > 0 && rect.height > 0 };
  });
  return { modes: grab('[data-mode]'), tiers: grab('[data-tier]') };
});
console.log('\n=== D. ALWAYS-VISIBLE toggles (top of the drill) ===');
console.log('  STORE baseline:', JSON.stringify(baseD));
console.log('  mode toggles:', JSON.stringify(toggles.modes));
console.log('  tier toggles:', JSON.stringify(toggles.tiers));
// click "quick" mode
await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const q = [...r.querySelectorAll('[data-mode]')].find(e => e.getAttribute('data-mode') === 'quick');
  if (q) q.click();
});
await p.waitForTimeout(300);
await gradeOne(p, 'jg');
await p.waitForTimeout(300);
const afterQuick = await store(p);
console.log('  after Quick-5 + 1 grade:', JSON.stringify(afterQuick));
console.log('  tot ' + baseD.tot + ' -> ' + afterQuick.tot, baseD.tot !== afterQuick.tot ? '*** CORRUPTED ***' : 'ok');
console.log('  revisit ' + JSON.stringify(baseD.revisit) + ' -> ' + JSON.stringify(afterQuick.revisit),
  (baseD.revisit.length && !afterQuick.revisit.length) ? '*** WIPED ***' : '');
await p.screenshot({ path: SHOT + 'reachable-04-quick5-corrupted.png' });

console.log('\nPAGE ERRORS:', errs.length, errs.slice(0, 3));
await b.close();
