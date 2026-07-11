/* LENS: core flows — KEYBOARD: Q..O + V tabs, arrows, Space, 1/2/3, ?, /, [ ] \, g, d */
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

const view = async () => await p.evaluate(() => {
  const on = document.querySelector('.pane.on');
  return { pane: on ? on.id : null, hash: location.hash, title: document.title, segOn: (document.querySelector('.seg button.on') || {}).getAttribute ? document.querySelector('.seg button.on').getAttribute('data-tab') : null };
});

console.log('########## Q..O + V — one key per view ##########');
const MAP = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open', v: 'viz' };
for (const [k, want] of Object.entries(MAP)) {
  await p.locator('body').press(k);
  await p.waitForTimeout(320);
  const v = await view();
  const ok = v.pane === want;
  console.log(`  "${k}" -> pane=${String(v.pane).padEnd(6)} seg=${String(v.segOn).padEnd(6)} hash=${v.hash.padEnd(28)} title="${v.title}"  ${ok ? 'OK' : '*** MISMATCH (want ' + want + ') ***'}`);
}
// back to walk
await p.locator('body').press('q'); await p.waitForTimeout(300);

console.log('\n########## WALKTHROUGH arrows ##########');
const wstate = async () => await p.evaluate(() => {
  const w = document.querySelector('#walk deep-walkthrough'), r = w.shadowRoot;
  const dots = r.querySelectorAll('.dot');
  let active = -1;
  dots.forEach((d, i) => { if (d.classList.contains('on') || d.classList.contains('active')) active = i; });
  const head = r.querySelector('.st-t, .steptitle, h2, .wtitle');
  return { dots: dots.length, active, step: head ? head.textContent.trim().slice(0, 46) : (r.textContent || '').replace(/\s+/g, ' ').slice(0, 46), idx: (typeof w.i !== 'undefined' ? w.i : (typeof w.si !== 'undefined' ? w.si : null)) };
});
let w0 = await wstate(); console.log('  start        :', JSON.stringify(w0));
await p.locator('body').press('ArrowRight'); await p.waitForTimeout(280);
let w1 = await wstate(); console.log('  ArrowRight   :', JSON.stringify(w1), w1.step !== w0.step || w1.idx !== w0.idx ? 'OK (advanced)' : '*** DEAD KEY ***');
await p.locator('body').press('ArrowRight'); await p.waitForTimeout(280);
let w2 = await wstate(); console.log('  ArrowRight   :', JSON.stringify(w2));
await p.locator('body').press('ArrowLeft'); await p.waitForTimeout(280);
let w3 = await wstate(); console.log('  ArrowLeft    :', JSON.stringify(w3), w3.idx === w1.idx ? 'OK (went back)' : '*** did not go back ***');
await p.screenshot({ path: `${SHOTS}/kbd-01-walk-arrows.png` });

console.log('\n########## "?" opens the shortcuts overlay; Escape closes it ##########');
await p.locator('body').press('?');
await p.waitForTimeout(500);
let k = await p.evaluate(() => { const o = document.getElementById('keyov'); return { open: o.classList.contains('open'), hidden: o.getAttribute('aria-hidden'), focus: (document.activeElement || {}).tagName + '.' + (document.activeElement || {}).className }; });
console.log('  after "?":', JSON.stringify(k), k.open ? 'OK' : '*** DID NOT OPEN ***');
await p.screenshot({ path: `${SHOTS}/kbd-02-shortcuts-overlay.png` });
// while open, a view key must NOT switch panes (overlay suppression)
const before = await view();
await p.locator('body').press('w');
await p.waitForTimeout(300);
const during = await view();
console.log('  pressing "w" WHILE the overlay is open: pane ' + before.pane + ' -> ' + during.pane + (before.pane === during.pane ? '  OK (suppressed)' : '  *** LEAKED THROUGH ***'));
await p.locator('body').press('Escape');
await p.waitForTimeout(500);
k = await p.evaluate(() => ({ open: document.getElementById('keyov').classList.contains('open') }));
console.log('  after Escape:', JSON.stringify(k), !k.open ? 'OK (closed)' : '*** DID NOT CLOSE ***');

console.log('\n########## "/" opens search; Escape closes ##########');
await p.locator('body').press('/');
await p.waitForTimeout(500);
let so = await p.evaluate(() => ({ open: window.SearchOverlay.isOpen(), focused: (document.activeElement || {}).tagName, ph: document.activeElement ? document.activeElement.placeholder : null }));
console.log('  after "/":', JSON.stringify(so), so.open ? 'OK' : '*** DID NOT OPEN ***');
await p.locator('body').press('Escape'); await p.waitForTimeout(400);
console.log('  after Escape: open=' + await p.evaluate(() => SearchOverlay.isOpen()));

console.log('\n########## "\\" opens the topic index ##########');
await p.locator('body').press('\\');
await p.waitForTimeout(600);
console.log('  IndexOverlay.isOpen():', await p.evaluate(() => IndexOverlay.isOpen()));
await p.locator('body').press('Escape'); await p.waitForTimeout(500);
console.log('  after Escape:', await p.evaluate(() => IndexOverlay.isOpen()));

console.log('\n########## "[" / "]" step topics ##########');
const cur = () => p.evaluate(() => TopicRegistry.current().id);
console.log('  topic before:', await cur());
await p.locator('body').press(']'); await p.waitForTimeout(700);
const t1 = await cur(); console.log('  after "]":  ', t1);
await p.locator('body').press('['); await p.waitForTimeout(700);
const t2 = await cur(); console.log('  after "[":  ', t2, t2 === 'content-pipeline' ? 'OK (stepped back)' : '');

console.log('\n########## "d" cycles density ##########');
for (let i = 0; i < 4; i++) {
  const d = await p.evaluate(() => document.documentElement.dataset.density || 'default');
  console.log('  density:', d);
  await p.locator('body').press('d'); await p.waitForTimeout(200);
}

console.log('\n########## CONFLICT SCAN: does any view key collide with a drill grade key? ##########');
await p.locator('body').press('w'); await p.waitForTimeout(400);   // drill
const conflict = await p.evaluate(() => {
  // simulate: in the drill, the keys 1/2/3 grade. Do they ALSO match a tab key?
  const tabKeys = { q: 'walk', w: 'drill', e: 'wb', r: 'sys', t: 'trade', y: 'model', u: 'num', i: 'rf', o: 'open', v: 'viz' };
  const gradeKeys = ['1', '2', '3'];
  const overlap = gradeKeys.filter(g => tabKeys[g]);
  return { overlap, tabKeys: Object.keys(tabKeys), other: ['g (tour)', 'd (density)', '/ (search)', '[ ] (topic)', '\\ (index)', '? (help)'] };
});
console.log('  grade keys 1/2/3 vs tab keys:', conflict.overlap.length ? '*** COLLISION: ' + conflict.overlap : 'no collision OK');

console.log('\n########## The shortcuts overlay: does it DOCUMENT what actually works? ##########');
await p.locator('body').press('?'); await p.waitForTimeout(500);
const doc = await p.evaluate(() => {
  const o = document.getElementById('keyov');
  return [...o.querySelectorAll('kbd')].map(k2 => k2.textContent.trim());
});
console.log('  <kbd> keys listed in the overlay:', JSON.stringify(doc));
const LIVE = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'v', 'd', 'g', '/', '[', ']', '\\', '?', '1', '2', '3', 'space', 'enter', 'esc', 'p', '←', '→'];
const listedLc = doc.map(x => x.toLowerCase());
const undocumented = LIVE.filter(x => !listedLc.some(l => l === x || l.includes(x)));
console.log('  LIVE keys NOT documented in the overlay:', JSON.stringify(undocumented));

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
