// Sanity-check the lens's headline "boot is layout-bound, not byte-bound" (the premise that
// justifies P3 being only P3). 5 cold runs.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const rows = [];
for (let i = 0; i < 5; i++) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  const t = await p.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return {
      responseEnd: Math.round(n.responseEnd),          // whole 5.16MB read off disk
      domInteractive: Math.round(n.domInteractive),
      domContentLoaded: Math.round(n.domContentLoadedEventEnd),
      load: Math.round(n.loadEventEnd),
      fcp: fcp ? Math.round(fcp.startTime) : null,
    };
  });
  rows.push(t);
  console.log(`run ${i + 1}:`, JSON.stringify(t));
  await b.close();
}
const med = k => { const v = rows.map(r => r[k]).filter(x => x != null).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
console.log('\nMEDIANS: responseEnd', med('responseEnd'), '| domInteractive', med('domInteractive'), '| load', med('load'), '| FCP', med('fcp'));
console.log('responseEnd = time to read all 5,163,186 bytes off disk. If it is tiny vs domInteractive,');
console.log('boot is NOT byte-bound and the lens\'s P3 deprioritisation is justified.');
