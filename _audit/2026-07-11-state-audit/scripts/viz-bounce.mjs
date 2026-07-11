// Confirm the deep-link mechanism: the viz-less BOUNCE in visual-pane.js fires
// during boot against the SEED topic, before the router applies the hash topic.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

// Trace every goView call + the topic at that instant, from before boot completes.
await p.addInitScript(() => {
  window.__trace = [];
  let gv = null;
  Object.defineProperty(window, 'goView', {
    configurable: true,
    get() { return gv; },
    set(fn) {
      gv = function (v) {
        window.__trace.push({
          call: 'goView(' + v + ')',
          curTopic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null,
          hash: location.hash,
        });
        return fn.apply(this, arguments);
      };
    },
  });
});
await p.goto(URL + '#kafka-internals/viz', { waitUntil: 'load' });
await p.waitForTimeout(2500);
const R = await p.evaluate(() => ({
  seedTopic_firstRegistered: '(the topic current() returns before any nav)',
  sortedFirstTopic_ids0: TopicRegistry.ids()[0],
  finalHash: location.hash,
  finalTopic: TopicRegistry.current().id,
  kafkaHasVisual: !!TopicRegistry.get('kafka-internals').data.visual,
  contentPipelineHasVisual: !!TopicRegistry.get('content-pipeline').data.visual,
  goViewTrace: window.__trace,
}));
console.log(JSON.stringify(R, null, 2));
await b.close();
