import { chromium } from 'playwright';
const URL='file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(900);
await p.evaluate(()=>{document.documentElement.dataset.theme='dark';});
await p.click('.ix-x').catch(()=>{}); await p.waitForTimeout(400);
await p.click('#toolsfab'); await p.waitForTimeout(700);
const r = await p.evaluate(()=>{
  const g=s=>{const e=document.querySelector(s); const cs=getComputedStyle(e); return {bg:cs.backgroundColor,shadow:cs.boxShadow,border:cs.border, bd:cs.borderTop};};
  return {
    mockbar_DARK: g('.sidebar .mockbar'),
    mockPanel_DARK_forComparison: (()=>{const e=document.querySelector('.mock-panel'); const cs=getComputedStyle(e); return {bg:cs.backgroundColor.slice(0,30), shadow:cs.boxShadow.slice(0,110)};})(),
    backdrop: (()=>{const e=document.querySelector('.tools-bd'); const cs=getComputedStyle(e); return {bg:cs.backgroundColor, display:cs.display};})(),
    pageBg: getComputedStyle(document.body).backgroundColor,
    grabber: (()=>{const cs=getComputedStyle(document.querySelector('.sidebar .mockbar'),'::before'); return {w:cs.width,h:cs.height,bg:cs.backgroundColor};})(),
    ctaBar_DARK: g('.sidebar .mockcta')
  };
});
console.log(JSON.stringify(r,null,1));
await b.close();
