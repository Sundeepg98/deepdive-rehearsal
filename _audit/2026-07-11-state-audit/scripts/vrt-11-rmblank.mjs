/* Does prefers-reduced-motion:reduce make content INVISIBLE?
   Matrix: {reduce, no-preference} x {bare URL, deep link}. Measure opacity of pane + inner cards. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();

for (const rm of ['reduce', 'no-preference']) {
  for (const [label, url] of [['bare', URL], ['deeplink', URL + '#storage-engines/num']]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: rm });
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForTimeout(3000);
    const d = await p.evaluate(() => {
      const pane = document.querySelector('.stage .pane.on');
      const host = pane ? [...pane.children].find(c => c.shadowRoot) : null;
      const cards = host ? [...host.shadowRoot.querySelectorAll('.card, .nrow, .ninp')] : [];
      const op = el => el ? getComputedStyle(el).opacity : 'n/a';
      const anim = el => el ? getComputedStyle(el).animationName : 'n/a';
      const sh = document.querySelector('.stage-head');
      return {
        paneId: pane?.id,
        paneOpacity: op(pane),
        paneAnim: anim(pane),
        paneTransform: pane ? getComputedStyle(pane).transform : 'n/a',
        hostOpacity: op(host),
        hostAnim: anim(host),
        stageHeadOpacity: op(sh),
        stageHeadAnim: anim(sh),
        cardOpacities: cards.slice(0, 4).map(c => c.className + '=' + op(c) + ' anim:' + anim(c)),
        sidebarOpacity: op(document.querySelector('.sidebar')),
        bodyTextLen: document.body.innerText.trim().length,
      };
    });
    const f = SH + `rm-${rm}-${label}.png`;
    await p.screenshot({ path: f });
    console.log(`\n### reducedMotion=${rm}  url=${label}`);
    console.log(JSON.stringify(d, null, 1));
    await p.close();
  }
}
await b.close();
