/* Decisive: load with NORMAL motion (renders), then FLIP prefers-reduced-motion at runtime.
   If it goes blank -> real CSS/paint effect. If it stays -> load-time / emulation artifact. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

const topAt = () => p.evaluate(() => {
  const e = document.elementFromPoint(640, 450);
  const path = [];
  let n = e;
  while (n && path.length < 4) { path.push(n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/)[0] : '')); n = n.parentElement; }
  return {
    topEl: path.join(' < '),
    matchesReduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
    paneOpacity: getComputedStyle(document.querySelector('.stage .pane.on')).opacity,
    paneVis: getComputedStyle(document.querySelector('.stage .pane.on')).visibility,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
});

await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(2500);
console.log('BEFORE flip (normal motion):', JSON.stringify(await topAt()));
await p.screenshot({ path: SH + 'flip-1-normal.png' });

await p.emulateMedia({ reducedMotion: 'reduce' });
await p.waitForTimeout(1500);
console.log('AFTER  flip (reduce)      :', JSON.stringify(await topAt()));
await p.screenshot({ path: SH + 'flip-2-reduce.png' });

await p.emulateMedia({ reducedMotion: 'no-preference' });
await p.waitForTimeout(1500);
console.log('AFTER  flip back (normal) :', JSON.stringify(await topAt()));
await p.screenshot({ path: SH + 'flip-3-normal-again.png' });

// And: fresh load under reduce, but force a repaint (resize) before shooting
const p2 = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
await p2.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p2.waitForTimeout(1500);
await p2.setViewportSize({ width: 1281, height: 901 });   // force reflow/repaint
await p2.waitForTimeout(800);
await p2.screenshot({ path: SH + 'flip-4-reduce-after-resize.png' });
console.log('fresh reduce + resize -> flip-4-reduce-after-resize.png');
await b.close();
