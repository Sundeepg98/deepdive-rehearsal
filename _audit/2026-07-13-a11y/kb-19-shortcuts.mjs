/* kb-19: every shortcut the app DOCUMENTS in its own '?' overlay, driven for real, plus the ones
   it binds but never tells you about. The '?' panel is the keyboard user's only map of the app —
   if it is wrong, they are navigating with a wrong map. */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
fs.mkdirSync(SHOTS, { recursive: true });

const snap = () => page.evaluate(() => ({
  pane: [...document.querySelectorAll('.pane')].find(p => p.classList.contains('on'))?.id,
  topic: window.TopicRegistry?.current?.().id,
  density: document.documentElement.dataset.density || 'default',
  focusMode: document.querySelector('.app')?.classList.contains('_focus-mode') || false,
  tour: !!(window.TourGuide?.isActive?.()),
  search: !!(window.SearchOverlay?.isOpen?.()),
  index: !!document.getElementById('_index-overlay')?.classList.contains('open'),
  anyDialog: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(d => d.classList.contains('open')).map(d => d.id)[0] || null,
  walkStep: (() => { const w = document.querySelector('#walk deep-walkthrough'); return w?._wi ?? null; })(),
}));
const reset = async (pane = 'walk') => {
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.evaluate((p) => {
    window.switchTab(p);
    const a = document.querySelector('.app'); a.classList.remove('_focus-mode');
    delete document.documentElement.dataset.density;
    if (window.TourGuide?.isActive?.()) window.TourGuide.stop?.();
    document.activeElement?.blur?.();
  }, pane);
  await page.waitForTimeout(300);
};

async function press(key, pane = 'walk') {
  await reset(pane);
  const b = await snap();
  await page.keyboard.press(key);
  await page.waitForTimeout(420);
  const a = await snap();
  const d = [];
  for (const p of Object.keys(b)) if (String(a[p]) !== String(b[p])) d.push(`${p}: ${b[p]} -> ${a[p]}`);
  return d;
}

console.log('=== DOCUMENTED in the app\'s own "?" panel ===\n');
console.log('key       documented as                              observed');
console.log('-'.repeat(104));
const DOC = [
  ['q', 'Walkthrough', 'walk'], ['w', 'Probe Drill', 'walk'], ['e', 'Whiteboard', 'walk'],
  ['r', 'System Map', 'walk'], ['t', 'Trade-offs', 'walk'], ['y', 'Model Answers', 'walk'],
  ['u', 'Numbers', 'walk'], ['i', 'Red Flags', 'walk'], ['o', '30-Second', 'walk'],
  ['ArrowRight', 'Step forward through the walkthrough', 'walk'],
  ['ArrowLeft', 'Step back through the walkthrough', 'walk'],
  ['/', 'Search topics, concepts & views', 'walk'],
  ['\\', 'Open the Topic index', 'walk'],
  [']', 'Next topic', 'walk'],
  ['[', 'Previous topic', 'walk'],
  ['g', 'Start the guided tour', 'walk'],
  ['d', 'Cycle spacing density', 'walk'],
  ['?', 'Bring up this list', 'walk'],
];
const results = [];
for (const [k, doc, pane] of DOC) {
  const d = await press(k, pane);
  const ok = d.length > 0;
  results.push({ k, doc, worked: ok, effect: d });
  console.log(`${k.padEnd(9)} ${doc.slice(0, 41).padEnd(42)} ${ok ? d.join(' | ') : '*** NOTHING HAPPENED ***'}`);
}

/* Space / Enter on the drill: documented as "Reveal the answer - advance the next beat" */
console.log('\n--- Space / Enter (documented: "Reveal the answer / advance the next beat") ---');
for (const k of ['Space', 'Enter']) {
  await reset('drill');
  const before = await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv')?.textContent.trim().slice(0, 22));
  await page.keyboard.press(k);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv')?.textContent.trim().slice(0, 22) || '(judge row)');
  console.log(`  ${k.padEnd(6)} on the drill: "${before}" -> "${after}"  ${before !== after ? 'works' : 'NO EFFECT'}`);
}

/* 1 / 2 / 3 — the doc says "1 2 ... Solid or Revisit". What are the buttons really? */
console.log('\n--- the drill\'s self-grade keys (the "?" panel says: "1 2 — score the probe — Solid or Revisit") ---');
await reset('drill');
for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(320); }   // reveal through to the judge row
const judge = await page.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  return ['jm', 'js', 'jg'].map(id => { const b = r.getElementById(id); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
});
console.log(`  buttons actually rendered : ${JSON.stringify(judge)}`);
const bound = await page.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  return { jm: !!r.getElementById('jm'), js: !!r.getElementById('js'), jg: !!r.getElementById('jg') };
});
for (const k of ['1', '2', '3']) {
  await reset('drill');
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(280); }
  await page.evaluate(() => { window.__g = null; const r = document.querySelector('#drill deep-drill').shadowRoot; ['jm', 'js', 'jg'].forEach(id => { const b = r.getElementById(id); if (b) b.addEventListener('click', () => window.__g = id); }); });
  await page.keyboard.press(k);
  await page.waitForTimeout(350);
  const fired = await page.evaluate(() => window.__g);
  const label = { jm: 'Missed', js: 'Shaky', jg: 'Solid' }[fired] || null;
  console.log(`  key "${k}" -> ${fired ? `#${fired} (${label})` : 'nothing'}`);
}
console.log(`  => the panel documents TWO keys and the words "Solid or Revisit"; the app binds THREE (Missed / Shaky / Solid).`);

/* bound but never documented */
console.log('\n=== BOUND BUT NOT IN THE "?" PANEL ===');
for (const [k, what] of [['v', 'jumps to the Visual trainer pane'], ['f', 'toggles focus mode']]) {
  const d = await press(k, 'walk');
  console.log(`  "${k}"  ${what.padEnd(34)} ${d.length ? 'CONFIRMED: ' + d.join(' | ') : 'no effect'}`);
}
await reset('walk');
const printFired = await page.evaluate(() => { window.__print = 0; const o = window.print; window.print = () => window.__print++; window.__origPrint = o; return true; });
await page.keyboard.press('Control+p');
await page.waitForTimeout(500);
const popups = page.context().pages().length;
console.log(`  "Ctrl+P"  routed to the printable Q&A (print-qa.js:59)   -> extra window opened: ${popups > 2}`);

console.log('\n=== SUMMARY ===');
const dead = results.filter(r => !r.worked);
console.log(`documented shortcuts tested: ${results.length}`);
console.log(`documented shortcuts that did NOTHING: ${dead.length}${dead.length ? ' -> ' + dead.map(d => d.k).join(', ') : ''}`);
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-shortcuts.json', JSON.stringify(results, null, 1));
console.log(`pageerrors: ${page.__errs.length}`);
await browser.close();
