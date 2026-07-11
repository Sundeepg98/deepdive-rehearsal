/* VERIFY Finding 4: does the shortcuts overlay (?) document the grade keys wrongly,
   and does pressing "1" (believing it means Solid) actually record Missed?
   Ground truth: shell.js:111-113 binds 1->#jm 2->#js 3->#jg
                 drill/logic.js:280-282 labels jm="✗ Missed [1]" js="~ Shaky [2]" jg="✓ Solid [3]" */
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
await p.keyboard.press('Escape');
await p.waitForTimeout(250);

// ---- 1. what does the SHORTCUTS overlay say? ----
await p.keyboard.press('?');
await p.waitForTimeout(600);
const kb = await p.evaluate(() => {
  const ov = document.getElementById('keyov');
  const sr = [...ov.querySelectorAll('*')].map(e => e.shadowRoot).find(Boolean) || ov;
  const rows = [...sr.querySelectorAll('.ks-row2')].map(r => ({
    keys: [...r.querySelectorAll('kbd')].map(k => k.textContent.trim()),
    desc: (r.querySelector('span:last-child') || {}).textContent?.trim() || '',
  }));
  const all = sr.textContent || '';
  return {
    open: ov.classList.contains('open'),
    gradeRows: rows.filter(r => r.keys.some(k => /^[123]$/.test(k))),
    mentions3: /\b3\b/.test(all) && rows.some(r => r.keys.includes('3')),
    mentionsMissed: /missed/i.test(all),
    mentionsShaky: /shaky/i.test(all),
  };
});
await p.screenshot({ path: SHOT + 'gradekeys-01-shortcuts-overlay.png' });
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

// ---- 2. the drill's OWN buttons (ground truth) ----
const seg = await p.$('.seg button[data-tab="drill"]');
if (seg) await seg.click();
await p.waitForTimeout(500);
const btns = await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  const a = r.getElementById('adv'); if (a) a.click();
  return null;
});
// reveal until grade buttons show
for (let k = 0; k < 6; k++) {
  const has = await p.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg'));
  if (has) break;
  await p.evaluate(() => { const a = document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv'); if (a) a.click(); });
  await p.waitForTimeout(80);
}
const labels = await p.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  return ['jm', 'js', 'jg'].map(id => {
    const e = r.getElementById(id);
    return e ? id + ' = "' + e.textContent.replace(/\s+/g, ' ').trim() + '"' : id + ' = (absent)';
  });
});
await p.screenshot({ path: SHOT + 'gradekeys-02-drill-buttons.png' });

// ---- 3. USER PRESSES "1" believing the overlay ("1/2 — Solid or Revisit") ----
const before = await p.evaluate(() => {
  const d = document.querySelector('#drill deep-drill');
  const r = d.shadowRoot;
  return { got: d.got, shk: d.shk, sGot: r.getElementById('sGot').textContent, sShk: r.getElementById('sShk').textContent };
});
await p.keyboard.press('1');
await p.waitForTimeout(400);
const after = await p.evaluate(() => {
  const d = document.querySelector('#drill deep-drill');
  const r = d.shadowRoot;
  const last = d.results[d.results.length - 1];
  return {
    got: d.got, shk: d.shk,
    sGot: r.getElementById('sGot').textContent, sShk: r.getElementById('sShk').textContent,
    lastLevel: last ? last.level : null, lastOk: last ? last.ok : null, lastSignal: last ? last.signal : null,
    revisitPile: Object.keys(d.revisit),
    stats: d.getStats(),
  };
});
await p.screenshot({ path: SHOT + 'gradekeys-03-after-pressing-1.png' });

console.log('=== 1. SHORTCUTS OVERLAY (?) ===');
console.log('  open:', kb.open);
kb.gradeRows.forEach(r => console.log('  ROW  keys=' + JSON.stringify(r.keys) + '  desc="' + r.desc + '"'));
console.log('  documents key "3"?', kb.mentions3 ? 'YES' : '*** NO — the ONLY key that records Solid is undocumented ***');
console.log('  mentions "Missed"?', kb.mentionsMissed, ' mentions "Shaky"?', kb.mentionsShaky);

console.log('\n=== 2. THE DRILL\'S OWN BUTTONS (ground truth) ===');
labels.forEach(l => console.log('  ' + l));

console.log('\n=== 3. USER READS "1/2 — Solid or Revisit", PRESSES "1" FOR SOLID ===');
console.log('  before: Solid=' + before.sGot + ' Revisit=' + before.sShk);
console.log('  after : Solid=' + after.sGot + ' Revisit=' + after.sShk);
console.log('  recorded level =', after.lastLevel, '| ok =', after.lastOk, '| signal =', JSON.stringify(after.lastSignal));
console.log('  revisit pile   =', JSON.stringify(after.revisitPile));
console.log('  getStats()     =', JSON.stringify(after.stats));
console.log('  => pressing "1" for SOLID recorded:',
  after.lastLevel === 1 ? '*** MISSED (level 1) — the OPPOSITE ***' : 'level ' + after.lastLevel);
console.log('  => Solid counter moved?', after.sGot !== before.sGot ? 'yes' : '*** NO (still ' + after.sGot + ') ***');
console.log('  => Revisit counter moved?', after.sShk !== before.sShk ? '*** YES -> ' + after.sShk + ' ***' : 'no');

console.log('\nPAGE ERRORS:', errs.length, errs.slice(0, 3));
await b.close();
