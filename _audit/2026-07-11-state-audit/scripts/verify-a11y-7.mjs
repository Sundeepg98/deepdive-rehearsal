/* F3 SCOPE REFINEMENT: is the silent-reveal defect drill-only, or does it recur?
   Checks Mixed Fire (mixed-fire.js:85) — the same innerHTML answer injection. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-a11y';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.keyboard.press('Escape');
await p.waitForTimeout(500);

await p.evaluate(() => document.getElementById('mixopen').click());
await p.waitForTimeout(1000);

const before = await p.evaluate(() => {
  const ov = document.getElementById('mixov');
  const host = ov && ov.querySelector('deep-mixed-fire');
  const root = host && host.shadowRoot ? host.shadowRoot : ov;
  const rev = root.getElementById ? root.getElementById('mxrev') : root.querySelector('#mxrev');
  return {
    overlayOpen: ov ? ov.classList.contains('open') : false,
    usesShadow: !!(host && host.shadowRoot),
    revExists: !!rev,
    revText: rev ? (rev.textContent || '').trim().slice(0, 30) : null,
    revAriaLive: rev ? rev.getAttribute('aria-live') : null,
    revRole: rev ? rev.getAttribute('role') : null,
    docLive: [...document.querySelectorAll('[aria-live]')].map(e => (e.getAttribute('aria-live') + ':' + (e.textContent || '').trim().slice(0, 20)))
  };
});
console.log('MIXED FIRE — before reveal:', JSON.stringify(before, null, 1));
await p.screenshot({ path: SHOTS + '/mixfire-before.png' });

// click the reveal button wherever it lives
const clicked = await p.evaluate(() => {
  const ov = document.getElementById('mixov');
  const host = ov.querySelector('deep-mixed-fire');
  const root = host && host.shadowRoot ? host.shadowRoot : ov;
  const btns = [...root.querySelectorAll('button')];
  const rb = btns.find(x => /reveal/i.test(x.textContent || '') || /rev/i.test(x.id || ''));
  if (rb) { rb.click(); return rb.id || rb.textContent.trim().slice(0, 30); }
  return null;
});
console.log('clicked reveal control:', clicked);
await p.waitForTimeout(800);

const after = await p.evaluate(() => {
  const ov = document.getElementById('mixov');
  const host = ov.querySelector('deep-mixed-fire');
  const root = host && host.shadowRoot ? host.shadowRoot : ov;
  const rev = root.getElementById ? root.getElementById('mxrev') : root.querySelector('#mxrev');
  const ans = root.querySelector('.ans');
  const anc = [];
  let cur = ans || rev;
  while (cur) {
    anc.push({ sel: cur.id ? '#' + cur.id : (typeof cur.className === 'string' && cur.className ? '.' + String(cur.className).split(' ')[0] : (cur.tagName || cur.nodeName)), ariaLive: cur.getAttribute ? cur.getAttribute('aria-live') : null, role: cur.getAttribute ? cur.getAttribute('role') : null });
    cur = cur.parentElement || (cur.parentNode && cur.parentNode.host) || null;
    if (anc.length > 10) break;
  }
  return {
    revHasContentNow: rev ? (rev.textContent || '').trim().length > 0 : false,
    revText: rev ? (rev.textContent || '').trim().slice(0, 50) : null,
    revAriaLive: rev ? rev.getAttribute('aria-live') : null,
    revRole: rev ? rev.getAttribute('role') : null,
    ansFound: !!ans,
    ancestorChain: anc,
    activeElement: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
    anyLiveRegionMentionsAnswer: [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map(e => (e.textContent || '').trim().slice(0, 25))
  };
});
console.log('\nMIXED FIRE — after reveal:', JSON.stringify(after, null, 1));
await p.screenshot({ path: SHOTS + '/mixfire-after.png' });
console.log('\n>>> VERDICT: mixed-fire reveal announced?',
  (after.revAriaLive || after.revRole || after.ancestorChain.some(a => a.ariaLive || a.role === 'status')) ? 'YES' : 'NO — same silent-reveal defect as the drill (F3)');
await b.close();
