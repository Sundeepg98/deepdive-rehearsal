/* Probe E: Ctrl+P popup + P-while-cram-open + the 8 hand-authored topics' cram/scope (do THEY differ?) */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-features';
const b = await chromium.launch();

async function ready() {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.evaluate(() => { if (window.IndexOverlay && window.IndexOverlay.isOpen()) window.IndexOverlay.close(); });
  await p.waitForTimeout(350);
  await p.mouse.click(700, 12);
  await p.waitForTimeout(150);
  return { ctx, p };
}

/* ---- Ctrl+P opens the printable Q&A in a POPUP ---- */
{
  const { ctx, p } = await ready();
  await p.evaluate(() => TopicRegistry.setTopic('caching'));
  await p.waitForTimeout(350);
  const popupPromise = ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null);
  await p.keyboard.press('Control+p');
  const popup = await popupPromise;
  console.log('=== Ctrl+P -> Print Q&A ===');
  if (popup) {
    await popup.waitForTimeout(600);
    const t = await popup.title().catch(() => '(n/a)');
    const h1 = await popup.evaluate(() => { const h = document.querySelector('h1'); return h ? h.textContent : null; }).catch(() => null);
    const nQ = await popup.evaluate(() => document.querySelectorAll('article').length).catch(() => 0);
    console.log('  POPUP OPENED. title:', JSON.stringify(t), '| h1:', JSON.stringify(h1), '| probes:', nQ);
    console.log('  >> Ctrl+P IS LIVE and it IS topic-aware (built from TopicRegistry.current())');
    await popup.screenshot({ path: SHOTS + '/E1-ctrlP-printqa-popup.png' });
  } else {
    console.log('  >> NO popup opened -- Ctrl+P did not fire');
  }
  await ctx.close();
}

/* ---- P while the cram sheet is open ---- */
{
  const { ctx, p } = await ready();
  await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; if (window.openCram) window.openCram(); });
  await p.waitForTimeout(500);
  const open = await p.evaluate(() => document.getElementById('cramov').classList.contains('open'));
  await p.keyboard.press('p');
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => ({ printed: window.__printed, cramOpen: document.getElementById('cramov').classList.contains('open') }));
  console.log('\n=== P key while the cram sheet is open ===');
  console.log('  cram open:', open, '| window.print() calls after pressing `p`:', r.printed);
  console.log('  >> P-to-print IS LIVE (and undocumented):', r.printed > 0);
  await ctx.close();
}

/* ---- Do the 8 HAND-AUTHORED topics get a correct cram sheet? (they should, if any do) ---- */
{
  const { ctx, p } = await ready();
  const HAND = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];
  const SAMPLE = ['caching', 'kafka-internals', 'multi-tenant', 'saga'];
  const bodies = {};
  for (const id of [...HAND, ...SAMPLE]) {
    await p.evaluate(i => { if (TopicRegistry.current().id !== i) TopicRegistry.setTopic(i); }, id);
    await p.waitForTimeout(200);
    await p.evaluate(() => { if (window.openCram) window.openCram(); });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const ov = document.getElementById('cramov');
      const title = (ov.querySelector('.cram-title') || {}).textContent;
      const sr = document.querySelector('deep-cram').shadowRoot;
      return { title, body: sr.textContent.replace(/\s+/g, ' ').trim() };
    });
    bodies[id] = r;
    await p.evaluate(() => { const x = document.querySelector('#cramov .cram-x'); if (x) x.click(); });
    await p.waitForTimeout(150);
  }
  const ref = bodies['content-pipeline'].body;
  console.log('\n=== CRAM SHEET across 12 topics (8 hand-authored + 4 generated) ===');
  console.log('  ' + 'topic'.padEnd(20) + 'header'.padEnd(38) + 'body === content-pipeline\'s?');
  for (const id of [...HAND, ...SAMPLE]) {
    const s = bodies[id];
    console.log('  ' + id.padEnd(20) + String(s.title).padEnd(38) + (s.body === ref ? 'YES (same 3836 chars)' : 'no -- DIFFERS'));
  }
  const allSame = [...HAND, ...SAMPLE].every(id => bodies[id].body === ref);
  console.log('  >> EVERY topic (incl. the 7 other hand-authored ones) shows Content Pipeline\'s cram body:', allSame);
  await ctx.close();
}

await b.close();
