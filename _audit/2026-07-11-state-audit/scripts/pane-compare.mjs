import { chromium } from 'playwright';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/content/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
// dismiss the boot topic-index overlay
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
await p.evaluate(() => { document.querySelectorAll('.ix-ov,.ov,[role="dialog"]').forEach(e => { e.classList.remove('open', 'vis'); }); });
await p.waitForTimeout(300);

async function shot(topic, pane, name) {
  await p.evaluate(t => window.TopicRegistry.setTopic(t), topic);
  await p.waitForTimeout(400);
  await p.click(`[data-tab="${pane}"]`);
  await p.waitForTimeout(700);
  const m = await p.evaluate(pn => {
    const el = document.getElementById(pn);
    const txt = (el.innerText || '').trim();
    return { chars: txt.length, h: Math.round(el.getBoundingClientRect().height), first: txt.slice(0, 200).replace(/\n+/g, ' | ') };
  }, pane);
  await p.locator('#' + pane).screenshot({ path: SHOT + name + '.png' }).catch(async () => { await p.screenshot({ path: SHOT + name + '.png', fullPage: false }); });
  console.log(`  ${String(topic).padEnd(24)} ${pane.padEnd(6)} chars=${String(m.chars).padStart(5)} h=${String(m.h).padStart(4)}  :: ${m.first.slice(0, 110)}`);
  return m;
}

console.log('--- SYS pane (System Map) ---');
await shot('signing', 'sys', 'sys-ORIG-signing');
await shot('idempotency', 'sys', 'sys-MD-idempotency');
await shot('caching', 'sys', 'sys-MD-caching');
await shot('storage-engines', 'sys', 'sys-MD-storage-engines');

console.log('--- MODEL pane (Model Answers) ---');
await shot('signing', 'model', 'model-ORIG-signing');
await shot('idempotency', 'model', 'model-MD-idempotency');

console.log('--- DRILL pane ---');
await shot('signing', 'drill', 'drill-ORIG-signing');
await shot('idempotency', 'drill', 'drill-MD-idempotency');

console.log('--- RF pane (Red Flags) ---');
await shot('signing', 'rf', 'rf-ORIG-signing');
await shot('idempotency', 'rf', 'rf-MD-idempotency');

console.log('--- TRADE pane ---');
await shot('signing', 'trade', 'trade-ORIG-signing');
await shot('idempotency', 'trade', 'trade-MD-idempotency');

console.log('--- NUM pane (storage-engines: 1/5 dynamic) ---');
await shot('storage-engines', 'num', 'num-MD-storage-engines');

// ---- measure every topic's sys + model pane rendered chars ----
console.log('\n=== RENDERED CHARS, every topic, sys+model ===');
const ids = await p.evaluate(() => window.TopicRegistry.ids());
const ORIG = new Set(['content-pipeline', 'signing', 'authz', 'notifications', 'iac', 'aws-hardening', 'desired-state', 'eav']);
const res = [];
for (const id of ids) {
  await p.evaluate(t => window.TopicRegistry.setTopic(t), id);
  await p.waitForTimeout(120);
  const r = { id, orig: ORIG.has(id) };
  for (const pane of ['sys', 'model', 'drill']) {
    await p.click(`[data-tab="${pane}"]`).catch(() => { });
    await p.waitForTimeout(90);
    r[pane] = await p.evaluate(pn => {
      const el = document.getElementById(pn);
      return (el.innerText || '').trim().length;
    }, pane);
  }
  res.push(r);
}
const O = res.filter(r => r.orig), M = res.filter(r => !r.orig);
const avg = (a, k) => Math.round(a.reduce((s, x) => s + x[k], 0) / a.length);
console.log(`ORIG(8)  sys=${avg(O, 'sys')}  model=${avg(O, 'model')}  drill=${avg(O, 'drill')}`);
console.log(`MD(38)   sys=${avg(M, 'sys')}  model=${avg(M, 'model')}  drill=${avg(M, 'drill')}`);
console.log('\nthinnest rendered sys panes:');
res.sort((a, b) => a.sys - b.sys).slice(0, 6).forEach(r => console.log(`  ${r.id.padEnd(24)} sys=${r.sys}  model=${r.model}`));
console.log('thinnest rendered model panes:');
res.sort((a, b) => a.model - b.model).slice(0, 6).forEach(r => console.log(`  ${r.id.padEnd(24)} model=${r.model}  sys=${r.sys}`));
await b.close();
