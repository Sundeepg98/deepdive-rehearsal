// Independent PKG-B typography instrument. My own; reads nothing from the fixer.
const { chromium } = require('playwright');
const htmlPath = process.argv[2];
const label = process.argv[3] || 'artifact';
const url = 'file:///' + htmlPath.replace(/\\/g, '/');

const TOPICS = ['content-pipeline','saga','sharding-strategies','circuit-breaker','autoscaling','multi-tenant'];
const VIEWPORTS = [ {w:1536,h:864}, {w:1280,h:800}, {w:360,h:740} ];

// [hostTag, selector, claim, expectPx|null, gated?]
const FS = [
  ['deep-walkthrough','.ins',1,16.5,false],
  ['deep-model-answers','.mbeat-t',1,16.5,false],
  ['deep-drill','.ans',1,16.5,true],
  ['deep-red-flags','.rf-tell',2,14,false],
  ['deep-red-flags','.rf-bad',2,14,false],
  ['deep-red-flags','.rf-fix',2,14,false],
  ['deep-trade-offs','.opt-w',2,14,false],
  ['deep-trade-offs','.dec-tell',2,14,false],
  ['deep-system-map','.sm-intro',2,14,false],
  ['deep-system-map','.pq',2,14,false],
  ['deep-system-map','.pa',2,14,false],
  ['deep-numbers','.num-tell',2,14,false],
  ['deep-opener','.op-lead',2,14,false],
  ['deep-model-answers','.mscript-sub',2,14,false],
  ['deep-whiteboard','.step-sub',2,14,false],
  ['deep-drill','.speak',2,14,true],
  ['deep-drill','.verdict',2,14,true],
  ['deep-drill','.senior',2,14,true],
  ['deep-drill','.mhp-t',2,14,true],
  ['deep-whiteboard','.dgm-lbl',4,11,false],
  ['deep-whiteboard','.dgm-note',4,11,false],
  ['deep-whiteboard','.dgm-foot',4,11,false],
  ['deep-system-map','.chip',4,11,false],
  ['deep-system-map','.here',4,11,false],
  ['deep-drill','.qk',4,11,false],
  ['deep-drill','.sigtag',4,11,false],
  ['deep-drill','.tier',4,11,false],
  ['deep-model-answers','.mbeat-l',4,11,false],
  ['deep-numbers','.nrow-n',4,12,false],
  ['deep-numbers','.nrow-k',5,13,false],
  ['deep-numbers','.nv-u',5,13,false],
  ['deep-drill','.sigrow .nm',5,13,true],
  ['deep-drill','.mhp-cov',5,12,true],
  ['deep-drill','.revset-h',5,12,false],
  ['deep-walkthrough','.nav .ctr',5,12,false],
  ['deep-walkthrough','.arc-t',5,12,false],
  ['deep-whiteboard','.dgm-t',5,12.5,false],
  ['deep-whiteboard','.dgm-s',5,11,false],
  ['deep-walkthrough','.arc-h',5,null,false],
  ['deep-numbers','.num-h',5,null,false],
  ['deep-drill','.dnav-h',5,null,false],
  ['deep-drill','.tierlab',5,null,false],
  ['deep-drill','.pill .l',5,null,false],
  ['deep-drill','.speak .sl',5,null,true],
  ['deep-trade-offs','.opt-w .pw',5,null,false],
];

// claim 3 measure targets: [view, hostTag, selector]
const CH = [
  ['sys','deep-system-map','.pa'],
  ['num','deep-numbers','.nrow-n'],
  ['rf','deep-red-flags','.rf-tell'],
  ['trade','deep-trade-offs','.dec-tell'],
  ['open','deep-opener','.op-lead'],
  ['walk','deep-walkthrough','.ins'],
  ['model','deep-model-answers','.mbeat-t'],
];

function boot(topic, view){ return topic === 'content-pipeline' ? ('#'+view) : ('#'+topic+'/'+view); }

// Grind the drill: reveal probe 1 to maxStage (answer stack), then grade all probes to the debrief.
// Returns measurements for the 8 interaction-gated drill selectors, keyed like the FS map.
async function driveDrill(page, full){
  const r = await page.evaluate(async (full) => {
    const root=document.querySelector('deep-drill') && document.querySelector('deep-drill').shadowRoot;
    if(!root) return {};
    const sleep=ms=>new Promise(x=>setTimeout(x,ms));
    const grab=s=>{const e=root.querySelector(s);return e?{px:parseFloat(getComputedStyle(e).fontSize),n:1,txt:(e.textContent||'').trim().slice(0,30)}:{px:null,n:0,txt:''};};
    // probe 1 -> maxStage (cheap; reveals the answer stack)
    for(let i=0;i<14;i++){const a=root.getElementById('adv');if(!a)break;a.click();await sleep(25);}
    const ms={ans:grab('.ans'),senior:grab('.senior'),speak:grab('.speak'),speakSl:grab('.speak .sl'),mhpT:grab('.mhp-t'),mhpCov:grab('.mhp-cov')};
    let db={verdict:{px:null,n:0},sigrowNm:{px:null,n:0}};
    if(full){ // grade every probe to reach the debrief (verdict/sigrow live only there)
      for(let p=0;p<45;p++){
        for(let i=0;i<14;i++){const a=root.getElementById('adv');if(!a)break;a.click();await sleep(15);}
        if(root.querySelector('.verdict'))break;
        const jg=root.getElementById('jg');if(!jg)break;jg.click();await sleep(30);
        if(root.querySelector('.verdict'))break;
      }
      db={verdict:grab('.verdict'),sigrowNm:grab('.sigrow .nm')};
    }
    return {ms,db};
  }, full);
  const ms=r.ms||{}, db=r.db||{};
  return {
    'deep-drill|.ans': ms.ans||{px:null,n:0},
    'deep-drill|.senior': ms.senior||{px:null,n:0},
    'deep-drill|.speak': ms.speak||{px:null,n:0},
    'deep-drill|.speak .sl': ms.speakSl||{px:null,n:0},
    'deep-drill|.mhp-t': ms.mhpT||{px:null,n:0},
    'deep-drill|.mhp-cov': ms.mhpCov||{px:null,n:0},
    'deep-drill|.verdict': db.verdict||{px:null,n:0},
    'deep-drill|.sigrow .nm': db.sigrowNm||{px:null,n:0},
  };
}

// read computed font-size for all FS selectors across all hosts, from shadow roots
async function readFS(page){
  return await page.evaluate((FS) => {
    const out = {};
    for(const [host,sel] of FS){
      const h = document.querySelector(host);
      let px=null,n=0,txt='';
      if(h&&h.shadowRoot){
        const els = h.shadowRoot.querySelectorAll(sel);
        n = els.length;
        if(n){ const cs=getComputedStyle(els[0]); px=parseFloat(cs.fontSize); txt=(els[0].textContent||'').trim().slice(0,40); }
      }
      out[host+'|'+sel] = {px,n,txt};
    }
    return out;
  }, FS);
}

async function readCh(page, host, sel){
  return await page.evaluate(({host,sel}) => {
    const h=document.querySelector(host); if(!h||!h.shadowRoot) return {err:'no host'};
    const els=[...h.shadowRoot.querySelectorAll(sel)].filter(e=>e.clientWidth>0);
    if(!els.length) return {err:'none-visible',raw:h.shadowRoot.querySelectorAll(sel).length};
    // pick the widest visible instance (worst-case line length)
    let best=null;
    for(const el of els){
      const cs=getComputedStyle(el);
      const cw=el.clientWidth - parseFloat(cs.paddingLeft||0) - parseFloat(cs.paddingRight||0);
      const cvs=document.createElement('canvas'); const ctx=cvs.getContext('2d');
      ctx.font=[cs.fontStyle,cs.fontWeight,cs.fontSize,cs.fontFamily].join(' ');
      const chPx=ctx.measureText('0').width;
      const rec={contentPx:Math.round(cw), chPx:+chPx.toFixed(2), ch:+(cw/chPx).toFixed(1), fontSize:parseFloat(cs.fontSize), maxWidth:cs.maxWidth, boxSizing:cs.boxSizing};
      if(!best||rec.ch>best.ch) best=rec;
    }
    return best;
  }, {host,sel});
}

// boxed-card spot check: width of .card in a couple panes (should be viewport-driven, cap-independent)
async function readCard(page, host){
  return await page.evaluate((host)=>{
    const h=document.querySelector(host); if(!h||!h.shadowRoot) return null;
    const c=[...h.shadowRoot.querySelectorAll('.card')].filter(e=>e.clientWidth>0)[0];
    return c?Math.round(c.getBoundingClientRect().width):null;
  }, host);
}

(async () => {
  const browser = await chromium.launch();
  const result = { label, byViewport: {} };
  for(const vp of VIEWPORTS){
    const page = await browser.newPage({ viewport: {width:vp.w,height:vp.h}, deviceScaleFactor:1 });
    await page.goto(url, { waitUntil:'load' });
    await page.waitForTimeout(800);
    const vpKey = vp.w+'x'+vp.h;
    result.byViewport[vpKey] = { fs:{}, ch:{}, card:{} };
    for(const topic of TOPICS){
      // font sizes: drive drill on this topic, then read all
      await page.evaluate((h)=>{ window.location.hash=h; }, boot(topic,'drill'));
      await page.waitForTimeout(350);
      const fs = await readFS(page);           // stage-0: non-gated (incl. drill .qk/.sigtag/.tier) + all panes
      const drill = await driveDrill(page, topic===TOPICS[0]);  // full grind (debrief) only on 1st topic/vp
      Object.assign(fs, drill);
      result.byViewport[vpKey].fs[topic]=fs;
      // ch measurement only where it matters (1536 caps active, 1280 no-op check)
      if(vp.w>=1280){
        const chOut={};
        for(const [view,host,sel] of CH){
          await page.evaluate((h)=>{ window.location.hash=h; }, boot(topic,view));
          await page.waitForTimeout(250);
          chOut[view+'|'+sel]=await readCh(page,host,sel);
        }
        result.byViewport[vpKey].ch[topic]=chOut;
        // card spot-check on rf + sys
        await page.evaluate((h)=>{ window.location.hash=h; }, boot(topic,'rf'));
        await page.waitForTimeout(200);
        result.byViewport[vpKey].card[topic]={rf:await readCard(page,'deep-red-flags')};
        await page.evaluate((h)=>{ window.location.hash=h; }, boot(topic,'sys'));
        await page.waitForTimeout(200);
        result.byViewport[vpKey].card[topic].sys=await readCard(page,'deep-system-map');
      }
    }
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(result));
})();
