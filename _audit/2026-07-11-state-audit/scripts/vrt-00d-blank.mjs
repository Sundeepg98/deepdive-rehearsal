/* Is the blank first paint real, or an artifact of reducedMotion? Test both. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();

for (const rm of ['reduce', 'no-preference']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: rm });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const d = await p.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    const cs = ov ? getComputedStyle(ov) : null;
    const app = document.querySelector('.app');
    const acs = app ? getComputedStyle(app) : null;
    const walk = document.getElementById('walk');
    const wr = walk ? walk.getBoundingClientRect() : null;
    return {
      overlay: ov ? { cls: ov.className, opacity: cs.opacity, display: cs.display, visibility: cs.visibility, bg: cs.backgroundColor, childCount: ov.children.length, innerLen: ov.innerHTML.length, rect: JSON.stringify(ov.getBoundingClientRect().toJSON()) } : null,
      app: acs ? { opacity: acs.opacity, display: acs.display, visibility: acs.visibility, transform: acs.transform } : null,
      walkPane: wr ? { w: Math.round(wr.width), h: Math.round(wr.height), top: Math.round(wr.top) } : null,
      walkOpacity: walk ? getComputedStyle(walk).opacity : null,
      bodyText: document.body.innerText.trim().slice(0, 80),
      nAnims: document.getAnimations().length,
    };
  });
  console.log('\n===== reducedMotion =', rm, '=====');
  console.log(JSON.stringify(d, null, 1));
  await p.screenshot({ path: SHOTS + `firstload-1280-rm-${rm}.png` });
  await p.close();
}
await b.close();
