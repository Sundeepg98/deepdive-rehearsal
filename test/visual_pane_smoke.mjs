// End-to-end smoke of the visual pipeline promise:
//   markdown ## Visual -> TOPIC_KI_VISUAL -> conditional tab -> mounted kit.
// Run: CHROME=<path> PLAYWRIGHT_BROWSERS_PATH=<dir> node test/visual_pane_smoke.mjs [file]
import { chromium } from 'playwright';
const FILE = process.argv[2] || process.cwd() + '/dist/index.html';
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 110)));
let fails = 0;
const chk = (n, ok, d) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok ? '' : ' -- ' + d)); if (!ok) fails++; };

await p.goto('file://' + FILE, { waitUntil: 'load' });
await p.waitForTimeout(2200);
const btnHidden1 = await p.evaluate(() => document.querySelector('button[data-tab="viz"]').hidden);
chk('viz tab hidden on a topic WITHOUT a visual (event-driven)', btnHidden1 === true, 'hidden=' + btnHidden1);

await p.evaluate(() => document.querySelector('.tn-trigger').click());
await p.waitForTimeout(350);
await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals')).click());
await p.waitForTimeout(700);
const btnHidden2 = await p.evaluate(() => document.querySelector('button[data-tab="viz"]').hidden);
chk('viz tab APPEARS on Kafka Internals (## Visual in its md)', btnHidden2 === false, 'hidden=' + btnHidden2);

await p.evaluate(() => window.goView('viz'));
await p.waitForTimeout(1400);
const s1 = await p.evaluate(() => window.__VIZ ? { f: window.__VIZ.frames(), q: window.__VIZ.queues().reduce((a, c) => a + c, 0), lag: window.__VIZ.sim.totalLag() } : null);
await p.waitForTimeout(1800);
const s2 = await p.evaluate(() => window.__VIZ ? { f: window.__VIZ.frames(), q: window.__VIZ.queues().reduce((a, c) => a + c, 0), lag: window.__VIZ.sim.totalLag() } : null);
chk('kit mounted from TOPIC config; frames advancing', !!s1 && !!s2 && s2.f > s1.f + 20, JSON.stringify([s1 && s1.f, s2 && s2.f]));
chk('sim live (lag grows at authored params 120 vs 90)', !!s2 && s2.lag > (s1 ? s1.lag : 0) + 20, s1 && s2 ? s1.lag.toFixed(0) + '->' + s2.lag.toFixed(0) : 'null');
chk('queue choreography live inside the app pane', !!s2 && s2.q > (s1 ? s1.q : 0) + 5, JSON.stringify([s1 && s1.q, s2 && s2.q]));

const storyBtn = await p.evaluate(() => {
  const host = document.querySelector('deep-visual');
  const btns = [...host.shadowRoot.querySelectorAll('button')].filter((b) => b.textContent.includes('Spike'));
  if (btns[0]) { btns[0].click(); return true; }
  return false;
});
await p.waitForTimeout(1200);
const cap = await p.evaluate(() => {
  const host = document.querySelector('deep-visual');
  const c = host.shadowRoot.querySelector('#caption');
  return c ? c.textContent : '';
});
chk('story from the MARKDOWN config runs with captions', storyBtn && cap.length > 10, JSON.stringify(cap.slice(0, 40)));

await p.evaluate(() => document.querySelector('.tn-trigger').click());
await p.waitForTimeout(300);
await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Event-Driven')).click());
await p.waitForTimeout(800);
const after = await p.evaluate(() => ({
  viz: !!window.__VIZ,
  hidden: document.querySelector('button[data-tab="viz"]').hidden,
  route: (location.hash || '').replace('#', '').split('/')[0],
}));
chk('switching to a viz-less topic disposes the kit', after.viz === false, JSON.stringify(after));
chk('...hides the tab and bounces off the viz route', after.hidden === true && after.route !== 'viz', JSON.stringify(after));
chk('zero page errors across the whole flow', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
console.log(fails === 0 ? 'VISUAL PIPELINE SMOKE: ALL PASS' : 'SMOKE: ' + fails + ' FAILURE(S)');
process.exit(fails ? 1 : 0);
