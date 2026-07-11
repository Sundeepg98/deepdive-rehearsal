/* Model Answers pane: the key/value 2-col layout at the squeezed 1280 column vs 1920. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

const probe = () => p.evaluate(() => {
  const sr = document.querySelector('deep-model-answers').shadowRoot;
  const rows = [...sr.querySelectorAll('*')].filter(e => getComputedStyle(e).display === 'grid');
  const out = rows.slice(0, 3).map(g => {
    const cs = getComputedStyle(g);
    const kids = [...g.children].map(c => {
      const r = c.getBoundingClientRect();
      return { cls: c.className, w: Math.round(r.width), h: Math.round(r.height), lines: Math.round(r.height / parseFloat(getComputedStyle(c).lineHeight || 16)), text: c.textContent.trim().slice(0, 40) };
    });
    return { gridCols: cs.gridTemplateColumns, kids };
  });
  return { column: Math.round(document.querySelector('.pane.on').getBoundingClientRect().width), grids: out };
});

await p.goto(URL + '#storage-engines/model', { waitUntil: 'load' });
await p.waitForTimeout(900); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
console.log('=== model @1280 (column 592px) ===');
console.log(JSON.stringify(await probe(), null, 1));

await p.setViewportSize({ width: 1920, height: 1080 });
await p.waitForTimeout(500);
console.log('\n=== model @1920 (column 830px) ===');
console.log(JSON.stringify(await probe(), null, 1));
await p.screenshot({ path: SHOTS + '/model-1920-storage-engines.png' });
await b.close();
