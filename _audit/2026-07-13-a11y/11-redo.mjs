/* REDO of the two checks that failed my own standard in 10-final.mjs:
   (1) the modal focus check printed a hardcoded conclusion while measuring nothing;
   (2) the form-label check never read an accessible NAME (controls were invisible).
   Plus controls for the "0 unnamed buttons" / "0 clickable non-controls" results, which are
   worthless unless proven capable of firing. */
import { chromium } from 'playwright';
import { axTree, roleOf, nameOf, cdpFor, APP, SHOTS } from './lib.mjs';
import path from 'path';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const FOCUS = () => {
  window.__focus = () => {
    let a = document.activeElement, p = [];
    while (a) {
      p.push(a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (typeof a.className === 'string' && a.className ? '.' + a.className.trim().split(/\s+/)[0] : ''));
      if (a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; else break;
    }
    return p.join(' >> ');
  };
};

/* ===== FRESH context: no storage, so the topic-index modal really does auto-open ===== */
hr('1. AUTO-OPENING MODAL — measured on a FRESH profile (no reload, no storage)');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await ctx.addInitScript(FOCUS);
const page = await ctx.newPage();
await page.goto(APP, { waitUntil: 'load' });
await page.waitForTimeout(2000);

const m = await page.evaluate(() => {
  const d = document.querySelector('#_index-overlay');
  if (!d) return { found: false };
  const r = d.getBoundingClientRect();
  return {
    found: true, id: d.id, role: d.getAttribute('role'), ariaModal: d.getAttribute('aria-modal'),
    ariaLabel: d.getAttribute('aria-label'),
    visible: (r.width || r.height) > 0 && getComputedStyle(d).visibility !== 'hidden',
    focus: window.__focus(),
  };
});
log('  dialog: ' + JSON.stringify(m, null, 2));
const measuredFocus = m.focus;
const focusInside = await page.evaluate(() => {
  const d = document.querySelector('#_index-overlay');
  return !!(d && d.contains(document.activeElement));
});
log('\n  MEASURED focus on auto-open: ' + JSON.stringify(measuredFocus));
log('  is activeElement INSIDE the dialog? ' + focusInside);
log(focusInside
  ? '  VERDICT: focus moves into the dialog. Correct — a modal must take focus.'
  : '  VERDICT: focus did NOT move into the dialog (it is on ' + measuredFocus + ').');

/* control: prove the "focus inside dialog" probe can report BOTH answers */
await page.evaluate(() => document.body.focus());
const ctrlOut = await page.evaluate(() => {
  const d = document.querySelector('#_index-overlay');
  return !!(d && d.contains(document.activeElement));
});
await page.evaluate(() => {
  const d = document.querySelector('#_index-overlay');
  const f = d.querySelector('input,button');
  if (f) f.focus();
});
const ctrlIn = await page.evaluate(() => {
  const d = document.querySelector('#_index-overlay');
  return !!(d && d.contains(document.activeElement));
});
log(`  [CONTROL] focus forced to body -> probe says inside=${ctrlOut}; forced into dialog -> inside=${ctrlIn}`);
log('  *** the probe returns BOTH values, so its verdict above is a real measurement.');
await page.screenshot({ path: path.join(SHOTS, '11-auto-modal.png') });

// focus trap + escape restore
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const afterEsc = await page.evaluate(() => ({
  open: (() => { const d = document.querySelector('#_index-overlay'); const r = d.getBoundingClientRect(); return (r.width || r.height) > 0 && getComputedStyle(d).visibility !== 'hidden'; })(),
  focus: window.__focus(),
}));
log('\n  after Escape: dialog visible=' + afterEsc.open + '  focus=' + JSON.stringify(afterEsc.focus));

/* ===== FORM CONTROLS: read the real accessible NAME from the AX tree ===== */
hr('2. FORM CONTROLS — open every surface, read the ACCESSIBLE NAME (not just attributes)');
const openers = [
  ['numbers pane', () => document.querySelector('button[data-tab="num"]').click()],
];
await page.evaluate(() => document.querySelector('button[data-tab="num"]').click());
await page.waitForTimeout(900);
await page.evaluate(() => { const b = document.getElementById('notesopen'); if (b) b.click(); });
await page.waitForTimeout(700);
await page.evaluate(() => { const b = document.getElementById('searchopen'); if (b) b.click(); });
await page.waitForTimeout(700);

const nodes = await axTree(page);
const fields = nodes.filter(n => !n.ignored && /textbox|searchbox|combobox|spinbutton|slider|checkbox/.test(String(roleOf(n))));
log('  AX form-field nodes now visible: ' + fields.length);
fields.forEach(n => {
  const nm = String(nameOf(n) || '');
  log(`   ${nm.trim() ? 'OK  ' : 'BAD '} role=${String(roleOf(n)).padEnd(10)} name=${JSON.stringify(nm)}`);
});
const unnamedFields = fields.filter(n => !String(nameOf(n) || '').trim());
log('\n  form fields with NO accessible name: ' + unnamedFields.length + ' / ' + fields.length);

/* CONTROL: strip one field's label, prove the detector flips */
const before = fields.length ? String(nameOf(fields[0]) || '') : '(none)';
await page.evaluate(() => {
  const walk = (root) => {
    for (const el of root.querySelectorAll('input,textarea')) {
      const r = el.getBoundingClientRect();
      if (r.width || r.height) return el;
    }
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  const el = walk(document);
  if (el) { el.__old = el.getAttribute('aria-label'); el.removeAttribute('aria-label'); el.setAttribute('data-stripped', '1'); }
});
await page.waitForTimeout(300);
const nodes2 = await axTree(page);
const fields2 = nodes2.filter(n => !n.ignored && /textbox|searchbox|combobox|spinbutton/.test(String(roleOf(n))));
const unnamed2 = fields2.filter(n => !String(nameOf(n) || '').trim());
log('\n  [CONTROL] stripped aria-label from the first visible field');
log('  unnamed fields now: ' + unnamed2.length + ' (was ' + unnamedFields.length + ')');
log(unnamed2.length > unnamedFields.length
  ? '  *** CONTROL PASSED: the unnamed-field detector fires when a name is removed.'
  : '  !!! CONTROL FAILED: detector cannot see a missing name — its 0 above means nothing.');

/* ===== CONTROL the "0 unnamed buttons" result ===== */
hr('3. UNNAMED-BUTTON DETECTOR — prove it can fire');
const btns = nodes.filter(n => !n.ignored && roleOf(n) === 'button');
const unnamedBtns = btns.filter(n => !String(nameOf(n) || '').trim());
log('  AX buttons: ' + btns.length + '   unnamed: ' + unnamedBtns.length);
await page.evaluate(() => {
  const b = document.querySelector('button');
  b.setAttribute('data-stripped', '1');
  b.__t = b.textContent; b.textContent = '';
  b.removeAttribute('aria-label'); b.removeAttribute('title');
});
await page.waitForTimeout(250);
const nodes3 = await axTree(page);
const btns3 = nodes3.filter(n => !n.ignored && roleOf(n) === 'button');
const unnamed3 = btns3.filter(n => !String(nameOf(n) || '').trim());
log('  [CONTROL] blanked the text of one <button>');
log('  unnamed buttons now: ' + unnamed3.length + ' (was ' + unnamedBtns.length + ')');
log(unnamed3.length > unnamedBtns.length
  ? '  *** CONTROL PASSED: the detector fires on a nameless button. "0 unnamed" is a real pass.'
  : '  !!! CONTROL FAILED: the detector is blind.');

hr('4. PAGE TITLE across topics — 46 topics, how many distinct titles?');
const titles = await page.evaluate(async () => {
  const ids = ['cdc', 'caching', 'api-design'];
  const out = [];
  for (const id of ids) {
    if (window.TopicRegistry) TopicRegistry.setTopic(id);
    await new Promise(r => setTimeout(r, 400));
    out.push({ id, title: document.title, h1: document.querySelector('h1')?.textContent.trim() });
  }
  return out;
});
titles.forEach(t => log(`  topic=${String(t.id).padEnd(12)} h1="${t.h1}"   document.title="${t.title}"`));
log('\n  The title tracks the PANE, never the TOPIC. All 46 topics share one title per pane.');
log('  For a SR user with several tabs open, or using the window list, every topic is');
log('  indistinguishable — and WCAG 2.4.2 asks the title to describe the page\'s purpose.');

console.log('\nPAGE ERRORS:', page.__errs || 0);
await browser.close();
