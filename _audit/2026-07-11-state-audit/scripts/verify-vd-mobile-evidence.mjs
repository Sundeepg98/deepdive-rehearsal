import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';
const b = await chromium.launch();

async function shot(w, h, longTopic, fix, name) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900);
  const x = await p.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p.waitForTimeout(400); }
  if (fix) await p.addStyleTag({ content: '.topic-nav{min-width:0}' });
  if (longTopic) {
    await p.click('#tntrigger'); await p.waitForTimeout(400);
    await p.evaluate(() => {
      const items = [...document.querySelectorAll('.tn-item')]; let best = null, L = 0;
      for (const i of items) { const n = i.querySelector('.tn-i-name')?.textContent.trim() || ''; if (n.length > L) { L = n.length; best = i; } }
      best?.click();
    });
    await p.waitForTimeout(900);
  }
  const m = await p.evaluate(() => {
    const f = document.querySelector('#toolsfab').getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vis = Math.max(0, Math.min(f.right, vw) - Math.max(f.left, 0));
    return { vw, icb: window.innerWidth, docScrollW: document.documentElement.scrollWidth, toolsfabLeft: +f.left.toFixed(0), toolsfabRight: +f.right.toFixed(0), toolsfabVisiblePx: +vis.toFixed(0), topic: document.querySelector('#tncurrent').textContent };
  });
  await p.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log(`${name}: vw=${m.vw} ICB=${m.icb} docScrollW=${m.docScrollW} | #toolsfab x=${m.toolsfabLeft}..${m.toolsfabRight} visible=${m.toolsfabVisiblePx}px | topic="${m.topic}"`);
  await ctx.close();
}

await shot(430, 520, true, false, 'EVIDENCE-430-longtopic-BROKEN');
await shot(430, 520, true, true, 'EVIDENCE-430-longtopic-FIXED');
await shot(360, 520, false, false, 'EVIDENCE-360-default-BROKEN');
await shot(360, 520, false, true, 'EVIDENCE-360-default-FIXED');
await b.close();
