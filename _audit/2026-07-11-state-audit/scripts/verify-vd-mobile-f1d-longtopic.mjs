import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';

const b = await chromium.launch();

async function boot(w) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const x = await p.$('.ix-ov.open .ix-x');
  if (x) { await x.click(); await p.waitForTimeout(400); }
  return { ctx, p };
}

// Navigate for REAL via the topic menu (not by faking textContent)
console.log('===== REAL NAVIGATION to the longest topic, measured at 3 widths =====');
for (const w of [430, 393, 360]) {
  const { ctx, p } = await boot(w);
  // open the topic switcher and click the longest-named topic
  await p.click('#tntrigger');
  await p.waitForTimeout(400);
  const clicked = await p.evaluate(() => {
    const items = [...document.querySelectorAll('.tn-item')];
    let best = null, bestLen = 0;
    for (const it of items) {
      const n = it.querySelector('.tn-i-name')?.textContent.trim() || '';
      if (n.length > bestLen) { bestLen = n.length; best = it; }
    }
    if (best) { best.click(); return best.querySelector('.tn-i-name').textContent.trim(); }
    return null;
  });
  await p.waitForTimeout(900);
  const m = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vis = e => { const bb = e.getBoundingClientRect(); const v = Math.max(0, Math.min(bb.right, vw) - Math.max(bb.left, 0)); return { w: +bb.width.toFixed(1), right: +bb.right.toFixed(1), hiddenPct: +(100 * (1 - v / bb.width)).toFixed(0) }; };
    const cur = document.querySelector('#tncurrent');
    return {
      topic: cur.textContent,
      vw, icb: window.innerWidth, docScrollWidth: document.documentElement.scrollWidth,
      overflowPx: document.documentElement.scrollWidth - vw,
      topicnav: vis(document.querySelector('#topicnav')),
      tnnext: vis(document.querySelector('#tnnext')),
      mockcta: vis(document.querySelector('.sidebar .mockcta')),
      toolsfab: vis(document.querySelector('#toolsfab')),
      mockbtn: vis(document.querySelector('#mockopen')),
      ellipsis: cur.scrollWidth > cur.clientWidth,
    };
  });
  console.log(`\n--- viewport ${w}px | topic clicked: "${clicked}" ---`);
  console.log(`   topic label rendered: "${m.topic}"`);
  console.log(`   docScrollWidth=${m.docScrollWidth}  visualVP=${m.vw}  ICB=${m.icb}  ==> OVERFLOW = ${m.overflowPx}px`);
  console.log(`   #topicnav  w=${m.topicnav.w}px  right=${m.topicnav.right}`);
  console.log(`   #tnnext    hidden=${m.tnnext.hiddenPct}%`);
  console.log(`   .mockcta   w=${m.mockcta.w}  hidden=${m.mockcta.hiddenPct}%   #toolsfab hidden=${m.toolsfab.hiddenPct}%   #mockopen hidden=${m.mockbtn.hiddenPct}%`);
  console.log(`   ellipsis firing? ${m.ellipsis}`);
  await p.screenshot({ path: `${SHOTS}/f1d-longtopic-${w}.png` });
  await ctx.close();
}

console.log('\n\n===== SAME, WITH THE CORRECT FIX (.topic-nav{min-width:0}) =====');
for (const w of [430, 360]) {
  const { ctx, p } = await boot(w);
  await p.addStyleTag({ content: '.topic-nav{min-width:0 !important}' });
  await p.click('#tntrigger'); await p.waitForTimeout(400);
  await p.evaluate(() => {
    const items = [...document.querySelectorAll('.tn-item')];
    let best = null, bestLen = 0;
    for (const it of items) { const n = it.querySelector('.tn-i-name')?.textContent.trim() || ''; if (n.length > bestLen) { bestLen = n.length; best = it; } }
    best?.click();
  });
  await p.waitForTimeout(900);
  const m = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const cur = document.querySelector('#tncurrent');
    const tf = document.querySelector('#toolsfab').getBoundingClientRect();
    return {
      vw, docScrollWidth: document.documentElement.scrollWidth, overflowPx: document.documentElement.scrollWidth - vw,
      topicnavW: +document.querySelector('#topicnav').getBoundingClientRect().width.toFixed(1),
      toolsfabRight: +tf.right.toFixed(1),
      ellipsis: cur.scrollWidth > cur.clientWidth, label: cur.textContent,
    };
  });
  console.log(`   ${w}px: overflow=${m.overflowPx}px  #topicnav=${m.topicnavW}  toolsfab.right=${m.toolsfabRight}  ellipsis=${m.ellipsis}  "${m.label}"`);
  await p.screenshot({ path: `${SHOTS}/f1d-longtopic-FIXED-${w}.png` });
  await ctx.close();
}

await b.close();
