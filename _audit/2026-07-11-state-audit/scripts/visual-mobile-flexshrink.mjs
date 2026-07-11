import { chromium } from 'playwright';
const URL='file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S='D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(900);
await p.click('.ix-x').catch(()=>{}); await p.waitForTimeout(400);
await p.click('#toolsfab'); await p.waitForTimeout(700);

const before = await p.evaluate(()=>{
  const mb=document.querySelector('.sidebar .mockbar'); const cs=getComputedStyle(mb);
  const rows=[...mb.querySelectorAll('.crambtn')].map(e=>+e.getBoundingClientRect().height.toFixed(1));
  return { display:cs.display, flexDir:cs.flexDirection, maxHeight:cs.maxHeight, overflowY:cs.overflowY,
    scrollH:mb.scrollHeight, clientH:mb.clientHeight,
    grabberH:getComputedStyle(mb,'::before').height,
    crambtnHeights:rows, crambtnMin:Math.min(...rows), crambtnMax:Math.max(...rows),
    firstRowFlexShrink:getComputedStyle(mb.querySelector('.crambtn')).flexShrink,
    firstRowMinHeight:getComputedStyle(mb.querySelector('.crambtn')).minHeight,
    firstRowPadding:getComputedStyle(mb.querySelector('.crambtn')).padding };
});
console.log('BEFORE (as shipped):', JSON.stringify(before,null,1));

// hypothesis: children are being flex-shrunk. Pin flex-shrink:0 and re-measure.
await p.addStyleTag({ content: `.sidebar .mockbar > *{flex-shrink:0 !important}` });
await p.waitForTimeout(400);
const after = await p.evaluate(()=>{
  const mb=document.querySelector('.sidebar .mockbar');
  const rows=[...mb.querySelectorAll('.crambtn')].map(e=>+e.getBoundingClientRect().height.toFixed(1));
  return { scrollH:mb.scrollHeight, clientH:mb.clientHeight,
    crambtnHeights:rows, crambtnMin:Math.min(...rows), crambtnMax:Math.max(...rows),
    nowScrolls: mb.scrollHeight > mb.clientHeight+1 };
});
console.log('AFTER flex-shrink:0 :', JSON.stringify(after,null,1));
console.log(`\n=> rows grew from ${before.crambtnMin}px to ${after.crambtnMin}px  (natural height was being squashed by ${(after.crambtnMin-before.crambtnMin).toFixed(1)}px)`);
await p.screenshot({ path:`${S}/tools-drawer-flexshrink-fixed.png` });
await b.close();
