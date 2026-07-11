import { chromium } from 'playwright';
const S='D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-tools';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1300);
await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
await p.waitForTimeout(700);
// outline the offenders + draw the 390px viewport edge
await p.evaluate(() => {
  const tn = document.getElementById('topicnav');
  const nx = document.getElementById('tnnext');
  tn.style.outline = '2px solid red';
  nx.style.outline = '2px solid magenta';
  const edge = document.createElement('div');
  edge.style.cssText = 'position:fixed;top:0;bottom:0;left:389px;width:1px;background:lime;z-index:99999;pointer-events:none';
  document.body.appendChild(edge);
});
await p.screenshot({ path: `${S}/mobile-topicnav-CLIPPED-menu-hidden.png` });
// now open the dropdown too
await p.click('#tntrigger'); await p.waitForTimeout(600);
await p.evaluate(() => { const m=document.getElementById('tnmenu'); m.style.outline='2px solid orange'; });
await p.screenshot({ path: `${S}/mobile-topicnav-CLIPPED-menu-open.png` });
console.log('shots written');
await b.close();
