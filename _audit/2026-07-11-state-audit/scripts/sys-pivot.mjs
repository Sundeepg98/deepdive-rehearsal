// LENS: topic-inventory -- the sys pivot: answer crammed into the summary chip, empty body.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/topic-inventory';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(500);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

for (const [topic, cls] of [['content-pipeline', 'legacy'], ['caching', 'markdown']]) {
  await p.evaluate((t) => { window.location.hash = '#' + t + '/sys'; }, topic);
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const root = document.querySelector('deep-system-map').shadowRoot;
    root.querySelectorAll('details.piv').forEach(d => (d.open = true));   // expand all
    const pivs = [...root.querySelectorAll('details.piv')].map(d => {
      const chip = d.querySelector('.chip'), pa = d.querySelector('.pa');
      const chipR = chip.getBoundingClientRect();
      const cardR = d.getBoundingClientRect();
      return {
        chipChars: chip.textContent.trim().length,
        bodyChars: pa.textContent.trim().length,
        chipScrollW: Math.round(chip.scrollWidth),
        chipClientW: Math.round(chip.clientWidth),
        overflowPx: Math.round(chip.scrollWidth - chip.clientWidth),
        chipOverflowsCard: Math.round(chipR.right - cardR.right),
      };
    });
    return { stages: root.querySelectorAll('.stg').length, pivs };
  });
  console.log(`--- ${cls.padEnd(8)} ${topic} :: stages=${r.stages}`);
  r.pivs.forEach((v, i) => console.log(
    `    pivot ${i + 1}: chip=${String(v.chipChars).padStart(3)} chars  disclosure-body=${String(v.bodyChars).padStart(3)} chars  chip overflow=${v.overflowPx}px (scrollW ${v.chipScrollW} vs clientW ${v.chipClientW})`
  ));
  await p.screenshot({ path: `${SHOTS}/sys-pivots-expanded-${cls}-${topic}.png`, fullPage: true });
}
await b.close();
