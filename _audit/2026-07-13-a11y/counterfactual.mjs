/* THE COUNTERFACTUAL — is the muted zero-state a NEW failure, or a pre-existing one deepened?
   f967120 (the scoreboard rework) changed `.pill.z{opacity:.7}` -> `{opacity:.62}`.
   Sweep the opacity and measure the PAINTED contrast of the zero-state tiles at each value:
     .62  = as shipped today
     .70  = the pre-rework value
     ...  = and find the value that would actually clear WCAG AA (4.5:1 for the 9px labels)
   Everything measured from real pixels, animation-settled. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';

const HELPERS = `
window.__lum=(r,g,b)=>{const c=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
window.__cr=(a,b)=>{const hi=Math.max(a,b),lo=Math.min(a,b);return (hi+0.05)/(lo+0.05);};
window.__decode=async u=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return {d:g.getImageData(0,0,i.width,i.height).data,w:i.width,h:i.height};};
window.__setOpacity=(v)=>{const r=document.querySelector('#drill deep-drill').shadowRoot;
  let s=r.getElementById('__ovr'); if(!s){s=document.createElement('style');s.id='__ovr';r.appendChild(s);}
  s.textContent='.pill.z{opacity:'+v+' !important}';};
window.__tiles=()=>{const r=document.querySelector('#drill deep-drill').shadowRoot;const out=[];
  for(const p of r.querySelectorAll('.pill.z')){for(const [kind,el] of [['value',p.querySelector('.v')],['label',p.querySelector('.l')]]){
    if(!el)continue;const b=el.getBoundingClientRect();const cs=getComputedStyle(el);
    const fs=parseFloat(cs.fontSize),fw=parseInt(cs.fontWeight)||400;const large=fs>=24||(fs>=18.66&&fw>=700);
    out.push({tile:p.className,kind,text:el.textContent.trim(),fontSize:fs,weight:fw,threshold:large?3:4.5,box:{x:b.x+0.5,y:b.y+0.5,w:b.width-1,h:b.height-1}});}}
  window.__ms=out;return out;};
window.__hide=()=>{document.querySelector('#drill deep-drill').shadowRoot.querySelectorAll('.pill .v,.pill .l').forEach(e=>e.style.setProperty('color','transparent','important'));};
window.__show=()=>{document.querySelector('#drill deep-drill').shadowRoot.querySelectorAll('.pill .v,.pill .l').forEach(e=>e.style.removeProperty('color'));};
window.__meas=async(ua,ub)=>{const A=await window.__decode(ua),B=await window.__decode(ub);const res=[];
  for(const m of window.__ms){const x0=Math.round(m.box.x),y0=Math.round(m.box.y),w=Math.round(m.box.w),h=Math.round(m.box.h);
    if(w<3||h<3||x0<0||y0<0||x0+w>A.w||y0+h>A.h){continue;}
    const bg=new Map();const gl=[];
    for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*A.w+x)*4;
      const k=(B.d[i]<<16)|(B.d[i+1]<<8)|B.d[i+2];bg.set(k,(bg.get(k)||0)+1);
      if(Math.abs(A.d[i]-B.d[i])+Math.abs(A.d[i+1]-B.d[i+1])+Math.abs(A.d[i+2]-B.d[i+2])>10)gl.push([A.d[i],A.d[i+1],A.d[i+2]]);}
    if(!gl.length)continue;
    const bs=[...bg.entries()].sort((a,b)=>b[1]-a[1]);const bk=bs[0][0];const bp=[(bk>>16)&255,(bk>>8)&255,bk&255];const bl=window.__lum(...bp);
    const sc=gl.map(p=>({p,d:Math.abs(window.__lum(...p)-bl)})).sort((a,b)=>b.d-a.d);
    const core=sc.slice(0,Math.max(1,Math.floor(sc.length*0.1)));const ch=new Map();
    for(const{p}of core){const k=(p[0]<<16)|(p[1]<<8)|p[2];ch.set(k,(ch.get(k)||0)+1);}
    const fk=[...ch.entries()].sort((a,b)=>b[1]-a[1])[0][0];const fp=[(fk>>16)&255,(fk>>8)&255,fk&255];
    const hex=p=>'#'+p.map(v=>v.toString(16).padStart(2,'0')).join('');
    res.push({...m,fg:hex(fp),bg:hex(bp),ratio:+window.__cr(window.__lum(...fp),bl).toFixed(2)});}
  return res;};`;

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
async function settle() {
  await page.evaluate(async () => { for(let i=0;i<40;i++){const r=document.getAnimations().filter(a=>a.playState==='running');
    if(!r.length)break;try{await Promise.race([Promise.all(r.map(a=>a.finished)),new Promise(z=>setTimeout(z,350))]);}catch(e){}}
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); });
  await page.waitForTimeout(80);
}
async function measure() {
  await page.evaluate(() => window.__tiles());
  const a = await page.screenshot({ clip:{x:0,y:0,width:1440,height:900} });
  await page.evaluate(() => window.__hide()); await page.waitForTimeout(110);
  const b2 = await page.screenshot({ clip:{x:0,y:0,width:1440,height:900} });
  await page.evaluate(() => window.__show());
  return await page.evaluate(async ({x,y}) => await window.__meas(x,y),
    { x:'data:image/png;base64,'+a.toString('base64'), y:'data:image/png;base64,'+b2.toString('base64') });
}

const rows = [];
for (const theme of ['light', 'dark']) {
  await page.goto(URL, { waitUntil:'load' }); await settle();
  await page.addScriptTag({ content: HELPERS });
  await page.evaluate(() => TopicRegistry.setTopic('state-machine')); await settle();
  await page.evaluate((t)=>{const d=document.documentElement; if((d.dataset.theme||'light')!==t) document.getElementById('themetog').click();}, theme);
  await page.evaluate(() => document.querySelectorAll('[role=dialog].open,.ix-ov.open').forEach(o=>o.classList.remove('open','vis')));
  await page.evaluate(() => { window.location.hash='#drill'; }); await settle();

  console.log(`\n=== ${theme.toUpperCase()} — zero-state tiles vs .pill.z opacity ===`);
  console.log('  opacity   "Solid" label (need 4.5)   "0" value (need 3.0)   note');
  for (const op of [0.62, 0.70, 0.80, 0.90, 1.00]) {
    await page.evaluate((v) => window.__setOpacity(v), op);
    await settle();
    const m = await measure();
    const lab = m.find(x => x.kind === 'label' && x.text.toLowerCase() === 'solid');
    const val = m.find(x => x.kind === 'value' && x.tile.includes('g'));
    for (const x of m) rows.push({ theme, opacity: op, ...x });
    const note = op === 0.62 ? '<- AS SHIPPED (f967120)' : op === 0.70 ? '<- pre-rework value' : '';
    const f = (x, t) => x ? `${String(x.ratio).padStart(5)}:1 ${x.ratio >= t ? 'pass' : 'FAIL'}` : '  n/a';
    console.log(`   ${op.toFixed(2)}     ${f(lab, 4.5).padEnd(22)} ${f(val, 3.0).padEnd(21)} ${note}`);
  }
}
writeFileSync(`${OUT}/counterfactual.json`, JSON.stringify(rows, null, 2));

console.log('\n=== READING ===');
const at62 = rows.filter(r => r.opacity === 0.62 && r.ratio < r.threshold).length;
const at70 = rows.filter(r => r.opacity === 0.70 && r.ratio < r.threshold).length;
console.log(`  failing zero-state text nodes at opacity .62 (shipped)    : ${at62}`);
console.log(`  failing zero-state text nodes at opacity .70 (pre-rework) : ${at70}`);
console.log(at70 > 0
  ? '  -> PRE-EXISTING: the zero-state already failed before the rework; f967120 DEEPENED it (.7 -> .62).'
  : '  -> NEW: the rework\'s .62 pushed a previously-passing zero-state below AA.');
const passing = rows.filter(r => r.ratio >= r.threshold).map(r => r.opacity);
if (passing.length) console.log(`  -> lowest opacity at which every zero-state node clears AA: ${Math.min(...[...new Set(rows.filter(o => rows.filter(r=>r.opacity===o.opacity).every(r=>r.ratio>=r.threshold)).map(r=>r.opacity))]) || 'none of those tested'}`);
await b.close();
