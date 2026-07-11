/* rt-console VERIFY 07 — CAUSAL test of FINDING 2's root cause.
   ORIGINAL claim: the bounce misfires because TopicRegistry.setTopic() defers the
     `deeptopicchange` event through a ViewTransition (topic-protocol.js:114), so the
     setTimeout(...,0) fires before renderTopic() sees the deep-linked topic's data.
   MY claim: TopicRegistry.setTopic() is NEVER CALLED. Router.init() is deferred to
     DOMContentLoaded (src/index.html:174-179), while deep-visual's connectedCallback ->
     renderTopic(bootTopic.visual = null) -> setTimeout(bounce, 0) is queued during the
     SYNCHRONOUS app.js evaluation. The timer macrotask beats DOMContentLoaded, so the
     bounce rewrites the hash BEFORE the router has ever parsed the deep link.

   EXPERIMENT: suppress any Router.navigate() that happens BEFORE Router.init() has run.
   If my claim holds, the deep link then resolves perfectly (topic AND view preserved)
   -- proving the bounce, firing pre-init, is the sole destroyer. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const SUPPRESS = `
let _R;
Object.defineProperty(window, 'Router', {
  configurable: true,
  get() { return _R; },
  set(v) {
    _R = v;
    window.__inited = false;
    window.__suppressed = [];
    const nav = v.navigate, init = v.init;
    v.navigate = function (...a) {
      if (!window.__inited) { window.__suppressed.push(a[0]); return; }   // drop the pre-init bounce
      return nav.apply(this, a);
    };
    v.init = function (...a) { const r = init.apply(this, a); window.__inited = true; return r; };
  }
});
`;

const CASES = ['#kafka-internals/viz', '#saga/viz'];
const b = await chromium.launch();

for (const suppress of [false, true]) {
  console.log(`\n############ ${suppress ? 'TREATMENT: pre-init Router.navigate() SUPPRESSED' : 'CONTROL: stock app'} ############`);
  for (const hash of CASES) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    if (suppress) await ctx.addInitScript(SUPPRESS);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL + hash, { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const dv = document.querySelector('deep-visual');
      const root = dv && dv.shadowRoot;
      const c = root && root.querySelector('canvas');
      return {
        hash: location.hash,
        topic: TopicRegistry.current().id,
        h1: document.querySelector('.hdr h1').textContent,
        pane: (document.querySelector('.pane.on') || {}).id,
        canvas: c ? c.width + 'x' + c.height : 'none',
        suppressed: window.__suppressed || null,
      };
    });
    console.log(`  ${hash.padEnd(24)} -> hash=${r.hash.padEnd(24)} topic=${r.topic.padEnd(18)} pane=${(r.pane||'-').padEnd(6)} canvas=${r.canvas}` +
                (r.suppressed ? `  [suppressed navigate(${r.suppressed.join(',')})]` : '') +
                (errs.length ? `  ERRORS: ${errs.join('|')}` : ''));
    await ctx.close();
  }
}
await b.close();
