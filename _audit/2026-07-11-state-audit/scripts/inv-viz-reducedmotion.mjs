// Is the blank page under prefers-reduced-motion REAL, or a headless screenshot artifact?
// Decide by computed style (opacity/visibility of every ancestor), not by pixels.
import { chromium } from 'playwright';
import fs from 'node:fs';
const FILE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-visual-trainer-verify';
const b = await chromium.launch();
const out = {};

const probeStyles = () => ({
  chain: ['html', 'body', '.app', 'header', '.stage', '#walk', '#viz', '.seg'].map((sel) => {
    const e = document.querySelector(sel);
    if (!e) return { sel, missing: true };
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { sel, opacity: cs.opacity, visibility: cs.visibility, display: cs.display,
      animationName: cs.animationName, transform: cs.transform,
      rect: [Math.round(r.width), Math.round(r.height)] };
  }),
  // what does the browser itself say is painted at the centre of the viewport?
  elAtCentre: (() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return e ? (e.tagName + '.' + e.className).slice(0, 60) : null; })(),
  bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90),
  bodyTextLen: (document.body.innerText || '').trim().length,
});

for (const [tag, opts] of [['reduce', { reducedMotion: 'reduce' }], ['no-preference', {}]]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, ...opts });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  out[tag + '_atBoot'] = await p.evaluate(probeStyles);
  await p.screenshot({ path: `${SHOTS}/rm-${tag}-1-boot.png` });

  // close the first-run overlay and look again
  await p.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
  await p.waitForTimeout(700);
  out[tag + '_afterOverlayClosed'] = await p.evaluate(probeStyles);
  await p.screenshot({ path: `${SHOTS}/rm-${tag}-2-after-close.png` });
  out[tag + '_errors'] = errs;
  await p.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_inv-viz-rm.json', JSON.stringify(out, null, 1));
