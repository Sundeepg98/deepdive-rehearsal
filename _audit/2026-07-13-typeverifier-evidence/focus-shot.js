const { chromium } = require('playwright');
const url = 'file:///' + process.argv[2].replace(/\\/g, '/');
const shot = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await m.goto(url, { waitUntil: 'load' }); await m.waitForTimeout(700);
  await m.evaluate(() => { window.location.hash = '#walk'; }); await m.waitForTimeout(300);
  // keyboard-focus a mid/edge tab: focus 6th visible tab (model) which sits near the right when at start
  const info = await m.evaluate(async () => {
    const s = document.querySelector('.sidebar .seg');
    const btns = [...s.querySelectorAll('button')].filter(x => x.getBoundingClientRect().width > 0);
    const target = btns[5]; // 'model' — a wide tab likely clipped by the right scrim
    target.focus();
    await new Promise(r => setTimeout(r, 250)); // let focus-scroll + fade listener settle
    s.dispatchEvent(new Event('scroll'));
    await new Promise(r => setTimeout(r, 250));
    const cs = getComputedStyle(target), r = target.getBoundingClientRect(), sr = s.getBoundingClientRect();
    const aft = getComputedStyle(s, '::after');
    return { tab: target.getAttribute('data-tab'), outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,
      btnRight: Math.round(r.right), btnLeft: Math.round(r.left), stripRight: Math.round(sr.right),
      rightScrimW: Math.round(parseFloat(aft.width) || 0),
      btnFullyVisible: r.right <= sr.right && r.left >= sr.left };
  });
  console.log(JSON.stringify(info));
  const s = await m.$('.sidebar .seg');
  if (s) await s.screenshot({ path: shot });
  await b.close();
})();
