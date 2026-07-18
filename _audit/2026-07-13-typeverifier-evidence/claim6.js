// Independent light-DOM boundary check: signature of every light-DOM element (no shadow pierce), diffed.
const { chromium } = require('playwright');
const url = 'file:///' + process.argv[2].replace(/\\/g,'/');
const outPath = process.argv[3];
const fs = require('fs');
const ROUTES = ['#home', '#walk', '#content-pipeline/drill', '#saga/walk'];
async function sig(page){
  return await page.evaluate(()=>{
    const rows=[];
    const els=document.querySelectorAll('body *');
    for(let i=0;i<els.length;i++){
      const el=els[i]; const cs=getComputedStyle(el);
      // skip the deep-* pane host subtrees' internals? they're shadow (excluded already). Keep hosts.
      const cls=(el.className&&typeof el.className==='string')?el.className.trim().split(/\s+/).slice(0,3).join('.'):'';
      const r=el.getBoundingClientRect();
      rows.push(el.tagName+'.'+cls+'|fs='+cs.fontSize+'|lh='+cs.lineHeight+'|mw='+cs.maxWidth+'|w='+Math.round(r.width));
    }
    return rows;
  });
}
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1536,height:864}});
  await page.goto(url,{waitUntil:'load'}); await page.waitForTimeout(800);
  const all={};
  for(const rt of ROUTES){
    await page.evaluate(h=>{window.location.hash=h;}, rt);
    await page.waitForTimeout(400);
    // try to open index overlay too on the first route
    all[rt]=await sig(page);
  }
  // index overlay attempt
  await page.evaluate(()=>{ try{ if(window.IndexOverlay&&IndexOverlay.open)IndexOverlay.open(); }catch(e){}
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'i',bubbles:true})); });
  await page.waitForTimeout(400);
  all['overlay']=await sig(page);
  fs.writeFileSync(outPath, JSON.stringify(all));
  console.log('routes:', Object.keys(all).map(k=>k+':'+all[k].length).join('  '));
  await b.close();
})();
