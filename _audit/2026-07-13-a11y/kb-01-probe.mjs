/* kb-01: instrument calibration BEFORE any finding is claimed.
   Q1. Does the app boot, and how many tabbable controls exist (incl. shadow DOM)?
   Q2. Does a scripted el.focus() match :focus-visible? If NO, every focus measurement in this
       lens MUST be driven by real Tab keypresses — a scripted focus would paint no ring and
       my check would report "no focus indicator" on 100% of controls: a false-positive machine.
       This question decides the architecture of every script that follows. */
import { open, inject, active } from './kb-lib.mjs';

const { browser, page } = await open();
await inject(page);

const boot = await page.evaluate(() => ({
  title: document.title,
  group: document.documentElement.getAttribute('data-group'),
  theme: document.documentElement.getAttribute('data-theme') || document.body.className,
  panes: [...document.querySelectorAll('.pane')].map(p => p.id),
  segs: [...document.querySelectorAll('.seg button')].map(b => b.getAttribute('data-tab')),
  focusables: window.__kb.all().length,
  inShadow: window.__kb.all().filter(e => e.getRootNode() instanceof ShadowRoot).length,
}));
console.log('BOOT', JSON.stringify(boot, null, 1));
console.log('pageerrors:', page.__errs.length, page.__errs.slice(0, 3));

/* --- Q2: the :focus-visible modality probe --- */
const probe = await page.evaluate(() => {
  const b = document.querySelector('.seg button');
  b.focus();
  return { tag: b.tagName, focusVisible: b.matches(':focus-visible'), isActive: document.activeElement === b };
});
console.log('\nSCRIPTED .focus() on .seg button ->', JSON.stringify(probe));

// now establish keyboard modality with a real Tab, then re-try scripted focus
await page.keyboard.press('Tab');
const afterTab = await page.evaluate(() => {
  const b = document.querySelector('.seg button');
  b.focus();
  return { focusVisible: b.matches(':focus-visible') };
});
console.log('SCRIPTED .focus() AFTER a real Tab   ->', JSON.stringify(afterTab));

// and what a pure Tab-walk focuses
await page.evaluate(() => document.activeElement.blur());
const walk = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('Tab');
  const a = await active(page);
  walk.push(a ? `${a.path} | fv=${a.focusVisible}` : 'null');
}
console.log('\nFirst 6 Tab stops (deep):');
walk.forEach((w, i) => console.log(` ${i + 1}. ${w}`));

await browser.close();
