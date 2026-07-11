import { chromium } from 'playwright';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/content/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1400 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);

async function reveal(topic, name) {
  await p.evaluate(t => window.TopicRegistry.setTopic(t), topic);
  await p.waitForTimeout(400);
  await p.click('[data-tab="drill"]');
  await p.waitForTimeout(500);
  // tier notes line
  const tn = await p.evaluate(() => {
    const el = document.querySelector('#drill .tiernote, #drill .tier-note, #drill [class*="tiernote"]');
    return el ? (el.textContent || '').trim() : '(no tiernote el)';
  });
  // click reveal
  const btn = await p.$('#drill button:has-text("Reveal answer"), #drill .reveal, #drill [class*="reveal"]');
  if (btn) { await btn.click(); await p.waitForTimeout(600); }
  const m = await p.evaluate(() => {
    const d = document.getElementById('drill');
    const txt = (d.innerText || '');
    // look for follow-up / senior blocks
    const fu = d.querySelectorAll('[class*="follow"],[class*="fup"],.f, [class*="probe-f"]');
    const sr = d.querySelectorAll('[class*="senior"],[class*="tell"]');
    return {
      chars: txt.length,
      hasFollowUp: /follow|they push|probe deeper/i.test(txt),
      hasSenior: /senior|the tell|signal/i.test(txt),
      fEls: fu.length, srEls: sr.length,
      tail: txt.slice(-420).replace(/\n+/g, ' | ')
    };
  });
  await p.locator('#drill').screenshot({ path: SHOT + name + '.png' });
  console.log(`\n### ${topic}`);
  console.log(`  tierNote: ${tn.slice(0, 90)}`);
  console.log(`  revealed chars=${m.chars}  followUpEls=${m.fEls}  seniorEls=${m.srEls}`);
  console.log(`  tail: ${m.tail.slice(0, 300)}`);
}

await reveal('signing', 'drill-REVEALED-ORIG-signing');
await reveal('idempotency', 'drill-REVEALED-MD-idempotency');
await reveal('caching', 'drill-REVEALED-MD-caching');
await b.close();
