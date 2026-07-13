/* The viz pane returned exactly 1 node in all 12 contexts. Is that a clean pane, or a
   surface axe simply cannot see (a canvas with no accessible fallback)? */
import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2200);
await page.evaluate(() => document.querySelectorAll('[role=dialog].open,.ix-ov.open').forEach(o => o.classList.remove('open','vis')));
await page.evaluate(() => { window.location.hash = '#viz'; });
await page.waitForTimeout(2500);
const d = await page.evaluate(() => {
  const pane = document.getElementById('viz');
  const deep = (root, acc = []) => { for (const el of root.querySelectorAll('*')) { acc.push(el); if (el.shadowRoot) deep(el.shadowRoot, acc); } return acc; };
  const all = deep(pane);
  const canvases = all.filter(e => e.tagName === 'CANVAS').map(e => ({
    w: e.width, h: e.height, role: e.getAttribute('role'), ariaLabel: e.getAttribute('aria-label'),
    fallbackText: (e.textContent || '').trim().slice(0, 60), hidden: e.getAttribute('aria-hidden'),
  }));
  const textNodes = all.filter(e => !e.children.length && (e.textContent || '').trim().length > 1);
  return {
    paneVisible: getComputedStyle(pane).display !== 'none',
    totalEls: all.length,
    canvases,
    textNodeCount: textNodes.length,
    sampleText: textNodes.slice(0, 6).map(e => e.tagName + ': ' + e.textContent.trim().slice(0, 34)),
    imgs: all.filter(e => e.tagName === 'IMG').length,
    svgs: all.filter(e => e.tagName === 'svg' || e.tagName === 'SVG').length,
  };
});
console.log(JSON.stringify(d, null, 2));
await b.close();
