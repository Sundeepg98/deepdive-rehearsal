/* rt-console VERIFY 10 — P0: the app renders 100% BLANK under prefers-reduced-motion.
   styles.css:90   body{...;opacity:0;animation:bodyIn ... forwards}      <- base opacity 0
   styles.css:137  @media (prefers-reduced-motion: reduce){*{animation:none!important;...}}
   `animation:none` kills bodyIn -> body never fades in -> body stays opacity:0.
   Everything is in the DOM, laid out, and CLICKABLE — just invisible. 0 console errors. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-console-verify';
const b = await chromium.launch();

const CASES = [
  { name: 'desktop-freshboot', vp: { width: 1280, height: 900 }, hash: '' },
  { name: 'desktop-walk',      vp: { width: 1280, height: 900 }, hash: '#walk' },
  { name: 'mobile-walk',       vp: { width: 390,  height: 844 }, hash: '#walk' },
];

for (const c of CASES) {
  for (const rm of ['no-preference', 'reduce']) {
    const ctx = await b.newContext({ viewport: c.vp, reducedMotion: rm });
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL + c.hash, { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({
      bodyOpacity: getComputedStyle(document.body).opacity,
      bodyAnimName: getComputedStyle(document.body).animationName,
      h1: (document.querySelector('.hdr h1') || {}).textContent,
      clickable: !!document.elementFromPoint(Math.floor(innerWidth / 2), Math.floor(innerHeight / 2)),
    }));
    console.log(`${c.name.padEnd(20)} rm=${rm.padEnd(14)} body.opacity=${r.bodyOpacity.padEnd(4)} animation-name=${String(r.bodyAnimName).padEnd(8)} h1="${r.h1}" clickable=${r.clickable} consoleErrors=${errs.length}`);
    if (rm === 'reduce') await p.screenshot({ path: `${S}/vc-P0-blank-${c.name}.png` });
    else await p.screenshot({ path: `${S}/vc-P0-ok-${c.name}.png` });

    // PROVE it is solely the opacity: force it back to 1 and re-shoot
    if (rm === 'reduce') {
      await p.evaluate(() => { document.body.style.opacity = '1'; });
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${S}/vc-P0-fixproof-${c.name}.png` });
    }
    await ctx.close();
  }
}
await b.close();
