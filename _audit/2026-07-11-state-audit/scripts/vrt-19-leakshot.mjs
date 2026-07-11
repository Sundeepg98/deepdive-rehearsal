/* F4 visual proof: the cross-topic companion leak, my own capture. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); // normal motion (reduce => blank body!)

await p.goto(URL + '#authz/sys', { waitUntil: 'load' });
await p.waitForTimeout(1800);
await p.keyboard.press('Escape');
await p.waitForTimeout(600);
await p.screenshot({ path: SH + 'f4-leak-step1-authz-sys.png' });

await p.evaluate(() => window.TopicRegistry.setTopic('caching'));
await p.waitForTimeout(1500);
await p.screenshot({ path: SH + 'f4-leak-step2-caching-sys-LEAK.png' });
// crop just the companion rail
const box = await p.evaluate(() => { const c = document.querySelector('.companion').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
await p.screenshot({ path: SH + 'f4-leak-companion-crop.png', clip: { x: box.x, y: box.y, width: box.w, height: Math.min(box.h, 700) } });
console.log('captured. companion now says:');
console.log(await p.evaluate(() => ({
  rehearsing: document.querySelector('.cmp-topic')?.textContent,
  thisView: document.getElementById('cmpView')?.textContent,
  note: document.getElementById('cmpNote')?.textContent?.slice(0, 120),
})));
await b.close();
