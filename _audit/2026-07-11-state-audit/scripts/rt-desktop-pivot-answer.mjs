/* Verify the SECOND consequence of the chip bug: because parse_md.mjs:225 swallows the
   whole merged paragraph into `chip`, the pivot ANSWER body (`piv.a`) is left EMPTY.
   Compare a hand-authored topic (authz, has a real .a) vs markdown topics. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });

const PROBE = `(() => {
  const sr = document.querySelector('deep-system-map').shadowRoot;
  const pivs = [...sr.querySelectorAll('.piv')];
  const vw = window.innerWidth;
  return pivs.map(pv => {
    const chip = pv.querySelector('.chip');
    // the answer paragraph: any text node/el in .piv that is NOT the chip / question / jump button
    const jump = pv.querySelector('.piv-jump');
    const clone = pv.cloneNode(true);
    [...clone.querySelectorAll('.chip,.piv-jump,.piv-q,h4,button')].forEach(e => e.remove());
    const answer = clone.textContent.replace(/\\s+/g,' ').trim();
    const cr = chip ? chip.getBoundingClientRect() : null;
    return {
      chipChars: chip ? chip.textContent.trim().length : 0,
      chipW: cr ? Math.round(cr.width) : 0,
      chipOverflowsBy: cr ? Math.round(cr.right - vw) : 0,
      answerChars: answer.length,
      answerPreview: answer.slice(0, 70),
      hasJumpBtn: !!jump,
      pivScrollW: pv.scrollWidth, pivClientW: pv.clientWidth
    };
  });
})()`;

for (const t of ['authz', 'caching', 'kafka-internals', 'stream-batch-processing']) {
  await p.goto(URL + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  const r = await p.evaluate(PROBE);
  console.log('\n===== topic: ' + t + ' (' + (t === 'authz' ? 'HAND-AUTHORED src/topics/authz/sys.js' : 'MARKDOWN src/topics-md/' + t + '.md') + ') =====');
  r.forEach((pv, i) => {
    console.log(`  pivot ${i}: chip=${pv.chipChars}ch/${pv.chipW}px overflowsViewportBy=${pv.chipOverflowsBy > 0 ? '+' + pv.chipOverflowsBy + 'px' : 'no'}  | ANSWER=${pv.answerChars}ch ${pv.answerChars === 0 ? '<<< EMPTY (answer prose lost into the chip)' : '"' + pv.answerPreview + '..."'}`);
    console.log(`            .piv scrollWidth=${pv.pivScrollW} clientWidth=${pv.pivClientW} (clipped by ${pv.pivScrollW - pv.pivClientW}px)`);
  });
  await p.screenshot({ path: SHOTS + '/sys-1280-' + t + '.png' });
}
await b.close();
