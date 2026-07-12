/* NEGATIVE CONTROL. A check that has never failed is not a check, it is a decoration. This
   repo has shipped FOUR checks that could not fail. So before believing "reduced motion
   RENDERS", inject the exact regression it exists to catch -- body{opacity:0}, the bug that
   made this app a blank white page for every reduced-motion user -- and confirm:
     - the PAINTED-PIXEL counter collapses  (the check has teeth)
     - the VISIBLE-NODE counter does not    (the check the reviewer was nearly fooled by) */
import { chromium } from 'playwright';
import { grab, paintedPixels } from './pixlib.mjs';
const D = 'file:///D:/claude-workspace/_worktrees/deepdive-rehearsal/vfix-css/dist/index.html';
const br = await chromium.launch();
const helper = await (await br.newContext()).newPage();
await helper.goto('data:text/html,<title>d</title>');

for (const [label, blank] of [['HEALTHY (as shipped)', false], ['SABOTAGED body{opacity:0}', true]]) {
  const ctx = await br.newContext({ viewport: { width: 1100, height: 700 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(D); await p.waitForTimeout(2600); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  if (blank) await p.addStyleTag({ content: 'body{opacity:0 !important}' });
  await p.waitForTimeout(500);
  const pp = paintedPixels(await grab(p, helper, null, 0));
  const nodes = await p.evaluate(() => [...document.querySelectorAll('*')].filter(e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  }).length);
  const renders = pp.share > 0.05 && pp.distinct > 50;
  console.log(`${label.padEnd(26)} paintedPixels=${String(pp.painted).padStart(7)} (${(pp.share*100).toFixed(1)}%)  distinctColours=${String(pp.distinct).padStart(4)}  |  naiveVisibleNodes=${nodes}  ->  ${renders ? 'RENDERS' : '*** BLANK PAGE ***'}`);
  await ctx.close();
}
await br.close();
