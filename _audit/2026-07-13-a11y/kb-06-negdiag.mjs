/* kb-06: WHY did my negative control not go red? Diagnose before trusting any pass.
   My kb-05 --negative injected `background:inherit!important; color:inherit!important;
   border-color:inherit!important` alongside outline/box-shadow:none. `inherit` is not "no
   change" — it takes the PARENT's value, which differs from the element's own. So on focus the
   background genuinely changed, my differ correctly saw changed pixels, and the control
   "passed". The instrument was right; my control was sabotaged by its own CSS.

   Here I (a) print exactly what the app paints on focus, property by property, and
   (b) test a surgical kill (outline + box-shadow ONLY) to find the true minimal break. */
import { open, inject, pxdiff, shotBox } from './kb-lib.mjs';

const MODE = process.argv[2] || 'none';   // none | surgical
const { browser, page } = await open();
await inject(page);
await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

if (MODE === 'surgical') {
  await page.addStyleTag({
    content: `#searchopen:focus,#searchopen:focus-visible,.sidebar .seg button:focus,.sidebar .seg button:focus-visible,#_focus-toggle:focus,#_focus-toggle:focus-visible{outline:none!important;box-shadow:none!important}`
  });
  console.log('*** SURGICAL NEGATIVE CONTROL: outline:none + box-shadow:none ONLY (nothing else touched) ***\n');
}

const PROPS = ['outline', 'outlineColor', 'outlineWidth', 'outlineOffset', 'boxShadow', 'backgroundColor', 'backgroundImage', 'color', 'borderColor', 'transform', 'opacity', 'filter'];

for (const sel of ['#searchopen', '.sidebar .seg button']) {
  const el = await page.$(sel);
  await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await page.waitForTimeout(200);

  const rect = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const b1 = await shotBox(page, rect);
  const unfocused = await el.evaluate((e, P) => { const s = getComputedStyle(e); const o = {}; P.forEach(p => o[p] = s[p]); return o; }, PROPS);

  await el.evaluate(e => e.focus());
  await page.waitForTimeout(220);
  const focused = await el.evaluate((e, P) => { const s = getComputedStyle(e); const o = {}; P.forEach(p => o[p] = s[p]); return o; }, PROPS);
  const after = await shotBox(page, rect);
  const d = await pxdiff(page, b1, after, 8);

  console.log(`=== ${sel} ===   changed px on focus: ${d.changed}  (bbox ${d.bbox ? `${d.bbox.w}x${d.bbox.h}` : 'none'})`);
  for (const p of PROPS) {
    if (unfocused[p] !== focused[p]) {
      const u = String(unfocused[p]).slice(0, 44), f = String(focused[p]).slice(0, 44);
      console.log(`   CHANGES  ${p.padEnd(16)} ${u}  ->  ${f}`);
    }
  }
  // any pseudo-element ring?
  const pseudo = await el.evaluate(e => {
    const out = {};
    for (const pe of ['::before', '::after']) {
      const s = getComputedStyle(e, pe);
      out[pe] = { content: s.content, boxShadow: s.boxShadow, background: s.backgroundColor, w: s.width, h: s.height };
    }
    return out;
  });
  console.log(`   pseudo ::before content=${pseudo['::before'].content} bg=${pseudo['::before'].background}`);
  console.log(`   pseudo ::after  content=${pseudo['::after'].content} bg=${pseudo['::after'].background}`);
  console.log('');
}
await browser.close();
