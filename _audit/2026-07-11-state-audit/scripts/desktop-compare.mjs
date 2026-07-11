import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();

for (const [w, h, label] of [[1440, 900, 'DESKTOP'], [360, 640, 'MOBILE']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, deviceScaleFactor: 1 });
  const p = await ctx.newPage();

  // --- .piv chip ---
  await p.goto(`${URL}#api-design/sys`, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const chip = await p.evaluate(() => {
    const sr = document.querySelector('deep-system-map').shadowRoot;
    const d = sr.querySelector('details.piv');
    const c = d.querySelector('span.chip');
    const db = d.getBoundingClientRect(), cb = c.getBoundingClientRect();
    return {
      pivW: +db.width.toFixed(1), chipW: +cb.width.toFixed(1),
      cutOff: +(cb.right - db.right).toFixed(1),
      paEmpty: (d.querySelector('.pa').textContent || '').trim().length === 0,
      paHTML: d.querySelector('.pa').innerHTML.slice(0, 60)
    };
  });

  // --- .nrow (numbers) ---
  await p.goto(`${URL}#api-design/num`, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const num = await p.evaluate(() => {
    const stage = document.querySelector('main.stage');
    const sr = document.querySelector('deep-numbers').shadowRoot;
    const rows = [...sr.querySelectorAll('.nrow')].map(r => ({
      over: r.scrollWidth - r.clientWidth, cw: r.clientWidth, sw: r.scrollWidth,
      k: (r.querySelector('.nrow-k')?.textContent || '').trim().slice(0, 34),
      v: (r.querySelector('.nrow-v')?.textContent || '').trim().slice(0, 22)
    }));
    return {
      stageClientW: stage.clientWidth, stageScrollW: stage.scrollWidth,
      stageClipped: stage.scrollWidth - stage.clientWidth,
      worstRows: rows.filter(r => r.over > 1).sort((a, b) => b.over - a.over).slice(0, 4)
    };
  });

  // --- horizontal overflow of the doc ---
  const doc = await p.evaluate(() => {
    const de = document.documentElement;
    return { cw: de.clientWidth, sw: de.scrollWidth, over: de.scrollWidth - de.clientWidth };
  });

  console.log(`\n########## ${label} ${w}x${h} ##########`);
  console.log(`  doc horizontal overflow : clientW=${doc.cw} scrollW=${doc.sw} -> +${doc.over}px`);
  console.log(`  .piv chip               : piv=${chip.pivW}px chip=${chip.chipW}px -> ${chip.cutOff > 0 ? 'CUT OFF +' + chip.cutOff + 'px' : 'fits'} | .pa empty=${chip.paEmpty}`);
  console.log(`  numbers .nrow overflow  : stage ${num.stageClientW}/${num.stageScrollW} -> ${num.stageClipped > 1 ? 'CLIPPED +' + num.stageClipped + 'px' : 'fits'}`);
  num.worstRows.forEach(r => console.log(`      row over=+${r.over}px (box ${r.cw}px, content ${r.sw}px)  "${r.k}" = "${r.v}"`));
  if (!num.worstRows.length) console.log('      (no .nrow overflows)');
  await ctx.close();
}
await b.close();
