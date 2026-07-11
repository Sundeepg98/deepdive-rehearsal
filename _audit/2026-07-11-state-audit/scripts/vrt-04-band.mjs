/* F2 sub-check: is 1280 really "the narrowest column of ANY viewport >=900px"?
   Fine 1px sweep 900..1120 + the 1280..1519 band. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(600);

const col = async (w) => {
  await p.setViewportSize({ width: w, height: 800 });
  await p.waitForTimeout(60);
  return await p.evaluate(() => {
    const pane = document.querySelector('.stage .pane.on');
    return pane ? Math.round(pane.getBoundingClientRect().width) : -1;
  });
};

const pts = [];
for (let w = 900; w <= 1120; w += 4) pts.push({ w, c: await col(w) });
const narrower = pts.filter(x => x.c < 592);
console.log('=== Widths in 900..1120 whose reading column is NARROWER than the 592px @1280 ===');
console.log('count:', narrower.length, 'of', pts.length, 'sampled');
if (narrower.length) {
  console.log('band  :', narrower[0].w + 'px .. ' + narrower[narrower.length - 1].w + 'px');
  const worst = narrower.reduce((m, x) => x.c < m.c ? x : m);
  console.log('worst :', worst.c + 'px column @ vw ' + worst.w + 'px   (vs 592px @1280)');
}
console.log('\nsample: ' + pts.filter(x => x.w % 20 === 0).map(x => x.w + '->' + x.c).join('  '));

// global minimum for vw >= 900, scanning to 1920
let gmin = { w: 0, c: 1e9 };
for (let w = 900; w <= 1920; w += 8) { const c = await col(w); if (c < gmin.c) gmin = { w, c }; }
console.log('\nGLOBAL narrowest column for any vw in [900,1920]:', gmin.c + 'px @ vw ' + gmin.w + 'px');
console.log('=> lens claim "1280 = narrowest column of any viewport >=900px" is', gmin.c < 592 ? 'FALSE' : 'TRUE');
await b.close();
