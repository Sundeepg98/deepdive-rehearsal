import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME, args:['--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push('PE:' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CE:' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const simOk = await p.evaluate(() => !!window.__SIM && !!document.getElementById('view'));
const rect = await p.evaluate(() => {
  const r = document.getElementById('view').getBoundingClientRect();
  return { x: Math.ceil(r.x), y: Math.ceil(r.y), width: Math.floor(r.width), height: Math.floor(r.height) };
});
const lag1 = await p.evaluate(() => window.__SIM.totalLag());
await p.screenshot({ path: '_shot_a.png', clip: rect });
await p.waitForTimeout(1500);
const lag2 = await p.evaluate(() => window.__SIM.totalLag());
const frames = await p.evaluate(() => window.__frames);
await p.screenshot({ path: '_shot_b.png', clip: rect });
await p.evaluate(() => { window.__SIM.setConsumerCount(5); });
await p.waitForTimeout(300);
const status2 = await p.evaluate(() => window.__SIM.status());
console.log('sim exposed:', simOk, '| canvas:', rect.width + 'x' + rect.height,
  '| frames:', frames, '| lag:', lag1.toFixed(1), '->', lag2.toFixed(1),
  '| after group change:', status2, '| errors:', errs.length);
errs.slice(0, 5).forEach(e => console.log('  ' + e));
await b.close();
const ok = simOk && frames > 20 && lag2 > lag1 + 20 && status2 === 'REBALANCING' && errs.length === 0;
process.exit(ok ? 0 : 1);
