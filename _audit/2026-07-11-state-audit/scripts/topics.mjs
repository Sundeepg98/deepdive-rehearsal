import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
const t = await p.evaluate(() => ({
  ids: typeof TopicRegistry !== 'undefined' ? TopicRegistry.ids() : null,
  current: typeof TopicRegistry !== 'undefined' ? TopicRegistry.current()?.id : null,
  count: typeof TopicRegistry !== 'undefined' ? TopicRegistry.ids().length : 0
}));
console.log(JSON.stringify(t, null, 2));
await b.close();
