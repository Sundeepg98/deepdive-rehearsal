/* REDO of 07 with the drill pane ACTUALLY ON SCREEN (my first pass measured
   0x0 rects because the pane was display:none — an unsound harness).
   Navigate by REAL click on the seg tab, assert the pane is visible, THEN measure
   which corruption-triggering controls a user can actually see and click. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const TOPIC = 'content-pipeline';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(600);

const gotoDrill = async () => {
  // close the boot index overlay if open, then REAL-click the drill seg tab
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  const seg = await p.$('.seg button[data-tab="drill"]');
  if (seg) await seg.click(); else await p.keyboard.press('w');
  await p.waitForTimeout(400);
  return p.evaluate(() => {
    const pane = document.getElementById('drill');
    const r = pane.getBoundingClientRect();
    return { paneOn: pane.classList.contains('on'), w: Math.round(r.width), h: Math.round(r.height) };
  });
};

const vis = (id) => p.evaluate((i) => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const el = r.getElementById(i);
  if (!el) return { exists: false };
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { exists: true,
           visible: rect.width > 0 && rect.height > 0 && cs.display !== 'none',
           rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
           label: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 44) };
}, id);

const store = () => p.evaluate((t) => {
  const raw = localStorage.getItem('ddr.v1.progress.' + t);
  return raw ? JSON.parse(raw) : null;
}, TOPIC);

const gradeOne = async (which) => {
  for (let k = 0; k < 6; k++) {
    const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg'));
    if (has) break;
    await p.evaluate(() => { const a = document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
    await p.waitForTimeout(60);
  }
  const ok = await p.evaluate((w) => {
    const el = document.querySelector('#drill deep-drill').shadowRoot.getElementById(w);
    if (!el) return false; el.click(); return true;
  }, which);
  await p.waitForTimeout(110);
  return ok;
};

const fullRun = async () => {
  for (let n = 0; n < 40; n++) {
    const done = await p.evaluate(() => document.querySelector('#drill deep-drill').di >= cards.length);
    if (done) break;
    const di = await p.evaluate(() => document.querySelector('#drill deep-drill').di);
    if (!await gradeOne(di % 7 === 6 ? 'js' : 'jg')) break;
  }
};

const fresh = async () => {
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(700);
  return gotoDrill();
};

// ===== A. debrief after a full run — what can the user SEE? =====
const nav = await fresh();
console.log('drill pane on screen?', JSON.stringify(nav));
await fullRun();
await p.waitForTimeout(300);
const baseline = await store();
const dbg = {};
for (const id of ['revdrill', 'dweak', 'drestart']) dbg[id] = await vis(id);
await p.screenshot({ path: SHOT + 'reach2-01-debrief.png' });
console.log('\n=== A. DEBRIEF after a complete 22/22 run (pane VISIBLE) ===');
console.log('  STORE baseline:', JSON.stringify(baseline));
for (const [k, v] of Object.entries(dbg)) console.log('   #' + k.padEnd(9), JSON.stringify(v));

// ===== B. click #dweak — the label the lens quoted verbatim =====
if (dbg.dweak.visible) {
  const el = await p.evaluateHandle(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('dweak'));
  await el.asElement().click();          // REAL mouse click
  await p.waitForTimeout(350);
  const cl = await p.evaluate(() => ({ cards: cards.length, all: _allCards.length }));
  await gradeOne('jg');
  await p.waitForTimeout(350);
  const after = await store();
  console.log('\n=== B. REAL CLICK on #dweak ("' + dbg.dweak.label + '") then grade ONE ===');
  console.log('  working set: cards=' + cl.cards + ' of ' + cl.all);
  console.log('  STORE before:', JSON.stringify(baseline));
  console.log('  STORE after :', JSON.stringify(after));
  console.log('  tot     ' + baseline.tot + ' -> ' + after.tot, baseline.tot !== after.tot ? '*** CORRUPTED ***' : 'ok');
  console.log('  done    ' + baseline.done + ' -> ' + after.done, after.done < baseline.done ? '*** REGRESSED ***' : 'ok');
  console.log('  revisit ' + JSON.stringify(baseline.revisit) + ' -> ' + JSON.stringify(after.revisit),
    (baseline.revisit.length && !after.revisit.length) ? '*** WIPED ***' : '');
  await p.screenshot({ path: SHOT + 'reach2-02-dweak-corrupted.png' });
}

// ===== C. #revdrill mid-run =====
await fresh();
for (let i = 0; i < 4; i++) await gradeOne(i < 2 ? 'js' : 'jg');
await p.waitForTimeout(250);
const midVis = await vis('revdrill');
console.log('\n=== C. #revdrill MID-run (4/22 graded, 2 flagged) ===');
console.log('  #revdrill:', JSON.stringify(midVis));
await p.screenshot({ path: SHOT + 'reach2-03-revdrill-midrun.png' });

// ===== D. always-visible tier toggle =====
await fresh();
await fullRun();
const baseD = await store();
const tiers = await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  return [...r.querySelectorAll('[data-tier]')].map(e => {
    const rc = e.getBoundingClientRect();
    return { txt: e.textContent.trim(), tier: e.getAttribute('data-tier'), visible: rc.width > 0 && rc.height > 0 };
  });
});
console.log('\n=== D. TIER toggle (always on screen at the top of the drill) ===');
console.log('  STORE baseline:', JSON.stringify(baseD));
console.log('  tiers:', JSON.stringify(tiers));
const sde2 = await p.evaluateHandle(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  return [...r.querySelectorAll('[data-tier]')].find(e => e.getAttribute('data-tier') === 'SDE2');
});
if (sde2.asElement()) {
  await sde2.asElement().click();       // REAL click on a permanently visible control
  await p.waitForTimeout(350);
  const cl = await p.evaluate(() => ({ cards: cards.length, all: _allCards.length }));
  await gradeOne('jg');
  await p.waitForTimeout(350);
  const after = await store();
  console.log('  REAL CLICK "SDE2" -> working set cards=' + cl.cards + ' of ' + cl.all);
  console.log('  STORE after 1 grade:', JSON.stringify(after));
  console.log('  tot     ' + baseD.tot + ' -> ' + after.tot, baseD.tot !== after.tot ? '*** CORRUPTED ***' : 'ok');
  console.log('  revisit ' + JSON.stringify(baseD.revisit) + ' -> ' + JSON.stringify(after.revisit),
    (baseD.revisit.length && !after.revisit.length) ? '*** WIPED ***' : '');
  await p.screenshot({ path: SHOT + 'reach2-04-tier-corrupted.png' });
}
console.log('\nPAGE ERRORS:', errs.length, errs.slice(0, 3));
await b.close();
