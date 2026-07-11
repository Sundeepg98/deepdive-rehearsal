import { chromium } from 'playwright';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/content/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// Invoke the REAL renderer functions (mxCurve / mxProbe) on real topic data
const r = await p.evaluate(() => {
  const R = window.TopicRegistry;
  const res = {};
  const run = (id) => {
    R.setTopic(id);
    const t = R.get(id), bank = (t.data || {}).bank || {}, drill = (t.data || {}).drill || {};
    const cb = (bank.curveballs || [])[0];
    const card = (drill.cards || [])[0];
    const o = {};
    if (typeof mxCurve === 'function' && cb) {
      const h = mxCurve(cb);
      o.curvePromptHasUndefined = /undefined/.test(h.prompt);
      o.curvePromptTail = String(h.prompt).slice(-150);
    }
    if (typeof mxProbe === 'function' && card) {
      const h = mxProbe(card);
      o.probeRevealHasEmptySenior = /class="sl">What sounds senior here<\/div><\/div>/.test(h.reveal);
      o.probeFollowUps = (h.reveal.match(/Interviewer pushes further/g) || []).length;
      o.probeRevealTail = String(h.reveal).slice(-130);
    }
    return o;
  };
  res.md_idempotency = run('idempotency');
  res.md_caching = run('caching');
  res.orig_signing = run('signing');
  return res;
});
console.log(JSON.stringify(r, null, 1));

// visual proof: render the md curveball prompt into the page and shoot it
await p.evaluate(() => {
  const R = window.TopicRegistry; R.setTopic('idempotency');
  const cb = R.get('idempotency').data.bank.curveballs[0];
  const h = mxCurve(cb);
  const d = document.createElement('div');
  d.id = '_proof';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;padding:28px;font:16px/1.6 system-ui;overflow:auto;color:#111';
  d.innerHTML = '<h2 style="font:700 20px system-ui;margin:0 0 6px">Mixed Fire &rarr; mxCurve(idempotency.curveballs[0]).prompt</h2>'
    + '<p style="color:#666;margin:0 0 18px">The real renderer, real topic data. Note the literal "undefined" where <code>cb.task</code> should be.</p>'
    + '<div style="border:2px solid #dc2626;border-radius:10px;padding:18px;background:#fef2f2">' + h.prompt + '</div>';
  document.body.appendChild(d);
});
await p.waitForTimeout(400);
await p.screenshot({ path: SHOT + 'mixfire-UNDEFINED-proof.png' });
console.log('\nshot: ' + SHOT + 'mixfire-UNDEFINED-proof.png');
await b.close();
