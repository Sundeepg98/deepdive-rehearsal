/* Pin the exact mechanism that shreds the tools menu at 200% text, so the fix
 * lands on the right line. Hypothesis:
 *   .mockbar is a COLUMN flex container with max-height:82vh + overflow-y:auto.
 *   Its .crambtn rows are flex items with the default flex-shrink:1, so when the
 *   content no longer fits they are SHRUNK rather than scrolled...
 *   ...down to min-height:44px - the tap-target fix (styles.css:1138) - which
 *   becomes the clamp floor...
 *   ...and button{overflow:hidden} (styles.css:527, there to clip the ripple)
 *   then hides the 500-700px of label that no longer fits.
 * Test it by neutralising each suspect one at a time and re-measuring.
 */
import path from 'node:path';
import { launch, phone, installDeep, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';
ensureDirs();

const ZOOM = `
window.__setTextZoom = function (f) {
  const all = []; const walk = (r) => { for (const el of r.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
  walk(document);
  for (const el of all) {
    if (!el.dataset) continue;
    if (el.dataset.__basefs === undefined) el.dataset.__basefs = parseFloat(getComputedStyle(el).fontSize) || 16;
    el.style.setProperty('font-size', (parseFloat(el.dataset.__basefs) * f) + 'px', 'important');
  }
};
window.__rows = function () {
  const bar = document.querySelector('.mockbar');
  const bcs = getComputedStyle(bar);
  const rows = [...bar.querySelectorAll('.crambtn')].map((el) => {
    const cs = getComputedStyle(el);
    return { clientH: el.clientHeight, scrollH: el.scrollHeight, cut: el.scrollHeight - el.clientHeight,
      flexShrink: cs.flexShrink, flexBasis: cs.flexBasis, minHeight: cs.minHeight, height: cs.height, overflow: cs.overflow };
  });
  return {
    bar: { display: bcs.display, flexDirection: bcs.flexDirection, maxHeight: bcs.maxHeight, overflowY: bcs.overflowY,
           clientH: bar.clientHeight, scrollH: bar.scrollHeight },
    rows,
    clipped: rows.filter((r) => r.cut > 1).length,
    total: rows.length,
    worstCut: Math.max(0, ...rows.map((r) => r.cut)),
  };
};`;

const b = await launch();
const p = await phone(b, PHONES.p390);
await installDeep(p);
await p.evaluate(ZOOM);
await p.locator('.ix-card').first().click().catch(() => {});
await p.waitForTimeout(900);
await p.evaluate(() => document.querySelector('#toolsfab')?.click());
await p.waitForTimeout(600);
await p.evaluate(() => window.__setTextZoom(2));
await p.waitForTimeout(700);

const shipped = await p.evaluate(() => window.__rows());
console.log('=== AS SHIPPED, 200% text ===');
console.log('  .mockbar:', JSON.stringify(shipped.bar));
console.log('  row[0]  :', JSON.stringify(shipped.rows[0]));
console.log(`  => ${shipped.clipped}/${shipped.total} rows clipped, worst cut ${shipped.worstCut}px`);

const trials = [
  ['A. flex-shrink:0 on the rows (stop the column flex from crushing them)', '.mockbar .crambtn{flex-shrink:0 !important}'],
  ['B. overflow:visible on buttons (undo the ripple clip, styles.css:527)', 'button{overflow:visible !important}'],
  ['C. height:auto on the rows (let them grow past the 44px tap floor)', '.mockbar .crambtn{height:auto !important;min-height:44px !important}'],
  ['D. flex-shrink:0 AND overflow:visible', '.mockbar .crambtn{flex-shrink:0 !important}button{overflow:visible !important}'],
];
const results = {};
for (const [name, css] of trials) {
  const p2 = await phone(b, PHONES.p390);
  await installDeep(p2);
  await p2.evaluate(ZOOM);
  await p2.locator('.ix-card').first().click().catch(() => {});
  await p2.waitForTimeout(900);
  await p2.addStyleTag({ content: css });
  await p2.evaluate(() => document.querySelector('#toolsfab')?.click());
  await p2.waitForTimeout(600);
  await p2.evaluate(() => window.__setTextZoom(2));
  await p2.waitForTimeout(700);
  const r = await p2.evaluate(() => window.__rows());
  results[name] = r;
  console.log(`\n=== ${name} ===`);
  console.log(`  ${r.clipped}/${r.total} rows clipped, worst cut ${r.worstCut}px   (row0 clientH=${r.rows[0].clientH} scrollH=${r.rows[0].scrollH})`);
  if (name.startsWith('D')) await p2.screenshot({ path: path.join(SHOTS, '04c-390-tools-drawer-200pct-FIXED.png') });
  await p2.context().close();
}
await b.close();
save('04c-mechanism.json', { shipped, results });
