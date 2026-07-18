const { chromium } = require('playwright');
const url='file:///'+process.argv[2].replace(/\\/g,'/');
(async()=>{
  const b=await chromium.launch();
  const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await m.goto(url,{waitUntil:'load'}); await m.waitForTimeout(700);
  await m.evaluate(()=>{window.location.hash='#walk';}); await m.waitForTimeout(300);
  // all seg buttons geometry + display
  const btns=await m.evaluate(()=>{
    const s=document.querySelector('.sidebar .seg');
    return [...s.querySelectorAll('button')].map(x=>{
      const r=x.getBoundingClientRect(), cs=getComputedStyle(x);
      return {tab:x.getAttribute('data-tab'), h:Math.round(r.height), w:Math.round(r.width), disp:cs.display, vis:cs.visibility};
    });
  });
  console.log('SEG BUTTONS:'); btns.forEach(x=>console.log('  ',JSON.stringify(x)));
  const visible=btns.filter(x=>x.disp!=='none'&&x.h>0);
  console.log('visible-count='+visible.length+' minVisibleH='+Math.min(...visible.map(x=>x.h)));
  // focus ring on rightmost VISIBLE button (keyboard focus -> :focus-visible), check outline + scrim overlap
  const fr=await m.evaluate(()=>{
    const s=document.querySelector('.sidebar .seg');
    // scroll to mid so right scrim is open and an edge button sits under it
    const max=s.scrollWidth-s.clientWidth; s.scrollLeft=Math.round(max/2); s.dispatchEvent(new Event('scroll'));
    const vis=[...s.querySelectorAll('button')].filter(x=>x.getBoundingClientRect().width>0);
    // rightmost visible-in-viewport button
    const sr=s.getBoundingClientRect();
    let edge=null; for(const x of vis){const r=x.getBoundingClientRect(); if(r.left<sr.right && r.right>sr.left) edge=x;}
    edge.focus();
    const cs=getComputedStyle(edge);
    const er=edge.getBoundingClientRect();
    const aft=getComputedStyle(s,'::after'); const scrimW=parseFloat(aft.width)||0;
    return { focusedTab:edge.getAttribute('data-tab'), outlineW:cs.outlineWidth, outlineStyle:cs.outlineStyle,
      btnRight:Math.round(er.right), btnLeft:Math.round(er.left), stripRight:Math.round(sr.right),
      scrimW:Math.round(scrimW), scrimLeftEdge:Math.round(sr.right-scrimW),
      overlapPx: Math.max(0, Math.round(er.right - (sr.right-scrimW))) };
  });
  console.log('FOCUS-RING/EDGE:', JSON.stringify(fr));
  await b.close();
})();
