import { chromium } from 'playwright';
const URL='file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1280,height:800}});
await c.addInitScript(()=>{try{localStorage.setItem('ddr.v1.__auditseed','1')}catch(e){}});
const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(String(e.message)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.addInitScript(()=>{window.__printed=0;window.print=()=>{window.__printed++}});
await p.goto(URL,{waitUntil:'load'});await p.waitForTimeout(700);
// cram sheet Print button -> prints the MAIN doc (styles.css:214 has an @media print rule for .cram-ov)
await p.click('#cramopen');await p.waitForTimeout(700);
await p.click('#cramprint');await p.waitForTimeout(500);
console.log(JSON.stringify({tool:'cram-print-btn',printCalled:await p.evaluate(()=>window.__printed),bodyCls:await p.evaluate(()=>document.body.className),errs:errs.length}));
// 'p' key while cram open
await p.keyboard.press('p');await p.waitForTimeout(400);
console.log(JSON.stringify({tool:'cram-p-key',printCalled:await p.evaluate(()=>window.__printed)}));
await p.keyboard.press('Escape');await p.waitForTimeout(600);
// Ctrl+P anywhere -> routed to Print Q&A popup (print-qa.js:59-61)
const pop=p.waitForEvent('popup',{timeout:5000}).catch(()=>null);
await p.keyboard.press('Control+p');
const pg=await pop;
console.log(JSON.stringify({tool:'ctrl+P->printQA-popup',popupOpened:!!pg,mainWindowPrintCalled:await p.evaluate(()=>window.__printed),errs:errs.length}));
if(pg)await pg.close();
await b.close();
