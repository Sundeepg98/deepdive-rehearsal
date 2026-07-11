/* Visual confirmation that the Numbers-pane clip is USER-VISIBLE (not an invisible child). */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
await p.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.keyboard.press('Escape');           // dismiss the first-run topic-index overlay
await p.waitForTimeout(500);

const state = await p.evaluate(() => ({
  overlayOpen: !!document.querySelector('.ix-ov.open'),
  activeTab: document.querySelector('.sidebar .seg button.on').dataset.tab,
  paneOn: document.querySelector('.pane.on').id
}));
console.log('state:', JSON.stringify(state));

// scroll the Numbers pane into view
await p.evaluate(() => document.querySelector('deep-numbers').scrollIntoView({ block: 'center' }));
await p.waitForTimeout(400);
await p.screenshot({ path: SHOTS + '/num-1280-storage-engines-CLIPPED.png' });

// Which child actually overflows the .nrow content box?
const who = await p.evaluate(() => {
  const sr = document.querySelector('deep-numbers').shadowRoot;
  const row = [...sr.querySelectorAll('.nrow')].find(r => r.scrollWidth - r.clientWidth > 100);
  if (!row) return null;
  const rr = row.getBoundingClientRect();
  const rightEdge = rr.right - parseFloat(getComputedStyle(row).paddingRight);
  const kids = [];
  row.querySelectorAll('*').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width === 0) return;
    kids.push({
      sel: e.className || e.tagName.toLowerCase(),
      text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 44),
      left: Math.round(r.left), right: Math.round(r.right),
      pastRowEdge: Math.round(r.right - rightEdge),
      ws: getComputedStyle(e).whiteSpace, w: Math.round(r.width)
    });
  });
  return { rowRight: Math.round(rightEdge), rowScrollW: row.scrollWidth, rowClientW: row.clientWidth, kids: kids.sort((a, b2) => b2.pastRowEdge - a.pastRowEdge) };
});
console.log('\n=== which child overflows the .nrow content box? ===');
console.log(JSON.stringify(who, null, 1));
await b.close();
