/* What ACTUALLY causes the 6px horizontal overflow at 390px, and is the tnmenu clipped? */
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-tools';
const OUT = {};
const log = (k, v) => { OUT[k] = v; console.log('::' + k + ':: ' + JSON.stringify(v)); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1300);
await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
await p.waitForTimeout(600);

// overflow-x settings + who is wider than the viewport, with the MENU STILL HIDDEN
log('menuHiddenState', await p.evaluate(() => ({
  tnmenuHidden: document.getElementById('tnmenu').hidden,
  htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
  bodyOverflowX: getComputedStyle(document.body).overflowX,
  innerWidth: window.innerWidth,
  docScrollWidth: document.documentElement.scrollWidth,
})));

const offenders = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.right > window.innerWidth + 0.5) {
      out.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50) || null,
        right: Math.round(r.right),
        width: Math.round(r.width),
        overflowPx: Math.round(r.right - window.innerWidth),
      });
    }
  });
  return out.sort((a, b) => b.overflowPx - a.overflowPx).slice(0, 12);
});
log('overflowingElements_MENU_HIDDEN', offenders);

// now open the menu and see if the set changes
await p.click('#tntrigger');
await p.waitForTimeout(600);
const withMenu = await p.evaluate(() => {
  const m = document.getElementById('tnmenu');
  const r = m.getBoundingClientRect();
  // is the overhang actually visible, or clipped by an ancestor's overflow?
  const probeX = window.innerWidth - 2;   // 388, inside viewport
  const outsideX = 393;                   // beyond the viewport edge
  return {
    menuRight: Math.round(r.right),
    innerWidth: window.innerWidth,
    overflowRightPx: Math.round(r.right - window.innerWidth),
    docScrollWidth: document.documentElement.scrollWidth,
    hOverflowWithMenu: document.documentElement.scrollWidth > window.innerWidth,
    // did opening the menu CHANGE the document width at all?
    elementAtViewportRightEdge: (() => { const e = document.elementFromPoint(probeX, Math.round(r.top + 20)); return e ? (e.id || e.className || e.tagName) : null; })(),
    canPanNow: (() => { const b = window.scrollX; window.scrollTo(9999, 0); const a = window.scrollX; window.scrollTo(b, 0); return a > b; })(),
    // clipping ancestors
    clippingAncestors: (() => {
      const acc = []; let n = m.parentElement;
      while (n && n !== document.documentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflowX !== 'visible' || cs.overflow !== 'visible') {
          acc.push({ sel: (n.id || n.className || n.tagName), overflow: cs.overflow, overflowX: cs.overflowX });
        }
        n = n.parentElement;
      }
      return acc;
    })(),
  };
});
log('withMenuOpen', withMenu);
await p.screenshot({ path: `${SHOTS}/hoverflow-menu-open.png` });

await browser.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/verify-hoverflow.json', JSON.stringify(OUT, null, 2));
console.log('=== DONE ===');
