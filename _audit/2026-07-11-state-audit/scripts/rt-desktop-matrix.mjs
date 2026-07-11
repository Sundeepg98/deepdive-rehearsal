/* Screenshot matrix: 9 panes x 5 required breakpoints + the num-clip proof at 1920. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const SIZES = [[768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]];
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

for (const v of VIEWS) {
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.goto(URL + '#storage-engines/' + v, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SHOTS}/panes-1280/${v}.png` });
}
console.log('[9 panes @1280x800 captured]');

for (const view of ['walk', 'num', 'model']) {
  for (const [w, h] of SIZES) {
    await p.setViewportSize({ width: w, height: h });
    await p.goto(URL + '#storage-engines/' + view, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/bp/${view}-${w}x${h}.png` });
  }
}
console.log('[breakpoint matrix captured]');

const probe = () => p.evaluate(() => {
  const s = document.querySelector('.stage');
  const sr = document.querySelector('deep-numbers').shadowRoot;
  const row = [...sr.querySelectorAll('.nrow')][0];
  const v = row.querySelector('.nrow-v');
  return {
    stageClip: s.scrollWidth - s.clientWidth,
    column: Math.round(document.querySelector('.pane.on').getBoundingClientRect().width),
    firstValue: v.textContent.trim(),
    valueRight: Math.round(v.getBoundingClientRect().right),
    paneRight: Math.round(document.querySelector('.pane.on').getBoundingClientRect().right)
  };
});

await p.setViewportSize({ width: 1920, height: 1080 });
await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
console.log('\n@1920 (column back at the 830px cap):', JSON.stringify(await probe()));
await p.screenshot({ path: SHOTS + '/num-1920-storage-engines-CLEAN.png' });

await p.setViewportSize({ width: 1280, height: 800 });
await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
console.log('@1280 (column squeezed to 592px):', JSON.stringify(await probe()));
await b.close();
