import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-mobile';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(URL + '#api-design/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);

// kill smooth-scroll so scrollTo is synchronous
await p.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });

const r = await p.evaluate(() => {
  const de = document.documentElement;
  const out = { clientW: de.clientWidth, scrollW: de.scrollWidth };

  // try every horizontal scroll route
  de.scrollLeft = 999;                       out.after_de_scrollLeft = { de: de.scrollLeft, body: document.body.scrollLeft, winX: window.scrollX };
  de.scrollLeft = 0;
  document.body.scrollLeft = 999;            out.after_body_scrollLeft = { de: de.scrollLeft, body: document.body.scrollLeft, winX: window.scrollX };
  document.body.scrollLeft = 0;
  window.scrollTo(999, 0);                   out.after_winScrollTo = { de: de.scrollLeft, body: document.body.scrollLeft, winX: window.scrollX };

  out.maxScrollLeft = de.scrollWidth - de.clientWidth;
  out.htmlOverflowX = getComputedStyle(de).overflowX;
  out.bodyOverflowX = getComputedStyle(document.body).overflowX;
  out.appOverflowX = getComputedStyle(document.querySelector('.app')).overflowX;

  // is #tnnext reachable? (hit-test at its centre)
  const nx = document.getElementById('tnnext');
  const rb = nx.getBoundingClientRect();
  const cx = rb.left + rb.width / 2, cy = rb.top + rb.height / 2;
  const hit = (cx >= 0 && cx < window.innerWidth && cy >= 0 && cy < window.innerHeight)
    ? document.elementFromPoint(cx, cy) : null;
  out.tnnext = {
    rect: { left: +rb.left.toFixed(1), right: +rb.right.toFixed(1), top: +rb.top.toFixed(1), w: +rb.width.toFixed(1) },
    viewportW: window.innerWidth,
    centreInsideViewport: cx < window.innerWidth,
    elementFromPointAtCentre: hit ? (hit.id || hit.className || hit.tagName) : 'OUTSIDE VIEWPORT - no hit test possible'
  };
  // same for the trigger's right part & the chevron
  const tc = document.getElementById('tncurrent');
  const tr = tc.getBoundingClientRect();
  out.tncurrent = { right: +tr.right.toFixed(1), clippedBy: +(tr.right - window.innerWidth).toFixed(1) };
  return r0(out);
  function r0(o) { return o; }
});
console.log(JSON.stringify(r, null, 2));

// Can Playwright actually TAP #tnnext? (real user action)
let tapResult = 'UNKNOWN';
const before = await p.evaluate(() => TopicRegistry.current().id);
try {
  await p.locator('#tnnext').click({ timeout: 4000 });
  await p.waitForTimeout(700);
  const after = await p.evaluate(() => TopicRegistry.current().id);
  tapResult = (after !== before) ? `TAPPED OK (topic ${before} -> ${after})` : `CLICK DISPATCHED BUT TOPIC UNCHANGED (${before})`;
} catch (e) {
  tapResult = 'TAP FAILED: ' + String(e.message).split('\n')[0];
}
console.log('\n[real tap on #tnnext at 360px] ' + tapResult);

// annotated screenshot: outline the topicnav + mark the viewport edge
await p.evaluate(() => {
  const tn = document.getElementById('topicnav');
  tn.style.outline = '3px solid red';
  const nx = document.getElementById('tnnext');
  nx.style.outline = '3px solid orange';
  const edge = document.createElement('div');
  edge.style.cssText = `position:fixed;top:0;bottom:0;left:${window.innerWidth - 2}px;width:2px;background:red;z-index:99999`;
  document.body.appendChild(edge);
});
await p.screenshot({ path: `${S}/topicnav-clipped-360-annotated.png` });
console.log('shot: topicnav-clipped-360-annotated.png');
await b.close();
