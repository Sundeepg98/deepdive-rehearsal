/* THE SCOREBOARD, up close.
   The sweep found exactly one failing text node, in 12/12 room-theme cells: the "Solid" LABEL
   in the drill scoreboard, 2.73:1 against a 4.5 threshold. The scoreboard is the drill's only
   feedback and it was just reworked so that Solid is the one tile that FILLS. So: which state
   is that 2.73 measured in — resting (0 solid) or banked (>0 solid)? And why Solid and not
   Revisit / Left? Measure all three tiles, both states, painted pixels, per room+theme. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const ROOMS = ['messaging-events', 'data-storage', 'reliability-observability', 'platform-infra', 'architecture-apis', 'security-tenancy'];
const THEMES = ['light', 'dark'];

const HELPERS = `
window.__lum=(r,g,b)=>{const c=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
window.__cr=(a,b)=>{const hi=Math.max(a,b),lo=Math.min(a,b);return (hi+0.05)/(lo+0.05);};
window.__decode=async u=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return {d:g.getImageData(0,0,i.width,i.height).data,w:i.width,h:i.height};};
window.__tiles=()=>{const r=document.querySelector('#drill deep-drill').shadowRoot;
  const out=[];
  for (const p of r.querySelectorAll('.pill')) {
    const cls=p.className, v=p.querySelector('.v'), l=p.querySelector('.l');
    for (const [kind,el] of [['value',v],['label',l]]) {
      if(!el) continue; const b=el.getBoundingClientRect(); const cs=getComputedStyle(el);
      const fs=parseFloat(cs.fontSize), fw=parseInt(cs.fontWeight)||400;
      const large = fs>=24 || (fs>=18.66 && fw>=700);
      out.push({tile:cls, kind, text:el.textContent.trim(), fontSize:fs, weight:fw, threshold: large?3:4.5,
        declared:cs.color, box:{x:b.x+0.5,y:b.y+0.5,w:b.width-1,h:b.height-1}});
      el.__m=out.length-1;
    }
  }
  window.__ms=out; return out;};
window.__hide=()=>{const r=document.querySelector('#drill deep-drill').shadowRoot;
  r.querySelectorAll('.pill .v,.pill .l').forEach(e=>{e.__pc=e.style.color; e.style.setProperty('color','transparent','important');});};
window.__show=()=>{const r=document.querySelector('#drill deep-drill').shadowRoot;
  r.querySelectorAll('.pill .v,.pill .l').forEach(e=>{e.style.removeProperty('color'); if(e.__pc)e.style.color=e.__pc;});};
window.__meas=async(ua,ub)=>{const A=await window.__decode(ua),B=await window.__decode(ub);const res=[];
  for(const m of window.__ms){const x0=Math.round(m.box.x),y0=Math.round(m.box.y),w=Math.round(m.box.w),h=Math.round(m.box.h);
    if(w<3||h<3||x0<0||y0<0||x0+w>A.w||y0+h>A.h){res.push({...m,error:'offscreen'});continue;}
    const bg=new Map();const gl=[];
    for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*A.w+x)*4;
      const k=(B.d[i]<<16)|(B.d[i+1]<<8)|B.d[i+2]; bg.set(k,(bg.get(k)||0)+1);
      if(Math.abs(A.d[i]-B.d[i])+Math.abs(A.d[i+1]-B.d[i+1])+Math.abs(A.d[i+2]-B.d[i+2])>12) gl.push([A.d[i],A.d[i+1],A.d[i+2]]);}
    if(!gl.length){res.push({...m,error:'no glyphs'});continue;}
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
  await page.evaluate(async () => { for (let i=0;i<50;i++){const r=document.getAnimations().filter(a=>a.playState==='running');
    if(!r.length)break; try{await Promise.race([Promise.all(r.map(a=>a.finished)),new Promise(z=>setTimeout(z,400))]);}catch(e){}}
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); });
  await page.waitForTimeout(90);
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
console.log('THE DRILL SCOREBOARD — painted contrast of every tile, both states');
console.log('='.repeat(104));
for (const room of ROOMS) {
  for (const theme of THEMES) {
    await page.goto(URL, { waitUntil: 'load' }); await settle();
    await page.addScriptTag({ content: HELPERS });
    await page.evaluate(() => TopicRegistry.setTopic('state-machine')); await settle();
    await page.evaluate((t)=>{const d=document.documentElement; if((d.dataset.theme||'light')!==t) document.getElementById('themetog').click();}, theme);
    await page.evaluate(() => { document.querySelectorAll('[role=dialog].open,.ix-ov.open').forEach(o=>o.classList.remove('open','vis')); });
    await page.evaluate(() => { window.location.hash = '#drill'; }); await settle();
    await page.evaluate((g)=>document.documentElement.setAttribute('data-group',g), room); await settle();

    for (const state of ['resting', 'banked']) {
      if (state === 'banked') {
        await page.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot;
          const press = id => r.getElementById(id)?.click();
          for (let i=0;i<6;i++){ press('adv'); press(['jg','jg','jg','js','jm','jg'][i]); } });
        await settle();
      }
      const counts = await page.evaluate(() => { const r=document.querySelector('#drill deep-drill').shadowRoot;
        return { solid: r.getElementById('sGot')?.textContent, revisit: r.getElementById('sShk')?.textContent, left: r.getElementById('sLeft')?.textContent,
                 pillG: r.querySelector('.pill.g')?.className }; });
      const m = await measure();
      for (const t of m) rows.push({ room, theme, state, counts, ...t });
      if (room === 'architecture-apis' && theme === 'light') {
        console.log(`\n[${state}]  Solid=${counts.solid} Revisit=${counts.revisit} Left=${counts.left}   (.pill.g class: "${counts.pillG}")`);
        console.log('  tile        part    text        px/wt   need   PAINTED         ratio   verdict');
        for (const t of m) {
          if (t.error) { console.log(`  ${t.tile.padEnd(11)} ${t.kind.padEnd(7)} ${t.text.padEnd(11)} -> ${t.error}`); continue; }
          const ok = t.ratio >= t.threshold;
          console.log(`  ${t.tile.padEnd(11)} ${t.kind.padEnd(7)} ${t.text.padEnd(11)} ${(t.fontSize+'/'+t.weight).padEnd(7)} ${String(t.threshold).padEnd(6)} ${(t.fg+' on '+t.bg).padEnd(15)} ${String(t.ratio).padStart(5)}   ${ok?'pass':'** FAIL **'}`);
        }
      }
    }
  }
}
writeFileSync(`${OUT}/scoreboard.json`, JSON.stringify(rows, null, 2));

console.log('\n\n=== ACROSS ALL 6 ROOMS x 2 THEMES x 2 STATES ===');
const fails = rows.filter(r => !r.error && r.ratio < r.threshold);
const grp = {};
for (const f of fails) { const k = `${f.tile} / ${f.kind} / "${f.text}"`; (grp[k] ||= []).push(f); }
for (const [k, list] of Object.entries(grp)) {
  const states = [...new Set(list.map(f=>f.state))], cells = [...new Set(list.map(f=>f.room+'/'+f.theme))];
  console.log(`\n  FAIL  ${k}`);
  console.log(`     worst ${Math.min(...list.map(f=>f.ratio))}:1 (need ${list[0].threshold}) | ${list[0].fontSize}px/${list[0].weight}`);
  console.log(`     states: ${states.join(', ')}`);
  console.log(`     cells : ${cells.length}/12 -> ${cells.join(', ')}`);
  console.log(`     paints: ${[...new Set(list.map(f=>f.fg+' on '+f.bg))].join(' | ')}`);
}
console.log(`\n  total tile-measurements: ${rows.length}, failures: ${fails.length}`);
const passes = rows.filter(r => !r.error && r.ratio >= r.threshold);
console.log(`  passing tiles (for contrast): ${passes.length}`);
await b.close();
