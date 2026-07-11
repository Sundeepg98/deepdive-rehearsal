/* What overflows in the Numbers pane, and is it a consequence of the narrow 1280 column? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(URL + '#load-balancing/num', { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);

const FIND = `(() => {
  const pane = document.querySelector('.pane.on');
  const paneR = pane.getBoundingClientRect();
  const limit = paneR.right;              // the reading column's right edge
  const host = document.querySelector('deep-numbers');
  const sr = host.shadowRoot;
  const out = [];
  sr.querySelectorAll('*').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(e);
    if (r.right > limit + 1) {
      out.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : ''),
        w: Math.round(r.width), right: Math.round(r.right), overColumn: Math.round(r.right - limit),
        whiteSpace: cs.whiteSpace, overflowX: cs.overflowX, minWidth: cs.minWidth, display: cs.display,
        text: e.textContent.trim().replace(/\\s+/g,' ').slice(0, 64)
      });
    }
  });
  const stage = document.querySelector('.stage');
  return { column: Math.round(paneR.width), stageClip: stage.scrollWidth - stage.clientWidth,
    offenders: out.sort((a,b) => b.overColumn - a.overColumn).slice(0, 6) };
})()`;

console.log('=== load-balancing / num @1280 (companion OPEN, column=592px) ===');
console.log(JSON.stringify(await p.evaluate(FIND), null, 1));
await p.screenshot({ path: SHOTS + '/num-1280-load-balancing-CLIPPED.png' });

console.log('\n=== same topic @1920 (column=830px, the designed cap) ===');
await p.setViewportSize({ width: 1920, height: 1080 });
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(FIND), null, 1));
await p.screenshot({ path: SHOTS + '/num-1920-load-balancing.png' });

console.log('\n=== same topic @1280 with the companion FOLDED (column back to 830px) ===');
await p.setViewportSize({ width: 1280, height: 800 });
await p.waitForTimeout(300);
await p.evaluate(() => { const x = document.querySelector('.cmp-fold'); if (x) x.click(); });
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(FIND), null, 1));

// count clipping topics at 1920 vs 1280
console.log('\n=== num-pane stage clipping: how many topics, at each width? ===');
const ids = await p.evaluate(() => TopicRegistry.ids());
for (const vw of [1280, 1440, 1520, 1920]) {
  await p.setViewportSize({ width: vw, height: 900 });
  let n = 0, worst = 0;
  for (const t of ids) {
    await p.goto(URL + '#' + t + '/num', { waitUntil: 'load' });
    await p.waitForTimeout(170);
    const c = await p.evaluate(() => { const s = document.querySelector('.stage'); return s.scrollWidth - s.clientWidth; });
    if (c > 1) { n++; worst = Math.max(worst, c); }
  }
  console.log(`  ${vw}px: ${n}/46 topics clip the Numbers pane (worst +${worst}px)`);
}
await b.close();
