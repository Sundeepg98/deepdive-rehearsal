/* How many FRAMES (not milliseconds) does the queue need to build past 5?
   If that number is stable across idle vs loaded, the sim is frame-driven and the correct
   wait is on FRAMES -- which makes the check independent of machine speed. */
const { chromium } = require('playwright');
const B = require('../../test/_boot.cjs');
const TAG = process.argv[2] || 'idle';
(async () => {
  const b = await chromium.launch(B.launchOpts());
  for (let rep = 0; rep < 3; rep++) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await B.gotoApp(p, 'dist/index.html', { hash: '#kafka-internals/viz' });
    await p.waitForFunction(() => !!window.__VIZ, null, { timeout: 60000 });
    const s1 = await p.evaluate(() => ({ f: window.__VIZ.frames(), q: window.__VIZ.queues().reduce((a,c)=>a+c,0), lag: window.__VIZ.sim.totalLag() }));
    const t0 = Date.now();
    const r = await p.evaluate((b0) => new Promise((res) => {
      const t = setInterval(() => {
        const f = window.__VIZ.frames(), q = window.__VIZ.queues().reduce((a,c)=>a+c,0), lag = window.__VIZ.sim.totalLag();
        if (q > b0.q + 5) { clearInterval(t); res({ ok: true, dFrames: f - b0.f, q, lag }); }
        if (f - b0.f > 6000) { clearInterval(t); res({ ok: false, dFrames: f - b0.f, q, lag }); }
      }, 50);
    }), s1);
    console.log(`[${TAG} ${rep}] q>5 reached=${r.ok}  after dFrames=${r.dFrames}  wallclock=${Date.now()-t0}ms  q=${r.q} lag=${r.lag.toFixed(0)}`);
    await p.close();
  }
  await b.close();
})();
