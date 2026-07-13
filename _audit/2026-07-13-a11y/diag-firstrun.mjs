/* Is there a FIRST-RUN scrim/overlay that dimmed the whole page in the sweep's first cell? */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();

const probe = () => p.evaluate(() => ({
  openDialogs: [...document.querySelectorAll('[role=dialog].open')].map(e => e.id),
  tourActive: window.TourGuide ? window.TourGuide.isActive() : null,
  bodyClasses: document.body.className,
  bigLayers: [...document.querySelectorAll('body *')].filter(e => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    return r.width > 1100 && r.height > 600 && +c.opacity > 0.02 &&
           c.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
           (c.position === 'fixed' || c.position === 'absolute') && (parseInt(c.zIndex) || 0) > 0;
  }).map(e => { const c = getComputedStyle(e);
    return { tag: e.tagName, id: e.id, cls: (e.className || '').toString().slice(0, 46), bg: c.backgroundColor, z: c.zIndex, opacity: c.opacity }; }),
  lsKeys: (() => { try { return Object.keys(localStorage); } catch (e) { return ['(blocked)']; } })(),
}));

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2600);
console.log('=== FIRST LOAD (virgin localStorage) ===');
console.log(JSON.stringify(await probe(), null, 2));
await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/shots/axe/_diag-firstload.png' });

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2600);
console.log('\n=== SECOND LOAD (same context, localStorage warm) ===');
console.log(JSON.stringify(await probe(), null, 2));
await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/shots/axe/_diag-secondload.png' });
await b.close();
