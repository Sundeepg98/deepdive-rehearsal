import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();

/* ===== C-REDO. bottom-bar occlusion, with a VERIFIED scroll-to-bottom ===== */
console.log('===== C. bottom-bar occlusion (verified scrolled to true bottom) =====');
console.log('   .mockcta is position:fixed h=123px; .app has padding-bottom:126px to clear it.');
for (const pane of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await p.goto(`${URL}#content-pipeline/${pane}`, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  await p.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  const v = await p.evaluate(async () => {
    const de = document.documentElement;
    window.scrollTo(0, de.scrollHeight);         // sync now that smooth is off
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const maxScroll = de.scrollHeight - de.clientHeight;
    const cta = document.querySelector('.mockcta').getBoundingClientRect();
    const stage = document.querySelector('main.stage').getBoundingClientRect();
    const activePane = document.querySelector('.pane.on').getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY), maxScroll: Math.round(maxScroll),
      atBottom: Math.abs(window.scrollY - maxScroll) < 2,
      paneBottom: +activePane.bottom.toFixed(1),
      stageBottom: +stage.bottom.toFixed(1),
      ctaTop: +cta.top.toFixed(1),
      paneUnderBar: +(activePane.bottom - cta.top).toFixed(1),   // >0 => occluded
      gapBelowPane: +(cta.top - activePane.bottom).toFixed(1)    // >0 => clear
    };
  });
  const verdict = v.paneUnderBar > 0 ? `OCCLUDED by ${v.paneUnderBar}px` : `clear (${v.gapBelowPane}px gap)`;
  console.log(`  ${pane.padEnd(6)} atBottom=${v.atBottom} scrollY=${v.scrollY}/${v.maxScroll} | paneBottom=${v.paneBottom} ctaTop=${v.ctaTop} -> ${verdict}`);
}

/* ===== A-REDO. api-design/num : what makes .stage scrollWidth 457 vs 360? ===== */
console.log('\n\n===== A. api-design/num : the +97px clipped by .stage{overflow-x:hidden} =====');
await p.goto(`${URL}#api-design/num`, { waitUntil: 'load' });
await p.waitForTimeout(1100);
const numr = await p.evaluate(() => {
  const stage = document.querySelector('main.stage');
  const out = { clientW: stage.clientWidth, scrollW: stage.scrollWidth, wide: [] };
  const all = [];
  const walk = n => { for (const e of n.querySelectorAll('*')) { all.push(e); if (e.shadowRoot) walk(e.shadowRoot); } };
  walk(stage);
  const sr = stage.getBoundingClientRect();
  for (const e of all) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none') continue;
    const b = e.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) continue;
    // anything wider than the stage content box, OR whose own box overflows
    const ownOver = e.scrollWidth - e.clientWidth;
    const pastRight = b.right - sr.right;
    if (b.width > stage.clientWidth || ownOver > 1 || pastRight > 1) {
      out.wide.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : ''),
        w: +b.width.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1),
        pastRight: +pastRight.toFixed(1), ownOver, ox: cs.overflowX, ws: cs.whiteSpace,
        txt: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
      });
    }
  }
  out.wide.sort((a, b) => b.w - a.w);
  out.wide = out.wide.slice(0, 8);
  return out;
});
console.log(`  stage clientW=${numr.clientW} scrollW=${numr.scrollW} (+${numr.scrollW - numr.clientW} clipped)`);
numr.wide.forEach(w => console.log(`   ${w.sel} w=${w.w} x=${w.left}..${w.right} pastRight=+${w.pastRight} ownOver=${w.ownOver} ox=${w.ox} ws=${w.ws} "${w.txt}"`));
await p.screenshot({ path: `${S}/stage-clip-api-design-num-360.png`, fullPage: false });

/* ===== B-REDO. structure of the clipped .piv summary chip ===== */
console.log('\n\n===== B. .piv summary structure (System Map pivot chip) =====');
await p.goto(`${URL}#api-design/sys`, { waitUntil: 'load' });
await p.waitForTimeout(900);
const pv = await p.evaluate(() => {
  const sr = document.querySelector('deep-system-map').shadowRoot;
  const d = sr.querySelector('details.piv');
  const sum = d.querySelector('summary');
  return {
    detailsOuterHTML: d.outerHTML.slice(0, 700),
    summaryChildren: [...sum.children].map(c => {
      const b = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return { sel: c.tagName.toLowerCase() + '.' + String(c.className), w: +b.width.toFixed(1), ws: cs.whiteSpace, ov: cs.overflow, txt: c.textContent.trim().slice(0, 50) };
    })
  };
});
console.log('  summary children:', JSON.stringify(pv.summaryChildren, null, 2));
console.log('\n  details outerHTML (truncated):\n', pv.detailsOuterHTML.replace(/></g, '>\n   <'));
await b.close();
