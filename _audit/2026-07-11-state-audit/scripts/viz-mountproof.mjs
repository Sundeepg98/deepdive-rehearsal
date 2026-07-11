// Prove WHY the canvas is 0x0: capture the host's layout size at mount time.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-trainer/';
const b = await chromium.launch();
const R = {};

// ---------- A. in-app: instrument VisualKit.mount ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    window.__probe = [];
    const orig = window.VisualKit.mount;
    window.VisualKit.mount = function (host, cfg) {
      const pane = document.querySelector('deep-visual');
      const paneEl = pane && pane.parentElement;
      window.__probe.push({
        when: 'AT MOUNT (before scene build)',
        hostClientW: host.clientWidth, hostClientH: host.clientHeight,
        paneOffsetW: pane ? pane.offsetWidth : null,
        paneParentClass: paneEl ? paneEl.className : null,
        paneParentDisplay: paneEl ? getComputedStyle(paneEl).display : null,
      });
      const inst = orig.call(this, host, cfg);
      const c = host.querySelector('canvas');
      window.__probe.push({ when: 'AFTER scene build', canvasAttr: [c.width, c.height] });
      return inst;
    };
  });
  await p.evaluate(() => { if (window.IndexOverlay) window.IndexOverlay.close(); TopicRegistry.setTopic('kafka-internals'); });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.goView('viz'));
  await p.waitForTimeout(1500);
  R.inAppMountProbe = await p.evaluate(() => window.__probe);
  await p.close();
}

// ---------- B. the STANDALONE pilot: does it work? ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/visual-trainer/kafka-lag-pilot.html', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  R.standalone = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { canvas: false };
    const r = c.getBoundingClientRect();
    return { canvas: true, attr: [c.width, c.height], rect: [Math.round(r.width), Math.round(r.height)] };
  });
  const c = await p.$('canvas');
  if (c) {
    await c.screenshot({ path: SHOTS + 'S-standalone-pilot-a.png' });
    await p.waitForTimeout(1500);
    await c.screenshot({ path: SHOTS + 'S-standalone-pilot-b.png' });
  }
  await p.screenshot({ path: SHOTS + 'S-standalone-full.png' });
  R.standalone.errors = errs;
  await p.close();
}

// ---------- C. mobile 390px, in-app ----------
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { if (window.IndexOverlay) window.IndexOverlay.close(); document.querySelectorAll('.ix-x').forEach(x => x.click()); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { TopicRegistry.setTopic('kafka-internals'); window.goView('viz'); });
  await p.waitForTimeout(1800);
  R.mobile = await p.evaluate(() => {
    const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { attr: [c.width, c.height], rect: [Math.round(r.width), Math.round(r.height)] };
  });
  await p.screenshot({ path: SHOTS + 'M-mobile-390-viz.png', fullPage: false });
  await p.close();
}
console.log(JSON.stringify(R, null, 2));
await b.close();
