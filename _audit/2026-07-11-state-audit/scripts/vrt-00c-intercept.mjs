import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1000);

// What is on top at the sys button's center?
const diag = await p.evaluate(() => {
  const btn = document.querySelector('.sidebar .seg button[data-tab="sys"]');
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  const stack = document.elementsFromPoint(cx, cy).map(e => e.tagName + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''));
  // any full-screen overlays?
  const overlays = [...document.body.querySelectorAll('*')].filter(e => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
    const b = e.getBoundingClientRect();
    return b.width >= innerWidth * 0.9 && b.height >= innerHeight * 0.9 && cs.pointerEvents !== 'none';
  }).map(e => ({ tag: e.tagName, id: e.id, cls: String(e.className).slice(0, 60), z: getComputedStyle(e).zIndex, pe: getComputedStyle(e).pointerEvents }));
  return { btnRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, topEl: top ? top.tagName + '#' + top.id + '.' + String(top.className) : null, stack: stack.slice(0, 5), overlays };
});
console.log(JSON.stringify(diag, null, 2));
await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/firstload-1280.png' });
await b.close();
