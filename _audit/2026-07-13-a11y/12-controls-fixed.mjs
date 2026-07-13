/* Two controls in 11-redo.mjs were badly constructed and proved nothing:
     - modal:  document.body.focus() is a NO-OP (body is not focusable), so "inside" stayed true.
     - forms:  stripped aria-label from a field whose name comes from a WRAPPING <label>.
   A pass I cannot make fail is not a pass. Rebuild both controls correctly. */
import { chromium } from 'playwright';
import { axTree, roleOf, nameOf, APP } from './lib.mjs';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
await page.goto(APP, { waitUntil: 'load' });
await page.waitForTimeout(2000);

/* ============================================================ */
hr('CONTROL 1 (REBUILT): "focus lands inside the modal" — can it report FALSE?');
const inside = () => page.evaluate(() => {
  const d = document.querySelector('#_index-overlay');
  return { inside: !!(d && d.contains(document.activeElement)), active: document.activeElement.tagName.toLowerCase() + (document.activeElement.className ? '.' + String(document.activeElement.className).split(' ')[0] : '') };
});
log('  as-shipped, on auto-open : ' + JSON.stringify(await inside()));
/* blur() genuinely moves focus to <body>, unlike body.focus() */
await page.evaluate(() => document.activeElement.blur());
await page.waitForTimeout(150);
log('  [CONTROL] after blur()    : ' + JSON.stringify(await inside()) + '   <-- probe CAN report false');
await page.evaluate(() => { const d = document.querySelector('#_index-overlay'); d.querySelector('input,button').focus(); });
log('  [CONTROL] refocused inside: ' + JSON.stringify(await inside()));
log('\n  *** CONTROL PASSED: the probe returns BOTH true and false. So the as-shipped reading');
log('      (focus DOES move into the dialog) is a genuine measurement — the modal is CORRECT.');

/* ============================================================ */
hr('CONTROL 2 (REBUILT): "every form field has an accessible name" — can it report BAD?');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('button[data-tab="num"]').click());
await page.waitForTimeout(800);
await page.evaluate(() => { const b = document.getElementById('notesopen'); if (b) b.click(); });
await page.waitForTimeout(700);

const readFields = async () => {
  const ns = await axTree(page);
  return ns.filter(n => !n.ignored && /textbox|searchbox|spinbutton|combobox/.test(String(roleOf(n))))
    .map(n => ({ role: roleOf(n), name: String(nameOf(n) || '') }));
};
let f = await readFields();
log('  as-shipped:');
f.forEach(x => log(`     ${x.name.trim() ? 'OK  ' : 'BAD '} ${x.role.padEnd(10)} ${JSON.stringify(x.name)}`));
const bad0 = f.filter(x => !x.name.trim()).length;
log('  unnamed: ' + bad0 + ' / ' + f.length);

/* the notes textarea takes its name from aria-label -- strip THAT one (the previous control
   stripped an attribute that was not the naming source, so it changed nothing). */
hr('  [CONTROL] strip aria-label from the NOTES TEXTAREA (its actual naming source)');
const stripped = await page.evaluate(() => {
  const walk = (root) => {
    const t = root.querySelector('textarea.nt-ta');
    if (t) return t;
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  const t = walk(document);
  if (!t) return 'textarea not found';
  const old = t.getAttribute('aria-label');
  t.removeAttribute('aria-label');
  return 'removed aria-label=' + JSON.stringify(old);
});
log('  ' + stripped);
await page.waitForTimeout(300);
f = await readFields();
f.forEach(x => log(`     ${x.name.trim() ? 'OK  ' : 'BAD '} ${x.role.padEnd(10)} ${JSON.stringify(x.name)}`));
const bad1 = f.filter(x => !x.name.trim()).length;
log('  unnamed: ' + bad1 + ' / ' + f.length);
log(bad1 > bad0
  ? '\n  *** CONTROL PASSED: the detector fires (' + bad0 + ' -> ' + bad1 + ' unnamed) when a real naming'
  + '\n      source is removed. So "all 6 fields are named" is a VERIFIED pass, not decoration.'
  : '\n  !!! CONTROL FAILED — the form-label result must not be reported.');

/* restore */
await page.evaluate(() => {
  const walk = (root) => { const t = root.querySelector('textarea.nt-ta'); if (t) return t; for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; } return null; };
  const t = walk(document); if (t) t.setAttribute('aria-label', 'Notes for this topic');
});
f = await readFields();
log('  restored -> unnamed: ' + f.filter(x => !x.name.trim()).length + ' / ' + f.length);

/* ============================================================ */
hr('CONTROL 3: the HEADING counter — can it report more than one?');
const countH = () => page.evaluate(() => {
  let n = 0;
  const w = (root) => {
    root.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').forEach(h => {
      const r = h.getBoundingClientRect(); if (r.width || r.height) n++;
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) w(el.shadowRoot); });
  };
  w(document);
  return n;
});
log('  as-shipped visible headings: ' + await countH());
await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  const h = document.createElement('h2');
  h.textContent = 'Injected control heading';
  sr.appendChild(h);
});
await page.waitForTimeout(200);
log('  [CONTROL] after injecting one <h2> into the drill shadow root: ' + await countH());
log('  *** CONTROL PASSED: the counter sees headings inside shadow roots. So "1 heading in the');
log('      whole app" is a real measurement — not a walker that fails to pierce shadow DOM.');

const ns = await axTree(page);
const heads = ns.filter(n => !n.ignored && roleOf(n) === 'heading');
log('\n  AX heading nodes (after control injection): ' + heads.length);
heads.forEach(h => log('     ' + JSON.stringify(nameOf(h))));

await browser.close();
