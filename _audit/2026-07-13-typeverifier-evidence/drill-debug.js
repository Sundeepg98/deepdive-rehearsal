const { chromium } = require('playwright');
const url = 'file:///' + process.argv[2].replace(/\\/g,'/');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport:{width:1536,height:864} });
  await page.goto(url,{waitUntil:'load'}); await page.waitForTimeout(800);
  await page.evaluate(()=>{ window.location.hash='#saga/drill'; });
  await page.waitForTimeout(500);
  const out = await page.evaluate(async ()=>{
    const r=document.querySelector('deep-drill').shadowRoot;
    const sleep=ms=>new Promise(x=>setTimeout(x,ms));
    const grab=s=>{const e=r.querySelector(s);return e?{px:parseFloat(getComputedStyle(e).fontSize),txt:(e.textContent||'').trim().slice(0,24)}:null;};
    const res={maxStage:{},debrief:{},steps:[]};
    for(let i=0;i<14;i++){const a=r.getElementById('adv');if(!a)break;a.click();await sleep(55);}
    res.maxStage={ans:grab('.ans'),senior:grab('.senior'),speak:grab('.speak'),speakSl:grab('.speak .sl'),mhpT:grab('.mhp-t'),mhpCov:grab('.mhp-cov')};
    for(let p=0;p<40;p++){
      for(let i=0;i<14;i++){const a=r.getElementById('adv');if(!a)break;a.click();await sleep(35);}
      if(r.querySelector('.verdict')){res.steps.push('debrief@'+p);break;}
      const jg=r.getElementById('jg'); if(!jg){res.steps.push('no-jg@'+p);break;} jg.click(); await sleep(55);
      if(r.querySelector('.verdict')){res.steps.push('debrief-after-jg@'+p);break;}
    }
    res.debrief={verdict:grab('.verdict'),sigrowNm:grab('.sigrow .nm')};
    return res;
  });
  console.log(JSON.stringify(out,null,1));
  await b.close();
})();
