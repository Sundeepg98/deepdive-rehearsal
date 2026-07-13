/* The bug that certified a blank page was reduced-motion. "Reduce motion" is one
 * of the most-enabled phone accessibility settings, so it belongs in the mobile
 * lens too. Measure it in PAINTED PIXELS, at phone size, in both themes - and
 * carry the negative control alongside so the number means something.
 */
import { launch, phone, installDeep, inkOf, ensureDirs, save, PHONES } from './lib.mjs';
ensureDirs();

const b = await launch();
const rows = [];
for (const [vpName, vp] of Object.entries(PHONES)) {
  for (const motion of ['no-preference', 'reduce']) {
    const p = await phone(b, vp, { reducedMotion: motion });
    await installDeep(p);
    const boot = await inkOf(p, `08-${vp.width}-${motion}-boot.png`);
    await p.locator('.ix-card').first().tap().catch(() => {});
    await p.waitForTimeout(1100);
    const app = await inkOf(p, `08-${vp.width}-${motion}-app.png`);
    await p.evaluate(() => document.querySelector('.seg button[data-tab="drill"]')?.click());
    await p.waitForTimeout(900);
    const drill = await inkOf(p, `08-${vp.width}-${motion}-drill.png`);
    const nodes = await p.evaluate(() => document.querySelectorAll('*').length);
    rows.push({ vp: `${vp.width}x${vp.height}`, motion, boot: boot.painted, app: app.painted, drill: drill.painted, nodes });
    await p.context().close();
  }
}

/* NEGATIVE CONTROL, run in the reduced-motion context itself */
const p = await phone(b, PHONES.p390, { reducedMotion: 'reduce' });
await installDeep(p);
await p.locator('.ix-card').first().tap().catch(() => {});
await p.waitForTimeout(1000);
const live = await inkOf(p, null);
await p.addStyleTag({ content: 'body{opacity:0 !important}' });
await p.waitForTimeout(250);
const blank = await inkOf(p, null);
const nodesOnBlank = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => {
  const cs = getComputedStyle(e);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && e.textContent.trim();
}).length);
await b.close();

console.log('=============== REDUCED MOTION ON A PHONE (painted pixels) ===============');
console.log('  viewport    motion          boot ink     app ink     drill ink   DOM nodes');
for (const r of rows) {
  const blankish = r.app < 1000;
  console.log(`  ${r.vp.padEnd(11)} ${r.motion.padEnd(15)} ${String(r.boot).padStart(9)} ${String(r.app).padStart(11)} ${String(r.drill).padStart(11)}   ${r.nodes}${blankish ? '   *** BLANK PAGE ***' : ''}`);
}
const rm = rows.filter((r) => r.motion === 'reduce');
const ok = rm.every((r) => r.app > 100000 && r.drill > 100000);
console.log(`\n  => reduced-motion renders a real page on both phones: ${ok}`);

console.log('\n=============== NEGATIVE CONTROL (inside the reduced-motion context) ===============');
console.log(`  reduced-motion, as shipped : ${live.painted} painted px`);
console.log(`  + body{opacity:0}          : ${blank.painted} painted px   (node counter still reports ${nodesOnBlank} "visible" nodes)`);
console.log('  ' + (live.painted > 100000 && blank.painted === 0
  ? 'OK — the instrument that once certified a blank page as passing now GOES TO ZERO on one.'
  : '*** INSTRUMENT BROKEN ***'));
save('08-reduced-motion.json', { rows, negControl: { live: live.painted, blank: blank.painted, nodesOnBlank } });
