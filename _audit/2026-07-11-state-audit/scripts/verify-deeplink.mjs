import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1280,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html#kafka-internals/viz',{waitUntil:'load'});
await p.waitForTimeout(3000);
const r = await p.evaluate(()=>{
  const dv=document.querySelector('deep-visual');
  const sr=dv&&dv.shadowRoot;
  return {
    finalHash: location.hash,
    vizTabHidden: document.querySelector('button[data-tab="viz"]')?.hidden,
    vizTabWidth: document.querySelector('button[data-tab="viz"]')?.offsetWidth,
    __VIZ: typeof window.__VIZ,
    vizPaneVisible: (()=>{const e=document.getElementById('viz'); if(!e)return 'no #viz el';
      const s=getComputedStyle(e); return s.display+' h='+e.offsetHeight;})(),
    shadowHTML: sr ? sr.innerHTML.slice(0,180) : 'no shadowRoot',
    indexOverlayOpen: !!document.querySelector('.ix-ov.open'),
  };
});
console.log('=== DEEP-LINK #kafka-internals/viz, 3s after load ===');
console.log(JSON.stringify(r,null,2));
console.log('pageerrors:',errs.length);
await b.close();
