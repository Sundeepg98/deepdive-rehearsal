// Is the coaching rail actually VISIBLE? (impact check for the cmpNote-leak finding)
import { chromium } from 'playwright';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const b = await chromium.launch();

for (const [label, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(700);
  // reproduce the leak: content-pipeline/sys -> switch to caching, stay on sys
  await p.evaluate(() => TopicRegistry.setTopic('content-pipeline'));
  await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="sys"]').click());
  await p.waitForTimeout(400);
  await p.evaluate(() => TopicRegistry.setTopic('caching'));
  await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    const pick = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const cs = getComputedStyle(el), rect = el.getBoundingClientRect();
      // walk up to see if an ancestor hides it
      let node = el, hiddenBy = null;
      while (node && node !== document.body) {
        const s = getComputedStyle(node);
        if (s.display === 'none' || s.visibility === 'hidden' || node.hidden) { hiddenBy = node.tagName + '.' + node.className; break; }
        node = node.parentElement;
      }
      return { text: el.textContent.slice(0, 80), w: Math.round(rect.width), h: Math.round(rect.height), display: cs.display, hiddenBy };
    };
    return {
      header: document.querySelector('.hdr h1').textContent,
      deskView: pick('cmpView'), deskNote: pick('cmpNote'), deskMove: pick('cmpMove'),
      mobView: pick('mCmpView'), mobNote: pick('mCmpNote'),
    };
  });
  console.log(`\n=== ${label} ${vp.width}x${vp.height} ===`);
  console.log('header topic:', r.header);
  console.log('cmpView :', JSON.stringify(r.deskView));
  console.log('cmpNote :', JSON.stringify(r.deskNote));
  console.log('cmpMove :', JSON.stringify(r.deskMove));
  console.log('mCmpView:', JSON.stringify(r.mobView));
  await p.screenshot({ path: `${OUT}/shots/verify-inv-topics/rail-leak-${label}.png`, fullPage: false });
  await p.close();
}
await b.close();
