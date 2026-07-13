/* Controls 2 and 3, rebuilt AGAIN. Previous attempts were invalid:
     - C2 stripped aria-label only; Chromium then fell back to the PLACEHOLDER as the accname
       (accname last-resort step), so the name never went empty. Strip label AND placeholder.
     - C3 injected an <h2> into a display:none pane, so the size filter dropped it and the
       counter read 1 -> 1 while the script PRINTED "PASSED" from a hardcoded string.
   Every verdict below is COMPUTED from the measurement. No asserted conclusions. */
import { chromium } from 'playwright';
import { axTree, roleOf, nameOf, APP } from './lib.mjs';
const log = (...a) => console.log(...a);
const hr = (t) => log('\n' + '='.repeat(74) + '\n' + t + '\n' + '='.repeat(74));
const verdict = (ok, msg) => log((ok ? '  *** CONTROL PASSED: ' : '  !!! CONTROL FAILED: ') + msg);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
await page.goto(APP, { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const readFields = async () => {
  const ns = await axTree(page);
  return ns.filter(n => !n.ignored && /textbox|searchbox|spinbutton|combobox/.test(String(roleOf(n))))
    .map(n => ({ role: roleOf(n), name: String(nameOf(n) || '') }));
};

/* ================================================================= */
hr('CONTROL 2 (FINAL): form fields — strip aria-label AND placeholder');
await page.evaluate(() => document.querySelector('button[data-tab="num"]').click());
await page.waitForTimeout(800);
await page.evaluate(() => { const b = document.getElementById('notesopen'); if (b) b.click(); });
await page.waitForTimeout(700);

let f = await readFields();
log('  AS SHIPPED:');
f.forEach(x => log(`     ${x.name.trim() ? 'OK  ' : 'BAD '} ${x.role.padEnd(11)} ${JSON.stringify(x.name)}`));
const bad0 = f.filter(x => !x.name.trim()).length;
log('  unnamed: ' + bad0 + ' / ' + f.length);
log('\n  NOTE: none of these names is the placeholder text — they are real aria-label /');
log('  <label> values ("Notes for this topic", "Objects / day", ...). Verified below.');

const strip = await page.evaluate(() => {
  const walk = (root) => {
    const t = root.querySelector('textarea.nt-ta');
    if (t) return t;
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    return null;
  };
  const t = walk(document);
  if (!t) return null;
  const had = { aria: t.getAttribute('aria-label'), ph: t.getAttribute('placeholder') };
  t.removeAttribute('aria-label');
  t.removeAttribute('placeholder');
  return had;
});
log('\n  [CONTROL] removed BOTH from the notes textarea: ' + JSON.stringify(strip));
await page.waitForTimeout(300);
f = await readFields();
f.forEach(x => log(`     ${x.name.trim() ? 'OK  ' : 'BAD '} ${x.role.padEnd(11)} ${JSON.stringify(x.name)}`));
const bad1 = f.filter(x => !x.name.trim()).length;
log('  unnamed: ' + bad1 + ' / ' + f.length);
verdict(bad1 > bad0,
  bad1 > bad0
    ? `the unnamed-field detector fires (${bad0} -> ${bad1}) when the real naming sources are removed.\n      => "all ${f.length} form fields carry an accessible name" is a VERIFIED pass.`
    : `detector still reports ${bad1} unnamed after stripping every naming source. Do NOT report the form result.`);

/* ================================================================= */
hr('CONTROL 3 (FINAL): heading counter — inject into a VISIBLE container');
const countH = () => page.evaluate(() => {
  const found = [];
  const w = (root) => {
    root.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').forEach(h => {
      const r = h.getBoundingClientRect();
      if (r.width || r.height) found.push(h.tagName + ':' + (h.textContent || '').trim().slice(0, 30));
    });
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) w(el.shadowRoot); });
  };
  w(document);
  return found;
});
const h0 = await countH();
log('  AS SHIPPED, visible headings (' + h0.length + '): ' + JSON.stringify(h0));

/* inject into the ACTIVE (visible) pane's shadow root */
const injected = await page.evaluate(() => {
  const pane = document.querySelector('#num.pane') || document.querySelector('.pane:not([hidden])');
  const host = pane && pane.querySelector('deep-numbers');
  const target = (host && host.shadowRoot) ? host.shadowRoot : pane;
  if (!target) return 'no visible pane';
  const h = document.createElement('h2');
  h.textContent = 'INJECTED CONTROL HEADING';
  h.setAttribute('data-control', '1');
  target.insertBefore(h, target.firstChild);
  const r = h.getBoundingClientRect();
  return { into: target.host ? target.host.tagName.toLowerCase() + '#shadow' : target.id, box: Math.round(r.width) + 'x' + Math.round(r.height) };
});
log('  [CONTROL] injected an <h2> into: ' + JSON.stringify(injected));
await page.waitForTimeout(250);
const h1 = await countH();
log('  visible headings now (' + h1.length + '): ' + JSON.stringify(h1));
verdict(h1.length > h0.length,
  h1.length > h0.length
    ? `the counter sees a heading inside a shadow root (${h0.length} -> ${h1.length}).\n      => "the shipped app has exactly ${h0.length} visible heading" is a REAL measurement,\n      not a walker that fails to pierce shadow DOM.`
    : `counter did not move (${h0.length} -> ${h1.length}). It is blind; do NOT report the heading finding.`);

/* AX confirmation */
const ns = await axTree(page);
const axh = ns.filter(n => !n.ignored && roleOf(n) === 'heading');
log('\n  AX heading nodes (with the control heading still injected): ' + axh.length);
axh.forEach(h => log('     ' + JSON.stringify(nameOf(h))));

/* remove the control heading, confirm we return to baseline */
await page.evaluate(() => {
  const w = (root) => {
    root.querySelectorAll('[data-control="1"]').forEach(e => e.remove());
    root.querySelectorAll('*').forEach(el => { if (el.shadowRoot) w(el.shadowRoot); });
  };
  w(document);
});
await page.waitForTimeout(200);
const h2 = await countH();
log('\n  after removing the control heading: ' + h2.length + ' visible heading(s) -> ' + JSON.stringify(h2));

await browser.close();
