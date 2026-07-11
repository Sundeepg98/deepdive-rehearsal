import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 844 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' }); await p.waitForTimeout(900);
const x = await p.$('.ix-ov.open .ix-x'); if (x) { await x.click(); await p.waitForTimeout(400); }
await p.click('#tntrigger'); await p.waitForTimeout(400);
await p.evaluate(() => { const it = [...document.querySelectorAll('.tn-item')]; let bst = null, L = 0; for (const i of it) { const n = i.querySelector('.tn-i-name')?.textContent.trim() || ''; if (n.length > L) { L = n.length; bst = i; } } bst?.click(); });
await p.waitForTimeout(900);

const r = await p.evaluate(() => {
  const cta = document.querySelector('.sidebar .mockcta');
  const fab = document.querySelector('#toolsfab');
  const cs = getComputedStyle(cta);
  const cr = cta.getBoundingClientRect(), fr = fab.getBoundingClientRect();
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  // hit-test a grid of points along the bar's vertical centre, ACROSS the visible screen
  const y = Math.round(cr.top + cr.height / 2);
  const probes = [];
  for (const px of [20, 100, 200, 300, 380, 420, 429]) {
    const el = document.elementFromPoint(px, y);
    probes.push({ x: px, hit: el ? (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '.' + (el.className || '').toString().split(' ')[0])) : null });
  }
  // is the Tools button reachable by ANY point on screen?
  let toolsReachable = false;
  for (let px = 0; px < vw; px += 5) for (const yy of [y - 20, y, y + 20]) {
    const el = document.elementFromPoint(px, yy);
    if (el && (el.id === 'toolsfab' || el.closest?.('#toolsfab'))) toolsReachable = true;
  }
  return {
    viewport: { vw, vh }, icb: window.innerWidth,
    mockcta: { top: +cr.top.toFixed(0), left: +cr.left.toFixed(0), width: +cr.width.toFixed(0), height: +cr.height.toFixed(0), display: cs.display, opacity: cs.opacity, visibility: cs.visibility, position: cs.position },
    toolsfab: { left: +fr.left.toFixed(0), right: +fr.right.toFixed(0), width: +fr.width.toFixed(0) },
    barProbeY: y, probes,
    TOOLS_BUTTON_REACHABLE_ANYWHERE_ON_SCREEN: toolsReachable,
    canPanRight: (() => { const before = window.scrollX; window.scrollTo(9999, 0); const after = window.scrollX; window.scrollTo(before, 0); return after > before; })(),
  };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
