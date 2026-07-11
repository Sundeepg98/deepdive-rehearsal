/* keybody reachability under browser zoom (WCAG 1.4.4). Opens the overlay with the `?` shortcut
   so it works at any viewport. Also re-checks the peer overlay bodies for the same viewports. */
import { chromium } from 'playwright';
import path from 'node:path';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/a11y';
const b = await chromium.launch();

for (const [label, w, h] of [['100% zoom', 1280, 800], ['150% zoom', 853, 533], ['200% zoom', 640, 400], ['laptop 1366x768', 1366, 768], ['laptop 1280x700', 1280, 700]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear());
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => window.IndexOverlay.close());
  await p.waitForTimeout(500);
  await p.keyboard.press('?');                    // documented shortcut: opens keyboard overlay
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const el = document.getElementById('keybody');
    const ov = document.getElementById('keyov');
    if (!el) return null;
    return {
      overlayOpen: ov.classList.contains('open'),
      hidden: el.scrollHeight - el.clientHeight,
      sh: el.scrollHeight, ch: el.clientHeight,
      tabIndex: el.tabIndex, role: el.getAttribute('role'),
      innerFocusables: el.querySelectorAll('button,a[href],input,[tabindex]:not([tabindex="-1"])').length,
      focusablesInWholeOverlay: [...ov.querySelectorAll('button,a[href],input,textarea,select,[tabindex]:not([tabindex="-1"])')].filter(e => e.offsetParent !== null).map(e => e.id || e.className),
    };
  });
  if (!r || !r.overlayOpen) { console.log(`${label.padEnd(16)} (${w}x${h}): overlay did not open`); await p.close(); continue; }
  const pct = ((r.hidden / r.sh) * 100).toFixed(0);
  const verdict = r.hidden > 0 ? (r.tabIndex >= 0 || r.innerFocusables > 0 ? 'reachable' : '*** UNREACHABLE BY KEYBOARD ***') : 'no overflow';
  const vp = (w + 'x' + h).padEnd(9);
  console.log(`${label.padEnd(16)} (${vp}): #keybody hides ${String(r.hidden).padStart(4)}px of ${r.sh}px (${pct.padStart(2)}% of the shortcut list)  tabIndex=${r.tabIndex} role=${r.role}  -> ${verdict}`);
  console.log(`                              focusables in the ENTIRE open overlay: ${JSON.stringify(r.focusablesInWholeOverlay)}`);
  if (w === 640) await p.screenshot({ path: path.join(SHOTS, '98-keybody-200pct-zoom.png') });
  if (w === 1280 && h === 700) await p.screenshot({ path: path.join(SHOTS, '99-keybody-1280x700.png') });
  await p.close();
}
await b.close();
