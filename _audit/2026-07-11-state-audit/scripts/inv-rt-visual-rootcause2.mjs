// Root cause, take 2. First disambiguate why the mount-wrapper never fired,
// then measure the pane's layout state AT the moment the viz route activates.
import { chromium } from 'playwright';
import fs from 'fs';

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

const out = {};

// ---- (1) Is VisualKit.mount even writable? (explains the empty probe) -------
out.descriptor = await p.evaluate(() => {
  const d = Object.getOwnPropertyDescriptor(window.VisualKit, 'mount');
  const before = window.VisualKit.mount;
  try { window.VisualKit.mount = function () { return 'HIJACKED'; }; } catch (e) { /* strict would throw */ }
  const after = window.VisualKit.mount;
  return {
    hasGetter: !!(d && d.get), hasValue: !!(d && d.value),
    writable: d ? d.writable : null, configurable: d ? d.configurable : null,
    assignmentTook: before !== after,
  };
});

// ---- (2) Has the kit mounted yet, on a fresh load with no viz route? --------
out.mountedOnLoad = await p.evaluate(() => ({
  vizInstanceExists: !!window.__VIZ,
  canvasExists: !!(document.querySelector('deep-visual') &&
                   document.querySelector('deep-visual').shadowRoot.querySelector('canvas')),
  hash: window.location.hash,
}));

// ---- (3) Go to kafka-internals but STAY on walk (viz not yet active) -------
await p.evaluate(() => {
  const it = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals'));
  if (it) it.click();
});
await p.waitForTimeout(800);
out.beforeVizRoute = await p.evaluate(() => {
  const pane = document.querySelector('deep-visual');
  const cs = getComputedStyle(pane);
  return {
    vizInstanceExists: !!window.__VIZ,
    canvasExists: !!pane.shadowRoot.querySelector('canvas'),
    paneDisplay: cs.display, paneVisibility: cs.visibility,
    paneHiddenAttr: pane.hasAttribute('hidden'),
    paneClientW: pane.clientWidth, paneOffsetW: pane.offsetWidth,
    hash: window.location.hash,
  };
});

// ---- (4) THE MOMENT OF TRUTH: capture the pane's layout DURING the
//          routechange that activates viz (deep-visual's own listener, which
//          calls _mount(), was registered first, so ours runs right after it,
//          in the same dispatch, with the same layout the kit saw). ----------
out.atMount = await p.evaluate(() => new Promise((resolve) => {
  window.addEventListener('routechange', function once(e) {
    const d = e.detail || {};
    const id = d.view || (d.route && d.route.id) || d.id;
    if (id !== 'viz') return;
    window.removeEventListener('routechange', once);
    const pane = document.querySelector('deep-visual');
    const cs = getComputedStyle(pane);
    const c = pane.shadowRoot.querySelector('canvas');
    resolve({
      note: 'read inside the SAME routechange dispatch, immediately after deep-visual._mount() ran',
      paneDisplay: cs.display,
      paneHiddenAttr: pane.hasAttribute('hidden'),
      paneClientW: pane.clientWidth,
      paneOffsetW: pane.offsetWidth,
      canvasClientW: c ? c.clientWidth : 'no canvas',
      canvasParentClientW: c && c.parentElement ? c.parentElement.clientWidth : null,
      canvasAttrs: c ? c.width + 'x' + c.height : null,
    });
  });
  window.goView('viz');
}));

// ---- (5) settled state, one second later, no resize event -------------------
await p.waitForTimeout(1200);
out.settled = await p.evaluate(() => {
  const pane = document.querySelector('deep-visual');
  const cs = getComputedStyle(pane);
  const c = pane.shadowRoot.querySelector('canvas');
  return {
    paneDisplay: cs.display,
    paneClientW: pane.clientWidth,
    canvasClientW: c.clientWidth, canvasClientH: c.clientHeight,
    canvasParentClientW: c.parentElement.clientWidth,
    canvasAttrs: c.width + 'x' + c.height,
    cssBoxH: +c.getBoundingClientRect().height.toFixed(1),
  };
});

out.errs = errs;
console.log(JSON.stringify(out, null, 2));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/inv-rootcause2.json', JSON.stringify(out, null, 2));
await b.close();
