// Clean evidence shots: dismiss the topic-index overlay first.
import { chromium } from 'playwright';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-topics';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(800);

// dismiss any open overlay
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
const stillOpen = await p.evaluate(() => [...document.querySelectorAll('.open')].map(e => e.id).filter(Boolean));
if (stillOpen.length) {
  await p.evaluate(() => { document.querySelectorAll('.cram-x,.mock-x,.idx-x,[class*="-x"]').forEach(x => { const ov = x.closest('.open'); if (ov) x.click(); }); });
  await p.waitForTimeout(300);
}
console.log('overlays still open after dismiss:', await p.evaluate(() => [...document.querySelectorAll('.open')].map(e => e.id).filter(Boolean)));

async function shot(topic, tab, name) {
  await p.evaluate(i => TopicRegistry.setTopic(i), topic);
  await p.evaluate(t => document.querySelector(`.sidebar .seg button[data-tab="${t}"]`).click(), tab);
  await p.waitForTimeout(600);
  // expand pivot disclosures so the empty .pa body is visible
  await p.evaluate(() => {
    const el = document.querySelector('deep-system-map');
    if (el) el.shadowRoot.querySelectorAll('details.piv').forEach(d => { d.open = true; });
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  const m = await p.evaluate(() => {
    const el = document.querySelector('deep-system-map');
    if (!el) return null;
    const r = el.shadowRoot, chain = r.getElementById('smChain');
    return { stg: r.querySelectorAll('.stg').length, chainH: Math.round(chain.getBoundingClientRect().height) };
  });
  console.log(`${name}: ${JSON.stringify(m)}`);
}

await shot('caching', 'sys', 'CLEAN-sys-markdown-caching');
await shot('content-pipeline', 'sys', 'CLEAN-sys-legacy-content-pipeline');
await shot('saga', 'sys', 'CLEAN-sys-markdown-saga-spurious-jump');
await b.close();
