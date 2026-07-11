// chip_geom.cjs -- pivot-chip LAYOUT for every topic, dumped as JSON.
// Run against the OLD build and the NEW one and diff: THE 8's geometry must be identical
// (their chips are 8-39 chars and never needed to wrap), and no chip anywhere may be clipped.
//   node _audit/.../chip_geom.cjs <html> > out.json
const path = require('path');
const { chromium } = require('playwright');
const HTML = path.resolve(process.argv[2]);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + HTML);
  await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const host = document.createElement('deep-system-map');
    document.body.appendChild(host);
    host.style.display = 'block';
    host.style.width = '760px';
    const res = {};
    TopicRegistry.ids().forEach((id) => {
      const t = TopicRegistry.get(id);
      if (!t.data.sys) return;
      host.renderTopic(t.data.sys);
      res[id] = [...host.shadowRoot.querySelectorAll('.piv .chip')].map((c) => {
        const piv = c.closest('.piv');
        const cr = c.getBoundingClientRect(), pr = piv.getBoundingClientRect();
        return {
          len: c.textContent.length,
          w: Math.round(cr.width), h: Math.round(cr.height),
          overflowPx: Math.round(cr.right - pr.right),
          clipped: Math.round(cr.right - pr.right) > 1,
          qW: Math.round(c.closest('summary').querySelector('.pq').getBoundingClientRect().width),
        };
      });
    });
    host.remove();
    return res;
  });
  await browser.close();
  process.stdout.write(JSON.stringify(out, null, 1));
})();
