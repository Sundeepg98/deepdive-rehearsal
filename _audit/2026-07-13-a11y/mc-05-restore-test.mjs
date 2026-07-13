/* mc-05-restore-test.mjs — IS MY OWN INSTRUMENT CORRUPTING THE PAGE?
 *
 * The sweep reported the sidebar "Focus" button as rgb(0,0,0) at 1.28:1 in dark theme. A crop of
 * the real render shows it as a perfectly legible rose pill, and an independent computed-style
 * check says rgb(167,162,154) at 6.49:1. So the pipeline measured a page state that MY OWN
 * force/restore cycle created. If the restore leaks, every measurement taken after the first
 * force is suspect and the whole contrast dataset is garbage.
 *
 * Test: snapshot every target's computed colour, run the exact force cycle the sweep runs,
 * restore, and diff. Any element that does not come back is the bug.
 */
import * as L from './mc-lib.mjs';

const SPECS = [{ sel: '*', label: 'auto' }];
const snap = (page) => page.evaluate(() => {
  const roots = [document];
  document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) roots.push(e.shadowRoot); });
  const out = [];
  for (const r of roots) {
    r.querySelectorAll('[data-mc-target]').forEach((el) => {
      const cs = getComputedStyle(el);
      out.push({
        id: el.getAttribute('data-mc-target'),
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 18),
        color: cs.color,
        fill: cs.webkitTextFillColor,
        inlineColor: el.style.getPropertyValue('color') || '',
        inlineFill: el.style.getPropertyValue('-webkit-text-fill-color') || '',
      });
    });
  }
  return out;
});

const browser = await L.launch();
const page = await L.openApp(browser, {});
await L.setTheme(page, 'dark');
await L.setRoom(page, 'signing');
await L.showPane(page, 'walk');
await page.waitForTimeout(600);

await L.collectTargets(page, SPECS);
const before = await snap(page);

await L.forceTargetColor(page, 'transparent');
await L.forceTargetColor(page, '#000000');
await L.forceTargetColor(page, '#ffffff');
await L.forceTargetColor(page, null);   // <-- the restore under test
await page.waitForTimeout(200);
const after = await snap(page);

const byId = Object.fromEntries(after.map((r) => [r.id, r]));
const broken = before.filter((b) => byId[b.id] && byId[b.id].color !== b.color);

console.log(`targets: ${before.length}`);
console.log(`NOT restored after the force/restore cycle: ${broken.length}`);
for (const b of broken.slice(0, 12)) {
  const a = byId[b.id];
  console.log(`  <${b.tag}> "${b.text}"`);
  console.log(`     before: color=${b.color}  webkitTextFillColor=${b.fill}`);
  console.log(`     after : color=${a.color}  webkitTextFillColor=${a.fill}   inline='${a.inlineColor}' / '${a.inlineFill}'`);
}
if (!broken.length) console.log('  -> restore is clean; the pipeline does NOT corrupt the page.');
await browser.close();
