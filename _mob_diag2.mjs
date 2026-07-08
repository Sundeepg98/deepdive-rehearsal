import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME, args:['--no-sandbox','--disable-dev-shm-usage'] });
for (const vp of [{ width:390, height:844, tag:'mobile' }, { width:1280, height:900, tag:'desktop' }]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('file://' + process.cwd() + '/deepdive_content_pipeline_rehearsal.html', { waitUntil:'load' });
  await p.waitForTimeout(2000);
  const d = await p.evaluate(() => {
    const probe = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return 'ABSENT';
      const r = e.getBoundingClientRect();
      const ov = e.closest('.ix-ov');
      return { w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y),
        insideIxOv: !!ov, ixOvClass: ov ? ov.className : (document.querySelector('.ix-ov') || {}).className || 'no .ix-ov in DOM',
        ownDisplay: getComputedStyle(e).display };
    };
    const seg = document.querySelector('.seg');
    return {
      ixX: probe('.ix-x'), ixHome: probe('.ix-home-btn'),
      ixOvCount: document.querySelectorAll('.ix-ov').length,
      anyOpenDialog: !!document.querySelector('[role=dialog].open, .ix-ov.open'),
      segCols: getComputedStyle(seg).gridTemplateColumns.split(' ').length,
      segDisplay: getComputedStyle(seg).display,
      segRows: new Set([...seg.querySelectorAll('button')].filter(b=>getComputedStyle(b).display!=='none').map(b=>Math.round(b.getBoundingClientRect().y))).size,
      vizW: Math.round(document.querySelector('button[data-tab="viz"]').getBoundingClientRect().width),
    };
  });
  console.log(vp.tag, JSON.stringify(d));
  await p.close();
}
await b.close();
