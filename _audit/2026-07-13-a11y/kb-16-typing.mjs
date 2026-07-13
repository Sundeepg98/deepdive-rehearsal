/* kb-16: (a) finish the Search overlay properly (kb-14's detector required a `.open` class the
   search overlay never sets — my blind spot, now using its isOpen() API), and
   (b) THE CLASSIC BUG: do the global single-letter shortcuts fire WHILE THE USER IS TYPING?

   The app guards typing like this (shell.js:78, focus-mode.js:61):
       const activeTag = (event.target.tagName || '').toLowerCase();
       if (activeTag === 'input' || activeTag === 'textarea') return;
   That reads event.target. For an input inside a SHADOW ROOT, a listener on `document` sees the
   event RETARGETED to the shadow HOST — tagName 'DEEP-SESSION', not 'INPUT'. So the guard would
   silently not apply to any shadow-DOM text field. Enumerate every text field in the app, note
   which live in a shadow root, then type the shortcut letters into each and watch for side
   effects (pane switch, density cycle, focus-mode toggle, tour start, overlay open). */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => window.switchTab('walk'));
await page.waitForTimeout(300);
fs.mkdirSync(SHOTS, { recursive: true });

/* ---------- A. Search overlay: trap + restore, using its real API ---------- */
console.log('=== A. Search overlay (re-tested with its isOpen() API, not a .open class) ===');
await page.evaluate(() => document.getElementById('searchopen').focus());
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
const inside = () => page.evaluate(() => {
  const el = document.getElementById('_search-overlay');
  const a = window.__kb.deepActive();
  return !!(el && a && el.contains(a));
});
console.log(`  opens on Enter            : ${await page.evaluate(() => window.SearchOverlay.isOpen())}`);
console.log(`  focus moved into it       : ${await inside()}  (${await page.evaluate(() => window.__kb.deepActive().tagName)})`);
let esc = 0;
for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); if (!(await inside())) esc++; }
console.log(`  Tab trapped inside        : ${esc === 0}  (escaped ${esc}/25)`);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const closed = await page.evaluate(() => window.SearchOverlay.isOpen());
const restoredTo = await page.evaluate(() => { const a = window.__kb.deepActive(); return a ? (a.id || a.tagName) : 'BODY'; });
console.log(`  Escape closes             : ${!closed}`);
console.log(`  focus restored to trigger : ${restoredTo === 'searchopen'}  (landed on "${restoredTo}")`);

/* ---------- B. enumerate every text field, flag the shadow-DOM ones ---------- */
console.log('\n=== B. text fields in the app ===');
const fields = await page.evaluate(() => {
  const out = [];
  (function walk(root) {
    root.querySelectorAll('input,textarea,[contenteditable=""],[contenteditable="true"]').forEach(el => {
      const t = (el.getAttribute('type') || 'text').toLowerCase();
      if (['checkbox', 'radio', 'button', 'submit', 'range'].includes(t)) return;
      out.push({ path: window.__kb.path(el), inShadow: el.getRootNode() instanceof ShadowRoot, tag: el.tagName, id: el.id, cls: String(el.className).slice(0, 24) });
    });
    root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
  })(document);
  return out;
});
fields.forEach(f => console.log(`  ${f.inShadow ? 'SHADOW' : 'light '}  ${f.tag.padEnd(9)} ${(f.id || f.cls).padEnd(18)} ${f.path.slice(-52)}`));
console.log(`  (${fields.filter(f => f.inShadow).length} of ${fields.length} live inside a shadow root)`);

/* ---------- C. type the shortcut letters into each field; watch for side effects ---------- */
const KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'v', 'd', 'g', 'f', '[', ']'];
async function snap() {
  return page.evaluate(() => ({
    pane: [...document.querySelectorAll('.pane')].find(p => p.classList.contains('on'))?.id,
    density: document.documentElement.dataset.density || 'default',
    focusMode: document.querySelector('.app')?.classList.contains('_focus-mode') || false,
    tour: !!(window.TourGuide && window.TourGuide.isActive && window.TourGuide.isActive()),
    topic: window.TopicRegistry && window.TopicRegistry.current ? window.TopicRegistry.current().id : '?',
  }));
}

/* open each field's host overlay, focus the field, type, compare */
const CASES = [
  { name: 'Search overlay input', openFn: async () => { await page.evaluate(() => window.SearchOverlay.open()); }, sel: () => page.$('#_search-overlay input') },
  { name: 'Index overlay filter', openFn: async () => { await page.evaluate(() => window.IndexOverlay.open()); }, sel: () => page.$('#_index-overlay .ix-filter') },
  { name: 'Notes overlay textarea', openFn: async () => { await page.evaluate(() => document.getElementById('notesopen').click()); }, sel: () => page.$('.nt-ta') },
];

console.log('\n=== C. do the global shortcuts fire while typing in a text field? ===');
for (const c of CASES) {
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => window.switchTab('walk')); await page.waitForTimeout(200);
  await c.openFn();
  await page.waitForTimeout(600);
  const el = await c.sel();
  if (!el) { console.log(`  ${c.name}: field not found, skipped`); continue; }
  await el.focus();
  await page.waitForTimeout(150);
  const before = await snap();
  let leaked = [];
  for (const k of KEYS) {
    await page.keyboard.press(k);
    await page.waitForTimeout(90);
    const now = await snap();
    for (const prop of ['pane', 'density', 'focusMode', 'tour', 'topic']) {
      if (now[prop] !== before[prop]) { leaked.push(`"${k}" changed ${prop}: ${before[prop]} -> ${now[prop]}`); }
    }
    if (leaked.length) break;
  }
  const typed = await el.evaluate(e => e.value !== undefined ? e.value : e.textContent);
  console.log(`  ${c.name.padEnd(24)} typed="${String(typed).slice(0, 18)}"  ${leaked.length ? 'LEAK: ' + leaked.join(', ') : 'no shortcut fired (correct)'}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
}

console.log(`\npageerrors: ${page.__errs.length}`);
await browser.close();
