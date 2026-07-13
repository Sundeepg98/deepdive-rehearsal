/* THE DECIDING QUESTION.
   The Solid tile is muted (.z) at zero and FILLS once you bank one — so its 2.74:1 is a
   transient empty-state. The Revisit tile, by the rework's own design note, "NEVER FILLS".
   So: when Revisit is NON-ZERO — i.e. exactly when the drill is telling you that you have
   things to go back and fix — does it leave the muted .z state, or is the drill's failure
   feedback permanently below WCAG AA?
   Drive the drill for real (advance, then grade, with settling), reach Revisit >= 2, measure. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = `${OUT}/shots/axe`;
const ROOMS = ['messaging-events', 'data-storage', 'reliability-observability', 'platform-infra', 'architecture-apis', 'security-tenancy'];
const THEMES = ['light', 'dark'];

const HELPERS = `
window.__lum=(r,g,b)=>{const c=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
window.__cr=(a,b)=>{const hi=Math.max(a,b),lo=Math.min(a,b);return (hi+0.05)/(lo+0.05);};
window.__decode=async u=>{const i=new Image();await new Promise(r=>{i.onload=r;i.src=u;});const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(i,0,0);return {d:g.getImageData(0,0,i.width,i.height).data,w:i.width,h:i.height};};
window.__tiles=()=>{const r=document.querySelector('#drill deep-drill').shadowRoot;const out=[];
  for(const p of r.querySelectorAll('.pill')){for(const [kind,el] of [['value',p.querySelector('.v')],['label',p.querySelector('.l')]]){
    if(!el)continue;const b=el.getBoundingClientRect();const cs=getComputedStyle(el);
    const fs=parseFloat(cs.fontSize),fw=parseInt(cs.fontWeight)||400;const large=fs>=24||(fs>=18.66&&fw>=700);
    out.push({tile:p.className,kind,text:el.textContent.trim(),fontSize:fs,weight:fw,threshold:large?3:4.5,box:{x:b.x+0.5,y:b.y+0.5,w:b.width-1,h:b.height-1}});
    el.__m=1;}}
  window.__ms=out;return out;};
window.__hide=()=>{document.querySelector('#drill deep-drill').shadowRoot.querySelectorAll('.pill .v,.pill .l').forEach(e=>e.style.setProperty('color','transparent','important'));};
window.__show=()=>{document.querySelector('#drill deep-drill').shadowRoot.querySelectorAll('.pill .v,.pill .l').forEach(e=>e.style.removeProperty('color'));};
window.__meas=async(ua,ub)=>{const A=await window.__decode(ua),B=await window.__decode(ub);const res=[];
  for(const m of window.__ms){const x0=Math.round(m.box.x),y0=Math.round(m.box.y),w=Math.round(m.box.w),h=Math.round(m.box.h);
    if(w<3||h<3||x0<0||y0<0||x0+w>A.w||y0+h>A.h){res.push({...m,error:'offscreen'});continue;}
    const bg=new Map();const gl=[];
    for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const i=(y*A.w+x)*4;
      const k=(B.d[i]<<16)|(B.d[i+1]<<8)|B.d[i+2];bg.set(k,(bg.get(k)||0)+1);
      if(Math.abs(A.d[i]-B.d[i])+Math.abs(A.d[i+1]-B.d[i+1])+Math.abs(A.d[i+2]-B.d[i+2])>12)gl.push([A.d[i],A.d[i+1],A.d[i+2]]);}
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
  await page.evaluate(async () => { for(let i=0;i<40;i++){const r=document.getAnimations().filter(a=>a.playState==='running');
    if(!r.length)break;try{await Promise.race([Promise.all(r.map(a=>a.finished)),new Promise(z=>setTimeout(z,350))]);}catch(e){}}
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); });
  await page.waitForTimeout(80);
}
const counts = () => page.evaluate(() => { const r = document.querySelector('#drill deep-drill').shadowRoot;
  return { solid:+r.getElementById('sGot').textContent, revisit:+r.getElementById('sShk').textContent, left:+r.getElementById('sLeft').textContent,
           gCls:r.querySelector('.pill.g').className, sCls:r.querySelector('.pill.s').className }; });

/* The drill is a multi-step reveal: #adv cycles "Reveal answer" -> "Interviewer pushes
   further" -> ... and the judge buttons (jm/js/jg) only exist at the END of a card. The
   earlier driver clicked adv ONCE then a judge that wasn't in the DOM yet — which is why
   3x 'js' produced Revisit=0 and nearly handed me a false finding. Advance until the judge
   actually exists, then grade, and VERIFY the count moved. */
async function grade(kind) {   // 'jg' solid | 'js' shaky/revisit | 'jm' missed
  const has = () => page.evaluate((k) => !!document.querySelector('#drill deep-drill').shadowRoot.getElementById(k), kind);
  for (let i = 0; i < 10 && !(await has()); i++) {
    await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.getElementById('adv')?.click());
    await settle();
  }
  if (!(await has())) return false;
  const before = (await counts())[kind === 'jg' ? 'solid' : kind === 'js' ? 'revisit' : 'left'];
  await page.evaluate((k) => document.querySelector('#drill deep-drill').shadowRoot.getElementById(k).click(), kind);
  await settle();
  const after = (await counts())[kind === 'jg' ? 'solid' : kind === 'js' ? 'revisit' : 'left'];
  return after !== before;
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
for (const room of ROOMS) {
  for (const theme of THEMES) {
    await page.goto(URL, { waitUntil:'load' }); await settle();
    await page.addScriptTag({ content: HELPERS });
    await page.evaluate(() => TopicRegistry.setTopic('state-machine')); await settle();
    await page.evaluate((t)=>{const d=document.documentElement; if((d.dataset.theme||'light')!==t) document.getElementById('themetog').click();}, theme);
    await page.evaluate(() => document.querySelectorAll('[role=dialog].open,.ix-ov.open').forEach(o=>o.classList.remove('open','vis')));
    await page.evaluate(() => { window.location.hash='#drill'; }); await settle();
    await page.evaluate((g)=>document.documentElement.setAttribute('data-group',g), room); await settle();

    // reach a state where BOTH Solid and Revisit are non-zero
    for (const k of ['js', 'js', 'jg', 'js', 'jg']) await grade(k);
    const c = await counts();
    // HARD GATE: if Revisit is still 0, this cell proves nothing about the non-zero state.
    if (c.revisit < 1) { console.log(`  !! ${room}/${theme}: could not reach Revisit>0 (got ${JSON.stringify(c)}) — cell VOID`);
      rows.push({ room, theme, counts: c, void: true }); continue; }
    const m = await measure();
    for (const t of m) rows.push({ room, theme, counts: c, ...t });

    if (room === 'architecture-apis' && theme === 'light') {
      console.log(`\n=== NON-ZERO REVISIT — Solid=${c.solid} Revisit=${c.revisit} Left=${c.left} ===`);
      console.log(`  .pill.g class = "${c.gCls}"`);
      console.log(`  .pill.s class = "${c.sCls}"   <-- does the .z (muted) class survive a non-zero count?\n`);
      console.log('  tile        part    text        px/wt    need  PAINTED             ratio  verdict');
      for (const t of m) { if (t.error) { console.log(`  ${t.tile.padEnd(11)} ${t.kind} -> ${t.error}`); continue; }
        console.log(`  ${t.tile.padEnd(11)} ${t.kind.padEnd(7)} ${t.text.padEnd(11)} ${(t.fontSize+'/'+t.weight).padEnd(8)} ${String(t.threshold).padEnd(5)} ${(t.fg+' on '+t.bg).padEnd(19)} ${String(t.ratio).padStart(5)}  ${t.ratio>=t.threshold?'pass':'** FAIL **'}`); }
      await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('.pill.s').scrollIntoView({block:'center'}));
      await settle();
      await page.screenshot({ path: `${SHOTS}/scoreboard-revisit-nonzero-light.png` });
    }
    if (room === 'architecture-apis' && theme === 'dark') {
      await page.evaluate(() => document.querySelector('#drill deep-drill').shadowRoot.querySelector('.pill.s').scrollIntoView({block:'center'}));
      await settle();
      await page.screenshot({ path: `${SHOTS}/scoreboard-revisit-nonzero-dark.png` });
    }
  }
}
writeFileSync(`${OUT}/revisit-state.json`, JSON.stringify(rows, null, 2));

console.log('\n\n=== VERDICT: the Revisit tile with a NON-ZERO count, across all 12 cells ===');
const voided = rows.filter(r => r.void);
const rev = rows.filter(r => r.tile && r.tile.includes('pill s') && !r.error && !r.void);
const stillZ = rev.filter(r => r.tile.includes(' z'));
const fails  = rev.filter(r => r.ratio < r.threshold);
console.log(`  VOID cells (never reached Revisit>0): ${voided.length}  <-- must be 0 to conclude anything`);
console.log(`  Revisit-tile measurements   : ${rev.length}`);
console.log(`  still carrying the .z class : ${stillZ.length}   (non-zero count but still muted)`);
console.log(`  BELOW threshold             : ${fails.length}`);
const cs = [...new Set(rows.filter(r => r.counts && !r.void).map(r => `solid=${r.counts.solid} revisit=${r.counts.revisit} left=${r.counts.left}`))];
console.log(`  reached counts              : ${cs.join(' | ')}`);
if (voided.length) { console.log('\n  INCONCLUSIVE — could not drive the drill to a non-zero Revisit in some cells.'); }
if (fails.length) {
  const worst = Math.min(...fails.map(f => f.ratio));
  console.log(`  worst painted ratio         : ${worst}:1`);
  console.log(`  cells affected              : ${[...new Set(fails.map(f=>f.room+'/'+f.theme))].length}/12`);
  console.log('\n  -> the drill\'s REVISIT feedback is below WCAG AA even when it has something to say.');
} else {
  console.log('\n  -> Revisit rises above threshold once non-zero: the 2.73:1 is an EMPTY-STATE-only issue.');
}
const g = rows.filter(r => r.tile.includes('pill g') && !r.error);
console.log(`\n  (Solid tile with a non-zero count: ${g.filter(r=>r.ratio>=r.threshold).length}/${g.length} pass — the fill works.)`);
await b.close();
