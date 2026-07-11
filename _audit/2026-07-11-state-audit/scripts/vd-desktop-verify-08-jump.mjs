import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(() => { const o = document.getElementById('_index-overlay'); if (o) o.classList.remove('open', 'vis'); document.body.style.overflow = ''; });

// Cross-topic JUMP buttons live inside .pa. If .pa is empty on MD topics, the jump feature is GONE.
const out = [];
for (const t of ['event-driven', 'slos', 'caching', 'cdc', 'saga', 'content-pipeline', 'authz', 'signing']) {
  await p.evaluate(x => TopicRegistry.setTopic(x), t);
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="sys"]').click());
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const root = document.querySelector('deep-system-map').shadowRoot;
    const pivs = [...root.querySelectorAll('.piv')];
    return {
      pivots: pivs.length,
      jumpButtons: root.querySelectorAll('.piv-jump').length,
      emptyPa: pivs.filter(v => v.querySelector('.pa')?.textContent.trim() === '').length,
    };
  });
  out.push({ topic: t, ...r });
}
console.log('topic'.padEnd(20) + 'pivots  jumpBtns  emptyPa');
out.forEach(o => console.log(o.topic.padEnd(20) + String(o.pivots).padStart(6) + String(o.jumpButtons).padStart(10) + String(o.emptyPa).padStart(9)));
const md = out.slice(0, 5), hand = out.slice(5);
console.log('\nMD topics   : ' + md.reduce((a, o) => a + o.jumpButtons, 0) + ' jump buttons across ' + md.reduce((a, o) => a + o.pivots, 0) + ' pivots');
console.log('HAND topics : ' + hand.reduce((a, o) => a + o.jumpButtons, 0) + ' jump buttons across ' + hand.reduce((a, o) => a + o.pivots, 0) + ' pivots');
await b.close();
