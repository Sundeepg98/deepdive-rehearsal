// Root-cause instrumentation: WHY is clientWidth 0 at resize() time?
// The kit appends `wrap` to the host (kit.js:77) BEFORE buildScene (kit.js:81),
// so the canvas IS in the DOM. The zero must come from the pane not being laid out.
// We wrap VisualKit.mount to snapshot the world at the exact moment of mount.
import { chromium } from 'playwright';
import fs from 'fs';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-rt-visual-trainer';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push('CE:' + m.text()); });
p.on('pageerror', (e) => errs.push('PE:' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.keyboard.press('Escape').catch(() => {});
await p.waitForTimeout(200);

// Install the probe BEFORE the viz pane ever mounts.
await p.evaluate(() => {
  window.__PROBE = [];
  const orig = window.VisualKit.mount;
  window.VisualKit.mount = function (host, config) {
    const pane = document.querySelector('deep-visual');
    const paneCS = pane ? getComputedStyle(pane) : null;
    // walk up from the pane, recording display/visibility/width of every ancestor
    const anc = [];
    let n = pane;
    for (let i = 0; i < 8 && n && n !== document.documentElement; i++) {
      const cs = getComputedStyle(n);
      anc.push({
        tag: n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') +
             (n.className && typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/).join('.') : ''),
        display: cs.display,
        hidden: n.hasAttribute('hidden'),
        clientW: n.clientWidth,
        offsetW: n.offsetWidth,
      });
      n = n.parentElement;
    }
    window.__PROBE.push({
      when: 'AT MOUNT (before kit builds DOM)',
      hostClientW: host.clientWidth,      // #vzhost inside the shadow root
      hostOffsetW: host.offsetWidth,
      paneClientW: pane ? pane.clientWidth : null,
      paneDisplay: paneCS ? paneCS.display : null,
      paneHiddenAttr: pane ? pane.hasAttribute('hidden') : null,
      ancestors: anc,
    });
    const inst = orig.apply(this, arguments);
    // immediately AFTER mount: what did resize() end up producing?
    const c = host.querySelector('canvas');
    window.__PROBE.push({
      when: 'IMMEDIATELY AFTER mount() returned',
      canvasClientW: c ? c.clientWidth : null,
      canvasParentClientW: c && c.parentElement ? c.parentElement.clientWidth : null,
      canvasAttr: c ? c.width + 'x' + c.height : null,
      hostClientW: host.clientWidth,
    });
    return inst;
  };
  return 'probe installed';
});

// now navigate to kafka-internals -> viz
await p.evaluate(() => {
  const it = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals'));
  if (it) it.click();
});
await p.waitForTimeout(700);
await p.evaluate(() => window.goView && window.goView('viz'));
await p.waitForTimeout(1500);

const probe = await p.evaluate(() => window.__PROBE);

// A "one animation frame later" snapshot: is the pane laid out by then?
const afterRAF = await p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  return { canvasClientW: c.clientWidth, canvasClientH: c.clientHeight, parentClientW: c.parentElement.clientWidth };
});

console.log('=== PROBE (why is clientWidth 0 at resize time?) ===');
console.log(JSON.stringify(probe, null, 2));
console.log('\n=== SETTLED STATE (long after mount) ===');
console.log(JSON.stringify(afterRAF, null, 2));
console.log('\nerrors:', JSON.stringify(errs));

fs.writeFileSync(SHOTS + '/../../scripts/inv-rootcause-results.json', JSON.stringify({ probe, afterRAF, errs }, null, 2));
await b.close();
