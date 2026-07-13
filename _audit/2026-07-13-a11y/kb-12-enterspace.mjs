/* kb-12: THE ENTER/SPACE INTERCEPT.
   shell.js:100-107 (document-level keydown, fires no matter WHERE focus is):

       } else if (current === 'drill') {
         const dd = document.querySelector('#drill deep-drill');
         if (dd) {
           const r = dd.shadowRoot;
           const advBtn = r.getElementById('adv');
           if ((event.key === ' ' || event.key === 'Enter') && advBtn) { event.preventDefault(); advBtn.click(); }

   It is gated on the ACTIVE PANE (`current === 'drill'`), never on where focus actually is. So
   while the Probe Drill pane is showing, every Enter and every Space anywhere in the document
   should be preventDefault()-ed and redirected into the drill's advance button — including when
   focus is on a completely unrelated control in the sidebar.

   For a MOUSE user this is invisible (they never keyboard-activate anything). For a KEYBOARD
   user it would mean: while on the drill, Enter/Space no longer activate the button you are
   focused on. That is WCAG 2.1.1 Keyboard — the standard activation keys stop working.

   Prove or refute it by driving real keys and watching what actually fired. */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
fs.mkdirSync(SHOTS, { recursive: true });

/* instrument the app: record every click that actually lands, on any element, incl. shadow DOM */
await page.evaluate(() => {
  window.__clicks = [];
  document.addEventListener('click', e => {
    const t = e.composedPath()[0];
    window.__clicks.push((t.id || t.className || t.tagName || '?').toString().slice(0, 40));
  }, true);
});
const clicks = () => page.evaluate(() => { const c = window.__clicks.slice(); window.__clicks = []; return c; });
const pane = () => page.evaluate(() => [...document.querySelectorAll('.pane')].find(p => p.classList.contains('on'))?.id || '?');
const drillState = () => page.evaluate(() => {
  const dd = document.querySelector('#drill deep-drill');
  if (!dd || !dd.shadowRoot) return null;
  const r = dd.shadowRoot;
  const adv = r.getElementById('adv');
  return { advText: adv ? adv.textContent.trim().slice(0, 26) : null, counter: (r.querySelector('.ctr, #ctr') || {}).textContent || '' };
});

/* ---------- baseline: on a NON-drill pane, does Enter activate the focused button? ---------- */
console.log('=== CONTROL: on the WALKTHROUGH pane (current !== "drill") ===');
await page.evaluate(() => window.switchTab('walk'));
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('themetog').focus());
await clicks();
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
const c1 = await clicks();
console.log(`  focus on #themetog, pressed Enter -> clicks fired: ${JSON.stringify(c1)}`);
console.log(`  ${c1.some(x => x.includes('themetog')) ? 'OK — the focused button activated, as a keyboard user expects.' : 'the focused button did NOT activate'}`);

/* ---------- now the drill pane ---------- */
console.log('\n=== SUBJECT: switch to the PROBE DRILL pane, focus stays on a SIDEBAR button ===');
await page.evaluate(() => window.switchTab('drill'));
await page.waitForTimeout(500);
console.log(`  active pane: ${await pane()}`);

const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.body.className);
await page.evaluate(() => document.getElementById('themetog').focus());
const focusedNow = await page.evaluate(() => window.__kb.label(window.__kb.deepActive()));
console.log(`  focus is on: "${focusedNow.slice(0, 30)}"  (a sidebar button, nowhere near the drill)`);
const dBefore = await drillState();
await clicks();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
const c2 = await clicks();
const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.body.className);
const dAfter = await drillState();
console.log(`\n  pressed Enter. clicks that actually fired: ${JSON.stringify(c2)}`);
console.log(`  theme toggled?  ${themeBefore} -> ${themeAfter}   ${themeBefore !== themeAfter ? 'YES (button worked)' : 'NO — the focused button did NOT activate'}`);
console.log(`  drill advanced? "${dBefore?.advText}" -> "${dAfter?.advText}"  ${JSON.stringify(dBefore) !== JSON.stringify(dAfter) ? 'YES — Enter was stolen by the drill' : 'no'}`);

const stolen = themeBefore === themeAfter && c2.some(x => x.includes('adv'));
console.log(`\n  ${stolen ? '*** CONFIRMED: Enter was hijacked. The focused control never fired; the drill advanced instead. ***' : '  (not reproduced this way)'}`);

/* ---------- Space, same setup ---------- */
await page.evaluate(() => document.getElementById('themetog').focus());
const t2Before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
await clicks();
await page.keyboard.press('Space');
await page.waitForTimeout(400);
const c3 = await clicks();
const t2After = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
console.log(`\n  pressed Space with focus on #themetog -> clicks: ${JSON.stringify(c3)}   theme ${t2Before}->${t2After} ${t2Before === t2After ? '(did NOT activate)' : '(activated)'}`);

/* ---------- can you GRADE the drill by keyboard? focus a grade button, press Enter ---------- */
console.log('\n=== Can a keyboard user operate the drill\'s OWN grade buttons? ===');
// reveal the answer first so the judge row exists
await page.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot; r.getElementById('adv').click(); });
await page.waitForTimeout(500);
const hasJudge = await page.evaluate(() => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg'));
console.log(`  after reveal, grade buttons present: ${hasJudge}`);
if (hasJudge) {
  await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('jg').focus());
  const f = await page.evaluate(() => window.__kb.label(window.__kb.deepActive()));
  console.log(`  focus moved to the grade button: "${f.slice(0, 24)}"`);
  await clicks();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const c4 = await clicks();
  console.log(`  pressed Enter -> clicks fired: ${JSON.stringify(c4)}`);
  const gradedNotAdvanced = c4.some(x => x.includes('jg'));
  console.log(`  ${gradedNotAdvanced ? 'the grade button fired' : '*** the grade button did NOT fire — Enter hit #adv instead. You cannot grade with Enter. ***'}`);
}
await page.screenshot({ path: `${SHOTS}/enterspace-01-drill.png` });
console.log(`\npageerrors: ${page.__errs.length}`);
await browser.close();
