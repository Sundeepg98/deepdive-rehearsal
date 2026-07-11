import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1300);
await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
await p.waitForTimeout(600);
const r = await p.evaluate(() => {
  const notInScroller = el => {
    let n = el.parentElement;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden' ||
          cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflow === 'hidden') return false;
      n = n.parentElement;
    }
    return true;
  };
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const rr = el.getBoundingClientRect();
    if (rr.width === 0 && rr.height === 0) return;
    if (rr.right > window.innerWidth + 0.5 && notInScroller(el)) {
      const cs = getComputedStyle(el);
      out.push({ tag: el.tagName.toLowerCase(), id: el.id || null, cls: (typeof el.className==='string'?el.className:'').slice(0,40)||null,
                 right: +rr.right.toFixed(1), width: +rr.width.toFixed(1), pos: cs.position, overflowPx: +(rr.right - window.innerWidth).toFixed(1) });
    }
  });
  return { innerWidth: innerWidth, docScrollWidth: document.documentElement.scrollWidth,
           tnmenuHidden: document.getElementById('tnmenu').hidden,
           REAL_DOC_OVERFLOWERS: out.sort((a,z)=>z.overflowPx-a.overflowPx).slice(0,10) };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
