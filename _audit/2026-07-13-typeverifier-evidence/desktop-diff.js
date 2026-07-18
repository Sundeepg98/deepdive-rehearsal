const { chromium } = require('playwright');
const url='file:///'+process.argv[2].replace(/\\/g,'/');
const out=process.argv[3];
const fs=require('fs');
const ROUTES=['#home','#walk','#autoscaling/walk'];
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1280,height:800}});
  await page.goto(url,{waitUntil:'load'}); await page.waitForTimeout(700);
  const all={};
  for(const rt of ROUTES){
    await page.evaluate(h=>{window.location.hash=h;},rt); await page.waitForTimeout(350);
    all[rt]=await page.evaluate(()=>{
      const rows=[]; const els=document.querySelectorAll('body *');
      for(let i=0;i<els.length;i++){const el=els[i],cs=getComputedStyle(el);
        const cls=(el.className&&typeof el.className==='string')?el.className.trim().split(/\s+/).slice(0,2).join('.'):'';
        rows.push(el.tagName+'.'+cls+'|fs='+cs.fontSize+'|pos='+cs.position+'|w='+Math.round(el.getBoundingClientRect().width));
      }
      return rows;
    });
  }
  fs.writeFileSync(out, JSON.stringify(all));
  console.log('captured', Object.keys(all).map(k=>k+':'+all[k].length).join(' '));
  await b.close();
})();
