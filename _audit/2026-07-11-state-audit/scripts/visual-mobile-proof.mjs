import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const b = await chromium.launch();
for (const W of [360, 375]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.click('.ix-x').catch(() => {});
  await p.waitForTimeout(500);
  // crop: the topic-nav row
  await p.screenshot({ path: `${SHOTS}/BUG-topicnav-cut-${W}.png`, clip: { x: 0, y: 160, width: W, height: 70 } });
  // crop: the bottom bar (Tools button cut off)
  await p.screenshot({ path: `${SHOTS}/BUG-bottombar-cut-${W}.png`, clip: { x: 0, y: 715, width: W, height: 129 } });
  // proof the Tools button is not fully clickable
  const t = await p.evaluate(() => {
    const el = document.getElementById('toolsfab'); const r = el.getBoundingClientRect();
    const cw = document.documentElement.clientWidth;
    const visibleW = Math.max(0, Math.min(r.right, cw) - r.left);
    return { toolsW: +r.width.toFixed(1), toolsLeft: +r.left.toFixed(1), toolsRight: +r.right.toFixed(1), clientW: cw,
      visibleWidthPx: +visibleW.toFixed(1), hiddenPct: +(100 * (1 - visibleW / r.width)).toFixed(0),
      // is the far-right of the button hittable?
      elAtRightEdge: (() => { const x = Math.min(r.right - 4, cw - 1); const e = document.elementFromPoint(x, r.top + r.height / 2);
        return e ? (e.id || e.className || e.tagName) : 'NOTHING (off-screen)'; })() };
  });
  console.log(`--- ${W}px  Tools button: ${JSON.stringify(t)}`);
  const n = await p.evaluate(() => {
    const el = document.getElementById('tnnext'); const r = el.getBoundingClientRect();
    const cw = document.documentElement.clientWidth;
    const visibleW = Math.max(0, Math.min(r.right, cw) - r.left);
    return { nextW: +r.width.toFixed(1), visibleWidthPx: +visibleW.toFixed(1), hiddenPct: +(100 * (1 - visibleW / r.width)).toFixed(0) };
  });
  console.log(`--- ${W}px  Next-topic btn: ${JSON.stringify(n)}`);
  await ctx.close();
}
await b.close();
