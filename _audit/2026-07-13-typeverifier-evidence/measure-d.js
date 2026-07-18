// PKG-D instrument: rail lift (.cmp-*), mobile scroll affordance, desktop-inert, a11y. My own.
const { chromium } = require('playwright');
const htmlPath = process.argv[2], label = process.argv[3];
const shotDir = process.argv[4] || null;
const url = 'file:///' + htmlPath.replace(/\\/g,'/');
const TOPICS = ['content-pipeline','saga','autoscaling']; // architecture-apis, messaging-events, platform-infra
const boot = (t,v)=> t==='content-pipeline' ? '#'+v : '#'+t+'/'+v;

async function setTheme(page, theme){ await page.evaluate(t=>{ document.documentElement.setAttribute('data-theme', t); }, theme); }

async function railFS(page){
  // scan views until .cmp-* prose present; measure all cmp-* classes
  const views=['walk','drill','wb','sys','trade','model','num','rf','open'];
  for(const v of views){
    await page.evaluate(h=>{window.location.hash=h;}, boot('content-pipeline', v));
    await page.waitForTimeout(200);
    const found = await page.evaluate(()=>!!document.querySelector('.cmp-thesis,.cmp-note,.cmp-move,.cmp-drive'));
    if(found) break;
  }
  return await page.evaluate(()=>{
    const out={};
    document.querySelectorAll('[class*="cmp-"]').forEach(el=>{
      const c=[...el.classList].find(x=>x.startsWith('cmp-')); if(!c) return;
      const cs=getComputedStyle(el);
      if(!out[c]) out[c]={px:parseFloat(cs.fontSize), n:0, txt:(el.textContent||'').trim().slice(0,20)};
      out[c].n++;
    });
    return out;
  });
}

async function readSeg(page){
  return await page.evaluate(()=>{
    const s=document.querySelector('.sidebar .seg'); if(!s) return {err:'no strip'};
    const cs=getComputedStyle(s), bef=getComputedStyle(s,'::before'), aft=getComputedStyle(s,'::after');
    return {
      pos:cs.position, scrollW:s.scrollWidth, clientW:s.clientWidth, scrollLeft:Math.round(s.scrollLeft),
      fl:cs.getPropertyValue('--fl').trim(), fr:cs.getPropertyValue('--fr').trim(),
      befW:parseFloat(bef.width)||0, aftW:parseFloat(aft.width)||0,
      befContent:bef.content, aftContent:aft.content,
      befPE:bef.pointerEvents, befZ:bef.zIndex, segBg:cs.getPropertyValue('--seg-bg').trim()
    };
  });
}

async function scrollStrip(page, pos){ // pos: 'start'|'mid'|'end'
  await page.evaluate((pos)=>{
    const s=document.querySelector('.sidebar .seg'); if(!s) return;
    const max=s.scrollWidth - s.clientWidth;
    s.scrollLeft = pos==='start'?0 : pos==='end'?max : Math.round(max/2);
    s.dispatchEvent(new Event('scroll'));
  }, pos);
  await page.waitForTimeout(120);
}

(async()=>{
  const browser=await chromium.launch();
  const R={label, rail:{}, seg:{}, a11y:{}, desktop:{}};

  // RAIL (claim 3) + DESKTOP-INERT (claim 2) at 1280
  const dp=await browser.newPage({viewport:{width:1280,height:800}});
  await dp.goto(url,{waitUntil:'load'}); await dp.waitForTimeout(700);
  for(const t of TOPICS){
    await dp.evaluate(h=>{window.location.hash=h;}, boot(t,'walk'));
    await dp.waitForTimeout(200);
    // rail measured on content-pipeline via railFS(); for per-topic just capture cmp map on current
  }
  R.rail = await railFS(dp);
  R.desktop = await readSeg(dp);
  await dp.close();

  // MOBILE AFFORDANCE (claim 1) at 360 + 390, 3 topics, 2 themes, 3 scroll positions
  for(const vw of [360,390]){
    const mp=await browser.newPage({viewport:{width:vw,height:vw===360?740:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2});
    await mp.goto(url,{waitUntil:'load'}); await mp.waitForTimeout(700);
    for(const theme of ['light','dark']){
      for(const t of TOPICS){
        await mp.evaluate(h=>{window.location.hash=h;}, boot(t,'walk'));
        await mp.waitForTimeout(250);
        await setTheme(mp, theme);
        await mp.waitForTimeout(80);
        const key=`${vw}|${theme}|${t}`;
        R.seg[key]={};
        for(const pos of ['start','mid','end']){
          await scrollStrip(mp, pos);
          R.seg[key][pos]=await readSeg(mp);
          // save a strip screenshot for content-pipeline light+dark at 390
          if(shotDir && vw===390 && t==='content-pipeline'){
            const s=await mp.$('.sidebar .seg');
            if(s) await s.screenshot({path:`${shotDir}/${label}-strip-${theme}-${pos}.png`}).catch(()=>{});
          }
        }
      }
    }
    // A11Y at this viewport (once, content-pipeline light)
    if(vw===390){
      await mp.evaluate(h=>{window.location.hash=h;}, boot('content-pipeline','walk'));
      await mp.waitForTimeout(200); await setTheme(mp,'light'); await scrollStrip(mp,'mid');
      R.a11y = await mp.evaluate(()=>{
        const s=document.querySelector('.sidebar .seg');
        const btns=[...s.querySelectorAll('button')];
        const heights=btns.map(b=>Math.round(b.getBoundingClientRect().height));
        const minH=Math.min(...heights);
        // edge overlap: right scrim vs last button rect
        const aft=getComputedStyle(s,'::after'); const scrimW=parseFloat(aft.width)||0;
        const sr=s.getBoundingClientRect();
        const last=btns[btns.length-1].getBoundingClientRect();
        return { nBtns:btns.length, minBtnH:minH, heights:heights.slice(0,3),
          scrimPE:aft.pointerEvents, scrimZ:aft.zIndex, scrimW:Math.round(scrimW),
          stripRight:Math.round(sr.right), lastBtnRight:Math.round(last.right) };
      });
      // reduced-motion recheck
      await mp.emulateMedia({reducedMotion:'reduce'});
      await scrollStrip(mp,'start'); const rmStart=await readSeg(mp);
      await scrollStrip(mp,'end'); const rmEnd=await readSeg(mp);
      R.a11y.reducedMotion={ startAftW:rmStart.aftW, startBefW:rmStart.befW, endBefW:rmEnd.befW, endAftW:rmEnd.aftW };
      await mp.emulateMedia({reducedMotion:null});
    }
    await mp.close();
  }
  await browser.close();
  const fs=require('fs');
  if(shotDir) fs.writeFileSync(`${shotDir}/out-${label}.json`, JSON.stringify(R));
  console.log(JSON.stringify(R));
})();
