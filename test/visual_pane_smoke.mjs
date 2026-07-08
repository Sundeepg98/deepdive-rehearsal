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
const boot = await p.evaluate(() => {
  const vz = document.querySelector('button[data-tab="viz"]');
  const leaks = [...document.querySelectorAll('[hidden]')].filter((e) => e.offsetWidth > 0)
    .map((e) => (e.id || e.className || e.tagName).toString().slice(0, 24));
  return { vizW: vz.offsetWidth, vizDisp: getComputedStyle(vz).display,
    ixOpen: !!document.querySelector('.ix-ov.open'), home: !!document.getElementById('homeBtn'), leaks };
});
chk('viz tab INVISIBLE (computed) on a topic without a visual', boot.vizW === 0 && boot.vizDisp === 'none', JSON.stringify(boot));
chk('FIRST-RUN boot opens the start screen (index overlay)', boot.ixOpen === true, 'ixOpen=' + boot.ixOpen);
chk('every [hidden] element is actually invisible (page invariant)', boot.leaks.length === 0, boot.leaks.join(','));
chk('Home button present in the chrome', boot.home === true, 'homeBtn missing');
const homeFlow = await p.evaluate(async () => {
  const x0 = document.querySelector('.ix-x'); if (x0) x0.click();          // close the first-run screen
  await new Promise((r) => setTimeout(r, 350));
  const closedFirst = !document.querySelector('.ix-ov.open');
  document.getElementById('homeBtn').click();                               // Home reopens it on demand
  await new Promise((r) => setTimeout(r, 350));
  const opened = !!document.querySelector('.ix-ov.open');
  const x = document.querySelector('.ix-x'); if (x) x.click();
  await new Promise((r) => setTimeout(r, 350));
  return { closedFirst, opened, closed: !document.querySelector('.ix-ov.open') };
});
chk('start screen closable; Home reopens; close works', homeFlow.closedFirst && homeFlow.opened && homeFlow.closed, JSON.stringify(homeFlow));

await p.evaluate(() => document.querySelector('.tn-trigger').click());
await p.waitForTimeout(350);
await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals')).click());
await p.waitForTimeout(700);
const vzOn = await p.evaluate(() => document.querySelector('button[data-tab="viz"]').offsetWidth);
chk('viz tab APPEARS (computed) on Kafka Internals', vzOn > 0, 'w=' + vzOn);

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
  hidden: document.querySelector('button[data-tab="viz"]').offsetWidth === 0,
  route: ((location.hash || '').replace('#', '').split('/')[1] || (location.hash || '').replace('#', '').split('/')[0]),
}));
chk('switching to a viz-less topic disposes the kit', after.viz === false, JSON.stringify(after));
chk('...hides the tab and bounces off the viz route', after.hidden === true && after.route !== 'viz', JSON.stringify(after));
chk('zero page errors across the whole flow', errs.length === 0, errs.slice(0, 3).join(' | '));

// ---- returning-user branch: progress exists now, a reload boots into the app
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(1800);
const back = await p.evaluate(() => ({ ixOpen: !!document.querySelector('.ix-ov.open'), topic: (location.hash || '').slice(1, 30) }));
chk('RETURNING boot lands in the app (progress saved, no overlay)', back.ixOpen === false, JSON.stringify(back));
// ---- mobile context: same guarantees at 390px --------------------------------
const m = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const merrs = []; m.on('pageerror', (e) => merrs.push(e.message.slice(0, 100)));
await m.goto('file://' + FILE, { waitUntil: 'load' });
await m.waitForTimeout(2000);
const mb = await m.evaluate(() => ({
  ixOpen: !!document.querySelector('.ix-ov.open'),
  vizW: document.querySelector('button[data-tab="viz"]').offsetWidth,
  homeBox: (() => { const r = document.getElementById('homeBtn').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
  stepBox: (() => { const r = document.querySelector('.tn-step:not(.tn-home)').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
}));
chk('MOBILE first-run boot: start screen opens, no stray viz tab', mb.ixOpen === true && mb.vizW === 0, JSON.stringify(mb));
await m.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
await m.waitForTimeout(400);
const mClosed = await m.evaluate(() => !document.querySelector('.ix-ov.open'));
chk('MOBILE start screen closable (44px close)', mClosed, 'still open');
chk('MOBILE tap targets >= 44px (home + steppers)', mb.homeBox[0] >= 44 && mb.homeBox[1] >= 44 && mb.stepBox[0] >= 44 && mb.stepBox[1] >= 44, JSON.stringify(mb));
chk('MOBILE zero page errors', merrs.length === 0, merrs.join(' | '));
await m.close();
await b.close();
console.log(fails === 0 ? 'VISUAL PIPELINE SMOKE: ALL PASS' : 'SMOKE: ' + fails + ' FAILURE(S)');
process.exit(fails ? 1 : 0);
