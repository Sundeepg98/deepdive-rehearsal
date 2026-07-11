// DECISIVE counterfactual for finding #2's mechanism.
// Intercept customElements.define BEFORE the bundle runs, so we can patch
// DeepVisual.prototype.renderTopic to omit ONLY the bounce-to-walk guard.
// If the deep-link then survives, the bounce is the cause. Nothing else changes.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const out = {};

const PATCH = `
  window.__RT = [];
  const _def = customElements.define.bind(customElements);
  customElements.define = function (name, ctor, opts) {
    if (name === 'deep-visual') {
      const proto = ctor.prototype;
      proto.renderTopic = function (d) {                    // source minus the bounce
        window.__RT.push({ hasData: !!d, active: !!this._active, t: Math.round(performance.now()) });
        this._data = d || null;
        var btn = document.querySelector('.seg button[data-tab="viz"], button[data-tab="viz"]');
        if (btn) btn.hidden = !d;
        if (this._empty) this._empty.hidden = !!d;
        /* >>> BOUNCE GUARD DELIBERATELY OMITTED <<< */
        if (this._active) this._mount();
      };
    }
    return _def(name, ctor, opts);
  };
`;

// A: bounce REMOVED, deep-link to viz
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(PATCH);
  await p.goto(BASE + '#kafka-internals/viz', { waitUntil: 'load' });
  await p.waitForTimeout(2800);
  out.A_bounceRemoved = await p.evaluate(() => ({
    endHash: location.hash,
    topic: TopicRegistry.current().id,
    kitMounted: !!window.__VIZ,
    renderTopicCalls: window.__RT,
    activePane: [...document.querySelectorAll('.pane.on')].map((e) => e.id),
  }));
  await ctx.close();
}

// B: control -- same run, bounce INTACT (patch records calls but keeps the guard)
{
  const CONTROL = PATCH.replace('/* >>> BOUNCE GUARD DELIBERATELY OMITTED <<< */',
    `var self = this; if (!d && this._active) setTimeout(function(){ if(!self._data && self._active && window.goView) window.goView('walk'); },0);`);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(CONTROL);
  await p.goto(BASE + '#kafka-internals/viz', { waitUntil: 'load' });
  await p.waitForTimeout(2800);
  out.B_bounceIntact = await p.evaluate(() => ({
    endHash: location.hash,
    topic: TopicRegistry.current().id,
    kitMounted: !!window.__VIZ,
    renderTopicCalls: window.__RT,
    activePane: [...document.querySelectorAll('.pane.on')].map((e) => e.id),
  }));
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_inv-viz-bounce2.json', JSON.stringify(out, null, 1));
