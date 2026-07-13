/* kb-17: the shortcut guard vs the Numbers pane's shadow-DOM inputs.

   kb-16 tested the three text fields I could see from the light DOM (search / index / notes) and
   they were all clean — but they are clean for the WRONG REASON: they live inside overlays, and
   shell.js bails out entirely whenever an overlay is open. The tagName guard was never exercised.

   The four fields that DO exercise it are the estimation inputs on the Numbers pane:
       div.app main.stage div#num deep-numbers >> input#n_obj   (and n_size, n_proc, n_peak)
   They sit in the MAIN APP (no overlay open, so no bail-out) and inside a SHADOW ROOT. A keydown
   listener on `document` sees the event retargeted to the host, so:
       event.target.tagName === 'DEEP-NUMBERS'   // not 'INPUT'
   and the guard
       if (activeTag === 'input' || activeTag === 'textarea') return;     // shell.js:79
       if (tag === 'input' || tag === 'textarea') return;                 // focus-mode.js:63
   never fires. Prediction: typing into the Numbers calculator triggers the global shortcuts —
   the user is navigated off the pane mid-keystroke.
   NOTE 'e' is a legal character in a number field (scientific notation, "1e6"). */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
fs.mkdirSync(SHOTS, { recursive: true });

await page.evaluate(() => window.switchTab('num'));
await page.waitForTimeout(600);

const inputs = await page.evaluate(() => {
  const r = document.querySelector('#num deep-numbers').shadowRoot;
  return [...r.querySelectorAll('input')].map(i => ({ id: i.id, type: i.getAttribute('type'), value: i.value }));
});
console.log('Numbers-pane inputs (inside deep-numbers\' shadow root):');
inputs.forEach(i => console.log(`   #${i.id}  type=${i.type}  value="${i.value}"`));

/* what does the document-level listener actually SEE when you type in one of them? */
await page.evaluate(() => {
  window.__seen = [];
  document.addEventListener('keydown', e => {
    window.__seen.push({ key: e.key, targetTag: (e.target.tagName || '').toLowerCase(), pathTop: (e.composedPath()[0].tagName || '').toLowerCase() });
  }, true);
});
await page.evaluate(() => document.querySelector('#num deep-numbers').shadowRoot.getElementById('n_obj').focus());
await page.waitForTimeout(150);
await page.keyboard.press('q');
await page.waitForTimeout(200);
const seen = await page.evaluate(() => window.__seen.slice(-1)[0]);
console.log(`\nkeydown as seen by a listener on \`document\` while typing in #n_obj:`);
console.log(`   event.target.tagName      = "${seen.targetTag}"   <-- what the guard tests`);
console.log(`   composedPath()[0].tagName = "${seen.pathTop}"   <-- what it actually is`);
console.log(`   => the guard compares "${seen.targetTag}" against "input"/"textarea" and lets the shortcut through.`);

const snap = () => page.evaluate(() => ({
  pane: [...document.querySelectorAll('.pane')].find(p => p.classList.contains('on'))?.id,
  density: document.documentElement.dataset.density || 'default',
  focusMode: document.querySelector('.app')?.classList.contains('_focus-mode') || false,
  tour: !!(window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()),
  topic: window.TopicRegistry?.current?.().id,
  searchOpen: !!(window.SearchOverlay && window.SearchOverlay.isOpen && window.SearchOverlay.isOpen()),
  indexOpen: !!document.getElementById('_index-overlay')?.classList.contains('open'),
}));

const KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'v', 'd', 'f', 'g', '[', ']', '\\', '/'];
console.log(`\n=== typing each key into #n_obj (a number field on the Numbers pane) ===`);
console.log('key   pane      density   focusMode  tour   topic                 search  index   effect');
const leaks = [];
for (const k of KEYS) {
  // reset to a clean state on the num pane, focus the field
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.evaluate(() => { window.switchTab('num'); const a = document.querySelector('.app'); a.classList.remove('_focus-mode'); delete document.documentElement.dataset.density; });
  await page.waitForTimeout(250);
  const ok = await page.evaluate(() => {
    const host = document.querySelector('#num deep-numbers');
    const i = host && host.shadowRoot && host.shadowRoot.getElementById('n_obj');
    if (!i) return false;                    // the pane/topic may have been rebuilt under us
    i.focus(); return true;
  });
  if (!ok) { console.log(`${k.padEnd(5)} (could not re-focus #n_obj — the pane was rebuilt)`); continue; }
  await page.waitForTimeout(120);
  const b = await snap();
  await page.keyboard.press(k);
  await page.waitForTimeout(280);
  const a = await snap();
  const diffs = [];
  for (const p of ['pane', 'density', 'focusMode', 'tour', 'topic', 'searchOpen', 'indexOpen']) if (String(a[p]) !== String(b[p])) diffs.push(`${p}: ${b[p]} -> ${a[p]}`);
  if (diffs.length) leaks.push({ k, diffs });
  console.log(`${k.padEnd(5)} ${String(a.pane).padEnd(9)} ${String(a.density).padEnd(9)} ${String(a.focusMode).padEnd(10)} ${String(a.tour).padEnd(6)} ${String(a.topic).slice(0, 20).padEnd(21)} ${String(a.searchOpen).padEnd(7)} ${String(a.indexOpen).padEnd(7)} ${diffs.length ? 'LEAK: ' + diffs.join(' | ') : '-'}`);
}

console.log(`\n=== RESULT ===`);
console.log(`keys that fired a global shortcut while the user was typing in a text field: ${leaks.length} / ${KEYS.length}`);
leaks.forEach(l => console.log(`   "${l.k}"  ->  ${l.diffs.join(' | ')}`));

/* the money shot: type a legal number-field value containing 'e' */
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
await page.evaluate(() => window.switchTab('num'));
await page.waitForTimeout(300);
await page.evaluate(() => { const i = document.querySelector('#num deep-numbers')?.shadowRoot?.getElementById('n_obj'); if (i) { i.value = ''; i.focus(); } });
await page.keyboard.type('1e6', { delay: 120 });
await page.waitForTimeout(400);
const after = await snap();
const val = await page.evaluate(() => document.querySelector('#num deep-numbers')?.shadowRoot?.getElementById('n_obj')?.value ?? '(input gone — pane rebuilt)');
console.log(`\ntyped "1e6" (valid scientific notation for a number input):`);
console.log(`   field now contains : "${val}"`);
console.log(`   active pane        : ${after.pane}  ${after.pane !== 'num' ? '<-- the "e" navigated the user OFF the Numbers pane mid-entry' : ''}`);
await page.screenshot({ path: `${SHOTS}/numleak-01-typed-1e6.png` });

console.log(`\npageerrors: ${page.__errs.length}`);
await browser.close();
