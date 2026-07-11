// Isolate: does a cold deep-link to #kafka-internals/viz survive on its own?
// (no overlay clicking, no interference)
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const R = {};
const snap = (p, label) => p.evaluate((l) => ({
  at: l,
  hash: location.hash,
  curTopic: TopicRegistry.current() && TopicRegistry.current().id,
  kitMounted: !!window.__VIZ,
}), label);

for (const target of ['#kafka-internals/viz', '#kafka-internals/walk', '#kafka-internals/drill']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL + target, { waitUntil: 'load' });
  const seq = [];
  await p.waitForTimeout(300); seq.push(await snap(p, '+300ms'));
  await p.waitForTimeout(1200); seq.push(await snap(p, '+1.5s'));
  await p.waitForTimeout(1500); seq.push(await snap(p, '+3s'));
  R[target] = seq;
  await p.close();
}
console.log(JSON.stringify(R, null, 2));
await b.close();
