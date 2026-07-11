// Is the viz tab hidden-by-design (only for topics with a visual), or broken?
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/code-health';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);

const onDefault = await p.evaluate(() => {
  const v = document.querySelector('button[data-tab="viz"]');
  return { exists: !!v, hidden: v ? v.hidden : null, display: v ? getComputedStyle(v).display : null };
});
console.log('viz tab on DEFAULT topic:', JSON.stringify(onDefault));

// Navigate to kafka-internals (the ONE topic with a visual)
await p.goto(URL + '#/kafka-internals/walk', { waitUntil: 'load' });
await p.waitForTimeout(2000);
const onKafka = await p.evaluate(() => {
  const v = document.querySelector('button[data-tab="viz"]');
  return { exists: !!v, hidden: v ? v.hidden : null, display: v ? getComputedStyle(v).display : null };
});
console.log('viz tab on kafka-internals:', JSON.stringify(onKafka));

if (onKafka.exists && !onKafka.hidden) {
  const before = errors.length;
  await p.click('button[data-tab="viz"]');
  await p.waitForTimeout(3000);
  const canvas = await p.evaluate(() => {
    const c = document.querySelector('#viz canvas');
    return c ? { w: c.width, h: c.height, ctx: !!c.getContext('webgl2') } : 'NO CANVAS';
  });
  console.log('viz pane after click -> canvas:', JSON.stringify(canvas));
  console.log('errors during viz mount:', errors.length - before);
  await p.screenshot({ path: `${SHOTS}/viz-kafka.png` });
}
console.log('TOTAL errors:', errors.length);
errors.slice(0, 5).forEach((e) => console.log('  ERR:', e.slice(0, 140)));
await b.close();
