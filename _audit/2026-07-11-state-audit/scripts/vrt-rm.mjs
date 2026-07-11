// Why was the reduced-motion screenshot blank? Artifact of my script, or a real bug?
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rtperf';

for (const rm of ['reduce', 'no-preference']) {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: rm });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.locator('#_index-overlay [data-topic="kafka-internals"]').first().click();
  await page.waitForTimeout(1200);
  await page.locator('button[data-tab="viz"]:visible').first().click();
  await page.waitForTimeout(3000);

  const probe = await page.evaluate(() => {
    const cs = e => (e ? getComputedStyle(e) : null);
    const pane = document.getElementById('viz');
    const stage = document.querySelector('.stage');
    const dv = document.querySelector('deep-visual');
    const cv = dv && dv.shadowRoot && dv.shadowRoot.querySelector('canvas');
    const pick = (e, n) => { const s = cs(e); return s ? { el: n, opacity: s.opacity, visibility: s.visibility, display: s.display, transform: s.transform, filter: s.filter } : { el: n, MISSING: true }; };
    const r = cv ? cv.getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      stageScrollTop: stage ? stage.scrollTop : null,
      styles: [pick(document.documentElement, 'html'), pick(document.body, 'body'), pick(stage, '.stage'), pick(pane, '#viz'), pick(dv, 'deep-visual'), pick(cv, 'canvas')],
      canvasRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      canvasAttr: cv ? [cv.width, cv.height] : null,
      bodyText: (document.body.innerText || '').trim().slice(0, 60),
      runningAnims: document.getAnimations().map(a => ({ name: a.animationName, state: a.playState })).slice(0, 8),
    };
  });
  console.log(`\n### reducedMotion=${rm}`);
  console.log(JSON.stringify(probe, null, 1));
  await page.screenshot({ path: `${SHOTS}/rm-${rm}-viewport.png` });
  await page.screenshot({ path: `${SHOTS}/rm-${rm}-fullpage.png`, fullPage: true });
  await b.close();
}
