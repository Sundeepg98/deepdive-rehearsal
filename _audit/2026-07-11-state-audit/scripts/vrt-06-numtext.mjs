/* F3 crux: is a NUMBER actually visually truncated, or does only slack overflow?
   Measure every .nrow child's right edge against the REAL clipping box (main.stage client right). */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });

for (const t of ['storage-engines', 'load-balancing']) {
  await p.goto(URL + '#' + t + '/num', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  const d = await p.evaluate(() => {
    const sr = document.querySelector('deep-numbers').shadowRoot;
    const stage = document.querySelector('.stage');
    const sRect = stage.getBoundingClientRect();
    const clipRight = sRect.left + stage.clientWidth; // the visible right edge (padding box)
    const rows = [...sr.querySelectorAll('.nrow')];
    return {
      clipRight: Math.round(clipRight),
      stageClip: Math.round(stage.scrollWidth - stage.clientWidth),
      firstRowHTML: rows[0] ? rows[0].outerHTML.replace(/\s+/g, ' ').slice(0, 320) : '',
      rows: rows.map(r => {
        const parts = [...r.children].map(c => {
          const cr = c.getBoundingClientRect();
          return {
            cls: c.className,
            text: c.textContent.trim(),
            left: Math.round(cr.left),
            right: Math.round(cr.right),
            beyond: Math.round(cr.right - clipRight), // >0 = painted past the clip edge = INVISIBLE
            ws: getComputedStyle(c).whiteSpace,
          };
        });
        return { parts };
      }),
    };
  });
  console.log('\n########## ' + t + ' /num @1280  (stage clips ' + d.stageClip + 'px; visible right edge = ' + d.clipRight + 'px) ##########');
  console.log('row[0] HTML: ' + d.firstRowHTML + '\n');
  d.rows.forEach((r, i) => {
    r.parts.forEach(pt => {
      const cut = pt.beyond > 0;
      console.log(`  ${cut ? '>>> CUT' : '   ok  '} [${pt.cls}] right=${pt.right} (edge ${d.clipRight}) ${cut ? 'BEYOND +' + pt.beyond + 'px  ws=' + pt.ws : ''}`);
      console.log(`          "${pt.text}"`);
    });
    if (i < r.parts.length) console.log('');
  });
  // tight screenshot of the num card
  const box = await p.evaluate(() => {
    const st = document.querySelector('.stage').getBoundingClientRect();
    return { x: st.x, y: st.y, w: st.width, h: Math.min(700, st.height) };
  });
  await p.screenshot({ path: SH + `f3-numcrop-1280-${t}.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
}
await b.close();
