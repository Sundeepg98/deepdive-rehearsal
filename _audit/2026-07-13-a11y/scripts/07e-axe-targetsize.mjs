/* axe reported 0 violations, and I verified that result really does cover the
 * shadow roots. But I MEASURED a 245x19 search input - a hard WCAG 2.5.8 (AA)
 * target-size failure. Both cannot be true unless axe's target-size rule never
 * ran. Find out, so the report says exactly what axe's clean bill does and does
 * not cover.
 */
import fs from 'node:fs';
import { launch, phone, installDeep, ensureDirs, save, PHONES } from './lib.mjs';
ensureDirs();
const AXE = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');

const b = await launch();
const p = await phone(b, PHONES.p390);
await installDeep(p);
await p.locator('.ix-card').first().tap().catch(() => {});
await p.waitForTimeout(900);
await p.evaluate(AXE);

const meta = await p.evaluate(() => {
  const rules = window.axe.getRules();
  const ts = rules.find((x) => x.ruleId === 'target-size');
  return { version: window.axe.version, totalRules: rules.length, targetSize: ts || null };
});
console.log('=============== DOES AXE CHECK TARGET SIZE? ===============');
console.log(`  axe-core ${meta.version}, ${meta.totalRules} rules`);
console.log(`  target-size rule: ${meta.targetSize ? JSON.stringify(meta.targetSize) : 'NOT PRESENT'}`);

// The default tag run we used earlier
const tagRun = await p.evaluate(async () => {
  const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
  return { violations: r.violations.length, ranTargetSize: [...r.passes, ...r.violations, ...r.incomplete, ...r.inapplicable].some((x) => x.id === 'target-size') };
});
console.log(`  our earlier wcag22aa tag run: ${tagRun.violations} violations; did it evaluate target-size? ${tagRun.ranTargetSize}`);

// force it
const forced = await p.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'rule', values: ['target-size'] } }));
console.log(`\n  FORCING the target-size rule on the app screen:`);
console.log(`     violations ${forced.violations.length} | incomplete ${forced.incomplete.length} | passes ${forced.passes.length}`);
for (const v of forced.violations) for (const n of v.nodes.slice(0, 8)) console.log(`     VIOLATION  ${n.target.join(' ')}`);

// now with the search overlay open (where the 19px input lives)
await p.evaluate(() => document.querySelector('#toolsfab')?.click());
await p.waitForTimeout(450);
await p.evaluate(() => document.querySelector('#searchopen')?.click());
await p.waitForTimeout(1000);
const forced2 = await p.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'rule', values: ['target-size'] } }));
console.log(`\n  FORCING target-size with the SEARCH OVERLAY open (the 245x19 input):`);
console.log(`     violations ${forced2.violations.length} | incomplete ${forced2.incomplete.length} | passes ${forced2.passes.length}`);
for (const v of forced2.violations) for (const n of v.nodes.slice(0, 10)) console.log(`     VIOLATION  ${n.target.join(' ')}`);
for (const n of (forced2.incomplete[0]?.nodes || []).slice(0, 6)) console.log(`     INCOMPLETE ${n.target.join(' ')}`);

console.log('\n  =>', tagRun.ranTargetSize
  ? 'target-size DID run inside our clean bill.'
  : 'target-size NEVER RAN in the tag-based run. axe\'s "0 violations" says NOTHING about tap-target size.\n     That is precisely the gap direct measurement had to fill.');

await b.close();
save('07e-axe-targetsize.json', { meta, tagRun, forced: forced.violations.map((v) => v.nodes.map((n) => n.target)), forced2: forced2.violations.map((v) => v.nodes.map((n) => n.target)) });
