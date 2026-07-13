/* kb-08: what are the ~100 residual pixels that survive pinning focus styles to resting values?
   Until I can drive a control's focus signal to ZERO on demand, I cannot claim my INVISIBLE
   verdict is trustworthy. Dump the residual's geometry + colours and look at it. */
import { open, inject, pxdiff, shotBox, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const PIN = ['outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow',
  'background-color', 'background-image', 'border-color', 'border-width', 'color', 'transform', 'opacity', 'filter'];
const SEL = '#searchopen';

const { browser, page } = await open();
await inject(page);
await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

/* CRITICAL: blur FIRST, then read resting values (kb-07 read them while the last target was
   still focused, which is why #tntrigger's "pin" pinned it to its FOCUSED look and changed nothing) */
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
await page.waitForTimeout(250);

const el = await page.$(SEL);
await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
await page.waitForTimeout(200);

const rect = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
console.log(`${SEL} rect ${Math.round(rect.w)}x${Math.round(rect.h)}\n`);

async function run(label) {
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await page.waitForTimeout(200);
  const b = await shotBox(page, rect);
  await el.evaluate(e => e.focus());
  await page.waitForTimeout(240);
  const a = await shotBox(page, rect);
  const d = await pxdiff(page, b, a, 8);
  console.log(`${label.padEnd(34)} changed=${String(d.changed).padStart(5)}  bbox=${d.bbox ? `${d.bbox.x},${d.bbox.y} ${d.bbox.w}x${d.bbox.h}` : '-'}  maxDelta=${d.maxDelta}  ${d.best ? `[${d.best.from}] -> [${d.best.to}]` : ''}`);
  return { d, b, a };
}

const base = await run('as shipped');
fs.mkdirSync(SHOTS, { recursive: true });
fs.writeFileSync(`${SHOTS}/resid-A-unfocused.png`, Buffer.from(base.b, 'base64'));
fs.writeFileSync(`${SHOTS}/resid-B-focused.png`, Buffer.from(base.a, 'base64'));

/* pin element only */
const css1 = await page.evaluate(([sel, props]) => {
  const e = document.querySelector(sel), s = getComputedStyle(e);
  return `${sel}:focus,${sel}:focus-visible{${props.map(p => `${p}:${s.getPropertyValue(p)}!important`).join(';')}}`;
}, [SEL, PIN]);
await page.addStyleTag({ content: css1 });
const p1 = await run('pinned (element only)');
fs.writeFileSync(`${SHOTS}/resid-C-pinned-element.png`, Buffer.from(p1.a, 'base64'));

/* pin element + its pseudo-elements + descendants */
const css2 = await page.evaluate(([sel, props]) => {
  const e = document.querySelector(sel);
  const decl = (node, pe) => { const s = getComputedStyle(node, pe || undefined); return props.map(p => `${p}:${s.getPropertyValue(p)}!important`).join(';'); };
  let out = `${sel}:focus::before,${sel}:focus-visible::before{${decl(e, '::before')}}\n`;
  out += `${sel}:focus::after,${sel}:focus-visible::after{${decl(e, '::after')}}\n`;
  return out;
}, [SEL, PIN]);
await page.addStyleTag({ content: css2 });
const p2 = await run('pinned (+ ::before/::after)');

/* nuclear: also freeze all transitions/animations */
await page.addStyleTag({ content: `${SEL},${SEL}::before,${SEL}::after,${SEL} *{transition:none!important;animation:none!important}` });
const p3 = await run('pinned (+ no transitions)');
fs.writeFileSync(`${SHOTS}/resid-D-pinned-full.png`, Buffer.from(p3.a, 'base64'));

console.log(`\nresidual after full pin: ${p3.d.changed} px`);
console.log(p3.d.changed === 0
  ? 'ZERO. The control can be driven to a genuine no-indicator state => INVISIBLE is reachable on demand.'
  : `NOT zero (${p3.d.changed}px). Investigate: bbox=${JSON.stringify(p3.d.bbox)} best=${JSON.stringify(p3.d.best)}`);
console.log(`\ncrops written to ${SHOTS}/resid-*.png`);
await browser.close();
