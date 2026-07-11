import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';

const b = await chromium.launch();

async function boot(w, h, isMobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const x = await p.$('.ix-ov.open .ix-x');
  if (x) { await x.click(); await p.waitForTimeout(500); }
  return { ctx, p };
}

const M = () => {
  const q = s => document.querySelector(s);
  const vw = document.documentElement.clientWidth;
  const vis = e => { const bb = e.getBoundingClientRect(); const v = Math.max(0, Math.min(bb.right, vw) - Math.max(bb.left, 0)); return { x: +bb.x.toFixed(1), w: +bb.width.toFixed(1), right: +bb.right.toFixed(1), visiblePx: +v.toFixed(1), hiddenPct: +(100 * (1 - v / bb.width)).toFixed(0) }; };
  return {
    innerWidth: window.innerWidth,
    docClientWidth: document.documentElement.clientWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    visualViewportW: window.visualViewport ? +window.visualViewport.width.toFixed(1) : null,
    visualScale: window.visualViewport ? +window.visualViewport.scale.toFixed(3) : null,
    mockcta: vis(q('.sidebar .mockcta')),
    toolsfab: vis(q('#toolsfab')),
    mockbtn: vis(q('#mockopen')),
    inttog: vis(q('#inttog')),
    seg: vis(q('.sidebar .seg')),
    topicnav: vis(q('#topicnav')),
    tnnext: vis(q('#tnnext')),
  };
};

for (const isMobile of [false, true]) {
  console.log(`\n\n################ isMobile=${isMobile} ################`);
  for (const w of [390, 375, 360, 320]) {
    const { ctx, p } = await boot(w, 844, isMobile);
    const m = await p.evaluate(M);
    console.log(`\n--- vw=${w} isMobile=${isMobile} ---`);
    console.log(`  innerWidth=${m.innerWidth} docClientWidth=${m.docClientWidth} docScrollWidth=${m.docScrollWidth} visualVP=${m.visualViewportW} scale=${m.visualScale}`);
    console.log(`  .mockcta  x=${m.mockcta.x} w=${m.mockcta.w} right=${m.mockcta.right}  hidden=${m.mockcta.hiddenPct}%`);
    console.log(`  #toolsfab x=${m.toolsfab.x} w=${m.toolsfab.w} right=${m.toolsfab.right}  hidden=${m.toolsfab.hiddenPct}%   <-- lens claims 32% at 360`);
    console.log(`  .seg      w=${m.seg.w} right=${m.seg.right}`);
    console.log(`  #topicnav w=${m.topicnav.w} right=${m.topicnav.right}   #tnnext hidden=${m.tnnext.hiddenPct}%`);
    if (w === 360) {
      await p.screenshot({ path: `${SHOTS}/f1b-360-isMobile-${isMobile}.png` });
    }
    await ctx.close();
  }
}

await b.close();
