/* Is #_index-overlay really covering the app at boot on a fresh profile? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2200);

const look = async label => {
  const d = await p.evaluate(() => {
    const el = document.getElementById('_index-overlay');
    if (!el) return { exists: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const tab = document.querySelector('[data-tab="num"]');
    const tr = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(tr.left + tr.width / 2), Math.round(tr.top + tr.height / 2));
    return {
      exists: true,
      className: el.className,
      isOpenAPI: window.IndexOverlay ? window.IndexOverlay.isOpen() : 'n/a',
      display: cs.display, opacity: cs.opacity, visibility: cs.visibility,
      pointerEvents: cs.pointerEvents, zIndex: cs.zIndex, position: cs.position,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      hitAtNumTab: hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') : null,
      innerHTMLLen: el.innerHTML.length,
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(d, null, 1));
  return d;
};

await look('FRESH BOOT (no prior localStorage)');
await p.screenshot({ path: `${SHOTS}/idxov-fresh-boot.png` });

// Can a REAL user click the Numbers tab on a fresh boot? (no force)
const clicked = await p.locator('[data-tab="num"]').first().click({ timeout: 4000 }).then(() => true).catch(e => e.message.split('\n')[0]);
console.log('\nREAL click on [data-tab="num"] at fresh boot ->', clicked === true ? 'SUCCESS' : 'FAILED: ' + clicked);
await p.waitForTimeout(800);
const after = await p.evaluate(() => document.querySelector('.pane.on')?.id);
console.log('pane after click:', after);
await p.screenshot({ path: `${SHOTS}/idxov-after-tab-click.png` });

// Now OPEN and CLOSE the index overlay and re-check the lingering .open class
await p.evaluate(() => window.IndexOverlay.open());
await p.waitForTimeout(500);
await look('AFTER IndexOverlay.open()');
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(80);   // BEFORE the 220ms hideTimer fires
await look('80ms AFTER close()  (hideTimer not yet fired)');
await p.waitForTimeout(400);  // after the timer
await look('480ms AFTER close() (hideTimer fired)');

await b.close();
