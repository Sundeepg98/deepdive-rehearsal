/* F3 FINAL: measure TEXT overflow (Range rects), not element boxes.
   A nowrap .nrow-v in a squeezed grid track keeps a narrow border box while its TEXT
   paints beyond it -> getBoundingClientRect() on the element hides the truncation. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); // NORMAL motion

for (const t of ['storage-engines', 'load-balancing']) {
  for (const w of [1280, 1920]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto(URL + `#${t}/num`, { waitUntil: 'load' });
    await p.waitForTimeout(900);
    const d = await p.evaluate(() => {
      const stage = document.querySelector('.stage');
      const sr0 = stage.getBoundingClientRect();
      const clipEdge = sr0.left + stage.clientWidth;   // visible right edge
      const sr = document.querySelector('deep-numbers').shadowRoot;
      const out = [];
      for (const row of sr.querySelectorAll('.nrow')) {
        const k = row.querySelector('.nrow-k');
        const v = row.querySelector('.nrow-v');
        if (!v) continue;
        const vbox = v.getBoundingClientRect();
        // TEXT extent: union of all client rects of every text node inside .nrow-v
        let textRight = -Infinity;
        const walk = (n) => {
          if (n.nodeType === 3 && n.data.trim()) {
            const r = document.createRange(); r.selectNodeContents(n);
            for (const rect of r.getClientRects()) textRight = Math.max(textRight, rect.right);
          }
          for (const c of n.childNodes) walk(c);
        };
        walk(v);
        out.push({
          k: k ? k.textContent.trim() : '',
          full: v.textContent.trim(),
          boxRight: Math.round(vbox.right),
          boxW: Math.round(vbox.width),
          vScrollOver: Math.round(v.scrollWidth - v.clientWidth), // nowrap content wider than box
          textRight: Math.round(textRight),
          hiddenPx: Math.round(textRight - clipEdge),   // >0 => characters are INVISIBLE
        });
      }
      return { clipEdge: Math.round(clipEdge), stageClip: Math.round(stage.scrollWidth - stage.clientWidth), rows: out };
    });
    console.log(`\n### ${t} /num @${w}   clip edge x=${d.clipEdge}px, .stage over=${d.stageClip}px`);
    d.rows.forEach(r => {
      const bad = r.hiddenPx > 0;
      console.log(`  ${bad ? 'TRUNCATED' : '  ok     '} "${r.k}"`);
      console.log(`     value="${r.full}"`);
      console.log(`     box right=${r.boxRight} (w=${r.boxW}, nowrap content overflows its box by ${r.vScrollOver}px) | TEXT right=${r.textRight}` +
                  (bad ? `  => ${r.hiddenPx}px of text is PAST the clip edge and INVISIBLE` : ''));
    });
  }
}
await b.close();
