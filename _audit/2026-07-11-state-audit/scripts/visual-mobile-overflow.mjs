import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const b = await chromium.launch();

for (const W of [430, 390, 375, 360, 320]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.click('.ix-x').catch(() => {});
  await p.waitForTimeout(400);
  const m = await p.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const R = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
      return { w: +r.width.toFixed(1), l: +r.left.toFixed(1), r: +r.right.toFixed(1), cut: +Math.max(0, r.right - cw).toFixed(1) }; };
    const kids = [...document.querySelectorAll('#topicnav > *')].filter(e => !e.hidden && getComputedStyle(e).display !== 'none')
      .map(e => { const r = e.getBoundingClientRect();
        return { id: e.id || e.className, w: +r.width.toFixed(1), l: +r.left.toFixed(1), r: +r.right.toFixed(1) }; });
    return {
      clientW: cw, docScrollW: document.documentElement.scrollWidth,
      app: R('.app'), sidebar: R('.sidebar'), sideId: R('.side-id'), topicnav: R('#topicnav'),
      tnnext: R('#tnnext'), tnnextCutOffPx: R('#tnnext') ? R('#tnnext').cut : null,
      mockcta: R('.sidebar .mockcta'), inttog: R('#inttog'), toolsfab: R('#toolsfab'),
      topicnavKids: kids,
      hdr: R('.side-id .hdr'), locator: R('.locator'), h1: R('.side-id h1')
    };
  });
  const cut = m.tnnextCutOffPx;
  console.log(`\n===== ${W}px  (docScrollW=${m.docScrollW}, overflow=${m.docScrollW - W}px) =====`);
  console.log(`  .app        w=${m.app.w}  right=${m.app.r}`);
  console.log(`  .side-id    w=${m.sideId.w}  right=${m.sideId.r}`);
  console.log(`  #topicnav   w=${m.topicnav.w}  left=${m.topicnav.l} right=${m.topicnav.r}  -> ${m.topicnav.cut}px past viewport`);
  console.log(`  #tnnext     w=${m.tnnext.w}  left=${m.tnnext.l} right=${m.tnnext.r}  -> ${cut}px CUT OFF  ${cut > 0 ? '*** CLIPPED ***' : 'ok'}`);
  console.log(`  .mockcta    w=${m.mockcta.w} right=${m.mockcta.r} -> ${m.mockcta.cut}px past viewport`);
  console.log(`  #inttog     w=${m.inttog.w} right=${m.inttog.r} -> ${m.inttog.cut}px past`);
  console.log(`  #toolsfab   w=${m.toolsfab.w} right=${m.toolsfab.r} -> ${m.toolsfab.cut}px past`);
  console.log(`  topicnav kids: ${m.topicnavKids.map(k => `${k.id}=${k.w}`).join('  ')}`);
  console.log(`  .hdr w=${m.hdr.w}  h1 w=${m.h1.w}  locator w=${m.locator.w}`);
  if (W === 360 || W === 390) {
    await p.evaluate(() => window.scrollTo(0, 0));
    const el = await p.locator('#topicnav');
    await el.screenshot({ path: `${SHOTS}/topicnav-clip-${W}.png` }).catch(() => {});
    await p.screenshot({ path: `${SHOTS}/topicnav-clip-full-${W}.png`, clip: { x: 0, y: 56, width: W, height: 175 } });
  }
  await ctx.close();
}
await b.close();
