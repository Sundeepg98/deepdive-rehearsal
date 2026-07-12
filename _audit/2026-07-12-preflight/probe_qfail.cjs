/* Reproduce the EXACT preceding sequence from visual_pane_smoke (home flow -> topic nav ->
   goView viz), then watch the queue. When it fails, dump what the sim was actually doing. */
const { chromium } = require('playwright');
const B = require('../../test/_boot.cjs');
(async () => {
  const b = await chromium.launch(B.launchOpts());
  let fails = 0;
  const N = parseInt(process.argv[2] || '12', 10);
  for (let rep = 0; rep < N; rep++) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const perrs = []; p.on('pageerror', e => perrs.push(e.message.slice(0, 80)));
    await B.gotoApp(p, 'dist/index.html');
    await p.waitForFunction(() => !!document.querySelector('.ix-ov.open'), null, { timeout: 30000 }).catch(()=>{});
    await p.evaluate(async () => {
      const x0 = document.querySelector('.ix-x'); if (x0) x0.click();
      await new Promise(r => setTimeout(r, 350));
      document.getElementById('homeBtn').click();
      await new Promise(r => setTimeout(r, 350));
      const x = document.querySelector('.ix-x'); if (x) x.click();
      await new Promise(r => setTimeout(r, 350));
    });
    await p.evaluate(() => document.querySelector('.tn-trigger').click());
    await p.waitForTimeout(350);
    await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find(e => e.textContent.includes('Kafka Internals')).click());
    await p.waitForTimeout(700);
    await p.evaluate(() => window.goView('viz'));
    await p.waitForFunction(() => !!window.__VIZ, null, { timeout: 30000 }).catch(()=>{});
    const s1 = await p.evaluate(() => window.__VIZ ? { f: window.__VIZ.frames(), q: window.__VIZ.queues().reduce((a,c)=>a+c,0), lag: window.__VIZ.sim.totalLag() } : null);
    // watch for 20s, sampling the trajectory
    const traj = await p.evaluate((b0) => new Promise((res) => {
      const out = []; const t0 = Date.now();
      const t = setInterval(() => {
        if (!window.__VIZ) { out.push({ t: Date.now()-t0, gone: true }); clearInterval(t); return res(out); }
        const f = window.__VIZ.frames(), q = window.__VIZ.queues(), lag = window.__VIZ.sim.totalLag();
        const qs = q.reduce((a,c)=>a+c,0);
        out.push({ t: Date.now()-t0, df: f - b0.f, q: qs, lag: Math.round(lag), lanes: q.length, vis: !!document.getElementById('viz') && getComputedStyle(document.getElementById('viz')).display !== 'none' });
        if (qs > b0.q + 5 || Date.now()-t0 > 20000) { clearInterval(t); res(out); }
      }, 400);
    }), s1);
    const last = traj[traj.length - 1];
    const ok = last && last.q > (s1 ? s1.q : 0) + 5;
    if (!ok) {
      fails++;
      console.log(`\n*** rep ${rep}: QUEUE NEVER FILLED. s1=${JSON.stringify(s1)} pageErrors=${JSON.stringify(perrs.slice(0,2))}`);
      console.log('    trajectory (t, framesDelta, queueSum, lag, lanes, vizVisible):');
      traj.filter((_, i) => i % 6 === 0 || i === traj.length-1).forEach(x => console.log('      ' + JSON.stringify(x)));
    } else { process.stdout.write('.'); }
    await p.close();
  }
  await b.close();
  console.log(`\n=== queue-never-filled: ${fails} / ${N} ===`);
})();
