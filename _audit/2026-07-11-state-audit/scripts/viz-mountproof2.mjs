// Direct measurement: is the viz pane display:none at the instant _mount() runs?
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(900);

await p.evaluate(() => {
  window.__probe = [];
  const Ctor = customElements.get('deep-visual');
  const orig = Ctor.prototype._mount;
  Ctor.prototype._mount = function () {
    const paneEl = this.parentElement;                 // the .pane wrapper (#viz)
    const host = this.shadowRoot.getElementById('vzhost');
    window.__probe.push({
      phase: 'ENTERING _mount()',
      paneId: paneEl && paneEl.id,
      paneClass: paneEl && paneEl.className,
      paneDisplay: paneEl ? getComputedStyle(paneEl).display : null,
      paneOffsetWidth: paneEl ? paneEl.offsetWidth : null,
      shadowHostClientW: host ? host.clientWidth : null,   // <-- what resize() will read
      thisOffsetW: this.offsetWidth,
    });
    const r = orig.apply(this, arguments);
    const c = host && host.querySelector('canvas');
    window.__probe.push({
      phase: 'AFTER scene build',
      canvasBackingStore: c ? [c.width, c.height] : null,
      canvasClient: c ? [c.clientWidth, c.clientHeight] : null,
    });
    // and one tick later, once the view transition has swapped the pane in:
    setTimeout(() => {
      window.__probe.push({
        phase: '+250ms (view transition finished)',
        paneDisplay: paneEl ? getComputedStyle(paneEl).display : null,
        paneOffsetWidth: paneEl ? paneEl.offsetWidth : null,
        canvasBackingStore: c ? [c.width, c.height] : null,
        canvasClient: c ? [c.clientWidth, c.clientHeight] : null,
        note: 'pane is now visible but NOTHING re-ran resize() -> canvas stays 0x0',
      });
    }, 250);
    return r;
  };
});
await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.close) window.IndexOverlay.close(); });
await p.evaluate(() => { TopicRegistry.setTopic('kafka-internals'); });
await p.waitForTimeout(300);
await p.evaluate(() => window.goView('viz'));
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => window.__probe), null, 2));
await b.close();
