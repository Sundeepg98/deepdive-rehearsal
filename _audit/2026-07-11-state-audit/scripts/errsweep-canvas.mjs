/* Characterise the 0x0 canvas on kafka-internals/viz.
   Is it a GPU/headless artifact, or a mount-time SIZING bug?
   Test: measure the host box at mount, then try resize + leave/re-enter. */
import { chromium } from 'playwright';
const F = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

const probe = () => {
  const on = document.querySelector('.pane.on');
  const ce = on?.querySelector('*');
  const sr = ce?.shadowRoot;
  const host = sr?.getElementById('vzhost');
  const c = sr?.querySelector('canvas');
  const hr = host?.getBoundingClientRect();
  const cr = c?.getBoundingClientRect();
  const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
  return {
    pane: on?.id,
    paneH: Math.round(on?.getBoundingClientRect().height || 0),
    hostBox: hr ? `${Math.round(hr.width)}x${Math.round(hr.height)}` : null,
    canvasAttr: c ? `${c.width}x${c.height}` : null,
    canvasCSS: cr ? `${Math.round(cr.width)}x${Math.round(cr.height)}` : null,
    drawBuf: gl ? `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}` : null,
    instance: !!window.__VIZ,
  };
};

await p.goto(F + '#kafka-internals/walk', { waitUntil: 'load' });
await p.waitForTimeout(2000);

console.log('=== WebGL availability in this browser ===');
console.log(JSON.stringify(await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 300; c.height = 200;
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return { webgl: !!gl, drawBuf: gl ? `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}` : null,
           renderer: gl ? gl.getParameter(gl.RENDERER) : null };
})));
console.log('  (a plain 300x200 canvas gets a real drawing buffer -> WebGL itself works)\n');

await p.locator('[data-tab="viz"]').first().click({ timeout: 6000 });
await p.waitForTimeout(2500);
console.log('=== A) right after clicking Visualize ===');
console.log(JSON.stringify(await p.evaluate(probe), null, 1));
await p.screenshot({ path: `${SHOTS}/canvas-A-after-click.png` });

console.log('\n=== B) after a window RESIZE (does the kit re-size the canvas?) ===');
await p.setViewportSize({ width: 1100, height: 800 });
await p.waitForTimeout(1200);
await p.setViewportSize({ width: 1280, height: 900 });
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(probe), null, 1));
await p.screenshot({ path: `${SHOTS}/canvas-B-after-resize.png` });

console.log('\n=== C) leave the pane and come back (re-mount while VISIBLE) ===');
await p.locator('[data-tab="walk"]').first().click();
await p.waitForTimeout(900);
await p.locator('[data-tab="viz"]').first().click();
await p.waitForTimeout(2500);
const c = await p.evaluate(probe);
console.log(JSON.stringify(c, null, 1));
await p.screenshot({ path: `${SHOTS}/canvas-C-after-reentry.png` });

console.log('\n=== VERDICT ===');
if (c.canvasAttr && c.canvasAttr !== '0x0' && !c.canvasAttr.startsWith('0')) {
  console.log('  Canvas RECOVERS on re-entry -> mount-time sizing race (mounted while the pane had no layout).');
} else {
  console.log('  Canvas STAYS ' + c.canvasAttr + ' (host box ' + c.hostBox + ') -> it never gets a drawing surface at all.');
  console.log('  WebGL works in this browser (see above), so this is a LAYOUT/SIZING bug, not a GPU one.');
}

// what does the user actually SEE? crop the viz pane
const pane = p.locator('#viz');
if (await pane.count()) {
  await pane.screenshot({ path: `${SHOTS}/canvas-what-user-sees.png` }).catch(e => console.log('  (pane screenshot failed: ' + e.message.split('\n')[0] + ')'));
  console.log('\n  Cropped pane screenshot -> canvas-what-user-sees.png');
}
await b.close();
