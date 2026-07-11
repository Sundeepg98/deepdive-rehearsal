import { chromium } from 'playwright';
const URL='file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'load'}); await p.waitForTimeout(900);
await p.click('.ix-x').catch(()=>{}); await p.waitForTimeout(400);
await p.click('#mockopen'); await p.waitForTimeout(900);
const m = await p.evaluate(()=>{
  const ov=document.querySelector('#mockov'); const panel=ov.querySelector('.mock-panel');
  const pr=panel.getBoundingClientRect();
  const btns=[];
  (function walk(r){ r.querySelectorAll('button').forEach(e=>{const cs=getComputedStyle(e); if(cs.display==='none')return;
      const rr=e.getBoundingClientRect(); if(rr.height===0)return;
      btns.push({txt:(e.textContent||'').trim().slice(0,18), y:+rr.y.toFixed(0), h:+rr.height.toFixed(0), w:+rr.width.toFixed(0),
        distFromBottom:+(844-rr.bottom).toFixed(0)});});
    r.querySelectorAll('*').forEach(e=>{if(e.shadowRoot)walk(e.shadowRoot);}); })(panel);
  // keyboard hint text present?
  let kbd=null;
  (function walk(r){ r.querySelectorAll('*').forEach(e=>{ if(e.children.length)return;
      const t=(e.textContent||'').trim(); if(/Space reveal|Esc close|Enter next/i.test(t)) kbd={txt:t, cls:(typeof e.className==='string'?e.className:''), fs:getComputedStyle(e).fontSize};});
    r.querySelectorAll('*').forEach(e=>{if(e.shadowRoot)walk(e.shadowRoot);}); })(panel);
  return { panel:{y:+pr.y.toFixed(0), h:+pr.height.toFixed(0), bottom:+pr.bottom.toFixed(0), w:+pr.width.toFixed(0)},
    deadSpaceBelowPanelPx:+(844-pr.bottom).toFixed(0),
    deadSpacePct:+((844-pr.bottom)/844*100).toFixed(0),
    buttons:btns, keyboardHintOnMobile:kbd,
    align: getComputedStyle(document.querySelector('#mockov')).alignItems };
});
console.log(JSON.stringify(m,null,1));
await b.close();
