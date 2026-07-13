/* ============================================================================
   The SERIOUS finding's acceptance criterion: aria-prohibited-attr on .locator.

   READ THIS BEFORE TRUSTING THE NUMBER. A violations-only axe run is STRUCTURALLY
   INCAPABLE of failing on this defect. Measured with axe-core 4.12.1: the roleless
   <span aria-label> does NOT land in `violations` -- it lands in `incomplete`. So
   `violations.length === 0` is true BOTH before and after the fix, and an a11y gate
   built on it would certify the bug as clean. This is the same shape as the contrast
   finding in the audit (9,276 `incomplete`, so a violations-only run could never go
   red on contrast either). Never assert on `violations` alone for this app.

   The DISCRIMINATING measurement is which BUCKET .locator lands in:
       with role="img"  -> passes      (axe affirmatively vouches for it)
       without it       -> incomplete  (axe cannot vouch for it)
   That state genuinely flips, so the check can fail. The control below proves it.
   ============================================================================ */
import { chromium } from 'playwright';
import fs from 'fs';

const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();
await page.goto('file:///D:/claude-workspace/_worktrees/deepdive-rehearsal/a11y-sr/dist/index.html');
await page.waitForTimeout(1800);
await page.addScriptTag({ content: axe });

/* Which bucket does .locator land in? Report ALL of them, never just violations. */
const bucketOf = () => page.evaluate(async () => {
  const r = await window.axe.run(document, { runOnly: ['aria-prohibited-attr'] });
  const hit = (k) => r[k].some(x => x.nodes.some(n => String(n.target).includes('locator')));
  return {
    locator: hit('violations') ? 'violations' : hit('incomplete') ? 'incomplete' : hit('passes') ? 'passes' : 'absent',
    totals: {
      violations: r.violations.reduce((n, x) => n + x.nodes.length, 0),
      incomplete: r.incomplete.reduce((n, x) => n + x.nodes.length, 0),
      passes: r.passes.reduce((n, x) => n + x.nodes.length, 0),
    },
  };
});

const fixed = await bucketOf();
console.log('WITH role="img" (the fix) -> .locator bucket:', fixed.locator, JSON.stringify(fixed.totals));

/* CONTROL: strip role="img" and re-run. The bucket MUST change, or this check is decoration. */
await page.evaluate(() => document.querySelector('.locator').removeAttribute('role'));
const control = await bucketOf();
console.log('CONTROL (role removed)    -> .locator bucket:', control.locator, JSON.stringify(control.totals));

const ok = fixed.locator === 'passes'
        && control.locator !== 'passes'
        && fixed.totals.violations === 0;

console.log(ok
  ? '\nPASS  the fix moves .locator into axe\'s `passes` bucket; removing it moves it back out.'
    + '\n      NOTE: without the fix axe reports it as `incomplete`, NOT a violation -- a'
    + '\n      violations-only run reads 0 in BOTH states and would prove nothing.'
  : '\nFAIL  fixed=' + fixed.locator + ' control=' + control.locator + ' -- the bucket did not flip.');

await browser.close();
process.exit(ok ? 0 : 1);
