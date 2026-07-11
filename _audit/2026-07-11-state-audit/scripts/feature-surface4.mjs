import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/feature-surface';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 980 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(400);

// Run a FULL mock on Content Pipeline and score it 6/6
await p.evaluate(() => openMock());
await p.waitForTimeout(500);
await p.evaluate(() => {
  for (let i = 0; i < 12; i++) { const n = mockRoot.getElementById('mbnext'); if (n) n.click(); }
});
await p.waitForTimeout(400);
await p.evaluate(() => { const s = mockRoot.getElementById('mbscore'); s.querySelector('[data-s="6"]').click(); });
await p.waitForTimeout(300);
const cpMock = await p.evaluate(() => ({ topic: TopicRegistry.current().id, mockRuns, mockLastScore, stored: Store.get('mock.last') }));
// the clock keeps ticking on the end screen? (renderMockEnd uses clearInterval on a rAF handle)
const clock1 = await p.evaluate(() => document.getElementById('mockclock').textContent);
await p.waitForTimeout(2500);
const clock2 = await p.evaluate(() => document.getElementById('mockclock').textContent);
await p.evaluate(() => closeMock());
await p.waitForTimeout(400);

// Switch to a COMPLETELY different topic and open Session progress
await p.evaluate(() => TopicRegistry.setTopic('multi-tenant'));
await p.waitForTimeout(700);
await p.click('#sessopen');
await p.waitForTimeout(700);
const bleed = await p.evaluate(() => {
  const r = document.querySelector('deep-session').shadowRoot;
  const cards = [...r.querySelectorAll('.ss-card')].map(c => ({
    h: c.querySelector('.ss-h')?.textContent.trim(),
    stat: c.querySelector('.ss-stat')?.textContent.replace(/\s+/g, ' ').trim(),
  }));
  return { topic: TopicRegistry.current().id, cards, code: r.getElementById('sscode')?.value };
});
await p.screenshot({ path: `${S}/EVIDENCE-mock-bleeds-across-topics.png` });

console.log(JSON.stringify({ cpMock, mockClockOnEndScreen: { at0: clock1, after2_5s: clock2 }, bleed }, null, 2));
await b.close();
