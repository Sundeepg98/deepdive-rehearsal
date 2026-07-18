// Whiteboard diagram labels measured with wb ACTIVE (lazy render), + boxed-card widths across panes.
const { chromium } = require('playwright');
const htmlPath = process.argv[2], label = process.argv[3];
const url = 'file:///' + htmlPath.replace(/\\/g,'/');
const TOPICS = ['content-pipeline','saga','sharding-strategies','circuit-breaker','autoscaling','multi-tenant'];
const boot=(t,v)=>t==='content-pipeline'?('#'+v):('#'+t+'/'+v);

async function fsIn(page, host, sels){
  return await page.evaluate(({host,sels})=>{
    const h=document.querySelector(host); const r=h&&h.shadowRoot; const o={};
    for(const s of sels){ const e=r&&r.querySelector(s); o[s]=e?{px:parseFloat(getComputedStyle(e).fontSize),n:r.querySelectorAll(s).length}:{px:null,n:0}; }
    return o;
  },{host,sels});
}
async function widthIn(page, host, sel){
  return await page.evaluate(({host,sel})=>{
    const h=document.querySelector(host); const r=h&&h.shadowRoot;
    const e=r&&[...r.querySelectorAll(sel)].filter(x=>x.clientWidth>0)[0];
    return e?Math.round(e.getBoundingClientRect().width):null;
  },{host,sel});
}
(async()=>{
  const b=await chromium.launch();
  const out={label,data:{}};
  for(const vw of [1536,1280]){
    const page=await b.newPage({viewport:{width:vw,height:864}});
    await page.goto(url,{waitUntil:'load'}); await page.waitForTimeout(700);
    out.data[vw]={};
    for(const t of TOPICS){
      await page.evaluate(h=>{window.location.hash=h;}, boot(t,'wb'));
      await page.waitForTimeout(350);
      const wb=await fsIn(page,'deep-whiteboard',['.dgm-lbl','.dgm-note','.dgm-foot','.dgm-t','.dgm-s','.step-sub','.wb-ans','.wb-cue']);
      // boxed cards on several panes
      await page.evaluate(h=>{window.location.hash=h;}, boot(t,'rf')); await page.waitForTimeout(250);
      const rfBox=await widthIn(page,'deep-red-flags','.rf-c');
      await page.evaluate(h=>{window.location.hash=h;}, boot(t,'trade')); await page.waitForTimeout(250);
      const tradeBox=await widthIn(page,'deep-trade-offs','.opt');
      await page.evaluate(h=>{window.location.hash=h;}, boot(t,'num')); await page.waitForTimeout(250);
      const numBox=await widthIn(page,'deep-numbers','.nrow');
      out.data[vw][t]={wb,rfBox,tradeBox,numBox};
    }
    await page.close();
  }
  await b.close();
  console.log(JSON.stringify(out));
})();
