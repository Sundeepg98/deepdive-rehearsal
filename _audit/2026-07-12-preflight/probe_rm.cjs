const path = require('path');
const { chromium } = require('playwright');
const HTML = path.join(__dirname, '..', '..', 'deepdive_content_pipeline_rehearsal.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  for (const rm of [null, 'reduce']) {
    // exactly what render.cjs's overflow sweep constructs
    const p = await b.newPage(rm ? { viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' }
                                 : { viewport: { width: 390, height: 800 } });
    await p.goto('file://' + HTML, { timeout: 120000 });
    await p.waitForFunction(() => typeof switchTab === 'function' && typeof TopicRegistry !== 'undefined' && TopicRegistry.ids().length > 0, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({
      bodyOpacity: getComputedStyle(document.body).opacity,
      htmlOpacity: getComputedStyle(document.documentElement).opacity,
      visibleText: (document.body.innerText || '').trim().length,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    console.log(`reducedMotion=${String(rm).padEnd(6)} bodyOpacity=${r.bodyOpacity}  visibleText=${r.visibleText} chars  scrollW=${r.scrollW} clientW=${r.clientW}`);
    await p.screenshot({ path: `_audit/2026-07-12-preflight/rm-${rm || 'default'}.png` });
    await p.close();
  }
  await b.close();
})();
