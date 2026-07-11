/* LENS: core flows — keyboard, corrected selectors (_wi / #wdots i / deep-keyboard shadow)
   + precise pane-swap timing (is the "e"/"o" mismatch a real bug or a slow view transition?) */
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

console.log('########## PANE-SWAP LATENCY: how long until .pane.on actually matches the requested view? ##########');
const MAP = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open', v: 'viz' };
for (const [k, want] of Object.entries(MAP)) {
  await p.locator('body').press(k);
  const t0 = Date.now();
  let settled = -1;
  for (let ms = 0; ms < 2500; ms += 25) {
    const on = await p.evaluate(() => { const e = document.querySelector('.pane.on'); return e ? e.id : null; });
    if (on === want) { settled = Date.now() - t0; break; }
    await p.waitForTimeout(25);
  }
  const st = await p.evaluate(() => ({ hash: location.hash, seg: (document.querySelector('.seg button.on') || {}).getAttribute('data-tab'), on: (document.querySelector('.pane.on') || {}).id, nOn: document.querySelectorAll('.pane.on').length }));
  console.log(`  "${k}" -> ${want.padEnd(6)} settled in ${settled < 0 ? 'NEVER (>2.5s)' : settled + 'ms'}   [pane.on=${st.on}, count=${st.nOn}, seg=${st.seg}]`);
}

console.log('\n########## WALKTHROUGH arrows (correct selectors: _wi, #wdots i) ##########');
await p.locator('body').press('q'); await p.waitForTimeout(500);
const wstate = async () => await p.evaluate(() => {
  const w = document.querySelector('#walk deep-walkthrough'), r = w.shadowRoot;
  const dots = r.querySelectorAll('#wdots i');
  let on = -1; dots.forEach((d, i) => { if (d.classList.contains('on')) on = i; });
  const body = r.getElementById('wbody') || r.querySelector('.wstep, .card');
  return { wi: w._wi, nSteps: w._steps ? w._steps.length : null, dots: dots.length, dotOn: on, txt: (body ? body.textContent : '').replace(/\s+/g, ' ').trim().slice(0, 55) };
});
let s = await wstate(); console.log('  start       :', JSON.stringify(s));
await p.locator('body').press('ArrowRight'); await p.waitForTimeout(300);
const a1 = await wstate(); console.log('  ArrowRight  :', JSON.stringify(a1), a1.wi === s.wi + 1 ? 'OK' : '*** DEAD ***');
await p.locator('body').press('ArrowRight'); await p.waitForTimeout(300);
const a2 = await wstate(); console.log('  ArrowRight  :', JSON.stringify(a2), a2.wi === a1.wi + 1 ? 'OK' : '*** DEAD ***');
await p.locator('body').press('ArrowLeft'); await p.waitForTimeout(300);
const a3 = await wstate(); console.log('  ArrowLeft   :', JSON.stringify(a3), a3.wi === a2.wi - 1 ? 'OK' : '*** DEAD ***');
// bounds
for (let i = 0; i < 15; i++) { await p.locator('body').press('ArrowRight'); await p.waitForTimeout(60); }
const aEnd = await wstate(); console.log('  15x Right   :', JSON.stringify(aEnd), aEnd.wi === aEnd.nSteps - 1 ? 'OK (clamped at last step)' : '*** OVERRAN ***');
for (let i = 0; i < 15; i++) { await p.locator('body').press('ArrowLeft'); await p.waitForTimeout(60); }
const aSt = await wstate(); console.log('  15x Left    :', JSON.stringify(aSt), aSt.wi === 0 ? 'OK (clamped at first step)' : '*** OVERRAN ***');
await p.screenshot({ path: `${SHOTS}/kbd-03-walk-step.png` });

console.log('\n########## SHORTCUTS OVERLAY: what does it document vs what actually works? ##########');
await p.locator('body').press('?'); await p.waitForTimeout(600);
const doc = await p.evaluate(() => {
  const host = document.querySelector('deep-keyboard');
  const r = host && host.shadowRoot ? host.shadowRoot : null;
  if (!r) return { err: 'no shadow', light: document.getElementById('keybody').textContent.replace(/\s+/g, ' ').slice(0, 200) };
  const keys = [...r.querySelectorAll('kbd, .k, .key')].map(e => e.textContent.trim());
  const rows = [...r.querySelectorAll('.krow, .kb-row, li, tr')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { keys, rows: rows.slice(0, 40) };
});
console.log('  keys documented:', JSON.stringify(doc.keys));
console.log('  rows:');
(doc.rows || []).forEach(r2 => console.log('    ' + r2));
await p.screenshot({ path: `${SHOTS}/kbd-04-shortcuts-content.png` });
const listed = (doc.keys || []).map(x => x.toLowerCase());
const LIVE = [
  ['q/w/e/r/t/y/u/i/o', 'jump to a view'], ['v', 'visualize pane'], ['1/2/3', 'grade missed/shaky/solid'],
  ['space', 'reveal / push further'], ['enter', 'reveal / push further'], ['arrow l/r', 'walkthrough steps'],
  ['g', 'guided tour'], ['d', 'cycle density'], ['/', 'search'], ['[', 'prev topic'], [']', 'next topic'],
  ['\\', 'topic index'], ['?', 'this overlay'], ['esc', 'close overlay'], ['p', 'print (cram open)'],
];
console.log('\n  live-key coverage:');
for (const [kk, what] of LIVE) {
  const first = kk.split('/')[0].trim();
  const found = listed.some(l => l === first || l.includes(first) || (first === 'arrow l' && (l.includes('←') || l.includes('→'))));
  console.log(`    ${found ? 'documented  ' : 'UNDOCUMENTED'} ${kk.padEnd(20)} ${what}`);
}
await p.locator('body').press('Escape'); await p.waitForTimeout(400);

console.log('\n########## "g" starts the guided tour — and can you get out? ##########');
await p.locator('body').press('g'); await p.waitForTimeout(700);
const tour = await p.evaluate(() => ({ active: window.TourGuide ? TourGuide.isActive() : null, visible: !!document.querySelector('.tour-pop, .tg-pop, [class*="tour"]') }));
console.log('  TourGuide.isActive():', tour.active, '| tour UI in DOM:', tour.visible);
await p.screenshot({ path: `${SHOTS}/kbd-05-tour.png` });
await p.locator('body').press('Escape'); await p.waitForTimeout(500);
console.log('  after Escape: active =', await p.evaluate(() => window.TourGuide ? TourGuide.isActive() : null));

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
