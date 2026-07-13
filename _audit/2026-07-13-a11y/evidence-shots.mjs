/* Evidence screenshots for the two real findings + the room matrix. */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/shots/axe';
mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
async function settle() {
  await page.evaluate(async () => { for(let i=0;i<40;i++){const r=document.getAnimations().filter(a=>a.playState==='running');
    if(!r.length)break;try{await Promise.race([Promise.all(r.map(a=>a.finished)),new Promise(z=>setTimeout(z,350))]);}catch(e){}}
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); });
  await page.waitForTimeout(100);
}
async function boot(theme, room, pane) {
  await page.goto(URL, { waitUntil:'load' }); await settle();
  await page.evaluate(() => TopicRegistry.setTopic('state-machine')); await settle();
  await page.evaluate((t)=>{const d=document.documentElement; if((d.dataset.theme||'light')!==t) document.getElementById('themetog').click();}, theme);
  await page.evaluate(() => document.querySelectorAll('[role=dialog].open,.ix-ov.open').forEach(o=>o.classList.remove('open','vis')));
  if (pane) { await page.evaluate((p)=>{window.location.hash='#'+p;}, pane); await settle(); }
  await page.evaluate((g)=>document.documentElement.setAttribute('data-group',g), room); await settle();
}

/* F2 — the drill scoreboard zero-state (the shipped failure), light + dark */
for (const theme of ['light', 'dark']) {
  await boot(theme, 'architecture-apis', 'drill');
  const box = await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const board = r.querySelector('.pill').parentElement;
    board.scrollIntoView({ block: 'center' });
    r.querySelectorAll('.pill.z').forEach(p => { p.style.outline = '3px solid #ff2d55'; p.style.outlineOffset = '3px'; });
    const b = board.getBoundingClientRect();
    return { x: Math.max(0,b.x-30), y: Math.max(0,b.y-30), width: Math.min(b.width+60, 1440), height: Math.min(b.height+60, 900) };
  });
  await settle();
  await page.screenshot({ path: `${SHOTS}/F2-scoreboard-zerostate-${theme}.png`, clip: box });
}

/* F2 — side by side: shipped .62 vs the fix .9 (light) */
await boot('light', 'architecture-apis', 'drill');
for (const [tag, op] of [['shipped-0.62', 0.62], ['fix-0.90', 0.90]]) {
  const box = await page.evaluate((v) => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    let s = r.getElementById('__ovr'); if (!s) { s = document.createElement('style'); s.id='__ovr'; r.appendChild(s); }
    s.textContent = '.pill.z{opacity:'+v+' !important}';
    const board = r.querySelector('.pill').parentElement;
    board.scrollIntoView({ block:'center' });
    const b = board.getBoundingClientRect();
    return { x: Math.max(0,b.x-20), y: Math.max(0,b.y-20), width: Math.min(b.width+40,1440), height: Math.min(b.height+40,900) };
  }, op);
  await settle();
  await page.screenshot({ path: `${SHOTS}/F2-zerostate-${tag}.png`, clip: box });
}

/* F1 — the .locator span carrying a prohibited aria-label */
await boot('light', 'architecture-apis', null);
const lb = await page.evaluate(() => {
  const el = document.querySelector('.locator');
  el.style.outline = '3px solid #ff2d55'; el.style.outlineOffset = '3px';
  const b = el.getBoundingClientRect();
  return { x: Math.max(0,b.x-24), y: Math.max(0,b.y-24), width: Math.min(b.width+48,1440), height: Math.min(b.height+48,900) };
});
await settle();
await page.screenshot({ path: `${SHOTS}/F1-locator-aria-prohibited.png`, clip: lb });

/* the six rooms, for the record (walk pane, light + dark) */
for (const theme of ['light','dark']) {
  for (const room of ['messaging-events','data-storage','reliability-observability','platform-infra','architecture-apis','security-tenancy']) {
    await boot(theme, room, 'walk');
    await page.screenshot({ path: `${SHOTS}/room-${room}-${theme}.png`, clip: { x:0, y:0, width:1440, height:760 } });
  }
}
console.log('evidence screenshots written to', SHOTS);
await b.close();
