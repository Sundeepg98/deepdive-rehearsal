import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(URL + '#api-design/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);

const r = await p.evaluate(() => {
  const de = document.documentElement;
  const sw = () => de.scrollWidth;
  const vw = de.clientWidth;
  const tn = document.getElementById('topicnav');
  const out = { vw, baseline: sw(), tnW: +tn.getBoundingClientRect().width.toFixed(1) };

  // children of #topicnav and their measured + min-content widths
  out.children = [...tn.children].map(c => {
    const b = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    return {
      sel: c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).split(' ')[0] : ''),
      w: +b.width.toFixed(1), pos: cs.position, display: cs.display,
      flex: cs.flex, minW: cs.minWidth, hidden: c.hasAttribute('hidden'),
      scrollW: c.scrollWidth
    };
  });

  // hide each child in turn, measure doc scrollWidth
  out.hideEach = [];
  for (const c of [...tn.children]) {
    const prev = c.style.display;
    c.style.display = 'none';
    out.hideEach.push({
      sel: c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (c.className ? '.' + String(c.className).split(' ')[0] : ''),
      docScrollW: sw(), tnW: +tn.getBoundingClientRect().width.toFixed(1)
    });
    c.style.display = prev;
  }

  // THE candidate fix: min-width:0 on #topicnav itself (it is a flex ITEM of .side-id)
  tn.style.minWidth = '0';
  out.fix_minwidth0_on_topicnav = { docScrollW: sw(), tnW: +tn.getBoundingClientRect().width.toFixed(1) };
  tn.style.minWidth = '';

  // alt fix: flex-wrap on the nav
  tn.style.flexWrap = 'wrap';
  out.fix_flexwrap = { docScrollW: sw(), tnW: +tn.getBoundingClientRect().width.toFixed(1) };
  tn.style.flexWrap = '';

  // what is .side-id doing?
  const si = document.querySelector('.side-id');
  const sics = getComputedStyle(si);
  out.sideId = { display: sics.display, wrap: sics.flexWrap, w: +si.getBoundingClientRect().width.toFixed(1), scrollW: si.scrollWidth, padding: sics.padding };
  const tncs = getComputedStyle(tn);
  out.topicnavCS = { display: tncs.display, flexBasis: tncs.flexBasis, minWidth: tncs.minWidth, flexShrink: tncs.flexShrink, gap: tncs.gap, wrap: tncs.flexWrap };

  // measure min-content width of #topicnav via a probe clone
  const probe = tn.cloneNode(true);
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:min-content;';
  probe.removeAttribute('hidden');
  document.body.appendChild(probe);
  out.topicnavMinContent = +probe.getBoundingClientRect().width.toFixed(1);
  probe.remove();

  return out;
});
console.log(JSON.stringify(r, null, 2));
await b.close();
