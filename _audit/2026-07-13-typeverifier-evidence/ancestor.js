const { chromium } = require('playwright');
const url = 'file:///' + process.argv[2].replace(/\\/g, '/');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(600);
  await p.evaluate(() => { window.location.hash = '#autoscaling/walk'; }); await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const bis = [...document.querySelectorAll('b,i')];
    const at14 = bis.filter(e => parseFloat(getComputedStyle(e).fontSize) === 14);
    const at14inCmp = at14.filter(e => e.closest('[class*=cmp-]'));
    const at14outside = at14.filter(e => !e.closest('[class*=cmp-]')).map(e => e.tagName + ':' + (e.textContent||'').trim().slice(0,20));
    return { total_b_i: bis.length, at14: at14.length, at14_in_cmp: at14inCmp.length, at14_outside: at14outside };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
