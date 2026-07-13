/* kb-13: the exact scope + worst consequence of the Enter/Space intercept.

   Mechanism (now fully pinned):
     drill/logic.js:319  `if (stage < maxStage) { ...<button id="adv">... } else { ...judge row... }`
       -> #adv and the grade buttons #jm/#js/#jg are MUTUALLY EXCLUSIVE.
     shell.js:104        `if ((key===' '||key==='Enter') && advBtn) { preventDefault(); advBtn.click(); }`
       -> the intercept is live exactly while #adv exists, i.e. every drill stage BEFORE grading,
          and goes dormant at the grading stage (advBtn === null). That is why the grade buttons
          still work on Enter and why a casual test would miss this.

   Two things to establish:
     1. per drill stage, is Enter stolen from a control outside the drill?
     2. THE WORST CASE: with the drill showing, can a keyboard user still LEAVE the pane by
        tabbing to the pane switcher and pressing Enter? If not, the only escapes are the letter
        shortcuts — a keyboard user who does not know them is stuck on the drill. */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
fs.mkdirSync(SHOTS, { recursive: true });

await page.evaluate(() => {
  window.__clicks = [];
  document.addEventListener('click', e => window.__clicks.push((e.composedPath()[0].id || e.composedPath()[0].className || '?').toString().slice(0, 24)), true);
});
const clicks = () => page.evaluate(() => { const c = window.__clicks.slice(); window.__clicks = []; return c; });
const stage = () => page.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  return { adv: !!r.getElementById('adv'), advText: r.getElementById('adv')?.textContent.trim().slice(0, 24) || null, judge: !!r.getElementById('jg') };
});
const activePane = () => page.evaluate(() => [...document.querySelectorAll('.pane')].find(p => p.classList.contains('on'))?.id);

await page.evaluate(() => window.switchTab('drill'));
await page.waitForTimeout(500);

/* ---- 1. walk the drill's stages; at each, press Enter with focus on a SIDEBAR button ---- */
console.log('=== Enter, focus parked on #themetog (sidebar), at each drill stage ===\n');
console.log('stage  #adv exists  adv label                  Enter -> what fired      theme toggled?');
for (let s = 0; s < 7; s++) {
  const st = await stage();
  await page.evaluate(() => document.getElementById('themetog').focus());
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await clicks();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  const fired = await clicks();
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const toggled = before !== after;
  console.log(`  ${s}    ${String(st.adv).padEnd(11)} ${String(st.advText || '(none - judge row)').padEnd(26)} ${JSON.stringify(fired).padEnd(22)} ${toggled ? 'yes' : 'NO  <-- stolen'}`);
  if (st.judge) { console.log(`         ^ grading stage: #adv is gone, so the intercept is dormant and Enter works again.`); break; }
  if (toggled) await page.evaluate(() => document.getElementById('themetog').click());  // undo so state is comparable
}

/* ---- 2. THE TRAP: can the keyboard user leave the drill pane? ---- */
console.log('\n=== Can a keyboard user LEAVE the drill pane with Tab + Enter? ===');
await page.evaluate(() => { const d = document.querySelector('#drill deep-drill'); d.shadowRoot.getElementById('adv') || window.switchTab('drill'); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1800);
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.evaluate(() => {
  window.__clicks = [];
  document.addEventListener('click', e => window.__clicks.push((e.composedPath()[0].id || e.composedPath()[0].className || '?').toString().slice(0, 24)), true);
});
await page.evaluate(() => window.switchTab('drill'));
await page.waitForTimeout(500);
console.log(`  active pane: ${await activePane()}   (#adv present: ${(await stage()).adv})`);

/* tab to the "Whiteboard" pane button in the switcher, the way a keyboard user would */
await page.evaluate(() => { document.activeElement.blur(); });
let landed = null;
for (let i = 1; i <= 60; i++) {
  await page.keyboard.press('Tab');
  const l = await page.evaluate(() => window.__kb.label(window.__kb.deepActive()));
  if (l && l.startsWith('Whiteboard')) { landed = i; break; }
}
console.log(`  tabbed ${landed} times to reach the "Whiteboard" pane button`);
await clicks();
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
const fired = await clicks();
const paneAfter = await activePane();
console.log(`  pressed Enter -> clicks fired: ${JSON.stringify(fired)}`);
console.log(`  active pane now: ${paneAfter}   ${paneAfter === 'wb' ? 'switched (fine)' : '*** STILL ON THE DRILL — the pane switcher did not fire ***'}`);
await page.screenshot({ path: `${SHOTS}/hijack-01-cannot-leave-drill.png` });

/* does Space do any better? */
await clicks();
await page.keyboard.press('Space');
await page.waitForTimeout(500);
const fired2 = await clicks();
console.log(`  pressed Space -> clicks fired: ${JSON.stringify(fired2)}   active pane: ${await activePane()}`);

/* and the documented escape hatch — the letter shortcut */
await page.keyboard.press('e');
await page.waitForTimeout(500);
console.log(`  pressed "e" (the documented Whiteboard shortcut) -> active pane: ${await activePane()}  ${(await activePane()) === 'wb' ? '(the ONLY keyboard way out)' : ''}`);

console.log(`\npageerrors: ${page.__errs.length}`);
await browser.close();
