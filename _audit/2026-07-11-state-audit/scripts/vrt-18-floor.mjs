/* F7 culprit: is nav#topicnav really what pins scrollWidth to 411? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 800 } });
await p.goto(URL + '#caching/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);

const d = await p.evaluate(() => {
  const nav = document.querySelector('nav.topic-nav') || document.getElementById('topicnav');
  const r = nav ? nav.getBoundingClientRect() : null;
  // Elements NOT inside any horizontal scroll container, whose right edge exceeds the viewport
  const inScroller = (el) => {
    let n = el.parentElement;
    while (n) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return n.tagName.toLowerCase() + '.' + (typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : '');
      n = n.parentElement;
    }
    return null;
  };
  const vw = innerWidth;
  const escapees = [];
  for (const el of document.querySelectorAll('*')) {
    const b2 = el.getBoundingClientRect();
    if (!b2.width && !b2.height) continue;
    if (b2.left < -5000) continue;
    if (b2.right <= vw + 0.5) continue;
    const sc = inScroller(el);
    escapees.push({
      el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
      right: Math.round(b2.right), width: Math.round(b2.width), insideScroller: sc,
    });
  }
  const notInScroller = escapees.filter(e => !e.insideScroller);
  return {
    docScrollWidth: document.documentElement.scrollWidth,
    topicnav: r ? { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), scrollW: nav.scrollWidth, clientW: nav.clientWidth } : null,
    topicnavOverflowX: nav ? getComputedStyle(nav).overflowX : null,
    escapeesNotInScroller: notInScroller.sort((a, c) => c.right - a.right).slice(0, 6),
    escapeesInScrollerCount: escapees.length - notInScroller.length,
    scrollerNames: [...new Set(escapees.filter(e => e.insideScroller).map(e => e.insideScroller))],
  };
});
console.log('vw = 360');
console.log('document.scrollWidth =', d.docScrollWidth);
console.log('nav.topic-nav        =', JSON.stringify(d.topicnav), 'overflow-x:', d.topicnavOverflowX);
console.log('\nelements past the viewport that are NOT inside a horizontal scroller:');
d.escapeesNotInScroller.forEach(e => console.log(`   right=${e.right}  w=${e.width}  ${e.el}`));
console.log('\nelements past the viewport that ARE inside a horizontal scroller (legit):', d.escapeesInScrollerCount, '| scrollers:', d.scrollerNames);
await b.close();
