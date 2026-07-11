import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil:'load' });
await p.waitForTimeout(1000);
await p.click('.ix-x').catch(()=>{});
await p.waitForTimeout(400);
await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0,0); });
await p.waitForTimeout(600);

const bar = await p.evaluate(() => {
  const cta = document.querySelector('.sidebar .mockcta'); const r = cta.getBoundingClientRect();
  return { h:+r.height.toFixed(1), pctOfViewport:+(r.height/innerHeight*100).toFixed(1), top:+r.top.toFixed(1),
    rows:[...cta.children].map(c=>{const cr=c.getBoundingClientRect(); return {id:c.id||c.className, w:+cr.width.toFixed(1), h:+cr.height.toFixed(1), y:+cr.y.toFixed(1)};}) };
});
console.log('BOTTOM BAR:', JSON.stringify(bar,null,1));
await p.screenshot({ path:`${S}/bottombar-390.png`, clip:{x:0,y:715,width:390,height:129} });

// companion accordion: does it animate or snap? measure height over time right after click
const snap = await p.evaluate(async () => {
  const d = document.querySelector('.mcomp');
  const h0 = d.getBoundingClientRect().height;
  d.querySelector('.mcomp-sum').click();
  const samples = [];
  for (let i=0;i<6;i++){ await new Promise(r=>requestAnimationFrame(r)); samples.push(+d.getBoundingClientRect().height.toFixed(0)); }
  await new Promise(r=>setTimeout(r,400));
  const hEnd = d.getBoundingClientRect().height;
  return { before:+h0.toFixed(0), framesAfterClick:samples, after:+hEnd.toFixed(0),
    jumpPx:+(hEnd-h0).toFixed(0), animatedOverFrames: new Set(samples).size > 2 };
});
console.log('COMPANION ACCORDION:', JSON.stringify(snap));

// scroll position of the content after opening the accordion
const push = await p.evaluate(() => {
  const pane = document.querySelector('.pane.on');
  const first = pane.firstElementChild.getBoundingClientRect();
  return { paneContentTopAfterOpen:+first.top.toFixed(0) };
});
console.log('CONTENT PUSH:', JSON.stringify(push));
await p.screenshot({ path:`${S}/companion-open-390.png` });
await b.close();
