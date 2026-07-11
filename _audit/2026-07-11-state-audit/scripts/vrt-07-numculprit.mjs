/* F3 root-cause: WHAT actually overflows .stage on /num views?  (the lens blamed .nrow) */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });

for (const t of ['storage-engines', 'load-balancing', 'consistency-models']) {
  await p.goto(URL + '#' + t + '/num', { waitUntil: 'load' });
  await p.waitForTimeout(450);
  const d = await p.evaluate(() => {
    const stage = document.querySelector('.stage');
    const sRect = stage.getBoundingClientRect();
    const clipRight = sRect.left + stage.clientWidth;
    const host = document.querySelector('deep-numbers');
    const sr = host.shadowRoot;
    const out = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const beyond = r.right - clipRight;
        if (beyond > 0.5) {
          out.push({
            el: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
            right: Math.round(r.right), width: Math.round(r.width), beyond: Math.round(beyond),
            text: el.textContent.trim().slice(0, 50),
            minW: getComputedStyle(el).minWidth, ws: getComputedStyle(el).whiteSpace,
          });
        }
      }
    };
    walk(sr);
    walk(document); // also light DOM
    // what makes .stage scrollWidth big?
    return {
      stageClip: Math.round(stage.scrollWidth - stage.clientWidth),
      clipRight: Math.round(clipRight),
      hostRight: Math.round(host.getBoundingClientRect().right),
      hostWidth: Math.round(host.getBoundingClientRect().width),
      offenders: out.sort((a, c) => c.beyond - a.beyond).slice(0, 8),
    };
  });
  console.log('\n##### ' + t + ' /num @1280 — .stage clips ' + d.stageClip + 'px; visible edge ' + d.clipRight + 'px');
  console.log('  <deep-numbers> host: width ' + d.hostWidth + ', right ' + d.hostRight);
  if (!d.offenders.length) console.log('  !! NO element is painted past the clip edge — the overflow is NOT visible content.');
  d.offenders.forEach(o => console.log(`  BEYOND +${o.beyond}px  ${o.el}  (w=${o.width}, right=${o.right}, min-width=${o.minW}, ws=${o.ws})\n      "${o.text}"`));
}
await b.close();
