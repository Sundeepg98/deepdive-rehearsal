const { chromium } = require('playwright');
const p = process.argv[2];
const url = 'file:///' + p.replace(/\\/g, '/');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  const ids = await page.evaluate(() => TopicRegistry.ids());
  const map = {};
  for (const id of ids) {
    await page.evaluate((i) => { window.location.hash = '#' + i + '/walk'; }, id);
    await page.waitForTimeout(120);
    const g = await page.evaluate(() => document.documentElement.dataset.group || null);
    (map[g] = map[g] || []).push(id);
  }
  console.log(JSON.stringify(map, null, 1));
  await browser.close();
})();
