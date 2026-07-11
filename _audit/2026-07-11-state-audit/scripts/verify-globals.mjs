import { chromium } from 'playwright';
const b = await chromium.launch();
// baseline: an EMPTY file:// page — same context type as the app
const bp = await b.newPage();
await bp.goto('file:///D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_blank.html');
const base = await bp.evaluate(() => Object.getOwnPropertyNames(window));
await bp.close();

const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1800);
const g = await p.evaluate((base) => {
  const s = new Set(base);
  return Object.getOwnPropertyNames(window).filter(k => !s.has(k));
}, base);
console.log('BASELINE (blank file:// page) globals:', base.length);
console.log('APP-OWNED top-level globals        :', g.length);
console.log('  TOPIC_* :', g.filter(x=>x.startsWith('TOPIC_')).length);
console.log('  non-TOPIC:', g.length - g.filter(x=>x.startsWith('TOPIC_')).length);
console.log('  sample non-TOPIC:', g.filter(x=>!x.startsWith('TOPIC_')).slice(0,18));
await b.close();
