import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const SHOTS='D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-codehealth';
mkdirSync(SHOTS,{recursive:true});
const b = await chromium.launch();

const measure = (pg) => pg.evaluate(() => {
  const dv=document.querySelector('deep-visual'); if(!dv||!dv.shadowRoot) return {err:'no pane'};
  const c=dv.shadowRoot.querySelector('canvas'); if(!c) return {err:'no canvas'};
  return { buf:[c.width,c.height], css:[Math.round(c.getBoundingClientRect().width),Math.round(c.getBoundingClientRect().height)] };
});

// PATH 1: deep link straight to #kafka-internals/viz (a shared/copied link)
{
  const p = await b.newPage({viewport:{width:1280,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html#kafka-internals/viz',{waitUntil:'load'});
  await p.waitForTimeout(2500);
  console.log('PATH 1 deep-link #kafka-internals/viz :', JSON.stringify(await measure(p)), 'pageerrors:',errs.length);
  await p.screenshot({path:`${SHOTS}/C-deeplink.png`});
  await p.close();
}
// PATH 2: mobile 390px, click through
{
  const p = await b.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html',{waitUntil:'load'});
  await p.waitForTimeout(2000);
  await p.evaluate(()=>{const x=document.querySelector('.ix-x'); if(x)x.click();});
  await p.waitForTimeout(400);
  await p.evaluate(()=>{location.hash='#kafka-internals/walk';});
  await p.waitForTimeout(900);
  await p.evaluate(()=>window.goView('viz'));
  await p.waitForTimeout(2000);
  console.log('PATH 2 mobile 390px click-through   :', JSON.stringify(await measure(p)), 'pageerrors:',errs.length);
  await p.screenshot({path:`${SHOTS}/D-mobile.png`});
  await p.close();
}
// PATH 3: reload while already ON the viz route (returning user)
{
  const p = await b.newPage({viewport:{width:1280,height:900}});
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{const x=document.querySelector('.ix-x'); if(x)x.click();});
  await p.evaluate(()=>{location.hash='#kafka-internals/viz';});
  await p.waitForTimeout(1500);
  console.log('PATH 3 hash-nav to viz (no reload)  :', JSON.stringify(await measure(p)));
  await p.reload({waitUntil:'load'});
  await p.waitForTimeout(2500);
  console.log('PATH 3b after RELOAD on viz route   :', JSON.stringify(await measure(p)));
  await p.close();
}
await b.close();
