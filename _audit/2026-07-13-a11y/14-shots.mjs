import { open, dismissOverlays, toDrill, advanceToJudge, SHOTS } from './lib.mjs';
import path from 'path';

const { browser, page } = await open();
await dismissOverlays(page);
await toDrill(page);

/* clip a screenshot to the drill scoreboard (inside <deep-drill>'s shadow root) */
const clipScore = async (name) => {
  const box = await page.evaluate(() => {
    const el = document.querySelector('deep-drill').shadowRoot.querySelector('.score');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: r.width + 24, height: r.height + 24 };
  });
  if (!box) return console.log('no element for ' + name);
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), clip: box });
  console.log('shot: ' + name + '  ' + JSON.stringify(box));
};

// zero state
await clipScore('20-scoreboard-zero');

// grade one Solid -> filled state
await advanceToJudge(page);
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('jg').click());
await page.waitForTimeout(600);
await clipScore('21-scoreboard-one-solid');

// grade a Shaky too, so Revisit is non-zero (outline, never fills)
await advanceToJudge(page);
await page.evaluate(() => document.querySelector('deep-drill').shadowRoot.getElementById('js').click());
await page.waitForTimeout(600);
await clipScore('22-scoreboard-solid-and-revisit');

const state = await page.evaluate(() => {
  const sr = document.querySelector('deep-drill').shadowRoot;
  return {
    got: sr.getElementById('sGot').textContent,
    shk: sr.getElementById('sShk').textContent,
    left: sr.getElementById('sLeft').textContent,
    gCls: sr.querySelector('.pill.g').className,
    sCls: sr.querySelector('.pill.s').className,
  };
});
console.log('scoreboard state:', JSON.stringify(state));
console.log('This is the ONLY feedback the drill gives. A screen reader is told none of it.');

// the drill pane whole, for context
await page.screenshot({ path: path.join(SHOTS, '23-drill-pane.png') });
await browser.close();
