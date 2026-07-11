import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /start|continue|begin/i.test(x.textContent || '') && x.offsetParent !== null); if (g) g.click(); });
await p.waitForTimeout(300);
await p.evaluate(() => TopicRegistry.setTopic('idempotency'));
await p.waitForTimeout(300);
await p.evaluate(() => { const btn = [...document.querySelectorAll('button,a')].find(x => /mixed\s*fire/i.test(x.textContent || '')); if (btn) btn.click(); });
await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const ov = document.getElementById('mixov');
  const walk = (el, d) => {
    if (d > 4) return [];
    let out = [(' '.repeat(d * 2)) + '<' + el.tagName.toLowerCase() + (el.id ? ' id=' + el.id : '') + (el.className && typeof el.className === 'string' ? ' class="' + el.className + '"' : '') + '>' + (el.shadowRoot ? '  [SHADOW ROOT]' : '')];
    if (el.shadowRoot) for (const c of el.shadowRoot.children) out = out.concat(walk(c, d + 1).map(s => '  ' + s));
    for (const c of el.children) out = out.concat(walk(c, d + 1));
    return out;
  };
  return { open: ov.classList.contains('open'), tree: walk(ov, 0).slice(0, 30).join('\n') };
}));
await b.close();
