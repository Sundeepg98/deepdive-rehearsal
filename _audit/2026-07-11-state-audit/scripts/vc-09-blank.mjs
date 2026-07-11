/* Why is the reduced-motion screenshot blank when the DOM says the pane is 485px tall?
   Either (a) a real "app renders blank under prefers-reduced-motion" bug, or
   (b) a headless capture artifact. Find out — do not guess. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-console-verify';
const b = await chromium.launch();

for (const rm of ['no-preference', 'reduce']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: rm === 'reduce' ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(URL + '#kafka-internals/walk', { waitUntil: 'load' });
  await p.waitForTimeout(1500);

  const probe = await p.evaluate(() => {
    const at = (x, y) => { const e = document.elementFromPoint(x, y); return e ? (e.tagName + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '')) : 'null'; };
    const cs = (sel) => { const e = document.querySelector(sel); if (!e) return 'MISSING'; const s = getComputedStyle(e); return `disp=${s.display} vis=${s.visibility} op=${s.opacity}`; };
    return {
      reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
      bootsplash: !!document.getElementById('_bootsplash'),
      bootsplashStyle: document.getElementById('_bootsplash') ? cs('#_bootsplash') : 'REMOVED',
      atCenter: at(640, 450),
      atHeader: at(640, 60),
      atSidebar: at(120, 300),
      html: cs('html'), body: cs('body'),
      h1text: (document.querySelector('.hdr h1') || {}).textContent,
      h1style: cs('.hdr h1'),
      paneOn: cs('.pane.on'),
      bodyRect: JSON.stringify(document.body.getBoundingClientRect()),
    };
  });
  console.log(`\n##### reducedMotion=${rm} #####`);
  console.log(JSON.stringify(probe, null, 2));
  await p.screenshot({ path: `${S}/vc-blank-${rm}-walk.png` });
}
await b.close();
