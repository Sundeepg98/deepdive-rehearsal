/* Slow first paint, or an Escape bug? Long waits, then look. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();

for (const [esc, wait] of [[true, 4000], [false, 4000]]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
  if (esc) { await p.waitForTimeout(600); await p.keyboard.press('Escape'); }
  await p.waitForTimeout(wait);
  const f = SH + `paint-esc${esc}.png`;
  await p.screenshot({ path: f });
  const d = await p.evaluate(() => ({
    innerTextLen: document.body.innerText.trim().length,
    overlayPresent: !!document.getElementById('_index-overlay'),
    numRows: document.querySelector('deep-numbers')?.shadowRoot?.querySelectorAll('.nrow').length || 0,
    paneOn: document.querySelector('.stage .pane.on')?.id,
    appOpacity: getComputedStyle(document.querySelector('.app')).opacity,
    stageClip: (() => { const s = document.querySelector('.stage'); return s.scrollWidth - s.clientWidth; })(),
  }));
  console.log(`esc=${esc} wait=${wait}ms ->`, JSON.stringify(d), '=>', f);
  await p.close();
}
await b.close();
