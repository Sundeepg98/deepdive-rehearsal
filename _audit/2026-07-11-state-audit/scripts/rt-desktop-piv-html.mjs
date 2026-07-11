import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

for (const t of ['authz', 'caching']) {
  await p.goto(URL + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const html = await p.evaluate(() => {
    const sr = document.querySelector('deep-system-map').shadowRoot;
    const pv = sr.querySelector('.piv');
    return pv.outerHTML;
  });
  console.log('\n########## ' + t + ' -- first .piv outerHTML ##########');
  console.log(html.replace(/></g, '>\n<').slice(0, 1600));
}

// Visual: highlight the chip's true extent at 1280 for caching, then screenshot
await p.goto(URL + '#caching/sys', { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.screenshot({ path: SHOTS + '/sys-1280-caching-CLIPPED.png' });
// Now temporarily let it wrap, to show what the user is MISSING (visual proof only, in-page)
await p.evaluate(() => {
  const sr = document.querySelector('deep-system-map').shadowRoot;
  const st = document.createElement('style');
  st.textContent = '.piv .chip{white-space:normal!important;flex:1 1 auto!important;margin-left:0!important;outline:2px dashed red!important}';
  sr.appendChild(st);
});
await p.waitForTimeout(300);
await p.screenshot({ path: SHOTS + '/sys-1280-caching-UNCLIPPED-proof.png' });
console.log('\n[shots written: sys-1280-caching-CLIPPED.png / sys-1280-caching-UNCLIPPED-proof.png]');
await b.close();
