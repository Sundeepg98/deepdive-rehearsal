// Headless verification of the pilot. Proves mechanically:
//   renders + animates; sim live; rebalance triggers; queue stacks track lag;
//   slow-consumer skew lands on the right lanes; story mode drives the sim;
//   fps floor under load; zero console errors.
// It cannot judge aesthetics -- that is human-eye review (CLAUDE.md).
import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = []; p.on('pageerror', e => errs.push('PE:' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CE:' + m.text()); });
const url = 'file://' + process.cwd() + '/dist/index.html';
let fails = [];
const chk = (name, ok, detail) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : '  -- ' + detail)); if (!ok) fails.push(name); };

// --- 1. render + live sim + queue growth ------------------------------------
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(1500);
const rect = await p.evaluate(() => { const r = document.getElementById('view').getBoundingClientRect();
  return { x: Math.ceil(r.x), y: Math.ceil(r.y), width: Math.floor(r.width), height: Math.floor(r.height) }; });
const s1 = await p.evaluate(() => ({ lag: window.__SIM.totalLag(), q: window.__QUEUES().reduce((a, c) => a + c, 0), f: window.__frames }));
await p.screenshot({ path: '_shot_a.png', clip: rect });
await p.waitForTimeout(2000);
const s2 = await p.evaluate(() => ({ lag: window.__SIM.totalLag(), q: window.__QUEUES().reduce((a, c) => a + c, 0), f: window.__frames }));
await p.screenshot({ path: '_shot_b.png', clip: rect });
chk('renders: frames advancing', s2.f > s1.f + 20, 'f1=' + s1.f + ' f2=' + s2.f);
chk('sim live: lag grows (rate 120 > capacity 90)', s2.lag > s1.lag + 30, s1.lag.toFixed(0) + ' -> ' + s2.lag.toFixed(0));
chk('choreography: queue stacks grow with lag', s2.q > s1.q + 10, 'q1=' + s1.q + ' q2=' + s2.q);
chk('choreography: queued particles ~ lag/2 (msgs per particle), minus in-flight',
  2 * s2.q > s2.lag * 0.3 && 2 * s2.q < s2.lag + 60, '2q=' + 2 * s2.q + ' lag=' + s2.lag.toFixed(0));
await p.evaluate(() => { window.__SIM.setSinkCount(5); });
await p.waitForTimeout(300);
chk('rebalance: group change flips status', (await p.evaluate(() => window.__SIM.status())) === 'REBALANCING', '');
chk('rebalance: banner visible', await p.evaluate(() => document.getElementById('banner').style.display === 'block'), '');

// --- 2. slow-consumer skew lands on lanes 0 and 3 ---------------------------
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.evaluate(() => { window.__SIM.setProducerRate(60); window.__SIM.setSlowSink(0); });
await p.waitForTimeout(6000);
const q = await p.evaluate(() => window.__QUEUES());
const slowQ = q[0] + q[3], okQ = q[1] + q[2] + q[4] + q[5];
chk('skew: slow consumer backs up ITS lanes (0,3) only', slowQ > 4 * (okQ + 1), 'slow=' + slowQ + ' others=' + okQ + ' [' + q.join(',') + ']');

// --- 3. story mode drives the sim + captions --------------------------------
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.click('#story-spike');
await p.waitForTimeout(1500);
const cap1 = await p.evaluate(() => document.getElementById('caption').textContent);
const f1 = await p.evaluate(() => window.__frames);
await p.waitForTimeout(2000);
const f2 = await p.evaluate(() => window.__frames);
await p.waitForTimeout(6800);                       // past the t=9 step
const cap2 = await p.evaluate(() => document.getElementById('caption').textContent);
const consNow = await p.evaluate(() => window.__SIM.state.sinks);
const disabled = await p.evaluate(() => document.getElementById('spike').disabled);
chk('story: captions present and advancing', cap1.length > 10 && cap2.length > 10 && cap1 !== cap2, JSON.stringify([cap1.slice(0, 30), cap2.slice(0, 30)]));
chk('story: script drove the sim (consumers 3 -> 4 at t=9)', consNow === 4, 'consumers=' + consNow);
chk('story: manual controls disabled during playback', disabled === true, '');
const fps = (f2 - f1) / 2;
chk('perf: fps under spike load >= 25 (headless floor)', fps >= 25, 'fps=' + fps.toFixed(1));
console.log('  info  fps under load (headless swiftshader): ' + fps.toFixed(1));

chk('zero console errors across all phases', errs.length === 0, errs.slice(0, 3).join(' | '));
await b.close();
console.log(fails.length === 0 ? 'PW VERIFY: ALL PASS' : 'PW VERIFY: ' + fails.length + ' FAILURE(S)');
process.exit(fails.length === 0 ? 0 : 1);
