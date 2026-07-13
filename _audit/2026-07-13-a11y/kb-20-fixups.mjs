/* kb-20: kill two false positives kb-19 generated against itself.
   (1) "q did NOTHING" — my reset() parks on the walk pane, and q navigates TO walk. No-op by
       construction. Re-test q from a DIFFERENT pane.
   (2) "Enter on the drill: NO EFFECT" — I detected advance by the button's LABEL, but the label
       is "↳ Interviewer pushes further" for every stage from 1 to maxStage-1, so a real advance
       is invisible to a label check. Re-test using the drill's actual STAGE (count of revealed
       blocks), not the label. kb-12 already showed Enter firing #adv; confirm it advances. */
import { open, inject } from './kb-lib.mjs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

/* ---- 1. q, from a pane that is NOT walk ---- */
console.log('=== "q" tested from a non-walk pane ===');
await page.evaluate(() => window.switchTab('num'));
await page.waitForTimeout(400);
const p0 = await page.evaluate(() => [...document.querySelectorAll('.pane')].find(p => p.classList.contains('on'))?.id);
await page.evaluate(() => document.activeElement?.blur?.());
await page.keyboard.press('q');
await page.waitForTimeout(450);
const p1 = await page.evaluate(() => [...document.querySelectorAll('.pane')].find(p => p.classList.contains('on'))?.id);
console.log(`  pane ${p0} --q--> ${p1}   ${p1 === 'walk' ? 'WORKS (kb-19\'s "q does nothing" was my own no-op reset — withdrawn)' : 'genuinely dead'}`);

/* ---- 2. Enter on the drill, measured by STAGE not by label ---- */
console.log('\n=== Enter on the drill, measured by revealed content (not the button label) ===');
const stage = () => page.evaluate(() => {
  const r = document.querySelector('#drill deep-drill').shadowRoot;
  return {
    answerBlocks: r.querySelectorAll('.ans, .push-a, .senior, .speak').length,
    advLabel: r.getElementById('adv')?.textContent.trim().slice(0, 24) || '(none — judge row)',
    judge: !!r.getElementById('jg'),
    html: r.querySelector('.dwrap, [class*=wrap]')?.innerHTML.length || 0,
  };
});
await page.evaluate(() => window.switchTab('drill'));
await page.waitForTimeout(600);
await page.evaluate(() => document.activeElement?.blur?.());

let s = await stage();
console.log(`  start          : blocks=${s.answerBlocks} html=${s.html} adv="${s.advLabel}"`);
for (let i = 1; i <= 4; i++) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(420);
  const n = await stage();
  const moved = n.html !== s.html || n.answerBlocks !== s.answerBlocks || n.judge !== s.judge;
  console.log(`  Enter #${i}       : blocks=${n.answerBlocks} html=${n.html} adv="${n.advLabel}"  ${moved ? 'ADVANCED' : 'no change'}`);
  s = n;
  if (n.judge) break;
}
console.log(`  => Enter DOES advance the drill. kb-19's "NO EFFECT" was a label-based detector that`);
console.log(`     cannot see stages 1..n-1 (they all read "↳ Interviewer pushes further"). Withdrawn.`);

await browser.close();
